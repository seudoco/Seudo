-- "Available every day at all times by default" needs to be true from the
-- moment a practitioner signs up, not just once they've visited the
-- availability page — generateSlots treats an empty weeklyTemplate as fully
-- UNavailable (no rows to iterate), the opposite of the intended default.
-- Seed the 7 daily rows at signup instead of teaching generateSlots a
-- special-case "empty means everything" rule — keeps the DB the single
-- source of truth for what's actually bookable.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := new.raw_user_meta_data ->> 'role';
  v_full_name text := new.raw_user_meta_data ->> 'full_name';
begin
  insert into public.profiles (id, role, email, full_name, phone, date_of_birth, country)
  values (
    new.id,
    v_role,
    new.email,
    v_full_name,
    new.raw_user_meta_data ->> 'phone',
    (new.raw_user_meta_data ->> 'date_of_birth')::date,
    new.raw_user_meta_data ->> 'country'
  );

  if v_role = 'practitioner' then
    insert into public.practitioner_profiles (profile_id, display_name)
    values (new.id, v_full_name);

    insert into public.availability_templates (practitioner_id, day_of_week, start_time, end_time)
    select new.id, d, '00:00', '23:59'
    from generate_series(0, 6) as d;
  end if;

  return new;
end;
$$;

-- Backfill: give any existing practitioner with zero template rows the same
-- default (covers accounts created before this migration).
insert into public.availability_templates (practitioner_id, day_of_week, start_time, end_time)
select pp.profile_id, d.day, '00:00', '23:59'
from public.practitioner_profiles pp
cross join generate_series(0, 6) as d(day)
where not exists (
  select 1 from public.availability_templates at
  where at.practitioner_id = pp.profile_id
);
