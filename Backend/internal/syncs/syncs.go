package syncs

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"vouchstore/internal/concepts/admincatalog"
	"vouchstore/internal/concepts/order"
	"vouchstore/internal/concepts/payment"
)

var (
	// ErrNotFound juga dipakai untuk data milik orang lain, agar keberadaannya tidak bocor.
	ErrNotFound              = errors.New("syncs: data tidak ditemukan")
	ErrProductUnavailable    = errors.New("syncs: produk tidak aktif atau harga sudah berubah")
	ErrPaymentAmountMismatch = errors.New("syncs: jumlah bayar tidak sama dengan harga order")
	ErrOrderClosed           = errors.New("syncs: order sudah tidak menerima pembayaran")
)

type dbtx interface {
	Exec(context.Context, string, ...interface{}) (pgconn.CommandTag, error)
	Query(context.Context, string, ...interface{}) (pgx.Rows, error)
	QueryRow(context.Context, string, ...interface{}) pgx.Row
}

type deps struct {
	catalog  *admincatalog.Concept
	orders   *order.Concept
	payments *payment.Concept
}

func newDeps(db dbtx) deps {
	return deps{admincatalog.NewConcept(db), order.NewConcept(db), payment.NewConcept(db)}
}

type Service struct{ pool *pgxpool.Pool }

func NewService(pool *pgxpool.Pool) *Service { return &Service{pool: pool} }

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
		if _, err := d.payments.Fail(ctx, p.ID); err != nil {
			return err
		}
	}
	return nil
}

// Order.cancel + semua sync yang dipicu oleh cancel.
// (ReleaseVoucherOnCancel akan ditambahkan di sini setelah concept Voucher ada.)
func cancelOrder(ctx context.Context, d deps, orderID int64) (order.Order, error) {
	o, err := d.orders.Cancel(ctx, orderID)
	if err != nil {
		return order.Order{}, err
	}
	return o, cancelledOrderFailsWaitingPayment(ctx, d, orderID)
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
		if o, err = d.orders.Create(ctx, in.BuyerID, in.ProductID, in.InGameID, in.ZoneID, in.Price); err != nil {
			return err
		}
		if !product.Active || in.Price != product.Price { // RejectOrderWithInvalidProduct
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
			p, err = d.payments.Fail(ctx, p.ID)
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
