export const loader = () => {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`,
    { status: 200, headers: { "Content-Type": "application/xml" } }
  );
};
