import { useState, useEffect } from "react";
import {
  useNavigate, useSearchParams, useSubmit,
  useActionData, useLoaderData, useNavigation, redirect,
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
import { upsertShippingRate } from "../shopify-discount.server";

const CART_STEPS = ["Cart Step 1", "Cart Step 2", "Cart Step 3", "Cart Step 4"];
const DISABLED_CART_STEP_LABEL = "Cart Step 5";

function normalizeCartStep(value) {
  if (value === undefined || value === null) return "";
  const text = String(value).trim().toLowerCase();
  const compact = text.replace(/[_-]/g, "").replace(/\s+/g, "");
  const direct = compact.match(/^step([1-4])$/);
  if (direct) return `Cart Step ${direct[1]}`;
  const cartStep = compact.match(/^cartstep([1-4])$/);
  if (cartStep) return `Cart Step ${cartStep[1]}`;
  const number = text.match(/^([1-4])$/);
  return number ? `Cart Step ${number[1]}` : "";
}

async function nextCartStepForShop(shop) {
  const [shippingRows, discountRows, freeRows] = await Promise.all([
    prisma.shippingRule.findMany({
      where: { shop },
      select: { cartStepName: true },
    }),
    prisma.discountRule.findMany({
      where: { shop, type: { not: "code" } },
      select: { cartStepName: true },
    }),
    prisma.freeGiftRule.findMany({
      where: { shop },
      select: { cartStepName: true },
    }),
  ]);

  const usedSteps = new Set(
    [...shippingRows, ...discountRows, ...freeRows]
      .map((rule) => normalizeCartStep(rule.cartStepName))
      .filter(Boolean)
  );

  return CART_STEPS.find((step) => !usedSteps.has(step)) || "";
}

async function cartStepAlreadyUsed(shop, cartStepName, currentId = null) {
  const normalized = normalizeCartStep(cartStepName);
  if (!normalized) return false;

  const [shippingRows, discountRows, freeRows] = await Promise.all([
    prisma.shippingRule.findMany({
      where: { shop },
      select: { id: true, cartStepName: true },
    }),
    prisma.discountRule.findMany({
      where: { shop, type: { not: "code" } },
      select: { id: true, cartStepName: true },
    }),
    prisma.freeGiftRule.findMany({
      where: { shop },
      select: { id: true, cartStepName: true },
    }),
  ]);

  return [
    ...shippingRows
      .filter((rule) => !currentId || rule.id !== Number(currentId))
      .map((rule) => rule.cartStepName),
    ...discountRows.map((rule) => rule.cartStepName),
    ...freeRows.map((rule) => rule.cartStepName),
  ].some((value) => normalizeCartStep(value) === normalized);
}

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
  const defaultCartStepName = normalizeCartStep(record?.cartStepName) || await nextCartStepForShop(session.shop);
  return { record, defaultCartStepName, cartStepLimitReached: !record && !defaultCartStepName };
};

