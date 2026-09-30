/**
 * The access switchboard: who may do what.
 *
 * These assertions are the contract the client's "3 roles for now" decision
 * lives on. When roles are distributed again, the expected allow/deny tables
 * below should change with `auth/roles.ts` — nothing else in the API names
 * roles any more (see `src/routes/*`).
 */

jest.mock('../db', () => ({
  query: jest.fn(),
  queryOne: jest.fn(),
  transaction: jest.fn(),
}));

import {
  CAPABILITIES,
  COMPANY_ADMIN,
  DRIVER,
  EMPLOYEE,
  EXECUTIVE,
  FINANCE_ACCOUNTANT,
  FLEET_MANAGER,
  HR_MANAGER,
  MONITORING_CONTROL,
  OPERATIONS_MANAGER,
  SUPER_ADMIN,
  TOP_LEVEL_ROLES,
  capabilitiesFor,
  hasCapability,
} from '../auth/roles';
import { requireRole } from '../middleware/auth';

// ─── Helpers ───

function runRequireRole(roles: string[]) {
  const middleware = requireRole(...CAPABILITIES.operationsRead);
  const req: any = { user: { roles } };
  const next = jest.fn();
  middleware(req, {} as any, next);
  return next;
}

describe('role catalogue', () => {
  it('offers exactly three top-level roles', () => {
    expect([...TOP_LEVEL_ROLES]).toEqual([SUPER_ADMIN, COMPANY_ADMIN, OPERATIONS_MANAGER]);
  });

  it('never lists a role that is not a known name', () => {
    const known = new Set([
      SUPER_ADMIN,
      COMPANY_ADMIN,
      OPERATIONS_MANAGER,
      FLEET_MANAGER,
      HR_MANAGER,
      FINANCE_ACCOUNTANT,
      MONITORING_CONTROL,
      'customer_service',
      'maintenance_workshop',
      EXECUTIVE,
      DRIVER,
      EMPLOYEE,
    ]);
    for (const [capability, roles] of Object.entries(CAPABILITIES)) {
      for (const role of roles) {
        expect({ capability, role, known: known.has(role) }).toEqual({
          capability,
          role,
          known: true,
        });
      }
    }
  });
});

describe('company_admin — "sees everything" at tenant level', () => {
  const caps = capabilitiesFor([COMPANY_ADMIN]);

  it.each([
    'fleetRead',
    'fleetWrite',
    'maintenanceRead',
    'maintenanceWrite',
    'operationsRead',
    'operationsWrite',
    'driverProfileRead',
    'driverProfileWrite',
    'workforceRead',
    'workforceAdmin',
    'bookingsRead',
    'bookingsWrite',
    'customersRead',
    'customersWrite',
    'trackingRead',
    'trackingWrite',
    'communicationsRead',
    'communicationsWrite',
    'financeRead',
    'financeWrite',
    'payrollRead',
    'payrollWrite',
    'hrRead',
    'hrWrite',
    'userAdmin',
    'auditRead',
    'companyDashboard',
  ] as const)('has %s', (capability) => {
    expect(caps).toContain(capability);
  });

  it('does not get platform-only powers', () => {
    expect(caps).not.toContain('platformAdmin');
  });
});

describe('operations_manager — everything tenant-level except Finance & HR', () => {
  const caps = capabilitiesFor([OPERATIONS_MANAGER]);

  it.each([
    'fleetRead',
    'fleetWrite',
    'maintenanceRead',
    'maintenanceWrite',
    'operationsRead',
    'operationsWrite',
    'driverProfileRead',
    'driverProfileWrite',
    'workforceRead',
    'workforceWrite',
    'bookingsRead',
    'bookingsWrite',
    'bookingsApprove',
    'customersRead',
    'customersWrite',
    'trackingRead',
    'trackingWrite',
    'communicationsRead',
    'communicationsWrite',
  ] as const)('has %s', (capability) => {
    expect(caps).toContain(capability);
  });

  it.each([
    'financeRead',
    'financeWrite',
    'payrollRead',
    'payrollWrite',
    'driverPayrollRead',
    'hrRead',
    'hrWrite',
    'userAdmin',
    'auditRead',
    'platformAdmin',
    'companyDashboard',
  ] as const)('is denied %s', (capability) => {
    expect(caps).not.toContain(capability);
  });
});

