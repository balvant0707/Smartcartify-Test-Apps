import { apiVersion } from "../shopify.server";

const AUTOMATIC_DISCOUNT_MUTATION = `
  mutation DiscountAutomaticBasicCreate($automaticBasicDiscount: DiscountAutomaticBasicInput!) {
    discountAutomaticBasicCreate(automaticBasicDiscount: $automaticBasicDiscount) {
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
const allProductsCollectionCache = new Map();

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

const allProductsIdsCache = new Map();
const giftVariantCache = new Map();

const resolveGiftVariantId = async (shopDomain, accessToken, giftId) => {
  if (!giftId) return null;

  // If it's already a variant GID, just use it
  if (giftId.startsWith("gid://shopify/ProductVariant/")) {
    return giftId;
  }

  const normalizedShop = cleanShopDomain(shopDomain);
  const cacheKey = `${normalizedShop}:${giftId}`;

  if (giftVariantCache.has(cacheKey)) {
    return giftVariantCache.get(cacheKey);
  }

  const data = await adminGraphql(shopDomain, accessToken, GIFT_VARIANT_QUERY, {
    id: giftId,
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
  }

  return resolvedId;
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

const fetchAllProductIds = async (shopDomain, accessToken) => {
  const normalizedShop = cleanShopDomain(shopDomain);

  if (allProductsIdsCache.has(normalizedShop)) {
    return allProductsIdsCache.get(normalizedShop);
  }

  const ids = [];
  let after = null;

  while (true) {
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
  } catch (err) {
    // Fallback to code delete if needed
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
  const title = `SmartCartify Free gift ${rule.minPurchase || ""}`.trim();
  const minPurchaseValue = Number(rule.minPurchase) || 0;
  const minSubtotal = minPurchaseValue > 0 ? minPurchaseValue.toFixed(2) : null;

  const qtyValue = Math.max(Number(rule.qty ?? "1") || 0, 0);
  const limitValue = Math.max(Number(rule.limitPerOrder ?? "0") || 0, 0);

  const minimumRequirement = {};

  if (minSubtotal) {
    minimumRequirement.subtotal = {
      greaterThanOrEqualToSubtotal: minSubtotal,
    };
  }

  if (qtyValue) {
    minimumRequirement.quantity = {
      greaterThanOrEqualToQuantity: String(Math.max(1, qtyValue)),
    };
  }

  // IMPORTANT: use DiscountItemsInput.products.productVariantsToAdd
  const payload = {
    title: title || "SmartCartify Free gift",
    startsAt: new Date().toISOString(),
    customerSelection: { all: true },
    destinationSelection: { all: true },
    customerGets: {
      value: { percentage: 1 },
      items: {
        products: {
          productVariantsToAdd: giftVariantId ? [giftVariantId] : [],
        },
      },
    },
    combinesWith: {
      orderDiscounts: true,
      productDiscounts: false,
      shippingDiscounts: false,
    },
  };

  if (Object.keys(minimumRequirement).length) {
    payload.minimumRequirement = minimumRequirement;
  }

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

  if (rule.freeProductDiscountID) {
    try {
      await deleteShopifyDiscountById(
        shopDomain,
        accessToken,
        rule.freeProductDiscountID,
      );
    } catch (err) {
      console.warn(
        "Failed to delete existing min amount free gift discount",
        err,
      );
    }
  }

  if (!rule.enabled) {
    return { deleted: true };
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
  const minPurchaseValue = Number(rule.minPurchase ?? "");
  if (Number.isNaN(minPurchaseValue) || minPurchaseValue <= 0) {
    throw new Error(
      "Min purchase must be greater than zero for free product discounts.",
    );
  }

  if (!giftVariantId) {
    throw new Error("Free gift variant ID resolution failed.");
  }

  const qtyValue = Math.max(Number(rule.qty ?? "1") || 1, 1);

  const customerBuys = {
    value: {
      amount: minPurchaseValue.toFixed(2),
    },
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
    title: `SmartCartify Free gift >= Rs${minPurchaseValue}`,
    startsAt: new Date().toISOString(),
    combinesWith: {
      orderDiscounts: true,
      productDiscounts: false,
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

  if (!rule.enabled) {
    if (existingDiscountId) {
      try {
        await setShopifyDiscountActiveState({
          shopDomain,
          accessToken,
          discountId: existingDiscountId,
          enabled: false,
        });
      } catch (err) {
        console.warn("Failed to deactivate existing free product discount", err);
      }
    }
    return { id: existingDiscountId ?? null };
  }

  if (existingDiscountId) {
    try {
      await deleteShopifyDiscountById(
        shopDomain,
        accessToken,
        existingDiscountId,
      );
    } catch (err) {
      console.warn("Failed to delete existing free product discount", err);
    }
  }

  const giftVariantId = await resolveGiftVariantId(
    shopDomain,
    accessToken,
    rule.bonusProductId ?? rule.bonus ?? null,
  );

  const input = buildBxgyDiscountInput(
    rule,
    collectionId,
    productIds,
    giftVariantId,
  );

  const data = await adminGraphql(
    shopDomain,
    accessToken,
    BXGY_DISCOUNT_MUTATION,
    { automaticBxgyDiscount: input },
  );

  const nextId =
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
      console.warn(
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
    console.warn(
      "All-products collection not resolved, falling back to all product IDs.",
    );

    try {
      fallbackProductIds = await fetchAllProductIds(
        shopDomain,
        accessToken,
      );
    } catch (err) {
      console.warn("Failed to load all product IDs for fallback", err);
    }

    if (!fallbackProductIds?.length) {
      console.warn(
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
          qty: rule.qty ?? null,
          limitPerOrder: rule.limit ?? null,
          enabled: Boolean(rule.enabled),
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
