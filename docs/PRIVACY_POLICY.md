# Privacy Policy

**App Name:** CartLift: Cart Drawer & Upsell
**Developer:** Pryxo Tech Private Limited
**Contact:** balvant@pryxotech.com
**App URL:** https://cartmilestone.smartreminder.in
**Effective Date:** March 19, 2026
**Last Updated:** March 19, 2026

---

## 1. Introduction

Pryxo Tech Private Limited ("we," "us," or "our") operates the **CartLift: Cart Drawer & Upsell** Shopify application (the "App"). This Privacy Policy explains how we collect, use, store, and protect information when you install and use our App on your Shopify store.

By installing or using the App, you agree to the practices described in this Privacy Policy. If you do not agree, please uninstall the App.

---

## 2. Who This Policy Applies To

This Privacy Policy applies to:

- **Merchants** — Shopify store owners and administrators who install and configure the App.
- **Storefront Visitors** — Customers who visit a merchant's store where the App is active.

---

## 3. Information We Collect

### 3.1 Merchant Information

When a merchant installs the App, we collect and store the following information via Shopify's OAuth authentication:

| Data | Purpose |
|------|---------|
| Shop domain (e.g., `yourstore.myshopify.com`) | Identify and associate the merchant's account |
| Store owner's first name and last name | Personalize communication and support |
| Store owner's email address | Send installation confirmations and notifications |
| Store primary domain | Link store identity |
| Store contact/phone number | Merchant identification |
| Shopify access token (encrypted) | Authenticate API calls to the merchant's Shopify store |
| App installation status and timestamps | Track installation lifecycle |
| Shopify OAuth session data (scope, expiry, locale) | Manage authenticated sessions |

### 3.2 App Configuration Data

When merchants configure the App, we store the following **merchant-created** configuration data:

- **Shipping Rules** — Free shipping thresholds, reward types, progress messages, and related Shopify rate/method IDs.
- **Discount Rules** — Discount campaigns, discount codes, applicable product/collection scope, progress messages.
- **Free Gift Rules** — Gift product IDs, trigger conditions, quantity limits, applicable product lists.
- **Buy X Get Y (BXGY) Rules** — Quantity triggers, gift products, applicable scope (products/collections/store-wide).
- **Style Settings** — Cart drawer colors, fonts, radius, background, button text, and other UI customizations.
- **Upsell Settings** — Upsell section title, button text, colors, selected product/collection IDs, and display preferences.

### 3.3 Billing & Subscription Data

We store subscription information related to the App's billing plan:

- Plan name and ID
- Subscription status (e.g., ACTIVE, CANCELLED, FROZEN)
- Billing interval, amount, and currency
- Current period end date
- Shopify subscription GID (Global ID)
- Trial days and test subscription flag

This data is sourced from Shopify's `app_subscriptions/update` webhook.

### 3.4 Storefront Visitor Data

**We do not collect, store, or process any personally identifiable information (PII) about individual customers or storefront visitors.**

The App operates entirely through Shopify's cart and storefront APIs:

- Cart contents are read in real-time from the visitor's browser session via Shopify's `/cart.js` endpoint.
- No cart data is transmitted to or stored on our servers.
- No customer names, emails, addresses, or payment information are accessed or stored.

---

## 4. How We Use Information

We use the information we collect for the following purposes:

| Purpose | Data Used |
|---------|-----------|
| Authenticate API requests to Shopify | Encrypted access token |
| Deliver cart drawer, upsell, and promotion functionality on storefronts | App configuration rules and settings |
| Send installation/uninstallation notification emails to merchants | Merchant email, name, shop domain |
| Send internal operational notifications to the app developer | Merchant email, shop domain |
| Track app billing and plan status | Subscription data from Shopify |
| Provide product and collection data for upsell recommendations | Shopify product/collection IDs (fetched via Admin API, not stored persistently) |
| Comply with GDPR data deletion requests | Shop and session records |

---

## 5. Shopify API Permissions (Scopes)

The App requests the following Shopify API permission scopes. We only request scopes that are necessary for core features:

| Scope | Reason |
|-------|--------|
| `read_discounts` / `write_discounts` | Create and manage discount codes used in cart drawer promotions |
| `read_products` / `write_products` | Fetch product data for upsell recommendations and free gift identification |
| `read_shipping` / `write_shipping` | Create and manage shipping rate rules for free shipping progress bars |
| `read_themes` / `write_themes` | Embed the cart drawer extension into the merchant's storefront theme |
| `read_orders` / `write_orders` | Read order context for buy-x-get-y and discount validation |

---

## 6. Data Storage and Security

### 6.1 Storage Location

