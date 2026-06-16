import prisma from "../db.server.js";
import crypto from "crypto";
import logger from "../lib/logger.server.js";
import { apiVersion } from "../shopify.server.js";
import { getShopFromRequest } from "../lib/shopUtils.server.js";
// Note: `proxy.smart.jsx` re-exports this loader for the app proxy path (/proxy/smart).

// Use centralized API version from shopify.server.js
const ADMIN_API_VERSION = apiVersion;
const APP_PROXY_HMAC_TOLERANCE_SEC = 300;

// Short-lived per-shop in-memory cache to avoid hitting DB + Shopify APIs on every storefront page load.
// Rules are stored raw; per-request filtering (customer/schedule/ab-test) still happens at response time.
const SHOP_DATA_CACHE = new Map();
const SHOP_DATA_TTL_MS = 30_000; // 30 seconds
const SHOP_DATA_STALE_TTL_MS = 10 * 60_000; // 10 minutes

const getShopCache = (shop, { allowStale = false } = {}) => {
  const entry = SHOP_DATA_CACHE.get(shop);
  if (!entry) return null;

  const now = Date.now();
  if (now < entry.expiry) return entry.data;
  if (allowStale && now < entry.staleExpiry) return entry.data;

  SHOP_DATA_CACHE.delete(shop);
  return null;
};

const setShopCache = (shop, data) => {
  const now = Date.now();
  if (SHOP_DATA_CACHE.size >= 500) {
    SHOP_DATA_CACHE.delete(SHOP_DATA_CACHE.keys().next().value);
  }
  SHOP_DATA_CACHE.set(shop, {
    data,
    expiry: now + SHOP_DATA_TTL_MS,
    staleExpiry: now + SHOP_DATA_STALE_TTL_MS,
  });
};

// Call this whenever a merchant saves settings so the cache is immediately invalidated.
export const invalidateShopCache = (shop) => {
  SHOP_DATA_CACHE.delete(shop);
};

const jsonResponse = (data, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...(status >= 400 ? { "Cache-Control": "no-store" } : {}),
      ...extraHeaders,
    },
  });

const DEFAULT_ADD_TO_CART_BAR_SETTINGS = {
  status: "active",
  mobileShowCondition: "notinview",
  mobileScrollDepth: 380,
  mobileStickyPosition: "bottom",
  mobileCtaAnimation: "pulse",
  mobileBgColor: "#ffffff",
  mobileTextColor: "#111827",
  mobileCtaBgColor: "#111827",
  mobileCtaTextColor: "#ffffff",
  mobileImageOutlineColor: "#e5e7eb",
  mobileShowProductImage: true,
  mobileShowProductTitle: true,
  mobileShowPrice: true,
  mobileShowCompareAtPrice: true,
  mobileShowQuantity: true,
  mobileShowVariantSelector: true,
  mobileShowVariantLabel: true,
  mobileShowPriceOnCta: true,
  mobileShowCompareAtPriceOnCta: true,
  desktopShowCondition: "notinview",
  desktopScrollDepth: 380,
  desktopStickyPosition: "bottom",
  desktopCtaAnimation: "pulse",
  desktopBgColor: "#ffffff",
  desktopTextColor: "#111827",
  desktopCtaBgColor: "#111827",
  desktopCtaTextColor: "#ffffff",
  desktopImageOutlineColor: "#e5e7eb",
  desktopShowProductImage: true,
  desktopShowProductTitle: true,
  desktopShowPrice: true,
  desktopShowCompareAtPrice: true,
  desktopShowQuantity: true,
  desktopShowVariantSelector: true,
  desktopShowVariantLabel: true,
  desktopShowPriceOnCta: true,
  desktopShowCompareAtPriceOnCta: true,
  ctaBehavior: "addToCart",
  afterAddToCart: "openCartWidget",
  desktopZIndex: 5000,
  mobileZIndex: 5000,
};

const emptyShopData = () => ({
  authorized: false,
  metadata: null,
  _rawShippingRules: [],
  _rawDiscountRules: [],
  _rawFreeGiftRules: [],
  _rawBxgyRules: [],
  _rawCartGoalRules: [],
  styleSettings: null,
  upsellSettings: null,
  addToCartBarSettings: { ...DEFAULT_ADD_TO_CART_BAR_SETTINGS },
  addToCartBarProduct: null,
  upsellProducts: [],
  upsellSelectedProducts: [],
  upsellSelectedCollections: [],
});

