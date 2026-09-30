import { describe, expect, it } from "vitest";
import {
  ASSIGNABLE_ROLES,
  NAV_SECTIONS,
  canAccess,
  homeFor,
  roleLabel,
  visibleSections,
} from "../access";

/**
 * The three roles the client uses today. These capability lists mirror what
 * `backend/src/auth/roles.ts` grants (see `capabilities.test.ts` on the API),
 * so the menu and the API gates are verified against the same expectations.
 */
const COMPANY_ADMIN = [
  "planRead",
  "companyDashboard",
  "userAdmin",
  "auditRead",
  "fleetRead",
  "fleetWrite",
  "maintenanceRead",
  "maintenanceWrite",
  "operationsRead",
  "operationsWrite",
  "driverProfileRead",
  "driverProfileWrite",
  "workforceRead",
  "driverSelfService",
  "bookingsRead",
  "bookingsWrite",
  "customersRead",
  "customersWrite",
  "trackingRead",
  "trackingWrite",
  "communicationsRead",
  "communicationsWrite",
  "financeRead",
  "financeWrite",
  "payrollRead",
  "payrollWrite",
  "hrRead",
  "hrWrite",
];

const OPERATIONS_MANAGER = [
  "fleetRead",
  "fleetWrite",
  "maintenanceRead",
  "maintenanceWrite",
  "operationsRead",
  "operationsWrite",
  "driverProfileRead",
  "driverProfileWrite",
  "workforceRead",
  "workforceWrite",
  "driverSelfService",
  "bookingsRead",
  "bookingsWrite",
  "bookingsApprove",
  "customersRead",
  "customersWrite",
  "trackingRead",
  "trackingWrite",
  "communicationsRead",
  "communicationsWrite",
];

const SUPER_ADMIN = [...COMPANY_ADMIN, "platformAdmin"];
const DRIVER = ["driverSelfService", "driverRecordsRead"];

const labels = (caps: string[]) =>
  visibleSections(caps).flatMap((section) => section.items.map((i) => i.label));

