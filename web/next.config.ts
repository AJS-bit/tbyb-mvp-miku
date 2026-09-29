import type { NextConfig } from "next";

// GitHub Pages 배포 시 PAGES_BASE_PATH=/tbyb-mvp-miku 로 빌드한다. 로컬 기본값은 빈 문자열.
const basePath = (process.env.PAGES_BASE_PATH ?? "").replace(/\/$/, "");

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  basePath,
};

export default nextConfig;