const DISCOUNT_RULE_SELECT = {
  id: true,
  shop: true,
  type: true,
  value: true,
  minPurchase: true,
  triggerType: true,
  minQuantity: true,
  enabled: true,
  updatedAt: true,
  iconChoice: true,
  shopifyDiscountCodeId: true,
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
  iconChoice: true,
  bonusProductId: true,
  freeProductDiscountID: true,
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

const timingSafeEqual = (a, b) => {
  const left = Buffer.from(String(a || ""), "utf8");
  const right = Buffer.from(String(b || ""), "utf8");
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
};

const isTimestampFresh = (timestampRaw) => {
  const ts = Number(timestampRaw || 0);
  if (!Number.isFinite(ts) || ts <= 0) return false;
  const now = Math.trunc(Date.now() / 1000);
  return Math.abs(now - ts) <= APP_PROXY_HMAC_TOLERANCE_SEC;
};

const verifyAppProxySignature = (request) => {
  const secret = process.env.SHOPIFY_API_SECRET || "";
  if (!secret) return false;

  const url = new URL(request.url);
  const params = {};

  for (const [key, value] of url.searchParams.entries()) {
    if (key === "signature" || key === "hmac") continue;
    if (params[key] == null) {
      params[key] = value;
    } else if (Array.isArray(params[key])) {
      params[key].push(value);
    } else {
      params[key] = [params[key], value];
    }
  }

  const providedSignature = url.searchParams.get("signature") || "";
  if (!providedSignature) return false;
  if (!isTimestampFresh(params.timestamp)) return false;

  const sorted = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .reduce((acc, [key, value]) => {
      const normalizedValue = Array.isArray(value) ? value.join(",") : String(value ?? "");
      return `${acc}${key}=${normalizedValue}`;
    }, "");

  const local = crypto.createHmac("sha256", secret).update(sorted).digest("hex");
  return timingSafeEqual(providedSignature, local);
};

// getShopFromRequest is now imported from shopUtils.server.js

const buildShopMetadata = (shopRow) => {
  if (!shopRow) return null;
  return {
    installed: Boolean(shopRow.installed),
    onboardedAt: shopRow.onboardedAt?.toISOString() ?? null,
    uninstalledAt: shopRow.uninstalledAt?.toISOString() ?? null,
    updatedAt: shopRow.updatedAt?.toISOString() ?? null,
  };
};

const isRuleScheduleActive = (rule = {}, now = new Date()) => {
  const nowTime = now.getTime();
  const startsAt = rule?.startsAt ? new Date(rule.startsAt).getTime() : null;
  const endsAt = rule?.endsAt ? new Date(rule.endsAt).getTime() : null;
  if (Number.isFinite(startsAt) && startsAt > nowTime) return false;
  if (Number.isFinite(endsAt) && endsAt < nowTime) return false;
  return true;
};

const parseJsonObject = (value, fallback = {}) => {
  if (!value) return fallback;
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
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

const parseDelimitedList = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const getRequestContext = (request) => {
  const url = new URL(request.url);
  return {
    customerLoggedIn: ["1", "true", "yes"].includes(
      String(url.searchParams.get("customer_logged_in") || "").toLowerCase()
    ),
    customerTags: parseDelimitedList(url.searchParams.get("customer_tags")).map(
      (tag) => tag.toLowerCase()
    ),
    locale: String(url.searchParams.get("locale") || "").toLowerCase(),
    abSeed: String(url.searchParams.get("ab_seed") || ""),
  };
};

const ruleMatchesCustomer = (rule = {}, context = {}) => {
  const target = String(rule.customerTarget || "all");
  if (target === "logged_in") return Boolean(context.customerLoggedIn);
  if (target === "guest") return !context.customerLoggedIn;
  if (target === "tags" || target === "has_tag" || target === "no_tag") {
    const neededTags = parseDelimitedList(rule.customerTags).map((tag) =>
      tag.toLowerCase()
    );
    if (!neededTags.length) return true;
    const hasMatchingTag = neededTags.some((tag) => context.customerTags.includes(tag));
    return target === "no_tag" ? !hasMatchingTag : hasMatchingTag;
  }
  return true;
};

const ruleMatchesAbTest = (rule = {}, context = {}) => {
  if (!rule.abTestEnabled) return true;
  const variant = String(rule.abTestVariant || "A").toUpperCase();
  const seed = context.abSeed || context.customerTags.join("|") || "guest";
  const bucket = Array.from(seed).reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0
  ) % 2;
  return variant === (bucket === 0 ? "A" : "B");
};

const applyRuleTranslations = (rule = {}, locale = "") => {
  if (!locale) return rule;
  const translations = parseJsonObject(rule.translations, {});
  const exact = parseJsonObject(translations[locale], null);
  const language = locale.split("-")[0];
  const languageMatch = parseJsonObject(translations[language], null);
  const translated = exact || languageMatch;
  if (!translated) return rule;
  return { ...rule, ...translated };
};

const rulePrioritySort = (a = {}, b = {}) => {
  const priorityDiff = Number(b.priority || 0) - Number(a.priority || 0);
  if (priorityDiff) return priorityDiff;

  const bUpdated = new Date(b.updatedAt || 0).getTime() || 0;
  const aUpdated = new Date(a.updatedAt || 0).getTime() || 0;
  const updatedDiff = bUpdated - aUpdated;
  if (updatedDiff) return updatedDiff;

  return Number(b.id || 0) - Number(a.id || 0);
};

const filterActiveScheduledRules = (rules = [], now = new Date(), context = {}) =>
  (Array.isArray(rules) ? rules : [])
    .filter((rule) => rule?.enabled !== false && rule?.enabled !== 0)
    .filter((rule) => isRuleScheduleActive(rule, now))
    .filter((rule) => ruleMatchesCustomer(rule, context))
    .filter((rule) => ruleMatchesAbTest(rule, context))
    .map((rule) => applyRuleTranslations(rule, context.locale))
    .sort(rulePrioritySort);

const buildProxyPayload = (shop, shopData, request, extras = {}) => {
  const scheduleNow = new Date();
  const ruleContext = getRequestContext(request);

  const activeCodeDiscountRules = filterActiveScheduledRules(
    shopData._rawDiscountRules,
    scheduleNow,
    ruleContext
  ).filter((rule) => String(rule?.type || "").toLowerCase() === "code");
  const activeCartGoalRules = filterActiveScheduledRules(
    shopData._rawCartGoalRules,
    scheduleNow,
    ruleContext
  );

  return {
    ok: true,
    shop,
    authorized: Boolean(shopData.authorized),
    metadata: shopData.metadata,
    shippingRules: [],
    discountRules: activeCodeDiscountRules,
    freeGiftRules: [],
    bxgyRules: filterActiveScheduledRules(shopData._rawBxgyRules, scheduleNow, ruleContext),
    cartGoalRules: activeCartGoalRules.slice(0, 1),
    styleSettings: shopData.styleSettings,
    upsellSettings: shopData.upsellSettings,
    addToCartBarSettings: {
      ...DEFAULT_ADD_TO_CART_BAR_SETTINGS,
      ...(shopData.addToCartBarSettings ?? {}),
    },
    addToCartBarProduct: shopData.addToCartBarProduct,
    upsellProducts: shopData.upsellProducts,
    upsellSelectedProducts: shopData.upsellSelectedProducts,
    upsellSelectedCollections: shopData.upsellSelectedCollections,
    fetchedAt: new Date().toISOString(),
    ...extras,
  };
};

const isDatabaseConnectionError = (error) =>
  error?.name === "PrismaClientInitializationError" ||
  error?.code === "P1001" ||
  /can't reach database server|database server is running|connect\s+etimedout|econnrefused|schema engine error/i.test(
    String(error?.message || "")
  );

