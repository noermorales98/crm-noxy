import type { Metadata, Viewport } from "next";
import AuthProvider from "@/src/components/AuthProvider";
import { ToastProvider } from "@/src/context/ToastContext";
import { ConfirmProvider } from "@/src/context/ConfirmContext";
import { HeaderProvider } from "@/src/context/HeaderContext";
import { NotificationProvider } from "@/src/context/NotificationContext";
import { AiProvider } from "@/src/components/ai/AiProvider";
import { SoundProvider } from "@/src/context/SoundContext";
import AppShell from "@/src/components/AppShell";
import PwaRegister from "@/src/components/PwaRegister";
import "@/src/lib/fonts";
import "./globals.css";

const ICON_V = "noxy-2026-09";

export const metadata: Metadata = {
  title: "Noxy CRM - Gestión de Clientes",
  description: "Gestión de Clientes",
  applicationName: "Noxy CRM",
  appleWebApp: {
    capable: true,
    title: "Noxy CRM",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: `/favicon.svg?v=${ICON_V}`, type: "image/svg+xml" },
      { url: `/favicon.webp?v=${ICON_V}`, type: "image/webp", sizes: "222x222" },
      { url: `/icon-192.png?v=${ICON_V}`, type: "image/png", sizes: "192x192" },
      { url: `/icon-512.png?v=${ICON_V}`, type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: `/apple-touch-icon.png?v=${ICON_V}`, type: "image/png", sizes: "180x180" }],
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#3545D6",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="bg-surface-app text-text-primary antialiased">
        <AuthProvider>
          <ToastProvider>
            <ConfirmProvider>
              <HeaderProvider>
                <NotificationProvider>
                  <AiProvider>
                    <SoundProvider>
                      <AppShell>{children}</AppShell>
                      <PwaRegister />
                    </SoundProvider>
                  </AiProvider>
                </NotificationProvider>
              </HeaderProvider>
            </ConfirmProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
