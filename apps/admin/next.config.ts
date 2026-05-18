import type { NextConfig } from "next";
import path from "node:path";

const monorepoRoot = path.resolve(__dirname, "../..");

const nextConfig: NextConfig = {
  outputFileTracingRoot: monorepoRoot,
  transpilePackages: ["@lobby/shared"],
  /** Next 16 defaults to Turbopack; we use webpack in dev/build scripts. */
  turbopack: {},
  webpack: (config, { dev }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@lobby/shared": path.resolve(monorepoRoot, "packages/shared/src/index.ts"),
      "@swc/helpers": path.resolve(monorepoRoot, "node_modules/@swc/helpers"),
    };
    config.resolve.modules = [
      path.resolve(__dirname, "node_modules"),
      path.resolve(monorepoRoot, "node_modules"),
      ...(Array.isArray(config.resolve.modules) ? config.resolve.modules : ["node_modules"]),
    ];
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        aggregateTimeout: 400,
      };
    }
    return config;
  },
};

export default nextConfig;
