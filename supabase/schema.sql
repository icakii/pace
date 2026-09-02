-- Run this in the Supabase SQL Editor (Project -> SQL Editor -> New query)

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text not null,
  due_date date,
  category text,
  completed boolean not null default false,
  completed_at timestamptz,
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
  mood text,
  created_at timestamptz not null default now()
);

alter table thoughts enable row level security;

create policy "Users can manage their own thoughts"
  on thoughts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- E-reader: also create a private Storage bucket named "books" and apply
-- the policies in 006_books_storage_policies.sql (can't be created from SQL alone).
create table if not exists books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  title text not null,
  author text,
  storage_path text not null unique,
  is_library boolean not null default false,
  created_at timestamptz not null default now()
);

alter table books enable row level security;

create policy "Read own books or the shared library"
  on books for select
  using (is_library = true or auth.uid() = user_id);

create policy "Manage own books"
  on books for all
  using (auth.uid() = user_id and is_library = false)
  with check (auth.uid() = user_id and is_library = false);

create table if not exists reading_progress (
  user_id uuid references auth.users not null,
  book_id uuid references books not null,
  location text,
  updated_at timestamptz not null default now(),
  primary key (user_id, book_id)
);

alter table reading_progress enable row level security;

create policy "Users manage their own reading progress"
  on reading_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists game_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  game text not null,
  play_date date not null,
  status text not null default 'in_progress',
  attempts_used smallint not null default 0,
  points integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, game, play_date)
);

alter table game_results enable row level security;

create policy "Users manage their own game results"
  on game_results for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

create policy "Users manage their own push subscriptions"
  on push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists notification_settings (
  user_id uuid primary key references auth.users,
  task_reminders boolean not null default false,
  thoughts_reminder boolean not null default false,
  thoughts_reminder_time time not null default '20:00',
  timezone text not null default 'UTC',
  last_thoughts_nudge date,
  last_floating_task_nudge date,
  updated_at timestamptz not null default now()
);

alter table notification_settings enable row level security;

create policy "Users manage their own notification settings"
  on notification_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
