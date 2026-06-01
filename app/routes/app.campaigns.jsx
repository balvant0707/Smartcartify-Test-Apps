import { useState } from "react";
import { useNavigate, useSearchParams, useLoaderData, useFetcher } from "react-router";
import {
  Page,
  Tabs,
  Text,
  Box,
  BlockStack,
  InlineStack,
  Button,
  Badge,
  Modal,
  Icon,
} from "@shopify/polaris";
import { DeleteIcon, EditIcon, DeliveryIcon, DiscountIcon, GiftCardIcon, CodeIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

// ─── Loader ──────────────────────────────────────────────────────────────────
// Reads from all four legacy rule tables: ShippingRule, DiscountRule,
// FreeGiftRule, BxgyRule. Returns a unified `rules` array for the "My rules"
// table, plus the raw counts used by badges.

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const [shippingRows, discountRows, freeRows, bxgyRows] = await Promise.all([
    prisma.shippingRule.findMany({
      where: { shop },
      orderBy: { updatedAt: "desc" },
      select: { id: true, campaignName: true, enabled: true, updatedAt: true, rewardType: true, minSubtotal: true, maxSubtotal: true, cartStepName: true },
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
    const value = r.value ? (r.valueType === "percent" ? `${r.value}% off` : `$${r.value} off`) : null;
    const trigger = r.triggerType === "quantity" && r.minQuantity
      ? `Min ${r.minQuantity} item${r.minQuantity !== "1" ? "s" : ""}`
      : r.minPurchase ? `Min ${fmtMoney(r.minPurchase)}` : null;
    return [value, trigger].filter(Boolean).join(" · ") || "No value set";
  };

  const freeGiftMeta = (r) => {
    const trigger = r.triggerType === "quantity" && r.minQuantity
      ? `Min ${r.minQuantity} item${r.minQuantity !== "1" ? "s" : ""}`
      : r.minPurchase ? `Min ${fmtMoney(r.minPurchase)}` : "No minimum";
    return `Free gift · ${trigger}`;
  };

  const formatCartStep = (value) => {
    if (!value) return "";
    const compact = String(value).trim().toLowerCase().replace(/[_-]/g, "").replace(/\s+/g, "");
    const match = compact.match(/(?:cart)?step(\d+)$/) || compact.match(/^(\d+)$/);
    return match ? `Cart Step ${match[1]}` : String(value).replace(/^Step\b/i, "Cart Step");
  };

  const announcementBarLabel = "Announcement Bar";

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
        cartStep: announcementBarLabel,
      })),
    ...bxgyRows.map((r) => ({
      id: r.id,
      ruleType: "buy-x-get-y",
      name: r.campaignName || "Buy X Get Y",
      status: r.enabled ? "active" : "disabled",
      updatedAt: r.updatedAt,
      meta: `Buy ${r.xQty || "?"} get ${r.yQty || "?"} free${r.scope === "store" ? " · Storewide" : ""}`,
      cartStep: announcementBarLabel,
    })),
  ].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  return { rules };
};

// ─── Action ───────────────────────────────────────────────────────────────────
// Handles delete requests. Routes to the correct Prisma table based on
// ruleType. Both "automatic-discount" and "code-discount" live in discountrule.

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const body = await request.json();

  if (body._action === "delete") {
    const id = parseInt(body.id, 10);
    const shop = session.shop;

    switch (body.ruleType) {
      case "shipping":
        await prisma.shippingRule.deleteMany({ where: { id, shop } });
        break;
      case "automatic-discount":
      case "code-discount":
        await prisma.discountRule.deleteMany({ where: { id, shop } });
        break;
      case "free-product":
        await prisma.freeGiftRule.deleteMany({ where: { id, shop } });
        break;
      case "buy-x-get-y":
        await prisma.bxgyRule.deleteMany({ where: { id, shop } });
        break;
      default:
        return { error: "Unknown rule type" };
    }
    return { success: true };
  }
  return { error: "Unknown action" };
};

// ─── Static data ─────────────────────────────────────────────────────────────

const ICO = (name) => `/images/campaigns/${name}`;

