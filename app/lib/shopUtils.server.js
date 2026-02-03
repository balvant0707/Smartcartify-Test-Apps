/**
 * Shared utility functions for shop domain handling
 */

/**
 * Normalizes a Shopify shop domain to a consistent format.
 * Removes protocol, trailing slashes, and validates format.
 *
 * @param {string|null|undefined} value - The shop domain to normalize
 * @param {boolean} strict - If true, validates against myshopify.com pattern
 * @returns {string|null} - Normalized shop domain or null if invalid
 */
export const normalizeShopDomain = (value, strict = false) => {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;

  const normalized = trimmed
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "")
    .toLowerCase();

  // Strict mode validates against myshopify.com pattern
  if (strict && !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(normalized)) {
    return null;
  }

  return normalized;
};

/**
 * Extracts shop domain from request headers or query params
 *
 * @param {Request} request - The incoming request
 * @returns {string|null} - Normalized shop domain or null
 */
export const getShopFromRequest = (request) => {
  const headers = request.headers;
  const candidates = [
    headers.get("x-shopify-shop-domain"),
    headers.get("x-shopify-shop"),
    headers.get("shop"),
  ];

  for (const candidate of candidates) {
    const normalized = normalizeShopDomain(candidate, true);
    if (normalized) return normalized;
  }

  const url = new URL(request.url);
  return normalizeShopDomain(url.searchParams.get("shop"), true);
};

export default { normalizeShopDomain, getShopFromRequest };
