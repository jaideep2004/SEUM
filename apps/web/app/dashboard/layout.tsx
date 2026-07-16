"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ToastProvider } from "@/components/Toast";
import { API_URL } from "@/services/api";
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Package,
  Puzzle,
  Users,
  LifeBuoy,
  HeartPulse,
  Plug,
  BarChart3,
  Settings,
  ChevronDown,
  Bell,
  Search,
  LogOut,
  Menu,
  X,
  Route,
  Bus,
  Truck,
  Wallet,
  Briefcase,
  Radio,
  Map,
  Calendar,
  FileText,
  AlertTriangle,
  Headphones,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  ClipboardList,
  CalendarDays,
  Navigation,
  Gauge,
  Wrench,
  Fuel,
  MapPin,
  Milestone,
  Repeat,
  CheckCircle2,
  ChevronUp,
  Sun,
  Moon,
} from "lucide-react";
import styles from "./layout.module.css";

type NavItem = { label: string; href: string; icon: any; badge?: number };

const superAdminNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Companies", href: "/dashboard/companies", icon: Building2 },
  { label: "Subscriptions", href: "/dashboard/subscriptions", icon: CreditCard },
  { label: "Plans", href: "/dashboard/plans", icon: Package },
  { label: "Modules", href: "/dashboard/modules", icon: Puzzle },
  { label: "Users", href: "/dashboard/users", icon: Users },
  { label: "Support Tickets", href: "/dashboard/support", icon: Headphones, badge: 5 },
  { label: "System Health", href: "/dashboard/health", icon: HeartPulse },
  { label: "Integrations", href: "/dashboard/integrations", icon: Plug },
  { label: "Audit Logs", href: "/dashboard/audit-logs", icon: ClipboardList },
  { label: "Global Reports", href: "/dashboard/reports", icon: BarChart3 },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

const companyAdminNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard/company", icon: LayoutDashboard },
  { label: "Operations", href: "/dashboard/operations", icon: Route },
  { label: "Fleet", href: "/dashboard/fleet", icon: Truck },
  { label: "Readiness", href: "/dashboard/fleet/readiness", icon: Gauge },
  { label: "Fuel Logs", href: "/dashboard/fleet/fuel", icon: Fuel },
  { label: "Fuel Analytics", href: "/dashboard/fleet/fuel/analytics", icon: BarChart3 },
  { label: "Assignments", href: "/dashboard/fleet/assignments", icon: CalendarDays },
  { label: "Calendar", href: "/dashboard/fleet/assignments/calendar", icon: Calendar },
  { label: "Analytics", href: "/dashboard/fleet/analytics", icon: BarChart3 },
  { label: "HR", href: "/dashboard/hr", icon: Briefcase },
  { label: "Finance", href: "/dashboard/finance", icon: Wallet },
  { label: "Maintenance", href: "/dashboard/maintenance", icon: Wrench },
  { label: "Monitoring", href: "/dashboard/monitoring", icon: Radio },
  { label: "Reports", href: "/dashboard/company/reports", icon: BarChart3 },
  { label: "Settings", href: "/dashboard/company/settings", icon: Settings },
];

const operationsNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard/operations", icon: LayoutDashboard },
  { label: "Bookings", href: "/dashboard/bookings", icon: ClipboardList },
  { label: "Customers", href: "/dashboard/customers", icon: Users },
  { label: "Pilgrim Groups", href: "/dashboard/pilgrim-groups", icon: Users },
  { label: "Trip Planning", href: "/dashboard/trip-planning", icon: CalendarDays },
  { label: "Trips", href: "/dashboard/trips", icon: Route },
  { label: "Recurring Trips", href: "/dashboard/recurring-trips", icon: Repeat },
  { label: "Schedules", href: "/dashboard/schedules", icon: Calendar },
  { label: "Drivers", href: "/dashboard/drivers", icon: UserCheck },
  { label: "Vehicles", href: "/dashboard/fleet", icon: Bus },
  { label: "Routes", href: "/dashboard/routes", icon: Map },
  { label: "Work Orders", href: "/dashboard/work-orders", icon: FileText },
  { label: "Live Trips", href: "/dashboard/live-trips", icon: Navigation },
  { label: "Reports", href: "/dashboard/ops-reports", icon: BarChart3 },
];

const Shield = ({ size = 18, ...props }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const fleetNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard/fleet", icon: LayoutDashboard },
  { label: "Vehicles", href: "/dashboard/fleet/vehicles", icon: Truck, badge: 0 },
  { label: "Documents", href: "/dashboard/fleet/documents", icon: FileText },
  { label: "Insurance", href: "/dashboard/fleet/insurance", icon: Shield },
  { label: "Fuel", href: "/dashboard/fleet/fuel", icon: Fuel },
  { label: "GPS & Tracking", href: "/dashboard/fleet/gps", icon: MapPin },
  { label: "Mileage", href: "/dashboard/fleet/mileage", icon: Milestone },
  { label: "Maintenance", href: "/dashboard/fleet/maintenance", icon: Wrench },
  { label: "Reports", href: "/dashboard/fleet/reports", icon: BarChart3 },
];

const monitoringNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard/monitoring", icon: LayoutDashboard },
  { label: "Live Tracking", href: "/dashboard/live-trips", icon: Navigation },
  { label: "Alerts", href: "/dashboard/alerts", icon: AlertTriangle },
  { label: "Geofencing", href: "/dashboard/geofencing", icon: MapPin },
  { label: "Speed Monitor", href: "/dashboard/speed", icon: Gauge },
  { label: "Reports", href: "/dashboard/monitoring/reports", icon: BarChart3 },
  { label: "Settings", href: "/dashboard/monitoring/settings", icon: Settings },
];

function getRoleFromUser(): string {
  if (typeof window === "undefined") return "company";
  try {
    const stored = localStorage.getItem("seum_user");
    if (!stored) return "company";
    const user = JSON.parse(stored);
    const role = user.roles?.[0];
    const roleMap: Record<string, string> = {
      super_admin: "superadmin",
      company_admin: "company",
      operations_manager: "operations",
      fleet_manager: "fleet",
      monitoring_control: "monitoring",
    };
    return roleMap[role] || "company";
  } catch {
    return "company";
  }
}

function getNavItems(role: string): NavItem[] {
  switch (role) {
    case "superadmin": return superAdminNav;
    case "operations": return operationsNav;
    case "fleet": return fleetNav;
    case "monitoring": return monitoringNav;
    default: return companyAdminNav;
  }
}

const roleLabels: Record<string, string> = {
  superadmin: "Super Admin",
  company: "Company Admin",
  operations: "Operations Manager",
  fleet: "Fleet Manager",
  monitoring: "Monitoring",
};

