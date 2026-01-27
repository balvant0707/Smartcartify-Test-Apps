import prisma from "../db.server.js";
// Note: `proxy.smart.jsx` re-exports this loader for the app proxy path (/proxy/smart).

const jsonResponse = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });

const normalizeShopDomain = (value) => {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  return trimmed.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
};

const getShopFromRequest = (request) => {
  const headers = request.headers;
  const candidates = [
    headers.get("x-shopify-shop-domain"),
    headers.get("x-shopify-shop"),
    headers.get("shop"),
  ];

  for (const candidate of candidates) {
    const normalized = normalizeShopDomain(candidate);
    if (normalized) return normalized;
  }

  const url = new URL(request.url);
  return normalizeShopDomain(url.searchParams.get("shop"));
};

const buildShopMetadata = (shopRow) => {
  if (!shopRow) return null;
  return {
    installed: Boolean(shopRow.installed),
    onboardedAt: shopRow.onboardedAt?.toISOString() ?? null,
    uninstalledAt: shopRow.uninstalledAt?.toISOString() ?? null,
    updatedAt: shopRow.updatedAt?.toISOString() ?? null,
  };
};

export const loader = async ({ request }) => {
  const shop = getShopFromRequest(request);
  if (!shop) {
    return jsonResponse({ ok: false, error: "Shop domain not provided" }, 400);
  }

  try {
    const [
      shopRow,
      shippingRules,
      discountRules,
      freeGiftRules,
      bxgyRules,
      styleSettings,
    ] = await Promise.all([
      prisma.shop.findFirst({ where: { shop }, orderBy: { id: "desc" } }),
      prisma.shippingRule.findMany({ where: { shop }, orderBy: { id: "asc" } }),
      prisma.discountRule.findMany({ where: { shop }, orderBy: { id: "asc" } }),
      prisma.freeGiftRule.findMany({ where: { shop }, orderBy: { id: "asc" } }),
      prisma.bxgyRule.findMany({ where: { shop }, orderBy: { id: "asc" } }),
      prisma.styleSettings.findFirst({ where: { shop }, orderBy: { id: "desc" } }),
    ]);

    return jsonResponse({
      ok: true,
      shop,
      metadata: buildShopMetadata(shopRow),
      shippingRules,
      discountRules,
      freeGiftRules,
      bxgyRules,
      styleSettings: styleSettings ?? null,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Smart proxy loader failed", error);
    return jsonResponse(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load SmartCartify configuration",
      },
      500
    );
  }
};

export const action = () =>
  jsonResponse(
    { ok: false, error: "SmartCartify proxy only responds to GET requests" },
    405
  );

export const headers = () => ({
  "Cache-Control": "public, max-age=30",
});
