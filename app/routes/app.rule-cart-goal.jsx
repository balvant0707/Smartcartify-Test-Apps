import { useEffect, useMemo, useRef, useState } from "react";
import {
  useActionData,
  useFetcher,
  useLoaderData,
  useNavigate,
  useNavigation,
  useSearchParams,
  useSubmit,
} from "react-router";
import {
  Banner,
  BlockStack,
  Box,
  Button,
  ButtonGroup,
  Card,
  Checkbox,
  Collapsible,
  Divider,
  Icon,
  InlineStack,
  Modal,
  Page,
  Popover,
  ActionList,
  RangeSlider,
  Select,
  Text,
  TextField,
} from "@shopify/polaris";
import {
  ArrowDownIcon,
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  DeleteIcon,
  DeliveryIcon,
  DiscountIcon,
  EditIcon,
  GiftCardIcon,
  MenuHorizontalIcon,
  MinimizeIcon,
  MaximizeIcon,
  PauseCircleIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { invalidateShopCache } from "./app.proxy.smart.jsx";
import {
  upsertAutomaticBasic,
  upsertFreeShipping,
} from "../shopify-discount.server";
import { syncFreeProductDiscountsToShopify } from "../lib/minAmountFreeGift.server";
import { reconcileCartGoalPriorityDiscounts } from "../lib/cartGoalPriority.server";

const GOAL_TEXT_FIELDS = [
  {
    key: "aboveBefore",
    label: "Text above progress bar (before achieving goal)",
  },
  {
    key: "aboveAfter",
    label: "Text above progress bar (after achieving goal)",
  },
  { key: "below", label: "Text below progress bar" },
  {
    key: "offerTitleBefore",
    label: "Title shown in offer page (before achieving the goal)",
  },
  {
    key: "offerTitleAfter",
    label: "Title shown in offer page (post application CTA)",
  },
  {
    key: "offerSubtitleBefore",
    label: "Sub-Title Shown in Offer Page (before achieving the goal)",
  },
  {
    key: "offerSubtitleAfter",
    label: "Sub-Title Shown in Offer Page (after achieving the goal)",
  },
];

const REWARD_CONFIG = {
  gift: {
    type: "gift",
    title: "Free product",
    menuLabel: "Free product",
    icon: GiftCardIcon,
    goal: "450",
    previewLabel: "Free Gift!",
    texts: {
      aboveBefore: "Add {{goal}} more to get Free Gift with this order",
      aboveAfter: "Congratulations! You have unlocked Free Gift!",
      below: "Free Gift!",
      offerTitleBefore: "Free Gift",
      offerTitleAfter: "Free Gift",
      offerSubtitleBefore: "Add {{goal}} more to get Free Gift with this order",
      offerSubtitleAfter: "Congratulations! You have unlocked free Gift!",
    },
  },
  discount: {
    type: "discount",
    title: "Order Discount",
    menuLabel: "Order discount",
    icon: DiscountIcon,
    goal: "500",
    value: "20",
    discountType: "percentage",
    previewLabel: "20% Off",
    texts: {
      aboveBefore: "Add {{goal}} more to get a {{discount}} discount on this order",
      aboveAfter: "Congratulations! You have unlocked the {{discount}} discount!",
      below: "{{discount}} Off",
      offerTitleBefore: "{{discount}} Discount",
      offerTitleAfter: "{{discount}} Discount",
      offerSubtitleBefore:
        "Add {{goal}} more to get a {{discount}} discount on this order",
      offerSubtitleAfter:
        "Congratulations! You have unlocked the {{discount}} discount!",
    },
  },
  shipping: {
    type: "shipping",
    title: "Free Shipping",
    menuLabel: "Free shipping",
    icon: DeliveryIcon,
    goal: "550",
    previewLabel: "Free Shipping!",
    texts: {
      aboveBefore: "Add {{goal}} more to get Free Shipping on this order",
      aboveAfter: "Congratulations! You have unlocked Free Shipping!",
      below: "Free Shipping!",
      offerTitleBefore: "Free Shipping",
      offerTitleAfter: "Free Shipping",
      offerSubtitleBefore: "Add {{goal}} more to get free shipping on this order",
      offerSubtitleAfter: "Congratulations! You have unlocked free shipping!",
    },
  },
};

const REWARD_ID_PREFIX = {
  gift: "GIFT",
  discount: "OFF",
  shipping: "SHIP",
};

const REWARD_CHANGE_LABELS = {
  gift: "Change reward to free product",
  discount: "Change reward to order discount",
  shipping: "Change reward to free shipping",
};

const CART_GOAL_ORDER_DISCOUNT_COMBINES_WITH = {
  orderDiscounts: false,
  productDiscounts: true,
  shippingDiscounts: true,
};


const DEFAULT_STORE_CURRENCY_CODE = "INR";
const DEFAULT_STORE_CURRENCY_SYMBOL = "₹";

function currencySymbolFromCode(currencyCode) {
  const code = String(currencyCode || DEFAULT_STORE_CURRENCY_CODE).trim().toUpperCase();

  try {
    const part = new Intl.NumberFormat("en", {
      style: "currency",
      currency: code,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
      .formatToParts(0)
      .find((item) => item.type === "currency");

    return part?.value || code;
  } catch {
    return DEFAULT_STORE_CURRENCY_SYMBOL;
  }
}

async function getShopCurrency(admin) {
  try {
    const response = await admin.graphql(`
      query ShopCurrencyForCartGoal {
        shop {
          currencyCode
        }
      }
    `);
    const payload = await response.json();
    const currencyCode = String(
      payload?.data?.shop?.currencyCode || DEFAULT_STORE_CURRENCY_CODE
    ).toUpperCase();

    return {
      currencyCode,
      currencySymbol: currencySymbolFromCode(currencyCode),
    };
  } catch (error) {
    console.error("[Cart Goal] Failed to load shop currency:", error);
    return {
      currencyCode: DEFAULT_STORE_CURRENCY_CODE,
      currencySymbol: DEFAULT_STORE_CURRENCY_SYMBOL,
    };
  }
}

function formatCurrencyAmount(value, currencySymbol = DEFAULT_STORE_CURRENCY_SYMBOL) {
  return `${currencySymbol}${value}`;
}

function makeRewardId(type, index) {
  const seed = `${type}-${index + 1}`;
  let hash = 0;

  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }

  return `${REWARD_ID_PREFIX[type]}${hash.toString(36).toUpperCase().slice(0, 6)}`;
}

function makeGoal(type, index, expanded = false) {
  const config = REWARD_CONFIG[type];
  const goal = {
    ...config,
    id: makeRewardId(type, index),
    expanded,
    goal: String(Number(config.goal) + Math.floor(index / 3) * 50),
    texts: { ...config.texts },
  };

  return type === "gift" ? { ...goal, qty: "1" } : goal;
}

function getGiftProductIds(goal) {
  return Array.isArray(goal?.bonusProductIds)
    ? goal.bonusProductIds.filter(Boolean)
    : [goal?.bonusProductId || goal?.bonus || null].filter(Boolean);
}

function getGiftChoiceQuantity(goal) {
  const selectedCount = getGiftProductIds(goal).length;
  const maxChoices = Math.max(1, selectedCount || 1);
  const quantity = Math.max(1, Number(goal?.qty || 1) || 1);
  return String(Math.min(quantity, maxChoices));
}

function syncGiftChoiceQuantity(goal) {
  return goal?.type === "gift"
    ? { ...goal, qty: getGiftChoiceQuantity(goal) }
    : goal;
}

function convertGoalRewardType(goal, nextType, index) {
  const type = REWARD_CONFIG[nextType] ? nextType : normalizeGoalType(goal);
  const base = makeGoal(type, index, Boolean(goal?.expanded));
  const converted = {
    ...base,
    goal: String(goal?.goal || base.goal),
    id: makeRewardId(type, index),
    expanded: Boolean(goal?.expanded),
    texts: { ...base.texts },
    shopifyDiscountId: null,
    shopifySyncWarning: null,
  };

  if (type === "discount") {
    return {
      ...converted,
      value: base.value,
      discountType: base.discountType,
    };
  }

  if (type === "gift") {
    return syncGiftChoiceQuantity({
      ...converted,
      bonusProductIds: [],
      bonusProducts: [],
      bonusProductId: "",
      bonusProductTitle: "",
      bonusProductVariantId: "",
    });
  }

  return converted;
}

function defaultSettings() {
  const today = new Date();
  return {
    startDate: today.toISOString().slice(0, 10),
    startTime: today.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }),
    hasEndDate: false,
    endDate: "",
    endTime: "",
    showcaseFreeGifts: "hide",
    discountProgressMode: "after",
    rewardSelectionMandatory: "yes",
    customerTarget: "all",
    customerTags: "",
    targetingRules: [],
  };
}

function defaultGoals() {
  return [];
}

