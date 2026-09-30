"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, BellRing, Save } from "lucide-react";
import { API_URL } from "@/services/api";
import { useLanguage, formatDate, formatNumber, formatCurrency } from "@/lib/i18n";
import styles from "./page.module.css";

interface PrefRow {
  eventType: string;
  label: string;
  description: string;
  sendsEmail: boolean;
  inApp: boolean;
  email: boolean;
}

export default function NotificationPreferencesPage() {
  const { lang, t } = useLanguage();
  const [prefs, setPrefs] = useState<PrefRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/notifications/preferences`, { credentials: "include" });
        const data = await res.json();
        if (data.success) setPrefs(data.data);
        else setError(data.message || t("admin.notifPrefs.loadFailed"));
      } catch {
        setError(t("admin.notifPrefs.loadFailed"));
      }
      setLoading(false);
    })();
  }, []);

  function toggle(eventType: string, key: "inApp" | "email") {
    setSaved(false);
    setPrefs((prev) => prev.map((p) => (p.eventType === eventType ? { ...p, [key]: !p[key] } : p)));
  }

  async function save() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const body = {
        preferences: prefs.map((p) => ({ eventType: p.eventType, inApp: p.inApp, email: p.sendsEmail ? p.email : true })),
      };
      const res = await fetch(`${API_URL}/notifications/preferences`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) setSaved(true);
      else setError(data.message || t("admin.notifPrefs.saveFailed"));
    } catch {
      setError(t("admin.notifPrefs.saveFailed"));
    }
    setSaving(false);
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/dashboard/notifications" className={styles.backBtn}>
          <ArrowLeft size={15} /> {t("admin.notifPrefs.back")}
        </Link>
        <div className={styles.headerLeft}>
          <BellRing size={22} className={styles.headerIcon} />
          <div>
            <h1 className={styles.title}>{t("admin.notifPrefs.title")}</h1>
            <p className={styles.subtitle}>{t("admin.notifPrefs.subtitle")}</p>
          </div>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {saved && <div className={styles.success}>{t("admin.notifPrefs.saved")}</div>}

      {loading ? (
        <div className={styles.empty}>{t("admin.notifPrefs.loading")}</div>
      ) : (
        <div className={styles.card}>
          {prefs.map((p) => (
            <div key={p.eventType} className={styles.row}>
              <div className={styles.rowInfo}>
                <div className={styles.rowLabel}>{p.label}</div>
                <div className={styles.rowDesc}>{p.description}</div>
              </div>
              <div className={styles.toggles}>
                <label className={styles.toggleWrap}>
                  <input
                    type="checkbox"
                    className={styles.toggle}
                    checked={p.inApp}
                    onChange={() => toggle(p.eventType, "inApp")}
                  />
                  <span>{t("admin.notifPrefs.inApp")}</span>
                </label>
                {p.sendsEmail && (
                  <label className={styles.toggleWrap}>
                    <input
                      type="checkbox"
                      className={styles.toggle}
                      checked={p.email}
                      onChange={() => toggle(p.eventType, "email")}
                    />
                    <span>{t("admin.notifPrefs.email")}</span>
                  </label>
                )}
              </div>
            </div>
          ))}
          <div className={styles.footer}>
            <button className={styles.saveBtn} onClick={save} disabled={saving}>
              <Save size={15} /> {saving ? t("admin.notifPrefs.saving") : t("admin.notifPrefs.save")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}