"use client";

import type { LucideIcon } from "lucide-react";
import {
  Archive,
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpen,
  Briefcase,
  Building2,
  Bus,
  Calendar,
  CalendarDays,
  ClipboardList,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  Fuel,
  Gauge,
  LayoutDashboard,
  Map,
  MapPin,
  MessageSquare,
  Navigation,
  Package,
  Radio,
  Receipt,
  Repeat,
  Route,
  Settings,
  Truck,
  UserCheck,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";

/**
 * Capability-driven navigation — the web half of the access switchboard.
 *
 * Nothing here lists roles. The sidebar is derived from the `capabilities`
 * array the API returns on login / `/auth/me`, which comes from
 * `backend/src/auth/roles.ts`. That means the menu and the API gates can never
 * drift apart again, and the client's decision to offer only three roles
 * (super_admin · company_admin · operations_manager) is expressed in exactly
 * one place (the backend capability map).
 */

/** Capability names come from the backend switchboard (`backend/src/auth/roles.ts`). */
export type Capability = string;

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /**
   * Capability required to see this item. `null` means every authenticated
   * user (personal pages such as notifications).
   */
  capability: Capability | null;
  /**
   * `false` marks a page that is still a placeholder. Such items are kept in
   * this file for the future but are NOT rendered — the client's main complaint
   * was a menu full of dead screens.
   */
  ready?: boolean;
}

