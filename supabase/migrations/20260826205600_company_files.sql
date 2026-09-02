-- Arquivos TXT da empresa (AEJ) no Storage, com metadados e RLS por empresa.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'company-files',
  'company-files',
  false,
  10485760,
  array[
    'text/plain',
    'text/plain;charset=utf-8',
    'application/octet-stream'
  ]::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table public.company_files (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  uploaded_by uuid references public.employees (id) on delete set null,
  original_name text not null,
  storage_path text not null,
  size_bytes integer not null,
  purpose text not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint company_files_name_chk check (char_length(btrim(original_name)) > 0),
  constraint company_files_name_len_chk check (char_length(original_name) <= 255),
  constraint company_files_size_chk check (size_bytes > 0 and size_bytes <= 10485760),
  constraint company_files_path_chk check (storage_path like (company_id::text || '/%')),
  constraint company_files_purpose_chk check (purpose in ('colaboradores', 'ponto')),
  constraint company_files_storage_path_key unique (storage_path)
);

create index company_files_company_id_idx on public.company_files (company_id);
create index company_files_company_created_idx
  on public.company_files (company_id, created_at desc);

alter table public.company_files enable row level security;

grant select, insert, delete on table public.company_files to authenticated;
grant all on table public.company_files to service_role;

create policy company_files_select_member
  on public.company_files
  for select
  to authenticated
  using (company_id = (select private.current_company_id()));

create policy company_files_insert_admin
  on public.company_files
  for insert
  to authenticated
  with check ((select private.is_company_admin(company_id)));

create policy company_files_delete_admin
  on public.company_files
  for delete
  to authenticated
  using ((select private.is_company_admin(company_id)));

create policy company_files_objects_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'company-files'
    and (storage.foldername(name))[1] = (select private.current_company_id())::text
    and (select private.is_company_admin((select private.current_company_id())))
  );

create policy company_files_objects_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'company-files'
    and (storage.foldername(name))[1] = (select private.current_company_id())::text
    and (select private.is_company_admin((select private.current_company_id())))
  );

create policy company_files_objects_delete
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'company-files'
    and (storage.foldername(name))[1] = (select private.current_company_id())::text
    and (select private.is_company_admin((select private.current_company_id())))
  );

notify pgrst, 'reload schema';
