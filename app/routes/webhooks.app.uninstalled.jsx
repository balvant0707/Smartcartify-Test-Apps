// This route is a fallback for any old webhook registrations pointing to
// /webhooks/app/uninstalled. All new registrations use /webhooks instead.
// Kept here so existing per-store registrations don't receive 404s.

import prisma from "../db.server";
import logger from "../lib/logger.server.js";
import { safeCreateShop, safeUpdateManyShop } from "../lib/shopPersistence.server.js";
import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { shop } = await authenticate.webhook(request);

  if (!shop) return new Response("Missing shop", { status: 400 });

  logger.log(`[webhooks/app/uninstalled] fallback handler for ${shop}`);

  try {
    await prisma.session.deleteMany({ where: { shop } }).catch(() => null);
    await prisma.planSubscription.deleteMany({ where: { shop } }).catch(() => null);
    const result = await safeUpdateManyShop({
      context: "legacy webhook app/uninstalled update",
      where: { shop },
      data: { installed: false, uninstalledAt: new Date(), accessToken: null, appStatus: "inactive", status: "uninstalled" },
    });
    if (result.count === 0) {
      await safeCreateShop({
        context: "legacy webhook app/uninstalled create",
        data: { shop, domain: shop, installed: false, uninstalledAt: new Date(), accessToken: null, appStatus: "inactive", status: "uninstalled" },
      });
    }
    logger.log(`[webhooks/app/uninstalled] shop marked inactive: ${shop} (updated: ${result.count})`);
  } catch (err) {
    logger.error("[webhooks/app/uninstalled] DB update failed:", err?.message);
  }

  return new Response();
};
