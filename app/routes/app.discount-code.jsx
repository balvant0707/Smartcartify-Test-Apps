import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useSubmit, useActionData, useLoaderData, useNavigation } from "react-router";
import {
  Page, Text, Box, BlockStack, InlineStack, Button, TextField,
  Select, Checkbox, Collapsible, Divider, Icon, Banner, RadioButton,
} from "@shopify/polaris";
import {
  DiscountIcon, SettingsIcon, EditIcon, MinimizeIcon, MaximizeIcon,
  ClipboardIcon, PauseCircleIcon, PersonFilledIcon, CalendarIcon, ClockIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  let record = null;
  if (id) {
    record = await prisma.campaignDiscountCode.findFirst({ where: { id: parseInt(id), shop: session.shop } });
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
      record = await prisma.campaignDiscountCode.update({ where: { id: parseInt(id), shop }, data: fields });
    } else {
      record = await prisma.campaignDiscountCode.create({ data: { shop, ...fields } });
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

export default function DiscountCodeCreate() {
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
  const [campaignName, setCampaignName] = useState(r?.name ?? "Discount Code");
  const isSaving = navigation.state === "submitting";

  // Code settings
  const [discountCode, setDiscountCode] = useState(r?.discountCode ?? "");
  const [displayStyle, setDisplayStyle] = useState(r?.displayStyle ?? "banner");
  const [allowCopy, setAllowCopy] = useState(r?.allowCopy ?? true);
  const [autoApply, setAutoApply] = useState(r?.autoApply ?? false);

  // Message
  const [headline, setHeadline] = useState(r?.headline ?? "");
  const [description, setDescription] = useState(r?.description ?? "");
  const [ctaText, setCtaText] = useState(r?.ctaText ?? "");

  // Style
  const [bgColor, setBgColor] = useState(r?.bgColor ?? "#fff7ed");
  const [textColor, setTextColor] = useState(r?.textColor ?? "#92400e");
  const [codeBoxBg, setCodeBoxBg] = useState(r?.codeBoxBg ?? "#fef3c7");
  const [position, setPosition] = useState(r?.position ?? "top");
  const [isDismissible, setIsDismissible] = useState(r?.isDismissible ?? false);

  // Conditions
  const [showWhen, setShowWhen] = useState(r?.showWhen ?? "always");
  const [minCartValue, setMinCartValue] = useState(r?.minCartValue ?? "");

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
        discountCode,
        displayStyle,
        allowCopy,
        autoApply,
        headline,
        description,
        ctaText,
        bgColor,
        textColor,
        codeBoxBg,
        position,
        isDismissible,
        showWhen,
        minCartValue,
        startsAt: startDate ? new Date(`${startDate}T${startTime}`).toISOString() : null,
        endsAt: hasEndDate && endDate ? new Date(`${endDate}T${endTime}`).toISOString() : null,
      },
      { method: "post", encType: "application/json" }
    );
  };

  return (
    <Page
      backAction={{ content: "Campaigns", onAction: () => navigate(withHost("/app/campaigns")) }}
      title={campaignName || "Discount Code"}
      primaryAction={{ content: "Save", loading: isSaving, onAction: handleSave }}
      secondaryActions={[{ content: status === "active" ? "Pause" : "Activate", onAction: () => setStatus(s => s === "active" ? "draft" : "active") }]}
    >
      <style>{`.dc-layout{display:grid;grid-template-columns:1fr 320px;gap:20px;align-items:start}@media(max-width:900px){.dc-layout{grid-template-columns:1fr}}`}</style>
      <Box paddingBlockEnd="800">
        <div className="dc-layout">
          <BlockStack gap="400">

            {/* Discount Code */}
            <SectionCard icon={DiscountIcon} title="Discount code">
              <BlockStack gap="400">
                <TextField
                  label="Discount code"
                  value={discountCode}
                  onChange={setDiscountCode}
                  autoComplete="off"
                  placeholder="e.g. SAVE15"
                  helpText="Enter the exact Shopify discount code customers will use at checkout."
                  prefix={<Icon source={ClipboardIcon} />}
                />

                <Divider />

                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">Display style</Text>
                  <BlockStack gap="100">
                    <RadioButton label="Banner with code box" helpText="Shows a prominent banner with the code highlighted" checked={displayStyle === "banner"} id="ds-banner" name="displayStyle" onChange={() => setDisplayStyle("banner")} />
                    <RadioButton label="Inline code chip" helpText="Shows a compact clickable code tag inline" checked={displayStyle === "inline"} id="ds-inline" name="displayStyle" onChange={() => setDisplayStyle("inline")} />
                    <RadioButton label="Sticky bar" helpText="Appears as a sticky notification bar at the top of the cart" checked={displayStyle === "sticky"} id="ds-sticky" name="displayStyle" onChange={() => setDisplayStyle("sticky")} />
                  </BlockStack>
                </BlockStack>

                <Divider />

                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">Code behaviour</Text>
                  <Checkbox label="Allow customers to copy code with one click" checked={allowCopy} onChange={setAllowCopy} helpText="A copy icon appears next to the code." />
                  <Checkbox label="Auto-apply code when customer clicks it" checked={autoApply} onChange={setAutoApply} helpText="Automatically applies the discount code to the cart." />
                </BlockStack>
              </BlockStack>
            </SectionCard>

            {/* Message */}
            <SectionCard icon={EditIcon} title="Message content">
              <BlockStack gap="300">
                <TextField
                  label="Headline"
                  value={headline}
                  onChange={setHeadline}
                  autoComplete="off"
                  placeholder="e.g. Exclusive discount just for you!"
                  helpText="Main attention-grabbing title shown above the code."
                />
                <TextField
                  label="Description"
                  value={description}
                  onChange={setDescription}
                  autoComplete="off"
                  placeholder="e.g. Use code SAVE15 at checkout for 15% off your entire order."
                  multiline={2}
                />
                <TextField
                  label="Call-to-action text (optional)"
                  value={ctaText}
                  onChange={setCtaText}
                  autoComplete="off"
                  placeholder="e.g. Copy code"
                />
              </BlockStack>
            </SectionCard>

            {/* Style */}
            <SectionCard icon={EditIcon} title="Style">
              <BlockStack gap="400">
                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">Position in cart</Text>
                  <BlockStack gap="100">
                    <RadioButton label="Top of cart" checked={position === "top"} id="pos-top" name="posn" onChange={() => setPosition("top")} />
                    <RadioButton label="Below cart items" checked={position === "below_items"} id="pos-below" name="posn" onChange={() => setPosition("below_items")} />
                    <RadioButton label="Above checkout button" checked={position === "above_checkout"} id="pos-checkout" name="posn" onChange={() => setPosition("above_checkout")} />
                  </BlockStack>
                </BlockStack>

                <Divider />

                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">Colors</Text>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <Text variant="bodySm" as="p" tone="subdued">Background color</Text>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
                        <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} style={{ width: "36px", height: "36px", border: "1px solid #e1e3e5", borderRadius: "6px", cursor: "pointer", padding: "2px" }} />
                        <Text variant="bodySm" as="p">{bgColor}</Text>
                      </div>
                    </div>
                    <div>
                      <Text variant="bodySm" as="p" tone="subdued">Text color</Text>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
                        <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} style={{ width: "36px", height: "36px", border: "1px solid #e1e3e5", borderRadius: "6px", cursor: "pointer", padding: "2px" }} />
                        <Text variant="bodySm" as="p">{textColor}</Text>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Text variant="bodySm" as="p" tone="subdued">Code box background</Text>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
                      <input type="color" value={codeBoxBg} onChange={e => setCodeBoxBg(e.target.value)} style={{ width: "36px", height: "36px", border: "1px solid #e1e3e5", borderRadius: "6px", cursor: "pointer", padding: "2px" }} />
                      <Text variant="bodySm" as="p">{codeBoxBg}</Text>
                    </div>
                  </div>
                </BlockStack>

                <Divider />

                <Checkbox label="Allow customers to dismiss / close this banner" checked={isDismissible} onChange={setIsDismissible} helpText="Shows an × button to hide the banner." />
              </BlockStack>
            </SectionCard>

            {/* Conditions */}
            <SectionCard icon={DiscountIcon} title="Display conditions">
              <BlockStack gap="300">
                <Text variant="bodyMd" fontWeight="semibold" as="p">Show this banner when</Text>
                <BlockStack gap="100">
                  <RadioButton label="Always show" checked={showWhen === "always"} id="cond-always" name="showWhen" onChange={() => setShowWhen("always")} />
                  <RadioButton label="Cart value is above a minimum" checked={showWhen === "cart_value"} id="cond-value" name="showWhen" onChange={() => setShowWhen("cart_value")} helpText="Show only when the cart total exceeds a threshold." />
                </BlockStack>
                {showWhen === "cart_value" && (
                  <TextField label="Minimum cart value" type="number" value={minCartValue} onChange={setMinCartValue} autoComplete="off" prefix="$" placeholder="e.g. 25" />
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

            {/* Live preview */}
            <div style={{ background: "#fff", border: "1px solid #e1e3e5", borderRadius: "10px", overflow: "hidden" }}>
              <Box padding="300" borderBlockEndWidth="025" borderColor="border">
                <Text variant="bodyMd" fontWeight="semibold" as="p">Preview</Text>
              </Box>
              <Box padding="300">
                <div style={{ borderRadius: "8px", background: bgColor, padding: "14px 16px" }}>
                  <Text variant="bodySm" fontWeight="semibold" as="p" >
                    {headline || "Exclusive discount just for you!"}
                  </Text>
                  {description && (
                    <Box paddingBlockStart="100">
                      <Text variant="bodySm" as="p">{description}</Text>
                    </Box>
                  )}
                  {discountCode && (
                    <Box paddingBlockStart="200">
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: codeBoxBg, border: "1.5px dashed #d97706", borderRadius: "6px", padding: "6px 12px" }}>
                        <Text variant="bodyMd" fontWeight="bold" as="span">{discountCode}</Text>
                        {allowCopy && <span style={{ fontSize: "13px", cursor: "pointer" }}>📋</span>}
                      </div>
                    </Box>
                  )}
                </div>
                <Box paddingBlockStart="200">
                  <Text variant="bodySm" tone="subdued" as="p">Live preview based on your settings.</Text>
                </Box>
              </Box>
            </div>
          </BlockStack>
        </div>
      </Box>
    </Page>
  );
}
