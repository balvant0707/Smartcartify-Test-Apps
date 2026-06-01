import { apiVersion } from "../shopify.server.js";
import logger from "./logger.server.js";

// ============ TTL Cache Implementation ============
// Caches expire after 5 minutes to prevent memory leaks
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 1000; // Maximum entries per cache

class TTLCache {
  constructor(ttl = CACHE_TTL_MS, maxSize = MAX_CACHE_SIZE) {
    this.cache = new Map();
    this.ttl = ttl;
    this.maxSize = maxSize;
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key, value) {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, {
      value,
      expiry: Date.now() + this.ttl,
    });
  }

  has(key) {
    return this.get(key) !== undefined;
  }

  clear() {
    this.cache.clear();
  }
}

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

const BXGY_DISCOUNT_MUTATION = `
  mutation DiscountAutomaticBxgyCreate($automaticBxgyDiscount: DiscountAutomaticBxgyInput!) {
    discountAutomaticBxgyCreate(automaticBxgyDiscount: $automaticBxgyDiscount) {
      automaticDiscountNode { id }
      userErrors { field message }
    }
  }
`;

const BXGY_DISCOUNT_UPDATE_MUTATION = `
  mutation DiscountAutomaticBxgyUpdate($id: ID!, $automaticBxgyDiscount: DiscountAutomaticBxgyInput!) {
    discountAutomaticBxgyUpdate(id: $id, automaticBxgyDiscount: $automaticBxgyDiscount) {
      automaticDiscountNode { id }
      userErrors { field message }
    }
  }
`;

