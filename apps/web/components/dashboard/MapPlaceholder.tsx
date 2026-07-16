"use client";

interface MapPlaceholderProps {
  className?: string;
  label?: string;
}

export default function MapPlaceholder({ className = "", label }: MapPlaceholderProps) {
  return (
    <div
      className={className}
      style={{
        position: "relative",
        borderRadius: "var(--radius-lg)",
        background: "linear-gradient(135deg, #e8f0fe 0%, #f0f4ff 50%, #e0ecf8 100%)",
        overflow: "hidden",
        minHeight: 200,
      }}
    >
      {/* Grid lines */}
      <svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.15 }}
        aria-hidden="true"
      >
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#2563eb" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Map dots / markers */}
      <svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        aria-hidden="true"
      >
        {/* Route lines */}
        <path
          d="M 30% 40% Q 50% 30% 70% 45%"
          fill="none"
          stroke="#2563eb"
          strokeWidth="2"
          strokeDasharray="6 4"
          opacity={0.4}
        />
        <path
          d="M 45% 25% Q 55% 50% 65% 70%"
          fill="none"
          stroke="#10b981"
          strokeWidth="1.5"
          strokeDasharray="4 3"
          opacity={0.3}
        />

        {/* Markers */}
        {[
          { x: "30%", y: "40%", color: "#2563eb" },
          { x: "50%", y: "32%", color: "#10b981" },
          { x: "70%", y: "45%", color: "#2563eb" },
          { x: "55%", y: "50%", color: "#f59e0b" },
          { x: "65%", y: "70%", color: "#10b981" },
          { x: "20%", y: "55%", color: "#2563eb" },
        ].map((m, i) => (
          <g key={i}>
            <circle cx={m.x} cy={m.y} r="6" fill={m.color} opacity={0.2} />
            <circle cx={m.x} cy={m.y} r="3" fill={m.color} />
          </g>
        ))}
      </svg>

      {/* Roads / shapes */}
      <svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.08 }}
        aria-hidden="true"
      >
        <rect x="15%" y="20%" width="70%" height="60%" rx="4" fill="none" stroke="#475569" strokeWidth="1" />
        <rect x="25%" y="30%" width="50%" height="40%" rx="2" fill="#475569" opacity={0.3} />
      </svg>

      {label && (
        <div
          style={{
            position: "absolute",
            bottom: 12,
            left: 12,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            background: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(4px)",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--text-xs)",
            color: "var(--color-text-secondary)",
            fontWeight: 500,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--color-success)",
            }}
          />
          {label}
        </div>
      )}
    </div>
  );
}
