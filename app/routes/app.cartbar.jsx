// app/routes/app.cartbar.jsx
import React, { useState, useCallback, useEffect } from "react";
import { useLoaderData, useSubmit, useNavigation, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { normalizeShopDomain } from "../lib/shopUtils.server.js";
import prisma from "../db.server";
import {
  Page,
  Layout,
  Card,
  Text,
  Button,
  InlineStack,
  BlockStack,
  Box,
  Checkbox,
  Select,
  TextField,
  Divider,
  Frame,
  Toast,
  Badge,
  Modal,
} from "@shopify/polaris";

// ─── Defaults ────────────────────────────────────────────────────────────────
const DEFAULTS = {
  status: "active",
  mobileShowCondition: "notinview",
  mobileScrollDepth: 380,
  mobileStickyPosition: "bottom",
  mobileCtaAnimation: "pulse",
  mobileBgColor: "#ffffff",
  mobileTextColor: "#111827",
  mobileCtaBgColor: "#111827",
  mobileCtaTextColor: "#ffffff",
  mobileImageOutlineColor: "#e5e7eb",
  mobileShowProductImage: true,
  mobileShowProductTitle: true,
  mobileShowPrice: true,
  mobileShowCompareAtPrice: true,
  mobileShowQuantity: true,
  mobileShowVariantSelector: true,
  mobileShowVariantLabel: true,
  mobileShowPriceOnCta: true,
  mobileShowCompareAtPriceOnCta: true,
  desktopShowCondition: "notinview",
  desktopScrollDepth: 380,
  desktopStickyPosition: "bottom",
  desktopCtaAnimation: "pulse",
  desktopBgColor: "#ffffff",
  desktopTextColor: "#111827",
  desktopCtaBgColor: "#111827",
  desktopCtaTextColor: "#ffffff",
  desktopImageOutlineColor: "#e5e7eb",
  desktopShowProductImage: true,
  desktopShowProductTitle: true,
  desktopShowPrice: true,
  desktopShowCompareAtPrice: true,
  desktopShowQuantity: true,
  desktopShowVariantSelector: true,
  desktopShowVariantLabel: true,
  desktopShowPriceOnCta: true,
  desktopShowCompareAtPriceOnCta: true,
  ctaBehavior: "addToCart",
  afterAddToCart: "openCartWidget",
  homepageProductId: "",
  homepageProductTitle: "",
  customCss: "",
  customJs: "",
  desktopZIndex: 5000,
  mobileZIndex: 5000,
};

// ─── Color picker sub-component ──────────────────────────────────────────────
const ColorField = ({ label, value, onChange }) => {
  const safeValue = /^#[0-9A-Fa-f]{3,6}$/.test(value || "") ? value : "#000000";
  return (
    <Box style={{ minWidth: 100, maxWidth: 180 }}>
      <Text as="p" variant="bodySm" tone="subdued">
        {label}
      </Text>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "36px auto",
          gap: 8,
          alignItems: "center",
          marginTop: 4,
        }}
      >
        <input
          type="color"
          value={safeValue}
          aria-label={label}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: 36,
            height: 36,
            border: "none",
            borderRadius: 4,
            padding: 0,
            background: "transparent",
            cursor: "pointer",
          }}
        />
        <TextField
          label={`${label} hex`}
          labelHidden
          value={value}
          onChange={onChange}
          autoComplete="off"
        />
      </div>
    </Box>
  );
};

// ─── Segmented button helper ─────────────────────────────────────────────────
const SegBtn = ({ label, active, onClick, first, last, noRightBorder }) => (
  <button
    onClick={onClick}
    style={{
      padding: "6px 14px",
      border: "1px solid #c9ccd0",
      borderRight: noRightBorder ? "none" : "1px solid #c9ccd0",
      borderRadius: first ? "4px 0 0 4px" : last ? "0 4px 4px 0" : 0,
      background: active ? "#202223" : "#fff",
      color: active ? "#fff" : "#202223",
      fontWeight: active ? 600 : 400,
      cursor: "pointer",
      fontSize: 13,
      whiteSpace: "nowrap",
    }}
  >
    {label}
  </button>
);

const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "ISK",
  "JPY",
  "KMF",
  "KRW",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
]);

const normalizeCurrencyCode = (currencyCode) =>
  String(currencyCode || "USD").trim().toUpperCase() || "USD";

const formatPreviewMoney = (amount, currencyCode) => {
  const code = normalizeCurrencyCode(currencyCode);
  const fractionDigits = ZERO_DECIMAL_CURRENCIES.has(code) ? 0 : 2;

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(Number(amount || 0));
  } catch {
    return `${code} ${Number(amount || 0).toFixed(fractionDigits)}`;
  }
};

// ─── Loader ───────────────────────────────────────────────────────────────────
export async function loader({ request }) {
  const { session, admin } = await authenticate.admin(request);
  const shop = normalizeShopDomain(session?.shop);

  const [row, shopCurrencyCode] = await Promise.all([
    prisma.addToCartBarSettings.findUnique({ where: { shop } }),
    admin
      .graphql(`
        query AddToCartBarShopCurrency {
          shop {
            currencyCode
          }
        }
      `)
      .then((response) => response.json())
      .then((payload) => normalizeCurrencyCode(payload?.data?.shop?.currencyCode))
      .catch(() => "USD"),
  ]);

  return {
    shopCurrencyCode,
    settings: row
      ? {
          ...row,
          mobileScrollDepth: Number(row.mobileScrollDepth),
          desktopScrollDepth: Number(row.desktopScrollDepth),
          desktopZIndex: Number(row.desktopZIndex),
          mobileZIndex: Number(row.mobileZIndex),
          homepageProductId: row.homepageProductId || "",
          homepageProductTitle: row.homepageProductTitle || "",
          customCss: row.customCss || "",
          customJs: row.customJs || "",
          mobileBgColor: row.mobileBgColor || DEFAULTS.mobileBgColor,
          mobileTextColor: row.mobileTextColor || DEFAULTS.mobileTextColor,
          mobileCtaBgColor: row.mobileCtaBgColor || DEFAULTS.mobileCtaBgColor,
          mobileCtaTextColor: row.mobileCtaTextColor || DEFAULTS.mobileCtaTextColor,
          mobileImageOutlineColor: row.mobileImageOutlineColor || DEFAULTS.mobileImageOutlineColor,
          desktopBgColor: row.desktopBgColor || DEFAULTS.desktopBgColor,
          desktopTextColor: row.desktopTextColor || DEFAULTS.desktopTextColor,
          desktopCtaBgColor: row.desktopCtaBgColor || DEFAULTS.desktopCtaBgColor,
          desktopCtaTextColor: row.desktopCtaTextColor || DEFAULTS.desktopCtaTextColor,
          desktopImageOutlineColor: row.desktopImageOutlineColor || DEFAULTS.desktopImageOutlineColor,
        }
      : null,
  };
}

