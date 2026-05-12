import { Form, useLoaderData, useNavigation, useRouteError } from "react-router";
import { Page, Text, Button, Badge, Box } from "@shopify/polaris";
import { useEffect, useState } from "react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { PLANS } from "../lib/plans.js";
import logger from "../lib/logger.server.js";

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
.pricing-card {
  border: 1px solid #dcdfe4;
  background: #ffffff;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  min-height: 420px;
}
.pricing-card__header {
  border-bottom: 1px solid #e3e5e8;
  background: #f9fafb;
  color: #202223;
}
.pricing-feature-dot {
  width: 8px;
  height: 8px;
  border-radius: 4px;
  background: #008060;
  display: inline-block;
  flex-shrink: 0;
}
`;

export async function loader({ request }) {
  const { session, billing } = await authenticate.admin(request);
  const shop = session.shop;

  // バ. Read DB record only (NO auto insert)
  const record = await prisma.planSubscription.findUnique({ where: { shop } });

  // バ. Decide UI state:
  // - If DB record exists -> use it
  // - If no DB record -> show FREE in UI but keep all buttons enabled (dbReady=false)
  const dbReady = Boolean(record);

  const currentPlanId = record?.planId ?? "free";
  const status = record?.status ?? "NONE";
  const currentPeriodEnd = record?.currentPeriodEnd ?? null;
  const shopifySubGid = record?.shopifySubGid ?? null;

  const isTest = process.env.SHOPIFY_BILLING_TEST === "true";
  let billingStatus = null;
  try {
    billingStatus = await billing.check({
      plans: ["monthly", "yearly"],
      isTest,
    });
  } catch (error) {
    logger.warn("Shopify billing check failed:", error?.message || error);
  }

  const activeSubscription =
    billingStatus?.appSubscriptions?.find((sub) => sub.status === "ACTIVE") ||
    billingStatus?.appSubscriptions?.[0] ||
    null;

  const matchedPlan = activeSubscription
    ? PLANS.find((plan) => plan.name === activeSubscription.name)
    : null;

  const resolvedPlanId = matchedPlan?.id ?? currentPlanId;
  const resolvedStatus = activeSubscription?.status ?? status;
  const resolvedPeriodEnd =
    toDateOrNull(activeSubscription?.currentPeriodEnd) ?? currentPeriodEnd;
  const resolvedShopifySubGid = activeSubscription?.id ?? shopifySubGid;
  const resolvedPlanName =
    activeSubscription?.name ?? matchedPlan?.name ?? record?.planName ?? null;
  const resolvedTrialDays =
    typeof activeSubscription?.trialDays === "number"
      ? activeSubscription.trialDays
      : record?.trialDays ?? null;
  const resolvedIsTest =
    typeof activeSubscription?.test === "boolean"
      ? activeSubscription.test
      : record?.isTest ?? null;
  const lineItem = activeSubscription?.lineItems?.[0] || null;
  const pricingDetails = lineItem?.plan?.pricingDetails || null;
  const resolvedBillingInterval = pricingDetails?.interval
    ? String(pricingDetails.interval)
    : record?.billingInterval ?? null;
  const resolvedBillingAmount =
    pricingDetails?.price?.amount != null
      ? Number(pricingDetails.price.amount)
      : record?.billingAmount ?? null;
  const resolvedBillingCurrency =
    pricingDetails?.price?.currencyCode ?? record?.billingCurrency ?? null;
  const resolvedSubscriptionCreatedAt =
    toDateOrNull(activeSubscription?.createdAt) ?? record?.subscriptionCreatedAt ?? null;

  const resolvedDbReady = dbReady || Boolean(activeSubscription);

  if (activeSubscription) {
    await prisma.planSubscription.upsert({
      where: { shop },
      update: {
        planId: resolvedPlanId,
        planName: resolvedPlanName,
        status: resolvedStatus,
        shopifySubGid: resolvedShopifySubGid,
        currentPeriodEnd: resolvedPeriodEnd,
        trialDays: resolvedTrialDays,
        isTest: resolvedIsTest,
        billingInterval: resolvedBillingInterval,
        billingAmount: resolvedBillingAmount,
        billingCurrency: resolvedBillingCurrency,
        subscriptionCreatedAt: resolvedSubscriptionCreatedAt,
      },
      create: {
        shop,
        planId: resolvedPlanId,
        planName: resolvedPlanName,
        status: resolvedStatus,
        shopifySubGid: resolvedShopifySubGid,
        currentPeriodEnd: resolvedPeriodEnd,
        trialDays: resolvedTrialDays,
        isTest: resolvedIsTest,
        billingInterval: resolvedBillingInterval,
        billingAmount: resolvedBillingAmount,
        billingCurrency: resolvedBillingCurrency,
        subscriptionCreatedAt: resolvedSubscriptionCreatedAt,
      },
    }).catch((err) => {
      logger.warn("Failed to upsert active subscription in pricing loader:", err?.message);
    });
  }

  return {
    shop,
    dbReady: resolvedDbReady,
    currentPlanId: resolvedPlanId,
    status: resolvedStatus,
    currentPeriodEnd: resolvedPeriodEnd,
    shopifySubGid: resolvedShopifySubGid,
  };
}

export async function action({ request }) {
  const { session, redirect, billing } = await authenticate.admin(request);
  const shop = session.shop;
  const isTest = process.env.SHOPIFY_BILLING_TEST === "true";

  const reqUrl = new URL(request.url);
  const host = reqUrl.searchParams.get("host");

  const form = await request.formData();

  // Note. top button intent
  const intent = String(form.get("intent") || "").trim();
  const rawPlanId = String(form.get("planId") || "").trim().toLowerCase();

  logger.log("Pricing action invoked:", { shop, host, rawPlanId, intent });

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

  const getActiveSubscription = async () => {
    const billingCheck = await billing.check({
      plans: ["monthly", "yearly"],
      isTest,
    });
    return (
      billingCheck?.appSubscriptions?.find((sub) => sub.status === "ACTIVE") ||
      billingCheck?.appSubscriptions?.[0] ||
      null
    );
  };

  const upsertFree = async () => {
    await prisma.planSubscription.upsert({
      where: { shop },
      update: {
        planId: "free",
        planName: "Free",
        status: "ACTIVE",
        shopifySubGid: null,
        billingInterval: null,
        billingAmount: 0,
        billingCurrency: "USD",
        trialDays: null,
        isTest,
        subscriptionCreatedAt: null,
        currentPeriodEnd: null,
      },
      create: {
        shop,
        planId: "free",
        planName: "Free",
        status: "ACTIVE",
        shopifySubGid: null,
        billingInterval: null,
        billingAmount: 0,
        billingCurrency: "USD",
        trialDays: null,
        isTest,
        subscriptionCreatedAt: null,
        currentPeriodEnd: null,
      },
    });
  };

  // Note. Cancel current plan top button
  if (intent === "cancel_current") {
    const record = await prisma.planSubscription.findUnique({ where: { shop } });
    const activeSub = record?.shopifySubGid
      ? { id: record.shopifySubGid }
      : await getActiveSubscription();

    if (activeSub?.id) {
      const canceled = await billing.cancel({
        subscriptionId: activeSub.id,
        isTest,
        prorate: false,
      });
      await prisma.planSubscription.upsert({
        where: { shop },
        update: {
          status: canceled?.status || "CANCELLED",
          shopifySubGid: canceled?.id || activeSub.id,
          planName: canceled?.name || record?.planName,
          isTest:
            typeof canceled?.test === "boolean" ? canceled.test : record?.isTest,
          trialDays:
            typeof canceled?.trialDays === "number"
              ? canceled.trialDays
              : record?.trialDays,
          currentPeriodEnd: canceled?.currentPeriodEnd
            ? new Date(canceled.currentPeriodEnd)
            : record?.currentPeriodEnd,
        },
        create: {
          shop,
          status: canceled?.status || "CANCELLED",
          shopifySubGid: canceled?.id || activeSub.id,
          planName: canceled?.name || null,
        },
      }).catch((err) => {
        logger.warn("Failed to update cancelled subscription for shop:", shop, err?.message);
      });
    }

    const back = host
      ? `/app/pricing?host=${encodeURIComponent(host)}&shop=${encodeURIComponent(shop)}`
      : "/app/pricing";
    return redirect(back);
  }

  // Note. Must have planId when selecting plans
  if (!rawPlanId) {
    const back = host
      ? `/app/pricing?host=${encodeURIComponent(host)}&shop=${encodeURIComponent(shop)}`
      : "/app/pricing";
    return redirect(back);
  }

  // Note. FREE => DB entry only when user selects Free
  if (rawPlanId === "free") {
    const activeSub = await getActiveSubscription();
    if (activeSub?.id) {
      await billing.cancel({ subscriptionId: activeSub.id, isTest, prorate: false });
    }
    await upsertFree();

    const back = host
      ? `/app?host=${encodeURIComponent(host)}&shop=${encodeURIComponent(shop)}`
      : "/app";
    return redirect(back);
  }

  if (!isPaidPlanId(rawPlanId)) throw new Error(`Invalid planId: ${rawPlanId}`);

  const plan = PLANS.find((p) => p.id === rawPlanId);
  if (!plan) throw new Error(`Plan config missing for: ${rawPlanId}`);
  if (plan.price <= 0) throw new Error(`Invalid paid plan: ${plan.id}`);

  await prisma.planSubscription.upsert({
    where: { shop },
    update: {
      planId: plan.id,
      planName: plan.name,
      status: "PENDING",
      billingInterval:
        plan.interval === "ANNUAL" ? "ANNUAL" : "EVERY_30_DAYS",
      billingAmount: plan.price,
      billingCurrency: "USD",
      trialDays: plan.trialDays ?? 7,
      isTest,
    },
    create: {
      shop,
      planId: plan.id,
      planName: plan.name,
      status: "PENDING",
      billingInterval:
        plan.interval === "ANNUAL" ? "ANNUAL" : "EVERY_30_DAYS",
      billingAmount: plan.price,
      billingCurrency: "USD",
      trialDays: plan.trialDays ?? 7,
      isTest,
    },
  });

  const returnUrl = buildReturnUrl("/app", { billing: "success" });
  return billing.request({
    plan: plan.id,
    isTest,
    returnUrl,
  });
}

export default function Pricing() {
  const {
    currentPlanId,
    status,
    currentPeriodEnd,
    dbReady,
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

  const hasPaidActive = status === "ACTIVE" && isPaidPlanId(currentPlanId);

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

  const cardStyle = {
    overflow: "hidden",
  };

  const headerStyle = {
    position: "relative",
    padding: "20px",
    minHeight: 150,
    overflow: "hidden",
  };

  const titleStyle = {
    margin: 0,
    fontWeight: 700,
    fontSize: "1.25rem",
    lineHeight: "1.25",
  };

  const subtitleStyle = {
    margin: "8px 0 0",
    fontSize: "0.9rem",
    lineHeight: "1.4",
    color: "#5c5f62",
    maxWidth: 260,
  };

  const priceTextStyle = {
    marginTop: 18,
    fontSize: "2.1rem",
    fontWeight: 750,
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
    padding: "20px",
    flex: 1,
    display: "flex",
    flexDirection: "column",
  };

  const featuresStyle = {
    listStyle: "none",
    padding: 0,
    margin: "0 0 20px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  };

  const featureItemStyle = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: "0.9rem",
    color: "#303030",
  };

  const buttonWrapperStyle = { marginTop: "auto" };
  const toggleWrapStyle = {
    display: "flex",
    justifyContent: "center",
    gap: 10,
    marginTop: 16,
  };
  const toggleButtonStyle = (active) => ({
    padding: "6px 16px",
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
    }).format(amount);

  const monthlyPlan = UI_PLANS.find((plan) => plan.id === "monthly");
  const yearlyPlan = UI_PLANS.find((plan) => plan.id === "yearly");
  const monthlyAmount =
    monthlyPlan?.price !== undefined ? Number(monthlyPlan.price) : null;
  const yearlyAmount = yearlyPlan?.price !== undefined ? Number(yearlyPlan.price) : null;
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
    <Page
      title="Choose your plan"
      subtitle="Pick the plan that matches how many cart rules your store needs."
    >
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
        <div className="app-pricing-grid">
          {plansToRender.map((plan) => {
            const details = planDetails[plan.id];
            const isCurrent = plan.id === currentPlanId;
            const priceLabel =
              plan.id === "free"
                ? "Free"
                : plan.id === "monthly" && monthlyAmount !== null
                ? formatAmount(monthlyAmount, "USD")
                : plan.id === "yearly" && yearlyAmount !== null
                ? formatAmount(yearlyAmount, "USD")
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
              if (disableFreeBecausePaidActive) buttonLabel = "Start now";
              else if (disableBecausePending) buttonLabel = "Waiting for activation";
              else buttonLabel = "Current plan";
            }

            return (
              <div key={plan.id} className="pricing-card" style={cardStyle}>
                <div className="pricing-card__header" style={headerStyle}>
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
                        <span className="pricing-feature-dot" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <div style={buttonWrapperStyle}>
                    <Form method="post" onSubmit={() => setLoadingPlanId(plan.id)} reloadDocument>
                      <input type="hidden" name="planId" value={plan.id} />
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
                              background: "#1f2937",
                              borderColor: "#1f2937",
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

export function ErrorBoundary() {
  const error = useRouteError();
  return (
    <Page title="Error">
      <Box borderWidth="025" borderColor="border" background="bg-surface" borderRadius="100" padding="400">
        <Text as="h2" variant="headingMd">Something went wrong</Text>
        <Text tone="subdued">
          We encountered an error loading the pricing page. Please try refreshing or contact support if the issue persists.
        </Text>
        {process.env.NODE_ENV !== "production" && error?.message && (
          <Text tone="critical">{error.message}</Text>
        )}
      </Box>
    </Page>
  );
}