describe('legacy roles keep the access they had before', () => {
  it('fleet_manager', () => {
    const caps = capabilitiesFor([FLEET_MANAGER]);
    expect(caps).toEqual(
      expect.arrayContaining([
        'fleetRead',
        'fleetWrite',
        'maintenanceRead',
        'maintenanceWrite',
        'workforceRead',
        'workforceWrite',
        'driverRecordsRead',
        'driverPayrollRead',
        'customersRead',
        'communicationsRead',
      ])
    );
    expect(caps).not.toContain('financeWrite');
    expect(caps).not.toContain('hrWrite');
  });

  it('hr_manager', () => {
    const caps = capabilitiesFor([HR_MANAGER]);
    expect(caps).toEqual(
      expect.arrayContaining(['hrRead', 'hrWrite', 'workforceAdmin', 'payrollRead', 'payrollWrite'])
    );
  });

  it('finance_accountant', () => {
    const caps = capabilitiesFor([FINANCE_ACCOUNTANT]);
    expect(caps).toEqual(
      expect.arrayContaining(['financeRead', 'financeWrite', 'payrollRead', 'hrRead', 'bookingsRead'])
    );
    expect(caps).not.toContain('hrWrite');
  });

  it('monitoring_control keeps the control-room views', () => {
    const caps = capabilitiesFor([MONITORING_CONTROL]);
    expect(caps).toEqual(
      expect.arrayContaining(['trackingRead', 'trackingWrite', 'workforceRead', 'workforceWrite'])
    );
  });

  it('driver can reach their schedule and own records only', () => {
    const caps = capabilitiesFor([DRIVER]);
    expect(caps).toEqual(expect.arrayContaining(['driverSelfService', 'driverRecordsRead']));
    expect(caps).not.toContain('fleetRead');
    expect(caps).not.toContain('operationsRead');
    expect(caps).not.toContain('financeRead');
  });

  it('employee can only file their own leave', () => {
    expect(capabilitiesFor([EMPLOYEE])).toEqual(['employeeSelfService']);
  });
});

describe('capabilitiesFor', () => {
  it('unions the capabilities of every role a user holds', () => {
    const caps = capabilitiesFor([OPERATIONS_MANAGER, FINANCE_ACCOUNTANT]);
    expect(caps).toContain('fleetWrite'); // from operations_manager
    expect(caps).toContain('financeWrite'); // from finance_accountant
  });

  it('handles missing / empty roles', () => {
    expect(capabilitiesFor([])).toEqual([]);
    expect(capabilitiesFor(null)).toEqual([]);
    expect(capabilitiesFor(undefined)).toEqual([]);
    expect(hasCapability(null, 'fleetRead')).toBe(false);
  });

  it('ignores unknown role names', () => {
    expect(capabilitiesFor(['not_a_role'])).toEqual([]);
  });
});

describe('requireRole middleware', () => {
  it('lets a permitted role through', () => {
    const next = runRequireRole([OPERATIONS_MANAGER]);
    expect(next).toHaveBeenCalledWith();
  });

  it('blocks a role without the capability', () => {
    const next = runRequireRole([DRIVER]);
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it('blocks an unauthenticated request', () => {
    const middleware = requireRole(...CAPABILITIES.financeWrite);
    const next = jest.fn();
    middleware({} as any, {} as any, next);
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it('lets a multi-role user through when any role matches', () => {
    const next = runRequireRole([DRIVER, OPERATIONS_MANAGER]);
    expect(next).toHaveBeenCalledWith();
  });
});