All merchant configuration data is stored in a MySQL database hosted on our infrastructure at `192.250.231.31`. This server is maintained by Pryxo Tech Private Limited.

### 6.2 Access Token Security

Shopify access tokens are **encrypted at rest** using AES encryption before being stored in the database. They are decrypted only when needed to make API calls.

### 6.3 Data Retention

- Merchant configuration data (rules, settings) is retained as long as the App is installed.
- On uninstallation, the shop's access token is cleared and the shop record is marked inactive. Configuration rules may be retained for a short period to support reinstallation.
- On receipt of a Shopify `shop/redact` webhook (typically 48 hours after uninstallation), **all shop data is permanently deleted**, including: sessions, shop record, all rules (shipping, discount, free gift, BXGY), style settings, upsell settings, and subscription records.

### 6.4 Security Measures

- All communications between the App and Shopify use HTTPS/TLS encryption.
- App proxy requests from storefronts are verified using HMAC-SHA256 signature validation.
- Webhook payloads are verified using HMAC-SHA256 before processing.
- Access tokens are stored in encrypted form.
- We follow Shopify's security guidelines for embedded app development.

---

## 7. Data Sharing and Third Parties

We do **not** sell, rent, or trade merchant or customer data to third parties.

We may share data with the following categories of service providers solely to operate the App:

| Service | Purpose | Data Shared |
|---------|---------|-------------|
| **Shopify** | Platform API access, webhook delivery | Merchant access tokens (used to call Shopify APIs) |
| **SMTP Email Service** (cartmilestone.smartreminder.in) | Send installation and uninstallation notification emails | Merchant email address, store name |
| **MySQL Database Host** | Store app configuration data | All merchant configuration data |

No customer (storefront visitor) data is shared with any third party.

---

## 8. Cookies and Tracking

The App itself does **not** set cookies on the storefront or use tracking technologies.

The App reads from the browser's `sessionStorage` to temporarily remember a pending discount code across page loads. This data:
- Never leaves the visitor's browser.
- Is not transmitted to our servers.
- Is cleared when the browser session ends.

Shopify may set its own cookies on storefronts independently of this App. Please refer to [Shopify's Privacy Policy](https://www.shopify.com/legal/privacy) for details.

---

## 9. GDPR Compliance

We comply with the General Data Protection Regulation (GDPR) and Shopify's privacy requirements.

### 9.1 Customer Data Requests

If a merchant's customer submits a data access request:

- We do **not** store any personally identifiable customer information.
- We respond to `customers/data_request` webhooks with a confirmation that no customer data is held.

### 9.2 Customer Data Redaction

If a merchant's customer requests deletion of their data:

- We respond to `customers/redact` webhooks with a confirmation that no customer data needs to be deleted.

### 9.3 Shop Data Redaction

When Shopify sends a `shop/redact` webhook (after a merchant uninstalls the App):

- All data associated with the merchant's shop is permanently deleted from our database.
- This includes: shop record, sessions, all rules, style settings, upsell settings, and subscription records.

### 9.4 Your Rights (Merchants)

As a merchant (data controller/processor relationship), you have the right to:

- **Access** — Request a copy of the data we hold about your store.
- **Correction** — Request correction of inaccurate data.
- **Deletion** — Request deletion of your store's data at any time by contacting us or uninstalling the App.
- **Portability** — Request your data in a portable format.

To exercise these rights, contact us at: **balvant@pryxotech.com**

---

## 10. Children's Privacy

The App is designed for use by Shopify merchants (businesses). We do not knowingly collect data from individuals under the age of 18. If you believe we have inadvertently collected such data, contact us immediately and we will delete it.

---

## 11. Data Breach Notification

In the event of a data breach that affects merchant data, we will:

1. Investigate and contain the breach promptly.
2. Notify affected merchants within 72 hours of discovery, where required by applicable law.
3. Notify Shopify as required by the Shopify Partner Agreement.
4. Take corrective measures to prevent recurrence.

---

## 12. Changes to This Privacy Policy

We may update this Privacy Policy from time to time. When we make material changes, we will:

- Update the "Last Updated" date at the top of this document.
- Notify merchants via email (using the email address associated with their store) where required.

Continued use of the App after changes are posted constitutes acceptance of the updated policy.

---

## 13. Contact Us

If you have questions, concerns, or requests regarding this Privacy Policy or your data, please contact us:

**Pryxo Tech Private Limited**
Email: balvant@pryxotech.com
App Support: https://cartmilestone.smartreminder.in

---

## 14. Governing Law

This Privacy Policy is governed by the laws of India. Any disputes arising in connection with this policy shall be subject to the exclusive jurisdiction of the courts of India.

---

*This Privacy Policy was generated based on the actual data practices of the CartLift: Cart Drawer & Upsell application.*
