import NextAuth, { DefaultSession } from "next-auth"
import type { ModulePermissions, RoleName } from "@/src/lib/permissions"
import type { Sexo } from "@/src/lib/user-sexo"

declare module "next-auth" {
  interface Session {
    currentOrganizationId?: string | null;
    role?: RoleName | null;
    permissions?: ModulePermissions;
    user: {
      id: string;
      sexo?: Sexo;
    } & DefaultSession["user"]
  }

  interface User {
    currentOrganizationId?: string | null;
    role?: RoleName | null;
    permissions?: ModulePermissions;
    sexo?: Sexo;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    currentOrganizationId?: string | null;
    role?: RoleName | null;
    permissions?: ModulePermissions;
    sexo?: Sexo;
  }
}
