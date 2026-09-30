"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Users,
  Activity,
  ChevronRight,
  CheckCircle2,
  Bus,
  CalendarClock,
  ShieldCheck,
  BarChart3,
} from "lucide-react";
import DonutChart from "@/components/dashboard/DonutChart";
import Sparkline from "@/components/dashboard/Sparkline";
import { api } from "@/services/api";
import { useLanguage, formatDate, formatNumber, formatCurrency, localeOf } from "@/lib/i18n";
import styles from "./page.module.css";

interface Tenant {
  id: string;
  name: string;
  subscriptionTier: string | null;
  billingCycle: string | null;
  isActive: boolean;
  createdAt: string;
}

interface AuditRow {
  id: string;
  action: string;
  resource: string;
  actorName: string | null;
  createdAt: string;
}

interface Plan {
  id: string;
  name: string;
  tier: string;
  maxUsers: number;
  maxVehicles: number;
  priceMonthly: number;
}

const ROLE_LABELS: { role: string; key: string }[] = [
  { role: "company_admin", key: "home.platform.roleCompanyAdmin" },
  { role: "operations_manager", key: "home.platform.roleOperations" },
  { role: "fleet_manager", key: "home.platform.roleFleet" },
  { role: "hr_manager", key: "home.platform.roleHr" },
  { role: "finance_accountant", key: "home.platform.roleFinance" },
  { role: "driver", key: "home.platform.roleDriver" },
];

const dateOnly = (iso: string) => iso?.slice(0, 10) ?? "";

