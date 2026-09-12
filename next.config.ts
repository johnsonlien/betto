import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev server blocks cross-origin requests to dev resources (HMR socket,
  // JS chunks) by default — without this, loading the app from a LAN IP
  // instead of localhost silently breaks hydration (page renders, nothing
  // is interactive). Add every LAN IP you actually load the app from here.
  allowedDevOrigins: ["192.168.50.174"],
};

export default nextConfig;