function safeJsonParse(value, fallback) {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function normalizeGoalTexts(goal, base) {
  const submittedTexts = goal?.texts || {};
  return GOAL_TEXT_FIELDS.reduce((texts, field) => {
    const value = submittedTexts[field.key];
    texts[field.key] =
      value === undefined || value === null
        ? base.texts[field.key] || ""
        : String(value);
    return texts;
  }, {});
}

function normalizeGoalType(goal) {
  const rawType = String(goal?.type ?? goal?.Type ?? goal?.rewardType ?? "").trim().toLowerCase();
  if (["gift", "free", "free_product", "free-product", "product"].includes(rawType)) return "gift";
  if (["shipping", "free_shipping", "free-shipping"].includes(rawType)) return "shipping";
  if (["discount", "order_discount", "order-discount"].includes(rawType)) return "discount";
  return "gift";
}

function normalizeGoal(goal, index) {
  const type = normalizeGoalType(goal);
  const base = makeGoal(type, index);
  return syncGiftChoiceQuantity({
    ...base,
    ...goal,
    type,
    id: goal?.id || makeRewardId(type, index),
    goal: String(goal?.goal || base.goal),
    value: goal?.value === undefined ? base.value : String(goal.value),
    discountType: goal?.discountType || base.discountType,
    expanded: Boolean(goal?.expanded),
    texts: normalizeGoalTexts(goal, base),
  });
}

function serializeGoals(goals) {
  return JSON.stringify((Array.isArray(goals) ? goals : defaultGoals()).map(normalizeGoal));
}

function formatDiscountValue(goal, currencySymbol = DEFAULT_STORE_CURRENCY_SYMBOL) {
  const value = goal?.value || "0";
  return goal?.discountType === "amount"
    ? formatCurrencyAmount(value, currencySymbol)
    : `${value}%`;
}

function getGoalContentText(goal, key) {
  if (!goal) return "";
  const customText = goal?.texts?.[key];
  if (customText !== undefined && customText !== null) return String(customText);
  return String(REWARD_CONFIG[goal.type]?.texts?.[key] || "");
}

function getGoalValidationErrors(goals, trackBy) {
  const label = trackBy === "quantity" ? "Quantity" : "Amount";
  return goals.map((goal, index) => {
    const value = Number(goal.goal);
    const previousValue = index > 0 ? Number(goals[index - 1]?.goal) : null;

    if (!Number.isFinite(value) || value <= 0) {
      return `${label} is required`;
    }

    if (index > 0 && Number.isFinite(previousValue) && value <= previousValue) {
      return `${label} must be greater than step ${index}`;
    }

    return "";
  });
}

function getRewardValidationErrors(goals) {
  return goals.map((goal) => {
    if (goal.type === "gift") {
      const productIds = getGiftProductIds(goal);

      return productIds.length ? "" : "Select at least one free product";
    }

    if (goal.type === "discount") {
      const discountValue = Number(goal.value);

      if (!Number.isFinite(discountValue) || discountValue <= 0) {
        return goal.discountType === "amount"
          ? "Enter order discount amount"
          : "Enter order discount percentage";
      }

      if (goal.discountType !== "amount" && discountValue > 100) {
        return "Percentage discount cannot be more than 100";
      }
    }

    return "";
  });
}

function normalizePriority(value) {
  const priority = Number(value);
  return Number.isFinite(priority) ? Math.trunc(priority) : 0;
}

function cartGoalThreshold(goal, trackBy) {
  const value = Number(goal.goal || 0);
  return trackBy === "quantity"
    ? { minReqType: "quantity", minQuantity: String(Math.max(1, Math.floor(value))) }
    : { minReqType: "subtotal", minSubtotal: String(Math.max(0, value)) };
}

async function nextCartGoalCampaignName(shop) {
  const rows = await prisma.cartGoalRule.findMany({
    where: { shop },
    select: { campaignName: true },
  });

  const maxNumber = rows.reduce((max, row) => {
    const match = String(row.campaignName || "").trim().match(/^Cart Goal\s+(\d+)$/i);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);

  return `Cart Goal ${Math.max(maxNumber, rows.length) + 1}`;
}

async function syncCartGoalDiscounts({
  admin,
  shop,
  accessToken,
  campaignName,
  enabled,
  trackBy,
  goals,
}) {
  const syncedGoals = [];

  for (let index = 0; index < goals.length; index += 1) {
    const goal = goals[index];
    const title = `${campaignName || "Cart Goal"} - Goal ${index + 1} ${goal.title}`;
    const threshold = cartGoalThreshold(goal, trackBy);

    if (goal.type === "shipping") {
      const shopifyDiscountId = await upsertFreeShipping(admin, {
        existingId: goal.shopifyDiscountId || null,
        title,
        enabled,
        ...threshold,
      });
      syncedGoals.push({ ...goal, shopifyDiscountId });
      continue;
    }

    if (goal.type === "discount") {
      const shopifyDiscountId = await upsertAutomaticBasic(admin, {
        existingId: goal.shopifyDiscountId || null,
        title,
        enabled,
        isPercentage: goal.discountType !== "amount",
        discountValue: goal.value || "0",
        combinesWith: CART_GOAL_ORDER_DISCOUNT_COMBINES_WITH,
        ...threshold,
      });
      syncedGoals.push({ ...goal, shopifyDiscountId });
      continue;
    }

    if (goal.type === "gift") {
      const bonusProductIds = getGiftProductIds(goal);

      if (!bonusProductIds.length) {
        syncedGoals.push({
          ...goal,
          shopifySyncWarning: "Select at least one free product before Shopify discount sync can create this reward.",
        });
        continue;
      }

      const syncResults = await syncFreeProductDiscountsToShopify({
        shopDomain: shop,
        accessToken,
        rules: [
          {
            bonus: String(bonusProductIds[0]),
            bonusProductIds,
            minPurchase: trackBy === "value" ? goal.goal : null,
            minQuantity: trackBy === "quantity" ? goal.goal : null,
            triggerType: trackBy === "quantity" ? "quantity" : "amount",
            qty: getGiftChoiceQuantity(goal),
            limit: goal.limitPerOrder || null,
            enabled,
          },
        ],
        existingDiscountIds: [goal.shopifyDiscountId || null],
      });

      syncedGoals.push({
        ...goal,
        shopifyDiscountId: syncResults?.[0]?.id || goal.shopifyDiscountId || null,
        shopifySyncWarning: null,
      });
      continue;
    }

    syncedGoals.push(goal);
  }

  return syncedGoals;
}

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const id = Number.parseInt(url.searchParams.get("id") || "", 10);
  const shopCurrency = await getShopCurrency(admin);

  if (!Number.isFinite(id)) {
    return {
      rule: null,
      nextCampaignName: await nextCartGoalCampaignName(session.shop),
      ...shopCurrency,
    };
  }

  const row = await prisma.cartGoalRule.findFirst({
    where: { id, shop: session.shop },
  });

  return {
    nextCampaignName: "Cart Goal 1",
    ...shopCurrency,
    rule: row
      ? {
        ...row,
        goals: safeJsonParse(row.goals, defaultGoals()).map(normalizeGoal),
        customerTarget: row.customerTarget || "all",
        customerTags: row.customerTags || "",
        targetingRules: safeJsonParse(row.targetingRules, []),
      }
      : null,
  };
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const body = await request.json().catch(() => ({}));
  const id = Number.parseInt(body.id || "", 10);
  const saveAsDraft = body._action === "saveDraft";
  const existingRule = Number.isFinite(id)
    ? await prisma.cartGoalRule.findFirst({
      where: { id, shop: session.shop },
      select: { id: true, goals: true },
    })
    : null;
  const existingGoals = safeJsonParse(existingRule?.goals, []);
  const existingGoalById = new Map(
    existingGoals.map((goal) => [goal?.id, goal]).filter(([goalId]) => goalId)
  );
  const trackBy = body.trackBy === "quantity" ? "quantity" : "value";
  const submittedGoals = Array.isArray(body.goals) ? body.goals : defaultGoals();
  const goals = submittedGoals.map((goal, index) =>
    normalizeGoal({ ...(existingGoalById.get(goal?.id) || {}), ...goal }, index)
  );
  const thresholdErrors = getGoalValidationErrors(goals, trackBy);
  const rewardErrors = getRewardValidationErrors(goals);
  const targetingRules = Array.isArray(body.targetingRules) ? body.targetingRules : [];
  const enabled = saveAsDraft ? false : Boolean(body.enabled);

  if (Number.isFinite(id) && !existingRule) {
    return { error: "Cart Goal campaign not found" };
  }

  const firstValidationError = [...thresholdErrors, ...rewardErrors].find(Boolean);
  if (!saveAsDraft && firstValidationError) {
    return { error: firstValidationError };
  }

  let syncedGoals;
  if (saveAsDraft) {
    syncedGoals = goals.map((goal) => ({
      ...goal,
      shopifyDiscountId: existingGoalById.get(goal?.id)?.shopifyDiscountId || null,
      shopifySyncWarning: null,
    }));
  } else {
    try {
      syncedGoals = await syncCartGoalDiscounts({
        admin,
        shop: session.shop,
        accessToken: session.accessToken,
        campaignName: body.campaignName || "Cart Goal",
        enabled,
        trackBy,
        goals,
      });
    } catch (err) {
      return { error: err?.message || "Shopify discount sync failed" };
    }
  }

  const data = {
    shop: session.shop,
    campaignName: body.campaignName || "Cart Goal",
    enabled,
    priority: normalizePriority(body.priority),
    trackBy,
    shownGoals: Math.min(3, Math.max(1, Number(body.shownGoals) || 3)),
    goals: serializeGoals(syncedGoals),
    startDate: body.startDate || null,
    startTime: body.startTime || null,
    hasEndDate: Boolean(body.hasEndDate),
    endDate: body.hasEndDate ? body.endDate || null : null,
    endTime: body.hasEndDate ? body.endTime || null : null,
    showcaseFreeGifts: body.showcaseFreeGifts === "show" ? "show" : "hide",
    discountProgressMode: body.discountProgressMode === "before" ? "before" : "after",
    rewardSelectionMandatory: body.rewardSelectionMandatory === "no" ? "no" : "yes",
    customerTarget: body.customerTarget || "all",
    customerTags:
      body.customerTarget === "tagged" || body.customerTarget === "without_tag"
        ? String(body.customerTags || "")
        : "",
    targetingRules: JSON.stringify(targetingRules),
  };

  let record;
  if (Number.isFinite(id)) {
    await prisma.cartGoalRule.updateMany({ where: { id, shop: session.shop }, data });
    record = { id };
  } else {
    record = await prisma.cartGoalRule.create({ data });
  }

  try {
    await reconcileCartGoalPriorityDiscounts(admin, session.shop);
  } catch (err) {
    return { error: err?.message || "Cart Goal priority sync failed" };
  }

  invalidateShopCache(session.shop);
  return { success: true, draft: saveAsDraft, id: record.id };
};

function SectionCard({
  icon,
  title,
  children,
  defaultOpen = true,
  open: controlledOpen,
  onOpenChange,
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = typeof controlledOpen === "boolean" ? controlledOpen : internalOpen;
  const setOpen = (nextOpen) => {
    const value =
      typeof nextOpen === "function" ? nextOpen(open) : Boolean(nextOpen);
    if (onOpenChange) {
      onOpenChange(value);
      return;
    }
    setInternalOpen(value);
  };

  return (
    <Card padding="0">
      <Box paddingBlock="400" paddingInline="500">
        <InlineStack gap="200" blockAlign="center">
          <Icon source={icon} />
          <div style={{ flex: 1 }}>
            <Text variant="headingMd" as="h2" fontWeight="semibold">
              {title}
            </Text>
          </div>
          <Button
            icon={open ? MinimizeIcon : MaximizeIcon}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "Collapse" : "Expand"}
          </Button>
        </InlineStack>
      </Box>
      {open && <Divider />}
      <Collapsible open={open} id={`cart-goal-${title}`}>
        <Box padding="500">{children}</Box>
        <Box paddingBlockEnd="400" paddingInline="500">
          <InlineStack align="end">
            <Button
              variant="plain"
              icon={MinimizeIcon}
              onClick={() => setOpen(false)}
            >
              Collapse
            </Button>
          </InlineStack>
        </Box>
      </Collapsible>
    </Card>
  );
}

function SegmentControl({ options, value, onChange, appearance = "default" }) {
  if (appearance === "soft") {
    return (
      <div className="cg-softSegment" role="tablist">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={selected}
              className={
                selected
                  ? "cg-softSegmentButton cg-softSegmentButtonActive"
                  : "cg-softSegmentButton"
              }
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="cg-segmentGroup">
      <ButtonGroup variant="segmented">
        {options.map((option) => (
          <Button
            key={option.value}
            pressed={value === option.value}
            className={value === option.value ? "cg-activeButton" : undefined}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </ButtonGroup>
    </div>
  );
}

function ProductPickerModal({
  open,
  onClose,
  items,
  loading,
  selected = [],
  onApply,
}) {
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState([]);

  useEffect(() => {
    if (open) {
      setDraft(Array.isArray(selected) ? selected : selected ? [selected] : []);
      setSearch("");
    }
  }, [open, selected]);

  const filtered = search
    ? items.filter((item) =>
      String(item.title || "").toLowerCase().includes(search.toLowerCase())
    )
    : items;
  const toggleDraftProduct = (productId) =>
    setDraft((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId]
    );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Select free product"
      primaryAction={{
        content: "Select products",
        onAction: () => {
          onApply(draft);
          onClose();
        },
        disabled: draft.length === 0,
      }}
      secondaryActions={[{ content: "Cancel", onAction: onClose }]}
    >
      <Modal.Section>
        <TextField
          label="Search products"
          labelHidden
          placeholder="Search products"
          value={search}
          onChange={setSearch}
          prefix={<Icon source={SearchIcon} />}
          autoComplete="off"
          clearButton
          onClearButtonClick={() => setSearch("")}
        />
      </Modal.Section>
      <Modal.Section>
        <div className="cg-productPickerList">
          {loading ? (
            <Box padding="500">
              <Text as="p" tone="subdued" alignment="center">
                Loading products...
              </Text>
            </Box>
          ) : filtered.length === 0 ? (
            <Box padding="500">
              <Text as="p" tone="subdued" alignment="center">
                No products available.
              </Text>
            </Box>
          ) : (
            filtered.map((item) => {
              const checked = draft.includes(item.id);
              return (
                <div
                  role="button"
                  tabIndex={0}
                  className={`cg-productPickerItem ${checked ? "cg-productPickerItemSelected" : ""
                    }`}
                  key={item.id}
                  onClick={() => toggleDraftProduct(item.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      toggleDraftProduct(item.id);
                    }
                  }}
                >
                  <span role="presentation" onClick={(event) => event.stopPropagation()}>
                    <Checkbox
                      label=""
                      labelHidden
                      checked={checked}
                      onChange={() => toggleDraftProduct(item.id)}
                    />
                  </span>
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.title}
                      className="cg-productPickerImage"
                    />
                  ) : (
                    <span className="cg-productPickerImage cg-productPickerImageEmpty">
                      P
                    </span>
                  )}
                  <span className="cg-productPickerText">
                    <Text variant="bodySm" fontWeight="semibold" as="span">
                      {item.title}
                    </Text>
                    {item.subtitle && (
                      <Text variant="bodySm" tone="subdued" as="span">
                        {item.subtitle}
                      </Text>
                    )}
                  </span>
                  {checked && <span className="cg-productPickerSelectedText">Selected</span>}
                </div>
              );
            })
          )}
        </div>
      </Modal.Section>
    </Modal>
  );
}

