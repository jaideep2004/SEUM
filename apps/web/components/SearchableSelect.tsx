"use client";

import { useState, useRef, useEffect } from "react";

interface Option {
  value: string;
  label: string;
}

/**
 * Searchable dropdown: type to filter a long option list (e.g. cities).
 * Shows the matched label for the current value; clears on empty select.
 */
export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  title,
  maxShown = 8,
  allowCustom = false,
  customLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  title?: string;
  maxShown?: number;
  allowCustom?: boolean;
  customLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = (q
    ? options.filter((o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q))
    : options
  ).slice(0, maxShown);
  const exactMatch = q && options.some((o) => o.label.toLowerCase() === q || o.value.toLowerCase() === q);

  function commitCustom() {
    const text = query.trim();
    if (!text) return;
    onChange(text);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={wrapRef} style={{ position: "relative", minWidth: 130, flex: 1 }}>
      <input
        value={open ? query : current ? current.label : value}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => { setQuery(""); setOpen(true); }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && allowCustom && query.trim()) {
            e.preventDefault();
            commitCustom();
          }
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder={placeholder || ""}
        title={title}
        style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-bg)", color: "var(--color-text)", fontSize: 12, outline: "none", boxSizing: "border-box" }}
      />
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 30, background: "var(--color-surface, #fff)", border: "1px solid var(--color-border)", borderTop: "none", borderRadius: "0 0 var(--radius-sm) var(--radius-sm)", maxHeight: 190, overflowY: "auto", boxShadow: "var(--shadow-md, 0 4px 12px rgba(0,0,0,0.08))" }}>
          {filtered.length === 0 && (
            <div style={{ padding: "7px 10px", fontSize: 11, color: "var(--color-text-tertiary)" }}>—</div>
          )}
          {filtered.map((o) => (
            <button
              key={o.value}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(o.value);
                setQuery("");
                setOpen(false);
              }}
              style={{ width: "100%", textAlign: "start", padding: "7px 10px", border: "none", background: value === o.value ? "var(--color-primary-light, #eff6ff)" : "transparent", color: "var(--color-text)", fontSize: 12, cursor: "pointer" }}
            >
              {o.label}
            </button>
          ))}
          {allowCustom && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                commitCustom();
              }}
              style={{ width: "100%", textAlign: "start", padding: "7px 10px", border: "none", borderTop: "1px solid var(--color-border)", background: "transparent", color: "var(--color-primary, #2563eb)", fontSize: 12, cursor: "pointer", fontWeight: 600 }}
            >
              {customLabel || "Other"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
