-- Motivo oficial informado pelo admin ao justificar falta/atraso.
-- O texto fica no evento e passa a valer como sugestão futura da empresa.

alter table public.timesheet_events
  add column if not exists justification_review_note text;

alter table public.timesheet_events
  drop constraint if exists timesheet_events_review_note_chk;

alter table public.timesheet_events
  add constraint timesheet_events_review_note_chk
  check (
    justification_review_note is null
    or char_length(btrim(justification_review_note)) between 2 and 80
  );

create index if not exists timesheet_events_review_note_idx
  on public.timesheet_events (employee_id)
  where justification_review_note is not null;

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

  if not old.is_absence and old.lateness_minutes <= 0 then
    raise exception 'no_occurrence_to_claim';
  end if;

  new.justification_claimed_at := timezone('utc'::text, now());
  new.justification_reviewed_at := null;
  new.justification_reviewed_by := null;
  return new;
end;
$$;

notify pgrst, 'reload schema';
