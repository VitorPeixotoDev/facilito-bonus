-- Folgas da escala de trabalho (padrão herdado pelos colaboradores)
-- e distinção folga × falta nos eventos de ponto.
-- O default {0,6} preserva o comportamento anterior (sábado e domingo).

alter table public.work_schedules
  add column if not exists fixed_days_off integer[] not null default '{0,6}',
  add column if not exists sunday_rule_type text not null default 'none',
  add column if not exists fixed_sundays integer[] not null default '{}',
  add column if not exists floating_sundays date[] not null default '{}';

alter table public.work_schedules
  drop constraint if exists work_schedules_fixed_days_off_chk;

alter table public.work_schedules
  add constraint work_schedules_fixed_days_off_chk
  check (fixed_days_off <@ array[0, 1, 2, 3, 4, 5, 6]);

alter table public.work_schedules
  drop constraint if exists work_schedules_sunday_rule_type_chk;

alter table public.work_schedules
  add constraint work_schedules_sunday_rule_type_chk
  check (sunday_rule_type in ('none', 'fixed_nth', 'floating'));

alter table public.work_schedules
  drop constraint if exists work_schedules_fixed_sundays_chk;

alter table public.work_schedules
  add constraint work_schedules_fixed_sundays_chk
  check (fixed_sundays <@ array[1, 2, 3, 4, 5]);

alter table public.timesheet_events
  add column if not exists is_day_off boolean not null default false;

alter table public.timesheet_events
  drop constraint if exists timesheet_events_absence_day_off_chk;

alter table public.timesheet_events
  add constraint timesheet_events_absence_day_off_chk
  check (not (is_absence and is_day_off));

notify pgrst, 'reload schema';
