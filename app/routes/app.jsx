// app/routes/app.jsx

// 1) Import dependencies at the top
import { Outlet, useFetchers, useLoaderData, useNavigation, useRouteError } from "react-router";
import { useEffect, useRef, useState } from "react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider as BridgeProvider } from "@shopify/shopify-app-react-router/react";
import {
  AppProvider as PolarisProvider,
  Page,
  Box,
  Frame,
  InlineStack,
  Spinner,
  Text,
  Toast,
} from "@shopify/polaris";
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
  border-radius: 14px;
  --pc-shadow-bevel-border-radius: 14px;
  --pc-shadow-bevel-border-radius-xs: 14px;
  --pc-shadow-bevel-border-radius-sm: 14px;
  --pc-shadow-bevel-border-radius-md: 14px;
  --pc-shadow-bevel-border-radius-lg: 14px;
  --pc-shadow-bevel-border-radius-xl: 14px;
  --pc-box-border-radius: 14px ;
}

.global-save-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(48, 48, 48, 0.28);
  pointer-events: auto;
}

.global-save-overlay__panel {
  background: #ffffff;
  border: 1px solid #dcdfe4;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
  padding: 18px 22px;
  min-width: 260px;
}
`;

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH"]);

function isMutationMethod(method) {
  return MUTATION_METHODS.has(String(method || "").toUpperCase());
}

function SaveConfigurationFeedback() {
  const navigation = useNavigation();
  const fetchers = useFetchers();
  const wasSavingRef = useRef(false);
  const [toastActive, setToastActive] = useState(false);

  const navigationSaving =
    navigation.state !== "idle" && isMutationMethod(navigation.formMethod);
  const fetcherSaving = fetchers.some(
    (fetcher) => fetcher.state !== "idle" && isMutationMethod(fetcher.formMethod),
  );
  const isSaving = navigationSaving || fetcherSaving;

  useEffect(() => {
    if (isSaving) {
      wasSavingRef.current = true;
      setToastActive(false);
      return undefined;
    }

    if (!wasSavingRef.current) return undefined;

    wasSavingRef.current = false;
    setToastActive(true);
    return undefined;
  }, [isSaving]);

  const toastMarkup = toastActive ? (
    <Toast content="Configuration saved" onDismiss={() => setToastActive(false)} />
  ) : null;

  return (
    <>
      {isSaving ? (
        <div className="global-save-overlay" role="status" aria-live="polite">
          <div className="global-save-overlay__panel">
            <InlineStack gap="300" blockAlign="center" align="center" wrap={false}>
              <Spinner accessibilityLabel="Saving configuration" size="small" />
              <Text as="span" variant="bodyMd" fontWeight="semibold">
                Saving configuration...
              </Text>
            </InlineStack>
          </div>
        </div>
      ) : null}
      {toastMarkup}
    </>
  );
}

// 2) Loader (auth check)
export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const resolvedShop = normalizeShopDomain(session?.shop);
  const accessToken = session?.accessToken || null;

  if (resolvedShop && accessToken) {
    // Fetch store owner contact info from Shopify
    let firstName = null, lastName = null, name = null, ownerName = null, email = null, contactNumber = null;
    let phone = null, city = null, country = null, currency = null;
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
          firstName = nameParts[0] || null;
          lastName = nameParts.slice(1).join(" ") || null;
          name = s.name || null;
          ownerName = s.shop_owner || [firstName, lastName].filter(Boolean).join(" ") || null;
          email = s.email || null;
          domain = s.domain || s.myshopify_domain || resolvedShop;
          contactNumber = s.phone || null;
          phone = s.phone || null;
          city = s.city || null;
          country = s.country_name || s.country || s.country_code || null;
          currency = s.currency || null;
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
            status: "installed",
            onboardedAt: new Date(),
            firstName,
            lastName,
            name,
            ownerName,
            email,
            domain,
            contactNumber,
            phone,
            city,
            country,
            currency,
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
            status: "installed",
            firstName: firstName ?? existing.firstName,
            lastName: lastName ?? existing.lastName,
            name: name ?? existing.name,
            ownerName: ownerName ?? existing.ownerName,
            email: email ?? existing.email,
            domain: domain ?? existing.domain,
            contactNumber: contactNumber ?? existing.contactNumber,
            phone: phone ?? existing.phone,
            city: city ?? existing.city,
            country: country ?? existing.country,
            currency: currency ?? existing.currency,
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
        <Frame>
          <ui-nav-menu>
            {/* <a href={host ? `/app?host=${encodeURIComponent(host)}` : "/app"}>Dashboard</a> */}
            <a href={host ? `/app/campaigns?host=${encodeURIComponent(host)}` : "/app/campaigns"}>Create Campaign</a>
            <a href={host ? `/app/my-campaigns?host=${encodeURIComponent(host)}` : "/app/my-campaigns"}>My Campaigns</a>
            <a href={host ? `/app/cartbar?host=${encodeURIComponent(host)}` : "/app/cartbar"}>Add to Cart Bar</a>
            <a href={host ? `/app/customize-preview?host=${encodeURIComponent(host)}` : "/app/customize-preview"}>Customize & Preview</a>
            <a href={analyticsHref}>Analytics</a>
            <a href={docsHref}>Documents</a>
          </ui-nav-menu>

          <SaveConfigurationFeedback />

          {/* Nested routes render here */}
          <Outlet />
        </Frame>
      </PolarisProvider>
    </BridgeProvider>
  );
}

// 4) Error boundary (leave same)
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}
export const headers = (headersArgs) => boundary.headers(headersArgs);