const mergeStyleCartIconUrl = async (styleSettings) => {
  if (!styleSettings?.id) return styleSettings;

  try {
    const rows = await prisma.$queryRaw`
      SELECT cartIconUrl, cartIconType, cartDefaultIcon, cartDrawerGradientStart, cartDrawerGradientEnd, offerButtonEnabled, progressBg
      FROM stylesettings
      WHERE id = ${styleSettings.id}
      LIMIT 1
    `;
    const row = Array.isArray(rows) ? rows[0] : null;
    return {
      ...styleSettings,
      cartIconUrl: row?.cartIconUrl || "",
      cartIconType: row?.cartIconType || "default",
      cartDefaultIcon: row?.cartDefaultIcon || "cart",
      cartDrawerGradientStart: row?.cartDrawerGradientStart || styleSettings.cartDrawerGradientStart || "",
      cartDrawerGradientEnd: row?.cartDrawerGradientEnd || styleSettings.cartDrawerGradientEnd || "",
      offerButtonEnabled: row?.offerButtonEnabled !== false && row?.offerButtonEnabled !== 0,
      progressBg: row?.progressBg || "",
    };
  } catch (error) {
    logger.warn("[proxy] Failed to load style cart icon URL", error);
    return styleSettings;
  }
};

const buildVariantOptions = (product, variant) => {
  const opts = Array.isArray(product?.options) ? product.options : [];
  const values = [];
  const raw = [variant?.option1, variant?.option2, variant?.option3];
  for (let i = 0; i < opts.length; i += 1) {
    const name = opts[i]?.name;
    const value = raw[i];
    if (!name || !value) continue;
    values.push({ name, value });
  }
  return values;
};

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

