import { useState, useEffect } from "react";
import {
  useNavigate, useSearchParams, useSubmit,
  useActionData, useLoaderData, useNavigation,
} from "react-router";
import {
  Page, Text, Box, BlockStack, InlineStack, Button,
  TextField, Select, Checkbox, Collapsible, Divider,
  Icon, RadioButton, Banner, Tabs,
} from "@shopify/polaris";
import {
  DiscountIcon, SettingsIcon, EditIcon,
  MinimizeIcon, MaximizeIcon, PauseCircleIcon,
  CalendarIcon, ClockIcon, PersonFilledIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { upsertAutomaticBasic } from "../shopify-discount.server";

// ─── Loader ──────────────────────────────────────────────────────────────────

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  let record = null;
  if (id) {
    const row = await prisma.discountRule.findFirst({
      where: { id: parseInt(id, 10), shop: session.shop },
    });
    if (row && String(row.type || "").toLowerCase() !== "code") {
      record = row;
    }
  }
  return { record };
};

// ─── Action ──────────────────────────────────────────────────────────────────

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const body = await request.json();
  const {
    id, campaignName, enabled, valueType, value, triggerType, minPurchase, minQuantity,
    progressTextBefore, progressTextAfter, progressTextBelow,
    startsAt, endsAt, priority,
    customerTarget, customerTags, abTestEnabled, abTestVariant, templateKey,
  } = body;

  const dbData = {
    shop,
    type: "automatic",
    campaignName: campaignName || "Automatic Discount",
    enabled: enabled !== false,
    valueType: valueType || "percent",
    value: value ? String(value) : "0",
    triggerType: triggerType || "amount",
    minPurchase: minPurchase ? String(minPurchase) : null,
    minQuantity: minQuantity ? String(minQuantity) : null,
    progressTextBefore: progressTextBefore || null,
    progressTextAfter: progressTextAfter || null,
    progressTextBelow: progressTextBelow || null,
    startsAt: startsAt ? new Date(startsAt) : null,
    endsAt: endsAt ? new Date(endsAt) : null,
    priority: parseInt(priority || "0") || 0,
    rewardType: valueType === "amount" ? "amount" : "percent",
    customerTarget: customerTarget || "all",
    customerTags: (customerTarget === "has_tag" || customerTarget === "no_tag") ? (customerTags || null) : null,
    abTestEnabled: abTestEnabled === true,
    abTestVariant: abTestEnabled ? (abTestVariant || null) : null,
    templateKey: templateKey || null,
  };

  try {
    let existingShopifyId = null;
    if (id) {
      const existing = await prisma.discountRule.findFirst({
        where: { id: parseInt(id, 10), shop },
        select: { shopifyDiscountCodeId: true },
      });
      existingShopifyId = existing?.shopifyDiscountCodeId || null;
    }

    try {
      const shopifyId = await upsertAutomaticBasic(admin, {
        existingId: existingShopifyId,
        title: campaignName || "Automatic Discount",
        startsAt: startsAt || null,
        endsAt: endsAt || null,
        minSubtotal: triggerType === "amount" ? (minPurchase || null) : null,
        isPercentage: valueType !== "amount",
        discountValue: value || "0",
      });
      if (shopifyId) dbData.shopifyDiscountCodeId = shopifyId;
    } catch (gqlErr) {
      console.error("[rule-auto-discount] Shopify sync failed:", gqlErr);
    }

    let record;
    if (id) {
      const existing = await prisma.discountRule.findFirst({ where: { id: parseInt(id, 10), shop } });
      if (!existing) return { error: "Rule not found" };
      record = await prisma.discountRule.update({ where: { id: parseInt(id, 10) }, data: dbData });
    } else {
      record = await prisma.discountRule.create({ data: dbData });
    }
    return { success: true, id: record.id };
  } catch (err) {
    return { error: err.message };
  }
};

// ─── SectionCard ─────────────────────────────────────────────────────────────

