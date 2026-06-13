import { useEffect, useMemo, useState } from "react";
import {
  useActionData,
  useFetcher,
  useLoaderData,
  useNavigate,
  useNavigation,
  useSearchParams,
  useSubmit,
} from "react-router";
import {
  Badge,
  Banner,
  BlockStack,
  Box,
  Button,
  Checkbox,
  Collapsible,
  Icon,
  InlineStack,
  Modal,
  Page,
  Select,
  Text,
  TextField,
} from "@shopify/polaris";
import {
  CalendarIcon,
  ClockIcon,
  EditIcon,
  MaximizeIcon,
  MinimizeIcon,
  PauseCircleIcon,
  SearchIcon,
  SettingsIcon,
  TransferInternalIcon,
  XSmallIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { upsertBxgy } from "../shopify-discount.server";
import { invalidateShopCache } from "./app.proxy.smart.jsx";

const CONDITION_TYPES = {
  BUY_PRODUCT: "buy_product",
  SPEND_COLLECTION: "spend_collection",
  QUANTITY_COLLECTION: "quantity_collection",
};

const CONDITION_OPTIONS = [
  {
    id: CONDITION_TYPES.BUY_PRODUCT,
    title: "Buy product X",
    description: "Reward visitors for buying a specific product",
  },
  {
    id: CONDITION_TYPES.SPEND_COLLECTION,
    title: "Spend X in collection Y",
    description:
      "Reward visitors for spending a specific amount buying products from a certain collection",
  },
  {
    id: CONDITION_TYPES.QUANTITY_COLLECTION,
    title: "Buy any product from collection Y",
    description:
      "Reward visitors for buying a specific number of products from a certain collection",
  },
];

const CONTENT_DEFAULTS = {
  beforeTitle: "Free Gift",
  afterTitle: "Free Gift",
  beforeText: "Buy something and get something",
  afterText: "Yay! you got the reward",
};

const parseJsonArray = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw !== "string") return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    if (parsed && typeof parsed === "object") {
      return [
        ...(Array.isArray(parsed.products) ? parsed.products : []),
        ...(Array.isArray(parsed.collections) ? parsed.collections : []),
      ].map(String).filter(Boolean);
    }
  } catch {
    return raw.split(",").map((item) => item.trim()).filter(Boolean);
  }

  return [];
};

const parseAppliesTo = (raw) => {
  if (!raw) return { products: [], collections: [] };
  if (typeof raw !== "string") return { products: [], collections: [] };

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return { products: parsed.map(String).filter(Boolean), collections: [] };
    return {
      products: Array.isArray(parsed?.products) ? parsed.products.map(String).filter(Boolean) : [],
      collections: Array.isArray(parsed?.collections) ? parsed.collections.map(String).filter(Boolean) : [],
    };
  } catch {
    return { products: raw.split(",").map((item) => item.trim()).filter(Boolean), collections: [] };
  }
};

const parseContent = (beforeMessage, afterMessage) => {
  const parsed = { ...CONTENT_DEFAULTS };
  try {
    const before = JSON.parse(beforeMessage || "{}");
    if (before?.title) parsed.beforeTitle = String(before.title);
    if (before?.text) parsed.beforeText = String(before.text);
  } catch {
    if (beforeMessage) parsed.beforeText = beforeMessage;
  }

  try {
    const after = JSON.parse(afterMessage || "{}");
    if (after?.title) parsed.afterTitle = String(after.title);
    if (after?.text) parsed.afterText = String(after.text);
  } catch {
    if (afterMessage) parsed.afterText = afterMessage;
  }

  return parsed;
};

const inferConditionType = (record) => {
  if (Object.values(CONDITION_TYPES).includes(record?.templateKey)) {
    return record.templateKey;
  }
  if (record?.scope === "specific_collections") return CONDITION_TYPES.QUANTITY_COLLECTION;
  return CONDITION_TYPES.BUY_PRODUCT;
};

