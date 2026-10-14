/**
 * Ordered SQL migrations of the admin database. They run automatically before the first
 * database access of a server instance (see client.ts), guarded by an advisory lock, and are
 * recorded in admin_migrations. Never edit a migration that has shipped; add a new one.
 *
 * 0001 to 0003 still create the tables of the former candidate module; 0004 removes them again
 * when they hold no candidate (see there).
 */
export interface Migration {
  id: string;
  sql: string;
}

export const migrations: Migration[] = [
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
  scope   text not null check (scope in ('admin', 'portal')),
  ip_hash text not null,
  success boolean not null
);
create index login_attempts_ip_at_idx on login_attempts (scope, ip_hash, at);
create index login_attempts_at_idx on login_attempts (scope, at);

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
  response_message text,
  reviewed_at      timestamptz
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
  {
    // Consent, withdrawal and objection get their own columns instead of being encoded in
    // submissions.consent_note. The consent date stays when consent is withdrawn (it documents
    // what a hand-over was based on); withdrawn_at blocks every further hand-over.
    id: "0002_consent_columns",
    sql: /* sql */ `
alter table submissions
  add column consent_method           text check (consent_method in ('schriftlich', 'email', 'muendlich', 'portal', 'vertrag')),
  add column withdrawn_at             timestamptz,
  add column withdrawal_note          text,
  -- The candidate's own firm at the moment of the hand-over (snapshot).
  add column subcontractor_company_id bigint references companies (id) on delete set null,
  add constraint submissions_consent_method_needs_consent check (consent_method is null or consent_at is not null),
  add constraint submissions_withdrawal_note_needs_date check (withdrawal_note is null or withdrawn_at is not null);
create index submissions_subcontractor_idx on submissions (subcontractor_company_id);

-- Objection to any further hand-over of the candidate (Art. 30 Abs. 2 lit. b DSG).
alter table candidates
  add column objection_at   timestamptz,
  add column objection_note text,
  add constraint candidates_objection_note_needs_date check (objection_note is null or objection_at is not null);

-- Withdrawals written as text by the mandate module: "Widerruf am dd.mm.yyyy (Form): reason".
-- The date moves to withdrawn_at and the note keeps "Form: reason", as written from now on; a
-- date that cannot be read stays in the note and the withdrawal counts from now.
do $$
declare
  r record;
  day date;
begin
  for r in select id, consent_note from submissions where consent_note like 'Widerruf am %' loop
    day := null;
    if substring(r.consent_note from 13 for 10) ~ '^\\d{2}\\.\\d{2}\\.\\d{4}$' then
      begin
        day := to_date(substring(r.consent_note from 13 for 10), 'DD.MM.YYYY');
      exception when others then
        day := null;
      end;
    end if;
    update submissions
       set withdrawn_at = coalesce((day + time '12:00') at time zone 'UTC', now()),
           withdrawal_note = left(case
             when day is null then r.consent_note
             else regexp_replace(r.consent_note, '^Widerruf am \\d{2}\\.\\d{2}\\.\\d{4} \\(([^)]*)\\)', '\\1')
           end, 1000),
           consent_note = null
     where id = r.id;
  end loop;
end $$;

-- Withdrawals in the candidate portal, appended to the consent note as text.
update submissions
   set withdrawn_at = now(),
       withdrawal_note = left('Im' || substring(consent_note from position('im Kandidatenportal zurückgezogen am' in consent_note) + 2), 1000),
       consent_note = case
         when consent_note like 'Einwilligung im Kandidatenportal zurückgezogen am%' then null
         else nullif(rtrim(left(consent_note, position('im Kandidatenportal zurückgezogen am' in consent_note) - 1), '; '), '')
       end
 where withdrawn_at is null and position('im Kandidatenportal zurückgezogen am' in consent_note) > 0;

-- The form of consent, as far as the old notes tell it.
update submissions set consent_method = 'portal'
 where consent_at is not null and consent_note like 'Im Kandidatenportal%';
update submissions set consent_method = 'vertrag'
 where consent_at is not null and consent_method is null and consent_note ~ '^Einwilligung V-\\d{4}-\\d{4,}$';
update submissions
   set consent_method = case split_part(consent_note, ':', 1)
         when 'Schriftlich' then 'schriftlich'
         when 'E-Mail' then 'email'
         else 'muendlich'
       end,
       consent_note = nullif(btrim(substring(consent_note from length(split_part(consent_note, ':', 1)) + 2)), '')
 where consent_at is not null and consent_method is null and consent_note ~ '^(Schriftlich|E-Mail|Mündlich)(:|$)';
`,
  },
  {
    // What a consent covers: the anonymised dossier only, or the dossier with the name. A named
    // hand-over needs a named consent. Contracts remember when they were first sent, so a sent
    // contract (and its number) is never deleted, even after it was reopened as a draft.
    id: "0003_consent_scope_contract_sent",
    sql: /* sql */ `
alter table submissions
  add column consent_scope text check (consent_scope in ('anonym', 'namentlich')),
  add constraint submissions_consent_scope_needs_consent check (consent_scope is null or consent_at is not null);

-- The portal promises to ask again before the name is passed on: a portal consent covers the
-- anonymised dossier only. Other consents were recorded for the dossier chosen at the time.
-- A withdrawn consent has no scope (a withdrawal clears it from now on as well).
update submissions
   set consent_scope = case when consent_method = 'portal' then 'anonym' else coalesce(profile_variant, 'anonym') end
 where consent_at is not null and withdrawn_at is null;

alter table contracts add column sent_at timestamptz;

-- First "versendet" from the audit log; a contract that is sent now counts from its last change.
update contracts c
   set sent_at = coalesce(
         (select min(a.at) from audit_log a
           where a.entity = 'contract' and a.entity_id = c.id and a.summary like '%: Status versendet'),
         case when c.status = 'versendet' then c.updated_at end
       );
`,
  },
  {
    // The admin becomes Ferhat's personal tool: his assignments (Aufträge), reusable texts
    // (Textbausteine), vacancies he applies for (table mandates) and a filing cabinet for his
    // contracts. The candidate module goes. Its tables are dropped only when no candidate was
    // ever stored; otherwise they stay untouched (dormant, unused by the code).
    id: "0004_personal_admin",
    sql: /* sql */ `
create table assignments (
  id               bigint generated always as identity primary key,
  title            text not null,
  company_id       bigint references companies (id) on delete set null,
  contact_id       bigint references contacts (id) on delete set null,
  mandate_id       bigint references mandates (id) on delete set null,
  end_client       text,
  status           text not null default 'laufend' check (status in ('geplant', 'laufend', 'beendet')),
  start_date       date,
  end_date         date,
  workload         smallint not null default 100 check (workload between 1 and 100),
  rate_amount      numeric(10, 2) check (rate_amount >= 0),
  rate_unit        text not null default 'stunde' check (rate_unit in ('stunde', 'tag')),
  billing          text not null default 'rechnung' check (billing in ('rechnung', 'lohn')),
  rate_basis       text not null default 'brutto' check (rate_basis in ('brutto', 'kostensatz')),
  hours_per_month  numeric(6, 2) check (hours_per_month > 0),
  expenses_monthly numeric(10, 2) not null default 0 check (expenses_monthly >= 0),
  location         text,
  remote           text check (remote in ('vor_ort', 'hybrid', 'remote', 'offen')),
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint assignments_period check (end_date is null or start_date is null or end_date >= start_date)
);
create index assignments_status_idx on assignments (status);
create index assignments_company_idx on assignments (company_id);

create table snippets (
  id         bigint generated always as identity primary key,
  title      text not null,
  category   text,
  body       text not null,
  company_id bigint references companies (id) on delete set null,
  pinned     boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index snippets_company_idx on snippets (company_id);

-- Vacancies: application fields; the portal columns go.
alter table mandates
  add column url text,
  add column applied_at date,
  add column application_text text,
  drop column portal_visibility,
  drop column portal_title,
  drop column portal_description,
  drop column portal_rate,
  drop column portal_rate_unit;

-- Contracts become a filing cabinet. "template" is the kind of contract from now on.
alter table contracts
  alter column template set default 'sonstiges',
  add column assignment_id bigint references assignments (id) on delete set null,
  add column notice_period text;
create index contracts_assignment_idx on contracts (assignment_id);

-- Assignments can own documents and notes.
alter table documents add column assignment_id bigint references assignments (id) on delete cascade;
alter table activities add column assignment_id bigint references assignments (id) on delete cascade;
create index documents_assignment_idx on documents (assignment_id);
create index activities_assignment_idx on activities (assignment_id);
alter table documents drop constraint documents_kind_check;
alter table documents add constraint documents_kind_check check (kind in (
  'cv', 'zeugnis', 'diplom', 'zertifikat', 'vertrag', 'anforderung', 'einwilligung', 'sonstiges',
  'ausschreibung', 'bewerbung', 'offerte', 'rapport', 'rechnung', 'lohnabrechnung', 'korrespondenz'));

-- Candidate data goes only when no candidate was ever stored. Dropping a column also drops
-- the owner constraints that name it; they are recreated below.
do $$
begin
  if not exists (select 1 from candidates) then
    drop table candidate_sessions;
    drop table candidate_accounts;
    drop table change_requests;
    drop table vacancy_shares;
    drop table submissions;
    alter table contracts drop column candidate_id;
    alter table documents drop column candidate_id;
    alter table activities drop column candidate_id;
    drop table candidates;
    delete from login_attempts where scope = 'portal';
  end if;
end $$;

-- Exactly one owner per document, at least one per history entry, now including assignments
-- (and candidates while their dormant data is kept).
do $$
declare
  t text;
  owners text;
begin
  foreach t in array array['documents', 'activities'] loop
    owners := 'company_id, mandate_id, contract_id, assignment_id';
    if exists (
      select 1 from information_schema.columns
       where table_schema = current_schema() and table_name = t and column_name = 'candidate_id'
    ) then
      owners := 'candidate_id, ' || owners;
    end if;
    execute format('alter table %I drop constraint if exists %I', t, t || '_owner');
    execute format(
      'alter table %I add constraint %I check (num_nonnulls(%s) %s)',
      t, t || '_owner', owners, case when t = 'documents' then '= 1' else '>= 1' end
    );
  end loop;
end $$;
`,
  },
];

/** The migrations up to and including `id`, in order (for tests of a database at that state). */
export function migrationsThrough(id: string): Migration[] {
  const index = migrations.findIndex((m) => m.id === id);
  if (index === -1) throw new Error(`Unbekannte Migration: ${id}`);
  return migrations.slice(0, index + 1);
}
