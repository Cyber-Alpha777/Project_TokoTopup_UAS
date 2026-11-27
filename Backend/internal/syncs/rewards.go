package syncs

import (
	"context"
	"crypto/rand"
	"errors"
	"time"

	"vouchstore/internal/concepts/order"
	"vouchstore/internal/concepts/pointexchange"
	"vouchstore/internal/concepts/quest"
	"vouchstore/internal/concepts/voucher"
)

const exchangedVoucherLifetime = 30 * 24 * time.Hour

/* ---------------- voucher pada order ---------------- */

// sync ApplyVoucherDiscount
// when Voucher.redeem (code, user, order): (discount); then Order.applyDiscount (order, discount)
func applyVoucherDiscount(ctx context.Context, d deps, orderID, discount int64) (order.Order, error) {
	return d.orders.ApplyDiscount(ctx, orderID, discount)
}

// Voucher.redeem + sync ApplyVoucherDiscount, atomik: jika diskon tidak bisa
// dipasang ke order, pemakaian voucher (kuota dan redemption) ikut di-rollback.
func (s *Service) RedeemVoucher(ctx context.Context, buyerID, orderID int64, code string) (order.Order, error) {
	var updated order.Order
	err := s.tx(ctx, func(d deps) error {
		o, err := d.orders.GetForUpdate(ctx, orderID) // kunci order agar tidak bersamaan dengan pembayaran/cancel
		if err != nil {
			return err
		}
		if o.BuyerID != buyerID {
			return ErrNotFound
		}
		if o.Status != order.StatusPending {
			return order.ErrNotPending
		}
		if has, err := d.vouchers.HasRedemption(ctx, orderID); err != nil {
			return err
		} else if has {
			return ErrVoucherAlreadyApplied
		}
		// Pembayaran waiting menyimpan jumlah lama; mengubah harga sesudahnya
		// membuat jumlah bayar dan harga order tidak sama.
		if waiting, err := d.payments.ListWaitingByOrder(ctx, orderID); err != nil {
			return err
		} else if len(waiting) > 0 {
			return ErrPaymentInProgress
		}
		discount, err := d.vouchers.Redeem(ctx, code, buyerID, orderID)
		if err != nil {
			return err
		}
		updated, err = applyVoucherDiscount(ctx, d, orderID, discount)
		return err
	})
	return updated, err
}

/* ---------------- order selesai -> quest -> poin ---------------- */

// sync CompletedQuestGrantsReward
// when Quest.addProgress; where progres.completed = true; then QuestReward.claim (user, points)
func completedQuestGrantsReward(ctx context.Context, d deps, q quest.Quest, p quest.Progress) error {
	if !p.Completed {
		return nil
	}
	_, err := d.rewards.Claim(ctx, p.UserID, q.Points)
	return err
}

// sync CompletedOrderAdvancesQuests
// when Order.markCompleted; where quest masih terbuka untuk pembeli; then Quest.addProgress (amount: 1)
// ListOpenForUser sudah menyaring quest aktif, belum kedaluwarsa, dan progres belum completed.
func completedOrderAdvancesQuests(ctx context.Context, d deps, o order.Order) error {
	open, err := d.quests.ListOpenForUser(ctx, o.BuyerID)
	if err != nil {
		return err
	}
	for _, q := range open {
		p, err := d.quests.AddProgress(ctx, o.BuyerID, q.ID, 1)
		if errors.Is(err, quest.ErrAlreadyCompleted) { // keburu selesai oleh proses lain
			continue
		}
		if err != nil {
			return err
		}
		if err := completedQuestGrantsReward(ctx, d, q, p); err != nil {
			return err
		}
	}
	return nil
}

// Order.markCompleted + sync CompletedOrderAdvancesQuests + CompletedQuestGrantsReward,
// semuanya dalam satu transaksi. Dipanggil admin (mensimulasikan item terkirim).
func (s *Service) CompleteOrder(ctx context.Context, orderID int64) (order.Order, error) {
	var done order.Order
	err := s.tx(ctx, func(d deps) error {
		var err error
		if done, err = d.orders.MarkCompleted(ctx, orderID); err != nil {
			return err
		}
		return completedOrderAdvancesQuests(ctx, d, done)
	})
	return done, err
}

/* ---------------- tukar poin ---------------- */

// sync ExchangeSpendsPoints
// when PointExchange.exchange; then QuestReward.spend (user, exchange.cost)
// Saldo kurang membuat spend gagal, dan transaksi memutar balik exchange dan stoknya.
func exchangeSpendsPoints(ctx context.Context, d deps, ex pointexchange.Exchange) error {
	_, err := d.rewards.Spend(ctx, ex.UserID, ex.Cost)
	return err
}

// sync ExchangeIssuesVoucher
// when PointExchange.exchange; then Voucher.create (discount = offer.value, kuota 1, owner = user)
func exchangeIssuesVoucher(ctx context.Context, d deps, now time.Time, ex pointexchange.Exchange) (voucher.Voucher, error) {
	offer, err := d.exchanges.GetOffer(ctx, ex.OfferID)
	if err != nil {
		return voucher.Voucher{}, err
	}
	code, err := generateCode()
	if err != nil {
		return voucher.Voucher{}, err
	}
	owner := ex.UserID
	return d.vouchers.Create(ctx, code, offer.Value, 1, now.Add(exchangedVoucherLifetime), &owner)
}

// PointExchange.exchange + sync ExchangeSpendsPoints + ExchangeIssuesVoucher, atomik.
func (s *Service) ExchangePoints(ctx context.Context, userID, offerID int64) (pointexchange.Exchange, voucher.Voucher, error) {
	var ex pointexchange.Exchange
	var v voucher.Voucher
	err := s.tx(ctx, func(d deps) error {
		var err error
		if ex, err = d.exchanges.Exchange(ctx, userID, offerID); err != nil {
			return err
		}
		if err = exchangeSpendsPoints(ctx, d, ex); err != nil {
			return err
		}
		v, err = exchangeIssuesVoucher(ctx, d, s.now(), ex)
		return err
	})
	return ex, v, err
}

// 32 karakter tanpa 0/O/1/I agar mudah dibaca; 256 habis dibagi 32 jadi tidak bias.
const codeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

func generateCode() (string, error) {
	b := make([]byte, 10)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	for i := range b {
		b[i] = codeAlphabet[int(b[i])%len(codeAlphabet)]
	}
	return "TP-" + string(b), nil
}
