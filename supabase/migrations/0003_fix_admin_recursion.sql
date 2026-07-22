-- Fix: every policy that checked admin status via
--   exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
-- causes infinite recursion when evaluated on public.profiles itself — that
-- subquery is a SELECT against profiles, which re-triggers profiles' own RLS
-- policy, which runs the same subquery again, forever.
--
-- Standard fix: a SECURITY DEFINER function. It runs as the function owner
-- (a role that bypasses RLS on this project), so the lookup inside it does
-- not re-trigger RLS evaluation — no recursion.

create function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- profiles — this is the one that was actually recursing.
drop policy "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles for select
  using (auth.uid() = id or public.is_admin());

-- practitioner_profiles
drop policy "practitioner_profiles_select_published_or_own_or_admin" on public.practitioner_profiles;
create policy "practitioner_profiles_select_published_or_own_or_admin" on public.practitioner_profiles for select
  using (is_published or auth.uid() = profile_id or public.is_admin());

-- services
drop policy "services_select_active_published_or_own_or_admin" on public.services;
create policy "services_select_active_published_or_own_or_admin" on public.services for select
  using (
    (is_active and exists (
      select 1 from public.practitioner_profiles pp
      where pp.profile_id = services.practitioner_id and pp.is_published
    ))
    or auth.uid() = practitioner_id
    or public.is_admin()
  );

-- bookings
drop policy "bookings_select_own_or_admin" on public.bookings;
create policy "bookings_select_own_or_admin" on public.bookings for select
  using (auth.uid() = client_id or auth.uid() = practitioner_id or public.is_admin());

-- gdpr_requests
drop policy "gdpr_requests_select_own_or_admin" on public.gdpr_requests;
create policy "gdpr_requests_select_own_or_admin" on public.gdpr_requests for select
  using (auth.uid() = profile_id or public.is_admin());
