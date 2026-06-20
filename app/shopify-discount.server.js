/**
 * Shopify Discount GraphQL helpers
 * Called from campaign action functions to create/update Shopify discounts.
 */

// ─── Automatic Free Shipping ────────────────────────────────────────────────

const FREE_SHIPPING_CREATE = `#graphql
  mutation discountAutomaticFreeShippingCreate($input: DiscountAutomaticFreeShippingInput!) {
    discountAutomaticFreeShippingCreate(freeShippingAutomaticDiscount: $input) {
      automaticDiscountNode { id }
      userErrors { field message }
    }
  }`;

const FREE_SHIPPING_UPDATE = `#graphql
  mutation discountAutomaticFreeShippingUpdate($id: ID!, $input: DiscountAutomaticFreeShippingInput!) {
    discountAutomaticFreeShippingUpdate(id: $id, freeShippingAutomaticDiscount: $input) {
      automaticDiscountNode { id }
      userErrors { field message }
    }
  }`;

// ─── Automatic Basic (percentage / fixed amount off) ─────────────────────────

const AUTOMATIC_BASIC_CREATE = `#graphql
  mutation discountAutomaticBasicCreate($input: DiscountAutomaticBasicInput!) {
    discountAutomaticBasicCreate(automaticBasicDiscount: $input) {
      automaticDiscountNode { id }
      userErrors { field message }
    }
  }`;

const AUTOMATIC_BASIC_UPDATE = `#graphql
  mutation discountAutomaticBasicUpdate($id: ID!, $input: DiscountAutomaticBasicInput!) {
    discountAutomaticBasicUpdate(id: $id, automaticBasicDiscount: $input) {
      automaticDiscountNode { id }
      userErrors { field message }
    }
  }`;

// ─── Automatic BXGY ──────────────────────────────────────────────────────────

const BXGY_CREATE = `#graphql
  mutation discountAutomaticBxgyCreate($input: DiscountAutomaticBxgyInput!) {
    discountAutomaticBxgyCreate(automaticBxgyDiscount: $input) {
      automaticDiscountNode { id }
      userErrors { field message }
    }
  }`;

const BXGY_UPDATE = `#graphql
  mutation discountAutomaticBxgyUpdate($id: ID!, $input: DiscountAutomaticBxgyInput!) {
    discountAutomaticBxgyUpdate(id: $id, automaticBxgyDiscount: $input) {
      automaticDiscountNode { id }
      userErrors { field message }
    }
  }`;

const AUTOMATIC_DELETE = `#graphql
  mutation DiscountAutomaticDelete($id: ID!) {
    discountAutomaticDelete(id: $id) {
      deletedAutomaticDiscountId
      userErrors { field message }
    }
  }`;

// ─── Discount Code (Basic) ────────────────────────────────────────────────────

const CODE_BASIC_CREATE = `#graphql
  mutation discountCodeBasicCreate($input: DiscountCodeBasicInput!) {
    discountCodeBasicCreate(basicCodeDiscount: $input) {
      codeDiscountNode { id }
      userErrors { field message }
    }
  }`;

const CODE_BASIC_UPDATE = `#graphql
  mutation discountCodeBasicUpdate($id: ID!, $input: DiscountCodeBasicInput!) {
    discountCodeBasicUpdate(id: $id, basicCodeDiscount: $input) {
      codeDiscountNode { id }
      userErrors { field message }
    }
  }`;


// ─── Helper: parse GQL response ──────────────────────────────────────────────

