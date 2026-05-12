import prisma from "../db.server.js";
import crypto from "crypto";
import logger from "../lib/logger.server.js";
import { apiVersion } from "../shopify.server.js";
import { getShopFromRequest } from "../lib/shopUtils.server.js";
// Note: `proxy.smart.jsx` re-exports this loader for the app proxy path (/proxy/smart).

// Use centralized API version from shopify.server.js
const ADMIN_API_VERSION = apiVersion;
const APP_PROXY_HMAC_TOLERANCE_SEC = 300;

const jsonResponse = (data, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...(status >= 400 ? { "Cache-Control": "no-store" } : {}),
      ...extraHeaders,
    },
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
  iconChoice: true,
  shopifyDiscountCodeId: true,
  discountCode: true,
  progressTextBefore: true,
  progressTextAfter: true,
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
  if (target === "tags") {
    const neededTags = parseDelimitedList(rule.customerTags).map((tag) =>
      tag.toLowerCase()
    );
    if (!neededTags.length) return true;
    return neededTags.some((tag) => context.customerTags.includes(tag));
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

const filterActiveScheduledRules = (rules = [], now = new Date(), context = {}) =>
  (Array.isArray(rules) ? rules : [])
    .filter((rule) => isRuleScheduleActive(rule, now))
    .filter((rule) => ruleMatchesCustomer(rule, context))
    .filter((rule) => ruleMatchesAbTest(rule, context))
    .map((rule) => applyRuleTranslations(rule, context.locale))
    .sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0));

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

const mergeStyleCartIconUrl = async (styleSettings) => {
  if (!styleSettings?.id || styleSettings.cartIconUrl) return styleSettings;

  try {
    await ensureStyleCartIconColumn();
    const rows = await prisma.$queryRaw`
      SELECT cartIconUrl
      FROM stylesettings
      WHERE id = ${styleSettings.id}
      LIMIT 1
    `;
    const cartIconUrl = Array.isArray(rows) ? rows[0]?.cartIconUrl : null;
    return { ...styleSettings, cartIconUrl: cartIconUrl || "" };
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

const normalizeProductId = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const m = raw.match(/\/(\d+)\s*$/);
  if (m) return m[1];
  if (/^\d+$/.test(raw)) return raw;
  return null;
};

const normalizeCollectionId = (value) => normalizeProductId(value);

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
    const [
      shopRow,
      shippingRules,
      discountRules,
      freeGiftRules,
      bxgyRules,
      styleSettings,
      upsellSettings,
    ] = await Promise.all([
      prisma.shop.findUnique({ where: { shop } }),
      prisma.shippingRule.findMany({ where: { shop }, orderBy: { id: "asc" } }),
      prisma.discountRule.findMany({
        where: { shop },
        orderBy: { id: "asc" },
        select: DISCOUNT_RULE_SELECT,
      }),
      prisma.freeGiftRule.findMany({
        where: { shop },
        orderBy: { id: "asc" },
        select: FREE_GIFT_RULE_SELECT,
      }),
      prisma.bxgyRule.findMany({ where: { shop }, orderBy: { id: "asc" } }),
      prisma.styleSettings.findFirst({ where: { shop }, orderBy: { id: "desc" } }),
      prisma.upsellSettings.findUnique({ where: { shop } }),
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

    const scheduleNow = new Date();
    const ruleContext = getRequestContext(request);

    return jsonResponse(
      {
        ok: true,
        shop,
        authorized: isAuthorized,
        metadata: buildShopMetadata(shopRow),
        shippingRules: filterActiveScheduledRules(
          shippingRules,
          scheduleNow,
          ruleContext
        ),
        discountRules: filterActiveScheduledRules(
          discountRules,
          scheduleNow,
          ruleContext
        ),
        freeGiftRules: filterActiveScheduledRules(
          freeGiftRules,
          scheduleNow,
          ruleContext
        ),
        bxgyRules: filterActiveScheduledRules(bxgyRules, scheduleNow, ruleContext),
        styleSettings: styleSettingsWithCartIcon ?? null,
        upsellSettings: upsellSettings ?? null,
        upsellProducts: bestSellingProducts,
        upsellSelectedProducts: selectedProducts,
        upsellSelectedCollections: selectedCollectionsWithProducts,
        fetchedAt: new Date().toISOString(),
      },
      200,
      {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
      }
    );
  } catch (error) {
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

