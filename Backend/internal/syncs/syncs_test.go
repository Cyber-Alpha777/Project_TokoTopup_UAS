package syncs

import (
	"context"
	"errors"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"vouchstore/internal/auth"
	"vouchstore/internal/concepts/admincatalog"
	"vouchstore/internal/concepts/order"
	"vouchstore/internal/concepts/pointexchange"
	"vouchstore/internal/concepts/questreward"
	"vouchstore/internal/concepts/voucher"
)

// tidak butuh DB
func TestGenerateCode(t *testing.T) {
	seen := map[string]bool{}
	for i := 0; i < 200; i++ {
		c, err := generateCode()
		if err != nil {
			t.Fatal(err)
		}
		if !strings.HasPrefix(c, "TP-") || len(c) != 13 || len(c) > 30 {
			t.Fatalf("kode tidak valid: %q", c)
		}
		for _, r := range c[3:] {
			if !strings.ContainsRune(codeAlphabet, r) {
				t.Fatalf("karakter di luar alfabet: %q", c)
			}
		}
		if seen[c] {
			t.Fatalf("kode kembar: %q", c)
		}
		seen[c] = true
	}
}

type fx struct {
	s       *Service
	d       deps
	tx      pgx.Tx
	buyer   auth.User
	product admincatalog.Product
}

var ctx = context.Background()

// setup menjalankan seluruh tes di satu transaksi yang di-rollback di akhir;
// Service.tx memakai savepoint di dalamnya, jadi rollback antar-sync tetap diuji.
func setup(t *testing.T) fx {
	t.Helper()
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL belum di-set")
	}
	pool, err := pgxpool.New(ctx, url)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)
	tx, err := pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = tx.Rollback(ctx) })

	d := newDeps(tx)
	buyer, err := auth.NewService(tx).Register(ctx, auth.RegisterInput{
		Name: "Raka", Email: "raka-sync-test@example.com", Password: "password123",
		Whatsapp: "081234567890", Role: auth.RoleMember,
		BirthDate: time.Date(2004, 5, 5, 0, 0, 0, 0, time.UTC)})
	if err != nil {
		t.Fatal(err)
	}
	g, err := d.catalog.AddGame(ctx, "Game sync test")
	if err != nil {
		t.Fatal(err)
	}
	p, err := d.catalog.AddProduct(ctx, g.ID, "100 Diamonds", 10000)
	if err != nil {
		t.Fatal(err)
	}
	return fx{s: NewService(tx), d: d, tx: tx, buyer: buyer, product: p}
}

func (f fx) placeOrder(t *testing.T) order.Order {
	t.Helper()
	o, err := f.s.PlaceOrder(ctx, PlaceOrderInput{
		BuyerID: f.buyer.ID, ProductID: f.product.ID, Price: f.product.Price, InGameID: "12345"})
	if err != nil {
		t.Fatal(err)
	}
	return o
}

func (f fx) newVoucher(t *testing.T, code string, discount int64, owner *int64) voucher.Voucher {
	t.Helper()
	v, err := f.d.vouchers.Create(ctx, code, discount, 5, time.Now().Add(time.Hour), owner)
	if err != nil {
		t.Fatal(err)
	}
	return v
}

func (f fx) quota(t *testing.T, id int64) int32 {
	t.Helper()
	var q int32
	if err := f.tx.QueryRow(ctx, "SELECT quota FROM vouchers WHERE id = $1", id).Scan(&q); err != nil {
		t.Fatal(err)
	}
	return q
}

func (f fx) points(t *testing.T) int32 {
	t.Helper()
	b, err := f.d.rewards.GetBalance(ctx, f.buyer.ID)
	if err != nil {
		t.Fatal(err)
	}
	return b.Points
}