const combineDateTime = (date, time) => {
  if (!date) return null;
  return new Date(`${date}T${time || "00:00"}`).toISOString();
};

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  let record = null;

  if (id) {
    record = await prisma.bxgyRule.findFirst({
      where: { id: parseInt(id, 10), shop: session.shop },
    });
  }

  return { record };
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const body = await request.json();
  const {
    id,
    campaignName,
    status,
    conditionType,
    buyProductIds,
    buyCollectionIds,
    minQuantity,
    minSpend,
    rewardProductIds,
    maxUsesEnabled,
    maxGifts,
    beforeTitle,
    afterTitle,
    beforeText,
    afterText,
    startsAt,
    endsAt,
  } = body;

  const normalizedCondition = Object.values(CONDITION_TYPES).includes(conditionType)
    ? conditionType
    : CONDITION_TYPES.BUY_PRODUCT;
  const isActive = status === "active";
  const selectedBuyProducts = parseJsonArray(buyProductIds);
  const selectedBuyCollections = parseJsonArray(buyCollectionIds);
  const selectedRewards = parseJsonArray(rewardProductIds);
  const scope =
    normalizedCondition === CONDITION_TYPES.BUY_PRODUCT
      ? "specific_products"
      : "specific_collections";

  const appliesToPayload = JSON.stringify({
    products: scope === "specific_products" ? selectedBuyProducts : [],
    collections: scope === "specific_collections" ? selectedBuyCollections : [],
  });

  const xValue =
    normalizedCondition === CONDITION_TYPES.SPEND_COLLECTION
      ? String(minSpend || "")
      : String(minQuantity || "1");
  const beforePayload = JSON.stringify({
    title: beforeTitle || CONTENT_DEFAULTS.beforeTitle,
    text: beforeText || CONTENT_DEFAULTS.beforeText,
  });
  const afterPayload = JSON.stringify({
    title: afterTitle || CONTENT_DEFAULTS.afterTitle,
    text: afterText || CONTENT_DEFAULTS.afterText,
  });

  const dbData = {
    shop,
    campaignName: campaignName || "Buy X Get Y Free",
    enabled: isActive,
    xQty: xValue || "1",
    yQty: "1",
    scope,
    appliesTo: appliesToPayload,
    giftType: "specific",
    giftSku: selectedRewards.length ? JSON.stringify(selectedRewards) : null,
    maxGifts: maxUsesEnabled ? String(maxGifts || "1") : null,
    allowStacking: false,
    appliesStore: false,
    appliesProductIds: scope === "specific_products" ? JSON.stringify(selectedBuyProducts) : null,
    appliesCollectionIds: scope === "specific_collections" ? JSON.stringify(selectedBuyCollections) : null,
    beforeOfferUnlockMessage: beforePayload,
    afterOfferUnlockMessage: afterPayload,
    startsAt: startsAt ? new Date(startsAt) : null,
    endsAt: endsAt ? new Date(endsAt) : null,
    priority: 0,
    customerTarget: "all",
    customerTags: null,
    templateKey: normalizedCondition,
  };

  try {
    const hasBuySelection =
      scope === "specific_products"
        ? selectedBuyProducts.length > 0
        : selectedBuyCollections.length > 0;
    const hasRewardSelection = selectedRewards.length > 0;

    if (isActive && !hasBuySelection) {
      return { error: "Select what customers must buy before activating this campaign." };
    }
    if (isActive && !hasRewardSelection) {
      return { error: "Select at least one free product before activating this campaign." };
    }

    let existingShopifyId = null;
    if (id) {
      const existing = await prisma.bxgyRule.findFirst({
        where: { id: parseInt(id, 10), shop },
        select: { buyxgetyId: true },
      });
      existingShopifyId = existing?.buyxgetyId || null;
    }

    if (isActive && hasBuySelection && hasRewardSelection) {
      const shopifyId = await upsertBxgy(admin, {
        existingId: existingShopifyId,
        title: campaignName || "Buy X Get Y Free",
        startsAt: startsAt || null,
        endsAt: endsAt || null,
        enabled: true,
        minReqType:
          normalizedCondition === CONDITION_TYPES.SPEND_COLLECTION ? "spend" : "quantity",
        minQty: minQuantity || "1",
        minSpend: minSpend || null,
        rewardQty: "1",
        rewardType: "free_product",
        rewardDiscount: null,
        scope,
        appliesTo: appliesToPayload,
        rewardAppliesTo: JSON.stringify({ products: selectedRewards, collections: [] }),
      });
      if (shopifyId) dbData.buyxgetyId = shopifyId;
    } else if (existingShopifyId) {
      dbData.buyxgetyId = existingShopifyId;
    }

    let record;
    if (id) {
      const existing = await prisma.bxgyRule.findFirst({
        where: { id: parseInt(id, 10), shop },
      });
      if (!existing) return { error: "Campaign not found" };
      record = await prisma.bxgyRule.update({
        where: { id: parseInt(id, 10) },
        data: dbData,
      });
    } else {
      record = await prisma.bxgyRule.create({ data: dbData });
    }

    invalidateShopCache(shop);
    return { success: true, id: record.id };
  } catch (err) {
    return { error: err.message };
  }
};

