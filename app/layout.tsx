import type { Metadata } from "next";
import AuthProvider from "@/src/components/AuthProvider";
import { ToastProvider } from "@/src/context/ToastContext";
import { ConfirmProvider } from "@/src/context/ConfirmContext";
import { HeaderProvider } from "@/src/context/HeaderContext";
import { NotificationProvider } from "@/src/context/NotificationContext";
import AppShell from "@/src/components/AppShell";
import "@/src/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Noxy CRM - Gestión de Clientes",
  description: "Gestión de Clientes",
  icons: {
    icon: "/favicon.webp",
    apple: "/favicon.webp",
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
                  <AppShell>{children}</AppShell>
                </NotificationProvider>
              </HeaderProvider>
            </ConfirmProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
