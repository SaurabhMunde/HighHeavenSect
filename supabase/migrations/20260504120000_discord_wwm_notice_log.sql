-- Dedupe Discord #wwm-notice pings (cron + war-create hooks).

create table if not exists public.discord_wwm_notice_log (
  notice_key text primary key,
  sent_at timestamptz not null default now()
);

create index if not exists discord_wwm_notice_log_sent_at
  on public.discord_wwm_notice_log (sent_at desc);

alter table public.discord_wwm_notice_log enable row level security;

comment on table public.discord_wwm_notice_log is
  'One row per sent Discord notice key; service role inserts from cron. No public policies.';