const RULE_TYPES = [
  {
    id: "shipping",
    category: "shipping",
    title: "Shipping Rule",
    subtitle: "Offer free or discounted shipping based on cart value",
    icon: ICO("Shipping Rules.svg"),
    preview: {
      title: "Shipping Rule",
      description:
        "Automatically apply free shipping or a discounted shipping rate when the cart value reaches a threshold. Show real-time progress on a bar to motivate customers to add more.",
      banner: ICO("Shipping Rule - custome.svg"),
      bannerBg: "#f0f9ff",
      aovBoost: "Upto 5%",
      setupTime: "2-3 mins",
      usecases: [
        "Offer free shipping when cart value reaches $50 or more.",
        "Display a progress bar showing how close customers are to free shipping.",
        "Create tiered shipping discounts as cart value increases.",
      ],
    },
  },
  {
    id: "automatic-discount",
    category: "discounts",
    title: "Automatic Discount",
    subtitle: "Apply percentage or fixed discounts automatically",
    icon: ICO("Automatic Discount.svg"),
    preview: {
      title: "Automatic Discount",
      description:
        "Automatically apply a percentage or fixed amount discount when the cart meets a minimum spend or quantity threshold. No code needed — the discount applies instantly at checkout.",
      banner: ICO("autodiscount.svg"),
      bannerBg: "#fff7ed",
      aovBoost: "Upto 8%",
      setupTime: "2-4 mins",
      usecases: [
        "Automatically apply 10% off when cart value exceeds $100.",
        "Give $15 fixed discount when customers add 5+ items.",
        "Run a storewide automatic discount during seasonal promotions.",
      ],
    },
  },
  {
    id: "free-product",
    category: "free-products",
    title: "Free Product Discount",
    subtitle: "Add a free gift to the cart when thresholds are met",
    icon: ICO("Free Product Discount.svg"),
    preview: {
      title: "Free Product Discount",
      description:
        "Automatically add a free gift product to the customer's cart when they meet a minimum spend or quantity threshold. Drive higher average order values with irresistible incentives.",
      banner: ICO("Free Product Discounts.svg"),
      bannerBg: "#eef3ff",
      aovBoost: "Upto 9%",
      setupTime: "3-5 mins",
      usecases: [
        "Add a free sample product when cart value reaches $75.",
        "Give a free gift for orders with 3 or more items.",
        "Offer a complimentary product on high-value purchases.",
      ],
    },
  },
  {
    id: "code-discount",
    category: "discounts",
    title: "Code Discount",
    subtitle: "Display discount codes inside the cart drawer",
    icon: ICO("Code Discount.svg"),
    preview: {
      title: "Code Discount",
      description:
        "Showcase a discount code banner inside the cart drawer. Customers can copy or auto-apply the code for a percentage off or fixed amount discount on their order.",
      banner: ICO("codediscount.svg"),
      bannerBg: "#fffbeb",
      aovBoost: "Upto 4%",
      setupTime: "1-2 mins",
      usecases: [
        "Show a seasonal promo code prominently in the cart.",
        "Display a loyalty reward code for returning customers.",
        "Highlight a limited-time discount code to create urgency.",
      ],
    },
  },
  {
    id: "buy-x-get-y",
    category: "discounts",
    title: "Buy X Get Y Discount",
    subtitle: "Give free gifts when buying specific products",
    icon: ICO("buyxgety.svg"),
    preview: {
      title: "Buy X Get Y Discount",
      description:
        "Reward customers with a free product or discount when they buy a specific product or reach a quantity threshold. Uses Shopify's native BXGY discount engine for seamless checkout integration.",
      banner: ICO("Buy X Get Y Discount.svg"),
      bannerBg: "#eef3ff",
      aovBoost: "Upto 10%",
      setupTime: "5-8 mins",
      usecases: [
        "Buy product A, get product B at 100% off.",
        "Buy any 2 items, get the cheapest one free.",
        "Buy 3 of any item, get 1 at 50% off storewide.",
      ],
    },
  },
  {
    id: "upsell",
    category: "upsell",
    title: "Upsell Product Rules",
    subtitle: "Recommend related products to boost order value",
    icon: ICO("Upsell Product Rules.svg"),
    preview: {
      title: "Upsell Product Rules",
      description:
        "Show a carousel or list of recommended products inside the cart drawer to encourage customers to add more. Supports automatic AI-style recommendations or manually selected items and collections.",
      banner: ICO("upsellproduct.svg"),
      bannerBg: "#f0fdf4",
      aovBoost: "Upto 12%",
      setupTime: "3-5 mins",
      usecases: [
        "Display auto-recommended products based on what's in the cart.",
        "Manually curate upsell products for your top-selling items.",
        "Show upsell items as an autoplay slider for a seamless experience.",
      ],
    },
  },
  {
    id: "customize-preview",
    category: "customize",
    title: "Customize & Preview",
    subtitle: "Personalize cart drawer colors, fonts, and layout",
    icon: ICO("campaign-ico-automation.svg"),
    preview: {
      title: "Customize & Preview",
      description:
        "Personalize every aspect of your cart drawer — colors, button styles, background, font sizes, and more. Preview changes with real products in real-time before saving.",
      banner: ICO("campaign-banner-automation.svg"),
      bannerBg: "#faf5ff",
      aovBoost: "Better UX",
      setupTime: "1-2 mins",
      actionLabel: "Open Customize & Preview",
      usecases: [
        "Match cart drawer colors and fonts to your brand identity.",
        "Preview the live cart drawer with real products before saving.",
        "Adjust button styles, icon, and background for higher conversions.",
      ],
    },
  },
];

