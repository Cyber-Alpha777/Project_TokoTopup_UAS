-- name: CreateOffer :one
INSERT INTO offers (label, discount, cost, stock) VALUES ($1, $2, $3, $4) RETURNING *;

-- name: GetOffer :one
SELECT * FROM offers WHERE id = $1;

-- name: ListActiveOffers :many
SELECT * FROM offers WHERE active = TRUE ORDER BY cost, id;

-- name: TakeOfferStock :one
UPDATE offers SET stock = stock - 1
WHERE id = $1 AND active = TRUE AND stock > 0
RETURNING *;

-- name: DeactivateOffer :one
UPDATE offers SET active = FALSE WHERE id = $1 AND active = TRUE RETURNING *;

-- name: CreateExchange :one
INSERT INTO exchanges (user_id, offer_id, cost) VALUES ($1, $2, $3) RETURNING *;

-- name: ListExchangesByUser :many
SELECT * FROM exchanges WHERE user_id = $1 ORDER BY exchanged_at DESC, id DESC;