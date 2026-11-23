import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Caché del router en el navegador: volver a una pantalla ya visitada es inmediato (sin esqueleto) durante este tiempo.
  // Las pantallas que guardan datos llaman a router.refresh(), que la invalida.
  experimental: {
    staleTimes: { dynamic: 30, static: 300 },
  },
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  async rewrites() {
    // Pretty URL for the MCP server: /mcp -> /api/mcp (Streamable HTTP transport)
    return [{ source: "/mcp", destination: "/api/mcp" }];
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
