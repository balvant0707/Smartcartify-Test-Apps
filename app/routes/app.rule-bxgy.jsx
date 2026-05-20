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
  TransferInternalIcon, SettingsIcon, EditIcon,
  MinimizeIcon, MaximizeIcon, PauseCircleIcon,
  CalendarIcon, ClockIcon, GiftCardIcon, PersonFilledIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { upsertBxgy } from "../shopify-discount.server";

// ─── Loader ──────────────────────────────────────────────────────────────────

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  let record = null;
  if (id) {
    record = await prisma.bxgyRule.findFirst({
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
    id, campaignName, enabled, xQty, yQty, scope,
    appliesTo, giftType, giftSku, maxGifts, allowStacking,
    beforeOfferUnlockMessage, afterOfferUnlockMessage,
    startsAt, endsAt, priority,
    customerTarget, customerTags, abTestEnabled, abTestVariant, templateKey,
  } = body;

  const dbData = {
    shop,
    campaignName: campaignName || "Buy X Get Y",
    enabled: enabled !== false,
    xQty: xQty ? String(xQty) : "1",
    yQty: yQty ? String(yQty) : "1",
    scope: scope || "entire_store",
    appliesTo: appliesTo || null,
    giftType: giftType || "free_product",
    giftSku: giftSku ? String(giftSku) : null,
    maxGifts: maxGifts ? String(maxGifts) : null,
    allowStacking: allowStacking === true,
    appliesStore: scope === "entire_store",
    beforeOfferUnlockMessage: beforeOfferUnlockMessage || null,
    afterOfferUnlockMessage: afterOfferUnlockMessage || null,
    startsAt: startsAt ? new Date(startsAt) : null,
    endsAt: endsAt ? new Date(endsAt) : null,
    priority: parseInt(priority || "0") || 0,
    customerTarget: customerTarget || "all",
    customerTags: (customerTarget === "has_tag" || customerTarget === "no_tag") ? (customerTags || null) : null,
    abTestEnabled: abTestEnabled === true,
    abTestVariant: abTestEnabled ? (abTestVariant || null) : null,
    templateKey: templateKey || null,
  };

  try {
    let existingShopifyId = null;
    if (id) {
      const existing = await prisma.bxgyRule.findFirst({
        where: { id: parseInt(id, 10), shop },
        select: { buyxgetyId: true },
      });
      existingShopifyId = existing?.buyxgetyId || null;
    }

    try {
      const shopifyId = await upsertBxgy(admin, {
        existingId: existingShopifyId,
        title: campaignName || "Buy X Get Y",
        startsAt: startsAt || null,
        endsAt: endsAt || null,
        minReqType: "quantity",
        minQty: xQty || "1",
        minSpend: null,
        rewardQty: yQty || "1",
        rewardType: giftType || "free_product",
        rewardDiscount: null,
      });
      if (shopifyId) dbData.buyxgetyId = shopifyId;
    } catch (gqlErr) {
      console.error("[rule-bxgy] Shopify sync failed:", gqlErr);
    }

    let record;
    if (id) {
      const existing = await prisma.bxgyRule.findFirst({ where: { id: parseInt(id, 10), shop } });
      if (!existing) return { error: "Rule not found" };
      record = await prisma.bxgyRule.update({ where: { id: parseInt(id, 10) }, data: dbData });
    } else {
      record = await prisma.bxgyRule.create({ data: dbData });
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

export default function RuleBxgy() {
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
  const [campaignName, setCampaignName] = useState(r?.campaignName ?? "Buy X Get Y");
  const [enabled, setEnabled] = useState(r?.enabled !== false);

  // Buy requirement
  const [xQty, setXQty] = useState(r?.xQty ?? "2");
  const [scope, setScope] = useState(r?.scope ?? "entire_store");
  const [appliesTo, setAppliesTo] = useState(r?.appliesTo ?? "");

  // Get reward
  const [yQty, setYQty] = useState(r?.yQty ?? "1");
  const [giftType, setGiftType] = useState(r?.giftType ?? "free_product");
  const [giftSku, setGiftSku] = useState(r?.giftSku ?? "");
  const [maxGifts, setMaxGifts] = useState(r?.maxGifts ?? "");
  const [allowStacking, setAllowStacking] = useState(r?.allowStacking === true);

  // Messages
  const [beforeOfferUnlockMessage, setBeforeOfferUnlockMessage] = useState(
    r?.beforeOfferUnlockMessage ?? "Buy {{x}} more to unlock a free gift!"
  );
  const [afterOfferUnlockMessage, setAfterOfferUnlockMessage] = useState(
    r?.afterOfferUnlockMessage ?? "🎁 Free gift unlocked! Added to your cart."
  );

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
        xQty,
        yQty,
        scope,
        appliesTo,
        giftType,
        giftSku,
        maxGifts,
        allowStacking,
        beforeOfferUnlockMessage,
        afterOfferUnlockMessage,
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

  const xNum = parseInt(xQty || 2);
  const yNum = parseInt(yQty || 1);
  const MOCK_CART_QTY = 1;
  const remaining = Math.max(0, xNum - MOCK_CART_QTY);
  const isUnlocked = MOCK_CART_QTY >= xNum;
  const previewMsg = isUnlocked
    ? afterOfferUnlockMessage || "🎁 Free gift unlocked!"
    : beforeOfferUnlockMessage.replace("{{x}}", String(remaining)) || `Buy ${remaining} more to unlock!`;

  return (
    <Page
      backAction={{ content: "Campaigns", onAction: () => navigate(withHost("/app/campaigns")) }}
      title={campaignName || "Buy X Get Y Discount"}
      primaryAction={{ content: "Save", loading: isSaving, onAction: handleSave }}
      secondaryActions={[{ content: enabled ? "Disable" : "Enable", onAction: () => setEnabled(v => !v) }]}
    >
      <style>{`.bxgy-layout{display:grid;grid-template-columns:1fr 320px;gap:20px;align-items:start}@media(max-width:900px){.bxgy-layout{grid-template-columns:1fr}}`}</style>
      {actionData?.error && (
        <Box paddingBlockEnd="400">
          <Banner tone="critical" title="Save failed">{actionData.error}</Banner>
        </Box>
      )}
      <Box paddingBlockEnd="800">
        <div className="bxgy-layout">
          {/* ── Main column ── */}
          <BlockStack gap="400">

            {/* Buy requirement */}
            <SectionCard icon={TransferInternalIcon} title="Buy requirement (X)">
              <BlockStack gap="400">
                <TextField
                  label="Customer must buy (X) items"
                  type="number"
                  value={xQty}
                  onChange={setXQty}
                  autoComplete="off"
                  placeholder="e.g. 2"
                  helpText="Minimum quantity the customer must add to the cart to trigger the reward."
                />

                <Divider />

                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">Applies to</Text>
                  <BlockStack gap="100">
                    <RadioButton
                      label="Entire store"
                      helpText="Rule applies to any product in the store."
                      checked={scope === "entire_store"}
                      id="bxgy-scope-store"
                      name="bxgyScope"
                      onChange={() => setScope("entire_store")}
                    />
                    <RadioButton
                      label="Specific products"
                      helpText="Rule applies only to the products listed below."
                      checked={scope === "specific_products"}
                      id="bxgy-scope-products"
                      name="bxgyScope"
                      onChange={() => setScope("specific_products")}
                    />
                    <RadioButton
                      label="Specific collections"
                      helpText="Rule applies to products in the collections listed below."
                      checked={scope === "specific_collections"}
                      id="bxgy-scope-collections"
                      name="bxgyScope"
                      onChange={() => setScope("specific_collections")}
                    />
                  </BlockStack>
                </BlockStack>

                {scope !== "entire_store" && (
                  <TextField
                    label={scope === "specific_products" ? "Product IDs (comma-separated)" : "Collection IDs (comma-separated)"}
                    value={appliesTo}
                    onChange={setAppliesTo}
                    autoComplete="off"
                    multiline={3}
                    placeholder={scope === "specific_products" ? "gid://shopify/Product/123, gid://shopify/Product/456" : "gid://shopify/Collection/789"}
                    helpText="Enter Shopify GIDs or numeric IDs, separated by commas."
                  />
                )}
              </BlockStack>
            </SectionCard>

            {/* Get reward */}
            <SectionCard icon={GiftCardIcon} title="Get reward (Y)">
              <BlockStack gap="400">
                <TextField
                  label="Customer gets (Y) items free/discounted"
                  type="number"
                  value={yQty}
                  onChange={setYQty}
                  autoComplete="off"
                  placeholder="e.g. 1"
                  helpText="How many items the customer receives as the reward."
                />

                <Divider />

                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">Reward type</Text>
                  <BlockStack gap="100">
                    <RadioButton
                      label="Free product (100% off)"
                      helpText="The Y items are completely free."
                      checked={giftType === "free_product"}
                      id="bxgy-gift-free"
                      name="bxgyGiftType"
                      onChange={() => setGiftType("free_product")}
                    />
                    <RadioButton
                      label="Percentage discount"
                      helpText="The Y items receive a percentage discount."
                      checked={giftType === "percentage_off"}
                      id="bxgy-gift-pct"
                      name="bxgyGiftType"
                      onChange={() => setGiftType("percentage_off")}
                    />
                  </BlockStack>
                </BlockStack>

                <TextField
                  label="Specific gift product SKU or ID (optional)"
                  value={giftSku}
                  onChange={setGiftSku}
                  autoComplete="off"
                  placeholder="e.g. gid://shopify/Product/987654321"
                  helpText="If blank, the cheapest eligible item in the cart will be the reward."
                />

                <Divider />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <TextField
                    label="Max gifts per order (optional)"
                    type="number"
                    value={maxGifts}
                    onChange={setMaxGifts}
                    autoComplete="off"
                    placeholder="e.g. 1"
                    helpText="Leave blank for unlimited."
                  />
                </div>

                <Checkbox
                  label="Allow stacking with other discounts"
                  checked={allowStacking}
                  onChange={setAllowStacking}
                  helpText="If enabled, this BXGY discount can combine with other active discounts."
                />
              </BlockStack>
            </SectionCard>

            {/* Messages */}
            <SectionCard icon={EditIcon} title="Cart messages">
              <BlockStack gap="300">
                <Banner tone="info">
                  Use <strong>{"{{x}}"}</strong> for remaining items needed to unlock the reward.
                </Banner>
                <TextField
                  label="Message before reward is unlocked"
                  value={beforeOfferUnlockMessage}
                  onChange={setBeforeOfferUnlockMessage}
                  autoComplete="off"
                  placeholder="Buy {{x}} more to unlock a free gift!"
                />
                <TextField
                  label="Message after reward is unlocked"
                  value={afterOfferUnlockMessage}
                  onChange={setAfterOfferUnlockMessage}
                  autoComplete="off"
                  placeholder="🎁 Free gift unlocked! Added to your cart."
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
              <Box padding="300">
                <div style={{ border: "1px solid #e1e3e5", borderRadius: "8px", overflow: "hidden", fontSize: "12px" }}>
                  {/* Cart header */}
                  <div style={{ background: "#f9fafb", padding: "8px 12px", borderBottom: "1px solid #e1e3e5" }}>
                    <Text variant="bodySm" fontWeight="semibold" as="p">Your Cart</Text>
                  </div>
                  {/* BXGY offer banner */}
                  <div style={{ padding: "10px 12px" }}>
                    <div style={{ background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: "6px", padding: "10px", marginBottom: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "16px" }}>🛍</span>
                          <Text variant="bodySm" fontWeight="semibold" as="span">
                            Buy {xNum}, Get {yNum} {giftType === "free_product" ? "Free" : "Discounted"}
                          </Text>
                        </div>
                      </div>
                      {/* Progress dots */}
                      <div style={{ display: "flex", gap: "4px", marginBottom: "8px" }}>
                        {Array.from({ length: xNum }).map((_, i) => (
                          <div
                            key={i}
                            style={{
                              width: "20px", height: "20px", borderRadius: "4px",
                              background: i < MOCK_CART_QTY ? "#7c3aed" : "#ede9fe",
                              border: `1px solid ${i < MOCK_CART_QTY ? "#7c3aed" : "#ddd6fe"}`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: "10px", color: i < MOCK_CART_QTY ? "#fff" : "#7c3aed",
                            }}
                          >
                            {i < MOCK_CART_QTY ? "✓" : (i + 1)}
                          </div>
                        ))}
                        <span style={{ display: "flex", alignItems: "center", margin: "0 2px", color: "#7c3aed" }}>→</span>
                        <div style={{
                          width: "20px", height: "20px", borderRadius: "4px",
                          background: isUnlocked ? "#7c3aed" : "#f3f4f6",
                          border: "1px dashed #a78bfa",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "11px",
                        }}>
                          {isUnlocked ? "🎁" : "?"}
                        </div>
                      </div>
                      <Text variant="bodySm" as="p" tone={isUnlocked ? "success" : "subdued"}>{previewMsg}</Text>
                    </div>
                    {/* Cart item */}
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <Text variant="bodySm" tone="subdued" as="p">Item × {MOCK_CART_QTY}</Text>
                      <Text variant="bodySm" as="p">$29.99</Text>
                    </div>
                  </div>
                  {/* Footer */}
                  <div style={{ padding: "8px 12px", borderTop: "1px solid #e1e3e5", background: "#f9fafb" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <Text variant="bodySm" tone="subdued" as="p">Subtotal</Text>
                      <Text variant="bodySm" as="p">$29.99</Text>
                    </div>
                  </div>
                </div>
                <Box paddingBlockStart="200">
                  <Text variant="bodySm" tone="subdued" as="p">Live preview · cart has 1 item</Text>
                </Box>
              </Box>
            </div>
          </BlockStack>
        </div>
      </Box>
    </Page>
  );
}
