import Stripe from "stripe";

let stripeClient = null;

export const getStripe = () => {
  if (!stripeClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY || "";
    if (!secretKey) {
      throw new Error("Missing STRIPE_SECRET_KEY env var.");
    }
    stripeClient = new Stripe(secretKey, { apiVersion: "2024-06-20" });
  }
  return stripeClient;
};

export const getStripeWebhookSecret = () => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET || "";
  if (!secret) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET env var.");
  }
  return secret;
};

export const getStripePriceId = (planId) => {
  if (planId === "monthly") return process.env.STRIPE_PRICE_MONTHLY || "";
  if (planId === "yearly") return process.env.STRIPE_PRICE_YEARLY || "";
  return "";
};

export const getPlanIdFromPriceId = (priceId) => {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_MONTHLY) return "monthly";
  if (priceId === process.env.STRIPE_PRICE_YEARLY) return "yearly";
  return null;
};
