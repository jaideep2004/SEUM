"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/services/api";
import { useLanguage, formatDate, formatNumber, formatCurrency } from "@/lib/i18n";
import styles from "./page.module.css";

export default function NewBankAccountPage() {
  const { lang, t } = useLanguage();
  const router = useRouter();
  const [form, setForm] = useState({ bank_name: "", account_number: "", account_type: "checking", opening_balance: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.bank_name || !form.account_number) { setError(t("finance.bankNew.required")); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API_URL}/api/v1/accounting/banking/accounts`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, opening_balance: form.opening_balance ? parseFloat(form.opening_balance) : 0 }),
      });
      const json = await res.json();
      if (json.success) router.push(`/dashboard/accounting/bank-accounts/${json.data.id}`);
      else setError(json.error || t("finance.bankNew.failed"));
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t("finance.bankNew.title")}</h1>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label}>{t("finance.bankNew.bankName")}</label>
          <input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} className={styles.input} required />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>{t("finance.bankNew.accountNumber")}</label>
          <input value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} className={styles.input} required />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>{t("finance.bankNew.accountType")}</label>
          <select value={form.account_type} onChange={(e) => setForm({ ...form, account_type: e.target.value })} className={styles.input}>
            <option value="checking">{t("finance.bankNew.checking")}</option>
            <option value="savings">{t("finance.bankNew.savings")}</option>
            <option value="cash">{t("finance.bankNew.cash")}</option>
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>{t("finance.bankNew.openingBalance")}</label>
          <input type="number" step="0.01" value={form.opening_balance} onChange={(e) => setForm({ ...form, opening_balance: e.target.value })} className={styles.input} />
        </div>
        {error && <div className={styles.error}>{error}</div>}
        <div className={styles.actions}>
          <button type="submit" disabled={loading} className={styles.submitBtn}>{loading ? t("finance.bankNew.creating") : t("finance.bankNew.create")}</button>
          <button type="button" onClick={() => router.back()} className={styles.cancelBtn}>{t("finance.bankNew.cancel")}</button>
        </div>
      </form>
    </div>
  );
}
