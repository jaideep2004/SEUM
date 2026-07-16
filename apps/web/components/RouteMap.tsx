"use client";

import { useState, useMemo } from "react";
import { MapPin, Navigation, Info } from "lucide-react";
import styles from "./RouteMap.module.css";

interface Stop {
  id: string;
  stopName: string;
  stopOrder: number;
  latitude: number | null;
  longitude: number | null;
  estimatedArrivalMinutes: number | null;
}

interface RouteMapProps {
  origin: string;
  destination: string;
  stops: Stop[];
  width?: number;
  height?: number;
}

export default function RouteMap({ origin, destination, stops, width = 600, height = 300 }: RouteMapProps) {
  const [tooltip, setTooltip] = useState<string | null>(null);

  const sortedStops = useMemo(() => [...stops].sort((a, b) => a.stopOrder - b.stopOrder), [stops]);

  const points = useMemo(() => {
    const total = sortedStops.length;
    if (total === 0) return [];

    const padding = 60;
    const usableW = width - padding * 2;
    const usableH = height - padding * 2;
    const midH = height / 2;

    // Stops distributed horizontally, with slight vertical variation for visual interest
    return sortedStops.map((s, i) => {
      const x = padding + (i / (total + 1)) * usableW;
      const y = midH + (i % 2 === 0 ? -30 : 30) * (i > 0 && i < total - 1 ? 1 : 0);
      return { x, y, stop: s };
    });
  }, [sortedStops, width, height]);

  const originPt = points.length > 0
    ? { x: 60, y: height / 2 }
    : { x: 60, y: height / 2 };
  const destPt = points.length > 0
    ? { x: width - 60, y: height / 2 }
    : { x: width - 60, y: height / 2 };

  const polylinePoints = [
    `${originPt.x},${originPt.y}`,
    ...points.map((p) => `${p.x},${p.y}`),
    `${destPt.x},${destPt.y}`,
  ].join(" ");

  return (
    <div className={styles.wrapper} style={{ maxWidth: width }}>
      <svg viewBox={`0 0 ${width} ${height}`} className={styles.svg} role="img" aria-label="Route map">
        {/* Background */}
        <rect width={width} height={height} fill="var(--color-bg)" rx="8" />

        {/* Dashed route line */}
        <polyline
          points={polylinePoints}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="2"
          strokeDasharray="6 4"
          opacity="0.5"
        />

        {/* Solid route line */}
        <polyline
          points={polylinePoints}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Origin marker */}
        <g>
          <circle cx={originPt.x} cy={originPt.y} r="8" fill="var(--color-primary)" stroke="#fff" strokeWidth="2" />
          <text x={originPt.x} y={originPt.y + 4} textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700">
            O
          </text>
          <text x={originPt.x} y={originPt.y + 20} textAnchor="middle" fill="var(--color-text-secondary)" fontSize="10" fontWeight="600">
            {origin}
          </text>
        </g>

        {/* Stop markers */}
        {points.map((p) => (
          <g key={p.stop.id}>
            <circle
              cx={p.x} cy={p.y} r="6"
              fill="var(--color-warning)"
              stroke="#fff" strokeWidth="2"
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setTooltip(p.stop.id)}
              onMouseLeave={() => setTooltip(null)}
            />
            <text x={p.x} y={p.y + 2} textAnchor="middle" fill="#fff" fontSize="8" fontWeight="700">
              {p.stop.stopOrder}
            </text>
            <text x={p.x} y={p.y + 16} textAnchor="middle" fill="var(--color-text-tertiary)" fontSize="8">
              {p.stop.stopName.length > 12 ? p.stop.stopName.slice(0, 12) + "…" : p.stop.stopName}
            </text>

            {/* Tooltip */}
            {tooltip === p.stop.id && (
              <g>
                <rect
                  x={p.x - 60} y={p.y - 50}
                  width="120" height="36" rx="4"
                  fill="var(--color-surface)"
                  stroke="var(--color-border)"
                  strokeWidth="1"
                />
                <text x={p.x} y={p.y - 34} textAnchor="middle" fill="var(--color-text)" fontSize="9" fontWeight="600">
                  {p.stop.stopName}
                </text>
                <text x={p.x} y={p.y - 22} textAnchor="middle" fill="var(--color-text-secondary)" fontSize="8">
                  {p.stop.estimatedArrivalMinutes ? `Arrival: ${p.stop.estimatedArrivalMinutes} min` : "No ETA"}
                </text>
              </g>
            )}
          </g>
        ))}

        {/* Destination marker */}
        <g>
          <circle cx={destPt.x} cy={destPt.y} r="8" fill="var(--color-danger)" stroke="#fff" strokeWidth="2" />
          <text x={destPt.x} y={destPt.y + 4} textAnchor="middle" fill="#fff" fontSize="8" fontWeight="700">
            D
          </text>
          <text x={destPt.x} y={destPt.y + 20} textAnchor="middle" fill="var(--color-text-secondary)" fontSize="10" fontWeight="600">
            {destination}
          </text>
        </g>
      </svg>

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={styles.dotPrimary} />
          <span>Origin</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.dotWarning} />
          <span>Stop ({sortedStops.length})</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.dotDanger} />
          <span>Destination</span>
        </div>
        <MapPin size={13} style={{ color: "var(--color-text-tertiary)" }} />
        <Navigation size={13} style={{ color: "var(--color-primary)" }} />
      </div>

      {/* Stop list summary */}
      <div className={styles.stopList}>
        <div className={styles.stopItem}>
          <span className={styles.stopIndex}>O</span>
          <span className={styles.stopName}>{origin}</span>
          <span className={styles.stopEta}>Start</span>
        </div>
        {sortedStops.map((s) => (
          <div key={s.id} className={styles.stopItem}>
            <span className={styles.stopIndex}>{s.stopOrder}</span>
            <span className={styles.stopName}>{s.stopName}</span>
            <span className={styles.stopEta}>
              {s.estimatedArrivalMinutes ? `${s.estimatedArrivalMinutes} min` : "—"}
            </span>
          </div>
        ))}
        <div className={styles.stopItem}>
          <span className={styles.stopIndex}>D</span>
          <span className={styles.stopName}>{destination}</span>
          <span className={styles.stopEta}>End</span>
        </div>
      </div>
    </div>
  );
}
