import { v4 as uuid } from 'uuid';
import bcrypt from 'bcrypt';
import { query, queryOne } from '../db';
import { ConflictError, NotFoundError } from '../utils/errors';
import type { CreateEmployeeInput, UpdateEmployeeInput, ListEmployeesQuery } from '../validators/employees';

const SALT_ROUNDS = 12;

interface EmployeeRow {
  id: string; tenant_id: string; user_id: string | null; employee_code: string | null;
  department: string; designation: string | null; phone: string | null; email: string | null;
  join_date: string | null; contract_end_date: string | null; nationality: string | null;
  id_number: string | null; status: string; created_at: string; updated_at: string; deleted_at: string | null;
}

function mapEmployee(row: any) {
  return {
    id: row.id, tenantId: row.tenant_id, userId: row.user_id,
    employeeCode: row.employee_code, department: row.department,
    designation: row.designation, phone: row.phone, email: row.email,
    joinDate: row.join_date, contractEndDate: row.contract_end_date,
    nationality: row.nationality, idNumber: row.id_number, status: row.status,
    name: row.user_name || null,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export async function createEmployee(tenantId: string, input: CreateEmployeeInput) {
  const existingUser = await queryOne<{ id: string }>(
    'SELECT id FROM users WHERE email = $1', [input.email]
  );
  if (existingUser) throw new ConflictError(`User with email "${input.email}" already exists`);

  if (input.employeeCode) {
    const existingCode = await queryOne<{ id: string }>(
      'SELECT id FROM employees WHERE tenant_id = $1 AND employee_code = $2 AND deleted_at IS NULL',
      [tenantId, input.employeeCode]
    );
    if (existingCode) throw new ConflictError(`Employee with code "${input.employeeCode}" already exists`);
  }

  const userId = uuid();
  const employeeId = uuid();
  const now = new Date().toISOString();

  const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS);

  await query(
    `INSERT INTO users (id, tenant_id, email, password_hash, name, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $6)`,
    [userId, tenantId, input.email, hashedPassword, input.name, now]
  );

  const roleResult = await queryOne<{ id: string }>(
    "SELECT id FROM roles WHERE name = 'employee'"
  );
  if (roleResult) {
    await query(
      'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
      [userId, roleResult.id]
    );
  }

  const row = await queryOne<EmployeeRow>(
    `INSERT INTO employees (id, tenant_id, user_id, employee_code, department, designation, phone, email,
      join_date, contract_end_date, nationality, id_number, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [employeeId, tenantId, userId, input.employeeCode || null, input.department,
     input.designation || null, input.phone || null, input.email,
     input.joinDate || null, input.contractEndDate || null,
     input.nationality || null, input.idNumber || null, input.status]
  );

  return { ...mapEmployee({ ...row!, user_name: input.name }), email: input.email };
}

export async function listEmployees(tenantId: string, queryParams: ListEmployeesQuery, isSuperAdmin: boolean) {
  const conditions: string[] = ['e.deleted_at IS NULL'];
  const values: any[] = [];
  let idx = 1;

  if (!isSuperAdmin) {
    conditions.push(`e.tenant_id = $${idx}`); values.push(tenantId); idx++;
  }

  if (queryParams.status) {
    conditions.push(`e.status = $${idx}`); values.push(queryParams.status); idx++;
  }
  if (queryParams.department) {
    conditions.push(`e.department = $${idx}`); values.push(queryParams.department); idx++;
  }
  if (queryParams.search) {
    conditions.push(`(u.name ILIKE $${idx} OR u.email ILIKE $${idx} OR e.employee_code ILIKE $${idx} OR e.designation ILIKE $${idx})`);
    values.push(`%${queryParams.search}%`); idx++;
  }

  const where = conditions.join(' AND ');

  const countResult = await queryOne<{ count: number }>(
    `SELECT COUNT(*)::int FROM employees e
     LEFT JOIN users u ON u.id = e.user_id
     WHERE ${where}`, values
  );
  const total = countResult?.count ?? 0;

  const offset = (queryParams.page - 1) * queryParams.pageSize;
  values.push(queryParams.pageSize, offset);

  const rows = await query<any>(
    `SELECT e.*, u.name AS user_name
     FROM employees e
     LEFT JOIN users u ON u.id = e.user_id
     WHERE ${where}
     ORDER BY e.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`, values
  );

  return {
    data: rows.map(mapEmployee),
    meta: { total, page: queryParams.page, pageSize: queryParams.pageSize },
  };
}

export async function getEmployeeById(tenantId: string, employeeId: string, isSuperAdmin: boolean) {
  const cond = isSuperAdmin
    ? 'e.id = $1 AND e.deleted_at IS NULL'
    : 'e.id = $1 AND e.tenant_id = $2 AND e.deleted_at IS NULL';
  const params: any[] = isSuperAdmin ? [employeeId] : [employeeId, tenantId];

  const row = await queryOne<any>(
    `SELECT e.*, u.name AS user_name
     FROM employees e
     LEFT JOIN users u ON u.id = e.user_id
     WHERE ${cond}`, params
  );
  if (!row) throw new NotFoundError('Employee not found');

  return mapEmployee(row);
}

export async function updateEmployee(tenantId: string, employeeId: string, input: UpdateEmployeeInput, isSuperAdmin: boolean) {
  const cond = isSuperAdmin
    ? 'id = $1 AND deleted_at IS NULL'
    : 'id = $1 AND tenant_id = $2 AND deleted_at IS NULL';
  const params: any[] = isSuperAdmin ? [employeeId] : [employeeId, tenantId];

  const existing = await queryOne<EmployeeRow>(`SELECT id FROM employees WHERE ${cond}`, params);
  if (!existing) throw new NotFoundError('Employee not found');

  if (input.employeeCode) {
    const dup = await queryOne<{ id: string }>(
      'SELECT id FROM employees WHERE tenant_id = $1 AND employee_code = $2 AND deleted_at IS NULL AND id <> $3',
      [tenantId, input.employeeCode, employeeId]
    );
    if (dup) throw new ConflictError(`Employee with code "${input.employeeCode}" already exists`);
  }

  if (input.email) {
    const dup = await queryOne<{ id: string }>(
      'SELECT id FROM users WHERE email = $1 AND id <> $2',
      [input.email, existing.user_id || '']
    );
    if (dup) throw new ConflictError(`User with email "${input.email}" already exists`);
  }

  const employee = await queryOne<{ user_id: string }>(
    'SELECT user_id FROM employees WHERE id = $1', [employeeId]
  );
  if (input.name || input.email) {
    if (employee?.user_id) {
      const userUpdates: string[] = [];
      const userValues: any[] = [];
      let uid = 1;
      if (input.name) { userUpdates.push(`name = $${uid}`); userValues.push(input.name); uid++; }
      if (input.email) { userUpdates.push(`email = $${uid}`); userValues.push(input.email); uid++; }
      userValues.push(employee.user_id);
      await query(
        `UPDATE users SET ${userUpdates.join(', ')}, updated_at = NOW() WHERE id = $${uid}`,
        userValues
      );
    }
  }

  const setClauses: string[] = [];
  const setValues: any[] = [];
  let setIdx = 1;

  const updateMap: Record<string, string | undefined> = {
    employeeCode: input.employeeCode, department: input.department,
    designation: input.designation, phone: input.phone, email: input.email,
    joinDate: input.joinDate, contractEndDate: input.contractEndDate,
    nationality: input.nationality, idNumber: input.idNumber, status: input.status,
  };

  for (const [col, val] of Object.entries(updateMap)) {
    if (val !== undefined) {
      setClauses.push(`${col} = $${setIdx}`);
      setValues.push(val);
      setIdx++;
    }
  }

  if (setClauses.length > 0) {
    setValues.push(employeeId, tenantId);
    await query(
      `UPDATE employees SET ${setClauses.join(', ')}, updated_at = NOW()
       WHERE id = $${setIdx} AND tenant_id = $${setIdx + 1} AND deleted_at IS NULL`,
      setValues
    );
  }

  return getEmployeeById(tenantId, employeeId, isSuperAdmin);
}

export async function softDeleteEmployee(tenantId: string, employeeId: string, isSuperAdmin: boolean) {
  const cond = isSuperAdmin
    ? 'id = $1 AND deleted_at IS NULL'
    : 'id = $1 AND tenant_id = $2 AND deleted_at IS NULL';
  const params: any[] = isSuperAdmin ? [employeeId] : [employeeId, tenantId];

  const existing = await queryOne<EmployeeRow>(`SELECT id FROM employees WHERE ${cond}`, params);
  if (!existing) throw new NotFoundError('Employee not found');

  await query('UPDATE employees SET deleted_at = NOW(), status = $1, updated_at = NOW() WHERE id = $2',
    ['terminated', employeeId]);

  return { id: employeeId, status: 'terminated' };
}
