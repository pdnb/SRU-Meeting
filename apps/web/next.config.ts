import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpile the workspace TypeScript package.
  // Source: https://nextjs.org/docs/15/app/api-reference/config/next-config-js/transpilePackages
  transpilePackages: ["@sru/shared"],
};

export default nextConfig;
