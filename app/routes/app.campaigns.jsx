import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Page,
  Tabs,
  Text,
  Box,
  BlockStack,
  InlineStack,
  Button,
  Divider,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return {};
};

export const boundary = {
  loader: true,
};

// /images/campaigns/ prefix — served from public/
const ICO = (name) => `/images/campaigns/${name}`;

const CAMPAIGN_TYPES = [
  {
    id: "cart-goals",
    category: "offers",
    title: "Cart goals",
    subtitle: "Give rewards based on cart value.",
    icon: ICO("campaign-ico-cart-goal.svg"),
    preview: {
      title: "Cart goals",
      description:
        "Offer free gifts, order discounts or free shipping when cart value reaches one (or more) milestones shown on a progress bar.",
      banner: ICO("campaign-banner-cart-goal.svg"),
      bannerBg: "#fff0f0",
      aovBoost: "Upto 6%",
      setupTime: "5-10 mins",
      usecases: [
        "Offer free shipping when cart value reaches a specific target. This can be used to increase the average order value.",
        "Reward customers with a free product when cart value reaches a specific target.",
        "Offer a discount on the whole cart when cart value reaches a specific target.",
      ],
    },
  },
  {
    id: "buy-x-get-y",
    category: "offers",
    title: "Buy X get Y",
    subtitle: "Offer gifts with specific products",
    icon: ICO("campaign-ico-bxgy.svg"),
    preview: {
      title: "Buy X get Y",
      description:
        "Offer a free gift product when customers buy a specific product or reach a quantity threshold.",
      banner: ICO("campaign-ico-bxgy.svg"),
      bannerBg: "#eef3ff",
      aovBoost: "Upto 8%",
      setupTime: "5-10 mins",
      usecases: [
        "Offer a free gift when a specific product is added to the cart.",
        "Reward customers who buy 3 or more items with a free gift.",
        "Create bundle offers: buy product A, get product B free.",
      ],
    },
  },
  {
    id: "one-click-upsell",
    category: "offers",
    title: "One click upsell",
    subtitle: "Upsell using a one-click checkbox",
    icon: ICO("campaign-ico-one-click.svg"),
    preview: {
      title: "One click upsell",
      description:
        "Show a checkbox in the cart that lets customers add an upsell product with a single click.",
      banner: ICO("campaign-ico-one-click.svg"),
      bannerBg: "#f0fdf4",
      aovBoost: "Upto 10%",
      setupTime: "3-5 mins",
      usecases: [
        "Add a warranty or protection plan as a one-click upsell.",
        "Offer a complementary product as an add-on.",
        "Suggest a popular accessory with a single click.",
      ],
    },
  },
  {
    id: "discount-code",
    category: "offers",
    title: "Discount code",
    subtitle: "Showcase discount coupons in cart",
    icon: ICO("campaign-ico-discount.svg"),
    preview: {
      title: "Discount code",
      description:
        "Display a discount code banner in the cart to encourage customers to apply it for a discount.",
      banner: ICO("campaign-ico-discount.svg"),
      bannerBg: "#fff7ed",
      aovBoost: "Upto 4%",
      setupTime: "1-2 mins",
      usecases: [
        "Display a discount code prominently in the cart.",
        "Show a percentage off for orders over a certain amount.",
        "Promote seasonal or event-based discount codes.",
      ],
    },
  },
  {
    id: "volume-discount",
    category: "offers",
    title: "Volume discount",
    subtitle: "Create volume discounts or offers for tiered quantity breaks",
    icon: ICO("campaign-ico-volume.svg"),
    preview: {
      title: "Volume discount",
      description:
        "Offer tiered discounts based on the quantity of products added to the cart.",
      banner: ICO("campaign-ico-volume.svg"),
      bannerBg: "#f0f9ff",
      aovBoost: "Upto 12%",
      setupTime: "5-8 mins",
      usecases: [
        "Buy 2 get 10% off, buy 3 get 15% off.",
        "Offer bulk purchase discounts for wholesale customers.",
        "Create quantity break pricing for product variants.",
      ],
    },
  },
  {
    id: "cart-announcement-bar",
    category: "messaging",
    title: "Cart announcement bar",
    subtitle: "Show a message in the cart in any language",
    icon: ICO("campaign-ico-announcement.svg"),
    preview: {
      title: "Cart announcement bar",
      description:
        "Show an announcement at the top of the cart. Ideal for info regarding shipping or special offers that are currently running",
      banner: ICO("campaign-banner-announcement.svg"),
      bannerBg: "#fffbeb",
      aovBoost: "Upto 5%",
      setupTime: "1-2 mins",
      usecases: [
        "Feature Discount Codes",
        "Shipping Related Messages",
        "Holiday Sales Messages",
        "Product Warnings",
        "Site wide Discounts",
      ],
    },
  },
  {
    id: "cart-timer",
    category: "messaging",
    title: "Cart timer",
    subtitle: "Create a countdown timer in cart",
    icon: ICO("campaign-ico-timer.svg"),
    preview: {
      title: "Cart timer",
      description:
        "Create urgency with a countdown timer that shows customers how long they have to complete their purchase.",
      banner: ICO("campaign-ico-timer.svg"),
      bannerBg: "#faf5ff",
      aovBoost: "Upto 7%",
      setupTime: "2-3 mins",
      usecases: [
        "Show a limited-time offer countdown in the cart.",
        "Create urgency for flash sales with a timer.",
        "Display a cart expiry countdown to reduce abandonment.",
      ],
    },
  },
  {
    id: "line-item-messaging",
    category: "messaging",
    title: "Line item messaging",
    subtitle: "Show messages on cart line items based on any condition",
    icon: ICO("campaign-ico-item-messaging.svg"),
    preview: {
      title: "Line item messaging",
      description:
        "Show targeted messages next to specific products in the cart based on conditions like quantity, price, or product type.",
      banner: ICO("campaign-ico-item-messaging.svg"),
      bannerBg: "#eff6ff",
      aovBoost: "Upto 3%",
      setupTime: "3-5 mins",
      usecases: [
        "Show a low stock warning next to a product.",
        "Display estimated delivery date for specific items.",
        "Add a personalization message to custom products.",
      ],
    },
  },
  {
    id: "cart-automation",
    category: "cart-rules",
    title: "Cart automation",
    subtitle: "Do actions based on triggers",
    icon: ICO("campaign-ico-automation.svg"),
    preview: {
      title: "Cart automation",
      description:
        "Do X (action) when Y (trigger) happens. Triggers can be item added or order value reached etc. Actions can be adding attributes or redirecting to a URL.",
      banner: ICO("campaign-banner-automation.svg"),
      bannerBg: "#fffbeb",
      aovBoost: "Upto 2%",
      setupTime: "3-4 mins",
      usecases: [
        "Redirect to a URL when a specific product is added to the cart.",
        "Add a cart attribute for orders created by signed in users.",
        "If customer adds a specific product, automatically redirect to a URL which upsells other similar products.",
      ],
    },
  },
];

