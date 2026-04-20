// app/routes/app.jsx

// 1) Import dependencies at the top
import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider as BridgeProvider } from "@shopify/shopify-app-react-router/react";
import { AppProvider as PolarisProvider, Page, Box, Text } from "@shopify/polaris";
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
    // Fetch store owner contact info from Shopify
    let firstName = null, lastName = null, email = null, contactNumber = null;
    let domain = resolvedShop;
    try {
      const restRes = await fetch(
        `https://${resolvedShop}/admin/api/2025-01/shop.json`,
        { headers: { "X-Shopify-Access-Token": accessToken, "Content-Type": "application/json" } },
      );
      if (restRes.ok) {
        const restBody = await restRes.json();
        const s = restBody?.shop;
        if (s) {
          const nameParts = (s.shop_owner || "").trim().split(/\s+/);
          firstName     = nameParts[0] || null;
          lastName      = nameParts.slice(1).join(" ") || null;
          email         = s.email || null;
          domain        = s.domain || s.myshopify_domain || resolvedShop;
          contactNumber = s.phone || null;
        }
      } else {
        console.error(`[app.jsx loader] REST shop fetch failed: HTTP ${restRes.status}`);
      }
    } catch (err) {
      console.error("[app.jsx loader] REST shop fetch threw:", err?.message ?? String(err));
    }

    try {
      const existing = await prisma.shop.findUnique({ where: { shop: resolvedShop } });

      if (!existing) {
        // New shop — INSERT with all fields
        await prisma.shop.create({
          data: {
            shop: resolvedShop,
            accessToken,
            installed: true,
            appStatus: "active",
            onboardedAt: new Date(),
            firstName,
            lastName,
            email,
            domain,
            contactNumber,
          },
        });
      } else {
        // Existing shop — UPDATE access token + contact fields
        await prisma.shop.update({
          where: { shop: resolvedShop },
          data: {
            accessToken,
            installed: true,
            appStatus: "active",
            ...(firstName  ? { firstName }  : {}),
            ...(lastName   ? { lastName }   : {}),
            ...(email      ? { email }      : {}),
            ...(domain     ? { domain }     : {}),
            ...(contactNumber ? { contactNumber } : {}),
          },
        });
      }
    } catch (err) {
      console.error("[app.jsx loader] shop save failed:", err?.message);
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
          <Box borderWidth="025" borderColor="border" background="bg-surface" borderRadius="0" padding="400">
            <Text as="h2" variant="headingMd">
              Launch this app from Shopify Admin
            </Text>
            <Text tone="subdued">
              Open CartLift: Cart Drawer & Upsell from your Shopify Admin Apps list so it can pass the host parameter and render embedded.
            </Text>
          </Box>
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
