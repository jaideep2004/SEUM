import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // 1. Create roles table
  pgm.createTable('roles', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    name: { type: 'varchar(50)', notNull: true, unique: true },
    description: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  // 2. Seed standard roles
  const roleNames = [
    'super_admin',
    'company_admin',
    'operations_manager',
    'fleet_manager',
    'driver',
    'hr_manager',
    'finance_accountant',
    'monitoring_control',
    'customer_service',
    'executive',
    'maintenance_workshop',
  ];

  for (const name of roleNames) {
    pgm.sql(`INSERT INTO roles (name) VALUES ('${name}') ON CONFLICT DO NOTHING`);
  }

  // 3. Create user_roles junction table
  pgm.createTable('user_roles', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    user_id: { type: 'uuid', notNull: true, references: 'users(id)', onDelete: 'CASCADE' },
    role_id: { type: 'uuid', notNull: true, references: 'roles(id)', onDelete: 'CASCADE' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.addConstraint('user_roles', 'uq_user_roles', {
    unique: ['user_id', 'role_id'],
  });

  pgm.createIndex('user_roles', 'user_id');
  pgm.createIndex('user_roles', 'role_id');

  // 4. Migrate existing data from users.roles (TEXT[]) to user_roles
  pgm.sql(`
    INSERT INTO user_roles (user_id, role_id)
    SELECT u.id, r.id
    FROM users u
    JOIN roles r ON r.name = ANY(u.roles)
    ON CONFLICT DO NOTHING
  `);

  // 5. Remove old roles column from users
  pgm.dropColumn('users', 'roles');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Restore roles column (will lose data if user_roles has more recent changes)
  pgm.addColumn('users', {
    roles: { type: 'text[]', notNull: true, default: pgm.func("'{}'") },
  });

  // Migrate back
  pgm.sql(`
    UPDATE users u
    SET roles = ARRAY(
      SELECT r.name
      FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = u.id
    )
  `);

  pgm.dropTable('user_roles');
  pgm.dropTable('roles');
}
