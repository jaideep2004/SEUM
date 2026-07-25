"use client";
import { useState, useEffect } from "react";
import { ChevronRight, ChevronDown, Plus, X, Edit3 } from "lucide-react";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const TYPE_COLORS: Record<string, string> = {
  asset: "#3b82f6", liability: "#f59e0b", equity: "#8b5cf6",
  revenue: "#059669", expense: "#dc2626",
};
const ACCOUNT_TYPES = ["asset", "liability", "equity", "revenue", "expense"];

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("seum_access_token");
}

function TreeNode({ node, depth, onSelect, onEdit }: { node: any; depth: number; onSelect: (a: any) => void; onEdit: (a: any) => void }) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = node.children?.length > 0;

  return (
    <div className={styles.treeItem}>
      <div className={styles.treeRow} onClick={() => onSelect(node)}>
        <button className={styles.expandBtn} onClick={e => { e.stopPropagation(); if (hasChildren) setOpen(!open); }}
          style={{ visibility: hasChildren ? "visible" : "hidden" }}>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <div className={styles.treeRowContent}>
          <span className={styles.accountCode}>{node.code}</span>
          <span className={styles.accountName}>{node.name}</span>
          {node.description && <span className={styles.accountDesc}>{node.description}</span>}
          <span className={styles.typeBadge} style={{ background: (TYPE_COLORS[node.type] || "#6b7280") + "20", color: TYPE_COLORS[node.type] || "#6b7280" }}>
            {node.type}
          </span>
        </div>
        <button className={styles.expandBtn} onClick={e => { e.stopPropagation(); onEdit(node); }} title="Edit">
          <Edit3 size={13} />
        </button>
      </div>
      {open && hasChildren && (
        <div className={styles.children}>
          {node.children.map((child: any) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} onSelect={onSelect} onEdit={onEdit} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ChartOfAccountsPage() {
  const [tree, setTree] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [detailTarget, setDetailTarget] = useState<any>(null);
  const [form, setForm] = useState({ code: "", name: "", type: "asset", parent_account_id: "", description: "" });
  const [actionLoading, setActionLoading] = useState(false);

  async function fetchAccounts() {
    setLoading(true);
    const token = getToken();
    try {
      const res = await fetch(`${API}/accounts`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setTree(data.data.tree || []);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { fetchAccounts(); }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading(true);
    const token = getToken();
    const body: any = {
      code: form.code, name: form.name, type: form.type,
      description: form.description || undefined,
    };
    if (form.parent_account_id) body.parent_account_id = form.parent_account_id;

    try {
      const url = editTarget
        ? `${API}/accounts/${editTarget.id}`
        : `${API}/accounts`;
      const method = editTarget ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setCreateOpen(false);
        setEditTarget(null);
        setForm({ code: "", name: "", type: "asset", parent_account_id: "", description: "" });
        fetchAccounts();
      }
    } catch {}
    setActionLoading(false);
  }

  function openEdit(account: any) {
    setForm({
      code: account.code, name: account.name, type: account.type,
      parent_account_id: account.parentAccountId || "",
      description: account.description || "",
    });
    setEditTarget(account);
    setCreateOpen(true);
  }

  function openCreate(parentId?: string) {
    setForm({ code: "", name: "", type: "asset", parent_account_id: parentId || "", description: "" });
    setEditTarget(null);
    setCreateOpen(true);
  }

  const flattenAccounts = (nodes: any[]): any[] => {
    const result: any[] = [];
    const walk = (list: any[]) => { list.forEach(n => { result.push(n); if (n.children) walk(n.children); }); };
    walk(nodes);
    return result;
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}><h1>Chart of Accounts</h1></div>
        <button className={`${styles.actionBtn} ${styles.primaryBtn}`} onClick={() => openCreate()}>
          <Plus size={14} /> New Account
        </button>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading accounts...</div>
      ) : tree.length === 0 ? (
        <div className={styles.loading}>No accounts found</div>
      ) : (
        <div className={styles.treeWrap}>
          {tree.map((node: any) => (
            <TreeNode key={node.id} node={node} depth={0} onSelect={setDetailTarget} onEdit={openEdit} />
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {createOpen && (
        <div className={styles.overlay} onClick={() => { setCreateOpen(false); setEditTarget(null); }}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>{editTarget ? "Edit Account" : "New Account"}</h2>
            <form onSubmit={handleSave}>
              <div className={styles.field}>
                <label>Code *</label>
                <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="e.g. 1200" required />
              </div>
              <div className={styles.field}>
                <label>Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Accounts Receivable" required />
              </div>
              <div className={styles.field}>
                <label>Type *</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label>Parent Account</label>
                <select value={form.parent_account_id} onChange={e => setForm({ ...form, parent_account_id: e.target.value })}>
                  <option value="">None (Root)</option>
                  {flattenAccounts(tree).filter((a: any) => a.id !== editTarget?.id).map((a: any) => (
                    <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label>Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={`${styles.actionBtn} ${styles.secondaryBtn}`} onClick={() => { setCreateOpen(false); setEditTarget(null); }}>Cancel</button>
                <button type="submit" className={`${styles.actionBtn} ${styles.primaryBtn}`} disabled={actionLoading}>
                  {actionLoading ? "Saving..." : editTarget ? "Update" : "Create"}
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
              <h2>{detailTarget.code} — {detailTarget.name}</h2>
              <button className={styles.closeBtn} onClick={() => setDetailTarget(null)}><X size={18} /></button>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Code</span>
              <span className={styles.infoValue}>{detailTarget.code}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Name</span>
              <span className={styles.infoValue}>{detailTarget.name}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Type</span>
              <span className={styles.infoValue}>{detailTarget.type}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Status</span>
              <span className={styles.infoValue}>{detailTarget.isActive ? "Active" : "Inactive"}</span>
            </div>
            {detailTarget.description && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Description</span>
                <span className={styles.infoValue}>{detailTarget.description}</span>
              </div>
            )}
            {detailTarget.parentCode && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Parent</span>
                <span className={styles.infoValue}>{detailTarget.parentCode} — {detailTarget.parentName}</span>
              </div>
            )}
            <div style={{ marginTop: 24 }}>
              <div className={styles.infoLabel} style={{ marginBottom: 8 }}>Child Accounts ({detailTarget.childCount || 0})</div>
              {detailTarget.childCount === 0 ? (
                <p style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>No child accounts</p>
              ) : (
                <p style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Expand in tree view to see children</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
