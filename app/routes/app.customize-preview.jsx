// app/routes/app.customize-preview.jsx
import { useEffect, useState } from "react";
import {
  useNavigate, useSearchParams, useSubmit,
  useActionData, useLoaderData, useNavigation,
  useRouteError,
} from "react-router";
import {
  Page, Text, Box, BlockStack, InlineStack, Button,
  TextField, Select, Checkbox, Collapsible, Divider,
  Icon, Banner, DropZone, Card, Badge,
} from "@shopify/polaris";
import {
  ThemeIcon, MinimizeIcon, MaximizeIcon,
  ColorIcon, SettingsIcon, CartIcon,
  CartFilledIcon, CartDiscountIcon, CartSaleIcon, CartUpIcon,
  GiftCardIcon, DiscountIcon, DeliveryIcon,
  XIcon, ChevronRightIcon, ChevronLeftIcon,
  DiscountCodeIcon, StarIcon, PackageFulfilledIcon, CashDollarIcon,
} from "@shopify/polaris-icons";
import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// ─── File upload constants ────────────────────────────────────────────────────

const CART_ICON_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "cart-icons");
const APP_PUBLIC_URL = (process.env.APP_URL || process.env.SHOPIFY_APP_URL || "").replace(/\/+$/, "");
const CART_ICON_PUBLIC_PATH = "/uploads/cart-icons";
const CART_ICON_MAX_BYTES = 2 * 1024 * 1024;
const CART_ICON_ALLOWED_TYPES = new Map([
  ["image/png", "png"], ["image/jpeg", "jpg"], ["image/webp", "webp"],
  ["image/svg+xml", "svg"], ["image/gif", "gif"],
]);

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_STYLE = {
  font: "",
  base: "12",
  headingScale: "1.25",
  radius: "12",
  textColor: "#102864",
  bg: "#f4f4f7",
  progress: "#A93DEA",
  progressBg: "#ffffff",
  buttonColor: "#A93DEA",
  buttonLabelColor: "#ffffff",
  borderColor: "#E1E5ED",
  iconColor: "#102864",
  announcementBarBackgroundColor: "#102864",
  announcementBarTextColor: "#ffffff",
  cartDrawerBackgroundMode: "gradient",
  cartDrawerBackground: "#f4f4f7",
  cartDrawerImage: "",
  cartDrawerGradientStart: "#ff3b30",
  cartDrawerGradientEnd: "#f8dfd0",
  cartDrawerTextColor: "#102864",
  cartDrawerHeaderColor: "#ffffff",
  cartIconType: "default",
  cartDefaultIcon: "cart",
  cartIconUrl: "",
  discountCodeApply: true,
  checkoutButtonText: "Checkout",
  drawerAutoOpen: true,
  drawerPosition: "right",
  stickyCheckout: true,
  mobileLayout: "drawer",
  offerButtonEnabled: true,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const json = (data, init = {}) =>
  new Response(JSON.stringify(data), {
    status: init.status || 200,
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
  });

const uploadCartIconFile = async (file) => {
  if (!file || typeof file.arrayBuffer !== "function") throw new Error("Please select an image file.");
  const type = String(file.type || "").toLowerCase();
  const ext = CART_ICON_ALLOWED_TYPES.get(type);
  if (!ext) throw new Error("Upload a PNG, JPG, WebP, GIF, or SVG image.");
  if (Number(file.size || 0) > CART_ICON_MAX_BYTES) throw new Error("Cart icon must be 2 MB or smaller.");
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!buffer.length) throw new Error("The selected image is empty.");
  await mkdir(CART_ICON_UPLOAD_DIR, { recursive: true });
  const filename = `${randomUUID()}.${ext}`;
  await writeFile(path.join(CART_ICON_UPLOAD_DIR, filename), buffer);
  const publicPath = `${CART_ICON_PUBLIC_PATH}/${filename}`;
  return APP_PUBLIC_URL ? `${APP_PUBLIC_URL}${publicPath}` : publicPath;
};

const CART_DEFAULT_ICON_OPTIONS = [
  { label: "Cart", value: "cart" },
  { label: "Cart filled", value: "cart-filled" },
  { label: "Cart discount", value: "cart-discount" },
  { label: "Cart sale", value: "cart-sale" },
  { label: "Cart up", value: "cart-up" },
];

const CART_DEFAULT_ICON_MAP = {
  cart: CartIcon,
  "cart-filled": CartFilledIcon,
  "cart-discount": CartDiscountIcon,
  "cart-sale": CartSaleIcon,
  "cart-up": CartUpIcon,
};

const normalizeCartIconType = (value) =>
  String(value || "").toLowerCase() === "custom" ? "custom" : "default";

const normalizeDefaultCartIcon = (value) => {
  const icon = String(value || "").toLowerCase().trim();
  return CART_DEFAULT_ICON_MAP[icon] ? icon : DEFAULT_STYLE.cartDefaultIcon;
};

const ensureStyleSettingsColumns = async (prisma) => {
  const rows = await prisma.$queryRaw`
    SELECT COLUMN_NAME AS columnName
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'stylesettings'
      AND COLUMN_NAME IN (
        'cartIconUrl',
        'cartIconType',
        'cartDefaultIcon',
        'cartDrawerGradientStart',
        'cartDrawerGradientEnd',
        'offerButtonEnabled',
        'progressBg'
      )
  `;
  const existing = new Set((Array.isArray(rows) ? rows : []).map((row) => String(row.columnName)));

  const addColumn = async (column, sql) => {
    if (existing.has(column)) return;
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (err) {
      const msg = String(err?.message || "");
      if (msg.includes("Duplicate column") || msg.includes("1060") || String(err?.code || "") === "P2010") return;
      throw err;
    }
  };
  await addColumn("cartIconUrl", "ALTER TABLE `stylesettings` ADD COLUMN `cartIconUrl` VARCHAR(191) NULL");
  await addColumn("cartIconType", "ALTER TABLE `stylesettings` ADD COLUMN `cartIconType` VARCHAR(32) NULL");
  await addColumn("cartDefaultIcon", "ALTER TABLE `stylesettings` ADD COLUMN `cartDefaultIcon` VARCHAR(64) NULL");
  await addColumn("cartDrawerGradientStart", "ALTER TABLE `stylesettings` ADD COLUMN `cartDrawerGradientStart` VARCHAR(32) NULL");
  await addColumn("cartDrawerGradientEnd", "ALTER TABLE `stylesettings` ADD COLUMN `cartDrawerGradientEnd` VARCHAR(32) NULL");
  await addColumn("offerButtonEnabled", "ALTER TABLE `stylesettings` ADD COLUMN `offerButtonEnabled` BOOLEAN NOT NULL DEFAULT true");
  await addColumn("progressBg", "ALTER TABLE `stylesettings` ADD COLUMN `progressBg` VARCHAR(32) NULL");
};

const ensureCartIconColumn = async (prisma) => {
  try {
    await ensureStyleSettingsColumns(prisma);
  } catch (err) {
    const msg = String(err?.message || "");
    if (msg.includes("Duplicate column") || msg.includes("1060") || String(err?.code || "") === "P2010") return;
    throw err;
  }
};

const loadCartIconUrl = async (prisma, styleRow) => {
  if (!styleRow?.shop) return styleRow;
  try {
    await ensureStyleSettingsColumns(prisma);
    const rows = await prisma.$queryRaw`
      SELECT cartIconUrl, cartIconType, cartDefaultIcon, cartDrawerGradientStart, cartDrawerGradientEnd, offerButtonEnabled, progressBg
      FROM stylesettings
      WHERE id = ${styleRow.id}
      LIMIT 1
    `;
    const row = Array.isArray(rows) ? rows[0] : null;
    return {
      ...styleRow,
      cartIconUrl: row?.cartIconUrl || "",
      cartIconType: normalizeCartIconType(row?.cartIconType),
      cartDefaultIcon: normalizeDefaultCartIcon(row?.cartDefaultIcon),
      cartDrawerGradientStart: row?.cartDrawerGradientStart || "",
      cartDrawerGradientEnd: row?.cartDrawerGradientEnd || "",
      offerButtonEnabled: row?.offerButtonEnabled !== false && row?.offerButtonEnabled !== 0,
      progressBg: row?.progressBg || "",
    };
  } catch { return styleRow; }
};

const saveSingleStyleSettings = async (prisma, shop, settings) =>
  prisma.$transaction(async (tx) => {
    const rows = await tx.styleSettings.findMany({
      where: { shop },
      orderBy: { id: "desc" },
      select: { id: true },
    });

    if (!rows.length) {
      return tx.styleSettings.create({ data: { shop, ...settings } });
    }

    const [latest, ...older] = rows;
    const saved = await tx.styleSettings.update({
      where: { id: latest.id },
      data: settings,
    });

    if (older.length) {
      await tx.styleSettings.deleteMany({
        where: { id: { in: older.map((row) => row.id) } },
      });
    }

    return saved;
  });

// ─── Loader ───────────────────────────────────────────────────────────────────

const DEFAULT_CURRENCY_CODE = "INR";

function formatCurrencyAmount(amount, currencyCode = DEFAULT_CURRENCY_CODE) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return "";
  const code = String(currencyCode || DEFAULT_CURRENCY_CODE).toUpperCase();
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: code,
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: value % 1 === 0 ? 0 : 2,
      minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    }).format(value);
  } catch {
    const formatted = value.toLocaleString("en-IN", {
      maximumFractionDigits: value % 1 === 0 ? 0 : 2,
      minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    });
    return `${formatted} ${code}`;
  }
}

async function getShopCurrencyCode(admin) {
  try {
    const res = await admin.graphql(
      `#graphql
      query CustomizePreviewShopCurrency {
        shop {
          currencyCode
        }
      }`
    );
    const payload = await res.json();
    return String(payload?.data?.shop?.currencyCode || DEFAULT_CURRENCY_CODE).toUpperCase();
  } catch (err) {
    console.warn("[app.customize-preview] Shop currency load failed:", err?.message);
    return DEFAULT_CURRENCY_CODE;
  }
}

const formatAdminMoney = (amount, currencyCode = DEFAULT_CURRENCY_CODE) =>
  formatCurrencyAmount(amount, currencyCode);

const productToUpsellPreview = (product, tag, currencyCode = DEFAULT_CURRENCY_CODE) => {
  const variant = product?.variants?.nodes?.[0] || product?.variants?.edges?.[0]?.node || null;
  return {
    id: product?.id || product?.legacyResourceId || product?.title,
    title: product?.title || "Product",
    tag,
    price: formatAdminMoney(variant?.price, variant?.currencyCode || currencyCode) || formatCurrencyAmount(300, currencyCode),
    image: product?.featuredImage?.url || product?.image?.url || product?.image || "",
  };
};

const parseCartGoalArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const parseMaybeJson = (value, fallback = null) => {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); } catch { return value; }
};

const parseStoredArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  const parsed = parseMaybeJson(value, null);
  if (Array.isArray(parsed)) return parsed.filter(Boolean);
  if (parsed && typeof parsed === "object") {
    return [
      ...(Array.isArray(parsed.products) ? parsed.products : []),
      ...(Array.isArray(parsed.collections) ? parsed.collections : []),
    ].filter(Boolean);
  }
  return String(value).split(",").map((item) => item.trim()).filter(Boolean);
};

const extractProductId = (item) => {
  if (!item) return "";
  if (typeof item === "string" || typeof item === "number") return String(item);
  return String(
    item.id ||
    item.productId ||
    item.product_id ||
    item.variantId ||
    item.admin_graphql_api_id ||
    item.gid ||
    ""
  );
};

const normalizeStoredProductPreview = (item, fallbackTag = "") => {
  if (!item || typeof item !== "object") return null;
  const title = item.title || item.productTitle || item.name || item.label;
  const image = item.image || item.imageUrl || item.productImage || item.featuredImage?.url || item.featuredImage;
  if (!title && !image) return null;
  return {
    id: extractProductId(item) || title || image,
    title: title || "Free product",
    tag: item.tag || fallbackTag,
    price: item.price || item.variantPrice || "",
    image: image || "",
  };
};

const attachLoadedProductPreviews = (storedItems, loadedMap, fallbackTag = "") => {
  const items = parseStoredArray(storedItems);
  return items
    .map((item) => {
      const inlineProduct = normalizeStoredProductPreview(item, fallbackTag);
      if (inlineProduct) return inlineProduct;
      const id = extractProductId(item);
      return loadedMap.get(toShopifyGid("Product", id)) || loadedMap.get(id) || null;
    })
    .filter(Boolean);
};

