import crypto from "crypto";
import prisma from "../db.server";
import { PLANS } from "../lib/plans.js";

const deleteShopData = async (shop) => {
  if (!shop) return;
  const deletable = [
    prisma.shippingRule,
    prisma.discountRule,
    prisma.freeGiftRule,
    prisma.bxgyRule,
    prisma.cartStepConfig,
    prisma.styleSettings,
  ];
  await Promise.all(
    deletable.map((model) => model.deleteMany({ where: { shop } })),
  );
  await Promise.all([
    prisma.session.deleteMany({ where: { shop } }),
    prisma.shop.deleteMany({ where: { shop } }),
  ]);
};

function verifyShopifyHmac(request, rawBody) {
  const hmac = request.headers.get("X-Shopify-Hmac-Sha256");
  const secret = process.env.SHOPIFY_API_SECRET || "";

  const digest = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");

  const provided = Buffer.from(hmac || "", "utf8");
  const expected = Buffer.from(digest, "utf8");

  if (provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(expected, provided);
}

const normalizeShopDomain = (value) => {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  return trimmed.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
};

const toDateOrNull = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

export async function action({ request }) {
  const topic = request.headers.get("X-Shopify-Topic");
  const shopHeader = request.headers.get("X-Shopify-Shop-Domain");
  const shop = normalizeShopDomain(shopHeader);

  const rawBody = await request.text();

  if (!verifyShopifyHmac(request, rawBody)) {
    return new Response("Invalid HMAC", { status: 401 });
  }

  const payload = rawBody ? JSON.parse(rawBody) : {};

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
    await prisma.planSubscription.deleteMany({ where: { shop } });
    await prisma.shop.updateMany({
      where: { shop },
      data: {
        installed: false,
        uninstalledAt: new Date(),
        accessToken: null,
      },
    });
    return new Response("OK", { status: 200 });
  }

  // ✅ GDPR topics (ignore)
  if (
    topic === "customers/data_request" ||
    topic === "customers/redact" ||
    topic === "shop/redact"
  ) {
    if (topic === "shop/redact") {
      await deleteShopData(shop);
    }
    return new Response("OK", { status: 200 });
  }

  return new Response("Unhandled topic", { status: 200 });
}

export default function Webhooks() {
  return null;
}
