/**
 * Auto-scoped tenant query helpers.
 *
 * Usage:
 *   import { andTenant, withTenant } from '../utils/tenantQuery';
 *
 *   // andTenant — returns `AND table.tenant_id = $N` for appending to WHERE
 *   const sql = `SELECT * FROM buses WHERE status = $1 ${andTenant('buses', 2)}`;
 *   query(sql, ['active', tenantId]);
 *
 *   // withTenant — returns `WHERE table.tenant_id = $1` for when it's the only condition
 *   const sql = `SELECT * FROM buses ${withTenant('buses')}`;
 *   query(sql, [tenantId]);
 */

export function andTenant(alias: string, paramIndex: number): string {
  return `AND ${alias}.tenant_id = $${paramIndex}`;
}

export function withTenant(alias: string): string {
  return `WHERE ${alias}.tenant_id = $1`;
}
