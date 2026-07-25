"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { API_URL } from "@/services/api";
import styles from "./page.module.css";

function fmt(n: number): string { return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function currency(n: number): string { return `SAR ${fmt(n)}`; }

interface Batch { id: string; period_start: string; period_end: string; total_salaries: string; total_allowances: string; total_deductions: string; net_payable: string; employee_count: number; status: string; created_at: string; }

const STATUS_COLORS: Record<string, string> = { draft: "#fbbf24", approved: "#60a5fa", paid: "#34d399" };

export default function PayrollListPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => { fetchBatches(); }, [statusFilter]);

  async function fetchBatches() {
    setLoading(true);
    try {
      const params = statusFilter ? `?status=${statusFilter}` : "";
      const res = await fetch(`${API_URL}/api/v1/accounting/payroll/batches${params}`, { credentials: "include" });
      const json = await res.json();
      if (json.success) setBatches(json.data);
      else setError(json.error || "Failed to load");
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this draft batch?")) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/accounting/payroll/batches/${id}`, { method: "DELETE", credentials: "include" });
      const json = await res.json();
      if (json.success) fetchBatches();
      else alert(json.error);
    } catch { alert("Delete failed"); }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Payroll Batches</h1>
        <Link href="/dashboard/accounting/payroll/new" className={styles.createBtn}>+ New Batch</Link>
      </div>

      <div className={styles.filters}>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={styles.filterSelect}>
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="approved">Approved</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      {loading && <div className={styles.loading}>Loading...</div>}
      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.grid}>
        {batches.map((b) => (
          <Link key={b.id} href={`/dashboard/accounting/payroll/${b.id}`} className={styles.card}>
            <div className={styles.cardTop}>
              <span className={styles.period}>{b.period_start} → {b.period_end}</span>
              <span className={styles.statusBadge} style={{ background: STATUS_COLORS[b.status] || "#64748b", color: "#0f172a" }}>{b.status}</span>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.stat}><span className={styles.statLabel}>Employees</span><span className={styles.statValue}>{b.employee_count}</span></div>
              <div className={styles.stat}><span className={styles.statLabel}>Net Payable</span><span className={styles.statValue}>{currency(parseFloat(b.net_payable))}</span></div>
            </div>
            <div className={styles.cardFooter}>
              <span className={styles.date}>Created {new Date(b.created_at).toLocaleDateString()}</span>
              {b.status === "draft" && (
                <button onClick={(e) => { e.preventDefault(); handleDelete(b.id); }} className={styles.deleteBtn}>Delete</button>
              )}
            </div>
          </Link>
        ))}
        {!loading && batches.length === 0 && <div className={styles.empty}>No payroll batches found</div>}
      </div>
    </div>
  );
}
