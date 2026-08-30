-- Run this in the Supabase SQL Editor to add scheduling/recurrence support
-- to an already-existing `tasks` table.

alter table tasks add column if not exists start_time time;
alter table tasks add column if not exists end_time time;
alter table tasks add column if not exists recurrence_days smallint[];
alter table tasks add column if not exists recurrence_interval smallint not null default 1;
alter table tasks add column if not exists completed_dates date[] not null default '{}';