function getUserFromStorage() {
  if (typeof window === "undefined") return { name: "User", email: "", initials: "U" };
  try {
    const stored = localStorage.getItem("seum_user");
    if (!stored) return { name: "User", email: "", initials: "U" };
    const u = JSON.parse(stored);
    const parts = (u.name || "User").split(" ");
    const initials = parts.map((p: string) => p[0]).join("").toUpperCase().slice(0, 2);
    return { name: u.name, email: u.email, initials };
  } catch {
    return { name: "User", email: "", initials: "U" };
  }
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [supportOpen, setSupportOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  // Fetch notification count
  async function fetchNotifCount() {
    try {
      const token = localStorage.getItem("seum_access_token");
      if (!token) return;
      const res = await fetch(`${API_URL}/notifications/count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setNotifCount(data.data.unreadCount);
    } catch {}
  }

  async function fetchNotifications() {
    try {
      const token = localStorage.getItem("seum_access_token");
      if (!token) return;
      const res = await fetch(`${API_URL}/notifications?pageSize=5`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setNotifications(data.data);
    } catch {}
  }

  useEffect(() => {
    fetchNotifCount();
    fetchNotifications();
    const interval = setInterval(fetchNotifCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleMarkAllRead() {
    try {
      const token = localStorage.getItem("seum_access_token");
      await fetch(`${API_URL}/notifications/read-all`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      setNotifCount(0);
      setNotifications([]);
    } catch {}
  }

  function handleLogout() {
    localStorage.removeItem("seum_access_token");
    localStorage.removeItem("seum_refresh_token");
    localStorage.removeItem("seum_user");
    router.push("/login");
  }

  const role = useMemo(() => getRoleFromUser(), []);
  const navItems = useMemo(() => getNavItems(role), [role]);
  const user = useMemo(() => getUserFromStorage(), []);
  const roleLabel = roleLabels[role] || "User";
  const { theme, toggleTheme } = useTheme();

  const isActive = (href: string) => pathname === href || pathname === href + "/";

  const completedPages = new Set([
    "/dashboard/companies", "/dashboard/plans", "/dashboard/audit-logs",
    "/dashboard/fleet", "/dashboard/fleet/vehicles", "/dashboard/fleet/documents",
    "/dashboard/fleet/readiness", "/dashboard/fleet/fuel",
    "/dashboard/fleet/fuel/analytics", "/dashboard/fleet/assignments",
    "/dashboard/fleet/assignments/calendar", "/dashboard/fleet/analytics",
    "/dashboard/routes", "/dashboard/trips", "/dashboard/recurring-trips",
    "/dashboard/users",
  ]);

  return (
    <div className={styles.layout}>
      {/* ─── Sidebar ─── */}
      <aside className={`${styles.sidebar} ${!sidebarOpen ? styles.sidebarCollapsed : ""}`}>
        {/* Logo */}
        <div className={styles.sidebarLogo}>
          <div className={styles.logoIcon}>
            <svg width="22" height="22" viewBox="0 0 28 28" fill="none" aria-hidden="true">
              <rect width="28" height="28" rx="6" fill="currentColor" />
              <path d="M8 16L12 8L16 16H8Z" fill="#0b1428" />
              <path d="M14 20L18 12L22 20H14Z" fill="#0b1428" />
            </svg>
          </div>
          <span className={styles.logoText}>SEUM</span>
        </div>

        {/* Company Switcher */}
        <button className={styles.companySwitcher}>
          <div className={styles.companyAvatar}>
            <svg width="16" height="16" viewBox="0 0 28 28" fill="none" aria-hidden="true">
              <rect width="28" height="28" rx="6" fill="currentColor" opacity={0.3} />
              <path d="M8 16L12 8L16 16H8Z" fill="currentColor" />
              <path d="M14 20L18 12L22 20H14Z" fill="currentColor" />
            </svg>
          </div>
          <div className={styles.companyInfo}>
            <span className={styles.companyName}>SEUM TECHNOLOGY</span>
          </div>
          <ChevronDown size={14} className={styles.chevron} />
        </button>

        {/* Navigation */}
        <nav className={styles.sidebarNav}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
              >
                <Icon size={18} className={styles.navIcon} />
                <span className={styles.navLabel}>{item.label}</span>
                {completedPages.has(item.href) && (
                  <CheckCircle2 size={12} className={styles.navCheck} />
                )}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={styles.navBadge}>{item.badge}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Support Section */}
        {supportOpen && (
          <div className={styles.sidebarSupport}>
            <div className={styles.supportCard}>
              <div className={styles.supportHeader}>
                <Headphones size={20} style={{ color: "var(--color-primary)" }} />
                <button
                  className={styles.supportClose}
                  onClick={() => setSupportOpen(false)}
                  title="Close"
                >
                  <X size={14} />
                </button>
              </div>
              <p className={styles.supportTitle}>Need Help?</p>
              <p className={styles.supportDesc}>Contact our support team for assistance</p>
              <button className={styles.supportBtn}>Contact Support</button>
            </div>
          </div>
        )}
        {!supportOpen && (
          <button
            className={styles.supportReopen}
            onClick={() => setSupportOpen(true)}
            title="Show help"
          >
            <Headphones size={16} />
            <span>Need Help?</span>
          </button>
        )}

        {/* User Profile */}
        <div className={styles.sidebarUser}>
          <div className={styles.userAvatar}>
            <span>{user.initials}</span>
          </div>
          <div className={styles.userDetails}>
            <span className={styles.userName}>{user.name}</span>
            <span className={styles.userRole}>{roleLabel}</span>
          </div>
          <button
            className={styles.collapseBtn}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>
      </aside>

      {/* ─── Main Area ─── */}
      <div className={styles.mainArea}>
        {/* Top Header */}
        <header className={styles.topHeader}>
          <div className={styles.headerLeft}>
            <button className={styles.menuBtn} onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div className={styles.headerDateRange}>
              <span>May 12 - May 18, 2025</span>
            </div>
          </div>
          <div className={styles.headerRight}>
            <button className={styles.langBtn}>EN</button>
            <button className={styles.headerIconBtn} aria-label="Toggle theme" onClick={toggleTheme}>
              {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            <div className={styles.notifWrapper} ref={notifRef}>
              <button className={styles.headerIconBtn} aria-label="Notifications" onClick={() => { fetchNotifications(); setNotifOpen(!notifOpen); }}>
                <Bell size={18} />
                {notifCount > 0 && <span className={styles.notifDot}><span className={styles.notifCount}>{notifCount > 9 ? '9+' : notifCount}</span></span>}
              </button>
              {notifOpen && (
                <div className={styles.notifDropdown}>
                  <div className={styles.notifDropdownHeader}>
                    <span className={styles.notifDropdownTitle}>Notifications</span>
                    <button className={styles.notifMarkRead} onClick={handleMarkAllRead}>Mark all read</button>
                  </div>
                  {notifications.length === 0 ? (
                    <div className={styles.notifEmpty}>No new notifications</div>
                  ) : (
                    notifications.map((n: any) => (
                      <div key={n.id} className={`${styles.notifItem} ${!n.is_read ? styles.notifUnread : ''}`}>
                        <div className={styles.notifItemTitle}>{n.title}</div>
                        <div className={styles.notifItemMsg}>{n.message}</div>
                        <div className={styles.notifItemTime}>{new Date(n.created_at).toLocaleDateString()}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <div className={styles.headerDivider} />
            <div className={styles.profileWrapper} ref={profileRef}>
              <button className={styles.headerProfile} onClick={() => setProfileOpen(!profileOpen)}>
                <div className={styles.headerAvatar}>{user.initials}</div>
                <div className={styles.headerUserInfo}>
                  <span className={styles.headerUserName}>{user.name}</span>
                  <span className={styles.headerUserRole}>{roleLabel}</span>
                </div>
              </button>
              {profileOpen && (
                <div className={styles.profileDropdown}>
                  <div className={styles.dropdownHeader}>
                    <div className={styles.dropdownAvatar}>{user.initials}</div>
                    <div>
                      <div className={styles.dropdownName}>{user.name}</div>
                      <div className={styles.dropdownEmail}>{user.email}</div>
                    </div>
                  </div>
                  <div className={styles.dropdownDivider} />
                  <button className={styles.dropdownItem} onClick={handleLogout}>
                    <LogOut size={15} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className={styles.content}>
          <ErrorBoundary>
            <ToastProvider>{children}</ToastProvider>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
