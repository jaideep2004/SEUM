"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { API_URL } from "@/services/api";
import { useLanguage, formatDate, formatNumber, formatCurrency } from "@/lib/i18n";
import styles from "./page.module.css";

interface Account { id: string; bank_name: string; account_number: string; account_type: string; current_balance: string; }
interface Tx { id: string; transaction_date: string; description: string; reference: string; debit: string; credit: string; reconciled: boolean; matched_invoice_id: string | null; matched_expense_id: string | null; }

export default function AccountDetailPage() {
  const { lang, t } = useLanguage();
  const { id } = useParams();
  const router = useRouter();
  const currency = (n: number): string => formatCurrency(n, lang);
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
    } catch { alert(t("finance.bankDetail.uploadFailed")); }
    finally { setUploading(false); }
  }

  if (loading && !account) return <div className={styles.loading}>{t("finance.bankDetail.loading")}</div>;
  if (error && !account) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{account?.bank_name}</h1>
          <p className={styles.acctNum}>{account?.account_number} · {account?.account_type}</p>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.balance}>{t("finance.bankDetail.balance")}: {currency(parseFloat(account?.current_balance || "0"))}</span>
        </div>
      </div>

      {/* CSV Upload */}
      <div className={styles.uploadSection}>
        <h3 className={styles.sectionTitle}>{t("finance.bankDetail.importTitle")}</h3>
        <div className={styles.uploadRow}>
          <input type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files?.[0] || null)} className={styles.fileInput} />
          <button onClick={handleCsvUpload} disabled={!csvFile || uploading} className={styles.uploadBtn}>{uploading ? t("finance.bankDetail.uploading") : t("finance.bankDetail.upload")}</button>
        </div>
        <p className={styles.hint}>{t("finance.bankDetail.csvHint")}</p>
      </div>

      {/* Navigation */}
      <div className={styles.navRow}>
        <button onClick={() => setShowReconciled(!showReconciled)} className={styles.toggleBtn}>
          {showReconciled ? t("finance.bankDetail.hideReconciled") : t("finance.bankDetail.showReconciled")}
        </button>
        <button onClick={() => router.push(`/dashboard/accounting/bank-accounts/${id}/reconciliation`)} className={styles.reconBtn}>
          {t("finance.bankDetail.reconciliation")}
        </button>
      </div>

      {/* Transactions Table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th>{t("finance.bankDetail.colDate")}</th><th>{t("finance.bankDetail.colDescription")}</th><th>{t("finance.bankDetail.colReference")}</th><th>{t("finance.bankDetail.colDebit")}</th><th>{t("finance.bankDetail.colCredit")}</th><th>{t("finance.bankDetail.colStatus")}</th></tr></thead>
          <tbody>
            {txs.map((tx) => (
              <tr key={tx.id} className={tx.reconciled ? styles.reconciledRow : ""}>
                <td>{formatDate(tx.transaction_date, lang)}</td>
                <td>{tx.description}</td>
                <td className={styles.cellCode}>{tx.reference}</td>
                <td className={styles.cellAmount}>{tx.debit !== "0" ? currency(parseFloat(tx.debit)) : "—"}</td>
                <td className={styles.cellAmount}>{tx.credit !== "0" ? currency(parseFloat(tx.credit)) : "—"}</td>
                <td><span className={`${styles.statusBadge} ${tx.reconciled ? styles.reconciled : styles.unreconciled}`}>{tx.reconciled ? t("finance.bankDetail.matched") : t("finance.bankDetail.unmatched")}</span></td>
              </tr>
            ))}
            {txs.length === 0 && <tr><td colSpan={6} className={styles.emptyRow}>{t("finance.bankDetail.noTx")}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
