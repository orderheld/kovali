import "server-only";
import { sql } from "drizzle-orm";
import { getDb, MIGRATION_LOCK } from "../db/client";

/**
 * Data of the former candidate module. Migration 0004 kept those tables (candidates,
 * submissions, portal accounts and so on, plus the column candidate_id of contracts, documents
 * and history) where a candidate was stored at the time. Nothing in the admin reads or writes
 * them. Ferhat removes them under Einstellungen > System; the tables are not in the Drizzle
 * schema, so this module uses plain SQL.
 */

export interface DormantCandidateData {
  candidates: number;
  /** Documents owned by candidates (CVs and the like, encrypted). */
  documents: number;
}

type Executor = Pick<Awaited<ReturnType<typeof getDb>>, "execute">;

async function tablesPresent(db: Executor): Promise<boolean> {
  const rows = await db.execute<{ present: boolean }>(sql`select to_regclass('candidates') is not null as present`);
  return Boolean(rows.rows[0]?.present);
}

async function counts(db: Executor): Promise<DormantCandidateData> {
  const column = await db.execute<{ present: boolean }>(
    sql`select exists (select 1 from information_schema.columns where table_schema = current_schema() and table_name = 'documents' and column_name = 'candidate_id') as present`,
  );
  const candidates = await db.execute<{ n: string }>(sql`select count(*) as n from candidates`);
  const documents = column.rows[0]?.present ? await db.execute<{ n: string }>(sql`select count(*) as n from documents where candidate_id is not null`) : null;
  return { candidates: Number(candidates.rows[0]?.n ?? 0), documents: Number(documents?.rows[0]?.n ?? 0) };
}

/** What is left of the candidate module, or null when its tables are gone. */
export async function dormantCandidateData(): Promise<DormantCandidateData | null> {
  const db = await getDb();
  if (!(await tablesPresent(db))) return null;
  return counts(db);
}

/**
 * Deletes the candidates with everything that belongs to them, then the tables of the module,
 * in one transaction. Deleting a candidate deletes its documents, history entries, submissions,
 * shares, portal account and change requests (on delete cascade); contracts stay and lose the
 * link. The owner rules of documents and history are then set up without candidates, as on a
 * database that never had any. Returns what was deleted, or null when nothing was there.
 */
export async function deleteDormantCandidateData(): Promise<DormantCandidateData | null> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    // No migration may run at the same time.
    await tx.execute(sql`select pg_advisory_xact_lock(${MIGRATION_LOCK})`);
    if (!(await tablesPresent(tx))) return null;
    const deleted = await counts(tx);
    await tx.execute(
      sql.raw(`
delete from candidates;
delete from login_attempts where scope = 'portal';
drop table if exists candidate_sessions;
drop table if exists candidate_accounts;
drop table if exists change_requests;
drop table if exists vacancy_shares;
drop table if exists submissions;
alter table contracts drop column if exists candidate_id;
alter table documents drop column if exists candidate_id;
alter table activities drop column if exists candidate_id;
drop table candidates;
alter table documents drop constraint if exists documents_owner;
alter table documents add constraint documents_owner check (num_nonnulls(company_id, mandate_id, contract_id, assignment_id) = 1);
alter table activities drop constraint if exists activities_owner;
alter table activities add constraint activities_owner check (num_nonnulls(company_id, mandate_id, contract_id, assignment_id) >= 1);
`),
    );
    return deleted;
  });
}
