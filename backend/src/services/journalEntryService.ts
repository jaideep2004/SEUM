import { query, queryOne } from '../db';
import { NotFoundError, ConflictError } from '../utils/errors';

interface JournalEntryRow {
  id: string;
  tenant_id: string;
  entry_number: string;
  date: string;
  description: string | null;
  reference_type: string | null;
  reference_id: string | null;
  created_by: string | null;
  status: string;
  posted_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface JournalLineRow {
  id: string;
  journal_entry_id: string;
  account_id: string;
  debit_amount: string;
  credit_amount: string;
  description: string | null;
}

function mapEntry(row: JournalEntryRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    entryNumber: row.entry_number,
    date: row.date,
    description: row.description,
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    createdBy: row.created_by,
    status: row.status,
    postedAt: row.posted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapLine(row: JournalLineRow) {
  return {
    id: row.id,
    journalEntryId: row.journal_entry_id,
    accountId: row.account_id,
    debitAmount: parseFloat(row.debit_amount),
    creditAmount: parseFloat(row.credit_amount),
    description: row.description,
  };
}

async function nextEntryNumber(tenantId: string): Promise<string> {
  const prefix = 'JE';
  const year = new Date().getFullYear();

  const last = await queryOne<{ entry_number: string }>(
    `SELECT entry_number FROM journal_entries
     WHERE tenant_id = $1 AND entry_number LIKE $2
     ORDER BY entry_number DESC LIMIT 1`,
    [tenantId, `${prefix}-${year}-%`]
  );

  let seq = 1;
  if (last) {
    const parts = last.entry_number.split('-');
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }

  return `${prefix}-${year}-${String(seq).padStart(4, '0')}`;
}

export async function createJournalEntry(tenantId: string, input: {
  date: string; description?: string; referenceType?: string; referenceId?: string;
  lines: { accountId: string; debitAmount: number; creditAmount: number; description?: string }[];
}, createdBy?: string) {
  const entryNumber = await nextEntryNumber(tenantId);

  const entry = await queryOne<JournalEntryRow>(
    `INSERT INTO journal_entries (tenant_id, entry_number, date, description, reference_type, reference_id, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [tenantId, entryNumber, input.date, input.description || null,
     input.referenceType || null, input.referenceId || null, createdBy || null]
  );

  for (const line of input.lines) {
    await query(
      `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount, description)
       VALUES ($1, $2, $3, $4, $5)`,
      [entry!.id, line.accountId, line.debitAmount, line.creditAmount, line.description || null]
    );
  }

  return getJournalEntryDetail(tenantId, entry!.id);
}

export async function listJournalEntries(tenantId: string, params: {
  status?: string; startDate?: string; endDate?: string;
  page: number; pageSize: number;
}) {
  const conditions: string[] = ['je.deleted_at IS NULL'];
  const values: any[] = [];
  let idx = 1;

  if (params.status) { conditions.push(`je.status = $${idx}`); values.push(params.status); idx++; }
  if (params.startDate) { conditions.push(`je.date >= $${idx}`); values.push(params.startDate); idx++; }
  if (params.endDate) { conditions.push(`je.date <= $${idx}`); values.push(params.endDate); idx++; }
  conditions.push(`je.tenant_id = $${idx}`); values.push(tenantId); idx++;

  const where = conditions.join(' AND ');
  const offset = (params.page - 1) * params.pageSize;

  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) FROM journal_entries je WHERE ${where}`, values
  );
  const total = parseInt(countResult?.count || '0', 10);

  const rows = await query<any>(
    `SELECT je.*,
            u.name AS created_by_name,
            COALESCE(lines.debit_total, 0)::text AS total_debit,
            COALESCE(lines.credit_total, 0)::text AS total_credit,
            lines.line_count::int
     FROM journal_entries je
     LEFT JOIN users u ON u.id = je.created_by
     LEFT JOIN LATERAL (
       SELECT SUM(jel.debit_amount) AS debit_total, SUM(jel.credit_amount) AS credit_total, COUNT(*) AS line_count
       FROM journal_entry_lines jel WHERE jel.journal_entry_id = je.id
     ) lines ON true
     WHERE ${where}
     ORDER BY je.date DESC, je.entry_number DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, params.pageSize, offset]
  );

  return {
    data: rows.map((r: any) => ({
      ...mapEntry(r),
      createdByName: r.created_by_name,
      totalDebit: parseFloat(r.total_debit),
      totalCredit: parseFloat(r.total_credit),
      lineCount: r.line_count,
    })),
    meta: { total, page: params.page, pageSize: params.pageSize },
  };
}

export async function getJournalEntryDetail(tenantId: string, id: string) {
  const entry = await queryOne<any>(
    `SELECT je.*, u.name AS created_by_name
     FROM journal_entries je
     LEFT JOIN users u ON u.id = je.created_by
     WHERE je.id = $1 AND je.tenant_id = $2 AND je.deleted_at IS NULL`,
    [id, tenantId]
  );
  if (!entry) throw new NotFoundError('Journal entry not found');

  const lines = await query<any>(
    `SELECT jel.*, a.code AS account_code, a.name AS account_name, a.type AS account_type
     FROM journal_entry_lines jel
     JOIN accounts a ON a.id = jel.account_id
     WHERE jel.journal_entry_id = $1
     ORDER BY jel.created_at`,
    [id]
  );

  let runningBalance = 0;
  const lineData = lines.map((l: any) => {
    runningBalance += parseFloat(l.debit_amount) - parseFloat(l.credit_amount);
    return {
      ...mapLine(l),
      accountCode: l.account_code,
      accountName: l.account_name,
      accountType: l.account_type,
      runningBalance,
    };
  });

  return {
    ...mapEntry(entry),
    createdByName: entry.created_by_name,
    totalDebit: lineData.reduce((s: number, l: any) => s + l.debitAmount, 0),
    totalCredit: lineData.reduce((s: number, l: any) => s + l.creditAmount, 0),
    lines: lineData,
  };
}

export async function postJournalEntry(tenantId: string, id: string) {
  const entry = await queryOne<JournalEntryRow>(
    'SELECT id, status FROM journal_entries WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [id, tenantId]
  );
  if (!entry) throw new NotFoundError('Journal entry not found');
  if (entry.status === 'posted') throw new ConflictError('Journal entry is already posted');

  const lines = await query<JournalLineRow>(
    'SELECT debit_amount, credit_amount FROM journal_entry_lines WHERE journal_entry_id = $1',
    [id]
  );

  const debit = lines.reduce((s, l) => s + parseFloat(l.debit_amount), 0);
  const credit = lines.reduce((s, l) => s + parseFloat(l.credit_amount), 0);
  if (Math.abs(debit - credit) > 0.01) {
    throw new ConflictError(`Cannot post: debits (${debit}) do not equal credits (${credit})`);
  }

  const result = await queryOne<JournalEntryRow>(
    `UPDATE journal_entries SET status = 'posted', posted_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id]
  );

  return getJournalEntryDetail(tenantId, result!.id);
}
