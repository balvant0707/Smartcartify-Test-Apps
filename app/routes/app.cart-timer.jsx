import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useSubmit, useActionData, useLoaderData, useNavigation } from "react-router";
import prisma from "../db.server";
import {
  Page, Text, Box, BlockStack, InlineStack, Button, TextField,
  Select, Checkbox, Collapsible, Divider, Icon, RadioButton,
} from "@shopify/polaris";
import {
  ClockIcon, SettingsIcon, EditIcon, MinimizeIcon, MaximizeIcon,
  PauseCircleIcon, PersonFilledIcon, CalendarIcon, AlertCircleIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  let record = null;
  if (id) {
    const raw = await prisma.campaign.findFirst({
      where: { id: parseInt(id), shop: session.shop, type: "cart-timer" },
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
    type: "cart-timer",
    name: name || "Cart Timer",
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

function TimerDisplay({ hours, minutes, seconds, bgColor, textColor, messageText, labelAbove }) {
  return (
    <div style={{ background: bgColor, borderRadius: "8px", padding: "12px 14px" }}>
      {labelAbove && (
        <Text variant="bodySm" fontWeight="semibold" as="p" alignment="center">
          <span style={{ color: textColor }}>{messageText || "Limited time offer — order soon!"}</span>
        </Text>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", marginTop: labelAbove ? "8px" : "0" }}>
        {[{ v: hours, l: "HH" }, { v: minutes, l: "MM" }, { v: seconds, l: "SS" }].map((seg, i) => (
          <>
            <div key={seg.l} style={{ background: textColor, color: bgColor, borderRadius: "6px", padding: "8px 12px", minWidth: "40px", textAlign: "center" }}>
              <div style={{ fontSize: "18px", fontWeight: "700", fontFamily: "monospace", lineHeight: 1 }}>{seg.v || "00"}</div>
              <div style={{ fontSize: "10px", marginTop: "2px", opacity: 0.8 }}>{seg.l}</div>
            </div>
            {i < 2 && <span style={{ color: textColor, fontSize: "18px", fontWeight: "700" }}>:</span>}
          </>
        ))}
      </div>
      {!labelAbove && (
        <Box paddingBlockStart="100">
          <Text variant="bodySm" as="p" alignment="center">
            <span style={{ color: textColor, opacity: 0.8 }}>{messageText || "Limited time offer — order soon!"}</span>
          </Text>
        </Box>
      )}
    </div>
  );
}

export default function CartTimerCreate() {
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
  const [campaignName, setCampaignName] = useState(r?.name ?? "Cart Timer");
  const isSaving = navigation.state === "submitting";

  // Timer
  const [timerType, setTimerType] = useState(r?.timerType ?? "fixed");
  const [durationHours, setDurationHours] = useState(r?.hours ?? "0");
  const [durationMinutes, setDurationMinutes] = useState(r?.minutes ?? "30");
  const [durationSeconds, setDurationSeconds] = useState(r?.seconds ?? "00");
  const [resetOnReopen, setResetOnReopen] = useState(r?.resetOnReopen ?? false);
  const [countdownDate, setCountdownDate] = useState(r?.countdownDate ?? "");
  const [countdownTime, setCountdownTime] = useState(r?.countdownTime ?? "23:59");

  // Message
  const [messageText, setMessageText] = useState(r?.messageText ?? "");
  const [expiredText, setExpiredText] = useState(r?.expiredText ?? "");
  const [labelPosition, setLabelPosition] = useState(r?.labelPosition ?? "above");

  // Expiry behaviour
  const [expiryBehaviour, setExpiryBehaviour] = useState(r?.expiryBehavior ?? "show_message");
  const [redirectUrl, setRedirectUrl] = useState(r?.expiryRedirectUrl ?? "");

  // Style
  const [bgColor, setBgColor] = useState(r?.bgColor ?? "#1e1e2e");
  const [textColor, setTextColor] = useState(r?.textColor ?? "#ffffff");
  const [position, setPosition] = useState(r?.position ?? "top");

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
        timerType,
        hours: durationHours,
        minutes: durationMinutes,
        seconds: durationSeconds,
        countdownDate,
        countdownTime,
        resetOnReopen,
        messageText,
        expiredText,
        labelPosition,
        expiryBehavior: expiryBehaviour,
        expiryRedirectUrl: redirectUrl,
        digitBgColor: bgColor,
        digitTextColor: textColor,
        bgColor,
        textColor,
        position,
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
      title={campaignName || "Cart Timer"}
      primaryAction={{ content: "Save", loading: isSaving, onAction: handleSave }}
      secondaryActions={[{ content: status === "active" ? "Pause" : "Activate", onAction: () => setStatus(s => s === "active" ? "draft" : "active") }]}
    >
      <style>{`.ct-layout{display:grid;grid-template-columns:1fr 320px;gap:20px;align-items:start}@media(max-width:900px){.ct-layout{grid-template-columns:1fr}}`}</style>
      <Box paddingBlockEnd="800">
        <div className="ct-layout">
          <BlockStack gap="400">

            {/* Timer */}
            <SectionCard icon={ClockIcon} title="Timer settings">
              <BlockStack gap="400">
                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">Timer type</Text>
                  <BlockStack gap="100">
                    <RadioButton label="Fixed countdown duration" helpText="Timer counts down from a set duration for each customer session" checked={timerType === "fixed"} id="tt-fixed" name="timerType" onChange={() => setTimerType("fixed")} />
                    <RadioButton label="Countdown to a specific date & time" helpText="All customers see the same deadline" checked={timerType === "date"} id="tt-date" name="timerType" onChange={() => setTimerType("date")} />
                  </BlockStack>
                </BlockStack>

                {timerType === "fixed" && (
                  <BlockStack gap="200">
                    <Text variant="bodyMd" fontWeight="semibold" as="p">Duration</Text>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                      <TextField label="Hours" type="number" value={durationHours} onChange={setDurationHours} autoComplete="off" min="0" max="23" suffix="hr" />
                      <TextField label="Minutes" type="number" value={durationMinutes} onChange={setDurationMinutes} autoComplete="off" min="0" max="59" suffix="min" />
                      <TextField label="Seconds" type="number" value={durationSeconds} onChange={setDurationSeconds} autoComplete="off" min="0" max="59" suffix="sec" />
                    </div>
                    <Checkbox label="Reset timer each time the cart is reopened" checked={resetOnReopen} onChange={setResetOnReopen} helpText="If unchecked, the timer persists across cart opens in the same session." />
                  </BlockStack>
                )}

                {timerType === "date" && (
                  <BlockStack gap="200">
                    <Text variant="bodyMd" fontWeight="semibold" as="p">Countdown deadline</Text>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      <TextField label="End date" type="date" value={countdownDate} onChange={setCountdownDate} prefix={<Icon source={CalendarIcon} />} autoComplete="off" />
                      <TextField label="End time" type="time" value={countdownTime} onChange={setCountdownTime} prefix={<Icon source={ClockIcon} />} autoComplete="off" />
                    </div>
                  </BlockStack>
                )}
              </BlockStack>
            </SectionCard>

            {/* Message */}
            <SectionCard icon={EditIcon} title="Messages">
              <BlockStack gap="300">
                <TextField
                  label="Timer message"
                  value={messageText}
                  onChange={setMessageText}
                  autoComplete="off"
                  placeholder="e.g. ⚡ Hurry! Limited time offer ends in:"
                  helpText="Shown while the timer is counting down."
                />
                <TextField
                  label="Expired message"
                  value={expiredText}
                  onChange={setExpiredText}
                  autoComplete="off"
                  placeholder="e.g. ⏰ Offer has expired."
                  helpText="Shown when the timer reaches zero (if expiry action is 'show message')."
                />
                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">Message position relative to timer</Text>
                  <BlockStack gap="100">
                    <RadioButton label="Above the countdown" checked={labelPosition === "above"} id="lp-above" name="labelPos" onChange={() => setLabelPosition("above")} />
                    <RadioButton label="Below the countdown" checked={labelPosition === "below"} id="lp-below" name="labelPos" onChange={() => setLabelPosition("below")} />
                  </BlockStack>
                </BlockStack>
              </BlockStack>
            </SectionCard>

            {/* Expiry behaviour */}
            <SectionCard icon={AlertCircleIcon} title="When timer expires">
              <BlockStack gap="300">
                <BlockStack gap="100">
                  <RadioButton label="Show expired message" helpText="Replace the timer with the expired text" checked={expiryBehaviour === "show_message"} id="eb-message" name="expiryBehaviour" onChange={() => setExpiryBehaviour("show_message")} />
                  <RadioButton label="Clear the cart" helpText="Remove all items from the cart" checked={expiryBehaviour === "clear_cart"} id="eb-clear" name="expiryBehaviour" onChange={() => setExpiryBehaviour("clear_cart")} />
                  <RadioButton label="Redirect to a URL" helpText="Send the customer to a specific page" checked={expiryBehaviour === "redirect"} id="eb-redirect" name="expiryBehaviour" onChange={() => setExpiryBehaviour("redirect")} />
                  <RadioButton label="Hide the timer" helpText="Remove the timer block when it reaches zero" checked={expiryBehaviour === "hide"} id="eb-hide" name="expiryBehaviour" onChange={() => setExpiryBehaviour("hide")} />
                </BlockStack>
                {expiryBehaviour === "redirect" && (
                  <TextField label="Redirect URL" value={redirectUrl} onChange={setRedirectUrl} autoComplete="off" placeholder="https://…" helpText="Customer is redirected here when the timer reaches zero." />
                )}
              </BlockStack>
            </SectionCard>

            {/* Style */}
            <SectionCard icon={EditIcon} title="Style">
              <BlockStack gap="400">
                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">Position in cart</Text>
                  <BlockStack gap="100">
                    <RadioButton label="Top of cart" checked={position === "top"} id="pos-top" name="pos" onChange={() => setPosition("top")} />
                    <RadioButton label="Below cart items" checked={position === "below_items"} id="pos-below" name="pos" onChange={() => setPosition("below_items")} />
                    <RadioButton label="Above checkout button" checked={position === "above_checkout"} id="pos-checkout" name="pos" onChange={() => setPosition("above_checkout")} />
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
                      <Text variant="bodySm" as="p" tone="subdued">Text & digits</Text>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
                        <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} style={{ width: "36px", height: "36px", border: "1px solid #e1e3e5", borderRadius: "6px", cursor: "pointer", padding: "2px" }} />
                        <Text variant="bodySm" as="p">{textColor}</Text>
                      </div>
                    </div>
                  </div>
                </BlockStack>
              </BlockStack>
            </SectionCard>

            {/* Conditions */}
            <SectionCard icon={ClockIcon} title="Display conditions">
              <BlockStack gap="300">
                <BlockStack gap="100">
                  <RadioButton label="Always show" checked={showWhen === "always"} id="cond-always" name="showWhen" onChange={() => setShowWhen("always")} />
                  <RadioButton label="Cart value is above a minimum" checked={showWhen === "cart_value"} id="cond-value" name="showWhen" onChange={() => setShowWhen("cart_value")} />
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

            {/* Timer preview */}
            <div style={{ background: "#fff", border: "1px solid #e1e3e5", borderRadius: "10px", overflow: "hidden" }}>
              <Box padding="300" borderBlockEndWidth="025" borderColor="border">
                <Text variant="bodyMd" fontWeight="semibold" as="p">Preview</Text>
              </Box>
              <Box padding="300">
                <TimerDisplay
                  hours={durationHours.padStart(2, "0")}
                  minutes={durationMinutes.padStart(2, "0")}
                  seconds={durationSeconds.padStart(2, "0")}
                  bgColor={bgColor}
                  textColor={textColor}
                  messageText={messageText}
                  labelAbove={labelPosition === "above"}
                />
                <Box paddingBlockStart="200">
                  <Text variant="bodySm" tone="subdued" as="p">Live preview based on your style settings.</Text>
                </Box>
              </Box>
            </div>
          </BlockStack>
        </div>
      </Box>
    </Page>
  );
}