const parseCartGoalLocalDateTime = (date, time) => {
  const trimmedDate = String(date || "").trim();
  const trimmedTime = String(time || "").trim();
  if (!trimmedDate) return null;

  const dateMatch = trimmedDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateMatch) return null;

  let hours = 0;
  let minutes = 0;
  if (trimmedTime) {
    const timeMatch = trimmedTime.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
    if (!timeMatch) return null;

    hours = Number(timeMatch[1]);
    minutes = Number(timeMatch[2] || 0);
    const meridiem = String(timeMatch[3] || "").toUpperCase();
    if (meridiem === "AM" && hours === 12) hours = 0;
    if (meridiem === "PM" && hours < 12) hours += 12;
  }

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  const [, year, month, day] = dateMatch;
  const utcMs = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    hours,
    minutes
  );
  // The admin schedule fields are saved from the merchant UI as local wall time.
  // This app is operated in IST, while Vercel parses bare date strings as UTC.
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  return new Date(utcMs - istOffsetMs);
};

const cartGoalScheduleDateTime = (date, time) => {
  if (!date) return null;
  const parsed =
    parseCartGoalLocalDateTime(date, time) ||
    new Date(time ? `${date} ${time}` : date);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const mapCartGoalRuleForProxy = (rule = {}) => ({
  ...rule,
  goals: parseCartGoalArray(rule.goals),
  targetingRules: parseCartGoalArray(rule.targetingRules),
  startsAt: cartGoalScheduleDateTime(rule.startDate, rule.startTime),
  endsAt: rule.hasEndDate
    ? cartGoalScheduleDateTime(rule.endDate, rule.endTime)
    : null,
});

const normalizeProductId = (value) => {
  const source = value && typeof value === "object"
    ? value.id ?? value.productId ?? value.product_id ?? value.originalId ?? value.gid
    : value;
  const raw = String(source || "").trim();
  if (!raw) return null;
  const m = raw.match(/\/(\d+)\s*$/);
  if (m) return m[1];
  if (/^\d+$/.test(raw)) return raw;
  return null;
};

const normalizeCollectionId = (value) => normalizeProductId(value);

const parseResourceIdArray = (value) => {
  if (!value) return [];
  const normalizeList = (items) =>
    (Array.isArray(items) ? items : [items])
      .map(normalizeProductId)
      .filter(Boolean);

  if (Array.isArray(value)) return [...new Set(normalizeList(value))];
  if (value && typeof value === "object") {
    return [...new Set([
      ...normalizeList(value.products),
      ...normalizeList(value.productIds),
      ...normalizeList(value),
    ])];
  }

  const raw = String(value || "").trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return [...new Set(normalizeList(parsed))];
    if (parsed && typeof parsed === "object") {
      return [...new Set([
        ...normalizeList(parsed.products),
        ...normalizeList(parsed.productIds),
        ...normalizeList(parsed),
      ])];
    }
  } catch {
    return [...new Set(raw.split(",").map(normalizeProductId).filter(Boolean))];
  }

  return [];
};

