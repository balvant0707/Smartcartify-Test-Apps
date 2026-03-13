import { boundary } from "@shopify/shopify-app-react-router/server";
import { useLoaderData, useLocation, useRouteError } from "react-router";
import { authenticate, apiVersion } from "../shopify.server";
import { Page, Card, Text } from "@shopify/polaris";

import { Icon } from "@shopify/polaris";
import {
  PaintBrushFlatIcon,
  ShippingLabelIcon,
} from "@shopify/polaris-icons";

const CUSTOM_ICON_CSS = `
.Polaris-Icon,
.Polaris-Icon svg,
.Polaris-Icon__Svg {
  display: block;
  height: 2.25rem !important;
  width: 2.25rem !important;
  max-height: 100%;
  max-width: 100%;
  margin: auto;
  color: #000000;
  fill: #529b2e;
}
details[data-accordion] summary {
  list-style-type: none;
}
details[data-accordion] summary::-webkit-details-marker,
details[data-accordion] summary::marker {
  display: none;
}
.step-indicator span svg {
    fill: #fff;
}
`;

const EMBED_BLOCK_HANDLE = "smart-block"; // ✅ your blocks/smart-block.liquid
const EMBED_TYPE_FRAGMENT = `/blocks/${EMBED_BLOCK_HANDLE}`;

async function getMainThemeId(admin) {
  const res = await admin.graphql(
    `#graphql
    query Themes {
      themes(first: 50) {
        nodes { id role }
      }
    }`
  );
  const json = await res.json();
  const main = (json?.data?.themes?.nodes || []).find((t) => t.role === "MAIN");
  return main?.id || null;
}

/**
 * ✅ BEST RELIABLE METHOD:
 * Read config/settings_data.json via Theme Asset API
 */
async function getSettingsDataViaAssetAPI(admin, themeId) {
  const res = await admin.graphql(
    `#graphql
    query ThemeAsset($id: ID!, $key: String!) {
      theme(id: $id) {
        asset(key: $key) {
          value
        }
      }
    }`,
    {
      variables: {
        id: themeId,
        key: "config/settings_data.json",
      },
    }
  );

  const json = await res.json();
  return json?.data?.theme?.asset?.value ?? null;
}

function getNumericThemeId(themeId) {
  if (typeof themeId !== "string") return null;
  const match = themeId.match(/(\d+)$/);
  return match?.[1] ?? null;
}

async function getSettingsDataViaRestAPI(session, themeId) {
  const themeNumericId = getNumericThemeId(themeId);
  if (!themeNumericId) {
    throw new Error("Theme ID missing numeric value for REST asset request");
  }

  const shop = session?.shop;
  const accessToken = session?.accessToken;
  if (!shop || !accessToken) {
    throw new Error("Missing shop credentials for REST asset request");
  }

  const url = new URL(
    `/admin/api/${apiVersion}/themes/${themeNumericId}/assets.json`,
    `https://${shop}`
  );
  url.searchParams.set("asset[key]", "config/settings_data.json");

  const response = await fetch(url.href, {
    headers: {
      "X-Shopify-Access-Token": accessToken,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `REST asset request failed (${response.status}): ${body || "no body"}`
    );
  }

  const json = await response.json();
  return json?.asset?.value ?? null;
}

async function getSettingsData(admin, session, themeId) {
  try {
    const raw = await getSettingsDataViaAssetAPI(admin, themeId);
    if (raw !== null && raw !== undefined) {
      return raw;
    }
  } catch {
    // Swallow so REST fallback can run.
  }

  return getSettingsDataViaRestAPI(session, themeId);
}

function isMatchingEmbedType(type) {
  return (
    typeof type === "string" &&
    type.includes("shopify://apps/") &&
    type.includes("/blocks/") &&
    type.includes(EMBED_TYPE_FRAGMENT)
  );
}

function isEmbedBlockEnabled(block) {
  if (!block || typeof block !== "object") return false;
  if (block.disabled === true) return false;
  if (block.settings && typeof block.settings.enabled === "boolean") {
    return block.settings.enabled !== false;
  }
  return true;
}

function getCurrentThemeEmbedBlocks(settingsData) {
  const currentBlocks = settingsData?.current?.blocks;
  if (!currentBlocks || typeof currentBlocks !== "object") return [];
  return Object.values(currentBlocks).filter(
    (block) => block && typeof block === "object" && isMatchingEmbedType(block.type)
  );
}

function findEmbedBlocks(settingsData) {
  const matches = [];

  const walk = (node) => {
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    if (!node || typeof node !== "object") return;

    if (isMatchingEmbedType(node.type)) {
      matches.push(node);
    }

    for (const key of Object.keys(node)) walk(node[key]);
  };

  walk(settingsData);
  return matches;
}

async function getEmbedEnabled(admin, session) {
  const themeId = await getMainThemeId(admin);
  if (!themeId) return { enabled: false, debug: "MAIN theme not found" };

  const raw = await getSettingsData(admin, session, themeId);
  if (!raw) {
    return {
      enabled: false,
      debug:
        "settings_data.json not readable via asset API. (App reinstall / access issue)",
    };
  }

  let settingsData;
  try {
    settingsData = JSON.parse(raw);
  } catch {
    return { enabled: false, debug: "settings_data.json JSON parse failed" };
  }

  const currentThemeBlocks = getCurrentThemeEmbedBlocks(settingsData);
  const matchedBlocks = currentThemeBlocks.length
    ? currentThemeBlocks
    : findEmbedBlocks(settingsData);

  if (!matchedBlocks.length) {
    return {
      enabled: false,
      debug: `Embed block not found. Expected ${EMBED_TYPE_FRAGMENT} in type`,
    };
  }

  const enabled = matchedBlocks.some(isEmbedBlockEnabled);
  const sampleBlock = matchedBlocks[0];

  return {
    enabled,
    debug: {
      matches: matchedBlocks.length,
      currentThemeMatches: currentThemeBlocks.length,
      sampleType: sampleBlock.type,
      sampleDisabled: !!sampleBlock.disabled,
      sampleSettingsEnabled:
        sampleBlock.settings && typeof sampleBlock.settings.enabled === "boolean"
          ? sampleBlock.settings.enabled
          : "n/a",
    },
  };
}

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session?.shop ?? null;
  const appEmbedOwnerId =
    process.env.SHOPIFY_API_KEY || process.env.SHOPIFY_SMART_CART_ID || "";

  let embedEnabled = false;
  let debug = null;

  try {
    const out = await getEmbedEnabled(admin, session);
    embedEnabled = !!out.enabled;
    debug = out.debug;
  } catch (e) {
    embedEnabled = false;
    debug = e?.message || "unknown error";
  }

  return { shop, embedEnabled, debug, appEmbedOwnerId };
};

