-- Tipo do arquivo TXT: cadastramento de colaboradores ou acompanhamento de ponto.

alter table public.company_files
  add column if not exists purpose text;

update public.company_files
set purpose = 'ponto'
where purpose is null;

alter table public.company_files
  alter column purpose set not null;

alter table public.company_files
  drop constraint if exists company_files_purpose_chk;

alter table public.company_files
  add constraint company_files_purpose_chk
  check (purpose in ('colaboradores', 'ponto'));

notify pgrst, 'reload schema';
