"use client";
import { useState, useEffect, useCallback } from "react";
import {
  MessageSquare, Send, ScrollText, Settings2, Users, Plus, Trash2, Pencil,
  Eye, Search, RefreshCw, Phone, Mail, Smartphone, MessageCircle, Check,
  AlertCircle, Clock, ShieldCheck, Zap, X
} from "lucide-react";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("seum_access_token") || localStorage.getItem("access_token");
}

async function apiFetch(path: string, opts: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(opts.headers as any) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { credentials: "include", ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok && !data.success) throw new Error(data.error?.message || data.message || `Request failed ${res.status}`);
  return data;
}

// helpers
function substituteVariables(template: string, vars: Record<string, string>): string {
  if (!template) return "";
  return template.replace(/{{\s*([a-zA-Z0-9_\-]+)\s*}}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{{${k}}}`));
}
function extractVariables(template: string): string[] {
  const s = new Set<string>();
  const re = /{{\s*([a-zA-Z0-9_\-]+)\s*}}/g;
  let m;
  while ((m = re.exec(template)) !== null) s.add(m[1]);
  return Array.from(s);
}
function fmtTime(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

type Tab = "templates" | "send" | "logs" | "settings" | "preferences";

export default function CommunicationsPage() {
  const [tab, setTab] = useState<Tab>("templates");

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}><MessageSquare size={20} /></div>
          <div>
            <h1 className={styles.title}>Communications Hub</h1>
            <p className={styles.subtitle}>WhatsApp / SMS / Email — templates, unified send, delivery logs and preferences. Multi-provider stubs (Twilio / Meta / WATI) + queue priority.</p>
          </div>
        </div>
        <div className={styles.headerStat}>
          <span className={styles.statPill}><ShieldCheck size={13} /> Provider stubs ready</span>
          <span className={styles.statPill}><Zap size={13} /> Priority queue</span>
        </div>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === "templates" ? styles.tabActive : ""}`} onClick={() => setTab("templates")}><ScrollText size={15} /> Templates</button>
        <button className={`${styles.tab} ${tab === "send" ? styles.tabActive : ""}`} onClick={() => setTab("send")}><Send size={15} /> Send Message</button>
        <button className={`${styles.tab} ${tab === "logs" ? styles.tabActive : ""}`} onClick={() => setTab("logs")}><Clock size={15} /> Message Logs</button>
        <button className={`${styles.tab} ${tab === "settings" ? styles.tabActive : ""}`} onClick={() => setTab("settings")}><Settings2 size={15} /> Provider Settings</button>
        <button className={`${styles.tab} ${tab === "preferences" ? styles.tabActive : ""}`} onClick={() => setTab("preferences")}><Users size={15} /> Customer Preferences</button>
      </div>

      {tab === "templates" && <TemplatesPanel />}
      {tab === "send" && <SendPanel />}
      {tab === "logs" && <LogsPanel />}
      {tab === "settings" && <SettingsPanel />}
      {tab === "preferences" && <PreferencesPanel />}
    </div>
  );
}

