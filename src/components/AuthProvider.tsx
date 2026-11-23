"use client";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";

/** Recibe la sesión ya resuelta por el servidor: así `useSession` no pasa por «cargando» y el tema sale bien desde el primer pintado. */
export default function AuthProvider({ children, session }: { children: React.ReactNode; session?: Session | null }) {
  return <SessionProvider session={session ?? undefined}>{children}</SessionProvider>;
}
