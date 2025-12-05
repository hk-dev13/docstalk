import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@docstalk/ui"],
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: `${
          process.env.BACKEND_URL || "http://localhost:3001"
        }/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
