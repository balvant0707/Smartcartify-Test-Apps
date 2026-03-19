import "@shopify/shopify-app-react-router/adapters/node";
import { BillingInterval, DeliveryMethod } from "@shopify/shopify-api";
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
import { decryptAccessToken, encryptAccessToken } from "./lib/accessTokenCrypto.server.js";
import logger from "./lib/logger.server.js";

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
        logger.warn("[email] afterAuth missing shop; skipping install email.");
        return;
      }

      try {
        await shopify.registerWebhooks({ session });
        logger.log("[webhooks] registered", { shop });
      } catch (error) {
        logger.warn("[webhooks] register failed", { shop, error });
      }

      let existingShop = null;
      try {
        existingShop = await prisma.shop.findUnique({ where: { shop } });
      } catch (err) {
        logger.warn("[afterAuth] prisma shop findUnique failed", { shop, error: err?.message });
      }
      const isNewInstall = !existingShop || existingShop.installed === false;
      const forceSend = process.env.FORCE_INSTALL_EMAIL === "true";

      const encryptedAccessToken = encryptAccessToken(session?.accessToken);
      const hadTokenBefore = Boolean(decryptAccessToken(existingShop?.accessToken));

      try {
        await prisma.shop.upsert({
          where: { shop },
          update: {
            accessToken: encryptedAccessToken ?? undefined,
            installed: true,
            uninstalledAt: null,
            appStatus: "active",
          },
          create: {
            shop,
            accessToken: encryptedAccessToken,
            installed: true,
            onboardedAt: new Date(),
            appStatus: "active",
          },
        });
      } catch (err) {
        logger.warn("[afterAuth] prisma shop upsert failed", { shop, error: err?.message });
      }

      let shopInfo = {};
      try {
        const response = await admin.graphql(
          `query InstallShopInfo {
            shop {
              name
              email
              phone
              primaryDomain { host }
              shopOwnerName
              countryCode
              ianaTimezone
            }
          }`,
        );
        const data = await response.json();
        if (data?.errors?.length) {
          logger.warn("[email] Shopify GraphQL errors", data.errors);
        }
        shopInfo = data?.data?.shop || {};
      } catch (error) {
        logger.warn("[email] Shopify GraphQL failed; using session fallback.", error);
      }

      // Persist merchant contact info now that we have shopInfo
      const ownerNameParts = (shopInfo.shopOwnerName || session.firstName || "").trim().split(/\s+/);
      const resolvedFirstName = ownerNameParts[0] || null;
      const resolvedLastName = ownerNameParts.slice(1).join(" ") || null;
      const resolvedEmail = shopInfo.email || session.email || null;
      const resolvedDomain = shopInfo.primaryDomain?.host || shop;
      const resolvedPhone = shopInfo.phone || null;

      await prisma.shop.update({
        where: { shop },
        data: {
          firstName: resolvedFirstName,
          lastName: resolvedLastName,
          email: resolvedEmail,
          domain: resolvedDomain,
          contactNumber: resolvedPhone,
          appStatus: "active",
        },
      }).catch((err) => logger.warn("[shop] contact fields update failed", err));

      if (!isNewInstall && !forceSend && hadTokenBefore) {
        logger.log("[email] afterAuth not new install; skipping email.", { shop });
        return;
      }

      const testRecipient = process.env.TEST_OWNER_EMAIL || "";
      const toEmail = testRecipient || resolvedEmail;
      if (!toEmail) {
        logger.warn("[email] Shop email missing; skipping install email.");
        return;
      }

      const resolvedShopName = shopInfo.name || shop;
      const resolvedShopDomain = resolvedDomain;
      const resolvedOwnerName =
        shopInfo.shopOwnerName || session.firstName || "";
      const resolvedOwnerEmail = resolvedEmail || "";
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
        logger.log("[email] install email sent", {
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
          logger.log("[email] owner install email sent", {
            shop,
            to: ownerEmail,
            forced: forceSend,
          });
        }
      } catch (error) {
        logger.warn("[email] Install email failed:", error);
      }
    },
  },
  webhooks: {
    APP_SUBSCRIPTIONS_UPDATE: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks",
    },
    APP_UNINSTALLED: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks",
    },
    APP_SCOPES_UPDATE: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/app/scopes_update",
    },
    CUSTOMERS_DATA_REQUEST: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/gdpr",
    },
    CUSTOMERS_REDACT: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/gdpr",
    },
    SHOP_REDACT: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/gdpr",
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
            amount: plan.price,
            currencyCode: "USD",
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
