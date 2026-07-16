"use client";

import { CheckCircle2, Circle, Clock, PlayCircle, XCircle, AlertTriangle } from "lucide-react";
import styles from "./TripTimeline.module.css";

interface Step {
  key: string;
  label: string;
  timestamp: string | null;
  icon: React.ReactNode;
  active: boolean;
  completed: boolean;
  cancelled?: boolean;
}

interface TripTimelineProps {
  status: string;
  actualStartTime?: string | null;
  actualEndTime?: string | null;
  delayMinutes?: number | null;
  delayReason?: string | null;
  rejectionReason?: string | null;
}

export default function TripTimeline({
  status, actualStartTime, actualEndTime,
  delayMinutes, delayReason, rejectionReason,
}: TripTimelineProps) {
  const isCancelled = status === "cancelled";
  const isDelayed = status === "delayed";

  const steps: Step[] = [
    {
      key: "scheduled",
      label: "Scheduled",
      timestamp: null,
      icon: <Clock size={16} />,
      active: !isCancelled,
      completed: !isCancelled,
    },
    {
      key: "en_route",
      label: "En Route",
      timestamp: actualStartTime || null,
      icon: <PlayCircle size={16} />,
      active: ["en_route", "completed"].includes(status) || (isDelayed && actualStartTime !== null),
      completed: ["en_route", "completed", "delayed"].includes(status),
    },
    {
      key: "completed",
      label: isCancelled ? "Cancelled" : "Completed",
      timestamp: isCancelled ? null : actualEndTime || null,
      icon: isCancelled ? <XCircle size={16} /> : <CheckCircle2 size={16} />,
      active: isCancelled || status === "completed",
      completed: isCancelled || status === "completed",
      cancelled: isCancelled,
    },
  ];

  return (
    <div className={styles.wrapper}>
      <div className={styles.stepper}>
        {steps.map((step, i) => (
          <div key={step.key} className={`${styles.step} ${step.completed ? styles.completed : ""} ${step.active ? styles.active : ""} ${step.cancelled ? styles.cancelled : ""}`}>
            <div className={styles.stepConnector}>
              <div className={`${styles.dot} ${step.completed ? styles.dotDone : styles.dotPending}`}>
                {step.icon}
              </div>
              {i < steps.length - 1 && <div className={`${styles.line} ${step.completed ? styles.lineDone : ""}`} />}
            </div>
            <div className={styles.stepContent}>
              <span className={styles.stepLabel}>{step.label}</span>
              {step.timestamp && <span className={styles.stepTime}>{new Date(step.timestamp).toLocaleString()}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Status badges */}
      <div className={styles.statusRow}>
        {isDelayed && (
          <div className={styles.delayBadge}>
            <AlertTriangle size={13} />
            <span>Delayed by {delayMinutes} min{delayReason ? ` — ${delayReason}` : ""}</span>
          </div>
        )}
        {isCancelled && rejectionReason && (
          <div className={styles.cancelBadge}>
            <XCircle size={13} />
            <span>{rejectionReason}</span>
          </div>
        )}
      </div>
    </div>
  );
}
