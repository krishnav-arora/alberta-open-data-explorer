import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  async rewrites() {
    const apiBaseUrl = (process.env.API_BASE_URL ?? "http://localhost:8080").replace(/\/$/, "");
    return [
      {
        source: "/api/:path*",
        destination: `${apiBaseUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
