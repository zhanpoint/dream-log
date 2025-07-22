import path from "path";
import { fileURLToPath } from "url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// 获取当前文件的目录路径
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        timeout: 10000,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
        changeOrigin: true,
        secure: false,
        timeout: 10000,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('WebSocket代理错误:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('WebSocket代理请求:', req.method, req.url);
          });
          proxy.on('proxyReqWs', (proxyReq, req, socket) => {
            console.log('WebSocket升级:', req.url);

            // 处理WebSocket连接错误
            socket.on('error', (err) => {
              console.log('WebSocket socket错误:', err);
            });

            proxyReq.on('error', (err) => {
              console.log('WebSocket proxyReq错误:', err);
            });
          });
        },
      }
    },
    // HMR配置 - 通过WebSocket实现实时模块热替换，无需刷新页面即可更新变化的模块
    hmr: {
      protocol: 'ws',    // WebSocket协议
      host: 'localhost', // HMR服务主机
      port: 5173,        // 明确指定HMR端口
    }
  }
});