const TABS = [
  { id: "all", content: "All" },
  { id: "shipping", content: "Shipping" },
  { id: "discounts", content: "Discounts" },
  { id: "free-products", content: "Free Products" },
  { id: "upsell", content: "Upsell" },
  { id: "customize", content: "Customize" },
];

// Maps rule-type ID → dedicated editor route
const RULE_ROUTES = {
  "shipping": "/app/rule-shipping",
  "automatic-discount": "/app/rule-auto-discount",
  "free-product": "/app/rule-free-product",
  "code-discount": "/app/rule-code-discount",
  "buy-x-get-y": "/app/rule-bxgy",
  "upsell": "/app/rule-upsell",
  "customize-preview": "/app/customize-preview",
};

const STATUS_TONE = {
  active: "success",
  disabled: "critical",
  draft: "info",
  paused: "warning",
};

const RULE_META = {
  "shipping":           { label: "Shipping Rule",        icon: DeliveryIcon,  color: "#0ea5e9", bg: "#f0f9ff" },
  "automatic-discount": { label: "Automatic Discount",   icon: DiscountIcon,  color: "#f59e0b", bg: "#fffbeb" },
  "free-product":       { label: "Free Product Discount",icon: GiftCardIcon,  color: "#8b5cf6", bg: "#f5f3ff" },
  "code-discount":      { label: "Code Discount",        icon: CodeIcon,      color: "#10b981", bg: "#ecfdf5" },
  "buy-x-get-y":        { label: "Buy X Get Y Discount", icon: GiftCardIcon,  color: "#ef4444", bg: "#fff1f2" },
};

// ─── RuleTypeListItem ─────────────────────────────────────────────────────────

function RuleTypeListItem({ ruleType, isSelected, onSelect }) {
  return (
    <div
      onClick={() => onSelect(ruleType.id)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "10px 12px",
        borderRadius: "8px",
        cursor: "pointer",
        backgroundColor: isSelected ? "#fff8f8" : "transparent",
        border: isSelected ? "1.5px solid #fca5a5" : "1.5px solid transparent",
        transition: "background-color 0.12s, border-color 0.12s",
      }}
    >
      <img
        src={ruleType.icon}
        alt={ruleType.title}
        width={40}
        height={40}
        style={{ flexShrink: 0, borderRadius: "8px", objectFit: "contain" }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text variant="bodyMd" fontWeight="semibold" as="p">
          {ruleType.title}
        </Text>
        <Text variant="bodySm" tone="subdued" as="p">
          {ruleType.subtitle}
        </Text>
      </div>
    </div>
  );
}

// ─── PreviewPanel ─────────────────────────────────────────────────────────────

