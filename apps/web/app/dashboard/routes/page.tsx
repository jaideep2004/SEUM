"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Map, MapPin, Edit2, Trash2, MoreHorizontal, Search, Filter } from "lucide-react";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const ROUTE_TYPE_COLORS: Record<string, string> = {
  regular: "#3b82f6",
  hajj: "#10b981",
  umrah: "#8b5cf6",
  charter: "#f59e0b",
  shuttle: "#ef4444",
};

const ROUTE_TYPE_LABELS: Record<string, string> = {
  regular: "Regular",
  hajj: "Hajj",
  umrah: "Umrah",
  charter: "Charter",
  shuttle: "Shuttle",
};

export default function RoutesPage() {
  const router = useRouter();
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const pageSize = 20;

  async function fetchRoutes() {
    setLoading(true);
    try {
      const token = localStorage.getItem("seum_access_token");
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (search) params.set("search", search);
      if (filterType) params.set("routeType", filterType);
      if (filterStatus) params.set("status", filterStatus);
      const res = await fetch(`${API}/operations/routes?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setRoutes(json.data);
        setTotal(json.meta.total);
      }
    } catch {} finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchRoutes(); }, [page, filterType, filterStatus]);

  function handleSearch() { setPage(1); fetchRoutes(); }

  async function handleDelete(id: string) {
    if (!confirm("Delete this route?")) return;
    try {
      const token = localStorage.getItem("seum_access_token");
      await fetch(`${API}/operations/routes/${id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      fetchRoutes();
    } catch {}
    setOpenMenu(null);
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Routes</h1>
          <p className={styles.pageDesc}>Manage bus routes and stops</p>
        </div>
        <Link href="/dashboard/routes/new" className={styles.createBtn}>
          <Plus size={14} /> New Route
        </Link>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Search routes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <div className={styles.filterSelect}>
          <Filter size={13} />
          <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }}>
            <option value="">All Types</option>
            <option value="regular">Regular</option>
            <option value="hajj">Hajj</option>
            <option value="umrah">Umrah</option>
            <option value="charter">Charter</option>
            <option value="shuttle">Shuttle</option>
          </select>
        </div>
        <div className={styles.filterSelect}>
          <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="discontinued">Discontinued</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Route</th>
              <th>Distance</th>
              <th>Duration</th>
              <th>Type</th>
              <th>Status</th>
              <th style={{ width: 60 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className={styles.tableEmpty}>Loading...</td></tr>
            ) : routes.length === 0 ? (
              <tr><td colSpan={8} className={styles.tableEmpty}>No routes found</td></tr>
            ) : routes.map((r) => (
              <tr key={r.id} className={styles.clickableRow} onClick={() => router.push(`/dashboard/routes/${r.id}`)}>
                <td><span className={styles.code}>{r.code}</span></td>
                <td className={styles.nameCell}>{r.name}</td>
                <td className={styles.routeCell}>
                  <MapPin size={12} /> {r.origin} → {r.destination}
                </td>
                <td>{r.distanceKm ? `${r.distanceKm} km` : "—"}</td>
                <td>{r.estimatedDurationMinutes ? `${r.estimatedDurationMinutes} min` : "—"}</td>
                <td>
                  <span className={styles.typeTag} style={{ background: `${ROUTE_TYPE_COLORS[r.routeType] || "#6b7280"}18`, color: ROUTE_TYPE_COLORS[r.routeType] || "#6b7280" }}>
                    {ROUTE_TYPE_LABELS[r.routeType] || r.routeType}
                  </span>
                </td>
                <td>
                  <span className={`${styles.status} ${r.status === "active" ? styles.statusActive : r.status === "inactive" ? styles.statusInactive : styles.statusDiscontinued}`}>
                    {r.status}
                  </span>
                </td>
                <td>
                  <div className={styles.actionWrap}>
                    <button
                      className={styles.actionBtn}
                      onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === r.id ? null : r.id); }}
                    >
                      <MoreHorizontal size={14} />
                    </button>
                    {openMenu === r.id && (
                      <div className={styles.actionMenu}>
                        <button onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/routes/${r.id}/edit`); }}>
                          <Edit2 size={13} /> Edit
                        </button>
                        <button className={styles.dangerBtn} onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}>
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
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
