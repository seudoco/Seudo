-- Search only matched a practitioner's own profile fields (display_name/
-- bio/city/country) and their profile-level specialty tags. A service like
-- "45min Reiki Healing" didn't surface its practitioner when searching
-- "Reiki" unless the practitioner had *also* tagged their profile with
-- Reiki — the per-service specialty tag (0008) and the service's own
-- title/description were never checked. Extend the search to cover both.
create or replace function search_practitioners_fuzzy(search_term text)
returns table (profile_id uuid)
language sql
stable
security invoker
as $$
  select distinct pp.profile_id
  from practitioner_profiles pp
  left join services s on s.practitioner_id = pp.profile_id and s.is_active = true
  where pp.is_published = true
    and (
      pp.display_name ilike '%' || search_term || '%'
      or pp.bio ilike '%' || search_term || '%'
      or pp.city ilike '%' || search_term || '%'
      or pp.country ilike '%' || search_term || '%'
      or s.title ilike '%' || search_term || '%'
      or s.description ilike '%' || search_term || '%'
      or similarity(coalesce(pp.display_name, ''), search_term) > 0.25
      or similarity(coalesce(pp.bio, ''), search_term) > 0.25
      or similarity(coalesce(pp.city, ''), search_term) > 0.3
      or similarity(coalesce(pp.country, ''), search_term) > 0.3
      or similarity(coalesce(s.title, ''), search_term) > 0.25
    );
$$;

grant execute on function search_practitioners_fuzzy(text) to anon, authenticated, service_role;

create index if not exists services_title_trgm on services using gin (title gin_trgm_ops);
create index if not exists services_description_trgm on services using gin (description gin_trgm_ops);
