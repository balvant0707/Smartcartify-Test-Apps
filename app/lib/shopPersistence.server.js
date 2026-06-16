import prisma from "../db.server.js";
import logger from "./logger.server.js";
import { normalizeShopDomain } from "./shopUtils.server.js";

const COMPAT_FIELDS = new Set([
  "firstName",
  "lastName",
  "name",
  "ownerName",
  "email",
  "domain",
  "contactNumber",
  "phone",
  "city",
  "country",
  "currency",
  "appStatus",
  "status",
  "reviewSubmittedAt",
  "reviewRating",
  "reviewComment",
]);

const COMPAT_ERROR_CODES = new Set(["P2021", "P2022"]);
const COMPAT_ERROR_PATTERNS = [
  "Unknown argument",
  "Unknown field",
  "does not exist in the current database",
  "The column",
  "The table",
];

const stripUndefined = (value = {}) =>
  Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined),
  );

const normalizeDomain = (value) => {
  if (value == null) return value;
  const normalized = normalizeShopDomain(value);
  return normalized || String(value).trim();
};

const normalizeShopWriteData = (value = {}) => {
  const normalized = stripUndefined(value);
  if ("shop" in normalized) {
    normalized.shop = normalizeDomain(normalized.shop);
  }
  if ("domain" in normalized) {
    normalized.domain = normalizeDomain(normalized.domain);
  }
  return normalized;
};

const stripCompatFields = (value = {}) =>
  Object.fromEntries(
    Object.entries(value).filter(([key]) => !COMPAT_FIELDS.has(key)),
  );

const hasCompatFields = (value = {}) =>
  Object.keys(value).some((key) => COMPAT_FIELDS.has(key));

const isCompatSchemaError = (error, values = []) => {
  if (!values.some(hasCompatFields)) return false;

  if (COMPAT_ERROR_CODES.has(error?.code)) {
    return true;
  }

  const message = String(error?.message || "");
  if (!message) return false;

  return COMPAT_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
};

const logCompatFallback = (context, shop, error) => {
  logger.error(`[shop persistence] ${context} fell back to the legacy shop schema`, {
    shop,
    code: error?.code || null,
    error: error?.message || String(error || ""),
  });
};

export const safeUpsertShop = async ({
  shop,
  update = {},
  create = {},
  context = "shop upsert",
}) => {
  const resolvedShop =
    normalizeDomain(shop) ||
    normalizeDomain(create?.shop) ||
    normalizeDomain(update?.shop);

  if (!resolvedShop) {
    throw new Error(`[shop persistence] ${context} missing shop domain`);
  }

  const normalizedUpdate = normalizeShopWriteData(update);
  const normalizedCreate = normalizeShopWriteData({
    ...create,
    shop: resolvedShop,
  });

  try {
    return await prisma.shop.upsert({
      where: { shop: resolvedShop },
      update: normalizedUpdate,
      create: normalizedCreate,
    });
  } catch (error) {
    if (!isCompatSchemaError(error, [normalizedUpdate, normalizedCreate])) {
      throw error;
    }

    logCompatFallback(context, resolvedShop, error);

    return prisma.shop.upsert({
      where: { shop: resolvedShop },
      update: stripCompatFields(normalizedUpdate),
      create: stripCompatFields(normalizedCreate),
    });
  }
};

export const safeUpdateManyShop = async ({
  where = {},
  data = {},
  context = "shop updateMany",
}) => {
  const normalizedWhere = {
    ...where,
    ...(where?.shop ? { shop: normalizeDomain(where.shop) } : {}),
  };
  const normalizedData = normalizeShopWriteData(data);

  try {
    return await prisma.shop.updateMany({
      where: normalizedWhere,
      data: normalizedData,
    });
  } catch (error) {
    if (!isCompatSchemaError(error, [normalizedData])) {
      throw error;
    }

    logCompatFallback(context, normalizedWhere.shop || null, error);

    return prisma.shop.updateMany({
      where: normalizedWhere,
      data: stripCompatFields(normalizedData),
    });
  }
};

export const safeCreateShop = async ({
  data = {},
  context = "shop create",
}) => {
  const normalizedData = normalizeShopWriteData(data);

  try {
    return await prisma.shop.create({ data: normalizedData });
  } catch (error) {
    if (!isCompatSchemaError(error, [normalizedData])) {
      throw error;
    }

    logCompatFallback(context, normalizedData.shop || null, error);

    return prisma.shop.create({
      data: stripCompatFields(normalizedData),
    });
  }
};
