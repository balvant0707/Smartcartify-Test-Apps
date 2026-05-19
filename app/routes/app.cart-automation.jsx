import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Page, Text, Box, BlockStack, InlineStack, Button, TextField,
  Select, Checkbox, Collapsible, Divider, Icon, RadioButton, Banner,
} from "@shopify/polaris";
import {
  AutomationIcon, SettingsIcon, EditIcon, MinimizeIcon, MaximizeIcon,
  DeleteIcon, PauseCircleIcon, PersonFilledIcon, CalendarIcon, ClockIcon,
  SearchIcon, LinkIcon, CartIcon, RefreshIcon,
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

function FlowArrow() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "4px 0" }}>
      <div style={{ width: "2px", height: "24px", background: "#e1e3e5" }} />
    </div>
  );
}

function StepBadge({ step, label, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
      <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "700", flexShrink: 0 }}>
        {step}
      </div>
      <Text variant="bodyMd" fontWeight="semibold" as="p">{label}</Text>
    </div>
  );
}

export default function CartAutomationCreate() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("draft");
  const [campaignName, setCampaignName] = useState("Cart Automation");
  const [isSaving, setIsSaving] = useState(false);

  // Trigger
  const [triggerType, setTriggerType] = useState("item_added");
  const [triggerProducts, setTriggerProducts] = useState([]);
  const [triggerProductSearch, setTriggerProductSearch] = useState("");
  const [triggerCollections, setTriggerCollections] = useState([]);
  const [triggerCollectionSearch, setTriggerCollectionSearch] = useState("");
  const [triggerCartValue, setTriggerCartValue] = useState("");
  const [triggerQty, setTriggerQty] = useState("");
  const [triggerScope, setTriggerScope] = useState("specific_products");

  // Conditions (optional extra)
  const [hasConditions, setHasConditions] = useState(false);
  const [conditionType, setConditionType] = useState("customer_tag");
  const [conditionValue, setConditionValue] = useState("");

  // Action
  const [actionType, setActionType] = useState("add_attribute");
  const [attrKey, setAttrKey] = useState("");
  const [attrValue, setAttrValue] = useState("");
  const [redirectUrl, setRedirectUrl] = useState("");
  const [redirectDelay, setRedirectDelay] = useState("0");
  const [showMessage, setShowMessageText] = useState("");
  const [autoAddProduct, setAutoAddProduct] = useState("");
  const [autoAddQty, setAutoAddQty] = useState("1");
  const [autoRemoveWhenTriggerLost, setAutoRemoveWhenTriggerLost] = useState(true);

  // Settings
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(today);
  const [startTime, setStartTime] = useState("00:00");
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("23:59");
  const [runOnce, setRunOnce] = useState(false);

  const isPaused = status !== "active";

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => { setIsSaving(false); navigate("/app/campaigns"); }, 800);
  };

  const addTag = (list, setList, search, setSearch) => {
    if (search.trim()) { setList(p => [...new Set([...p, search.trim()])]); setSearch(""); }
  };

  const removeTag = (list, setList, val) => setList(p => p.filter(x => x !== val));

  const TagList = ({ tags, onRemove }) => (
    tags.length > 0 ? (
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        {tags.map(t => (
          <div key={t} style={{ background: "#f1f1f1", borderRadius: "6px", padding: "4px 10px", display: "flex", gap: "6px", alignItems: "center" }}>
            <Text variant="bodySm" as="span">{t}</Text>
            <button onClick={() => onRemove(t)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "14px", color: "#6d7175", padding: 0 }}>×</button>
          </div>
        ))}
      </div>
    ) : null
  );

  return (
    <Page
      backAction={{ content: "Campaigns", onAction: () => navigate("/app/campaigns") }}
      title={campaignName || "Cart Automation"}
      primaryAction={{ content: "Save", loading: isSaving, onAction: handleSave }}
      secondaryActions={[{ content: status === "active" ? "Pause" : "Activate", onAction: () => setStatus(s => s === "active" ? "draft" : "active") }]}
    >
      <style>{`.ca-layout{display:grid;grid-template-columns:1fr 320px;gap:20px;align-items:start}@media(max-width:900px){.ca-layout{grid-template-columns:1fr}}`}</style>
      <Box paddingBlockEnd="800">
        <div className="ca-layout">
          <BlockStack gap="400">

            {/* Flow summary */}
            <div style={{ background: "#f6f6f7", border: "1px solid #e1e3e5", borderRadius: "12px", padding: "16px 20px" }}>
              <Text variant="bodyMd" fontWeight="semibold" as="p">Automation flow</Text>
              <Box paddingBlockStart="200">
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                  <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "8px 14px" }}>
                    <Text variant="bodySm" fontWeight="semibold" as="span">WHEN</Text>
                    <Text variant="bodySm" as="span"> · {triggerType === "item_added" ? "Item added to cart" : triggerType === "cart_value" ? "Cart value reached" : "Item quantity reached"}</Text>
                  </div>
                  <Text variant="headingMd" tone="subdued" as="span">→</Text>
                  <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "8px 14px" }}>
                    <Text variant="bodySm" fontWeight="semibold" as="span">DO</Text>
                    <Text variant="bodySm" as="span"> · {actionType === "add_attribute" ? "Add cart attribute" : actionType === "redirect" ? "Redirect to URL" : actionType === "show_message" ? "Show message" : "Auto-add product"}</Text>
                  </div>
                </div>
              </Box>
            </div>

            {/* Trigger */}
            <SectionCard icon={CartIcon} title="When (Trigger)">
              <BlockStack gap="400">
                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">Trigger type</Text>
                  <BlockStack gap="100">
                    <RadioButton label="Item is added to the cart" helpText="Fires when any matching product is added" checked={triggerType === "item_added"} id="trig-item" name="triggerType" onChange={() => setTriggerType("item_added")} />
                    <RadioButton label="Cart value reaches a threshold" helpText="Fires when cart subtotal crosses a dollar amount" checked={triggerType === "cart_value"} id="trig-value" name="triggerType" onChange={() => setTriggerType("cart_value")} />
                    <RadioButton label="Item quantity reaches a threshold" helpText="Fires when total cart quantity crosses a number" checked={triggerType === "item_qty"} id="trig-qty" name="triggerType" onChange={() => setTriggerType("item_qty")} />
                  </BlockStack>
                </BlockStack>

                {triggerType === "item_added" && (
                  <BlockStack gap="300">
                    <BlockStack gap="100">
                      <RadioButton label="Specific products" checked={triggerScope === "specific_products"} id="ts-products" name="triggerScope" onChange={() => setTriggerScope("specific_products")} />
                      <RadioButton label="Specific collections" checked={triggerScope === "collections"} id="ts-collections" name="triggerScope" onChange={() => setTriggerScope("collections")} />
                      <RadioButton label="Any product" checked={triggerScope === "any"} id="ts-any" name="triggerScope" onChange={() => setTriggerScope("any")} />
                    </BlockStack>

                    {triggerScope === "specific_products" && (
                      <>
                        <TextField
                          label="Trigger products"
                          value={triggerProductSearch}
                          onChange={setTriggerProductSearch}
                          autoComplete="off"
                          prefix={<Icon source={SearchIcon} />}
                          placeholder="Search by product name or SKU…"
                          connectedRight={<Button onClick={() => addTag(triggerProducts, setTriggerProducts, triggerProductSearch, setTriggerProductSearch)}>Add</Button>}
                        />
                        <TagList tags={triggerProducts} onRemove={v => removeTag(triggerProducts, setTriggerProducts, v)} />
                      </>
                    )}

                    {triggerScope === "collections" && (
                      <>
                        <TextField
                          label="Trigger collections"
                          value={triggerCollectionSearch}
                          onChange={setTriggerCollectionSearch}
                          autoComplete="off"
                          prefix={<Icon source={SearchIcon} />}
                          placeholder="Search collection name…"
                          connectedRight={<Button onClick={() => addTag(triggerCollections, setTriggerCollections, triggerCollectionSearch, setTriggerCollectionSearch)}>Add</Button>}
                        />
                        <TagList tags={triggerCollections} onRemove={v => removeTag(triggerCollections, setTriggerCollections, v)} />
                      </>
                    )}
                  </BlockStack>
                )}

                {triggerType === "cart_value" && (
                  <TextField label="Cart value threshold" type="number" value={triggerCartValue} onChange={setTriggerCartValue} autoComplete="off" prefix="$" placeholder="e.g. 50" helpText="Automation fires when cart subtotal reaches or exceeds this value." />
                )}

                {triggerType === "item_qty" && (
                  <TextField label="Item quantity threshold" type="number" value={triggerQty} onChange={setTriggerQty} autoComplete="off" suffix="items" placeholder="e.g. 3" helpText="Automation fires when total cart quantity reaches or exceeds this number." />
                )}
              </BlockStack>
            </SectionCard>

            {/* Conditions */}
            <SectionCard icon={RefreshIcon} title="Extra conditions (optional)" defaultOpen={false}>
              <BlockStack gap="300">
                <Text variant="bodySm" tone="subdued" as="p">Optionally restrict the automation to only fire when additional conditions are met.</Text>
                <Checkbox label="Add extra conditions" checked={hasConditions} onChange={setHasConditions} />
                {hasConditions && (
                  <BlockStack gap="200">
                    <Select
                      label="Condition type"
                      options={[
                        { label: "Customer tag equals", value: "customer_tag" },
                        { label: "Customer is logged in", value: "logged_in" },
                        { label: "Cart has a specific product", value: "has_product" },
                        { label: "Cart does NOT have a specific product", value: "no_product" },
                      ]}
                      value={conditionType}
                      onChange={setConditionType}
                    />
                    {(conditionType === "customer_tag" || conditionType === "has_product" || conditionType === "no_product") && (
                      <TextField
                        label={conditionType === "customer_tag" ? "Tag value" : "Product name or SKU"}
                        value={conditionValue}
                        onChange={setConditionValue}
                        autoComplete="off"
                        placeholder={conditionType === "customer_tag" ? "e.g. vip" : "e.g. Gift Card"}
                      />
                    )}
                  </BlockStack>
                )}
              </BlockStack>
            </SectionCard>

            {/* Action */}
            <SectionCard icon={AutomationIcon} title="Do (Action)">
              <BlockStack gap="400">
                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">Action type</Text>
                  <BlockStack gap="100">
                    <RadioButton label="Add a cart attribute" helpText='Sets a hidden key-value pair on the cart (e.g. "b2b_order" = "true")' checked={actionType === "add_attribute"} id="act-attr" name="actionType" onChange={() => setActionType("add_attribute")} />
                    <RadioButton label="Redirect to a URL" helpText="Sends the customer to another page when trigger fires" checked={actionType === "redirect"} id="act-redirect" name="actionType" onChange={() => setActionType("redirect")} />
                    <RadioButton label="Show a message in the cart" helpText="Display a banner or notification inside the cart" checked={actionType === "show_message"} id="act-message" name="actionType" onChange={() => setActionType("show_message")} />
                    <RadioButton label="Auto-add a product to the cart" helpText="Automatically add a specific product" checked={actionType === "auto_add"} id="act-add" name="actionType" onChange={() => setActionType("auto_add")} />
                  </BlockStack>
                </BlockStack>

                <Divider />

                {actionType === "add_attribute" && (
                  <BlockStack gap="200">
                    <Text variant="bodyMd" fontWeight="semibold" as="p">Cart attribute</Text>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      <TextField label="Attribute key" value={attrKey} onChange={setAttrKey} autoComplete="off" placeholder="e.g. order_type" helpText="The key stored on the Shopify cart object." />
                      <TextField label="Attribute value" value={attrValue} onChange={setAttrValue} autoComplete="off" placeholder="e.g. b2b" helpText="The value assigned to the key." />
                    </div>
                    <Banner tone="info">
                      <Text variant="bodySm" as="p">Cart attributes are visible in the Shopify admin order detail page and accessible via the Liquid cart object.</Text>
                    </Banner>
                  </BlockStack>
                )}

                {actionType === "redirect" && (
                  <BlockStack gap="200">
                    <Text variant="bodyMd" fontWeight="semibold" as="p">Redirect settings</Text>
                    <TextField
                      label="Redirect URL"
                      value={redirectUrl}
                      onChange={setRedirectUrl}
                      autoComplete="off"
                      placeholder="https://…"
                      prefix={<Icon source={LinkIcon} />}
                      helpText="Where the customer is sent when the trigger fires."
                    />
                    <TextField
                      label="Delay before redirect (seconds)"
                      type="number"
                      value={redirectDelay}
                      onChange={setRedirectDelay}
                      autoComplete="off"
                      min="0"
                      max="10"
                      suffix="sec"
                      helpText="Set to 0 for instant redirect. A short delay lets the customer see the cart first."
                    />
                  </BlockStack>
                )}

                {actionType === "show_message" && (
                  <BlockStack gap="200">
                    <Text variant="bodyMd" fontWeight="semibold" as="p">Message to show</Text>
                    <TextField
                      label="Message text"
                      value={showMessage}
                      onChange={setShowMessageText}
                      autoComplete="off"
                      placeholder="e.g. 🎉 You've unlocked B2B pricing!"
                      multiline={2}
                      helpText='Supports Liquid-style variables: {{cart_total}}, {{item_count}}.'
                    />
                  </BlockStack>
                )}

                {actionType === "auto_add" && (
                  <BlockStack gap="300">
                    <Text variant="bodyMd" fontWeight="semibold" as="p">Product to auto-add</Text>
                    <TextField
                      label="Search product"
                      value={autoAddProduct}
                      onChange={setAutoAddProduct}
                      autoComplete="off"
                      prefix={<Icon source={SearchIcon} />}
                      placeholder="Search by product name or SKU…"
                    />
                    <div style={{ maxWidth: "140px" }}>
                      <TextField label="Quantity" type="number" value={autoAddQty} onChange={setAutoAddQty} autoComplete="off" min="1" suffix="item(s)" />
                    </div>
                    <Checkbox
                      label="Remove this product if trigger condition is no longer met"
                      checked={autoRemoveWhenTriggerLost}
                      onChange={setAutoRemoveWhenTriggerLost}
                      helpText="E.g. if cart value drops below threshold, the auto-added product is removed."
                    />
                  </BlockStack>
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
                <Checkbox label="Run automation only once per customer session" checked={runOnce} onChange={setRunOnce} helpText="Prevents repeated actions if the trigger is hit multiple times in a single session." />
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

            {/* Flow summary card */}
            <div style={{ background: "#fff", border: "1px solid #e1e3e5", borderRadius: "10px", overflow: "hidden" }}>
              <Box padding="300" borderBlockEndWidth="025" borderColor="border">
                <Text variant="bodyMd" fontWeight="semibold" as="p">Automation summary</Text>
              </Box>
              <Box padding="300">
                <BlockStack gap="100">
                  <div style={{ background: "#eff6ff", borderRadius: "8px", padding: "10px 12px" }}>
                    <Text variant="bodySm" fontWeight="semibold" as="p">WHEN</Text>
                    <Text variant="bodySm" as="p">{triggerType === "item_added" ? "Item is added to cart" : triggerType === "cart_value" ? `Cart value ≥ $${triggerCartValue || "—"}` : `Item qty ≥ ${triggerQty || "—"}`}</Text>
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", padding: "2px" }}>
                    <Text variant="headingMd" tone="subdued" as="p">↓</Text>
                  </div>
                  <div style={{ background: "#f0fdf4", borderRadius: "8px", padding: "10px 12px" }}>
                    <Text variant="bodySm" fontWeight="semibold" as="p">DO</Text>
                    <Text variant="bodySm" as="p">
                      {actionType === "add_attribute" ? `Set cart attribute: ${attrKey || "key"} = ${attrValue || "value"}` :
                       actionType === "redirect" ? `Redirect to ${redirectUrl || "URL"}` :
                       actionType === "show_message" ? (showMessage || "Show message") :
                       `Auto-add: ${autoAddProduct || "product"} (qty: ${autoAddQty})`}
                    </Text>
                  </div>
                </BlockStack>
              </Box>
            </div>

            <Banner tone="info">
              <Text variant="bodySm" as="p">
                Cart automations run in the browser. Cart attributes are passed to Shopify and visible on the order.
              </Text>
            </Banner>
          </BlockStack>
        </div>
      </Box>
    </Page>
  );
}
