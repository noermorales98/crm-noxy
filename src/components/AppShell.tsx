"use client";

import { usePathname } from "next/navigation";
import DashboardShell from "@/src/components/DashboardShell";

const PUBLIC_PREFIXES = ["/login", "/register", "/book/", "/form/", "/schedule/", "/docs/", "/cotizar/", "/calendario/"];

function isPublicRoute(pathname: string): boolean {
  if (pathname === "/login" || pathname === "/register") return true;
  return PUBLIC_PREFIXES.some((prefix) => prefix.endsWith("/") && pathname.startsWith(prefix));
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (isPublicRoute(pathname)) {
    return <>{children}</>;
  }

  return <DashboardShell>{children}</DashboardShell>;
}
