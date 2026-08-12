-- Per-helper availability, keyed by "event_id:date" (see src/shared/types.ts
-- Helper.availability). NULL means "always available" — the app treats a
-- missing/NULL value that way, so no default is needed here.

alter table helpers add column availability text[];