function PreviewPanel({ ruleType, onCreate, creating = false }) {
  const isBanner = ruleType.preview.banner.includes("campaign-banner-");

  return (
    <div
      style={{
        backgroundColor: ruleType.preview.bannerBg,
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Illustration */}
      <div
        style={{
          borderRadius: "12px",
          overflow: "hidden",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fff",
          minHeight: isBanner ? "auto" : "160px",
          padding: isBanner ? "0" : "24px",
        }}
      >
        <img
          src={ruleType.preview.banner}
          alt={ruleType.preview.title}
          style={{
            width: "100%",
            height: isBanner ? "auto" : "120px",
            objectFit: "contain",
            display: "block",
          }}
        />
      </div>

      <BlockStack gap="300">
        <Text variant="headingMd" as="h2" fontWeight="bold">
          {ruleType.preview.title}
        </Text>
        <Text variant="bodySm" tone="subdued" as="p">
          {ruleType.preview.description}
        </Text>

        <Button
          variant="primary"
          size="large"
          fullWidth
          loading={creating}
          disabled={creating}
          onClick={onCreate}
        >
          {ruleType.preview.actionLabel || "Create this rule"}
        </Button>

        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
          }}
        >
          {[
            { value: ruleType.preview.aovBoost, label: "Potential AOV boost" },
            { value: ruleType.preview.setupTime, label: "Time to set up" },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                backgroundColor: "#fff",
                borderRadius: "8px",
                padding: "12px 14px",
                textAlign: "center",
                border: "1px solid #e1e3e5",
              }}
            >
              <Text variant="headingMd" fontWeight="bold" as="p">
                {stat.value}
              </Text>
              <Text variant="bodySm" tone="subdued" as="p">
                {stat.label}
              </Text>
            </div>
          ))}
        </div>

        {/* Usecases */}
        <Box paddingBlockStart="100">
          <BlockStack gap="200">
            <Text
              variant="bodySm"
              fontWeight="semibold"
              as="p"
              alignment="center"
            >
              Usecases
            </Text>
            <BlockStack gap="150">
              {ruleType.preview.usecases.map((usecase, i) => (
                <div
                  key={i}
                  style={{
                    backgroundColor: "#fff",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    border: "1px solid #e1e3e5",
                    display: "flex",
                    gap: "10px",
                    alignItems: "flex-start",
                  }}
                >
                  <span style={{ color: "#8a8a8a", flexShrink: 0 }}>💡</span>
                  <Text variant="bodySm" tone="subdued" as="p">
                    {usecase}
                  </Text>
                </div>
              ))}
            </BlockStack>
          </BlockStack>
        </Box>
      </BlockStack>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const RulesTable = null;

