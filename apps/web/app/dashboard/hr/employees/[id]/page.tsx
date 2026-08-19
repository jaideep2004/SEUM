"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit, User, Briefcase, FileText, Clock, Phone, Calendar, MapPin, Hash, Mail, Upload, Trash2, FileUp } from "lucide-react";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const STATUS_COLORS: Record<string, string> = {
  active: "#10b981", suspended: "#f59e0b", terminated: "#ef4444", on_leave: "#3b82f6",
};

const DEPARTMENT_LABELS: Record<string, string> = {
  operations: "Operations", finance: "Finance", hr: "HR", fleet: "Fleet",
  maintenance: "Maintenance", customer_service: "Customer Service", executive: "Executive", admin: "Admin",
};

const CONTRACT_TYPES: Record<string, string> = {
  full_time: "Full Time", part_time: "Part Time", fixed_term: "Fixed Term",
  probation: "Probation", internship: "Internship", consultant: "Consultant", freelance: "Freelance",
};

const CONTRACT_STATUSES: Record<string, string> = {
  draft: "Draft", active: "Active", expired: "Expired", terminated: "Terminated",
};

const CONTRACT_STATUS_COLORS: Record<string, string> = {
  draft: "#6b7280", active: "#10b981", expired: "#f59e0b", terminated: "#ef4444",
};

const DOC_TYPES: Record<string, string> = {
  id_card: "ID Card", passport: "Passport", visa: "Visa", iqama: "Iqama",
  work_permit: "Work Permit", license: "License", insurance: "Insurance",
  academic: "Academic", certificate: "Certificate", medical: "Medical", bank: "Bank", other: "Other",
};

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function ExpiryBadge({ date }: { date: string | null }) {
  const d = daysUntil(date);
  if (d === null || !date) return <span className={styles.noExpiry}>—</span>;
  if (d < 0) return <span className={styles.expiredBadge}>Expired</span>;
  if (d <= 30) return <span className={styles.expiringBadge}>{d}d left</span>;
  return <span className={styles.validBadge}>{new Date(date).toLocaleDateString("en-GB")}</span>;
}

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("seum_access_token") || "";
}

function fileInputLabel(file: File | null, busy: boolean) {
  if (busy) return "Uploading...";
  return file ? file.name : "Attach file";
}