function ResourcePickerModal({
  open,
  onClose,
  title,
  items,
  multi = true,
  selected = [],
  onApply,
  emptyText = "No items found.",
  kindLabel = "items",
}) {
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState([]);

  useEffect(() => {
    if (open) {
      setDraft(Array.isArray(selected) ? [...selected] : selected ? [selected] : []);
      setSearch("");
    }
  }, [open, selected]);

  const filtered = search
    ? items.filter((item) => item.title?.toLowerCase().includes(search.toLowerCase()))
    : items;

  const toggle = (id) => {
    setDraft((prev) =>
      multi
        ? prev.includes(id)
          ? prev.filter((item) => item !== id)
          : [...prev, id]
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
        onAction: () => {
          onApply(multi ? draft : draft[0] || "");
          onClose();
        },
        disabled: draft.length === 0,
      }}
      secondaryActions={[{ content: "Cancel", onAction: onClose }]}
    >
      <Modal.Section>
        <TextField
          label="Search"
          labelHidden
          placeholder={`Search ${kindLabel}`}
          value={search}
          onChange={setSearch}
          prefix={<Icon source={SearchIcon} />}
          autoComplete="off"
          clearButton
          onClearButtonClick={() => setSearch("")}
        />
      </Modal.Section>
      <Modal.Section>
        <div className="bxgy-pickerList">
          {filtered.length === 0 ? (
            <div className="bxgy-pickerEmpty">
              <Text tone="subdued" as="p">
                {emptyText}
              </Text>
            </div>
          ) : (
            filtered.map((item) => {
              const checked = draft.includes(item.id);
              return (
                <div
                  role="button"
                  tabIndex={0}
                  key={item.id}
                  className={`bxgy-pickerItem ${checked ? "bxgy-pickerItemSelected" : ""}`}
                  onClick={() => toggle(item.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      toggle(item.id);
                    }
                  }}
                >
                  <Checkbox
                    label=""
                    labelHidden
                    checked={checked}
                    onChange={() => toggle(item.id)}
                  />
                  {item.image ? (
                    <img src={item.image} alt={item.title} className="bxgy-pickerImage" />
                  ) : (
                    <span className="bxgy-pickerImage bxgy-pickerImageEmpty" />
                  )}
                  <span className="bxgy-pickerText">
                    <Text variant="bodySm" fontWeight="semibold" as="span">
                      {item.title}
                    </Text>
                    {item.subtitle && (
                      <Text variant="bodySm" tone="subdued" as="span">
                        {item.subtitle}
                      </Text>
                    )}
                  </span>
                  {checked && <span className="bxgy-pickerSelected">Selected</span>}
                </div>
              );
            })
          )}
        </div>
      </Modal.Section>
    </Modal>
  );
}

function SelectedItemsDisplay({ ids, allItems, onRemove }) {
  if (!ids?.length) return null;

  return (
    <div className="bxgy-selectedItems">
      {ids.map((id) => {
        const found = allItems.find((item) => item.id === id);
        const label = found?.title || id.split("/").pop() || id;
        return (
          <span className="bxgy-selectedItem" key={id}>
            {found?.image ? (
              <img src={found.image} alt="" className="bxgy-selectedThumb" />
            ) : null}
            <span>{label}</span>
            <button type="button" onClick={() => onRemove(id)} aria-label={`Remove ${label}`}>
              <Icon source={XSmallIcon} />
            </button>
          </span>
        );
      })}
    </div>
  );
}

function SectionCard({ icon, title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="bxgy-card">
      <div className="bxgy-cardHeader">
        <InlineStack gap="200" blockAlign="center">
          <Icon source={icon} />
          <Text variant="headingMd" as="h2" fontWeight="semibold">
            {title}
          </Text>
        </InlineStack>
        <Button
          size="slim"
          icon={open ? MinimizeIcon : MaximizeIcon}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Collapse" : "Expand"}
        </Button>
      </div>
      <Collapsible open={open} id={`bxgy-${title}`}>
        <div className="bxgy-cardBody">{children}</div>
        <div className="bxgy-cardFooter">
          <Button variant="plain" icon={MinimizeIcon} onClick={() => setOpen(false)}>
            Collapse
          </Button>
        </div>
      </Collapsible>
    </section>
  );
}

