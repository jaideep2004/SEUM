"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Clock, Bus, MapPin, User, Search, ArrowLeft, ExternalLink } from "lucide-react";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const SEVERITY_COLORS: Record<string, string> = {
  minor: "#f59e0b",
  major: "#ef4444",
  critical: "#dc2626",
};

export default function DelaysPage() {
  const router = useRouter();
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
        <ArrowLeft size={14} /> Back to Monitoring
      </Link>

      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Delay Dashboard</h1>
          <p className={styles.pageDesc}>
            All delayed trips with reason and estimated resolution
            {total > 0 && <span className={styles.count}>({total} total)</span>}
          </p>
        </div>
        <div className={styles.searchWrap}>
          <Search size={13} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Search by route, bus, reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
      </div>

      {loading ? (
        <p className={styles.loading}>Loading delays...</p>
      ) : delays.length === 0 ? (
        <div className={styles.emptyState}>
          <CheckCircle size={48} className={styles.emptyIcon} />
          <h3>No Delayed Trips</h3>
          <p>All trips are running on schedule</p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Route</th>
                <th>Bus</th>
                <th>Driver</th>
                <th>Scheduled</th>
                <th>Delay</th>
                <th>Reason</th>
                <th>Est. Resolution</th>
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
                    {d.scheduledDate ? new Date(d.scheduledDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}
                    <span className={styles.time}>{d.scheduledStartTime?.slice(0, 5)}</span>
                  </td>
                  <td>
                    <span className={styles.delayBadge} data-severity={getSeverity(d.delayMinutes)}>
                      {d.delayMinutes || "?"} min
                    </span>
                  </td>
                  <td className={styles.reasonCell}>{d.delayReason || "—"}</td>
                  <td className={styles.resolutionCell}>
                    {d.estimatedResolutionTime ? (
                      <span className={styles.estTime}>
                        {new Date(d.estimatedResolutionTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    ) : (
                      <span className={styles.muted}>Not set</span>
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
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
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
