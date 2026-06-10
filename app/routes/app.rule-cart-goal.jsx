import { useEffect, useMemo, useState } from "react";
import {
  useActionData,
  useNavigate,
  useNavigation,
  useSearchParams,
  useSubmit,
} from "react-router";
import {
  Banner,
  BlockStack,
  Box,
  Button,
  ButtonGroup,
  Card,
  Checkbox,
  ChoiceList,
  Collapsible,
  Divider,
  Icon,
  InlineStack,
  Modal,
  Page,
  Popover,
  ActionList,
  RangeSlider,
  Select,
  Text,
  TextField,
} from "@shopify/polaris";
import {
  ArrowDownIcon,
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  DeleteIcon,
  DeliveryIcon,
  DiscountIcon,
  EditIcon,
  GiftCardIcon,
  MenuHorizontalIcon,
  MinimizeIcon,
  MaximizeIcon,
  PauseCircleIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";

const GOAL_TEXT_FIELDS = [
  {
    key: "aboveBefore",
    label: "Text above progress bar (before achieving goal)",
  },
  {
    key: "aboveAfter",
    label: "Text above progress bar (after achieving goal)",
  },
  { key: "below", label: "Text below progress bar" },
  {
    key: "offerTitleBefore",
    label: "Title shown in offer page (before achieving the goal)",
  },
  {
    key: "offerTitleAfter",
    label: "Title shown in offer page (post application CTA)",
  },
  {
    key: "offerSubtitleBefore",
    label: "Sub-Title Shown in Offer Page (before achieving the goal)",
  },
  {
    key: "offerSubtitleAfter",
    label: "Sub-Title Shown in Offer Page (after achieving the goal)",
  },
];

const REWARD_CONFIG = {
  gift: {
    type: "gift",
    title: "Free product",
    menuLabel: "Free product",
    icon: GiftCardIcon,
    goal: "450",
    previewLabel: "Free Gift!",
    texts: {
      aboveBefore: "Add {{goal}} more to get Free Gift with this order",
      aboveAfter: "Congratulations! You have unlocked Free Gift!",
      below: "Free Gift!",
      offerTitleBefore: "Free Gift",
      offerTitleAfter: "Free Gift",
      offerSubtitleBefore: "Add {{goal}} more to get Free Gift with this order",
      offerSubtitleAfter: "Congratulations! You have unlocked free Gift!",
    },
  },
  discount: {
    type: "discount",
    title: "Order Discount",
    menuLabel: "Order discount",
    icon: DiscountIcon,
    goal: "500",
    value: "20",
    discountType: "percentage",
    previewLabel: "20% Off",
    texts: {
      aboveBefore: "Add {{goal}} more to get a {{discount}} discount on this order",
      aboveAfter: "Congratulations! You have unlocked the {{discount}} discount!",
      below: "{{discount}} Off",
      offerTitleBefore: "{{discount}} Discount",
      offerTitleAfter: "{{discount}} Discount",
      offerSubtitleBefore:
        "Add {{goal}} more to get a {{discount}} discount on this order",
      offerSubtitleAfter:
        "Congratulations! You have unlocked the {{discount}} discount!",
    },
  },
  shipping: {
    type: "shipping",
    title: "Free Shipping",
    menuLabel: "Free shipping",
    icon: DeliveryIcon,
    goal: "550",
    previewLabel: "Free Shipping!",
    texts: {
      aboveBefore: "Add {{goal}} more to get Free Shipping on this order",
      aboveAfter: "Congratulations! You have unlocked Free Shipping!",
      below: "Free Shipping!",
      offerTitleBefore: "Free Shipping",
      offerTitleAfter: "Free Shipping",
      offerSubtitleBefore: "Add {{goal}} more to get free shipping on this order",
      offerSubtitleAfter: "Congratulations! You have unlocked free shipping!",
    },
  },
};

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return {};
};

export const action = async ({ request }) => {
  await authenticate.admin(request);
  await request.json().catch(() => ({}));
  return { success: true };
};

const REWARD_ID_PREFIX = {
  gift: "GIFT",
  discount: "OFF",
  shipping: "SHIP",
};

