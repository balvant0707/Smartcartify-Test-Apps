import React from "react";
import { useLoaderData, useRevalidator, useRouteError } from "react-router";
import {
  Badge,
  BlockStack,
  Box,
  Card,
  InlineStack,
  Page,
  Text,
  Frame,
} from "@shopify/polaris";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

const ANALYTICS_CSS = `
.analytics-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.analytics-two-column {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 360px);
  gap: 16px;
  align-items: start;
}

.analytics-table {
  width: 100%;
  border-collapse: collapse;
}

.analytics-table th,
.analytics-table td {
  border-bottom: 1px solid #e3e5e8;
  padding: 10px 8px;
  text-align: left;
  vertical-align: top;
}

.analytics-table th {
  color: #616161;
  font-size: 12px;
  font-weight: 650;
  background: #f9fafb;
}

.analytics-meter {
  height: 8px;
  border-radius: 4px;
  background: #eef2f7;
  overflow: hidden;
}

.analytics-meter__fill {
  height: 100%;
  border-radius: 4px;
  background: #008060;
}

@media (max-width: 1000px) {
  .analytics-grid,
  .analytics-two-column {
    grid-template-columns: 1fr;
  }
}
`;

const RULE_SELECT = {
  id: true,
  enabled: true,
  campaignName: true,
  priority: true,
  customerTarget: true,
  analyticsImpressions: true,
  analyticsConversions: true,
};

const BASE_SELECT = {
  id: true,
  enabled: true,
  campaignName: true,
  priority: true,
  customerTarget: true,
};

const queryRules = async (model, shop) => {
  try {
    return await model.findMany({
      where: { shop },
      orderBy: [{ analyticsConversions: "desc" }, { analyticsImpressions: "desc" }],
      select: RULE_SELECT,
    });
  } catch {
    try {
      const rows = await model.findMany({
        where: { shop },
        orderBy: [{ id: "asc" }],
        select: BASE_SELECT,
      });
      return rows.map((r) => ({ ...r, analyticsImpressions: 0, analyticsConversions: 0 }));
    } catch {
      return [];
    }
  }
};

const numberFormat = new Intl.NumberFormat("en-US");

const toNumber = (value) => {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
};

const conversionRate = (conversions, impressions) => {
  const views = toNumber(impressions);
  if (!views) return 0;
  return (toNumber(conversions) / views) * 100;
};

const normalizeRuleRows = (rows = [], type, fallbackName) =>
  rows.map((row) => ({
    id: row.id,
    type,
    enabled: Boolean(row.enabled),
    name: row.campaignName || `${fallbackName} #${row.id}`,
    priority: toNumber(row.priority),
    customerTarget: row.customerTarget || "all",
    impressions: toNumber(row.analyticsImpressions),
    conversions: toNumber(row.analyticsConversions),
    rate: conversionRate(row.analyticsConversions, row.analyticsImpressions),
  }));

