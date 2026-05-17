import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// React Compiler 1.0 (GA Oct 2025). Compilation target: React 19.
// Per-file opt-in via "use memo" pragma at top of file; all other
// files run unmodified to bound regression surface during F23.5.
const REACT_COMPILER_CONFIG = {
  target: "19" as const,
  compilationMode: "annotation" as const,
};

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
    plugins: [
      react({
        babel: {
          plugins: [["babel-plugin-react-compiler", REACT_COMPILER_CONFIG]],
        },
      }),
    ],
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
      // Manual vendor-chunk splits removed (2026-05-17): with React 19 +
      // next-themes + @tanstack the manual splits created a cross-chunk
      // circular import (vendor ⇄ react-vendor) that surfaced in prod as
      // `Cannot read properties of undefined (reading 'createContext')`.
      // Letting Rollup auto-chunk is safer and only marginally larger.
      chunkSizeWarningLimit: 1500,
    },
  };
});
