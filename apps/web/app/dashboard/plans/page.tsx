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

const tierColors: Record<string, { bg: string; text: string; border: string }> = {
  starter: { bg: "rgba(99,102,241,0.06)", text: "#6366f1", border: "rgba(99,102,241,0.2)" },
  professional: { bg: "rgba(16,185,129,0.06)", text: "#059669", border: "rgba(16,185,129,0.2)" },
  enterprise: { bg: "rgba(245,158,11,0.06)", text: "#d97706", border: "rgba(245,158,11,0.2)" },
};

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get<any[]>("/subscription-plans");
        setPlans(data);
      } catch {}
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className={styles.page}><div className={styles.empty}>Loading plans...</div></div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Package size={24} className={styles.headerIcon} />
        <div>
          <h1 className={styles.headerTitle}>Subscription Plans</h1>
          <p className={styles.headerSub}>{plans.length} plan{plans.length !== 1 ? "s" : ""} configured</p>
        </div>
        <button className={styles.addBtn}>
          <Plus size={16} />
          Add Plan
        </button>
      </div>

      <div className={styles.plansGrid}>
        {plans.map((plan) => {
          const tc = tierColors[plan.tier] || tierColors.starter;
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
                  {plan.tier.charAt(0).toUpperCase() + plan.tier.slice(1)}
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
                <button className={styles.editPlanBtn}>
                  <Edit3 size={14} />
                  Edit Plan
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {plans.length === 0 && (
        <div className={styles.empty}>No subscription plans configured</div>
      )}
    </div>
  );
}
