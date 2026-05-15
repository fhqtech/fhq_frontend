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
    build: {
      // S3.3: split heavy deps into separate chunks so the marketing
      // landing + auth bundle stays light. Without this, lazy() splits
      // are defeated because every chunk eager-imports the same
      // heavyweight libs (recharts, three, framer-motion, lucide).
      // Numbers are guidance, not contracts — Vite picks the actual graph.
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (!id.includes("node_modules")) return undefined;
            if (id.includes("react-router") || id.includes("react-dom") || /[/\\]react[/\\]/.test(id)) {
              return "react-vendor";
            }
            if (id.includes("@radix-ui") || id.includes("vaul") || id.includes("cmdk") || id.includes("sonner")) {
              return "ui-vendor";
            }
            if (id.includes("recharts") || id.includes("d3-")) {
              return "charts-vendor";
            }
            if (id.includes("three") || id.includes("@react-three") || id.includes("framer-motion") || id.includes("gsap")) {
              return "anim-vendor";
            }
            if (id.includes("assemblyai")) {
              return "stt-vendor";
            }
            if (id.includes("@tanstack")) {
              return "query-vendor";
            }
            if (id.includes("lucide-react") || id.includes("phosphor-react")) {
              return "icons-vendor";
            }
            return "vendor";
          },
        },
      },
      // Larger chunk-size warning threshold — we deliberately keep some
      // vendor chunks above 500kb. Anything above 1.5mb still warns.
      chunkSizeWarningLimit: 1500,
    },
  };
});
