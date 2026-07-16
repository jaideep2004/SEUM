"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { API_URL } from "@/services/api";
import { Eye, EyeOff, MapPin, Shield, Camera, BarChart3 } from "lucide-react";
import styles from "./page.module.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.message || "Login failed");
        return;
      }

      localStorage.setItem("seum_access_token", data.data.tokens.accessToken);
      localStorage.setItem("seum_refresh_token", data.data.tokens.refreshToken);
      localStorage.setItem("seum_user", JSON.stringify(data.data.user));

      const role = data.data.user.roles?.[0];
      const dashboardMap: Record<string, string> = {
        super_admin: "/dashboard",
        company_admin: "/dashboard/company",
        operations_manager: "/dashboard/operations",
        fleet_manager: "/dashboard/fleet",
        monitoring_control: "/dashboard/monitoring",
      };
      window.location.href = dashboardMap[role] || "/dashboard";
    } catch {
      setError("Unable to connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      {/* ─── Left Panel (Dark) ─── */}
      <div className={styles.leftPanel}>
        <div className={styles.leftContent}>
          {/* Logo */}
          <div className={styles.brand}>
            <div className={styles.brandLogo}>
              <svg width="36" height="36" viewBox="0 0 100 100" fill="none" aria-hidden="true">
                <path d="M50 5L85 25V75L50 95L15 75V25L50 5Z" fill="none" stroke="#D4920C" strokeWidth="4" />
                <path d="M50 20L70 32V68L50 80L30 68V32L50 20Z" fill="none" stroke="#D4920C" strokeWidth="3" />
                <path d="M50 35L60 41V59L50 65L40 59V41L50 35Z" fill="#D4920C" />
                <path d="M35 28L50 20L65 28L50 36L35 28Z" fill="none" stroke="#D4920C" strokeWidth="2" />
                <path d="M65 28L70 32L65 36L50 28Z" fill="#D4920C" opacity="0.6" />
                <path d="M35 28L30 32L35 36L50 28Z" fill="#D4920C" opacity="0.6" />
              </svg>
            </div>
            <div className={styles.brandText}>
              <span className={styles.brandName}>SEUM</span>
              <span className={styles.brandSub}>SMART TRANSPORTATION ERP</span>
            </div>
          </div>

          {/* Headline */}
          <h1 className={styles.headline}>
            Intelligent Transportation.<br />
            <span className={styles.headlineAccent}>Connected Operations.</span>
          </h1>
          <div className={styles.headlineBar} />
          <p className={styles.headlineDesc}>
            Real-time visibility, AI safety monitoring, fleet intelligence and complete ERP control in one unified platform.
          </p>

         

          {/* Feature Cards */}
          <div className={styles.features}>
            <div className={styles.featureCard}>
              <MapPin size={20} />
              <span className={styles.featureTitle}>Live Tracking</span>
              <span className={styles.featureDesc}>Real-time GPS Monitoring</span>
            </div>
            <div className={styles.featureCard}>
              <Shield size={20} />
              <span className={styles.featureTitle}>AI Safety</span>
              <span className={styles.featureDesc}>DMS, ADAS & Smart Alerts</span>
            </div>
            <div className={styles.featureCard}>
              <Camera size={20} />
              <span className={styles.featureTitle}>CCTV Monitoring</span>
              <span className={styles.featureDesc}>Live View & Video Playback</span>
            </div>
            <div className={styles.featureCard}>
              <BarChart3 size={20} />
              <span className={styles.featureTitle}>Smart Analytics</span>
              <span className={styles.featureDesc}>Powerful Reports & KPIs</span>
            </div>
          </div>

          {/* Footer */}
          <p className={styles.leftFooter}>© 2025 SEUM Technology. All rights reserved.</p>
        </div>
      </div>

      {/* ─── Right Panel (Form) ─── */}
      <div className={styles.rightPanel}>
        {/* Language Switcher */}
        <div className={styles.langSwitcher}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          <span>English</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {/* Login Card */}
        <div className={styles.loginCard}>
          {/* Logo */}
          <div className={styles.formLogo}>
            <svg width="40" height="40" viewBox="0 0 100 100" fill="none" aria-hidden="true">
              <path d="M50 5L85 25V75L50 95L15 75V25L50 5Z" fill="none" stroke="#2563eb" strokeWidth="4" />
              <path d="M50 20L70 32V68L50 80L30 68V32L50 20Z" fill="none" stroke="#2563eb" strokeWidth="3" />
              <path d="M50 35L60 41V59L50 65L40 59V41L50 35Z" fill="#2563eb" />
              <path d="M35 28L50 20L65 28L50 36L35 28Z" fill="none" stroke="#2563eb" strokeWidth="2" />
              <path d="M65 28L70 32L65 36L50 28Z" fill="#2563eb" opacity="0.6" />
              <path d="M35 28L30 32L35 36L50 28Z" fill="#2563eb" opacity="0.6" />
            </svg>
          </div>

          <h2 className={styles.formTitle}>Welcome Back</h2>
          <p className={styles.formSubtitle}>Sign in to your SEUM account</p>

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <div className={styles.field}>
              <label htmlFor="email" className={styles.label}>Email Address</label>
              <div className={styles.inputWrap}>
                <svg className={styles.inputIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <input
                  id="email"
                  type="email"
                  className={styles.input}
                  placeholder="youremail@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="password" className={styles.label}>Password</label>
              <div className={styles.inputWrap}>
                <svg className={styles.inputIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className={styles.input}
                  placeholder="••••••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className={styles.forgotRow}>
              <Link href="/forgot-password" className={styles.forgotLink}>Forgot Password?</Link>
            </div>

            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className={styles.checkboxInput}
              />
              <span className={styles.checkboxCustom} />
              <span className={styles.checkboxLabel}>Remember me</span>
            </label>

            {error && (
              <div className={styles.error} role="alert">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M8 4.5V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="8" cy="11" r="0.75" fill="currentColor" />
                </svg>
                {error}
              </div>
            )}

            <button type="submit" className={styles.submit} disabled={loading}>
              {loading ? (
                <span className={styles.spinner} />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
              )}
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          {/* Divider */}
          <div className={styles.divider}>
            <span>or continue with</span>
          </div>

          {/* Social Login */}
          <div className={styles.socialRow}>
            <button className={styles.socialBtn}>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google
            </button>
            <button className={styles.socialBtn}>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M11.4 24H0V11.4h11.4V24zM24 24H12.6V11.4H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z" fill="#F25022" />
                <path d="M11.4 24H0V11.4h11.4V24z" fill="#7FBA00" transform="translate(0,-12.6)" />
                <path d="M24 24H12.6V11.4H24V24z" fill="#00A4EF" transform="translate(0,-12.6)" />
                <path d="M11.4 11.4H0V0h11.4v11.4z" fill="#F25022" transform="translate(0,-12.6)" />
                <path d="M24 11.4H12.6V0H24v11.4z" fill="#FFB900" transform="translate(0,-12.6)" />
              </svg>
              Microsoft
            </button>
          </div>

          <p className={styles.signupText}>
            New to SEUM? <a href="#" className={styles.signupLink}>Contact Your Administrator</a>
          </p>
        </div>
      </div>
    </div>
  );
}
