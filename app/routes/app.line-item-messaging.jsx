import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useSubmit, useActionData, useLoaderData, useNavigation } from "react-router";
import {
  Page, Text, Box, BlockStack, InlineStack, Button, TextField,
  Select, Checkbox, Collapsible, Divider, Icon, RadioButton, Badge,
} from "@shopify/polaris";
import {
  ChatIcon, SettingsIcon, EditIcon, MinimizeIcon, MaximizeIcon,
  DeleteIcon, PauseCircleIcon, PersonFilledIcon, CalendarIcon,
  ClockIcon, SearchIcon, PlusIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  let record = null;
  if (id) {
    const raw = await prisma.campaign.findFirst({
      where: { id: parseInt(id), shop: session.shop, type: "line-item-messaging" },
    });
    if (raw) {
      const s = JSON.parse(raw.settings || "{}");
      record = { ...raw, ...s };
    }
  }
  return { record };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const body = await request.json();
  const { id, name, status, startsAt, endsAt, ...settings } = body;

  const dbData = {
    shop,
    type: "line-item-messaging",
    name: name || "Line Item Messaging",
    status: status || "draft",
    settings: JSON.stringify(settings),
    shopifyDiscountId: null,
    shopifyDiscountCode: null,
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

const MESSAGE_TEMPLATES = [
  { label: "Low stock warning", value: "low_stock", text: "⚠️ Only {{stock}} left in stock!" },
  { label: "Estimated delivery", value: "delivery", text: "🚚 Estimated delivery: {{date}}" },
  { label: "Personalization note", value: "personalization", text: "✏️ This item will be personalized as requested." },
  { label: "Size / care info", value: "care", text: "ℹ️ Please check the size guide before ordering." },
  { label: "Custom message", value: "custom", text: "" },
];

function RuleRow({ rule, index, onUpdate, onRemove }) {
  return (
    <div style={{ border: "1px solid #e1e3e5", borderRadius: "8px", padding: "14px 16px", background: "#fafafa" }}>
      <InlineStack align="space-between" blockAlign="center">
        <Text variant="bodyMd" fontWeight="semibold" as="p">Rule {index + 1}</Text>
        <Button variant="plain" tone="critical" icon={DeleteIcon} onClick={onRemove} />
      </InlineStack>
      <Box paddingBlockStart="200">
        <BlockStack gap="200">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
            <Select
              label="Condition"
              options={[
                { label: "Product quantity", value: "quantity" },
                { label: "Product price", value: "price" },
                { label: "Product tag", value: "tag" },
                { label: "Variant title contains", value: "variant" },
              ]}
              value={rule.condition}
              onChange={v => onUpdate({ ...rule, condition: v })}
            />
            <Select
              label="Operator"
              options={
                rule.condition === "tag" || rule.condition === "variant"
                  ? [{ label: "contains", value: "contains" }, { label: "does not contain", value: "not_contains" }]
                  : [{ label: "is greater than", value: "gt" }, { label: "is less than", value: "lt" }, { label: "is equal to", value: "eq" }]
              }
              value={rule.operator}
              onChange={v => onUpdate({ ...rule, operator: v })}
            />
            <TextField
              label="Value"
              value={rule.value}
              onChange={v => onUpdate({ ...rule, value: v })}
              autoComplete="off"
              placeholder={rule.condition === "quantity" ? "e.g. 1" : rule.condition === "price" ? "e.g. 50" : "e.g. sale"}
            />
          </div>
        </BlockStack>
      </Box>
    </div>
  );
}

export default function LineItemMessagingCreate() {
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
  const [campaignName, setCampaignName] = useState(r?.name ?? "Line Item Messaging");
  const isSaving = navigation.state === "submitting";

  // Products to target
  const [targetType, setTargetType] = useState(r?.targetType ?? "specific_products");
  const [productTags, setProductTags] = useState(JSON.parse(r?.targetIds || "[]"));
  const [productSearch, setProductSearch] = useState("");

  // Conditions / rules
  const [rules, setRules] = useState(JSON.parse(r?.conditions || "[]"));
  const [ruleLogic, setRuleLogic] = useState(r?.conditionMatch ?? "all");

  const addRule = () => setRules(r => [...r, { id: Date.now(), condition: "quantity", operator: "lt", value: "" }]);
  const updateRule = (id, updated) => setRules(r => r.map(x => x.id === id ? updated : x));
  const removeRule = (id) => setRules(r => r.filter(x => x.id !== id));

  // Message
  const [templateType, setTemplateType] = useState(r?.messageTemplate ?? "low_stock");
  const [customText, setCustomText] = useState(r?.customMessage ?? "");
  const [msgIcon, setMsgIcon] = useState("⚠️");
  const [msgBgColor, setMsgBgColor] = useState(r?.bgColor ?? "#fff7ed");
  const [msgTextColor, setMsgTextColor] = useState(r?.textColor ?? "#92400e");
  const [msgPosition, setMsgPosition] = useState(r?.position ?? "below_item");

  const activeTemplate = MESSAGE_TEMPLATES.find(t => t.value === templateType);
  const displayText = templateType === "custom" ? customText : activeTemplate?.text || "";

  // Settings
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(r?.startsAt ? new Date(r.startsAt).toISOString().split("T")[0] : today);
  const [startTime, setStartTime] = useState(r?.startsAt ? new Date(r.startsAt).toTimeString().slice(0, 5) : "00:00");
  const [hasEndDate, setHasEndDate] = useState(!!r?.endsAt);
  const [endDate, setEndDate] = useState(r?.endsAt ? new Date(r.endsAt).toISOString().split("T")[0] : "");
  const [endTime, setEndTime] = useState(r?.endsAt ? new Date(r.endsAt).toTimeString().slice(0, 5) : "23:59");

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
        targetType,
        targetIds: JSON.stringify(productTags),
        conditions: JSON.stringify(rules),
        conditionMatch: ruleLogic,
        messageTemplate: templateType,
        customMessage: customText,
        position: msgPosition,
        bgColor: msgBgColor,
        textColor: msgTextColor,
        startsAt: startDate ? new Date(`${startDate}T${startTime}`).toISOString() : null,
        endsAt: hasEndDate && endDate ? new Date(`${endDate}T${endTime}`).toISOString() : null,
      },
      { method: "post", encType: "application/json" }
    );
  };

  return (
    <Page
      backAction={{ content: "Campaigns", onAction: () => navigate(withHost("/app/campaigns")) }}
      title={campaignName || "Line Item Messaging"}
      primaryAction={{ content: "Save", loading: isSaving, onAction: handleSave }}
      secondaryActions={[{ content: status === "active" ? "Pause" : "Activate", onAction: () => setStatus(s => s === "active" ? "draft" : "active") }]}
    >
      <style>{`.lim-layout{display:grid;grid-template-columns:1fr 320px;gap:20px;align-items:start}@media(max-width:900px){.lim-layout{grid-template-columns:1fr}}`}</style>
      <Box paddingBlockEnd="800">
        <div className="lim-layout">
          <BlockStack gap="400">

            {/* Target products */}
            <SectionCard icon={ChatIcon} title="Target products">
              <BlockStack gap="300">
                <Text variant="bodyMd" fontWeight="semibold" as="p">Show message on</Text>
                <BlockStack gap="100">
                  <RadioButton label="Specific products" checked={targetType === "specific_products"} id="tt-products" name="targetType" onChange={() => setTargetType("specific_products")} />
                  <RadioButton label="Specific collections" checked={targetType === "collections"} id="tt-collections" name="targetType" onChange={() => setTargetType("collections")} />
                  <RadioButton label="All cart items" checked={targetType === "all"} id="tt-all" name="targetType" onChange={() => setTargetType("all")} />
                </BlockStack>

                {(targetType === "specific_products" || targetType === "collections") && (
                  <BlockStack gap="200">
                    <TextField
                      label={targetType === "specific_products" ? "Search products" : "Search collections"}
                      value={productSearch}
                      onChange={setProductSearch}
                      autoComplete="off"
                      prefix={<Icon source={SearchIcon} />}
                      placeholder={targetType === "specific_products" ? "Search by name or SKU…" : "Search collection name…"}
                      connectedRight={<Button onClick={() => { if (productSearch.trim()) { setProductTags(p => [...new Set([...p, productSearch.trim()])]); setProductSearch(""); } }}>Add</Button>}
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

            {/* Conditions */}
            <SectionCard icon={ChatIcon} title="Display conditions (optional)">
              <BlockStack gap="300">
                <Text variant="bodySm" tone="subdued" as="p">
                  Add conditions to control when the message appears — e.g. only when stock is low or price exceeds a threshold. Leave empty to always show.
                </Text>

                {rules.length > 1 && (
                  <div style={{ display: "inline-flex", background: "#f1f1f1", borderRadius: "8px", padding: "3px", gap: "2px" }}>
                    {["all", "any"].map(opt => (
                      <button key={opt} onClick={() => setRuleLogic(opt)} style={{ padding: "6px 14px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: ruleLogic === opt ? "600" : "400", fontSize: "13px", background: ruleLogic === opt ? "#fff" : "transparent", boxShadow: ruleLogic === opt ? "0 1px 3px rgba(0,0,0,0.12)" : "none", color: ruleLogic === opt ? "#1a1a1a" : "#6d7175" }}>
                        {opt === "all" ? "Match ALL rules" : "Match ANY rule"}
                      </button>
                    ))}
                  </div>
                )}

                <BlockStack gap="200">
                  {rules.map((rule, i) => (
                    <RuleRow key={rule.id} rule={rule} index={i} onUpdate={updated => updateRule(rule.id, updated)} onRemove={() => removeRule(rule.id)} />
                  ))}
                </BlockStack>

                <button onClick={addRule} style={{ width: "100%", padding: "10px", border: "1.5px dashed #c9cccf", borderRadius: "8px", background: "#f6f6f7", cursor: "pointer", fontSize: "14px", fontWeight: "500", color: "#202223", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  <span style={{ fontSize: "18px", lineHeight: 1 }}>+</span> Add a condition
                </button>
              </BlockStack>
            </SectionCard>

            {/* Message */}
            <SectionCard icon={EditIcon} title="Message content">
              <BlockStack gap="400">
                <Select
                  label="Message template"
                  options={MESSAGE_TEMPLATES.map(t => ({ label: t.label, value: t.value }))}
                  value={templateType}
                  onChange={setTemplateType}
                  helpText="Pick a template or choose Custom to write your own."
                />

                {templateType !== "custom" && (
                  <div style={{ background: "#f6f6f7", borderRadius: "8px", padding: "10px 14px", border: "1px solid #e1e3e5" }}>
                    <Text variant="bodySm" tone="subdued" as="p">Template preview:</Text>
                    <Text variant="bodyMd" as="p">{activeTemplate?.text}</Text>
                    <Text variant="bodySm" tone="subdued" as="p">Variables like {"{{stock}}"} are replaced dynamically.</Text>
                  </div>
                )}

                {templateType === "custom" && (
                  <TextField
                    label="Custom message text"
                    value={customText}
                    onChange={setCustomText}
                    autoComplete="off"
                    placeholder="e.g. ✅ This item ships within 24 hours."
                    multiline={2}
                    helpText='Use {{product_title}}, {{variant_title}}, {{price}}, {{quantity}} as dynamic variables.'
                  />
                )}

                <Divider />

                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">Message position</Text>
                  <BlockStack gap="100">
                    <RadioButton label="Below the line item" checked={msgPosition === "below_item"} id="mp-below" name="msgPos" onChange={() => setMsgPosition("below_item")} />
                    <RadioButton label="Above the line item" checked={msgPosition === "above_item"} id="mp-above" name="msgPos" onChange={() => setMsgPosition("above_item")} />
                  </BlockStack>
                </BlockStack>

                <Divider />

                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">Message style</Text>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <Text variant="bodySm" as="p" tone="subdued">Background</Text>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
                        <input type="color" value={msgBgColor} onChange={e => setMsgBgColor(e.target.value)} style={{ width: "36px", height: "36px", border: "1px solid #e1e3e5", borderRadius: "6px", cursor: "pointer", padding: "2px" }} />
                        <Text variant="bodySm" as="p">{msgBgColor}</Text>
                      </div>
                    </div>
                    <div>
                      <Text variant="bodySm" as="p" tone="subdued">Text color</Text>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
                        <input type="color" value={msgTextColor} onChange={e => setMsgTextColor(e.target.value)} style={{ width: "36px", height: "36px", border: "1px solid #e1e3e5", borderRadius: "6px", cursor: "pointer", padding: "2px" }} />
                        <Text variant="bodySm" as="p">{msgTextColor}</Text>
                      </div>
                    </div>
                  </div>
                </BlockStack>
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
                  <div style={{ padding: "10px 14px", display: "flex", gap: "10px", alignItems: "center", borderBottom: msgPosition === "below_item" ? "none" : "1px solid #e1e3e5" }}>
                    {msgPosition === "above_item" && (
                      <div style={{ width: "100%", background: msgBgColor, borderRadius: "6px", padding: "6px 10px", marginBottom: "8px" }}>
                        <Text variant="bodySm" as="p"><span style={{ color: msgTextColor }}>{displayText || "Message shown here"}</span></Text>
                      </div>
                    )}
                  </div>
                  <div style={{ padding: "10px 14px", display: "flex", gap: "10px", alignItems: "center" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "6px", background: "#e1e3e5", flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <Text variant="bodySm" fontWeight="semibold" as="p">Product name</Text>
                      <Text variant="bodySm" tone="subdued" as="p">Qty: 1 · $29.99</Text>
                    </div>
                  </div>
                  {msgPosition === "below_item" && (
                    <div style={{ padding: "0 10px 10px" }}>
                      <div style={{ background: msgBgColor, borderRadius: "6px", padding: "6px 10px" }}>
                        <Text variant="bodySm" as="p"><span style={{ color: msgTextColor }}>{displayText || "Message shown here"}</span></Text>
                      </div>
                    </div>
                  )}
                </div>
              </Box>
            </div>
          </BlockStack>
        </div>
      </Box>
    </Page>
  );
}
