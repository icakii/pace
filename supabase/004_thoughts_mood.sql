-- Run this in the Supabase SQL Editor to add mood tagging to journal entries.

alter table thoughts add column if not exists mood text;
