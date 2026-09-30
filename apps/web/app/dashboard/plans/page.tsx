"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { useLanguage, formatDate, formatNumber, formatCurrency } from "@/lib/i18n";
import {
  Package,
  CheckCircle2,
  XCircle,
  CreditCard,
  Users,
  Truck,
  BarChart3,
  Plus,
  Edit3,
  Trash2,
  AlertTriangle,
  X,
} from "lucide-react";
import styles from "./page.module.css";

interface Plan {
  id: string;
  name: string;
  tier: string;
  priceMonthly: number;
  priceYearly: number;
  maxUsers: number;
  maxVehicles: number;
  maxStorageGb: number;
  features: string[];
  isActive: boolean;
}

interface FormData {
  name: string;
  tier: string;
  priceMonthly: string;
  priceYearly: string;
  maxUsers: string;
  maxVehicles: string;
  maxStorageGb: string;
  features: string[];
  isActive: boolean;
}

const emptyForm: FormData = {
  name: "", tier: "starter", priceMonthly: "", priceYearly: "",
  maxUsers: "", maxVehicles: "", maxStorageGb: "",
  features: [], isActive: true,
};

const tierColors: Record<string, { bg: string; text: string; border: string }> = {
  starter: { bg: "rgba(99,102,241,0.06)", text: "#6366f1", border: "rgba(99,102,241,0.2)" },
  professional: { bg: "rgba(16,185,129,0.06)", text: "#059669", border: "rgba(16,185,129,0.2)" },
  enterprise: { bg: "rgba(245,158,11,0.06)", text: "#d97706", border: "rgba(245,158,11,0.2)" },
};

