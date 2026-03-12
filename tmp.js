const resolveArg = (name) => {
  const prefix = `--${name}=`;
  const hit = process.argv.find((arg) => arg.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : "";
};

const shopInput =
  resolveArg("shop") ||
  process.env.SHOPIFY_SHOP ||
  process.env.SHOPIFY_SHOP_DOMAIN ||
  "";
const token =
  resolveArg("token") ||
  process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ||
  process.env.SHOPIFY_ACCESS_TOKEN ||
  "";
const apiVersion =
  resolveArg("api-version") || process.env.SHOPIFY_API_VERSION || "2025-01";
const query =
  resolveArg("query") ||
  process.env.SHOPIFY_GRAPHQL_QUERY ||
  '{__type(name:"DeliveryProfileInput"){inputFields{name}}}';
const variablesRaw =
  resolveArg("variables") || process.env.SHOPIFY_GRAPHQL_VARIABLES || "";

const normalizeShopDomain = (value) =>
  String(value || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");

const shop = normalizeShopDomain(shopInput);

if (!shop || !token) {
  console.error(
    "Missing required values. Use SHOPIFY_SHOP_DOMAIN + SHOPIFY_ADMIN_ACCESS_TOKEN, or --shop=... --token=..."
  );
  process.exit(1);
}

let variables = {};
if (variablesRaw) {
  try {
    variables = JSON.parse(variablesRaw);
  } catch {
    console.error("Invalid JSON in --variables or SHOPIFY_GRAPHQL_VARIABLES");
    process.exit(1);
  }
}

const endpoint = `https://${shop}/admin/api/${apiVersion}/graphql.json`;

const run = async () => {
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
      body: JSON.stringify({ query, variables }),
    });

    const text = await res.text();
    console.log("endpoint:", endpoint);
    console.log("status:", res.status, res.statusText);
    console.log(text);
  } catch (err) {
    console.error("Request failed:", err);
    process.exit(1);
  }
};

run();
