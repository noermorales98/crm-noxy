import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { prisma } from "@/src/lib/db";
import { verifyPassword } from "@/src/lib/auth-utils";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
            include: {
              organizations: {
                include: {
                  organization: true,
                },
              },
            },
          });

          if (!user) {
            return null;
          }

          const isPasswordValid = await verifyPassword(
            credentials.password as string,
            user.passwordHash,
          );

          if (!isPasswordValid) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            currentOrganizationId: user.organizations[0]?.organizationId || null,
          };
        } catch (error) {
          // Avoid opaque 500s when Hostinger hits max_connections_per_hour
          console.error("[auth] authorize failed", error);
          return null;
        }
      },
    }),
  ],
});
