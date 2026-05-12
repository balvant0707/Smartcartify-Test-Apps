const FEATURE_CONFIGURATION_URL =
  "https://cartliftcartdrawerupsell.tawk.help/category/features";

export default function AppDocumentsRoute() {
  const documents = [
    {
      title: "Feature Configuration",
      description: "Set up shipping, discounts, gifts, BXGY, upsells, and cart styling.",
      href: FEATURE_CONFIGURATION_URL,
      action: "Open guide",
    },
  ];

  return (
    <s-page heading="Documents">
      <s-section>
        <div className="app-documents-grid">
          {documents.map((doc) => (
            <s-box
              key={doc.title}
              className="app-surface-card"
              padding="base"
              background="white"
              borderRadius="base"
              borderWidth="base"
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 150 }}>
                <s-heading level="5">{doc.title}</s-heading>
                <s-paragraph tone="subdued">{doc.description}</s-paragraph>
                <div style={{ marginTop: "auto" }}>
                  <s-button
                    href={doc.href}
                    variant="primary"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ backgroundColor: "#1f2937", borderColor: "#1f2937" }}
                  >
                    {doc.action}
                  </s-button>
                </div>
              </div>
            </s-box>
          ))}
        </div>
      </s-section>
    </s-page>
  );
}
