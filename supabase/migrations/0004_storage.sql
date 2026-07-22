-- Supabase Storage bucket for practitioner profile photos. Public bucket
-- (photos are shown on public browse/profile pages, no signed URLs needed)
-- with RLS on storage.objects restricting writes to the owning practitioner,
-- keyed by a {practitioner_id}/{filename} path convention.
--
-- The bucket itself (practitioner-photos, public, 5MB limit, image mime
-- types only) was already created via the Storage API (supabase.storage.
-- createBucket) — that's a REST call, not raw SQL, so no need to repeat it
-- here. This migration only adds the RLS policies on storage.objects, which
-- has no JS API equivalent.

create policy "practitioner_photos_public_read"
on storage.objects for select
using (bucket_id = 'practitioner-photos');

create policy "practitioner_photos_owner_insert"
on storage.objects for insert
with check (
  bucket_id = 'practitioner-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "practitioner_photos_owner_update"
on storage.objects for update
using (
  bucket_id = 'practitioner-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "practitioner_photos_owner_delete"
on storage.objects for delete
using (
  bucket_id = 'practitioner-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);
