import { useState } from "react";
import { useNavigate, useSearchParams, useLoaderData, useFetcher } from "react-router";
import {
  Page,
  Tabs,
  Text,
  Box,
  BlockStack,
  Button,
  Badge,
  Modal,
} from "@shopify/polaris";
import { DeleteIcon, EditIcon } from "@shopify/polaris-icons";
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
      select: { id: true, campaignName: true, enabled: true, updatedAt: true },
    }),
    prisma.discountRule.findMany({
      where: { shop },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        type: true,
        campaignName: true,
        codeCampaignName: true,
        enabled: true,
        updatedAt: true,
      },
    }),
    prisma.freeGiftRule.findMany({
      where: { shop },
      orderBy: { updatedAt: "desc" },
      select: { id: true, campaignName: true, enabled: true, updatedAt: true },
    }),
    prisma.bxgyRule.findMany({
      where: { shop },
      orderBy: { updatedAt: "desc" },
      select: { id: true, campaignName: true, enabled: true, updatedAt: true },
    }),
  ]);

  // Normalise into a single list; code-discount rules live in discountrule with type="code".
  const rules = [
    ...shippingRows.map((r) => ({
      id: r.id,
      ruleType: "shipping",
      name: r.campaignName || "Shipping Rule",
      status: r.enabled ? "active" : "disabled",
      updatedAt: r.updatedAt,
    })),
    ...discountRows
      .filter((r) => String(r.type || "").toLowerCase() !== "code")
      .map((r) => ({
        id: r.id,
        ruleType: "automatic-discount",
        name: r.campaignName || "Automatic Discount",
        status: r.enabled ? "active" : "disabled",
        updatedAt: r.updatedAt,
      })),
    ...freeRows.map((r) => ({
      id: r.id,
      ruleType: "free-product",
      name: r.campaignName || "Free Product",
      status: r.enabled ? "active" : "disabled",
      updatedAt: r.updatedAt,
    })),
    ...discountRows
      .filter((r) => String(r.type || "").toLowerCase() === "code")
      .map((r) => ({
        id: r.id,
        ruleType: "code-discount",
        name: r.codeCampaignName || r.campaignName || "Code Discount",
        status: r.enabled ? "active" : "disabled",
        updatedAt: r.updatedAt,
      })),
    ...bxgyRows.map((r) => ({
      id: r.id,
      ruleType: "buy-x-get-y",
      name: r.campaignName || "Buy X Get Y",
      status: r.enabled ? "active" : "disabled",
      updatedAt: r.updatedAt,
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
    icon: ICO("campaign-ico-cart-goal.svg"),
    preview: {
      title: "Shipping Rule",
      description:
        "Automatically apply free shipping or a discounted shipping rate when the cart value reaches a threshold. Show real-time progress on a bar to motivate customers to add more.",
      banner: ICO("campaign-banner-cart-goal.svg"),
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
    icon: ICO("campaign-ico-discount.svg"),
    preview: {
      title: "Automatic Discount",
      description:
        "Automatically apply a percentage or fixed amount discount when the cart meets a minimum spend or quantity threshold. No code needed — the discount applies instantly at checkout.",
      banner: ICO("campaign-ico-discount.svg"),
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
    icon: ICO("campaign-ico-bxgy.svg"),
    preview: {
      title: "Free Product Discount",
      description:
        "Automatically add a free gift product to the customer's cart when they meet a minimum spend or quantity threshold. Drive higher average order values with irresistible incentives.",
      banner: ICO("campaign-ico-bxgy.svg"),
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
    icon: ICO("campaign-ico-discount.svg"),
    preview: {
      title: "Code Discount",
      description:
        "Showcase a discount code banner inside the cart drawer. Customers can copy or auto-apply the code for a percentage off or fixed amount discount on their order.",
      banner: ICO("campaign-banner-cart-goal.svg"),
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
    icon: ICO("campaign-ico-bxgy.svg"),
    preview: {
      title: "Buy X Get Y Discount",
      description:
        "Reward customers with a free product or discount when they buy a specific product or reach a quantity threshold. Uses Shopify's native BXGY discount engine for seamless checkout integration.",
      banner: ICO("campaign-ico-bxgy.svg"),
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
    icon: ICO("campaign-ico-one-click.svg"),
    preview: {
      title: "Upsell Product Rules",
      description:
        "Show a carousel or list of recommended products inside the cart drawer to encourage customers to add more. Supports automatic AI-style recommendations or manually selected items and collections.",
      banner: ICO("campaign-ico-one-click.svg"),
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
];

const TABS = [
  { id: "all", content: "All" },
  { id: "discounts", content: "Discounts" },
  { id: "free-products", content: "Free Products" },
  { id: "shipping", content: "Shipping" },
  { id: "upsell", content: "Upsell" },
];

// Maps rule-type ID → dedicated editor route
const RULE_ROUTES = {
  "shipping": "/app/rule-shipping",
  "automatic-discount": "/app/rule-auto-discount",
  "free-product": "/app/rule-free-product",
  "code-discount": "/app/rule-code-discount",
  "buy-x-get-y": "/app/rule-bxgy",
  "upsell": "/app/rule-upsell",
};

const RULE_TYPE_LABELS = {
  "shipping": "Shipping Rule",
  "automatic-discount": "Automatic Discount",
  "free-product": "Free Product",
  "code-discount": "Code Discount",
  "buy-x-get-y": "Buy X Get Y",
  "upsell": "Upsell Products",
};

const STATUS_TONE = {
  active: "success",
  disabled: "critical",
  draft: "info",
  paused: "warning",
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

function PreviewPanel({ ruleType, onCreate }) {
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

        <Button variant="primary" size="large" fullWidth onClick={onCreate}>
          Create this rule
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

// ─── RulesTable ───────────────────────────────────────────────────────────────
// Shows existing rules from all legacy tables in a unified list.

function RulesTable({ rules, onEdit, onDelete }) {
  if (!rules.length) return null;
  return (
    <div
      style={{
        border: "1px solid #e1e3e5",
        borderRadius: "10px",
        overflow: "hidden",
        background: "#fff",
        marginBottom: "24px",
      }}
    >
      <div
        style={{
          padding: "14px 18px",
          borderBottom: "1px solid #e1e3e5",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text variant="headingSm" fontWeight="semibold" as="h3">
          My rules
        </Text>
        <Badge>{rules.length}</Badge>
      </div>
      <div>
        {rules.map((rule, i) => (
          <div
            key={`${rule.ruleType}-${rule.id}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 18px",
              borderBottom: i < rules.length - 1 ? "1px solid #f1f1f1" : "none",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text variant="bodyMd" fontWeight="semibold" as="p">
                {rule.name}
              </Text>
              <Text variant="bodySm" tone="subdued" as="p">
                {RULE_TYPE_LABELS[rule.ruleType] || rule.ruleType}
              </Text>
            </div>
            <Badge tone={STATUS_TONE[rule.status] || "info"}>
              {rule.status}
            </Badge>
            <Text variant="bodySm" tone="subdued" as="p">
              {new Date(rule.updatedAt).toLocaleDateString()}
            </Text>
            <Button
              size="slim"
              icon={EditIcon}
              onClick={() => onEdit(rule)}
              accessibilityLabel="Edit"
            />
            <Button
              size="slim"
              icon={DeleteIcon}
              tone="critical"
              variant="plain"
              onClick={() => onDelete(rule)}
              accessibilityLabel="Delete"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CampaignSelector() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const host = searchParams.get("host");
  const { rules } = useLoaderData();
  const fetcher = useFetcher();

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const [selectedId, setSelectedId] = useState("shipping");

  // Build URL for a rule editor page, appending host if present.
  const toRulePage = (base, extraParams = {}) => {
    const params = new URLSearchParams(extraParams);
    if (host) params.set("host", host);
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
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
            label: "Discounts",
            items: RULE_TYPES.filter((r) => r.category === "discounts"),
          },
          {
            label: "Free Products",
            items: RULE_TYPES.filter((r) => r.category === "free-products"),
          },
          {
            label: "Shipping",
            items: RULE_TYPES.filter((r) => r.category === "shipping"),
          },
          {
            label: "Upsell",
            items: RULE_TYPES.filter((r) => r.category === "upsell"),
          },
        ]
      : [
          {
            label: null,
            items: RULE_TYPES.filter((r) => r.category === activeCategory),
          },
        ];

  const handleTabSelect = (index) => {
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
    if (base) navigate(toRulePage(base));
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

      <Box paddingBlockEnd="600">
        {/* Existing rules table */}
        <RulesTable
          rules={rules}
          onEdit={handleEdit}
          onDelete={setDeleteTarget}
        />

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
                <PreviewPanel ruleType={selected} onCreate={handleCreate} />
              )}
            </div>
          </div>
        </Box>
      </Box>
    </Page>
  );
}
