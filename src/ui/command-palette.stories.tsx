import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CommandPalette } from "./command-palette";
import type { CommandPaletteCommand, CommandPaletteProps } from "./command-palette";
import { Button } from "./button";

const fileCommands: CommandPaletteCommand[] = [
  {
    id: "new-file",
    label: "New file",
    group: "File",
    keywords: ["create", "document"],
    shortcut: "⌘N",
    onSelect: () => {},
  },
  {
    id: "open-file",
    label: "Open file",
    group: "File",
    keywords: ["browse"],
    shortcut: "⌘O",
    onSelect: () => {},
  },
  {
    id: "save",
    label: "Save",
    group: "File",
    shortcut: "⌘S",
    onSelect: () => {},
  },
  {
    id: "appearance",
    label: "Change appearance",
    group: "Preferences",
    keywords: ["theme", "dark mode", "light mode"],
    onSelect: () => {},
  },
  {
    id: "shortcuts",
    label: "Keyboard shortcuts",
    group: "Preferences",
    onSelect: () => {},
  },
  {
    id: "sign-out",
    label: "Sign out",
    group: "Account",
    disabled: true,
    onSelect: () => {},
  },
];

type HarnessProps = CommandPaletteProps & { initialOpen?: boolean };

/**
 * Story harness: the palette is controlled, so a story needs a small owner.
 * The readout proves that a command ran exactly once before the palette closed.
 */
function PaletteHarness({ initialOpen = false, commands, ...props }: HarnessProps) {
  const [open, setOpen] = useState(initialOpen);
  const [last, setLast] = useState<string | null>(null);

  const trackedCommands = commands.map((command) => ({
    ...command,
    onSelect: () => {
      setLast(command.label);
      command.onSelect();
    },
  }));

  return (
    <div className="flex flex-col items-start gap-3">
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open command palette
      </Button>
      <span className="text-sm text-muted-foreground" data-testid="last-command">
        {last === null ? "No command run yet" : `Last command: ${last}`}
      </span>
      <CommandPalette
        {...props}
        commands={trackedCommands}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}

const meta = {
  title: "Overlays and notifications/Command Palette", id: "components-command-palette",
  component: CommandPalette,
  args: {
    open: false,
    onOpenChange: () => {},
    commands: fileCommands,
    label: "Command palette",
  },
  argTypes: {
    open: { control: "boolean" },
    loading: { control: "boolean" },
    placeholder: { control: "text" },
  },
} satisfies Meta<typeof CommandPalette>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => <PaletteHarness {...args} />,
};

export const Open: Story = {
  render: (args) => <PaletteHarness {...args} initialOpen />,
};

export const WithGroups: Story = {
  render: (args) => <PaletteHarness {...args} initialOpen />,
};

export const WithShortcuts: Story = {
  render: (args) => <PaletteHarness {...args} initialOpen />,
};

export const EmptyResult: Story = {
  args: {
    commands: [],
    emptyMessage: "No commands match your search.",
  },
  render: (args) => <PaletteHarness {...args} initialOpen />,
};

export const Loading: Story = {
  args: {
    commands: [],
    loading: true,
  },
  render: (args) => <PaletteHarness {...args} initialOpen />,
};

export const LongAndLocalizedText: Story = {
  args: {
    label: "コマンドパレット",
    placeholder: "コマンドを検索…",
    emptyMessage: "一致するコマンドがありません。",
    commands: [
      {
        id: "open-settings",
        label: "設定を開いて外観とキーボードショートカットを変更する",
        group: "設定",
        keywords: ["設定", "外観", "キーボード"],
        onSelect: () => {},
      },
      {
        id: "long-english",
        label:
          "Rename the selected document and update every linked reference in this workspace",
        group: "設定",
        keywords: ["rename", "references"],
        onSelect: () => {},
      },
      {
        id: "url",
        label: "https://example.com/files/reports/quarterly-summary-final.pdf",
        group: "最近の項目",
        onSelect: () => {},
      },
      {
        id: "disabled-cjk",
        label: "アカウントからサインアウトする",
        group: "アカウント",
        disabled: true,
        onSelect: () => {},
      },
    ],
  },
  render: (args) => <PaletteHarness {...args} initialOpen />,
};
