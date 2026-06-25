import { useRouteError } from "react-router";
import { Page, Box, Text } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import logger from "../lib/logger.server.js";
import { PLANS } from "../lib/plans.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function loader({ request }) {
  const { admin, session, redirect } = await authenticate.admin(request);
  const shop = session.shop;

  const url = new URL(request.url);
  const shopParam = url.searchParams.get("shop");

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

  let active = null;

  // Retry up to 5 times with 500ms gaps — Shopify activation has a short delay
  for (let i = 0; i < 5; i++) {
    const resp = await admin.graphql(query);
    const json = await resp.json();

    const list = json?.data?.currentAppInstallation?.activeSubscriptions ?? [];
    active = list.find((s) => s.status === "ACTIVE") || null;

    logger.log("Billing return attempt", i + 1, "activeSubscriptions:", list);

    if (active) break;
    if (i < 4) await sleep(500);
  }

  // Resolve planId by matching the Shopify subscription name against our PLANS config
  const resolvePlanId = (subscriptionName) => {
    if (!subscriptionName) return "monthly";
    const lower = subscriptionName.toLowerCase();
    const matched = PLANS.find((p) => p.name.toLowerCase() === lower || lower.includes(p.id));
    return matched?.id ?? "monthly";
  };

  if (active) {
    await prisma.planSubscription.upsert({
      where: { shop },
      update: {
        planId: resolvePlanId(active.name),
        planName: active.name,
        status: "ACTIVE",
        shopifySubGid: active.id,
        currentPeriodEnd: active.currentPeriodEnd
          ? new Date(active.currentPeriodEnd)
          : null,
      },
      create: {
        shop,
        planId: resolvePlanId(active.name),
        planName: active.name,
        status: "ACTIVE",
        shopifySubGid: active.id,
        currentPeriodEnd: active.currentPeriodEnd
          ? new Date(active.currentPeriodEnd)
          : null,
      },
    });
  } else {
    logger.log("No ACTIVE subscription found yet for shop:", shop);
    await prisma.planSubscription.upsert({
      where: { shop },
      update: { status: "PENDING" },
      create: { shop, status: "PENDING" },
    }).catch((err) => {
      logger.warn("Failed to set PENDING subscription for shop:", shop, err?.message);
    });
  }

  const back = shopParam
    ? `/app/pricing?shop=${encodeURIComponent(shopParam)}`
    : "/app/pricing";

  return redirect(back);
}

export default function BillingReturn() {
  return null;
}

export function ErrorBoundary() {
  const error = useRouteError();
  return (
    <Page title="Billing Error">
      <Box borderWidth="025" borderColor="border" background="bg-surface" borderRadius="100" padding="400">
        <Text as="h2" variant="headingMd">Billing Error</Text>
        <Text tone="subdued">
          We encountered an error processing your billing request. Please try again or contact support if the issue persists.
        </Text>
        {process.env.NODE_ENV !== "production" && error?.message && (
          <Text tone="critical">{error.message}</Text>
        )}
      </Box>
    </Page>
  );
}
