-- Enterprise upgrade migration (idempotent).
-- Run with:  psql "$DATABASE_URL" -f backend/migrations/001_enterprise_upgrade.sql

BEGIN;

-- Ensure uuid extension exists
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================
-- USERS: add credits, google_id, avatar_url; make password_hash nullable
-- =====================================================================
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS credits       NUMERIC(10, 3) NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS google_id     TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS avatar_url    TEXT,
  ADD COLUMN IF NOT EXISTS display_name  TEXT;

ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- =====================================================================
-- CHAT_SESSIONS: add title + updated_at
-- =====================================================================
ALTER TABLE chat_sessions
  ADD COLUMN IF NOT EXISTS title      TEXT NOT NULL DEFAULT 'New chat',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS chat_sessions_user_idx
  ON chat_sessions(user_id, updated_at DESC);

-- =====================================================================
-- MESSAGES: add media_type
-- =====================================================================
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'text';

CREATE INDEX IF NOT EXISTS messages_session_idx
  ON messages(session_id, created_at ASC);

-- =====================================================================
-- TRAINING_DATA_PIPELINE: RLHF dataset
-- =====================================================================
CREATE TABLE IF NOT EXISTS training_data_pipeline (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id    UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
  prompt        TEXT NOT NULL,
  response      TEXT NOT NULL,
  model         TEXT NOT NULL DEFAULT 'gemini-flash-lite-latest',
  media_type    TEXT NOT NULL DEFAULT 'text',
  quality_score SMALLINT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS training_user_idx ON training_data_pipeline(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS training_score_idx ON training_data_pipeline(quality_score)
  WHERE quality_score IS NOT NULL;

COMMIT;
