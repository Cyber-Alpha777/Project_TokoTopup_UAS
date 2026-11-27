package syncs

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"vouchstore/internal/concepts/admincatalog"
	"vouchstore/internal/concepts/order"
	"vouchstore/internal/concepts/payment"
	"vouchstore/internal/concepts/pointexchange"
	"vouchstore/internal/concepts/quest"
	"vouchstore/internal/concepts/questreward"
	"vouchstore/internal/concepts/voucher"
)

var (
	// ErrNotFound juga dipakai untuk data milik orang lain, agar keberadaannya tidak bocor.
	ErrNotFound              = errors.New("syncs: data tidak ditemukan")
	ErrProductUnavailable    = errors.New("syncs: produk tidak aktif atau harga sudah berubah")
	ErrPaymentAmountMismatch = errors.New("syncs: jumlah bayar tidak sama dengan harga order")
	ErrOrderClosed           = errors.New("syncs: order sudah tidak menerima pembayaran")
	ErrVoucherAlreadyApplied = errors.New("syncs: order ini sudah memakai voucher")
	ErrPaymentInProgress     = errors.New("syncs: order masih punya pembayaran waiting, voucher tidak bisa dipasang")
)

type dbtx interface {
	Exec(context.Context, string, ...interface{}) (pgconn.CommandTag, error)
	Query(context.Context, string, ...interface{}) (pgx.Rows, error)
	QueryRow(context.Context, string, ...interface{}) pgx.Row
}

type deps struct {
	catalog   *admincatalog.Concept
	orders    *order.Concept
	payments  *payment.Concept
	vouchers  *voucher.Concept
	quests    *quest.Concept
	rewards   *questreward.Concept
	exchanges *pointexchange.Concept
}

func newDeps(db dbtx) deps {
	return deps{
		catalog:   admincatalog.NewConcept(db),
		orders:    order.NewConcept(db),
		payments:  payment.NewConcept(db),
		vouchers:  voucher.NewConcept(db),
		quests:    quest.NewConcept(db),
		rewards:   questreward.NewConcept(db),
		exchanges: pointexchange.NewConcept(db),
	}
}

// DB dipenuhi oleh *pgxpool.Pool (produksi) dan pgx.Tx (tes: seluruh tes
// dijalankan di satu transaksi yang di-rollback; Begin pada Tx menjadi savepoint).
type DB interface {
	dbtx
	Begin(context.Context) (pgx.Tx, error)
}

type Service struct {
	pool DB
	now  func() time.Time // bisa diganti di test
}

func NewService(pool DB) *Service { return &Service{pool: pool, now: time.Now} }

// tx menjalankan fn dalam satu transaksi: commit jika nil, rollback jika error.
func (s *Service) tx(ctx context.Context, fn func(d deps) error) error {
	t, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = t.Rollback(ctx) }()
	if err := fn(newDeps(t)); err != nil {
		return err
	}
	return t.Commit(ctx)
}

// Actor: siapa yang meminta. Dipakai untuk cek kepemilikan data.
type Actor struct {
	ID      int64
	IsAdmin bool
}

func (a Actor) canSee(o order.Order) bool { return a.IsAdmin || o.BuyerID == a.ID }

/* ---------------- sync (satu fungsi per sync) ---------------- */

// sync CancelledOrderFailsWaitingPayment
func cancelledOrderFailsWaitingPayment(ctx context.Context, d deps, orderID int64) error {
	waiting, err := d.payments.ListWaitingByOrder(ctx, orderID)
	if err != nil {
		return err
	}
	for _, p := range waiting {
		if _, err := failPayment(ctx, d, p.ID); err != nil {
			return err
		}
	}
	return nil
}

// sync ReleaseVoucherOnCancel
// when Order.cancel; where ada Redemption untuk order itu; then Voucher.release
func releaseVoucherOnCancel(ctx context.Context, d deps, orderID int64) error {
	has, err := d.vouchers.HasRedemption(ctx, orderID)
	if err != nil || !has {
		return err
	}
	return d.vouchers.Release(ctx, orderID)
}

// Order.cancel + semua sync yang dipicu oleh cancel.
func cancelOrder(ctx context.Context, d deps, orderID int64) (order.Order, error) {
	o, err := d.orders.Cancel(ctx, orderID)
	if err != nil {
		return order.Order{}, err
	}
	if err := releaseVoucherOnCancel(ctx, d, orderID); err != nil {
		return order.Order{}, err
	}
	return o, cancelledOrderFailsWaitingPayment(ctx, d, orderID)
}

// sync FailedPaymentCancelsOrder
// when Payment.fail; where order.status = pending; then Order.cancel
// Tidak berulang tanpa henti: cancelOrder mengubah status dulu, sehingga
// payment.fail yang dipicu cancel melihat order sudah bukan pending.
func failedPaymentCancelsOrder(ctx context.Context, d deps, p payment.Payment) error {
	o, err := d.orders.Get(ctx, p.OrderID)
	if err != nil || o.Status != order.StatusPending {
		return err
	}
	_, err = cancelOrder(ctx, d, o.ID)
	return err
}

// Payment.fail + semua sync yang dipicu oleh fail.
func failPayment(ctx context.Context, d deps, paymentID int64) (payment.Payment, error) {
	p, err := d.payments.Fail(ctx, paymentID)
	if err != nil {
		return payment.Payment{}, err
	}
	return p, failedPaymentCancelsOrder(ctx, d, p)
}

// sync PaymentSuccessStartsDelivery
func paymentSuccessStartsDelivery(ctx context.Context, d deps, p payment.Payment) error {
	_, err := d.orders.MarkSending(ctx, p.OrderID)
	return err
}

/* ---------------- operasi yang dipanggil API ---------------- */

