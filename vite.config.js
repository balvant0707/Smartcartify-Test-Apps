// vite.config.js
import { defineConfig } from "vite";
import { reactRouter } from "@react-router/dev/vite";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Shopify CLI quirk:
 * Sometimes HOST is set instead of SHOPIFY_APP_URL.
 * This normalizes it so Vite + React Router work correctly.
 */
if (
  process.env.HOST &&
  (!process.env.SHOPIFY_APP_URL ||
    process.env.SHOPIFY_APP_URL === process.env.HOST)
) {
  process.env.SHOPIFY_APP_URL = process.env.HOST;
  delete process.env.HOST;
}

/**
 * Resolve hostname safely
 */
const rawUrl = process.env.SHOPIFY_APP_URL || "http://localhost:3000";
let host = "localhost";

try {
  host = new URL(rawUrl).hostname || "localhost";
} catch {
  host = "localhost";
}

/**
 * Server + HMR config
 */
const listenHost = process.env.VITE_HOST || "0.0.0.0";
const isLocal = host === "localhost" || host === "127.0.0.1";
const PORT = Number(process.env.PORT || 3000);
const FRONTEND_PORT = Number(process.env.FRONTEND_PORT || 8002);

export default defineConfig({
  server: {
    host: listenHost,
    port: PORT,

    // Required for tunnels (cloudflared / ngrok / Shopify CLI)
    allowedHosts: true,

    cors: { preflightContinue: true },

    hmr: isLocal
      ? {
          protocol: "ws",
          host: "localhost",
          port: 64999,
          clientPort: 64999,
        }
      : {
          protocol: "wss",
          host,
          port: FRONTEND_PORT,
          clientPort: 443,
        },

    fs: {
      allow: ["app", "node_modules"],
    },
  },

  plugins: [
    reactRouter(),
    tsconfigPaths(), // ⚠️ MUST be installed (move to dependencies for Vercel)
  ],

  build: {
    assetsInlineLimit: 0,
  },

  optimizeDeps: {
    include: ["@shopify/app-bridge-react"],
  },

  /**
   * Prevent duplicate contexts (Polaris / i18n bugs)
   */
  resolve: {
    dedupe: ["@shopify/polaris", "@shopify/react-i18n"],
  },

  /**
   * Required for SSR compatibility on Vercel
   */
  ssr: {
    noExternal: ["@shopify/polaris", "@shopify/react-i18n"],
  },
});
