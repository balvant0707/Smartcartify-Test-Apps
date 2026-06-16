import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Spinner,
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
  ReplaceIcon,
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

const PICKER_PAGE_LIMITS = {
  products: 10,
  collections: 250,
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

const normalizeContent = (content = {}) => ({
  beforeTitle: content.beforeTitle || CONTENT_DEFAULTS.beforeTitle,
  afterTitle: content.afterTitle || CONTENT_DEFAULTS.afterTitle,
  beforeText: content.beforeText || CONTENT_DEFAULTS.beforeText,
  afterText: content.afterText || CONTENT_DEFAULTS.afterText,
});

const parseTranslations = (raw, englishContent) => {
  const translations = { en: normalizeContent(englishContent) };
  if (!raw) return translations;

  try {
    const parsed = JSON.parse(raw);
    Object.entries(parsed || {}).forEach(([code, value]) => {
      if (!code || !value || typeof value !== "object") return;
      translations[code] = normalizeContent(value);
    });
  } catch {
    return translations;
  }

  translations.en = normalizeContent({ ...translations.en, ...englishContent });
  return translations;
};

const inferConditionType = (record) => {
  if (Object.values(CONDITION_TYPES).includes(record?.conditionType)) {
    return record.conditionType;
  }
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

const positiveNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const mergeById = (current = [], next = []) => {
  const seen = new Set();
  return [...current, ...next].filter((item) => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

const sameStringArray = (left = [], right = []) =>
  left.length === right.length && left.every((item, index) => item === right[index]);

const normalizeSelectedIdsFromItems = (ids = [], items = []) =>
  ids.map((id) => {
    const match = items.find((item) => item.id === id || item.originalId === id);
    return match?.id || id;
  });

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
    translations,
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
  const normalizedTranslations = (() => {
    try {
      const parsed = JSON.parse(translations || "{}");
      return JSON.stringify({
        ...parsed,
        en: normalizeContent({
          beforeTitle,
          afterTitle,
          beforeText,
          afterText,
        }),
      });
    } catch {
      return JSON.stringify({
        en: normalizeContent({
          beforeTitle,
          afterTitle,
          beforeText,
          afterText,
        }),
      });
    }
  })();

  const dbData = {
    shop,
    campaignName: campaignName || "Buy X Get Y Discount",
    status: status || (isActive ? "active" : "draft"),
    enabled: isActive,
    xQty: xValue || "1",
    yQty: "1",
    scope,
    appliesTo: appliesToPayload,
    giftType: "specific",
    giftSku: selectedRewards[0] ? String(selectedRewards[0]) : null,
    maxGifts: maxUsesEnabled ? String(maxGifts || "1") : null,
    conditionType: normalizedCondition,
    buyProductIds: JSON.stringify(selectedBuyProducts),
    buyCollectionIds: JSON.stringify(selectedBuyCollections),
    rewardProductIds: JSON.stringify(selectedRewards),
    minQuantity:
      normalizedCondition === CONDITION_TYPES.SPEND_COLLECTION
        ? null
        : String(minQuantity || "1"),
    minSpend:
      normalizedCondition === CONDITION_TYPES.SPEND_COLLECTION
        ? String(minSpend || "")
        : null,
    maxUsesPerOrder: maxUsesEnabled ? String(maxGifts || "1") : null,
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
    translations: normalizedTranslations,
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
    if (
      isActive &&
      normalizedCondition === CONDITION_TYPES.SPEND_COLLECTION &&
      !positiveNumber(minSpend)
    ) {
      return { error: "Minimum spend must be greater than 0 before activating this campaign." };
    }

    let existingRule = null;
    let existingShopifyId = null;
    if (id) {
      existingRule = await prisma.bxgyRule.findFirst({
        where: { id: parseInt(id, 10), shop },
        select: {
          buyxgetyId: true,
          scope: true,
          appliesTo: true,
          appliesProductIds: true,
          appliesCollectionIds: true,
          giftSku: true,
          rewardProductIds: true,
        },
      });
      existingShopifyId = existingRule?.buyxgetyId || null;
    }

    if (isActive && hasBuySelection && hasRewardSelection) {
      const shopifyId = await upsertBxgy(admin, {
        existingId: existingShopifyId,
        title: campaignName || "Buy X Get Y Discount",
        startsAt: startsAt || null,
        endsAt: endsAt || null,
        enabled: true,
        minReqType:
          normalizedCondition === CONDITION_TYPES.SPEND_COLLECTION ? "spend" : "quantity",
        minQty: minQuantity || "1",
        minSpend: String(positiveNumber(minSpend) || ""),
        rewardQty: "1",
        rewardType: "free_product",
        rewardDiscount: null,
        scope,
        appliesTo: appliesToPayload,
        rewardAppliesTo: JSON.stringify({ products: selectedRewards, collections: [] }),
        previousScope: existingRule?.scope || null,
        previousAppliesTo:
          existingRule?.appliesTo ||
          JSON.stringify({
            products: parseJsonArray(existingRule?.appliesProductIds),
            collections: parseJsonArray(existingRule?.appliesCollectionIds),
          }),
        previousRewardAppliesTo: JSON.stringify({
          products: parseJsonArray(existingRule?.rewardProductIds || existingRule?.giftSku),
          collections: [],
        }),
        usesPerOrderLimit: maxUsesEnabled ? maxGifts || "1" : null,
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
  loading = false,
  loadingMore = false,
  hasMore = false,
  multi = true,
  selected = [],
  onApply,
  onLoadMore,
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

  const handleScroll = (event) => {
    if (loading || loadingMore || !hasMore || search || !onLoadMore) return;
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 80) {
      onLoadMore();
    }
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
        <div className="bxgy-pickerList" onScroll={handleScroll}>
          {loading ? (
            <div className="bxgy-pickerLoading">
              <Spinner size="small" />
              <Text tone="subdued" as="p">
                Loading {kindLabel}...
              </Text>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bxgy-pickerEmpty">
              <Text tone="subdued" as="p">
                {emptyText}
              </Text>
            </div>
          ) : (
            <>
              {filtered.map((item) => {
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
                    <span
                      className="bxgy-pickerCheckbox"
                      role="presentation"
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      <Checkbox
                        label=""
                        labelHidden
                        checked={checked}
                        onChange={() => toggle(item.id)}
                      />
                    </span>
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
              })}
              {loadingMore && (
                <div className="bxgy-pickerLoadingMore">
                  <Spinner size="small" />
                  <Text tone="subdued" as="p">
                    Loading more {kindLabel}...
                  </Text>
                </div>
              )}
            </>
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
        const label = found?.title || "Selected item";
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

function SectionCard({ id, icon, title, children, open, onOpenChange }) {
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
          onClick={() => onOpenChange(!open)}
        >
          {open ? "Collapse" : "Expand"}
        </Button>
      </div>
      <Collapsible open={open} id={`bxgy-${id}`}>
        <div className="bxgy-cardBody">{children}</div>
        <div className="bxgy-cardFooter">
          <Button variant="plain" icon={MinimizeIcon} onClick={() => onOpenChange(false)}>
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

export default function RuleBxgy() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const host = searchParams.get("host");
  const withHost = (path) => (host ? `${path}?host=${encodeURIComponent(host)}` : path);

  const loaderData = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const submit = useSubmit();
  const r = loaderData?.record;
  const recordId = r?.id || null;
  const isSaving = navigation.state === "submitting";

  const productFetcher = useFetcher();
  const selectedProductsFetcher = useFetcher();
  const selectedCollectionsFetcher = useFetcher();
  const requestedProductIdsRef = useRef(new Set());
  const requestedCollectionIdsRef = useRef(new Set());
  const [pickerProducts, setPickerProducts] = useState([]);
  const [pickerCollections, setPickerCollections] = useState([]);
  const [pickerPageInfo, setPickerPageInfo] = useState({
    products: { hasNextPage: false, endCursor: null },
    collections: { hasNextPage: false, endCursor: null },
  });
  const [pickerResourcesLoaded, setPickerResourcesLoaded] = useState({
    products: false,
    collections: false,
  });
  const [loadingResource, setLoadingResource] = useState(null);

  useEffect(() => {
    const data = productFetcher.data;
    if (!data) return;

    if (data.resource === "products" || data.resource === "both") {
      setPickerProducts((current) => mergeById(current, data.products || []));
      setPickerPageInfo((current) => ({
        ...current,
        products: data.pageInfo?.products || current.products,
      }));
      setPickerResourcesLoaded((current) => ({ ...current, products: true }));
    }

    if (data.resource === "collections" || data.resource === "both") {
      setPickerCollections((current) => mergeById(current, data.collections || []));
      setPickerPageInfo((current) => ({
        ...current,
        collections: data.pageInfo?.collections || current.collections,
      }));
      setPickerResourcesLoaded((current) => ({ ...current, collections: true }));
    }

    if (productFetcher.state === "idle") setLoadingResource(null);
  }, [productFetcher.data, productFetcher.state]);

  useEffect(() => {
    const data = selectedProductsFetcher.data;
    if (data?.products?.length) {
      setPickerProducts((current) => mergeById(current, data.products));
    }
  }, [selectedProductsFetcher.data]);

  useEffect(() => {
    const data = selectedCollectionsFetcher.data;
    if (data?.collections?.length) {
      setPickerCollections((current) => mergeById(current, data.collections));
    }
  }, [selectedCollectionsFetcher.data]);

  const loadPickerResource = useCallback((resource, after = null) => {
    if (productFetcher.state !== "idle") return;
    const limit = PICKER_PAGE_LIMITS[resource] || 10;
    const afterParam =
      after && resource === "products"
        ? `&productAfter=${encodeURIComponent(after)}`
        : after && resource === "collections"
          ? `&collectionAfter=${encodeURIComponent(after)}`
          : "";
    setLoadingResource(resource);
    productFetcher.load(`/api/products?resource=${resource}&limit=${limit}${afterParam}`);
  }, [productFetcher]);

  const productPickerItems = useMemo(
    () => pickerProducts.map((product) => ({
      id: product.id,
      originalId: product.originalId,
      title: product.title,
      subtitle: product.price ? `$${product.price}` : undefined,
      image: product.image,
    })),
    [pickerProducts]
  );
  const collectionPickerItems = useMemo(
    () => pickerCollections.map((collection) => ({
      id: collection.id,
      originalId: collection.originalId,
      title: collection.title,
      subtitle: collection.handle ? `/${collection.handle}` : undefined,
    })),
    [pickerCollections]
  );

  const applies = useMemo(() => parseAppliesTo(r?.appliesTo), [r?.appliesTo]);
  const storedContent = useMemo(
    () => parseContent(r?.beforeOfferUnlockMessage, r?.afterOfferUnlockMessage),
    [r?.beforeOfferUnlockMessage, r?.afterOfferUnlockMessage]
  );
  const storedTranslations = useMemo(
    () => parseTranslations(r?.translations, storedContent),
    [r?.translations, storedContent]
  );
  const initialCondition = r ? inferConditionType(r) : null;
  const defaultCampaignName = "Buy X Get Y Discount";
  const storedBuyProductIds = r?.buyProductIds
    ? parseJsonArray(r.buyProductIds)
    : applies.products;
  const storedBuyCollectionIds = r?.buyCollectionIds
    ? parseJsonArray(r.buyCollectionIds)
    : applies.collections;
  const storedRewardProductIds = r?.rewardProductIds
    ? parseJsonArray(r.rewardProductIds)
    : parseJsonArray(r?.giftSku);
  const storedMaxUsesPerOrder = r?.maxUsesPerOrder ?? r?.maxGifts;

  const [status, setStatus] = useState(r?.status ?? (r?.enabled ? "active" : "draft"));
  const [campaignName, setCampaignName] = useState(r?.campaignName ?? defaultCampaignName);
  const [conditionType, setConditionType] = useState(initialCondition);
  const [buyProductIds, setBuyProductIds] = useState(storedBuyProductIds);
  const [buyCollectionIds, setBuyCollectionIds] = useState(storedBuyCollectionIds);
  const [minQuantity, setMinQuantity] = useState(
    r?.minQuantity ??
    (initialCondition === CONDITION_TYPES.SPEND_COLLECTION ? "1" : r?.xQty ?? "1")
  );
  const [minSpend, setMinSpend] = useState(
    r?.minSpend ??
    (initialCondition === CONDITION_TYPES.SPEND_COLLECTION ? r?.xQty ?? "" : "")
  );
  const [rewardProductIds, setRewardProductIds] = useState(storedRewardProductIds);
  const [maxUsesEnabled, setMaxUsesEnabled] = useState(Boolean(storedMaxUsesPerOrder));
  const [maxGifts, setMaxGifts] = useState(storedMaxUsesPerOrder ?? "1");
  const [translations, setTranslations] = useState(storedTranslations);
  const [openSection, setOpenSection] = useState("rewards");

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
  const selectedProductIds = useMemo(
    () => [...new Set([...buyProductIds, ...rewardProductIds])],
    [buyProductIds, rewardProductIds]
  );

  useEffect(() => {
    if (selectedProductsFetcher.state !== "idle") return;
    const loadedIds = new Set(pickerProducts.map((product) => product.id));
    const missingIds = selectedProductIds.filter(
      (id) => !loadedIds.has(id) && !requestedProductIdsRef.current.has(id)
    );
    if (!missingIds.length) return;
    missingIds.forEach((id) => requestedProductIdsRef.current.add(id));
    selectedProductsFetcher.load(
      `/api/products?resource=products&ids=${encodeURIComponent(missingIds.join(","))}`
    );
  }, [selectedProductIds, pickerProducts, selectedProductsFetcher]);

  useEffect(() => {
    if (selectedCollectionsFetcher.state !== "idle") return;
    const loadedIds = new Set(pickerCollections.map((collection) => collection.id));
    const missingIds = buyCollectionIds.filter(
      (id) => !loadedIds.has(id) && !requestedCollectionIdsRef.current.has(id)
    );
    if (!missingIds.length) return;
    missingIds.forEach((id) => requestedCollectionIdsRef.current.add(id));
    selectedCollectionsFetcher.load(
      `/api/products?resource=collections&ids=${encodeURIComponent(missingIds.join(","))}`
    );
  }, [buyCollectionIds, pickerCollections, selectedCollectionsFetcher]);

  useEffect(() => {
    setBuyProductIds((prev) => {
      const next = normalizeSelectedIdsFromItems(prev, productPickerItems);
      return sameStringArray(prev, next) ? prev : next;
    });
    setRewardProductIds((prev) => {
      const next = normalizeSelectedIdsFromItems(prev, productPickerItems);
      return sameStringArray(prev, next) ? prev : next;
    });
  }, [productPickerItems]);

  useEffect(() => {
    setBuyCollectionIds((prev) => {
      const next = normalizeSelectedIdsFromItems(prev, collectionPickerItems);
      return sameStringArray(prev, next) ? prev : next;
    });
  }, [collectionPickerItems]);

  const pickerResource = picker === "buy-collections" ? "collections" : picker ? "products" : null;
  const pickerItems = pickerResource === "collections" ? collectionPickerItems : productPickerItems;
  const pickerLoading =
    Boolean(pickerResource) &&
    loadingResource === pickerResource &&
    productFetcher.state === "loading" &&
    pickerItems.length === 0;
  const pickerLoadingMore =
    Boolean(pickerResource) &&
    loadingResource === pickerResource &&
    productFetcher.state === "loading" &&
    pickerItems.length > 0;

  useEffect(() => {
    if (!pickerResource || productFetcher.state !== "idle") return;
    if (pickerResource === "products" && !pickerResourcesLoaded.products) {
      loadPickerResource("products");
    }
    if (pickerResource === "collections" && !pickerResourcesLoaded.collections) {
      loadPickerResource("collections");
    }
  }, [
    pickerResource,
    productFetcher.state,
    pickerResourcesLoaded.products,
    pickerResourcesLoaded.collections,
    loadPickerResource,
  ]);

  const loadMorePickerItems = () => {
    if (!pickerResource) return;
    const nextPage = pickerPageInfo[pickerResource];
    if (nextPage?.hasNextPage && nextPage?.endCursor) {
      loadPickerResource(pickerResource, nextPage.endCursor);
    }
  };

  const openCollectionPicker = () => {
    setPicker("buy-collections");
    if (productFetcher.state === "idle" && !pickerResourcesLoaded.collections) {
      loadPickerResource("collections");
    }
  };

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
        hasMore: pickerPageInfo.products.hasNextPage,
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
          hasMore: pickerPageInfo.collections.hasNextPage,
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
            hasMore: pickerPageInfo.products.hasNextPage,
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

  const setSectionOpen = (section, open) => {
    setOpenSection(open ? section : null);
  };

  const handleContentChange = (key, value) => {
    setTranslations((prev) => ({
      ...prev,
      en: normalizeContent({
        ...prev.en,
        [key]: value,
      }),
    }));
  };

  const handleSave = () => {
    const englishContent = normalizeContent(translations.en);
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
        beforeTitle: englishContent.beforeTitle,
        afterTitle: englishContent.afterTitle,
        beforeText: englishContent.beforeText,
        afterText: englishContent.afterText,
        translations: JSON.stringify(translations),
        startsAt: combineDateTime(startDate, startTime),
        endsAt: hasEndDate ? combineDateTime(endDate, endTime) : null,
      },
      { method: "post", encType: "application/json" }
    );
  };

  const condition = CONDITION_OPTIONS.find((option) => option.id === conditionType);
  const isPaused = status !== "active";
  const englishContent = normalizeContent(translations.en);

  return (
    <Page
      backAction={{
        content: "Campaigns",
        onAction: () => navigate(withHost("/app/campaigns")),
      }}
      title={campaignName || "Buy X Get Y Discount"}
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
        .bxgy-layout{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:20px;align-items:start}
        .bxgy-card{background:#fff;border:1px solid #dfe3e8;border-radius:12px !important;overflow:hidden;box-shadow:0 1px 1px rgba(0,0,0,.05)}
        .bxgy-cardHeader{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px;border-bottom:1px solid #ebeef1}
        .bxgy-cardBody{padding:18px}
        .bxgy-cardFooter{display:flex;justify-content:flex-end;padding:8px 18px 16px}
        .bxgy-requirements{border:2px solid #e1e3e5;border-radius:12px;overflow:hidden;background:#fff}
        .bxgy-conditionRow{width:100%;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:center;padding:22px 20px;background:#fff;border:0;border-top:1px solid #e1e3e5;text-align:left;cursor:pointer}
        .bxgy-conditionRow:first-child{border-top:0}
        .bxgy-conditionRow:hover{background:#fafafa}
        .bxgy-conditionSelected{display:block;padding:22px 20px;border:2px solid #e1e3e5;border-radius:12px}
        .bxgy-conditionTop{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding-bottom:14px;border-bottom:1px solid #ebeef1}
        .bxgy-conditionControls{display:grid;gap:16px;padding-top:18px}
        .bxgy-compactAction{width:max-content;max-width:100%}
        .bxgy-selectedItems{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
        .bxgy-selectedItem{display:inline-flex;align-items:center;gap:8px;max-width:100%;padding:6px 8px;background:#f6f6f7;border:1px solid #e1e3e5;border-radius:12px;font-size:13px;font-weight:600}
        .bxgy-selectedItem button{display:flex;align-items:center;background:transparent;border:0;padding:0;cursor:pointer;color:#6d7175}
        .bxgy-selectedThumb{width:24px;height:24px;border-radius:4px;object-fit:cover;border:1px solid #e1e3e5}
        .bxgy-stepper{width:max-content;display:grid;grid-template-columns:38px 56px 38px;gap:6px;align-items:center;padding:5px;background:#f1f1f1;border-radius:12px}
        .bxgy-stepper span{text-align:center;font-weight:700}
        .bxgy-segmented{display:inline-flex;background:#f1f1f1;border-radius:12px;padding:4px}
        .bxgy-segmented button{border:0;background:transparent;border-radius:8px;padding:8px 12px;cursor:pointer;color:#6d7175;font-weight:600}
        .bxgy-segmented button[aria-pressed="true"]{background:#fff;color:#202223;box-shadow:0 1px 4px rgba(0,0,0,.12)}
        .bxgy-softPanel{padding:16px;background:#f7f7f7;border-radius:12px}
        .bxgy-grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        .bxgy-sidebarCard{background:#fff;border:1px solid #dfe3e8;border-radius:12px;overflow:hidden;box-shadow:0 1px 1px rgba(0,0,0,.05)}
        .bxgy-sidebarBody{padding:18px}
        .bxgy-paused{display:flex;align-items:center;gap:10px;padding:13px 16px;background:#fff6d6;border-bottom:2px solid #ffe66d;color:#5f4b00;font-weight:700}
        .bxgy-contentList{border:2px solid #e1e3e5;border-radius:12px;overflow:hidden}
        .bxgy-contentRow{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px;border-top:1px solid #e1e3e5}
        .bxgy-contentRow:first-child{border-top:0}
        .bxgy-pickerList{max-height:360px;overflow:auto;display:grid;gap:4px}
        .bxgy-pickerItem{width:100%;display:flex;align-items:center;gap:12px;padding:10px 8px;border:0;border-bottom:1px solid #f1f3f5;background:transparent;text-align:left;cursor:pointer;border-radius:12px}
        .bxgy-pickerItem:hover,.bxgy-pickerItemSelected{background:#f0f7ff}
        .bxgy-pickerImage{width:44px;height:44px;object-fit:cover;border-radius:12px;border:1px solid #e1e3e5;flex-shrink:0;background:#f1f3f5}
        .bxgy-pickerImageEmpty::before{content:"";display:block;width:18px;height:18px;margin:12px auto;border:2px solid #8c9196;border-radius:4px}
        .bxgy-pickerText{display:grid;gap:2px;min-width:0;flex:1}
        .bxgy-pickerCheckbox{display:flex;align-items:center;flex-shrink:0}
        .bxgy-pickerSelected{font-size:12px;font-weight:700;color:#2563eb}
        .bxgy-pickerLoading{min-height:180px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px}
        .bxgy-pickerLoadingMore{display:flex;align-items:center;justify-content:center;gap:8px;padding:14px 8px}
        .bxgy-pickerEmpty{padding:24px 0;text-align:center}
        .bxgy-modalFields{display:grid;gap:18px}
        @media(max-width:980px){.bxgy-layout{grid-template-columns:1fr}.bxgy-sidebar{order:-1}}
        @media(max-width:640px){.bxgy-grid2{grid-template-columns:1fr}.bxgy-conditionRow,.bxgy-conditionTop{grid-template-columns:1fr;display:grid}.bxgy-layout{gap:14px}}
        .bxgy-paused .Polaris-Icon{margin:unset !important;}
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
            <SectionCard
              id="rewards"
              icon={TransferInternalIcon}
              title="Rewards"
              open={openSection === "rewards"}
              onOpenChange={(open) => setSectionOpen("rewards", open)}
            >
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
                          <Button variant="primary" size="slim">Select</Button>
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
                          icon={ReplaceIcon}
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
                            <div className="bxgy-compactAction">
                              <Button
                                variant="primary"
                                size="slim"
                                onClick={() => setPicker("buy-products")}
                              >
                                Select product
                              </Button>
                            </div>
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
                            <div className="bxgy-compactAction">
                              <Button
                                variant="primary"
                                size="slim"
                                onClick={openCollectionPicker}
                              >
                                Select collection
                              </Button>
                            </div>
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
                            min={0.01}
                            step={0.01}
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
                  <div className="bxgy-compactAction">
                    <Button
                      variant="primary"
                      size="slim"
                      onClick={() => setPicker("rewards")}
                    >
                      Add product
                    </Button>
                  </div>
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

            <SectionCard
              id="content"
              icon={EditIcon}
              title="Content"
              open={openSection === "content"}
              onOpenChange={(open) => setSectionOpen("content", open)}
            >
              <BlockStack gap="300">
                <div className="bxgy-modalFields">
                  <TextField
                    label="Title before the getting the reward."
                    value={englishContent.beforeTitle}
                    onChange={(value) => handleContentChange("beforeTitle", value)}
                    autoComplete="off"
                  />
                  <TextField
                    label="Title after the getting the reward"
                    value={englishContent.afterTitle}
                    onChange={(value) => handleContentChange("afterTitle", value)}
                    autoComplete="off"
                  />
                  <TextField
                    label="Text before the getting the reward"
                    value={englishContent.beforeText}
                    onChange={(value) => handleContentChange("beforeText", value)}
                    autoComplete="off"
                  />
                  <TextField
                    label="Text after the getting the reward"
                    value={englishContent.afterText}
                    onChange={(value) => handleContentChange("afterText", value)}
                    autoComplete="off"
                  />
                </div>
              </BlockStack>
            </SectionCard>

            <SectionCard
              id="settings"
              icon={SettingsIcon}
              title="Settings"
              open={openSection === "settings"}
              onOpenChange={(open) => setSectionOpen("settings", open)}
            >
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
        loading={pickerLoading}
        loadingMore={pickerLoadingMore}
        hasMore={Boolean(pickerConfig.hasMore)}
        multi
        selected={pickerConfig.selected || []}
        onApply={pickerConfig.onApply || (() => { })}
        onLoadMore={loadMorePickerItems}
        emptyText={pickerConfig.emptyText}
        kindLabel={pickerConfig.kindLabel}
      />
    </Page>
  );
}
