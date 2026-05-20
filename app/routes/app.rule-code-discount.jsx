import { useState, useEffect } from "react";
import {
  useNavigate, useSearchParams, useSubmit,
  useActionData, useLoaderData, useNavigation,
} from "react-router";
import {
  Page, Text, Box, BlockStack, InlineStack, Button,
  TextField, Select, Checkbox, Collapsible, Divider,
  Icon, RadioButton, Banner,
} from "@shopify/polaris";
import {
  CodeIcon, SettingsIcon, EditIcon,
  MinimizeIcon, MaximizeIcon, PauseCircleIcon,
  CalendarIcon, ClockIcon, ClipboardIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { upsertDiscountCode } from "../shopify-discount.server";

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
    // Only load code discount rules on this page
    if (row && String(row.type || "").toLowerCase() === "code") {
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
    id, codeCampaignName, enabled, discountCode, valueType, value,
    minPurchase, progressTextBefore, progressTextAfter, progressTextBelow,
    startsAt, endsAt, priority,
  } = body;

  const dbData = {
    shop,
    type: "code",
    codeCampaignName: codeCampaignName || "Code Discount",
    campaignName: codeCampaignName || "Code Discount",
    enabled: enabled !== false,
    discountCode: discountCode ? String(discountCode).toUpperCase().trim() : null,
    valueType: valueType || "percent",
    value: value ? String(value) : "0",
    minPurchase: minPurchase ? String(minPurchase) : null,
    progressTextBefore: progressTextBefore || null,
    progressTextAfter: progressTextAfter || null,
    progressTextBelow: progressTextBelow || null,
    startsAt: startsAt ? new Date(startsAt) : null,
    endsAt: endsAt ? new Date(endsAt) : null,
    priority: parseInt(priority || "0") || 0,
    rewardType: valueType === "amount" ? "amount" : "percent",
  };

  try {
    // Sync code discount to Shopify
    let existingShopifyId = null;
    if (id) {
      const existing = await prisma.discountRule.findFirst({
        where: { id: parseInt(id, 10), shop },
        select: { codeDiscountId: true },
      });
      existingShopifyId = existing?.codeDiscountId || null;
    }

    if (discountCode) {
      try {
        const shopifyId = await upsertDiscountCode(admin, {
          existingId: existingShopifyId,
          title: codeCampaignName || "Code Discount",
          code: String(discountCode).toUpperCase().trim(),
          startsAt: startsAt || null,
          endsAt: endsAt || null,
          isPercentage: valueType !== "amount",
          discountValue: value || "0",
          minSubtotal: minPurchase || null,
        });
        if (shopifyId) dbData.codeDiscountId = shopifyId;
      } catch (gqlErr) {
        console.error("[rule-code-discount] Shopify sync failed:", gqlErr);
      }
    }

    let record;
    if (id) {
      const existing = await prisma.discountRule.findFirst({
        where: { id: parseInt(id, 10), shop },
      });
      if (!existing) return { error: "Rule not found" };
      record = await prisma.discountRule.update({
        where: { id: parseInt(id, 10) },
        data: dbData,
      });
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

export default function RuleCodeDiscount() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const host = searchParams.get("host");
  const withHost = (path) =>
    host ? `${path}?host=${encodeURIComponent(host)}` : path;

  const loaderData = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const submit = useSubmit();
  const r = loaderData?.record;
  const recordId = r?.id || null;
  const isSaving = navigation.state === "submitting";

  // Sidebar
  const [codeCampaignName, setCodeCampaignName] = useState(
    r?.codeCampaignName ?? r?.campaignName ?? "Code Discount"
  );
  const [enabled, setEnabled] = useState(r?.enabled !== false);

  // Code
  const [discountCode, setDiscountCode] = useState(r?.discountCode ?? "");

  // Discount value
  const [valueType, setValueType] = useState(r?.valueType ?? "percent");
  const [value, setValue] = useState(r?.value ?? "");

  // Condition
  const [minPurchase, setMinPurchase] = useState(r?.minPurchase ?? "");

  // Messages
  const [progressTextBefore, setProgressTextBefore] = useState(r?.progressTextBefore ?? "");
  const [progressTextAfter, setProgressTextAfter] = useState(r?.progressTextAfter ?? "");
  const [progressTextBelow, setProgressTextBelow] = useState(r?.progressTextBelow ?? "");

  // Schedule
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(
    r?.startsAt ? new Date(r.startsAt).toISOString().split("T")[0] : today
  );
  const [startTime, setStartTime] = useState(
    r?.startsAt ? new Date(r.startsAt).toTimeString().slice(0, 5) : "00:00"
  );
  const [hasEndDate, setHasEndDate] = useState(!!r?.endsAt);
  const [endDate, setEndDate] = useState(
    r?.endsAt ? new Date(r.endsAt).toISOString().split("T")[0] : ""
  );
  const [endTime, setEndTime] = useState(
    r?.endsAt ? new Date(r.endsAt).toTimeString().slice(0, 5) : "23:59"
  );
  const [priority, setPriority] = useState(String(r?.priority ?? "0"));

  useEffect(() => {
    if (actionData?.success && navigation.state === "idle") {
      navigate(withHost("/app/campaigns"));
    }
  }, [actionData, navigation.state]);

  const handleSave = () => {
    submit(
      {
        id: recordId,
        codeCampaignName,
        enabled,
        discountCode,
        valueType,
        value,
        minPurchase,
        progressTextBefore,
        progressTextAfter,
        progressTextBelow,
        priority,
        startsAt: startDate ? new Date(`${startDate}T${startTime}`).toISOString() : null,
        endsAt: hasEndDate && endDate ? new Date(`${endDate}T${endTime}`).toISOString() : null,
      },
      { method: "post", encType: "application/json" }
    );
  };

  const discountLabel =
    value
      ? valueType === "percent"
        ? `${value}% off`
        : `$${value} off`
      : "";

  return (
    <Page
      backAction={{ content: "Campaigns", onAction: () => navigate(withHost("/app/campaigns")) }}
      title={codeCampaignName || "Code Discount"}
      primaryAction={{ content: "Save", loading: isSaving, onAction: handleSave }}
      secondaryActions={[{
        content: enabled ? "Disable" : "Enable",
        onAction: () => setEnabled(v => !v),
      }]}
    >
      <style>{`.cd-layout{display:grid;grid-template-columns:1fr 320px;gap:20px;align-items:start}@media(max-width:900px){.cd-layout{grid-template-columns:1fr}}`}</style>
      {actionData?.error && (
        <Box paddingBlockEnd="400">
          <Banner tone="critical" title="Save failed">{actionData.error}</Banner>
        </Box>
      )}
      <Box paddingBlockEnd="800">
        <div className="cd-layout">
          {/* ── Main column ── */}
          <BlockStack gap="400">

            {/* Discount code */}
            <SectionCard icon={CodeIcon} title="Discount code">
              <BlockStack gap="400">
                <TextField
                  label="Discount code"
                  value={discountCode}
                  onChange={(v) => setDiscountCode(v.toUpperCase())}
                  autoComplete="off"
                  placeholder="e.g. SAVE15"
                  helpText="Enter the exact Shopify discount code. It will also be created / synced in your Shopify discounts."
                  prefix={<Icon source={ClipboardIcon} />}
                />

                <Divider />

                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">Discount type</Text>
                  <BlockStack gap="100">
                    <RadioButton
                      label="Percentage off"
                      helpText="e.g. 15% off the entire order."
                      checked={valueType === "percent"}
                      id="cd-vt-percent"
                      name="cdValueType"
                      onChange={() => setValueType("percent")}
                    />
                    <RadioButton
                      label="Fixed amount off"
                      helpText="e.g. $20 off the cart total."
                      checked={valueType === "amount"}
                      id="cd-vt-amount"
                      name="cdValueType"
                      onChange={() => setValueType("amount")}
                    />
                  </BlockStack>
                </BlockStack>

                <TextField
                  label={valueType === "percent" ? "Percentage off" : "Amount off"}
                  type="number"
                  value={value}
                  onChange={setValue}
                  autoComplete="off"
                  suffix={valueType === "percent" ? "%" : undefined}
                  prefix={valueType === "amount" ? "$" : undefined}
                  placeholder={valueType === "percent" ? "e.g. 15" : "e.g. 20"}
                />
              </BlockStack>
            </SectionCard>

            {/* Display condition */}
            <SectionCard icon={CodeIcon} title="Display condition">
              <BlockStack gap="300">
                <TextField
                  label="Minimum cart value to show this code (optional)"
                  type="number"
                  value={minPurchase}
                  onChange={setMinPurchase}
                  autoComplete="off"
                  prefix="$"
                  placeholder="e.g. 50"
                  helpText="Leave blank to always show the discount code in the cart."
                />
              </BlockStack>
            </SectionCard>

            {/* Messages */}
            <SectionCard icon={EditIcon} title="Progress messages (optional)">
              <BlockStack gap="300">
                <Banner tone="info">
                  Use <strong>{"{{discount_code}}"}</strong> to insert the code and <strong>{"{{amount}}"}</strong> for cart value.
                </Banner>
                <TextField
                  label="Message before minimum"
                  value={progressTextBefore}
                  onChange={setProgressTextBefore}
                  autoComplete="off"
                  placeholder="Spend {{amount}} more and use code {{discount_code}} for a discount!"
                />
                <TextField
                  label="Message after minimum"
                  value={progressTextAfter}
                  onChange={setProgressTextAfter}
                  autoComplete="off"
                  placeholder="Use code {{discount_code}} at checkout!"
                />
                <TextField
                  label="Message below the bar (optional)"
                  value={progressTextBelow}
                  onChange={setProgressTextBelow}
                  autoComplete="off"
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
                <Divider />
                <TextField
                  label="Priority"
                  type="number"
                  value={priority}
                  onChange={setPriority}
                  autoComplete="off"
                  helpText="Higher number = shown first when multiple code discount rules exist."
                />
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
                  options={[
                    { label: "Active", value: "true" },
                    { label: "Inactive", value: "false" },
                  ]}
                  value={String(enabled)}
                  onChange={(v) => setEnabled(v === "true")}
                />
                <TextField
                  label="Rule name"
                  value={codeCampaignName}
                  onChange={setCodeCampaignName}
                  autoComplete="off"
                />
              </BlockStack>
            </div>

            {/* Preview */}
            <div style={{ background: "#fff", border: "1px solid #e1e3e5", borderRadius: "10px", overflow: "hidden" }}>
              <Box padding="300" borderBlockEndWidth="025" borderColor="border">
                <Text variant="bodyMd" fontWeight="semibold" as="p">Preview</Text>
              </Box>
              <Box padding="300">
                <div style={{ borderRadius: "8px", background: "#fffbeb", padding: "14px 16px" }}>
                  <Text variant="bodySm" fontWeight="semibold" as="p">
                    {discountLabel ? `🏷️ Use code below for ${discountLabel}!` : "🏷️ Use this discount code!"}
                  </Text>
                  {discountCode && (
                    <Box paddingBlockStart="200">
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#fef3c7", border: "1.5px dashed #d97706", borderRadius: "6px", padding: "6px 12px" }}>
                        <Text variant="bodyMd" fontWeight="bold" as="span">{discountCode}</Text>
                        <span style={{ fontSize: "13px", cursor: "pointer" }}>📋</span>
                      </div>
                    </Box>
                  )}
                  <Box paddingBlockStart="200">
                    <Text variant="bodySm" tone="subdued" as="p">Live preview based on your settings.</Text>
                  </Box>
                </div>
              </Box>
            </div>
          </BlockStack>
        </div>
      </Box>
    </Page>
  );
}
