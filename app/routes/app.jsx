// app/routes/app.jsx

// 1) Import dependencies at the top
import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider as BridgeProvider } from "@shopify/shopify-app-react-router/react";
import { AppProvider as PolarisProvider, Page, Box, Text } from "@shopify/polaris";
import en from "@shopify/polaris/locales/en.json";
import { authenticate, apiVersion } from "../shopify.server";
import { normalizeShopDomain } from "../lib/shopUtils.server.js";
import prisma from "../db.server";

const GLOBAL_POLARIS_RADIUS_CSS = `
:root,
.Polaris-AppProvider {
  --p-border-radius-050: 4px;
  --p-border-radius-100: 4px;
  --p-border-radius-150: 4px;
  --p-border-radius-200: 4px;
  --p-border-radius-300: 4px;
  --p-border-radius-400: 4px;
  --p-border-radius-500: 4px;
  --p-border-radius-750: 4px;
}

.Polaris-Layout__Section,
.Polaris-Card,
.Polaris-LegacyCard,
.Polaris-Card__Section,
.Polaris-LegacyCard__Section,
.Polaris-Box,
.Polaris-Page__Section,
.Polaris-Page-Section,
.Polaris-Modal-Dialog__Modal,
.Polaris-TextField__Input,
.Polaris-TextField__Backdrop,
.Polaris-Select__Input,
.Polaris-Select__Backdrop,
.Polaris-ChoiceList,
.Polaris-OptionList,
.Polaris-Banner,
.Polaris-Frame-Toast,
.Polaris-Popover,
.Polaris-Popover__Pane,
.Polaris-ActionList,
.Polaris-ResourceList,
.Polaris-IndexTable,
.Polaris-DataTable,
.Polaris-Tabs,
.Polaris-CalloutCard,
.Polaris-EmptyState,
.Polaris-ShadowBevel,
.Polaris-ShadowBevel::before,
[class^="Polaris-ShadowBevel"],
[class^="Polaris-ShadowBevel"]::before,
[class*=" Polaris-ShadowBevel"],
[class*=" Polaris-ShadowBevel"]::before,
.Polaris-Bleed,
.Polaris-InlineGrid,
s-box,
s-box::part(base),
s-box::part(container),
s-card,
s-card::part(base),
s-card::part(container),
s-section,
s-section::part(base),
s-section::part(root),
s-section::part(section),
s-section::part(container),
s-section::part(content) {
  border-radius: 4px !important;
  --pc-shadow-bevel-border-radius: 4px !important;
  --pc-shadow-bevel-border-radius-xs: 4px !important;
  --pc-shadow-bevel-border-radius-sm: 4px !important;
  --pc-shadow-bevel-border-radius-md: 4px !important;
  --pc-shadow-bevel-border-radius-lg: 4px !important;
  --pc-shadow-bevel-border-radius-xl: 4px !important;
  --pc-box-border-radius: 4px !important;
}

.Polaris-Button,
.Polaris-Button::before,
.Polaris-Button::after,
s-button,
s-button::part(base),
s-button::part(button) {
  border-radius: 4px !important;
}
`;

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
        `https://${resolvedShop}/admin/api/${apiVersion}/shop.json`,
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
        // Existing shop — UPDATE access token + contact fields (include nulls to clear stale values)
        await prisma.shop.update({
          where: { shop: resolvedShop },
          data: {
            accessToken,
            installed: true,
            appStatus: "active",
            firstName:     firstName     ?? existing.firstName,
            lastName:      lastName      ?? existing.lastName,
            email:         email         ?? existing.email,
            domain:        domain        ?? existing.domain,
            contactNumber: contactNumber ?? existing.contactNumber,
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
        <style>{GLOBAL_POLARIS_RADIUS_CSS}</style>
        <Page title="Open from Shopify admin">
          <Box borderWidth="025" borderColor="border" background="bg-surface" borderRadius="100" padding="400">
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
  const analyticsHref = host
    ? `/app/analytics?host=${encodeURIComponent(host)}`
    : "/app/analytics";

  return (
    <BridgeProvider embedded apiKey={apiKey} host={host} forceRedirect>
      <PolarisProvider i18n={en}>
        <style>{GLOBAL_POLARIS_RADIUS_CSS}</style>
        {/* Old-style menu restored */}
        <s-app-nav>
          {/* <s-link href={host ? `/app?host=${encodeURIComponent(host)}` : "/app"}>Dashboard</s-link> */}
          <s-link href={host ? `/app/rules?host=${encodeURIComponent(host)}` : "/app/rules"}>Cart Rule</s-link>
          <s-link href={host ? `/app/campaigns?host=${encodeURIComponent(host)}` : "/app/campaigns"}>Create Campaign</s-link>
          <s-link href={host ? `/app/my-rules?host=${encodeURIComponent(host)}` : "/app/my-rules"}>My Rules</s-link>
          <s-link href={host ? `/app/cartbar?host=${encodeURIComponent(host)}` : "/app/cartbar"}>Add to Cart Bar</s-link>
          <s-link href={analyticsHref}>Analytics</s-link>
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
