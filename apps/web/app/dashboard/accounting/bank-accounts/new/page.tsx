"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/services/api";
import styles from "./page.module.css";

export default function NewBankAccountPage() {
  const router = useRouter();
  const [form, setForm] = useState({ bank_name: "", account_number: "", account_type: "checking", opening_balance: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.bank_name || !form.account_number) { setError("Bank name and account number are required"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API_URL}/api/v1/accounting/banking/accounts`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, opening_balance: form.opening_balance ? parseFloat(form.opening_balance) : 0 }),
      });
      const json = await res.json();
      if (json.success) router.push(`/dashboard/accounting/bank-accounts/${json.data.id}`);
      else setError(json.error || "Failed to create");
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Add Bank Account</h1>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label}>Bank Name</label>
          <input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} className={styles.input} required />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Account Number</label>
          <input value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} className={styles.input} required />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Account Type</label>
          <select value={form.account_type} onChange={(e) => setForm({ ...form, account_type: e.target.value })} className={styles.input}>
            <option value="checking">Checking</option>
            <option value="savings">Savings</option>
            <option value="cash">Cash</option>
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Opening Balance (SAR)</label>
          <input type="number" step="0.01" value={form.opening_balance} onChange={(e) => setForm({ ...form, opening_balance: e.target.value })} className={styles.input} />
        </div>
        {error && <div className={styles.error}>{error}</div>}
        <div className={styles.actions}>
          <button type="submit" disabled={loading} className={styles.submitBtn}>{loading ? "Creating..." : "Create Account"}</button>
          <button type="button" onClick={() => router.back()} className={styles.cancelBtn}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
