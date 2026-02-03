import { useRouteError } from "react-router";
import { Page, Card, Text } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import logger from "../lib/logger.server.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function loader({ request }) {
  const { admin, session, redirect } = await authenticate.admin(request);
  const shop = session.shop;

  const url = new URL(request.url);
  const host = url.searchParams.get("host");
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

  // ✅ Retry few times (Shopify side delay)
  for (let i = 0; i < 5; i++) {
    const resp = await admin.graphql(query);
    const json = await resp.json();

    const list = json?.data?.currentAppInstallation?.activeSubscriptions ?? [];
    active = list.find((s) => s.status === "ACTIVE") || null;

    logger.log("Billing return attempt", i + 1, "activeSubscriptions:", list);

    if (active) break;
    await sleep(700);
  }

  if (active) {
    await prisma.planSubscription.upsert({
      where: { shop },
      update: {
        planId: active.name.toLowerCase().includes("yearly") ? "yearly" : "monthly",
        planName: active.name,
        status: "ACTIVE",
        shopifySubGid: active.id,
        currentPeriodEnd: active.currentPeriodEnd
          ? new Date(active.currentPeriodEnd)
          : null,
      },
      create: {
        shop,
        planId: active.name.toLowerCase().includes("yearly") ? "yearly" : "monthly",
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
    // Optional: keep PENDING if not found
    await prisma.planSubscription.update({
      where: { shop },
      data: { status: "PENDING" },
    }).catch(() => {});
  }

  const back =
    host && shopParam
      ? `/app/pricing?host=${encodeURIComponent(host)}&shop=${encodeURIComponent(shopParam)}`
      : host
      ? `/app/pricing?host=${encodeURIComponent(host)}`
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
      <Card>
        <Text as="h2" variant="headingMd">Billing Error</Text>
        <Text tone="subdued">
          We encountered an error processing your billing request. Please try again or contact support if the issue persists.
        </Text>
        {process.env.NODE_ENV !== "production" && error?.message && (
          <Text tone="critical">{error.message}</Text>
        )}
      </Card>
    </Page>
  );
}
