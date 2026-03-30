import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    currentOrganizationId?: string | null;
    user: {
      id: string;
    } & DefaultSession["user"]
  }

  interface User {
    currentOrganizationId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    currentOrganizationId?: string | null;
  }
}
