// app/routes/api.products.jsx
import { authenticate } from "../shopify.server";

// tiny helper
const edge = (x) => (x && x.edges ? x.edges.map((e) => e.node) : []);

export async function loader({ request }) {
  try {
    const { admin } = await authenticate.admin(request);

    const gql = `
      query ProductsForPicker {
        products(first: 50, sortKey: TITLE) {
          edges {
            node {
              id
              title
              handle
              variants(first: 1) { edges { node { id price } } }
              images(first: 1)   { edges { node { url altText } } }
            }
          }
        }
        collections(first: 50, sortKey: TITLE) {
          edges {
            node {
              id
              title
              handle
              products(first: 10, sortKey: TITLE) {
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
        }
      }
    `;

    const resp = await admin.graphql(gql);
    const data = await resp.json();

    const items = edge(data?.data?.products).map((p) => {
      const v = edge(p.variants)[0];
      const img = edge(p.images)[0];
      return {
        id: p.id,
        title: p.title,
        handle: p.handle,
        price: v?.price ?? null,
        variantId: v?.id ?? null,
        variantTitle: v?.title ?? null,
        variantOptions: v?.selectedOptions ?? [],
        image: img?.url ?? null,
      };
    });
    const collections = edge(data?.data?.collections).map((c) => ({
      id: c.id,
      title: c.title,
      handle: c.handle,
      products: edge(c.products).map((p) => {
        const v = edge(p.variants)[0];
        const img = edge(p.images)[0];
        return {
          id: p.id,
          title: p.title,
          handle: p.handle,
          price: v?.price ?? null,
          variantId: v?.id ?? null,
          variantTitle: v?.title ?? null,
          variantOptions: v?.selectedOptions ?? [],
          image: img?.url ?? null,
        };
      }),
    }));

    return new Response(JSON.stringify({ products: items, collections }), {
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
