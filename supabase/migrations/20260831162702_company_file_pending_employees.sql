-- Colaboradores do AEJ ainda sem cadastro, apontados para aceite do admin.

create table public.company_file_pending_employees (
  file_id uuid not null references public.company_files (id) on delete cascade,
  cpf varchar(11) not null,
  name text not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  primary key (file_id, cpf),
  constraint company_file_pending_employees_cpf_chk check (cpf ~ '^\d{11}$'),
  constraint company_file_pending_employees_name_chk
    check (char_length(btrim(name)) between 1 and 120)
);

create index company_file_pending_employees_cpf_idx
  on public.company_file_pending_employees (cpf);

alter table public.company_file_pending_employees enable row level security;

grant select, insert, delete on table public.company_file_pending_employees to authenticated;
grant all on table public.company_file_pending_employees to service_role;

create policy company_file_pending_employees_select_admin
  on public.company_file_pending_employees
  for select
  to authenticated
  using (
    (select private.is_company_admin(
      (select f.company_id from public.company_files f where f.id = file_id)
    ))
  );

create policy company_file_pending_employees_write_admin
  on public.company_file_pending_employees
  for all
  to authenticated
  using (
    (select private.is_company_admin(
      (select f.company_id from public.company_files f where f.id = file_id)
    ))
  )
  with check (
    (select private.is_company_admin(
      (select f.company_id from public.company_files f where f.id = file_id)
    ))
  );

notify pgrst, 'reload schema';