export default function CampaignSelector() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const host = searchParams.get("host");
  const { rules } = useLoaderData();
  const fetcher = useFetcher();

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const [selectedId, setSelectedId] = useState("shipping");
  const [creatingRuleId, setCreatingRuleId] = useState(null);

  // Build URL for a rule editor page, appending host if present.
  const toRulePage = (base, extraParams = {}) => {
    const [pathname, search = ""] = String(base).split("?");
    const params = new URLSearchParams(search);
    Object.entries(extraParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, value);
      }
    });
    if (host) params.set("host", host);
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const handleEdit = (rule) => {
    const base = RULE_ROUTES[rule.ruleType];
    if (!base) return;
    // Upsell is a singleton — no ID param needed.
    const extra = rule.ruleType !== "upsell" ? { id: rule.id } : {};
    navigate(toRulePage(base, extra));
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    fetcher.submit(
      { _action: "delete", id: deleteTarget.id, ruleType: deleteTarget.ruleType },
      { method: "post", encType: "application/json" }
    );
    setDeleteTarget(null);
  };

  const activeCategory = TABS[selectedTabIndex].id;
  const selected = RULE_TYPES.find((r) => r.id === selectedId);

  const groupedTypes =
    activeCategory === "all"
      ? [
          {
            label: "Shipping",
            items: RULE_TYPES.filter((r) => r.category === "shipping"),
          },
          {
            label: "Discounts",
            items: RULE_TYPES.filter((r) => r.category === "discounts"),
          },
          {
            label: "Free Products",
            items: RULE_TYPES.filter((r) => r.category === "free-products"),
          },
          {
            label: "Upsell",
            items: RULE_TYPES.filter((r) => r.category === "upsell"),
          },
          {
            label: "Customize",
            items: RULE_TYPES.filter((r) => r.category === "customize"),
          },
        ]
      : [
          {
            label: null,
            items: RULE_TYPES.filter((r) => r.category === activeCategory),
          },
        ];

  const handleTabSelect = (index) => {
    setCreatingRuleId(null);
    setSelectedTabIndex(index);
    const category = TABS[index].id;
    const first =
      category === "all"
        ? RULE_TYPES[0]
        : RULE_TYPES.find((r) => r.category === category);
    if (first) setSelectedId(first.id);
  };

  const handleCreate = () => {
    const base = RULE_ROUTES[selectedId];
    if (!base) return;
    setCreatingRuleId(selectedId);
    navigate(toRulePage(base));
  };

  return (
    <Page
      backAction={{
        content: "Back",
        onAction: () =>
          navigate(host ? `/app?host=${encodeURIComponent(host)}` : "/app"),
      }}
      title="Campaigns"
    >
      {deleteTarget && (
        <Modal
          open
          onClose={() => setDeleteTarget(null)}
          title="Delete rule?"
          primaryAction={{
            content: "Delete",
            destructive: true,
            onAction: handleDeleteConfirm,
          }}
          secondaryActions={[
            { content: "Cancel", onAction: () => setDeleteTarget(null) },
          ]}
        >
          <Modal.Section>
            <Text as="p">
              Are you sure you want to delete{" "}
              <strong>{deleteTarget.name}</strong>? This cannot be undone.
            </Text>
          </Modal.Section>
        </Modal>
      )}

      {typeof RulesTable === "function" && rules.length > 0 && (
        <Box paddingBlockEnd="600">
          <RulesTable
            rules={rules}
            onEdit={handleEdit}
            onDelete={setDeleteTarget}
          />
        </Box>
      )}

      <Box paddingBlockEnd="600">
        <Text
          variant="headingSm"
          fontWeight="semibold"
          as="h3"
          tone="subdued"
        >
          Create a new rule
        </Text>

        <Box paddingBlockStart="300">
          <div
            style={{
              border: "1px solid #e1e3e5",
              borderRadius: "12px",
              overflow: "hidden",
              backgroundColor: "#fff",
            }}
          >
            {/* Tabs */}
            <div style={{ borderBottom: "1px solid #e1e3e5" }}>
              <Tabs
                tabs={TABS}
                selected={selectedTabIndex}
                onSelect={handleTabSelect}
              />
            </div>

            {/* Two-column body */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "42% 58%",
                minHeight: "560px",
              }}
            >
              {/* Left: rule type list */}
              <div
                style={{
                  borderRight: "1px solid #e1e3e5",
                  padding: "10px 8px",
                  overflowY: "auto",
                }}
              >
                <BlockStack gap="0">
                  {groupedTypes.map((group, gi) => (
                    <div key={gi}>
                      {group.label && (
                        <Box
                          paddingInlineStart="200"
                          paddingBlockStart={gi > 0 ? "400" : "200"}
                          paddingBlockEnd="100"
                        >
                          <Text
                            variant="bodySm"
                            tone="subdued"
                            fontWeight="semibold"
                            as="p"
                          >
                            {group.label}
                          </Text>
                        </Box>
                      )}
                      <BlockStack gap="0">
                        {group.items.map((ruleType) => (
                          <RuleTypeListItem
                            key={ruleType.id}
                            ruleType={ruleType}
                            isSelected={selectedId === ruleType.id}
                            onSelect={setSelectedId}
                          />
                        ))}
                      </BlockStack>
                    </div>
                  ))}
                </BlockStack>
              </div>

              {/* Right: preview panel */}
              {selected && (
                <PreviewPanel
                  ruleType={selected}
                  onCreate={handleCreate}
                  creating={creatingRuleId === selectedId}
                />
              )}
            </div>
          </div>
        </Box>
      </Box>
    </Page>
  );
}
