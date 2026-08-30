-- Run this in the Supabase SQL Editor (Project -> SQL Editor -> New query)

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text not null,
  due_date date,
  category text,
  completed boolean not null default false,
  start_time time,
  end_time time,
  recurrence_days smallint[],
  recurrence_interval smallint not null default 1,
  completed_dates date[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table tasks enable row level security;

create policy "Users can manage their own tasks"
  on tasks
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists thoughts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  content text not null,
  created_at timestamptz not null default now()
);

alter table thoughts enable row level security;

create policy "Users can manage their own thoughts"
  on thoughts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
