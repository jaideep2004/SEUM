"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Map, MapPin, Edit2, Trash2, MoreHorizontal, Search, Filter } from "lucide-react";
import { useLanguage, formatDate, formatNumber, formatCurrency } from "@/lib/i18n";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const ROUTE_TYPE_COLORS: Record<string, string> = {
  regular: "#3b82f6",
  hajj: "#10b981",
  umrah: "#8b5cf6",
  charter: "#f59e0b",
  shuttle: "#ef4444",
};

const ROUTE_TYPE_KEYS: Record<string, string> = {
  regular: "routes.list.typeRegular",
  hajj: "routes.list.typeHajj",
  umrah: "routes.list.typeUmrah",
  charter: "routes.list.typeCharter",
  shuttle: "routes.list.typeShuttle",
};

const ROUTE_STATUS_KEYS: Record<string, string> = {
  active: "routes.list.statusActive",
  inactive: "routes.list.statusInactive",
  discontinued: "routes.list.statusDiscontinued",
};

export default function RoutesPage() {
  const router = useRouter();
  const { lang, t } = useLanguage();
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
    if (!confirm(t("routes.list.confirmDelete"))) return;
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
          <h1 className={styles.pageTitle}>{t("routes.list.title")}</h1>
          <p className={styles.pageDesc}>{t("routes.list.desc")}</p>
        </div>
        <Link href="/dashboard/routes/new" className={styles.createBtn}>
          <Plus size={14} /> {t("routes.list.newRoute")}
        </Link>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder={t("routes.list.searchPh")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <div className={styles.filterSelect}>
          <Filter size={13} />
          <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }}>
            <option value="">{t("routes.list.allTypes")}</option>
            <option value="regular">{t("routes.list.typeRegular")}</option>
            <option value="hajj">{t("routes.list.typeHajj")}</option>
            <option value="umrah">{t("routes.list.typeUmrah")}</option>
            <option value="charter">{t("routes.list.typeCharter")}</option>
            <option value="shuttle">{t("routes.list.typeShuttle")}</option>
          </select>
        </div>
        <div className={styles.filterSelect}>
          <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}>
            <option value="">{t("routes.list.allStatus")}</option>
            <option value="active">{t("routes.list.stActive")}</option>
            <option value="inactive">{t("routes.list.stInactive")}</option>
            <option value="discontinued">{t("routes.list.stDiscontinued")}</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t("routes.list.colCode")}</th>
              <th>{t("routes.list.colName")}</th>
              <th>{t("routes.list.colRoute")}</th>
              <th>{t("routes.list.colDistance")}</th>
              <th>{t("routes.list.colDuration")}</th>
              <th>{t("routes.list.colType")}</th>
              <th>{t("routes.list.colStatus")}</th>
              <th style={{ width: 60 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className={styles.tableEmpty}>{t("common.loading")}</td></tr>
            ) : routes.length === 0 ? (
              <tr><td colSpan={8} className={styles.tableEmpty}>{t("routes.list.empty")}</td></tr>
            ) : routes.map((r) => (
              <tr key={r.id} className={styles.clickableRow} onClick={() => router.push(`/dashboard/routes/${r.id}`)}>
                <td><span className={styles.code}>{r.code}</span></td>
                <td className={styles.nameCell}>{r.name}</td>
                <td className={styles.routeCell}>
                  <MapPin size={12} /> {r.origin} → {r.destination}
                </td>
                <td>{r.distanceKm ? `${r.distanceKm} ${t("routes.list.km")}` : "—"}</td>
                <td>{r.estimatedDurationMinutes ? `${r.estimatedDurationMinutes} ${t("routes.list.min")}` : "—"}</td>
                <td>
                  <span className={styles.typeTag} style={{ background: `${ROUTE_TYPE_COLORS[r.routeType] || "#6b7280"}18`, color: ROUTE_TYPE_COLORS[r.routeType] || "#6b7280" }}>
                    {ROUTE_TYPE_KEYS[r.routeType] ? t(ROUTE_TYPE_KEYS[r.routeType]) : r.routeType}
                  </span>
                </td>
                <td>
                  <span className={`${styles.status} ${r.status === "active" ? styles.statusActive : r.status === "inactive" ? styles.statusInactive : styles.statusDiscontinued}`}>
                    {ROUTE_STATUS_KEYS[r.status] ? t(ROUTE_STATUS_KEYS[r.status]) : r.status}
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
                          <Edit2 size={13} /> {t("common.edit")}
                        </button>
                        <button className={styles.dangerBtn} onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}>
                          <Trash2 size={13} /> {t("common.delete")}
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
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>{t("routes.list.prev")}</button>
          <span>{t("routes.list.page")} {page} {t("routes.list.of")} {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>{t("routes.list.next")}</button>
        </div>
      )}
    </div>
  );
}
