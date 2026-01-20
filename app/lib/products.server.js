// app/lib/products.server.js
export function mapProductEdges(data) {
  const edge = (x) => (x && x.edges ? x.edges.map((e) => e.node) : []);
  return edge(data?.data?.products).map((p) => {
    const v = edge(p.variants)[0];
    const img = edge(p.images)[0];
    return {
      id: p.id,
      title: p.title,
      handle: p.handle,
      price: v?.price ?? null,
      image: img?.url ?? null,
    };
  });
}
