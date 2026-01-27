import { boundary } from "@shopify/shopify-app-react-router/server";
import { useEffect, useRef, useState } from "react";
import { useLoaderData, useLocation } from "react-router";
import { authenticate, apiVersion } from "../shopify.server";

import { Icon } from "@shopify/polaris";
import {
  CheckCircleIcon,
  ChevronDownIcon,
  PaintBrushFlatIcon,
  QuestionCircleIcon,
  ShippingLabelIcon,
  ClipboardIcon,
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

function findEmbedBlock(settingsData) {
  const needle = `/blocks/${EMBED_BLOCK_HANDLE}/`;
  let found = null;

  const walk = (node) => {
    if (found) return;
    if (Array.isArray(node)) {
      for (const x of node) walk(x);
      return;
    }
    if (!node || typeof node !== "object") return;

    const type = typeof node.type === "string" ? node.type : "";
    if (
      type.includes("shopify://apps/") &&
      type.includes("/blocks/") &&
      type.includes(needle)
    ) {
      found = node;
      return;
    }

    for (const k of Object.keys(node)) walk(node[k]);
  };

  walk(settingsData);
  return found;
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

  const block = findEmbedBlock(settingsData);
  if (!block) {
    return {
      enabled: false,
      debug: `Embed block not found. Expected /blocks/${EMBED_BLOCK_HANDLE}/ in type`,
    };
  }

  // Theme editor toggle OFF => disabled:true
  let enabled = block.disabled === true ? false : true;

  // Optional: your internal setting "enabled"
  if (block.settings && typeof block.settings.enabled === "boolean") {
    if (block.settings.enabled === false) enabled = false;
  }

  return {
    enabled,
    debug: {
      type: block.type,
      disabled: !!block.disabled,
      settingsEnabled:
        block.settings && typeof block.settings.enabled === "boolean"
          ? block.settings.enabled
          : "n/a",
    },
  };
}

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session?.shop ?? null;

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

  return { shop, embedEnabled, debug };
};

