import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api/demo-form': {
        target: 'https://n8n-service-zbkb.onrender.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/demo-form/, '/webhook-test/demo-form'),
      },
    },
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
