(() => {
  /* =========================================================
   GLOBAL GUARD (avoid duplicate load / redeclare errors)
  ========================================================= */
  if (window.__SMARTCARTIFY_CARTDRAWER_V27__) return;
  window.__SMARTCARTIFY_CARTDRAWER_V27__ = true;

  const root = document.getElementById("smart-embed-root");
  if (!root) return;

  // ✅ Turn ON to see table-wise logs in console
  const DEBUG_TABLES = true;

  // ✅ App proxy path (prefer embed data, fallback to /apps/smart)
  let proxyPath = root.dataset.proxyPath || "/apps/smart";
  proxyPath = String(proxyPath || "").trim();
  if (proxyPath && !/^https?:\/\//i.test(proxyPath) && !proxyPath.startsWith("/")) {
    proxyPath = `/${proxyPath}`;
  }
  if (proxyPath.endsWith("/")) proxyPath = proxyPath.slice(0, -1);

  /* =========================================================
   ✅ DISABLE THEME DEFAULT <cart-drawer> (Dawn / OS2 drawers)
  ========================================================= */
  const disableThemeCartDrawer = () => {
    try {
      const styleId = "smartcartify-disable-theme-cart-drawer";
      if (!document.getElementById(styleId)) {
        const st = document.createElement("style");
        st.id = styleId;
        st.textContent = `
          cart-drawer,
          cart-drawer-items,
          cart-notification,
          cart-notification-drawer{
            display:none !important;
            visibility:hidden !important;
            opacity:0 !important;
            pointer-events:none !important;
          }
            body.sc-cartify-lock-theme-cart .drawer,
            body.sc-cartify-lock-theme-cart .cart-drawer__dialog,
            body.sc-cartify-lock-theme-cart cart-drawer-component dialog{
              display:none !important;
              visibility:hidden !important;
              opacity:0 !important;
              pointer-events:none !important;
            }
        `;
        document.head.appendChild(st);
      }

      document
        .querySelectorAll(
          "cart-drawer, cart-drawer-items, cart-notification, cart-notification-drawer"
        )
        .forEach((n) => n.remove());

      document.body.classList.add("sc-cartify-lock-theme-cart");

      if (!window.__SC_DISABLE_DRAWER_OBSERVER__) {
        window.__SC_DISABLE_DRAWER_OBSERVER__ = true;
        new MutationObserver(() => {
          document
            .querySelectorAll(
              "cart-drawer, cart-drawer-items, cart-notification, cart-notification-drawer"
            )
            .forEach((n) => n.remove());
        }).observe(document.documentElement, { childList: true, subtree: true });
      }
    } catch { }
  };
  disableThemeCartDrawer();

  /* =========================================================
   ICON MAP (DB value → emoji)
  ========================================================= */
  const ICONS = {
    sparkles: "✨",
    truck: "🚚",
    tag: "🏷️",
    gift: "🎁",
    star: "⭐",
    fire: "🔥",
    check: "✔",
    cart: "🛒",
    shipping: "🚚",
    discount: "🏷️",
    free: "🎁",
    bxgy: "🔥",
  };

  const STEP_SLOTS = ["step1", "step2", "step3", "step4"];

  let PROXY = null;
  let CART = null;

  let UPSELL_INDEX = 0;
  let UPSELL_TIMER = null;
  let UPSELL_DYNAMIC = null;
  let UPSELL_LOADING = false;

  let LAST_DONE = 0;
  let LAST_BXGY_DONE = false;

  // ✅ announcement bar cache
  let ANNOUNCE_MESSAGES = [];

  // Announcement sources
  let CODE_DISCOUNT_RULES = []; // discountrule type=code (progressTextBefore/progressTextAfter)
  let BXGY_RULES = []; // discountrule type=bxgy OR has beforeOfferUnlockMessage/afterOfferUnlockMessage
  let BUYXGETY_RULES = []; // buyxgety rules list OR discountrule type=buyxgety if present

  let discountPopupShownForCode = null;

  // ✅ NEW: Priming guard to stop popups on first load / refresh
  let __SC_PRIMED_POPUPS__ = false;

  // ✅ NEW: Auto-add guard
  let __SC_AUTO_ADDING__ = false;

  /* =========================================================
   ✅ STORAGE helpers (sessionStorage)
  ========================================================= */
  const scStore = {
    get(k) {
      try {
        return sessionStorage.getItem(k);
      } catch {
        return null;
      }
    },
    set(k, v) {
      try {
        sessionStorage.setItem(k, String(v));
      } catch { }
    },
    del(k) {
      try {
        sessionStorage.removeItem(k);
      } catch { }
    },
  };

  const keyShown = (kind, guardKey) => `__SC_SHOWN_POPUP__:${kind}:${guardKey}`;
  const keyAutoAdded = (kind, guardKey) => `__SC_AUTO_ADDED__:${kind}:${guardKey}`;

  /* =========================================================
   HELPERS
  ========================================================= */
  const safe = (v) => (v == null ? "" : String(v));
  const trimToNull = (v) => {
    const s = String(v ?? "").trim();
    return s ? s : null;
  };

  const clamp01 = (n) => Math.max(0, Math.min(1, n));

  const to01 = (v) => {
    if (v === true) return 1;
    if (v === false) return 0;
    const n = Number(v);
    if (Number.isFinite(n)) return n ? 1 : 0;
    const s = String(v ?? "").trim().toLowerCase();
    if (["true", "yes", "on", "enabled", "active", "1"].includes(s)) return 1;
    return 0;
  };

  const isValidCssColor = (val) => {
    const v = trimToNull(val);
    if (!v) return false;
    if (String(v).trim().toLowerCase() === "transparent") return false;
    return (
      /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v) ||
      /^(rgb|rgba|hsl|hsla)\(/i.test(v) ||
      /^var\(--.+\)$/i.test(v) ||
      /^[a-z]+$/i.test(v)
    );
  };

  const isValidCssBackground = (val) => {
    const v = trimToNull(val);
    if (!v) return false;
    if (isValidCssColor(v)) return true;
    if (
      /^(linear-gradient|radial-gradient|conic-gradient|repeating-linear-gradient|repeating-radial-gradient)\(/i.test(
        v
      )
    )
      return true;
    if (/^var\(--.+\)$/i.test(v)) return true;
    if (/^url\(/i.test(v)) return true;
    return false;
  };

  const isValidCssLen = (val) => {
    const v = trimToNull(val);
    if (!v) return false;
    return (
      /^-?\d+(\.\d+)?(px|rem|em|vw|vh|%)$/i.test(v) || /^\d+(\.\d+)?$/.test(v)
    );
  };

  const normalizeLen = (val, fallbackPx) => {
    const v = trimToNull(val);
    if (!v) return fallbackPx;
    if (/^\d+(\.\d+)?$/.test(v)) return `${v}px`;
    if (isValidCssLen(v)) return v;
    return fallbackPx;
  };

  const buildCssUrl = (value) => {
    const raw = trimToNull(value);
    if (!raw) return null;
    const escaped = raw.replace(/"/g, '\\"');
    return `url("${escaped}")`;
  };

  const pick = (obj, keys, fallback = null) => {
    for (const k of keys) {
      const v = obj?.[k];
      const t = trimToNull(v);
      if (t != null) return t;
    }
    return fallback;
  };

  const pickColor = (obj, keys, fallback = null) => {
    const v = pick(obj, keys, null);
    if (v && isValidCssColor(v)) return v;
    return fallback;
  };

  const pickBackground = (obj, keys, fallback = null) => {
    const v = pick(obj, keys, null);
    if (v && isValidCssBackground(v)) return v;
    return fallback;
  };

  const pickNum = (obj, keys, fallback = null) => {
    for (const k of keys) {
      const raw = obj?.[k];
      const n = Number(raw);
      if (Number.isFinite(n)) return n;
      const t = trimToNull(raw);
      if (t && /^-?\d+(\.\d+)?$/.test(t)) return Number(t);
    }
    return fallback;
  };

  const pickTextAny = (obj, keys, fallback = "") => {
    for (const k of keys) {
      const v = obj?.[k];
      const t = trimToNull(v);
      if (t != null) return t;
    }
    return fallback;
  };

  const getProgressBefore = (rule) =>
    pickTextAny(rule, [
      "progressTextBefore",
      "progress_text_before",
      "progressBefore",
      "progress_before",
      "beforeProgressText",
      "before_progress_text",
      "beforeText",
      "before_text",
    ]);

  const getProgressAfter = (rule) =>
    pickTextAny(rule, [
      "progressTextAfter",
      "progress_text_after",
      "progressAfter",
      "progress_after",
      "afterProgressText",
      "after_progress_text",
      "afterText",
      "after_text",
    ]);

  const getProgressBelow = (rule) =>
    pickTextAny(rule, [
      "progressTextBelow",
      "progress_text_below",
      "progressBelow",
      "progress_below",
      "belowProgressText",
      "below_progress_text",
      "milestoneLabel",
      "milestone_label",
      "label",
      "stepLabel",
      "step_label",
    ]);

  const formatMoney = (cents, currency = "INR") => {
    const amount = (Number(cents) || 0) / 100;
    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `₹${Math.round(amount)}`;
    }
  };

  const isRuleEnabled = (rule) => {
    if (!rule) return false;

    const candidates = [
      rule.enabled,
      rule.enable,
      rule.isEnabled,
      rule.is_enabled,
      rule.active,
      rule.isActive,
      rule.status,
      rule.publish,
      rule.published,
      rule.isPublished,
      rule.enableStatus,
      rule.enable_status,
      rule.is_enable,
      rule.isEnable,
    ];

    const hasAny = candidates.some(
      (x) => x !== undefined && x !== null && String(x).trim() !== ""
    );
    if (!hasAny) return true;

    if (typeof rule.status === "string") {
      const st = rule.status.trim().toLowerCase();
      if (["active", "enabled", "on", "published", "true", "1"].includes(st))
        return true;
      if (["inactive", "disabled", "off", "draft", "false", "0"].includes(st))
        return false;
    }

    for (const c of candidates) {
      if (c === undefined || c === null) continue;
      if (to01(c) === 1) return true;
    }
    return false;
  };

  const pickIconKeyFromRule = (rule) => {
    if (!rule) return null;
    const candidates = [
      rule.icon,
      rule.iconChoice,
      rule.icon_choice,
      rule.iconKey,
      rule.iconName,
      rule.ruleIcon,
      rule.emoji,
      rule.milestoneIcon,
    ].filter(Boolean);

    const hit = candidates.find((x) => ICONS[String(x).toLowerCase()]);
    return hit ? String(hit).toLowerCase() : null;
  };

  const normalizeStepSlotFromAny = (rule) => {
    if (!rule) return null;

    const directCandidates = [
      rule.stepSlot,
      rule.step_slot,
      rule.stepNo,
      rule.step_no,
      rule.stepNumber,
      rule.step_number,
      rule.stepPosition,
      rule.step_position,
      rule.position,
      rule.sortOrder,
      rule.sort_order,
      rule.order,
      rule.cartStepName,
      rule.step,
    ];

    for (const c of directCandidates) {
      if (c == null) continue;
      const s0 = String(c).trim().toLowerCase();
      if (!s0) continue;

      const s = s0.replace(/[_-]/g, "").replace(/\s+/g, "");

      if (STEP_SLOTS.includes(s0)) return s0;
      if (STEP_SLOTS.includes(s)) return s;

      const m1 = s.match(/^step0*([1-4])$/);
      if (m1) return `step${m1[1]}`;

      const n = Number(s);
      if (Number.isFinite(n) && n >= 1 && n <= 4) return `step${n}`;
    }

    return null;
  };

  const getGoalRupees = (type, rule) => {
    if (!rule) return null;
    let raw = null;

    if (type === "shipping")
      raw =
        rule?.minSubtotal ??
        rule?.min_subtotal ??
        rule?.minAmount ??
        rule?.min_amount;
    if (type === "discount")
      raw =
        rule?.minPurchase ??
        rule?.min_purchase ??
        rule?.minAmount ??
        rule?.min_amount;
    if (type === "free")
      raw =
        rule?.minPurchase ??
        rule?.min_purchase ??
        rule?.minAmount ??
        rule?.min_amount;
    if (type === "bxgy")
      raw =
        rule?.minPurchase ??
        rule?.min_purchase ??
        rule?.minAmount ??
        rule?.min_amount;

    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };

  const goalToCents = (goalRupees) => {
    if (goalRupees == null) return null;
    return Math.max(0, Math.round(Number(goalRupees) * 100));
  };

  const replaceTokens = (text, map) => {
    let out = safe(text);
    if (!out) return "";
    Object.keys(map || {}).forEach((k) => {
      const val = map[k] == null ? "" : String(map[k]);
      const re = new RegExp(`{{\\s*${k}\\s*}}`, "gi");
      out = out.replace(re, val);
    });
    return out;
  };

  const replaceProgressText = ({
    text,
    type,
    rule,
    subtotalRupees,
    useRemainingForGoal,
  }) => {
    const goalRupees = getGoalRupees(type, rule);
    const remainingRupees =
      goalRupees == null
        ? ""
        : String(Math.max(0, Math.round(goalRupees - (subtotalRupees || 0))));

    const goalToken = useRemainingForGoal
      ? remainingRupees
      : safe(goalRupees ?? "");

    const discountValRaw =
      type === "discount"
        ? safe(rule?.value ?? rule?.discountValue ?? rule?.discount_value ?? "")
        : "";

    const makeWithOff = (v) => {
      const s = String(v ?? "").trim();
      if (!s) return "";
      if (/off\b/i.test(s)) return s;
      return `${s} OFF`;
    };

    const discountValWithOff =
      type === "discount" ? makeWithOff(discountValRaw) : "";
    const discountCode = safe(
      rule?.discountCode ?? rule?.discount_code ?? rule?.code ?? ""
    );

    const xQty = safe(rule?.xQty ?? rule?.x_qty ?? rule?.x ?? "");
    const yQty = safe(rule?.yQty ?? rule?.y_qty ?? rule?.y ?? "");

    return replaceTokens(text, {
      goal: goalToken,
      discount: discountValRaw,
      discount_value: discountValRaw,
      discount_value_with_off: discountValWithOff,
      discount_code: discountCode,
      x: xQty,
      y: yQty,
    });
  };

  const getProxyArray = (proxy, keys) => {
    for (const k of keys) {
      const v = proxy?.[k];
      if (Array.isArray(v)) return v;
    }
    return [];
  };

  const parseIdArray = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(String);
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  };

  const getUpsellSettings = () => {
    const raw = PROXY?.upsellSettings || {};
    return {
      enabled: to01(raw.enabled) === 1,
      showAsSlider: to01(raw.showAsSlider) === 1,
      autoplay: to01(raw.autoplay) === 1,
      recommendationMode: String(raw.recommendationMode || "auto").toLowerCase(),
      sectionTitle: pickTextAny(raw, ["sectionTitle", "title"], "You may also like"),
      buttonText: pickTextAny(raw, ["buttonText"], "add to cart"),
      buttonColor: pickColor(raw, ["buttonColor", "button"], "#111111"),
      backgroundColor: pickBackground(raw, ["backgroundColor", "background"], "#f8fafc"),
      textColor: pickColor(raw, ["textColor", "text"], "#111827"),
      borderColor: pickColor(raw, ["borderColor", "border"], "#e2e8f0"),
      arrowColor: pickColor(raw, ["arrowColor", "arrow"], "#111827"),
      selectedProductIds: parseIdArray(raw.selectedProductIds),
      selectedCollectionIds: parseIdArray(raw.selectedCollectionIds),
    };
  };

  const getVariantOptionsFromItem = (item) =>
    Array.isArray(item?.variantOptions)
      ? item.variantOptions
      : Array.isArray(item?.options_with_values)
        ? item.options_with_values
        : Array.isArray(item?.optionsWithValues)
          ? item.optionsWithValues
          : [];

  const getPreferredVariantFromItem = (item) => {
    const options = getVariantOptionsFromItem(item);
    if (!options.length) return null;
    const sizeOpt = options.find(
      (opt) => String(opt?.name || "").trim().toLowerCase() === "size"
    );
    const pickOpt = sizeOpt || options[0];
    if (!pickOpt?.name && !pickOpt?.value) return null;
    return {
      name: String(pickOpt?.name || "Option"),
      value: String(pickOpt?.value || ""),
    };
  };

  const normalizeImage = (value) =>
    typeof value === "string" ? value : value?.url || value?.src || "";

  const getUpsellImageFromItem = (item) =>
    normalizeImage(item?.image) ||
    normalizeImage(item?.featured_image) ||
    normalizeImage(item?.product_image) ||
    normalizeImage(item?.image_url) ||
    "";

  const getUpsellImageFromProduct = (product) =>
    normalizeImage(product?.featured_image) ||
    normalizeImage(product?.images?.[0]) ||
    "";

  const normalizeVariantId = (value) => {
    if (value == null) return null;
    const raw = String(value).trim();
    if (!raw) return null;
    if (/^\d+$/.test(raw)) return raw;
    const m = raw.match(/\/(\d+)\s*$/);
    return m ? m[1] : null;
  };

  const normalizeProxyVariants = (variants) =>
    (Array.isArray(variants) ? variants : []).map((v) => {
      const opts = Array.isArray(v?.variantOptions) ? v.variantOptions : [];
      const out = { ...v };
      opts.forEach((opt, idx) => {
        const key = `option${idx + 1}`;
        if (out[key] == null && opt?.value != null) out[key] = opt.value;
      });
      return out;
    });

  const pickOptionIndexFromVariantOptions = (options) => {
    const opts = Array.isArray(options) ? options : [];
    if (!opts.length) return 0;
    const sizeIndex = opts.findIndex(
      (opt) => String(opt?.name || "").trim().toLowerCase() === "size"
    );
    return sizeIndex >= 0 ? sizeIndex : 0;
  };

  const getOptionValuesFromVariants = (variants, optionIndex) => {
    const values = (Array.isArray(variants) ? variants : [])
      .map((v) => {
        const rawOpts = Array.isArray(v?.variantOptions) ? v.variantOptions : [];
        const opt = rawOpts[optionIndex];
        const val = opt?.value ?? v?.[`option${optionIndex + 1}`];
        return val != null ? String(val) : null;
      })
      .filter((v) => v && String(v).trim() !== "");
    return Array.from(new Set(values));
  };

  const priceToCents = (value) => {
    if (value == null) return null;
    const raw = String(value).trim();
    if (!raw) return null;
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    if (raw.includes(".")) return Math.round(n * 100);
    if (Number.isInteger(n) && n >= 1000) return n;
    return Math.round(n * 100);
  };

  const buildUpsellItemsFromProxyProducts = (products, currency) => {
    const list = Array.isArray(products) ? products : [];
    return list.map((p) => {
      const variantsRaw = Array.isArray(p?.variants) ? p.variants : [];
      const variants = normalizeProxyVariants(variantsRaw);
      const firstVariant = variants[0] || null;
      const optionSeed = Array.isArray(firstVariant?.variantOptions)
        ? firstVariant.variantOptions
        : [];
      const optionIndex = pickOptionIndexFromVariantOptions(optionSeed);
      const optionName = String(
        optionSeed?.[optionIndex]?.name || optionSeed?.[0]?.name || "Option"
      );
      const optionValue = optionSeed?.[optionIndex]?.value ?? "";
      const optionValues = getOptionValuesFromVariants(variants, optionIndex);
      const hasVariants = variants.length > 1;
      const size = hasVariants
        ? {
            name: optionName || "Option",
            value: optionValue ? String(optionValue) : "",
          }
        : null;
      const priceRaw = p?.variantPrice ?? firstVariant?.price ?? null;
      const priceCents = priceToCents(priceRaw);
      return {
        title: safe(p?.title || "Product"),
        price:
          priceCents != null
            ? formatMoney(priceCents, currency)
            : formatMoney(2500, currency),
        image: normalizeImage(p?.image) || "",
        size,
        variantId: p?.variantId || firstVariant?.id || null,
        hasVariants,
        variants,
        optionIndex,
        optionName,
        optionValues,
      };
    });
  };

  const buildUpsellItemsFromProxyCollections = (collections, currency) => {
    const list = Array.isArray(collections) ? collections : [];
    const products = list.flatMap((c) =>
      Array.isArray(c?.products) ? c.products : []
    );
    const seen = new Set();
    const deduped = [];
    products.forEach((p) => {
      const key = String(p?.id || p?.variantId || p?.title || "");
      if (!key || seen.has(key)) return;
      seen.add(key);
      deduped.push(p);
    });
    return buildUpsellItemsFromProxyProducts(deduped, currency);
  };

  const getOrderedSelectedProducts = (settings) => {
    const list = Array.isArray(PROXY?.upsellSelectedProducts)
      ? PROXY.upsellSelectedProducts
      : [];
    if (!list.length) return [];
    const desired = Array.isArray(settings?.selectedProductIds)
      ? settings.selectedProductIds
      : [];
    const desiredIds = desired
      .map((id) => gidToId(id) || (id ? String(id) : null))
      .filter(Boolean);
    if (!desiredIds.length) return list;
    const map = new Map(list.map((p) => [String(p?.id || ""), p]));
    const ordered = desiredIds
      .map((id) => map.get(String(id)))
      .filter(Boolean);
    return ordered.length ? ordered : list;
  };

  const getOrderedSelectedCollections = (settings) => {
    const list = Array.isArray(PROXY?.upsellSelectedCollections)
      ? PROXY.upsellSelectedCollections
      : [];
    if (!list.length) return [];
    const desired = Array.isArray(settings?.selectedCollectionIds)
      ? settings.selectedCollectionIds
      : [];
    const desiredIds = desired
      .map((id) => gidToId(id) || (id ? String(id) : null))
      .filter(Boolean);
    if (!desiredIds.length) return list;
    const map = new Map(list.map((c) => [String(c?.id || ""), c]));
    const ordered = desiredIds
      .map((id) => map.get(String(id)))
      .filter(Boolean);
    return ordered.length ? ordered : list;
  };

  const buildUpsellItems = (settings) => {
    const items = Array.isArray(CART?.items) ? CART.items : [];
    const currency = CART?.currency || "INR";

    const mapFromCart = (it) => {
      const qty = Math.max(1, Number(it?.quantity || 1));
      const unitCents =
        Number(it?.final_line_price || it?.price || 0) / qty || 0;
      const options = getVariantOptionsFromItem(it);
      const hasVariants =
        !!options.length && !Boolean(it?.product_has_only_default_variant);
      return {
        title: safe(it?.product_title || "Product"),
        price: formatMoney(unitCents, currency),
        image: getUpsellImageFromItem(it),
        size: hasVariants ? getPreferredVariantFromItem(it) : null,
        variantId: it?.variant_id || it?.id || null,
        hasVariants,
      };
      };

    const cartItems = items.map(mapFromCart);

    if (settings.recommendationMode === "auto") {
      if (Array.isArray(UPSELL_DYNAMIC) && UPSELL_DYNAMIC.length) {
        return UPSELL_DYNAMIC.slice(0, 5);
      }
      return cartItems.length ? cartItems : [];
    }

    if (settings.recommendationMode === "product") {
      const selectedProducts = getOrderedSelectedProducts(settings);
      if (selectedProducts.length && settings.selectedProductIds.length) {
        return buildUpsellItemsFromProxyProducts(selectedProducts, currency).slice(
          0,
          5
        );
      }
    }

    if (settings.recommendationMode === "collection") {
      const selectedCollections = getOrderedSelectedCollections(settings);
      if (selectedCollections.length && settings.selectedCollectionIds.length) {
        return buildUpsellItemsFromProxyCollections(
          selectedCollections,
          currency
        ).slice(0, 5);
      }
    }

    return cartItems.length ? cartItems : [];
  };

  const clearUpsellTimer = () => {
    if (UPSELL_TIMER) {
      clearInterval(UPSELL_TIMER);
      UPSELL_TIMER = null;
    }
  };

  const updateUpsellSliderPosition = (wrap) => {
    if (!wrap) return false;
    const track = wrap.querySelector(".sc-upsell-track");
    if (!track) return false;
    const offset = -UPSELL_INDEX * 100;
    requestAnimationFrame(() => {
      track.style.transform = `translateX(${offset}%)`;
    });
    return true;
  };

  const getPreferredVariantFromProductJson = (product, variant) => {
    const options = Array.isArray(product?.options) ? product.options : [];
    if (!options.length) return null;
    const sizeIndex = options.findIndex(
      (opt) => String(opt?.name || "").trim().toLowerCase() === "size"
    );
    const optionIndex = sizeIndex >= 0 ? sizeIndex : 0;
    const key = `option${optionIndex + 1}`;
    const value = variant?.[key];
    const name = String(options[optionIndex]?.name || "Option");
    if (!value && !name) return null;
    return {
      name,
      value: value ? String(value) : "",
    };
  };

  const fetchRelatedProducts = async (productId, currency) => {
    if (!productId) return [];
    try {
      const r = await fetch(
        `/recommendations/products.json?product_id=${encodeURIComponent(
          productId
        )}&limit=8&intent=related`,
        { headers: { Accept: "application/json" }, credentials: "same-origin" }
      );
      if (!r.ok) return [];
      const data = await r.json();
      const products = Array.isArray(data?.products) ? data.products : [];
        return products.map((p) => {
          const variants = Array.isArray(p?.variants) ? p.variants : [];
          const firstVariant = variants[0] || null;
          const priceRaw = firstVariant?.price ?? null;
          const hasVariants =
            variants.length > 1 && !Boolean(p?.has_only_default_variant);
          const size = hasVariants
            ? getPreferredVariantFromProductJson(p, firstVariant)
            : null;
          const options = Array.isArray(p?.options) ? p.options : [];
          const sizeIndex = options.findIndex(
            (opt) => String(opt?.name || "").trim().toLowerCase() === "size"
          );
          const optionIndex = sizeIndex >= 0 ? sizeIndex : 0;
          const optionName = String(options[optionIndex]?.name || size?.name || "Option");
          const optionValues =
            Array.isArray(options[optionIndex]?.values) && options[optionIndex].values.length
              ? options[optionIndex].values
              : Array.from(
                  new Set(
                    variants
                      .map((v) => v?.[`option${optionIndex + 1}`])
                      .filter((v) => v != null && String(v).trim() !== "")
                  )
                );
          return {
            title: safe(p?.title || "Product"),
            price: priceRaw != null ? formatMoney(Number(priceRaw) || 0, currency) : formatMoney(2500, currency),
            image: getUpsellImageFromProduct(p),
            size,
            variantId: firstVariant?.id || null,
            hasVariants,
            variants,
            optionIndex,
            optionName,
            optionValues,
          };
        });
    } catch (err) {
      console.error("[SmartCartify] related products fetch failed", err);
      return [];
    }
  };

  const ensureUpsellDynamic = async (settings) => {
    if (UPSELL_LOADING || Array.isArray(UPSELL_DYNAMIC)) return;
    if (settings.recommendationMode !== "auto") return;
    const items = Array.isArray(CART?.items) ? CART.items : [];
    const first = items.find((it) => it?.product_id);
    if (!first) return;
    UPSELL_LOADING = true;
    try {
      const currency = CART?.currency || "INR";
      const related = await fetchRelatedProducts(first.product_id, currency);
      if (related.length) {
        const unique = [];
        const seen = new Set();
        related.forEach((p) => {
          const key = String(p.variantId || p.title || Math.random());
          if (seen.has(key)) return;
          seen.add(key);
          unique.push(p);
        });
        UPSELL_DYNAMIC = unique.slice(0, 5);
      }
    } finally {
      UPSELL_LOADING = false;
    }
  };

  const renderUpsellSection = () => {
    const wrap = drawer.querySelector(".sc-upsell");
    if (!wrap) return;

    const settings = getUpsellSettings();
    if (!settings.enabled) {
      wrap.hidden = true;
      clearUpsellTimer();
      return;
    }

    void ensureUpsellDynamic(settings);
    const items = buildUpsellItems(settings);
    if (!items.length) {
      wrap.hidden = true;
      clearUpsellTimer();
      return;
    }

    wrap.hidden = false;
    wrap.style.setProperty("--sc-upsell-bg", settings.backgroundColor || "#f8fafc");
    wrap.style.setProperty("--sc-upsell-text", settings.textColor || "#111827");
    wrap.style.setProperty("--sc-upsell-button-bg", settings.buttonColor || "#111111");
    wrap.style.setProperty("--sc-border", settings.borderColor || "#e2e8f0");
    wrap.style.setProperty("--sc-upsell-arrow", settings.arrowColor || "#111827");

    const total = items.length;
    if (UPSELL_INDEX >= total) UPSELL_INDEX = 0;
    const visibleItems = settings.showAsSlider ? items : items.slice(0, 2);
    const upsellItemMap = new Map();

    const renderCard = (item, idx) => {
      const sizeRaw = item?.size;
      const size =
        sizeRaw && typeof sizeRaw === "object"
          ? {
              name: trimToNull(sizeRaw.name) || "Size",
              value: trimToNull(sizeRaw.value) || "",
            }
          : null;
      const sizeLabel = trimToNull(item?.optionName) || (size ? size.name : "");
      const sizeSelect = size ? size.value || size.name : "";
      const showSelect =
        !!item?.hasVariants &&
        Array.isArray(item?.optionValues) &&
        item.optionValues.length > 0;
      const key = `upsell-${UPSELL_INDEX}-${idx}-${safe(item?.variantId || item?.title || "")}`;
      upsellItemMap.set(key, item);
      const selectMarkup = showSelect
        ? `
          <div class="sc-upsell-select-wrap">
            <select class="sc-upsell-select" data-upsell-select="${safe(key)}" data-upsell-opt-index="${item?.optionIndex ?? 0}">
              ${item.optionValues
                .map((v) => {
                  const sv = safe(v);
                  const selected = sv === safe(sizeSelect) ? "selected" : "";
                  return `<option value="${sv}" ${selected}>${sv}</option>`;
                })
                .join("")}
            </select>
            <span class="sc-upsell-select-arrow">▼</span>
          </div>
        `
        : "";
      return `
          <div class="sc-upsell-item">
            <div class="sc-upsell-row">
              <div class="sc-upsell-img">
                ${item.image ? `<img src="${safe(item.image)}" alt="${safe(item.title)}" />` : ""}
              </div>
              <div class="sc-upsell-info">
                <div class="sc-upsell-top">
                  <div class="sc-upsell-name">${safe(item.title)}</div>
                  <div class="sc-upsell-price">${safe(item.price)}</div>
                </div>
                ${sizeLabel ? `<div class="sc-upsell-sub">${safe(sizeLabel)}</div>` : ""}
                <div class="sc-upsell-controls">
                  ${selectMarkup || `<div></div>`}
                  <button class="sc-upsell-btn" type="button" data-upsell-add="${safe(
                    item.variantId || ""
                  )}" data-upsell-key="${safe(key)}">
                    + ${safe(settings.buttonText)}
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
    };

    const arrows =
      settings.showAsSlider && total > 0
        ? `
          <button class="sc-upsell-arrow left" type="button" data-upsell-prev aria-label="Previous">‹</button>
          <button class="sc-upsell-arrow right" type="button" data-upsell-next aria-label="Next">›</button>
        `
        : "";

    const sliderMarkup = settings.showAsSlider
      ? `
        <div class="sc-upsell-viewport">
          <div class="sc-upsell-track" style="transform: translateX(-${UPSELL_INDEX * 100}%);">
            ${visibleItems
              .map((item, i) => `<div class="sc-upsell-slide">${renderCard(item, i)}</div>`)
              .join("")}
          </div>
        </div>
      `
      : visibleItems.map((item, i) => renderCard(item, i)).join("");

    wrap.innerHTML = `
      <div class="sc-upsell-card">
        <div class="sc-upsell-title">${safe(settings.sectionTitle)}</div>
        <div class="sc-upsell-inner">
          ${arrows}
          ${sliderMarkup}
        </div>
      </div>
    `;

    wrap.querySelector("[data-upsell-prev]")?.addEventListener("click", () => {
      if (total <= 1) return;
      UPSELL_INDEX = UPSELL_INDEX - 1 < 0 ? total - 1 : UPSELL_INDEX - 1;
      updateUpsellSliderPosition(wrap);
    });

    wrap.querySelector("[data-upsell-next]")?.addEventListener("click", () => {
      if (total <= 1) return;
      UPSELL_INDEX = UPSELL_INDEX + 1 >= total ? 0 : UPSELL_INDEX + 1;
      updateUpsellSliderPosition(wrap);
    });

    wrap.querySelectorAll("[data-upsell-add]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        let variantId = btn.getAttribute("data-upsell-add");
        const key = btn.getAttribute("data-upsell-key");
        const itemForLog = key ? upsellItemMap.get(key) : null;
        console.log("[SmartCartify] upsell button click", {
          key,
          variantId,
          item: itemForLog || null,
        });
        if (!variantId) {
          const item = itemForLog;
          const variants = Array.isArray(item?.variants) ? item.variants : [];
          const picked = variants[0] || null;
          variantId = picked?.id || item?.variantId || null;
        }
        const legacyId = normalizeVariantId(variantId);
        console.log("[SmartCartify] upsell add resolved", {
          variantId,
          legacyId,
        });
        if (!legacyId) return;
        try {
          setProgressLoading(true);
          btn.disabled = true;
          const body = new URLSearchParams();
          body.set("id", legacyId);
          body.set("quantity", "1");
          const res = await fetch("/cart/add.js", {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            },
            credentials: "same-origin",
            body,
          });
          if (!res.ok) {
            let errText = "";
            try {
              errText = await res.text();
            } catch {}
            throw new Error(`Upsell add failed (${res.status}) ${errText}`.trim());
          }
          await refreshFromNetwork();
        } catch (err) {
          console.error("[SmartCartify] upsell add failed:", err);
        } finally {
          btn.disabled = false;
          setProgressLoading(false);
        }
      });
    });

    wrap.querySelectorAll("[data-upsell-select]").forEach((select) => {
      select.addEventListener("change", () => {
        const key = select.getAttribute("data-upsell-select");
        const item = key ? upsellItemMap.get(key) : null;
        if (!item) return;
        const optIndex = Number(select.getAttribute("data-upsell-opt-index") || 0);
        const val = select.value;
        const variants = Array.isArray(item?.variants) ? item.variants : [];
        const picked =
          variants.find((v) => String(v?.[`option${optIndex + 1}`]) === String(val)) ||
          variants[0] ||
          null;
        const btn = select.closest(".sc-upsell-item")?.querySelector("[data-upsell-add]");
        if (btn) btn.setAttribute("data-upsell-add", safe(picked?.id || ""));
        const priceEl = select.closest(".sc-upsell-item")?.querySelector(".sc-upsell-price");
        if (priceEl && picked?.price != null) {
          const nextPrice = formatMoney(Number(picked.price) || 0, CART?.currency || "INR");
          priceEl.textContent = nextPrice;
        }
      });
    });

    clearUpsellTimer();
    if (settings.showAsSlider && settings.autoplay && total > 1) {
      UPSELL_TIMER = setInterval(() => {
        UPSELL_INDEX = UPSELL_INDEX + 1 >= total ? 0 : UPSELL_INDEX + 1;
        updateUpsellSliderPosition(wrap);
      }, 5200);
    }
  };

  const logProxyTables = (proxy) => {
    if (!DEBUG_TABLES) return;
    const tables = {
      shipping: getProxyArray(proxy, ["shippingRules", "shippingRule", "shippingrule"]),
      discount: getProxyArray(proxy, ["discountRules", "discountRule", "discountrule"]),
      freeGift: getProxyArray(proxy, ["freeGiftRules", "freeGiftRule", "freegiftrule"]),
      bxgy: getProxyArray(proxy, [
        "buyxgetyRules",
        "buyxgetyRule",
        "buyxgetyrule",
        "buyXGetYRules",
        "bxgyrule",
        "bxgyRules",
        "bxgyRule",
      ]),
    };

    console.groupCollapsed("[SC] Proxy Tables");
    Object.entries(tables).forEach(([label, rows]) => {
      console.groupCollapsed(label);
      console.table(Array.isArray(rows) ? rows : []);
      console.groupEnd();
    });

    if (proxy?.styleSettings) {
      console.groupCollapsed("styleSettings");
      console.table([proxy.styleSettings]);
      console.groupEnd();
    }

    if (proxy?.upsellSettings) {
      console.groupCollapsed("upsellSettings");
      console.table([proxy.upsellSettings]);
      console.groupEnd();
    }

    console.groupEnd();
  };

  const getCartTotalQty = () => {
    const items = Array.isArray(CART?.items) ? CART.items : [];
    return items.reduce((sum, it) => sum + (Number(it?.quantity) || 0), 0);
  };

  const gidToId = (gid) => {
    const s = String(gid || "");
    const m = s.match(/\/(\d+)\s*$/);
    return m ? m[1] : null;
  };

  const getRuleKey = (rule, fallbackPrefix = "rule") => {
    const raw =
      trimToNull(rule?.id) ||
      trimToNull(rule?.ruleId) ||
      trimToNull(rule?.rule_id) ||
      trimToNull(rule?.uid) ||
      trimToNull(rule?._id) ||
      trimToNull(rule?.campaignId) ||
      trimToNull(rule?.campaign_id) ||
      null;
    if (raw) return String(raw);
    const slot = normalizeStepSlotFromAny(rule);
    if (slot) return `${fallbackPrefix}:${slot}`;
    const a =
      trimToNull(rule?.campaignName) ||
      trimToNull(rule?.cartStepName) ||
      "unknown";
    return `${fallbackPrefix}:${a}`;
  };

  /* =========================================================
   ✅ Buy X Get Y statuses
  ========================================================= */
  const getBuyXGetYStatuses = () => {
    const items = Array.isArray(CART?.items) ? CART.items : [];
    const statuses = [];

    for (const r of BUYXGETY_RULES) {
      if (!isRuleEnabled(r)) continue;

      const scope = String(r?.scope || r?.scopeName || "store")
        .trim()
        .toLowerCase();
      const appliesTo = r?.appliesTo || r?.applyTo || {};
      const applyProducts = Array.isArray(appliesTo?.products)
        ? appliesTo.products
        : [];
      const applyCollections = Array.isArray(appliesTo?.collections)
        ? appliesTo.collections
        : [];

      let eligibleItems = items;

      if (scope === "product") {
        const allowed = new Set(
          applyProducts.map(gidToId).filter(Boolean).map(String)
        );
        eligibleItems = items.filter((it) =>
          allowed.has(String(it?.product_id || ""))
        );
      } else if (scope === "collection") {
        const allowedCols = new Set(
          applyCollections.map(gidToId).filter(Boolean).map(String)
        );
        eligibleItems = items.filter((it) => {
          const props = it?.properties || {};
          const col =
            props?._sc_collection_id ||
            props?._collection_id ||
            props?.collection_id;
          const id = gidToId(col) || (col ? String(col) : null);
          return id && allowedCols.has(String(id));
        });
      } else {
        eligibleItems = items;
      }

      const eligibleQty = eligibleItems.reduce(
        (sum, it) => sum + (Number(it?.quantity) || 0),
        0
      );
      const eligibleSubtotalRupees =
        (eligibleItems.reduce(
          (sum, it) => sum + (Number(it?.final_line_price) || 0),
          0
        ) /
          100) ||
        0;

      const minPurchase = Number(r?.minPurchase ?? r?.min_purchase);

      const xQty = Number(
        r?.xQty ?? r?.x_qty ?? r?.x ?? r?.buyQty ?? r?.buy_qty ?? r?.buy
      );
      const yQty = Number(
        r?.yQty ?? r?.y_qty ?? r?.y ?? r?.getQty ?? r?.get_qty ?? r?.get
      );

      const hasMin = Number.isFinite(minPurchase) && minPurchase > 0;
      const hasX = Number.isFinite(xQty) && xQty > 0;

      let complete = false;
      if (hasMin) complete = eligibleSubtotalRupees >= minPurchase;
      else if (hasX) complete = eligibleQty >= xQty;
      else complete = false;

      const beforeRaw =
        r?.beforeOfferUnlockMessage ??
        r?.beforeMessage ??
        r?.before_message ??
        "";
      const afterRaw =
        r?.afterOfferUnlockMessage ?? r?.afterMessage ?? r?.after_message ?? "";

      const remainingX = Math.max(
        0,
        (Number.isFinite(xQty) ? xQty : 0) - (eligibleQty || 0)
      );

      const beforeMsg = replaceTokens(beforeRaw, {
        x: remainingX,
        y: Number.isFinite(yQty) ? yQty : "",
      });

      const afterMsg = replaceTokens(afterRaw, {
        x: Number.isFinite(xQty) ? xQty : "",
        y: Number.isFinite(yQty) ? yQty : "",
      });

      const currentMsg = complete ? afterMsg : beforeMsg;

      statuses.push({
        rule: r,
        ruleKey: getRuleKey(r, "buyxgety"),
        scope,
        eligibleQty,
        eligibleSubtotalRupees,
        xQty,
        yQty,
        complete,
        beforeMsg,
        afterMsg,
        currentMsg,
      });
    }

    return statuses;
  };

  /* =========================================================
   ✅ BXGY STATUS (discountrule)
  ========================================================= */
  const getBxgyStatus = () => {
    const subtotalRupees =
      (Number(CART?.items_subtotal_price || 0) / 100) || 0;
    const cartQty = getCartTotalQty();

    let best = null;

    for (const r of BXGY_RULES) {
      if (!isRuleEnabled(r)) continue;

      const minPurchase = Number(r?.minPurchase ?? r?.min_purchase);
      const xQty = Number(
        r?.xQty ?? r?.x_qty ?? r?.x ?? r?.buyQty ?? r?.buy_qty ?? r?.buy
      );
      const yQty = Number(
        r?.yQty ?? r?.y_qty ?? r?.y ?? r?.getQty ?? r?.get_qty ?? r?.get
      );

      const hasMin = Number.isFinite(minPurchase) && minPurchase > 0;
      const hasX = Number.isFinite(xQty) && xQty > 0;

      let complete = false;
      if (hasMin) complete = subtotalRupees >= minPurchase;
      else if (hasX) complete = cartQty >= xQty;
      else complete = false;

      const beforeRaw =
        r?.beforeOfferUnlockMessage ??
        r?.beforeMessage ??
        r?.before_message ??
        "";
      const afterRaw =
        r?.afterOfferUnlockMessage ?? r?.afterMessage ?? r?.after_message ?? "";

      const remainingX = Math.max(
        0,
        (Number.isFinite(xQty) ? xQty : 0) - (cartQty || 0)
      );

      const beforeMsg = replaceTokens(beforeRaw, {
        x: hasX ? remainingX : Number.isFinite(xQty) ? xQty : "",
        y: Number.isFinite(yQty) ? yQty : "",
        goal: "",
      });

      const afterMsg = replaceTokens(afterRaw, {
        x: Number.isFinite(xQty) ? xQty : "",
        y: Number.isFinite(yQty) ? yQty : "",
        goal: "",
      });

      const beforeMsg2 = replaceProgressText({
        text: beforeMsg,
        type: "bxgy",
        rule: r,
        subtotalRupees,
        useRemainingForGoal: hasMin && !complete,
      });

      const afterMsg2 = replaceProgressText({
        text: afterMsg,
        type: "bxgy",
        rule: r,
        subtotalRupees,
        useRemainingForGoal: false,
      });

      const currentMsg = complete ? afterMsg2 : beforeMsg2;

      const payload = {
        rule: r,
        ruleKey: getRuleKey(r, "bxgy"),
        complete,
        beforeMsg: beforeMsg2,
        afterMsg: afterMsg2,
        currentMsg,
      };

      if (!best) best = payload;
      if (complete) {
        best = payload;
        break;
      }
    }

    return best;
  };

  /* =========================================================
   FETCHERS
  ========================================================= */
  const fetchCart = async () => {
    const r = await fetch("/cart.js", {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
    });
    if (!r.ok) throw new Error(`[SmartCartify] Cart fetch failed (${r.status})`);
    return r.json();
  };

  const fetchProxy = async () => {
    const r = await fetch(proxyPath, {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
    });

    const ct = r.headers.get("content-type") || "";
    if (!r.ok) {
      let text = "";
      try {
        text = await r.text();
      } catch { }
      return {
        ok: true,
        _proxyError: new Error(
          `[SmartCartify] Proxy fetch failed (${r.status}). ct=${ct} body=${text.slice(
            0,
            220
          )}...`
        ),
      };
    }

    if (!ct.includes("application/json")) {
      let text = "";
      try {
        text = await r.text();
      } catch { }
      return {
        ok: true,
        _proxyError: new Error(
          `[SmartCartify] Proxy not JSON. status=${r.status} ct=${ct} body=${text.slice(
            0,
            220
          )}...`
        ),
      };
    }

    const j = await r.json();
    if (!j?.ok) {
      return {
        ok: true,
        _proxyError: new Error(j?.error || "Invalid proxy response (ok:false)"),
      };
    }
    return j;
  };

  const cartChange = async (line, quantity) => {
    const r = await fetch("/cart/change.js", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ line, quantity }),
    });
    if (!r.ok) throw new Error(`[SmartCartify] Cart change failed (${r.status})`);
    return r.json();
  };

  /* =========================================================
   DOM
  ========================================================= */
  const overlay = document.createElement("div");
  overlay.className = "sc-overlay";
  overlay.setAttribute("aria-hidden", "true");

  const drawer = document.createElement("div");
  drawer.className = "sc-drawer";
  drawer.setAttribute("role", "dialog");
  drawer.setAttribute("aria-label", "Cart drawer");

  /* =========================================================
   ✅ PAPER EFFECT + CENTER popup
  ========================================================= */
  let celebrateTimer = null;

  const getConfettiOrigin = () => {
    const host = drawer;
    const w = host?.clientWidth || 0;
    const h = host?.clientHeight || 0;
    const rawX = Number(drawer?.dataset?.scConfettiX || 50);
    const rawY = Number(drawer?.dataset?.scConfettiY || h * 0.35);
    const x = Math.max(10, Math.min(90, Number.isFinite(rawX) ? rawX : 50));
    const y = Math.max(20, Math.min(h - 20, Number.isFinite(rawY) ? rawY : h * 0.35));
    return { xPercent: x, yPx: y };
  };

  const firePaperEffect = (durationMs = 3000) => {
    const host = drawer;
    if (!host) return;

    host.querySelector(".sc-paper")?.remove();

    const wrap = document.createElement("div");
    wrap.className = "sc-paper";
    host.appendChild(wrap);

    const pieces = 320;
    for (let i = 0; i < pieces; i++) {
      const p = document.createElement("i");
      p.className = "sc-paper-piece";
      p.style.left = `${Math.random() * 100}%`;
      p.style.top = `${Math.random() * 100}%`;
      p.style.setProperty("--sc-x", `${(Math.random() * 360 - 180).toFixed(1)}px`);
      p.style.animationDelay = `${Math.random() * 0.2}s`;
      p.style.animationDuration = `${2.6 + Math.random() * 0.5}s`;
      p.style.width = `${3 + Math.random() * 4}px`;
      p.style.height = `${4 + Math.random() * 5}px`;
      p.style.transform = `rotate(${Math.random() * 360}deg)`;
      wrap.appendChild(p);
    }

    setTimeout(() => wrap.remove(), durationMs + 300);
  };

  const showCenterCelebratePopup = (title, subtitle, ms = 5000) => {
    drawer.querySelector(".sc-celebrate-backdrop")?.remove();

    const back = document.createElement("div");
    back.className = "sc-celebrate-backdrop";
    back.innerHTML = `
      <div class="sc-celebrate-modal" role="status" aria-live="polite">
        <div class="sc-celebrate-h">${safe(title)}</div>
        <div class="sc-celebrate-p">${safe(subtitle)}</div>
      </div>
    `;

    drawer.appendChild(back);
    requestAnimationFrame(() => back.classList.add("open"));

    const setConfettiOriginFromModal = () => {
      const modal = back.querySelector(".sc-celebrate-modal");
      if (!modal) return;
      const hostRect = drawer.getBoundingClientRect();
      const rect = modal.getBoundingClientRect();
      if (!hostRect.width || !hostRect.height) return;
      const x = ((rect.left + rect.width / 2 - hostRect.left) / hostRect.width) * 100;
      const y = rect.top + rect.height / 2 - hostRect.top;
      drawer.dataset.scConfettiX = String(x);
      drawer.dataset.scConfettiY = String(y);
    };

    const close = () => {
      back.classList.remove("open");
      setTimeout(() => back.remove(), 220);
      delete drawer.dataset.scConfettiX;
      delete drawer.dataset.scConfettiY;
    };

    back.addEventListener("click", (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.classList.contains("sc-celebrate-backdrop")) close();
    });

    if (celebrateTimer) clearTimeout(celebrateTimer);
    celebrateTimer = setTimeout(close, ms);
    requestAnimationFrame(setConfettiOriginFromModal);
  };

  /* =========================================================
   LOADING LINE under sc-progress ✅
  ========================================================= */
  const setProgressLoading = (isLoading) => {
    drawer.classList.toggle("sc-refreshing", !!isLoading);
  };

  /* =========================================================
   ✅ ANNOUNCEMENT BAR
  ========================================================= */
  const setAnnouncementMessages = (arr) => {
    ANNOUNCE_MESSAGES = (arr || []).map((x) => trimToNull(x)).filter(Boolean);

    const bar = drawer.querySelector("[data-sc-announce]");
    if (!bar) return;

    if (!ANNOUNCE_MESSAGES.length) {
      bar.hidden = true;
      bar.innerHTML = "";
      return;
    }

    bar.hidden = false;

    if (ANNOUNCE_MESSAGES.length === 1) {
      bar.innerHTML = `
        <div class="sc-announce-static" role="status" aria-live="polite">
          <span class="sc-announce-static-text">${safe(
        ANNOUNCE_MESSAGES[0]
      )}</span>
        </div>
      `;
      return;
    }

    const snippet = ANNOUNCE_MESSAGES
      .map((m) => `<span class="info-text">${safe(m)}</span>`)
      .join("");

    bar.innerHTML = `
      <div class="marquee-text" role="status" aria-live="polite">
        <div class="top-info-bar">
          ${snippet}${snippet}
        </div>
      </div>
    `;

    if (DEBUG_TABLES) {
      console.groupCollapsed("[SC] Announcement Messages");
      console.table(ANNOUNCE_MESSAGES.map((m, i) => ({ i: i + 1, message: m })));
      console.groupEnd();
    }
  };

  const isDiscountAppliedInCart = (code) => {
    const c = trimToNull(code);
    if (!c) return false;

    const attrs = CART?.attributes || {};
    const inAttr =
      Object.values(attrs).some(
        (v) => String(v || "").toLowerCase() === c.toLowerCase()
      ) ||
      String(attrs?.discount_code || "").toLowerCase() === c.toLowerCase() ||
      String(attrs?.discountCode || "").toLowerCase() === c.toLowerCase();

    const cartCodes = Array.isArray(CART?.discount_codes) ? CART.discount_codes : [];
    const inCartCodes = cartCodes.some(
      (d) => String(d?.code || d || "").toLowerCase() === c.toLowerCase()
    );

    return inAttr || inCartCodes;
  };

  // ✅ FIX-1: Announcement MUST show even if ONLY one source exists.
  // ✅ ALSO: Should work even if milestones steps are empty.
  const refreshAnnouncementFromRules = () => {
    const subtotalRupees = (Number(CART?.items_subtotal_price || 0) / 100) || 0;
    const msgs = [];

    // (A) discountrule type="code"
    (CODE_DISCOUNT_RULES || []).forEach((r) => {
      if (!isRuleEnabled(r)) return;

      const code = trimToNull(r?.discountCode ?? r?.discount_code ?? r?.code ?? "");
      const applied = code ? isDiscountAppliedInCart(code) : false;
      const ruleType = trimToNull(r?.type ?? r?.ruleType ?? r?.rule_type ?? "").toLowerCase();
      const isCodeRule = ruleType === "code";

      const raw = applied ? getProgressAfter(r) : getProgressBefore(r);
      const t = replaceProgressText({
        text: raw,
        type: "discount",
        rule: r,
        subtotalRupees,
        useRemainingForGoal: !applied && !isCodeRule,
      });

      if (trimToNull(t)) msgs.push(t);
    });

    // (B) BXGY (discountrule)
    const bx = getBxgyStatus();
    if (bx && trimToNull(bx.currentMsg)) msgs.push(bx.currentMsg);

    // (C) BuyXGetY (bxgyrule)
    const buyStatuses = getBuyXGetYStatuses();
    buyStatuses.forEach((st) => {
      if (trimToNull(st.currentMsg)) msgs.push(st.currentMsg);
    });

    // (D) fallback from proxy (if any)
    const proxyMsgs =
      (Array.isArray(PROXY?.announcementMessages) ? PROXY.announcementMessages : null) ||
      (Array.isArray(PROXY?.announcementBarMessages) ? PROXY.announcementBarMessages : null) ||
      (Array.isArray(PROXY?.announcementBar?.messages) ? PROXY.announcementBar.messages : null) ||
      [];

    (proxyMsgs || [])
      .map((x) => trimToNull(x))
      .filter(Boolean)
      .forEach((m) => msgs.push(m));

    // de-dup
    const unique = [];
    const seen = new Set();
    for (const m of msgs) {
      const key = String(m).trim().toLowerCase();
      if (!key) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(m);
    }

    setAnnouncementMessages(unique);
  };

  const getDiscountRuleCode = (rule) =>
    trimToNull(rule?.discountCode ?? rule?.discount_code ?? rule?.code ?? "");

  const findAppliedDiscountCodeRule = () => {
    const list = Array.isArray(CODE_DISCOUNT_RULES) ? CODE_DISCOUNT_RULES : [];
    for (const rule of list) {
      if (!isRuleEnabled(rule)) continue;
      const code = getDiscountRuleCode(rule);
      if (!code) continue;
      if (isDiscountAppliedInCart(code)) return { rule, code };
    }
    return null;
  };

  const maybeShowAppliedDiscountCodePopup = () => {
    const applied = findAppliedDiscountCodeRule();
    if (!applied) {
      if (trimToNull(discountPopupShownForCode)) {
        clearPopupShown("discount", discountPopupShownForCode);
      }
      discountPopupShownForCode = null;
      return false;
    }

    const normalized = String(applied.code).trim().toLowerCase();
    if (!normalized) return false;
    if (!canShowPopupFor("discount", normalized)) return false;

    discountPopupShownForCode = normalized;
    markPopupShown("discount", normalized);

    const subtotalRupees = (Number(CART?.items_subtotal_price || 0) / 100) || 0;
    const txt = replaceProgressText({
      text: trimToNull(getProgressAfter(applied.rule)) || "",
      type: "discount",
      rule: applied.rule,
      subtotalRupees,
      useRemainingForGoal: false,
    });

    openDrawer();
    showCenterCelebratePopup("Discount Applied ✅", txt || `Discount applied: ${applied.code}`, 5000);
    return true;
  };

  /* =========================================================
   STYLES ✅
  ========================================================= */
  const ensureStyles = () => {
    if (document.getElementById("smartcartify-drawer-v27-style")) return;
    const s = document.createElement("style");
    s.id = "smartcartify-drawer-v27-style";
    s.textContent = `
a:empty, ul:empty, dl:empty, div:empty, section:empty, article:empty,
p:empty, h1:empty, h2:empty, h3:empty, h4:empty, h5:empty, h6:empty{display:block !important;}
.sc-overlay, .sc-drawer, .sc-progress, .sc-milestone, .sc-track, .sc-fill, .sc-dots{display:block !important;}

:root{
  --sc-font: Inter,system-ui,sans-serif;
  --sc-base-font-size: 16px;
  --sc-heading-scale: 1.2;
  --sc-heading-font-size: calc(var(--sc-base-font-size) * var(--sc-heading-scale));
  --sc-button-font-size: calc(var(--sc-base-font-size) * 1.1);
  --sc-small-font-size: calc(var(--sc-base-font-size) * 0.85);
  --sc-overlay-bg: rgba(0,0,0,.45);

  --sc-bg: transparent;
  --sc-text: #ffffff;

  --sc-border: rgba(229,231,235,1);
  --sc-muted: rgba(107,114,128,1);

  --sc-drawer-width: min(480px,92vw);
  --sc-drawer-bg: transparent;
  --sc-drawer-text-color: #111827;
  --sc-drawer-header-color: #ffffff;

  --sc-top-bg-color: transparent;
  --sc-top-bg-image: none;
  --sc-top-bg-color-effective: var(--sc-top-bg-color);
  --sc-top-bg-image-effective: var(--sc-top-bg-image);

  --sc-progress-bg: var(--sc-top-bg-color-effective);
  --sc-progress-text: var(--sc-text);

  --sc-progress: #57c011;
  --sc-free-tag-color: var(--sc-progress);
  --sc-free-tag-font-size: var(--sc-small-font-size);
  --sc-stepcount:4;
  --sc-dot:28px;
  --sc-track-h:8px;
  --sc-milestone-width:min(420px, 92vw);

  --sc-radius:14px;
  --sc-btn-radius:12px;
  --sc-chip-radius:999px;

  --sc-item-bg: transparent;
  --sc-item-border: var(--sc-border);
  --sc-image-bg: rgba(243,244,246,1);

  --sc-qty-btn-bg: rgba(255,255,255,1);
  --sc-qty-btn-border: var(--sc-border);
  --sc-qty-btn-text: #111827;
  --sc-qty-input-bg: rgba(255,255,255,1);
  --sc-qty-input-border: var(--sc-border);
  --sc-qty-input-text: #111827;

  --sc-footer-bg: var(--sc-drawer-bg);
  --sc-input-bg: rgba(255,255,255,1);
  --sc-input-border: var(--sc-border);
  --sc-input-text: #111827;
  --sc-input-placeholder: rgba(156,163,175,1);

  --sc-apply-bg: rgba(255,255,255,1);
  --sc-apply-text: #111827;
  --sc-apply-border: rgba(17,24,39,.25);

  --sc-subtotal-bg: rgba(255,255,255,1);
  --sc-subtotal-text: #111827;
  --sc-subtotal-label: rgba(107,114,128,1);

  --sc-checkout-bg: rgba(243,199,122,1);
  --sc-checkout-text: #111827;
  --sc-badge-bg: rgba(17,24,39,.1);
  --sc-badge-text: #111827;

  --sc-freegift-bg:var(--sc-drawer-bg);
  --sc-freegift-border: rgba(15,23,42,.08);
  --sc-freegift-shadow: 0 20px 40px rgba(15,23,42,.25);
  --sc-freegift-text: #0f172a;
  --sc-freegift-subtext: var(--sc-drawer-text-color);
  --sc-freegift-btn-bg: var(--sc-progress);
  --sc-freegift-btn-text: #ffffff;
  --sc-celebrate-backdrop: rgba(17,24,39,.25);
  --sc-celebrate-bg: #ffffff;
  --sc-celebrate-border: rgba(0,0,0,.08);
  --sc-celebrate-badge-bg: rgba(87,192,17,.14);
  --sc-celebrate-title-color: #111827;
  --sc-celebrate-title-size: var(--sc-heading-font-size);
  --sc-celebrate-text-size: var(--sc-small-font-size);

  --sc-close-bg: transparent;
  --sc-close-border: var(--sc-border);
  --sc-close-text: var(--sc-drawer-text-color);
}

.sc-overlay{
  position:fixed;inset:0;
  background:var(--sc-overlay-bg);
  opacity:0;visibility:hidden;transition:.2s;
  z-index:2147483646 !important;
  pointer-events:none !important;
}
.sc-overlay.open{opacity:1;visibility:visible;pointer-events:auto !important}

.sc-drawer{
  position:fixed;top:0;right:0;height:100%;
  width:var(--sc-drawer-width);
  background: var(--sc-drawer-bg);
  background-size:cover;
  background-position:center;
  background-repeat:no-repeat;
  transform:translateX(110%);
  transition:transform .25s ease;
  z-index:2147483647 !important;
  pointer-events:none !important;
  display:flex !important;
  flex-direction:column;
  font-family:var(--sc-font);
  font-size:var(--sc-base-font-size);
  color:var(--sc-drawer-text-color);
}
.sc-drawer.open{transform:translateX(0);pointer-events:auto !important}
.sc-drawer *{box-sizing:border-box;pointer-events:auto !important}

body.sc-cartify-open header,
body.sc-cartify-open header-component,
body.sc-cartify-open .shopify-section-group-header-group{
  pointer-events:none !important;
}

.content-cart-smartcartify{
  display:flex;
  flex-direction:column;
  flex:1;
  min-height:0;
}

.sc-header{
  padding:10px;
  display:flex;align-items:center;justify-content:space-between;gap:12px;
  color:var(--sc-drawer-header-color);
  background-color: var(--sc-top-bg-color-effective);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  backdrop-filter: blur(6px);
}
.sc-title{
  font-size:var(--sc-heading-font-size);
  font-weight:700;
  margin:0;
  color:var(--sc-drawer-header-color);
}
.sc-close{
  width:36px;height:36px;border-radius:10px;
  border:1px solid var(--sc-close-border);
  background:var(--sc-close-bg);
  cursor:pointer;font-size:var(--sc-button-font-size);line-height:1;
  color:var(--sc-close-text);
}

/* Announcement */
.sc-announce{
  background-color: var(--sc-top-bg-color-effective);
  background-image: var(--sc-top-bg-image-effective);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  width:100%;
  border-top: 1px solid var(--sc-item-border);
  padding: 0 15px;
}
.sc-announce-static{
  width:100%;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:6px 12px;
}
.sc-announce-static-text{
  display:inline-block;
  text-align:center;
  font-size:var(--sc-small-font-size);
  font-weight:700;
  color: var(--sc-text);
}
.marquee-text{
  box-sizing:border-box;
  align-items:center;
  overflow:hidden;
  background: var(--sc-top-bg-color-effective);
}
.marquee-text .top-info-bar{
  font-size:var(--sc-small-font-size);
  width:200%;
  display:flex;
  animation: marquee 25s linear infinite running;
}
.marquee-text .top-info-bar:hover{animation-play-state: paused;}
.marquee-text .top-info-bar .info-text{
  padding:10px 30px;
  white-space:nowrap;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  transition: all .2s ease;
  color:var(--sc-drawer-text-color);
  font-size:var(--sc-base-font-size);
}
.marquee-text .top-info-bar .info-text a{color: var(--sc-text);text-decoration:none;}
@keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translate(-50%); } }

/* Progress */
.sc-progress{
  background: var(--sc-progress-bg);
  color: var(--sc-progress-text);
  padding:5px 0 14px;
  position:relative;
}
.sc-label{
  font-size:var(--sc-heading-font-size);
  font-weight:600;margin:0 0 12px;
  text-align:center;
  min-height:22px;
  padding:0 12px;
  color: var(--sc-progress-text);
  text-shadow: 0 1px 2px rgba(0,0,0,.35);
}

.sc-progress-loading{
  position:absolute;left:0;right:0;bottom:0;height:3px;overflow:hidden;
  opacity:0;transform:translateY(6px);
  transition:opacity .15s ease, transform .15s ease;
}
.sc-refreshing .sc-progress-loading{opacity:1;transform:translateY(0);}
.sc-progress-loading::before{
  content:"";position:absolute;left:-40%;top:0;height:100%;width:40%;
  background:rgba(255,255,255,.75);animation:scLine .9s linear infinite;
}
@keyframes scLine{0%{left:-40%}100%{left:110%}}

.sc-milestone{width:var(--sc-milestone-width);margin:0 auto}
.sc-track{position:relative;height:calc(var(--sc-dot) + 28px);}
.sc-track::before{
  content:"";position:absolute;left:0;right:0;
  top:calc(var(--sc-dot) / 2);
  height:var(--sc-track-h);
  transform:translateY(-50%);
  background:rgba(255,255,255,.25);
  border-radius:999px;
}
.sc-fill{
  position:absolute;left:0;
  top:calc(var(--sc-dot) / 2);
  height:var(--sc-track-h);
  transform:translateY(-50%);
  width:0%;
  background:var(--sc-progress);
  border-radius:999px;
  transition:width .25s ease;
  z-index:1;
}
.sc-dots{position:absolute;inset:0;z-index:2;pointer-events:none;}

.sc-dot-wrap{
  position:absolute;
  top:calc(var(--sc-dot) / 2);
  transform:translateX(-50%);
  display:flex;
  flex-direction:column;
  align-items:center;
  min-width:44px;
}
.sc-dot-wrap.last{transform:translateX(-70%);}

.sc-dot-bubble{
  width:var(--sc-dot);
  height:var(--sc-dot);
  border-radius:999px;
  background:#cbd5e1;
  color:#111827;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:var(--sc-base-font-size);
  border:3px solid rgba(0,0,0,.0);
  transform:translateY(-50%);
}
.sc-dot-wrap.done .sc-dot-bubble{background:var(--sc-progress);color:#fff}
.sc-dot-wrap.active .sc-dot-bubble{background:#fff;color:#111827}

.sc-dot-text{
  font-size:var(--sc-small-font-size);
  color:#fff;
  text-align:center;
  line-height:1.1;
  max-width:92px;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}

.sc-legends{display:none !important;}

.sc-items{
  flex:1;
  overflow:auto;
  padding:0;
  backdrop-filter:blur(6px);
  color:var(--sc-drawer-text-color);
  background: transparent;
}
.sc-empty{
  margin:16px;padding:18px;
  border:1px dashed var(--sc-border);
  border-radius:var(--sc-radius);
  font-size: var(--sc-small-font-size);
  color: var(--sc-drawer-text-color);
  text-align:center;
}
.sc-empty svg{
  width:64px;
  height:64px;
  display:block;
  margin:0 auto 10px;
}
.sc-empty-text{
  font-weight:700;
}

.sc-item{
  display:flex;align-items:center;gap:12px;
  padding:14px 16px;
  border:1px solid var(--sc-item-border);
  margin:0;
  background: var(--sc-item-bg);
  border-radius: 10px;
  margin: 5px;
}
.sc-img{
  width:52px;height:52px;border-radius:12px;
  overflow:hidden;background:var(--sc-image-bg);
  flex:0 0 auto;
}
.sc-img img{width:100%;height:100%;object-fit:cover;object-position:top;display:block;}
.sc-mid{flex:1;min-width:0;display:flex;flex-direction:column;gap:8px;}
.sc-name{
  margin:0;font-size:var(--sc-base-font-size);font-weight:800;
  color:var(--sc-drawer-text-color);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}
.sc-name a{color:inherit;text-decoration:none;}
.sc-name a:hover{text-decoration:underline;}

.sc-qty{display:inline-flex;align-items:center;gap:8px;}
.sc-qty button{
  width:34px;height:34px;border-radius:10px;
  border:1px solid var(--sc-qty-btn-border);
  background:var(--sc-qty-btn-bg);
  cursor:pointer;font-size:var(--sc-button-font-size);line-height:1;
  color:var(--sc-qty-btn-text);
}
.sc-qty input{
  width:44px;height:34px;border-radius:10px;
  border:1px solid var(--sc-qty-input-border);
  background:var(--sc-qty-input-bg);
  text-align:center;outline:none;font-weight:700;
  color:var(--sc-qty-input-text);
}
.sc-pricebox{flex:0 0 auto;display:flex;align-items:flex-end;gap:8px;margin-left:6px;white-space:nowrap;}
.sc-compare{font-size:var(--sc-small-font-size);color:#9ca3af;text-decoration:line-through;font-weight:700;display:none;}
.sc-price{font-size:var(--sc-base-font-size);font-weight:900;color:var(--sc-drawer-text-color);}
.sc-price.sc-price-free{color:var(--sc-drawer-text-color);}
.sc-free-tag{
  display:inline-block;
  margin-left:6px;
  font-size:var(--sc-free-tag-font-size);
  color:var(--sc-free-tag-color);
}

.sc-upsell{
  padding: 0 10px 6px;
}
.sc-upsell-card{
  border-radius: 10px;
  border: 1px solid var(--sc-border);
  background: var(--sc-upsell-bg, #f8fafc);
  padding: 6px;
}
.sc-upsell-title{
  font-size: var(--sc-base-font-size);
  font-weight: 700;
  text-align: center;
  margin: 3px 0 6px;
  color: var(--sc-upsell-text, var(--sc-drawer-text-color));
}
.sc-upsell-inner{
  border-radius: 8px;
  border: 1px solid var(--sc-border);
  background: var(--sc-upsell-bg, #f8fafc);
  padding: 6px 14px;
  position: relative;
  overflow: visible;
}
.sc-upsell-viewport{
  overflow: hidden;
}
.sc-upsell-track{
  display: flex;
  width: 100%;
  transition: transform 700ms ease;
  gap: 0;
}
.sc-upsell-item + .sc-upsell-item{
  margin-top: 12px;
}
.sc-upsell-slide{
  flex: 0 0 100%;
  min-width: 100%;
}
.sc-upsell-row{
  display: grid;
  grid-template-columns: 80px 1fr auto;
  gap: 20px;
  align-items: center;
}
.sc-upsell-info{
  display: grid;
  gap: 6px;
  min-width: 0;
}
.sc-upsell-top{
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
}
.sc-upsell-img{
  width: 70px;
  height: 70px;
  border-radius: 8px;
  background: #eef2f7;
  overflow: hidden;
  display: grid;
  place-items: center;
}
.sc-upsell-img img{
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.sc-upsell-name{
  font-weight: 600;
  font-size: var(--sc-base-font-size);
  color: var(--sc-upsell-text, var(--sc-drawer-text-color));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sc-upsell-sub{
  font-size: var(--sc-small-font-size);
  color: var(--sc-upsell-text, var(--sc-drawer-text-color));
  opacity: 0.75;
  display: none;
}
.sc-upsell-price{
  font-weight: 600;
  color: var(--sc-upsell-text, var(--sc-drawer-text-color));
  white-space: nowrap;
}
.sc-upsell-controls{
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    margin-top: 8px;
}
.sc-upsell-select-wrap{
  position: relative;
}
.sc-upsell-select{
  width: 100%;
  border: 1px solid var(--sc-border);
  border-radius: 10px;
  padding: 6px 28px 6px 10px;
  font-size: var(--sc-small-font-size);
  color: var(--sc-upsell-text, var(--sc-drawer-text-color));
  background: #ffffff;
  min-height: 30px;
  appearance: none;
}
.sc-upsell-select:focus{
  outline: none;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
  border-color: #2563eb;
}
.sc-upsell-select-arrow{
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--sc-upsell-arrow, #111827);
  pointer-events: none;
  font-size: 12px;
}
.sc-upsell-btn{
  border-radius: 10px;
  background: var(--sc-upsell-button-bg, #111111);
  color: #ffffff;
  padding: 4px 8px;
  font-size: 12px;
  min-height: 30px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}
.sc-upsell-arrow{
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  border-radius: 999px;
  border: 1px solid var(--sc-border);
  display: grid;
  place-items: center;
  background: #ffffff;
  color: var(--sc-upsell-arrow, #111827);
  font-weight: 700;
  cursor: pointer;
  z-index: 2;
}
.sc-upsell-arrow.left{left: 6px;}
.sc-upsell-arrow.right{right: 6px;}

/* remove icon */
.sc-remove-x{
  flex:0 0 auto;
  width:34px;height:34px;
  border:none;background:transparent;
  cursor:pointer;
  font-size:var(--sc-button-font-size);
  line-height:1;
  display:flex;align-items:center;justify-content:center;
  color: var(--sc-drawer-text-color);
}
.sc-remove-x svg{
  width:16px;height:16px;
  display:block;
  color: currentColor;
}
.sc-remove-x svg *{
  fill: currentColor !important;
}
.sc-remove-x:hover{opacity:.85}

/* Footer */
.sc-footer{
  border-top:1px solid var(--sc-border);
  padding:12px;
  display:flex;
  flex-direction:column;
  gap:10px;
  backdrop-filter:blur(6px);
  color:var(--sc-drawer-text-color);
  background: var(--sc-footer-bg);
}
.sc-discount{display:flex;gap:10px;align-items:center;}
.sc-discount input{
  flex:1;height:44px;border-radius:var(--sc-btn-radius);
  border:1px solid var(--sc-input-border);
  background:var(--sc-input-bg);
  padding:0 14px;font-size:var(--sc-base-font-size);color:var(--sc-input-text);
}
.sc-discount input::placeholder{color:var(--sc-input-placeholder);}

.sc-discount button{
  min-width:110px;height:44px;border-radius:var(--sc-btn-radius);
  border:1px solid var(--sc-apply-border);
  background:var(--sc-apply-bg);
  color:var(--sc-apply-text);
  font-weight:800;
  cursor:pointer;
}

.sc-footer-row{display:flex;gap:10px;align-items:stretch;}

.sc-subtotal-box{
  flex:0 0 42%;
  border:1px solid var(--sc-border);
  border-radius:var(--sc-btn-radius);
  padding:10px 12px;
  display:flex;flex-direction:column;justify-content:center;
}
.sc-subtotal-box .sc-sub-label{
  font-size:var(--sc-small-font-size);
  color:var(--sc-drawer-text-color);
  line-height:1.2;
}
.sc-subtotal-box .sc-sub-value{
  font-size:var(--sc-heading-font-size);
  font-weight:900;
  color:var(--sc-drawer-text-color);
  line-height:1.2;
}

.sc-checkout{
  flex:1;border:none;border-radius:var(--sc-btn-radius);
  background:var(--sc-checkout-bg);
  color:var(--sc-progress-text);
  font-size:var(--sc-heading-font-size);
  cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  position:relative;min-height:56px;
}
.sc-badge{
  position:absolute;right:10px;top:50%;transform:translateY(-50%);
  background:var(--sc-badge-bg);
  color:var(--sc-progress-text);
  border-radius:var(--sc-chip-radius);
  min-width:28px;height:28px;padding:0 10px;
  display:inline-flex;align-items:center;justify-content:center;
  font-size:var(--sc-heading-font-size);font-weight:800;
}

/* Reward popup */
.sc-freegift-overlay{
  position:fixed;
  inset:0;
  background:rgba(15,23,42,.65);
  display:flex;
  align-items:center;
  justify-content:center;
  opacity:0;
  visibility:hidden;
  transition:opacity .2s ease, visibility .2s ease;
  z-index:2147483050;
}
.sc-freegift-overlay.open{
  opacity:1;
  visibility:visible;
}
.sc-freegift-card{
  width:min(360px, 92%);
  background:var(--sc-freegift-bg);
  border-radius:18px;
  padding:24px;
  border:1px solid var(--sc-freegift-border);
  box-shadow:var(--sc-freegift-shadow);
  position:relative;
  font-size:var(--sc-base-font-size);
  color:var(--sc-freegift-text);
  text-align:left;
}
.sc-freegift-close{
  position:absolute;
  top:12px;
  right:12px;
  width:32px;height:32px;
  border-radius:50%;
  border:1px solid var(--sc-close-border);
  background:var(--sc-freegift-bg);
  cursor:pointer;
  font-size:18px;
  line-height:1;
  color:var(--sc-freegift-text);
}
.sc-freegift-header{
  display:flex;
  align-items:flex-start;
  gap:12px;
  margin-bottom:18px;
}
.sc-freegift-icon{
  width:40px;
  height:40px;
  border-radius:12px;
  background:rgba(87,192,17,.14);
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:20px;
}
.sc-freegift-title-text{
  margin:0;
  font-weight:700;
  font-size:var(--sc-heading-font-size);
}
.sc-freegift-subtext{
  margin:4px 0 0;
  font-size:var(--sc-small-font-size);
  color:var(--sc-freegift-subtext);
}
.sc-freegift-rule-title{
  margin:2px 0 0;
  font-size:var(--sc-base-font-size);
  color:var(--sc-freegift-text);
  opacity:.85;
}
.sc-freegift-content{
  display:grid;
  grid-template-columns:72px 1fr;
  gap:12px;
  align-items:center;
  margin-bottom:20px;
}
.sc-freegift-image-wrap{
  width:72px;
  height:72px;
  border-radius:14px;
  overflow:hidden;
  background:rgba(15,23,42,.05);
  display:flex;
  align-items:center;
  justify-content:center;
}
.sc-freegift-image{
  width:100%;
  height:100%;
  object-fit:cover;
  display:block;
}
.sc-freegift-product-title{
  margin:0;
  font-weight:700;
  font-size:16px;
}
.sc-freegift-product-sub{
  margin:4px 0 0;
  font-size:var(--sc-small-font-size);
  color:var(--sc-freegift-subtext);
}
.sc-freegift-add{
  width:100%;
  border:none;
  border-radius:12px;
  padding:12px;
  background:var(--sc-freegift-btn-bg);
  color:var(--sc-freegift-btn-text);
  font-weight:700;
  font-size:var(--sc-base-font-size);
  cursor:pointer;
  transition:transform .2s ease, opacity .2s ease;
}
.sc-freegift-add:disabled{
  opacity:.6;
  cursor:not-allowed;
}

/* confetti */
.sc-paper{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:3;}
.sc-paper-piece{position:absolute;border-radius:3px;opacity:1;animation-name:scPaperFall;animation-timing-function:linear;background:linear-gradient(45deg, rgba(255,123,172,1), rgba(255,210,245,1));box-shadow:0 6px 18px rgba(0,0,0,.10);}
.sc-paper-piece:nth-child(4n){border-radius:50%;}
.sc-paper-piece:nth-child(4n+1){border-radius:2px;}
.sc-paper-piece:nth-child(3n){background:linear-gradient(45deg, rgba(255,210,120,.95), rgba(255,245,200,.85))}
.sc-paper-piece:nth-child(3n+1){background:linear-gradient(45deg, rgba(120,215,255,.95), rgba(190,245,255,.85))}
.sc-header{position:relative;z-index:4;}
@keyframes scPaperFall{0%{transform:translate3d(0,0,0) rotate(0deg);opacity:1}100%{transform:translate3d(var(--sc-x),520px,0) rotate(420deg);opacity:1}}

.sc-celebrate-backdrop{
  position:absolute;inset:0;z-index:2147483006;
  display:flex;align-items:center;justify-content:center;
  color: var(--sc-drawer-header-color);
  background-color: var(--sc-celebrate-backdrop);
  opacity:0;transform:scale(1.01);
  transition:opacity .18s ease, transform .18s ease;
  backdrop-filter:none;
}
.sc-celebrate-backdrop.open{opacity:1;transform:scale(1);}
.sc-celebrate-modal{
  width:min(360px, 86%);
  color: var(--sc-drawer-header-color);
  background-color: var(--sc-top-bg-color-effective);
  border:1px solid var(--sc-celebrate-border);
  border-radius:18px;box-shadow:0 18px 42px rgba(0,0,0,.22);
  padding:18px 16px;text-align:center;
}
.sc-celebrate-badge{
  width:54px;height:54px;margin:0 auto 10px;border-radius:16px;
  display:flex;align-items:center;justify-content:center;
  background:var(--sc-celebrate-badge-bg);
  font-size:var(--sc-celebrate-title-size);
}
.sc-celebrate-h{font-weight:900;color:var(--sc-progress-text);font-size:var(--sc-heading-font-size);line-height:1.2;}
.sc-celebrate-p{margin-top:6px;color:var(--sc-drawer-text-color);font-size:var(--sc-base-font-size);line-height:1.35;}
    `;
    document.head.appendChild(s);
  };
  ensureStyles();

  // ✅ Announcement bar between header and progress
  drawer.innerHTML = `
    <div class="sc-header">
      <h3 class="sc-title">Your Cart</h3>
      <button class="sc-close" data-close type="button" aria-label="Close">
        <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24" fill="#fff" stroke="#ffffff">
          <path fill-rule="fff" clip-rule="evenodd" d="M5.29289 5.29289C5.68342 4.90237 6.31658 4.90237 6.70711 5.29289L12 10.5858L17.2929 5.29289C17.6834 4.90237 18.3166 4.90237 18.7071 5.29289C19.0976 5.68342 19.0976 6.31658 18.7071 6.70711L13.4142 12L18.7071 17.2929C19.0976 17.6834 19.0976 18.3166 18.7071 18.7071C18.3166 19.0976 17.6834 19.0976 17.2929 18.7071L12 13.4142L6.70711 18.7071C6.31658 19.0976 5.68342 19.0976 5.29289 18.7071C4.90237 18.3166 4.90237 17.6834 5.29289 17.2929L10.5858 12L5.29289 6.70711C4.90237 6.31658 4.90237 5.68342 5.29289 5.29289Z" fill="#0F1729"/>
        </svg>
      </button>
    </div>
    <div class="content-cart-smartcartify">
    <div class="sc-announce" data-sc-announce hidden></div>

    <div class="sc-progress">
      <p class="sc-label">Loading…</p>

      <div class="sc-milestone">
        <div class="sc-track">
          <div class="sc-fill"></div>
          <div class="sc-dots"></div>
        </div>
      </div>

      <div class="sc-legends"></div>
      <div class="sc-progress-loading" aria-hidden="true"></div>
    </div>

    <div class="sc-items">
      <div class="sc-empty">Loading cart…</div>
      <div class="sc-upsell" hidden></div>
    </div>

    <div class="sc-footer">
      <div class="sc-footer-row">
        <div class="sc-subtotal-box">
          <div class="sc-sub-label">Total</div>
          <div class="sc-sub-value" data-subtotal>₹0</div>
        </div>

        <button class="sc-checkout" data-checkout type="button">
          <span class="sc-checkout-label">Checkout</span>
          <span class="sc-badge" data-count>0</span>
        </button>
      </div>
    </div>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(drawer);

  function openDrawer() {
    overlay.classList.add("open");
    drawer.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");
    document.documentElement.style.overflow = "hidden";
    document.body.classList.add("sc-cartify-open");
  }

  function closeDrawer() {
    overlay.classList.remove("open");
    drawer.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
    document.documentElement.style.overflow = "";
    document.body.classList.remove("sc-cartify-open");
  }

  const $ = (sel) => drawer.querySelector(sel);

  // ✅ Properties for Free Product / Reward products
  const FREE_GIFT_PROPERTY = "_sc_free_gift";
  const FREE_GIFT_VARIANT_PROPERTY = "_sc_free_gift_variant";
  const FREE_GIFT_RULE_PROPERTY = "_sc_free_gift_rule";
  const FREE_GIFT_RULE_KEY_PROPERTY = "_sc_free_gift_rule_key";

  // ✅ Buy X Get Y / BXGY reward properties
  const BXGY_GIFT_PROPERTY = "_sc_bxgy_gift";
  const BXGY_GIFT_VARIANT_PROPERTY = "_sc_bxgy_gift_variant";
  const BXGY_GIFT_RULE_PROPERTY = "_sc_bxgy_gift_rule";
  const BXGY_GIFT_KIND_PROPERTY = "_sc_bxgy_kind"; // "bxgy" | "buyxgety"

  const drawerDiscountPanel = drawer.querySelector("[data-discount-panel]");
  const discountInput = drawer.querySelector("[data-discount-input]");
  const discountButton = drawer.querySelector("[data-discount-apply]");

  overlay.addEventListener("click", closeDrawer);
  $("[data-close]")?.addEventListener("click", closeDrawer);
  drawer.addEventListener("click", (e) => {
    const el = e.target;
    if (!(el instanceof Element)) return;
    if (el.closest("[data-close]")) closeDrawer();
  });
  document.addEventListener(
    "click",
    (e) => {
      const el = e.target;
      if (!(el instanceof Element)) return;
      if (el.closest(".sc-drawer [data-close]")) {
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        closeDrawer();
      }
    },
    true
  );
  document.addEventListener(
    "pointerdown",
    (e) => {
      const el = e.target;
      if (!(el instanceof Element)) return;
      if (el.closest(".sc-drawer [data-close]")) {
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        closeDrawer();
      }
    },
    true
  );

  /* =========================================================
   ✅ STYLE SETTINGS (unchanged)
  ========================================================= */
  const applyCartDrawerStyleSettings = (style) => {
    const r = document.documentElement.style;

    const parsePositiveNumber = (value, fallback) => {
      const n = Number(value);
      return Number.isFinite(n) && n > 0 ? n : fallback;
    };

    const baseFontSize = parsePositiveNumber(style?.base, 14);
    const headingScaleValue = parsePositiveNumber(style?.headingScale, 1.2);
    const headingFontSize = Math.max(
      8,
      Number((baseFontSize * headingScaleValue).toFixed(2))
    );
    const buttonFontSize = Math.max(9, Number((baseFontSize * 1.1).toFixed(2)));
    const smallFontSize = Math.max(7, Number((baseFontSize * 0.85).toFixed(2)));

    r.setProperty("--sc-base-font-size", `${baseFontSize}px`);
    r.setProperty("--sc-heading-scale", `${headingScaleValue}`);
    r.setProperty("--sc-heading-font-size", `${headingFontSize}px`);
    r.setProperty("--sc-button-font-size", `${buttonFontSize}px`);
    r.setProperty("--sc-small-font-size", `${smallFontSize}px`);

    const defaults = {
      baseBg:
        "linear-gradient(180deg, rgba(17,24,39,1) 0%, rgba(17,24,39,.92) 35%, rgba(255,255,255,1) 100%)",
      topText: "#ffffff",
      headerText: "#ffffff",
      drawerText: "#111827",
      border: "#e5e7eb",
      muted: "#6b7280",
      progress: "#57c011",
      checkoutBg: "#f3c77a",
      checkoutText: "#111827",

      footerBg: "var(--sc-drawer-bg)",
      applyBtnBg: "#ffffff",
      applyBtnText: "#111827",
      applyBtnBorder: "rgba(17,24,39,.25)",
      subtotalBg: "#ffffff",
      subtotalText: "#111827",
      subtotalLabel: "#6b7280",
    };

    const mode = String(
      pick(style, ["cartDrawerBackgroundMode", "drawerBgMode", "bgMode"], "color")
    )
      .trim()
      .toLowerCase();

    const baseBg = pickBackground(
      style,
      ["cartDrawerBackground", "cartDrawerBg", "drawerTopBg", "topBg", "baseBg", "bg"],
      defaults.baseBg
    );

    let topTextColor = pickColor(
      style,
      ["cartDrawerTextColor", "topText", "top_text", "topTextColor", "textTop"],
      defaults.topText
    );

    let headerColor = pickColor(
      style,
      ["cartDrawerHeaderColor", "headerText", "header_text", "headerColor", "titleColor"],
      defaults.headerText
    );

    const drawerTextColor = pickColor(
      style,
      ["drawerTextColor", "cartDrawerBodyTextColor", "bodyTextColor", "text", "textColor"],
      defaults.drawerText
    );

    const borderColor = pickColor(
      style,
      ["border", "borderColor", "drawerBorder", "cartDrawerBorderColor"],
      defaults.border
    );

    const mutedColor = pickColor(
      style,
      ["muted", "mutedColor", "secondaryText", "subTextColor"],
      defaults.muted
    );

    const progressFill = pickColor(
      style,
      ["progress", "progressColor", "progressFill", "milestoneFill"],
      defaults.progress
    );
    const freeTagColor = pickColor(
      style,
      ["freeTagColor", "freeProductTextColor", "freeTextColor", "rewardTextColor"],
      progressFill
    );
    const freeTagFontSize = normalizeLen(
      pick(
        style,
        ["freeTagFontSize", "freeProductTextSize", "freeProductFontSize", "rewardTextSize"],
        null
      ),
      "var(--sc-small-font-size)"
    );

    const progressBg = pickBackground(style, ["progressBg", "progressBackground", "bg"], baseBg);

    const drawerWidth = normalizeLen(
      pick(style, ["cartDrawerWidth", "drawerWidth", "width"], null),
      "min(450px,92vw)"
    );
    const milestoneWidth = pick(
      style,
      ["milestoneWidth", "cartMilestoneWidth", "progressWidth"],
      "min(420px, 92vw)"
    );

    const dotSize = normalizeLen(pick(style, ["dotSize", "milestoneDot", "dot"], null), "28px");
    const trackH = normalizeLen(pick(style, ["trackHeight", "milestoneTrackHeight"], null), "8px");

    const radius = pickNum(style, ["radius", "drawerRadius", "borderRadius"], 14);
    const btnRadius = pickNum(style, ["buttonRadius", "btnRadius"], 12);

    const overlayBg = pick(style, ["overlayBg", "overlay", "overlayBackground"], "rgba(0,0,0,.45)");

    const qtyBtnBg = pickColor(style, ["qtyBtnBg", "qtyButtonBg"], "#fff");
    const qtyBtnBorder = pickColor(style, ["qtyBtnBorder", "qtyButtonBorder"], borderColor);
    const qtyBtnText = pickColor(style, ["qtyBtnText", "qtyButtonText"], "#111827");

    const qtyInputBg = pickColor(style, ["qtyInputBg", "qtyFieldBg"], "#fff");
    const qtyInputBorder = pickColor(style, ["qtyInputBorder", "qtyFieldBorder"], borderColor);
    const qtyInputText = pickColor(style, ["qtyInputText", "qtyFieldText"], "#111827");

    const inputBg = pickColor(style, ["inputBg", "fieldBg", "discountInputBg"], "#fff");
    const inputBorder = pickColor(style, ["inputBorder", "fieldBorder", "discountInputBorder"], borderColor);
    const inputText = pickColor(style, ["inputText", "fieldText", "discountInputText"], "#111827");
    const inputPlaceholder = pickColor(style, ["inputPlaceholder", "placeholderColor"], "#9ca3af");

    const checkoutBg = pickColor(
      style,
      ["buttonColor", "checkoutBg", "checkoutBackground", "buttonBg"],
      defaults.checkoutBg
    );
    const checkoutText = pickColor(style, ["checkoutText", "checkoutTextColor", "buttonText"], defaults.checkoutText);

    const badgeBg = pick(style, ["badgeBg", "countBadgeBg"], "rgba(17,24,39,.1)");
    const badgeText = pickColor(style, ["badgeText", "countBadgeText"], checkoutText);

    const closeBg = pick(style, ["closeBg", "closeButtonBg"], "transparent");
    const closeBorder = pickColor(style, ["closeBorder", "closeButtonBorder"], borderColor);
    const closeText = pickColor(style, ["closeText", "closeButtonText"], drawerTextColor);

    const footerBg = pickBackground(
      style,
      ["footerBg", "cartDrawerFooterBg", "drawerFooterBg"],
      defaults.footerBg
    );

    const applyBtnBg = pickColor(style, ["applyBtnBg", "discountApplyBg", "applyButtonBg"], defaults.applyBtnBg);
    const applyBtnText = pickColor(style, ["applyBtnText", "discountApplyText", "applyButtonText"], defaults.applyBtnText);
    const applyBtnBorder = pickColor(style, ["applyBtnBorder", "discountApplyBorder", "applyButtonBorder"], defaults.applyBtnBorder);

    const subtotalBg = pickColor(style, ["subtotalBg", "totalBoxBg", "subtotalBoxBg"], defaults.subtotalBg);
    const subtotalText = pickColor(style, ["subtotalText", "totalText", "subtotalValueColor"], defaults.subtotalText);
    const subtotalLabel = pickColor(style, ["subtotalLabel", "totalLabel", "subtotalLabelColor"], defaults.subtotalLabel);

    const celebrateBackdrop = pickBackground(
      style,
      ["celebrateBackdrop", "popupBackdrop", "congratsBackdrop", "rewardPopupBackdrop"],
      "rgba(17,24,39,.25)"
    );
    const celebrateBg = pickBackground(
      style,
      ["celebrateBg", "popupBg", "congratsBg", "rewardPopupBg"],
      "#ffffff"
    );
    const celebrateBorder = pickColor(
      style,
      ["celebrateBorder", "popupBorder", "congratsBorder", "rewardPopupBorder"],
      "rgba(0,0,0,.08)"
    );
    const celebrateBadgeBg = pickBackground(
      style,
      ["celebrateBadgeBg", "popupBadgeBg", "congratsBadgeBg", "rewardPopupBadgeBg"],
      "rgba(87,192,17,.14)"
    );
    const celebrateTitleColor = pickColor(
      style,
      ["celebrateTitleColor", "popupTitleColor", "congratsTitleColor", "rewardPopupTitleColor"],
      "#111827"
    );
    const celebrateTextColor = pickColor(
      style,
      ["celebrateTextColor", "popupTextColor", "congratsTextColor", "rewardPopupTextColor"],
      "#6b7280"
    );
    const celebrateTitleSize = normalizeLen(
      pick(style, ["celebrateTitleSize", "popupTitleSize", "congratsTitleSize"], null),
      "var(--sc-heading-font-size)"
    );
    const celebrateTextSize = normalizeLen(
      pick(style, ["celebrateTextSize", "popupTextSize", "congratsTextSize"], null),
      "var(--sc-small-font-size)"
    );

    if (!isValidCssColor(topTextColor)) topTextColor = defaults.topText;
    if (!isValidCssColor(headerColor)) headerColor = defaults.headerText;

    r.setProperty("--sc-overlay-bg", overlayBg);
    r.setProperty("--sc-drawer-width", drawerWidth);

    r.setProperty("--sc-border", borderColor);
    r.setProperty("--sc-muted", mutedColor);

    r.setProperty("--sc-text", topTextColor);
    r.setProperty("--sc-drawer-header-color", headerColor);
    r.setProperty("--sc-drawer-text-color", drawerTextColor);

    r.setProperty("--sc-progress", progressFill);
    r.setProperty("--sc-free-tag-color", freeTagColor);
    r.setProperty("--sc-free-tag-font-size", freeTagFontSize);
    r.setProperty("--sc-progress-bg", progressBg);
    r.setProperty("--sc-progress-text", topTextColor);

    r.setProperty("--sc-radius", `${radius}px`);
    r.setProperty("--sc-btn-radius", `${btnRadius}px`);

    r.setProperty("--sc-milestone-width", String(milestoneWidth));
    r.setProperty("--sc-dot", dotSize);
    r.setProperty("--sc-track-h", trackH);

    r.setProperty("--sc-qty-btn-bg", qtyBtnBg);
    r.setProperty("--sc-qty-btn-border", qtyBtnBorder);
    r.setProperty("--sc-qty-btn-text", qtyBtnText);
    r.setProperty("--sc-qty-input-bg", qtyInputBg);
    r.setProperty("--sc-qty-input-border", qtyInputBorder);
    r.setProperty("--sc-qty-input-text", qtyInputText);

    r.setProperty("--sc-input-bg", inputBg);
    r.setProperty("--sc-input-border", inputBorder);
    r.setProperty("--sc-input-text", inputText);
    r.setProperty("--sc-input-placeholder", inputPlaceholder);

    r.setProperty("--sc-checkout-bg", checkoutBg);
    r.setProperty("--sc-checkout-text", checkoutText);
    r.setProperty("--sc-badge-bg", String(badgeBg));
    r.setProperty("--sc-badge-text", badgeText);

    r.setProperty("--sc-close-bg", String(closeBg));
    r.setProperty("--sc-close-border", closeBorder);
    r.setProperty("--sc-close-text", closeText);

    r.setProperty("--sc-footer-bg", String(footerBg));
    r.setProperty("--sc-apply-bg", applyBtnBg);
    r.setProperty("--sc-apply-text", applyBtnText);
    r.setProperty("--sc-apply-border", applyBtnBorder);
    r.setProperty("--sc-subtotal-bg", subtotalBg);
    r.setProperty("--sc-subtotal-text", subtotalText);
    r.setProperty("--sc-subtotal-label", subtotalLabel);

    // reward popup colors
    r.setProperty("--sc-freegift-text", drawerTextColor);
    r.setProperty("--sc-freegift-subtext", mutedColor);
    r.setProperty("--sc-freegift-btn-bg", progressFill);
    r.setProperty("--sc-freegift-btn-text", topTextColor);
    r.setProperty("--sc-celebrate-backdrop", String(celebrateBackdrop));
    r.setProperty("--sc-celebrate-bg", String(celebrateBg));
    r.setProperty("--sc-celebrate-border", celebrateBorder);
    r.setProperty("--sc-celebrate-badge-bg", String(celebrateBadgeBg));
    r.setProperty("--sc-celebrate-title-color", celebrateTitleColor);
    r.setProperty("--sc-celebrate-text-color", celebrateTextColor);
    r.setProperty("--sc-celebrate-title-size", celebrateTitleSize);
    r.setProperty("--sc-celebrate-text-size", celebrateTextSize);

    const checkoutLabelText = trimToNull(style?.checkoutButtonText) || "Checkout";
    const checkoutLabelEl = drawer.querySelector(".sc-checkout-label");
    if (checkoutLabelEl) checkoutLabelEl.textContent = checkoutLabelText;

    if (mode === "image") {
      const rawImage =
        pick(style, ["cartDrawerBackground", "cartDrawerImage", "drawerImage", "topBgImage"], null) || "";
      const imgUrl =
        /^url\(/i.test(String(rawImage)) ? String(rawImage) : buildCssUrl(rawImage);

      if (imgUrl) {
        r.setProperty("--sc-top-bg-image", `linear-gradient(rgba(0,0,0,.45), rgba(0,0,0,.45)), ${imgUrl}`);
      } else {
        r.setProperty("--sc-top-bg-image", "none");
      }
      r.setProperty("--sc-top-bg-color", "transparent");
      r.setProperty("--sc-top-bg-color-effective", "transparent");
      r.setProperty("--sc-top-bg-image-effective", "var(--sc-top-bg-image)");

      const drawerBg = pickBackground(style, ["drawerBg", "cartDrawerBodyBg", "bodyBg"], null);
      r.setProperty("--sc-drawer-bg", drawerBg || (imgUrl ? imgUrl : "transparent"));
    } else {
      const isGradient =
        mode === "gradient" ? true : /gradient\(/i.test(String(baseBg));

      if (isGradient) {
        r.setProperty("--sc-top-bg-color", "transparent");
        r.setProperty("--sc-top-bg-image", String(baseBg));
        r.setProperty("--sc-top-bg-color-effective", "transparent");
        r.setProperty("--sc-top-bg-image-effective", "var(--sc-top-bg-image)");
      } else {
        r.setProperty("--sc-top-bg-color", String(baseBg));
        r.setProperty("--sc-top-bg-image", "none");
        r.setProperty("--sc-top-bg-color-effective", "var(--sc-top-bg-color)");
        r.setProperty("--sc-top-bg-image-effective", "none");
      }

      const drawerBg = pickBackground(style, ["drawerBg", "cartDrawerBodyBg", "bodyBg"], null);
      r.setProperty(
        "--sc-drawer-bg",
        drawerBg ||
        (isGradient
          ? String(baseBg)
          : `linear-gradient(180deg, ${String(baseBg)} 0%, #e4e3e3ff 85%)`)
      );
    }
  };

  const updateDiscountPanelVisibility = (enabled) => {
    if (!drawerDiscountPanel) return;
    drawerDiscountPanel.hidden = !enabled;
    if (!enabled && discountInput) discountInput.value = "";
  };

  const applyDiscountCode = () => {
    if (!discountInput || !drawerDiscountPanel || drawerDiscountPanel.hidden) return;
    const code = trimToNull(discountInput.value);
    if (!code) return;

    try {
      sessionStorage.setItem("__SC_LAST_APPLIED_CODE__", code);
    } catch { }

    const currentPath = `${window.location.pathname}${window.location.search}` || "/";
    const target = `/discount/${encodeURIComponent(code)}?redirect=${encodeURIComponent(currentPath)}`;
    window.location.href = target;
  };

  const applyStyleSettings = (s) => {
    const r = document.documentElement.style;
    if (s?.font) r.setProperty("--sc-font", s.font);
    if (s?.milestoneWidth) r.setProperty("--sc-milestone-width", String(s.milestoneWidth));

    applyCartDrawerStyleSettings(s || {});
    updateDiscountPanelVisibility(to01(s?.discountCodeApply) === 1);
  };

  if (discountButton) discountButton.addEventListener("click", applyDiscountCode);
  if (discountInput) {
    discountInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        applyDiscountCode();
      }
    });
  }

  const renderFallback = (msg) => {
    const items = $(".sc-items");
    if (items) items.innerHTML = `<div class="sc-empty">${safe(msg || "Loading…")}</div>`;

    const label = $(".sc-label");
    if (label) label.textContent = safe(msg || "Milestones unavailable");

    const fill = $(".sc-fill");
    if (fill) fill.style.width = "0%";

    const dots = $(".sc-dots");
    if (dots) dots.innerHTML = "";

    const legends = $(".sc-legends");
    if (legends) legends.innerHTML = "";

    setAnnouncementMessages([]);

    document.documentElement.style.removeProperty("--sc-stepcount");
    LAST_DONE = 0;
    LAST_BXGY_DONE = false;
    __SC_PRIMED_POPUPS__ = false;
  };

  /* =========================================================
   ✅ BUILD STEPS + capture tables for announcement
  ========================================================= */
  const buildSteps = () => {
    const assignment = {};
    const subtotalCents = Number(CART?.items_subtotal_price || 0);
    const subtotalRupees = subtotalCents / 100;

    CODE_DISCOUNT_RULES = [];
    BXGY_RULES = [];
    BUYXGETY_RULES = [];

    const shippingList = getProxyArray(PROXY, ["shippingRules", "shippingRule", "shippingrule"]);
    const discountList = getProxyArray(PROXY, ["discountRules", "discountRule", "discountrule"]);
    const freeList = getProxyArray(PROXY, ["freeGiftRules", "freeGiftRule", "freegiftrule"]);

    const buyxgetyList = getProxyArray(PROXY, [
      "buyxgetyRules",
      "buyxgetyRule",
      "buyxgetyrule",
      "buyXGetYRules",
      "bxgyrule",
      "bxgyRules",
      "bxgyRule",
    ]);

    const normType = (r) => String(r?.type ?? r?.ruleType ?? r?.rule_type ?? "").trim().toLowerCase();

    (Array.isArray(discountList) ? discountList : []).forEach((r) => {
      if (!isRuleEnabled(r)) return;
      const t = normType(r);
      if (t === "code") CODE_DISCOUNT_RULES.push(r);
    });

    (Array.isArray(discountList) ? discountList : []).forEach((r) => {
      if (!isRuleEnabled(r)) return;
      const t = normType(r);
      const hasMsgs = trimToNull(r?.beforeOfferUnlockMessage) || trimToNull(r?.afterOfferUnlockMessage);
      const looksLikeBxgy = t === "bxgy" || t === "buyxgety" || hasMsgs;
      if (looksLikeBxgy) BXGY_RULES.push(r);
    });

    (Array.isArray(buyxgetyList) ? buyxgetyList : []).forEach((r) => {
      if (!isRuleEnabled(r)) return;
      BUYXGETY_RULES.push(r);
    });

    (Array.isArray(discountList) ? discountList : []).forEach((r) => {
      if (!isRuleEnabled(r)) return;
      const t = normType(r);

      const hasX = Number(r?.xQty ?? r?.x_qty ?? r?.x ?? r?.buyQty ?? r?.buy_qty ?? r?.buy ?? 0) > 0;
      const hasY = Number(r?.yQty ?? r?.y_qty ?? r?.y ?? r?.getQty ?? r?.get_qty ?? r?.get ?? 0) > 0;
      const hasScope = !!trimToNull(r?.scope || r?.scopeName);

      if (t === "buyxgety" || (hasX && hasY && hasScope)) {
        BUYXGETY_RULES.push(r);
      }
    });

    const pushRule = (type, rule) => {
      if (!rule) return;
      if (!isRuleEnabled(rule)) return;

      // Filter discount step rules: ONLY automatic (exclude code & bxgy)
      if (type === "discount") {
        const t = normType(rule);
        const isAutomatic = !t || t === "automatic";
        if (!isAutomatic) return;
      }

      const slot = normalizeStepSlotFromAny(rule);
      if (!slot) return;

      const belowRaw = trimToNull(getProgressBelow(rule));

      const title =
        trimToNull(rule?.cartStepName) ||
        trimToNull(rule?.campaignName) ||
        belowRaw ||
        (type === "shipping" ? "Shipping" : type === "discount" ? "Discount" : "Free Product");

      const goalRupees = getGoalRupees(type, rule);
      const unlockCents = goalToCents(goalRupees);

      const iconKey =
        pickIconKeyFromRule(rule) ||
        (type === "shipping" ? "shipping" : type === "discount" ? "discount" : "free");
      const icon = ICONS[String(iconKey)] || ICONS.sparkles;

      const beforeRaw = trimToNull(getProgressBefore(rule)) || "";
      const afterRaw = trimToNull(getProgressAfter(rule)) || "";

      assignment[slot] = {
        slot,
        type,
        rule,
        unlockCents,
        icon,
        title,

        progressTextBelow: replaceProgressText({
          text: belowRaw || title,
          type,
          rule,
          subtotalRupees,
          useRemainingForGoal: false,
        }),

        progressTextBefore: replaceProgressText({
          text: beforeRaw,
          type,
          rule,
          subtotalRupees,
          useRemainingForGoal: true,
        }),

        progressTextAfter: replaceProgressText({
          text: afterRaw,
          type,
          rule,
          subtotalRupees,
          useRemainingForGoal: false,
        }),
      };
    };

    (Array.isArray(shippingList) ? shippingList : []).forEach((r) => pushRule("shipping", r));
    (Array.isArray(discountList) ? discountList : []).forEach((r) => pushRule("discount", r));
    (Array.isArray(freeList) ? freeList : []).forEach((r) => pushRule("free", r));

    const steps = STEP_SLOTS.map((s) => assignment[s]).filter(Boolean);

    return steps;
  };

  /* =========================================================
   ✅ RENDER CART (unchanged, BuyXGetY item will now appear due to auto-add)
  ========================================================= */
  function renderCart() {
    const itemsWrap = $(".sc-items");
    if (!itemsWrap) return;

    const items = Array.isArray(CART?.items) ? CART.items : [];
    console.log("[SmartCartify] cart items:", items);
    const currency = CART?.currency || "INR";

    const subtotalEl = $("[data-subtotal]");
    const subtotalCents = items.reduce((sum, it) => {
      const lineAmount = Number(it?.final_line_price) || 0;
      return sum + Math.max(0, lineAmount);
    }, 0);
    if (subtotalEl) subtotalEl.textContent = formatMoney(subtotalCents, currency);

    const countEl = $("[data-count]");
    if (countEl) countEl.textContent = String(CART?.item_count || 0);

    if (!items.length) {
      itemsWrap.innerHTML = `<div class="sc-empty">
        <svg viewBox="0 0 255 255" fill="rgb(230,230,235)" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M13.6359 0C6.10501 0 0 6.10663 0 13.6395C0 21.1724 6.10501 27.2791 13.6359 27.2791H20.7503C28.3315 27.2791 34.7667 32.1872 37.0532 39H37.0444V148.047C37.0444 161.802 48.1927 172.953 61.9448 172.953H208.092C220.391 172.953 231.168 164.72 234.404 152.851L253.6 88.4363C260.387 63.5385 241.649 39 215.849 39H64.8815C62.1832 17.02 43.4539 0 20.7503 0H13.6359ZM116.139 227.5C116.139 242.688 103.588 255 88.1056 255C72.6231 255 60.072 242.688 60.072 227.5C60.072 212.312 72.6231 200 88.1056 200C103.588 200 116.139 212.312 116.139 227.5ZM186.724 255C201.93 255 214.257 242.688 214.257 227.5C214.257 212.312 201.93 200 186.724 200C171.518 200 159.191 212.312 159.191 227.5C159.191 242.688 171.518 255 186.724 255Z"></path>
        </svg>
        <div class="sc-empty-text">No items in the cart</div>
      </div>
      <div class="sc-upsell" hidden></div>`;
      renderUpsellSection();
      return;
    }

    const existingUpsell = itemsWrap.querySelector(".sc-upsell");
    itemsWrap.innerHTML = items
      .map((it, idx) => {
        const line = idx + 1;
        const img = it.image ? `<img src="${it.image}" alt="${safe(it.product_title)}" loading="lazy">` : "";

        const qty = Number(it.quantity) || 0;
        const finalLine = Number(it?.final_line_price) || 0;

        const props = it.properties || {};
        const isFreeGift = String(props?.[FREE_GIFT_PROPERTY] || "").trim().toLowerCase() === "true";
        const isBxgyGift = String(props?.[BXGY_GIFT_PROPERTY] || "").trim().toLowerCase() === "true";
        const isReward = isFreeGift || isBxgyGift;

        const compareUnit = Number(it.compare_at_price) || Number(it.original_price) || Number(it.price) || 0;
        const compareLine = Math.max(0, compareUnit * qty);
        const hasCompare = compareLine > 0 && !isReward;

        const displayPrice = isBxgyGift ? 0 : Math.max(0, finalLine);
        const priceText = formatMoney(displayPrice, currency);
        const priceClass = `sc-price${displayPrice === 0 ? " sc-price-free" : ""}`;
        const freeTag = isReward ? `<span class="sc-free-tag">${isFreeGift ? "" : "Offer product"}</span>` : "";

        const productUrl = trimToNull(it.url) || null;
        const nameHtml = productUrl ? `<a href="${safe(productUrl)}">${safe(it.product_title)}</a>` : `${safe(it.product_title)}`;

        return `
          <div class="sc-item" data-line="${line}">
            <div class="sc-img">${img}</div>

            <div class="sc-mid">
              <p class="sc-name" title="${safe(it.product_title)}">${nameHtml}</p>

              <div class="sc-qty">
                <button type="button" data-qty="dec" aria-label="Decrease">−</button>
                <input type="number" min="0" inputmode="numeric" value="${qty}" data-qty="input" />
                <button type="button" data-qty="inc" aria-label="Increase">+</button>
              </div>
            </div>

            <div class="sc-pricebox">
              ${hasCompare ? `<span class="sc-compare">${formatMoney(compareLine, currency)}</span>` : ``}
              <span class="${priceClass}">${priceText}</span>
              ${freeTag}
            </div>

            <button type="button" class="sc-remove-x" data-remove="1" aria-label="Remove">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
                <path fill-rule="evenodd" clip-rule="evenodd"
                  d="M5.29289 5.29289C5.68342 4.90237 6.31658 4.90237 6.70711 5.29289L12 10.5858L17.2929 5.29289C17.6834 4.90237 18.3166 4.90237 18.7071 5.29289C19.0976 5.68342 19.0976 6.31658 18.7071 6.70711L13.4142 12L18.7071 17.2929C19.0976 17.6834 19.0976 18.3166 18.7071 18.7071C18.3166 19.0976 17.6834 19.0976 17.2929 18.7071L12 13.4142L6.70711 18.7071C6.31658 19.0976 5.68342 19.0976 5.29289 18.7071C4.90237 18.3166 4.90237 17.68342 5.29289 17.2929L10.5858 12L5.29289 6.70711C4.90237 6.31658 4.90237 5.29289 5.29289 5.29289Z"/>
              </svg>
            </button>
          </div>
        `;
      })
      .join("");

    if (existingUpsell) {
      itemsWrap.appendChild(existingUpsell);
    } else {
      const upsell = document.createElement("div");
      upsell.className = "sc-upsell";
      upsell.hidden = true;
      itemsWrap.appendChild(upsell);
    }

    renderUpsellSection();
  }

  /* =========================================================
   ✅ REWARD POPUP + AUTO ADD SUPPORT
  ========================================================= */
  let rewardPopupCache = null;
  let rewardPopupTimer = null;

  const addRewardToCart = async ({ kind, rule, ruleKey, slot, variant, qty, markAutoAdded }) => {
    const legacyId = getVariantLegacyId(variant);
    if (!legacyId) return false;

    const guardKey = kind === "free" ? slot || ruleKey : ruleKey;
    if (guardKey && cartHasRewardForKey(kind, guardKey)) return false;

    try {
      setProgressLoading(true);

      const body = new URLSearchParams();
      body.set("id", legacyId);
      body.set("quantity", String(Math.max(1, Number(qty || 1))));

      if (kind === "free") {
        body.set(`properties[${FREE_GIFT_PROPERTY}]`, "true");
        if (slot) body.set(`properties[${FREE_GIFT_RULE_PROPERTY}]`, String(slot));
        if (variant?.id) body.set(`properties[${FREE_GIFT_VARIANT_PROPERTY}]`, String(variant.id));
        const freeRuleKey = getRuleKey(rule, "free");
        if (freeRuleKey) body.set(`properties[${FREE_GIFT_RULE_KEY_PROPERTY}]`, freeRuleKey);
      } else {
        body.set(`properties[${BXGY_GIFT_PROPERTY}]`, "true");
        body.set(`properties[${BXGY_GIFT_KIND_PROPERTY}]`, String(kind || "bxgy"));
        if (ruleKey) body.set(`properties[${BXGY_GIFT_RULE_PROPERTY}]`, String(ruleKey));
        if (variant?.id) body.set(`properties[${BXGY_GIFT_VARIANT_PROPERTY}]`, String(variant.id));
      }

      const res = await fetch("/cart/add.js", {
        method: "POST",
        headers: { Accept: "application/json" },
        credentials: "same-origin",
        body,
      });

      if (!res.ok) throw new Error("Reward add failed");

      if (markAutoAdded && guardKey) scStore.set(keyAutoAdded(kind, guardKey), "1");

      await refreshFromNetwork();
      return true;
    } catch (err) {
      console.error("[SmartCartify] reward add failed:", err);
      return false;
    } finally {
      setProgressLoading(false);
    }
  };

  const closeRewardPopup = () => {
    if (!rewardPopupCache) return;
    if (rewardPopupTimer) {
      clearTimeout(rewardPopupTimer);
      rewardPopupTimer = null;
    }
    rewardPopupCache.overlay.classList.remove("open");
    rewardPopupCache.current = null;
  };

  const getVariantLegacyId = (variant) => {
    if (!variant) return null;
    const legacy = trimToNull(variant.legacyResourceId);
    if (legacy) return legacy;
    const gid = trimToNull(variant.id);
    if (!gid) return null;
    const match = gid.match(/\/(\d+)$/);
    return match ? match[1] : null;
  };

  const getRewardVariantFromRule = (kind, rule) => {
    if (kind === "free") {
      return (
        rule?.bonusProductVariant ||
        rule?.freeProductVariant ||
        rule?.giftProductVariant ||
        rule?.rewardVariant ||
        null
      );
    }
    return (
      rule?.bonusProductVariant ||
      rule?.yProductVariant ||
      rule?.getProductVariant ||
      rule?.giftProductVariant ||
      rule?.freeProductVariant ||
      rule?.rewardVariant ||
      rule?.variant ||
      rule?.productVariant ||
      rule?.freeVariant ||
      null
    );
  };

  const getRewardQtyFromRule = (kind, rule) => {
    const raw =
      rule?.qty ??
      rule?.quantity ??
      rule?.freeQty ??
      rule?.free_qty ??
      rule?.yQty ??
      rule?.y_qty ??
      rule?.getQty ??
      rule?.get_qty ??
      1;
    const n = Number(raw);
    return Math.max(1, Number.isFinite(n) ? n : 1);
  };

  const ensureRewardPopup = () => {
    if (rewardPopupCache) return rewardPopupCache;

    const overlayEl = document.createElement("div");
    overlayEl.className = "sc-freegift-overlay";
    overlayEl.innerHTML = `
      <div class="sc-freegift-card">
        <div class="sc-freegift-header">
          <div class="sc-freegift-icon">🎁</div>
          <div>
            <p class="sc-freegift-title-text">Reward unlocked</p>
          </div>
        </div>
        <div class="sc-freegift-content">
          <div class="sc-freegift-image-wrap">
            <img class="sc-freegift-image" alt="Reward product" />
          </div>
          <div>
            <p class="sc-freegift-product-title"></p>
            <p class="sc-freegift-product-sub"></p>
          </div>
        </div>
        <button class="sc-freegift-add" type="button">Add</button>
      </div>
    `;

    drawer.appendChild(overlayEl);

    const closeBtn = overlayEl.querySelector(".sc-freegift-close");
    const addBtn = overlayEl.querySelector(".sc-freegift-add");

    overlayEl.addEventListener("click", (event) => {
      if (event.target === overlayEl) closeRewardPopup();
    });
    if (closeBtn) closeBtn.addEventListener("click", closeRewardPopup);

    rewardPopupCache = {
      overlay: overlayEl,
      addButton: addBtn,
      imageEl: overlayEl.querySelector(".sc-freegift-image"),
      titleEl: overlayEl.querySelector(".sc-freegift-product-title"),
      subtitleEl: overlayEl.querySelector(".sc-freegift-product-sub"),
      ruleTitleEl: overlayEl.querySelector(".sc-freegift-rule-title"),
      headerTitleEl: overlayEl.querySelector(".sc-freegift-title-text"),
      headerSubEl: overlayEl.querySelector(".sc-freegift-subtext"),
      iconEl: overlayEl.querySelector(".sc-freegift-icon"),
      current: null,
    };

    if (addBtn) {
      addBtn.addEventListener("click", async () => {
        if (!rewardPopupCache?.current) return;
        const cur = rewardPopupCache.current;
        addBtn.disabled = true;

        try {
          const ok = await addRewardToCart({
            kind: cur.kind,
            rule: cur.rule,
            ruleKey: cur.ruleKey,
            slot: cur.slot,
            variant: cur.variant,
            qty: cur.qty,
            markAutoAdded: false,
          });
          if (!ok) throw new Error("Reward add failed");
          closeRewardPopup();
        } catch (err) {
          console.error("[SmartCartify] reward add failed:", err);
          showCenterCelebratePopup("Reward", "Could not add the product. Please try again.", 4000);
        } finally {
          addBtn.disabled = false;
        }
      });
    }

    return rewardPopupCache;
  };

  const cartHasRewardForKey = (kind, keyOrSlot) => {
    const items = Array.isArray(CART?.items) ? CART.items : [];
    for (const it of items) {
      const p = it?.properties || {};
      if (kind === "free") {
        const isFree = String(p?.[FREE_GIFT_PROPERTY] || "").trim().toLowerCase() === "true";
        if (!isFree) continue;
        const slot = String(p?.[FREE_GIFT_RULE_PROPERTY] || "").trim();
        const ruleKey = String(p?.[FREE_GIFT_RULE_KEY_PROPERTY] || "").trim();
        if (keyOrSlot && (String(keyOrSlot) === slot || String(keyOrSlot) === ruleKey)) return true;
      } else {
        const isBxgy = String(p?.[BXGY_GIFT_PROPERTY] || "").trim().toLowerCase() === "true";
        if (!isBxgy) continue;
        const ruleKey = String(p?.[BXGY_GIFT_RULE_PROPERTY] || "").trim();
        if (ruleKey && keyOrSlot && String(keyOrSlot) === ruleKey) return true;
      }
    }
    return false;
  };

  // ✅ FIX-2: Don't repeat popup after refresh (sessionStorage shown flag)
  const canShowPopupFor = (kind, guardKey) => {
    if (!guardKey) return true;
    return !trimToNull(scStore.get(keyShown(kind, guardKey)));
  };
  const markPopupShown = (kind, guardKey) => {
    if (!guardKey) return;
    scStore.set(keyShown(kind, guardKey), "1");
  };
  const clearPopupShown = (kind, guardKey) => {
    if (!guardKey) return;
    scStore.del(keyShown(kind, guardKey));
  };

  const openRewardPopupFor = ({ kind, rule, ruleKey, slot, title }) => {
    const variant = getRewardVariantFromRule(kind, rule);
    if (!variant) return false;

    const legacyId = getVariantLegacyId(variant);
    if (!legacyId) return false;

    const guardKey = kind === "free" ? slot || ruleKey : ruleKey;

    // already shown in this session storage (page refresh safe)
    if (guardKey && !canShowPopupFor(kind, guardKey)) return false;

    if (guardKey && drawer.__sc_reward_popup_for === `${kind}:${guardKey}`) return false;

    if (guardKey && cartHasRewardForKey(kind, guardKey)) return false;

    if (!drawer.classList.contains("open")) openDrawer();

    const state = ensureRewardPopup();
    const qty = getRewardQtyFromRule(kind, rule);
    const currency = CART?.currency || "INR";

    if (state.iconEl) state.iconEl.textContent = kind === "free" ? "🎁" : "🔥";
    if (state.headerTitleEl) state.headerTitleEl.textContent = kind === "free" ? "Free product unlocked" : "Offer product unlocked";
    if (state.headerSubEl) {
      state.headerSubEl.textContent =
        kind === "free" ? "Adding to cart..." : "Click Add to add it in your cart";
    }

    const imageUrl = variant.image || variant.product?.image || "";
    if (state.imageEl) {
      if (imageUrl) {
        state.imageEl.src = imageUrl;
        state.imageEl.style.display = "";
      } else {
        state.imageEl.removeAttribute("src");
        state.imageEl.style.display = "none";
      }
    }

    const productHeading =
      trimToNull(variant?.product?.title) ||
      trimToNull(variant?.product?.name) ||
      trimToNull(variant?.productTitle) ||
      trimToNull(rule?.productTitle) ||
      trimToNull(rule?.productName);

    const variantHeading =
      trimToNull(variant?.title) ||
      trimToNull(variant?.name) ||
      trimToNull(variant?.displayName) ||
      trimToNull(variant?.variantTitle);

    const fallbackRuleName =
      trimToNull(rule?.rewardTitle) ||
      trimToNull(rule?.rewardName) ||
      trimToNull(rule?.title) ||
      trimToNull(rule?.name) ||
      "";

    const finalNameParts = [];
    if (productHeading) finalNameParts.push(productHeading);
    if (variantHeading && variantHeading !== productHeading) finalNameParts.push(variantHeading);
    if (!finalNameParts.length && fallbackRuleName) finalNameParts.push(fallbackRuleName);

    const productName = finalNameParts.length > 0 ? finalNameParts.join(" – ") : "Reward product";
    if (state.titleEl) state.titleEl.textContent = productName;

    if (state.subtitleEl) state.subtitleEl.textContent = `${formatMoney(0, currency)} (Free)`;

    const ruleName =
      trimToNull(title) ||
      trimToNull(rule?.cartStepName) ||
      trimToNull(rule?.campaignName) ||
      "Reward";
    if (state.ruleTitleEl) state.ruleTitleEl.textContent = ruleName;

    if (state.addButton) state.addButton.textContent = `Add Item${qty > 1 ? ` (${qty})` : ""}`;

    state.current = { kind, ruleKey, slot, rule, variant, qty };
    state.overlay.classList.add("open");

    drawer.__sc_reward_popup_for = `${kind}:${guardKey || ""}`;

    // mark as shown so refresh/open doesn't repeat
    if (guardKey) markPopupShown(kind, guardKey);

    if (kind === "free" && state.addButton) {
      state.addButton.style.display = "none";
      void autoAddRewardIfNeeded({ kind: "free", rule, ruleKey, slot }).then((added) => {
        if (!state.current || state.current.kind !== "free") return;
        if (state.headerSubEl) {
          state.headerSubEl.textContent = added ? "Added to cart" : "Could not add automatically";
        }
      });
      if (rewardPopupTimer) clearTimeout(rewardPopupTimer);
      rewardPopupTimer = setTimeout(closeRewardPopup, 2000);
    } else if (state.addButton) {
      state.addButton.style.removeProperty("display");
    }

    return true;
  };

  // ✅ FIX-3: AUTO ADD reward when needed (buyxgety/free)
  const autoAddRewardIfNeeded = async ({ kind, rule, ruleKey, slot }) => {
    if (__SC_AUTO_ADDING__) return false;

    const guardKey = kind === "free" ? slot || ruleKey : ruleKey;
    if (!guardKey) return false;

    // Already in cart
    if (cartHasRewardForKey(kind, guardKey)) return true;

    // Already auto-added once (for this eligibility)
    if (trimToNull(scStore.get(keyAutoAdded(kind, guardKey)))) return true;

    const variant = getRewardVariantFromRule(kind, rule);
    if (!variant) return false;

    __SC_AUTO_ADDING__ = true;
    try {
      const ok = await addRewardToCart({
        kind,
        rule,
        ruleKey: ruleKey || guardKey,
        slot,
        variant,
        qty: getRewardQtyFromRule(kind, rule),
        markAutoAdded: true,
      });
      return ok;
    } catch (e) {
      console.error("[SC] autoAddReward failed:", e);
      return false;
    } finally {
      __SC_AUTO_ADDING__ = false;
    }
  };

  /* =========================================================
   ✅ AUTO REMOVE REWARD ITEMS WHEN NOT ELIGIBLE (UNCHANGED)
  ========================================================= */
  let __SC_ENFORCING_REWARDS__ = false;

  const computeBxgyCompleteForRule = (rule) => {
    const subtotalRupees = (Number(CART?.items_subtotal_price || 0) / 100) || 0;
    const cartQty = getCartTotalQty();

    const minPurchase = Number(rule?.minPurchase ?? rule?.min_purchase);
    const xQty = Number(rule?.xQty ?? rule?.x_qty ?? rule?.x ?? rule?.buyQty ?? rule?.buy_qty ?? rule?.buy);

    const hasMin = Number.isFinite(minPurchase) && minPurchase > 0;
    const hasX = Number.isFinite(xQty) && xQty > 0;

    if (hasMin) return subtotalRupees >= minPurchase;
    if (hasX) return cartQty >= xQty;
    return false;
  };

  const computeBuyXGetYCompleteForRule = (rule) => {
    const items = Array.isArray(CART?.items) ? CART.items : [];

    const scope = String(rule?.scope || rule?.scopeName || "store").trim().toLowerCase();

    const appliesTo = rule?.appliesTo || rule?.applyTo || {};
    const applyProducts = Array.isArray(appliesTo?.products) ? appliesTo.products : [];
    const applyCollections = Array.isArray(appliesTo?.collections) ? appliesTo.collections : [];

    let eligibleItems = items;

    if (scope === "product") {
      const allowed = new Set(applyProducts.map(gidToId).filter(Boolean).map(String));
      eligibleItems = items.filter((it) => allowed.has(String(it?.product_id || "")));
    } else if (scope === "collection") {
      const allowedCols = new Set(applyCollections.map(gidToId).filter(Boolean).map(String));
      eligibleItems = items.filter((it) => {
        const props = it?.properties || {};
        const col = props?._sc_collection_id || props?._collection_id || props?.collection_id;
        const id = gidToId(col) || (col ? String(col) : null);
        return id && allowedCols.has(String(id));
      });
    }

    const eligibleQty = eligibleItems.reduce((sum, it) => sum + (Number(it?.quantity) || 0), 0);
    const eligibleSubtotalRupees =
      (eligibleItems.reduce((sum, it) => sum + (Number(it?.final_line_price) || 0), 0) / 100) || 0;

    const minPurchase = Number(rule?.minPurchase ?? rule?.min_purchase);
    const xQty = Number(rule?.xQty ?? rule?.x_qty ?? rule?.x ?? rule?.buyQty ?? rule?.buy_qty ?? rule?.buy);

    const hasMin = Number.isFinite(minPurchase) && minPurchase > 0;
    const hasX = Number.isFinite(xQty) && xQty > 0;

    if ((scope === "product" || scope === "collection") && eligibleQty <= 0) return false;

    if (hasMin) return eligibleSubtotalRupees >= minPurchase;
    if (hasX) return eligibleQty >= xQty;
    return false;
  };

  const enforceRewardValidity = async () => {
    if (__SC_ENFORCING_REWARDS__) return;
    __SC_ENFORCING_REWARDS__ = true;

    try {
      const items = Array.isArray(CART?.items) ? CART.items : [];
      if (!items.length) return;

      const discountList = getProxyArray(PROXY, ["discountRules", "discountRule", "discountrule"]);
      const freeList = getProxyArray(PROXY, ["freeGiftRules", "freeGiftRule", "freegiftrule"]);
      const buyxgetyList = getProxyArray(PROXY, [
        "buyxgetyRules",
        "buyxgetyRule",
        "buyxgetyrule",
        "buyXGetYRules",
        "bxgyrule",
        "bxgyRules",
        "bxgyRule",
      ]);

      const normType = (r) => String(r?.type ?? r?.ruleType ?? r?.rule_type ?? "").trim().toLowerCase();

      const freeBySlot = new Map();
      const freeByRuleKey = new Map();
      (Array.isArray(freeList) ? freeList : []).forEach((r) => {
        if (!isRuleEnabled(r)) return;
        const slot = normalizeStepSlotFromAny(r);
        if (slot) freeBySlot.set(String(slot), r);
        const ruleKey = getRuleKey(r, "free");
        if (ruleKey) freeByRuleKey.set(String(ruleKey), r);
      });

      const bxgyMap = new Map();
      (Array.isArray(discountList) ? discountList : []).forEach((r) => {
        if (!isRuleEnabled(r)) return;
        const t = normType(r);
        const hasMsgs = trimToNull(r?.beforeOfferUnlockMessage) || trimToNull(r?.afterOfferUnlockMessage);
        const looksLikeBxgy = t === "bxgy" || hasMsgs;
        if (!looksLikeBxgy) return;
        const key = getRuleKey(r, "bxgy");
        bxgyMap.set(String(key), { kind: "bxgy", rule: r });
      });

      (Array.isArray(buyxgetyList) ? buyxgetyList : []).forEach((r) => {
        if (!isRuleEnabled(r)) return;
        const key = getRuleKey(r, "buyxgety");
        bxgyMap.set(String(key), { kind: "buyxgety", rule: r });
      });

      (Array.isArray(discountList) ? discountList : []).forEach((r) => {
        if (!isRuleEnabled(r)) return;
        const t = normType(r);
        if (t !== "buyxgety") return;
        const key = getRuleKey(r, "buyxgety");
        bxgyMap.set(String(key), { kind: "buyxgety", rule: r });
      });

      const linesToRemove = [];

      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const line = i + 1;
        const p = it?.properties || {};

        const isFree = String(p?.[FREE_GIFT_PROPERTY] || "").trim().toLowerCase() === "true";
        const isBxgy = String(p?.[BXGY_GIFT_PROPERTY] || "").trim().toLowerCase() === "true";

        if (isFree) {
          const slot = String(p?.[FREE_GIFT_RULE_PROPERTY] || "").trim();
          const ruleKey = String(p?.[FREE_GIFT_RULE_KEY_PROPERTY] || "").trim();
          let rule = slot ? freeBySlot.get(slot) : null;
          if (!rule && ruleKey) rule = freeByRuleKey.get(ruleKey);

          if (!rule) {
            linesToRemove.push(line);
            continue;
          }

          const goal = getGoalRupees("free", rule);
          const subtotalRupees = (Number(CART?.items_subtotal_price || 0) / 100) || 0;

          if (!(Number.isFinite(Number(goal)) && Number(goal) > 0)) {
            linesToRemove.push(line);
            continue;
          }

          const eligible = subtotalRupees >= Number(goal);
          if (!eligible) linesToRemove.push(line);
          continue;
        }

        if (isBxgy) {
          const ruleKey = String(p?.[BXGY_GIFT_RULE_PROPERTY] || "").trim();
          const meta = ruleKey ? bxgyMap.get(ruleKey) : null;

          if (!meta?.rule) {
            linesToRemove.push(line);
            continue;
          }

          const eligible =
            meta.kind === "buyxgety"
              ? computeBuyXGetYCompleteForRule(meta.rule)
              : computeBxgyCompleteForRule(meta.rule);
          if (!eligible) linesToRemove.push(line);
        }
      }

      if (!linesToRemove.length) return;

      linesToRemove.sort((a, b) => b - a);

      for (const line of linesToRemove) {
        try {
          CART = await cartChange(line, 0);
        } catch (e) {
          console.error("[SC] auto-remove failed line", line, e);
        }
      }

      try {
        CART = await fetchCart();
      } catch { }
    } finally {
      __SC_ENFORCING_REWARDS__ = false;
    }
  };

  /* =========================================================
   ✅ PROGRESS CALC + RENDER
  ========================================================= */
  const computeFillPercent = (subtotalCents, thresholdsCents, stepCount) => {
    if (!stepCount) return 0;
    const stepPercent = 100 / stepCount;
    const numeric = thresholdsCents.map((x) => (Number.isFinite(x) ? Number(x) : Infinity));

    let completedSteps = 0;
    for (let i = 0; i < stepCount; i++) {
      const threshold = numeric[i];
      if (!Number.isFinite(threshold)) break;
      if (subtotalCents >= threshold) completedSteps++;
      else break;
    }

    let fillPercent = completedSteps * stepPercent;
    if (completedSteps < stepCount) {
      const nextThreshold = numeric[completedSteps];
      if (Number.isFinite(nextThreshold)) {
        const prevThreshold = completedSteps > 0 ? numeric[completedSteps - 1] : 0;
        const span = nextThreshold - prevThreshold;
        if (span > 0) {
          const partial = clamp01((subtotalCents - prevThreshold) / span);
          fillPercent += partial * stepPercent;
        }
      }
    }

    return Math.min(100, Math.max(0, fillPercent));
  };

  const renderProgress = () => {
    const label = $(".sc-label");
    const fill = $(".sc-fill");
    const dotsWrap = $(".sc-dots");
    const legends = $(".sc-legends");
    const progressWrap = $(".sc-progress");
    if (!label || !fill || !dotsWrap || !legends || !progressWrap) return;

    const setProgressVisible = (show) => {
      if (show) {
        progressWrap.style.removeProperty("display");
      } else {
        progressWrap.style.setProperty("display", "none", "important");
      }
    };

    const stepsAll = buildSteps();
    const subtotal = Number(CART?.items_subtotal_price || 0);

    // ✅ ALWAYS refresh announcement regardless of steps
    refreshAnnouncementFromRules();

    const bxgyNow = getBxgyStatus();
    const bxgyCompleteNow = !!(bxgyNow && bxgyNow.complete);

    const buyStatuses = getBuyXGetYStatuses();
    const anyBuyCompletedNow = buyStatuses.some((x) => x.complete);

    // ✅ Clear shown/auto-added flags when eligibility is false (so next time it can show/add again)
    buyStatuses.forEach((st) => {
      if (!st?.ruleKey) return;
      if (!st.complete) {
        clearPopupShown("buyxgety", st.ruleKey);
        scStore.del(keyAutoAdded("buyxgety", st.ruleKey));
      }
    });
    if (bxgyNow?.ruleKey && !bxgyCompleteNow) {
      clearPopupShown("bxgy", bxgyNow.ruleKey);
      scStore.del(keyAutoAdded("bxgy", bxgyNow.ruleKey));
    }

    // ✅ If no steps configured, don't blank announcement anymore
    if (!stepsAll.length) {
      setProgressVisible(false);
      label.textContent = "Milestones not configured yet.";
      fill.style.width = "0%";
      dotsWrap.innerHTML = "";
      legends.innerHTML = "";
      document.documentElement.style.removeProperty("--sc-stepcount");

      // prime popup state so refresh/open doesn't fire
      const priming = !__SC_PRIMED_POPUPS__;
      if (priming) {
        LAST_DONE = 0;
        LAST_BXGY_DONE = bxgyCompleteNow;
        drawer.__sc_buy_completed_before = anyBuyCompletedNow;
        __SC_PRIMED_POPUPS__ = true;
      }

      return;
    }

    setProgressVisible(true);
    const stepCount = stepsAll.length;
    document.documentElement.style.setProperty("--sc-stepcount", String(stepCount));

    const thresholds = stepsAll.map((ss) => (typeof ss.unlockCents === "number" ? ss.unlockCents : Infinity));
    const numericThresholds = thresholds.filter((x) => Number.isFinite(x));

    if (!numericThresholds.length) {
      setProgressVisible(false);
      label.textContent = "Milestones not configured yet.";
      fill.style.width = "0%";
      dotsWrap.innerHTML = "";
      legends.innerHTML = "";

      const priming = !__SC_PRIMED_POPUPS__;
      if (priming) {
        LAST_DONE = 0;
        LAST_BXGY_DONE = bxgyCompleteNow;
        drawer.__sc_buy_completed_before = anyBuyCompletedNow;
        __SC_PRIMED_POPUPS__ = true;
      }

      return;
    }

    const doneSteps = stepsAll.filter((ss) => typeof ss.unlockCents === "number" && subtotal >= ss.unlockCents);
    const doneCount = doneSteps.length;
    const nextPending = stepsAll.find((ss) => typeof ss.unlockCents === "number" && subtotal < ss.unlockCents);

    let labelText = trimToNull(nextPending?.progressTextBefore) || "";
    if (!labelText) {
      const allDone = !nextPending && doneCount >= numericThresholds.length;
      labelText = allDone ? "All milestones unlocked 🎉" : "Milestones in progress";
    }
    label.textContent = labelText || "Milestones in progress";

    const fillPct = computeFillPercent(subtotal, thresholds, stepCount);
    fill.style.width = `${fillPct}%`;

    const isDrawerOpen = drawer.classList.contains("open");

    // ✅ FIX-2: Prime state on first render (so refresh won't show popups)
    const priming = !__SC_PRIMED_POPUPS__;
    if (priming) {
      LAST_DONE = doneCount;
      LAST_BXGY_DONE = bxgyCompleteNow;
      drawer.__sc_buy_completed_before = anyBuyCompletedNow;
      __SC_PRIMED_POPUPS__ = true;
    }

    // ? POPUPS only if NOT priming
    let rewardPopupShown = false;
    if (isDrawerOpen && !priming) {
      const firstCompleted = buyStatuses.find((x) => x.complete);
      const wasBuyCompletedBefore = !!drawer.__sc_buy_completed_before;

      if (firstCompleted && !wasBuyCompletedBefore) {
        drawer.__sc_buy_completed_before = true;

        // ? FIX-3: if xQty <= 1 -> auto add reward so it shows in cart drawer
        const x = Number(firstCompleted?.xQty || 0);
        if (Number.isFinite(x) && x <= 1) {
          // auto add and do not spam popup
          void autoAddRewardIfNeeded({
            kind: "buyxgety",
            rule: firstCompleted.rule,
            ruleKey: firstCompleted.ruleKey,
          });
          // mark shown so refresh/open doesn't repeat
          if (firstCompleted?.ruleKey) markPopupShown("buyxgety", firstCompleted.ruleKey);
        } else {
          const popupShown = openRewardPopupFor({
            kind: "buyxgety",
            rule: firstCompleted.rule,
            ruleKey: firstCompleted.ruleKey,
            title: trimToNull(firstCompleted.afterMsg) || "Offer unlocked",
          });

          if (!popupShown) {
            firePaperEffect(2800);
            showCenterCelebratePopup(
              "🎉 Congratulations!",
              trimToNull(firstCompleted.afterMsg) || "Offer unlocked",
              5000
            );
          }
          rewardPopupShown = true;
        }
      } else if (bxgyCompleteNow && !LAST_BXGY_DONE) {
        const popupShown = bxgyNow
          ? openRewardPopupFor({
            kind: "bxgy",
            rule: bxgyNow.rule,
            ruleKey: bxgyNow.ruleKey,
            title: trimToNull(bxgyNow.afterMsg) || trimToNull(bxgyNow.currentMsg) || "Offer unlocked",
          })
          : false;

        if (!popupShown) {
          firePaperEffect(2800);
          const msg = trimToNull(bxgyNow?.afterMsg) || trimToNull(bxgyNow?.currentMsg) || "Offer Unlocked";
          showCenterCelebratePopup("🎉 Congratulations!", msg, 5000);
        }
        rewardPopupShown = true;
      }

      if (!anyBuyCompletedNow) drawer.__sc_buy_completed_before = false;
    }

    const stepCompletedNow = !priming && doneCount > LAST_DONE;
    if (stepCompletedNow && !rewardPopupShown) {
      const newlyUnlocked = doneSteps[doneCount - 1];
      const celebrationText =
        trimToNull(newlyUnlocked?.progressTextAfter) || newlyUnlocked?.title || "Reward Unlocked";

      let popupShown = false;
      const stepSlot = trimToNull(newlyUnlocked?.slot);
      const stepGuardKey =
        (stepSlot ? `step:${stepSlot}` : null) ||
        trimToNull(newlyUnlocked?.ruleKey) ||
        trimToNull(newlyUnlocked?.cartStepName) ||
        null;
      const canShowStepPopup = !stepGuardKey || canShowPopupFor("step", stepGuardKey);

      if (!isDrawerOpen) openDrawer();

      if (newlyUnlocked?.type === "free") {
        // avoid repeat after refresh by shown flag
        const slot = newlyUnlocked.slot;
        if (!slot || canShowPopupFor("free", slot)) {
          popupShown = openRewardPopupFor({
            kind: "free",
            rule: newlyUnlocked.rule,
            slot: newlyUnlocked.slot,
            title: trimToNull(newlyUnlocked?.title) || "Free product unlocked",
          });
          if (popupShown) drawer.__sc_free_popup_for = newlyUnlocked.slot;
          if (popupShown) firePaperEffect(2800);
        }
      }

      if (!popupShown && canShowStepPopup) {
        firePaperEffect(2800);
        showCenterCelebratePopup("🎉 Congratulations!", celebrationText, 5000);
        if (stepGuardKey) markPopupShown("step", stepGuardKey);
      }
    }


    LAST_DONE = doneCount;
    LAST_BXGY_DONE = bxgyCompleteNow;

    const stillHasFreeDone = doneSteps.some((ss) => ss.slot === drawer.__sc_free_popup_for);
    if (!stillHasFreeDone) drawer.__sc_free_popup_for = null;

    if (!bxgyCompleteNow && !anyBuyCompletedNow) {
      drawer.__sc_reward_popup_for = null;
    }

    dotsWrap.innerHTML = stepsAll
      .map((ss, i) => {
        const leftPct = ((i + 1) / stepCount) * 100;
        const isLast = i === stepCount - 1;

        const isDone = typeof ss.unlockCents === "number" ? subtotal >= ss.unlockCents : false;
        const isActive = !isDone && nextPending?.slot === ss.slot;
        const cls = isDone ? "done" : isActive ? "active" : "";
        const icon = isDone ? ICONS.check : ss.icon;

        const belowText = trimToNull(ss.progressTextBelow) || trimToNull(ss.title);

        return `
          <div class="sc-dot-wrap ${cls} ${isLast ? "last" : ""}"
               style="left:${leftPct}%"
               title="${safe(ss.title)}">
            <div class="sc-dot-bubble">${safe(icon)}</div>
            <div class="sc-dot-text">${safe(belowText)}</div>
          </div>
        `;
      })
      .join("");

    legends.innerHTML = "";

    // clear shown flag for free slots when not done
    stepsAll.forEach((st) => {
      const stepSlot = trimToNull(st?.slot);
      const stepGuardKey = stepSlot ? `step:${stepSlot}` : null;
      const isDone = typeof st.unlockCents === "number" ? subtotal >= st.unlockCents : false;
      if (!isDone && stepGuardKey) clearPopupShown("step", stepGuardKey);
      if (st.type === "free") {
        const slot = st.slot;
        if (!isDone && slot) {
          clearPopupShown("free", slot);
          scStore.del(keyAutoAdded("free", slot));
        }
      }
    });
  };

  const renderAllFromCache = () => {
    if (!PROXY || !CART) return;
    applyStyleSettings(PROXY?.styleSettings);
    renderCart();
    renderUpsellSection();
    renderProgress();
    refreshAnnouncementFromRules();
    maybeShowAppliedDiscountCodePopup();
  };

  /* =========================================================
   ✅ PRELOAD + REFRESH
  ========================================================= */
  const preload = async () => {
    try {
      setProgressLoading(true);
      const [proxyRes, cartRes] = await Promise.allSettled([
        fetchProxy(),
        fetchCart(),
      ]);

      if (cartRes.status !== "fulfilled") {
        throw cartRes.reason || new Error("Cart preload failed");
      }

      CART = cartRes.value;
      PROXY =
        proxyRes.status === "fulfilled"
          ? proxyRes.value
          : { ok: true, _proxyError: proxyRes.reason };

      if (proxyRes.status !== "fulfilled") {
        console.warn(
          "[SmartCartify] Proxy preload failed; continuing without proxy data.",
          proxyRes.reason
        );
      }

      logProxyTables(PROXY);

      await enforceRewardValidity();

      let pendingDiscountCode = null;
      try {
        pendingDiscountCode = trimToNull(sessionStorage.getItem("__SC_LAST_APPLIED_CODE__"));
      } catch { }

      if (pendingDiscountCode) {
        discountPopupShownForCode = String(pendingDiscountCode).toLowerCase();
      }

      applyStyleSettings(PROXY?.styleSettings);
      renderAllFromCache();

      if (pendingDiscountCode) {
        try {
          sessionStorage.removeItem("__SC_LAST_APPLIED_CODE__");
        } catch { }

        openDrawer();

        const r = (CODE_DISCOUNT_RULES || []).find(
          (x) =>
            String(x?.discountCode || x?.discount_code || x?.code || "").toLowerCase() ===
            String(pendingDiscountCode).toLowerCase()
        );

        const txt = r
          ? replaceProgressText({
            text: getProgressAfter(r) || "",
            type: "discount",
            rule: r,
            subtotalRupees: (Number(CART?.items_subtotal_price || 0) / 100) || 0,
            useRemainingForGoal: false,
          })
          : `Discount applied: ${pendingDiscountCode}`;

        showCenterCelebratePopup("Discount Applied ✅", txt, 5000);
      }
    } catch (e) {
      console.error("[SmartCartify] Preload failed:", e);
      renderFallback(`Unable to load data: ${safe(e?.message || "Unknown error")}`);
    } finally {
      setProgressLoading(false);
    }
  };

  let refreshTimer = null;
  const refreshFromNetwork = async () => {
    if (refreshTimer) clearTimeout(refreshTimer);
    return new Promise((resolve) => {
      refreshTimer = setTimeout(async () => {
        try {
          setProgressLoading(true);
          CART = await fetchCart();

          await enforceRewardValidity();

          renderAllFromCache();
        } catch (e) {
          console.error(e);
        } finally {
          setProgressLoading(false);
          resolve();
        }
      }, 60);
    });
  };

  const openAndRefreshDrawer = async () => {
    try {
      openDrawer();
      await refreshFromNetwork();
      renderAllFromCache();
    } catch (e) {
      console.error("[SmartCartify] auto open failed:", e);
    }
  };

  /* =========================================================
   ✅ ADD-TO-CART INTERCEPT
  ========================================================= */
  function isAddToCartForm(el) {
    if (!el) return false;
    if (el.matches?.('form[action^="/cart/add"]')) return true;
    const f = el.closest?.('form[action^="/cart/add"]');
    return !!f;
  }

  function isAddToCartBtn(el) {
    if (!el) return false;
    if (el.matches?.('button[name="add"], input[name="add"]')) return true;
    if (el.matches?.("[data-add-to-cart], [data-ajax-cart-request-button]")) return true;
    if (el.matches?.("button[type='submit'], input[type='submit']") && isAddToCartForm(el)) return true;
    return false;
  }

  document.addEventListener(
    "click",
    async (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;

      const btn = t.closest(
        'button[name="add"], input[name="add"], button[type="submit"], input[type="submit"], [data-add-to-cart], [data-ajax-cart-request-button]'
      );
      if (!btn) return;
      if (!isAddToCartBtn(btn)) return;

      e.preventDefault();
      e.stopPropagation();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();

      const form = btn.closest('form[action^="/cart/add"]');
      if (!form) {
        await openAndRefreshDrawer();
        return;
      }

      try {
        setProgressLoading(true);

        const fd = new FormData(form);
        if (!fd.has("quantity")) fd.set("quantity", "1");

        const rr = await fetch("/cart/add.js", {
          method: "POST",
          headers: { Accept: "application/json" },
          body: fd,
          credentials: "same-origin",
        });
        if (!rr.ok) throw new Error("Add to cart failed");

        await openAndRefreshDrawer();
      } catch (err) {
        console.error("[SmartCartify] click intercept add failed:", err);
        try {
          form.submit();
        } catch { }
      } finally {
        setProgressLoading(false);
      }
    },
    true
  );

  /* =========================================================
   ✅ XHR WATCH
  ========================================================= */
  const _xhrOpen = XMLHttpRequest.prototype.open;
  const _xhrSend = XMLHttpRequest.prototype.send;

  const isAddToCartUrl = (url) => {
    const u = safe(url);
    return u.includes("/cart/add") || u.includes("/cart/add.js");
  };
  const watchUrl = (url) => {
    const u = safe(url);
    return (
      u.includes("/cart/add") ||
      u.includes("/cart/change") ||
      u.includes("/cart/update") ||
      u.includes("/cart/add.js") ||
      u.includes("/cart/change.js") ||
      u.includes("/cart/update.js")
    );
  };

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__sc_url = url;
    return _xhrOpen.call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.send = function (body) {
    try {
      this.addEventListener("load", () => {
        try {
          if (isAddToCartUrl(this.__sc_url) && this.status >= 200 && this.status < 300) {
            setTimeout(openAndRefreshDrawer, 80);
          }
        } catch { }
      });
    } catch { }
    return _xhrSend.call(this, body);
  };

  /* =========================================================
   ✅ DRAWER ITEM ACTIONS
  ========================================================= */
  drawer.addEventListener("click", async (e) => {
    const el = e.target;
    if (!(el instanceof Element)) return;
    const item = el.closest(".sc-item");
    if (!item) return;
    const line = Number(item.getAttribute("data-line"));
    if (!line) return;
    const input = item.querySelector('input[data-qty="input"]');
    const current = Number(input?.value || 0);
    try {
      setProgressLoading(true);
      if (el.matches('[data-qty="inc"]')) CART = await cartChange(line, current + 1);
      if (el.matches('[data-qty="dec"]')) CART = await cartChange(line, Math.max(0, current - 1));
      if (el.matches('[data-remove="1"]') || el.closest?.('[data-remove="1"]')) CART = await cartChange(line, 0);
      await enforceRewardValidity();
      renderAllFromCache();
    } catch (err) {
      console.error(err);
    } finally {
      setProgressLoading(false);
    }
  });

  drawer.addEventListener("change", async (e) => {
    const el = e.target;
    if (!(el instanceof Element)) return;
    if (!el.matches('input[data-qty="input"]')) return;
    const item = el.closest(".sc-item");
    const line = Number(item?.getAttribute("data-line"));
    if (!line) return;
    const qty = Math.max(0, Number(el.value || 0));
    try {
      setProgressLoading(true);
      CART = await cartChange(line, qty);
      await enforceRewardValidity();
      renderAllFromCache();
    } catch (err) {
      console.error(err);
    } finally {
      setProgressLoading(false);
    }
  });

  $("[data-checkout]")?.addEventListener("click", () => {
    window.location.href = "/checkout";
  });

  /* =========================================================
   ✅ OPEN BUTTONS
  ========================================================= */
  const ensureOpenButton = () => {
    const cartSvg =
      '<svg class="icon icon-cart" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" fill="none">' +
      '<path fill="currentColor" fill-rule="evenodd" d="M20.5 6.5a4.75 4.75 0 00-4.75 4.75v.56h-3.16l-.77 11.6a5 5 0 004.99 5.34h7.38a5 5 0 004.99-5.33l-.77-11.6h-3.16v-.57A4.75 4.75 0 0020.5 6.5zm3.75 5.31v-.56a3.75 3.75 0 10-7.5 0v.56h7.5zm-7.5 1h7.5v.56a3.75 3.75 0 11-7.5 0v-.56zm-1 0v.56a4.75 4.75 0 109.5 0v-.56h2.22l.71 10.67a4 4 0 01-3.99 4.27h-7.38a4 4 0 01-4-4.27l.72-10.67h2.22z"></path>' +
      "</svg>";
    const horizonCart = document.querySelector("cart-drawer-component");
    if (horizonCart) {
      const horizonBtn = horizonCart.querySelector(
        'button.header-actions__action, button[aria-label*="cart" i]'
      );
      const cartIcon = horizonCart.querySelector("cart-icon");
      const svgWrap = cartIcon?.querySelector(".svg-wrapper");
      const targetBtn = horizonBtn || cartIcon?.closest("button");
      if (targetBtn) {
        targetBtn.setAttribute("data-smart-cartify-open", "");
        targetBtn.classList.add("my-cart-icon");
        if (svgWrap) svgWrap.innerHTML = cartSvg;
        else targetBtn.innerHTML = cartSvg;
        return;
      }
    }
    if (document.querySelector("[data-smart-cartify-open]")) return;
    let header = document.querySelector("header");
    if (!header) {
      header = document.createElement("header");
      document.body.insertAdjacentElement("afterbegin", header);
    }
    const iconWrap =
      header.querySelector(
        ".header__icons, .site-header__icons, .header-icons, .site-header__icon-wrapper, .header__icon-wrapper, .header__icons-wrapper"
      ) ||
      header;
    const cartCandidate =
      iconWrap.querySelector(
        'a[href="/cart"], a[href="/cart/"], a[href*="/cart"], [data-cart], [data-cart-icon], [data-header-cart], .header__icon--cart, .site-header__cart, .cart-link, .cart-icon'
      );
    const btn = cartCandidate || document.createElement("a");
    btn.setAttribute("data-smart-cartify-open", "");
    btn.classList.add("my-cart-icon");
    if (btn.tagName.toLowerCase() === "a") btn.setAttribute("href", "#");
    btn.innerHTML = cartSvg;
    if (!cartCandidate) iconWrap.appendChild(btn);
  };

  const bindOpenButtons = () => {
    document.querySelectorAll("[data-smart-cartify-open]").forEach((btn) => {
      if (btn.__scBound) return;
      btn.__scBound = true;
      const openFromEvent = async (e, markPointer = false) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        if (markPointer) btn.__scPointerOpened = Date.now();
        openDrawer();
        await refreshFromNetwork();
        renderAllFromCache();
      };
      btn.addEventListener(
        "pointerdown",
        (e) => {
          openFromEvent(e, true);
        },
        true
      );
      btn.addEventListener(
        "click",
        async (e) => {
          if (btn.__scPointerOpened && Date.now() - btn.__scPointerOpened < 500) {
            btn.__scPointerOpened = 0;
            return;
          }
          await openFromEvent(e, false);
        },
        true
      );
    });
  };
  ensureOpenButton();
  bindOpenButtons();
  new MutationObserver(bindOpenButtons).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  /* =========================================================
   ✅ FETCH WATCH
  ========================================================= */
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const res = await originalFetch.apply(this, args);

    try {
      const url = args?.[0];
      if (isAddToCartUrl(url) && res?.ok) {
        setTimeout(openAndRefreshDrawer, 80);
        return res;
      }
      if (watchUrl(url)) {
        if (drawer.classList.contains("open")) setProgressLoading(true);
        fetchCart()
          .then(async (c) => {
            CART = c;
            await enforceRewardValidity();
            if (drawer.classList.contains("open")) renderAllFromCache();
          })
          .catch(() => { })
          .finally(() => {
            if (drawer.classList.contains("open")) setProgressLoading(false);
          });
      }
    } catch { }
    return res;
  };
  preload();
})();
