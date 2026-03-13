import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

// Force unique build ID to bypass Vercel cache - 2025-03-13
export const generateBuildId = async () => {
  return `build-${Date.now()}`;
};

export default nextConfig;
