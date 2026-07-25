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

    // Ensure SEUM platform tenant exists (for super_admin)
    await client.query(
      `INSERT INTO tenants (id, name, contact_email, subscription_tier, plan_id, billing_cycle, subscription_started_at, subscription_renewal_date)
       SELECT $1, 'SEUM Platform', 'admin@seum.com', 'enterprise', sp.id, 'monthly', NOW(), NOW() + INTERVAL '1 month'
       FROM subscription_plans sp WHERE sp.name = 'enterprise'
       ON CONFLICT (name) DO NOTHING`,
      [SEUM_TENANT_ID]
    );

    // Ensure Demo Transport tenant exists
    await client.query(
      `INSERT INTO tenants (id, name, contact_email, subscription_tier, plan_id, billing_cycle, subscription_started_at, subscription_renewal_date)
       SELECT $1, 'Demo Transport Co', 'admin@demotransport.com', 'professional', sp.id, 'monthly', NOW(), NOW() + INTERVAL '1 month'
       FROM subscription_plans sp WHERE sp.name = 'professional'
       ON CONFLICT (name) DO NOTHING`,
      [DEMO_TENANT_ID]
    );

    const users = [
      { id: uuid(), tenantId: SEUM_TENANT_ID, email: 'super@seum.com', name: 'Super Admin', roles: ['super_admin'] },
      { id: uuid(), tenantId: DEMO_TENANT_ID, email: 'admin@demotransport.com', name: 'Ahmed Al-Rashid', roles: ['company_admin'] },
      { id: uuid(), tenantId: DEMO_TENANT_ID, email: 'ops@demotransport.com', name: 'Omar Hassan', roles: ['operations_manager'] },
      { id: uuid(), tenantId: DEMO_TENANT_ID, email: 'fleet@demotransport.com', name: 'Khalid Nasser', roles: ['fleet_manager'] },
      { id: uuid(), tenantId: DEMO_TENANT_ID, email: 'finance@demotransport.com', name: 'Layla Ibrahim', roles: ['finance_accountant'] },
      { id: uuid(), tenantId: DEMO_TENANT_ID, email: 'hr@demotransport.com', name: 'Nadia Yusuf', roles: ['hr_manager'] },
      { id: uuid(), tenantId: DEMO_TENANT_ID, email: 'monitor@demotransport.com', name: 'Fahad Al-Saud', roles: ['monitoring_control'] },
      { id: uuid(), tenantId: DEMO_TENANT_ID, email: 'driver1@demotransport.com', name: 'Mohammed Ali', roles: ['driver'] },
      { id: uuid(), tenantId: DEMO_TENANT_ID, email: 'driver2@demotransport.com', name: 'Ahmed Farouk', roles: ['driver'] },
      { id: uuid(), tenantId: DEMO_TENANT_ID, email: 'cs@demotransport.com', name: 'Sara Khalid', roles: ['customer_service'] },
      { id: uuid(), tenantId: DEMO_TENANT_ID, email: 'exec@demotransport.com', name: 'Abdullah Al-Otaibi', roles: ['executive'] },
      { id: uuid(), tenantId: DEMO_TENANT_ID, email: 'maintenance@demotransport.com', name: 'Yousef Mansour', roles: ['maintenance_workshop'] },
    ];

    for (const u of users) {
      await client.query(
        `INSERT INTO users (id, tenant_id, email, name, password_hash)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email) DO NOTHING`,
        [u.id, u.tenantId, u.email, u.name, hash]
      );

      const result = await client.query(
        `SELECT id FROM users WHERE email = $1`, [u.email]
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

    // ─── Seed Driver Profiles ───
    const driverEmails = ['driver1@demotransport.com', 'driver2@demotransport.com'];
    const driverUsers = await client.query(
      `SELECT id, email FROM users WHERE email = ANY($1)`, [driverEmails]
    );
    const driverUserIds: Record<string, string> = {};
    for (const row of driverUsers.rows) {
      driverUserIds[row.email] = row.id;
    }

    const drivers = [
      { userId: driverUserIds['driver1@demotransport.com'], code: 'DRV-001', license: 'SA-1234567', licenseExp: '2026-06-15', category: 'D', passport: 'SA123456', nationality: 'Saudi', dob: '1987-03-22', hireDate: '2022-01-15', blood: 'O+', medicalExp: '2025-12-31', emergencyName: 'Fatima Ali', emergencyPhone: '+966 55 123 4567' },
      { userId: driverUserIds['driver2@demotransport.com'], code: 'DRV-002', license: 'SA-7654321', licenseExp: '2026-09-20', category: 'C', passport: 'SA654321', nationality: 'Egyptian', dob: '1990-07-14', hireDate: '2023-04-01', blood: 'A+', medicalExp: '2026-03-15', emergencyName: 'Mona Farouk', emergencyPhone: '+966 55 987 6543' },
    ];

    for (const d of drivers) {
      if (!d.userId) continue;
      await client.query(
        `INSERT INTO drivers (id, tenant_id, user_id, employee_code, license_number, license_expiry, license_category, passport_number, nationality, date_of_birth, hire_date, emergency_contact_name, emergency_contact_phone, blood_type, medical_fitness_expiry, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'active')
         ON CONFLICT (tenant_id, employee_code) DO NOTHING`,
        [uuid(), DEMO_TENANT_ID, d.userId, d.code, d.license, d.licenseExp, d.category, d.passport, d.nationality, d.dob, d.hireDate, d.emergencyName, d.emergencyPhone, d.blood, d.medicalExp]
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

    // ─── Seed Routes ───
    const routes = [
      { name: 'Riyadh - Makkah Express', code: 'RUH-MKK-01', origin: 'Riyadh', destination: 'Makkah', distance: 870, duration: 540 },
      { name: 'Jeddah - Makkah Shuttle', code: 'JED-MKK-01', origin: 'Jeddah', destination: 'Makkah', distance: 80, duration: 75 },
      { name: 'Madinah - Makkah Direct', code: 'MED-MKK-01', origin: 'Madinah', destination: 'Makkah', distance: 450, duration: 300 },
    ];

    const routeIds: string[] = [];
    for (const r of routes) {
      const res = await client.query(
        `INSERT INTO routes (id, tenant_id, name, code, origin, destination, distance_km, estimated_duration_minutes, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
         ON CONFLICT (tenant_id, code) DO NOTHING
         RETURNING id`,
        [uuid(), DEMO_TENANT_ID, r.name, r.code, r.origin, r.destination, r.distance, r.duration]
      );
      if (res.rows.length) routeIds.push(res.rows[0].id);
    }

    // ─── Get bus IDs for trip seeding ───
    const busRows = await client.query(
      `SELECT id FROM buses WHERE tenant_id = $1 AND is_active = true LIMIT 3`,
      [DEMO_TENANT_ID]
    );
    const busIds = busRows.rows.map((r: any) => r.id);

    // ─── Seed Trips with Driver Assignments ───
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const driver1Id = driverUserIds['driver1@demotransport.com'];
    const driver2Id = driverUserIds['driver2@demotransport.com'];

    if (routeIds.length > 0 && busIds.length > 0) {
      const trips = [
        { routeIdx: 0, busIdx: 0, driverId: driver1Id, date: today, time: '06:00', status: 'scheduled', confirm: 'accepted' },
        { routeIdx: 1, busIdx: 1, driverId: driver1Id, date: today, time: '14:00', status: 'scheduled', confirm: 'pending' },
        { routeIdx: 2, busIdx: 2, driverId: driver2Id, date: today, time: '08:30', status: 'scheduled', confirm: 'accepted' },
        { routeIdx: 0, busIdx: 0, driverId: driver2Id, date: tomorrow, time: '07:00', status: 'scheduled', confirm: 'pending' },
      ];

      for (const t of trips) {
        await client.query(
          `INSERT INTO trips (id, tenant_id, route_id, bus_id, driver_id, trip_type, scheduled_date, scheduled_start_time, scheduled_end_time, status, driver_confirmation_status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT DO NOTHING`,
          [
            uuid(), DEMO_TENANT_ID, routeIds[t.routeIdx], busIds[t.busIdx],
            t.driverId, 'regular', t.date, t.time,
            `${String(parseInt(t.time.split(':')[0]) + (t.routeIdx === 0 ? 9 : t.routeIdx === 1 ? 2 : 5)).padStart(2, '0')}:${t.time.split(':')[1]}`,
            t.status, t.confirm,
          ]
        );
      }
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
    console.log('  driver1@demotransport.com— Driver (Mohammed Ali)');
    console.log('  driver2@demotransport.com— Driver (Ahmed Farouk)');
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