export interface NavSection {
  key: string;
  label: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    key: "overview",
    label: "Overview",
    items: [
      { label: "Platform Dashboard", href: "/dashboard", icon: LayoutDashboard, capability: "platformAdmin" },
      { label: "Dashboard", href: "/dashboard/company", icon: LayoutDashboard, capability: "companyDashboard" },
      { label: "Operations Dashboard", href: "/dashboard/operations", icon: LayoutDashboard, capability: "operationsRead" },
    ],
  },
  {
    key: "platform",
    label: "Platform",
    items: [
      { label: "Companies", href: "/dashboard/companies", icon: Building2, capability: "platformAdmin" },
      { label: "Subscriptions", href: "/dashboard/subscriptions", icon: CreditCard, capability: "platformAdmin" },
      { label: "Plans", href: "/dashboard/plans", icon: Package, capability: "planRead" },
      { label: "Archived", href: "/dashboard/archived", icon: Archive, capability: "platformAdmin" },
      // Placeholders — kept out of the sidebar until they are built.
      { label: "Modules", href: "/dashboard/modules", icon: Package, capability: "platformAdmin", ready: false },
      { label: "Support Tickets", href: "/dashboard/support", icon: Bell, capability: "platformAdmin", ready: false },
      { label: "System Health", href: "/dashboard/health", icon: BarChart3, capability: "platformAdmin", ready: false },
      { label: "Integrations", href: "/dashboard/integrations", icon: Settings, capability: "platformAdmin", ready: false },
      { label: "Global Reports", href: "/dashboard/reports", icon: BarChart3, capability: "platformAdmin", ready: false },
    ],
  },
  {
    key: "operations",
    label: "Operations",
    items: [
      { label: "Trips", href: "/dashboard/trips", icon: Route, capability: "operationsRead" },
      { label: "Trip Calendar", href: "/dashboard/trips/calendar", icon: Calendar, capability: "operationsRead" },
      { label: "Trip Reports", href: "/dashboard/trips/reports", icon: BarChart3, capability: "operationsRead" },
      { label: "Recurring Trips", href: "/dashboard/recurring-trips", icon: Repeat, capability: "operationsRead" },
      // Driver self-service shares this page: ops/company plan the schedule, a
      // driver opens their own (hence driverSelfService rather than operationsRead).
      { label: "Schedules", href: "/dashboard/schedules", icon: CalendarDays, capability: "driverSelfService" },
      { label: "Routes", href: "/dashboard/routes", icon: Map, capability: "operationsRead" },
      { label: "Monitoring", href: "/dashboard/monitoring", icon: Radio, capability: "operationsRead" },
      { label: "Delays", href: "/dashboard/delays", icon: AlertTriangle, capability: "operationsRead" },
      // Placeholders
      { label: "Trip Planning", href: "/dashboard/trip-planning", icon: CalendarDays, capability: "operationsRead", ready: false },
      { label: "Pilgrim Groups", href: "/dashboard/pilgrim-groups", icon: Users, capability: "operationsRead", ready: false },
      { label: "Operations Reports", href: "/dashboard/ops-reports", icon: BarChart3, capability: "operationsRead", ready: false },
    ],
  },
  {
    key: "fleet",
    label: "Fleet & Maintenance",
    items: [
      { label: "Fleet", href: "/dashboard/fleet", icon: Truck, capability: "fleetRead" },
      { label: "Vehicles", href: "/dashboard/fleet/vehicles", icon: Bus, capability: "fleetRead" },
      { label: "Documents", href: "/dashboard/fleet/documents", icon: FileText, capability: "fleetRead" },
      { label: "Readiness", href: "/dashboard/fleet/readiness", icon: Gauge, capability: "fleetRead" },
      { label: "Fuel Logs", href: "/dashboard/fleet/fuel", icon: Fuel, capability: "fleetRead" },
      { label: "Fuel Analytics", href: "/dashboard/fleet/fuel/analytics", icon: BarChart3, capability: "fleetRead" },
      { label: "Assignments", href: "/dashboard/fleet/assignments", icon: CalendarDays, capability: "fleetRead" },
      { label: "Assignment Calendar", href: "/dashboard/fleet/assignments/calendar", icon: Calendar, capability: "fleetRead" },
      { label: "Fleet Analytics", href: "/dashboard/fleet/analytics", icon: BarChart3, capability: "fleetRead" },
      { label: "Maintenance", href: "/dashboard/maintenance", icon: Wrench, capability: "maintenanceRead" },
      { label: "Breakdowns", href: "/dashboard/maintenance/breakdowns", icon: AlertTriangle, capability: "maintenanceRead" },
      { label: "Spare Parts", href: "/dashboard/maintenance/parts", icon: Package, capability: "maintenanceRead" },
      { label: "Workshops", href: "/dashboard/maintenance/workshops", icon: Wrench, capability: "maintenanceRead" },
      { label: "Cost Tracking", href: "/dashboard/maintenance/costs", icon: DollarSign, capability: "maintenanceRead" },
      // Placeholders
      { label: "Work Orders", href: "/dashboard/work-orders", icon: FileText, capability: "maintenanceRead", ready: false },
      { label: "Insurance", href: "/dashboard/fleet/insurance", icon: FileText, capability: "fleetRead", ready: false },
      { label: "Mileage", href: "/dashboard/fleet/mileage", icon: Gauge, capability: "fleetRead", ready: false },
      { label: "Fleet Reports", href: "/dashboard/fleet/reports", icon: BarChart3, capability: "fleetRead", ready: false },
    ],
  },
  {
    key: "tracking",
    label: "Live Tracking",
    items: [
      { label: "Live Trips", href: "/dashboard/live-trips", icon: Navigation, capability: "trackingRead" },
      { label: "Geofencing", href: "/dashboard/geofencing", icon: MapPin, capability: "trackingRead" },
      { label: "Speed Monitor", href: "/dashboard/speed", icon: Gauge, capability: "trackingRead" },
      { label: "Alerts", href: "/dashboard/alerts", icon: AlertTriangle, capability: "trackingRead", ready: false },
    ],
  },
  {
    key: "bookings",
    label: "Bookings & Customers",
    items: [
      { label: "Booking Dashboard", href: "/dashboard/bookings/dashboard", icon: LayoutDashboard, capability: "bookingsRead" },
      { label: "Bookings", href: "/dashboard/bookings", icon: ClipboardList, capability: "bookingsRead" },
      { label: "New Booking", href: "/dashboard/bookings/new", icon: ClipboardList, capability: "bookingsWrite" },
      { label: "Import Bookings", href: "/dashboard/bookings/import", icon: FileText, capability: "bookingsWrite" },
      { label: "Waitlist", href: "/dashboard/bookings/waitlist", icon: CalendarDays, capability: "bookingsRead" },
      { label: "Customers", href: "/dashboard/customers", icon: Users, capability: "customersRead" },
    ],
  },
  {
    key: "workforce",
    label: "Drivers & Workforce",
    items: [
      { label: "Drivers", href: "/dashboard/drivers", icon: UserCheck, capability: "driverProfileRead" },
      { label: "Driver Attendance", href: "/dashboard/drivers/attendance", icon: Clock, capability: "workforceRead" },
      { label: "Driver Leaves", href: "/dashboard/drivers/leaves", icon: CalendarDays, capability: "workforceRead" },
      { label: "Driver Violations", href: "/dashboard/drivers/violations", icon: AlertTriangle, capability: "workforceRead" },
      { label: "Driver Scores", href: "/dashboard/drivers/scores", icon: BarChart3, capability: "workforceRead" },
      { label: "Driver Payroll", href: "/dashboard/drivers/payroll", icon: DollarSign, capability: "payrollRead" },
    ],
  },
  {
    key: "hr",
    label: "HR",
    items: [
      { label: "Employees", href: "/dashboard/hr/employees", icon: Briefcase, capability: "hrRead" },
      { label: "HR Attendance", href: "/dashboard/hr/attendance", icon: Clock, capability: "hrRead" },
      { label: "HR Payroll", href: "/dashboard/hr/payroll", icon: DollarSign, capability: "payrollRead" },
      { label: "HR Leaves", href: "/dashboard/hr/leaves", icon: CalendarDays, capability: "hrRead" },
      { label: "HR Overview", href: "/dashboard/hr", icon: Briefcase, capability: "hrRead", ready: false },
    ],
  },
  {
    key: "finance",
    label: "Finance",
    items: [
      { label: "Finance Overview", href: "/dashboard/finance", icon: Wallet, capability: "financeRead", ready: false },
      { label: "Chart of Accounts", href: "/dashboard/accounts", icon: BookOpen, capability: "financeRead" },
      { label: "Journal Entries", href: "/dashboard/accounting/journal-entries", icon: FileText, capability: "financeRead" },
      { label: "Invoices", href: "/dashboard/accounting/invoices", icon: Receipt, capability: "financeRead" },
      { label: "Expenses", href: "/dashboard/accounting/expenses", icon: Wallet, capability: "financeRead" },
      { label: "Trip Profitability", href: "/dashboard/accounting/trip-profitability", icon: BarChart3, capability: "financeRead" },
      { label: "Financial Reports", href: "/dashboard/accounting/reports", icon: BarChart3, capability: "financeRead" },
      { label: "Payroll Batches", href: "/dashboard/accounting/payroll", icon: DollarSign, capability: "payrollRead" },
      { label: "Bank Accounts", href: "/dashboard/accounting/bank-accounts", icon: Wallet, capability: "financeRead" },
    ],
  },
  {
    key: "company",
    label: "Company",
    items: [
      { label: "Users", href: "/dashboard/users", icon: Users, capability: "userAdmin" },
      { label: "Communications", href: "/dashboard/communications", icon: MessageSquare, capability: "communicationsRead" },
      { label: "Audit Logs", href: "/dashboard/audit-logs", icon: ClipboardList, capability: "auditRead" },
      // Placeholders
      { label: "Company Reports", href: "/dashboard/company/reports", icon: BarChart3, capability: "companyDashboard", ready: false },
      { label: "Settings", href: "/dashboard/company/settings", icon: Settings, capability: "companyDashboard", ready: false },
      { label: "Platform Settings", href: "/dashboard/settings", icon: Settings, capability: "platformAdmin", ready: false },
    ],
  },
  {
    key: "account",
    label: "Account",
    items: [
      { label: "Notifications", href: "/dashboard/notifications", icon: Bell, capability: null },
    ],
  },
];

