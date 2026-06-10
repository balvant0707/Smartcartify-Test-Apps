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

const SHOPIFY_TITLE_APP_NAME = "CartLift: Cart Drawer & Upsell";
const EXPIRED_DISCOUNT_STARTS_AT = "2000-01-01T00:00:00.000Z";
const EXPIRED_DISCOUNT_ENDS_AT = "2000-01-02T00:00:00.000Z";

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
      products: normalizeIds(parsed.products),
      collections: normalizeIds(parsed.collections),
    };
  }

  const ids = normalizeIds(parsed);
  return normalizedScope === "collection"
    ? { products: [], collections: ids }
    : { products: ids, collections: [] };
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

function buildBxgyItemsInput(selection = {}) {
  const products = normalizeIds(selection.products);
  const collections = normalizeIds(selection.collections);

  if (products.length) {
    return { products: { productsToAdd: products } };
  }

  if (collections.length) {
    return { collections: { add: collections } };
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
}) {
  const input = {
    title: withAppNameTitle(title, "Free Shipping"),
    ...discountScheduleFields({ enabled, startsAt, endsAt }),
    minimumRequirement: discountMinimumRequirement({ minReqType, minSubtotal, minQuantity }),
    destinationSelection: { all: true },
  };

  if (existingId) {
    const data = await gql(admin, FREE_SHIPPING_UPDATE, { id: existingId, input });
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
    combinesWith: COMBINES_WITH_ORDER_DISCOUNTS,
  };

  if (existingId) {
    let data = await gql(admin, AUTOMATIC_BASIC_UPDATE, { id: existingId, input });
    if (hasUniqueTitleError(data, "discountAutomaticBasicUpdate")) {
      data = await gql(admin, AUTOMATIC_BASIC_UPDATE, {
        id: existingId,
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
  scope, appliesTo,
}) {
  const selection = await resolveBxgySelection(admin, { scope, appliesTo });
  const items = buildBxgyItemsInput(selection);
  const input = {
    title: withAppNameTitle(title, "Buy X Get Y Discount"),
    ...discountScheduleFields({ enabled, startsAt, endsAt }),
    customerBuys: {
      items,
      value: minReqType === "spend"
        ? { subtotalAmount: { amount: String(parseFloat(minSpend || "0")), currencyCode: "USD" } }
        : { quantity: String(parseInt(minQty || "1", 10)) },
    },
    customerGets: {
      items,
      value: {
        discountOnQuantity: {
          quantity: String(parseInt(rewardQty || "1", 10)),
          effect: rewardType === "free_product"
            ? { percentage: 1.0 }
            : { percentage: parseFloat(rewardDiscount || "0") / 100 },
        },
      },
    },
    combinesWith: COMBINES_WITH_ORDER_DISCOUNTS,
  };

  if (existingId) {
    let data = await gql(admin, BXGY_UPDATE, { id: existingId, input });
    if (hasUniqueTitleError(data, "discountAutomaticBxgyUpdate")) {
      data = await gql(admin, BXGY_UPDATE, {
        id: existingId,
        input: {
          ...input,
          title: uniqueDiscountTitle(input.title),
        },
      });
    }
    assertDiscountMutationSuccess(data, "discountAutomaticBxgyUpdate", "Shopify Buy X Get Y discount update");
    return data?.data?.discountAutomaticBxgyUpdate?.automaticDiscountNode?.id || existingId;
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
  existingId, title, code, startsAt, endsAt, isPercentage, discountValue, minSubtotal, enabled = true,
}) {
  const codeStr = String(code || "").toUpperCase().trim();
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
    minimumRequirement: minSubtotal
      ? { subtotal: { greaterThanOrEqualToSubtotal: String(parseFloat(minSubtotal)) } }
      : undefined,
    combinesWith: COMBINES_WITH_ORDER_DISCOUNTS,
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
