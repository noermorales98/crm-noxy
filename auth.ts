import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { prisma } from "@/src/lib/db";
import { verifyPassword } from "@/src/lib/auth-utils";
import { isRoleName, normalizePermissions } from "@/src/lib/permissions";
import { pickInitialMembership, resolveSwitch } from "@/src/lib/organizations";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    // Cambio de organización: el destino se valida contra las membresías reales y el rol/permisos salen de la base.
    async jwt(params) {
      const token = await authConfig.callbacks.jwt(params);
      if (params.trigger === "update") {
        const requested = (params.session as { currentOrganizationId?: unknown } | undefined)?.currentOrganizationId;
        if (requested !== undefined && token.id) {
          try {
            const memberships = await prisma.organizationMember.findMany({ where: { userId: token.id as string } });
            const claims = resolveSwitch(memberships, requested);
            if (claims) {
              token.currentOrganizationId = claims.currentOrganizationId;
              token.role = claims.role;
              token.permissions = claims.permissions;
            }
          } catch (error) {
            console.error("[auth] switch de organización falló", error);
          }
        }
      }
      return token;
    },
  },
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

          const membership = pickInitialMembership(user.organizations);
          const role = isRoleName(membership?.role) ? membership.role : null;

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            currentOrganizationId: membership?.organizationId || null,
            role,
            permissions: normalizePermissions(membership?.permissions, role),
            sexo: user.sexo,
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
