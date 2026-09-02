alter publication supabase_realtime add table public.timesheet_events;
alter publication supabase_realtime add table public.timesheet_summaries;
alter publication supabase_realtime add table public.company_files;

notify pgrst, 'reload schema';
