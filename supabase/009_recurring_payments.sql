-- Run this in the Supabase SQL Editor to add the Recurring Payments tracker.

create table if not exists payment_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  color text,
  created_at timestamptz not null default now()
);

alter table payment_groups enable row level security;

create policy "Users manage their own payment groups"
  on payment_groups for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists recurring_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  group_id uuid references payment_groups on delete set null,
  title text not null,
  description text,
  amount numeric not null,
  currency text not null default 'USD',
  billing_cycle text not null default 'monthly', -- 'weekly' | 'monthly' | 'yearly'
  next_charge_date date not null,
  card_last4 text,
  active boolean not null default true,
  last_reminder_sent_for date,
  created_at timestamptz not null default now()
);

alter table recurring_payments enable row level security;

create policy "Users manage their own recurring payments"
  on recurring_payments for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table notification_settings
  add column if not exists payment_reminders boolean not null default false,
  add column if not exists payment_reminder_days smallint not null default 2;
