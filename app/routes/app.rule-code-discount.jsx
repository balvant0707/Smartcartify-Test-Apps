import { useState, useEffect } from "react";
import {
  useNavigate, useSearchParams, useSubmit,
  useActionData, useLoaderData, useNavigation,
} from "react-router";
import {
  Page, Text, Box, BlockStack, InlineStack, Button,
  TextField, Select, Checkbox, Collapsible, Divider,
  Icon, RadioButton, Banner, Tabs,
} from "@shopify/polaris";
import {
  CodeIcon, SettingsIcon, EditIcon,
  MinimizeIcon, MaximizeIcon, PauseCircleIcon,
  CalendarIcon, ClockIcon, ClipboardIcon, PersonFilledIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { upsertDiscountCode } from "../shopify-discount.server";
import { invalidateShopCache } from "./app.proxy.smart.jsx";

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Loader Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  let record = null;
  if (id) {
    const row = await prisma.discountRule.findFirst({
      where: { id: parseInt(id, 10), shop: session.shop },
    });
    if (row && String(row.type || "").toLowerCase() === "code") {
      record = row;
    }
  }
  return { record };
};

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Action Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const body = await request.json();
  const {
    id, codeCampaignName, enabled, discountCode, valueType, value,
    triggerType, minPurchase, minQuantity,
    progressTextBefore, progressTextAfter,
    startsAt, endsAt, priority,
    customerTarget, customerTags,
    // priority is already destructured above
  } = body;

  const dbData = {
    shop,
    type: "code",
    codeCampaignName: codeCampaignName || "Code Discount",
    campaignName: codeCampaignName || "Code Discount",
    enabled: enabled !== false,
    discountCode: discountCode ? String(discountCode).toUpperCase().trim() : null,
    valueType: valueType || "percent",
    value: value ? String(value) : "0",
    triggerType: triggerType || "amount",
    minPurchase: triggerType === "amount" ? (minPurchase ? String(minPurchase) : null) : null,
    minQuantity: triggerType === "quantity" ? (minQuantity ? String(minQuantity) : null) : null,
    progressTextBefore: progressTextBefore || null,
    progressTextAfter: progressTextAfter || null,
    progressTextBelow: null,
    startsAt: startsAt ? new Date(startsAt) : null,
    endsAt: endsAt ? new Date(endsAt) : null,
    priority: parseInt(priority || "0") || 0,
    rewardType: valueType === "amount" ? "amount" : "percent",
    customerTarget: customerTarget || "all",
    customerTags: (customerTarget === "has_tag" || customerTarget === "no_tag") ? (customerTags || null) : null,
  };

  const numericDiscountValue = Number(value || 0);
  const numericMinPurchase = Number(minPurchase || 0);

  if (valueType === "percent" && numericDiscountValue > 100) {
    return { error: "Percentage discount cannot be more than 100%." };
  }

  if (triggerType === "amount" && (!Number.isFinite(numericMinPurchase) || numericMinPurchase <= 0)) {
    return { error: "Minimum cart value is required." };
  }

  try {
    let existingShopifyId = null;
    if (id) {
      const existing = await prisma.discountRule.findFirst({
        where: { id: parseInt(id, 10), shop },
        select: { codeDiscountId: true },
      });
      existingShopifyId = existing?.codeDiscountId || null;
    }

    if (!discountCode) {
      return { error: "Discount code is required to create a Shopify code discount." };
    }

    const shopifyId = await upsertDiscountCode(admin, {
      existingId: existingShopifyId,
      title: codeCampaignName || "Code Discount",
      code: String(discountCode).toUpperCase().trim(),
      startsAt: startsAt || null,
      endsAt: endsAt || null,
      enabled: enabled !== false,
      isPercentage: valueType !== "amount",
      discountValue: value || "0",
      minReqType: triggerType === "quantity" ? "quantity" : "subtotal",
      minSubtotal: triggerType === "amount" ? (minPurchase || null) : null,
      minQuantity: triggerType === "quantity" ? (minQuantity || null) : null,
    });
    if (shopifyId) dbData.codeDiscountId = shopifyId;

    let record;
    if (id) {
      const existing = await prisma.discountRule.findFirst({ where: { id: parseInt(id, 10), shop } });
      if (!existing) return { error: "Rule not found" };
      record = await prisma.discountRule.update({ where: { id: parseInt(id, 10) }, data: dbData });
    } else {
      record = await prisma.discountRule.create({ data: dbData });
    }
    invalidateShopCache(shop);
    return { success: true, id: record.id };
  } catch (err) {
    return { error: err.message };
  }
};

