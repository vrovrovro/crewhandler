import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@acme/shared", "@acme/ui"],
};

export default nextConfig;
