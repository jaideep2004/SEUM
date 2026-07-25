"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { API_URL } from "@/services/api";
import styles from "./page.module.css";

function currency(n: number): string { return `SAR ${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`; }

interface Account { id: string; bank_name: string; account_number: string; account_type: string; current_balance: string; }
interface Tx { id: string; transaction_date: string; description: string; reference: string; debit: string; credit: string; reconciled: boolean; matched_invoice_id: string | null; matched_expense_id: string | null; }

export default function AccountDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showReconciled, setShowReconciled] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { fetchData(); }, [id, showReconciled]);

  async function fetchData() {
    setLoading(true);
    try {
      const [acctRes, txRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/accounting/banking/accounts/${id}`, { credentials: "include" }),
        fetch(`${API_URL}/api/v1/accounting/banking/accounts/${id}/transactions?reconciled=${showReconciled}`, { credentials: "include" }),
      ]);
      const acctJson = await acctRes.json();
      const txJson = await txRes.json();
      if (acctJson.success) setAccount(acctJson.data);
      else setError(acctJson.error);
      if (txJson.success) setTxs(txJson.data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleCsvUpload() {
    if (!csvFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", csvFile);
      const res = await fetch(`${API_URL}/api/v1/accounting/banking/accounts/${id}/transactions/csv`, {
        method: "POST", credentials: "include", body: formData,
      });
      const json = await res.json();
      if (json.success) { setCsvFile(null); fetchData(); }
      else alert(json.error);
    } catch { alert("Upload failed"); }
    finally { setUploading(false); }
  }

  if (loading && !account) return <div className={styles.loading}>Loading...</div>;
  if (error && !account) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{account?.bank_name}</h1>
          <p className={styles.acctNum}>{account?.account_number} · {account?.account_type}</p>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.balance}>Balance: {currency(parseFloat(account?.current_balance || "0"))}</span>
        </div>
      </div>

      {/* CSV Upload */}
      <div className={styles.uploadSection}>
        <h3 className={styles.sectionTitle}>Import Transactions (CSV)</h3>
        <div className={styles.uploadRow}>
          <input type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files?.[0] || null)} className={styles.fileInput} />
          <button onClick={handleCsvUpload} disabled={!csvFile || uploading} className={styles.uploadBtn}>{uploading ? "Uploading..." : "Upload"}</button>
        </div>
        <p className={styles.hint}>CSV must have columns: date, description, reference, debit, credit</p>
      </div>

      {/* Navigation */}
      <div className={styles.navRow}>
        <button onClick={() => setShowReconciled(!showReconciled)} className={styles.toggleBtn}>
          {showReconciled ? "Hide Reconciled" : "Show Reconciled"}
        </button>
        <button onClick={() => router.push(`/dashboard/accounting/bank-accounts/${id}/reconciliation`)} className={styles.reconBtn}>
          Reconciliation
        </button>
      </div>

      {/* Transactions Table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th>Date</th><th>Description</th><th>Reference</th><th>Debit</th><th>Credit</th><th>Status</th></tr></thead>
          <tbody>
            {txs.map((tx) => (
              <tr key={tx.id} className={tx.reconciled ? styles.reconciledRow : ""}>
                <td>{tx.transaction_date}</td>
                <td>{tx.description}</td>
                <td className={styles.cellCode}>{tx.reference}</td>
                <td className={styles.cellAmount}>{tx.debit !== "0" ? currency(parseFloat(tx.debit)) : "—"}</td>
                <td className={styles.cellAmount}>{tx.credit !== "0" ? currency(parseFloat(tx.credit)) : "—"}</td>
                <td><span className={`${styles.statusBadge} ${tx.reconciled ? styles.reconciled : styles.unreconciled}`}>{tx.reconciled ? "Matched" : "Unmatched"}</span></td>
              </tr>
            ))}
            {txs.length === 0 && <tr><td colSpan={6} className={styles.emptyRow}>No transactions found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
