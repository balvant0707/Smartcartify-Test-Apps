import prisma from "../db.server";
import { PLANS } from "../lib/plans.js";
import { sendEmail } from "../lib/email.server.js";
import {
  buildOwnerUninstallEmail,
  buildUninstallEmail,
} from "../lib/emailTemplates.server.js";
import logger from "../lib/logger.server.js";
import { authenticate } from "../shopify.server";

const toDateOrNull = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

export async function action({ request }) {
  const { topic, shop, payload } = await authenticate.webhook(request);

  // ✅ Billing/subscription updates
  if (topic === "app_subscriptions/update") {
    // Shopify payload fields can vary by API/version
    const shopifyStatus =
      payload?.status || payload?.app_subscription?.status || "UNKNOWN";

    const subscription =
      payload?.app_subscription || payload?.appSubscription || payload;

    const planName =
      subscription?.name || payload?.app_subscription?.name || null;
    const matchedPlan = planName
      ? PLANS.find((plan) => plan.name === planName)
      : null;
    const planId = matchedPlan?.id || null;

    // Subscription id can come as:
    // - payload.id (often numeric or gid)
    // - payload.admin_graphql_api_id (gid://shopify/AppSubscription/...)
    const subId =
      payload?.admin_graphql_api_id || payload?.id || payload?.app_subscription?.admin_graphql_api_id;

    const createdAtRaw =
      subscription?.created_at || subscription?.createdAt || null;
    const trialDaysRaw =
      subscription?.trial_days || subscription?.trialDays || null;
    const isTestRaw = subscription?.test;

    // Period end can come as:
    // - payload.current_period_end
    // - payload.currentPeriodEnd
    const periodEndRaw = payload?.current_period_end || payload?.currentPeriodEnd;
    const periodEnd = toDateOrNull(periodEndRaw);

    const lineItems =
      subscription?.line_items || subscription?.lineItems || [];
    const firstItem = Array.isArray(lineItems) ? lineItems[0] : null;
    const pricingDetails =
      firstItem?.plan?.pricing_details || firstItem?.plan?.pricingDetails || null;
    const amount = pricingDetails?.price?.amount ?? null;
    const currencyCode = pricingDetails?.price?.currencyCode ?? null;
    const interval = pricingDetails?.interval ?? null;

    // ✅ Update only what we have (DON'T overwrite with null)
    await prisma.planSubscription.updateMany({
      where: { shop },
      data: {
        status: shopifyStatus, // ACTIVE / CANCELLED / FROZEN / etc

        ...(planId ? { planId } : {}),
        ...(planName ? { planName } : {}),
        ...(subId ? { shopifySubGid: String(subId) } : {}),
        ...(createdAtRaw ? { subscriptionCreatedAt: toDateOrNull(createdAtRaw) } : {}),
        ...(typeof trialDaysRaw === "number" ? { trialDays: trialDaysRaw } : {}),
        ...(typeof isTestRaw === "boolean" ? { isTest: isTestRaw } : {}),
        ...(interval ? { billingInterval: String(interval) } : {}),
        ...(amount != null ? { billingAmount: Number(amount) } : {}),
        ...(currencyCode ? { billingCurrency: String(currencyCode) } : {}),
        ...(periodEnd ? { currentPeriodEnd: periodEnd } : {}),
      },
    });

    return new Response("OK", { status: 200 });
  }

  // ✅ App uninstall cleanup
  if (topic === "app/uninstalled") {
    logger.log(`[webhooks] app/uninstalled received for ${shop}`);

    // Fetch shop data BEFORE updating so we have email/name for the notification
    const existingShop = await prisma.shop.findFirst({ where: { shop } }).catch(() => null);

    await prisma.session.deleteMany({ where: { shop } }).catch(() => null);
    await prisma.planSubscription.deleteMany({ where: { shop } }).catch(() => null);

    try {
      if (existingShop) {
        await prisma.shop.update({
          where: { id: existingShop.id },
          data: {
            accessToken: null,
            installed: false,
            uninstalledAt: new Date(),
            appStatus: "inactive",
          },
        });
      } else {
        await prisma.shop.create({
          data: {
            shop,
            accessToken: null,
            installed: false,
            uninstalledAt: new Date(),
            appStatus: "inactive",
          },
        });
      }
      logger.log(`[webhooks] shop marked inactive, accessToken cleared: ${shop}`);
    } catch (err) {
      logger.error(`[webhooks] shop update failed on uninstall for ${shop}:`, err?.message);
    }

    // Fire emails without blocking the response
    const ownerEmail = process.env.APP_OWNER_EMAIL || process.env.APP_OWNER_FALLBACK_EMAIL || "";
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
          const storeEmail = buildUninstallEmail({ shopName, shopDomain: shopName, ownerName: storeOwnerName });
          await sendEmail({
            to: storeRecipient,
            subject: storeEmail.subject,
            html: storeEmail.html,
            text: storeEmail.text,
            replyTo: process.env.SMTP_REPLY_TO || process.env.SUPPORT_EMAIL || "",
          });
        }
        if (ownerEmail) {
          const ownerContent = buildOwnerUninstallEmail({ shopName, shopDomain: shopName, ownerName: storeOwnerName, ownerEmail: storeOwnerEmail, uninstalledAt });
          await sendEmail({
            to: ownerEmail,
            subject: ownerContent.subject,
            html: ownerContent.html,
            text: ownerContent.text,
            replyTo: process.env.SMTP_REPLY_TO || process.env.SUPPORT_EMAIL || "",
          });
        }
      } catch (err) {
        logger.warn("[email] uninstall email failed:", err);
      }
    });

    return new Response("OK", { status: 200 });
  }

  // GDPR topics are handled by webhooks.gdpr.jsx via dedicated callback URL
  // configured in shopify.app.toml

  return new Response("Unhandled topic", { status: 200 });
}

export default function Webhooks() {
  return null;
}
