-- Cargo, escala (regra), vínculo com o arquivo de cadastramento e convites.

alter table public.employees
  add column if not exists job_title text;

alter table public.employees
  add column if not exists work_schedule_id uuid references public.work_schedules (id) on delete set null;

alter table public.employees
  add column if not exists invited_at timestamptz;

alter table public.employees
  drop constraint if exists employees_job_title_chk;

alter table public.employees
  add constraint employees_job_title_chk
  check (job_title is null or char_length(btrim(job_title)) between 1 and 80);

create index if not exists employees_work_schedule_id_idx
  on public.employees (work_schedule_id);

create table if not exists public.company_file_employees (
  file_id uuid not null references public.company_files (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  created_at timestamptz not null default timezone('utc'::text, now()),
  primary key (file_id, employee_id)
);

create index if not exists company_file_employees_employee_id_idx
  on public.company_file_employees (employee_id);

alter table public.company_file_employees enable row level security;

grant select, insert, delete on table public.company_file_employees to authenticated;
grant all on table public.company_file_employees to service_role;

drop policy if exists company_file_employees_select_member on public.company_file_employees;
create policy company_file_employees_select_member
  on public.company_file_employees
  for select
  to authenticated
  using (
    (select f.company_id from public.company_files f where f.id = file_id)
    = (select private.current_company_id())
  );

drop policy if exists company_file_employees_write_admin on public.company_file_employees;
create policy company_file_employees_write_admin
  on public.company_file_employees
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

create table if not exists public.employee_invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  token text not null,
  created_by uuid references public.employees (id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  constraint employee_invites_token_key unique (token),
  constraint employee_invites_employee_id_key unique (employee_id)
);

create index if not exists employee_invites_company_id_idx
  on public.employee_invites (company_id);

create index if not exists employee_invites_token_idx
  on public.employee_invites (token);

alter table public.employee_invites enable row level security;

grant select, insert, update, delete on table public.employee_invites to authenticated;
grant all on table public.employee_invites to service_role;

drop policy if exists employee_invites_select_admin on public.employee_invites;
create policy employee_invites_select_admin
  on public.employee_invites
  for select
  to authenticated
  using ((select private.is_company_admin(company_id)));

drop policy if exists employee_invites_write_admin on public.employee_invites;
create policy employee_invites_write_admin
  on public.employee_invites
  for all
  to authenticated
  using ((select private.is_company_admin(company_id)))
  with check ((select private.is_company_admin(company_id)));

create or replace function private.accept_employee_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_invite_id uuid;
  v_employee_id uuid;
  v_employee_user uuid;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select i.id, i.employee_id
  into v_invite_id, v_employee_id
  from public.employee_invites i
  where i.token = p_token
    and i.accepted_at is null
    and i.expires_at > timezone('utc'::text, now());

  if v_invite_id is null then
    raise exception 'invalid_invite';
  end if;

  select e.user_id
  into v_employee_user
  from public.employees e
  where e.id = v_employee_id;

  if not found then
    raise exception 'invalid_invite';
  end if;

  if v_employee_user is not null and v_employee_user is distinct from v_user_id then
    raise exception 'already_linked';
  end if;

  if exists (
    select 1
    from public.employees e
    where e.user_id = v_user_id
      and e.id is distinct from v_employee_id
  ) then
    raise exception 'already_employee';
  end if;

  update public.employees
  set user_id = v_user_id
  where id = v_employee_id;

  update public.employee_invites
  set accepted_at = timezone('utc'::text, now())
  where id = v_invite_id;

  update public.profiles
  set review_status = 'ACCEPTED'
  where id = v_user_id;

  return v_employee_id;
end;
$$;

revoke all on function private.accept_employee_invite(text) from public, anon;
grant execute on function private.accept_employee_invite(text) to authenticated;

create or replace function public.accept_employee_invite(p_token text)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.accept_employee_invite(p_token);
$$;

revoke all on function public.accept_employee_invite(text) from public, anon;
grant execute on function public.accept_employee_invite(text) to authenticated;

notify pgrst, 'reload schema';
