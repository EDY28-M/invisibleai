import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";

const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(async ({ command }) => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  clearScreen: false,

  build: {
    // Only emit sourcemaps for the dev server. Production bundles ship to users,
    // and this is a privacy-first app — don't expose the original source there.
    sourcemap: command === "serve",
    rollupOptions: {
      output: {
        // Keep the React runtime in its own chunk, separate from app code, so the
        // main entry chunk stays smaller and parses faster on launch.
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
        },
      },
    },
  },

  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {

      ignored: ["**/src-tauri/**"],
    },
  },
}));
