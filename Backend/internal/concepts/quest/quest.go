package quest

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

var (
	ErrNotFound         = errors.New("quest: quest tidak ditemukan")
	ErrInvalidInput     = errors.New("quest: label, poin, target, jumlah, atau batas waktu tidak valid")
	ErrInactive         = errors.New("quest: quest tidak aktif")
	ErrExpired          = errors.New("quest: quest sudah kedaluwarsa")
	ErrAlreadyCompleted = errors.New("quest: progres user sudah selesai")
	ErrNotDeletable     = errors.New("quest: quest masih aktif dan belum kedaluwarsa")
)

type Concept struct {
	q   *Queries
	now func() time.Time // bisa diganti di test
}

func NewConcept(db DBTX) *Concept { return &Concept{q: New(db), now: time.Now} }

func ts(t time.Time) pgtype.Timestamptz { return pgtype.Timestamptz{Time: t, Valid: true} }

// create — requires: points > 0; target > 0; expiresAt setelah waktu sekarang
func (c *Concept) Create(ctx context.Context, label string, points, target int32, expiresAt time.Time) (Quest, error) {
	if label == "" || points <= 0 || target <= 0 || !expiresAt.After(c.now()) {
		return Quest{}, ErrInvalidInput
	}
	return c.q.CreateQuest(ctx, CreateQuestParams{
		Label: label, Points: points, Target: target, ExpiresAt: ts(expiresAt),
	})
}

// addProgress — requires: quest ada dan active; sekarang < expiresAt; amount > 0;
//
//	progres user untuk quest itu belum completed
//
// effects: Progress dibuat bila belum ada (current = 0, completed = false);
//
//	current += amount; completed = true bila current >= target
//
// Mengembalikan Progress terbaru supaya sync CompletedQuestGrantsReward
// bisa memeriksa Completed tanpa query tambahan.
func (c *Concept) AddProgress(ctx context.Context, userID, questID int64, amount int32) (Progress, error) {
	if amount <= 0 {
		return Progress{}, ErrInvalidInput
	}
	qu, err := c.Get(ctx, questID)
	if err != nil {
		return Progress{}, err
	}
	if !qu.Active {
		return Progress{}, ErrInactive
	}
	if !c.now().Before(qu.ExpiresAt.Time) {
		return Progress{}, ErrExpired
	}
	if err := c.q.EnsureProgress(ctx, EnsureProgressParams{UserID: userID, QuestID: questID}); err != nil {
		return Progress{}, err
	}
	// UPDATE atomik "WHERE completed = FALSE": dua progres bersamaan tidak bisa
	// sama-sama melewati target dan memicu reward dua kali.
	p, err := c.q.AddToProgress(ctx, AddToProgressParams{
		UserID: userID, QuestID: questID, Amount: amount, Target: qu.Target,
	})
	if errors.Is(err, pgx.ErrNoRows) {
		return Progress{}, ErrAlreadyCompleted
	}
	return p, err
}

// deactivate — requires: quest ada dan active
func (c *Concept) Deactivate(ctx context.Context, id int64) (Quest, error) {
	qu, err := c.q.DeactivateQuest(ctx, id)
	if !errors.Is(err, pgx.ErrNoRows) {
		return qu, err
	}
	if _, gerr := c.Get(ctx, id); gerr != nil {
		return Quest{}, gerr // ErrNotFound atau error DB
	}
	return Quest{}, ErrInactive
}

// delete — requires: quest ada; sekarang >= expiresAt atau active = false
// effects: quest dan semua Progress-nya dihapus (ON DELETE CASCADE pada progresses.quest_id)
func (c *Concept) Delete(ctx context.Context, id int64) error {
	qu, err := c.Get(ctx, id)
	if err != nil {
		return err
	}
	if qu.Active && c.now().Before(qu.ExpiresAt.Time) {
		return ErrNotDeletable
	}
	return c.q.DeleteQuest(ctx, id)
}

// Pembacaan (bukan action pada spec)
func (c *Concept) Get(ctx context.Context, id int64) (Quest, error) {
	qu, err := c.q.GetQuest(ctx, id)
	if errors.Is(err, pgx.ErrNoRows) {
		return Quest{}, ErrNotFound
	}
	return qu, err
}

func (c *Concept) ListActive(ctx context.Context) ([]Quest, error) {
	return c.q.ListActiveQuests(ctx, ts(c.now()))
}

// ListOpenForUser dipakai sync CompletedOrderAdvancesQuests pada klausa where:
// quest aktif, belum kedaluwarsa, dan progres user belum ada atau belum completed.
func (c *Concept) ListOpenForUser(ctx context.Context, userID int64) ([]Quest, error) {
	return c.q.ListOpenQuestsForUser(ctx, ListOpenQuestsForUserParams{Now: ts(c.now()), UserID: userID})
}

func (c *Concept) ListProgressByUser(ctx context.Context, userID int64) ([]Progress, error) {
	return c.q.ListProgressByUser(ctx, userID)
}
