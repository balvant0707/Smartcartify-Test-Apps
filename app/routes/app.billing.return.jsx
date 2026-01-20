import { authenticate } from "../shopify.server";
import prisma from "../db.server";

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

    console.log("Billing return attempt", i + 1, "activeSubscriptions:", list);

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
    console.log("No ACTIVE subscription found yet for shop:", shop);
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
