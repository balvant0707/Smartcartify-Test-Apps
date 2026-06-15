// app/routes/app.customize-preview.jsx
import { useEffect, useState } from "react";
import {
  useNavigate, useSearchParams, useSubmit,
  useActionData, useLoaderData, useNavigation,
} from "react-router";
import {
  Page, Text, Box, BlockStack, InlineStack, Button,
  TextField, Select, Checkbox, Collapsible, Divider,
  Icon, Banner, DropZone, Card,
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
  font: "Inter, sans-serif",
  base: "12",
  headingScale: "1.25",
  radius: "0",
  textColor: "#000000",
  bg: "#ffffff",
  progress: "#000000",
  buttonColor: "#000000",
  buttonLabelColor: "#ffffff",
  borderColor: "#E1E5ED",
  iconColor: "#000000",
  announcementBarBackgroundColor: "#000000",
  announcementBarTextColor: "#ffffff",
  announcementBarText: "Free shipping on orders over $50! 🎉",
  cartDrawerBackgroundMode: "color",
  cartDrawerBackground: "#ffffff",
  cartDrawerImage: "",
  cartDrawerGradientStart: "#ffffff",
  cartDrawerGradientEnd: "#f9f9f9",
  cartDrawerTextColor: "#000000",
  cartDrawerHeaderColor: "#000000",
  cartIconType: "default",
  cartDefaultIcon: "cart",
  cartIconUrl: "",
  discountCodeApply: false,
  checkoutButtonText: "Checkout",
  drawerAutoOpen: true,
  drawerPosition: "right",
  stickyCheckout: true,
  mobileLayout: "drawer",
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
        'cartDrawerGradientEnd'
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
      SELECT cartIconUrl, cartIconType, cartDefaultIcon, cartDrawerGradientStart, cartDrawerGradientEnd
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

const formatAdminMoney = (amount, currencyCode = "INR") => {
  const value = Number(amount);
  if (!Number.isFinite(value)) return "";
  return `${value.toLocaleString("en-IN", {
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  })} ${currencyCode}`;
};

const productToUpsellPreview = (product, tag) => {
  const variant = product?.variants?.nodes?.[0] || product?.variants?.edges?.[0]?.node || null;
  return {
    id: product?.id || product?.legacyResourceId || product?.title,
    title: product?.title || "Product",
    tag,
    price: formatAdminMoney(variant?.price, variant?.currencyCode) || "300 INR",
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

async function loadUpsellPreviewItems(admin, upsellSettings) {
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
        productToUpsellPreview(product, "Selected product")
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
            productToUpsellPreview(product, collection?.title ? `From ${collection.title}` : "Selected collection")
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
      productToUpsellPreview(product, "")
    );
  } catch (err) {
    console.warn("[app.customize-preview] Upsell preview product load failed:", err?.message);
    return [];
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
    upsellSettings, codeDiscountRules, rawCartGoalRules,
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
      select: { progressTextBefore: true, progressTextAfter: true, minPurchase: true, cartStepName: true, iconChoice: true, campaignName: true },
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
    prisma.cartGoalRule.findMany({
      where: { shop, enabled: true },
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        campaignName: true,
        enabled: true,
        trackBy: true,
        shownGoals: true,
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

  const [styleWithIcon, upsellPreviewItems] = await Promise.all([
    loadCartIconUrl(prisma, styleRow),
    loadUpsellPreviewItems(admin, upsellSettings),
  ]);

  return {
    style: styleWithIcon || null,
    shippingRules: [],
    discountRules: [],
    freeGiftRules: [],
    upsellSettings: upsellSettings || null,
    upsellPreviewItems,
    codeDiscountRules: codeDiscountRules || [],
    cartGoalRules,
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
    buttonColor: parseText(d.buttonColor) || DEFAULT_STYLE.buttonColor,
    buttonLabelColor: parseText(d.buttonLabelColor) || DEFAULT_STYLE.buttonLabelColor,
    borderColor: parseText(d.borderColor) || DEFAULT_STYLE.borderColor,
    iconColor: parseText(d.iconColor) || DEFAULT_STYLE.iconColor,
    announcementBarBackgroundColor: parseText(d.announcementBarBackgroundColor) || DEFAULT_STYLE.announcementBarBackgroundColor,
    announcementBarTextColor: parseText(d.announcementBarTextColor) || DEFAULT_STYLE.announcementBarTextColor,
    announcementBarText: parseText(d.announcementBarText) || DEFAULT_STYLE.announcementBarText,
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
    <div style={{ background: "#fff", border: "1px solid #e1e3e5", borderRadius: "12px", overflow: "hidden" }}>
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
        style={{ width: 36, height: 36, padding: 2, border: "1px solid #e1e3e5", borderRadius: 6, cursor: "pointer", flexShrink: 0 }}
        title={label}
      />
      <div style={{ flex: 1, minWidth: 90 }}>
        <TextField label={label} value={value || ""} onChange={onChange} autoComplete="off" />
      </div>
    </div>
  );
}

// ─── Cart drawer preview ──────────────────────────────────────────────────────

function fmtAmount(val) {
  const n = parseFloat(val);
  return isNaN(n) ? "$20" : `$${n % 1 === 0 ? n : n.toFixed(2)}`;
}

function resolveStepText(text, amount, discountOpts = {}) {
  if (!text) return null;
  const goalValue = discountOpts.goal ?? amount;
  const formattedGoal = discountOpts.trackBy === "quantity"
    ? String(goalValue ?? "")
    : fmtAmount(goalValue);
  let result = text
    .replace(/\{\{amount\}\}/gi, fmtAmount(amount))
    .replace(/\{\{goal\}\}/gi, formattedGoal);
  if (discountOpts.value !== undefined) {
    const valueType = String(discountOpts.valueType || "").toLowerCase();
    const ds = valueType === "percent" || valueType === "percentage"
      ? `${parseFloat(discountOpts.value)}%`
      : fmtAmount(discountOpts.value);
    result = result.replace(/\{\{discount\}\}/gi, ds);
  }
  if (discountOpts.x !== undefined) result = result.replace(/\{\{x\}\}/gi, String(discountOpts.x));
  if (discountOpts.y !== undefined) result = result.replace(/\{\{y\}\}/gi, String(discountOpts.y));
  result = result.replace(/\{\{[^}]+\}\}/g, "").trim();
  return result || null;
}

function formatDiscountValueWithOff(valueType, value) {
  const raw = String(value || "").trim();
  if (!raw) return "your discount";
  return String(valueType || "").toLowerCase() === "amount"
    ? `${fmtAmount(raw)} off`
    : `${parseFloat(raw)}% off`;
}

function formatCodeDiscountGoal(rule) {
  const triggerType = String(rule?.triggerType || "amount").toLowerCase();
  if (triggerType === "quantity") {
    const minQty = Number(rule?.minQuantity || 0);
    return `${minQty} item${minQty === 1 ? "" : "s"}`;
  }

  const minPurchase = Number(rule?.minPurchase || 0);
  return fmtAmount(minPurchase);
}

function resolveCodeDiscountBeforeMessage(rule) {
  const fallback = "Add {{goal}} more to use code {{discount_code}} and get {{discount_value_with_off}}!";
  return String(rule?.progressTextBefore || fallback)
    .replace(/\{\{goal\}\}/gi, formatCodeDiscountGoal(rule))
    .replace(/\{\{discount_code\}\}/gi, String(rule?.discountCode || "CODE").toUpperCase())
    .replace(/\{\{discount_value_with_off\}\}/gi, formatDiscountValueWithOff(rule?.valueType, rule?.value))
    .replace(/\{\{[^}]+\}\}/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
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
function ruleStepLabel(rule) {
  if (rule._ruleType === "shipping") {
    if (rule.rewardType === "reduce" && rule.amount) return `${fmtAmount(rule.amount)} shipping`;
    return "Free Shipping!";
  }
  if (rule._ruleType === "discount") {
    if (!rule.value) return "Discount";
    return rule.valueType === "percent" || rule.valueType === "percentage"
      ? `${parseFloat(rule.value)}% Off`
      : `${fmtAmount(rule.value)} Off`;
  }
  if (rule._ruleType === "free") return "Free Gift";
  return rule.campaignName || "Reward";
}

// Generates a default "before" progress message when merchant hasn't configured one
function buildDefaultProgressBefore(rule) {
  const amt = rule.triggerType === "quantity"
    ? String(rule.minQuantity || 0)
    : rule._ruleType === "shipping"
    ? fmtAmount(rule.minSubtotal)
    : fmtAmount(rule.minPurchase || "0");
  if (rule._ruleType === "shipping") {
    if (rule.rewardType === "reduce" && rule.amount)
      return `Spend ${amt} more to get ${fmtAmount(rule.amount)} shipping`;
    return `Spend ${amt} more for free shipping`;
  }
  if (rule._ruleType === "discount") {
    const lbl = !rule.value ? "a discount"
      : rule.valueType === "percent" || rule.valueType === "percentage" ? `${parseFloat(rule.value)}% off`
      : `${fmtAmount(rule.value)} off`;
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
function buildDefaultProgressAfter(rule) {
  if (rule._ruleType === "shipping") {
    if (rule.rewardType === "reduce" && rule.amount)
      return `${fmtAmount(rule.amount)} shipping unlocked! 🎉`;
    return "Free shipping unlocked! 🎉";
  }
  if (rule._ruleType === "discount") {
    if (!rule.value) return "Discount unlocked! 🎉";
    const lbl = rule.valueType === "percent" || rule.valueType === "percentage"
      ? `${parseFloat(rule.value)}% off`
      : `${fmtAmount(rule.value)} off`;
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

function CartDrawerPreview({
  bg, uiBg, textColor, progressTextColor, headerColor, buttonColor, buttonLabelColor,
  progress, radius, base, headingScale, font, checkoutText,
  announcementBg, announcementText, announcementBarText,
  shippingRules, discountRules, freeGiftRules, cartGoalRules, upsellSettings,
  upsellPreviewItems,
  codeDiscountRules,
  drawerBgMode, drawerImage, drawerGradientStart, drawerGradientEnd,
  drawerAutoOpen, drawerPosition, stickyCheckout, mobileLayout,
  discountCodeApply,
  borderColor, iconColor,
  cartIconUrl,
  cartIconType,
  cartDefaultIcon,
}) {
  const r = Number(radius) || 0;
  const fs = Number(base) || 12;
  const headingFs = Math.max(13, Number((fs * (Number(headingScale) || 1.25)).toFixed(2)));
  const fontFamily = font || DEFAULT_STYLE.font;
  const tc = textColor || "#000";       // body text (--sc-drawer-text-color)
  const ptc = progressTextColor || tc;  // progress/step text (--sc-text)
  const hc = headerColor || "#1a1a1a";
  const bc = buttonColor || "#000";
  const blc = buttonLabelColor || "#fff";
  const pc = progress || "#000";
  const brc = borderColor || "#e1e3e5";
  const ic = iconColor || pc;
  const uiSurface = uiBg || "#ffffff";
  const softPanel = drawerBgMode === "color" ? uiSurface : "rgba(255,255,255,0.76)";
  const progressPanelBg = withAlpha(pc, 0.1);
  const messageBannerBg = withAlpha(pc, 0.14);
  const gradStart = drawerGradientStart || DEFAULT_STYLE.cartDrawerGradientStart;
  const gradEnd = drawerGradientEnd || DEFAULT_STYLE.cartDrawerGradientEnd;
  // ── Build announcement messages ──────────────────────────────────────────────
  const announceMessages = [];
  if (announcementBarText) announceMessages.push(announcementBarText);
  (codeDiscountRules || []).forEach((r) => {
    const beforeMsg = resolveCodeDiscountBeforeMessage(r);
    if (beforeMsg) {
      announceMessages.push(beforeMsg);
      return;
    }
    if (r.discountCode) {
      const val = r.value ? ` • ${r.value}${r.valueType === "percent" ? "%" : ""} OFF` : "";
      announceMessages.push(`Use code ${r.discountCode}${val}`);
    } else if (r.progressTextBefore) {
      announceMessages.push(r.progressTextBefore);
    }
  });
  if (!announceMessages.length) announceMessages.push("Cart Announcement Goes here");

  // ── Build cart steps 1–4 ─────────────────────────────────────────────────────
  const topCartGoalCampaign = (cartGoalRules || [])[0] || null;
  const cartGoalPreviewRules = buildCartGoalPreviewRules(topCartGoalCampaign);
  const taggedRules = cartGoalPreviewRules.length ? cartGoalPreviewRules : [
    ...(shippingRules || []).map((r) => ({ ...r, _ruleType: "shipping", _defaultIcon: DeliveryIcon })),
    ...(discountRules || []).map((r) => ({ ...r, _ruleType: "discount", _defaultIcon: DiscountIcon })),
    ...(freeGiftRules || []).map((r) => ({ ...r, _ruleType: "free", _defaultIcon: GiftCardIcon })),
  ];

  const slotMap = { 1: null, 2: null, 3: null, 4: null };
  const unslotted = [];
  taggedRules.forEach((rule) => {
    const slot = parseStepNum(rule.cartStepName);
    if (slot && !slotMap[slot]) slotMap[slot] = rule;
    else unslotted.push(rule);
  });
  let ui = 0;
  for (let s = 1; s <= 4; s++) {
    if (!slotMap[s] && ui < unslotted.length) slotMap[s] = unslotted[ui++];
  }

  // Active step entries (slot number + rule)
  const steps = [1, 2, 3, 4]
    .map((n) => ({ slot: n, rule: slotMap[n] }))
    .filter((s) => s.rule !== null);

  const displaySteps = steps.length
    ? steps
    : PREVIEW_FALLBACK_STEPS.map((entry, index) => ({
        slot: index + 1,
        rule: entry.rule,
        fallbackLabel: entry.label,
      }));
  const stepCount = displaySteps.length;
  const stepPosition = (index) => (index === stepCount - 1 ? 100 : ((index + 1) / stepCount) * 100);
  const progressFill = stepCount ? stepPosition(0) : 33;

  // Label above bar: first pending step's progressTextBefore (with all placeholders resolved)
  const firstPending = displaySteps[0]?.rule;
  const nextGoalText = (() => {
    if (!firstPending) return "Add more to get Free Gift with this order";
    const amount = firstPending.triggerType === "quantity"
      ? firstPending.minQuantity
      : firstPending._ruleType === "shipping"
      ? firstPending.minSubtotal
      : firstPending.minPurchase;
    const discountOpts = firstPending._ruleType === "discount"
      ? { value: firstPending.value, valueType: firstPending.valueType, goal: amount, trackBy: firstPending.triggerType }
      : { goal: amount, trackBy: firstPending.triggerType };
    return resolveStepText(firstPending.progressTextBefore, amount, discountOpts)
      || buildDefaultProgressBefore(firstPending)
      || "Add more to get Free Gift with this order";
  })();

  const bannerHeadline = topCartGoalCampaign?.campaignName || "SampleMessage";
  const bannerPrefix = topCartGoalCampaign?.campaignName ? "" : "This is just a ";

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
      ? { value: rule.value, valueType: rule.valueType, goal: amount, trackBy: rule.triggerType }
      : { goal: amount, trackBy: rule.triggerType };
    return resolveStepText(rule.progressTextBelow, amount, discountOpts) || ruleStepLabel(rule);
  };

  // Free gift section
  const fgRule = (freeGiftRules || [])[0];
  const hasFreeGift = !!fgRule;
  const fgLabel = fgRule?.campaignName || "Free Gift";
  const fgText =
    resolveStepText(fgRule?.progressTextBefore, fgRule?.minPurchase) ||
    "Add more to unlock your free gift";

  const showUpsell = upsellSettings?.enabled !== false;
  const upsellProductIds = parseStoredIds(upsellSettings?.selectedProductIds);
  const upsellCollectionIds = parseStoredIds(upsellSettings?.selectedCollectionIds);
  const upsellMode = String(upsellSettings?.recommendationMode || "auto").toLowerCase();
  const upsellSelectionKind =
    upsellMode === "manual" && upsellCollectionIds.length && !upsellProductIds.length
      ? "collections"
      : upsellMode === "manual"
        ? "products"
        : "auto";
  const upsellTitle = upsellSettings?.sectionTitle || "You may also like";
  const upsellButtonText = upsellSettings?.buttonText || "Add";
  const upsellIsSlider = upsellSettings?.showAsSlider !== false;
  const upsellBg = upsellSettings?.backgroundColor || bg || uiBg || "#ffffff";
  const upsellText = upsellSettings?.textColor || tc;
  const upsellBorder = upsellSettings?.borderColor || brc;
  const upsellButtonBg = upsellSettings?.buttonColor || bc;
  const upsellButtonTextColor = upsellSettings?.buttonTextColor || blc;
  const upsellArrowColor = upsellSettings?.arrowColor || ic;
  const configuredUpsellPreviewProducts = Array.isArray(upsellPreviewItems)
    ? upsellPreviewItems.filter(Boolean)
    : [];
  const fallbackUpsellPreviewProducts =
    upsellSelectionKind === "products"
      ? [
          { title: "Selected Product", tag: "Curated pick", price: "300 INR" },
          { title: "Matching Add-on", tag: "Manual upsell", price: "450 INR" },
        ]
      : upsellSelectionKind === "collections"
        ? [
            { title: "Collection Favorite", tag: "From selected collection", price: "300 INR" },
            { title: "New Arrival", tag: "Collection item", price: "450 INR" },
          ]
        : [
            { title: "Store Bestseller", tag: "Recommended for this cart", price: "300 INR" },
            { title: "Popular Add-on", tag: "", price: "450 INR" },
          ];
  const upsellPreviewProducts = configuredUpsellPreviewProducts.length
    ? configuredUpsellPreviewProducts
    : fallbackUpsellPreviewProducts;
  const [upsellPreviewIndex, setUpsellPreviewIndex] = useState(0);
  const activeUpsellIndex = upsellPreviewProducts.length
    ? Math.min(upsellPreviewIndex, upsellPreviewProducts.length - 1)
    : 0;
  const displayedUpsellProducts = upsellIsSlider
    ? upsellPreviewProducts.slice(activeUpsellIndex, activeUpsellIndex + 1)
    : upsellPreviewProducts.slice(0, 3);
  const canSlideUpsell = upsellIsSlider && upsellPreviewProducts.length > 1;
  const moveUpsellPreview = (direction) => {
    if (!canSlideUpsell) return;
    setUpsellPreviewIndex((current) => {
      const next = current + direction;
      if (next < 0) return upsellPreviewProducts.length - 1;
      if (next >= upsellPreviewProducts.length) return 0;
      return next;
    });
  };

  useEffect(() => {
    setUpsellPreviewIndex(0);
  }, [
    upsellMode,
    upsellSelectionKind,
    upsellIsSlider,
    upsellPreviewProducts.length,
    upsellSettings?.selectedProductIds,
    upsellSettings?.selectedCollectionIds,
  ]);

  useEffect(() => {
    if (!showUpsell || !canSlideUpsell || upsellSettings?.autoplay === false) return undefined;
    const timer = window.setInterval(() => {
      setUpsellPreviewIndex((current) => (current + 1) % upsellPreviewProducts.length);
    }, 2500);
    return () => window.clearInterval(timer);
  }, [showUpsell, canSlideUpsell, upsellSettings?.autoplay, upsellPreviewProducts.length]);

  const headerHasImage = drawerBgMode === "image" && drawerImage;
  const drawerSectionBg = uiSurface;
  const drawerBackgroundStyle = headerHasImage
    ? { backgroundImage: `linear-gradient(rgba(255,255,255,0.92), rgba(255,255,255,0.92)), url(${drawerImage})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: uiSurface };
  const headerBgStyle = headerHasImage
    ? { backgroundImage: `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url(${drawerImage})`, backgroundSize: "cover", backgroundPosition: "center" }
    : drawerBgMode === "gradient"
      ? { background: `linear-gradient(90deg, ${gradStart}, ${gradEnd})` }
      : { background: bg || uiSurface };

  const previewItemImageStyle = {
    width: 58,
    height: 58,
    borderRadius: Math.max(r, 8),
    border: `1px solid ${brc}`,
    background: softPanel,
    objectFit: "cover",
    flexShrink: 0,
  };

  const iconButtonStyle = {
    width: 24,
    height: 24,
    borderRadius: Math.max(r, 6),
    border: `1px solid ${brc}`,
    background: "#ffffff",
    color: ic,
    display: "grid",
    placeItems: "center",
    padding: 0,
    cursor: "pointer",
    flexShrink: 0,
  };

  // Cart item row using the compact sample layout from the storefront reference.
  const CartItem = ({ name, variant, price, image, badge, compareAt, isReward = false }) => (
    <div style={{ padding: "12px 14px", borderBottom: `1px solid ${brc}`, background: uiSurface }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <img src={image || "/images/upsellproduct.png"} alt={name} style={previewItemImageStyle} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: tc, fontSize: `${Math.max(fs, 13)}px`, lineHeight: "18px", fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {name}
              </div>
              <div style={{ color: tc, opacity: 0.55, fontSize: `${Math.max(fs - 1, 10)}px`, lineHeight: "16px", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {variant}
              </div>
            </div>
            <button type="button" aria-label={`Remove ${name}`} style={{ border: "none", background: "transparent", color: ic, opacity: 0.55, width: 22, height: 22, display: "grid", placeItems: "center", padding: 0, cursor: "pointer", flexShrink: 0 }}>
              <PreviewIcon source={XIcon} size={13} color="currentColor" />
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 10 }}>
            {isReward ? (
              <span style={{ color: pc, fontSize: `${Math.max(fs - 1, 10)}px`, fontWeight: 800 }}>{badge || "Free product"}</span>
            ) : (
              <div style={{ display: "inline-grid", gridTemplateColumns: "26px 22px 26px", alignItems: "center", gap: 4 }}>
                <button type="button" aria-label="Decrease quantity" style={{ ...iconButtonStyle, width: 26, height: 22, color: tc, opacity: 0.7 }}>-</button>
                <span style={{ color: tc, fontSize: `${Math.max(fs, 12)}px`, lineHeight: "22px", fontWeight: 800, textAlign: "center" }}>1</span>
                <button type="button" aria-label="Increase quantity" style={{ ...iconButtonStyle, width: 26, height: 22, color: tc, opacity: 0.7 }}>+</button>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 78, justifyContent: "flex-end" }}>
              {compareAt && <span style={{ color: tc, opacity: 0.45, textDecoration: "line-through", fontSize: `${Math.max(fs - 2, 10)}px`, fontWeight: 800 }}>{compareAt}</span>}
              <span style={{ color: isReward ? pc : tc, fontSize: `${Math.max(fs, 12)}px`, lineHeight: "18px", fontWeight: 900, whiteSpace: "nowrap" }}>{price}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const FreeGiftOffer = () => (
    <div style={{ margin: "10px 12px 0", border: `1px solid ${brc}`, borderRadius: Math.max(r, 10), background: uiSurface, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px" }}>
        <img src="/images/FreeProduct.png" alt={fgLabel} style={{ ...previewItemImageStyle, width: 52, height: 52 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: tc, fontSize: `${Math.max(fs, 13)}px`, lineHeight: "18px", fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {hasFreeGift ? fgLabel : "Free Gift!!"}
          </div>
          <div style={{ color: tc, opacity: 0.55, fontSize: `${Math.max(fs - 1, 10)}px`, lineHeight: "16px", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {hasFreeGift ? fgText : "Add more to get Free Gift with this order"}
          </div>
        </div>
        <button type="button" aria-label="View free gift" style={{ ...iconButtonStyle, border: "none", background: "transparent", color: ic, opacity: 0.65 }}>
          <PreviewIcon source={ChevronRightIcon} size={14} color="currentColor" />
        </button>
      </div>
      <div style={{ display: "flex", gap: 5, justifyContent: "center", padding: "0 0 10px" }}>
        {[0, 1, 2].map((n) => (
          <span key={n} style={{ width: n === 0 ? 16 : 6, height: 6, borderRadius: 999, background: n === 0 ? pc : brc, display: "inline-block" }} />
        ))}
      </div>
    </div>
  );

  const UpsellPreview = () => (
    <div style={{ padding: "14px 12px 10px", background: upsellBg }}>
      <div style={{ color: upsellText, opacity: 0.72, fontSize: `${Math.max(fs, 12)}px`, lineHeight: "16px", fontWeight: 800, textAlign: "center", marginBottom: 10 }}>
        {upsellTitle.endsWith("...") ? upsellTitle : `${upsellTitle}...`}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: upsellIsSlider ? "24px minmax(0, 1fr) 24px" : "minmax(0, 1fr)", gap: 6, alignItems: "center" }}>
          {upsellIsSlider && (
            <button
              type="button"
              aria-label="Previous upsell product"
              onClick={() => moveUpsellPreview(-1)}
              disabled={!canSlideUpsell}
              style={{ ...iconButtonStyle, borderColor: upsellBorder, color: upsellArrowColor, borderRadius: "50%", opacity: canSlideUpsell ? 1 : 0.45, cursor: canSlideUpsell ? "pointer" : "default" }}
            >
              <PreviewIcon source={ChevronLeftIcon} size={13} color={upsellArrowColor} />
            </button>
          )}

          <div style={{ display: "grid", gap: 8 }}>
            {displayedUpsellProducts.map((product, index) => (
              <div
                key={upsellIsSlider ? `${product.id || product.title || index}-${activeUpsellIndex}` : product.id || product.title || index}
                style={{
                  display: "grid",
                  gridTemplateColumns: "58px minmax(0, 1fr) auto",
                  gap: 10,
                  alignItems: "center",
                  padding: 0,
                  background: "transparent",
                  animation: upsellIsSlider ? "cp-upsell-slide-in 220ms ease-out" : "none",
                }}
              >
                {product.image ? (
                  <img src={product.image} alt={product.title} style={{ ...previewItemImageStyle, width: 58, height: 44, borderColor: upsellBorder }} />
                ) : (
                  <div style={{ width: 58, height: 44, borderRadius: Math.max(r, 8), border: `1px solid ${upsellBorder}`, background: "#f5f7fb", display: "flex", alignItems: "center", justifyContent: "center", color: upsellArrowColor }}>
                    <PreviewIcon source={PackageFulfilledIcon} size={20} color="currentColor" />
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: upsellText, fontSize: `${Math.max(fs - 1, 11)}px`, lineHeight: "15px", fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {product.title}
                  </div>
                  <div style={{ color: upsellText, fontSize: `${Math.max(fs - 2, 10)}px`, lineHeight: "14px", fontWeight: 900, marginTop: 2 }}>
                    {product.price}
                  </div>
                </div>
                <button type="button" style={{ border: "none", borderRadius: Math.max(r, 6), backgroundColor: upsellButtonBg, color: upsellButtonTextColor, fontSize: `${Math.max(fs - 1, 11)}px`, lineHeight: "14px", fontWeight: 900, padding: "9px 12px", maxWidth: 86, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", cursor: "pointer" }}>
                  {upsellButtonText}
                </button>
              </div>
            ))}
          </div>

          {upsellIsSlider && (
            <button
              type="button"
              aria-label="Next upsell product"
              onClick={() => moveUpsellPreview(1)}
              disabled={!canSlideUpsell}
              style={{ ...iconButtonStyle, borderColor: upsellBorder, color: upsellArrowColor, borderRadius: "50%", opacity: canSlideUpsell ? 1 : 0.45, cursor: canSlideUpsell ? "pointer" : "default" }}
            >
              <PreviewIcon source={ChevronRightIcon} size={13} color={upsellArrowColor} />
            </button>
          )}
        </div>

        {upsellIsSlider && (
          <div style={{ display: "flex", gap: 5, justifyContent: "center", padding: "12px 0 0" }}>
            {upsellPreviewProducts.map((product, n) => (
              <button
                key={product.id || product.title || n}
                type="button"
                aria-label={`Show upsell product ${n + 1}`}
                onClick={() => setUpsellPreviewIndex(n)}
                style={{ width: n === activeUpsellIndex ? 18 : 6, height: 6, borderRadius: 999, background: n === activeUpsellIndex ? upsellButtonBg : upsellBorder, border: "none", padding: 0, cursor: "pointer" }}
              />
            ))}
          </div>
        )}
    </div>
  );

  const annColor = announcementText || "#fff";

  return (
    <div style={{ border: `1px solid ${brc}`, borderRadius: Math.max(r, 10), overflow: "hidden", ...drawerBackgroundStyle, color: tc, userSelect: "none", minHeight: 680, height: 680, display: "flex", flexDirection: "column", fontSize: `${fs}px`, fontFamily }}>
      {/* Marquee keyframes */}
      <style>{`
        @keyframes cp-mq{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @keyframes cp-upsell-slide-in{0%{opacity:0;transform:translateX(18px)}100%{opacity:1;transform:translateX(0)}}
      `}</style>

      {/* ── Header ── */}
      <div style={{ ...headerBgStyle, padding: "14px 16px", flexShrink: 0 }}>
        <InlineStack align="space-between" blockAlign="center" wrap={false}>
          <span style={{ color: hc, fontWeight: 900, fontSize: `${Math.max(headingFs, 20)}px`, lineHeight: 1.1, textShadow: headerHasImage ? "0 1px 4px rgba(0,0,0,0.5)" : "none" }}>Cart</span>
          <div style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.94)", border: `1px solid ${brc}`, borderRadius: 20, padding: "4px 10px", cursor: "pointer", color: ic }}>
            <PreviewIcon source={XIcon} size={12} color={ic} />
            <span style={{ color: tc, fontSize: `${Math.max(fs - 2, 10)}px`, lineHeight: "14px", fontWeight: 700 }}>Close</span>
          </div>
        </InlineStack>
      </div>

      {/* ── Announcement bar — sliding marquee ── */}
      <div style={{ background: announcementBg || "#000", borderBottom: `1px solid ${brc}`, overflow: "hidden", flexShrink: 0 }}>
        <div style={{ padding: "7px 0" }}>
          <div style={{ display: "flex", width: "max-content", animation: "cp-mq 16s linear infinite", willChange: "transform" }}>
            {[0, 1].map((k) => (
              <span key={k} style={{ display: "inline-flex", alignItems: "center", paddingRight: 56, whiteSpace: "nowrap" }}>
                {announceMessages.map((msg, i) => (
                  <span key={i} style={{ display: "inline-flex", alignItems: "center" }}>
                    {i > 0 && <span style={{ margin: "0 10px", color: annColor, opacity: 0.45 }}>★</span>}
                    <span style={{ color: annColor, fontSize: `${Math.max(fs - 1, 11)}px`, fontWeight: 600 }}>{msg}</span>
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Goal message banner ── */}
      <div style={{ background: messageBannerBg, borderBottom: `1px solid ${withAlpha(pc, 0.18)}`, padding: "10px 14px", flexShrink: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "18px minmax(0, 1fr)", gap: 8, alignItems: "center" }}>
          <PreviewIcon source={ChevronLeftIcon} size={14} color={ptc} />
          <div style={{ textAlign: "center", color: ptc, fontSize: `${Math.max(fs, 12)}px`, lineHeight: "16px", fontWeight: 600 }}>
            {bannerPrefix}
            <span style={{ fontWeight: 900 }}>{bannerHeadline}</span>
          </div>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: drawerSectionBg, overflow: "hidden" }}>
      {/* ── Cart steps progress ── */}
      <div style={{ margin: "10px 12px 0", padding: "14px 12px 12px", borderRadius: Math.max(r, 12), background: progressPanelBg, border: `1px solid ${withAlpha(pc, 0.16)}`, flexShrink: 0 }}>
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <span style={{ fontSize: `${Math.max(fs - 1, 11)}px`, lineHeight: "15px", color: ptc, fontWeight: 700 }}>{nextGoalText}</span>
        </div>
        <div style={{ position: "relative", height: 68, margin: "0 4px" }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 15, height: 8, background: pc, opacity: 0.35, borderRadius: 999 }} />
          <div style={{ position: "absolute", left: 0, top: 15, height: 8, width: `${progressFill}%`, background: pc, borderRadius: 999, zIndex: 1, transition: "width .25s ease" }} />
          {displaySteps.map((step, index) => {
            const pct = stepPosition(index);
            const done = pct <= progressFill;
            const iconSrc = iconForChoice(step.rule?.iconChoice, step.rule?._defaultIcon || GiftCardIcon);
            return (
              <div
                key={step.slot || index}
                style={{
                  position: "absolute",
                  top: 0,
                  left: `${pct}%`,
                  transform: index === stepCount - 1 ? "translateX(-70%)" : "translateX(-50%)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  minWidth: 76,
                  zIndex: 2,
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    background: done ? pc : "#ffffff",
                    border: `2px solid ${done ? pc : "#6f6f6f"}`,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.14)",
                    display: "grid",
                    placeItems: "center",
                    color: done ? blc : pc,
                  }}
                >
                  <PreviewIcon source={iconSrc} size={16} color={done ? blc : pc} />
                </div>
                <div style={{ marginTop: 6, fontSize: `${Math.max(fs - 3, 9)}px`, lineHeight: "12px", color: ptc, fontWeight: 800, textAlign: "center", whiteSpace: "nowrap", maxWidth: 92, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {resolveStepLabel(step)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Cart items area ── */}
      <div style={{ flex: 1, minHeight: 0, overflow: "auto", margin: "10px 5px 0", border: `1px solid ${brc}`, borderRadius: Math.max(r, 10), background: uiSurface }}>
      <CartItem name="Sample Product" variant="Small" price="300 INR" image="/images/upsellproduct.png" />
      <FreeGiftOffer />

      {showUpsell && <UpsellPreview />}

      {/* ── Free gift reward row ── */}
      {false && (
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${brc}` }}>
          <InlineStack align="start" blockAlign="center" gap="300" wrap={false}>
            <div style={{ width: 48, height: 48, background: "#f0f0f0", borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <PreviewIcon source={iconForChoice(fgRule?.iconChoice, GiftCardIcon)} size={22} color={ic} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: tc, fontWeight: 600 }}>{fgLabel}</div>
              <div style={{ marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                <span style={{ color: tc, opacity: 0.65 }}>{fgText}</span>
              </div>
              <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                {[0, 1, 2].map((n) => <div key={n} style={{ width: 6, height: 6, borderRadius: "50%", background: n === 0 ? pc : brc }} />)}
              </div>
            </div>
            <div style={{ width: 28, height: 28, borderRadius: "50%", border: `1px solid ${brc}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <PreviewIcon source={ChevronRightIcon} size={14} color={ic} />
            </div>
          </InlineStack>
        </div>
      )}

      {/* ── Upsell section ── */}

      {/* ── Discount code input ── */}
      <div style={{ flex: 1, minHeight: 24 }} />
      </div>
      </div>

      {discountCodeApply && (
        <div style={{ padding: "10px 14px 0", background: uiSurface, flexShrink: 0 }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 8 }}>
            <div>
              <TextField
                label="Discount code"
                labelHidden
                placeholder="Apply Discount Code"
                value=""
                onChange={() => {}}
                autoComplete="off"
              />
            </div>
            <button
              type="button"
              style={{
                alignSelf: "stretch",
                minHeight: 40,
                minWidth: 70,
                border: `1px solid ${bc}`,
                borderRadius: Math.max(r, 6),
                backgroundColor: "#ffffff",
                color: bc,
                fontSize: `${Math.max(fs, 12)}px`,
                fontWeight: 900,
                padding: "0 14px",
                cursor: "pointer",
              }}
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* ── Total + Checkout ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", alignItems: "stretch", borderTop: `1px solid ${brc}`, position: stickyCheckout ? "sticky" : "relative", bottom: stickyCheckout ? 0 : "auto", background: uiSurface, boxShadow: stickyCheckout ? "0 -8px 18px rgba(15,23,42,0.08)" : "none", flexShrink: 0 }}>
        <div style={{ padding: "11px 16px" }}>
          <BlockStack gap="050">
            <span style={{ color: tc, opacity: 0.7, fontSize: `${Math.max(fs - 2, 10)}px`, lineHeight: "13px", fontWeight: 700 }}>Total</span>
            <span style={{ color: tc, fontSize: `${Math.max(fs + 3, 15)}px`, lineHeight: "18px", fontWeight: 900 }}>327 INR</span>
          </BlockStack>
        </div>
        <div style={{ background: bc, color: blc, padding: "0 18px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: `${Math.max(fs, 13)}px`, lineHeight: "18px", fontWeight: 900, cursor: "pointer", minWidth: 0, borderRadius: `0 0 ${Math.max(r, 0)}px 0`, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {checkoutText || "Checkout"}
        </div>
      </div>

    </div>
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
  const cartGoalRules = loaderData?.cartGoalRules || [];
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
  const [buttonColor, setButtonColor] = useState(s.buttonColor ?? DEFAULT_STYLE.buttonColor);
  const [buttonLabelColor, setButtonLabelColor] = useState(s.buttonLabelColor ?? DEFAULT_STYLE.buttonLabelColor);
  const [borderColor, setBorderColor] = useState(s.borderColor ?? DEFAULT_STYLE.borderColor);
  const [iconColor, setIconColor] = useState(s.iconColor ?? DEFAULT_STYLE.iconColor);
  const [announcementBg, setAnnouncementBg] = useState(s.announcementBarBackgroundColor ?? DEFAULT_STYLE.announcementBarBackgroundColor);
  const [announcementText, setAnnouncementText] = useState(s.announcementBarTextColor ?? DEFAULT_STYLE.announcementBarTextColor);
  const [announcementBarMsg, setAnnouncementBarMsg] = useState(s.announcementBarText ?? DEFAULT_STYLE.announcementBarText);

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
      textColor, bg, progress, buttonColor, buttonLabelColor, borderColor, iconColor,
      announcementBarBackgroundColor: announcementBg, announcementBarTextColor: announcementText, announcementBarText: announcementBarMsg,
      checkoutButtonText, discountCodeApply,
      cartIconType, cartDefaultIcon, cartIconUrl,
      cartDrawerBackgroundMode: drawerBgMode,
      cartDrawerBackground: drawerBg,
      cartDrawerImage: drawerImage,
      cartDrawerGradientStart: drawerGradientStart,
      cartDrawerGradientEnd: drawerGradientEnd,
      cartDrawerTextColor: drawerTextColor,
      cartDrawerHeaderColor: drawerHeaderColor,
      drawerAutoOpen, drawerPosition, stickyCheckout, mobileLayout,
    }, { method: "post", encType: "application/json" });
  };

  const previewBg = drawerBgMode === "color" ? (drawerBg || bg || "#fff") : drawerBgMode === "gradient" ? `linear-gradient(180deg, ${drawerGradientStart}, ${drawerGradientEnd})` : "#fff";

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

      <Box paddingBlockEnd="800">
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
                  <ColorField label="Background" value={bg} onChange={setBg} />
                  <ColorField label="Progress bar" value={progress} onChange={setProgress} />
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
                <TextField
                  label="Announcement text"
                  value={announcementBarMsg}
                  onChange={setAnnouncementBarMsg}
                  autoComplete="off"
                  placeholder="Free shipping on orders over $50! 🎉"
                  helpText="Text shown in the announcement strip at the top of the cart drawer."
                />
                <div className="cp-color-grid">
                  <ColorField label="Background" value={announcementBg} onChange={setAnnouncementBg} />
                  <ColorField label="Text color" value={announcementText} onChange={setAnnouncementText} />
                </div>
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
                    <div style={{ width: 44, height: 44, border: "1px solid #dcdfe4", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: iconColor || "#000000", flexShrink: 0 }}>
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
                        style={{ width: 48, height: 48, objectFit: "contain", border: "1px solid #dcdfe4", borderRadius: 6, padding: 6, background: "#fff" }}
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
                {/* Background */}
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

                {/* Drawer text colors */}
                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">Drawer text</Text>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <ColorField label="Text color" value={drawerTextColor} onChange={setDrawerTextColor} />
                    <ColorField label="Heading color" value={drawerHeaderColor} onChange={setDrawerHeaderColor} />
                  </div>
                </BlockStack>

                <Divider />

                {/* Checkout */}
                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">Checkout</Text>
                  <TextField
                    label="Checkout button label"
                    value={checkoutButtonText}
                    onChange={setCheckoutButtonText}
                    autoComplete="off"
                    placeholder="Checkout"
                    helpText="Text shown on the checkout button inside the cart drawer."
                  />
                  <Checkbox
                    label="Show discount code input"
                    checked={discountCodeApply}
                    onChange={setDiscountCodeApply}
                    helpText="Lets customers enter and apply a discount code from inside the cart drawer."
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
                  radius={radius}
                  base={base}
                  headingScale={headingScale}
                  font={font}
                  checkoutText={checkoutButtonText}
                  announcementBg={announcementBg}
                  announcementText={announcementText}
                  announcementBarText={announcementBarMsg}
                  shippingRules={shippingRules}
                  discountRules={discountRules}
                  freeGiftRules={freeGiftRules}
                  cartGoalRules={cartGoalRules}
                  upsellSettings={upsellSettings}
                  upsellPreviewItems={upsellPreviewItems}
                  codeDiscountRules={codeDiscountRules}
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
  const { useRouteError } = require("react-router");
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
