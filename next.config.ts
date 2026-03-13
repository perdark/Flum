import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Force TypeScript to recheck all files - 2025-03-13 14:00
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
