package questreward

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
)

var (
	ErrInvalidPoints      = errors.New("questreward: poin harus lebih dari 0")
	ErrInsufficientPoints = errors.New("questreward: saldo poin tidak cukup")
)

type Concept struct{ q *Queries }

func NewConcept(db DBTX) *Concept { return &Concept{q: New(db)} }

// claim — requires: points > 0
// effects: saldo user bertambah points; baris saldo dibuat bila user belum punya
//
// Parameter quest pada spec (QuestReward [User, Quest]) tidak ada di sini karena
// tabel balances hanya menyimpan user_id dan points. Sync tetap memanggil claim
// setelah Quest.addProgress; pencegahan klaim ganda dijamin oleh Quest
// (addProgress menolak progres yang sudah completed).
func (c *Concept) Claim(ctx context.Context, userID int64, points int32) (Balance, error) {
	if points <= 0 {
		return Balance{}, ErrInvalidPoints
	}
	return c.q.AddPoints(ctx, AddPointsParams{UserID: userID, Points: points})
}

// spend — requires: points > 0; saldo user >= points
// effects: saldo user berkurang points
func (c *Concept) Spend(ctx context.Context, userID int64, points int32) (Balance, error) {
	if points <= 0 {
		return Balance{}, ErrInvalidPoints
	}
	// UPDATE atomik "WHERE points >= ..." sehingga dua penukaran bersamaan
	// tidak bisa membuat saldo negatif (CHECK points >= 0 jadi lapisan kedua).
	b, err := c.q.SpendPoints(ctx, SpendPointsParams{UserID: userID, Points: points})
	if errors.Is(err, pgx.ErrNoRows) {
		return Balance{}, ErrInsufficientPoints
	}
	return b, err
}

// Pembacaan (bukan action pada spec)
// GetBalance: user yang belum punya baris saldo dianggap 0 poin.
func (c *Concept) GetBalance(ctx context.Context, userID int64) (Balance, error) {
	b, err := c.q.GetBalance(ctx, userID)
	if errors.Is(err, pgx.ErrNoRows) {
		return Balance{UserID: userID}, nil
	}
	return b, err
}