const getFreeGiftRuleProductRefs = (rule = {}) => {
  const refs = [
    rule.bonusProductId,
    ...(parseStoredArray(rule.allProductIds) || []),
  ].filter(Boolean);
  const seen = new Set();
  return refs.filter((item) => {
    const id = extractProductId(item);
    const key = String(id || item).trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const cartGoalPrioritySort = (a = {}, b = {}) => {
  const priorityDiff = Number(b.priority || 0) - Number(a.priority || 0);
  if (priorityDiff) return priorityDiff;

  const bUpdated = new Date(b.updatedAt || 0).getTime() || 0;
  const aUpdated = new Date(a.updatedAt || 0).getTime() || 0;
  const updatedDiff = bUpdated - aUpdated;
  if (updatedDiff) return updatedDiff;

  return Number(b.id || 0) - Number(a.id || 0);
};

const hasConfiguredCartGoals = (rule = {}) =>
  Array.isArray(rule.goals) &&
  rule.goals.some((goal) => Number(goal?.goal || 0) > 0);

const toShopifyGid = (type, id) => {
  const raw = String(id || "").trim();
  if (!raw) return "";
  if (raw.startsWith("gid://")) return raw;
  const match = raw.match(/(\d+)$/);
  return match ? `gid://shopify/${type}/${match[1]}` : raw;
};

async function loadUpsellPreviewItems(admin, upsellSettings, currencyCode = DEFAULT_CURRENCY_CODE) {
  if (!upsellSettings?.enabled) return [];
  const productFields = `id title featuredImage { url } variants(first: 1) { nodes { price } }`;
  const productIds = parseStoredIds(upsellSettings.selectedProductIds).map((id) => toShopifyGid("Product", id)).filter(Boolean);
  const collectionIds = parseStoredIds(upsellSettings.selectedCollectionIds).map((id) => toShopifyGid("Collection", id)).filter(Boolean);
  const mode = String(upsellSettings.recommendationMode || "auto").toLowerCase();

  try {
    if (mode === "manual" && productIds.length) {
      const res = await admin.graphql(
        `#graphql
        query UpsellPreviewProducts($ids: [ID!]!) {
          nodes(ids: $ids) {
            ... on Product { ${productFields} }
          }
        }`,
        { variables: { ids: productIds } }
      );
      const json = await res.json();
      return (json?.data?.nodes || []).filter(Boolean).map((product) =>
        productToUpsellPreview(product, "Selected product", currencyCode)
      );
    }

    if (mode === "manual" && collectionIds.length) {
      const res = await admin.graphql(
        `#graphql
        query UpsellPreviewCollections($ids: [ID!]!) {
          nodes(ids: $ids) {
            ... on Collection {
              id
              title
              products(first: 4) {
                nodes { ${productFields} }
              }
            }
          }
        }`,
        { variables: { ids: collectionIds } }
      );
      const json = await res.json();
      return (json?.data?.nodes || [])
        .filter(Boolean)
        .flatMap((collection) =>
          (collection?.products?.nodes || []).map((product) =>
            productToUpsellPreview(product, collection?.title ? `From ${collection.title}` : "Selected collection", currencyCode)
          )
        );
    }

    const res = await admin.graphql(
      `#graphql
      query UpsellPreviewStoreProducts {
        products(first: 4, sortKey: UPDATED_AT, reverse: true) {
          nodes { ${productFields} }
        }
      }`
    );
    const json = await res.json();
    return (json?.data?.products?.nodes || []).map((product) =>
      productToUpsellPreview(product, "", currencyCode)
    );
  } catch (err) {
    console.warn("[app.customize-preview] Upsell preview product load failed:", err?.message);
    return [];
  }
}

async function loadProductPreviewItemsByIds(admin, ids = [], tag = "", currencyCode = DEFAULT_CURRENCY_CODE) {
  const uniqueIds = [...new Set((ids || []).map((id) => toShopifyGid("Product", extractProductId(id))).filter(Boolean))];
  if (!uniqueIds.length) return new Map();

  try {
    const res = await admin.graphql(
      `#graphql
      query PreviewProductsByIds($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on Product {
            id
            title
            featuredImage { url }
            variants(first: 1) { nodes { price } }
          }
        }
      }`,
      { variables: { ids: uniqueIds } }
    );
    const data = await res.json();
    const map = new Map();
    (data?.data?.nodes || []).filter(Boolean).forEach((product) => {
      const preview = productToUpsellPreview(product, tag, currencyCode);
      map.set(product.id, preview);
      map.set(extractProductId(product.id), preview);
    });
    return map;
  } catch (err) {
    console.warn("[app.customize-preview] Product preview lookup failed:", err?.message);
    return new Map();
  }
}

export const loader = async ({ request }) => {
  const { authenticate } = await import("../shopify.server");
  const { default: prisma } = await import("../db.server");
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  await ensureStyleSettingsColumns(prisma);

  const [
    styleRow, shippingRules, discountRules, freeGiftRules,
    upsellSettings, codeDiscountRules, bxgyRules, rawCartGoalRules,
  ] = await Promise.all([
    prisma.styleSettings.findFirst({ where: { shop }, orderBy: { id: "desc" } }),
    prisma.shippingRule.findMany({
      where: { shop, enabled: true },
      orderBy: { id: "asc" },
      select: { progressTextBefore: true, progressTextAfter: true, minSubtotal: true, cartStepName: true, iconChoice: true, campaignName: true, rewardType: true, amount: true },
    }),
    prisma.discountRule.findMany({
      where: { shop, enabled: true, type: { not: "code" } },
      orderBy: { id: "asc" },
      select: { progressTextBefore: true, progressTextAfter: true, minPurchase: true, value: true, valueType: true, cartStepName: true, iconChoice: true, campaignName: true },
    }),
    prisma.freeGiftRule.findMany({
      where: { shop, enabled: true },
      orderBy: { id: "asc" },
      select: {
        progressTextBefore: true,
        progressTextAfter: true,
        minPurchase: true,
        minQuantity: true,
        triggerType: true,
        cartStepName: true,
        iconChoice: true,
        campaignName: true,
        bonusProductId: true,
        allProductIds: true,
      },
    }),
    prisma.upsellSettings.findUnique({ where: { shop } }).catch(() => null),
    prisma.discountRule.findMany({
      where: { shop, enabled: true, type: "code" },
      orderBy: { id: "asc" },
      select: {
        discountCode: true,
        value: true,
        valueType: true,
        triggerType: true,
        minPurchase: true,
        minQuantity: true,
        campaignName: true,
        codeCampaignName: true,
        iconChoice: true,
        progressTextBefore: true,
      },
    }),
    prisma.bxgyRule.findMany({
      where: { shop, enabled: true },
      orderBy: { id: "asc" },
      select: {
        id: true,
        campaignName: true,
        beforeOfferUnlockMessage: true,
        afterOfferUnlockMessage: true,
        xQty: true,
        yQty: true,
        minQuantity: true,
        minSpend: true,
        rewardProductIds: true,
        giftSku: true,
        iconChoice: true,
      },
    }),
    prisma.cartGoalRule.findMany({
      where: { shop, enabled: true },
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        campaignName: true,
        enabled: true,
        trackBy: true,
        shownGoals: true,
        showcaseFreeGifts: true,
        goals: true,
        priority: true,
        updatedAt: true,
      },
    }),
  ]);

  const cartGoalRules = (rawCartGoalRules || [])
    .map((rule) => ({
      ...rule,
      goals: parseCartGoalArray(rule.goals),
      updatedAt: rule.updatedAt?.toISOString?.() || rule.updatedAt || null,
    }))
    .filter(hasConfiguredCartGoals)
    .sort(cartGoalPrioritySort);

  const previewProductIds = [
    ...(freeGiftRules || []).flatMap(getFreeGiftRuleProductRefs),
    ...(bxgyRules || []).flatMap((rule) => parseStoredArray(rule.rewardProductIds || rule.giftSku)),
    ...cartGoalRules.flatMap((campaign) =>
      parseCartGoalArray(campaign.goals).flatMap((goal) => parseStoredArray(goal?.bonusProducts || goal?.products || goal?.selectedProducts))
    ),
  ].map(extractProductId).filter(Boolean);

  const shopCurrencyCode = await getShopCurrencyCode(admin);

  const [styleWithIcon, upsellPreviewItems, productPreviewMap] = await Promise.all([
    loadCartIconUrl(prisma, styleRow),
    loadUpsellPreviewItems(admin, upsellSettings, shopCurrencyCode),
    loadProductPreviewItemsByIds(admin, previewProductIds, "Free product", shopCurrencyCode),
  ]);

  const freeGiftRulesWithProducts = (freeGiftRules || []).map((rule) => ({
    ...rule,
    previewProducts: attachLoadedProductPreviews(getFreeGiftRuleProductRefs(rule), productPreviewMap, "Free product"),
  }));

  const bxgyRulesWithProducts = (bxgyRules || []).map((rule) => ({
    ...rule,
    previewProducts: attachLoadedProductPreviews(rule.rewardProductIds || rule.giftSku, productPreviewMap, "Reward product"),
  }));

  const cartGoalRulesWithProducts = cartGoalRules.map((campaign) => ({
    ...campaign,
    goals: parseCartGoalArray(campaign.goals).map((goal) => ({
      ...goal,
      previewProducts: attachLoadedProductPreviews(
        goal?.bonusProducts || goal?.products || goal?.selectedProducts,
        productPreviewMap,
        "Bonus product"
      ),
    })),
  }));

  return {
    style: styleWithIcon || null,
    shippingRules: shippingRules || [],
    discountRules: discountRules || [],
    freeGiftRules: freeGiftRulesWithProducts || [],
    upsellSettings: upsellSettings || null,
    upsellPreviewItems,
    codeDiscountRules: codeDiscountRules || [],
    bxgyRules: bxgyRulesWithProducts || [],
    cartGoalRules: cartGoalRulesWithProducts,
    shopCurrencyCode,
    shop,
  };
};

// ─── Action ───────────────────────────────────────────────────────────────────

export const action = async ({ request }) => {
  const { authenticate } = await import("../shopify.server");
  const { default: prisma } = await import("../db.server");
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  if (request.headers.get("content-type")?.includes("multipart/form-data")) {
    try {
      const formData = await request.formData();
      const cartIconUrl = await uploadCartIconFile(formData.get("cartIcon"));
      return json({ ok: true, cartIconUrl });
    } catch (err) {
      return json({ ok: false, error: err.message }, { status: 400 });
    }
  }

  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid payload" }, { status: 400 }); }

  const d = body ?? {};
  const parseText = (v) => typeof v === "string" && v.trim() ? v.trim() : null;
  const modeRaw = String(d.cartDrawerBackgroundMode || "").toLowerCase();
  const mode = ["image", "gradient"].includes(modeRaw) ? modeRaw : "color";

  const settings = {
    font: parseText(d.font) || DEFAULT_STYLE.font,
    base: d.base || DEFAULT_STYLE.base,
    headingScale: d.headingScale || DEFAULT_STYLE.headingScale,
    radius: d.radius || DEFAULT_STYLE.radius,
    textColor: parseText(d.textColor) || DEFAULT_STYLE.textColor,
    bg: parseText(d.bg) || DEFAULT_STYLE.bg,
    progress: parseText(d.progress) || DEFAULT_STYLE.progress,
    progressBg: parseText(d.progressBg) || DEFAULT_STYLE.progressBg,
    buttonColor: parseText(d.buttonColor) || DEFAULT_STYLE.buttonColor,
    buttonLabelColor: parseText(d.buttonLabelColor) || DEFAULT_STYLE.buttonLabelColor,
    borderColor: parseText(d.borderColor) || DEFAULT_STYLE.borderColor,
    iconColor: parseText(d.iconColor) || DEFAULT_STYLE.iconColor,
    announcementBarBackgroundColor: parseText(d.announcementBarBackgroundColor) || DEFAULT_STYLE.announcementBarBackgroundColor,
    announcementBarTextColor: parseText(d.announcementBarTextColor) || DEFAULT_STYLE.announcementBarTextColor,
    cartDrawerBackgroundMode: mode,
    cartDrawerBackground: mode === "color" ? (parseText(d.cartDrawerBackground) || DEFAULT_STYLE.cartDrawerBackground) : null,
    cartDrawerImage: mode === "image" ? parseText(d.cartDrawerImage) : null,
    cartDrawerGradientStart: mode === "gradient"
      ? (parseText(d.cartDrawerGradientStart) || DEFAULT_STYLE.cartDrawerGradientStart)
      : null,
    cartDrawerGradientEnd: mode === "gradient"
      ? (parseText(d.cartDrawerGradientEnd) || DEFAULT_STYLE.cartDrawerGradientEnd)
      : null,
    cartDrawerTextColor: parseText(d.cartDrawerTextColor) || DEFAULT_STYLE.cartDrawerTextColor,
    cartDrawerHeaderColor: parseText(d.cartDrawerHeaderColor) || DEFAULT_STYLE.cartDrawerHeaderColor,
    cartIconType: normalizeCartIconType(d.cartIconType),
    cartDefaultIcon: normalizeDefaultCartIcon(d.cartDefaultIcon),
    discountCodeApply: Boolean(d.discountCodeApply),
    checkoutButtonText: parseText(d.checkoutButtonText) || DEFAULT_STYLE.checkoutButtonText,
    drawerAutoOpen: Boolean(d.drawerAutoOpen),
    drawerPosition: ["right", "left"].includes(String(d.drawerPosition)) ? String(d.drawerPosition) : DEFAULT_STYLE.drawerPosition,
    stickyCheckout: Boolean(d.stickyCheckout),
    mobileLayout: ["drawer", "bottom_sheet"].includes(String(d.mobileLayout)) ? String(d.mobileLayout) : DEFAULT_STYLE.mobileLayout,
    offerButtonEnabled: d.offerButtonEnabled !== false,
  };
  settings.cartIconUrl = parseText(d.cartIconUrl);

  try {
    await ensureStyleSettingsColumns(prisma);
    await saveSingleStyleSettings(prisma, shop, settings);
    const { invalidateShopCache } = await import("./app.proxy.smart.jsx");
    invalidateShopCache(shop);
    return json({ success: true });
  } catch (err) {
    return json({ error: err.message }, { status: 500 });
  }
};

// ─── SectionCard ─────────────────────────────────────────────────────────────

function SectionCard({ icon, title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: "#fff", border: "1px solid #e1e3e5", borderRadius: "0.75em", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: open ? "1px solid #e1e3e5" : "none" }}>
        <InlineStack gap="200" blockAlign="center">
          <Icon source={icon} />
          <Text variant="headingSm" as="h3" fontWeight="semibold">{title}</Text>
        </InlineStack>
        <Button variant="plain" icon={open ? MinimizeIcon : MaximizeIcon} onClick={() => setOpen(v => !v)}>
          {open ? "Collapse" : "Expand"}
        </Button>
      </div>
      <Collapsible open={open} id={`sc-${title}`}>
        <Box padding="400">{children}</Box>
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px 18px 12px" }}>
          <Button variant="plain" icon={MinimizeIcon} onClick={() => setOpen(false)}>Collapse</Button>
        </div>
      </Collapsible>
    </div>
  );
}

