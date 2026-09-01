-- Run this AFTER creating a private Storage bucket named "books"
-- (Supabase Dashboard -> Storage -> New bucket -> name "books", Private).

create policy "Users can read their own or library books"
  on storage.objects for select
  using (bucket_id = 'books' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or (storage.foldername(name))[1] = 'library'
  ));

create policy "Users can upload to their own folder"
  on storage.objects for insert
  with check (bucket_id = 'books' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete their own uploads"
  on storage.objects for delete
  using (bucket_id = 'books' and (storage.foldername(name))[1] = auth.uid()::text);