export default function Index() {
  const { shop, embedEnabled } = useLoaderData() ?? {};
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const host = params.get("host");
  const [copied, setCopied] = useState(false);

  const HEADER_SNIPPET = '<a data-smart-cartify-open class="my-cart-icon">My Cart</a>';

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
      title: "Style & Theme preview",
      body: "Customize design, colors, and layout with real-time theme preview.",
      imageSrc: "/images/Preview.png",
      imageAlt: "Style and theme preview",
      href: withHost("/app/rules?tab=style"),
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
      label: "Style preview",
      href: withHost("/app/rules?tab=style"),
      icon: PaintBrushFlatIcon,
      bg: "linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)",
    },
    {
      label: "View FAQs & support",
      href: withHost("/app/help"),
      icon: QuestionCircleIcon,
      bg: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
    },
  ];

  const themeAdminUrl = shop
    ? `https://${shop}/admin/themes/current/editor?context=apps`
    : null;

  const setupSteps = [
    {
      title: "Cart drawer compatibility check",
      body:
        "Multiple active cart drawer apps may cause conflicts. To ensure the best shopping experience, keep only one cart drawer app active at a time.",
      buttonLabel: "Open theme settings",
      href: themeAdminUrl,
      completed: true,
    },
    {
      title: "Enable SmartCartify in your theme editor",
      body:
        "You will be redirected to the Shopify theme editor, where you can enable SmartCartify. Save your changes after enabling it.",
      buttonLabel: "Activate",
      href: themeAdminUrl,
      completed: !!embedEnabled, // ✅ Green when ON
    },
    {
      title: "Edit the cart drawer to match your store's design",
      body:
        "Go to the cart editor to customize the cart drawer so it matches your storefront.",
      buttonLabel: "Go to cart editor",
      href: withHost("/app/rules"),
      completed: true,
    },
  ];

  const completedCount = setupSteps.filter((s) => s.completed).length;
  const progressPercent = Math.round(
    (completedCount / setupSteps.length) * 100
  );
  const [isAccordionOpen, setIsAccordionOpen] = useState(
    () => completedCount < setupSteps.length
  );
  const prevCompletedCountRef = useRef(completedCount);
  useEffect(() => {
    if (
      completedCount === setupSteps.length &&
      prevCompletedCountRef.current !== setupSteps.length
    ) {
      setIsAccordionOpen(false);
    }
    prevCompletedCountRef.current = completedCount;
  }, [completedCount, setupSteps.length]);

  const handleCopySnippet = async () => {
    try {
      await navigator.clipboard.writeText(HEADER_SNIPPET);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <s-page heading="SmartCartify">
      <style
        type="text/css"
        dangerouslySetInnerHTML={{ __html: CUSTOM_ICON_CSS }}
      />

      <s-section>
        <details
          data-accordion
          open={isAccordionOpen}
          onToggle={(event) => setIsAccordionOpen(event.currentTarget.open)}
          style={{
            borderRadius: "20px",
            border: "1px solid rgba(0,0,0,0.08)",
            background: "#fff",
            boxShadow: "0 14px 40px rgba(15, 23, 42, 0.08)",
          }}
        >
          <summary
            style={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
              padding: "16px 22px",
              borderBottom: "1px solid rgba(0,0,0,0.08)",
              margin: 0,
            }}
          >
            <div>
              <s-heading level="5" as="h3" style={{ margin: 0 }}>
                Quick Setup Guide ⚡
              </s-heading>
              <div style={{ fontSize: "0.85rem", color: "rgba(5, 11, 17, 0.7)" }}>
                {`${completedCount} / ${setupSteps.length} steps completed`}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <s-progress-bar
                progress={progressPercent}
                size="small"
                style={{ flex: 1, width: 110 }}
              />
              <Icon
                source={ChevronDownIcon}
                color="base"
                style={{
                  transform: isAccordionOpen ? "rotate(-180deg)" : "rotate(0deg)",
                  transition: "transform 0.25s ease",
                }}
              />
            </div>
          </summary>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {setupSteps.map((step, idx) => (
              <div
                key={step.title}
                style={{
                  padding: "20px 22px",
                  borderBottom:
                    idx === setupSteps.length - 1
                      ? "none"
                      : "1px solid rgba(0,0,0,0.08)",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "16px",
                }}
              >
                <div
                  className="step-indicator"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    border: `2px solid ${step.completed ? "#16a34a" : "#111111"}`,
                    background: step.completed ? "#16a34a" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {step.completed ? (
                    <Icon
                      source={CheckCircleIcon}
                      style={{
                        color: "#ffffff",
                        fill: "#ffffff !important",
                        stroke: "#ffffff",
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        border: "2px solid #111",
                        display: "block",
                        background: "transparent",
                      }}
                    />
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <s-heading level="5" style={{ margin: "4px 0" }}>
                    {step.title}
                  </s-heading>
                  <s-paragraph tone="subdued">{step.body}</s-paragraph>
                  <div style={{ marginTop: 12 }}>
                    <s-button
                      href={step.href}
                      variant="primary"
                      tone="success"
                      target="_blank"
                      rel="noreferrer"
                      disabled={!step.href}
                      style={{
                        backgroundColor: "#2C7A7B",
                        borderColor: "#2C7A7B",
                      }}
                    >
                      {step.buttonLabel}
                    </s-button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </details>
      </s-section>

      {/* <s-section>
        <s-box
          padding="base"
          background="white"
          borderRadius="extraLarge"
          borderWidth="base"
          style={{ boxShadow: "0 10px 35px rgba(15, 23, 42, 0.08)" }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <s-heading level="5">Theme header snippet</s-heading>
            <s-paragraph tone="subdued">
              Add this line to your theme header.liquid file.
            </s-paragraph>
            <div
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <textarea
                readOnly
                value={HEADER_SNIPPET}
                rows={1}
                style={{
                  flex: "1 1 520px",
                  minWidth: 280,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  fontFamily: "monospace",
                  fontSize: 13,
                  background: "#f9fafb",
                  color: "#111827",
                  resize: "none",
                }}
              />
              <s-button
                onClick={handleCopySnippet}
                variant="secondary"
                style={{ backgroundColor: "#111111", color: "#ffffff" }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <Icon
                    source={ClipboardIcon}
                    style={{ color: "#ffffff", fill: "#ffffff !important", width: "24px", height: "24px" }}
                  />
                  {copied ? "Copied" : "Copy"}
                </span>
              </s-button>
            </div>
          </div>
        </s-box>
      </s-section> */}

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
