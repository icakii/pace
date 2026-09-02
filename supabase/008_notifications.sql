-- Run this in the Supabase SQL Editor to add push notification support.

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
