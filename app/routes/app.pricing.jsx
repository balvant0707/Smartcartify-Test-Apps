import { Form, useLoaderData, useNavigation } from "react-router";
import { Page, Text, Button, Badge } from "@shopify/polaris";
import { useEffect, useState } from "react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { PLANS } from "../lib/plans.js";

const toDateOrNull = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const isPaidPlanId = (planId) => planId === "monthly" || planId === "yearly";

// ✅ Make sure FREE exists in UI even if PLANS file forgets it
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
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  // ✅ Read DB record only (NO auto insert)
  const record = await prisma.planSubscription.findUnique({ where: { shop } });

  // ✅ Read Shopify active subscription (NO DB write here)
  let active = null;
  let activeList = [];
  try {
    const query = `#graphql
      query ActiveSubs {
        currentAppInstallation {
          activeSubscriptions {
            id
            name
            status
            currentPeriodEnd
          }
        }
      }
    `;
    const resp = await admin.graphql(query);
    const json = await resp.json();
    activeList = json?.data?.currentAppInstallation?.activeSubscriptions ?? [];
    active = activeList.find((s) => s.status === "ACTIVE") || null;
    console.log("Pricing loader activeSubscriptions:", activeList);
  } catch (e) {
    console.log("Pricing loader activeSubscriptions fetch failed:", e?.message);
  }

  // ✅ Decide UI state:
  // - If DB record exists -> use it
  // - If no DB record -> show FREE in UI but keep all buttons enabled (dbReady=false)
  const dbReady = Boolean(record);

  const currentPlanId = record?.planId ?? "free";
  const status = record?.status ?? "NONE";
  const shopifySubGid = record?.shopifySubGid ?? null;
  const currentPeriodEnd = record?.currentPeriodEnd ?? null;

  // ✅ Expose Shopify active too (optional) - not used for disable until dbReady
  const shopifyActive = active
    ? {
      id: active.id,
      name: active.name,
      status: active.status,
      currentPeriodEnd: active.currentPeriodEnd ?? null,
    }
    : null;

  return {
    shop,
    dbReady,
    currentPlanId,
    status,
    shopifySubGid,
    currentPeriodEnd,
    shopifyActive,
  };
}

