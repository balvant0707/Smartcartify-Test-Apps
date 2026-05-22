import { Fragment, useState, useEffect } from "react";
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
  ProductIcon, SettingsIcon, EditIcon,
  MinimizeIcon, MaximizeIcon, PauseCircleIcon,
  SearchIcon, XSmallIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

// ─── Loader ──────────────────────────────────────────────────────────────────

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  let record = null;
  try {
    record = await prisma.upsellSettings.findUnique({
      where: { shop: session.shop },
    });
  } catch {
    // Table may not exist yet
  }
  return { record };
};

// ─── Action ──────────────────────────────────────────────────────────────────

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const body = await request.json();
  const {
    enabled, showAsSlider, autoplay, recommendationMode,
    sectionTitle, buttonText,
    buttonColor, backgroundColor, textColor, borderColor, arrowColor,
    selectedProductIds, selectedCollectionIds,
  } = body;

  const parseIds = (raw) => {
    if (!raw) return null;
    if (typeof raw === "string") {
      const cleaned = raw.trim();
      if (!cleaned) return null;
      try { JSON.parse(cleaned); return cleaned; } catch { /* not json */ }
      const arr = cleaned.split(",").map(s => s.trim()).filter(Boolean);
      return arr.length ? JSON.stringify(arr) : null;
    }
    if (Array.isArray(raw)) return raw.length ? JSON.stringify(raw) : null;
    return null;
  };

  const dbData = {
    enabled: enabled !== false,
    showAsSlider: showAsSlider !== false,
    autoplay: autoplay !== false,
    recommendationMode: recommendationMode || "auto",
    sectionTitle: sectionTitle || "You may also like",
    buttonText: buttonText || "Add to cart",
    buttonColor: buttonColor || null,
    backgroundColor: backgroundColor || null,
    textColor: textColor || null,
    borderColor: borderColor || null,
    arrowColor: arrowColor || null,
    selectedProductIds: parseIds(selectedProductIds),
    selectedCollectionIds: parseIds(selectedCollectionIds),
  };

  try {
    await prisma.upsellSettings.upsert({
      where: { shop },
      update: dbData,
      create: { shop, ...dbData },
    });
    return { success: true };
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
        content: multi ? "Apply selection" : "Select",
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
          ) : (
            <div>
              {filtered.map(item => {
                const checked = draft.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => toggle(item.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "10px 4px",
                      borderBottom: "1px solid #f1f3f5",
                      cursor: "pointer",
                      background: checked ? "#f0f7ff" : "transparent",
                      borderRadius: "4px",
                      marginBottom: "2px",
                    }}
                  >
                    <Checkbox label="" labelHidden checked={checked} onChange={() => toggle(item.id)} />
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title}
                        style={{ width: "44px", height: "44px", objectFit: "cover", borderRadius: "6px", border: "1px solid #e1e3e5", flexShrink: 0 }}
                      />
                    ) : (
                      <div style={{ width: "44px", height: "44px", background: "#f1f3f5", borderRadius: "6px", border: "1px solid #e1e3e5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "18px" }}>
                        📦
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text variant="bodySm" fontWeight="semibold" as="p">{item.title}</Text>
                      {item.subtitle && (
                        <Text variant="bodySm" tone="subdued" as="p">{item.subtitle}</Text>
                      )}
                    </div>
                    {checked && (
                      <div style={{ color: "#2563eb", fontSize: "14px", fontWeight: 700, flexShrink: 0 }}>✓</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal.Section>
    </Modal>
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

// ─── SelectedItemsDisplay ─────────────────────────────────────────────────────

function SelectedItemsDisplay({ ids, allItems, onRemove, emptyLabel }) {
  if (ids.length === 0) {
    return <Text variant="bodySm" tone="subdued" as="p">{emptyLabel}</Text>;
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
      {ids.map(id => {
        const found = allItems.find(i => i.id === id);
        const label = found?.title || id.split("/").pop() || id;
        return (
          <div
            key={id}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              background: "#f0f7ff",
              border: "1px solid #bfdbfe",
              borderRadius: "4px",
              padding: "2px 6px 2px 8px",
              fontSize: "12px",
              fontWeight: 500,
            }}
          >
            <span style={{ maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
            <button
              type="button"
              onClick={() => onRemove(id)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "0 0 0 2px", color: "#6b7280", display: "flex", alignItems: "center" }}
            >
              <Icon source={XSmallIcon} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function RuleUpsell() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const host = searchParams.get("host");
  const withHost = (path) => host ? `${path}?host=${encodeURIComponent(host)}` : path;

  const loaderData = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const submit = useSubmit();
  const r = loaderData?.record;
  const isSaving = navigation.state === "submitting";

  // Fetch products & collections for pickers
  const productFetcher = useFetcher();
  useEffect(() => {
    if (productFetcher.state === "idle" && !productFetcher.data) {
      productFetcher.load("/api/products?includeCollectionProducts=1");
    }
  }, []);
  const allProducts = productFetcher.data?.products || [];
  const allCollections = productFetcher.data?.collections || [];

  const productPickerItems = allProducts.map(p => ({
    id: p.id,
    title: p.title,
    subtitle: p.price ? `$${p.price}` : undefined,
    image: p.image,
  }));
  const collectionPickerItems = allCollections.map(c => ({
    id: c.id,
    title: c.title,
    subtitle: c.handle ? `/${c.handle}` : undefined,
  }));

  // Picker modal states
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [collectionPickerOpen, setCollectionPickerOpen] = useState(false);

  // Parse stored GID arrays
  const parseStoredIds = (raw) => {
    if (!raw) return [];
    try {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch {
      if (typeof raw === "string" && raw.trim()) {
        return raw.split(",").map(s => s.trim()).filter(Boolean);
      }
      return [];
    }
  };

  // Which selection type is active in manual mode
  const [selectionType, setSelectionType] = useState(
    () => (parseStoredIds(r?.selectedCollectionIds).length > 0 && parseStoredIds(r?.selectedProductIds).length === 0)
      ? "collections" : "products"
  );

  const handleSelectionTypeChange = (type) => {
    setSelectionType(type);
    if (type === "products") setProductPickerOpen(true);
    else setCollectionPickerOpen(true);
  };

  // Display
  const [enabled, setEnabled] = useState(r?.enabled !== false);
  const [showAsSlider, setShowAsSlider] = useState(r?.showAsSlider !== false);
  const [autoplay, setAutoplay] = useState(r?.autoplay !== false);
  const [recommendationMode, setRecommendationMode] = useState(r?.recommendationMode ?? "auto");

  // Content
  const [sectionTitle, setSectionTitle] = useState(r?.sectionTitle ?? "You may also like");
  const [buttonText, setButtonText] = useState(r?.buttonText ?? "Add to cart");

  // Products (manual mode) — stored as arrays of GIDs
  const [selectedProductIds, setSelectedProductIds] = useState(() => parseStoredIds(r?.selectedProductIds));
  const [selectedCollectionIds, setSelectedCollectionIds] = useState(() => parseStoredIds(r?.selectedCollectionIds));

  // Style
  const [buttonColor, setButtonColor] = useState(r?.buttonColor ?? "#111827");
  const [backgroundColor, setBackgroundColor] = useState(r?.backgroundColor ?? "#ffffff");
  const [textColor, setTextColor] = useState(r?.textColor ?? "#111827");
  const [borderColor, setBorderColor] = useState(r?.borderColor ?? "#e1e3e5");
  const [arrowColor, setArrowColor] = useState(r?.arrowColor ?? "#6b7280");
  const [previewIndex, setPreviewIndex] = useState(0);

  useEffect(() => {
    if (actionData?.success && navigation.state === "idle") {
      navigate(withHost("/app/campaigns"));
    }
  }, [actionData, navigation.state]);

  const handleSave = () => {
    submit(
      {
        enabled,
        showAsSlider,
        autoplay,
        recommendationMode,
        sectionTitle,
        buttonText,
        selectedProductIds,
        selectedCollectionIds,
        buttonColor,
        backgroundColor,
        textColor,
        borderColor,
        arrowColor,
      },
      { method: "post", encType: "application/json" }
    );
  };

  const isLoadingPicker = productFetcher.state === "loading";
  const selectedProductsForPreview = selectedProductIds
    .map((id) => productPickerItems.find((product) => product.id === id))
    .filter(Boolean);
  const selectedCollectionsForPreview = selectedCollectionIds
    .map((id) => allCollections.find((collection) => collection.id === id))
    .filter(Boolean);
  const collectionProductsForPreview = selectedCollectionsForPreview
    .flatMap((collection) => collection.products || [])
    .map((product) => ({
      id: product.id,
      title: product.title,
      subtitle: product.price ? `$${product.price}` : undefined,
      image: product.image,
    }));
  const autoPreviewProducts = productPickerItems.slice(0, 4);
  const fallbackPreviewProducts = [
    { id: "preview-a", title: "Classic Tee", subtitle: "$24.00" },
    { id: "preview-b", title: "Canvas Tote", subtitle: "$18.00" },
    { id: "preview-c", title: "Travel Mug", subtitle: "$16.00" },
  ];
  const previewProducts =
    recommendationMode === "manual" && selectionType === "products"
      ? selectedProductsForPreview
      : recommendationMode === "manual" && selectionType === "collections"
        ? collectionProductsForPreview
        : autoPreviewProducts;
  const previewCards = (previewProducts.length ? previewProducts : fallbackPreviewProducts).slice(0, 4);
  const previewSelectionLabel =
    recommendationMode === "manual" && selectionType === "products"
      ? `${selectedProductIds.length} selected product${selectedProductIds.length === 1 ? "" : "s"}`
      : recommendationMode === "manual" && selectionType === "collections"
        ? `${selectedCollectionIds.length} selected collection${selectedCollectionIds.length === 1 ? "" : "s"}`
        : "Automatic recommendations";
  const previewEmptyManualSelection =
    recommendationMode === "manual" &&
    ((selectionType === "products" && selectedProductIds.length === 0) ||
      (selectionType === "collections" && selectedCollectionIds.length === 0));
  const activePreviewIndex = previewCards.length
    ? Math.min(previewIndex, previewCards.length - 1)
    : 0;
  const activePreviewProduct = previewCards[activePreviewIndex] || previewCards[0];
  const formatPreviewPrice = (value, fallback = "₹12,333.00") => {
    const raw = String(value || "").trim();
    const numeric = Number(raw.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
    return `₹${numeric.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };
  const previewPrice = formatPreviewPrice(
    activePreviewProduct?.subtitle || activePreviewProduct?.price
  );
  const previewComparePrice = formatPreviewPrice(
    activePreviewProduct?.compareAtPrice,
    ""
  );
  const movePreview = (direction) => {
    if (!previewCards.length) return;
    setPreviewIndex((current) => {
      const next = current + direction;
      if (next < 0) return previewCards.length - 1;
      if (next >= previewCards.length) return 0;
      return next;
    });
  };

  useEffect(() => {
    setPreviewIndex(0);
  }, [recommendationMode, selectionType, selectedProductIds.length, selectedCollectionIds.length]);

  return (
    <Page
      backAction={{ content: "Campaigns", onAction: () => navigate(withHost("/app/campaigns")) }}
      title="Upsell Product Rules"
      primaryAction={{ content: "Save", loading: isSaving, onAction: handleSave }}
      secondaryActions={[{
        content: enabled ? "Disable" : "Enable",
        onAction: () => setEnabled(v => !v),
      }]}
    >
      <style>{`.up-layout{display:grid;grid-template-columns:1fr 320px;gap:20px;align-items:start}@media(max-width:900px){.up-layout{grid-template-columns:1fr}}`}</style>
      {actionData?.error && (
        <Box paddingBlockEnd="400">
          <Banner tone="critical" title="Save failed">{actionData.error}</Banner>
        </Box>
      )}
      <Box paddingBlockEnd="800">
        <div className="up-layout">
          {/* ── Main column ── */}
          <BlockStack gap="400">

            {/* Display options */}
            <SectionCard icon={ProductIcon} title="Display options">
              <BlockStack gap="400">
                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">Recommendation mode</Text>
                  <BlockStack gap="100">
                    <RadioButton
                      label="Automatic recommendations"
                      helpText="Shopify automatically picks related products based on cart contents."
                      checked={recommendationMode === "auto"}
                      id="up-mode-auto"
                      name="upMode"
                      onChange={() => setRecommendationMode("auto")}
                    />
                    <RadioButton
                      label="Manual product selection"
                      helpText="Show only the products and collections you choose below."
                      checked={recommendationMode === "manual"}
                      id="up-mode-manual"
                      name="upMode"
                      onChange={() => setRecommendationMode("manual")}
                    />
                  </BlockStack>
                </BlockStack>

                <Divider />

                <Checkbox
                  label="Show as a sliding carousel"
                  checked={showAsSlider}
                  onChange={setShowAsSlider}
                  helpText="Products appear in a horizontal scrollable carousel instead of a grid."
                />
                {showAsSlider && (
                  <Checkbox
                    label="Autoplay carousel"
                    checked={autoplay}
                    onChange={setAutoplay}
                    helpText="Carousel auto-advances to the next product every few seconds."
                  />
                )}
              </BlockStack>
            </SectionCard>

            {/* Product selection (manual mode) */}
            {recommendationMode === "manual" && (
              <SectionCard icon={ProductIcon} title="Product selection">
                <BlockStack gap="400">

                  {/* Radio: Products or Collections */}
                  <BlockStack gap="200">
                    <Text variant="bodyMd" fontWeight="semibold" as="p">Select by</Text>
                    <BlockStack gap="100">
                      <div
                        onClick={() => handleSelectionTypeChange("products")}
                        style={{
                          display: "flex", alignItems: "flex-start", gap: "10px",
                          padding: "12px 14px",
                          border: `2px solid ${selectionType === "products" ? "#2563eb" : "#e1e3e5"}`,
                          borderRadius: "8px", cursor: "pointer",
                          background: selectionType === "products" ? "#f0f7ff" : "#fff",
                          transition: "all 0.15s",
                        }}
                      >
                        <div style={{ marginTop: "1px" }}>
                          <div style={{
                            width: "16px", height: "16px", borderRadius: "50%",
                            border: `2px solid ${selectionType === "products" ? "#2563eb" : "#9ca3af"}`,
                            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                          }}>
                            {selectionType === "products" && (
                              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#2563eb" }} />
                            )}
                          </div>
                        </div>
                        <div>
                          <Text variant="bodySm" fontWeight="semibold" as="p">Products</Text>
                          <Text variant="bodySm" tone="subdued" as="p">Pick specific products to show as upsells.</Text>
                        </div>
                        <div style={{ marginLeft: "auto" }}>
                          <Button
                            size="slim"
                            onClick={(e) => { e.stopPropagation(); setSelectionType("products"); setProductPickerOpen(true); }}
                            loading={isLoadingPicker}
                          >
                            {selectedProductIds.length > 0 ? `Edit (${selectedProductIds.length})` : "Browse"}
                          </Button>
                        </div>
                      </div>

                      <div
                        onClick={() => handleSelectionTypeChange("collections")}
                        style={{
                          display: "flex", alignItems: "flex-start", gap: "10px",
                          padding: "12px 14px",
                          border: `2px solid ${selectionType === "collections" ? "#2563eb" : "#e1e3e5"}`,
                          borderRadius: "8px", cursor: "pointer",
                          background: selectionType === "collections" ? "#f0f7ff" : "#fff",
                          transition: "all 0.15s",
                        }}
                      >
                        <div style={{ marginTop: "1px" }}>
                          <div style={{
                            width: "16px", height: "16px", borderRadius: "50%",
                            border: `2px solid ${selectionType === "collections" ? "#2563eb" : "#9ca3af"}`,
                            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                          }}>
                            {selectionType === "collections" && (
                              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#2563eb" }} />
                            )}
                          </div>
                        </div>
                        <div>
                          <Text variant="bodySm" fontWeight="semibold" as="p">Collections</Text>
                          <Text variant="bodySm" tone="subdued" as="p">Show all products from selected collections.</Text>
                        </div>
                        <div style={{ marginLeft: "auto" }}>
                          <Button
                            size="slim"
                            onClick={(e) => { e.stopPropagation(); setSelectionType("collections"); setCollectionPickerOpen(true); }}
                            loading={isLoadingPicker}
                          >
                            {selectedCollectionIds.length > 0 ? `Edit (${selectedCollectionIds.length})` : "Browse"}
                          </Button>
                        </div>
                      </div>
                    </BlockStack>
                  </BlockStack>

                  {/* Show selected items */}
                  {selectionType === "products" && selectedProductIds.length > 0 && (
                    <BlockStack gap="200">
                      <InlineStack align="space-between">
                        <Text variant="bodySm" tone="subdued" as="p">{selectedProductIds.length} product{selectedProductIds.length !== 1 ? "s" : ""} selected</Text>
                        <Button size="slim" variant="plain" tone="critical" onClick={() => setSelectedProductIds([])}>Clear all</Button>
                      </InlineStack>
                      <SelectedItemsDisplay
                        ids={selectedProductIds}
                        allItems={productPickerItems}
                        onRemove={(id) => setSelectedProductIds(prev => prev.filter(x => x !== id))}
                        emptyLabel=""
                      />
                    </BlockStack>
                  )}
                  {selectionType === "collections" && selectedCollectionIds.length > 0 && (
                    <BlockStack gap="200">
                      <InlineStack align="space-between">
                        <Text variant="bodySm" tone="subdued" as="p">{selectedCollectionIds.length} collection{selectedCollectionIds.length !== 1 ? "s" : ""} selected</Text>
                        <Button size="slim" variant="plain" tone="critical" onClick={() => setSelectedCollectionIds([])}>Clear all</Button>
                      </InlineStack>
                      <SelectedItemsDisplay
                        ids={selectedCollectionIds}
                        allItems={collectionPickerItems}
                        onRemove={(id) => setSelectedCollectionIds(prev => prev.filter(x => x !== id))}
                        emptyLabel=""
                      />
                    </BlockStack>
                  )}

                </BlockStack>
              </SectionCard>
            )}

            {/* Content */}
            <SectionCard icon={EditIcon} title="Content">
              <BlockStack gap="300">
                <TextField
                  label="Section title"
                  value={sectionTitle}
                  onChange={setSectionTitle}
                  autoComplete="off"
                  placeholder="You may also like"
                  helpText="Heading shown above the upsell product list in the cart drawer."
                />
                <TextField
                  label="Add to cart button text"
                  value={buttonText}
                  onChange={setButtonText}
                  autoComplete="off"
                  placeholder="Add to cart"
                  helpText="Text on the button that adds the upsell product to the cart."
                />
              </BlockStack>
            </SectionCard>

            {/* Style */}
            <SectionCard icon={SettingsIcon} title="Style" defaultOpen={false}>
              <BlockStack gap="400">
                <Text variant="bodyMd" fontWeight="semibold" as="p">Colors</Text>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  {[
                    { label: "Button color", value: buttonColor, onChange: setButtonColor },
                    { label: "Background color", value: backgroundColor, onChange: setBackgroundColor },
                    { label: "Text color", value: textColor, onChange: setTextColor },
                    { label: "Border color", value: borderColor, onChange: setBorderColor },
                    { label: "Arrow / icon color", value: arrowColor, onChange: setArrowColor },
                  ].map(({ label, value, onChange }) => (
                    <div key={label}>
                      <Text variant="bodySm" as="p" tone="subdued">{label}</Text>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
                        <input
                          type="color"
                          value={value || "#000000"}
                          onChange={(e) => onChange(e.target.value)}
                          style={{ width: "36px", height: "36px", border: "1px solid #e1e3e5", borderRadius: "6px", cursor: "pointer", padding: "2px" }}
                        />
                        <Text variant="bodySm" as="p">{value || "#000000"}</Text>
                      </div>
                    </div>
                  ))}
                </div>
              </BlockStack>
            </SectionCard>

          </BlockStack>

          {/* ── Sidebar ── */}
          <BlockStack gap="300">
            {!enabled && (
              <div style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: "10px", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ color: "#92400e" }}><Icon source={PauseCircleIcon} /></span>
                <Text variant="bodyMd" fontWeight="semibold" as="p">Upsell is disabled</Text>
              </div>
            )}

            <div style={{ background: "#fff", border: "1px solid #e1e3e5", borderRadius: "10px", padding: "16px" }}>
              <Select
                label="Status"
                options={[
                  { label: "Active", value: "true" },
                  { label: "Inactive", value: "false" },
                ]}
                value={String(enabled)}
                onChange={(v) => setEnabled(v === "true")}
              />
            </div>

            {/* Preview */}
            <div style={{ background: "#fff", border: "1px solid #dfe3e8", borderRadius: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", overflow: "hidden" }}>
              <Box padding="500">
                <Text variant="headingSm" fontWeight="semibold" as="h3">Preview</Text>
                <div style={{ marginTop: "18px", background: backgroundColor || "#fff", opacity: enabled ? 1 : 0.55, padding: "0 4px 8px" }}>
                  <div style={{ textAlign: "center", marginBottom: "12px" }}>
                    <div style={{ color: textColor || "#1f2937", fontSize: "18px", lineHeight: "24px", fontWeight: 800 }}>
                      {sectionTitle || "You may also like"}
                    </div>
                    <div style={{ color: "#6b7280", fontSize: "12px", lineHeight: "16px", marginTop: "2px" }}>
                      {previewSelectionLabel}
                    </div>
                    <div style={{ display: "none" }}>
                      <div style={{ width: "36px", height: "36px", background: "#e5e7eb", borderRadius: "4px", flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <Text variant="bodySm" fontWeight="semibold" as="p">Your Product</Text>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <Text variant="bodySm" tone="subdued" as="p">× 1</Text>
                          <Text variant="bodySm" as="p">$39.99</Text>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{ background: backgroundColor || "#fff", opacity: enabled ? 1 : 0.58 }}>
                    <div style={{ display: "none" }}>
                      <div style={{ minWidth: 0 }}>
                        <Text variant="bodySm" fontWeight="semibold" as="p">
                          <span style={{ color: textColor || "#111827" }}>{sectionTitle || "You may also like"}</span>
                        </Text>
                        <Text variant="bodySm" tone="subdued" as="p">{previewSelectionLabel}</Text>
                      </div>
                      {showAsSlider && (
                        <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                          <span style={{ width: "20px", height: "20px", borderRadius: "50%", border: `1px solid ${borderColor || "#e1e3e5"}`, color: arrowColor || "#6b7280", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "12px", lineHeight: 1 }}>&lt;</span>
                          <span style={{ width: "20px", height: "20px", borderRadius: "50%", border: `1px solid ${borderColor || "#e1e3e5"}`, color: arrowColor || "#6b7280", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "12px", lineHeight: 1 }}>&gt;</span>
                        </div>
                      )}
                    </div>

                    {previewEmptyManualSelection ? (
                      <div style={{ padding: "22px 14px", background: "#f8fafc", border: `1px dashed ${borderColor || "#d1d5db"}`, borderRadius: "8px", textAlign: "center" }}>
                        <Text variant="bodySm" tone="subdued" as="p">
                          Select {selectionType === "collections" ? "collections" : "products"} to preview the upsell items.
                        </Text>
                      </div>
                    ) : showAsSlider ? (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "32px minmax(0, 1fr) 32px",
                          gap: "10px",
                          alignItems: "center",
                          marginTop: "8px",
                        }}
                      >
                        {[activePreviewProduct].filter(Boolean).map((p) => (
                          <Fragment key={p.id || p.title}>
                            <button
                              type="button"
                              aria-label="Previous preview product"
                              onClick={() => movePreview(-1)}
                              disabled={previewCards.length < 2}
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "50%",
                                border: `1px solid ${borderColor || "#dfe3e8"}`,
                                background: "#fff",
                                color: arrowColor || "#6b7280",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: 0,
                                fontSize: "24px",
                                lineHeight: "24px",
                                cursor: previewCards.length > 1 ? "pointer" : "default",
                                opacity: previewCards.length > 1 ? 1 : 0.45,
                                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                              }}
                            >
                              &lsaquo;
                            </button>
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "86px minmax(0, 1fr)",
                                gap: "16px",
                                alignItems: "center",
                                minHeight: "126px",
                                padding: "16px",
                                background: "#f8fbff",
                                border: `1px solid ${borderColor || "#dfe7ef"}`,
                                borderRadius: "8px",
                              }}
                            >
                              {p.image ? (
                                <img
                                  src={p.image}
                                  alt={p.title}
                                  style={{
                                    width: "86px",
                                    height: "86px",
                                    objectFit: "cover",
                                    borderRadius: "8px",
                                    display: "block",
                                    background: "#f3f4f6",
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: "86px",
                                    height: "86px",
                                    borderRadius: "8px",
                                    background: "linear-gradient(135deg,#f3f4f6,#e5e7eb)",
                                  }}
                                />
                              )}
                              <div style={{ minWidth: 0 }}>
                                <div
                                  style={{
                                    color: textColor || "#111827",
                                    fontSize: "16px",
                                    lineHeight: "21px",
                                    fontWeight: 800,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {p.title || p.name || "Product"}
                                </div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "baseline", minWidth: 0, marginTop: "6px" }}>
                                  {previewComparePrice && (
                                    <span
                                      style={{
                                        color: "#8c8c8c",
                                        fontSize: "11px",
                                        lineHeight: "14px",
                                        textDecoration: "line-through",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {previewComparePrice}
                                    </span>
                                  )}
                                  <span
                                    style={{
                                      color: textColor || "#111827",
                                    fontSize: "14px",
                                    lineHeight: "18px",
                                    fontWeight: 800,
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {previewPrice}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "6px",
                                    background: buttonColor || "#111827",
                                    border: `1px solid ${buttonColor || "#111827"}`,
                                    borderRadius: "6px",
                                    color: "#fff",
                                    fontSize: "13px",
                                    lineHeight: "18px",
                                    fontWeight: 800,
                                    padding: "9px 14px",
                                    marginTop: "14px",
                                    maxWidth: "160px",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  <span style={{ fontSize: "16px", lineHeight: "16px" }}>+</span>
                                  <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{buttonText || "Add to cart"}</span>
                                </button>
                              </div>
                            </div>
                            <button
                              type="button"
                              aria-label="Next preview product"
                              onClick={() => movePreview(1)}
                              disabled={previewCards.length < 2}
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "50%",
                                border: `1px solid ${borderColor || "#dfe3e8"}`,
                                background: "#fff",
                                color: arrowColor || "#6b7280",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: 0,
                                fontSize: "24px",
                                lineHeight: "24px",
                                cursor: previewCards.length > 1 ? "pointer" : "default",
                                opacity: previewCards.length > 1 ? 1 : 0.45,
                                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                              }}
                            >
                              &rsaquo;
                            </button>
                          </Fragment>
                        ))}
                      </div>
                    ) : (
                      <div style={{ display: "grid", gap: "10px" }}>
                        {previewCards.slice(0, 3).map((p) => (
                          <div
                            key={p.id || p.title}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "58px minmax(0, 1fr) auto",
                              gap: "10px",
                              alignItems: "center",
                              border: `1px solid ${borderColor || "#e1e3e5"}`,
                              borderRadius: "7px",
                              padding: "10px",
                              background: "#f8fbff",
                            }}
                          >
                            {p.image ? (
                              <img
                                src={p.image}
                                alt={p.title}
                                style={{
                                  width: "58px",
                                  height: "58px",
                                  objectFit: "cover",
                                  borderRadius: "7px",
                                  display: "block",
                                  background: "#f3f4f6",
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: "58px",
                                  height: "58px",
                                  borderRadius: "7px",
                                  background: "linear-gradient(135deg,#f3f4f6,#e5e7eb)",
                                }}
                              />
                            )}
                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  color: textColor || "#111827",
                                  fontSize: "13px",
                                  lineHeight: "17px",
                                  fontWeight: 800,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {p.title || p.name || "Product"}
                              </div>
                              <div style={{ color: "#6b7280", fontSize: "12px", lineHeight: "16px", marginTop: "2px" }}>
                                {formatPreviewPrice(p.subtitle || p.price)}
                              </div>
                            </div>
                            <button
                              type="button"
                              style={{
                                background: buttonColor || "#111827",
                                border: "none",
                                borderRadius: "6px",
                                color: "#fff",
                                fontSize: "12px",
                                fontWeight: 800,
                                padding: "8px 10px",
                                maxWidth: "76px",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {buttonText || "Add"}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {showAsSlider && enabled && !previewEmptyManualSelection && (
                      <div style={{ display: "flex", gap: "6px", justifyContent: "center", marginTop: "12px" }}>
                        {previewCards.map((p, dot) => (
                          <button
                            key={p.id || dot}
                            type="button"
                            aria-label={`Show preview product ${dot + 1}`}
                            onClick={() => setPreviewIndex(dot)}
                            style={{
                              width: dot === activePreviewIndex ? "22px" : "7px",
                              height: "6px",
                              borderRadius: "999px",
                              border: "none",
                              background: dot === activePreviewIndex ? buttonColor || "#111827" : "#e5e7eb",
                              display: "block",
                              padding: 0,
                              cursor: "pointer",
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <Text variant="bodySm" tone="subdued" as="p">Subtotal</Text>
                      <Text variant="bodySm" as="p">$39.99</Text>
                    </div>
                  </div>
                </div>
                <Box paddingBlockStart="0">
                  <span style={{ display: "none" }}>Live preview</span>
                </Box>
              </Box>
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
        selected={selectedProductIds}
        onApply={setSelectedProductIds}
        emptyText="No products available. Make sure your store has products."
        kindLabel="products"
      />

      {/* Collection picker modal */}
      <ResourcePickerModal
        open={collectionPickerOpen}
        onClose={() => setCollectionPickerOpen(false)}
        title="Select collections"
        items={collectionPickerItems}
        multi={true}
        selected={selectedCollectionIds}
        onApply={setSelectedCollectionIds}
        emptyText="No collections available. Create collections in your Shopify admin."
        kindLabel="collections"
      />
    </Page>
  );
}
