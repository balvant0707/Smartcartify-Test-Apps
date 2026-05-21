import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useLoaderData, useFetcher } from "react-router";
import {
  Page, Tabs, Text, Box, BlockStack, InlineStack,
  Button, Badge, Modal, EmptyState, Icon, Banner,
} from "@shopify/polaris";
import {
  DeliveryIcon, DiscountIcon, GiftCardIcon, CodeIcon,
  EditIcon, DeleteIcon, PlusIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

function formatCartStep(value) {
  if (value === undefined || value === null) return "";
  const text = String(value).trim();
  if (!text) return "";
  const compact = text.toLowerCase().replace(/[_-]/g, "").replace(/\s+/g, "");
  const match = compact.match(/(?:cart)?step(\d+)$/) || compact.match(/^(\d+)$/);
  return match ? `Cart Step ${match[1]}` : text.replace(/^Step\b/i, "Cart Step");
}

// ─── Loader ──────────────────────────────────────────────────────────────────

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const [shippingRows, discountRows, freeRows, bxgyRows] = await Promise.all([
    prisma.shippingRule.findMany({
      where: { shop },
      orderBy: { updatedAt: "desc" },
      select: { id: true, campaignName: true, enabled: true, updatedAt: true, rewardType: true, rateType: true, amount: true, minSubtotal: true, maxSubtotal: true, cartStepName: true },
    }),
    prisma.discountRule.findMany({
      where: { shop },
      orderBy: { updatedAt: "desc" },
      select: { id: true, type: true, campaignName: true, codeCampaignName: true, enabled: true, updatedAt: true, valueType: true, value: true, triggerType: true, minPurchase: true, minQuantity: true, cartStepName: true },
    }),
    prisma.freeGiftRule.findMany({
      where: { shop },
      orderBy: { updatedAt: "desc" },
      select: { id: true, campaignName: true, enabled: true, updatedAt: true, triggerType: true, minPurchase: true, minQuantity: true, cartStepName: true },
    }),
    prisma.bxgyRule.findMany({
      where: { shop },
      orderBy: { updatedAt: "desc" },
      select: { id: true, campaignName: true, enabled: true, updatedAt: true, xQty: true, yQty: true, scope: true },
    }),
  ]);

  const fmtMoney = (v) => (v ? `$${v}` : null);

  const shippingMeta = (r) => {
    const reward = r.rewardType === "free" ? "Free shipping" : r.rewardType === "reduced_rate" ? "Reduced rate" : "Shipping";
    const parts = [];
    if (r.minSubtotal) parts.push(`Min ${fmtMoney(r.minSubtotal)}`);
    if (r.maxSubtotal) parts.push(`Max ${fmtMoney(r.maxSubtotal)}`);
    return parts.length ? `${reward} · ${parts.join(" – ")}` : reward;
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
    return [value, trigger].filter(Boolean).join(" · ") || "No value set";
  };

  const freeGiftMeta = (r) => {
    const trigger = r.triggerType === "quantity" && r.minQuantity
      ? `Min ${r.minQuantity} item${r.minQuantity !== "1" ? "s" : ""}`
      : r.minPurchase
        ? `Min ${fmtMoney(r.minPurchase)}`
        : "No minimum";
    return `Free gift · ${trigger}`;
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
      })),
    ...freeRows.map((r) => ({
      id: r.id,
      ruleType: "free-product",
      name: r.campaignName || "Free Product",
      status: r.enabled ? "active" : "disabled",
      updatedAt: r.updatedAt,
      meta: freeGiftMeta(r),
      cartStep: formatCartStep(r.cartStepName),
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
        cartStep: formatCartStep(r.cartStepName),
      })),
    ...bxgyRows.map((r) => ({
      id: r.id,
      ruleType: "buy-x-get-y",
      name: r.campaignName || "Buy X Get Y",
      status: r.enabled ? "active" : "disabled",
      updatedAt: r.updatedAt,
      meta: `Buy ${r.xQty || "?"} get ${r.yQty || "?"} free${r.scope === "store" ? " · Storewide" : ""}`,
      cartStep: "",
    })),
  ].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  return { rules };
};

// ─── Action ──────────────────────────────────────────────────────────────────

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

async function deleteShopifyDiscount(admin, id) {
  if (!id) return;
  try {
    await (await admin.graphql(DELETE_AUTOMATIC, { variables: { id } })).json();
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

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const body = await request.json();

  if (body._action === "delete") {
    const id = parseInt(body.id, 10);
    const shop = session.shop;

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
      default:
        return Response.json({ error: "Unknown rule type" }, { status: 400 });
    }
    return Response.json({ success: true });
  }
  return Response.json({ error: "Unknown action" }, { status: 400 });
};

// ─── Config ──────────────────────────────────────────────────────────────────

const RULE_ROUTES = {
  "shipping":           "/app/rule-shipping",
  "automatic-discount": "/app/rule-auto-discount",
  "free-product":       "/app/rule-free-product",
  "code-discount":      "/app/rule-code-discount",
  "buy-x-get-y":        "/app/rule-bxgy",
};

