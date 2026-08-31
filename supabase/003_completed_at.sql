-- Run this in the Supabase SQL Editor to add real completion-time tracking
-- to an already-existing `tasks` table (needed for accurate streaks).

alter table tasks add column if not exists completed_at timestamptz;
