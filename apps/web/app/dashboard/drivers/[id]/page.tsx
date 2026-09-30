"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit, User, Phone, Calendar, MapPin, FileText, AlertTriangle, Upload, Trash2, Clock, CheckCircle, XCircle } from "lucide-react";
import DriverScheduleView from "@/components/DriverScheduleView";
import { useLanguage, formatDate } from "@/lib/i18n";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const STATUS_COLORS: Record<string, string> = {
  active: "#10b981", suspended: "#f59e0b", terminated: "#ef4444", on_leave: "#3b82f6",
};

const DOC_KEYS: Record<string, string> = {
  license: "drivers.docTypes.license", passport: "drivers.docTypes.passport", visa: "drivers.docTypes.visa", id_card: "drivers.docTypes.idCard",
  medical: "drivers.docTypes.medical", contract: "drivers.docTypes.contract", training_cert: "drivers.docTypes.trainingCert", other: "drivers.docTypes.other",
};

const CONFIRM_COLORS: Record<string, string> = {
  accepted: "#10b981", rejected: "#ef4444", pending: "#f59e0b",
};

export default function DriverProfilePage() {
  const { lang, t } = useLanguage();
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
    if (!confirm(t("drivers.profile.deleteDocConfirm"))) return;
    try {
      const token = localStorage.getItem("seum_access_token");
      await fetch(`${API}/drivers/${id}/documents/${docId}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      await fetchDriver();
    } catch {}
  }

  if (loading) return <div className={styles.loading}>{t("drivers.profile.loading")}</div>;
  if (!driver) return <div className={styles.loading}>{t("drivers.profile.notFound")}</div>;

  const daysToExpiry = (date: string) => {
    if (!date) return null;
    const diff = new Date(date).getTime() - Date.now();
    return Math.ceil(diff / 86400000);
  };

  const licDays = daysToExpiry(driver.licenseExpiry);
  const medDays = daysToExpiry(driver.medicalFitnessExpiry);

  return (
    <div className={styles.page}>
      <Link href="/dashboard/drivers" className={styles.backLink}><ArrowLeft size={14} /> {t("drivers.profile.back")}</Link>

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
            <h1 className={styles.driverName}>{driver.name || t("drivers.profile.unnamed")}</h1>
            <span className={styles.statusBadge} style={{ background: (STATUS_COLORS[driver.status] || "#6b7280") + "18", color: STATUS_COLORS[driver.status] || "#6b7280" }}>
              {driver.status?.replace("_", " ")}
            </span>
          </div>
          <p className={styles.driverEmail}>{driver.email}</p>
          <div className={styles.headerMeta}>
            {driver.employeeCode && <span><User size={12} /> {t("drivers.profile.codeLabel")} {driver.employeeCode}</span>}
            {driver.nationality && <span><MapPin size={12} /> {driver.nationality}</span>}
            {driver.licenseNumber && <span><FileText size={12} /> {t("drivers.profile.licenseLabel")} {driver.licenseNumber}</span>}
          </div>
        </div>
        <Link href={`/dashboard/drivers/${id}/edit`} className={styles.editBtn}>
          <Edit size={14} /> {t("common.edit")}
        </Link>
      </div>

      {licDays !== null && licDays <= 30 && licDays > 0 && (
        <div className={styles.expiryBanner}><AlertTriangle size={14} /> {t("drivers.profile.licenseExpiresIn")} {licDays} {licDays !== 1 ? t("drivers.profile.dayPl") : t("drivers.profile.daySg")} ({formatDate(driver.licenseExpiry, lang)})</div>
      )}
      {medDays !== null && medDays <= 30 && medDays > 0 && (
        <div className={styles.expiryBanner}><AlertTriangle size={14} /> {t("drivers.profile.medicalExpiresIn")} {medDays} {medDays !== 1 ? t("drivers.profile.dayPl") : t("drivers.profile.daySg")} ({formatDate(driver.medicalFitnessExpiry, lang)})</div>
      )}

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === "info" ? styles.tabActive : ""}`} onClick={() => setActiveTab("info")}><User size={14} /> {t("drivers.profile.tabInfo")}</button>
        <button className={`${styles.tab} ${activeTab === "documents" ? styles.tabActive : ""}`} onClick={() => setActiveTab("documents")}><FileText size={14} /> {t("drivers.profile.tabDocs")} ({driver.documents?.length || 0})</button>
        <button className={`${styles.tab} ${activeTab === "schedule" ? styles.tabActive : ""}`} onClick={() => setActiveTab("schedule")}><Clock size={14} /> {t("drivers.profile.tabSchedule")}</button>
      </div>

      {activeTab === "info" && (
        <div className={styles.infoGrid}>
          <div className={styles.infoCard}>
            <h3>{t("drivers.profile.secLicense")}</h3>
            <div className={styles.infoRow}><span>{t("drivers.profile.fLicenseNumber")}</span><span>{driver.licenseNumber || "—"}</span></div>
            <div className={styles.infoRow}><span>{t("drivers.profile.fLicenseCategory")}</span><span>{driver.licenseCategory || "—"}</span></div>
            <div className={styles.infoRow}><span>{t("drivers.profile.fLicenseExpiry")}</span><span>{driver.licenseExpiry ? formatDate(driver.licenseExpiry, lang) + (licDays !== null && licDays > 0 ? ` (${licDays}${t("drivers.profile.daysShort")})` : "") : "—"}</span></div>
            <div className={styles.infoRow}><span>{t("drivers.profile.fPassportNumber")}</span><span>{driver.passportNumber || "—"}</span></div>
          </div>
          <div className={styles.infoCard}>
            <h3>{t("drivers.profile.secPersonal")}</h3>
            <div className={styles.infoRow}><span>{t("drivers.profile.fNationality")}</span><span>{driver.nationality || "—"}</span></div>
            <div className={styles.infoRow}><span>{t("drivers.profile.fDob")}</span><span>{driver.dateOfBirth ? formatDate(driver.dateOfBirth, lang) : "—"}</span></div>
            <div className={styles.infoRow}><span>{t("drivers.profile.fBloodType")}</span><span>{driver.bloodType || "—"}</span></div>
            <div className={styles.infoRow}><span>{t("drivers.profile.fMedicalExpiry")}</span><span>{driver.medicalFitnessExpiry ? formatDate(driver.medicalFitnessExpiry, lang) + (medDays !== null && medDays > 0 ? ` (${medDays}${t("drivers.profile.daysShort")})` : "") : "—"}</span></div>
          </div>
          <div className={styles.infoCard}>
            <h3>{t("drivers.profile.secEmployment")}</h3>
            <div className={styles.infoRow}><span>{t("drivers.profile.fEmpCode")}</span><span>{driver.employeeCode || "—"}</span></div>
            <div className={styles.infoRow}><span>{t("drivers.profile.fHireDate")}</span><span>{driver.hireDate ? formatDate(driver.hireDate, lang) : "—"}</span></div>
            <div className={styles.infoRow}><span>{t("drivers.profile.fStatus")}</span><span style={{ color: STATUS_COLORS[driver.status] || "#6b7280", fontWeight: 600 }}>{driver.status?.replace("_", " ") || "—"}</span></div>
          </div>
          <div className={styles.infoCard}>
            <h3>{t("drivers.profile.secEmergency")}</h3>
            <div className={styles.infoRow}><span>{t("drivers.profile.fName")}</span><span>{driver.emergencyContactName || "—"}</span></div>
            <div className={styles.infoRow}><span>{t("drivers.profile.fPhone")}</span><span>{driver.emergencyContactPhone || "—"}</span></div>
          </div>
        </div>
      )}

      {activeTab === "documents" && (
        <div className={styles.docSection}>
          <div className={styles.docHeader}>
            <h3>{t("drivers.profile.tabDocs")}</h3>
            <button className={styles.addDocBtn} onClick={() => setShowDocForm(!showDocForm)}>{t("drivers.profile.addDoc")}</button>
          </div>

          {showDocForm && (
            <form className={styles.docForm} onSubmit={handleDocSubmit}>
              <div className={styles.docFormGrid}>
                <div className={styles.field}>
                  <label>{t("drivers.profile.docType")}</label>
                  <select value={docForm.documentType} onChange={(e) => setDocForm(f => ({ ...f, documentType: e.target.value }))}>
                    {Object.entries(DOC_KEYS).map(([k, key]) => <option key={k} value={k}>{t(key)}</option>)}
                  </select>
                </div>
                <div className={styles.field}>
                  <label>{t("drivers.profile.docNumber")}</label>
                  <input value={docForm.documentNumber} onChange={(e) => setDocForm(f => ({ ...f, documentNumber: e.target.value }))} />
                </div>
                <div className={styles.field}>
                  <label>{t("drivers.profile.issueDate")}</label>
                  <input type="date" value={docForm.issueDate} onChange={(e) => setDocForm(f => ({ ...f, issueDate: e.target.value }))} />
                </div>
                <div className={styles.field}>
                  <label>{t("drivers.profile.expiryDate")}</label>
                  <input type="date" value={docForm.expiryDate} onChange={(e) => setDocForm(f => ({ ...f, expiryDate: e.target.value }))} />
                </div>
              </div>
              <div className={styles.docFormActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowDocForm(false)}>{t("common.cancel")}</button>
                <button className={styles.saveBtn} disabled={uploading}>{uploading ? t("drivers.profile.adding") : t("drivers.profile.addDocBtn")}</button>
              </div>
            </form>
          )}

          {(!driver.documents || driver.documents.length === 0) ? (
            <p className={styles.empty}>{t("drivers.profile.noDocs")}</p>
          ) : (
            <div className={styles.docList}>
              <table className={styles.docTable}>
                <thead>
                  <tr>
                    <th>{t("drivers.profile.docType")}</th>
                    <th>{t("drivers.profile.colNumber")}</th>
                    <th>{t("drivers.profile.issueDate")}</th>
                    <th>{t("drivers.profile.colExpiry")}</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {driver.documents.map((doc: any) => {
                    const expDays = daysToExpiry(doc.expiryDate);
                    return (
                      <tr key={doc.id}>
                        <td className={styles.docType}>{t(DOC_KEYS[doc.documentType] || doc.documentType)}</td>
                        <td>{doc.documentNumber || "—"}</td>
                        <td>{doc.issueDate ? formatDate(doc.issueDate, lang) : "—"}</td>
                        <td>
                          {doc.expiryDate ? (
                            <span className={expDays !== null && expDays <= 30 ? styles.expiryWarn : ""}>
                              {formatDate(doc.expiryDate, lang)}
                              {expDays !== null && expDays <= 30 && ` (${expDays}${t("drivers.profile.daysShort")})`}
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
            <p className={styles.empty}>{t("drivers.profile.noUser")}</p>
          )}
        </div>
      )}
    </div>
  );
}
