-- name: CreateQuest :one
INSERT INTO quests (label, points, target, expires_at) VALUES ($1, $2, $3, $4) RETURNING *;

-- name: GetQuest :one
SELECT * FROM quests WHERE id = $1;

-- name: ListActiveQuests :many
SELECT * FROM quests
WHERE active = TRUE AND expires_at > sqlc.arg(now)::timestamptz
ORDER BY expires_at, id;

-- name: ListOpenQuestsForUser :many
SELECT * FROM quests
WHERE active = TRUE AND expires_at > sqlc.arg(now)::timestamptz
  AND id NOT IN (SELECT quest_id FROM progresses WHERE user_id = sqlc.arg(user_id)::bigint AND completed = TRUE)
ORDER BY id;

-- name: ListProgressByUser :many
SELECT * FROM progresses WHERE user_id = $1 ORDER BY quest_id;

-- name: EnsureProgress :exec
INSERT INTO progresses (user_id, quest_id) VALUES ($1, $2)
ON CONFLICT (user_id, quest_id) DO NOTHING;

-- name: AddToProgress :one
UPDATE progresses
SET current = current + sqlc.arg(amount)::int,
    completed = (current + sqlc.arg(amount)::int >= sqlc.arg(target)::int)
WHERE user_id = sqlc.arg(user_id) AND quest_id = sqlc.arg(quest_id) AND completed = FALSE
RETURNING *;

-- name: DeactivateQuest :one
UPDATE quests SET active = FALSE WHERE id = $1 AND active = TRUE RETURNING *;

-- name: DeleteQuest :exec
DELETE FROM quests WHERE id = $1;