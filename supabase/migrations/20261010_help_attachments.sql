insert into storage.buckets (id, name, public)
values ('help-attachments', 'help-attachments', true);

create policy "Authenticated users can upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'help-attachments');

create policy "Public read"
  on storage.objects for select
  to public
  using (bucket_id = 'help-attachments');
