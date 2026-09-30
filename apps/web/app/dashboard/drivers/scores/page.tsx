"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3, Trophy, Shield, Star, Award } from "lucide-react";
import { useLanguage, formatDate } from "@/lib/i18n";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("seum_access_token");
}

function scoreColor(s: number) {
  return s >= 90 ? "#059669" : s >= 75 ? "#f59e0b" : s >= 50 ? "#f97316" : "#dc2626";
}

function RadarChart({ scores: { safety, punctuality, customer, fuel }, labels }: { scores: { safety: number; punctuality: number; customer: number; fuel: number }; labels: string[] }) {
  const cx = 140, cy = 140, r = 100;
  const values = [safety / 100, punctuality / 100, customer / 100, fuel / 100];
  const angles = [0, 90, 180, 270].map(d => (d - 90) * Math.PI / 180);

  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <svg className={styles.radarSvg} viewBox="0 0 280 280">
      {gridLevels.map((level, li) => (
        <polygon key={li}
          points={angles.map(a => `${cx + r * level * Math.cos(a)},${cy + r * level * Math.sin(a)}`).join(" ")}
          fill="none" stroke="var(--color-border)" strokeWidth="0.5" />
      ))}
      {angles.map((a, i) => (
        <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(a)} y2={cy + r * Math.sin(a)}
          stroke="var(--color-border)" strokeWidth="0.5" />
      ))}
      <polygon
        points={angles.map((a, i) => `${cx + r * values[i] * Math.cos(a)},${cy + r * values[i] * Math.sin(a)}`).join(" ")}
        fill="rgba(59,130,246,0.2)" stroke="#3b82f6" strokeWidth="2" />
      {angles.map((a, i) => (
        <circle key={i} cx={cx + r * values[i] * Math.cos(a)} cy={cy + r * values[i] * Math.sin(a)} r="4" fill="#3b82f6" />
      ))}
      {angles.map((a, i) => (
        <text key={i} x={cx + (r + 20) * Math.cos(a)} y={cy + (r + 20) * Math.sin(a)}
          textAnchor="middle" dominantBaseline="central"
          fill="var(--color-text-secondary)" fontSize="11" fontWeight="600">
          {labels[i]} {Math.round(values[i] * 100)}
        </text>
      ))}
    </svg>
  );
}

