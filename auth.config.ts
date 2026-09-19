import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";
import {
  canManageTeam,
  firstAllowedPath,
  hasPermission,
  isPublicApiPath,
  resolveRouteAccess,
  type ModulePermissions,
  type RoleName,
} from "@/src/lib/permissions";
import { parseSexo } from "@/src/lib/user-sexo";

export const authConfig = {
  secret: process.env.AUTH_SECRET,
  providers: [],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;
      const isApi = pathname.startsWith("/api/");

      if (pathname.startsWith("/register")) {
        return NextResponse.redirect(new URL("/login", nextUrl));
      }

      if (isApi && isPublicApiPath(pathname)) return true;

      if (pathname.startsWith("/login")) {
        if (isLoggedIn) return Response.redirect(new URL("/", nextUrl));
        return true;
      }

      const access = resolveRouteAccess(pathname);
      if (access.kind === "public") return true;

      if (!isLoggedIn) {
        if (isApi) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        return false;
      }

      const role = (auth as { role?: RoleName | null }).role;
      const permissions = (auth as { permissions?: ModulePermissions }).permissions;

      if (access.kind === "team" && !canManageTeam(role)) {
        if (isApi) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
        return NextResponse.redirect(new URL(firstAllowedPath(role, permissions), nextUrl));
      }

      if (access.kind === "module" && !hasPermission(role, permissions, access.module)) {
        if (isApi) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
        return NextResponse.redirect(new URL(firstAllowedPath(role, permissions), nextUrl));
      }

      return true;
    },
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.currentOrganizationId = user.currentOrganizationId;
        token.role = user.role;
        token.permissions = user.permissions;
        token.sexo = parseSexo(user.sexo);
      }
      if (trigger === "update" && session) {
        if (session.currentOrganizationId) token.currentOrganizationId = session.currentOrganizationId as string;
        if (session.role) token.role = session.role as RoleName;
        if (session.permissions) token.permissions = session.permissions as ModulePermissions;
        if (session.user?.sexo) token.sexo = parseSexo(session.user.sexo);
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.currentOrganizationId = token.currentOrganizationId as string | null;
        session.role = (token.role as RoleName | null | undefined) ?? null;
        session.permissions = token.permissions as ModulePermissions | undefined;
        session.user.sexo = parseSexo(token.sexo);
      }
      return session;
    },
  },
  session: { strategy: "jwt" },
} satisfies NextAuthConfig;