// ─── ColorField ───────────────────────────────────────────────────────────────

const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;
const toColorInputValue = (value) => (HEX_COLOR_RE.test(String(value || "")) ? value : "#000000");

const withAlpha = (hex, alpha) => {
  const raw = String(hex || "").trim();
  if (!HEX_COLOR_RE.test(raw)) return `rgba(15, 23, 42, ${alpha})`;
  const h = raw.slice(1);
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const hexToRgb = (hex) => {
  const raw = String(hex || "").trim();
  if (!HEX_COLOR_RE.test(raw)) return null;
  const h = raw.slice(1);
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
};

const relativeLuminance = (hex) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const channel = (value) => {
    const normalized = value / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
};

const contrastRatio = (a, b) => {
  const left = relativeLuminance(a);
  const right = relativeLuminance(b);
  if (left === null || right === null) return 21;
  const lighter = Math.max(left, right);
  const darker = Math.min(left, right);
  return (lighter + 0.05) / (darker + 0.05);
};

const readableColorOn = (background) =>
  (relativeLuminance(background) ?? 0) > 0.45 ? "#000000" : "#ffffff";

const PREVIEW_FALLBACK_STEPS = [
  { label: "Free Gift!!", rule: { _ruleType: "free", iconChoice: "gift", _defaultIcon: GiftCardIcon } },
  { label: "20% Off!", rule: { _ruleType: "discount", iconChoice: "tag", _defaultIcon: DiscountIcon } },
  { label: "Free Shipping!", rule: { _ruleType: "shipping", iconChoice: "shipping", _defaultIcon: DeliveryIcon } },
];

function ColorField({ label, value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
      <input
        type="color"
        value={toColorInputValue(value)}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: 36, height: 36, padding: 2, border: "1px solid #e1e3e5", borderRadius: "0.75em", cursor: "pointer", flexShrink: 0 }}
        title={label}
      />
      <div style={{ flex: 1, minWidth: 90 }}>
        <TextField label={label} value={value || ""} onChange={onChange} autoComplete="off" />
      </div>
    </div>
  );
}

// ─── Cart drawer preview ──────────────────────────────────────────────────────

function fmtAmount(val, currencyCode = DEFAULT_CURRENCY_CODE) {
  const n = parseFloat(val);
  return isNaN(n) ? formatCurrencyAmount(20, currencyCode) : formatCurrencyAmount(n, currencyCode);
}

function normalizeMessageText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function renderRichMessage(parts, keyPrefix = "msg") {
  const normalizedParts = (Array.isArray(parts) ? parts : [{ text: normalizeMessageText(parts) }])
    .map((part) => ({
      ...part,
      text: String(part?.text || "").replace(/\s+/g, " "),
    }))
    .filter((part) => part.text.trim());

  return normalizedParts.map((part, index) =>
    part.bold ? (
      <strong key={`${keyPrefix}-${index}`} style={{ fontWeight: 700 }}>
        {part.text}
      </strong>
    ) : (
      <span key={`${keyPrefix}-${index}`}>{part.text}</span>
    )
  );
}

function resolveTemplateParts(text, replacements = {}) {
  const source = normalizeMessageText(text);
  if (!source) return [];

  const parts = [];
  let cursor = 0;
  const pattern = /\{\{\s*([^}]+?)\s*\}\}/g;
  let match;

  while ((match = pattern.exec(source))) {
    if (match.index > cursor) {
      parts.push({ text: source.slice(cursor, match.index) });
    }

    const token = String(match[1] || "").trim().toLowerCase();
    const replacement = replacements[token];
    if (replacement !== undefined && replacement !== null && String(replacement).trim()) {
      parts.push({ text: replacement, bold: true });
    }

    cursor = pattern.lastIndex;
  }

  if (cursor < source.length) {
    parts.push({ text: source.slice(cursor) });
  }

  return parts;
}

function partsToText(parts) {
  return normalizeMessageText((parts || []).map((part) => part.text || "").join(""));
}

function resolveStepText(text, amount, discountOpts = {}) {
  return partsToText(resolveStepTextParts(text, amount, discountOpts)) || null;
}

function resolveStepTextParts(text, amount, discountOpts = {}) {
  if (!text) return [];
  const currencyCode = discountOpts.currencyCode || DEFAULT_CURRENCY_CODE;
  const goalValue = discountOpts.goal ?? amount;
  const formattedGoal = discountOpts.trackBy === "quantity"
    ? String(goalValue ?? "")
    : fmtAmount(goalValue, currencyCode);
  const replacements = {
    amount: fmtAmount(amount, currencyCode),
    goal: formattedGoal,
  };

  if (discountOpts.value !== undefined) {
    const valueType = String(discountOpts.valueType || "").toLowerCase();
    replacements.discount = valueType === "percent" || valueType === "percentage"
      ? `${parseFloat(discountOpts.value)}%`
      : fmtAmount(discountOpts.value, currencyCode);
  }

  if (discountOpts.x !== undefined) replacements.x = String(discountOpts.x);
  if (discountOpts.y !== undefined) replacements.y = String(discountOpts.y);

  return resolveTemplateParts(text, replacements);
}

function formatDiscountValueWithOff(valueType, value, currencyCode = DEFAULT_CURRENCY_CODE) {
  const raw = String(value || "").trim();
  if (!raw) return "your discount";
  return String(valueType || "").toLowerCase() === "amount"
    ? `${fmtAmount(raw, currencyCode)} off`
    : `${parseFloat(raw)}% off`;
}

function formatCodeDiscountGoal(rule, currencyCode = DEFAULT_CURRENCY_CODE) {
  const triggerType = String(rule?.triggerType || "amount").toLowerCase();
  if (triggerType === "quantity") {
    const minQty = Number(rule?.minQuantity || 0);
    return `${minQty} item${minQty === 1 ? "" : "s"}`;
  }

  const minPurchase = Number(rule?.minPurchase || 0);
  return fmtAmount(minPurchase, currencyCode);
}

function resolveCodeDiscountBeforeMessage(rule, currencyCode = DEFAULT_CURRENCY_CODE) {
  return partsToText(resolveCodeDiscountBeforeMessageParts(rule, currencyCode)) || null;
}

function resolveCodeDiscountBeforeMessageParts(rule, currencyCode = DEFAULT_CURRENCY_CODE) {
  const fallback = "Add {{goal}} more to use code {{discount_code}} and get {{discount_value_with_off}}!";
  return resolveTemplateParts(rule?.progressTextBefore || fallback, {
    goal: formatCodeDiscountGoal(rule, currencyCode),
    discount_code: String(rule?.discountCode || "CODE").toUpperCase(),
    discount_value_with_off: formatDiscountValueWithOff(rule?.valueType, rule?.value, currencyCode),
  });
}

function normalizeCartGoalRewardType(goal = {}) {
  const rawType = String(goal.type ?? goal.rewardType ?? goal.ruleType ?? "").toLowerCase();
  if (rawType.includes("ship")) return "shipping";
  if (rawType.includes("discount") || rawType.includes("off")) return "discount";
  if (rawType.includes("gift") || rawType.includes("free") || rawType.includes("product")) return "free";
  if (goal.discountType || goal.value) return "discount";
  return "free";
}

function buildCartGoalPreviewRules(campaign) {
  if (!campaign) return [];
  const trackBy = String(campaign.trackBy || "").toLowerCase() === "quantity" ? "quantity" : "value";
  return parseCartGoalArray(campaign.goals)
    .filter((goal) => goal && Number(goal.goal) > 0)
    .map((goal, index) => {
      const type = normalizeCartGoalRewardType(goal);
      const threshold = Number(goal.goal);
      const texts = goal.texts || {};
      const rule = {
        ...goal,
        _ruleType: type,
        _defaultIcon: type === "shipping" ? DeliveryIcon : type === "discount" ? DiscountIcon : GiftCardIcon,
        isCartGoal: true,
        campaignId: campaign.id,
        campaignName: campaign.campaignName || "Cart Goal",
        priority: campaign.priority || 0,
        showcaseFreeGifts: campaign.showcaseFreeGifts,
        previewProducts: Array.isArray(goal.previewProducts) ? goal.previewProducts : [],
        cartStepName: `step${index + 1}`,
        triggerType: trackBy === "quantity" ? "quantity" : "amount",
        progressTextBefore: texts.aboveBefore || "",
        progressTextAfter: texts.aboveAfter || "",
        progressTextBelow: texts.below || "",
        iconChoice: type === "shipping" ? "shipping" : type === "discount" ? "tag" : "gift",
      };

      if (trackBy === "quantity") {
        rule.minQuantity = Number.isFinite(threshold) ? threshold : null;
      } else if (type === "shipping") {
        rule.minSubtotal = Number.isFinite(threshold) ? threshold : null;
      } else {
        rule.minPurchase = Number.isFinite(threshold) ? threshold : null;
      }

      if (type === "discount") {
        rule.value = goal.value;
        rule.valueType = goal.discountType === "amount" ? "amount" : "percentage";
      }

      return rule;
    });
}

// Returns a short human-readable label for a step milestone
function ruleStepLabel(rule, currencyCode = DEFAULT_CURRENCY_CODE) {
  if (rule._ruleType === "shipping") {
    if (rule.rewardType === "reduce" && rule.amount) return `${fmtAmount(rule.amount, currencyCode)} shipping`;
    return "Free Shipping!";
  }
  if (rule._ruleType === "discount") {
    if (!rule.value) return "Discount";
    return rule.valueType === "percent" || rule.valueType === "percentage"
      ? `${parseFloat(rule.value)}% Off`
      : `${fmtAmount(rule.value, currencyCode)} Off`;
  }
  if (rule._ruleType === "free") return "Free Gift";
  return rule.campaignName || "Reward";
}

