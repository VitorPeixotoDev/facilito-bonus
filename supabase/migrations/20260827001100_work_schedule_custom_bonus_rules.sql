-- Regras de bonificação customizadas vinculadas à escala (regra) da empresa.

create table public.work_schedule_bonus_rules (
  id uuid primary key default gen_random_uuid(),
  work_schedule_id uuid not null references public.work_schedules (id) on delete cascade,
  metric text not null,
  operator text not null,
  target_value integer not null,
  reward_amount numeric(10, 2) not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint work_schedule_bonus_rules_metric_chk
    check (metric in ('absences', 'lateness_minutes', 'manual_adjustments')),
  constraint work_schedule_bonus_rules_operator_chk
    check (operator in ('<=', '==', '<', '>=', '>', '!=')),
  constraint work_schedule_bonus_rules_target_chk check (target_value >= 0),
  constraint work_schedule_bonus_rules_reward_chk check (reward_amount >= 0),
  constraint work_schedule_bonus_rules_sort_chk check (sort_order >= 0),
  constraint work_schedule_bonus_rules_metric_key unique (work_schedule_id, metric)
);

create index work_schedule_bonus_rules_schedule_id_idx
  on public.work_schedule_bonus_rules (work_schedule_id);

alter table public.work_schedule_bonus_rules enable row level security;

grant select, insert, update, delete on table public.work_schedule_bonus_rules to authenticated;
grant all on table public.work_schedule_bonus_rules to service_role;

create policy work_schedule_bonus_rules_select_member
  on public.work_schedule_bonus_rules
  for select
  to authenticated
  using (
    (
      select s.company_id
      from public.work_schedules s
      where s.id = work_schedule_id
    ) = (select private.current_company_id())
  );

create policy work_schedule_bonus_rules_insert_admin
  on public.work_schedule_bonus_rules
  for insert
  to authenticated
  with check (
    (select private.is_company_admin(
      (
        select s.company_id
        from public.work_schedules s
        where s.id = work_schedule_id
      )
    ))
  );

create policy work_schedule_bonus_rules_update_admin
  on public.work_schedule_bonus_rules
  for update
  to authenticated
  using (
    (select private.is_company_admin(
      (
        select s.company_id
        from public.work_schedules s
        where s.id = work_schedule_id
      )
    ))
  )
  with check (
    (select private.is_company_admin(
      (
        select s.company_id
        from public.work_schedules s
        where s.id = work_schedule_id
      )
    ))
  );

create policy work_schedule_bonus_rules_delete_admin
  on public.work_schedule_bonus_rules
  for delete
  to authenticated
  using (
    (select private.is_company_admin(
      (
        select s.company_id
        from public.work_schedules s
        where s.id = work_schedule_id
      )
    ))
  );

notify pgrst, 'reload schema';
