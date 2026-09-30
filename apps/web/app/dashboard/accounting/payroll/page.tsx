"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { API_URL } from "@/services/api";
import { useLanguage, formatDate, formatNumber, formatCurrency } from "@/lib/i18n";
import styles from "./page.module.css";

interface Batch { id: string; period_start: string; period_end: string; total_salaries: string; total_allowances: string; total_deductions: string; net_payable: string; employee_count: number; status: string; created_at: string; }

const STATUS_COLORS: Record<string, string> = { draft: "#fbbf24", approved: "#60a5fa", paid: "#34d399" };

export default function PayrollListPage() {
  const { lang, t } = useLanguage();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const currency = (n: number): string => formatCurrency(n, lang);
  const STATUS_LABELS: Record<string, string> = {
    draft: t("finance.payBatches.statusDraft"),
    approved: t("finance.payBatches.statusApproved"),
    paid: t("finance.payBatches.statusPaid"),
  };

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
    if (!confirm(t("finance.payBatches.deleteConfirm"))) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/accounting/payroll/batches/${id}`, { method: "DELETE", credentials: "include" });
      const json = await res.json();
      if (json.success) fetchBatches();
      else alert(json.error);
    } catch { alert(t("finance.payBatches.deleteFailed")); }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t("finance.payBatches.title")}</h1>
        <Link href="/dashboard/accounting/payroll/new" className={styles.createBtn}>{t("finance.payBatches.new")}</Link>
      </div>

      <div className={styles.filters}>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={styles.filterSelect}>
          <option value="">{t("finance.payBatches.allStatuses")}</option>
          <option value="draft">{t("finance.payBatches.statusDraftCap")}</option>
          <option value="approved">{t("finance.payBatches.statusApprovedCap")}</option>
          <option value="paid">{t("finance.payBatches.statusPaidCap")}</option>
        </select>
      </div>

      {loading && <div className={styles.loading}>{t("finance.payBatches.loading")}</div>}
      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.grid}>
        {batches.map((b) => (
          <Link key={b.id} href={`/dashboard/accounting/payroll/${b.id}`} className={styles.card}>
            <div className={styles.cardTop}>
              <span className={styles.period}>{formatDate(b.period_start, lang)} → {formatDate(b.period_end, lang)}</span>
              <span className={styles.statusBadge} style={{ background: STATUS_COLORS[b.status] || "#64748b", color: "#0f172a" }}>{STATUS_LABELS[b.status] || b.status}</span>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.stat}><span className={styles.statLabel}>{t("finance.payBatches.employees")}</span><span className={styles.statValue}>{b.employee_count}</span></div>
              <div className={styles.stat}><span className={styles.statLabel}>{t("finance.payBatches.netPayable")}</span><span className={styles.statValue}>{currency(parseFloat(b.net_payable))}</span></div>
            </div>
            <div className={styles.cardFooter}>
              <span className={styles.date}>{t("finance.payBatches.created")} {formatDate(b.created_at, lang)}</span>
              {b.status === "draft" && (
                <button onClick={(e) => { e.preventDefault(); handleDelete(b.id); }} className={styles.deleteBtn}>{t("finance.payBatches.delete")}</button>
              )}
            </div>
          </Link>
        ))}
        {!loading && batches.length === 0 && <div className={styles.empty}>{t("finance.payBatches.empty")}</div>}
      </div>
    </div>
  );
}
