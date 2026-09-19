import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|favicon.webp|icon-192.png|icon-512.png|apple-touch-icon.png|sw.js|manifest.webmanifest|mcp|\\.well-known).*)",
  ],
};
