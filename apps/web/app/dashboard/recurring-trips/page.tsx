"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Filter, Repeat, Clock, CalendarDays, RotateCcw } from "lucide-react";
import { useLanguage, formatDate, formatNumber, formatCurrency } from "@/lib/i18n";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const FREQ_KEYS: Record<string, string> = {
  daily: "recurring.list.freqDaily",
  weekdays: "recurring.list.freqWeekdays",
  weekends: "recurring.list.freqWeekends",
  custom_days: "recurring.list.freqCustom",
};

const DAY_KEYS = [
  "recurring.list.daySun", "recurring.list.dayMon", "recurring.list.dayTue",
  "recurring.list.dayWed", "recurring.list.dayThu", "recurring.list.dayFri",
  "recurring.list.daySat",
];

const FREQ_COLORS: Record<string, string> = {
  daily: "#3b82f6", weekdays: "#10b981", weekends: "#8b5cf6", custom_days: "#f59e0b",
};

export default function RecurringTripsPage() {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const [patterns, setPatterns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterFreq, setFilterFreq] = useState("");
  const [filterActive, setFilterActive] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  async function fetchPatterns() {
    setLoading(true);
    try {
      const token = localStorage.getItem("seum_access_token");
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (filterFreq) params.set("frequency", filterFreq);
      if (filterActive !== "") params.set("isActive", filterActive);
      if (search) params.set("search", search);
      const res = await fetch(`${API}/operations/recurring-trips?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) { setPatterns(json.data); setTotal(json.meta.total); }
    } catch {} finally { setLoading(false); }
  }

  useEffect(() => { fetchPatterns(); }, [page, filterFreq, filterActive]);

  function handleSearch() { setPage(1); fetchPatterns(); }

  const totalPages = Math.ceil(total / pageSize);

  function freqBadge(p: any) {
    const label = FREQ_KEYS[p.frequency] ? t(FREQ_KEYS[p.frequency]) : p.frequency;
    const color = FREQ_COLORS[p.frequency] || "#6b7280";
    return <span className={styles.freqBadge} style={{ background: color + "20", color }}>{label}</span>;
  }

  function daysDisplay(p: any) {
    if (p.frequency === "daily") return t("recurring.list.everyDay");
    if (p.frequency === "weekdays") return t("recurring.list.weekdaysShort");
    if (p.frequency === "weekends") return t("recurring.list.weekendsShort");
    return p.daysOfWeek?.map((d: number) => t(DAY_KEYS[d])).join(", ") || "—";
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>{t("recurring.list.title")}</h1>
          <p className={styles.pageDesc}>{t("recurring.list.desc")}</p>
        </div>
        <Link href="/dashboard/recurring-trips/new" className={styles.createBtn}>
          <Plus size={14} /> {t("recurring.list.newPattern")}
        </Link>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} />
          <input className={styles.searchInput} placeholder={t("recurring.list.searchPh")} value={search}
            onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} />
        </div>
        <div className={styles.filterSelect}>
          <Filter size={13} />
          <select value={filterFreq} onChange={(e) => { setFilterFreq(e.target.value); setPage(1); }}>
            <option value="">{t("recurring.list.allFreq")}</option>
            <option value="daily">{t("recurring.list.freqDaily")}</option>
            <option value="weekdays">{t("recurring.list.freqWeekdays")}</option>
            <option value="weekends">{t("recurring.list.freqWeekends")}</option>
            <option value="custom_days">{t("recurring.list.freqCustom")}</option>
          </select>
        </div>
        <div className={styles.filterSelect}>
          <select value={filterActive} onChange={(e) => { setFilterActive(e.target.value); setPage(1); }}>
            <option value="">{t("recurring.list.allStatus")}</option>
            <option value="true">{t("recurring.list.stActive")}</option>
            <option value="false">{t("recurring.list.stInactive")}</option>
          </select>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t("recurring.list.colRoute")}</th>
              <th>{t("recurring.list.colBus")}</th>
              <th>{t("recurring.list.colDriver")}</th>
              <th>{t("recurring.list.colFrequency")}</th>
              <th>{t("recurring.list.colSchedule")}</th>
              <th>{t("recurring.list.colPeriod")}</th>
              <th>{t("recurring.list.colLastGen")}</th>
              <th style={{ width: 60 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className={styles.tableEmpty}>{t("common.loading")}</td></tr>
            ) : patterns.length === 0 ? (
              <tr><td colSpan={8} className={styles.tableEmpty}>{t("recurring.list.empty")}</td></tr>
            ) : patterns.map((p) => (
              <tr key={p.id} className={styles.clickableRow} onClick={() => router.push(`/dashboard/recurring-trips/${p.id}`)}>
                <td className={styles.routeCell}>{p.routeName || p.routeId || "—"}</td>
                <td>{p.busPlate || <span className={styles.muted}>—</span>}</td>
                <td>{p.driverName || <span className={styles.muted}>—</span>}</td>
                <td>{freqBadge(p)}</td>
                <td className={styles.timeCell}>
                  <Clock size={11} /> {p.scheduledStartTime?.slice(0, 5)}
                  <span className={styles.daysText}>{daysDisplay(p)}</span>
                </td>
                <td className={styles.dateCell}>
                  <CalendarDays size={11} />
                  {formatDate(p.startDate, lang)}
                  {p.endDate ? ` – ${formatDate(p.endDate, lang)}` : ` ${t("recurring.list.ongoingArrow")}`}
                </td>
                <td className={styles.muted}>
                  {p.lastGeneratedAt ? formatDate(p.lastGeneratedAt, lang) : t("recurring.list.never")}
                </td>
                <td>
                  <span className={`${styles.statusDot} ${p.isActive ? styles.activeDot : styles.inactiveDot}`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>{t("recurring.list.prev")}</button>
          <span>{t("recurring.list.page")} {page} {t("recurring.list.of")} {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>{t("recurring.list.next")}</button>
        </div>
      )}
    </div>
  );
}
