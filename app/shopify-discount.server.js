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

function withAppNameTitle(title, fallback = "Discount") {
  const base = String(title || fallback).trim() || fallback;
  return base.toLowerCase().includes(SHOPIFY_TITLE_APP_NAME.toLowerCase())
    ? base
    : `${SHOPIFY_TITLE_APP_NAME} ${base}`;
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
export async function upsertFreeShipping(admin, { existingId, title, startsAt, endsAt, minSubtotal }) {
  const input = {
    title: withAppNameTitle(title, "Free Shipping"),
    startsAt: startsAt || new Date().toISOString(),
    endsAt: endsAt || null,
    minimumRequirement: {
      subtotal: { greaterThanOrEqualToSubtotal: String(parseFloat(minSubtotal || "0")) },
    },
    destinationSelection: { all: true },
  };

  if (existingId) {
    const data = await gql(admin, FREE_SHIPPING_UPDATE, { id: existingId, input });
    return data?.data?.discountAutomaticFreeShippingUpdate?.automaticDiscountNode?.id || existingId;
  }
  const data = await gql(admin, FREE_SHIPPING_CREATE, { input });
  return data?.data?.discountAutomaticFreeShippingCreate?.automaticDiscountNode?.id || null;
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
  existingId, title, startsAt, endsAt, minSubtotal, isPercentage, discountValue,
}) {
  const input = {
    title: withAppNameTitle(title, "Automatic Discount"),
    startsAt: startsAt || new Date().toISOString(),
    endsAt: endsAt || null,
    minimumRequirement: minSubtotal
      ? { subtotal: { greaterThanOrEqualToSubtotal: String(parseFloat(minSubtotal)) } }
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
  existingId, title, startsAt, endsAt, minReqType, minQty, minSpend, rewardQty, rewardType, rewardDiscount,
}) {
  const input = {
    title: withAppNameTitle(title, "Buy X Get Y Discount"),
    startsAt: startsAt || new Date().toISOString(),
    endsAt: endsAt || null,
    customerBuys: {
      items: { all: true },
      value: minReqType === "spend"
        ? { subtotalAmount: { amount: String(parseFloat(minSpend || "0")), currencyCode: "USD" } }
        : { quantity: { quantity: parseInt(minQty || "1") } },
    },
    customerGets: {
      items: { all: true },
      value: {
        discountOnQuantity: {
          quantity: parseInt(rewardQty || "1"),
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
  existingId, title, code, startsAt, endsAt, isPercentage, discountValue, minSubtotal,
}) {
  const input = {
    title: withAppNameTitle(title, "Code Discount"),
    startsAt: startsAt || new Date().toISOString(),
    endsAt: endsAt || null,
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
  };

  if (existingId) {
    let data = await gql(admin, CODE_BASIC_UPDATE, { id: existingId, input: { ...input, codes: { add: [] } } });
    if (hasUniqueTitleError(data, "discountCodeBasicUpdate")) {
      data = await gql(admin, CODE_BASIC_UPDATE, {
        id: existingId,
        input: {
          ...input,
          title: uniqueDiscountTitle(input.title),
          codes: { add: [] },
        },
      });
    }
    assertDiscountMutationSuccess(data, "discountCodeBasicUpdate", "Shopify code discount update");
    return data?.data?.discountCodeBasicUpdate?.codeDiscountNode?.id || existingId;
  }
  let data = await gql(admin, CODE_BASIC_CREATE, { input: { ...input, codes: { add: [{ code }] } } });
  if (hasUniqueTitleError(data, "discountCodeBasicCreate")) {
    data = await gql(admin, CODE_BASIC_CREATE, {
      input: {
        ...input,
        title: uniqueDiscountTitle(input.title),
        codes: { add: [{ code }] },
      },
    });
  }
  assertDiscountMutationSuccess(data, "discountCodeBasicCreate", "Shopify code discount create");
  const createdId = data?.data?.discountCodeBasicCreate?.codeDiscountNode?.id;
  if (!createdId) throw new Error("Shopify code discount create failed: missing discount id");
  return createdId;
}