/** Roles the client can assign today — mirrors `ASSIGNABLE_ROLES` on the API. */
export const ASSIGNABLE_ROLES = ["company_admin", "operations_manager"] as const;
export const SUPER_ADMIN_ROLE = "super_admin";

/** Display labels for every role that can appear on a user record. */
export const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  company_admin: "Company Admin",
  operations_manager: "Operations Manager",
  fleet_manager: "Fleet Manager",
  hr_manager: "HR Manager",
  finance_accountant: "Finance Accountant",
  monitoring_control: "Monitoring",
  customer_service: "Customer Service",
  maintenance_workshop: "Maintenance",
  executive: "Executive",
  driver: "Driver",
  employee: "Employee",
};

export const ROLE_COLORS: Record<string, string> = {
  super_admin: "#ef4444",
  company_admin: "#f59e0b",
  operations_manager: "#3b82f6",
  fleet_manager: "#10b981",
  hr_manager: "#ec4899",
  finance_accountant: "#14b8a6",
  monitoring_control: "#8b5cf6",
  customer_service: "#f97316",
  maintenance_workshop: "#6b7280",
  executive: "#6366f1",
  driver: "#06b6d4",
  employee: "#0ea5e9",
};

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] || role;
}

/** Does any of these capabilities satisfy the item's requirement? */
function itemAllowed(item: NavItem, capabilities: string[]): boolean {
  if (item.capability === null) return true;
  return capabilities.includes(item.capability);
}

