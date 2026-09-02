-- Período coberto pelo AEJ, para agrupar o histórico por mês e mesclar envios parciais.

alter table public.company_files
  add column if not exists period_start date,
  add column if not exists period_end date;

alter table public.company_files
  drop constraint if exists company_files_period_chk;

alter table public.company_files
  add constraint company_files_period_chk
  check (
    (period_start is null and period_end is null)
    or (
      period_start is not null
      and period_end is not null
      and period_end >= period_start
    )
  );

create index if not exists company_files_company_period_idx
  on public.company_files (company_id, period_start, period_end);

grant update on table public.company_files to authenticated;

drop policy if exists company_files_update_admin on public.company_files;

create policy company_files_update_admin
  on public.company_files
  for update
  to authenticated
  using ((select private.is_company_admin(company_id)))
  with check ((select private.is_company_admin(company_id)));

notify pgrst, 'reload schema';