function SectionCard({ icon, title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: "#fff", border: "1px solid #e1e3e5", borderRadius: "12px", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: open ? "1px solid #e1e3e5" : "none" }}>
        <InlineStack gap="200" blockAlign="center">
          <Icon source={icon} />
          <Text variant="headingSm" as="h3" fontWeight="semibold">{title}</Text>
        </InlineStack>
        <Button variant="plain" icon={open ? MinimizeIcon : MaximizeIcon} onClick={() => setOpen(v => !v)}>
          {open ? "Collapse" : "Expand"}
        </Button>
      </div>
      <Collapsible open={open} id={`sc-${title}`}>
        <Box padding="400">{children}</Box>
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px 18px 12px" }}>
          <Button variant="plain" icon={MinimizeIcon} onClick={() => setOpen(false)}>Collapse</Button>
        </div>
      </Collapsible>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

const TRIGGER_TABS = [
  { id: "trigger-amount", content: "Amount Discount" },
  { id: "trigger-quantity", content: "Quantity Discount" },
];

export default function RuleAutoDiscount() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const host = searchParams.get("host");
  const withHost = (path) => host ? `${path}?host=${encodeURIComponent(host)}` : path;

  const loaderData = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const submit = useSubmit();
  const r = loaderData?.record;
  const recordId = r?.id || null;
  const isSaving = navigation.state === "submitting";

  // Sidebar
  const [campaignName, setCampaignName] = useState(r?.campaignName ?? "Automatic Discount");
  const [enabled, setEnabled] = useState(r?.enabled !== false);

  // Discount value
  const [valueType, setValueType] = useState(r?.valueType ?? "percent");
  const [value, setValue] = useState(r?.value ?? "");

  // Trigger (tabs)
  const [triggerTabIdx, setTriggerTabIdx] = useState(r?.triggerType === "quantity" ? 1 : 0);
  const triggerType = triggerTabIdx === 0 ? "amount" : "quantity";
  const [minPurchase, setMinPurchase] = useState(r?.minPurchase ?? "");
  const [minQuantity, setMinQuantity] = useState(r?.minQuantity ?? "");

  // Progress messages
  const [progressTextBefore, setProgressTextBefore] = useState(
    r?.progressTextBefore ?? "Spend {{amount}} more to get {{discount}} off!"
  );
  const [progressTextAfter, setProgressTextAfter] = useState(
    r?.progressTextAfter ?? "{{discount}} off applied to your cart! 🎉"
  );
  const [progressTextBelow, setProgressTextBelow] = useState(r?.progressTextBelow ?? "");

  // Schedule
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(r?.startsAt ? new Date(r.startsAt).toISOString().split("T")[0] : today);
  const [startTime, setStartTime] = useState(r?.startsAt ? new Date(r.startsAt).toTimeString().slice(0, 5) : "00:00");
  const [hasEndDate, setHasEndDate] = useState(!!r?.endsAt);
  const [endDate, setEndDate] = useState(r?.endsAt ? new Date(r.endsAt).toISOString().split("T")[0] : "");
  const [endTime, setEndTime] = useState(r?.endsAt ? new Date(r.endsAt).toTimeString().slice(0, 5) : "23:59");

  // Targeting & priority
  const [priority, setPriority] = useState(String(r?.priority ?? "0"));
  const [customerTarget, setCustomerTarget] = useState(r?.customerTarget ?? "all");
  const [customerTags, setCustomerTags] = useState(r?.customerTags ?? "");
  const [abTestEnabled, setAbTestEnabled] = useState(r?.abTestEnabled === true);
  const [abTestVariant, setAbTestVariant] = useState(r?.abTestVariant ?? "a");
  const [templateKey, setTemplateKey] = useState(r?.templateKey ?? "");

  useEffect(() => {
    if (actionData?.success && navigation.state === "idle") navigate(withHost("/app/campaigns"));
  }, [actionData, navigation.state]);

  const handleSave = () => {
    submit(
      {
        id: recordId,
        campaignName,
        enabled,
        valueType,
        value,
        triggerType,
        minPurchase,
        minQuantity,
        progressTextBefore,
        progressTextAfter,
        progressTextBelow,
        priority,
        startsAt: startDate ? new Date(`${startDate}T${startTime}`).toISOString() : null,
        endsAt: hasEndDate && endDate ? new Date(`${endDate}T${endTime}`).toISOString() : null,
        customerTarget,
        customerTags: (customerTarget === "has_tag" || customerTarget === "no_tag") ? customerTags : null,
        abTestEnabled,
        abTestVariant: abTestEnabled ? abTestVariant : null,
        templateKey: templateKey || null,
      },
      { method: "post", encType: "application/json" }
    );
  };

  const discountLabel = value
    ? valueType === "percent" ? `${value}% off` : `$${value} off`
    : "discount";

  const [sliderValue, setSliderValue] = useState(50);
  const threshold = parseFloat(triggerType === "amount" ? (minPurchase || 100) : 1);
  const mockCart = (threshold * sliderValue) / 100;
  const remaining = Math.max(0, threshold - mockCart).toFixed(2);
  const progressPct = sliderValue;
  const isUnlocked = sliderValue >= 100;
  const unlockedMsg = (progressTextAfter || "{{discount}} off applied to your cart! 🎉").replace("{{discount}}", discountLabel);

  return (
    <Page
      backAction={{ content: "Campaigns", onAction: () => navigate(withHost("/app/campaigns")) }}
      title={campaignName || "Automatic Discount"}
      primaryAction={{ content: "Save", loading: isSaving, onAction: handleSave }}
      secondaryActions={[{ content: enabled ? "Disable" : "Enable", onAction: () => setEnabled(v => !v) }]}
    >
      <style>{`.ad-layout{display:grid;grid-template-columns:1fr 320px;gap:20px;align-items:start}@media(max-width:900px){.ad-layout{grid-template-columns:1fr}}`}</style>
      {actionData?.error && (
        <Box paddingBlockEnd="400">
          <Banner tone="critical" title="Save failed">{actionData.error}</Banner>
        </Box>
      )}
      <Box paddingBlockEnd="800">
        <div className="ad-layout">
          {/* ── Main column ── */}
          <BlockStack gap="400">

            {/* Discount value */}
            <SectionCard icon={DiscountIcon} title="Discount value">
              <BlockStack gap="400">
                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">Discount type</Text>
                  <BlockStack gap="100">
                    <RadioButton
                      label="Percentage off"
                      helpText="e.g. 10% off the entire cart."
                      checked={valueType === "percent"}
                      id="vt-percent"
                      name="valueType"
                      onChange={() => setValueType("percent")}
                    />
                    <RadioButton
                      label="Fixed amount off"
                      helpText="e.g. $15 off the cart total."
                      checked={valueType === "amount"}
                      id="vt-amount"
                      name="valueType"
                      onChange={() => setValueType("amount")}
                    />
                  </BlockStack>
                </BlockStack>
                <Divider />
                <TextField
                  label={valueType === "percent" ? "Percentage off" : "Amount off"}
                  type="number"
                  value={value}
                  onChange={setValue}
                  autoComplete="off"
                  suffix={valueType === "percent" ? "%" : undefined}
                  prefix={valueType === "amount" ? "$" : undefined}
                  placeholder={valueType === "percent" ? "e.g. 10" : "e.g. 15"}
                  helpText="Applied automatically when the trigger condition is met."
                />
              </BlockStack>
            </SectionCard>

            {/* Trigger condition — tabs */}
            <SectionCard icon={DiscountIcon} title="Trigger condition">
              <BlockStack gap="300">
                <Tabs tabs={TRIGGER_TABS} selected={triggerTabIdx} onSelect={setTriggerTabIdx} />
                <Box paddingBlockStart="200">
                  {triggerTabIdx === 0 ? (
                    <TextField
                      label="Minimum cart value"
                      type="number"
                      value={minPurchase}
                      onChange={setMinPurchase}
                      autoComplete="off"
                      prefix="$"
                      placeholder="e.g. 100"
                      helpText="Discount activates when the cart subtotal reaches this value."
                    />
                  ) : (
                    <TextField
                      label="Minimum item quantity"
                      type="number"
                      value={minQuantity}
                      onChange={setMinQuantity}
                      autoComplete="off"
                      placeholder="e.g. 3"
                      helpText="Discount activates when this many items are in the cart."
                    />
                  )}
                </Box>
              </BlockStack>
            </SectionCard>

            {/* Progress bar messages */}
            <SectionCard icon={EditIcon} title="Progress bar messages">
              <BlockStack gap="300">
                <Banner tone="info">
                  Use <strong>{"{{amount}}"}</strong> for remaining amount and <strong>{"{{discount}}"}</strong> for the discount value.
                </Banner>
                <TextField
                  label="Message before threshold"
                  value={progressTextBefore}
                  onChange={setProgressTextBefore}
                  autoComplete="off"
                  placeholder="Spend {{amount}} more to get {{discount}} off!"
                />
                <TextField
                  label="Message after threshold"
                  value={progressTextAfter}
                  onChange={setProgressTextAfter}
                  autoComplete="off"
                  placeholder="{{discount}} off applied to your cart! 🎉"
                />
                <TextField
                  label="Message below the bar (optional)"
                  value={progressTextBelow}
                  onChange={setProgressTextBelow}
                  autoComplete="off"
                  placeholder="e.g. Discount applied at checkout."
                />
              </BlockStack>
            </SectionCard>

            {/* Targeting & priority */}
            <SectionCard icon={PersonFilledIcon} title="Targeting & priority" defaultOpen={false}>
              <BlockStack gap="400">
                <Select
                  label="Customer target"
                  options={[
                    { label: "All customers", value: "all" },
                    { label: "Customers with tag", value: "has_tag" },
                    { label: "Customers without tag", value: "no_tag" },
                    { label: "Logged in customers only", value: "logged_in" },
                    { label: "Guest customers only", value: "guest" },
                  ]}
                  value={customerTarget}
                  onChange={setCustomerTarget}
                  helpText="Choose which customers this rule applies to."
                />
                {(customerTarget === "has_tag" || customerTarget === "no_tag") && (
                  <TextField
                    label="Customer tags"
                    value={customerTags}
                    onChange={setCustomerTags}
                    autoComplete="off"
                    placeholder="vip, wholesale, member"
                    helpText="Comma-separated list of customer tags to match."
                  />
                )}
                <Divider />
                <TextField
                  label="Priority"
                  type="number"
                  value={priority}
                  onChange={setPriority}
                  autoComplete="off"
                  helpText="Higher number = evaluated first when multiple rules are active."
                />
                <Divider />
                <Checkbox
                  label="Enable A/B testing"
                  checked={abTestEnabled}
                  onChange={setAbTestEnabled}
                  helpText="Split traffic between two variants to test rule performance."
                />
                {abTestEnabled && (
                  <Select
                    label="A/B test variant"
                    options={[
                      { label: "Variant A", value: "a" },
                      { label: "Variant B", value: "b" },
                    ]}
                    value={abTestVariant}
                    onChange={setAbTestVariant}
                    helpText="Assign this rule to variant A or B."
                  />
                )}
                <Divider />
                <TextField
                  label="Template key (optional)"
                  value={templateKey}
                  onChange={setTemplateKey}
                  autoComplete="off"
                  placeholder="e.g. summer_theme"
                  helpText="Custom template identifier for advanced visual themes."
                />
              </BlockStack>
            </SectionCard>

            {/* Settings */}
            <SectionCard icon={SettingsIcon} title="Settings" defaultOpen={false}>
              <BlockStack gap="400">
                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">Active dates</Text>
                  <div style={{ border: "1px solid #e1e3e5", borderRadius: "8px", padding: "16px" }}>
                    <BlockStack gap="300">
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                        <TextField label="Start date" type="date" value={startDate} onChange={setStartDate} prefix={<Icon source={CalendarIcon} />} autoComplete="off" />
                        <TextField label="Start time" type="time" value={startTime} onChange={setStartTime} prefix={<Icon source={ClockIcon} />} autoComplete="off" />
                      </div>
                      <Checkbox label="Set end date" checked={hasEndDate} onChange={setHasEndDate} />
                      {hasEndDate && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                          <TextField label="End date" type="date" value={endDate} onChange={setEndDate} prefix={<Icon source={CalendarIcon} />} autoComplete="off" />
                          <TextField label="End time" type="time" value={endTime} onChange={setEndTime} prefix={<Icon source={ClockIcon} />} autoComplete="off" />
                        </div>
                      )}
                    </BlockStack>
                  </div>
                </BlockStack>
              </BlockStack>
            </SectionCard>

          </BlockStack>

          {/* ── Sidebar ── */}
          <BlockStack gap="300">
            {!enabled && (
              <div style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: "10px", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ color: "#92400e" }}><Icon source={PauseCircleIcon} /></span>
                <Text variant="bodyMd" fontWeight="semibold" as="p">This rule is disabled</Text>
              </div>
            )}

            <div style={{ background: "#fff", border: "1px solid #e1e3e5", borderRadius: "10px", padding: "16px" }}>
              <BlockStack gap="300">
                <Select
                  label="Status"
                  options={[{ label: "Active", value: "true" }, { label: "Inactive", value: "false" }]}
                  value={String(enabled)}
                  onChange={(v) => setEnabled(v === "true")}
                />
                <TextField label="Rule name" value={campaignName} onChange={setCampaignName} autoComplete="off" />
              </BlockStack>
            </div>

            {/* Preview */}
            <div style={{ background: "#fff", border: "1px solid #e1e3e5", borderRadius: "10px", overflow: "hidden" }}>
              <Box padding="300" borderBlockEndWidth="025" borderColor="border">
                <Text variant="bodyMd" fontWeight="semibold" as="p">Preview</Text>
              </Box>
              <Box padding="400">
                <div style={{ background: "#f9fafb", border: "1px solid #e1e3e5", borderRadius: "8px", padding: "14px 16px 18px" }}>
                  <div style={{ marginBottom: "14px", lineHeight: "1.5" }}>
                    {isUnlocked ? (
                      <Text variant="bodySm" fontWeight="semibold" as="p">{unlockedMsg}</Text>
                    ) : (
                      <span style={{ fontSize: "13px" }}>
                        {progressTextBefore.includes("{{amount}}")
                          ? <>
                              {progressTextBefore.split("{{amount}}")[0].replace("{{discount}}", discountLabel)}
                              <strong>${remaining}</strong>
                              {(progressTextBefore.split("{{amount}}")[1] ?? "").replace("{{discount}}", discountLabel)}
                            </>
                          : progressTextBefore.replace("{{discount}}", discountLabel) || `Spend $${remaining} more to get ${discountLabel} off!`}
                      </span>
                    )}
                  </div>
                  <div style={{ position: "relative", paddingRight: "44px" }}>
                    <div style={{ height: "4px", background: "#e1e3e5", borderRadius: "2px" }}>
                      <div style={{ height: "100%", width: `${progressPct}%`, background: isUnlocked ? "#16a34a" : "#111827", borderRadius: "2px", transition: "width 0.15s" }} />
                    </div>
                    <div style={{ position: "absolute", right: "0", top: "-10px", display: "flex", flexDirection: "column", alignItems: "center", gap: "1px" }}>
                      <Icon source={DiscountIcon} tone={isUnlocked ? "success" : "base"} />
                      <span style={{ fontSize: "11px", color: isUnlocked ? "#16a34a" : "#6b7280", fontWeight: isUnlocked ? 600 : 400 }}>{discountLabel || "Discount!"}</span>
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: "16px" }}>
                  <Text variant="bodySm" tone="subdued" as="p">Use this to adjust the progress bar</Text>
                  <input
                    type="range" min="0" max="100" value={sliderValue}
                    onChange={(e) => setSliderValue(parseInt(e.target.value))}
                    style={{ width: "100%", marginTop: "8px", cursor: "pointer", accentColor: "#111827" }}
                  />
                </div>
              </Box>
            </div>
          </BlockStack>
        </div>
      </Box>
    </Page>
  );
}
