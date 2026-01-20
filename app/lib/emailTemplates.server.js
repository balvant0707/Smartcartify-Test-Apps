const APP_NAME = process.env.APP_NAME || "Smartcartify";
const APP_URL = process.env.APP_URL || process.env.SHOPIFY_APP_URL || "";
const SUPPORT_EMAIL =
  process.env.SUPPORT_EMAIL ||
  process.env.SMTP_REPLY_TO ||
  process.env.SMTP_FROM_EMAIL ||
  process.env.SMTP_FROM ||
  "";

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const buildInstallEmail = ({ shopName, shopDomain, ownerName }) => {
  const safeName = ownerName ? escapeHtml(ownerName) : "";
  const safeShop = escapeHtml(shopName || shopDomain || "your store");
  const safeDomain = shopDomain ? escapeHtml(shopDomain) : "";
  const shopLine = safeDomain ? `${safeShop} (${safeDomain})` : safeShop;
  const subject = "Thank you for installing Smartcartify 🎉";
  const logoUrl = APP_URL ? `${APP_URL}/public/images/Pryxo-Tech-Logo-New.webp` : "";

  const supportEmail = SUPPORT_EMAIL || "support@pryxotech.com";
  const supportLine = `support@pryxotech.com`;

  const text = [
    `Hi${safeName ? ` ${safeName}` : ""},`,
    "",
    `Thank you for installing Smartcartify – Smart Cart Drawer & Promotions on your store ${shopLine}!`,
    "We’re excited to have you on board and look forward to helping you increase conversions, boost average order value, and improve your customers’ shopping experience.",
    "",
    "What Smartcartify helps you with:",
    "- Increase cart conversion using dynamic cart drawer",
    "- Boost AOV with smart offers like Buy X Get Y, Free Gifts & Discounts",
    "- Show progress bars, urgency messages & trust nudges",
    "- Fully customizable design to match your store theme",
    "",
    "Next Steps:",
    "1) Open your Smartcartify dashboard from Shopify Apps.",
    "2) Configure your first promotion or cart rule.",
    "3) Preview the cart drawer on your storefront.",
    "4) Publish and start converting more visitors into buyers.",
    "",
    "We’re Here to Help:",
    `Reply to this email or contact us at ${supportLine}`,
    "https://pryxotech.com",
    "",
    "Warm regards,",
    "Team Pryxo Tech",
    "Smartcartify Support",
    "",
    "You are receiving this email because you installed the Smartcartify app on your Shopify store.",
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
      <h2 style="color: #111827; margin: 0 0 12px;">
        Hi${safeName ? ` ${safeName}` : ""},
      </h2>
      <p style="margin: 0 0 12px;">
        Thank you for installing <strong>Smartcartify – Smart Cart Drawer &amp; Promotions</strong>
        on your store <strong>${shopLine}</strong>! 🎉
      </p>
      <p style="margin: 0 0 16px;">
        We’re excited to have you on board and look forward to helping you increase conversions, boost average order value,
        and improve your customers’ shopping experience.
      </p>
      ${
        logoUrl
          ? `<img src="${logoUrl}" alt="Pryxo Tech Logo" style="max-width:180px;margin:20px 0;" />`
          : ""
      }
      <hr style="border:0;border-top:1px solid #e5e7eb;margin:20px 0;" />
      <h3 style="margin: 0 0 8px;">🚀 What Smartcartify helps you with:</h3>
      <ul style="margin: 0 0 16px; padding-left: 18px;">
        <li>Increase cart conversion using dynamic cart drawer</li>
        <li>Boost AOV with smart offers like <strong>Buy X Get Y</strong>, Free Gifts &amp; Discounts</li>
        <li>Show progress bars, urgency messages &amp; trust nudges</li>
        <li>Fully customizable design to match your store theme</li>
      </ul>
      <h3 style="margin: 0 0 8px;">⚡ Next Steps</h3>
      <ol style="margin: 0 0 16px; padding-left: 18px;">
        <li>Open your Smartcartify dashboard from Shopify Apps.</li>
        <li>Configure your first promotion or cart rule.</li>
        <li>Preview the cart drawer on your storefront.</li>
        <li>Publish and start converting more visitors into buyers.</li>
      </ol>
      <p style="margin: 0 0 12px;">Need help setting anything up? Our team is always here for you.</p>
      <h3 style="margin: 0 0 8px;">🤝 We’re Here to Help</h3>
      <p style="margin: 0 0 4px;">
        If you need any assistance, customization, or have questions — just reply to this email or contact us at:
      </p>
      <p style="margin: 0 0 4px;">
        📧 <a href="mailto:${escapeHtml(supportEmail)}">${escapeHtml(supportEmail)}</a>
      </p>
      <p style="margin: 0 0 16px;">
        🌐 <a href="https://pryxotech.com">https://pryxotech.com</a>
      </p>
      <p style="margin: 0 0 12px;">
        Thank you again for trusting <strong>Smartcartify</strong> to grow your business.
      </p>
      <p style="margin: 0;">
        Warm regards,<br />
        <strong>Team Pryxo Tech</strong><br />
        Smartcartify Support
      </p>
      <hr style="border:0;border-top:1px solid #e5e7eb;margin:20px 0;" />
      <p style="margin: 0; color: #6b7280; font-size: 12px;">
        You are receiving this email because you installed the Smartcartify app on your Shopify store.
      </p>
    </div>
  `;

  return { subject, html, text };
};

export const buildOwnerInstallEmail = ({
  shopName,
  shopDomain,
  ownerName,
  ownerEmail,
  country,
  timezone,
  installedAt,
  planName,
  trialStatus,
  appVersion,
}) => {
  const safeShopName = escapeHtml(shopName || shopDomain || "Unknown store");
  const safeShopDomain = escapeHtml(shopDomain || "unknown-store.myshopify.com");
  const safeOwnerName = escapeHtml(ownerName || "Unknown");
  const safeOwnerEmail = escapeHtml(ownerEmail || "Unknown");
  const safeCountry = escapeHtml(country || "N/A");
  const safeTimezone = escapeHtml(timezone || "N/A");
  const safeInstalledAt = escapeHtml(installedAt || new Date().toISOString());
  const safePlan = escapeHtml(planName || "N/A");
  const safeTrial = escapeHtml(trialStatus || "N/A");
  const safeVersion = escapeHtml(appVersion || "N/A");

  const subject = "New Store Installed Smartcartify 🚀";

  const text = [
    "Hello Team,",
    "",
    "A new store has just installed the Smartcartify – Smart Cart Drawer & Promotions app.",
    "Below are the installation details:",
    "",
    "Store Details",
    `- Store Name: ${safeShopName}`,
    `- Store URL: https://${safeShopDomain}`,
    `- Store Owner Name: ${safeOwnerName}`,
    `- Store Owner Email: ${safeOwnerEmail}`,
    `- Country: ${safeCountry}`,
    `- Timezone: ${safeTimezone}`,
    `- Installed At: ${safeInstalledAt}`,
    "",
    "App Details",
    `- App Name: Smartcartify`,
    `- Plan Selected: ${safePlan}`,
    `- Trial Status: ${safeTrial}`,
    `- App Version: ${safeVersion}`,
    "",
    "Next Actions (Internal)",
    "- [ ] Check if webhooks registered successfully",
    "- [ ] Verify script / app embed is active",
    "- [ ] Monitor first activity from the store",
    "- [ ] Send welcome / onboarding follow-up if needed",
    "",
    "This is an automated system notification.",
    "",
    "Smartcartify System",
    "Pryxo Tech Internal",
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
      <h2 style="margin: 0 0 12px;">Hello Team,</h2>
      <p style="margin: 0 0 12px;">
        A new store has just installed the <strong>Smartcartify – Smart Cart Drawer &amp; Promotions</strong> app. 🎉
        Below are the installation details:
      </p>
      <hr style="border:0;border-top:1px solid #e5e7eb;margin:20px 0;" />
      <h3 style="margin: 0 0 8px;">🏪 Store Details</h3>
      <ul style="margin: 0 0 16px; padding-left: 18px;">
        <li><strong>Store Name:</strong> ${safeShopName}</li>
        <li><strong>Store URL:</strong> https://${safeShopDomain}</li>
        <li><strong>Store Owner Name:</strong> ${safeOwnerName}</li>
        <li><strong>Store Owner Email:</strong> ${safeOwnerEmail}</li>
        <li><strong>Country:</strong> ${safeCountry}</li>
        <li><strong>Timezone:</strong> ${safeTimezone}</li>
        <li><strong>Installed At:</strong> ${safeInstalledAt}</li>
      </ul>
      <h3 style="margin: 0 0 8px;">📦 App Details</h3>
      <ul style="margin: 0 0 16px; padding-left: 18px;">
        <li><strong>App Name:</strong> Smartcartify</li>
        <li><strong>Plan Selected:</strong> ${safePlan}</li>
        <li><strong>Trial Status:</strong> ${safeTrial}</li>
        <li><strong>App Version:</strong> ${safeVersion}</li>
      </ul>
      <h3 style="margin: 0 0 8px;">⚙️ Next Actions (Internal)</h3>
      <ul style="margin: 0 0 16px; padding-left: 18px;">
        <li>[ ] Check if webhooks registered successfully</li>
        <li>[ ] Verify script / app embed is active</li>
        <li>[ ] Monitor first activity from the store</li>
        <li>[ ] Send welcome / onboarding follow-up if needed</li>
      </ul>
      <p style="margin: 0;">This is an automated system notification.</p>
      <p style="margin: 12px 0 0; color: #6b7280;">
        —<br />
        <strong>Smartcartify System</strong><br />
        Pryxo Tech Internal
      </p>
    </div>
  `;

  return { subject, html, text };
};

export const buildUninstallEmail = ({ shopName, shopDomain, ownerName }) => {
  const safeName = ownerName ? escapeHtml(ownerName) : "";
  const safeShop = escapeHtml(shopName || shopDomain || "your store");
  const safeDomain = shopDomain ? escapeHtml(shopDomain) : "";
  const shopLine = safeDomain ? `${safeShop} (${safeDomain})` : safeShop;
  const subject = "Sorry to see you go from Smartcartify";
  const supportEmail = SUPPORT_EMAIL || "support@pryxotech.com";

  const text = [
    `Hi${safeName ? ` ${safeName}` : ""},`,
    "",
    `Your store ${shopLine} has uninstalled Smartcartify.`,
    "If this was a mistake, you can reinstall anytime from the Shopify App Store.",
    "",
    "We would love to know why you left so we can improve.",
    `Reply to this email or contact us at ${supportEmail}.`,
    "",
    "Warm regards,",
    "Team Pryxo Tech",
    "Smartcartify Support",
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
      <h2 style="margin: 0 0 12px;">Hi${safeName ? ` ${safeName}` : ""},</h2>
      <p style="margin: 0 0 12px;">
        Your store <strong>${shopLine}</strong> has uninstalled Smartcartify.
      </p>
      <p style="margin: 0 0 12px;">
        If this was a mistake, you can reinstall anytime from the Shopify App Store.
      </p>
      <p style="margin: 0 0 12px;">
        We would love to know why you left so we can improve.
        Reply to this email or contact us at
        <a href="mailto:${escapeHtml(supportEmail)}">${escapeHtml(supportEmail)}</a>.
      </p>
      <p style="margin: 0;">
        Warm regards,<br />
        <strong>Team Pryxo Tech</strong><br />
        Smartcartify Support
      </p>
    </div>
  `;

  return { subject, html, text };
};

export const buildOwnerUninstallEmail = ({
  shopName,
  shopDomain,
  ownerName,
  ownerEmail,
  uninstalledAt,
}) => {
  const safeShopName = escapeHtml(shopName || shopDomain || "Unknown store");
  const safeShopDomain = escapeHtml(shopDomain || "unknown-store.myshopify.com");
  const safeOwnerName = escapeHtml(ownerName || "Unknown");
  const safeOwnerEmail = escapeHtml(ownerEmail || "Unknown");
  const safeUninstalledAt = escapeHtml(uninstalledAt || new Date().toISOString());

  const subject = "Store Uninstalled Smartcartify";

  const text = [
    "Hello Team,",
    "",
    "A store has uninstalled the Smartcartify app.",
    "",
    "Store Details",
    `- Store Name: ${safeShopName}`,
    `- Store URL: https://${safeShopDomain}`,
    `- Store Owner Name: ${safeOwnerName}`,
    `- Store Owner Email: ${safeOwnerEmail}`,
    `- Uninstalled At: ${safeUninstalledAt}`,
    "",
    "This is an automated system notification.",
    "",
    "Smartcartify System",
    "Pryxo Tech Internal",
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
      <h2 style="margin: 0 0 12px;">Hello Team,</h2>
      <p style="margin: 0 0 12px;">
        A store has uninstalled the <strong>Smartcartify</strong> app.
      </p>
      <hr style="border:0;border-top:1px solid #e5e7eb;margin:20px 0;" />
      <h3 style="margin: 0 0 8px;">Store Details</h3>
      <ul style="margin: 0 0 16px; padding-left: 18px;">
        <li><strong>Store Name:</strong> ${safeShopName}</li>
        <li><strong>Store URL:</strong> https://${safeShopDomain}</li>
        <li><strong>Store Owner Name:</strong> ${safeOwnerName}</li>
        <li><strong>Store Owner Email:</strong> ${safeOwnerEmail}</li>
        <li><strong>Uninstalled At:</strong> ${safeUninstalledAt}</li>
      </ul>
      <p style="margin: 0;">This is an automated system notification.</p>
      <p style="margin: 12px 0 0; color: #6b7280;">
        —<br />
        <strong>Smartcartify System</strong><br />
        Pryxo Tech Internal
      </p>
    </div>
  `;

  return { subject, html, text };
};
