-- +goose Up
CREATE TABLE offers (
    id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    label    VARCHAR(100) NOT NULL,
    discount BIGINT       NOT NULL CHECK (discount > 0),
    cost     INT          NOT NULL CHECK (cost > 0),
    stock    INT          NOT NULL CHECK (stock >= 0),
    active   BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE exchanges (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id      BIGINT      NOT NULL,
    offer_id     BIGINT      NOT NULL REFERENCES offers(id),
    cost         INT         NOT NULL CHECK (cost > 0),
    exchanged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE IF EXISTS exchanges, offers;