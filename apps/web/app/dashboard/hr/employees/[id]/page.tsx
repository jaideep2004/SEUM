"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit, User, Briefcase, FileText, Clock, Phone, Calendar, MapPin, Hash, Mail, Upload, Trash2, FileUp } from "lucide-react";
import { useLanguage, formatDate, formatNumber, formatCurrency } from "@/lib/i18n";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const STATUS_COLORS: Record<string, string> = {
  active: "#10b981", suspended: "#f59e0b", terminated: "#ef4444", on_leave: "#3b82f6",
};

const STATUS_KEYS: Record<string, string> = {
  active: "hr.status.active",
  suspended: "hr.status.suspended",
  terminated: "hr.status.terminated",
  on_leave: "hr.status.onLeave",
};

const DEPARTMENT_KEYS: Record<string, string> = {
  operations: "hr.dept.operations",
  finance: "hr.dept.finance",
  hr: "hr.dept.hr",
  fleet: "hr.dept.fleet",
  maintenance: "hr.dept.maintenance",
  customer_service: "hr.dept.customerService",
  executive: "hr.dept.executive",
  admin: "hr.dept.admin",
};

const CONTRACT_TYPE_KEYS: Record<string, string> = {
  full_time: "hr.contracts.tyFullTime",
  part_time: "hr.contracts.tyPartTime",
  fixed_term: "hr.contracts.tyFixedTerm",
  probation: "hr.contracts.tyProbation",
  internship: "hr.contracts.tyInternship",
  consultant: "hr.contracts.tyConsultant",
  freelance: "hr.contracts.tyFreelance",
};

const CONTRACT_STATUS_KEYS: Record<string, string> = {
  draft: "hr.contracts.stDraft",
  active: "hr.contracts.stActive",
  expired: "hr.contracts.stExpired",
  terminated: "hr.contracts.stTerminated",
};

const CONTRACT_STATUS_COLORS: Record<string, string> = {
  draft: "#6b7280", active: "#10b981", expired: "#f59e0b", terminated: "#ef4444",
};

const DOC_TYPE_KEYS: Record<string, string> = {
  id_card: "hr.docs.tyIdCard",
  passport: "hr.docs.tyPassport",
  visa: "hr.docs.tyVisa",
  iqama: "hr.docs.tyIqama",
  work_permit: "hr.docs.tyWorkPermit",
  license: "hr.docs.tyLicense",
  insurance: "hr.docs.tyInsurance",
  academic: "hr.docs.tyAcademic",
  certificate: "hr.docs.tyCertificate",
  medical: "hr.docs.tyMedical",
  bank: "hr.docs.tyBank",
  other: "hr.docs.tyOther",
};

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function ExpiryBadge({ date }: { date: string | null }) {
  const { lang, t } = useLanguage();
  const d = daysUntil(date);
  if (d === null || !date) return <span className={styles.noExpiry}>—</span>;
  if (d < 0) return <span className={styles.expiredBadge}>{t("hr.contracts.expiredBadge")}</span>;
  if (d <= 30) return <span className={styles.expiringBadge}>{lang === "ar" ? `${d} يوم متبقٍ` : `${d}${t("hr.profile.daysShort")} ${t("hr.profile.leftWord")}`}</span>;
  return <span className={styles.validBadge}>{formatDate(date, lang)}</span>;
}

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("seum_access_token") || "";
}

function fileInputLabel(file: File | null, busy: boolean, t: (k: string) => string) {
  if (busy) return t("hr.contracts.uploading");
  return file ? file.name : t("hr.contracts.attachFile");
}