function QuantityStepper({ value, onChange }) {
  const numeric = Math.max(1, parseInt(value || "1", 10) || 1);
  return (
    <div className="bxgy-stepper">
      <Button size="slim" onClick={() => onChange(String(Math.max(1, numeric - 1)))}>
        -
      </Button>
      <span>{numeric}</span>
      <Button size="slim" onClick={() => onChange(String(numeric + 1))}>
        +
      </Button>
    </div>
  );
}

function ContentModal({ open, onClose, content, onChange }) {
  const patch = (key, value) => onChange({ ...content, [key]: value });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit English Texts"
      primaryAction={{ content: "Done", onAction: onClose }}
    >
      <Modal.Section>
        <div className="bxgy-modalFields">
          <TextField
            label="Title before the getting the reward."
            value={content.beforeTitle}
            onChange={(value) => patch("beforeTitle", value)}
            autoComplete="off"
          />
          <TextField
            label="Title after the getting the reward"
            value={content.afterTitle}
            onChange={(value) => patch("afterTitle", value)}
            autoComplete="off"
          />
          <TextField
            label="Text before the getting the reward"
            value={content.beforeText}
            onChange={(value) => patch("beforeText", value)}
            autoComplete="off"
          />
          <TextField
            label="Text after the getting the reward"
            value={content.afterText}
            onChange={(value) => patch("afterText", value)}
            autoComplete="off"
          />
        </div>
      </Modal.Section>
    </Modal>
  );
}

