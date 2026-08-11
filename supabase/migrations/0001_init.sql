-- Schichtplaner core schema.
-- Read-only for anon (Helfer view, no login), write access requires an
-- authenticated session (Admin area — see src/shared/auth/AuthContext.tsx).
-- Every authenticated user is treated as an admin; there's no separate
-- admin role table because the design only ever describes a single shared
-- "Angemeldet als Admin" identity, not per-user permission tiers.

create extension if not exists "pgcrypto";

create table role_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null
);

create table helpers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tags text[] not null default '{}',
  role_tag_id uuid references role_tags(id) on delete set null,
  created_at timestamptz not null default now()
);

create table events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date not null,
  ablaufplan text not null default '',
  created_at timestamptz not null default now(),
  constraint events_date_order check (end_date >= start_date)
);

create table event_tags (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  unique (event_id, name)
);

create table shifts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  tag_id uuid not null references event_tags(id) on delete restrict,
  name text not null,
  description text not null default '',
  start_time timestamptz not null,
  end_time timestamptz not null,
  created_at timestamptz not null default now(),
  constraint shifts_time_order check (end_time > start_time)
);

create table shift_assignments (
  shift_id uuid not null references shifts(id) on delete cascade,
  helper_id uuid not null references helpers(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (shift_id, helper_id)
);

create index shifts_event_id_idx on shifts(event_id);
create index shifts_tag_id_idx on shifts(tag_id);
create index event_tags_event_id_idx on event_tags(event_id);

alter table role_tags enable row level security;
alter table helpers enable row level security;
alter table events enable row level security;
alter table event_tags enable row level security;
alter table shifts enable row level security;
alter table shift_assignments enable row level security;

-- Public read (Helfer view + Admin view before/without login) -------------
create policy "public read role_tags" on role_tags for select using (true);
create policy "public read helpers" on helpers for select using (true);
create policy "public read events" on events for select using (true);
create policy "public read event_tags" on event_tags for select using (true);
create policy "public read shifts" on shifts for select using (true);
create policy "public read shift_assignments" on shift_assignments for select using (true);

-- Authenticated write (Admin area) -----------------------------------------
create policy "authenticated write role_tags" on role_tags for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated write helpers" on helpers for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated write events" on events for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated write event_tags" on event_tags for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated write shifts" on shifts for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated write shift_assignments" on shift_assignments for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Realtime (Timeline / Helfer list live updates) ---------------------------
alter publication supabase_realtime add table shifts;
alter publication supabase_realtime add table shift_assignments;

-- Seed data mirroring src/shared/mock/data.ts, so a fresh Supabase project
-- starts out matching local/mock dev.
insert into role_tags (id, name, color) values
  ('00000000-0000-0000-0000-000000000001', 'Vorstand', '#C2673A'),
  ('00000000-0000-0000-0000-000000000002', 'Freiw. Helfer', '#3B9C8C');
