import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  async rewrites() {
    // Pretty URL for the MCP server: /mcp -> /api/mcp (Streamable HTTP transport)
    return [{ source: "/mcp", destination: "/api/mcp" }];
  },
};

export default nextConfig;
