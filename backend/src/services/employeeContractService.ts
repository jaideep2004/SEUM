import { v4 as uuid } from 'uuid';
import { query, queryOne } from '../db';
import { NotFoundError } from '../utils/errors';
import type {
  CreateContractInput, UpdateContractInput, ListContractsQuery,
  CreateDocumentInput, UpdateDocumentInput, ListDocumentsQuery,
} from '../validators/employeeContracts';

interface ContractRow {
  id: string; tenant_id: string; employee_id: string; contract_type: string;
  start_date: string | null; end_date: string | null;
  salary: string | null; benefits: string | null; file_url: string | null;
  status: string; created_at: string; updated_at: string;
}

interface DocumentRow {
  id: string; tenant_id: string; employee_id: string; document_type: string;
  number: string | null; issue_date: string | null; expiry_date: string | null;
  file_url: string | null; notes: string | null; created_at: string; updated_at: string;
}

function mapContract(row: ContractRow) {
  return {
    id: row.id, tenantId: row.tenant_id, employeeId: row.employee_id,
    contractType: row.contract_type, startDate: row.start_date, endDate: row.end_date,
    salary: row.salary === null ? null : parseFloat(row.salary),
    benefits: row.benefits, fileUrl: row.file_url, status: row.status,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function mapDocument(row: DocumentRow) {
  return {
    id: row.id, tenantId: row.tenant_id, employeeId: row.employee_id,
    documentType: row.document_type, number: row.number,
    issueDate: row.issue_date, expiryDate: row.expiry_date,
    fileUrl: row.file_url, notes: row.notes,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

async function requireEmployee(tenantId: string, employeeId: string) {
  const employee = await queryOne<{ id: string }>(
    'SELECT id FROM employees WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [employeeId, tenantId]
  );
  if (!employee) throw new NotFoundError('Employee not found');
}

export async function createContract(tenantId: string, userId: string, input: CreateContractInput, fileUrl?: string) {
  await requireEmployee(tenantId, input.employee_id);
  const id = uuid();
  const row = await queryOne<ContractRow>(
    `INSERT INTO employee_contracts
       (id, tenant_id, employee_id, contract_type, start_date, end_date, salary, benefits, file_url, status, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [id, tenantId, input.employee_id, input.contract_type || 'full_time',
     input.start_date || null, input.end_date || null,
     input.salary ?? null, input.benefits || null, fileUrl || null,
     input.status || 'active', userId]
  );
  return mapContract(row!);
}

export async function listContracts(tenantId: string, params: ListContractsQuery) {
  const conditions: string[] = ['c.tenant_id = $1', 'c.deleted_at IS NULL'];
  const values: any[] = [tenantId];
  let idx = 2;

  if (params.employee_id) { conditions.push(`c.employee_id = $${idx}`); values.push(params.employee_id); idx++; }
  if (params.status) { conditions.push(`c.status = $${idx}`); values.push(params.status); idx++; }
  if (params.expiring_within !== undefined) {
    conditions.push(`c.end_date IS NOT NULL AND c.end_date <= CURRENT_DATE + $${idx}::integer`);
    values.push(params.expiring_within); idx++;
  }
  if (params.search) {
    conditions.push(`(e.employee_code ILIKE $${idx} OR u.name ILIKE $${idx})`);
    values.push(`%${params.search}%`); idx++;
  }

  const where = conditions.join(' AND ');
  const order = params.expiring_within !== undefined
    ? 'ORDER BY c.end_date ASC'
    : 'ORDER BY c.created_at DESC';
  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) FROM employee_contracts c
     JOIN employees e ON e.id = c.employee_id
     JOIN users u ON u.id = e.user_id
     WHERE ${where}`, values
  );
  const total = parseInt(countResult?.count || '0', 10);

  const rows = await query<any>(
    `SELECT c.*, e.employee_code AS employee_code, e.department AS employee_department,
            u.name AS employee_name, u.email AS employee_email
     FROM employee_contracts c
     JOIN employees e ON e.id = c.employee_id
     JOIN users u ON u.id = e.user_id
     WHERE ${where} ${order}
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, params.pageSize, (params.page - 1) * params.pageSize]
  );

  const data = rows.map((r) => ({
    ...mapContract(r),
    employee: {
      employeeCode: r.employee_code, name: r.employee_name,
      email: r.employee_email, department: r.employee_department,
    },
  }));

  return { data, meta: { total, page: params.page, pageSize: params.pageSize } };
}

export async function getContractById(tenantId: string, contractId: string) {
  const row = await queryOne<any>(
    `SELECT c.*, e.employee_code AS employee_code, e.department AS employee_department,
            u.name AS employee_name, u.email AS employee_email
     FROM employee_contracts c
     JOIN employees e ON e.id = c.employee_id
     JOIN users u ON u.id = e.user_id
     WHERE c.id = $1 AND c.tenant_id = $2 AND c.deleted_at IS NULL`,
    [contractId, tenantId]
  );
  if (!row) throw new NotFoundError('Contract not found');
  return { ...mapContract(row), employee: { employeeCode: row.employee_code, name: row.employee_name, email: row.employee_email, department: row.employee_department } };
}

export async function updateContract(tenantId: string, contractId: string, input: UpdateContractInput, fileUrl?: string) {
  const existing = await queryOne<{ id: string }>(
    'SELECT id FROM employee_contracts WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [contractId, tenantId]
  );
  if (!existing) throw new NotFoundError('Contract not found');

  const sets: string[] = [];
  const values: any[] = [];
  let idx = 1;

  const fields: Record<string, any> = {
    contract_type: input.contract_type, start_date: input.start_date,
    end_date: input.end_date, salary: input.salary ?? undefined,
    benefits: input.benefits, status: input.status,
  };
  for (const [col, val] of Object.entries(fields)) {
    if (val !== undefined) { sets.push(`${col} = $${idx}::${col === 'salary' ? 'numeric' : col === 'start_date' || col === 'end_date' ? 'date' : 'varchar'}`); values.push(val); idx++; }
  }
  if (fileUrl) { sets.push(`file_url = $${idx}`); values.push(fileUrl); idx++; }
  if (sets.length === 0) throw new NotFoundError('Nothing to update');

  sets.push(`updated_at = $${idx}`);
  values.push(new Date().toISOString()); idx++;
  values.push(contractId, tenantId);

  const row = await queryOne<ContractRow>(
    `UPDATE employee_contracts SET ${sets.join(', ')} WHERE id = $${idx} AND tenant_id = $${idx + 1} AND deleted_at IS NULL RETURNING *`,
    values
  );
  return mapContract(row!);
}

export async function deleteContract(tenantId: string, contractId: string) {
  const row = await queryOne<{ id: string }>(
    'UPDATE employee_contracts SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL RETURNING id',
    [contractId, tenantId]
  );
  if (!row) throw new NotFoundError('Contract not found');
  return { id: contractId };
}

export async function createDocument(tenantId: string, userId: string, input: CreateDocumentInput, fileUrl?: string) {
  await requireEmployee(tenantId, input.employee_id);
  const id = uuid();
  const row = await queryOne<DocumentRow>(
    `INSERT INTO employee_documents
       (id, tenant_id, employee_id, document_type, number, issue_date, expiry_date, file_url, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [id, tenantId, input.employee_id, input.document_type || 'other',
     input.number || null, input.issue_date || null, input.expiry_date || null,
     fileUrl || null, input.notes || null, userId]
  );
  return mapDocument(row!);
}

export async function listDocuments(tenantId: string, params: ListDocumentsQuery) {
  const conditions: string[] = ['d.tenant_id = $1', 'd.deleted_at IS NULL'];
  const values: any[] = [tenantId];
  let idx = 2;

  if (params.employee_id) { conditions.push(`d.employee_id = $${idx}`); values.push(params.employee_id); idx++; }
  if (params.document_type) { conditions.push(`d.document_type = $${idx}`); values.push(params.document_type); idx++; }
  if (params.expiring_within !== undefined) {
    conditions.push(`d.expiry_date IS NOT NULL AND d.expiry_date <= CURRENT_DATE + $${idx}::integer`);
    values.push(params.expiring_within); idx++;
  }

  const where = conditions.join(' AND ');
  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) FROM employee_documents d WHERE ${where}`, values
  );
  const total = parseInt(countResult?.count || '0', 10);

  const rows = await query<any>(
    `SELECT d.*, e.employee_code AS employee_code, e.department AS employee_department,
            u.name AS employee_name
     FROM employee_documents d
     JOIN employees e ON e.id = d.employee_id
     JOIN users u ON u.id = e.user_id
     WHERE ${where}
     ORDER BY d.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, params.pageSize, (params.page - 1) * params.pageSize]
  );

  const data = rows.map((r) => ({
    ...mapDocument(r),
    employee: { employeeCode: r.employee_code, name: r.employee_name, department: r.employee_department },
  }));

  return { data, meta: { total, page: params.page, pageSize: params.pageSize } };
}

export async function updateDocument(tenantId: string, documentId: string, input: UpdateDocumentInput, fileUrl?: string) {
  const existing = await queryOne<{ id: string }>(
    'SELECT id FROM employee_documents WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [documentId, tenantId]
  );
  if (!existing) throw new NotFoundError('Document not found');

  const sets: string[] = [];
  const values: any[] = [];
  let idx = 1;

  const fields: Record<string, any> = {
    document_type: input.document_type, number: input.number,
    issue_date: input.issue_date, expiry_date: input.expiry_date,
    notes: input.notes,
  };
  for (const [col, val] of Object.entries(fields)) {
    if (val !== undefined) { sets.push(`${col} = $${idx}::${col === 'number' ? 'varchar' : col === 'issue_date' || col === 'expiry_date' ? 'date' : col === 'notes' ? 'text' : 'varchar'}`); values.push(val); idx++; }
  }
  if (fileUrl) { sets.push(`file_url = $${idx}`); values.push(fileUrl); idx++; }
  if (sets.length === 0) throw new NotFoundError('Nothing to update');

  sets.push(`updated_at = $${idx}`);
  values.push(new Date().toISOString()); idx++;
  values.push(documentId, tenantId);

  const row = await queryOne<DocumentRow>(
    `UPDATE employee_documents SET ${sets.join(', ')} WHERE id = $${idx} AND tenant_id = $${idx + 1} AND deleted_at IS NULL RETURNING *`,
    values
  );
  return mapDocument(row!);
}

export async function deleteDocument(tenantId: string, documentId: string) {
  const row = await queryOne<{ id: string }>(
    'UPDATE employee_documents SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL RETURNING id',
    [documentId, tenantId]
  );
  if (!row) throw new NotFoundError('Document not found');
  return { id: documentId };
}

export async function getExpiryAlerts(tenantId: string, days: number) {
  const contracts = await query<any>(
    `SELECT c.*, e.employee_code AS employee_code, u.name AS employee_name
     FROM employee_contracts c
     JOIN employees e ON e.id = c.employee_id
     JOIN users u ON u.id = e.user_id
     WHERE c.tenant_id = $1 AND c.deleted_at IS NULL
       AND c.end_date IS NOT NULL
       AND c.end_date <= CURRENT_DATE + $2::integer
     ORDER BY c.end_date ASC`,
    [tenantId, days]
  );
  const documents = await query<any>(
    `SELECT d.*, e.employee_code AS employee_code, u.name AS employee_name
     FROM employee_documents d
     JOIN employees e ON e.id = d.employee_id
     JOIN users u ON u.id = e.user_id
     WHERE d.tenant_id = $1 AND d.deleted_at IS NULL
       AND d.expiry_date IS NOT NULL
       AND d.expiry_date <= CURRENT_DATE + $2::integer
     ORDER BY d.expiry_date ASC`,
    [tenantId, days]
  );

  const today = new Date().toISOString().slice(0, 10);
  const withExpiry = <T extends { endDate?: string | null; expiryDate?: string | null }>(rows: any[], getDate: (r: any) => string | null, map: (r: any) => T) =>
    rows.map((r) => {
      const date = getDate(r);
      return { ...map(r), daysLeft: date ? Math.ceil((new Date(date).getTime() - new Date(today).getTime()) / 86400000) : null, expired: date ? date < today : false };
    });

  return {
    days,
    contractCount: contracts.length,
    documentCount: documents.length,
    contracts: withExpiry(contracts, (r) => r.end_date, (r) => ({ ...mapContract(r), employee: { employeeCode: r.employee_code, name: r.employee_name } })),
    documents: withExpiry(documents, (r) => r.expiry_date, (r) => ({ ...mapDocument(r), employee: { employeeCode: r.employee_code, name: r.employee_name } })),
  };
}