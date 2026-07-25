"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import { ArrowLeft, Building2, Save } from "lucide-react";
import styles from "./page.module.css";

const TIERS = ["starter", "professional", "enterprise"] as const;

export default function NewCompanyPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    domain: "",
    contactEmail: "",
    contactPhone: "",
    subscriptionTier: "starter",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Name is required";
    if (!form.contactEmail.trim()) next.contactEmail = "Email is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setError("");
    try {
      const tenant: any = await api.post("/tenants", form);
      router.push(`/dashboard/companies/${tenant.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create company");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.push("/dashboard/companies")}>
          <ArrowLeft size={18} />
          Back to Companies
        </button>
        <div className={styles.headerInfo}>
          <Building2 size={20} className={styles.headerIcon} />
          <h1 className={styles.headerTitle}>Create Company</h1>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label className={styles.label}>
            Name <span className={styles.required}>*</span>
          </label>
          <input
            className={`${styles.input} ${errors.name ? styles.inputError : ""}`}
            name="name"
            placeholder="Company name"
            value={form.name}
            onChange={handleChange}
          />
          {errors.name && <span className={styles.fieldError}>{errors.name}</span>}
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Domain</label>
          <input
            className={styles.input}
            name="domain"
            placeholder="example.com"
            value={form.domain}
            onChange={handleChange}
          />
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>
              Contact Email <span className={styles.required}>*</span>
            </label>
            <input
              className={`${styles.input} ${errors.contactEmail ? styles.inputError : ""}`}
              name="contactEmail"
              type="email"
              placeholder="admin@example.com"
              value={form.contactEmail}
              onChange={handleChange}
            />
            {errors.contactEmail && <span className={styles.fieldError}>{errors.contactEmail}</span>}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Contact Phone</label>
            <input
              className={styles.input}
              name="contactPhone"
              placeholder="+1 234 567 890"
              value={form.contactPhone}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Subscription Tier</label>
          <select
            className={styles.select}
            name="subscriptionTier"
            value={form.subscriptionTier}
            onChange={handleChange}
          >
            {TIERS.map((tier) => (
              <option key={tier} value={tier}>
                {tier.charAt(0).toUpperCase() + tier.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={() => router.push("/dashboard/companies")}
          >
            Cancel
          </button>
          <button type="submit" className={styles.submitBtn} disabled={submitting}>
            <Save size={15} />
            {submitting ? "Creating..." : "Create Company"}
          </button>
        </div>
      </form>
    </div>
  );
}
