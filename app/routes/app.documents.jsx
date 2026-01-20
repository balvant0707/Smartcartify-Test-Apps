// app.documents.jsx
import React from "react";
import {
  Page,
  Card,
  BlockStack,
  InlineStack,
  Text,
  List,
  Divider,
} from "@shopify/polaris";

const IMAGES = {
  orchestrate: "/images/296faa6a-bc0e-4791-8c63-d44d2a199d86_HD_2x.png",
  shipping: "/images/3d7d7cf4-8bd4-486f-bf59-1b074bd7ca8e_HD_2x.png",
  autoDiscount: "/images/dbf2728b-4c7c-4a5c-9867-1dfa415a4b3d_HD_2x.png",
  freeProduct: "/images/0a9d884a-35d5-4d82-8fd5-9615f4bee146_HD_2x.png",
  codeDiscount: "/images/7be0ed09-fa96-4acd-b4e9-74c8a2969e8f_HD_2x.png",
  bxy: "/images/9c0861fe-3eac-48d5-b4aa-574385237631_HD_2x.png",
  customize: "/images/62a2654f-55b4-4f9a-9f83-46beffd4dd34_HD_2x.png",
  pricing: "/images/10046a19-d65b-4982-a09c-40437984c7eb_HD_2x.png",
};

const DOCUMENT_ITEMS = [
  {
    id: "orchestrate",
    title: "What you can orchestrate",
    image: IMAGES.orchestrate,
    intro:
      "This overview shows the main modules and the Configure buttons for quick access.",
    bullets: [
      "Each card represents a feature module with its icon and short description.",
      "Configure button opens the selected module screen to edit rules.",
      "Top row covers Shipping, Discount, and Free Product modules.",
      "Second row covers Buy X Get Y, Code Discount, and Style Preview modules.",
      "Quick shortcuts provide fast access to Rewards, Style preview, and FAQs.",
    ],
  },
  {
    id: "shipping",
    title: "Shipping Rules",
    image: IMAGES.shipping,
    intro:
      "Create free shipping or conditional shipping rules and preview the cart banner.",
    bullets: [
      "Left side tabs switch between modules; the active tab is highlighted.",
      "Add Rule creates a new shipping rule card.",
      "Enable toggles the rule on or off.",
      "Reward Type and Threshold define when Free Shipping unlocks.",
      "Rule icon selects the icon shown on the progress step.",
      "Content Settings control messages above and below the progress bar.",
      "Campaign name is the internal label used in the admin.",
      "Cart Step controls the position of the step in the progress bar.",
      "Hide collapses the rule and Remove deletes it.",
      "Save Rule stores the rule and applies it in the cart widget.",
      "Preview on the right shows the cart banner and slider simulation.",
    ],
  },
  {
    id: "auto-discount",
    title: "Automatic Discounts",
    image: IMAGES.autoDiscount,
    intro:
      "Set auto discount rules with a minimum purchase and cart preview messaging.",
    bullets: [
      "Left side tabs switch modules; use Automatic Discounts to edit this rule.",
      "Add automatic rule creates a new auto discount configuration.",
      "Hide collapses the rule and Deactivate pauses it without deleting.",
      "Remove deletes the rule permanently.",
      "Discount type and Value define the percent off.",
      "Min purchase and Scope decide when the discount applies.",
      "Rule icon sets the badge icon shown on the progress bar.",
      "Content Settings updates the before and after messages in the cart.",
      "Campaign name and Cart Step keep the progress order consistent.",
      "Save Rule stores the rule and enables it in the cart.",
      "Preview panel on the right shows the progress bar and discount badge.",
    ],
  },
  {
    id: "free-product",
    title: "Free Product and Quantity",
    image: IMAGES.freeProduct,
    intro:
      "Offer a free gift when the cart reaches a minimum amount.",
    bullets: [
      "Left side tabs switch modules; select Free Product and Quantity to manage gifts.",
      "Add Rule creates a new free product rule.",
      "Hide, Deactivate, and Remove manage the rule state.",
      "Gift Product lets you select the item that will be added.",
      "Clear removes the selected gift product.",
      "Qty and Limit per order control gift quantity.",
      "Rule icon sets the progress step icon for the gift.",
      "Content Settings messages explain progress to customers.",
      "Campaign name and Cart Step set the label and step order.",
      "Save Rule stores the rule for live use.",
      "Preview on the right shows the gift badge and progress bar.",
    ],
  },
  {
    id: "code-discount",
    title: "Discount Codes",
    image: IMAGES.codeDiscount,
    intro:
      "Create a discount code rule and display the offer message in the cart.",
    bullets: [
      "Left side tabs switch modules; Code Discount is active here.",
      "Hide, Deactivate, and Remove manage the rule state.",
      "Discount type, Discount code, and Value define the offer.",
      "Min purchase and Scope control eligibility.",
      "Rule icon controls the progress step badge.",
      "Content Settings lets you insert placeholders like {{discount_code}}.",
      "Before and after messages update the cart banner text.",
      "Campaign name is the internal admin label.",
      "Save Rule stores your configuration.",
    ],
  },
  {
    id: "bxy",
    title: "Buy X Get Y (BXGY)",
    image: IMAGES.bxy,
    intro:
      "Run Buy X Get Y offers with quantity targets and success messages.",
    bullets: [
      "Left side tabs switch modules; BXGY is the active tab.",
      "Add Rule creates a new BXGY rule.",
      "Hide, Activate, and Remove manage the rule state.",
      "Buy (X qty) and Get (Y qty) set the offer quantities.",
      "Max uses per order prevents over-rewarding.",
      "Scope sets which products the offer applies to.",
      "Rule icon selects the progress step icon.",
      "Content Settings lets you customize before and after unlock messages.",
      "Campaign name is the internal label shown in admin.",
      "Save Rule stores the BXGY setup.",
    ],
  },
  {
    id: "customize",
    title: "Customize and Preview",
    image: IMAGES.customize,
    intro:
      "Control the cart drawer styling and see changes live in the preview.",
    bullets: [
      "Left side tabs switch modules; Customize and Preview is active here.",
      "Base size, heading scale, and button radius adjust typography.",
      "Color controls update text, background, progress bar, and button colors.",
      "Border color controls the outline around fields and cards.",
      "Checkout button label sets the CTA text.",
      "Cart drawer options change the drawer background and heading colors.",
      "Show discount code apply checkbox toggles the discount input field.",
      "Right side shows a live cart drawer preview.",
    ],
  },
];

function DocumentRow({ item }) {
  return (
    <Card sectioned>
      <InlineStack gap="400" wrap align="start">
        <div style={{ minWidth: 650, flex: "0 0 580px" }}>
          <img
            src={item.image}
            alt={`${item.title} screenshot`}
            width={520}
            style={{
              borderRadius: 12,
              border: "1px solid #e1e3e5",
              background: "#f8fafc",
              display: "block",
              maxWidth: "100%",
              height: "auto",
              width: "100%",
            }}
          />
        </div>
        <BlockStack gap="200">
          <Text as="h3" variant="headingMd">
            {item.title}
          </Text>
          <Text tone="subdued">{item.intro}</Text>
          <List type="bullet">
            {item.bullets.map((bullet) => (
              <List.Item key={bullet}>{bullet}</List.Item>
            ))}
          </List>
        </BlockStack>
      </InlineStack>
    </Card>
  );
}

export default function Documents() {
  return (
    <Page title="Smartcartify Documents" fullWidth>
      <BlockStack gap="200">
        <BlockStack gap="400">
          {DOCUMENT_ITEMS.map((item) => (
            <DocumentRow key={item.id} item={item} />
          ))}
        </BlockStack>
      </BlockStack>
    </Page>
  );
}
