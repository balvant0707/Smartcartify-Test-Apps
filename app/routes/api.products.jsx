// app/routes/api.products.jsx
import { authenticate } from "../shopify.server";

// tiny helper
const edge = (x) => (x && x.edges ? x.edges.map((e) => e.node) : []);
const pageInfo = (x) => x?.pageInfo || { hasNextPage: false, endCursor: null };
const splitIds = (value) =>
  String(value || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

const toShopifyGid = (id, resource) => {
  if (String(id || "").startsWith("gid://")) return id;
  if (!/^\d+$/.test(String(id || ""))) return id;
  return resource === "collections"
    ? `gid://shopify/Collection/${id}`
    : `gid://shopify/Product/${id}`;
};

const clampLimit = (value, fallback) => {
  const parsed = parseInt(value || "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, 250);
};

const mapProduct = (p, idOverride = null) => {
  const v = edge(p?.variants)[0];
  const img = edge(p?.images)[0];
  return {
    id: idOverride || p.id,
    gid: p.id,
    title: p.title,
    handle: p.handle,
    price: v?.price ?? null,
    variantId: v?.id ?? null,
    variantTitle: v?.title ?? null,
    variantOptions: v?.selectedOptions ?? [],
    image: img?.url ?? null,
  };
};

const mapCollection = (c, includeCollectionProducts = false, idOverride = null) => {
  const collectionProducts = includeCollectionProducts
    ? edge(c?.products).map(mapProduct)
    : [];

  return {
    id: idOverride || c.id,
    gid: c.id,
    title: c.title,
    handle: c.handle,
    products: collectionProducts,
  };
};

export async function loader({ request }) {
  try {
    const { admin } = await authenticate.admin(request);
    const url = new URL(request.url);
    const includeCollectionProducts =
      url.searchParams.get("includeCollectionProducts") === "1";
    const resource = url.searchParams.get("resource") || "both";
    const legacyRequest = !url.searchParams.has("resource") && !url.searchParams.has("limit");
    const limit = clampLimit(url.searchParams.get("limit"), legacyRequest ? 250 : 10);
    const productAfter = url.searchParams.get("productAfter");
    const collectionAfter = url.searchParams.get("collectionAfter");
    const ids = splitIds(url.searchParams.get("ids"));

    const wantsProducts = resource === "both" || resource === "products";
    const wantsCollections = resource === "both" || resource === "collections";

    if (ids.length && resource !== "both") {
      const nodeRequests = ids.map((id) => ({
        originalId: id,
        nodeId: toShopifyGid(id, resource),
      }));
      const resp = await admin.graphql(
        `
          query PickerNodes($ids: [ID!]!) {
            nodes(ids: $ids) {
              ... on Product {
                id
                title
                handle
                variants(first: 1) { edges { node { id price title selectedOptions { name value } } } }
                images(first: 1) { edges { node { url altText } } }
              }
              ... on Collection {
                id
                title
                handle
                products(first: 25, sortKey: TITLE) @include(if: ${includeCollectionProducts}) {
                  edges {
                    node {
                      id
                      title
                      handle
                      variants(first: 1) { edges { node { id price title selectedOptions { name value } } } }
                      images(first: 1) { edges { node { url altText } } }
                    }
                  }
                }
              }
            }
          }
        `,
        { variables: { ids: nodeRequests.map((item) => item.nodeId) } }
      );
      const data = await resp.json();
      const nodes = data?.data?.nodes || [];
      const products = resource === "products"
        ? nodes
            .map((node, index) =>
              node?.id?.includes("/Product/")
                ? mapProduct(node, nodeRequests[index]?.originalId)
                : null
            )
            .filter(Boolean)
        : [];
      const collections = resource === "collections"
        ? nodes
            .map((node, index) =>
              node?.id?.includes("/Collection/")
                ? mapCollection(
                    node,
                    includeCollectionProducts,
                    nodeRequests[index]?.originalId
                  )
                : null
            )
            .filter(Boolean)
        : [];

      return new Response(JSON.stringify({
        resource,
        products,
        collections,
        pageInfo: {
          products: { hasNextPage: false, endCursor: null },
          collections: { hasNextPage: false, endCursor: null },
        },
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const gql = includeCollectionProducts
      ? `
          query ProductsForPicker($productFirst: Int!, $productAfter: String, $collectionFirst: Int!, $collectionAfter: String) {
            products(first: $productFirst, after: $productAfter, sortKey: TITLE) @include(if: ${wantsProducts}) {
              edges {
                node {
                  id
                  title
                  handle
                  variants(first: 1) { edges { node { id price } } }
                  images(first: 1)   { edges { node { url altText } } }
                }
              }
              pageInfo { hasNextPage endCursor }
            }
            collections(first: $collectionFirst, after: $collectionAfter, sortKey: TITLE) @include(if: ${wantsCollections}) {
              edges {
                node {
                  id
                  title
                  handle
                  products(first: 25, sortKey: TITLE) {
                    edges {
                      node {
                        id
                        title
                        handle
                        variants(first: 1) { edges { node { id price title selectedOptions { name value } } } }
                        images(first: 1)   { edges { node { url altText } } }
                      }
                    }
                  }
                }
              }
              pageInfo { hasNextPage endCursor }
            }
          }
        `
      : `
          query ProductsForPicker($productFirst: Int!, $productAfter: String, $collectionFirst: Int!, $collectionAfter: String) {
            products(first: $productFirst, after: $productAfter, sortKey: TITLE) @include(if: ${wantsProducts}) {
              edges {
                node {
                  id
                  title
                  handle
                  variants(first: 1) { edges { node { id price } } }
                  images(first: 1)   { edges { node { url altText } } }
                }
              }
              pageInfo { hasNextPage endCursor }
            }
            collections(first: $collectionFirst, after: $collectionAfter, sortKey: TITLE) @include(if: ${wantsCollections}) {
              edges {
                node {
                  id
                  title
                  handle
                }
              }
              pageInfo { hasNextPage endCursor }
            }
          }
        `;

    const resp = await admin.graphql(gql, {
      variables: {
        productFirst: wantsProducts ? limit : 1,
        productAfter: wantsProducts ? productAfter || null : null,
        collectionFirst: wantsCollections ? limit : 1,
        collectionAfter: wantsCollections ? collectionAfter || null : null,
      },
    });
    const data = await resp.json();

    const items = edge(data?.data?.products).map(mapProduct);
    const collections = edge(data?.data?.collections).map((c) =>
      mapCollection(c, includeCollectionProducts)
    );

    return new Response(JSON.stringify({
      resource,
      products: items,
      collections,
      pageInfo: {
        products: pageInfo(data?.data?.products),
        collections: pageInfo(data?.data?.collections),
      },
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ products: [], collections: [], error: String(err?.message || err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
