"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { API_URL } from "@/services/api";
import styles from "./page.module.css";

function fmt(n: number): string { return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function currency(n: number): string { return `SAR ${fmt(n)}`; }

interface BatchItem { id: string; driver_id: string; employee_code: string | null; employee_name: string; base_salary: string; trip_allowance: string; overtime_hours: string; overtime_rate: string; overtime_pay: string; bonuses: string; deductions: string; net_pay: string; }

interface Batch { id: string; period_start: string; period_end: string; total_salaries: string; total_allowances: string; total_deductions: string; net_payable: string; employee_count: number; status: string; approved_by: string | null; paid_at: string | null; created_at: string; items: BatchItem[]; }

export default function PayrollDetailPage() {
  const { id } = useParams();
  const router = useRouter();
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
    } catch { alert("Action failed"); }
  }

  async function handleDelete() {
    if (!confirm("Delete this draft batch?")) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/accounting/payroll/batches/${id}`, { method: "DELETE", credentials: "include" });
      const json = await res.json();
      if (json.success) router.push("/dashboard/accounting/payroll");
      else alert(json.error);
    } catch { alert("Delete failed"); }
  }

  if (loading) return <div className={styles.loading}>Loading...</div>;
  if (error) return <div className={styles.error}>{error}</div>;
  if (!batch) return <div className={styles.error}>Batch not found</div>;

  const canApprove = batch.status === "draft";
  const canPay = batch.status === "approved";
  const canDelete = batch.status === "draft";
  const totalC = (n: keyof BatchItem) => itemsTotal(batch.items, n);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Payroll Batch</h1>
          <p className={styles.period}>{batch.period_start} → {batch.period_end}</p>
        </div>
        <div className={styles.badgeRow}>
          <span className={`${styles.statusBadge} ${styles[`status${batch.status}`]}`}>{batch.status}</span>
          {batch.paid_at && <span className={styles.paidDate}>Paid {new Date(batch.paid_at).toLocaleDateString()}</span>}
        </div>
      </div>

      <div className={styles.summaryCards}>
        <div className={styles.summaryCard}><span className={styles.summaryLabel}>Employees</span><span className={styles.summaryValue}>{batch.employee_count}</span></div>
        <div className={styles.summaryCard}><span className={styles.summaryLabel}>Total Salaries</span><span className={styles.summaryValue}>{currency(parseFloat(batch.total_salaries))}</span></div>
        <div className={styles.summaryCard}><span className={styles.summaryLabel}>Total Allowances</span><span className={styles.summaryValue} style={{ color: "#34d399" }}>{currency(parseFloat(batch.total_allowances))}</span></div>
        <div className={styles.summaryCard}><span className={styles.summaryLabel}>Total Deductions</span><span className={styles.summaryValue} style={{ color: "#f87171" }}>{currency(parseFloat(batch.total_deductions))}</span></div>
        <div className={`${styles.summaryCard} ${styles.netCard}`}><span className={styles.summaryLabel}>Net Payable</span><span className={styles.netValue}>{currency(parseFloat(batch.net_payable))}</span></div>
      </div>

      {(canApprove || canPay || canDelete) && (
        <div className={styles.actions}>
          {canApprove && <button onClick={() => handleAction("approve")} className={styles.approveBtn}>Approve & Post Journal</button>}
          {canPay && <button onClick={() => handleAction("pay")} className={styles.payBtn}>Mark as Paid & Post Journal</button>}
          {canDelete && <button onClick={handleDelete} className={styles.deleteBtn}>Delete Draft</button>}
        </div>
      )}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr><th>Employee</th><th>Code</th><th>Base Salary</th><th>Trip Allowance</th><th>Overtime Hrs</th><th>Overtime Pay</th><th>Bonuses</th><th>Deductions</th><th>Net Pay</th></tr>
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
              <td colSpan={2} className={styles.cellName}>Totals</td>
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
