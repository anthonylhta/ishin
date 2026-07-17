-- Waitlist for the Ishin for Business landing page (POST /api/waitlist).
-- Service-role only: RLS is enabled with no anon policies, so the public anon
-- key can't read or write it; the route uses the service-role key.
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query).
CREATE TABLE IF NOT EXISTS waitlist (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT        NOT NULL UNIQUE,
  context    TEXT,
  source     TEXT        NOT NULL DEFAULT 'business-landing',
  country    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
