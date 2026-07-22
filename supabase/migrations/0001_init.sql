-- Seudo MVP — initial schema.
-- See /Users/louisburrell/.claude/plans/seudo-claude-inherited-koala.md §2 for the full spec this implements.

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

-- ============================================================================
-- profiles — 1:1 with auth.users, role-agnostic fields
-- ============================================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('client', 'practitioner')),
  email text not null,
  full_name text not null,
  phone text,
  date_of_birth date not null check (date_of_birth <= (current_date - interval '18 years')::date),
  country text not null,
  is_admin boolean not null default false,
  consent_accepted_at timestamptz not null default now(),
  consent_version text not null default 'v1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'One row per auth.users row. Role is immutable after insert (enforced by trigger, not just RLS).';
comment on column public.profiles.date_of_birth is 'CHECK enforces 18+ at the DB level as defense-in-depth; the signup API route also validates this before ever calling auth.signUp.';

-- ============================================================================
-- practitioner_profiles — 1:1 extension for role = 'practitioner'
-- ============================================================================

create table public.practitioner_profiles (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  display_name text,
  bio text,
  photo_url text,
  city text,
  country text,
  languages text[] not null default '{}',
  years_experience smallint,
  timezone text,
  is_published boolean not null default false,
  avg_rating numeric(3, 2),
  review_count integer not null default 0,
  stripe_connect_account_id text,
  stripe_connect_onboarded boolean not null default false,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.practitioner_profiles is 'display_name/timezone are nullable at the DB level — a practitioner exists in an incomplete state between signup and finishing Phase 2 onboarding. Completeness (including these two) is enforced by /api/practitioner/publish before is_published can become true, not by a NOT NULL constraint here.';

-- ============================================================================
-- specialties — fixed lookup list, seeded below
-- ============================================================================

create table public.specialties (
  id smallint primary key generated always as identity,
  name text not null unique
);

create table public.practitioner_specialties (
  practitioner_id uuid not null references public.practitioner_profiles (profile_id) on delete cascade,
  specialty_id smallint not null references public.specialties (id),
  primary key (practitioner_id, specialty_id)
);

-- ============================================================================
-- services
-- ============================================================================

create table public.services (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid not null references public.practitioner_profiles (profile_id) on delete cascade,
  title text not null,
  description text,
  duration_minutes smallint not null check (duration_minutes in (15, 30, 45, 60, 90)),
  price_usd numeric(10, 2) not null check (price_usd > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- availability_templates (weekly recurring) + availability_blocks (specific dates)
-- ============================================================================

create table public.availability_templates (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid not null references public.practitioner_profiles (profile_id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null check (end_time > start_time),
  created_at timestamptz not null default now()
);

create table public.availability_blocks (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid not null references public.practitioner_profiles (profile_id) on delete cascade,
  blocked_date date not null,
  unique (practitioner_id, blocked_date)
);

-- ============================================================================
-- bookings — the core table. See the exclusion constraint below: this is the
-- actual double-booking fix, not just application-level checking.
-- ============================================================================

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id),
  practitioner_id uuid not null references public.practitioner_profiles (profile_id),
  service_id uuid not null references public.services (id),
  status text not null check (
    status in ('pending', 'confirmed', 'completed', 'cancelled_refunded', 'cancelled_no_refund', 'expired', 'disputed')
  ),
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null check (scheduled_end > scheduled_start),
  price_usd numeric(10, 2) not null,
  platform_fee_usd numeric(10, 2) not null,
  practitioner_payout_usd numeric(10, 2) not null,
  pending_expires_at timestamptz,
  stripe_payment_intent_id text,
  stripe_charge_id text,
  stripe_transfer_id text,
  payout_eligible_at timestamptz,
  payout_released_at timestamptz,
  daily_room_name text,
  daily_room_url text,
  cancelled_by text check (cancelled_by in ('client', 'practitioner')),
  cancelled_at timestamptz,
  cancellation_reason text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint no_overlapping_bookings exclude using gist (
    practitioner_id with =,
    tstzrange(scheduled_start, scheduled_end) with &&
  ) where (status in ('pending', 'confirmed'))
);

comment on constraint no_overlapping_bookings on public.bookings is
  'The real double-booking fix. Two concurrent inserts for overlapping times on the same practitioner cannot both succeed — the loser gets a constraint-violation error, which the API route translates to 409 slot_unavailable.';

-- ============================================================================
-- reviews
-- ============================================================================

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id),
  client_id uuid not null references public.profiles (id),
  practitioner_id uuid not null references public.practitioner_profiles (profile_id),
  rating smallint not null check (rating between 1 and 5),
  comment text not null,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- processed_webhook_events — Stripe idempotency guard (Stripe delivers at-least-once)
-- ============================================================================

create table public.processed_webhook_events (
  event_id text primary key,
  processed_at timestamptz not null default now()
);

-- ============================================================================
-- gdpr_requests — compliance audit log
-- ============================================================================

create table public.gdpr_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id),
  request_type text not null check (request_type in ('export', 'deletion')),
  status text not null check (status in ('pending', 'completed', 'failed')),
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);

-- ============================================================================
-- Indexes
-- ============================================================================

create index bookings_client_id_idx on public.bookings (client_id);
create index bookings_practitioner_id_status_idx on public.bookings (practitioner_id, status);
create index services_practitioner_id_active_idx on public.services (practitioner_id, is_active);
create index practitioner_profiles_published_idx on public.practitioner_profiles (is_published);
create index availability_templates_practitioner_id_idx on public.availability_templates (practitioner_id);
create index availability_blocks_practitioner_id_idx on public.availability_blocks (practitioner_id);
create index reviews_practitioner_id_idx on public.reviews (practitioner_id);

