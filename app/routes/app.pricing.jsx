import { Form, useLoaderData, useNavigation } from "react-router";
import { Page, Text, Button, Badge } from "@shopify/polaris";
import { useEffect, useState } from "react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { PLANS } from "../lib/plans.js";
import { getStripe, getStripePriceId } from "../stripe.server.js";

const toDateOrNull = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const isPaidPlanId = (planId) => planId === "monthly" || planId === "yearly";

// バ. Make sure FREE exists in UI even if PLANS file forgets it
const UI_PLANS = (() => {
  const hasFree = PLANS?.some((p) => p.id === "free");
  if (hasFree) return PLANS;
  return [{ id: "free", name: "Free", price: 0, interval: null }, ...PLANS];
})();

const PRICING_BADGE_CSS = `
.Polaris-Badge--toneInfo {
  background-color: #ffffff !important;
  color: #000000 !important;
}
`;

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  // バ. Read DB record only (NO auto insert)
  const record = await prisma.planSubscription.findUnique({ where: { shop } });

  // バ. Decide UI state:
  // - If DB record exists -> use it
  // - If no DB record -> show FREE in UI but keep all buttons enabled (dbReady=false)
  const dbReady = Boolean(record);

  const currentPlanId = record?.planId ?? "free";
  const status = record?.status ?? "NONE";
  const stripeSubscriptionId = record?.stripeSubscriptionId ?? null;
  const currentPeriodEnd = record?.currentPeriodEnd ?? null;

  let stripePlans = {};
  try {
    const stripe = getStripe();
    const currency = (process.env.STRIPE_CURRENCY || "USD").toLowerCase();
    const monthlyPriceId = getStripePriceId("monthly");
    const yearlyPriceId = getStripePriceId("yearly");

    let monthly = null;
    let yearly = null;

    if (monthlyPriceId) {
      monthly = await stripe.prices.retrieve(monthlyPriceId, {
        expand: ["product"],
      });
    }
    if (yearlyPriceId) {
      yearly = await stripe.prices.retrieve(yearlyPriceId, {
        expand: ["product"],
      });
    }

    if (!monthly || !yearly) {
      const pricesResp = await stripe.prices.list({
        active: true,
        limit: 100,
        expand: ["data.product"],
      });
      const prices = pricesResp?.data || [];
      const recurring = prices.filter(
        (price) =>
          price?.active &&
          price?.recurring &&
          price?.currency?.toLowerCase() === currency &&
          price?.unit_amount != null,
      );

      const pick = (predicate) => recurring.find(predicate) || null;

      if (!monthly) {
        monthly = pick(
          (price) =>
            price?.recurring?.interval === "month" &&
            (price?.recurring?.interval_count || 1) === 1,
        );
      }
      if (!yearly) {
        yearly =
          pick(
            (price) =>
              price?.recurring?.interval === "year" &&
              (price?.recurring?.interval_count || 1) === 1,
          ) ||
          pick(
            (price) =>
              price?.recurring?.interval === "month" &&
              (price?.recurring?.interval_count || 1) === 12,
          );
      }
    }

    if (monthly) {
      stripePlans.monthly = {
        priceId: monthly.id,
        amount: monthly.unit_amount,
        currency: monthly.currency?.toUpperCase() || currency.toUpperCase(),
        interval: "month",
        name: monthly.nickname || monthly.product?.name || "Monthly",
      };
    }

    if (yearly) {
      stripePlans.yearly = {
        priceId: yearly.id,
        amount: yearly.unit_amount,
        currency: yearly.currency?.toUpperCase() || currency.toUpperCase(),
        interval: "year",
        name: yearly.nickname || yearly.product?.name || "Yearly",
      };
    }
  } catch (error) {
    console.warn("Stripe price fetch failed:", error?.message || error);
  }

  return {
    shop,
    dbReady,
    currentPlanId,
    status,
    stripeSubscriptionId,
    currentPeriodEnd,
    stripePlans,
  };
}

