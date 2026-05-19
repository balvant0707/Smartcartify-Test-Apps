import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useSubmit, useActionData, useLoaderData, useNavigation } from "react-router";
import prisma from "../db.server";
import {
  Page, Text, Box, BlockStack, InlineStack, Button, TextField,
  Select, Checkbox, Collapsible, Divider, Icon, RadioButton, Banner,
  Popover, ActionList,
} from "@shopify/polaris";
import {
  AutomationIcon, SettingsIcon, EditIcon, MinimizeIcon, MaximizeIcon,
  DeleteIcon, PauseCircleIcon, PersonFilledIcon, CalendarIcon, ClockIcon,
  SearchIcon, LinkIcon, CartIcon, RefreshIcon, PlusIcon,
  PackageIcon, CollectionIcon, ProductIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  let record = null;
  if (id) {
    record = await prisma.cartAutomation.findFirst({ where: { id: parseInt(id), shop: session.shop } });
  }
  return { record };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const body = await request.json();
  const { id, ...fields } = body;
  try {
    let record;
    if (id) {
      record = await prisma.cartAutomation.update({ where: { id: parseInt(id), shop }, data: fields });
    } else {
      record = await prisma.cartAutomation.create({ data: { shop, ...fields } });
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
  const [campaignName, setCampaignName] = useState(r?.name ?? "Cart Automation");
  const isSaving = navigation.state === "submitting";

  // Trigger rules
  const [triggerRules, setTriggerRules] = useState(JSON.parse(r?.triggerRules || "[]"));
  const [triggerMatch, setTriggerMatch] = useState(r?.triggerMatch ?? "any");

  useEffect(() => {
    if (actionData?.success && navigation.state === "idle") {
      navigate(withHost("/app/campaigns"));
    }
  }, [actionData, navigation.state]);
  const [showRulePopover, setShowRulePopover] = useState(false);

  const RULE_GROUPS = [
    {
      title: "Rules based on items in cart",
      items: [
        { id: "qty_product", label: "Quantity of a product", icon: PackageIcon },
        { id: "subtotal_product", label: "Subtotal of a product", icon: PackageIcon },
        { id: "no_product", label: "Does not contain a product", icon: PackageIcon },
        { id: "qty_variant", label: "Quantity of a specific variant", icon: ProductIcon },
        { id: "subtotal_variant", label: "Subtotal of a specific variant", icon: ProductIcon },
        { id: "no_variant", label: "Does not contain a specific variant", icon: ProductIcon },
        { id: "qty_collection", label: "Quantity of items from a collection", icon: CollectionIcon },
        { id: "subtotal_collection", label: "Subtotal of items from a collection", icon: CollectionIcon },
        { id: "no_collection", label: "Does not contain an item from a collection", icon: CollectionIcon },
      ],
    },
    {
      title: "Cart based values",
      items: [
        { id: "order_value", label: "Order Value" },
        { id: "item_count", label: "Number of items in cart", icon: CartIcon },
        { id: "cart_weight", label: "Weight of cart" },
      ],
    },
  ];

  const RULE_LABELS = Object.fromEntries(
    RULE_GROUPS.flatMap(g => g.items.map(i => [i.id, i.label]))
  );

  const addTriggerRule = (ruleId) => {
    setTriggerRules(prev => [...prev, { uid: Date.now(), type: ruleId, operator: "gte", value: "", search: "" }]);
    setShowRulePopover(false);
  };

  const removeTriggerRule = (uid) => setTriggerRules(prev => prev.filter(r => r.uid !== uid));

  const updateTriggerRule = (uid, field, val) =>
    setTriggerRules(prev => prev.map(r => r.uid === uid ? { ...r, [field]: val } : r));

  // Conditions (optional extra)
  const [hasConditions, setHasConditions] = useState(r?.hasConditions ?? false);
  const [conditionType, setConditionType] = useState(r?.conditionType ?? "customer_tag");
  const [conditionValue, setConditionValue] = useState(r?.conditionValue ?? "");

  // Action
  const [actionType, setActionType] = useState(r?.actionType ?? "add_attribute");
  const [attrKey, setAttrKey] = useState(r?.attrKey ?? "");
  const [attrValue, setAttrValue] = useState(r?.attrValue ?? "");
  const [redirectUrl, setRedirectUrl] = useState(r?.redirectUrl ?? "");
  const [redirectDelay, setRedirectDelay] = useState(r?.redirectDelay ?? "0");
  const [showMessage, setShowMessageText] = useState(r?.showMessage ?? "");
  const [autoAddProduct, setAutoAddProduct] = useState(r?.autoAddProductId ?? "");
  const [autoAddQty, setAutoAddQty] = useState(r?.autoAddQty ?? "1");
  const [autoRemoveWhenTriggerLost, setAutoRemoveWhenTriggerLost] = useState(r?.autoRemoveWhenTriggerLost ?? true);

  // Settings
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(r?.startsAt ? new Date(r.startsAt).toISOString().split("T")[0] : today);
  const [startTime, setStartTime] = useState(r?.startsAt ? new Date(r.startsAt).toTimeString().slice(0, 5) : "00:00");
  const [hasEndDate, setHasEndDate] = useState(!!r?.endsAt);
  const [endDate, setEndDate] = useState(r?.endsAt ? new Date(r.endsAt).toISOString().split("T")[0] : "");
  const [endTime, setEndTime] = useState(r?.endsAt ? new Date(r.endsAt).toTimeString().slice(0, 5) : "23:59");
  const [runOnce, setRunOnce] = useState(r?.runOnce ?? false);

  const isPaused = status !== "active";

  const handleSave = () => {
    submit(
      {
        id: recordId,
        name: campaignName,
        status,
        triggerRules: JSON.stringify(triggerRules),
        triggerMatch,
        hasConditions,
        conditionType,
        conditionValue,
        actionType,
        attrKey,
        attrValue,
        redirectUrl,
        redirectDelay,
        showMessage,
        autoAddProductId: autoAddProduct,
        autoAddQty,
        autoRemoveWhenTriggerLost,
        runOnce,
        startsAt: startDate ? new Date(`${startDate}T${startTime}`).toISOString() : null,
        endsAt: hasEndDate && endDate ? new Date(`${endDate}T${endTime}`).toISOString() : null,
      },
      { method: "post", encType: "application/json" }
    );
  };

  return (
    <Page
      backAction={{ content: "Campaigns", onAction: () => navigate(withHost("/app/campaigns")) }}
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
                    <Text variant="bodySm" as="span"> · {triggerRules.length === 0 ? "No rules set" : `${triggerRules.length} rule${triggerRules.length > 1 ? "s" : ""} (match ${triggerMatch === "any" ? "any" : "all"})`}</Text>
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

                {triggerRules.length > 1 && (
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Text variant="bodySm" as="p">Cart must match</Text>
                    <Select
                      label=""
                      labelHidden
                      options={[
                        { label: "at least one rule", value: "any" },
                        { label: "all rules", value: "all" },
                      ]}
                      value={triggerMatch}
                      onChange={setTriggerMatch}
                    />
                  </div>
                )}

                {triggerRules.length === 0 && (
                  <div style={{ border: "1px dashed #c9cccf", borderRadius: "8px", padding: "16px", textAlign: "center" }}>
                    <Text variant="bodySm" tone="subdued" as="p">No trigger rules added yet. Add at least one rule below.</Text>
                  </div>
                )}

                {triggerRules.map((rule) => {
                  const isContainment = rule.type.startsWith("no_");
                  const isSubtotalOrValue = rule.type.includes("subtotal") || rule.type === "order_value";
                  const isWeight = rule.type === "cart_weight";
                  const needsSearch = rule.type.includes("product") || rule.type.includes("variant") || rule.type.includes("collection");
                  const searchLabel = rule.type.includes("variant") ? "Variant" : rule.type.includes("collection") ? "Collection" : "Product";
                  const valueLabel = isSubtotalOrValue ? "Amount" : isWeight ? "Weight" : "Quantity";

                  return (
                    <div key={rule.uid} style={{ border: "1px solid #e1e3e5", borderRadius: "8px", padding: "14px 16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <Text variant="bodySm" fontWeight="semibold" as="p">{RULE_LABELS[rule.type]}</Text>
                        <Button variant="plain" icon={DeleteIcon} tone="critical" onClick={() => removeTriggerRule(rule.uid)} accessibilityLabel="Remove rule" />
                      </div>

                      {isContainment ? (
                        <TextField
                          label={`${searchLabel} name or SKU`}
                          value={rule.search}
                          onChange={v => updateTriggerRule(rule.uid, "search", v)}
                          autoComplete="off"
                          prefix={<Icon source={SearchIcon} />}
                          placeholder={`Search ${searchLabel.toLowerCase()}…`}
                        />
                      ) : (
                        <BlockStack gap="200">
                          {needsSearch && (
                            <TextField
                              label={`${searchLabel} name or SKU`}
                              value={rule.search}
                              onChange={v => updateTriggerRule(rule.uid, "search", v)}
                              autoComplete="off"
                              prefix={<Icon source={SearchIcon} />}
                              placeholder={`Search ${searchLabel.toLowerCase()}…`}
                            />
                          )}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                            <Select
                              label="Operator"
                              options={[
                                { label: "is greater than", value: "gt" },
                                { label: "is less than", value: "lt" },
                                { label: "is equal to", value: "eq" },
                                { label: "is at least", value: "gte" },
                                { label: "is at most", value: "lte" },
                              ]}
                              value={rule.operator}
                              onChange={v => updateTriggerRule(rule.uid, "operator", v)}
                            />
                            <TextField
                              label={valueLabel}
                              type="number"
                              value={rule.value}
                              onChange={v => updateTriggerRule(rule.uid, "value", v)}
                              autoComplete="off"
                              prefix={isSubtotalOrValue ? "$" : undefined}
                              suffix={isWeight ? "kg" : undefined}
                              placeholder="0"
                            />
                          </div>
                        </BlockStack>
                      )}
                    </div>
                  );
                })}

                <Popover
                  active={showRulePopover}
                  activator={
                    <Button icon={PlusIcon} onClick={() => setShowRulePopover(v => !v)}>
                      Add a trigger rule
                    </Button>
                  }
                  onClose={() => setShowRulePopover(false)}
                  preferredAlignment="left"
                >
                  <div style={{ maxHeight: "340px", overflowY: "auto" }}>
                    <ActionList
                      sections={RULE_GROUPS.map(group => ({
                        title: group.title,
                        items: group.items.map(item => ({
                          content: item.label,
                          prefix: item.icon ? <Icon source={item.icon} /> : undefined,
                          onAction: () => addTriggerRule(item.id),
                        })),
                      }))}
                    />
                  </div>
                </Popover>

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
                    <Text variant="bodySm" as="p">
                      {triggerRules.length === 0
                        ? "No trigger rules set"
                        : triggerRules.map(r => RULE_LABELS[r.type]).join(triggerMatch === "any" ? " OR " : " AND ")}
                    </Text>
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