-- ============================================================================
-- Trigger: auto-create profiles (and practitioner_profiles) on auth.users insert
-- ============================================================================

create function public.handle_new_user()
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
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Trigger: prevent role/is_admin changes from client-side updates
-- ============================================================================

create function public.prevent_protected_profile_field_changes()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role then
    raise exception 'role cannot be changed after signup';
  end if;
  if new.is_admin is distinct from old.is_admin and auth.role() <> 'service_role' then
    raise exception 'is_admin can only be changed by service role';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_fields
  before update on public.profiles
  for each row execute function public.prevent_protected_profile_field_changes();

-- ============================================================================
-- Trigger: recompute practitioner_profiles.avg_rating / review_count on review change
-- ============================================================================

create function public.recompute_practitioner_rating()
returns trigger
language plpgsql
as $$
declare
  v_practitioner_id uuid := coalesce(new.practitioner_id, old.practitioner_id);
begin
  update public.practitioner_profiles
  set
    avg_rating = (select round(avg(rating)::numeric, 2) from public.reviews where practitioner_id = v_practitioner_id),
    review_count = (select count(*) from public.reviews where practitioner_id = v_practitioner_id)
  where profile_id = v_practitioner_id;
  return null;
end;
$$;

create trigger reviews_recompute_rating
  after insert or delete on public.reviews
  for each row execute function public.recompute_practitioner_rating();

-- ============================================================================
-- Seed: specialties
-- ============================================================================

insert into public.specialties (name) values
  ('Tarot'), ('Astrology'), ('Reiki'), ('Human Design'), ('Spiritual Coaching'),
  ('Mediumship'), ('Meditation'), ('Numerology'), ('Energy Healing'), ('Clairvoyance');

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.practitioner_profiles enable row level security;
alter table public.specialties enable row level security;
alter table public.practitioner_specialties enable row level security;
alter table public.services enable row level security;
alter table public.availability_templates enable row level security;
alter table public.availability_blocks enable row level security;
alter table public.bookings enable row level security;
alter table public.reviews enable row level security;
alter table public.gdpr_requests enable row level security;
-- processed_webhook_events: no RLS — never queried from the client, service-role only.

-- profiles
create policy "profiles_select_own_or_admin" on public.profiles for select
  using (auth.uid() = id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
create policy "profiles_update_own" on public.profiles for update
  using (auth.uid() = id);
-- No INSERT/DELETE policy: rows are created only by the handle_new_user trigger
-- (security definer) and deleted only via the GDPR-delete API route (service role).

-- practitioner_profiles
create policy "practitioner_profiles_select_published_or_own_or_admin" on public.practitioner_profiles for select
  using (
    is_published
    or auth.uid() = profile_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );
create policy "practitioner_profiles_insert_own" on public.practitioner_profiles for insert
  with check (
    auth.uid() = profile_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'practitioner')
  );
create policy "practitioner_profiles_update_own" on public.practitioner_profiles for update
  using (auth.uid() = profile_id);

-- specialties (fixed reference list)
create policy "specialties_select_all" on public.specialties for select using (true);

-- practitioner_specialties
create policy "practitioner_specialties_select_all" on public.practitioner_specialties for select using (true);
create policy "practitioner_specialties_insert_own" on public.practitioner_specialties for insert
  with check (auth.uid() = practitioner_id);
create policy "practitioner_specialties_delete_own" on public.practitioner_specialties for delete
  using (auth.uid() = practitioner_id);

-- services
create policy "services_select_active_published_or_own_or_admin" on public.services for select
  using (
    (is_active and exists (
      select 1 from public.practitioner_profiles pp
      where pp.profile_id = services.practitioner_id and pp.is_published
    ))
    or auth.uid() = practitioner_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );
create policy "services_insert_own" on public.services for insert
  with check (auth.uid() = practitioner_id);
create policy "services_update_own" on public.services for update
  using (auth.uid() = practitioner_id);
create policy "services_delete_own" on public.services for delete
  using (auth.uid() = practitioner_id);

-- availability_templates / availability_blocks — owner-only, no public SELECT.
-- Open slots are served through /api/practitioners/[id]/slots (service role),
-- never by exposing these tables directly to anon/authenticated reads.
create policy "availability_templates_all_own" on public.availability_templates for all
  using (auth.uid() = practitioner_id) with check (auth.uid() = practitioner_id);
create policy "availability_blocks_all_own" on public.availability_blocks for all
  using (auth.uid() = practitioner_id) with check (auth.uid() = practitioner_id);

-- bookings — SELECT-only via RLS. All writes go through API routes using the
-- service-role client (exclusion constraint + Stripe coordination need full
-- server-side control), so there is deliberately no INSERT/UPDATE policy here.
create policy "bookings_select_own_or_admin" on public.bookings for select
  using (
    auth.uid() = client_id
    or auth.uid() = practitioner_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- reviews
create policy "reviews_select_all" on public.reviews for select using (true);
create policy "reviews_insert_own" on public.reviews for insert
  with check (auth.uid() = client_id);
-- No UPDATE policy (immutable). DELETE is admin-only, done via service role in the admin route.

-- gdpr_requests
create policy "gdpr_requests_select_own_or_admin" on public.gdpr_requests for select
  using (
    auth.uid() = profile_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );
create policy "gdpr_requests_insert_own" on public.gdpr_requests for insert
  with check (auth.uid() = profile_id);
