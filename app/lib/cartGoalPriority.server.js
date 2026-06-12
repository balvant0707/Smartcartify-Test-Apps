import prisma from "../db.server";

function safeJsonParse(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function cartGoalPrioritySort(a = {}, b = {}) {
  const priorityDiff = Number(b.priority || 0) - Number(a.priority || 0);
  if (priorityDiff) return priorityDiff;

  const bUpdated = new Date(b.updatedAt || 0).getTime() || 0;
  const aUpdated = new Date(a.updatedAt || 0).getTime() || 0;
  const updatedDiff = bUpdated - aUpdated;
  if (updatedDiff) return updatedDiff;

  return Number(b.id || 0) - Number(a.id || 0);
}

export function getCartGoalDiscountIds(rule) {
  const goals = safeJsonParse(rule?.goals, []);
  if (!Array.isArray(goals)) return [];

  return [
    ...new Set(
      goals
        .map((goal) => String(goal?.shopifyDiscountId || "").trim())
        .filter(Boolean)
    ),
  ];
}

export async function deactivateCartGoalRuleDiscounts(admin, rule) {
  const discountIds = getCartGoalDiscountIds(rule);

  for (const discountId of discountIds) {
    await setAutomaticDiscountActive(admin, discountId, false);
  }
}

async function setAutomaticDiscountActive(admin, discountId, enabled) {
  if (!discountId) return;

  const mutation = enabled
    ? `#graphql
      mutation DiscountAutomaticActivate($id: ID!) {
        discountAutomaticActivate(id: $id) {
          userErrors { field message }
        }
      }`
    : `#graphql
      mutation DiscountAutomaticDeactivate($id: ID!) {
        discountAutomaticDeactivate(id: $id) {
          userErrors { field message }
        }
      }`;
  const rootKey = enabled
    ? "discountAutomaticActivate"
    : "discountAutomaticDeactivate";

  const result = await (await admin.graphql(mutation, { variables: { id: discountId } })).json();
  const topLevelErrors = result?.errors || [];
  const userErrors = result?.data?.[rootKey]?.userErrors || [];

  if (topLevelErrors.length || userErrors.length) {
    const messages = [
      ...topLevelErrors.map((error) => error?.message).filter(Boolean),
      ...userErrors.map((error) => error?.message).filter(Boolean),
    ];
    const message = messages.join(", ") || "Shopify discount active-state update failed";
    if (/not\s+found|does\s+not\s+exist|invalid\s+id/i.test(message)) return;
    throw new Error(message);
  }
}

const DISCOUNT_CLASSES_QUERY = `#graphql
  query CartGoalAutomaticDiscountClasses($id: ID!) {
    automaticDiscountNode(id: $id) {
      automaticDiscount {
        __typename
        ... on DiscountAutomaticBasic {
          discountClasses
        }
        ... on DiscountAutomaticBxgy {
          discountClasses
        }
        ... on DiscountAutomaticFreeShipping {
          discountClasses
        }
      }
    }
  }`;

const BASIC_COMBINES_UPDATE = `#graphql
  mutation DiscountAutomaticBasicUpdate($id: ID!, $input: DiscountAutomaticBasicInput!) {
    discountAutomaticBasicUpdate(id: $id, automaticBasicDiscount: $input) {
      automaticDiscountNode { id }
      userErrors { field message }
    }
  }`;

const BXGY_COMBINES_UPDATE = `#graphql
  mutation DiscountAutomaticBxgyUpdate($id: ID!, $input: DiscountAutomaticBxgyInput!) {
    discountAutomaticBxgyUpdate(id: $id, automaticBxgyDiscount: $input) {
      automaticDiscountNode { id }
      userErrors { field message }
    }
  }`;

const FREE_SHIPPING_COMBINES_UPDATE = `#graphql
  mutation DiscountAutomaticFreeShippingUpdate($id: ID!, $input: DiscountAutomaticFreeShippingInput!) {
    discountAutomaticFreeShippingUpdate(id: $id, freeShippingAutomaticDiscount: $input) {
      automaticDiscountNode { id }
      userErrors { field message }
    }
  }`;

function combinesWithForDiscountClasses(discountClasses = []) {
  const classes = new Set(
    (Array.isArray(discountClasses) ? discountClasses : [])
      .map((discountClass) => String(discountClass || "").toUpperCase())
      .filter(Boolean)
  );

  if (!classes.size) return null;

  return {
    orderDiscounts: !classes.has("ORDER"),
    productDiscounts: !classes.has("PRODUCT"),
    shippingDiscounts: !classes.has("SHIPPING"),
  };
}

async function getAutomaticDiscountDetails(admin, discountId) {
  const result = await (await admin.graphql(DISCOUNT_CLASSES_QUERY, {
    variables: { id: discountId },
  })).json();

  const topLevelErrors = result?.errors || [];
  if (topLevelErrors.length) {
    const message = topLevelErrors.map((error) => error?.message).filter(Boolean).join(", ");
    if (/not\s+found|does\s+not\s+exist|invalid\s+id/i.test(message)) return null;
    throw new Error(message || "Shopify discount lookup failed");
  }

  return result?.data?.automaticDiscountNode?.automaticDiscount || null;
}

async function setCartGoalDiscountCombines(admin, discountId) {
  if (!discountId) return;

  const discount = await getAutomaticDiscountDetails(admin, discountId);
  const combinesWith = combinesWithForDiscountClasses(discount?.discountClasses);
  if (!discount || !combinesWith) return;

  const updateConfig = {
    DiscountAutomaticBasic: {
      mutation: BASIC_COMBINES_UPDATE,
      rootKey: "discountAutomaticBasicUpdate",
    },
    DiscountAutomaticBxgy: {
      mutation: BXGY_COMBINES_UPDATE,
      rootKey: "discountAutomaticBxgyUpdate",
    },
    DiscountAutomaticFreeShipping: {
      mutation: FREE_SHIPPING_COMBINES_UPDATE,
      rootKey: "discountAutomaticFreeShippingUpdate",
    },
  }[discount.__typename];

  if (!updateConfig) return;

  const result = await (await admin.graphql(updateConfig.mutation, {
    variables: {
      id: discountId,
      input: {
        combinesWith,
      },
    },
  })).json();
  const topLevelErrors = result?.errors || [];
  const userErrors = result?.data?.[updateConfig.rootKey]?.userErrors || [];

  if (topLevelErrors.length || userErrors.length) {
    const messages = [
      ...topLevelErrors.map((error) => error?.message).filter(Boolean),
      ...userErrors.map((error) => error?.message).filter(Boolean),
    ];
    const message = messages.join(", ") || "";
    if (/not\s+found|does\s+not\s+exist|invalid\s+id|combinesWith settings are not valid/i.test(message)) {
      return;
    }
    throw new Error(message || "Shopify discount combine update failed");
  }
}

export async function reconcileCartGoalPriorityDiscounts(admin, shop) {
  if (!admin || !shop) return;

  const rules = await prisma.cartGoalRule.findMany({
    where: { shop },
    select: {
      id: true,
      enabled: true,
      priority: true,
      updatedAt: true,
      goals: true,
    },
  });
  const firstActiveRule = rules
    .filter((rule) => rule.enabled !== false && rule.enabled !== 0)
    .sort(cartGoalPrioritySort)[0];
  const firstActiveId = firstActiveRule?.id ?? null;

  for (const rule of rules) {
    const shouldBeActive = Boolean(firstActiveId && rule.id === firstActiveId);
    const discountIds = getCartGoalDiscountIds(rule);

    for (const discountId of discountIds) {
      await setCartGoalDiscountCombines(admin, discountId);
      await setAutomaticDiscountActive(admin, discountId, shouldBeActive);
    }
  }
}

export function clearCartGoalDiscountIdsFromGoals(goalsValue) {
  const goals = safeJsonParse(goalsValue, []);
  if (!Array.isArray(goals)) return goalsValue;
  return JSON.stringify(
    goals.map((goal) => ({
      ...goal,
      shopifyDiscountId: null,
      shopifySyncWarning: null,
    }))
  );
}