export default function Index() {
  const { shop, embedEnabled, appEmbedOwnerId } = useLoaderData() ?? {};
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const host = params.get("host");

  const withHost = (path) => {
    if (!host) return path;
    const url = new URL(path, "http://placeholder");
    url.searchParams.set("host", host);
    return url.pathname + url.search;
  };

  const featureCards = [
    {
      title: "Shipping Rules",
      body: "Create free or conditional shipping rules to increase average order value.",
      imageSrc: "/images/Shipping.png",
      imageAlt: "Shipping rules",
      href: withHost("/app/rules?tab=shipping"),
    },
    {
      title: "Discount Automations",
      body: "Automate cart discounts based on value, or customer rules.",
      imageSrc: "/images/AutomaticDiscount.png",
      imageAlt: "Discount automations",
      href: withHost("/app/rules?tab=discount"),
    },
    {
      title: "Free Product gifting",
      body: "Auto-add free gifts to cart with quantity limits and smart conditions.",
      imageSrc: "/images/FreeProduct.png",
      imageAlt: "Free product gifting",
      href: withHost("/app/rules?tab=free"),
    },
    {
      title: "Buy X Get Y bundles",
      body: "Run Buy X Get Y offers with product, collection, or tag targeting.",
      imageSrc: "/images/BuyXGetY.png",
      imageAlt: "Buy X Get Y bundles",
      href: withHost("/app/rules?tab=bxgy"),
    },
    {
      title: "Code Discount",
      body: "Manage discount codes with advanced include and exclude rules.",
      imageSrc: "/images/CodeDiscount.png",
      imageAlt: "Code discount",
      href: withHost("/app/rules?tab=discount-code"),
    },
    {
      title: "Upsell Product",
      body: "Auto Show Product,Select Product,Select Collection & Customize.",
      imageSrc: "/images/download.svg",
      imageAlt: "Upsell product",
      href: withHost("/app/rules?tab=upsell"),
    },
  ];

  const quickShortcuts = [
    {
      label: "Configure Rewards",
      href: withHost("/app/rules"),
      icon: ShippingLabelIcon,
      bg: "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)",
    },
    {
      label: "Customize Style & Preview",
      href: withHost("/app/rules?tab=style"),
      icon: PaintBrushFlatIcon,
      bg: "linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)",
    },
  ];

  const themeTemplate = "index";
  const themeAdminUrl = shop
    ? `https://${shop}/admin/themes/current/editor?context=apps&template=${themeTemplate}`
    : null;

  // Deep link that auto-toggles the app embed block to ON in the theme editor
  const activateEmbedUrl = shop && appEmbedOwnerId
    ? `https://${shop}/admin/themes/current/editor?context=apps&template=${themeTemplate}&activateAppId=${appEmbedOwnerId}/${EMBED_BLOCK_HANDLE}`
    : null;

  const openAppEmbedsUrl = activateEmbedUrl || themeAdminUrl;
  const embedStatusLabel = embedEnabled ? "ON" : "OFF";
  const embedStatusStyle = {
    borderRadius: 999,
    padding: "6px 14px",
    fontSize: 12,
    fontWeight: 700,
    lineHeight: 1,
    color: embedEnabled ? "#05422f" : "#b42318",
    background: embedEnabled ? "#d1fae5" : "#fee4e2",
  };

  return (
    <s-page heading="CartLift: Cart Drawer & Upsell">
      <style
        type="text/css"
        dangerouslySetInnerHTML={{ __html: CUSTOM_ICON_CSS }}
      />

      <s-section>
        <s-box
          padding="base"
          background="white"
          borderRadius="extraLarge"
          borderWidth="base"
          style={{
            boxShadow: "0 10px 35px rgba(15, 23, 42, 0.08)",
            background: "#f8fafc",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <s-heading level="5" style={{ margin: 0 }}>
                App embed status
              </s-heading>
              <span style={embedStatusStyle}>{embedStatusLabel}</span>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <s-button
                href={openAppEmbedsUrl}
                variant="primary"
                target="_blank"
                rel="noreferrer"
                disabled={!openAppEmbedsUrl}
                style={{ backgroundColor: "#1f2937", borderColor: "#1f2937" }}
              >
                Open App Embeds
              </s-button>
            </div>

            <p style={{ margin: 0, color: "rgba(15,23,42,0.75)", fontSize: 12, lineHeight: 1.65 }}>
              You will be redirected to the Shopify theme editor, where you can enable CartLift: Cart Drawer & Upsell. Make sure to save your changes after enabling it.
            </p>
          </div>
        </s-box>
      </s-section>
      <s-section heading="What you can orchestrate">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: "18px",
            alignItems: "stretch",
          }}
        >
          {featureCards.map((card) => (
            <s-box
              key={card.title}
              padding="base"
              borderWidth="base"
              borderRadius="large"
              background="subdued"
              shadow="raised"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                minHeight: "210px",
                backgroundImage: "linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                <div
                  style={{
                    width: "60px !important",
                    height: "60px !important",
                    borderRadius: "25px",
                    background: "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "26px",
                    boxShadow: "0 12px 35px #ffffff",
                  }}
                >
                  <img
                    src={card.imageSrc}
                    alt={card.imageAlt}
                    style={{
                      width: 60,
                      height: 60,
                      objectFit: "contain",
                      display: "block",
                    }}
                  />
                </div>
                <text style={{ fontSize: "18px", fontWeight: "600" }}>
                  {card.title}
                </text>
              </div>

              <div
                style={{
                  fontSize: "14px",
                  lineHeight: 1.5,
                  marginTop: "6px",
                  marginBottom: "6px",
                  color: "rgba(15,23,42,0.8)",
                }}
              >
                {card.body}
              </div>

              <s-button
                href={card.href}
                variant="primary"
                style={{ backgroundColor: "#2C7A7B", color: "#ffffff" }}
              >
                Configure
              </s-button>
            </s-box>
          ))}
        </div>
      </s-section>

      <s-section heading="Quick shortcuts">
        <s-box
          padding="base"
          background="white"
          borderRadius="extraLarge"
          borderWidth="base"
          style={{ boxShadow: "0 10px 35px rgba(15, 23, 42, 0.08)" }}
        >
          <div
            style={{
              display: "flex",
              gap: "32px",
              flexWrap: "wrap",
              alignItems: "center",
              padding: "6px 2px",
            }}
          >
            {quickShortcuts.map((item) => (
              <s-link
                key={item.label}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  color: "#111111",
                  fontWeight: 600,
                }}
              >
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "20px",
                      flexShrink: 0,
                    }}
                    aria-hidden="true"
                  >
                    <Icon style={{ fill: "#000000" }} source={item.icon} color="base" />
                  </span>
                  <span style={{ fontSize: "14px", color: "#000000" }}>{item.label}</span>
                </div>
              </s-link>
            ))}
          </div>
        </s-box>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);

export function ErrorBoundary() {
  const error = useRouteError();
  return (
    <Page title="Error">
      <Card>
        <Text as="h2" variant="headingMd">Something went wrong</Text>
        <Text tone="subdued">
          We encountered an error loading the dashboard. Please try refreshing or contact support if the issue persists.
        </Text>
        {process.env.NODE_ENV !== "production" && error?.message && (
          <Text tone="critical">{error.message}</Text>
        )}
      </Card>
    </Page>
  );
}

