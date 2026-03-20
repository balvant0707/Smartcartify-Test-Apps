// app/routes/app.jsx

// 1) Import CSS and dependencies at the top
import "@shopify/polaris/build/esm/styles.css";
import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider as BridgeProvider } from "@shopify/shopify-app-react-router/react";
import { AppProvider as PolarisProvider, Page, Card, Text } from "@shopify/polaris";
import en from "@shopify/polaris/locales/en.json";
import { authenticate } from "../shopify.server";
import { normalizeShopDomain } from "../lib/shopUtils.server.js";
import prisma from "../db.server";

// 2) Loader (auth check)
export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const resolvedShop = normalizeShopDomain(session?.shop);
  const accessToken = session?.accessToken || null;

  if (resolvedShop && accessToken) {
    const existing = await prisma.shop.findUnique({ where: { shop: resolvedShop } });

    if (!existing) {
      // New shop — simple INSERT
      await prisma.shop.create({
        data: {
          shop: resolvedShop,
          accessToken,
          installed: true,
          appStatus: "active",
          onboardedAt: new Date(),
        },
      }).catch((err) => console.error("[app.jsx loader] shop create failed:", err?.message));
    } else {
      // Existing shop — UPDATE access token only
      await prisma.shop.update({
        where: { shop: resolvedShop },
        data: { accessToken },
      }).catch((err) => console.error("[app.jsx loader] shop update failed:", err?.message));
    }
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
              Open CartLift: Cart Drawer & Upsell from your Shopify Admin Apps list so it can pass the host parameter and render embedded.
            </Text>
          </Card>
        </Page>
      </PolarisProvider>
    );
  }

  const docsHref = host
    ? `/app/documents?host=${encodeURIComponent(host)}`
    : "/app/documents";

  return (
    <BridgeProvider embedded apiKey={apiKey} host={host} forceRedirect>
      <PolarisProvider i18n={en}>
        {/* Old-style menu restored */}
        <s-app-nav>
          {/* <s-link href={host ? `/app?host=${encodeURIComponent(host)}` : "/app"}>Dashboard</s-link> */}
          <s-link href={host ? `/app/rules?host=${encodeURIComponent(host)}` : "/app/rules"}>Cart Rule</s-link>
          <s-link href={docsHref}>Documents</s-link>
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
