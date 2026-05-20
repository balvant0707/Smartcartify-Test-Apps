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
  GiftCardIcon, SettingsIcon, EditIcon,
  MinimizeIcon, MaximizeIcon, PauseCircleIcon,
  CalendarIcon, ClockIcon, ProductIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

// ─── Loader ──────────────────────────────────────────────────────────────────

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  let record = null;
  if (id) {
    record = await prisma.freeGiftRule.findFirst({
      where: { id: parseInt(id, 10), shop: session.shop },
    });
  }
  return { record };
};

// ─── Action ──────────────────────────────────────────────────────────────────

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const body = await request.json();
  const {
    id, campaignName, enabled, trigger, triggerType, minPurchase, minQuantity,
    qty, limitPerOrder, bonusProductId,
    progressTextBefore, progressTextAfter, progressTextBelow,
    startsAt, endsAt, priority,
  } = body;

  const dbData = {
    shop,
    campaignName: campaignName || "Free Product",
    enabled: enabled !== false,
    trigger: trigger || "min_amount",
    triggerType: triggerType || "amount",
    minPurchase: minPurchase ? String(minPurchase) : null,
    minQuantity: minQuantity ? String(minQuantity) : null,
    qty: qty ? String(qty) : "1",
    limitPerOrder: limitPerOrder ? String(limitPerOrder) : null,
    bonusProductId: bonusProductId ? String(bonusProductId) : null,
    progressTextBefore: progressTextBefore || null,
    progressTextAfter: progressTextAfter || null,
    progressTextBelow: progressTextBelow || null,
    startsAt: startsAt ? new Date(startsAt) : null,
    endsAt: endsAt ? new Date(endsAt) : null,
    priority: parseInt(priority || "0") || 0,
  };

  try {
    let record;
    if (id) {
      const existing = await prisma.freeGiftRule.findFirst({
        where: { id: parseInt(id, 10), shop },
      });
      if (!existing) return { error: "Rule not found" };
      record = await prisma.freeGiftRule.update({
        where: { id: parseInt(id, 10) },
        data: dbData,
      });
    } else {
      record = await prisma.freeGiftRule.create({ data: dbData });
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

export default function RuleFreeProduct() {
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
  const [campaignName, setCampaignName] = useState(r?.campaignName ?? "Free Product");
  const [enabled, setEnabled] = useState(r?.enabled !== false);

  // Trigger condition
  const [triggerType, setTriggerType] = useState(r?.triggerType ?? "amount");
  const [minPurchase, setMinPurchase] = useState(r?.minPurchase ?? "");
  const [minQuantity, setMinQuantity] = useState(r?.minQuantity ?? "");

  // Gift setup
  const [bonusProductId, setBonusProductId] = useState(r?.bonusProductId ?? "");
  const [qty, setQty] = useState(r?.qty ?? "1");
  const [limitPerOrder, setLimitPerOrder] = useState(r?.limitPerOrder ?? "");

  // Progress messages
  const [progressTextBefore, setProgressTextBefore] = useState(
    r?.progressTextBefore ?? "Spend {{amount}} more to get a free gift!"
  );
  const [progressTextAfter, setProgressTextAfter] = useState(
    r?.progressTextAfter ?? "🎁 Your free gift has been added to the cart!"
  );
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
        campaignName,
        enabled,
        trigger: triggerType === "amount" ? "min_amount" : "min_quantity",
        triggerType,
        minPurchase,
        minQuantity,
        bonusProductId,
        qty,
        limitPerOrder,
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

  return (
    <Page
      backAction={{ content: "Campaigns", onAction: () => navigate(withHost("/app/campaigns")) }}
      title={campaignName || "Free Product Discount"}
      primaryAction={{ content: "Save", loading: isSaving, onAction: handleSave }}
      secondaryActions={[{
        content: enabled ? "Disable" : "Enable",
        onAction: () => setEnabled(v => !v),
      }]}
    >
      <style>{`.fp-layout{display:grid;grid-template-columns:1fr 320px;gap:20px;align-items:start}@media(max-width:900px){.fp-layout{grid-template-columns:1fr}}`}</style>
      {actionData?.error && (
        <Box paddingBlockEnd="400">
          <Banner tone="critical" title="Save failed">{actionData.error}</Banner>
        </Box>
      )}
      <Box paddingBlockEnd="800">
        <div className="fp-layout">
          {/* ── Main column ── */}
          <BlockStack gap="400">

            {/* Trigger condition */}
            <SectionCard icon={GiftCardIcon} title="Trigger condition">
              <BlockStack gap="400">
                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">Unlock free gift when</Text>
                  <BlockStack gap="100">
                    <RadioButton
                      label="Cart value reaches a minimum"
                      helpText="Unlock the free gift when the cart subtotal exceeds a threshold."
                      checked={triggerType === "amount"}
                      id="fp-tt-amount"
                      name="fpTriggerType"
                      onChange={() => setTriggerType("amount")}
                    />
                    <RadioButton
                      label="Cart quantity reaches a minimum"
                      helpText="Unlock the free gift when a minimum number of items are added."
                      checked={triggerType === "quantity"}
                      id="fp-tt-qty"
                      name="fpTriggerType"
                      onChange={() => setTriggerType("quantity")}
                    />
                  </BlockStack>
                </BlockStack>
                <Divider />
                {triggerType === "amount" ? (
                  <TextField
                    label="Minimum cart value"
                    type="number"
                    value={minPurchase}
                    onChange={setMinPurchase}
                    autoComplete="off"
                    prefix="$"
                    placeholder="e.g. 75"
                    helpText="Free gift is added automatically when this threshold is met."
                  />
                ) : (
                  <TextField
                    label="Minimum quantity"
                    type="number"
                    value={minQuantity}
                    onChange={setMinQuantity}
                    autoComplete="off"
                    placeholder="e.g. 3"
                    helpText="Free gift is added automatically when this quantity is in the cart."
                  />
                )}
              </BlockStack>
            </SectionCard>

            {/* Gift product */}
            <SectionCard icon={ProductIcon} title="Free gift product">
              <BlockStack gap="400">
                <Banner tone="info">
                  Enter the Shopify Product GID (e.g. <strong>gid://shopify/Product/123456789</strong>) or the numeric product ID.
                </Banner>
                <TextField
                  label="Product ID"
                  value={bonusProductId}
                  onChange={setBonusProductId}
                  autoComplete="off"
                  placeholder="e.g. gid://shopify/Product/123456789"
                  helpText="This product will be automatically added to the cart as a free gift."
                />
                <Divider />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <TextField
                    label="Gift quantity"
                    type="number"
                    value={qty}
                    onChange={setQty}
                    autoComplete="off"
                    placeholder="1"
                    helpText="How many free units to add."
                  />
                  <TextField
                    label="Limit per order (optional)"
                    type="number"
                    value={limitPerOrder}
                    onChange={setLimitPerOrder}
                    autoComplete="off"
                    placeholder="e.g. 1"
                    helpText="Max free gifts per order. Leave blank for unlimited."
                  />
                </div>
              </BlockStack>
            </SectionCard>

            {/* Progress bar messages */}
            <SectionCard icon={EditIcon} title="Progress bar messages">
              <BlockStack gap="300">
                <Banner tone="info">
                  Use <strong>{"{{amount}}"}</strong> for remaining amount or quantity.
                </Banner>
                <TextField
                  label="Message before threshold"
                  value={progressTextBefore}
                  onChange={setProgressTextBefore}
                  autoComplete="off"
                  placeholder="Spend {{amount}} more to get a free gift!"
                />
                <TextField
                  label="Message after threshold"
                  value={progressTextAfter}
                  onChange={setProgressTextAfter}
                  autoComplete="off"
                  placeholder="🎁 Your free gift has been added to the cart!"
                />
                <TextField
                  label="Message below the bar (optional)"
                  value={progressTextBelow}
                  onChange={setProgressTextBelow}
                  autoComplete="off"
                  placeholder="e.g. One free gift per order."
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
                  helpText="Higher number = applied first when multiple free product rules exist."
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
                  value={campaignName}
                  onChange={setCampaignName}
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
                <div style={{ background: "#eef3ff", borderRadius: "8px", padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                    <Icon source={GiftCardIcon} />
                    <Text variant="bodySm" fontWeight="semibold" as="span">
                      {progressTextBefore.replace("{{amount}}", `$${minPurchase || minQuantity || "75"}`) || "Add more to unlock a free gift!"}
                    </Text>
                  </div>
                  <div style={{ height: "6px", borderRadius: "3px", background: "#c7d7f9", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: "70%", background: "#4f6ef7", borderRadius: "3px" }} />
                  </div>
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
