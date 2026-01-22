import Stripe from "stripe";

let stripeClient = null;

const getStripeMode = () => (process.env.STRIPE_MODE || "test").toLowerCase();

const pickByMode = (testValue, liveValue) => {
  const mode = getStripeMode();
  return mode === "live" ? liveValue || testValue : testValue || liveValue;
};

export const getStripe = () => {
  if (!stripeClient) {
    const secretKey = pickByMode(
      process.env.STRIPE_SECRET_KEY,
      process.env.STRIPE_SECRET_KEY_LIVE,
    ) || "";
    if (!secretKey) {
      throw new Error("Missing STRIPE_SECRET_KEY env var.");
    }
    stripeClient = new Stripe(secretKey, { apiVersion: "2024-06-20" });
  }
  return stripeClient;
};

export const getStripeWebhookSecret = () => {
  const secret =
    pickByMode(
      process.env.STRIPE_WEBHOOK_SECRET,
      process.env.STRIPE_WEBHOOK_SECRET_LIVE,
    ) || "";
  if (!secret) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET env var.");
  }
  return secret;
};

export const getStripePriceId = (planId) => {
  const monthly = pickByMode(
    process.env.STRIPE_PRICE_MONTHLY,
    process.env.STRIPE_PRICE_MONTHLY_LIVE,
  );
  const yearly = pickByMode(
    process.env.STRIPE_PRICE_YEARLY,
    process.env.STRIPE_PRICE_YEARLY_LIVE,
  );
  if (planId === "monthly") return monthly || "";
  if (planId === "yearly") return yearly || "";
  return "";
};

export const getPlanIdFromPriceId = (priceId) => {
  if (!priceId) return null;
  const monthly = [
    process.env.STRIPE_PRICE_MONTHLY,
    process.env.STRIPE_PRICE_MONTHLY_LIVE,
  ].filter(Boolean);
  const yearly = [
    process.env.STRIPE_PRICE_YEARLY,
    process.env.STRIPE_PRICE_YEARLY_LIVE,
  ].filter(Boolean);
  if (monthly.includes(priceId)) return "monthly";
  if (yearly.includes(priceId)) return "yearly";
  return null;
};
