import type { Metadata } from "next";
import "@/styles/globals.css";
// Patch global fetch for cookie-based auth (must run before any page fetch)
import "@/services/api";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/Toast";

export const metadata: Metadata = {
  title: "SEUM — Smart ERP for Umrah & Mobility",
  description: "Enterprise transportation operating system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
