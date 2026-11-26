-- +goose Up
CREATE TABLE orders (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    buyer_id   BIGINT      NOT NULL,                  -- referensi ID ke users
    product_id BIGINT      NOT NULL,                  -- referensi ID ke products
    in_game_id VARCHAR(50) NOT NULL,
    zone_id    VARCHAR(10),
    price      BIGINT      NOT NULL CHECK (price > 0),
    status     VARCHAR(10) NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','sending','completed','cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_buyer ON orders(buyer_id);

-- +goose Down
DROP TABLE IF EXISTS orders;