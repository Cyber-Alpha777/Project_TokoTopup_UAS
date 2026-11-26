-- name: CreateOrder :one
INSERT INTO orders (buyer_id, product_id, in_game_id, zone_id, price)
VALUES ($1, $2, $3, $4, $5) RETURNING *;

-- name: GetOrder :one
SELECT * FROM orders WHERE id = $1;

-- name: GetOrderForUpdate :one
SELECT * FROM orders WHERE id = $1 FOR UPDATE;

-- name: ListOrdersByBuyer :many
SELECT * FROM orders
WHERE buyer_id = sqlc.arg('buyer_id')
  AND (sqlc.narg('status')::text IS NULL OR status = sqlc.narg('status')::text)
ORDER BY created_at DESC, id DESC
LIMIT sqlc.arg('page_size') OFFSET sqlc.arg('page_offset');

-- name: CountOrdersByBuyer :one
SELECT count(*) FROM orders
WHERE buyer_id = sqlc.arg('buyer_id')
  AND (sqlc.narg('status')::text IS NULL OR status = sqlc.narg('status')::text);

-- name: ListPendingOrdersByProduct :many
SELECT * FROM orders WHERE product_id = $1 AND status = 'pending' ORDER BY id;

-- name: MarkSending :one
UPDATE orders SET status = 'sending' WHERE id = $1 AND status = 'pending' RETURNING *;

-- name: MarkCompleted :one
UPDATE orders SET status = 'completed' WHERE id = $1 AND status = 'sending' RETURNING *;

-- name: CancelOrder :one
UPDATE orders SET status = 'cancelled' WHERE id = $1 AND status = 'pending' RETURNING *;

-- name: ApplyDiscount :one
UPDATE orders SET price = price - sqlc.arg('discount')::bigint
WHERE id = sqlc.arg('id') AND status = 'pending'
  AND sqlc.arg('discount')::bigint > 0 AND sqlc.arg('discount')::bigint < price
RETURNING *;