// Generates a default "before" progress message when merchant hasn't configured one
function buildDefaultProgressBefore(rule, currencyCode = DEFAULT_CURRENCY_CODE) {
  const amt = rule.triggerType === "quantity"
    ? String(rule.minQuantity || 0)
    : rule._ruleType === "shipping"
      ? fmtAmount(rule.minSubtotal, currencyCode)
      : fmtAmount(rule.minPurchase || "0", currencyCode);
  if (rule._ruleType === "shipping") {
    if (rule.rewardType === "reduce" && rule.amount)
      return `Spend ${amt} more to get ${fmtAmount(rule.amount, currencyCode)} shipping`;
    return `Spend ${amt} more for free shipping`;
  }
  if (rule._ruleType === "discount") {
    const lbl = !rule.value ? "a discount"
      : rule.valueType === "percent" || rule.valueType === "percentage" ? `${parseFloat(rule.value)}% off`
        : `${fmtAmount(rule.value, currencyCode)} off`;
    return rule.triggerType === "quantity"
      ? `Add ${amt} items to get ${lbl}`
      : `Spend ${amt} more to get ${lbl}`;
  }
  if (rule._ruleType === "free") {
    return rule.triggerType === "quantity"
      ? `Add ${amt} items for a free gift`
      : `Spend ${amt} more for a free gift`;
  }
  return rule.triggerType === "quantity"
    ? `Add ${amt} items to unlock your reward`
    : `Spend ${amt} more to unlock your reward`;
}

// Generates a default "after" progress message when merchant hasn't configured one
function buildDefaultProgressAfter(rule, currencyCode = DEFAULT_CURRENCY_CODE) {
  if (rule._ruleType === "shipping") {
    if (rule.rewardType === "reduce" && rule.amount)
      return `${fmtAmount(rule.amount, currencyCode)} shipping unlocked! 🎉`;
    return "Free shipping unlocked! 🎉";
  }
  if (rule._ruleType === "discount") {
    if (!rule.value) return "Discount unlocked! 🎉";
    const lbl = rule.valueType === "percent" || rule.valueType === "percentage"
      ? `${parseFloat(rule.value)}% off`
      : `${fmtAmount(rule.value, currencyCode)} off`;
    return `${lbl} unlocked! 🎉`;
  }
  if (rule._ruleType === "free") return "Free gift unlocked! 🎉";
  return "Reward unlocked! 🎉";
}

// Maps iconChoice string → Polaris icon component
const ICON_CHOICE_MAP = {
  truck: DeliveryIcon, delivery: DeliveryIcon, shipping: DeliveryIcon,
  tag: DiscountIcon, discount: DiscountIcon, percent: DiscountIcon,
  code: DiscountCodeIcon, "discount-code": DiscountCodeIcon,
  gift: GiftCardIcon, "free-gift": GiftCardIcon, freegift: GiftCardIcon,
  sparkles: StarIcon, star: StarIcon,
  bxgy: PackageFulfilledIcon, buyxgety: PackageFulfilledIcon, package: PackageFulfilledIcon,
  cash: CashDollarIcon, dollar: CashDollarIcon,
};
function iconForChoice(choice, fallback) {
  return ICON_CHOICE_MAP[String(choice || "").toLowerCase().trim()] || fallback;
}

// Normalises cartStepName → 1-4 (or null)
function parseStepNum(cartStepName) {
  if (!cartStepName) return null;
  const m = String(cartStepName).replace(/[\s_\-]/g, "").match(/(\d)/);
  const n = m ? parseInt(m[1]) : null;
  return n >= 1 && n <= 4 ? n : null;
}

function parseStoredIds(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return String(raw).split(",").map((id) => id.trim()).filter(Boolean);
  }
}

// Renders a Polaris icon constrained to a given px size
function PreviewIcon({ source, size = 14, color = "currentColor" }) {
  const s = `${size}px`;
  return (
    <span style={{ display: "flex", width: s, height: s, flexShrink: 0, color }}>
      <Icon source={source} />
    </span>
  );
}

function parsePreviewPrice(price = "", fallbackCurrencyCode = DEFAULT_CURRENCY_CODE) {
  const raw = String(price || "");
  const amount = Number(raw.replace(/[^\d.]/g, ""));
  const currencyMatch = raw.match(/[A-Z]{3}|₹|\$|€|£/i);
  const currency = currencyMatch ? currencyMatch[0].toUpperCase() : fallbackCurrencyCode;

  return {
    amount: Number.isFinite(amount) ? amount : 300,
    currency,
  };
}

function formatPreviewPrice(amount, currencyCode = DEFAULT_CURRENCY_CODE) {
  return formatCurrencyAmount(amount, currencyCode);
}

function normalizePreviewImage(src, fallback = "/images/upsellproduct.png") {
  const value = String(src || "").trim();
  return value || fallback;
}

