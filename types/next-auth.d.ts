import NextAuth, { DefaultSession } from "next-auth"
import type { ModulePermissions, RoleName } from "@/src/lib/permissions"

declare module "next-auth" {
  interface Session {
    currentOrganizationId?: string | null;
    role?: RoleName | null;
    permissions?: ModulePermissions;
    user: {
      id: string;
    } & DefaultSession["user"]
  }

  interface User {
    currentOrganizationId?: string | null;
    role?: RoleName | null;
    permissions?: ModulePermissions;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    currentOrganizationId?: string | null;
    role?: RoleName | null;
    permissions?: ModulePermissions;
  }
}
