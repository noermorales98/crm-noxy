import type { Metadata } from "next";
import { Inter } from "next/font/google";
import AuthProvider from "@/src/components/AuthProvider";
import { ToastProvider } from "@/src/context/ToastContext";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Noxy CRM Dashboard",
  description: "A modern CRM dashboard interface",
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
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
