-- Storage bucket policies

-- interview-audio: users can only access their own files (stored under user_id/ prefix)
create policy "Users can upload own audio"
  on storage.objects for insert
  with check (
    bucket_id = 'interview-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can read own audio"
  on storage.objects for select
  using (
    bucket_id = 'interview-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- materials: users can only access their own files
create policy "Users can upload own materials"
  on storage.objects for insert
  with check (
    bucket_id = 'materials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can read own materials"
  on storage.objects for select
  using (
    bucket_id = 'materials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own materials"
  on storage.objects for delete
  using (
    bucket_id = 'materials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
