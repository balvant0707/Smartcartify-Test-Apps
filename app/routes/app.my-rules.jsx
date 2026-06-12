import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useLoaderData, useFetcher } from "react-router";
import {
  Page, Tabs, Text, Box, InlineStack,
  Button, Badge, Modal, EmptyState, Icon, Banner, IndexTable, Tooltip,
} from "@shopify/polaris";
import {
  DeliveryIcon, DiscountIcon, GiftCardIcon, CodeIcon,
  DeleteIcon, PlusIcon, DuplicateIcon, ChevronUpIcon, ChevronDownIcon,
  ProductIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { invalidateShopCache } from "./app.proxy.smart.jsx";
import {
  clearCartGoalDiscountIdsFromGoals,
  deactivateCartGoalRuleDiscounts,
  reconcileCartGoalPriorityDiscounts,
} from "../lib/cartGoalPriority.server";

const HIDDEN_CAMPAIGN_TYPES = new Set(["shipping", "automatic-discount", "free-product"]);

function formatCartStep(value) {
  if (value === undefined || value === null) return "";
  const text = String(value).trim();
  if (!text) return "";
  const compact = text.toLowerCase().replace(/[_-]/g, "").replace(/\s+/g, "");
  const match = compact.match(/(?:cart)?step(\d+)$/) || compact.match(/^(\d+)$/);
  return match ? `Cart Step ${match[1]}` : text.replace(/^Step\b/i, "Cart Step");
}

const ANNOUNCEMENT_BAR_LABEL = "Announcement Bar";

function parseStoredIds(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter(Boolean) : [];
  } catch {
    return typeof raw === "string"
      ? raw.split(",").map((item) => item.trim()).filter(Boolean)
      : [];
  }
}

