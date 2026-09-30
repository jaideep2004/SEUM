"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ToastProvider } from "@/components/Toast";
import { SocketProvider, useSocketEvent } from "@/components/SocketProvider";
import { API_URL } from "@/services/api";
// Sidebar icons live in @/lib/access with the nav config — only the icons the
// shell itself renders are imported here.
import {
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Headphones,
  LogOut,
  Menu,
  Moon,
  Sun,
  X,
} from "lucide-react";
import {
  canAccess,
  homeFor,
  readStoredUser,
  roleLabel,
  storedCapabilities,
  visibleSections,
} from "@/lib/access";
import {
  useLanguage,
  navItemLabel,
  navSectionLabel,
  localizedRoleLabel,
} from "@/lib/i18n";
import { formatDate } from "@/lib/i18n";
import styles from "./layout.module.css";


/**
 * Capabilities for the signed-in user, read from the record the API returned on
 * login. The union across every role the user holds, so a second role is never
 * ignored. The menu, the route guard and the API gates all read the same list.
 */
function getCapabilitiesFromUser(): string[] {
  return storedCapabilities(readStoredUser());
}

/** Human-readable role summary for the profile menu (localized). */
function getRoleLabelFromUser(lang: "en" | "ar"): string {
  const roles = readStoredUser()?.roles ?? [];
  if (lang === "ar") return roles.map((r) => localizedRoleLabel(r, lang)).join("، ") || "مستخدم";
  return roles.map(roleLabel).join(", ") || "User";
}

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

/**
 * Lives inside <SocketProvider>: refreshes the header bell whenever a
 * `notification:new` realtime event arrives for this tenant/user.
 */
function SocketNotifBridge({ onNotification }: { onNotification: () => void }) {
  useSocketEvent("notification:new", onNotification);
  return null;
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
      const res = await fetch(`${API_URL}/notifications/count`, {
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) setNotifCount(data.data.unreadCount);
    } catch {}
  }

  async function fetchNotifications() {
    try {
      const res = await fetch(`${API_URL}/notifications?pageSize=5`, {
        credentials: "include",
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
      await fetch(`${API_URL}/notifications/read-all`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      setNotifCount(0);
      setNotifications([]);
    } catch {}
  }

  async function handleLogout() {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {}
    localStorage.removeItem("seum_user");
    router.push("/login");
  }

  const capabilities = useMemo(() => getCapabilitiesFromUser(), []);
  const sections = useMemo(() => visibleSections(capabilities), [capabilities]);
  const user = useMemo(() => getUserFromStorage(), []);
  const { lang, toggleLang, t } = useLanguage();
  const roleLabel = useMemo(() => getRoleLabelFromUser(lang), [lang]);
  const { theme, toggleTheme } = useTheme();
  const weekRange = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay() + 1);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return `${formatDate(start, lang)} - ${formatDate(end, lang)}`;
  }, [lang]);

  // Belt-and-braces refresh: an admin can change someone's roles while they are
  // signed in, so re-read the capability list once per page load.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/auth/me`, { credentials: "include" });
        const data = await res.json();
        if (cancelled || !data?.success || !data.data) return;
        const fresh = data.data;
        const stored = readStoredUser();
        localStorage.setItem("seum_user", JSON.stringify({ ...stored, ...fresh }));
      } catch {
        /* keep the cached capabilities */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Route guard: a page the user has no capability for sends them to their home.
  useEffect(() => {
    if (capabilities.length === 0) return;
    if (canAccess(capabilities, pathname)) return;
    router.replace(homeFor(capabilities));
  }, [pathname, capabilities, router]);

  const isActive = (href: string) => pathname === href || pathname === href + "/";

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
          {sections.map((section) => (
            <div key={section.key} className={styles.navSection}>
              <span className={styles.navSectionLabel}>{navSectionLabel(section.key, section.label, lang)}</span>
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
                  >
                    <Icon size={18} className={styles.navIcon} />
                    <span className={styles.navLabel}>{navItemLabel(item.href, item.label, lang)}</span>
                    {item.href === "/dashboard/notifications" && notifCount > 0 && (
                      <span className={styles.navBadge}>{notifCount}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
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
                  title={t("shell.closeHelp")}
                >
                  <X size={14} />
                </button>
              </div>
              <p className={styles.supportTitle}>{t("shell.needHelp")}</p>
              <p className={styles.supportDesc}>{t("shell.supportDesc")}</p>
              <button className={styles.supportBtn}>{t("shell.contactSupport")}</button>
            </div>
          </div>
        )}
        {!supportOpen && (
          <button
            className={styles.supportReopen}
            onClick={() => setSupportOpen(true)}
            title={t("shell.showHelp")}
          >
            <Headphones size={16} />
            <span>{t("shell.needHelp")}</span>
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
            title={sidebarOpen ? t("shell.collapseSidebar") : t("shell.expandSidebar")}
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
            <button className={styles.menuBtn} onClick={() => setSidebarOpen(!sidebarOpen)} title={t("shell.menu")} aria-label={t("shell.menu")}>
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div className={styles.headerDateRange}>
              <span>{weekRange}</span>
            </div>
          </div>
          <div className={styles.headerRight}>
            <button
              className={styles.langBtn}
              onClick={toggleLang}
              title={lang === "en" ? t("shell.switchToArabic") : t("shell.switchToEnglish")}
            >
              {lang === "en" ? "عربي" : "EN"}
            </button>
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
                    <span className={styles.notifDropdownTitle}>{t("shell.notifications")}</span>
                    <button className={styles.notifMarkRead} onClick={handleMarkAllRead}>{t("shell.markAllRead")}</button>
                  </div>
                  {notifications.length === 0 ? (
                    <div className={styles.notifEmpty}>{t("shell.noNewNotifications")}</div>
                  ) : (
                    notifications.map((n: any) => (
                      <div key={n.id} className={`${styles.notifItem} ${!n.is_read ? styles.notifUnread : ''}`}>
                        <div className={styles.notifItemTitle}>{n.title}</div>
                        <div className={styles.notifItemMsg}>{n.message}</div>
                        <div className={styles.notifItemTime}>{new Date(n.created_at).toLocaleDateString()}</div>
                      </div>
                    ))
                  )}
                  <Link href="/dashboard/notifications" className={styles.notifViewAll} onClick={() => setNotifOpen(false)}>
                    {t("shell.openNotificationCenter")}
                  </Link>
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
                    {t("shell.signOut")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className={styles.content}>
          <ErrorBoundary>
            <ToastProvider>
              <SocketProvider>
                <SocketNotifBridge
                  onNotification={() => {
                    fetchNotifCount();
                    fetchNotifications();
                  }}
                />
                {children}
              </SocketProvider>
            </ToastProvider>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
