import { useState, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams, useSubmit, useActionData, useLoaderData, useNavigation } from "react-router";
import {
  Page,
  Text,
  Box,
  BlockStack,
  InlineStack,
  Button,
  TextField,
  Select,
  Checkbox,
  Popover,
  ActionList,
  Collapsible,
  Divider,
  Icon,
  Banner,
  RadioButton,
  Badge,
  Tag,
} from "@shopify/polaris";
import {
  GiftCardIcon,
  DiscountIcon,
  DeliveryIcon,
  CalendarIcon,
  ClockIcon,
  PersonFilledIcon,
  InfoIcon,
  PauseCircleIcon,
  SearchIcon,
  DeleteIcon,
  MinimizeIcon,
  MaximizeIcon,
  CartIcon,
  CollectionIcon,
  ProductIcon,
  SettingsIcon,
  EditIcon,
  PackageIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  let record = null;
  if (id) {
    record = await prisma.campaignBuyXGetY.findFirst({ where: { uid: parseInt(id), shop: session.shop } });
  }
  return { record };
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const body = await request.json();
  const { id, ...fields } = body;
  try {
    // Build Shopify BXGY discount
    const startsAtIso = fields.startsAt || new Date().toISOString();
    const bxgyInput = {
      title: fields.name,
      startsAt: startsAtIso,
      endsAt: fields.endsAt || null,
      customerBuys: {
        items: { all: true },
        value: fields.minReqType === "spend"
          ? { subtotalAmount: { amount: fields.minSpend || "0", currencyCode: "USD" } }
          : { quantity: { quantity: parseInt(fields.minQty || "1") } },
      },
      customerGets: {
        items: { all: true },
        value: {
          discountOnQuantity: {
            quantity: parseInt(fields.rewardQty || "1"),
            effect: fields.rewardType === "free_product"
              ? { percentage: 1.0 }
              : { percentage: parseFloat(fields.rewardDiscount || "0") / 100 },
          },
        },
      },
    };

    let shopifyDiscountId = fields.shopifyDiscountId || null;
    if (id && shopifyDiscountId) {
      // Update existing discount
      const res = await admin.graphql(
        `#graphql
        mutation discountAutomaticBxgyUpdate($id: ID!, $input: DiscountAutomaticBxgyInput!) {
          discountAutomaticBxgyUpdate(id: $id, bxgyAutomaticDiscount: $input) {
            automaticDiscountNode { id }
            userErrors { field message }
          }
        }`,
        { variables: { id: shopifyDiscountId, input: bxgyInput } }
      );
      const resJson = await res.json();
      shopifyDiscountId = resJson?.data?.discountAutomaticBxgyUpdate?.automaticDiscountNode?.id || shopifyDiscountId;
    } else {
      // Create new discount
      const res = await admin.graphql(
        `#graphql
        mutation discountAutomaticBxgyCreate($input: DiscountAutomaticBxgyInput!) {
          discountAutomaticBxgyCreate(bxgyAutomaticDiscount: $input) {
            automaticDiscountNode { id }
            userErrors { field message }
          }
        }`,
        { variables: { input: bxgyInput } }
      );
      const resJson = await res.json();
      shopifyDiscountId = resJson?.data?.discountAutomaticBxgyCreate?.automaticDiscountNode?.id || null;
    }
    fields.shopifyDiscountId = shopifyDiscountId;

    let record;
    if (id) {
      record = await prisma.campaignBuyXGetY.update({ where: { uid: parseInt(id), shop }, data: fields });
    } else {
      record = await prisma.campaignBuyXGetY.create({ data: { shop, ...fields } });
    }
    return { success: true, id: record.uid };
  } catch (err) {
    return { error: err.message };
  }
};

