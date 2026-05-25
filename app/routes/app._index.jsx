import { boundary } from "@shopify/shopify-app-react-router/server";
import React from "react";
import { useFetcher, useLoaderData, useLocation, useRouteError } from "react-router";
import { authenticate, apiVersion } from "../shopify.server";
import prisma from "../db.server";
import { Page, Box, Text, Modal, TextField, BlockStack, InlineStack } from "@shopify/polaris";

import { Icon } from "@shopify/polaris";
import {
  PaintBrushFlatIcon,
  ShippingLabelIcon,
  BookOpenIcon,
  StarIcon,
  StarFilledIcon,
  InfoIcon,
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
s-page::part(heading),
s-section::part(heading),
s-heading {
  font-size: 14px !important;
}
.dashboard-feature-card,
.dashboard-app-card,
.dashboard-status-card,
.dashboard-metric-card,
.dashboard-shortcuts-card {
  border: 1px solid #dcdfe4;
  background: #ffffff;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.04);
}
.dashboard-metric-card:hover,
.dashboard-app-card:hover {
  border-color: #b8c4d0;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
}
`;

const EMBED_BLOCK_HANDLE = "smart-block"; // ✅ your blocks/smart-block.liquid
const EMBED_TYPE_FRAGMENT = `/blocks/${EMBED_BLOCK_HANDLE}`;
const REVIEW_MODAL_INTENT = "submit-review-popup";
const REVIEW_MODAL_RULE_THRESHOLD = 3;
const REVIEW_SUPPORT_URL = "https://cartliftcartdrawerupsell.tawk.help/article/dashboard-page";

const json = (data, init = {}) =>
  new Response(JSON.stringify(data), {
    status: init.status || 200,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

async function getMainThemeId(admin) {
  const res = await admin.graphql(
    `#graphql
    query Themes {
      themes(first: 250) {
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
  } catch (err) {
    console.warn("[app._index] GraphQL asset read failed, trying REST fallback:", err?.message);
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
  const [
    shopRecord,
    shippingRuleCount,
    discountRuleCount,
    freeGiftRuleCount,
    bxgyRuleCount,
    activeShippingRuleCount,
    activeDiscountRuleCount,
    activeFreeGiftRuleCount,
    activeBxgyRuleCount,
    upsellSettings,
    styleSettings,
  ] =
    shop
      ? await Promise.all([
          prisma.shop.findUnique({
            where: { shop },
            select: {
              reviewSubmittedAt: true,
            },
          }),
          prisma.shippingRule.count({ where: { shop } }),
          prisma.discountRule.count({ where: { shop } }),
          prisma.freeGiftRule.count({ where: { shop } }),
          prisma.bxgyRule.count({ where: { shop } }),
          prisma.shippingRule.count({ where: { shop, enabled: true } }),
          prisma.discountRule.count({ where: { shop, enabled: true } }),
          prisma.freeGiftRule.count({ where: { shop, enabled: true } }),
          prisma.bxgyRule.count({ where: { shop, enabled: true } }),
          prisma.upsellSettings.findUnique({
            where: { shop },
            select: { enabled: true },
          }).catch(() => null),
          prisma.styleSettings.findFirst({
            where: { shop },
            orderBy: { id: "desc" },
            select: { id: true },
          }),
        ])
      : [null, 0, 0, 0, 0, 0, 0, 0, 0, null, null];

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

  const totalRulesCount =
    Number(shippingRuleCount || 0) +
    Number(discountRuleCount || 0) +
    Number(freeGiftRuleCount || 0) +
    Number(bxgyRuleCount || 0);
  const activeRulesCount =
    Number(activeShippingRuleCount || 0) +
    Number(activeDiscountRuleCount || 0) +
    Number(activeFreeGiftRuleCount || 0) +
    Number(activeBxgyRuleCount || 0);
  const configuredOfferTypes = [
    shippingRuleCount,
    discountRuleCount,
    freeGiftRuleCount,
    bxgyRuleCount,
    upsellSettings ? 1 : 0,
  ].filter((count) => Number(count || 0) > 0).length;

  const shouldShowReviewPopup = Boolean(
    shopRecord &&
      totalRulesCount >= REVIEW_MODAL_RULE_THRESHOLD &&
      !shopRecord.reviewSubmittedAt
  );

  return {
    shop,
    embedEnabled,
    debug,
    appEmbedOwnerId,
    shouldShowReviewPopup,
    totalRulesCount,
    dashboardStats: {
      totalRulesCount,
      activeRulesCount,
      configuredOfferTypes,
      upsellEnabled: Boolean(upsellSettings?.enabled),
      styleConfigured: Boolean(styleSettings?.id),
    },
  };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session?.shop ?? null;

  if (!shop) {
    return json({ ok: false, error: "Shop not found in session." }, { status: 400 });
  }

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent !== REVIEW_MODAL_INTENT) {
    return json({ ok: false, error: "Unsupported action." }, { status: 400 });
  }

  const ratingRaw = String(formData.get("rating") || "").trim();
  const commentRaw = String(formData.get("comment") || "").trim();
  const rating = Number.parseInt(ratingRaw, 10);

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return json(
      { ok: false, error: "Rating is required and must be between 1 and 5." },
      { status: 400 }
    );
  }

  const comment = commentRaw ? commentRaw.slice(0, 2000) : null;
  const now = new Date();

  await prisma.shop.upsert({
    where: { shop },
    update: {
      reviewSubmittedAt: now,
      reviewRating: rating,
      reviewComment: comment,
    },
    create: {
      shop,
      installed: true,
      reviewSubmittedAt: now,
      reviewRating: rating,
      reviewComment: comment,
    },
  });

  return json({ ok: true });
};

