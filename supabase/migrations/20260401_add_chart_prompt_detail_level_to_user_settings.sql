alter table public.user_settings
add column if not exists chart_prompt_detail_level text not null default 'default';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_settings_chart_prompt_detail_level_check'
  ) then
    alter table public.user_settings
    add constraint user_settings_chart_prompt_detail_level_check
    check (chart_prompt_detail_level = any (array['default'::text, 'more'::text, 'full'::text]));
  end if;
end
$$;
