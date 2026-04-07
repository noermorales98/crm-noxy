import type { Metadata } from "next";
import { Inter } from "next/font/google";
import AuthProvider from "@/src/components/AuthProvider";
import { ToastProvider } from "@/src/context/ToastContext";
import { ConfirmProvider } from "@/src/context/ConfirmContext";
import { HeaderProvider } from "@/src/context/HeaderContext";
import { NotificationProvider } from "@/src/context/NotificationContext";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

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
    <html lang="en">
      <body className={`${inter.className} bg-[#f5f4ef] text-gray-800 antialiased`}>
        <AuthProvider>
          <ToastProvider>
            <ConfirmProvider>
              <HeaderProvider>
                <NotificationProvider>
                  {children}
                </NotificationProvider>
              </HeaderProvider>
            </ConfirmProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
