import prisma from "../db.server.js";
// Note: `proxy.smart.jsx` re-exports this loader for the app proxy path (/proxy/smart).

const ADMIN_API_VERSION = "2024-10";

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

const buildVariantOptions = (product, variant) => {
  const opts = Array.isArray(product?.options) ? product.options : [];
  const values = [];
  const raw = [variant?.option1, variant?.option2, variant?.option3];
  for (let i = 0; i < opts.length; i += 1) {
    const name = opts[i]?.name;
    const value = raw[i];
    if (!name || !value) continue;
    values.push({ name, value });
  }
  return values;
};

const normalizeIds = (value) =>
  Array.isArray(value) ? [...new Set(value.map(String))].sort() : [];

const parseJsonArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return normalizeIds(value);
  try {
    const parsed = JSON.parse(value);
    return normalizeIds(parsed);
  } catch {
    return [];
  }
};

const normalizeProductId = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const m = raw.match(/\/(\d+)\s*$/);
  if (m) return m[1];
  if (/^\d+$/.test(raw)) return raw;
  return null;
};

const normalizeCollectionId = (value) => normalizeProductId(value);

const mapAdminProducts = (products = []) =>
  products.map((p) => {
    const image = p?.image?.src || (p?.images?.[0]?.src ?? null);
    const firstVariant = Array.isArray(p?.variants) ? p.variants[0] : null;
    return {
      id: p?.id ?? null,
      title: p?.title ?? "",
      image: image || null,
      variants: Array.isArray(p?.variants)
        ? p.variants.map((v) => ({
            id: v?.id ?? null,
            price: v?.price ?? null,
            title: v?.title ?? null,
            variantOptions: buildVariantOptions(p, v),
          }))
        : [],
      variantId: firstVariant?.id ?? null,
      variantPrice: firstVariant?.price ?? null,
      variantOptions: firstVariant ? buildVariantOptions(p, firstVariant) : [],
    };
  });

