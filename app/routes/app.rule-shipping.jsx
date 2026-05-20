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
  DeliveryIcon, SettingsIcon, EditIcon,
  MinimizeIcon, MaximizeIcon, PauseCircleIcon,
  CalendarIcon, ClockIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { upsertFreeShipping } from "../shopify-discount.server";

// ─── Loader ──────────────────────────────────────────────────────────────────

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  let record = null;
  if (id) {
    record = await prisma.shippingRule.findFirst({
      where: { id: parseInt(id, 10), shop: session.shop },
    });
  }
  return { record };
};

// ─── Action ──────────────────────────────────────────────────────────────────

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const body = await request.json();
  const {
    id, campaignName, enabled, rewardType, amount, minSubtotal,
    method, progressTextBefore, progressTextAfter, progressTextBelow,
    startsAt, endsAt,
  } = body;

  const dbData = {
    shop,
    campaignName: campaignName || "Shipping Rule",
    enabled: enabled !== false,
    rewardType: rewardType || "free_shipping",
    amount: amount ? String(amount) : null,
    minSubtotal: minSubtotal ? String(minSubtotal) : "0",
    method: method || "Free Shipping",
    progressTextBefore: progressTextBefore || null,
    progressTextAfter: progressTextAfter || null,
    progressTextBelow: progressTextBelow || null,
    startsAt: startsAt ? new Date(startsAt) : null,
    endsAt: endsAt ? new Date(endsAt) : null,
    priority: 0,
  };

  try {
    if (rewardType === "free_shipping") {
      let existingShopifyId = null;
      if (id) {
        const existing = await prisma.shippingRule.findFirst({
          where: { id: parseInt(id, 10), shop },
          select: { shopifyRateId: true },
        });
        existingShopifyId = existing?.shopifyRateId || null;
      }
      try {
        const shopifyId = await upsertFreeShipping(admin, {
          existingId: existingShopifyId,
          title: campaignName || "Free Shipping",
          startsAt: startsAt || null,
          endsAt: endsAt || null,
          minSubtotal: minSubtotal || "0",
        });
        if (shopifyId) dbData.shopifyRateId = shopifyId;
      } catch (gqlErr) {
        console.error("[rule-shipping] Shopify sync failed:", gqlErr);
      }
    }

    let record;
    if (id) {
      const existing = await prisma.shippingRule.findFirst({ where: { id: parseInt(id, 10), shop } });
      if (!existing) return { error: "Rule not found" };
      record = await prisma.shippingRule.update({ where: { id: parseInt(id, 10) }, data: dbData });
    } else {
      record = await prisma.shippingRule.create({ data: dbData });
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

export default function RuleShipping() {
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
  const [campaignName, setCampaignName] = useState(r?.campaignName ?? "Shipping Rule");
  const [enabled, setEnabled] = useState(r?.enabled !== false);

  // Threshold
  const [rewardType, setRewardType] = useState(r?.rewardType ?? "free_shipping");
  const [minSubtotal, setMinSubtotal] = useState(r?.minSubtotal ?? "");
  const [amount, setAmount] = useState(r?.amount ?? "");
  const [method, setMethod] = useState(r?.method ?? "Free Shipping");

  // Progress messages
  const [progressTextBefore, setProgressTextBefore] = useState(
    r?.progressTextBefore ?? "Spend {{amount}} more for free shipping!"
  );
  const [progressTextAfter, setProgressTextAfter] = useState(
    r?.progressTextAfter ?? "You've unlocked free shipping! 🎉"
  );
  const [progressTextBelow, setProgressTextBelow] = useState(r?.progressTextBelow ?? "");

  // Schedule
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(r?.startsAt ? new Date(r.startsAt).toISOString().split("T")[0] : today);
  const [startTime, setStartTime] = useState(r?.startsAt ? new Date(r.startsAt).toTimeString().slice(0, 5) : "00:00");
  const [hasEndDate, setHasEndDate] = useState(!!r?.endsAt);
  const [endDate, setEndDate] = useState(r?.endsAt ? new Date(r.endsAt).toISOString().split("T")[0] : "");
  const [endTime, setEndTime] = useState(r?.endsAt ? new Date(r.endsAt).toTimeString().slice(0, 5) : "23:59");

  useEffect(() => {
    if (actionData?.success && navigation.state === "idle") navigate(withHost("/app/campaigns"));
  }, [actionData, navigation.state]);

  const handleSave = () => {
    submit(
      {
        id: recordId,
        campaignName,
        enabled,
        rewardType,
        minSubtotal,
        amount,
        method,
        progressTextBefore,
        progressTextAfter,
        progressTextBelow,
        startsAt: startDate ? new Date(`${startDate}T${startTime}`).toISOString() : null,
        endsAt: hasEndDate && endDate ? new Date(`${endDate}T${endTime}`).toISOString() : null,
      },
      { method: "post", encType: "application/json" }
    );
  };

  const [sliderValue, setSliderValue] = useState(50);
  const threshold = parseFloat(minSubtotal || 50);
  const mockCart = (threshold * sliderValue) / 100;
  const remaining = Math.max(0, threshold - mockCart).toFixed(2);
  const progressPct = sliderValue;
  const isUnlocked = sliderValue >= 100;

  return (
    <Page
      backAction={{ content: "Campaigns", onAction: () => navigate(withHost("/app/campaigns")) }}
      title={campaignName || "Shipping Rule"}
      primaryAction={{ content: "Save", loading: isSaving, onAction: handleSave }}
      secondaryActions={[{ content: enabled ? "Disable" : "Enable", onAction: () => setEnabled(v => !v) }]}
    >
      <style>{`.sr-layout{display:grid;grid-template-columns:1fr 320px;gap:20px;align-items:start}@media(max-width:900px){.sr-layout{grid-template-columns:1fr}}`}</style>
      {actionData?.error && (
        <Box paddingBlockEnd="400">
          <Banner tone="critical" title="Save failed">{actionData.error}</Banner>
        </Box>
      )}
      <Box paddingBlockEnd="800">
        <div className="sr-layout">
          {/* ── Main column ── */}
          <BlockStack gap="400">

            {/* Shipping threshold */}
            <SectionCard icon={DeliveryIcon} title="Shipping threshold">
              <BlockStack gap="400">
                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">Reward type</Text>
                  <BlockStack gap="100">
                    <RadioButton
                      label="Free shipping"
                      helpText="Remove shipping cost when cart meets the threshold."
                      checked={rewardType === "free_shipping"}
                      id="rt-free"
                      name="rewardType"
                      onChange={() => setRewardType("free_shipping")}
                    />
                    <RadioButton
                      label="Reduced rate"
                      helpText="Apply a flat discounted shipping rate."
                      checked={rewardType === "reduced_rate"}
                      id="rt-reduced"
                      name="rewardType"
                      onChange={() => setRewardType("reduced_rate")}
                    />
                  </BlockStack>
                </BlockStack>

                <Divider />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <TextField
                    label="Minimum cart value"
                    type="number"
                    value={minSubtotal}
                    onChange={setMinSubtotal}
                    autoComplete="off"
                    prefix="$"
                    placeholder="e.g. 50"
                    helpText="Cart must reach this value to unlock the reward."
                  />
                  {rewardType === "reduced_rate" && (
                    <TextField
                      label="Reduced rate amount"
                      type="number"
                      value={amount}
                      onChange={setAmount}
                      autoComplete="off"
                      prefix="$"
                      placeholder="e.g. 5"
                      helpText="Flat shipping rate to charge instead of standard rate."
                    />
                  )}
                </div>

                <TextField
                  label="Shipping method label"
                  value={method}
                  onChange={setMethod}
                  autoComplete="off"
                  placeholder="e.g. Free Shipping"
                  helpText="Name displayed to customers in checkout for this shipping method."
                />
              </BlockStack>
            </SectionCard>

            {/* Progress bar messages */}
            <SectionCard icon={EditIcon} title="Progress bar messages">
              <BlockStack gap="300">
                <Banner tone="info">
                  Use <strong>{"{{amount}}"}</strong> to insert the remaining amount dynamically.
                </Banner>
                <TextField
                  label="Message before threshold"
                  value={progressTextBefore}
                  onChange={setProgressTextBefore}
                  autoComplete="off"
                  placeholder="Spend {{amount}} more for free shipping!"
                  helpText="Shown on the progress bar while the cart is below the threshold."
                />
                <TextField
                  label="Message after threshold"
                  value={progressTextAfter}
                  onChange={setProgressTextAfter}
                  autoComplete="off"
                  placeholder="You've unlocked free shipping! 🎉"
                  helpText="Shown when the customer has met the threshold."
                />
                <TextField
                  label="Message below the bar (optional)"
                  value={progressTextBelow}
                  onChange={setProgressTextBelow}
                  autoComplete="off"
                  placeholder="e.g. Free returns on all orders."
                  helpText="Optional subtitle below the progress bar."
                />
              </BlockStack>
            </SectionCard>

            {/* Settings — active dates only */}
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
                      <Text variant="bodySm" fontWeight="semibold" as="p">{progressTextAfter || "You've unlocked free shipping! 🎉"}</Text>
                    ) : (
                      <span style={{ fontSize: "13px" }}>
                        {progressTextBefore.includes("{{amount}}")
                          ? <>{progressTextBefore.split("{{amount}}")[0]}<strong>${remaining}</strong>{progressTextBefore.split("{{amount}}")[1] ?? ""}</>
                          : progressTextBefore || `Spend $${remaining} more for free shipping!`}
                      </span>
                    )}
                  </div>
                  <div style={{ position: "relative", paddingRight: "44px" }}>
                    <div style={{ height: "4px", background: "#e1e3e5", borderRadius: "2px" }}>
                      <div style={{ height: "100%", width: `${progressPct}%`, background: isUnlocked ? "#16a34a" : "#111827", borderRadius: "2px", transition: "width 0.15s" }} />
                    </div>
                    <div style={{ position: "absolute", right: "0", top: "-10px", display: "flex", flexDirection: "column", alignItems: "center", gap: "1px" }}>
                      <Icon source={DeliveryIcon} tone={isUnlocked ? "success" : "base"} />
                      <span style={{ fontSize: "11px", color: isUnlocked ? "#16a34a" : "#6b7280", fontWeight: isUnlocked ? 600 : 400 }}>Free!</span>
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
