"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useLanguage, formatDate, formatNumber, formatCurrency } from "@/lib/i18n";
import styles from "../page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("seum_access_token");
}

export default function ProfitAnalyticsPage() {
  const { lang, t } = useLanguage();
  const money = (v: number) => formatCurrency(v, lang);
  const [kpis, setKpis] = useState<any>(null);
  const [breakdown, setBreakdown] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState("route");

  async function fetchAnalytics(gb = "route") {
    setLoading(true);
    const token = getToken();
    try {
      const res = await fetch(`${API}/accounting/trip-profitability/analytics?group_by=${gb}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (d.success) { setKpis(d.data.kpis); setBreakdown(d.data.breakdown); }
    } catch {}
    setLoading(false);
  }

  useEffect(() => { fetchAnalytics(groupBy); }, []);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>{t("finance.tripAnalytics.title")}</h1>
        <Link href="/dashboard/accounting/trip-profitability" className={`${styles.actionBtn} ${styles.secondaryBtn}`}>
          <ArrowLeft size={14} /> {t("finance.tripAnalytics.back")}
        </Link>
      </div>

      {loading ? (
        <div className={styles.loading}>{t("finance.tripAnalytics.loading")}</div>
      ) : kpis ? (
        <>
          <div className={styles.analytics}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>{t("finance.tripAnalytics.completedTrips")}</div>
              <div className={styles.kpiValue}>{kpis.tripCount}</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>{t("finance.tripAnalytics.avgRevenue")}</div>
              <div className={styles.kpiValue}>{money(kpis.avgRevenue)}</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>{t("finance.tripAnalytics.avgProfit")}</div>
              <div className={`${styles.kpiValue} ${kpis.avgProfit >= 0 ? styles.positive : styles.negative}`}>
                {money(kpis.avgProfit)}
              </div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>{t("finance.tripAnalytics.avgMargin")}</div>
              <div className={`${styles.kpiValue} ${kpis.avgMargin >= 0 ? styles.positive : styles.negative}`}>
                {formatNumber(kpis.avgMargin, lang, 1)}%
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>{t("finance.tripAnalytics.groupBy")}</span>
            <select value={groupBy} onChange={e => { setGroupBy(e.target.value); fetchAnalytics(e.target.value); }}
              style={{ padding: "6px 10px", border: "1px solid var(--color-border)", borderRadius: 6, fontSize: "0.8125rem" }}>
              <option value="route">{t("finance.tripAnalytics.route")}</option>
              <option value="bus">{t("finance.tripAnalytics.bus")}</option>
            </select>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.breakdownTable}>
              <thead>
                <tr>
                  <th>{groupBy === "route" ? t("finance.tripAnalytics.route") : t("finance.tripAnalytics.bus")}</th>
                  <th>{t("finance.tripAnalytics.colTrips")}</th>
                  <th>{t("finance.tripAnalytics.colTotalRevenue")}</th>
                  <th>{t("finance.tripAnalytics.colTotalProfit")}</th>
                  <th>{t("finance.tripAnalytics.colMargin")}</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: "center", padding: 24, color: "var(--color-text-tertiary)" }}>{t("finance.tripAnalytics.noData")}</td></tr>
                ) : breakdown.map((b: any) => (
                  <tr key={b.label}>
                    <td style={{ fontWeight: 600 }}>{b.label}</td>
                    <td>{b.tripCount}</td>
                    <td>{money(b.totalRevenue)}</td>
                    <td className={b.totalProfit >= 0 ? styles.positive : styles.negative}>{money(b.totalProfit)}</td>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <span className={styles.marginBar}
                          style={{ width: Math.min(Math.abs(b.marginPercent), 100), background: b.marginPercent >= 0 ? "#059669" : "#dc2626" }} />
                        {formatNumber(b.marginPercent, lang, 1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
