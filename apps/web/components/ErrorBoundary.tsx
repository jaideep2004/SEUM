"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          minHeight: 300, padding: 40, textAlign: "center",
        }}>
          <AlertTriangle size={48} style={{ color: "var(--color-danger)", marginBottom: 16 }} />
          <h2 style={{ margin: "0 0 8px", color: "var(--color-text-primary)", fontSize: "var(--text-xl)" }}>
            Something went wrong
          </h2>
          <p style={{ margin: "0 0 24px", color: "var(--color-text-secondary)", fontSize: "var(--text-sm)" }}>
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button onClick={() => this.setState({ hasError: false })} style={{
            display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px",
            border: "none", borderRadius: "var(--radius-md)", cursor: "pointer",
            background: "var(--color-primary)", color: "#fff", fontSize: "var(--text-sm)",
          }}>
            <RefreshCw size={16} />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
