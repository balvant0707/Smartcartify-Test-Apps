import { useState, useEffect } from "react";
import {
  useNavigate, useSearchParams, useSubmit,
  useActionData, useLoaderData, useNavigation, useFetcher,
} from "react-router";
import {
  Page, Text, Box, BlockStack, InlineStack, Button,
  TextField, Select, Checkbox, Collapsible, Divider,
  Icon, RadioButton, Banner, Modal,
} from "@shopify/polaris";
import {
  TransferInternalIcon,
  MinimizeIcon, MaximizeIcon, PauseCircleIcon,
  CalendarIcon, ClockIcon, EditIcon, PersonFilledIcon,
  SearchIcon, XSmallIcon,
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
    appliesTo, giftType,
    beforeOfferUnlockMessage, afterOfferUnlockMessage,
    startsAt, endsAt, priority,
    customerTarget, customerTags,
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
    giftSku: null,
    maxGifts: null,
    allowStacking: false,
    appliesStore: scope === "entire_store",
    beforeOfferUnlockMessage: beforeOfferUnlockMessage || null,
    afterOfferUnlockMessage: afterOfferUnlockMessage || null,
    startsAt: startsAt ? new Date(startsAt) : null,
    endsAt: endsAt ? new Date(endsAt) : null,
    priority: parseInt(priority || "0") || 0,
    customerTarget: customerTarget || "all",
    customerTags: (customerTarget === "has_tag" || customerTarget === "no_tag") ? (customerTags || null) : null,
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

    const shopifyId = await upsertBxgy(admin, {
      existingId: existingShopifyId,
      title: campaignName || "Buy X Get Y",
      startsAt: startsAt || null,
      endsAt: endsAt || null,
      enabled: enabled !== false,
      minReqType: "quantity",
      minQty: xQty || "1",
      minSpend: null,
      rewardQty: yQty || "1",
      rewardType: giftType || "free_product",
      rewardDiscount: null,
    });
    if (shopifyId) dbData.buyxgetyId = shopifyId;

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

// ─── ResourcePickerModal ──────────────────────────────────────────────────────

function ResourcePickerModal({ open, onClose, title, items, multi = true, selected = [], onApply, emptyText = "No items found.", kindLabel = "items" }) {
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState([]);

  useEffect(() => {
    if (open) {
      setDraft(Array.isArray(selected) ? [...selected] : []);
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
        content: "Apply selection",
        onAction: () => { onApply(draft); onClose(); },
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

// ─── SelectedItemsDisplay ─────────────────────────────────────────────────────

function SelectedItemsDisplay({ ids, allItems, onRemove }) {
  if (!ids || ids.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
      {ids.map(id => {
        const found = allItems.find(i => i.id === id);
        const label = found?.title || id.split("/").pop() || id;
        return (
          <div key={id} style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#f0f7ff", border: "1px solid #bfdbfe", borderRadius: "4px", padding: "2px 6px 2px 8px", fontSize: "12px", fontWeight: 500 }}>
            <span style={{ maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
            <button type="button" onClick={() => onRemove(id)} style={{ background: "none", border: "none", cursor: "pointer", padding: "0 0 0 2px", color: "#6b7280", display: "flex", alignItems: "center" }}>
              <Icon source={XSmallIcon} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

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

  // Fetch products & collections for pickers
  const productFetcher = useFetcher();
  useEffect(() => {
    if (productFetcher.state === "idle" && !productFetcher.data) {
      productFetcher.load("/api/products");
    }
  }, []);
  const allProducts = productFetcher.data?.products || [];
  const allCollections = productFetcher.data?.collections || [];
  const productPickerItems = allProducts.map(p => ({ id: p.id, title: p.title, subtitle: p.price ? `$${p.price}` : undefined, image: p.image }));
  const collectionPickerItems = allCollections.map(c => ({ id: c.id, title: c.title, subtitle: c.handle ? `/${c.handle}` : undefined }));
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [collectionPickerOpen, setCollectionPickerOpen] = useState(false);

  // Parse stored appliesTo (could be JSON array or comma-separated string)
  const parseAppliesTo = (raw) => {
    if (!raw) return [];
    try { const arr = JSON.parse(raw); return Array.isArray(arr) ? arr : []; } catch { /* */ }
    return raw.split(",").map(s => s.trim()).filter(Boolean);
  };

  // Sidebar
  const [campaignName, setCampaignName] = useState(r?.campaignName ?? "Buy X Get Y");
  const [enabled, setEnabled] = useState(r?.enabled !== false);

  // Buy requirement
  const [xQty, setXQty] = useState(r?.xQty ?? "2");
  const [scope, setScope] = useState(r?.scope ?? "entire_store");
  const [appliesTo, setAppliesTo] = useState(() => parseAppliesTo(r?.appliesTo));

  // Get reward
  const [yQty, setYQty] = useState(r?.yQty ?? "1");
  const [giftType] = useState(r?.giftType ?? "free_product");

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

  // Content settings
  const [beforeOfferUnlockMessage, setBeforeOfferUnlockMessage] = useState(
    r?.beforeOfferUnlockMessage ?? "Add {{x}} more items to get {{y}} free"
  );
  const [afterOfferUnlockMessage, setAfterOfferUnlockMessage] = useState(
    r?.afterOfferUnlockMessage ?? "Congratulations! You've earned a free item"
  );

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
        appliesTo: appliesTo.length ? JSON.stringify(appliesTo) : null,
        giftType,
        beforeOfferUnlockMessage,
        afterOfferUnlockMessage,
        priority,
        startsAt: startDate ? new Date(`${startDate}T${startTime}`).toISOString() : null,
        endsAt: hasEndDate && endDate ? new Date(`${endDate}T${endTime}`).toISOString() : null,
        customerTarget,
        customerTags: (customerTarget === "has_tag" || customerTarget === "no_tag") ? customerTags : null,
      },
      { method: "post", encType: "application/json" }
    );
  };

  return (
    <Page
      backAction={{ content: "Campaigns", onAction: () => navigate(withHost("/app/campaigns")) }}
      title={campaignName || "Buy X Get Y Discount"}
      primaryAction={{ content: "Save", loading: isSaving, onAction: handleSave }}
      secondaryActions={[{ content: enabled ? "Disable" : "Enable", onAction: () => setEnabled(v => !v) }]}
    >
      <style>{`.bxgy-layout{display:grid;grid-template-columns:1fr 320px;gap:20px;align-items:start}.bxgy-field-row{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}.bxgy-choice-row{display:grid;grid-template-columns:1fr;gap:24px;align-items:start}.bxgy-radio-row{display:grid;gap:12px;align-items:start}.bxgy-radio-row--three{grid-template-columns:repeat(3,minmax(0,1fr))}@media(max-width:900px){.bxgy-layout{grid-template-columns:1fr}}@media(max-width:640px){.bxgy-field-row,.bxgy-radio-row--three{grid-template-columns:1fr}}`}</style>
      {actionData?.error && (
        <Box paddingBlockEnd="400">
          <Banner tone="critical" title="Save failed">{actionData.error}</Banner>
        </Box>
      )}
      <Box paddingBlockEnd="800">
        <div className="bxgy-layout">
          {/* ── Main column ── */}
          <BlockStack gap="400">

            <SectionCard icon={TransferInternalIcon} title="Buy X Get Y Discount">
              <BlockStack gap="400">
                <div className="bxgy-field-row">
                  <TextField
                    label="Customer must buy (X) items"
                    type="number"
                    value={xQty}
                    onChange={setXQty}
                    autoComplete="off"
                    placeholder="e.g. 2"
                    helpText="Minimum quantity the customer must add to the cart to trigger the reward."
                  />
                  <TextField
                    label="Customer gets (Y) items free/discounted"
                    type="number"
                    value={yQty}
                    onChange={setYQty}
                    autoComplete="off"
                    placeholder="e.g. 1"
                    helpText="How many items the customer receives as the reward."
                  />
                </div>

                <Divider />

                <div className="bxgy-choice-row">
                  <BlockStack gap="200">
                    <Text variant="bodyMd" fontWeight="semibold" as="p">Applies to</Text>
                    <div className="bxgy-radio-row bxgy-radio-row--three">
                      <RadioButton
                        label="Entire store"
                        checked={scope === "entire_store"}
                        id="bxgy-scope-store"
                        name="bxgyScope"
                        onChange={() => { setScope("entire_store"); setAppliesTo([]); }}
                      />
                      <RadioButton
                        label="Specific products"
                        checked={scope === "specific_products"}
                        id="bxgy-scope-products"
                        name="bxgyScope"
                        onChange={() => { setScope("specific_products"); setAppliesTo([]); }}
                      />
                      <RadioButton
                        label="Specific collections"
                        checked={scope === "specific_collections"}
                        id="bxgy-scope-collections"
                        name="bxgyScope"
                        onChange={() => { setScope("specific_collections"); setAppliesTo([]); }}
                      />
                    </div>
                  </BlockStack>

                </div>

                {scope === "specific_products" && (
                  <BlockStack gap="200">
                    <InlineStack align="space-between" blockAlign="center">
                      <BlockStack gap="050">
                        <Text variant="bodyMd" fontWeight="semibold" as="p">Selected products</Text>
                        <Text variant="bodySm" tone="subdued" as="p">
                          {appliesTo.length > 0 ? `${appliesTo.length} product${appliesTo.length !== 1 ? "s" : ""} selected` : "No products selected"}
                        </Text>
                      </BlockStack>
                      <Button size="slim" onClick={() => setProductPickerOpen(true)} loading={productFetcher.state === "loading"}>
                        {appliesTo.length > 0 ? "Edit products" : "Browse products"}
                      </Button>
                    </InlineStack>
                    <SelectedItemsDisplay ids={appliesTo} allItems={productPickerItems} onRemove={(id) => setAppliesTo(prev => prev.filter(x => x !== id))} />
                    {appliesTo.length > 0 && (
                      <Button size="slim" variant="plain" tone="critical" onClick={() => setAppliesTo([])}>Clear all</Button>
                    )}
                  </BlockStack>
                )}

                {scope === "specific_collections" && (
                  <BlockStack gap="200">
                    <InlineStack align="space-between" blockAlign="center">
                      <BlockStack gap="050">
                        <Text variant="bodyMd" fontWeight="semibold" as="p">Selected collections</Text>
                        <Text variant="bodySm" tone="subdued" as="p">
                          {appliesTo.length > 0 ? `${appliesTo.length} collection${appliesTo.length !== 1 ? "s" : ""} selected` : "No collections selected"}
                        </Text>
                      </BlockStack>
                      <Button size="slim" onClick={() => setCollectionPickerOpen(true)} loading={productFetcher.state === "loading"}>
                        {appliesTo.length > 0 ? "Edit collections" : "Browse collections"}
                      </Button>
                    </InlineStack>
                    <SelectedItemsDisplay ids={appliesTo} allItems={collectionPickerItems} onRemove={(id) => setAppliesTo(prev => prev.filter(x => x !== id))} />
                    {appliesTo.length > 0 && (
                      <Button size="slim" variant="plain" tone="critical" onClick={() => setAppliesTo([])}>Clear all</Button>
                    )}
                  </BlockStack>
                )}
              </BlockStack>
            </SectionCard>

            <SectionCard icon={EditIcon} title="Content Settings" defaultOpen={false}>
              <BlockStack gap="300">
                <div className="bxgy-field-row">
                  <TextField
                    label="Before Offer Unlock Message"
                    value={beforeOfferUnlockMessage}
                    onChange={setBeforeOfferUnlockMessage}
                    autoComplete="off"
                    helpText="Use {{x}} and {{y}} to mention quantities."
                  />
                  <TextField
                    label="After Offer Unlock Message"
                    value={afterOfferUnlockMessage}
                    onChange={setAfterOfferUnlockMessage}
                    autoComplete="off"
                    helpText="Celebrate the customer once they unlock the offer."
                  />
                </div>
                <TextField
                  label="Campaign name"
                  value={campaignName}
                  onChange={setCampaignName}
                  autoComplete="off"
                />
              </BlockStack>
            </SectionCard>

            <SectionCard icon={CalendarIcon} title="Schedule" defaultOpen={false}>
              <BlockStack gap="400">
                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">Active dates</Text>
                  <div style={{ border: "1px solid #e1e3e5", borderRadius: "8px", padding: "16px" }}>
                    <BlockStack gap="300">
                      <div className="bxgy-field-row">
                        <TextField label="Start date" type="date" value={startDate} onChange={setStartDate} prefix={<Icon source={CalendarIcon} />} autoComplete="off" />
                        <TextField label="Start time" type="time" value={startTime} onChange={setStartTime} prefix={<Icon source={ClockIcon} />} autoComplete="off" />
                      </div>
                      <Checkbox label="Set end date" checked={hasEndDate} onChange={setHasEndDate} />
                      {hasEndDate && (
                        <div className="bxgy-field-row">
                          <TextField label="End date" type="date" value={endDate} onChange={setEndDate} prefix={<Icon source={CalendarIcon} />} autoComplete="off" />
                          <TextField label="End time" type="time" value={endTime} onChange={setEndTime} prefix={<Icon source={ClockIcon} />} autoComplete="off" />
                        </div>
                      )}
                    </BlockStack>
                  </div>
                </BlockStack>
              </BlockStack>
            </SectionCard>

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

          </BlockStack>
        </div>
      </Box>

      {/* Product picker modal */}
      <ResourcePickerModal
        open={productPickerOpen}
        onClose={() => setProductPickerOpen(false)}
        title="Select products"
        items={productPickerItems}
        multi={true}
        selected={appliesTo}
        onApply={setAppliesTo}
        emptyText="No products available."
        kindLabel="products"
      />

      {/* Collection picker modal */}
      <ResourcePickerModal
        open={collectionPickerOpen}
        onClose={() => setCollectionPickerOpen(false)}
        title="Select collections"
        items={collectionPickerItems}
        multi={true}
        selected={appliesTo}
        onApply={setAppliesTo}
        emptyText="No collections available."
        kindLabel="collections"
      />
    </Page>
  );
}
