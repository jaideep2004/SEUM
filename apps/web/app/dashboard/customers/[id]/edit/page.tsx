"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useLanguage, formatDate, formatNumber, formatCurrency } from "@/lib/i18n";
import styles from "../page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("seum_access_token");
}

export default function EditCustomerPage({ params }: { params: { id: string } }) {
  const { lang, t } = useLanguage();
  const [form, setForm] = useState({
    name: "", phone: "", email: "", id_number: "", nationality: "",
    address: "", is_company: false, company_name: "", notes: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const token = getToken();
      try {
        const res = await fetch(`${API}/bookings/customers/${params.id}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (data.success) {
          const c = data.data;
          setForm({
            name: c.name, phone: c.phone || "", email: c.email || "", id_number: c.idNumber || "",
            nationality: c.nationality || "", address: c.address || "",
            is_company: c.isCompany, company_name: c.companyName || "", notes: c.notes || "",
          });
        } else {
          setError(data.error?.message || t("customers.profile.notFound"));
        }
      } catch { setError(t("customers.list.networkError")); }
      setLoading(false);
    })();
  }, [params.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");
    setSaved(false);
    if (!form.name.trim()) { setSubmitError(t("customers.list.nameRequired")); return; }
    if (form.is_company && !form.company_name.trim()) { setSubmitError(t("customers.list.companyRequired")); return; }
    setSubmitting(true);
    const token = getToken();
    try {
      const payload: any = { name: form.name.trim(), is_company: form.is_company };
      if (form.phone.trim()) payload.phone = form.phone.trim();
      if (form.email.trim()) payload.email = form.email.trim();
      if (form.id_number.trim()) payload.id_number = form.id_number.trim();
      if (form.nationality.trim()) payload.nationality = form.nationality.trim();
      if (form.address.trim()) payload.address = form.address.trim();
      if (form.is_company) payload.company_name = form.company_name.trim();
      if (form.notes.trim()) payload.notes = form.notes.trim();
      const res = await fetch(`${API}/bookings/customers/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) {
        const detail = data.error?.details?.[0]?.message;
        setSubmitError(detail || data.error?.message || t("customers.edit.updateFailed"));
        return;
      }
      setSaved(true);
    } catch { setSubmitError(t("customers.list.networkError")); }
    setSubmitting(false);
  }

  if (loading) return <div className={styles.page}><div className={styles.loading}>{t("customers.profile.loading")}</div></div>;

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.errorBox}>
          <p>{error}</p>
          <Link href="/dashboard/customers" className={styles.backBtn}><ArrowLeft size={14} /> {t("customers.profile.backTo")}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Link href={`/dashboard/customers/${params.id}`} className={styles.backLink}><ArrowLeft size={14} /> {t("customers.edit.backProfile")}</Link>
      <div className={styles.header}>
        <div>
          <h1>{t("customers.edit.title")}</h1>
          <p className={styles.subtitle}>{t("customers.edit.subtitle")}</p>
        </div>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        {submitError && <div className={styles.error}>{submitError}</div>}
        {saved && <div className={styles.success}>{t("customers.edit.saved")}</div>}
        <div className={styles.formRow}>
          <div className={styles.field}>
            <label>{t("customers.list.nameLabel")}</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className={styles.field}>
            <label>{t("customers.list.typeLabel")}</label>
            <select value={form.is_company ? "company" : "individual"} onChange={(e) => setForm({ ...form, is_company: e.target.value === "company" })}>
              <option value="individual">{t("customers.list.individual")}</option>
              <option value="company">{t("customers.list.company")}</option>
            </select>
          </div>
          {form.is_company && (
            <div className={styles.field}>
              <label>{t("customers.list.companyNameLabel")}</label>
              <input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
            </div>
          )}
          <div className={styles.field}>
            <label>{t("customers.list.phoneLabel")}</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className={styles.field}>
            <label>{t("customers.list.emailLabel")}</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className={styles.field}>
            <label>{t("customers.list.idLabel")}</label>
            <input value={form.id_number} onChange={(e) => setForm({ ...form, id_number: e.target.value })} />
          </div>
          <div className={styles.field}>
            <label>{t("customers.list.natLabel")}</label>
            <input value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} />
          </div>
          <div className={`${styles.field} ${styles.fieldFull}`}>
            <label>{t("customers.list.addrLabel")}</label>
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className={`${styles.field} ${styles.fieldFull}`}>
            <label>{t("customers.list.notesLabel")}</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
          </div>
        </div>
        <div className={styles.formActions}>
          <Link href={`/dashboard/customers/${params.id}`} className={styles.cancelBtn}>{t("customers.list.cancel")}</Link>
          <button type="submit" className={styles.primaryBtn} disabled={submitting}>
            {submitting ? t("customers.list.saving") : t("customers.list.saveChanges")}
          </button>
        </div>
      </form>
    </div>
  );
}