const RULE_META = {
  "shipping":           { label: "Shipping Rule",       icon: DeliveryIcon,  color: "#0ea5e9", bg: "#f0f9ff" },
  "automatic-discount": { label: "Automatic Discount",   icon: DiscountIcon,  color: "#f59e0b", bg: "#fffbeb" },
  "free-product":       { label: "Free Product Discount", icon: GiftCardIcon,  color: "#8b5cf6", bg: "#f5f3ff" },
  "code-discount":      { label: "Code Discount",        icon: CodeIcon,      color: "#10b981", bg: "#ecfdf5" },
  "buy-x-get-y":        { label: "Buy X Get Y Discount", icon: GiftCardIcon,  color: "#ef4444", bg: "#fff1f2" },
};

const TABS = [
  { id: "all",              content: "All rules" },
  { id: "shipping",         content: "Shipping" },
  { id: "automatic-discount", content: "Automatic Discount" },
  { id: "free-product",     content: "Free Product Discount" },
  { id: "code-discount",    content: "Code Discount" },
  { id: "buy-x-get-y",      content: "Buy X Get Y Discount" },
];

// ─── Component ───────────────────────────────────────────────────────────────

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
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    if (fetcher.state === "idle" && deletingKey) {
      setDeletingKey(null);
      if (fetcher.data?.success) {
        setSuccessMsg("Rule deleted and removed from Shopify.");
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    }
  }, [fetcher.state]);

  const activeType = TABS[tabIndex].id;
  const filtered = activeType === "all"
    ? rules
    : rules.filter((r) => r.ruleType === activeType);

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
          <Banner tone="critical" title="Delete failed">{fetcher.data.error}</Banner>
        </Box>
      )}

      <Box paddingBlockEnd="800">
        <div style={{ background: "#fff", border: "1px solid #e1e3e5", borderRadius: "12px", overflow: "hidden" }}>
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
            <div>
              {/* Table header */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "minmax(180px, 2fr) 130px 120px 120px 120px 100px",
                gap: "12px",
                padding: "10px 20px",
                background: "#f9fafb",
                borderBottom: "1px solid #e1e3e5",
              }}>
                {["Rule", "Type", "Cart Step", "Status", "Last updated", "Actions"].map((h) => (
                  <Text key={h} variant="bodySm" fontWeight="semibold" tone="subdued" as="p">{h}</Text>
                ))}
              </div>

              {/* Rows */}
              {filtered.map((rule, i) => {
                const meta = RULE_META[rule.ruleType] || {};
                const isLast = i === filtered.length - 1;
                return (
                  <div
                    key={`${rule.ruleType}-${rule.id}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(180px, 2fr) 130px 120px 120px 120px 100px",
                      gap: "12px",
                      padding: "14px 20px",
                      alignItems: "center",
                      borderBottom: isLast ? "none" : "1px solid #f1f3f5",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#fafafa"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    {/* Rule name + meta */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                      <div style={{
                        width: "36px", height: "36px", borderRadius: "8px",
                        background: meta.bg || "#f3f4f6",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>
                        <span style={{ color: meta.color || "#6b7280" }}>
                          <Icon source={meta.icon || DiscountIcon} />
                        </span>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <Text variant="bodyMd" fontWeight="semibold" as="p" truncate>{rule.name}</Text>
                        <Text variant="bodySm" tone="subdued" as="p">{rule.meta}</Text>
                      </div>
                    </div>

                    {/* Type badge */}
                    <div>
                      <span style={{
                        display: "inline-block",
                        fontSize: "11px", fontWeight: 600,
                        padding: "3px 8px", borderRadius: "4px",
                        background: meta.bg || "#f3f4f6",
                        color: meta.color || "#374151",
                        border: `1px solid ${meta.color ? meta.color + "33" : "#e1e3e5"}`,
                        whiteSpace: "nowrap",
                      }}>
                        {meta.label || rule.ruleType}
                      </span>
                    </div>

                    {/* Cart Step */}
                    <Text variant="bodySm" tone={rule.cartStep ? undefined : "subdued"} as="p">
                      {rule.cartStep || "-"}
                    </Text>

                    {/* Status */}
                    <div>
                      <Badge tone={rule.status === "active" ? "success" : "critical"}>
                        {rule.status === "active" ? "Active" : "Disabled"}
                      </Badge>
                    </div>

                    {/* Date */}
                    <Text variant="bodySm" tone="subdued" as="p">
                      {new Date(rule.updatedAt).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", year: "numeric",
                      })}
                    </Text>

                    {/* Actions */}
                    <InlineStack gap="200">
                      <Button
                        size="slim"
                        icon={EditIcon}
                        onClick={() => handleEdit(rule)}
                        accessibilityLabel={`Edit ${rule.name}`}
                      />
                      <Button
                        size="slim"
                        icon={DeleteIcon}
                        tone="critical"
                        variant="plain"
                        onClick={() => setDeleteTarget(rule)}
                        accessibilityLabel={`Delete ${rule.name}`}
                        loading={deletingKey === `${rule.ruleType}-${rule.id}`}
                      />
                    </InlineStack>
                  </div>
                );
              })}

              {/* Footer count */}
              <div style={{ padding: "10px 20px", borderTop: "1px solid #f1f3f5", background: "#f9fafb" }}>
                <Text variant="bodySm" tone="subdued" as="p">
                  {filtered.length} rule{filtered.length !== 1 ? "s" : ""}
                  {activeType !== "all" ? ` · ${RULE_META[activeType]?.label || activeType}` : ""}
                </Text>
              </div>
            </div>
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
