import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useSubmit, useActionData, useLoaderData, useNavigation } from "react-router";
import prisma from "../db.server";
import {
  Page, Text, Box, BlockStack, InlineStack, Button, TextField,
  Select, Checkbox, Collapsible, Divider, Icon, RadioButton,
} from "@shopify/polaris";
import {
  AlertCircleIcon, SettingsIcon, EditIcon, MinimizeIcon, MaximizeIcon,
  PauseCircleIcon, PersonFilledIcon, CalendarIcon, ClockIcon, LinkIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  let record = null;
  if (id) {
    const raw = await prisma.campaign.findFirst({
      where: { id: parseInt(id), shop: session.shop, type: "cart-announcement-bar" },
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
    type: "cart-announcement-bar",
    name: name || "Cart Announcement Bar",
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

const ICON_OPTIONS = [
  { label: "None", value: "" },
  { label: "🎉 Party", value: "🎉" },
  { label: "🚚 Truck", value: "🚚" },
  { label: "🔥 Fire", value: "🔥" },
  { label: "⚡ Lightning", value: "⚡" },
  { label: "🎁 Gift", value: "🎁" },
  { label: "💥 Burst", value: "💥" },
  { label: "📢 Megaphone", value: "📢" },
  { label: "❄️ Snowflake", value: "❄️" },
];

export default function CartAnnouncementBarCreate() {
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
  const [campaignName, setCampaignName] = useState(r?.name ?? "Cart Announcement Bar");
  const isSaving = navigation.state === "submitting";

  // Message
  const [messageText, setMessageText] = useState(r?.message ?? "");
  const [icon, setIcon] = useState(r?.icon ?? "🎉");
  const [hasLink, setHasLink] = useState(!!(r?.linkUrl));
  const [linkText, setLinkText] = useState(r?.linkText ?? "");
  const [linkUrl, setLinkUrl] = useState(r?.linkUrl ?? "");
  const [linkOpenNewTab, setLinkOpenNewTab] = useState(true);

  // Style
  const [bgColor, setBgColor] = useState(r?.bgColor ?? "#fef3c7");
  const [textColor, setTextColor] = useState(r?.textColor ?? "#92400e");
  const [position, setPosition] = useState(r?.position ?? "top");
  const [isDismissible, setIsDismissible] = useState(r?.isDismissible ?? false);
  const [textAlign, setTextAlign] = useState(r?.textAlignment ?? "center");
  const [fontSize, setFontSize] = useState(r?.fontSize ?? "14");

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
        icon,
        message: messageText,
        linkUrl,
        linkText,
        position,
        bgColor,
        textColor,
        textAlignment: textAlign,
        fontSize,
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
      title={campaignName || "Cart Announcement Bar"}
      primaryAction={{ content: "Save", loading: isSaving, onAction: handleSave }}
      secondaryActions={[{ content: status === "active" ? "Pause" : "Activate", onAction: () => setStatus(s => s === "active" ? "draft" : "active") }]}
    >
      <style>{`.cab-layout{display:grid;grid-template-columns:1fr 320px;gap:20px;align-items:start}@media(max-width:900px){.cab-layout{grid-template-columns:1fr}}`}</style>
      <Box paddingBlockEnd="800">
        <div className="cab-layout">
          <BlockStack gap="400">

            {/* Message */}
            <SectionCard icon={AlertCircleIcon} title="Message">
              <BlockStack gap="400">
                <Select
                  label="Icon"
                  options={ICON_OPTIONS}
                  value={icon}
                  onChange={setIcon}
                  helpText="Emoji shown before the message text."
                />
                <TextField
                  label="Announcement text"
                  value={messageText}
                  onChange={setMessageText}
                  autoComplete="off"
                  placeholder="e.g. 🚚 Free shipping on orders over $50!"
                  multiline={2}
                  helpText="Keep it short and action-oriented. Supports multiple languages."
                />

                <Divider />

                <Checkbox
                  label="Add a link to the announcement"
                  checked={hasLink}
                  onChange={setHasLink}
                  helpText="Makes part of the text clickable."
                />
                {hasLink && (
                  <BlockStack gap="200">
                    <TextField
                      label="Link text"
                      value={linkText}
                      onChange={setLinkText}
                      autoComplete="off"
                      placeholder="e.g. Shop now"
                    />
                    <TextField
                      label="Link URL"
                      value={linkUrl}
                      onChange={setLinkUrl}
                      autoComplete="off"
                      placeholder="https://…"
                      prefix={<Icon source={LinkIcon} />}
                    />
                    <Checkbox
                      label="Open link in a new tab"
                      checked={linkOpenNewTab}
                      onChange={setLinkOpenNewTab}
                    />
                  </BlockStack>
                )}
              </BlockStack>
            </SectionCard>

            {/* Style */}
            <SectionCard icon={EditIcon} title="Style">
              <BlockStack gap="400">
                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">Position in cart</Text>
                  <BlockStack gap="100">
                    <RadioButton label="Top of cart (above items)" checked={position === "top"} id="cab-top" name="position" onChange={() => setPosition("top")} />
                    <RadioButton label="Below cart items" checked={position === "below_items"} id="cab-below" name="position" onChange={() => setPosition("below_items")} />
                    <RadioButton label="Above checkout button" checked={position === "above_checkout"} id="cab-checkout" name="position" onChange={() => setPosition("above_checkout")} />
                  </BlockStack>
                </BlockStack>

                <Divider />

                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">Colors</Text>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <Text variant="bodySm" as="p" tone="subdued">Background</Text>
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
                </BlockStack>

                <Divider />

                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">Text alignment</Text>
                  <div style={{ display: "inline-flex", background: "#f1f1f1", borderRadius: "8px", padding: "3px", gap: "2px" }}>
                    {["left", "center", "right"].map(a => (
                      <button key={a} onClick={() => setTextAlign(a)} style={{ padding: "6px 14px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: textAlign === a ? "600" : "400", fontSize: "13px", background: textAlign === a ? "#fff" : "transparent", boxShadow: textAlign === a ? "0 1px 3px rgba(0,0,0,0.12)" : "none", color: textAlign === a ? "#1a1a1a" : "#6d7175" }}>
                        {a.charAt(0).toUpperCase() + a.slice(1)}
                      </button>
                    ))}
                  </div>
                </BlockStack>

                <div style={{ maxWidth: "120px" }}>
                  <TextField label="Font size (px)" type="number" value={fontSize} onChange={setFontSize} autoComplete="off" suffix="px" min="10" max="20" />
                </div>

                <Divider />

                <Checkbox label="Allow customers to dismiss / close this bar" checked={isDismissible} onChange={setIsDismissible} helpText="Shows an × button to hide the bar." />
              </BlockStack>
            </SectionCard>

            {/* Conditions */}
            <SectionCard icon={AlertCircleIcon} title="Display conditions">
              <BlockStack gap="300">
                <Text variant="bodyMd" fontWeight="semibold" as="p">Show announcement when</Text>
                <BlockStack gap="100">
                  <RadioButton label="Always show" checked={showWhen === "always"} id="cond-always" name="showWhen" onChange={() => setShowWhen("always")} />
                  <RadioButton label="Cart value is above a minimum" helpText="Show only when cart total exceeds a threshold" checked={showWhen === "cart_value"} id="cond-value" name="showWhen" onChange={() => setShowWhen("cart_value")} />
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
                <div style={{ borderRadius: "8px", overflow: "hidden", border: "1px solid #e1e3e5" }}>
                  {position === "top" && (
                    <div style={{ background: bgColor, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: textAlign, gap: "8px", borderBottom: "1px solid rgba(0,0,0,0.06)", position: "relative" }}>
                      {icon && <span style={{ fontSize: "14px" }}>{icon}</span>}
                      <Text variant="bodySm" as="p" fontWeight="semibold">
                        <span style={{ color: textColor, fontSize: `${fontSize}px` }}>
                          {messageText || "Free shipping on orders over $50!"}
                        </span>
                      </Text>
                      {isDismissible && <span style={{ marginLeft: "auto", cursor: "pointer", color: textColor, fontSize: "16px" }}>×</span>}
                    </div>
                  )}
                  <div style={{ padding: "10px 14px" }}>
                    <Text variant="bodySm" tone="subdued" as="p">Cart items here…</Text>
                  </div>
                  {position !== "top" && (
                    <div style={{ background: bgColor, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: textAlign, gap: "8px", borderTop: "1px solid rgba(0,0,0,0.06)", position: "relative" }}>
                      {icon && <span style={{ fontSize: "14px" }}>{icon}</span>}
                      <Text variant="bodySm" as="p" fontWeight="semibold">
                        <span style={{ color: textColor, fontSize: `${fontSize}px` }}>
                          {messageText || "Free shipping on orders over $50!"}
                        </span>
                      </Text>
                      {isDismissible && <span style={{ marginLeft: "auto", cursor: "pointer", color: textColor, fontSize: "16px" }}>×</span>}
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
