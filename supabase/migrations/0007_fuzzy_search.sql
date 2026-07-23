-- Typo-tolerant browse search ("tarrot" should still find "Tarot"). Plain
-- ILIKE only does exact substrings, so add pg_trgm trigram similarity
-- alongside it via two SECURITY INVOKER functions (RLS on the underlying
-- tables still applies, since these run as the calling role, not a
-- privileged owner).
create extension if not exists pg_trgm;

create index if not exists practitioner_profiles_display_name_trgm
  on practitioner_profiles using gin (display_name gin_trgm_ops);
create index if not exists practitioner_profiles_bio_trgm
  on practitioner_profiles using gin (bio gin_trgm_ops);
create index if not exists practitioner_profiles_city_trgm
  on practitioner_profiles using gin (city gin_trgm_ops);
create index if not exists practitioner_profiles_country_trgm
  on practitioner_profiles using gin (country gin_trgm_ops);
create index if not exists specialties_name_trgm
  on specialties using gin (name gin_trgm_ops);

-- Practitioner ids whose display_name/bio/city/country match the search
-- term either as a substring (ILIKE, keeps short/exact terms working well —
-- trigram similarity under-scores very short strings) or by trigram
-- similarity (typo-tolerant).
create or replace function search_practitioners_fuzzy(search_term text)
returns table (profile_id uuid)
language sql
stable
security invoker
as $$
  select profile_id
  from practitioner_profiles
  where is_published = true
    and (
      display_name ilike '%' || search_term || '%'
      or bio ilike '%' || search_term || '%'
      or city ilike '%' || search_term || '%'
      or country ilike '%' || search_term || '%'
      or similarity(coalesce(display_name, ''), search_term) > 0.25
      or similarity(coalesce(bio, ''), search_term) > 0.25
      or similarity(coalesce(city, ''), search_term) > 0.3
      or similarity(coalesce(country, ''), search_term) > 0.3
    );
$$;

-- Specialty ids whose name matches the term, substring or fuzzy.
create or replace function search_specialties_fuzzy(search_term text)
returns table (id smallint)
language sql
stable
security invoker
as $$
  select id
  from specialties
  where name ilike '%' || search_term || '%'
     or similarity(name, search_term) > 0.3;
$$;

grant execute on function search_practitioners_fuzzy(text) to anon, authenticated, service_role;
grant execute on function search_specialties_fuzzy(text) to anon, authenticated, service_role;
