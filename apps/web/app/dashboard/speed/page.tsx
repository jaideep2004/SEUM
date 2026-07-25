"use client";

import Link from "next/link";
import { Construction, ArrowLeft } from "lucide-react";

export default function SpeedPage() {
  return (
    <div style={{ padding: 60, textAlign: "center" }}>
      <Construction size={48} style={{ color: "var(--color-text-tertiary)", marginBottom: 16, opacity: 0.4 }} />
      <h1 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: "var(--color-text-primary)" }}>Speed Monitor</h1>
      <p style={{ margin: "0 0 24px", fontSize: 14, color: "var(--color-text-secondary)" }}>
        This is just SpeedPage content, it is on the way.
      </p>
      <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", color: "var(--color-text-primary)", fontSize: 13, textDecoration: "none" }}>
        <ArrowLeft size={14} />
        Back to Dashboard
      </Link>
    </div>
  );
}