// ─── Action ───────────────────────────────────────────────────────────────────
export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = normalizeShopDomain(session?.shop);
  const form = await request.formData();

  const s = (key, fallback = "") => String(form.get(key) ?? fallback);
  const b = (key) => form.get(key) === "true";
  const n = (key, fallback = 0) => {
    const v = parseInt(form.get(key) ?? fallback, 10);
    return isNaN(v) ? fallback : v;
  };

  const data = {
    status: s("status", "active"),
    mobileShowCondition: s("mobileShowCondition", "notinview"),
    mobileScrollDepth: n("mobileScrollDepth", 380),
    mobileStickyPosition: s("mobileStickyPosition", "bottom"),
    mobileCtaAnimation: s("mobileCtaAnimation", "pulse"),
    mobileBgColor: s("mobileBgColor", DEFAULTS.mobileBgColor),
    mobileTextColor: s("mobileTextColor", DEFAULTS.mobileTextColor),
    mobileCtaBgColor: s("mobileCtaBgColor", DEFAULTS.mobileCtaBgColor),
    mobileCtaTextColor: s("mobileCtaTextColor", DEFAULTS.mobileCtaTextColor),
    mobileImageOutlineColor: s("mobileImageOutlineColor", DEFAULTS.mobileImageOutlineColor),
    mobileShowProductImage: b("mobileShowProductImage"),
    mobileShowProductTitle: b("mobileShowProductTitle"),
    mobileShowPrice: b("mobileShowPrice"),
    mobileShowCompareAtPrice: b("mobileShowCompareAtPrice"),
    mobileShowQuantity: b("mobileShowQuantity"),
    mobileShowVariantSelector: b("mobileShowVariantSelector"),
    mobileShowVariantLabel: b("mobileShowVariantLabel"),
    mobileShowPriceOnCta: b("mobileShowPriceOnCta"),
    mobileShowCompareAtPriceOnCta: b("mobileShowCompareAtPriceOnCta"),
    desktopShowCondition: s("desktopShowCondition", "notinview"),
    desktopScrollDepth: n("desktopScrollDepth", 380),
    desktopStickyPosition: s("desktopStickyPosition", "bottom"),
    desktopCtaAnimation: s("desktopCtaAnimation", "pulse"),
    desktopBgColor: s("desktopBgColor", DEFAULTS.desktopBgColor),
    desktopTextColor: s("desktopTextColor", DEFAULTS.desktopTextColor),
    desktopCtaBgColor: s("desktopCtaBgColor", DEFAULTS.desktopCtaBgColor),
    desktopCtaTextColor: s("desktopCtaTextColor", DEFAULTS.desktopCtaTextColor),
    desktopImageOutlineColor: s("desktopImageOutlineColor", DEFAULTS.desktopImageOutlineColor),
    desktopShowProductImage: b("desktopShowProductImage"),
    desktopShowProductTitle: b("desktopShowProductTitle"),
    desktopShowPrice: b("desktopShowPrice"),
    desktopShowCompareAtPrice: b("desktopShowCompareAtPrice"),
    desktopShowQuantity: b("desktopShowQuantity"),
    desktopShowVariantSelector: b("desktopShowVariantSelector"),
    desktopShowVariantLabel: b("desktopShowVariantLabel"),
    desktopShowPriceOnCta: b("desktopShowPriceOnCta"),
    desktopShowCompareAtPriceOnCta: b("desktopShowCompareAtPriceOnCta"),
    ctaBehavior: s("ctaBehavior", "addToCart"),
    afterAddToCart: s("afterAddToCart", "openCartWidget"),
    homepageProductId: s("homepageProductId") || null,
    homepageProductTitle: s("homepageProductTitle") || null,
    customCss: s("customCss") || null,
    customJs: s("customJs") || null,
    desktopZIndex: n("desktopZIndex", 5000),
    mobileZIndex: n("mobileZIndex", 5000),
  };

  const existing = await prisma.addToCartBarSettings.findUnique({ where: { shop } });
  if (existing) {
    await prisma.addToCartBarSettings.update({ where: { shop }, data });
  } else {
    await prisma.addToCartBarSettings.create({ data: { shop, ...data } });
  }

  return { ok: true };
}

