import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/virtual-city-course-demo",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
