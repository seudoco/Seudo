-- Services created before the specialty tag existed (0008) are all
-- untagged, so the specialty chip filter shows nothing for them even when
-- the title obviously names a specialty ("45min Reiki Healing"). Backfill
-- by matching title against specialty names. Going forward, the API also
-- auto-detects from the title/description when no tag was explicitly set
-- (see lib/practitioners/auto-tag.ts) — this migration only covers rows
-- that already existed before that logic was added.
update services
set specialty_id = sp.id
from specialties sp
where services.specialty_id is null
  and services.title ilike '%' || sp.name || '%';
