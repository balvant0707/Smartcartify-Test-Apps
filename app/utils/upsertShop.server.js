// app/utils/upsertShop.server.js
import prisma from "../db.server";

/**
 * Upsert a shop record.
 * Fields set to `undefined` are SKIPPED (existing DB values are preserved).
 * Fields set to `null` or a string ARE written.
 *
 * @param {object} params
 * @param {string}           params.shop          - myshopify domain (required)
 * @param {string|null}      params.accessToken   - Shopify access token
 * @param {string|undefined} params.firstName
 * @param {string|undefined} params.lastName
 * @param {string|undefined} params.email
 * @param {string|undefined} params.contactNumber
 * @param {string|undefined} params.domain
 * @param {string}           [params.status]      - appStatus, default "active"
 */
export async function upsertInstalledShop({
  shop,
  accessToken,
  firstName,
  lastName,
  email,
  contactNumber,
  domain,
  status = "active",
}) {
  // Only include contact fields that are explicitly provided (not undefined)
  const patch = {};
  if (firstName     !== undefined) patch.firstName     = firstName;
  if (lastName      !== undefined) patch.lastName      = lastName;
  if (email         !== undefined) patch.email         = email;
  if (contactNumber !== undefined) patch.contactNumber = contactNumber;
  if (domain        !== undefined) patch.domain        = domain;

  await prisma.shop.upsert({
    where: { shop },
    create: {
      shop,
      accessToken:   accessToken   ?? null,
      installed:     true,
      appStatus:     status,
      onboardedAt:   new Date(),
      domain:        domain        ?? shop,
      firstName:     firstName     ?? null,
      lastName:      lastName      ?? null,
      email:         email         ?? null,
      contactNumber: contactNumber ?? null,
    },
    update: {
      accessToken:  accessToken ?? null,
      installed:    true,
      appStatus:    status,
      uninstalledAt: null,
      ...patch,
    },
  });
}