function GoalCard({
  goal,
  index,
  isLast,
  trackBy,
  validationError,
  rewardValidationError,
  productPickerItems,
  productPickerLoading,
  onOpenProductPicker,
  onGoalChange,
  onToggle,
  onMove,
  onDelete,
  onRewardTypeChange,
  currencySymbol = DEFAULT_STORE_CURRENCY_SYMBOL,
}) {
  const [rewardMenuOpen, setRewardMenuOpen] = useState(false);
  const icon = REWARD_CONFIG[goal.type].icon;
  const goalPrefix = trackBy === "quantity" ? "Qty" : currencySymbol;
  const ordinal = `${index + 1}${index === 0 ? "st" : index === 1 ? "nd" : "rd"}`;
  const selectedGiftProductIds = Array.isArray(goal.bonusProductIds)
    ? goal.bonusProductIds
    : [goal.bonusProductId].filter(Boolean);
  const selectedGiftProducts = selectedGiftProductIds.map((productId) =>
    productPickerItems.find((product) => product.id === productId) || {
      id: productId,
      title: productId.split("/").pop(),
    }
  );
  const maxGiftChoices = Math.max(1, selectedGiftProductIds.length || 1);
  const giftChoiceQuantity = Math.min(
    maxGiftChoices,
    Math.max(1, Number(goal.qty || 1) || 1)
  );
  const rewardChangeItems = Object.values(REWARD_CONFIG)
    .filter((reward) => reward.type !== goal.type)
    .map((reward) => ({
      content: REWARD_CHANGE_LABELS[reward.type],
      icon: reward.icon,
      onAction: () => {
        setRewardMenuOpen(false);
        onRewardTypeChange(index, reward.type);
      },
    }));

  return (
    <div className="cg-milestoneRow">
      <div className="cg-goalAmount">
        <div className={validationError ? "cg-goalLabel cg-goalLabelError" : "cg-goalLabel"}>
          {ordinal} goal{validationError ? " *" : ""}
        </div>
        <div className={validationError ? "cg-goalInput cg-goalInputError" : "cg-goalInput"}>
          <TextField
            label="Goal amount"
            labelHidden
            type="number"
            min={0}
            prefix={goalPrefix}
            value={goal.goal}
            onChange={(value) => onGoalChange(index, { goal: value })}
            autoComplete="off"
            error={Boolean(validationError)}
          />
        </div>
        {validationError && <div className="cg-goalValidation">{validationError}</div>}
        {!isLast && (
          <span
            className="cg-goalArrow"
            aria-hidden="true"
          />
        )}
      </div>

      <div className="cg-roundedSurface">
        <Card padding="0">
          <div
            className="cg-rewardHeader"
            role="button"
            tabIndex={0}
            onClick={() => onToggle(index)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onToggle(index);
              }
            }}
          >
            <InlineStack gap="300" blockAlign="center">
              <span className="cg-rewardIcon">
                <Icon source={icon} />
              </span>
              <BlockStack gap="0">
                <Text variant="bodyMd" as="p" fontWeight="semibold">
                  {goal.title}
                </Text>
              </BlockStack>
            </InlineStack>
            <InlineStack gap="200" blockAlign="center">
              {goal.expanded ? (
                <button
                  type="button"
                  className="cg-doneButton"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggle(index);
                  }}
                >
                  <span className="cg-doneIcon">
                    <Icon source={CheckIcon} />
                  </span>
                  Done
                </button>
              ) : (
                <Button
                  icon={EditIcon}
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggle(index);
                  }}
                >
                  Edit
                </Button>
              )}
              <Button
                icon={DeleteIcon}
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(index);
                }}
              />
              <Popover
                active={rewardMenuOpen}
                activator={
                  <Button
                    variant="plain"
                    icon={MenuHorizontalIcon}
                    accessibilityLabel={`Change reward for goal ${index + 1}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setRewardMenuOpen((open) => !open);
                    }}
                  />
                }
                autofocusTarget="first-node"
                onClose={() => setRewardMenuOpen(false)}
              >
                <div role="presentation" onClick={(event) => event.stopPropagation()}>
                  <ActionList items={rewardChangeItems} />
                </div>
              </Popover>
              <span className="cg-reorderControls" aria-label="Change rule position">
                <button
                  type="button"
                  className="cg-reorderButton"
                  onClick={(event) => {
                    event.stopPropagation();
                    onMove(index, -1);
                  }}
                  disabled={index === 0}
                  aria-label={`Move goal ${index + 1} up`}
                >
                  <Icon source={ChevronUpIcon} />
                </button>
                <button
                  type="button"
                  className="cg-reorderButton"
                  onClick={(event) => {
                    event.stopPropagation();
                    onMove(index, 1);
                  }}
                  disabled={isLast}
                  aria-label={`Move goal ${index + 1} down`}
                >
                  <Icon source={ChevronDownIcon} />
                </button>
              </span>
            </InlineStack>
          </div>

          {goal.expanded && (
            <>
              <Divider />
              <Box padding="500">
                {goal.type === "gift" && (
                  <BlockStack gap="300">
                    {rewardValidationError && (
                      <Banner tone="critical">{rewardValidationError}</Banner>
                    )}
                    <Text variant="bodyMd" as="p" fontWeight="semibold">
                      Select products to give as free gifts
                    </Text>
                    <Button
                      variant="primary"
                      icon={PlusIcon}
                      onClick={() => onOpenProductPicker(index)}
                      loading={productPickerLoading}
                    >
                      {selectedGiftProductIds.length ? "Change products" : "Add products"}
                    </Button>
                    {selectedGiftProductIds.length > 0 && (
                      <div className="cg-selectedProduct">
                        <div className="cg-selectedProductList">
                          {selectedGiftProducts.map((product) => (
                            <div className="cg-selectedProductItem" key={product.id}>
                              {product.image ? (
                                <img
                                  src={product.image}
                                  alt={product.title}
                                  className="cg-selectedProductImage"
                                />
                              ) : (
                                <span className="cg-selectedProductImage cg-selectedProductImageEmpty">
                                  P
                                </span>
                              )}
                              <div className="cg-selectedProductText">
                                <Text variant="bodySm" as="p" fontWeight="semibold">
                                  {product.title}
                                </Text>
                                {product.subtitle && (
                                  <Text variant="bodySm" as="p" tone="subdued">
                                    {product.subtitle}
                                  </Text>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        <Button
                          size="slim"
                          variant="plain"
                          tone="critical"
                          onClick={(event) => {
                            event.stopPropagation();
                            onGoalChange(index, {
                              bonusProductIds: [],
                              bonusProducts: [],
                              bonusProductId: "",
                              bonusProductTitle: "",
                              bonusProductVariantId: "",
                              qty: "1",
                            });
                          }}
                        >
                          Clear
                        </Button>
                      </div>
                    )}
                    {goal.shopifySyncWarning && (
                      <Banner tone="warning">{goal.shopifySyncWarning}</Banner>
                    )}
                    <Text variant="bodyMd" as="p" fontWeight="semibold">
                      How many gifts can they choose from this list?
                    </Text>
                    <div className="cg-stepper">
                      <Button
                        disabled={giftChoiceQuantity <= 1}
                        onClick={() =>
                          onGoalChange(index, {
                            qty: String(Math.max(1, giftChoiceQuantity - 1)),
                          })
                        }
                      >
                        -
                      </Button>
                      <Text as="span" variant="bodyMd" fontWeight="semibold">
                        {giftChoiceQuantity}
                      </Text>
                      <Button
                        disabled={giftChoiceQuantity >= maxGiftChoices}
                        onClick={() =>
                          onGoalChange(index, {
                            qty: String(Math.min(maxGiftChoices, giftChoiceQuantity + 1)),
                          })
                        }
                      >
                        +
                      </Button>
                    </div>
                  </BlockStack>
                )}

                {goal.type === "discount" && (
                  <BlockStack gap="300">
                    <BlockStack gap="200">
                      <Text variant="bodyMd" as="p" fontWeight="semibold">
                        Type of order discount
                      </Text>
                      <SegmentControl
                        value={goal.discountType || "percentage"}
                        onChange={(discountType) =>
                          onGoalChange(index, {
                            discountType,
                            value:
                              goal.value ||
                              (discountType === "amount" ? "100" : "20"),
                          })
                        }
                        options={[
                          { label: "Percentage", value: "percentage" },
                          { label: "Amount", value: "amount" },
                        ]}
                      />
                    </BlockStack>
                    <TextField
                      label={
                        goal.discountType === "amount"
                          ? "Discount amount"
                          : "Discount percentage"
                      }
                      type="number"
                      min={0}
                      value={goal.value}
                      onChange={(value) => onGoalChange(index, { value })}
                      suffix={goal.discountType === "percentage" ? "%" : undefined}
                      prefix={goal.discountType === "amount" ? currencySymbol : undefined}
                      autoComplete="off"
                      error={rewardValidationError || undefined}
                      helpText={
                        goal.discountType === "amount"
                          ? "Fixed amount off the order."
                          : "Percentage off the order."
                      }
                    />
                  </BlockStack>
                )}

                {goal.type === "shipping" && (
                  <BlockStack gap="200">
                    <Text variant="bodyMd" as="p">
                      First you will need to setup a matching shipping rule in
                      Shopify admin. This will not be created automatically by
                      CornerCart.
                    </Text>
                    <Button variant="plain">Click here to learn how</Button>
                  </BlockStack>
                )}
              </Box>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function PreviewPanel({
  enabled,
  onEnabledChange,
  campaignName,
  onCampaignNameChange,
  goals,
  shownGoals,
  trackBy,
  sliderValue,
  onSliderChange,
  currencySymbol = DEFAULT_STORE_CURRENCY_SYMBOL,
}) {
  const activeGoals = Array.isArray(goals) ? goals : [];
  const visibleGoals = activeGoals.slice(0, shownGoals || 3);
  const maxGoal = Math.max(...visibleGoals.map((goal) => Number(goal.goal || 0)), 1);
  const totalSteps = visibleGoals.length;
  const cartValue = (maxGoal * sliderValue) / 100;
  const nextIncompleteGoal = visibleGoals.find(
    (goal) => cartValue < Number(goal.goal || 0)
  );
  const messageGoal = nextIncompleteGoal || visibleGoals[visibleGoals.length - 1];
  const isMessageGoalCompleted = Boolean(messageGoal) && !nextIncompleteGoal;
  const remaining = Math.max(0, Number(messageGoal?.goal || 0) - cartValue).toFixed(0);
  const goalToken = trackBy === "quantity" ? remaining : formatCurrencyAmount(remaining, currencySymbol);
  const messageTemplate = isMessageGoalCompleted
    ? getGoalContentText(messageGoal, "aboveAfter")
    : getGoalContentText(messageGoal, "aboveBefore");
  const message = messageGoal && messageTemplate
    ? messageTemplate
      .replaceAll("{{goal}}", goalToken)
      .replaceAll("{{discount}}", formatDiscountValue(messageGoal, currencySymbol))
    : "Select a reward type";

  return (
    <BlockStack gap="300">
      {!enabled && (
        <div className="cg-paused">
          <Icon source={PauseCircleIcon} />
          <Text variant="bodyMd" as="p" fontWeight="semibold">
            This campaign is paused
          </Text>
        </div>
      )}

      <Card>
        <BlockStack gap="300">
          <Select
            label="Status"
            value={enabled ? "active" : "draft"}
            onChange={(value) => onEnabledChange(value === "active")}
            options={[
              { label: "Active", value: "active" },
              { label: "Draft", value: "draft" },
            ]}
          />
          <TextField
            label="Campaign name"
            value={campaignName}
            onChange={onCampaignNameChange}
            autoComplete="off"
          />
        </BlockStack>
      </Card>

      <div className="cg-roundedSurface">
        <Card padding="0">
          <Box padding="400">
            <Text variant="headingSm" as="h3" fontWeight="semibold">
              Preview
            </Text>
          </Box>
          <Divider />
          <div className="cg-previewCanvas">
            <Text variant="bodySm" as="p" fontWeight="semibold" alignment="center">
              {messageGoal ? message : "Select a reward type"}
            </Text>
            {messageGoal && (
              <div className="cg-progressWrap">
                <div className="cg-previewTrack">
                  <div
                    className="cg-previewFill"
                    style={{ width: `${Math.min(100, sliderValue)}%` }}
                  />
                </div>
                {visibleGoals.map((goal, index) => {
                  const goalValue = Number(goal.goal || 0);
                  const stepPosition =
                    index === totalSteps - 1
                      ? 98
                      : ((index + 1) * 100) / totalSteps;
                  const left = `${Math.min(98, Math.max(0, stepPosition))}%`;
                  const isCompleted = cartValue >= goalValue;
                  return (
                    <div
                      className={`cg-previewMilestone ${isCompleted ? "cg-previewMilestoneCompleted" : ""
                        }`}
                      style={{ left }}
                      key={`${goal.id}-${index}`}
                    >
                      <span
                        className={`cg-previewMarker ${isCompleted ? "cg-previewMarkerCompleted" : ""
                          }`}
                      >
                        <Icon source={isCompleted ? CheckIcon : REWARD_CONFIG[goal.type].icon} />
                      </span>
                      <span>
                        {goal.type === "discount"
                          ? `${formatDiscountValue(goal, currencySymbol)} Off`
                          : goal.previewLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <Box padding="500">
            <RangeSlider
              label="Use this to adjust the progress bar"
              value={sliderValue}
              min={0}
              max={100}
              onChange={onSliderChange}
            />
          </Box>
        </Card>
      </div>
    </BlockStack>
  );
}

function ContentSection({
  goals,
  shownGoals,
  onShownGoalsChange,
  onEditGoal,
  open,
  onOpenChange,
}) {
  const [openGoal, setOpenGoal] = useState(-1);

  return (
    <SectionCard
      icon={EditIcon}
      title="Content"
      open={open}
      onOpenChange={onOpenChange}
    >
      <BlockStack gap="400">
        <BlockStack gap="200">
          <Text variant="bodyMd" as="p" fontWeight="semibold">
            Number of goals shown at a time in the progress bar
          </Text>
          <RangeSlider
            label="Number of goals shown at a time in the progress bar"
            labelHidden
            value={shownGoals}
            min={1}
            max={3}
            step={1}
            onChange={onShownGoalsChange}
          />
        </BlockStack>

        <Text variant="bodyMd" as="p" fontWeight="semibold">
          Edit content
        </Text>
        <Card padding="0">
          {goals.map((goal, index) => (
            <div className="cg-contentItem" key={`${goal.type}-${index}`}>
              <div className="cg-contentItemHeader">
                <Text variant="headingSm" as="h3" fontWeight="semibold">
                  Goal {index + 1}
                </Text>
                <Button
                  icon={openGoal === index ? MinimizeIcon : MaximizeIcon}
                  onClick={() => setOpenGoal(openGoal === index ? -1 : index)}
                >
                  {openGoal === index ? "Collapse" : "Expand"}
                </Button>
              </div>
              {openGoal === index && (
                <div className="cg-contentItemBody">
                  <Text variant="bodyMd" as="p" fontWeight="semibold">
                    Edit texts of goal {index + 1}
                  </Text>
                  <Button icon={EditIcon} onClick={() => onEditGoal(index)}>
                    Edit
                  </Button>
                </div>
              )}
            </div>
          ))}
        </Card>
      </BlockStack>
    </SectionCard>
  );
}

function TextEditModal({ goal, index, onClose, onChange }) {
  const [popoverField, setPopoverField] = useState(null);

  if (!goal) return null;

  const variables = [
    { label: "Goal value", content: "{{goal}}" },
    ...(goal.type === "discount" ? [{ label: "Discount value", content: "{{discount}}" }] : []),
  ];

  const handleInsert = (fieldKey, variable) => {
    const currentValue = goal.texts[fieldKey] || "";
    const newValue = currentValue + (currentValue && !currentValue.endsWith(" ") ? " " : "") + variable;
    onChange(index, fieldKey, newValue);
    setPopoverField(null);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Edit texts of Goal ${index + 1}`}
      primaryAction={{ content: "Done", onAction: onClose }}
    >
      <Modal.Section>
        <div className="cg-modalFields">
          {GOAL_TEXT_FIELDS.map((field) => (
            <div className="cg-tokenField" key={field.key}>
              <TextField
                label={field.label}
                value={goal.texts[field.key]}
                onChange={(value) => onChange(index, field.key, value)}
                autoComplete="off"
                connectedRight={
                  <Popover
                    active={popoverField === field.key}
                    activator={
                      <Button
                        onClick={() =>
                          setPopoverField(popoverField === field.key ? null : field.key)
                        }
                      >
                        {"{}"}
                      </Button>
                    }
                    onClose={() => setPopoverField(null)}
                  >
                    <ActionList
                      items={variables.map((v) => ({
                        content: `Insert ${v.label}`,
                        onAction: () => handleInsert(field.key, v.content),
                      }))}
                    />
                  </Popover>
                }
              />
            </div>
          ))}
        </div>
      </Modal.Section>
    </Modal>
  );
}

