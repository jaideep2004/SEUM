import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuid } from 'uuid';
import { config } from '../config';
import { query, queryOne } from '../db';
import { ConflictError, UnauthorizedError, NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';

interface UserRow {
  id: string;
  tenant_id: string;
  email: string;
  name: string;
  password_hash: string;
  is_active: boolean;
  created_at: string;
}

const ROLE_QUERY = `COALESCE(
  (SELECT array_agg(r.name ORDER BY r.name) FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = u.id),
  '{}'
) as roles`;

interface TenantRow {
  id: string;
  name: string;
  contact_email: string;
  contact_phone: string | null;
  subscription_tier: string;
  plan_id: string | null;
  billing_cycle: string;
  billing_email: string | null;
  subscription_started_at: string | null;
  subscription_renewal_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  domain: string | null;
  feature_flags: Record<string, boolean>;
}

export async function registerUser(
  tenantId: string,
  email: string,
  password: string,
  name: string,
  roles: string[]
) {
  const existing = await queryOne<UserRow>('SELECT id FROM users WHERE email = $1', [email]);
  if (existing) {
    throw new ConflictError('A user with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const id = uuid();

  await query(
    `INSERT INTO users (id, tenant_id, email, name, password_hash)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, tenantId, email, name, passwordHash]
  );

  // Assign roles via junction table
  for (const roleName of roles) {
    await query(
      `INSERT INTO user_roles (user_id, role_id)
       SELECT $1, r.id FROM roles r WHERE r.name = $2
       ON CONFLICT DO NOTHING`,
      [id, roleName]
    );
  }

  return { id, tenantId, email, name, roles };
}

export async function loginUser(email: string, password: string, ipAddress?: string, userAgent?: string) {
  const user = await queryOne<any>(
    `SELECT u.*,
            ${ROLE_QUERY},
            t.name as tenant_name,
            t.is_active as tenant_active
     FROM users u
     JOIN tenants t ON t.id = u.tenant_id
     WHERE u.email = $1`,
    [email]
  );

  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const remainingMin = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000);
    throw new UnauthorizedError(`Account locked. Try again in ${remainingMin} minute(s).`);
  }

  if (!user.tenant_active) {
    throw new UnauthorizedError('Your organization account is inactive');
  }

  if (!user.is_active) {
    throw new UnauthorizedError('Your account has been deactivated');
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    const attempts = (user.failed_login_attempts || 0) + 1;
    if (attempts >= 5) {
      const lockUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      await query(
        `UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3`,
        [attempts, lockUntil, user.id]
      );
      throw new UnauthorizedError('Account locked due to too many failed attempts. Try again in 15 minutes.');
    }
    await query(
      `UPDATE users SET failed_login_attempts = $1 WHERE id = $2`,
      [attempts, user.id]
    );
    throw new UnauthorizedError('Invalid email or password');
  }

  await query(
    `UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1`,
    [user.id]
  );

  const tokens = generateTokens({
    userId: user.id,
    tenantId: user.tenant_id,
    email: user.email,
    roles: user.roles,
  });

  await storeSession(user.id, user.tenant_id, tokens.refreshToken, ipAddress, userAgent);

  return {
    user: {
      id: user.id,
      tenantId: user.tenant_id,
      email: user.email,
      name: user.name,
      roles: user.roles,
      isActive: user.is_active,
      createdAt: user.created_at,
    },
    tokens,
  };
}

export async function logoutUser(userId: string, refreshToken: string) {
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await query(
    `UPDATE sessions SET is_revoked = true, revoked_at = NOW()
     WHERE user_id = $1 AND refresh_token_hash = $2 AND is_revoked = false`,
    [userId, tokenHash]
  );
}

export async function refreshAccessToken(refreshToken: string) {
  try {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const session = await queryOne<any>(
      `SELECT s.*, u.is_active as user_active
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.refresh_token_hash = $1 AND s.is_revoked = false AND s.expires_at > NOW()`,
      [tokenHash]
    );

    if (!session || !session.user_active) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const payload = jwt.verify(refreshToken, config.jwt.refreshSecret) as {
      userId: string;
      tenantId: string;
      email: string;
      roles: string[];
    };

    const user = await queryOne<any>(
      `SELECT u.*, ${ROLE_QUERY}
       FROM users u WHERE u.id = $1 AND u.is_active = true`,
      [payload.userId]
    );
    if (!user) {
      throw new UnauthorizedError('User not found or deactivated');
    }

    await query(
      `UPDATE sessions SET is_revoked = true, revoked_at = NOW() WHERE id = $1`,
      [session.id]
    );

    const tokens = generateTokens({
      userId: user.id,
      tenantId: user.tenant_id,
      email: user.email,
      roles: user.roles,
    });

    await storeSession(user.id, user.tenant_id, tokens.refreshToken);

    return { tokens };
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
}

export async function forgotPassword(email: string) {
  const user = await queryOne<UserRow>('SELECT id, email, name FROM users WHERE email = $1', [email]);
  if (!user) {
    logger.warn({ email }, 'Forgot password requested for unknown email');
    return;
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await query(
    `UPDATE users SET reset_token_hash = $1, reset_token_expires = $2 WHERE id = $3`,
    [resetTokenHash, expiresAt.toISOString(), user.id]
  );

  const resetUrl = `${config.cors.origin}/reset-password?token=${resetToken}`;
  logger.info(
    { email, resetUrl },
    'Password reset link generated (no email provider configured — link is logged)'
  );
}

export async function resetPassword(token: string, newPassword: string) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const user = await queryOne<UserRow>(
    `SELECT id FROM users
     WHERE reset_token_hash = $1 AND reset_token_expires > NOW()`,
    [tokenHash]
  );

  if (!user) {
    throw new UnauthorizedError('Invalid or expired reset token');
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await query(
    `UPDATE users SET password_hash = $1, reset_token_hash = NULL, reset_token_expires = NULL WHERE id = $2`,
    [passwordHash, user.id]
  );

  await query(
    `UPDATE sessions SET is_revoked = true, revoked_at = NOW() WHERE user_id = $1 AND is_revoked = false`,
    [user.id]
  );
}

export async function getUserProfile(userId: string) {
  const user = await queryOne<any>(
    `SELECT u.id, u.tenant_id, u.email, u.name,
            ${ROLE_QUERY},
            u.is_active, u.created_at,
            t.name as tenant_name
     FROM users u
     JOIN tenants t ON t.id = u.tenant_id
     WHERE u.id = $1`,
    [userId]
  );

  if (!user) {
    throw new NotFoundError('User not found');
  }

  return {
    id: user.id,
    tenantId: user.tenant_id,
    email: user.email,
    name: user.name,
    roles: user.roles,
    tenantName: user.tenant_name,
    isActive: user.is_active,
    createdAt: user.created_at,
  };
}

function generateTokens(payload: { userId: string; tenantId: string; email: string; roles: string[] }) {
  const accessToken = jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn as any,
  });

  const refreshToken = jwt.sign(
    { userId: payload.userId, tenantId: payload.tenantId, email: payload.email, roles: payload.roles },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn as any }
  );

  return {
    accessToken,
    refreshToken,
    expiresIn: 900,
  };
}

async function storeSession(userId: string, tenantId: string, refreshToken: string, ipAddress?: string, userAgent?: string) {
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await query(
    `INSERT INTO sessions (id, user_id, tenant_id, refresh_token_hash, ip_address, user_agent, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [uuid(), userId, tenantId, tokenHash, ipAddress || null, userAgent || null, expiresAt.toISOString()]
  );
}

export async function createTenant(name: string, contactEmail: string, contactPhone?: string) {
  const existing = await queryOne<TenantRow>('SELECT id FROM tenants WHERE name = $1', [name]);
  if (existing) {
    throw new ConflictError('A tenant with this name already exists');
  }

  const id = uuid();
  await query(
    `INSERT INTO tenants (id, name, contact_email, contact_phone, plan_id, billing_cycle, subscription_started_at, subscription_renewal_date)
     SELECT $1, $2, $3, $4, sp.id, 'monthly', NOW(), NOW() + INTERVAL '1 month'
     FROM subscription_plans sp WHERE sp.name = 'starter'`,
    [id, name, contactEmail, contactPhone || null]
  );

  return { id, name, contactEmail, contactPhone, isActive: true };
}

export async function listTenants() {
  return query<TenantRow>('SELECT id, name, domain, contact_email, contact_phone, subscription_tier, is_active, created_at, updated_at FROM tenants ORDER BY created_at DESC');
}

export async function getTenantById(id: string) {
  return queryOne<TenantRow>('SELECT * FROM tenants WHERE id = $1', [id]);
}

interface TenantUpdate {
  name?: string;
  contactEmail?: string;
  contactPhone?: string;
  domain?: string;
  subscriptionTier?: string;
  planId?: string;
  billingCycle?: string;
  billingEmail?: string;
  subscriptionRenewalDate?: string;
  isActive?: boolean;
}

const tenantFieldMap: Record<string, string> = {
  name: 'name',
  contactEmail: 'contact_email',
  contactPhone: 'contact_phone',
  domain: 'domain',
  subscriptionTier: 'subscription_tier',
  planId: 'plan_id',
  billingCycle: 'billing_cycle',
  billingEmail: 'billing_email',
  subscriptionRenewalDate: 'subscription_renewal_date',
  isActive: 'is_active',
};

export async function updateTenant(id: string, updates: TenantUpdate) {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  for (const [key, column] of Object.entries(tenantFieldMap)) {
    if ((updates as any)[key] !== undefined) {
      fields.push(`${column} = $${paramIndex++}`);
      values.push((updates as any)[key] ?? null);
    }
  }

  if (fields.length === 0) {
    return getTenantById(id);
  }

  fields.push('updated_at = NOW()');
  values.push(id);

  const result = await queryOne<TenantRow>(
    `UPDATE tenants SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  return result;
}

export async function softDeleteTenant(id: string) {
  const result = await queryOne<TenantRow>(
    `UPDATE tenants SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id]
  );
  return result;
}
