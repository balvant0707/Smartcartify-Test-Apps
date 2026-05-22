// app/routes/app.customize-preview.jsx
import { useState } from "react";
import {
  useNavigate, useSearchParams, useSubmit,
  useActionData, useLoaderData, useNavigation,
} from "react-router";
import {
  Page, Text, Box, BlockStack, InlineStack, Button,
  TextField, Select, Checkbox, Collapsible, Divider,
  Icon, Banner, DropZone,
} from "@shopify/polaris";
import {
  ThemeIcon, MinimizeIcon, MaximizeIcon,
  ColorIcon, SettingsIcon, CartIcon,
} from "@shopify/polaris-icons";
import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import prisma from "../db.server";
import { invalidateShopCache } from "./app.proxy.smart.jsx";

// ─── File upload constants ────────────────────────────────────────────────────

const CART_ICON_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "cart-icons");
const APP_PUBLIC_URL = (process.env.APP_URL || process.env.SHOPIFY_APP_URL || "").replace(/\/+$/, "");
const CART_ICON_PUBLIC_PATH = "/uploads/cart-icons";
const CART_ICON_MAX_BYTES = 2 * 1024 * 1024;
const CART_ICON_ALLOWED_TYPES = new Map([
  ["image/png", "png"], ["image/jpeg", "jpg"], ["image/webp", "webp"],
  ["image/svg+xml", "svg"], ["image/gif", "gif"],
]);

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_STYLE = {
  base: "12",
  headingScale: "1.25",
  radius: "0",
  textColor: "#000000",
  bg: "#ffffff",
  progress: "#000000",
  buttonColor: "#000000",
  buttonLabelColor: "#ffffff",
  borderColor: "#E1E5ED",
  iconColor: "#000000",
  announcementBarBackgroundColor: "#000000",
  announcementBarTextColor: "#ffffff",
  announcementBarText: "Free shipping on orders over $50! 🎉",
  cartDrawerBackgroundMode: "color",
  cartDrawerBackground: "#ffffff",
  cartDrawerImage: "",
  cartDrawerGradientStart: "#ffffff",
  cartDrawerGradientEnd: "#f9f9f9",
  cartDrawerTextColor: "#000000",
  cartDrawerHeaderColor: "#000000",
  cartIconUrl: "",
  discountCodeApply: false,
  checkoutButtonText: "Checkout",
  drawerAutoOpen: true,
  drawerPosition: "right",
  stickyCheckout: true,
  mobileLayout: "drawer",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const json = (data, init = {}) =>
  new Response(JSON.stringify(data), {
    status: init.status || 200,
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
  });

const uploadCartIconFile = async (file) => {
  if (!file || typeof file.arrayBuffer !== "function") throw new Error("Please select an image file.");
  const type = String(file.type || "").toLowerCase();
  const ext = CART_ICON_ALLOWED_TYPES.get(type);
  if (!ext) throw new Error("Upload a PNG, JPG, WebP, GIF, or SVG image.");
  if (Number(file.size || 0) > CART_ICON_MAX_BYTES) throw new Error("Cart icon must be 2 MB or smaller.");
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!buffer.length) throw new Error("The selected image is empty.");
  await mkdir(CART_ICON_UPLOAD_DIR, { recursive: true });
  const filename = `${randomUUID()}.${ext}`;
  await writeFile(path.join(CART_ICON_UPLOAD_DIR, filename), buffer);
  const publicPath = `${CART_ICON_PUBLIC_PATH}/${filename}`;
  return APP_PUBLIC_URL ? `${APP_PUBLIC_URL}${publicPath}` : publicPath;
};

const ensureCartIconColumn = async () => {
  try {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE `stylesettings` ADD COLUMN `cartIconUrl` VARCHAR(191) NULL"
    );
  } catch (err) {
    const msg = String(err?.message || "");
    if (msg.includes("Duplicate column") || msg.includes("1060") || String(err?.code || "") === "P2010") return;
    throw err;
  }
};

const loadCartIconUrl = async (styleRow) => {
  if (!styleRow?.shop || styleRow.cartIconUrl) return styleRow;
  try {
    await ensureCartIconColumn();
    const rows = await prisma.$queryRaw`SELECT cartIconUrl FROM stylesettings WHERE id = ${styleRow.id} LIMIT 1`;
    return { ...styleRow, cartIconUrl: (Array.isArray(rows) ? rows[0]?.cartIconUrl : null) || "" };
  } catch { return styleRow; }
};