const summarizeType = (rows = [], label) => {
  const impressions = rows.reduce((sum, row) => sum + row.impressions, 0);
  const conversions = rows.reduce((sum, row) => sum + row.conversions, 0);
  return {
    label,
    impressions,
    conversions,
    rate: conversionRate(conversions, impressions),
  };
};

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  try {
    const [shippingRows, discountRows, freeGiftRows, bxgyRows] =
      await Promise.all([
        queryRules(prisma.shippingRule, shop),
        queryRules(prisma.discountRule, shop),
        queryRules(prisma.freeGiftRule, shop),
        queryRules(prisma.bxgyRule, shop),
      ]);

    const shipping = normalizeRuleRows(shippingRows, "Shipping", "Shipping rule");
    const discounts = normalizeRuleRows(discountRows, "Discount", "Discount rule");
    const freeGift = normalizeRuleRows(freeGiftRows, "Free gift", "Free gift rule");
    const bxgy = normalizeRuleRows(bxgyRows, "BXGY", "BXGY rule");
    const rules = [...shipping, ...discounts, ...freeGift, ...bxgy].sort((a, b) => {
      if (b.conversions !== a.conversions) return b.conversions - a.conversions;
      if (b.impressions !== a.impressions) return b.impressions - a.impressions;
      return b.priority - a.priority;
    });

    const totalImpressions = rules.reduce((sum, row) => sum + row.impressions, 0);
    const totalConversions = rules.reduce((sum, row) => sum + row.conversions, 0);
    const activeRules = rules.filter((row) => row.enabled).length;
    const topRule = rules[0] || null;

    return {
      shop,
      error: null,
      summary: {
        totalRules: rules.length,
        activeRules,
        totalImpressions,
        totalConversions,
        conversionRate: conversionRate(totalConversions, totalImpressions),
      },
      byType: [
        summarizeType(shipping, "Shipping"),
        summarizeType(discounts, "Discount"),
        summarizeType(freeGift, "Free gift"),
        summarizeType(bxgy, "BXGY"),
      ],
      topRule,
      rules,
    };
  } catch (err) {
    console.error("[analytics loader] DB error:", err?.message);
    return {
      shop,
      error: "Failed to load analytics data. Please try refreshing.",
      summary: { totalRules: 0, activeRules: 0, totalImpressions: 0, totalConversions: 0, conversionRate: 0 },
      byType: [],
      topRule: null,
      rules: [],
    };
  }
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const form = await request.formData();
  const intent = String(form.get("intent") || "").trim();

  if (intent === "reset_analytics") {
    try {
      await Promise.all([
        prisma.shippingRule.updateMany({
          where: { shop },
          data: { analyticsImpressions: 0, analyticsConversions: 0 },
        }),
        prisma.discountRule.updateMany({
          where: { shop },
          data: { analyticsImpressions: 0, analyticsConversions: 0 },
        }),
        prisma.freeGiftRule.updateMany({
          where: { shop },
          data: { analyticsImpressions: 0, analyticsConversions: 0 },
        }),
        prisma.bxgyRule.updateMany({
          where: { shop },
          data: { analyticsImpressions: 0, analyticsConversions: 0 },
        }),
      ]);
      return { ok: true, message: "Analytics reset successfully." };
    } catch (err) {
      console.error("[analytics action] reset failed:", err?.message);
      return { ok: false, message: "Failed to reset analytics. Please try again." };
    }
  }

  return { ok: false, message: "Unknown action." };
};

const MetricCard = ({ label, value, caption }) => (
  <Card>
    <Box padding="300">
      <BlockStack gap="100">
        <Text as="p" tone="subdued" variant="bodySm">
          {label}
        </Text>
        <Text as="p" variant="headingLg">
          {value}
        </Text>
        {caption ? (
          <Text as="p" tone="subdued" variant="bodySm">
            {caption}
          </Text>
        ) : null}
      </BlockStack>
    </Box>
  </Card>
);

const TypeBreakdown = ({ rows = [] }) => {
  const maxConversions = Math.max(...rows.map((row) => row.conversions), 1);
  return (
    <Card>
      <Box padding="300">
        <BlockStack gap="250">
          <Text as="h2" variant="headingMd">
            Rule type performance
          </Text>
          {rows.length === 0 ? (
            <Text as="p" tone="subdued">No data available yet.</Text>
          ) : (
            rows.map((row) => {
              const width = Math.max(4, (row.conversions / maxConversions) * 100);
              return (
                <BlockStack gap="100" key={row.label}>
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodySm" fontWeight="semibold">
                      {row.label}
                    </Text>
                    <Text as="span" variant="bodySm" tone="subdued">
                      {numberFormat.format(row.conversions)} conversions
                    </Text>
                  </InlineStack>
                  <div className="analytics-meter">
                    <div
                      className="analytics-meter__fill"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <Text as="p" variant="bodySm" tone="subdued">
                    {numberFormat.format(row.impressions)} views,{" "}
                    {row.rate.toFixed(1)}% conversion rate
                  </Text>
                </BlockStack>
              );
            })
          )}
        </BlockStack>
      </Box>
    </Card>
  );
};

