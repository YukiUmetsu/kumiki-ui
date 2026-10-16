import type { Meta, StoryObj } from "@storybook/react-vite";
import { Surface } from "./surface-card";
import { Button } from "./button";

const meta = {
  title: "Components/Surface",
  component: Surface,
  parameters: { layout: "centered" },
  args: {
    className: "w-80",
    children: "Surface content",
  },
  argTypes: {
    variant: { control: "select", options: ["solid", "outline", "ghost"] },
  },
} satisfies Meta<typeof Surface>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Solid: Story = {};

export const Outline: Story = { args: { variant: "outline" } };

export const Ghost: Story = { args: { variant: "ghost" } };

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-start gap-4">
      {(["solid", "outline", "ghost"] as const).map((variant) => (
        <Surface key={variant} variant={variant} className="w-60">
          <p className="font-medium">{variant}</p>
          <p className="text-[length:var(--km-type-size-sm)] text-muted-foreground">
            Tokenized {variant} surface.
          </p>
        </Surface>
      ))}
    </div>
  ),
};

export const WithHeaderAndFooter: Story = {
  render: () => (
    <Surface
      className="w-80"
      header={<h3 className="text-[length:var(--km-type-size-base)] font-medium">Documents</h3>}
      footer={
        <>
          <Button variant="outline" size="sm">
            Cancel
          </Button>
          <Button size="sm">Open</Button>
        </>
      }
    >
      <p className="text-[length:var(--km-type-size-sm)] text-muted-foreground">
        Three items were updated in the last hour.
      </p>
    </Surface>
  ),
};

export const Interactive: Story = {
  args: {
    interactive: true,
    className: "w-80",
    header: "Open report",
    children: "Select to view the quarterly summary.",
  },
};

export const LongAndLocalizedText: Story = {
  render: () => (
    <Surface
      className="w-64"
      header="ワークスペースの設定"
      footer={
        <span className="text-[length:var(--km-type-size-sm)] text-muted-foreground">
          最終更新: 2 分前
        </span>
      }
    >
      長いテキストやCJKのコンテンツは折り返され、クリップされません。
    </Surface>
  ),
};