const saveCartIconUrl = async (shop, cartIconUrl) => {
  await ensureCartIconColumn();
  await prisma.$executeRaw`UPDATE stylesettings SET cartIconUrl = ${cartIconUrl} WHERE shop = ${shop}`;
};

// ─── Loader ───────────────────────────────────────────────────────────────────

export const loader = async ({ request }) => {
  const { authenticate } = await import("../shopify.server");
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const [styleRow, shippingRules, discountRules, freeGiftRules, upsellSettings] = await Promise.all([
    prisma.styleSettings.findFirst({ where: { shop }, orderBy: { id: "desc" } }),
    prisma.shippingRule.findMany({
      where: { shop, enabled: true },
      orderBy: { id: "asc" },
      select: { progressTextBefore: true, progressTextAfter: true, minSubtotal: true, cartStepName: true },
    }),
    prisma.discountRule.findMany({
      where: { shop, enabled: true, type: { not: "code" } },
      orderBy: { id: "asc" },
      select: { progressTextBefore: true, progressTextAfter: true, minPurchase: true, value: true, valueType: true, cartStepName: true },
    }),
    prisma.freeGiftRule.findMany({
      where: { shop, enabled: true },
      orderBy: { id: "asc" },
      select: { progressTextBefore: true, progressTextAfter: true, minPurchase: true, cartStepName: true },
    }),
    prisma.upsellSettings.findUnique({ where: { shop } }).catch(() => null),
  ]);

  const styleWithIcon = await loadCartIconUrl(styleRow);

  return {
    style: styleWithIcon || null,
    shippingRules: shippingRules || [],
    discountRules: discountRules || [],
    freeGiftRules: freeGiftRules || [],
    upsellSettings: upsellSettings || null,
    shop,
  };
};

// ─── Action ───────────────────────────────────────────────────────────────────

export const action = async ({ request }) => {
  const { authenticate } = await import("../shopify.server");
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  if (request.headers.get("content-type")?.includes("multipart/form-data")) {
    try {
      const formData = await request.formData();
      const cartIconUrl = await uploadCartIconFile(formData.get("cartIcon"));
      return json({ ok: true, cartIconUrl });
    } catch (err) {
      return json({ ok: false, error: err.message }, { status: 400 });
    }
  }

  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid payload" }, { status: 400 }); }

  const d = body ?? {};
  const parseText = (v) => typeof v === "string" && v.trim() ? v.trim() : null;
  const modeRaw = String(d.cartDrawerBackgroundMode || "").toLowerCase();
  const mode = ["image", "gradient"].includes(modeRaw) ? modeRaw : "color";

  const settings = {
    base: d.base || DEFAULT_STYLE.base,
    headingScale: d.headingScale || DEFAULT_STYLE.headingScale,
    radius: d.radius || DEFAULT_STYLE.radius,
    textColor: parseText(d.textColor) || DEFAULT_STYLE.textColor,
    bg: parseText(d.bg) || DEFAULT_STYLE.bg,
    progress: parseText(d.progress) || DEFAULT_STYLE.progress,
    buttonColor: parseText(d.buttonColor) || DEFAULT_STYLE.buttonColor,
    buttonLabelColor: parseText(d.buttonLabelColor) || DEFAULT_STYLE.buttonLabelColor,
    borderColor: parseText(d.borderColor) || DEFAULT_STYLE.borderColor,
    iconColor: parseText(d.iconColor) || DEFAULT_STYLE.iconColor,
    announcementBarBackgroundColor: parseText(d.announcementBarBackgroundColor) || DEFAULT_STYLE.announcementBarBackgroundColor,
    announcementBarTextColor: parseText(d.announcementBarTextColor) || DEFAULT_STYLE.announcementBarTextColor,
    announcementBarText: parseText(d.announcementBarText) || DEFAULT_STYLE.announcementBarText,
    cartDrawerBackgroundMode: mode,
    cartDrawerBackground: mode === "color" ? (parseText(d.cartDrawerBackground) || DEFAULT_STYLE.cartDrawerBackground) : null,
    cartDrawerImage: mode === "image" ? parseText(d.cartDrawerImage) : null,
    cartDrawerTextColor: parseText(d.cartDrawerTextColor) || DEFAULT_STYLE.cartDrawerTextColor,
    cartDrawerHeaderColor: parseText(d.cartDrawerHeaderColor) || DEFAULT_STYLE.cartDrawerHeaderColor,
    discountCodeApply: Boolean(d.discountCodeApply),
    checkoutButtonText: parseText(d.checkoutButtonText) || DEFAULT_STYLE.checkoutButtonText,
    drawerAutoOpen: Boolean(d.drawerAutoOpen),
    drawerPosition: ["right", "left"].includes(String(d.drawerPosition)) ? String(d.drawerPosition) : DEFAULT_STYLE.drawerPosition,
    stickyCheckout: Boolean(d.stickyCheckout),
    mobileLayout: ["drawer", "bottom_sheet"].includes(String(d.mobileLayout)) ? String(d.mobileLayout) : DEFAULT_STYLE.mobileLayout,
  };
  const cartIconUrl = parseText(d.cartIconUrl) || null;

  try {
    const updated = await prisma.styleSettings.updateMany({ where: { shop }, data: settings });
    if (updated.count === 0) await prisma.styleSettings.create({ data: { shop, ...settings } });
    if (cartIconUrl) await saveCartIconUrl(shop, cartIconUrl);
    invalidateShopCache(shop);
    return json({ success: true });
  } catch (err) {
    return json({ error: err.message }, { status: 500 });
  }
};

