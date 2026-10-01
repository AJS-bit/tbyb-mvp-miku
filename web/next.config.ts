import type { NextConfig } from "next";

// GitHub Pages 배포 시 PAGES_BASE_PATH=/tbyb-mvp-miku 로 빌드한다. 로컬 기본값은 빈 문자열.
const basePath = (process.env.PAGES_BASE_PATH ?? "").replace(/\/$/, "");

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  basePath,
  // /app/ 은 Next 라우트가 아닌 TETO PWA 라 next/link 대신 <a> 로 연다 — 그때 쓸 basePath
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