function makeRewardId(type, index) {
  const seed = `${type}-${index + 1}`;
  let hash = 0;

  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }

  return `${REWARD_ID_PREFIX[type]}${hash.toString(36).toUpperCase().slice(0, 6)}`;
}

function makeGoal(type, index, expanded = false) {
  const config = REWARD_CONFIG[type];
  return {
    ...config,
    id: makeRewardId(type, index),
    expanded,
    goal: String(Number(config.goal) + Math.floor(index / 3) * 50),
    texts: { ...config.texts },
  };
}

function SectionCard({
  icon,
  title,
  children,
  defaultOpen = true,
  open: controlledOpen,
  onOpenChange,
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = typeof controlledOpen === "boolean" ? controlledOpen : internalOpen;
  const setOpen = (nextOpen) => {
    const value =
      typeof nextOpen === "function" ? nextOpen(open) : Boolean(nextOpen);
    if (onOpenChange) {
      onOpenChange(value);
      return;
    }
    setInternalOpen(value);
  };

  return (
    <Card padding="0">
      <Box paddingBlock="400" paddingInline="500">
        <InlineStack gap="200" blockAlign="center">
          <Icon source={icon} />
          <div style={{ flex: 1 }}>
            <Text variant="headingMd" as="h2" fontWeight="semibold">
              {title}
            </Text>
          </div>
          <Button
            icon={open ? MinimizeIcon : MaximizeIcon}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "Collapse" : "Expand"}
          </Button>
        </InlineStack>
      </Box>
      {open && <Divider />}
      <Collapsible open={open} id={`cart-goal-${title}`}>
        <Box padding="500">{children}</Box>
        <Box paddingBlockEnd="400" paddingInline="500">
          <InlineStack align="end">
            <Button
              variant="plain"
              icon={MinimizeIcon}
              onClick={() => setOpen(false)}
            >
              Collapse
            </Button>
          </InlineStack>
        </Box>
      </Collapsible>
    </Card>
  );
}

