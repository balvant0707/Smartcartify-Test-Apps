import nodemailer from "nodemailer";

const parsePort = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseSecure = (value) => {
  if (!value) return false;
  const normalized = String(value).trim().toLowerCase();
  return normalized === "true" || normalized === "ssl" || normalized === "1";
};

const buildFromAddress = () => {
  const name = process.env.SMTP_FROM_NAME || "";
  const email = process.env.SMTP_FROM_EMAIL || process.env.SMTP_FROM || "";
  if (!email) return "";
  return name ? `${name} <${email}>` : email;
};

const buildTransportOptions = () => ({
  host: process.env.SMTP_HOST,
  port: parsePort(process.env.SMTP_PORT, 587),
  secure: parseSecure(process.env.SMTP_SECURE),
  auth: process.env.SMTP_USER
    ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS || "",
      }
    : undefined,
});

let cachedTransporter = null;

const getTransporter = () => {
  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport(buildTransportOptions());
  }
  return cachedTransporter;
};

const emailEnabled = () => Boolean(process.env.SMTP_HOST && buildFromAddress());

const emailConfigSummary = () => ({
  host: process.env.SMTP_HOST || "",
  port: parsePort(process.env.SMTP_PORT, 587),
  secure: parseSecure(process.env.SMTP_SECURE),
  from: buildFromAddress(),
  user: process.env.SMTP_USER || "",
});

export const sendEmail = async ({ to, subject, html, text, replyTo, cc }) => {
  if (!emailEnabled()) {
    console.warn("[email] SMTP not configured; skipping email send.", emailConfigSummary());
    return { skipped: true };
  }

  if (!to && !cc) {
    console.warn("[email] Missing recipient; skipping email send.");
    return { skipped: true };
  }

  const transporter = getTransporter();
  if (process.env.SMTP_DEBUG === "true") {
    console.log("[email] send start", {
      to,
      cc,
      subject,
      config: emailConfigSummary(),
    });
  }
  if (process.env.SMTP_VERIFY === "true") {
    await transporter.verify();
  }
  const info = await transporter.sendMail({
    from: buildFromAddress(),
    to: to || undefined,
    subject,
    html,
    text,
    ...(cc ? { cc } : {}),
    ...(replyTo ? { replyTo } : {}),
  });
  if (process.env.SMTP_DEBUG === "true") {
    console.log("[email] send success", { messageId: info.messageId });
  }

  return { messageId: info.messageId };
};
