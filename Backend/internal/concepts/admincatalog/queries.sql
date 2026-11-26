-- name: CreateGame :one
INSERT INTO games (name) VALUES ($1) RETURNING *;

-- name: GetGame :one
SELECT * FROM games WHERE id = $1;

-- name: GetGameByName :one
SELECT * FROM games WHERE name = $1;

-- name: ListActiveGames :many
SELECT * FROM games WHERE active = TRUE ORDER BY name;

-- name: CreateProduct :one
INSERT INTO products (game_id, label, price) VALUES ($1, $2, $3) RETURNING *;

-- name: GetProduct :one
SELECT * FROM products WHERE id = $1;

-- name: ListActiveProductsByGame :many
SELECT * FROM products WHERE game_id = $1 AND active = TRUE ORDER BY price;

-- name: UpdateProductPrice :one
UPDATE products SET price = $2 WHERE id = $1 RETURNING *;

-- name: DeactivateProduct :one
UPDATE products SET active = FALSE WHERE id = $1 RETURNING *;