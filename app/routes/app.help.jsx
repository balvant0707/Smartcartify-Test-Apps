// /app/routes/app.help.jsx
import React from "react";
import { useRouteError } from "react-router";
import {
  Page,
  Box,
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
          background: "#ffffff",
          border: "1px solid #dcdfe4",
          borderRadius: 4,
          padding: "20px",
          marginBottom: "16px",
          boxShadow: "0 1px 0 rgba(0, 0, 0, 0.04)",
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
          <Box borderWidth="025" borderColor="border" background="bg-surface" borderRadius="100" padding="300">
            <BlockStack gap="200">
              <div>
                <Text as="h4" variant="headingSm">
                  Prefer email?
                </Text>
                <Text tone="subdued">
                  Send us an email at{" "}
                  <Link href="mailto:info@pryxotech.com">info@pryxotech.com</Link>
                </Text>
              </div>
            </BlockStack>
          </Box>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  return (
    <Page title="Error">
      <Box borderWidth="025" borderColor="border" background="bg-surface" borderRadius="100" padding="400">
        <Text as="h2" variant="headingMd">Something went wrong</Text>
        <Text tone="subdued">
          We encountered an error loading the help page. Please try refreshing or contact support if the issue persists.
        </Text>
        {process.env.NODE_ENV !== "production" && error?.message && (
          <Text tone="critical">{error.message}</Text>
        )}
      </Box>
    </Page>
  );
}
