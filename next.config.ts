import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Imagine de container in loc de functii Vercel. `standalone` scrie in
   * `.next/standalone` un server cu doar pachetele pe care le atinge codul,
   * deci imaginea nu duce cu ea tot `node_modules`.
   */
  output: "standalone",
};

export default nextConfig;