export async function action({ request }) {
  const { session, redirect } = await authenticate.admin(request);
  const shop = session.shop;

  const reqUrl = new URL(request.url);
  const host = reqUrl.searchParams.get("host");

  const form = await request.formData();

  // バ. top button intent
  const intent = String(form.get("intent") || "").trim();
  const rawPlanId = String(form.get("planId") || "").trim().toLowerCase();
  const rawPriceId = String(form.get("priceId") || "").trim();

  console.log("Pricing action invoked:", { shop, host, rawPlanId, intent });

  const stripe = getStripe();

  const getOrCreateStripeCustomer = async () => {
    const record = await prisma.planSubscription.findUnique({ where: { shop } });
    if (record?.stripeCustomerId) return record.stripeCustomerId;

    const customer = await stripe.customers.create({
      name: shop,
      metadata: { shop },
    });

    await prisma.planSubscription.upsert({
      where: { shop },
      update: { stripeCustomerId: customer.id },
      create: { shop, stripeCustomerId: customer.id },
    });

    return customer.id;
  };

  const upsertFree = async () => {
    await prisma.planSubscription.upsert({
      where: { shop },
      update: {
        planId: "free",
        planName: "Free",
        status: "ACTIVE",
        stripeSubscriptionId: null,
        stripePriceId: null,
        currentPeriodEnd: null,
      },
      create: {
        shop,
        planId: "free",
        planName: "Free",
        status: "ACTIVE",
        stripeSubscriptionId: null,
        stripePriceId: null,
        currentPeriodEnd: null,
      },
    });
  };

  // バ. Cancel current plan top button (cancel at period end)
  if (intent === "cancel_current") {
    const record = await prisma.planSubscription.findUnique({ where: { shop } });
    if (record?.stripeSubscriptionId) {
      const canceled = await stripe.subscriptions.update(record.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
      await prisma.planSubscription.update({
        where: { shop },
        data: {
          status: "CANCEL_AT_PERIOD_END",
          currentPeriodEnd: canceled.current_period_end
            ? new Date(canceled.current_period_end * 1000)
            : record.currentPeriodEnd,
        },
      }).catch(() => {});
    }

    const back = host
      ? `/app/pricing?host=${encodeURIComponent(host)}&shop=${encodeURIComponent(shop)}`
      : "/app/pricing";
    return redirect(back);
  }

  // バ. Must have planId when selecting plans
  if (!rawPlanId) {
    const back = host
      ? `/app/pricing?host=${encodeURIComponent(host)}&shop=${encodeURIComponent(shop)}`
      : "/app/pricing";
    return redirect(back);
  }

  // バ. FREE => DB entry only when user selects Free
  if (rawPlanId === "free") {
    const record = await prisma.planSubscription.findUnique({ where: { shop } });
    if (record?.stripeSubscriptionId) {
      await stripe.subscriptions.cancel(record.stripeSubscriptionId);
    }
    await upsertFree();

    const back = host
      ? `/app/pricing?host=${encodeURIComponent(host)}&shop=${encodeURIComponent(shop)}`
      : "/app/pricing";
    return redirect(back);
  }

  if (!isPaidPlanId(rawPlanId)) throw new Error(`Invalid planId: ${rawPlanId}`);

  const plan = PLANS.find((p) => p.id === rawPlanId);
  if (!plan) throw new Error(`Plan config missing for: ${rawPlanId}`);

  const priceId = rawPriceId || getStripePriceId(plan.id);
  if (!priceId) throw new Error(`Missing Stripe price id for plan: ${plan.id}`);

  const origin = new URL(request.url).origin;
  const buildReturnUrl = (path, extraParams = {}) => {
    const url = new URL(path, origin);
    if (host) url.searchParams.set("host", host);
    url.searchParams.set("shop", shop);
    Object.entries(extraParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    return url.toString();
  };

  const successUrl =
    process.env.STRIPE_SUCCESS_URL ||
    buildReturnUrl("/app", { stripe: "success", session_id: "{CHECKOUT_SESSION_ID}" });
  const cancelUrl =
    process.env.STRIPE_CANCEL_URL || buildReturnUrl("/app/pricing", { stripe: "cancel" });

  const customerId = await getOrCreateStripeCustomer();
  const existing = await prisma.planSubscription.findUnique({ where: { shop } });

  if (existing?.stripeSubscriptionId && existing?.status === "ACTIVE") {
    const subscription = await stripe.subscriptions.retrieve(
      existing.stripeSubscriptionId,
    );
    const itemId = subscription?.items?.data?.[0]?.id;
    if (!itemId) throw new Error("Stripe subscription item missing.");

    const updated = await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: false,
      proration_behavior: "create_prorations",
      items: [{ id: itemId, price: priceId }],
    });

    await prisma.planSubscription.update({
      where: { shop },
      data: {
        planId: plan.id,
        planName: plan.name,
        status: "ACTIVE",
        stripePriceId: priceId,
        currentPeriodEnd: updated.current_period_end
          ? new Date(updated.current_period_end * 1000)
          : existing.currentPeriodEnd,
      },
    }).catch(() => {});

    const back = host
      ? `/app/pricing?host=${encodeURIComponent(host)}&shop=${encodeURIComponent(shop)}`
      : "/app/pricing";
    return redirect(back);
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: shop,
    subscription_data: {
      metadata: { shop, planId: plan.id },
    },
    metadata: { shop, planId: plan.id },
  });

  if (!checkoutSession?.url) throw new Error("No Stripe checkout URL returned.");

  await prisma.planSubscription.upsert({
    where: { shop },
    update: {
      planId: plan.id,
      planName: plan.name,
      status: "PENDING",
      stripePriceId: priceId,
      stripeCustomerId: customerId,
    },
    create: {
      shop,
      planId: plan.id,
      planName: plan.name,
      status: "PENDING",
      stripePriceId: priceId,
      stripeCustomerId: customerId,
    },
  });

  return redirect(checkoutSession.url, { target: "_top" });
}

