import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 开发阶段关闭严格模式，避免 effect 双重执行导致 SSE 重复连接和性能下降
  reactStrictMode: false,

  // 图片优化：优先使用 WebP/AVIF，减少带宽，加快加载
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    // 图片缓存 7 天（默认 60s 太短）
    minimumCacheTTL: 604800,
  },

  // 环境变量
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  },

  // 实验性功能
  experimental: {
    // 优化大型包的 tree-shaking，显著减少编译时间和包体积
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-icons",
      "@radix-ui/react-dialog",
      "@radix-ui/react-popover",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "framer-motion",
      "date-fns",
      "echarts",
      "echarts-for-react",
    ],
  },

  // 编译器优化：移除 console.log（生产环境）
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
};

export default nextConfig;