const getBxgyRewardProductIds = (rule = {}) => {
  const ids = [
    ...parseResourceIdArray(rule.rewardProductIds),
    ...parseResourceIdArray(rule.giftSku),
    ...parseResourceIdArray(rule.bonusProductIds),
    normalizeProductId(rule.bonusProductId),
    normalizeProductId(rule.bonus),
  ].filter(Boolean);
  return [...new Set(ids)];
};

const mapAdminProducts = (products = []) =>
  products.map((p) => {
    const image = p?.image?.src || (p?.images?.[0]?.src ?? null);
    const firstVariant = Array.isArray(p?.variants) ? p.variants[0] : null;
    const options = Array.isArray(p?.options)
      ? p.options.map((opt) => ({
        name: opt?.name ?? "",
        values: Array.isArray(opt?.values) ? opt.values : [],
      }))
      : [];
    return {
      id: p?.id ?? null,
      title: p?.title ?? "",
      image: image || null,
      options,
      has_only_default_variant: Boolean(p?.has_only_default_variant),
      variants: Array.isArray(p?.variants)
        ? p.variants.map((v) => ({
          id: v?.id ?? null,
          admin_graphql_api_id: v?.admin_graphql_api_id ?? null,
          price: v?.price ?? null,
          compare_at_price: v?.compare_at_price ?? null,
          title: v?.title ?? null,
          option1: v?.option1 ?? null,
          option2: v?.option2 ?? null,
          option3: v?.option3 ?? null,
          available: v?.available ?? null,
          inventory_quantity: v?.inventory_quantity ?? null,
          variantOptions: buildVariantOptions(p, v),
        }))
        : [],
      variantId: firstVariant?.id ?? null,
      variantPrice: firstVariant?.price ?? null,
      variantOptions: firstVariant ? buildVariantOptions(p, firstVariant) : [],
    };
  });