export default function RuleBxgy() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const host = searchParams.get("host");
  const template = searchParams.get("template");
  const withHost = (path) => (host ? `${path}?host=${encodeURIComponent(host)}` : path);

  const loaderData = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const submit = useSubmit();
  const r = loaderData?.record;
  const recordId = r?.id || null;
  const isSaving = navigation.state === "submitting";

  const productFetcher = useFetcher();
  useEffect(() => {
    if (productFetcher.state === "idle" && !productFetcher.data) {
      productFetcher.load("/api/products");
    }
  }, [productFetcher]);

  const allProducts = productFetcher.data?.products || [];
  const allCollections = productFetcher.data?.collections || [];
  const productPickerItems = allProducts.map((product) => ({
    id: product.id,
    title: product.title,
    subtitle: product.price ? `$${product.price}` : undefined,
    image: product.image,
  }));
  const collectionPickerItems = allCollections.map((collection) => ({
    id: collection.id,
    title: collection.title,
    subtitle: collection.handle ? `/${collection.handle}` : undefined,
  }));

  const applies = useMemo(() => parseAppliesTo(r?.appliesTo), [r?.appliesTo]);
  const storedContent = useMemo(
    () => parseContent(r?.beforeOfferUnlockMessage, r?.afterOfferUnlockMessage),
    [r?.beforeOfferUnlockMessage, r?.afterOfferUnlockMessage]
  );
  const initialCondition = r ? inferConditionType(r) : null;
  const defaultCampaignName = template === "free" ? "Buy X Get Y Free" : "Buy X Get Y";

  const [status, setStatus] = useState(r?.enabled ? "active" : "draft");
  const [campaignName, setCampaignName] = useState(r?.campaignName ?? defaultCampaignName);
  const [conditionType, setConditionType] = useState(initialCondition);
  const [buyProductIds, setBuyProductIds] = useState(applies.products);
  const [buyCollectionIds, setBuyCollectionIds] = useState(applies.collections);
  const [minQuantity, setMinQuantity] = useState(
    initialCondition === CONDITION_TYPES.SPEND_COLLECTION ? "1" : r?.xQty ?? "1"
  );
  const [minSpend, setMinSpend] = useState(
    initialCondition === CONDITION_TYPES.SPEND_COLLECTION ? r?.xQty ?? "" : ""
  );
  const [rewardProductIds, setRewardProductIds] = useState(parseJsonArray(r?.giftSku));
  const [maxUsesEnabled, setMaxUsesEnabled] = useState(Boolean(r?.maxGifts));
  const [maxGifts, setMaxGifts] = useState(r?.maxGifts ?? "1");
  const [content, setContent] = useState(storedContent);
  const [contentModalOpen, setContentModalOpen] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(
    r?.startsAt ? new Date(r.startsAt).toISOString().split("T")[0] : today
  );
  const [startTime, setStartTime] = useState(
    r?.startsAt ? new Date(r.startsAt).toTimeString().slice(0, 5) : "00:00"
  );
  const [hasEndDate, setHasEndDate] = useState(Boolean(r?.endsAt));
  const [endDate, setEndDate] = useState(
    r?.endsAt ? new Date(r.endsAt).toISOString().split("T")[0] : ""
  );
  const [endTime, setEndTime] = useState(
    r?.endsAt ? new Date(r.endsAt).toTimeString().slice(0, 5) : "23:59"
  );

  const [picker, setPicker] = useState(null);
  const pickerConfig =
    picker === "buy-products"
      ? {
          open: true,
          title: "Select the product visitor must buy",
          items: productPickerItems,
          selected: buyProductIds,
          onApply: setBuyProductIds,
          kindLabel: "products",
          emptyText: "No products available.",
        }
      : picker === "buy-collections"
        ? {
            open: true,
            title: "Select the collection from which visitor must buy",
            items: collectionPickerItems,
            selected: buyCollectionIds,
            onApply: setBuyCollectionIds,
            kindLabel: "collections",
            emptyText: "No collections available.",
          }
        : picker === "rewards"
          ? {
              open: true,
              title: "Select products they get for free",
              items: productPickerItems,
              selected: rewardProductIds,
              onApply: setRewardProductIds,
              kindLabel: "products",
              emptyText: "No products available.",
            }
          : { open: false };

  useEffect(() => {
    if (actionData?.success && navigation.state === "idle" && !recordId && actionData.id) {
      const idParam = `id=${encodeURIComponent(actionData.id)}`;
      const hostParam = host ? `&host=${encodeURIComponent(host)}` : "";
      navigate(`/app/rule-bxgy?${idParam}${hostParam}`, { replace: true });
    }
  }, [actionData, host, navigate, navigation.state, recordId]);

  const handleConditionChange = (nextCondition) => {
    setConditionType(nextCondition);
    setBuyProductIds([]);
    setBuyCollectionIds([]);
  };

  const handleSave = () => {
    submit(
      {
        id: recordId,
        campaignName,
        status,
        conditionType,
        buyProductIds: JSON.stringify(buyProductIds),
        buyCollectionIds: JSON.stringify(buyCollectionIds),
        minQuantity,
        minSpend,
        rewardProductIds: JSON.stringify(rewardProductIds),
        maxUsesEnabled,
        maxGifts,
        beforeTitle: content.beforeTitle,
        afterTitle: content.afterTitle,
        beforeText: content.beforeText,
        afterText: content.afterText,
        startsAt: combineDateTime(startDate, startTime),
        endsAt: hasEndDate ? combineDateTime(endDate, endTime) : null,
      },
      { method: "post", encType: "application/json" }
    );
  };

  const condition = CONDITION_OPTIONS.find((option) => option.id === conditionType);
  const isPaused = status !== "active";

  return (
    <Page
      backAction={{
        content: "Campaigns",
        onAction: () => navigate(withHost("/app/campaigns")),
      }}
      title={campaignName || "Buy X Get Y Free"}
      titleMetadata={isPaused ? <Badge tone="attention">Paused</Badge> : <Badge tone="success">Active</Badge>}
      primaryAction={{ content: "Save", loading: isSaving, onAction: handleSave }}
      secondaryActions={[
        {
          content: status === "active" ? "Pause" : "Activate",
          onAction: () => setStatus((value) => (value === "active" ? "paused" : "active")),
        },
      ]}
    >
      <style>{`
        .bxgy-layout{display:grid;grid-template-columns:minmax(0,1fr) 390px;gap:20px;align-items:start}
        .bxgy-card{background:#fff;border:1px solid #dfe3e8;border-radius:12px;overflow:hidden;box-shadow:0 1px 1px rgba(0,0,0,.05)}
        .bxgy-cardHeader{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px;border-bottom:1px solid #ebeef1}
        .bxgy-cardBody{padding:18px}
        .bxgy-cardFooter{display:flex;justify-content:flex-end;padding:8px 18px 16px}
        .bxgy-requirements{border:2px solid #e1e3e5;border-radius:10px;overflow:hidden;background:#fff}
        .bxgy-conditionRow{width:100%;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:center;padding:22px 20px;background:#fff;border:0;border-top:1px solid #e1e3e5;text-align:left;cursor:pointer}
        .bxgy-conditionRow:first-child{border-top:0}
        .bxgy-conditionRow:hover{background:#fafafa}
        .bxgy-conditionSelected{display:block;padding:22px 20px;border:2px solid #e1e3e5;border-radius:8px}
        .bxgy-conditionTop{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding-bottom:14px;border-bottom:1px solid #ebeef1}
        .bxgy-conditionControls{display:grid;gap:16px;padding-top:18px}
        .bxgy-blackButton,.Polaris-Button.bxgy-blackButton{background:#303030;color:#fff;border-color:#303030;box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 1px 1px rgba(0,0,0,.18)}
        .Polaris-Button.bxgy-blackButton *{color:#fff}
        .bxgy-selectedItems{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
        .bxgy-selectedItem{display:inline-flex;align-items:center;gap:8px;max-width:100%;padding:6px 8px;background:#f6f6f7;border:1px solid #e1e3e5;border-radius:8px;font-size:13px;font-weight:600}
        .bxgy-selectedItem button{display:flex;align-items:center;background:transparent;border:0;padding:0;cursor:pointer;color:#6d7175}
        .bxgy-selectedThumb{width:24px;height:24px;border-radius:4px;object-fit:cover;border:1px solid #e1e3e5}
        .bxgy-stepper{width:max-content;display:grid;grid-template-columns:38px 56px 38px;gap:6px;align-items:center;padding:5px;background:#f1f1f1;border-radius:10px}
        .bxgy-stepper span{text-align:center;font-weight:700}
        .bxgy-segmented{display:inline-flex;background:#f1f1f1;border-radius:10px;padding:4px}
        .bxgy-segmented button{border:0;background:transparent;border-radius:8px;padding:8px 12px;cursor:pointer;color:#6d7175;font-weight:600}
        .bxgy-segmented button[aria-pressed="true"]{background:#fff;color:#202223;box-shadow:0 1px 4px rgba(0,0,0,.12)}
        .bxgy-softPanel{padding:16px;background:#f7f7f7;border-radius:8px}
        .bxgy-grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        .bxgy-sidebarCard{background:#fff;border:1px solid #dfe3e8;border-radius:12px;overflow:hidden;box-shadow:0 1px 1px rgba(0,0,0,.05)}
        .bxgy-sidebarBody{padding:18px}
        .bxgy-paused{display:flex;align-items:center;gap:10px;padding:13px 16px;background:#fff6d6;border-bottom:2px solid #ffe66d;color:#5f4b00;font-weight:700}
        .bxgy-contentList{border:2px solid #e1e3e5;border-radius:8px;overflow:hidden}
        .bxgy-contentRow{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px;border-top:1px solid #e1e3e5}
        .bxgy-contentRow:first-child{border-top:0}
        .bxgy-pickerList{max-height:360px;overflow:auto;display:grid;gap:4px}
        .bxgy-pickerItem{width:100%;display:flex;align-items:center;gap:12px;padding:10px 8px;border:0;border-bottom:1px solid #f1f3f5;background:transparent;text-align:left;cursor:pointer;border-radius:6px}
        .bxgy-pickerItem:hover,.bxgy-pickerItemSelected{background:#f0f7ff}
        .bxgy-pickerImage{width:44px;height:44px;object-fit:cover;border-radius:6px;border:1px solid #e1e3e5;flex-shrink:0;background:#f1f3f5}
        .bxgy-pickerImageEmpty::before{content:"";display:block;width:18px;height:18px;margin:12px auto;border:2px solid #8c9196;border-radius:4px}
        .bxgy-pickerText{display:grid;gap:2px;min-width:0;flex:1}
        .bxgy-pickerSelected{font-size:12px;font-weight:700;color:#2563eb}
        .bxgy-pickerEmpty{padding:24px 0;text-align:center}
        .bxgy-modalFields{display:grid;gap:18px}
        @media(max-width:980px){.bxgy-layout{grid-template-columns:1fr}.bxgy-sidebar{order:-1}}
        @media(max-width:640px){.bxgy-grid2{grid-template-columns:1fr}.bxgy-conditionRow,.bxgy-conditionTop{grid-template-columns:1fr;display:grid}.bxgy-layout{gap:14px}}
      `}</style>

      {actionData?.error && (
        <Box paddingBlockEnd="400">
          <Banner tone="critical" title="Save failed">
            {actionData.error}
          </Banner>
        </Box>
      )}

      <Box paddingBlockEnd="800">
        <div className="bxgy-layout">
          <BlockStack gap="400">
            <SectionCard icon={TransferInternalIcon} title="Rewards">
              <BlockStack gap="500">
                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">
                    Requirements for getting free gifts
                  </Text>

                  {!condition ? (
                    <div className="bxgy-requirements">
                      {CONDITION_OPTIONS.map((option) => (
                        <div
                          role="button"
                          tabIndex={0}
                          className="bxgy-conditionRow"
                          key={option.id}
                          onClick={() => handleConditionChange(option.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              handleConditionChange(option.id);
                            }
                          }}
                        >
                          <span>
                            <Text variant="bodyMd" fontWeight="semibold" as="span">
                              {option.title}
                            </Text>
                            <Text variant="bodyMd" tone="subdued" as="p">
                              {option.description}
                            </Text>
                          </span>
                          <Button size="slim">Select</Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bxgy-conditionSelected">
                      <div className="bxgy-conditionTop">
                        <span>
                          <Text variant="bodyMd" fontWeight="semibold" as="span">
                            {condition.title}
                          </Text>
                          <Text variant="bodyMd" tone="subdued" as="p">
                            {condition.description}
                          </Text>
                        </span>
                        <Button
                          variant="plain"
                          onClick={() => setConditionType(null)}
                        >
                          Change condition
                        </Button>
                      </div>

                      <div className="bxgy-conditionControls">
                        {conditionType === CONDITION_TYPES.BUY_PRODUCT ? (
                          <BlockStack gap="200">
                            <Text variant="bodyMd" fontWeight="semibold" as="p">
                              Select the product visitor must buy
                            </Text>
                            <Button
                              className="bxgy-blackButton"
                              onClick={() => setPicker("buy-products")}
                              loading={productFetcher.state === "loading"}
                            >
                              Select a product
                            </Button>
                            <SelectedItemsDisplay
                              ids={buyProductIds}
                              allItems={productPickerItems}
                              onRemove={(id) =>
                                setBuyProductIds((prev) => prev.filter((item) => item !== id))
                              }
                            />
                          </BlockStack>
                        ) : (
                          <BlockStack gap="200">
                            <Text variant="bodyMd" fontWeight="semibold" as="p">
                              Select the collection from which visitor must buy
                            </Text>
                            <Button
                              className="bxgy-blackButton"
                              onClick={() => setPicker("buy-collections")}
                              loading={productFetcher.state === "loading"}
                            >
                              Select a collection
                            </Button>
                            <SelectedItemsDisplay
                              ids={buyCollectionIds}
                              allItems={collectionPickerItems}
                              onRemove={(id) =>
                                setBuyCollectionIds((prev) => prev.filter((item) => item !== id))
                              }
                            />
                          </BlockStack>
                        )}

                        {conditionType === CONDITION_TYPES.SPEND_COLLECTION ? (
                          <TextField
                            label="Minimum spend"
                            type="number"
                            value={minSpend}
                            onChange={setMinSpend}
                            autoComplete="off"
                          />
                        ) : (
                          <BlockStack gap="200">
                            <Text variant="bodyMd" fontWeight="semibold" as="p">
                              Minimum quantity
                            </Text>
                            <QuantityStepper value={minQuantity} onChange={setMinQuantity} />
                          </BlockStack>
                        )}
                      </div>
                    </div>
                  )}
                </BlockStack>

                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">
                    Select products they get for free
                  </Text>
                  <Button
                    className="bxgy-blackButton"
                    onClick={() => setPicker("rewards")}
                    loading={productFetcher.state === "loading"}
                  >
                    + Add a product
                  </Button>
                  <SelectedItemsDisplay
                    ids={rewardProductIds}
                    allItems={productPickerItems}
                    onRemove={(id) =>
                      setRewardProductIds((prev) => prev.filter((item) => item !== id))
                    }
                  />
                </BlockStack>

                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">
                    Set a maximum number of uses per order
                  </Text>
                  <div className="bxgy-segmented" role="group" aria-label="Set max uses">
                    <button
                      type="button"
                      aria-pressed={maxUsesEnabled}
                      onClick={() => setMaxUsesEnabled(true)}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      aria-pressed={!maxUsesEnabled}
                      onClick={() => setMaxUsesEnabled(false)}
                    >
                      No
                    </button>
                  </div>

                  {maxUsesEnabled && (
                    <div className="bxgy-softPanel">
                      <TextField
                        label="Max uses per order"
                        type="number"
                        min={1}
                        value={maxGifts}
                        onChange={setMaxGifts}
                        autoComplete="off"
                      />
                    </div>
                  )}
                </BlockStack>
              </BlockStack>
            </SectionCard>

            <SectionCard icon={EditIcon} title="Content">
              <BlockStack gap="300">
                <Text variant="bodyMd" fontWeight="semibold" as="p">
                  Edit content
                </Text>
                <div className="bxgy-contentList">
                  <div className="bxgy-contentRow">
                    <Text variant="bodyMd" fontWeight="semibold" as="p">
                      English
                    </Text>
                    <Button icon={EditIcon} onClick={() => setContentModalOpen(true)}>
                      Edit
                    </Button>
                  </div>
                  <div className="bxgy-contentRow" style={{ justifyContent: "center" }}>
                    <Button variant="plain">+ Add language</Button>
                  </div>
                </div>
              </BlockStack>
            </SectionCard>

            <SectionCard icon={SettingsIcon} title="Settings">
              <BlockStack gap="300">
                <BlockStack gap="050">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">
                    Active dates
                  </Text>
                  <Text variant="bodyMd" tone="subdued" as="p">
                    Based on your browser&apos;s timezone: Asia/Calcutta
                  </Text>
                </BlockStack>

                <div className="bxgy-conditionSelected">
                  <div className="bxgy-grid2">
                    <TextField
                      label="Start date"
                      type="date"
                      value={startDate}
                      onChange={setStartDate}
                      prefix={<Icon source={CalendarIcon} />}
                      autoComplete="off"
                    />
                    <TextField
                      label="Start time"
                      type="time"
                      value={startTime}
                      onChange={setStartTime}
                      prefix={<Icon source={ClockIcon} />}
                      autoComplete="off"
                    />
                  </div>
                  <Box paddingBlockStart="200">
                    <Checkbox
                      label="Set end date"
                      checked={hasEndDate}
                      onChange={setHasEndDate}
                    />
                  </Box>
                  {hasEndDate && (
                    <Box paddingBlockStart="200">
                      <div className="bxgy-grid2">
                        <TextField
                          label="End date"
                          type="date"
                          value={endDate}
                          onChange={setEndDate}
                          prefix={<Icon source={CalendarIcon} />}
                          autoComplete="off"
                        />
                        <TextField
                          label="End time"
                          type="time"
                          value={endTime}
                          onChange={setEndTime}
                          prefix={<Icon source={ClockIcon} />}
                          autoComplete="off"
                        />
                      </div>
                    </Box>
                  )}
                </div>
              </BlockStack>
            </SectionCard>
          </BlockStack>

          <div className="bxgy-sidebar">
            <BlockStack gap="300">
              <div className="bxgy-sidebarCard">
                {isPaused && (
                  <div className="bxgy-paused">
                    <Icon source={PauseCircleIcon} />
                    <span>This campaign is paused</span>
                  </div>
                )}
                <div className="bxgy-sidebarBody">
                  <BlockStack gap="300">
                    <Select
                      label="Status"
                      options={[
                        { label: "Draft", value: "draft" },
                        { label: "Active", value: "active" },
                        { label: "Paused", value: "paused" },
                      ]}
                      value={status}
                      onChange={setStatus}
                    />
                    <TextField
                      label="Campaign name"
                      value={campaignName}
                      onChange={setCampaignName}
                      autoComplete="off"
                    />
                  </BlockStack>
                </div>
              </div>
            </BlockStack>
          </div>
        </div>
      </Box>

      <ResourcePickerModal
        open={pickerConfig.open}
        onClose={() => setPicker(null)}
        title={pickerConfig.title}
        items={pickerConfig.items || []}
        multi
        selected={pickerConfig.selected || []}
        onApply={pickerConfig.onApply || (() => {})}
        emptyText={pickerConfig.emptyText}
        kindLabel={pickerConfig.kindLabel}
      />

      <ContentModal
        open={contentModalOpen}
        onClose={() => setContentModalOpen(false)}
        content={content}
        onChange={setContent}
      />
    </Page>
  );
}
