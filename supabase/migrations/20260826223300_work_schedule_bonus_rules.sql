-- Variáveis do plano de bonificação vinculadas à escala (regra) da empresa.

alter table public.work_schedules
  add column if not exists punctuality_percent numeric(7, 4) not null default 0;

alter table public.work_schedules
  add column if not exists lateness_penalty_percent numeric(7, 4) not null default 0;

alter table public.work_schedules
  add column if not exists accumulated_lateness_tolerance_minutes integer not null default 0;

alter table public.work_schedules
  add column if not exists bonus_base_amount numeric(12, 2) not null default 0;

alter table public.work_schedules
  drop constraint if exists work_schedules_punctuality_percent_chk;

alter table public.work_schedules
  add constraint work_schedules_punctuality_percent_chk
  check (punctuality_percent >= 0 and punctuality_percent <= 1);

alter table public.work_schedules
  drop constraint if exists work_schedules_lateness_penalty_percent_chk;

alter table public.work_schedules
  add constraint work_schedules_lateness_penalty_percent_chk
  check (lateness_penalty_percent >= 0 and lateness_penalty_percent <= 1);

alter table public.work_schedules
  drop constraint if exists work_schedules_lateness_tolerance_chk;

alter table public.work_schedules
  add constraint work_schedules_lateness_tolerance_chk
  check (
    accumulated_lateness_tolerance_minutes >= 0
    and accumulated_lateness_tolerance_minutes <= 43200
  );

alter table public.work_schedules
  drop constraint if exists work_schedules_bonus_base_amount_chk;

alter table public.work_schedules
  add constraint work_schedules_bonus_base_amount_chk
  check (bonus_base_amount >= 0);

notify pgrst, 'reload schema';
