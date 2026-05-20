import { useState, useEffect } from "react";
import {
  useNavigate, useSearchParams, useSubmit,
  useActionData, useLoaderData, useNavigation, useFetcher,
} from "react-router";
import {
  Page, Text, Box, BlockStack, InlineStack, Button,
  TextField, Select, Checkbox, Collapsible, Divider,
  Icon, Banner, Modal, Tabs,
} from "@shopify/polaris";
import {
  GiftCardIcon, SettingsIcon, EditIcon,
  MinimizeIcon, MaximizeIcon, PauseCircleIcon,
  CalendarIcon, ClockIcon, ProductIcon, PersonFilledIcon,
  SearchIcon, XSmallIcon,
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
    customerTarget, customerTags, cartStepName,
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
    customerTarget: customerTarget || "all",
    customerTags: (customerTarget === "has_tag" || customerTarget === "no_tag") ? (customerTags || null) : null,
    cartStepName: cartStepName || null,
  };

  try {
    let record;
    if (id) {
      const existing = await prisma.freeGiftRule.findFirst({ where: { id: parseInt(id, 10), shop } });
      if (!existing) return { error: "Rule not found" };
      record = await prisma.freeGiftRule.update({ where: { id: parseInt(id, 10) }, data: dbData });
    } else {
      record = await prisma.freeGiftRule.create({ data: dbData });
    }
    return { success: true, id: record.id };
  } catch (err) {
    return { error: err.message };
  }
};

// ─── ResourcePickerModal ──────────────────────────────────────────────────────

