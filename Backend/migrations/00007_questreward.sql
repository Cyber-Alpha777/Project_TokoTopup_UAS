-- +goose Up
CREATE TABLE balances (
    user_id BIGINT PRIMARY KEY,                       -- referensi ID ke users
    points  INT    NOT NULL DEFAULT 0 CHECK (points >= 0)
);

-- +goose Down
DROP TABLE IF EXISTS balances;