export default function EmployeeProfilePage() {
  const { lang, t } = useLanguage();
  void formatNumber;
  void formatCurrency;
  const { id } = useParams();
  const employeeId = String(id || "");
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"info" | "contracts" | "documents" | "attendance">("info");

  const fetchEmployee = useCallback(async () => {
    try {
      const res = await fetch(`${API}/hr/employees/${employeeId}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const json = await res.json();
      if (json.success) setEmployee(json.data);
    } catch {} finally { setLoading(false); }
  }, [employeeId]);

  useEffect(() => { fetchEmployee(); }, [fetchEmployee]);

  if (loading) return <div className={styles.loading}>{t("hr.profile.loading")}</div>;
  if (!employee) return <div className={styles.loading}>{t("hr.profile.notFound")}</div>;

  const contractDays = employee.contractEndDate
    ? Math.ceil((new Date(employee.contractEndDate).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div className={styles.page}>
      <Link href="/dashboard/hr/employees" className={styles.backLink}><ArrowLeft size={14} /> {t("hr.profile.back")}</Link>

      <div className={styles.profileHeader}>
        <div className={styles.profilePhoto}>
          {employee.name?.charAt(0).toUpperCase() || "?"}
        </div>
        <div className={styles.headerInfo}>
          <div className={styles.headerNameRow}>
            <h1 className={styles.employeeName}>{employee.name || t("hr.common.unnamedEmployee")}</h1>
            <span className={styles.statusBadge} style={{ background: (STATUS_COLORS[employee.status] || "#6b7280") + "18", color: STATUS_COLORS[employee.status] || "#6b7280" }}>
              {t(STATUS_KEYS[employee.status] || employee.status)}
            </span>
          </div>
          <p className={styles.employeeEmail}>{employee.email}</p>
          <div className={styles.headerMeta}>
            {employee.employeeCode && <span><Hash size={12} /> {t("hr.profile.codeLabel")} {employee.employeeCode}</span>}
            {employee.department && <span><Briefcase size={12} /> {t(DEPARTMENT_KEYS[employee.department] || employee.department)}</span>}
            {employee.designation && <span><User size={12} /> {employee.designation}</span>}
            {employee.nationality && <span><MapPin size={12} /> {employee.nationality}</span>}
          </div>
        </div>
        <Link href={`/dashboard/hr/employees/${id}/edit`} className={styles.editBtn}>
          <Edit size={14} /> {t("common.edit")}
        </Link>
      </div>

      {contractDays !== null && contractDays <= 30 && (
        <div className={styles.expiryBanner}><Calendar size={14} /> {t("hr.profile.contractWord")} {contractDays <= 0 ? t("hr.profile.expiredWord") : `${t("hr.profile.expiresIn")} ${contractDays} ${contractDays !== 1 ? t("hr.profile.dayPl") : t("hr.profile.daySg")}`} ({formatDate(employee.contractEndDate, lang)})</div>
      )}

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === "info" ? styles.tabActive : ""}`} onClick={() => setActiveTab("info")}><User size={14} /> {t("hr.profile.tabInfo")}</button>
        <button className={`${styles.tab} ${activeTab === "contracts" ? styles.tabActive : ""}`} onClick={() => setActiveTab("contracts")}><Briefcase size={14} /> {t("hr.profile.tabContracts")}</button>
        <button className={`${styles.tab} ${activeTab === "documents" ? styles.tabActive : ""}`} onClick={() => setActiveTab("documents")}><FileText size={14} /> {t("hr.profile.tabDocs")}</button>
        <button className={`${styles.tab} ${activeTab === "attendance" ? styles.tabActive : ""}`} onClick={() => setActiveTab("attendance")}><Clock size={14} /> {t("hr.profile.tabAttendance")}</button>
      </div>

      {activeTab === "info" && (
        <div className={styles.infoGrid}>
          <div className={styles.infoCard}>
            <h3>{t("hr.profile.secEmployment")}</h3>
            <div className={styles.infoRow}><span>{t("hr.profile.fEmpCode")}</span><span>{employee.employeeCode || "—"}</span></div>
            <div className={styles.infoRow}><span>{t("hr.profile.fDept")}</span><span>{employee.department ? t(DEPARTMENT_KEYS[employee.department] || employee.department) : "—"}</span></div>
            <div className={styles.infoRow}><span>{t("hr.profile.fDesignation")}</span><span>{employee.designation || "—"}</span></div>
            <div className={styles.infoRow}><span>{t("hr.profile.fJoinDate")}</span><span>{employee.joinDate ? formatDate(employee.joinDate, lang) : "—"}</span></div>
            <div className={styles.infoRow}><span>{t("hr.profile.fContractEnd")}</span><span>{employee.contractEndDate ? formatDate(employee.contractEndDate, lang) + (contractDays !== null && contractDays > 0 ? ` (${contractDays}${t("hr.profile.daysShort")})` : "") : "—"}</span></div>
            <div className={styles.infoRow}><span>{t("hr.profile.fStatus")}</span><span style={{ color: STATUS_COLORS[employee.status] || "#6b7280", fontWeight: 600 }}>{t(STATUS_KEYS[employee.status] || employee.status) || "—"}</span></div>
          </div>
          <div className={styles.infoCard}>
            <h3>{t("hr.profile.secContact")}</h3>
            <div className={styles.infoRow}><span><Mail size={12} /> {t("hr.profile.fEmail")}</span><span>{employee.email || "—"}</span></div>
            <div className={styles.infoRow}><span><Phone size={12} /> {t("hr.profile.fPhone")}</span><span>{employee.phone || "—"}</span></div>
          </div>
          <div className={styles.infoCard}>
            <h3>{t("hr.profile.secIdentity")}</h3>
            <div className={styles.infoRow}><span>{t("hr.profile.fNationality")}</span><span>{employee.nationality || "—"}</span></div>
            <div className={styles.infoRow}><span>{t("hr.profile.fIdNumber")}</span><span>{employee.idNumber || "—"}</span></div>
          </div>
        </div>
      )}

      {activeTab === "contracts" && <ContractsTab employeeId={employeeId} />}
      {activeTab === "documents" && <DocumentsTab employeeId={employeeId} />}

      {activeTab === "attendance" && (
        <div className={styles.placeholderSection}>
          <Clock size={32} className={styles.placeholderIcon} />
          <h3>{t("hr.profile.attTitle")}</h3>
          <p>{t("hr.profile.attDesc")}</p>
        </div>
      )}
    </div>
  );
}

function ContractsTab({ employeeId }: { employeeId: string }) {
  const { lang, t } = useLanguage();
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    contract_type: "full_time", start_date: "", end_date: "",
    salary: "", benefits: "", status: "active",
  });

  const fetchContracts = useCallback(async () => {
    try {
      const res = await fetch(`${API}/hr/contracts?employee_id=${employeeId}&pageSize=100`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const json = await res.json();
      if (json.success) setContracts(json.data || []);
    } catch {} finally { setLoading(false); }
  }, [employeeId]);

  useEffect(() => { fetchContracts(); }, [fetchContracts]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("employee_id", employeeId);
      fd.append("contract_type", form.contract_type);
      fd.append("status", form.status);
      if (form.start_date) fd.append("start_date", form.start_date);
      if (form.end_date) fd.append("end_date", form.end_date);
      if (form.salary) fd.append("salary", form.salary);
      if (form.benefits) fd.append("benefits", form.benefits);
      if (file) fd.append("file", file);

      const res = await fetch(`${API}/hr/contracts`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      const json = await res.json();
      if (!json.success) { setError(json.error?.message || t("hr.common.failedContract")); return; }
      setShowForm(false);
      setFile(null);
      setForm({ contract_type: "full_time", start_date: "", end_date: "", salary: "", benefits: "", status: "active" });
      await fetchContracts();
    } catch { setError(t("hr.common.networkError")); }
    finally { setBusy(false); }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t("hr.contracts.deleteConfirm"))) return;
    const res = await fetch(`${API}/hr/contracts/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` } });
    const json = await res.json();
    if (json.success) await fetchContracts();
  }

  return (
    <div className={styles.tabSection}>
      <div className={styles.sectionHeader}>
        <h3>{t("hr.contracts.titlePre")} ({formatNumber(contracts.length, lang)})</h3>
        <button className={styles.addBtn} onClick={() => setShowForm(!showForm)}>{showForm ? t("common.cancel") : t("hr.contracts.add")}</button>
      </div>

      {showForm && (
        <form className={styles.docForm} onSubmit={handleSubmit}>
          {error && <div className={styles.error}>{error}</div>}
          <div className={styles.formRow}>
            <div className={styles.field}>
              <label>{t("hr.contracts.fType")}</label>
              <select value={form.contract_type} onChange={(e) => setForm({ ...form, contract_type: e.target.value })}>
                {Object.entries(CONTRACT_TYPE_KEYS).map(([v, k]) => <option key={v} value={v}>{t(k)}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label>{t("hr.contracts.fStatus")}</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {Object.entries(CONTRACT_STATUS_KEYS).map(([v, k]) => <option key={v} value={v}>{t(k)}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label>{t("hr.contracts.fStart")}</label>
              <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label>{t("hr.contracts.fEnd")}</label>
              <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label>{t("hr.contracts.fSalary")}</label>
              <input type="number" min="0" step="0.01" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label>{t("hr.contracts.fBenefits")}</label>
              <input type="text" value={form.benefits} onChange={(e) => setForm({ ...form, benefits: e.target.value })} placeholder={t("hr.contracts.phBenefits")} />
            </div>
            <div className={styles.field}>
              <label>{t("hr.contracts.fFile")}</label>
              <label className={styles.fileField}>
                <FileUp size={14} /> {fileInputLabel(file, false, t)}
                <input type="file" hidden onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </label>
            </div>
          </div>
          <div className={styles.formActions}>
            <button type="submit" className={styles.primaryBtn} disabled={busy}>{busy ? t("hr.contracts.creating") : t("hr.contracts.create")}</button>
          </div>
        </form>
      )}

      {loading ? <div className={styles.loading}>{t("hr.contracts.loading")}</div> : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("hr.contracts.colType")}</th>
                <th>{t("hr.contracts.colPeriod")}</th>
                <th>{t("hr.contracts.colSalary")}</th>
                <th>{t("hr.contracts.colBenefits")}</th>
                <th>{t("hr.contracts.colExpiry")}</th>
                <th>{t("hr.contracts.colStatus")}</th>
                <th>{t("hr.contracts.colFile")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => (
                <tr key={c.id}>
                  <td>
                    <span className={styles.typeBadge}>{t(CONTRACT_TYPE_KEYS[c.contractType] || c.contractType)}</span>
                  </td>
                  <td className={styles.periodCell}>
                    {c.startDate ? formatDate(c.startDate, lang) : "—"} → {c.endDate ? formatDate(c.endDate, lang) : t("hr.contracts.openEnded")}
                  </td>
                  <td>{c.salary != null ? formatCurrency(Number(c.salary), lang) : "—"}</td>
                  <td className={styles.benefitsCell}>{c.benefits || "—"}</td>
                  <td><ExpiryBadge date={c.endDate} /></td>
                  <td>
                    <span className={styles.statusBadge} style={{ background: (CONTRACT_STATUS_COLORS[c.status] || "#6b7280") + "18", color: CONTRACT_STATUS_COLORS[c.status] || "#6b7280" }}>
                      {t(CONTRACT_STATUS_KEYS[c.status] || c.status)}
                    </span>
                  </td>
                  <td>
                    {c.fileUrl ? <a href={`${API.replace("/api/v1", "")}${c.fileUrl}`} target="_blank" rel="noreferrer" className={styles.fileLink}><Upload size={12} /> {t("hr.contracts.view")}</a> : "—"}
                  </td>
                  <td>
                    <button className={styles.iconBtn} onClick={() => handleDelete(c.id)} title={t("hr.profile.deleteTitle")}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
              {contracts.length === 0 && (
                <tr><td colSpan={8} className={styles.emptyState}>{t("hr.contracts.empty")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DocumentsTab({ employeeId }: { employeeId: string }) {
  const { lang, t } = useLanguage();
  void lang;
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    document_type: "id_card", number: "", issue_date: "", expiry_date: "", notes: "",
  });

  const fetchDocs = useCallback(async () => {
    try {
      const res = await fetch(`${API}/hr/employee-documents?employee_id=${employeeId}&pageSize=100`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const json = await res.json();
      if (json.success) setDocs(json.data || []);
    } catch {} finally { setLoading(false); }
  }, [employeeId]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("employee_id", employeeId);
      fd.append("document_type", form.document_type);
      if (form.number) fd.append("number", form.number);
      if (form.issue_date) fd.append("issue_date", form.issue_date);
      if (form.expiry_date) fd.append("expiry_date", form.expiry_date);
      if (form.notes) fd.append("notes", form.notes);
      if (file) fd.append("file", file);

      const res = await fetch(`${API}/hr/employee-documents`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      const json = await res.json();
      if (!json.success) { setError(json.error?.message || t("hr.common.failedDoc")); return; }
      setShowForm(false);
      setFile(null);
      setForm({ document_type: "id_card", number: "", issue_date: "", expiry_date: "", notes: "" });
      await fetchDocs();
    } catch { setError(t("hr.common.networkError")); }
    finally { setBusy(false); }
  }

  async function handleDelete(did: string) {
    if (!window.confirm(t("hr.docs.deleteConfirm"))) return;
    const res = await fetch(`${API}/hr/employee-documents/${did}`, { method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` } });
    const json = await res.json();
    if (json.success) await fetchDocs();
  }

  return (
    <div className={styles.tabSection}>
      <div className={styles.sectionHeader}>
        <h3>{t("hr.docs.titlePre")} ({docs.length})</h3>
        <button className={styles.addBtn} onClick={() => setShowForm(!showForm)}>{showForm ? t("common.cancel") : t("hr.docs.add")}</button>
      </div>

      {showForm && (
        <form className={styles.docForm} onSubmit={handleSubmit}>
          {error && <div className={styles.error}>{error}</div>}
          <div className={styles.formRow}>
            <div className={styles.field}>
              <label>{t("hr.docs.fType")}</label>
              <select value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value })}>
                {Object.entries(DOC_TYPE_KEYS).map(([v, k]) => <option key={v} value={v}>{t(k)}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label>{t("hr.docs.fNumber")}</label>
              <input type="text" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label>{t("hr.docs.fIssue")}</label>
              <input type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label>{t("hr.docs.fExpiry")}</label>
              <input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label>{t("hr.docs.fNotes")}</label>
              <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label>{t("hr.docs.fFile")}</label>
              <label className={styles.fileField}>
                <FileUp size={14} /> {file ? file.name : t("hr.contracts.attachFile")}
                <input type="file" hidden onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </label>
            </div>
          </div>
          <div className={styles.formActions}>
            <button type="submit" className={styles.primaryBtn} disabled={busy}>{busy ? t("hr.docs.creating") : t("hr.docs.create")}</button>
          </div>
        </form>
      )}

      {loading ? <div className={styles.loading}>{t("hr.docs.loading")}</div> : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("hr.docs.colType")}</th>
                <th>{t("hr.docs.colNumber")}</th>
                <th>{t("hr.docs.colIssued")}</th>
                <th>{t("hr.docs.colExpiry")}</th>
                <th>{t("hr.docs.colNotes")}</th>
                <th>{t("hr.docs.colFile")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id}>
                  <td><span className={styles.typeBadge}>{t(DOC_TYPE_KEYS[d.documentType] || d.documentType)}</span></td>
                  <td>{d.number || "—"}</td>
                  <td>{d.issueDate ? formatDate(d.issueDate, lang) : "—"}</td>
                  <td><ExpiryBadge date={d.expiryDate} /></td>
                  <td className={styles.benefitsCell}>{d.notes || "—"}</td>
                  <td>
                    {d.fileUrl ? <a href={`${API.replace("/api/v1", "")}${d.fileUrl}`} target="_blank" rel="noreferrer" className={styles.fileLink}><Upload size={12} /> {t("hr.docs.view")}</a> : "—"}
                  </td>
                  <td>
                    <button className={styles.iconBtn} onClick={() => handleDelete(d.id)} title={t("hr.profile.deleteTitle")}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
              {docs.length === 0 && (
                <tr><td colSpan={7} className={styles.emptyState}>{t("hr.docs.empty")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