export default function DriverScoresPage() {
  const { lang, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"history" | "leaderboard">("history");

  // History state
  const [driverId, setDriverId] = useState("");
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [latestScore, setLatestScore] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [drivers, setDrivers] = useState<any[]>([]);

  // Leaderboard state
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [leaderTab, setLeaderTab] = useState<"top" | "bottom">("top");
  const [lbPeriod, setLbPeriod] = useState<"month" | "quarter" | "year">("month");

  async function fetchHistory() {
    if (!driverId.trim()) return;
    setLoading(true);
    const token = getToken();
    try {
      const [histRes, latestRes] = await Promise.all([
        fetch(`${API}/drivers/scores/history/${driverId}?pageSize=50`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/drivers/scores/latest/${driverId}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const hist = await histRes.json();
      const lat = await latestRes.json();
      if (hist.success) setHistoryData(hist.data || []);
      if (lat.success) setLatestScore(lat.data);
    } catch {}
    setLoading(false);
  }

  async function fetchLeaderboard() {
    setLoading(true);
    const token = getToken();
    try {
      const res = await fetch(`${API}/drivers/scores/leaderboard?period=${lbPeriod}&pageSize=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setLeaderboardData(data.data || []);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { if (activeTab === "leaderboard") fetchLeaderboard(); }, [activeTab, lbPeriod]);

  useEffect(() => {
    (async () => {
      const token = getToken();
      try {
        const res = await fetch(`${API}/drivers?page=1&pageSize=100`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (data.success) setDrivers(data.data || []);
      } catch {}
    })();
  }, []);

  const renderStars = (score: number) => {
    const s = scoreColor(score);
    return <span style={{ color: s, fontWeight: 700 }}>{score}</span>;
  };

  const radarLabels = [t("drivers.scores.cardSafety"), t("drivers.scores.cardPunctuality"), t("drivers.scores.cardCustomer"), t("drivers.scores.radarFuel")];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/dashboard/drivers" className={styles.backLink}><ArrowLeft size={14} /> {t("common.back")}</Link>
          <h1>{t("drivers.scores.title")}</h1>
        </div>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === "history" ? styles.tabActive : ""}`} onClick={() => setActiveTab("history")}>
          <BarChart3 size={14} /> {t("drivers.scores.tabHistory")}
        </button>
        <button className={`${styles.tab} ${activeTab === "leaderboard" ? styles.tabActive : ""}`} onClick={() => setActiveTab("leaderboard")}>
          <Trophy size={14} /> {t("drivers.scores.tabBoard")}
        </button>
      </div>

      {/* ==================== HISTORY TAB ==================== */}
      {activeTab === "history" && (
        <div>
          <div className={styles.searchRow}>
            <select className={styles.searchInput} value={driverId} onChange={(e) => { setDriverId(e.target.value); if (e.target.value) fetchHistory(); }}>
              <option value="">{t("drivers.scores.selectDriver")}</option>
              {drivers.map(dv => <option key={dv.id} value={dv.id}>{dv.name}{dv.employeeCode ? ` (${dv.employeeCode})` : ""}</option>)}
            </select>
            <button className={`${styles.actionBtn} ${styles.primaryBtn}`} onClick={fetchHistory}>
              <BarChart3 size={14} /> {t("drivers.scores.loadBtn")}
            </button>
          </div>

          {latestScore && (
            <>
              {latestScore.recommendation && (
                <div className={styles.recommendationCard}>
                  <div className={styles.recommendationIcon}>
                    <Award size={24} />
                  </div>
                  <div className={styles.recommendationContent}>
                    <div className={styles.recommendationTitle}>{latestScore.recommendation.tier.toUpperCase()} {t("drivers.scores.tierEligible")}</div>
                    <div className={styles.recommendationDesc}>
                      {t("drivers.scores.recScoreWord")} {latestScore.overallScore} {t("drivers.scores.recThreshold")} {latestScore.recommendation.bonus}
                    </div>
                  </div>
                </div>
              )}
              <div className={styles.scoreCards}>
                <div className={styles.scoreCard}>
                  <div className={styles.scoreCardLabel}>{t("drivers.scores.cardOverall")}</div>
                  <div className={styles.scoreCardValue} style={{ color: scoreColor(latestScore.overallScore) }}>{latestScore.overallScore}</div>
                </div>
                <div className={styles.scoreCard}>
                  <div className={styles.scoreCardLabel}>{t("drivers.scores.cardSafety")}</div>
                  <div className={styles.scoreCardValue} style={{ color: "#3b82f6" }}>{latestScore.safetyScore}</div>
                </div>
                <div className={styles.scoreCard}>
                  <div className={styles.scoreCardLabel}>{t("drivers.scores.cardPunctuality")}</div>
                  <div className={styles.scoreCardValue} style={{ color: "#f59e0b" }}>{latestScore.punctualityScore}</div>
                </div>
                <div className={styles.scoreCard}>
                  <div className={styles.scoreCardLabel}>{t("drivers.scores.cardCustomer")}</div>
                  <div className={styles.scoreCardValue} style={{ color: "#ec4899" }}>{latestScore.customerScore}</div>
                </div>
                <div className={styles.scoreCard}>
                  <div className={styles.scoreCardLabel}>{t("drivers.scores.cardFuel")}</div>
                  <div className={styles.scoreCardValue} style={{ color: "#8b5cf6" }}>{latestScore.fuelEfficiencyScore}</div>
                </div>
              </div>

              <div className={styles.radarWrap}>
                <RadarChart scores={{
                  safety: latestScore.safetyScore,
                  punctuality: latestScore.punctualityScore,
                  customer: latestScore.customerScore,
                  fuel: latestScore.fuelEfficiencyScore,
                }} labels={radarLabels} />
              </div>
            </>
          )}

          {loading ? (
            <div className={styles.loading}>{t("drivers.scores.loadingScores")}</div>
          ) : historyData.length > 0 ? (
            <div className={styles.chartWrap}>
              <div className={styles.chart}>
                {historyData.map((s: any, i: number) => (
                  <div key={s.id || i} className={styles.barGroup}>
                    <div className={styles.barValue} style={{ color: scoreColor(s.overallScore) }}>{s.overallScore}</div>
                    <div className={styles.bar} style={{
                      height: `${s.overallScore}px`,
                      background: scoreColor(s.overallScore),
                    }} />
                    <div className={styles.barLabel}>{s.periodStart ? formatDate(s.periodStart, lang) : ""}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : driverId && !loading ? (
            <div className={styles.emptyState}>
              <BarChart3 size={40} style={{ opacity: 0.3, marginBottom: 8 }} />
              <p>{t("drivers.scores.emptyScores")}</p>
            </div>
          ) : null}
        </div>
      )}

      {/* ==================== LEADERBOARD TAB ==================== */}
      {activeTab === "leaderboard" && (
        <div>
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <select className={styles.searchInput} style={{ width: "auto", padding: "6px 10px" }}
              value={lbPeriod} onChange={e => setLbPeriod(e.target.value as any)}>
              <option value="month">{t("drivers.scores.periodMonth")}</option>
              <option value="quarter">{t("drivers.scores.periodQuarter")}</option>
              <option value="year">{t("drivers.scores.periodYear")}</option>
            </select>
            <div className={styles.topTabs}>
              <button className={`${styles.topTab} ${leaderTab === "top" ? styles.topTabActive : ""}`} onClick={() => setLeaderTab("top")}>
                <Trophy size={12} style={{ display: "inline", marginRight: 4 }} />{t("drivers.scores.topTab")}
              </button>
              <button className={`${styles.topTab} ${leaderTab === "bottom" ? styles.topTabActive : ""}`} onClick={() => setLeaderTab("bottom")}>
                {t("drivers.scores.bottomTab")}
              </button>
            </div>
          </div>

          {loading ? (
            <div className={styles.loading}>{t("drivers.scores.loadingBoard")}</div>
          ) : leaderboardData.length === 0 ? (
            <div className={styles.emptyState}>
              <Trophy size={40} style={{ opacity: 0.3, marginBottom: 8 }} />
              <p>{t("drivers.scores.emptyBoard")}</p>
            </div>
          ) : (
            <div className={styles.leaderboardWrap}>
              <table className={styles.leaderboardTable}>
                <thead>
                  <tr>
                    <th>{t("drivers.scores.lbRank")}</th>
                    <th>{t("drivers.attendance.colDriver")}</th>
                    <th>{t("drivers.scores.cardOverall")}</th>
                    <th>{t("drivers.scores.cardSafety")}</th>
                    <th>{t("drivers.scores.cardPunctuality")}</th>
                    <th>{t("drivers.scores.cardCustomer")}</th>
                    <th>{t("drivers.scores.radarFuel")}</th>
                    <th>{t("drivers.scores.lbScoreBar")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(leaderTab === "top" ? leaderboardData : [...leaderboardData].reverse()).slice(0, 50).map((d: any) => (
                    <tr key={d.driverId}>
                      <td>
                        <div className={styles.rankBadge} style={{
                          background: d.rank <= 3 ? ["#fbbf24", "#9ca3af", "#d97706"][d.rank - 1] || "var(--color-bg-subtle)" : "var(--color-bg-subtle)",
                          color: d.rank <= 3 ? "#000" : "var(--color-text-secondary)",
                        }}>
                          {d.rank}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{d.driverName || d.employeeCode}</div>
                        <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{d.employeeCode}</div>
                      </td>
                      <td style={{ fontWeight: 700, color: scoreColor(d.overallScore) }}>{d.overallScore}</td>
                      <td>{renderStars(d.safetyScore)}</td>
                      <td>{renderStars(d.punctualityScore)}</td>
                      <td>{renderStars(d.customerScore)}</td>
                      <td>{renderStars(d.fuelEfficiencyScore)}</td>
                      <td>
                        <div className={styles.scoreBarWrap}>
                          <div className={styles.scoreBarFill} style={{ width: `${d.overallScore}%`, background: scoreColor(d.overallScore) }} />
                          <div className={styles.scoreBarLabel}>{d.overallScore}%</div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
