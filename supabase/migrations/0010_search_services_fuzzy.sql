-- Services (not practitioners) are now the primary browsable unit — a
-- search for "Human Design 101" should surface that exact listing, not
-- just the practitioner's profile. One function does title/description,
-- the practitioner's own name/bio/location, and the service's specialty
-- tag, each with ILIKE + trigram similarity (typo tolerance).
create or replace function search_services_fuzzy(search_term text)
returns table (service_id uuid)
language sql
stable
security invoker
as $$
  select distinct s.id
  from services s
  join practitioner_profiles pp on pp.profile_id = s.practitioner_id
  left join specialties sp on sp.id = s.specialty_id
  where s.is_active = true
    and pp.is_published = true
    and (
      s.title ilike '%' || search_term || '%'
      or s.description ilike '%' || search_term || '%'
      or pp.display_name ilike '%' || search_term || '%'
      or pp.bio ilike '%' || search_term || '%'
      or pp.city ilike '%' || search_term || '%'
      or pp.country ilike '%' || search_term || '%'
      or sp.name ilike '%' || search_term || '%'
      or similarity(coalesce(s.title, ''), search_term) > 0.25
      or similarity(coalesce(s.description, ''), search_term) > 0.2
      or similarity(coalesce(pp.display_name, ''), search_term) > 0.25
      or similarity(coalesce(pp.bio, ''), search_term) > 0.25
      or similarity(coalesce(sp.name, ''), search_term) > 0.3
    );
$$;

grant execute on function search_services_fuzzy(text) to anon, authenticated, service_role;
