"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const colors = {
  success: { bg: "var(--color-success-light)", border: "var(--color-success-border)", icon: "var(--color-success)" },
  error: { bg: "var(--color-danger-light)", border: "var(--color-danger-border)", icon: "var(--color-danger)" },
  warning: { bg: "var(--color-warning-light)", border: "var(--color-warning-border)", icon: "var(--color-warning)" },
  info: { bg: "var(--color-info-light)", border: "var(--color-info-border)", icon: "var(--color-info)" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div style={{
        position: "fixed", bottom: 16, right: 16, zIndex: 9999,
        display: "flex", flexDirection: "column", gap: 8,
      }}>
        {toasts.map((t) => {
          const Icon = icons[t.type];
          const c = colors[t.type];
          return (
            <div key={t.id} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
              borderRadius: "var(--radius-md)", background: c.bg,
              border: `1px solid ${c.border}`, minWidth: 280,
              boxShadow: "var(--shadow-lg)", fontSize: "var(--text-sm)",
              animation: "fadeInUp 0.2s ease",
            }}>
              <Icon size={18} style={{ color: c.icon, flexShrink: 0 }} />
              <span style={{ flex: 1, color: "var(--color-text-primary)" }}>{t.message}</span>
              <button onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", padding: 0 }}>
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
