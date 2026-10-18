import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { DropdownMenu } from "./dropdown-menu";
import type { DropdownMenuEntry } from "./dropdown-menu";
import { Button } from "./button";
import { IconButton } from "./icon-button";

const meta = {
  title: "Components/Dropdown Menu",
  component: DropdownMenu,
  args: {
    label: "Actions",
    children: <Button variant="outline">Actions</Button>,
    items: [
      { label: "Edit", onSelect: () => {} },
      { label: "Duplicate", onSelect: () => {} },
      { label: "Archive", onSelect: () => {} },
    ],
  },
  argTypes: {
    align: { control: "select", options: ["start", "center", "end"] },
  },
} satisfies Meta<typeof DropdownMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithLabelAndSeparator: Story = {
  args: { separator: true },
};

export const GroupsAndDestructive: Story = {
  args: {
    label: "Document",
    separator: true,
    items: [
      { label: "Rename", shortcut: "⌘R", onSelect: () => {} },
      { label: "Duplicate", shortcut: "⌘D", onSelect: () => {} },
      { separator: true },
      { label: "Move to…", onSelect: () => {} },
      { label: "Add to favorites", disabled: true },
      { separator: true },
      { label: "Delete", destructive: true, shortcut: "⌫", onSelect: () => {} },
    ],
  },
};

export const WithSubmenu: Story = {
  args: {
    label: "Item",
    separator: true,
    items: [
      { label: "Open", onSelect: () => {} },
      {
        label: "Share",
        items: [
          { label: "Copy link", onSelect: () => {} },
          { label: "Email", onSelect: () => {} },
          {
            label: "More",
            items: [
              { label: "Export…", onSelect: () => {} },
              { label: "Print", onSelect: () => {} },
            ],
          },
        ],
      },
      { separator: true },
      { label: "Delete", destructive: true, onSelect: () => {} },
    ],
  },
};

export const Alignment: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-start gap-6 p-12">
      {(["start", "center", "end"] as const).map((align) => (
        <DropdownMenu
          {...args}
          key={align}
          align={align}
          label={`Align: ${align}`}
          children={<Button variant="outline">{align}</Button>}
        />
      ))}
    </div>
  ),
};

export const IconOnlyTrigger: Story = {
  args: {
    children: <IconButton variant="outline" aria-label="More actions">⋯</IconButton>,
    items: [
      { label: "Edit", onSelect: () => {} },
      { label: "Duplicate", onSelect: () => {} },
      { separator: true },
      { label: "Delete", destructive: true, onSelect: () => {} },
    ],
  },
};

export const DisabledMenu: Story = {
  args: { disabled: true },
};

export const EscapeDoesNotClose: Story = {
  args: { closeOnEscape: false, label: "Escape stays open" },
};

export const LongAndLocalizedText: Story = {
  args: {
    label: "長い名前のメニューと折り返しの確認",
    separator: true,
    items: [
      {
        label:
          "A very long action label that must wrap without clipping or hiding its ending",
        onSelect: () => {},
      },
      { label: "設定を保存して閉じる", onSelect: () => {} },
      { label: "https://example.com/files/reports/quarterly-summary-final.pdf", onSelect: () => {} },
      { separator: true },
      { label: "削除", destructive: true, onSelect: () => {} },
    ],
  },
};

export const Controlled: Story = {
  render: (args) => {
    function Example() {
      const [open, setOpen] = useState(false);
      const items: DropdownMenuEntry[] = [
        { label: "Open", onSelect: () => setOpen(false) },
        { label: "Rename", onSelect: () => setOpen(false) },
      ];
      return (
        <div className="flex flex-col items-start gap-2">
          <span className="text-sm text-muted-foreground">
            {open ? "Menu open" : "Menu closed"}
          </span>
          <DropdownMenu
            {...args}
            items={items}
            open={open}
            onOpenChange={setOpen}
            children={<Button variant="outline">Controlled</Button>}
          />
        </div>
      );
    }
    return <Example />;
  },
};
