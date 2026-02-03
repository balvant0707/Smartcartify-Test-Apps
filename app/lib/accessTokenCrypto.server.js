import crypto from "crypto";

const TOKEN_PREFIX = "enc:v1";
const IV_BYTES = 12;

const normalizeHex = (value) => {
  const v = String(value || "").trim();
  return /^[0-9a-f]{64}$/i.test(v) ? Buffer.from(v, "hex") : null;
};

const normalizeBase64 = (value) => {
  const v = String(value || "").trim();
  if (!v) return null;
  try {
    const b = Buffer.from(v, "base64");
    return b.length === 32 ? b : null;
  } catch {
    return null;
  }
};

const getSecretKey = () => {
  const direct =
    normalizeHex(process.env.ACCESS_TOKEN_ENCRYPTION_KEY_HEX) ||
    normalizeBase64(process.env.ACCESS_TOKEN_ENCRYPTION_KEY_BASE64) ||
    normalizeBase64(process.env.ACCESS_TOKEN_ENCRYPTION_KEY) ||
    normalizeHex(process.env.ENCRYPTION_KEY_HEX) ||
    normalizeBase64(process.env.ENCRYPTION_KEY_BASE64) ||
    normalizeHex(process.env.ENCRYPTION_KEY) ||
    normalizeBase64(process.env.ENCRYPTION_KEY);
  if (direct) return direct;

  const fallbackSecret = process.env.SHOPIFY_API_SECRET || "";
  if (!fallbackSecret) {
    throw new Error(
      "Missing encryption key. Set ACCESS_TOKEN_ENCRYPTION_KEY(_BASE64/_HEX) or SHOPIFY_API_SECRET."
    );
  }
  return crypto.createHash("sha256").update(String(fallbackSecret), "utf8").digest();
};

export const isEncryptedAccessToken = (value) =>
  String(value || "").startsWith(`${TOKEN_PREFIX}:`);

export const encryptAccessToken = (plainToken) => {
  const token = String(plainToken || "").trim();
  if (!token) return null;
  if (isEncryptedAccessToken(token)) return token;

  const key = getSecretKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${TOKEN_PREFIX}:${iv.toString("base64")}:${tag.toString("base64")}:${ciphertext.toString("base64")}`;
};

export const decryptAccessToken = (storedValue) => {
  const value = String(storedValue || "").trim();
  if (!value) return null;
  if (!isEncryptedAccessToken(value)) return value;

  const [, ivB64, tagB64, dataB64] = value.split(":");
  if (!ivB64 || !tagB64 || !dataB64) return null;

  try {
    const key = getSecretKey();
    const iv = Buffer.from(ivB64, "base64");
    const tag = Buffer.from(tagB64, "base64");
    const ciphertext = Buffer.from(dataB64, "base64");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
    return plain || null;
  } catch {
    return null;
  }
};
