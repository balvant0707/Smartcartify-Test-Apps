// This route is a fallback for any old webhook registrations pointing to
// /webhooks/app/uninstalled. All new registrations use /webhooks instead.
// Kept here so existing per-store registrations don't receive 404s.

import crypto from "crypto";
import prisma from "../db.server";
import logger from "../lib/logger.server.js";
import { normalizeShopDomain } from "../lib/shopUtils.server.js";

function verifyShopifyHmac(request, rawBody) {
  const hmac = request.headers.get("X-Shopify-Hmac-Sha256");
  const secret = process.env.SHOPIFY_API_SECRET || "";
  if (!secret || !hmac) return false;
  const digest = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");
  const provided = Buffer.from(hmac, "utf8");
  const expected = Buffer.from(digest, "utf8");
  if (provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(expected, provided);
}

export const action = async ({ request }) => {
  const rawBody = await request.text();

  if (!verifyShopifyHmac(request, rawBody)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const shop = normalizeShopDomain(request.headers.get("X-Shopify-Shop-Domain"));
  if (!shop) return new Response("Missing shop", { status: 400 });

  logger.log(`[webhooks/app/uninstalled] fallback handler for ${shop}`);

  try {
    await prisma.session.deleteMany({ where: { shop } });
    await prisma.planSubscription.deleteMany({ where: { shop } }).catch(() => null);
    await prisma.shop.upsert({
      where: { shop },
      update: { installed: false, uninstalledAt: new Date(), accessToken: null, appStatus: "inactive" },
      create: { shop, installed: false, uninstalledAt: new Date(), accessToken: null, appStatus: "inactive" },
    });
    logger.log(`[webhooks/app/uninstalled] shop marked inactive: ${shop}`);
  } catch (err) {
    logger.warn("[webhooks/app/uninstalled] DB update failed:", err?.message);
  }

  return new Response();
};
