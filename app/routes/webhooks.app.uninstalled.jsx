import crypto from "crypto";
import prisma from "../db.server";
import { sendEmail } from "../lib/email.server.js";
import {
  buildOwnerUninstallEmail,
  buildUninstallEmail,
} from "../lib/emailTemplates.server.js";
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
    logger.warn("[webhooks/app/uninstalled] HMAC verification failed");
    return new Response("Unauthorized", { status: 401 });
  }

  const shop = normalizeShopDomain(
    request.headers.get("X-Shopify-Shop-Domain"),
  );

  if (!shop) {
    logger.warn("[webhooks/app/uninstalled] Missing or invalid shop domain");
    return new Response("Missing shop", { status: 400 });
  }

  logger.log(`[webhooks/app/uninstalled] Received for ${shop}`);

  try {
    // Delete active sessions for this shop
    await prisma.session.deleteMany({ where: { shop } });

    // Delete plan subscriptions
    await prisma.planSubscription.deleteMany({ where: { shop } });

    // Fetch existing shop row BEFORE updating so we have email/name for the notification
    const existingShop = await prisma.shop.findFirst({ where: { shop } });

    // Mark shop as uninstalled (upsert in case it was never in the DB)
    await prisma.shop.upsert({
      where: { shop },
      update: {
        installed: false,
        uninstalledAt: new Date(),
        accessToken: null,
        appStatus: "inactive",
      },
      create: {
        shop,
        installed: false,
        uninstalledAt: new Date(),
        accessToken: null,
        appStatus: "inactive",
      },
    });

    logger.log(`[webhooks/app/uninstalled] Shop marked inactive: ${shop}`);

    // Fire emails without blocking the response — prevents Shopify webhook timeouts
    const ownerEmail =
      process.env.APP_OWNER_EMAIL || process.env.APP_OWNER_FALLBACK_EMAIL || "";
    const storeOwnerName = [existingShop?.firstName, existingShop?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    const storeOwnerEmail = existingShop?.email || "";
    const testRecipient = process.env.TEST_OWNER_EMAIL || "";
    const storeRecipient = testRecipient || storeOwnerEmail;
    const shopName = existingShop?.domain || shop;
    const uninstalledAt = new Date().toISOString();

    Promise.resolve().then(async () => {
      try {
        if (storeRecipient) {
          const storeEmail = buildUninstallEmail({
            shopName,
            shopDomain: shopName,
            ownerName: storeOwnerName,
          });
          await sendEmail({
            to: storeRecipient,
            subject: storeEmail.subject,
            html: storeEmail.html,
            text: storeEmail.text,
            replyTo: process.env.SMTP_REPLY_TO || process.env.SUPPORT_EMAIL || "",
          });
          logger.log("[email] store uninstall email sent", {
            shop,
            to: storeRecipient,
          });
        } else {
          logger.warn(
            "[email] store owner email missing; uninstall email skipped",
          );
        }

        if (ownerEmail) {
          const ownerContent = buildOwnerUninstallEmail({
            shopName,
            shopDomain: shopName,
            ownerName: storeOwnerName,
            ownerEmail: storeOwnerEmail,
            uninstalledAt,
          });
          await sendEmail({
            to: ownerEmail,
            subject: ownerContent.subject,
            html: ownerContent.html,
            text: ownerContent.text,
            replyTo: process.env.SMTP_REPLY_TO || process.env.SUPPORT_EMAIL || "",
          });
          logger.log("[email] owner uninstall email sent", {
            shop,
            to: ownerEmail,
          });
        }
      } catch (error) {
        logger.warn("[email] uninstall email failed:", error);
      }
    });
  } catch (err) {
    logger.warn("[webhooks/app/uninstalled] DB update failed:", err?.message);
  }

  return new Response();
};
