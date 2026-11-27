-- name: CreateVoucher :one
INSERT INTO vouchers (code, discount, quota, expires_at, owner_id)
VALUES ($1, $2, $3, $4, $5) RETURNING *;

-- name: GetVoucherByCode :one
SELECT * FROM vouchers WHERE code = $1;

-- name: ListVouchers :many
SELECT * FROM vouchers ORDER BY id DESC
LIMIT sqlc.arg(page_limit)::int OFFSET sqlc.arg(page_offset)::int;

-- name: CountVouchers :one
SELECT count(*) FROM vouchers;

-- name: ListUsableVouchersByOwner :many
SELECT * FROM vouchers v
WHERE v.owner_id = sqlc.arg(owner_id)::bigint
  AND v.active = TRUE AND v.quota > 0 AND v.expires_at > sqlc.arg(now)::timestamptz
  AND NOT EXISTS (SELECT 1 FROM redemptions r WHERE r.voucher_id = v.id AND r.user_id = sqlc.arg(owner_id)::bigint)
ORDER BY v.expires_at, v.id;

-- name: DecrementQuota :one
UPDATE vouchers SET quota = quota - 1 WHERE id = $1 AND quota > 0 RETURNING *;

-- name: RestoreQuota :exec
UPDATE vouchers SET quota = quota + 1 WHERE id = $1;

-- name: CreateRedemption :one
INSERT INTO redemptions (voucher_id, user_id, order_id) VALUES ($1, $2, $3) RETURNING *;

-- name: ListRedemptionsByOrder :many
SELECT * FROM redemptions WHERE order_id = $1;

-- name: DeleteRedemptionsByOrder :many
DELETE FROM redemptions WHERE order_id = $1 RETURNING *;