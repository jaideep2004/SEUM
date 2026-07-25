import { query, queryOne } from '../db';
import { NotFoundError, ConflictError } from '../utils/errors';

interface AccountRow {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  type: string;
  parent_account_id: string | null;
  is_active: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

function mapAccount(row: AccountRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    code: row.code,
    name: row.name,
    type: row.type,
    parentAccountId: row.parent_account_id,
    isActive: row.is_active,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createAccount(tenantId: string, input: {
  code: string; name: string; type: string;
  parentAccountId?: string; isActive?: boolean; description?: string;
}) {
  const existing = await queryOne<{ id: string }>(
    'SELECT id FROM accounts WHERE tenant_id = $1 AND code = $2 AND deleted_at IS NULL',
    [tenantId, input.code]
  );
  if (existing) throw new ConflictError('Account code already exists');

  if (input.parentAccountId) {
    const parent = await queryOne<{ id: string }>(
      'SELECT id FROM accounts WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
      [input.parentAccountId, tenantId]
    );
    if (!parent) throw new NotFoundError('Parent account not found');
  }

  const result = await queryOne<AccountRow>(
    `INSERT INTO accounts (tenant_id, code, name, type, parent_account_id, is_active, description)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [tenantId, input.code, input.name, input.type, input.parentAccountId || null,
     input.isActive ?? true, input.description || null]
  );

  return mapAccount(result!);
}

export async function listAccounts(tenantId: string) {
  await seedDefaults(tenantId);

  const rows = await query<any>(
    `SELECT a.*,
            COALESCE((SELECT COUNT(*) FROM accounts child WHERE child.parent_account_id = a.id AND child.deleted_at IS NULL), 0)::int AS child_count
     FROM accounts a
     WHERE a.tenant_id = $1 AND a.deleted_at IS NULL
     ORDER BY a.code`,
    [tenantId]
  );

  const accounts = rows.map((r: any) => ({ ...mapAccount(r), childCount: r.child_count }));

  const tree = buildTree(accounts);
  return { accounts, tree };
}

const DEFAULT_ACCOUNTS = [
  { code: '1000', name: 'Assets', type: 'asset', description: 'Parent account for all assets' },
  { code: '1100', name: 'Cash & Bank', type: 'asset', description: 'Cash on hand and bank accounts' },
  { code: '1200', name: 'Accounts Receivable', type: 'asset', description: 'Money owed by customers' },
  { code: '2000', name: 'Liabilities', type: 'liability', description: 'Parent account for all liabilities' },
  { code: '2100', name: 'Accounts Payable', type: 'liability', description: 'Money owed to suppliers' },
  { code: '3000', name: 'Equity', type: 'equity', description: 'Parent account for equity' },
  { code: '4000', name: 'Revenue', type: 'revenue', description: 'Parent account for all revenue' },
  { code: '4100', name: 'Trip Revenue', type: 'revenue', description: 'Revenue from passenger trips' },
  { code: '5000', name: 'Expenses', type: 'expense', description: 'Parent account for all expenses' },
  { code: '5100', name: 'Fuel Expense', type: 'expense', description: 'Cost of fuel for fleet' },
  { code: '5200', name: 'Salary Expense', type: 'expense', description: 'Employee and driver salaries' },
  { code: '5300', name: 'Maintenance Expense', type: 'expense', description: 'Vehicle maintenance and repairs' },
  { code: '5400', name: 'Insurance Expense', type: 'expense', description: 'Vehicle and liability insurance' },
  { code: '5500', name: 'Tolls & Permits', type: 'expense', description: 'Road tolls and operating permits' },
];

async function seedDefaults(tenantId: string) {
  const count = await queryOne<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM accounts WHERE tenant_id = $1 AND deleted_at IS NULL',
    [tenantId]
  );
  if (parseInt(count?.count || '0', 10) > 0) return;

  for (const acc of DEFAULT_ACCOUNTS) {
    await query(
      `INSERT INTO accounts (tenant_id, code, name, type, description)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (tenant_id, code) DO NOTHING`,
      [tenantId, acc.code, acc.name, acc.type, acc.description]
    );
  }
}

function buildTree(accounts: any[]): any[] {
  const map = new Map<string, any>();
  const roots: any[] = [];

  accounts.forEach(a => map.set(a.id, { ...a, children: [] }));

  accounts.forEach(a => {
    const node = map.get(a.id);
    if (a.parentAccountId && map.has(a.parentAccountId)) {
      map.get(a.parentAccountId).children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

export async function updateAccount(tenantId: string, id: string, input: {
  code?: string; name?: string; type?: string;
  parentAccountId?: string | null; isActive?: boolean; description?: string | null;
}) {
  const existing = await queryOne<AccountRow>(
    'SELECT * FROM accounts WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [id, tenantId]
  );
  if (!existing) throw new NotFoundError('Account not found');

  if (input.code && input.code !== existing.code) {
    const dup = await queryOne<{ id: string }>(
      'SELECT id FROM accounts WHERE tenant_id = $1 AND code = $2 AND id != $3 AND deleted_at IS NULL',
      [tenantId, input.code, id]
    );
    if (dup) throw new ConflictError('Account code already exists');
  }

  const updates: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (input.code !== undefined) { updates.push(`code = $${idx}`); values.push(input.code); idx++; }
  if (input.name !== undefined) { updates.push(`name = $${idx}`); values.push(input.name); idx++; }
  if (input.type !== undefined) { updates.push(`type = $${idx}`); values.push(input.type); idx++; }
  if (input.parentAccountId !== undefined) { updates.push(`parent_account_id = $${idx}`); values.push(input.parentAccountId); idx++; }
  if (input.isActive !== undefined) { updates.push(`is_active = $${idx}`); values.push(input.isActive); idx++; }
  if (input.description !== undefined) { updates.push(`description = $${idx}`); values.push(input.description); idx++; }
  updates.push('updated_at = NOW()');

  if (updates.length === 1) return mapAccount(existing);

  values.push(id);
  const result = await queryOne<AccountRow>(
    `UPDATE accounts SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`, values
  );

  return mapAccount(result!);
}

export async function getAccountDetail(tenantId: string, id: string) {
  const row = await queryOne<any>(
    `SELECT a.*,
            parent.code AS parent_code, parent.name AS parent_name
     FROM accounts a
     LEFT JOIN accounts parent ON parent.id = a.parent_account_id
     WHERE a.id = $1 AND a.tenant_id = $2 AND a.deleted_at IS NULL`,
    [id, tenantId]
  );
  if (!row) throw new NotFoundError('Account not found');

  return {
    ...mapAccount(row),
    parent: row.parent_code ? { code: row.parent_code, name: row.parent_name } : null,
  };
}
