package payment

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
)

const (
	StatusWaiting = "waiting"
	StatusSuccess = "success"
	StatusFailed  = "failed"
)

var (
	ErrNotFound      = errors.New("payment: pembayaran tidak ditemukan")
	ErrInvalidAmount = errors.New("payment: jumlah harus lebih dari 0")
	ErrNotWaiting    = errors.New("payment: status pembayaran bukan waiting")
)

type Concept struct{ q *Queries }

func NewConcept(db DBTX) *Concept { return &Concept{q: New(db)} }

// initiate — requires: amount > 0
func (c *Concept) Initiate(ctx context.Context, orderID int64, method string, amount int64) (Payment, error) {
	if amount <= 0 {
		return Payment{}, ErrInvalidAmount
	}
	return c.q.CreatePayment(ctx, CreatePaymentParams{OrderID: orderID, Method: method, Amount: amount})
}

// confirm — requires: status = waiting
func (c *Concept) Confirm(ctx context.Context, id int64) (Payment, error) {
	p, err := c.q.ConfirmPayment(ctx, id)
	return p, c.explain(ctx, id, err)
}

// fail — requires: status = waiting
func (c *Concept) Fail(ctx context.Context, id int64) (Payment, error) {
	p, err := c.q.FailPayment(ctx, id)
	return p, c.explain(ctx, id, err)
}

// Pembacaan (bukan action pada spec)
func (c *Concept) Get(ctx context.Context, id int64) (Payment, error) {
	p, err := c.q.GetPayment(ctx, id)
	if errors.Is(err, pgx.ErrNoRows) {
		return Payment{}, ErrNotFound
	}
	return p, err
}

func (c *Concept) ListByOrder(ctx context.Context, orderID int64) ([]Payment, error) {
	return c.q.ListPaymentsByOrder(ctx, orderID)
}

func (c *Concept) ListWaitingByOrder(ctx context.Context, orderID int64) ([]Payment, error) {
	return c.q.ListWaitingPaymentsByOrder(ctx, orderID)
}

func (c *Concept) explain(ctx context.Context, id int64, err error) error {
	if !errors.Is(err, pgx.ErrNoRows) {
		return err
	}
	if _, gerr := c.q.GetPayment(ctx, id); gerr != nil {
		if errors.Is(gerr, pgx.ErrNoRows) {
			return ErrNotFound
		}
		return gerr
	}
	return ErrNotWaiting
}
