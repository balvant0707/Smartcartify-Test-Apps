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
 * @param {string|undefined} params.name
 * @param {string|undefined} params.ownerName
 * @param {string|undefined} params.email
 * @param {string|undefined} params.contactNumber
 * @param {string|undefined} params.phone
 * @param {string|undefined} params.city
 * @param {string|undefined} params.country
 * @param {string|undefined} params.currency
 * @param {string|undefined} params.domain
 * @param {string}           [params.appStatus]   - appStatus, default "active"
 * @param {string}           [params.status]      - install lifecycle status, default "installed"
 */
export async function upsertInstalledShop({
  shop,
  accessToken,
  firstName,
  lastName,
  name,
  ownerName,
  email,
  contactNumber,
  phone,
  city,
  country,
  currency,
  domain,
  appStatus = "active",
  status = "installed",
}) {
  // Only include contact fields that are explicitly provided (not undefined)
  const patch = {};
  if (firstName     !== undefined) patch.firstName     = firstName;
  if (lastName      !== undefined) patch.lastName      = lastName;
  if (name          !== undefined) patch.name          = name;
  if (ownerName     !== undefined) patch.ownerName     = ownerName;
  if (email         !== undefined) patch.email         = email;
  if (contactNumber !== undefined) patch.contactNumber = contactNumber;
  if (phone         !== undefined) patch.phone         = phone;
  if (city          !== undefined) patch.city          = city;
  if (country       !== undefined) patch.country       = country;
  if (currency      !== undefined) patch.currency      = currency;
  if (domain        !== undefined) patch.domain        = domain;

  await prisma.shop.upsert({
    where: { shop },
    create: {
      shop,
      accessToken:   accessToken   ?? null,
      installed:     true,
      appStatus,
      status,
      onboardedAt:   new Date(),
      domain:        domain        ?? shop,
      firstName:     firstName     ?? null,
      lastName:      lastName      ?? null,
      name:          name          ?? null,
      ownerName:     ownerName     ?? null,
      email:         email         ?? null,
      contactNumber: contactNumber ?? null,
      phone:         phone         ?? null,
      city:          city          ?? null,
      country:       country       ?? null,
      currency:      currency      ?? null,
    },
    update: {
      accessToken:  accessToken ?? null,
      installed:    true,
      appStatus,
      status,
      uninstalledAt: null,
      ...patch,
    },
  });
}