function formatCartGoalCampaignName(rule, index) {
  const name = String(rule?.campaignName || "").trim();
  if (!name || /^Cart Goal$/i.test(name)) {
    return `Cart Goal ${index + 1}`;
  }
  return name;
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

// Loader

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  try {
    await reconcileCartGoalPriorityDiscounts(admin, shop);
  } catch (err) {
    console.warn("Cart Goal priority reconciliation failed", err?.message || err);
  }

  const [shippingRows, discountRows, freeRows, bxgyRows, cartGoalRows, upsellRow] = await Promise.all([
    prisma.shippingRule.findMany({
      where: { shop },
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
      select: { id: true, campaignName: true, enabled: true, updatedAt: true, rewardType: true, rateType: true, amount: true, minSubtotal: true, maxSubtotal: true, cartStepName: true, priority: true },
    }),
    prisma.discountRule.findMany({
      where: { shop },
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
      select: { id: true, type: true, campaignName: true, codeCampaignName: true, enabled: true, updatedAt: true, valueType: true, value: true, triggerType: true, minPurchase: true, minQuantity: true, cartStepName: true, priority: true },
    }),
    prisma.freeGiftRule.findMany({
      where: { shop },
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
      select: { id: true, campaignName: true, enabled: true, updatedAt: true, triggerType: true, minPurchase: true, minQuantity: true, cartStepName: true, priority: true },
    }),
    prisma.bxgyRule.findMany({
      where: { shop },
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
      select: { id: true, campaignName: true, enabled: true, updatedAt: true, xQty: true, yQty: true, scope: true, priority: true },
    }),
    prisma.cartGoalRule.findMany({
      where: { shop },
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
      select: { id: true, campaignName: true, enabled: true, updatedAt: true, trackBy: true, shownGoals: true, priority: true },
    }),
    prisma.upsellSettings.findUnique({
      where: { shop },
      select: {
        id: true,
        enabled: true,
        updatedAt: true,
        recommendationMode: true,
        sectionTitle: true,
        showAsSlider: true,
        autoplay: true,
        selectedProductIds: true,
        selectedCollectionIds: true,
      },
    }).catch(() => null),
  ]);

  const fmtMoney = (v) => (v ? `$${v}` : null);

  const shippingMeta = (r) => {
    const reward = r.rewardType === "free" ? "Free shipping" : r.rewardType === "reduced_rate" ? "Reduced rate" : "Shipping";
    const parts = [];
    if (r.minSubtotal) parts.push(`Min ${fmtMoney(r.minSubtotal)}`);
    if (r.maxSubtotal) parts.push(`Max ${fmtMoney(r.maxSubtotal)}`);
    return parts.length ? `${reward} Â· ${parts.join(" â€“ ")}` : reward;
  };

  const discountMeta = (r) => {
    const value = r.value
      ? (r.valueType === "percent" ? `${r.value}% off` : `$${r.value} off`)
      : null;
    const trigger = r.triggerType === "quantity" && r.minQuantity
      ? `Min ${r.minQuantity} item${r.minQuantity !== "1" ? "s" : ""}`
      : r.minPurchase
        ? `Min ${fmtMoney(r.minPurchase)}`
        : null;
    return [value, trigger].filter(Boolean).join(" Â· ") || "No value set";
  };

  const freeGiftMeta = (r) => {
    const trigger = r.triggerType === "quantity" && r.minQuantity
      ? `Min ${r.minQuantity} item${r.minQuantity !== "1" ? "s" : ""}`
      : r.minPurchase
        ? `Min ${fmtMoney(r.minPurchase)}`
        : "No minimum";
    return `Free gift Â· ${trigger}`;
  };

  const upsellMeta = (r) => {
    const productCount = parseStoredIds(r.selectedProductIds).length;
    const collectionCount = parseStoredIds(r.selectedCollectionIds).length;
    const mode = String(r.recommendationMode || "auto").toLowerCase();
    const source =
      mode === "manual"
        ? productCount > 0
          ? `${productCount} selected product${productCount === 1 ? "" : "s"}`
          : collectionCount > 0
            ? `${collectionCount} selected collection${collectionCount === 1 ? "" : "s"}`
            : "Manual selection"
        : "Automatic recommendations";
    const display = r.showAsSlider === false
      ? "Static list"
      : r.autoplay === false
        ? "Slider"
        : "Autoplay slider";
    return `${source} · ${display}`;
  };

  const rules = [
    ...shippingRows.map((r) => ({
      id: r.id,
      ruleType: "shipping",
      name: r.campaignName || "Shipping Rule",
      status: r.enabled ? "active" : "disabled",
      updatedAt: r.updatedAt,
      meta: shippingMeta(r),
      cartStep: formatCartStep(r.cartStepName),
      priority: r.priority || 0,
    })),
    ...discountRows
      .filter((r) => String(r.type || "").toLowerCase() !== "code")
      .map((r) => ({
        id: r.id,
        ruleType: "automatic-discount",
        name: r.campaignName || "Automatic Discount",
        status: r.enabled ? "active" : "disabled",
        updatedAt: r.updatedAt,
        meta: discountMeta(r),
        cartStep: formatCartStep(r.cartStepName),
        priority: r.priority || 0,
      })),
    ...freeRows.map((r) => ({
      id: r.id,
      ruleType: "free-product",
      name: r.campaignName || "Free Product",
      status: r.enabled ? "active" : "disabled",
      updatedAt: r.updatedAt,
      meta: freeGiftMeta(r),
      cartStep: formatCartStep(r.cartStepName),
      priority: r.priority || 0,
    })),
    ...discountRows
      .filter((r) => String(r.type || "").toLowerCase() === "code")
      .map((r) => ({
        id: r.id,
        ruleType: "code-discount",
        name: r.codeCampaignName || r.campaignName || "Code Discount",
        status: r.enabled ? "active" : "disabled",
        updatedAt: r.updatedAt,
        meta: discountMeta(r),
        cartStep: ANNOUNCEMENT_BAR_LABEL,
        priority: r.priority || 0,
      })),
    ...bxgyRows.map((r) => ({
      id: r.id,
      ruleType: "buy-x-get-y",
      name: r.campaignName || "Buy X Get Y",
      status: r.enabled ? "active" : "disabled",
      updatedAt: r.updatedAt,
      meta: `Buy ${r.xQty || "?"} get ${r.yQty || "?"} free${r.scope === "store" ? " Â· Storewide" : ""}`,
      cartStep: ANNOUNCEMENT_BAR_LABEL,
      priority: r.priority || 0,
    })),
    ...cartGoalRows.map((r, index) => ({
      id: r.id,
      ruleType: "cart-goal",
      name: formatCartGoalCampaignName(r, index),
      status: r.enabled ? "active" : "disabled",
      updatedAt: r.updatedAt,
      meta: `${r.shownGoals || 3} goal${r.shownGoals === 1 ? "" : "s"} shown Â· ${r.trackBy === "quantity" ? "Quantity" : "Cart value"}`,
      cartStep: "Cart Drawer",
      priority: r.priority || 0,
    })),
    ...(upsellRow ? [{
      id: upsellRow.id,
      ruleType: "upsell-product",
      name: upsellRow.sectionTitle || "Upsell Product",
      status: upsellRow.enabled ? "active" : "disabled",
      updatedAt: upsellRow.updatedAt,
      meta: upsellMeta(upsellRow),
      cartStep: "Cart Drawer",
      priority: 0,
      singleton: true,
    }] : []),
  ]
    .filter((rule) => !HIDDEN_CAMPAIGN_TYPES.has(rule.ruleType))
    .sort((a, b) =>
      (Number(b.priority || 0) - Number(a.priority || 0)) ||
      (new Date(b.updatedAt) - new Date(a.updatedAt)) ||
      (Number(b.id || 0) - Number(a.id || 0))
    );

  return { rules };
};