function CartDrawerPreview({
  bg, uiBg, textColor, progressTextColor, headerColor, buttonColor, buttonLabelColor,
  progress, progressBg, radius, base, headingScale, font, checkoutText,
  announcementBg, announcementText,
  shippingRules, discountRules, freeGiftRules, cartGoalRules, upsellSettings,
  upsellPreviewItems,
  codeDiscountRules,
  bxgyRules,
  drawerBgMode, drawerImage, drawerGradientStart, drawerGradientEnd,
  drawerAutoOpen, drawerPosition, stickyCheckout, mobileLayout, offerButtonEnabled,
  discountCodeApply,
  borderColor, iconColor,
  cartIconUrl,
  cartIconType,
  cartDefaultIcon,
  shopCurrencyCode = DEFAULT_CURRENCY_CODE,
}) {
  const r = Math.max(Number(radius) || 12, 12);
  const previewRadius = "0.75em";
  const fs = Math.max(Number(base) || 12, 10);
  const headingFs = Math.max(20, Number((fs * (Number(headingScale) || 1.25)).toFixed(2)));
  const fontFamily = font || DEFAULT_STYLE.font;
  const tc = textColor || "#102864";
  const drawerText = textColor || "#102864";
  const ptc = progressTextColor || drawerText;
  const hc = headerColor || "#ffffff";
  const bc = buttonColor || "#A93DEA";
  const blc = buttonLabelColor || "#ffffff";
  const pc = progress || "#A93DEA";
  const brc = borderColor || "#E1E5ED";
  const ic = iconColor || "#102864";
  const surface = uiBg || "#ffffff";
  const progressSurface = progressBg || "#ffffff";
  const completedIconColor = readableColorOn(pc);
  const gradStart = drawerGradientStart || DEFAULT_STYLE.cartDrawerGradientStart;
  const gradEnd = drawerGradientEnd || DEFAULT_STYLE.cartDrawerGradientEnd;

  const [activeUpsellIndex, setActiveUpsellIndex] = useState(0);
  const [activeFreeProductIndex, setActiveFreeProductIndex] = useState(0);
  const [activeDrawerTab, setActiveDrawerTab] = useState("cart");

  const showUpsell = upsellSettings?.enabled !== false;
  const showOfferTabs = offerButtonEnabled !== false;
  const upsellShowAsSlider = upsellSettings?.showAsSlider !== false;
  const upsellAutoplay = upsellSettings?.autoplay !== false;
  const upsellTitle = upsellSettings?.sectionTitle || "You may also like...";
  const upsellButtonText = upsellSettings?.buttonText || "Add";
  const upsellButtonBg = upsellSettings?.buttonColor || bc;
  const upsellButtonTextColor = upsellSettings?.buttonTextColor || blc;
  const upsellArrowColor = upsellSettings?.arrowColor || ic;
  const upsellSurface = upsellSettings?.backgroundColor || "#ffffff";
  const upsellTextColor = upsellSettings?.textColor || drawerText;
  const upsellBorderColor = upsellSettings?.borderColor || brc;

  const topCartGoalCampaign = (cartGoalRules || [])[0] || null;
  const cartGoalPreviewRules = buildCartGoalPreviewRules(topCartGoalCampaign);
  const taggedRules = cartGoalPreviewRules.length ? cartGoalPreviewRules : [
    ...(shippingRules || []).map((rule) => ({ ...rule, _ruleType: "shipping", _defaultIcon: DeliveryIcon })),
    ...(discountRules || []).map((rule) => ({ ...rule, _ruleType: "discount", _defaultIcon: DiscountIcon })),
    ...(freeGiftRules || []).map((rule) => ({ ...rule, _ruleType: "free", _defaultIcon: GiftCardIcon })),
  ];

  const slotMap = { 1: null, 2: null, 3: null, 4: null };
  const unslotted = [];
  taggedRules.forEach((rule) => {
    const slot = parseStepNum(rule.cartStepName);
    if (slot && !slotMap[slot]) slotMap[slot] = rule;
    else unslotted.push(rule);
  });
  let ui = 0;
  for (let slot = 1; slot <= 4; slot += 1) {
    if (!slotMap[slot] && ui < unslotted.length) slotMap[slot] = unslotted[ui++];
  }

  const ruleSteps = [1, 2, 3, 4]
    .map((slot) => ({ slot, rule: slotMap[slot] }))
    .filter((step) => step.rule);

  const displaySteps = ruleSteps.length
    ? ruleSteps.slice(0, 4)
    : PREVIEW_FALLBACK_STEPS.map((entry, index) => ({
      slot: index + 1,
      rule: entry.rule,
      fallbackLabel: entry.label,
    }));

  const stepCount = displaySteps.length;

  const getRuleGoalValue = (rule) => {
    if (!rule) return 0;
    if (rule.triggerType === "quantity") return Number(rule.minQuantity || rule.goal || 0);
    if (rule._ruleType === "shipping") return Number(rule.minSubtotal || rule.goal || 0);
    return Number(rule.minPurchase || rule.goal || 0);
  };

  const sortedDisplaySteps = [...displaySteps].sort((a, b) =>
    getRuleGoalValue(a.rule) - getRuleGoalValue(b.rule)
  );

  // Preview sample same as cart drawer screenshot: $10 cart subtotal / 1 qty.
  // Storefront cart drawer uses real cart subtotal; this is only admin Customize & Preview.
  const previewCartSubtotal = 10;
  const previewCartQty = 1;
  const previewTrackBy = sortedDisplaySteps[0]?.rule?.triggerType === "quantity" ? "quantity" : "amount";
  const previewProgressValue = previewTrackBy === "quantity" ? previewCartQty : previewCartSubtotal;
  const maxGoalValue = Math.max(...sortedDisplaySteps.map((step) => getRuleGoalValue(step.rule)), 1);

  const stepPosition = (stepOrIndex) => {
    if (stepCount <= 1) return 50;
    if (typeof stepOrIndex === "number") {
      return stepOrIndex === stepCount - 1 ? 100 : ((stepOrIndex + 1) / stepCount) * 100;
    }
    const goal = getRuleGoalValue(stepOrIndex?.rule);
    return Math.min(100, Math.max(0, (goal / maxGoalValue) * 100));
  };

  const progressFill = Math.min(100, Math.max(0, (previewProgressValue / maxGoalValue) * 100));

  const resolveStepLabel = (step) => {
    if (step.fallbackLabel) return step.fallbackLabel;
    const rule = step.rule;
    if (!rule) return "Reward";

    const amount = rule.triggerType === "quantity"
      ? rule.minQuantity
      : rule._ruleType === "shipping"
        ? rule.minSubtotal
        : rule.minPurchase;

    const discountOpts = rule._ruleType === "discount"
      ? { value: rule.value, valueType: rule.valueType, goal: amount, trackBy: rule.triggerType, currencyCode: shopCurrencyCode }
      : { goal: amount, trackBy: rule.triggerType, currencyCode: shopCurrencyCode };

    return resolveStepText(rule.progressTextBelow, amount, discountOpts) || ruleStepLabel(rule, shopCurrencyCode);
  };

  const firstPending = sortedDisplaySteps.find((step) =>
    getRuleGoalValue(step.rule) > previewProgressValue
  )?.rule || sortedDisplaySteps[0]?.rule;

  const nextGoalParts = (() => {
    if (!firstPending) return [{ text: "Add more to unlock your reward" }];

    const goalAmount = getRuleGoalValue(firstPending);
    const remainingAmount = Math.max(goalAmount - previewProgressValue, 0);

    const discountOpts = firstPending._ruleType === "discount"
      ? {
          value: firstPending.value,
          valueType: firstPending.valueType,
          goal: goalAmount,
          trackBy: firstPending.triggerType,
          currencyCode: shopCurrencyCode,
        }
      : {
          goal: goalAmount,
          trackBy: firstPending.triggerType,
          currencyCode: shopCurrencyCode,
        };

    const sourceText = remainingAmount > 0
      ? (firstPending.progressTextBefore || buildDefaultProgressBefore(firstPending, shopCurrencyCode))
      : (firstPending.progressTextAfter || buildDefaultProgressAfter(firstPending, shopCurrencyCode));

    const resolvedParts = resolveStepTextParts(sourceText, remainingAmount, discountOpts);
    return resolvedParts.length
      ? resolvedParts
      : [{
          text: remainingAmount > 0
            ? `Add ${previewTrackBy === "quantity" ? remainingAmount : fmtAmount(remainingAmount, shopCurrencyCode)} more to unlock ${ruleStepLabel(firstPending, shopCurrencyCode)}`
            : buildDefaultProgressAfter(firstPending, shopCurrencyCode),
        }];
  })();

  const cartGoalFreeProducts = cartGoalPreviewRules
    .filter((rule) =>
      rule?._ruleType === "free" &&
      String(rule?.showcaseFreeGifts ?? topCartGoalCampaign?.showcaseFreeGifts ?? "show").toLowerCase() !== "hide"
    )
    .flatMap((rule) => Array.isArray(rule.previewProducts) ? rule.previewProducts : []);
  const freeGiftPreviewProducts = (freeGiftRules || []).flatMap((rule) =>
    Array.isArray(rule.previewProducts) ? rule.previewProducts : []
  );

  const fallbackFreeProducts = [
    {
      id: "preview-free-1",
      title: "Bottle Soda",
      tag: "Free",
      compare: formatCurrencyAmount(4, shopCurrencyCode),
      price: "Free",
      image: "/images/upsellproduct.png",
    },
    {
      id: "preview-free-2",
      title: "Couple Gift Box",
      tag: "BuyXGetY",
      compare: formatCurrencyAmount(93.98, shopCurrencyCode),
      price: "Free",
      image: "/images/upsellproduct.png",
    },
  ];

  const freeProducts = (
    cartGoalFreeProducts.length || freeGiftPreviewProducts.length
      ? [...cartGoalFreeProducts, ...freeGiftPreviewProducts]
      : fallbackFreeProducts
  ).slice(0, 8);
  const activeFreeProduct = freeProducts[activeFreeProductIndex] || freeProducts[0] || fallbackFreeProducts[0];

  const previewProducts = Array.isArray(upsellPreviewItems)
    ? upsellPreviewItems.filter(Boolean)
    : [];

  const fallbackUpsellProducts = [
    {
      id: "preview-upsell-1",
      title: "Casual Sneakers",
      tag: "Buy X Get Y",
      price: formatCurrencyAmount(199.95, shopCurrencyCode),
      image: "/images/upsellproduct.png",
    },
    {
      id: "preview-upsell-2",
      title: "Sample Puma Shoes",
      tag: "Recommended",
      price: formatCurrencyAmount(300, shopCurrencyCode),
      image: "/images/upsellproduct.png",
    },
  ];
  const upsellProducts = (previewProducts.length ? previewProducts : fallbackUpsellProducts).slice(0, 8);
  const activeUpsellProduct = upsellProducts[activeUpsellIndex] || upsellProducts[0] || fallbackUpsellProducts[0];

  const mainProduct = {
    title: activeUpsellProduct?.title || "Casual Sneakers",
    tag: activeUpsellProduct?.tag || "Buy X Get Y",
    price: activeUpsellProduct?.price || formatCurrencyAmount(199.95, shopCurrencyCode),
    image: activeUpsellProduct?.image || "/images/upsellproduct.png",
  };

  const announceMessageParts = [];
  (codeDiscountRules || []).forEach((rule) => {
    const beforeMsgParts = resolveCodeDiscountBeforeMessageParts(rule, shopCurrencyCode);
    if (beforeMsgParts.length) {
      announceMessageParts.push(beforeMsgParts);
      return;
    }
    if (rule?.discountCode) {
      announceMessageParts.push([
        { text: "Use code " },
        { text: String(rule.discountCode).toUpperCase(), bold: true },
        { text: " and get discount!" },
      ]);
    }
  });
  if (!announceMessageParts.length) {
    announceMessageParts.push([
      { text: "Use code " },
      { text: "RUDRA123", bold: true },
      { text: " and get 10% off! Add " },
      { text: formatCurrencyAmount(0, shopCurrencyCode), bold: true },
      { text: " more" },
    ]);
  }
  const marqueeContent = announceMessageParts.filter((message) => partsToText(message));
  const marqueeTextContent = marqueeContent.map((message) => partsToText(message));

  const offerSubtitleForRule = (rule, fallback = "") => {
    if (!rule) return fallback;
    const amount = rule.triggerType === "quantity"
      ? rule.minQuantity
      : rule._ruleType === "shipping"
        ? rule.minSubtotal
        : rule.minPurchase;
    const opts = rule._ruleType === "discount"
      ? { value: rule.value, valueType: rule.valueType, goal: amount, trackBy: rule.triggerType, currencyCode: shopCurrencyCode }
      : { goal: amount, trackBy: rule.triggerType, currencyCode: shopCurrencyCode };
    return resolveStepText(rule.progressTextBefore, amount, opts)
      || buildDefaultProgressBefore(rule, shopCurrencyCode)
      || fallback;
  };

  const messageText = (value, fallback = "") => {
    const parsed = parseMaybeJson(value, value);
    if (parsed && typeof parsed === "object") {
      return parsed.text || parsed.message || parsed.title || fallback;
    }
    return String(parsed || fallback || "").trim();
  };

  const offerItems = [
    ...(bxgyRules || []).slice(0, 2).map((rule) => {
      const x = Number(rule?.xQty || rule?.minQuantity || 0);
      const y = Number(rule?.yQty || 0);
      const fallback = Number.isFinite(x) && x > 0 && Number.isFinite(y) && y > 0
        ? `Buy ${x} and get ${y} free`
        : "Buy something and get something";
      return {
        key: `bxgy-${rule.id || rule.campaignName || fallback}`,
        type: "bxgy",
        title: rule.campaignName || "Buy X Get Y Discount",
        subtitle: messageText(rule.beforeOfferUnlockMessage, fallback),
        icon: PackageFulfilledIcon,
        action: "Show Gifts",
        products: Array.isArray(rule.previewProducts) ? rule.previewProducts : [],
      };
    }),
    ...(codeDiscountRules || []).slice(0, 2).map((rule) => ({
      key: `code-${rule.discountCode || rule.id || "discount"}`,
      type: "code",
      title: rule.codeCampaignName || rule.campaignName || "Code Discount",
      subtitle: resolveCodeDiscountBeforeMessage(rule, shopCurrencyCode) || "Apply this discount code",
      code: String(rule.discountCode || "smart123").toUpperCase(),
      icon: DiscountCodeIcon,
      action: "Apply Code",
    })),
    ...displaySteps
      .filter((step) => step?.rule && !step.fallbackLabel)
      .map((step, index) => {
        const rule = step.rule;
        const type = rule?._ruleType || rule?.ruleType || "reward";
        const title = type === "shipping"
          ? "Free Shipping"
          : type === "discount"
            ? resolveStepLabel(step)
            : type === "free"
              ? "Free Gift"
              : resolveStepLabel(step);
        return {
          key: `step-${step.slot}-${index}`,
          type,
          title,
          subtitle: offerSubtitleForRule(rule, "Reward available in this order"),
          icon: iconForChoice(rule?.iconChoice, rule?._defaultIcon || GiftCardIcon),
          action: type === "free" ? "Show Gifts" : "",
          products: Array.isArray(rule?.previewProducts) ? rule.previewProducts : [],
        };
      }),
  ];

  useEffect(() => {
    setActiveUpsellIndex(0);
  }, [upsellProducts.length, upsellSettings?.selectedProductIds, upsellSettings?.selectedCollectionIds]);

  useEffect(() => {
    setActiveFreeProductIndex(0);
  }, [freeProducts.length, topCartGoalCampaign?.id]);

  useEffect(() => {
    if (!showOfferTabs && activeDrawerTab !== "cart") setActiveDrawerTab("cart");
  }, [activeDrawerTab, showOfferTabs]);

  useEffect(() => {
    if (!showUpsell || !upsellShowAsSlider || !upsellAutoplay || upsellProducts.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setActiveUpsellIndex((current) => (current + 1) % upsellProducts.length);
    }, 2500);
    return () => window.clearInterval(timer);
  }, [showUpsell, upsellShowAsSlider, upsellAutoplay, upsellProducts.length]);

  const moveUpsellPreview = (direction) => {
    if (upsellProducts.length < 2) return;
    setActiveUpsellIndex((current) => {
      const next = current + direction;
      if (next < 0) return upsellProducts.length - 1;
      if (next >= upsellProducts.length) return 0;
      return next;
    });
  };

  const moveFreeProductPreview = (direction) => {
    if (freeProducts.length < 2) return;
    setActiveFreeProductIndex((current) => {
      const next = current + direction;
      if (next < 0) return freeProducts.length - 1;
      if (next >= freeProducts.length) return 0;
      return next;
    });
  };

  const bodyBackgroundStyle = drawerBgMode === "image" && drawerImage
    ? {
      background: `linear-gradient(rgba(244,244,247,.92), rgba(244,244,247,.92)), url(${drawerImage})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    }
    : { background: bg || surface || "#f4f4f7" };

  const topBackgroundStyle = drawerBgMode === "gradient"
    ? { background: `linear-gradient(135deg, ${gradStart}, ${gradEnd})` }
    : drawerBgMode === "image" && drawerImage
      ? {
        background: `linear-gradient(135deg, ${withAlpha(bc, 0.92)}, ${withAlpha(pc, 0.72)}), url(${drawerImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
      : { background: `linear-gradient(135deg, ${bc} 0%, ${pc} 58%, ${withAlpha(pc, 0.28)} 100%)` };

  const showCustomCartIcon = normalizeCartIconType(cartIconType) === "custom" && cartIconUrl;
  const headerCartIcon = CART_DEFAULT_ICON_MAP[normalizeDefaultCartIcon(cartDefaultIcon)] || CartIcon;
  const isBottomSheetPreview = mobileLayout === "bottom_sheet";
  const previewHeight = isBottomSheetPreview ? 620 : 680;
  const cartPreviewCount = 1;
  const totalPrice = formatCurrencyAmount(331.14, shopCurrencyCode);
  const discountPrice = `-${formatCurrencyAmount(82.78, shopCurrencyCode)}`;

  const ProductImage = ({ src, alt, size = 58, radiusPx = previewRadius }) => (
    <img
      src={normalizePreviewImage(src)}
      alt={alt || "Product"}
      onError={(event) => { event.currentTarget.style.display = "none"; }}
      style={{
        width: size,
        height: size,
        borderRadius: radiusPx,
        objectFit: "cover",
        background: "#F7F7F7",
        flexShrink: 0,
      }}
    />
  );

  const MilestoneProgress = () => (
    <Box padding="300">
      <BlockStack gap="250">
        <Text as="p" alignment="center" fontWeight="semibold" tone="inherit">
          <span style={{ color: ptc, fontSize: Math.max(fs + 1, 13), lineHeight: "18px" }}>
            {renderRichMessage(nextGoalParts, "preview-next-goal")}
          </span>
        </Text>

        <div style={{ position: "relative", height: 50, margin: "0 22px" }}>
          <div style={{ position: "absolute", top: 13, left: 0, right: 0, height: 8, borderRadius: 999, background: withAlpha(pc, 0.24) }} />
          <div style={{ position: "absolute", top: 13, left: 0, width: `${progressFill}%`, height: 8, borderRadius: 999, background: pc, transition: "width .25s ease" }} />

          {sortedDisplaySteps.map((step, index) => {
            const pct = stepPosition(step);
            const done = previewProgressValue >= getRuleGoalValue(step.rule);
            const iconSrc = iconForChoice(step.rule?.iconChoice, step.rule?._defaultIcon || GiftCardIcon);
            return (
              <div
                key={`${step.slot}-${index}`}
                style={{
                  position: "absolute",
                  top: 0,
                  left: `${pct}%`,
                  transform: "translateX(-50%)",
                  width: 106,
                  textAlign: "center",
                  zIndex: 2,
                }}
              >
                <div
                  className={done ? "cp-goal-dot cp-goal-dot-done" : "cp-goal-dot"}
                  style={{
                    width: 32,
                    height: 32,
                    margin: "0 auto",
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    background: done ? pc : progressSurface,
                    color: done ? completedIconColor : ic,
                    border: `2px solid ${done ? pc : withAlpha(ptc, 0.35)}`,
                    boxShadow: "0 1px 4px rgba(15,23,42,.18)",
                  }}
                >
                  <PreviewIcon source={iconSrc} size={18} color="currentColor" />
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: Math.max(fs - 2, 10),
                    lineHeight: "13px",
                    color: ptc,
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {resolveStepLabel(step)}
                </div>
              </div>
            );
          })}
        </div>
      </BlockStack>
    </Box>
  );

  const CartTag = ({ icon = DiscountIcon, children }) => (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        minHeight: 24,
        borderRadius: previewRadius,
        padding: "4px 9px",
        background: withAlpha(pc, 0.12),
        color: ic,
        fontWeight: 800,
        fontSize: Math.max(fs - 1, 11),
        lineHeight: "14px",
      }}
    >
      <PreviewIcon source={icon} size={13} color="currentColor" />
      {children}
    </span>
  );

  const renderProductRow = (item, index) => (
    <div
      key={`${item.title}-${index}`}
      style={{
        display: "grid",
        gridTemplateColumns: "72px minmax(0, 1fr) auto",
        gap: 12,
        alignItems: "center",
        padding: "15px 14px",
        borderBottom: index === cartRows.length - 1 ? "none" : `1px solid ${brc}`,
        background: "#ffffff",
      }}
    >
      <ProductImage src={item.image} alt={item.title} size={54} />
      <div style={{ minWidth: 0 }}>
        <div style={{ color: drawerText, fontWeight: 800, fontSize: Math.max(fs + 3, 15), lineHeight: "20px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {item.title}
        </div>
        <div style={{ marginTop: 6 }}>
          <CartTag icon={item.tagIcon || DiscountIcon}>{item.tag || "Free"}</CartTag>
        </div>
        {item.qty && (
          <InlineStack gap="200" blockAlign="center" wrap={false}>
            <button type="button" style={{ width: 34, height: 34, borderRadius: previewRadius, border: `1px solid ${brc}`, background: "#fff", color: ic, cursor: "pointer", fontWeight: 800 }}>-</button>
            <span style={{ minWidth: 18, textAlign: "center", color: drawerText, fontWeight: 800, fontSize: Math.max(fs + 2, 14) }}>{item.qty}</span>
            <button type="button" style={{ width: 34, height: 34, borderRadius: previewRadius, border: `1px solid ${brc}`, background: "#fff", color: ic, cursor: "pointer", fontWeight: 800 }}>+</button>
          </InlineStack>
        )}
      </div>
      <BlockStack gap="100" align="end">
        <button
          type="button"
          aria-label="Remove item"
          style={{
            width: 26,
            height: 26,
            border: 0,
            background: "transparent",
            color: ic,
            display: "grid",
            placeItems: "center",
            padding: 0,
            cursor: "pointer",
            justifySelf: "end",
          }}
        >
          <PreviewIcon source={XIcon} size={18} color="currentColor" />
        </button>
        <InlineStack gap="200" blockAlign="center" wrap={false}>
          {item.compare && (
            <span style={{ color: `${drawerText}80`, fontSize: Math.max(fs, 12), fontWeight: 700, textDecoration: "line-through", whiteSpace: "nowrap" }}>
              {item.compare}
            </span>
          )}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 78,
              minHeight: 34,
              borderRadius: 999,
              padding: "6px 12px",
              background: item.free ? pc : "transparent",
              color: item.free ? completedIconColor : drawerText,
              fontSize: Math.max(fs + 3, 15),
              fontWeight: 800,
              whiteSpace: "nowrap",
            }}
          >
            {item.price}
          </span>
        </InlineStack>
      </BlockStack>
    </div>
  );

  const cartRows = [
    {
      title: mainProduct.title || "Casual Sneakers",
      tag: mainProduct.tag || "Buy X Get Y",
      tagIcon: DiscountIcon,
      image: mainProduct.image,
      price: mainProduct.price || formatCurrencyAmount(199.95, shopCurrencyCode),
      qty: 1,
      free: false,
    },
  ];

  const OfferProductThumbs = ({ products = [], icon }) => {
    const visible = products.filter(Boolean).slice(0, 4);
    if (!visible.length) {
      return (
        <div
          style={{
            width: 64,
            height: 58,
            borderRadius: previewRadius,
            display: "grid",
            placeItems: "center",
            background: "#ffffff",
            border: `1px solid ${brc}`,
            color: ic,
          }}
        >
          <PreviewIcon source={icon} size={30} color="currentColor" />
        </div>
      );
    }

    return (
      <div
        style={{
          width: 64,
          height: 58,
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 4,
          alignContent: "center",
        }}
      >
        {visible.map((product, index) => (
          <img
            key={product.id || product.title || index}
            src={normalizePreviewImage(product.image)}
            alt={product.title || "Offer product"}
            onError={(event) => { event.currentTarget.style.display = "none"; }}
            style={{
              width: 28,
              height: 28,
              borderRadius: previewRadius,
              objectFit: "cover",
              border: `1px solid ${brc}`,
              background: "#F7F7F7",
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <Card padding="0">
      <style>{`
        @keyframes cpAnnouncementMarquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes cpCornerLineMove {
          0% { left: -45%; }
          100% { left: 110%; }
        }
        @keyframes cpGoalPop {
          0% { transform: scale(.84); }
          55% { transform: scale(1.14); }
          100% { transform: scale(1); }
        }
        .cp-announcementMarquee {
          overflow: hidden;
          white-space: nowrap;
          width: 100%;
        }
        .cp-announcementTrack {
          display: inline-flex;
          min-width: max-content;
          animation: cpAnnouncementMarquee 18s linear infinite;
        }
        .cp-announcementGroup {
          display: inline-flex;
          align-items: center;
          min-width: max-content;
        }
        .cp-announcementItem {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding-inline: 18px;
        }
        .cp-goal-dot-done {
          animation: cpGoalPop .45s ease both;
        }
        .cp-preview-discount-code .Polaris-TextField,
        .cp-preview-discount-code .Polaris-TextField__Input,
        .cp-preview-discount-code .Polaris-TextField__Backdrop {
          border-radius: 0.75em !important;
          --pc-shadow-bevel-border-radius: 0.75em !important;
        }
        @media (prefers-reduced-motion: reduce) {
          .cp-announcementTrack { animation: none; }
          .cp-goal-dot-done { animation: none; }
        }
      `}</style>

      <div
        style={{
          height: previewHeight,
          minHeight: previewHeight,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          border: `1px solid ${brc}`,
          borderRadius: isBottomSheetPreview ? "0.75em 0.75em 0 0" : 0,
          color: drawerText,
          fontSize: fs,
          fontFamily,
          boxShadow: drawerPosition === "left"
            ? "8px 0 22px rgba(15,23,42,.12)"
            : "-8px 0 22px rgba(15,23,42,.12)",
          opacity: drawerAutoOpen ? 1 : 0.88,
          marginTop: isBottomSheetPreview ? 48 : 0,
          ...bodyBackgroundStyle,
        }}
      >
        <div style={{ padding: "22px 18px 0", minHeight: 136, flexShrink: 0, ...topBackgroundStyle }}>
          <InlineStack align="space-between" blockAlign="center" wrap={false}>
            <InlineStack gap="200" blockAlign="center" wrap={false}>
              {showCustomCartIcon ? (
                <img
                  src={cartIconUrl}
                  alt=""
                  aria-hidden="true"
                  style={{ width: 22, height: 22, objectFit: "contain", flexShrink: 0 }}
                />
              ) : (
                <PreviewIcon source={headerCartIcon} size={22} color={hc} />
              )}
              <Text as="h3" fontWeight="bold">
                <span style={{ color: hc, fontSize: headingFs, lineHeight: 1.1 }}>
                  {activeDrawerTab === "offers" ? "Offers" : `Cart (${cartPreviewCount})`}
                </span>
              </Text>
            </InlineStack>

            <button
              type="button"
              aria-label="Close cart"
              style={{
                width: 52,
                height: 38,
                borderRadius: 999,
                border: 0,
                background: surface,
                color: ic,
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                boxShadow: "0 8px 18px rgba(15,23,42,.16)",
              }}
            >
              <PreviewIcon source={XIcon} size={20} color="currentColor" />
            </button>
          </InlineStack>

          {activeDrawerTab === "cart" && (
            <div
              style={{
                marginTop: 20,
                borderRadius: `${previewRadius} ${previewRadius} 0 0`,
                overflow: "hidden",
                background: announcementBg || "#102864",
                color: announcementText || "#ffffff",
                boxShadow: "0 10px 24px rgba(15,23,42,.14)",
              }}
            >
              <div className="cp-announcementMarquee" aria-label={marqueeTextContent.join(" ")}>
                <div className="cp-announcementTrack">
                  {[0, 1].map((group) => (
                    <div className="cp-announcementGroup" key={group} aria-hidden={group === 1}>
                      {marqueeContent.map((message, index) => (
                        <span
                          className="cp-announcementItem"
                          key={`${group}-${index}-${partsToText(message)}`}
                          style={{
                            fontSize: Math.max(fs + 1, 13),
                            lineHeight: "16px",
                            minHeight: 56,
                            color: announcementText || "#ffffff",
                            fontWeight: 800,
                          }}
                        >
                          {index > 0 && <span aria-hidden="true">{"\u2022"}</span>}
                          <span>{renderRichMessage(message, `announce-${group}-${index}`)}</span>
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {activeDrawerTab === "cart" ? (
          <>
            <div
              style={{
                margin: "-1px 18px 0",
                background: progressSurface,
                borderRadius: `0 0 ${previewRadius} ${previewRadius}`,
                boxShadow: "0 2px 8px rgba(15,23,42,.08)",
                color: ptc,
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              <MilestoneProgress />
              <div
                style={{
                  position: "relative",
                  height: 4,
                  background: "#ffffff",
                  overflow: "hidden",
                  boxShadow: "0 -1px 0 rgba(15,23,42,.06)",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: "-45%",
                    height: "100%",
                    width: "45%",
                    borderRadius: 999,
                    background: `linear-gradient(90deg, transparent, ${withAlpha(pc, 0.18)}, ${pc}, ${withAlpha(pc, 0.18)}, transparent)`,
                    animation: "cpCornerLineMove 1.1s cubic-bezier(.42,0,.18,1) infinite",
                  }}
                />
              </div>
            </div>

            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflow: "auto",
                margin: "10px 18px 0",
                borderRadius: previewRadius,
                background: "#ffffff",
                boxShadow: "0 2px 8px rgba(15,23,42,.12)",
              }}
            >
              {cartRows.map(renderProductRow)}

              {showUpsell && (
                <div style={{ padding: "14px 14px 16px", background: "#ffffff" }}>
                  <BlockStack gap="200">
                    <Text as="p" alignment="center" tone="subdued" fontWeight="bold">
                      <span style={{ color: `${upsellTextColor}99`, fontSize: Math.max(fs, 12) }}>
                        {upsellTitle}
                      </span>
                    </Text>

                    <InlineStack gap="200" blockAlign="center" wrap={false}>
                      {upsellShowAsSlider && (
                        <button
                          type="button"
                          aria-label="Previous product"
                          onClick={() => moveUpsellPreview(-1)}
                          disabled={upsellProducts.length < 2}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            border: `1px solid ${upsellBorderColor}`,
                            background: "#ffffff",
                            color: upsellArrowColor,
                            display: "grid",
                            placeItems: "center",
                            padding: 0,
                            cursor: upsellProducts.length > 1 ? "pointer" : "default",
                            opacity: upsellProducts.length > 1 ? 1 : 0.45,
                            flexShrink: 0,
                          }}
                        >
                          <PreviewIcon source={ChevronLeftIcon} size={14} color="currentColor" />
                        </button>
                      )}

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "48px minmax(0, 1fr) auto",
                          alignItems: "center",
                          gap: 10,
                          minWidth: 0,
                          flex: 1,
                          padding: "9px 10px",
                          border: `1px solid ${upsellBorderColor}`,
                          borderRadius: previewRadius,
                          background: upsellSurface,
                        }}
                      >
                        <ProductImage src={activeUpsellProduct.image} alt={activeUpsellProduct.title} size={48} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: upsellTextColor, fontWeight: 800, fontSize: Math.max(fs, 12), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {activeUpsellProduct.title || "Recommended product"}
                          </div>
                          <div style={{ color: `${upsellTextColor}CC`, fontSize: Math.max(fs - 1, 11), fontWeight: 700, marginTop: 2 }}>
                            {activeUpsellProduct.price || formatCurrencyAmount(300, shopCurrencyCode)}
                          </div>
                        </div>
                        <button
                          type="button"
                          style={{
                            background: upsellButtonBg,
                            color: upsellButtonTextColor,
                            border: "none",
                            borderRadius: previewRadius,
                            padding: "8px 12px",
                            fontWeight: 800,
                            fontSize: Math.max(fs - 1, 11),
                            whiteSpace: "nowrap",
                            cursor: "pointer",
                            maxWidth: 92,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {upsellButtonText}
                        </button>
                      </div>

                      {upsellShowAsSlider && (
                        <button
                          type="button"
                          aria-label="Next product"
                          onClick={() => moveUpsellPreview(1)}
                          disabled={upsellProducts.length < 2}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            border: `1px solid ${upsellBorderColor}`,
                            background: "#ffffff",
                            color: upsellArrowColor,
                            display: "grid",
                            placeItems: "center",
                            padding: 0,
                            cursor: upsellProducts.length > 1 ? "pointer" : "default",
                            opacity: upsellProducts.length > 1 ? 1 : 0.45,
                            flexShrink: 0,
                          }}
                        >
                          <PreviewIcon source={ChevronRightIcon} size={14} color="currentColor" />
                        </button>
                      )}
                    </InlineStack>
                  </BlockStack>
                </div>
              )}
            </div>
          </>
        ) : (
          <div
            style={{
              flex: 1,
              minHeight: 0,
              margin: "10px 18px 0",
              borderRadius: previewRadius,
              background: "#ffffff",
              overflow: "auto",
              boxShadow: "0 2px 8px rgba(15,23,42,.12)",
            }}
          >
            {offerItems.length ? (
              offerItems.map((offer, index) => (
                <div
                  key={offer.key}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "70px minmax(0, 1fr) auto",
                    gap: 12,
                    alignItems: "center",
                    padding: "16px 14px",
                    borderTop: index === 0 ? 0 : `1px solid ${brc}`,
                  }}
                >
                  {offer.type === "bxgy" || offer.type === "free" ? (
                    <OfferProductThumbs products={offer.products} icon={offer.icon} />
                  ) : (
                    <div
                      style={{
                        width: 64,
                        height: 58,
                        borderRadius: previewRadius,
                        display: "grid",
                        placeItems: "center",
                        background: "#F8F8FA",
                        border: `1px solid ${brc}`,
                        color: ic,
                      }}
                    >
                      <PreviewIcon source={offer.icon} size={30} color="currentColor" />
                    </div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: drawerText, fontWeight: 800, fontSize: Math.max(fs + 3, 15), lineHeight: "20px" }}>
                      {offer.title}
                    </div>
                    <div style={{ color: `${drawerText}99`, fontSize: Math.max(fs, 12), lineHeight: "17px", marginTop: 4, fontWeight: 700 }}>
                      {offer.subtitle}
                    </div>
                  </div>
                  {offer.type === "code" ? (
                    <div
                      style={{
                        minWidth: 108,
                        border: `1px solid ${ic}`,
                        borderRadius: previewRadius,
                        textAlign: "center",
                        background: "#ffffff",
                        padding: "8px 10px",
                      }}
                    >
                      <div style={{ color: drawerText, fontWeight: 800, fontSize: Math.max(fs + 1, 13), whiteSpace: "nowrap" }}>
                        {offer.code}
                      </div>
                    </div>
                  ) : offer.action ? (
                    <button
                      type="button"
                      style={{
                        border: 0,
                        background: bc,
                        color: blc,
                        borderRadius: previewRadius,
                        padding: "11px 13px",
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                        cursor: "pointer",
                      }}
                    >
                      {offer.action}
                    </button>
                  ) : null}
                </div>
              ))
            ) : (
              <div style={{ padding: 24, textAlign: "center", color: `${drawerText}99`, fontWeight: 700 }}>
                No offers configured yet.
              </div>
            )}
          </div>
        )}

        {activeDrawerTab === "cart" && (
          <div
            style={{
              margin: "10px 18px 0",
              borderRadius: previewRadius,
              overflow: "hidden",
              background: "#ffffff",
              boxShadow: stickyCheckout ? "0 -8px 18px rgba(15,23,42,.08)" : "0 2px 8px rgba(15,23,42,.10)",
              flexShrink: 0,
            }}
          >
            <div style={{ padding: "12px 14px 8px" }}>
              <BlockStack gap="200">
                <InlineStack align="space-between" blockAlign="center" wrap={false}>
                  <Text as="p" fontWeight="bold"><span style={{ color: drawerText, fontSize: Math.max(fs + 2, 14) }}>Shipping</span></Text>
                  <Text as="p" fontWeight="bold"><span style={{ color: drawerText, fontSize: Math.max(fs + 2, 14) }}>Free</span></Text>
                </InlineStack>
                <InlineStack align="space-between" blockAlign="center" wrap={false}>
                  <Text as="p" fontWeight="bold"><span style={{ color: drawerText, fontSize: Math.max(fs + 2, 14) }}>Order Discount</span></Text>
                  <Text as="p" fontWeight="bold"><span style={{ color: drawerText, fontSize: Math.max(fs + 2, 14) }}>{discountPrice}</span></Text>
                </InlineStack>

                {discountCodeApply && (
                  <InlineStack gap="200" wrap={false}>
                    <div className="cp-preview-discount-code" style={{ flex: 1, minWidth: 0 }}>
                      <TextField
                        label="Discount code"
                        labelHidden
                        placeholder="Apply Discount Code"
                        value=""
                        onChange={() => { }}
                        autoComplete="off"
                      />
                    </div>
                    <button
                      type="button"
                      style={{
                        border: `1px solid ${ic}`,
                        borderRadius: previewRadius,
                        background: "#ffffff",
                        color: ic,
                        padding: "0 16px",
                        minHeight: 52,
                        fontWeight: 800,
                        fontSize: Math.max(fs + 1, 13),
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        width: 98,
                      }}
                    >
                      Apply
                    </button>
                  </InlineStack>
                )}
              </BlockStack>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                minHeight: 70,
                borderTop: `1px solid ${brc}`,
              }}
            >
              <Box padding="300">
                <BlockStack gap="050">
                  <span style={{ color: `${drawerText}99`, fontSize: Math.max(fs, 12), fontWeight: 700 }}>Total</span>
                  <span style={{ color: drawerText, fontSize: Math.max(fs + 7, 19), fontWeight: 900, lineHeight: "21px" }}>{totalPrice}</span>
                </BlockStack>
              </Box>

              <div
                style={{
                  display: "grid",
                  placeItems: "center",
                  background: bc,
                  color: blc,
                  fontWeight: 900,
                  fontSize: Math.max(fs + 2, 14),
                  textAlign: "center",
                  padding: "0 12px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {checkoutText || "Checkout"}
              </div>
            </div>
          </div>
        )}

        {showOfferTabs && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 0,
              margin: "12px 18px 12px",
              border: 0,
              borderRadius: previewRadius,
              background: "#ffffff",
              overflow: "hidden",
              boxShadow: "0 2px 8px rgba(15,23,42,.10)",
              flexShrink: 0,
            }}
          >
            {[
              { key: "cart", label: "Cart", icon: CartIcon },
              { key: "offers", label: "Offers", icon: GiftCardIcon },
            ].map((tab) => {
              const selected = activeDrawerTab === tab.key;
              return (
                <button
                  type="button"
                  key={tab.key}
                  onClick={() => setActiveDrawerTab(tab.key)}
                  style={{
                    minHeight: 66,
                    border: 0,
                    borderBottom: selected ? `3px solid ${bc}` : "3px solid transparent",
                    background: "#ffffff",
                    color: selected ? bc : drawerText,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 7,
                    fontSize: Math.max(fs + 3, 15),
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  <PreviewIcon source={tab.icon} size={17} color="currentColor" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CustomizePreview() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const host = searchParams.get("host");
  const withHost = (p) => host ? `${p}?host=${encodeURIComponent(host)}` : p;

  const loaderData = useLoaderData() ?? {};
  const actionData = useActionData();
  const navigation = useNavigation();
  const submit = useSubmit();
  const s = loaderData?.style || {};
  const shippingRules = loaderData?.shippingRules || [];
  const discountRules = loaderData?.discountRules || [];
  const freeGiftRules = loaderData?.freeGiftRules || [];
  const upsellSettings = loaderData?.upsellSettings || null;
  const upsellPreviewItems = loaderData?.upsellPreviewItems || [];
  const codeDiscountRules = loaderData?.codeDiscountRules || [];
  const bxgyRules = loaderData?.bxgyRules || [];
  const cartGoalRules = loaderData?.cartGoalRules || [];
  const shopCurrencyCode = loaderData?.shopCurrencyCode || DEFAULT_CURRENCY_CODE;
  const isSaving = navigation.state === "submitting";

  // Typography & Sizes
  const font = s.font ?? DEFAULT_STYLE.font;
  const [base, setBase] = useState(s.base ?? DEFAULT_STYLE.base);
  const [headingScale, setHeadingScale] = useState(s.headingScale ?? DEFAULT_STYLE.headingScale);
  const [radius, setRadius] = useState(s.radius ?? DEFAULT_STYLE.radius);

  // Colors
  const [textColor, setTextColor] = useState(s.textColor ?? DEFAULT_STYLE.textColor);
  const [bg, setBg] = useState(s.bg ?? DEFAULT_STYLE.bg);
  const [progress, setProgress] = useState(s.progress ?? DEFAULT_STYLE.progress);
  const [progressBg, setProgressBg] = useState(s.progressBg ?? DEFAULT_STYLE.progressBg);
  const [buttonColor, setButtonColor] = useState(s.buttonColor ?? DEFAULT_STYLE.buttonColor);
  const [buttonLabelColor, setButtonLabelColor] = useState(s.buttonLabelColor ?? DEFAULT_STYLE.buttonLabelColor);
  const [borderColor, setBorderColor] = useState(s.borderColor ?? DEFAULT_STYLE.borderColor);
  const [iconColor, setIconColor] = useState(s.iconColor ?? DEFAULT_STYLE.iconColor);
  const [announcementBg, setAnnouncementBg] = useState(s.announcementBarBackgroundColor ?? DEFAULT_STYLE.announcementBarBackgroundColor);
  const [announcementText, setAnnouncementText] = useState(s.announcementBarTextColor ?? DEFAULT_STYLE.announcementBarTextColor);

  // Checkout
  const [checkoutButtonText, setCheckoutButtonText] = useState(s.checkoutButtonText ?? DEFAULT_STYLE.checkoutButtonText);
  const [discountCodeApply, setDiscountCodeApply] = useState(s.discountCodeApply ?? DEFAULT_STYLE.discountCodeApply);

  // Cart icon
  const [cartIconUrl, setCartIconUrl] = useState(s.cartIconUrl ?? "");
  const [cartIconType, setCartIconType] = useState(normalizeCartIconType(s.cartIconType ?? (s.cartIconUrl ? "custom" : DEFAULT_STYLE.cartIconType)));
  const [cartDefaultIcon, setCartDefaultIcon] = useState(normalizeDefaultCartIcon(s.cartDefaultIcon ?? DEFAULT_STYLE.cartDefaultIcon));
  const [cartIconUploading, setCartIconUploading] = useState(false);
  const [cartIconError, setCartIconError] = useState("");

  // Cart Drawer
  const [drawerBgMode, setDrawerBgMode] = useState(s.cartDrawerBackgroundMode ?? DEFAULT_STYLE.cartDrawerBackgroundMode);
  const [drawerBg, setDrawerBg] = useState(s.cartDrawerBackground ?? DEFAULT_STYLE.cartDrawerBackground);
  const [drawerImage, setDrawerImage] = useState(s.cartDrawerImage ?? "");
  const [drawerGradientStart, setDrawerGradientStart] = useState(s.cartDrawerGradientStart ?? DEFAULT_STYLE.cartDrawerGradientStart);
  const [drawerGradientEnd, setDrawerGradientEnd] = useState(s.cartDrawerGradientEnd ?? DEFAULT_STYLE.cartDrawerGradientEnd);
  const [drawerTextColor, setDrawerTextColor] = useState(s.cartDrawerTextColor ?? DEFAULT_STYLE.cartDrawerTextColor);
  const [drawerHeaderColor, setDrawerHeaderColor] = useState(s.cartDrawerHeaderColor ?? DEFAULT_STYLE.cartDrawerHeaderColor);
  const [drawerAutoOpen, setDrawerAutoOpen] = useState(s.drawerAutoOpen ?? DEFAULT_STYLE.drawerAutoOpen);
  const [drawerPosition, setDrawerPosition] = useState(s.drawerPosition ?? DEFAULT_STYLE.drawerPosition);
  const [stickyCheckout, setStickyCheckout] = useState(s.stickyCheckout ?? DEFAULT_STYLE.stickyCheckout);
  const [mobileLayout, setMobileLayout] = useState(s.mobileLayout ?? DEFAULT_STYLE.mobileLayout);
  const [offerButtonEnabled, setOfferButtonEnabled] = useState(s.offerButtonEnabled ?? DEFAULT_STYLE.offerButtonEnabled);

  const handleCartIconDrop = async (_files, accepted) => {
    const file = accepted?.[0];
    if (!file) return;
    setCartIconUploading(true);
    setCartIconError("");
    try {
      const fd = new FormData();
      fd.append("cartIcon", file);
      fd.append("intent", "uploadCartIcon");
      const res = await fetch(window.location.pathname, { method: "POST", body: fd });
      const data = await res.json();
      if (data.ok && data.cartIconUrl) setCartIconUrl(data.cartIconUrl);
      else setCartIconError(data.error || "Upload failed.");
    } catch { setCartIconError("Upload failed. Please try again."); }
    finally { setCartIconUploading(false); }
  };

  const handleSave = () => {
    submit({
      font, base, headingScale, radius,
      textColor, bg, progress, progressBg, buttonColor, buttonLabelColor, borderColor, iconColor,
      announcementBarBackgroundColor: announcementBg, announcementBarTextColor: announcementText,
      checkoutButtonText, discountCodeApply,
      cartIconType, cartDefaultIcon, cartIconUrl,
      cartDrawerBackgroundMode: drawerBgMode,
      cartDrawerBackground: drawerBg,
      cartDrawerImage: drawerImage,
      cartDrawerGradientStart: drawerGradientStart,
      cartDrawerGradientEnd: drawerGradientEnd,
      cartDrawerTextColor: drawerTextColor,
      cartDrawerHeaderColor: drawerHeaderColor,
      drawerAutoOpen, drawerPosition, stickyCheckout, mobileLayout, offerButtonEnabled,
    }, { method: "post", encType: "application/json" });
  };

  const previewBg = drawerBgMode === "color" ? (drawerBg || bg || "#fff") : drawerBgMode === "gradient" ? `linear-gradient(90deg, ${drawerGradientStart} 0%, ${drawerGradientEnd} 100%)` : "#fff";

  return (
    <Page
      backAction={{ content: "Campaigns", onAction: () => navigate(withHost("/app/campaigns")) }}
      title="Customize & Preview"
      primaryAction={{ content: "Save", loading: isSaving, onAction: handleSave }}
    >
      <style>{`.cp-layout{display:grid;grid-template-columns:1fr 420px;gap:24px;align-items:start}@media(max-width:1000px){.cp-layout{grid-template-columns:1fr}}.cp-color-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:16px}.cp-preview-sticky{position:sticky;top:80px}`}</style>

      {actionData?.error && (
        <Box paddingBlockEnd="400">
          <Banner tone="critical" title="Save failed">{actionData.error}</Banner>
        </Box>
      )}
      {actionData?.success && (
        <Box paddingBlockEnd="400">
          <Banner tone="success" title="Saved">Customizations saved successfully.</Banner>
        </Box>
      )}

      <Box paddingBlockEnd="700">
        <div className="cp-layout">

          {/* ── Main column ── */}
          <BlockStack gap="400">

            {/* Typography & Sizes */}
            <SectionCard icon={ThemeIcon} title="Typography & Sizes">
              <BlockStack gap="400">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
                  <TextField
                    label="Base size (px)"
                    value={base}
                    onChange={setBase}
                    autoComplete="off"
                    type="number"
                    helpText="Root font size for the cart drawer."
                  />
                  <TextField
                    label="Heading scale"
                    value={headingScale}
                    onChange={setHeadingScale}
                    autoComplete="off"
                    helpText="Multiplier for heading sizes."
                  />
                  <TextField
                    label="Button radius (px)"
                    value={radius}
                    onChange={setRadius}
                    autoComplete="off"
                    type="number"
                    helpText="Corner radius of buttons."
                  />
                </div>
              </BlockStack>
            </SectionCard>

            {/* Colors */}
            <SectionCard icon={ColorIcon} title="Colors">
              <BlockStack gap="400">
                <Text variant="bodyMd" fontWeight="semibold" as="p">Progress bar & UI</Text>
                <div className="cp-color-grid">
                  <ColorField label="Text color" value={textColor} onChange={setTextColor} />
                  <ColorField label="Progress bar" value={progress} onChange={setProgress} />
                  <ColorField label="Progress background" value={progressBg} onChange={setProgressBg} />
                  <ColorField label="Border color" value={borderColor} onChange={setBorderColor} />
                  <ColorField label="Icon color" value={iconColor} onChange={setIconColor} />
                </div>
                <Divider />
                <Text variant="bodyMd" fontWeight="semibold" as="p">Button</Text>
                <div className="cp-color-grid">
                  <ColorField label="Button color" value={buttonColor} onChange={setButtonColor} />
                  <ColorField label="Button label color" value={buttonLabelColor} onChange={setButtonLabelColor} />
                </div>
                <Divider />
                <Text variant="bodyMd" fontWeight="semibold" as="p">Announcement bar</Text>
                <div className="cp-color-grid">
                  <ColorField label="Background" value={announcementBg} onChange={setAnnouncementBg} />
                  <ColorField label="Text color" value={announcementText} onChange={setAnnouncementText} />
                </div>
                <Divider />
                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">Background</Text>
                  <Select
                    label="Background type"
                    options={[
                      { label: "Solid color", value: "color" },
                      { label: "Image URL", value: "image" },
                      { label: "Gradient", value: "gradient" },
                    ]}
                    value={drawerBgMode}
                    onChange={setDrawerBgMode}
                  />
                  {drawerBgMode === "color" && (
                    <ColorField label="Drawer background color" value={drawerBg} onChange={setDrawerBg} />
                  )}
                  {drawerBgMode === "image" && (
                    <TextField
                      label="Background image URL"
                      value={drawerImage}
                      onChange={setDrawerImage}
                      autoComplete="off"
                      placeholder="https://example.com/background.jpg"
                      helpText="Displayed as the cart drawer background."
                    />
                  )}
                  {drawerBgMode === "gradient" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <ColorField label="Gradient start" value={drawerGradientStart} onChange={setDrawerGradientStart} />
                      <ColorField label="Gradient end" value={drawerGradientEnd} onChange={setDrawerGradientEnd} />
                    </div>
                  )}
                </BlockStack>
                <Divider />
                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">Drawer text</Text>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <ColorField label="Text color" value={drawerTextColor} onChange={setDrawerTextColor} />
                    <ColorField label="Heading color" value={drawerHeaderColor} onChange={setDrawerHeaderColor} />
                  </div>
                </BlockStack>
              </BlockStack>
            </SectionCard>

            {/* Cart Icon */}
            <SectionCard icon={CartIcon} title="Cart Icon">
              <BlockStack gap="300">
                <Select
                  label="Icon type"
                  options={[
                    { label: "Default Icon", value: "default" },
                    { label: "Custom Icon", value: "custom" },
                  ]}
                  value={cartIconType}
                  onChange={setCartIconType}
                />
                {cartIconType === "default" && (
                  <InlineStack gap="300" blockAlign="end" wrap={false}>
                    <div style={{ flex: 1 }}>
                      <Select
                        label="Cart related Polaris icon"
                        options={CART_DEFAULT_ICON_OPTIONS}
                        value={cartDefaultIcon}
                        onChange={setCartDefaultIcon}
                      />
                    </div>
                    <div style={{ width: 44, height: 44, border: "1px solid #dcdfe4", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: iconColor || DEFAULT_STYLE.iconColor, flexShrink: 0 }}>
                      <PreviewIcon source={CART_DEFAULT_ICON_MAP[cartDefaultIcon] || CartIcon} size={24} color="currentColor" />
                    </div>
                  </InlineStack>
                )}
                {cartIconType === "custom" && (
                  <>
                    <Text variant="bodySm" tone="subdued" as="p">
                      Upload a custom icon shown on the cart button. PNG, JPG, WebP, GIF, or SVG up to 2 MB.
                      Leave empty to use the default cart icon.
                    </Text>
                    {cartIconError && <Banner tone="critical">{cartIconError}</Banner>}
                    <DropZone
                      accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                      allowMultiple={false}
                      type="image"
                      onDrop={handleCartIconDrop}
                      disabled={cartIconUploading}
                    >
                      {cartIconUrl ? (
                        <InlineStack gap="300" blockAlign="center" align="center">
                          <img
                            src={cartIconUrl}
                            alt="Cart icon"
                            style={{ width: 48, height: 48, objectFit: "contain", border: "1px solid #dcdfe4", borderRadius: "0.75em", padding: 6, background: "#fff" }}
                          />
                          <BlockStack gap="100">
                            <Text variant="bodySm" as="p">Current cart icon</Text>
                            <Text variant="bodySm" tone="subdued" as="p">Drop a new image to replace it.</Text>
                          </BlockStack>
                        </InlineStack>
                      ) : (
                        <DropZone.FileUpload
                          actionTitle={cartIconUploading ? "Uploading…" : "Upload cart icon"}
                          actionHint="PNG, JPG, WebP, GIF, or SVG up to 2 MB"
                        />
                      )}
                    </DropZone>
                    {cartIconUrl && (
                      <Button variant="plain" tone="critical" onClick={() => setCartIconUrl("")}>Remove cart icon</Button>
                    )}
                  </>
                )}
              </BlockStack>
            </SectionCard>

            {/* Cart Drawer Settings */}
            <SectionCard icon={SettingsIcon} title="Cart Drawer Settings">
              <BlockStack gap="400">
                {/* Checkout */}
                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">Checkout</Text>
                  <TextField
                    label="Checkout button label"
                    value={checkoutButtonText}
                    onChange={setCheckoutButtonText}
                    autoComplete="off"
                    placeholder="Checkout"
                  />
                  <Checkbox
                    label="Show discount code input"
                    checked={discountCodeApply}
                    onChange={setDiscountCodeApply}
                  />
                </BlockStack>

                <Divider />

                {/* Behavior */}
                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">Behavior</Text>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <Select
                      label="Drawer position"
                      options={[{ label: "Right", value: "right" }, { label: "Left", value: "left" }]}
                      value={drawerPosition}
                      onChange={setDrawerPosition}
                    />
                    <Select
                      label="Mobile layout"
                      options={[{ label: "Drawer", value: "drawer" }, { label: "Bottom sheet", value: "bottom_sheet" }]}
                      value={mobileLayout}
                      onChange={setMobileLayout}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                    <Checkbox
                      label="Auto-open after add to cart"
                      checked={drawerAutoOpen}
                      onChange={setDrawerAutoOpen}
                    />
                    <Checkbox
                      label="Sticky checkout button"
                      checked={stickyCheckout}
                      onChange={setStickyCheckout}
                    />
                    <Checkbox
                      label="Show Cart and Offers buttons"
                      checked={offerButtonEnabled}
                      onChange={setOfferButtonEnabled}
                    />
                  </div>
                </BlockStack>
              </BlockStack>
            </SectionCard>

          </BlockStack>

          {/* ── Sidebar: full-size preview only ── */}
          <div className="cp-preview-sticky">
            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="center">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">Live Preview</Text>
                  <Badge tone="success">Dynamic</Badge>
                </InlineStack>
                <CartDrawerPreview
                  bg={previewBg}
                  uiBg={bg}
                  textColor={drawerTextColor}
                  progressTextColor={textColor}
                  headerColor={drawerHeaderColor}
                  buttonColor={buttonColor}
                  buttonLabelColor={buttonLabelColor}
                  progress={progress}
                  progressBg={progressBg}
                  radius={radius}
                  base={base}
                  headingScale={headingScale}
                  font={font}
                  checkoutText={checkoutButtonText}
                  announcementBg={announcementBg}
                  announcementText={announcementText}
                  shopCurrencyCode={shopCurrencyCode}
                  shippingRules={shippingRules}
                  discountRules={discountRules}
                  freeGiftRules={freeGiftRules}
                  cartGoalRules={cartGoalRules}
                  upsellSettings={upsellSettings}
                  upsellPreviewItems={upsellPreviewItems}
                  codeDiscountRules={codeDiscountRules}
                  bxgyRules={bxgyRules}
                  discountCodeApply={discountCodeApply}
                  borderColor={borderColor}
                  iconColor={iconColor}
                  drawerBgMode={drawerBgMode}
                  drawerImage={drawerImage}
                  drawerGradientStart={drawerGradientStart}
                  drawerGradientEnd={drawerGradientEnd}
                  drawerAutoOpen={drawerAutoOpen}
                  drawerPosition={drawerPosition}
                  stickyCheckout={stickyCheckout}
                  mobileLayout={mobileLayout}
                  offerButtonEnabled={offerButtonEnabled}
                  cartIconUrl={cartIconUrl}
                  cartIconType={cartIconType}
                  cartDefaultIcon={cartDefaultIcon}
                />
              </BlockStack>
            </Card>
          </div>
        </div>
      </Box>
    </Page>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  return (
    <Page title="Error">
      <Banner tone="critical" title="Something went wrong">
        {process.env.NODE_ENV !== "production" && error?.message
          ? error.message
          : "We encountered an error loading Customize & Preview. Please try refreshing."}
      </Banner>
    </Page>
  );
}
