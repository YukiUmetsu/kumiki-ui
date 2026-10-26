import type { Meta, StoryObj } from "@storybook/react-vite";
import { ToastProvider, useToast } from "./toast";
import type { ToastType } from "./toast";
import { Button } from "./button";

const meta = {
  title: "Overlays and notifications/Toast", id: "components-toast",
  component: ToastProvider,
  decorators: [
    (Story, context) => (
      <ToastProvider position={context.args.position} timeout={context.args.timeout}>
        <Story />
      </ToastProvider>
    ),
  ],
  parameters: { layout: "centered" },
  args: {
    timeout: 5000,
    position: "bottom-end",
  },
  argTypes: {
    position: {
      control: "select",
      options: ["top-start", "top-center", "top-end", "bottom-start", "bottom-center", "bottom-end"],
    },
    timeout: { control: "number" },
  },
} satisfies Meta<typeof ToastProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

function Trigger({ label = "Show notification", ...options }: { label?: string } & Parameters<ReturnType<typeof useToast>["show"]>[0]) {
  const toast = useToast();
  return (
    <Button onClick={() => toast.show(options)} variant="outline">
      {label}
    </Button>
  );
}

export const Default: Story = {
  render: () => (
    <Trigger title="Saved" message="Your changes have been stored." />
  ),
};

const severities: ToastType[] = ["default", "info", "success", "warning", "error"];

function SeveritiesDemo() {
  const toast = useToast();
  return (
    <div className="flex flex-wrap gap-2">
      {severities.map((type) => (
        <Button
          key={type}
          variant="outline"
          onClick={() =>
            toast.show({
              type,
              title: type[0]!.toUpperCase() + type.slice(1),
              message: `A ${type} notification message.`,
            })
          }
        >
          {type}
        </Button>
      ))}
    </div>
  );
}

export const Severities: Story = {
  render: () => <SeveritiesDemo />,
};

export const WithAction: Story = {
  render: () => (
    <Trigger
      type="info"
      title="Message archived"
      message="The conversation was moved to your archive."
      actionLabel="Undo"
      action={() => {}}
    />
  ),
};

function ActionVariantsDemo() {
  const toast = useToast();
  return (
    <div className="flex flex-wrap gap-2">
      {(["primary", "secondary", "subtle", "outline", "destructive"] as const).map((actionVariant) => (
        <Button
          key={actionVariant}
          variant="outline"
          onClick={() =>
            toast.show({
              title: `Action: ${actionVariant}`,
              message: "The action button uses the shared control tokens.",
              actionLabel: "Apply",
              actionVariant,
              action: () => {},
            })
          }
        >
          {actionVariant}
        </Button>
      ))}
    </div>
  );
}

export const ActionVariants: Story = {
  render: () => <ActionVariantsDemo />,
};

export const AutoDismiss: Story = {
  render: () => (
    <Trigger
      type="success"
      title="Upload complete"
      message="This notification dismisses itself after three seconds."
      autoDismiss={3}
    />
  ),
};

export const DismissOnClick: Story = {
  render: () => (
    <Trigger
      title="Click to dismiss"
      message="Pressing anywhere on this notification dismisses it."
      dismissOnClick
    />
  ),
};

function DeduplicationDemo() {
  const toast = useToast();
  return (
    <Button
      variant="outline"
      onClick={() => {
        // Identical notifications update the existing toast instead of stacking.
        for (let index = 0; index < 5; index += 1) {
          toast.show({ type: "info", title: "Syncing", message: "Updating your items…" });
        }
      }}
    >
      Fire the same toast five times
    </Button>
  );
}

export const Deduplication: Story = {
  render: () => <DeduplicationDemo />,
};

export const LongAndLocalizedText: Story = {
  render: () => (
    <Trigger
      type="warning"
      title="保存できませんでした"
      message="ネットワーク接続を確認して、もう一度お試しください。データは失われていません。"
      actionLabel="再試行"
      action={() => {}}
    />
  ),
};

export const Position: Story = {
  render: () => (
    <Trigger
      type="info"
      title="Positioned notification"
      message="Change the position control to move the toast stack."
    />
  ),
};
