"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus, Search, Users, ExternalLink, Briefcase } from "lucide-react";
import { useLanguage, formatDate, formatNumber, formatCurrency } from "@/lib/i18n";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const STATUS_COLORS: Record<string, string> = {
  active: "#10b981", suspended: "#f59e0b", terminated: "#ef4444", on_leave: "#3b82f6",
};

const STATUS_KEYS: Record<string, string> = {
  active: "hr.status.active",
  suspended: "hr.status.suspended",
  terminated: "hr.status.terminated",
  on_leave: "hr.status.onLeave",
};

const DEPARTMENT_KEYS: Record<string, string> = {
  operations: "hr.dept.operations",
  finance: "hr.dept.finance",
  hr: "hr.dept.hr",
  fleet: "hr.dept.fleet",
  maintenance: "hr.dept.maintenance",
  customer_service: "hr.dept.customerService",
  executive: "hr.dept.executive",
  admin: "hr.dept.admin",
};

export default function EmployeesListPage() {
  const { lang, t } = useLanguage();
  void formatDate;
  void formatCurrency;
  const router = useRouter();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const pageSize = 20;

  async function fetchEmployees() {
    setLoading(true);
    try {
      const token = localStorage.getItem("seum_access_token");
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (departmentFilter) params.set("department", departmentFilter);
      const res = await fetch(`${API}/hr/employees?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) { setEmployees(json.data); setTotal(json.meta.total); }
    } catch {} finally { setLoading(false); }
  }

  useEffect(() => { fetchEmployees(); }, [page, statusFilter, departmentFilter]);

  function handleSearch() { setPage(1); fetchEmployees(); }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>{t("hr.employees.title")}</h1>
          <p className={styles.pageDesc}>{t("hr.employees.desc")}</p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/dashboard/hr/employees/new" className={styles.addBtn}>
            <UserPlus size={14} /> {t("hr.employees.add")}
          </Link>
        </div>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchWrap}>
          <Search size={13} className={styles.searchIcon} />
          <input className={styles.searchInput} placeholder={t("hr.employees.searchPh")} value={search}
            onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} />
        </div>
        <select className={styles.statusSelect} value={departmentFilter} onChange={(e) => { setDepartmentFilter(e.target.value); setPage(1); }}>
          <option value="">{t("hr.dept.all")}</option>
          {Object.entries(DEPARTMENT_KEYS).map(([v, k]) => <option key={v} value={v}>{t(k)}</option>)}
        </select>
        <select className={styles.statusSelect} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">{t("hr.employees.allStatus")}</option>
          <option value="active">{t("hr.status.active")}</option>
          <option value="suspended">{t("hr.status.suspended")}</option>
          <option value="terminated">{t("hr.status.terminated")}</option>
          <option value="on_leave">{t("hr.status.onLeave")}</option>
        </select>
      </div>

      {loading ? (
        <p className={styles.loading}>{t("hr.employees.loading")}</p>
      ) : employees.length === 0 ? (
        <div className={styles.emptyState}>
          <Users size={48} className={styles.emptyIcon} />
          <h3>{t("hr.employees.emptyTitle")}</h3>
          <p>{search || statusFilter || departmentFilter ? t("hr.employees.emptyFiltered") : t("hr.employees.emptyHint")}</p>
          {!search && !statusFilter && !departmentFilter && (
            <Link href="/dashboard/hr/employees/new" className={styles.emptyAddBtn}>{t("hr.employees.add")}</Link>
          )}
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: 44 }}></th>
                <th>{t("hr.employees.colName")}</th>
                <th>{t("hr.employees.colCode")}</th>
                <th>{t("hr.employees.colDept")}</th>
                <th>{t("hr.employees.colDesignation")}</th>
                <th>{t("hr.employees.colPhone")}</th>
                <th>{t("hr.employees.colNationality")}</th>
                <th>{t("hr.employees.colStatus")}</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id} className={styles.clickableRow} onClick={() => router.push(`/dashboard/hr/employees/${e.id}`)}>
                  <td>
                    <div className={styles.avatar}>
                      {e.name?.charAt(0).toUpperCase() || "?"}
                    </div>
                  </td>
                  <td>
                    <span className={styles.nameCell}>{e.name || "—"}</span>
                    <span className={styles.emailCell}>{e.email || "—"}</span>
                  </td>
                  <td className={styles.codeCell}>{e.employeeCode || "—"}</td>
                  <td>
                    <span className={styles.departmentBadge}><Briefcase size={10} /> {e.department?.replace("_", " ") || "—"}</span>
                  </td>
                  <td>{e.designation || "—"}</td>
                  <td>{e.phone || "—"}</td>
                  <td>{e.nationality || "—"}</td>
                  <td>
                    <span className={styles.statusBadge} style={{ background: (STATUS_COLORS[e.status] || "#6b7280") + "18", color: STATUS_COLORS[e.status] || "#6b7280" }}>
                      {t(STATUS_KEYS[e.status] || e.status)}
                    </span>
                  </td>
                  <td>
                    <Link href={`/dashboard/hr/employees/${e.id}`} className={styles.viewLink} onClick={(e) => e.stopPropagation()}>
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
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>{t("hr.employees.prev")}</button>
          <span>{t("hr.employees.pageWord")} {formatNumber(page, lang)} {t("hr.employees.ofWord")} {formatNumber(totalPages, lang)}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>{t("hr.employees.next")}</button>
        </div>
      )}
    </div>
  );
}
