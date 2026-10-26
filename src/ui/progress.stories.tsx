import { useEffect, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Progress } from "./progress";

const meta = {
  title: "Status and feedback/Progress", id: "components-progress",
  component: Progress,
  args: { label: "Uploading files", progress: 0.4 },
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Determinate: Story = {};

export const Complete: Story = { args: { progress: 1 } };

export const Indeterminate: Story = {
  args: { mode: "indeterminate" },
};

export const WithoutLabel: Story = {
  args: { label: undefined, progress: 0.65 },
};

export const Disabled: Story = {
  args: { disabled: true, progress: 0.4 },
};

export const LongLocalizedLabel: Story = {
  args: { label: "アップロード中のファイルを検証しています", progress: 0.25 },
};

export const AsyncUpdates: Story = {
  render: () => {
    function Example() {
      const [progress, setProgress] = useState(0);

      useEffect(() => {
        const timer = window.setInterval(() => {
          setProgress((current) => (current >= 1 ? 0 : Math.min(1, current + 0.1)));
        }, 800);
        return () => window.clearInterval(timer);
      }, []);

      return <Progress label="Syncing workspace" progress={progress} />;
    }
    return <Example />;
  },
};