const fetchBestSellingProducts = async (shopDomain, accessToken) => {
  if (!shopDomain || !accessToken) return [];
  try {
    const endpoint = `https://${shopDomain}/admin/api/${ADMIN_API_VERSION}/products.json?limit=5&order=best-selling`;
    const res = await fetch(endpoint, {
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const products = Array.isArray(data?.products) ? data.products : [];
    return mapAdminProducts(products);
  } catch (err) {
    console.error("Best-selling products fetch failed", err);
    return [];
  }
};

const fetchProductsByIds = async (shopDomain, accessToken, ids = []) => {
  if (!shopDomain || !accessToken) return [];
  if (!Array.isArray(ids) || !ids.length) return [];
  const uniqueIds = [...new Set(ids.map(String))];
  try {
    const endpoint = `https://${shopDomain}/admin/api/${ADMIN_API_VERSION}/products.json?ids=${encodeURIComponent(
      uniqueIds.join(",")
    )}&limit=${uniqueIds.length}`;
    const res = await fetch(endpoint, {
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const products = Array.isArray(data?.products) ? data.products : [];
    return mapAdminProducts(products);
  } catch (err) {
    console.error("Selected products fetch failed", err);
    return [];
  }
};

const fetchCollectionsByIds = async (shopDomain, accessToken, ids = []) => {
  if (!shopDomain || !accessToken) return [];
  if (!Array.isArray(ids) || !ids.length) return [];
  const uniqueIds = [...new Set(ids.map(String))];
  const base = `https://${shopDomain}/admin/api/${ADMIN_API_VERSION}`;
  const query = `ids=${encodeURIComponent(uniqueIds.join(","))}&limit=${uniqueIds.length}`;
  try {
    const [customRes, smartRes] = await Promise.allSettled([
      fetch(`${base}/custom_collections.json?${query}`, {
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
      }),
      fetch(`${base}/smart_collections.json?${query}`, {
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
      }),
    ]);

    const custom =
      customRes.status === "fulfilled" && customRes.value.ok
        ? await customRes.value.json()
        : null;
    const smart =
      smartRes.status === "fulfilled" && smartRes.value.ok
        ? await smartRes.value.json()
        : null;

    const customCollections = Array.isArray(custom?.custom_collections)
      ? custom.custom_collections
      : [];
    const smartCollections = Array.isArray(smart?.smart_collections)
      ? smart.smart_collections
      : [];

    return [...customCollections, ...smartCollections];
  } catch (err) {
    console.error("Selected collections fetch failed", err);
    return [];
  }
};

const fetchProductsForCollection = async (shopDomain, accessToken, collectionId) => {
  if (!shopDomain || !accessToken || !collectionId) return [];
  try {
    const endpoint = `https://${shopDomain}/admin/api/${ADMIN_API_VERSION}/collections/${collectionId}/products.json?limit=5`;
    const res = await fetch(endpoint, {
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const products = Array.isArray(data?.products) ? data.products : [];
    return mapAdminProducts(products);
  } catch (err) {
    console.error("Collection products fetch failed", err);
    return [];
  }
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
      upsellSettings,
    ] = await Promise.all([
      prisma.shop.findFirst({ where: { shop }, orderBy: { id: "desc" } }),
      prisma.shippingRule.findMany({ where: { shop }, orderBy: { id: "asc" } }),
      prisma.discountRule.findMany({ where: { shop }, orderBy: { id: "asc" } }),
      prisma.freeGiftRule.findMany({ where: { shop }, orderBy: { id: "asc" } }),
      prisma.bxgyRule.findMany({ where: { shop }, orderBy: { id: "asc" } }),
      prisma.styleSettings.findFirst({ where: { shop }, orderBy: { id: "desc" } }),
      prisma.upsellSettings.findUnique({ where: { shop } }),
    ]);

    const bestSellingProducts = await fetchBestSellingProducts(
      shop,
      shopRow?.accessToken || null
    );

    const selectedProductIds = parseJsonArray(
      upsellSettings?.selectedProductIds
    );
    const selectedProductIdsNormalized = selectedProductIds
      .map(normalizeProductId)
      .filter(Boolean);
    const selectedProductsRaw = selectedProductIdsNormalized.length
      ? await fetchProductsByIds(
          shop,
          shopRow?.accessToken || null,
          selectedProductIdsNormalized
        )
      : [];
    const selectedProductsMap = new Map(
      selectedProductsRaw.map((p) => [String(p?.id || ""), p])
    );
    const selectedProducts = selectedProductIdsNormalized
      .map((id) => selectedProductsMap.get(String(id)))
      .filter(Boolean);

    const selectedCollectionIds = parseJsonArray(
      upsellSettings?.selectedCollectionIds
    );
    const selectedCollectionIdsNormalized = selectedCollectionIds
      .map(normalizeCollectionId)
      .filter(Boolean);
    const selectedCollectionsRaw = selectedCollectionIdsNormalized.length
      ? await fetchCollectionsByIds(
          shop,
          shopRow?.accessToken || null,
          selectedCollectionIdsNormalized
        )
      : [];
    const selectedCollectionsMap = new Map(
      selectedCollectionsRaw.map((c) => [String(c?.id || ""), c])
    );
    const selectedCollectionsOrdered = selectedCollectionIdsNormalized
      .map((id) => selectedCollectionsMap.get(String(id)))
      .filter(Boolean);
    const selectedCollectionsWithProducts = [];
    for (const col of selectedCollectionsOrdered) {
      const products = await fetchProductsForCollection(
        shop,
        shopRow?.accessToken || null,
        col?.id
      );
      selectedCollectionsWithProducts.push({
        id: col?.id ?? null,
        title: col?.title ?? "",
        products,
      });
    }

    return jsonResponse({
      ok: true,
      shop,
      metadata: buildShopMetadata(shopRow),
      shippingRules,
      discountRules,
      freeGiftRules,
      bxgyRules,
      styleSettings: styleSettings ?? null,
      upsellSettings: upsellSettings ?? null,
      upsellProducts: bestSellingProducts,
      upsellSelectedProducts: selectedProducts,
      upsellSelectedCollections: selectedCollectionsWithProducts,
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
