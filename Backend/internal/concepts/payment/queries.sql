-- name: CreatePayment :one
INSERT INTO payments (order_id, method, amount) VALUES ($1, $2, $3) RETURNING *;

-- name: GetPayment :one
SELECT * FROM payments WHERE id = $1;

-- name: ConfirmPayment :one
UPDATE payments SET status = 'success', paid_at = now()
WHERE id = $1 AND status = 'waiting' RETURNING *;

-- name: FailPayment :one
UPDATE payments SET status = 'failed' WHERE id = $1 AND status = 'waiting' RETURNING *;

-- name: ListPaymentsByOrder :many
SELECT * FROM payments WHERE order_id = $1 ORDER BY id;

-- name: ListWaitingPaymentsByOrder :many
SELECT * FROM payments WHERE order_id = $1 AND status = 'waiting' ORDER BY id;