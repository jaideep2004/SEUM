"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, ArrowLeft, CheckCircle, AlertCircle, Bus, Eye, EyeOff } from "lucide-react";
import { API_URL } from "@/services/api";
import styles from "./page.module.css";

function ResetForm() {
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
      setError("Password does not meet requirements.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!token) {
      setError("Invalid or missing reset token.");
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
        setError(data.message || "Reset failed");
        return;
      }

      setSuccess(true);
    } catch {
      setError("Unable to connect to server. Please try again.");
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
            <div className={styles.brandText}>Intelligent Transportation</div>
            <h1 className={styles.headline}>Invalid reset link</h1>
            <p className={styles.subhead}>This link is invalid or expired.</p>
          </div>
        </div>
        <div className={styles.rightPanel}>
          <div className={styles.card}>
            <div className={styles.cardLogo}>
              <div className={styles.cardLogoBox}><Bus size={18} /></div>
              <span className={styles.cardLogoText}>SEUM</span>
            </div>
            <div className={styles.cardTitle}>Invalid link</div>
            <div className={styles.cardDesc}>
              This password reset link is invalid or has expired. Please request a new one.
            </div>
            <Link href="/forgot-password" className={styles.backLink}>
              <ArrowLeft size={14} />
              Request new reset link
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
          <div className={styles.brandText}>Intelligent Transportation</div>
          <h1 className={styles.headline}>Choose a new password</h1>
          <p className={styles.subhead}>
            Make it strong — at least 8 characters with uppercase letters and numbers.
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
              <div className={styles.cardTitle}>Password changed</div>
              <div className={styles.successBox}>
                <CheckCircle size={20} />
                <div className={styles.successText}>
                  Your password has been reset successfully. You can now log in with your
                  new password.
                </div>
              </div>
              <Link href="/login" className={styles.backLink}>
                <ArrowLeft size={14} />
                Back to login
              </Link>
            </>
          ) : (
            <>
              <div className={styles.cardTitle}>Reset password</div>
              <div className={styles.cardDesc}>
                Enter your new password below.
              </div>

              {error && (
                <div className={styles.errorBox}>
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className={styles.field}>
                  <label className={styles.label}>New Password</label>
                  <div className={styles.inputWrapper}>
                    <input
                      className={styles.input}
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      style={{ paddingRight: 40 }}
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Confirm Password</label>
                  <div className={styles.inputWrapper}>
                    <input
                      className={styles.input}
                      type={showPassword ? "text" : "password"}
                      placeholder="Confirm new password"
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
                    At least 8 characters
                  </li>
                  <li className={hasUpper ? styles.met : ""}>
                    {hasUpper ? <CheckCircle size={12} /> : <span style={{ width: 12 }} />}
                    One uppercase letter
                  </li>
                  <li className={hasNumber ? styles.met : ""}>
                    {hasNumber ? <CheckCircle size={12} /> : <span style={{ width: 12 }} />}
                    One number
                  </li>
                  <li className={passwordsMatch ? styles.met : ""}>
                    {passwordsMatch ? <CheckCircle size={12} /> : <span style={{ width: 12 }} />}
                    Passwords match
                  </li>
                </ul>

                <button className={styles.submitBtn} type="submit" disabled={loading}>
                  {loading ? (
                    <span className={styles.spinner} />
                  ) : (
                    <Lock size={16} />
                  )}
                  {loading ? "Resetting..." : "Reset Password"}
                </button>
              </form>

              <Link href="/login" className={styles.backLink}>
                <ArrowLeft size={14} />
                Back to login
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
