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
import { encryptAccessToken } from "../lib/accessTokenCrypto.server.js";
import { normalizeShopDomain } from "../lib/shopUtils.server.js";

// 2) Loader (auth check)
export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const encryptedAccessToken = encryptAccessToken(session?.accessToken);
  const headerShop =
    normalizeShopDomain(request.headers.get("x-shopify-shop-domain")) ||
    normalizeShopDomain(request.headers.get("x-shopify-shop")) ||
    normalizeShopDomain(request.headers.get("shop")) ||
    null;
  const resolvedShop = normalizeShopDomain(session?.shop) || headerShop;
  if (resolvedShop) {
    // Ensure the shop row exists/updates whenever the app is opened
    let shopRow = null;
    try {
      shopRow = await prisma.shop.upsert({
        where: { shop: resolvedShop },
        update: {
          accessToken: encryptedAccessToken ?? undefined,
          installed: true,
          uninstalledAt: null,
          appStatus: "active",
          updatedAt: new Date(),
        },
        create: {
          shop: resolvedShop,
          accessToken: encryptedAccessToken ?? null,
          installed: true,
          appStatus: "active",
          onboardedAt: new Date(),
        },
      });
    } catch (err) {
      console.error("[app.jsx loader] prisma shop upsert failed:", err?.message);
    }

    // Populate contact fields if they are missing (new install or afterAuth did not complete)
    if (shopRow && !shopRow.email && admin) {
      try {
        const response = await admin.graphql(
          `query LoaderShopInfo {
            shop {
              name
              email
              phone
              primaryDomain { host }
              shopOwnerName
            }
          }`,
        );
        const data = await response.json();
        const info = data?.data?.shop || {};
        const ownerParts = (info.shopOwnerName || "").trim().split(/\s+/);
        await prisma.shop.update({
          where: { shop: resolvedShop },
          data: {
            firstName: ownerParts[0] || null,
            lastName: ownerParts.slice(1).join(" ") || null,
            email: info.email || null,
            domain: info.primaryDomain?.host || resolvedShop,
            contactNumber: info.phone || null,
          },
        });
      } catch (err) {
        console.error("[app.jsx loader] shop contact fields update failed:", err?.message);
      }
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
