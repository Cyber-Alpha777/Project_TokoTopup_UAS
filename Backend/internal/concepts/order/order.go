package order

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

const (
	StatusPending   = "pending"
	StatusSending   = "sending"
	StatusCompleted = "completed"
	StatusCancelled = "cancelled"
)

var (
	ErrNotFound        = errors.New("order: order tidak ditemukan")
	ErrInvalidPrice    = errors.New("order: harga harus lebih dari 0")
	ErrNotPending      = errors.New("order: status order bukan pending")
	ErrNotSending      = errors.New("order: status order bukan sending")
	ErrInvalidDiscount = errors.New("order: diskon harus lebih dari 0 dan kurang dari harga")
)

type Concept struct{ q *Queries }

func NewConcept(db DBTX) *Concept { return &Concept{q: New(db)} }

// create — requires: price > 0
func (c *Concept) Create(ctx context.Context, buyerID, productID int64, inGameID, zoneID string, price int64) (Order, error) {
	if price <= 0 {
		return Order{}, ErrInvalidPrice
	}
	return c.q.CreateOrder(ctx, CreateOrderParams{
		BuyerID: buyerID, ProductID: productID, InGameID: inGameID,
		ZoneID: pgtype.Text{String: zoneID, Valid: zoneID != ""}, Price: price,
	})
}

// markSending — requires: status = pending
func (c *Concept) MarkSending(ctx context.Context, id int64) (Order, error) {
	o, err := c.q.MarkSending(ctx, id)
	return o, c.explain(ctx, id, err, ErrNotPending)
}

// markCompleted — requires: status = sending
func (c *Concept) MarkCompleted(ctx context.Context, id int64) (Order, error) {
	o, err := c.q.MarkCompleted(ctx, id)
	return o, c.explain(ctx, id, err, ErrNotSending)
}

// cancel — requires: status = pending
func (c *Concept) Cancel(ctx context.Context, id int64) (Order, error) {
	o, err := c.q.CancelOrder(ctx, id)
	return o, c.explain(ctx, id, err, ErrNotPending)
}

// applyDiscount — requires: status = pending; 0 < discount < price
func (c *Concept) ApplyDiscount(ctx context.Context, id, discount int64) (Order, error) {
	o, err := c.q.ApplyDiscount(ctx, ApplyDiscountParams{ID: id, Discount: discount})
	if !errors.Is(err, pgx.ErrNoRows) {
		return o, err
	}
	cur, gerr := c.q.GetOrder(ctx, id)
	switch {
	case errors.Is(gerr, pgx.ErrNoRows):
		return Order{}, ErrNotFound
	case gerr != nil:
		return Order{}, gerr
	case cur.Status != StatusPending:
		return Order{}, ErrNotPending
	default:
		return Order{}, ErrInvalidDiscount
	}
}

// Pembacaan (bukan action pada spec)
func (c *Concept) Get(ctx context.Context, id int64) (Order, error) {
	o, err := c.q.GetOrder(ctx, id)
	if errors.Is(err, pgx.ErrNoRows) {
		return Order{}, ErrNotFound
	}
	return o, err
}

// GetForUpdate mengunci baris order sampai transaksi selesai.
func (c *Concept) GetForUpdate(ctx context.Context, id int64) (Order, error) {
	o, err := c.q.GetOrderForUpdate(ctx, id)
	if errors.Is(err, pgx.ErrNoRows) {
		return Order{}, ErrNotFound
	}
	return o, err
}

func (c *Concept) ListByBuyer(ctx context.Context, buyerID int64, status string, limit, offset int32) ([]Order, int64, error) {
	st := pgtype.Text{String: status, Valid: status != ""}
	items, err := c.q.ListOrdersByBuyer(ctx, ListOrdersByBuyerParams{
		BuyerID: buyerID, Status: st, PageSize: limit, PageOffset: offset,
	})
	if err != nil {
		return nil, 0, err
	}
	total, err := c.q.CountOrdersByBuyer(ctx, CountOrdersByBuyerParams{BuyerID: buyerID, Status: st})
	return items, total, err
}

func (c *Concept) ListPendingByProduct(ctx context.Context, productID int64) ([]Order, error) {
	return c.q.ListPendingOrdersByProduct(ctx, productID)
}

// explain: jika UPDATE tidak mengubah baris, bedakan "tidak ada" dari "status salah".
func (c *Concept) explain(ctx context.Context, id int64, err, wrongStatus error) error {
	if !errors.Is(err, pgx.ErrNoRows) {
		return err
	}
	if _, gerr := c.q.GetOrder(ctx, id); gerr != nil {
		if errors.Is(gerr, pgx.ErrNoRows) {
			return ErrNotFound
		}
		return gerr
	}
	return wrongStatus
}