// ─── Shared: Collapsible section card ────────────────────────────────────────
function SectionCard({ icon, title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e1e3e5",
        borderRadius: "12px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 18px",
          borderBottom: open ? "1px solid #e1e3e5" : "none",
        }}
      >
        <InlineStack gap="200" align="center" blockAlign="center">
          <Icon source={icon} />
          <Text variant="headingSm" as="h3" fontWeight="semibold">
            {title}
          </Text>
        </InlineStack>
        <Button
          variant="plain"
          icon={open ? MinimizeIcon : MaximizeIcon}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Collapse" : "Expand"}
        </Button>
      </div>
      <Collapsible open={open} id={`section-${title}`}>
        <Box padding="400">{children}</Box>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            padding: "8px 18px 12px",
          }}
        >
          <Button variant="plain" icon={MinimizeIcon} onClick={() => setOpen(false)}>
            Collapse
          </Button>
        </div>
      </Collapsible>
    </div>
  );
}

// ─── Shared: Pill toggle ──────────────────────────────────────────────────────
function PillToggle({ options, value, onChange, fullWidth = false }) {
  return (
    <div
      style={{
        display: fullWidth ? "flex" : "inline-flex",
        background: "#f1f1f1",
        borderRadius: "8px",
        padding: "3px",
        gap: "2px",
      }}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            flex: fullWidth ? 1 : undefined,
            padding: "6px 14px",
            borderRadius: "6px",
            border: "none",
            cursor: "pointer",
            fontWeight: value === opt.value ? "600" : "400",
            fontSize: "13px",
            background: value === opt.value ? "#fff" : "transparent",
            boxShadow: value === opt.value ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
            color: value === opt.value ? "#1a1a1a" : "#6d7175",
            transition: "all 0.12s",
            textAlign: "center",
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── Shared: Search + tag list ────────────────────────────────────────────────
function SearchTagField({ label, placeholder, helpText, tags, onAdd, onRemove }) {
  const [query, setQuery] = useState("");

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && query.trim()) {
      onAdd(query.trim());
      setQuery("");
    }
  };

  return (
    <BlockStack gap="200">
      <TextField
        label={label}
        value={query}
        onChange={setQuery}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        prefix={<Icon source={SearchIcon} />}
        placeholder={placeholder}
        helpText={helpText}
        connectedRight={
          <Button
            onClick={() => {
              if (query.trim()) {
                onAdd(query.trim());
                setQuery("");
              }
            }}
          >
            Add
          </Button>
        }
      />
      {tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {tags.map((t) => (
            <Tag key={t} onRemove={() => onRemove(t)}>
              {t}
            </Tag>
          ))}
        </div>
      )}
    </BlockStack>
  );
}

