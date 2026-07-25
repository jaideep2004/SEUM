"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus, Search, AlertTriangle, User, Phone, Calendar, ExternalLink, Camera, FileText, Filter } from "lucide-react";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const STATUS_COLORS: Record<string, string> = {
  active: "#10b981", suspended: "#f59e0b", terminated: "#ef4444", on_leave: "#3b82f6",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active", suspended: "Suspended", terminated: "Terminated", on_leave: "On Leave",
};

export default function DriversListPage() {
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
          <h1 className={styles.pageTitle}>Drivers</h1>
          <p className={styles.pageDesc}>Manage driver profiles, documents, and licenses</p>
        </div>
        <div className={styles.headerActions}>
          {totalExpiring > 0 && (
            <button className={styles.expiryToggle} onClick={() => setShowExpiryAlert(!showExpiryAlert)}>
              <AlertTriangle size={14} /> {totalExpiring} Expiring
            </button>
          )}
          <Link href="/dashboard/drivers/new" className={styles.addBtn}>
            <UserPlus size={14} /> Add Driver
          </Link>
        </div>
      </div>

      {showExpiryAlert && totalExpiring > 0 && (
        <div className={styles.expiryBanner}>
          <AlertTriangle size={16} />
          <span>
            {expiringLicense.length > 0 && <>{expiringLicense.length} license{expiringLicense.length !== 1 ? 's' : ''} expiring within 30 days. </>}
            {expiringMedical.length > 0 && <>{expiringMedical.length} medical fitness record{expiringMedical.length !== 1 ? 's' : ''} expiring within 30 days.</>}
          </span>
          <button className={styles.expiryClose} onClick={() => setShowExpiryAlert(false)}>×</button>
        </div>
      )}

      <div className={styles.filters}>
        <div className={styles.searchWrap}>
          <Search size={13} className={styles.searchIcon} />
          <input className={styles.searchInput} placeholder="Search name, email, employee code..." value={search}
            onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} />
        </div>
        <select className={styles.statusSelect} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="terminated">Terminated</option>
          <option value="on_leave">On Leave</option>
        </select>
      </div>

      {loading ? (
        <p className={styles.loading}>Loading drivers...</p>
      ) : drivers.length === 0 ? (
        <div className={styles.emptyState}>
          <User size={48} className={styles.emptyIcon} />
          <h3>No Drivers Found</h3>
          <p>{search || statusFilter ? "Try different search criteria" : "Add your first driver to get started"}</p>
          {!search && !statusFilter && (
            <Link href="/dashboard/drivers/new" className={styles.emptyAddBtn}>Add Driver</Link>
          )}
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: 44 }}></th>
                <th>Name / Email</th>
                <th>Employee Code</th>
                <th>License</th>
                <th>Nationality</th>
                <th>Status</th>
                <th>Expiry Alerts</th>
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
                          Exp: {new Date(d.licenseExpiry).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                      )}
                    </td>
                    <td>{d.nationality || "—"}</td>
                    <td>
                      <span className={styles.statusBadge} style={{ background: (STATUS_COLORS[d.status] || "#6b7280") + "18", color: STATUS_COLORS[d.status] || "#6b7280" }}>
                        {STATUS_LABELS[d.status] || d.status}
                      </span>
                    </td>
                    <td>
                      <div className={styles.expiryChips}>
                        {licExpiring && <span className={styles.expiryChip} title={`License expiring ${new Date(licExpiring.licenseExpiry).toLocaleDateString()}`}><FileText size={10} /> License</span>}
                        {medExpiring && <span className={styles.expiryChip} title={`Medical fitness expiring ${new Date(medExpiring.medicalFitnessExpiry).toLocaleDateString()}`}><AlertTriangle size={10} /> Medical</span>}
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
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
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