// ─── Action ──────────────────────────────────────────────────────────────────

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const host = url.searchParams.get("host");
  const campaignsUrl = host ? `/app/campaigns?host=${encodeURIComponent(host)}` : "/app/campaigns";
  const shop = session.shop;
  const body = await request.json();
  const {
    id, campaignName, enabled, rewardType, amount, minSubtotal, maxSubtotal,
    method, progressTextBefore, progressTextAfter, progressTextBelow,
    startsAt, endsAt, cartStepName,
  } = body;
  const normalizedCartStepName = normalizeCartStep(cartStepName);

  if (!normalizedCartStepName) {
    return { error: "Cart step must be Cart Step 1, Cart Step 2, Cart Step 3, or Cart Step 4." };
  }

  const existingCartStepName = id
    ? await prisma.shippingRule.findFirst({
        where: { id: parseInt(id, 10), shop },
        select: { cartStepName: true },
      })
    : null;
  const cartStepChanged =
    !id || normalizeCartStep(existingCartStepName?.cartStepName) !== normalizedCartStepName;

  if (cartStepChanged && await cartStepAlreadyUsed(shop, normalizedCartStepName, id)) {
    return { error: "This cart step is already used. Only four cart steps are allowed." };
  }

  if (
    minSubtotal !== "" &&
    minSubtotal !== null &&
    minSubtotal !== undefined &&
    maxSubtotal !== "" &&
    maxSubtotal !== null &&
    maxSubtotal !== undefined &&
    Number(maxSubtotal) < Number(minSubtotal)
  ) {
    return { error: "Maximum cart value must be greater than or equal to minimum cart value." };
  }

  const dbData = {
    shop,
    campaignName: campaignName || "Shipping Rule",
    enabled: enabled !== false,
    rewardType: rewardType || "free_shipping",
    amount: amount ? String(amount) : null,
    minSubtotal: minSubtotal ? String(minSubtotal) : "0",
    maxSubtotal: maxSubtotal ? String(maxSubtotal) : null,
    method: method || "Free Shipping",
    progressTextBefore: progressTextBefore || null,
    progressTextAfter: progressTextAfter || null,
    progressTextBelow: progressTextBelow || null,
    startsAt: startsAt ? new Date(startsAt) : null,
    endsAt: endsAt ? new Date(endsAt) : null,
    priority: 0,
    cartStepName: normalizedCartStepName,
  };

  try {
    let record;
    let existingShopifyId = null;
    if (id) {
      const existing = await prisma.shippingRule.findFirst({
        where: { id: parseInt(id, 10), shop },
        select: {
          id: true,
          shopifyRateId: true,
          shopifyMethodDefinitionId: true,
        },
      });
      if (!existing) return { error: "Rule not found" };
      existingShopifyId =
        existing.shopifyMethodDefinitionId ||
        (String(existing.shopifyRateId || "").includes("DeliveryMethodDefinition")
          ? existing.shopifyRateId
          : null);
      record = await prisma.shippingRule.update({
        where: { id: existing.id },
        data: dbData,
      });
    } else {
      record = await prisma.shippingRule.create({ data: dbData });
    }

    if (enabled !== false) {
      try {
        const shopifyId = await upsertShippingRate(admin, {
          existingId: existingShopifyId,
          title: method || campaignName || "Free Shipping",
          rewardType: rewardType || "free_shipping",
          amount: amount || "0",
          minSubtotal: minSubtotal || "0",
          maxSubtotal: maxSubtotal || null,
        });
        if (shopifyId) {
          record = await prisma.shippingRule.update({
            where: { id: record.id },
            data: {
              shopifyRateId: shopifyId,
              shopifyMethodDefinitionId: shopifyId,
            },
          });
        }
      } catch (gqlErr) {
        console.error("[rule-shipping] Shopify sync failed:", gqlErr);
        return {
          error: gqlErr.message || "Shopify shipping rate sync failed",
          id: record.id,
        };
      }
    }

    return redirect(campaignsUrl);
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
  const [cartStepName, setCartStepName] = useState(
    normalizeCartStep(r?.cartStepName) || loaderData?.defaultCartStepName || ""
  );
  const cartStepLimitReached = !recordId && Boolean(loaderData?.cartStepLimitReached);
  const cartStepDisplayValue = cartStepLimitReached ? DISABLED_CART_STEP_LABEL : cartStepName;

  // Threshold
  const [rewardType, setRewardType] = useState(r?.rewardType ?? "free_shipping");
  const [minSubtotal, setMinSubtotal] = useState(r?.minSubtotal ?? "");
  const [maxSubtotal, setMaxSubtotal] = useState(r?.maxSubtotal ?? "");
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
        maxSubtotal,
        amount,
        method,
        progressTextBefore,
        progressTextAfter,
        progressTextBelow,
        cartStepName: normalizeCartStep(cartStepName),
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
      primaryAction={{ content: "Save", loading: isSaving, disabled: cartStepLimitReached, onAction: handleSave }}
      secondaryActions={[{ content: enabled ? "Disable" : "Enable", onAction: () => setEnabled(v => !v) }]}
    >
      <style>{`.sr-layout{display:grid;grid-template-columns:1fr 320px;gap:20px;align-items:start}.sr-radio-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;align-items:start}@media(max-width:900px){.sr-layout{grid-template-columns:1fr}}@media(max-width:640px){.sr-radio-row{grid-template-columns:1fr}}`}</style>
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
                  <div className="sr-radio-row">
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
                  </div>
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
                  <TextField
                    label="Maximum cart value"
                    type="number"
                    value={maxSubtotal}
                    onChange={setMaxSubtotal}
                    autoComplete="off"
                    prefix="$"
                    placeholder="Optional"
                    helpText="Optional upper cart value where this shipping rate stops applying."
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
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
            <SectionCard icon={CalendarIcon} title="Schedule" defaultOpen={false}>
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
                <TextField
                  label="Cart step"
                  value={cartStepDisplayValue}
                  onChange={setCartStepName}
                  autoComplete="off"
                  disabled={cartStepLimitReached}
                  placeholder="e.g. Cart Step 1"
                  helpText={cartStepLimitReached ? "Cart Step 5 is disabled. Only 4 cart steps are allowed." : "Which cart step this rule appears on."}
                />
              </BlockStack>
            </div>

            {/* Preview */}
            <div style={{ background: "#fff", border: "1px solid #e1e3e5", borderRadius: "10px", overflow: "hidden" }}>
              <Box padding="300" borderBlockEndWidth="025" borderColor="border">
                <Text variant="bodyMd" fontWeight="semibold" as="p">Preview</Text>
              </Box>
              <div style={{ minHeight: "150px", background: "#f7f7f7", padding: "18px 20px 24px", borderBottom: "1px solid #e1e3e5" }}>
                <div style={{ textAlign: "center", minHeight: "28px", lineHeight: "1.4", fontSize: "13px", fontWeight: 600 }}>
                  <div>
                    {isUnlocked ? (
                      <Text variant="bodySm" fontWeight="semibold" as="p">{progressTextAfter || "You've unlocked free shipping! 🎉"}</Text>
                    ) : (
                      <span>
                        {progressTextBefore.includes("{{amount}}")
                          ? <>{progressTextBefore.split("{{amount}}")[0]}<strong>${remaining}</strong>{progressTextBefore.split("{{amount}}")[1] ?? ""}</>
                          : progressTextBefore || `Spend $${remaining} more for free shipping!`}
                      </span>
                    )}
                  </div>
                  <div style={{ position: "relative", marginTop: "10px", paddingBottom: "44px" }}>
                    <div style={{ height: "6px", background: "#e1e3e5", borderRadius: "999px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${progressPct}%`, background: isUnlocked ? "#000" : "#d8dde6", borderRadius: "999px", transition: "width 0.15s" }} />
                    </div>
                    <div style={{ position: "absolute", left: isUnlocked ? "100%" : `${Math.min(92, Math.max(8, progressPct))}%`, top: "-8px", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", color: "#303030" }}>
                      <span style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#303030", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                        {isUnlocked ? <span style={{ fontSize: "16px", lineHeight: 1, fontWeight: 700 }}>✓</span> : <Icon source={DeliveryIcon} />}
                      </span>
                      <span style={{ marginTop: "5px", fontSize: "14px", lineHeight: "15px", textAlign: "center", whiteSpace: "pre-line" }}>Free{"\n"}Shipping!</span>
                    </div>
                  </div>
                </div>
              </div>
              <Box padding="400">
                <BlockStack gap="200">
                  <Text variant="bodyLg" as="p">Use this to adjust the progress bar</Text>
                  <input
                    type="range" min="0" max="100" value={sliderValue}
                    onChange={(e) => setSliderValue(parseInt(e.target.value))}
                    style={{ width: "100%", cursor: "pointer", accentColor: "#303030" }}
                  />
                </BlockStack>
              </Box>
            </div>
          </BlockStack>
        </div>
      </Box>
    </Page>
  );
}
