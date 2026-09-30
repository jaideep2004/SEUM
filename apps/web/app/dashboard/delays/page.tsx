"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Clock, Bus, MapPin, User, Search, ArrowLeft, ExternalLink } from "lucide-react";
import { useLanguage, formatDate, formatNumber, formatCurrency } from "@/lib/i18n";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const SEVERITY_COLORS: Record<string, string> = {
  minor: "#f59e0b",
  major: "#ef4444",
  critical: "#dc2626",
};

export default function DelaysPage() {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const [delays, setDelays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const pageSize = 20;

  async function fetchDelays() {
    setLoading(true);
    try {
      const token = localStorage.getItem("seum_access_token");
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (search) params.set("search", search);
      const res = await fetch(`${API}/operations/monitoring/delays?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) { setDelays(json.data); setTotal(json.meta.total); }
    } catch {} finally { setLoading(false); }
  }

  useEffect(() => { fetchDelays(); }, [page]);

  function handleSearch() { setPage(1); fetchDelays(); }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className={styles.page}>
      <Link href="/dashboard/monitoring" className={styles.backLink}>
        <ArrowLeft size={14} /> {t("tracking.delays.back")}
      </Link>

      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>{t("tracking.delays.title")}</h1>
          <p className={styles.pageDesc}>
            {t("tracking.delays.desc")}
            {total > 0 && <span className={styles.count}>({total} {t("tracking.delays.totalWord")})</span>}
          </p>
        </div>
        <div className={styles.searchWrap}>
          <Search size={13} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder={t("tracking.delays.searchPh")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
      </div>

      {loading ? (
        <p className={styles.loading}>{t("tracking.delays.loading")}</p>
      ) : delays.length === 0 ? (
        <div className={styles.emptyState}>
          <CheckCircle size={48} className={styles.emptyIcon} />
          <h3>{t("tracking.delays.emptyTitle")}</h3>
          <p>{t("tracking.delays.emptyDesc")}</p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("tracking.delays.colRoute")}</th>
                <th>{t("tracking.delays.colBus")}</th>
                <th>{t("tracking.delays.colDriver")}</th>
                <th>{t("tracking.delays.colScheduled")}</th>
                <th>{t("tracking.delays.colDelay")}</th>
                <th>{t("tracking.delays.colReason")}</th>
                <th>{t("tracking.delays.colEstResolution")}</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {delays.map((d) => (
                <tr key={d.id}>
                  <td className={styles.routeCell}>
                    <MapPin size={12} />
                    {d.routeName || "—"}
                  </td>
                  <td className={styles.busCell}>
                    <Bus size={12} />
                    {d.busPlate || "—"}
                  </td>
                  <td className={styles.driverCell}>
                    <User size={12} />
                    {d.driverName || "—"}
                  </td>
                  <td className={styles.timeCell}>
                    <Clock size={11} />
                    {d.scheduledDate ? formatDate(d.scheduledDate, lang) : "—"}
                    <span className={styles.time}>{d.scheduledStartTime?.slice(0, 5)}</span>
                  </td>
                  <td>
                    <span className={styles.delayBadge} data-severity={getSeverity(d.delayMinutes)}>
                      {d.delayMinutes || "?"} {t("tracking.delays.min")}
                    </span>
                  </td>
                  <td className={styles.reasonCell}>{d.delayReason || "—"}</td>
                  <td className={styles.resolutionCell}>
                    {d.estimatedResolutionTime ? (
                      <span className={styles.estTime}>
                        {new Date(d.estimatedResolutionTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    ) : (
                      <span className={styles.muted}>{t("tracking.delays.notSet")}</span>
                    )}
                  </td>
                  <td>
                    <Link href={`/dashboard/trips/${d.id}`} className={styles.viewLink}>
                      <ExternalLink size={13} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>{t("tracking.delays.prev")}</button>
          <span>{t("tracking.delays.page")} {page} {t("tracking.delays.of")} {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>{t("tracking.delays.next")}</button>
        </div>
      )}
    </div>
  );
}

function getSeverity(minutes: number): string {
  if (minutes >= 60) return "critical";
  if (minutes >= 30) return "major";
  return "minor";
}

function CheckCircle({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
