// /app/routes/app.help.jsx
import React from "react";
import {
  Page,
  Card,
  Text,
  List,
  Button,
  Layout,
  InlineStack,
  BlockStack,
  Badge,
  Link,
  TextField,
  DropZone,
} from "@shopify/polaris";

const SUPPORT_URL = "https://pryxotech.com/#inquiry-now";

export default function Help() {
  const [files, setFiles] = React.useState([]);

  const handleDrop = React.useCallback((_droppedFiles, acceptedFiles) => {
    const filesWithPreview = acceptedFiles.map((file) =>
      Object.assign(file, { preview: URL.createObjectURL(file) })
    );
    setFiles((prev) => [...prev, ...filesWithPreview]);
  }, []);

  React.useEffect(() => {
    return () => {
      files.forEach((file) => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, [files]);

  const uploadedFiles =
    files.length > 0 ? (
      <BlockStack gap="200">
        <Text as="h3" variant="headingSm">
          Uploaded screenshots
        </Text>
        <InlineStack gap="200" wrap>
          {files.map((file, index) => (
            <DropZone.ImagePreview
              key={`${file.name}-${index}`}
              file={file}
              source={file.preview}
            />
          ))}
        </InlineStack>
        <InlineStack gap="200">
          <Button onClick={() => setFiles([])}>Clear uploads</Button>
        </InlineStack>
      </BlockStack>
    ) : null;

  return (
    <Page title="Help & Support">
      <div
        style={{
          background:
            "linear-gradient(110deg, #b9d7ff 0%, #e7b0c4 45%, #f8b18f 100%)",
          borderRadius: "14px",
          padding: "20px",
          marginBottom: "16px",
        }}
      >
        <BlockStack gap="200">
          <Text as="h2" variant="headingMd">
            Stuck somewhere? We are here to help.
          </Text>
          <Text tone="subdued">
            Most issues resolve fastest with a quick message. Share your shop
            URL, steps, and screenshots if possible.
          </Text>
          <InlineStack gap="200">
            <Button variant="primary" url={SUPPORT_URL} external>
              Contact Us
            </Button>
            <Button url={SUPPORT_URL} external>
              Email Support
            </Button>
          </InlineStack>
        </BlockStack>
      </div>

      <Layout>
        <Layout.Section>
          <Card sectioned>
            <BlockStack gap="200">
              <div style={{ borderTop: "1px solid #e1e3e5", paddingTop: "12px" }}>
                <Text as="h4" variant="headingSm">
                  Prefer email?
                </Text>
                <Text tone="subdued">
                  Send us an email at{" "}
                  <Link href="mailto:info@pryxotech.com">info@pryxotech.com</Link>
                </Text>
              </div>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
