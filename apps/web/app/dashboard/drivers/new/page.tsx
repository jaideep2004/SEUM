"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Upload, Trash2, Plus, ImageIcon, Camera } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const DOC_KEYS: Record<string, string> = {
  license: "drivers.docTypes.license", passport: "drivers.docTypes.passport", visa: "drivers.docTypes.visa", id_card: "drivers.docTypes.idCard",
  medical: "drivers.docTypes.medical", contract: "drivers.docTypes.contract", training_cert: "drivers.docTypes.trainingCert", other: "drivers.docTypes.other",
};

interface DocDraft {
  documentType: string;
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
}

const emptyDoc: DocDraft = { documentType: "license", documentNumber: "", issueDate: "", expiryDate: "" };

export default function NewDriverPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [documents, setDocuments] = useState<DocDraft[]>([]);
  const [form, setForm] = useState({
    email: "", password: "", name: "", employeeCode: "",
    licenseNumber: "", licenseExpiry: "", licenseCategory: "",
    passportNumber: "", nationality: "", dateOfBirth: "",
    hireDate: new Date().toISOString().slice(0, 10),
    emergencyContactName: "", emergencyContactPhone: "",
    bloodType: "", medicalFitnessExpiry: "",
  });

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function updateDoc(index: number, field: keyof DocDraft, value: string) {
    setDocuments(docs => docs.map((d, i) => (i === index ? { ...d, [field]: value } : d)));
  }

  async function uploadPhoto(driverId: string) {
    if (!photo) return;
    setProgress(t("drivers.new.progressPhoto"));
    const fd = new FormData();
    fd.append("photo", photo);
    const res = await fetch(`${API}/drivers/${driverId}/photo`, {
      method: "POST", headers: { Authorization: `Bearer ${localStorage.getItem("seum_access_token")}` }, body: fd,
    });
    const json = await res.json().catch(() => null);
    if (!json?.success) throw new Error(json?.error?.message || t("drivers.new.photoUploadFailed"));
  }

  async function uploadDocuments(driverId: string) {
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      if (!doc.documentType) continue;
      setProgress(`${t("drivers.new.progressDocPre")} ${i + 1} ${t("drivers.new.progressDocMid")} ${documents.length}...`);
      const res = await fetch(`${API}/drivers/${driverId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("seum_access_token")}` },
        body: JSON.stringify(doc),
      });
      const json = await res.json().catch(() => null);
      if (!json?.success) throw new Error(json?.error?.message || `${t("drivers.new.docFailedPre")} (${t(DOC_KEYS[doc.documentType] || doc.documentType)})`);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      setProgress(t("drivers.new.progressCreating"));
      const res = await fetch(`${API}/drivers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("seum_access_token")}` },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) { setError(json.error?.message || json.message || t("drivers.new.failedCreate")); return; }
      const driverId = json.data.id;

      await uploadPhoto(driverId);
      await uploadDocuments(driverId);

      setProgress("");
      router.push(`/dashboard/drivers/${driverId}`);
    } catch (err: any) {
      setError(err.message || t("drivers.common.networkError"));
    } finally { setSaving(false); }
  }

  return (
    <div className={styles.page}>
      <Link href="/dashboard/drivers" className={styles.backLink}><ArrowLeft size={14} /> {t("drivers.profile.back")}</Link>
      <h1 className={styles.pageTitle}>{t("drivers.new.title")}</h1>

      <form className={styles.form} onSubmit={handleSubmit}>
        {error && <div className={styles.error}>{error}</div>}
        {progress && <div className={styles.progress}>{progress}</div>}

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t("drivers.new.secPhoto")}</h2>
          <div className={styles.photoRow}>
            <div className={styles.photoPreview}>
              {photoPreview ? <img src={photoPreview} alt={t("drivers.new.photoAlt")} className={styles.photoImg} /> : <Camera size={22} />}
            </div>
            <div className={styles.photoActions}>
              <label className={styles.photoBtn}>
                <Upload size={13} />
                {photo ? t("drivers.new.changePhoto") : t("drivers.new.uploadPhoto")}
                <input type="file" accept="image/*" onChange={handlePhoto} hidden />
              </label>
              {photo && (
                <button type="button" className={styles.photoRemove} onClick={() => { setPhoto(null); setPhotoPreview(""); }}>
                  <Trash2 size={13} /> {t("drivers.new.removePhoto")}
                </button>
              )}
              {photo && <span className={styles.photoHint}><ImageIcon size={12} /> {photo.name}</span>}
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t("drivers.new.secAccount")}</h2>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label>{t("drivers.new.fFullNameReq")}</label>
              <input value={form.name} onChange={(e) => update("name", e.target.value)} required placeholder={t("drivers.new.phName")} />
            </div>
            <div className={styles.field}>
              <label>{t("drivers.new.fEmailReq")}</label>
              <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required placeholder={t("drivers.new.phEmail")} />
            </div>
            <div className={styles.field}>
              <label>{t("drivers.new.fPasswordReq")}</label>
              <input type="password" value={form.password} onChange={(e) => update("password", e.target.value)} required minLength={6} placeholder={t("drivers.new.phPassword")} />
            </div>
            <div className={styles.field}>
              <label>{t("drivers.new.fEmpCode")}</label>
              <input value={form.employeeCode} onChange={(e) => update("employeeCode", e.target.value)} placeholder={t("drivers.new.phEmpCode")} />
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t("drivers.profile.secLicense")}</h2>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label>{t("drivers.profile.fLicenseNumber")}</label>
              <input value={form.licenseNumber} onChange={(e) => update("licenseNumber", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>{t("drivers.profile.fLicenseExpiry")}</label>
              <input type="date" value={form.licenseExpiry} onChange={(e) => update("licenseExpiry", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>{t("drivers.profile.fLicenseCategory")}</label>
              <input value={form.licenseCategory} onChange={(e) => update("licenseCategory", e.target.value)} placeholder={t("drivers.new.phLicenseCat")} />
            </div>
            <div className={styles.field}>
              <label>{t("drivers.profile.fPassportNumber")}</label>
              <input value={form.passportNumber} onChange={(e) => update("passportNumber", e.target.value)} />
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t("drivers.new.secPersonal")}</h2>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label>{t("drivers.profile.fNationality")}</label>
              <input value={form.nationality} onChange={(e) => update("nationality", e.target.value)} placeholder={t("drivers.new.phNationality")} />
            </div>
            <div className={styles.field}>
              <label>{t("drivers.profile.fDob")}</label>
              <input type="date" value={form.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>{t("drivers.profile.fBloodType")}</label>
              <select value={form.bloodType} onChange={(e) => update("bloodType", e.target.value)}>
                <option value="">{t("drivers.edit.bloodSelect")}</option>
                <option value="A+">A+</option><option value="A-">A-</option>
                <option value="B+">B+</option><option value="B-">B-</option>
                <option value="AB+">AB+</option><option value="AB-">AB-</option>
                <option value="O+">O+</option><option value="O-">O-</option>
              </select>
            </div>
            <div className={styles.field}>
              <label>{t("drivers.profile.fMedicalExpiry")}</label>
              <input type="date" value={form.medicalFitnessExpiry} onChange={(e) => update("medicalFitnessExpiry", e.target.value)} />
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t("drivers.new.secEmployment")}</h2>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label>{t("drivers.profile.fHireDate")}</label>
              <input type="date" value={form.hireDate} onChange={(e) => update("hireDate", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>{t("drivers.edit.fEmergencyName")}</label>
              <input value={form.emergencyContactName} onChange={(e) => update("emergencyContactName", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>{t("drivers.edit.fEmergencyPhone")}</label>
              <input value={form.emergencyContactPhone} onChange={(e) => update("emergencyContactPhone", e.target.value)} placeholder={t("drivers.new.phEmergencyPhone")} />
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.docHeader}>
            <h2 className={styles.sectionTitle}>{t("drivers.profile.tabDocs")}</h2>
            <button type="button" className={styles.addDocBtn} onClick={() => setDocuments(docs => [...docs, emptyDoc])}>
              <Plus size={13} /> {t("drivers.profile.addDocBtn")}
            </button>
          </div>
          {documents.length === 0 ? (
            <p className={styles.docEmpty}>{t("drivers.new.docEmpty")}</p>
          ) : (
            <div className={styles.docList}>
              {documents.map((doc, i) => (
                <div key={i} className={styles.docRow}>
                  <div className={styles.field}>
                    <label>{t("drivers.profile.docType")}</label>
                    <select value={doc.documentType} onChange={(e) => updateDoc(i, "documentType", e.target.value)}>
                      {Object.entries(DOC_KEYS).map(([k, key]) => <option key={k} value={k}>{t(key)}</option>)}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label>{t("drivers.profile.docNumber")}</label>
                    <input value={doc.documentNumber} onChange={(e) => updateDoc(i, "documentNumber", e.target.value)} />
                  </div>
                  <div className={styles.field}>
                    <label>{t("drivers.profile.issueDate")}</label>
                    <input type="date" value={doc.issueDate} onChange={(e) => updateDoc(i, "issueDate", e.target.value)} />
                  </div>
                  <div className={styles.field}>
                    <label>{t("drivers.profile.expiryDate")}</label>
                    <input type="date" value={doc.expiryDate} onChange={(e) => updateDoc(i, "expiryDate", e.target.value)} />
                  </div>
                  <button type="button" className={styles.docRemoveBtn} onClick={() => setDocuments(docs => docs.filter((_, j) => j !== i))} title={t("drivers.new.removeDocTitle")}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <Link href="/dashboard/drivers" className={styles.cancelBtn}>{t("common.cancel")}</Link>
          <button className={styles.saveBtn} disabled={saving}>
            <Save size={14} /> {saving ? t("drivers.new.creating") : t("drivers.new.createDriver")}
          </button>
        </div>
      </form>
    </div>
  );
}
