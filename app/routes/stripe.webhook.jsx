import prisma from "../db.server";
import { PLANS } from "../lib/plans.js";
import {
  getPlanIdFromPriceId,
  getStripe,
  getStripeWebhookSecret,
} from "../stripe.server.js";

const normalizeStatus = (status, cancelAtPeriodEnd) => {
  if (cancelAtPeriodEnd && (status === "active" || status === "trialing")) {
    return "CANCEL_AT_PERIOD_END";
  }
  if (status === "active" || status === "trialing") return "ACTIVE";
  if (status === "canceled") return "CANCELED";
  if (status === "incomplete" || status === "incomplete_expired") return "PENDING";
  return status ? status.toUpperCase() : "UNKNOWN";
};

const resolvePlanName = (planId, priceNickname) => {
  const plan = PLANS.find((p) => p.id === planId);
  return plan?.name || priceNickname || "Paid Plan";
};

const upsertFromSubscription = async (subscription, shopHint) => {
  const shop =
    subscription?.metadata?.shop ||
    subscription?.customer?.metadata?.shop ||
    shopHint ||
    null;

  if (!shop) {
    console.warn("Stripe webhook missing shop metadata.");
    return;
  }

  const priceId = subscription?.items?.data?.[0]?.price?.id || null;
  const planId = getPlanIdFromPriceId(priceId) || subscription?.metadata?.planId || null;
  const planName = resolvePlanName(planId, subscription?.items?.data?.[0]?.price?.nickname);
  const status = normalizeStatus(subscription?.status, subscription?.cancel_at_period_end);
  const currentPeriodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : null;

  await prisma.planSubscription.upsert({
    where: { shop },
    update: {
      planId,
      planName,
      status,
      stripeSubscriptionId: subscription?.id || null,
      stripeCustomerId: subscription?.customer || null,
      stripePriceId: priceId,
      currentPeriodEnd,
    },
    create: {
      shop,
      planId,
      planName,
      status,
      stripeSubscriptionId: subscription?.id || null,
      stripeCustomerId: subscription?.customer || null,
      stripePriceId: priceId,
      currentPeriodEnd,
    },
  });
};

export async function action({ request }) {
  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing stripe-signature.", { status: 400 });

  const body = await request.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, getStripeWebhookSecret());
  } catch (error) {
    return new Response(`Webhook Error: ${error.message}`, { status: 400 });
  }

  try {
    console.log("Stripe webhook:", event.type, event.id);
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const subscriptionId = session?.subscription;
      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await upsertFromSubscription(
          subscription,
          session?.metadata?.shop || session?.client_reference_id,
        );
      }
    }

    if (event.type === "customer.subscription.updated") {
      await upsertFromSubscription(event.data.object);
    }

    if (event.type === "customer.subscription.deleted") {
      await upsertFromSubscription(event.data.object);
    }
  } catch (error) {
    console.error("Stripe webhook handling failed:", error);
    return new Response("Webhook handler failed.", { status: 500 });
  }

  return new Response("ok");
}
