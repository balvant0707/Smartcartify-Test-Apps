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
  Checkbox,
  Collapsible,
  Icon,
  InlineStack,
  Modal,
  Page,
  Select,
  Text,
  TextField,
} from "@shopify/polaris";
import {
  CalendarIcon,
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
    id: "GIFT38YKXT",
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
    id: "OFF38KPSM",
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
    id: "SHIP38BDQN",
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

function makeGoal(type, index) {
  const config = REWARD_CONFIG[type];
  return {
    ...config,
    expanded: true,
    goal: String(Number(config.goal) + Math.floor(index / 3) * 50),
    texts: { ...config.texts },
  };
}

function SectionCard({ icon, title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="cg-card">
      <div className="cg-cardHeader">
        <InlineStack gap="200" blockAlign="center">
          <Icon source={icon} />
          <Text variant="headingMd" as="h2" fontWeight="semibold">
            {title}
          </Text>
        </InlineStack>
        <Button
          icon={open ? MinimizeIcon : MaximizeIcon}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Collapse" : "Expand"}
        </Button>
      </div>
      <Collapsible open={open} id={`cart-goal-${title}`}>
        <div className="cg-cardBody">{children}</div>
        <div className="cg-cardFooter">
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

function SegmentControl({ options, value, onChange }) {
  return (
    <div className="cg-segment">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={value === option.value ? "is-active" : ""}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function GoalCard({ goal, index, isLast, onGoalChange, onToggle, onDelete }) {
  const icon = REWARD_CONFIG[goal.type].icon;

  return (
    <div className="cg-milestoneRow">
      <div className="cg-goalAmount">
        <Text variant="bodyMd" as="p" fontWeight="semibold">
          {index + 1}
          {index === 0 ? "st" : index === 1 ? "nd" : "rd"} goal
        </Text>
        <TextField
          label="Goal amount"
          labelHidden
          prefix="INR"
          value={goal.goal}
          onChange={(value) => onGoalChange(index, { goal: value })}
          autoComplete="off"
        />
        {!isLast && <div className="cg-downArrow">v</div>}
      </div>

      <div className="cg-rewardCard">
        <div className="cg-rewardHeader">
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
              <Button variant="plain" onClick={() => onToggle(index)}>
                Done
              </Button>
            ) : (
              <Button icon={EditIcon} onClick={() => onToggle(index)}>
                Edit
              </Button>
            )}
            <Button icon={DeleteIcon} onClick={() => onDelete(index)} />
            <Button variant="plain" icon={MenuHorizontalIcon} />
            <button
              type="button"
              className="cg-iconOnly"
              onClick={() => onToggle(index)}
              aria-label={goal.expanded ? "Collapse goal" : "Expand goal"}
            >
              {goal.expanded ? "^" : "v"}
            </button>
          </InlineStack>
        </div>

        {goal.expanded && (
          <div className="cg-rewardBody">
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
                <SegmentControl
                  value={goal.discountType}
                  onChange={(discountType) => onGoalChange(index, { discountType })}
                  options={[
                    { label: "Percentage off", value: "percentage" },
                    { label: "Amount off", value: "amount" },
                  ]}
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
                  First you will need to setup a matching shipping rule in Shopify
                  admin. This will not be created automatically by CornerCart.
                </Text>
                <Button variant="plain">Click here to learn how</Button>
              </BlockStack>
            )}
          </div>
        )}
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
  const message = nextGoal
    ? nextGoal.texts.aboveBefore
        .replace("{{goal}}", `${remaining} INR`)
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

      <div className="cg-sideCard">
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
      </div>

      <div className="cg-previewCard">
        <div className="cg-previewHeader">
          <Text variant="headingSm" as="h3" fontWeight="semibold">
            Preview
          </Text>
        </div>
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
              {activeGoals.map((goal) => {
                const left = `${Math.min(100, (Number(goal.goal || 0) / maxGoal) * 100)}%`;
                return (
                  <div className="cg-previewMilestone" style={{ left }} key={goal.id}>
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
        <div className="cg-previewSlider">
          <Text variant="bodyLg" as="p">
            Use this to adjust the progress bar
          </Text>
          <input
            type="range"
            min="0"
            max="100"
            value={sliderValue}
            onChange={(event) => onSliderChange(Number(event.target.value))}
          />
        </div>
      </div>
    </BlockStack>
  );
}

function ContentSection({ goals, shownGoals, onShownGoalsChange, onEditGoal }) {
  const [openGoal, setOpenGoal] = useState(Math.min(2, goals.length - 1));

  return (
    <SectionCard icon={EditIcon} title="Content" defaultOpen>
      <BlockStack gap="400">
        <BlockStack gap="200">
          <Text variant="bodyMd" as="p" fontWeight="semibold">
            Number of goals shown at a time in the progress bar
          </Text>
          <input
            className="cg-contentRange"
            type="range"
            min="1"
            max="3"
            value={shownGoals}
            onChange={(event) => onShownGoalsChange(Number(event.target.value))}
          />
        </BlockStack>

        <Text variant="bodyMd" as="p" fontWeight="semibold">
          Edit content
        </Text>
        <div className="cg-contentList">
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
        </div>
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
              <button type="button" aria-label="Insert variable">
                {"{}"}
              </button>
            </div>
          ))}
        </div>
      </Modal.Section>
    </Modal>
  );
}

function SettingsSection() {
  const today = new Date();
  const dateValue = today.toISOString().slice(0, 10);
  const timeValue = today.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const [endDate, setEndDate] = useState(false);
  const [targetMenuOpen, setTargetMenuOpen] = useState(false);

  return (
    <SectionCard icon={SettingsIcon} title="Settings" defaultOpen>
      <BlockStack gap="500">
        <BlockStack gap="200">
          <Text variant="bodyMd" as="p" fontWeight="semibold">
            Active dates
          </Text>
          <Text variant="bodyMd" as="p" tone="subdued">
            Based on your browser's timezone: Asia/Calcutta
          </Text>
          <div className="cg-dateBox">
            <TextField
              label="Start date"
              value={dateValue}
              prefix={<Icon source={CalendarIcon} />}
              autoComplete="off"
            />
            <TextField
              label="Start time"
              value={timeValue}
              prefix={<Icon source={ClockIcon} />}
              autoComplete="off"
            />
            <div className="cg-fullRow">
              <Checkbox label="Set end date" checked={endDate} onChange={setEndDate} />
            </div>
          </div>
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
            <div className="cg-targetAction">
              <Button icon={PlusIcon} onClick={() => setTargetMenuOpen(true)}>
                Add a targeting rule
              </Button>
              {targetMenuOpen && (
                <div className="cg-targetMenu">
                  <div className="cg-searchRow">
                    <Icon source={SearchIcon} />
                    <span>Search actions</span>
                  </div>
                  <Text variant="bodyMd" as="p" fontWeight="semibold">
                    User Session
                  </Text>
                  {["Country", "User Session count", "Logged-in status", "Device OS", "Market", "Locale/Language"].map((item) => (
                    <button type="button" key={item}>
                      {item}
                    </button>
                  ))}
                  <Text variant="bodyMd" as="p" fontWeight="semibold">
                    Logged in visitor data
                  </Text>
                  {["Customer tags", "Order count", "Total spent", "First name", "Last name", "Customer ID"].map((item) => (
                    <button type="button" key={item}>
                      {item}
                      <small>Works only if logged in</small>
                    </button>
                  ))}
                  <Text variant="bodyMd" as="p" fontWeight="semibold">
                    UTM Tags
                  </Text>
                  {["UTM Campaign", "UTM Source", "UTM Medium"].map((item) => (
                    <button type="button" key={item}>
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>
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
  const [campaignName, setCampaignName] = useState("Cart Goal 10");
  const [trackBy, setTrackBy] = useState("value");
  const [goals, setGoals] = useState([]);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [sliderValue, setSliderValue] = useState(0);
  const [shownGoals, setShownGoals] = useState(3);
  const [editingTextIndex, setEditingTextIndex] = useState(null);

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
    setGoals((current) => [...current, makeGoal(type, current.length)]);
    setAddMenuOpen(false);
  };

  const patchGoal = (index, patch) => {
    setGoals((current) =>
      current.map((goal, goalIndex) =>
        goalIndex === index ? { ...goal, ...patch } : goal
      )
    );
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
        .cg-layout{display:grid;grid-template-columns:minmax(0,1fr) 390px;gap:20px;align-items:start}.cg-card,.cg-sideCard,.cg-previewCard{background:#fff;border:1px solid #e1e3e5;border-radius:12px;box-shadow:0 1px 2px rgba(0,0,0,.06);overflow:hidden}.cg-cardHeader{display:flex;align-items:center;justify-content:space-between;padding:18px 28px 14px;border-bottom:1px solid #e8e8e8}.cg-cardBody{padding:26px 28px}.cg-cardFooter{display:flex;justify-content:flex-end;padding:8px 18px 16px}.cg-segment{display:inline-flex;background:#f0f0f0;border-radius:8px;padding:4px;max-width:100%;overflow:auto}.cg-segment button{border:0;background:transparent;border-radius:7px;padding:8px 12px;font-weight:600;color:#6d7175;white-space:nowrap;cursor:pointer}.cg-segment button.is-active{background:#fff;color:#303030;box-shadow:0 2px 6px rgba(0,0,0,.14)}.cg-addGoalWrap{position:relative;display:flex;justify-content:center}.cg-addGoal{width:70%;border:0;border-radius:8px;background:#e9e9e9;color:#444;padding:10px 18px;font-weight:650;cursor:pointer}.cg-addMenu{position:absolute;top:44px;z-index:20;background:#fff;border:1px solid #dfe3e8;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,.18);padding:10px;min-width:180px}.cg-addMenu button{display:flex;align-items:center;gap:10px;width:100%;border:0;background:#fff;border-radius:8px;padding:10px 8px;font-weight:600;color:#444;cursor:pointer}.cg-addMenu button:hover{background:#f6f6f7}.cg-info{display:flex;align-items:flex-start;gap:12px;background:#e5f2ff;color:#00527c;border-radius:8px;padding:14px 16px}.cg-milestoneList{display:grid;gap:16px}.cg-milestoneRow{display:grid;grid-template-columns:180px minmax(0,1fr);gap:12px}.cg-goalAmount{padding-left:10px}.cg-downArrow{text-align:center;color:#b5b5b5;font-size:24px;line-height:32px}.cg-rewardCard{border:2px solid #e2e2e2;border-radius:10px;overflow:hidden;background:#fff}.cg-rewardHeader{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 14px 12px}.cg-rewardIcon{width:24px;color:#444}.cg-rewardBody{border-top:2px solid #e8e8e8;padding:20px 22px}.cg-stepper{display:inline-grid;grid-template-columns:44px 64px 44px;align-items:center;gap:8px;background:#f1f1f1;border-radius:8px;padding:6px;width:max-content;text-align:center}.cg-iconOnly{border:0;background:transparent;color:#8c9196;cursor:pointer;font-weight:700}.cg-paused{display:flex;align-items:center;gap:10px;background:#fff8db;border:1px solid #f2d94e;border-bottom:2px solid #f2d94e;border-radius:12px 12px 0 0;color:#6a4c00;padding:12px 18px}.cg-sideCard{padding:18px}.cg-previewHeader{padding:18px;border-bottom:1px solid #e1e3e5}.cg-previewCanvas{background:#f7f7f7;min-height:140px;padding:18px 20px 28px;border-bottom:1px solid #e1e3e5}.cg-progressWrap{position:relative;margin-top:14px;padding:0 0 54px}.cg-previewTrack{height:6px;background:#e1e3e5;border-radius:999px;overflow:hidden}.cg-previewFill{height:100%;background:#303030;border-radius:999px}.cg-previewMilestone{position:absolute;top:-8px;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:4px;font-size:13px;line-height:15px;text-align:center;color:#444;min-width:76px}.cg-previewMarker{width:20px;height:20px;border-radius:999px;background:#303030;color:#fff;display:flex;align-items:center;justify-content:center}.cg-previewSlider{padding:20px}.cg-previewSlider input,.cg-contentRange{width:100%;accent-color:#303030}.cg-contentList{border:2px solid #e2e2e2;border-radius:9px;overflow:hidden}.cg-contentItem+.cg-contentItem{border-top:2px solid #e2e2e2}.cg-contentItemHeader{display:flex;align-items:center;justify-content:space-between;padding:12px}.cg-contentItemBody{display:flex;align-items:center;justify-content:space-between;background:#f6f6f6;padding:14px 22px}.cg-modalFields{display:grid;gap:20px;max-height:660px;overflow:auto;padding-right:8px}.cg-tokenField{position:relative}.cg-tokenField button{position:absolute;right:0;top:0;border:1px solid #dfe3e8;background:#fff;border-radius:8px;padding:5px 8px;font-weight:700}.cg-dateBox{display:grid;grid-template-columns:1fr 1fr;gap:12px;border:2px solid #e2e2e2;border-radius:9px;padding:12px}.cg-fullRow{grid-column:1/-1}.cg-targetBox{position:relative;display:grid;grid-template-columns:48px minmax(0,1fr) auto;gap:16px;align-items:center;border:2px solid #e2e2e2;border-radius:9px;padding:18px}.cg-targetIcon{width:44px;height:44px;border-radius:999px;background:#efe3ff;color:#7a36ff;display:flex;align-items:center;justify-content:center;font-weight:800}.cg-targetAction{position:relative}.cg-targetMenu{position:absolute;right:-20px;top:-630px;z-index:30;width:300px;max-height:620px;overflow:auto;background:#fff;border:1px solid #dfe3e8;border-radius:12px;box-shadow:0 5px 18px rgba(0,0,0,.22);padding:10px}.cg-searchRow{display:flex;align-items:center;gap:8px;border:2px solid #1a73e8;border-radius:9px;padding:10px 12px;color:#6d7175;margin-bottom:12px}.cg-targetMenu button{display:block;width:100%;border:0;background:#fff;border-radius:8px;padding:9px 10px;text-align:left;color:#444;font-size:14px;cursor:pointer}.cg-targetMenu button:hover{background:#f1f1f1}.cg-targetMenu small{display:block;color:#6d7175;font-size:12px;margin-top:2px}@media(max-width:1050px){.cg-layout{grid-template-columns:1fr}.cg-targetMenu{top:44px;right:0}}@media(max-width:700px){.cg-cardHeader,.cg-rewardHeader,.cg-contentItemHeader,.cg-contentItemBody{align-items:flex-start;flex-direction:column}.cg-cardBody{padding:18px}.cg-milestoneRow,.cg-dateBox,.cg-targetBox{grid-template-columns:1fr}.cg-addGoal{width:100%}}
      `}</style>

      <Box paddingBlockEnd="800">
        <div className="cg-layout">
          <BlockStack gap="400">
            {actionData?.error && (
              <Banner tone="critical" title="Save failed">
                {actionData.error}
              </Banner>
            )}

            <SectionCard icon={GiftCardIcon} title="Goals & rewards" defaultOpen>
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
                        onGoalChange={patchGoal}
                        onToggle={(goalIndex) =>
                          patchGoal(goalIndex, { expanded: !goals[goalIndex].expanded })
                        }
                        onDelete={(goalIndex) =>
                          setGoals((current) =>
                            current.filter((_, currentIndex) => currentIndex !== goalIndex)
                          )
                        }
                      />
                    ))}
                  </div>
                )}

                <div className="cg-addGoalWrap">
                  <button
                    type="button"
                    className="cg-addGoal"
                    onClick={() => setAddMenuOpen((value) => !value)}
                  >
                    + Add a new goal
                  </button>
                  {addMenuOpen && (
                    <div className="cg-addMenu">
                      {Object.values(REWARD_CONFIG).map((reward) => (
                        <button
                          type="button"
                          key={reward.type}
                          onClick={() => addGoal(reward.type)}
                        >
                          <Icon source={reward.icon} />
                          {reward.menuLabel}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="cg-info">
                  <span>i</span>
                  <Text variant="bodyMd" as="p">
                    Set your existing Shopify discounts to combine with product and
                    order discounts to ensure that these rewards work well together.
                    <strong> Learn more</strong>
                  </Text>
                </div>
              </BlockStack>
            </SectionCard>

            <ContentSection
              goals={goals}
              shownGoals={shownGoals}
              onShownGoalsChange={setShownGoals}
              onEditGoal={setEditingTextIndex}
            />

            <SettingsSection />
          </BlockStack>

          <PreviewPanel
            enabled={enabled}
            onEnabledChange={setEnabled}
            campaignName={campaignName}
            onCampaignNameChange={setCampaignName}
            goals={sortedGoals.slice(0, shownGoals)}
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