export default function SuperAdminDashboard() {
  const { lang, t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [roleCounts, setRoleCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [tenantsRes, usersRes, auditRes, plansRes] = await Promise.all([
          api.get<any[]>("/tenants").catch(() => []),
          api.get<any>("/users?page=1&pageSize=1").catch(() => null),
          api.get<any>("/audit-logs?page=1&pageSize=100").catch(() => null),
          api.get<any[]>("/subscription-plans").catch(() => []),
        ]);
        setTenants(tenantsRes || []);
        setUserTotal(usersRes?.meta?.total ?? 0);
        setAudit(auditRes?.data || []);
        setAuditTotal(auditRes?.meta?.total ?? 0);
        setPlans(plansRes || []);

        const counts: Record<string, number> = {};
        await Promise.all(
          ROLE_LABELS.map(async ({ role }) => {
            const r = await api.get<any>(`/users?role=${role}&pageSize=1`).catch(() => null);
            counts[role] = r?.meta?.total ?? 0;
          })
        );
        setRoleCounts(counts);
      } catch (e) {
        console.error("Failed to load platform dashboard", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const activeSubs = tenants.filter((t) => t.isActive).length;
  const signupsByMonth = (() => {
    const now = new Date();
    const months: { key: string; label: string; count: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleString(localeOf(lang), { month: "short" }), count: 0 });
    }
    for (const tn of tenants) {
      const key = dateOnly(tn.createdAt)?.slice(0, 7);
      const bucket = months.find((m) => m.key === key);
      if (bucket) bucket.count++;
    }
    return months;
  })();

  const auditDaily = (() => {
    const days: { date: string; label: string; count: number }[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      days.push({ date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`, label: d.toLocaleString(localeOf(lang), { day: "numeric", month: "short" }), count: 0 });
    }
    for (const a of audit) {
      const day = days.find((d) => d.date === dateOnly(a.createdAt));
      if (day) day.count++;
    }
    return days;
  })();

  const actMax = Math.max(...auditDaily.map((d) => d.count), 1);
  const kpiCards = [
    {
      label: t("home.platform.totalCompanies"),
      value: formatNumber(tenants.length, lang),
      change: `${formatNumber(activeSubs, lang)} ${t("home.platform.activeSuffix")}`,
      trend: "up" as const,
      icon: Building2,
      color: "#2563eb",
      bg: "#eff6ff",
      sparkData: signupsByMonth.map((m) => m.count),
    },
    {
      label: t("home.platform.platformUsers"),
      value: formatNumber(userTotal, lang),
      change: `${t("home.platform.acrossA")}${formatNumber(tenants.length, lang)}${t("home.platform.acrossB")}`,
      trend: "up" as const,
      icon: Users,
      color: "#10b981",
      bg: "#ecfdf5",
      sparkData: auditDaily.map((d) => d.count),
    },
    {
      label: t("home.platform.activeSubs"),
      value: formatNumber(activeSubs, lang),
      change: tenants.length > 0 ? `${Math.round((activeSubs / tenants.length) * 100)}% ${t("home.platform.ofTotal")}` : t("home.platform.noCompaniesYet"),
      trend: "up" as const,
      icon: Activity,
      color: "#6366f1",
      bg: "#eef2ff",
      sparkData: signupsByMonth.map((m) => m.count),
    },
    {
      label: t("home.platform.recentActions"),
      value: formatNumber(auditTotal, lang),
      change: t("home.platform.loggedActivity"),
      trend: "up" as const,
      icon: BarChart3,
      color: "#f59e0b",
      bg: "#fffbeb",
      sparkData: auditDaily.map((d) => d.count),
    },
  ];

  const tierCounts = (() => {
    const map: Record<string, number> = {};
    for (const tenant of tenants) {
      const tier = tenant.subscriptionTier || t("home.platform.unassigned");
      map[tier] = (map[tier] || 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  })();
  const maxTier = Math.max(...tierCounts.map(([, c]) => c), 1);

  const billingCounts = (() => {
    const m = { Monthly: 0, Yearly: 0, "Not Set": 0 };
    for (const tenant of tenants) {
      if (tenant.billingCycle === "monthly") m.Monthly++;
      else if (tenant.billingCycle === "yearly") m.Yearly++;
      else m["Not Set"]++;
    }
    return m;
  })();

  const maxRole = Math.max(...Object.values(roleCounts), 1);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>{t("home.platform.title")}</h1>
          <p className={styles.pageDesc}>{t("home.platform.desc")}</p>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>{t("home.platform.loading")}</div>
      ) : (
        <>
          <div className={styles.kpiGrid4}>
            {kpiCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className={styles.kpiCard}>
                  <div className={styles.kpiTop}>
                    <div className={styles.kpiIconWrap} style={{ background: card.bg, color: card.color }}>
                      <Icon size={20} />
                    </div>
                    <Sparkline data={card.sparkData} width={72} height={28} color={card.color} fillColor={card.color} />
                  </div>
                  <span className={styles.kpiLabel}>{card.label}</span>
                  <span className={styles.kpiValue}>{card.value}</span>
                  <span className={`${styles.kpiChange} ${styles.kpiUp}`}>{card.change}</span>
                </div>
              );
            })}
          </div>

          <div className={styles.grid2Col}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>{t("home.platform.activity")}</h2>
                  <p className={styles.cardSubtext}>{t("home.platform.activitySub")}</p>
                </div>
                <span className={styles.revenueValue}>{formatNumber(auditTotal, lang)}</span>
              </div>
              <div className={styles.lineChartArea}>
                {auditTotal > 0 ? (
                  <svg viewBox="0 0 600 150" className={`${styles.lineChart} lineChartAnimated`}>
                    <defs>
                      <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d={`M ${auditDaily.map((d, i) => `${(i / (auditDaily.length - 1)) * 600} ${140 - (d.count / actMax) * 120}`).join(" L ")}`}
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="chartLine"
                    />
                    <path
                      d={`M ${auditDaily.map((d, i) => `${(i / (auditDaily.length - 1)) * 600} ${140 - (d.count / actMax) * 120}`).join(" L ")} L 600 150 L 0 150 Z`}
                      fill="url(#actGrad)"
                      className="chartFill"
                    />
                    {auditDaily.map((d, i) => (
                      <circle
                        key={i}
                        cx={(i / (auditDaily.length - 1)) * 600}
                        cy={140 - (d.count / actMax) * 120}
                        r="3"
                        fill="white"
                        stroke="#2563eb"
                        strokeWidth="2"
                      />
                    ))}
                  </svg>
                ) : (
                  <div className={styles.cardSubtext} style={{ paddingTop: 56, textAlign: "center" }}>{t("home.platform.noActivity")}</div>
                )}
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>{t("home.platform.subsOverview")}</h2>
              </div>
              <div className={styles.donutCenter}>
                <DonutChart
                  segments={[
                    { label: t("home.platform.activeSeg"), value: activeSubs, color: "#2563eb" },
                    { label: t("home.platform.inactiveSeg"), value: tenants.length - activeSubs, color: "#ef4444" },
                  ].filter((s) => s.value > 0)}
                  size={140}
                  thickness={18}
                  centerValue={formatNumber(tenants.length, lang)}
                  centerLabel={t("home.platform.totalLabel")}
                />
              </div>
              <div className={styles.donutLegend}>
                <div className={styles.legendItem}>
                  <span className={styles.legendDot} style={{ background: "#2563eb" }} />
                  <span className={styles.legendLabel}>{t("home.platform.activeSeg")}</span>
                  <span className={styles.legendValue}>{formatNumber(activeSubs, lang)}</span>
                </div>
                <div className={styles.legendItem}>
                  <span className={styles.legendDot} style={{ background: "#ef4444" }} />
                  <span className={styles.legendLabel}>{t("home.platform.inactiveSeg")}</span>
                  <span className={styles.legendValue}>{formatNumber(tenants.length - activeSubs, lang)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.grid2Col}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>{t("home.platform.recentCompanies")}</h2>
                <span className={styles.cardAction}>{t("home.platform.viewAll")}<ChevronRight size={14} /></span>
              </div>
              <div className={styles.companyList}>
                {tenants.slice(0, 5).map((tn) => (
                  <div key={tn.id} className={styles.companyRow}>
                    <div className={styles.companyAvatar}>
                      <Building2 size={16} />
                    </div>
                    <div className={styles.companyInfo}>
                      <span className={styles.companyName}>{tn.name}</span>
                      <span className={styles.companyMeta}>{tn.subscriptionTier || t("home.platform.noTier")} · {t("home.platform.joinedW")} {formatDate(tn.createdAt, lang)}</span>
                    </div>
                    <span className={`${styles.badge} ${tn.isActive ? styles.badgeSuccess : styles.badgeWarning}`}>
                      {tn.isActive ? t("home.platform.activeSeg") : t("home.platform.inactiveSeg")}
                    </span>
                  </div>
                ))}
                {tenants.length === 0 && (
                  <div className={styles.cardSubtext} style={{ padding: 12 }}>{t("home.platform.noCompaniesReg")}</div>
                )}
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>{t("home.platform.tenantsByPlan")}</h2>
              </div>
              <div className={styles.moduleList}>
                {tierCounts.map(([tier, count]) => (
                  <div key={tier} className={styles.moduleRow}>
                    <span className={styles.moduleName}>{tier}</span>
                    <div className={styles.moduleBarWrap}>
                      <div className={styles.moduleBar} style={{ width: `${(count / maxTier) * 100}%` }} />
                    </div>
                    <span className={styles.moduleValue}>{formatNumber(count, lang)}</span>
                  </div>
                ))}
                {tierCounts.length === 0 && (
                  <div className={styles.cardSubtext} style={{ padding: 12 }}>{t("home.platform.noCompanies")}</div>
                )}
              </div>
            </div>
          </div>

          <div className={styles.grid3Col}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>{t("home.platform.recentActivity")}</h2>
              </div>
              <div className={styles.healthList}>
                {audit.slice(0, 5).map((a) => (
                  <div key={a.id} className={styles.healthRow}>
                    <CheckCircle2 size={16} style={{ color: "#10b981" }} />
                    <span className={styles.healthName}>{a.action} · {a.resource}</span>
                    <span className={styles.healthStatus} style={{ color: "#64748b" }}>{a.actorName || t("admin.audit.system")}</span>
                  </div>
                ))}
                {audit.length === 0 && (
                  <div className={styles.cardSubtext} style={{ padding: 12 }}>{t("home.platform.noActivityYet")}</div>
                )}
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>{t("home.platform.planLimits")}</h2>
              </div>
              <div className={styles.healthList}>
                {plans.map((p) => (
                  <div key={p.id} className={styles.healthRow}>
                    <ShieldCheck size={16} style={{ color: "#6366f1" }} />
                    <span className={styles.healthName}>{p.name}</span>
                    <span className={styles.healthStatus} style={{ color: "#64748b" }}>
                      {formatNumber(p.maxUsers, lang)} {t("home.platform.usersW")} · {formatNumber(p.maxVehicles, lang)} {t("home.platform.busesW")}
                    </span>
                  </div>
                ))}
                {plans.length === 0 && (
                  <div className={styles.cardSubtext} style={{ padding: 12 }}>{t("home.platform.noPlans")}</div>
                )}
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>{t("home.platform.recentSignups")}</h2>
              </div>
              <div className={styles.companyList}>
                {tenants.slice(0, 5).map((tn) => (
                  <div key={tn.id} className={styles.companyRow}>
                    <div className={styles.companyAvatar}>
                      <CalendarClock size={16} />
                    </div>
                    <div className={styles.companyInfo}>
                      <span className={styles.companyName}>{tn.name}</span>
                      <span className={styles.companyMeta}>{tn.billingCycle === "monthly" ? t("home.platform.monthlyBilling") : tn.billingCycle === "yearly" ? t("home.platform.yearlyBilling") : t("home.platform.billingNotSet")}</span>
                    </div>
                    <span className={styles.badge} style={{ background: "var(--color-bg-subtle)", color: "var(--color-text-secondary)" }}>
                      {formatDate(tn.createdAt, lang)}
                    </span>
                  </div>
                ))}
                {tenants.length === 0 && (
                  <div className={styles.cardSubtext} style={{ padding: 12 }}>{t("home.platform.noSignups")}</div>
                )}
              </div>
            </div>
          </div>

          <div className={styles.grid3Col}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>{t("home.platform.billingCycles")}</h2>
              </div>
              <div className={styles.donutCenter}>
                <DonutChart
                  segments={[
                    { label: t("home.platform.monthly"), value: billingCounts.Monthly, color: "#2563eb" },
                    { label: t("home.platform.yearly"), value: billingCounts.Yearly, color: "#10b981" },
                    { label: t("home.platform.notSet"), value: billingCounts["Not Set"], color: "#94a3b8" },
                  ].filter((s) => s.value > 0)}
                  size={140}
                  thickness={18}
                  centerValue={formatNumber(tenants.length, lang)}
                  centerLabel={t("home.platform.companiesLabel")}
                />
              </div>
              <div className={styles.donutLegend}>
                <div className={styles.legendItem}>
                  <span className={styles.legendDot} style={{ background: "#2563eb" }} />
                  <span className={styles.legendLabel}>{t("home.platform.monthly")}</span>
                  <span className={styles.legendValue}>{formatNumber(billingCounts.Monthly, lang)}</span>
                </div>
                <div className={styles.legendItem}>
                  <span className={styles.legendDot} style={{ background: "#10b981" }} />
                  <span className={styles.legendLabel}>{t("home.platform.yearly")}</span>
                  <span className={styles.legendValue}>{formatNumber(billingCounts.Yearly, lang)}</span>
                </div>
                <div className={styles.legendItem}>
                  <span className={styles.legendDot} style={{ background: "#94a3b8" }} />
                  <span className={styles.legendLabel}>{t("home.platform.notSet")}</span>
                  <span className={styles.legendValue}>{formatNumber(billingCounts["Not Set"], lang)}</span>
                </div>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>{t("home.platform.onlineCompanies")}</h2>
                <span className={`${styles.badge} ${styles.badgeSuccess}`}>
                  <Bus size={12} style={{ marginRight: 4 }} /> {formatNumber(activeSubs, lang)} {t("home.platform.onlineW")}
                </span>
              </div>
              <div className={styles.worldMap}>
                <svg viewBox="0 0 400 200" className={styles.mapSvg}>
                  <ellipse cx="200" cy="100" rx="180" ry="80" fill="none" stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="4 4" opacity={0.4} />
                  <ellipse cx="200" cy="100" rx="130" ry="60" fill="none" stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="4 4" opacity={0.3} />
                  <ellipse cx="200" cy="100" rx="80" ry="35" fill="none" stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="4 4" opacity={0.2} />
                  {[
                    { x: 230, y: 85, size: 5 },
                    { x: 245, y: 90, size: 4 },
                    { x: 220, y: 95, size: 6 },
                    { x: 260, y: 88, size: 3 },
                    { x: 210, y: 78, size: 4 },
                    { x: 255, y: 95, size: 3 },
                    { x: 235, y: 100, size: 5 },
                    { x: 270, y: 82, size: 3 },
                    { x: 195, y: 88, size: 4 },
                    { x: 248, y: 78, size: 3 },
                  ].map((dot, i) => (
                    <g key={i}>
                      <circle cx={dot.x} cy={dot.y} r={dot.size + 4} fill="#2563eb" opacity={0.1} />
                      <circle cx={dot.x} cy={dot.y} r={dot.size} fill="#2563eb" opacity={0.6} />
                      <circle cx={dot.x} cy={dot.y} r={2} fill="#2563eb" />
                    </g>
                  ))}
                </svg>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>{t("home.platform.usersByRole")}</h2>
              </div>
              <div className={styles.moduleList}>
                {ROLE_LABELS.map(({ role, key }) => (
                  <div key={role} className={styles.moduleRow}>
                    <span className={styles.moduleName}>{t(key)}</span>
                    <div className={styles.moduleBarWrap}>
                      <div className={styles.moduleBar} style={{ width: `${((roleCounts[role] || 0) / maxRole) * 100}%` }} />
                    </div>
                    <span className={styles.moduleValue}>{formatNumber(roleCounts[role] || 0, lang)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <footer className={styles.footer}>
            <span>{t("home.platform.footer")}</span>
            <div className={styles.footerLinks}>
              <a href="#">{t("home.platform.privacy")}</a>
              <a href="#">{t("home.platform.terms")}</a>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}