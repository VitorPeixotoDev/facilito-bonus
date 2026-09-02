-- Teto de bônus com punição percentual por falta/atraso injustificado
-- e justificativa diária (padrão: injustificado).

alter table public.work_schedules
  add column if not exists absence_penalty_percent numeric(7, 4) not null default 0;

alter table public.work_schedules
  drop constraint if exists work_schedules_absence_penalty_percent_chk;

alter table public.work_schedules
  add constraint work_schedules_absence_penalty_percent_chk
  check (absence_penalty_percent >= 0 and absence_penalty_percent <= 1);

alter table public.timesheet_events
  add column if not exists justification_status text not null default 'unjustified';

alter table public.timesheet_events
  add column if not exists justification_claim_note text;

alter table public.timesheet_events
  add column if not exists justification_claimed_at timestamptz;

alter table public.timesheet_events
  add column if not exists justification_reviewed_at timestamptz;

alter table public.timesheet_events
  add column if not exists justification_reviewed_by uuid references auth.users (id)
    on delete set null;

alter table public.timesheet_events
  drop constraint if exists timesheet_events_justification_status_chk;

alter table public.timesheet_events
  add constraint timesheet_events_justification_status_chk
  check (
    justification_status in ('unjustified', 'pending', 'justified', 'rejected')
  );

alter table public.timesheet_events
  drop constraint if exists timesheet_events_justification_note_chk;

alter table public.timesheet_events
  add constraint timesheet_events_justification_note_chk
  check (
    justification_claim_note is null
    or char_length(btrim(justification_claim_note)) between 1 and 500
  );

create index if not exists timesheet_events_justification_pending_idx
  on public.timesheet_events (employee_id)
  where justification_status = 'pending';

grant select, insert, update, delete on table public.timesheet_events to authenticated;
grant all on table public.timesheet_events to service_role;

drop policy if exists timesheet_events_claim_own on public.timesheet_events;

create policy timesheet_events_claim_own
  on public.timesheet_events
  for update
  to authenticated
  using (employee_id = (select private.current_employee_id()))
  with check (employee_id = (select private.current_employee_id()));

create or replace function private.protect_timesheet_justification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    select private.is_company_admin(
      private.employee_company_id(new.employee_id)
    )
  ) then
    return new;
  end if;

  if new.employee_id is distinct from old.employee_id
    or new.event_date is distinct from old.event_date
    or new.lateness_minutes is distinct from old.lateness_minutes
    or new.is_absence is distinct from old.is_absence
    or new.is_day_off is distinct from old.is_day_off
    or new.has_manual_adjustment is distinct from old.has_manual_adjustment
  then
    raise exception 'collaborator_cannot_alter_timesheet';
  end if;

  if old.justification_status not in ('unjustified', 'rejected') then
    raise exception 'justification_not_claimable';
  end if;

  if new.justification_status <> 'pending' then
    raise exception 'collaborator_can_only_claim';
  end if;

  if not old.is_absence and old.lateness_minutes <= 0 then
    raise exception 'no_occurrence_to_claim';
  end if;

  new.justification_claimed_at := timezone('utc'::text, now());
  new.justification_reviewed_at := null;
  new.justification_reviewed_by := null;
  return new;
end;
$$;

revoke all on function private.protect_timesheet_justification()
  from public, anon, authenticated;

drop trigger if exists timesheet_events_protect_justification
  on public.timesheet_events;

create trigger timesheet_events_protect_justification
  before update on public.timesheet_events
  for each row
  execute function private.protect_timesheet_justification();

notify pgrst, 'reload schema';
