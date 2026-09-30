"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { API_URL } from "@/services/api";
import { useLanguage, formatDate, formatNumber, formatCurrency } from "@/lib/i18n";
import styles from "./page.module.css";

interface BankTx { id: string; bank_account_id: string; bank_name: string; account_number: string; transaction_date: string; description: string; reference: string; debit: string; credit: string; }
interface Invoice { id: string; reference: string; party: string; amount: string; date: string; status: string; }
interface Expense { id: string; category: string; description: string; amount: string; date: string; status: string; }

export default function ReconciliationPage() {
  const { lang, t } = useLanguage();
  const { id } = useParams();
  const currency = (n: number): string => formatCurrency(n, lang);
  const docStatusLabel = (s: string): string => {
    const map: Record<string, string> = {
      draft: t("finance.recon.statusDraft"),
      issued: t("finance.recon.statusIssued"),
      paid: t("finance.recon.statusPaid"),
      overdue: t("finance.recon.statusOverdue"),
      cancelled: t("finance.recon.statusCancelled"),
      pending: t("finance.recon.statusPending"),
      approved: t("finance.recon.statusApproved"),
      reimbursed: t("finance.recon.statusReimbursed"),
    };
    return map[s] || s;
  };
  const [bankTxs, setBankTxs] = useState<BankTx[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [matched, setMatched] = useState<string | null>(null);

  useEffect(() => { fetchUnmatched(); }, []);

  async function fetchUnmatched() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/accounting/banking/reconciliation/unmatched`, { credentials: "include" });
      const json = await res.json();
      if (json.success) {
        setBankTxs(json.data.bankTransactions || []);
        setInvoices(json.data.invoices || []);
        setExpenses(json.data.expenses || []);
      } else setError(json.error);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleMatch(txId: string, type: "invoice" | "expense", matchId: string) {
    try {
      const res = await fetch(`${API_URL}/api/v1/accounting/banking/reconciliation/match`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transaction_id: txId, match_type: type, match_id: matchId }),
      });
      const json = await res.json();
      if (json.success) { setMatched(`${txId}-${matchId}`); setTimeout(() => { setMatched(null); fetchUnmatched(); }, 800); }
      else alert(json.error);
    } catch { alert(t("finance.recon.matchFailed")); }
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t("finance.recon.title")}</h1>
      {loading && <div className={styles.loading}>{t("finance.recon.loading")}</div>}
      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.split}>
        {/* Left: Bank Transactions */}
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>{t("finance.recon.unmatchedTx")} ({bankTxs.length})</h2>
          <div className={styles.panelBody}>
            {bankTxs.map((tx) => (
              <div key={tx.id} className={`${styles.card} ${matched?.startsWith(tx.id) ? styles.matched : ""}`}>
                <div className={styles.cardHead}>
                  <span className={styles.txDate}>{formatDate(tx.transaction_date, lang)}</span>
                  <span className={styles.txAmount}>{tx.credit !== "0" ? currency(parseFloat(tx.credit)) : currency(parseFloat(tx.debit))}</span>
                </div>
                <div className={styles.txDesc}>{tx.description || tx.reference || t("finance.recon.noDescription")}</div>
                <div className={styles.txAccount}>{tx.bank_name} · {tx.account_number}</div>
              </div>
            ))}
            {bankTxs.length === 0 && !loading && <div className={styles.empty}>{t("finance.recon.allCleared")}</div>}
          </div>
        </div>

        {/* Right: Invoices & Expenses */}
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>{t("finance.recon.unmatchedDocs")} ({invoices.length + expenses.length})</h2>
          <div className={styles.panelBody}>
            {invoices.length > 0 && <h3 className={styles.subTitle}>{t("finance.recon.invoices")}</h3>}
            {invoices.map((inv) => (
              <div key={inv.id} className={`${styles.card} ${styles.matchable}`} onClick={() => bankTxs.length === 1 && handleMatch(bankTxs[0].id, "invoice", inv.id)}>
                <div className={styles.cardHead}>
                  <span className={styles.refBadge}>{inv.reference}</span>
                  <span className={styles.txAmount}>{currency(parseFloat(inv.amount))}</span>
                </div>
                <div className={styles.txDesc}>{inv.party}</div>
                <div className={styles.txAccount}>{t("finance.recon.due")} {formatDate(inv.date, lang)} · {docStatusLabel(inv.status)}</div>
                <button onClick={(e) => { e.stopPropagation(); /* show match dialog */ }} className={styles.matchBtn}>{t("finance.recon.match")}</button>
              </div>
            ))}

            {expenses.length > 0 && <h3 className={styles.subTitle}>{t("finance.recon.expenses")}</h3>}
            {expenses.map((exp) => (
              <div key={exp.id} className={`${styles.card} ${styles.matchable}`}>
                <div className={styles.cardHead}>
                  <span className={styles.refBadge}>{exp.category}</span>
                  <span className={styles.txAmount}>{currency(parseFloat(exp.amount))}</span>
                </div>
                <div className={styles.txDesc}>{exp.description || "—"}</div>
                <div className={styles.txAccount}>{formatDate(exp.date, lang)} · {docStatusLabel(exp.status)}</div>
                <button onClick={(e) => { e.stopPropagation(); handleMatchWithSelection(exp.id, "expense"); }} className={styles.matchBtn}>{t("finance.recon.match")}</button>
              </div>
            ))}

            {invoices.length === 0 && expenses.length === 0 && !loading && <div className={styles.empty}>{t("finance.recon.allMatched")}</div>}
          </div>
        </div>
      </div>

      {/* Manual match modal */}
      <MatchModal bankTxs={bankTxs} invoices={invoices} expenses={expenses} onMatch={handleMatch} />
    </div>
  );
}

function handleMatchWithSelection(expenseId: string, type: "expense") {
  // Triggered via the inline buttons; actual matching done via modal
  const event = new CustomEvent("open-match-modal", { detail: { type, id: expenseId } });
  window.dispatchEvent(event);
}

function MatchModal({ bankTxs, invoices, expenses, onMatch }: {
  bankTxs: BankTx[]; invoices: Invoice[]; expenses: Expense[];
  onMatch: (txId: string, type: "invoice" | "expense", matchId: string) => void;
}) {
  const { lang, t } = useLanguage();
  const currency = (n: number): string => formatCurrency(n, lang);
  const [open, setOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState("");
  const [selectedType, setSelectedType] = useState<"invoice" | "expense">("invoice");
  const [selectedMatch, setSelectedMatch] = useState("");

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setSelectedType(detail.type);
      setOpen(true);
      setSelectedMatch("");
      setSelectedTx("");
    };
    window.addEventListener("open-match-modal", handler);
    return () => window.removeEventListener("open-match-modal", handler);
  }, []);

  async function confirm() {
    if (!selectedTx || !selectedMatch) return;
    onMatch(selectedTx, selectedType, selectedMatch);
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={() => setOpen(false)}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.modalTitle}>{t("finance.recon.matchTitle")}</h3>

        <div className={styles.modalField}>
          <label className={styles.modalLabel}>{t("finance.recon.bankTx")}</label>
          <select value={selectedTx} onChange={(e) => setSelectedTx(e.target.value)} className={styles.modalSelect}>
            <option value="">{t("finance.recon.select")}</option>
            {bankTxs.map((tx) => (
              <option key={tx.id} value={tx.id}>
                {tx.transaction_date} — {tx.description || tx.reference} ({tx.credit !== "0" ? currency(parseFloat(tx.credit)) : currency(parseFloat(tx.debit))})
              </option>
            ))}
          </select>
        </div>

        <div className={styles.modalField}>
          <label className={styles.modalLabel}>{t("finance.recon.matchType")}</label>
          <div className={styles.modalToggle}>
            <button className={`${styles.toggleBtn} ${selectedType === "invoice" ? styles.toggleActive : ""}`} onClick={() => setSelectedType("invoice")}>{t("finance.recon.invoice")}</button>
            <button className={`${styles.toggleBtn} ${selectedType === "expense" ? styles.toggleActive : ""}`} onClick={() => setSelectedType("expense")}>{t("finance.recon.expense")}</button>
          </div>
        </div>

        <div className={styles.modalField}>
          <label className={styles.modalLabel}>{selectedType === "invoice" ? t("finance.recon.invoice") : t("finance.recon.expense")}</label>
          <select value={selectedMatch} onChange={(e) => setSelectedMatch(e.target.value)} className={styles.modalSelect}>
            <option value="">{t("finance.recon.select")}</option>
            {(selectedType === "invoice" ? invoices : expenses).map((item: any) => (
              <option key={item.id} value={item.id}>
                {item.reference || item.category} — {item.party || item.description} ({currency(parseFloat(item.amount))})
              </option>
            ))}
          </select>
        </div>

        <div className={styles.modalActions}>
          <button onClick={confirm} disabled={!selectedTx || !selectedMatch} className={styles.matchConfirmBtn}>{t("finance.recon.confirmMatch")}</button>
          <button onClick={() => setOpen(false)} className={styles.cancelBtn}>{t("finance.recon.cancel")}</button>
        </div>
      </div>
    </div>
  );
}
