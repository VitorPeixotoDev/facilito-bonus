-- CNPJ alfanumérico (IN RFB 2.229/2024): 12 caracteres A-Z/0-9 + 2 dígitos verificadores.

alter table public.companies
  drop constraint if exists companies_cnpj_digits_chk;

alter table public.companies
  drop constraint if exists companies_cnpj_alnum_chk;

alter table public.companies
  add constraint companies_cnpj_alnum_chk
  check (cnpj ~ '^[A-Z0-9]{12}[0-9]{2}$');

create or replace function private.complete_company_admin_onboarding(
  p_full_name text,
  p_cpf text,
  p_company_name text,
  p_cnpj text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_review_status text;
  v_profile_name text;
  v_full_name text;
  v_cpf text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  v_cnpj text := upper(regexp_replace(coalesce(p_cnpj, ''), '[^A-Za-z0-9]', '', 'g'));
  v_company_name text := btrim(coalesce(p_company_name, ''));
  v_company_id uuid;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select p.review_status, p.full_name
  into v_review_status, v_profile_name
  from public.profiles p
  where p.id = v_user_id;

  if not found then
    raise exception 'profile_not_found';
  end if;

  if v_review_status is distinct from 'ACCEPTED' then
    raise exception 'profile_not_accepted';
  end if;

  if exists (
    select 1 from public.employees e where e.user_id = v_user_id
  ) then
    raise exception 'already_employee';
  end if;

  v_full_name := btrim(coalesce(nullif(p_full_name, ''), v_profile_name, ''));

  if v_full_name = '' then
    raise exception 'invalid_name';
  end if;

  if v_cpf !~ '^\d{11}$' then
    raise exception 'invalid_cpf';
  end if;

  if v_company_name = '' then
    raise exception 'invalid_company_name';
  end if;

  if v_cnpj !~ '^[A-Z0-9]{12}[0-9]{2}$' then
    raise exception 'invalid_cnpj';
  end if;

  insert into public.companies (name, cnpj)
  values (v_company_name, v_cnpj)
  returning id into v_company_id;

  insert into public.employees (
    company_id,
    user_id,
    name,
    cpf,
    role
  )
  values (
    v_company_id,
    v_user_id,
    v_full_name,
    v_cpf,
    'ADMIN'
  );

  return v_company_id;
exception
  when unique_violation then
    if sqlerrm ilike '%cpf%' then
      raise exception 'duplicate_cpf';
    elsif sqlerrm ilike '%cnpj%' then
      raise exception 'duplicate_cnpj';
    else
      raise exception 'duplicate_record';
    end if;
end;
$$;
