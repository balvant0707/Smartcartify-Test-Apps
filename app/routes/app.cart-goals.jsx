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
  RangeSlider,
  Popover,
  ActionList,
  Collapsible,
  Divider,
  Icon,
  Badge,
  Banner,
  RadioButton,
  Card,
} from "@shopify/polaris";
import {
  TargetIcon,
  EditIcon,
  SettingsIcon,
  MinimizeIcon,
  MaximizeIcon,
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
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { upsertFreeShipping, upsertAutomaticBasic } from "../shopify-discount.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  let record = null;
  if (id) {
    const raw = await prisma.campaign.findFirst({
      where: { id: parseInt(id), shop: session.shop, type: "cart-goals" },
    });
    if (raw) {
      const s = JSON.parse(raw.settings || "{}");
      record = { ...raw, ...s };
    }
  }
  return { record };
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const body = await request.json();
  const { id, name, status, startsAt, endsAt, ...settings } = body;

  let shopifyDiscountId = settings.shopifyDiscountId || null;
  const milestones = JSON.parse(settings.milestones || "[]");
  for (const m of milestones) {
    if (!m.shopifyDiscountId) {
      if (m.rewardType === "free_shipping") {
        m.shopifyDiscountId = await upsertFreeShipping(admin, {
          existingId: null,
          title: `${name || "Cart Goals"} – Free Shipping`,
          startsAt,
          endsAt,
          minSubtotal: m.targetValue,
        }).catch(() => null);
      } else if (m.rewardType === "order_discount") {
        m.shopifyDiscountId = await upsertAutomaticBasic(admin, {
          existingId: null,
          title: `${name || "Cart Goals"} – ${m.discountValue}${m.discountType === "percentage" ? "%" : "$"} Off`,
          startsAt,
          endsAt,
          minSubtotal: m.targetValue,
          isPercentage: m.discountType === "percentage",
          discountValue: m.discountValue,
        }).catch(() => null);
      }
    }
  }
  settings.milestones = JSON.stringify(milestones);
  shopifyDiscountId = milestones.find(m => m.shopifyDiscountId)?.shopifyDiscountId || null;
  settings.shopifyDiscountId = shopifyDiscountId;

  const dbData = {
    shop,
    type: "cart-goals",
    name: name || "Cart Goals",
    status: status || "draft",
    settings: JSON.stringify(settings),
    shopifyDiscountId: settings.shopifyDiscountId || null,
    shopifyDiscountCode: settings.shopifyDiscountCode || null,
    startsAt: startsAt ? new Date(startsAt) : null,
    endsAt: endsAt ? new Date(endsAt) : null,
  };

  try {
    let record;
    if (id) {
      record = await prisma.campaign.update({ where: { id: parseInt(id), shop }, data: dbData });
    } else {
      record = await prisma.campaign.create({ data: dbData });
    }
    return { success: true, id: record.id };
  } catch (err) {
    return { error: err.message };
  }
};

// ─── Collapsible section card ─────────────────────────────────────────────────
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

