import prisma from "../db.server";

const jsonResponse = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });

const ADMIN_API_VERSION = "2024-10";

const normalizeVariantIdInput = (value) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text ? text : null;
};

const variantIdToGid = (value) => {
  const normalized = normalizeVariantIdInput(value);
  if (!normalized) return null;
  if (normalized.startsWith("gid://")) return normalized;
  if (/^\d+$/.test(normalized)) {
    return `gid://shopify/ProductVariant/${normalized}`;
  }
  return normalized;
};

const callShopifyAdminGraphql = async (shopDomain, accessToken, query, variables = {}) => {
  const endpoint = `https://${shopDomain.replace(/^https?:\/\//i, "")}/admin/api/${ADMIN_API_VERSION}/graphql.json`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Shopify Admin GraphQL failed (${response.status}): ${
        text || response.statusText
      }`
    );
  }
  return response.json();
};

const FREE_GIFT_VARIANT_QUERY = `
  query FreeGiftVariants($ids: [ID!]!) {
    nodes(ids: $ids) {
      id
      __typename
      ... on ProductVariant {
        id
        legacyResourceId
        title
        price
        sku
        image {
          url
        }
        product {
          title
          handle
          images(first: 1) {
            edges {
              node {
                url
              }
            }
          }
        }
      }
    }
  }
`;

const fetchFreeGiftVariantMap = async (shopDomain, accessToken, ids = []) => {
  const variantMap = new Map();
  if (!shopDomain || !accessToken || !ids.length) return variantMap;
  const uniqIds = [...new Set(ids)];
  const BATCH = 20;
  for (let i = 0; i < uniqIds.length; i += BATCH) {
    const batch = uniqIds.slice(i, i + BATCH);
    try {
      const payload = await callShopifyAdminGraphql(
        shopDomain,
        accessToken,
        FREE_GIFT_VARIANT_QUERY,
        { ids: batch }
      );
      const nodes = Array.isArray(payload?.data?.nodes)
        ? payload.data.nodes
        : [];
      nodes.forEach((node) => {
        if (
          !node ||
          node.__typename !== "ProductVariant" ||
          !node.id ||
          variantMap.has(node.id)
        ) {
          return;
        }
        const fallbackProductImage =
          node.product?.images?.edges?.[0]?.node?.url ?? null;
        const image = node.image?.url || fallbackProductImage || null;
        variantMap.set(node.id, {
          id: node.id,
          legacyResourceId:
            node.legacyResourceId !== undefined && node.legacyResourceId !== null
              ? String(node.legacyResourceId)
              : null,
          title: node.title || "",
          price: node.price ?? null,
          sku: node.sku ?? "",
          image,
          product: {
            title: node.product?.title || "",
            handle: node.product?.handle || "",
            image: fallbackProductImage,
          },
        });
      });
    } catch (err) {
      console.warn("Failed to fetch free gift variants", err);
    }
  }
  return variantMap;
};

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
      minAmountRule,
    ] = await Promise.all([
      prisma.shop.findFirst({ where: { shop }, orderBy: { id: "desc" } }),
      prisma.shippingRule.findMany({ where: { shop }, orderBy: { id: "asc" } }),
      prisma.discountRule.findMany({ where: { shop }, orderBy: { id: "asc" } }),
      prisma.freeGiftRule.findMany({ where: { shop }, orderBy: { id: "asc" } }),
      prisma.bxgyRule.findMany({ where: { shop }, orderBy: { id: "asc" } }),
      prisma.styleSettings.findFirst({ where: { shop }, orderBy: { id: "desc" } }),
      prisma.freeGiftRule.findFirst({
        where: { shop, trigger: "min_amount" },
        orderBy: { id: "desc" },
      }),
    ]);

    const shopAccessToken = shopRow?.accessToken;
    const shopDomain = shopRow?.shop || shop;

    const bonusToGid = new Map();
    (freeGiftRules || []).forEach((rule) => {
      const bonus = normalizeVariantIdInput(rule?.bonusProductId);
      const gid = variantIdToGid(bonus);
      if (bonus && gid) {
        bonusToGid.set(bonus, gid);
      }
    });

    const variantMap =
      shopAccessToken && shopDomain && bonusToGid.size
        ? await fetchFreeGiftVariantMap(
            shopDomain,
            shopAccessToken,
            Array.from(new Set(bonusToGid.values()))
          )
        : new Map();

    const enrichedFreeGiftRules = (freeGiftRules || []).map((rule) => {
      const bonus = normalizeVariantIdInput(rule?.bonusProductId);
      const gid = bonus ? bonusToGid.get(bonus) : null;
      const variantData = gid ? variantMap.get(gid) ?? null : null;
      return {
        ...rule,
        bonusProductVariant: variantData,
      };
    });

    return jsonResponse({
      ok: true,
      shop,
      metadata: buildShopMetadata(shopRow),
      shippingRules,
      discountRules,
      freeGiftRules: enrichedFreeGiftRules,
      bxgyRules,
      styleSettings: styleSettings ?? null,
      minAmountRule: minAmountRule ?? null,
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
      500,
    );
  }
};

export const action = () =>
  jsonResponse(
    { ok: false, error: "SmartCartify proxy only responds to GET requests" },
    405,
  );

export const headers = () => ({
  "Cache-Control": "public, max-age=30",
});
