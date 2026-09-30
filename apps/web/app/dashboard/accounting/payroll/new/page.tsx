"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/services/api";
import { useLanguage, formatDate, formatNumber, formatCurrency } from "@/lib/i18n";
import styles from "./page.module.css";

export default function NewPayrollBatchPage() {
  const { lang, t } = useLanguage();
  const router = useRouter();
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!periodStart || !periodEnd) { setError(t("finance.payNew.selectBoth")); return; }
    if (new Date(periodStart) >= new Date(periodEnd)) { setError(t("finance.payNew.startBeforeEnd")); return; }
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
      else setError(json.error || t("finance.payNew.failed"));
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t("finance.payNew.title")}</h1>
      <p className={styles.subtitle}>{t("finance.payNew.subtitle")}</p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label}>{t("finance.payNew.periodStart")}</label>
          <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className={styles.input} required />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>{t("finance.payNew.periodEnd")}</label>
          <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className={styles.input} required />
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.actions}>
          <button type="submit" disabled={loading} className={styles.submitBtn}>
            {loading ? t("finance.payNew.creating") : t("finance.payNew.generate")}
          </button>
          <button type="button" onClick={() => router.back()} className={styles.cancelBtn}>{t("finance.payNew.cancel")}</button>
        </div>
      </form>
    </div>
  );
}
