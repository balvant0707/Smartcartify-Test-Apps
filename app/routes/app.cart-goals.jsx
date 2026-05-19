import { useState, useCallback, useId } from "react";
import { useNavigate } from "react-router";
import {
  Page,
  Layout,
  Text,
  Box,
  BlockStack,
  InlineStack,
  Button,
  TextField,
  Select,
  Checkbox,
  RangeSlider,
  Banner,
  Popover,
  ActionList,
  Collapsible,
  Divider,
  Icon,
  Badge,
} from "@shopify/polaris";
import {
  TargetIcon,
  EditIcon,
  SettingsIcon,
  MinimizeIcon,
  MaximizeIcon,
  GiftCardIcon,
  DiscountIcon,
  DeliveryIcon,
  CalendarIcon,
  ClockIcon,
  PersonFilledIcon,
  InfoIcon,
  PauseCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return {};
};

// ─── Collapsible section card ─────────────────────────────────────────────────
function SectionCard({ icon, title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e1e3e5",
        borderRadius: "12px",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 18px",
          borderBottom: open ? "1px solid #e1e3e5" : "none",
        }}
      >
        <InlineStack gap="200" align="center" blockAlign="center">
          <Icon source={icon} />
          <Text variant="headingSm" as="h3" fontWeight="semibold">
            {title}
          </Text>
        </InlineStack>
        <Button
          variant="plain"
          icon={open ? MinimizeIcon : MaximizeIcon}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Collapse" : "Expand"}
        </Button>
      </div>

      <Collapsible open={open} id={`section-${title}`}>
        <Box padding="400">{children}</Box>
        {/* Bottom collapse link */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            padding: "8px 18px 12px",
          }}
        >
          <Button
            variant="plain"
            icon={MinimizeIcon}
            onClick={() => setOpen(false)}
          >
            Collapse
          </Button>
        </div>
      </Collapsible>
    </div>
  );
}