// Action

const DELETE_AUTOMATIC = `#graphql
  mutation DiscountAutomaticDelete($id: ID!) {
    discountAutomaticDelete(id: $id) {
      userErrors { field message }
      deletedAutomaticDiscountId
    }
  }`;

const DELETE_CODE = `#graphql
  mutation DiscountCodeDelete($id: ID!) {
    discountCodeDelete(id: $id) {
      userErrors { field message }
      deletedCodeDiscountId
    }
  }`;

const DELIVERY_PROFILES_QUERY = `#graphql
  query { deliveryProfiles(first: 1) { edges { node { id } } } }`;

const DELIVERY_PROFILE_UPDATE = `#graphql
  mutation DeliveryProfileUpdate($id: ID!, $profile: DeliveryProfileInput!) {
    deliveryProfileUpdate(id: $id, profile: $profile) {
      userErrors { field message }
    }
  }`;

function automaticDiscountNodeId(id) {
  const raw = String(id || "").trim();
  if (!raw) return raw;
  return raw
    .replace(/^gid:\/\/shopify\/DiscountAutomaticBasic\//, "gid://shopify/DiscountAutomaticNode/")
    .replace(/^gid:\/\/shopify\/DiscountAutomaticBxgy\//, "gid://shopify/DiscountAutomaticNode/")
    .replace(/^gid:\/\/shopify\/DiscountAutomaticFreeShipping\//, "gid://shopify/DiscountAutomaticNode/");
}

async function deleteShopifyDiscount(admin, id) {
  if (!id) return;
  try {
    await (await admin.graphql(DELETE_AUTOMATIC, {
      variables: { id: automaticDiscountNodeId(id) },
    })).json();
  } catch {
    try {
      await (await admin.graphql(DELETE_CODE, { variables: { id } })).json();
    } catch { /* non-fatal */ }
  }
}

async function deleteShopifyShippingRate(admin, methodDefinitionId) {
  if (!methodDefinitionId) return;
  try {
    const profileRes = await (await admin.graphql(DELIVERY_PROFILES_QUERY, { variables: {} })).json();
    const profileId = profileRes?.data?.deliveryProfiles?.edges?.[0]?.node?.id;
    if (!profileId) return;
    await admin.graphql(DELIVERY_PROFILE_UPDATE, {
      variables: { id: profileId, profile: { methodDefinitionsToDelete: [methodDefinitionId] } },
    });
  } catch { /* non-fatal */ }
}

const RULE_MODELS = {
  "shipping": () => prisma.shippingRule,
  "automatic-discount": () => prisma.discountRule,
  "free-product": () => prisma.freeGiftRule,
  "code-discount": () => prisma.discountRule,
  "buy-x-get-y": () => prisma.bxgyRule,
  "cart-goal": () => prisma.cartGoalRule,
};

const copyLabel = (value, fallback) => {
  const base = String(value || fallback || "Rule").trim();
  return base.toLowerCase().endsWith(" copy") ? base : `${base} Copy`;
};

function getRuleModel(ruleType) {
  const getModel = RULE_MODELS[ruleType];
  return getModel ? getModel() : null;
}

async function duplicateRule(ruleType, id, shop) {
  if (ruleType === "upsell-product") {
    throw new Error("Upsell Product is a single settings rule and cannot be duplicated.");
  }

  const model = getRuleModel(ruleType);
  if (!model) throw new Error("Unknown rule type");

  const source = await model.findFirst({ where: { id, shop } });
  if (!source) throw new Error("Rule not found");

  const data = { ...source };
  delete data.id;
  delete data.createdAt;
  delete data.updatedAt;
  data.enabled = false;
  data.priority = Number(source.priority || 0) - 1;

  if (ruleType === "cart-goal") {
    data.campaignName = await nextCartGoalCampaignName(shop);
    data.goals = clearCartGoalDiscountIdsFromGoals(data.goals);
  } else if ("campaignName" in data) {
    data.campaignName = copyLabel(data.campaignName, "Rule");
  }

  if (ruleType === "code-discount" || ruleType === "automatic-discount") {
    data.shopifyDiscountCodeId = null;
    data.shopifyPriceRuleId = null;
    data.codeDiscountId = null;
    if (ruleType === "code-discount") {
      data.codeCampaignName = copyLabel(data.codeCampaignName || data.campaignName, "Code Discount");
      data.campaignName = data.codeCampaignName;
      const suffix = `COPY${Date.now().toString().slice(-5)}`;
      data.discountCode = data.discountCode ? `${data.discountCode}-${suffix}` : null;
    }
  }

  if (ruleType === "shipping") {
    data.shopifyRateId = null;
    data.shopifyMethodDefinitionId = null;
  }

  if (ruleType === "free-product") {
    data.freeProductDiscountID = null;
    data.minAmountFreeGiftDiscountId = null;
    data.minAmountShippingRateId = null;
  }

  if (ruleType === "buy-x-get-y") {
    data.buyxgetyId = null;
  }

  return model.create({ data });
}

async function setRulePriority(ruleType, id, shop, priority) {
  if (ruleType === "upsell-product") return;

  const model = getRuleModel(ruleType);
  if (!model) throw new Error("Unknown rule type");
  await model.updateMany({
    where: { id, shop },
    data: { priority },
  });
}

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const body = await request.json();
  const shop = session.shop;

  if (body._action === "delete") {
    const id = parseInt(body.id, 10);

    switch (body.ruleType) {
      case "shipping": {
        const rule = await prisma.shippingRule.findFirst({
          where: { id, shop },
          select: { shopifyMethodDefinitionId: true },
        });
        await deleteShopifyShippingRate(admin, rule?.shopifyMethodDefinitionId);
        await prisma.shippingRule.deleteMany({ where: { id, shop } });
        break;
      }
      case "automatic-discount": {
        const rule = await prisma.discountRule.findFirst({
          where: { id, shop },
          select: { shopifyDiscountCodeId: true },
        });
        await deleteShopifyDiscount(admin, rule?.shopifyDiscountCodeId);
        await prisma.discountRule.deleteMany({ where: { id, shop } });
        break;
      }
      case "code-discount": {
        const rule = await prisma.discountRule.findFirst({
          where: { id, shop },
          select: { codeDiscountId: true },
        });
        await deleteShopifyDiscount(admin, rule?.codeDiscountId);
        await prisma.discountRule.deleteMany({ where: { id, shop } });
        break;
      }
      case "free-product": {
        const rule = await prisma.freeGiftRule.findFirst({
          where: { id, shop },
          select: { freeProductDiscountID: true, minAmountFreeGiftDiscountId: true },
        });
        await deleteShopifyDiscount(admin, rule?.freeProductDiscountID);
        await deleteShopifyDiscount(admin, rule?.minAmountFreeGiftDiscountId);
        await prisma.freeGiftRule.deleteMany({ where: { id, shop } });
        break;
      }
      case "buy-x-get-y": {
        const rule = await prisma.bxgyRule.findFirst({
          where: { id, shop },
          select: { buyxgetyId: true },
        });
        await deleteShopifyDiscount(admin, rule?.buyxgetyId);
        await prisma.bxgyRule.deleteMany({ where: { id, shop } });
        break;
      }
      case "cart-goal":
        {
          const rule = await prisma.cartGoalRule.findFirst({
            where: { id, shop },
            select: { goals: true },
          });
          await deactivateCartGoalRuleDiscounts(admin, rule);
        }
        await prisma.cartGoalRule.deleteMany({ where: { id, shop } });
        await reconcileCartGoalPriorityDiscounts(admin, shop);
        break;
      case "upsell-product":
        await prisma.upsellSettings.deleteMany({ where: { id, shop } });
        break;
      default:
        return Response.json({ error: "Unknown rule type" }, { status: 400 });
    }
    invalidateShopCache(shop);
    return Response.json({ success: true, message: "Rule deleted and removed from Shopify." });
  }

  if (body._action === "duplicate") {
    const id = parseInt(body.id, 10);
    await duplicateRule(body.ruleType, id, shop);
    if (body.ruleType === "cart-goal") {
      await reconcileCartGoalPriorityDiscounts(admin, shop);
    }
    invalidateShopCache(shop);
    return Response.json({ success: true, message: "Rule duplicated as disabled." });
  }

  if (body._action === "move") {
    const rows = Array.isArray(body.rows) ? body.rows : [];
    const id = parseInt(body.id, 10);
    const currentIndex = rows.findIndex((row) =>
      parseInt(row?.id, 10) === id && row?.ruleType === body.ruleType
    );
    const targetIndex = body.direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= rows.length) {
      return Response.json({ error: "Cannot move rule in that direction" }, { status: 400 });
    }

    const reordered = [...rows];
    const [current] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, current);

    await Promise.all(reordered.map((row, index) =>
      setRulePriority(row.ruleType, parseInt(row.id, 10), shop, (reordered.length - index) * 10)
    ));
    if (reordered.some((row) => row.ruleType === "cart-goal")) {
      await reconcileCartGoalPriorityDiscounts(admin, shop);
    }
    invalidateShopCache(shop);
    return Response.json({ success: true, message: "Rule priority updated." });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
};

// Config

const RULE_ROUTES = {
  "shipping": "/app/rule-shipping",
  "automatic-discount": "/app/rule-auto-discount",
  "free-product": "/app/rule-free-product",
  "code-discount": "/app/rule-code-discount",
  "buy-x-get-y": "/app/rule-bxgy",
  "cart-goal": "/app/rule-cart-goal",
  "upsell-product": "/app/rule-upsell",
};

const RULE_META = {
  "shipping": { label: "Shipping Rule", icon: DeliveryIcon, color: "#0ea5e9", bg: "#f0f9ff", image: "/images/campaigns/Shipping Rules.svg" },
  "automatic-discount": { label: "Automatic Discount", icon: DiscountIcon, color: "#f59e0b", bg: "#fffbeb", image: "/images/campaigns/Automatic Discount.svg" },
  "free-product": { label: "Free Product Discount", icon: GiftCardIcon, color: "#8b5cf6", bg: "#f5f3ff", image: "/images/campaigns/Free Product Discount.svg" },
  "code-discount": { label: "Code Discount", icon: CodeIcon, color: "#10b981", bg: "#ecfdf5", image: "/images/campaigns/Code Discount.svg" },
  "buy-x-get-y": { label: "Buy X Get Y Discount", icon: GiftCardIcon, color: "#ef4444", bg: "#fff1f2", image: "/images/campaigns/buyxgety.svg" },
  "cart-goal": { label: "Cart Goal", icon: DiscountIcon, color: "#d946ef", bg: "#fdf4ff", image: "/images/campaigns/campaign-ico-cart-goal.svg" },
  "upsell-product": { label: "Upsell Product", icon: ProductIcon, color: "#2563eb", bg: "#eff6ff", image: "/images/campaigns/Upsell Product Rules.svg" },
};

const TABS = [
  { id: "all", content: "All rules" },
  { id: "code-discount", content: "Code Discount" },
  { id: "buy-x-get-y", content: "Buy X Get Y Discount" },
  { id: "cart-goal", content: "Cart Goal" },
  { id: "upsell-product", content: "Upsell Product" },
];

const TABLE_HEADINGS = [
  { title: "Campaign details", id: "campaign-details" },
  { title: "Status", id: "status" },
  { title: "Actions", id: "actions", alignment: "center" },
  { title: "Priority", id: "priority", alignment: "center" },
];

function RuleCampaignMark({ meta, name }) {
  if (meta.image) {
    return (
      <img
        src={meta.image}
        alt=""
        width={54}
        height={54}
        style={{ display: "block", objectFit: "contain", flexShrink: 0 }}
      />
    );
  }

  return (
    <div style={{
      width: "54px",
      height: "54px",
      borderRadius: "10px",
      background: meta.bg || "#f3f4f6",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    }}>
      <span style={{ color: meta.color || "#6b7280" }}>
        <Icon source={meta.icon || DiscountIcon} accessibilityLabel={name} />
      </span>
    </div>
  );
}

// Component

export default function MyRules() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const host = searchParams.get("host");
  const withHost = (path, extra = {}) => {
    const p = new URLSearchParams(extra);
    if (host) p.set("host", host);
    const qs = p.toString();
    return qs ? `${path}?${qs}` : path;
  };

  const { rules } = useLoaderData();
  const fetcher = useFetcher();

  const [tabIndex, setTabIndex] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingKey, setDeletingKey] = useState(null);
  const [busyKey, setBusyKey] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    if (fetcher.state === "idle" && (deletingKey || busyKey)) {
      setDeletingKey(null);
      setBusyKey(null);
      if (fetcher.data?.success) {
        setSuccessMsg(fetcher.data.message || "Rule updated.");
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    }
  }, [fetcher.state, fetcher.data, deletingKey, busyKey]);

  const activeType = TABS[tabIndex].id;
  const filtered = activeType === "all"
    ? rules
    : rules.filter((r) => r.ruleType === activeType);
  const movableFiltered = filtered.filter((row) => !row.singleton);

  const handleEdit = (rule) => {
    const base = RULE_ROUTES[rule.ruleType];
    if (!base) return;
    navigate(withHost(base, { id: rule.id }));
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    const key = `${deleteTarget.ruleType}-${deleteTarget.id}`;
    setDeletingKey(key);
    fetcher.submit(
      { _action: "delete", id: deleteTarget.id, ruleType: deleteTarget.ruleType },
      { method: "post", encType: "application/json" }
    );
    setDeleteTarget(null);
  };

  const handleDuplicate = (rule) => {
    const key = `duplicate-${rule.ruleType}-${rule.id}`;
    setBusyKey(key);
    fetcher.submit(
      { _action: "duplicate", id: rule.id, ruleType: rule.ruleType },
      { method: "post", encType: "application/json" }
    );
  };

  const handleMove = (rule, direction) => {
    const key = `move-${direction}-${rule.ruleType}-${rule.id}`;
    setBusyKey(key);
    fetcher.submit(
      {
        _action: "move",
        id: rule.id,
        ruleType: rule.ruleType,
        direction,
        rows: movableFiltered.map((row) => ({ id: row.id, ruleType: row.ruleType })),
      },
      { method: "post", encType: "application/json" }
    );
  };

  const tabsWithCounts = TABS.map((t) => ({
    ...t,
    content: t.id === "all"
      ? `All rules (${rules.length})`
      : `${t.content} (${rules.filter((r) => r.ruleType === t.id).length})`,
  }));

  return (
    <Page
      title="My Rules"
      primaryAction={{
        content: "Create rule",
        icon: PlusIcon,
        onAction: () => navigate(withHost("/app/campaigns")),
      }}
    >
      {successMsg && (
        <Box paddingBlockEnd="400">
          <Banner tone="success" onDismiss={() => setSuccessMsg(null)}>
            {successMsg}
          </Banner>
        </Box>
      )}
      {fetcher.data?.error && (
        <Box paddingBlockEnd="400">
          <Banner tone="critical" title="Action failed">{fetcher.data.error}</Banner>
        </Box>
      )}

      <Box paddingBlockEnd="800">
        <div style={{ background: "#fff", border: "1px solid #e1e3e5", borderRadius: "8px", overflow: "hidden" }}>
          {/* Tabs */}
          <div style={{ borderBottom: "1px solid #e1e3e5" }}>
            <Tabs tabs={tabsWithCounts} selected={tabIndex} onSelect={setTabIndex} />
          </div>

          {filtered.length === 0 ? (
            <Box padding="800">
              <EmptyState
                heading={activeType === "all" ? "No rules created yet" : `No ${RULE_META[activeType]?.label || activeType} rules yet`}
                action={{
                  content: "Create a rule",
                  onAction: () => navigate(withHost("/app/campaigns")),
                }}
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <Text as="p" tone="subdued">
                  Rules control when rewards like free shipping, discounts, and gifts appear in the cart drawer.
                </Text>
              </EmptyState>
            </Box>
          ) : (
            <IndexTable
              resourceName={{ singular: "rule", plural: "rules" }}
              itemCount={filtered.length}
              selectable={false}
              headings={TABLE_HEADINGS}
            >
              {filtered.map((rule, i) => {
                const meta = RULE_META[rule.ruleType] || {};
                const movableIndex = rule.singleton
                  ? -1
                  : movableFiltered.findIndex((row) =>
                    row.id === rule.id && row.ruleType === rule.ruleType
                  );
                return (
                  <IndexTable.Row
                    key={`${rule.ruleType}-${rule.id}`}
                    id={`${rule.ruleType}-${rule.id}`}
                    position={i}
                  >
                    <IndexTable.Cell>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "18px",
                        minWidth: "260px",
                        paddingBlock: "10px",
                      }}>
                        <RuleCampaignMark meta={meta} name={rule.name} />
                        <div style={{ minWidth: 0 }}>
                          <Text variant="headingSm" as="p" truncate>
                            {rule.name}
                          </Text>
                          <Text variant="bodyMd" tone="subdued" as="p">
                            {meta.label || rule.ruleType}
                          </Text>
                        </div>
                      </div>
                    </IndexTable.Cell>

                    <IndexTable.Cell>
                      <Badge tone={rule.status === "active" ? "success" : "critical"}>
                        {rule.status === "active" ? "Active" : "Disabled"}
                      </Badge>
                    </IndexTable.Cell>

                    <IndexTable.Cell>
                      <InlineStack gap="200" align="center" wrap={false}>
                        <Button
                          size="slim"
                          onClick={() => handleEdit(rule)}
                          accessibilityLabel={`Edit ${rule.name}`}
                        >
                          Edit
                        </Button>
                        <Button
                          size="slim"
                          icon={DeleteIcon}
                          onClick={() => setDeleteTarget(rule)}
                          accessibilityLabel={`Delete ${rule.name}`}
                          loading={deletingKey === `${rule.ruleType}-${rule.id}`}
                        />
                        {!rule.singleton && (
                          <Tooltip content="Duplicate rule">
                            <Button
                              size="slim"
                              icon={DuplicateIcon}
                              onClick={() => handleDuplicate(rule)}
                              loading={busyKey === `duplicate-${rule.ruleType}-${rule.id}`}
                              accessibilityLabel={`Duplicate ${rule.name}`}
                            />
                          </Tooltip>
                        )}
                      </InlineStack>
                    </IndexTable.Cell>

                    <IndexTable.Cell>
                      {rule.singleton ? (
                        <Text as="span" tone="subdued">Fixed</Text>
                      ) : (
                        <InlineStack gap="100" align="center" wrap={false}>
                          <Tooltip content="Move up">
                            <Button
                              variant="plain"
                              icon={ChevronUpIcon}
                              disabled={movableIndex <= 0}
                              onClick={() => handleMove(rule, "up")}
                              loading={busyKey === `move-up-${rule.ruleType}-${rule.id}`}
                              accessibilityLabel={`Move ${rule.name} up`}
                            />
                          </Tooltip>
                          <Tooltip content="Move down">
                            <Button
                              variant="plain"
                              icon={ChevronDownIcon}
                              disabled={movableIndex < 0 || movableIndex === movableFiltered.length - 1}
                              onClick={() => handleMove(rule, "down")}
                              loading={busyKey === `move-down-${rule.ruleType}-${rule.id}`}
                              accessibilityLabel={`Move ${rule.name} down`}
                            />
                          </Tooltip>
                        </InlineStack>
                      )}
                    </IndexTable.Cell>

                  </IndexTable.Row>
                );
              })}

            </IndexTable>
          )}
        </div>
      </Box>

      {/* Delete confirm modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete rule?"
        primaryAction={{
          content: "Delete",
          destructive: true,
          onAction: handleDeleteConfirm,
          loading: fetcher.state !== "idle",
        }}
        secondaryActions={[{ content: "Cancel", onAction: () => setDeleteTarget(null) }]}
      >
        <Modal.Section>
          <Text as="p">
            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.
          </Text>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
