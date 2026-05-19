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
import logger from "./lib/logger.server.js";

const positiveIntegerEnv = (name, fallback) => {
  const value = Number.parseInt(process.env[name] || "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const prismaSessionStorage = new PrismaSessionStorage(prisma, {
  connectionRetries: positiveIntegerEnv(
    "PRISMA_SESSION_CONNECTION_RETRIES",
    process.env.NODE_ENV === "production" ? 12 : 4,
  ),
  connectionRetryIntervalMs: positiveIntegerEnv(
    "PRISMA_SESSION_RETRY_INTERVAL_MS",
    5000,
  ),
});

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.October25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: prismaSessionStorage,
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

      const accessToken = session?.accessToken || null;
      const hadTokenBefore = Boolean(existingShop?.accessToken);

      // Fetch merchant contact info via REST API (more reliable than GraphQL in afterAuth context)
      let shopInfo = null;
      try {
        const restRes = await fetch(
          `https://${shop}/admin/api/2025-01/shop.json`,
          { headers: { "X-Shopify-Access-Token": accessToken, "Content-Type": "application/json" } },
        );
        if (!restRes.ok) {
          logger.error(`[afterAuth] REST shop fetch failed: HTTP ${restRes.status} ${restRes.statusText}`);
        } else {
          const restBody = await restRes.json();
          const s = restBody?.shop;
          if (s) {
            shopInfo = {
              name:            s.name          || null,
              email:           s.email         || null,
              shopOwnerName:   s.shop_owner    || null,
              phone:           s.phone         || null,
              primaryDomain:   { host: s.domain || s.myshopify_domain || shop },
              ianaTimezone:    s.iana_timezone || null,
              shopAddress:     { countryCodeV2: s.country_code || null },
            };
            logger.log("[afterAuth] shopInfo fetched via REST: " + JSON.stringify(shopInfo));
          }
        }
      } catch (error) {
        logger.error("[afterAuth] REST shop fetch threw: " + (error?.message ?? String(error)));
        // Fallback: try GraphQL
        try {
          const gqlRes = await admin.graphql(
            `query GetShopOwnerInfo {
              shop {
                name email shopOwnerName ianaTimezone
                primaryDomain { host }
                shopAddress { phone countryCodeV2 }
              }
            }`,
          );
          const gqlData = await gqlRes.json();
          const s = gqlData?.data?.shop;
          if (s) {
            shopInfo = {
              name:          s.name          || null,
              email:         s.email         || null,
              shopOwnerName: s.shopOwnerName || null,
              phone:         s.shopAddress?.phone || null,
              primaryDomain: { host: s.primaryDomain?.host || shop },
              ianaTimezone:  s.ianaTimezone  || null,
              shopAddress:   { countryCodeV2: s.shopAddress?.countryCodeV2 || null },
            };
            logger.log("[afterAuth] shopInfo fetched via GraphQL fallback: " + JSON.stringify(shopInfo));
          }
        } catch (gqlError) {
          logger.error("[afterAuth] GraphQL fallback also failed: " + (gqlError?.message ?? String(gqlError)));
        }
      }

      // Build contact fields only when API returned data
      const nameParts        = (shopInfo?.shopOwnerName || "").trim().split(/\s+/);
      const resolvedFirstName = nameParts[0] || null;
      const resolvedLastName  = nameParts.slice(1).join(" ") || null;
      const resolvedEmail     = shopInfo?.email || null;
      const resolvedDomain    = shopInfo?.primaryDomain?.host || shop;
      const resolvedPhone     = shopInfo?.phone || shopInfo?.shopAddress?.phone || null;

      // Only write contact fields if API returned data — prevents overwriting good DB values with nulls
      const contactFields = shopInfo
        ? { firstName: resolvedFirstName, lastName: resolvedLastName, email: resolvedEmail, domain: resolvedDomain, contactNumber: resolvedPhone }
        : {};

      // Insert or update shop record with contact fields + access token
      try {
        if (!existingShop) {
          await prisma.shop.create({
            data: {
              shop,
              accessToken,
              installed: true,
              onboardedAt: new Date(),
              appStatus: "active",
              domain: resolvedDomain,
              ...contactFields,
            },
          });
          logger.log("[afterAuth] shop record inserted: " + shop);
        } else {
          await prisma.shop.update({
            where: { shop },
            data: {
              accessToken,
              installed: true,
              uninstalledAt: null,
              appStatus: "active",
              ...contactFields,
            },
          });
          logger.log("[afterAuth] shop record updated: " + shop);
        }
      } catch (err) {
        logger.error("[afterAuth] prisma shop save failed: " + shop + " — " + err?.message);
      }

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

      const resolvedShopName = shopInfo?.name || shop;
      const resolvedShopDomain = resolvedDomain;
      const resolvedOwnerName = [resolvedFirstName, resolvedLastName].filter(Boolean).join(" ") || "";
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
            country: shopInfo.shopAddress?.countryCodeV2 || "N/A",
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
        trialDays: plan.trialDays ?? 7,
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
