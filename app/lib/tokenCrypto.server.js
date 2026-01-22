import crypto from "node:crypto";

const TOKEN_PREFIX = "enc:";
const IV_LENGTH = 12;

const getEncryptionKey = () => {
  const raw =
    process.env.APP_TOKEN_ENCRYPTION_KEY ||
    process.env.SHOPIFY_TOKEN_ENCRYPTION_KEY ||
    "";
  if (!raw) return null;

  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }

  const base64Key = Buffer.from(raw, "base64");
  if (base64Key.length === 32) return base64Key;

  const utf8Key = Buffer.from(raw, "utf8");
  if (utf8Key.length === 32) return utf8Key;

  return null;
};

const requireKey = () => {
  const key = getEncryptionKey();
  const isProd = process.env.NODE_ENV === "production";
  if (key) return key;
  if (isProd) {
    throw new Error("APP_TOKEN_ENCRYPTION_KEY must be set for production.");
  }
  console.warn(
    "APP_TOKEN_ENCRYPTION_KEY missing; tokens will be stored unencrypted."
  );
  return null;
};

export const encryptToken = (plain) => {
  if (!plain) return plain;
  const key = requireKey();
  if (!key) return plain;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${TOKEN_PREFIX}${iv.toString("base64")}:${tag.toString(
    "base64"
  )}:${encrypted.toString("base64")}`;
};

export const decryptToken = (stored) => {
  if (!stored) return stored;
  if (!stored.startsWith(TOKEN_PREFIX)) return stored;

  const key = requireKey();
  if (!key) return stored;

  const parts = stored.slice(TOKEN_PREFIX.length).split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted token format.");
  }

  const [ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const encrypted = Buffer.from(dataB64, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
};

export const maybeEncryptToken = (plain) => {
  if (!plain) return plain;
  if (plain.startsWith(TOKEN_PREFIX)) return plain;
  return encryptToken(plain);
};

export const maybeDecryptToken = (stored) => {
  if (!stored) return stored;
  if (!stored.startsWith(TOKEN_PREFIX)) return stored;
  return decryptToken(stored);
};