const RulesTable = ({ rules = [] }) => (
  <Card>
    <Box padding="300">
      <BlockStack gap="250">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h2" variant="headingMd">
            Rule analytics
          </Text>
          <Badge>{rules.length} rules</Badge>
        </InlineStack>
        <div style={{ overflowX: "auto" }}>
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Rule</th>
                <th>Type</th>
                <th>Status</th>
                <th>Views</th>
                <th>Conversions</th>
                <th>Rate</th>
                <th>Priority</th>
                <th>Target</th>
              </tr>
            </thead>
            <tbody>
              {rules.length ? (
                rules.map((rule) => (
                  <tr key={`${rule.type}-${rule.id}`}>
                    <td>
                      <Text as="span" variant="bodySm" fontWeight="semibold">
                        {rule.name}
                      </Text>
                    </td>
                    <td>{rule.type}</td>
                    <td>
                      <Badge tone={rule.enabled ? "success" : "attention"}>
                        {rule.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </td>
                    <td>{numberFormat.format(rule.impressions)}</td>
                    <td>{numberFormat.format(rule.conversions)}</td>
                    <td>{rule.rate.toFixed(1)}%</td>
                    <td>{rule.priority}</td>
                    <td>{rule.customerTarget}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8}>
                    <Text as="p" tone="subdued">
                      No rule analytics available yet.
                    </Text>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </BlockStack>
    </Box>
  </Card>
);

export default function AnalyticsDashboard() {
  const { summary, byType, topRule, rules, error } = useLoaderData();
  const revalidator = useRevalidator();

  React.useEffect(() => {
    revalidator.revalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Frame>
      <style>{ANALYTICS_CSS}</style>
      <Page
        title="Analytics Dashboard"
        subtitle="Track rule views, conversions, and performance by offer type."
        fullWidth
      >
        <BlockStack gap="400">
          {error && (
            <Box
              background="bg-surface-critical"
              padding="300"
              borderRadius="200"
            >
              <Text as="p" tone="critical">{error}</Text>
            </Box>
          )}

          <div className="analytics-grid">
            <MetricCard
              label="Total views"
              value={numberFormat.format(summary.totalImpressions)}
              caption="Rule impressions recorded from storefront events"
            />
            <MetricCard
              label="Conversions"
              value={numberFormat.format(summary.totalConversions)}
              caption="Completed rule conversion events"
            />
            <MetricCard
              label="Conversion rate"
              value={`${(summary.conversionRate || 0).toFixed(1)}%`}
              caption={`${summary.activeRules} active of ${summary.totalRules} rules`}
            />
            <MetricCard
              label="Top rule"
              value={topRule?.name || "No data"}
              caption={
                topRule
                  ? `${numberFormat.format(topRule.conversions)} conversions`
                  : "Events will appear after storefront activity"
              }
            />
          </div>

          <div className="analytics-two-column">
            <RulesTable rules={rules} />
            <BlockStack gap="300">
              <TypeBreakdown rows={byType} />
              <Card>
                {/* <Box padding="300">
                  <BlockStack gap="200">
                    <Text as="h2" variant="headingMd">
                      Event source
                    </Text>
                    <Text as="p" tone="subdued">
                      This dashboard reads the counters saved by the app proxy
                      analytics endpoint for impressions and conversions.
                    </Text>
                    <Divider />
                    <Text as="p" variant="bodySm">
                      Use rule priority and targeting on the rules page, then
                      compare results here.
                    </Text>
                  </BlockStack>
                </Box> */}
              </Card>
            </BlockStack>
          </div>
        </BlockStack>
      </Page>
    </Frame>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  return (
    <Page title="Analytics Error">
      <Box
        borderWidth="025"
        borderColor="border"
        background="bg-surface"
        borderRadius="100"
        padding="400"
      >
        <BlockStack gap="200">
          <Text as="h2" variant="headingMd">
            Something went wrong
          </Text>
          <Text tone="subdued">
            We encountered an error loading the analytics page. Please try
            refreshing or contact support if the issue persists.
          </Text>
          {process.env.NODE_ENV !== "production" && error?.message && (
            <Text tone="critical">{error.message}</Text>
          )}
        </BlockStack>
      </Box>
    </Page>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
