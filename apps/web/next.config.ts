import type { NextConfig } from "next";
import path from "node:path";

const monorepoRoot = path.resolve(__dirname, "../..");

const nextConfig: NextConfig = {
  outputFileTracingRoot: monorepoRoot,
  transpilePackages: ["@lobby/shared"],
  turbopack: {
    resolveAlias: {
      "@lobby/shared": "../../packages/shared/src/index.ts",
      "@swc/helpers": "../../node_modules/@swc/helpers",
    },
  },
  webpack: (config) => {
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

    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.firebasestorage.app",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
