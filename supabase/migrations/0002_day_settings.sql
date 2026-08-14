-- Per-day timeline range ("Tag von/bis" in the admin toolbar). Falls back to
-- 10:00-00:00 in the app when no row exists for a given event/date, matching
-- the Claude Design prototype's defaults — see src/shared/data/api.ts.

create table event_day_settings (
  event_id uuid not null references events(id) on delete cascade,
  date date not null,
  day_start time not null default '10:00',
  day_end time not null default '00:00',
  primary key (event_id, date)
);

alter table event_day_settings enable row level security;

create policy "public read event_day_settings" on event_day_settings for select using (true);
create policy "authenticated write event_day_settings" on event_day_settings for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
