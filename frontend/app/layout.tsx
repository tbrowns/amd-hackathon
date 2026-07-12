import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { LanguageProvider } from "@/components/providers/language-provider";
import { RuntimeProvider } from "@/components/providers/runtime-provider";

export const metadata: Metadata = {
  title: { default: "ShambaLens AI · Evidence-first crop triage", template: "%s · ShambaLens AI" },
  description: "Uncertainty-aware crop triage for tomato, onion and kale farmers.",
  applicationName: "ShambaLens AI",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = { themeColor: "#175c3a", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>
          <RuntimeProvider>
            <AppShell>{children}</AppShell>
          </RuntimeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
