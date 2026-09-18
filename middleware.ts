import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|favicon.webp|mcp|\\.well-known).*)",
  ],
};
