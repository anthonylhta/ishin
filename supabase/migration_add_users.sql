-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- Steps must be run in order. If the translations table already has rows,
-- step 2 backfills them so the FK in step 3 doesn't fail.

-- 1. Create users table
CREATE TABLE IF NOT EXISTS users (
  id         TEXT        PRIMARY KEY,   -- Clerk userId, e.g. user_abc123
  email      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Backfill: create a stub row for every existing user_id in translations
--    (no email available for historical rows — that's fine)
INSERT INTO users (id)
SELECT DISTINCT user_id FROM translations
ON CONFLICT DO NOTHING;

-- 3. Add FK: translations.user_id → users.id, cascade on account delete
ALTER TABLE translations
  ADD CONSTRAINT translations_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 4. Lock down the users table from the anon key (service-role still works)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