export default function PlansPage() {
  const { lang, t } = useLanguage();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [featureInput, setFeatureInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingPlan, setDeletingPlan] = useState<Plan | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPlans = async () => {
    try {
      const data = await api.get<any[]>("/subscription-plans?isActive=true");
      setPlans(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchPlans(); }, []);

  const openAdd = () => {
    setEditingPlan(null);
    setFormData(emptyForm);
    setFeatureInput("");
    setSubmitError("");
    setShowModal(true);
  };

  const openEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      tier: plan.tier,
      priceMonthly: String(plan.priceMonthly),
      priceYearly: String(plan.priceYearly),
      maxUsers: String(plan.maxUsers),
      maxVehicles: String(plan.maxVehicles),
      maxStorageGb: String(plan.maxStorageGb),
      features: [...plan.features],
      isActive: plan.isActive,
    });
    setFeatureInput("");
    setSubmitError("");
    setShowModal(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const addFeature = () => {
    const f = featureInput.trim();
    if (f && !formData.features.includes(f)) {
      setFormData(prev => ({ ...prev, features: [...prev.features, f] }));
    }
    setFeatureInput("");
  };

  const removeFeature = (idx: number) => {
    setFormData(prev => ({ ...prev, features: prev.features.filter((_, i) => i !== idx) }));
  };

  const handleDeletePlan = async () => {
    if (!deletingPlan) return;
    setDeleting(true);
    try {
      await api.delete(`/subscription-plans/${deletingPlan.id}`);
      setShowDeleteModal(false);
      setDeletingPlan(null);
      setLoading(true);
      fetchPlans();
    } catch {}
    setDeleting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSubmitError("");

    try {
      const payload = {
        name: formData.name,
        tier: formData.tier,
        priceMonthly: Number(formData.priceMonthly),
        priceYearly: Number(formData.priceYearly),
        maxUsers: Number(formData.maxUsers),
        maxVehicles: Number(formData.maxVehicles),
        maxStorageGb: Number(formData.maxStorageGb),
        features: formData.features,
      };

      if (editingPlan) {
        await api.patch(`/subscription-plans/${editingPlan.id}`, {
          ...payload,
          isActive: formData.isActive,
        });
      } else {
        await api.post("/subscription-plans", payload);
      }

      setShowModal(false);
      setLoading(true);
      fetchPlans();
    } catch (err: any) {
      setSubmitError(err?.message || "Failed to save plan");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className={styles.page}><div className={styles.empty}>{t("companies.plans.loading")}</div></div>;

  const tierLabel = (tier: string | null | undefined) => {
    if (!tier) return "—";
    const map: Record<string, string> = {
      starter: t("companies.tierStarter"),
      professional: t("companies.tierProfessional"),
      enterprise: t("companies.tierEnterprise"),
      custom: t("companies.tierCustom"),
    };
    return map[tier] || tier.charAt(0).toUpperCase() + tier.slice(1);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Package size={24} className={styles.headerIcon} />
        <div>
          <h1 className={styles.headerTitle}>{t("companies.plans.title")}</h1>
          <p className={styles.headerSub}>{plans.length} {t("companies.plans.planWord")}{plans.length !== 1 ? t("companies.plans.pluralS") : ""} {t("companies.plans.configuredWord")}</p>
        </div>
        <button className={styles.addBtn} onClick={openAdd}>
          <Plus size={16} />
          {t("companies.plans.add")}
        </button>
      </div>

      <div className={styles.plansGrid}>
        {plans.map((plan) => {
          const tc = (plan.tier && tierColors[plan.tier]) || tierColors.starter;
          const isPopular = plan.tier === "professional";

          return (
            <div
              key={plan.id}
              className={styles.planCard}
              style={{ borderColor: tc.border }}
            >
              {isPopular && <div className={styles.popularBadge}>{t("companies.plans.popular")}</div>}

              <div className={styles.planHeader}>
                <div className={styles.planIcon} style={{ background: tc.bg, color: tc.text }}>
                  <CreditCard size={20} />
                </div>
                <h2 className={styles.planName}>{plan.name}</h2>
                <span className={styles.planTier} style={{ background: tc.bg, color: tc.text }}>
                  {tierLabel(plan.tier)}
                </span>
              </div>

              <div className={styles.planPrice}>
                <span className={styles.priceAmount}>{t("companies.plans.sar")} {plan.priceMonthly?.toLocaleString()}</span>
                <span className={styles.pricePeriod}>{t("companies.plans.perMonth")}</span>
              </div>
              {plan.priceYearly && (
                <div className={styles.priceYearly}>
                  {t("companies.plans.sar")} {plan.priceYearly.toLocaleString()}{t("companies.plans.perYear")}
                  <span className={styles.savings}>
                    ({t("companies.plans.save")} {Math.round((1 - plan.priceYearly / (plan.priceMonthly * 12)) * 100)}%)
                  </span>
                </div>
              )}

              <div className={styles.planLimits}>
                <div className={styles.limitItem}>
                  <Users size={14} />
                  <span>{t("companies.plans.upTo")} <strong>{plan.maxUsers}</strong> {t("companies.plans.users")}</span>
                </div>
                <div className={styles.limitItem}>
                  <Truck size={14} />
                  <span>{t("companies.plans.upTo")} <strong>{plan.maxVehicles}</strong> {t("companies.plans.vehicles")}</span>
                </div>
                <div className={styles.limitItem}>
                  <BarChart3 size={14} />
                  <span><strong>{plan.maxStorageGb}GB</strong> {t("companies.plans.storage")}</span>
                </div>
              </div>

              <div className={styles.planFeatures}>
                <h4 className={styles.featuresTitle}>{t("companies.plans.features")}</h4>
                {plan.features?.map((feat, i) => (
                  <div key={i} className={styles.featureRow}>
                    <CheckCircle2 size={14} className={styles.featureCheck} />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              <div className={styles.planFooter}>
                {!plan.isActive && (
                  <span className={styles.inactiveBadge}>
                    <XCircle size={12} /> {t("companies.plans.inactive")}
                  </span>
                )}
                <div className={styles.planActions}>
                  <button className={styles.editPlanBtn} onClick={() => openEdit(plan)}>
                    <Edit3 size={14} />
                    {t("companies.plans.edit")}
                  </button>
                  <button className={styles.deletePlanBtn} onClick={() => { setDeletingPlan(plan); setShowDeleteModal(true); }}>
                    <Trash2 size={14} />
                    {t("companies.plans.delete")}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {plans.length === 0 && (
        <div className={styles.empty}>{t("companies.plans.noPlans")}</div>
      )}

      {showDeleteModal && deletingPlan && (
        <div className={styles.modalOverlayCenter} onClick={() => setShowDeleteModal(false)}>
          <div className={styles.modal} style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalIconDanger}>
              <AlertTriangle size={24} />
            </div>
            <h3 className={styles.modalTitle} style={{ textAlign: "center" }}>{t("companies.plans.deleteTitle")}</h3>
            <p className={styles.modalText} style={{ textAlign: "center", marginBottom: 24 }}>
              {t("companies.plans.deleteTextA")} <strong>{deletingPlan.name}</strong>{t("companies.plans.deleteTextB")}
            </p>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setShowDeleteModal(false)}>{t("companies.plans.cancel")}</button>
              <button className={styles.deleteConfirmBtn} onClick={handleDeletePlan} disabled={deleting}>
                {deleting ? t("companies.plans.deleting") : t("companies.plans.deletePlan")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{editingPlan ? t("companies.plans.editTitle") : t("companies.plans.addTitle")}</h2>
              <button className={styles.modalClose} onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form className={styles.modalBody} onSubmit={handleSubmit}>
              <div className={styles.modalGrid}>
                <div className={styles.field}>
                  <label className={styles.label}>{t("companies.plans.planName")} *</label>
                  <input className={styles.input} name="name" value={formData.name} onChange={handleChange} required placeholder={t("companies.plans.planNamePh")} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>{t("companies.plans.tier")} *</label>
                  <select className={styles.select} name="tier" value={formData.tier} onChange={handleChange}>
                    <option value="starter">{t("companies.tierStarter")}</option>
                    <option value="professional">{t("companies.tierProfessional")}</option>
                    <option value="enterprise">{t("companies.tierEnterprise")}</option>
                    <option value="custom">{t("companies.tierCustom")}</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>{t("companies.plans.priceMonthly")} *</label>
                  <input className={styles.input} name="priceMonthly" type="number" min="0" step="0.01" value={formData.priceMonthly} onChange={handleChange} required />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>{t("companies.plans.priceYearly")}</label>
                  <input className={styles.input} name="priceYearly" type="number" min="0" step="0.01" value={formData.priceYearly} onChange={handleChange} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>{t("companies.plans.maxUsers")} *</label>
                  <input className={styles.input} name="maxUsers" type="number" min="1" value={formData.maxUsers} onChange={handleChange} required />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>{t("companies.plans.maxVehicles")} *</label>
                  <input className={styles.input} name="maxVehicles" type="number" min="1" value={formData.maxVehicles} onChange={handleChange} required />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>{t("companies.plans.maxStorage")}</label>
                  <input className={styles.input} name="maxStorageGb" type="number" min="0" value={formData.maxStorageGb} onChange={handleChange} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>{t("companies.plans.featuresLabel")}</label>
                  <div className={styles.featureInputRow}>
                    <input className={styles.input} value={featureInput} onChange={(e) => setFeatureInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFeature(); } }} placeholder={t("companies.plans.featurePh")} />
                    <button type="button" className={styles.addFeatureBtn} onClick={addFeature}>{t("companies.plans.addFeature")}</button>
                  </div>
                  <div className={styles.featureChips}>
                    {formData.features.map((f, i) => (
                      <span key={i} className={styles.featureChip}>
                        {f}
                        <button type="button" className={styles.chipRemove} onClick={() => removeFeature(i)}><X size={12} /></button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {editingPlan && (
                <div className={styles.field} style={{ marginTop: 14 }}>
                  <label className={styles.checkLabel}>
                    <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} />
                    <span>{t("companies.plans.active")}</span>
                  </label>
                </div>
              )}

              {submitError && (
                <div className={styles.submitError}>
                  <XCircle size={14} />
                  {submitError}
                </div>
              )}

              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowModal(false)}>{t("companies.plans.cancel")}</button>
                <button type="submit" className={styles.submitBtn} disabled={saving}>
                  {saving ? t("companies.plans.saving") : editingPlan ? t("companies.plans.update") : t("companies.plans.create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
