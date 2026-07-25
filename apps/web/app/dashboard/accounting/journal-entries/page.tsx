"use client";
import { useState, useEffect } from "react";
import { Plus, X, ArrowUpRight, Trash2 } from "lucide-react";
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

function formatCurrency(v: number) {
  return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function JournalEntriesPage() {
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
        <h1>Journal Entries</h1>
        <button className={`${styles.actionBtn} ${styles.primaryBtn}`} onClick={openCreate}>
          <Plus size={14} /> New Entry
        </button>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading journal entries...</div>
      ) : entries.length === 0 ? (
        <div className={styles.loading}>No journal entries found</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Entry #</th>
                <th>Date</th>
                <th>Description</th>
                <th>Lines</th>
                <th>Total Debit</th>
                <th>Total Credit</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id} onClick={() => openDetail(e)}>
                  <td className={styles.entryNumber}>{e.entryNumber}</td>
                  <td>{e.date}</td>
                  <td>{e.description || "—"}</td>
                  <td>{e.lineCount}</td>
                  <td>{formatCurrency(e.totalDebit)}</td>
                  <td>{formatCurrency(e.totalCredit)}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${e.status === "posted" ? styles.statusPosted : styles.statusDraft}`}>
                      {e.status}
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
            <h2>New Journal Entry</h2>
            <form onSubmit={handleCreate}>
              <div className={styles.field}>
                <label>Date *</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
              </div>
              <div className={styles.field}>
                <label>Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className={styles.field}>
                <label>Reference Type</label>
                <input value={form.reference_type} onChange={e => setForm({ ...form, reference_type: e.target.value })} placeholder="e.g. invoice, payment" />
              </div>
              <div className={styles.field}>
                <label>Reference ID</label>
                <input value={form.reference_id} onChange={e => setForm({ ...form, reference_id: e.target.value })} placeholder="UUID" />
              </div>

              <div className={styles.lineItemsSection}>
                <h3>Line Items</h3>
                <table className={styles.lineTable}>
                  <thead>
                    <tr>
                      <th style={{ width: "36%" }}>Account</th>
                      <th style={{ width: "16%" }}>Debit</th>
                      <th style={{ width: "16%" }}>Credit</th>
                      <th>Description</th>
                      <th style={{ width: 32 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.lines.map((line, i) => (
                      <tr key={line.id}>
                        <td>
                          <select value={line.account_id} onChange={e => updateLine(i, "account_id", e.target.value)} required>
                            <option value="">Select account</option>
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
                          <input value={line.description} onChange={e => updateLine(i, "description", e.target.value)} placeholder="Optional" />
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
                  <span>Debit: <strong>{formatCurrency(totals.debit)}</strong></span>
                  <span>Credit: <strong>{formatCurrency(totals.credit)}</strong></span>
                </div>
                {!isBalanced && <div className={styles.balanceError}>Debits must equal credits (diff: {formatCurrency(Math.abs(totals.debit - totals.credit))})</div>}
                <button type="button" className={styles.addLineBtn} onClick={addLine}>
                  <Plus size={13} /> Add Line
                </button>
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={`${styles.actionBtn} ${styles.secondaryBtn}`} onClick={closeCreate}>Cancel</button>
                <button type="submit" className={`${styles.actionBtn} ${styles.primaryBtn}`} disabled={actionLoading || !isBalanced || form.lines.some(l => !l.account_id)}>
                  {actionLoading ? "Creating..." : "Create Entry"}
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
              <span className={styles.infoLabel}>Date</span>
              <span className={styles.infoValue}>{detailTarget.date}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Status</span>
              <span className={styles.infoValue}>
                <span className={`${styles.statusBadge} ${detailTarget.status === "posted" ? styles.statusPosted : styles.statusDraft}`}>
                  {detailTarget.status}
                </span>
              </span>
            </div>
            {detailTarget.description && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Description</span>
                <span className={styles.infoValue}>{detailTarget.description}</span>
              </div>
            )}
            {detailTarget.referenceType && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Reference</span>
                <span className={styles.infoValue}>{detailTarget.referenceType} {detailTarget.referenceId ? `(${detailTarget.referenceId.slice(0, 8)}...)` : ""}</span>
              </div>
            )}
            {detailTarget.createdByName && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Created By</span>
                <span className={styles.infoValue}>{detailTarget.createdByName}</span>
              </div>
            )}
            {detailTarget.postedAt && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Posted At</span>
                <span className={styles.infoValue}>{new Date(detailTarget.postedAt).toLocaleString()}</span>
              </div>
            )}

            <div className={styles.detailLines}>
              <h3>Lines</h3>
              <table className={styles.detailLineTable}>
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Debit</th>
                    <th>Credit</th>
                    <th>Running Bal.</th>
                  </tr>
                </thead>
                <tbody>
                  {detailTarget.lines?.map((l: any) => (
                    <tr key={l.id}>
                      <td>{l.accountCode} — {l.accountName}</td>
                      <td>{l.debitAmount > 0 ? formatCurrency(l.debitAmount) : "—"}</td>
                      <td>{l.creditAmount > 0 ? formatCurrency(l.creditAmount) : "—"}</td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(l.runningBalance)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 700, borderTop: "2px solid var(--color-border)" }}>
                    <td>Totals</td>
                    <td>{formatCurrency(columnTotals.debit)}</td>
                    <td>{formatCurrency(columnTotals.credit)}</td>
                    <td>{formatCurrency(columnTotals.debit - columnTotals.credit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {detailTarget.status === "draft" && (
              <button
                className={`${styles.actionBtn} ${styles.primaryBtn} ${styles.postBtn}`}
                onClick={() => setConfirmPost(detailTarget)}
              >
                <ArrowUpRight size={14} /> Post Entry
              </button>
            )}
          </div>
        </div>
      )}

      {/* Confirm Post */}
      {confirmPost && (
        <div className={styles.confirmOverlay} onClick={() => setConfirmPost(null)}>
          <div className={styles.confirmModal} onClick={e => e.stopPropagation()}>
            <h3>Post Journal Entry</h3>
            <p>This will lock entry <strong>{confirmPost.entryNumber}</strong> and make it immutable. Continue?</p>
            <div className={styles.confirmActions}>
              <button className={`${styles.actionBtn} ${styles.secondaryBtn}`} onClick={() => setConfirmPost(null)}>Cancel</button>
              <button className={`${styles.actionBtn} ${styles.dangerBtn}`} onClick={handlePost} disabled={actionLoading}>
                {actionLoading ? "Posting..." : "Yes, Post Entry"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
