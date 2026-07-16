"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Bus } from "lucide-react";
import { API_URL } from "@/services/api";
import styles from "./page.module.css";

export default function ForgotPasswordPage() {
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
        setError(data.message || "Request failed");
        return;
      }

      setSent(true);
    } catch {
      setError("Unable to connect to server. Please try again.");
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
          <div className={styles.brandText}>Intelligent Transportation</div>
          <h1 className={styles.headline}>Forgot your password?</h1>
          <p className={styles.subhead}>
            No worries. Enter your email and we&apos;ll send you a reset link.
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
              <div className={styles.cardTitle}>Check your email</div>
              <div className={styles.successBox}>
                <CheckCircle size={20} />
                <div className={styles.successText}>
                  If an account exists with <strong>{email}</strong>, we&apos;ve sent a password
                  reset link. Please check your inbox and spam folder.
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
                Enter the email address associated with your account.
              </div>

              {error && (
                <div className={styles.errorBox}>
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className={styles.field}>
                  <label className={styles.label}>Email Address</label>
                  <div className={styles.inputWrapper}>
                    <input
                      className={styles.input}
                      type="email"
                      placeholder="Enter your email"
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
                  {loading ? "Sending..." : "Send Reset Link"}
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
