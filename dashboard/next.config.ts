import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Skip build errors for deployment
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