export async function action({ request }) {
  const { admin, session, redirect } = await authenticate.admin(request);
  const shop = session.shop;

  const reqUrl = new URL(request.url);
  const host = reqUrl.searchParams.get("host");

  const form = await request.formData();

  // ✅ top button intent
  const intent = String(form.get("intent") || "").trim();
  const rawPlanId = String(form.get("planId") || "").trim().toLowerCase();

  console.log("Pricing action invoked:", { shop, host, rawPlanId, intent });

  const getActiveShopifySub = async () => {
    const query = `#graphql
      query ActiveSubs {
        currentAppInstallation {
          activeSubscriptions {
            id
            name
            status
            currentPeriodEnd
          }
        }
      }
    `;
    const resp = await admin.graphql(query);
    const json = await resp.json();
    const list = json?.data?.currentAppInstallation?.activeSubscriptions ?? [];
    const active = list.find((s) => s.status === "ACTIVE") || null;
    return { active, list };
  };

  const cancelShopifySub = async (subscriptionId) => {
    const mutation = `#graphql
      mutation CancelSub($id: ID!, $prorate: Boolean!) {
        appSubscriptionCancel(id: $id, prorate: $prorate) {
          userErrors { field message }
          appSubscription { id status name }
        }
      }
    `;
    const resp = await admin.graphql(mutation, {
      variables: { id: subscriptionId, prorate: false },
    });
    const json = await resp.json();
    const err = json?.data?.appSubscriptionCancel?.userErrors?.[0]?.message;
    if (err) throw new Error(err);
    return json;
  };

  const upsertFree = async () => {
    await prisma.planSubscription.upsert({
      where: { shop },
      update: {
        planId: "free",
        planName: "Free",
        status: "ACTIVE",
        shopifySubGid: null,
        currentPeriodEnd: null,
      },
      create: {
        shop,
        planId: "free",
        planName: "Free",
        status: "ACTIVE",
        shopifySubGid: null,
        currentPeriodEnd: null,
      },
    });
  };

  // ✅ Cancel current plan top button
  if (intent === "cancel_current") {
    const { active } = await getActiveShopifySub();
    if (active?.id) await cancelShopifySub(active.id);

    // NOTE: You asked "free select kare toj entry" - so cancel button WILL NOT auto-insert free.
    // If you still want cancel button to set free in DB, uncomment next line:
    // await upsertFree();

    const back = host
      ? `/app/pricing?host=${encodeURIComponent(host)}&shop=${encodeURIComponent(shop)}`
      : "/app/pricing";
    return redirect(back);
  }

  // ✅ Must have planId when selecting plans
  if (!rawPlanId) {
    const back = host
      ? `/app/pricing?host=${encodeURIComponent(host)}&shop=${encodeURIComponent(shop)}`
      : "/app/pricing";
    return redirect(back);
  }

  // ✅ FREE => DB entry only when user selects Free
  if (rawPlanId === "free") {
    const { active } = await getActiveShopifySub();
    if (active?.id) {
      await cancelShopifySub(active.id);
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

  const returnUrlObj = new URL("/app/billing/return", request.url);
  if (host) returnUrlObj.searchParams.set("host", host);
  returnUrlObj.searchParams.set("shop", shop);
  returnUrlObj.protocol = "https:";
  const returnUrl = returnUrlObj.toString();

  const mutation = `#graphql
    mutation CreateSub(
      $name: String!
      $returnUrl: URL!
      $price: MoneyInput!
      $interval: AppPricingInterval!
      $trialDays: Int
      $test: Boolean!
    ) {
      appSubscriptionCreate(
        name: $name
        returnUrl: $returnUrl
        test: $test
        trialDays: $trialDays
        lineItems: [{ plan: { appRecurringPricingDetails: { price: $price, interval: $interval } } }]
      ) {
        userErrors { field message }
        confirmationUrl
        appSubscription { id status name }
      }
    }
  `;

  const resp = await admin.graphql(mutation, {
    variables: {
      name: plan.name,
      returnUrl,
      price: { amount: plan.price, currencyCode: "USD" },
      interval: plan.interval,
      trialDays: 7,
      test: true,
    },
  });

  const json = await resp.json();
  const data = json?.data?.appSubscriptionCreate;
  const err = data?.userErrors?.[0]?.message;
  if (err) throw new Error(err);

  const confirmationUrl = data?.confirmationUrl;
  if (!confirmationUrl) throw new Error("No confirmationUrl returned from Shopify.");

  await prisma.planSubscription.upsert({
    where: { shop },
    update: { planId: plan.id, planName: plan.name, status: "PENDING" },
    create: { shop, planId: plan.id, planName: plan.name, status: "PENDING" },
  });

  return redirect(confirmationUrl, { target: "_top" });
}

export default function Pricing() {
  const { currentPlanId, status, shopifySubGid, currentPeriodEnd, dbReady } =
    useLoaderData();

  const navigation = useNavigation();

  const [loadingPlanId, setLoadingPlanId] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    if (navigation.state === "idle") {
      setLoadingPlanId(null);
      setCancelLoading(false);
    }
  }, [navigation.state]);

  const hasPaidActive =
    status === "ACTIVE" && Boolean(shopifySubGid) && isPaidPlanId(currentPlanId);

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

  const cancelDisabled = !paidActiveAndNotExpired || navigation.state !== "idle";

  // ✅ IMPORTANT: if DB has no row yet, keep ALL plan buttons enabled
  const bypassDisable = !dbReady;

  const monthlyPlan = UI_PLANS.find((plan) => plan.id === "monthly");
  const yearlyPlan = UI_PLANS.find((plan) => plan.id === "yearly");
  const yearlyFromMonthly =
    monthlyPlan?.price !== undefined ? Number(monthlyPlan.price) * 12 : null;
  const yearlySavings =
    yearlyFromMonthly !== null && yearlyPlan?.price !== undefined
      ? Math.max(0, yearlyFromMonthly - Number(yearlyPlan.price))
      : null;
  const yearlySavingsPercent =
    yearlySavings !== null && yearlyFromMonthly
      ? Math.round((yearlySavings / yearlyFromMonthly) * 100)
      : null;
  const yearlyBadgeText =
    yearlyFromMonthly !== null
      ? `${yearlySavingsPercent ?? 0}% Saving`
      : "Annual offer";

  return (
    <Page title="Choose your plan" style={{ padding: 0 }}>
      <style
        type="text/css"
        dangerouslySetInnerHTML={{ __html: PRICING_BADGE_CSS }}
      />
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
          {UI_PLANS.map((plan) => {
            const details = planDetails[plan.id];
            const isCurrent = plan.id === currentPlanId;

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

            // ✅ Until DB entry exists -> everything enabled
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

                  <div style={priceTextStyle}>{details?.priceLabel ?? `$${plan.price}`}</div>
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