// ─── Pill toggle ─────────────────────────────────────────────────────────────
function PillToggle({ options, value, onChange }) {
  return (
    <div
      style={{
        display: "inline-flex",
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
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── Reward type definitions ──────────────────────────────────────────────────
const REWARD_TYPES = [
  { label: "Free product", icon: GiftCardIcon, value: "free_product" },
  { label: "Order discount", icon: DiscountIcon, value: "order_discount" },
  { label: "Free shipping", icon: DeliveryIcon, value: "free_shipping" },
];

// ─── Add goal dropdown ────────────────────────────────────────────────────────
function AddGoalDropdown({ onSelect }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);

  return (
    <Popover
      active={open}
      activator={
        <button
          onClick={toggle}
          style={{
            width: "100%",
            padding: "12px",
            border: "1.5px dashed #c9cccf",
            borderRadius: "8px",
            background: "#f6f6f7",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "500",
            color: "#202223",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <span style={{ fontSize: "18px", lineHeight: 1 }}>+</span>
          Add a new goal
        </button>
      }
      onClose={close}
      preferredAlignment="left"
    >
      <ActionList
        items={REWARD_TYPES.map((rt) => ({
          content: rt.label,
          icon: rt.icon,
          onAction: () => {
            onSelect(rt);
            close();
          },
        }))}
      />
    </Popover>
  );
}

// ─── Free Product form ────────────────────────────────────────────────────────
function FreeProductForm({ trackBy }) {
  const [targetValue, setTargetValue] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [productQty, setProductQty] = useState("1");
  const [autoAdd, setAutoAdd] = useState(false);
  const [removeWhenGoalLost, setRemoveWhenGoalLost] = useState(true);

  return (
    <BlockStack gap="400">
      <TextField
        label={
          trackBy === "quantity"
            ? "Quantity target (items)"
            : "Cart value target"
        }
        type="number"
        value={targetValue}
        onChange={setTargetValue}
        autoComplete="off"
        prefix={trackBy === "cart_value" ? "$" : undefined}
        suffix={trackBy === "quantity" ? "items" : undefined}
        placeholder={trackBy === "cart_value" ? "e.g. 50" : "e.g. 3"}
        helpText={
          trackBy === "cart_value"
            ? "Customer must reach this cart value to unlock the reward"
            : "Customer must add this many items to unlock the reward"
        }
      />

      <Divider />

      <BlockStack gap="200">
        <Text variant="bodyMd" fontWeight="semibold" as="p">
          Free product
        </Text>
        <Text variant="bodySm" tone="subdued" as="p">
          Select the product that will be added as a free gift
        </Text>

        <TextField
          label="Search product"
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

        <div style={{ maxWidth: "120px" }}>
          <TextField
            label="Quantity"
            type="number"
            value={productQty}
            onChange={setProductQty}
            autoComplete="off"
            min="1"
          />
        </div>
      </BlockStack>

      <Divider />

      <BlockStack gap="200">
        <Text variant="bodyMd" fontWeight="semibold" as="p">
          Behaviour
        </Text>
        <Checkbox
          label="Auto-add free product to cart when goal is reached"
          checked={autoAdd}
          onChange={setAutoAdd}
          helpText="The product is added automatically; customers can remove it manually."
        />
        <Checkbox
          label="Remove free product if cart drops below the goal"
          checked={removeWhenGoalLost}
          onChange={setRemoveWhenGoalLost}
          helpText="Only applies when auto-add is enabled."
        />
      </BlockStack>
    </BlockStack>
  );
}

// ─── Order Discount form ──────────────────────────────────────────────────────
function OrderDiscountForm({ trackBy }) {
  const [targetValue, setTargetValue] = useState("");
  const [discountType, setDiscountType] = useState("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [applyTo, setApplyTo] = useState("entire_order");
  const [stackable, setStackable] = useState(false);
  const [shopifyDiscountCode, setShopifyDiscountCode] = useState("");

  return (
    <BlockStack gap="400">
      <TextField
        label={
          trackBy === "quantity"
            ? "Quantity target (items)"
            : "Cart value target"
        }
        type="number"
        value={targetValue}
        onChange={setTargetValue}
        autoComplete="off"
        prefix={trackBy === "cart_value" ? "$" : undefined}
        suffix={trackBy === "quantity" ? "items" : undefined}
        placeholder={trackBy === "cart_value" ? "e.g. 75" : "e.g. 5"}
        helpText={
          trackBy === "cart_value"
            ? "Customer must reach this cart value to unlock the discount"
            : "Customer must add this many items to unlock the discount"
        }
      />

      <Divider />

      <BlockStack gap="300">
        <Text variant="bodyMd" fontWeight="semibold" as="p">
          Discount type
        </Text>
        <PillToggle
          options={[
            { label: "Percentage off", value: "percentage" },
            { label: "Fixed amount off", value: "fixed" },
          ]}
          value={discountType}
          onChange={setDiscountType}
        />

        <TextField
          label="Discount value"
          type="number"
          value={discountValue}
          onChange={setDiscountValue}
          autoComplete="off"
          prefix={discountType === "fixed" ? "$" : undefined}
          suffix={discountType === "percentage" ? "%" : undefined}
          placeholder={discountType === "percentage" ? "e.g. 10" : "e.g. 15"}
          helpText={
            discountType === "percentage"
              ? "Percentage off the cart subtotal"
              : "Fixed dollar amount off the cart subtotal"
          }
        />
      </BlockStack>

      <Divider />

      <BlockStack gap="200">
        <Text variant="bodyMd" fontWeight="semibold" as="p">
          Applies to
        </Text>
        <BlockStack gap="100">
          <RadioButton
            label="Entire order"
            helpText="Discount is applied to the full cart subtotal"
            checked={applyTo === "entire_order"}
            id="apply-entire"
            name="applyTo"
            onChange={() => setApplyTo("entire_order")}
          />
          <RadioButton
            label="Specific collections"
            helpText="Discount applies only to items from selected collections"
            checked={applyTo === "collections"}
            id="apply-collections"
            name="applyTo"
            onChange={() => setApplyTo("collections")}
          />
          <RadioButton
            label="Specific products"
            helpText="Discount applies only to selected products"
            checked={applyTo === "products"}
            id="apply-products"
            name="applyTo"
            onChange={() => setApplyTo("products")}
          />
        </BlockStack>

        {(applyTo === "collections" || applyTo === "products") && (
          <TextField
            label={applyTo === "collections" ? "Search collections" : "Search products"}
            value={shopifyDiscountCode}
            onChange={setShopifyDiscountCode}
            autoComplete="off"
            prefix={<Icon source={SearchIcon} />}
            placeholder={
              applyTo === "collections"
                ? "Search by collection name…"
                : "Search by product name or SKU…"
            }
          />
        )}
      </BlockStack>

      <Divider />

      <BlockStack gap="200">
        <Text variant="bodyMd" fontWeight="semibold" as="p">
          Shopify discount code (optional)
        </Text>
        <TextField
          label="Discount code"
          value={shopifyDiscountCode}
          onChange={setShopifyDiscountCode}
          autoComplete="off"
          placeholder="e.g. SAVE10"
          helpText="Link an existing Shopify discount code. Required for order discounts to work on checkout."
        />
      </BlockStack>

      <Divider />

      <BlockStack gap="200">
        <Text variant="bodyMd" fontWeight="semibold" as="p">
          Stacking
        </Text>
        <Checkbox
          label="Allow this discount to stack with other discounts"
          checked={stackable}
          onChange={setStackable}
          helpText="When enabled, this discount combines with other active discounts."
        />
      </BlockStack>
    </BlockStack>
  );
}

// ─── Free Shipping form ───────────────────────────────────────────────────────
function FreeShippingForm({ trackBy }) {
  const [targetValue, setTargetValue] = useState("");
  const [shippingType, setShippingType] = useState("all");
  const [maxShippingRate, setMaxShippingRate] = useState("");
  const [hasMaxRate, setHasMaxRate] = useState(false);

  return (
    <BlockStack gap="400">
      <TextField
        label={
          trackBy === "quantity"
            ? "Quantity target (items)"
            : "Cart value target"
        }
        type="number"
        value={targetValue}
        onChange={setTargetValue}
        autoComplete="off"
        prefix={trackBy === "cart_value" ? "$" : undefined}
        suffix={trackBy === "quantity" ? "items" : undefined}
        placeholder={trackBy === "cart_value" ? "e.g. 100" : "e.g. 4"}
        helpText={
          trackBy === "cart_value"
            ? "Customer must reach this cart value to unlock free shipping"
            : "Customer must add this many items to unlock free shipping"
        }
      />

      <Divider />

      <BlockStack gap="200">
        <Text variant="bodyMd" fontWeight="semibold" as="p">
          Applies to shipping rates
        </Text>
        <BlockStack gap="100">
          <RadioButton
            label="All shipping rates"
            helpText="Free shipping applies to every available shipping method"
            checked={shippingType === "all"}
            id="shipping-all"
            name="shippingType"
            onChange={() => setShippingType("all")}
          />
          <RadioButton
            label="Standard shipping only"
            helpText="Free shipping applies only to standard (non-express) rates"
            checked={shippingType === "standard"}
            id="shipping-standard"
            name="shippingType"
            onChange={() => setShippingType("standard")}
          />
          <RadioButton
            label="Specific countries only"
            helpText="Limit free shipping to orders in selected countries"
            checked={shippingType === "countries"}
            id="shipping-countries"
            name="shippingType"
            onChange={() => setShippingType("countries")}
          />
        </BlockStack>

        {shippingType === "countries" && (
          <TextField
            label="Countries"
            autoComplete="off"
            placeholder="Search countries…"
            prefix={<Icon source={SearchIcon} />}
          />
        )}
      </BlockStack>

      <Divider />

      <BlockStack gap="200">
        <Text variant="bodyMd" fontWeight="semibold" as="p">
          Maximum shipping rate cap
        </Text>
        <Checkbox
          label="Set a maximum shipping rate to cover"
          checked={hasMaxRate}
          onChange={setHasMaxRate}
          helpText="Only cover shipping rates up to a certain amount (e.g. $10)."
        />
        {hasMaxRate && (
          <TextField
            label="Maximum rate"
            type="number"
            value={maxShippingRate}
            onChange={setMaxShippingRate}
            autoComplete="off"
            prefix="$"
            placeholder="e.g. 10"
          />
        )}
      </BlockStack>
    </BlockStack>
  );
}

// ─── Milestone card (wrapper with header + dynamic form) ──────────────────────
function MilestoneCard({ index, rewardType, trackBy, onRemove }) {
  const [collapsed, setCollapsed] = useState(false);

  const bgColor =
    rewardType.value === "free_product"
      ? "#f0fdf4"
      : rewardType.value === "order_discount"
      ? "#eff6ff"
      : "#fff7ed";

  const accentColor =
    rewardType.value === "free_product"
      ? "#16a34a"
      : rewardType.value === "order_discount"
      ? "#2563eb"
      : "#ea580c";

  return (
    <div
      style={{
        border: `1.5px solid ${accentColor}30`,
        borderRadius: "10px",
        overflow: "hidden",
        background: "#fff",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          background: bgColor,
          borderBottom: collapsed ? "none" : `1px solid ${accentColor}20`,
        }}
      >
        <InlineStack gap="200" blockAlign="center">
          <div style={{ color: accentColor }}>
            <Icon source={rewardType.icon} />
          </div>
          <Text variant="bodyMd" fontWeight="semibold" as="p">
            Goal {index + 1} — {rewardType.label}
          </Text>
        </InlineStack>
        <InlineStack gap="200" blockAlign="center">
          <Button
            variant="plain"
            icon={collapsed ? MaximizeIcon : MinimizeIcon}
            onClick={() => setCollapsed((v) => !v)}
          >
            {collapsed ? "Expand" : "Collapse"}
          </Button>
          <Button variant="plain" tone="critical" icon={DeleteIcon} onClick={onRemove} />
        </InlineStack>
      </div>

      <Collapsible open={!collapsed} id={`milestone-${index}`}>
        <Box padding="400">
          {rewardType.value === "free_product" && (
            <FreeProductForm trackBy={trackBy} />
          )}
          {rewardType.value === "order_discount" && (
            <OrderDiscountForm trackBy={trackBy} />
          )}
          {rewardType.value === "free_shipping" && (
            <FreeShippingForm trackBy={trackBy} />
          )}
        </Box>
      </Collapsible>
    </div>
  );
}

// ─── Goal content editor ──────────────────────────────────────────────────────
function GoalContentItem({ index, rewardType }) {
  const [open, setOpen] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [beforeText, setBeforeText] = useState("");
  const [afterText, setAfterText] = useState("");

  const defaultBefore =
    rewardType?.value === "free_product"
      ? "Add ${{amount}} more to get a free gift!"
      : rewardType?.value === "order_discount"
      ? "Add ${{amount}} more to get {{discount}} off!"
      : "Add ${{amount}} more for free shipping!";

  const defaultAfter =
    rewardType?.value === "free_product"
      ? "🎉 You've unlocked a free gift!"
      : rewardType?.value === "order_discount"
      ? "🎉 You've unlocked {{discount}} off your order!"
      : "🎉 You've unlocked free shipping!";

  return (
    <div
      style={{
        border: "1px solid #e1e3e5",
        borderRadius: "8px",
        overflow: "hidden",
        background: "#fff",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          background: "#f6f6f7",
        }}
      >
        <InlineStack gap="200" blockAlign="center">
          {rewardType && (
            <Icon source={rewardType.icon} />
          )}
          <Text variant="bodyMd" fontWeight="semibold" as="p">
            Goal {index + 1}
            {rewardType ? ` — ${rewardType.label}` : ""}
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

      <Collapsible open={open} id={`goal-content-${index}`}>
        <Box padding="300">
          <BlockStack gap="300">
            <Text variant="bodySm" tone="subdued" as="p">
              Customize the text shown in the progress bar for this goal. Use{" "}
              <code>{"{{amount}}"}</code> for the remaining amount and{" "}
              <code>{"{{reward}}"}</code> for the reward name.
            </Text>
            <Button
              icon={EditIcon}
              onClick={() => setEditOpen((v) => !v)}
              variant="secondary"
              size="slim"
            >
              {editOpen ? "Hide editor" : "Edit texts"}
            </Button>
            {editOpen && (
              <BlockStack gap="300">
                <TextField
                  label="Text before goal is reached"
                  value={beforeText}
                  onChange={setBeforeText}
                  placeholder={defaultBefore}
                  autoComplete="off"
                  helpText="Shown while customer is working toward this goal"
                />
                <TextField
                  label="Text after goal is reached"
                  value={afterText}
                  onChange={setAfterText}
                  placeholder={defaultAfter}
                  autoComplete="off"
                  helpText="Shown when the customer has hit or passed this milestone"
                />
              </BlockStack>
            )}
          </BlockStack>
        </Box>
      </Collapsible>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CartGoalsCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const host = searchParams.get("host");
  const withHost = (path) => host ? `${path}?host=${encodeURIComponent(host)}` : path;

  const loaderData = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const submit = useSubmit();
  const recordId = loaderData?.record?.id || null;
  const r = loaderData?.record;

  const [status, setStatus] = useState(r?.status ?? "draft");
  const [campaignName, setCampaignName] = useState(r?.name ?? "Cart Goal 1");
  const isSaving = navigation.state === "submitting";

  const [trackBy, setTrackBy] = useState(r?.trackBy ?? "cart_value");
  const [milestones, setMilestones] = useState(JSON.parse(r?.milestones || "[]"));

  const handleAddGoal = (rewardType) => {
    setMilestones((prev) => [...prev, { id: Date.now(), rewardType }]);
  };
  const handleRemoveMilestone = (id) => {
    setMilestones((prev) => prev.filter((m) => m.id !== id));
  };

  const [goalsShown, setGoalsShown] = useState(r?.goalsShown ?? 3);

  const today = new Date().toISOString().split("T")[0];
  const nowTime = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const [startDate, setStartDate] = useState(r?.startsAt ? new Date(r.startsAt).toISOString().split("T")[0] : today);
  const [startTime, setStartTime] = useState(r?.startsAt ? new Date(r.startsAt).toTimeString().slice(0, 5) : nowTime);
  const [hasEndDate, setHasEndDate] = useState(!!r?.endsAt);
  const [endDate, setEndDate] = useState(r?.endsAt ? new Date(r.endsAt).toISOString().split("T")[0] : "");
  const [endTime, setEndTime] = useState(r?.endsAt ? new Date(r.endsAt).toTimeString().slice(0, 5) : "23:59");

  const [discountMode, setDiscountMode] = useState(r?.discountMode ?? "after");

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
        milestones: JSON.stringify(milestones),
        position: null,
        bgColor: null,
        textColor: null,
        progressBarColor: null,
        trackBy,
        discountMode,
        goalsShown,
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
      title={campaignName || "New Cart Goal"}
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
        .goals-layout {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 20px;
          align-items: start;
        }
        @media (max-width: 900px) {
          .goals-layout { grid-template-columns: 1fr; }
        }
      `}</style>

      <Box paddingBlockEnd="800">
        <div className="goals-layout">

          {/* ── Left column ─────────────────────────────────────────────── */}
          <BlockStack gap="400">

            {/* Goals & rewards */}
            <SectionCard icon={TargetIcon} title="Goals & rewards">
              <BlockStack gap="400">

                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">
                    Choose what to track
                  </Text>
                  <PillToggle
                    options={[
                      { label: "Total cart value", value: "cart_value" },
                      { label: "Product quantity", value: "quantity" },
                    ]}
                    value={trackBy}
                    onChange={setTrackBy}
                  />
                  <Text variant="bodySm" tone="subdued" as="p">
                    {trackBy === "cart_value"
                      ? "Progress bar fills as customers add more value to their cart."
                      : "Progress bar fills as customers add more items to their cart."}
                  </Text>
                </BlockStack>

                <Divider />

                <BlockStack gap="100">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">
                    Milestones
                  </Text>
                  <Text variant="bodySm" tone="subdued" as="p">
                    Add one or more goals — each unlocks a reward when the customer reaches the target.
                  </Text>
                </BlockStack>

                {milestones.length > 0 && (
                  <BlockStack gap="300">
                    {milestones.map((m, i) => (
                      <MilestoneCard
                        key={m.id}
                        index={i}
                        rewardType={m.rewardType}
                        trackBy={trackBy}
                        onRemove={() => handleRemoveMilestone(m.id)}
                      />
                    ))}
                  </BlockStack>
                )}

                <AddGoalDropdown onSelect={handleAddGoal} />

                <Banner tone="info">
                  <Text variant="bodySm" as="p">
                    For <strong>free product</strong> and <strong>order discount</strong> rewards to
                    work at checkout, link them to an existing Shopify discount code inside each
                    goal.{" "}
                    <Button variant="plain" size="slim">
                      Learn more
                    </Button>
                  </Text>
                </Banner>

              </BlockStack>
            </SectionCard>

            {/* Content */}
            <SectionCard icon={EditIcon} title="Content">
              <BlockStack gap="400">
                <BlockStack gap="200">
                  <InlineStack gap="200" blockAlign="center">
                    <Text variant="bodyMd" fontWeight="semibold" as="p">
                      Number of goals shown at a time
                    </Text>
                  </InlineStack>
                  <Text variant="bodySm" tone="subdued" as="p">
                    Controls how many milestones are visible on the progress bar at once.
                  </Text>
                  <RangeSlider
                    min={1}
                    max={5}
                    value={goalsShown}
                    onChange={(v) => setGoalsShown(v)}
                    output
                  />
                </BlockStack>

                <Divider />

                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">
                    Edit goal texts
                  </Text>
                  <Text variant="bodySm" tone="subdued" as="p">
                    Customize the message shown before and after each goal is reached.
                  </Text>
                  {milestones.length === 0 ? (
                    <div
                      style={{
                        padding: "20px",
                        border: "1px dashed #c9cccf",
                        borderRadius: "8px",
                        textAlign: "center",
                      }}
                    >
                      <Text variant="bodySm" tone="subdued" as="p">
                        Add milestones above to edit their text content
                      </Text>
                    </div>
                  ) : (
                    <BlockStack gap="200">
                      {milestones.map((m, i) => (
                        <GoalContentItem key={m.id} index={i} rewardType={m.rewardType} />
                      ))}
                    </BlockStack>
                  )}
                </BlockStack>
              </BlockStack>
            </SectionCard>

            {/* Settings */}
            <SectionCard icon={SettingsIcon} title="Settings">
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
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "12px",
                        }}
                      >
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
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "12px",
                          }}
                        >
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

                {/* Discount calculation mode */}
                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">
                    How other discounts affect progress bar
                  </Text>
                  <Text variant="bodySm" tone="subdued" as="p">
                    Choose whether the cart total used for progress includes or excludes other active discounts.
                  </Text>
                  <BlockStack gap="100">
                    <RadioButton
                      label="Use cart total after other discounts are subtracted"
                      helpText="Progress is based on what the customer will actually pay"
                      checked={discountMode === "after"}
                      id="discount-after"
                      name="discountMode"
                      onChange={() => setDiscountMode("after")}
                    />
                    <RadioButton
                      label="Use cart total before other discounts"
                      helpText="Progress is based on the original item prices"
                      checked={discountMode === "before"}
                      id="discount-before"
                      name="discountMode"
                      onChange={() => setDiscountMode("before")}
                    />
                  </BlockStack>
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

            {/* Preview */}
            <div
              style={{
                background: "#fff",
                border: "1px solid #e1e3e5",
                borderRadius: "10px",
                overflow: "hidden",
              }}
            >
              <Box padding="300" borderBlockEndWidth="025" borderColor="border">
                <Text variant="bodyMd" fontWeight="semibold" as="p">
                  Preview
                </Text>
              </Box>
              <Box padding="300">
                <BlockStack gap="300">
                  {milestones.length === 0 ? (
                    <div
                      style={{
                        padding: "24px 16px",
                        border: "1px dashed #c9cccf",
                        borderRadius: "8px",
                        textAlign: "center",
                      }}
                    >
                      <Text variant="bodySm" tone="subdued" as="p">
                        Add a goal to see a preview
                      </Text>
                    </div>
                  ) : (
                    <div
                      style={{
                        border: "1px solid #e1e3e5",
                        borderRadius: "8px",
                        padding: "16px",
                      }}
                    >
                      <BlockStack gap="200">
                        <Text variant="bodySm" tone="subdued" as="p">
                          Add more to get {milestones[0]?.rewardType?.label ?? "reward"}
                        </Text>

                        {/* Progress bar */}
                        <div
                          style={{
                            position: "relative",
                            height: "8px",
                            background: "#e1e3e5",
                            borderRadius: "4px",
                            overflow: "visible",
                            margin: "4px 0",
                          }}
                        >
                          <div
                            style={{
                              width: "30%",
                              height: "100%",
                              background: "#202223",
                              borderRadius: "4px",
                            }}
                          />
                          {milestones.slice(0, 3).map((_, i, arr) => {
                            const pos = ((i + 1) / (arr.length + 1)) * 100;
                            return (
                              <div
                                key={i}
                                style={{
                                  position: "absolute",
                                  top: "50%",
                                  left: `${pos}%`,
                                  transform: "translate(-50%, -50%)",
                                  width: "14px",
                                  height: "14px",
                                  borderRadius: "50%",
                                  background: "#e1e3e5",
                                  border: "2px solid #fff",
                                  boxShadow: "0 0 0 1.5px #c9cccf",
                                }}
                              />
                            );
                          })}
                        </div>

                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: "4px",
                          }}
                        >
                          {milestones.slice(0, 3).map((m, i) => (
                            <div
                              key={i}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <span style={{ color: "#6d7175" }}>
                                <Icon source={m.rewardType.icon} />
                              </span>
                              <Text variant="bodySm" tone="subdued" as="span">
                                {m.rewardType.label}
                              </Text>
                            </div>
                          ))}
                        </div>
                      </BlockStack>
                    </div>
                  )}

                  <BlockStack gap="100">
                    <Text variant="bodySm" tone="subdued" as="p">
                      Preview cart value slider
                    </Text>
                    <RangeSlider
                      min={0}
                      max={100}
                      value={30}
                      onChange={() => {}}
                    />
                  </BlockStack>
                </BlockStack>
              </Box>
            </div>

          </BlockStack>
        </div>
      </Box>
    </Page>
  );
}
