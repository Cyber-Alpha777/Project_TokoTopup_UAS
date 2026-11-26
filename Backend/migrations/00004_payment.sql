-- +goose Up
CREATE TABLE payments (
    id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id BIGINT      NOT NULL,                    -- referensi ID ke orders
    method   VARCHAR(30) NOT NULL,
    amount   BIGINT      NOT NULL CHECK (amount > 0),
    status   VARCHAR(10) NOT NULL DEFAULT 'waiting'
             CHECK (status IN ('waiting','success','failed')),
    paid_at  TIMESTAMPTZ
);
CREATE INDEX idx_payments_order ON payments(order_id);

-- +goose Down
DROP TABLE IF EXISTS payments;