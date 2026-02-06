import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 启用 React 严格模式
  reactStrictMode: true,

  // 图片优化配置
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  // 环境变量
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  },

  // 实验性功能
  experimental: {
    // 启用优化的字体加载
    optimizePackageImports: ["lucide-react", "@radix-ui/react-icons"],
  },
};

export default nextConfig;
