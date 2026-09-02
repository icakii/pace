-- Run this in the Supabase SQL Editor to add the Games feature.

create table if not exists game_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  game text not null,                        -- 'solitaire' | 'wordle' | 'memory' | '2048'
  play_date date not null,
  status text not null default 'in_progress', -- 'in_progress' | 'completed' | 'lost'
  attempts_used smallint not null default 0,  -- capped at 3
  points integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, game, play_date)
);

alter table game_results enable row level security;

create policy "Users manage their own game results"
  on game_results for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
