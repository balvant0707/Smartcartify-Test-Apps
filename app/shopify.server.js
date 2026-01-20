import "@shopify/shopify-app-react-router/adapters/node";
import { BillingInterval } from "@shopify/shopify-api";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";
import { PLANS } from "./lib/plans.js";
import {
  buildInstallEmail,
  buildOwnerInstallEmail,
} from "./lib/emailTemplates.server.js";
import { sendEmail } from "./lib/email.server.js";

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.October25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  hooks: {
    afterAuth: async ({ session, admin }) => {
      const shop = session?.shop;
      if (!shop) {
        console.warn("[email] afterAuth missing shop; skipping install email.");
        return;
      }

      const existingShop = await prisma.shop.findUnique({ where: { shop } });
      const isNewInstall = !existingShop || existingShop.installed === false;
      const forceSend = process.env.FORCE_INSTALL_EMAIL === "true";

      await prisma.shop.upsert({
        where: { shop },
        update: {
          accessToken: session?.accessToken ?? undefined,
          installed: true,
          uninstalledAt: null,
        },
        create: {
          shop,
          accessToken: session?.accessToken ?? null,
          installed: true,
          onboardedAt: new Date(),
        },
      });

      if (!isNewInstall && !forceSend) {
        console.log("[email] afterAuth not new install; skipping email.", { shop });
        return;
      }

      let shopInfo = {};
      try {
        const response = await admin.graphql(
          `query InstallShopInfo {
            shop {
              name
              email
              primaryDomain { host }
              shopOwnerName
              countryCode
              ianaTimezone
            }
          }`,
        );
        const data = await response.json();
        if (data?.errors?.length) {
          console.warn("[email] Shopify GraphQL errors", data.errors);
        }
        shopInfo = data?.data?.shop || {};
      } catch (error) {
        console.warn("[email] Shopify GraphQL failed; using session fallback.", error);
      }

      const testRecipient = process.env.TEST_OWNER_EMAIL || "";
      const toEmail = testRecipient || shopInfo.email || session.email;
      if (!toEmail) {
        console.warn("[email] Shop email missing; skipping install email.");
        return;
      }

      const resolvedShopName = shopInfo.name || shop;
      const resolvedShopDomain = shopInfo.primaryDomain?.host || shop;
      const resolvedOwnerName =
        shopInfo.shopOwnerName || session.firstName || "";
      const resolvedOwnerEmail = shopInfo.email || session.email || "";
      const installedAt = new Date().toISOString();
      const appVersion =
        process.env.APP_VERSION || process.env.npm_package_version || "N/A";

      const emailContent = buildInstallEmail({
        shopName: resolvedShopName,
        shopDomain: resolvedShopDomain,
        ownerName: resolvedOwnerName,
      });

      const ownerEmail =
        process.env.APP_OWNER_EMAIL || process.env.APP_OWNER_FALLBACK_EMAIL || "";
      try {
        await sendEmail({
          to: toEmail,
          cc: ownerEmail || undefined,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          replyTo: process.env.SMTP_REPLY_TO || process.env.SUPPORT_EMAIL || "",
        });
        console.log("[email] install email sent", {
          shop,
          to: toEmail,
          cc: ownerEmail || null,
          forced: forceSend,
        });
        if (ownerEmail) {
          const ownerContent = buildOwnerInstallEmail({
            shopName: resolvedShopName,
            shopDomain: resolvedShopDomain,
            ownerName: resolvedOwnerName,
            ownerEmail: resolvedOwnerEmail,
            country: shopInfo.countryCode || "N/A",
            timezone: shopInfo.ianaTimezone || "N/A",
            installedAt,
            planName: "N/A",
            trialStatus: "N/A",
            appVersion,
          });
          await sendEmail({
            to: ownerEmail,
            subject: ownerContent.subject,
            html: ownerContent.html,
            text: ownerContent.text,
            replyTo: process.env.SMTP_REPLY_TO || process.env.SUPPORT_EMAIL || "",
          });
          console.log("[email] owner install email sent", {
            shop,
            to: ownerEmail,
            forced: forceSend,
          });
        }
      } catch (error) {
        console.warn("[email] Install email failed:", error);
      }
    },
  },
  billing: Object.fromEntries(
    PLANS.filter((plan) => plan.price > 0).map((plan) => [
      plan.id,
      {
        name: plan.name,
        trialDays: 1,
        lineItems: [
          {
            interval:
              plan.interval === "ANNUAL"
                ? BillingInterval.Annual
                : BillingInterval.Every30Days,
            price: {
              amount: plan.price,
              currencyCode: "USD",
            },
          },
        ],
      },
    ]),
  ),
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = ApiVersion.October25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
