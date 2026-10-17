import { useState } from "react";
import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { SplitPane } from "./split-pane";

function Pane({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex h-full flex-col gap-2 p-4">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <div className="min-w-0 text-sm text-muted-foreground">{children}</div>
    </div>
  );
}

function Frame({ children }: { children: ReactNode }) {
  return <div className="mx-auto h-72 w-full max-w-2xl">{children}</div>;
}

const meta = {
  title: "Components/SplitPane",
  component: SplitPane,
  parameters: { layout: "padded" },
  args: {
    "aria-label": "Resize document and details",
    className: "h-full",
    primary: (
      <Pane label="Document">
        <p>
          The primary panel keeps the size set by the divider. Drag the divider,
          or focus it and use the arrow keys, Home and End.
        </p>
      </Pane>
    ),
    secondary: (
      <Pane label="Details">
        <p>
          The secondary panel receives the remaining space and shrinks to zero
          before the container can overflow.
        </p>
      </Pane>
    ),
  },
  argTypes: {
    unit: { control: "inline-radio", options: ["percent", "pixels"] },
    orientation: {
      control: "inline-radio",
      options: ["horizontal", "vertical"],
    },
    disabled: { control: "boolean" },
    minPrimarySize: { control: "number" },
    maxPrimarySize: { control: "number" },
  },
} satisfies Meta<typeof SplitPane>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Frame>
      <SplitPane {...args} />
    </Frame>
  ),
};

export const Vertical: Story = {
  args: {
    orientation: "vertical",
    "aria-label": "Resize editor and console",
    primary: (
      <Pane label="Editor">
        <p>Stacked panels use Up and Down arrows to move the horizontal divider.</p>
      </Pane>
    ),
    secondary: (
      <Pane label="Console">
        <p>Output, logs and diagnostics.</p>
      </Pane>
    ),
  },
  render: (args) => (
    <Frame>
      <SplitPane {...args} />
    </Frame>
  ),
};

export const Pixels: Story = {
  args: {
    unit: "pixels",
    defaultPrimarySize: 260,
    minPrimarySize: 160,
    maxPrimarySize: 420,
    "aria-label": "Resize navigation and content",
    primary: (
      <Pane label="Navigation">
        <p>This panel starts at 260px and is bounded between 160px and 420px.</p>
      </Pane>
    ),
    secondary: (
      <Pane label="Content">
        <p>Pixel sizes are clamped to the measured panel space as well.</p>
      </Pane>
    ),
  },
  render: (args) => (
    <Frame>
      <SplitPane {...args} />
    </Frame>
  ),
};

export const WithMinMax: Story = {
  args: {
    defaultPrimarySize: 60,
    minPrimarySize: 25,
    maxPrimarySize: 75,
    "aria-label": "Resize summary and article",
    primary: (
      <Pane label="Summary">
        <p>Bounded between 25% and 75%; Home and End jump to those limits.</p>
      </Pane>
    ),
    secondary: (
      <Pane label="Article">
        <p>Neither panel can be collapsed to an unusable width.</p>
      </Pane>
    ),
  },
  render: (args) => (
    <Frame>
      <SplitPane {...args} />
    </Frame>
  ),
};

export const Disabled: Story = {
  args: {
    disabled: true,
    "aria-label": "Resize locked layout",
  },
  render: (args) => (
    <Frame>
      <SplitPane {...args} />
    </Frame>
  ),
};

export const Controlled: Story = {
  render: () => {
    function ControlledExample() {
      const [size, setSize] = useState(35);
      return (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Primary size:{" "}
            <span data-testid="split-pane-size">{size.toFixed(1)}%</span>
          </p>
          <div className="h-72">
            <SplitPane
              primarySize={size}
              onPrimarySizeChange={setSize}
              minPrimarySize={20}
              maxPrimarySize={80}
              aria-label="Resize sidebar and main content"
              className="h-full"
              primary={
                <Pane label="Sidebar">
                  <p>The consumer owns this value and can persist or reset it.</p>
                </Pane>
              }
              secondary={
                <Pane label="Main content">
                  <p>Every divider move reports the clamped next size.</p>
                </Pane>
              }
            />
          </div>
        </div>
      );
    }
    return <ControlledExample />;
  },
};

export const LongAndLocalizedText: Story = {
  args: {
    "aria-label": "パネルのサイズを変更",
    className: "h-full",
    primary: (
      <Pane label="原文と注釈">
        <p className="break-words">
          分割されたパネルの中でも、長い日本語の文章や折り返しのない識別子がレイアウトを崩さないことを確認します。主パネルは指定された割合を保ち、内容は必要に応じてスクロールします。
        </p>
        <p className="mt-2 break-all text-xs">
          https://example.com/documents/2026/very-long-unbroken-resource-identifier-without-any-spaces
        </p>
      </Pane>
    ),
    secondary: (
      <Pane label="詳細と補足">
        <p className="break-words">
          副パネルは残りの領域を受け取ります。パネルの境界はドラッグだけでなく、キーボードの左右キー、Home、Endでも操作できます。
        </p>
      </Pane>
    ),
  },
  render: (args) => (
    <Frame>
      <SplitPane {...args} />
    </Frame>
  ),
};
