import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the v0 preview iframe host to load Next.js dev resources (HMR, RSC).
  // Without this, client JS is blocked in the preview and buttons appear dead.
  allowedDevOrigins: ["*.vusercontent.net", "*.v0.app", "*.v0.dev"],
};

export default nextConfig;
