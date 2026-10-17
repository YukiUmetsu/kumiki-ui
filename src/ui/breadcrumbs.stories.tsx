import type { Meta, StoryObj } from "@storybook/react-vite";
import { Breadcrumbs } from "./breadcrumbs";

const meta = {
  title: "Components/Breadcrumbs",
  component: Breadcrumbs,
  args: {
    items: [
      { label: "Home", href: "/" },
      { label: "Projects", href: "/projects" },
      { label: "Kumiki UI", href: "/projects/kumiki-ui" },
      { label: "Components" },
    ],
  },
  argTypes: {
    maxItems: { control: "number" },
  },
} satisfies Meta<typeof Breadcrumbs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CustomSeparator: Story = {
  args: { separator: "›" },
};

const longTrail = [
  { label: "Home", href: "/" },
  { label: "Workspace", href: "/workspace" },
  { label: "Engineering", href: "/workspace/engineering" },
  { label: "Design systems", href: "/workspace/engineering/design-systems" },
  { label: "Kumiki UI", href: "/workspace/engineering/design-systems/kumiki-ui" },
  { label: "Packages", href: "/workspace/engineering/design-systems/kumiki-ui/packages" },
  { label: "Registry", href: "/workspace/engineering/design-systems/kumiki-ui/packages/registry" },
  { label: "Breadcrumbs" },
];

export const LongTrail: Story = {
  args: { items: longTrail, maxItems: 4 },
};

export const LongAndLocalizedText: Story = {
  name: "Long and localized text",
  render: (args) => (
    <div className="w-full max-w-xs" lang="ja">
      <Breadcrumbs
        {...args}
        items={[
          { label: "ホーム", href: "/" },
          {
            label: "ワークスペース設定とアクセス権限の管理",
            href: "/workspace/settings/permissions",
          },
          {
            label: "https://example.com/workspace/settings/members/roles-and-permissions",
          },
        ]}
      />
    </div>
  ),
};

export const CurrentItemIsNotALink: Story = {
  args: {
    items: [
      { label: "Home", href: "/" },
      { label: "Projects", href: "/projects" },
      {
        label: "Kumiki UI",
        href: "/projects/kumiki-ui",
        current: true,
      },
    ],
  },
};