func TestApplyVoucherDiscount(t *testing.T) {
	t.Run("effects/harga order berkurang dan kuota berkurang", func(t *testing.T) {
		f := setup(t)
		v := f.newVoucher(t, "HEMAT2000", 2000, nil)
		o := f.placeOrder(t)
		got, err := f.s.RedeemVoucher(ctx, f.buyer.ID, o.ID, "hemat2000")
		if err != nil || got.Price != 8000 || f.quota(t, v.ID) != 4 {
			t.Fatalf("got=%+v err=%v quota=%d", got, err, f.quota(t, v.ID))
		}
	})
	t.Run("rollback/diskon >= harga membatalkan pemakaian voucher", func(t *testing.T) {
		f := setup(t)
		v := f.newVoucher(t, "BESAR", 10000, nil)
		o := f.placeOrder(t)
		if _, err := f.s.RedeemVoucher(ctx, f.buyer.ID, o.ID, "BESAR"); !errors.Is(err, order.ErrInvalidDiscount) {
			t.Fatalf("err=%v", err)
		}
		if f.quota(t, v.ID) != 5 {
			t.Fatal("kuota harus kembali 5 setelah rollback")
		}
	})
	t.Run("requires/voucher milik user lain ditolak", func(t *testing.T) {
		f := setup(t)
		other := int64(999999)
		f.newVoucher(t, "MILIKORANG", 1000, &other)
		o := f.placeOrder(t)
		if _, err := f.s.RedeemVoucher(ctx, f.buyer.ID, o.ID, "MILIKORANG"); !errors.Is(err, voucher.ErrNotOwner) {
			t.Fatalf("err=%v", err)
		}
	})
	t.Run("requires/order milik orang lain tidak ditemukan", func(t *testing.T) {
		f := setup(t)
		f.newVoucher(t, "UMUM", 1000, nil)
		o := f.placeOrder(t)
		if _, err := f.s.RedeemVoucher(ctx, f.buyer.ID+1, o.ID, "UMUM"); !errors.Is(err, ErrNotFound) {
			t.Fatalf("err=%v", err)
		}
	})
	t.Run("requires/satu voucher per order", func(t *testing.T) {
		f := setup(t)
		f.newVoucher(t, "SATU", 1000, nil)
		f.newVoucher(t, "DUA", 1000, nil)
		o := f.placeOrder(t)
		_, _ = f.s.RedeemVoucher(ctx, f.buyer.ID, o.ID, "SATU")
		if _, err := f.s.RedeemVoucher(ctx, f.buyer.ID, o.ID, "DUA"); !errors.Is(err, ErrVoucherAlreadyApplied) {
			t.Fatalf("err=%v", err)
		}
	})
	t.Run("requires/tidak ada pembayaran waiting", func(t *testing.T) {
		f := setup(t)
		f.newVoucher(t, "TERLAMBAT", 1000, nil)
		o := f.placeOrder(t)
		if _, err := f.s.InitiatePayment(ctx, f.buyer.ID, o.ID, "qris", o.Price); err != nil {
			t.Fatal(err)
		}
		if _, err := f.s.RedeemVoucher(ctx, f.buyer.ID, o.ID, "TERLAMBAT"); !errors.Is(err, ErrPaymentInProgress) {
			t.Fatalf("err=%v", err)
		}
	})
}

func TestReleaseVoucherOnCancel(t *testing.T) {
	t.Run("cancel mengembalikan kuota dan menghapus redemption", func(t *testing.T) {
		f := setup(t)
		v := f.newVoucher(t, "BALIK", 1000, nil)
		o := f.placeOrder(t)
		if _, err := f.s.RedeemVoucher(ctx, f.buyer.ID, o.ID, "BALIK"); err != nil {
			t.Fatal(err)
		}
		if _, err := f.s.CancelOrder(ctx, f.buyer.ID, o.ID); err != nil {
			t.Fatal(err)
		}
		has, _ := f.d.vouchers.HasRedemption(ctx, o.ID)
		if f.quota(t, v.ID) != 5 || has {
			t.Fatalf("quota=%d has=%v", f.quota(t, v.ID), has)
		}
	})
	t.Run("cancel tanpa voucher tidak error", func(t *testing.T) {
		f := setup(t)
		o := f.placeOrder(t)
		if _, err := f.s.CancelOrder(ctx, f.buyer.ID, o.ID); err != nil {
			t.Fatal(err)
		}
	})
}

