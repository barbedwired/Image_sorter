import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: "/Image_sorter",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
