"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit, User, Phone, Calendar, MapPin, FileText, AlertTriangle, Upload, Trash2, Clock, CheckCircle, XCircle } from "lucide-react";
import DriverScheduleView from "@/components/DriverScheduleView";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const STATUS_COLORS: Record<string, string> = {
  active: "#10b981", suspended: "#f59e0b", terminated: "#ef4444", on_leave: "#3b82f6",
};

const DOC_TYPES: Record<string, string> = {
  license: "License", passport: "Passport", visa: "Visa", id_card: "ID Card",
  medical: "Medical", contract: "Contract", training_cert: "Training Cert", other: "Other",
};

const CONFIRM_COLORS: Record<string, string> = {
  accepted: "#10b981", rejected: "#ef4444", pending: "#f59e0b",
};

export default function DriverProfilePage() {
  const { id } = useParams();
  const [driver, setDriver] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"info" | "documents" | "schedule">("info");
  const [uploading, setUploading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [showDocForm, setShowDocForm] = useState(false);
  const [docForm, setDocForm] = useState({ documentType: "license", documentNumber: "", issueDate: "", expiryDate: "" });

  async function fetchDriver() {
    try {
      const token = localStorage.getItem("seum_access_token");
      const res = await fetch(`${API}/drivers/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) setDriver(json.data);
    } catch {} finally { setLoading(false); }
  }

  useEffect(() => { fetchDriver(); }, [id]);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    try {
      const token = localStorage.getItem("seum_access_token");
      const fd = new FormData();
      fd.append("photo", file);
      const res = await fetch(`${API}/drivers/${id}/photo`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd,
      });
      const json = await res.json();
      if (json.success) { await fetchDriver(); }
    } catch {} finally { setPhotoUploading(false); }
  }

  async function handleDocSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUploading(true);
    try {
      const token = localStorage.getItem("seum_access_token");
      const res = await fetch(`${API}/drivers/${id}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(docForm),
      });
      const json = await res.json();
      if (json.success) {
        setShowDocForm(false);
        setDocForm({ documentType: "license", documentNumber: "", issueDate: "", expiryDate: "" });
        await fetchDriver();
      }
    } catch {} finally { setUploading(false); }
  }

  async function handleDeleteDoc(docId: string) {
    if (!confirm("Delete this document?")) return;
    try {
      const token = localStorage.getItem("seum_access_token");
      await fetch(`${API}/drivers/${id}/documents/${docId}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      await fetchDriver();
    } catch {}
  }

  if (loading) return <div className={styles.loading}>Loading driver profile...</div>;
  if (!driver) return <div className={styles.loading}>Driver not found</div>;

  const daysToExpiry = (date: string) => {
    if (!date) return null;
    const diff = new Date(date).getTime() - Date.now();
    return Math.ceil(diff / 86400000);
  };

  const licDays = daysToExpiry(driver.licenseExpiry);
  const medDays = daysToExpiry(driver.medicalFitnessExpiry);

  return (
    <div className={styles.page}>
      <Link href="/dashboard/drivers" className={styles.backLink}><ArrowLeft size={14} /> Back to Drivers</Link>

      <div className={styles.profileHeader}>
        <div className={styles.photoWrap}>
          <div className={styles.profilePhoto}>
            {driver.photoUrl ? <img src={driver.photoUrl} alt="" className={styles.photoImg} /> : driver.name?.charAt(0).toUpperCase() || "?"}
          </div>
          <label className={styles.photoUploadBtn}>
            <Upload size={12} />
            <input type="file" accept="image/*" onChange={handlePhotoUpload} hidden disabled={photoUploading} />
          </label>
        </div>
        <div className={styles.headerInfo}>
          <div className={styles.headerNameRow}>
            <h1 className={styles.driverName}>{driver.name || "Unnamed Driver"}</h1>
            <span className={styles.statusBadge} style={{ background: (STATUS_COLORS[driver.status] || "#6b7280") + "18", color: STATUS_COLORS[driver.status] || "#6b7280" }}>
              {driver.status?.replace("_", " ")}
            </span>
          </div>
          <p className={styles.driverEmail}>{driver.email}</p>
          <div className={styles.headerMeta}>
            {driver.employeeCode && <span><User size={12} /> Code: {driver.employeeCode}</span>}
            {driver.nationality && <span><MapPin size={12} /> {driver.nationality}</span>}
            {driver.licenseNumber && <span><FileText size={12} /> License: {driver.licenseNumber}</span>}
          </div>
        </div>
        <Link href={`/dashboard/drivers/${id}/edit`} className={styles.editBtn}>
          <Edit size={14} /> Edit
        </Link>
      </div>

      {licDays !== null && licDays <= 30 && licDays > 0 && (
        <div className={styles.expiryBanner}><AlertTriangle size={14} /> License expires in {licDays} day{licDays !== 1 ? 's' : ''} ({new Date(driver.licenseExpiry).toLocaleDateString("en-GB")})</div>
      )}
      {medDays !== null && medDays <= 30 && medDays > 0 && (
        <div className={styles.expiryBanner}><AlertTriangle size={14} /> Medical fitness expires in {medDays} day{medDays !== 1 ? 's' : ''} ({new Date(driver.medicalFitnessExpiry).toLocaleDateString("en-GB")})</div>
      )}

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === "info" ? styles.tabActive : ""}`} onClick={() => setActiveTab("info")}><User size={14} /> Info</button>
        <button className={`${styles.tab} ${activeTab === "documents" ? styles.tabActive : ""}`} onClick={() => setActiveTab("documents")}><FileText size={14} /> Documents ({driver.documents?.length || 0})</button>
        <button className={`${styles.tab} ${activeTab === "schedule" ? styles.tabActive : ""}`} onClick={() => setActiveTab("schedule")}><Clock size={14} /> Schedule</button>
      </div>

      {activeTab === "info" && (
        <div className={styles.infoGrid}>
          <div className={styles.infoCard}>
            <h3>License & Identity</h3>
            <div className={styles.infoRow}><span>License Number</span><span>{driver.licenseNumber || "—"}</span></div>
            <div className={styles.infoRow}><span>License Category</span><span>{driver.licenseCategory || "—"}</span></div>
            <div className={styles.infoRow}><span>License Expiry</span><span>{driver.licenseExpiry ? new Date(driver.licenseExpiry).toLocaleDateString("en-GB") + (licDays !== null && licDays > 0 ? ` (${licDays}d)` : "") : "—"}</span></div>
            <div className={styles.infoRow}><span>Passport Number</span><span>{driver.passportNumber || "—"}</span></div>
          </div>
          <div className={styles.infoCard}>
            <h3>Personal</h3>
            <div className={styles.infoRow}><span>Nationality</span><span>{driver.nationality || "—"}</span></div>
            <div className={styles.infoRow}><span>Date of Birth</span><span>{driver.dateOfBirth ? new Date(driver.dateOfBirth).toLocaleDateString("en-GB") : "—"}</span></div>
            <div className={styles.infoRow}><span>Blood Type</span><span>{driver.bloodType || "—"}</span></div>
            <div className={styles.infoRow}><span>Medical Fitness Expiry</span><span>{driver.medicalFitnessExpiry ? new Date(driver.medicalFitnessExpiry).toLocaleDateString("en-GB") + (medDays !== null && medDays > 0 ? ` (${medDays}d)` : "") : "—"}</span></div>
          </div>
          <div className={styles.infoCard}>
            <h3>Employment</h3>
            <div className={styles.infoRow}><span>Employee Code</span><span>{driver.employeeCode || "—"}</span></div>
            <div className={styles.infoRow}><span>Hire Date</span><span>{driver.hireDate ? new Date(driver.hireDate).toLocaleDateString("en-GB") : "—"}</span></div>
            <div className={styles.infoRow}><span>Status</span><span style={{ color: STATUS_COLORS[driver.status] || "#6b7280", fontWeight: 600 }}>{driver.status?.replace("_", " ") || "—"}</span></div>
          </div>
          <div className={styles.infoCard}>
            <h3>Emergency Contact</h3>
            <div className={styles.infoRow}><span>Name</span><span>{driver.emergencyContactName || "—"}</span></div>
            <div className={styles.infoRow}><span>Phone</span><span>{driver.emergencyContactPhone || "—"}</span></div>
          </div>
        </div>
      )}

      {activeTab === "documents" && (
        <div className={styles.docSection}>
          <div className={styles.docHeader}>
            <h3>Documents</h3>
            <button className={styles.addDocBtn} onClick={() => setShowDocForm(!showDocForm)}>+ Add Document</button>
          </div>

          {showDocForm && (
            <form className={styles.docForm} onSubmit={handleDocSubmit}>
              <div className={styles.docFormGrid}>
                <div className={styles.field}>
                  <label>Type</label>
                  <select value={docForm.documentType} onChange={(e) => setDocForm(f => ({ ...f, documentType: e.target.value }))}>
                    {Object.entries(DOC_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className={styles.field}>
                  <label>Document Number</label>
                  <input value={docForm.documentNumber} onChange={(e) => setDocForm(f => ({ ...f, documentNumber: e.target.value }))} />
                </div>
                <div className={styles.field}>
                  <label>Issue Date</label>
                  <input type="date" value={docForm.issueDate} onChange={(e) => setDocForm(f => ({ ...f, issueDate: e.target.value }))} />
                </div>
                <div className={styles.field}>
                  <label>Expiry Date</label>
                  <input type="date" value={docForm.expiryDate} onChange={(e) => setDocForm(f => ({ ...f, expiryDate: e.target.value }))} />
                </div>
              </div>
              <div className={styles.docFormActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowDocForm(false)}>Cancel</button>
                <button className={styles.saveBtn} disabled={uploading}>{uploading ? "Adding..." : "Add Document"}</button>
              </div>
            </form>
          )}

          {(!driver.documents || driver.documents.length === 0) ? (
            <p className={styles.empty}>No documents added yet</p>
          ) : (
            <div className={styles.docList}>
              <table className={styles.docTable}>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Number</th>
                    <th>Issue Date</th>
                    <th>Expiry</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {driver.documents.map((doc: any) => {
                    const expDays = daysToExpiry(doc.expiryDate);
                    return (
                      <tr key={doc.id}>
                        <td className={styles.docType}>{DOC_TYPES[doc.documentType] || doc.documentType}</td>
                        <td>{doc.documentNumber || "—"}</td>
                        <td>{doc.issueDate ? new Date(doc.issueDate).toLocaleDateString("en-GB") : "—"}</td>
                        <td>
                          {doc.expiryDate ? (
                            <span className={expDays !== null && expDays <= 30 ? styles.expiryWarn : ""}>
                              {new Date(doc.expiryDate).toLocaleDateString("en-GB")}
                              {expDays !== null && expDays <= 30 && ` (${expDays}d)`}
                            </span>
                          ) : "—"}
                        </td>
                        <td>
                          <button className={styles.deleteDocBtn} onClick={() => handleDeleteDoc(doc.id)}>
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "schedule" && (
        <div className={styles.scheduleSection}>
          {driver?.userId ? (
            <DriverScheduleView key={driver.userId} userId={driver.userId} />
          ) : (
            <p className={styles.empty}>This driver has no user account linked yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