function ResourcePickerModal({ open, onClose, title, items, multi = true, selected = [], onApply, emptyText = "No items found.", kindLabel = "items" }) {
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState([]);

  useEffect(() => {
    if (open) {
      setDraft(multi ? (Array.isArray(selected) ? [...selected] : []) : (selected ? [selected] : []));
      setSearch("");
    }
  }, [open]);

  const filtered = search
    ? items.filter(item => item.title?.toLowerCase().includes(search.toLowerCase()))
    : items;

  const toggle = (id) => {
    setDraft(prev =>
      multi
        ? prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        : [id]
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      primaryAction={{
        content: multi ? "Apply selection" : "Select",
        onAction: () => { onApply(multi ? draft : (draft[0] || "")); onClose(); },
        disabled: draft.length === 0,
      }}
      secondaryActions={[{ content: "Cancel", onAction: onClose }]}
    >
      <Modal.Section>
        <TextField
          label="Search"
          labelHidden
          placeholder={`Search ${kindLabel}…`}
          value={search}
          onChange={setSearch}
          prefix={<Icon source={SearchIcon} />}
          autoComplete="off"
          clearButton
          onClearButtonClick={() => setSearch("")}
        />
      </Modal.Section>
      <Modal.Section>
        <div style={{ maxHeight: "340px", overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "24px 0", textAlign: "center" }}>
              <Text tone="subdued" as="p">{emptyText}</Text>
            </div>
          ) : filtered.map(item => {
            const checked = draft.includes(item.id);
            return (
              <div
                key={item.id}
                onClick={() => toggle(item.id)}
                style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 4px", borderBottom: "1px solid #f1f3f5", cursor: "pointer", background: checked ? "#f0f7ff" : "transparent", borderRadius: "4px", marginBottom: "2px" }}
              >
                <Checkbox label="" labelHidden checked={checked} onChange={() => toggle(item.id)} />
                {item.image ? (
                  <img src={item.image} alt={item.title} style={{ width: "44px", height: "44px", objectFit: "cover", borderRadius: "6px", border: "1px solid #e1e3e5", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: "44px", height: "44px", background: "#f1f3f5", borderRadius: "6px", border: "1px solid #e1e3e5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "18px" }}>📦</div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text variant="bodySm" fontWeight="semibold" as="p">{item.title}</Text>
                  {item.subtitle && <Text variant="bodySm" tone="subdued" as="p">{item.subtitle}</Text>}
                </div>
                {checked && <div style={{ color: "#2563eb", fontSize: "14px", fontWeight: 700, flexShrink: 0 }}>✓</div>}
              </div>
            );
          })}
        </div>
      </Modal.Section>
    </Modal>
  );
}

const TRIGGER_TABS = [
  { id: "trigger-amount", content: "Amount Discount" },
  { id: "trigger-quantity", content: "Quantity Discount" },
];

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
  const withHost = (path) => host ? `${path}?host=${encodeURIComponent(host)}` : path;

  const loaderData = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const submit = useSubmit();
  const r = loaderData?.record;
  const recordId = r?.id || null;
  const isSaving = navigation.state === "submitting";

  // Fetch products for picker
  const productFetcher = useFetcher();
  useEffect(() => {
    if (productFetcher.state === "idle" && !productFetcher.data) {
      productFetcher.load("/api/products");
    }
  }, []);
  const allProducts = productFetcher.data?.products || [];
  const productPickerItems = allProducts.map(p => ({
    id: p.id,
    title: p.title,
    subtitle: p.price ? `$${p.price}` : undefined,
    image: p.image,
  }));
  const [productPickerOpen, setProductPickerOpen] = useState(false);

  // Sidebar
  const [campaignName, setCampaignName] = useState(r?.campaignName ?? "Free Product");
  const [enabled, setEnabled] = useState(r?.enabled !== false);
  const [cartStepName, setCartStepName] = useState(r?.cartStepName ?? "");

  // Trigger condition
  const [triggerTabIdx, setTriggerTabIdx] = useState(r?.triggerType === "quantity" ? 1 : 0);
  const triggerType = triggerTabIdx === 0 ? "amount" : "quantity";
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
  const [startDate, setStartDate] = useState(r?.startsAt ? new Date(r.startsAt).toISOString().split("T")[0] : today);
  const [startTime, setStartTime] = useState(r?.startsAt ? new Date(r.startsAt).toTimeString().slice(0, 5) : "00:00");
  const [hasEndDate, setHasEndDate] = useState(!!r?.endsAt);
  const [endDate, setEndDate] = useState(r?.endsAt ? new Date(r.endsAt).toISOString().split("T")[0] : "");
  const [endTime, setEndTime] = useState(r?.endsAt ? new Date(r.endsAt).toTimeString().slice(0, 5) : "23:59");

  // Targeting & priority
  const [priority, setPriority] = useState(String(r?.priority ?? "0"));
  const [customerTarget, setCustomerTarget] = useState(r?.customerTarget ?? "all");
  const [customerTags, setCustomerTags] = useState(r?.customerTags ?? "");

  useEffect(() => {
    if (actionData?.success && navigation.state === "idle") navigate(withHost("/app/campaigns"));
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
        customerTarget,
        customerTags: (customerTarget === "has_tag" || customerTarget === "no_tag") ? customerTags : null,
        cartStepName,
      },
      { method: "post", encType: "application/json" }
    );
  };

  const [sliderValue, setSliderValue] = useState(50);
  const threshold = parseFloat(triggerType === "amount" ? (minPurchase || 75) : (minQuantity || 3));
  const mockCart = (threshold * sliderValue) / 100;
  const remaining = triggerType === "amount"
    ? Math.max(0, threshold - mockCart).toFixed(2)
    : Math.max(0, Math.ceil(threshold - mockCart)).toString();
  const progressPct = sliderValue;
  const isUnlocked = sliderValue >= 100;

  return (
    <Page
      backAction={{ content: "Campaigns", onAction: () => navigate(withHost("/app/campaigns")) }}
      title={campaignName || "Free Product Discount"}
      primaryAction={{ content: "Save", loading: isSaving, onAction: handleSave }}
      secondaryActions={[{ content: enabled ? "Disable" : "Enable", onAction: () => setEnabled(v => !v) }]}
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

            {/* Trigger condition + Gift product — merged */}
            <SectionCard icon={GiftCardIcon} title="Free gift product">
              <BlockStack gap="400">

                {/* Trigger tabs */}
                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">Unlock free gift when</Text>
                  <Tabs tabs={TRIGGER_TABS} selected={triggerTabIdx} onSelect={setTriggerTabIdx} />
                </BlockStack>
                <Box>
                  {triggerTabIdx === 0 ? (
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
                </Box>

                <Divider />

                {/* Product selector */}
                <BlockStack gap="300">
                  <InlineStack align="space-between" blockAlign="center">
                    <BlockStack gap="050">
                      <Text variant="bodyMd" fontWeight="semibold" as="p">Gift product</Text>
                      <Text variant="bodySm" tone="subdued" as="p">
                        {bonusProductId
                          ? (() => {
                              const found = productPickerItems.find(p => p.id === bonusProductId);
                              return found?.title || bonusProductId.split("/").pop() || "1 product selected";
                            })()
                          : "No product selected"}
                      </Text>
                    </BlockStack>
                    <Button
                      size="slim"
                      onClick={() => setProductPickerOpen(true)}
                      loading={productFetcher.state === "loading"}
                    >
                      {bonusProductId ? "Change product" : "Browse products"}
                    </Button>
                  </InlineStack>

                  {bonusProductId && (() => {
                    const found = productPickerItems.find(p => p.id === bonusProductId);
                    return (
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "#f0f7ff", border: "1px solid #bfdbfe", borderRadius: "6px", padding: "10px 12px" }}>
                        {found?.image ? (
                          <img src={found.image} alt={found.title} style={{ width: "44px", height: "44px", objectFit: "cover", borderRadius: "4px", border: "1px solid #e1e3e5", flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: "44px", height: "44px", background: "#e5e7eb", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "18px" }}>📦</div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Text variant="bodySm" fontWeight="semibold" as="p">{found?.title || bonusProductId.split("/").pop()}</Text>
                          {found?.subtitle && <Text variant="bodySm" tone="subdued" as="p">{found.subtitle}</Text>}
                        </div>
                        <button
                          type="button"
                          onClick={() => setBonusProductId("")}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", display: "flex", alignItems: "center" }}
                        >
                          <Icon source={XSmallIcon} />
                        </button>
                      </div>
                    );
                  })()}
                </BlockStack>

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
                <TextField
                  label="Cart step"
                  value={cartStepName}
                  onChange={setCartStepName}
                  autoComplete="off"
                  placeholder="e.g. Step 1"
                  helpText="Which cart step this rule appears on."
                />
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
                      <Text variant="bodySm" fontWeight="semibold" as="p">{progressTextAfter || "Your free gift has been added!"}</Text>
                    ) : (
                      <span style={{ fontSize: "13px" }}>
                        {progressTextBefore.includes("{{amount}}")
                          ? <>{progressTextBefore.split("{{amount}}")[0]}{triggerType === "amount" ? <strong>${remaining}</strong> : <strong>{remaining} {parseInt(remaining) !== 1 ? "items" : "item"}</strong>}{progressTextBefore.split("{{amount}}")[1] ?? ""}</>
                          : progressTextBefore || (triggerType === "amount" ? `Add $${remaining} more to unlock a free gift!` : `Add ${remaining} more item${parseInt(remaining) !== 1 ? "s" : ""} to unlock a free gift!`)}
                      </span>
                    )}
                  </div>
                  <div style={{ position: "relative", paddingRight: "44px" }}>
                    <div style={{ height: "4px", background: "#e1e3e5", borderRadius: "2px" }}>
                      <div style={{ height: "100%", width: `${progressPct}%`, background: isUnlocked ? "#16a34a" : "#111827", borderRadius: "2px", transition: "width 0.15s" }} />
                    </div>
                    <div style={{ position: "absolute", right: "0", top: "-10px", display: "flex", flexDirection: "column", alignItems: "center", gap: "1px" }}>
                      <Icon source={GiftCardIcon} tone={isUnlocked ? "success" : "base"} />
                      <span style={{ fontSize: "11px", color: isUnlocked ? "#16a34a" : "#6b7280", fontWeight: isUnlocked ? 600 : 400 }}>Free Gift!</span>
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

      {/* Gift product picker modal */}
      <ResourcePickerModal
        open={productPickerOpen}
        onClose={() => setProductPickerOpen(false)}
        title="Select gift product"
        items={productPickerItems}
        multi={false}
        selected={bonusProductId}
        onApply={(id) => setBonusProductId(id)}
        emptyText="No products available."
        kindLabel="products"
      />
    </Page>
  );
}