// ─── BUY X — Trigger section ─────────────────────────────────────────────────
function BuyXSection() {
  const [triggerType, setTriggerType] = useState("specific_products");
  const [minRequirement, setMinRequirement] = useState("quantity");
  const [minQty, setMinQty] = useState("1");
  const [minSpend, setMinSpend] = useState("");
  const [products, setProducts] = useState([]);
  const [collections, setCollections] = useState([]);

  return (
    <BlockStack gap="400">
      {/* What must the customer buy */}
      <BlockStack gap="200">
        <Text variant="bodyMd" fontWeight="semibold" as="p">
          Customer must buy
        </Text>
        <Text variant="bodySm" tone="subdued" as="p">
          Choose which products or collections trigger this offer.
        </Text>
        <BlockStack gap="100">
          <RadioButton
            label="Specific products"
            helpText="Select individual products that qualify"
            checked={triggerType === "specific_products"}
            id="trigger-products"
            name="triggerType"
            onChange={() => setTriggerType("specific_products")}
          />
          <RadioButton
            label="Specific collections"
            helpText="Any product from selected collections qualifies"
            checked={triggerType === "collections"}
            id="trigger-collections"
            name="triggerType"
            onChange={() => setTriggerType("collections")}
          />
          <RadioButton
            label="Any product"
            helpText="Any item added to the cart will count"
            checked={triggerType === "any"}
            id="trigger-any"
            name="triggerType"
            onChange={() => setTriggerType("any")}
          />
        </BlockStack>
      </BlockStack>

      {triggerType === "specific_products" && (
        <SearchTagField
          label="Search products"
          placeholder="Search by product name or SKU…"
          helpText="Press Enter or click Add to include a product"
          tags={products}
          onAdd={(v) => setProducts((p) => [...new Set([...p, v])])}
          onRemove={(v) => setProducts((p) => p.filter((x) => x !== v))}
        />
      )}

      {triggerType === "collections" && (
        <SearchTagField
          label="Search collections"
          placeholder="Search by collection name…"
          helpText="Press Enter or click Add to include a collection"
          tags={collections}
          onAdd={(v) => setCollections((p) => [...new Set([...p, v])])}
          onRemove={(v) => setCollections((p) => p.filter((x) => x !== v))}
        />
      )}

      <Divider />

      {/* Minimum requirement */}
      <BlockStack gap="200">
        <Text variant="bodyMd" fontWeight="semibold" as="p">
          Minimum requirement
        </Text>
        <PillToggle
          fullWidth
          options={[
            { label: "Minimum quantity", value: "quantity" },
            { label: "Minimum spend", value: "spend" },
            { label: "Both", value: "both" },
          ]}
          value={minRequirement}
          onChange={setMinRequirement}
        />

        {(minRequirement === "quantity" || minRequirement === "both") && (
          <TextField
            label="Minimum quantity"
            type="number"
            value={minQty}
            onChange={setMinQty}
            autoComplete="off"
            suffix="items"
            min="1"
            helpText="Customer must add at least this many qualifying items"
          />
        )}

        {(minRequirement === "spend" || minRequirement === "both") && (
          <TextField
            label="Minimum spend"
            type="number"
            value={minSpend}
            onChange={setMinSpend}
            autoComplete="off"
            prefix="$"
            helpText="Customer must spend at least this amount on qualifying items"
          />
        )}
      </BlockStack>
    </BlockStack>
  );
}

