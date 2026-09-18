"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import {
  canManageTeam,
  firstAllowedPath,
  hasPermission,
  resolveRouteAccess,
  type ModulePermissions,
  type RoleName,
} from "@/src/lib/permissions";

export default function PermissionGate({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const [allowed, setAllowed] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    const role = session?.role as RoleName | undefined;
    const permissions = session?.permissions as ModulePermissions | undefined;
    const access = resolveRouteAccess(pathname);

    if (access.kind === "public" || access.kind === "auth") {
      setAllowed(true);
      return;
    }
    if (access.kind === "team" && !canManageTeam(role)) {
      setAllowed(false);
      router.replace(firstAllowedPath(role, permissions));
      return;
    }
    if (access.kind === "module" && !hasPermission(role, permissions, access.module)) {
      setAllowed(false);
      router.replace(firstAllowedPath(role, permissions));
      return;
    }
    setAllowed(true);
  }, [pathname, router, session, status]);

  if (status === "loading" || !allowed) return null;
  return <>{children}</>;
}
