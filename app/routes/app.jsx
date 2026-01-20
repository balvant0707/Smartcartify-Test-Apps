// app/routes/app.jsx

// 1) Import CSS and dependencies at the top
import "@shopify/polaris/build/esm/styles.css";
import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider as BridgeProvider } from "@shopify/shopify-app-react-router/react";
import { AppProvider as PolarisProvider, Page, Card, Text } from "@shopify/polaris";
import en from "@shopify/polaris/locales/en.json";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

const normalizeShopDomain = (value) => {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  return trimmed.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
};

// 2) Loader (auth check)
export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const headerShop =
    normalizeShopDomain(request.headers.get("x-shopify-shop-domain")) ||
    normalizeShopDomain(request.headers.get("x-shopify-shop")) ||
    normalizeShopDomain(request.headers.get("shop")) ||
    null;
  const resolvedShop = normalizeShopDomain(session?.shop) || headerShop;
  if (resolvedShop) {
    // Ensure the shop row exists/updates whenever the app is opened
    await prisma.shop.upsert({
      where: { shop: resolvedShop },
      update: {
        accessToken: session?.accessToken ?? undefined,
        installed: true,
        uninstalledAt: null,
        updatedAt: new Date(),
      },
      create: {
        shop: resolvedShop,
        accessToken: session?.accessToken ?? null,
        installed: true,
        onboardedAt: new Date(),
      },
    });
  }
  const url = new URL(request.url);
  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
    shop: resolvedShop || null,
    host: url.searchParams.get("host") || null,
  };
};

// 3) Main App component
export default function App() {
  const { apiKey, host } = useLoaderData();

  // Avoid initializing App Bridge without a host parameter; Shopify Admin refuses to load inside an iframe.
  if (!host) {
    return (
      <PolarisProvider i18n={en}>
        <Page title="Open from Shopify admin">
          <Card sectioned>
            <Text as="h2" variant="headingMd">
              Launch this app from Shopify Admin
            </Text>
            <Text tone="subdued">
              Open SmartCartify from your Shopify Admin Apps list so it can pass the host parameter and render embedded.
            </Text>
          </Card>
        </Page>
      </PolarisProvider>
    );
  }

  const rulesHref = host
    ? `/app/rules?host=${encodeURIComponent(host)}&tab=shipping`
    : "/app/rules?tab=shipping";

  return (
    <BridgeProvider embedded apiKey={apiKey} host={host} forceRedirect>
      <PolarisProvider i18n={en}>
        {/* Old-style menu restored */}
        <s-app-nav>
          {/* <s-link href={host ? `/app?host=${encodeURIComponent(host)}` : "/app"}>Dashboard</s-link> */}
          <s-link href={host ? `/app/rules?host=${encodeURIComponent(host)}` : "/app/rules"}>Cart Rule</s-link>
          <s-link href={host ? `/app/pricing?host=${encodeURIComponent(host)}` : "/app/pricing"}>Pricing</s-link>
          <s-link href={host ? `/app/documents?host=${encodeURIComponent(host)}` : "/app/documents"}>Documents</s-link>
          <s-link href={host ? `/app/help?host=${encodeURIComponent(host)}` : "/app/help"}>Help</s-link>
        </s-app-nav>

        {/* Nested routes render here */}
        <Outlet />
      </PolarisProvider>
    </BridgeProvider>
  );
}

// 4) Error boundary (leave same)
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}
export const headers = (headersArgs) => boundary.headers(headersArgs);
