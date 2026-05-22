import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // @ts-ignore - Next.js suggests this config for fixing local CORS issues
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
};

export default nextConfig;
