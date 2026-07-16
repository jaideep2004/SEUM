"use client";

import { Clock, AlertTriangle, CheckCircle2 } from "lucide-react";

interface ExpiryBadgeProps {
  expiryDate: string | null;
  daysThresholds?: { warning: number; danger: number; critical: number };
}

const defaultThresholds = { warning: 30, danger: 14, critical: 7 };

export function getDaysUntilExpiry(expiryDate: string): number {
  const now = new Date();
  const expiry = new Date(expiryDate);
  return Math.round((expiry.getTime() - now.getTime()) / 86400000);
}

export function getExpiryStatus(
  daysLeft: number | null,
  thresholds = defaultThresholds,
): { label: string; color: string; bg: string; dot: string; icon: any } {
  if (daysLeft === null) {
    return { label: "No expiry", color: "var(--color-text-tertiary)", bg: "transparent", dot: "transparent", icon: CheckCircle2 };
  }
  if (daysLeft <= 0) {
    return { label: "Expired", color: "#ef4444", bg: "rgba(239,68,68,0.12)", dot: "#ef4444", icon: AlertTriangle };
  }
  if (daysLeft <= thresholds.critical) {
    return { label: `${daysLeft} day${daysLeft !== 1 ? "s" : ""}`, color: "#ef4444", bg: "rgba(239,68,68,0.12)", dot: "#ef4444", icon: AlertTriangle };
  }
  if (daysLeft <= thresholds.danger) {
    return { label: `${daysLeft} day${daysLeft !== 1 ? "s" : ""}`, color: "#f97316", bg: "rgba(249,115,22,0.12)", dot: "#f97316", icon: Clock };
  }
  if (daysLeft <= thresholds.warning) {
    return { label: `${daysLeft} day${daysLeft !== 1 ? "s" : ""}`, color: "#f59e0b", bg: "rgba(245,158,11,0.12)", dot: "#f59e0b", icon: Clock };
  }
  return { label: `${daysLeft} days`, color: "#10b981", bg: "rgba(16,185,129,0.12)", dot: "#10b981", icon: CheckCircle2 };
}

const badgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "2px 10px",
  borderRadius: 9999,
  fontSize: 11,
  fontWeight: 600,
};

const dotStyle: React.CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: "50%",
};

export function ExpiryBadge({ expiryDate, daysThresholds }: ExpiryBadgeProps) {
  const daysLeft = expiryDate ? getDaysUntilExpiry(expiryDate) : null;
  const status = getExpiryStatus(daysLeft, daysThresholds);
  const Icon = status.icon;

  return (
    <span style={{ ...badgeStyle, background: status.bg, color: status.color }}>
      <Icon size={12} />
      <span style={{ ...dotStyle, background: status.dot }} />
      {status.label}
    </span>
  );
}

interface ExpiryBannerProps {
  expiredCount: number;
  expiringCount: number;
}

export function ExpiryBanner({ expiredCount, expiringCount }: ExpiryBannerProps) {
  if (expiredCount === 0 && expiringCount === 0) return null;

  const isDanger = expiredCount > 0;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 16px",
        borderRadius: "var(--radius-md)",
        fontSize: 13,
        marginBottom: 16,
        background: isDanger ? "var(--color-danger-light)" : "var(--color-warning-light)",
        border: `1px solid ${isDanger ? "var(--color-danger-border)" : "var(--color-warning-border)"}`,
        color: isDanger ? "var(--color-danger-text)" : "var(--color-warning-text)",
      }}
    >
      {isDanger ? <AlertTriangle size={18} /> : <Clock size={18} />}
      <span>
        {expiredCount > 0 && `${expiredCount} document${expiredCount !== 1 ? "s" : ""} expired — requires immediate attention. `}
        {expiringCount > 0 && `${expiringCount} document${expiringCount !== 1 ? "s" : ""} expiring within 30 days.`}
      </span>
    </div>
  );
}
