"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Bus } from "lucide-react";
import { API_URL } from "@/services/api";
import { useLanguage, formatDate, formatNumber, formatCurrency } from "@/lib/i18n";
import styles from "./page.module.css";

export default function ForgotPasswordPage() {
  const { lang, t } = useLanguage();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.message || t("auth.forgot.failed"));
        return;
      }

      setSent(true);
    } catch {
      setError(t("auth.login.connectError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.leftPanel}>
        <div className={styles.leftContent}>
          <div className={styles.logoRow}>
            <div className={styles.logoBox}>
              <Bus size={20} />
            </div>
            <span className={styles.logoText}>SEUM</span>
          </div>
          <div className={styles.brandText}>{t("auth.forgot.brand")}</div>
          <h1 className={styles.headline}>{t("auth.forgot.headline")}</h1>
          <p className={styles.subhead}>
            {t("auth.forgot.subhead")}
          </p>
        </div>
      </div>

      <div className={styles.rightPanel}>
        <div className={styles.card}>
          <div className={styles.cardLogo}>
            <div className={styles.cardLogoBox}>
              <Bus size={18} />
            </div>
            <span className={styles.cardLogoText}>SEUM</span>
          </div>

          {sent ? (
            <>
              <div className={styles.cardTitle}>{t("auth.forgot.checkEmail")}</div>
              <div className={styles.successBox}>
                <CheckCircle size={20} />
                <div className={styles.successText}>
                  {t("auth.forgot.sentA")}<strong>{email}</strong>{t("auth.forgot.sentB")}
                </div>
              </div>
              <Link href="/login" className={styles.backLink}>
                <ArrowLeft size={14} />
                {t("auth.forgot.backLogin")}
              </Link>
            </>
          ) : (
            <>
              <div className={styles.cardTitle}>{t("auth.forgot.resetTitle")}</div>
              <div className={styles.cardDesc}>
                {t("auth.forgot.cardDesc")}
              </div>

              {error && (
                <div className={styles.errorBox}>
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className={styles.field}>
                  <label className={styles.label}>{t("auth.login.emailLabel")}</label>
                  <div className={styles.inputWrapper}>
                    <input
                      className={styles.input}
                      type="email"
                      placeholder={t("auth.forgot.emailPh")}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button className={styles.submitBtn} type="submit" disabled={loading}>
                  {loading ? (
                    <span className={styles.spinner} />
                  ) : (
                    <Mail size={16} />
                  )}
                  {loading ? t("auth.forgot.sending") : t("auth.forgot.sendLink")}
                </button>
              </form>

              <Link href="/login" className={styles.backLink}>
                <ArrowLeft size={14} />
                {t("auth.forgot.backLogin")}
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
