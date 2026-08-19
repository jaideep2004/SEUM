"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus, Search, Users, ExternalLink, Briefcase } from "lucide-react";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const STATUS_COLORS: Record<string, string> = {
  active: "#10b981", suspended: "#f59e0b", terminated: "#ef4444", on_leave: "#3b82f6",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active", suspended: "Suspended", terminated: "Terminated", on_leave: "On Leave",
};

const DEPARTMENTS = [
  { value: "", label: "All Departments" },
  { value: "operations", label: "Operations" },
  { value: "finance", label: "Finance" },
  { value: "hr", label: "HR" },
  { value: "fleet", label: "Fleet" },
  { value: "maintenance", label: "Maintenance" },
  { value: "customer_service", label: "Customer Service" },
  { value: "executive", label: "Executive" },
  { value: "admin", label: "Admin" },
];

export default function EmployeesListPage() {
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
          <h1 className={styles.pageTitle}>Employees</h1>
          <p className={styles.pageDesc}>Manage non-driver staff profiles, departments, and employment details</p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/dashboard/hr/employees/new" className={styles.addBtn}>
            <UserPlus size={14} /> Add Employee
          </Link>
        </div>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchWrap}>
          <Search size={13} className={styles.searchIcon} />
          <input className={styles.searchInput} placeholder="Search name, email, employee code, designation..." value={search}
            onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} />
        </div>
        <select className={styles.statusSelect} value={departmentFilter} onChange={(e) => { setDepartmentFilter(e.target.value); setPage(1); }}>
          {DEPARTMENTS.map((d) => <option key={d.value || "all"} value={d.value}>{d.label}</option>)}
        </select>
        <select className={styles.statusSelect} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="terminated">Terminated</option>
          <option value="on_leave">On Leave</option>
        </select>
      </div>

      {loading ? (
        <p className={styles.loading}>Loading employees...</p>
      ) : employees.length === 0 ? (
        <div className={styles.emptyState}>
          <Users size={48} className={styles.emptyIcon} />
          <h3>No Employees Found</h3>
          <p>{search || statusFilter || departmentFilter ? "Try different search criteria" : "Add your first employee to get started"}</p>
          {!search && !statusFilter && !departmentFilter && (
            <Link href="/dashboard/hr/employees/new" className={styles.emptyAddBtn}>Add Employee</Link>
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
                <th>Department</th>
                <th>Designation</th>
                <th>Phone</th>
                <th>Nationality</th>
                <th>Status</th>
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
                      {STATUS_LABELS[e.status] || e.status}
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
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
