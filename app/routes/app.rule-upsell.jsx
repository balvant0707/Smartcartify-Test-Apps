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
  ProductIcon, SettingsIcon, EditIcon,
  MinimizeIcon, MaximizeIcon, PauseCircleIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

// ─── Loader ──────────────────────────────────────────────────────────────────
// UpsellSettings is a singleton per shop (unique on shop field).

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  let record = null;
  try {
    record = await prisma.upsellSettings.findUnique({
      where: { shop: session.shop },
    });
  } catch {
    // Table may not exist yet; return null so the form shows defaults.
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
      // Comma-separated → convert to JSON array
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

export default function RuleUpsell() {
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
  const isSaving = navigation.state === "submitting";

  // Display
  const [enabled, setEnabled] = useState(r?.enabled !== false);
  const [showAsSlider, setShowAsSlider] = useState(r?.showAsSlider !== false);
  const [autoplay, setAutoplay] = useState(r?.autoplay !== false);
  const [recommendationMode, setRecommendationMode] = useState(r?.recommendationMode ?? "auto");

  // Content
  const [sectionTitle, setSectionTitle] = useState(r?.sectionTitle ?? "You may also like");
  const [buttonText, setButtonText] = useState(r?.buttonText ?? "Add to cart");

  // Products (manual mode)
  const parseStoredIds = (raw) => {
    if (!raw) return "";
    try {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.join(", ") : String(raw);
    } catch {
      return String(raw);
    }
  };
  const [selectedProductIds, setSelectedProductIds] = useState(
    parseStoredIds(r?.selectedProductIds)
  );
  const [selectedCollectionIds, setSelectedCollectionIds] = useState(
    parseStoredIds(r?.selectedCollectionIds)
  );

  // Style
  const [buttonColor, setButtonColor] = useState(r?.buttonColor ?? "#111827");
  const [backgroundColor, setBackgroundColor] = useState(r?.backgroundColor ?? "#ffffff");
  const [textColor, setTextColor] = useState(r?.textColor ?? "#111827");
  const [borderColor, setBorderColor] = useState(r?.borderColor ?? "#e1e3e5");
  const [arrowColor, setArrowColor] = useState(r?.arrowColor ?? "#6b7280");

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
                  <Banner tone="info">
                    Enter Shopify Product GIDs or numeric IDs separated by commas.
                  </Banner>
                  <TextField
                    label="Product IDs"
                    value={selectedProductIds}
                    onChange={setSelectedProductIds}
                    autoComplete="off"
                    multiline={3}
                    placeholder="gid://shopify/Product/123, gid://shopify/Product/456"
                    helpText="These specific products will be shown as upsell recommendations."
                  />
                  <TextField
                    label="Collection IDs (optional)"
                    value={selectedCollectionIds}
                    onChange={setSelectedCollectionIds}
                    autoComplete="off"
                    multiline={2}
                    placeholder="gid://shopify/Collection/789"
                    helpText="Products from these collections will be included in recommendations."
                  />
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
            <div style={{ background: "#fff", border: "1px solid #e1e3e5", borderRadius: "10px", overflow: "hidden" }}>
              <Box padding="300" borderBlockEndWidth="025" borderColor="border">
                <Text variant="bodyMd" fontWeight="semibold" as="p">Preview</Text>
              </Box>
              <Box padding="300">
                <div style={{ border: "1px solid #e1e3e5", borderRadius: "8px", overflow: "hidden", fontSize: "12px" }}>
                  {/* Cart header */}
                  <div style={{ background: "#f9fafb", padding: "8px 12px", borderBottom: "1px solid #e1e3e5", display: "flex", justifyContent: "space-between" }}>
                    <Text variant="bodySm" fontWeight="semibold" as="p">Your Cart</Text>
                    <Text variant="bodySm" tone="subdued" as="p">1 item</Text>
                  </div>
                  {/* Cart item */}
                  <div style={{ padding: "8px 12px", borderBottom: "1px solid #e1e3e5" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
                  {/* Upsell section */}
                  <div style={{ background: backgroundColor || "#fff", padding: "10px 12px" }}>
                    <Text variant="bodySm" fontWeight="semibold" as="p" tone="subdued">
                      <span style={{ color: textColor || "#111827" }}>{sectionTitle || "You may also like"}</span>
                    </Text>
                    {/* Product cards */}
                    <div style={{ display: "flex", gap: "6px", marginTop: "8px", overflowX: "auto", paddingBottom: "2px" }}>
                      {[{ name: "Item A", price: "$19.99" }, { name: "Item B", price: "$24.99" }].map((p) => (
                        <div
                          key={p.name}
                          style={{
                            flex: "0 0 90px",
                            border: `1px solid ${borderColor || "#e1e3e5"}`,
                            borderRadius: "6px",
                            padding: "6px",
                            background: "#f9fafb",
                            textAlign: "center",
                          }}
                        >
                          <div style={{ height: "48px", background: "#e5e7eb", borderRadius: "4px", marginBottom: "5px" }} />
                          <Text variant="bodySm" as="p">{p.name}</Text>
                          <Text variant="bodySm" tone="subdued" as="p">{p.price}</Text>
                          <div style={{ marginTop: "5px", background: buttonColor || "#111827", borderRadius: "4px", padding: "3px 4px" }}>
                            <span style={{ color: "#fff", fontSize: "10px", fontWeight: 600 }}>
                              {buttonText || "Add to cart"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Footer */}
                  <div style={{ padding: "8px 12px", borderTop: "1px solid #e1e3e5", background: "#f9fafb" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <Text variant="bodySm" tone="subdued" as="p">Subtotal</Text>
                      <Text variant="bodySm" as="p">$39.99</Text>
                    </div>
                  </div>
                </div>
                <Box paddingBlockStart="200">
                  <Text variant="bodySm" tone="subdued" as="p">Live preview · cart drawer view</Text>
                </Box>
              </Box>
            </div>
          </BlockStack>
        </div>
      </Box>
    </Page>
  );
}
