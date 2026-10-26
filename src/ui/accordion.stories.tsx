import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Accordion } from "./accordion";

const meta = {
  title: "Navigation and layout/Accordion", id: "components-accordion",
  component: Accordion,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Accordion>;

export default meta;
type Story = StoryObj<typeof meta>;

function Section() {
  return (
    <Accordion defaultValue={["overview"]} className="w-96">
      <Accordion.Item value="overview">
        <Accordion.Header>
          <Accordion.Trigger>Overview</Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel>
          A short summary of what this section contains and who it is for.
        </Accordion.Panel>
      </Accordion.Item>
      <Accordion.Item value="details">
        <Accordion.Header>
          <Accordion.Trigger>Details</Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel>
          Specifications, measurements and the settings that change them.
        </Accordion.Panel>
      </Accordion.Item>
      <Accordion.Item value="history">
        <Accordion.Header>
          <Accordion.Trigger>History</Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel>Recent changes, newest first, with the author and time.</Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}

export const Default: Story = {
  render: () => <Section />,
};

export const OpenMultiple: Story = {
  render: () => (
    <Accordion openMultiple defaultValue={["appearance", "notifications"]} className="w-96">
      <Accordion.Item value="appearance">
        <Accordion.Header>
          <Accordion.Trigger>Appearance</Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel>Theme, density and reduced-motion preferences.</Accordion.Panel>
      </Accordion.Item>
      <Accordion.Item value="notifications">
        <Accordion.Header>
          <Accordion.Trigger>Notifications</Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel>Which events send an alert, and where they are delivered.</Accordion.Panel>
      </Accordion.Item>
      <Accordion.Item value="privacy">
        <Accordion.Header>
          <Accordion.Trigger>Privacy</Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel>What is stored, for how long, and how to remove it.</Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  ),
};

export const WithDisabledItem: Story = {
  render: () => (
    <Accordion defaultValue={["profile"]} className="w-96">
      <Accordion.Item value="profile">
        <Accordion.Header>
          <Accordion.Trigger>Profile</Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel>Your display name, time zone and language.</Accordion.Panel>
      </Accordion.Item>
      <Accordion.Item value="billing" disabled>
        <Accordion.Header>
          <Accordion.Trigger>Billing</Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel>Only the account owner can change billing details.</Accordion.Panel>
      </Accordion.Item>
      <Accordion.Item value="sessions">
        <Accordion.Header>
          <Accordion.Trigger>Sessions</Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel>Devices currently signed in to this account.</Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  ),
};

export const Controlled: Story = {
  render: () => {
    function Example() {
      const [openItems, setOpenItems] = useState<string[]>(["shipping"]);
      return (
        <div className="flex w-96 flex-col gap-2">
          <Accordion value={openItems} onValueChange={setOpenItems}>
            <Accordion.Item value="shipping">
              <Accordion.Header>
                <Accordion.Trigger>Shipping</Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel>Delivery estimate and tracking reference.</Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item value="returns">
              <Accordion.Header>
                <Accordion.Trigger>Returns</Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel>The return window and how to start a request.</Accordion.Panel>
            </Accordion.Item>
          </Accordion>
          <span data-testid="accordion-value" className="text-sm text-muted-foreground">
            Open: {openItems.length > 0 ? openItems.join(", ") : "none"}
          </span>
        </div>
      );
    }
    return <Example />;
  },
};

export const LongAndLocalizedText: Story = {
  render: () => (
    <Accordion defaultValue={["terms"]} className="w-80">
      <Accordion.Item value="terms">
        <Accordion.Header>
          <Accordion.Trigger>利用規約とプライバシーポリシーの概要について</Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel>
          このセクションでは、サービスの利用条件、データの取り扱い、および変更の通知方法について説明します。長い文章でも高さが測定され、開いた後に内容が切れることはありません。
        </Accordion.Panel>
      </Accordion.Item>
      <Accordion.Item value="link">
        <Accordion.Header>
          <Accordion.Trigger>
            Reference documentation for the complete configuration file format
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel>
          https://example.com/docs/reference/configuration/very-long-unbroken-path-segment-that-must-wrap
        </Accordion.Panel>
      </Accordion.Item>
      <Accordion.Item value="support">
        <Accordion.Header>
          <Accordion.Trigger>サポートへのお問い合わせ</Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel>
          営業時間は平日の午前9時から午後6時までです。緊急の場合は、アカウント設定から優先サポートを選択してください。
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  ),
};
