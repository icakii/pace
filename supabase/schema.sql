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
