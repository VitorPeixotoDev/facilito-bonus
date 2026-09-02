-- Fila de análise do perfil (login sem convite) e onboarding CPF + empresa.
-- review_status só muda no banco. O cliente não tem policy de UPDATE em profiles.

alter table public.profiles
  add column if not exists review_status text not null default 'PENDING';

alter table public.profiles
  drop constraint if exists profiles_review_status_chk;

alter table public.profiles
  add constraint profiles_review_status_chk
  check (review_status in ('PENDING', 'ACCEPTED', 'REJECTED'));

create index if not exists profiles_review_status_idx
  on public.profiles (review_status);

update public.profiles p
set review_status = 'ACCEPTED'
where exists (
  select 1
  from public.employees e
  where e.user_id = p.id
);

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    is_admin,
    review_status
  )
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ),
    new.raw_user_meta_data ->> 'avatar_url',
    false,
    'PENDING'
  );
  return new;
end;
$$;

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
  v_cnpj text := regexp_replace(coalesce(p_cnpj, ''), '\D', '', 'g');
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

  if v_cnpj !~ '^\d{14}$' then
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

revoke all on function private.complete_company_admin_onboarding(text, text, text, text)
  from public, anon;
grant execute on function private.complete_company_admin_onboarding(text, text, text, text)
  to authenticated;

create or replace function public.complete_company_admin_onboarding(
  p_full_name text,
  p_cpf text,
  p_company_name text,
  p_cnpj text
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.complete_company_admin_onboarding(
    p_full_name,
    p_cpf,
    p_company_name,
    p_cnpj
  );
$$;

revoke all on function public.complete_company_admin_onboarding(text, text, text, text)
  from public, anon;
grant execute on function public.complete_company_admin_onboarding(text, text, text, text)
  to authenticated;
