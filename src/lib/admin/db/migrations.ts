/**
 * Ordered SQL migrations of the admin database. They run automatically before the first
 * database access of a server instance (see client.ts), guarded by an advisory lock, and are
 * recorded in admin_migrations. Never edit a migration that has shipped; add a new one.
 */
export const migrations: { id: string; sql: string }[] = [
  {
    id: "0001_admin_base",
    sql: /* sql */ `
create table companies (
  id          bigint generated always as identity primary key,
  name        text not null,
  kind        text not null check (kind in ('auftraggeber', 'endkunde', 'subunternehmer', 'partner', 'sonstige')),
  legal_name  text,
  legal_form  text,
  uid         text,
  street      text,
  postal_code text,
  city        text,
  country     text not null default 'Schweiz',
  email       text,
  phone       text,
  website     text,
  industry    text,
  status      text not null default 'aktiv' check (status in ('aktiv', 'inaktiv')),
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index companies_kind_idx on companies (kind);

create table contacts (
  id           bigint generated always as identity primary key,
  company_id   bigint not null references companies (id) on delete cascade,
  salutation   text check (salutation in ('frau', 'herr')),
  first_name   text,
  last_name    text not null,
  role         text,
  email        text,
  phone        text,
  is_signatory boolean not null default false,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index contacts_company_idx on contacts (company_id);

create table candidates (
  id                 bigint generated always as identity primary key,
  first_name         text not null,
  last_name          text not null,
  email              text,
  phone              text,
  date_of_birth      date,
  street             text,
  postal_code        text,
  city               text,
  country            text not null default 'Schweiz',
  nationality        text,
  headline           text,
  disciplines        text[] not null default '{}',
  skills             text[] not null default '{}',
  sap_modules        text[] not null default '{}',
  detected_skills    text[] not null default '{}',
  seniority          text check (seniority in ('junior', 'professional', 'senior', 'expert')),
  languages          jsonb not null default '[]',
  certifications     text[] not null default '{}',
  education          jsonb not null default '[]',
  experience         jsonb not null default '[]',
  summary            text,
  engagement         text not null default 'offen' check (engagement in ('selbstaendig', 'anstellung', 'offen')),
  company_id         bigint references companies (id) on delete set null,
  work_permit        text,
  available_from     date,
  workload_min       smallint check (workload_min between 0 and 100),
  workload_max       smallint check (workload_max between 0 and 100),
  rate_amount        numeric(10, 2) check (rate_amount >= 0),
  rate_unit          text check (rate_unit in ('stunde', 'tag')),
  salary_expectation integer check (salary_expectation >= 0),
  remote             text check (remote in ('vor_ort', 'hybrid', 'remote', 'offen')),
  regions            text,
  notice_period      text,
  source             text,
  status             text not null default 'neu' check (status in ('neu', 'aktiv', 'im_einsatz', 'nicht_verfuegbar', 'archiviert')),
  rating             smallint check (rating between 1 and 5),
  notes              text,
  consent_at         timestamptz,
  consent_note       text,
  privacy_info_at    timestamptz,
  retention_until    date,
  last_contact_at    timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index candidates_status_idx on candidates (status);
create index candidates_retention_idx on candidates (retention_until);
create index candidates_skills_idx on candidates using gin (skills);
create index candidates_disciplines_idx on candidates using gin (disciplines);

create table mandates (
  id            bigint generated always as identity primary key,
  kind          text not null default 'anfrage' check (kind in ('anfrage', 'ausschreibung', 'direkt')),
  title         text not null,
  company_id    bigint references companies (id) on delete set null,
  contact_id    bigint references contacts (id) on delete set null,
  reference     text,
  end_client    text,
  description   text,
  disciplines   text[] not null default '{}',
  required_skills text[] not null default '{}',
  nice_skills   text[] not null default '{}',
  seniority     text check (seniority in ('junior', 'professional', 'senior', 'expert')),
  location      text,
  remote        text check (remote in ('vor_ort', 'hybrid', 'remote', 'offen')),
  workload      smallint check (workload between 0 and 100),
  start_date    date,
  end_date      date,
  duration_text text,
  rate_sell     numeric(10, 2) check (rate_sell >= 0),
  rate_unit     text check (rate_unit in ('stunde', 'tag')),
  deadline      date,
  source        text,
  status        text not null default 'neu' check (status in ('neu', 'in_bearbeitung', 'angeboten', 'interview', 'gewonnen', 'verloren', 'zurueckgezogen', 'pausiert')),
  priority      text not null default 'normal' check (priority in ('hoch', 'normal', 'tief')),
  next_step     text,
  next_step_at  date,
  notes         text,
  portal_visibility text not null default 'keine' check (portal_visibility in ('keine', 'ausgewaehlt', 'alle')),
  portal_title  text,
  portal_description text,
  portal_rate   numeric(10, 2) check (portal_rate >= 0),
  portal_rate_unit text check (portal_rate_unit in ('stunde', 'tag')),
  closed_at     timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index mandates_status_idx on mandates (status);
create index mandates_company_idx on mandates (company_id);

create table submissions (
  id              bigint generated always as identity primary key,
  mandate_id      bigint not null references mandates (id) on delete cascade,
  candidate_id    bigint not null references candidates (id) on delete cascade,
  status          text not null default 'vorgemerkt' check (status in ('vorgemerkt', 'einwilligung_offen', 'vorgeschlagen', 'interview', 'angebot', 'zusage', 'absage', 'zurueckgezogen')),
  consent_at      timestamptz,
  consent_note    text,
  submitted_at    timestamptz,
  profile_variant text not null default 'anonym' check (profile_variant in ('anonym', 'namentlich')),
  rate_buy        numeric(10, 2) check (rate_buy >= 0),
  rate_sell       numeric(10, 2) check (rate_sell >= 0),
  rate_unit       text check (rate_unit in ('stunde', 'tag')),
  match_score     smallint,
  feedback        text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- A dossier may only leave KOVALI with the candidate's consent for this mandate.
  constraint submissions_consent_before_submit check (submitted_at is null or consent_at is not null)
);
create unique index submissions_mandate_candidate_key on submissions (mandate_id, candidate_id);
create index submissions_candidate_idx on submissions (candidate_id);

create table contracts (
  id           bigint generated always as identity primary key,
  number       text not null unique,
  template     text not null,
  title        text not null,
  status       text not null default 'entwurf' check (status in ('entwurf', 'versendet', 'unterzeichnet', 'beendet', 'storniert')),
  company_id   bigint references companies (id) on delete set null,
  contact_id   bigint references contacts (id) on delete set null,
  candidate_id bigint references candidates (id) on delete set null,
  mandate_id   bigint references mandates (id) on delete set null,
  parent_id    bigint references contracts (id) on delete set null,
  data         jsonb not null default '{}',
  valid_from   date,
  valid_until  date,
  signed_at    date,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index contracts_status_idx on contracts (status);
create index contracts_company_idx on contracts (company_id);

create table documents (
  id           bigint generated always as identity primary key,
  candidate_id bigint references candidates (id) on delete cascade,
  company_id   bigint references companies (id) on delete cascade,
  mandate_id   bigint references mandates (id) on delete cascade,
  contract_id  bigint references contracts (id) on delete cascade,
  kind         text not null check (kind in ('cv', 'zeugnis', 'diplom', 'zertifikat', 'vertrag', 'anforderung', 'einwilligung', 'sonstiges')),
  filename     text not null,
  mime_type    text not null,
  size_bytes   integer not null,
  sha256       text not null,
  uploaded_by  text not null default 'admin' check (uploaded_by in ('admin', 'kandidat')),
  confirmed_at timestamptz default now(),
  content      bytea not null,
  text_content bytea,
  created_at   timestamptz not null default now(),
  constraint documents_owner check (num_nonnulls(candidate_id, company_id, mandate_id, contract_id) = 1)
);
create index documents_candidate_idx on documents (candidate_id);
create index documents_company_idx on documents (company_id);
create index documents_mandate_idx on documents (mandate_id);
create index documents_contract_idx on documents (contract_id);

create table activities (
  id           bigint generated always as identity primary key,
  candidate_id bigint references candidates (id) on delete cascade,
  company_id   bigint references companies (id) on delete cascade,
  mandate_id   bigint references mandates (id) on delete cascade,
  contract_id  bigint references contracts (id) on delete cascade,
  kind         text not null default 'notiz' check (kind in ('notiz', 'anruf', 'e_mail', 'termin', 'system')),
  body         text not null,
  created_at   timestamptz not null default now(),
  constraint activities_owner check (num_nonnulls(candidate_id, company_id, mandate_id, contract_id) >= 1)
);
create index activities_candidate_idx on activities (candidate_id);
create index activities_company_idx on activities (company_id);
create index activities_mandate_idx on activities (mandate_id);
create index activities_contract_idx on activities (contract_id);
create index activities_created_idx on activities (created_at);

create table audit_log (
  id        bigint generated always as identity primary key,
  at        timestamptz not null default now(),
  action    text not null,
  entity    text,
  entity_id bigint,
  summary   text,
  ip_hash   text
);
create index audit_log_at_idx on audit_log (at);

create table sessions (
  id           text primary key,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  last_seen_at timestamptz not null default now(),
  ip_hash      text,
  user_agent   text
);
create index sessions_expires_idx on sessions (expires_at);

create table login_attempts (
  id      bigint generated always as identity primary key,
  at      timestamptz not null default now(),
  ip_hash text not null,
  success boolean not null
);
create index login_attempts_ip_at_idx on login_attempts (ip_hash, at);
create index login_attempts_at_idx on login_attempts (at);

create table candidate_accounts (
  id               bigint generated always as identity primary key,
  candidate_id     bigint not null unique references candidates (id) on delete cascade,
  email            text not null unique check (email = lower(email)),
  password_hash    text,
  status           text not null default 'eingeladen' check (status in ('eingeladen', 'aktiv', 'gesperrt')),
  token_hash       text unique,
  token_expires_at timestamptz,
  last_login_at    timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table candidate_sessions (
  id           text primary key,
  account_id   bigint not null references candidate_accounts (id) on delete cascade,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  last_seen_at timestamptz not null default now()
);
create index candidate_sessions_account_idx on candidate_sessions (account_id);
create index candidate_sessions_expires_idx on candidate_sessions (expires_at);

create table change_requests (
  id           bigint generated always as identity primary key,
  candidate_id bigint not null references candidates (id) on delete cascade,
  section      text not null check (section in ('profil', 'kompetenzen', 'werdegang', 'ausbildung', 'sprachen', 'verfuegbarkeit', 'stammdaten')),
  payload      jsonb not null default '{}',
  message      text,
  status       text not null default 'offen' check (status in ('offen', 'bestaetigt', 'abgelehnt', 'zurueckgezogen')),
  review_note  text,
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index change_requests_candidate_idx on change_requests (candidate_id);
create index change_requests_status_idx on change_requests (status);
-- At most one open request per candidate and section; a new edit replaces the open one.
create unique index change_requests_one_open on change_requests (candidate_id, section) where status = 'offen';

create table vacancy_shares (
  id               bigint generated always as identity primary key,
  mandate_id       bigint not null references mandates (id) on delete cascade,
  candidate_id     bigint not null references candidates (id) on delete cascade,
  shared_at        timestamptz not null default now(),
  seen_at          timestamptz,
  response         text not null default 'offen' check (response in ('offen', 'interessiert', 'kein_interesse')),
  response_at      timestamptz,
  response_message text
);
create unique index vacancy_shares_mandate_candidate_key on vacancy_shares (mandate_id, candidate_id);
create index vacancy_shares_candidate_idx on vacancy_shares (candidate_id);

create table settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
`,
  },
];
