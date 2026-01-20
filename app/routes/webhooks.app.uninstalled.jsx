import { authenticate } from "../shopify.server";
import db from "../db.server";
import { sendEmail } from "../lib/email.server.js";
import {
  buildOwnerUninstallEmail,
  buildUninstallEmail,
} from "../lib/emailTemplates.server.js";

export const action = async ({ request }) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  // If this webhook already ran, the session may have been deleted previously.
  if (session) {
    await db.session.deleteMany({ where: { shop } });
  }
  if (shop) {
    const timestamp = new Date();
    const existing = await db.shop.findFirst({ where: { shop } });
    if (existing) {
      await db.shop.update({
        where: { id: existing.id },
        data: { installed: false, uninstalledAt: timestamp, accessToken: null },
      });
    } else {
      await db.shop.create({ data: { shop, installed: false, uninstalledAt: timestamp, accessToken: null } });
    }

    const ownerEmail =
      process.env.APP_OWNER_EMAIL || process.env.APP_OWNER_FALLBACK_EMAIL || "";
    const storeOwnerName = [session?.firstName, session?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    const storeOwnerEmail = session?.email || "";
    const testRecipient = process.env.TEST_OWNER_EMAIL || "";
    const storeRecipient = testRecipient || storeOwnerEmail;
    const uninstalledAt = timestamp.toISOString();

    try {
      if (storeRecipient) {
        const storeEmail = buildUninstallEmail({
          shopName: shop,
          shopDomain: shop,
          ownerName: storeOwnerName,
        });
        await sendEmail({
          to: storeRecipient,
          subject: storeEmail.subject,
          html: storeEmail.html,
          text: storeEmail.text,
          replyTo: process.env.SMTP_REPLY_TO || process.env.SUPPORT_EMAIL || "",
        });
        console.log("[email] store uninstall email sent", {
          shop,
          to: storeRecipient,
        });
      } else {
        console.warn("[email] store owner email missing; uninstall email skipped");
      }

      if (ownerEmail) {
        const ownerEmailContent = buildOwnerUninstallEmail({
          shopName: shop,
          shopDomain: shop,
          ownerName: storeOwnerName,
          ownerEmail: storeOwnerEmail,
          uninstalledAt,
        });
        await sendEmail({
          to: ownerEmail,
          subject: ownerEmailContent.subject,
          html: ownerEmailContent.html,
          text: ownerEmailContent.text,
          replyTo: process.env.SMTP_REPLY_TO || process.env.SUPPORT_EMAIL || "",
        });
        console.log("[email] owner uninstall email sent", {
          shop,
          to: ownerEmail,
        });
      }
    } catch (error) {
      console.warn("[email] uninstall email failed:", error);
    }
  }

  return new Response();
};
