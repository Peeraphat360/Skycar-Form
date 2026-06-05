-- Adds the columns LINE login needs to the existing `users` table.
-- Run this once against your Supabase/Postgres database.

alter table public.users
  add column if not exists line_user_id text,
  add column if not exists display_name text,
  add column if not exists picture_url  text,
  add column if not exists provider     text default 'line';

-- line_user_id is the conflict target for upsert in config/passport.ts
create unique index if not exists users_line_user_id_key
  on public.users (line_user_id);
