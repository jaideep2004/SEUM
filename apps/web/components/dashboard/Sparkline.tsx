"use client";

import { useEffect, useRef, useState } from "react";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fillColor?: string;
  strokeWidth?: number;
  animate?: boolean;
}

export default function Sparkline({
  data,
  width = 80,
  height = 32,
  color = "var(--color-primary)",
  fillColor,
  strokeWidth = 2,
  animate = true,
}: SparklineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;

  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = padding + ((max - val) / range) * (height - padding * 2);
    return { x, y };
  });

  const linePath = `M ${points.map(p => `${p.x},${p.y}`).join(" L ")}`;
  const fillPath = `${linePath} L ${width - padding},${height - padding} L ${padding},${height - padding} Z`;

  const [visible, setVisible] = useState(!animate);

  useEffect(() => {
    if (!animate) return;
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, [animate]);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      {fillColor && (
        <path
          d={fillPath}
          fill={fillColor}
          opacity={visible ? 0.15 : 0}
          style={{ transition: "opacity 0.6s ease 0.3s" }}
        />
      )}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={visible ? "none" : "200"}
        strokeDashoffset={visible ? 0 : 200}
        style={{
          transition: "stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />
    </svg>
  );
}
