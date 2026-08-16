import type { Metadata } from "next";
import AuthProvider from "@/src/components/AuthProvider";
import { ToastProvider } from "@/src/context/ToastContext";
import { ConfirmProvider } from "@/src/context/ConfirmContext";
import { HeaderProvider } from "@/src/context/HeaderContext";
import { NotificationProvider } from "@/src/context/NotificationContext";
import { AiProvider } from "@/src/components/ai/AiProvider";
import { SoundProvider } from "@/src/context/SoundContext";
import AppShell from "@/src/components/AppShell";
import "@/src/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Noxy CRM - Gestión de Clientes",
  description: "Gestión de Clientes",
  icons: {
    icon: [{ url: "/favicon.webp?v=noxy-2026", type: "image/webp", sizes: "222x222" }],
    apple: [{ url: "/favicon.webp?v=noxy-2026", type: "image/webp", sizes: "222x222" }],
  },
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
