import { pool } from './db';

const migration = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_yearly DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_users INTEGER NOT NULL DEFAULT 5,
  max_vehicles INTEGER NOT NULL DEFAULT 10,
  max_depots INTEGER NOT NULL DEFAULT 1,
  features JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

INSERT INTO subscription_plans (name, description, price_monthly, price_yearly, max_users, max_vehicles, max_depots, features) VALUES
  ('starter', 'For small operators just getting started', 299, 2990, 5, 10, 1,
   '{"fleet_management": true, "live_tracking": false, "analytics": false, "multi_depot": false, "api_access": false}'),
  ('professional', 'For growing transport companies', 799, 7990, 25, 50, 5,
   '{"fleet_management": true, "live_tracking": true, "analytics": true, "multi_depot": true, "api_access": false}'),
  ('enterprise', 'For large fleet operators with full needs', 1999, 19990, 100, 500, 20,
   '{"fleet_management": true, "live_tracking": true, "analytics": true, "multi_depot": true, "api_access": true}')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  domain VARCHAR(255),
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(50),
  subscription_tier VARCHAR(50) NOT NULL DEFAULT 'starter',
  feature_flags JSONB NOT NULL DEFAULT '{}',
  plan_id UUID REFERENCES subscription_plans(id) ON DELETE SET NULL,
  billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',
  billing_email VARCHAR(255),
  subscription_started_at TIMESTAMP WITH TIME ZONE,
  subscription_renewal_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

INSERT INTO roles (name) VALUES
  ('super_admin'), ('company_admin'), ('operations_manager'), ('fleet_manager'),
  ('driver'), ('hr_manager'), ('finance_accountant'), ('monitoring_control'),
  ('customer_service'), ('executive'), ('maintenance_workshop')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role_id)
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  reset_token_hash VARCHAR(255),
  reset_token_expires TIMESTAMP WITH TIME ZONE,
  failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  refresh_token_hash VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  is_revoked BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  description TEXT,
  UNIQUE(resource, action)
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role VARCHAR(50) NOT NULL,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE(role, permission_id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(100) NOT NULL,
  resource_id VARCHAR(255),
  old_value JSONB,
  new_value JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  resource VARCHAR(100),
  resource_id VARCHAR(255),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

INSERT INTO permissions (resource, action, description) VALUES
  ('tenants', 'create', 'Create a new tenant'),
  ('tenants', 'read', 'View tenant details'),
  ('tenants', 'update', 'Update tenant settings'),
  ('tenants', 'delete', 'Delete/soft-delete tenant'),
  ('users', 'create', 'Create users within tenant'),
  ('users', 'read', 'View users within tenant'),
  ('users', 'update', 'Update user details'),
  ('users', 'delete', 'Remove users'),
  ('fleet', 'create', 'Add buses/vehicles'),
  ('fleet', 'read', 'View fleet'),
  ('fleet', 'update', 'Update vehicle info'),
  ('fleet', 'delete', 'Remove vehicles'),
  ('trips', 'create', 'Schedule trips'),
  ('trips', 'read', 'View trips'),
  ('trips', 'update', 'Modify trips'),
  ('trips', 'delete', 'Cancel trips'),
  ('drivers', 'create', 'Add drivers'),
  ('drivers', 'read', 'View driver profiles'),
  ('drivers', 'update', 'Update driver info'),
  ('drivers', 'delete', 'Remove drivers'),
  ('bookings', 'create', 'Create bookings'),
  ('bookings', 'read', 'View bookings'),
  ('bookings', 'update', 'Modify bookings'),
  ('bookings', 'delete', 'Cancel bookings'),
  ('finance', 'read', 'View financial data'),
  ('finance', 'write', 'Create/edit financial records'),
  ('reports', 'read', 'View reports'),
  ('reports', 'export', 'Export reports'),
  ('audit_logs', 'read', 'View audit logs'),
  ('settings', 'read', 'View system settings'),
  ('settings', 'update', 'Modify system settings')
ON CONFLICT (resource, action) DO NOTHING;

INSERT INTO role_permissions (role, permission_id)
SELECT 'super_admin', id FROM permissions
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_id)
SELECT 'company_admin', id FROM permissions
WHERE resource IN ('users', 'fleet', 'trips', 'drivers', 'bookings', 'finance', 'reports', 'settings', 'audit_logs')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_id)
SELECT 'operations_manager', id FROM permissions
WHERE resource IN ('trips', 'drivers', 'bookings')
   OR (resource = 'reports' AND action IN ('read', 'export'))
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_id)
SELECT 'fleet_manager', id FROM permissions
WHERE resource IN ('fleet')
   OR (resource = 'reports' AND action IN ('read', 'export'))
ON CONFLICT DO NOTHING;
`;

async function run() {
  console.log('Running migrations...');
  try {
    await pool.query(migration);
    console.log('Migrations completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
}

run();