function TargetingPrioritySection({
  open,
  onOpenChange,
  settings,
  onSettingsChange,
  priority,
  onPriorityChange,
}) {
  const patchSettings = (patch) => onSettingsChange({ ...settings, ...patch });
  const customerTargetOptions = [
    { label: "All customers", value: "all" },
    { label: "Customers with tag", value: "tagged" },
    { label: "Customers without tag", value: "without_tag" },
    { label: "Logged in customers only", value: "logged_in" },
    { label: "Guest customers only", value: "guest" },
  ];
  const showCustomerTags =
    settings.customerTarget === "tagged" ||
    settings.customerTarget === "without_tag";

  return (
    <SectionCard
      icon={SettingsIcon}
      title="Targeting & priority"
      open={open}
      onOpenChange={onOpenChange}
    >
      <BlockStack gap="400">
        <Select
          label="Customer target"
          value={settings.customerTarget || "all"}
          onChange={(customerTarget) =>
            patchSettings({
              customerTarget,
              customerTags:
                customerTarget === "tagged" || customerTarget === "without_tag"
                  ? settings.customerTags || ""
                  : "",
            })
          }
          options={customerTargetOptions}
          helpText="Choose which customers this rule applies to."
        />

        {showCustomerTags && (
          <TextField
            label="Customer tags"
            value={settings.customerTags || ""}
            onChange={(customerTags) => patchSettings({ customerTags })}
            placeholder="vip, wholesale, member"
            autoComplete="off"
            helpText="Comma-separated list of customer tags to match."
          />
        )}

        <Divider />

        <TextField
          label="Priority"
          type="number"
          value={priority}
          onChange={onPriorityChange}
          autoComplete="off"
          helpText="Higher number = evaluated first when multiple rules are active."
        />
      </BlockStack>
    </SectionCard>
  );
}

