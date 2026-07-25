"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
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

  if (loading) return <div className={styles.page}><div className={styles.empty}>Loading plans...</div></div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Package size={24} className={styles.headerIcon} />
        <div>
          <h1 className={styles.headerTitle}>Subscription Plans</h1>
          <p className={styles.headerSub}>{plans.length} plan{plans.length !== 1 ? "s" : ""} configured</p>
        </div>
        <button className={styles.addBtn} onClick={openAdd}>
          <Plus size={16} />
          Add Plan
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
              {isPopular && <div className={styles.popularBadge}>Most Popular</div>}

              <div className={styles.planHeader}>
                <div className={styles.planIcon} style={{ background: tc.bg, color: tc.text }}>
                  <CreditCard size={20} />
                </div>
                <h2 className={styles.planName}>{plan.name}</h2>
                <span className={styles.planTier} style={{ background: tc.bg, color: tc.text }}>
                  {plan.tier ? plan.tier.charAt(0).toUpperCase() + plan.tier.slice(1) : "—"}
                </span>
              </div>

              <div className={styles.planPrice}>
                <span className={styles.priceAmount}>SAR {plan.priceMonthly?.toLocaleString()}</span>
                <span className={styles.pricePeriod}>/month</span>
              </div>
              {plan.priceYearly && (
                <div className={styles.priceYearly}>
                  SAR {plan.priceYearly.toLocaleString()}/year
                  <span className={styles.savings}>
                    (save {Math.round((1 - plan.priceYearly / (plan.priceMonthly * 12)) * 100)}%)
                  </span>
                </div>
              )}

              <div className={styles.planLimits}>
                <div className={styles.limitItem}>
                  <Users size={14} />
                  <span>Up to <strong>{plan.maxUsers}</strong> users</span>
                </div>
                <div className={styles.limitItem}>
                  <Truck size={14} />
                  <span>Up to <strong>{plan.maxVehicles}</strong> vehicles</span>
                </div>
                <div className={styles.limitItem}>
                  <BarChart3 size={14} />
                  <span><strong>{plan.maxStorageGb}GB</strong> storage</span>
                </div>
              </div>

              <div className={styles.planFeatures}>
                <h4 className={styles.featuresTitle}>Features</h4>
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
                    <XCircle size={12} /> Inactive
                  </span>
                )}
                <div className={styles.planActions}>
                  <button className={styles.editPlanBtn} onClick={() => openEdit(plan)}>
                    <Edit3 size={14} />
                    Edit
                  </button>
                  <button className={styles.deletePlanBtn} onClick={() => { setDeletingPlan(plan); setShowDeleteModal(true); }}>
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {plans.length === 0 && (
        <div className={styles.empty}>No subscription plans configured</div>
      )}

      {showDeleteModal && deletingPlan && (
        <div className={styles.modalOverlayCenter} onClick={() => setShowDeleteModal(false)}>
          <div className={styles.modal} style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalIconDanger}>
              <AlertTriangle size={24} />
            </div>
            <h3 className={styles.modalTitle} style={{ textAlign: "center" }}>Delete Plan</h3>
            <p className={styles.modalText} style={{ textAlign: "center", marginBottom: 24 }}>
              Are you sure you want to delete <strong>{deletingPlan.name}</strong>? This will deactivate the plan and it will no longer appear in active listings.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button className={styles.deleteConfirmBtn} onClick={handleDeletePlan} disabled={deleting}>
                {deleting ? "Deleting..." : "Delete Plan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{editingPlan ? "Edit Plan" : "Add Plan"}</h2>
              <button className={styles.modalClose} onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form className={styles.modalBody} onSubmit={handleSubmit}>
              <div className={styles.modalGrid}>
                <div className={styles.field}>
                  <label className={styles.label}>Plan Name *</label>
                  <input className={styles.input} name="name" value={formData.name} onChange={handleChange} required placeholder="e.g. Starter" />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Tier *</label>
                  <select className={styles.select} name="tier" value={formData.tier} onChange={handleChange}>
                    <option value="starter">Starter</option>
                    <option value="professional">Professional</option>
                    <option value="enterprise">Enterprise</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Price (Monthly) *</label>
                  <input className={styles.input} name="priceMonthly" type="number" min="0" step="0.01" value={formData.priceMonthly} onChange={handleChange} required />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Price (Yearly)</label>
                  <input className={styles.input} name="priceYearly" type="number" min="0" step="0.01" value={formData.priceYearly} onChange={handleChange} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Max Users *</label>
                  <input className={styles.input} name="maxUsers" type="number" min="1" value={formData.maxUsers} onChange={handleChange} required />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Max Vehicles *</label>
                  <input className={styles.input} name="maxVehicles" type="number" min="1" value={formData.maxVehicles} onChange={handleChange} required />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Max Storage (GB)</label>
                  <input className={styles.input} name="maxStorageGb" type="number" min="0" value={formData.maxStorageGb} onChange={handleChange} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Features</label>
                  <div className={styles.featureInputRow}>
                    <input className={styles.input} value={featureInput} onChange={(e) => setFeatureInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFeature(); } }} placeholder="Add feature..." />
                    <button type="button" className={styles.addFeatureBtn} onClick={addFeature}>Add</button>
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
                    <span>Active</span>
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
                <button type="button" className={styles.cancelBtn} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className={styles.submitBtn} disabled={saving}>
                  {saving ? "Saving..." : editingPlan ? "Update Plan" : "Create Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
