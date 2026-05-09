import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DeliveryGuard AI — Turn Client Promises Into Verified Engineering Execution",
  description: "DeliveryGuard AI audits whether client promises are backed by real engineering execution. Detects missing tickets, scope drift, contradictions, and delivery blockers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
