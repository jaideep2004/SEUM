"use client";

import { Clock, CheckCircle2, AlertTriangle, Minus } from "lucide-react";
import styles from "./TimelineComparison.module.css";

interface TimelineEvent {
  label: string;
  expectedTime: string | null;
  actualTime: string | null;
  status: "on_time" | "delayed" | "pending" | "missed";
}

interface TimelineData {
  expected: { startTime: string | null; endTime: string | null; durationMinutes: number | null };
  actual: { startTime: string | null; endTime: string | null; durationMinutes: number | null };
  delayMinutes: number | null;
  delayReason: string | null;
  timeline: TimelineEvent[];
}

interface Props {
  data: TimelineData | null;
  loading?: boolean;
}

function formatTime(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso.slice(0, 5);
  }
}

const STATUS_ICONS: Record<string, any> = {
  on_time: CheckCircle2,
  delayed: AlertTriangle,
  pending: Minus,
  missed: AlertTriangle,
};

const STATUS_COLORS: Record<string, string> = {
  on_time: "#10b981",
  delayed: "#f59e0b",
  pending: "#94a3b8",
  missed: "#ef4444",
};

export default function TimelineComparison({ data, loading }: Props) {
  if (loading) {
    return <div className={styles.container}><p className={styles.empty}>Loading timeline...</p></div>;
  }
  if (!data) {
    return <div className={styles.container}><p className={styles.empty}>No timeline data available</p></div>;
  }

  return (
    <div className={styles.container}>
      {/* Duration Comparison */}
      <div className={styles.durationRow}>
        <div className={styles.durationCard}>
          <span className={styles.durationLabel}>Expected Duration</span>
          <span className={styles.durationValue}>
            {data.expected.durationMinutes ? `${data.expected.durationMinutes} min` : "—"}
          </span>
          <span className={styles.durationTime}>
            {formatTime(data.expected.startTime)} → {formatTime(data.expected.endTime)}
          </span>
        </div>
        <div className={styles.durationCard}>
          <span className={styles.durationLabel}>Actual Duration</span>
          <span className={`${styles.durationValue} ${data.delayMinutes ? styles.delayed : ""}`}>
            {data.actual.durationMinutes ? `${data.actual.durationMinutes} min` : "—"}
          </span>
          <span className={styles.durationTime}>
            {formatTime(data.actual.startTime)} → {formatTime(data.actual.endTime)}
          </span>
        </div>
        {data.delayMinutes && (
          <div className={styles.delayBadge}>
            <AlertTriangle size={14} />
            <span>{data.delayMinutes} min delay</span>
            {data.delayReason && <span className={styles.delayReason}>{data.delayReason}</span>}
          </div>
        )}
      </div>

      {/* Timeline Events */}
      <div className={styles.timeline}>
        <div className={styles.timelineHeader}>
          <span className={styles.headerCell}>Event</span>
          <span className={styles.headerCell}>Expected</span>
          <span className={styles.headerCell}>Actual</span>
          <span className={styles.headerCell}>Status</span>
        </div>
        {data.timeline.map((event, i) => {
          const Icon = STATUS_ICONS[event.status] || Minus;
          const color = STATUS_COLORS[event.status] || "#94a3b8";
          return (
            <div key={i} className={styles.timelineRow}>
              <span className={styles.eventLabel}>{event.label}</span>
              <span className={styles.timeCell}>{formatTime(event.expectedTime)}</span>
              <span className={styles.timeCell}>{formatTime(event.actualTime)}</span>
              <span className={styles.statusCell}>
                <Icon size={14} style={{ color }} />
                <span style={{ color }} className={styles.statusText}>{event.status.replace("_", " ")}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
