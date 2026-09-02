-- Dados de demonstração alinhados ao dashboard do colaborador (Junho/2026).

insert into public.companies (id, name, cnpj)
values (
  '11111111-1111-4111-8111-111111111111',
  'Facilitô Games',
  '12345678000199'
);

insert into public.employees (id, company_id, name, cpf, role)
values
  (
    '22222222-2222-4222-8222-222222222222',
    '11111111-1111-4111-8111-111111111111',
    'Gabriel',
    '12345678901',
    'EMPLOYEE'
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    '11111111-1111-4111-8111-111111111111',
    'RH Facilitô',
    '10987654321',
    'ADMIN'
  );

insert into public.campaigns (id, company_id, title, start_date, end_date, is_active)
values (
  '44444444-4444-4444-8444-444444444444',
  '11111111-1111-4111-8111-111111111111',
  'Assiduidade de Junho',
  '2026-06-01',
  '2026-06-30',
  true
);

  insert into public.work_schedules (
  id,
  company_id,
  name,
  code,
  entry_1,
  exit_1,
  entry_2,
  exit_2,
  punctuality_percent,
  absence_penalty_percent,
  lateness_penalty_percent,
  accumulated_lateness_tolerance_minutes,
  bonus_base_amount
)
values (
  '99999999-9999-4999-8999-999999999999',
  '11111111-1111-4111-8111-111111111111',
  'Padrão comercial (8 horas)',
  1,
  '08:00',
  '12:00',
  '13:00',
  '17:00',
  0,
  0.50,
  0.10,
  15,
  500.00
);

insert into public.work_schedule_bonus_rules (
  id,
  work_schedule_id,
  metric,
  operator,
  target_value,
  reward_amount,
  sort_order
)
values
  (
    'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    '99999999-9999-4999-8999-999999999999',
    'absences',
    '<=',
    0,
    100.00,
    0
  ),
  (
    'aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    '99999999-9999-4999-8999-999999999999',
    'lateness_minutes',
    '<=',
    15,
    80.00,
    1
  );

insert into public.campaign_rules (id, campaign_id, metric, operator, target_value, reward_amount)
values
  (
    '55555555-5555-4555-8555-555555555555',
    '44444444-4444-4444-8444-444444444444',
    'absences',
    '<=',
    0,
    100.00
  ),
  (
    '66666666-6666-4666-8666-666666666666',
    '44444444-4444-4444-8444-444444444444',
    'lateness_minutes',
    '<=',
    15,
    80.00
  );

insert into public.timesheet_summaries (
  id,
  employee_id,
  reference_month,
  total_absences,
  total_lateness_minutes,
  manual_adjustments_count,
  earned_amount
)
values (
  '77777777-7777-4777-8777-777777777777',
  '22222222-2222-4222-8222-222222222222',
  '2026-06-01',
  0,
  4,
  0,
  500.00
);

insert into public.timesheet_events (
  employee_id,
  event_date,
  lateness_minutes,
  is_absence,
  is_day_off,
  has_manual_adjustment,
  notes
)
values
  (
    '22222222-2222-4222-8222-222222222222',
    '2026-06-10',
    0,
    false,
    false,
    false,
    'Ponto em conformidade'
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    '2026-06-08',
    4,
    false,
    false,
    false,
    'Atraso na entrada (4 min)'
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    '2026-06-05',
    0,
    false,
    false,
    false,
    'Ponto perfeitamente batido'
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    '2026-06-07',
    0,
    false,
    true,
    false,
    'Folga programada'
  );

insert into public.payouts (
  id,
  employee_id,
  campaign_id,
  reference_month,
  earned_amount,
  status
)
values (
  '88888888-8888-4888-8888-888888888888',
  '22222222-2222-4222-8222-222222222222',
  '44444444-4444-4444-8444-444444444444',
  '2026-06-01',
  500.00,
  'PENDING'
);
