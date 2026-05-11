import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const REQUIRED_PROD_ENV = [
  "VITE_API_BASE_URL",
  "VITE_FRONTEND_BASE_URL",
];

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  if (mode === "production") {
    const missing = REQUIRED_PROD_ENV.filter((k) => !env[k]);
    if (missing.length) {
      throw new Error(
        `Production build aborted — missing required env vars: ${missing.join(", ")}. ` +
        `Set them in your CI / hosting platform before building.`
      );
    }
  }
  return {
    server: {
      host: "::",
      port: 8080,
      proxy: {
        // Demo form now routes to FastAPI backend (Phase 6: N8N removed).
        '/api/demo-form': {
          target: 'http://localhost:8082',
          changeOrigin: true,
        },
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    esbuild: mode === "production" ? {
      // Strip console.log/debug/info from production bundles. Keep warn/error
      // so customer-facing issues still surface in browser DevTools.
      pure: ["console.log", "console.debug", "console.info"],
      drop: ["debugger"],
    } : undefined,
  };
});
