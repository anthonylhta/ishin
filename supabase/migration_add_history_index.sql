-- Covering index for the history query: GET /api/translations filters by
-- user_id and orders by created_at. Postgres does not auto-index FK columns,
-- so without this the query scans the whole table as it grows.
-- Run in the Supabase SQL editor (Dashboard → SQL Editor → New query).
CREATE INDEX IF NOT EXISTS idx_translations_user_created
  ON translations (user_id, created_at);