// ─── SectionCard ─────────────────────────────────────────────────────────────

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

// ─── ColorField ───────────────────────────────────────────────────────────────

function ColorField({ label, value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
      <input
        type="color"
        value={value || "#000000"}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: 36, height: 36, padding: 2, border: "1px solid #e1e3e5", borderRadius: 6, cursor: "pointer", flexShrink: 0 }}
        title={label}
      />
      <div style={{ flex: 1, minWidth: 90 }}>
        <TextField label={label} value={value || ""} onChange={onChange} autoComplete="off" />
      </div>
    </div>
  );
}

// ─── Cart drawer preview ──────────────────────────────────────────────────────

function fmtAmount(val) {
  const n = parseFloat(val);
  return isNaN(n) ? "$20" : `$${n % 1 === 0 ? n : n.toFixed(2)}`;
}

function resolveStepText(textBefore, amount) {
  if (!textBefore) return null;
  return textBefore.replace(/\{\{amount\}\}/gi, fmtAmount(amount));
}

function CartDrawerPreview({
  bg, textColor, headerColor, buttonColor, buttonLabelColor, progress, radius, checkoutText,
  announcementBg, announcementText, announcementBarText,
  shippingRules, discountRules, freeGiftRules, upsellSettings,
  drawerBgMode, drawerImage,
}) {
  const r = Number(radius) || 0;
  const tc = textColor || "#000";
  const hc = headerColor || "#1a1a1a";
  const bc = buttonColor || "#000";
  const blc = buttonLabelColor || "#fff";
  const pc = progress || "#000";

  // Build milestone list: freeGift → discount → shipping order
  const milestones = [];
  (freeGiftRules || []).forEach((rule) =>
    milestones.push({ label: rule.cartStepName || rule.progressTextAfter || "Free Gift!!", icon: "🎁" })
  );
  (discountRules || []).forEach((rule) =>
    milestones.push({ label: rule.cartStepName || rule.progressTextAfter || `${rule.value || "20"}% Off!`, icon: "%" })
  );
  (shippingRules || []).forEach((rule) =>
    milestones.push({ label: rule.cartStepName || rule.progressTextAfter || "Free Shipping!", icon: "🚚" })
  );
  if (milestones.length === 0) milestones.push({ label: "Free Shipping!", icon: "🚚" });

  // Evenly distribute milestone positions across the bar
  const milestonePcts = milestones.map((_, i) =>
    Math.round(((i + 1) / (milestones.length + 1)) * 100)
  );
  const progressFill = 30; // static fill % for preview

  // Next-goal label above the bar
  const firstFG = (freeGiftRules || [])[0];
  const firstSH = (shippingRules || [])[0];
  const nextGoalText = firstFG
    ? resolveStepText(firstFG.progressTextBefore, firstFG.minPurchase) || "Add more to get Free Gift with this order"
    : firstSH
    ? resolveStepText(firstSH.progressTextBefore, firstSH.minSubtotal) || "Add more to get Free Shipping"
    : "Add more to get Free Shipping with this order";

  // Free gift item (shown as a locked reward row below cart items)
  const hasFreeGift = (freeGiftRules || []).length > 0;
  const fgRule = freeGiftRules?.[0];
  const fgLabel = fgRule?.cartStepName || "Free Gift!!";
  const fgText =
    resolveStepText(fgRule?.progressTextBefore, fgRule?.minPurchase) ||
    "Add more to get Free Gift with this order";

  const showUpsell = upsellSettings?.enabled === true;

  // Header background: image if configured
  const headerHasImage = drawerBgMode === "image" && drawerImage;
  const headerBgStyle = headerHasImage
    ? { backgroundImage: `url(${drawerImage})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: bg || "#f5f0e8" };

  return (
    <div style={{ border: "1px solid #e1e3e5", borderRadius: 12, overflow: "hidden", background: bg || "#fff", fontSize: 12, userSelect: "none" }}>

      {/* ── Header with optional bg image ── */}
      <div style={{ ...headerBgStyle, padding: "14px 14px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: hc, fontWeight: 700, fontSize: 16, textShadow: headerHasImage ? "0 1px 4px rgba(0,0,0,0.5)" : "none" }}>
          Cart
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.88)", borderRadius: 20, padding: "3px 10px", fontSize: 11, color: "#333", fontWeight: 500, cursor: "pointer" }}>
          <span>✕</span><span>Close</span>
        </div>
      </div>

      {/* ── Announcement bar ── */}
      <div style={{ background: announcementBg || "#fff8f0", padding: "6px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <span style={{ color: announcementText || "#c0392b", fontSize: 11, fontWeight: 500 }}>
          {announcementBarText || "Cart Announcement Goes here"}
        </span>
        <span style={{ color: announcementText || "#c0392b", fontSize: 11 }}>▶</span>
      </div>

      {/* ── Progress section ── */}
      <div style={{ padding: "10px 14px 4px", background: bg || "#fff" }}>
        <div style={{ fontSize: 11, color: tc, textAlign: "center", marginBottom: 9, opacity: 0.85 }}>
          {nextGoalText}
        </div>
        {/* Track + milestone circles */}
        <div style={{ position: "relative", height: 28, marginBottom: 4 }}>
          <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 6, background: "#e5e7eb", borderRadius: 999, transform: "translateY(-50%)" }}>
            <div style={{ height: "100%", width: `${progressFill}%`, background: pc, borderRadius: 999 }} />
          </div>
          {milestonePcts.map((pct, i) => (
            <div key={i} style={{ position: "absolute", top: "50%", left: `${pct}%`, transform: "translate(-50%, -50%)", width: 20, height: 20, borderRadius: "50%", background: pct <= progressFill ? pc : "#e5e7eb", border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, boxShadow: "0 1px 3px rgba(0,0,0,0.18)", zIndex: 1 }}>
              {milestones[i].icon}
            </div>
          ))}
        </div>
        {/* Milestone labels */}
        <div style={{ position: "relative", height: 16 }}>
          {milestonePcts.map((pct, i) => (
            <div key={i} style={{ position: "absolute", left: `${pct}%`, transform: "translateX(-50%)", fontSize: 9, color: tc, opacity: 0.7, textAlign: "center", whiteSpace: "nowrap", maxWidth: 58, overflow: "hidden", textOverflow: "ellipsis" }}>
              {milestones[i].label}
            </div>
          ))}
        </div>
      </div>

      {/* ── Cart item ── */}
      <div style={{ padding: "10px 14px", display: "flex", gap: 10, alignItems: "flex-start", borderTop: "1px solid rgba(0,0,0,0.07)" }}>
        <div style={{ width: 50, height: 50, background: "#f0f0f0", borderRadius: 8, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: tc }}>Sample Product</span>
            <span style={{ color: "#bbb", fontSize: 13, cursor: "pointer", marginLeft: 6, lineHeight: 1 }}>✕</span>
          </div>
          <div style={{ fontSize: 10, color: tc, opacity: 0.55, marginTop: 2 }}>Small</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 7 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f3f4f6", borderRadius: 20, padding: "3px 10px" }}>
              <span style={{ color: tc, fontSize: 14, lineHeight: 1, fontWeight: 500 }}>−</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: tc, minWidth: 12, textAlign: "center" }}>1</span>
              <span style={{ color: tc, fontSize: 14, lineHeight: 1, fontWeight: 500 }}>+</span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: tc }}>300 INR</span>
          </div>
        </div>
      </div>

      {/* ── Free gift reward row ── */}
      {hasFreeGift && (
        <div style={{ padding: "8px 14px", display: "flex", gap: 10, alignItems: "center", borderTop: "1px solid rgba(0,0,0,0.07)" }}>
          <div style={{ width: 42, height: 42, background: "#f0f0f0", borderRadius: 8, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: tc }}>{fgLabel}</div>
            <div style={{ fontSize: 10, color: tc, opacity: 0.55, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fgText}</div>
            <div style={{ display: "flex", gap: 4, marginTop: 5 }}>
              {[0, 1, 2].map((n) => (
                <div key={n} style={{ width: 6, height: 6, borderRadius: "50%", background: n === 0 ? pc : "#ddd" }} />
              ))}
            </div>
          </div>
          <div style={{ width: 24, height: 24, borderRadius: "50%", border: "1px solid #ddd", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#999", flexShrink: 0, cursor: "pointer" }}>▶</div>
        </div>
      )}

      {/* ── Upsell section ── */}
      {showUpsell && (
        <div style={{ padding: "8px 14px 10px", borderTop: "1px solid rgba(0,0,0,0.07)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: tc, textAlign: "center", marginBottom: 8 }}>You may also like...</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#ccc", fontSize: 14, lineHeight: 1, cursor: "pointer" }}>◀</span>
            <div style={{ width: 38, height: 38, background: "#2d2d2d", borderRadius: 8, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: tc }}>Gray Jordans</div>
              <div style={{ fontSize: 10, color: tc, opacity: 0.55 }}>300 INR</div>
            </div>
            <div style={{ background: bc, color: blc, borderRadius: Math.max(r, 4), padding: "5px 12px", fontSize: 10, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>Add</div>
            <span style={{ color: "#ccc", fontSize: 14, lineHeight: 1, cursor: "pointer" }}>▶</span>
          </div>
          <div style={{ display: "flex", gap: 3, justifyContent: "center", marginTop: 7 }}>
            {Array.from({ length: 6 }).map((_, n) => (
              <div key={n} style={{ width: 6, height: 6, borderRadius: "50%", background: n === 0 ? pc : "#e5e7eb" }} />
            ))}
          </div>
        </div>
      )}

      {/* ── Total + Checkout footer ── */}
      <div style={{ display: "flex", alignItems: "stretch", borderTop: "1px solid rgba(0,0,0,0.1)" }}>
        <div style={{ flex: 1, padding: "10px 14px" }}>
          <div style={{ fontSize: 10, color: tc, opacity: 0.55 }}>Total</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: tc }}>327 INR</div>
        </div>
        <div style={{ background: bc, color: blc, padding: "0 18px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, cursor: "pointer", minWidth: 110 }}>
          {checkoutText || "Checkout"}
        </div>
      </div>

    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CustomizePreview() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const host = searchParams.get("host");
  const withHost = (p) => host ? `${p}?host=${encodeURIComponent(host)}` : p;

  const loaderData = useLoaderData() ?? {};
  const actionData = useActionData();
  const navigation = useNavigation();
  const submit = useSubmit();
  const s = loaderData?.style || {};
  const shippingRules = loaderData?.shippingRules || [];
  const discountRules = loaderData?.discountRules || [];
  const freeGiftRules = loaderData?.freeGiftRules || [];
  const upsellSettings = loaderData?.upsellSettings || null;
  const isSaving = navigation.state === "submitting";

  // Typography & Sizes
  const [base, setBase] = useState(s.base ?? DEFAULT_STYLE.base);
  const [headingScale, setHeadingScale] = useState(s.headingScale ?? DEFAULT_STYLE.headingScale);
  const [radius, setRadius] = useState(s.radius ?? DEFAULT_STYLE.radius);

  // Colors
  const [textColor, setTextColor] = useState(s.textColor ?? DEFAULT_STYLE.textColor);
  const [bg, setBg] = useState(s.bg ?? DEFAULT_STYLE.bg);
  const [progress, setProgress] = useState(s.progress ?? DEFAULT_STYLE.progress);
  const [buttonColor, setButtonColor] = useState(s.buttonColor ?? DEFAULT_STYLE.buttonColor);
  const [buttonLabelColor, setButtonLabelColor] = useState(s.buttonLabelColor ?? DEFAULT_STYLE.buttonLabelColor);
  const [borderColor, setBorderColor] = useState(s.borderColor ?? DEFAULT_STYLE.borderColor);
  const [iconColor, setIconColor] = useState(s.iconColor ?? DEFAULT_STYLE.iconColor);
  const [announcementBg, setAnnouncementBg] = useState(s.announcementBarBackgroundColor ?? DEFAULT_STYLE.announcementBarBackgroundColor);
  const [announcementText, setAnnouncementText] = useState(s.announcementBarTextColor ?? DEFAULT_STYLE.announcementBarTextColor);
  const [announcementBarMsg, setAnnouncementBarMsg] = useState(s.announcementBarText ?? DEFAULT_STYLE.announcementBarText);

  // Checkout
  const [checkoutButtonText, setCheckoutButtonText] = useState(s.checkoutButtonText ?? DEFAULT_STYLE.checkoutButtonText);
  const [discountCodeApply, setDiscountCodeApply] = useState(s.discountCodeApply ?? DEFAULT_STYLE.discountCodeApply);

  // Cart icon
  const [cartIconUrl, setCartIconUrl] = useState(s.cartIconUrl ?? "");
  const [cartIconUploading, setCartIconUploading] = useState(false);
  const [cartIconError, setCartIconError] = useState("");

  // Cart Drawer
  const [drawerBgMode, setDrawerBgMode] = useState(s.cartDrawerBackgroundMode ?? DEFAULT_STYLE.cartDrawerBackgroundMode);
  const [drawerBg, setDrawerBg] = useState(s.cartDrawerBackground ?? DEFAULT_STYLE.cartDrawerBackground);
  const [drawerImage, setDrawerImage] = useState(s.cartDrawerImage ?? "");
  const [drawerGradientStart, setDrawerGradientStart] = useState(s.cartDrawerGradientStart ?? DEFAULT_STYLE.cartDrawerGradientStart);
  const [drawerGradientEnd, setDrawerGradientEnd] = useState(s.cartDrawerGradientEnd ?? DEFAULT_STYLE.cartDrawerGradientEnd);
  const [drawerTextColor, setDrawerTextColor] = useState(s.cartDrawerTextColor ?? DEFAULT_STYLE.cartDrawerTextColor);
  const [drawerHeaderColor, setDrawerHeaderColor] = useState(s.cartDrawerHeaderColor ?? DEFAULT_STYLE.cartDrawerHeaderColor);
  const [drawerAutoOpen, setDrawerAutoOpen] = useState(s.drawerAutoOpen ?? DEFAULT_STYLE.drawerAutoOpen);
  const [drawerPosition, setDrawerPosition] = useState(s.drawerPosition ?? DEFAULT_STYLE.drawerPosition);
  const [stickyCheckout, setStickyCheckout] = useState(s.stickyCheckout ?? DEFAULT_STYLE.stickyCheckout);
  const [mobileLayout, setMobileLayout] = useState(s.mobileLayout ?? DEFAULT_STYLE.mobileLayout);

  const handleCartIconDrop = async (_files, accepted) => {
    const file = accepted?.[0];
    if (!file) return;
    setCartIconUploading(true);
    setCartIconError("");
    try {
      const fd = new FormData();
      fd.append("cartIcon", file);
      fd.append("intent", "uploadCartIcon");
      const res = await fetch(window.location.pathname, { method: "POST", body: fd });
      const data = await res.json();
      if (data.ok && data.cartIconUrl) setCartIconUrl(data.cartIconUrl);
      else setCartIconError(data.error || "Upload failed.");
    } catch { setCartIconError("Upload failed. Please try again."); }
    finally { setCartIconUploading(false); }
  };

  const handleSave = () => {
    submit({
      base, headingScale, radius,
      textColor, bg, progress, buttonColor, buttonLabelColor, borderColor, iconColor,
      announcementBarBackgroundColor: announcementBg, announcementBarTextColor: announcementText, announcementBarText: announcementBarMsg,
      checkoutButtonText, discountCodeApply,
      cartIconUrl,
      cartDrawerBackgroundMode: drawerBgMode,
      cartDrawerBackground: drawerBg,
      cartDrawerImage: drawerImage,
      cartDrawerGradientStart: drawerGradientStart,
      cartDrawerGradientEnd: drawerGradientEnd,
      cartDrawerTextColor: drawerTextColor,
      cartDrawerHeaderColor: drawerHeaderColor,
      drawerAutoOpen, drawerPosition, stickyCheckout, mobileLayout,
    }, { method: "post", encType: "application/json" });
  };

  const previewBg = drawerBgMode === "color" ? (drawerBg || "#fff") : drawerBgMode === "gradient" ? `linear-gradient(180deg, ${drawerGradientStart}, ${drawerGradientEnd})` : "#fff";

  return (
    <Page
      backAction={{ content: "Campaigns", onAction: () => navigate(withHost("/app/campaigns")) }}
      title="Customize & Preview"
      primaryAction={{ content: "Save", loading: isSaving, onAction: handleSave }}
    >
      <style>{`.cp-layout{display:grid;grid-template-columns:1fr 420px;gap:24px;align-items:start}@media(max-width:1000px){.cp-layout{grid-template-columns:1fr}}.cp-color-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:16px}.cp-preview-sticky{position:sticky;top:80px}`}</style>

      {actionData?.error && (
        <Box paddingBlockEnd="400">
          <Banner tone="critical" title="Save failed">{actionData.error}</Banner>
        </Box>
      )}
      {actionData?.success && (
        <Box paddingBlockEnd="400">
          <Banner tone="success" title="Saved">Customizations saved successfully.</Banner>
        </Box>
      )}

      <Box paddingBlockEnd="800">
        <div className="cp-layout">

          {/* ── Main column ── */}
          <BlockStack gap="400">

            {/* Typography & Sizes */}
            <SectionCard icon={ThemeIcon} title="Typography & Sizes">
              <BlockStack gap="400">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                  <TextField
                    label="Base size (px)"
                    value={base}
                    onChange={setBase}
                    autoComplete="off"
                    type="number"
                    helpText="Root font size for the cart drawer."
                  />
                  <TextField
                    label="Heading scale"
                    value={headingScale}
                    onChange={setHeadingScale}
                    autoComplete="off"
                    helpText="Multiplier for heading sizes."
                  />
                  <TextField
                    label="Button radius (px)"
                    value={radius}
                    onChange={setRadius}
                    autoComplete="off"
                    type="number"
                    helpText="Corner radius of buttons."
                  />
                </div>
              </BlockStack>
            </SectionCard>

            {/* Colors */}
            <SectionCard icon={ColorIcon} title="Colors">
              <BlockStack gap="400">
                <Text variant="bodyMd" fontWeight="semibold" as="p">Progress bar & UI</Text>
                <div className="cp-color-grid">
                  <ColorField label="Text color" value={textColor} onChange={setTextColor} />
                  <ColorField label="Background" value={bg} onChange={setBg} />
                  <ColorField label="Progress bar" value={progress} onChange={setProgress} />
                  <ColorField label="Border color" value={borderColor} onChange={setBorderColor} />
                  <ColorField label="Icon color" value={iconColor} onChange={setIconColor} />
                </div>
                <Divider />
                <Text variant="bodyMd" fontWeight="semibold" as="p">Button</Text>
                <div className="cp-color-grid">
                  <ColorField label="Button color" value={buttonColor} onChange={setButtonColor} />
                  <ColorField label="Button label color" value={buttonLabelColor} onChange={setButtonLabelColor} />
                </div>
                <Divider />
                <Text variant="bodyMd" fontWeight="semibold" as="p">Announcement bar</Text>
                <TextField
                  label="Announcement text"
                  value={announcementBarMsg}
                  onChange={setAnnouncementBarMsg}
                  autoComplete="off"
                  placeholder="Free shipping on orders over $50! 🎉"
                  helpText="Text shown in the announcement strip at the top of the cart drawer."
                />
                <div className="cp-color-grid">
                  <ColorField label="Background" value={announcementBg} onChange={setAnnouncementBg} />
                  <ColorField label="Text color" value={announcementText} onChange={setAnnouncementText} />
                </div>
              </BlockStack>
            </SectionCard>

            {/* Cart Icon */}
            <SectionCard icon={CartIcon} title="Cart Icon">
              <BlockStack gap="300">
                <Text variant="bodySm" tone="subdued" as="p">
                  Upload a custom icon shown on the cart button. PNG, JPG, WebP, GIF, or SVG up to 2 MB.
                  Leave empty to use the default cart icon.
                </Text>
                {cartIconError && <Banner tone="critical">{cartIconError}</Banner>}
                <DropZone
                  accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                  allowMultiple={false}
                  type="image"
                  onDrop={handleCartIconDrop}
                  disabled={cartIconUploading}
                >
                  {cartIconUrl ? (
                    <InlineStack gap="300" blockAlign="center" align="center">
                      <img
                        src={cartIconUrl}
                        alt="Cart icon"
                        style={{ width: 48, height: 48, objectFit: "contain", border: "1px solid #dcdfe4", borderRadius: 6, padding: 6, background: "#fff" }}
                      />
                      <BlockStack gap="100">
                        <Text variant="bodySm" as="p">Current cart icon</Text>
                        <Text variant="bodySm" tone="subdued" as="p">Drop a new image to replace it.</Text>
                      </BlockStack>
                    </InlineStack>
                  ) : (
                    <DropZone.FileUpload
                      actionTitle={cartIconUploading ? "Uploading…" : "Upload cart icon"}
                      actionHint="PNG, JPG, WebP, GIF, or SVG up to 2 MB"
                    />
                  )}
                </DropZone>
                {cartIconUrl && (
                  <Button variant="plain" tone="critical" onClick={() => setCartIconUrl("")}>Remove cart icon</Button>
                )}
              </BlockStack>
            </SectionCard>

            {/* Cart Drawer Settings */}
            <SectionCard icon={SettingsIcon} title="Cart Drawer Settings">
              <BlockStack gap="400">
                {/* Background */}
                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">Background</Text>
                  <Select
                    label="Background type"
                    options={[
                      { label: "Solid color", value: "color" },
                      { label: "Image URL", value: "image" },
                      { label: "Gradient", value: "gradient" },
                    ]}
                    value={drawerBgMode}
                    onChange={setDrawerBgMode}
                  />
                  {drawerBgMode === "color" && (
                    <ColorField label="Drawer background color" value={drawerBg} onChange={setDrawerBg} />
                  )}
                  {drawerBgMode === "image" && (
                    <TextField
                      label="Background image URL"
                      value={drawerImage}
                      onChange={setDrawerImage}
                      autoComplete="off"
                      placeholder="https://example.com/background.jpg"
                      helpText="Displayed as the cart drawer background."
                    />
                  )}
                  {drawerBgMode === "gradient" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <ColorField label="Gradient start" value={drawerGradientStart} onChange={setDrawerGradientStart} />
                      <ColorField label="Gradient end" value={drawerGradientEnd} onChange={setDrawerGradientEnd} />
                    </div>
                  )}
                </BlockStack>

                <Divider />

                {/* Drawer text colors */}
                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">Drawer text</Text>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <ColorField label="Text color" value={drawerTextColor} onChange={setDrawerTextColor} />
                    <ColorField label="Heading color" value={drawerHeaderColor} onChange={setDrawerHeaderColor} />
                  </div>
                </BlockStack>

                <Divider />

                {/* Checkout */}
                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">Checkout</Text>
                  <TextField
                    label="Checkout button label"
                    value={checkoutButtonText}
                    onChange={setCheckoutButtonText}
                    autoComplete="off"
                    placeholder="Checkout"
                    helpText="Text shown on the checkout button inside the cart drawer."
                  />
                  <Checkbox
                    label="Show discount code input"
                    checked={discountCodeApply}
                    onChange={setDiscountCodeApply}
                    helpText="Lets customers enter and apply a discount code from inside the cart drawer."
                  />
                </BlockStack>

                <Divider />

                {/* Behavior */}
                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">Behavior</Text>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <Select
                      label="Drawer position"
                      options={[{ label: "Right", value: "right" }, { label: "Left", value: "left" }]}
                      value={drawerPosition}
                      onChange={setDrawerPosition}
                    />
                    <Select
                      label="Mobile layout"
                      options={[{ label: "Drawer", value: "drawer" }, { label: "Bottom sheet", value: "bottom_sheet" }]}
                      value={mobileLayout}
                      onChange={setMobileLayout}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                    <Checkbox
                      label="Auto-open after add to cart"
                      checked={drawerAutoOpen}
                      onChange={setDrawerAutoOpen}
                    />
                    <Checkbox
                      label="Sticky checkout button"
                      checked={stickyCheckout}
                      onChange={setStickyCheckout}
                    />
                  </div>
                </BlockStack>
              </BlockStack>
            </SectionCard>

          </BlockStack>

          {/* ── Sidebar: full-size preview only ── */}
          <div className="cp-preview-sticky">
            <div style={{ background: "#fff", border: "1px solid #e1e3e5", borderRadius: "12px", overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #e1e3e5", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Text variant="bodyMd" fontWeight="semibold" as="p">Live Preview</Text>
                <Text variant="bodySm" tone="subdued" as="p">Updates as you change settings</Text>
              </div>
              <div style={{ padding: "16px" }}>
                <CartDrawerPreview
                  bg={previewBg}
                  textColor={drawerTextColor}
                  headerColor={drawerHeaderColor}
                  buttonColor={buttonColor}
                  buttonLabelColor={buttonLabelColor}
                  progress={progress}
                  radius={radius}
                  checkoutText={checkoutButtonText}
                  announcementBg={announcementBg}
                  announcementText={announcementText}
                  announcementBarText={announcementBarMsg}
                  shippingRules={shippingRules}
                  discountRules={discountRules}
                  freeGiftRules={freeGiftRules}
                  upsellSettings={upsellSettings}
                  drawerBgMode={drawerBgMode}
                  drawerImage={drawerImage}
                />
              </div>
            </div>
          </div>
        </div>
      </Box>
    </Page>
  );
}

export function ErrorBoundary() {
  const { useRouteError } = require("react-router");
  const error = useRouteError();
  return (
    <Page title="Error">
      <Banner tone="critical" title="Something went wrong">
        {process.env.NODE_ENV !== "production" && error?.message
          ? error.message
          : "We encountered an error loading Customize & Preview. Please try refreshing."}
      </Banner>
    </Page>
  );
}
