import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@excalidraw/excalidraw"],
  reactStrictMode: false,
};

export default nextConfig;
