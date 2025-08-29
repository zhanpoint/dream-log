import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // 【修复】React 插件配置，确保兼容性
    react({
      // React 19 兼容性配置
      jsxRuntime: 'automatic',
      jsxImportSource: 'react',
      babel: {
        parserOpts: {
          plugins: ['jsx']
        }
      }
    }),
    // Tailwind CSS 4 Vite 插件 - 需要在 React 之后
    tailwindcss(),
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // 【修复】确保 React 模块正确解析，解决 createContext undefined 问题
      "react": path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
    },
    // 【新增】确保正确解析 ES 模块，防止重复导入
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },

  server: {
    port: 5173,
    strictPort: false,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'ws://127.0.0.1:8000',
        ws: true,
        changeOrigin: true,
      }
    }
  },

  build: {
    // 构建优化 - 针对路由懒加载优化
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        // 【修复】确保 React 相关 chunk 优先加载
        chunkFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'react-vendor') {
            return 'assets/[name]-[hash].js';
          }
          return 'assets/[name]-[hash].js';
        },
        // 优化的代码分割策略 - 支持路由懒加载
        manualChunks(id) {
          // 将页面组件分离到独立的 chunk
          if (id.includes('src/pages/')) {
            const pageName = id.split('src/pages/')[1].split('.')[0];
            return `page-${pageName.toLowerCase()}`;
          }

          // 【修复】React 生态系统 - 确保所有 React 相关库在同一 chunk
          if (id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/react-router-dom/') ||
            id.includes('@radix-ui/') ||
            id.includes('framer-motion') ||
            id.includes('lucide-react') ||
            id.includes('react-hook-form') ||
            id.includes('react-i18next') ||
            id.includes('react-markdown') ||
            id.includes('react-day-picker') ||
            id.includes('react-window') ||
            id.includes('next-themes') ||
            id.includes('sonner')) {
            return 'react-vendor';
          }

          // 【修复】编辑器相关依赖 - 独立分组
          if (id.includes('@tiptap/') ||
            id.includes('tiptap-extension') ||
            id.includes('prosemirror-') ||
            id.includes('@prosemirror/')) {
            return 'tiptap-vendor';
          }

          // 图表相关库
          if (id.includes('echarts')) {
            return 'charts-vendor';
          }

          // 纯工具库（不依赖 React）
          if (id.includes('axios') ||
            id.includes('clsx') ||
            id.includes('tailwind-merge') ||
            id.includes('date-fns') ||
            id.includes('uuid') ||
            id.includes('zod') ||
            id.includes('i18next') ||
            id.includes('class-variance-authority')) {
            return 'utils';
          }

          // 表单和验证相关
          if (id.includes('formik') ||
            id.includes('@hookform/resolvers')) {
            return 'form-vendor';
          }

          // 【关键修复】其他第三方库 - 严格控制范围
          if (id.includes('node_modules/')) {
            return 'vendor';
          }
        },
      },
    },
    // 提高构建性能
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1000,
  },

  optimizeDeps: {
    // 【修复】强制预构建关键依赖，确保模块正确加载
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'react-router-dom',
      // TipTap 相关依赖预构建
      '@tiptap/react',
      '@tiptap/starter-kit',
      '@tiptap/extension-image',
      '@tiptap/extension-link',
      '@tiptap/extension-placeholder',
      'tiptap-extension-resize-image'
    ],
    exclude: ['@tailwindcss/vite'],
    // 【新增】强制重新构建依赖，确保与 React 19 兼容
    force: true
  },
});