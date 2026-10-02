-- Store editors need to be able to SELECT their own storage objects.
--
-- Storage looks an object up before deleting or replacing it, and it does so
-- under the caller's role. With only insert/update/delete policies the lookup
-- found nothing, so `remove()` succeeded without deleting anything and files
-- of deleted products and replaced logos stayed behind. Reading stays public
-- through the buckets' public URLs; this policy only affects API lookups.

drop policy if exists storage_store_editors_select on storage.objects;

create policy storage_store_editors_select on storage.objects
  for select to authenticated
  using (
    bucket_id in ('store-logos', 'store-banners', 'product-images', 'category-images')
    and public.can_edit_store(((storage.foldername(name))[1])::uuid)
  );