func TestFailedPaymentCancelsOrder(t *testing.T) {
	t.Run("jumlah bayar salah menggagalkan payment dan membatalkan order", func(t *testing.T) {
		f := setup(t)
		o := f.placeOrder(t)
		p, err := f.s.InitiatePayment(ctx, f.buyer.ID, o.ID, "qris", o.Price-1)
		if !errors.Is(err, ErrPaymentAmountMismatch) || p.Status != "failed" {
			t.Fatalf("p=%+v err=%v", p, err)
		}
		got, _ := f.d.orders.Get(ctx, o.ID)
		if got.Status != order.StatusCancelled {
			t.Fatalf("status=%s", got.Status)
		}
	})
	t.Run("order yang sudah tidak pending tidak dibatalkan lagi", func(t *testing.T) {
		f := setup(t)
		o := f.placeOrder(t)
		p, err := f.s.InitiatePayment(ctx, f.buyer.ID, o.ID, "qris", o.Price)
		if err != nil {
			t.Fatal(err)
		}
		if _, err := f.s.ConfirmPayment(ctx, Actor{ID: f.buyer.ID}, p.ID); err != nil { // order -> sending
			t.Fatal(err)
		}
		if _, err := f.s.InitiatePayment(ctx, f.buyer.ID, o.ID, "qris", o.Price); !errors.Is(err, ErrOrderClosed) {
			t.Fatalf("err=%v", err)
		}
		got, _ := f.d.orders.Get(ctx, o.ID)
		if got.Status != order.StatusSending {
			t.Fatalf("status=%s", got.Status)
		}
	})
	t.Run("cancel order tidak berulang tanpa henti dan menggagalkan payment waiting", func(t *testing.T) {
		f := setup(t)
		o := f.placeOrder(t)
		p, _ := f.s.InitiatePayment(ctx, f.buyer.ID, o.ID, "qris", o.Price)
		if _, err := f.s.CancelOrder(ctx, f.buyer.ID, o.ID); err != nil {
			t.Fatal(err)
		}
		got, _ := f.d.payments.Get(ctx, p.ID)
		if got.Status != "failed" {
			t.Fatalf("status=%s", got.Status)
		}
	})
}

func TestCompletedOrderAdvancesQuests(t *testing.T) {
	// membawa order sampai sending, lalu admin menyelesaikannya
	toSending := func(t *testing.T, f fx) order.Order {
		o := f.placeOrder(t)
		p, err := f.s.InitiatePayment(ctx, f.buyer.ID, o.ID, "qris", o.Price)
		if err != nil {
			t.Fatal(err)
		}
		if _, err := f.s.ConfirmPayment(ctx, Actor{ID: f.buyer.ID}, p.ID); err != nil {
			t.Fatal(err)
		}
		return o
	}
	t.Run("quest selesai memberi poin", func(t *testing.T) {
		f := setup(t)
		if _, err := f.d.quests.Create(ctx, "Beli 1x", 50, 1, time.Now().Add(time.Hour)); err != nil {
			t.Fatal(err)
		}
		o := toSending(t, f)
		if _, err := f.s.CompleteOrder(ctx, o.ID); err != nil {
			t.Fatal(err)
		}
		if got := f.points(t); got != 50 {
			t.Fatalf("points=%d", got)
		}
	})
	t.Run("quest belum selesai: progres naik, poin belum", func(t *testing.T) {
		f := setup(t)
		q, _ := f.d.quests.Create(ctx, "Beli 3x", 50, 3, time.Now().Add(time.Hour))
		o := toSending(t, f)
		if _, err := f.s.CompleteOrder(ctx, o.ID); err != nil {
			t.Fatal(err)
		}
		prog, _ := f.d.quests.ListProgressByUser(ctx, f.buyer.ID)
		if len(prog) != 1 || prog[0].QuestID != q.ID || prog[0].Current != 1 || f.points(t) != 0 {
			t.Fatalf("prog=%+v points=%d", prog, f.points(t))
		}
	})
	t.Run("quest nonaktif diabaikan", func(t *testing.T) {
		f := setup(t)
		q, _ := f.d.quests.Create(ctx, "Mati", 50, 1, time.Now().Add(time.Hour))
		_, _ = f.d.quests.Deactivate(ctx, q.ID)
		o := toSending(t, f)
		if _, err := f.s.CompleteOrder(ctx, o.ID); err != nil || f.points(t) != 0 {
			t.Fatalf("err=%v points=%d", err, f.points(t))
		}
	})
	t.Run("requires/order harus sending", func(t *testing.T) {
		f := setup(t)
		o := f.placeOrder(t) // masih pending
		if _, err := f.s.CompleteOrder(ctx, o.ID); !errors.Is(err, order.ErrNotSending) {
			t.Fatalf("err=%v", err)
		}
	})
}

