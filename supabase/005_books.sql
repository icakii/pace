-- Run this in the Supabase SQL Editor to add the e-reader's tables.

create table if not exists books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,        -- null for shared library books
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
