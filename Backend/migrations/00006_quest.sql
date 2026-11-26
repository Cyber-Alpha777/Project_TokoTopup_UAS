-- +goose Up
CREATE TABLE quests (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    label      VARCHAR(100) NOT NULL,
    points     INT          NOT NULL CHECK (points > 0),
    target     INT          NOT NULL CHECK (target > 0),
    expires_at TIMESTAMPTZ  NOT NULL,
    active     BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE progresses (
    id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id   BIGINT  NOT NULL,
    quest_id  BIGINT  NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
    current   INT     NOT NULL DEFAULT 0 CHECK (current >= 0),
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (user_id, quest_id)
);

-- +goose Down
DROP TABLE IF EXISTS progresses, quests;