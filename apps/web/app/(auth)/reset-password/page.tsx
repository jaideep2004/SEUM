"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, ArrowLeft, CheckCircle, AlertCircle, Bus, Eye, EyeOff } from "lucide-react";
import { API_URL } from "@/services/api";
import { useLanguage, formatDate, formatNumber, formatCurrency } from "@/lib/i18n";
import styles from "./page.module.css";

function ResetForm() {
  const { lang, t } = useLanguage();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!hasMinLength || !hasUpper || !hasNumber) {
      setError(t("auth.reset.weak"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("auth.reset.mismatch"));
      return;
    }

    if (!token) {
      setError(t("auth.reset.noToken"));
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.message || t("auth.reset.failed"));
        return;
      }

      setSuccess(true);
    } catch {
      setError(t("auth.login.connectError"));
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className={styles.page}>
        <div className={styles.leftPanel}>
          <div className={styles.leftContent}>
            <div className={styles.logoRow}>
              <div className={styles.logoBox}><Bus size={20} /></div>
              <span className={styles.logoText}>SEUM</span>
            </div>
            <div className={styles.brandText}>{t("auth.forgot.brand")}</div>
            <h1 className={styles.headline}>{t("auth.reset.invalidHeadline")}</h1>
            <p className={styles.subhead}>{t("auth.reset.invalidSub")}</p>
          </div>
        </div>
        <div className={styles.rightPanel}>
          <div className={styles.card}>
            <div className={styles.cardLogo}>
              <div className={styles.cardLogoBox}><Bus size={18} /></div>
              <span className={styles.cardLogoText}>SEUM</span>
            </div>
            <div className={styles.cardTitle}>{t("auth.reset.invalidTitle")}</div>
            <div className={styles.cardDesc}>
              {t("auth.reset.invalidDesc")}
            </div>
            <Link href="/forgot-password" className={styles.backLink}>
              <ArrowLeft size={14} />
              {t("auth.reset.requestNew")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.leftPanel}>
        <div className={styles.leftContent}>
          <div className={styles.logoRow}>
            <div className={styles.logoBox}><Bus size={20} /></div>
            <span className={styles.logoText}>SEUM</span>
          </div>
          <div className={styles.brandText}>{t("auth.forgot.brand")}</div>
          <h1 className={styles.headline}>{t("auth.reset.headline")}</h1>
          <p className={styles.subhead}>
            {t("auth.reset.subhead")}
          </p>
        </div>
      </div>

      <div className={styles.rightPanel}>
        <div className={styles.card}>
          <div className={styles.cardLogo}>
            <div className={styles.cardLogoBox}><Bus size={18} /></div>
            <span className={styles.cardLogoText}>SEUM</span>
          </div>

          {success ? (
            <>
              <div className={styles.cardTitle}>{t("auth.reset.changed")}</div>
              <div className={styles.successBox}>
                <CheckCircle size={20} />
                <div className={styles.successText}>
                  {t("auth.reset.changedDesc")}
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
                {t("auth.reset.cardDesc")}
              </div>

              {error && (
                <div className={styles.errorBox}>
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className={styles.field}>
                  <label className={styles.label}>{t("auth.reset.newLabel")}</label>
                  <div className={styles.inputWrapper}>
                    <input
                      className={styles.input}
                      type={showPassword ? "text" : "password"}
                      placeholder={t("auth.reset.newPh")}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      style={{ paddingRight: 40 }}
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>{t("auth.reset.confirmLabel")}</label>
                  <div className={styles.inputWrapper}>
                    <input
                      className={styles.input}
                      type={showPassword ? "text" : "password"}
                      placeholder={t("auth.reset.confirmPh")}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      style={{ paddingRight: 40 }}
                    />
                  </div>
                </div>

                <ul className={styles.requirements}>
                  <li className={hasMinLength ? styles.met : ""}>
                    {hasMinLength ? <CheckCircle size={12} /> : <span style={{ width: 12 }} />}
                    {t("auth.reset.reqLength")}
                  </li>
                  <li className={hasUpper ? styles.met : ""}>
                    {hasUpper ? <CheckCircle size={12} /> : <span style={{ width: 12 }} />}
                    {t("auth.reset.reqUpper")}
                  </li>
                  <li className={hasNumber ? styles.met : ""}>
                    {hasNumber ? <CheckCircle size={12} /> : <span style={{ width: 12 }} />}
                    {t("auth.reset.reqNumber")}
                  </li>
                  <li className={passwordsMatch ? styles.met : ""}>
                    {passwordsMatch ? <CheckCircle size={12} /> : <span style={{ width: 12 }} />}
                    {t("auth.reset.reqMatch")}
                  </li>
                </ul>

                <button className={styles.submitBtn} type="submit" disabled={loading}>
                  {loading ? (
                    <span className={styles.spinner} />
                  ) : (
                    <Lock size={16} />
                  )}
                  {loading ? t("auth.reset.resetting") : t("auth.reset.submit")}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--color-bg)" }}>
        <div className={styles.spinner} />
      </div>
    }>
      <ResetForm />
    </Suspense>
  );
}
