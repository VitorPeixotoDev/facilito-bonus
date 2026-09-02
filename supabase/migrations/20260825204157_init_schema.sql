-- Schema inicial do Facilitô Games (bonificação por ponto).
-- Melhorias em relação ao rascunho: gen_random_uuid() nativo, FKs NOT NULL,
-- índices em FKs/RLS, helpers SECURITY DEFINER no schema private (evita
-- recursão de RLS em employees) e políticas completas em todas as tabelas.

create schema if not exists private;

revoke all on schema private from public;

-- =====================================================================
-- Tabelas
-- =====================================================================

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cnpj varchar(14) unique not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint companies_cnpj_digits_chk check (cnpj ~ '^\d{14}$')
);

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  name text not null,
  cpf varchar(11) unique not null,
  role text not null default 'EMPLOYEE',
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint employees_cpf_digits_chk check (cpf ~ '^\d{11}$'),
  constraint employees_role_chk check (role in ('ADMIN', 'EMPLOYEE'))
);

create unique index employees_user_id_uidx
  on public.employees (user_id)
  where user_id is not null;

create index employees_company_id_idx on public.employees (company_id);
create index employees_user_id_idx on public.employees (user_id);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  title text not null,
  start_date date not null,
  end_date date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint campaigns_dates_chk check (end_date >= start_date)
);

create index campaigns_company_id_idx on public.campaigns (company_id);

create table public.campaign_rules (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  metric text not null,
  operator text not null,
  target_value integer not null,
  reward_amount numeric(10, 2) not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint campaign_rules_metric_chk
    check (metric in ('absences', 'lateness_minutes', 'manual_adjustments')),
  constraint campaign_rules_operator_chk
    check (operator in ('<=', '==', '<', '>=', '>', '!=')),
  constraint campaign_rules_target_chk check (target_value >= 0),
  constraint campaign_rules_reward_chk check (reward_amount >= 0)
);

create index campaign_rules_campaign_id_idx on public.campaign_rules (campaign_id);

create table public.timesheet_summaries (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  reference_month date not null,
  total_absences integer not null default 0,
  total_lateness_minutes integer not null default 0,
  manual_adjustments_count integer not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint timesheet_summaries_month_chk
    check (extract(day from reference_month) = 1),
  constraint timesheet_summaries_absences_chk check (total_absences >= 0),
  constraint timesheet_summaries_lateness_chk check (total_lateness_minutes >= 0),
  constraint timesheet_summaries_adjustments_chk check (manual_adjustments_count >= 0),
  unique (employee_id, reference_month)
);

create index timesheet_summaries_employee_id_idx
  on public.timesheet_summaries (employee_id);

-- Eventos diários derivados do parser AEJ (alimentam o extrato recente).
create table public.timesheet_events (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  event_date date not null,
  lateness_minutes integer not null default 0,
  is_absence boolean not null default false,
  has_manual_adjustment boolean not null default false,
  notes text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint timesheet_events_lateness_chk check (lateness_minutes >= 0),
  unique (employee_id, event_date)
);

create index timesheet_events_employee_id_idx on public.timesheet_events (employee_id);
create index timesheet_events_employee_date_idx
  on public.timesheet_events (employee_id, event_date desc);

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  reference_month date not null,
  earned_amount numeric(10, 2) not null,
  status text not null default 'PENDING',
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint payouts_month_chk check (extract(day from reference_month) = 1),
  constraint payouts_amount_chk check (earned_amount >= 0),
  constraint payouts_status_chk check (status in ('PENDING', 'APPROVED', 'PAID')),
  unique (employee_id, campaign_id, reference_month)
);

create index payouts_employee_id_idx on public.payouts (employee_id);
create index payouts_campaign_id_idx on public.payouts (campaign_id);

-- =====================================================================
-- Helpers RLS (SECURITY DEFINER no schema private)
-- =====================================================================

create or replace function private.current_employee_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select e.id
  from public.employees e
  where e.user_id = (select auth.uid())
  limit 1;
$$;

create or replace function private.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select e.company_id
  from public.employees e
  where e.user_id = (select auth.uid())
  limit 1;
$$;

create or replace function private.is_company_admin(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.employees e
    where e.user_id = (select auth.uid())
      and e.role = 'ADMIN'
      and e.company_id = target_company_id
  );
$$;

