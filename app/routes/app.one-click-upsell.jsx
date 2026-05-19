import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  Page, Text, Box, BlockStack, InlineStack, Button, TextField,
  Select, Checkbox, Collapsible, Divider, Icon, Banner,
  RadioButton, Badge, Thumbnail,
} from "@shopify/polaris";
import {
  CartIcon, SettingsIcon, EditIcon, MinimizeIcon, MaximizeIcon,
  SearchIcon, DeleteIcon, PauseCircleIcon, PersonFilledIcon,
  CalendarIcon, ClockIcon, CheckboxIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return {};
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

export default function OneClickUpsellCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const host = searchParams.get("host");
  const withHost = (path) => host ? `${path}?host=${encodeURIComponent(host)}` : path;
  const [status, setStatus] = useState("draft");
  const [campaignName, setCampaignName] = useState("One Click Upsell");
  const [isSaving, setIsSaving] = useState(false);

  // Upsell product
  const [productSearch, setProductSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [variantOption, setVariantOption] = useState("default");
  const [upsellQty, setUpsellQty] = useState("1");

  // Display
  const [checkboxLabel, setCheckboxLabel] = useState("");
  const [checkboxDesc, setCheckboxDesc] = useState("");
  const [showImage, setShowImage] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [position, setPosition] = useState("below_items");
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountType, setDiscountType] = useState("percentage");
  const [discountValue, setDiscountValue] = useState("");

  // Conditions
  const [showWhen, setShowWhen] = useState("always");
  const [triggerProducts, setTriggerProducts] = useState([]);
  const [triggerSearch, setTriggerSearch] = useState("");
  const [minCartValue, setMinCartValue] = useState("");

  // Settings
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(today);
  const [startTime, setStartTime] = useState("00:00");
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("23:59");

  const isPaused = status !== "active";

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => { setIsSaving(false); navigate(withHost("/app/campaigns")); }, 800);
  };

  return (
    <Page
      backAction={{ content: "Campaigns", onAction: () => navigate(withHost("/app/campaigns")) }}
      title={campaignName || "One Click Upsell"}
      primaryAction={{ content: "Save", loading: isSaving, onAction: handleSave }}
      secondaryActions={[{ content: status === "active" ? "Pause" : "Activate", onAction: () => setStatus(s => s === "active" ? "draft" : "active") }]}
    >
      <style>{`.ocu-layout{display:grid;grid-template-columns:1fr 320px;gap:20px;align-items:start}@media(max-width:900px){.ocu-layout{grid-template-columns:1fr}}`}</style>
      <Box paddingBlockEnd="800">
        <div className="ocu-layout">
          <BlockStack gap="400">

            {/* Upsell Product */}
            <SectionCard icon={CartIcon} title="Upsell product">
              <BlockStack gap="400">
                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">Search product to upsell</Text>
                  <Text variant="bodySm" tone="subdued" as="p">This product will appear as a one-click add-on in the cart.</Text>
                  <TextField
                    label="Search product"
                    value={productSearch}
                    onChange={v => { setProductSearch(v); setSelectedProduct(null); }}
                    autoComplete="off"
                    prefix={<Icon source={SearchIcon} />}
                    placeholder="Search by product name or SKU…"
                  />
                  {productSearch && !selectedProduct && (
                    <div
                      onClick={() => setSelectedProduct(productSearch)}
                      style={{ border: "1px solid #e1e3e5", borderRadius: "8px", padding: "10px 14px", background: "#f6f6f7", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
                    >
                      <div style={{ width: "40px", height: "40px", borderRadius: "6px", background: "#e1e3e5", flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <Text variant="bodyMd" fontWeight="semibold" as="p">{productSearch}</Text>
                        <Text variant="bodySm" tone="subdued" as="p">Click to select</Text>
                      </div>
                    </div>
                  )}
                  {selectedProduct && (
                    <div style={{ border: "1.5px solid #008060", borderRadius: "8px", padding: "10px 14px", background: "#f0fdf4", display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "40px", height: "40px", borderRadius: "6px", background: "#bbf7d0", flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <Text variant="bodyMd" fontWeight="semibold" as="p">{selectedProduct}</Text>
                        <Badge tone="success" size="small">Selected</Badge>
                      </div>
                      <Button variant="plain" tone="critical" icon={DeleteIcon} onClick={() => { setSelectedProduct(null); setProductSearch(""); }} />
                    </div>
                  )}
                </BlockStack>

                <BlockStack gap="200">
                  <Select
                    label="Product variant"
                    options={[
                      { label: "Default / first variant", value: "default" },
                      { label: "Let customer choose", value: "customer_choice" },
                    ]}
                    value={variantOption}
                    onChange={setVariantOption}
                  />
                  <div style={{ maxWidth: "140px" }}>
                    <TextField label="Quantity" type="number" value={upsellQty} onChange={setUpsellQty} autoComplete="off" min="1" suffix="item(s)" />
                  </div>
                </BlockStack>

                <Divider />

                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">Offer a discount on this upsell</Text>
                  <Checkbox label="Apply a discount to this upsell product" checked={discountEnabled} onChange={setDiscountEnabled} helpText="Customers are more likely to add the product if there's a small incentive." />
                  {discountEnabled && (
                    <BlockStack gap="200">
                      <PillToggle
                        fullWidth
                        options={[{ label: "Percentage off", value: "percentage" }, { label: "Fixed amount off", value: "fixed" }]}
                        value={discountType}
                        onChange={setDiscountType}
                      />
                      <TextField
                        label="Discount value"
                        type="number"
                        value={discountValue}
                        onChange={setDiscountValue}
                        autoComplete="off"
                        prefix={discountType === "fixed" ? "$" : undefined}
                        suffix={discountType === "percentage" ? "%" : undefined}
                        placeholder={discountType === "percentage" ? "e.g. 10" : "e.g. 5"}
                      />
                    </BlockStack>
                  )}
                </BlockStack>
              </BlockStack>
            </SectionCard>

            {/* Display */}
            <SectionCard icon={EditIcon} title="Display settings">
              <BlockStack gap="400">
                <TextField
                  label="Checkbox label"
                  value={checkboxLabel}
                  onChange={setCheckboxLabel}
                  autoComplete="off"
                  placeholder="e.g. Add gift wrapping for just $5"
                  helpText="Short text shown next to the checkbox. Keep it under 60 characters."
                />
                <TextField
                  label="Description (optional)"
                  value={checkboxDesc}
                  onChange={setCheckboxDesc}
                  autoComplete="off"
                  placeholder="e.g. Beautiful packaging, perfect for gifting."
                  multiline={2}
                />
                <Divider />
                <Text variant="bodyMd" fontWeight="semibold" as="p">Position in cart</Text>
                <BlockStack gap="100">
                  <RadioButton label="Below cart items" helpText="Shown after all line items" checked={position === "below_items"} id="pos-below" name="position" onChange={() => setPosition("below_items")} />
                  <RadioButton label="Above checkout button" helpText="Shown just before the checkout button" checked={position === "above_checkout"} id="pos-above" name="position" onChange={() => setPosition("above_checkout")} />
                </BlockStack>
                <Divider />
                <Text variant="bodyMd" fontWeight="semibold" as="p">Show on checkbox</Text>
                <Checkbox label="Show product image" checked={showImage} onChange={setShowImage} />
                <Checkbox label="Show product price" checked={showPrice} onChange={setShowPrice} />
              </BlockStack>
            </SectionCard>

            {/* Conditions */}
            <SectionCard icon={CheckboxIcon} title="Display conditions">
              <BlockStack gap="400">
                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">Show this upsell when</Text>
                  <BlockStack gap="100">
                    <RadioButton label="Always show" helpText="Visible in every cart" checked={showWhen === "always"} id="sw-always" name="showWhen" onChange={() => setShowWhen("always")} />
                    <RadioButton label="Specific products are in the cart" helpText="Only show when selected trigger products are present" checked={showWhen === "products"} id="sw-products" name="showWhen" onChange={() => setShowWhen("products")} />
                    <RadioButton label="Cart value is above a threshold" helpText="Only show when cart total exceeds the minimum" checked={showWhen === "cart_value"} id="sw-value" name="showWhen" onChange={() => setShowWhen("cart_value")} />
                  </BlockStack>
                </BlockStack>

                {showWhen === "products" && (
                  <BlockStack gap="200">
                    <TextField
                      label="Trigger products"
                      value={triggerSearch}
                      onChange={setTriggerSearch}
                      autoComplete="off"
                      prefix={<Icon source={SearchIcon} />}
                      placeholder="Search trigger products…"
                      connectedRight={<Button onClick={() => { if (triggerSearch.trim()) { setTriggerProducts(p => [...new Set([...p, triggerSearch.trim()])]); setTriggerSearch(""); } }}>Add</Button>}
                    />
                    {triggerProducts.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {triggerProducts.map(t => (
                          <div key={t} style={{ background: "#f1f1f1", borderRadius: "6px", padding: "4px 10px", display: "flex", gap: "6px", alignItems: "center" }}>
                            <Text variant="bodySm" as="span">{t}</Text>
                            <button onClick={() => setTriggerProducts(p => p.filter(x => x !== t))} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "14px", color: "#6d7175", padding: 0 }}>×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </BlockStack>
                )}

                {showWhen === "cart_value" && (
                  <TextField label="Minimum cart value" type="number" value={minCartValue} onChange={setMinCartValue} autoComplete="off" prefix="$" placeholder="e.g. 30" />
                )}
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

            {/* Preview */}
            <div style={{ background: "#fff", border: "1px solid #e1e3e5", borderRadius: "10px", overflow: "hidden" }}>
              <Box padding="300" borderBlockEndWidth="025" borderColor="border">
                <Text variant="bodyMd" fontWeight="semibold" as="p">Preview</Text>
              </Box>
              <Box padding="300">
                <div style={{ border: "1px solid #e1e3e5", borderRadius: "8px", overflow: "hidden" }}>
                  <div style={{ padding: "10px 14px", background: "#f6f6f7", borderBottom: "1px solid #e1e3e5" }}>
                    <Text variant="bodySm" fontWeight="semibold" as="p">Your cart</Text>
                  </div>
                  <div style={{ padding: "10px 14px", display: "flex", gap: "10px", alignItems: "center" }}>
                    {showImage && <div style={{ width: "36px", height: "36px", borderRadius: "6px", background: "#e1e3e5", flexShrink: 0 }} />}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "14px", height: "14px", border: "1.5px solid #5c5f62", borderRadius: "3px", flexShrink: 0 }} />
                        <Text variant="bodySm" as="p">{checkboxLabel || "Add gift wrapping for just $5"}</Text>
                      </div>
                      {checkboxDesc && <Text variant="bodySm" tone="subdued" as="p">{checkboxDesc}</Text>}
                    </div>
                    {showPrice && <Text variant="bodySm" fontWeight="semibold" as="p">{discountEnabled && discountValue ? `${discountType === "percentage" ? `-${discountValue}%` : `-$${discountValue}`}` : "$5.00"}</Text>}
                  </div>
                </div>
                <Box paddingBlockStart="200">
                  <Text variant="bodySm" tone="subdued" as="p">Checkbox shown in cart drawer based on your conditions.</Text>
                </Box>
              </Box>
            </div>

            <Banner tone="info">
              <Text variant="bodySm" as="p">
                One-click upsells appear as a simple checkbox — no extra steps for the customer.
              </Text>
            </Banner>
          </BlockStack>
        </div>
      </Box>
    </Page>
  );
}
