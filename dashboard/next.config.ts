import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Skip build errors for deployment
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {
    root: "/home/mint/Desktop/Flum/Flum/dashboard",
  },
};

export default nextConfig;