/**
 * Sections the given user may see, with unready pages removed and duplicate
 * links collapsed (one page never appears twice in the menu).
 */
export function visibleSections(
  capabilities: string[] | null | undefined,
  options: { includeUnready?: boolean } = {}
): NavSection[] {
  const caps = capabilities ?? [];
  const seen = new Set<string>();
  const sections: NavSection[] = [];

  for (const section of NAV_SECTIONS) {
    const items = section.items.filter((item) => {
      if (!options.includeUnready && item.ready === false) return false;
      if (!itemAllowed(item, caps)) return false;
      if (seen.has(item.href)) return false;
      seen.add(item.href);
      return true;
    });
    if (items.length > 0) sections.push({ ...section, items });
  }

  return sections;
}

/** Every href the user may open — used by the layout's route guard. */
export function allowedPrefixes(capabilities: string[] | null | undefined): string[] {
  const caps = capabilities ?? [];
  return NAV_SECTIONS.flatMap((section) =>
    section.items
      .filter((item) => itemAllowed(item, caps))
      .map((item) => item.href)
  );
}

/** Can this user open this path? Nested pages match by prefix. */
export function canAccess(capabilities: string[] | null | undefined, pathname: string): boolean {
  return allowedPrefixes(capabilities).some(
    (href) => pathname === href || pathname.startsWith(`${href}/`)
  );
}

/**
 * Where a user lands after login (and where the guard sends them if they try
 * to open a page they cannot see). Ordered from most to least privileged.
 */
export const HOME_BY_CAPABILITY: { capability: Capability; href: string }[] = [
  { capability: "platformAdmin", href: "/dashboard" },
  { capability: "companyDashboard", href: "/dashboard/company" },
  { capability: "operationsRead", href: "/dashboard/operations" },
  { capability: "trackingRead", href: "/dashboard/monitoring" },
  { capability: "maintenanceRead", href: "/dashboard/maintenance" },
  { capability: "fleetRead", href: "/dashboard/fleet" },
  { capability: "bookingsRead", href: "/dashboard/bookings" },
  { capability: "driverProfileRead", href: "/dashboard/drivers" },
  { capability: "hrRead", href: "/dashboard/hr/employees" },
  { capability: "financeRead", href: "/dashboard/accounts" },
  { capability: "driverSelfService", href: "/dashboard/schedules" },
];

export function homeFor(capabilities: string[] | null | undefined): string {
  const caps = capabilities ?? [];
  const match = HOME_BY_CAPABILITY.find((entry) => caps.includes(entry.capability));
  return match ? match.href : "/dashboard/notifications";
}

/**
 * Read the signed-in user (and their capabilities) from local storage.
 * Capabilities are the union across all of the user's roles — a second role is
 * never silently ignored, and legacy roles keep working because the API still
 * grants them the same capabilities as before.
 */
export interface StoredUser {
  id?: string;
  name?: string;
  email?: string;
  roles?: string[];
  capabilities?: string[];
  tenantName?: string;
}

export function readStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("seum_user");
    if (!raw) return null;
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export function storedCapabilities(user: StoredUser | null): string[] {
  return user?.capabilities ?? [];
}
