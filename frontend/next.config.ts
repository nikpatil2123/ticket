import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/v1/:path*',
        destination: 'http://127.0.0.1:3001/v1/:path*', // Proxy to Backend
      },
    ];
  },
};

export default nextConfig;
