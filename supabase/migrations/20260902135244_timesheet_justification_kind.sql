-- Colaborador pode abrir justificativa no dia vigente (Atraso ou Falta),
-- mesmo antes da folha, e o admin vê o pedido no painel.

alter table public.timesheet_events
  add column if not exists justification_kind text;

alter table public.timesheet_events
  drop constraint if exists timesheet_events_justification_kind_chk;

alter table public.timesheet_events
  add constraint timesheet_events_justification_kind_chk
  check (
    justification_kind is null
    or justification_kind in ('absence', 'lateness')
  );

alter table public.timesheet_events
  disable trigger timesheet_events_protect_justification;

update public.timesheet_events
set justification_kind = case
  when is_absence then 'absence'
  when lateness_minutes > 0 then 'lateness'
  else null
end
where justification_status <> 'unjustified'
  and justification_kind is null;

alter table public.timesheet_events
  enable trigger timesheet_events_protect_justification;

drop policy if exists timesheet_events_claim_insert_own on public.timesheet_events;

create policy timesheet_events_claim_insert_own
  on public.timesheet_events
  for insert
  to authenticated
  with check (employee_id = (select private.current_employee_id()));

create or replace function private.protect_timesheet_justification_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  if (
    select private.is_company_admin(
      private.employee_company_id(new.employee_id)
    )
  ) then
    return new;
  end if;

  if new.employee_id is distinct from (select private.current_employee_id()) then
    raise exception 'collaborator_cannot_alter_timesheet';
  end if;

  if new.event_date is distinct from (timezone('America/Sao_Paulo', now()))::date then
    raise exception 'justification_only_today';
  end if;

  if coalesce(new.is_day_off, false) then
    raise exception 'day_off_no_justification';
  end if;

  if new.justification_status <> 'pending' then
    raise exception 'collaborator_can_only_claim';
  end if;

  if new.justification_kind not in ('absence', 'lateness') then
    raise exception 'justification_kind_required';
  end if;

  new.is_absence := false;
  new.lateness_minutes := 0;
  new.is_day_off := false;
  new.has_manual_adjustment := false;
  new.justification_review_note := null;
  new.justification_reviewed_at := null;
  new.justification_reviewed_by := null;
  new.justification_claimed_at := timezone('utc'::text, now());
  return new;
end;
$$;

revoke all on function private.protect_timesheet_justification_insert()
  from public, anon, authenticated;

drop trigger if exists timesheet_events_protect_justification_insert
  on public.timesheet_events;

create trigger timesheet_events_protect_justification_insert
  before insert on public.timesheet_events
  for each row
  execute function private.protect_timesheet_justification_insert();

create or replace function private.protect_timesheet_justification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

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
    or new.justification_review_note is distinct from old.justification_review_note
  then
    raise exception 'collaborator_cannot_alter_timesheet';
  end if;

  if old.justification_status not in ('unjustified', 'rejected') then
    raise exception 'justification_not_claimable';
  end if;

  if new.justification_status <> 'pending' then
    raise exception 'collaborator_can_only_claim';
  end if;

  if new.justification_kind not in ('absence', 'lateness') then
    raise exception 'justification_kind_required';
  end if;

  if old.is_day_off then
    raise exception 'day_off_no_justification';
  end if;

  if old.event_date is distinct from (timezone('America/Sao_Paulo', now()))::date
    and not old.is_absence
    and old.lateness_minutes <= 0
  then
    raise exception 'no_occurrence_to_claim';
  end if;

  new.justification_claimed_at := timezone('utc'::text, now());
  new.justification_reviewed_at := null;
  new.justification_reviewed_by := null;
  return new;
end;
$$;

notify pgrst, 'reload schema';
