import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@acme/ui", "@acme/shared", "@acme/config"],
};

export default nextConfig;