function SegmentControl({ options, value, onChange }) {
  return (
    <ButtonGroup variant="segmented">
      {options.map((option) => (
        <Button
          key={option.value}
          pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </ButtonGroup>
  );
}

function GoalCard({
  goal,
  index,
  isLast,
  trackBy,
  onGoalChange,
  onToggle,
  onDelete,
}) {
  const icon = REWARD_CONFIG[goal.type].icon;
  const goalPrefix = trackBy === "quantity" ? "Qty" : "INR";

  return (
    <div className="cg-milestoneRow">
      <div className="cg-goalAmount">
        <Text variant="bodyMd" as="p" fontWeight="semibold">
          {index + 1}
          {index === 0 ? "st" : index === 1 ? "nd" : "rd"} goal
        </Text>
        <div className="cg-goalInput">
          <TextField
            label="Goal amount"
            labelHidden
            prefix={goalPrefix}
            value={goal.goal}
            onChange={(value) => onGoalChange(index, { goal: value })}
            autoComplete="off"
          />
        </div>
        {!isLast && (
          <span
            className={`cg-goalArrow ${
              goal.expanded ? "cg-goalArrow--expanded" : ""
            }`}
            aria-hidden="true"
          >
            <Icon source={ArrowDownIcon} />
          </span>
        )}
      </div>

      <div className="cg-roundedSurface">
        <Card padding="0">
          <div
            className="cg-rewardHeader"
            role="button"
            tabIndex={0}
            onClick={() => onToggle(index)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onToggle(index);
              }
            }}
          >
            <InlineStack gap="300" blockAlign="center">
              <span className="cg-rewardIcon">
                <Icon source={icon} />
              </span>
              <BlockStack gap="0">
                <Text variant="bodyMd" as="p" fontWeight="semibold">
                  {goal.title}
                </Text>
                <Text variant="bodySm" as="p" tone="subdued">
                  ID: {goal.id}
                </Text>
              </BlockStack>
            </InlineStack>
            <InlineStack gap="200" blockAlign="center">
              {goal.expanded ? (
                <Button
                  variant="plain"
                  icon={CheckIcon}
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggle(index);
                  }}
                >
                  Done
                </Button>
              ) : (
                <Button
                  icon={EditIcon}
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggle(index);
                  }}
                >
                  Edit
                </Button>
              )}
              <Button
                icon={DeleteIcon}
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(index);
                }}
              />
              <Button
                variant="plain"
                icon={MenuHorizontalIcon}
                onClick={(event) => event.stopPropagation()}
              />
              <span className="cg-cardChevron" aria-hidden="true">
                <Icon source={ChevronUpIcon} />
              </span>
              <Button
                variant="plain"
                icon={ChevronDownIcon}
                onClick={(event) => {
                  event.stopPropagation();
                  onToggle(index);
                }}
                accessibilityLabel={
                  goal.expanded ? "Collapse goal" : "Expand goal"
                }
              />
            </InlineStack>
          </div>

          {goal.expanded && (
            <>
              <Divider />
              <Box padding="500">
                {goal.type === "gift" && (
                  <BlockStack gap="300">
                    <Text variant="bodyMd" as="p" fontWeight="semibold">
                      Select products to give as free gifts
                    </Text>
                    <Button variant="primary" icon={PlusIcon}>
                      Add a product
                    </Button>
                    <Text variant="bodyMd" as="p" fontWeight="semibold">
                      How many gifts can they choose from this list?
                    </Text>
                    <div className="cg-stepper">
                      <Button>-</Button>
                      <Text as="span" variant="bodyMd" fontWeight="semibold">
                        1
                      </Text>
                      <Button>+</Button>
                    </div>
                  </BlockStack>
                )}

                {goal.type === "discount" && (
                  <BlockStack gap="300">
                    <Text variant="bodyMd" as="p" fontWeight="semibold">
                      Type of order discount
                    </Text>
                    <ChoiceList
                      title="Type of order discount"
                      titleHidden
                      choices={[
                        { label: "Percentage off", value: "percentage" },
                        { label: "Amount off", value: "amount" },
                      ]}
                      selected={[goal.discountType]}
                      onChange={([discountType]) =>
                        onGoalChange(index, { discountType })
                      }
                    />
                    <TextField
                      label="Enter the value"
                      value={goal.value}
                      onChange={(value) => onGoalChange(index, { value })}
                      suffix={goal.discountType === "percentage" ? "%" : undefined}
                      prefix={goal.discountType === "amount" ? "INR" : undefined}
                      autoComplete="off"
                    />
                  </BlockStack>
                )}

                {goal.type === "shipping" && (
                  <BlockStack gap="200">
                    <Text variant="bodyMd" as="p">
                      First you will need to setup a matching shipping rule in
                      Shopify admin. This will not be created automatically by
                      CornerCart.
                    </Text>
                    <Button variant="plain">Click here to learn how</Button>
                  </BlockStack>
                )}
              </Box>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function PreviewPanel({
  enabled,
  onEnabledChange,
  campaignName,
  onCampaignNameChange,
  goals,
  trackBy,
  sliderValue,
  onSliderChange,
}) {
  const activeGoals = goals.slice(0, 3);
  const firstGoal = activeGoals[0];
  const maxGoal = Math.max(...activeGoals.map((goal) => Number(goal.goal || 0)), 1);
  const cartValue = (maxGoal * sliderValue) / 100;
  const nextGoal =
    activeGoals.find((goal) => cartValue < Number(goal.goal || 0)) ||
    activeGoals[activeGoals.length - 1];
  const remaining = Math.max(0, Number(nextGoal?.goal || 0) - cartValue).toFixed(0);
  const goalToken = trackBy === "quantity" ? remaining : `${remaining} INR`;
  const message = nextGoal
    ? nextGoal.texts.aboveBefore
        .replace("{{goal}}", goalToken)
        .replace("{{discount}}", `${nextGoal.value || 20}%`)
    : "Select a reward type";

  return (
    <BlockStack gap="300">
      {!enabled && (
        <div className="cg-paused">
          <Icon source={PauseCircleIcon} />
          <Text variant="bodyMd" as="p" fontWeight="semibold">
            This campaign is paused
          </Text>
        </div>
      )}

      <Card>
        <BlockStack gap="300">
          <Select
            label="Status"
            value={enabled ? "active" : "draft"}
            onChange={(value) => onEnabledChange(value === "active")}
            options={[
              { label: "Active", value: "active" },
              { label: "Draft", value: "draft" },
            ]}
          />
          <TextField
            label="Campaign name"
            value={campaignName}
            onChange={onCampaignNameChange}
            autoComplete="off"
          />
        </BlockStack>
      </Card>

      <div className="cg-roundedSurface">
        <Card padding="0">
          <Box padding="400">
            <Text variant="headingSm" as="h3" fontWeight="semibold">
              Preview
            </Text>
          </Box>
          <Divider />
          <div className="cg-previewCanvas">
            <Text variant="bodySm" as="p" fontWeight="semibold" alignment="center">
              {nextGoal ? message : "Select a reward type"}
            </Text>
            {nextGoal && (
              <div className="cg-progressWrap">
                <div className="cg-previewTrack">
                  <div
                    className="cg-previewFill"
                    style={{ width: `${Math.min(100, sliderValue)}%` }}
                  />
                </div>
                {activeGoals.map((goal, index) => {
                  const left = `${((index + 0.5) / activeGoals.length) * 100}%`;
                  return (
                    <div
                      className="cg-previewMilestone"
                      style={{ left }}
                      key={`${goal.id}-${index}`}
                    >
                      <span className="cg-previewMarker">
                        <Icon source={REWARD_CONFIG[goal.type].icon} />
                      </span>
                      <span>{goal.previewLabel}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <Box padding="500">
            <RangeSlider
              label="Use this to adjust the progress bar"
              value={sliderValue}
              min={0}
              max={100}
              onChange={onSliderChange}
            />
          </Box>
        </Card>
      </div>
    </BlockStack>
  );
}

function ContentSection({
  goals,
  shownGoals,
  onShownGoalsChange,
  onEditGoal,
  open,
  onOpenChange,
}) {
  const [openGoal, setOpenGoal] = useState(Math.min(2, goals.length - 1));

  return (
    <SectionCard
      icon={EditIcon}
      title="Content"
      open={open}
      onOpenChange={onOpenChange}
    >
      <BlockStack gap="400">
        <BlockStack gap="200">
          <Text variant="bodyMd" as="p" fontWeight="semibold">
            Number of goals shown at a time in the progress bar
          </Text>
          <RangeSlider
            label="Number of goals shown at a time in the progress bar"
            labelHidden
            value={shownGoals}
            min={1}
            max={3}
            step={1}
            onChange={onShownGoalsChange}
          />
        </BlockStack>

        <Text variant="bodyMd" as="p" fontWeight="semibold">
          Edit content
        </Text>
        <Card padding="0">
          {goals.map((goal, index) => (
            <div className="cg-contentItem" key={`${goal.type}-${index}`}>
              <div className="cg-contentItemHeader">
                <Text variant="headingSm" as="h3" fontWeight="semibold">
                  Goal {index + 1}
                </Text>
                <Button
                  icon={openGoal === index ? MinimizeIcon : MaximizeIcon}
                  onClick={() => setOpenGoal(openGoal === index ? -1 : index)}
                >
                  {openGoal === index ? "Collapse" : "Expand"}
                </Button>
              </div>
              {openGoal === index && (
                <div className="cg-contentItemBody">
                  <Text variant="bodyMd" as="p" fontWeight="semibold">
                    Edit texts of goal {index + 1}
                  </Text>
                  <Button icon={EditIcon} onClick={() => onEditGoal(index)}>
                    Edit
                  </Button>
                </div>
              )}
            </div>
          ))}
        </Card>
      </BlockStack>
    </SectionCard>
  );
}

function TextEditModal({ goal, index, onClose, onChange }) {
  if (!goal) return null;

  return (
    <Modal
      open
      onClose={onClose}
      title={`Edit texts of Goal ${index + 1}`}
      primaryAction={{ content: "Done", onAction: onClose }}
    >
      <Modal.Section>
        <div className="cg-modalFields">
          {GOAL_TEXT_FIELDS.map((field) => (
            <div className="cg-tokenField" key={field.key}>
              <TextField
                label={field.label}
                value={goal.texts[field.key]}
                onChange={(value) => onChange(index, field.key, value)}
                autoComplete="off"
              />
              <Button accessibilityLabel="Insert variable">
                {"{}"}
              </Button>
            </div>
          ))}
        </div>
      </Modal.Section>
    </Modal>
  );
}

function SettingsSection({ open, onOpenChange }) {
  const today = new Date();
  const dateValue = today.toISOString().slice(0, 10);
  const timeValue = today.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const [endDate, setEndDate] = useState(false);
  const [targetMenuOpen, setTargetMenuOpen] = useState(false);

  return (
    <SectionCard
      icon={SettingsIcon}
      title="Settings"
      open={open}
      onOpenChange={onOpenChange}
    >
      <BlockStack gap="500">
        <BlockStack gap="200">
          <Text variant="bodyMd" as="p" fontWeight="semibold">
            Active dates
          </Text>
          <Text variant="bodyMd" as="p" tone="subdued">
            Based on your browser's timezone: Asia/Calcutta
          </Text>
          <Card>
            <BlockStack gap="300">
              <InlineStack gap="300" wrap={false}>
                <div style={{ flex: 1 }}>
                  <TextField
                    label="Start date"
                    value={dateValue}
                    prefix={<Icon source={CalendarIcon} />}
                    autoComplete="off"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <TextField
                    label="Start time"
                    value={timeValue}
                    prefix={<Icon source={ClockIcon} />}
                    autoComplete="off"
                  />
                </div>
              </InlineStack>
              <Checkbox label="Set end date" checked={endDate} onChange={setEndDate} />
            </BlockStack>
          </Card>
        </BlockStack>

        <BlockStack gap="200">
          <Text variant="bodyMd" as="p" fontWeight="semibold">
            Showcase free gifts in cart below item list
          </Text>
          <SegmentControl
            value="hide"
            onChange={() => {}}
            options={[
              { label: "Show", value: "show" },
              { label: "Hide", value: "hide" },
            ]}
          />
        </BlockStack>

        <BlockStack gap="200">
          <Text variant="bodyMd" as="p" fontWeight="semibold">
            How other discounts affect cart progress bar
          </Text>
          <SegmentControl
            value="after"
            onChange={() => {}}
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
          />
        </BlockStack>

        <BlockStack gap="200">
          <Text variant="bodyMd" as="p" fontWeight="semibold">
            Is reward selection mandatory?
          </Text>
          <SegmentControl
            value="yes"
            onChange={() => {}}
            options={[
              { label: "Yes", value: "yes" },
              { label: "No", value: "no" },
            ]}
          />
        </BlockStack>

        <BlockStack gap="200">
          <Text variant="bodyMd" as="p" fontWeight="semibold">
            Target an audience
          </Text>
          <div className="cg-targetBox">
            <div className="cg-targetIcon">+</div>
            <BlockStack gap="100">
              <Text variant="bodyMd" as="p" fontWeight="semibold">
                Targeting everyone
              </Text>
              <Text variant="bodyMd" as="p" tone="subdued">
                This campaign is currently visible to all customers. To show it
                only to a specific group, add a targeting rule.
              </Text>
            </BlockStack>
            <Popover
              active={targetMenuOpen}
              activator={
                <Button icon={PlusIcon} onClick={() => setTargetMenuOpen(true)}>
                  Add a targeting rule
                </Button>
              }
              autofocusTarget="first-node"
              onClose={() => setTargetMenuOpen(false)}
            >
              <Box padding="300" minWidth="300px">
                <BlockStack gap="300">
                  <TextField
                    label="Search actions"
                    labelHidden
                    placeholder="Search actions"
                    prefix={<Icon source={SearchIcon} />}
                    autoComplete="off"
                  />
                  <ActionList
                    sections={[
                      {
                        title: "User Session",
                        items: ["Country", "User Session count", "Logged-in status", "Device OS", "Market", "Locale/Language"].map((content) => ({ content })),
                      },
                      {
                        title: "Logged in visitor data",
                        items: ["Customer tags", "Order count", "Total spent", "First name", "Last name", "Customer ID"].map((content) => ({
                          content,
                          helpText: "Works only if logged in",
                        })),
                      },
                      {
                        title: "UTM Tags",
                        items: ["UTM Campaign", "UTM Source", "UTM Medium"].map((content) => ({ content })),
                      },
                    ]}
                  />
                </BlockStack>
              </Box>
            </Popover>
          </div>
        </BlockStack>
      </BlockStack>
    </SectionCard>
  );
}

export default function RuleCartGoal() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const host = searchParams.get("host");
  const actionData = useActionData();
  const navigation = useNavigation();
  const submit = useSubmit();
  const withHost = (path) => (host ? `${path}?host=${encodeURIComponent(host)}` : path);

  const [enabled, setEnabled] = useState(false);
  const [campaignName, setCampaignName] = useState("Cart Goal 12");
  const [trackBy, setTrackBy] = useState("quantity");
  const [goals, setGoals] = useState([
    makeGoal("gift", 0),
    makeGoal("discount", 1),
    makeGoal("shipping", 2),
  ]);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [sliderValue, setSliderValue] = useState(0);
  const [shownGoals, setShownGoals] = useState(3);
  const [editingTextIndex, setEditingTextIndex] = useState(null);
  const [openSection, setOpenSection] = useState("goals");

  const isSaving = navigation.state === "submitting";

  useEffect(() => {
    if (actionData?.success && navigation.state === "idle") {
      navigate(withHost("/app/campaigns"));
    }
  }, [actionData, navigation.state]);

  const sortedGoals = useMemo(
    () => [...goals].sort((a, b) => Number(a.goal || 0) - Number(b.goal || 0)),
    [goals]
  );

  const addGoal = (type) => {
    setGoals((current) => [
      ...current.map((goal) => ({ ...goal, expanded: false })),
      makeGoal(type, current.length, true),
    ]);
    setAddMenuOpen(false);
  };

  const patchGoal = (index, patch) => {
    setGoals((current) =>
      current.map((goal, goalIndex) =>
        goalIndex === index ? { ...goal, ...patch } : goal
      )
    );
  };

  const toggleGoal = (index) => {
    setGoals((current) => {
      const isOpening = !current[index]?.expanded;
      return current.map((goal, goalIndex) => ({
        ...goal,
        expanded: isOpening && goalIndex === index,
      }));
    });
  };

  const patchGoalText = (index, field, value) => {
    setGoals((current) =>
      current.map((goal, goalIndex) =>
        goalIndex === index
          ? { ...goal, texts: { ...goal.texts, [field]: value } }
          : goal
      )
    );
  };

  const handleSave = () => {
    submit(
      {
        campaignName,
        enabled,
        trackBy,
        goals: sortedGoals,
        shownGoals,
      },
      { method: "post", encType: "application/json" }
    );
  };

  return (
    <Page
      backAction={{
        content: "Campaigns",
        onAction: () => navigate(withHost("/app/campaigns")),
      }}
      title={campaignName || "Cart Goal"}
      primaryAction={{ content: "Save", loading: isSaving, onAction: handleSave }}
      secondaryActions={[
        {
          content: enabled ? "Pause" : "Activate",
          onAction: () => setEnabled((value) => !value),
        },
      ]}
    >
      <style>{`
        .cg-layout {
          display: grid;
          grid-template-columns: minmax(0, 7fr) minmax(320px, 3fr);
          gap: 20px;
          align-items: start;
        }
        .cg-info {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          background: #e5f2ff;
          color: #00527c;
          border-radius: 12px;
          padding: 14px 16px;
        }
        .cg-roundedSurface {
          border-radius: 14px;
          overflow: hidden;
        }
        .cg-roundedSurface > .Polaris-ShadowBevel {
          border-radius: 14px;
        }
        .cg-milestoneList {
          display: grid;
          gap: 28px;
        }
        .cg-milestoneRow {
          display: grid;
          grid-template-columns: 184px minmax(0, 1fr);
          gap: 24px;
          align-items: start;
        }
        .cg-goalAmount {
          min-width: 0;
          padding-left: 10px;
        }
        .cg-goalInput {
          width: 168px;
          max-width: 100%;
          margin-top: 8px;
        }
        .cg-goalArrow {
          display: flex;
          width: 168px;
          height: 32px;
          align-items: center;
          justify-content: center;
          color: #b5b5b5;
          margin-top: 8px;
          transition: height 0.12s ease;
        }
        .cg-goalArrow .Polaris-Icon {
          width: 22px;
          height: 22px;
        }
        .cg-goalArrow--expanded {
          height: 190px;
          align-items: flex-end;
          position: relative;
          padding-bottom: 6px;
        }
        .cg-goalArrow--expanded::before {
          content: "";
          position: absolute;
          top: 0;
          bottom: 18px;
          left: 50%;
          border-left: 1px solid #c9cccf;
          transform: translateX(-50%);
        }
        .cg-rewardHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          min-height: 74px;
          padding: 14px 16px;
          cursor: pointer;
          user-select: none;
        }
        .cg-rewardHeader:focus-visible {
          outline: 2px solid #005bd3;
          outline-offset: -2px;
        }
        .cg-rewardIcon {
          width: 24px;
          color: #444;
        }
        .cg-stepper {
          display: inline-grid;
          grid-template-columns: 44px 64px 44px;
          align-items: center;
          gap: 8px;
          background: #f1f1f1;
          border-radius: 10px;
          padding: 6px;
          width: max-content;
          text-align: center;
        }
        .cg-cardChevron {
          display: inline-flex;
          width: 20px;
          height: 20px;
          align-items: center;
          justify-content: center;
          color: #8c9196;
        }
        .cg-cardChevron .Polaris-Icon {
          width: 16px;
          height: 16px;
        }
        .cg-paused {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #fff8db;
          border: 1px solid #f2d94e;
          border-bottom: 2px solid #f2d94e;
          border-radius: 14px;
          color: #6a4c00;
          padding: 12px 18px;
        }
        .cg-previewCanvas {
          background: #f7f7f7;
          min-height: 156px;
          padding: 18px 20px 34px;
          border-bottom: 1px solid #e1e3e5;
        }
        .cg-progressWrap {
          position: relative;
          margin-top: 18px;
          padding: 0 12px 68px;
        }
        .cg-previewTrack {
          height: 6px;
          background: #e1e3e5;
          border-radius: 999px;
          overflow: hidden;
        }
        .cg-previewFill {
          height: 100%;
          background: #303030;
          border-radius: 999px;
        }
        .cg-previewMilestone {
          position: absolute;
          top: -10px;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          min-width: 92px;
          font-size: 13px;
          line-height: 15px;
          text-align: center;
          color: #444;
          font-weight: 650;
        }
        .cg-previewMarker {
          width: 20px;
          height: 20px;
          border-radius: 999px;
          background: #303030;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .cg-contentItem + .cg-contentItem {
          border-top: 1px solid #e1e3e5;
        }
        .cg-contentItemHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px;
        }
        .cg-contentItemBody {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f6f6f6;
          padding: 14px 22px;
        }
        .cg-modalFields {
          display: grid;
          gap: 20px;
          max-height: 660px;
          overflow: auto;
          padding-right: 8px;
        }
        .cg-tokenField {
          position: relative;
        }
        .cg-tokenField .Polaris-Button {
          position: absolute;
          right: 0;
          top: 0;
        }
        .cg-targetBox {
          display: grid;
          grid-template-columns: 48px minmax(0, 1fr) auto;
          gap: 16px;
          align-items: center;
          border: 1px solid #e1e3e5;
          border-radius: 12px;
          padding: 18px;
        }
        .cg-targetIcon {
          width: 44px;
          height: 44px;
          border-radius: 999px;
          background: #efe3ff;
          color: #7a36ff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
        }
        @media (max-width: 1050px) {
          .cg-layout {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 700px) {
          .cg-rewardHeader,
          .cg-contentItemHeader,
          .cg-contentItemBody {
            align-items: flex-start;
            flex-direction: column;
          }
          .cg-milestoneRow,
          .cg-targetBox {
            grid-template-columns: 1fr;
          }
          .cg-goalInput {
            width: 100%;
            max-width: 168px;
          }
          .cg-goalArrow {
            width: 100%;
            max-width: 168px;
          }
        }
      `}</style>

      <Box paddingBlockEnd="800">
        <div className="cg-layout">
          <BlockStack gap="400">
            {actionData?.error && (
              <Banner tone="critical" title="Save failed">
                {actionData.error}
              </Banner>
            )}

            <SectionCard
              icon={GiftCardIcon}
              title="Goals & rewards"
              open={openSection === "goals"}
              onOpenChange={(open) => setOpenSection(open ? "goals" : null)}
            >
              <BlockStack gap="500">
                <BlockStack gap="200">
                  <Text variant="bodyMd" as="p" fontWeight="semibold">
                    Choose what to track
                  </Text>
                  <SegmentControl
                    value={trackBy}
                    onChange={setTrackBy}
                    options={[
                      { label: "Total cart value", value: "value" },
                      { label: "Product quantity", value: "quantity" },
                    ]}
                  />
                </BlockStack>

                <BlockStack gap="100">
                  <Text variant="headingSm" as="h3" fontWeight="semibold">
                    Milestones
                  </Text>
                  <Text variant="bodyMd" as="p" tone="subdued">
                    Setup the target value and reward for each milestone
                  </Text>
                </BlockStack>

                {sortedGoals.length > 0 && (
                  <div className="cg-milestoneList">
                    {goals.map((goal, index) => (
                      <GoalCard
                        key={`${goal.type}-${index}`}
                        goal={goal}
                        index={index}
                        isLast={index === goals.length - 1}
                        trackBy={trackBy}
                        onGoalChange={patchGoal}
                        onToggle={toggleGoal}
                        onDelete={(goalIndex) =>
                          setGoals((current) =>
                            current.filter((_, currentIndex) => currentIndex !== goalIndex)
                          )
                        }
                      />
                    ))}
                  </div>
                )}

                <InlineStack align="center">
                  <Popover
                    active={addMenuOpen}
                    activator={
                      <Button
                        icon={PlusIcon}
                        onClick={() => setAddMenuOpen((value) => !value)}
                      >
                        Add a new goal
                      </Button>
                    }
                    autofocusTarget="first-node"
                    onClose={() => setAddMenuOpen(false)}
                  >
                    <ActionList
                      items={Object.values(REWARD_CONFIG).map((reward) => ({
                        content: reward.menuLabel,
                        icon: reward.icon,
                        onAction: () => addGoal(reward.type),
                      }))}
                    />
                  </Popover>
                </InlineStack>

                <Banner tone="info">
                  Set your existing Shopify discounts to combine with product and
                  order discounts to ensure that these rewards work well together.
                  <strong> Learn more</strong>
                </Banner>
              </BlockStack>
            </SectionCard>

            <ContentSection
              goals={goals}
              shownGoals={shownGoals}
              onShownGoalsChange={setShownGoals}
              onEditGoal={setEditingTextIndex}
              open={openSection === "content"}
              onOpenChange={(open) => setOpenSection(open ? "content" : null)}
            />

            <SettingsSection
              open={openSection === "settings"}
              onOpenChange={(open) => setOpenSection(open ? "settings" : null)}
            />
          </BlockStack>

          <PreviewPanel
            enabled={enabled}
            onEnabledChange={setEnabled}
            campaignName={campaignName}
            onCampaignNameChange={setCampaignName}
            goals={sortedGoals.slice(0, shownGoals)}
            trackBy={trackBy}
            sliderValue={sliderValue}
            onSliderChange={setSliderValue}
          />
        </div>
      </Box>

      <TextEditModal
        goal={editingTextIndex === null ? null : goals[editingTextIndex]}
        index={editingTextIndex || 0}
        onClose={() => setEditingTextIndex(null)}
        onChange={patchGoalText}
      />
    </Page>
  );
}
