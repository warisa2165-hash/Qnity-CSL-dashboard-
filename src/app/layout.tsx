import type { Metadata, Viewport } from "next";

import "./globals.css";
import { ThemeProvider } from "@/components/layout/theme";

export const metadata: Metadata = {
  title: {
    default: "QNITY CSL Laboratory Renovation 2026 — Project Dashboard Portal",
    template: "%s · QNITY CSL 2026",
  },
  description:
    "Central project control and executive reporting platform for the QNITY CSL Laboratory Renovation 2026 project at INC2 Building, Thailand Science Park.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F3F2F1" },
    { media: "(prefers-color-scheme: dark)", color: "#17191c" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen font-sans">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