const fetchBestSellingProducts = async (shopDomain, accessToken) => {
  if (!shopDomain || !accessToken) return [];
  try {
    const endpoint = `https://${shopDomain}/admin/api/${ADMIN_API_VERSION}/products.json?limit=10`;
    const res = await fetch(endpoint, {
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const products = Array.isArray(data?.products) ? data.products : [];
    return mapAdminProducts(products);
  } catch (err) {
    logger.error("Best-selling products fetch failed", err);
    return [];
  }
};

const fetchProductsByIds = async (shopDomain, accessToken, ids = []) => {
  if (!shopDomain || !accessToken) return [];
  if (!Array.isArray(ids) || !ids.length) return [];
  // Shopify REST products.json has a hard cap of 250 per request
  const uniqueIds = [...new Set(ids.map(String))].slice(0, 250);
  try {
    const endpoint = `https://${shopDomain}/admin/api/${ADMIN_API_VERSION}/products.json?ids=${encodeURIComponent(
      uniqueIds.join(",")
    )}&limit=${uniqueIds.length}`;
    const res = await fetch(endpoint, {
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const products = Array.isArray(data?.products) ? data.products : [];
    return mapAdminProducts(products);
  } catch (err) {
    logger.error("Selected products fetch failed", err);
    return [];
  }
};

const fetchCollectionsByIds = async (shopDomain, accessToken, ids = []) => {
  if (!shopDomain || !accessToken) return [];
  if (!Array.isArray(ids) || !ids.length) return [];
  const uniqueIds = [...new Set(ids.map(String))];
  const base = `https://${shopDomain}/admin/api/${ADMIN_API_VERSION}`;
  const query = `ids=${encodeURIComponent(uniqueIds.join(","))}&limit=${uniqueIds.length}`;
  try {
    const [customRes, smartRes] = await Promise.allSettled([
      fetch(`${base}/custom_collections.json?${query}`, {
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
      }),
      fetch(`${base}/smart_collections.json?${query}`, {
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
      }),
    ]);

    const custom =
      customRes.status === "fulfilled" && customRes.value.ok
        ? await customRes.value.json()
        : null;
    const smart =
      smartRes.status === "fulfilled" && smartRes.value.ok
        ? await smartRes.value.json()
        : null;

    const customCollections = Array.isArray(custom?.custom_collections)
      ? custom.custom_collections
      : [];
    const smartCollections = Array.isArray(smart?.smart_collections)
      ? smart.smart_collections
      : [];

    return [...customCollections, ...smartCollections];
  } catch (err) {
    logger.error("Selected collections fetch failed", err);
    return [];
  }
};

const fetchProductsForCollection = async (shopDomain, accessToken, collectionId) => {
  if (!shopDomain || !accessToken || !collectionId) return [];
  try {
    const endpoint = `https://${shopDomain}/admin/api/${ADMIN_API_VERSION}/collections/${collectionId}/products.json?limit=250`;
    const res = await fetch(endpoint, {
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const products = Array.isArray(data?.products) ? data.products : [];
    return mapAdminProducts(products);
  } catch (err) {
    logger.error("Collection products fetch failed", err);
    return [];
  }
};

const resolveShopAccessToken = async (shop, shopRow) => {
  try {
    const primary = shopRow?.accessToken || null;
    if (shopRow?.installed && primary) return primary;

    const offlineSessionId = `offline_${shop}`;
    let fallbackToken = null;

    const offlineSession = await prisma.session.findUnique({
      where: { id: offlineSessionId },
      select: { accessToken: true },
    });
    if (offlineSession?.accessToken) {
      fallbackToken = String(offlineSession.accessToken);
    }

    if (!fallbackToken) {
      const anySession = await prisma.session.findFirst({
        where: { shop, accessToken: { not: null } },
        select: { accessToken: true },
        orderBy: { expires: "desc" },
      });
      if (anySession?.accessToken) {
        fallbackToken = String(anySession.accessToken);
      }
    }

    // Return token without auto-creating/modifying the shop record.
    // The shop record is managed by the admin auth flow — never create it here.
    return fallbackToken ?? null;
  } catch (err) {
    logger.error("[proxy] resolveShopAccessToken failed for shop:", shop, err?.message);
    return null;
  }
};

export const loader = async ({ request }) => {
  if (!verifyAppProxySignature(request)) {
    return jsonResponse({ ok: false, error: "Invalid proxy signature" }, 401);
  }

  const shop = getShopFromRequest(request);
  if (!shop) {
    return jsonResponse({ ok: false, error: "Shop domain not provided" }, 400);
  }

  try {
    let shopData = getShopCache(shop);

    if (!shopData) {
      // Build the select objects, stripping columns that don't exist yet if the
      // migration hasn't been applied (avoids a crash on the very first deploy).
      const discountSelect = { ...DISCOUNT_RULE_SELECT };
      const freeSelect = { ...FREE_GIFT_RULE_SELECT };

      const safeDiscountRules = () =>
        prisma.discountRule
          .findMany({ where: { shop }, orderBy: { id: "asc" }, select: discountSelect })
          .catch(async (err) => {
            if (/Unknown column|Unknown field/i.test(String(err?.message))) {
              delete discountSelect.quantityProgressTextBefore;
              delete discountSelect.quantityProgressTextAfter;
              return prisma.discountRule.findMany({
                where: { shop },
                orderBy: { id: "asc" },
                select: discountSelect,
              });
            }
            throw err;
          });

      const safeFreeGiftRules = () =>
        prisma.freeGiftRule
          .findMany({ where: { shop }, orderBy: { id: "asc" }, select: freeSelect })
          .catch(async (err) => {
            if (/Unknown column|Unknown field/i.test(String(err?.message))) {
              delete freeSelect.quantityProgressTextBefore;
              delete freeSelect.quantityProgressTextAfter;
              return prisma.freeGiftRule.findMany({
                where: { shop },
                orderBy: { id: "asc" },
                select: freeSelect,
              });
            }
            throw err;
          });

      // prisma.addToCartBarSettings may not exist if prisma generate hasn't run yet
      const safeCartBarSettings = () => {
        try {
          return prisma.addToCartBarSettings.findUnique({ where: { shop } }).catch(() => null);
        } catch {
          return Promise.resolve(null);
        }
      };

  const safeStyleSettings = () =>
    prisma.styleSettings
      .findFirst({
        where: { shop },
        orderBy: { id: "desc" },
      })
      .catch(async (err) => {
        if (String(err?.code) === "P2022" || /Unknown column|Unknown field|does not exist/i.test(String(err?.message))) {
          await prisma.$executeRawUnsafe("ALTER TABLE `stylesettings` ADD COLUMN `progressBg` VARCHAR(32) NULL").catch(() => {});
          return prisma.styleSettings.findFirst({ where: { shop }, orderBy: { id: "desc" } }).catch(() => null);
        }
        throw err;
      });

      const [
        shopRow,
        shippingRules,
        discountRules,
        freeGiftRules,
        bxgyRules,
        cartGoalRules,
        styleSettings,
        upsellSettings,
        addToCartBarSettings,
      ] = await Promise.all([
        prisma.shop.findUnique({ where: { shop } }),
        prisma.shippingRule.findMany({ where: { shop }, orderBy: { id: "asc" } }),
        safeDiscountRules(),
        safeFreeGiftRules(),
        prisma.bxgyRule.findMany({ where: { shop }, orderBy: { id: "asc" } }),
        prisma.cartGoalRule.findMany({ where: { shop }, orderBy: { id: "asc" } }),
    safeStyleSettings(),
        prisma.upsellSettings.findUnique({ where: { shop } }),
        safeCartBarSettings(),
      ]);

      const shopAccessToken = await resolveShopAccessToken(shop, shopRow);
      const isAuthorized = Boolean(shopAccessToken);
      const styleSettingsWithCartIcon = await mergeStyleCartIconUrl(styleSettings);

      if (!isAuthorized) {
        logger.warn("Proxy request without shop token; returning DB-only config", {
          shop,
        });
      }

      const bestSellingProducts = isAuthorized
        ? await fetchBestSellingProducts(shop, shopAccessToken)
        : [];

      const selectedProductIds = parseJsonArray(
        upsellSettings?.selectedProductIds
      );
      const selectedProductIdsNormalized = selectedProductIds
        .map(normalizeProductId)
        .filter(Boolean);
      const selectedProductsRaw = isAuthorized && selectedProductIdsNormalized.length
        ? await fetchProductsByIds(
          shop,
          shopAccessToken,
          selectedProductIdsNormalized
        )
        : [];
      const selectedProductsMap = new Map(
        selectedProductsRaw.map((p) => [String(p?.id || ""), p])
      );
      const selectedProducts = selectedProductIdsNormalized
        .map((id) => selectedProductsMap.get(String(id)))
        .filter(Boolean);

      const addToCartBarProductId = normalizeProductId(
        addToCartBarSettings?.homepageProductId
      );
      const addToCartBarProducts = isAuthorized && addToCartBarProductId
        ? await fetchProductsByIds(shop, shopAccessToken, [addToCartBarProductId])
        : [];
      const addToCartBarProduct = addToCartBarProducts[0] ?? null;

      const bxgyRewardProductIds = [
        ...new Set(
          (Array.isArray(bxgyRules) ? bxgyRules : [])
            .flatMap(getBxgyRewardProductIds)
            .filter(Boolean)
        ),
      ];
      const bxgyRewardProductsRaw = isAuthorized && bxgyRewardProductIds.length
        ? await fetchProductsByIds(shop, shopAccessToken, bxgyRewardProductIds)
        : [];
      const bxgyRewardProductsMap = new Map(
        bxgyRewardProductsRaw.map((product) => [String(product?.id || ""), product])
      );
      const bxgyRulesForProxy = (Array.isArray(bxgyRules) ? bxgyRules : []).map((rule) => {
        const rewardIds = getBxgyRewardProductIds(rule);
        const bonusProducts = rewardIds
          .map((id) => bxgyRewardProductsMap.get(String(id)))
          .filter(Boolean);

        if (!bonusProducts.length) return rule;

        return {
          ...rule,
          bonusProductId: rewardIds[0] || rule?.bonusProductId || null,
          bonusProductIds: rewardIds,
          bonusProducts,
          rewardProducts: bonusProducts,
        };
      });

      const selectedCollectionIds = parseJsonArray(
        upsellSettings?.selectedCollectionIds
      );
      const selectedCollectionIdsNormalized = selectedCollectionIds
        .map(normalizeCollectionId)
        .filter(Boolean);
      const selectedCollectionsRaw = isAuthorized && selectedCollectionIdsNormalized.length
        ? await fetchCollectionsByIds(
          shop,
          shopAccessToken,
          selectedCollectionIdsNormalized
        )
        : [];
      const selectedCollectionsMap = new Map(
        selectedCollectionsRaw.map((c) => [String(c?.id || ""), c])
      );
      const selectedCollectionsOrdered = selectedCollectionIdsNormalized
        .map((id) => selectedCollectionsMap.get(String(id)))
        .filter(Boolean);

      // Batch API calls to avoid rate limiting (max 3 concurrent requests)
      const BATCH_SIZE = 3;
      const selectedCollectionsWithProducts = [];
      for (let i = 0; i < selectedCollectionsOrdered.length; i += BATCH_SIZE) {
        const batch = selectedCollectionsOrdered.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(async (col) => {
            const products =
              isAuthorized && col?.id
                ? await fetchProductsForCollection(shop, shopAccessToken, col?.id)
                : [];
            return {
              id: col?.id ?? null,
              title: col?.title ?? "",
              products,
            };
          })
        );
        selectedCollectionsWithProducts.push(...batchResults);
      }

      shopData = {
        authorized: isAuthorized,
        metadata: buildShopMetadata(shopRow),
        _rawShippingRules: shippingRules,
        _rawDiscountRules: discountRules,
        _rawFreeGiftRules: freeGiftRules,
        _rawBxgyRules: bxgyRulesForProxy,
        _rawCartGoalRules: cartGoalRules.map(mapCartGoalRuleForProxy),
        styleSettings: styleSettingsWithCartIcon ?? null,
        upsellSettings: upsellSettings ?? null,
        addToCartBarSettings: {
          ...DEFAULT_ADD_TO_CART_BAR_SETTINGS,
          ...(addToCartBarSettings ?? {}),
        },
        addToCartBarProduct,
        upsellProducts: bestSellingProducts,
        upsellSelectedProducts: selectedProducts,
        upsellSelectedCollections: selectedCollectionsWithProducts,
      };
      setShopCache(shop, shopData);
    }

    return jsonResponse(
      buildProxyPayload(shop, shopData, request),
      200,
      {
        "Cache-Control": "private, max-age=30",
      }
    );
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      const staleShopData = getShopCache(shop, { allowStale: true });
      if (staleShopData) {
        logger.warn("Smart proxy database unavailable; serving stale cache", {
          shop,
          error: error?.message,
        });
        return jsonResponse(
          buildProxyPayload(shop, staleShopData, request, {
            degraded: true,
            configSource: "stale-cache",
          }),
          200,
          { "Cache-Control": "private, max-age=10" }
        );
      }

      logger.warn("Smart proxy database unavailable; serving safe defaults", {
        shop,
        error: error?.message,
      });
      return jsonResponse(
        buildProxyPayload(shop, emptyShopData(), request, {
          degraded: true,
          configSource: "safe-defaults",
        }),
        200,
        { "Cache-Control": "private, max-age=10" }
      );
    }

    logger.error("Smart proxy loader failed", error);
    return jsonResponse(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load CartLift: Cart Drawer & Upsell configuration",
      },
      500
    );
  }
};

const analyticsModelByType = {
  shipping: prisma.shippingRule,
  discount: prisma.discountRule,
  free: prisma.freeGiftRule,
  freegift: prisma.freeGiftRule,
  freeGift: prisma.freeGiftRule,
  bxgy: prisma.bxgyRule,
};

export const action = async ({ request }) => {
  if (!verifyAppProxySignature(request)) {
    return jsonResponse({ ok: false, error: "Invalid proxy signature" }, 401);
  }

  const shop = getShopFromRequest(request);
  if (!shop) {
    return jsonResponse({ ok: false, error: "Shop domain not provided" }, 400);
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const event = String(body.event || "").toLowerCase();
  const ruleType = String(body.ruleType || body.type || "").trim();
  const normalizedRuleType = ruleType.toLowerCase();
  const ruleId = Number(body.ruleId || body.id || 0);
  const model = analyticsModelByType[ruleType] || analyticsModelByType[normalizedRuleType];
  const incrementField =
    event === "conversion"
      ? "analyticsConversions"
      : event === "impression"
        ? "analyticsImpressions"
        : null;

  if (!model || !Number.isInteger(ruleId) || ruleId <= 0 || !incrementField) {
    return jsonResponse({ ok: false, error: "Invalid analytics event" }, 400);
  }

  try {
    await model.updateMany({
      where: { id: ruleId, shop },
      data: { [incrementField]: { increment: 1 } },
    });
    return jsonResponse({ ok: true });
  } catch (error) {
    logger.error("Smart proxy analytics update failed", error);
    return jsonResponse({ ok: false, error: "Failed to record analytics event" }, 500);
  }
};
