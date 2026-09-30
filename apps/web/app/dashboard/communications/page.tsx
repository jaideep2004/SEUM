"use client";
import { useState, useEffect, useCallback } from "react";
import {
  MessageSquare, Send, ScrollText, Settings2, Users, Plus, Trash2, Pencil,
  Eye, Search, RefreshCw, Phone, Mail, Smartphone, MessageCircle, Check,
  AlertCircle, Clock, ShieldCheck, Zap, X
} from "lucide-react";
import styles from "./page.module.css";
import { useLanguage, formatDateTime, formatNumber, formatCurrency } from "@/lib/i18n";

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
function fmtTime(iso: string, lang: "en" | "ar") {
  if (!iso) return "—";
  return formatDateTime(iso, lang);
}

type Tab = "templates" | "send" | "logs" | "settings" | "preferences";

export default function CommunicationsPage() {
  const { lang, t } = useLanguage();
  const [tab, setTab] = useState<Tab>("templates");

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}><MessageSquare size={20} /></div>
          <div>
            <h1 className={styles.title}>{t("admin.comm.title")}</h1>
            <p className={styles.subtitle}>{t("admin.comm.subtitle")}</p>
          </div>
        </div>
        <div className={styles.headerStat}>
          <span className={styles.statPill}><ShieldCheck size={13} /> {t("admin.comm.stubsReady")}</span>
          <span className={styles.statPill}><Zap size={13} /> {t("admin.comm.priorityQueue")}</span>
        </div>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === "templates" ? styles.tabActive : ""}`} onClick={() => setTab("templates")}><ScrollText size={15} /> {t("admin.comm.tabTemplates")}</button>
        <button className={`${styles.tab} ${tab === "send" ? styles.tabActive : ""}`} onClick={() => setTab("send")}><Send size={15} /> {t("admin.comm.tabSend")}</button>
        <button className={`${styles.tab} ${tab === "logs" ? styles.tabActive : ""}`} onClick={() => setTab("logs")}><Clock size={15} /> {t("admin.comm.tabLogs")}</button>
        <button className={`${styles.tab} ${tab === "settings" ? styles.tabActive : ""}`} onClick={() => setTab("settings")}><Settings2 size={15} /> {t("admin.comm.tabSettings")}</button>
        <button className={`${styles.tab} ${tab === "preferences" ? styles.tabActive : ""}`} onClick={() => setTab("preferences")}><Users size={15} /> {t("admin.comm.tabPrefs")}</button>
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
  const { lang, t } = useLanguage();
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
    setForm({ template_name: "", language: "en", body_template: t("admin.comm.defaultBody"), variables: ["name","route","date","booking_reference"] });
    setVarInput("");
    setModalOpen(true);
  }
  function openEdit(tpl: any) {
    setEditing(tpl);
    setForm({ template_name: tpl.templateName, language: tpl.language, body_template: tpl.bodyTemplate, variables: tpl.variables || [] });
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
    if (!form.template_name.trim()) { setError(t("admin.comm.tplNameRequired")); return; }
    if (!form.body_template.trim()) { setError(t("admin.comm.tplBodyRequired")); return; }
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
  async function handleDelete(tpl: any) {
    if (!confirm(`${t("admin.comm.deleteTplA")}${tpl.templateName}${t("admin.comm.deleteTplB")}${tpl.language}${t("admin.comm.deleteTplC")}`)) return;
    try { await apiFetch(`/communications/whatsapp/templates/${tpl.id}`, { method: "DELETE" }); fetchList(); } catch (e: any) { setError(e.message); }
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
          <h3><ScrollText size={16} /> {t("admin.comm.tplTitle")}</h3>
          <p>{t("admin.comm.tplDescA")}<code>{"{{name}}"}</code>{t("admin.comm.tplDescB")}</p>
        </div>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={openCreate}><Plus size={14} /> {t("admin.comm.newTemplate")}</button>
      </div>
      <div className={styles.cardBody}>
        {error && <div className={styles.error}>{error}</div>}
        {loading ? <div className={styles.empty}>{t("admin.comm.loadingTpl")}</div> : items.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}><ScrollText size={28} /></div>
            <div>{t("admin.comm.noTpl")}</div>
            <div style={{ marginTop: 8, fontSize: 12, color: "#94a3b8" }}>{t("admin.comm.tplExample")}</div>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>{t("admin.comm.colTemplate")}</th><th>{t("admin.comm.colLang")}</th><th>{t("admin.comm.colBody")}</th><th>{t("admin.comm.colVars")}</th><th>{t("admin.comm.colCreated")}</th><th></th></tr></thead>
              <tbody>
                {items.map((row: any) => (
                  <tr key={row.id}>
                    <td><strong>{row.templateName}</strong></td>
                    <td><span className={styles.badge} style={{ background: "#f1f5f9" }}>{row.language}</span></td>
                    <td><div className={styles.bodySnippet}>{row.bodyTemplate}</div></td>
                    <td>
                      <div className={styles.templateVars}>
                        {(row.variables || []).map((v: string) => <span key={v} className={styles.varTag}>{`{{${v}}}`}</span>)}
                        {(row.variables || []).length === 0 && <span style={{ fontSize: 12, color: "#94a3b8" }}>—</span>}
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>{fmtTime(row.createdAt, lang)}</td>
                    <td>
                      <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                        <button className={styles.btn} style={{ padding: 6 }} title={t("admin.comm.editTitle")} onClick={() => openEdit(row)}><Pencil size={13} /></button>
                        <button className={styles.btn} style={{ padding: 6 }} title={t("admin.comm.deleteTitle")} onClick={() => handleDelete(row)}><Trash2 size={13} /></button>
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
              <h3>{editing ? t("admin.comm.editTpl") : t("admin.comm.createTpl")}</h3>
              <button className={styles.btn} style={{ padding: 6 }} onClick={() => setModalOpen(false)}><X size={14} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className={styles.modalBody}>
                {error && <div className={styles.error}>{error}</div>}
                <div className={styles.grid2}>
                  <div className={styles.field}>
                    <label>{t("admin.comm.tplNameLabel")}<span>*</span></label>
                    <input className={styles.input} value={form.template_name} onChange={e => setForm({ ...form, template_name: e.target.value })} placeholder={t("admin.comm.tplNamePh")} />
                  </div>
                  <div className={styles.field}>
                    <label>{t("admin.comm.langLabel")}</label>
                    <select className={styles.select} value={form.language} onChange={e => setForm({ ...form, language: e.target.value })}>
                      <option value="en">{t("admin.comm.langEn")}</option>
                      <option value="ar">{t("admin.comm.langAr")}</option>
                      <option value="ur">{t("admin.comm.langUr")}</option>
                      <option value="fr">{t("admin.comm.langFr")}</option>
                    </select>
                  </div>
                </div>
                <div className={styles.field} style={{ marginTop: 12 }}>
                  <label>{t("admin.comm.bodyLabel")}<span>*</span> <span style={{ fontWeight: 400, color: "#64748b" }}>{t("admin.comm.bodyUseA")}{"{{variable}}"}{t("admin.comm.bodyUseB")}</span></label>
                  <textarea className={styles.textarea} rows={4} value={form.body_template} onChange={e => handleBodyChange(e.target.value)} placeholder={t("admin.comm.bodyPh")} />
                  <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                    <button type="button" className={`${styles.btn} ${styles.btnSm}`} onClick={autoExtract}><Eye size={12} /> {t("admin.comm.autoExtract")}</button>
                    <span style={{ fontSize: 11, color: "#64748b", alignSelf: "center" }}>{t("admin.comm.foundA")}{(extractVariables(form.body_template).join(", ") || t("admin.comm.foundNone"))}</span>
                  </div>
                </div>

                <div className={styles.field} style={{ marginTop: 12 }}>
                  <label>{t("admin.comm.varsLabel")}</label>
                  <div className={styles.varEditor}>
                    {form.variables.map(v => (
                      <span key={v} className={styles.varChip}>{v} <button type="button" onClick={() => removeVar(v)}><X size={10} /></button></span>
                    ))}
                    <input className={styles.varInput} value={varInput} onChange={e => setVarInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addVar(); } }} placeholder={form.variables.length ? t("admin.comm.varAddPh") : t("admin.comm.varEmptyPh")} />
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>{t("admin.comm.varHint")}</div>
                </div>

                <div className={styles.previewBox}>
                  <div className={styles.previewLabel}>{t("admin.comm.previewLabel")}</div>
                  <div className={styles.previewText}>{preview || t("admin.comm.previewEmpty")}</div>
                </div>
              </div>
              <div className={styles.modalFoot}>
                <button type="button" className={styles.btn} onClick={() => setModalOpen(false)}>{t("admin.comm.cancel")}</button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={saving}>{saving ? t("admin.comm.saving") : editing ? t("admin.comm.saveChanges") : t("admin.comm.createTemplate")}</button>
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
  const { lang, t } = useLanguage();
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
    if (!recipient.trim()) { setError(t("admin.comm.recipientRequired")); return; }
    if (channel === "email" && recipient.includes("@") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) { setError(t("admin.comm.emailInvalid")); return; }
    setSending(true);
    try {
      let data;
      if (channel === "whatsapp") {
        if (!templateName) { setError(t("admin.comm.selectWaTpl")); setSending(false); return; }
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
          <h3><Send size={16} /> {t("admin.comm.sendTitle")}</h3>
          <p>{t("admin.comm.sendDesc")}</p>
        </div>
        <span className={styles.badge} style={{ background: priority === "high" ? "#dc262614" : priority === "low" ? "#f1f5f9" : "#1d4ed814", color: priority === "high" ? "#dc2626" : priority === "low" ? "#64748b" : "#1d4ed8" }}>
          <Zap size={12} /> {priority} {t("admin.comm.priorityW")}
        </span>
      </div>
      <div className={styles.cardBody}>
        {error && <div className={styles.error}><AlertCircle size={13} style={{ verticalAlign: "middle", marginRight: 6 }} />{error}</div>}
        {result && <div className={styles.success}><Check size={13} style={{ verticalAlign: "middle", marginRight: 6 }} /> {t("admin.comm.sentVia")}{result.channel || channel}{t("admin.comm.statusSep")}{result.status}{t("admin.comm.providerSep")}{result.provider}{t("admin.comm.idSep")}{result.id?.slice(0,8)}…</div>}

        <form onSubmit={handleSend}>
          <div className={styles.grid3}>
            <div className={styles.field}>
              <label>{t("admin.comm.channelLabel")}<span>*</span></label>
              <select className={styles.select} value={channel} onChange={e => setChannel(e.target.value as any)}>
                <option value="whatsapp">{t("admin.comm.chWa")}</option>
                <option value="sms">{t("admin.comm.chSms")}</option>
                <option value="email">{t("admin.comm.chEmail")}</option>
              </select>
            </div>
            <div className={styles.field}>
              <label>{t("admin.comm.priorityLabel")}</label>
              <select className={styles.select} value={priority} onChange={e => setPriority(e.target.value as any)}>
                <option value="high">{t("admin.comm.priHigh")}</option>
                <option value="normal">{t("admin.comm.priNormal")}</option>
                <option value="low">{t("admin.comm.priLow")}</option>
              </select>
            </div>
            <div className={styles.field}>
              <label>{t("admin.comm.languageLabel")}{channel === "whatsapp" ? <span>*</span> : null}</label>
              <select className={styles.select} value={language} onChange={e => setLanguage(e.target.value)}>
                <option value="en">en</option><option value="ar">ar</option><option value="ur">ur</option>
              </select>
            </div>
          </div>

          <div className={styles.grid2} style={{ marginTop: 14 }}>
            <div className={styles.field}>
              <label>{channel === "email" ? t("admin.comm.recipientEmail") : t("admin.comm.recipientPhone")} <span>*</span></label>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ display: "inline-flex", alignItems: "center", padding: "0 10px", border: "1px solid var(--color-border)", borderRadius: 10, background: "#f8fafc", color: "#64748b" }}>
                  {channel === "email" ? <Mail size={14} /> : channel === "sms" ? <Smartphone size={14} /> : <Phone size={14} />}
                </span>
                <input className={styles.input} style={{ flex: 1 }} value={recipient} onChange={e => setRecipient(e.target.value)} placeholder={channel === "email" ? t("admin.comm.emailPh") : t("admin.comm.phonePh")} />
              </div>
            </div>
            <div className={styles.field}>
              <label>{t("admin.comm.templateLabel")}{channel === "whatsapp" ? <span>*</span> : null}</label>
              <select className={styles.select} value={templateName} onChange={e => setTemplateName(e.target.value)}>
                <option value="">— {channel === "email" ? t("admin.comm.tplOptEmail") : t("admin.comm.tplOptSelect")} —</option>
                {templates.map(tpl => <option key={tpl.id} value={tpl.templateName}>{tpl.templateName} ({tpl.language})</option>)}
              </select>
              {selectedTpl && <span style={{ fontSize: 11, color: "#64748b" }}>{selectedTpl.bodyTemplate.slice(0, 80)}{selectedTpl.bodyTemplate.length > 80 ? "…" : ""}</span>}
            </div>
          </div>

          {channel === "email" && (
            <div className={styles.field} style={{ marginTop: 14 }}>
              <label>{t("admin.comm.subjectLabel")}{channel === "email" ? <span>*</span> : null}</label>
              <input className={styles.input} value={subject} onChange={e => setSubject(e.target.value)} placeholder={t("admin.comm.subjectPh")} />
            </div>
          )}

          {/* Variable editor */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <strong style={{ fontSize: 13 }}>{t("admin.comm.varValues")}</strong>
              {selectedTpl && <span style={{ fontSize: 12, color: "#64748b" }}>{t("admin.comm.requiredFor")}{selectedTpl.templateName}: {(selectedTpl.variables || []).join(", ") || t("admin.comm.foundNone")}</span>}
              {!selectedTpl && <span style={{ fontSize: 12, color: "#64748b" }}>{t("admin.comm.kvHint")}</span>}
            </div>

            {selectedTpl && (selectedTpl.variables || []).length > 0 ? (
              <div className={styles.grid2}>
                {(selectedTpl.variables || []).map((v: string) => (
                  <div key={v} className={styles.field}>
                    <label>{"{{"} {v} {"}}"}</label>
                    <input className={styles.input} value={variables[v] || ""} onChange={e => setVariables(prev => ({ ...prev, [v]: e.target.value }))} placeholder={`${t("admin.comm.valueFor")}${v}`} />
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.grid2}>
                <div className={styles.field}>
                  <label>{t("admin.comm.nameExample")}</label>
                  <input className={styles.input} value={variables["name"] || ""} onChange={e => setVariables(prev => ({ ...prev, name: e.target.value }))} placeholder="Ahmed" />
                </div>
                <div className={styles.field}>
                  <label>{t("admin.comm.routeExample")}</label>
                  <input className={styles.input} value={variables["route"] || ""} onChange={e => setVariables(prev => ({ ...prev, route: e.target.value }))} placeholder="Jeddah → Makkah" />
                </div>
                <div className={`${styles.field}`} style={{ gridColumn: "1 / -1" }}>
                  <label>{t("admin.comm.customVar")}</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input className={styles.input} placeholder={t("admin.comm.keyPh")} id="customKey" />
                    <input className={styles.input} placeholder={t("admin.comm.valPh")} id="customVal" />
                    <button type="button" className={styles.btn} onClick={() => {
                      const k = (document.getElementById("customKey") as HTMLInputElement)?.value.trim();
                      const v = (document.getElementById("customVal") as HTMLInputElement)?.value || "";
                      if (k) { setVariables(prev => ({ ...prev, [k]: v })); (document.getElementById("customKey") as HTMLInputElement).value=""; (document.getElementById("customVal") as HTMLInputElement).value=""; }
                    }}>{t("admin.comm.addBtn")}</button>
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
                <div className={styles.previewLabel}>{t("admin.comm.renderedPreview")}</div>
                <div className={styles.previewText}>{bodyPreview}</div>
                {(selectedTpl.variables || []).some((v: string) => !variables[v]) && (
                  <div style={{ marginTop: 8, fontSize: 12, color: "#d97706" }}><AlertCircle size={12} style={{ verticalAlign: "middle" }} /> {t("admin.comm.emptyVarsA")}{"{{var}}"}{t("admin.comm.emptyVarsB")}</div>
                )}
              </div>
            )}
            {!selectedTpl && bodyPreview && (
              <div className={styles.previewBox}>
                <div className={styles.previewLabel}>{t("admin.comm.bodyPreview")}</div>
                <div className={styles.previewText}>{bodyPreview || t("admin.comm.noBody")}</div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={sending}><Send size={14} /> {sending ? t("admin.comm.sending") : `${t("admin.comm.sendVia")}${channel}`}</button>
            <button type="button" className={styles.btn} onClick={() => { setVariables({}); setRecipient(""); setTemplateName(""); setResult(null); setError(""); }}>{t("admin.comm.reset")}</button>
            {channel !== "whatsapp" && <span style={{ fontSize: 12, color: "#64748b", alignSelf: "center" }}>{t("admin.comm.unifiedA")}<code>sendMessage()</code>{t("admin.comm.unifiedB")}{channel}{t("admin.comm.unifiedC")}</span>}
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
  const { lang, t } = useLanguage();
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
          <h3><Clock size={16} /> {t("admin.comm.logsTitle")}</h3>
          <p>{t("admin.comm.logsDesc")}</p>
        </div>
        <button className={styles.btn} onClick={fetchLogs}><RefreshCw size={13} /> {t("admin.comm.refresh")}</button>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.filters}>
          <div className={styles.field} style={{ flex: "1 1 180px" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", border: "1px solid var(--color-border)", borderRadius: 10, padding: "0 10px", background: "var(--color-surface)" }}>
              <Search size={14} style={{ color: "#94a3b8" }} />
              <input className={styles.input} style={{ border: "none", padding: "9px 0", boxShadow: "none" }} placeholder={t("admin.comm.searchLogsPh")} value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} />
            </div>
          </div>
          <select className={styles.select} value={filters.channel} onChange={e => setFilters({ ...filters, channel: e.target.value })}>
            <option value="">{t("admin.comm.allChannels")}</option><option value="whatsapp">WhatsApp</option><option value="sms">SMS</option><option value="email">Email</option>
          </select>
          <select className={styles.select} value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
            <option value="">{t("admin.comm.allStatuses")}</option><option value="queued">{t("admin.comm.stQueued")}</option><option value="sent">{t("admin.comm.stSent")}</option><option value="delivered">{t("admin.comm.stDelivered")}</option><option value="failed">{t("admin.comm.stFailed")}</option>
          </select>
          <select className={styles.select} value={filters.priority} onChange={e => setFilters({ ...filters, priority: e.target.value })}>
            <option value="">{t("admin.comm.allPriorities")}</option><option value="high">{t("admin.comm.priHighW")}</option><option value="normal">{t("admin.comm.priNormalW")}</option><option value="low">{t("admin.comm.priLowW")}</option>
          </select>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {loading ? <div className={styles.empty}>{t("admin.comm.loadingLogs")}</div> : logs.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}><MessageCircle size={28} /></div>
            {t("admin.comm.noLogs")}
          </div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>{t("admin.comm.colRecipient")}</th><th>{t("admin.comm.colChannel")}</th><th>{t("admin.comm.colTemplate")}</th><th>{t("admin.comm.colBody")}</th><th>{t("admin.comm.colStatus")}</th><th>{t("admin.comm.colPriority")}</th><th>{t("admin.comm.colSentAt")}</th></tr></thead>
                <tbody>
                  {logs.map((l: any) => (
                    <tr key={l.id}>
                      <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{l.recipient}</td>
                      <td><span className={`${styles.badge} ${badgeChannel(l.channel)}`}>{l.channel}</span></td>
                      <td style={{ fontSize: 12 }}>{l.templateName || "—"}</td>
                      <td><div className={styles.bodySnippet} title={l.body || ""}>{l.body || "—"}</div></td>
                      <td><span className={`${styles.badge} ${badgeStatus(l.status)}`}>{l.status}</span></td>
                      <td><span className={`${styles.badge} ${l.priority === "high" ? styles.priorityHigh : l.priority === "low" ? styles.priorityLow : styles.priorityNormal}`}>{l.priority}</span></td>
                      <td style={{ fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>{fmtTime(l.sentAt, lang)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.pagination}>
              <button className={styles.btn} disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>{t("admin.comm.prev")}</button>
              <span className={styles.pageInfo}>{t("admin.notifications.pageW")} {formatNumber(page, lang)} {t("admin.notifications.ofW")} {formatNumber(totalPages, lang)} · {formatNumber(total, lang)} {t("admin.notifications.totalW")}</span>
              <button className={styles.btn} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>{t("admin.comm.next")}</button>
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
  const { lang, t } = useLanguage();
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
      setSuccess(t("admin.comm.settingsSaved"));
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  }

  if (loading) return <div className={styles.card}><div className={styles.cardBody}><div className={styles.empty}>{t("admin.comm.loadingSettings")}</div></div></div>;
  if (!form) return <div className={styles.card}><div className={styles.cardBody}><div className={styles.error}>{error || t("admin.comm.settingsFailed")}</div></div></div>;

  const configToString = (v: any) => {
    try { return JSON.stringify(v, null, 2); } catch { return "{}"; }
  };
  const tryParse = (s: string) => { try { return JSON.parse(s); } catch { return null; } };

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <div>
          <h3><Settings2 size={16} /> {t("admin.comm.settingsTitle")}</h3>
          <p>{t("admin.comm.settingsDesc")}</p>
        </div>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSave} disabled={saving}><Check size={14} /> {saving ? t("admin.comm.saving") : t("admin.comm.saveSettings")}</button>
      </div>
      <div className={styles.cardBody}>
        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}

        <div className={styles.grid3}>
          <div className={styles.field}>
            <label>{t("admin.comm.waProvider")}</label>
            <select className={styles.select} value={form.whatsappProvider} onChange={e => setForm({ ...form, whatsappProvider: e.target.value })}>
              <option value="twilio">Twilio</option><option value="meta">{t("admin.comm.metaApi")}</option><option value="wati">WATI</option><option value="direct">{t("admin.comm.direct")}</option>
            </select>
          </div>
          <div className={styles.field}>
            <label>{t("admin.comm.smsProvider")}</label>
            <select className={styles.select} value={form.smsProvider} onChange={e => setForm({ ...form, smsProvider: e.target.value })}>
              <option value="twilio">Twilio</option><option value="vonage">Vonage</option><option value="other">{t("admin.comm.other")}</option>
            </select>
          </div>
          <div className={styles.field}>
            <label>{t("admin.comm.emailProvider")}</label>
            <select className={styles.select} value={form.emailProvider} onChange={e => setForm({ ...form, emailProvider: e.target.value })}>
              <option value="nodemailer">{t("admin.comm.nodemailer")}</option><option value="resend">Resend</option><option value="sendgrid">SendGrid</option><option value="ses">SES</option>
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gap: 0, marginTop: 16 }}>
          <div className={styles.toggleRow}>
            <div className={styles.toggleInfo}><strong><MessageCircle size={13} style={{ verticalAlign: "middle", marginRight: 6 }} />{t("admin.comm.waChannel")}</strong><p>{t("admin.comm.waChannelDesc")}</p></div>
            <input type="checkbox" className={styles.switch} checked={form.whatsappEnabled} onChange={e => setForm({ ...form, whatsappEnabled: e.target.checked })} />
          </div>
          <div className={styles.toggleRow}>
            <div className={styles.toggleInfo}><strong><Smartphone size={13} style={{ verticalAlign: "middle", marginRight: 6 }} />{t("admin.comm.smsChannel")}</strong><p>{t("admin.comm.smsChannelDesc")}</p></div>
            <input type="checkbox" className={styles.switch} checked={form.smsEnabled} onChange={e => setForm({ ...form, smsEnabled: e.target.checked })} />
          </div>
          <div className={styles.toggleRow}>
            <div className={styles.toggleInfo}><strong><Mail size={13} style={{ verticalAlign: "middle", marginRight: 6 }} />{t("admin.comm.emailChannel")}</strong><p>{t("admin.comm.emailChannelDesc")}</p></div>
            <input type="checkbox" className={styles.switch} checked={form.emailEnabled} onChange={e => setForm({ ...form, emailEnabled: e.target.checked })} />
          </div>
        </div>

        <div className={styles.grid3} style={{ marginTop: 16 }}>
          <div className={styles.field}>
            <label>{t("admin.comm.waConfig")}</label>
            <textarea className={styles.textarea} rows={6} value={configToString(form.whatsappConfig)} onChange={e => { const p = tryParse(e.target.value); if (p) setForm({ ...form, whatsappConfig: p }); }} placeholder='{"accountSid":"...","authToken":"...","from":"+1415..."}' />
            <span style={{ fontSize: 11, color: "#64748b" }}>{t("admin.comm.configHint")}</span>
          </div>
          <div className={styles.field}>
            <label>{t("admin.comm.smsConfig")}</label>
            <textarea className={styles.textarea} rows={6} value={configToString(form.smsConfig)} onChange={e => { const p = tryParse(e.target.value); if (p) setForm({ ...form, smsConfig: p }); }} placeholder='{"apiKey":"..."}' />
          </div>
          <div className={styles.field}>
            <label>{t("admin.comm.emailConfig")}</label>
            <textarea className={styles.textarea} rows={6} value={configToString(form.emailConfig)} onChange={e => { const p = tryParse(e.target.value); if (p) setForm({ ...form, emailConfig: p }); }} placeholder='{"from":"no-reply@seum.app"}' />
          </div>
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: "#64748b", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 10 }}>
          API: <code>GET/PUT /api/v1/communications/settings</code> {t("admin.comm.apiNote")}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Customer Preferences
// ─────────────────────────────────────────────
function PreferencesPanel() {
  const { lang, t } = useLanguage();
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
      setSuccess(t("admin.comm.prefSaved"));
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <div>
          <h3><Users size={16} /> {t("admin.comm.prefTitle")}</h3>
          <p>{t("admin.comm.prefDesc")}</p>
        </div>
      </div>
      <div className={styles.cardBody}>
        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}

        <div className={styles.field}>
          <label>{t("admin.comm.searchCustomer")}</label>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, border: "1px solid var(--color-border)", borderRadius: 10, padding: "0 12px", background: "var(--color-surface)" }}>
              <Search size={14} style={{ color: "#94a3b8" }} />
              <input className={styles.input} style={{ border: "none", boxShadow: "none", flex: 1, padding: "9px 0" }} value={search} onChange={e => setSearch(e.target.value)} placeholder={t("admin.comm.searchCustPh")} />
            </div>
          </div>
          {loadingCust && <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>{t("admin.comm.searching")}</div>}
          {customers.length > 0 && (
            <div className={styles.customerList}>
              {customers.map(c => (
                <div key={c.id} className={`${styles.customerItem} ${selected?.id === c.id ? styles.customerItemSelected : ""}`} onClick={() => selectCustomer(c)}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name} {c.isCompany && <span style={{ fontSize: 11, color: "#64748b" }}>— {c.companyName}</span>}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{c.phone || ""} {c.email ? `· ${c.email}` : ""}</div>
                  </div>
                  <span className={styles.badge} style={{ background: "#f1f5f9" }}>{c.isCompany ? t("customers.list.typeCompany") : t("customers.list.typeIndividual")}</span>
                </div>
              ))}
            </div>
          )}
          {search && !loadingCust && customers.length === 0 && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 8 }}>{t("admin.comm.noCustA")}&quot;{search}&quot;{t("admin.comm.noCustB")}</div>}
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
              <label>{t("admin.comm.preferredChannel")}</label>
              <select className={styles.select} value={pref.preferredChannel} onChange={e => setPref({ ...pref, preferredChannel: e.target.value })}>
                <option value="whatsapp">WhatsApp</option><option value="sms">SMS</option><option value="email">Email</option>
              </select>
            </div>

            <div style={{ marginTop: 14 }}>
              <div className={styles.toggleRow} style={{ marginBottom: 8 }}>
                <div className={styles.toggleInfo}><strong><MessageCircle size={13} style={{ marginRight: 6, verticalAlign: "middle" }} />WhatsApp</strong><p>{t("admin.comm.allowWa")}</p></div>
                <input type="checkbox" className={styles.switch} checked={pref.whatsappEnabled} onChange={e => setPref({ ...pref, whatsappEnabled: e.target.checked })} />
              </div>
              <div className={styles.toggleRow} style={{ marginBottom: 8 }}>
                <div className={styles.toggleInfo}><strong><Smartphone size={13} style={{ marginRight: 6, verticalAlign: "middle" }} />SMS</strong><p>{t("admin.comm.allowSms")}</p></div>
                <input type="checkbox" className={styles.switch} checked={pref.smsEnabled} onChange={e => setPref({ ...pref, smsEnabled: e.target.checked })} />
              </div>
              <div className={styles.toggleRow}>
                <div className={styles.toggleInfo}><strong><Mail size={13} style={{ marginRight: 6, verticalAlign: "middle" }} />Email</strong><p>{t("admin.comm.allowEmail")}</p></div>
                <input type="checkbox" className={styles.switch} checked={pref.emailEnabled} onChange={e => setPref({ ...pref, emailEnabled: e.target.checked })} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSave} disabled={saving}><Check size={14} /> {saving ? t("admin.comm.saving") : t("admin.comm.savePref")}</button>
              <button className={styles.btn} onClick={() => { setSelected(null); setPref(null); setSearch(""); }}>{t("admin.comm.clearBtn")}</button>
              <span style={{ fontSize: 11, color: "#64748b", alignSelf: "center" }}>API: <code>GET/PUT /communications/customers/:id/preferences</code></span>
            </div>
          </div>
        )}

        {!selected && (
          <div className={styles.previewBox} style={{ marginTop: 16 }}>
            <div className={styles.previewLabel}>{t("admin.comm.howTitle")}</div>
            <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.6 }}>
              {t("admin.comm.howBody")}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
