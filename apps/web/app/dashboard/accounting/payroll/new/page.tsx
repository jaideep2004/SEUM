"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/services/api";
import styles from "./page.module.css";

function fmt(n: number): string { return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function currency(n: number): string { return `SAR ${fmt(n)}`; }

export default function NewPayrollBatchPage() {
  const router = useRouter();
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!periodStart || !periodEnd) { setError("Select both dates"); return; }
    if (new Date(periodStart) >= new Date(periodEnd)) { setError("Start must be before end"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/v1/accounting/payroll/batches`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period_start: periodStart, period_end: periodEnd }),
      });
      const json = await res.json();
      if (json.success) router.push(`/dashboard/accounting/payroll/${json.data.id}`);
      else setError(json.error || "Failed to create batch");
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Create Payroll Batch</h1>
      <p className={styles.subtitle}>Select a pay period. The system will automatically pull active drivers and calculate salaries, trip allowances, and overtime.</p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label}>Period Start</label>
          <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className={styles.input} required />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Period End</label>
          <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className={styles.input} required />
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.actions}>
          <button type="submit" disabled={loading} className={styles.submitBtn}>
            {loading ? "Creating..." : "Generate Payroll Batch"}
          </button>
          <button type="button" onClick={() => router.back()} className={styles.cancelBtn}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
