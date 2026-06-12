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
