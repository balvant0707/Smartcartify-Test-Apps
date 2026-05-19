import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useSubmit, useActionData, useLoaderData, useNavigation } from "react-router";
import {
  Page, Text, Box, BlockStack, InlineStack, Button, TextField,
  Select, Checkbox, Collapsible, Divider, Icon, Banner, RadioButton, Badge,
} from "@shopify/polaris";
import {
  DiscountIcon, SettingsIcon, EditIcon, MinimizeIcon, MaximizeIcon,
  PlusIcon, DeleteIcon, PauseCircleIcon, PersonFilledIcon, CalendarIcon,
  ClockIcon, SearchIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import { upsertDiscountCode } from "../shopify-discount.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  let record = null;
  if (id) {
    const raw = await prisma.campaign.findFirst({
      where: { id: parseInt(id), shop: session.shop, type: "volume-discount" },
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

  if (settings.shopifyDiscountCode) {
    const tiers = JSON.parse(settings.tiers || "[]");
    const lowestTier = tiers.sort((a, b) => parseInt(a.minQty) - parseInt(b.minQty))[0];
    if (lowestTier) {
      const existingId = id
        ? (await prisma.campaign.findFirst({ where: { id: parseInt(id), shop } }))?.shopifyDiscountId
        : null;
      settings.shopifyDiscountId = await upsertDiscountCode(admin, {
        existingId,
        title: name || "Volume Discount",
        code: settings.shopifyDiscountCode,
        startsAt,
        endsAt,
        isPercentage: settings.discountType === "percentage",
        discountValue: lowestTier.discount,
      }).catch(() => null);
    }
  }

  const dbData = {
    shop,
    type: "volume-discount",
    name: name || "Volume Discount",
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

function PillToggle({ options, value, onChange, fullWidth = false }) {
  return (
    <div style={{ display: fullWidth ? "flex" : "inline-flex", background: "#f1f1f1", borderRadius: "8px", padding: "3px", gap: "2px" }}>
      {options.map(opt => (
        <button key={opt.value} onClick={() => onChange(opt.value)} style={{
          flex: fullWidth ? 1 : undefined, padding: "6px 14px", borderRadius: "6px", border: "none", cursor: "pointer",
          fontWeight: value === opt.value ? "600" : "400", fontSize: "13px",
          background: value === opt.value ? "#fff" : "transparent",
          boxShadow: value === opt.value ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
          color: value === opt.value ? "#1a1a1a" : "#6d7175", transition: "all 0.12s", textAlign: "center",
        }}>{opt.label}</button>
      ))}
    </div>
  );
}

function TierRow({ tier, index, onUpdate, onRemove, discountType }) {
  return (
    <div style={{ border: "1px solid #e1e3e5", borderRadius: "8px", padding: "14px 16px", background: "#fafafa" }}>
      <InlineStack align="space-between" blockAlign="center">
        <InlineStack gap="200" blockAlign="center">
          <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#2563eb", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "700", flexShrink: 0 }}>
            {index + 1}
          </div>
          <Text variant="bodyMd" fontWeight="semibold" as="p">Tier {index + 1}</Text>
        </InlineStack>
        <Button variant="plain" tone="critical" icon={DeleteIcon} onClick={onRemove} />
      </InlineStack>
      <Box paddingBlockStart="300">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
          <TextField
            label="Min quantity"
            type="number"
            value={tier.minQty}
            onChange={v => onUpdate({ ...tier, minQty: v })}
            autoComplete="off"
            min="1"
            suffix="items"
          />
          <TextField
            label={discountType === "percentage" ? "Discount (%)" : "Discount ($)"}
            type="number"
            value={tier.discount}
            onChange={v => onUpdate({ ...tier, discount: v })}
            autoComplete="off"
            prefix={discountType === "fixed" ? "$" : undefined}
            suffix={discountType === "percentage" ? "%" : undefined}
            placeholder={discountType === "percentage" ? "e.g. 10" : "e.g. 5"}
          />
          <TextField
            label="Label (optional)"
            value={tier.label}
            onChange={v => onUpdate({ ...tier, label: v })}
            autoComplete="off"
            placeholder={`e.g. Buy ${tier.minQty || "N"}+`}
          />
        </div>
      </Box>
    </div>
  );
}

export default function VolumeDiscountCreate() {
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
  const [campaignName, setCampaignName] = useState(r?.name ?? "Volume Discount");
  const isSaving = navigation.state === "submitting";

  // Products
  const [appliesToType, setAppliesToType] = useState(r?.targetType ?? "specific_products");
  const [targetIds, setTargetIds] = useState(JSON.parse(r?.targetIds || "[]"));
  const [productTags, setProductTags] = useState(JSON.parse(r?.targetIds || "[]"));
  const [productSearch, setProductSearch] = useState("");

  // Discount type
  const [discountType, setDiscountType] = useState(r?.discountType ?? "percentage");

  // Tiers
  const [tiers, setTiers] = useState(JSON.parse(r?.tiers || JSON.stringify([
    { id: 1, minQty: "2", discount: "10", label: "Buy 2+" },
    { id: 2, minQty: "3", discount: "15", label: "Buy 3+" },
    { id: 3, minQty: "5", discount: "20", label: "Buy 5+" },
  ])));

  const addTier = () => setTiers(t => [...t, { id: Date.now(), minQty: "", discount: "", label: "" }]);
  const updateTier = (id, updated) => setTiers(t => t.map(x => x.id === id ? updated : x));
  const removeTier = (id) => setTiers(t => t.filter(x => x.id !== id));

  // Display
  const [showTable, setShowTable] = useState(r?.showTable ?? true);
  const [tableTitle, setTableTitle] = useState(r?.tableTitle ?? "Volume discounts");
  const [highlightActive, setHighlightActive] = useState(r?.highlightActive ?? true);
  const [showBadges, setShowBadges] = useState(r?.showBadges ?? true);

  // Shopify code
  const [shopifyCode, setShopifyCode] = useState(r?.shopifyDiscountCode ?? "");

  // Settings
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(r?.startsAt ? new Date(r.startsAt).toISOString().split("T")[0] : today);
  const [startTime, setStartTime] = useState(r?.startsAt ? new Date(r.startsAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) : "00:00");
  const [hasEndDate, setHasEndDate] = useState(!!r?.endsAt);
  const [endDate, setEndDate] = useState(r?.endsAt ? new Date(r.endsAt).toISOString().split("T")[0] : "");
  const [endTime, setEndTime] = useState(r?.endsAt ? new Date(r.endsAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) : "23:59");

  const isPaused = status !== "active";

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
        targetType: appliesToType,
        targetIds: JSON.stringify(productTags),
        discountType,
        tiers: JSON.stringify(tiers),
        shopifyDiscountCode: shopifyCode,
        shopifyDiscountId: loaderData?.record?.shopifyDiscountId || null,
        showTable,
        tableTitle,
        highlightActive,
        showBadges,
        startsAt: startDate ? new Date(`${startDate}T${startTime}`).toISOString() : null,
        endsAt: hasEndDate && endDate ? new Date(`${endDate}T${endTime}`).toISOString() : null,
      },
      { method: "post", encType: "application/json" }
    );
  };

  return (
    <Page
      backAction={{ content: "Campaigns", onAction: () => navigate(withHost("/app/campaigns")) }}
      title={campaignName || "Volume Discount"}
      primaryAction={{ content: "Save", loading: isSaving, onAction: handleSave }}
      secondaryActions={[{ content: status === "active" ? "Pause" : "Activate", onAction: () => setStatus(s => s === "active" ? "draft" : "active") }]}
    >
      <style>{`.vd-layout{display:grid;grid-template-columns:1fr 320px;gap:20px;align-items:start}@media(max-width:900px){.vd-layout{grid-template-columns:1fr}}`}</style>
      <Box paddingBlockEnd="800">
        <div className="vd-layout">
          <BlockStack gap="400">

            {/* Products */}
            <SectionCard icon={DiscountIcon} title="Applicable products">
              <BlockStack gap="300">
                <Text variant="bodyMd" fontWeight="semibold" as="p">Apply volume discount to</Text>
                <BlockStack gap="100">
                  <RadioButton label="Specific products" checked={appliesToType === "specific_products"} id="at-products" name="appliesToType" onChange={() => setAppliesToType("specific_products")} />
                  <RadioButton label="Specific collections" checked={appliesToType === "collections"} id="at-collections" name="appliesToType" onChange={() => setAppliesToType("collections")} />
                  <RadioButton label="All products" checked={appliesToType === "all"} id="at-all" name="appliesToType" onChange={() => setAppliesToType("all")} />
                </BlockStack>

                {(appliesToType === "specific_products" || appliesToType === "collections") && (
                  <BlockStack gap="200">
                    <TextField
                      label={appliesToType === "specific_products" ? "Search products" : "Search collections"}
                      value={productSearch}
                      onChange={setProductSearch}
                      autoComplete="off"
                      prefix={<Icon source={SearchIcon} />}
                      placeholder={appliesToType === "specific_products" ? "Search by name or SKU…" : "Search collection name…"}
                      connectedRight={
                        <Button onClick={() => { if (productSearch.trim()) { setProductTags(p => [...new Set([...p, productSearch.trim()])]); setProductSearch(""); } }}>Add</Button>
                      }
                    />
                    {productTags.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {productTags.map(t => (
                          <div key={t} style={{ background: "#f1f1f1", borderRadius: "6px", padding: "4px 10px", display: "flex", gap: "6px", alignItems: "center" }}>
                            <Text variant="bodySm" as="span">{t}</Text>
                            <button onClick={() => setProductTags(p => p.filter(x => x !== t))} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "14px", color: "#6d7175", padding: 0 }}>×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </BlockStack>
                )}
              </BlockStack>
            </SectionCard>

            {/* Tiers */}
            <SectionCard icon={DiscountIcon} title="Discount tiers">
              <BlockStack gap="400">
                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">Discount type</Text>
                  <PillToggle
                    fullWidth
                    options={[{ label: "Percentage off (%)", value: "percentage" }, { label: "Fixed amount off ($)", value: "fixed" }]}
                    value={discountType}
                    onChange={setDiscountType}
                  />
                </BlockStack>

                <Divider />

                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">Tiers</Text>
                  <Text variant="bodySm" tone="subdued" as="p">Define quantity thresholds and corresponding discounts. Customers automatically get the best tier they qualify for.</Text>
                  <BlockStack gap="200">
                    {tiers.map((tier, i) => (
                      <TierRow
                        key={tier.id}
                        tier={tier}
                        index={i}
                        discountType={discountType}
                        onUpdate={updated => updateTier(tier.id, updated)}
                        onRemove={() => removeTier(tier.id)}
                      />
                    ))}
                  </BlockStack>
                  <button
                    onClick={addTier}
                    style={{ width: "100%", padding: "10px", border: "1.5px dashed #c9cccf", borderRadius: "8px", background: "#f6f6f7", cursor: "pointer", fontSize: "14px", fontWeight: "500", color: "#202223", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                  >
                    <span style={{ fontSize: "18px", lineHeight: 1 }}>+</span> Add a tier
                  </button>
                </BlockStack>

                <Divider />

                <TextField
                  label="Shopify discount code (required for checkout)"
                  value={shopifyCode}
                  onChange={setShopifyCode}
                  autoComplete="off"
                  placeholder="e.g. VOLUME10"
                  helpText="Link an existing Shopify discount code for this to apply at checkout."
                />
              </BlockStack>
            </SectionCard>

            {/* Display */}
            <SectionCard icon={EditIcon} title="Display settings">
              <BlockStack gap="300">
                <Checkbox label="Show a volume discount table in the cart" checked={showTable} onChange={setShowTable} helpText="Displays a breakdown of all available tiers so customers know how much more they can save." />
                {showTable && (
                  <>
                    <TextField label="Table title" value={tableTitle} onChange={setTableTitle} autoComplete="off" placeholder="e.g. Volume discounts" />
                    <Checkbox label="Highlight the tier the customer currently qualifies for" checked={highlightActive} onChange={setHighlightActive} />
                  </>
                )}
                <Checkbox label="Show discount badges on cart line items" checked={showBadges} onChange={setShowBadges} helpText='E.g. a "Save 15%" badge appears next to items that qualify for a tier.' />
              </BlockStack>
            </SectionCard>

            {/* Settings */}
            <SectionCard icon={SettingsIcon} title="Settings">
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
                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">Target an audience</Text>
                  <div style={{ border: "1px solid #e1e3e5", borderRadius: "8px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "14px" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#ede9fe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#7c3aed" }}>
                      <Icon source={PersonFilledIcon} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <Text variant="bodyMd" fontWeight="semibold" as="p">Targeting everyone</Text>
                      <Text variant="bodySm" tone="subdued" as="p">Add a rule to target a specific group.</Text>
                    </div>
                    <Button size="slim">Add rule</Button>
                  </div>
                </BlockStack>
              </BlockStack>
            </SectionCard>

          </BlockStack>

          {/* Sidebar */}
          <BlockStack gap="300">
            {isPaused && (
              <div style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: "10px", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ color: "#92400e" }}><Icon source={PauseCircleIcon} /></span>
                <Text variant="bodyMd" fontWeight="semibold" as="p">This campaign is paused</Text>
              </div>
            )}
            <div style={{ background: "#fff", border: "1px solid #e1e3e5", borderRadius: "10px", padding: "16px" }}>
              <BlockStack gap="300">
                <Select label="Status" options={[{ label: "Draft", value: "draft" }, { label: "Active", value: "active" }, { label: "Paused", value: "paused" }]} value={status} onChange={setStatus} />
                <TextField label="Campaign name" value={campaignName} onChange={setCampaignName} autoComplete="off" />
              </BlockStack>
            </div>

            {/* Tier preview table */}
            <div style={{ background: "#fff", border: "1px solid #e1e3e5", borderRadius: "10px", overflow: "hidden" }}>
              <Box padding="300" borderBlockEndWidth="025" borderColor="border">
                <Text variant="bodyMd" fontWeight="semibold" as="p">Tier table preview</Text>
              </Box>
              <Box padding="300">
                <BlockStack gap="200">
                  <Text variant="bodySm" fontWeight="semibold" as="p">{tableTitle || "Volume discounts"}</Text>
                  <div style={{ border: "1px solid #e1e3e5", borderRadius: "6px", overflow: "hidden", fontSize: "12px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", background: "#f6f6f7", padding: "6px 10px", fontWeight: "600", borderBottom: "1px solid #e1e3e5" }}>
                      <span>Qty</span><span>Discount</span><span>Label</span>
                    </div>
                    {tiers.map((tier, i) => (
                      <div key={tier.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "6px 10px", borderBottom: i < tiers.length - 1 ? "1px solid #e1e3e5" : "none", background: highlightActive && i === 0 ? "#eff6ff" : "transparent" }}>
                        <span>{tier.minQty || "—"}+</span>
                        <span style={{ color: "#2563eb", fontWeight: "600" }}>{tier.discount ? (discountType === "percentage" ? `${tier.discount}%` : `$${tier.discount}`) : "—"}</span>
                        <span style={{ color: "#6d7175" }}>{tier.label || `Tier ${i + 1}`}</span>
                      </div>
                    ))}
                  </div>
                  {tiers.length === 0 && (
                    <Text variant="bodySm" tone="subdued" as="p">Add tiers to see the preview.</Text>
                  )}
                </BlockStack>
              </Box>
            </div>

            <Banner tone="info">
              <Text variant="bodySm" as="p">Customers automatically receive the highest tier discount they qualify for based on cart quantity.</Text>
            </Banner>
          </BlockStack>
        </div>
      </Box>
    </Page>
  );
}
