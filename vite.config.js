// vite.config.js
import { defineConfig } from "vite";
import { reactRouter } from "@react-router/dev/vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Map HOST -> SHOPIFY_APP_URL (Shopify CLI quirk)
if (
  process.env.HOST &&
  (!process.env.SHOPIFY_APP_URL ||
    process.env.SHOPIFY_APP_URL === process.env.HOST)
) {
  process.env.SHOPIFY_APP_URL = process.env.HOST;
  delete process.env.HOST;
}

const rawUrl = process.env.SHOPIFY_APP_URL || "http://localhost:3000";
let host = "localhost";
try {
  host = new URL(rawUrl).hostname || "localhost";
} catch (_) {
  host = "localhost";
}
const listenHost = process.env.VITE_HOST || "0.0.0.0";

// Use friendly defaults for local dev
const isLocal = host === "localhost" || host === "127.0.0.1";
const PORT = Number(process.env.PORT || 3000);
const FRONTEND_PORT = Number(process.env.FRONTEND_PORT || 8002);

export default defineConfig({
  server: {
    host: listenHost, // allow tunneling (cloudflared/ngrok)
    allowedHosts: true, // accept tunnel hosts (trycloudflare/ngrok) without explicit whitelist
    port: PORT,
    cors: { preflightContinue: true },
    hmr: isLocal
      ? { protocol: "ws", host: "localhost", port: 64999, clientPort: 64999 }
      : { protocol: "wss", host, port: FRONTEND_PORT, clientPort: 443 },
    fs: { allow: ["app", "node_modules"] },
  },

  plugins: [reactRouter(), tsconfigPaths()],

  build: {
    assetsInlineLimit: 0,
  },

  optimizeDeps: {
    include: ["@shopify/app-bridge-react"],
  },

  // Prevent duplicate contexts causing Polaris i18n errors
  resolve: {
    dedupe: ["@shopify/polaris", "@shopify/react-i18n"],
  },

  // Bundle Polaris for SSR to avoid ESM/CJS mismatches
  ssr: {
    noExternal: ["@shopify/polaris", "@shopify/react-i18n"],
  },
});
