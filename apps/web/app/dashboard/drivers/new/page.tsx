"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Upload, Trash2, Plus, ImageIcon, Camera } from "lucide-react";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const DOC_TYPES: Record<string, string> = {
  license: "License", passport: "Passport", visa: "Visa", id_card: "ID Card",
  medical: "Medical", contract: "Contract", training_cert: "Training Cert", other: "Other",
};

interface DocDraft {
  documentType: string;
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
}

const emptyDoc: DocDraft = { documentType: "license", documentNumber: "", issueDate: "", expiryDate: "" };

export default function NewDriverPage() {
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
    setProgress("Uploading photo...");
    const fd = new FormData();
    fd.append("photo", photo);
    const res = await fetch(`${API}/drivers/${driverId}/photo`, {
      method: "POST", headers: { Authorization: `Bearer ${localStorage.getItem("seum_access_token")}` }, body: fd,
    });
    const json = await res.json().catch(() => null);
    if (!json?.success) throw new Error(json?.error?.message || "Photo upload failed");
  }

  async function uploadDocuments(driverId: string) {
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      if (!doc.documentType) continue;
      setProgress(`Adding document ${i + 1} of ${documents.length}...`);
      const res = await fetch(`${API}/drivers/${driverId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("seum_access_token")}` },
        body: JSON.stringify(doc),
      });
      const json = await res.json().catch(() => null);
      if (!json?.success) throw new Error(json?.error?.message || `Failed to add document (${DOC_TYPES[doc.documentType] || doc.documentType})`);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      setProgress("Creating driver...");
      const res = await fetch(`${API}/drivers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("seum_access_token")}` },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) { setError(json.error?.message || json.message || "Failed to create driver"); return; }
      const driverId = json.data.id;

      await uploadPhoto(driverId);
      await uploadDocuments(driverId);

      setProgress("");
      router.push(`/dashboard/drivers/${driverId}`);
    } catch (err: any) {
      setError(err.message || "Network error");
    } finally { setSaving(false); }
  }

  return (
    <div className={styles.page}>
      <Link href="/dashboard/drivers" className={styles.backLink}><ArrowLeft size={14} /> Back to Drivers</Link>
      <h1 className={styles.pageTitle}>Add New Driver</h1>

      <form className={styles.form} onSubmit={handleSubmit}>
        {error && <div className={styles.error}>{error}</div>}
        {progress && <div className={styles.progress}>{progress}</div>}

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Photo</h2>
          <div className={styles.photoRow}>
            <div className={styles.photoPreview}>
              {photoPreview ? <img src={photoPreview} alt="Driver preview" className={styles.photoImg} /> : <Camera size={22} />}
            </div>
            <div className={styles.photoActions}>
              <label className={styles.photoBtn}>
                <Upload size={13} />
                {photo ? "Change Photo" : "Upload Photo"}
                <input type="file" accept="image/*" onChange={handlePhoto} hidden />
              </label>
              {photo && (
                <button type="button" className={styles.photoRemove} onClick={() => { setPhoto(null); setPhotoPreview(""); }}>
                  <Trash2 size={13} /> Remove
                </button>
              )}
              {photo && <span className={styles.photoHint}><ImageIcon size={12} /> {photo.name}</span>}
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Account</h2>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label>Full Name *</label>
              <input value={form.name} onChange={(e) => update("name", e.target.value)} required placeholder="e.g. Khalid Al-Ghamdi" />
            </div>
            <div className={styles.field}>
              <label>Email *</label>
              <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required placeholder="driver@company.com" />
            </div>
            <div className={styles.field}>
              <label>Password *</label>
              <input type="password" value={form.password} onChange={(e) => update("password", e.target.value)} required minLength={6} placeholder="Min 6 characters" />
            </div>
            <div className={styles.field}>
              <label>Employee Code</label>
              <input value={form.employeeCode} onChange={(e) => update("employeeCode", e.target.value)} placeholder="e.g. DRV-001" />
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>License & Identity</h2>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label>License Number</label>
              <input value={form.licenseNumber} onChange={(e) => update("licenseNumber", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>License Expiry</label>
              <input type="date" value={form.licenseExpiry} onChange={(e) => update("licenseExpiry", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>License Category</label>
              <input value={form.licenseCategory} onChange={(e) => update("licenseCategory", e.target.value)} placeholder="e.g. B, C, D" />
            </div>
            <div className={styles.field}>
              <label>Passport Number</label>
              <input value={form.passportNumber} onChange={(e) => update("passportNumber", e.target.value)} />
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Personal Info</h2>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label>Nationality</label>
              <input value={form.nationality} onChange={(e) => update("nationality", e.target.value)} placeholder="e.g. Saudi" />
            </div>
            <div className={styles.field}>
              <label>Date of Birth</label>
              <input type="date" value={form.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>Blood Type</label>
              <select value={form.bloodType} onChange={(e) => update("bloodType", e.target.value)}>
                <option value="">Select</option>
                <option value="A+">A+</option><option value="A-">A-</option>
                <option value="B+">B+</option><option value="B-">B-</option>
                <option value="AB+">AB+</option><option value="AB-">AB-</option>
                <option value="O+">O+</option><option value="O-">O-</option>
              </select>
            </div>
            <div className={styles.field}>
              <label>Medical Fitness Expiry</label>
              <input type="date" value={form.medicalFitnessExpiry} onChange={(e) => update("medicalFitnessExpiry", e.target.value)} />
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Employment & Emergency</h2>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label>Hire Date</label>
              <input type="date" value={form.hireDate} onChange={(e) => update("hireDate", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>Emergency Contact Name</label>
              <input value={form.emergencyContactName} onChange={(e) => update("emergencyContactName", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>Emergency Contact Phone</label>
              <input value={form.emergencyContactPhone} onChange={(e) => update("emergencyContactPhone", e.target.value)} placeholder="+966 5X XXX XXXX" />
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.docHeader}>
            <h2 className={styles.sectionTitle}>Documents</h2>
            <button type="button" className={styles.addDocBtn} onClick={() => setDocuments(docs => [...docs, emptyDoc])}>
              <Plus size={13} /> Add Document
            </button>
          </div>
          {documents.length === 0 ? (
            <p className={styles.docEmpty}>No documents added — add license, medical fitness, passport etc.</p>
          ) : (
            <div className={styles.docList}>
              {documents.map((doc, i) => (
                <div key={i} className={styles.docRow}>
                  <div className={styles.field}>
                    <label>Type</label>
                    <select value={doc.documentType} onChange={(e) => updateDoc(i, "documentType", e.target.value)}>
                      {Object.entries(DOC_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label>Document Number</label>
                    <input value={doc.documentNumber} onChange={(e) => updateDoc(i, "documentNumber", e.target.value)} />
                  </div>
                  <div className={styles.field}>
                    <label>Issue Date</label>
                    <input type="date" value={doc.issueDate} onChange={(e) => updateDoc(i, "issueDate", e.target.value)} />
                  </div>
                  <div className={styles.field}>
                    <label>Expiry Date</label>
                    <input type="date" value={doc.expiryDate} onChange={(e) => updateDoc(i, "expiryDate", e.target.value)} />
                  </div>
                  <button type="button" className={styles.docRemoveBtn} onClick={() => setDocuments(docs => docs.filter((_, j) => j !== i))} title="Remove document">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <Link href="/dashboard/drivers" className={styles.cancelBtn}>Cancel</Link>
          <button className={styles.saveBtn} disabled={saving}>
            <Save size={14} /> {saving ? "Creating..." : "Create Driver"}
          </button>
        </div>
      </form>
    </div>
  );
}