func TestExchangePoints(t *testing.T) {
	newOffer := func(t *testing.T, f fx, cost, stock int32) pointexchange.Offer {
		o, err := f.d.exchanges.CreateOffer(ctx, "Diskon 5rb", 5000, cost, stock)
		if err != nil {
			t.Fatal(err)
		}
		return o
	}
	t.Run("effects/poin berkurang dan user menerima voucher miliknya", func(t *testing.T) {
		f := setup(t)
		_, _ = f.d.rewards.Claim(ctx, f.buyer.ID, 100)
		off := newOffer(t, f, 60, 3)
		ex, v, err := f.s.ExchangePoints(ctx, f.buyer.ID, off.ID)
		if err != nil {
			t.Fatal(err)
		}
		if f.points(t) != 40 || ex.Cost != 60 {
			t.Fatalf("points=%d ex=%+v", f.points(t), ex)
		}
		if v.Discount != 5000 || v.Quota != 1 || !v.OwnerID.Valid || v.OwnerID.Int64 != f.buyer.ID || !v.ExpiresAt.Time.After(time.Now()) {
			t.Fatalf("v=%+v", v)
		}
		owned, _ := f.d.vouchers.UsableByOwner(ctx, f.buyer.ID)
		if len(owned) != 1 {
			t.Fatalf("owned=%d", len(owned))
		}
	})
	t.Run("rollback/saldo kurang: stok, exchange, dan voucher tidak berubah", func(t *testing.T) {
		f := setup(t)
		_, _ = f.d.rewards.Claim(ctx, f.buyer.ID, 10)
		off := newOffer(t, f, 60, 3)
		if _, _, err := f.s.ExchangePoints(ctx, f.buyer.ID, off.ID); !errors.Is(err, questreward.ErrInsufficientPoints) {
			t.Fatalf("err=%v", err)
		}
		got, _ := f.d.exchanges.GetOffer(ctx, off.ID)
		hist, _ := f.d.exchanges.ListByUser(ctx, f.buyer.ID)
		owned, _ := f.d.vouchers.UsableByOwner(ctx, f.buyer.ID)
		if got.Stock != 3 || len(hist) != 0 || len(owned) != 0 || f.points(t) != 10 {
			t.Fatalf("stock=%d hist=%d owned=%d points=%d", got.Stock, len(hist), len(owned), f.points(t))
		}
	})
	t.Run("requires/stok habis", func(t *testing.T) {
		f := setup(t)
		_, _ = f.d.rewards.Claim(ctx, f.buyer.ID, 100)
		off := newOffer(t, f, 10, 1)
		if _, _, err := f.s.ExchangePoints(ctx, f.buyer.ID, off.ID); err != nil {
			t.Fatal(err)
		}
		if _, _, err := f.s.ExchangePoints(ctx, f.buyer.ID, off.ID); !errors.Is(err, pointexchange.ErrOutOfStock) {
			t.Fatalf("err=%v", err)
		}
	})
	t.Run("requires/penawaran nonaktif", func(t *testing.T) {
		f := setup(t)
		_, _ = f.d.rewards.Claim(ctx, f.buyer.ID, 100)
		off := newOffer(t, f, 10, 5)
		_, _ = f.d.exchanges.DeactivateOffer(ctx, off.ID)
		if _, _, err := f.s.ExchangePoints(ctx, f.buyer.ID, off.ID); !errors.Is(err, pointexchange.ErrOfferInactive) {
			t.Fatalf("err=%v", err)
		}
	})
}

func TestServerSidePrice(t *testing.T) {
	t.Run("order tanpa harga memakai harga produk dari DB", func(t *testing.T) {
		f := setup(t)
		o, err := f.s.PlaceOrder(ctx, PlaceOrderInput{BuyerID: f.buyer.ID, ProductID: f.product.ID, InGameID: "12345"})
		if err != nil || o.Price != f.product.Price || o.Status != order.StatusPending {
			t.Fatalf("o=%+v err=%v", o, err)
		}
	})
	t.Run("harga klien yang berbeda tetap ditolak (RejectOrderWithInvalidProduct)", func(t *testing.T) {
		f := setup(t)
		o, err := f.s.PlaceOrder(ctx, PlaceOrderInput{BuyerID: f.buyer.ID, ProductID: f.product.ID, Price: 1, InGameID: "12345"})
		if !errors.Is(err, ErrProductUnavailable) || o.Status != order.StatusCancelled {
			t.Fatalf("o=%+v err=%v", o, err)
		}
	})
	t.Run("pembayaran tanpa jumlah memakai harga order dari DB", func(t *testing.T) {
		f := setup(t)
		o := f.placeOrder(t)
		p, err := f.s.InitiatePayment(ctx, f.buyer.ID, o.ID, "qris", 0)
		if err != nil || p.Amount != o.Price || p.Status != "waiting" {
			t.Fatalf("p=%+v err=%v", p, err)
		}
	})
}