const TABS = [
  { id: "all", content: "All" },
  { id: "offers", content: "Offers" },
  { id: "messaging", content: "Messaging" },
  { id: "cart-rules", content: "Cart rules" },
];

function CampaignListItem({ campaign, isSelected, onSelect }) {
  return (
    <div
      onClick={() => onSelect(campaign.id)}
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
        src={campaign.icon}
        alt={campaign.title}
        width={40}
        height={40}
        style={{ flexShrink: 0, borderRadius: "8px", objectFit: "contain" }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text variant="bodyMd" fontWeight="semibold" as="p">
          {campaign.title}
        </Text>
        <Text variant="bodySm" tone="subdued" as="p">
          {campaign.subtitle}
        </Text>
      </div>
    </div>
  );
}

function PreviewPanel({ campaign, onCreate }) {
  const isBanner =
    campaign.preview.banner.includes("campaign-banner-");

  return (
    <div
      style={{
        backgroundColor: campaign.preview.bannerBg,
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
          src={campaign.preview.banner}
          alt={campaign.preview.title}
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
          {campaign.preview.title}
        </Text>
        <Text variant="bodySm" tone="subdued" as="p">
          {campaign.preview.description}
        </Text>

        <Button
          variant="primary"
          size="large"
          fullWidth
          onClick={onCreate}
        >
          Create this campaign
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
            { value: campaign.preview.aovBoost, label: "Potential AOV boost" },
            { value: campaign.preview.setupTime, label: "Time to set up" },
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
              {campaign.preview.usecases.map((usecase, i) => (
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

export default function CampaignSelector() {
  const navigate = useNavigate();
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const [selectedId, setSelectedId] = useState("cart-goals");

  const activeCategory = TABS[selectedTabIndex].id;
  const selected = CAMPAIGN_TYPES.find((c) => c.id === selectedId);

  const groupedCampaigns =
    activeCategory === "all"
      ? [
          {
            label: "Offers",
            items: CAMPAIGN_TYPES.filter((c) => c.category === "offers"),
          },
          {
            label: "Messaging",
            items: CAMPAIGN_TYPES.filter((c) => c.category === "messaging"),
          },
          {
            label: "Cart rules",
            items: CAMPAIGN_TYPES.filter(
              (c) => c.category === "cart-rules"
            ),
          },
        ]
      : [
          {
            label: null,
            items: CAMPAIGN_TYPES.filter(
              (c) => c.category === activeCategory
            ),
          },
        ];

  const handleTabSelect = (index) => {
    setSelectedTabIndex(index);
    const category = TABS[index].id;
    const first =
      category === "all"
        ? CAMPAIGN_TYPES[0]
        : CAMPAIGN_TYPES.find((c) => c.category === category);
    if (first) setSelectedId(first.id);
  };

  const CAMPAIGN_ROUTES = {
    "cart-goals": "/app/cart-goals",
  };

  const handleCreate = () => {
    const route = CAMPAIGN_ROUTES[selectedId] ?? `/app/rules?create=true&type=${selectedId}`;
    navigate(route);
  };

  return (
    <Page
      backAction={{ content: "Back", onAction: () => navigate(-1) }}
      title="Select a campaign type"
    >
      <Box paddingBlockEnd="600">
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
            {/* Left: campaign list */}
            <div
              style={{
                borderRight: "1px solid #e1e3e5",
                padding: "10px 8px",
                overflowY: "auto",
              }}
            >
              <BlockStack gap="0">
                {groupedCampaigns.map((group, gi) => (
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
                      {group.items.map((campaign) => (
                        <CampaignListItem
                          key={campaign.id}
                          campaign={campaign}
                          isSelected={selectedId === campaign.id}
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
              <PreviewPanel campaign={selected} onCreate={handleCreate} />
            )}
          </div>
        </div>
      </Box>
    </Page>
  );
}
