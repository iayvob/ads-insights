/** @type {import('next').NextConfig} */
import path from "path";
import { createRequire } from "module";
const require_ = createRequire(import.meta.url);

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ["@prisma/client"],
  outputFileTracingExcludes: {
    "*": [
      "node_modules/@swc/core-linux-x64-gnu",
      "node_modules/@swc/core-linux-x64-musl",
      "node_modules/@esbuild/linux-x64",
      "node_modules/prisma/**/*.dat",
      "node_modules/prisma/libquery_engine-*",
    ],
  },
  serverRuntimeConfig: {
    maxDuration: 60,
  },
  images: {
    domains: [
      "graph.facebook.com",
      "scontent.cdninstagram.com",
      "pbs.twimg.com",
    ],
    remotePatterns: [
      { protocol: "https", hostname: "**.facebook.com" },
      { protocol: "https", hostname: "**.instagram.com" },
      { protocol: "https", hostname: "**.twimg.com" },
    ],
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [{ source: "/login", destination: "/", permanent: true }];
  },
  output: "standalone",
  webpack(config, { dev }) {
    if (dev) {
      config.cache = { type: "memory" };
    }
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias["@"] = path.resolve(process.cwd(), "src");
    config.resolve.fallback = config.resolve.fallback || {};
    config.resolve.fallback["punycode"] = require_.resolve("punycode/");
    return config;
  },
};

export default nextConfig;