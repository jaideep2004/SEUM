"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { API_URL } from "@/services/api";
import styles from "./page.module.css";

function currency(n: number): string { return `SAR ${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`; }

interface Account { id: string; bank_name: string; account_number: string; account_type: string; opening_balance: string; current_balance: string; is_active: boolean; }

const TYPE_COLORS: Record<string, string> = { checking: "#60a5fa", savings: "#34d399", cash: "#fbbf24" };

export default function BankAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { fetchAccounts(); }, []);

  async function fetchAccounts() {
    try {
      const res = await fetch(`${API_URL}/api/v1/accounting/banking/accounts`, { credentials: "include" });
      const json = await res.json();
      if (json.success) setAccounts(json.data);
      else setError(json.error);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Bank Accounts</h1>
        <Link href="/dashboard/accounting/bank-accounts/new" className={styles.createBtn}>+ Add Account</Link>
      </div>

      {loading && <div className={styles.loading}>Loading...</div>}
      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.grid}>
        {accounts.map((a) => (
          <Link key={a.id} href={`/dashboard/accounting/bank-accounts/${a.id}`} className={styles.card}>
            <div className={styles.cardTop}>
              <span className={styles.bankName}>{a.bank_name}</span>
              <span className={styles.typeBadge} style={{ background: `${TYPE_COLORS[a.account_type]}20`, color: TYPE_COLORS[a.account_type] }}>{a.account_type}</span>
            </div>
            <div className={styles.acctNum}>{a.account_number}</div>
            <div className={styles.balanceRow}>
              <span className={styles.balanceLabel}>Balance</span>
              <span className={styles.balanceValue}>{currency(parseFloat(a.current_balance))}</span>
            </div>
          </Link>
        ))}
        {!loading && accounts.length === 0 && <div className={styles.empty}>No bank accounts yet</div>}
      </div>
    </div>
  );
}
