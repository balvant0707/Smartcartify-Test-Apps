# CartLift: Cart Drawer & Upsell — Full Documentation

**Developer:** Pryxo Tech Private Limited
**Contact:** balvant@pryxotech.com
**App URL:** https://cartmilestone.smartreminder.in
**Version:** 1.0.0
**Last Updated:** March 19, 2026

---

## Table of Contents

1. [App Overview](#1-app-overview)
2. [Features](#2-features)
3. [Tech Stack](#3-tech-stack)
4. [Project Structure](#4-project-structure)
5. [Environment Setup](#5-environment-setup)
6. [Database Schema](#6-database-schema)
7. [Billing Plans](#7-billing-plans)
8. [API Routes](#8-api-routes)
9. [Webhooks](#9-webhooks)
10. [App Proxy](#10-app-proxy)
11. [Theme Extension](#11-theme-extension)
12. [Email Notifications](#12-email-notifications)
13. [GDPR Compliance](#13-gdpr-compliance)
14. [Build & Deployment](#14-build--deployment)
15. [Shopify Configuration](#15-shopify-configuration)
16. [Security](#16-security)
17. [Troubleshooting](#17-troubleshooting)

---

## 1. App Overview

**CartLift: Cart Drawer & Upsell** is an embedded Shopify app that replaces the default theme cart drawer with a fully customizable, feature-rich cart experience. It enables merchants to increase Average Order Value (AOV) through:

- Progress bars showing customers how close they are to unlocking rewards
- Automatic free shipping rules
- Discount code automations
- Free product gifting
- Buy X Get Y (BXGY) bundles
- In-cart upsell product recommendations

The app is embedded directly in the Shopify admin and injects a theme extension block into the storefront that renders the smart cart drawer.

---

## 2. Features

### 2.1 Shipping Rules
Create rules that unlock free or discounted shipping when a cart reaches a minimum subtotal. Display progress bars to motivate customers to add more items.

- Set minimum subtotal thresholds
- Choose between free shipping, flat rate, or percentage discount
- Custom progress messages (before unlock / after unlock / below the bar)
- Icon customization (truck, box, etc.)
- Integration with Shopify Shipping Rate APIs

### 2.2 Discount Rules
Automate discounts that apply when cart conditions are met.

- Percentage or fixed amount discounts
- Minimum purchase conditions
- Applies to: all products, specific products, or specific collections
- Custom discount codes with campaign names
- Shopify Discount Code / Price Rule integration
- Announcement bar support with custom messages

### 2.3 Free Gift Rules
Automatically add a free product to the cart when a threshold is met.

- Trigger by minimum purchase amount
- Set gift product, quantity, and per-order limits
- Restrict to specific products or collections
- Shopify Discount API integration for $0 line item pricing

### 2.4 Buy X Get Y (BXGY) Rules
Run buy-quantity-get-quantity promotions with flexible targeting.

- Set X (buy quantity) and Y (get quantity)
- Target: all store products, specific products, or collections
- Gift types: specific SKU or matching product
- Before/after unlock messages
- Stackable rules support
- Shopify BuyXGetY discount integration

### 2.5 Discount Code Panel
Allow customers to enter and apply discount codes directly inside the cart drawer.

- Toggle on/off per store
- Real-time code validation against Shopify cart
- Displays success/error feedback inline

### 2.6 Upsell Recommendations
Show product recommendations inside the cart drawer to encourage additional purchases.

- Auto mode: pulls best-selling products
- Manual mode: merchant selects specific products or collections
- Slider or grid layout
- Fully customizable colors, section title, and button text
- Add-to-cart from the upsell section without leaving the drawer

### 2.7 Cart Drawer Customization (Style Settings)
Full visual control over the cart drawer appearance.

- Font selection
- Base size and heading scale
- Border radius
- Text colors, background colors, header colors
- Progress bar color
- Button colors and label colors
- Icon colors
- Checkout button text
- Announcement bar colors (background + text)
- Background mode: solid color or image
- Cart drawer background image upload

---

## 3. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | >=20.19 <22 or >=22.12 |
| Framework | React Router v7 | ^7.9.3 |
| UI | React | ^18.3.1 |
| Shopify UI | Polaris | ^13.9.5 |
| Shopify Bridge | App Bridge React | ^4.2.1 |
| Shopify SDK | shopify-app-react-router | ^1.0.0 |
| ORM | Prisma | ^6.19.0 |
| Database | MySQL | — |
| Email | Nodemailer | ^6.9.15 |
| Build Tool | Vite | ^6.3.6 |
| Language | TypeScript | ^5.9.3 |
| Server | Express + iisnode (IIS) | — |

---

## 4. Project Structure

```
smart-cartify/
├── app/
│   ├── routes/                          # All React Router routes
│   │   ├── app._index.jsx               # Dashboard home
│   │   ├── app.jsx                      # App layout wrapper
│   │   ├── app.rules.jsx                # Rules management (main feature page)
│   │   ├── app.pricing.jsx              # Billing & plan selection
│   │   ├── app.documents.jsx            # Documentation/help page
│   │   ├── app.billing.return.jsx       # Post-billing redirect handler
│   │   ├── app.proxy.smart.jsx          # App proxy loader (storefront data)
│   │   ├── proxy.smart.jsx              # Re-exports app.proxy.smart
│   │   ├── api.products.jsx             # Products & collections API
│   │   ├── api.rules.jsx                # Rules action re-export
│   │   ├── auth.$.jsx                   # Auth catch-all
│   │   ├── auth.login/route.jsx         # Login page
│   │   ├── _index/route.jsx             # Public index
│   │   ├── webhooks.jsx                 # Billing webhook handler
│   │   ├── webhooks.app.uninstalled.jsx # Uninstall webhook
│   │   ├── webhooks.app.scopes_update.jsx # Scopes update webhook
│   │   └── webhooks.gdpr.jsx            # GDPR compliance webhooks
│   ├── lib/
│   │   ├── plans.js                     # Billing plan definitions
│   │   ├── shopUtils.server.js          # Shop domain utilities
│   │   ├── email.server.js              # SMTP email utility
│   │   ├── emailTemplates.server.js     # Email HTML templates
│   │   ├── logger.server.js             # Conditional server logger
│   │   ├── products.server.js           # GraphQL product mapper
│   │   ├── accessTokenCrypto.server.js  # AES token encryption
│   │   └── minAmountFreeGift.server.js  # Free gift TTL cache logic
│   ├── shopify.server.js                # Shopify app init + afterAuth hook
│   ├── db.server.js                     # Prisma client singleton
│   └── root.jsx                         # Root layout
├── extensions/
│   └── smart-cart/
│       ├── blocks/
│       │   └── smart-block.liquid       # Theme block entry point
│       ├── assets/
│       │   └── smartcartify.js          # Full cart drawer frontend (~6000 lines)
│       └── shopify.extension.toml       # Extension config
├── prisma/
│   ├── schema.prisma                    # Database models
│   └── migrations/                      # 52+ migration files
├── docs/
│   ├── README.md                        # This file
│   └── PRIVACY_POLICY.md               # App privacy policy
├── public/                              # Static assets
├── build/                               # Production build output
│   ├── client/                          # Client-side assets
│   └── server/index.js                  # SSR server bundle
├── shopify.app.toml                     # Shopify app configuration
├── server.cjs                           # IIS/Express server entry point
├── web.config                           # IIS iisnode configuration
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 5. Environment Setup

### 5.1 Required Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# ── Shopify App ──────────────────────────────────────
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SHOPIFY_APP_URL=https://your-app-domain.com
SCOPES=read_discounts,write_discounts,read_products,write_products,read_shipping,write_shipping,read_themes,write_themes,read_orders,write_orders

# ── Database ─────────────────────────────────────────
DATABASE_URL="mysql://username:password@host:3306/database_name"

# ── Node ─────────────────────────────────────────────
NODE_ENV=production

# ── Billing ──────────────────────────────────────────
SHOPIFY_BILLING_TEST=true       # Set false in production billing

# ── SMTP Email ───────────────────────────────────────
SMTP_HOST=your-smtp-host.com
SMTP_PORT=465
SMTP_SECURE=SSL
SMTP_USER=noreply@your-domain.com
SMTP_PASS=your_smtp_password
SMTP_FROM_NAME=YourAppName
SMTP_FROM_EMAIL=noreply@your-domain.com
SMTP_REPLY_TO=support@your-domain.com

# ── Notifications ─────────────────────────────────────
APP_OWNER_EMAIL=owner@yourcompany.com
APP_OWNER_NAME=Your Company Name
TEST_OWNER_EMAIL=          # Optional: override recipient for testing

# ── Optional ─────────────────────────────────────────
APP_VERSION=1.0.0
FORCE_INSTALL_EMAIL=false  # Force send install email even on reinstall
SMTP_DEBUG=false           # Verbose SMTP logging
SMTP_VERIFY=false          # Verify SMTP connection before send
```

### 5.2 Installation

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma client
npx prisma generate

# 3. Run database migrations
npx prisma migrate deploy

# 4. Build the application
npm run build

# 5. Start the server
npm start
```

### 5.3 Development

```bash
npm run dev
```

This starts the Shopify CLI dev server with hot reload and tunneling.

---

## 6. Database Schema

**Database:** MySQL
**ORM:** Prisma

### Session
Stores Shopify OAuth sessions (managed by `@shopify/shopify-app-session-storage-prisma`).

| Column | Type | Description |
|--------|------|-------------|
| id | String (PK) | Session ID |
| shop | String | Shop domain |
| state | String | OAuth state |
| isOnline | Boolean | Online vs offline token |
| scope | String? | Granted scopes |
| expires | DateTime? | Token expiry |
| accessToken | Text | Shopify access token |
| userId | BigInt? | User ID (online sessions) |
| firstName | String? | Staff member first name |
| lastName | String? | Staff member last name |
| email | String? | Staff member email |
| accountOwner | Boolean | Is account owner |
| locale | String? | Locale |
| collaborator | Boolean? | Is collaborator |
| emailVerified | Boolean? | Email verified status |

### Shop
Merchant store information and app lifecycle state.

| Column | Type | Description |
|--------|------|-------------|
| id | Int (PK) | Auto-increment |
| shop | String (unique) | Shop domain |
| accessToken | Text? | Encrypted Shopify access token |
| installed | Boolean | App currently installed |
| uninstalledAt | DateTime? | Last uninstall timestamp |
| onboardedAt | DateTime? | First install timestamp |
| createdAt | DateTime | Record creation time |
| updatedAt | DateTime | Last update time |
| firstName | String? | Owner first name |
| lastName | String? | Owner last name |
| email | String? | Owner email |
| domain | String? | Primary storefront domain |
| contactNumber | String? | Store phone number |
| appStatus | String | "active" or "inactive" |

### ShippingRule
Free/discounted shipping reward rules.

| Column | Type | Description |
|--------|------|-------------|
| id | Int (PK) | Auto-increment |
| shop | String | Shop domain |
| rewardType | String | Reward type (e.g., "free_shipping") |
| rateType | String? | Rate calculation type |
| amount | String? | Discount amount or threshold |
| minSubtotal | String? | Minimum cart subtotal to trigger |
| method | String | Shipping method identifier |
| enabled | Boolean | Rule active status |
| iconChoice | String? | Icon (default: "truck") |
| shopifyRateId | String? | Linked Shopify shipping rate ID |
| shopifyMethodDefinitionId | String? | Shopify method definition ID |
| progressTextBefore | Text? | Progress bar text before goal |
| progressTextAfter | Text? | Progress bar text after goal |
| progressTextBelow | Text? | Text displayed below the bar |
| campaignName | String? | Internal campaign label |
| cartStepName | String? | Cart step display name |

### DiscountRule
Cart-based discount rules and code campaigns.

| Column | Type | Description |
|--------|------|-------------|
| id | Int (PK) | Auto-increment |
| shop | String | Shop domain |
| type | String | Rule type ("percent", "fixed", "code", etc.) |
| value | String? | Discount value |
| minPurchase | String? | Minimum subtotal to unlock |
| enabled | Boolean | Rule active status |
| iconChoice | String? | Icon (default: "tag") |
| shopifyDiscountCodeId | String? | Linked Shopify discount code ID |
| shopifyPriceRuleId | String? | Linked Shopify price rule ID |
| discountCode | String? | The discount code string |
| progressTextBefore | Text? | Text before goal |
| progressTextAfter | Text? | Text after goal |
| progressTextBelow | Text? | Text below progress bar |
| campaignName | String? | Campaign label |
| cartStepName | String? | Cart step label |
| codeCampaignName | String? | Code-specific campaign name |
| valueType | String | "percent" or "fixed" |
| appliesTo | LongText? | JSON: product/collection scope |
| codeDiscountId | String? | Shopify code discount GID |
| condition | String? | Condition type |
| rewardType | String | Reward calculation method |
| scope | String? | Application scope |

### FreeGiftRule
Automatic free product rules.

| Column | Type | Description |
|--------|------|-------------|
| id | Int (PK) | Auto-increment |
| shop | String | Shop domain |
| trigger | String | Trigger condition type |
| minPurchase | String? | Minimum cart value |
| qty | String? | Gift quantity |
| limitPerOrder | String? | Max gifts per order |
| enabled | Boolean | Rule active status |
| iconChoice | String? | Icon (default: "gift") |
| bonusProductId | String? | Shopify product ID for gift |
| freeProductDiscountID | String? | Shopify discount ID for free product |
| minAmountFreeGiftDiscountId | String? | Min amount discount ID |
| minAmountShippingRateId | String? | Min amount shipping rate ID |
| allProductIds | LongText? | JSON: all applicable product IDs |
| progressTextBefore | Text? | Progress text before goal |
| progressTextAfter | Text? | Progress text after goal |
| progressTextBelow | Text? | Progress text below bar |
| campaignName | String? | Campaign label |
| cartStepName | String? | Cart step label |

### BxgyRule
Buy X Get Y promotion rules.

| Column | Type | Description |
|--------|------|-------------|
| id | Int (PK) | Auto-increment |
| shop | String | Shop domain |
| xQty | String | Buy quantity |
| yQty | String | Get quantity |
| scope | String | Rule scope |
| appliesTo | LongText? | JSON: scope targets |
| giftType | String | Gift type ("sku", "product") |
| giftSku | String? | Gift product SKU |
| maxGifts | String? | Maximum gifts |
| allowStacking | Boolean | Allow stacking with other rules |
| enabled | Boolean | Rule active status |
| iconChoice | String? | Icon (default: "sparkles") |
| appliesCollectionIds | LongText? | JSON: collection IDs |
| appliesProductIds | LongText? | JSON: product IDs |
| appliesStore | Boolean | Apply store-wide |
| buyxgetyId | String? | Shopify BuyXGetY discount ID |
| afterOfferUnlockMessage | String? | Message shown after unlock |
| beforeOfferUnlockMessage | String? | Message shown before unlock |
| campaignName | String? | Campaign label |

### StyleSettings
Cart drawer visual customization.

| Column | Type | Description |
|--------|------|-------------|
| id | Int (PK) | Auto-increment |
| shop | String | Shop domain |
| font | String | Font family |
| base | String | Base font size |
| headingScale | String | Heading scale factor |
| radius | String | Border radius |
| textColor | String | Primary text color |
| bg | String | Background color |
| progress | String | Progress bar color |
| cartDrawerBackground | String? | Drawer background color |
| cartDrawerTextColor | String? | Drawer text color |
| cartDrawerHeaderColor | String? | Drawer header color |
| discountCodeApply | Boolean | Show discount code input panel |
| cartDrawerImage | String? | Background image URL |
| cartDrawerBackgroundMode | String | "color" or "image" |
| borderColor | String? | Border color |
| buttonColor | String? | Button background color |
| checkoutButtonText | String? | Custom checkout button label |
| announcementBarBackgroundColor | String? | Announcement bar background |
| announcementBarTextColor | String? | Announcement bar text |
| buttonLabelColor | String? | Button label/text color |
| iconColor | String? | Icon color |

### UpsellSettings
In-cart upsell product recommendation settings.

| Column | Type | Description |
|--------|------|-------------|
| id | Int (PK) | Auto-increment |
| shop | String (unique) | Shop domain |
| enabled | Boolean | Upsell section enabled |
| showAsSlider | Boolean | Slider vs grid layout |
| autoplay | Boolean | Slider autoplay |
| recommendationMode | String | "auto" or "manual" |
| sectionTitle | String? | Section heading text |
| buttonText | String? | Add-to-cart button label |
| buttonColor | String? | Button background color |
| backgroundColor | String? | Section background color |
| textColor | String? | Text color |
| borderColor | String? | Border color |
| arrowColor | String? | Slider arrow color |
| selectedProductIds | LongText? | JSON: manually selected product IDs |
| selectedCollectionIds | LongText? | JSON: manually selected collection IDs |

### PlanSubscription
Merchant billing and subscription tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | Int (PK) | Auto-increment |
| shop | String (unique) | Shop domain |
| planId | String? | Internal plan ID |
| planName | String? | Plan display name |
| status | String? | Shopify subscription status |
| currentPeriodEnd | DateTime? | Billing period end date |
| shopifySubGid | String? | Shopify subscription GID |
| billingInterval | String? | "EVERY_30_DAYS" or "ANNUAL" |
| billingAmount | Decimal? | Billed amount |
| billingCurrency | String? | Currency code (e.g., USD) |
| trialDays | Int? | Trial duration in days |
| isTest | Boolean? | Test subscription flag |
| subscriptionCreatedAt | DateTime? | Subscription creation date |

---

## 7. Billing Plans

Defined in `app/lib/plans.js`.

| Plan ID | Name | Price | Interval | Trial |
|---------|------|-------|----------|-------|
| `free` | Free | $0 | — | — |
| `monthly` | Professional Monthly | $5/mo | Every 30 days | 7 days |
| `yearly` | Professional Yearly | $49/yr | Annual | 7 days |

### Free Plan Includes
- 1 Shipping Rule
- 1 Discount Rule
- Cart drawer customization
- Progress bar preview
- Priority support

### Professional Plan Includes (Monthly & Yearly)
- Unlimited Shipping Rules
- Unlimited Discount Rules
- Unlimited Free Gift Rules
- Unlimited Buy X Get Y Rules
- Cart drawer customization
- Progress bar preview
- Priority support

> **Note:** `SHOPIFY_BILLING_TEST=true` in `.env` enables Shopify test billing mode (no real charges).

---

## 8. API Routes

### Admin Routes (Shopify Embedded)

| Route | Method | Description |
|-------|--------|-------------|
| `/` | GET | App dashboard home |
| `/app` | GET | App layout wrapper |
| `/app/rules` | GET / POST | Rules management — list, create, update, delete all rule types and style/upsell settings |
| `/app/pricing` | GET / POST | Billing plan selection and cancellation |
| `/app/documents` | GET | Help and documentation page |
| `/app/billing/return` | GET | Post-billing redirect handler |
| `/auth/*` | GET | OAuth authentication flow |

### Internal API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/products` | GET | Returns products and collections for rule targeting (up to 250 products) |
| `/api/rules` | POST | Action proxy — delegates to `app.rules.jsx` action |

### Webhook Routes

| Route | Topics | Description |
|-------|--------|-------------|
| `/webhooks` | `app_subscriptions/update` | Updates PlanSubscription record on billing changes |
| `/webhooks/app/uninstalled` | `app/uninstalled` | Clears token, marks shop inactive, sends emails |
| `/webhooks/app/scopes_update` | `app/scopes_update` | Triggers re-registration of webhooks |
| `/webhooks/gdpr` | `customers/data_request`, `customers/redact`, `shop/redact` | GDPR data handling |

### App Proxy Route (Storefront)

| Route | Method | Description |
|-------|--------|-------------|
| `/proxy/smart` | GET | Returns all rules, settings, and product data for the storefront cart drawer |

---

## 9. Webhooks

All webhooks are registered via `shopify.app.toml` and verified using HMAC-SHA256.

### `app/uninstalled` → `/webhooks/app/uninstalled`

**Handler:** `app/routes/webhooks.app.uninstalled.jsx`

**On receive:**
1. Delete all Shopify sessions for the shop
2. Mark shop as `installed: false`, clear `accessToken`
3. Fire notification emails (non-blocking — does not delay response):
   - Email to store owner (if email available)
   - Email to app owner
4. Return `200 OK` immediately

### `app_subscriptions/update` → `/webhooks`

**Handler:** `app/routes/webhooks.jsx`

**On receive:**
1. Parse billing payload from Shopify
2. Update or create `PlanSubscription` record with latest status, amounts, dates
3. Return `200 OK`

### `app/scopes_update` → `/webhooks/app/scopes_update`

**Handler:** `app/routes/webhooks.app.scopes_update.jsx`

**On receive:**
1. Re-register all webhooks for the shop
2. Return `200 OK`

### GDPR Topics → `/webhooks/gdpr`

**Handler:** `app/routes/webhooks.gdpr.jsx`

| Topic | Action |
|-------|--------|
| `customers/data_request` | Returns 200 — no customer PII stored |
| `customers/redact` | Returns 200 — no customer data to delete |
| `shop/redact` | Deletes ALL shop data permanently (see [GDPR](#13-gdpr-compliance)) |

---

## 10. App Proxy

**Storefront URL:** `/apps/smart`
**Server URL:** `https://cartmilestone.smartreminder.in/proxy/smart`
**Route file:** `app/routes/proxy.smart.jsx` → `app/routes/app.proxy.smart.jsx`

The app proxy is called by the storefront JavaScript (`smartcartify.js`) on every page load to fetch the shop's configuration and product data.

### Security
- All requests are verified using HMAC-SHA256 signature validation
- Timestamp tolerance: 5 minutes (prevents replay attacks)
- Error responses include `Cache-Control: no-store` (never cached)
- Success responses cached for 5 minutes (`Cache-Control: public, max-age=300, stale-while-revalidate=300`)

### Response Payload

```json
{
  "ok": true,
  "shop": "yourstore.myshopify.com",
  "authorized": true,
  "metadata": {
    "installed": true,
    "onboardedAt": "2026-01-01T00:00:00.000Z",
    "uninstalledAt": null,
    "updatedAt": "2026-03-19T00:00:00.000Z"
  },
  "shippingRules": [ ... ],
  "discountRules": [ ... ],
  "freeGiftRules": [ ... ],
  "bxgyRules": [ ... ],
  "styleSettings": { ... },
  "upsellSettings": { ... },
  "upsellProducts": [ ... ],
  "upsellSelectedProducts": [ ... ],
  "upsellSelectedCollections": [ { "id": "...", "title": "...", "products": [...] } ],
  "fetchedAt": "2026-03-19T10:00:00.000Z"
}
```

---

## 11. Theme Extension

**Extension ID:** `b7b1958f-198b-c735-9d7c-124e7828c25ac2770a5b`
**Type:** Theme (App Block)
**Target:** `body` (renders on all pages)
**Config:** `extensions/smart-cart/shopify.extension.toml`

### Block File: `smart-block.liquid`

Injects the following into the storefront:

1. A `<div id="smart-embed-root">` with `data-proxy-path="/apps/smart"` and `data-design-mode` attributes.
2. A deferred `<script>` tag loading `smartcartify.js` from Shopify CDN.
3. Duplicate load prevention via `window.__SMARTCARTIFY_EMBED_LOADED__`.

### Frontend Script: `smartcartify.js`

A self-contained IIFE (~6,000 lines) that:

- Intercepts theme `cart-drawer` custom element registration to prevent conflicts
- Disables the theme's default cart drawer via CSS and DOM removal
- Fetches configuration from the app proxy
- Renders a full cart drawer UI in the page
- Handles cart mutations (add, update, remove) via Shopify's Cart AJAX API
- Renders shipping progress bars, discount announcements, free gift status, BXGY offers
- Renders upsell product recommendations
- Handles discount code apply/remove
- Supports dark/light themes and full style customization
- Listens for Shopify cart change events and re-renders accordingly

---

## 12. Email Notifications

Handled by `app/lib/email.server.js` using Nodemailer.

### Emails Sent

| Trigger | Recipients | Template |
|---------|-----------|---------|
| App installed | Store owner + App owner | `buildInstallEmail` / `buildOwnerInstallEmail` |
| App uninstalled | Store owner + App owner | `buildUninstallEmail` / `buildOwnerUninstallEmail` |

### Configuration

Set via `.env` variables:

```env
SMTP_HOST=your-smtp-host.com
SMTP_PORT=465
SMTP_SECURE=SSL
SMTP_USER=noreply@your-domain.com
SMTP_PASS=your_password
SMTP_FROM_NAME=Your App Name
SMTP_FROM_EMAIL=noreply@your-domain.com
SMTP_REPLY_TO=support@your-domain.com
APP_OWNER_EMAIL=you@yourcompany.com
```

### Non-Blocking Design

Uninstall emails are fired without `await` using `Promise.resolve().then(async () => {...})` to ensure the webhook responds to Shopify immediately (avoids timeout failures).

---

## 13. GDPR Compliance

**Handler:** `app/routes/webhooks.gdpr.jsx`

### Customer Data Request (`customers/data_request`)
- The app stores **zero customer PII**.
- Response: `200 OK` with no data export.

### Customer Data Redact (`customers/redact`)
- The app stores **zero customer PII**.
- Response: `200 OK` with no deletion needed.

### Shop Data Redact (`shop/redact`)
Triggered ~48 hours after a merchant uninstalls the app.

**Deletes the following records permanently:**

| Table | Condition |
|-------|-----------|
| `session` | `shop = ?` |
| `shop` | `shop = ?` |
| `shippingrule` | `shop = ?` |
| `discountrule` | `shop = ?` |
| `freegiftrule` | `shop = ?` |
| `bxgyrule` | `shop = ?` |
| `stylesettings` | `shop = ?` |
| `upsellsettings` | `shop = ?` |
| `plansubscription` | `shop = ?` |

Response: `200 OK`

---

## 14. Build & Deployment

### Scripts

```bash
npm run build          # Build client + server bundles (React Router)
npm run dev            # Development mode with Shopify CLI tunnel
npm start              # Start production server
npm run setup          # prisma generate + prisma migrate deploy
npm run typecheck      # TypeScript type check
npm run lint           # ESLint
npm run deploy         # Deploy extension to Shopify (shopify app deploy)
```

### Production Build Output

```
build/
├── client/            # Static assets served by Express
│   └── assets/        # Hashed JS/CSS files
└── server/
    └── index.js       # SSR server bundle (794 KB)
```

### IIS Deployment (Windows)

The app runs under IIS using the `iisnode` module.

**`web.config`** routes all requests to `server.cjs`, which:
1. Loads the React Router server build from `build/server/index.js`
2. Serves static assets from `build/client/`
3. Handles all routes via `createRequestHandler`

**Restart iisnode after changes:**
```bash
# Touch server.cjs to trigger iisnode worker restart
touch server.cjs
```

**Apply DB migrations:**
```bash
npx prisma migrate deploy
```

**Rebuild after code changes:**
```bash
npm run build && touch server.cjs
```

---

## 15. Shopify Configuration

**File:** `shopify.app.toml`

```toml
name = "CartLift: Cart Drawer & Upsell"
application_url = "https://cartmilestone.smartreminder.in/"
embedded = true

[webhooks]
api_version = "2025-01"

[access_scopes]
scopes = "read_discounts,write_discounts,read_products,write_products,read_shipping,write_shipping,read_themes,write_themes,read_orders,write_orders"

[app_proxy]
prefix = "apps"
subpath = "smart"
url = "https://cartmilestone.smartreminder.in/proxy/smart"
```

### OAuth Redirect URLs
```
https://cartmilestone.smartreminder.in/auth/callback
https://cartmilestone.smartreminder.in/auth/shopify/callback
https://cartmilestone.smartreminder.in/api/auth/callback
```

### API Scopes

| Scope | Used For |
|-------|---------|
| `read_discounts` / `write_discounts` | Manage discount codes and price rules |
| `read_products` / `write_products` | Fetch products for upsell and gift rules |
| `read_shipping` / `write_shipping` | Create shipping rate rules |
| `read_themes` / `write_themes` | Embed theme extension block |
| `read_orders` / `write_orders` | Read order context for promotions |

---

## 16. Security

### Access Token Encryption
- Shopify access tokens are encrypted with **AES-256-GCM** before DB storage.
- Decrypted only at request time using `app/lib/accessTokenCrypto.server.js`.

### Webhook Verification
- All webhooks verified via **HMAC-SHA256** using `SHOPIFY_API_SECRET`.
- Implemented in `webhooks.jsx` (`verifyShopifyHmac`) and via Shopify SDK (`authenticate.webhook`).

### App Proxy Signature Verification
- All storefront proxy requests verified via **HMAC-SHA256**.
- Timestamp tolerance: **5 minutes** (prevents replay attacks).
- Implemented in `app.proxy.smart.jsx` (`verifyAppProxySignature`).

### Custom Element Interception
- `smartcartify.js` intercepts `customElements.define` to block theme cart-drawer registration before the script loads, preventing JavaScript errors from theme conflicts.

### HTTP Headers
- `web.config`: `httpErrors existingResponse="PassThrough"` ensures JSON errors are not replaced by IIS HTML error pages.
- Error responses: `Cache-Control: no-store` prevents CDN caching of error states.

---

## 17. Troubleshooting

### App proxy returns 500
**Symptoms:** `GET /apps/smart 500` in browser console.

**Steps:**
1. Run `npx prisma migrate deploy` to ensure all DB tables exist.
2. Run `npm run build` to rebuild the server bundle.
3. Run `touch server.cjs` to restart iisnode.
4. Check browser DevTools console for `[SmartCartify] Proxy preload failed` — the message will contain the actual error text.

### Webhook delivery failures (Shopify Partner Dashboard)
**Symptoms:** High error count or `Timeout risk` in monitoring.

**Cause:** Blocking operations (e.g., email sending) in webhook handlers delay the response.

**Fix:** Ensure all non-critical operations (emails, analytics) use `Promise.resolve().then(async () => {...})` pattern to avoid blocking the webhook response.

### Cart drawer not appearing on storefront
**Symptoms:** Theme block installed but drawer doesn't open.

**Steps:**
1. Confirm the `SmartCartify` block is added to the theme in **Online Store → Themes → Customize → App Embeds** or added as a block.
2. Check browser console for script errors.
3. Verify `/apps/smart` returns `200 OK` with `"ok": true`.

### Discount code panel not showing
**Symptoms:** `discountCodeApply: true` set but panel is hidden.

**Fix:** Ensure `smartcartify.js` is up to date. The CSS rule `.sc-discount:not([hidden]){display:flex !important;}` must be present — this was added to fix an `!important` override issue.

### `Cannot read properties of null (reading 'setAttribute')` in console
**Cause:** Theme's `cart-drawer.js` registers a custom element that looks for DOM elements that don't exist.

**Fix:** Ensure the latest `smartcartify.js` is deployed — it intercepts `customElements.define` for `cart-drawer`, `cart-drawer-items`, `cart-notification`, and `cart-notification-drawer` to prevent the theme's constructor from running.

### Shop contact fields (email, firstName, etc.) not saved
**Cause:** The `afterAuth` hook returns early for reinstalls before fetching Shopify store info.

**Fix:** In `shopify.server.js`, the GraphQL fetch and `prisma.shop.update` for contact fields must run **before** the early return guard for email skipping. This is already fixed in the current version.

---

*For support, contact: balvant@pryxotech.com*
*App URL: https://cartmilestone.smartreminder.in*
