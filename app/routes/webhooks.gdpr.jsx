import { authenticate } from "../shopify.server";
import db from "../db.server";

const logTopic = (topic, shop) => {
  console.log(`Received ${topic} webhook for ${shop}`);
};

const deleteShopData = async (shop) => {
  if (!shop) return;
  const deletable = [
    db.shippingRule,
    db.discountRule,
    db.freeGiftRule,
    db.bxgyRule,
    db.cartStepConfig,
    db.styleSettings,
  ];
  await Promise.all(
    deletable.map((model) => model.deleteMany({ where: { shop } })),
  );
  await Promise.all([
    db.session.deleteMany({ where: { shop } }),
    db.shop.deleteMany({ where: { shop } }),
  ]);
};

export const action = async ({ request }) => {
  const { topic, shop } = await authenticate.webhook(request);
  logTopic(topic, shop);
  const normalized = topic?.toLowerCase?.() ?? "";
  if (normalized === "customers/data_request") {
    return new Response();
  }
  if (normalized === "customers/redact") {
    return new Response();
  }
  if (normalized === "shop/redact") {
    await deleteShopData(shop);
    return new Response();
  }
  return new Response("Unsupported topic", { status: 400 });
};
