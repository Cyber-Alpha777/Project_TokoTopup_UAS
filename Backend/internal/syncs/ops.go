package syncs

import (
	"context"
	"time"

	"vouchstore/internal/concepts/pointexchange"
	"vouchstore/internal/concepts/quest"
	"vouchstore/internal/concepts/questreward"
	"vouchstore/internal/concepts/voucher"
)

// Pembungkus tipis untuk aksi dan pembacaan satu concept, supaya lapisan API
// hanya berbicara dengan package syncs dan tidak menyentuh concept lain.

func (s *Service) ListQuests(ctx context.Context) ([]quest.Quest, error) {
	return newDeps(s.pool).quests.ListActive(ctx)
}

func (s *Service) ListQuestProgress(ctx context.Context, userID int64) ([]quest.Progress, error) {
	return newDeps(s.pool).quests.ListProgressByUser(ctx, userID)
}

func (s *Service) GetBalance(ctx context.Context, userID int64) (questreward.Balance, error) {
	return newDeps(s.pool).rewards.GetBalance(ctx, userID)
}

// ListOffers: PointExchange._listOffers = penawaran active dengan stock > 0.
func (s *Service) ListOffers(ctx context.Context) ([]pointexchange.Offer, error) {
	all, err := newDeps(s.pool).exchanges.ListActiveOffers(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]pointexchange.Offer, 0, len(all))
	for _, o := range all {
		if o.Stock > 0 {
			out = append(out, o)
		}
	}
	return out, nil
}

func (s *Service) ListExchanges(ctx context.Context, userID int64) ([]pointexchange.Exchange, error) {
	return newDeps(s.pool).exchanges.ListByUser(ctx, userID)
}

// ListUsableVouchers: Voucher._listOwned.
func (s *Service) ListUsableVouchers(ctx context.Context, userID int64) ([]voucher.Voucher, error) {
	return newDeps(s.pool).vouchers.UsableByOwner(ctx, userID)
}

func (s *Service) CreateVoucher(ctx context.Context, code string, discount int64, quota int32, expiresAt time.Time, owner *int64) (voucher.Voucher, error) {
	return newDeps(s.pool).vouchers.Create(ctx, code, discount, quota, expiresAt, owner)
}

func (s *Service) ListVouchers(ctx context.Context, page, size int32) ([]voucher.Voucher, int64, error) {
	return newDeps(s.pool).vouchers.List(ctx, size, (page-1)*size)
}

func (s *Service) CreateQuest(ctx context.Context, label string, points, target int32, expiresAt time.Time) (quest.Quest, error) {
	return newDeps(s.pool).quests.Create(ctx, label, points, target, expiresAt)
}

func (s *Service) DeactivateQuest(ctx context.Context, id int64) (quest.Quest, error) {
	return newDeps(s.pool).quests.Deactivate(ctx, id)
}

func (s *Service) DeleteQuest(ctx context.Context, id int64) error {
	return newDeps(s.pool).quests.Delete(ctx, id)
}

func (s *Service) CreateOffer(ctx context.Context, label string, value int64, cost, stock int32) (pointexchange.Offer, error) {
	return newDeps(s.pool).exchanges.CreateOffer(ctx, label, value, cost, stock)
}

func (s *Service) DeactivateOffer(ctx context.Context, id int64) (pointexchange.Offer, error) {
	return newDeps(s.pool).exchanges.DeactivateOffer(ctx, id)
}