function SettingsSection({ open, onOpenChange, settings, onSettingsChange }) {
  const [targetMenuOpen, setTargetMenuOpen] = useState(false);
  const targetingRules = Array.isArray(settings.targetingRules)
    ? settings.targetingRules
    : [];
  const patchSettings = (patch) => onSettingsChange({ ...settings, ...patch });
  const addTargetingRule = (field) => {
    patchSettings({
      customerTarget: field,
      targetingRules: [...targetingRules, { field, operator: "is", value: "" }],
    });
    setTargetMenuOpen(false);
  };
  const removeTargetingRule = (index) => {
    const nextRules = targetingRules.filter((_, ruleIndex) => ruleIndex !== index);
    patchSettings({
      customerTarget: nextRules[0]?.field || "all",
      targetingRules: nextRules,
    });
  };
  const targetItems = (items, extra = {}) =>
    items.map((content) => ({
      content,
      ...extra,
      onAction: () => addTargetingRule(content),
    }));

  return (
    <SectionCard
      icon={SettingsIcon}
      title="Settings"
      open={open}
      onOpenChange={onOpenChange}
    >
      <BlockStack gap="500">
        <BlockStack gap="200">
          <Text variant="bodyMd" as="p" fontWeight="semibold">
            Active dates
          </Text>
          <Text variant="bodyMd" as="p" tone="subdued">
            Based on your browser&apos;s timezone: Asia/Calcutta
          </Text>
          <Card>
            <BlockStack gap="300">
              <InlineStack gap="300" wrap={false}>
                <div style={{ flex: 1 }}>
                  <TextField
                    label="Start date"
                    type="date"
                    value={settings.startDate}
                    onChange={(startDate) => patchSettings({ startDate })}
                    prefix={<Icon source={CalendarIcon} />}
                    autoComplete="off"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <TextField
                    label="Start time"
                    value={settings.startTime}
                    onChange={(startTime) => patchSettings({ startTime })}
                    prefix={<Icon source={ClockIcon} />}
                    autoComplete="off"
                  />
                </div>
              </InlineStack>
              <Checkbox
                label="Set end date"
                checked={settings.hasEndDate}
                onChange={(hasEndDate) => patchSettings({ hasEndDate })}
              />
              {settings.hasEndDate ? (
                <InlineStack gap="300" wrap={false}>
                  <div style={{ flex: 1 }}>
                    <TextField
                      label="End date"
                      type="date"
                      value={settings.endDate}
                      onChange={(endDate) => patchSettings({ endDate })}
                      prefix={<Icon source={CalendarIcon} />}
                      autoComplete="off"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <TextField
                      label="End time"
                      value={settings.endTime}
                      onChange={(endTime) => patchSettings({ endTime })}
                      prefix={<Icon source={ClockIcon} />}
                      autoComplete="off"
                    />
                  </div>
                </InlineStack>
              ) : null}
            </BlockStack>
          </Card>
        </BlockStack>

        <BlockStack gap="200" >
          <Text variant="bodyMd" as="p" fontWeight="semibold">
            Showcase free gifts in cart below item list
          </Text>
          <SegmentControl
            value={settings.showcaseFreeGifts}
            onChange={(showcaseFreeGifts) => patchSettings({ showcaseFreeGifts })}
            options={[
              { label: "Show", value: "show" },
              { label: "Hide", value: "hide" },
            ]}
          />
        </BlockStack>

        <BlockStack gap="200">
          <Text variant="bodyMd" as="p" fontWeight="semibold">
            How other discounts affect cart progress bar
          </Text>
          <SegmentControl
            value={settings.discountProgressMode}
            onChange={(discountProgressMode) => patchSettings({ discountProgressMode })}
            options={[
              {
                label: "Use cart total after subtracting other discounts",
                value: "after",
              },
              {
                label: "Use cart total before other discounts",
                value: "before",
              },
            ]}
          />
        </BlockStack>

        <BlockStack gap="200">
          <Text variant="bodyMd" as="p" fontWeight="semibold">
            Is reward selection mandatory?
          </Text>
          <SegmentControl
            value={settings.rewardSelectionMandatory}
            onChange={(rewardSelectionMandatory) =>
              patchSettings({ rewardSelectionMandatory })
            }
            options={[
              { label: "Yes", value: "yes" },
              { label: "No", value: "no" },
            ]}
          />
        </BlockStack>

        <BlockStack gap="200" style={{ display: "none" }}>
          <Text variant="bodyMd" as="p" fontWeight="semibold" style={{ display: "none" }}>
            Target an audience
          </Text>
          <div className="cg-targetBox" style={{ display: "none" }}>
            <div className="cg-targetIcon">+</div>
            <BlockStack gap="100">
              <Text variant="bodyMd" as="p" fontWeight="semibold">
                {targetingRules.length
                  ? `Targeting ${targetingRules.length} rule${targetingRules.length === 1 ? "" : "s"}`
                  : "Targeting everyone"}
              </Text>
              <Text variant="bodyMd" as="p" tone="subdued">
                {targetingRules.length
                  ? "This campaign is visible only to customers that match the selected targeting rules."
                  : "This campaign is currently visible to all customers. To show it only to a specific group, add a targeting rule."}
              </Text>
              {targetingRules.length ? (
                <div className="cg-targetRules">
                  {targetingRules.map((rule, index) => (
                    <div className="cg-targetRule" key={`${rule.field}-${index}`}>
                      <span>{rule.field}</span>
                      <Button
                        variant="plain"
                        tone="critical"
                        onClick={() => removeTargetingRule(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              ) : null}
            </BlockStack>
            <Popover
              active={targetMenuOpen}
              activator={
                <Button icon={PlusIcon} onClick={() => setTargetMenuOpen(true)}>
                  Add a targeting rule
                </Button>
              }
              autofocusTarget="first-node"
              onClose={() => setTargetMenuOpen(false)}
            >
              <Box padding="300" minWidth="300px">
                <BlockStack gap="300">
                  <TextField
                    label="Search actions"
                    labelHidden
                    placeholder="Search actions"
                    prefix={<Icon source={SearchIcon} />}
                    autoComplete="off"
                  />
                  <ActionList
                    sections={[
                      {
                        title: "User Session",
                        items: targetItems(["Country", "User Session count", "Logged-in status", "Device OS", "Market", "Locale/Language"]),
                      },
                      {
                        title: "Logged in visitor data",
                        items: targetItems(["Customer tags", "Order count", "Total spent", "First name", "Last name", "Customer ID"], {
                          helpText: "Works only if logged in",
                        }),
                      },
                      {
                        title: "UTM Tags",
                        items: targetItems(["UTM Campaign", "UTM Source", "UTM Medium"]),
                      },
                    ]}
                  />
                </BlockStack>
              </Box>
            </Popover>
          </div>
        </BlockStack>
      </BlockStack>
    </SectionCard>
  );
}

export default function RuleCartGoal() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const host = searchParams.get("host");
  const id = searchParams.get("id");
  const {
    rule,
    nextCampaignName,
    currencyCode = DEFAULT_STORE_CURRENCY_CODE,
    currencySymbol = DEFAULT_STORE_CURRENCY_SYMBOL,
  } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const submit = useSubmit();
  const productFetcher = useFetcher();
  const withHost = (path) => (host ? `${path}?host=${encodeURIComponent(host)}` : path);
  const handledSuccessKeyRef = useRef(null);

  const navigateSafely = (to, options) => {
    try {
      const result = navigate(to, options);
      if (result && typeof result.catch === "function") {
        result.catch((err) => {
          if (/Transition was aborted|invalid state/i.test(String(err?.message || err))) {
            return;
          }
          console.error("Cart Goal navigation failed", err);
        });
      }
    } catch (err) {
      if (/Transition was aborted|invalid state/i.test(String(err?.message || err))) {
        return;
      }
      console.error("Cart Goal navigation failed", err);
    }
  };

  const [enabled, setEnabled] = useState(rule?.enabled ?? true);
  const [campaignName, setCampaignName] = useState(rule?.campaignName ?? nextCampaignName ?? "Cart Goal 1");
  const [priority, setPriority] = useState(String(rule?.priority ?? 0));
  const [trackBy, setTrackBy] = useState(rule?.trackBy ?? "value");
  const [goals, setGoals] = useState(rule?.goals?.length ? rule.goals : defaultGoals());
  const settingsDefaults = useMemo(() => defaultSettings(), []);
  const [settings, setSettings] = useState(() => ({
    ...settingsDefaults,
    ...(rule
      ? {
        startDate: rule.startDate || settingsDefaults.startDate,
        startTime: rule.startTime || settingsDefaults.startTime,
        hasEndDate: Boolean(rule.hasEndDate),
        endDate: rule.endDate || "",
        endTime: rule.endTime || "",
        showcaseFreeGifts: rule.showcaseFreeGifts || "hide",
        discountProgressMode: rule.discountProgressMode || "after",
        rewardSelectionMandatory: rule.rewardSelectionMandatory || "yes",
        customerTarget: rule.customerTarget || "all",
        customerTags: rule.customerTags || "",
        targetingRules: Array.isArray(rule.targetingRules) ? rule.targetingRules : [],
      }
      : {}),
  }));
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [sliderValue, setSliderValue] = useState(0);
  const [shownGoals, setShownGoals] = useState(rule?.shownGoals ?? 3);
  const [editingTextIndex, setEditingTextIndex] = useState(null);
  const [openSection, setOpenSection] = useState("goals");
  const [showGoalValidation, setShowGoalValidation] = useState(false);
  const [productPickerGoalIndex, setProductPickerGoalIndex] = useState(null);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [leaveAfterDraftSave, setLeaveAfterDraftSave] = useState(false);

  const isSaving = navigation.state === "submitting" && !savingDraft;
  const isSavingDraft = navigation.state === "submitting" && savingDraft;
  const productPickerItems = (productFetcher.data?.products || []).map((product) => ({
    id: product.id,
    title: product.title,
    subtitle: product.price ? `${product.price}` : undefined,
    image: product.image,
    variantId: product.variantId,
    variantPrice: product.variantPrice ?? product.price ?? null,
    options: Array.isArray(product.options) ? product.options : [],
    variants: Array.isArray(product.variants) ? product.variants : [],
    price: product.price ?? product.variantPrice ?? null,
  }));
  const productPickerLoading = productFetcher.state === "loading";

  useEffect(() => {
    if (productFetcher.state === "idle" && !productFetcher.data) {
      productFetcher.load("/api/products");
    }
  }, [productFetcher]);

  useEffect(() => {
    if (actionData?.success && navigation.state === "idle") {
      const successKey = `${actionData.id || ""}:${leaveAfterDraftSave ? "leave" : "stay"}`;
      if (handledSuccessKeyRef.current === successKey) return;
      handledSuccessKeyRef.current = successKey;

      if (leaveAfterDraftSave) {
        const campaignsPath = host
          ? `/app/campaigns?host=${encodeURIComponent(host)}`
          : "/app/campaigns";
        navigateSafely(campaignsPath);
        return;
      }

      if (!id && actionData.id) {
        const idParam = `id=${encodeURIComponent(actionData.id)}`;
        const hostParam = host ? `&host=${encodeURIComponent(host)}` : "";
        navigateSafely(`/app/rule-cart-goal?${idParam}${hostParam}`, { replace: true });
      }
    }
  }, [actionData, host, id, leaveAfterDraftSave, navigation.state]);

  useEffect(() => {
    if (navigation.state === "idle") {
      setSavingDraft(false);
      setLeaveAfterDraftSave(false);
    }
  }, [navigation.state]);

  const sortedGoals = useMemo(
    () => [...goals].sort((a, b) => Number(a.goal || 0) - Number(b.goal || 0)),
    [goals]
  );
  const goalValidationErrors = useMemo(
    () => getGoalValidationErrors(goals, trackBy),
    [goals, trackBy]
  );
  const rewardValidationErrors = useMemo(
    () => getRewardValidationErrors(goals),
    [goals]
  );
  const hasGoalValidationErrors = goalValidationErrors.some(Boolean);
  const hasRewardValidationErrors = rewardValidationErrors.some(Boolean);
  const currentSnapshot = useMemo(() => JSON.stringify({
    campaignName,
    priority,
    enabled,
    trackBy,
    goals,
    shownGoals,
    settings,
  }), [campaignName, priority, enabled, trackBy, goals, shownGoals, settings]);
  const initialSnapshot = useMemo(() => JSON.stringify({
    campaignName: rule?.campaignName ?? nextCampaignName ?? "Cart Goal 1",
    priority: String(rule?.priority ?? 0),
    enabled: rule?.enabled ?? true,
    trackBy: rule?.trackBy ?? "value",
    goals: rule?.goals?.length ? rule.goals : defaultGoals(),
    shownGoals: rule?.shownGoals ?? 3,
    settings: {
      ...settingsDefaults,
      ...(rule
        ? {
          startDate: rule.startDate || settingsDefaults.startDate,
          startTime: rule.startTime || settingsDefaults.startTime,
          hasEndDate: Boolean(rule.hasEndDate),
          endDate: rule.endDate || "",
          endTime: rule.endTime || "",
          showcaseFreeGifts: rule.showcaseFreeGifts || "hide",
          discountProgressMode: rule.discountProgressMode || "after",
          rewardSelectionMandatory: rule.rewardSelectionMandatory || "yes",
          customerTarget: rule.customerTarget || "all",
          customerTags: rule.customerTags || "",
          targetingRules: Array.isArray(rule.targetingRules) ? rule.targetingRules : [],
        }
        : {}),
    },
  }), [nextCampaignName, rule, settingsDefaults]);
  const hasUnsavedChanges = currentSnapshot !== initialSnapshot;

  const addGoal = (type) => {
    setGoals((current) => {
      const highestGoal = Math.max(
        0,
        ...current.map((goal) => Number(goal.goal || 0)).filter(Number.isFinite)
      );
      const stepSize = trackBy === "quantity" ? 1 : 50;
      return [
        ...current.map((goal) => ({ ...goal, expanded: false })),
        {
          ...makeGoal(type, current.length, true),
          goal: String(highestGoal + stepSize),
        },
      ];
    });
    setAddMenuOpen(false);
  };

  const patchGoal = (index, patch) => {
    setGoals((current) =>
      current.map((goal, goalIndex) =>
        goalIndex === index ? { ...goal, ...patch } : goal
      )
    );
    setShowGoalValidation(true);
  };

  const changeGoalRewardType = (index, nextType) => {
    setGoals((current) =>
      current.map((goal, goalIndex) =>
        goalIndex === index ? convertGoalRewardType(goal, nextType, goalIndex) : goal
      )
    );
    setShowGoalValidation(true);
  };

  const toggleGoal = (index) => {
    setGoals((current) => {
      const isOpening = !current[index]?.expanded;
      return current.map((goal, goalIndex) => ({
        ...goal,
        expanded: isOpening && goalIndex === index,
      }));
    });
  };

  const moveGoal = (index, direction) => {
    setGoals((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;

      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
    setShowGoalValidation(true);
  };

  const patchGoalText = (index, field, value) => {
    setGoals((current) =>
      current.map((goal, goalIndex) =>
        goalIndex === index
          ? { ...goal, texts: { ...goal.texts, [field]: value } }
          : goal
      )
    );
  };

  const applyGiftProduct = (productIds) => {
    if (productPickerGoalIndex === null) return;
    const selectedIds = Array.isArray(productIds) ? productIds : productIds ? [productIds] : [];
    const firstProduct = productPickerItems.find((item) => item.id === selectedIds[0]);
    const currentGiftGoal = goals[productPickerGoalIndex] || {};
    const maxChoices = Math.max(1, selectedIds.length || 1);
    const nextQty = String(
      Math.min(maxChoices, Math.max(1, Number(currentGiftGoal.qty || 1) || 1))
    );
    const selectedProducts = selectedIds
      .map((selectedId) => productPickerItems.find((item) => item.id === selectedId))
      .filter(Boolean)
      .map((product) => ({
        id: product.id,
        title: product.title,
        image: product.image,
        variantId: product.variantId,
        variantPrice: product.variantPrice ?? product.price ?? null,
        price: product.price ?? product.variantPrice ?? null,
        options: Array.isArray(product.options) ? product.options : [],
        variants: Array.isArray(product.variants) ? product.variants : [],
      }));
    patchGoal(productPickerGoalIndex, {
      bonusProductIds: selectedIds,
      bonusProducts: selectedProducts,
      bonusProductId: selectedIds[0] || "",
      bonusProductTitle: firstProduct?.title || "",
      bonusProductVariantId: firstProduct?.variantId || "",
      qty: nextQty,
      shopifySyncWarning: null,
    });
  };

  const handleSave = () => {
    if (navigation.state !== "idle") return;

    if (hasGoalValidationErrors || hasRewardValidationErrors) {
      setShowGoalValidation(true);
      setOpenSection("goals");
      return;
    }

    submit(
      {
        id,
        campaignName,
        priority,
        enabled,
        trackBy,
        goals: sortedGoals,
        shownGoals,
        ...settings,
      },
      { method: "post", encType: "application/json" }
    );
  };

  const handleBack = () => {
    if (!rule) {
      setLeaveModalOpen(true);
      return;
    }
    navigateSafely(withHost("/app/campaigns"));
  };

  const handleDiscardAndLeave = () => {
    setLeaveModalOpen(false);
    navigateSafely(withHost("/app/campaigns"));
  };

  const handleSaveDraftAndLeave = () => {
    if (navigation.state !== "idle") return;

    setSavingDraft(true);
    setLeaveAfterDraftSave(true);
    submit(
      {
        _action: "saveDraft",
        id,
        campaignName,
        priority,
        enabled: false,
        trackBy,
        goals: sortedGoals,
        shownGoals,
        ...settings,
      },
      { method: "post", encType: "application/json" }
    );
  };

  return (
    <Page
      backAction={{
        content: "Campaigns",
        onAction: handleBack,
      }}
      title={campaignName || "Cart Goal"}
      primaryAction={{ content: "Save", loading: isSaving, onAction: handleSave }}
      secondaryActions={[
        {
          content: enabled ? "Pause" : "Activate",
          accessibilityLabel: enabled ? "Pause campaign" : "Activate campaign",
          tone: enabled ? "caution" : "success",
          onAction: () => setEnabled((value) => !value),
        },
      ]}
    >
      <style>{`
        .cg-layout {
          display: grid;
          grid-template-columns: minmax(0, 6fr) minmax(340px, 3fr);
          gap: 20px;
          align-items: start;
        }
        .Polaris-Button,
        .Polaris-Button::before,
        .Polaris-Button::after {
          border-radius: 12px !important;
        }
     /* Activate Button - Success Green */
          .Polaris-ActionMenu-SecondaryAction button[aria-label="Activate campaign"] {
            background: #16a34a !important;
            border-color: #16a34a !important;
            color: #ffffff !important;
          }

          .Polaris-ActionMenu-SecondaryAction button[aria-label="Activate campaign"] span {
            color: #ffffff !important;
          }

          .Polaris-ActionMenu-SecondaryAction button[aria-label="Activate campaign"]:hover {
            background: #15803d !important;
            border-color: #15803d !important;
          }

          /* Pause Button - Warning Orange */
          .Polaris-ActionMenu-SecondaryAction button[aria-label="Pause campaign"] {
            background: #f59e0b !important;
            border-color: #f59e0b !important;
            color: #ffffff !important;
          }

          .Polaris-ActionMenu-SecondaryAction button[aria-label="Pause campaign"] span {
            color: #ffffff !important;
          }

          .Polaris-ActionMenu-SecondaryAction button[aria-label="Pause campaign"]:hover {
            background: #d97706 !important;
            border-color: #d97706 !important;
          }
        .Polaris-Button[aria-pressed="true"] *,
        .Polaris-Button.cg-activeButton * {
          color: #fff !important;
          fill: #fff !important;
        }
        .cg-softSegment {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          width: max-content;
          max-width: 100%;
          border-radius: 8px;
          background: #f0f0f0;
          padding: 4px;
        }
        .cg-softSegmentButton {
         min-height: 30px;
          border: 0;
          border-radius: 7px;
          background: transparent;
          color: #6f6f6f;
          cursor: pointer;
          font: inherit;
          font-size: 12px;
          font-weight: 650;
          line-height: 18px;
          padding: 5px 9px !important;
          white-space: nowrap;
          transition: background 120ms ease, box-shadow 120ms ease, color 120ms ease;
        }
          .Polaris-ButtonGroup--variantSegmented [aria-pressed=true] {
            z-index: var(--pc-button-group-item);
            background: #000 !important;
        }

        .cg-softSegmentButtonActive {
          background: #000000;
          color: #fff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.14);
        }
        .cg-softSegmentButtonActive * {
          color: #fff !important;
          fill: #fff !important;
        }
        .cg-segmentGroup .Polaris-ButtonGroup {
          gap: 8px !important;
        }
        .cg-segmentGroup .Polaris-ButtonGroup > * {
          margin-inline-start: 0 !important;
        }
        .cg-softSegmentButton:focus-visible {
          outline: 2px solid #005bd3;
          outline-offset: 2px;
        }
        .cg-layout,
        .cg-layout .Polaris-Layout__Section,
        .cg-layout .Polaris-Card,
        .cg-layout .Polaris-LegacyCard,
        .cg-layout .Polaris-Card__Section,
        .cg-layout .Polaris-LegacyCard__Section,
        .cg-layout .Polaris-Box,
        .cg-layout .Polaris-ShadowBevel,
        .cg-layout .Polaris-ShadowBevel::before,
        .cg-layout [class^="Polaris-ShadowBevel"],
        .cg-layout [class^="Polaris-ShadowBevel"]::before,
        .cg-layout [class*=" Polaris-ShadowBevel"],
        .cg-layout [class*=" Polaris-ShadowBevel"]::before,
        .cg-layout .Polaris-Banner,
        .cg-layout .Polaris-TextField,
        .cg-layout .Polaris-TextField__Input,
        .cg-layout .Polaris-TextField__Backdrop,
        .cg-layout .Polaris-Select__Input,
        .cg-layout .Polaris-Select__Backdrop,
        .cg-layout .Polaris-ChoiceList,
        .cg-layout .Polaris-OptionList,
        .cg-layout .Polaris-Popover,
        .cg-layout .Polaris-Popover__Pane,
        .cg-layout .Polaris-ActionList {
          border-radius: 12px !important;
          --pc-shadow-bevel-border-radius: 12px !important;
          --pc-shadow-bevel-border-radius-xs: 12px !important;
          --pc-shadow-bevel-border-radius-sm: 12px !important;
          --pc-shadow-bevel-border-radius-md: 12px !important;
          --pc-shadow-bevel-border-radius-lg: 12px !important;
          --pc-shadow-bevel-border-radius-xl: 12px !important;
          --pc-box-border-radius: 12px !important;
        }
        .cg-info {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          background: #e5f2ff;
          color: #00527c;
          border-radius: 12px;
          padding: 14px 16px;
        }
        .cg-roundedSurface {
          background: #fff;
          border-radius: 12px;
          overflow: hidden;
        }
        .cg-roundedSurface > .Polaris-ShadowBevel {
          border-radius: 12px;
        }
        .cg-milestoneList {
          display: grid;
          gap: 0px;
        }
        .cg-milestoneRow {
          display: grid;
          grid-template-columns: 124px minmax(0, 1fr);
          gap: 10px;
          align-items: stretch;
        }
        .cg-goalAmount {
          display: flex;
          flex-direction: column;
          min-width: 0;
          padding-left: 10px;
          position: relative;
        }
        .cg-goalLabel {
          color: #303030;
          font-size: 14px;
          font-weight: 650;
          line-height: 18px;
        }
        .cg-goalLabelError {
          color: #bf0711;
        }
        .cg-goalInput {
          width: 110px;
          max-width: 100%;
          margin-top: 8px;
        }
        .cg-goalInputError .Polaris-TextField {
          background: #fff4f4;
          border-color: #d72c0d;
          box-shadow: inset 0 0 0 1px #d72c0d;
        }
        .cg-goalValidation {
          width: 110px;
          margin-top: 6px;
          color: #bf0711;
          font-size: 12px;
          line-height: 15px;
          font-weight: 550;
        }
        .cg-goalArrow {
          display: block;
          flex: 1;
          position: relative;
          width: 110px;
          min-height: 25px;
          color: #b5b5b5;
          margin-top: 8px;
          margin-bottom: 10px;
        }
        .cg-goalArrow::before {
          content: "";
          position: absolute;
          top: 0;
          bottom: 8px;
          left: 50%;
          width: 1px;
          background: #d1d5db;
          transform: translateX(-50%);
        }
        .cg-goalArrow::after {
          content: "";
          position: absolute;
          left: 50%;
          bottom: 2px;
          width: 8px;
          height: 8px;
          border-right: 1px solid #b5b5b5;
          border-bottom: 1px solid #b5b5b5;
          transform: translateX(-50%) rotate(45deg);
        }
        .cg-rewardHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          min-height: 65px;
          padding: 10px 10px;
          cursor: pointer;
          user-select: none;
        }
        .cg-rewardHeader:focus-visible {
          outline: 2px solid #005bd3;
          outline-offset: -2px;
        }
        .cg-rewardIcon {
          width: 24px;
          color: #444;
        }
        .cg-stepper {
          display: inline-grid;
          grid-template-columns: 44px 64px 44px;
          align-items: center;
          gap: 8px;
          background: #f1f1f1;
          border-radius: 12px;
          padding: 6px;
          width: max-content;
          text-align: center;
        }
        .cg-selectedProduct {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          border: 1px solid #bfdbfe;
          border-radius: 12px;
          background: #f0f7ff;
          padding: 10px 12px;
        }
        .cg-selectedProductList {
          display: grid;
          flex: 1;
          gap: 8px;
          min-width: 0;
        }
        .cg-selectedProductItem {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .cg-selectedProductImage,
        .cg-productPickerImage {
          width: 44px;
          height: 44px;
          object-fit: cover;
          border: 1px solid #e1e3e5;
          border-radius: 12px;
          flex-shrink: 0;
        }
        .cg-selectedProductImageEmpty,
        .cg-productPickerImageEmpty {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #f1f3f5;
          color: #6b7280;
          font-weight: 700;
        }
        .cg-selectedProductText,
        .cg-productPickerText {
          display: grid;
          gap: 2px;
          min-width: 0;
          flex: 1;
        }
        .cg-productPickerList {
          max-height: 360px;
          overflow-y: auto;
        }
        .cg-productPickerItem {
          display: flex;
          width: 100%;
          align-items: center;
          gap: 12px;
          border: 0;
          border-bottom: 1px solid #f1f3f5;
          border-radius: 12px;
          background: transparent;
          cursor: pointer;
          padding: 10px 6px;
          text-align: left;
        }
        .cg-productPickerItem:hover {
          background: #f9fafb;
        }
        .cg-productPickerItemSelected {
          background: #f0f7ff;
        }
        .cg-productPickerSelectedText {
          color: #2563eb;
          flex-shrink: 0;
          font-size: 12px;
          font-weight: 700;
        }
        .cg-doneButton {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          border: 1px solid #d1d5db;
          border-radius: 12px;
          background: #fff;
          color: #111827;
          cursor: pointer;
          font: inherit;
          font-weight: 650;
          min-height: 32px;
          padding: 5px 8px;
        }
        .cg-doneButton:hover {
          background: #f9fafb;
        }
        .cg-doneIcon {
          display: inline-flex;
          width: 16px;
          height: 16px;
          color: #111827;
        }
        .cg-doneIcon .Polaris-Icon {
          width: 100%;
          height: 100%;
        }
        .cg-reorderControls {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 2px;
          color: #8c9196;
        }
        .cg-reorderButton {
          display: inline-flex;
          width: 18px;
          height: 28px;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 12px;
          background: transparent;
          color: #8c9196;
          cursor: pointer;
          padding: 0;
        }
        .cg-reorderButton:hover:not(:disabled) {
          background: #f6f6f7;
        }
        .cg-reorderButton:disabled {
          color: #d1d5db;
          cursor: not-allowed;
        }
        .cg-reorderButton .Polaris-Icon {
          width: 100%;
          height: 100%;
          margin: 0;
        }
        .cg-paused {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #fff8db;
          border: 1px solid #f2d94e;
          border-bottom: 2px solid #f2d94e;
          border-radius: 12px;
          color: #6a4c00;
          padding: 12px 18px;
        }
        .cg-paused .Polaris-Icon {
        margin: unset !important;
        }
        .cg-previewCanvas {
          background: #f7f7f7;
          min-height: 100px;
          padding: 18px 20px 34px;
          border-bottom: 1px solid #e1e3e5;
        }
        .cg-progressWrap {
          position: relative;
          margin-top: 18px;
          padding: 0 12px 68px;
        }
        .cg-previewTrack {
          height: 6px;
          background: #e1e3e5;
          border-radius: 999px;
          overflow: hidden;
        }
        .cg-previewFill {
          height: 100%;
          background: #303030;
          border-radius: 999px;
        }
        .cg-previewMilestone {
          position: absolute;
          top: -10px;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          min-width: 92px;
          font-size: 10px;
          line-height: 12px;
          text-align: center;
          color: #444;
        }
        .cg-previewMilestoneCompleted {
          color: #0a7f40;
          font-weight: 700;
        }
        .cg-previewMarker {
          width: 20px;
          height: 20px;
          border-radius: 999px;
          background: #303030;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .cg-previewMarkerCompleted {
          background: #0a7f40;
        }
        .cg-previewMarkerCompleted .Polaris-Icon {
          width: 14px;
          height: 14px;
        }
        .cg-contentItem + .cg-contentItem {
          border-top: 1px solid #e1e3e5;
        }
        .cg-contentItemHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px;
        }
        .cg-contentItemBody {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f6f6f6;
          padding: 14px 22px;
          border-top: 1px solid #e1e3e5;
        }
        .cg-modalFields {
          display: grid;
          gap: 20px;
          max-height: 660px;
          overflow: hidden;
          padding-right: 8px;
        }
        .cg-targetBox {
          display: grid;
          grid-template-columns: 48px minmax(0, 1fr) auto;
          gap: 16px;
          align-items: center;
          border: 1px solid #e1e3e5;
          border-radius: 12px;
          padding: 18px;
        }
        .cg-targetIcon {
          width: 44px;
          height: 44px;
          border-radius: 999px;
          background: #efe3ff;
          color: #7a36ff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
        }
        .cg-targetRules {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 8px;
        }
        .cg-targetRule {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid #dfe3e8;
          border-radius: 12px;
          background: #f6f6f7;
          padding: 6px 10px;
        }
        @media (max-width: 1050px) {
          .cg-layout {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 700px) {
          .cg-rewardHeader,
          .cg-contentItemHeader,
          .cg-contentItemBody {
            align-items: flex-start;
            flex-direction: column;
          }
          .cg-milestoneRow,
          .cg-targetBox {
            grid-template-columns: 1fr;
          }
          .cg-goalInput {
            width: 100%;
            max-width: 110px;
          }
          .cg-goalArrow {
            width: 100%;
            max-width: 110px;
          }
        }
      `}</style>

      <Box paddingBlockEnd="800">
        <div className="cg-layout">
          <BlockStack gap="400">
            {actionData?.error && (
              <Banner tone="critical" title="Save failed">
                {actionData.error}
              </Banner>
            )}

            <SectionCard
              icon={GiftCardIcon}
              title="Goals & rewards"
              open={openSection === "goals"}
              onOpenChange={(open) => setOpenSection(open ? "goals" : null)}
            >
              <BlockStack gap="500">
                <BlockStack gap="200">
                  <Text variant="bodyMd" as="p" fontWeight="semibold">
                    Choose what to track
                  </Text>
                  <SegmentControl
                    appearance="soft"
                    value={trackBy}
                    onChange={setTrackBy}
                    options={[
                      { label: "Total cart value", value: "value" },
                      { label: "Product quantity", value: "quantity" },
                    ]}
                  />
                </BlockStack>

                <BlockStack gap="100">
                  <Text variant="headingSm" as="h3" fontWeight="semibold">
                    Milestones
                  </Text>
                  <Text variant="bodyMd" as="p" tone="subdued">
                    Setup the target value and reward for each milestone
                  </Text>
                </BlockStack>

                {sortedGoals.length > 0 && (
                  <div className="cg-milestoneList">
                    {goals.map((goal, index) => (
                      <GoalCard
                        key={`${goal.type}-${index}`}
                        goal={goal}
                        index={index}
                        isLast={index === goals.length - 1}
                        trackBy={trackBy}
                        validationError={
                          showGoalValidation ? goalValidationErrors[index] : ""
                        }
                        rewardValidationError={
                          showGoalValidation ? rewardValidationErrors[index] : ""
                        }
                        productPickerItems={productPickerItems}
                        productPickerLoading={productPickerLoading}
                        onOpenProductPicker={setProductPickerGoalIndex}
                        onGoalChange={patchGoal}
                        onToggle={toggleGoal}
                        onMove={moveGoal}
                        onDelete={(goalIndex) =>
                          setGoals((current) =>
                            current.filter((_, currentIndex) => currentIndex !== goalIndex)
                          )
                        }
                        onRewardTypeChange={changeGoalRewardType}
                        currencySymbol={currencySymbol}
                      />
                    ))}
                  </div>
                )}

                <InlineStack align="center">
                  <Popover
                    active={addMenuOpen}
                    activator={
                      <Button
                        icon={PlusIcon}
                        onClick={() => setAddMenuOpen((value) => !value)}
                      >
                        Add a new goal
                      </Button>
                    }
                    autofocusTarget="first-node"
                    onClose={() => setAddMenuOpen(false)}
                  >
                    <ActionList
                      items={Object.values(REWARD_CONFIG).map((reward) => ({
                        content: reward.menuLabel,
                        icon: reward.icon,
                        onAction: () => addGoal(reward.type),
                      }))}
                    />
                  </Popover>
                </InlineStack>
              </BlockStack>
            </SectionCard>

            <ContentSection
              goals={goals}
              shownGoals={shownGoals}
              onShownGoalsChange={setShownGoals}
              onEditGoal={setEditingTextIndex}
              open={openSection === "content"}
              onOpenChange={(open) => setOpenSection(open ? "content" : null)}
            />

            <TargetingPrioritySection
              open={openSection === "targeting"}
              onOpenChange={(open) => setOpenSection(open ? "targeting" : null)}
              settings={settings}
              onSettingsChange={setSettings}
              priority={priority}
              onPriorityChange={setPriority}
            />

            <SettingsSection
              open={openSection === "settings"}
              onOpenChange={(open) => setOpenSection(open ? "settings" : null)}
              settings={settings}
              onSettingsChange={setSettings}
            />
          </BlockStack>

          <PreviewPanel
            enabled={enabled}
            onEnabledChange={setEnabled}
            campaignName={campaignName}
            onCampaignNameChange={setCampaignName}
            goals={sortedGoals}
            shownGoals={shownGoals}
            trackBy={trackBy}
            sliderValue={sliderValue}
            onSliderChange={setSliderValue}
            currencySymbol={currencySymbol}
          />
        </div>
      </Box>

      <TextEditModal
        goal={editingTextIndex === null ? null : goals[editingTextIndex]}
        index={editingTextIndex || 0}
        onClose={() => setEditingTextIndex(null)}
        onChange={patchGoalText}
      />
      <ProductPickerModal
        open={productPickerGoalIndex !== null}
        onClose={() => setProductPickerGoalIndex(null)}
        items={productPickerItems}
        loading={productPickerLoading}
        selected={
          productPickerGoalIndex === null
            ? []
            : goals[productPickerGoalIndex]?.bonusProductIds ||
            [goals[productPickerGoalIndex]?.bonusProductId].filter(Boolean)
        }
        onApply={applyGiftProduct}
      />
      <Modal
        open={leaveModalOpen}
        onClose={() => setLeaveModalOpen(false)}
        title="Save this cart goal as a draft?"
        primaryAction={{
          content: "Save draft",
          onAction: handleSaveDraftAndLeave,
          loading: isSavingDraft,
        }}
        secondaryActions={[
          {
            content: "Don't save",
            destructive: true,
            onAction: handleDiscardAndLeave,
          },
          {
            content: "Keep editing",
            onAction: () => setLeaveModalOpen(false),
          },
        ]}
      >
        <Modal.Section>
          <Text as="p">
            You have unsaved changes. Save this campaign as a paused draft, or
            leave without saving it.
          </Text>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
