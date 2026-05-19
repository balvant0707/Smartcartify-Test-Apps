// app/routes/app.rules.jsx
import React from "react";
import { useLoaderData, useLocation, useNavigate, useRouteError } from "react-router";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  Page,
  Layout,
  Card,
  Text,
  Button,
  InlineStack,
  BlockStack,
  Box,
  Checkbox,
  Select,
  TextField,
  ChoiceList,
  RadioButton,
  Banner,
  Divider,
  Badge,
  Modal,
  OptionList,
  Frame,
  Toast,
  Spinner,
  Icon,
  DropZone,
} from "@shopify/polaris";

import {
  CheckCircleIcon,
  DeliveryIcon,
  DiscountIcon,
  GiftCardIcon,
  CodeIcon,
  TransferInternalIcon,
  ProductIcon,
  ThemeIcon,
  StarFilledIcon,
  BookOpenIcon,
  QuestionCircleIcon,
  MagicIcon,
  CheckSmallIcon,
  CartIcon,
  PlusCircleIcon,
  MinusCircleIcon,
} from "@shopify/polaris-icons";
import { authenticate, apiVersion } from "../shopify.server";
import prisma from "../db.server";
import {
  syncMinAmountFreeGiftDiscount,
  syncFreeProductDiscountsToShopify,
  resolveAllProductsCollectionId,
} from "../lib/minAmountFreeGift.server.js";
import { invalidateShopCache } from "./app.proxy.smart.jsx";
const logger = { log: console.log.bind(console), warn: console.warn.bind(console), error: console.error.bind(console) };

// Client-side conditional logging: window is defined in browser, not on server
const isDev = typeof window === "undefined"
  ? process.env.NODE_ENV !== "production"
  : false;
const clientLog = (...args) => { if (isDev) console.log(...args); };
const clientWarn = (...args) => { if (isDev) console.warn(...args); };
const clientError = (...args) => { console.error(...args); };

const CART_ICON_UPLOAD_DIR = path.join(
  process.cwd(),
  "public",
  "uploads",
  "cart-icons"
);
const APP_PUBLIC_URL = (
  process.env.APP_URL ||
  process.env.SHOPIFY_APP_URL ||
  ""
).replace(/\/+$/, "");
const CART_ICON_PUBLIC_PATH = "/uploads/cart-icons";
const CART_ICON_MAX_BYTES = 2 * 1024 * 1024;
const CART_ICON_ALLOWED_TYPES = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/svg+xml", "svg"],
  ["image/gif", "gif"],
]);

const uploadCartIconFile = async (file) => {
  if (!file || typeof file.arrayBuffer !== "function") {
    throw new Error("Please select an image file.");
  }

  const type = String(file.type || "").toLowerCase();
  const ext = CART_ICON_ALLOWED_TYPES.get(type);
  if (!ext) {
    throw new Error("Upload a PNG, JPG, WebP, GIF, or SVG image.");
  }

  if (Number(file.size || 0) > CART_ICON_MAX_BYTES) {
    throw new Error("Cart icon image must be 2 MB or smaller.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!buffer.length) {
    throw new Error("The selected image is empty.");
  }

  await mkdir(CART_ICON_UPLOAD_DIR, { recursive: true });
  const filename = `${randomUUID()}.${ext}`;
  await writeFile(path.join(CART_ICON_UPLOAD_DIR, filename), buffer);
  const publicPath = `${CART_ICON_PUBLIC_PATH}/${filename}`;
  return APP_PUBLIC_URL ? `${APP_PUBLIC_URL}${publicPath}` : publicPath;
};

const LEFT_ALIGN_BUTTON_CSS = `
.Polaris-Button--textAlignCenter {
  justify-content: left;
  text-align: left;
}
`;

const RULES_PAGE_CSS = `
.rules-page-shell {
  padding-block-start: 12px;
}

.rules-workspace {
  display: grid;
  grid-template-columns: 248px minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.rules-sidebar {
  position: sticky;
  top: 12px;
  display: grid;
  gap: 12px;
}

.rules-nav-card,
.rules-help-card,
.rules-main-card,
.rules-rule-card > .Polaris-Card {
  border: 1px solid #dcdfe4;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.04);
  background: #ffffff;
}

.rules-nav-list {
  display: grid;
  gap: 6px;
}

.rules-tab-button {
  width: 100%;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: #303030;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  text-align: left;
  font: inherit;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.25;
}

.rules-tab-button:hover {
  background: #f6f6f7;
}

.rules-tab-button--active {
  background: #eff6ff;
  border-color: #b7d7ff;
  color: #0b3b75;
}

.rules-tab-button__icon {
  display: inline-flex;
  width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.rules-tab-button__icon .Polaris-Icon {
  width: 18px;
  height: 18px;
}

.rules-help-card {
  padding: 12px;
  border-radius: 4px;
  display: grid;
  gap: 8px;
}

.rules-help-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 30px;
  padding: 6px 10px;
  border-radius: 4px;
  border: 1px solid #c9cccf;
  color: #202223;
  background: #ffffff;
  font-size: 12px;
  font-weight: 650;
  text-decoration: none;
}

.rules-help-link:hover {
  background: #f6f6f7;
}

.rules-panel-layout {
  min-width: 0;
}

.rules-panel-layout--main-column-width {
  max-width: calc(100% - 356px);
}

.rules-panel-layout--with-preview {
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(0, 1fr) minmax(0, 340px);
  align-items: start;
}

.rules-rule-card {
  overflow: hidden;
}

.rules-rule-card + .rules-rule-card {
  margin-top: 10px;
}

.rules-rule-body {
  display: block;
}

.rules-rule-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
}

.rules-rule-title {
  min-width: 0;
}

.rules-rule-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.rules-field-panel {
  padding: 10px;
  border: 1px solid #e3e5e8;
  border-radius: 4px;
  background: #ffffff;
}

.rules-field-panel--inline {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 12px;
}

.rules-field-panel--grid {
  display: grid;
  gap: 12px;
  align-items: end;
  max-width: 100%;
}

.rules-advanced-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  align-items: end;
}

.rules-advanced-grid__wide {
  grid-column: 1 / -1;
}

.rules-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 4px;
  margin-bottom: 2px;
}

@media (max-width: 1100px) {
  .rules-workspace,
  .rules-panel-layout--with-preview {
    grid-template-columns: 1fr;
  }

  .rules-panel-layout--main-column-width {
    max-width: none;
  }

  .rules-sidebar {
    position: static;
  }

  .rules-nav-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .rules-nav-list {
    grid-template-columns: 1fr;
  }

  .rules-rule-header {
    grid-template-columns: 1fr;
  }

  .rules-rule-actions {
    justify-content: flex-start;
  }

  .rules-field-panel--grid {
    grid-template-columns: 1fr !important;
  }

  .rules-advanced-grid {
    grid-template-columns: 1fr;
  }
}

.rule-accordion-btn:hover {
  background: rgba(0, 0, 0, 0.04) !important;
}

.rule-accordion-btn__content {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.rule-accordion-btn__icon {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  justify-self: end;
  width: 24px;
  flex-shrink: 0;
}
`;

// Currency formatting helper - uses shop currency when available, falls back to USD
const formatCurrency = (value = 0, currency = "USD", locale = "en-US") => {
  const num = Number(value || 0);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    // Fallback for unsupported currencies
    return `${currency} ${num.toLocaleString(locale)}`;
  }
};

const getCurrencySymbol = (currency = "USD", locale = "en-US") => {
  try {
    const parts = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).formatToParts(0);
    return parts.find((part) => part.type === "currency")?.value || currency;
  } catch {
    return currency;
  }
};

const fmtMoney = (value = 0, currency = "USD") => formatCurrency(value, currency);

const PROGRESS_TOKEN_PATTERN = /\{\{\s*(\w+)\s*\}\}/g;
const HIGHLIGHT_TOKENS = new Set(["discount", "discount_code"]);

const normalizeDiscountProgressText = (text) => {
  let out = String(text ?? "");
  if (!out) return "";
  out = out.replace(/(\d+(?:\.\d+)?)\s*%\s*off\s*%\s*off\b/gi, "$1% off");
  out = out.replace(/(\d+(?:\.\d+)?)\s+off\s*%\s*off\b/gi, "$1% off");
  out = out.replace(/(\d+(?:\.\d+)?)\s*%\s*%\s*off\b/gi, "$1% off");
  out = out.replace(/(\d+(?:\.\d+)?)\s+off\s*%/gi, "$1%");
  out = out.replace(/\boff\s+off\b/gi, "off");
  return out.replace(/\s{2,}/g, " ").trim();
};

const renderProgressText = (template = "", tokens = {}) => {
  if (!template) return "";
  return normalizeDiscountProgressText(
    template.replace(PROGRESS_TOKEN_PATTERN, (_, key) => tokens[key] ?? "")
  );
};

const renderProgressRichText = (template = "", tokens = {}) => {
  if (!template) return null;
  const nodes = [];
  let lastIndex = 0;
  let match;
  while ((match = PROGRESS_TOKEN_PATTERN.exec(template))) {
    const [fullMatch, key] = match;
    const index = match.index;
    if (index > lastIndex) {
      nodes.push(template.slice(lastIndex, index));
    }
    const value = tokens[key] ?? "";
    const isHighlighted = HIGHLIGHT_TOKENS.has(key);
    nodes.push(
      <span
        key={`${key}-${index}`}
        style={{ fontWeight: isHighlighted ? 700 : 400 }}
      >
        {value}
      </span>
    );
    lastIndex = index + fullMatch.length;
  }
  if (lastIndex < template.length) {
    nodes.push(template.slice(lastIndex));
  }
  return nodes.length ? nodes : null;
};

const GRAPHQL_ENDPOINT =
  process.env.RULES_API_ENDPOINT ||
  process.env.GRAPHQL_ENDPOINT ||
  process.env.RULES_GQL_ENDPOINT;

const GRAPHQL_TOKEN =
  process.env.RULES_API_TOKEN ||
  process.env.GRAPHQL_TOKEN ||
  process.env.RULES_GQL_TOKEN;

const json = (data, init = {}) =>
  new Response(JSON.stringify(data), {
    status: init.status || 200,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

// const gqlRequest = async (
//   session,
//   query,
//   variables = {},
//   authToken,
//   shopDomainOverride
// ) => {
//   if (!GRAPHQL_ENDPOINT) {
//     throw new Error(
//       "Missing RULES_API_ENDPOINT/GRAPHQL_ENDPOINT for rules GraphQL calls"
//     );
//   }

//   const token = authToken || GRAPHQL_TOKEN;
//   const shopDomain = shopDomainOverride || session?.shop;
//   const headers = {
//     "Content-Type": "application/json",
//   };

//   if (token) {
//     headers.Authorization = `Bearer ${token}`;
//     headers["X-Shopify-Access-Token"] = token;
//   }

//   if (shopDomain) headers["X-Shopify-Shop-Domain"] = shopDomain;
//   const res = await fetch(GRAPHQL_ENDPOINT, {
//     method: "POST",
//     headers,
//     body: JSON.stringify({ query, variables }),
//   });

//   if (!res.ok) {
//     const text = await res.text();
//     throw new Error(
//       `GraphQL request failed (${res.status}): ${text || res.statusText}`
//     );
//   }

//   const payload = await res.json();
//   if (payload.errors?.length) {
//     throw new Error(payload.errors[0]?.message || "GraphQL error");
//   }
//   return payload.data || {};
// };

const gqlRequest = async (session, query, variables = {}, authToken, shopDomainOverride) => {
  if (!GRAPHQL_ENDPOINT) {
    throw new Error("Missing RULES_API_ENDPOINT/GRAPHQL_ENDPOINT for rules GraphQL calls");
  }

  const token = authToken || GRAPHQL_TOKEN;
  if (!token) throw new Error("Missing GraphQL token");

  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  });

  const text = await res.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response (${res.status}): ${text?.slice(0, 300)}`);
  }

  if (!res.ok) {
    throw new Error(`GraphQL request failed (${res.status}): ${payload?.errors?.[0]?.message || text}`);
  }

  if (payload.errors?.length) {
    throw new Error(payload.errors[0]?.message || "GraphQL error");
  }

  return payload.data || {};
};


// Use formatCurrency for all currency display - supports shop currency
const fmtMoneyPlain = (n, currency = "USD") => formatCurrency(n, currency);

const STEP_SLOTS = ["step1", "step2", "step3", "step4"];
const normalizeStepSlot = (value) => {
  if (value === undefined || value === null) return "";
  const text = String(value).trim().toLowerCase();
  if (STEP_SLOTS.includes(text)) return text;
  const compact = text.replace(/[_-]/g, "").replace(/\s+/g, "");
  if (STEP_SLOTS.includes(compact)) return compact;
  const cartStepMatch = compact.match(/^cartstep0*([1-4])$/);
  if (cartStepMatch) return `step${cartStepMatch[1]}`;
  const match = text.match(/step\s*([1-4])$/);
  if (match) return `step${match[1]}`;
  const numericMatch = text.match(/([1-4])/);
  if (numericMatch) return `step${numericMatch[1]}`;
  return "";
};
const ALLOWED_TYPES = new Set(["shipping", "discount", "free"]);
const CART_STEP_LABELS = {
  step1: "Cart Step 1",
  step2: "Cart Step 2",
  step3: "Cart Step 3",
  step4: "Cart Step 4",
};

const getCartStepLabel = (slot) =>
  CART_STEP_LABELS[normalizeStepSlot(slot)] || "Cart Step";

const isCartStepEligibleRule = (section, rule = {}) => {
  if (section !== "discount") return true;
  return String(rule?.type || "automatic").toLowerCase() !== "code";
};

const getPreviousSelectedCartStepIndex = (entries = [], targetEntryIndex = -1) => {
  if (targetEntryIndex <= 0) return -1;

  return entries
    .slice(0, targetEntryIndex)
    .reduce((maxIndex, entry) => {
      const slotIndex = STEP_SLOTS.indexOf(
        normalizeStepSlot(entry.rule?.cartStepName)
      );
      return slotIndex > maxIndex ? slotIndex : maxIndex;
    }, -1);
};

const getSequentialCartStepOptions = ({
  shippingRules = [],
  discountRules = [],
  freeRules = [],
  section,
  index,
}) => {
  const entries = getCartStepRuleEntries(
    shippingRules,
    discountRules,
    freeRules
  );
  const targetEntryIndex = entries.findIndex(
    (entry) => entry.section === section && entry.index === index
  );

  if (targetEntryIndex === -1) return CART_STEP_OPTIONS;

  const previousSelectedIndex = getPreviousSelectedCartStepIndex(
    entries,
    targetEntryIndex
  );

  return CART_STEP_OPTIONS.map((option) => {
    const optionIndex = STEP_SLOTS.indexOf(normalizeStepSlot(option.value));
    return {
      ...option,
      disabled: optionIndex >= 0 && optionIndex <= previousSelectedIndex,
    };
  });
};

const parseCartStepNumber = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const number =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(number) ? number : null;
};

const getCartStepRuleEntries = (
  shippingRules = [],
  discountRules = [],
  freeRules = []
) => {
  const entries = [];
  const addEntries = (section, rules) => {
    (Array.isArray(rules) ? rules : []).forEach((rule, index) => {
      if (!isCartStepEligibleRule(section, rule)) return;
      const slot = normalizeStepSlot(rule?.cartStepName);
      entries.push({
        section,
        index,
        key: `${section}:${index}`,
        rule,
        slot,
        slotIndex: STEP_SLOTS.indexOf(slot),
      });
    });
  };

  addEntries("shipping", shippingRules);
  addEntries("discount", discountRules);
  addEntries("free", freeRules);
  return entries;
};

const cloneCartStepRuleCollections = (
  shippingRules = [],
  discountRules = [],
  freeRules = []
) => ({
  shippingRules: (Array.isArray(shippingRules) ? shippingRules : []).map(
    (rule) => ({ ...rule })
  ),
  discountRules: (Array.isArray(discountRules) ? discountRules : []).map(
    (rule) => ({ ...rule })
  ),
  freeRules: (Array.isArray(freeRules) ? freeRules : []).map((rule) => ({
    ...rule,
  })),
});

const getNextAvailableCartStepSlot = (
  shippingRules = [],
  discountRules = [],
  freeRules = []
) => {
  const highestSelectedIndex = getCartStepRuleEntries(
    shippingRules,
    discountRules,
    freeRules
  ).reduce(
    (maxIndex, entry) =>
      Math.max(
        maxIndex,
        STEP_SLOTS.indexOf(normalizeStepSlot(entry.rule?.cartStepName))
      ),
    -1
  );
  const nextSlotIndex = highestSelectedIndex + 1;

  return nextSlotIndex < STEP_SLOTS.length ? STEP_SLOTS[nextSlotIndex] : "";
};

const applySequentialCartStepChange = ({
  shippingRules = [],
  discountRules = [],
  freeRules = [],
  section,
  index,
  value,
}) => {
  const collections = cloneCartStepRuleCollections(
    shippingRules,
    discountRules,
    freeRules
  );
  const entries = getCartStepRuleEntries(
    collections.shippingRules,
    collections.discountRules,
    collections.freeRules
  );
  const targetEntryIndex = entries.findIndex(
    (entry) => entry.section === section && entry.index === index
  );

  if (targetEntryIndex === -1) return collections;

  const selectedSlot = normalizeStepSlot(value);
  const selectedSlotIndex = STEP_SLOTS.indexOf(selectedSlot);
  const previousSelectedIndex = getPreviousSelectedCartStepIndex(
    entries,
    targetEntryIndex
  );

  if (selectedSlot && selectedSlotIndex <= previousSelectedIndex) {
    return collections;
  }

  entries[targetEntryIndex].rule.cartStepName = selectedSlot;

  if (!selectedSlot) return collections;

  entries.forEach((entry, entryIndex) => {
    if (
      entryIndex !== targetEntryIndex &&
      normalizeStepSlot(entry.rule?.cartStepName) === selectedSlot
    ) {
      entry.rule.cartStepName = "";
    }
  });

  let nextSlotIndex = selectedSlotIndex + 1;
  for (
    let entryIndex = targetEntryIndex + 1;
    entryIndex < entries.length;
    entryIndex += 1
  ) {
    entries[entryIndex].rule.cartStepName =
      nextSlotIndex < STEP_SLOTS.length ? STEP_SLOTS[nextSlotIndex] : "";
    nextSlotIndex += 1;
  }

  return collections;
};

const fillMissingSequentialCartSteps = (
  shippingRules = [],
  discountRules = [],
  freeRules = []
) => {
  const collections = cloneCartStepRuleCollections(
    shippingRules,
    discountRules,
    freeRules
  );
  const entries = getCartStepRuleEntries(
    collections.shippingRules,
    collections.discountRules,
    collections.freeRules
  );
  const firstSelectedIndex = entries.findIndex(
    (entry) => STEP_SLOTS.includes(normalizeStepSlot(entry.rule?.cartStepName))
  );

  if (firstSelectedIndex === -1) return { ...collections, changed: false };

  let changed = false;
  let nextSlotIndex =
    STEP_SLOTS.indexOf(normalizeStepSlot(entries[firstSelectedIndex].rule?.cartStepName)) +
    1;

  for (
    let entryIndex = firstSelectedIndex + 1;
    entryIndex < entries.length && nextSlotIndex < STEP_SLOTS.length;
    entryIndex += 1
  ) {
    const currentSlot = normalizeStepSlot(entries[entryIndex].rule?.cartStepName);
    if (!currentSlot) {
      entries[entryIndex].rule.cartStepName = STEP_SLOTS[nextSlotIndex];
      changed = true;
      nextSlotIndex += 1;
      continue;
    }

    const currentSlotIndex = STEP_SLOTS.indexOf(currentSlot);
    nextSlotIndex =
      currentSlotIndex >= nextSlotIndex
        ? currentSlotIndex + 1
        : nextSlotIndex + 1;
  }

  return { ...collections, changed };
};

const getCartStepRuleThreshold = (section, rule = {}) => {
  if (section === "shipping") {
    return {
      metric: "amount",
      value: parseCartStepNumber(rule.minSubtotal),
    };
  }

  const triggerType = normalizeTriggerType(rule.triggerType);
  if (triggerType === "quantity") {
    return {
      metric: "quantity",
      value: parseCartStepNumber(rule.minQuantity),
    };
  }

  return {
    metric: "amount",
    value: parseCartStepNumber(rule.minPurchase),
  };
};

const getCartStepMetricLabel = (metric) =>
  metric === "quantity" ? "quantity" : "amount";

const joinCartStepLabels = (entries) => {
  const labels = entries.map((entry) => getCartStepLabel(entry.slot));
  if (labels.length <= 1) return labels[0] || "";
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
};


const normalizeHex = (hex) => {
  if (!hex || typeof hex !== "string") return null;
  const h = hex.trim();
  if (!h.startsWith("#")) return null;
  if (h.length === 4) return `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;
  if (h.length === 7) return h;
  return null;
};

const mixHexColors = (startHex, endHex, ratio) => {
  const start = normalizeHex(startHex);
  const end = normalizeHex(endHex);
  if (!start) return end || startHex || "#000000";
  if (!end) return start;
  const t = Math.max(0, Math.min(1, Number(ratio) || 0));
  const parse = (hex) => Number.parseInt(hex.slice(1), 16);
  const startNum = parse(start);
  const endNum = parse(end);
  const interpolate = (s, e) => Math.round(s + (e - s) * t);
  const r = interpolate((startNum >> 16) & 255, (endNum >> 16) & 255);
  const g = interpolate((startNum >> 8) & 255, (endNum >> 8) & 255);
  const b = interpolate(startNum & 255, endNum & 255);
  return `rgb(${r}, ${g}, ${b})`;
};

const clamp = (v) => Math.max(0, Math.min(255, v));

const darkenHex = (hex, amount = 0.18) => {
  const n = normalizeHex(hex);
  if (!n) return null;
  const num = parseInt(n.slice(1), 16);
  const r = clamp(Math.round(((num >> 16) & 255) * (1 - amount)));
  const g = clamp(Math.round(((num >> 8) & 255) * (1 - amount)));
  const b = clamp(Math.round((num & 255) * (1 - amount)));
  return `rgb(${r}, ${g}, ${b})`;
};

const lightenHex = (hex, amount = 0.18) => {
  const n = normalizeHex(hex);
  if (!n) return null;
  const num = parseInt(n.slice(1), 16);
  const r = clamp(
    Math.round(((num >> 16) & 255) + (255 - ((num >> 16) & 255)) * amount)
  );
  const g = clamp(
    Math.round(((num >> 8) & 255) + (255 - ((num >> 8) & 255)) * amount)
  );
  const b = clamp(Math.round((num & 255) + (255 - (num & 255)) * amount));
  return `rgb(${r}, ${g}, ${b})`;
};

const isCssGradient = (val) =>
  typeof val === "string" &&
  (val.includes("linear-gradient") ||
    val.includes("radial-gradient") ||
    val.includes("conic-gradient"));

const extractGradientHexColors = (value) => {
  if (!isCssGradient(value)) return null;
  const matches = value.match(/#(?:[0-9a-fA-F]{3}){1,2}/g);
  if (!matches || matches.length < 2) return null;
  return { start: matches[0], end: matches[1] };
};

const normalizeGradientColors = (background, fallbackHex) => {
  const parsed = extractGradientHexColors(background);
  if (parsed) return parsed;
  const base = normalizeHex(background) || normalizeHex(fallbackHex) || "#000000";
  return { start: base, end: base };
};

const buildLinearGradient = (start, end, fallbackHex) => {
  const safeStart = normalizeHex(start) || normalizeHex(fallbackHex) || start || "#000000";
  const safeEnd = normalizeHex(end) || normalizeHex(fallbackHex) || end || safeStart;
  return `linear-gradient(180deg, ${safeStart} 0%, ${safeEnd} 100%)`;
};

const pickNumber = (...vals) => {
  const v = vals.find((x) => x !== undefined && x !== null && x !== "");
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const pickString = (...vals) => {
  const v = vals.find((x) => typeof x === "string" && x.trim());
  return v ? v.trim() : "";
};

const getThreshold = (r) => {
  if (!r) return null;
  return pickNumber(
    r.minSubtotal,
    r.min_subtotal,
    r.minimumSubtotal,
    r.minimum_subtotal,
    r.minTotal,
    r.minTotalAmount,
    r.minPurchase,
    r.minPurchaseAmount,
    r.minAmount,
    r.minimumAmount,
    r.spendAmount,
    r.thresholdAmount,
    r.cartAmount,
    r.cartTotal,
    r.amountRequired
  );
};

const getShippingAmount = (r) =>
  pickNumber(r.amount, r.shippingAmount, r.rateAmount, r.shippingRate, r.rate);

const isFreeShipping = (r) => {
  const amt = getShippingAmount(r);
  return String(amt) === "0" || String(amt) === "0.0" || String(amt) === "0.00";
};

const getShippingText = (r) => {
  const t =
    pickString(r.shippingText, r.text, r.label, r.title, r.name) ||
    (isFreeShipping(r) ? "Free Shipping" : "Reduced Shipping");
  return isFreeShipping(r) ? "Free Shipping" : t;
};

const getDiscountMinPurchase = (r) =>
  pickNumber(
    r.minPurchase,
    r.minPurchaseAmount,
    r.minimumPurchase,
    r.minAmount,
    r.minimumAmount,
    r.spendAmount
  );

const normalizeTriggerType = (value) =>
  String(value || "amount").toLowerCase() === "quantity"
    ? "quantity"
    : "amount";

const getMinQuantity = (rule = {}) =>
  pickNumber(rule.minQuantity, rule.min_quantity, rule.quantityRequired);

const getRuleTriggerThreshold = (rule = {}) => {
  const triggerType = normalizeTriggerType(rule.triggerType);
  const value =
    triggerType === "quantity"
      ? getMinQuantity(rule)
      : getDiscountMinPurchase(rule);
  return { triggerType, value };
};

const formatQuantityPreviewValue = (value) => {
  const qty = Math.max(0, Math.ceil(Number(value) || 0));
  return `${qty} ${qty === 1 ? "item" : "items"}`;
};

const formatTriggerPreviewValue = (rule, value, currency = "USD") =>
  normalizeTriggerType(rule?.triggerType) === "quantity"
    ? formatQuantityPreviewValue(value)
    : fmtMoney(value, currency);

const getDiscountValue = (r) =>
  pickNumber(r.value, r.discountValue, r.percent, r.percentage, r.amountOff);

const buildDiscountOptionText = (r, currency = "USD") => {
  const { triggerType, value: min } = getRuleTriggerThreshold(r);
  const val = getDiscountValue(r);
  const minTxt =
    min !== null
      ? triggerType === "quantity"
        ? `Min ${min} qty `
        : `Min ${fmtMoneyPlain(min, currency)} `
      : "Min ";
  const valueType = (r.valueType || "percent").toString().toLowerCase();
  const valTxt =
    val !== null
      ? valueType === "amount"
        ? `off ${fmtMoney(val, currency)} Discount`
        : `off ${val}% Discount`
      : "off Discount";
  return `${minTxt}${valTxt}`;
};

const getDiscountValueMode = (rule) =>
  String(rule?.valueType || "percent").toLowerCase();

const formatDiscountValueDisplay = (rule, currency = "USD") => {
  const value = getDiscountValue(rule);
  if (value === null) return null;
  return getDiscountValueMode(rule) === "amount"
    ? `${fmtMoney(value, currency)} off`
    : `${value}% off`;
};

const formatDiscountStepLabelValue = (rule, currency = "USD") => {
  const value = getDiscountValue(rule);
  if (value === null) return null;
  return getDiscountValueMode(rule) === "amount"
    ? `${fmtMoneyPlain(value, currency)} Discount`
    : `${value}% Discount`;
};

const getFreeGiftMinPurchase = (r) =>
  pickNumber(
    r.minPurchase,
    r.minPurchaseAmount,
    r.minimumPurchase,
    r.minAmount,
    r.minimumAmount,
    r.spendAmount
  );

const getFreeGiftQty = (r) =>
  pickNumber(r.qty, r.quantity, r.freeQty, r.giftQty, 1);

const buildFreeGiftOptionText = (r, currency = "USD") => {
  const { triggerType, value: min } = getRuleTriggerThreshold(r);
  const qty = getFreeGiftQty(r);
  const minTxt =
    min !== null
      ? triggerType === "quantity"
        ? `Min ${min} qty `
        : `Min ${fmtMoneyPlain(min, currency)} `
      : "Min ";
  const qtyTxt =
    qty !== null ? `off ${qty} Free Product` : "off Free Product";
  return `${minTxt}${qtyTxt}`;
};

const buildFullOptionLabel = (type, rule, currency = "USD") => {
  if (!rule) return "None";

  if (type === "shipping") {
    const min = pickNumber(
      rule.minSubtotal,
      rule.min_subtotal,
      rule.minimumSubtotal,
      rule.minimum_subtotal,
      rule.minTotal,
      rule.minAmount,
      rule.minimumAmount,
      rule.spendAmount
    );
    const minTxt = min !== null ? `Min ${fmtMoneyPlain(min, currency)} - ` : "Min - ";
    return `${minTxt}${getShippingText(rule)}`;
  }

  if (type === "discount") return buildDiscountOptionText(rule, currency);
  if (type === "free") return buildFreeGiftOptionText(rule, currency);
  return "None";
};

const stepLabelForRule = (type, rule, currency = "USD") => {
  if (type === "shipping") return getShippingText(rule);
  if (type === "discount") {
    const formatted = formatDiscountStepLabelValue(rule, currency);
    return formatted || "Discount";
  }
  if (type === "free") return "Free Product";
  return "Step";
};

const iconForType = (type) => {
  if (type === "shipping") return <Icon source={DeliveryIcon} />;
  if (type === "discount") return <Icon source={DiscountIcon} />;
  return <Icon source={GiftCardIcon} />;
};

const getStepCenters = (count) => {
  if (!count || count <= 0) return [];
  if (count === 1) return [98];
  const seg = 100 / count;
  return Array.from({ length: count }, (_, i) => seg / 2 + i * seg);
};

const getStepPercents = (count) => {
  if (!count || count <= 0) return [];
  const safeCount = Math.max(1, count);
  return Array.from({ length: safeCount }, (_, idx) => {
    const raw = ((idx + 1) / safeCount) * 100;
    if (raw >= 100 && safeCount > 1) {
      return 99.99;
    }
    return Number(raw.toFixed(2));
  });
};

const computeSegmentProgressPct = (subtotal, thresholdsInOrder, centers) => {
  const n = centers.length;
  if (!n) return 0;
  const spends = thresholdsInOrder.map((t) => {
    const v = Number(t);
    return Number.isFinite(v) ? v : 0;
  });
  if (n === 1) {
    const t0 = spends[0];
    if (t0 <= 0) return 100;
    if (subtotal >= t0) return 100;
    return Math.max(0, Math.min(centers[0], (subtotal / t0) * centers[0]));
  }
  let prevSpend = 0;
  let prevPos = 0;
  for (let i = 0; i < n; i += 1) {
    const spend = spends[i];
    const pos = centers[i];
    if (subtotal < spend) {
      const denom = spend - prevSpend;
      if (denom <= 0) return prevPos;
      const ratio = (subtotal - prevSpend) / denom;
      const clamped = Math.max(0, Math.min(1, ratio));
      return prevPos + clamped * (pos - prevPos);
    }
    prevSpend = spend;
    prevPos = pos;
  }
  return 100;
};

const buildThemeFromStyles = (styles) => {
  const s = styles || {};
  const base = Number(s.base ?? 14);
  const headingScale = Number(s.headingScale ?? 1.2);
  return {
    font: String(s.font || "Inter"),
    base,
    headingScale,
    headingPx: Math.max(12, Math.round(base * headingScale)),
    radius: Number(s.radius ?? 12),
    textColor: String(s.textColor || "#111827"),
    bg: String(s.bg || "#83692f"),
    progress: String(s.progress || "rgba(255,255,255,0.35)"),
    buttonColor: String(
      s.buttonColor ?? DEFAULT_STYLE_SETTINGS.buttonColor ?? "#111827"
    ),
    borderColor: String(
      s.borderColor ?? DEFAULT_STYLE_SETTINGS.borderColor ?? "#E1E5ED"
    ),
    cartDrawerBackground: String(
      s.cartDrawerBackground || DEFAULT_STYLE_SETTINGS.cartDrawerBackground
    ),
    cartDrawerTextColor: String(s.cartDrawerTextColor || "#111827"),
    cartDrawerHeaderColor: String(s.cartDrawerHeaderColor || "#111827"),
    discountCodeApply: Boolean(Number(s.discountCodeApply ?? 0)),
    cartDrawerImage: s.cartDrawerImage ? String(s.cartDrawerImage) : "",
    cartIconUrl: s.cartIconUrl ? String(s.cartIconUrl) : "",
    cartDrawerBackgroundMode: String(
      s.cartDrawerBackgroundMode || DEFAULT_STYLE_SETTINGS.cartDrawerBackgroundMode
    ).toLowerCase(),
    checkoutButtonText: String(
      (s.checkoutButtonText || "").trim() || "Checkout"
    ),
    announcementBarBackgroundColor: String(
      s.announcementBarBackgroundColor ||
      DEFAULT_STYLE_SETTINGS.announcementBarBackgroundColor ||
      s.buttonColor ||
      "#111827"
    ),
    announcementBarTextColor: String(
      s.announcementBarTextColor ||
      DEFAULT_STYLE_SETTINGS.announcementBarTextColor ||
      s.cartDrawerTextColor ||
      "#ffffff"
    ),
    buttonLabelColor: String(
      s.buttonLabelColor || DEFAULT_STYLE_SETTINGS.buttonLabelColor || "#ffffff"
    ),
    iconColor: String(
      s.iconColor || DEFAULT_STYLE_SETTINGS.iconColor || s.textColor || "#000000"
    ),
    drawerAutoOpen: Boolean(s.drawerAutoOpen ?? DEFAULT_STYLE_SETTINGS.drawerAutoOpen),
    drawerPosition: String(s.drawerPosition || DEFAULT_STYLE_SETTINGS.drawerPosition),
    stickyCheckout: Boolean(s.stickyCheckout ?? DEFAULT_STYLE_SETTINGS.stickyCheckout),
    mobileLayout: String(s.mobileLayout || DEFAULT_STYLE_SETTINGS.mobileLayout),
  };
};

const deriveCartStepsFromRules = (
  shippingRules = [],
  discountRules = [],
  freeRules = []
) => {
  const assignment = {};
  const assignSelectedSlot = (type, rules) => {
    (Array.isArray(rules) ? rules : []).forEach((rule) => {
      const slot = normalizeStepSlot(rule?.cartStepName);
      if (!STEP_SLOTS.includes(slot)) return;
      const id = rule?.id;
      if (!id) return;
      assignment[slot] = `${type}:${id}`;
    });
  };

  const eligibleDiscountRules = (Array.isArray(discountRules) ? discountRules : []).filter(
    (rule) => {
      const type = String(rule?.type ?? "").toLowerCase();
      return type === "automatic";
    }
  );
  assignSelectedSlot("shipping", shippingRules);
  assignSelectedSlot("discount", eligibleDiscountRules);
  assignSelectedSlot("free", freeRules);
  return STEP_SLOTS.map((slot) => assignment[slot] ?? "");
};

const composeRulesResponse = ({
  payload,
  shop,
  minAmountRule,
  planId,
  planSelected,
  upsellSettings,
  currencyCode,
}) => ({
  ...payload,
  shop,
  currencyCode: String(currencyCode || "USD").toUpperCase(),
  minAmountRule: seedMinAmountRule(minAmountRule),
  planId: planId || "free",
  planSelected: Boolean(planSelected),
  upsellSettings: upsellSettings || DEFAULT_UPSELL_SETTINGS,
});

const LOAD_RULES_QUERY = `
  query LoadRules($shop: String!) {
    shippingRules(shop: $shop) {
      id
      enabled
      rewardType
      rateType
      amount
      minSubtotal
      method
      progressTextBefore
      progressTextAfter
      progressTextBelow
      campaignName
      cartStepName
      iconChoice
      shopifyRateId
      shopifyMethodDefinitionId
      startsAt
      endsAt
      priority
      customerTarget
      customerTags
      templateKey
      abTestEnabled
      abTestVariant
      translations
      analyticsImpressions
      analyticsConversions
    }

    discountRules(shop: $shop) {
      id
      enabled
      type
      condition
      value
      minPurchase
      triggerType
      minQuantity
      iconChoice
      discountCode
      progressTextBefore
      progressTextAfter
      quantityProgressTextBefore
      quantityProgressTextAfter
      progressTextBelow
      campaignName
      codeCampaignName
      cartStepName
      startsAt
      endsAt
      priority
      customerTarget
      customerTags
      templateKey
      abTestEnabled
      abTestVariant
      translations
      analyticsImpressions
      analyticsConversions
    }

    freeGiftRules(shop: $shop) {
      id
      enabled
      trigger
      minPurchase
      triggerType
      minQuantity
      bonus
      qty
      limit
      replaceFree
      excludeCOD
      removeOnCOD
      iconChoice
      progressTextBefore
      progressTextAfter
      quantityProgressTextBefore
      quantityProgressTextAfter
      progressTextBelow
      campaignName
      cartStepName
      startsAt
      endsAt
      priority
      customerTarget
      customerTags
      templateKey
      abTestEnabled
      abTestVariant
      translations
      analyticsImpressions
      analyticsConversions
    }

    bxgyRules(shop: $shop) {
      enabled
      xQty
      yQty
      scope
      appliesTo
      giftType
      giftSku
      maxGifts
      allowStacking
      iconChoice
      beforeOfferUnlockMessage
      afterOfferUnlockMessage
      campaignName
      startsAt
      endsAt
      priority
      customerTarget
      customerTags
      templateKey
      abTestEnabled
      abTestVariant
      translations
      analyticsImpressions
      analyticsConversions

    }

    styleSettings(shop: $shop) {
      font
      base
      headingScale
      radius
      textColor
      bg
      progress
      cartDrawerBackground
      cartDrawerTextColor
      cartDrawerHeaderColor
      discountCodeApply
      cartDrawerBackgroundMode
      cartDrawerImage
      checkoutButtonText
      announcementBarBackgroundColor
      announcementBarTextColor
      buttonLabelColor
      iconColor
      drawerAutoOpen
      drawerPosition
      stickyCheckout
      mobileLayout
    }
  }
`;

const SAVE_SHIPPING_MUTATION = `
  mutation SaveShippingRules($shop: String!, $rules: [ShippingRuleInput!]!) {
    saveShippingRules(shop: $shop, rules: $rules) {
      ok
      message
    }
  }
`;

const SAVE_DISCOUNT_MUTATION = `
  mutation SaveDiscountRules($shop: String!, $rules: [DiscountRuleInput!]!) {
    saveDiscountRules(shop: $shop, rules: $rules) {
      ok
      message
    }
  }
`;

const SAVE_FREE_MUTATION = `
  mutation SaveFreeGiftRules($shop: String!, $rules: [FreeGiftRuleInput!]!) {
    saveFreeGiftRules(shop: $shop, rules: $rules) {
      ok
      message
    }
  }
`;

const SAVE_BXGY_MUTATION = `
  mutation SaveBxgyRules($shop: String!, $rules: [BxgyRuleInput!]!) {
    saveBxgyRules(shop: $shop, rules: $rules) {
      ok
      message
    }
  }
`;

const SAVE_STYLE_SETTINGS_MUTATION = `
  mutation SaveStyleSettings($shop: String!, $settings: StyleSettingsInput!) {
    saveStyleSettings(shop: $shop, settings: $settings) {
      ok
      message
    }
  }
`;

// Shopify Admin: fetch delivery profile zones (no fragments; dynamic $id)

const DELIVERY_PROFILE_ZONES_QUERY = `
  query DeliveryProfileZones($id: ID!) {
    deliveryProfile(id: $id) {
      id
      name
      profileLocationGroups {
        locationGroup { id }
        locationGroupZones(first: 20) {
          edges {
            node {
              zone {
                id
                name
                countries {
                  code { countryCode restOfWorld }
                  provinces { code name }
                }

                deliveryMethods(first: 50) {
                  edges {
                    node {
                      id
                      name
                      active
                      description
                      rateDefinition {
                        __typename
                        ... on DeliveryRateDefinition {
                          id
                          price {
                            amount
                            currencyCode
                          }
                        }
                      }

                      methodConditions {
                        field
                        operator
                        conditionCriteria {
                          __typename
                          ... on MoneyV2 {
                            amount
                            currencyCode
                          }
                          ... on Weight {
                            value
                            unit
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

// Use centralized API version from shopify.server.js
const ADMIN_API_VERSION = apiVersion;

const ENABLE_SHOPIFY_SHIPPING_SYNC =
  process.env.ENABLE_SHOPIFY_SHIPPING_SYNC !== "false";
const createDefaultShippingRule = () => ({
  enabled: true,
  rewardType: "free",
  rateType: "flat",
  amount: "0",
  minSubtotal: "300",
  method: "standard",
  iconChoice: "truck",
  icon: null,
  shopifyRateId: null,
  shopifyMethodDefinitionId: null,
  progressTextBefore: DEFAULT_STYLE_SETTINGS.progressTextBefore,
  progressTextAfter: DEFAULT_STYLE_SETTINGS.progressTextAfter,
  progressTextBelow: DEFAULT_STYLE_SETTINGS.progressTextBelow,
  campaignName: "Free Shipping",
  cartStepName: "step1",
  startsAt: null,
  endsAt: null,
  ...normalizeAdvancedRuleFields({}),
});

const createDefaultShippingRules = () => [createDefaultShippingRule()];
const createDefaultDiscountRule = (overrides = {}) => {
  const normalizedType = overrides?.type || "automatic";
  const contentDefaults = getDiscountContentDefaults(normalizedType);

  return {
    enabled: true,
    type: "automatic",
    rewardType: "percent",
    valueType: "percent",
    value: "10",
    minPurchase: "500",
    triggerType: "amount",
    minQuantity: "2",
    iconChoice: "tag",
    scope: "all",
    appliesTo: { products: [], collections: [] },
    discountCode: "",
    icon: null,
    progressTextBefore:
      overrides.progressTextBefore ?? contentDefaults.progressTextBefore,
    progressTextAfter:
      overrides.progressTextAfter ?? contentDefaults.progressTextAfter,
    quantityProgressTextBefore:
      overrides.quantityProgressTextBefore ??
      contentDefaults.quantityProgressTextBefore,
    quantityProgressTextAfter:
      overrides.quantityProgressTextAfter ??
      contentDefaults.quantityProgressTextAfter,
    progressTextBelow:
      overrides.progressTextBelow ?? contentDefaults.progressTextBelow,
    campaignName: "Automatic Discount",
    codeCampaignName:
      normalizedType === "code" ? "Code Discount" : "",
    cartStepName: "",
    startsAt: null,
    endsAt: null,
    ...normalizeAdvancedRuleFields({}),
    ...overrides,
  };
};

const createDefaultCodeDiscountRule = () =>
  createDefaultDiscountRule({
    type: "code",
    condition: "code",
    discountCode: DEFAULT_DISCOUNT_CODE,
  });

const createDefaultFreeRule = () => ({
  enabled: true,
  trigger: "payment_online",
  minPurchase: "1000",
  triggerType: "amount",
  minQuantity: "2",
  bonus: "",
  qty: "1",
  limit: "1",
  replaceFree: true,
  excludeCOD: false,
  removeOnCOD: true,
  iconChoice: "gift",
  progressTextBefore: DEFAULT_FREE_GIFT_CONTENT_TEXT.progressTextBefore,
  progressTextAfter: DEFAULT_FREE_GIFT_CONTENT_TEXT.progressTextAfter,
  quantityProgressTextBefore:
    DEFAULT_FREE_GIFT_CONTENT_TEXT.quantityProgressTextBefore,
  quantityProgressTextAfter:
    DEFAULT_FREE_GIFT_CONTENT_TEXT.quantityProgressTextAfter,
  progressTextBelow: DEFAULT_FREE_GIFT_CONTENT_TEXT.progressTextBelow,
  campaignName: "Free Product Rule",
  cartStepName: "",
  icon: null,
  startsAt: null,
  endsAt: null,
  ...normalizeAdvancedRuleFields({}),
});

const createDefaultBxgyRule = () => ({
  enabled: true,
  xQty: "3",
  yQty: "1",
  scope: "product",
  appliesTo: { products: [], collections: [] },
  giftType: "same",
  giftSku: "",
  maxGifts: "2",
  allowStacking: false,
  iconChoice: "sparkles",
  beforeOfferUnlockMessage:
    DEFAULT_BXGY_CONTENT_TEXT.beforeOfferUnlockMessage,
  afterOfferUnlockMessage: DEFAULT_BXGY_CONTENT_TEXT.afterOfferUnlockMessage,
  icon: null,
  campaignName: "Buy X Get Y Rule",
  startsAt: null,
  endsAt: null,
  ...normalizeAdvancedRuleFields({}),
});

const DEFAULT_MIN_AMOUNT_RULE = {
  minPurchase: "1500",
  bonusProductId: "",
  qty: "1",
  limitPerOrder: "1",
  enabled: true,
  freeProductDiscountID: null,
  minAmountFreeGiftDiscountId: null,
  id: null,
  allProductIds: [],
};

const DISCOUNT_RULE_SELECT = {
  id: true,
  shop: true,
  type: true,
  value: true,
  minPurchase: true,
  triggerType: true,
  minQuantity: true,
  enabled: true,
  createdAt: true,
  updatedAt: true,
  iconChoice: true,
  shopifyDiscountCodeId: true,
  shopifyPriceRuleId: true,
  discountCode: true,
  progressTextBefore: true,
  progressTextAfter: true,
  quantityProgressTextBefore: true,
  quantityProgressTextAfter: true,
  progressTextBelow: true,
  campaignName: true,
  cartStepName: true,
  codeCampaignName: true,
  valueType: true,
  appliesTo: true,
  codeDiscountId: true,
  condition: true,
  rewardType: true,
  scope: true,
  startsAt: true,
  endsAt: true,
  priority: true,
  customerTarget: true,
  customerTags: true,
  templateKey: true,
  abTestEnabled: true,
  abTestVariant: true,
  translations: true,
  analyticsImpressions: true,
  analyticsConversions: true,
};

const FREE_GIFT_RULE_SELECT = {
  id: true,
  shop: true,
  trigger: true,
  minPurchase: true,
  triggerType: true,
  minQuantity: true,
  qty: true,
  limitPerOrder: true,
  enabled: true,
  createdAt: true,
  updatedAt: true,
  iconChoice: true,
  bonusProductId: true,
  freeProductDiscountID: true,
  minAmountFreeGiftDiscountId: true,
  minAmountShippingRateId: true,
  allProductIds: true,
  progressTextBefore: true,
  progressTextAfter: true,
  quantityProgressTextBefore: true,
  quantityProgressTextAfter: true,
  progressTextBelow: true,
  campaignName: true,
  cartStepName: true,
  startsAt: true,
  endsAt: true,
  priority: true,
  customerTarget: true,
  customerTags: true,
  templateKey: true,
  abTestEnabled: true,
  abTestVariant: true,
  translations: true,
  analyticsImpressions: true,
  analyticsConversions: true,
};

const normalizeRawRuleRow = (row) => ({
  ...row,
  enabled: Boolean(row.enabled),
  abTestEnabled: Boolean(row.abTestEnabled),
  triggerType: row.triggerType ?? "amount",
});

const fetchDiscountRulesByShop = async (shop) => {
  try {
    const rows = await prisma.$queryRaw`
      SELECT id, shop, type, value, minPurchase, triggerType, minQuantity, enabled,
             createdAt, updatedAt, iconChoice, shopifyDiscountCodeId, shopifyPriceRuleId,
             discountCode, progressTextBefore, progressTextAfter,
             quantityProgressTextBefore, quantityProgressTextAfter, progressTextBelow,
             campaignName, cartStepName, codeCampaignName, valueType, appliesTo,
             codeDiscountId, \`condition\`, rewardType, scope, startsAt, endsAt,
             priority, customerTarget, customerTags, templateKey, abTestEnabled,
             abTestVariant, translations, analyticsImpressions, analyticsConversions
      FROM discountrule WHERE shop = ${shop} ORDER BY id ASC
    `;
    return rows.map(normalizeRawRuleRow);
  } catch (err) {
    // Migration not yet applied on this DB — retry without the new optional columns
    if (/Unknown column/i.test(String(err?.message))) {
      logger.warn("fetchDiscountRulesByShop: quantityProgressText columns missing, using fallback query");
      const rows = await prisma.$queryRaw`
        SELECT id, shop, type, value, minPurchase, triggerType, minQuantity, enabled,
               createdAt, updatedAt, iconChoice, shopifyDiscountCodeId, shopifyPriceRuleId,
               discountCode, progressTextBefore, progressTextAfter,
               NULL AS quantityProgressTextBefore, NULL AS quantityProgressTextAfter,
               progressTextBelow, campaignName, cartStepName, codeCampaignName,
               valueType, appliesTo, codeDiscountId, \`condition\`, rewardType, scope,
               startsAt, endsAt, priority, customerTarget, customerTags, templateKey,
               abTestEnabled, abTestVariant, translations,
               analyticsImpressions, analyticsConversions
        FROM discountrule WHERE shop = ${shop} ORDER BY id ASC
      `;
      return rows.map(normalizeRawRuleRow);
    }
    throw err;
  }
};

const fetchFreeGiftRulesByShop = async (shop) => {
  try {
    const rows = await prisma.$queryRaw`
      SELECT id, shop, \`trigger\`, minPurchase, triggerType, minQuantity, qty, limitPerOrder,
             enabled, createdAt, updatedAt, iconChoice, bonusProductId, freeProductDiscountID,
             minAmountFreeGiftDiscountId, minAmountShippingRateId, allProductIds,
             progressTextBefore, progressTextAfter,
             quantityProgressTextBefore, quantityProgressTextAfter, progressTextBelow,
             campaignName, cartStepName, startsAt, endsAt,
             priority, customerTarget, customerTags, templateKey, abTestEnabled,
             abTestVariant, translations, analyticsImpressions, analyticsConversions
      FROM freegiftrule WHERE shop = ${shop} ORDER BY id ASC
    `;
    return rows.map(normalizeRawRuleRow);
  } catch (err) {
    if (/Unknown column/i.test(String(err?.message))) {
      logger.warn("fetchFreeGiftRulesByShop: quantityProgressText columns missing, using fallback query");
      const rows = await prisma.$queryRaw`
        SELECT id, shop, \`trigger\`, minPurchase, triggerType, minQuantity, qty, limitPerOrder,
               enabled, createdAt, updatedAt, iconChoice, bonusProductId, freeProductDiscountID,
               minAmountFreeGiftDiscountId, minAmountShippingRateId, allProductIds,
               progressTextBefore, progressTextAfter,
               NULL AS quantityProgressTextBefore, NULL AS quantityProgressTextAfter,
               progressTextBelow, campaignName, cartStepName, startsAt, endsAt,
               priority, customerTarget, customerTags, templateKey, abTestEnabled,
               abTestVariant, translations, analyticsImpressions, analyticsConversions
        FROM freegiftrule WHERE shop = ${shop} ORDER BY id ASC
      `;
      return rows.map(normalizeRawRuleRow);
    }
    throw err;
  }
};

const seedMinAmountRule = (rule) => {
  const fallback = {
    ...DEFAULT_MIN_AMOUNT_RULE,
    allProductIds: [...DEFAULT_MIN_AMOUNT_RULE.allProductIds],
  };

  if (!rule) return fallback;
  return {
    ...fallback,
    ...rule,
    allProductIds: rule.allProductIds ?? fallback.allProductIds,
    minAmountFreeGiftDiscountId:
      rule.minAmountFreeGiftDiscountId ?? fallback.minAmountFreeGiftDiscountId,
  };
};

const CONTENT_SETTINGS_ICON = () => (
  <svg viewBox="0 0 20 20" focusable="false" aria-hidden="true">
    <path d="M15.747 2.354c.195-.196.512-.196.707 0l1.06 1.06c.196.195.196.512 0 .707l-.956.957-1.768-1.767.957-.957Z" />
    <path d="m14.083 4.018 1.768 1.768-2.831 2.83c-.359.359-.84.568-1.348.585l-.772.025c-.144.005-.263-.113-.258-.258l.026-.772c.016-.507.225-.989.584-1.348l2.83-2.83Z" />
    <path d="M5.5 5.75c0-.69.56-1.25 1.25-1.25h4.5c.414 0 .75-.336.75-.75s-.336-.75-.75-.75h-4.5c-1.519 0-2.75 1.231-2.75 2.75v8.5c0 1.519 1.231 2.75 2.75 2.75h6.5c1.519 0 2.75-1.231 2.75-2.75v-4.5c0-.414-.336-.75-.75-.75s-.75.336-.75.75v4.5c0 .69-.56 1.25-1.25 1.25h-6.5c-.69 0-1.25-.56-1.25-1.25v-8.5Z" />
    <path d="M7.75 12.75c-.414 0-.75.336-.75.75s.336.75.75.75h2.5c.414 0 .75-.336.75-.75s-.336-.75-.75-.75h-2.5Z" />
    <path d="M7 10.75c0-.414.336-.75.75-.75h4.5c.414 0 .75.336.75.75s-.336.75-.75.75h-4.5c-.414 0-.75-.336-.75-.75Z" />
  </svg>
);

const DEFAULT_DISCOUNT_CODE = "Smart123";

const DEFAULT_STYLE_SETTINGS = {
  font: "inter",
  base: "12",
  headingScale: "1.25",
  radius: "0",
  textColor: "#000000",
  bg: "#ffffff",
  progress: "#000000",
  buttonColor: "#000000",
  borderColor: "#E1E5ED",
  cartDrawerBackground: "linear-gradient(180deg, #ffffff 0%, #f9f9f9 100%)",
  cartDrawerTextColor: "#000000",
  cartDrawerHeaderColor: "#000000",
  discountCodeApply: false,
  cartDrawerBackgroundMode: "color",
  cartDrawerImage: "",
  cartIconUrl: "",
  progressTextBefore: "Add {{goal}} more to get Free Shipping with this order",
  progressTextAfter: "🎉🎉 Congratulations! You have unlocked Free Shipping! 🎉🎉",
  checkoutButtonText: "Checkout",
  announcementBarBackgroundColor: "#000000",
  announcementBarTextColor: "#ffffff",
  buttonLabelColor: "#ffffff",
  iconColor: "#000000",
  drawerAutoOpen: true,
  drawerPosition: "right",
  stickyCheckout: true,
  mobileLayout: "drawer",
};

const DEFAULT_UPSELL_SETTINGS = {
  enabled: true,
  showAsSlider: true,
  autoplay: true,
  recommendationMode: "auto",
  sectionTitle: "You may also like",
  buttonText: "Add to cart",
  buttonColor: "#ffffff",
  backgroundColor: "#F8FAFC",
  textColor: "#0F172A",
  borderColor: "#E2E8F0",
  arrowColor: "#111827",
  selectedProductIds: [],
  selectedCollectionIds: [],
};

const DEFAULT_PROGRESS_TEXT = {
  before: "Add {{goal}} more to get Free Shipping on this order",
  after: "dYZ% Congratulations! You have unlocked Free Shipping!",
  below: "Free Shipping!",
};

const DEFAULT_AUTO_DISCOUNT_CONTENT_TEXT = {
  progressTextBefore: "Add {{goal}} more to unlock {{discount_value_with_off}} Discount!",
  progressTextAfter: "🎉🎉 Congratulations! {{discount_value_with_off}} Discount!",
  quantityProgressTextBefore: "Add {{goal}} more to unlock {{discount_value_with_off}} Discount!",
  quantityProgressTextAfter: "🎉🎉 Congratulations! {{discount_value_with_off}} Discount!",
  progressTextBelow: "{{discount_value_with_off}} Discount!",
};

const DEFAULT_CODE_DISCOUNT_CONTENT_TEXT = {
  progressTextBefore: "Add {{goal}} more to use code {{discount_code}} and get {{discount_value_with_off}}!",
  progressTextAfter: "🎉🎉 {{discount_value_with_off}} Discount!",
  quantityProgressTextBefore: "Add {{goal}} more to use code {{discount_code}} and get {{discount_value_with_off}}!",
  quantityProgressTextAfter: "🎉🎉 {{discount_value_with_off}} Discount!",
  progressTextBelow: "{{discount_value_with_off}} Discount!",
};

const getDiscountContentDefaults = (ruleType = "automatic") =>
  ruleType === "code"
    ? DEFAULT_CODE_DISCOUNT_CONTENT_TEXT
    : DEFAULT_AUTO_DISCOUNT_CONTENT_TEXT;

const getProgressTextFieldForTrigger = (rule, phase) => {
  const isQuantity = normalizeTriggerType(rule?.triggerType) === "quantity";
  if (phase === "before") {
    return isQuantity ? "quantityProgressTextBefore" : "progressTextBefore";
  }
  if (phase === "after") {
    return isQuantity ? "quantityProgressTextAfter" : "progressTextAfter";
  }
  return "progressTextBelow";
};

const getProgressTextDefaultForTrigger = (rule, defaults, phase) => {
  const field = getProgressTextFieldForTrigger(rule, phase);
  const fallbackField =
    phase === "before"
      ? "progressTextBefore"
      : phase === "after"
        ? "progressTextAfter"
        : "progressTextBelow";
  return defaults?.[field] ?? defaults?.[fallbackField] ?? "";
};

const getProgressTextForTrigger = (rule, defaults, phase) => {
  const field = getProgressTextFieldForTrigger(rule, phase);
  const fallbackField =
    phase === "before"
      ? "progressTextBefore"
      : phase === "after"
        ? "progressTextAfter"
        : "progressTextBelow";
  return (
    rule?.[field] ??
    rule?.[fallbackField] ??
    getProgressTextDefaultForTrigger(rule, defaults, phase)
  );
};

const DEFAULT_FREE_GIFT_CONTENT_TEXT = {
  progressTextBefore: "Add {{goal}} more to unlock a Free Product!",
  progressTextAfter: "🎉🎉 Congratulations! Your Free Product is unlocked",
  quantityProgressTextBefore: "Add {{goal}} more to unlock a Free Product!",
  quantityProgressTextAfter: "🎉🎉 Congratulations! Your Free Product is unlocked",
  progressTextBelow: "FREE Product",
};

const DEFAULT_BXGY_CONTENT_TEXT = {
  beforeOfferUnlockMessage: "Add {{x}} more items to get {{y}} free",
  afterOfferUnlockMessage: "🎉🎉 Congratulations! You've earned a free item",
};


const DISCOUNT_SLIDE_ANIMATION = `
  @keyframes discountPreviewSlide {
    0%, 45% { transform: translateX(0); }
    55%, 100% { transform: translateX(-50%); }
  }
`;

const ANNOUNCEMENT_MARQUEE_ANIMATION = `
  @keyframes previewMarqueeSlide {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  .preview-marquee {
    overflow: hidden;
  }
  .preview-marquee-track {
    display: flex;
    width: 200%;
    animation: previewMarqueeSlide 18s linear infinite;
  }
  .preview-marquee-track:hover {
    animation-play-state: paused;
  }
  .preview-marquee-item {
    padding: 8px 26px;
    white-space: nowrap;
    display: inline-flex;
    align-items: center;
    font-weight: 600;
  }
`;

const UPSELL_CAROUSEL_ANIMATION = `
  @keyframes upsellCarouselSlide {
    0%, 45% { transform: translateX(0); }
    55%, 100% { transform: translateX(-50%); }
  }
  .upsell-carousel {
    position: relative;
    overflow: hidden;
  }
  .upsell-carousel-track {
    display: flex;
    gap: 12px;
    will-change: transform;
  }
  .upsell-carousel-track.autoplay {
    animation: upsellCarouselSlide 6s ease-in-out infinite;
  }
`;

const RURAL_DRAWER_IMAGE =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80";

const normalizeIds = (value) =>
  Array.isArray(value) ? [...new Set(value.map(String))].sort() : [];

const parseJsonArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return normalizeIds(value);
  try {
    const parsed = JSON.parse(value);
    return normalizeIds(parsed);
  } catch {
    return [];
  }
};

const parseAppliesToValue = (value) => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return {
      products: normalizeIds(value.products),
      collections: normalizeIds(value.collections),
    };
  }

  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return {
          products: normalizeIds(parsed.products),
          collections: normalizeIds(parsed.collections),
        };
      }
    } catch {
      // ignore invalid JSON and fall back to empty lists
    }
  }

  return { products: [], collections: [] };
};

const toIsoDateOrNull = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const padDatePart = (value) => String(value).padStart(2, "0");

const toLocalDateInputValue = (value, fallback = null) => {
  const iso = toIsoDateOrNull(value);
  const date = iso ? new Date(iso) : fallback;
  if (!date || Number.isNaN(date.getTime())) return "";
  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate()),
  ].join("-");
};

const toLocalTimeInputValue = (value, fallback = null) => {
  const iso = toIsoDateOrNull(value);
  const date = iso ? new Date(iso) : fallback;
  if (!date || Number.isNaN(date.getTime())) return "";
  return `${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`;
};

const combineLocalDateAndTime = (dateValue, timeValue) => {
  if (!dateValue) return null;
  const time = timeValue || "00:00";
  const date = new Date(`${dateValue}T${time}`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const normalizeScheduleFields = (rule = {}) => ({
  startsAt: toIsoDateOrNull(rule.startsAt),
  endsAt: toIsoDateOrNull(rule.endsAt),
});

const parseJsonObject = (value, fallback = {}) => {
  if (!value) return fallback;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed
        : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
};

const normalizeAdvancedRuleFields = (rule = {}) => ({
  priority: Number.isFinite(Number(rule.priority)) ? Number(rule.priority) : 0,
  customerTarget: String(rule.customerTarget || "all"),
  customerTags: String(rule.customerTags || ""),
  templateKey: rule.templateKey || null,
  abTestEnabled: Boolean(rule.abTestEnabled),
  abTestVariant: String(rule.abTestVariant || "A"),
  translations: parseJsonObject(rule.translations, {}),
  analyticsImpressions: Number(rule.analyticsImpressions || 0),
  analyticsConversions: Number(rule.analyticsConversions || 0),
});

const persistAdvancedRuleFields = (rule = {}) => {
  const advanced = normalizeAdvancedRuleFields(rule);
  const trans = advanced.translations;
  const transJson =
    trans && Object.keys(trans).length > 0
      ? JSON.stringify(trans)
      : null;
  return {
    priority: advanced.priority,
    customerTarget: advanced.customerTarget,
    customerTags: advanced.customerTags || null,
    templateKey: advanced.templateKey || null,
    abTestEnabled: Boolean(advanced.abTestEnabled),
    abTestVariant: advanced.abTestVariant || null,
    translations: transJson,
  };
};

const stripRuleAdminFields = (rule = {}) => {
  const {
    priority,
    customerTarget,
    customerTags,
    templateKey,
    abTestEnabled,
    abTestVariant,
    translations,
    analyticsImpressions,
    analyticsConversions,
    _ruleIndex,
    ...rest
  } = rule;
  return rest;
};

const scheduleInputFields = (rule = {}) => ({
  startsAt: toIsoDateOrNull(rule.startsAt) || new Date().toISOString(),
  endsAt: toIsoDateOrNull(rule.endsAt),
});

const isRuleScheduleActive = (rule = {}, now = new Date()) => {
  const nowTime = now.getTime();
  const startsAt = toIsoDateOrNull(rule.startsAt);
  const endsAt = toIsoDateOrNull(rule.endsAt);
  if (startsAt && new Date(startsAt).getTime() > nowTime) return false;
  if (endsAt && new Date(endsAt).getTime() < nowTime) return false;
  return true;
};

const ensureStyleCartIconColumn = async () => {
  try {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE `stylesettings` ADD COLUMN `cartIconUrl` VARCHAR(191) NULL"
    );
  } catch (error) {
    const message = String(error?.message || "");
    const code = String(error?.code || "");
    if (
      code === "P2010" ||
      message.includes("Duplicate column") ||
      message.includes("1060")
    ) {
      return;
    }
    throw error;
  }
};

const persistStyleCartIconUrl = async (shop, cartIconUrl) => {
  await ensureStyleCartIconColumn();
  await prisma.$executeRaw`
    UPDATE stylesettings
    SET cartIconUrl = ${cartIconUrl}
    WHERE shop = ${shop}
  `;
};

const mergeStyleCartIconUrl = async (styleRow) => {
  if (!styleRow?.shop || styleRow.cartIconUrl) return styleRow;

  try {
    await ensureStyleCartIconColumn();
    const rows = await prisma.$queryRaw`
      SELECT cartIconUrl
      FROM stylesettings
      WHERE id = ${styleRow.id}
      LIMIT 1
    `;
    const cartIconUrl = Array.isArray(rows) ? rows[0]?.cartIconUrl : null;
    return { ...styleRow, cartIconUrl: cartIconUrl || "" };
  } catch (error) {
    logger.warn("Failed to load style cart icon URL", error);
    return styleRow;
  }
};

const normalizeBxgyAppliesTo = (rule = {}) => {
  const parsed = parseAppliesToValue(rule.appliesTo);
  const fallbackProducts = parseJsonArray(rule.appliesProductIds);
  const fallbackCollections = parseJsonArray(rule.appliesCollectionIds);
  return {
    products: parsed.products.length ? parsed.products : fallbackProducts,
    collections: parsed.collections.length
      ? parsed.collections
      : fallbackCollections,
  };
};

const normalizeShippingRuleForKey = (rule = {}) => ({
  enabled: Boolean(rule.enabled),
  rewardType: rule.rewardType || "free",
  rateType: rule.rewardType === "reduced" ? "flat" : rule.rateType || "flat",
  amount: rule.amount ?? "",
  minSubtotal: rule.minSubtotal ?? "",
  method: rule.method || "standard",
  iconChoice: rule.iconChoice || "truck",
  progressTextBefore: rule.progressTextBefore ?? "",
  progressTextAfter: rule.progressTextAfter ?? "",
  progressTextBelow: rule.progressTextBelow ?? "",
  campaignName: rule.campaignName ?? "",
  cartStepName: normalizeStepSlot(rule.cartStepName),
  shopifyRateId: rule.shopifyRateId || null,
  shopifyMethodDefinitionId: rule.shopifyMethodDefinitionId || null,
  ...normalizeScheduleFields(rule),
  ...normalizeAdvancedRuleFields(rule),
});

const normalizeDiscountRuleForKey = (rule = {}) => ({
  id: rule.id ?? null,
  enabled: Boolean(rule.enabled),
  type: rule.type || "automatic",
  condition: rule.type === "code" ? "code" : rule.condition || "all_payments",
  rewardType: "percent",
  valueType: rule.valueType || "percent",
  value: rule.value ?? "",
  minPurchase: rule.minPurchase ?? "",
  triggerType: normalizeTriggerType(rule.triggerType),
  minQuantity: rule.minQuantity ?? "",
  iconChoice: rule.iconChoice || "tag",
  shopifyDiscountCodeId: rule.shopifyDiscountCodeId || null,
  scope: rule.scope || "all",
  appliesTo: parseAppliesToValue(rule.appliesTo),
  discountCode: rule.discountCode || "",
  codeCampaignName: rule.codeCampaignName || "",
  progressTextBefore: rule.progressTextBefore ?? "",
  progressTextAfter: rule.progressTextAfter ?? "",
  quantityProgressTextBefore: rule.quantityProgressTextBefore ?? "",
  quantityProgressTextAfter: rule.quantityProgressTextAfter ?? "",
  progressTextBelow: rule.progressTextBelow ?? "",
  campaignName: rule.campaignName ?? "",
  cartStepName: normalizeStepSlot(rule.cartStepName),
  ...normalizeScheduleFields(rule),
  ...normalizeAdvancedRuleFields(rule),
});

const normalizeFreeRuleForKey = (rule = {}) => ({
  id: rule.id ?? null,
  enabled: Boolean(rule.enabled),
  trigger: rule.trigger || "payment_online",
  minPurchase: rule.minPurchase ?? "",
  triggerType: normalizeTriggerType(rule.triggerType),
  minQuantity: rule.minQuantity ?? "",
  bonus: rule.bonus ?? rule.bonusProductId ?? "",
  qty: rule.qty ?? "",
  limit: rule.limit ?? "",
  replaceFree: Boolean(rule.replaceFree),
  excludeCOD: Boolean(rule.excludeCOD),
  removeOnCOD: Boolean(rule.removeOnCOD),
  iconChoice: rule.iconChoice || "gift",
  progressTextBefore: rule.progressTextBefore ?? "",
  progressTextAfter: rule.progressTextAfter ?? "",
  quantityProgressTextBefore: rule.quantityProgressTextBefore ?? "",
  quantityProgressTextAfter: rule.quantityProgressTextAfter ?? "",
  progressTextBelow: rule.progressTextBelow ?? "",
  campaignName: rule.campaignName ?? "",
  cartStepName: normalizeStepSlot(rule.cartStepName),
  ...normalizeScheduleFields(rule),
  ...normalizeAdvancedRuleFields(rule),
});

const sanitizeHtmlErrorText = (text) => {
  if (!text) return null;
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (trimmed.toUpperCase().startsWith("<!DOCTYPE")) {
    return "Authentication or endpoint error (received HTML page instead of JSON).";
  }

  if (trimmed.length > 400) {
    return `${trimmed.slice(0, 400)}...`;
  }
  return trimmed;
};

const normalizeBxgyRuleForKey = (rule = {}) => ({
  enabled: Boolean(rule.enabled),
  xQty: rule.xQty ?? "1",
  yQty: rule.yQty ?? "1",
  scope: rule.appliesStore ? "store" : rule.scope || "product",
  appliesTo: normalizeBxgyAppliesTo(rule),

  giftType: rule.giftType || "same",
  giftSku: rule.giftSku ?? "",
  maxGifts: rule.maxGifts ?? "",
  allowStacking: Boolean(rule.allowStacking),
  iconChoice: rule.iconChoice || "sparkles",
  beforeOfferUnlockMessage: rule.beforeOfferUnlockMessage ?? "",
  afterOfferUnlockMessage: rule.afterOfferUnlockMessage ?? "",
  campaignName: rule.campaignName ?? "",
  id: rule.id ?? null,
  buyxgetyId: rule.buyxgetyId || null,
  ...normalizeScheduleFields(rule),
  ...normalizeAdvancedRuleFields(rule),
});

const dedupeRules = (rules = [], normalizer) => {
  if (!normalizer || normalizer === normalizeShippingRuleForKey) {
    return Array.isArray(rules) ? [...rules] : [];
  }

  const seen = new Set();
  return (Array.isArray(rules) ? rules : []).filter((rule) => {
    const key = JSON.stringify(normalizer(rule));
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const normalizerForSection = {
  shipping: normalizeShippingRuleForKey,
  discount: normalizeDiscountRuleForKey,
  free: normalizeFreeRuleForKey,
  bxgy: normalizeBxgyRuleForKey,
};

const buildRulesPayload = (data = {}) => {
  const shippingRows = data.shippingRules || [];
  const discountRows = data.discountRules || [];
  const freeRows = data.freeGiftRules || [];
  const bxgyRows = data.bxgyRules || [];
  const styleRow = data.styleSettings || null;
  const shippingRules = dedupeRules(
    shippingRows.length > 0
      ? shippingRows.map((rule) => ({
        enabled: Boolean(rule.enabled),
        rewardType: rule.rewardType || "free",
        rateType:
          rule.rewardType === "reduced" ? "flat" : rule.rateType || "flat",
        amount: rule.amount ?? "",
        minSubtotal: rule.minSubtotal ?? "",
        method: rule.method || "standard",
        iconChoice: rule.iconChoice || "truck",
        progressTextBefore:
          rule.progressTextBefore ??
          DEFAULT_STYLE_SETTINGS.progressTextBefore,
        progressTextAfter:
          rule.progressTextAfter ?? DEFAULT_STYLE_SETTINGS.progressTextAfter,
        progressTextBelow:
          rule.progressTextBelow ?? DEFAULT_STYLE_SETTINGS.progressTextBelow,
        campaignName: rule.campaignName || "Free Shipping",
        cartStepName: normalizeStepSlot(rule.cartStepName),
        shopifyRateId: normalizeShopifyRateId(rule.shopifyRateId),
        shopifyMethodDefinitionId: normalizeShopifyRateId(
          rule.shopifyMethodDefinitionId
        ),
        ...normalizeScheduleFields(rule),
        ...normalizeAdvancedRuleFields(rule),
        icon: null,
        id: rule.id ?? null,
      }))
      : [], // do not auto-seed shipping rules; avoid unexpected re-add
    normalizeShippingRuleForKey
  );

  const discountRules = dedupeRules(
    discountRows.length > 0
      ? discountRows.map((rule) => {
        const normalizedType = rule.type || "automatic";
        const discountDefaults = getDiscountContentDefaults(normalizedType);
        return {
          enabled: Boolean(rule.enabled),
          type: normalizedType,
          condition:
            rule.condition || (rule.type === "code" ? "code" : "all_payments"),
          rewardType: rule.rewardType || "percent",
          valueType: rule.valueType || "percent",
          value: rule.value ?? "",
          minPurchase: rule.minPurchase ?? "",
          triggerType: normalizeTriggerType(rule.triggerType),
          minQuantity: rule.minQuantity ?? "",
          iconChoice: rule.iconChoice || "tag",
          scope: rule.scope || "all",
          appliesTo: parseAppliesToValue(rule.appliesTo),
          shopifyDiscountCodeId: rule.shopifyDiscountCodeId || null,
          codeDiscountId: rule.codeDiscountId ?? null,
          discountCode: rule.discountCode || "",
          icon: null,
          progressTextBefore:
            rule.progressTextBefore ?? discountDefaults.progressTextBefore,
          progressTextAfter:
            rule.progressTextAfter ?? discountDefaults.progressTextAfter,
          quantityProgressTextBefore:
            rule.quantityProgressTextBefore ??
            discountDefaults.quantityProgressTextBefore,
          quantityProgressTextAfter:
            rule.quantityProgressTextAfter ??
            discountDefaults.quantityProgressTextAfter,
          progressTextBelow:
            String(rule.progressTextBelow ?? "").trim() ||
            discountDefaults.progressTextBelow,
          campaignName: rule.campaignName || "Discount Rule",
          codeCampaignName:
            normalizedType === "code"
              ? rule.codeCampaignName || "Code Discount"
              : rule.codeCampaignName || "",
          cartStepName: normalizeStepSlot(rule.cartStepName),
          ...normalizeScheduleFields(rule),
          ...normalizeAdvancedRuleFields(rule),
          id: rule.id ?? null,
        };
      })
      : [createDefaultDiscountRule()],
    normalizeDiscountRuleForKey
  );

  const freeRules = dedupeRules(
    freeRows.length > 0
      ? freeRows.map((rule) => ({
        enabled: Boolean(rule.enabled),
        trigger: rule.trigger || "payment_online",
        minPurchase: rule.minPurchase ?? "",
        triggerType: normalizeTriggerType(rule.triggerType),
        minQuantity: rule.minQuantity ?? "",
        bonus: rule.bonus ?? rule.bonusProductId ?? "",
        qty: rule.qty ?? "1",
        limit: rule.limit ?? "1",
        replaceFree: Boolean(rule.replaceFree),
        excludeCOD: Boolean(rule.excludeCOD),
        removeOnCOD: Boolean(rule.removeOnCOD),
        iconChoice: rule.iconChoice || "gift",
        progressTextBefore:
          rule.progressTextBefore ??
          DEFAULT_FREE_GIFT_CONTENT_TEXT.progressTextBefore,
        progressTextAfter:
          rule.progressTextAfter ??
          DEFAULT_FREE_GIFT_CONTENT_TEXT.progressTextAfter,
        quantityProgressTextBefore:
          rule.quantityProgressTextBefore ??
          DEFAULT_FREE_GIFT_CONTENT_TEXT.quantityProgressTextBefore,
        quantityProgressTextAfter:
          rule.quantityProgressTextAfter ??
          DEFAULT_FREE_GIFT_CONTENT_TEXT.quantityProgressTextAfter,
        progressTextBelow:
          rule.progressTextBelow ??
          DEFAULT_FREE_GIFT_CONTENT_TEXT.progressTextBelow,
        campaignName: rule.campaignName || "Free Product Rule",
        cartStepName: normalizeStepSlot(rule.cartStepName),
        ...normalizeScheduleFields(rule),
        ...normalizeAdvancedRuleFields(rule),
        id: rule.id ?? null,
        freeProductDiscountID: rule.freeProductDiscountID ?? null,
        icon: null,
      }))
      : [createDefaultFreeRule()],
    normalizeFreeRuleForKey
  );

  const bxgyRules = dedupeRules(
    bxgyRows.length > 0
      ? bxgyRows.map((rule) => {
        const appliesTo = normalizeBxgyAppliesTo(rule);
        return {
          id: rule.id,
          enabled: Boolean(rule.enabled),
          xQty: rule.xQty ?? "1",
          yQty: rule.yQty ?? "1",
          scope: rule.appliesStore ? "store" : rule.scope || "product",
          appliesTo,
          giftType: rule.giftType || "same",
          giftSku: rule.giftSku ?? "",
          maxGifts: rule.maxGifts ?? "",
          allowStacking: Boolean(rule.allowStacking),
          iconChoice: rule.iconChoice || "sparkles",
          beforeOfferUnlockMessage:
            rule.beforeOfferUnlockMessage ??
            DEFAULT_BXGY_CONTENT_TEXT.beforeOfferUnlockMessage,
          afterOfferUnlockMessage:
            rule.afterOfferUnlockMessage ??
            DEFAULT_BXGY_CONTENT_TEXT.afterOfferUnlockMessage,
          campaignName: rule.campaignName || "",
          buyxgetyId: rule.buyxgetyId || null,
          ...normalizeScheduleFields(rule),
          ...normalizeAdvancedRuleFields(rule),
          icon: null,
        };
      })
      : [createDefaultBxgyRule()],
    normalizeBxgyRuleForKey
  );

  const style = styleRow
    ? {
      font: styleRow.font,
      base: styleRow.base || "16",
      headingScale: styleRow.headingScale || "1.25",
      radius: styleRow.radius,
      textColor: styleRow.textColor || "#111111",
      bg: styleRow.bg || "#FFFFFF",
      progress: styleRow.progress || "#1B84F1",
      buttonColor: styleRow.buttonColor || DEFAULT_STYLE_SETTINGS.buttonColor,
      borderColor: styleRow.borderColor || DEFAULT_STYLE_SETTINGS.borderColor,
      cartDrawerBackground:
        styleRow.cartDrawerBackground || DEFAULT_STYLE_SETTINGS.cartDrawerBackground,
      cartDrawerTextColor: styleRow.cartDrawerTextColor || "",
      cartDrawerHeaderColor: styleRow.cartDrawerHeaderColor || "",
      cartDrawerImage: styleRow.cartDrawerImage || "",
      cartIconUrl: styleRow.cartIconUrl || "",
      cartDrawerBackgroundMode:
        styleRow.cartDrawerBackgroundMode || DEFAULT_STYLE_SETTINGS.cartDrawerBackgroundMode,
      discountCodeApply: Boolean(styleRow.discountCodeApply),
      checkoutButtonText:
        styleRow.checkoutButtonText || DEFAULT_STYLE_SETTINGS.checkoutButtonText,
      announcementBarBackgroundColor:
        styleRow.announcementBarBackgroundColor ||
        DEFAULT_STYLE_SETTINGS.announcementBarBackgroundColor,
      announcementBarTextColor:
        styleRow.announcementBarTextColor || DEFAULT_STYLE_SETTINGS.announcementBarTextColor,
      buttonLabelColor:
        styleRow.buttonLabelColor || DEFAULT_STYLE_SETTINGS.buttonLabelColor,
      iconColor: styleRow.iconColor || DEFAULT_STYLE_SETTINGS.iconColor,
      drawerAutoOpen:
        styleRow.drawerAutoOpen ?? DEFAULT_STYLE_SETTINGS.drawerAutoOpen,
      drawerPosition:
        styleRow.drawerPosition || DEFAULT_STYLE_SETTINGS.drawerPosition,
      stickyCheckout:
        styleRow.stickyCheckout ?? DEFAULT_STYLE_SETTINGS.stickyCheckout,
      mobileLayout: styleRow.mobileLayout || DEFAULT_STYLE_SETTINGS.mobileLayout,
    }
    : DEFAULT_STYLE_SETTINGS;

  return {
    shippingRules,
    discountRules,
    freeRules,
    bxgyRules,
    style,
  };
};

const persistPrismaRules = async ({
  model,
  shop,
  normalizedRules = [],
  existingRows = [],
  mapRuleData,
}) => {
  const rowIds = [];
  const existingById = new Map(
    existingRows
      .filter((row) => row?.id)
      .map((row) => [String(row.id), row])
  );
  const keptIds = new Set();

  for (let i = 0; i < normalizedRules.length; i += 1) {
    const rule = normalizedRules[i];
    const rawData = mapRuleData ? mapRuleData(rule) : rule;
    const { id, shop: _shop, createdAt, updatedAt, ...data } = rawData || {};
    const incomingId = rule?.id ?? id ?? null;
    const existing =
      incomingId && existingById.has(String(incomingId))
        ? existingById.get(String(incomingId))
        : existingRows[i];

    if (existing?.id) {
      await model.update({
        where: { id: existing.id },
        data,
      });
      rowIds.push(existing.id);
      keptIds.add(existing.id);
    } else {
      const created = await model.create({
        data: { shop, ...data },
      });
      rowIds.push(created.id);
      keptIds.add(created.id);
    }
  }

  const removals = existingRows.filter((row) => row?.id && !keptIds.has(row.id));
  const removeIds = removals
    .map((row) => (row?.id ? row.id : null))
    .filter(Boolean);
  if (removeIds.length) {
    await model.deleteMany({ where: { id: { in: removeIds } } });
  }
  return rowIds;
};

const persistShopifyRateIdForRule = async ({
  shop,
  ruleIndex,
  shopifyRateId,
  shopifyMethodDefinitionId,
  ruleIndexToRowId,
}) => {
  const normalizedRateId = normalizeShopifyRateId(shopifyRateId);
  const normalizedMethodDefinitionId = normalizeShopifyRateId(
    shopifyMethodDefinitionId
  );
  if (
    !shop ||
    !Number.isInteger(ruleIndex) ||
    ruleIndex < 0 ||
    (!normalizedRateId && !normalizedMethodDefinitionId)
  ) {
    return;
  }
  const targetId = ruleIndexToRowId.get(ruleIndex);
  if (!targetId) return;
  const data = {};
  if (normalizedRateId) data.shopifyRateId = normalizedRateId;
  if (normalizedMethodDefinitionId)
    data.shopifyMethodDefinitionId = normalizedMethodDefinitionId;
  if (!Object.keys(data).length) return;
  await prisma.shippingRule.update({
    where: { id: targetId },
    data,
  });
};

const loadCurrentRulesForSection = async (
  section,
  shop,
  session,
  shopAccessToken,
  shopDomain
) => {
  const sectionKeyMap = {
    shipping: "shippingRules",
    discount: "discountRules",
    free: "freeRules",
    bxgy: "bxgyRules",
  };

  const key = sectionKeyMap[section];

  if (!key) return [];

  if (GRAPHQL_ENDPOINT) {
    try {
      const data = await gqlRequest(
        session,
        LOAD_RULES_QUERY,
        { shop },
        shopAccessToken,
        shopDomain
      );
      const payload = buildRulesPayload(data);
      return payload[key] || [];
    } catch (err) {
      logger.warn(
        `Load current ${section} rules via GraphQL failed, falling back to Prisma`,
        err
      );
    }
  }

  try {
    if (section === "shipping") {
      const rows = await prisma.shippingRule.findMany({
        where: { shop },
        orderBy: { id: "asc" },
      });
      return buildRulesPayload({ shippingRules: rows })[key] || [];
    }

    if (section === "discount") {
      const rows = await fetchDiscountRulesByShop(shop);
      return buildRulesPayload({ discountRules: rows })[key] || [];
    }

    if (section === "free") {
      const rows = await fetchFreeGiftRulesByShop(shop);

      return (
        buildRulesPayload({
          freeGiftRules: rows.map((rule) => ({
            ...rule,
            bonus: rule.bonusProductId,
            limit: rule.limitPerOrder,
            replaceFree: createDefaultFreeRule().replaceFree,
            excludeCOD: false,
            removeOnCOD: false,
          })),
        })[key] || []
      );
    }

    if (section === "bxgy") {
      const rows = await prisma.bxgyRule.findMany({
        where: { shop },
        orderBy: { id: "asc" },
      });

      return (
        buildRulesPayload({
          bxgyRules: rows.map((rule) => ({
            ...rule,
            appliesTo: rule.appliesTo,
            appliesProductIds: rule.appliesProductIds,
            appliesCollectionIds: rule.appliesCollectionIds,
            appliesStore: rule.appliesStore,
          })),
        })[key] || []
      );
    }
  } catch (err) {
    logger.warn(`Load current ${section} rules via Prisma failed`, err);
  }
  return [];
};


const loadMinAmountRuleForShop = async (shop) => {
  if (!shop) return null;

  try {
    return await prisma.freeGiftRule.findFirst({
      where: { shop, trigger: "min_amount" },
      orderBy: { id: "desc" },
    });
  } catch (err) {
    logger.warn("Failed to load min amount free gift rule", err);

    return null;
  }
};

const loadLegacyUpsellButtonColor = async (shop) => {
  if (!shop) return null;
  try {
    const styleRow = await prisma.styleSettings.findFirst({
      where: { shop },
      orderBy: { id: "desc" },
      select: { buttonColor: true },
    });
    return styleRow?.buttonColor ?? null;
  } catch {
    return null;
  }
};

const ICON_OPTIONS = [
  { label: "? Sparkles", value: "sparkles" },
  { label: "?? Delivery", value: "truck" },
  { label: "??? Tag", value: "tag" },
  { label: "?? Gift", value: "gift" },
  { label: "? Star", value: "star" },
  { label: "?? Fire", value: "fire" },
  { label: "? Check", value: "check" },
  { label: "?? Cart", value: "cart" },
];

const CART_STEP_OPTIONS = [
  { label: "Cart Step 1", value: "step1" },
  { label: "Cart Step 2", value: "step2" },
  { label: "Cart Step 3", value: "step3" },
  { label: "Cart Step 4", value: "step4" },
];

const ICON_POLARIS = {
  sparkles: MagicIcon,
  truck: DeliveryIcon,
  tag: DiscountIcon,
  gift: GiftCardIcon,
  star: StarFilledIcon,
  fire: StarFilledIcon,
  check: CheckSmallIcon,
  cart: CartIcon,
};

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const sessionShop = session.shop;
  const shop = sessionShop || null;
  const sessionAccessToken = session?.accessToken
    ? String(session.accessToken)
    : null;
  const { shopDomain, shopAccessToken } = await resolveShopAdminAccess(
    shop,
    sessionAccessToken
  );

  if (!shop || !shopAccessToken) {
    return json(
      {
        error:
          "Missing Shopify Admin access token for this shop. Reinstall app once.",
      },
      { status: 401 }
    );
  }

  const currencyCode = await fetchShopCurrency(shopDomain, shopAccessToken);

  const planRecord = await prisma.planSubscription.findUnique({
    where: { shop },
  });
  const planId = planRecord?.planId ?? "free";
  const planSelected = Boolean(planRecord);

  let payload = null;

  if (GRAPHQL_ENDPOINT) {
    try {
      const data = await gqlRequest(
        session,
        LOAD_RULES_QUERY,
        { shop },
        shopAccessToken,
        shopDomain
      );

      payload = buildRulesPayload(data);
    } catch (error) {
      logger.error(
        "Failed to load rules via GraphQL, falling back to Prisma",
        error
      );
    }
  }

  if (!payload) {
    try {
      const [shippingRows, discountRows, freeRows, bxgyRows, styleRow] =
        await Promise.all([
          prisma.shippingRule.findMany({
            where: { shop },
            orderBy: { id: "asc" },
          }),

          fetchDiscountRulesByShop(shop),

          fetchFreeGiftRulesByShop(shop),

          prisma.bxgyRule.findMany({ where: { shop }, orderBy: { id: "asc" } }),
          prisma.styleSettings.findFirst({
            where: { shop },
            orderBy: { id: "desc" },
          }),
        ]);
      const styleRowWithCartIcon = await mergeStyleCartIconUrl(styleRow);
      let upsellRow = null;
      try {
        upsellRow = await prisma.upsellSettings.findUnique({
          where: { shop },
        });
      } catch (err) {
        logger.warn("Upsell settings table missing or unavailable", err);
      }

      const fallbackData = {
        shippingRules: shippingRows,
        discountRules: discountRows,
        freeGiftRules: freeRows.map((rule) => ({
          ...rule,
          bonus: rule.bonusProductId,
          limit: rule.limitPerOrder,
          replaceFree: createDefaultFreeRule().replaceFree,
          excludeCOD: false,
          removeOnCOD: false,
          id: rule.id,
          freeProductDiscountID: rule.freeProductDiscountID,
        })),

        bxgyRules: bxgyRows.map((rule) => ({
          ...rule,
          appliesTo: rule.appliesTo,
          appliesProductIds: rule.appliesProductIds,
          appliesCollectionIds: rule.appliesCollectionIds,
          appliesStore: rule.appliesStore,
        })),
      };

      const upsellSettings = upsellRow
        ? {
            enabled: Boolean(upsellRow.enabled),
            showAsSlider: Boolean(upsellRow.showAsSlider),
            autoplay: Boolean(upsellRow.autoplay),
            recommendationMode:
              upsellRow.recommendationMode ?? DEFAULT_UPSELL_SETTINGS.recommendationMode,
            sectionTitle:
              upsellRow.sectionTitle ?? DEFAULT_UPSELL_SETTINGS.sectionTitle,
            buttonText: upsellRow.buttonText ?? DEFAULT_UPSELL_SETTINGS.buttonText,
            buttonColor:
              upsellRow.buttonColor ?? DEFAULT_UPSELL_SETTINGS.buttonColor,
            backgroundColor:
              upsellRow.backgroundColor ?? DEFAULT_UPSELL_SETTINGS.backgroundColor,
            textColor: upsellRow.textColor ?? DEFAULT_UPSELL_SETTINGS.textColor,
            borderColor:
              upsellRow.borderColor ?? DEFAULT_UPSELL_SETTINGS.borderColor,
            arrowColor: upsellRow.arrowColor ?? DEFAULT_UPSELL_SETTINGS.arrowColor,
            selectedProductIds: parseJsonArray(upsellRow.selectedProductIds),
            selectedCollectionIds: parseJsonArray(upsellRow.selectedCollectionIds),
          }
        : DEFAULT_UPSELL_SETTINGS;

      payload = buildRulesPayload({
        ...fallbackData,
        styleSettings: styleRowWithCartIcon,
      });
    } catch (dbError) {
      logger.error("Fallback to Prisma failed", dbError);
      const minAmountRule = await loadMinAmountRuleForShop(shop);
      return json(
        {
          error: "Failed to load rules",
          ...composeRulesResponse({
            payload: {
              shippingRules: createDefaultShippingRules(),
              discountRules: [createDefaultDiscountRule()],
              freeRules: [createDefaultFreeRule()],
              bxgyRules: [createDefaultBxgyRule()],
              style: DEFAULT_STYLE_SETTINGS,
            },
            shop,
            minAmountRule,
            planId,
            planSelected,
            upsellSettings: DEFAULT_UPSELL_SETTINGS,
            currencyCode,
          }),
        },
        { status: 200 }
      );
    }
  }

  const minAmountRule = await loadMinAmountRuleForShop(shop);
  const legacyUpsellButtonColor = await loadLegacyUpsellButtonColor(shop);

  let upsellRow = null;
  try {
    upsellRow = await prisma.upsellSettings.findUnique({
      where: { shop },
    });
  } catch (err) {
    logger.warn("Upsell settings table missing or unavailable", err);
  }
  const upsellSettings = upsellRow
    ? {
        enabled: Boolean(upsellRow.enabled),
        showAsSlider: Boolean(upsellRow.showAsSlider),
        autoplay: Boolean(upsellRow.autoplay),
        recommendationMode:
          upsellRow.recommendationMode ?? DEFAULT_UPSELL_SETTINGS.recommendationMode,
        sectionTitle:
          upsellRow.sectionTitle ?? DEFAULT_UPSELL_SETTINGS.sectionTitle,
        buttonText: upsellRow.buttonText ?? DEFAULT_UPSELL_SETTINGS.buttonText,
        buttonColor:
          upsellRow.buttonColor ??
          legacyUpsellButtonColor ??
          DEFAULT_UPSELL_SETTINGS.buttonColor,
        backgroundColor:
          upsellRow.backgroundColor ?? DEFAULT_UPSELL_SETTINGS.backgroundColor,
        textColor: upsellRow.textColor ?? DEFAULT_UPSELL_SETTINGS.textColor,
        borderColor:
          upsellRow.borderColor ?? DEFAULT_UPSELL_SETTINGS.borderColor,
        arrowColor: upsellRow.arrowColor ?? DEFAULT_UPSELL_SETTINGS.arrowColor,
        selectedProductIds: parseJsonArray(upsellRow.selectedProductIds),
        selectedCollectionIds: parseJsonArray(upsellRow.selectedCollectionIds),
      }
    : DEFAULT_UPSELL_SETTINGS;

  return json(
    composeRulesResponse({
      payload,
      shop,
      minAmountRule,
      planId,
      planSelected,
      upsellSettings,
      currencyCode,
    })
  );
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    try {
      const formData = await request.formData();
      const intent = String(formData.get("intent") || "");
      if (intent !== "uploadCartIcon") {
        return json({ error: "Unknown upload intent" }, { status: 400 });
      }

      const cartIconUrl = await uploadCartIconFile(formData.get("cartIcon"));
      return json({ ok: true, cartIconUrl });
    } catch (error) {
      return json(
        {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Unable to upload cart icon.",
        },
        { status: 400 }
      );
    }
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid payload" }, { status: 400 });
  }

  const {
    section,
    payload,
    index,
    partial,
    deleteShopifyBxgy,
    deleteShopifyDiscount,
    deleteBxgyRuleId: deleteBxgyRuleIdRaw,
    deleteFreeRuleId: deleteFreeRuleIdRaw,
    deleteFreeProductDiscount,
    shop: shopFromBody,
  } = body ?? {};

  const deleteBxgyRuleIdValue =
    deleteBxgyRuleIdRaw !== undefined && deleteBxgyRuleIdRaw !== null
      ? Number(deleteBxgyRuleIdRaw)
      : null;

  const deleteBxgyRuleId = Number.isFinite(deleteBxgyRuleIdValue)
    ? deleteBxgyRuleIdValue
    : null;

  const deleteFreeRuleIdValue =
    deleteFreeRuleIdRaw !== undefined && deleteFreeRuleIdRaw !== null
      ? Number(deleteFreeRuleIdRaw)
      : null;

  const deleteFreeRuleId = Number.isFinite(deleteFreeRuleIdValue)
    ? deleteFreeRuleIdValue
    : null;

  // Always use session.shop — never trust shop from the request body
  const shop = session.shop;

  if (!shop) {
    const message =
      "Shop URL not available in session. Please open the app from Shopify and try again.";

    logger.error("[App Rules] cannot save without shop domain", {
      url: new URL(request.url).pathname,
    });

    return json({ error: message }, { status: 400 });
  }

  // Bust the proxy cache so storefront sees updated rules immediately after save
  invalidateShopCache(shop);

  if (
    !section &&
    !deleteShopifyBxgy &&
    !deleteShopifyDiscount &&
    !deleteBxgyRuleId &&
    !deleteFreeRuleId &&
    !deleteFreeProductDiscount
  ) {
    return json({ error: "Missing section" }, { status: 400 });
  }

  let responseMessage = "Settings saved successfully.";

  let payloadForLog = null;

  let shopifySyncError = "";

  try {
    const sessionAccessToken = session?.accessToken
      ? String(session.accessToken)
      : null;
    const { shopDomain, shopAccessToken } = await resolveShopAdminAccess(
      shop,
      sessionAccessToken
    );

    if (!shopAccessToken) {
      return json(
        {
          error:
            "Missing Shopify Admin access token for this shop. Reinstall app once.",
        },
        { status: 401 }
      );
    }
    let freeGiftAllProductsCollectionId = null;

    if (shopAccessToken && shopDomain) {
      try {
        freeGiftAllProductsCollectionId = await resolveAllProductsCollectionId(
          shopDomain,
          shopAccessToken
        );
      } catch (resolveErr) {
        logger.warn(
          "Failed to resolve all-products collection for free gift sync",
          resolveErr
        );
      }
    }

    if (section === "discountActivation") {
      const activationPayload =
        payload && typeof payload === "object" && !Array.isArray(payload)
          ? payload
          : {};
      const discountIdValue =
        activationPayload.discountId ??
        activationPayload.shopifyDiscountCodeId ??
        activationPayload.shopifyDiscountId ??
        activationPayload.id ??
        "";
      const discountId =
        typeof discountIdValue === "string"
          ? discountIdValue.trim()
          : discountIdValue
            ? String(discountIdValue).trim()
            : "";
      if (!discountId) {
        return json(
          { error: "Missing automatic discount ID for activation toggle" },
          { status: 400 }
        );
      }

      if (!shopAccessToken) {
        return json(
          {
            error:
              "Missing Shopify Admin access token for automatic discount toggles.",
          },
          { status: 401 }
        );
      }

      const ruleType =
        typeof activationPayload.type === "string"
          ? activationPayload.type.toLowerCase()
          : "";
      const isCodeRule = ruleType === "code";
      const mutation = activationPayload.enabled
        ? isCodeRule
          ? DISCOUNT_CODE_ACTIVATE_MUTATION
          : AUTOMATIC_DISCOUNT_ACTIVATE_MUTATION
        : isCodeRule
          ? DISCOUNT_CODE_DEACTIVATE_MUTATION
          : AUTOMATIC_DISCOUNT_DEACTIVATE_MUTATION;
      try {
        await adminGraphql(shopDomain, shopAccessToken, mutation, {
          id: discountId,
        });
        const normalizedEnabled = Boolean(activationPayload.enabled);
        if (ruleType === "bxgy") {
          await prisma.bxgyRule.updateMany({
            where: {
              shop,
              buyxgetyId: discountId,
            },
            data: { enabled: normalizedEnabled },
          });
        } else {
          await prisma.discountRule.updateMany({
            where: {
              shop,
              OR: [
                { shopifyDiscountCodeId: discountId },
                { codeDiscountId: discountId },
              ],
            },
            data: { enabled: normalizedEnabled },
          });
        }
      } catch (toggleErr) {
        const message =
          toggleErr instanceof Error ? toggleErr.message : "";
        const ignored =
          message &&
          message.toLowerCase().includes("does not exist");
        if (!ignored) {
          logger.warn(
            "Automatic discount toggle reported error",
            toggleErr
          );
          return json(
            {
              error:
                toggleErr instanceof Error
                  ? toggleErr.message
                  : "Failed to update automatic discount status",
            },
            { status: 500 }
          );
        } else {
          logger.log(
            "Automatic discount toggle reported error (ignored)",
            toggleErr
          );
        }
      }

      return json({ ok: true });
    }

    if (deleteShopifyBxgy || deleteBxgyRuleId) {
      if (deleteShopifyBxgy) {
        if (!shopAccessToken) {
          return json(
            { error: "Missing Shopify Admin access token for BXGY removal." },
            { status: 401 }
          );
        }

        try {
          await deleteShopifyDiscountById(
            shopDomain,
            shopAccessToken,
            deleteShopifyBxgy
          );
        } catch (err) {
          logger.error(
            "Failed to delete Shopify BXGY discount from admin removal",
            err
          );

          return json(
            { error: "Failed to delete Shopify BXGY discount" },
            { status: 500 }
          );
        }
      }

      try {
        const ruleDeleteWhere = deleteBxgyRuleId
          ? { shop, id: deleteBxgyRuleId }
          : deleteShopifyBxgy
            ? { shop, buyxgetyId: deleteShopifyBxgy }
            : null;

        if (ruleDeleteWhere) {
          await prisma.bxgyRule.deleteMany({
            where: ruleDeleteWhere,
          });
        }
      } catch (err) {
        logger.error("Failed to delete BXGY rule", err);

        return json(
          { error: "Failed to delete BXGY rule" },

          { status: 500 }
        );
      }

      return json({ ok: true });
    }

    if (section === "freeGiftMinAmount") {
      const rulePayload = payload || {};
      const minPurchase = String(rulePayload.minPurchase ?? "").trim();
      const bonusProductId = String(rulePayload.bonusProductId ?? "").trim();
      const qtyRaw = rulePayload.qty !== undefined ? String(rulePayload.qty).trim() : "";

      const limitRaw =
        rulePayload.limitPerOrder !== undefined
          ? String(rulePayload.limitPerOrder).trim()
          : "";

      const enabled = Boolean(rulePayload.enabled);
      const fieldErrors = {};
      const minPurchaseValue = Number(minPurchase);

      if (
        !minPurchase ||
        Number.isNaN(minPurchaseValue) ||
        minPurchaseValue <= 0
      ) {
        fieldErrors.minPurchase = "Enter an amount greater than zero.";
      }

      if (!bonusProductId) {
        fieldErrors.bonusProductId = "Please provide the free gift variant ID.";
      }

      const qtyNumber = qtyRaw === "" ? null : Number(qtyRaw);
      if (qtyRaw && (Number.isNaN(qtyNumber) || qtyNumber < 1)) {
        fieldErrors.qty = "Quantity must be at least 1.";
      }

      const limitNumber = limitRaw === "" ? null : Number(limitRaw);
      if (limitRaw && (Number.isNaN(limitNumber) || limitNumber < 1)) {
        fieldErrors.limitPerOrder = "Limit must be at least 1.";
      }

      if (Object.keys(fieldErrors).length) {
        return json({
          validationFailed: true,
          validationMessage: "Please address the highlighted fields before saving.",
          fieldErrors,
          formValues: {
            minPurchase,
            bonusProductId,
            qty: qtyRaw,
            limitPerOrder: limitRaw,
            enabled,
          },
        });
      }

      const existingRule = await prisma.freeGiftRule.findFirst({
        where: { shop: shopDomain, trigger: "min_amount" },
      });

      const payloadAllProductIds = Array.isArray(rulePayload.allProductIds)
        ? rulePayload.allProductIds
        : existingRule?.allProductIds ?? [];

      const normalized = {
        minPurchase,
        bonusProductId,
        qty: qtyRaw || null,
        limitPerOrder: limitRaw || null,
        enabled,
        allProductIds: payloadAllProductIds,
        minAmountFreeGiftDiscountId:
          existingRule?.minAmountFreeGiftDiscountId ?? null,
      };

      let savedRule = existingRule
        ? await prisma.freeGiftRule.update({
          where: { id: existingRule.id },
          data: {
            ...normalized,
          },
        })
        : await prisma.freeGiftRule.create({
          data: {
            shop: shopDomain,
            trigger: "min_amount",
            ...normalized,
          },
        });

      const accessToken = shopAccessToken;

      let syncError = null;

      if (!accessToken) {
        syncError =
          "Missing Shopify Admin access token for free gift discount sync.";
      } else {
        try {
          const syncResult = await syncMinAmountFreeGiftDiscount({
            shopDomain,
            accessToken,
            rule: savedRule,
          });

          const nextId = "id" in syncResult ? syncResult.id : null;

          await prisma.freeGiftRule.update({
            where: { id: savedRule.id },
            data: {
              freeProductDiscountID: nextId,
              minAmountFreeGiftDiscountId: nextId,
            },
          });
        } catch (err) {
          logger.error("Free gift min amount sync failed", err);
          syncError =
            err instanceof Error ? err.message : "Unknown Shopify sync error.";
        }
      }

      const refreshedRule = await prisma.freeGiftRule.findUnique({
        where: { id: savedRule.id },
      });

      return json({
        payload: { rule: refreshedRule },
        shopifySyncError: syncError,
      });
    }

    if (deleteShopifyDiscount) {
      if (!shopAccessToken) {
        return json(
          {
            error:
              "Missing Shopify Admin access token for discount removal via admin.",
          },
          { status: 401 }
        );
      }

      try {
        await deleteShopifyDiscountById(
          shopDomain,
          shopAccessToken,
          deleteShopifyDiscount
        );
      } catch (err) {
        logger.error(
          "Failed to delete Shopify discount from admin removal",
          err
        );
        return json(
          { error: "Failed to delete Shopify discount" },
          { status: 500 }
        );
      }

      await prisma.discountRule.deleteMany({
        where: { shop, shopifyDiscountCodeId: deleteShopifyDiscount },
      });
      return json({ ok: true });
    }

    if (deleteFreeRuleId || deleteFreeProductDiscount) {
      if (deleteFreeProductDiscount && !shopAccessToken) {
        return json(
          {
            error:
              "Missing Shopify Admin access token for free gift discount removal.",
          },
          { status: 401 }
        );
      }

      if (deleteFreeProductDiscount) {
        try {
          await deleteShopifyDiscountById(
            shopDomain,
            shopAccessToken,
            deleteFreeProductDiscount
          );
        } catch (err) {
          logger.error(
            "Failed to delete Shopify free gift discount from admin removal",
            err
          );
          return json(
            { error: "Failed to delete Shopify free gift discount" },
            { status: 500 }
          );
        }
      }

      const deleteFilter = {
        shop,
        ...(deleteFreeRuleId ? { id: deleteFreeRuleId } : {}),
        ...(deleteFreeProductDiscount
          ? { freeProductDiscountID: deleteFreeProductDiscount }
          : {}),
      };

      await prisma.freeGiftRule.deleteMany({ where: deleteFilter });
      return json({ ok: true });
    }

    const mergeRulesWithExisting = async (
      sectionName,
      incomingRules,
      incomingIndex
    ) => {
      if (!partial || !Number.isInteger(incomingIndex)) return incomingRules;

      const existingRules = await loadCurrentRulesForSection(
        sectionName,
        shop,
        session,
        shopAccessToken,
        shopDomain
      );

      if (!existingRules || !incomingRules.length) return incomingRules;

      const next = Array.isArray(existingRules)
        ? [...existingRules]
        : [...incomingRules];

      const incomingRule = incomingRules[0];
      if (!incomingRule) return incomingRules;
      const existingRule =
        Array.isArray(existingRules) && existingRules.length
          ? existingRules[incomingIndex]
          : undefined;
      if (existingRule) {
        next[incomingIndex] = {
          ...existingRule,
          ...incomingRule,
          shopifyDiscountCodeId:
            incomingRule.shopifyDiscountCodeId ??
            existingRule.shopifyDiscountCodeId ??
            null,
        };
      } else {
        next[incomingIndex] = incomingRule;
      }
      const normalizer = normalizerForSection[sectionName];
      return normalizer ? dedupeRules(next, normalizer) : next;
    };

    switch (section) {
      case "shipping": {
        const existingShippingRules = await prisma.shippingRule.findMany({
          where: { shop },
          orderBy: { id: "asc" },
        });

        const rules = dedupeRules(payload, normalizeShippingRuleForKey);
        const mergedRules = await mergeRulesWithExisting(
          "shipping",
          rules,
          index
        );

        const normalizedRules = mergedRules.map((rule, ruleIndex) => ({
          id: rule.id ?? null,
          enabled: Boolean(rule.enabled),
          rewardType: rule.rewardType || "free",
          rateType: rule.rewardType === "reduced" ? "flat" : rule.rateType ?? "flat",
          amount: rule.amount ?? null,
          minSubtotal: rule.minSubtotal ?? null,
          method: rule.method || "standard",
          iconChoice: rule.iconChoice || "truck",
          progressTextBefore: rule.progressTextBefore ?? null,
          progressTextAfter: rule.progressTextAfter ?? null,
          progressTextBelow: rule.progressTextBelow ?? null,
          campaignName: rule.campaignName ?? null,
          cartStepName: normalizeStepSlot(rule.cartStepName) || null,
          shopifyRateId: rule.shopifyRateId || null,
          shopifyMethodDefinitionId: rule.shopifyMethodDefinitionId || null,
          ...normalizeScheduleFields(rule),
          ...normalizeAdvancedRuleFields(rule),
          _ruleIndex: ruleIndex, // preserve original index for partial sync/update
        }));

        const normalizedShippingMeta = normalizedRules.map((rule) => ({
          ruleIndex:
            Number.isInteger(rule._ruleIndex) && rule._ruleIndex >= 0
              ? rule._ruleIndex
              : null,
          payload: {
            id: rule.id ?? null,
            enabled: Boolean(rule.enabled),
            rewardType: rule.rewardType || "free",
            rateType: rule.rewardType === "reduced" ? "flat" : rule.rateType ?? "flat",
            amount: rule.amount ?? null,
            minSubtotal: rule.minSubtotal ?? null,
            method: rule.method || "standard",
            iconChoice: rule.iconChoice || "truck",
            progressTextBefore: rule.progressTextBefore ?? null,
            progressTextAfter: rule.progressTextAfter ?? null,
            progressTextBelow: rule.progressTextBelow ?? null,
            campaignName: rule.campaignName ?? null,
            cartStepName: normalizeStepSlot(rule.cartStepName) || null,
            shopifyRateId: normalizeShopifyRateId(rule.shopifyRateId),
            shopifyMethodDefinitionId: normalizeShopifyRateId(
              rule.shopifyMethodDefinitionId
            ),
            ...normalizeScheduleFields(rule),
            ...persistAdvancedRuleFields(rule),
          },
        }));
        const normalizedRulesToPersist = normalizedShippingMeta.map(
          (entry) => entry.payload
        );
        const shippingRulesForGraphql = normalizedRulesToPersist.map(
          ({ shopifyMethodDefinitionId, ...rest }) =>
            stripRuleAdminFields(rest)
        );
        const normalizedExistingRules = (existingShippingRules || []).map(
          normalizeShippingRuleForKey
        );

        const persistedShippingRuleIds = await persistPrismaRules({
          model: prisma.shippingRule,
          shop,
          normalizedRules: normalizedRulesToPersist,
          existingRows: existingShippingRules,
          mapRuleData: (rule) => ({
            ...rule,
            progressTextBefore: rule.progressTextBefore ?? null,
            progressTextAfter: rule.progressTextAfter ?? null,
            progressTextBelow: rule.progressTextBelow ?? null,
            campaignName: rule.campaignName ?? null,
            cartStepName: normalizeStepSlot(rule.cartStepName) || null,
            shopifyRateId: rule.shopifyRateId || null,
            shopifyMethodDefinitionId: rule.shopifyMethodDefinitionId || null,
            startsAt: rule.startsAt ?? null,
            endsAt: rule.endsAt ?? null,
            ...persistAdvancedRuleFields(rule),
          }),
        });

        normalizedRules.forEach((rule, idx) => {
          rule.id = persistedShippingRuleIds[idx] ?? rule.id ?? null;
        });

        logger.log(
          `[App Rules] persisted ${normalizedRulesToPersist} shipping rules for shop ${shop}`
        );

        const ruleIndexToRowId = new Map();
        normalizedShippingMeta.forEach((entry, pos) => {
          const key = entry.ruleIndex !== null ? entry.ruleIndex : pos;
          ruleIndexToRowId.set(key, persistedShippingRuleIds[pos]);
        });

        const remainingNormalized = [...normalizedRules];
        const removedRules = [];
        const matchesRule = (candidate, target) => {
          // Prefer matching by Shopify rate ID; otherwise compare shape/values
          if (candidate.shopifyRateId && target.shopifyRateId) {
            return (
              String(candidate.shopifyRateId) === String(target.shopifyRateId)
            );
          }

          const same = (a, b) => String(a ?? "") === String(b ?? "");
          return (
            candidate.rewardType === target.rewardType &&
            candidate.rateType === target.rateType &&
            same(candidate.amount, target.amount) &&
            same(candidate.minSubtotal, target.minSubtotal) &&
            candidate.method === target.method
          );
        };

        normalizedExistingRules.forEach((existingRule, idx) => {
          const matchIdx = remainingNormalized.findIndex((rule) =>
            matchesRule(rule, existingRule)
          );

          if (matchIdx >= 0) {
            remainingNormalized.splice(matchIdx, 1);
          } else {
            removedRules.push(existingShippingRules[idx]);
          }
        });

        const removedRateIds = Array.from(
          new Set(
            removedRules
              .map((r) => r.shopifyRateId)
              .filter(Boolean)
          )
        );

        if (GRAPHQL_ENDPOINT) {
          try {
            await gqlRequest(
              session,
              SAVE_SHIPPING_MUTATION,
              { shop, rules: shippingRulesForGraphql },
              shopAccessToken,
              shopDomain
            );
          } catch (err) {
            logger.warn(
              "GraphQL save shipping failed, falling back to Prisma",
              err
            );
          }
        } else {
          // No external rules GraphQL endpoint configured; persist locally
        }

        // Sync to Shopify Admin shipping zones (price-based rates)

        if (ENABLE_SHOPIFY_SHIPPING_SYNC) {
          try {
            if (removedRateIds.length || removedRules.length) {
              await deleteShippingRatesFromShopify(
                shopDomain,
                shopAccessToken,
                removedRateIds,
                removedRules
              );
            }

            const rulesForSync = partial
              ? normalizedRules.filter((_, i) => i === index)
              : normalizedRules;

            const adminSyncResults = await syncShippingRatesToShopify(
              rulesForSync,
              shopDomain,
              shopAccessToken
            );

            logger.log("[SHOPIFY SHIPPING SYNC] results", adminSyncResults);

            // Persist returned rate IDs back to DB

            const updates = adminSyncResults.filter((r) =>
              Number.isInteger(r.ruleIndex)
            );

            for (const {
              shopifyRateId,
              shopifyMethodDefinitionId,
              ruleIndex,
            } of updates) {
              const existing = await prisma.shippingRule.findMany({
                where: { shop },
                orderBy: { id: "asc" },
              });

              const targetId =
                ruleIndexToRowId.get(ruleIndex) ||
                existing[ruleIndex]?.id ||
                null;
              if (targetId) {
                const updateData = {};
                if (shopifyRateId) {
                  updateData.shopifyRateId = shopifyRateId;
                }

                if (shopifyMethodDefinitionId) {
                  updateData.shopifyMethodDefinitionId =
                    shopifyMethodDefinitionId;
                }

                if (Object.keys(updateData).length) {
                  await prisma.shippingRule.update({
                    where: { id: targetId },
                    data: updateData,
                  });
                }
              }

              await persistShopifyRateIdForRule({
                shop,
                ruleIndex,
                shopifyRateId,
                shopifyMethodDefinitionId,
                ruleIndexToRowId,
              });

              if (Number.isInteger(ruleIndex) && normalizedRules[ruleIndex]) {
                if (shopifyRateId) {
                  normalizedRules[ruleIndex].shopifyRateId = shopifyRateId;
                }

                if (shopifyMethodDefinitionId) {
                  normalizedRules[ruleIndex].shopifyMethodDefinitionId =
                    shopifyMethodDefinitionId;
                }
              }
            }

            await hydrateGraphqlMethodDefinitionIds({
              shopDomain,
              accessToken: shopAccessToken,
              rules: normalizedRules,
              ruleIndexToRowId,
            });
          } catch (syncErr) {
            logger.error("[SHOPIFY SHIPPING SYNC] failed", syncErr);
          }
        } else {
          logger.log(
            "[SHOPIFY SHIPPING SYNC] Skipped (ENABLE_SHOPIFY_SHIPPING_SYNC != true)"
          );
        }

        responseMessage = "Shipping rules saved successfully.";
        payloadForLog = normalizedRules;
        break;
      }

      case "upsell": {
        const data = payload ?? {};
        const parseText = (value) =>
          typeof value === "string" && value.trim() ? value.trim() : null;
        const selectedProductIds = normalizeIds(data.selectedProductIds || []);
        const selectedCollectionIds = normalizeIds(
          data.selectedCollectionIds || []
        );
        const settings = {
          enabled: Boolean(data.enabled),
          showAsSlider: Boolean(data.showAsSlider),
          autoplay: Boolean(data.autoplay),
          recommendationMode: String(data.recommendationMode || "auto"),
          sectionTitle: parseText(data.sectionTitle),
          buttonText: parseText(data.buttonText),
          buttonColor: parseText(data.buttonColor),
          backgroundColor: parseText(data.backgroundColor),
          textColor: parseText(data.textColor),
          borderColor: parseText(data.borderColor),
          arrowColor: parseText(data.arrowColor),
          selectedProductIds: JSON.stringify(selectedProductIds),
          selectedCollectionIds: JSON.stringify(selectedCollectionIds),
        };
        const persistUpsell = async (payloadToPersist) => {
          await prisma.upsellSettings.upsert({
            where: { shop },
            create: { shop, ...payloadToPersist },
            update: payloadToPersist,
          });
        };

        try {
          await persistUpsell(settings);
        } catch (err) {
          const message =
            err instanceof Error
              ? err.message
              : "Failed to save upsell settings";
          const schemaMismatch =
            /buttonColor|Unknown arg|Unknown argument|Unknown column|does not exist|P2022/i.test(
              message
            );

          if (schemaMismatch) {
            const legacySettings = { ...settings };
            delete legacySettings.buttonColor;
            try {
              await persistUpsell(legacySettings);
              try {
                const latestStyleRow = await prisma.styleSettings.findFirst({
                  where: { shop },
                  orderBy: { id: "desc" },
                  select: { id: true },
                });
                if (latestStyleRow?.id && settings.buttonColor) {
                  await prisma.styleSettings.update({
                    where: { id: latestStyleRow.id },
                    data: { buttonColor: settings.buttonColor },
                  });
                }
              } catch (legacyStyleErr) {
                logger.warn(
                  "Legacy fallback: unable to persist upsell button color in style settings",
                  legacyStyleErr
                );
              }
              shopifySyncError =
                "Upsell button color was skipped because production DB schema is older. Run latest migrations.";
            } catch (legacyErr) {
              const legacyMessage =
                legacyErr instanceof Error
                  ? legacyErr.message
                  : "Failed to save legacy upsell settings";
              return json(
                {
                  error:
                    "Failed to save upsell settings. Run Prisma migrations on production.",
                  details: legacyMessage,
                },
                { status: 500 }
              );
            }
          } else {
            return json(
              {
                error: "Failed to save upsell settings.",
                details: message,
              },
              { status: 500 }
            );
          }
        }

        responseMessage = "Upsell settings saved successfully.";
        payloadForLog = {
          ...settings,
          selectedProductIds,
          selectedCollectionIds,
        };
        break;
      }

      case "discount": {
        const existingDiscountRows = await fetchDiscountRulesByShop(shop);

        const incomingPayload = payload;

        const rules = dedupeRules(incomingPayload, normalizeDiscountRuleForKey);

        let mergedRules = await mergeRulesWithExisting(
          "discount",
          rules,
          index
        );

        let normalizedRules = mergedRules.map((rule, ruleIndex) => {
          const normalizedType = rule.type || "automatic";
          const discountDefaults = getDiscountContentDefaults(normalizedType);
          const tType = normalizeTriggerType(rule.triggerType);
          return {
            id: rule.id ?? null,
            __ruleIndex: ruleIndex,
            enabled: Boolean(rule.enabled),
            type: normalizedType,
            condition:
              rule.condition ||
              (normalizedType === "code" ? "code" : "all_payments"),
            rewardType: rule.rewardType || "percent",
            valueType: rule.valueType || "percent",
            value: rule.value ?? null,
            minPurchase: tType === "quantity" ? null : (rule.minPurchase ?? null),
            triggerType: tType,
            minQuantity: tType === "quantity" ? (rule.minQuantity ?? null) : null,
            iconChoice: rule.iconChoice || "tag",
            discountCode: rule.discountCode || "Smart123",
            scope: rule.scope || "all",
            shopifyDiscountCodeId: rule.shopifyDiscountCodeId || null,
            codeDiscountId: rule.codeDiscountId ?? null,
            appliesTo: parseAppliesToValue(rule.appliesTo),
            progressTextBefore: rule.progressTextBefore,
            progressTextAfter: rule.progressTextAfter,
            quantityProgressTextBefore: rule.quantityProgressTextBefore,
            quantityProgressTextAfter: rule.quantityProgressTextAfter,
            progressTextBelow:
              String(rule.progressTextBelow ?? "").trim() ||
              discountDefaults.progressTextBelow,
            campaignName: rule.campaignName,
            codeCampaignName:
              normalizedType === "code"
                ? String(rule.codeCampaignName ?? "").trim() || "Code Discount"
                : rule.codeCampaignName,
            cartStepName: normalizeStepSlot(rule.cartStepName),
            ...normalizeScheduleFields(rule),
            ...normalizeAdvancedRuleFields(rule),
          };
        });

        const discountRulesToPersist = normalizedRules.map((rule) => ({
          id: rule.id ?? null,
          enabled: rule.enabled,
          type: rule.type,
          condition:
            rule.condition || (rule.type === "code" ? "code" : "all_payments"),
          rewardType: rule.rewardType || "percent",
          valueType: rule.valueType || "percent",
          value: rule.value,
          minPurchase: rule.minPurchase,
          triggerType: normalizeTriggerType(rule.triggerType),
          minQuantity: rule.minQuantity,
          iconChoice: rule.iconChoice || "tag",
          discountCode: rule.discountCode || "",
          scope: rule.scope || "all",
          appliesTo: JSON.stringify(parseAppliesToValue(rule.appliesTo)),
          shopifyDiscountCodeId: rule.shopifyDiscountCodeId || null,
          codeDiscountId: rule.codeDiscountId ?? null,
          progressTextBefore: rule.progressTextBefore ?? null,
          progressTextAfter: rule.progressTextAfter ?? null,
          quantityProgressTextBefore: rule.quantityProgressTextBefore ?? null,
          quantityProgressTextAfter: rule.quantityProgressTextAfter ?? null,
          progressTextBelow: rule.progressTextBelow ?? null,
          campaignName: rule.campaignName ?? null,
          codeCampaignName:
            rule.type === "code"
              ? String(rule.codeCampaignName ?? "").trim() || "Code Discount"
              : rule.codeCampaignName ?? null,
          cartStepName: normalizeStepSlot(rule.cartStepName) || null,
          startsAt: rule.startsAt ?? null,
          endsAt: rule.endsAt ?? null,
          ...persistAdvancedRuleFields(rule),
        }));

        const persistDiscountRulesToPrisma = async () =>
          persistPrismaRules({
            model: prisma.discountRule,
            shop,
            normalizedRules: discountRulesToPersist,
            existingRows: existingDiscountRows,
          });

        const persistedDiscountRuleIds = await persistDiscountRulesToPrisma();
        normalizedRules = normalizedRules.map((rule, idx) => ({
          ...rule,
          id: persistedDiscountRuleIds[idx] ?? rule.id ?? null,
        }));

        const normalizedIds = new Set(
          normalizedRules
            .map((rule) => rule.shopifyDiscountCodeId)
            .filter(Boolean)
        );

        const removedShopifyIds = Array.from(
          new Set(
            existingDiscountRows
              .map((row) => row.shopifyDiscountCodeId)
              .filter((id) => id && !normalizedIds.has(id))
          )
        );

        const gqlRules = normalizedRules.map((rule) => ({
          enabled: rule.enabled,
          type: rule.type,
          condition: rule.condition,
          rewardType: rule.rewardType,
          valueType: rule.valueType,
          discountCode: rule.discountCode,
          value: rule.value,
          minPurchase: rule.minPurchase,
          triggerType: normalizeTriggerType(rule.triggerType),
          minQuantity: rule.minQuantity,
          iconChoice: rule.iconChoice,
          scope: rule.scope,
          appliesTo: rule.appliesTo,
          codeDiscountId: rule.codeDiscountId,
          shopifyDiscountCodeId: rule.shopifyDiscountCodeId,
          progressTextBefore: rule.progressTextBefore,
          progressTextAfter: rule.progressTextAfter,
          quantityProgressTextBefore: rule.quantityProgressTextBefore,
          quantityProgressTextAfter: rule.quantityProgressTextAfter,
          progressTextBelow: rule.progressTextBelow,
          campaignName: rule.campaignName,
          codeCampaignName: rule.codeCampaignName,
          cartStepName: normalizeStepSlot(rule.cartStepName),
          startsAt: rule.startsAt,
          endsAt: rule.endsAt,
        }));

        if (GRAPHQL_ENDPOINT) {
          try {
            const gqlRulesForRequest =
              partial && Number.isInteger(index)
                ? gqlRules[index]
                  ? [gqlRules[index]]
                  : []
                : gqlRules;
            await gqlRequest(
              session,
              SAVE_DISCOUNT_MUTATION,
              { shop, rules: gqlRulesForRequest },
              shopAccessToken,
              shopDomain
            );
          } catch (err) {
            logger.warn(
              "GraphQL save discount failed, falling back to Prisma",
              err
            );
          }
        }

        let shopifyResults = [];

        // Guard: require Admin token for Shopify discount creation

        if (!shopAccessToken) {
          return json(
            { error: "Missing Shopify Admin access token for discount sync." },
            { status: 401 }
          );
        }

        if (removedShopifyIds.length) {
          for (const rid of removedShopifyIds) {
            try {
              await deleteShopifyDiscountById(shopDomain, shopAccessToken, rid);
            } catch (deleteErr) {
              logger.error(
                "[SHOPIFY DISCOUNT CLEANUP] failed to delete removed discount",
                { id: rid, error: deleteErr }
              );
            }
          }
        }

        try {
          const shopifySyncRules =
            partial && Number.isInteger(index)
              ? normalizedRules[index]
                ? [normalizedRules[index]]
                : []
              : normalizedRules;

          shopifyResults = await syncDiscountsToShopify(
            shopifySyncRules,
            shopDomain,
            shopAccessToken
          );

          // Persist Shopify discount IDs for cleanup/removal later

          try {
            const existing = await fetchDiscountRulesByShop(shop);

            for (const resultEntry of shopifyResults) {
              if (!resultEntry?.id || !Number.isInteger(resultEntry.ruleIndex)) {
                continue;
              }
              const target = existing[resultEntry.ruleIndex];
              if (!target?.id) continue;
              await prisma.discountRule.update({
                where: { id: target.id },
                data: { shopifyDiscountCodeId: resultEntry.id },
              });
              if (normalizedRules[resultEntry.ruleIndex]) {
                normalizedRules[resultEntry.ruleIndex].shopifyDiscountCodeId =
                  resultEntry.id;
              }
            }
          } catch (persistErr) {
            logger.error("Failed to persist Shopify discount IDs", persistErr);
          }
        } catch (syncErr) {
          logger.error("Shopify discount sync failed", syncErr);

          return json(
            {
              error:
                syncErr instanceof Error
                  ? syncErr.message
                  : "Failed to sync discounts to Shopify",
            },
            { status: 500 }
          );
        }

        responseMessage = "Discount rules saved successfully.";
        payloadForLog = { rules: normalizedRules, shopifyResults };
        break;
      }

      case "free": {
        const rules = dedupeRules(payload, normalizeFreeRuleForKey);
        const mergedRules = await mergeRulesWithExisting("free", rules, index);
        let normalizedRules = mergedRules.map((rule) => {
          const tType = normalizeTriggerType(rule.triggerType);
          return {
          id: rule.id ?? null,
          enabled: Boolean(rule.enabled),
          trigger: rule.trigger || "payment_online",
          minPurchase: tType === "quantity" ? null : (rule.minPurchase ?? null),
          triggerType: tType,
          minQuantity: tType === "quantity" ? (rule.minQuantity ?? null) : null,
          bonus: rule.bonus ?? null,
          qty: rule.qty ?? null,
          limit: rule.limit ?? null,
          replaceFree: Boolean(rule.replaceFree),
          excludeCOD: Boolean(rule.excludeCOD),
          removeOnCOD: Boolean(rule.removeOnCOD),
          iconChoice: rule.iconChoice || "gift",
          progressTextBefore: rule.progressTextBefore ?? null,
          progressTextAfter: rule.progressTextAfter ?? null,
          quantityProgressTextBefore: rule.quantityProgressTextBefore ?? null,
          quantityProgressTextAfter: rule.quantityProgressTextAfter ?? null,
          progressTextBelow: rule.progressTextBelow ?? null,
          campaignName: rule.campaignName ?? null,
          cartStepName: normalizeStepSlot(rule.cartStepName) || null,
          freeProductDiscountID: rule.freeProductDiscountID ?? null,
          ...normalizeScheduleFields(rule),
          ...normalizeAdvancedRuleFields(rule),
        };
        });

        const normalizedFreeRulesToPersist = normalizedRules.map((rule) => ({
          id: rule.id ?? null,
          enabled: Boolean(rule.enabled),
          trigger: rule.trigger || "payment_online",
          minPurchase: rule.minPurchase ?? null,
          triggerType: normalizeTriggerType(rule.triggerType),
          minQuantity: rule.minQuantity ?? null,
          bonusProductId: rule.bonus ?? null,
          qty: rule.qty ?? null,
          limitPerOrder: rule.limit ?? null,
          iconChoice: rule.iconChoice || "gift",
          progressTextBefore: rule.progressTextBefore ?? null,
          progressTextAfter: rule.progressTextAfter ?? null,
          quantityProgressTextBefore: rule.quantityProgressTextBefore ?? null,
          quantityProgressTextAfter: rule.quantityProgressTextAfter ?? null,
          progressTextBelow: rule.progressTextBelow ?? null,
          campaignName: rule.campaignName ?? null,
          cartStepName: normalizeStepSlot(rule.cartStepName) || null,
          startsAt: rule.startsAt ?? null,
          endsAt: rule.endsAt ?? null,
          ...persistAdvancedRuleFields(rule),
        }));

        const existingFreeGiftRules = await fetchFreeGiftRulesByShop(shop);

        const persistFreeRulesToPrisma = async () =>
          persistPrismaRules({
            model: prisma.freeGiftRule,
            shop,
            normalizedRules: normalizedFreeRulesToPersist,
            existingRows: existingFreeGiftRules,
          });

        const persistedFreeRuleIds = await persistFreeRulesToPrisma();
        normalizedRules = normalizedRules.map((rule, idx) => ({
          ...rule,
          id: persistedFreeRuleIds[idx] ?? rule.id ?? null,
        }));

        if (GRAPHQL_ENDPOINT) {
          try {
            await gqlRequest(
              session,
              SAVE_FREE_MUTATION,
              { shop, rules: normalizedRules.map(stripRuleAdminFields) },
              shopAccessToken,
              shopDomain
            );
          } catch (err) {
            logger.warn(
              "GraphQL save free gift failed, falling back to Prisma",
              err
            );
          }
        }

        let shopifySyncResults = normalizedRules.map((rule, idx) => ({
          index: idx,
          id: existingFreeGiftRules[idx]?.freeProductDiscountID ?? null,
        }));

        if (shopAccessToken && normalizedRules.length) {
          try {
            shopifySyncResults = await syncFreeProductDiscountsToShopify({
              shopDomain,
              accessToken: shopAccessToken,
              rules: normalizedRules.map((rule) => ({
                bonus: rule.bonus ?? null,
                minPurchase: rule.minPurchase ?? null,
                triggerType: normalizeTriggerType(rule.triggerType),
                minQuantity: rule.minQuantity ?? null,
                qty: rule.qty ?? null,
                limit: rule.limit ?? null,
                enabled: Boolean(rule.enabled),
                startsAt: rule.startsAt ?? null,
                endsAt: rule.endsAt ?? null,
              })),
              existingDiscountIds: normalizedRules.map(
                (_, idx) =>
                  existingFreeGiftRules[idx]?.freeProductDiscountID ?? null
              ),

              collectionId: freeGiftAllProductsCollectionId,
            });
          } catch (syncErr) {
            logger.error("Shopify free product discount sync failed", syncErr);
            shopifySyncError =
              syncErr instanceof Error
                ? syncErr.message
                : "Failed to sync free product rules to Shopify";
          }
        }

        const persistedFreeGiftRules = await fetchFreeGiftRulesByShop(shop);

        for (const entry of shopifySyncResults) {
          const target = persistedFreeGiftRules[entry.index];
          if (!target) continue;
          await prisma.freeGiftRule.update({
            where: { id: target.id },
            data: { freeProductDiscountID: entry.id ?? null },
          });
          if (normalizedRules[entry.index]) {
            normalizedRules[entry.index].id = target.id;
            normalizedRules[entry.index].freeProductDiscountID =
              entry.id ?? null;
          }
        }
        responseMessage = "Free gift rules saved successfully.";
        payloadForLog = normalizedRules;
        break;
      }

      case "bxgy": {
        const existingBxgyRows = await prisma.bxgyRule.findMany({
          where: { shop },
          orderBy: { id: "asc" },
        });

        const existingBxgyById = new Map(
          existingBxgyRows.map((row) => [String(row.id), row])
        );

        const rules = dedupeRules(payload, normalizeBxgyRuleForKey);
        const mergedRules = await mergeRulesWithExisting("bxgy", rules, index);
        let normalizedRules = mergedRules.map((rule, ruleIndex) => {
          const incomingId = rule.id !== undefined && rule.id !== null ? String(rule.id) : null;
          const existingMatch = incomingId ? existingBxgyById.get(incomingId) : null;
          const fallbackExisting = existingBxgyRows[ruleIndex] || existingMatch || null;
          const buyxgetyId = rule.buyxgetyId ?? existingMatch?.buyxgetyId ?? fallbackExisting?.buyxgetyId ?? null;
          const appliesTo = normalizeBxgyAppliesTo(rule);
          return {
            ...rule,
            id: existingMatch?.id ?? fallbackExisting?.id ?? null,
            enabled: Boolean(rule.enabled),
            xQty: rule.xQty ?? "1",
            yQty: rule.yQty ?? "1",
            scope: rule.scope || "product",
            appliesTo,

            giftType: rule.giftType || "same",
            giftSku: rule.giftSku ?? null,
            maxGifts: rule.maxGifts ?? null,
            allowStacking: Boolean(rule.allowStacking),
            iconChoice: rule.iconChoice || "sparkles",
            beforeOfferUnlockMessage:
              rule.beforeOfferUnlockMessage ?? null,
            afterOfferUnlockMessage: rule.afterOfferUnlockMessage ?? null,
            campaignName: rule.campaignName ?? null,
            buyxgetyId,
            ...normalizeScheduleFields(rule),
            ...normalizeAdvancedRuleFields(rule),
          };
        });

        let persistedRows = [];
        const syncReadyRules = normalizedRules.map((rule, ruleIndex) => ({
          ...rule,
          __ruleIndex: ruleIndex,
        }));

        const disabledShopifyIds = normalizedRules
          .filter((rule) => !rule.enabled && rule.buyxgetyId)
          .map((rule) => rule.buyxgetyId);

        if (disabledShopifyIds.length) {
          const disabledIdsSet = new Set(disabledShopifyIds);
          await prisma.bxgyRule.updateMany({
            where: {
              shop,
              buyxgetyId: { in: disabledShopifyIds },
            },
            data: { buyxgetyId: null },
          });

          for (const discountId of disabledShopifyIds) {
            try {
              await deleteShopifyDiscountById(
                shopDomain,
                shopAccessToken,
                discountId
              );
            } catch (cleanupErr) {
              logger.warn(
                "[SHOPIFY BXGY CLEANUP] failed to delete disabled discount",
                { id: discountId, error: cleanupErr }
              );
            }
          }

          normalizedRules = normalizedRules.map((rule) =>
            rule.buyxgetyId && disabledIdsSet.has(rule.buyxgetyId)
              ? { ...rule, buyxgetyId: null }
              : rule
          );
        }

        const normalizedIds = new Set(normalizedRules.map((rule) => rule.buyxgetyId).filter(Boolean));

        const removedShopifyIds = Array.from(new Set(existingBxgyRows.map((row) => row.buyxgetyId).filter((id) => id && !normalizedIds.has(id))));

        const persistBxgyViaPrisma = async () => {
          const existing = await prisma.bxgyRule.findMany({
            where: { shop },
            orderBy: { id: "asc" },
          });

          const existingById = new Map(existing.map((row) => [String(row.id), row]));
          const incomingIds = new Set();
          const rowsInOrder = new Array(normalizedRules.length);

          for (
            let ruleIndex = 0;
            ruleIndex < normalizedRules.length;
            ruleIndex += 1) {
            const rule = normalizedRules[ruleIndex];
            const appliesTo = normalizeBxgyAppliesTo(rule);

            const rowData = {
              shop,
              xQty: rule.xQty ?? "1",
              yQty: rule.yQty ?? "1",
              scope: rule.scope || "product",
              appliesTo: JSON.stringify(appliesTo),
              appliesProductIds: JSON.stringify(appliesTo.products),
              appliesCollectionIds: JSON.stringify(appliesTo.collections),
              appliesStore: rule.scope === "store",
              giftType: rule.giftType || "same",
              giftSku: rule.giftSku ?? null,
              maxGifts: rule.maxGifts ?? null,
              allowStacking: Boolean(rule.allowStacking),
              enabled: Boolean(rule.enabled),
              iconChoice: rule.iconChoice || "sparkles",
              beforeOfferUnlockMessage:
                rule.beforeOfferUnlockMessage ?? null,
              afterOfferUnlockMessage:
                rule.afterOfferUnlockMessage ?? null,
              campaignName: rule.campaignName ?? null,
              buyxgetyId: rule.buyxgetyId ?? null,
              startsAt: rule.startsAt ?? null,
              endsAt: rule.endsAt ?? null,
              ...persistAdvancedRuleFields(rule),
            };

            if (rule.id && existingById.has(String(rule.id))) {
              await prisma.bxgyRule.update({
                where: { id: rule.id },
                data: rowData,
              });

              incomingIds.add(rule.id);
              rowsInOrder[ruleIndex] = { ...rowData, id: rule.id };
            } else {
              const created = await prisma.bxgyRule.create({ data: rowData });
              incomingIds.add(created.id);
              rowsInOrder[ruleIndex] = { ...rowData, id: created.id };
            }
          }

          const existingIds = existing.map((row) => row.id);
          const removeIds = existingIds.filter(
            (id) => id && !incomingIds.has(id)
          );

          if (removeIds.length) {
            await prisma.bxgyRule.deleteMany({
              where: { id: { in: removeIds } },
            });
          }
          return rowsInOrder;
        };

        const bxgyRulesForGraphql = normalizedRules.map((rule) => ({
          ...stripRuleAdminFields(rule),
        }));

        if (GRAPHQL_ENDPOINT) {
          try {
            await gqlRequest(
              session,
              SAVE_BXGY_MUTATION,
              { shop, rules: bxgyRulesForGraphql },
              shopAccessToken,
              shopDomain
            );
          } catch (err) {
            logger.warn(
              "GraphQL save bxgy failed, falling back to Prisma",
              err
            );

            persistedRows = await persistBxgyViaPrisma();
          }
        } else {
          persistedRows = await persistBxgyViaPrisma();
        }

        if (persistedRows.length === normalizedRules.length) {
          normalizedRules = normalizedRules.map((rule, idx) => ({
            ...rule,
            id: persistedRows[idx]?.id ?? rule.id ?? null,
          }));
        }

        let shopifyResults = [];

        if (!shopAccessToken) {
          return json(
            {
              error:
                "Missing Shopify Admin access token for BXGY discount sync.",
            },
            { status: 401 }
          );
        }

        if (removedShopifyIds.length) {
          await prisma.bxgyRule.updateMany({
            where: {
              shop,
              buyxgetyId: { in: removedShopifyIds },
            },

            data: { buyxgetyId: null },
          });

          for (const rid of removedShopifyIds) {
            try {
              await deleteShopifyDiscountById(shopDomain, shopAccessToken, rid);
            } catch (cleanupErr) {
              logger.warn(
                "[SHOPIFY BXGY CLEANUP] failed to delete removed discount",
                { id: rid, error: cleanupErr }
              );
            }
          }
        }

        try {
          const rulesForSync = partial ? syncReadyRules.filter((rule) => rule.__ruleIndex === index) : syncReadyRules;

          shopifyResults = await syncBxgyRulesToShopify(
            rulesForSync,
            shopDomain,
            shopAccessToken
          );

          const persisted = await prisma.bxgyRule.findMany({
            where: { shop },
            orderBy: { id: "asc" },
          });

          const resultByIndex = new Map(
            shopifyResults.map((res) => [res.index, res.id])
          );

          for (let i = 0; i < persisted.length; i += 1) {
            if (!resultByIndex.has(i)) continue;
            const row = persisted[i];
            const newId = resultByIndex.get(i) ?? null;
            if (row.buyxgetyId !== newId) {
              await prisma.bxgyRule.update({
                where: { id: row.id },
                data: { buyxgetyId: newId },
              });
            }
          }
        } catch (syncErr) {
          logger.error("Shopify BXGY discount sync failed", syncErr);
          return json(
            {
              error:
                syncErr instanceof Error
                  ? syncErr.message
                  : "Failed to sync BXGY rules to Shopify",
            },
            { status: 500 }
          );
        }
        responseMessage = "BXGY rules saved successfully.";
        payloadForLog = { rules: normalizedRules, shopifyResults };
        break;
      }

      case "style": {
        const data = payload ?? {};
        const modeRaw = String(data.cartDrawerBackgroundMode || "").toLowerCase();
        const mode =
          modeRaw === "image" || modeRaw === "gradient" ? modeRaw : "color";
        const parseText = (value) =>
          typeof value === "string" && value.trim() ? value.trim() : null;
        const requestedImage = parseText(data.cartDrawerImage);
        const imageValue =
          mode === "image" ? requestedImage || RURAL_DRAWER_IMAGE : null;
        const buttonColorValue =
          parseText(data.buttonColor) || DEFAULT_STYLE_SETTINGS.buttonColor;
        const borderColorValue =
          parseText(data.borderColor) || DEFAULT_STYLE_SETTINGS.borderColor;
        const settings = {
          font: data.font || "system",
          base: data.base || "16",
          headingScale: data.headingScale || "1.25",
          radius: data.radius || "12",
          textColor: data.textColor || "#111111",
          bg: data.bg || "#FFFFFF",
          progress: data.progress || "#1B84F1",
          buttonColor: buttonColorValue,
          borderColor: borderColorValue,
          announcementBarBackgroundColor: parseText(data.announcementBarBackgroundColor),
          announcementBarTextColor: parseText(data.announcementBarTextColor),
          buttonLabelColor: parseText(data.buttonLabelColor),
          iconColor: parseText(data.iconColor),
          cartDrawerBackground: parseText(data.cartDrawerBackground),
          cartDrawerTextColor: parseText(data.cartDrawerTextColor),
          cartDrawerHeaderColor: parseText(data.cartDrawerHeaderColor),
          cartDrawerBackgroundMode: mode,
          cartDrawerImage: imageValue,
          cartIconUrl: parseText(data.cartIconUrl),
          discountCodeApply: Boolean(data.discountCodeApply),
          checkoutButtonText:
            parseText(data.checkoutButtonText) ||
            DEFAULT_STYLE_SETTINGS.checkoutButtonText,
          drawerAutoOpen: Boolean(data.drawerAutoOpen),
          drawerPosition:
            ["right", "left"].includes(String(data.drawerPosition))
              ? String(data.drawerPosition)
              : DEFAULT_STYLE_SETTINGS.drawerPosition,
          stickyCheckout: Boolean(data.stickyCheckout),
          mobileLayout:
            ["drawer", "bottom_sheet"].includes(String(data.mobileLayout))
              ? String(data.mobileLayout)
              : DEFAULT_STYLE_SETTINGS.mobileLayout,
        };
        const { cartIconUrl, ...prismaSettings } = settings;

        const persistStyle = async () => {
          const updateResult = await prisma.styleSettings.updateMany({
            where: { shop },
            data: prismaSettings,
          });
          if (updateResult.count === 0) {
            await prisma.styleSettings.create({ data: { shop, ...prismaSettings } });
          }
          await persistStyleCartIconUrl(shop, cartIconUrl);
          return updateResult.count;
        };

        let savedViaGraphql = false;
        let dbUpdatedCount = null;
        try {
          if (!GRAPHQL_ENDPOINT) {
            throw new Error("No GraphQL endpoint configured");
          }

          const graphqlSettings = { ...settings };
          delete graphqlSettings.buttonColor;
          delete graphqlSettings.borderColor;
          delete graphqlSettings.announcementBarBackgroundColor;
          delete graphqlSettings.announcementBarTextColor;
          delete graphqlSettings.buttonLabelColor;
          delete graphqlSettings.iconColor;
          delete graphqlSettings.cartIconUrl;

          await gqlRequest(
            session,
            SAVE_STYLE_SETTINGS_MUTATION,
            { shop, settings: graphqlSettings },
            shopAccessToken,
            shopDomain
          );
          savedViaGraphql = true;
        } catch (err) {
          if (GRAPHQL_ENDPOINT) {
            logger.warn(
              "GraphQL save style failed, falling back to Prisma",
              err
            );
          }
        }

        try {
          dbUpdatedCount = await persistStyle();
        } catch (persistErr) {
          logger.warn("Failed to persist style settings to Prisma", persistErr);
          if (savedViaGraphql) {
            shopifySyncError =
              "Style settings saved remotely, but local DB update failed. Run Prisma migrations.";
          } else {
            throw persistErr;
          }
        }
        responseMessage = "Style settings saved successfully.";
        payloadForLog = { ...settings, dbUpdatedCount };
        break;
      }
      default:
        return json({ error: "Unknown section" }, { status: 400 });
    }

    if (payloadForLog) {
      logger.log(`[${section.toUpperCase()} SAVE]`, {
        shop,
        payload: payloadForLog,
      });
    } else {
      logger.log(`[${section.toUpperCase()} SAVE]`, {
        shop,
        payload: "No payload provided",
      });
    }

    return json({
      ok: true,
      message: responseMessage,
      payload: payloadForLog ?? null,
      shopifySyncError: shopifySyncError || null,
    });
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }

    const message = error instanceof Error ? error.message || "Failed to save" : "Failed to save";
    logger.error("Failed to save rules", error);

    return json(
      { error: message },
      { status: 500, headers: { "X-Error": "rules-save-failed" } }
    );
  }
};

/* ---------------- helpers ---------------- */

const num = (v) => {
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const notEmpty = (v) => String(v ?? "").trim() !== "";
const normalizeShopifyRateId = (id) => {
  if (!id) return null;
  const asString = String(id);
  const [cleanId] = asString.split("?");
  return cleanId || null;
};

/* compact summaries for in-line cards */

const shippingSummary = (r, currency = "USD") => {
  const method = r.method === "express" ? "Express" : "Standard";
  const reward = r.rewardType === "free" ? "Free shipping" : r.rateType === "flat" ? `Shipping ${formatCurrency(r.amount || 0, currency)}` : `${r.amount || 0}% off shipping`;
  const threshold = notEmpty(r.minSubtotal) ? `Min ${formatCurrency(r.minSubtotal, currency)}` : "No minimum";
  return `Summary: ${reward} via ${method}  ${threshold}`;
};

const discountSummary = (r, currency = "USD") => {
  const triggerType = normalizeTriggerType(r.triggerType);
  const min =
    triggerType === "quantity"
      ? notEmpty(r.minQuantity)
        ? `Min ${r.minQuantity} qty`
        : "No minimum"
      : notEmpty(r.minPurchase)
        ? `Min ${formatCurrency(r.minPurchase, currency)}`
        : "No minimum";
  if (r.rewardType === "free_shipping") {
    if (r.type === "code") {
      const code = notEmpty(r.discountCode) ? r.discountCode : "Code";
      return `Summary: Code ${code} -> Free shipping (${min})`;
    }
    return `Summary: Automatic -> Free shipping (${min})`;
  }

  if (r.type === "code") {
    const code = notEmpty(r.discountCode) ? r.discountCode : "Code";
    const formattedValue = formatDiscountValueDisplay(r, currency);
    const fallbackValue =
      getDiscountValueMode(r) === "amount"
        ? `${fmtMoney(Number(r.value || 0), currency)} off`
        : `${Number(r.value || 0)}% off`;
    return `Summary: Code ${code} -> ${formattedValue || fallbackValue} (${min})`;
  }

  const formattedValue = formatDiscountValueDisplay(r, currency);
  const fallbackValue =
    getDiscountValueMode(r) === "amount"
      ? `${fmtMoney(Number(r.value || 0), currency)} off`
      : `${Number(r.value || 0)}% off`;
  return `Summary: Automatic -> ${formattedValue || fallbackValue} (${min})`;
};

// const adminGraphql = async (shopDomain, accessToken, query, variables = {}) => {
//   if (!shopDomain) throw new Error("Missing shop domain for Admin API");
//   if (!accessToken) throw new Error("Missing access token for Admin API");
//   const endpoint = `https://${shopDomain.replace(
//     /^https?:\/\//,
//     ""
//   )}/admin/api/${ADMIN_API_VERSION}/graphql.json`;

//   logger.log("[ADMIN GQL] request", {
//     endpoint,
//     variables,
//     snippet: query.slice(0, 80),
//   });

//   const res = await fetch(endpoint, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       "X-Shopify-Access-Token": accessToken,
//     },
//     body: JSON.stringify({ query, variables }),
//   });

//   const json = await res.json();

//   if (json?.errors?.length) {
//     throw new Error(json.errors.map((e) => e.message).join("; "));
//   }

//   if (!json?.data) {
//     throw new Error("Admin GraphQL returned no data");
//   }

//   const topLevelUserErrors = Object.values(json.data || {}).flatMap((entry) =>
//     Array.isArray(entry?.userErrors) ? entry.userErrors : []
//   );

//   if (topLevelUserErrors.length) {
//     throw new Error(topLevelUserErrors.map((e) => e.message).join("; "));
//   }

//   if (!res.ok) {
//     const msg = json?.errors?.[0]?.message || res.statusText;

//     throw new Error(`Admin GraphQL ${res.status}: ${msg}`);
//   }

//   const userErrors =
//     json?.data?.discountCodeBasicCreate?.userErrors ||
//     json?.data?.discountAutomaticBasicCreate?.userErrors ||
//     json?.data?.discountCodeFreeShippingCreate?.userErrors ||
//     json?.data?.discountAutomaticFreeShippingCreate?.userErrors ||
//     [];

//   if (userErrors.length) {
//     throw new Error(userErrors.map((e) => e.message).join("; "));
//   }
//   logger.log("[ADMIN GQL] success", json?.data);
//   return json.data;
// };

const adminGraphql = async (shopDomain, accessToken, query, variables = {}) => {
  if (!shopDomain) throw new Error("Missing shop domain for Admin API");
  if (!accessToken) throw new Error("Missing access token for Admin API");

  const endpoint = `https://${shopDomain.replace(/^https?:\/\//,"")}/admin/api/${ADMIN_API_VERSION}/graphql.json`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  const rawText = await res.text();
  let payload = {};

  try {
    payload = rawText ? JSON.parse(rawText) : {};
  } catch {
    const clean = sanitizeHtmlErrorText(rawText);
    throw new Error(
      clean ||
        `Admin GraphQL returned non-JSON response (status ${res.status}).`
    );
  }

  if (!res.ok) {
    const msg =
      payload?.errors?.map((e) => e.message).join("; ") ||
      payload?.message ||
      payload?.error ||
      res.statusText;
    throw new Error(`Admin GraphQL ${res.status}: ${msg}`);
  }

  if (Array.isArray(payload?.errors) && payload.errors.length) {
    throw new Error(payload.errors.map((e) => e.message).join("; "));
  }

  if (!payload?.data) {
    throw new Error("Admin GraphQL returned no data");
  }

  const topLevelUserErrors = Object.values(payload.data || {}).flatMap((entry) =>
    Array.isArray(entry?.userErrors) ? entry.userErrors : []
  );

  if (topLevelUserErrors.length) {
    throw new Error(topLevelUserErrors.map((e) => e.message).join("; "));
  }

  return payload.data;
};

const getOfflineSessionAccessToken = async (shop) => {
  if (!shop) return null;
  try {
    const row = await prisma.session.findUnique({
      where: { id: `offline_${shop}` },
      select: { accessToken: true },
    });
    const token = String(row?.accessToken || "").trim();
    return token || null;
  } catch (err) {
    logger.warn("[AUTH] Offline session token lookup failed", err);
    return null;
  }
};

const resolveShopAdminAccess = async (shop, sessionAccessToken) => {
  if (!shop) {
    return { shopRow: null, shopDomain: null, shopAccessToken: null };
  }

  const shopRow = await prisma.shop.findFirst({
    where: { shop },
    orderBy: { id: "desc" },
  });

  const dbAccessToken = shopRow?.accessToken || null;
  const offlineAccessToken = await getOfflineSessionAccessToken(shop);

  const shopAccessToken =
    dbAccessToken ||
    offlineAccessToken ||
    (sessionAccessToken ? String(sessionAccessToken).trim() : null) ||
    null;

  if (shopAccessToken && (!dbAccessToken || !shopRow?.accessToken)) {
    try {
      await prisma.shop.upsert({
        where: { shop },
        update: {
          accessToken: shopAccessToken,
          installed: true,
          uninstalledAt: null,
        },
        create: {
          shop,
          accessToken: shopAccessToken,
          installed: true,
          onboardedAt: new Date(),
        },
      });
    } catch (err) {
      logger.warn("[AUTH] Failed to persist access token", err);
    }
  }

  return {
    shopRow,
    shopDomain: shopRow?.shop || shop,
    shopAccessToken,
  };
};


const generateDiscountCode = (rule, idx = 0) => {
  const base = "SMART";
  const amount = notEmpty(rule.value)
    ? String(rule.value).replace(/[^\d]/g, "")
    : "10";
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}-${amount}-${idx + 1}-${rand}`;
};

const discountItemsInput = () => ({ all: true });
const buildFreeShippingCodeInput = (rule, code, currencyCode = "USD", index = null) => {
  const minSubtotal = num(rule.minPurchase);
  const minSubtotalInput = minSubtotal ? minSubtotal.toFixed(2) : null;
  const baseTitle = `Free shipping ${minSubtotal ? formatCurrency(minSubtotal, currencyCode) : ""}`.trim();
  return {
    title: appendRuleIndexSuffix(baseTitle, index),
    code,
    ...scheduleInputFields(rule),
    customerSelection: { all: true },
    destinationSelection: { all: true },
    appliesOncePerCustomer: false,
    usageLimit: null,
    minimumRequirement: minSubtotalInput
      ? { subtotal: { greaterThanOrEqualToSubtotal: minSubtotalInput } }
      : null,
    combinesWith: {
      orderDiscounts: true,
      productDiscounts: false,
      shippingDiscounts: false,
    },
  };
};

const buildDiscountValueInput = (rule, currencyCode = "USD") => {
  const rawValue = Math.max(num(rule.value), 0);
  if (getDiscountValueMode(rule) === "amount") {
    return {
      discountAmount: {
        amount: rawValue.toFixed(2),
        appliesOnEachItem: false,
      },
    };
  }
  return {
    percentage: Math.min(rawValue, 100) / 100,
  };
};

const buildDiscountDisplayTitle = (rule, currency = "USD") => {
  const formatted = formatDiscountValueDisplay(rule, currency);
  if (formatted) return formatted;
  const fallbackValue = Math.max(num(rule.value), 0);
  return getDiscountValueMode(rule) === "amount"
    ? `${fmtMoneyPlain(fallbackValue, currency)} off`
    : `${fallbackValue}% off`;
};

const appendRuleIndexSuffix = (title, index) => {
  if (index === undefined || index === null) return title;
  const normalized = Number(index);
  if (!Number.isFinite(normalized) || normalized < 0) return title;
  return `${title} #${normalized + 1}`;
};

const buildDiscountMinimumRequirement = (rule = {}) => {
  const triggerType = normalizeTriggerType(rule.triggerType);
  if (triggerType === "quantity") {
    const minQty = Math.max(num(rule.minQuantity), 0);
    return minQty
      ? { quantity: { greaterThanOrEqualToQuantity: String(minQty) } }
      : null;
  }

  const minSubtotal = num(rule.minPurchase);
  return minSubtotal
    ? {
      subtotal: {
        greaterThanOrEqualToSubtotal: minSubtotal.toFixed(2),
      },
    }
    : null;
};

const buildDiscountCodeInput = (
  rule,
  code,
  currencyCode = "USD",
  index = null
) => {
  const value = Math.max(num(rule.value), 0);
  const titleValue = buildDiscountDisplayTitle(rule, currencyCode);
  return {
    title: appendRuleIndexSuffix(`CartLift ${titleValue}`, index),
    code,
    ...scheduleInputFields(rule),
    customerSelection: { all: true },
    customerGets: {
      value: buildDiscountValueInput(rule, currencyCode),
      items: discountItemsInput(rule),
    },

    appliesOncePerCustomer: true,
    usageLimit: 100,
    minimumRequirement: buildDiscountMinimumRequirement(rule),
    combinesWith: {
      orderDiscounts: true,
      productDiscounts: true,
      shippingDiscounts: true,
    },
  };
};

const buildAutomaticDiscountInput = (
  rule,
  currencyCode = "USD",
  index = null
) => {
  const titleValue = buildDiscountDisplayTitle(rule, currencyCode);

  return {
    title: appendRuleIndexSuffix(`CartLift: Cart Drawer & Upsell Auto ${titleValue}`, index),
    ...scheduleInputFields(rule),
    customerGets: {
      value: buildDiscountValueInput(rule, currencyCode),
      items: discountItemsInput(rule),
    },

    minimumRequirement: buildDiscountMinimumRequirement(rule),
    combinesWith: {
      orderDiscounts: true,
      productDiscounts: false,
      shippingDiscounts: false,
    },
  };
};

const buildBxgySelection = (rule = {}) => {
  const appliesTo = rule.appliesTo || {};
  const products = normalizeIds(appliesTo.products);
  const collections = normalizeIds(appliesTo.collections);
  if (rule.scope === "store" && products.length) {
    return { products };
  }

  if (rule.scope === "collection" && collections.length) {
    return { collections };
  }

  if (rule.scope === "product" && products.length) {
    return { products };
  }

  if (collections.length) {
    return { collections };
  }

  if (products.length) {
    return { products };
  }

  return { all: true };
};

const buildBxgyItemsInput = (selection = {}) => {
  if (selection.products?.length) {
    return { products: { productsToAdd: selection.products } };
  }

  if (selection.collections?.length) {
    return { collections: { add: selection.collections } };
  }

  return { all: true };
};

const buildBxgyCustomerBuys = (rule = {}, selection) => {
  const quantity = Math.max(num(rule.xQty), 1);
  return {
    items: buildBxgyItemsInput(selection),
    value: {
      quantity: String(quantity),
    },
  };
};

const buildBxgyGiftSelection = (rule = {}, selection = {}) => {
  if (rule.giftType === "specific" && rule.giftSku) {
    return { products: [rule.giftSku] };
  }

  const products = normalizeIds(selection.products);
  const collections = normalizeIds(selection.collections);

  if (products.length || collections.length) {
    return selection;
  }

  return null;
};

const buildBxgyCustomerGets = (rule = {}, selection) => {
  const giftQty = Math.max(num(rule.yQty), 1);
  const giftSelection = buildBxgyGiftSelection(rule, selection);

  if (!giftSelection) return null;

  return {
    items: buildBxgyItemsInput(giftSelection),
    value: {
      discountOnQuantity: {
        quantity: String(giftQty),
        effect: { percentage: 1 },
      },
    },
  };
};

const buildBxgyAutomaticInput = (rule = {}, index = 0) => {
  const selection = buildBxgySelection(rule);
  const usageLimit = Math.max(num(rule.maxGifts), 0);
  const baseTitle = rule.campaignName?.trim() || rule.title || `CartLift: Cart Drawer & Upsell BXGY ${rule.xQty || "X"} x ${rule.yQty || "Y"}`;
  const suffix = typeof index === "number" ? ` (#${index + 1})` : "";
  const title = `${baseTitle}${suffix}`;
  const customerGets = buildBxgyCustomerGets(rule, selection);
  if (!customerGets) {
    throw new Error(
      "BXGY customer gets items must target specific products/collections or a gift SKU"
    );
  }

  const payload = {
    title,

    ...scheduleInputFields(rule),

    combinesWith: {
      orderDiscounts: true,
      productDiscounts: false,
      shippingDiscounts: false,
    },
    customerBuys: buildBxgyCustomerBuys(rule, selection),
    customerGets,
  };

  if (usageLimit > 0) {
    payload.usesPerOrderLimit = String(usageLimit);
  }
  return payload;
};

const findAndDeleteDiscountByTitle = async (
  shopDomain,
  accessToken,
  title,
  kind = "automatic"
) => {
  const searchQuery = `
    query DiscountNodesByTitle($query: String!) {
      discountNodes(first: 5, query: $query) {
        edges {
          node {
            id
            discount {
              __typename
              ... on DiscountAutomaticApp { title status }
              ... on DiscountAutomaticBasic { title status }
              ... on DiscountCodeApp { title status }
              ... on DiscountCodeBasic { title status }
              ... on DiscountCodeFreeShipping { title status }
            }
          }
        }
      }
    }
  `;

  const deleteAutomaticMutation = `
    mutation DiscountAutomaticDelete($id: ID!) {
      discountAutomaticDelete(id: $id) { userErrors { field message } deletedAutomaticDiscountId }
    }
  `;

  const deleteCodeMutation = `
    mutation DiscountCodeDelete($id: ID!) {
      discountCodeDelete(id: $id) { userErrors { field message } deletedCodeDiscountId }
    }
  `;

  const queryString = `title:${JSON.stringify(title)}`;
  let data = null;
  try {
    data = await adminGraphql(shopDomain, accessToken, searchQuery, {
      query: queryString,
    });
  } catch (err) {
    logger.warn(
      "[SHOPIFY DISCOUNT] title lookup failed; skipping delete retry",
      err
    );

    return false;
  }

  const nodes = data?.discountNodes?.edges || [];
  const matches = nodes.filter(({ node }) => {
    const d = node?.discount;
    const nodeTitle = d?.title || "";
    return nodeTitle === title;
  });

  if (!matches.length) return false;

  for (const match of matches) {
    const nodeId = match?.node?.id;
    if (!nodeId) continue;

    const typename = match.node.discount?.__typename || "";
    const isAutomatic = typename.startsWith("DiscountAutomatic");
    const mutation = isAutomatic ? deleteAutomaticMutation : deleteCodeMutation;
    await adminGraphql(shopDomain, accessToken, mutation, { id: nodeId });
  }

  return true;
};

const deleteShopifyDiscountById = async (shopDomain, accessToken, id) => {
  const deleteAutomaticMutation = `
    mutation DiscountAutomaticDelete($id: ID!) {
      discountAutomaticDelete(id: $id) { userErrors { field message } deletedAutomaticDiscountId }
    }
  `;

  const deleteCodeMutation = `
    mutation DiscountCodeDelete($id: ID!) {
      discountCodeDelete(id: $id) { userErrors { field message } deletedCodeDiscountId }
    }
  `;

  try {
    await adminGraphql(shopDomain, accessToken, deleteAutomaticMutation, {
      id,
    });
    return true;
  } catch (err) {
    // try code delete
  }

  try {
    await adminGraphql(shopDomain, accessToken, deleteCodeMutation, { id });
    return true;
  } catch {
    return false;
  }
};

const fetchDeliveryProfileZones = async (
  shopDomain,
  accessToken,
  profileId
) => {
  const query = `
    query DeliveryProfileZones($id: ID!) {
  deliveryProfile(id: $id) {
    id
    name
    profileLocationGroups {
      locationGroup { id }
      locationGroupZones(first: 50) {
        edges {
          node {
            zone {
              id
              name
              countries {
                code { countryCode restOfWorld }
                provinces { name code }
              }
            }
            methodDefinitions(first: 50) {
              edges {
                node {
                  id
                  name
                  active
                  description
                  rateProvider {
                    __typename
                    ... on DeliveryRateDefinition {
                      id
                      price { amount currencyCode }
                    }
                  }
                  methodConditions {
                    field
                    operator
                    conditionCriteria {
                      __typename
                      ... on MoneyV2 { amount currencyCode }
                      ... on Weight { value unit }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
  `;

  const data = await adminGraphql(shopDomain, accessToken, query, {
    id: profileId,
  });

  const profile = data?.deliveryProfile;

  if (!profile)
    throw new Error(`Delivery profile not found for id ${profileId}`);
  const zones = [];
  const locationGroups =
    profile.profileLocationGroups?.edges || profile.profileLocationGroups || [];
  for (const lg of locationGroups) {
    const lgNode = lg?.node || lg;
    const locationGroupZones =
      lgNode?.locationGroupZones?.edges || lgNode?.locationGroupZones || [];

    for (const z of locationGroupZones) {
      const zNode = z?.node || z;
      const zoneNode = zNode?.zone || {};
      const methodsEdges = zNode?.methodDefinitions?.edges || [];
      const deliveryMethods = methodsEdges
        .map((m) => m?.node)
        .filter(Boolean)
        .map((m) => {
          const provider = m.rateProvider || {};
          const price =
            provider.__typename === "DeliveryRateDefinition"
              ? provider.price || null
              : null;
          const subtotalCondition =
            (m.methodConditions || []).find((c) => {
              const field = c?.field;
              return (
                field === "SUBTOTAL" ||
                field === "ORDER_SUBTOTAL" ||
                field === "TOTAL_PRICE"
              );
            }) || null;

          const subtotalCriteria = subtotalCondition?.conditionCriteria;
          const subtotalAmount =
            subtotalCriteria?.__typename === "MoneyV2"
              ? subtotalCriteria?.amount
              : null;
          const subtotalCurrency =
            subtotalCriteria?.__typename === "MoneyV2"
              ? subtotalCriteria?.currencyCode
              : null;

          return {
            id: m.id || null,
            name: m.name || null,
            active: Boolean(m.active),
            priceAmount: price?.amount || null,
            priceCurrency: price?.currencyCode || null,
            subtotalAmount,
            subtotalCurrency,
          };
        });

      const countries = (zoneNode.countries || [])
        .map(
          (c) =>
            c?.code?.countryCode ||
            (c?.code?.restOfWorld ? "REST_OF_WORLD" : null)
        )
        .filter(Boolean);
      zones.push({
        id: zoneNode.id || null,
        name: zoneNode.name || null,
        countries,
        locationGroupId: lgNode?.locationGroup?.id || null,
        deliveryMethods,
      });
    }
  }

  return { profileId: profile.id, zones };
};

const fetchShopCurrency = async (shopDomain, accessToken) => {
  try {
    const data = await adminGraphql(
      shopDomain,
      accessToken,
      ` query ShopCurrency {
          shop {
            currencyCode
          }
        }
      `
    );

    return data?.shop?.currencyCode || "USD";
  } catch (err) {
    logger.warn("[SHOPIFY SHIPPING SYNC] Shop currency lookup failed", err);

    return "USD";
  }
};

const moneyInput = (amount, currencyCode) => ({
  amount: Number(amount || 0).toFixed(2),
  currencyCode,
});

const DELIVERY_PROFILES_QUERY = `
  query DeliveryProfiles {
    deliveryProfiles(first: 5) {
      edges {
        node {
          id
          name
        }
      }
    }
  }
`;

const DELIVERY_PROFILE_UPDATE_MUTATION = `
  mutation DeliveryProfileUpdate($id: ID!, $profile: DeliveryProfileInput!) {
    deliveryProfileUpdate(id: $id, profile: $profile) {
      userErrors {
        field
        message
      }
    }
  }
`;

const getDeliveryProfileContext = async (shopDomain, accessToken) => {
  try {
    const data = await adminGraphql(
      shopDomain,
      accessToken,
      DELIVERY_PROFILES_QUERY,
      {}
    );

    const edges = data?.deliveryProfiles?.edges || [];
    const profileNode = edges[0]?.node;
    const profileId = process.env.SHIPPING_PROFILE_ID || profileNode?.id || null;

    if (!profileId) return null;
    const { profileId: resolvedProfileId, zones } =
      await fetchDeliveryProfileZones(shopDomain, accessToken, profileId);
    return {
      profileId: resolvedProfileId,
      zones: zones || [],
    };
  } catch (err) {
    logger.warn("[SHOPIFY SHIPPING SYNC] GraphQL profile lookup failed", err);
    return null;
  }
};

const buildDeliveryMethodDefinitionInput = ({
  name,
  priceString,
  currencyCode,
  minSubtotalString,
}) => {
  const normalizedCurrency = (currencyCode || "USD").toUpperCase();

  const definition = {
    name,
    active: true,
    rateDefinition: {
      price: moneyInput(priceString, normalizedCurrency),
    },
  };

  if (minSubtotalString) {
    definition.priceConditionsToCreate = [
      {
        operator: "GREATER_THAN_OR_EQUAL_TO",
        criteria: moneyInput(minSubtotalString, normalizedCurrency),
      },
    ];
  }
  return definition;
};

const findGraphqlZoneByName = (zones = [], zoneName) => {
  if (!zones.length) return null;
  const normalized = (zoneName || "").trim().toLowerCase();
  const match = zones.find((z) => (z.name || "").toLowerCase() === normalized) || zones[0];
  return match || null;
};

const findGraphqlMethodDefinition = (
  zones = [],
  name,
  priceString,
  minSubtotalString
) => {
  const normalizedPrice = priceString !== null && priceString !== undefined ? Number(priceString).toFixed(2) : null;
  const normalizedMin = minSubtotalString !== null && minSubtotalString !== undefined ? Number(minSubtotalString).toFixed(2) : null;

  for (const zone of zones) {
    if (!zone?.deliveryMethods?.length) continue;
    for (const method of zone.deliveryMethods) {
      const methodPrice =
        method.priceAmount !== null && method.priceAmount !== undefined
          ? Number(method.priceAmount).toFixed(2)
          : null;
      const methodMin =
        method.subtotalAmount !== null && method.subtotalAmount !== undefined
          ? Number(method.subtotalAmount).toFixed(2)
          : null;
      const nameMatches = method.name === name;
      const priceMatches =
        normalizedPrice === null
          ? methodPrice === null
          : methodPrice === normalizedPrice;
      const minMatches =
        normalizedMin === null
          ? methodMin === null
          : methodMin === normalizedMin;
      if (nameMatches && priceMatches && minMatches) {
        return method;
      }
    }
  }

  return null;
};

const syncShippingRateViaGraphql = async ({
  shopDomain,
  accessToken,
  desired,
  zoneName,
  currencyCode,
}) => {
  const profileContext = await getDeliveryProfileContext(
    shopDomain,
    accessToken
  );

  if (!profileContext?.profileId) return null;

  const zone = findGraphqlZoneByName(profileContext.zones, zoneName);
  if (!zone?.id) {
    logger.warn(
      "[SHOPIFY SHIPPING SYNC] GraphQL fallback skipped - no zone found"
    );
    return null;
  }

  if (!zone.locationGroupId) {
    logger.warn(
      "[SHOPIFY SHIPPING SYNC] GraphQL fallback skipped - zone missing location group"
    );

    return null;
  }

  const priceString = Number(desired.price.amount || 0)
    .toFixed(2)
    .toString();

  const minSubtotalString =
    desired.hasMinSubtotal && desired.minSubtotal !== null
      ? Number(desired.minSubtotal || 0)
        .toFixed(2)
        .toString()
      : null;

  const existingMethod = findGraphqlMethodDefinition(
    [zone],
    desired.name,
    priceString,
    minSubtotalString
  );

  if (existingMethod?.id) {
    return normalizeShopifyRateId(existingMethod.id);
  }

  const methodDefinition = buildDeliveryMethodDefinitionInput({
    name: desired.name,
    priceString,
    currencyCode,
    minSubtotalString,
  });

  try {
    const profileInput = {
      locationGroupsToUpdate: [
        {
          id: zone.locationGroupId || null,
          zonesToUpdate: [
            {
              id: zone.id,
              methodDefinitionsToCreate: [methodDefinition],
            },
          ],
        },
      ],
    };

    const data = await adminGraphql(
      shopDomain,
      accessToken,
      DELIVERY_PROFILE_UPDATE_MUTATION,
      { id: profileContext.profileId, profile: profileInput }
    );

    const errors = data?.deliveryProfileUpdate?.userErrors || [];
    if (errors.length) {
      logger.warn("[SHOPIFY SHIPPING SYNC] GraphQL create failed", errors);
    }

    const refreshed = await fetchDeliveryProfileZones(
      shopDomain,
      accessToken,
      profileContext.profileId
    );

    const refreshedZones = refreshed?.zones || [];

    const created = findGraphqlMethodDefinition(
      refreshedZones,
      desired.name,
      priceString,
      minSubtotalString
    );

    if (created?.id) {
      return normalizeShopifyRateId(created.id);
    }

    return null;
  } catch (err) {
    logger.warn("[SHOPIFY SHIPPING SYNC] GraphQL create failed", err);
    return null;
  }
};

const buildRateName = (rule, index = null) => {
  const nameBase =
    rule.method === "express"
      ? "CartLift: Cart Drawer & Upsell Express"
      : "CartLift: Cart Drawer & Upsell Standard";

  const ordinal = Number.isInteger(index) && index >= 0 ? ` ${index + 1}` : "";

  return rule.rewardType === "free"
    ? `${nameBase}${ordinal} (Free)`
    : `${nameBase}${ordinal} (Reduced)`;
};

const deleteShippingRatesFromShopify = async (
  shopDomain,
  accessToken,
  rateIdsToDelete,
  rulesToDelete = []
) => {
  const ids = (rateIdsToDelete || []).map(String).filter(Boolean);

  const methodDefinitionIdsFromRules = (rulesToDelete || [])
    .map((rule) => normalizeShopifyRateId(rule.shopifyMethodDefinitionId))
    .filter(Boolean);

  const deleteTargets = (rulesToDelete || []).map((rule) => {
    const price =
      rule.rewardType === "free"
        ? 0
        : rule.rateType === "flat"
          ? Math.max(num(rule.amount), 0)
          : Math.max(num(rule.amount), 0);

    const minSubtotal =
      rule.minSubtotal !== undefined && rule.minSubtotal !== null
        ? Math.max(num(rule.minSubtotal), 0)
        : null;

    const preservedIndex =
      Number.isInteger(rule._ruleIndex) && rule._ruleIndex >= 0
        ? rule._ruleIndex
        : null;

    return {
      id: rule.shopifyRateId ? String(rule.shopifyRateId) : null,
      name: buildRateName(rule, preservedIndex),
      priceString: Number(price || 0)
        .toFixed(2)
        .toString(),

      minSubtotalString:
        minSubtotal !== null ? Number(minSubtotal).toFixed(2).toString() : null,
    };
  });

  if (!shopDomain || !accessToken) return;

  // Prefer GraphQL delete using methodDefinitionsToDelete (works with IDs alone)

  const profileQuery = `
    query DeliveryProfiles {
      deliveryProfiles(first: 1) { edges { node { id name } } }
    }
  `;

  try {
    const profiles = await adminGraphql(
      shopDomain,
      accessToken,
      profileQuery,
      {}
    );

    const targetProfileId =
      process.env.SHIPPING_PROFILE_ID ||
      profiles?.deliveryProfiles?.edges?.[0]?.node?.id ||
      null;

    if (targetProfileId) {
      const { zones } = await fetchDeliveryProfileZones(
        shopDomain,
        accessToken,
        targetProfileId
      );

      const matchedIds = [];

      for (const target of deleteTargets) {
        const methods = zones.flatMap((z) => z.deliveryMethods || []);

        for (const m of methods) {
          const priceString = Number(m.priceAmount || 0)
            .toFixed(2)
            .toString();
          const subtotalString =
            m.subtotalAmount !== null && m.subtotalAmount !== undefined
              ? Number(m.subtotalAmount || 0)
                .toFixed(2)
                .toString()
              : null;
          const idMatch = target.id && String(m.id) === String(target.id);
          const attrMatch =
            !target.id &&
            m.name === target.name &&
            priceString === target.priceString &&
            (target.minSubtotalString === null ||
              target.minSubtotalString === subtotalString);

          if (idMatch || attrMatch) {
            matchedIds.push(m.id);
          }
        }
      }

      const methodDefinitionIds = Array.from(
        new Set(
          [...methodDefinitionIdsFromRules, ...matchedIds].filter(Boolean)
        )
      );

      if (methodDefinitionIds.length) {
        const mutation = `
          mutation DeliveryProfileUpdate($id: ID!, $profile: DeliveryProfileInput!) {
            deliveryProfileUpdate(id: $id, profile: $profile) {
              userErrors { field message }
            }
          }
        `;

        const profileInput = {
          methodDefinitionsToDelete: methodDefinitionIds,
        };

        const data = await adminGraphql(
          shopDomain,
          accessToken,
          mutation,
          { id: targetProfileId, profile: profileInput }
        );

        const errs = data?.deliveryProfileUpdate?.userErrors || [];
        if (!errs.length) {
          return; // deletion done
        }
        logger.warn("[SHOPIFY SHIPPING SYNC] GraphQL delete userErrors", errs);
      }
    }
  } catch (err) {
    logger.warn("[SHOPIFY SHIPPING SYNC] GraphQL delete failed", err);
  }
};

const syncShippingRatesToShopify = async (rules, shopDomain, accessToken) => {
  if (!shopDomain || !accessToken) {
    logger.warn(
      "[SHOPIFY SHIPPING SYNC] Skipping - missing shopDomain or accessToken"
    );

    return [];
  }

  const enabledRules = (rules || [])
    .map((rule, originalIdx) => ({ rule, originalIdx }))
    .filter(({ rule }) => rule.enabled);
  if (!enabledRules.length) {
    logger.log("[SHOPIFY SHIPPING SYNC] No enabled rules, skipping sync");
    return [];
  }

  const normalized = enabledRules
    .map(({ rule, originalIdx }) => {
      const hasMinSubtotal = notEmpty(rule.minSubtotal);
      const min = hasMinSubtotal ? Math.max(num(rule.minSubtotal), 0) : null;
      const preservedIdx =
        Number.isInteger(rule._ruleIndex) && rule._ruleIndex >= 0
          ? rule._ruleIndex
          : originalIdx;
      return { rule, min, hasMinSubtotal, idx: preservedIdx };
    })

    .sort((a, b) => {
      const aMin = a.min ?? Number.POSITIVE_INFINITY;
      const bMin = b.min ?? Number.POSITIVE_INFINITY;
      return aMin - bMin;
    });

  const currencyCode = await fetchShopCurrency(shopDomain, accessToken);

  const desiredRates = normalized.map(({ rule, idx, min, hasMinSubtotal }) => {
    const price =
      rule.rewardType === "free"
        ? 0
        : rule.rateType === "flat"
          ? Math.max(num(rule.amount), 0)
          : Math.max(num(rule.amount), 0);

    const name = buildRateName(rule, idx);

    return {
      name,
      price: moneyInput(price, currencyCode),
      ruleIndex: idx,
      shopifyRateId: rule.shopifyRateId || null,
      minSubtotal: min,
      hasMinSubtotal,
    };
  });

  const graphqlOnlyResults = [];

  for (const desired of desiredRates) {
    if (desired.shopifyRateId) {
      await deleteShippingRatesFromShopify(
        shopDomain,
        accessToken,
        [desired.shopifyRateId]
      );
    }

    const graphqlRateId = await syncShippingRateViaGraphql({
      shopDomain,
      accessToken,
      desired,
      zoneName: null,
      currencyCode,
    });

    if (graphqlRateId) {
      const normalizedGraphqlRateId = normalizeShopifyRateId(graphqlRateId);
      graphqlOnlyResults.push({
        ruleIndex: desired.ruleIndex,
        shopifyRateId: normalizedGraphqlRateId,
        shopifyMethodDefinitionId: normalizedGraphqlRateId,
        action: "create_graphql",
      });

      continue;
    }

    graphqlOnlyResults.push({
      ruleIndex: desired.ruleIndex,
      shopifyRateId: null,
      action: "error",
      error: "GraphQL create failed for price-based shipping rate",
    });
  }
  return graphqlOnlyResults;
};

const hydrateGraphqlMethodDefinitionIds = async ({
  shopDomain,
  accessToken,
  rules = [],
  ruleIndexToRowId,
}) => {
  if (!shopDomain || !accessToken || !rules.length) return;

  try {
    const profileContext = await getDeliveryProfileContext(
      shopDomain,
      accessToken
    );

    const zones = profileContext?.zones || [];

    if (!zones.length) return;

    for (const rule of rules) {
      const ruleIndex =
        Number.isInteger(rule._ruleIndex) && rule._ruleIndex >= 0
          ? rule._ruleIndex
          : null;

      if (ruleIndex === null) continue;

      const priceString = Number(rule.amount || 0)
        .toFixed(2)
        .toString();

      const minSubtotalString =
        rule.minSubtotal !== undefined && rule.minSubtotal !== null
          ? Number(rule.minSubtotal || 0)
            .toFixed(2)
            .toString()
          : null;

      const matched = findGraphqlMethodDefinition(
        zones,
        buildRateName(rule, ruleIndex),
        priceString,
        minSubtotalString
      );

      const methodId = normalizeShopifyRateId(matched?.id);

      if (!methodId) continue;

      const targetId = ruleIndexToRowId.get(ruleIndex);
      if (!targetId) continue;

      const alreadyMatching =
        normalizeShopifyRateId(rule.shopifyMethodDefinitionId) === methodId &&
        normalizeShopifyRateId(rule.shopifyRateId) === methodId;

      if (alreadyMatching) continue;

      await prisma.shippingRule.update({
        where: { id: targetId },
        data: {
          shopifyRateId: methodId,
          shopifyMethodDefinitionId: methodId,
        },
      });
      rule.shopifyRateId = methodId;
      rule.shopifyMethodDefinitionId = methodId;
    }
  } catch (err) {
    logger.warn(
      "[SHOPIFY SHIPPING SYNC] hydrate GraphQL method definition IDs failed",
      err
    );
  }
};

const buildAutomaticFreeShippingInput = (rule, index = null) => {
  const minSubtotal = num(rule.minSubtotal || rule.minPurchase || 0);
  const minSubtotalInput = minSubtotal ? minSubtotal.toFixed(2) : null;
  const methodLabel = rule.method === "express" ? "Express" : "Standard";
  const baseTitle = `Free shipping (${methodLabel})${minSubtotal ? ` ${minSubtotalInput}+` : ""
    }`.trim();

  return {
    title: appendRuleIndexSuffix(baseTitle, index),
    ...scheduleInputFields(rule),
    minimumRequirement: minSubtotalInput
      ? { subtotal: { greaterThanOrEqualToSubtotal: minSubtotalInput } }
      : null,
    combinesWith: {
      orderDiscounts: true,
      productDiscounts: false,
      shippingDiscounts: false,
    },
  };
};

const AUTOMATIC_DISCOUNT_MUTATION = `
    mutation DiscountAutomaticBasicCreate($automaticBasicDiscount: DiscountAutomaticBasicInput!) {
      discountAutomaticBasicCreate(automaticBasicDiscount: $automaticBasicDiscount) {
        automaticDiscountNode { id }
        userErrors { field message }
      }
    }
  `;

const AUTOMATIC_DISCOUNT_UPDATE_MUTATION = `
    mutation DiscountAutomaticBasicUpdate($id: ID!, $automaticBasicDiscount: DiscountAutomaticBasicInput!) {
      discountAutomaticBasicUpdate(id: $id, automaticBasicDiscount: $automaticBasicDiscount) {
        automaticDiscountNode { id }
        userErrors { field message }
      }
    }
  `;

const AUTOMATIC_DISCOUNT_ACTIVATE_MUTATION = `
    mutation DiscountAutomaticActivate($id: ID!) {
      discountAutomaticActivate(id: $id) {
        userErrors { field message }
      }
    }
  `;

const AUTOMATIC_DISCOUNT_DEACTIVATE_MUTATION = `
    mutation DiscountAutomaticDeactivate($id: ID!) {
      discountAutomaticDeactivate(id: $id) {
        userErrors { field message }
      }
    }
  `;

const DISCOUNT_CODE_ACTIVATE_MUTATION = `
    mutation DiscountCodeActivate($id: ID!) {
      discountCodeActivate(id: $id) {
        userErrors { field message }
      }
    }
  `;

const DISCOUNT_CODE_DEACTIVATE_MUTATION = `
    mutation DiscountCodeDeactivate($id: ID!) {
      discountCodeDeactivate(id: $id) {
        userErrors { field message }
      }
    }
  `;

const AUTOMATIC_BXGY_DISCOUNT_MUTATION = `
    mutation DiscountAutomaticBxgyCreate($automaticBxgyDiscount: DiscountAutomaticBxgyInput!) {
      discountAutomaticBxgyCreate(automaticBxgyDiscount: $automaticBxgyDiscount) {
        automaticDiscountNode { id }
        userErrors { field message }
      }
    }
  `;

const AUTOMATIC_BXGY_DISCOUNT_UPDATE_MUTATION = `
    mutation DiscountAutomaticBxgyUpdate($id: ID!, $automaticBxgyDiscount: DiscountAutomaticBxgyInput!) {
      discountAutomaticBxgyUpdate(id: $id, automaticBxgyDiscount: $automaticBxgyDiscount) {
        automaticDiscountNode { id }
        userErrors { field message }
      }
    }
  `;

const syncDiscountsToShopify = async (rules = [], shopDomain, accessToken) => {
  const enabled = (rules || [])
    .map((rule, idx) => ({
      rule,
      idx: Number.isInteger(rule?.__ruleIndex) ? rule.__ruleIndex : idx,
    }))
    .filter(({ rule }) => rule && rule.enabled);

  const disabled = (rules || []).filter((r) => {
    if (!r || r.enabled) return false;
    const ruleType =
      typeof r.type === "string" ? r.type.toLowerCase() : "automatic";
    if (ruleType === "code" || ruleType === "code_free_shipping") return false;
    const discountId = r.shopifyDiscountCodeId || r.shopifyDiscountId || "";
    if (!discountId) return false;
    if (typeof discountId === "string" && discountId.includes("DiscountCodeNode")) {
      return false;
    }
    return true;
  });

  if (!shopDomain || !accessToken) {
    throw new Error("Missing shop domain or access token for Shopify Admin");
  }

  const currencyCode = await fetchShopCurrency(shopDomain, accessToken);

  if (disabled.length) {
    for (const rule of disabled) {
      const discountId =
        rule.shopifyDiscountCodeId ||
        rule.shopifyDiscountId ||
        null;
      if (!discountId) continue;
      try {
        await adminGraphql(shopDomain, accessToken, AUTOMATIC_DISCOUNT_DEACTIVATE_MUTATION, {
          id: discountId,
        });
      } catch (err) {
        logger.error("Shopify discount deactivate failed", err);
      }
    }
  }

  if (!enabled.length) return [];

  const codeMutation = `
    mutation DiscountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
      discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
        codeDiscountNode { id }
        userErrors { field message }
      }
    }
  `;

  const codeUpdateMutation = `
    mutation DiscountCodeBasicUpdate($id: ID!, $basicCodeDiscount: DiscountCodeBasicInput!) {
      discountCodeBasicUpdate(id: $id, basicCodeDiscount: $basicCodeDiscount) {
        codeDiscountNode { id }
        userErrors { field message }
      }
    }
  `;

  const freeShipCodeMutation = `
    mutation DiscountCodeFreeShippingCreate($freeShippingDiscount: DiscountCodeFreeShippingInput!) {
      discountCodeFreeShippingCreate(freeShippingDiscount: $freeShippingDiscount) {
        codeDiscountNode { id }
        userErrors { field message }
      }
    }
  `;

  const freeShipCodeUpdateMutation = `
    mutation DiscountCodeFreeShippingUpdate($id: ID!, $freeShippingDiscount: DiscountCodeFreeShippingInput!) {
      discountCodeFreeShippingUpdate(id: $id, freeShippingDiscount: $freeShippingDiscount) {
        codeDiscountNode { id }
        userErrors { field message }
      }
    }
  `;

  const freeShipAutoMutation = `
    mutation DiscountAutomaticFreeShippingCreate($freeShippingAutomaticDiscount: DiscountAutomaticFreeShippingInput!) {
      discountAutomaticFreeShippingCreate(freeShippingAutomaticDiscount: $freeShippingAutomaticDiscount) {
        automaticDiscountNode { id }
        userErrors { field message }
      }
    }
  `;

  const freeShipAutoUpdateMutation = `
    mutation DiscountAutomaticFreeShippingUpdate($id: ID!, $freeShippingAutomaticDiscount: DiscountAutomaticFreeShippingInput!) {
      discountAutomaticFreeShippingUpdate(id: $id, freeShippingAutomaticDiscount: $freeShippingAutomaticDiscount) {
        automaticDiscountNode { id }
        userErrors { field message }
      }
    }
  `;

  const results = [];

  for (let i = 0; i < enabled.length; i += 1) {
    const { rule, idx: ruleIndex } = enabled[i];
    const titleIndex =
      Number.isInteger(ruleIndex) && ruleIndex >= 0 ? ruleIndex : i;
    try {
      if (rule.rewardType === "free_shipping" && rule.type === "code") {
        const code = notEmpty(rule.discountCode)
          ? rule.discountCode
          : generateDiscountCode(rule, titleIndex);

        const input = buildFreeShippingCodeInput(rule, code, currencyCode, titleIndex);
        const existingId = rule.shopifyDiscountCodeId || null;
        logger.log(
          `[SHOPIFY DISCOUNT] free-shipping code ${existingId ? "update" : "create"} input`,
          input
        );

        const create = async () =>
          adminGraphql(shopDomain, accessToken, freeShipCodeMutation, {
            freeShippingDiscount: input,
          });
        const update = async () =>
          adminGraphql(shopDomain, accessToken, freeShipCodeUpdateMutation, {
            id: existingId,
            freeShippingDiscount: input,
          });
        const data = existingId
          ? await update().catch(async (err) => {
            logger.warn(
              "[SHOPIFY DISCOUNT] free-shipping code update failed, creating replacement",
              err
            );
            await deleteShopifyDiscountById(shopDomain, accessToken, existingId);
            return create();
          })
          : await create();

        results.push({
          ruleIndex,
          type: "code_free_shipping",
          code,
          id:
            data?.discountCodeFreeShippingUpdate?.codeDiscountNode?.id ||
            data?.discountCodeFreeShippingCreate?.codeDiscountNode?.id ||
            null,
        });
      } else if (rule.rewardType === "free_shipping" && rule.type !== "code") {
        const input = buildAutomaticFreeShippingInput(rule, titleIndex);
        const existingId = rule.shopifyDiscountCodeId || null;
        logger.log(
          `[SHOPIFY DISCOUNT] auto free shipping ${existingId ? "update" : "create"} input`,
          input
        );

        const create = async () =>
          adminGraphql(shopDomain, accessToken, freeShipAutoMutation, {
            freeShippingAutomaticDiscount: input,
          });

        const update = async () =>
          adminGraphql(shopDomain, accessToken, freeShipAutoUpdateMutation, {
            id: existingId,
            freeShippingAutomaticDiscount: input,
          });

        const data = existingId
          ? await update().catch(async (err) => {
            logger.warn(
              "[SHOPIFY DISCOUNT] auto free shipping update failed, creating replacement",
              err
            );
            await deleteShopifyDiscountById(shopDomain, accessToken, existingId);
            return create();
          })
          : await create();

        results.push({
          ruleIndex,
          type: "automatic_free_shipping",
          id:
            data?.discountAutomaticFreeShippingUpdate?.automaticDiscountNode
              ?.id ||
            data?.discountAutomaticFreeShippingCreate?.automaticDiscountNode
              ?.id ||
            null,
        });
      } else if (rule.type === "code") {
        const code = notEmpty(rule.discountCode)
          ? rule.discountCode
          : generateDiscountCode(rule, titleIndex);
        const input = buildDiscountCodeInput(
          rule,
          code,
          currencyCode,
          titleIndex
        );
        const existingId = rule.shopifyDiscountCodeId || null;
        logger.log(
          `[SHOPIFY DISCOUNT] code ${existingId ? "update" : "create"} input`,
          input
        );

        const create = async () =>
          adminGraphql(shopDomain, accessToken, codeMutation, {
            basicCodeDiscount: input,
          });
        const update = async () =>
          adminGraphql(shopDomain, accessToken, codeUpdateMutation, {
            id: existingId,
            basicCodeDiscount: input,
          });

        const data = existingId
          ? await update().catch(async (err) => {
            logger.warn(
              "[SHOPIFY DISCOUNT] code update failed, creating replacement",
              err
            );
            await deleteShopifyDiscountById(shopDomain, accessToken, existingId);
            return create();
          })
          : await create().catch(async (err) => {
            if (
              err instanceof Error &&
              err.message.includes("Title must be unique")
            ) {
              await findAndDeleteDiscountByTitle(
                shopDomain,
                accessToken,
                input.title,
                "code"
              );
              return create();
            }
            throw err;
          });

        results.push({
          ruleIndex,
          type: "code",
          code,
          id:
            data?.discountCodeBasicUpdate?.codeDiscountNode?.id ||
            data?.discountCodeBasicCreate?.codeDiscountNode?.id ||
            null,
        });
      } else {
        const input = buildAutomaticDiscountInput(
          rule,
          currencyCode,
          titleIndex
        );
        const existingId = rule.shopifyDiscountCodeId || null;
        logger.log(
          `[SHOPIFY DISCOUNT] automatic ${existingId ? "update" : "create"} input`,
          input
        );
        const create = async () =>
          adminGraphql(shopDomain, accessToken, AUTOMATIC_DISCOUNT_MUTATION, {
            automaticBasicDiscount: input,
          });
        const update = async () =>
          adminGraphql(
            shopDomain,
            accessToken,
            AUTOMATIC_DISCOUNT_UPDATE_MUTATION,
            {
              id: existingId,
              automaticBasicDiscount: input,
            }
          );

        const data = existingId
          ? await update().catch(async (err) => {
            logger.warn(
              "[SHOPIFY DISCOUNT] automatic update failed, creating replacement",
              err
            );
            await deleteShopifyDiscountById(shopDomain, accessToken, existingId);
            return create();
          })
          : await create().catch(async (err) => {
            if (
              err instanceof Error &&
              err.message.includes("Title must be unique")
            ) {
              await findAndDeleteDiscountByTitle(
                shopDomain,
                accessToken,
                input.title,
                "automatic"
              );
              return create();
            }
            throw err;
          });

        results.push({
          ruleIndex,
          type: "automatic",
          id:
            data?.discountAutomaticBasicUpdate?.automaticDiscountNode?.id ||
            data?.discountAutomaticBasicCreate?.automaticDiscountNode?.id ||
            null,
        });
      }
    } catch (err) {
      logger.error("Shopify discount sync failed", err);
      results.push({
        error: err instanceof Error ? err.message : "Unknown error",
        rule,
      });
    }
  }
  const errors = results.filter((r) => r.error);
  if (errors.length) {
    throw new Error(errors.map((e) => e.error).join("; "));
  }
  return results;
};

const syncBxgyRulesToShopify = async (rules = [], shopDomain, accessToken) => {
  const candidates = (rules || [])
    .map((rule, idx) => {
      const candidateIndex = Number.isInteger(rule.__ruleIndex)
        ? rule.__ruleIndex
        : idx;

      const { __ruleIndex, ...ruleData } = rule;
      return { rule: ruleData, idx: candidateIndex };
    })

    .filter(({ rule }) => rule?.enabled);

  if (!candidates.length) return [];
  if (!shopDomain || !accessToken) {
    throw new Error("Missing shop domain or access token for Shopify Admin");
  }

  const results = [];

  for (const { rule, idx } of candidates) {
    try {
      const input = buildBxgyAutomaticInput(rule, idx);
      const create = async () =>
        adminGraphql(
          shopDomain,
          accessToken,
          AUTOMATIC_BXGY_DISCOUNT_MUTATION,
          {
            automaticBxgyDiscount: input,
          }
        );
      const update = async () =>
        adminGraphql(
          shopDomain,
          accessToken,
          AUTOMATIC_BXGY_DISCOUNT_UPDATE_MUTATION,
          {
            id: rule.buyxgetyId,
            automaticBxgyDiscount: input,
          }
        );

      const data = rule.buyxgetyId
        ? await update().catch(async (err) => {
          logger.warn(
            "[SHOPIFY BXGY] update failed, creating replacement",
            err
          );
          await deleteShopifyDiscountById(
            shopDomain,
            accessToken,
            rule.buyxgetyId
          );
          return create();
        })
        : await create().catch(async (err) => {
          if (
            err instanceof Error &&
            err.message.includes("Title must be unique")
          ) {
            await findAndDeleteDiscountByTitle(
              shopDomain,
              accessToken,
              input.title,
              "automatic"
            );
            return create();
          }
          throw err;
        });

      results.push({
        index: idx,
        id:
          data?.discountAutomaticBxgyUpdate?.automaticDiscountNode?.id ||
          data?.discountAutomaticBxgyCreate?.automaticDiscountNode?.id ||
          null,
      });
    } catch (err) {
      logger.error("Shopify BXGY discount sync failed", err);
      results.push({
        index: idx,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  const errors = results.filter((r) => r.error);
  if (errors.length) {
    throw new Error(errors.map((e) => e.error).join("; "));
  }
  return results;
};

const freeSummary = (r, productsById, currency = "USD") => {
  const gift = productsById[r.bonus]?.title || r.bonus || "Gift";
  const quantity = notEmpty(r.qty) ? r.qty : "1";
  const triggerType = normalizeTriggerType(r.triggerType);
  const threshold =
    triggerType === "quantity"
      ? notEmpty(r.minQuantity)
        ? ` when cart qty >= ${r.minQuantity}`
        : ""
      : notEmpty(r.minPurchase)
        ? ` when order >= ${formatCurrency(r.minPurchase, currency)}`
        : "";

  return `Summary: auto-add ${gift} (${quantity})${threshold}`;
};

const bxgySummary = (r) => {
  const stacking = r.allowStacking ? "stackable" : "no stacking";
  const scopeText =
    r.scope === "store"
      ? "whole store"
      : r.scope === "collection"
        ? `${r.appliesTo?.collections?.length || 0} collections`
        : `${r.appliesTo?.products?.length || 0} products`;
  return `Summary: Buy ${r.xQty} get ${r.yQty} (${scopeText}, ${stacking})`;
};

const celebrationStyles = `
.theme-burst-plate {
  position: relative;
  margin-top: 8px;
}
.theme-burst {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.theme-burst span {
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 999px;
  opacity: 0;
  animation: theme-bubble 0.9s ease-out forwards;
}

@keyframes theme-bubble {
  0% {
    opacity: 0.9;
    transform: translate(0, 0) scale(0.6);
  }

  100% {
    opacity: 0;
    transform: translate(var(--tx, 0px), -70px) scale(1.8);
  }
}

.rule-illustration {
  width: 140px;
  height: 110px;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.rule-illustration svg {
  width: 100%;
  height: 100%;
  border-radius: 4px;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.12);
  background: white;
  padding: 12px;
}
.tier-progress {
  margin-top: 26px;
  --tier-progress-color: #e20776;
}
.tier-progress__track {
  position: relative;
  height: 12px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.35);
  border: 1px solid rgba(0, 0, 0, 0.15);
}
.tier-progress__fill {
  height: 100%;
  border-radius: 999px;
  transition: width 260ms ease-out;
}
.tier-progress__steps {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-top: 14px;
  color: rgba(8, 8, 8, 0.9);
}
.tier-step {
  text-align: center;
  flex: 1;
}

.tier-step__node {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 3px solid #ffffff;
  margin: 0 auto 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  color: #9ba2b1;
  background: #d7dae1;
  transition: all 160ms ease;
  box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.08);
}

.tier-step--complete .tier-step__node {
  background: var(--tier-progress-color);
  color: #ffffff;
  border-color: #ffffff;
  box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.12), 0 0 12px rgba(226, 7, 118, 0.35);
}

.tier-step--active .tier-step__node {
  border-color: rgba(226, 7, 118, 0.5);
}

.tier-step__label {
  font-size: 12px;
  line-height: 1.2;
  color: inherit;
}

.picker-modal-controls {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.picker-modal-controls .picker-search {
  flex: 1;
  min-width: 220px;
}
.picker-modal-scroll {
  max-height: 420px;
  overflow-y: auto;
}

.picker-table {
  border: 1px solid #e6e8ec;
  border-radius: 4px;
  overflow: hidden;
}

.picker-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-bottom: 1px solid #f1f2f5;
}

.picker-row:last-child {
  border-bottom: none;
}

.picker-thumb {
  width: 44px;
  height: 44px;
  border-radius: 4px;
  background: #f5f5f7;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.picker-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.picker-row__meta {
  flex: 1;
}
.picker-row__title {
  font-size: 13px;
  font-weight: 500;
}
.picker-row__subtitle {
  font-size: 12px;
  color: rgba(71, 85, 105, 0.9);
}
.picker-empty {
  padding: 36px 12px;
  text-align: center;
  color: rgba(71, 85, 105, 0.8);
}
`;

const ruleIconArt = {
  shipping: (
    <svg viewBox="0 0 120 120" role="img">
      <rect x="12" y="18" width="96" height="68" rx="18" fill="#E0F2FE" />
      <rect x="26" y="34" width="46" height="38" rx="10" fill="#38BDF8" />
      <path d="M72 45h28v19H72z" fill="#FDE68A" />
      <path d="M72 64l9 12h31l-9-12H72z" fill="#2563EB" />
      <circle cx="43" cy="88" r="9" fill="#0EA5E9" />
      <circle cx="89" cy="88" r="9" fill="#F97316" />
      <circle cx="60" cy="28" r="8" fill="#FACC15" />
    </svg>
  ),

  discount: (
    <svg viewBox="0 0 120 120" role="img">
      <rect x="16" y="18" width="88" height="84" rx="22" fill="#F0F9FF" />
      <rect x="30" y="34" width="60" height="52" rx="14" fill="#22D3EE" />
      <rect x="40" y="44" width="39" height="8" rx="4" fill="#ECFEFF" />
      <rect x="40" y="58" width="46" height="8" rx="4" fill="#ECFEFF" />
      <circle cx="44" cy="78" r="7" fill="#F97316" />
      <circle cx="68" cy="78" r="7" fill="#FACC15" />
      <path d="M88 32l12-10" stroke="#F43F5E" strokeWidth="6" strokeLinecap="round" />
    </svg>
  ),

  free: (
    <svg viewBox="0 0 120 120" role="img">
      <rect x="10" y="26" width="100" height="68" rx="20" fill="#EEF2FF" />
      <rect x="24" y="40" width="72" height="46" rx="12" fill="#6366F1" />
      <rect x="34" y="52" width="52" height="8" rx="4" fill="#C7D2FE" />
      <rect x="34" y="66" width="60" height="8" rx="4" fill="#C7D2FE" />
      <circle cx="40" cy="82" r="7" fill="#A855F7" />
      <path d="M22 30l12-12" stroke="#FBBF24" strokeWidth="6" strokeLinecap="round" />
      <path d="M88 92l12 12" stroke="#F97316" strokeWidth="6" strokeLinecap="round" />
    </svg>
  ),

  bxgy: (
    <svg viewBox="0 0 120 120" role="img">
      <rect x="8" y="20" width="104" height="80" rx="28" fill="#ECFDF5" />
      <rect x="26" y="36" width="68" height="48" rx="14" fill="#34D399" />
      <rect x="38" y="48" width="44" height="8" rx="4" fill="#DCFCE7" />
      <rect x="38" y="62" width="52" height="8" rx="4" fill="#DCFCE7" />
      <circle cx="40" cy="86" r="9" fill="#059669" />
      <circle cx="80" cy="86" r="9" fill="#0EA5E9" />
      <path d="M26 36l-8-12" stroke="#FBBF24" strokeWidth="5" strokeLinecap="round" />
    </svg>
  ),

  style: (
    <svg viewBox="0 0 120 120" role="img">
      <rect x="14" y="20" width="92" height="72" rx="22" fill="#FFF1F2" />
      <rect x="28" y="34" width="64" height="44" rx="12" fill="#EC4899" />
      <path d="M32 44h40" stroke="#FECDD3" strokeWidth="6" strokeLinecap="round" />
      <path d="M32 58h56" stroke="#FECDD3" strokeWidth="6" strokeLinecap="round" />
      <circle cx="40" cy="76" r="9" fill="#F59E0B" />
      <circle cx="68" cy="76" r="9" fill="#6366F1" />
      <circle cx="88" cy="36" r="10" fill="#10B981" />
    </svg>
  ),

  default: (
    <svg viewBox="0 0 120 120" role="img">
      <rect x="16" y="16" width="88" height="88" rx="26" fill="#F5F5F5" />
      <rect x="32" y="32" width="56" height="56" rx="16" fill="#CBD5F5" />
      <circle cx="60" cy="60" r="18" fill="#64748B" />
    </svg>
  ),
};

const iconGlyph = (choice) => (
  <Icon source={ICON_POLARIS[choice] || ICON_POLARIS.sparkles} />
);

/* ---------- Simple rule card ---------- */

function CartDrawerPreview({
  steps = ["", "", "", ""],
  rulesById = {},
  stylesFromDb = {},
  previewItems = [],
  upsellEnabled = false,
  upsellItems = [],
  upsellSettings = {},
  discountRules = [],
  freeRules = [],
  bxgyRules = [],
  currencyCode = "USD",
}) {
  const theme = buildThemeFromStyles(stylesFromDb);
  const previewCurrency = String(currencyCode || "USD").toUpperCase();
  const formatMoney = (value) => formatCurrency(value, previewCurrency);
  const checkoutLabel = theme.checkoutButtonText || "Checkout";
  const radius = theme.radius;
  const stepBg = theme.bg;
  const stepText = theme.textColor;
  const drawerRaw = theme.cartDrawerBackground;
  const drawerHex = normalizeHex(drawerRaw);
  const drawerMode = String(theme.cartDrawerBackgroundMode || "color").toLowerCase();
  const drawerSolid =
    drawerHex || normalizeHex(theme.bg) || DEFAULT_STYLE_SETTINGS.bg || "#000000";
  const drawerGradient = isCssGradient(drawerRaw)
    ? drawerRaw
    : drawerHex
      ? `linear-gradient(180deg, ${darkenHex(drawerHex, 0.22)} 0%, ${lightenHex(drawerHex, 0.22)} 100%)`
      : `linear-gradient(180deg, ${drawerSolid} 0%, ${drawerSolid} 100%)`;
  const wrapperBgStyle =
    drawerMode === "image" && theme.cartDrawerImage
      ? {
        backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.06) 100%), url(${theme.cartDrawerImage})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
      : { background: drawerMode === "color" ? drawerSolid : drawerGradient };

  const border = theme.borderColor || "rgba(255,255,255,0.18)";
  const cardBorder = theme.borderColor
    ? `${border}33` // lighten
    : "rgba(255,255,255,0.20)";
  const surface = "rgba(255,255,255,0.10)";
  const surface2 = "rgba(255,255,255,0.12)";
  const surfaceText = theme.cartDrawerTextColor;
  const headerText = theme.cartDrawerHeaderColor;
  const announcementBarBg =
    theme.announcementBarBackgroundColor || theme.buttonColor || stepBg;
  const announcementBarText =
    theme.announcementBarTextColor || surfaceText || "#ffffff";
  const buttonLabelColor = theme.buttonLabelColor || "#ffffff";
  const iconColor = theme.iconColor || stepText;
  const progressLineColor = theme.progress || stepText;
  const progressTrackBg = normalizeHex(progressLineColor)
    ? lightenHex(progressLineColor, 0.5)
    : "rgba(255,255,255,0.35)";
  const progressFillColor = progressLineColor;
  const stepNodeBg = "rgba(255,255,255,0.95)";
  const previewCardBg = "#ffffff";
  const previewCardText = "#111111";
  const previewCardBorder = "rgba(0,0,0,0.08)";

  const selected = steps.filter(Boolean).map((k) => rulesById[k]).filter(Boolean);
  const hasSteps = selected.length > 0;
  const PREVIEW_UNIT_PRICE = 100;
  const parsePreviewPrice = (value) => {
    if (value === undefined || value === null || value === "") return null;
    if (typeof value === "number") return value;
    const cleaned = String(value).replace(/[^0-9.-]/g, "");
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : null;
  };
  const items =
    Array.isArray(previewItems) && previewItems.length
      ? previewItems.map((x) => {
          const parsed = parsePreviewPrice(x?.price);
          const unit =
            Number.isFinite(parsed) && parsed > 0 ? parsed : PREVIEW_UNIT_PRICE;
          return { ...x, qty: 1, price: unit };
        })
      : [{ title: "Product", image: "", qty: 1, price: PREVIEW_UNIT_PRICE }];
  const subtotal = items.reduce(
    (sum, it) => sum + Number(it.price || 0) * Number(it.qty || 0),
    0
  );
  const totalQty = items.reduce((sum, it) => sum + Number(it.qty || 0), 0);

  const appliedDiscounts = (Array.isArray(discountRules) ? discountRules : [])
    .filter((rule) => String(rule?.type || "").toLowerCase() === "automatic")
    .filter((rule) => rule?.enabled !== false)
    .filter((rule) => {
      const isQty = normalizeTriggerType(rule.triggerType) === "quantity";
      const threshold = isQty ? getMinQuantity(rule) : getDiscountMinPurchase(rule);
      if (threshold === null || !Number.isFinite(Number(threshold))) return false;
      return isQty ? totalQty >= Number(threshold) : subtotal >= Number(threshold);
    })
    .map((rule) => {
      const value = getDiscountValue(rule);
      const isPercent = getDiscountValueMode(rule) !== "amount";
      const discountAmount =
        value !== null && Number.isFinite(Number(value))
          ? isPercent
            ? subtotal * (Number(value) / 100)
            : Number(value)
          : 0;
      const label = formatDiscountValueDisplay(rule, previewCurrency) || "";
      return { label, discountAmount, isPercent, value: Number(value) };
    });

  const totalDiscount = appliedDiscounts.reduce((sum, d) => sum + d.discountAmount, 0);
  const discountedSubtotal = Math.max(0, subtotal - totalDiscount);

  const normalizeAnnouncementText = (value) =>
    String(value ?? "").replace(/\s{2,}/g, " ").trim();

  const buildAnnouncementGoal = (isQty, remaining) =>
    isQty
      ? `${Math.ceil(remaining ?? 0)} ${Math.ceil(remaining ?? 0) === 1 ? "item" : "items"}`
      : remaining !== null ? formatMoney(remaining) : "";

  const autoDiscountAnnouncementMessages = (Array.isArray(discountRules) ? discountRules : [])
    .filter((rule) => String(rule?.type || "").toLowerCase() === "automatic")
    .filter((rule) => rule?.enabled !== false)
    .map((rule) => {
      const isQty = normalizeTriggerType(rule.triggerType) === "quantity";
      const threshold = isQty ? getMinQuantity(rule) : getDiscountMinPurchase(rule);
      const currentValue = isQty ? totalQty : subtotal;
      const remaining =
        threshold !== null && Number.isFinite(threshold)
          ? Math.max(0, threshold - currentValue)
          : null;
      const discountValueWithOff = formatDiscountValueDisplay(rule, previewCurrency) || "";
      const discountValue =
        discountValueWithOff.replace(/\s*off$/i, "").trim() || discountValueWithOff;
      const template = getProgressTextForTrigger(
        rule,
        DEFAULT_AUTO_DISCOUNT_CONTENT_TEXT,
        "before"
      );
      const tokens = {
        goal: buildAnnouncementGoal(isQty, remaining),
        current_status: isQty ? String(totalQty) : formatMoney(subtotal),
        discount: discountValue,
        discount_value: discountValue,
        discount_value_with_off: discountValueWithOff || discountValue,
      };
      return normalizeAnnouncementText(renderProgressText(template, tokens));
    })
    .filter(Boolean);

  const codeAnnouncementMessages = (Array.isArray(discountRules) ? discountRules : [])
    .filter((rule) => String(rule?.type || "").toLowerCase() === "code")
    .filter((rule) => rule?.enabled !== false)
    .map((rule) => {
      const isQty = normalizeTriggerType(rule.triggerType) === "quantity";
      const threshold = isQty ? getMinQuantity(rule) : getDiscountMinPurchase(rule);
      const currentValue = isQty ? totalQty : subtotal;
      const remaining =
        threshold !== null && Number.isFinite(threshold)
          ? Math.max(0, threshold - currentValue)
          : null;
      const discountValueWithOff = formatDiscountValueDisplay(rule, previewCurrency) || "";
      const discountValue =
        discountValueWithOff.replace(/\s*off$/i, "").trim() || discountValueWithOff;
      const discountCode =
        pickString(rule?.discountCode, rule?.discount_code, rule?.code) || "CODE";
      const rawBelow = pickString(rule?.progressTextBelow);
      const isGenericBelow =
        rawBelow && /^discount!?$/i.test(String(rawBelow).trim());
      const template = pickString(
        isGenericBelow ? "" : rawBelow,
        getProgressTextForTrigger(
          rule,
          DEFAULT_CODE_DISCOUNT_CONTENT_TEXT,
          "before"
        )
      );
      const tokens = {
        goal: buildAnnouncementGoal(isQty, remaining),
        current_status: isQty ? String(totalQty) : formatMoney(subtotal),
        discount: discountValue,
        discount_value: discountValue,
        discount_value_with_off: discountValueWithOff || discountValue,
        discount_code: discountCode,
      };
      return normalizeAnnouncementText(renderProgressText(template, tokens));
    })
    .filter(Boolean);

  const freeGiftAnnouncementMessages = (Array.isArray(freeRules) ? freeRules : [])
    .filter((rule) => rule?.enabled !== false)
    .map((rule) => {
      const isQty = normalizeTriggerType(rule.triggerType) === "quantity";
      const threshold = isQty ? getMinQuantity(rule) : getFreeGiftMinPurchase(rule);
      const currentValue = isQty ? totalQty : subtotal;
      const remaining =
        threshold !== null && Number.isFinite(threshold)
          ? Math.max(0, threshold - currentValue)
          : null;
      const template = getProgressTextForTrigger(
        rule,
        DEFAULT_FREE_GIFT_CONTENT_TEXT,
        "before"
      );
      const tokens = {
        goal: buildAnnouncementGoal(isQty, remaining),
        current_status: isQty ? String(totalQty) : formatMoney(subtotal),
      };
      return normalizeAnnouncementText(renderProgressText(template, tokens));
    })
    .filter(Boolean);

  const bxgyAnnouncementMessages = (Array.isArray(bxgyRules) ? bxgyRules : [])
    .filter((rule) => rule?.enabled !== false)
    .map((rule) => {
      const xQty = pickNumber(rule?.xQty, rule?.x_qty, rule?.x);
      const yQty = pickNumber(rule?.yQty, rule?.y_qty, rule?.y);
      const isUnlocked =
        Number.isFinite(xQty) && Number(xQty) > 0 ? totalQty >= Number(xQty) : false;
      const template = pickString(
        isUnlocked ? rule?.afterOfferUnlockMessage : rule?.beforeOfferUnlockMessage,
        isUnlocked
          ? DEFAULT_BXGY_CONTENT_TEXT.afterOfferUnlockMessage
          : DEFAULT_BXGY_CONTENT_TEXT.beforeOfferUnlockMessage
      );
      const tokens = {
        x: Number.isFinite(xQty) ? xQty : "X",
        y: Number.isFinite(yQty) ? yQty : "Y",
      };
      return normalizeAnnouncementText(renderProgressText(template, tokens));
    })
    .filter(Boolean);

  const announcementMessages = [
    ...autoDiscountAnnouncementMessages,
    ...codeAnnouncementMessages,
    ...freeGiftAnnouncementMessages,
    ...bxgyAnnouncementMessages,
  ];
  const marqueeBaseMessages =
    announcementMessages.length === 1
      ? new Array(4).fill(announcementMessages[0])
      : announcementMessages;
  const marqueeMessages = marqueeBaseMessages.length
    ? [...marqueeBaseMessages, ...marqueeBaseMessages]
    : [];
  const thresholdsInOrder = selected.map((r) =>
    Number.isFinite(Number(r.threshold)) ? Number(r.threshold) : 0
  );

  const hasQuantityStep = selected.some((r) => r?.triggerType === "quantity");
  const progressCurrentValue = hasQuantityStep ? totalQty : subtotal;

  const nextRule = selected.find((r) => {
    const metric = r?.triggerType === "quantity" ? totalQty : subtotal;
    const t = Number.isFinite(Number(r.threshold)) ? Number(r.threshold) : 0;
    return metric < t;
  });
  const nextThreshold = nextRule ? Number(nextRule.threshold) : undefined;
  const isQuantityNext = nextRule?.triggerType === "quantity";
  const remaining = nextThreshold
    ? Math.max(0, nextThreshold - (isQuantityNext ? totalQty : subtotal))
    : 0;
  const rewardText =
    hasSteps && nextRule
      ? isQuantityNext
        ? `Add ${Math.ceil(remaining)} more ${Math.ceil(remaining) === 1 ? "item" : "items"} for next reward`
        : `Spend ${formatMoney(remaining)} more for next reward`
      : hasSteps
        ? "All rewards unlocked"
        : "";

  const centers = getStepCenters(selected.length);
  const fillPct = hasSteps
    ? computeSegmentProgressPct(progressCurrentValue, thresholdsInOrder, centers)
    : 0;

  const footerWrapStyle = {
    padding: 14,
    borderTop: `1px solid ${border}`,
    background: "rgba(0,0,0,0.02)",
  };

  const discountRowStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 92px",
    gap: 10,
    marginBottom: 12,
  };

  const discountFieldStyle = {
    background: previewCardBg,
    border: `1px solid ${previewCardBorder}`,
    borderRadius: radius,
    padding: "14px 16px",
    color: previewCardText,
    fontWeight: 700,
    fontSize: theme.base,
    opacity: 0.95,
  };

  const discountBtnStyle = {
    background: theme.buttonColor || surface2,
    border: `1px solid ${border}`,
    borderRadius: radius,
    display: "grid",
    placeItems: "center",
    color: buttonLabelColor,
    fontWeight: 800,
    fontSize: theme.base,
  };

  const checkoutStyle = {
    background: theme.buttonColor || surface2,
    border: `1px solid ${border}`,
    borderRadius: radius,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: buttonLabelColor,
    fontWeight: 600,
    fontSize: theme.headingPx,
    position: "relative",
    minHeight: 54,
  };
  const checkoutLabelWithTotal = `${checkoutLabel} - ${formatMoney(discountedSubtotal)}`;

  const badgeStyle = {
    position: "absolute",
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 999,
    background: "rgba(255,255,255,0.18)",
    border: `1px solid ${cardBorder}`,
    display: "grid",
    placeItems: "center",
    color: surfaceText,
    fontWeight: 600,
    fontSize: Math.max(12, theme.base - 2),
  };

  const upsellMode = String(upsellSettings?.recommendationMode || "auto");
  const upsellSelectedProductIds = Array.isArray(upsellSettings?.selectedProductIds)
    ? upsellSettings.selectedProductIds
    : [];
  const upsellSelectedCollectionIds = Array.isArray(upsellSettings?.selectedCollectionIds)
    ? upsellSettings.selectedCollectionIds
    : [];
  const upsellSelectionReady =
    upsellMode === "product"
      ? upsellSelectedProductIds.length > 0
      : upsellMode === "collection"
        ? upsellSelectedCollectionIds.length > 0
        : true;
  const upsellEnabledFromSettings =
    typeof upsellSettings?.enabled === "boolean"
      ? upsellSettings.enabled
      : upsellEnabled;
  const upsellPreviewEnabled = Boolean(
    upsellEnabledFromSettings &&
      upsellSelectionReady &&
      Array.isArray(upsellItems) &&
      upsellItems.length
  );
  const upsellTitle = String(upsellSettings?.sectionTitle || "You may also like");
  const upsellBtnText = String(upsellSettings?.buttonText || "Add to cart");
  const upsellBg = upsellSettings?.backgroundColor || "rgba(255,255,255,0.08)";
  const upsellText = upsellSettings?.textColor || surfaceText;
  const upsellBorder = upsellSettings?.borderColor;
  const upsellButtonBg = upsellSettings?.buttonColor || theme.buttonColor || surface2;
  const upsellCardBg = upsellBg;
  const upsellCardText = upsellText;
  const upsellCardBorder = upsellBorder || "rgba(0,0,0,0.08)";
  const upsellShowAsSlider = Boolean(upsellSettings?.showAsSlider);
  const upsellAutoplay = Boolean(upsellSettings?.autoplay);
  const upsellArrowColor = upsellSettings?.arrowColor || upsellText;
  const canSlideUpsell = Boolean(upsellShowAsSlider && upsellItems.length > 1);
  const upsellArrowButtonSize = 30;
  const upsellPreviewSidePadding = canSlideUpsell ? 38 : 0;
  const [upsellSlideIndex, setUpsellSlideIndex] = React.useState(0);

  React.useEffect(() => {
    setUpsellSlideIndex(0);
  }, [upsellShowAsSlider, upsellItems.length]);

  React.useEffect(() => {
    if (!canSlideUpsell || !upsellAutoplay) return;
    const timer = setInterval(() => {
      setUpsellSlideIndex((prev) =>
        prev + 1 >= upsellItems.length ? 0 : prev + 1
      );
    }, 3000);
    return () => clearInterval(timer);
  }, [canSlideUpsell, upsellAutoplay, upsellItems.length]);

  const upsellVisibleItems = upsellItems;

  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          width: "100%",
          minHeight: 560,
          borderRadius: radius,
          overflow: "hidden",
          fontFamily: theme.font,
          ...wrapperBgStyle,
          border: `1px solid ${border}`,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              minWidth: 0,
              fontSize: theme.headingPx,
              color: headerText,
            }}
          >
            {theme.cartIconUrl ? (
              <img
                src={theme.cartIconUrl}
                alt=""
                style={{ width: 28, height: 28, objectFit: "contain" }}
              />
            ) : (
              <span style={{ color: iconColor, lineHeight: 0 }}>
                <svg width="28" height="28" viewBox="0 0 28 26" fill="none" aria-hidden="true">
                  <path d="M8.57235 25C9.26443 25 9.82548 24.4389 9.82548 23.7468C9.82548 23.0548 9.26443 22.4937 8.57235 22.4937C7.88026 22.4937 7.31921 23.0548 7.31921 23.7468C7.31921 24.4389 7.88026 25 8.57235 25Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M22.357 25C23.0491 25 23.6101 24.4389 23.6101 23.7468C23.6101 23.0548 23.0491 22.4937 22.357 22.4937C21.6649 22.4937 21.1039 23.0548 21.1039 23.7468C21.1039 24.4389 21.6649 25 22.357 25Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M1.11658 1H3.62284L6.95618 16.5639C7.07845 17.1339 7.39561 17.6435 7.85306 18.0048C8.3105 18.3662 8.87962 18.5568 9.46244 18.5439H21.7181C22.2885 18.5429 22.8415 18.3475 23.2858 17.9898C23.7301 17.6321 24.0391 17.1335 24.1617 16.5764L26.2294 7.26566H4.96369" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            )}
            <span>Your Cart</span>
          </div>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: radius,
              background: "rgba(255,255,255,0.22)",
              border: `1px solid ${cardBorder}`,
              display: "grid",
              placeItems: "center",
              color: surfaceText,
              cursor: "pointer",
            }}
            aria-hidden="true"
            title="Close drawer"
          >
            <span style={{ fontSize: 20, lineHeight: 1 }}>X</span>
          </div>
        </div>

        {announcementMessages.length > 0 && (
          <div
            className="preview-marquee"
            style={{
              background: announcementBarBg,
              borderTop: `1px solid ${border}`,
              borderBottom: `1px solid ${border}`,
            }}
          >
            <div className="preview-marquee-track">
              {marqueeMessages.map((msg, idx) => (
                <span
                  key={`announce-${idx}`}
                  className="preview-marquee-item"
                  style={{
                    color: announcementBarText,
                    fontSize: theme.base,
                  }}
                >
                  {msg}
                </span>
              ))}
            </div>
          </div>
        )}

        <div style={{ background: stepBg, padding: "10px 16px 14px 16px" }}>
          {hasSteps ? (
            <>
              <div
                style={{
                  textAlign: "center",
                  color: stepText,
                  fontSize: theme.headingPx,
                  marginBottom: 10,
                }}
              >
                {rewardText}
              </div>

              <div style={{ position: "relative", padding: "12px 2px 0 2px" }}>
                <div
                  style={{
                    height: 6,
                    borderRadius: 999,
                    background: progressTrackBg,
                    overflow: "hidden",
                  }}
                >
                  <div style={{ width: `${fillPct}%`, height: "100%", background: progressFillColor }} />
                </div>

                {selected.map((rule, idx) => {
                  const x = centers[idx] ?? 0;
                  return (
                    <div
                      key={`${rule.type}-${idx}`}
                      style={{
                        position: "absolute",
                        left: `calc(${x}% - 18px)`,
                        top: -4,
                        width: 36,
                        height: 36,
                        borderRadius: 999,
                        background: stepNodeBg,
                        border: `2px solid ${progressLineColor}`,
                        display: "grid",
                        placeItems: "center",
                        fontSize: 16,
                        color: iconColor,
                      }}
                      aria-hidden="true"
                      title={rule.label}
                    >
                      {iconForType(rule.type)}
                    </div>
                  );
                })}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${selected.length}, minmax(0, 1fr))`,
                  gap: 10,
                  paddingTop: 18,
                }}
              >
                {selected.map((rule, idx) => (
                  <div
                    key={`${rule.type}-lbl-${idx}`}
                    style={{
                      textAlign: "center",
                      color: stepText,
                      fontSize: theme.base,
                      lineHeight: 1.15,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={rule.label}
                  >
                    {rule.stepLabel || "Step"}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ height: 110 }} />
          )}
        </div>

        <div style={{ flex: 1, padding: 16, overflowY: "auto" }}>
          {items.map((it, idx) => {
            const unit = Number(it.price || 0);
            const qty = Number(it.qty || 1);
            const lineTotal = unit * qty;
            return (
              <div
                key={`it-${idx}`}
                style={{
                  background: previewCardBg,
                  borderRadius: radius,
                  padding: 12,
                  display: "grid",
                  gridTemplateColumns: "58px 1fr auto",
                  gap: 12,
                  alignItems: "center",
                  border: `1px solid ${previewCardBorder}`,
                }}
              >
                <div
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: radius,
                    overflow: "hidden",
                    border: `1px solid ${previewCardBorder}`,
                    background: previewCardBg,
                  }}
                >
                  {it.image ? (
                    <img
                      src={it.image}
                      alt=""
                      width={58}
                      height={58}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : null}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: theme.headingPx,
                      color: previewCardText,
                      marginBottom: 8,
                    }}
                  >
                    {it.title}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 38,
                        height: 34,
                        borderRadius: radius,
                        background: previewCardBg,
                        border: `1px solid ${previewCardBorder}`,
                        display: "grid",
                        placeItems: "center",
                        color: previewCardText,
                        fontSize: 20,
                      }}
                      aria-hidden="true"
                    >
                      <span style={{ fontSize: 20, lineHeight: 1 }}>-</span>
                    </div>

                    <div
                      style={{
                        width: 44,
                        height: 34,
                        borderRadius: radius,
                        background: previewCardBg,
                        border: `1px solid ${previewCardBorder}`,
                        display: "grid",
                        placeItems: "center",
                        color: previewCardText,
                      }}
                    >
                      {qty}
                    </div>

                    <div
                      style={{
                        width: 38,
                        height: 34,
                        borderRadius: radius,
                        background: previewCardBg,
                        border: `1px solid ${previewCardBorder}`,
                        display: "grid",
                        placeItems: "center",
                        color: previewCardText,
                      }}
                      aria-hidden="true"
                    >
                      +
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: theme.headingPx, color: previewCardText }}>
                    {formatMoney(lineTotal)}
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: Math.max(12, theme.base - 2),
                      color: previewCardText,
                      opacity: 0.95,
                    }}
                  >
                    {unit > 0 ? `${formatMoney(unit)} each` : ""}
                  </div>
                </div>
              </div>
            );
          })}

          {upsellPreviewEnabled && (
            <div
              style={{
                background: previewCardBg,
              }}
            >
              <div
                style={{
                  fontSize: Math.max(14, theme.base),
                  fontWeight: 700,
                  color: upsellText,
                  textAlign: "center",
                  marginBottom: 8,
                }}
              >
                {upsellTitle}
              </div>

              <div
                className="upsell-carousel"
                style={{
                  position: "relative",
                  padding: canSlideUpsell ? `0 ${upsellPreviewSidePadding}px` : 0,
                  overflow: "hidden",
                }}
              >
                {canSlideUpsell && (
                  <React.Fragment>
                    <button
                      type="button"
                      onClick={() =>
                        setUpsellSlideIndex((prev) =>
                          prev - 1 < 0 ? upsellItems.length - 1 : prev - 1
                        )
                      }
                      aria-label="Previous upsell"
                      style={{
                        position: "absolute",
                        left: 2,
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: upsellArrowButtonSize,
                        height: upsellArrowButtonSize,
                        borderRadius: 999,
                        background: "#ffffff",
                        color: upsellArrowColor,
                        display: "grid",
                        placeItems: "center",
                        padding: 0,
                        lineHeight: 1,
                        fontSize: 18,
                        fontWeight: 700,
                        cursor: "pointer",
                        zIndex: 2,
                      }}
                    >
                      &#x2039;
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setUpsellSlideIndex((prev) =>
                          prev + 1 >= upsellItems.length ? 0 : prev + 1
                        )
                      }
                      aria-label="Next upsell"
                      style={{
                        position: "absolute",
                        right: 2,
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: upsellArrowButtonSize,
                        height: upsellArrowButtonSize,
                        borderRadius: 999,
                        background: "#ffffff",
                        color: upsellArrowColor,
                        display: "grid",
                        placeItems: "center",
                        padding: 0,
                        lineHeight: 1,
                        fontSize: 18,
                        fontWeight: 700,
                        cursor: "pointer",
                        zIndex: 2,
                      }}
                    >
                      &#x203A;
                    </button>
                  </React.Fragment>
                )}
                <div
                  style={{
                    background: upsellBg,
                    padding: 8,
                    overflow: "hidden",
                  }}
                >
                  <div
                    className="upsell-carousel-track"
                    style={
                      canSlideUpsell
                        ? {
                            width: "100%",
                            transform: `translate3d(-${upsellSlideIndex * 100}%, 0, 0)`,
                            transition:
                              "transform 520ms cubic-bezier(0.22, 1, 0.36, 1)",
                            willChange: "transform",
                            gap: 0,
                          }
                        : {
                            width: "100%",
                            flexDirection: "column",
                            transform: "none",
                          }
                    }
                  >
                    {upsellVisibleItems.map((item, idx) => (
                      <div
                        key={`upsell-${idx}`}
                        style={{
                          flex: canSlideUpsell ? "0 0 100%" : "0 0 auto",
                          padding: "12px 14px",
                          boxSizing: "border-box",
                          width: "100%",
                          display: "grid",
                          gridTemplateColumns: "68px minmax(0, 1fr) auto",
                          gap: 14,
                          alignItems: "start",
                          minWidth: 0,
                          background: upsellCardBg,
                        }}
                      >
                        <div
                          style={{
                            width: 68,
                            height: 68,
                            borderRadius: 4,
                            background: "#EEF2F7",
                            overflow: "hidden",
                            justifySelf: "center",
                            display: "grid",
                            placeItems: "center",
                          }}
                        >
                          {item?.image ? (
                            <img
                              src={item.image}
                              alt=""
                              width={64}
                              height={64}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          ) : null}
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              display: "block",
                              fontWeight: 600,
                              color: upsellCardText,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {item?.title || "Product"}
                          </div>
                          <div style={{ marginTop: 8 }}>
                            <div
                              style={{
                                padding: "8px 14px",
                                borderRadius: 4,
                                background: upsellButtonBg,
                                border: `1px solid ${upsellBorder}`,
                                color: upsellText,
                                fontSize: 12,
                                fontWeight: 600,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                whiteSpace: "nowrap",
                                justifyContent: "center",
                              }}
                            >
                              + <span>{upsellBtnText}</span>
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            fontWeight: 700,
                            color: upsellCardText,
                            fontSize: Math.max(theme.base + 2, 16),
                            lineHeight: 1.2,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatMoney(parsePreviewPrice(item?.price) || 0)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={footerWrapStyle}>
          {theme.discountCodeApply && (
            <div style={discountRowStyle}>
              <div style={discountFieldStyle}>Apply Discount Code</div>
              <div style={discountBtnStyle}>Apply</div>
            </div>
          )}

          {appliedDiscounts.length > 0 && (
            <div style={{ marginBottom: 10, fontSize: theme.base }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 6,
                  color: surfaceText,
                  opacity: 0.75,
                }}
              >
                <span>Subtotal</span>
                <span style={{ textDecoration: "line-through" }}>
                  {formatMoney(subtotal)}
                </span>
              </div>
              {appliedDiscounts.map((d, i) => (
                <div
                  key={`disc-badge-${i}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      background: "rgba(34,197,94,0.18)",
                      color: "#15803d",
                      borderRadius: 4,
                      padding: "2px 8px",
                      fontWeight: 600,
                      fontSize: Math.max(11, theme.base - 1),
                    }}
                  >
                    {d.isPercent ? `${d.value}% off` : d.label}
                  </span>
                  <span style={{ color: "#15803d", fontWeight: 600 }}>
                    -{formatMoney(d.discountAmount)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "grid" }}>
            <div style={checkoutStyle}>
              {checkoutLabelWithTotal}
              <div style={badgeStyle} aria-hidden="true">
                {totalQty}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RuleShell({
  title,
  index,
  displayIndex,
  onRemove,
  children,
  summary,
  defaultOpen = false,
  icon,
  actions,
  disableRemove = false,
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <div className="rules-rule-card">
      <Card>
      <Box padding="200">
        <div className="rules-rule-header">
          <InlineStack gap="150" blockAlign="center" wrap={false}>
            <span className="rules-rule-title">
              {icon ? (
                <Text as="span" variant="bodyLg" aria-hidden="true">
                  {iconGlyph(icon)}
                </Text>
              ) : null}
            </span>

            <Box style={{ minWidth: 0 }}>
              <Text as="h5" variant="headingSm" truncate>
                {title}
              </Text>
            </Box>
          </InlineStack>

          <div className="rules-rule-actions">
            <Button disclosure onClick={() => setOpen((o) => !o)}>
              {open ? "Hide" : "Show"}
            </Button>
            {actions ? actions : null}

            <Button tone="critical" onClick={onRemove} disabled={disableRemove}>
              Remove
            </Button>
          </div>
        </div>

        {!open && summary && (
          <Box paddingBlockStart="200">
            <Text tone="subdued" variant="bodySm">
              {summary}
            </Text>
          </Box>
        )}
      </Box>

      {open && (
        <>
          <Divider />

          <Box padding="200">
            <div className="rules-rule-body">{children}</div>
          </Box>
        </>
      )}
    </Card>
    </div>
  );
}

const ColorField = ({ label, value, onChange, compact = false }) => {
  const safeValue = /^#[0-9A-Fa-f]{3,6}$/.test(value || "") ? value : "#000000";
  const wrapperStyle = compact
    ? { minWidth: 100, maxWidth: 120 }
    : { minWidth: 100, maxWidth: 180 };
  const rowStyle = {
    display: "grid",
    gridTemplateColumns: "25px auto",
    gap: 12,
    alignItems: "center",
    marginTop: 4,
  };

  return (
    <Box style={wrapperStyle}>
      <Text as="p" variant="bodySm" tone="subdued">
        {label}
      </Text>

      <div style={rowStyle}>
        <input
          type="color"
          value={safeValue}
          aria-label={label}
          onChange={(event) => onChange(event.target.value)}
          style={{
            width: 36,
            height: 36,
            border: "none",
            borderRadius: 4,
            padding: 0,
            background: "transparent",
            cursor: "pointer",
            // boxShadow: "0 6px 15px rgba(15,23,42,0.18)",
          }}
        />

        <TextField
          label={`${label} hex`}
          labelHidden
          value={value}
          onChange={onChange}
          autoComplete="off"
          style={{
            minWidth: compact ? 110 : 140,
            borderRadius: 4,
          }}
        />
      </div>
    </Box>
  );
};

const RuleScheduleFields = ({
  startsAt,
  endsAt,
  onStartsAtChange,
  onEndsAtChange,
  disabled = false,
}) => {
  const hasValue = Boolean(startsAt || endsAt);
  const [open, setOpen] = React.useState(hasValue);
  const now = React.useMemo(() => new Date(), []);
  const startEditedRef = React.useRef(hasValue);
  const fallbackStart = startsAt ? null : now;
  const fallbackEnd = endsAt ? null : addDays(now, 10);
  const startDateValue = toLocalDateInputValue(startsAt, fallbackStart);
  const startTimeValue = toLocalTimeInputValue(startsAt, fallbackStart);
  const endDateValue = toLocalDateInputValue(endsAt, fallbackEnd);
  const endTimeValue = toLocalTimeInputValue(endsAt, fallbackEnd);
  const hasEndDate = Boolean(endsAt);
  const browserTimeZone = React.useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "Local time";
    } catch {
      return "Local time";
    }
  }, []);

  const commitDefaultStart = () => {
    if (!startsAt) {
      const d = toLocalDateInputValue(null, now);
      const t = toLocalTimeInputValue(null, now);
      onStartsAtChange(combineLocalDateAndTime(d, t));
    }
  };

  const updateStartDate = (dateValue) => {
    startEditedRef.current = true;
    onStartsAtChange(combineLocalDateAndTime(dateValue, startTimeValue));
  };

  const updateStartTime = (timeValue) => {
    startEditedRef.current = true;
    onStartsAtChange(combineLocalDateAndTime(startDateValue, timeValue));
  };

  const updateEndDate = (dateValue) => {
    onEndsAtChange(combineLocalDateAndTime(dateValue, endTimeValue));
  };

  const updateEndTime = (timeValue) => {
    onEndsAtChange(combineLocalDateAndTime(endDateValue, timeValue));
  };

  const toggleEndDate = (checked) => {
    if (!checked) {
      onEndsAtChange(null);
      return;
    }
    onEndsAtChange(combineLocalDateAndTime(endDateValue, endTimeValue));
  };

  const dateInputStyle = {
    width: "100%",
    minHeight: 40,
    border: "1px solid #aeb4b9",
    borderRadius: 8,
    padding: "7px 12px",
    background: disabled ? "#f6f6f7" : "#ffffff",
    color: "#303030",
    fontSize: 14,
    fontWeight: 650,
    lineHeight: 1.4,
  };

  const scheduleGridStyle = {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
    gap: "10px 18px",
    alignItems: "end",
  };

  return (
    <Box
      borderWidth="025"
      borderColor="border"
      borderRadius="100"
      background="bg-surface"
      style={{ background: "#ffffff", border: "1px solid #dcdfe4" }}
    >
      <button
        type="button"
        className="rule-accordion-btn"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) {
            commitDefaultStart();
          } else if (!startEditedRef.current) {
            onStartsAtChange(null);
          }
        }}
        style={{
          width: "100%",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) auto",
          alignItems: "center",
          columnGap: 12,
          padding: "10px 12px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          borderRadius: 4,
          transition: "background 0.15s",
        }}
      >
        <span className="rule-accordion-btn__content">
          <Text as="span" variant="headingXs" fontWeight="semibold">
            Schedule
          </Text>
        </span>
        <span className="rule-accordion-btn__icon">
          <Icon source={open ? MinusCircleIcon : PlusCircleIcon} tone="base" />
        </span>
      </button>

      {open && (
        <Box paddingInline="200" paddingBlockStart="200" paddingBlockEnd="200">
          <BlockStack gap="100">
            <Text as="p" tone="subdued" variant="bodySm">
              Based on your browser&apos;s timezone: {browserTimeZone}
            </Text>

            <Box
              padding="200"
              borderRadius="200"
            >
              <BlockStack gap="150">
                <div style={scheduleGridStyle}>
                  <label>
                    <Text as="span" variant="bodySm" fontWeight="semibold">
                      Start date
                    </Text>
                    <input
                      type="date"
                      disabled={disabled}
                      value={startDateValue}
                      onChange={(event) => updateStartDate(event.target.value)}
                      style={dateInputStyle}
                    />
                  </label>

                  <label>
                    <Text as="span" variant="bodySm" fontWeight="semibold">
                      Start time
                    </Text>
                    <input
                      type="time"
                      disabled={disabled}
                      value={startTimeValue}
                      onChange={(event) => updateStartTime(event.target.value)}
                      style={dateInputStyle}
                    />
                  </label>
                </div>

                <Checkbox
                  label="Set end date"
                  disabled={disabled}
                  checked={hasEndDate}
                  onChange={toggleEndDate}
                />

                {hasEndDate && (
                  <div style={scheduleGridStyle}>
                    <label>
                      <Text as="span" variant="bodySm" fontWeight="semibold">
                        End date
                      </Text>
                      <input
                        type="date"
                        disabled={disabled}
                        value={endDateValue}
                        onChange={(event) => updateEndDate(event.target.value)}
                        style={dateInputStyle}
                      />
                    </label>

                    <label>
                      <Text as="span" variant="bodySm" fontWeight="semibold">
                        End time
                      </Text>
                      <input
                        type="time"
                        disabled={disabled}
                        value={endTimeValue}
                        onChange={(event) => updateEndTime(event.target.value)}
                        style={dateInputStyle}
                      />
                    </label>
                  </div>
                )}
              </BlockStack>
            </Box>
          </BlockStack>
        </Box>
      )}
    </Box>
  );
};

const ScopeResourcePickerControl = ({
  label,
  count = 0,
  onClick,
  disabled = false,
  error = "",
}) => (
  <BlockStack gap="100">
    <Text as="span" variant="bodySm" fontWeight="semibold">
      Apply
    </Text>
    <InlineStack gap="200" blockAlign="center" wrap={false}>
      <Button
        size="slim"
        variant="secondary"
        onClick={onClick}
        disabled={disabled}
      >
        {label}
      </Button>
      <Text tone="subdued" variant="bodySm">
        {count || 0} selected
      </Text>
    </InlineStack>
    {error ? (
      <Text tone="critical" variant="bodySm">
        {error}
      </Text>
    ) : null}
  </BlockStack>
);

const TriggerTypeTabs = ({
  value = "amount",
  onChange,
  disabled = false,
  amountLabel = "Discount on Amount",
  quantityLabel = "Discount on Quantity",
}) => {
  const selected = normalizeTriggerType(value);
  return (
    <InlineStack gap="100" wrap>
      <Button
        size="slim"
        pressed={selected === "amount"}
        disabled={disabled}
        onClick={() => onChange("amount")}
      >
        {amountLabel}
      </Button>
      <Button
        size="slim"
        pressed={selected === "quantity"}
        disabled={disabled}
        onClick={() => onChange("quantity")}
      >
        {quantityLabel}
      </Button>
    </InlineStack>
  );
};

const AdvancedRuleControls = ({
  rule,
  disabled = false,
  onFieldChange,
}) => {
  const [open, setOpen] = React.useState(false);

  return (
    <Box
      borderWidth="025"
      borderColor="border"
      borderRadius="100"
      background="bg-surface"
      style={{ background: "#ffffff", border: "1px solid #dcdfe4" }}
    >
      <button
        type="button"
        className="rule-accordion-btn"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) auto",
          alignItems: "center",
          columnGap: 12,
          padding: "10px 12px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          borderRadius: 4,
          transition: "background 0.15s",
        }}
      >
        <span className="rule-accordion-btn__content">
          <Text as="span" variant="headingXs" fontWeight="semibold">
            Targeting & priority
          </Text>
        </span>
        <span className="rule-accordion-btn__icon">
          <Icon source={open ? MinusCircleIcon : PlusCircleIcon} tone="base" />
        </span>
      </button>

      {open && (
        <Box paddingInline="200" paddingBlockStart="200" paddingBlockEnd="200">
          <div className="rules-advanced-grid">
            <TextField
              label="Priority"
              type="number"
              disabled={disabled}
              value={String(rule?.priority ?? 0)}
              onChange={(value) => onFieldChange("priority", value)}
              autoComplete="off"
            />
            <Select
              label="Customer target"
              disabled={disabled}
              options={[
                { label: "All customers", value: "all" },
                { label: "Logged-in customers", value: "logged_in" },
                { label: "Guest customers", value: "guest" },
                { label: "Customer tags", value: "tags" },
              ]}
              value={rule?.customerTarget || "all"}
              onChange={(value) => onFieldChange("customerTarget", value)}
            />
            <TextField
              label="Customer tags"
              disabled={disabled || rule?.customerTarget !== "tags"}
              value={rule?.customerTags || ""}
              onChange={(value) => onFieldChange("customerTags", value)}
              placeholder="vip, wholesale"
              autoComplete="off"
            />
          </div>
        </Box>
      )}
    </Box>
  );
};

const RuleIllustration = ({ variant = "default" }) => {
  const art = ruleIconArt[variant] || ruleIconArt.default;

  return (
    <div className="rule-illustration" aria-hidden="true">
      {art}
    </div>
  );
};

const ensureArray = (value) => {
  if (!value) return [];

  return Array.isArray(value) ? value : [value];
};

function ResourcePickerModal({
  open,

  title,

  items,

  multi = true,

  selected = [],

  onApply,

  onClose,

  emptyText,

  kindLabel = "items",
}) {
  const [search, setSearch] = React.useState("");

  const selectedKey = ensureArray(selected).join("|");
  const normalizedSelected = React.useMemo(
    () => ensureArray(selected),
    [selectedKey]
  );

  const [draft, setDraft] = React.useState(() => normalizedSelected);

  React.useEffect(() => {
    setDraft(normalizedSelected);

    setSearch("");
  }, [normalizedSelected, open]);

  const filteredItems = React.useMemo(() => {
    if (!search) return items;

    const q = search.toLowerCase();

    return items.filter((item) => {
      const title = item.title?.toLowerCase() ?? "";

      const subtitle = item.subtitle?.toLowerCase() ?? "";

      return title.includes(q) || subtitle.includes(q);
    });
  }, [items, search]);

  const toggle = (id) => {
    setDraft((prev) => {
      if (multi) {
        return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      }

      return [id];
    });
  };

  const handleApply = () => {
    if (!multi) {
      onApply(draft[0] || "");
    } else {
      onApply(draft);
    }

    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      primaryAction={{
        content: multi ? "Add" : "Select",

        onAction: handleApply,

        disabled: draft.length === 0,
      }}
      secondaryActions={[{ content: "Cancel", onAction: onClose }]}
    >
      <Modal.Section>
        <BlockStack gap="200">
          <div className="picker-modal-controls">
            <div className="picker-search">
              <TextField
                label="Search"
                labelHidden
                placeholder={`Search ${kindLabel}`}
                autoComplete="off"
                value={search}
                onChange={setSearch}
              />
            </div>

            <Select
              label="Search by"
              labelHidden
              options={[{ label: "All", value: "all" }]}
              value="all"
              onChange={() => { }}
            />

            <Button size="slim" disabled>
              Add filter +
            </Button>
          </div>

          <div className="picker-modal-scroll">
            {filteredItems.length === 0 ? (
              <div className="picker-empty">{emptyText}</div>
            ) : (
              <div className="picker-table">
                {filteredItems.map((item) => {
                  const checked = draft.includes(item.id);

                  return (
                    <div key={item.id} className="picker-row">
                      <Checkbox
                        label=""
                        labelHidden
                        checked={checked}
                        onChange={() => toggle(item.id)}
                      />

                      <div className="picker-thumb">
                        {item.image ? (
                          <img src={item.image} alt={item.title} />
                        ) : (
                          <span role="img" aria-label="placeholder">
                            ??
                          </span>
                        )}
                      </div>

                      <div className="picker-row__meta">
                        <div className="picker-row__title">{item.title}</div>

                        {item.subtitle && (
                          <div className="picker-row__subtitle">
                            {item.subtitle}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Text tone="subdued">
            {draft.length} {multi ? "selected" : "selected"}
          </Text>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}

const serializeSearchWithoutTab = (url) => {
  if (!url) return "";
  const params = new URLSearchParams(url.search || "");
  params.delete("tab");
  return `${url.pathname}?${params.toString()}`;
};

export const shouldRevalidate = ({ currentUrl, nextUrl }) => {
  if (!currentUrl || !nextUrl) return true;
  if (currentUrl.pathname !== nextUrl.pathname) return true;
  return (
    serializeSearchWithoutTab(currentUrl) !== serializeSearchWithoutTab(nextUrl)
  );
};

/* ---------------- main ---------------- */

export default function AppRules() {
  const loaderData = useLoaderData() ?? {};
  const location = useLocation();
  const {
    shippingRules: shippingSeed = createDefaultShippingRules(),
    discountRules: discountSeed = [createDefaultDiscountRule()],
    freeRules: freeSeed = [createDefaultFreeRule()],
    bxgyRules: bxgySeed = [createDefaultBxgyRule()],
    minAmountRule: minAmountSeed = DEFAULT_MIN_AMOUNT_RULE,
    style: styleSeed = DEFAULT_STYLE_SETTINGS,
    upsellSettings: upsellSeed = DEFAULT_UPSELL_SETTINGS,
    steps: stepsSeed = ["", "", "", ""],
    previewItems: previewItemsSeed = [],
    shop: loaderShop = null,
    currencyCode: loaderCurrencyCode = "USD",
  } = loaderData;

  const [selected, setSelected] = React.useState(0);
  const currencyCode = String(loaderCurrencyCode || "USD").toUpperCase();
  const currencySymbol = React.useMemo(
    () => getCurrencySymbol(currencyCode),
    [currencyCode]
  );

  const buildTabContent = (label, polarisIcon) => (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <Icon source={polarisIcon} />
      <span>{label}</span>
    </span>
  );

  const tabs = [
    {
      id: "shipping",
      label: "Shipping Rules",
      icon: DeliveryIcon,
      content: buildTabContent("Shipping Rules", DeliveryIcon),
      guideUrl: "https://cartliftcartdrawerupsell.tawk.help/article/shipping-rule-tab",
    },
    {
      id: "discount",
      label: "Automatic Discounts",
      icon: DiscountIcon,
      content: buildTabContent("Automatic Discounts", DiscountIcon),
      guideUrl: "https://cartliftcartdrawerupsell.tawk.help/article/automatic-discounts-tab",
    },
    {
      id: "free",
      label: "Free Product & Quantity",
      icon: GiftCardIcon,
      content: buildTabContent("Free Product & Quantity", GiftCardIcon),
      guideUrl: "https://cartliftcartdrawerupsell.tawk.help/article/free-product-quantity-tab",
    },
    {
      id: "discount-code",
      label: "Code Discount",
      icon: CodeIcon,
      content: buildTabContent("Code Discount", CodeIcon),
      guideUrl: "https://cartliftcartdrawerupsell.tawk.help/article/automatic-discounts-tab",
    },
    {
      id: "bxgy",
      label: "Buy X Get Y (BXGY)",
      icon: TransferInternalIcon,
      content: buildTabContent("Buy X Get Y (BXGY)", TransferInternalIcon),
      guideUrl: "https://cartliftcartdrawerupsell.tawk.help/article/buy-x-get-y-bxgy-tab",
    },
    {
      id: "upsell",
      label: "Upsell Products",
      icon: ProductIcon,
      content: buildTabContent("Upsell Products", ProductIcon),
      guideUrl: "https://cartliftcartdrawerupsell.tawk.help/article/cart-drawer-upsell-apps",
    },
    {
      id: "style",
      label: "Customize & Preview",
      icon: ThemeIcon,
      content: buildTabContent("Customize & Preview", ThemeIcon),
      guideUrl: "https://cartliftcartdrawerupsell.tawk.help/article/customize-preview-tab",
    },
  ];

  const navigate = useNavigate();
  const handleTabSelect = React.useCallback(
    (index) => {
      setSelected(index);
    },

    [setSelected]
  );

  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab");
    if (!tabParam) return;

    const tabIndexMap = {
      shipping: 0,
      discount: 1,
      free: 2,
      "discount-code": 3,
      bxgy: 4,
      upsell: 5,
      style: 6,
    };

    const nextIndex = tabIndexMap[tabParam];

    if (typeof nextIndex === "number" && nextIndex !== selected) {
      setSelected(nextIndex);
    }

    params.delete("tab");
    const cleanedSearch = params.toString();
    const targetUrl = cleanedSearch
      ? `${location.pathname}?${cleanedSearch}`
      : location.pathname;
    navigate(targetUrl, { replace: true });
  }, [location.search, location.pathname, navigate, selected]);

  // Pricing/upgrade UI removed; keep navigation for other use-cases.

  /* ------- products (for pickers via /api/products) ------- */

  const [products, setProducts] = React.useState([]);
  const [collections, setCollections] = React.useState([]);
  const productsById = React.useMemo(() => {
    const map = {};
    products.forEach((p) => {
      map[p.id] = p;
      if (p.variantId) {
        map[p.variantId] = p;
      }
    });

    return map;
  }, [products]);

  const collectionsById = React.useMemo(() => {
    const map = {};
    collections.forEach((c) => (map[c.id] = c));
    return map;
  }, [collections]);

  const allProductIds = React.useMemo(
    () => normalizeIds(products.map((p) => p.id)),
    [products]
  );

  const productPickerItems = React.useMemo(
    () =>
      products.map((p) => ({
        id: p.id,
        title: p.title,
        subtitle: p.price !== null && p.price !== undefined && p.price !== "" ? formatCurrency(p.price, currencyCode) : undefined,
        image: p.image,
      })),

    [products, currencyCode]
  );

  const collectionPickerItems = React.useMemo(
    () =>
      collections.map((c) => ({
        id: c.id,

        title: c.title,

        subtitle: c.handle ? `/${c.handle}` : undefined,
      })),

    [collections]
  );

  const cheapestProductVariant = React.useMemo(() => {
    let candidate = null;

    products.forEach((product) => {
      if (!product.variantId) return;

      if (product.price == null || product.price === "") return;

      const priceValue = Number(product.price);

      if (!Number.isFinite(priceValue)) return;

      if (!candidate || priceValue < candidate.price) {
        candidate = {
          variantId: product.variantId,

          price: priceValue,

          title: product.title,
        };
      }
    });

    return candidate;
  }, [products]);

  React.useEffect(() => {
    let abort = false;

    (async () => {
      try {
        const r = await fetch("/api/products", {
          headers: { Accept: "application/json" },
        });

        const text = await r.text();

        let j;

        try {
          j = JSON.parse(text);
        } catch {
          throw new Error("Products endpoint did not return JSON");
        }

        if (!abort && Array.isArray(j.products)) setProducts(j.products);

        if (!abort && Array.isArray(j.collections))
          setCollections(j.collections);

        if (!abort && j.error) logger.warn("Products API error:", j.error);
      } catch (e) {
        logger.error("Load products failed:", e);
      }
    })();

    return () => {
      abort = true;
    };
  }, []);

  /* ------- data arrays ------- */

  const shippingSeedUnique = dedupeRules(
    shippingSeed,

    normalizeShippingRuleForKey
  );

  const discountSeedUnique = dedupeRules(
    discountSeed,

    normalizeDiscountRuleForKey
  );

  const freeSeedUnique = dedupeRules(freeSeed, normalizeFreeRuleForKey);

  const bxgySeedUnique = dedupeRules(bxgySeed, normalizeBxgyRuleForKey);

  // Start with only ONE shipping rule in UI if loader gave nothing; user can add more

  const [shippingRules, setShippingRules] = React.useState(() =>
    shippingSeedUnique.length
      ? shippingSeedUnique
      : [createDefaultShippingRule()]
  );

  const [discountRules, setDiscountRules] = React.useState(() => {
    const base = discountSeedUnique.length ? discountSeedUnique : [];
    const hasAutomatic = base.some((rule) => rule.type !== "code");
    const hasCode = base.some((rule) => rule.type === "code");
    const additions = [];
    if (!hasAutomatic) additions.push(createDefaultDiscountRule());
    if (!hasCode) additions.push(createDefaultCodeDiscountRule());
    return [...base, ...additions];
  });

  const [freeRules, setFreeRules] = React.useState(() =>
    freeSeedUnique.length ? freeSeedUnique : [createDefaultFreeRule()]
  );

  const [minAmountRule, setMinAmountRule] = React.useState(() =>
    seedMinAmountRule(minAmountSeed)
  );

  const [minAmountSyncError, setMinAmountSyncError] = React.useState("");

  const [giftPicker, setGiftPicker] = React.useState({
    open: false,

    index: null,
  });

  const getCartStepOptions = React.useCallback(
    (section, index) =>
      getSequentialCartStepOptions({
        shippingRules,
        discountRules,
        freeRules,
        section,
        index,
      }),
    [shippingRules, discountRules, freeRules]
  );

  const didAutoFillInitialCartSteps = React.useRef(false);

  React.useEffect(() => {
    if (didAutoFillInitialCartSteps.current) return;
    didAutoFillInitialCartSteps.current = true;

    const nextCollections = fillMissingSequentialCartSteps(
      shippingRules,
      discountRules,
      freeRules
    );

    if (!nextCollections.changed) return;

    setShippingRules(nextCollections.shippingRules);
    setDiscountRules(nextCollections.discountRules);
    setFreeRules(nextCollections.freeRules);
  }, [shippingRules, discountRules, freeRules]);

  const [bxgyProductPickerIndex, setBxgyProductPickerIndex] =
    React.useState(null);

  const [bxgyCollectionPickerIndex, setBxgyCollectionPickerIndex] =
    React.useState(null);

  const [bxgyRules, setBxgyRules] = React.useState(() =>
    bxgySeedUnique.length ? bxgySeedUnique : [createDefaultBxgyRule()]
  );

  const [bxgyScopeValidation, setBxgyScopeValidation] = React.useState({});

  const [bxgySelectionValidation, setBxgySelectionValidation] = React.useState(
    {}
  );

  const [deleting, setDeleting] = React.useState(false);

  const [deletingRuleLabel, setDeletingRuleLabel] = React.useState("");

  const [discountProductPickerIndex, setDiscountProductPickerIndex] =
    React.useState(null);

  const [discountCollectionPickerIndex, setDiscountCollectionPickerIndex] =
    React.useState(null);

  const [upsellEnabled, setUpsellEnabled] = React.useState(
    Boolean(upsellSeed?.enabled)
  );
  const [upsellShowAsSlider, setUpsellShowAsSlider] = React.useState(
    Boolean(upsellSeed?.showAsSlider)
  );
  const [upsellAutoplay, setUpsellAutoplay] = React.useState(
    Boolean(upsellSeed?.autoplay)
  );
  const [upsellPreviewIndex, setUpsellPreviewIndex] = React.useState(0);
  const [upsellMode, setUpsellMode] = React.useState(
    upsellSeed?.recommendationMode ?? DEFAULT_UPSELL_SETTINGS.recommendationMode
  );
  const [upsellSectionTitle, setUpsellSectionTitle] = React.useState(
    upsellSeed?.sectionTitle ?? DEFAULT_UPSELL_SETTINGS.sectionTitle
  );
  const [upsellButtonText, setUpsellButtonText] = React.useState(
    upsellSeed?.buttonText ?? DEFAULT_UPSELL_SETTINGS.buttonText
  );
  const [upsellButtonColor, setUpsellButtonColor] = React.useState(
    upsellSeed?.buttonColor ?? DEFAULT_UPSELL_SETTINGS.buttonColor
  );
  const [upsellBgColor, setUpsellBgColor] = React.useState(
    upsellSeed?.backgroundColor ?? DEFAULT_UPSELL_SETTINGS.backgroundColor
  );
  const [upsellTextColor, setUpsellTextColor] = React.useState(
    upsellSeed?.textColor ?? DEFAULT_UPSELL_SETTINGS.textColor
  );
  const [upsellBorderColor, setUpsellBorderColor] = React.useState(
    upsellSeed?.borderColor ?? DEFAULT_UPSELL_SETTINGS.borderColor
  );
  const [upsellArrowColor, setUpsellArrowColor] = React.useState(
    upsellSeed?.arrowColor ?? DEFAULT_UPSELL_SETTINGS.arrowColor
  );
  const [upsellProductIds, setUpsellProductIds] = React.useState(
    Array.isArray(upsellSeed?.selectedProductIds)
      ? upsellSeed.selectedProductIds
      : []
  );
  const [upsellCollectionIds, setUpsellCollectionIds] = React.useState(
    Array.isArray(upsellSeed?.selectedCollectionIds)
      ? upsellSeed.selectedCollectionIds
      : []
  );
  const [upsellProductPickerOpen, setUpsellProductPickerOpen] =
    React.useState(false);
  const [upsellCollectionPickerOpen, setUpsellCollectionPickerOpen] =
    React.useState(false);

  React.useEffect(() => {
    setMinAmountRule(seedMinAmountRule(minAmountSeed));

    setMinAmountSyncError("");
  }, [minAmountSeed]);

  React.useEffect(() => {
    if (!allProductIds.length) return;

    setBxgyRules((prev) =>
      prev.map((rule) => {
        if (rule.scope !== "store") return rule;

        const currentProducts = normalizeIds(rule.appliesTo?.products ?? []);

        const same =
          currentProducts.length === allProductIds.length &&
          currentProducts.every((id) => allProductIds.includes(id));

        if (same) return rule;

        return {
          ...rule,

          appliesTo: {
            ...rule.appliesTo,

            products: allProductIds,
          },
        };
      })
    );
  }, [allProductIds, setMinAmountRule]);

  React.useEffect(() => {
    if (!allProductIds.length) return;

    setMinAmountRule((rule) => {
      if (rule.allProductIds?.length) return rule;

      return { ...rule, allProductIds };
    });
  }, [allProductIds]);

  React.useEffect(() => {
    if (!cheapestProductVariant?.variantId) return;

    setMinAmountRule((rule) => {
      if (rule.bonusProductId) return rule;

      return { ...rule, bonusProductId: cheapestProductVariant.variantId };
    });
  }, [cheapestProductVariant, setMinAmountRule]);

  const [font, setFont] = React.useState(styleSeed.font);

  const [base, setBase] = React.useState(styleSeed.base);

  const [headingScale, setHeadingScale] = React.useState(
    styleSeed.headingScale
  );

  const [radius, setRadius] = React.useState(styleSeed.radius);

  const [textColor, setTextColor] = React.useState(styleSeed.textColor);

  const [bg, setBg] = React.useState(styleSeed.bg);

  const [progress, setProgress] = React.useState(styleSeed.progress);

  const [buttonColor, setButtonColor] = React.useState(
    styleSeed.buttonColor ?? DEFAULT_STYLE_SETTINGS.buttonColor
  );

  const [borderColor, setBorderColor] = React.useState(
    styleSeed.borderColor ?? DEFAULT_STYLE_SETTINGS.borderColor
  );

  const [announcementBarBackgroundColor, setAnnouncementBarBackgroundColor] =
    React.useState(
      styleSeed.announcementBarBackgroundColor ??
      DEFAULT_STYLE_SETTINGS.announcementBarBackgroundColor
    );

  const [announcementBarTextColor, setAnnouncementBarTextColor] = React.useState(
    styleSeed.announcementBarTextColor ?? DEFAULT_STYLE_SETTINGS.announcementBarTextColor
  );

  const [buttonLabelColor, setButtonLabelColor] = React.useState(
    styleSeed.buttonLabelColor ?? DEFAULT_STYLE_SETTINGS.buttonLabelColor
  );

  const [iconColor, setIconColor] = React.useState(
    styleSeed.iconColor ?? DEFAULT_STYLE_SETTINGS.iconColor
  );

  const [cartDrawerBackground, setCartDrawerBackground] = React.useState(
    styleSeed.cartDrawerBackground ?? ""
  );

  const [cartDrawerTextColor, setCartDrawerTextColor] = React.useState(
    styleSeed.cartDrawerTextColor || styleSeed.textColor || "#111111"
  );

  const [cartDrawerHeaderColor, setCartDrawerHeaderColor] = React.useState(
    styleSeed.cartDrawerHeaderColor || styleSeed.bg || "#FFFFFF"
  );

  const [cartDrawerImage, setCartDrawerImage] = React.useState(
    styleSeed.cartDrawerImage ?? ""
  );
  const [cartIconUrl, setCartIconUrl] = React.useState(
    styleSeed.cartIconUrl ?? ""
  );
  const [cartIconUploading, setCartIconUploading] = React.useState(false);

  const gradientDefaults = normalizeGradientColors(
    styleSeed.cartDrawerBackground,
    DEFAULT_STYLE_SETTINGS.cartDrawerBackground
  );

  const [cartDrawerGradientStart, setCartDrawerGradientStart] = React.useState(
    gradientDefaults.start
  );

  const [cartDrawerGradientEnd, setCartDrawerGradientEnd] = React.useState(
    gradientDefaults.end
  );

  const [checkoutButtonText, setCheckoutButtonText] = React.useState(
    styleSeed.checkoutButtonText ?? DEFAULT_STYLE_SETTINGS.checkoutButtonText
  );

  const [discountCodeApply, setDiscountCodeApply] = React.useState(
    Boolean(styleSeed.discountCodeApply)
  );
  const [drawerAutoOpen, setDrawerAutoOpen] = React.useState(
    Boolean(styleSeed.drawerAutoOpen ?? DEFAULT_STYLE_SETTINGS.drawerAutoOpen)
  );
  const [drawerPosition, setDrawerPosition] = React.useState(
    styleSeed.drawerPosition ?? DEFAULT_STYLE_SETTINGS.drawerPosition
  );
  const [stickyCheckout, setStickyCheckout] = React.useState(
    Boolean(styleSeed.stickyCheckout ?? DEFAULT_STYLE_SETTINGS.stickyCheckout)
  );
  const [mobileLayout, setMobileLayout] = React.useState(
    styleSeed.mobileLayout ?? DEFAULT_STYLE_SETTINGS.mobileLayout
  );

  const [cartDrawerBackgroundMode, setCartDrawerBackgroundMode] =
    React.useState(
      styleSeed.cartDrawerBackgroundMode ??
      DEFAULT_STYLE_SETTINGS.cartDrawerBackgroundMode
    );

  const cartSteps = React.useMemo(() => {
    const derived = deriveCartStepsFromRules(
      shippingRules,
      discountRules,
      freeRules
    );
    const fallback =
      Array.isArray(stepsSeed) && stepsSeed.length === STEP_SLOTS.length
        ? stepsSeed
        : STEP_SLOTS.map(() => "");
    return derived.filter(Boolean).length ? derived : fallback;
  }, [shippingRules, discountRules, freeRules, stepsSeed]);

  const previewItems = React.useMemo(() => previewItemsSeed, [previewItemsSeed]);

  const rulesById = React.useMemo(() => {
    const map = {};
    shippingRules.forEach((rule) => {
      const id = rule?.id;
      if (!id) return;
      map[`shipping:${id}`] = {
        type: "shipping",
        threshold: getThreshold(rule),
        label: buildFullOptionLabel("shipping", rule, currencyCode),
        stepLabel: stepLabelForRule("shipping", rule, currencyCode),
      };
    });
    discountRules.forEach((rule) => {
      const id = rule?.id;
      if (!id) return;
      const type = String(rule?.type ?? "").toLowerCase();
      if (type !== "automatic") return;
      const ruleTriggerType = normalizeTriggerType(rule.triggerType);
      map[`discount:${id}`] = {
        type: "discount",
        triggerType: ruleTriggerType,
        threshold:
          ruleTriggerType === "quantity"
            ? getMinQuantity(rule)
            : getThreshold(rule),
        label: buildFullOptionLabel("discount", rule, currencyCode),
        stepLabel: stepLabelForRule("discount", rule, currencyCode),
      };
    });
    freeRules.forEach((rule) => {
      const id = rule?.id;
      if (!id) return;
      const ruleTriggerType = normalizeTriggerType(rule.triggerType);
      map[`free:${id}`] = {
        type: "free",
        triggerType: ruleTriggerType,
        threshold:
          ruleTriggerType === "quantity"
            ? getMinQuantity(rule)
            : getFreeGiftMinPurchase(rule),
        label: buildFullOptionLabel("free", rule, currencyCode),
        stepLabel: stepLabelForRule("free", rule, currencyCode),
      };
    });
    return map;
  }, [shippingRules, discountRules, freeRules, currencyCode]);

  const cartDrawerBackgroundValue =
    cartDrawerBackgroundMode === "gradient"
      ? buildLinearGradient(
        cartDrawerGradientStart,
        cartDrawerGradientEnd,
        DEFAULT_STYLE_SETTINGS.cartDrawerBackground
      )
      : cartDrawerBackground;

  const stylePreviewSettings = React.useMemo(
    () => ({
      font,
      base,
      headingScale,
      radius,
      textColor,
      bg,
      progress,
      buttonColor,
      borderColor,
      announcementBarBackgroundColor,
      announcementBarTextColor,
      buttonLabelColor,
      iconColor,
      cartDrawerBackground: cartDrawerBackgroundValue,
      cartDrawerTextColor,
      cartDrawerHeaderColor,
      cartDrawerImage,
      cartIconUrl,
      cartDrawerBackgroundMode,
      discountCodeApply,
      checkoutButtonText,
      drawerAutoOpen,
      drawerPosition,
      stickyCheckout,
      mobileLayout,
    }),
    [
      font,
      base,
      headingScale,
      radius,
      textColor,
      bg,
      progress,
      buttonColor,
      borderColor,
      announcementBarBackgroundColor,
      announcementBarTextColor,
      buttonLabelColor,
      iconColor,
      cartDrawerBackgroundValue,
      cartDrawerTextColor,
      cartDrawerHeaderColor,
      cartDrawerImage,
      cartIconUrl,
      cartDrawerBackgroundMode,
      discountCodeApply,
      checkoutButtonText,
      drawerAutoOpen,
      drawerPosition,
      stickyCheckout,
      mobileLayout,
    ]
  );


  const [themeBurst, setThemeBurst] = React.useState(0);

  const [contentSettingsVisible, setContentSettingsVisible] =
    React.useState(false);

  const [maskSlider, setMaskSlider] = React.useState(50);
  const [freeMaskSlider, setFreeMaskSlider] = React.useState(50);
  const [discountMaskSlider, setDiscountMaskSlider] = React.useState(50);

  const [toast, setToast] = React.useState({
    active: false,

    content: "",

    tone: "success",
  });


  const [lastApiSnapshot, setLastApiSnapshot] = React.useState(null);

  const [lastApiSection, setLastApiSection] = React.useState("");

  const [apiModalOpen, setApiModalOpen] = React.useState(false);

  const triggerThemeBurst = React.useCallback(
    () => setThemeBurst(Date.now()),

    []
  );

  const [ruleSliderValues, setRuleSliderValues] = React.useState({});

  const updateRuleSlider = React.useCallback((index, value) => {
    setRuleSliderValues((prev) => ({
      ...prev,

      [index]: value,
    }));
  }, []);

  const [freeRuleSliderValues, setFreeRuleSliderValues] = React.useState({});

  const updateFreeRuleSlider = React.useCallback((index, value) => {
    setFreeRuleSliderValues((prev) => ({
      ...prev,

      [index]: value,
    }));
  }, []);

  const [discountRuleSliderValues, setDiscountRuleSliderValues] = React.useState(
    {}
  );

  const updateDiscountRuleSlider = React.useCallback((index, value) => {
    setDiscountRuleSliderValues((prev) => ({
      ...prev,

      [index]: value,
    }));
  }, []);

  const updateShippingRuleField = React.useCallback(
    (index, field, value) => {
      setShippingRules((prev) => {
        const next = Array.isArray(prev) ? [...prev] : [];

        if (index >= 0 && index < next.length) {
          next[index] = { ...next[index], [field]: value };

          return next;
        }

        if (index === 0 && next.length === 0) {
          return [{ ...createDefaultShippingRule(), [field]: value }];
        }

        return prev;
      });
    },

    []
  );

  const updateDiscountRuleField = React.useCallback(
    (index, field, value) => {
      setDiscountRules((prev) => {
        const next = Array.isArray(prev) ? [...prev] : [];

        if (index >= 0 && index < next.length) {
          next[index] = { ...next[index], [field]: value };

          return next;
        }

        if (index === 0 && next.length === 0) {
          return [{ ...createDefaultDiscountRule(), [field]: value }];
        }

        return prev;
      });
    },

    []
  );

  const updateFreeRuleField = React.useCallback(
    (index, field, value) => {
      setFreeRules((prev) => {
        const next = Array.isArray(prev) ? [...prev] : [];

        if (index >= 0 && index < next.length) {
          next[index] = { ...next[index], [field]: value };

          return next;
        }

        if (index === 0 && next.length === 0) {
          return [{ ...createDefaultFreeRule(), [field]: value }];
        }

        return prev;
      });
    },

    []
  );

  const updateCartStepField = React.useCallback(
    (section, index, value) => {
      const nextCollections = applySequentialCartStepChange({
        shippingRules,
        discountRules,
        freeRules,
        section,
        index,
        value,
      });

      setShippingRules(nextCollections.shippingRules);
      setDiscountRules(nextCollections.discountRules);
      setFreeRules(nextCollections.freeRules);
    },
    [shippingRules, discountRules, freeRules]
  );

  const updateBxgyRuleField = React.useCallback(
    (index, field, value) => {
      setBxgyRules((prev) => {
        const next = Array.isArray(prev) ? [...prev] : [];

        if (index >= 0 && index < next.length) {
          next[index] = { ...next[index], [field]: value };

          return next;
        }

        if (index === 0 && next.length === 0) {
          return [{ ...createDefaultBxgyRule(), [field]: value }];
        }

        return prev;
      });
    },

    []
  );

  const updateRuleTranslation = React.useCallback(
    (setter, index, locale, field, value) => {
      setter((prev) =>
        prev.map((rule, idx) => {
          if (idx !== index) return rule;
          const translations = parseJsonObject(rule.translations, {});
          const localeEntry = parseJsonObject(translations[locale], {});
          return {
            ...rule,
            translations: {
              ...translations,
              [locale]: { ...localeEntry, [field]: value },
            },
          };
        })
      );
    },
    []
  );

  const updatePrimaryShippingRuleField = React.useCallback(
    (field, value) => updateShippingRuleField(0, field, value),

    [updateShippingRuleField]
  );

  const primaryShippingRule = React.useMemo(
    () => shippingRules[0] ?? null,

    [shippingRules]
  );

  const discountPreviewRules = React.useMemo(() => {
    const normalized = (Array.isArray(discountRules) ? discountRules : [])
      .filter(
        (rule) =>
          String(rule?.type ?? "automatic").toLowerCase() === "automatic"
      )
      .map((rule) => {
        const { value: threshold } = getRuleTriggerThreshold(rule);
        return {
          rule,
          threshold:
            threshold !== null && Number.isFinite(Number(threshold))
              ? Number(threshold)
              : null,
        };
      })
      .sort((a, b) => {
        const aVal = a.threshold ?? Number.MAX_SAFE_INTEGER;
        const bVal = b.threshold ?? Number.MAX_SAFE_INTEGER;
        return aVal - bVal;
      });

    return normalized;
  }, [discountRules]);

  const shippingPreviewRules = React.useMemo(() => {
    const normalized = (Array.isArray(shippingRules) ? shippingRules : [])
      .map((rule) => {
        const thresholdValue = getThreshold(rule);
        const threshold =
          thresholdValue !== null &&
            thresholdValue !== undefined &&
            Number.isFinite(Number(thresholdValue))
            ? Number(thresholdValue)
            : null;
        return { rule, threshold };
      })
      .sort((a, b) => {
        const aVal = a.threshold !== null ? a.threshold : Number.MAX_SAFE_INTEGER;
        const bVal = b.threshold !== null ? b.threshold : Number.MAX_SAFE_INTEGER;
        return aVal - bVal;
      });

    if (normalized.length) return normalized;

    if (!primaryShippingRule) return [];

    const fallbackThreshold =
      Number.isFinite(Number(getThreshold(primaryShippingRule))) &&
        getThreshold(primaryShippingRule) !== null
        ? Number(getThreshold(primaryShippingRule))
        : 500;

    return [{ rule: primaryShippingRule, threshold: fallbackThreshold }];
  }, [primaryShippingRule, shippingRules]);

  const handleFontChange = React.useCallback(
    (value) => {
      setFont(value);

      triggerThemeBurst();
    },

    [triggerThemeBurst]
  );

  const handleBaseChange = React.useCallback(
    (value) => {
      setBase(value);

      triggerThemeBurst();
    },

    [triggerThemeBurst]
  );

  const handleHeadingChange = React.useCallback(
    (value) => {
      setHeadingScale(value);

      triggerThemeBurst();
    },

    [triggerThemeBurst]
  );

  const handleRadiusChange = React.useCallback(
    (value) => {
      setRadius(value);

      triggerThemeBurst();
    },

    [triggerThemeBurst]
  );

  const handleTextColorChange = React.useCallback(
    (value) => {
      setTextColor(value);

      triggerThemeBurst();
    },

    [triggerThemeBurst]
  );

  const handleBgChange = React.useCallback(
    (value) => {
      setBg(value);

      triggerThemeBurst();
    },

    [triggerThemeBurst]
  );

  const handleProgressChange = React.useCallback(
    (value) => {
      setProgress(value);

      triggerThemeBurst();
    },

    [triggerThemeBurst]
  );

  const handleAnnouncementBarBackgroundColorChange = React.useCallback(
    (value) => {
      setAnnouncementBarBackgroundColor(value);
      triggerThemeBurst();
    },
    [triggerThemeBurst]
  );

  const handleAnnouncementBarTextColorChange = React.useCallback(
    (value) => {
      setAnnouncementBarTextColor(value);
      triggerThemeBurst();
    },
    [triggerThemeBurst]
  );

  const handleButtonLabelColorChange = React.useCallback(
    (value) => {
      setButtonLabelColor(value);
      triggerThemeBurst();
    },
    [triggerThemeBurst]
  );

  const handleIconColorChange = React.useCallback(
    (value) => {
      setIconColor(value);
      triggerThemeBurst();
    },
    [triggerThemeBurst]
  );

  const resolveSolidCartDrawerColor = React.useCallback(
    (raw) => {
      const direct = normalizeHex(raw);
      if (direct) return direct;
      if (isCssGradient(raw)) {
        const parsed = extractGradientHexColors(raw);
        if (parsed?.start) return parsed.start;
      }
      return (
        normalizeHex(cartDrawerGradientStart) ||
        normalizeHex(cartDrawerGradientEnd) ||
        normalizeHex(DEFAULT_STYLE_SETTINGS.bg) ||
        "#000000"
      );
    },
    [cartDrawerGradientStart, cartDrawerGradientEnd]
  );

  const handleCartDrawerBackgroundChange = React.useCallback(
    (value) => {
      setCartDrawerBackground(value);

      triggerThemeBurst();
    },

    [triggerThemeBurst]
  );

  const handleCartDrawerTextColorChange = React.useCallback(
    (value) => {
      setCartDrawerTextColor(value);
      triggerThemeBurst();
    },

    [triggerThemeBurst]
  );

  const handleCartDrawerHeaderColorChange = React.useCallback(
    (value) => {
      setCartDrawerHeaderColor(value);

      triggerThemeBurst();
    },

    [triggerThemeBurst]
  );

  const handleCartDrawerBackgroundModeChange = React.useCallback(
    (value) => {
      setCartDrawerBackgroundMode(value);

      if (value === "gradient") {
        const fallback =
          normalizeHex(cartDrawerBackground) ||
          normalizeHex(DEFAULT_STYLE_SETTINGS.cartDrawerBackground) ||
          "#000000";
        setCartDrawerGradientStart((prev) => prev || fallback);
        setCartDrawerGradientEnd((prev) => prev || fallback);
      }

      if (value === "color") {
        setCartDrawerBackground((prev) => resolveSolidCartDrawerColor(prev));
      }

      triggerThemeBurst();
    },

    [cartDrawerBackground, resolveSolidCartDrawerColor, triggerThemeBurst]
  );

  const handleCartDrawerImageChange = React.useCallback(
    (value) => {
      setCartDrawerImage(value);

      triggerThemeBurst();
    },

    [triggerThemeBurst]
  );

  React.useEffect(() => {
    if (cartDrawerBackgroundMode !== "color") return;
    if (!isCssGradient(cartDrawerBackground)) return;
    const solid = resolveSolidCartDrawerColor(cartDrawerBackground);
    if (solid && solid !== cartDrawerBackground) {
      setCartDrawerBackground(solid);
    }
  }, [
    cartDrawerBackground,
    cartDrawerBackgroundMode,
    resolveSolidCartDrawerColor,
  ]);

  const handleCartDrawerGradientStartChange = React.useCallback(
    (value) => {
      setCartDrawerGradientStart(value);

      triggerThemeBurst();
    },

    [triggerThemeBurst]
  );

  const handleCartDrawerGradientEndChange = React.useCallback(
    (value) => {
      setCartDrawerGradientEnd(value);

      triggerThemeBurst();
    },

    [triggerThemeBurst]
  );

  const handleCheckoutButtonTextChange = React.useCallback(
    (value) => {
      setCheckoutButtonText(value);

      triggerThemeBurst();
    },

    [triggerThemeBurst]
  );

  const handleDiscountCodeApplyChange = React.useCallback(
    (value) => {
      setDiscountCodeApply(value);
    },

    []
  );

  const [saved, setSaved] = React.useState(false);

  const [saveMessage, setSaveMessage] = React.useState("");

  const [saving, setSaving] = React.useState(false);

  const [payloadPreview, setPayloadPreview] = React.useState(null);

  const [payloadModalOpen, setPayloadModalOpen] = React.useState(false);

  const showSaveFeedback = React.useCallback(
    (message = "Configuration saved successfully.") => {
      setSaveMessage(message);

      setSaved(true);

      setTimeout(() => setSaved(false), 2000);
    },

    []
  );

  const showToast = React.useCallback(
    (content, tone = "success") => setToast({ active: true, content, tone }),

    []
  );

  const handleCartIconDrop = React.useCallback(
    async (_droppedFiles, acceptedFiles) => {
      const file = acceptedFiles?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("intent", "uploadCartIcon");
      formData.append("cartIcon", file);

      try {
        setCartIconUploading(true);
        const res = await fetch("/api/rules", {
          method: "POST",
          body: formData,
          credentials: "same-origin",
          headers: { Accept: "application/json" },
        });

        const result = await res.json().catch(() => ({}));
        if (!res.ok || result?.error) {
          throw new Error(result?.error || "Unable to upload cart icon.");
        }

        setCartIconUrl(result.cartIconUrl || "");
        triggerThemeBurst();
        showToast("Cart icon uploaded");
      } catch (error) {
        showToast(
          error instanceof Error ? error.message : "Unable to upload cart icon.",
          "critical"
        );
      } finally {
        setCartIconUploading(false);
      }
    },
    [showToast, triggerThemeBurst]
  );

  const handleToastDismiss = React.useCallback(
    () => setToast((t) => ({ ...t, active: false })),

    []
  );

  const renderTokenField = (
    _field,
    label,
    value,
    onChange,
    helpText,
    { disabled = false } = {}
  ) => (
    <Box style={{ position: "relative" }}>
      <TextField
        label={label}
        value={value}
        onChange={onChange}
        helpText={helpText}
        disabled={disabled}
        autoComplete="off"
        style={{ width: "100%" }}
      />

    </Box>
  );

  const normalizeIconPref = React.useCallback((rule) => {
    // If an SVG is uploaded, ignore/clear the default icon selection

    return { ...rule, iconChoice: rule.icon ? null : rule.iconChoice };
  }, []);

  const mapIcons = React.useCallback(
    (rules) => rules.map(normalizeIconPref),

    [normalizeIconPref]
  );

  const handleSectionSave = React.useCallback(
    async (section, index = null, overrideRules = null) => {
      const payloadMap = {
        shipping: mapIcons(
          dedupeRules(
            overrideRules ?? shippingRules,

            normalizeShippingRuleForKey
          )
        ),

        discount: mapIcons(
          dedupeRules(
            section === "discount" && overrideRules
              ? overrideRules
              : discountRules,

            normalizeDiscountRuleForKey
          )
        ),

        free: mapIcons(
          dedupeRules(
            section === "free" && overrideRules ? overrideRules : freeRules,

            normalizeFreeRuleForKey
          )
        ),

        bxgy: mapIcons(
          dedupeRules(
            section === "bxgy" && overrideRules ? overrideRules : bxgyRules,

            normalizeBxgyRuleForKey
          )
        ),

        freeGiftMinAmount: minAmountRule,

        style: {
          font,

          base,

          headingScale,

          radius,

          textColor,

          bg,

          progress,

          buttonColor,

          borderColor,
          announcementBarBackgroundColor,
          announcementBarTextColor,
          buttonLabelColor,
          iconColor,

          cartDrawerBackground: cartDrawerBackgroundValue.trim()
            ? cartDrawerBackgroundValue.trim()
            : "",

          cartDrawerTextColor,

          cartDrawerHeaderColor,

          cartDrawerBackgroundMode,

          cartDrawerImage:
            cartDrawerBackgroundMode === "image"
              ? cartDrawerImage.trim() || RURAL_DRAWER_IMAGE
              : null,
          cartIconUrl: cartIconUrl?.trim() || "",

          discountCodeApply,
          checkoutButtonText:
            checkoutButtonText?.trim() || DEFAULT_STYLE_SETTINGS.checkoutButtonText,
          drawerAutoOpen,
          drawerPosition,
          stickyCheckout,
          mobileLayout,
        },
        upsell: {
          enabled: upsellEnabled,
          showAsSlider: upsellShowAsSlider,
          autoplay: upsellAutoplay,
          recommendationMode: upsellMode,
          sectionTitle: upsellSectionTitle?.trim() || "",
          buttonText: upsellButtonText?.trim() || "",
          buttonColor: upsellButtonColor,
          backgroundColor: upsellBgColor,
          textColor: upsellTextColor,
          borderColor: upsellBorderColor,
          arrowColor: upsellArrowColor,
          selectedProductIds: upsellProductIds,
          selectedCollectionIds: upsellCollectionIds,
        },
      };

      let payloadForSection = payloadMap[section];

      if (!payloadForSection) return;

      let bxgyTargetIndexes = null;

      if (section === "bxgy") {
        const scopeErrors = {};

        const selectionErrors = {};

        const targetIndexes = Number.isInteger(index)
          ? [index]
          : bxgyRules.map((_, idx) => idx);

        targetIndexes.forEach((idx) => {
          const rule = bxgyRules[idx];

          if (!rule) return;

          if (!rule.scope) {
            scopeErrors[idx] = "Please select a scope for this rule";
          } else if (
            rule.scope === "product" &&
            (rule.appliesTo?.products?.length || 0) === 0
          ) {
            selectionErrors[idx] = "Select at least one product";
          } else if (
            rule.scope === "collection" &&
            (rule.appliesTo?.collections?.length || 0) === 0
          ) {
            selectionErrors[idx] = "Select at least one collection";
          }
        });

        if (Object.keys(scopeErrors).length) {
          setBxgyScopeValidation(scopeErrors);

          showToast(
            "Please select a scope for all BXGY rules before saving",
            "critical"
          );

          return;
        }

        if (Object.keys(selectionErrors).length) {
          setBxgySelectionValidation(selectionErrors);

          showToast(
            "Select at least one product/collection for each scoped rule",
            "critical"
          );

          return;
        }

        if (Object.keys(bxgyScopeValidation).length) {
          setBxgyScopeValidation({});
        }

        if (Object.keys(bxgySelectionValidation).length) {
          setBxgySelectionValidation({});
        }
        bxgyTargetIndexes = targetIndexes;
      }

      let isPartial = Number.isInteger(index);

      if (isPartial && Array.isArray(payloadForSection)) {
        const item = payloadForSection[index];

        if (!item) return;

        payloadForSection = [item];
      }

      logger.log("[RULES API REQUEST]", {
        section,

        payload: payloadForSection,
      });

      if (section === "bxgy" && bxgyTargetIndexes?.length) {
        setBxgyRules((prev) =>
          prev.map((rule, idx) => {
            if (!rule || !bxgyTargetIndexes.includes(idx)) return rule;
            if (rule.buyxgetyId === null) return rule;
            return { ...rule, buyxgetyId: null };
          })
        );
      }

      try {
        setSaving(true);

        const res = await fetch("/api/rules", {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },

          credentials: "same-origin",
          body: JSON.stringify({
            section,
            payload: payloadForSection,
            shop: loaderShop,
            index: isPartial ? index : undefined,
            partial: isPartial,
          }),
        });

        if (!res.ok) {
          let details = "Failed to save";
          const text = await res.text();
          try {
            const info = JSON.parse(text);
            details = info?.error || info?.message || details;
          } catch {
            // If backend returned HTML/CSS (often from auth middleware), avoid dumping the whole page

            if (text?.startsWith("<!DOCTYPE html")) {
              details =
                "Authentication or endpoint error (received HTML page instead of JSON). Check API token/endpoint.";
            } else {
              details =
                text && text.length > 400
                  ? `${text.slice(0, 400)}...`
                  : text || details;
            }
          }

          throw new Error(details);
        }

        const result = await res.json().catch(() => ({}));
        const serverPayload =
          result?.payload && typeof result.payload === "object"
            ? result.payload
            : null;
        const effectivePayload = serverPayload || payloadMap[section] || null;

        if (result?.validationFailed) {
          showToast(
            result?.validationMessage ||
            "Validation failed for the free gift rule",
            "critical"
          );
          setSaving(false);
          return;
        }

        logger.log("[RULES API RESPONSE]", {
          section,
          result,
          payload: payloadMap[section],
        });

        if (section === "bxgy") {
          const shopifyResults = result?.payload?.shopifyResults;

          if (Array.isArray(shopifyResults) && shopifyResults.length) {
            const updates = new Map();

            shopifyResults.forEach((item) => {
              const resultIndex = Number.isInteger(item?.ruleIndex)
                ? item.ruleIndex
                : item?.index;
              if (Number.isInteger(resultIndex)) {
                updates.set(resultIndex, item.id ?? null);
              }
            });

            if (updates.size) {
              setBxgyRules((prev) =>
                prev.map((rule, idx) => {
                  if (!updates.has(idx)) return rule;
                  const nextId = updates.get(idx);
                  if (rule.buyxgetyId === nextId) return rule;
                  return { ...rule, buyxgetyId: nextId };
                })
              );
            }
          }

          const serverRules = Array.isArray(result?.payload?.rules)
            ? result.payload.rules
            : null;

          if (serverRules) {
            setBxgyRules((prev) =>
              prev.map((rule, idx) => {
                if (!rule) return rule;
                const serverRule = serverRules[idx];
                if (!serverRule || rule.id === serverRule.id) return rule;
                return { ...rule, id: serverRule.id ?? null };
              })
            );
          }
        }

        if (section === "shipping") {
          const serverRules = Array.isArray(result?.payload)
            ? result.payload
            : null;

          if (serverRules) {
            setShippingRules((prev) =>
              prev.map((rule, idx) => {
                const serverRule = serverRules[idx];
                if (!serverRule) return rule;
                return {
                  ...rule,
                  id: serverRule.id ?? rule.id ?? null,
                  shopifyRateId:
                    serverRule.shopifyRateId ?? rule.shopifyRateId ?? null,
                  shopifyMethodDefinitionId:
                    serverRule.shopifyMethodDefinitionId ??
                    rule.shopifyMethodDefinitionId ??
                    null,
                };
              })
            );
          }
        }

        if (section === "discount") {
          const shopifyResults = result?.payload?.shopifyResults;

          if (Array.isArray(shopifyResults) && shopifyResults.length) {
            const updates = new Map();

            shopifyResults.forEach((item) => {
              const resultIndex = Number.isInteger(item?.ruleIndex)
                ? item.ruleIndex
                : item?.index;
              if (Number.isInteger(resultIndex)) {
                updates.set(resultIndex, item.id ?? null);
              }
            });

            if (updates.size) {
              setDiscountRules((prev) =>
                prev.map((rule, idx) => {
                  if (!updates.has(idx)) return rule;
                  const nextId = updates.get(idx);
                  if (rule.shopifyDiscountCodeId === nextId) return rule;
                  return { ...rule, shopifyDiscountCodeId: nextId };
                })
              );
            }
          }

          const serverRules = Array.isArray(result?.payload?.rules)
            ? result.payload.rules
            : null;

          if (serverRules) {
            setDiscountRules((prev) =>
              prev.map((rule, idx) => {
                const serverRule = serverRules[idx];
                if (!serverRule) return rule;
                return {
                  ...rule,
                  id: serverRule.id ?? rule.id ?? null,
                  shopifyDiscountCodeId:
                    serverRule.shopifyDiscountCodeId ??
                    rule.shopifyDiscountCodeId ??
                    null,
                };
              })
            );
          }
        }

        if (section === "free") {
          const serverRules = Array.isArray(result?.payload)
            ? result.payload
            : null;

          if (serverRules) {
            setFreeRules((prev) =>
              prev.map((rule, idx) => {
                const serverRule = serverRules[idx];
                if (!serverRule) return rule;
                return {
                  ...rule,
                  id: serverRule.id ?? rule.id ?? null,
                  freeProductDiscountID:
                    serverRule.freeProductDiscountID ??
                    rule.freeProductDiscountID ??
                    null,
                };
              })
            );
          }
        }

        if (section === "freeGiftMinAmount") {
          const serverRule = effectivePayload?.rule;

          if (serverRule) {
            setMinAmountRule(seedMinAmountRule(serverRule));
          }

          setMinAmountSyncError(result?.shopifySyncError || "");
        }

        if (section === "upsell") {
          const savedUpsell = effectivePayload || {};
          setUpsellEnabled(Boolean(savedUpsell.enabled));
          setUpsellShowAsSlider(Boolean(savedUpsell.showAsSlider));
          setUpsellAutoplay(Boolean(savedUpsell.autoplay));
          setUpsellMode(
            String(
              savedUpsell.recommendationMode ??
                DEFAULT_UPSELL_SETTINGS.recommendationMode
            )
          );
          setUpsellSectionTitle(
            savedUpsell.sectionTitle ?? DEFAULT_UPSELL_SETTINGS.sectionTitle
          );
          setUpsellButtonText(
            savedUpsell.buttonText ?? DEFAULT_UPSELL_SETTINGS.buttonText
          );
          setUpsellButtonColor(
            savedUpsell.buttonColor ?? DEFAULT_UPSELL_SETTINGS.buttonColor
          );
          setUpsellBgColor(
            savedUpsell.backgroundColor ??
              DEFAULT_UPSELL_SETTINGS.backgroundColor
          );
          setUpsellTextColor(
            savedUpsell.textColor ?? DEFAULT_UPSELL_SETTINGS.textColor
          );
          setUpsellBorderColor(
            savedUpsell.borderColor ?? DEFAULT_UPSELL_SETTINGS.borderColor
          );
          setUpsellArrowColor(
            savedUpsell.arrowColor ?? DEFAULT_UPSELL_SETTINGS.arrowColor
          );
          setUpsellProductIds(
            normalizeIds(savedUpsell.selectedProductIds || [])
          );
          setUpsellCollectionIds(
            normalizeIds(savedUpsell.selectedCollectionIds || [])
          );
        }

        setLastApiSection(section);
        setLastApiSnapshot(effectivePayload);
        setSaved(true);
        setTimeout(() => setSaved(false), 1200);
        const syncWarning = result?.shopifySyncError;

        if (syncWarning) {
          showToast(`Saved, but ${syncWarning}`, "warning");
        } else {
          showToast("Saved successfully");
        }
      } catch (err) {
        logger.error("[RULES API ERROR]", err);
        showToast(
          `Save failed: ${err instanceof Error ? err.message : "Unknown error"
          }`,

          "critical"
        );
      } finally {
        setSaving(false);
      }
    },

    [
      shippingRules,

      discountRules,

      freeRules,

      bxgyRules,

      font,

      base,

      headingScale,

      radius,

      textColor,

      bg,

      progress,

      buttonColor,

      borderColor,

      announcementBarBackgroundColor,
      announcementBarTextColor,
      buttonLabelColor,
      iconColor,

      cartDrawerBackgroundValue,

      cartDrawerBackground,

      cartDrawerTextColor,

      cartDrawerHeaderColor,

      cartDrawerBackgroundMode,

      cartDrawerImage,

      cartIconUrl,

      discountCodeApply,

      checkoutButtonText,

      drawerAutoOpen,
      drawerPosition,
      stickyCheckout,
      mobileLayout,

      upsellEnabled,
      upsellShowAsSlider,
      upsellAutoplay,
      upsellMode,
      upsellSectionTitle,
      upsellButtonText,
      upsellButtonColor,
      upsellBgColor,
      upsellTextColor,
      upsellBorderColor,
      upsellArrowColor,
      upsellProductIds,
      upsellCollectionIds,

      showToast,

      mapIcons,

      setBxgyRules,

      loaderShop,

      minAmountRule,

      setMinAmountRule,

      setMinAmountSyncError,
    ]
  );

  const handleAutomaticDiscountToggle = React.useCallback(
    async (rule, enable, discountIdOverride = null) => {
      if (!rule || !loaderShop) {
        return;
      }

      const ruleType =
        typeof rule.type === "string" ? rule.type.toLowerCase() : "automatic";
      const discountIdValue =
        discountIdOverride ??
        (ruleType === "code"
          ? rule.codeDiscountId
          : rule.shopifyDiscountCodeId) ??
        rule.buyxgetyId ??
        rule.freeProductDiscountID ??
        "";
      const discountId =
        typeof discountIdValue === "string"
          ? discountIdValue.trim()
          : discountIdValue
            ? String(discountIdValue).trim()
            : "";
      if (!discountId) {
        showToast("Save this rule first to sync it with Shopify, then use the Activate button.", "warning");
        return;
      }

      try {
        const res = await fetch("/api/rules", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({
            section: "discountActivation",
            payload: {
              discountId,
              enabled: Boolean(enable),
              type:
                typeof rule.type === "string"
                  ? rule.type.toLowerCase()
                  : "automatic",
            },
            shop: loaderShop,
          }),
        });

        if (!res.ok) {
          const text = await res.text();
          let message = `Failed to ${enable ? "enable" : "disable"} automatic discount`;
          try {
            const info = JSON.parse(text);
            message = info?.error || info?.message || message;
          } catch {
            if (text && text.startsWith("<!DOCTYPE html")) {
              message =
                "Authentication error while toggling automatic discount. Please log in again.";
            } else if (text) {
              message = text;
            }
          }
          throw new Error(message);
        }

        showToast(
          enable ? "Automatic discount enabled" : "Automatic discount disabled"
        );
      } catch (toggleErr) {
        logger.error("Automatic discount toggle failed", toggleErr);
        showToast(
          toggleErr instanceof Error
            ? toggleErr.message
            : "Failed to update automatic discount status",
          "critical"
        );
      }
    },

    [loaderShop, showToast]
  );

  const validateMinAmountRule = React.useCallback(() => {
    const minPurchaseValue = Number(minAmountRule.minPurchase);

    if (
      !minAmountRule.minPurchase ||
      Number.isNaN(minPurchaseValue) ||
      minPurchaseValue <= 0
    ) {
      showToast("Minimum amount must be greater than zero", "critical");

      return false;
    }

    if (!String(minAmountRule.bonusProductId || "").trim()) {
      showToast("Provide a free gift variant ID", "critical");

      return false;
    }

    if (minAmountRule.qty) {
      const qtyValue = Number(minAmountRule.qty);

      if (Number.isNaN(qtyValue) || qtyValue < 1) {
        showToast("Quantity must be at least 1", "critical");

        return false;
      }
    }

    if (minAmountRule.limitPerOrder) {
      const limitValue = Number(minAmountRule.limitPerOrder);

      if (Number.isNaN(limitValue) || limitValue < 1) {
        showToast("Limit per order must be at least 1", "critical");

        return false;
      }
    }

    return true;
  }, [minAmountRule, showToast]);

  const handleMinAmountSave = React.useCallback(() => {
    setMinAmountSyncError("");

    if (!validateMinAmountRule()) return;

    handleSectionSave("freeGiftMinAmount");
  }, [handleSectionSave, setMinAmountSyncError, validateMinAmountRule]);

  const automaticDiscountCount = discountRules.filter(
    (rule) => String(rule?.type || "automatic").toLowerCase() !== "code"
  ).length;
  const canAddShipping = true;
  const canAddAutomaticDiscount = true;
  const canAddCodeDiscount = true;
  const canUseFreeGift = true;
  const canUseBxgy = true;

  const handleSave = () => {
    setSaving(true);

    const payload = {
      shippingRules: mapIcons(
        dedupeRules(shippingRules, normalizeShippingRuleForKey)
      ),

      discountRules: mapIcons(
        dedupeRules(discountRules, normalizeDiscountRuleForKey)
      ),

      freeRules: mapIcons(dedupeRules(freeRules, normalizeFreeRuleForKey)),

      bxgyRules: mapIcons(dedupeRules(bxgyRules, normalizeBxgyRuleForKey)),

      style: {
        font,
        base,
        headingScale,
        radius,
        textColor,
        bg,
        progress,
        cartDrawerBackground: cartDrawerBackgroundValue.trim()
          ? cartDrawerBackgroundValue.trim()
          : "",
        cartDrawerTextColor,
        cartDrawerHeaderColor,
        cartDrawerBackgroundMode,
        cartDrawerImage:
          cartDrawerBackgroundMode === "image"
            ? cartDrawerImage.trim() || RURAL_DRAWER_IMAGE
            : null,
        cartIconUrl: cartIconUrl?.trim() || "",

        discountCodeApply,
        checkoutButtonText:
          checkoutButtonText?.trim() || DEFAULT_STYLE_SETTINGS.checkoutButtonText,
      },
    };

    setPayloadPreview(payload);

    logger.log("SAVE (UI-only):", payload);

    setTimeout(() => {
      setSaving(false);

      setSaved(true);

      setPayloadModalOpen(true);

      setTimeout(() => setSaved(false), 1200);
    }, 600);
  };

  /* add/remove handlers */

  const addShipping = () => {
    const cartStepName = getNextAvailableCartStepSlot(
      shippingRules,
      discountRules,
      freeRules
    );
    setShippingRules((r) => [
      ...r,
      {
        isNew: true,
        enabled: false,
        rewardType: "free",
        rateType: "flat",
        amount: "0",
        minSubtotal: "",
        method: "standard",
        iconChoice: "truck",
        icon: null,
        shopifyRateId: null,
        progressTextBefore: DEFAULT_STYLE_SETTINGS.progressTextBefore,
        progressTextAfter: DEFAULT_STYLE_SETTINGS.progressTextAfter,
        progressTextBelow: DEFAULT_STYLE_SETTINGS.progressTextBelow,
        campaignName: "Free Shipping",
        cartStepName,
      },
    ]);
  };

  const rmShipping = (i) =>
    setShippingRules((r) => {
      const next = r.filter((_, idx) => idx !== i);

      // Persist removal immediately (DB + Shopify) using updated list
      handleSectionSave("shipping", null, next);

      return next.length ? next : createDefaultShippingRules().map((r) => ({ ...r, isNew: true }));
    });

  const addDiscount = (type = "automatic") => {
    const cartStepName =
      type === "code"
        ? ""
        : getNextAvailableCartStepSlot(shippingRules, discountRules, freeRules);
    setDiscountRules((r) => [
      ...r,
      createDefaultDiscountRule({
        isNew: true,
        type,
        condition: type === "code" ? "code" : "all_payments",
        cartStepName,
      }),
    ]);
  };

  const rmDiscount = React.useCallback(
    async (i) => {
      const rule = discountRules[i];

      if (!rule) return;

      const nextRules = discountRules.filter((_, idx) => idx !== i);

      if (!rule.shopifyDiscountCodeId) {
        setDiscountRules(nextRules.length ? nextRules : [{ ...createDefaultDiscountRule({ type: rule.type || "automatic" }), isNew: true }]);

        handleSectionSave("discount", null, nextRules);

        return;
      }

      const label =
        rule.discountCode ||
        (rule.type ? `${rule.type} discount` : `Discount #${i + 1}`);

      setDeleting(true);

      setDeletingRuleLabel(label);

      let deleted = false;

      try {
        const res = await fetch("/api/rules", {
          method: "POST",

          headers: {
            "Content-Type": "application/json",

            Accept: "application/json",
          },

          credentials: "same-origin",

          body: JSON.stringify({
            deleteShopifyDiscount: rule.shopifyDiscountCodeId,

            shop: loaderShop,
          }),
        });

        const text = await res.text();

        let payload;

        try {
          payload = text ? JSON.parse(text) : {};
        } catch {
          payload = {};
        }

        const sanitizedError =
          payload?.error ||
          payload?.message ||
          sanitizeHtmlErrorText(text) ||
          (!res.ok ? "Failed to delete Shopify discount" : null);

        if (!res.ok || payload?.error) {
          throw new Error(sanitizedError);
        }

        deleted = true;

        showToast("Shopify discount deleted", "success");
      } catch (err) {
        logger.error("Failed to delete Shopify discount", err);

        showToast("Unable to delete Shopify discount", "critical");
      } finally {
        setDeleting(false);

        setDeletingRuleLabel("");
      }

      if (deleted) {
        setDiscountRules(nextRules.length ? nextRules : [{ ...createDefaultDiscountRule({ type: rule.type || "automatic" }), isNew: true }]);

        handleSectionSave("discount", null, nextRules);
      }
    },

    [discountRules, handleSectionSave, showToast, loaderShop]
  );

  const addFree = () => {
    const cartStepName = getNextAvailableCartStepSlot(
      shippingRules,
      discountRules,
      freeRules
    );
    setFreeRules((r) => [
      ...r,
      {
        isNew: true,
        enabled: false,
        trigger: "payment_online",
        minPurchase: "",
        triggerType: "amount",
        minQuantity: "2",
        bonus: "",
        qty: "1",
        limit: "1",
        replaceFree: true,
        excludeCOD: false,
        removeOnCOD: true,
        iconChoice: "gift",
        icon: null,
        progressTextBefore: DEFAULT_FREE_GIFT_CONTENT_TEXT.progressTextBefore,
        progressTextAfter: DEFAULT_FREE_GIFT_CONTENT_TEXT.progressTextAfter,
        quantityProgressTextBefore:
          DEFAULT_FREE_GIFT_CONTENT_TEXT.quantityProgressTextBefore,
        quantityProgressTextAfter:
          DEFAULT_FREE_GIFT_CONTENT_TEXT.quantityProgressTextAfter,
        progressTextBelow: DEFAULT_FREE_GIFT_CONTENT_TEXT.progressTextBelow,
        campaignName: "Free Product Rule",
        cartStepName,
      },
    ]);
  };

  const rmFree = React.useCallback(
    async (i) => {
      const rule = freeRules[i];

      if (!rule) return;

      const nextRules = freeRules.filter((_, idx) => idx !== i);

      const needsRemoteCleanup =
        Boolean(rule.id) || Boolean(rule.freeProductDiscountID);

      if (!needsRemoteCleanup) {
        setFreeRules(nextRules.length ? nextRules : [{ ...createDefaultFreeRule(), isNew: true }]);

        handleSectionSave("free", null, nextRules);

        return;
      }

      if (!loaderShop) {
        showToast("Unable to delete rule: missing shop context", "critical");

        return;
      }

      const label =
        productsById[rule.bonus]?.title ||
        rule.bonus ||
        `Free product rule #${i + 1}`;

      setDeleting(true);

      setDeletingRuleLabel(label);

      let deleted = false;

      try {
        const deletePayload = { shop: loaderShop };

        if (rule.id) deletePayload.deleteFreeRuleId = rule.id;

        if (rule.freeProductDiscountID)
          deletePayload.deleteFreeProductDiscount = rule.freeProductDiscountID;

        const res = await fetch("/api/rules", {
          method: "POST",

          headers: {
            "Content-Type": "application/json",

            Accept: "application/json",
          },

          credentials: "same-origin",

          body: JSON.stringify(deletePayload),
        });

        const text = await res.text();

        let payload;

        try {
          payload = text ? JSON.parse(text) : {};
        } catch {
          payload = {};
        }

        const sanitizedError =
          payload?.error ||
          payload?.message ||
          sanitizeHtmlErrorText(text) ||
          (!res.ok ? "Failed to delete free product rule" : null);

        if (!res.ok || payload?.error) {
          throw new Error(sanitizedError);
        }

        deleted = true;

        showToast("Free product rule removed", "success");
      } catch (err) {
        logger.error("Failed to delete free product rule", err);

        showToast("Unable to delete free product rule", "critical");
      } finally {
        setDeleting(false);

        setDeletingRuleLabel("");
      }

      if (deleted) {
        setFreeRules(nextRules.length ? nextRules : [{ ...createDefaultFreeRule(), isNew: true }]);
      }
    },

    [
      freeRules,

      handleSectionSave,

      loaderShop,

      productsById,

      sanitizeHtmlErrorText,

      showToast,
    ]
  );

  const addBxgy = () => {
    setBxgyRules((r) => [
      ...r,
      { ...createDefaultBxgyRule(), isNew: true },
    ]);
  };

  const rmBxgy = React.useCallback(
    async (i) => {
      const rule = bxgyRules[i];

      if (!rule) return;

      if (!rule.buyxgetyId && !rule.id) {
        setBxgyRules((prev) => {
          const next = prev.filter((_, idx) => idx !== i);
          return next.length ? next : [{ ...createDefaultBxgyRule(), isNew: true }];
        });

        return;
      }

      const matchesRule = (candidate) => {
        if (!candidate) return false;

        if (
          rule.id &&
          candidate.id &&
          String(candidate.id) === String(rule.id)
        ) {
          return true;
        }

        if (
          rule.buyxgetyId &&
          candidate.buyxgetyId &&
          String(candidate.buyxgetyId) === String(rule.buyxgetyId)
        ) {
          return true;
        }

        return false;
      };

      setBxgyRules((prev) => {
        const next = prev.filter((item) => !matchesRule(item));
        return next.length ? next : [{ ...createDefaultBxgyRule(), isNew: true }];
      });

      setDeleting(true);

      setDeletingRuleLabel(
        rule.title ||
        `CartLift: Cart Drawer & Upsell BXGY ${rule.xQty || "X"} ? ${rule.yQty || "Y"}`
      );

      let deleted = false;

      try {
        const deletePayload = { shop: loaderShop };

        if (rule.buyxgetyId) deletePayload.deleteShopifyBxgy = rule.buyxgetyId;

        if (rule.id) deletePayload.deleteBxgyRuleId = rule.id;

        const res = await fetch("/api/rules", {
          method: "POST",

          headers: {
            "Content-Type": "application/json",

            Accept: "application/json",
          },

          credentials: "same-origin",

          body: JSON.stringify(deletePayload),
        });

        const text = await res.text();

        let payload;

        try {
          payload = text ? JSON.parse(text) : {};
        } catch {
          payload = {};
        }

        const sanitizedError =
          payload?.error ||
          payload?.message ||
          sanitizeHtmlErrorText(text) ||
          (!res.ok ? "Failed to delete Shopify BXGY discount" : null);

        if (!res.ok || payload?.error) {
          throw new Error(sanitizedError);
        }

        const toastMessage = rule.buyxgetyId
          ? "Shopify BXGY discount deleted"
          : "BXGY rule deleted";

        showToast(toastMessage, "success");
      } catch (err) {
        logger.error("Failed to delete Shopify BXGY discount", err);

        showToast("Unable to delete Shopify BXGY discount", "critical");
      } finally {
        setDeleting(false);

        setDeletingRuleLabel("");
      }
    },

    [bxgyRules, showToast, loaderShop]
  );

  const previewRadius = Number(radius) || 12;

  const previewTrackStyle = {
    height: 8,
    borderRadius: 999,
    background: "#fcefcf",
    overflow: "hidden",
  };

  const sliderInputStyle = {
    width: "100%",
    margin: 0,
    appearance: "none",
    WebkitAppearance: "none",
    height: 6,
    borderRadius: 999,
    background: "#e5e7eb",
  };

  const previewCardStyle = {
    borderRadius: previewRadius,
    // border: "1px solid rgba(148,163,184,0.45)",
    padding: 5,
    // background: "#ffffff",
    // boxShadow: "0 15px 35px rgba(15,23,42,0.12)",
  };

  const previewTrackWrapperStyle = {
    position: "relative",
    marginBottom: 10,
  };

  const previewRulesList = shippingPreviewRules;
  const thresholdValues = previewRulesList
    .map((entry) => entry.threshold)
    .filter((value) => value !== null && Number.isFinite(value));

  const previewGoalValue =
    thresholdValues.length > 0 ? thresholdValues[thresholdValues.length - 1] : 500;
  const normalizedPreviewGoal = previewGoalValue > 0 ? previewGoalValue : 500;
  const previewSliderPercent = Math.min(1, Math.max(0, maskSlider / 100));
  const previewCurrentTotal = previewSliderPercent * normalizedPreviewGoal;

  const stepCount = Math.max(previewRulesList.length, 1);
  const previewCenters = Array.from({ length: previewRulesList.length }, (_, idx) => {
    if (stepCount === 1) return 100;
    return Math.min(100, ((idx + 1) * 100) / stepCount);
  });

  const nextRuleIndex = previewRulesList.findIndex(
    (entry) =>
      entry.threshold !== null &&
      Number.isFinite(entry.threshold) &&
      previewCurrentTotal < entry.threshold
  );
  const activeRuleIndex =
    nextRuleIndex === -1
      ? previewRulesList.length - 1
      : nextRuleIndex;
  const activeRuleEntry =
    previewRulesList[activeRuleIndex] || previewRulesList[0] || null;
  const activeRuleThreshold =
    activeRuleEntry?.threshold ?? normalizedPreviewGoal;

  const previewAmountRemaining = Math.max(
    0,
    (activeRuleThreshold || normalizedPreviewGoal) - previewCurrentTotal
  );

  const previewTokens = {
    goal: fmtMoney(previewAmountRemaining, currencyCode),
    current_status: fmtMoney(previewCurrentTotal, currencyCode),
  };

  const previewBeforeTemplate =
    activeRuleEntry?.rule?.progressTextBefore ??
    DEFAULT_STYLE_SETTINGS.progressTextBefore;
  const previewAfterTemplate =
    activeRuleEntry?.rule?.progressTextAfter ??
    DEFAULT_STYLE_SETTINGS.progressTextAfter;
  const previewBelowTemplate =
    activeRuleEntry?.rule?.progressTextBelow ??
    DEFAULT_STYLE_SETTINGS.progressTextBelow;

  const previewBeforeText =
    renderProgressText(previewBeforeTemplate, previewTokens) || "";
  const previewAfterText = renderProgressText(
    previewAfterTemplate,
    previewTokens
  );
  const previewBelowText = renderProgressText(
    previewBelowTemplate,
    previewTokens
  );

  const previewRewardLabel = stepLabelForRule("shipping", activeRuleEntry?.rule, currencyCode);
  const previewIsComplete =
    Number.isFinite(activeRuleThreshold) && previewCurrentTotal >= activeRuleThreshold;
  const previewDefaultBefore =
    previewAmountRemaining > 0
      ? `Add ${fmtMoney(
        previewAmountRemaining,
        currencyCode
      )} more to get ${previewRewardLabel} with this order`
      : `${previewRewardLabel} unlocked!`;
  const previewDefaultAfter = previewIsComplete
    ? `${previewRewardLabel} unlocked!`
    : previewDefaultBefore;
  const previewHeaderText = previewIsComplete
    ? previewAfterText || previewDefaultAfter
    : previewBeforeText || previewDefaultBefore;

  const completedSegments = previewRulesList.filter(
    (entry) =>
      entry.threshold !== null &&
      Number.isFinite(entry.threshold) &&
      previewCurrentTotal >= entry.threshold
  ).length;
  const discreteSegment =
    completedSegments > 0 ? Math.min(completedSegments, stepCount) : 0;
  const fillPercent = Math.min(100, previewSliderPercent * 100);
  const previewFillStyle = {
    width: `${fillPercent}%`,
    height: "100%",
    background: "#111111",
  };

  const freePreviewRules = React.useMemo(() => {
    const normalized = (Array.isArray(freeRules) ? freeRules : [])
      .map((rule) => {
        const { value: thresholdValue } = getRuleTriggerThreshold(rule);
        const threshold =
          thresholdValue !== null &&
            Number.isFinite(Number(thresholdValue))
            ? Number(thresholdValue)
            : null;
        return { rule, threshold };
      })
      .sort((a, b) => {
        const aVal = a.threshold !== null ? a.threshold : Number.MAX_SAFE_INTEGER;
        const bVal = b.threshold !== null ? b.threshold : Number.MAX_SAFE_INTEGER;
        return aVal - bVal;
      });

    return normalized;
  }, [freeRules]);

  const freePreviewSliderPercent = Math.min(
    1,
    Math.max(0, freeMaskSlider / 100)
  );
  const freeThresholdValues = freePreviewRules
    .map((entry) => entry.threshold)
    .filter((value) => value !== null && Number.isFinite(value));
  const freePreviewGoalValue =
    freeThresholdValues.length > 0
      ? freeThresholdValues[freeThresholdValues.length - 1]
      : 500;
  const freeNormalizedGoal =
    freePreviewGoalValue > 0 ? freePreviewGoalValue : 500;
  const freeCurrentTotal = freePreviewSliderPercent * freeNormalizedGoal;
  const freeNextRuleIndex = freePreviewRules.findIndex(
    (entry) =>
      entry.threshold !== null &&
      Number.isFinite(entry.threshold) &&
      freeCurrentTotal < entry.threshold
  );
  const freeActiveRuleIndex =
    freeNextRuleIndex === -1 ? freePreviewRules.length - 1 : freeNextRuleIndex;
  const freeActiveRuleEntry =
    freePreviewRules[freeActiveRuleIndex] || null;
  const freeActiveRuleThreshold =
    freeActiveRuleEntry?.threshold ?? freeNormalizedGoal;
  const freeAmountRemaining = Math.max(
    0,
    (freeActiveRuleThreshold || freeNormalizedGoal) - freeCurrentTotal
  );
  const freePreviewGoalText = formatTriggerPreviewValue(
    freeActiveRuleEntry?.rule,
    freeAmountRemaining,
    currencyCode
  );
  const freePreviewCurrentText = formatTriggerPreviewValue(
    freeActiveRuleEntry?.rule,
    freeCurrentTotal,
    currencyCode
  );
  const freePreviewTokens = {
    goal: freePreviewGoalText,
    current_status: freePreviewCurrentText,
  };
  const freeBeforeTemplate = getProgressTextForTrigger(
    freeActiveRuleEntry?.rule,
    DEFAULT_FREE_GIFT_CONTENT_TEXT,
    "before"
  );
  const freeAfterTemplate = getProgressTextForTrigger(
    freeActiveRuleEntry?.rule,
    DEFAULT_FREE_GIFT_CONTENT_TEXT,
    "after"
  );
  const freeBelowTemplate =
    freeActiveRuleEntry?.rule?.progressTextBelow ??
    DEFAULT_FREE_GIFT_CONTENT_TEXT.progressTextBelow;
  const freeBeforeText =
    renderProgressText(freeBeforeTemplate, freePreviewTokens) || "";
  const freeAfterText = renderProgressText(
    freeAfterTemplate,
    freePreviewTokens
  );
  const freeBelowText = renderProgressText(
    freeBelowTemplate,
    freePreviewTokens
  );
  const freeStepLabel = stepLabelForRule("free", freeActiveRuleEntry?.rule, currencyCode);
  const freeIsComplete =
    Number.isFinite(freeActiveRuleThreshold) &&
    freeCurrentTotal >= freeActiveRuleThreshold;
  const freeDefaultBefore =
    freeAmountRemaining > 0
      ? `Add ${freePreviewGoalText} more to get ${freeStepLabel} with this order`
      : `${freeStepLabel} unlocked!`;
  const freeDefaultAfter = freeIsComplete
    ? `${freeStepLabel} unlocked!`
    : freeDefaultBefore;
  const freeHeaderText = freeIsComplete
    ? freeAfterText || freeDefaultAfter
    : freeBeforeText || freeDefaultBefore;
  const freeStepCount = Math.max(freePreviewRules.length, 1);
  const freeFillWidthPercent = Math.min(
    100,
    Math.max(0, freePreviewSliderPercent * 100)
  );
  const freeFillColor = mixHexColors(
    "#000000",
    progress || DEFAULT_STYLE_SETTINGS.progress,
    freePreviewSliderPercent
  );
  const freeFillStyle = {
    width: `${freeFillWidthPercent}%`,
    height: "100%",
    background: freeFillColor,
  };
  const freeStepPercents = getStepPercents(freePreviewRules.length);

  const discountPreviewSliderPercent = Math.min(
    1,
    Math.max(0, discountMaskSlider / 100)
  );
  const discountThresholdValues = discountPreviewRules
    .map((entry) => entry.threshold)
    .filter((value) => value !== null && Number.isFinite(value));
  const discountPreviewGoalValue =
    discountThresholdValues.length > 0
      ? discountThresholdValues[discountThresholdValues.length - 1]
      : 500;
  const discountNormalizedGoal =
    discountPreviewGoalValue > 0 ? discountPreviewGoalValue : 500;
  const discountCurrentTotal = discountPreviewSliderPercent * discountNormalizedGoal;
  const discountNextRuleIndex = discountPreviewRules.findIndex(
    (entry) =>
      entry.threshold !== null &&
      Number.isFinite(entry.threshold) &&
      discountCurrentTotal < entry.threshold
  );
  const discountActiveRuleIndex =
    discountNextRuleIndex === -1
      ? discountPreviewRules.length - 1
      : discountNextRuleIndex;
  const discountActiveRuleEntry =
    discountPreviewRules[discountActiveRuleIndex] || null;
  const discountActiveRuleThreshold =
    discountActiveRuleEntry?.threshold ?? discountNormalizedGoal;
  const discountAmountRemaining = Math.max(
    0,
    (discountActiveRuleThreshold || discountNormalizedGoal) - discountCurrentTotal
  );
  const discountPreviewGoalText = formatTriggerPreviewValue(
    discountActiveRuleEntry?.rule,
    discountAmountRemaining,
    currencyCode
  );
  const discountPreviewCurrentText = formatTriggerPreviewValue(
    discountActiveRuleEntry?.rule,
    discountCurrentTotal,
    currencyCode
  );
  const discountValueWithOff =
    formatDiscountValueDisplay(discountActiveRuleEntry?.rule, currencyCode) || "Value";
  const discountValue =
    discountValueWithOff.replace(/\s*off$/i, "").trim() || discountValueWithOff;
  const discountPreviewTokens = {
    goal: discountPreviewGoalText,
    current_status: discountPreviewCurrentText,
    discount:
      discountActiveRuleEntry?.rule?.value !== undefined
        ? buildFullOptionLabel("discount", discountActiveRuleEntry.rule, currencyCode)
        : "Discount",
    discount_value: discountValue,
    discount_value_with_off: discountValueWithOff,
    discount_code:
      discountActiveRuleEntry?.rule?.discountCode || "CODE",
  };
  const discountDefaults = getDiscountContentDefaults(
    discountActiveRuleEntry?.rule?.type
  );
  const discountBeforeTemplate = getProgressTextForTrigger(
    discountActiveRuleEntry?.rule,
    discountDefaults,
    "before"
  );
  const discountAfterTemplate = getProgressTextForTrigger(
    discountActiveRuleEntry?.rule,
    discountDefaults,
    "after"
  );
  const discountBelowTemplate =
    discountActiveRuleEntry?.rule?.progressTextBelow ??
    discountDefaults.progressTextBelow;
  const discountBeforeText =
    renderProgressText(discountBeforeTemplate, discountPreviewTokens) || "";
  const discountAfterText = renderProgressText(
    discountAfterTemplate,
    discountPreviewTokens
  );
  const discountBelowText = renderProgressText(
    discountBelowTemplate,
    discountPreviewTokens
  );
  const discountStepLabel = stepLabelForRule(
    "discount",
    discountActiveRuleEntry?.rule,
    currencyCode
  );
  const discountIsComplete =
    Number.isFinite(discountActiveRuleThreshold) &&
    discountCurrentTotal >= discountActiveRuleThreshold;
  const discountDefaultBefore =
    discountAmountRemaining > 0
      ? `Add ${discountPreviewGoalText} more to get ${discountStepLabel} with this order`
      : `${discountStepLabel} unlocked!`;
  const discountDefaultAfter = discountIsComplete
    ? `${discountStepLabel} unlocked!`
    : discountDefaultBefore;
  const discountHeaderText = discountIsComplete
    ? discountAfterText || discountDefaultAfter
    : discountBeforeText || discountDefaultBefore;
  const discountFillWidthPercent = Math.min(
    100,
    Math.max(0, discountPreviewSliderPercent * 100)
  );
  const discountFillColor = mixHexColors(
    "#000000",
    "#000000",
    discountPreviewSliderPercent
  );
  const discountFillStyle = {
    width: `${discountFillWidthPercent}%`,
    height: "100%",
    background: discountFillColor,
  };
  const discountCenterCount = Math.max(discountPreviewRules.length, 1);
  const discountCenters = Array.from({ length: discountPreviewRules.length }, (_, idx) => {
    if (discountCenterCount === 1) return 100;
    return Math.min(100, ((idx + 1) * 100) / discountCenterCount);
  });

  const shippingReadOnly = false;

  const ShippingPanel = (
    <BlockStack gap="200">
      <InlineStack align="space-between" blockAlign="center">
        <Text as="h4" variant="headingSm">
          Shipping Rules
        </Text>

        <InlineStack gap="200">
          <Button onClick={addShipping} disabled={!canAddShipping}>
            Add Rule
          </Button>
        </InlineStack>
      </InlineStack>

      {shippingRules.map((r, i) => {
        const contentActions = (
          <InlineStack align="end">
            <Button
              size="slim"
              variant="primary"
              loading={saving}
              onClick={() => handleSectionSave("shipping", i)}
              disabled={shippingReadOnly}
            >
              Save Rule
            </Button>
          </InlineStack>
        );

        const shippingToggleLabel = r.enabled ? "Deactivate" : "Activate";
        const shippingToggleButton = (
          <Button
            plain
            disabled={shippingReadOnly}
            onClick={() => {
              if (shippingReadOnly) return;
              const nextEnabled = !r.enabled;
              const updatedRules = shippingRules.map((it, idx) =>
                idx === i ? { ...it, enabled: nextEnabled } : it
              );
              setShippingRules(updatedRules);
              handleSectionSave("shipping", null, updatedRules);
            }}
          >
            {shippingToggleLabel}
          </Button>
        );
        return (
          <RuleShell
            key={i}
            title={r.campaignName?.trim() ? r.campaignName : "Shipping Rule"}
            index={i}
            onRemove={() => rmShipping(i)}
            summary={shippingSummary(r, currencyCode)}
            icon={r.iconChoice}
            actions={shippingToggleButton}
            defaultOpen={!r.isNew}
            disableRemove={shippingReadOnly}
          >
            <BlockStack gap="200">
              <div className="rules-field-panel rules-field-panel--inline">
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Reward Type</span>
                  <Select
                    labelHidden
                    disabled={shippingReadOnly}
                    options={[
                      { label: "Free Shipping", value: "free" },
                      { label: "Reduced Shipping", value: "reduced" },
                    ]}
                    value={r.rewardType}
                    onChange={(v) =>
                      setShippingRules((x) =>
                        x.map((it, idx) =>
                          idx === i
                            ? { ...it, rewardType: v, rateType: "flat" }
                            : it
                        )
                      )
                    }
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    Threshold: Min Subtotal ({currencySymbol})
                  </div>
                  <TextField
                    size="small"
                    labelHidden
                    disabled={shippingReadOnly}
                    value={r.minSubtotal}
                    onChange={(v) =>
                      setShippingRules((x) =>
                        x.map((it, idx) =>
                          idx === i ? { ...it, minSubtotal: v } : it
                        )
                      )
                    }
                    style={{ minWidth: 110 }}
                  />
                </div>
                {r.rewardType === "reduced" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div
                      style={{ fontSize: 13, fontWeight: 600 }}
                      title="Flat shipping amount"
                    >
                      Flat shipping amount
                    </div>
                    <TextField
                      size="small"
                      labelHidden
                      disabled={shippingReadOnly}
                      value={r.amount}
                      onChange={(v) =>
                        setShippingRules((x) =>
                          x.map((it, idx) =>
                            idx === i ? { ...it, amount: v } : it
                          )
                        )
                      }
                      style={{ minWidth: 80 }}
                    />
                  </div>
                )}
                {/* <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {/* <div style={{ fontSize: 13, fontWeight: 600 }}>Rule icon</div>
                  <Select
                    labelHidden
                    disabled={shippingReadOnly}
                    options={ICON_OPTIONS}
                    value={r.iconChoice || "truck"}
                    onChange={(v) =>
                      setShippingRules((x) =>
                        x.map((it, idx) =>
                          idx === i ? { ...it, iconChoice: v } : it
                        )
                      )
                    }
                  /> 
                </div> */}
              </div>
              <RuleScheduleFields
                startsAt={r.startsAt}
                endsAt={r.endsAt}
                disabled={shippingReadOnly}
                onStartsAtChange={(value) =>
                  updateShippingRuleField(i, "startsAt", value)
                }
                onEndsAtChange={(value) =>
                  updateShippingRuleField(i, "endsAt", value)
                }
              />
              <AdvancedRuleControls
                rule={r}
                disabled={shippingReadOnly}
                onFieldChange={(field, value) =>
                  updateShippingRuleField(i, field, value)
                }
                onTranslationChange={(locale, field, value) =>
                  updateRuleTranslation(setShippingRules, i, locale, field, value)
                }
              />
              <Divider />
              <div
                gap="100"
                style={{ marginBottom: 8 }}
                className="rules-section-title"
              >
                <svg
                  viewBox="0 0 20 20"
                  focusable="false"
                  aria-hidden="true"
                  width="20px"
                  height="20px"
                >
                  <path d="M15.747 2.354c.195-.196.512-.196.707 0l1.06 1.06c.196.195.196.512 0 .707l-.956.957-1.768-1.767.957-.957Z" />
                  <path d="m14.083 4.018 1.768 1.768-2.831 2.83c-.359.359-.84.568-1.348.585l-.772.025c-.144.005-.263-.113-.258-.258l.026-.772c.016-.507.225-.989.584-1.348l2.83-2.83Z" />
                  <path d="M5.5 5.75c0-.69.56-1.25 1.25-1.25h4.5c.414 0 .75-.336.75-.75s-.336-.75-.75-.75h-4.5c-1.519 0-2.75 1.231-2.75 2.75v8.5c0 1.519 1.231 2.75 2.75 2.75h6.5c1.519 0 2.75-1.231 2.75-2.75v-4.5c0-.414-.336-.75-.75-.75s-.75.336-.75.75v4.5c0 .69-.56 1.25-1.25 1.25h-6.5c-.69 0-1.25-.56-1.25-1.25v-8.5Z" />
                  <path d="M7.75 12.75c-.414 0-.75.336-.75.75s.336.75.75.75h2.5c.414 0 .75-.336.75-.75s-.336-.75-.75-.75h-2.5Z" />
                  <path d="M7 10.75c0-.414.336-.75.75-.75h4.5c.414 0 .75.336.75.75s-.336.75-.75.75h-4.5c-.414 0-.75-.336-.75-.75Z" />
                </svg>
                <Text
                  as="h3"
                  variant="headingSm"
                  style={{ fontSize: 16, fontWeight: 600 }}
                >
                  Content Settings
                </Text>
              </div>
              <BlockStack gap="200">
                <Box style={{ width: "100%" }}>
                  {renderTokenField(
                    `before-${i}`,
                    "Text above progress bar (before achieving goal)",
                    r.progressTextBefore ?? DEFAULT_STYLE_SETTINGS.progressTextBefore,
                    (value) =>
                      updateShippingRuleField(
                        i,
                        "progressTextBefore",
                        value
                      ),
                    null,
                    { disabled: shippingReadOnly }
                  )}
                </Box>
                <Box style={{ width: "100%", marginTop: 5 }}>
                  {renderTokenField(
                    `after-${i}`,
                    "Text above progress bar (after achieving goal)",
                    r.progressTextAfter || "",
                    (value) =>
                      updateShippingRuleField(
                        i,
                        "progressTextAfter",
                        value?.trim() ? value : null
                      ),
                    null,
                    { disabled: shippingReadOnly }
                  )}
                </Box>
              </BlockStack>
              <InlineStack gap="200" align="stretch" wrap={false}>
                <Box style={{ flex: "1 1 360px" }}>
                  {renderTokenField(
                    `below-${i}`,
                    "Text below progress bar",
                    r.progressTextBelow || "Free Shipping",
                    (value) =>
                      updateShippingRuleField(
                        i,
                        "progressTextBelow",
                        value?.trim() ? value : null
                      ),
                    null,
                    { disabled: shippingReadOnly }
                  )}
                </Box>
                <Box style={{ flex: "1 1 280px" }}>
                  <TextField
                    label="Campaign name"
                    disabled={shippingReadOnly}
                    value={r.campaignName ?? "Free Shipping"}
                    onChange={(value) =>
                      updateShippingRuleField(
                        i,
                        "campaignName",
                        value
                      )
                    }
                    placeholder="Free Shipping"
                  />
                </Box>
                <Box style={{ flex: "1 1 220px" }}>
                  <Select
                    label="Cart Step"
                    disabled={shippingReadOnly}
                    options={getCartStepOptions("shipping", i)}
                    value={r.cartStepName || ""}
                    onChange={(value) =>
                      updateCartStepField("shipping", i, value)
                    }
                  />
                </Box>
              </InlineStack>
              {contentActions}
            </BlockStack>
          </RuleShell>
        );
      })}
    </BlockStack>
  );

  const ShippingPreviewCard = (
    <Card>
      <Box>
        <Text as="h4" variant="headingSm">
          Preview
        </Text>
        <Divider />
        <Box style={{ ...previewCardStyle, marginTop: 10 }}>
          <Box
            style={{
              marginBottom: 10,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#000000",
              }}
            >
              {previewHeaderText || "Preview"}
            </div>
          </Box>

          <Box style={previewTrackWrapperStyle}>
            <div style={previewTrackStyle}>
              <div style={previewFillStyle} />
            </div>
            {previewRulesList.map((entry, idx) => {
              const center = previewCenters[idx] ?? 0;
              const ruleBelowTemplate =
                entry.rule?.progressTextBelow ??
                DEFAULT_STYLE_SETTINGS.progressTextBelow;
              const ruleBelowText =
                renderProgressText(ruleBelowTemplate, previewTokens) || "";
              const ruleCopy = ruleBelowText;
              const isRuleComplete =
                Number.isFinite(entry.threshold) &&
                previewCurrentTotal >= entry.threshold;
              const iconSource =
                ICON_POLARIS[entry.rule?.iconChoice || "truck"] ||
                ICON_POLARIS.truck;
              return (
                <div
                  key={entry.rule?.id || `preview-rule-${idx}`}
                  style={{
                    position: "absolute",
                    left: `calc(${center}% - 18px)`,
                    top: -15,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    pointerEvents: "none",
                    right: `${center}%`,
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 999,
                      display: "grid",
                      placeItems: "center",
                      background: "#f3f4f6",
                    }}
                  >
                    {isRuleComplete ? (
                      <Icon source={CheckCircleIcon} color="success" />
                    ) : (
                      <Icon source={iconSource} />
                    )}
                  </div>
                  {ruleCopy ? (
                    <Text
                      variant="bodyXs"
                      tone="subdued"
                      style={{ whiteSpace: "nowrap", fontSize: 11 }}
                    >
                      {ruleCopy}
                    </Text>
                  ) : null}
                </div>
              );
            })}
          </Box>

          <Box style={{ marginTop: 50 }}>
            <Text tone="subdued" variant="bodySm">
              Use this to adjust the progress bar
            </Text>
            <input
              type="range"
              min={0}
              max={100}
              value={maskSlider}
              onChange={(event) => setMaskSlider(Number(event.target.value))}
              style={sliderInputStyle}
            />
          </Box>
        </Box>
      </Box>
    </Card>
  );
  const DiscountPreviewCard = (
    <Card>
      <Box>
        <Text as="h4" variant="headingSm">
          Preview
        </Text>
        <Divider />
        <Box style={{ ...previewCardStyle, marginTop: 10 }}>
          <Box
            style={{
              marginBottom: 10,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#000000",
              }}
            >
              {discountHeaderText}
            </div>
          </Box>

          <Box style={previewTrackWrapperStyle}>
            <div style={previewTrackStyle}>
              <div style={discountFillStyle} />
            </div>
            {discountPreviewRules.map((entry, idx) => {
              const center = discountCenters[idx] ?? 0;
              const ruleDefaults = getDiscountContentDefaults(entry.rule?.type);
              const ruleBelowTemplate =
                entry.rule?.progressTextBelow ?? ruleDefaults.progressTextBelow;
              const ruleBelowText =
                renderProgressText(ruleBelowTemplate, discountPreviewTokens) || "";
              const ruleCopy = ruleBelowText || stepLabelForRule("discount", entry.rule, currencyCode);
              const stepComplete =
                Number.isFinite(entry.threshold) &&
                discountCurrentTotal >= entry.threshold;
              return (
                <div
                  key={entry.rule?.id || `discount-preview-${idx}`}
                  style={{
                    position: "absolute",
                    left: `calc(${center}% - 28px)`,
                    top: -15,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    pointerEvents: "none",
                    right: `${center}%`,
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 999,
                      background: stepComplete ? "#f3f4f6" : "#f3f4f6",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 18,
                    }}
                  >
                    {stepComplete ? (
                      <Icon source={CheckCircleIcon} color="white" />
                    ) : (
                      <Icon source={ICON_POLARIS[entry.rule?.iconChoice || "tag"] || ICON_POLARIS.tag} />
                    )}
                  </div>
                  {ruleCopy && (
                    <Text
                      variant="bodyXs"
                      tone="subdued"
                      style={{ whiteSpace: "nowrap", fontSize: 11 }}
                    >
                      {ruleCopy}
                    </Text>
                  )}
                </div>
              );
            })}
          </Box>

          <Box style={{ marginTop: 50 }}>
            <Text tone="subdued" variant="bodySm">
              Use this to adjust the progress bar
            </Text>
            <input
              type="range"
              min={0}
              max={100}
              value={discountMaskSlider}
              onChange={(event) =>
                setDiscountMaskSlider(Number(event.target.value))
              }
              style={sliderInputStyle}
            />
          </Box>
        </Box>
      </Box>
    </Card>
  );
  const FreeProductPreviewCard = (
    <Card>
      <Box>
        <Text as="h4" variant="headingSm">
          Preview
        </Text>
        <Divider />
        <Box style={{ ...previewCardStyle, marginTop: 10 }}>
          <Box
            style={{
              marginBottom: 10,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#000000",
              }}
            >
              {freeHeaderText || "Preview"}
            </div>
          </Box>

          <Box style={previewTrackWrapperStyle}>
            <div style={previewTrackStyle}>
              <div style={freeFillStyle} />
            </div>
            {freePreviewRules.map((entry, idx) => {
              const ruleBelowTemplate =
                entry.rule?.progressTextBelow ??
                DEFAULT_FREE_GIFT_CONTENT_TEXT.progressTextBelow;
              const ruleBelowText =
                renderProgressText(ruleBelowTemplate, freePreviewTokens) || "";
              const ruleCopy =
                ruleBelowText || stepLabelForRule("free", entry.rule, currencyCode);
              const stepThreshold = (idx + 1) / freeStepCount;
              const isRuleComplete = freePreviewSliderPercent >= stepThreshold;
              const iconSource =
                ICON_POLARIS[entry.rule?.iconChoice || "gift"] ||
                ICON_POLARIS.gift;
              const center = freeStepPercents[idx] ?? 0;
              return (
                <div
                  key={entry.rule?.id || `free-preview-${idx}`}
                  style={{
                    position: "absolute",
                    left: `calc(${center}% - 18px)`,
                    top: -15,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    pointerEvents: "none",
                    right: `${center}`,
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 999,
                      display: "grid",
                      placeItems: "center",
                      fontSize: 18,
                      background: "#f3f4f6",
                    }}
                  >
                    {isRuleComplete ? (
                      <Icon source={CheckCircleIcon} color="success" />
                    ) : (
                      <Icon source={iconSource} />
                    )}
                  </div>
                  {ruleCopy && (
                    <Text
                      variant="bodyXs"
                      tone="subdued"
                      style={{ whiteSpace: "nowrap", fontSize: 11 }}
                    >
                      {ruleCopy}
                    </Text>
                  )}
                </div>
              );
            })}
          </Box>

          <Box style={{ marginTop: 50 }}>
            <Text tone="subdued" variant="bodySm">
              Use this to adjust the progress bar
            </Text>
            <input
              type="range"
              min={0}
              max={100}
              value={freeMaskSlider}
              onChange={(event) =>
                setFreeMaskSlider(Number(event.target.value))
              }
              style={sliderInputStyle}
            />
          </Box>
        </Box>
      </Box>
    </Card>
  );

  const renderDiscountPanel = (
    title,
    filterRule = () => true,
    addLabel = "Add Rule",
    defaultType = "automatic",
    showTypeSelect = true,
    showValueTypeSelect = false,
    ruleLabel = "Discount Rule",
    showScopeInline = false,
    showContentExtras = true,
    showProgressPreview = false,
    allowAdd = true,
    readOnly = false
  ) => {
    const filteredRules = discountRules
      .map((rule, index) => ({ rule, index }))
      .filter(({ rule }) => filterRule(rule));

    return (
      <BlockStack gap="200">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h4" variant="headingSm">
            {title}
          </Text>

          <InlineStack gap="200">
            <Button
              onClick={() => addDiscount(defaultType)}
              disabled={!allowAdd}
            >
              {addLabel}
            </Button>
          </InlineStack>
        </InlineStack>

        {filteredRules.map(({ rule: r, index }, panelIndex) => {
          const valueType = (r.valueType || "percent").toLowerCase();
          const triggerType = normalizeTriggerType(r.triggerType);
          const contentDefaults = getDiscountContentDefaults(r.type);
          const beforeContentField = getProgressTextFieldForTrigger(r, "before");
          const afterContentField = getProgressTextFieldForTrigger(r, "after");
          const beforeContentValue = getProgressTextForTrigger(
            r,
            contentDefaults,
            "before"
          );
          const afterContentValue = getProgressTextForTrigger(
            r,
            contentDefaults,
            "after"
          );
          const valueLabel =
            valueType === "amount" ? `Value (${currencySymbol})` : "Value (%)";
          const toggleLabel = r.enabled ? "Deactivate" : "Activate";
          const autoButton =
            r.type !== "code" ? (
              <Button
                plain
                disabled={readOnly || !r.shopifyDiscountCodeId}
                onClick={() => {
                  if (readOnly) return;
                  const nextEnabled = !r.enabled;
                  setDiscountRules((x) =>
                    x.map((it, idx) =>
                      idx === index ? { ...it, enabled: nextEnabled } : it
                    )
                  );
                  void handleAutomaticDiscountToggle(
                    { ...r, enabled: nextEnabled },
                    nextEnabled,
                    r.shopifyDiscountCodeId
                  );
                }}
              >
                {toggleLabel}
              </Button>
            ) : null;
          const codeButton =
            r.type === "code" ? (
              <Button
                plain
                disabled={readOnly}
                onClick={() => {
                  if (readOnly) return;
                  const nextEnabled = !r.enabled;
                  setDiscountRules((x) =>
                    x.map((it, idx) =>
                      idx === index ? { ...it, enabled: nextEnabled } : it
                    )
                  );
                  void handleAutomaticDiscountToggle(
                    { ...r, enabled: nextEnabled },
                    nextEnabled,
                    r.shopifyDiscountCodeId
                  );
                }}
              >
                {toggleLabel}
              </Button>
            ) : null;
          const actionButton = r.type === "code" ? codeButton : autoButton;
          return (
            <RuleShell
              key={`discount-${index}-${r.type}`}
              title={
                r.type === "code"
                  ? r.codeCampaignName?.trim() || ruleLabel
                  : r.campaignName?.trim() || ruleLabel
              }
              index={index}
              displayIndex={panelIndex}
              onRemove={() => rmDiscount(index)}
              summary={discountSummary(r, currencyCode)}
              icon={r.iconChoice}
              actions={actionButton}
              defaultOpen={!r.isNew}
              disableRemove={readOnly}
            >
              <BlockStack gap="200">
                <TriggerTypeTabs
                  value={triggerType}
                  disabled={readOnly}
                  onChange={(value) =>
                    updateDiscountRuleField(index, "triggerType", value)
                  }
                />

                <div
                  className={
                    showScopeInline
                      ? "rules-field-panel rules-field-panel--grid"
                      : "rules-field-panel rules-field-panel--inline"
                  }
                  style={
                    showScopeInline
                      ? {
                        gridTemplateColumns:
                          "132px 112px 142px",
                      }
                      : {
                      }
                  }
                >


                  {showTypeSelect && (
                    <Select
                      label="Type"
                      disabled={readOnly}
                      options={[
                        { label: "Automatic", value: "automatic" },
                        { label: "Code", value: "code" },
                      ]}
                      value={r.type}
                      onChange={(v) =>
                        setDiscountRules((x) =>
                          x.map((it, idx) =>
                            idx === index
                              ? {
                                ...it,
                                type: v,
                                condition:
                                  v === "code" ? "code" : "all_payments",
                                discountCode:
                                  v === "code"
                                    ? it.discountCode || DEFAULT_DISCOUNT_CODE
                                    : "",
                              }
                              : it
                          )
                        )
                      }
                    />
                  )}

                  {showValueTypeSelect && (
                    <Select
                      label="Discount type"
                      disabled={readOnly}
                      options={[
                        { label: "Percentage", value: "percent" },
                        { label: `Amount (${currencySymbol})`, value: "amount" },
                      ]}
                      value={valueType}
                      onChange={(value) =>
                        updateDiscountRuleField(index, "valueType", value)
                      }
                    />
                  )}

                  {r.type === "code" && (
                    <TextField
                      label="Discount code"
                      disabled={readOnly}
                      value={r.discountCode || DEFAULT_DISCOUNT_CODE}
                      onChange={(v) =>
                        setDiscountRules((x) =>
                          x.map((it, idx) =>
                            idx === index ? { ...it, discountCode: v } : it
                          )
                        )
                      }
                      autoComplete="off"
                    />
                  )}

                  <TextField
                    label={valueLabel}
                    disabled={readOnly}
                    value={r.value}
                    onChange={(v) =>
                      setDiscountRules((x) =>
                        x.map((it, idx) => (idx === index ? { ...it, value: v } : it))
                      )
                    }
                  />

                  {triggerType === "quantity" ? (
                    <TextField
                      label="Min quantity"
                      disabled={readOnly}
                      value={r.minQuantity || ""}
                      onChange={(v) =>
                        updateDiscountRuleField(index, "minQuantity", v)
                      }
                    />
                  ) : (
                    <TextField
                      label={`Min purchase (${currencySymbol})`}
                      disabled={readOnly}
                      value={r.minPurchase}
                      onChange={(v) =>
                        setDiscountRules((x) =>
                          x.map((it, idx) =>
                            idx === index ? { ...it, minPurchase: v } : it
                          )
                        )
                      }
                    />
                  )}
                </div>

                {showScopeInline && (
                  <Box style={{ maxWidth: 180 }}>
                    <Select
                      label="Scope"
                      disabled={readOnly}
                      options={[
                        { label: "All products", value: "all" },
                        { label: "Specific collections", value: "collections" },
                        { label: "Specific products", value: "products" },
                      ]}
                      value={r.scope || "all"}
                      onChange={(v) =>
                        setDiscountRules((x) =>
                          x.map((it, idx) => {
                            if (idx !== index) return it;
                            if (v === "collections")
                              return {
                                ...it,
                                scope: v,
                                appliesTo: { ...it.appliesTo, products: [] },
                              };
                            if (v === "products")
                              return {
                                ...it,
                                scope: v,
                                appliesTo: { ...it.appliesTo, collections: [] },
                              };
                            return {
                              ...it,
                              scope: v,
                              appliesTo: { products: [], collections: [] },
                            };
                          })
                        )
                      }
                    />
                  </Box>
                )}

                {showScopeInline && r.scope === "collections" && (
                  <ScopeResourcePickerControl
                    label="Select collections"
                    count={r.appliesTo?.collections?.length || 0}
                    onClick={() => setDiscountCollectionPickerIndex(index)}
                    disabled={readOnly}
                  />
                )}

                {showScopeInline && r.scope === "products" && (
                  <ScopeResourcePickerControl
                    label="Select products"
                    count={r.appliesTo?.products?.length || 0}
                    onClick={() => setDiscountProductPickerIndex(index)}
                    disabled={readOnly}
                  />
                )}

                {!showScopeInline && (
                  <InlineStack gap="200" wrap>
                    <Select
                      label="Scope"
                      disabled={readOnly}
                      options={[
                        { label: "All products", value: "all" },
                        { label: "Specific collections", value: "collections" },
                        { label: "Specific products", value: "products" },
                      ]}
                      value={r.scope || "all"}
                      onChange={(v) =>
                        setDiscountRules((x) =>
                          x.map((it, idx) => {
                            if (idx !== index) return it;

                            if (v === "collections")
                              return {
                                ...it,
                                scope: v,
                                appliesTo: { ...it.appliesTo, products: [] },
                              };

                            if (v === "products")
                              return {
                                ...it,
                                scope: v,
                                appliesTo: { ...it.appliesTo, collections: [] },
                              };

                            return {
                              ...it,
                              scope: v,
                              appliesTo: { products: [], collections: [] },
                            };
                          })
                        )
                      }
                    />

                    {r.scope === "collections" && (
                      <ScopeResourcePickerControl
                        label="Select collections"
                        count={r.appliesTo?.collections?.length || 0}
                        onClick={() => setDiscountCollectionPickerIndex(index)}
                        disabled={readOnly}
                      />
                    )}

                    {r.scope === "products" && (
                      <ScopeResourcePickerControl
                        label="Select products"
                        count={r.appliesTo?.products?.length || 0}
                        onClick={() => setDiscountProductPickerIndex(index)}
                        disabled={readOnly}
                      />
                    )}

                    {/* <Select
                      label="Rule icon"
                      disabled={readOnly}
                      options={ICON_OPTIONS}
                      value={r.iconChoice || "tag"}
                      onChange={(v) =>
                        setDiscountRules((x) =>
                          x.map((it, idx) => (idx === index ? { ...it, iconChoice: v } : it))
                        )
                      }
                    /> */}
                  </InlineStack>
                )}

                <RuleScheduleFields
                  startsAt={r.startsAt}
                  endsAt={r.endsAt}
                  disabled={readOnly}
                  onStartsAtChange={(value) =>
                    updateDiscountRuleField(index, "startsAt", value)
                  }
                  onEndsAtChange={(value) =>
                    updateDiscountRuleField(index, "endsAt", value)
                  }
                />
                <AdvancedRuleControls
                  rule={r}
                  disabled={readOnly}
                  onFieldChange={(field, value) =>
                    updateDiscountRuleField(index, field, value)
                  }
                  onTranslationChange={(locale, field, value) =>
                    updateRuleTranslation(setDiscountRules, index, locale, field, value)
                  }
                />

                <Divider />

                <InlineStack
                  gap="100"
                  className="rules-section-title"
                  style={{ marginBottom: 8 }}
                >
                  <svg viewBox="0 0 20 20" focusable="false" aria-hidden="true" width="20px" height="20px">
                    <path d="M15.747 2.354c.195-.196.512-.196.707 0l1.06 1.06c.196.195.196.512 0 .707l-.956.957-1.768-1.767.957-.957Z" />
                    <path d="m14.083 4.018 1.768 1.768-2.831 2.83c-.359.359-.84.568-1.348.585l-.772.025c-.144.005-.263-.113-.258-.258l.026-.772c.016-.507.225-.989.584-1.348l2.83-2.83Z" />
                    <path d="M5.5 5.75c0-.69.56-1.25 1.25-1.25h4.5c.414 0 .75-.336.75-.75s-.336-.75-.75-.75h-4.5c-1.519 0-2.75 1.231-2.75 2.75v8.5c0 1.519 1.231 2.75 2.75 2.75h6.5c1.519 0 2.75-1.231 2.75-2.75v-4.5c0-.414-.336-.75-.75-.75s-.75.336-.75.75v4.5c0 .69-.56 1.25-1.25 1.25h-6.5c-.69 0-1.25-.56-1.25-1.25v-8.5Z" />
                    <path d="M7.75 12.75c-.414 0-.75.336-.75.75s.336.75.75.75h2.5c.414 0 .75-.336.75-.75s-.336-.75-.75-.75h-2.5Z" />
                    <path d="M7 10.75c0-.414.336-.75.75-.75h4.5c.414 0 .75.336.75.75s-.336.75-.75.75h-4.5c-.414 0-.75-.336-.75-.75Z" />
                  </svg>
                  <Text as="h3" variant="headingSm" style={{ fontSize: 16, fontWeight: 600 }}>
                    Content Settings
                  </Text>
                </InlineStack>

                <BlockStack gap="200">
                  <InlineStack gap="200" align="stretch" wrap>
                    <Box style={{ flex: "1 1 100%" }}>
                      {renderTokenField(
                        `discount-before-${index}`,
                        "Text above preview (before the goal)",
                        beforeContentValue || "",
                        (value) =>
                          updateDiscountRuleField(
                            index,
                            beforeContentField,
                            value?.trim() ? value : null
                          ),
                        null,
                        { disabled: readOnly }
                      )}
                    </Box>

                    <Box style={{ flex: "1 1 100%" }}>
                      {renderTokenField(
                        `discount-after-${index}`,
                        "Text above preview (after the goal)",
                        afterContentValue || "",
                        (value) =>
                          updateDiscountRuleField(
                            index,
                            afterContentField,
                            value?.trim() ? value : null
                          ),
                        null,
                        { disabled: readOnly }
                      )}
                    </Box>
                  </InlineStack>

                  {showContentExtras && (
                    <InlineStack gap="200" align="stretch" wrap={false}>
                      <Box style={{ flex: "1 1 360px" }}>
                        {renderTokenField(
                          `discount-below-${index}`,
                          "Text below preview",
                          r.progressTextBelow ||
                            getDiscountContentDefaults(r.type).progressTextBelow,
                          (value) =>
                            updateDiscountRuleField(
                              index,
                              "progressTextBelow",
                              value?.trim() ? value : null
                            ),
                          null,
                          { disabled: readOnly }
                        )}
                      </Box>

                      <Box style={{ flex: "1 1 280px" }}>
                        <TextField
                          label="Campaign name"
                          disabled={readOnly}
                          value={r.campaignName || "Automatic Discounts"}
                          onChange={(value) =>
                            updateDiscountRuleField(
                              index,
                              "campaignName",
                              value?.trim() ? value : null
                            )
                          }
                        />
                      </Box>

                      <Box style={{ flex: "1 1 220px" }}>
                        <Select
                          label="Cart Step"
                          disabled={readOnly}
                          options={getCartStepOptions("discount", index)}
                          value={r.cartStepName || ""}
                          onChange={(value) =>
                            updateCartStepField("discount", index, value)
                          }
                        />
                      </Box>
                    </InlineStack>
                  )}

                  {!showContentExtras && r.type === "code" && (
                    <InlineStack gap="200" align="stretch" wrap={false}>
                      <Box style={{ flex: "1 1 360px" }}>
                        <TextField
                          label="Campaign name"
                          disabled={readOnly}
                          value={r.codeCampaignName ?? "Code Discount"}
                          onChange={(value) =>
                            updateDiscountRuleField(
                              index,
                              "codeCampaignName",
                              value
                            )
                          }
                          placeholder="Code Discount"
                        />
                      </Box>
                    </InlineStack>
                  )}

                </BlockStack>

                {showProgressPreview && (
                  <>
                    <Text as="h5" variant="headingXs">
                      Preview
                    </Text>

                    {(() => {
                      const sliderValue =
                        discountRuleSliderValues[index] ?? 50;
                      const sliderPercent = Math.min(1, Math.max(0, sliderValue / 100));
                      const previewGoalFromRule =
                        normalizeTriggerType(r.triggerType) === "quantity"
                          ? Number(r.minQuantity || 0)
                          : Number(r.minPurchase || 0);
                      const previewGoal = previewGoalFromRule > 0 ? previewGoalFromRule : 500;
                      const previewCurrentTotalFromSlider = sliderPercent * previewGoal;
                      const dynamicRemainingAmount = Math.max(0, previewGoal - previewCurrentTotalFromSlider);
                      const previewGoalText = formatTriggerPreviewValue(
                        r,
                        dynamicRemainingAmount,
                        currencyCode
                      );
                      const previewCurrentText = formatTriggerPreviewValue(
                        r,
                        previewCurrentTotalFromSlider,
                        currencyCode
                      );
                      const previewDiscountValueWithOff =
                        formatDiscountValueDisplay(r, currencyCode) || "Value";
                      const previewDiscountValue =
                        previewDiscountValueWithOff
                          .replace(/\s*off$/i, "")
                          .trim() || previewDiscountValueWithOff;
                      const previewTokens = {
                        goal: previewGoalText,
                        current_status: previewCurrentText,
                        discount: formatDiscountValueDisplay(r, currencyCode) || "Value",
                        discount_value: previewDiscountValue,
                        discount_value_with_off: previewDiscountValueWithOff,
                        discount_code: r.discountCode || "CODE",
                      };
                      const previewBeforeTemplate =
                        getProgressTextForTrigger(r, contentDefaults, "before");
                      const previewAfterTemplate =
                        getProgressTextForTrigger(r, contentDefaults, "after");
                      const previewBelowTemplate =
                        r.progressTextBelow ?? contentDefaults.progressTextBelow;
                      const renderedBeforeText = renderProgressText(
                        previewBeforeTemplate,
                        previewTokens
                      );
                      const previewAfterText = renderProgressText(
                        previewAfterTemplate,
                        previewTokens
                      );
                      const previewBelowText = renderProgressText(
                        previewBelowTemplate,
                        previewTokens
                      );
                      const isPreviewComplete = sliderPercent >= 1;
                      const previewHeaderText = isPreviewComplete
                        ? previewAfterText || renderedBeforeText
                        : renderedBeforeText;

                      const previewFillStyle = {
                        width: `${sliderPercent * 100}%`,
                        height: "100%",
                        background: progress || DEFAULT_STYLE_SETTINGS.progress,
                      };
                      const iconComplete = sliderPercent >= 1;
                      const previewIconStyle = {
                        position: "absolute",
                        right: 16,
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: iconComplete ? "#fff" : "#f3f4f6",
                        display: "grid",
                        placeItems: "center",
                        boxShadow: "0 6px 12px rgba(15,23,42,0.15)",
                        fontSize: 18,
                        color: iconComplete ? "#111827" : "#6b7280",
                        border: iconComplete
                          ? "1px solid rgba(59,130,246,0.3)"
                          : "1px solid rgba(148,163,184,0.3)",
                      };

                      return (
                        <div style={previewCardStyle}>
                          <div
                            style={{
                              marginBottom: 10,
                              fontSize: 18,
                              fontWeight: 700,
                              color: "#000000",
                            }}
                          >
                            {previewHeaderText}
                          </div>
                          <div style={previewTrackWrapperStyle}>
                            <div style={previewTrackStyle}>
                              <div style={previewFillStyle} />
                            </div>
                            <div style={previewIconStyle}>
                              {iconComplete ? (
                                <Icon source={CheckCircleIcon} color="success" />
                              ) : (
                                <Icon source={ICON_POLARIS[r.iconChoice || "tag"] || ICON_POLARIS.tag} />
                              )}
                            </div>
                          </div>
                          {previewBelowText && (
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "flex-end",
                                marginTop: 6,
                              }}
                            >
                              <Text tone="subdued" variant="bodySm">
                                {previewBelowText}
                              </Text>
                            </div>
                          )}
                          <div style={{ marginTop: 16 }}>
                            <Text tone="subdued" variant="bodySm">
                              Use this to adjust the preview
                            </Text>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={sliderValue}
                              onChange={(event) =>
                                updateDiscountRuleSlider(index, Number(event.target.value))
                              }
                              style={sliderInputStyle}
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}

                <InlineStack align="end">
                  <Button
                    size="slim"
                    variant="primary"
                    loading={saving}
                    onClick={() => handleSectionSave("discount", index)}
                  >
                    Save Rule
                  </Button>
                </InlineStack>
              </BlockStack>
            </RuleShell>
          );
        })}
      </BlockStack>
    );
  };

  const DiscountPanel = renderDiscountPanel(
    "Automatic Discounts",
    (rule) => rule.type !== "code",
    "Add automatic rule",
    "automatic",
    false,
    true,
    "Automatic Discount",
    true,
    true,
    false,
    canAddAutomaticDiscount,
    false
  );

  const DiscountCodePanel = renderDiscountPanel(
    "Discount Codes",
    (rule) => rule.type === "code",
    "Add code discount",
    "code",
    false,
    true,
    "Discount Code",
    false,
    false,
    false,
    canAddCodeDiscount,
    false
  );

  const freeReadOnly = false;

  const FreeProductPanel = (
    <BlockStack gap="200">
      <InlineStack align="space-between" blockAlign="center">
        <Text as="h4" variant="headingSm">
          Free Product & Quantity
        </Text>

        <InlineStack gap="200">
          <Button onClick={addFree} disabled={!canUseFreeGift}>
            Add Rule
          </Button>
        </InlineStack>
      </InlineStack>

      {freeRules.map((r, i) => {
        const triggerType = normalizeTriggerType(r.triggerType);
        const beforeContentField = getProgressTextFieldForTrigger(r, "before");
        const afterContentField = getProgressTextFieldForTrigger(r, "after");
        const beforeContentValue = getProgressTextForTrigger(
          r,
          DEFAULT_FREE_GIFT_CONTENT_TEXT,
          "before"
        );
        const afterContentValue = getProgressTextForTrigger(
          r,
          DEFAULT_FREE_GIFT_CONTENT_TEXT,
          "after"
        );
        const freeToggleLabel = r.enabled ? "Deactivate" : "Activate";
        const freeToggleButton = (
          <Button
            plain
            disabled={freeReadOnly}
            onClick={() => {
              if (freeReadOnly) return;
              const nextEnabled = !r.enabled;
              setFreeRules((x) =>
                x.map((it, idx) =>
                  idx === i ? { ...it, enabled: nextEnabled } : it
                )
              );
              void handleAutomaticDiscountToggle(
                { ...r, enabled: nextEnabled },
                nextEnabled,
                r.freeProductDiscountID
              );
            }}
          >
            {freeToggleLabel}
          </Button>
        );
        return (
          <RuleShell
            key={i}
            title={r.campaignName?.trim() ? r.campaignName : "Free Product Rule"}
            index={i}
            onRemove={() => rmFree(i)}
            summary={freeSummary(r, productsById, currencyCode)}
            icon={r.iconChoice}
            actions={freeToggleButton}
            defaultOpen={!r.isNew}
            disableRemove={freeReadOnly}
          >
            <BlockStack gap="200">
              <TriggerTypeTabs
                value={triggerType}
                amountLabel="Free product on Amount"
                quantityLabel="Free product on Quantity"
                disabled={freeReadOnly}
                onChange={(value) => updateFreeRuleField(i, "triggerType", value)}
              />

              <div
                className="rules-field-panel rules-field-panel--grid"
                style={{
                  gridTemplateColumns: "132px 76px 112px",
                }}
              >

                {triggerType === "quantity" ? (
                  <TextField
                    label="Min quantity"
                    disabled={freeReadOnly}
                    value={r.minQuantity || ""}
                    onChange={(v) => updateFreeRuleField(i, "minQuantity", v)}
                  />
                ) : (
                  <TextField
                    label={`Min purchase (${currencySymbol})`}
                    disabled={freeReadOnly}
                    value={r.minPurchase}
                    onChange={(v) =>
                      setFreeRules((x) =>
                        x.map((it, idx) =>
                          idx === i ? { ...it, minPurchase: v } : it
                        )
                      )
                    }
                  />
                )}

                <TextField
                  label="Qty"
                  disabled={freeReadOnly}
                  value={r.qty}
                  onChange={(v) =>
                    setFreeRules((x) =>
                      x.map((it, idx) => (idx === i ? { ...it, qty: v } : it))
                    )
                  }
                />


                <TextField
                  label="Limit per order"
                  disabled={freeReadOnly}
                  value={r.limit}
                  onChange={(v) =>
                    setFreeRules((x) =>
                      x.map((it, idx) => (idx === i ? { ...it, limit: v } : it))
                    )
                  }
                />
              </div>

              <Box className="rules-field-panel" style={{ maxWidth: 420 }}>
                <Text as="h6" variant="bodySm">
                  Gift Product
                </Text>

                <InlineStack gap="200" blockAlign="center">
                  <Button
                    onClick={() => setGiftPicker({ open: true, index: i })}
                    disabled={freeReadOnly}
                  >
                    Select product
                  </Button>

                  {r.bonus ? (
                    <Badge tone="success">
                      {productsById[r.bonus]?.title || "Selected product"}
                    </Badge>
                  ) : (
                    <Badge tone="attention">Not selected</Badge>
                  )}

                  {r.bonus && (
                    <Button
                      tone="critical"
                      variant="plain"
                      disabled={freeReadOnly}
                      onClick={() =>
                        setFreeRules((x) =>
                          x.map((it, idx) =>
                            idx === i ? { ...it, bonus: "" } : it
                          )
                        )
                      }
                    >
                      Clear
                    </Button>
                  )}
                </InlineStack>
              </Box>
              <RuleScheduleFields
                startsAt={r.startsAt}
                endsAt={r.endsAt}
                disabled={freeReadOnly}
                onStartsAtChange={(value) =>
                  updateFreeRuleField(i, "startsAt", value)
                }
                onEndsAtChange={(value) =>
                  updateFreeRuleField(i, "endsAt", value)
                }
              />
              <AdvancedRuleControls
                rule={r}
                disabled={freeReadOnly}
                onFieldChange={(field, value) =>
                  updateFreeRuleField(i, field, value)
                }
                onTranslationChange={(locale, field, value) =>
                  updateRuleTranslation(setFreeRules, i, locale, field, value)
                }
              />
              <Divider />

              <InlineStack
                gap="100"
                style={{
                  marginBottom: 8,
                }}
                className="rules-section-title"
              >
                <svg
                  viewBox="0 0 20 20"
                  focusable="false"
                  aria-hidden="true"
                  width="20px"
                  height="20px"
                >
                  <path d="M15.747 2.354c.195-.196.512-.196.707 0l1.06 1.06c.196.195.196.512 0 .707l-.956.957-1.768-1.767.957-.957Z" />
                  <path d="m14.083 4.018 1.768 1.768-2.831 2.83c-.359.359-.84.568-1.348.585l-.772.025c-.144.005-.263-.113-.258-.258l.026-.772c.016-.507.225-.989.584-1.348l2.83-2.83Z" />
                  <path d="M5.5 5.75c0-.69.56-1.25 1.25-1.25h4.5c.414 0 .75-.336.75-.75s-.336-.75-.75-.75h-4.5c-1.519 0-2.75 1.231-2.75 2.75v8.5c0 1.519 1.231 2.75 2.75 2.75h6.5c1.519 0 2.75-1.231 2.75-2.75v-4.5c0-.414-.336-.75-.75-.75s-.75.336-.75.75v4.5c0 .69-.56 1.25-1.25 1.25h-6.5c-.69 0-1.25-.56-1.25-1.25v-8.5Z" />
                  <path d="M7.75 12.75c-.414 0-.75.336-.75.75s.336.75.75.75h2.5c.414 0 .75-.336.75-.75s-.336-.75-.75-.75h-2.5Z" />
                  <path d="M7 10.75c0-.414.336-.75.75-.75h4.5c.414 0 .75.336.75.75s-.336.75-.75.75h-4.5c-.414 0-.75-.336-.75-.75Z" />
                </svg>
                <Text
                  as="h3"
                  variant="headingSm"
                  style={{ fontSize: 16, fontWeight: 600 }}
                >
                  Content Settings
                </Text>
              </InlineStack>

              <BlockStack gap="200">
                <Box style={{ flex: "1 1 100%" }}>
                  {renderTokenField(
                    `free-before-${i}`,
                    "Text above preview (before the goal)",
                    beforeContentValue || "",
                    (value) =>
                      updateFreeRuleField(
                        i,
                        beforeContentField,
                        value?.trim() ? value : null
                      ),
                    null,
                    { disabled: freeReadOnly }
                  )}
                </Box>

                <Box style={{ flex: "1 1 100%" }}>
                  {renderTokenField(
                    `free-after-${i}`,
                    "Text above preview (after the goal)",
                    afterContentValue || "",
                    (value) =>
                      updateFreeRuleField(
                        i,
                        afterContentField,
                        value?.trim() ? value : null
                      ),
                    null,
                    { disabled: freeReadOnly }
                  )}
                </Box>

                <InlineStack gap="200" align="stretch" wrap={false}>
                  <Box style={{ flex: "1 1 360px" }}>
                    {renderTokenField(
                      `free-below-${i}`,
                      "Text below preview",
                      r.progressTextBelow || "",
                      (value) =>
                        updateFreeRuleField(
                          i,
                          "progressTextBelow",
                          value?.trim() ? value : null
                        ),
                      null,
                      { disabled: freeReadOnly }
                    )}
                  </Box>

                  <Box style={{ flex: "1 1 280px" }}>
                    <TextField
                      label="Campaign name"
                      disabled={freeReadOnly}
                      value={r.campaignName || "Free Product Rule"}
                      onChange={(value) =>
                        updateFreeRuleField(
                          i,
                          "campaignName",
                          value?.trim() ? value : null
                        )
                      }
                    />
                  </Box>

                  <Box style={{ flex: "1 1 220px" }}>
                    <Select
                      label="Cart Step"
                      disabled={freeReadOnly}
                      options={getCartStepOptions("free", i)}
                      value={r.cartStepName || ""}
                      onChange={(value) =>
                        updateCartStepField("free", i, value)
                      }
                    />
                  </Box>
                </InlineStack>
              </BlockStack>

              <InlineStack align="end">
                <Button
                  size="slim"
                  variant="primary"
                  loading={saving}
                  onClick={() => handleSectionSave("free", i)}
                >
                  Save Rule
                </Button>
              </InlineStack>
            </BlockStack>
          </RuleShell>
        );
      })}

      {/* <InlineStack align="end">
        <Button loading={saving} onClick={() => handleSectionSave("free")}>
          Save Free Gift Rules
        </Button>
      </InlineStack> */}

      <ResourcePickerModal
        open={giftPicker.open}
        onClose={() => setGiftPicker({ open: false, index: null })}
        title="Add products"
        items={productPickerItems}
        multi={false}
        selected={
          giftPicker.index === null || !freeRules[giftPicker.index]?.bonus
            ? []
            : [
              productsById[freeRules[giftPicker.index]?.bonus]?.id ||
              freeRules[giftPicker.index]?.bonus,
            ]
        }
        onApply={(value) => {
          if (giftPicker.index === null) return;

          const nextBonus = productsById[value]?.variantId || value || "";

          setFreeRules((rules) =>
            rules.map((rule, idx) =>
              idx === giftPicker.index ? { ...rule, bonus: nextBonus } : rule
            )
          );
        }}
        emptyText="No products available."
        kindLabel="products"
      />
    </BlockStack>
  );

  const bxgyScopeOptions = [
    { label: "Specific Products", value: "product" },

    { label: "Specific Collections", value: "collection" },

    { label: "Whole Store", value: "store" },
  ];

  const bxgyReadOnly = false;

  const BxgyPanel = (
    <React.Fragment>
      <BlockStack gap="200">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h4" variant="headingSm">
            Buy X Get Y (BXGY)
          </Text>

          <InlineStack gap="200">
            <Button onClick={addBxgy} disabled={!canUseBxgy}>
              Add Rule
            </Button>
          </InlineStack>
        </InlineStack>

        {bxgyRules.map((r, i) => {
          const isProductScope = r.scope === "product";
          const isCollectionScope = r.scope === "collection";
          const showScopePickerControls = isProductScope || isCollectionScope;
          const scopeSelectionCount = isProductScope
            ? r.appliesTo?.products?.length ?? 0
            : isCollectionScope
              ? r.appliesTo?.collections?.length ?? 0
              : 0;
          const handleScopePickerOpen = () => {
            if (isProductScope) {
              setBxgyProductPickerIndex(i);
            } else if (isCollectionScope) {
              setBxgyCollectionPickerIndex(i);
            }
          };
          const bxgyToggleLabel = r.enabled ? "Deactivate" : "Activate";
          const bxgyToggleButton = (
            <Button
              plain
              disabled={bxgyReadOnly}
              onClick={() => {
                if (bxgyReadOnly) return;
                const nextEnabled = !r.enabled;
                setBxgyRules((x) =>
                  x.map((it, idx) =>
                    idx === i ? { ...it, enabled: nextEnabled } : it
                  )
                );
                void handleAutomaticDiscountToggle(
                  { ...r, enabled: nextEnabled, type: "bxgy" },
                  nextEnabled,
                  r.buyxgetyId
                );
              }}
            >
              {bxgyToggleLabel}
            </Button>
          );
          return (
            <RuleShell
              key={i}
              title={r.campaignName?.trim() ? r.campaignName : "BXGY Rule"}
              index={i}
              onRemove={() => rmBxgy(i)}
              summary={bxgySummary(r)}
              icon={r.iconChoice}
              actions={bxgyToggleButton}
              defaultOpen={!r.isNew}
              disableRemove={bxgyReadOnly}
            >
              <BlockStack gap="200">
                <div className="rules-field-panel">
                  <BlockStack gap="200">
                    <div
                      className="rules-field-panel--grid"
                      style={{
                        gridTemplateColumns:
                          "minmax(130px, 200px) minmax(130px, 200px) minmax(140px, 300px)",
                      }}
                    >

                      <TextField
                        label="Buy (X qty)"
                        disabled={bxgyReadOnly}
                        value={r.xQty}
                        onChange={(v) =>
                          setBxgyRules((x) =>
                            x.map((it, idx) => (idx === i ? { ...it, xQty: v } : it))
                          )
                        }
                      />

                      <TextField
                        label="Get (Y qty)"
                        disabled={bxgyReadOnly}
                        value={r.yQty}
                        onChange={(v) =>
                          setBxgyRules((x) =>
                            x.map((it, idx) => (idx === i ? { ...it, yQty: v } : it))
                          )
                        }
                      />
                       <TextField
                          label="Max Uses Per Order"
                          disabled={bxgyReadOnly}
                          value={r.maxGifts}
                          onChange={(v) =>
                            setBxgyRules((x) =>
                              x.map((it, idx) =>
                                idx === i ? { ...it, maxGifts: v } : it
                              )
                            )
                          }
                        />
                    </div>

                    <InlineStack gap="200" align="start" wrap>
                      <Select
                        label="Scope"
                        disabled={bxgyReadOnly}
                        options={bxgyScopeOptions}
                        value={r.scope}
                        onChange={(v) => {
                          if (bxgyReadOnly) return;
                          setBxgyRules((x) =>
                            x.map((it, idx) =>
                              idx === i
                                ? {
                                  ...it,
                                  scope: v,
                                  appliesTo:
                                    v === "product"
                                      ? { ...it.appliesTo, collections: [] }
                                      : v === "collection"
                                        ? { ...it.appliesTo, products: [] }
                                        : {
                                          ...it.appliesTo,
                                          products: allProductIds,
                                          collections: [],
                                        },
                                }
                                : it
                            )
                          );

                          if (!bxgyScopeValidation[i]) return;

                          setBxgyScopeValidation((prev) => {
                            if (!prev[i]) return prev;

                            const next = { ...prev };

                            delete next[i];

                            return next;
                          });
                        }}
                        error={bxgyScopeValidation[i]}
                      />

                      {showScopePickerControls && (
                        <ScopeResourcePickerControl
                          label={
                            isProductScope
                              ? "Select products"
                              : "Select collections"
                          }
                          count={scopeSelectionCount}
                          onClick={handleScopePickerOpen}
                          disabled={bxgyReadOnly}
                          error={bxgySelectionValidation[i]}
                        />
                      )}

                  {/* <Select
                    label="Rule icon"
                    disabled={bxgyReadOnly}
                    options={ICON_OPTIONS}
                    value={r.iconChoice || "sparkles"}
                    onChange={(v) =>
                      setBxgyRules((x) =>
                        x.map((it, idx) =>
                          idx === i ? { ...it, iconChoice: v } : it
                        )
                      )
                    }
                  /> */}
                    </InlineStack>
                  </BlockStack>
                </div>

                <RuleScheduleFields
                  startsAt={r.startsAt}
                  endsAt={r.endsAt}
                  disabled={bxgyReadOnly}
                  onStartsAtChange={(value) =>
                    updateBxgyRuleField(i, "startsAt", value)
                  }
                  onEndsAtChange={(value) =>
                    updateBxgyRuleField(i, "endsAt", value)
                  }
                />
                <AdvancedRuleControls
                  rule={r}
                  disabled={bxgyReadOnly}
                  onFieldChange={(field, value) =>
                    updateBxgyRuleField(i, field, value)
                  }
                  onTranslationChange={(locale, field, value) =>
                    updateRuleTranslation(setBxgyRules, i, locale, field, value)
                  }
                />

                <Divider />

                {r.scope === "product" && products.length === 0 && (
                  <Banner tone="info" title="Products not loaded">
                    <p>Use the Products picker to sync items.</p>
                  </Banner>
                )}

                {r.scope === "collection" && collections.length === 0 && (
                  <Banner tone="warning" title="Collections not available">
                    <p>Collections API response was empty.</p>
                  </Banner>
                )}

                <Divider />

                <InlineStack
                  gap="100"
                  style={{
                    marginBottom: 8,
                  }}
                  className="rules-section-title"
                >
                  <svg
                    viewBox="0 0 20 20"
                    focusable="false"
                    aria-hidden="true"
                    width="20px"
                    height="20px"
                  >
                    <path d="M5.2 11.2c0-.66.54-1.2 1.2-1.2h7.2c.66 0 1.2.54 1.2 1.2v1.6c0 .66-.54 1.2-1.2 1.2h-7.2c-.66 0-1.2-.54-1.2-1.2v-1.6Z" />
                  </svg>
                  <Text
                    as="h3"
                    variant="headingSm"
                    style={{ fontSize: 16, fontWeight: 600 }}
                  >
                    Content Settings
                  </Text>
                </InlineStack>

                <BlockStack gap="200">
                  <InlineStack gap="200" align="stretch" wrap={false}>
                    <Box style={{ flex: "1 1 360px" }}>
                      {renderTokenField(
                        `bxgy-before-${i}`,
                        "Before Offer Unlock Message",
                        r.beforeOfferUnlockMessage || "",
                        (value) =>
                          setBxgyRules((x) =>
                            x.map((it, idx) =>
                              idx === i
                                ? {
                                  ...it,
                                  beforeOfferUnlockMessage: value?.trim()
                                    ? value
                                    : null,
                                }
                                : it
                            )
                          ),
                        "Use {{x}} and {{y}} to mention quantities.",
                        { showTokenButton: false, disabled: bxgyReadOnly }
                      )}
                    </Box>
                    <Box style={{ flex: "1 1 360px" }}>
                      {renderTokenField(
                        `bxgy-after-${i}`,
                        "After Offer Unlock Message",
                        r.afterOfferUnlockMessage || "",
                        (value) =>
                          setBxgyRules((x) =>
                            x.map((it, idx) =>
                              idx === i
                                ? {
                                  ...it,
                                  afterOfferUnlockMessage: value?.trim()
                                    ? value
                                    : null,
                                }
                                : it
                            )
                          ),
                        "Celebrate the customer once they unlock the offer.",
                        { showTokenButton: false, disabled: bxgyReadOnly }
                      )}
                    </Box>
                  </InlineStack>
                </BlockStack>

                <InlineStack gap="200" align="stretch" wrap={false}>
                  <Box style={{ flex: "1 1 360px" }}>
                    <TextField
                      label="Campaign name"
                      disabled={bxgyReadOnly}
                      value={r.campaignName || "BXGY Rule"}
                      onChange={(value) =>
                        updateBxgyRuleField(
                          i,
                          "campaignName",
                          value?.trim() ? value : null
                        )
                      }
                    />
                  </Box>
                </InlineStack>

                <InlineStack align="end">
                  <Button
                    size="slim"
                    variant="primary"
                    loading={saving}
                    onClick={() => handleSectionSave("bxgy", i)}
                  >
                    Save Rule
                  </Button>
                </InlineStack>
              </BlockStack>
            </RuleShell>
          );
        })}

      </BlockStack>


      <ResourcePickerModal
        open={bxgyProductPickerIndex !== null}
        onClose={() => setBxgyProductPickerIndex(null)}
        title="Add products"
        items={productPickerItems}
        selected={
          bxgyProductPickerIndex === null
            ? []
            : bxgyRules[bxgyProductPickerIndex]?.appliesTo?.products || []
        }
        onApply={(values) => {
          if (bxgyProductPickerIndex === null) return;

          setBxgyRules((prev) =>
            prev.map((rule, idx) =>
              idx === bxgyProductPickerIndex
                ? {
                  ...rule,

                  appliesTo: { ...rule.appliesTo, products: values },
                }
                : rule
            )
          );

          setBxgySelectionValidation((prev) => {
            if (!prev[bxgyProductPickerIndex]) return prev;

            const next = { ...prev };

            delete next[bxgyProductPickerIndex];

            return next;
          });
        }}
        emptyText="No products available."
        kindLabel="products"
      />

      <ResourcePickerModal
        open={bxgyCollectionPickerIndex !== null}
        onClose={() => setBxgyCollectionPickerIndex(null)}
        title="Add collections"
        items={collectionPickerItems}
        selected={
          bxgyCollectionPickerIndex === null
            ? []
            : bxgyRules[bxgyCollectionPickerIndex]?.appliesTo?.collections || []
        }
        onApply={(values) => {
          if (bxgyCollectionPickerIndex === null) return;

          setBxgyRules((prev) =>
            prev.map((rule, idx) =>
              idx === bxgyCollectionPickerIndex
                ? {
                  ...rule,

                  appliesTo: { ...rule.appliesTo, collections: values },
                }
                : rule
            )
          );

          setBxgySelectionValidation((prev) => {
            if (!prev[bxgyCollectionPickerIndex]) return prev;

            const next = { ...prev };

            delete next[bxgyCollectionPickerIndex];

            return next;
          });
        }}
        emptyText="No collections available."
        kindLabel="collections"
      />
    </React.Fragment>
  );

  const upsellSelectedProducts = React.useMemo(
    () =>
      upsellProductIds
        .map((id) => productsById[id])
        .filter(Boolean),
    [upsellProductIds, productsById]
  );

  const upsellSelectedCollections = React.useMemo(
    () =>
      upsellCollectionIds
        .map((id) => collectionsById[id])
        .filter(Boolean),
    [upsellCollectionIds, collectionsById]
  );

  const unresolvedUpsellProductIds = React.useMemo(
    () => upsellProductIds.filter((id) => !productsById[id]),
    [upsellProductIds, productsById]
  );

  const unresolvedUpsellCollectionIds = React.useMemo(
    () => upsellCollectionIds.filter((id) => !collectionsById[id]),
    [upsellCollectionIds, collectionsById]
  );

  const getVariantLabel = React.useCallback((item) => {
    const options = Array.isArray(item?.variantOptions)
      ? item.variantOptions
      : [];
    const sizeOpt = options.find(
      (opt) => String(opt?.name || "").toLowerCase() === "size"
    );
    return sizeOpt?.value ? String(sizeOpt.value) : "";
  }, []);

  const formatPreviewPrice = React.useCallback(
    (value, fallback = 25) => {
      const cleaned = String(value ?? "").replace(/[^0-9.-]/g, "");
      const num = Number(cleaned);
      const safe = Number.isFinite(num) && num > 0 ? num : fallback;
      return formatCurrency(safe, currencyCode);
    },
    [currencyCode]
  );

  const upsellPreviewItems = React.useMemo(() => {
    const productItems =
      upsellProductIds.length > 0
        ? upsellProductIds.map((id, idx) => {
            const p = productsById[id];
            if (!p) {
              return {
                title: `Saved product ${String(id).split("/").pop() || idx + 1}`,
                price: formatPreviewPrice(null, 25),
                option: "",
                image: "",
              };
            }
            return {
              title: p.title || "Product",
              price: formatPreviewPrice(p.price, 25),
              option: getVariantLabel(p),
              image: p.image || "",
            };
          })
        : [];

    const collectionProducts = upsellSelectedCollections.flatMap((c) =>
      Array.isArray(c?.products) ? c.products : []
    );
    const collectionItems =
      collectionProducts.length > 0
        ? collectionProducts.map((p) => ({
            title: p.title || "Product",
            price: formatPreviewPrice(p.price, 25),
            option: getVariantLabel(p),
            image: p.image || "",
          }))
        : [];

    const modeItems =
      upsellMode === "product"
        ? productItems
        : upsellMode === "collection"
          ? collectionItems
          : [];

    const base = modeItems.length
      ? modeItems
      : [
          {
            title: "Product 1",
            price: formatPreviewPrice(null, 25),
            option: "Color",
            image: "",
          },
          {
            title: "Product 2",
            price: formatPreviewPrice(null, 40),
            option: "Size",
            image: "",
          },
        ];

    if (base.length === 1) {
      return [
        base[0],
        {
          title: "Product 2",
          price: formatPreviewPrice(null, 40),
          option: "Size",
          image: "",
        },
      ];
    }

    return base;
  }, [
    upsellMode,
    upsellProductIds,
    productsById,
    upsellSelectedCollections,
    getVariantLabel,
    formatPreviewPrice,
  ]);

  React.useEffect(() => {
    setUpsellPreviewIndex(0);
  }, [upsellMode, upsellPreviewItems.length]);

  React.useEffect(() => {
    if (!upsellShowAsSlider || !upsellAutoplay) return;
    if (upsellPreviewItems.length <= 1) return;

    const timer = setInterval(() => {
      setUpsellPreviewIndex((prev) =>
        prev + 1 >= upsellPreviewItems.length ? 0 : prev + 1
      );
    }, 3000);

    return () => clearInterval(timer);
  }, [upsellShowAsSlider, upsellAutoplay, upsellPreviewItems.length]);

  const handleUpsellPrev = React.useCallback(() => {
    if (!upsellShowAsSlider || upsellPreviewItems.length <= 1) return;
    setUpsellPreviewIndex((prev) =>
      prev - 1 < 0 ? upsellPreviewItems.length - 1 : prev - 1
    );
  }, [upsellShowAsSlider, upsellPreviewItems.length]);

  const handleUpsellNext = React.useCallback(() => {
    if (!upsellShowAsSlider || upsellPreviewItems.length <= 1) return;
    setUpsellPreviewIndex((prev) =>
      prev + 1 >= upsellPreviewItems.length ? 0 : prev + 1
    );
  }, [upsellShowAsSlider, upsellPreviewItems.length]);
  const upsellArrowButtonSize = 30;
  const upsellPreviewSidePadding = upsellShowAsSlider ? 38 : 0;

  const UpsellPanel = (
    <React.Fragment>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: 16,
          alignItems: "start",
        }}
      >
        <Card>
          <Box padding="100">
            <BlockStack gap="200">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h4" variant="headingSm">
                  Upsell Product
                </Text>
              </InlineStack>

              <InlineStack gap="200" wrap>
                 <Checkbox
                  label="Enable"
                  checked={upsellEnabled}
                  onChange={setUpsellEnabled}
                />
                <Checkbox
                  label="Show as Slider (Carousel)"
                  checked={upsellShowAsSlider}
                  onChange={setUpsellShowAsSlider}
                />
                {upsellShowAsSlider && (
                  <Checkbox
                    label="Autoplay"
                    checked={upsellAutoplay}
                    onChange={setUpsellAutoplay}
                  />
                )}
              </InlineStack>
              <InlineStack gap="400" wrap>
                <TextField
                  label='Section Title'
                  value={upsellSectionTitle}
                  onChange={setUpsellSectionTitle}
                  autoComplete="off"
                />

                <TextField
                  label='Button Text'
                  value={upsellButtonText}
                  onChange={setUpsellButtonText}
                  autoComplete="off"
                />
              </InlineStack>
              <InlineStack gap="400" wrap>
                <ColorField
                  label="Background"
                  value={upsellBgColor}
                  onChange={setUpsellBgColor}
                />
                <ColorField
                  label="Text color"
                  value={upsellTextColor}
                  onChange={setUpsellTextColor}
                />
                <ColorField
                  label="Button Color"
                  value={upsellButtonColor}
                  onChange={setUpsellButtonColor}
                />
                <ColorField
                  label="Border Color"
                  value={upsellBorderColor}
                  onChange={setUpsellBorderColor}
                />
                <ColorField
                  label="Slider Arrow Color"
                  value={upsellArrowColor}
                  onChange={setUpsellArrowColor}
                />
              </InlineStack>

              <Divider />

              <BlockStack gap="200">
                <Text as="h3" variant="bodyMd" fontWeight="semibold">
                  Recommendation mode
                </Text>
                <InlineStack gap="400" wrap>
                  <RadioButton
                    label="Auto"
                    checked={upsellMode === "auto"}
                    name="upsell-recommendation-mode"
                    onChange={() => setUpsellMode("auto")}
                  />
                  <RadioButton
                    label="Select Product"
                    checked={upsellMode === "product"}
                    name="upsell-recommendation-mode"
                    onChange={() => setUpsellMode("product")}
                  />
                  <RadioButton
                    label="Select Collection"
                    checked={upsellMode === "collection"}
                    name="upsell-recommendation-mode"
                    onChange={() => setUpsellMode("collection")}
                  />
                </InlineStack>
              </BlockStack>

              {upsellMode === "product" && (
                <BlockStack gap="200">
                  {products.length === 0 && (
                    <Banner tone="info" title="Products not loaded">
                      <p>Use the Products picker to sync items.</p>
                    </Banner>
                  )}

                  <InlineStack gap="100" align="start">
                    <Button
                      size="slim"
                      onClick={() => setUpsellProductPickerOpen(true)}
                      disabled={products.length === 0}
                    >
                      Choose products
                    </Button>
                    <Badge tone={upsellProductIds.length ? "success" : "warning"}>
                      {upsellProductIds.length
                        ? `${upsellProductIds.length} selected`
                        : "None selected"}
                    </Badge>
                  </InlineStack>

                  {(upsellSelectedProducts.length > 0 ||
                    unresolvedUpsellProductIds.length > 0) && (
                    <InlineStack gap="100" wrap>
                      {upsellSelectedProducts.map((item) => (
                        <Badge key={item.id}>{item.title}</Badge>
                      ))}
                      {unresolvedUpsellProductIds.map((id) => (
                        <Badge key={`upsell-product-${id}`} tone="info">
                          Saved product {String(id).split("/").pop()}
                        </Badge>
                      ))}
                    </InlineStack>
                  )}
                </BlockStack>
              )}

              {upsellMode === "collection" && (
                <BlockStack gap="200">
                  {collections.length === 0 && (
                    <Banner tone="warning" title="Collections not available">
                      <p>Collections API response was empty.</p>
                    </Banner>
                  )}

                  <InlineStack gap="100" align="start">
                    <Button
                      size="slim"
                      onClick={() => setUpsellCollectionPickerOpen(true)}
                      disabled={collections.length === 0}
                    >
                      Choose collections
                    </Button>
                    <Badge
                      tone={upsellCollectionIds.length ? "success" : "warning"}
                    >
                      {upsellCollectionIds.length
                        ? `${upsellCollectionIds.length} selected`
                        : "None selected"}
                    </Badge>
                  </InlineStack>

                  {(upsellSelectedCollections.length > 0 ||
                    unresolvedUpsellCollectionIds.length > 0) && (
                    <InlineStack gap="100" wrap>
                      {upsellSelectedCollections.map((item) => (
                        <Badge key={item.id}>{item.title}</Badge>
                      ))}
                      {unresolvedUpsellCollectionIds.map((id) => (
                        <Badge key={`upsell-collection-${id}`} tone="info">
                          Saved collection {String(id).split("/").pop()}
                        </Badge>
                      ))}
                    </InlineStack>
                  )}
                </BlockStack>
              )}
              <InlineStack align="end">
                <Button
                  variant="primary"
                  loading={saving}
                  onClick={() => handleSectionSave("upsell")}
                >
                  Save Upsell Settings
                </Button>
              </InlineStack>
            </BlockStack>
          </Box>
        </Card>
          
        <Card>
          <Box padding="200">
            <BlockStack gap="200">
              <Text as="h5" variant="headingXs">
                Preview
              </Text>
              <Box
                borderWidth="1"
                borderRadius="200"
                background="bg-surface"
                style={{
                  borderColor: upsellBorderColor,
                  background: "#ffffff",
                  width: "100%",
                  maxWidth: 560,
                  marginInline: "auto",
                }}
              >
                <BlockStack gap="200">
                  <InlineStack align="center" blockAlign="center">
                    <Text
                      as="h3"
                      variant="headingSm"
                      style={{ color: upsellTextColor }}
                    >
                      {upsellSectionTitle}
                    </Text>
                  </InlineStack>

                  <div
                    className="upsell-carousel"
                    style={{
                      position: "relative",
                      padding: upsellShowAsSlider
                        ? `0 ${upsellPreviewSidePadding}px`
                        : 0,
                      overflow: "hidden",
                    }}
                  >
                    {upsellShowAsSlider && (
                      <React.Fragment>
                        <button
                          type="button"
                          onClick={handleUpsellPrev}
                          aria-label="Previous"
                          style={{
                            position: "absolute",
                            left: 2,
                            top: "50%",
                            transform: "translateY(-50%)",
                            width: upsellArrowButtonSize,
                            height: upsellArrowButtonSize,
                            borderRadius: 999,
                            border: `1px solid ${upsellBorderColor}`,
                            display: "grid",
                            placeItems: "center",
                            padding: 0,
                            lineHeight: 1,
                            fontSize: 18,
                            color: upsellArrowColor,
                            fontWeight: 700,
                            background: "#ffffff",
                            cursor: "pointer",
                            zIndex: 2,
                          }}
                        >
                          &#x2039;
                        </button>
                        <button
                          type="button"
                          onClick={handleUpsellNext}
                          aria-label="Next"
                          style={{
                            position: "absolute",
                            right: 2,
                            top: "50%",
                            transform: "translateY(-50%)",
                            width: upsellArrowButtonSize,
                            height: upsellArrowButtonSize,
                            borderRadius: 999,
                            border: `1px solid ${upsellBorderColor}`,
                            display: "grid",
                            placeItems: "center",
                            padding: 0,
                            lineHeight: 1,
                            fontSize: 18,
                            color: upsellArrowColor,
                            fontWeight: 700,
                            background: "#ffffff",
                            cursor: "pointer",
                            zIndex: 2,
                          }}
                        >
                          &#x203A;
                        </button>
                      </React.Fragment>
                    )}
                    <div
                      style={{
                        border: `1px solid ${upsellBorderColor}`,
                        borderRadius: 4,
                        background: upsellBgColor,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        className="upsell-carousel-track"
                        style={
                          upsellShowAsSlider
                            ? {
                                width: "100%",
                                transform: `translate3d(-${upsellPreviewIndex * 100}%, 0, 0)`,
                                transition:
                                  "transform 520ms cubic-bezier(0.22, 1, 0.36, 1)",
                                willChange: "transform",
                                gap: 0,
                              }
                            : {
                                width: "100%",
                                flexDirection: "column",
                                transform: "none",
                              }
                        }
                      >
                        {upsellPreviewItems.map((item, idx) => (
                          <div
                            key={`${item.title}-${idx}`}
                            style={{
                              flex: upsellShowAsSlider ? "0 0 100%" : "0 0 auto",
                              padding: "12px 14px",
                              boxSizing: "border-box",
                              width: "100%",
                              display: "grid",
                              gridTemplateColumns: "68px minmax(0, 1fr) auto",
                              gap: 14,
                              alignItems: "start",
                              minWidth: 0,
                            }}
                          >
                            <div
                              style={{
                                width: 68,
                                height: 68,
                                borderRadius: 4,
                                background: "#EEF2F7",
                                overflow: "hidden",
                                justifySelf: "center",
                                display: "grid",
                                placeItems: "center",
                              }}
                            >
                              {item.image ? (
                                <img
                                  src={item.image}
                                  alt=""
                                  width={64}
                                  height={64}
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                  }}
                                />
                              ) : null}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <Text
                                as="span"
                                variant="bodyMd"
                                style={{
                                  display: "block",
                                  fontWeight: 600,
                                  color: upsellTextColor,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {item.title}
                              </Text>
                              <div style={{ marginTop: 8 }}>
                                <div
                                  style={{
                                    padding: "8px 14px",
                                    borderRadius: 4,
                                    background: upsellButtonColor,
                                    border: `1px solid ${upsellBorderColor}`,
                                    color: upsellTextColor,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 6,
                                    whiteSpace: "nowrap",
                                    justifyContent: "center",
                                  }}
                                >
                                  +
                                  <span>{upsellButtonText}</span>
                                </div>
                              </div>
                            </div>
                            <Text
                              as="span"
                              variant="bodyMd"
                              style={{
                                fontWeight: 700,
                                color: upsellTextColor,
                                fontSize: 18,
                                lineHeight: 1.2,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {formatPreviewPrice(item?.price, 25)}
                            </Text>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </BlockStack>
              </Box>
            </BlockStack>
          </Box>
        </Card>
      </div>

      <ResourcePickerModal
        open={upsellProductPickerOpen}
        onClose={() => setUpsellProductPickerOpen(false)}
        title="Select upsell products"
        items={productPickerItems}
        selected={upsellProductIds}
        onApply={(values) => setUpsellProductIds(values)}
        emptyText="No products available."
        kindLabel="products"
      />

      <ResourcePickerModal
        open={upsellCollectionPickerOpen}
        onClose={() => setUpsellCollectionPickerOpen(false)}
        title="Select upsell collections"
        items={collectionPickerItems}
        selected={upsellCollectionIds}
        onApply={(values) => setUpsellCollectionIds(values)}
        emptyText="No collections available."
        kindLabel="collections"
      />
    </React.Fragment>
  );

  const StylePanel = (
    <BlockStack gap="200">
      <Text as="h4" variant="headingSm">
        Customize & Preview
      </Text>

      <Card>
        <Box
          padding="100"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
            gap: 20,
            alignItems: "start",
          }}
        >
          <Box style={{ minWidth: 0 }}>
            <InlineStack gap="400" wrap>
              <Box style={{ minWidth: 70, maxWidth: 105 }}>
                <TextField
                  label="Base size (px)"
                  value={base}
                  onChange={handleBaseChange}
                />
              </Box>

              <Box style={{ minWidth: 70, maxWidth: 105 }}>
                <TextField
                  label="Heading scale"
                  value={headingScale}
                  onChange={handleHeadingChange}
                />
              </Box>

              <Box style={{ minWidth: 70, maxWidth: 105 }}>
                <TextField
                  label="Button radius"
                  value={radius}
                  onChange={handleRadiusChange}
                />
              </Box>
            </InlineStack>



            <Box paddingBlockStart="100">
              <InlineStack gap="400" wrap>

                <ColorField
                  label="Text color"
                  value={textColor}
                  onChange={handleTextColorChange}
                  style={{ maxWidth: "120px" }}
                />

                <ColorField
                  label="Background color"
                  value={bg}
                  onChange={handleBgChange}
                  style={{ maxWidth: "120px" }}
                />

                <ColorField
                  label="Progress bar color"
                  value={progress}
                  onChange={handleProgressChange}
                />

                <ColorField
                  label="Announcement Bar Background Color"
                  value={announcementBarBackgroundColor}
                  onChange={handleAnnouncementBarBackgroundColorChange}
                />

                <ColorField
                  label="Announcement Bar text color"
                  value={announcementBarTextColor}
                  onChange={handleAnnouncementBarTextColorChange}
                />

                <ColorField
                  label="Button color"
                  value={buttonColor}
                  onChange={setButtonColor}
                />

                <ColorField
                  label="Button Label Color"
                  value={buttonLabelColor}
                  onChange={handleButtonLabelColorChange}
                />

                <ColorField
                  label="Border color"
                  value={borderColor}
                  onChange={setBorderColor}
                />

                <ColorField
                  label="Icon Color"
                  value={iconColor}
                  onChange={handleIconColorChange}
                />
                <TextField
                  label="Checkout button label"
                  value={checkoutButtonText}
                  onChange={handleCheckoutButtonTextChange}
                  autoComplete="off"
                />
              </InlineStack>
            </Box>

            <Box paddingBlockStart="300">
              <BlockStack gap="150">
                <Text as="h5" variant="headingXs">
                  Cart icon
                </Text>
                <DropZone
                  accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                  allowMultiple={false}
                  type="image"
                  onDrop={handleCartIconDrop}
                  disabled={cartIconUploading}
                >
                  {cartIconUrl ? (
                    <InlineStack gap="300" align="center" blockAlign="center">
                      <img
                        src={cartIconUrl}
                        alt="Uploaded cart icon"
                        style={{
                          width: 48,
                          height: 48,
                          objectFit: "contain",
                          border: "1px solid #dcdfe4",
                          borderRadius: 4,
                          padding: 6,
                          background: "#ffffff",
                        }}
                      />
                      <Text as="p" variant="bodySm">
                        Drop a new image to replace the current cart icon.
                      </Text>
                    </InlineStack>
                  ) : (
                    <DropZone.FileUpload
                      actionTitle={cartIconUploading ? "Uploading..." : "Upload cart icon"}
                      actionHint="PNG, JPG, WebP, GIF, or SVG up to 2 MB. Default icon is used when empty."
                    />
                  )}
                </DropZone>
              </BlockStack>
            </Box>


            <Box paddingBlockStart="100">
              <Text as="h5" variant="headingXs">
                Cart drawer
              </Text>

              <Box paddingBlockStart="200">
                <BlockStack gap="200">
                  <InlineStack gap="200" wrap>
                    <Select
                      label="Select Background"
                      options={[
                        { label: "Color", value: "color" },
                        { label: "Image URL", value: "image" },
                        { label: "Gradient background", value: "gradient" },
                      ]}
                      value={cartDrawerBackgroundMode}
                      onChange={handleCartDrawerBackgroundModeChange}
                    />

                    {cartDrawerBackgroundMode === "color" && (
                      <ColorField
                        label="Background color"
                        value={cartDrawerBackground}
                        onChange={handleCartDrawerBackgroundChange}
                      />
                    )}

                    {cartDrawerBackgroundMode === "image" && (
                      <TextField
                        label="Cart drawer image URL"
                        value={cartDrawerImage}
                        onChange={handleCartDrawerImageChange}
                        autoComplete="off"
                      />
                    )}

                    {cartDrawerBackgroundMode === "gradient" && (
                      <React.Fragment>
                        <ColorField
                          label="Gradient start"
                          value={cartDrawerGradientStart}
                          onChange={handleCartDrawerGradientStartChange}
                        />
                        <ColorField
                          label="Gradient end"
                          value={cartDrawerGradientEnd}
                          onChange={handleCartDrawerGradientEndChange}
                        />
                      </React.Fragment>
                    )}
                  </InlineStack>

                  <Text tone="" variant="bodySm">
                    {cartDrawerBackgroundMode === "image"
                      ? "Using image background."
                      : cartDrawerBackgroundMode === "gradient"
                        ? "Using gradient background."
                        : "Using solid background color."}
                  </Text>

                  <InlineStack gap="200" wrap>
                    <ColorField
                      label="Text color"
                      value={cartDrawerTextColor}
                      onChange={handleCartDrawerTextColorChange}
                    />

                    <ColorField
                      label="Heading color"
                      value={cartDrawerHeaderColor}
                      onChange={handleCartDrawerHeaderColorChange}
                    />
                  </InlineStack>

                  <Checkbox
                    label="Show discount code apply checkbox"
                    checked={discountCodeApply}
                    onChange={handleDiscountCodeApplyChange}
                  />

                  <InlineStack gap="200" wrap>
                    <Checkbox
                      label="Auto-open drawer after add to cart"
                      checked={drawerAutoOpen}
                      onChange={setDrawerAutoOpen}
                    />
                    <Checkbox
                      label="Sticky checkout button"
                      checked={stickyCheckout}
                      onChange={setStickyCheckout}
                    />
                  </InlineStack>

                  <InlineStack gap="200" wrap>
                    <Box style={{ minWidth: 160 }}>
                      <Select
                        label="Drawer position"
                        options={[
                          { label: "Right", value: "right" },
                          { label: "Left", value: "left" },
                        ]}
                        value={drawerPosition}
                        onChange={setDrawerPosition}
                      />
                    </Box>
                    <Box style={{ minWidth: 180 }}>
                      <Select
                        label="Mobile layout"
                        options={[
                          { label: "Drawer", value: "drawer" },
                          { label: "Bottom sheet", value: "bottom_sheet" },
                        ]}
                        value={mobileLayout}
                        onChange={setMobileLayout}
                      />
                    </Box>
                  </InlineStack>
                </BlockStack>
              </Box>
            </Box>

            <div className="theme-burst-plate">
              {themeBurst !== 0 && (
                <div className="theme-burst" key={themeBurst}>
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <span
                      key={idx}
                      style={{
                        background: idx % 2 === 0 ? progress : textColor,

                        left: `${idx * 24}px`,

                        ["--tx"]: `${-30 + idx * 12}px`,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </Box>

          <Box style={{ minWidth: 0 }}>
            <Text as="h5" variant="headingXs">
              Cart drawer preview
            </Text>

            <Box paddingBlockStart="200">
              <BlockStack gap="200" inlineAlign="center">
                <div style={{ width: "100%", maxWidth: 640, marginInline: "auto" }}>
                  <CartDrawerPreview
                    steps={cartSteps}
                    rulesById={rulesById}
                    stylesFromDb={stylePreviewSettings}
                    previewItems={previewItems}
                    discountRules={discountRules}
                    freeRules={freeRules}
                    bxgyRules={bxgyRules}
                    currencyCode={currencyCode}
                    upsellEnabled={upsellEnabled}
                    upsellItems={upsellPreviewItems}
                    upsellSettings={{
                      enabled: upsellEnabled,
                      recommendationMode: upsellMode,
                      sectionTitle: upsellSectionTitle,
                      buttonText: upsellButtonText,
                      showAsSlider: upsellShowAsSlider,
                      autoplay: upsellAutoplay,
                      backgroundColor: upsellBgColor,
                      textColor: upsellTextColor,
                      borderColor: upsellBorderColor,
                      buttonColor: upsellButtonColor,
                      arrowColor: upsellArrowColor,
                      selectedProductIds: upsellProductIds,
                      selectedCollectionIds: upsellCollectionIds,
                    }}
                  />
                </div>
              </BlockStack>
            </Box>
          </Box>
        </Box>
      </Card>

      <Box paddingBlockStart="100">
        <InlineStack align="end">
          <Button
            loading={saving}
            variant="primary"
            onClick={() => handleSectionSave("style")}
          >
            Save Customizations
          </Button>
        </InlineStack>
      </Box>
    </BlockStack>
  );

  const panelConfigs = [
    {
      content: ShippingPanel,
      preview: ShippingPreviewCard,
    },
    {
      content: DiscountPanel,
      preview: DiscountPreviewCard,
    },
    {
      content: FreeProductPanel,
      preview: FreeProductPreviewCard,
    },
    { content: DiscountCodePanel, matchMainColumnWidth: true },
    { content: BxgyPanel, matchMainColumnWidth: true },
    { content: UpsellPanel },
    { content: StylePanel },
  ];
  const activePanelConfig = panelConfigs[selected] ?? panelConfigs[0];
  const ActivePanel = activePanelConfig.content;
  const ActivePanelPreview = activePanelConfig.preview;
  const hasPanelPreview = Boolean(ActivePanelPreview);
  const panelPadding = "100";
  const panelLayoutClassName = `rules-panel-layout${hasPanelPreview ? " rules-panel-layout--with-preview" : ""
    }${activePanelConfig.matchMainColumnWidth ? " rules-panel-layout--main-column-width" : ""
    }`;
  const savingOverlay = saving ? (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.3)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
      }}
    >
      <Box
        padding="100"
        borderWidth="1"
        borderColor="border"
        background="bg"
        style={{ textAlign: "center" }}
      >
        <Spinner size="large" accessibilityLabel="Saving BXGY configuration" />
        <Text variant="bodyMd">Saving rules...</Text>
      </Box>
    </div>
  ) : null;
  const deletionOverlay = deleting ? (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.3)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
      }}
    >
      <Box
        padding="100"
        borderWidth="1"
        borderColor="border"
        background="bg"
        style={{ textAlign: "center" }}
      >
        <Spinner
          size="large"
          accessibilityLabel={`Deleting ${deletingRuleLabel || "rule"}`}
        />
        <Text variant="bodyMd">Deleting {deletingRuleLabel || "rule"}</Text>
      </Box>
    </div>
  ) : null;

  /* -------- render -------- */

  return (
    <Frame>
      <style>{celebrationStyles}</style>
      <style>{DISCOUNT_SLIDE_ANIMATION}</style>
      <style>{ANNOUNCEMENT_MARQUEE_ANIMATION}</style>
      <style>{UPSELL_CAROUSEL_ANIMATION}</style>
      <style>{RULES_PAGE_CSS}</style>
      <style dangerouslySetInnerHTML={{ __html: LEFT_ALIGN_BUTTON_CSS }} />
      <Page
        title="Cart Drawer Rules Settings"
        fullWidth
      >
        <Modal
          open={payloadModalOpen && Boolean(payloadPreview)}
          onClose={() => setPayloadModalOpen(false)}
          title="Saved configuration"
          large
          primaryAction={{
            content: "Close",
            onAction: () => setPayloadModalOpen(false),
          }}
        >
          <Box padding="100" maxHeight="70vh" overflowY="auto">
            <Text tone="subdued" variant="bodySm">
              Latest configuration snapshot
            </Text>
            <Box paddingBlockStart="100">
              <pre
                style={{
                  background: "#f4f5f7",
                  borderRadius: 4,
                  padding: 16,
                  fontSize: 12,
                  maxHeight: "55vh",
                  overflow: "auto",
                  margin: 0,
                }}
              >
                {JSON.stringify(payloadPreview, null, 2)}
              </pre>
            </Box>
          </Box>
        </Modal>
        <Modal
          open={apiModalOpen && Boolean(lastApiSnapshot)}
          onClose={() => setApiModalOpen(false)}
          title={`Latest API response${lastApiSection ? ` (${lastApiSection})` : ""
            }`}
          large
          primaryAction={{
            content: "Close",
            onAction: () => setApiModalOpen(false),
          }}
        >
          <Box padding="100" maxHeight="70vh" overflowY="auto">
            <Text tone="subdued" variant="bodySm">
              Data returned from the most recent save call.
            </Text>
            <Box paddingBlockStart="200">
              <pre
                style={{
                  background: "#f4f5f7",
                  borderRadius: 4,
                  padding: 16,
                  fontSize: 12,
                  maxHeight: "55vh",
                  overflow: "auto",
                  margin: 0,
                }}
              >
                {JSON.stringify(lastApiSnapshot, null, 2)}
              </pre>
            </Box>
          </Box>
        </Modal>

      <ResourcePickerModal
        open={discountProductPickerIndex !== null}
        onClose={() => setDiscountProductPickerIndex(null)}
        title="Select products for discount"
        items={productPickerItems}
        selected={
          discountProductPickerIndex === null
            ? []
            : discountRules[discountProductPickerIndex]?.appliesTo?.products ||
            []
        }
        onApply={(values) => {
          if (discountProductPickerIndex === null) return;

          setDiscountRules((prev) =>
            prev.map((rule, idx) =>
              idx === discountProductPickerIndex
                ? {
                  ...rule,

                  appliesTo: { ...rule.appliesTo, products: values },
                }
                : rule
            )
          );
        }}
        emptyText="No products available."
        kindLabel="products"
      />

      <ResourcePickerModal
        open={discountCollectionPickerIndex !== null}
        onClose={() => setDiscountCollectionPickerIndex(null)}
        title="Select collections for discount"
        items={collectionPickerItems}
        selected={
          discountCollectionPickerIndex === null
            ? []
            : discountRules[discountCollectionPickerIndex]?.appliesTo
              ?.collections || []
        }
        onApply={(values) => {
          if (discountCollectionPickerIndex === null) return;

          setDiscountRules((prev) =>
            prev.map((rule, idx) =>
              idx === discountCollectionPickerIndex
                ? {
                  ...rule,
                  appliesTo: { ...rule.appliesTo, collections: values },
                }
                : rule
            )
          );
        }}
        emptyText="No collections available."
        kindLabel="collections"
      />

        <Box paddingBlockStart="100">
          <div className="rules-workspace">
            <aside className="rules-sidebar" aria-label="Rules navigation">
              <Card>
                <Box padding="200" style={{ minHeight: "auto" }}>
                  <div className="rules-nav-list">
                    {tabs.map((tab, idx) => (
                      <button
                        key={tab.id}
                        type="button"
                        className={`rules-tab-button${selected === idx ? " rules-tab-button--active" : ""
                          }`}
                        onClick={() => handleTabSelect(idx)}
                        aria-current={selected === idx ? "page" : undefined}
                      >
                        <span className="rules-tab-button__icon" aria-hidden="true">
                          <Icon source={tab.icon} />
                        </span>
                        <span>{tab.label}</span>
                      </button>
                    ))}
                  </div>
                </Box>
              </Card>

              <div className="rules-help-card">
                <Text as="h3" variant="headingSm">
                  Need Help?
                </Text>

                <Text as="p" tone="subdued" variant="bodySm">
                  View the step-by-step guide for the selected rule type.
                </Text>

                <a
                  className="rules-help-link"
                  href={tabs[selected]?.guideUrl || "https://cartliftcartdrawerupsell.tawk.help/category/features"}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {tabs[selected]?.label ? `${tabs[selected].label} Guide` : "View Documentation"}
                </a>
              </div>
            </aside>

            <div className={panelLayoutClassName}>
              <Card>
                <Box padding={panelPadding}>{ActivePanel}</Box>
              </Card>
              {hasPanelPreview && <div>{ActivePanelPreview}</div>}
            </div>
          </div>
        </Box>
      </Page>
      {toast.active && (
        <Toast
          content={toast.content}
          tone={toast.tone}
          onDismiss={handleToastDismiss}
        />
      )}
      {savingOverlay}
      {deletionOverlay}
    </Frame>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  return (
    <Frame>
      <Page title="Error">
        <Card>
          <Text as="h2" variant="headingMd">Something went wrong</Text>
          <Text tone="subdued">
            We encountered an error loading the rules configuration. Please try refreshing or contact support if the issue persists.
          </Text>
          {process.env.NODE_ENV !== "production" && error?.message && (
            <Text tone="critical">{error.message}</Text>
          )}
        </Card>
      </Page>
    </Frame>
  );
}
