import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // React 插件配置
    react({
      // React 19.1.1 优化
      babel: {
        // 支持 React 19 的新特性
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
    },
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
        // 优化的代码分割策略 - 支持路由懒加载
        manualChunks(id) {
          // 将页面组件分离到独立的 chunk
          if (id.includes('src/pages/')) {
            const pageName = id.split('src/pages/')[1].split('.')[0];
            return `page-${pageName.toLowerCase()}`;
          }

          // React 核心库
          if (id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/react-router-dom/')) {
            return 'react-vendor';
          }

          // UI 组件库
          if (id.includes('@radix-ui/') ||
            id.includes('framer-motion') ||
            id.includes('lucide-react')) {
            return 'ui-vendor';
          }

          // 工具库
          if (id.includes('axios') ||
            id.includes('clsx') ||
            id.includes('tailwind-merge') ||
            id.includes('date-fns')) {
            return 'utils';
          }

          // 【修复】完整的编辑器相关依赖分组，避免 TDZ 问题
          if (id.includes('@tiptap/') ||
            id.includes('tiptap-extension') ||
            id.includes('prosemirror-') ||
            id.includes('@prosemirror/')) {
            return 'tiptap-vendor';
          }

          // 图表相关（单独拆分，避免与编辑器混合打包）
          if (id.includes('echarts')) {
            return 'charts-vendor';
          }

          // 其他第三方库
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
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      // 【新增】TipTap 相关依赖预构建，确保正确处理
      '@tiptap/react',
      '@tiptap/starter-kit',
      '@tiptap/extension-image',
      '@tiptap/extension-link',
      '@tiptap/extension-placeholder',
      'tiptap-extension-resize-image'
    ],
    exclude: ['@tailwindcss/vite']
  },
});