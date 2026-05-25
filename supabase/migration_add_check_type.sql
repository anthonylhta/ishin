-- Add message_type column to distinguish translations from naturalness checks.
-- Existing rows default to 'translation'. Run this in the Supabase SQL editor.
ALTER TABLE translations ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'translation';
