-- Availability model change: a practitioner is available every day at all
-- times by default. Blocking now supports either a whole date (start_time/
-- end_time both null, existing behavior) or a specific time range within a
-- date (both set) — matches "blocks dates or specific times."

alter table public.availability_blocks
  add column start_time time,
  add column end_time time;

alter table public.availability_blocks
  add constraint availability_blocks_time_range_check
  check (
    (start_time is null and end_time is null)
    or (start_time is not null and end_time is not null and end_time > start_time)
  );

-- The prior unique(practitioner_id, blocked_date) constraint assumed one row
-- per blocked date. Multiple partial-time blocks can now exist on the same
-- date (e.g. 12:00-13:00 lunch AND 18:00-19:00 later that day), so the
-- uniqueness needs to allow that while still preventing two identical
-- whole-day blocks for the same date.
-- if exists: Postgres's standard auto-generated name for an unnamed inline
-- unique() constraint, but falling back to a no-op rather than failing the
-- whole migration if the actual name ever differs.
alter table public.availability_blocks drop constraint if exists availability_blocks_practitioner_id_blocked_date_key;
create unique index availability_blocks_unique_range
  on public.availability_blocks (practitioner_id, blocked_date, coalesce(start_time, '00:00'), coalesce(end_time, '00:00'));