const TRIGGER_TABS = [
  { id: "trigger-amount", content: "Amount Discount" },
  { id: "trigger-quantity", content: "Quantity Discount" },
];

const formatDiscountValueWithOff = (valueType, value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return valueType === "percent" ? `${raw}% off` : `$${raw} off`;
};

const replaceCodeDiscountTokens = (text, values) =>
  String(text || "").replace(/\{\{(goal|discount_value_with_off|discount_code)\}\}/g, (_match, token) => values[token] || "");

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ SectionCard Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Component Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

export default function RuleCodeDiscount() {
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

  // Sidebar
  const [codeCampaignName, setCodeCampaignName] = useState(r?.codeCampaignName ?? r?.campaignName ?? "Code Discount");
  const [enabled, setEnabled] = useState(r?.enabled !== false);

  // Code & discount
  const [discountCode, setDiscountCode] = useState(r?.discountCode ?? "");
  const [valueType, setValueType] = useState(r?.valueType ?? "percent");
  const [value, setValue] = useState(r?.value ?? "");
  const [triggerTabIdx, setTriggerTabIdx] = useState(r?.triggerType === "quantity" ? 1 : 0);
  const triggerType = triggerTabIdx === 0 ? "amount" : "quantity";
  const [minPurchase, setMinPurchase] = useState(r?.minPurchase ?? "");
  const [minQuantity, setMinQuantity] = useState(r?.minQuantity ?? "");

  // Messages
  const [progressTextBefore, setProgressTextBefore] = useState(r?.progressTextBefore ?? "Add {{goal}} more to use code {{discount_code}} and get {{discount_value_with_off}}!");
  const [progressTextAfter, setProgressTextAfter] = useState(r?.progressTextAfter ?? "{{discount_value_with_off}} unlocked with code {{discount_code}}!");

  // Schedule
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(r?.startsAt ? new Date(r.startsAt).toISOString().split("T")[0] : today);
  const [startTime, setStartTime] = useState(r?.startsAt ? new Date(r.startsAt).toTimeString().slice(0, 5) : "00:00");
  const [hasEndDate, setHasEndDate] = useState(!!r?.endsAt);
  const [endDate, setEndDate] = useState(r?.endsAt ? new Date(r.endsAt).toISOString().split("T")[0] : "");
  const [endTime, setEndTime] = useState(r?.endsAt ? new Date(r.endsAt).toTimeString().slice(0, 5) : "23:59");

  // Targeting & priority (priority added)
  const [priority, setPriority] = useState(String(r?.priority ?? "0"));
  const [customerTarget, setCustomerTarget] = useState(r?.customerTarget ?? "all");
  const [customerTags, setCustomerTags] = useState(r?.customerTags ?? "");
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (actionData?.success && navigation.state === "idle" && !recordId && actionData.id) {
      const idParam = `id=${encodeURIComponent(actionData.id)}`;
      const hostParam = host ? `&host=${encodeURIComponent(host)}` : "";
      navigate(`/app/rule-code-discount?${idParam}${hostParam}`, { replace: true });
    }
  }, [actionData, host, navigate, navigation.state, recordId]);

  const validateForm = () => {
    const errors = {};
    const numericDiscountValue = Number(value || 0);
    const numericMinPurchase = Number(minPurchase || 0);

    if (valueType === "percent" && numericDiscountValue > 100) {
      errors.value = "Percentage discount cannot be more than 100%.";
    }

    if (triggerType === "amount" && (!Number.isFinite(numericMinPurchase) || numericMinPurchase <= 0)) {
      errors.minPurchase = "Minimum cart value is required.";
    }

    return errors;
  };

  const handleSave = () => {
    const errors = validateForm();
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    submit(
      {
        id: recordId,
        codeCampaignName,
        enabled,
        discountCode,
        valueType,
        value,
        triggerType,
        minPurchase: triggerType === "amount" ? minPurchase : null,
        minQuantity: triggerType === "quantity" ? minQuantity : null,
        progressTextBefore,
        progressTextAfter,
        priority,
        startsAt: startDate ? new Date(`${startDate}T${startTime}`).toISOString() : null,
        endsAt: hasEndDate && endDate ? new Date(`${endDate}T${endTime}`).toISOString() : null,
        customerTarget,
        customerTags: (customerTarget === "has_tag" || customerTarget === "no_tag") ? customerTags : null,
      },
      { method: "post", encType: "application/json" }
    );
  };

  const discountLabel = formatDiscountValueWithOff(valueType, value);

  const [sliderValue, setSliderValue] = useState(50);
  const minPurchaseNum = parseFloat(minPurchase || 0);
  const minQuantityNum = parseInt(minQuantity || 0);
  const hasThreshold = triggerType === "amount" ? minPurchaseNum > 0 : minQuantityNum > 0;
  const mockCart = triggerType === "amount"
    ? (minPurchaseNum > 0 ? (minPurchaseNum * sliderValue) / 100 : sliderValue)
    : (minQuantityNum > 0 ? (minQuantityNum * sliderValue) / 100 : sliderValue);
  const meetsMin = !hasThreshold || sliderValue >= 100;
  const remaining = triggerType === "amount"
    ? Math.max(0, minPurchaseNum - mockCart).toFixed(2)
    : Math.max(0, minQuantityNum - Math.floor(mockCart)).toString();
  const progressPct = hasThreshold ? sliderValue : 100;
  const isUnlocked = meetsMin;
  const goalText = triggerType === "amount"
    ? `$${remaining}`
    : `${remaining} item${parseInt(remaining, 10) !== 1 ? "s" : ""}`;
  const previewTokens = {
    goal: hasThreshold ? goalText : "",
    discount_value_with_off: discountLabel || "your discount",
    discount_code: discountCode || "CODE",
  };
  const previewBeforeText = replaceCodeDiscountTokens(
    progressTextBefore || "Add {{goal}} more to use code {{discount_code}} and get {{discount_value_with_off}}!",
    previewTokens
  );
  const previewAfterText = replaceCodeDiscountTokens(
    progressTextAfter || "{{discount_value_with_off}} unlocked with code {{discount_code}}!",
    previewTokens
  );

  return (
    <Page
      backAction={{ content: "Campaigns", onAction: () => navigate(withHost("/app/campaigns")) }}
      title={codeCampaignName || "Code Discount"}
      primaryAction={{ content: "Save", loading: isSaving, onAction: handleSave }}
      secondaryActions={[
        {
          content: enabled ? "Draft" : "Active",
          tone: enabled ? "caution" : "success",
          onAction: () => setEnabled(v => !v),
        },
      ]}
    >
      <style>{`
        .cd-layout{display:grid;grid-template-columns:1fr 320px;gap:20px;align-items:start}
        .cd-statusButton{width:100%;border:0;border-radius:12px;padding:10px 14px;font-weight:700;cursor:pointer}
        .cd-statusButtonActive{background:#22c55e;color:#fff}
        .cd-statusButtonDraft{background:#fef3c7;color:#92400e;border:1px solid #fcd34d}

        @media(max-width:900px){.cd-layout{grid-template-columns:1fr}}
      `}</style>
      {actionData?.error && (
        <Box paddingBlockEnd="400">
          <Banner tone="critical" title="Save failed">{actionData.error}</Banner>
        </Box>
      )}
      <Box paddingBlockEnd="800">
        <div className="cd-layout">
          {/* Ã¢â€â‚¬Ã¢â€â‚¬ Main column Ã¢â€â‚¬Ã¢â€â‚¬ */}
          <BlockStack gap="400">

            {/* Discount code + Display condition */}
            <SectionCard icon={CodeIcon} title="Discount code">
              <BlockStack gap="400">
                <TextField
                  label="Discount code"
                  value={discountCode}
                  onChange={(v) => setDiscountCode(v.toUpperCase())}
                  autoComplete="off"
                  placeholder="e.g. SAVE15"
                  helpText="Enter the exact Shopify discount code. It will also be created / synced in your Shopify discounts."
                  prefix={<Icon source={ClipboardIcon} />}
                />

                <Divider />

                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">Discount type</Text>
                  <InlineStack gap="400">
                    <RadioButton
                      label="Percentage off"
                      checked={valueType === "percent"}
                      id="cd-vt-percent"
                      name="cdValueType"
                      onChange={() => {
                        setValueType("percent");
                        setFormErrors((current) => ({ ...current, value: undefined }));
                      }}
                    />
                    <RadioButton
                      label="Fixed amount off"
                      checked={valueType === "amount"}
                      id="cd-vt-amount"
                      name="cdValueType"
                      onChange={() => {
                        setValueType("amount");
                        setFormErrors((current) => ({ ...current, value: undefined }));
                      }}
                    />
                  </InlineStack>
                </BlockStack>

                <TextField
                  label={valueType === "percent" ? "Percentage off" : "Amount off"}
                  type="number"
                  value={value}
                  onChange={(nextValue) => {
                    setValue(nextValue);
                    setFormErrors((current) => ({ ...current, value: undefined }));
                  }}
                  autoComplete="off"
                  error={formErrors.value}
                  suffix={valueType === "percent" ? "%" : undefined}
                  prefix={valueType === "amount" ? "$" : undefined}
                  placeholder={valueType === "percent" ? "e.g. 15" : "e.g. 20"}
                />

                <Divider />

                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">Display condition</Text>
                  <Text variant="bodySm" tone="subdued" as="p">Set a threshold customers must reach before this code is shown.</Text>
                  <Tabs tabs={TRIGGER_TABS} selected={triggerTabIdx} onSelect={setTriggerTabIdx} />
                </BlockStack>
                <Box>
                  {triggerTabIdx === 0 ? (
                    <TextField
                      label="Minimum cart value"
                      type="number"
                      value={minPurchase}
                      onChange={(nextValue) => {
                        setMinPurchase(nextValue);
                        setFormErrors((current) => ({ ...current, minPurchase: undefined }));
                      }}
                      autoComplete="off"
                      prefix="$"
                      placeholder="e.g. 50"
                      error={formErrors.minPurchase}
                      helpText="Required. The discount code is shown after customers reach this cart value."
                    />
                  ) : (
                    <TextField
                      label="Minimum item quantity (optional)"
                      type="number"
                      value={minQuantity}
                      onChange={setMinQuantity}
                      autoComplete="off"
                      placeholder="e.g. 3"
                      helpText="Leave blank to always show the discount code in the cart."
                    />
                  )}
                </Box>
              </BlockStack>
            </SectionCard>

            {/* Messages */}
            <SectionCard icon={EditIcon} title="Progress messages (optional)">
              <BlockStack gap="300">
                <Banner tone="info">
                  Use <strong>{"{{goal}}"}</strong>, <strong>{"{{discount_value_with_off}}"}</strong>, and <strong>{"{{discount_code}}"}</strong> in the before and after messages.
                </Banner>
                <TextField
                  label="Message before minimum"
                  value={progressTextBefore}
                  onChange={setProgressTextBefore}
                  autoComplete="off"
                  placeholder="Add {{goal}} more to use code {{discount_code}} and get {{discount_value_with_off}}!"
                />
                <TextField
                  label="Message after minimum"
                  value={progressTextAfter}
                  onChange={setProgressTextAfter}
                  autoComplete="off"
                  placeholder="{{discount_value_with_off}} unlocked with code {{discount_code}}!"
                />
              </BlockStack>
            </SectionCard>

            {/* Targeting & priority */}
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

            {/* Schedule */}
            <SectionCard icon={CalendarIcon} title="Schedule" defaultOpen={false}>
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
              </BlockStack>
            </SectionCard>

          </BlockStack>

          {/* Ã¢â€â‚¬Ã¢â€â‚¬ Sidebar Ã¢â€â‚¬Ã¢â€â‚¬ */}
          <BlockStack gap="300">
            {!enabled && (
              <div style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: "10px", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ color: "#92400e" }}><Icon source={PauseCircleIcon} /></span>
                <Text variant="bodyMd" fontWeight="semibold" as="p">This rule is in draft</Text>
              </div>
            )}

            <div style={{ background: "#fff", border: "1px solid #e1e3e5", borderRadius: "10px", padding: "16px" }}>
              <BlockStack gap="300">
                <Select
                  label="Status"
                  options={[{ label: "Active", value: "true" }, { label: "Draft", value: "false" }]}
                  value={String(enabled)}
                  onChange={(v) => setEnabled(v === "true")}
                />
                <TextField label="Rule name" value={codeCampaignName} onChange={setCodeCampaignName} autoComplete="off" />
              </BlockStack>
            </div>

            {/* Preview */}
            <div style={{ background: "#fff", border: "1px solid #e1e3e5", borderRadius: "10px", overflow: "hidden" }}>
              <Box padding="300" borderBlockEndWidth="025" borderColor="border">
                <Text variant="bodyMd" fontWeight="semibold" as="p">Preview</Text>
              </Box>
              <Box padding="400">
                <div style={{ background: "#f9fafb", border: "1px solid #e1e3e5", borderRadius: "8px", padding: "14px 16px 18px" }}>
                  <div style={{ marginBottom: "14px", lineHeight: "1.5" }}>
                    {isUnlocked ? (
                      <Text variant="bodySm" fontWeight="semibold" as="p">
                        {previewAfterText}
                      </Text>
                    ) : hasThreshold ? (
                      <span style={{ fontSize: "13px" }}>
                        {previewBeforeText}
                      </span>
                    ) : (
                      <Text variant="bodySm" as="p">{previewAfterText}</Text>
                    )}
                  </div>
                  {hasThreshold && (
                    <div style={{ position: "relative", paddingRight: "44px" }}>
                      <div style={{ height: "4px", background: "#e1e3e5", borderRadius: "2px" }}>
                        <div style={{ height: "100%", width: `${progressPct}%`, background: isUnlocked ? "#16a34a" : "#111827", borderRadius: "2px", transition: "width 0.15s" }} />
                      </div>
                      <div style={{ position: "absolute", right: "0", top: "-10px", display: "flex", flexDirection: "column", alignItems: "center", gap: "1px" }}>
                        <Icon source={CodeIcon} tone={isUnlocked ? "success" : "base"} />
                        <span style={{ fontSize: "11px", color: isUnlocked ? "#16a34a" : "#6b7280", fontWeight: isUnlocked ? 600 : 400 }}>Discount!</span>
                      </div>
                    </div>
                  )}
                  {isUnlocked && discountCode && (
                    <div style={{ marginTop: "12px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fef3c7", border: "1.5px dashed #d97706", borderRadius: "6px", padding: "8px 12px" }}>
                      <Text variant="bodyMd" fontWeight="bold" as="span">{discountCode}</Text>
                      <span style={{ fontSize: "11px", color: "#92400e", fontWeight: 600 }}>COPY</span>
                    </div>
                  )}
                </div>
                {hasThreshold && (
                  <div style={{ marginTop: "16px" }}>
                    <Text variant="bodySm" tone="subdued" as="p">Use this to adjust the progress bar</Text>
                    <input
                      type="range" min="0" max="100" value={sliderValue}
                      onChange={(e) => setSliderValue(parseInt(e.target.value))}
                      style={{ width: "100%", marginTop: "8px", cursor: "pointer", accentColor: "#111827" }}
                    />
                  </div>
                )}
              </Box>
            </div>
          </BlockStack>
        </div>
      </Box>
    </Page>
  );
}
