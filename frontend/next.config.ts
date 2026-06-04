import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // @ts-ignore - Next.js suggests this config for fixing local CORS issues
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  webpack: (config) => {
    config.watchOptions = {
      poll: 800,
      aggregateTimeout: 300,
      ignored: ['**/node_modules', '**/.next'],
    }
    return config
  },
};

export default nextConfig;
