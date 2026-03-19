import { authenticate } from "../shopify.server";
import db from "../db.server";

/**
 * GDPR Webhook Handlers
 *
 * CartLift: Cart Drawer & Upsell Data Handling Policy:
 * - This app does NOT store any personally identifiable customer information (PII)
 * - We only store shop-level configuration data (rules, settings, styles)
 * - Cart data is ephemeral and processed in real-time without persistence
 * - No customer emails, names, addresses, or payment info is stored
 *
 * Therefore:
 * - customers/data_request: No customer data to export
 * - customers/redact: No customer data to delete
 * - shop/redact: All shop configuration data is deleted
 */

const logGdprEvent = (topic, shop) => {
  // Log GDPR events for compliance audit trail (no sensitive data logged)
  if (process.env.NODE_ENV !== "production") {
    console.log(`[GDPR] Received ${topic} webhook for shop: ${shop}`);
  }
};

const deleteShopData = async (shop) => {
  if (!shop) return;
  const deletable = [
    db.shippingRule,
    db.discountRule,
    db.freeGiftRule,
    db.bxgyRule,
    db.cartStepConfig,
    db.styleSettings,
    db.upsellSettings,
    db.planSubscription,
  ];
  await Promise.all(
    deletable.map((model) => model.deleteMany({ where: { shop } })),
  );
  await Promise.all([
    db.session.deleteMany({ where: { shop } }),
    db.shop.deleteMany({ where: { shop } }),
  ]);
};

export const action = async ({ request }) => {
  const { topic, shop } = await authenticate.webhook(request);
  logGdprEvent(topic, shop);
  const normalized = topic?.toLowerCase?.() ?? "";

  if (normalized === "customers/data_request") {
    // CartLift: Cart Drawer & Upsell does not store any customer PII.
    // Responding with 200 OK as per Shopify GDPR requirements.
    // No data payload is returned because no customer data exists.
    logGdprEvent("customers/data_request processed (no PII stored)", shop);
    return new Response(JSON.stringify({
      message: "No customer data stored by CartLift: Cart Drawer & Upsell"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  if (normalized === "customers/redact") {
    // CartLift: Cart Drawer & Upsell does not store any customer PII.
    // Responding with 200 OK as per Shopify GDPR requirements.
    // No deletion needed because no customer data exists.
    logGdprEvent("customers/redact processed (no PII stored)", shop);
    return new Response(JSON.stringify({
      message: "No customer data to redact - CartLift: Cart Drawer & Upsell does not store customer PII"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  if (normalized === "shop/redact") {
    await deleteShopData(shop);
    logGdprEvent("shop/redact completed - all shop data deleted", shop);
    return new Response(JSON.stringify({
      message: "Shop data successfully redacted"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  return new Response("Unsupported topic", { status: 400 });
};
