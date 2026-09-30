/**
 * Role & capability switchboard — the single source of truth for access control.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE TEMPORARY RULE (client decision, Sept 2026)
 * ─────────────────────────────────────────────────────────────────────────────
 * The client is currently confused by having too many roles, so only THREE are
 * offered when creating users:
 *
 *     super_admin · company_admin · operations_manager
 *
 * Until roles are distributed again ("later on we will expand into these users"):
 *   - `company_admin` sees every tenant-level page.
 *   - `operations_manager` sees everything tenant-level EXCEPT Finance and HR.
 *   - The legacy roles (fleet_manager, hr_manager, …) stay in the database and
 *     keep working exactly as before, so existing logins do not break — they are
 *     simply not offered in the role picker any more.
 *
 * HOW TO DISTRIBUTE LATER (no route edits needed)
 * Each capability below is a plain array of role names. Narrowing a capability
 * to real separation of concerns = remove the role from that one array, and the
 * API gates AND the web sidebar (which reads `capabilities` from /auth/me)
 * follow automatically. That is the whole point of this file: route files never
 * name roles directly any more.
 *
 * NOTE: `finance*`/`payroll*`/`hr*` deliberately exclude operations_manager per
 * the client instruction "all except Finance & HR". Flip one array to bring
 * ops back in — nothing else has to change.
 */

// ─── Role names ───

export const SUPER_ADMIN = 'super_admin';
export const COMPANY_ADMIN = 'company_admin';
export const OPERATIONS_MANAGER = 'operations_manager';

// Legacy / future roles. Kept so existing logins and seeded users keep working;
// hidden from the role picker until the client re-expands.
export const FLEET_MANAGER = 'fleet_manager';
export const HR_MANAGER = 'hr_manager';
export const FINANCE_ACCOUNTANT = 'finance_accountant';
export const MONITORING_CONTROL = 'monitoring_control';
export const CUSTOMER_SERVICE = 'customer_service';
export const MAINTENANCE_WORKSHOP = 'maintenance_workshop';
export const EXECUTIVE = 'executive';
export const DRIVER = 'driver';
export const EMPLOYEE = 'employee';

/** The three roles the client can assign right now, in display order. */
export const TOP_LEVEL_ROLES = [SUPER_ADMIN, COMPANY_ADMIN, OPERATIONS_MANAGER] as const;

/**
 * Roles a company admin may hand out. `super_admin` is intentionally absent —
 * only a super admin can create another super admin (enforced by the users UI
 * and by `requireRole(SUPER_ADMIN)` on the platform routes).
 */
export const ASSIGNABLE_ROLES = [COMPANY_ADMIN, OPERATIONS_MANAGER] as const;

/** Roles that still authenticate but are no longer offered in the picker. */
export const HIDDEN_ROLES = [
  FLEET_MANAGER,
  HR_MANAGER,
  FINANCE_ACCOUNTANT,
  MONITORING_CONTROL,
  CUSTOMER_SERVICE,
  MAINTENANCE_WORKSHOP,
  EXECUTIVE,
  DRIVER,
  EMPLOYEE,
] as const;

/** Every role name that exists in the `roles` table. */
export const ALL_ROLES = [...TOP_LEVEL_ROLES, ...HIDDEN_ROLES] as const;

// ─── Capabilities ───
// Read the arrays as "who may do this today". They are the ONLY place role
// names are listed for authorization purposes.

const ALL_TENANT: string[] = [...TOP_LEVEL_ROLES];
const ALL_TENANT_AND_FLEET: string[] = [...ALL_TENANT, FLEET_MANAGER];