async function gql(admin, query, variables) {
  const res = await admin.graphql(query, { variables });
  return res.json();
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const COMBINES_WITH_ORDER_DISCOUNTS = {
  orderDiscounts: true,
  productDiscounts: false,
  shippingDiscounts: false,
};

const COMBINES_WITH_CODE_DISCOUNTS = {
  orderDiscounts: true,
  productDiscounts: true,
  shippingDiscounts: true,
};

const COMBINES_WITH_FREE_SHIPPING_REWARDS = {
  orderDiscounts: true,
  productDiscounts: true,
};

const SHOPIFY_TITLE_APP_NAME = "CartLift: Cart Drawer & Upsell";
const EXPIRED_DISCOUNT_STARTS_AT = "2000-01-01T00:00:00.000Z";
const EXPIRED_DISCOUNT_ENDS_AT = "2000-01-02T00:00:00.000Z";

function automaticDiscountUpdateId(id, discountType) {
  const nodeId = automaticDiscountNodeId(id);
  if (!nodeId || discountType !== "DiscountAutomaticBxgy") return nodeId;
  return nodeId.replace(
    /^gid:\/\/shopify\/DiscountAutomaticNode\//,
    "gid://shopify/DiscountAutomaticBxgy/"
  );
}

function automaticDiscountNodeId(id) {
  const raw = String(id || "").trim();
  if (!raw) return raw;
  return raw
    .replace(/^gid:\/\/shopify\/DiscountAutomaticBasic\//, "gid://shopify/DiscountAutomaticNode/")
    .replace(/^gid:\/\/shopify\/DiscountAutomaticBxgy\//, "gid://shopify/DiscountAutomaticNode/")
    .replace(/^gid:\/\/shopify\/DiscountAutomaticFreeShipping\//, "gid://shopify/DiscountAutomaticNode/");
}

function withAppNameTitle(title, fallback = "Discount") {
  const base = String(title || fallback).trim() || fallback;
  return base.toLowerCase().includes(SHOPIFY_TITLE_APP_NAME.toLowerCase())
    ? base
    : `${SHOPIFY_TITLE_APP_NAME} ${base}`;
}

function discountScheduleFields({ enabled = true, startsAt, endsAt } = {}) {
  if (enabled === false) {
    return {
      startsAt: EXPIRED_DISCOUNT_STARTS_AT,
      endsAt: EXPIRED_DISCOUNT_ENDS_AT,
    };
  }

  return {
    startsAt: startsAt || new Date().toISOString(),
    endsAt: endsAt || null,
  };
}

const edgeNodes = (connection) =>
  connection?.edges?.map((edge) => edge?.node).filter(Boolean) || [];

const normalizeIds = (value) =>
  Array.isArray(value)
    ? [...new Set(value.map(String).map((id) => id.trim()).filter(Boolean))]
    : [];

function shopifyGid(id, type) {
  const raw = String(id || "").trim();
  if (!raw || raw.startsWith("gid://")) return raw;
  if (!/^\d+$/.test(raw)) return raw;
  return `gid://shopify/${type}/${raw}`;
}

const normalizeProductIds = (value) =>
  normalizeIds(value).map((id) => shopifyGid(id, "Product"));

const normalizeCollectionIds = (value) =>
  normalizeIds(value).map((id) => shopifyGid(id, "Collection"));

function positiveNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function expectedShopifyType(type) {
  return type === "Collection" ? "Collection" : "Product";
}

function invalidResourceMessage(ids, context, type) {
  const label = type === "Collection" ? "collection" : "product";
  const sample = ids.map((id) => id.split("/").pop()).join(", ");
  return `${context} includes invalid or deleted Shopify ${label}${ids.length === 1 ? "" : "s"} (${sample}). Reselect the ${label}${ids.length === 1 ? "" : "s"} and save again.`;
}

async function filterExistingShopifyIds(admin, ids, type, { context, strict = false } = {}) {
  const normalizedIds = normalizeIds(ids);
  if (!normalizedIds.length) return [];

  const data = await gql(
    admin,
    `#graphql
      query ValidateDiscountResourceIds($ids: [ID!]!) {
        nodes(ids: $ids) {
          id
          __typename
        }
      }`,
    { ids: normalizedIds }
  );
  const nodes = data?.data?.nodes || [];
  const expectedType = expectedShopifyType(type);
  const validIds = [];
  const invalidIds = [];

  normalizedIds.forEach((id, index) => {
    const node = nodes[index];
    if (node?.id === id && node?.__typename === expectedType) {
      validIds.push(id);
    } else {
      invalidIds.push(id);
    }
  });

  if (strict && invalidIds.length) {
    throw new Error(invalidResourceMessage(invalidIds, context || "Selection", type));
  }

  return validIds;
}

async function filterExistingBxgySelection(admin, selection = {}, options = {}) {
  const [products, collections] = await Promise.all([
    filterExistingShopifyIds(admin, selection.products, "Product", {
      ...options,
      context: `${options.context || "Selection"} products`,
    }),
    filterExistingShopifyIds(admin, selection.collections, "Collection", {
      ...options,
      context: `${options.context || "Selection"} collections`,
    }),
  ]);

  return { products, collections };
}

function normalizeBxgyScope(scope) {
  switch (scope) {
    case "store":
    case "entire_store":
      return "store";
    case "collection":
    case "collections":
    case "specific_collections":
      return "collection";
    case "product":
    case "products":
    case "specific_products":
      return "product";
    default:
      return "product";
  }
}

function parseBxgyAppliesTo(appliesTo, scope) {
  const normalizedScope = normalizeBxgyScope(scope);
  let parsed = appliesTo;

  if (typeof appliesTo === "string" && appliesTo.trim()) {
    try {
      parsed = JSON.parse(appliesTo);
    } catch {
      parsed = appliesTo
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
    }
  }

  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return {
      products: normalizeProductIds(parsed.products),
      collections: normalizeCollectionIds(parsed.collections),
    };
  }

  const ids = normalizeIds(parsed);
  return normalizedScope === "collection"
    ? { products: [], collections: normalizeCollectionIds(ids) }
    : { products: normalizeProductIds(ids), collections: [] };
}

async function fetchBxgyStoreProductIds(admin) {
  const res = await admin.graphql(`#graphql
    query BxgyStoreProducts {
      products(first: 250, sortKey: TITLE) {
        edges {
          node {
            id
          }
        }
      }
    }`);
  const data = await res.json();
  return normalizeIds(edgeNodes(data?.data?.products).map((product) => product.id));
}

function buildBxgyItemsInput(selection = {}, previousSelection = {}) {
  const products = normalizeProductIds(selection.products);
  const collections = normalizeCollectionIds(selection.collections);
  const previousProducts = normalizeProductIds(previousSelection.products);
  const previousCollections = normalizeCollectionIds(previousSelection.collections);
  const productsToRemove = previousProducts.filter((id) => !products.includes(id));
  const collectionsToRemove = previousCollections.filter((id) => !collections.includes(id));
  const input = {};

  if (products.length) {
    input.products = { productsToAdd: products };
  } else if (productsToRemove.length) {
    input.products = {};
  }

  if (collections.length) {
    input.collections = { add: collections };
  } else if (collectionsToRemove.length) {
    input.collections = {};
  }

  if (productsToRemove.length) {
    input.products = {
      ...(input.products || {}),
      productsToRemove,
    };
  }

  if (collectionsToRemove.length) {
    input.collections = {
      ...(input.collections || {}),
      remove: collectionsToRemove,
    };
  }

  if (Object.keys(input).length) {
    return input;
  }

  throw new Error(
    "Shopify Buy X Get Y discounts require selected products or collections for customer buys and customer gets"
  );
}

async function resolveBxgySelection(admin, { scope, appliesTo } = {}) {
  const normalizedScope = normalizeBxgyScope(scope);
  const parsed = parseBxgyAppliesTo(appliesTo, normalizedScope);

  if (normalizedScope === "collection") {
    if (parsed.collections.length) return { collections: parsed.collections };
    throw new Error("Select at least one collection for this Buy X Get Y discount");
  }

  if (normalizedScope === "store") {
    const products = parsed.products.length
      ? parsed.products
      : await fetchBxgyStoreProductIds(admin);
    if (products.length) return { products };
    throw new Error("No products found for this Buy X Get Y discount");
  }

  if (parsed.products.length) return { products: parsed.products };
  throw new Error("Select at least one product for this Buy X Get Y discount");
}

function graphqlTopLevelErrorMessage(errors = []) {
  return errors
    .map((err) => [err?.message, err?.extensions?.code].filter(Boolean).join(" "))
    .filter(Boolean)
    .join("; ");
}

function userErrorMessage(errors = []) {
  return errors
    .map((err) => [Array.isArray(err?.field) ? err.field.join(".") : err?.field, err?.message].filter(Boolean).join(": "))
    .filter(Boolean)
    .join("; ");
}

function assertDiscountMutationSuccess(data, mutationName, label) {
  const topLevelErrors = data?.errors || [];
  if (topLevelErrors.length) {
    throw new Error(`${label} failed: ${graphqlTopLevelErrorMessage(topLevelErrors)}`);
  }

  const errors = data?.data?.[mutationName]?.userErrors || [];
  if (errors.length) {
    throw new Error(`${label} failed: ${userErrorMessage(errors)}`);
  }
}

function isBxgyUpdateStateConflict(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("cannot have collection prerequisites in combination with product prerequisites") ||
    message.includes("customer buys quantity cannot be defined when customer buys amount is defined") ||
    message.includes("customer buys amount cannot be defined when customer buys quantity is defined")
  );
}

async function deleteAutomaticDiscount(admin, id) {
  const data = await gql(admin, AUTOMATIC_DELETE, {
    id: automaticDiscountNodeId(id),
  });
  assertDiscountMutationSuccess(data, "discountAutomaticDelete", "Shopify automatic discount delete");
}

function hasUniqueTitleError(data, mutationName) {
  const errors = data?.data?.[mutationName]?.userErrors || [];
  return errors.some((err) =>
    String(err?.message || "").toLowerCase().includes("title must be unique")
  );
}

function uniqueDiscountTitle(title) {
  const base = String(title || "Discount").trim() || "Discount";
  const suffix = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  return `${base} ${suffix}`;
}

async function firstDeliveryProfileContext(admin) {
  const profilesQuery = `#graphql
    query DeliveryProfiles {
      deliveryProfiles(first: 1) {
        edges {
          node {
            id
            profileLocationGroups {
              locationGroup { id }
              locationGroupZones(first: 1) {
                edges {
                  node {
                    zone { id name }
                  }
                }
              }
            }
          }
        }
      }
      shop { currencyCode }
    }`;

  const data = await gql(admin, profilesQuery, {});
  const topLevelErrors = data?.errors || [];
  if (topLevelErrors.length) {
    throw new Error(`Shopify delivery profile lookup failed: ${graphqlTopLevelErrorMessage(topLevelErrors)}`);
  }

  const profile = data?.data?.deliveryProfiles?.edges?.[0]?.node;
  const locationGroup = profile?.profileLocationGroups?.[0] || profile?.profileLocationGroups?.edges?.[0]?.node;
  const zone = locationGroup?.locationGroupZones?.edges?.[0]?.node?.zone;

  if (!profile?.id || !locationGroup?.locationGroup?.id || !zone?.id) {
    throw new Error("No delivery profile shipping zone found. Create a shipping zone in Shopify Admin first.");
  }

  return {
    profileId: profile.id,
    locationGroupId: locationGroup.locationGroup.id,
    zoneId: zone.id,
    currencyCode: data?.data?.shop?.currencyCode || "USD",
  };
}

const DELIVERY_PROFILE_UPDATE = `#graphql
  mutation DeliveryProfileUpdate($id: ID!, $profile: DeliveryProfileInput!) {
    deliveryProfileUpdate(id: $id, profile: $profile) {
      userErrors { field message }
    }
  }`;

async function deleteDeliveryMethodDefinition(admin, profileId, methodDefinitionId) {
  if (!methodDefinitionId) return;
  const data = await gql(admin, DELIVERY_PROFILE_UPDATE, {
    id: profileId,
    profile: { methodDefinitionsToDelete: [methodDefinitionId] },
  });
  const topLevelErrors = data?.errors || [];
  if (topLevelErrors.length) {
    throw new Error(`Could not replace existing Shopify shipping rate: ${graphqlTopLevelErrorMessage(topLevelErrors)}`);
  }

  const errors = data?.data?.deliveryProfileUpdate?.userErrors || [];
  if (errors.length) {
    throw new Error(`Could not replace existing Shopify shipping rate: ${userErrorMessage(errors)}`);
  }
}

async function findDeliveryMethodDefinition(admin, profileId, name, price, minSubtotal, maxSubtotal) {
  const query = `#graphql
    query DeliveryProfileMethods($id: ID!) {
      deliveryProfile(id: $id) {
        profileLocationGroups {
          locationGroupZones(first: 50) {
            edges {
              node {
                methodDefinitions(first: 50) {
                  edges {
                    node {
                      id
                      name
                      rateProvider {
                        __typename
                        ... on DeliveryRateDefinition {
                          price { amount currencyCode }
                        }
                      }
                      methodConditions {
                        field
                        operator
                        conditionCriteria {
                          __typename
                          ... on MoneyV2 { amount currencyCode }
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
    }`;

  const data = await gql(admin, query, { id: profileId });
  const topLevelErrors = data?.errors || [];
  if (topLevelErrors.length) {
    throw new Error(`Shopify delivery method lookup failed: ${graphqlTopLevelErrorMessage(topLevelErrors)}`);
  }

  const groups = data?.data?.deliveryProfile?.profileLocationGroups || [];
  const normalizedPrice = Number(price || 0).toFixed(2);
  const normalizedMin = minSubtotal !== null && minSubtotal !== undefined ? Number(minSubtotal || 0).toFixed(2) : null;
  const normalizedMax = maxSubtotal !== null && maxSubtotal !== undefined ? Number(maxSubtotal || 0).toFixed(2) : null;

  for (const group of groups) {
    const zones = group?.locationGroupZones?.edges || [];
    for (const zoneEdge of zones) {
      const methods = zoneEdge?.node?.methodDefinitions?.edges || [];
      for (const methodEdge of methods) {
        const method = methodEdge?.node;
        const provider = method?.rateProvider;
        const methodPrice = provider?.__typename === "DeliveryRateDefinition" && provider?.price?.amount !== undefined
          ? Number(provider.price.amount || 0).toFixed(2)
          : null;
        const subtotalConditions = (method?.methodConditions || []).filter((condition) => {
          const field = condition?.field;
          return field === "SUBTOTAL" || field === "ORDER_SUBTOTAL" || field === "TOTAL_PRICE";
        });
        const minCondition = subtotalConditions.find((condition) =>
          String(condition?.operator || "").includes("GREATER")
        );
        const maxCondition = subtotalConditions.find((condition) =>
          String(condition?.operator || "").includes("LESS")
        );
        const methodMin = minCondition?.conditionCriteria?.__typename === "MoneyV2"
          ? Number(minCondition.conditionCriteria.amount || 0).toFixed(2)
          : null;
        const methodMax = maxCondition?.conditionCriteria?.__typename === "MoneyV2"
          ? Number(maxCondition.conditionCriteria.amount || 0).toFixed(2)
          : null;

        if (method?.name === name && methodPrice === normalizedPrice && methodMin === normalizedMin && methodMax === normalizedMax) {
          return method.id;
        }
      }
    }
  }

  return null;
}

async function findDeliveryMethodDefinitionWithRetry(admin, profileId, name, price, minSubtotal, maxSubtotal) {
  const attempts = [0, 400, 900, 1500];

  for (const delay of attempts) {
    if (delay) await wait(delay);
    const methodId = await findDeliveryMethodDefinition(
      admin,
      profileId,
      name,
      price,
      minSubtotal,
      maxSubtotal
    );

    if (methodId) return methodId;
  }

  return null;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Create or update a free-shipping automatic discount.
 * Returns the Shopify discount GID string.
 */
function discountMinimumRequirement({ minReqType, minSubtotal, minQuantity }) {
  return minReqType === "quantity"
    ? {
        quantity: {
          greaterThanOrEqualToQuantity: String(Math.max(1, Math.floor(Number(minQuantity || 1)))),
        },
      }
    : {
        subtotal: {
          greaterThanOrEqualToSubtotal: String(parseFloat(minSubtotal || "0")),
        },
      };
}

export async function upsertFreeShipping(admin, {
  existingId, title, startsAt, endsAt, minSubtotal, minQuantity, minReqType = "subtotal", enabled = true,
  combinesWith = COMBINES_WITH_FREE_SHIPPING_REWARDS,
}) {
  const input = {
    title: withAppNameTitle(title, "Free Shipping"),
    ...discountScheduleFields({ enabled, startsAt, endsAt }),
    minimumRequirement: discountMinimumRequirement({ minReqType, minSubtotal, minQuantity }),
    destination: { all: true },
    combinesWith,
  };

  if (existingId) {
    const data = await gql(admin, FREE_SHIPPING_UPDATE, {
      id: automaticDiscountNodeId(existingId),
      input,
    });
    assertDiscountMutationSuccess(data, "discountAutomaticFreeShippingUpdate", "Shopify free shipping discount update");
    return data?.data?.discountAutomaticFreeShippingUpdate?.automaticDiscountNode?.id || existingId;
  }
  const data = await gql(admin, FREE_SHIPPING_CREATE, { input });
  assertDiscountMutationSuccess(data, "discountAutomaticFreeShippingCreate", "Shopify free shipping discount create");
  const createdId = data?.data?.discountAutomaticFreeShippingCreate?.automaticDiscountNode?.id;
  if (!createdId) throw new Error("Shopify free shipping discount create failed: missing discount id");
  return createdId;
}

/**
 * Create or replace a Shopify Admin shipping-zone rate.
 * Returns the DeliveryMethodDefinition GID string.
 */
export async function upsertShippingRate(admin, { existingId, title, rewardType, amount, minSubtotal, maxSubtotal }) {
  const context = await firstDeliveryProfileContext(admin);
  const price = rewardType === "reduced_rate" ? Number(amount || 0) : 0;
  const min = minSubtotal !== "" && minSubtotal !== null && minSubtotal !== undefined ? Number(minSubtotal || 0) : null;
  const max = maxSubtotal !== "" && maxSubtotal !== null && maxSubtotal !== undefined ? Number(maxSubtotal || 0) : null;

  if (min !== null && max !== null && max < min) {
    throw new Error("Maximum cart value must be greater than or equal to minimum cart value.");
  }

  if (existingId) {
    await deleteDeliveryMethodDefinition(admin, context.profileId, existingId);
  }

  const methodDefinition = {
    name: withAppNameTitle(title || (price > 0 ? "Reduced Shipping" : "Free Shipping"), "Shipping"),
    active: true,
    rateDefinition: {
      price: {
        amount: price.toFixed(2),
        currencyCode: context.currencyCode,
      },
    },
  };

  const priceConditionsToCreate = [];

  if (min !== null) {
    priceConditionsToCreate.push({
        operator: "GREATER_THAN_OR_EQUAL_TO",
        criteria: {
          amount: min.toFixed(2),
          currencyCode: context.currencyCode,
        },
      });
  }

  if (max !== null) {
    priceConditionsToCreate.push({
      operator: "LESS_THAN_OR_EQUAL_TO",
      criteria: {
        amount: max.toFixed(2),
        currencyCode: context.currencyCode,
      },
    });
  }

  if (priceConditionsToCreate.length) {
    methodDefinition.priceConditionsToCreate = priceConditionsToCreate;
  }

  const data = await gql(admin, DELIVERY_PROFILE_UPDATE, {
    id: context.profileId,
    profile: {
      locationGroupsToUpdate: [
        {
          id: context.locationGroupId,
          zonesToUpdate: [
            {
              id: context.zoneId,
              methodDefinitionsToCreate: [methodDefinition],
            },
          ],
        },
      ],
    },
  });

  const topLevelErrors = data?.errors || [];
  if (topLevelErrors.length) {
    throw new Error(`Shopify shipping rate create failed: ${graphqlTopLevelErrorMessage(topLevelErrors)}`);
  }

  const errors = data?.data?.deliveryProfileUpdate?.userErrors || [];
  if (errors.length) {
    throw new Error(`Shopify shipping rate create failed: ${userErrorMessage(errors)}`);
  }

  const createdId = await findDeliveryMethodDefinitionWithRetry(
    admin,
    context.profileId,
    methodDefinition.name,
    price,
    min,
    max
  );

  if (!createdId) {
    throw new Error("Shopify shipping rate was created but its method definition ID could not be found.");
  }

  return createdId;
}

/**
 * Create or update an automatic basic (percentage/fixed) discount.
 * Returns the Shopify discount GID string.
 */
export async function upsertAutomaticBasic(admin, {
  existingId, title, startsAt, endsAt, minSubtotal, minQuantity, minReqType = "subtotal", isPercentage, discountValue, enabled = true,
  combinesWith = COMBINES_WITH_ORDER_DISCOUNTS,
}) {
  const input = {
    title: withAppNameTitle(title, "Automatic Discount"),
    ...discountScheduleFields({ enabled, startsAt, endsAt }),
    minimumRequirement: minReqType === "quantity" || minSubtotal
      ? discountMinimumRequirement({ minReqType, minSubtotal, minQuantity })
      : undefined,
    customerGets: {
      value: isPercentage
        ? { percentage: parseFloat(discountValue) / 100 }
        : { discountAmount: { amount: String(parseFloat(discountValue || "0")), appliesOnEachItem: false } },
      items: { all: true },
    },
    combinesWith,
  };

  if (existingId) {
    const updateId = automaticDiscountUpdateId(existingId, "DiscountAutomaticBasic");
    let data = await gql(admin, AUTOMATIC_BASIC_UPDATE, { id: updateId, input });
    if (hasUniqueTitleError(data, "discountAutomaticBasicUpdate")) {
      data = await gql(admin, AUTOMATIC_BASIC_UPDATE, {
        id: updateId,
        input: {
          ...input,
          title: uniqueDiscountTitle(input.title),
        },
      });
    }
    assertDiscountMutationSuccess(data, "discountAutomaticBasicUpdate", "Shopify automatic discount update");
    return data?.data?.discountAutomaticBasicUpdate?.automaticDiscountNode?.id || existingId;
  }
  let data = await gql(admin, AUTOMATIC_BASIC_CREATE, { input });
  if (hasUniqueTitleError(data, "discountAutomaticBasicCreate")) {
    data = await gql(admin, AUTOMATIC_BASIC_CREATE, {
      input: {
        ...input,
        title: uniqueDiscountTitle(input.title),
      },
    });
  }
  assertDiscountMutationSuccess(data, "discountAutomaticBasicCreate", "Shopify automatic discount create");
  const createdId = data?.data?.discountAutomaticBasicCreate?.automaticDiscountNode?.id;
  if (!createdId) throw new Error("Shopify automatic discount create failed: missing discount id");
  return createdId;
}

/**
 * Create or update an automatic BXGY discount.
 * Returns the Shopify discount GID string.
 */
export async function upsertBxgy(admin, {
  existingId, title, startsAt, endsAt, minReqType, minQty, minSpend, rewardQty, rewardType, rewardDiscount, enabled = true,
  scope, appliesTo, rewardAppliesTo, usesPerOrderLimit, previousScope, previousAppliesTo, previousRewardAppliesTo,
}) {
  const rawSelection = await resolveBxgySelection(admin, { scope, appliesTo });
  const rawPreviousSelection = previousAppliesTo
    ? parseBxgyAppliesTo(previousAppliesTo, previousScope || scope)
    : {};
  const rawRewardSelection = rewardAppliesTo
    ? parseBxgyAppliesTo(rewardAppliesTo, "product")
    : rawSelection;
  const rawPreviousRewardSelection = previousRewardAppliesTo
    ? parseBxgyAppliesTo(previousRewardAppliesTo, "product")
    : {};
  const [selection, previousSelection, rewardSelection, previousRewardSelection] = await Promise.all([
    filterExistingBxgySelection(admin, rawSelection, { context: "Customer buys", strict: true }),
    filterExistingBxgySelection(admin, rawPreviousSelection, { context: "Previous customer buys" }),
    filterExistingBxgySelection(admin, rawRewardSelection, { context: "Customer gets", strict: true }),
    filterExistingBxgySelection(admin, rawPreviousRewardSelection, { context: "Previous customer gets" }),
  ]);
  const buyItems = buildBxgyItemsInput(selection, existingId ? previousSelection : {});
  const getItems = buildBxgyItemsInput(rewardSelection, existingId ? previousRewardSelection : {});
  const parsedUsesPerOrderLimit = parseInt(usesPerOrderLimit || "", 10);
  const spendAmount = positiveNumber(minSpend);
  const quantityAmount = Math.floor(positiveNumber(minQty) || 0);
  if (minReqType === "spend" && !spendAmount) {
    throw new Error("Minimum spend must be greater than 0 for Buy X Get Y discounts.");
  }
  if (minReqType !== "spend" && quantityAmount < 1) {
    throw new Error("Minimum quantity must be at least 1 for Buy X Get Y discounts.");
  }
  const buyValue = minReqType === "spend"
    ? {
        amount: String(spendAmount),
        ...(existingId ? { quantity: null } : {}),
      }
    : {
        quantity: String(quantityAmount),
        ...(existingId ? { amount: null } : {}),
      };
  const input = {
    title: withAppNameTitle(title, "Buy X Get Y Discount"),
    ...discountScheduleFields({ enabled, startsAt, endsAt }),
    customerBuys: {
      items: buyItems,
      value: buyValue,
    },
    customerGets: {
      items: getItems,
      value: {
        discountOnQuantity: {
          quantity: String(parseInt(rewardQty || "1", 10)),
          effect: rewardType === "free_product"
            ? { percentage: 1.0 }
            : { percentage: parseFloat(rewardDiscount || "0") / 100 },
        },
      },
    },
    ...(Number.isFinite(parsedUsesPerOrderLimit) && parsedUsesPerOrderLimit > 0
      ? { usesPerOrderLimit: parsedUsesPerOrderLimit }
      : {}),
    combinesWith: COMBINES_WITH_ORDER_DISCOUNTS,
  };

  if (existingId) {
    const updateId = automaticDiscountUpdateId(existingId, "DiscountAutomaticBxgy");
    let data = await gql(admin, BXGY_UPDATE, { id: updateId, input });
    if (hasUniqueTitleError(data, "discountAutomaticBxgyUpdate")) {
      data = await gql(admin, BXGY_UPDATE, {
        id: updateId,
        input: {
          ...input,
          title: uniqueDiscountTitle(input.title),
        },
      });
    }
    try {
      assertDiscountMutationSuccess(data, "discountAutomaticBxgyUpdate", "Shopify Buy X Get Y discount update");
      return data?.data?.discountAutomaticBxgyUpdate?.automaticDiscountNode?.id || existingId;
    } catch (error) {
      if (!isBxgyUpdateStateConflict(error)) throw error;
      await deleteAutomaticDiscount(admin, existingId);
      let createData = await gql(admin, BXGY_CREATE, { input });
      if (hasUniqueTitleError(createData, "discountAutomaticBxgyCreate")) {
        createData = await gql(admin, BXGY_CREATE, {
          input: {
            ...input,
            title: uniqueDiscountTitle(input.title),
          },
        });
      }
      assertDiscountMutationSuccess(createData, "discountAutomaticBxgyCreate", "Shopify Buy X Get Y discount recreate");
      const recreatedId = createData?.data?.discountAutomaticBxgyCreate?.automaticDiscountNode?.id;
      if (!recreatedId) throw new Error("Shopify Buy X Get Y discount recreate failed: missing discount id");
      return recreatedId;
    }
  }
  let data = await gql(admin, BXGY_CREATE, { input });
  if (hasUniqueTitleError(data, "discountAutomaticBxgyCreate")) {
    data = await gql(admin, BXGY_CREATE, {
      input: {
        ...input,
        title: uniqueDiscountTitle(input.title),
      },
    });
  }
  assertDiscountMutationSuccess(data, "discountAutomaticBxgyCreate", "Shopify Buy X Get Y discount create");
  const createdId = data?.data?.discountAutomaticBxgyCreate?.automaticDiscountNode?.id;
  if (!createdId) throw new Error("Shopify Buy X Get Y discount create failed: missing discount id");
  return createdId;
}

/**
 * Create or update a discount code (basic).
 * Returns the Shopify discount GID string.
 */
export async function upsertDiscountCode(admin, {
  existingId,
  title,
  code,
  startsAt,
  endsAt,
  isPercentage,
  discountValue,
  minSubtotal,
  minQuantity,
  minReqType = "subtotal",
  enabled = true,
}) {
  const codeStr = String(code || "").toUpperCase().trim();
  const minimumRequirement =
    minReqType === "quantity"
      ? minQuantity
        ? {
            quantity: {
              greaterThanOrEqualToQuantity: String(
                Math.max(1, Math.floor(Number(minQuantity || 1)))
              ),
            },
          }
        : undefined
      : minSubtotal
        ? {
            subtotal: {
              greaterThanOrEqualToSubtotal: String(parseFloat(minSubtotal)),
            },
          }
        : undefined;
  const input = {
    title: withAppNameTitle(title, "Code Discount"),
    ...discountScheduleFields({ enabled, startsAt, endsAt }),
    customerSelection: { all: true },
    customerGets: {
      value: isPercentage
        ? { percentage: parseFloat(discountValue || "0") / 100 }
        : { discountAmount: { amount: String(parseFloat(discountValue || "0")), appliesOnEachItem: false } },
      items: { all: true },
    },
    appliesOncePerCustomer: false,
    minimumRequirement,
    combinesWith: COMBINES_WITH_CODE_DISCOUNTS,
    ...(codeStr ? { code: codeStr } : {}),
  };

  if (existingId) {
    let data = await gql(admin, CODE_BASIC_UPDATE, { id: existingId, input });
    if (hasUniqueTitleError(data, "discountCodeBasicUpdate")) {
      data = await gql(admin, CODE_BASIC_UPDATE, {
        id: existingId,
        input: { ...input, title: uniqueDiscountTitle(input.title) },
      });
    }
    assertDiscountMutationSuccess(data, "discountCodeBasicUpdate", "Shopify code discount update");
    return data?.data?.discountCodeBasicUpdate?.codeDiscountNode?.id || existingId;
  }

  const createInput = { ...input, code: codeStr };

  let data = await gql(admin, CODE_BASIC_CREATE, { input: createInput });
  if (hasUniqueTitleError(data, "discountCodeBasicCreate")) {
    data = await gql(admin, CODE_BASIC_CREATE, {
      input: { ...createInput, title: uniqueDiscountTitle(input.title) },
    });
  }
  assertDiscountMutationSuccess(data, "discountCodeBasicCreate", "Shopify code discount create");
  const createdId = data?.data?.discountCodeBasicCreate?.codeDiscountNode?.id;
  if (!createdId) throw new Error("Shopify code discount create failed: missing discount id");
  return createdId;
}
