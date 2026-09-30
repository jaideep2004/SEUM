"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus, Search, AlertTriangle, User, Phone, Calendar, ExternalLink, Camera, FileText, Filter } from "lucide-react";
import { useLanguage, formatDate } from "@/lib/i18n";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const STATUS_COLORS: Record<string, string> = {
  active: "#10b981", suspended: "#f59e0b", terminated: "#ef4444", on_leave: "#3b82f6",
};

const STATUS_KEYS: Record<string, string> = {
  active: "drivers.status.active", suspended: "drivers.status.suspended", terminated: "drivers.status.terminated", on_leave: "drivers.status.onLeave",
};

export default function DriversListPage() {
  const { lang, t } = useLanguage();
  const router = useRouter();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expiringLicense, setExpiringLicense] = useState<any[]>([]);
  const [expiringMedical, setExpiringMedical] = useState<any[]>([]);
  const [showExpiryAlert, setShowExpiryAlert] = useState(true);
  const pageSize = 20;

  async function fetchDrivers() {
    setLoading(true);
    try {
      const token = localStorage.getItem("seum_access_token");
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`${API}/drivers?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) { setDrivers(json.data); setTotal(json.meta.total); }
    } catch {} finally { setLoading(false); }
  }

  async function fetchExpiryAlerts() {
    try {
      const token = localStorage.getItem("seum_access_token");
      const [licRes, medRes] = await Promise.all([
        fetch(`${API}/drivers/expiring/licenses?days=30`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/drivers/expiring/medical?days=30`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const licJson = await licRes.json();
      const medJson = await medRes.json();
      if (licJson.success) setExpiringLicense(licJson.data);
      if (medJson.success) setExpiringMedical(medJson.data);
    } catch {}
  }

  useEffect(() => { fetchDrivers(); }, [page, statusFilter]);
  useEffect(() => { fetchExpiryAlerts(); }, []);

  function handleSearch() { setPage(1); fetchDrivers(); }

  const totalPages = Math.ceil(total / pageSize);
  const totalExpiring = expiringLicense.length + expiringMedical.length;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>{t("drivers.list.title")}</h1>
          <p className={styles.pageDesc}>{t("drivers.list.desc")}</p>
        </div>
        <div className={styles.headerActions}>
          {totalExpiring > 0 && (
            <button className={styles.expiryToggle} onClick={() => setShowExpiryAlert(!showExpiryAlert)}>
              <AlertTriangle size={14} /> {totalExpiring} {t("drivers.list.expiringWord")}
            </button>
          )}
          <Link href="/dashboard/drivers/new" className={styles.addBtn}>
            <UserPlus size={14} /> {t("drivers.list.addDriver")}
          </Link>
        </div>
      </div>

      {showExpiryAlert && totalExpiring > 0 && (
        <div className={styles.expiryBanner}>
          <AlertTriangle size={16} />
          <span>
            {expiringLicense.length > 0 && <>{expiringLicense.length} {expiringLicense.length !== 1 ? t("drivers.list.licensePl") : t("drivers.list.licenseSg")} {t("drivers.list.expiringWithin30")} </>}
            {expiringMedical.length > 0 && <>{expiringMedical.length} {expiringMedical.length !== 1 ? t("drivers.list.medicalPl") : t("drivers.list.medicalSg")} {t("drivers.list.expiringWithin30")}</>}
          </span>
          <button className={styles.expiryClose} onClick={() => setShowExpiryAlert(false)}>×</button>
        </div>
      )}

      <div className={styles.filters}>
        <div className={styles.searchWrap}>
          <Search size={13} className={styles.searchIcon} />
          <input className={styles.searchInput} placeholder={t("drivers.list.searchPh")} value={search}
            onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} />
        </div>
        <select className={styles.statusSelect} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">{t("drivers.list.allStatus")}</option>
          <option value="active">{t("drivers.status.active")}</option>
          <option value="suspended">{t("drivers.status.suspended")}</option>
          <option value="terminated">{t("drivers.status.terminated")}</option>
          <option value="on_leave">{t("drivers.status.onLeave")}</option>
        </select>
      </div>

      {loading ? (
        <p className={styles.loading}>{t("drivers.list.loading")}</p>
      ) : drivers.length === 0 ? (
        <div className={styles.emptyState}>
          <User size={48} className={styles.emptyIcon} />
          <h3>{t("drivers.list.emptyTitle")}</h3>
          <p>{search || statusFilter ? t("drivers.list.emptyFiltered") : t("drivers.list.emptyHint")}</p>
          {!search && !statusFilter && (
            <Link href="/dashboard/drivers/new" className={styles.emptyAddBtn}>{t("drivers.list.addDriver")}</Link>
          )}
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: 44 }}></th>
                <th>{t("drivers.list.colName")}</th>
                <th>{t("drivers.list.colEmpCode")}</th>
                <th>{t("drivers.list.colLicense")}</th>
                <th>{t("drivers.list.colNationality")}</th>
                <th>{t("drivers.list.colStatus")}</th>
                <th>{t("drivers.list.colExpiryAlerts")}</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d) => {
                const licExpiring = expiringLicense.find(e => e.id === d.id);
                const medExpiring = expiringMedical.find(e => e.id === d.id);
                return (
                  <tr key={d.id} className={styles.clickableRow} onClick={() => router.push(`/dashboard/drivers/${d.id}`)}>
                    <td>
                      <div className={styles.avatar}>
                        {d.photoUrl ? <img src={d.photoUrl} alt="" className={styles.avatarImg} /> : d.name?.charAt(0).toUpperCase() || "?"}
                      </div>
                    </td>
                    <td>
                      <span className={styles.nameCell}>{d.name || "—"}</span>
                      <span className={styles.emailCell}>{d.email || "—"}</span>
                    </td>
                    <td className={styles.codeCell}>{d.employeeCode || "—"}</td>
                    <td className={styles.licenseCell}>
                      <span>{d.licenseNumber || "—"}</span>
                      {d.licenseExpiry && (
                        <span className={`${styles.expiryDate} ${isExpiring(d.licenseExpiry) ? styles.expirySoon : ""}`}>
                          {t("drivers.list.expPrefix")} {formatDate(d.licenseExpiry, lang)}
                        </span>
                      )}
                    </td>
                    <td>{d.nationality || "—"}</td>
                    <td>
                      <span className={styles.statusBadge} style={{ background: (STATUS_COLORS[d.status] || "#6b7280") + "18", color: STATUS_COLORS[d.status] || "#6b7280" }}>
                        {t(STATUS_KEYS[d.status] || d.status)}
                      </span>
                    </td>
                    <td>
                      <div className={styles.expiryChips}>
                        {licExpiring && <span className={styles.expiryChip} title={`${t("drivers.list.licenseExpiringTitle")} ${formatDate(licExpiring.licenseExpiry, lang)}`}><FileText size={10} /> {t("drivers.list.chipLicense")}</span>}
                        {medExpiring && <span className={styles.expiryChip} title={`${t("drivers.list.medicalExpiringTitle")} ${formatDate(medExpiring.medicalFitnessExpiry, lang)}`}><AlertTriangle size={10} /> {t("drivers.list.chipMedical")}</span>}
                        {!licExpiring && !medExpiring && <span className={styles.noAlert}>—</span>}
                      </div>
                    </td>
                    <td>
                      <Link href={`/dashboard/drivers/${d.id}`} className={styles.viewLink} onClick={(e) => e.stopPropagation()}>
                        <ExternalLink size={13} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>{t("drivers.list.prev")}</button>
          <span>{t("drivers.list.pageWord")} {page} {t("drivers.list.ofWord")} {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>{t("drivers.list.next")}</button>
        </div>
      )}
    </div>
  );
}

function isExpiring(date: string): boolean {
  if (!date) return false;
  const diff = new Date(date).getTime() - Date.now();
  return diff > 0 && diff <= 30 * 24 * 60 * 60 * 1000;
}
