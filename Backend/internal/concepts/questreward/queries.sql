-- name: AddPoints :one
INSERT INTO balances (user_id, points) VALUES ($1, $2)
ON CONFLICT (user_id) DO UPDATE SET points = balances.points + EXCLUDED.points
RETURNING *;

-- name: SpendPoints :one
UPDATE balances SET points = points - sqlc.arg(points)::int
WHERE user_id = sqlc.arg(user_id) AND points >= sqlc.arg(points)::int
RETURNING *;

-- name: GetBalance :one
SELECT * FROM balances WHERE user_id = $1;