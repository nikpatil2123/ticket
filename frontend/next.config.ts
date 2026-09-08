import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/v1/:path*',
        destination: process.env.BACKEND_URL || 'http://backend:3001/v1/:path*', // Proxy to Backend
      },
    ];
  },
};

export default nextConfig;
