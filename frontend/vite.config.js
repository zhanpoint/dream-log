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
        // 采用默认 chunk 命名
        // 保持最简配置，避免对加载顺序产生副作用
        // 优化的代码分割策略 - 支持路由懒加载
        manualChunks(id) {
          // 页面级别仍按路由懒加载拆分
          if (id.includes('src/pages/')) {
            const pageName = id.split('src/pages/')[1].split('.')[0];
            return `page-${pageName.toLowerCase()}`;
          }

          // 仅保留两个明确分组：编辑器与图表
          if (id.includes('@tiptap/') || id.includes('tiptap-extension') || id.includes('prosemirror-') || id.includes('@prosemirror/')) {
            return 'tiptap-vendor';
          }
          if (id.includes('echarts')) {
            return 'charts-vendor';
          }

          // 其余所有第三方依赖（包括 React 生态）统一归入 vendor，避免跨 chunk 顺序/循环问题
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