// ─── Main page component ──────────────────────────────────────────────────────
export default function AddToCartBarPage() {
  const { settings: raw, shopCurrencyCode = "USD" } = useLoaderData();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSaving = navigation.state === "submitting";

  const init = { ...DEFAULTS, ...(raw || {}) };

  // ── State ──
  const [status, setStatus] = useState(init.status);
  const [activeDevice, setActiveDevice] = useState("mobile");
  const [lookCollapsed, setLookCollapsed] = useState(false);
  const [generalCollapsed, setGeneralCollapsed] = useState(false);

  // Mobile
  const [mobileShowCondition, setMobileShowCondition] = useState(init.mobileShowCondition);
  const [mobileScrollDepth, setMobileScrollDepth] = useState(String(init.mobileScrollDepth));
  const [mobileStickyPosition, setMobileStickyPosition] = useState(init.mobileStickyPosition);
  const [mobileCtaAnimation, setMobileCtaAnimation] = useState(init.mobileCtaAnimation);
  const [mobileBgColor, setMobileBgColor] = useState(init.mobileBgColor);
  const [mobileTextColor, setMobileTextColor] = useState(init.mobileTextColor);
  const [mobileCtaBgColor, setMobileCtaBgColor] = useState(init.mobileCtaBgColor);
  const [mobileCtaTextColor, setMobileCtaTextColor] = useState(init.mobileCtaTextColor);
  const [mobileImageOutlineColor, setMobileImageOutlineColor] = useState(init.mobileImageOutlineColor);
  const [mobileShowProductImage, setMobileShowProductImage] = useState(init.mobileShowProductImage);
  const [mobileShowProductTitle, setMobileShowProductTitle] = useState(init.mobileShowProductTitle);
  const [mobileShowPrice, setMobileShowPrice] = useState(init.mobileShowPrice);
  const [mobileShowCompareAtPrice, setMobileShowCompareAtPrice] = useState(init.mobileShowCompareAtPrice);
  const [mobileShowQuantity, setMobileShowQuantity] = useState(init.mobileShowQuantity);
  const [mobileShowVariantSelector, setMobileShowVariantSelector] = useState(init.mobileShowVariantSelector);
  const [mobileShowVariantLabel, setMobileShowVariantLabel] = useState(init.mobileShowVariantLabel);
  const [mobileShowPriceOnCta, setMobileShowPriceOnCta] = useState(init.mobileShowPriceOnCta);
  const [mobileShowCompareAtPriceOnCta, setMobileShowCompareAtPriceOnCta] = useState(init.mobileShowCompareAtPriceOnCta);

  // Desktop
  const [desktopShowCondition, setDesktopShowCondition] = useState(init.desktopShowCondition);
  const [desktopScrollDepth, setDesktopScrollDepth] = useState(String(init.desktopScrollDepth));
  const [desktopStickyPosition, setDesktopStickyPosition] = useState(init.desktopStickyPosition);
  const [desktopCtaAnimation, setDesktopCtaAnimation] = useState(init.desktopCtaAnimation);
  const [desktopBgColor, setDesktopBgColor] = useState(init.desktopBgColor);
  const [desktopTextColor, setDesktopTextColor] = useState(init.desktopTextColor);
  const [desktopCtaBgColor, setDesktopCtaBgColor] = useState(init.desktopCtaBgColor);
  const [desktopCtaTextColor, setDesktopCtaTextColor] = useState(init.desktopCtaTextColor);
  const [desktopImageOutlineColor, setDesktopImageOutlineColor] = useState(init.desktopImageOutlineColor);
  const [desktopShowProductImage, setDesktopShowProductImage] = useState(init.desktopShowProductImage);
  const [desktopShowProductTitle, setDesktopShowProductTitle] = useState(init.desktopShowProductTitle);
  const [desktopShowPrice, setDesktopShowPrice] = useState(init.desktopShowPrice);
  const [desktopShowCompareAtPrice, setDesktopShowCompareAtPrice] = useState(init.desktopShowCompareAtPrice);
  const [desktopShowQuantity, setDesktopShowQuantity] = useState(init.desktopShowQuantity);
  const [desktopShowVariantSelector, setDesktopShowVariantSelector] = useState(init.desktopShowVariantSelector);
  const [desktopShowVariantLabel, setDesktopShowVariantLabel] = useState(init.desktopShowVariantLabel);
  const [desktopShowPriceOnCta, setDesktopShowPriceOnCta] = useState(init.desktopShowPriceOnCta);
  const [desktopShowCompareAtPriceOnCta, setDesktopShowCompareAtPriceOnCta] = useState(init.desktopShowCompareAtPriceOnCta);

  // General
  const [ctaBehavior, setCtaBehavior] = useState(init.ctaBehavior);
  const [afterAddToCart, setAfterAddToCart] = useState(init.afterAddToCart);
  const [homepageProductId, setHomepageProductId] = useState(init.homepageProductId);
  const [homepageProductTitle, setHomepageProductTitle] = useState(init.homepageProductTitle);
  const [customCss, setCustomCss] = useState(init.customCss);
  const [customJs, setCustomJs] = useState(init.customJs);
  const [desktopZIndex, setDesktopZIndex] = useState(String(init.desktopZIndex));
  const [mobileZIndex, setMobileZIndex] = useState(String(init.mobileZIndex));

  // UI
  const [jsEditorOpen, setJsEditorOpen] = useState(false);
  const [jsEditorDraft, setJsEditorDraft] = useState(init.customJs);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [toastActive, setToastActive] = useState(false);

  // Show toast after save completes
  useEffect(() => {
    if (navigation.state === "idle" && navigation.formData) {
      setToastActive(true);
    }
  }, [navigation.state]);

  // ── Active-device aliasing ──
  const isMobile = activeDevice === "mobile";
  const deviceLabel = isMobile ? "mobile" : "desktop";

  const showCondition = isMobile ? mobileShowCondition : desktopShowCondition;
  const setShowCondition = isMobile ? setMobileShowCondition : setDesktopShowCondition;
  const scrollDepth = isMobile ? mobileScrollDepth : desktopScrollDepth;
  const setScrollDepth = isMobile ? setMobileScrollDepth : setDesktopScrollDepth;
  const stickyPosition = isMobile ? mobileStickyPosition : desktopStickyPosition;
  const setStickyPosition = isMobile ? setMobileStickyPosition : setDesktopStickyPosition;
  const ctaAnimation = isMobile ? mobileCtaAnimation : desktopCtaAnimation;
  const setCtaAnimation = isMobile ? setMobileCtaAnimation : setDesktopCtaAnimation;
  const bgColor = isMobile ? mobileBgColor : desktopBgColor;
  const setBgColor = isMobile ? setMobileBgColor : setDesktopBgColor;
  const textColor = isMobile ? mobileTextColor : desktopTextColor;
  const setTextColor = isMobile ? setMobileTextColor : setDesktopTextColor;
  const ctaBgColor = isMobile ? mobileCtaBgColor : desktopCtaBgColor;
  const setCtaBgColor = isMobile ? setMobileCtaBgColor : setDesktopCtaBgColor;
  const ctaTextColor = isMobile ? mobileCtaTextColor : desktopCtaTextColor;
  const setCtaTextColor = isMobile ? setMobileCtaTextColor : setDesktopCtaTextColor;
  const imageOutlineColor = isMobile ? mobileImageOutlineColor : desktopImageOutlineColor;
  const setImageOutlineColor = isMobile ? setMobileImageOutlineColor : setDesktopImageOutlineColor;
  const showProductImage = isMobile ? mobileShowProductImage : desktopShowProductImage;
  const setShowProductImage = isMobile ? setMobileShowProductImage : setDesktopShowProductImage;
  const showProductTitle = isMobile ? mobileShowProductTitle : desktopShowProductTitle;
  const setShowProductTitle = isMobile ? setMobileShowProductTitle : setDesktopShowProductTitle;
  const showPrice = isMobile ? mobileShowPrice : desktopShowPrice;
  const setShowPrice = isMobile ? setMobileShowPrice : setDesktopShowPrice;
  const showCompareAtPrice = isMobile ? mobileShowCompareAtPrice : desktopShowCompareAtPrice;
  const setShowCompareAtPrice = isMobile ? setMobileShowCompareAtPrice : setDesktopShowCompareAtPrice;
  const showQuantity = isMobile ? mobileShowQuantity : desktopShowQuantity;
  const setShowQuantity = isMobile ? setMobileShowQuantity : setDesktopShowQuantity;
  const showVariantSelector = isMobile ? mobileShowVariantSelector : desktopShowVariantSelector;
  const setShowVariantSelector = isMobile ? setMobileShowVariantSelector : setDesktopShowVariantSelector;
  const showVariantLabel = isMobile ? mobileShowVariantLabel : desktopShowVariantLabel;
  const setShowVariantLabel = isMobile ? setMobileShowVariantLabel : setDesktopShowVariantLabel;
  const showPriceOnCta = isMobile ? mobileShowPriceOnCta : desktopShowPriceOnCta;
  const setShowPriceOnCta = isMobile ? setMobileShowPriceOnCta : setDesktopShowPriceOnCta;
  const showCompareAtPriceOnCta = isMobile ? mobileShowCompareAtPriceOnCta : desktopShowCompareAtPriceOnCta;
  const setShowCompareAtPriceOnCta = isMobile ? setMobileShowCompareAtPriceOnCta : setDesktopShowCompareAtPriceOnCta;

  // ── Save ──
  const handleSave = useCallback(() => {
    const fd = new FormData();
    const fields = {
      status,
      mobileShowCondition, mobileScrollDepth, mobileStickyPosition, mobileCtaAnimation,
      mobileBgColor, mobileTextColor, mobileCtaBgColor, mobileCtaTextColor, mobileImageOutlineColor,
      mobileShowProductImage, mobileShowProductTitle, mobileShowPrice, mobileShowCompareAtPrice,
      mobileShowQuantity, mobileShowVariantSelector, mobileShowVariantLabel,
      mobileShowPriceOnCta, mobileShowCompareAtPriceOnCta,
      desktopShowCondition, desktopScrollDepth, desktopStickyPosition, desktopCtaAnimation,
      desktopBgColor, desktopTextColor, desktopCtaBgColor, desktopCtaTextColor, desktopImageOutlineColor,
      desktopShowProductImage, desktopShowProductTitle, desktopShowPrice, desktopShowCompareAtPrice,
      desktopShowQuantity, desktopShowVariantSelector, desktopShowVariantLabel,
      desktopShowPriceOnCta, desktopShowCompareAtPriceOnCta,
      ctaBehavior, afterAddToCart, homepageProductId, homepageProductTitle,
      customCss, customJs, desktopZIndex, mobileZIndex,
    };
    Object.entries(fields).forEach(([k, v]) => fd.append(k, String(v)));
    submit(fd, { method: "post" });
  }, [
    status,
    mobileShowCondition, mobileScrollDepth, mobileStickyPosition, mobileCtaAnimation,
    mobileBgColor, mobileTextColor, mobileCtaBgColor, mobileCtaTextColor, mobileImageOutlineColor,
    mobileShowProductImage, mobileShowProductTitle, mobileShowPrice, mobileShowCompareAtPrice,
    mobileShowQuantity, mobileShowVariantSelector, mobileShowVariantLabel,
    mobileShowPriceOnCta, mobileShowCompareAtPriceOnCta,
    desktopShowCondition, desktopScrollDepth, desktopStickyPosition, desktopCtaAnimation,
    desktopBgColor, desktopTextColor, desktopCtaBgColor, desktopCtaTextColor, desktopImageOutlineColor,
    desktopShowProductImage, desktopShowProductTitle, desktopShowPrice, desktopShowCompareAtPrice,
    desktopShowQuantity, desktopShowVariantSelector, desktopShowVariantLabel,
    desktopShowPriceOnCta, desktopShowCompareAtPriceOnCta,
    ctaBehavior, afterAddToCart, homepageProductId, homepageProductTitle,
    customCss, customJs, desktopZIndex, mobileZIndex,
    submit,
  ]);

  // ── Product picker ──
  const openProductPicker = useCallback(async () => {
    setProductPickerOpen(true);
    if (products.length === 0) {
      setProductsLoading(true);
      try {
        const res = await fetch("/api/products");
        const data = await res.json();
        setProducts(data.products || []);
      } catch {
        setProducts([]);
      } finally {
        setProductsLoading(false);
      }
    }
  }, [products]);

  // ── JS editor commit ──
  const handleJsDone = useCallback(() => {
    setCustomJs(jsEditorDraft);
    setJsEditorOpen(false);
  }, [jsEditorDraft]);

  const handleJsUndo = useCallback(() => {
    setJsEditorDraft(customJs);
    setJsEditorOpen(false);
  }, [customJs]);

  // ── Render ──
  return (
    <Frame>
      {toastActive && (
        <Toast
          content="Settings saved"
          onDismiss={() => setToastActive(false)}
          duration={2500}
        />
      )}

      <Page
        title="Add to cart bar"
        titleMetadata={
          <Badge tone={status === "active" ? "success" : "critical"}>
            {status === "active" ? "Active" : "Inactive"}
          </Badge>
        }
        primaryAction={{
          content: "Save",
          onAction: handleSave,
          loading: isSaving,
        }}
        backAction={{ content: "Rules", url: "/app/rules" }}
      >
        <Layout>
          {/* ── Main content ── */}
          <Layout.Section>
            <BlockStack gap="400">

              {/* Look & Feel */}
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <InlineStack gap="200" blockAlign="center">
                      <span style={{ fontSize: 16 }}>🎨</span>
                      <Text as="h2" variant="headingMd">Look & feel</Text>
                    </InlineStack>
                    <Button
                      variant="plain"
                      onClick={() => setLookCollapsed((v) => !v)}
                    >
                      {lookCollapsed ? "✦ Expand" : "✦ Collapse"}
                    </Button>
                  </InlineStack>

                  {!lookCollapsed && (
                    <BlockStack gap="500">
                      {/* Device selector */}
                      <InlineStack align="space-between" blockAlign="center" wrap={false}>
                        <Text variant="bodySm" tone="subdued">
                          Select device to customize the style
                        </Text>
                        <InlineStack gap="0">
                          <SegBtn
                            label="Mobile"
                            active={activeDevice === "mobile"}
                            onClick={() => setActiveDevice("mobile")}
                            first
                            noRightBorder
                          />
                          <SegBtn
                            label="Desktop"
                            active={activeDevice === "desktop"}
                            onClick={() => setActiveDevice("desktop")}
                            last
                          />
                        </InlineStack>
                      </InlineStack>

                      <Divider />

                      {/* Show condition */}
                      <BlockStack gap="200">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                          Show add to cart bar in {deviceLabel}
                        </Text>
                        <div style={{ display: "flex", flexWrap: "nowrap", gap: 0, overflowX: "auto" }}>
                          {[
                            { label: "On Scroll", value: "scrollDown" },
                            { label: "Always", value: "always" },
                            { label: "Never/Hide", value: "never" },
                            { label: "Button not visible", value: "notInView" },
                          ].map((opt, i, arr) => (
                            <SegBtn
                              key={opt.value}
                              label={opt.label}
                              active={showCondition === opt.value}
                              onClick={() => setShowCondition(opt.value)}
                              first={i === 0}
                              last={i === arr.length - 1}
                              noRightBorder={i < arr.length - 1}
                            />
                          ))}
                        </div>
                      </BlockStack>

                      {/* Scroll depth */}
                      {showCondition === "scrollDown" && (
                        <Box style={{ maxWidth: 420 }}>
                          <TextField
                            label="Scroll depth"
                            type="number"
                            value={scrollDepth}
                            onChange={setScrollDepth}
                            autoComplete="off"
                          />
                        </Box>
                      )}

                      {/* Sticky bar position */}
                      <BlockStack gap="200">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                          Sticky bar position on {deviceLabel}
                        </Text>
                        <InlineStack gap="200">
                          <SegBtn
                            label="Top"
                            active={stickyPosition === "top"}
                            onClick={() => setStickyPosition("top")}
                            first
                            last
                          />
                          <SegBtn
                            label="Bottom"
                            active={stickyPosition === "bottom"}
                            onClick={() => setStickyPosition("bottom")}
                            first
                            last
                          />
                        </InlineStack>
                      </BlockStack>

                      {/* CTA animation */}
                      <Box style={{ maxWidth: 420 }}>
                        <Select
                          label={`Call to action animation in ${deviceLabel}`}
                          options={[
                            { label: "Pulse", value: "pulse" },
                            { label: "Shake", value: "shake" },
                            { label: "Bounce", value: "bounce" },
                            { label: "None", value: "none" },
                          ]}
                          value={ctaAnimation}
                          onChange={setCtaAnimation}
                        />
                      </Box>

                      {/* Colors */}
                      <BlockStack gap="200">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                          Customize colors for {deviceLabel}
                        </Text>
                        <Box
                          borderWidth="025"
                          borderColor="border"
                          borderRadius="200"
                          padding="300"
                        >
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                              gap: 16,
                            }}
                          >
                            <ColorField label="Background" value={bgColor} onChange={setBgColor} />
                            <ColorField label="Text color" value={textColor} onChange={setTextColor} />
                            <ColorField label="CTA background" value={ctaBgColor} onChange={setCtaBgColor} />
                            <ColorField label="CTA text color" value={ctaTextColor} onChange={setCtaTextColor} />
                            <ColorField label="Image outline" value={imageOutlineColor} onChange={setImageOutlineColor} />
                          </div>
                        </Box>
                      </BlockStack>

                      {/* Visible elements */}
                      <BlockStack gap="200">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                          Visible elements in {deviceLabel}
                        </Text>
                        {isMobile && (
                          <InlineStack gap="100" blockAlign="center">
                            <Text variant="bodySm">⊕</Text>
                            <Text variant="bodySm" tone="subdued">
                              Change this for desktop also.
                            </Text>
                          </InlineStack>
                        )}
                        <Box
                          borderWidth="025"
                          borderColor="border"
                          borderRadius="200"
                          padding="300"
                        >
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: "8px 16px",
                            }}
                          >
                            <Checkbox label="Product image" checked={showProductImage} onChange={setShowProductImage} />
                            <Checkbox label="Product title" checked={showProductTitle} onChange={setShowProductTitle} />
                            <Checkbox label="Price" checked={showPrice} onChange={setShowPrice} />
                            <Checkbox label="Compare at price" checked={showCompareAtPrice} onChange={setShowCompareAtPrice} />
                            <Checkbox label="Quantity" checked={showQuantity} onChange={setShowQuantity} />
                            <Checkbox label="Variant selector" checked={showVariantSelector} onChange={setShowVariantSelector} />
                            <Checkbox label="Variant label" checked={showVariantLabel} onChange={setShowVariantLabel} />
                            <Checkbox label="Price on CTA" checked={showPriceOnCta} onChange={setShowPriceOnCta} />
                            <Checkbox label="Compare at price on CTA" checked={showCompareAtPriceOnCta} onChange={setShowCompareAtPriceOnCta} />
                          </div>
                        </Box>
                      </BlockStack>
                    </BlockStack>
                  )}
                </BlockStack>
              </Card>

              {/* General Settings */}
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <InlineStack gap="200" blockAlign="center">
                      <span style={{ fontSize: 16 }}>⚙️</span>
                      <Text as="h2" variant="headingMd">General settings</Text>
                    </InlineStack>
                    <Button
                      variant="plain"
                      onClick={() => setGeneralCollapsed((v) => !v)}
                    >
                      {generalCollapsed ? "✦ Expand" : "✦ Collapse"}
                    </Button>
                  </InlineStack>

                  {!generalCollapsed && (
                    <BlockStack gap="400">

                      {/* CTA behavior */}
                      <BlockStack gap="200">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                          Call to action behavior
                        </Text>
                        <InlineStack gap="0">
                          <SegBtn
                            label="Add to cart"
                            active={ctaBehavior === "addToCart"}
                            onClick={() => setCtaBehavior("addToCart")}
                            first
                            noRightBorder
                          />
                          <SegBtn
                            label="Buy now / Go to checkout"
                            active={ctaBehavior === "buyNow"}
                            onClick={() => setCtaBehavior("buyNow")}
                            last
                          />
                        </InlineStack>

                        {ctaBehavior === "addToCart" && (
                          <Box
                            borderWidth="025"
                            borderColor="border"
                            borderRadius="200"
                            padding="300"
                          >
                            <Box style={{ maxWidth: 420 }}>
                              <Select
                                label="After item is added to cart"
                                options={[
                                  { label: "Open cart widget", value: "openCartWidget" },
                                  { label: "Go to checkout", value: "goToCheckout" },
                                  { label: "Show notification", value: "showNotification" },
                                  { label: "Nothing", value: "nothing" },
                                ]}
                                value={afterAddToCart}
                                onChange={setAfterAddToCart}
                              />
                            </Box>
                          </Box>
                        )}
                      </BlockStack>

                      <Divider />

                      {/* Product on home page */}
                      <BlockStack gap="200">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                          Product showcased on home page
                        </Text>
                        <InlineStack gap="300" blockAlign="center">
                          <Button onClick={openProductPicker}>
                            {homepageProductTitle
                              ? `↺ ${homepageProductTitle}`
                              : "↺ Select product"}
                          </Button>
                          {homepageProductId && (
                            <Button
                              variant="plain"
                              tone="critical"
                              onClick={() => {
                                setHomepageProductId("");
                                setHomepageProductTitle("");
                              }}
                            >
                              Clear
                            </Button>
                          )}
                        </InlineStack>
                      </BlockStack>

                      <Divider />

                      {/* Custom CSS */}
                      <BlockStack gap="200">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                          Custom CSS
                        </Text>
                        <TextField
                          label="Custom CSS"
                          labelHidden
                          value={customCss}
                          onChange={setCustomCss}
                          multiline={5}
                          autoComplete="off"
                        />
                      </BlockStack>

                      <Divider />

                      {/* Custom JavaScript */}
                      <BlockStack gap="200">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                          Add custom JavaScript
                        </Text>
                        <Box>
                          <Button
                            onClick={() => {
                              setJsEditorDraft(customJs);
                              setJsEditorOpen(true);
                            }}
                          >
                            {"</>"} Open script editor
                          </Button>
                        </Box>
                      </BlockStack>

                      <Divider />

                      {/* Z-index */}
                      <BlockStack gap="200">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                          Z-index
                        </Text>
                        <InlineStack gap="400">
                          <Box style={{ minWidth: 180 }}>
                            <TextField
                              label="Desktop"
                              type="number"
                              value={desktopZIndex}
                              onChange={setDesktopZIndex}
                              autoComplete="off"
                            />
                          </Box>
                          <Box style={{ minWidth: 180 }}>
                            <TextField
                              label="Mobile"
                              type="number"
                              value={mobileZIndex}
                              onChange={setMobileZIndex}
                              autoComplete="off"
                            />
                          </Box>
                        </InlineStack>
                      </BlockStack>

                    </BlockStack>
                  )}
                </BlockStack>
              </Card>

            </BlockStack>
          </Layout.Section>

          {/* ── Sidebar ── */}
          <Layout.Section variant="oneThird">
            <BlockStack gap="400">

              {/* Status */}
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">Status</Text>
                  <Select
                    label="Status"
                    labelHidden
                    options={[
                      { label: "Active", value: "active" },
                      { label: "Inactive", value: "inactive" },
                    ]}
                    value={status}
                    onChange={setStatus}
                  />
                </BlockStack>
              </Card>

              {/* Preview */}
              <Card>
                <BlockStack gap="300">
                  <InlineStack align="space-between" blockAlign="center">
                    <Box
                      background="bg-fill-info"
                      paddingBlock="100"
                      paddingInline="200"
                      borderRadius="100"
                    >
                      <Text as="span" variant="bodySm" fontWeight="semibold" tone="info">
                        {activeDevice === "mobile" ? "Mobile preview" : "Desktop preview"}
                      </Text>
                    </Box>
                  </InlineStack>
                  <CartBarPreview
                    isMobile={isMobile}
                    stickyPosition={stickyPosition}
                    bgColor={bgColor}
                    textColor={textColor}
                    ctaBgColor={ctaBgColor}
                    ctaTextColor={ctaTextColor}
                    imageOutlineColor={imageOutlineColor}
                    currencyCode={shopCurrencyCode}
                    showProductImage={showProductImage}
                    showProductTitle={showProductTitle}
                    showPrice={showPrice}
                    showCompareAtPrice={showCompareAtPrice}
                    showQuantity={showQuantity}
                    showVariantSelector={showVariantSelector}
                    showVariantLabel={showVariantLabel}
                    showPriceOnCta={showPriceOnCta}
                    showCompareAtPriceOnCta={showCompareAtPriceOnCta}
                  />
                </BlockStack>
              </Card>

            </BlockStack>
          </Layout.Section>
        </Layout>
      </Page>

      {/* JS editor modal */}
      <Modal
        open={jsEditorOpen}
        onClose={handleJsUndo}
        title="Add custom JavaScript"
        primaryAction={{ content: "Done", onAction: handleJsDone }}
        secondaryActions={[
          { content: "Close & Undo Changes", onAction: handleJsUndo },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="300">
            <Box
              background="bg-surface-secondary"
              padding="300"
              borderRadius="200"
            >
              <InlineStack gap="200" blockAlign="start">
                <Text as="p" variant="bodySm">
                 ℹ This JavaScript code will be executed while the Cart Widget is rendering — no
                  need for <code>&lt;script&gt;</code> tags.
                </Text>
              </InlineStack>
            </Box>
            <TextField
              label="Custom JavaScript"
              labelHidden
              value={jsEditorDraft}
              onChange={setJsEditorDraft}
              multiline={12}
              autoComplete="off"
              placeholder={"!! HOW IT WORKS !!\nThis JavaScript code will be executed while Cart Widget is rendering — no need for <script> tags."}
            />
          </BlockStack>
        </Modal.Section>
      </Modal>

      {/* Product picker modal */}
      <Modal
        open={productPickerOpen}
        onClose={() => setProductPickerOpen(false)}
        title="Select product for home page"
        primaryAction={{
          content: "Close",
          onAction: () => setProductPickerOpen(false),
        }}
      >
        <Modal.Section>
          {productsLoading ? (
            <InlineStack align="center">
              <Text tone="subdued">Loading products…</Text>
            </InlineStack>
          ) : products.length === 0 ? (
            <Text tone="subdued">No products found.</Text>
          ) : (
            <BlockStack gap="200">
              {products.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setHomepageProductId(p.id);
                    setHomepageProductTitle(p.title);
                    setProductPickerOpen(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "8px 12px",
                    border: "1px solid #e1e5eb",
                    borderRadius: 4,
                    background: homepageProductId === p.id ? "#f1f5f9" : "#fff",
                    cursor: "pointer",
                    textAlign: "left",
                    width: "100%",
                  }}
                >
                  {p.image && (
                    <img
                      src={p.image}
                      alt={p.title}
                      style={{
                        width: 40,
                        height: 40,
                        objectFit: "cover",
                        borderRadius: 4,
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <Text>{p.title}</Text>
                </button>
              ))}
            </BlockStack>
          )}
        </Modal.Section>
      </Modal>
    </Frame>
  );
}

// ─── Cart bar preview widget ──────────────────────────────────────────────────
function CartBarPreview({
  isMobile,
  stickyPosition,
  bgColor,
  textColor,
  ctaBgColor,
  ctaTextColor,
  imageOutlineColor,
  currencyCode,
  showProductImage,
  showProductTitle,
  showPrice,
  showCompareAtPrice,
  showQuantity,
  showVariantSelector,
  showVariantLabel,
  showPriceOnCta,
  showCompareAtPriceOnCta,
}) {
  const price = formatPreviewMoney(2999, currencyCode);
  const comparePrice = formatPreviewMoney(3999, currencyCode);
  const tc = textColor || "#111827";
  const isBottom = stickyPosition !== "top";

  const barEl = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        background: bgColor || "#ffffff",
        padding: "9px 12px",
        boxShadow: isBottom
          ? "0 -3px 12px rgba(0,0,0,.12)"
          : "0 3px 12px rgba(0,0,0,.12)",
        borderTop: isBottom ? "1px solid rgba(0,0,0,.08)" : "none",
        borderBottom: !isBottom ? "1px solid rgba(0,0,0,.08)" : "none",
        minWidth: 0,
      }}
    >
      {/* Product image */}
      {showProductImage && (
        <div
          style={{
            width: 38, height: 38, flexShrink: 0,
            borderRadius: 6, overflow: "hidden",
            border: `1.5px solid ${imageOutlineColor || "#e5e7eb"}`,
            background: "#f3f4f6",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20,
          }}
        >
          👟
        </div>
      )}

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
        {showProductTitle && (
          <div style={{
            fontSize: 11, fontWeight: 700, color: tc, marginBottom: 2,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            lineHeight: 1.2,
          }}>
            Sample Product
          </div>
        )}
        {(showCompareAtPrice || showPrice) && (
          <div style={{ display: "flex", gap: 4, alignItems: "baseline", flexWrap: "nowrap", overflow: "hidden" }}>
            {showCompareAtPrice && (
              <span style={{
                fontSize: 10, color: "#9ca3af", textDecoration: "line-through",
                whiteSpace: "nowrap", flexShrink: 0,
              }}>
                {comparePrice}
              </span>
            )}
            {showPrice && (
              <span style={{
                fontSize: 11, color: tc, fontWeight: 700,
                whiteSpace: "nowrap", flexShrink: 0,
              }}>
                {price}
              </span>
            )}
          </div>
        )}
        {showVariantSelector && (
          <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 3 }}>
            {showVariantLabel && (
              <span style={{ fontSize: 9, color: "#9ca3af", flexShrink: 0 }}>Size:</span>
            )}
            <div style={{
              fontSize: 9, background: "rgba(255,255,255,0.15)",
              border: `1px solid ${tc}33`, borderRadius: 3,
              padding: "1px 5px", color: tc, whiteSpace: "nowrap",
            }}>
              M ▾
            </div>
          </div>
        )}
      </div>

      {/* Quantity */}
      {showQuantity && (
        <div style={{
          display: "flex", alignItems: "center",
          border: `1px solid ${tc}44`, borderRadius: 4, overflow: "hidden",
          flexShrink: 0,
        }}>
          {["−", "1", "+"].map((v, i) => (
            <div key={i} style={{
              width: i === 1 ? 18 : 20, height: 26,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, color: tc,
              background: i === 1 ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.5)",
              borderLeft: i > 0 ? `1px solid ${tc}33` : "none",
              fontWeight: i === 1 ? 600 : 400,
            }}>{v}</div>
          ))}
        </div>
      )}

      {/* CTA */}
      <div style={{
        background: ctaBgColor || "#111827",
        color: ctaTextColor || "#fff",
        borderRadius: 5,
        padding: showPriceOnCta || showCompareAtPriceOnCta ? "5px 10px" : "8px 12px",
        fontSize: 10, fontWeight: 700,
        whiteSpace: "nowrap", flexShrink: 0,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
        lineHeight: 1.3,
        boxShadow: "0 1px 4px rgba(0,0,0,.2)",
      }}>
        <span style={{ fontSize: 11 }}>Add to cart</span>
        {(showPriceOnCta || showCompareAtPriceOnCta) && (
          <span style={{ display: "flex", gap: 3, alignItems: "center" }}>
            {showCompareAtPriceOnCta && (
              <span style={{ fontSize: 8, opacity: 0.6, textDecoration: "line-through" }}>
                {comparePrice}
              </span>
            )}
            {showPriceOnCta && <span style={{ fontSize: 9, fontWeight: 600 }}>{price}</span>}
          </span>
        )}
      </div>
    </div>
  );

  // Phone frame outer shell
  const phoneShellStyle = isMobile ? {
    width: "100%",
    maxWidth: 300,
    margin: "0 auto",
    background: "#1c1c1e",
    borderRadius: 36,
    padding: "10px 8px",
    boxShadow: "0 8px 32px rgba(0,0,0,.28), 0 0 0 1px rgba(255,255,255,.06) inset",
  } : null;

  const screenStyle = isMobile ? {
    borderRadius: 28,
    overflow: "hidden",
    background: "#f9fafb",
    display: "flex",
    flexDirection: "column",
    minHeight: 360,
  } : {
    width: "100%",
    maxWidth: 420,
    margin: "0 auto",
    border: "1.5px solid #c9ccd0",
    borderRadius: 10,
    overflow: "hidden",
    background: "#f9fafb",
    display: "flex",
    flexDirection: "column",
    minHeight: 270,
    boxShadow: "0 4px 16px rgba(0,0,0,.10)",
  };

  const screen = (
    <div style={screenStyle}>
      {/* Mobile status bar */}
      {isMobile && (
        <div style={{
          height: 32, background: "#f9fafb",
          display: "flex", alignItems: "center",
          justifyContent: "space-between",
          padding: "0 14px",
        }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: "#111" }}>9:41</span>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <div style={{ fontSize: 9, color: "#111" }}>●●●</div>
          </div>
        </div>
      )}
      {/* Desktop browser chrome */}
      {!isMobile && (
        <div style={{
          height: 26, background: "#f0f0f0",
          display: "flex", alignItems: "center", gap: 5, padding: "0 10px",
          borderBottom: "1px solid #d1d5db", flexShrink: 0,
        }}>
          {["#ef4444", "#f59e0b", "#22c55e"].map((c) => (
            <div key={c} style={{ width: 9, height: 9, borderRadius: "50%", background: c }} />
          ))}
          <div style={{
            flex: 1, height: 14, background: "#fff",
            borderRadius: 3, border: "1px solid #d1d5db",
            marginLeft: 6, marginRight: 4,
          }} />
        </div>
      )}

      {!isBottom && barEl}

      {/* Page content mock (product page) */}
      <div style={{ flex: 1, padding: "10px 12px", overflow: "hidden", background: "#fff" }}>
        {/* Product image placeholder */}
        <div style={{
          width: "100%", height: isMobile ? 110 : 140,
          background: "linear-gradient(135deg,#e2e8f0 60%,#cbd5e1)",
          borderRadius: 8, marginBottom: 10,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: isMobile ? 36 : 48, opacity: 0.3 }}>🖼</span>
        </div>
        {/* Product title lines */}
        <div style={{ width: "70%", height: 8, background: "#94a3b8", borderRadius: 3, marginBottom: 5 }} />
        <div style={{ width: "45%", height: 7, background: "#cbd5e1", borderRadius: 3, marginBottom: 10 }} />
        {/* ATC button placeholder */}
        <div style={{ width: "100%", height: 28, background: "#334155", borderRadius: 5, marginBottom: 10, opacity: 0.18 }} />
        {/* Description lines */}
        {[88, 72, 80].map((w, i) => (
          <div key={i} style={{ width: `${w}%`, height: 5, background: "#e2e8f0", borderRadius: 2, marginBottom: 5 }} />
        ))}
      </div>

      {isBottom && barEl}

      {/* Mobile home bar */}
      {isMobile && (
        <div style={{
          height: 20, background: "#f9fafb",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ width: 60, height: 4, background: "#c9ccd0", borderRadius: 3 }} />
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <div style={phoneShellStyle}>
        {/* Notch pill */}
        <div style={{
          display: "flex", justifyContent: "center",
          marginBottom: 4,
        }}>
          <div style={{ width: 80, height: 6, background: "#3a3a3c", borderRadius: 4 }} />
        </div>
        {screen}
        {/* Home indicator inside shell */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
          <div style={{ width: 60, height: 4, background: "#3a3a3c", borderRadius: 3 }} />
        </div>
      </div>
    );
  }

  return screen;
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}
export const headers = (headersArgs) => boundary.headers(headersArgs);