// ─── Pill toggle (Total cart value / Product quantity) ───────────────────────
function PillToggle({ options, value, onChange }) {
  return (
    <div
      style={{
        display: "inline-flex",
        background: "#f1f1f1",
        borderRadius: "8px",
        padding: "3px",
        gap: "2px",
      }}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            padding: "6px 14px",
            borderRadius: "6px",
            border: "none",
            cursor: "pointer",
            fontWeight: value === opt.value ? "600" : "400",
            fontSize: "13px",
            background: value === opt.value ? "#fff" : "transparent",
            boxShadow:
              value === opt.value
                ? "0 1px 3px rgba(0,0,0,0.12)"
                : "none",
            color: value === opt.value ? "#1a1a1a" : "#6d7175",
            transition: "all 0.12s",
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── Goal reward type button row ──────────────────────────────────────────────
const REWARD_TYPES = [
  { label: "Free product", icon: GiftCardIcon, value: "free_product" },
  { label: "Order discount", icon: DiscountIcon, value: "order_discount" },
  { label: "Free shipping", icon: DeliveryIcon, value: "free_shipping" },
];

function AddGoalDropdown({ onSelect }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);

  return (
    <Popover
      active={open}
      activator={
        <button
          onClick={toggle}
          style={{
            width: "100%",
            padding: "12px",
            border: "1.5px dashed #c9cccf",
            borderRadius: "8px",
            background: "#f6f6f7",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "500",
            color: "#202223",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <span style={{ fontSize: "18px", lineHeight: 1 }}>+</span>
          Add a new goal
        </button>
      }
      onClose={close}
      preferredAlignment="left"
    >
      <ActionList
        items={REWARD_TYPES.map((rt) => ({
          content: rt.label,
          icon: rt.icon,
          onAction: () => {
            onSelect(rt);
            close();
          },
        }))}
      />
    </Popover>
  );
}

// ─── Single milestone card ────────────────────────────────────────────────────
function MilestoneCard({ index, rewardType, onRemove }) {
  const [targetValue, setTargetValue] = useState("");
  const [discountValue, setDiscountValue] = useState("");

  const label =
    rewardType.value === "free_product"
      ? "Free product"
      : rewardType.value === "order_discount"
      ? "Order discount"
      : "Free shipping";

  return (
    <div
      style={{
        border: "1px solid #e1e3e5",
        borderRadius: "8px",
        padding: "16px",
        background: "#fafafa",
      }}
    >
      <InlineStack align="space-between" blockAlign="center">
        <InlineStack gap="200" blockAlign="center">
          <Icon source={rewardType.icon} />
          <Text variant="bodyMd" fontWeight="semibold" as="p">
            Milestone {index + 1} — {label}
          </Text>
        </InlineStack>
        <Button variant="plain" tone="critical" onClick={onRemove}>
          Remove
        </Button>
      </InlineStack>
      <Box paddingBlockStart="300">
        <BlockStack gap="300">
          <TextField
            label="Cart value target ($)"
            type="number"
            value={targetValue}
            onChange={setTargetValue}
            autoComplete="off"
            prefix="$"
          />
          {rewardType.value === "order_discount" && (
            <TextField
              label="Discount value (%)"
              type="number"
              value={discountValue}
              onChange={setDiscountValue}
              autoComplete="off"
              suffix="%"
            />
          )}
          {rewardType.value === "free_product" && (
            <TextField
              label="Product"
              placeholder="Search products…"
              value={discountValue}
              onChange={setDiscountValue}
              autoComplete="off"
            />
          )}
        </BlockStack>
      </Box>
    </div>
  );
}

// ─── Goal content editor ──────────────────────────────────────────────────────
function GoalContentItem({ index }) {
  const [open, setOpen] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [beforeText, setBeforeText] = useState("");
  const [afterText, setAfterText] = useState("");

  return (
    <div
      style={{
        border: "1px solid #e1e3e5",
        borderRadius: "8px",
        overflow: "hidden",
        background: "#fff",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          background: "#f6f6f7",
        }}
      >
        <Text variant="bodyMd" fontWeight="semibold" as="p">
          Goal {index + 1}
        </Text>
        <Button
          variant="plain"
          icon={open ? MinimizeIcon : MaximizeIcon}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Collapse" : "Expand"}
        </Button>
      </div>
      <Collapsible open={open} id={`goal-content-${index}`}>
        <Box padding="300">
          <InlineStack align="space-between" blockAlign="center">
            <Text variant="bodyMd" as="p">
              Edit texts of goal {index + 1}
            </Text>
            <Button
              icon={EditIcon}
              onClick={() => setEditOpen((v) => !v)}
            >
              Edit
            </Button>
          </InlineStack>
          {editOpen && (
            <Box paddingBlockStart="300">
              <BlockStack gap="300">
                <TextField
                  label="Progress text (before goal)"
                  value={beforeText}
                  onChange={setBeforeText}
                  placeholder="Add ${{amount}} more for {{reward}}"
                  autoComplete="off"
                />
                <TextField
                  label="Progress text (after goal reached)"
                  value={afterText}
                  onChange={setAfterText}
                  placeholder="🎉 You unlocked {{reward}}!"
                  autoComplete="off"
                />
              </BlockStack>
            </Box>
          )}
        </Box>
      </Collapsible>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CartGoalsCreate() {
  const navigate = useNavigate();

  // Status & meta
  const [status, setStatus] = useState("draft");
  const [campaignName, setCampaignName] = useState("Cart Goal 1");
  const [isSaving, setIsSaving] = useState(false);

  // Goals & rewards
  const [trackBy, setTrackBy] = useState("cart_value");
  const [milestones, setMilestones] = useState([]);

  const handleAddGoal = (rewardType) => {
    setMilestones((prev) => [...prev, { id: Date.now(), rewardType }]);
  };
  const handleRemoveMilestone = (id) => {
    setMilestones((prev) => prev.filter((m) => m.id !== id));
  };

  // Content
  const [goalsShown, setGoalsShown] = useState(3);

  // Settings — dates
  const today = new Date().toISOString().split("T")[0];
  const nowTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const [startDate, setStartDate] = useState(today);
  const [startTime, setStartTime] = useState(nowTime);
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState("");

  // Settings — discounts
  const [discountMode, setDiscountMode] = useState("after");

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      navigate("/app/campaigns");
    }, 800);
  };

  const isPaused = status === "draft";

  return (
    <Page
      backAction={{
        content: "Campaigns",
        onAction: () => navigate("/app/campaigns"),
      }}
      title={campaignName || "New Cart Goal"}
      primaryAction={{
        content: "Save",
        loading: isSaving,
        onAction: handleSave,
      }}
      secondaryActions={[
        {
          content: status === "active" ? "Pause" : "Activate",
          onAction: () =>
            setStatus((s) => (s === "active" ? "draft" : "active")),
        },
      ]}
    >
      <style>{`
        .goals-layout { display: grid; grid-template-columns: 1fr 320px; gap: 20px; align-items: start; }
        @media (max-width: 900px) { .goals-layout { grid-template-columns: 1fr; } }
      `}</style>

      <Box paddingBlockEnd="800">
        <div className="goals-layout">
          {/* ── Left column ── */}
          <BlockStack gap="400">

            {/* Goals & rewards */}
            <SectionCard icon={TargetIcon} title="Goals & rewards">
              <BlockStack gap="400">
                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">
                    Choose what to track
                  </Text>
                  <PillToggle
                    options={[
                      { label: "Total cart value", value: "cart_value" },
                      { label: "Product quantity", value: "quantity" },
                    ]}
                    value={trackBy}
                    onChange={setTrackBy}
                  />
                </BlockStack>

                <Divider />

                <BlockStack gap="100">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">
                    Milestones
                  </Text>
                  <Text variant="bodySm" tone="subdued" as="p">
                    Setup the target value and reward for each milestone
                  </Text>
                </BlockStack>

                {milestones.length > 0 && (
                  <BlockStack gap="300">
                    {milestones.map((m, i) => (
                      <MilestoneCard
                        key={m.id}
                        index={i}
                        rewardType={m.rewardType}
                        onRemove={() => handleRemoveMilestone(m.id)}
                      />
                    ))}
                  </BlockStack>
                )}

                <AddGoalDropdown onSelect={handleAddGoal} />

                <Banner tone="info" icon={InfoIcon}>
                  <Text variant="bodySm" as="p">
                    Set your existing Shopify discounts for free product and
                    order discounts to ensure that these rewards work correctly.{" "}
                    <Button variant="plain" size="slim">
                      Learn more
                    </Button>
                  </Text>
                </Banner>
              </BlockStack>
            </SectionCard>

            {/* Content */}
            <SectionCard icon={EditIcon} title="Content">
              <BlockStack gap="400">
                <BlockStack gap="200">
                  <InlineStack gap="100" blockAlign="center">
                    <Text variant="bodyMd" fontWeight="semibold" as="p">
                      Number of goals shown at a time in the progress bar
                    </Text>
                    <div
                      style={{
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        border: "1px solid #8c9196",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "help",
                        flexShrink: 0,
                      }}
                      title="Controls how many milestones are visible on the progress bar at once"
                    >
                      <Text variant="bodySm" tone="subdued" as="span">
                        ?
                      </Text>
                    </div>
                  </InlineStack>
                  <RangeSlider
                    min={1}
                    max={5}
                    value={goalsShown}
                    onChange={(v) => setGoalsShown(v)}
                    output
                  />
                </BlockStack>

                <Divider />

                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">
                    Edit content
                  </Text>
                  {milestones.length === 0 ? (
                    <div
                      style={{
                        padding: "20px",
                        border: "1px dashed #c9cccf",
                        borderRadius: "8px",
                        textAlign: "center",
                      }}
                    >
                      <Text variant="bodySm" tone="subdued" as="p">
                        Add milestones above to edit their text content
                      </Text>
                    </div>
                  ) : (
                    <BlockStack gap="200">
                      {milestones.map((_, i) => (
                        <GoalContentItem key={i} index={i} />
                      ))}
                    </BlockStack>
                  )}
                </BlockStack>
              </BlockStack>
            </SectionCard>

            {/* Settings */}
            <SectionCard icon={SettingsIcon} title="Settings">
              <BlockStack gap="400">
                {/* Active dates */}
                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">
                    Active dates
                  </Text>
                  <Text variant="bodySm" tone="subdued" as="p">
                    Based on your browser's timezone: Asia/Calcutta
                  </Text>
                  <div
                    style={{
                      border: "1px solid #e1e3e5",
                      borderRadius: "8px",
                      padding: "16px",
                    }}
                  >
                    <BlockStack gap="300">
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "12px",
                        }}
                      >
                        <TextField
                          label="Start date"
                          type="date"
                          value={startDate}
                          onChange={setStartDate}
                          prefix={<Icon source={CalendarIcon} />}
                          autoComplete="off"
                        />
                        <TextField
                          label="Start time"
                          type="time"
                          value={startTime}
                          onChange={setStartTime}
                          prefix={<Icon source={ClockIcon} />}
                          autoComplete="off"
                        />
                      </div>
                      <Checkbox
                        label="Set end date"
                        checked={hasEndDate}
                        onChange={setHasEndDate}
                      />
                      {hasEndDate && (
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "12px",
                          }}
                        >
                          <TextField
                            label="End date"
                            type="date"
                            value={endDate}
                            onChange={setEndDate}
                            prefix={<Icon source={CalendarIcon} />}
                            autoComplete="off"
                          />
                        </div>
                      )}
                    </BlockStack>
                  </div>
                </BlockStack>

                <Divider />

                {/* Discount mode */}
                <BlockStack gap="200">
                  <InlineStack gap="100" blockAlign="center">
                    <Text variant="bodyMd" fontWeight="semibold" as="p">
                      How other discounts affect cart progress bar
                    </Text>
                    <div
                      style={{
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        border: "1px solid #8c9196",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "help",
                        flexShrink: 0,
                      }}
                      title="Choose whether the progress bar considers discounts applied to the cart"
                    >
                      <Text variant="bodySm" tone="subdued" as="span">
                        ?
                      </Text>
                    </div>
                  </InlineStack>
                  <PillToggle
                    options={[
                      {
                        label: "Use cart total after subtracting other discounts",
                        value: "after",
                      },
                      {
                        label: "Use cart total before other discounts",
                        value: "before",
                      },
                    ]}
                    value={discountMode}
                    onChange={setDiscountMode}
                  />
                </BlockStack>

                <Divider />

                {/* Audience */}
                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold" as="p">
                    Target an audience
                  </Text>
                  <div
                    style={{
                      border: "1px solid #e1e3e5",
                      borderRadius: "8px",
                      padding: "14px 16px",
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                    }}
                  >
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        background: "#ede9fe",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ color: "#7c3aed" }}>
                        <Icon source={PersonFilledIcon} />
                      </span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <Text variant="bodyMd" fontWeight="semibold" as="p">
                        Targeting everyone
                      </Text>
                      <Text variant="bodySm" tone="subdued" as="p">
                        This campaign is currently visible to all customers. To
                        show it only to a specific group, add a targeting rule.
                      </Text>
                    </div>
                    <Button>+ Add a targeting rule</Button>
                  </div>
                </BlockStack>
              </BlockStack>
            </SectionCard>
          </BlockStack>

          {/* ── Right sidebar ── */}
          <BlockStack gap="300">
            {/* Paused banner */}
            {isPaused && (
              <div
                style={{
                  background: "#fef3c7",
                  border: "1px solid #fcd34d",
                  borderRadius: "10px",
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <span style={{ color: "#92400e" }}>
                  <Icon source={PauseCircleIcon} />
                </span>
                <Text variant="bodyMd" fontWeight="semibold" as="p">
                  This campaign is paused
                </Text>
              </div>
            )}

            {/* Status + name */}
            <div
              style={{
                background: "#fff",
                border: "1px solid #e1e3e5",
                borderRadius: "10px",
                padding: "16px",
              }}
            >
              <BlockStack gap="300">
                <Select
                  label="Status"
                  options={[
                    { label: "Draft", value: "draft" },
                    { label: "Active", value: "active" },
                    { label: "Paused", value: "paused" },
                  ]}
                  value={status}
                  onChange={setStatus}
                />
                <TextField
                  label="Campaign name"
                  value={campaignName}
                  onChange={setCampaignName}
                  autoComplete="off"
                />
              </BlockStack>
            </div>

            {/* Preview */}
            <div
              style={{
                background: "#fff",
                border: "1px solid #e1e3e5",
                borderRadius: "10px",
                overflow: "hidden",
              }}
            >
              <Box
                padding="300"
                borderBlockEndWidth="025"
                borderColor="border"
              >
                <Text variant="bodyMd" fontWeight="semibold" as="p">
                  Preview
                </Text>
              </Box>
              <Box padding="300">
                <BlockStack gap="300">
                  {milestones.length === 0 ? (
                    <div
                      style={{
                        border: "1px solid #e1e3e5",
                        borderRadius: "8px",
                        padding: "24px 16px",
                        textAlign: "center",
                      }}
                    >
                      <Text variant="bodySm" tone="subdued" as="p">
                        Select a reward type
                      </Text>
                    </div>
                  ) : (
                    <div
                      style={{
                        border: "1px solid #e1e3e5",
                        borderRadius: "8px",
                        padding: "16px",
                      }}
                    >
                      <BlockStack gap="200">
                        <Text variant="bodySm" tone="subdued" as="p">
                          Add ${milestones.length > 0 ? "24" : "—"} more to get{" "}
                          {milestones[0]?.rewardType?.label ?? "reward"}
                        </Text>
                        {/* Progress bar */}
                        <div
                          style={{
                            position: "relative",
                            height: "6px",
                            background: "#e1e3e5",
                            borderRadius: "3px",
                            overflow: "visible",
                          }}
                        >
                          <div
                            style={{
                              width: "30%",
                              height: "100%",
                              background: "#202223",
                              borderRadius: "3px",
                            }}
                          />
                          {/* Milestone markers */}
                          {milestones.slice(0, 3).map((_, i, arr) => {
                            const pos = ((i + 1) / (arr.length + 1)) * 100;
                            return (
                              <div
                                key={i}
                                style={{
                                  position: "absolute",
                                  top: "50%",
                                  left: `${pos}%`,
                                  transform: "translate(-50%, -50%)",
                                  width: "12px",
                                  height: "12px",
                                  borderRadius: "50%",
                                  background: "#e1e3e5",
                                  border: "2px solid #fff",
                                  boxShadow: "0 0 0 1px #c9cccf",
                                }}
                              />
                            );
                          })}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          {milestones.slice(0, 3).map((m, i) => (
                            <Text
                              key={i}
                              variant="bodySm"
                              tone="subdued"
                              as="span"
                            >
                              {m.rewardType.label}
                            </Text>
                          ))}
                        </div>
                      </BlockStack>
                    </div>
                  )}
                  <Text variant="bodySm" tone="subdued" as="p">
                    Use this to adjust the progress bar
                  </Text>
                  {/* Dummy slider */}
                  <RangeSlider
                    min={0}
                    max={100}
                    value={30}
                    onChange={() => {}}
                  />
                </BlockStack>
              </Box>
            </div>
          </BlockStack>
        </div>
      </Box>
    </Page>
  );
}
