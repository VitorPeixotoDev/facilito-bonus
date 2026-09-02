-- Escalas de trabalho da empresa (bloco 04 do AEJ).
-- Carga e turno noturno são gerados no banco a partir dos horários.

create table public.work_schedules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  code integer not null,
  entry_1 time not null,
  exit_1 time not null,
  entry_2 time,
  exit_2 time,
  workload_minutes integer generated always as (
    (
      (
        case
          when exit_1 < entry_1 then
            extract(epoch from (exit_1 - entry_1 + interval '24 hours'))
          else
            extract(epoch from (exit_1 - entry_1))
        end
        +
        case
          when entry_2 is null or exit_2 is null then 0
          when exit_2 < entry_2 then
            extract(epoch from (exit_2 - entry_2 + interval '24 hours'))
          else
            extract(epoch from (exit_2 - entry_2))
        end
      ) / 60
    )::integer
  ) stored,
  is_night_shift boolean generated always as (
    (exit_1 < entry_1)
    or (entry_2 is not null and exit_2 is not null and exit_2 < entry_2)
  ) stored,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint work_schedules_name_chk check (char_length(btrim(name)) > 0),
  constraint work_schedules_shift2_chk check ((entry_2 is null) = (exit_2 is null)),
  constraint work_schedules_workload_chk check (workload_minutes > 0),
  constraint work_schedules_company_code_key unique (company_id, code)
);

create unique index work_schedules_company_name_uidx
  on public.work_schedules (company_id, lower(btrim(name)));

create index work_schedules_company_id_idx on public.work_schedules (company_id);

create or replace function private.set_work_schedule_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.code is not null then
    return new;
  end if;

  perform pg_advisory_xact_lock(
    hashtext('work_schedules'),
    hashtext(new.company_id::text)
  );

  select coalesce(max(s.code), 0) + 1
  into new.code
  from public.work_schedules s
  where s.company_id = new.company_id;

  return new;
end;
$$;

revoke all on function private.set_work_schedule_code() from public, anon, authenticated;

drop trigger if exists work_schedules_set_code on public.work_schedules;
create trigger work_schedules_set_code
  before insert on public.work_schedules
  for each row
  execute function private.set_work_schedule_code();

alter table public.work_schedules enable row level security;

grant select, insert, update, delete on table public.work_schedules to authenticated;
grant all on table public.work_schedules to service_role;

create policy work_schedules_select_member
  on public.work_schedules
  for select
  to authenticated
  using (company_id = (select private.current_company_id()));

create policy work_schedules_insert_admin
  on public.work_schedules
  for insert
  to authenticated
  with check ((select private.is_company_admin(company_id)));

create policy work_schedules_update_admin
  on public.work_schedules
  for update
  to authenticated
  using ((select private.is_company_admin(company_id)))
  with check ((select private.is_company_admin(company_id)));

create policy work_schedules_delete_admin
  on public.work_schedules
  for delete
  to authenticated
  using ((select private.is_company_admin(company_id)));

notify pgrst, 'reload schema';
