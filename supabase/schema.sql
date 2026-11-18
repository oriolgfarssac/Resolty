begin;

create table if not exists public.early_access_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null check (char_length(full_name) between 2 and 120),
  work_email text not null unique check (work_email = lower(work_email) and char_length(work_email) <= 254),
  company_name text not null check (char_length(company_name) between 2 and 160),
  monthly_spend text not null,
  ai_tools text[] not null default '{}' check (ai_tools <@ array['ChatGPT','Claude','Gemini','Microsoft Copilot','other','none']),
  primary_use text check (char_length(primary_use) <= 500),
  locale text not null check (locale in ('en','es','ca')),
  consent_version text not null,
  consented_at timestamptz not null default now()
);

-- Keep earlier ranges valid for stored responses and older clients.
alter table public.early_access_requests
  drop constraint if exists early_access_requests_monthly_spend_check;
alter table public.early_access_requests
  add constraint early_access_requests_monthly_spend_check
  check (monthly_spend in (
    'none', 'under_20', '20_50', '50_100', '100_250', 'over_250',
    '250_500',
    '500_1000', 'over_1000', 'unsure', 'under_100', '100_500'
  ));

create table if not exists public.waitlist_rate_buckets (
  bucket text primary key,
  created_at timestamptz not null default now(),
  attempts integer not null default 1
);
create index if not exists waitlist_rate_created_at on public.waitlist_rate_buckets (created_at);

create table if not exists public.landing_event_counts (
  day date not null,
  event text not null check (event in ('page_view','cta_click','form_start','language_select','form_success')),
  locale text not null check (locale in ('en','es','ca')),
  total bigint not null default 1,
  primary key (day, event, locale)
);

alter table public.early_access_requests enable row level security;
alter table public.waitlist_rate_buckets enable row level security;
alter table public.landing_event_counts enable row level security;
revoke all on public.early_access_requests, public.waitlist_rate_buckets, public.landing_event_counts from public, anon, authenticated;

create or replace function public.count_landing_event(p_event text, p_locale text)
returns void language sql security definer set search_path = '' as $$
  insert into public.landing_event_counts (day,event,locale)
  values ((now() at time zone 'UTC')::date,p_event,p_locale)
  on conflict (day,event,locale) do update set total = public.landing_event_counts.total + 1;
$$;

create or replace function public.submit_early_access(
  p_ip_bucket text, p_name text, p_email text, p_company text, p_spend text,
  p_tools text[], p_use text, p_locale text, p_track boolean
)
returns text language plpgsql security definer set search_path = '' as $$
declare
  current_attempts integer;
begin
  delete from public.waitlist_rate_buckets where created_at < now() - interval '2 hours';
  insert into public.waitlist_rate_buckets (bucket) values (p_ip_bucket)
  on conflict (bucket) do update set attempts = least(public.waitlist_rate_buckets.attempts + 1, 9)
  returning attempts into current_attempts;
  if current_attempts > 8 then return 'limited'; end if;

  insert into public.early_access_requests
    (full_name, work_email, company_name, monthly_spend, ai_tools, primary_use, locale, consent_version)
  values (p_name, p_email, p_company, p_spend, p_tools, p_use, p_locale, 'v1')
  on conflict (work_email) do nothing;
  if not found then return 'duplicate'; end if;

  if p_track then perform public.count_landing_event('form_success', p_locale); end if;
  return 'success';
end;
$$;

revoke all on function public.count_landing_event(text,text) from public, anon, authenticated;
revoke all on function public.submit_early_access(text,text,text,text,text,text[],text,text,boolean) from public, anon, authenticated;
grant execute on function public.count_landing_event(text,text) to service_role;
grant execute on function public.submit_early_access(text,text,text,text,text,text[],text,text,boolean) to service_role;
notify pgrst, 'reload schema';

commit;
