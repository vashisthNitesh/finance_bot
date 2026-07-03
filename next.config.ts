import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow local IP access during development
  experimental: {
    // next.config.js tells us to use allowedDevOrigins
  },
  // @ts-ignore
  allowedDevOrigins: ['192.168.1.3', '127.0.0.1', 'localhost'],
};

export default nextConfig;
