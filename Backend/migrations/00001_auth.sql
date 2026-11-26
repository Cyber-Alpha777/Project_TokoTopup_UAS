-- +goose Up

CREATE TABLE users (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name          VARCHAR(50)  NOT NULL,
    email         VARCHAR(100) NOT NULL UNIQUE,
    password_hash TEXT         NOT NULL,
    birth_date    DATE         NOT NULL,              
    whatsapp      VARCHAR(15)  NOT NULL,
    role          VARCHAR(10)  NOT NULL DEFAULT 'member' CHECK (role IN ('member','admin')),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE IF EXISTS users;