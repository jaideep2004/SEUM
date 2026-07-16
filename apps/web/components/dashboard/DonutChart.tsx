"use client";

import { useEffect, useRef, useState } from "react";

interface Segment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: Segment[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
  animate?: boolean;
}

export default function DonutChart({ segments, size = 160, thickness = 20, centerLabel, centerValue, animate = true }: DonutChartProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const [visible, setVisible] = useState(!animate);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!animate) return;
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, [animate]);

  let cumulativePercent = 0;

  return (
    <div ref={ref} style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.map((seg, i) => {
          const percent = seg.value / total;
          const dashLength = circumference * percent;
          const dashOffset = circumference * cumulativePercent;
          cumulativePercent += percent;
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={thickness}
              strokeDasharray={visible ? `${dashLength} ${circumference - dashLength}` : `0 ${circumference}`}
              strokeDashoffset={visible ? -dashOffset : 0}
              strokeLinecap="round"
              style={{
                transform: "rotate(-90deg)",
                transformOrigin: "50% 50%",
                transition: `stroke-dasharray 0.8s cubic-bezier(0.4, 0, 0.2, 1) ${i * 0.15}s, stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1) ${i * 0.15}s`,
              }}
            />
          );
        })}
      </svg>
      {(centerLabel || centerValue) && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            opacity: visible ? 1 : 0,
            transform: visible ? "scale(1)" : "scale(0.8)",
            transition: "opacity 0.5s ease 0.4s, transform 0.5s ease 0.4s",
          }}
        >
          {centerValue && (
            <span style={{ fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--color-text-primary)", lineHeight: 1.1 }}>
              {centerValue}
            </span>
          )}
          {centerLabel && (
            <span style={{ fontSize: "10px", color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2 }}>
              {centerLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
