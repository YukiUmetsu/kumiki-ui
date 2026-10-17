import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Alert } from "./alert";
import { Button } from "./button";

const meta = {
  title: "Components/Alert",
  component: Alert,
  args: {
    variant: "info",
    title: "Heads up",
    children: "This workspace will switch to read-only mode on Friday.",
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["info", "success", "warning", "danger"],
    },
    live: { control: "select", options: ["off", "polite", "assertive"] },
    dismissible: { control: "boolean" },
  },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Info: Story = { args: { variant: "info" } };

export const Success: Story = {
  args: {
    variant: "success",
    title: "Changes saved",
    children: "Your profile is visible to workspace members.",
  },
};

export const Warning: Story = {
  args: {
    variant: "warning",
    title: "Storage almost full",
    children: "You have used 92% of the available storage.",
  },
};

export const Danger: Story = {
  args: {
    variant: "danger",
    title: "Could not connect",
    children: "Check your network connection and try again.",
  },
};

export const WithAction: Story = {
  args: {
    variant: "danger",
    title: "Import failed",
    children: "The file could not be processed because it contains unsupported rows.",
    action: (
      <Button size="sm" variant="outline">
        Review rows
      </Button>
    ),
  },
};

function DismissibleExample() {
  const [visible, setVisible] = useState(true);

  if (!visible) {
    return (
      <Button size="sm" variant="subtle" onClick={() => setVisible(true)}>
        Show notice again
      </Button>
    );
  }

  return (
    <Alert
      variant="info"
      title="Trial ends in 3 days"
      dismissible
      onDismiss={() => setVisible(false)}
    >
      Add a payment method to keep your workspace active.
    </Alert>
  );
}

export const Dismissible: Story = {
  render: () => <DismissibleExample />,
};

export const WithCustomIcon: Story = {
  args: {
    variant: "info",
    icon: <span className="text-sm font-semibold">i</span>,
    title: "Custom leading icon",
    children: "The icon slot accepts any decorative node.",
  },
};

export const LiveRegions: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <Alert live="polite" variant="success" title="Draft saved">
        Your latest edits are stored locally.
      </Alert>
      <Alert live="assertive" variant="danger" title="Connection lost">
        Changes cannot be saved until the connection returns.
      </Alert>
    </div>
  ),
};

export const LongAndLocalizedText: Story = {
  render: () => (
    <div className="max-w-md">
      <Alert
        variant="warning"
        title="同期できませんでした。ネットワークを確認してください"
        action={
          <Button size="sm" variant="outline">
            再試行
          </Button>
        }
      >
        詳細: https://example.com/help/sync-errors?source=workspace&amp;code=NETWORK_UNAVAILABLE
        の手順に従って設定を確認してください。長いテキストやCJKのコンテンツは折り返され、クリップされません。
      </Alert>
    </div>
  ),
};
