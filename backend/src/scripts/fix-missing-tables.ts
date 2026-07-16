import { pool, query } from '../db';

async function fix() {
  console.log('Checking and fixing missing tables...');

  try {
    // 1. roles table
    const hasRoles = await query('SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)', ['roles']);
    if (!hasRoles[0]?.exists) {
      console.log('Creating roles table...');
      await query(`
        CREATE TABLE roles (
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
      `);
      console.log('  roles table created');
    } else {
      console.log('  roles table already exists');
    }

    // 2. user_roles table
    const hasUserRoles = await query('SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)', ['user_roles']);
    if (!hasUserRoles[0]?.exists) {
      console.log('Creating user_roles table and migrating data...');

      // First check if users.roles column still exists
      const hasRolesCol = await query(
        `SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'roles')`
      );

      await query(`
        CREATE TABLE IF NOT EXISTS user_roles (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          UNIQUE(user_id, role_id)
        );
        CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);
      `);

      if (hasRolesCol[0]?.exists) {
        await query(`
          INSERT INTO user_roles (user_id, role_id)
          SELECT u.id, r.id
          FROM users u
          JOIN roles r ON r.name = ANY(u.roles)
          ON CONFLICT DO NOTHING;
          ALTER TABLE users DROP COLUMN roles;
        `);
        console.log('  migrated data from users.roles');
      }

      console.log('  user_roles table created');
    } else {
      console.log('  user_roles table already exists');
    }

    // 3. subscription_plans table (must exist before tenant FK)
    const hasPlans = await query('SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)', ['subscription_plans']);
    if (!hasPlans[0]?.exists) {
      console.log('Creating subscription_plans table...');
      await query(`
        CREATE TABLE subscription_plans (
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
      `);
      console.log('  subscription_plans table created');
    } else {
      console.log('  subscription_plans table already exists');
    }

    // 4. Add billing columns to tenants table if missing
    const hasPlanId = await query(
      `SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'plan_id')`
    );
    if (!hasPlanId[0]?.exists) {
      console.log('Adding billing columns to tenants...');
      await query(`
        ALTER TABLE tenants
          ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES subscription_plans(id) ON DELETE SET NULL,
          ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',
          ADD COLUMN IF NOT EXISTS billing_email VARCHAR(255),
          ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP WITH TIME ZONE,
          ADD COLUMN IF NOT EXISTS subscription_renewal_date TIMESTAMP WITH TIME ZONE;
      `);
      console.log('  billing columns added');
    } else {
      console.log('  billing columns already exist');
    }

    // 5. Link tenants to plans (safe to run multiple times)
    await query(`
      UPDATE tenants SET
        plan_id = COALESCE(plan_id, (SELECT id FROM subscription_plans WHERE name = 'enterprise' LIMIT 1)),
        billing_cycle = COALESCE(billing_cycle, 'monthly'),
        subscription_started_at = COALESCE(subscription_started_at, NOW()),
        subscription_renewal_date = COALESCE(subscription_renewal_date, NOW() + INTERVAL '1 month')
      WHERE plan_id IS NULL;
    `);

    // 6. notifications table
    const hasNotifs = await query('SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)', ['notifications']);
    if (!hasNotifs[0]?.exists) {
      console.log('Creating notifications table...');
      await query(`
        CREATE TABLE notifications (
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
      `);
      console.log('  notifications table created');
    } else {
      console.log('  notifications table already exists');
    }

    console.log('Fix completed successfully.');
  } catch (err) {
    console.error('Fix failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fix();
