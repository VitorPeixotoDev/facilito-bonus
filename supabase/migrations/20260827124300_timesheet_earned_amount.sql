-- Valor de bônus calculado a partir do AEJ de acompanhamento de ponto.

alter table public.timesheet_summaries
  add column if not exists earned_amount numeric(12, 2) not null default 0;

alter table public.timesheet_summaries
  drop constraint if exists timesheet_summaries_earned_amount_chk;

alter table public.timesheet_summaries
  add constraint timesheet_summaries_earned_amount_chk
  check (earned_amount >= 0);

notify pgrst, 'reload schema';
