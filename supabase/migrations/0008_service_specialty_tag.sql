-- A service can be tagged with the one specialty it belongs to (e.g. a
-- "60-min Love Tarot Reading" tagged Tarot), so a practitioner has a real
-- button/tag control instead of only being able to name the specialty in
-- free-text title/description.
alter table services
  add column if not exists specialty_id smallint references specialties(id);