export default function Pricing() {
  const {
    currentPlanId,
    status,
    stripeSubscriptionId,
    currentPeriodEnd,
    dbReady,
    stripePlans,
  } =
    useLoaderData();

  const navigation = useNavigation();

  const [loadingPlanId, setLoadingPlanId] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [billingInterval, setBillingInterval] = useState(
    currentPlanId === "yearly" ? "year" : "month",
  );

  useEffect(() => {
    if (navigation.state === "idle") {
      setLoadingPlanId(null);
      setCancelLoading(false);
    }
  }, [navigation.state]);

  const hasPaidActive =
    status === "ACTIVE" && Boolean(stripeSubscriptionId) && isPaidPlanId(currentPlanId);

  const isExpired =
    currentPeriodEnd ? new Date(currentPeriodEnd).getTime() < Date.now() : false;

  const paidActiveAndNotExpired = hasPaidActive && !isExpired;

  const planDetails = {
    free: {
      title: "Free Plan",
      subtitle: "Basic access to features",
      features: [
        "Priority support",
        "One Shipping Rule",
        "One Automation Discount Rule",
        "Customize Settings",
        "Select Cart Step Progress & Preview",
      ],
      priceLabel: "Free",
    },
    monthly: {
      title: "Monthly Plan",
      subtitle: "7 day free trial",
      features: [
        "Priority support",
        "Unlimited Shipping Rule",
        "Unlimited Discount Rule",
        "Unlimited Free Product Rule",
        "Unlimited Buy X Get Y Rule",
        "Customize Settings",
        "Select Cart Step Progress & Preview",
      ],
      priceLabel: "$5",
    },
    yearly: {
      title: "Yearly Plan",
      subtitle: "7 day free trial",
      features: [
        "Priority support",
        "Unlimited Shipping Rule",
        "Unlimited Discount Rule",
        "Unlimited Free Product Rule",
        "Unlimited Buy X Get Y Rule",
        "Customize Settings",
        "Select Cart Step Progress & Preview",
      ],
      priceLabel: "$49",
    },
  };

  const containerStyle = {
    display: "flex",
    justifyContent: "center",
    gap: 10,
    alignItems: "stretch",
    marginTop: 24,
  };

  const cardStyle = {
    borderRadius: 28,
    background: "#fff",
    boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    minHeight: 520,
    flex: "0 0 calc(33.33% - 10px)",
  };

  const headerStyle = {
    position: "relative",
    padding: "34px 26px 80px",
    height: 170,
    background: "linear-gradient(180deg, #317e31ff 0%, #017e01 100%)",
    color: "#fff",
    overflow: "hidden",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  };

  const titleStyle = {
    margin: 0,
    fontWeight: 800,
    fontSize: "2.25rem",
    lineHeight: "1.15",
  };

  const subtitleStyle = {
    margin: "8px 0 0",
    fontSize: "1.05rem",
    lineHeight: "1.4",
    color: "rgba(255, 255, 255, 0.88)",
    maxWidth: 260,
  };

  const priceTextStyle = {
    marginTop: 14,
    fontSize: "3.1rem",
    fontWeight: 900,
    letterSpacing: "-0.5px",
    lineHeight: 1,
  };

  const yearlyBadgeWrapStyle = {
    position: "absolute",
    top: 18,
    right: 18,
  };

  const trialBadgeWrapStyle = {
    position: "absolute",
    top: 18,
    left: 18,
  };

  const bodyStyle = {
    padding: "30px 28px 32px",
    flex: 1,
    display: "flex",
    flexDirection: "column",
  };

  const featuresStyle = {
    listStyle: "none",
    padding: 0,
    margin: "4px 0 20px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  };

  const featureItemStyle = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: "0.95rem",
  };

  const buttonWrapperStyle = { marginTop: "auto" };
  const toggleWrapStyle = {
    display: "flex",
    justifyContent: "center",
    gap: 10,
    marginTop: 16,
  };
  const toggleButtonStyle = (active) => ({
    borderRadius: 999,
    padding: "6px 16px",
    border: active ? "2px solid #017e01" : "1px solid #d0d5dd",
    background: active ? "#ecfdf3" : "#fff",
    fontWeight: 600,
  });

  const cancelDisabled = !paidActiveAndNotExpired || navigation.state !== "idle";

  // バ. IMPORTANT: if DB has no row yet, keep ALL plan buttons enabled
  const bypassDisable = !dbReady;

  const formatAmount = (amount, currency = "USD") =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount / 100);

  const monthlyPlan = UI_PLANS.find((plan) => plan.id === "monthly");
  const yearlyPlan = UI_PLANS.find((plan) => plan.id === "yearly");
  const monthlyAmount =
    stripePlans?.monthly?.amount ??
    (monthlyPlan?.price !== undefined ? Number(monthlyPlan.price) * 100 : null);
  const yearlyAmount =
    stripePlans?.yearly?.amount ??
    (yearlyPlan?.price !== undefined ? Number(yearlyPlan.price) * 100 : null);
  const yearlyFromMonthly = monthlyAmount !== null ? Number(monthlyAmount) * 12 : null;
  const yearlySavings =
    yearlyFromMonthly !== null && yearlyAmount !== null
      ? Math.max(0, yearlyFromMonthly - Number(yearlyAmount))
      : null;
  const yearlySavingsPercent =
    yearlySavings !== null && yearlyFromMonthly
      ? Math.round((yearlySavings / yearlyFromMonthly) * 100)
      : null;
  const yearlyBadgeText =
    yearlyFromMonthly !== null
      ? `${yearlySavingsPercent ?? 0}% Saving`
      : "Annual offer";
  const plansToRender = UI_PLANS.filter((plan) => {
    if (plan.id === "free") return true;
    return billingInterval === "month" ? plan.id === "monthly" : plan.id === "yearly";
  });

  return (
    <Page title="Choose your plan" style={{ padding: 0 }}>
      <style
        type="text/css"
        dangerouslySetInnerHTML={{ __html: PRICING_BADGE_CSS }}
      />
      <div style={toggleWrapStyle}>
        <Button
          onClick={() => setBillingInterval("month")}
          variant={billingInterval === "month" ? "primary" : "secondary"}
          style={toggleButtonStyle(billingInterval === "month")}
        >
          Monthly
        </Button>
        <Button
          onClick={() => setBillingInterval("year")}
          variant={billingInterval === "year" ? "primary" : "secondary"}
          style={toggleButtonStyle(billingInterval === "year")}
        >
          Yearly
        </Button>
      </div>
      {/* Top Cancel Current Plan Button */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
        <Form method="post" onSubmit={() => setCancelLoading(true)} reloadDocument>
          <input type="hidden" name="intent" value="cancel_current" />
          <Button
            submit
            tone="critical"
            disabled={cancelDisabled}
            loading={cancelLoading && navigation.state !== "idle"}
          >
            Cancel current plan
          </Button>
        </Form>
      </div>

      <div style={{ padding: "16px 0" }}>
        <div style={containerStyle}>
          {plansToRender.map((plan) => {
            const details = planDetails[plan.id];
            const isCurrent = plan.id === currentPlanId;
            const priceLabel =
              plan.id === "free"
                ? "Free"
                : plan.id === "monthly" && monthlyAmount !== null
                ? formatAmount(monthlyAmount, stripePlans?.monthly?.currency || "USD")
                : plan.id === "yearly" && yearlyAmount !== null
                ? formatAmount(yearlyAmount, stripePlans?.yearly?.currency || "USD")
                : details?.priceLabel ?? `$${plan.price}`;

            const disableBecauseCurrentActive =
              isCurrent &&
              status === "ACTIVE" &&
              (!isExpired || (isPaidPlanId(plan.id) && !currentPeriodEnd));

            const disableBecausePending = isCurrent && status === "PENDING";

            const disableFreeBecausePaidActive =
              plan.id === "free" && paidActiveAndNotExpired;

            let disableButton =
              disableBecauseCurrentActive ||
              disableBecausePending ||
              disableFreeBecausePaidActive;

            // バ. Until DB entry exists -> everything enabled
            if (bypassDisable) disableButton = false;

            const isThisSubmitting =
              loadingPlanId === plan.id || (navigation.state !== "idle" && isCurrent);

            let buttonLabel = "Start now";
            if (disableButton) {
              if (disableFreeBecausePaidActive) buttonLabel = "Cancel current plan first";
              else if (disableBecausePending) buttonLabel = "Waiting for activation";
              else buttonLabel = "Current plan";
            }

            return (
              <div key={plan.id} style={cardStyle}>
                <div style={headerStyle}>
                  {plan.id === "yearly" && (
                    <div style={yearlyBadgeWrapStyle}>
                      <Badge tone="info">{yearlyBadgeText}</Badge>
                    </div>
                  )}

                  <Text as="h2" style={titleStyle}>
                    {details?.title ?? plan.name}
                  </Text>

                  <Text as="p" style={subtitleStyle}>
                    {details?.subtitle ?? plan.name}
                  </Text>

                  <div style={priceTextStyle}>{priceLabel}</div>
                </div>

                <div style={bodyStyle}>
                  <ul style={featuresStyle}>
                    {details?.features?.map((feature) => (
                      <li key={feature} style={featureItemStyle}>
                        <span
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: "50%",
                            background: "#017e01",
                            display: "inline-block",
                          }}
                        />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <div style={buttonWrapperStyle}>
                    <Form method="post" onSubmit={() => setLoadingPlanId(plan.id)} reloadDocument>
                      <input type="hidden" name="planId" value={plan.id} />
                      <input
                        type="hidden"
                        name="priceId"
                        value={
                          plan.id === "monthly"
                            ? stripePlans?.monthly?.priceId || ""
                            : plan.id === "yearly"
                            ? stripePlans?.yearly?.priceId || ""
                            : ""
                        }
                      />
                      {/* <Button
                        submit
                        fullWidth
                        disabled={disableButton || navigation.state !== "idle"}
                        loading={isThisSubmitting && !disableButton}
                        variant={isCurrent ? "secondary" : "primary"}
                      >
                        {buttonLabel}
                      </Button> */}
                      <Button
                        submit
                        fullWidth
                        disabled={disableButton || navigation.state !== "idle"}
                        loading={isThisSubmitting && !disableButton}
                        variant="primary"
                        style={
                          !disableButton && navigation.state === "idle"
                            ? {
                              background: "linear-gradient(180deg, #5c1d8f 0%, #b90d2f 85%)",
                              border: "none",
                            }
                            : {}
                        }
                      >
                        {buttonLabel}
                      </Button>

                    </Form>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Page>
  );
}