// ─────────────────────────────────────────────
// Templates
// ─────────────────────────────────────────────
function TemplatesPanel() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ template_name: "", language: "en", body_template: "", variables: [] as string[] });
  const [varInput, setVarInput] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const data = await apiFetch("/communications/whatsapp/templates");
      setItems(data.data || []);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }, []);
  useEffect(() => { fetchList(); }, [fetchList]);

  function openCreate() {
    setEditing(null);
    setForm({ template_name: "", language: "en", body_template: "Hello {{name}}, your trip {{route}} on {{date}} is confirmed. Reference: {{booking_reference}}", variables: ["name","route","date","booking_reference"] });
    setVarInput("");
    setModalOpen(true);
  }
  function openEdit(t: any) {
    setEditing(t);
    setForm({ template_name: t.templateName, language: t.language, body_template: t.bodyTemplate, variables: t.variables || [] });
    setVarInput("");
    setModalOpen(true);
  }
  function handleBodyChange(v: string) {
    setForm(prev => ({ ...prev, body_template: v }));
  }
  function autoExtract() {
    const vars = extractVariables(form.body_template);
    setForm(prev => ({ ...prev, variables: vars }));
  }
  function addVar() {
    const raw = varInput.trim().replace(/^,+|,+$/g, "");
    if (!raw) return;
    const parts = raw.split(",").map(s => s.trim()).filter(Boolean);
    const next = Array.from(new Set([...form.variables, ...parts]));
    setForm(prev => ({ ...prev, variables: next }));
    setVarInput("");
  }
  function removeVar(v: string) {
    setForm(prev => ({ ...prev, variables: prev.variables.filter(x => x !== v) }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.template_name.trim()) { setError("Template name required"); return; }
    if (!form.body_template.trim()) { setError("Body template required"); return; }
    setSaving(true); setError("");
    try {
      if (editing) {
        await apiFetch(`/communications/whatsapp/templates/${editing.id}`, { method: "PATCH", body: JSON.stringify(form) });
      } else {
        await apiFetch("/communications/whatsapp/templates", { method: "POST", body: JSON.stringify(form) });
      }
      setModalOpen(false);
      fetchList();
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  }
  async function handleDelete(t: any) {
    if (!confirm(`Delete template "${t.templateName}" (${t.language})?`)) return;
    try { await apiFetch(`/communications/whatsapp/templates/${t.id}`, { method: "DELETE" }); fetchList(); } catch (e: any) { setError(e.message); }
  }

  const previewVars: Record<string,string> = {};
  form.variables.forEach(v => { previewVars[v] = `[${v}]`; });
  // demo realistic values
  if (previewVars["name"]) previewVars["name"] = "Ahmed";
  if (previewVars["route"]) previewVars["route"] = "Jeddah → Makkah";
  if (previewVars["date"]) previewVars["date"] = "12 Sep 2026";
  if (previewVars["booking_reference"]) previewVars["booking_reference"] = "BK-8F3A21";
  const preview = substituteVariables(form.body_template, previewVars);

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <div>
          <h3><ScrollText size={16} /> WhatsApp Templates</h3>
          <p>Manage approved WhatsApp templates — variables use <code>{"{{name}}"}</code> syntax. Unified for SMS/email reuse.</p>
        </div>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={openCreate}><Plus size={14} /> New Template</button>
      </div>
      <div className={styles.cardBody}>
        {error && <div className={styles.error}>{error}</div>}
        {loading ? <div className={styles.empty}>Loading templates…</div> : items.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}><ScrollText size={28} /></div>
            <div>No templates yet — create your first one.</div>
            <div style={{ marginTop: 8, fontSize: 12, color: "#94a3b8" }}>Example: trip_confirmation, delay_alert, payment_receipt</div>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Template</th><th>Lang</th><th>Body</th><th>Variables</th><th>Created</th><th></th></tr></thead>
              <tbody>
                {items.map((t: any) => (
                  <tr key={t.id}>
                    <td><strong>{t.templateName}</strong></td>
                    <td><span className={styles.badge} style={{ background: "#f1f5f9" }}>{t.language}</span></td>
                    <td><div className={styles.bodySnippet}>{t.bodyTemplate}</div></td>
                    <td>
                      <div className={styles.templateVars}>
                        {(t.variables || []).map((v: string) => <span key={v} className={styles.varTag}>{`{{${v}}}`}</span>)}
                        {(t.variables || []).length === 0 && <span style={{ fontSize: 12, color: "#94a3b8" }}>—</span>}
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>{fmtTime(t.createdAt)}</td>
                    <td>
                      <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                        <button className={styles.btn} style={{ padding: 6 }} title="Edit" onClick={() => openEdit(t)}><Pencil size={13} /></button>
                        <button className={styles.btn} style={{ padding: 6 }} title="Delete" onClick={() => handleDelete(t)}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className={styles.modalOverlay} onClick={() => setModalOpen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <h3>{editing ? "Edit Template" : "Create Template"}</h3>
              <button className={styles.btn} style={{ padding: 6 }} onClick={() => setModalOpen(false)}><X size={14} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className={styles.modalBody}>
                {error && <div className={styles.error}>{error}</div>}
                <div className={styles.grid2}>
                  <div className={styles.field}>
                    <label>Template name <span>*</span></label>
                    <input className={styles.input} value={form.template_name} onChange={e => setForm({ ...form, template_name: e.target.value })} placeholder="e.g. trip_confirmation" />
                  </div>
                  <div className={styles.field}>
                    <label>Language</label>
                    <select className={styles.select} value={form.language} onChange={e => setForm({ ...form, language: e.target.value })}>
                      <option value="en">English (en)</option>
                      <option value="ar">Arabic (ar)</option>
                      <option value="ur">Urdu (ur)</option>
                      <option value="fr">French (fr)</option>
                    </select>
                  </div>
                </div>
                <div className={styles.field} style={{ marginTop: 12 }}>
                  <label>Body template <span>*</span> <span style={{ fontWeight: 400, color: "#64748b" }}>— use {"{{variable}}"} for substitution</span></label>
                  <textarea className={styles.textarea} rows={4} value={form.body_template} onChange={e => handleBodyChange(e.target.value)} placeholder="Hello {{name}}, your booking {{booking_reference}}..." />
                  <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                    <button type="button" className={`${styles.btn} ${styles.btnSm}`} onClick={autoExtract}><Eye size={12} /> Auto-extract variables</button>
                    <span style={{ fontSize: 11, color: "#64748b", alignSelf: "center" }}>Found: {(extractVariables(form.body_template).join(", ") || "none")}</span>
                  </div>
                </div>

                <div className={styles.field} style={{ marginTop: 12 }}>
                  <label>Variables</label>
                  <div className={styles.varEditor}>
                    {form.variables.map(v => (
                      <span key={v} className={styles.varChip}>{v} <button type="button" onClick={() => removeVar(v)}><X size={10} /></button></span>
                    ))}
                    <input className={styles.varInput} value={varInput} onChange={e => setVarInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addVar(); } }} placeholder={form.variables.length ? "Add variable, press Enter" : "Type variable and press Enter (comma to add multiple)"} />
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>Press Enter or comma to add. These drive the send form&apos;s variable editor.</div>
                </div>

                <div className={styles.previewBox}>
                  <div className={styles.previewLabel}>Live preview with sample values</div>
                  <div className={styles.previewText}>{preview || "— type a body template —"}</div>
                </div>
              </div>
              <div className={styles.modalFoot}>
                <button type="button" className={styles.btn} onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Create template"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Send
// ─────────────────────────────────────────────
function SendPanel() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [channel, setChannel] = useState<"whatsapp" | "sms" | "email">("whatsapp");
  const [recipient, setRecipient] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [language, setLanguage] = useState("en");
  const [priority, setPriority] = useState<"high" | "normal" | "low">("normal");
  const [subject, setSubject] = useState("");
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/communications/whatsapp/templates").then(d => setTemplates(d.data || [])).catch(() => {});
  }, []);

  const selectedTpl = templates.find(t => t.templateName === templateName);
  const requiredVars = selectedTpl ? selectedTpl.variables : extractVariables(templateName); // fallback

  useEffect(() => {
    if (selectedTpl) {
      const next: Record<string, string> = {};
      (selectedTpl.variables || []).forEach((v: string) => { next[v] = variables[v] || ""; });
      setVariables(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateName]);

  const bodyPreview = selectedTpl ? substituteVariables(selectedTpl.bodyTemplate, variables) : (templateName ? substituteVariables(templateName, variables) : (variables.body || ""));

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setResult(null);
    if (!recipient.trim()) { setError("Recipient is required (phone or email)"); return; }
    if (channel === "email" && recipient.includes("@") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) { setError("Enter a valid email address"); return; }
    setSending(true);
    try {
      let data;
      if (channel === "whatsapp") {
        if (!templateName) { setError("Select a WhatsApp template"); setSending(false); return; }
        data = await apiFetch("/communications/whatsapp/send", { method: "POST", body: JSON.stringify({ recipient: recipient.trim(), templateName, language, variables, priority }) });
      } else {
        // unified
        const payload: any = { recipient: recipient.trim(), channel, variables, priority, language };
        if (channel === "email") payload.subject = subject || templateName || "SEUM Notification";
        if (templateName) payload.template = templateName;
        if (selectedTpl) payload.template = selectedTpl.templateName;
        data = await apiFetch("/communications/send", { method: "POST", body: JSON.stringify(payload) });
      }
      setResult(data.data);
    } catch (e: any) { setError(e.message); }
    setSending(false);
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <div>
          <h3><Send size={16} /> Send message — unified interface</h3>
          <p>sendMessage(recipient, channel, template, variables) — trip alerts use High priority, promotions Low.</p>
        </div>
        <span className={styles.badge} style={{ background: priority === "high" ? "#dc262614" : priority === "low" ? "#f1f5f9" : "#1d4ed814", color: priority === "high" ? "#dc2626" : priority === "low" ? "#64748b" : "#1d4ed8" }}>
          <Zap size={12} /> {priority} priority
        </span>
      </div>
      <div className={styles.cardBody}>
        {error && <div className={styles.error}><AlertCircle size={13} style={{ verticalAlign: "middle", marginRight: 6 }} />{error}</div>}
        {result && <div className={styles.success}><Check size={13} style={{ verticalAlign: "middle", marginRight: 6 }} /> Sent via {result.channel || channel} — status: {result.status} · provider: {result.provider} · id: {result.id?.slice(0,8)}…</div>}

        <form onSubmit={handleSend}>
          <div className={styles.grid3}>
            <div className={styles.field}>
              <label>Channel <span>*</span></label>
              <select className={styles.select} value={channel} onChange={e => setChannel(e.target.value as any)}>
                <option value="whatsapp">WhatsApp (Twilio / Meta / WATI)</option>
                <option value="sms">SMS (Twilio / Vonage)</option>
                <option value="email">Email (Resend / SendGrid / SES)</option>
              </select>
            </div>
            <div className={styles.field}>
              <label>Priority</label>
              <select className={styles.select} value={priority} onChange={e => setPriority(e.target.value as any)}>
                <option value="high">High — trip alerts, delays</option>
                <option value="normal">Normal — confirmations</option>
                <option value="low">Low — promotions</option>
              </select>
            </div>
            <div className={styles.field}>
              <label>Language {channel === "whatsapp" ? <span>*</span> : null}</label>
              <select className={styles.select} value={language} onChange={e => setLanguage(e.target.value)}>
                <option value="en">en</option><option value="ar">ar</option><option value="ur">ur</option>
              </select>
            </div>
          </div>

          <div className={styles.grid2} style={{ marginTop: 14 }}>
            <div className={styles.field}>
              <label>{channel === "email" ? "Recipient email" : "Recipient phone"} <span>*</span></label>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ display: "inline-flex", alignItems: "center", padding: "0 10px", border: "1px solid var(--color-border)", borderRadius: 10, background: "#f8fafc", color: "#64748b" }}>
                  {channel === "email" ? <Mail size={14} /> : channel === "sms" ? <Smartphone size={14} /> : <Phone size={14} />}
                </span>
                <input className={styles.input} style={{ flex: 1 }} value={recipient} onChange={e => setRecipient(e.target.value)} placeholder={channel === "email" ? "customer@example.com" : "+966 5x xxx xxxx"} />
              </div>
            </div>
            <div className={styles.field}>
              <label>Template {channel === "whatsapp" ? <span>*</span> : null}</label>
              <select className={styles.select} value={templateName} onChange={e => setTemplateName(e.target.value)}>
                <option value="">— {channel === "email" ? "optional (or type body via variables)" : "select template"} —</option>
                {templates.map(t => <option key={t.id} value={t.templateName}>{t.templateName} ({t.language})</option>)}
              </select>
              {selectedTpl && <span style={{ fontSize: 11, color: "#64748b" }}>{selectedTpl.bodyTemplate.slice(0, 80)}{selectedTpl.bodyTemplate.length > 80 ? "…" : ""}</span>}
            </div>
          </div>

          {channel === "email" && (
            <div className={styles.field} style={{ marginTop: 14 }}>
              <label>Subject {channel === "email" ? <span>*</span> : null}</label>
              <input className={styles.input} value={subject} onChange={e => setSubject(e.target.value)} placeholder="Trip confirmed — SEUM" />
            </div>
          )}

          {/* Variable editor */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <strong style={{ fontSize: 13 }}>Variable values</strong>
              {selectedTpl && <span style={{ fontSize: 12, color: "#64748b" }}>required for {selectedTpl.templateName}: {(selectedTpl.variables || []).join(", ") || "none"}</span>}
              {!selectedTpl && <span style={{ fontSize: 12, color: "#64748b" }}>Add variables as key → value pairs (JSON will be sent as variables)</span>}
            </div>

            {selectedTpl && (selectedTpl.variables || []).length > 0 ? (
              <div className={styles.grid2}>
                {(selectedTpl.variables || []).map((v: string) => (
                  <div key={v} className={styles.field}>
                    <label>{"{{"} {v} {"}}"}</label>
                    <input className={styles.input} value={variables[v] || ""} onChange={e => setVariables(prev => ({ ...prev, [v]: e.target.value }))} placeholder={`Value for ${v}`} />
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.grid2}>
                <div className={styles.field}>
                  <label>{"{{name}}"} example</label>
                  <input className={styles.input} value={variables["name"] || ""} onChange={e => setVariables(prev => ({ ...prev, name: e.target.value }))} placeholder="Ahmed" />
                </div>
                <div className={styles.field}>
                  <label>{"{{route}}"} example</label>
                  <input className={styles.input} value={variables["route"] || ""} onChange={e => setVariables(prev => ({ ...prev, route: e.target.value }))} placeholder="Jeddah → Makkah" />
                </div>
                <div className={`${styles.field}`} style={{ gridColumn: "1 / -1" }}>
                  <label>Custom variable — key/value (add any)</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input className={styles.input} placeholder='key e.g. booking_reference' id="customKey" />
                    <input className={styles.input} placeholder='value' id="customVal" />
                    <button type="button" className={styles.btn} onClick={() => {
                      const k = (document.getElementById("customKey") as HTMLInputElement)?.value.trim();
                      const v = (document.getElementById("customVal") as HTMLInputElement)?.value || "";
                      if (k) { setVariables(prev => ({ ...prev, [k]: v })); (document.getElementById("customKey") as HTMLInputElement).value=""; (document.getElementById("customVal") as HTMLInputElement).value=""; }
                    }}>Add</button>
                  </div>
                  {Object.keys(variables).length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                      {Object.entries(variables).map(([k, v]) => (
                        <span key={k} className={styles.varTag}>{k}: {String(v).slice(0, 30)} <button type="button" onClick={() => { const c = { ...variables }; delete c[k]; setVariables(c); }} style={{ marginLeft: 6, border: "none", background: "transparent", cursor: "pointer" }}><X size={11} /></button></span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedTpl && bodyPreview && (
              <div className={styles.previewBox}>
                <div className={styles.previewLabel}>Rendered preview — what will be sent</div>
                <div className={styles.previewText}>{bodyPreview}</div>
                {(selectedTpl.variables || []).some((v: string) => !variables[v]) && (
                  <div style={{ marginTop: 8, fontSize: 12, color: "#d97706" }}><AlertCircle size={12} style={{ verticalAlign: "middle" }} /> Some variables are empty — they will appear as {"{{var}}"} in the preview.</div>
                )}
              </div>
            )}
            {!selectedTpl && bodyPreview && (
              <div className={styles.previewBox}>
                <div className={styles.previewLabel}>Body preview (from variables.body)</div>
                <div className={styles.previewText}>{bodyPreview || "— no body — add variables —"}</div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={sending}><Send size={14} /> {sending ? "Sending…" : `Send via ${channel}`}</button>
            <button type="button" className={styles.btn} onClick={() => { setVariables({}); setRecipient(""); setTemplateName(""); setResult(null); setError(""); }}>Reset</button>
            {channel !== "whatsapp" && <span style={{ fontSize: 12, color: "#64748b", alignSelf: "center" }}>Uses unified <code>sendMessage()</code> → routes to {channel} provider stub + logs.</span>}
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Logs
// ─────────────────────────────────────────────
function LogsPanel() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ channel: "", status: "", priority: "", search: "" });

  const fetchLogs = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (filters.channel) params.set("channel", filters.channel);
      if (filters.status) params.set("status", filters.status);
      if (filters.priority) params.set("priority", filters.priority);
      if (filters.search.trim()) params.set("search", filters.search.trim());
      const data = await apiFetch(`/communications/logs?${params}`);
      setLogs(data.data || []);
      setTotal(data.meta?.total ?? data.data?.length ?? 0);
      setTotalPages(data.meta?.totalPages || 1);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }, [page, filters]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { setPage(1); }, [filters]);

  const badgeChannel = (c: string) => c === "whatsapp" ? styles.badgeWhatsapp : c === "sms" ? styles.badgeSms : styles.badgeEmail;
  const badgeStatus = (s: string) => s === "sent" ? styles.statusSent : s === "delivered" ? styles.statusDelivered : s === "failed" ? styles.statusFailed : styles.statusQueued;

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <div>
          <h3><Clock size={16} /> Delivery log — recipient, template, status, sent at</h3>
          <p>Every send via WhatsApp / SMS / Email is logged with provider_response JSONB. High priority first.</p>
        </div>
        <button className={styles.btn} onClick={fetchLogs}><RefreshCw size={13} /> Refresh</button>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.filters}>
          <div className={styles.field} style={{ flex: "1 1 180px" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", border: "1px solid var(--color-border)", borderRadius: 10, padding: "0 10px", background: "var(--color-surface)" }}>
              <Search size={14} style={{ color: "#94a3b8" }} />
              <input className={styles.input} style={{ border: "none", padding: "9px 0", boxShadow: "none" }} placeholder="Search recipient or template…" value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} />
            </div>
          </div>
          <select className={styles.select} value={filters.channel} onChange={e => setFilters({ ...filters, channel: e.target.value })}>
            <option value="">All channels</option><option value="whatsapp">WhatsApp</option><option value="sms">SMS</option><option value="email">Email</option>
          </select>
          <select className={styles.select} value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All statuses</option><option value="queued">Queued</option><option value="sent">Sent</option><option value="delivered">Delivered</option><option value="failed">Failed</option>
          </select>
          <select className={styles.select} value={filters.priority} onChange={e => setFilters({ ...filters, priority: e.target.value })}>
            <option value="">All priorities</option><option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option>
          </select>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {loading ? <div className={styles.empty}>Loading logs…</div> : logs.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}><MessageCircle size={28} /></div>
            No messages yet — send one from the Send tab to populate the log.
          </div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>Recipient</th><th>Channel</th><th>Template</th><th>Body</th><th>Status</th><th>Priority</th><th>Sent at</th></tr></thead>
                <tbody>
                  {logs.map((l: any) => (
                    <tr key={l.id}>
                      <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{l.recipient}</td>
                      <td><span className={`${styles.badge} ${badgeChannel(l.channel)}`}>{l.channel}</span></td>
                      <td style={{ fontSize: 12 }}>{l.templateName || "—"}</td>
                      <td><div className={styles.bodySnippet} title={l.body || ""}>{l.body || "—"}</div></td>
                      <td><span className={`${styles.badge} ${badgeStatus(l.status)}`}>{l.status}</span></td>
                      <td><span className={`${styles.badge} ${l.priority === "high" ? styles.priorityHigh : l.priority === "low" ? styles.priorityLow : styles.priorityNormal}`}>{l.priority}</span></td>
                      <td style={{ fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>{fmtTime(l.sentAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.pagination}>
              <button className={styles.btn} disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</button>
              <span className={styles.pageInfo}>Page {page} of {totalPages} · {total} total</span>
              <button className={styles.btn} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Settings
// ─────────────────────────────────────────────
function SettingsPanel() {
  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    apiFetch("/communications/settings").then(d => setForm(d.data)).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true); setError(""); setSuccess("");
    try {
      const payload: any = {
        whatsapp_provider: form.whatsappProvider,
        sms_provider: form.smsProvider,
        email_provider: form.emailProvider,
        whatsapp_enabled: form.whatsappEnabled,
        sms_enabled: form.smsEnabled,
        email_enabled: form.emailEnabled,
        whatsapp_config: form.whatsappConfig || {},
        sms_config: form.smsConfig || {},
        email_config: form.emailConfig || {},
      };
      const data = await apiFetch("/communications/settings", { method: "PUT", body: JSON.stringify(payload) });
      setForm(data.data);
      setSuccess("Settings saved");
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  }

  if (loading) return <div className={styles.card}><div className={styles.cardBody}><div className={styles.empty}>Loading settings…</div></div></div>;
  if (!form) return <div className={styles.card}><div className={styles.cardBody}><div className={styles.error}>{error || "Failed to load settings"}</div></div></div>;

  const configToString = (v: any) => {
    try { return JSON.stringify(v, null, 2); } catch { return "{}"; }
  };
  const tryParse = (s: string) => { try { return JSON.parse(s); } catch { return null; } };

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <div>
          <h3><Settings2 size={16} /> Communication settings — provider config per tenant</h3>
          <p>Choose provider per channel (Twilio / Meta / WATI / direct for WhatsApp) and toggle channels. Configs stored as JSONB.</p>
        </div>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSave} disabled={saving}><Check size={14} /> {saving ? "Saving…" : "Save settings"}</button>
      </div>
      <div className={styles.cardBody}>
        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}

        <div className={styles.grid3}>
          <div className={styles.field}>
            <label>WhatsApp provider</label>
            <select className={styles.select} value={form.whatsappProvider} onChange={e => setForm({ ...form, whatsappProvider: e.target.value })}>
              <option value="twilio">Twilio</option><option value="meta">Meta (Cloud API)</option><option value="wati">WATI</option><option value="direct">Direct</option>
            </select>
          </div>
          <div className={styles.field}>
            <label>SMS provider</label>
            <select className={styles.select} value={form.smsProvider} onChange={e => setForm({ ...form, smsProvider: e.target.value })}>
              <option value="twilio">Twilio</option><option value="vonage">Vonage</option><option value="other">Other</option>
            </select>
          </div>
          <div className={styles.field}>
            <label>Email provider</label>
            <select className={styles.select} value={form.emailProvider} onChange={e => setForm({ ...form, emailProvider: e.target.value })}>
              <option value="nodemailer">Nodemailer (SMTP)</option><option value="resend">Resend</option><option value="sendgrid">SendGrid</option><option value="ses">SES</option>
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gap: 0, marginTop: 16 }}>
          <div className={styles.toggleRow}>
            <div className={styles.toggleInfo}><strong><MessageCircle size={13} style={{ verticalAlign: "middle", marginRight: 6 }} />WhatsApp channel</strong><p>Business API connection — when disabled, sends return failed but still log.</p></div>
            <input type="checkbox" className={styles.switch} checked={form.whatsappEnabled} onChange={e => setForm({ ...form, whatsappEnabled: e.target.checked })} />
          </div>
          <div className={styles.toggleRow}>
            <div className={styles.toggleInfo}><strong><Smartphone size={13} style={{ verticalAlign: "middle", marginRight: 6 }} />SMS channel</strong><p>Transactional SMS via selected provider.</p></div>
            <input type="checkbox" className={styles.switch} checked={form.smsEnabled} onChange={e => setForm({ ...form, smsEnabled: e.target.checked })} />
          </div>
          <div className={styles.toggleRow}>
            <div className={styles.toggleInfo}><strong><Mail size={13} style={{ verticalAlign: "middle", marginRight: 6 }} />Email channel</strong><p>Uses Nodemailer now; switch provider without code change.</p></div>
            <input type="checkbox" className={styles.switch} checked={form.emailEnabled} onChange={e => setForm({ ...form, emailEnabled: e.target.checked })} />
          </div>
        </div>

        <div className={styles.grid3} style={{ marginTop: 16 }}>
          <div className={styles.field}>
            <label>WhatsApp config JSON</label>
            <textarea className={styles.textarea} rows={6} value={configToString(form.whatsappConfig)} onChange={e => { const p = tryParse(e.target.value); if (p) setForm({ ...form, whatsappConfig: p }); }} placeholder='{"accountSid":"...","authToken":"...","from":"+1415..."}' />
            <span style={{ fontSize: 11, color: "#64748b" }}>Twilio: accountSid, authToken, from — Meta: phoneNumberId, accessToken</span>
          </div>
          <div className={styles.field}>
            <label>SMS config JSON</label>
            <textarea className={styles.textarea} rows={6} value={configToString(form.smsConfig)} onChange={e => { const p = tryParse(e.target.value); if (p) setForm({ ...form, smsConfig: p }); }} placeholder='{"apiKey":"..."}' />
          </div>
          <div className={styles.field}>
            <label>Email config JSON</label>
            <textarea className={styles.textarea} rows={6} value={configToString(form.emailConfig)} onChange={e => { const p = tryParse(e.target.value); if (p) setForm({ ...form, emailConfig: p }); }} placeholder='{"from":"no-reply@seum.app"}' />
          </div>
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: "#64748b", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 10 }}>
          API: <code>GET/PUT /api/v1/communications/settings</code> — frontend: Communication settings page (provider config, channel enable/disable) ✓
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Customer Preferences
// ─────────────────────────────────────────────
function PreferencesPanel() {
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<any[]>([]);
  const [loadingCust, setLoadingCust] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [pref, setPref] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const searchCustomers = useCallback(async (q: string) => {
    if (!q.trim()) { setCustomers([]); return; }
    setLoadingCust(true);
    try {
      const data = await apiFetch(`/bookings/customers?search=${encodeURIComponent(q)}&pageSize=20`);
      setCustomers(data.data || []);
    } catch { setCustomers([]); }
    setLoadingCust(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchCustomers(search), 400);
    return () => clearTimeout(t);
  }, [search, searchCustomers]);

  async function selectCustomer(c: any) {
    setSelected(c);
    setError(""); setSuccess(""); setPref(null);
    try {
      const data = await apiFetch(`/communications/customers/${c.id}/preferences`);
      setPref(data.data);
    } catch (e: any) { setError(e.message); }
  }

  async function handleSave() {
    if (!selected || !pref) return;
    setSaving(true); setError(""); setSuccess("");
    try {
      const payload = {
        preferred_channel: pref.preferredChannel,
        whatsapp_enabled: pref.whatsappEnabled,
        sms_enabled: pref.smsEnabled,
        email_enabled: pref.emailEnabled,
      };
      const data = await apiFetch(`/communications/customers/${selected.id}/preferences`, { method: "PUT", body: JSON.stringify(payload) });
      setPref(data.data);
      setSuccess("Preference saved");
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <div>
          <h3><Users size={16} /> Customer communication preference</h3>
          <p>Per-customer preferred channel (SMS / WhatsApp / Email) + toggles. Used by unified send to route.</p>
        </div>
      </div>
      <div className={styles.cardBody}>
        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}

        <div className={styles.field}>
          <label>Search customer</label>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, border: "1px solid var(--color-border)", borderRadius: 10, padding: "0 12px", background: "var(--color-surface)" }}>
              <Search size={14} style={{ color: "#94a3b8" }} />
              <input className={styles.input} style={{ border: "none", boxShadow: "none", flex: 1, padding: "9px 0" }} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, phone, email, ID…" />
            </div>
          </div>
          {loadingCust && <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>Searching…</div>}
          {customers.length > 0 && (
            <div className={styles.customerList}>
              {customers.map(c => (
                <div key={c.id} className={`${styles.customerItem} ${selected?.id === c.id ? styles.customerItemSelected : ""}`} onClick={() => selectCustomer(c)}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name} {c.isCompany && <span style={{ fontSize: 11, color: "#64748b" }}>— {c.companyName}</span>}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{c.phone || ""} {c.email ? `· ${c.email}` : ""}</div>
                  </div>
                  <span className={styles.badge} style={{ background: "#f1f5f9" }}>{c.isCompany ? "Company" : "Individual"}</span>
                </div>
              ))}
            </div>
          )}
          {search && !loadingCust && customers.length === 0 && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 8 }}>No customers found for &quot;{search}&quot;.</div>}
        </div>

        {selected && pref && (
          <div style={{ marginTop: 18, padding: 16, border: "1px solid var(--color-border)", borderRadius: 12, background: "var(--color-surface)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div>
                <strong style={{ fontSize: 14 }}>{selected.name}</strong>
                <div style={{ fontSize: 12, color: "#64748b" }}>{selected.phone || ""} {selected.email ? `· ${selected.email}` : ""}</div>
              </div>
              <span className={styles.badge} style={{ background: "#1d4ed814", color: "#1d4ed8" }}>{pref.preferredChannel}</span>
            </div>

            <div className={styles.field}>
              <label>Preferred channel</label>
              <select className={styles.select} value={pref.preferredChannel} onChange={e => setPref({ ...pref, preferredChannel: e.target.value })}>
                <option value="whatsapp">WhatsApp</option><option value="sms">SMS</option><option value="email">Email</option>
              </select>
            </div>

            <div style={{ marginTop: 14 }}>
              <div className={styles.toggleRow} style={{ marginBottom: 8 }}>
                <div className={styles.toggleInfo}><strong><MessageCircle size={13} style={{ marginRight: 6, verticalAlign: "middle" }} />WhatsApp</strong><p>Allow WhatsApp messages for this customer</p></div>
                <input type="checkbox" className={styles.switch} checked={pref.whatsappEnabled} onChange={e => setPref({ ...pref, whatsappEnabled: e.target.checked })} />
              </div>
              <div className={styles.toggleRow} style={{ marginBottom: 8 }}>
                <div className={styles.toggleInfo}><strong><Smartphone size={13} style={{ marginRight: 6, verticalAlign: "middle" }} />SMS</strong><p>Allow SMS messages</p></div>
                <input type="checkbox" className={styles.switch} checked={pref.smsEnabled} onChange={e => setPref({ ...pref, smsEnabled: e.target.checked })} />
              </div>
              <div className={styles.toggleRow}>
                <div className={styles.toggleInfo}><strong><Mail size={13} style={{ marginRight: 6, verticalAlign: "middle" }} />Email</strong><p>Allow email messages</p></div>
                <input type="checkbox" className={styles.switch} checked={pref.emailEnabled} onChange={e => setPref({ ...pref, emailEnabled: e.target.checked })} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSave} disabled={saving}><Check size={14} /> {saving ? "Saving…" : "Save preference"}</button>
              <button className={styles.btn} onClick={() => { setSelected(null); setPref(null); setSearch(""); }}>Clear</button>
              <span style={{ fontSize: 11, color: "#64748b", alignSelf: "center" }}>API: <code>GET/PUT /communications/customers/:id/preferences</code></span>
            </div>
          </div>
        )}

        {!selected && (
          <div className={styles.previewBox} style={{ marginTop: 16 }}>
            <div className={styles.previewLabel}>How it works</div>
            <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.6 }}>
              Customer preference is stored in <code>customer_communication_preferences</code> (preferred_channel + per-channel enabled flags).
              When sending via the unified <code>sendMessage()</code>, the service checks this preference to decide whether to route via WhatsApp, SMS or Email — high-priority trip alerts can override low-priority promotions via the queue.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