export const CAPABILITIES = {
  // ── Platform (SEUM staff only: tenants, plans, support, health) ──
  platformAdmin: [SUPER_ADMIN],
  /** Subscription plan catalogue is readable by a company admin. */
  planRead: [SUPER_ADMIN, COMPANY_ADMIN],
  /** The company-wide dashboard (HR + finance + fleet KPIs). */
  companyDashboard: [SUPER_ADMIN, COMPANY_ADMIN],

  // ── Company administration ──
  /** Staff accounts: list/update/delete users, register new users. */
  userAdmin: [SUPER_ADMIN, COMPANY_ADMIN],
  auditRead: [SUPER_ADMIN, COMPANY_ADMIN],

  // ── Fleet ──
  fleetRead: ALL_TENANT_AND_FLEET,
  fleetWrite: ALL_TENANT_AND_FLEET,

  // ── Maintenance & workshop ──
  maintenanceRead: ALL_TENANT_AND_FLEET,
  maintenanceWrite: ALL_TENANT_AND_FLEET,

  // ── Operations: routes, trips, recurring trips, assignments, monitoring ──
  operationsRead: [...ALL_TENANT],
  operationsWrite: [...ALL_TENANT],

  // ── Drivers & workforce ──
  /** Driver profiles + their documents/expiry alerts. */
  driverProfileRead: [...ALL_TENANT],
  driverProfileWrite: [...ALL_TENANT],
  /** Driver attendance, leave lists/calendar, violations & scores (read). */
  workforceRead: [...ALL_TENANT_AND_FLEET, HR_MANAGER, MONITORING_CONTROL],
  /** Logging attendance / recording violations from the field. */
  workforceWrite: [...ALL_TENANT_AND_FLEET, MONITORING_CONTROL],
  /** HR decisions: manual attendance corrections, leave approve/reject, score compute. */
  workforceAdmin: [SUPER_ADMIN, COMPANY_ADMIN, HR_MANAGER],
  /** Office-staff leave approvals at the manager stage (ops managers sign off). */
  leaveManagerApprove: [SUPER_ADMIN, COMPANY_ADMIN, HR_MANAGER, OPERATIONS_MANAGER],
  /** A driver may see their own schedule/safety score and answer trip assignments. */
  driverSelfService: [...ALL_TENANT, DRIVER],

  // ── Bookings & customers ──
  bookingsRead: [...ALL_TENANT, CUSTOMER_SERVICE, FINANCE_ACCOUNTANT, EXECUTIVE],
  bookingsWrite: [...ALL_TENANT, CUSTOMER_SERVICE],
  bookingsApprove: [...ALL_TENANT],
  customersRead: [...ALL_TENANT, CUSTOMER_SERVICE, FLEET_MANAGER],
  customersWrite: [...ALL_TENANT, CUSTOMER_SERVICE],
  agentsRead: [...ALL_TENANT, FLEET_MANAGER, CUSTOMER_SERVICE, EXECUTIVE, FINANCE_ACCOUNTANT],

  // ── Live tracking: GPS positions, geofences, speed monitoring ──
  trackingRead: [...ALL_TENANT_AND_FLEET, MONITORING_CONTROL],
  trackingWrite: [...ALL_TENANT_AND_FLEET, MONITORING_CONTROL],

  // ── Communications: company-wide WhatsApp / SMS / email hub ──
  communicationsRead: [
    ...ALL_TENANT,
    CUSTOMER_SERVICE,
    MONITORING_CONTROL,
    FLEET_MANAGER,
    EXECUTIVE,
  ],
  communicationsWrite: [...ALL_TENANT, CUSTOMER_SERVICE],

  // ── Finance (company admin only for now: "all except Finance & HR") ──
  financeRead: [SUPER_ADMIN, COMPANY_ADMIN, FINANCE_ACCOUNTANT, EXECUTIVE],
  financeWrite: [SUPER_ADMIN, COMPANY_ADMIN, FINANCE_ACCOUNTANT],

  // ── Payroll: driver, employee and accounting batches ──
  payrollRead: [SUPER_ADMIN, COMPANY_ADMIN, FINANCE_ACCOUNTANT, HR_MANAGER],
  payrollWrite: [SUPER_ADMIN, COMPANY_ADMIN, FINANCE_ACCOUNTANT, HR_MANAGER],
  /** Driver payroll keeps its previous audience (fleet managers review it). */
  driverPayrollRead: [SUPER_ADMIN, COMPANY_ADMIN, FINANCE_ACCOUNTANT, HR_MANAGER, FLEET_MANAGER],
  driverPayrollWrite: [SUPER_ADMIN, COMPANY_ADMIN, FINANCE_ACCOUNTANT, HR_MANAGER],
  /** A driver may read their own score/violation record, staff the full record. */
  driverRecordsRead: [
    ...ALL_TENANT_AND_FLEET,
    HR_MANAGER,
    MONITORING_CONTROL,
    DRIVER,
  ],

  // ── HR: office staff, contracts, attendance, salaries ──
  hrRead: [SUPER_ADMIN, COMPANY_ADMIN, HR_MANAGER, FINANCE_ACCOUNTANT],
  hrWrite: [SUPER_ADMIN, COMPANY_ADMIN, HR_MANAGER],
  /** An employee may file their own leave request. */
  employeeSelfService: [SUPER_ADMIN, COMPANY_ADMIN, HR_MANAGER, EMPLOYEE],
} satisfies Record<string, string[]>;

export type Capability = keyof typeof CAPABILITIES;

/** Every capability name, useful for tests and UI debugging. */
export const ALL_CAPABILITIES = Object.keys(CAPABILITIES) as Capability[];

/** Roles granted a single capability. */
export function rolesFor(capability: Capability): readonly string[] {
  return CAPABILITIES[capability];
}

/** Does any of these roles grant this capability? */
export function hasCapability(roles: string[] | null | undefined, capability: Capability): boolean {
  if (!roles || roles.length === 0) return false;
  return roles.some((role) => (CAPABILITIES[capability] as readonly string[]).includes(role));
}

/**
 * Union of capabilities granted by ANY of the user's roles.
 * Multi-role users get the union — never just the first role (the web app used
 * to look only at `roles[0]`, which made second roles silently dead).
 */
export function capabilitiesFor(roles: string[] | null | undefined): Capability[] {
  if (!roles || roles.length === 0) return [];
  return ALL_CAPABILITIES.filter((capability) => hasCapability(roles, capability));
}
