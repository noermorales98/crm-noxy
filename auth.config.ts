import type { NextAuthConfig } from "next-auth";

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

      const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");
      const isPublicPage = pathname.startsWith("/form/") || pathname.startsWith("/schedule/") || pathname.startsWith("/book/") || pathname.startsWith("/docs/") || pathname.startsWith("/cotizar/");

      if (isAuthPage) {
        if (isLoggedIn) return Response.redirect(new URL("/", nextUrl));
        return true;
      }

      if (isPublicPage) return true;

      if (!isLoggedIn) return false;
      return true;
    },
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.currentOrganizationId = (user as any).currentOrganizationId;
      }
      if (trigger === "update" && session?.currentOrganizationId) {
        token.currentOrganizationId = session.currentOrganizationId;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session as any).currentOrganizationId = token.currentOrganizationId as string;
      }
      return session;
    },
  },
  session: { strategy: "jwt" },
} satisfies NextAuthConfig;
