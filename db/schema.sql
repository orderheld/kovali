-- Optional storage for contact requests (Neon Postgres).
-- Run once in the Neon SQL editor or with: psql "$DATABASE_URL" -f db/schema.sql
-- The website works without it; requests are then only delivered by email.

create table if not exists contact_requests (
  id                  bigint generated always as identity primary key,
  reference           text        not null unique,
  created_at          timestamptz not null default now(),
  name                text        not null,
  company             text,
  email               text        not null,
  phone               text,
  request_type        text        not null,
  service             text,
  project_description text        not null,
  desired_start       text,
  work_mode           text,
  location            text,
  message             text,
  consent_at          timestamptz not null,
  -- Salted SHA-256 of the sender's IP address, only used for rate limiting.
  ip_hash             text        not null,
  -- 'sent' or 'failed': delivery stays traceable even if one of the two steps fails.
  email_status        text        not null check (email_status in ('sent', 'failed')),
  email_id            text,
  email_error         text
);

create index if not exists contact_requests_ip_hash_created_at_idx
  on contact_requests (ip_hash, created_at);

create index if not exists contact_requests_created_at_idx
  on contact_requests (created_at);

-- Retention: the cron endpoint /api/cron/retention deletes rows older than
-- CONTACT_RETENTION_DAYS (default 365). Manual alternative:
-- delete from contact_requests where created_at < now() - interval '365 days';
