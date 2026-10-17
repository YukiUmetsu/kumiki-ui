import type { Meta, StoryObj } from "@storybook/react-vite";
import { Skeleton } from "./skeleton";

const meta = {
  title: "Components/Skeleton",
  component: Skeleton,
  args: {
    shape: "text",
    lines: 1,
    width: "20rem",
  },
  argTypes: {
    shape: { control: "inline-radio", options: ["text", "rect", "circle"] },
    lines: { control: { type: "number", min: 1 } },
  },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const TextLines: Story = {
  args: { lines: 4 },
};

export const Shapes: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div className="w-80">
        <Skeleton shape="text" lines={2} />
      </div>
      <div className="w-80">
        <Skeleton shape="rect" height={96} />
      </div>
      <Skeleton shape="circle" width={48} />
    </div>
  ),
};

export const CustomSize: Story = {
  args: { shape: "rect", width: 240, height: 120 },
};

export const PlaceholderForAList: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-4" role="status" aria-live="polite">
      <span className="sr-only">Loading members</span>
      {[0, 1, 2].map((index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton shape="circle" width={40} />
          <div className="flex-1">
            <Skeleton shape="text" lines={2} width="100%" />
          </div>
        </div>
      ))}
    </div>
  ),
};

export const NarrowContainer: Story = {
  render: () => (
    <div className="flex w-40 flex-col gap-2">
      <Skeleton shape="text" lines={3} width="100%" />
      <p className="break-all text-xs text-muted-foreground">
        https://example.com/a/very/long/path/that/must/wrap/instead/of/overflowing
      </p>
    </div>
  ),
};

export const LongAndLocalizedText: Story = {
  render: () => (
    <div className="flex w-full max-w-md flex-col gap-4" lang="ja">
      <div>
        <p className="text-sm text-muted-foreground">
          長い日本語の見出しを読み込んでいます。プレースホルダーは内容を捏造しません。
        </p>
        <div className="mt-2">
          <Skeleton shape="text" lines={2} width="100%" />
        </div>
      </div>
      <div>
        <p className="break-all text-sm text-muted-foreground">
          https://example.com/workspaces/roles-and-permissions?member=example
        </p>
        <div className="mt-2">
          <Skeleton shape="rect" width="100%" height={72} />
        </div>
      </div>
      <Skeleton shape="circle" width={40} />
    </div>
  ),
};
