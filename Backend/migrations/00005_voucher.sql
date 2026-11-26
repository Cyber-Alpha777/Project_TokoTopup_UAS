-- +goose Up
CREATE TABLE vouchers (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code       VARCHAR(30)  NOT NULL UNIQUE,
    discount   BIGINT       NOT NULL CHECK (discount > 0),
    quota      INT          NOT NULL CHECK (quota >= 0),
    expires_at TIMESTAMPTZ  NOT NULL,                 -- BARU (usulan 2)
    owner_id   BIGINT,                                -- BARU (usulan 3): NULL = voucher umum; referensi ID ke users
    active     BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE redemptions (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    voucher_id BIGINT NOT NULL REFERENCES vouchers(id),
    user_id    BIGINT NOT NULL,
    order_id   BIGINT NOT NULL,
    UNIQUE (voucher_id, user_id)
);

-- +goose Down
DROP TABLE IF EXISTS redemptions, vouchers;