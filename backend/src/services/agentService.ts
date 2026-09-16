import { query, queryOne } from '../db';

export interface AgentQuery {
  search?: string;
  page: number;
  pageSize: number;
}

export async function listAgents(tenantId: string, params: AgentQuery) {
  const conditions = ['c.tenant_id = $1', 'c.deleted_at IS NULL', 'c.is_company = true'];
  const values: any[] = [tenantId];
  let idx = 2;

  if (params.search) {
    conditions.push(`(c.name ILIKE $${idx} OR c.company_name ILIKE $${idx} OR c.phone ILIKE $${idx} OR c.email ILIKE $${idx})`);
    values.push(`%${params.search}%`);
    idx++;
  }

  const where = conditions.join(' AND ');
  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM customers c WHERE ${where}`,
    values
  );
  const total = parseInt(countResult?.count || '0', 10);

  const rows = await query<any>(
    `SELECT c.id, c.name, c.company_name, c.phone, c.email, c.id_number, c.nationality, c.address
     FROM customers c
     WHERE ${where}
     ORDER BY c.company_name ASC NULLS LAST, c.name ASC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, params.pageSize, (params.page - 1) * params.pageSize]
  );

  return {
    data: rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      companyName: r.company_name,
      displayName: r.company_name || r.name,
      phone: r.phone,
      email: r.email,
      idNumber: r.id_number,
      nationality: r.nationality,
      address: r.address,
    })),
    meta: { total, page: params.page, pageSize: params.pageSize },
  };
}
