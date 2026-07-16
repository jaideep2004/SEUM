import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // 1. Subscription plans lookup
  pgm.createTable('subscription_plans', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    name: { type: 'varchar(100)', notNull: true, unique: true },
    description: { type: 'text' },
    price_monthly: { type: 'decimal(10,2)', notNull: true, default: '0' },
    price_yearly: { type: 'decimal(10,2)', notNull: true, default: '0' },
    max_users: { type: 'integer', notNull: true, default: 5 },
    max_vehicles: { type: 'integer', notNull: true, default: 10 },
    max_depots: { type: 'integer', notNull: true, default: 1 },
    features: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
    is_active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  // 2. Seed default plans
  pgm.sql(`
    INSERT INTO subscription_plans (name, description, price_monthly, price_yearly, max_users, max_vehicles, max_depots, features) VALUES
    ('starter', 'For small operators just getting started', 299, 2990, 5, 10, 1,
     '{"fleet_management": true, "live_tracking": false, "analytics": false, "multi_depot": false, "api_access": false}'),
    ('professional', 'For growing transport companies', 799, 7990, 25, 50, 5,
     '{"fleet_management": true, "live_tracking": true, "analytics": true, "multi_depot": true, "api_access": false}'),
    ('enterprise', 'For large fleet operators with full needs', 1999, 19990, 100, 500, 20,
     '{"fleet_management": true, "live_tracking": true, "analytics": true, "multi_depot": true, "api_access": true}')
    ON CONFLICT (name) DO NOTHING
  `);

  // 3. Add billing columns to tenants
  pgm.addColumns('tenants', {
    plan_id: { type: 'uuid', references: 'subscription_plans(id)', onDelete: 'SET NULL' },
    billing_cycle: { type: 'varchar(20)', notNull: true, default: 'monthly' },
    billing_email: { type: 'varchar(255)' },
    subscription_started_at: { type: 'timestamptz' },
    subscription_renewal_date: { type: 'timestamptz' },
  });

  // 4. Link existing tenants to the enterprise plan
  pgm.sql(`
    UPDATE tenants SET
      plan_id = (SELECT id FROM subscription_plans WHERE name = 'enterprise' LIMIT 1),
      billing_cycle = 'monthly',
      subscription_started_at = NOW(),
      subscription_renewal_date = NOW() + INTERVAL '1 month'
    WHERE plan_id IS NULL
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumns('tenants', [
    'plan_id', 'billing_cycle', 'billing_email',
    'subscription_started_at', 'subscription_renewal_date',
  ]);
  pgm.dropTable('subscription_plans');
}