type PlaceOrderInput struct {
	BuyerID, ProductID, Price int64
	InGameID, ZoneID          string
}

// Order.create + sync RejectOrderWithInvalidProduct.
// Order yang ditolak tetap tersimpan sebagai cancelled, sesuai spec.
func (s *Service) PlaceOrder(ctx context.Context, in PlaceOrderInput) (order.Order, error) {
	var o order.Order
	rejected := false
	err := s.tx(ctx, func(d deps) error {
		product, err := d.catalog.GetProduct(ctx, in.ProductID)
		if err != nil {
			return err
		}
		price := in.Price
		if price == 0 { // klien tidak mengirim harga: pakai harga produk dari DB
			price = product.Price
		}
		if o, err = d.orders.Create(ctx, in.BuyerID, in.ProductID, in.InGameID, in.ZoneID, price); err != nil {
			return err
		}
		if !product.Active || price != product.Price { // RejectOrderWithInvalidProduct
			rejected = true
			o, err = cancelOrder(ctx, d, o.ID)
		}
		return err
	})
	if err != nil {
		return order.Order{}, err
	}
	if rejected {
		return o, ErrProductUnavailable
	}
	return o, nil
}

// Order.cancel oleh pemilik order.
func (s *Service) CancelOrder(ctx context.Context, buyerID, orderID int64) (order.Order, error) {
	var cancelled order.Order
	err := s.tx(ctx, func(d deps) error {
		o, err := d.orders.Get(ctx, orderID)
		if err != nil {
			return err
		}
		if o.BuyerID != buyerID {
			return ErrNotFound
		}
		cancelled, err = cancelOrder(ctx, d, orderID)
		return err
	})
	return cancelled, err
}

// AdminCatalog.deactivate + sync DeactivatedProductCancelsPendingOrders.
// Belum punya endpoint (menunggu frontend admin).
func (s *Service) DeactivateProduct(ctx context.Context, productID int64) (admincatalog.Product, error) {
	var p admincatalog.Product
	err := s.tx(ctx, func(d deps) error {
		var err error
		if p, err = d.catalog.Deactivate(ctx, productID); err != nil {
			return err
		}
		pending, err := d.orders.ListPendingByProduct(ctx, productID)
		if err != nil {
			return err
		}
		for _, o := range pending {
			if _, err := cancelOrder(ctx, d, o.ID); err != nil {
				return err
			}
		}
		return nil
	})
	return p, err
}

// Payment.initiate + sync RejectPaymentForClosedOrder + RejectWrongPaymentAmount.
// Pembayaran yang ditolak tetap tersimpan sebagai failed, sesuai spec.
func (s *Service) InitiatePayment(ctx context.Context, buyerID, orderID int64, method string, amount int64) (payment.Payment, error) {
	var p payment.Payment
	var rejection error
	err := s.tx(ctx, func(d deps) error {
		// kunci baris order agar tidak bersamaan dengan cancel
		o, err := d.orders.GetForUpdate(ctx, orderID)
		if err != nil {
			return err
		}
		if o.BuyerID != buyerID {
			return ErrNotFound
		}
		if amount == 0 { // klien tidak mengirim jumlah: pakai harga order dari DB
			amount = o.Price
		}
		if p, err = d.payments.Initiate(ctx, orderID, method, amount); err != nil {
			return err
		}
		switch {
		case o.Status != order.StatusPending: // RejectPaymentForClosedOrder
			rejection = ErrOrderClosed
		case amount != o.Price: // RejectWrongPaymentAmount
			rejection = ErrPaymentAmountMismatch
		}
		if rejection != nil {
			p, err = failPayment(ctx, d, p.ID)
		}
		return err
	})
	if err != nil {
		return payment.Payment{}, err
	}
	return p, rejection
}

// Payment.confirm + sync PaymentSuccessStartsDelivery, atomik:
// jika order tidak bisa masuk status sending, konfirmasi ikut dibatalkan.
func (s *Service) ConfirmPayment(ctx context.Context, actor Actor, paymentID int64) (payment.Payment, error) {
	var confirmed payment.Payment
	err := s.tx(ctx, func(d deps) error {
		p, err := d.payments.Get(ctx, paymentID)
		if err != nil {
			return err
		}
		o, err := d.orders.Get(ctx, p.OrderID)
		if err != nil {
			return err
		}
		if !actor.canSee(o) {
			return ErrNotFound
		}
		if confirmed, err = d.payments.Confirm(ctx, paymentID); err != nil {
			return err
		}
		return paymentSuccessStartsDelivery(ctx, d, confirmed)
	})
	if err != nil {
		return payment.Payment{}, err
	}
	return confirmed, nil
}

/* ---------------- pembacaan dengan cek kepemilikan ---------------- */

func (s *Service) GetOrder(ctx context.Context, actor Actor, id int64) (order.Order, error) {
	o, err := newDeps(s.pool).orders.Get(ctx, id)
	if err != nil {
		return order.Order{}, err
	}
	if !actor.canSee(o) {
		return order.Order{}, ErrNotFound
	}
	return o, nil
}

func (s *Service) ListOrders(ctx context.Context, buyerID int64, status string, page, size int32) ([]order.Order, int64, error) {
	return newDeps(s.pool).orders.ListByBuyer(ctx, buyerID, status, size, (page-1)*size)
}

func (s *Service) ListPayments(ctx context.Context, actor Actor, orderID int64) ([]payment.Payment, error) {
	d := newDeps(s.pool)
	o, err := d.orders.Get(ctx, orderID)
	if err != nil {
		return nil, err
	}
	if !actor.canSee(o) {
		return nil, ErrNotFound
	}
	return d.payments.ListByOrder(ctx, orderID)
}