describe("visibleSections", () => {
  it("gives company admin the Finance and HR sections", () => {
    const keys = visibleSections(COMPANY_ADMIN).map((s) => s.key);
    expect(keys).toContain("finance");
    expect(keys).toContain("hr");
    expect(keys).toContain("fleet");
    expect(keys).toContain("tracking");
  });

  it("gives operations manager everything except Finance and HR", () => {
    const keys = visibleSections(OPERATIONS_MANAGER).map((s) => s.key);
    expect(keys).toEqual(
      expect.arrayContaining(["overview", "operations", "fleet", "tracking", "bookings", "workforce"])
    );
    expect(keys).not.toContain("finance");
    expect(keys).not.toContain("hr");
    expect(keys).not.toContain("platform");
  });

  it("still gives operations manager the fleet dashboard pages the client asked for", () => {
    const items = labels(OPERATIONS_MANAGER);
    expect(items).toEqual(
      expect.arrayContaining([
        "Fleet",
        "Vehicles",
        "Documents",
        "Readiness",
        "Fuel Logs",
        "Assignments",
        "Maintenance",
        "Breakdowns",
        "Spare Parts",
        "Cost Tracking",
        "Trips",
        "Routes",
        "Bookings",
        "Customers",
        "Live Trips",
        "Geofencing",
        "Speed Monitor",
        "Drivers",
      ])
    );
  });

  it("keeps finance screens away from operations manager", () => {
    const items = labels(OPERATIONS_MANAGER);
    expect(items).not.toEqual(
      expect.arrayContaining(["Invoices", "Journal Entries", "Expenses", "Bank Accounts", "Chart of Accounts"])
    );
    expect(items).not.toEqual(
      expect.arrayContaining(["Employees", "HR Payroll", "HR Leaves", "Driver Payroll"])
    );
  });

  it("gives super admin the platform section only it can use", () => {
    const sections = visibleSections(SUPER_ADMIN);
    expect(sections.map((s) => s.key)).toContain("platform");
    const platform = sections.find((s) => s.key === "platform")!;
    expect(platform.items.map((i) => i.label)).toEqual(
      expect.arrayContaining(["Companies", "Subscriptions", "Plans", "Archived"])
    );
  });

  it("gives a driver only their schedule and notifications", () => {
    const items = labels(DRIVER);
    expect(items).toEqual(expect.arrayContaining(["Schedules", "Notifications"]));
    expect(items).not.toContain("Trips");
    expect(items).not.toContain("Fleet");
  });

  it("never shows a user two links to the same page", () => {
    for (const caps of [SUPER_ADMIN, COMPANY_ADMIN, OPERATIONS_MANAGER, DRIVER]) {
      const hrefs = visibleSections(caps).flatMap((s) => s.items.map((i) => i.href));
      expect(new Set(hrefs).size).toBe(hrefs.length);
    }
  });

  it("hides pages that are still placeholders but can reveal them on request", () => {
    expect(labels(SUPER_ADMIN)).not.toContain("System Health");
    const withUnready = visibleSections(SUPER_ADMIN, { includeUnready: true }).flatMap((s) =>
      s.items.map((i) => i.label)
    );
    expect(withUnready).toContain("System Health");
  });

  it("has no duplicate hrefs in the config itself", () => {
    const hrefs = NAV_SECTIONS.flatMap((s) => s.items.map((i) => i.href));
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});

describe("canAccess", () => {
  it("allows operations manager into fleet and trips", () => {
    expect(canAccess(OPERATIONS_MANAGER, "/dashboard/fleet/vehicles")).toBe(true);
    expect(canAccess(OPERATIONS_MANAGER, "/dashboard/trips/new")).toBe(true);
    expect(canAccess(OPERATIONS_MANAGER, "/dashboard/maintenance/parts")).toBe(true);
  });

  it("blocks operations manager from finance and HR", () => {
    expect(canAccess(OPERATIONS_MANAGER, "/dashboard/accounting/invoices")).toBe(false);
    expect(canAccess(OPERATIONS_MANAGER, "/dashboard/accounts")).toBe(false);
    expect(canAccess(OPERATIONS_MANAGER, "/dashboard/hr/employees")).toBe(false);
    expect(canAccess(OPERATIONS_MANAGER, "/dashboard/companies")).toBe(false);
  });

  it("allows company admin everywhere on the tenant side", () => {
    expect(canAccess(COMPANY_ADMIN, "/dashboard/accounting/invoices")).toBe(true);
    expect(canAccess(COMPANY_ADMIN, "/dashboard/hr/employees")).toBe(true);
    expect(canAccess(COMPANY_ADMIN, "/dashboard/fleet/vehicles/abc-123")).toBe(true);
  });

  it("keeps platform pages for super admin", () => {
    expect(canAccess(COMPANY_ADMIN, "/dashboard/companies")).toBe(false);
    expect(canAccess(SUPER_ADMIN, "/dashboard/companies")).toBe(true);
  });

  it("lets a driver open their schedule but nothing else", () => {
    expect(canAccess(DRIVER, "/dashboard/schedules")).toBe(true);
    expect(canAccess(DRIVER, "/dashboard/notifications/preferences")).toBe(true);
    expect(canAccess(DRIVER, "/dashboard/fleet")).toBe(false);
  });

  it("denies everything when there are no capabilities", () => {
    expect(canAccess([], "/dashboard/fleet")).toBe(false);
    expect(canAccess(null, "/dashboard/fleet")).toBe(false);
  });
});

describe("homeFor", () => {
  it("sends each role to its own dashboard", () => {
    expect(homeFor(SUPER_ADMIN)).toBe("/dashboard");
    expect(homeFor(COMPANY_ADMIN)).toBe("/dashboard/company");
    expect(homeFor(OPERATIONS_MANAGER)).toBe("/dashboard/operations");
    expect(homeFor(DRIVER)).toBe("/dashboard/schedules");
  });

  it("falls back to notifications for a capability-less account", () => {
    expect(homeFor([])).toBe("/dashboard/notifications");
  });
});

describe("role picker", () => {
  it("offers exactly company admin and operations manager", () => {
    expect([...ASSIGNABLE_ROLES]).toEqual(["company_admin", "operations_manager"]);
  });

  it("still labels legacy roles so existing users render", () => {
    expect(roleLabel("fleet_manager")).toBe("Fleet Manager");
    expect(roleLabel("driver")).toBe("Driver");
    expect(roleLabel("mystery_role")).toBe("mystery_role");
  });
});