export default function EmployeeProfilePage() {
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

  if (loading) return <div className={styles.loading}>Loading employee profile...</div>;
  if (!employee) return <div className={styles.loading}>Employee not found</div>;

  const contractDays = employee.contractEndDate
    ? Math.ceil((new Date(employee.contractEndDate).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div className={styles.page}>
      <Link href="/dashboard/hr/employees" className={styles.backLink}><ArrowLeft size={14} /> Back to Employees</Link>

      <div className={styles.profileHeader}>
        <div className={styles.profilePhoto}>
          {employee.name?.charAt(0).toUpperCase() || "?"}
        </div>
        <div className={styles.headerInfo}>
          <div className={styles.headerNameRow}>
            <h1 className={styles.employeeName}>{employee.name || "Unnamed Employee"}</h1>
            <span className={styles.statusBadge} style={{ background: (STATUS_COLORS[employee.status] || "#6b7280") + "18", color: STATUS_COLORS[employee.status] || "#6b7280" }}>
              {employee.status?.replace("_", " ")}
            </span>
          </div>
          <p className={styles.employeeEmail}>{employee.email}</p>
          <div className={styles.headerMeta}>
            {employee.employeeCode && <span><Hash size={12} /> Code: {employee.employeeCode}</span>}
            {employee.department && <span><Briefcase size={12} /> {DEPARTMENT_LABELS[employee.department] || employee.department}</span>}
            {employee.designation && <span><User size={12} /> {employee.designation}</span>}
            {employee.nationality && <span><MapPin size={12} /> {employee.nationality}</span>}
          </div>
        </div>
        <Link href={`/dashboard/hr/employees/${id}/edit`} className={styles.editBtn}>
          <Edit size={14} /> Edit
        </Link>
      </div>

      {contractDays !== null && contractDays <= 30 && (
        <div className={styles.expiryBanner}><Calendar size={14} /> Contract {contractDays <= 0 ? "expired" : `expires in ${contractDays} day${contractDays !== 1 ? 's' : ''}`} ({new Date(employee.contractEndDate).toLocaleDateString("en-GB")})</div>
      )}

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === "info" ? styles.tabActive : ""}`} onClick={() => setActiveTab("info")}><User size={14} /> Info</button>
        <button className={`${styles.tab} ${activeTab === "contracts" ? styles.tabActive : ""}`} onClick={() => setActiveTab("contracts")}><Briefcase size={14} /> Contracts</button>
        <button className={`${styles.tab} ${activeTab === "documents" ? styles.tabActive : ""}`} onClick={() => setActiveTab("documents")}><FileText size={14} /> Documents</button>
        <button className={`${styles.tab} ${activeTab === "attendance" ? styles.tabActive : ""}`} onClick={() => setActiveTab("attendance")}><Clock size={14} /> Attendance</button>
      </div>

      {activeTab === "info" && (
        <div className={styles.infoGrid}>
          <div className={styles.infoCard}>
            <h3>Employment</h3>
            <div className={styles.infoRow}><span>Employee Code</span><span>{employee.employeeCode || "—"}</span></div>
            <div className={styles.infoRow}><span>Department</span><span>{DEPARTMENT_LABELS[employee.department] || employee.department || "—"}</span></div>
            <div className={styles.infoRow}><span>Designation</span><span>{employee.designation || "—"}</span></div>
            <div className={styles.infoRow}><span>Join Date</span><span>{employee.joinDate ? new Date(employee.joinDate).toLocaleDateString("en-GB") : "—"}</span></div>
            <div className={styles.infoRow}><span>Contract End Date</span><span>{employee.contractEndDate ? new Date(employee.contractEndDate).toLocaleDateString("en-GB") + (contractDays !== null && contractDays > 0 ? ` (${contractDays}d)` : "") : "—"}</span></div>
            <div className={styles.infoRow}><span>Status</span><span style={{ color: STATUS_COLORS[employee.status] || "#6b7280", fontWeight: 600 }}>{employee.status?.replace("_", " ") || "—"}</span></div>
          </div>
          <div className={styles.infoCard}>
            <h3>Contact</h3>
            <div className={styles.infoRow}><span><Mail size={12} /> Email</span><span>{employee.email || "—"}</span></div>
            <div className={styles.infoRow}><span><Phone size={12} /> Phone</span><span>{employee.phone || "—"}</span></div>
          </div>
          <div className={styles.infoCard}>
            <h3>Identity</h3>
            <div className={styles.infoRow}><span>Nationality</span><span>{employee.nationality || "—"}</span></div>
            <div className={styles.infoRow}><span>ID Number</span><span>{employee.idNumber || "—"}</span></div>
          </div>
        </div>
      )}

      {activeTab === "contracts" && <ContractsTab employeeId={employeeId} />}
      {activeTab === "documents" && <DocumentsTab employeeId={employeeId} />}

      {activeTab === "attendance" && (
        <div className={styles.placeholderSection}>
          <Clock size={32} className={styles.placeholderIcon} />
          <h3>Attendance</h3>
          <p>Employee check-in/out and attendance records arrive with Phase 5.2 (Employee Attendance).</p>
        </div>
      )}
    </div>
  );
}

function ContractsTab({ employeeId }: { employeeId: string }) {
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
      if (!json.success) { setError(json.error?.message || "Failed to create contract"); return; }
      setShowForm(false);
      setFile(null);
      setForm({ contract_type: "full_time", start_date: "", end_date: "", salary: "", benefits: "", status: "active" });
      await fetchContracts();
    } catch { setError("Network error"); }
    finally { setBusy(false); }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this contract?")) return;
    const res = await fetch(`${API}/hr/contracts/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` } });
    const json = await res.json();
    if (json.success) await fetchContracts();
  }

  return (
    <div className={styles.tabSection}>
      <div className={styles.sectionHeader}>
        <h3>Contracts ({contracts.length})</h3>
        <button className={styles.addBtn} onClick={() => setShowForm(!showForm)}>{showForm ? "Cancel" : "+ Add Contract"}</button>
      </div>

      {showForm && (
        <form className={styles.docForm} onSubmit={handleSubmit}>
          {error && <div className={styles.error}>{error}</div>}
          <div className={styles.formRow}>
            <div className={styles.field}>
              <label>Contract Type</label>
              <select value={form.contract_type} onChange={(e) => setForm({ ...form, contract_type: e.target.value })}>
                {Object.entries(CONTRACT_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {Object.entries(CONTRACT_STATUSES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label>Start Date</label>
              <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label>End Date</label>
              <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label>Salary (monthly)</label>
              <input type="number" min="0" step="0.01" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label>Benefits</label>
              <input type="text" value={form.benefits} onChange={(e) => setForm({ ...form, benefits: e.target.value })} placeholder="e.g. Health insurance, housing" />
            </div>
            <div className={styles.field}>
              <label>Contract File</label>
              <label className={styles.fileField}>
                <FileUp size={14} /> {fileInputLabel(file, false)}
                <input type="file" hidden onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </label>
            </div>
          </div>
          <div className={styles.formActions}>
            <button type="submit" className={styles.primaryBtn} disabled={busy}>{busy ? "Creating..." : "Create Contract"}</button>
          </div>
        </form>
      )}

      {loading ? <div className={styles.loading}>Loading contracts...</div> : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Type</th>
                <th>Period</th>
                <th>Salary</th>
                <th>Benefits</th>
                <th>Expiry</th>
                <th>Status</th>
                <th>File</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => (
                <tr key={c.id}>
                  <td>
                    <span className={styles.typeBadge}>{CONTRACT_TYPES[c.contractType] || c.contractType}</span>
                  </td>
                  <td className={styles.periodCell}>
                    {c.startDate ? new Date(c.startDate).toLocaleDateString("en-GB") : "—"} → {c.endDate ? new Date(c.endDate).toLocaleDateString("en-GB") : "Open-ended"}
                  </td>
                  <td>{c.salary != null ? `${Number(c.salary).toLocaleString()}` : "—"}</td>
                  <td className={styles.benefitsCell}>{c.benefits || "—"}</td>
                  <td><ExpiryBadge date={c.endDate} /></td>
                  <td>
                    <span className={styles.statusBadge} style={{ background: (CONTRACT_STATUS_COLORS[c.status] || "#6b7280") + "18", color: CONTRACT_STATUS_COLORS[c.status] || "#6b7280" }}>
                      {CONTRACT_STATUSES[c.status] || c.status}
                    </span>
                  </td>
                  <td>
                    {c.fileUrl ? <a href={`${API.replace("/api/v1", "")}${c.fileUrl}`} target="_blank" rel="noreferrer" className={styles.fileLink}><Upload size={12} /> View</a> : "—"}
                  </td>
                  <td>
                    <button className={styles.iconBtn} onClick={() => handleDelete(c.id)} title="Delete"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
              {contracts.length === 0 && (
                <tr><td colSpan={8} className={styles.emptyState}>No contracts yet — add the first one above.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DocumentsTab({ employeeId }: { employeeId: string }) {
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
      if (!json.success) { setError(json.error?.message || "Failed to create document"); return; }
      setShowForm(false);
      setFile(null);
      setForm({ document_type: "id_card", number: "", issue_date: "", expiry_date: "", notes: "" });
      await fetchDocs();
    } catch { setError("Network error"); }
    finally { setBusy(false); }
  }

  async function handleDelete(did: string) {
    if (!window.confirm("Delete this document?")) return;
    const res = await fetch(`${API}/hr/employee-documents/${did}`, { method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` } });
    const json = await res.json();
    if (json.success) await fetchDocs();
  }

  return (
    <div className={styles.tabSection}>
      <div className={styles.sectionHeader}>
        <h3>Documents ({docs.length})</h3>
        <button className={styles.addBtn} onClick={() => setShowForm(!showForm)}>{showForm ? "Cancel" : "+ Add Document"}</button>
      </div>

      {showForm && (
        <form className={styles.docForm} onSubmit={handleSubmit}>
          {error && <div className={styles.error}>{error}</div>}
          <div className={styles.formRow}>
            <div className={styles.field}>
              <label>Document Type</label>
              <select value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value })}>
                {Object.entries(DOC_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label>Number</label>
              <input type="text" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label>Issue Date</label>
              <input type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label>Expiry Date</label>
              <input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label>Notes</label>
              <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label>Document File</label>
              <label className={styles.fileField}>
                <FileUp size={14} /> {fileInputLabel(file, false)}
                <input type="file" hidden onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </label>
            </div>
          </div>
          <div className={styles.formActions}>
            <button type="submit" className={styles.primaryBtn} disabled={busy}>{busy ? "Creating..." : "Create Document"}</button>
          </div>
        </form>
      )}

      {loading ? <div className={styles.loading}>Loading documents...</div> : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Type</th>
                <th>Number</th>
                <th>Issued</th>
                <th>Expiry</th>
                <th>Notes</th>
                <th>File</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id}>
                  <td><span className={styles.typeBadge}>{DOC_TYPES[d.documentType] || d.documentType}</span></td>
                  <td>{d.number || "—"}</td>
                  <td>{d.issueDate ? new Date(d.issueDate).toLocaleDateString("en-GB") : "—"}</td>
                  <td><ExpiryBadge date={d.expiryDate} /></td>
                  <td className={styles.benefitsCell}>{d.notes || "—"}</td>
                  <td>
                    {d.fileUrl ? <a href={`${API.replace("/api/v1", "")}${d.fileUrl}`} target="_blank" rel="noreferrer" className={styles.fileLink}><Upload size={12} /> View</a> : "—"}
                  </td>
                  <td>
                    <button className={styles.iconBtn} onClick={() => handleDelete(d.id)} title="Delete"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
              {docs.length === 0 && (
                <tr><td colSpan={7} className={styles.emptyState}>No documents yet — add the first one above.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}