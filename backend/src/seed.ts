import bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { pool, query } from './db';

const SEUM_TENANT_ID = 'a0000000-0000-0000-0000-000000000001';
const DEMO_TENANT_ID = 'a0000000-0000-0000-0000-000000000002';

async function seed() {
  console.log('Seeding database...');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const hash = await bcrypt.hash('admin123', 12);

    const users = [
      { id: uuid(), tenantId: SEUM_TENANT_ID, email: 'super@seum.com', name: 'Super Admin', roles: ['super_admin'] },
      { id: uuid(), tenantId: DEMO_TENANT_ID, email: 'admin@demotransport.com', name: 'Ahmed Al-Rashid', roles: ['company_admin'] },
      { id: uuid(), tenantId: DEMO_TENANT_ID, email: 'ops@demotransport.com', name: 'Omar Hassan', roles: ['operations_manager'] },
      { id: uuid(), tenantId: DEMO_TENANT_ID, email: 'fleet@demotransport.com', name: 'Khalid Nasser', roles: ['fleet_manager'] },
      { id: uuid(), tenantId: DEMO_TENANT_ID, email: 'finance@demotransport.com', name: 'Layla Ibrahim', roles: ['finance_accountant'] },
      { id: uuid(), tenantId: DEMO_TENANT_ID, email: 'hr@demotransport.com', name: 'Nadia Yusuf', roles: ['hr_manager'] },
      { id: uuid(), tenantId: DEMO_TENANT_ID, email: 'monitor@demotransport.com', name: 'Fahad Al-Saud', roles: ['monitoring_control'] },
      { id: uuid(), tenantId: DEMO_TENANT_ID, email: 'driver1@demotransport.com', name: 'Mohammed Ali', roles: ['driver'] },
      { id: uuid(), tenantId: DEMO_TENANT_ID, email: 'cs@demotransport.com', name: 'Sara Khalid', roles: ['customer_service'] },
      { id: uuid(), tenantId: DEMO_TENANT_ID, email: 'exec@demotransport.com', name: 'Abdullah Al-Otaibi', roles: ['executive'] },
      { id: uuid(), tenantId: DEMO_TENANT_ID, email: 'maintenance@demotransport.com', name: 'Yousef Mansour', roles: ['maintenance_workshop'] },
    ];

    for (const u of users) {
      const result = await client.query(
        `INSERT INTO users (id, tenant_id, email, name, password_hash)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [u.id, u.tenantId, u.email, u.name, hash]
      );

      const userId = result.rows[0].id;

      for (const roleName of u.roles) {
        await client.query(
          `INSERT INTO user_roles (user_id, role_id)
           SELECT $1, r.id FROM roles r WHERE r.name = $2
           ON CONFLICT DO NOTHING`,
          [userId, roleName]
        );
      }
    }

    // ─── Seed Buses ───
    const buses = [
      { plate: 'ABC 1234', make: 'Toyota', model: 'Coaster', year: 2022, seats: 29, standing: 10, fuel: 'diesel', status: 'active', depot: 'Riyadh Central' },
      { plate: 'XYZ 5678', make: 'Hino', model: 'RK', year: 2023, seats: 45, standing: 15, fuel: 'diesel', status: 'active', depot: 'Jeddah Main' },
      { plate: 'DEF 9012', make: 'Mercedes-Benz', model: 'Sprinter', year: 2021, seats: 19, standing: 5, fuel: 'diesel', status: 'maintenance', depot: 'Makkah Terminal' },
      { plate: 'GHI 3456', make: 'Isuzu', model: 'Turquoise', year: 2023, seats: 33, standing: 12, fuel: 'diesel', status: 'active', depot: 'Madinah Station' },
      { plate: 'JKL 7890', make: 'MAN', model: 'Lion\'s Coach', year: 2024, seats: 49, standing: 18, fuel: 'diesel', status: 'active', depot: 'Riyadh Central' },
      { plate: 'MNO 1234', make: 'Toyota', model: 'Hiace', year: 2020, seats: 14, standing: 2, fuel: 'petrol', status: 'retired', depot: 'Jeddah Main' },
      { plate: 'PQR 5678', make: 'Hino', model: 'AK', year: 2024, seats: 39, standing: 14, fuel: 'diesel', status: 'active', depot: 'Makkah Terminal' },
      { plate: 'STU 9012', make: 'Mercedes-Benz', model: 'Tourismo', year: 2023, seats: 53, standing: 20, fuel: 'diesel', status: 'active', depot: 'Taif Depot' },
    ];

    for (const b of buses) {
      await client.query(
        `INSERT INTO buses (id, tenant_id, plate_number, make, model, year, capacity_seated, capacity_standing, fuel_type, status, assigned_depot)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (tenant_id, plate_number) DO NOTHING`,
        [uuid(), DEMO_TENANT_ID, b.plate, b.make, b.model, b.year, b.seats, b.standing, b.fuel, b.status, b.depot]
      );
    }

    // ─── Seed Documents ───
    const docs = [
      { plate: 'ABC 1234', type: 'Registration', number: 'REG-2024-001', issue: '2024-01-15', expiry: '2025-01-15' },
      { plate: 'ABC 1234', type: 'Insurance', number: 'INS-2024-8823', issue: '2024-03-01', expiry: '2025-03-01' },
      { plate: 'XYZ 5678', type: 'Registration', number: 'REG-2024-002', issue: '2024-02-01', expiry: '2026-02-01' },
      { plate: 'XYZ 5678', type: 'Insurance', number: 'INS-2024-4491', issue: '2024-02-01', expiry: '2025-02-01' },
      { plate: 'GHI 3456', type: 'Registration', number: 'REG-2023-018', issue: '2023-11-10', expiry: '2024-11-10' },
      { plate: 'JKL 7890', type: 'Insurance', number: 'INS-2024-7712', issue: '2024-06-15', expiry: new Date(Date.now() + 20 * 86400000).toISOString().split('T')[0] },
    ];

    for (const d of docs) {
      await client.query(
        `INSERT INTO bus_documents (id, bus_id, tenant_id, document_type, document_number, issue_date, expiry_date, status)
         SELECT $1, b.id, $2, $3, $4, $5, $6, 'active'
         FROM buses b WHERE b.plate_number = $7 AND b.tenant_id = $2
         ON CONFLICT DO NOTHING`,
        [uuid(), DEMO_TENANT_ID, d.type, d.number, d.issue, d.expiry, d.plate]
      );
    }

    await client.query('COMMIT');
    console.log('Seed completed successfully.');
    console.log('');
    console.log('─── Test Accounts ───');
    console.log('All accounts use password: admin123');
    console.log('');
    console.log('  super@seum.com           — Super Admin');
    console.log('  admin@demotransport.com  — Company Admin');
    console.log('  ops@demotransport.com    — Operations Manager');
    console.log('  fleet@demotransport.com  — Fleet Manager');
    console.log('  finance@demotransport.com— Finance Accountant');
    console.log('  hr@demotransport.com     — HR Manager');
    console.log('  monitor@demotransport.com— Monitoring Control');
    console.log('  driver1@demotransport.com— Driver');
    console.log('  cs@demotransport.com     — Customer Service');
    console.log('  exec@demotransport.com   — Executive');
    console.log('  maintenance@demotransport.com — Maintenance');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
