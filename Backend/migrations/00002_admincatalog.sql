-- +goose Up
CREATE TABLE games (
    id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name   VARCHAR(100) NOT NULL UNIQUE,
    active BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE products (
    id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    game_id BIGINT       NOT NULL REFERENCES games(id),
    label   VARCHAR(100) NOT NULL,
    price   BIGINT       NOT NULL CHECK (price > 0),
    active  BOOLEAN      NOT NULL DEFAULT TRUE
);

-- +goose Down
DROP TABLE IF EXISTS products, games;