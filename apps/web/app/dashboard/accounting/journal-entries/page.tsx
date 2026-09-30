"use client";
import { useState, useEffect } from "react";
import { Plus, X, ArrowUpRight, Trash2 } from "lucide-react";
import { useLanguage, formatDate, formatNumber, formatCurrency, formatDateTime } from "@/lib/i18n";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("seum_access_token");
}

interface LineItem {
  id: string;
  account_id: string;
  debit_amount: number;
  credit_amount: number;
  description: string;
}

interface AccountOption {
  id: string;
  code: string;
  name: string;
  type: string;
}

export default function JournalEntriesPage() {
  const { lang, t } = useLanguage();
  const money = (v: number) => formatCurrency(v, lang);
  const STATUS_LABELS: Record<string, string> = {
    draft: t("finance.journal.statusDraft"),
    posted: t("finance.journal.statusPosted"),
  };
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<any>(null);
  const [confirmPost, setConfirmPost] = useState<any>(null);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [meta, setMeta] = useState({ total: 0, page: 1, pageSize: 20 });

  const emptyLine = (): LineItem => ({
    id: crypto.randomUUID(), account_id: "", debit_amount: 0, credit_amount: 0, description: "",
  });

  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    reference_type: "",
    reference_id: "",
    lines: [emptyLine(), emptyLine()],
  });

  async function fetchEntries(page = 1) {
    setLoading(true);
    const token = getToken();
    try {
      const res = await fetch(`${API}/accounting/journal-entries?page=${page}&pageSize=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (d.success) { setEntries(d.data); setMeta(d.meta); }
    } catch {}
    setLoading(false);
  }

  async function fetchAccounts() {
    const token = getToken();
    try {
      const res = await fetch(`${API}/accounts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (d.success) {
        const flat: AccountOption[] = [];
        const walk = (nodes: any[]) => {
          nodes.forEach((n: any) => { flat.push({ id: n.id, code: n.code, name: n.name, type: n.type }); if (n.children) walk(n.children); });
        };
        walk(d.data.tree || []);
        setAccounts(flat);
      }
    } catch {}
  }

  useEffect(() => { fetchEntries(); }, []);

  function openCreate() {
    fetchAccounts();
    setForm({
      date: new Date().toISOString().split("T")[0],
      description: "", reference_type: "", reference_id: "",
      lines: [emptyLine(), emptyLine()],
    });
    setCreateOpen(true);
  }

  function closeCreate() { setCreateOpen(false); }

  function updateLine(idx: number, field: keyof LineItem, value: any) {
    const lines = [...form.lines];
    (lines[idx] as any)[field] = value;
    setForm({ ...form, lines });
  }

  function removeLine(idx: number) {
    if (form.lines.length <= 2) return;
    setForm({ ...form, lines: form.lines.filter((_, i) => i !== idx) });
  }

  function addLine() {
    setForm({ ...form, lines: [...form.lines, emptyLine()] });
  }

  const totals = form.lines.reduce(
    (acc, l) => ({ debit: acc.debit + l.debit_amount, credit: acc.credit + l.credit_amount }),
    { debit: 0, credit: 0 }
  );
  const isBalanced = Math.abs(totals.debit - totals.credit) < 0.01;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading(true);
    const token = getToken();
    try {
      const res = await fetch(`${API}/accounting/journal-entries`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          date: form.date,
          description: form.description || undefined,
          reference_type: form.reference_type || undefined,
          reference_id: form.reference_id || undefined,
          lines: form.lines.map(l => ({
            account_id: l.account_id,
            debit_amount: l.debit_amount || 0,
            credit_amount: l.credit_amount || 0,
            description: l.description || undefined,
          })),
        }),
      });
      const d = await res.json();
      if (d.success) { closeCreate(); fetchEntries(); }
    } catch {}
    setActionLoading(false);
  }

  async function openDetail(entry: any) {
    const token = getToken();
    try {
      const res = await fetch(`${API}/accounting/journal-entries/${entry.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (d.success) setDetailTarget(d.data);
    } catch {}
  }

  async function handlePost() {
    if (!confirmPost) return;
    setActionLoading(true);
    const token = getToken();
    try {
      const res = await fetch(`${API}/accounting/journal-entries/${confirmPost.id}/post`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (d.success) {
        setConfirmPost(null);
        setDetailTarget(d.data);
        fetchEntries();
      }
    } catch {}
    setActionLoading(false);
  }

  const columnTotals = detailTarget
    ? detailTarget.lines?.reduce(
        (acc: any, l: any) => ({ debit: acc.debit + l.debitAmount, credit: acc.credit + l.creditAmount }),
        { debit: 0, credit: 0 }
      )
    : { debit: 0, credit: 0 };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>{t("finance.journal.title")}</h1>
        <button className={`${styles.actionBtn} ${styles.primaryBtn}`} onClick={openCreate}>
          <Plus size={14} /> {t("finance.journal.new")}
        </button>
      </div>

      {loading ? (
        <div className={styles.loading}>{t("finance.journal.loading")}</div>
      ) : entries.length === 0 ? (
        <div className={styles.loading}>{t("finance.journal.empty")}</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("finance.journal.colNum")}</th>
                <th>{t("finance.journal.colDate")}</th>
                <th>{t("finance.journal.colDescription")}</th>
                <th>{t("finance.journal.colLines")}</th>
                <th>{t("finance.journal.colDebit")}</th>
                <th>{t("finance.journal.colCredit")}</th>
                <th>{t("finance.journal.colStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id} onClick={() => openDetail(e)}>
                  <td className={styles.entryNumber}>{e.entryNumber}</td>
                  <td>{formatDate(e.date, lang)}</td>
                  <td>{e.description || "—"}</td>
                  <td>{e.lineCount}</td>
                  <td>{money(e.totalDebit)}</td>
                  <td>{money(e.totalCredit)}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${e.status === "posted" ? styles.statusPosted : styles.statusDraft}`}>
                      {STATUS_LABELS[e.status] || e.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {createOpen && (
        <div className={styles.overlay} onClick={closeCreate}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>{t("finance.journal.createTitle")}</h2>
            <form onSubmit={handleCreate}>
              <div className={styles.field}>
                <label>{t("finance.journal.fDate")}</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
              </div>
              <div className={styles.field}>
                <label>{t("finance.journal.fDescription")}</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className={styles.field}>
                <label>{t("finance.journal.fRefType")}</label>
                <input value={form.reference_type} onChange={e => setForm({ ...form, reference_type: e.target.value })} placeholder={t("finance.journal.refTypePh")} />
              </div>
              <div className={styles.field}>
                <label>{t("finance.journal.fRefId")}</label>
                <input value={form.reference_id} onChange={e => setForm({ ...form, reference_id: e.target.value })} placeholder={t("finance.journal.refIdPh")} />
              </div>

              <div className={styles.lineItemsSection}>
                <h3>{t("finance.journal.lineItems")}</h3>
                <table className={styles.lineTable}>
                  <thead>
                    <tr>
                      <th style={{ width: "36%" }}>{t("finance.journal.liAccount")}</th>
                      <th style={{ width: "16%" }}>{t("finance.journal.liDebit")}</th>
                      <th style={{ width: "16%" }}>{t("finance.journal.liCredit")}</th>
                      <th>{t("finance.journal.liDescription")}</th>
                      <th style={{ width: 32 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.lines.map((line, i) => (
                      <tr key={line.id}>
                        <td>
                          <select value={line.account_id} onChange={e => updateLine(i, "account_id", e.target.value)} required>
                            <option value="">{t("finance.journal.selectAccount")}</option>
                            {accounts.map(a => (
                              <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input type="number" step="0.01" min="0" value={line.debit_amount || ""}
                            onChange={e => updateLine(i, "debit_amount", parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td>
                          <input type="number" step="0.01" min="0" value={line.credit_amount || ""}
                            onChange={e => updateLine(i, "credit_amount", parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td>
                          <input value={line.description} onChange={e => updateLine(i, "description", e.target.value)} placeholder={t("finance.journal.lineDescPh")} />
                        </td>
                        <td>
                          {form.lines.length > 2 && (
                            <button type="button" className={styles.removeBtn} onClick={() => removeLine(i)}>
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className={styles.lineTotal}>
                  <span>{t("finance.journal.totDebit")} <strong>{money(totals.debit)}</strong></span>
                  <span>{t("finance.journal.totCredit")} <strong>{money(totals.credit)}</strong></span>
                </div>
                {!isBalanced && <div className={styles.balanceError}>{t("finance.journal.balanceErrorPre")}{money(Math.abs(totals.debit - totals.credit))})</div>}
                <button type="button" className={styles.addLineBtn} onClick={addLine}>
                  <Plus size={13} /> {t("finance.journal.addLine")}
                </button>
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={`${styles.actionBtn} ${styles.secondaryBtn}`} onClick={closeCreate}>{t("finance.journal.cancel")}</button>
                <button type="submit" className={`${styles.actionBtn} ${styles.primaryBtn}`} disabled={actionLoading || !isBalanced || form.lines.some(l => !l.account_id)}>
                  {actionLoading ? t("finance.journal.creating") : t("finance.journal.create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Slideover */}
      {detailTarget && (
        <div className={styles.slideover} onClick={() => setDetailTarget(null)}>
          <div className={styles.slideoverPanel} onClick={e => e.stopPropagation()}>
            <div className={styles.slideoverHeader}>
              <h2>{detailTarget.entryNumber}</h2>
              <button className={styles.closeBtn} onClick={() => setDetailTarget(null)}><X size={18} /></button>
            </div>

            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>{t("finance.journal.infoDate")}</span>
              <span className={styles.infoValue}>{formatDate(detailTarget.date, lang)}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>{t("finance.journal.infoStatus")}</span>
              <span className={styles.infoValue}>
                <span className={`${styles.statusBadge} ${detailTarget.status === "posted" ? styles.statusPosted : styles.statusDraft}`}>
                  {STATUS_LABELS[detailTarget.status] || detailTarget.status}
                </span>
              </span>
            </div>
            {detailTarget.description && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>{t("finance.journal.infoDescription")}</span>
                <span className={styles.infoValue}>{detailTarget.description}</span>
              </div>
            )}
            {detailTarget.referenceType && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>{t("finance.journal.infoReference")}</span>
                <span className={styles.infoValue}>{detailTarget.referenceType} {detailTarget.referenceId ? `(${detailTarget.referenceId.slice(0, 8)}...)` : ""}</span>
              </div>
            )}
            {detailTarget.createdByName && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>{t("finance.journal.infoCreatedBy")}</span>
                <span className={styles.infoValue}>{detailTarget.createdByName}</span>
              </div>
            )}
            {detailTarget.postedAt && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>{t("finance.journal.infoPostedAt")}</span>
                <span className={styles.infoValue}>{formatDateTime(detailTarget.postedAt, lang)}</span>
              </div>
            )}

            <div className={styles.detailLines}>
              <h3>{t("finance.journal.detailLines")}</h3>
              <table className={styles.detailLineTable}>
                <thead>
                  <tr>
                    <th>{t("finance.journal.dlAccount")}</th>
                    <th>{t("finance.journal.dlDebit")}</th>
                    <th>{t("finance.journal.dlCredit")}</th>
                    <th>{t("finance.journal.dlRunning")}</th>
                  </tr>
                </thead>
                <tbody>
                  {detailTarget.lines?.map((l: any) => (
                    <tr key={l.id}>
                      <td>{l.accountCode} — {l.accountName}</td>
                      <td>{l.debitAmount > 0 ? money(l.debitAmount) : "—"}</td>
                      <td>{l.creditAmount > 0 ? money(l.creditAmount) : "—"}</td>
                      <td style={{ fontWeight: 600 }}>{money(l.runningBalance)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 700, borderTop: "2px solid var(--color-border)" }}>
                    <td>{t("finance.journal.totals")}</td>
                    <td>{money(columnTotals.debit)}</td>
                    <td>{money(columnTotals.credit)}</td>
                    <td>{money(columnTotals.debit - columnTotals.credit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {detailTarget.status === "draft" && (
              <button
                className={`${styles.actionBtn} ${styles.primaryBtn} ${styles.postBtn}`}
                onClick={() => setConfirmPost(detailTarget)}
              >
                <ArrowUpRight size={14} /> {t("finance.journal.post")}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Confirm Post */}
      {confirmPost && (
        <div className={styles.confirmOverlay} onClick={() => setConfirmPost(null)}>
          <div className={styles.confirmModal} onClick={e => e.stopPropagation()}>
            <h3>{t("finance.journal.confirmPostTitle")}</h3>
            <p>{t("finance.journal.confirmPostPre")} <strong>{confirmPost.entryNumber}</strong> {t("finance.journal.confirmPostSuf")}</p>
            <div className={styles.confirmActions}>
              <button className={`${styles.actionBtn} ${styles.secondaryBtn}`} onClick={() => setConfirmPost(null)}>{t("finance.journal.cancel")}</button>
              <button className={`${styles.actionBtn} ${styles.dangerBtn}`} onClick={handlePost} disabled={actionLoading}>
                {actionLoading ? t("finance.journal.posting") : t("finance.journal.confirmPostYes")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
