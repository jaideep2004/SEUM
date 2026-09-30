"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { API_URL } from "@/services/api";
import { useLanguage, formatDate, formatNumber, formatCurrency } from "@/lib/i18n";
import styles from "./page.module.css";

interface BatchItem { id: string; driver_id: string; employee_code: string | null; employee_name: string; base_salary: string; trip_allowance: string; overtime_hours: string; overtime_rate: string; overtime_pay: string; bonuses: string; deductions: string; net_pay: string; }

interface Batch { id: string; period_start: string; period_end: string; total_salaries: string; total_allowances: string; total_deductions: string; net_payable: string; employee_count: number; status: string; approved_by: string | null; paid_at: string | null; created_at: string; items: BatchItem[]; }

export default function PayrollDetailPage() {
  const { lang, t } = useLanguage();
  const { id } = useParams();
  const router = useRouter();
  const fmt = (n: number): string => formatNumber(n, lang, 2);
  const currency = (n: number): string => formatCurrency(n, lang);
  const STATUS_LABELS: Record<string, string> = {
    draft: t("finance.payDetail.statusDraft"),
    approved: t("finance.payDetail.statusApproved"),
    paid: t("finance.payDetail.statusPaid"),
  };
  const [batch, setBatch] = useState<Batch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { fetchBatch(); }, [id]);

  async function fetchBatch() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/accounting/payroll/batches/${id}`, { credentials: "include" });
      const json = await res.json();
      if (json.success) setBatch(json.data);
      else setError(json.error || "Not found");
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleAction(action: "approve" | "pay") {
    try {
      const res = await fetch(`${API_URL}/api/v1/accounting/payroll/batches/${id}/${action}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (json.success) fetchBatch();
      else alert(json.error);
    } catch { alert(t("finance.payDetail.actionFailed")); }
  }

  async function handleDelete() {
    if (!confirm(t("finance.payDetail.deleteConfirm"))) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/accounting/payroll/batches/${id}`, { method: "DELETE", credentials: "include" });
      const json = await res.json();
      if (json.success) router.push("/dashboard/accounting/payroll");
      else alert(json.error);
    } catch { alert(t("finance.payDetail.deleteFailed")); }
  }

  if (loading) return <div className={styles.loading}>{t("finance.payDetail.loading")}</div>;
  if (error) return <div className={styles.error}>{error}</div>;
  if (!batch) return <div className={styles.error}>{t("finance.payDetail.notFound")}</div>;

  const canApprove = batch.status === "draft";
  const canPay = batch.status === "approved";
  const canDelete = batch.status === "draft";
  const totalC = (n: keyof BatchItem) => itemsTotal(batch.items, n);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{t("finance.payDetail.title")}</h1>
          <p className={styles.period}>{formatDate(batch.period_start, lang)} → {formatDate(batch.period_end, lang)}</p>
        </div>
        <div className={styles.badgeRow}>
          <span className={`${styles.statusBadge} ${styles[`status${batch.status}`]}`}>{STATUS_LABELS[batch.status] || batch.status}</span>
          {batch.paid_at && <span className={styles.paidDate}>{t("finance.payDetail.paid")} {formatDate(batch.paid_at, lang)}</span>}
        </div>
      </div>

      <div className={styles.summaryCards}>
        <div className={styles.summaryCard}><span className={styles.summaryLabel}>{t("finance.payDetail.employees")}</span><span className={styles.summaryValue}>{batch.employee_count}</span></div>
        <div className={styles.summaryCard}><span className={styles.summaryLabel}>{t("finance.payDetail.totalSalaries")}</span><span className={styles.summaryValue}>{currency(parseFloat(batch.total_salaries))}</span></div>
        <div className={styles.summaryCard}><span className={styles.summaryLabel}>{t("finance.payDetail.totalAllowances")}</span><span className={styles.summaryValue} style={{ color: "#34d399" }}>{currency(parseFloat(batch.total_allowances))}</span></div>
        <div className={styles.summaryCard}><span className={styles.summaryLabel}>{t("finance.payDetail.totalDeductions")}</span><span className={styles.summaryValue} style={{ color: "#f87171" }}>{currency(parseFloat(batch.total_deductions))}</span></div>
        <div className={`${styles.summaryCard} ${styles.netCard}`}><span className={styles.summaryLabel}>{t("finance.payDetail.netPayable")}</span><span className={styles.netValue}>{currency(parseFloat(batch.net_payable))}</span></div>
      </div>

      {(canApprove || canPay || canDelete) && (
        <div className={styles.actions}>
          {canApprove && <button onClick={() => handleAction("approve")} className={styles.approveBtn}>{t("finance.payDetail.approvePost")}</button>}
          {canPay && <button onClick={() => handleAction("pay")} className={styles.payBtn}>{t("finance.payDetail.payPost")}</button>}
          {canDelete && <button onClick={handleDelete} className={styles.deleteBtn}>{t("finance.payDetail.deleteDraft")}</button>}
        </div>
      )}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr><th>{t("finance.payDetail.colEmployee")}</th><th>{t("finance.payDetail.colCode")}</th><th>{t("finance.payDetail.colBase")}</th><th>{t("finance.payDetail.colTripAllow")}</th><th>{t("finance.payDetail.colOtHrs")}</th><th>{t("finance.payDetail.colOtPay")}</th><th>{t("finance.payDetail.colBonuses")}</th><th>{t("finance.payDetail.colDeductions")}</th><th>{t("finance.payDetail.colNet")}</th></tr>
          </thead>
          <tbody>
            {batch.items.map((item) => (
              <tr key={item.id}>
                <td className={styles.cellName}>{item.employee_name}</td>
                <td className={styles.cellCode}>{item.employee_code || "—"}</td>
                <td className={styles.cellAmount}>{currency(parseFloat(item.base_salary))}</td>
                <td className={styles.cellAmount}>{currency(parseFloat(item.trip_allowance))}</td>
                <td className={styles.cellAmount}>{fmt(parseFloat(item.overtime_hours))}</td>
                <td className={styles.cellAmount}>{currency(parseFloat(item.overtime_pay))}</td>
                <td className={styles.cellAmount}>{currency(parseFloat(item.bonuses))}</td>
                <td className={styles.cellAmount}>{currency(parseFloat(item.deductions))}</td>
                <td className={styles.cellAmount} style={{ fontWeight: 700 }}>{currency(parseFloat(item.net_pay))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className={styles.totalRow}>
              <td colSpan={2} className={styles.cellName}>{t("finance.payDetail.totals")}</td>
              <td className={styles.cellAmount}>{currency(parseFloat(batch.total_salaries))}</td>
              <td className={styles.cellAmount}>{currency(totalC("trip_allowance"))}</td>
              <td></td>
              <td className={styles.cellAmount}>{currency(totalC("overtime_pay"))}</td>
              <td className={styles.cellAmount}>{currency(totalC("bonuses"))}</td>
              <td className={styles.cellAmount}>{currency(totalC("deductions"))}</td>
              <td className={styles.cellAmount}>{currency(parseFloat(batch.net_payable))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function itemsTotal(items: BatchItem[], field: keyof BatchItem): number {
  return items.reduce((s, i) => s + parseFloat(i[field] as string), 0);
}
