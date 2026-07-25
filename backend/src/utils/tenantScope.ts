import { query, queryOne } from '../db';

type Row = Record<string, unknown>;

function buildWhereClause(
  baseConditions: string[],
  baseParams: unknown[],
  tenantId: string
): { conditions: string[]; params: unknown[] } {
  const hasTenantFilter = baseConditions.some(
    (c) => c.includes('tenant_id') || c.includes('tenantId')
  );
  if (hasTenantFilter) {
    return { conditions: baseConditions, params: baseParams };
  }
  return {
    conditions: [...baseConditions, `tenant_id = $${baseParams.length + 1}`],
    params: [...baseParams, tenantId],
  };
}

export function scopedQuery<T extends Row>(
  sql: string,
  params: unknown[],
  tenantId: string
) {
  return query<T>(sql, params);
}

export { buildWhereClause };
