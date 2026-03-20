import { authenticate } from "../shopify.server";

const EMBED_BLOCK_HANDLE = "smart-block";
const THEME_TEMPLATE = "index";

export const loader = async ({ request }) => {
  const { redirect } = await authenticate.admin(request);
  const appEmbedOwnerId =
    process.env.SHOPIFY_API_KEY || process.env.SHOPIFY_SMART_CART_ID || "";

  const themeEditorUrl = new URL("shopify://admin/themes/current/editor");
  themeEditorUrl.searchParams.set("context", "apps");
  themeEditorUrl.searchParams.set("template", THEME_TEMPLATE);

  if (appEmbedOwnerId) {
    themeEditorUrl.searchParams.set(
      "activateAppId",
      `${appEmbedOwnerId}/${EMBED_BLOCK_HANDLE}`
    );
  }

  return redirect(themeEditorUrl.toString(), { target: "_parent" });
};