const cleanShopDomain = (shopDomain) =>
  shopDomain.replace(/^https?:\/\//, "");

const adminGraphql = async (
  shopDomain,
  accessToken,
  query,
  variables = {},
) => {
  if (!shopDomain || !accessToken) {
    throw new Error("Missing shop domain or access token for Shopify Admin");
  }

  const endpoint = `https://${cleanShopDomain(shopDomain)}/admin/api/${apiVersion}/graphql.json`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json().catch(() => null);

  if (!json) {
    throw new Error(`Admin GraphQL ${res.status}: ${res.statusText}`);
  }

  const errors = json?.errors || [];
  if (errors.length) {
    throw new Error(errors.map((err) => err.message).join("; "));
  }

  if (!res.ok) {
    throw new Error(`Admin GraphQL ${res.status}: ${res.statusText}`);
  }

  const userErrors = (Object.values(json.data || {})).flatMap(
    (entry) => entry?.userErrors || [],
  );
  if (userErrors.length) {
    throw new Error(userErrors.map((err) => err.message).join("; "));
  }

  return json.data;
};

const ALL_PRODUCTS_COLLECTION_QUERY = `
  query AllProductsCollectionId($handle: String!) {
    collectionByHandle(handle: $handle) {
      id
    }
  }
`;
const ALL_PRODUCTS_COLLECTION_HANDLES = ["all", "all-products"];
const allProductsCollectionCache = new TTLCache();
const EXPIRED_DISCOUNT_STARTS_AT = "2000-01-01T00:00:00.000Z";
const EXPIRED_DISCOUNT_ENDS_AT = "2000-01-02T00:00:00.000Z";

const appendUniqueTitleSuffix = (title) => {
  const base = String(title || "Discount").trim() || "Discount";
  const suffix = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  return `${base} ${suffix}`;
};

const discountScheduleFields = (rule = {}) => {
  if (rule.enabled === false) {
    return {
      startsAt: EXPIRED_DISCOUNT_STARTS_AT,
      endsAt: EXPIRED_DISCOUNT_ENDS_AT,
    };
  }

  const startsAt = rule.startsAt ? new Date(rule.startsAt) : new Date();
  const endsAt = rule.endsAt ? new Date(rule.endsAt) : null;

  return {
    startsAt: Number.isNaN(startsAt.getTime())
      ? new Date().toISOString()
      : startsAt.toISOString(),
    ...(endsAt && !Number.isNaN(endsAt.getTime())
      ? { endsAt: endsAt.toISOString() }
      : {}),
  };
};

const ALL_PRODUCT_IDS_QUERY = `
  query AllProductIds($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      pageInfo { hasNextPage }
      edges {
        cursor
        node {
          id
        }
      }
    }
  }
`;

const GIFT_VARIANT_QUERY = `
  query ResolveGiftVariant($id: ID!) {
    node(id: $id) {
      __typename
      ... on ProductVariant {
        id
      }
      ... on Product {
        variants(first: 1) {
          edges {
            node {
              id
            }
          }
        }
      }
    }
  }
`;

const allProductsIdsCache = new TTLCache();
const giftVariantCache = new TTLCache();

// Convert plain numeric REST IDs to GID format required by GraphQL
const normalizeToGid = (rawId, defaultType = "Product") => {
  if (!rawId) return rawId;
  const s = String(rawId).trim();
  if (s.startsWith("gid://shopify/")) return s;
  if (/^\d+$/.test(s)) return `gid://shopify/${defaultType}/${s}`;
  return s;
};

const getGiftVariantLookupIds = (giftId) => {
  const raw = String(giftId || "").trim();
  if (!raw) return [];
  if (raw.startsWith("gid://shopify/")) return [raw];
  if (/^\d+$/.test(raw)) {
    return [
      normalizeToGid(raw, "ProductVariant"),
      normalizeToGid(raw, "Product"),
    ];
  }
  return [raw];
};

const resolveGiftVariantId = async (shopDomain, accessToken, giftId) => {
  if (!giftId) return null;

  const rawGiftId = String(giftId || "").trim();
  if (rawGiftId.startsWith("gid://shopify/ProductVariant/")) {
    return rawGiftId;
  }

  const lookupIds = getGiftVariantLookupIds(giftId);
  const normalizedShop = cleanShopDomain(shopDomain);
  const cacheKey = `${normalizedShop}:${lookupIds.join("|")}`;

  if (giftVariantCache.has(cacheKey)) {
    return giftVariantCache.get(cacheKey);
  }

  for (const lookupId of lookupIds) {
    const data = await adminGraphql(shopDomain, accessToken, GIFT_VARIANT_QUERY, {
      id: lookupId,
    });

    const node = data?.node;
    let resolvedId = null;

    if (node?.__typename === "ProductVariant" && node.id) {
      resolvedId = node.id;
    } else if (node?.__typename === "Product") {
      const variantEdge = node.variants?.edges?.[0];
      const variantId = variantEdge?.node?.id;
      resolvedId = variantId ?? null;
    }

    if (resolvedId) {
      giftVariantCache.set(cacheKey, resolvedId);
      return resolvedId;
    }
  }

  return null;
};

export const resolveAllProductsCollectionId = async (
  shopDomain,
  accessToken,
) => {
  const normalizedShop = cleanShopDomain(shopDomain);

  if (allProductsCollectionCache.has(normalizedShop)) {
    return allProductsCollectionCache.get(normalizedShop) ?? null;
  }

  let collectionId = null;

  for (const handle of ALL_PRODUCTS_COLLECTION_HANDLES) {
    const data = await adminGraphql(
      shopDomain,
      accessToken,
      ALL_PRODUCTS_COLLECTION_QUERY,
      { handle },
    );

    const nextId = data?.collectionByHandle?.id ?? null;
    if (nextId) {
      collectionId = nextId;
      break;
    }
  }

  allProductsCollectionCache.set(normalizedShop, collectionId);
  return collectionId;
};

const MAX_PRODUCT_ID_PAGES = 40; // cap at 40 × 250 = 10,000 products

const fetchAllProductIds = async (shopDomain, accessToken) => {
  const normalizedShop = cleanShopDomain(shopDomain);

  if (allProductsIdsCache.has(normalizedShop)) {
    return allProductsIdsCache.get(normalizedShop);
  }

  const ids = [];
  let after = null;
  let pageCount = 0;

  while (pageCount < MAX_PRODUCT_ID_PAGES) {
    pageCount += 1;
    const data = await adminGraphql(
      shopDomain,
      accessToken,
      ALL_PRODUCT_IDS_QUERY,
      { first: 250, after },
    );

    const edges = data?.products?.edges ?? [];

    for (const edge of edges) {
      const productId = edge?.node?.id;
      if (productId) {
        ids.push(productId);
      }
    }

    const pageInfo = data?.products?.pageInfo;
    if (!pageInfo?.hasNextPage) break;

    after =
      edges.length && edges[edges.length - 1]?.cursor
        ? edges[edges.length - 1].cursor
        : null;

    if (!after) break;
  }

  if (pageCount >= MAX_PRODUCT_ID_PAGES) {
    logger.warn(
      `fetchAllProductIds: reached page limit (${MAX_PRODUCT_ID_PAGES} pages, ${ids.length} IDs). Some products may be excluded.`,
    );
  }

  allProductsIdsCache.set(normalizedShop, ids);
  return ids;
};

const deleteShopifyDiscountById = async (
  shopDomain,
  accessToken,
  id,
) => {
  const deleteAutomaticMutation = `
    mutation DiscountAutomaticDelete($id: ID!) {
      discountAutomaticDelete(id: $id) {
        userErrors { field message }
        deletedAutomaticDiscountId
      }
    }
  `;

  const deleteCodeMutation = `
    mutation DiscountCodeDelete($id: ID!) {
      discountCodeDelete(id: $id) {
        userErrors { field message }
        deletedCodeDiscountId
      }
    }
  `;

  try {
    await adminGraphql(shopDomain, accessToken, deleteAutomaticMutation, { id });
    return true;
  } catch (automaticErr) {
    logger.warn("deleteShopifyDiscountById: automatic delete failed, trying code delete", automaticErr?.message ?? automaticErr);
  }

  await adminGraphql(shopDomain, accessToken, deleteCodeMutation, { id });
  return true;
};

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

const setShopifyDiscountActiveState = async ({
  shopDomain,
  accessToken,
  discountId,
  enabled,
}) => {
  if (!shopDomain || !accessToken || !discountId) {
    return;
  }

  const mutation = enabled
    ? AUTOMATIC_DISCOUNT_ACTIVATE_MUTATION
    : AUTOMATIC_DISCOUNT_DEACTIVATE_MUTATION;

  await adminGraphql(shopDomain, accessToken, mutation, { id: discountId });
};

// ---------- BASIC MIN-AMOUNT FREE GIFT DISCOUNT ----------

const buildMinAmountAutomaticInput = (rule, giftVariantId) => {
  const triggerType =
    String(rule.triggerType || "amount").toLowerCase() === "quantity"
      ? "quantity"
      : "amount";
  const minPurchaseValue = Number(rule.minPurchase) || 0;
  const minQuantityValue = Math.floor(Number(rule.minQuantity) || 0);
  const minSubtotal = minPurchaseValue > 0 ? minPurchaseValue.toFixed(2) : null;
  const minQuantity = minQuantityValue > 0 ? String(minQuantityValue) : null;

  if (triggerType === "amount" && !minSubtotal) {
    throw new Error("Min purchase must be greater than zero for free product discounts.");
  }
  if (triggerType === "quantity" && !minQuantity) {
    throw new Error("Min quantity must be greater than zero for free product discounts.");
  }

  const title =
    triggerType === "quantity"
      ? `CartLift: Cart Drawer & Upsell Free gift >= ${minQuantity} items`
      : `CartLift: Cart Drawer & Upsell Free gift >= ${minSubtotal}`;

  // qty is the gift quantity; triggerType decides the cart threshold.
  const giftQty = Math.max(Number(rule.qty ?? "1") || 1, 1);
  const limitValue = Math.max(Number(rule.limitPerOrder ?? "0") || 0, 0);
  const minimumRequirement =
    triggerType === "quantity"
      ? {
          quantity: {
            greaterThanOrEqualToQuantity: minQuantity,
          },
        }
      : {
          subtotal: {
            greaterThanOrEqualToSubtotal: minSubtotal,
          },
        };

  // Use discountOnQuantity so only the exact gift qty gets 100% off,
  // not every unit of that variant in the cart (which percentage:1 would do)
  const payload = {
    title,
    ...discountScheduleFields(rule),
    customerSelection: { all: true },
    customerGets: {
      value: {
        discountOnQuantity: {
          quantity: String(giftQty),
          effect: { percentage: 1 },
        },
      },
      items: {
        products: {
          productVariantsToAdd: giftVariantId ? [giftVariantId] : [],
        },
      },
    },
    combinesWith: {
      orderDiscounts: true,
      productDiscounts: true,
      shippingDiscounts: false,
    },
  };

  payload.minimumRequirement = minimumRequirement;

  if (limitValue > 0) {
    payload.usageLimit = limitValue;
    payload.usesPerOrderLimit = String(limitValue);
  }

  return payload;
};

export const syncMinAmountFreeGiftDiscount = async (params) => {
  const { shopDomain, accessToken, rule } = params;

  if (!shopDomain || !accessToken) {
    throw new Error("Missing Shopify context to sync free gift");
  }

  if (!rule.enabled) {
    if (!rule.freeProductDiscountID) {
      return { deleted: true };
    }

    const giftVariantId = await resolveGiftVariantId(
      shopDomain,
      accessToken,
      rule.bonusProductId ?? rule.bonus ?? null,
    );

    if (!giftVariantId) {
      try {
        await setShopifyDiscountActiveState({
          shopDomain,
          accessToken,
          discountId: rule.freeProductDiscountID,
          enabled: false,
        });
      } catch (err) {
        logger.warn("Failed to deactivate existing min amount free gift discount", err);
      }
      return { id: rule.freeProductDiscountID };
    }

    const input = buildMinAmountAutomaticInput(rule, giftVariantId);
    const data = await adminGraphql(
      shopDomain,
      accessToken,
      AUTOMATIC_DISCOUNT_UPDATE_MUTATION,
      {
        id: rule.freeProductDiscountID,
        automaticBasicDiscount: input,
      },
    );

    return {
      id:
        data?.discountAutomaticBasicUpdate?.automaticDiscountNode?.id ||
        rule.freeProductDiscountID,
    };
  }

  if (rule.freeProductDiscountID) {
    try {
      await deleteShopifyDiscountById(
        shopDomain,
        accessToken,
        rule.freeProductDiscountID,
      );
    } catch (err) {
      logger.warn(
        "Failed to delete existing min amount free gift discount",
        err,
      );
    }
  }

  const giftVariantId = await resolveGiftVariantId(
    shopDomain,
    accessToken,
    rule.bonusProductId ?? rule.bonus ?? null,
  );

  if (!giftVariantId) {
    throw new Error("Free gift variant ID is required to sync discount");
  }

  const input = buildMinAmountAutomaticInput(rule, giftVariantId);

  const data = await adminGraphql(
    shopDomain,
    accessToken,
    AUTOMATIC_DISCOUNT_MUTATION,
    { automaticBasicDiscount: input },
  );

  const newId =
    data?.discountAutomaticBasicCreate?.automaticDiscountNode?.id;

  if (!newId) {
    throw new Error("Shopify did not return an automatic discount id");
  }

  return { id: newId };
};

// ---------- BXGY FREE GIFT DISCOUNT ----------

const buildBxgyDiscountInput = (
  rule,
  collectionId,
  productIds,
  giftVariantId,
) => {
  const triggerType =
    String(rule.triggerType || "amount").toLowerCase() === "quantity"
      ? "quantity"
      : "amount";
  const minPurchaseValue = Number(rule.minPurchase ?? "");
  const minQuantityValue = Number(rule.minQuantity ?? "");
  if (
    triggerType === "amount" &&
    (Number.isNaN(minPurchaseValue) || minPurchaseValue <= 0)
  ) {
    throw new Error("Min purchase must be greater than zero for free product discounts.");
  }
  if (
    triggerType === "quantity" &&
    (Number.isNaN(minQuantityValue) || minQuantityValue <= 0)
  ) {
    throw new Error("Min quantity must be greater than zero for free product discounts.");
  }

  if (!giftVariantId) {
    throw new Error("Free gift variant ID resolution failed.");
  }

  const qtyValue = Math.max(Number(rule.qty ?? "1") || 1, 1);
  const customerBuys = {
    value:
      triggerType === "quantity"
        ? { quantity: String(Math.max(1, Math.floor(minQuantityValue))) }
        : { amount: minPurchaseValue.toFixed(2) },
  };

  // Attach "buys" to all products via collection or product IDs
  if (collectionId) {
    customerBuys.items = {
      collections: {
        collectionsToAdd: [collectionId],
      },
    };
  } else if (productIds && productIds.length) {
    customerBuys.items = {
      products: {
        productsToAdd: productIds,
      },
    };
  }

  // IMPORTANT: customerGets.items must use DiscountItemsInput.products.productVariantsToAdd
  return {
    title:
      triggerType === "quantity"
        ? `CartLift: Cart Drawer & Upsell Free gift >= ${Math.max(1, Math.floor(minQuantityValue))} items`
        : `CartLift: Cart Drawer & Upsell Free gift >= $${minPurchaseValue}`,
    ...discountScheduleFields(rule),
    combinesWith: {
      orderDiscounts: true,
      productDiscounts: true,
      shippingDiscounts: false,
    },
    customerBuys,
    customerGets: {
      items: {
        products: {
          productVariantsToAdd: [giftVariantId],
        },
      },
      value: {
        discountOnQuantity: {
          quantity: String(qtyValue),
          effect: {
            percentage: 1,
          },
        },
      },
    },
  };
};

const syncSingleBxgyDiscount = async (params) => {
  const {
    shopDomain,
    accessToken,
    rule,
    existingDiscountId,
    collectionId,
    productIds,
  } = params;

  const giftVariantId = await resolveGiftVariantId(
    shopDomain,
    accessToken,
    rule.bonusProductId ?? rule.bonus ?? null,
  );

  if (!rule.enabled && !giftVariantId) {
    if (existingDiscountId) {
      try {
        await setShopifyDiscountActiveState({
          shopDomain,
          accessToken,
          discountId: existingDiscountId,
          enabled: false,
        });
      } catch (err) {
        logger.warn("Failed to deactivate existing free product discount", err);
      }
    }
    return { id: existingDiscountId ?? null };
  }

  const input = buildBxgyDiscountInput(
    rule,
    collectionId,
    productIds,
    giftVariantId,
  );

  if (!rule.enabled) {
    if (!existingDiscountId) {
      return { id: null };
    }

    try {
      const data = await adminGraphql(
        shopDomain,
        accessToken,
        BXGY_DISCOUNT_UPDATE_MUTATION,
        {
          id: existingDiscountId,
          automaticBxgyDiscount: input,
        },
      );
      const nextId =
        data?.discountAutomaticBxgyUpdate?.automaticDiscountNode?.id ||
        existingDiscountId;
      return { id: nextId };
    } catch (err) {
      logger.warn("Failed to expire existing free product discount", err);
      try {
        await setShopifyDiscountActiveState({
          shopDomain,
          accessToken,
          discountId: existingDiscountId,
          enabled: false,
        });
      } catch (deactivateErr) {
        logger.warn("Failed to deactivate existing free product discount", deactivateErr);
      }
      return { id: existingDiscountId };
    }
  }

  const create = async () =>
    adminGraphql(
      shopDomain,
      accessToken,
      BXGY_DISCOUNT_MUTATION,
      { automaticBxgyDiscount: input },
    );
  const createWithUniqueTitle = async () =>
    adminGraphql(
      shopDomain,
      accessToken,
      BXGY_DISCOUNT_MUTATION,
      {
        automaticBxgyDiscount: {
          ...input,
          title: appendUniqueTitleSuffix(input.title),
        },
      },
    );

  const update = async () =>
    adminGraphql(
      shopDomain,
      accessToken,
      BXGY_DISCOUNT_UPDATE_MUTATION,
      {
        id: existingDiscountId,
        automaticBxgyDiscount: input,
      },
    );
  const updateWithUniqueTitle = async () =>
    adminGraphql(
      shopDomain,
      accessToken,
      BXGY_DISCOUNT_UPDATE_MUTATION,
      {
        id: existingDiscountId,
        automaticBxgyDiscount: {
          ...input,
          title: appendUniqueTitleSuffix(input.title),
        },
      },
    );

  const data = existingDiscountId
    ? await update().catch(async (err) => {
      if (
        err instanceof Error &&
        err.message.includes("Title must be unique")
      ) {
        return updateWithUniqueTitle();
      }
      logger.warn(
        "Failed to update existing free product discount, creating replacement",
        err,
      );
      await deleteShopifyDiscountById(
        shopDomain,
        accessToken,
        existingDiscountId,
      );
      return create().catch((createErr) => {
        if (
          createErr instanceof Error &&
          createErr.message.includes("Title must be unique")
        ) {
          return createWithUniqueTitle();
        }
        throw createErr;
      });
    })
    : await create().catch((err) => {
      if (
        err instanceof Error &&
        err.message.includes("Title must be unique")
      ) {
        return createWithUniqueTitle();
      }
      throw err;
    });

  const nextId =
    data?.discountAutomaticBxgyUpdate?.automaticDiscountNode?.id ||
    data?.discountAutomaticBxgyCreate?.automaticDiscountNode?.id;

  if (!nextId) {
    throw new Error("Shopify did not return a BXGY discount id.");
  }

  return { id: nextId };
};

export const syncFreeProductDiscountsToShopify = async (params) => {
  const {
    shopDomain,
    accessToken,
    rules,
    existingDiscountIds = [],
    collectionId,
  } = params;

  if (!shopDomain) {
    throw new Error("Missing shop domain for free product discount sync.");
  }
  if (!accessToken) {
    throw new Error(
      "Missing access token for free product discount sync.",
    );
  }

  let allProductsCollectionId = collectionId ?? null;

  if (!allProductsCollectionId) {
    try {
      allProductsCollectionId = await resolveAllProductsCollectionId(
        shopDomain,
        accessToken,
      );
    } catch (err) {
      logger.warn(
        "Failed to resolve the all-products collection ID for free product discounts.",
        err,
      );
      return rules.map((_, index) => ({
        index,
        id: existingDiscountIds[index] ?? null,
      }));
    }
  }

  let fallbackProductIds = null;

  if (
    (!allProductsCollectionId || !allProductsCollectionId.length) &&
    !collectionId
  ) {
    logger.warn(
      "All-products collection not resolved, falling back to all product IDs.",
    );

    try {
      fallbackProductIds = await fetchAllProductIds(
        shopDomain,
        accessToken,
      );
    } catch (err) {
      logger.warn("Failed to load all product IDs for fallback", err);
    }

    if (!fallbackProductIds?.length) {
      logger.warn(
        "Skipping free product discount sync because the all-products collection ID could not be resolved, and product IDs fallback failed.",
      );
      return rules.map((_, index) => ({
        index,
        id: existingDiscountIds[index] ?? null,
      }));
    }
  }

  const results = [];
  const errors = [];

  for (let index = 0; index < rules.length; index += 1) {
    const rule = rules[index];

    try {
      const result = await syncSingleBxgyDiscount({
        shopDomain,
        accessToken,
        rule: {
          bonusProductId: rule.bonus ?? null,
          minPurchase: rule.minPurchase ?? null,
          triggerType: rule.triggerType ?? "amount",
          minQuantity: rule.minQuantity ?? null,
          qty: rule.qty ?? null,
          limitPerOrder: rule.limit ?? null,
          enabled: Boolean(rule.enabled),
          startsAt: rule.startsAt ?? null,
          endsAt: rule.endsAt ?? null,
        },
        existingDiscountId: existingDiscountIds[index] ?? null,
        collectionId: allProductsCollectionId,
        productIds: fallbackProductIds,
      });

      results.push({ index, id: result?.id ?? null });
    } catch (err) {
      errors.push({
        index,
        message:
          err instanceof Error
            ? err.message
            : "Failed to sync free product discount",
      });
    }
  }

  if (errors.length) {
    throw new Error(
      errors
        .map((error) => `rule ${error.index + 1}: ${error.message}`)
        .join("; "),
    );
  }

  return results;
};
