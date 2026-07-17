-- Waitlist for the Ishin for Business landing page (POST /api/waitlist).
-- Service-role only: RLS is enabled with no anon policies, so the public anon
-- key can't read or write it; the route uses the service-role key.
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query).
create table waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  context    text,
  source     text not null default 'business-landing',
  country    text,
  created_at timestamptz not null default now()
);
alter table waitlist enable row level security;
