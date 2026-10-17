import type { Meta, StoryObj } from "@storybook/react-vite";
import { Separator } from "./separator";

const meta = {
  title: "Components/Separator",
  component: Separator,
  args: {
    orientation: "horizontal",
    decorative: true,
  },
  argTypes: {
    orientation: { control: "inline-radio", options: ["horizontal", "vertical"] },
    decorative: { control: "boolean" },
  },
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

const rows = [
  "Storage used — 4.2 GB of 10 GB",
  "Last sync — three minutes ago",
  "Plan — Team",
];

export const Default: Story = {
  render: (args) => (
    <div className="w-80">
      <Separator {...args} />
    </div>
  ),
};

export const Vertical: Story = {
  args: { orientation: "vertical" },
  render: (args) => (
    <div className="flex h-16 items-center gap-4">
      <span className="text-sm text-foreground">Overview</span>
      <Separator {...args} />
      <span className="text-sm text-foreground">Activity</span>
      <Separator {...args} />
      <span className="text-sm text-foreground">Settings</span>
    </div>
  ),
};

export const Semantic: Story = {
  args: { decorative: false },
  render: (args) => (
    <section aria-labelledby="separator-semantic-account" className="w-80">
      <h2 id="separator-semantic-account" className="text-base font-medium text-foreground">
        Account
      </h2>
      <p className="text-sm text-muted-foreground">Profile, email and password.</p>
      <div className="mt-4">
        <Separator {...args} />
      </div>
      <h2 className="mt-4 text-base font-medium text-foreground">Billing</h2>
      <p className="text-sm text-muted-foreground">Invoices and payment method.</p>
    </section>
  ),
};

export const InList: Story = {
  render: () => (
    <ul className="w-80">
      {rows.map((row, index) => (
        <li key={row}>
          {index > 0 ? <Separator /> : null}
          <p className="py-3 text-sm text-foreground">{row}</p>
        </li>
      ))}
    </ul>
  ),
};

export const ConsumerOwnedSpacing: Story = {
  render: () => (
    <div className="w-80">
      <p className="text-sm text-foreground">The rule itself carries no margin.</p>
      <Separator className="my-6" />
      <p className="text-sm text-foreground">Spacing comes from the layout that composes it.</p>
    </div>
  ),
};

export const LongAndLocalizedText: Story = {
  render: () => (
    <div className="flex w-full max-w-md flex-col gap-3" lang="ja">
      <p className="text-sm text-foreground">
        長い見出しと URL を含むセクションを区切ります。
      </p>
      <Separator />
      <p className="break-all text-sm text-muted-foreground">
        https://example.com/settings/workspace/members/roles-and-permissions
      </p>
      <Separator />
      <p className="text-sm text-foreground">
        ワークスペースの設定は、メンバー全員が同じ内容を参照できるようにするため、変更履歴と合わせて保存されます。
      </p>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">保存済み</span>
        <Separator orientation="vertical" className="h-4" />
        <span className="text-sm text-muted-foreground">最終更新 3 分前</span>
      </div>
    </div>
  ),
};