create or replace function private.employee_company_id(target_employee_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select e.company_id
  from public.employees e
  where e.id = target_employee_id;
$$;

create or replace function private.campaign_company_id(target_campaign_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select c.company_id
  from public.campaigns c
  where c.id = target_campaign_id;
$$;

revoke all on all functions in schema private from public, anon;
grant usage on schema private to authenticated;
grant execute on all functions in schema private to authenticated;

-- =====================================================================
-- RLS
-- =====================================================================

alter table public.companies enable row level security;
alter table public.employees enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_rules enable row level security;
alter table public.timesheet_summaries enable row level security;
alter table public.timesheet_events enable row level security;
alter table public.payouts enable row level security;

-- companies
create policy companies_select_member
  on public.companies
  for select
  to authenticated
  using (id = (select private.current_company_id()));

create policy companies_update_admin
  on public.companies
  for update
  to authenticated
  using ((select private.is_company_admin(id)))
  with check ((select private.is_company_admin(id)));

-- employees
create policy employees_select_own
  on public.employees
  for select
  to authenticated
  using (id = (select private.current_employee_id()));

create policy employees_select_company_admin
  on public.employees
  for select
  to authenticated
  using ((select private.is_company_admin(company_id)));

create policy employees_insert_company_admin
  on public.employees
  for insert
  to authenticated
  with check ((select private.is_company_admin(company_id)));

create policy employees_update_company_admin
  on public.employees
  for update
  to authenticated
  using ((select private.is_company_admin(company_id)))
  with check ((select private.is_company_admin(company_id)));

create policy employees_delete_company_admin
  on public.employees
  for delete
  to authenticated
  using ((select private.is_company_admin(company_id)));

-- campaigns
create policy campaigns_select_member
  on public.campaigns
  for select
  to authenticated
  using (company_id = (select private.current_company_id()));

create policy campaigns_insert_admin
  on public.campaigns
  for insert
  to authenticated
  with check ((select private.is_company_admin(company_id)));

create policy campaigns_update_admin
  on public.campaigns
  for update
  to authenticated
  using ((select private.is_company_admin(company_id)))
  with check ((select private.is_company_admin(company_id)));

create policy campaigns_delete_admin
  on public.campaigns
  for delete
  to authenticated
  using ((select private.is_company_admin(company_id)));

-- campaign_rules
create policy campaign_rules_select_member
  on public.campaign_rules
  for select
  to authenticated
  using (
    (select private.campaign_company_id(campaign_id))
    = (select private.current_company_id())
  );

create policy campaign_rules_insert_admin
  on public.campaign_rules
  for insert
  to authenticated
  with check (
    (select private.is_company_admin(private.campaign_company_id(campaign_id)))
  );

create policy campaign_rules_update_admin
  on public.campaign_rules
  for update
  to authenticated
  using (
    (select private.is_company_admin(private.campaign_company_id(campaign_id)))
  )
  with check (
    (select private.is_company_admin(private.campaign_company_id(campaign_id)))
  );

create policy campaign_rules_delete_admin
  on public.campaign_rules
  for delete
  to authenticated
  using (
    (select private.is_company_admin(private.campaign_company_id(campaign_id)))
  );

-- timesheet_summaries
create policy timesheet_summaries_select_own_or_admin
  on public.timesheet_summaries
  for select
  to authenticated
  using (
    employee_id = (select private.current_employee_id())
    or (select private.is_company_admin(private.employee_company_id(employee_id)))
  );

create policy timesheet_summaries_write_admin
  on public.timesheet_summaries
  for all
  to authenticated
  using (
    (select private.is_company_admin(private.employee_company_id(employee_id)))
  )
  with check (
    (select private.is_company_admin(private.employee_company_id(employee_id)))
  );

-- timesheet_events
create policy timesheet_events_select_own_or_admin
  on public.timesheet_events
  for select
  to authenticated
  using (
    employee_id = (select private.current_employee_id())
    or (select private.is_company_admin(private.employee_company_id(employee_id)))
  );

create policy timesheet_events_write_admin
  on public.timesheet_events
  for all
  to authenticated
  using (
    (select private.is_company_admin(private.employee_company_id(employee_id)))
  )
  with check (
    (select private.is_company_admin(private.employee_company_id(employee_id)))
  );

-- payouts
create policy payouts_select_own_or_admin
  on public.payouts
  for select
  to authenticated
  using (
    employee_id = (select private.current_employee_id())
    or (select private.is_company_admin(private.employee_company_id(employee_id)))
  );

create policy payouts_write_admin
  on public.payouts
  for all
  to authenticated
  using (
    (select private.is_company_admin(private.employee_company_id(employee_id)))
  )
  with check (
    (select private.is_company_admin(private.employee_company_id(employee_id)))
  );
