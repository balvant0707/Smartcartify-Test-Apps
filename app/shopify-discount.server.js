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
    discountAutomaticBxgyCreate(bxgyAutomaticDiscount: $input) {
      automaticDiscountNode { id }
      userErrors { field message }
    }
  }`;

const BXGY_UPDATE = `#graphql
  mutation discountAutomaticBxgyUpdate($id: ID!, $input: DiscountAutomaticBxgyInput!) {
    discountAutomaticBxgyUpdate(id: $id, bxgyAutomaticDiscount: $input) {
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

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Create or update a free-shipping automatic discount.
 * Returns the Shopify discount GID string.
 */
export async function upsertFreeShipping(admin, { existingId, title, startsAt, endsAt, minSubtotal }) {
  const input = {
    title,
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
 * Create or update an automatic basic (percentage/fixed) discount.
 * Returns the Shopify discount GID string.
 */
export async function upsertAutomaticBasic(admin, {
  existingId, title, startsAt, endsAt, minSubtotal, isPercentage, discountValue,
}) {
  const input = {
    title,
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
  };

  if (existingId) {
    const data = await gql(admin, AUTOMATIC_BASIC_UPDATE, { id: existingId, input });
    return data?.data?.discountAutomaticBasicUpdate?.automaticDiscountNode?.id || existingId;
  }
  const data = await gql(admin, AUTOMATIC_BASIC_CREATE, { input });
  return data?.data?.discountAutomaticBasicCreate?.automaticDiscountNode?.id || null;
}

/**
 * Create or update an automatic BXGY discount.
 * Returns the Shopify discount GID string.
 */
export async function upsertBxgy(admin, {
  existingId, title, startsAt, endsAt, minReqType, minQty, minSpend, rewardQty, rewardType, rewardDiscount,
}) {
  const input = {
    title,
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
  };

  if (existingId) {
    const data = await gql(admin, BXGY_UPDATE, { id: existingId, input });
    return data?.data?.discountAutomaticBxgyUpdate?.automaticDiscountNode?.id || existingId;
  }
  const data = await gql(admin, BXGY_CREATE, { input });
  return data?.data?.discountAutomaticBxgyCreate?.automaticDiscountNode?.id || null;
}

/**
 * Create or update a discount code (basic).
 * Returns the Shopify discount GID string.
 */
export async function upsertDiscountCode(admin, {
  existingId, title, code, startsAt, endsAt, isPercentage, discountValue, minSubtotal,
}) {
  const input = {
    title,
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
  };

  if (existingId) {
    const data = await gql(admin, CODE_BASIC_UPDATE, { id: existingId, input: { ...input, codes: { add: [] } } });
    return data?.data?.discountCodeBasicUpdate?.codeDiscountNode?.id || existingId;
  }
  const data = await gql(admin, CODE_BASIC_CREATE, { input: { ...input, codes: { add: [{ code }] } } });
  return data?.data?.discountCodeBasicCreate?.codeDiscountNode?.id || null;
}