// ─── GET Y — Reward section ───────────────────────────────────────────────────
function GetYSection() {
  const [rewardType, setRewardType] = useState("free_product");
  const [rewardProduct, setRewardProduct] = useState("specific");
  const [productSearch, setProductSearch] = useState("");
  const [rewardQty, setRewardQty] = useState("1");
  const [maxUsesPerOrder, setMaxUsesPerOrder] = useState("1");
  const [hasMaxUses, setHasMaxUses] = useState(false);

  // Discount-specific
  const [discountType, setDiscountType] = useState("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [discountProducts, setDiscountProducts] = useState([]);
  const [discountTarget, setDiscountTarget] = useState("specific");

  // Shopify code
  const [shopifyCode, setShopifyCode] = useState("");

  return (
    <BlockStack gap="400">
      {/* Reward type */}
      <BlockStack gap="200">
        <Text variant="bodyMd" fontWeight="semibold" as="p">
          Customer gets
        </Text>
        <Text variant="bodySm" tone="subdued" as="p">
          Choose the type of reward the customer receives.
        </Text>
        <BlockStack gap="100">
          <RadioButton
            label="Free product (100% off)"
            helpText="A specific product is gifted at no charge"
            checked={rewardType === "free_product"}
            id="reward-free"
            name="rewardType"
            onChange={() => setRewardType("free_product")}
          />
          <RadioButton
            label="Percentage discount on a product"
            helpText="Apply X% off to a qualifying product"
            checked={rewardType === "percentage"}
            id="reward-percent"
            name="rewardType"
            onChange={() => setRewardType("percentage")}
          />
          <RadioButton
            label="Fixed amount off a product"
            helpText="Apply a fixed dollar amount off a qualifying product"
            checked={rewardType === "fixed"}
            id="reward-fixed"
            name="rewardType"
            onChange={() => setRewardType("fixed")}
          />
        </BlockStack>
      </BlockStack>

      <Divider />

      {/* Free product fields */}
      {rewardType === "free_product" && (
        <BlockStack gap="300">
          <Text variant="bodyMd" fontWeight="semibold" as="p">
            Which product is the gift?
          </Text>
          <BlockStack gap="100">
            <RadioButton
              label="Specific product"
              checked={rewardProduct === "specific"}
              id="rp-specific"
              name="rewardProduct"
              onChange={() => setRewardProduct("specific")}
            />
            <RadioButton
              label="Same product the customer bought (buy N get 1 free)"
              checked={rewardProduct === "same"}
              id="rp-same"
              name="rewardProduct"
              onChange={() => setRewardProduct("same")}
            />
            <RadioButton
              label="Cheapest eligible item in cart"
              checked={rewardProduct === "cheapest"}
              id="rp-cheapest"
              name="rewardProduct"
              onChange={() => setRewardProduct("cheapest")}
            />
          </BlockStack>

          {rewardProduct === "specific" && (
            <BlockStack gap="200">
              <TextField
                label="Search gift product"
                value={productSearch}
                onChange={setProductSearch}
                autoComplete="off"
                prefix={<Icon source={SearchIcon} />}
                placeholder="Search by product name or SKU…"
              />
              {productSearch && (
                <div
                  style={{
                    border: "1px solid #e1e3e5",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    background: "#f6f6f7",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "6px",
                      background: "#e1e3e5",
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <Text variant="bodyMd" fontWeight="semibold" as="p">
                      {productSearch}
                    </Text>
                    <Text variant="bodySm" tone="subdued" as="p">
                      Variant: Default
                    </Text>
                  </div>
                  <Button
                    variant="plain"
                    tone="critical"
                    icon={DeleteIcon}
                    onClick={() => setProductSearch("")}
                  />
                </div>
              )}
            </BlockStack>
          )}

          <div style={{ maxWidth: "140px" }}>
            <TextField
              label="Gift quantity"
              type="number"
              value={rewardQty}
              onChange={setRewardQty}
              autoComplete="off"
              min="1"
              suffix="item(s)"
            />
          </div>
        </BlockStack>
      )}

      {/* Percentage / fixed discount fields */}
      {(rewardType === "percentage" || rewardType === "fixed") && (
        <BlockStack gap="300">
          <TextField
            label={rewardType === "percentage" ? "Discount percentage" : "Discount amount"}
            type="number"
            value={discountValue}
            onChange={setDiscountValue}
            autoComplete="off"
            prefix={rewardType === "fixed" ? "$" : undefined}
            suffix={rewardType === "percentage" ? "%" : undefined}
            placeholder={rewardType === "percentage" ? "e.g. 20" : "e.g. 10"}
            helpText={
              rewardType === "percentage"
                ? "Percentage off the qualifying product's price"
                : "Fixed dollar amount off the qualifying product's price"
            }
          />

          <Text variant="bodyMd" fontWeight="semibold" as="p">
            Discount applies to
          </Text>
          <BlockStack gap="100">
            <RadioButton
              label="Specific product"
              helpText="Apply the discount to a selected product"
              checked={discountTarget === "specific"}
              id="dt-specific"
              name="discountTarget"
              onChange={() => setDiscountTarget("specific")}
            />
            <RadioButton
              label="Same product the customer bought"
              helpText="Discount applied to the trigger product itself"
              checked={discountTarget === "same"}
              id="dt-same"
              name="discountTarget"
              onChange={() => setDiscountTarget("same")}
            />
            <RadioButton
              label="Cheapest eligible item in cart"
              helpText="Discount applied to the lowest-priced qualifying item"
              checked={discountTarget === "cheapest"}
              id="dt-cheapest"
              name="discountTarget"
              onChange={() => setDiscountTarget("cheapest")}
            />
          </BlockStack>

          {discountTarget === "specific" && (
            <SearchTagField
              label="Search products"
              placeholder="Search by product name or SKU…"
              helpText="Press Enter or click Add to include a product"
              tags={discountProducts}
              onAdd={(v) => setDiscountProducts((p) => [...new Set([...p, v])])}
              onRemove={(v) => setDiscountProducts((p) => p.filter((x) => x !== v))}
            />
          )}

          <div style={{ maxWidth: "140px" }}>
            <TextField
              label="Quantity to discount"
              type="number"
              value={rewardQty}
              onChange={setRewardQty}
              autoComplete="off"
              min="1"
              suffix="item(s)"
            />
          </div>

          <TextField
            label="Shopify discount code"
            value={shopifyCode}
            onChange={setShopifyCode}
            autoComplete="off"
            placeholder="e.g. BXGY20"
            helpText="Link an existing Shopify discount code. Required for discounts to apply at checkout."
          />
        </BlockStack>
      )}

      <Divider />

      {/* Usage limits */}
      <BlockStack gap="200">
        <Text variant="bodyMd" fontWeight="semibold" as="p">
          Usage limits per order
        </Text>
        <Checkbox
          label="Limit the number of times this reward can be applied per order"
          checked={hasMaxUses}
          onChange={setHasMaxUses}
          helpText="Useful for preventing customers from stacking the same reward multiple times."
        />
        {hasMaxUses && (
          <div style={{ maxWidth: "160px" }}>
            <TextField
              label="Maximum uses per order"
              type="number"
              value={maxUsesPerOrder}
              onChange={setMaxUsesPerOrder}
              autoComplete="off"
              min="1"
            />
          </div>
        )}
      </BlockStack>
    </BlockStack>
  );
}

// ─── Settings section ─────────────────────────────────────────────────────────
function SettingsSection() {
  const today = new Date().toISOString().split("T")[0];
  const nowTime = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const [startDate, setStartDate] = useState(today);
  const [startTime, setStartTime] = useState(nowTime);
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("23:59");
  const [stackable, setStackable] = useState(false);
  const [usageLimit, setUsageLimit] = useState("");
  const [hasUsageLimit, setHasUsageLimit] = useState(false);

  return (
    <BlockStack gap="400">
      {/* Active dates */}
      <BlockStack gap="200">
        <Text variant="bodyMd" fontWeight="semibold" as="p">
          Active dates
        </Text>
        <Text variant="bodySm" tone="subdued" as="p">
          Based on your browser timezone
        </Text>
        <div
          style={{
            border: "1px solid #e1e3e5",
            borderRadius: "8px",
            padding: "16px",
          }}
        >
          <BlockStack gap="300">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <TextField
                label="Start date"
                type="date"
                value={startDate}
                onChange={setStartDate}
                prefix={<Icon source={CalendarIcon} />}
                autoComplete="off"
              />
              <TextField
                label="Start time"
                type="time"
                value={startTime}
                onChange={setStartTime}
                prefix={<Icon source={ClockIcon} />}
                autoComplete="off"
              />
            </div>
            <Checkbox
              label="Set end date"
              checked={hasEndDate}
              onChange={setHasEndDate}
            />
            {hasEndDate && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <TextField
                  label="End date"
                  type="date"
                  value={endDate}
                  onChange={setEndDate}
                  prefix={<Icon source={CalendarIcon} />}
                  autoComplete="off"
                />
                <TextField
                  label="End time"
                  type="time"
                  value={endTime}
                  onChange={setEndTime}
                  prefix={<Icon source={ClockIcon} />}
                  autoComplete="off"
                />
              </div>
            )}
          </BlockStack>
        </div>
      </BlockStack>

      <Divider />

      {/* Campaign usage limits */}
      <BlockStack gap="200">
        <Text variant="bodyMd" fontWeight="semibold" as="p">
          Total campaign usage limit
        </Text>
        <Checkbox
          label="Limit the total number of times this campaign can be redeemed"
          checked={hasUsageLimit}
          onChange={setHasUsageLimit}
          helpText="Useful for limited-time or limited-stock promotions."
        />
        {hasUsageLimit && (
          <TextField
            label="Maximum redemptions"
            type="number"
            value={usageLimit}
            onChange={setUsageLimit}
            autoComplete="off"
            placeholder="e.g. 500"
            helpText="Campaign will automatically deactivate after this many uses."
          />
        )}
      </BlockStack>

      <Divider />

      {/* Stacking */}
      <BlockStack gap="200">
        <Text variant="bodyMd" fontWeight="semibold" as="p">
          Discount stacking
        </Text>
        <Checkbox
          label="Allow this campaign to stack with other active discounts"
          checked={stackable}
          onChange={setStackable}
          helpText="When enabled, this reward combines with other discounts the customer may have."
        />
      </BlockStack>

      <Divider />

      {/* Audience */}
      <BlockStack gap="200">
        <Text variant="bodyMd" fontWeight="semibold" as="p">
          Target an audience
        </Text>
        <div
          style={{
            border: "1px solid #e1e3e5",
            borderRadius: "8px",
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "#ede9fe",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              color: "#7c3aed",
            }}
          >
            <Icon source={PersonFilledIcon} />
          </div>
          <div style={{ flex: 1 }}>
            <Text variant="bodyMd" fontWeight="semibold" as="p">
              Targeting everyone
            </Text>
            <Text variant="bodySm" tone="subdued" as="p">
              This campaign is visible to all customers. Add a rule to target a specific group.
            </Text>
          </div>
          <Button size="slim">Add rule</Button>
        </div>
      </BlockStack>
    </BlockStack>
  );
}

// ─── Preview sidebar card ─────────────────────────────────────────────────────
function PreviewCard({ triggerType, rewardType }) {
  const rewardLabel =
    rewardType === "free_product"
      ? "Free gift"
      : rewardType === "percentage"
      ? "% off"
      : "$ off";

  const triggerLabel =
    triggerType === "specific_products"
      ? "specific products"
      : triggerType === "collections"
      ? "a collection"
      : "any product";

  return (
    <div
      style={{
        border: "1px solid #e1e3e5",
        borderRadius: "10px",
        overflow: "hidden",
        background: "#fff",
      }}
    >
      <Box padding="300" borderBlockEndWidth="025" borderColor="border">
        <Text variant="bodyMd" fontWeight="semibold" as="p">
          Preview
        </Text>
      </Box>
      <Box padding="300">
        <BlockStack gap="300">
          {/* Cart mock */}
          <div
            style={{
              border: "1px solid #e1e3e5",
              borderRadius: "8px",
              overflow: "hidden",
              fontSize: "13px",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "10px 14px",
                background: "#f6f6f7",
                borderBottom: "1px solid #e1e3e5",
              }}
            >
              <Text variant="bodySm" fontWeight="semibold" as="p">
                Your cart
              </Text>
            </div>

            {/* Product row */}
            <div
              style={{
                padding: "10px 14px",
                display: "flex",
                gap: "10px",
                alignItems: "center",
                borderBottom: "1px solid #e1e3e5",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "6px",
                  background: "#e1e3e5",
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1 }}>
                <Text variant="bodySm" fontWeight="semibold" as="p">
                  Product from {triggerLabel}
                </Text>
                <Text variant="bodySm" tone="subdued" as="p">
                  Qty: 1
                </Text>
              </div>
              <Text variant="bodySm" as="p">$50.00</Text>
            </div>

            {/* Reward row */}
            <div
              style={{
                padding: "10px 14px",
                display: "flex",
                gap: "10px",
                alignItems: "center",
                background: "#f0fdf4",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "6px",
                  background: "#bbf7d0",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#16a34a",
                }}
              >
                <Icon source={GiftCardIcon} />
              </div>
              <div style={{ flex: 1 }}>
                <Text variant="bodySm" fontWeight="semibold" as="p">
                  {rewardLabel}
                </Text>
                <Badge tone="success" size="small">
                  Applied
                </Badge>
              </div>
              <Text variant="bodySm" tone="success" as="p" fontWeight="semibold">
                FREE
              </Text>
            </div>
          </div>

          <Text variant="bodySm" tone="subdued" as="p">
            This is a preview of how the reward appears in the cart when the condition is met.
          </Text>
        </BlockStack>
      </Box>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function BuyXGetYCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const host = searchParams.get("host");
  const withHost = (path) => host ? `${path}?host=${encodeURIComponent(host)}` : path;

  const loaderData = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const submit = useSubmit();
  const recordId = loaderData?.record?.uid || null;
  const r = loaderData?.record;

  const [status, setStatus] = useState(r?.status ?? "draft");
  const [campaignName, setCampaignName] = useState(r?.name ?? "Buy X Get Y");
  const isSaving = navigation.state === "submitting";

  // Lifted for preview
  const [triggerType, setTriggerType] = useState(r?.buyTriggerType ?? "specific_products");
  const [rewardType, setRewardType] = useState(r?.rewardType ?? "free_product");

  // Fields for handleSave (mirror sub-component state for DB persistence)
  const [buyProducts, setBuyProducts] = useState(JSON.parse(r?.buyProducts || "[]"));
  const [buyCollections, setBuyCollections] = useState(JSON.parse(r?.buyCollections || "[]"));
  const [minReqType, setMinReqType] = useState(r?.minReqType ?? "quantity");
  const [minQty, setMinQty] = useState(r?.minQty ?? "1");
  const [minSpend, setMinSpend] = useState(r?.minSpend ?? "");
  const [rewardProducts, setRewardProducts] = useState(JSON.parse(r?.rewardProducts || "[]"));
  const [rewardQty, setRewardQty] = useState(r?.rewardQty ?? "1");
  const [rewardDiscount, setRewardDiscount] = useState(r?.rewardDiscount ?? "");
  const [shopifyCode, setShopifyCode] = useState(r?.shopifyCode ?? "");
  const [usageLimit, setUsageLimit] = useState(r?.usageLimit ?? "");
  const [startDate, setStartDate] = useState(r?.startsAt ? new Date(r.startsAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState(r?.startsAt ? new Date(r.startsAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) : new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }));
  const [hasEndDate, setHasEndDate] = useState(!!r?.endsAt);
  const [endDate, setEndDate] = useState(r?.endsAt ? new Date(r.endsAt).toISOString().split("T")[0] : "");
  const [endTime, setEndTime] = useState(r?.endsAt ? new Date(r.endsAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) : "23:59");

  useEffect(() => {
    if (actionData?.success && navigation.state === "idle") {
      navigate(withHost("/app/campaigns"));
    }
  }, [actionData, navigation.state]);

  const handleSave = () => {
    submit(
      {
        id: recordId,
        name: campaignName,
        status,
        buyTriggerType: triggerType,
        buyProducts: JSON.stringify(buyProducts),
        buyCollections: JSON.stringify(buyCollections),
        minReqType,
        minQty,
        minSpend,
        rewardType,
        rewardProducts: JSON.stringify(rewardProducts),
        rewardQty,
        rewardDiscount,
        shopifyCode,
        usageLimit,
        shopifyDiscountId: loaderData?.record?.shopifyDiscountId || null,
        startsAt: startDate ? new Date(`${startDate}T${startTime}`).toISOString() : null,
        endsAt: hasEndDate && endDate ? new Date(`${endDate}T${endTime}`).toISOString() : null,
      },
      { method: "post", encType: "application/json" }
    );
  };

  const isPaused = status !== "active";

  return (
    <Page
      backAction={{
        content: "Campaigns",
        onAction: () => navigate(withHost("/app/campaigns")),
      }}
      title={campaignName || "New Buy X Get Y"}
      primaryAction={{
        content: "Save",
        loading: isSaving,
        onAction: handleSave,
      }}
      secondaryActions={[
        {
          content: status === "active" ? "Pause" : "Activate",
          onAction: () =>
            setStatus((s) => (s === "active" ? "draft" : "active")),
        },
      ]}
    >
      <style>{`
        .bxgy-layout {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 20px;
          align-items: start;
        }
        @media (max-width: 900px) {
          .bxgy-layout { grid-template-columns: 1fr; }
        }
      `}</style>

      <Box paddingBlockEnd="800">
        <div className="bxgy-layout">

          {/* ── Left column ──────────────────────────────────────────────── */}
          <BlockStack gap="400">

            {/* Step badge */}
            <div style={{ display: "flex", gap: "10px", alignItems: "stretch" }}>
              {/* Buy X card */}
              <div style={{ flex: 1, background: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: "10px", padding: "12px 16px" }}>
                <InlineStack gap="200" blockAlign="center">
                  <div
                    style={{
                      width: "24px", height: "24px", borderRadius: "50%",
                      background: "#2563eb", color: "#fff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "13px", fontWeight: "700", flexShrink: 0,
                    }}
                  >
                    X
                  </div>
                  <Text variant="bodyMd" fontWeight="semibold" as="p">
                    Customer buys X
                  </Text>
                </InlineStack>
                <Box paddingBlockStart="100">
                  <Text variant="bodySm" tone="subdued" as="p">
                    Define the trigger: what the customer must add to cart.
                  </Text>
                </Box>
              </div>

              <div style={{ display: "flex", alignItems: "center", padding: "0 4px" }}>
                <Text variant="headingLg" tone="subdued" as="p">→</Text>
              </div>

              {/* Get Y card */}
              <div style={{ flex: 1, background: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: "10px", padding: "12px 16px" }}>
                <InlineStack gap="200" blockAlign="center">
                  <div
                    style={{
                      width: "24px", height: "24px", borderRadius: "50%",
                      background: "#16a34a", color: "#fff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "13px", fontWeight: "700", flexShrink: 0,
                    }}
                  >
                    Y
                  </div>
                  <Text variant="bodyMd" fontWeight="semibold" as="p">
                    Customer gets Y
                  </Text>
                </InlineStack>
                <Box paddingBlockStart="100">
                  <Text variant="bodySm" tone="subdued" as="p">
                    Define the reward: what the customer receives.
                  </Text>
                </Box>
              </div>
            </div>

            {/* Buy X section */}
            <SectionCard icon={CartIcon} title="Buy X — Trigger">
              <BuyXSection />
            </SectionCard>

            {/* Get Y section */}
            <SectionCard icon={GiftCardIcon} title="Get Y — Reward">
              <GetYSection />
            </SectionCard>

            {/* Settings */}
            <SectionCard icon={SettingsIcon} title="Settings">
              <SettingsSection />
            </SectionCard>

          </BlockStack>

          {/* ── Right sidebar ────────────────────────────────────────────── */}
          <BlockStack gap="300">

            {/* Paused banner */}
            {isPaused && (
              <div
                style={{
                  background: "#fef3c7",
                  border: "1px solid #fcd34d",
                  borderRadius: "10px",
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <span style={{ color: "#92400e" }}>
                  <Icon source={PauseCircleIcon} />
                </span>
                <Text variant="bodyMd" fontWeight="semibold" as="p">
                  This campaign is paused
                </Text>
              </div>
            )}

            {/* Status + name */}
            <div
              style={{
                background: "#fff",
                border: "1px solid #e1e3e5",
                borderRadius: "10px",
                padding: "16px",
              }}
            >
              <BlockStack gap="300">
                <Select
                  label="Status"
                  options={[
                    { label: "Draft", value: "draft" },
                    { label: "Active", value: "active" },
                    { label: "Paused", value: "paused" },
                  ]}
                  value={status}
                  onChange={setStatus}
                />
                <TextField
                  label="Campaign name"
                  value={campaignName}
                  onChange={setCampaignName}
                  autoComplete="off"
                />
              </BlockStack>
            </div>

            {/* Info banner */}
            <Banner tone="info">
              <Text variant="bodySm" as="p">
                For <strong>percentage</strong> and <strong>fixed amount</strong> discounts to
                apply at checkout, link a Shopify discount code inside the reward settings.
              </Text>
            </Banner>

            {/* Preview */}
            <PreviewCard triggerType={triggerType} rewardType={rewardType} />

          </BlockStack>
        </div>
      </Box>
    </Page>
  );
}
