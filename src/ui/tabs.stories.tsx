import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Tabs } from "./tabs";

const meta = {
  title: "Components/Tabs",
  component: Tabs,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

function Section() {
  return (
    <Tabs defaultActiveIndex={0} label="Article sections" className="w-96">
      <Tabs.List>
        <Tabs.Tab value={0}>Overview</Tabs.Tab>
        <Tabs.Tab value={1}>Details</Tabs.Tab>
        <Tabs.Tab value={2}>Reviews</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value={0}>A short summary of the article.</Tabs.Panel>
      <Tabs.Panel value={1}>Full specifications and measurements.</Tabs.Panel>
      <Tabs.Panel value={2}>What other readers thought.</Tabs.Panel>
    </Tabs>
  );
}

export const Default: Story = {
  render: () => <Section />,
};

export const Vertical: Story = {
  render: () => (
    <Tabs defaultActiveIndex={0} label="Settings" orientation="vertical" className="w-72">
      <Tabs.List>
        <Tabs.Tab value={0}>Profile</Tabs.Tab>
        <Tabs.Tab value={1}>Notifications</Tabs.Tab>
        <Tabs.Tab value={2}>Billing</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value={0}>Profile settings.</Tabs.Panel>
      <Tabs.Panel value={1}>Notification preferences.</Tabs.Panel>
      <Tabs.Panel value={2}>Billing details.</Tabs.Panel>
    </Tabs>
  ),
};

export const OrientationSwap: Story = {
  render: () => (
    <Tabs
      defaultActiveIndex={0}
      label="Sections (Up/Down navigation)"
      orientation="horizontal"
      orientationSwap
      className="w-96"
    >
      <Tabs.List>
        <Tabs.Tab value={0}>Overview</Tabs.Tab>
        <Tabs.Tab value={1}>Details</Tabs.Tab>
        <Tabs.Tab value={2}>Reviews</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value={0}>Navigate these tabs with the Up/Down arrows.</Tabs.Panel>
      <Tabs.Panel value={1}>Full specifications and measurements.</Tabs.Panel>
      <Tabs.Panel value={2}>What other readers thought.</Tabs.Panel>
    </Tabs>
  ),
};

export const WithDisabledTab: Story = {
  render: () => (
    <Tabs defaultActiveIndex={0} label="Sections" className="w-96">
      <Tabs.List>
        <Tabs.Tab value={0}>Overview</Tabs.Tab>
        <Tabs.Tab value={1} disabled>
          Details
        </Tabs.Tab>
        <Tabs.Tab value={2}>Reviews</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value={0}>A short summary of the article.</Tabs.Panel>
      <Tabs.Panel value={1}>Full specifications and measurements.</Tabs.Panel>
      <Tabs.Panel value={2}>What other readers thought.</Tabs.Panel>
    </Tabs>
  ),
};

export const LongContent: Story = {
  render: () => (
    <Tabs defaultActiveIndex={0} label="ワークスペースの表示" className="w-64">
      <Tabs.List>
        <Tabs.Tab value={0}>概要とプロジェクトの説明</Tabs.Tab>
        <Tabs.Tab value={1}>アクティビティタイムライン</Tabs.Tab>
        <Tabs.Tab value={2}>メンバーと権限の管理</Tabs.Tab>
        <Tabs.Tab value={3}>請求と使用状況の詳細</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value={0}>
        長いラベルはリスト内で横スクロールし、レイアウトを崩しません。
      </Tabs.Panel>
      <Tabs.Panel value={1}>最近の操作の履歴がここに表示されます。</Tabs.Panel>
      <Tabs.Panel value={2}>メンバーの招待と権限の変更ができます。</Tabs.Panel>
      <Tabs.Panel value={3}>今月の使用状況と請求額の内訳です。</Tabs.Panel>
    </Tabs>
  ),
};

export const CloseOnEscape: Story = {
  render: () => (
    <Tabs defaultActiveIndex={0} label="Draft views" closeOnEscape className="w-96">
      <Tabs.List>
        <Tabs.Tab value={0}>Preview</Tabs.Tab>
        <Tabs.Tab value={1}>Source</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value={0}>Press Escape to clear the selection.</Tabs.Panel>
      <Tabs.Panel value={1}>Press Escape to clear the selection.</Tabs.Panel>
    </Tabs>
  ),
};

export const Controlled: Story = {
  render: () => {
    function Example() {
      const [index, setIndex] = useState<number | null>(0);
      return (
        <Tabs activeIndex={index} onChange={setIndex} label="Sections" className="w-96">
          <Tabs.List>
            <Tabs.Tab value={0}>Overview</Tabs.Tab>
            <Tabs.Tab value={1}>Details</Tabs.Tab>
            <Tabs.Tab value={2}>Reviews</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value={0}>A short summary of the article.</Tabs.Panel>
          <Tabs.Panel value={1}>Full specifications and measurements.</Tabs.Panel>
          <Tabs.Panel value={2}>What other readers thought.</Tabs.Panel>
        </Tabs>
      );
    }
    return <Example />;
  },
};