export default function Index() {
  const { shop, embedEnabled, appEmbedOwnerId, shouldShowReviewPopup, dashboardStats } =
    useLoaderData() ?? {};
  const fetcher = useFetcher();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const host = params.get("host");
  const [reviewModalOpen, setReviewModalOpen] = React.useState(Boolean(shouldShowReviewPopup));
  const [reviewRating, setReviewRating] = React.useState(0);
  const [reviewComment, setReviewComment] = React.useState("");
  const [reviewClientError, setReviewClientError] = React.useState(null);

  React.useEffect(() => {
    setReviewModalOpen(Boolean(shouldShowReviewPopup));
  }, [shouldShowReviewPopup]);

  React.useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) {
      setReviewModalOpen(false);
    }
  }, [fetcher.state, fetcher.data]);

  const submittingReview = fetcher.state !== "idle";
  const reviewError = fetcher.data && fetcher.data.ok === false ? fetcher.data.error : null;

  const submitReview = () => {
    if (!reviewRating) {
      setReviewClientError("Please select a rating before submitting.");
      return;
    }

    setReviewClientError(null);
    const formData = new FormData();
    formData.append("intent", REVIEW_MODAL_INTENT);
    formData.append("rating", String(reviewRating));
    formData.append("comment", reviewComment);
    fetcher.submit(formData, { method: "post" });
  };

  const withHost = (path) => {
    if (!host) return path;
    const url = new URL(path, "http://placeholder");
    url.searchParams.set("host", host);
    return url.pathname + url.search;
  };

  const quickShortcuts = [
    {
      label: "Configure Rewards",
      href: withHost("/app/rules"),
      icon: ShippingLabelIcon,
      external: false,
    },
    {
      label: "Customize Style & Preview",
      href: withHost("/app/rules?tab=style"),
      icon: PaintBrushFlatIcon,
      external: false,
    },
    {
      label: "User Guide",
      href: "https://cartliftcartdrawerupsell.tawk.help/article/dashboard-page",
      icon: BookOpenIcon,
      external: true,
    },
    {
      label: "App Review",
      href: "https://apps.shopify.com/cartlift-cart-drawer-upsell#modal-show=ReviewListingModal",
      icon: StarIcon,
      external: true,
    },
  ];

  const dashboardApps = [
    {
      title: "Fomoify Sales Popup & Proof",
      category: "Social Proof",
      description:
        "Increase trust using real-time sales popups and conversion proof nudges.",
      href: "https://apps.shopify.com/fomoify-sales-popup-proof",
      imageSrc: "/images/fomoify-sales-popup-proof.png",
      imageAlt: "Fomoify Sales Popup & Proof",
    },
    {
      title: "MixBox - Box & Bundle Builder",
      category: "Bundle",
      description:
        "Build custom bundles and boxed products to increase average order value.",
      href: "https://apps.shopify.com/mixbox-box-bundle-builder",
      imageSrc: "/images/mixbox-box-bundle-builder.jpg",
      imageAlt: "MixBox - Box & Bundle Builder",
    },
    {
      title: "Content AI - SEO Generator",
      category: "SEO",
      description:
        "Generate SEO-friendly content to improve visibility and conversion.",
      href: "https://apps.shopify.com/content-ai-seo-generator",
      icon: StarIcon,
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
    borderRadius: 4,
    padding: "6px 14px",
    fontSize: 12,
    fontWeight: 600,
    lineHeight: 1,
    color: embedEnabled ? "#05422f" : "#b42318",
    background: embedEnabled ? "#d1fae5" : "#fee4e2",
  };
  const dashboardSummaryCards = [
    {
      label: "Total reward rules",
      value: String(dashboardStats?.totalRulesCount ?? 0),
      detail: "Shipping, discounts, free gifts, and Buy X Get Y rules.",
    },
    {
      label: "Active rules",
      value: String(dashboardStats?.activeRulesCount ?? 0),
      detail: "Rules currently enabled for the storefront cart.",
    },
    {
      label: "Offer types configured",
      value: `${dashboardStats?.configuredOfferTypes ?? 0}/5`,
      detail: "Configured across rewards, discounts, bundles, and upsells.",
    },
    {
      label: "Upsell product",
      value: dashboardStats?.upsellEnabled ? "ON" : "OFF",
      detail: "Product upsell module status.",
      tone: dashboardStats?.upsellEnabled ? "success" : "muted",
    },
    {
      label: "Cart style",
      value: dashboardStats?.styleConfigured ? "Set" : "Default",
      detail: "Drawer design and preview customization.",
    },
    {
      label: "App embed",
      value: embedStatusLabel,
      detail: "Theme app embed status.",
      tone: embedEnabled ? "success" : "critical",
    },
  ];

  return (
    <>
      <Modal
        open={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        title="Review this app"
        primaryAction={{
          content: "Submit",
          onAction: submitReview,
          loading: submittingReview,
          disabled: !reviewRating,
        }}
        secondaryActions={[
          {
            content: "Get support",
            url: REVIEW_SUPPORT_URL,
            external: true,
            disabled: submittingReview,
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            {/* <div
              style={{
                background: "#e9f3ff",
                borderRadius: 4,
                padding: "12px 14px",
              }}
            >
              <InlineStack gap="200" blockAlign="center">
                <Icon source={InfoIcon} tone="info" />
              </InlineStack>
            </div> */}

            <BlockStack gap="200">
              <InlineStack gap="300" blockAlign="center" wrap={false}>
                <img
                  src="/images/cart-lift.png"
                  alt="CartLift app icon"
                  style={{
                    width: 48,
                    height: 48,
                    objectFit: "cover",
                    flexShrink: 0,
                  }}
                />
                <BlockStack gap="100">
                  <Text as="p" variant="headingMd">
                    How would you rate CartLift: Cart Drawer & Upsell?
                  </Text>
                  <InlineStack gap="100">
                    {[1, 2, 3, 4, 5].map((starValue) => {
                      const active = reviewRating >= starValue;
                      return (
                        <button
                          key={starValue}
                          type="button"
                          onClick={() => {
                            setReviewRating(starValue);
                            setReviewClientError(null);
                          }}
                          aria-label={`Rate ${starValue} out of 5`}
                          style={{
                            border: "none",
                            background: "transparent",
                            padding: 0,
                            cursor: "pointer",
                            color: active ? "#8a6116" : "#8a8a8a",
                            display: "inline-flex",
                          }}
                        >
                          <Icon source={active ? StarFilledIcon : StarIcon} tone="base" />
                        </button>
                      );
                    })}
                  </InlineStack>
                </BlockStack>
              </InlineStack>
            </BlockStack>

            <TextField
              label="Describe your experience (optional)"
              value={reviewComment}
              onChange={setReviewComment}
              multiline={6}
              autoComplete="off"
              placeholder="What should other merchants know about this app?"
            />
            <InlineStack align="space-between" blockAlign="center">
              <Text as="p" tone="subdued">
                If your review is published on the Shopify App Store, we&apos;ll include some details about your store.
              </Text>
              <Icon source={InfoIcon} tone="subdued" />
            </InlineStack>
            {reviewClientError ? (
              <Text as="p" tone="critical">
                {reviewClientError}
              </Text>
            ) : null}
            {reviewError ? (
              <Text as="p" tone="critical">
                {reviewError}
              </Text>
            ) : null}
          </BlockStack>
        </Modal.Section>
      </Modal>

      <s-page heading="CartLift: Cart Drawer & Upsell">
      <style
        type="text/css"
        dangerouslySetInnerHTML={{ __html: CUSTOM_ICON_CSS }}
      />

      <s-section>
        <s-box
          className="dashboard-status-card"
          padding="base"
          background="white"
          borderWidth="base"
          borderRadius="base"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <s-heading level="5" style={{ margin: 0, fontSize: "14px" }}>
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

            <p style={{ margin: 0, color: "#5c5f62", fontSize: 12, lineHeight: 1.65 }}>
              You will be redirected to the Shopify theme editor, where you can enable CartLift: Cart Drawer & Upsell. Make sure to save your changes after enabling it.
            </p>
          </div>
        </s-box>
      </s-section>
      <s-section heading="CartLift dashboard">
        <div className="app-dashboard-grid">
          {dashboardSummaryCards.map((card) => (
            <s-box
              key={card.label}
              className="dashboard-metric-card"
              padding="base"
              borderWidth="base"
              background="white"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                minHeight: "132px",
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#5c5f62",
                  lineHeight: 1.3,
                }}
              >
                {card.label}
              </span>
              <span
                style={{
                  fontSize: "28px",
                  fontWeight: 800,
                  color:
                    card.tone === "success"
                      ? "#05422f"
                      : card.tone === "critical"
                        ? "#b42318"
                        : "#202223",
                  lineHeight: 1,
                }}
              >
                {card.value}
              </span>
              <span
                style={{
                  fontSize: "12px",
                  lineHeight: 1.45,
                  color: "rgba(15,23,42,0.72)",
                }}
              >
                {card.detail}
              </span>
            </s-box>
          ))}
        </div>
      </s-section>
      <s-section heading="Quick shortcuts">
        <s-box
          className="dashboard-shortcuts-card"
          padding="base"
          background="white"
          borderWidth="base"
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
            {quickShortcuts.map((item) => {
              const linkStyle = {
                display: "flex",
                alignItems: "center",
                gap: "12px",
                color: "#111111",
                fontWeight: 700,
                textDecoration: "none",
              };
              const inner = (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
                    <Icon source={item.icon} color="base" />
                  </span>
                  <span style={{ fontSize: "14px",fontWeight: 700,color: "#000000" }}>{item.label}</span>
                </div>
              );
              return item.external ? (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={linkStyle}
                >
                  {inner}
                </a>
              ) : (
                <s-link
                  key={item.label}
                  href={item.href}
                  style={linkStyle}
                >
                  {inner}
                </s-link>
              );
            })}
          </div>
        </s-box>
      </s-section>

      <s-section heading="Recommended Our Growth Apps">
        <div className="app-dashboard-grid">
          {dashboardApps.map((app) => (
            <s-box
              key={app.title}
              className="dashboard-app-card"
              padding="base"
              borderWidth="base"
              background="white"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                minHeight: "190px",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 4,
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {app.imageSrc ? (
                        <img
                          src={app.imageSrc}
                          alt={app.imageAlt}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      ) : (
                        <span
                          style={{
                            color: "#0284c7",
                            transform: "scale(1.2)",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Icon source={app.icon} tone="base" />
                        </span>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: 700,
                        color: "#303030",
                        lineHeight: 1.25,
                      }}
                    >
                      {app.title}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#6d6d6d",
                      background: "#efefef",
                      padding: "4px 10px",
                      borderRadius: 4,
                      flexShrink: 0,
                    }}
                  >
                    {app.category}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "12px",
                    lineHeight: 1.35,
                    color: "#5c5f62",
                  }}
                >
                  {app.description}
                </span>
              </div>

              <s-button
                href={app.href}
                target="_blank"
                rel="noreferrer"
                variant="primary"
                style={{
                  backgroundColor: "#1f1f1f",
                  color: "#ffffff",
                  borderRadius: 4,
                  width: "100%",
                  textAlign: "center",
                  justifyContent: "center",
                }}
              >
                View app
              </s-button>
            </s-box>
          ))}
        </div>
      </s-section>
      </s-page>
    </>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);

export function ErrorBoundary() {
  const error = useRouteError();
  return (
    <Page title="Error">
      <Box borderWidth="025" borderColor="border" background="bg-surface" borderRadius="100" padding="400">
        <Text as="h2" variant="headingMd">Something went wrong</Text>
        <Text tone="subdued">
          We encountered an error loading the dashboard. Please try refreshing or contact support if the issue persists.
        </Text>
        {process.env.NODE_ENV !== "production" && error?.message && (
          <Text tone="critical">{error.message}</Text>
        )}
      </Box>
    </Page>
  );
}



