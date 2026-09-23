import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const proxy = {
    "/api": {
      target:
        env.HYPERCLIP_PROXY_TARGET ||
        "http://127.0.0.1:8000",

      changeOrigin: true,
      timeout: 10 * 60 * 1000,
      proxyTimeout: 10 * 60 * 1000,
    },
  };

  return {
    plugins: [react()],

    server: {
      port: 5173,
      strictPort: true,
      proxy,
    },

    preview: {
      port: 5173,
      strictPort: true,
      proxy,
    },
  };
});