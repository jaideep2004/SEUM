"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { useLanguage, formatDate, formatNumber, formatCurrency } from "@/lib/i18n";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

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

const STATUS_KEYS: Record<string, string> = {
  active: "hr.status.active",
  suspended: "hr.status.suspended",
  terminated: "hr.status.terminated",
  on_leave: "hr.status.onLeave",
};

export default function EditEmployeePage() {
  const { lang, t } = useLanguage();
  void lang;
  void formatDate;
  void formatNumber;
  void formatCurrency;
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "", email: "", employeeCode: "", department: "operations",
    designation: "", phone: "", joinDate: "", contractEndDate: "",
    nationality: "", idNumber: "", status: "active",
  });

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("seum_access_token");
        const res = await fetch(`${API}/hr/employees/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        if (json.success) {
          const e = json.data;
          setForm({
            name: e.name || "", email: e.email || "", employeeCode: e.employeeCode || "",
            department: e.department || "operations", designation: e.designation || "",
            phone: e.phone || "", joinDate: e.joinDate || "", contractEndDate: e.contractEndDate || "",
            nationality: e.nationality || "", idNumber: e.idNumber || "", status: e.status || "active",
          });
        }
      } catch {} finally { setLoading(false); }
    })();
  }, [id]);

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const token = localStorage.getItem("seum_access_token");
      const res = await fetch(`${API}/hr/employees/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) { setError(json.error?.message || json.message || t("hr.common.failedUpdate")); return; }
      router.push(`/dashboard/hr/employees/${id}`);
    } catch { setError(t("hr.common.networkError")); } finally { setSaving(false); }
  }

  if (loading) return <div className={styles.loading}>{t("common.loading")}</div>;

  return (
    <div className={styles.page}>
      <Link href={`/dashboard/hr/employees/${id}`} className={styles.backLink}><ArrowLeft size={14} /> {t("hr.empEdit.back")}</Link>
      <h1 className={styles.pageTitle}>{t("hr.empEdit.title")}</h1>

      <form className={styles.form} onSubmit={handleSubmit}>
        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t("hr.empEdit.secBasic")}</h2>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label>{t("hr.empEdit.fFullName")}</label>
              <input value={form.name} onChange={(e) => update("name", e.target.value)} required />
            </div>
            <div className={styles.field}>
              <label>{t("hr.empEdit.fEmail")}</label>
              <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>{t("hr.empEdit.fEmpCode")}</label>
              <input value={form.employeeCode} onChange={(e) => update("employeeCode", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>{t("hr.empEdit.fStatus")}</label>
              <select value={form.status} onChange={(e) => update("status", e.target.value)}>
                {Object.entries(STATUS_KEYS).map(([v, k]) => <option key={v} value={v}>{t(k)}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t("hr.empEdit.secEmployment")}</h2>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label>{t("hr.empEdit.fDept")}</label>
              <select value={form.department} onChange={(e) => update("department", e.target.value)}>
                {Object.entries(DEPARTMENT_KEYS).map(([v, k]) => <option key={v} value={v}>{t(k)}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label>{t("hr.empEdit.fDesignation")}</label>
              <input value={form.designation} onChange={(e) => update("designation", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>{t("hr.empEdit.fPhone")}</label>
              <input value={form.phone} onChange={(e) => update("phone", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>{t("hr.empEdit.fJoinDate")}</label>
              <input type="date" value={form.joinDate} onChange={(e) => update("joinDate", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>{t("hr.empEdit.fContractEnd")}</label>
              <input type="date" value={form.contractEndDate} onChange={(e) => update("contractEndDate", e.target.value)} />
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t("hr.empEdit.secIdentity")}</h2>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label>{t("hr.empEdit.fNationality")}</label>
              <input value={form.nationality} onChange={(e) => update("nationality", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>{t("hr.empEdit.fIdNumber")}</label>
              <input value={form.idNumber} onChange={(e) => update("idNumber", e.target.value)} />
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <Link href={`/dashboard/hr/employees/${id}`} className={styles.cancelBtn}>{t("common.cancel")}</Link>
          <button className={styles.saveBtn} disabled={saving}>
            <Save size={14} /> {saving ? t("hr.empEdit.saving") : t("hr.empEdit.save")}
          </button>
        </div>
      </form>
    </div>
  );
}
