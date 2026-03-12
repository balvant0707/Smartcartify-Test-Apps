const FEATURE_CONFIGURATION_URL =
  "https://cartliftcartdrawerupsell.tawk.help/category/features";

export default function AppDocumentsRoute() {
  return (
    <s-page heading="Documents">
      <s-section>
        <s-box
          padding="base"
          background="white"
          borderRadius="extraLarge"
          borderWidth="base"
          style={{ boxShadow: "0 10px 35px rgba(15, 23, 42, 0.08)" }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <s-heading level="5">Feature Configuration</s-heading>
            <s-paragraph tone="subdued">
              Open the feature configuration documentation.
            </s-paragraph>
            <div>
              <s-button
                href={FEATURE_CONFIGURATION_URL}
                variant="primary"
                target="_blank"
                rel="noopener noreferrer"
                style={{ backgroundColor: "#1f2937", borderColor: "#1f2937" }}
              >
                Feature Configuration
              </s-button>
            </div>
          </div>
        </s-box>
      </s-section>
    </s-page>
  );
}
