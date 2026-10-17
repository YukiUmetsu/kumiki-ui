import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  ResourceExplorer,
} from "./resource-explorer";
import type {
  ResourceExplorerProps,
  ResourceItem,
  ResourceMoveDirection,
} from "./resource-explorer";

const sampleItems: ResourceItem[] = [
  {
    id: "documents",
    label: "Documents",
    children: [
      { id: "reports", label: "Reports" },
      { id: "notes", label: "Meeting notes" },
      {
        id: "contracts",
        label: "Contracts",
        children: [
          { id: "contract-2024", label: "2024" },
          { id: "contract-2025", label: "2025" },
        ],
      },
    ],
  },
  {
    id: "archive",
    label: "Archive",
    children: [
      { id: "archive-2023", label: "2023" },
      { id: "archive-legacy", label: "Legacy exports", disabled: true },
    ],
  },
  { id: "drafts", label: "Drafts" },
];

const localizedItems: ResourceItem[] = [
  {
    id: "ja-projects",
    label: "プロジェクト",
    children: [
      { id: "ja-alpha", label: "設計ドキュメント" },
      { id: "ja-beta", label: "議事録と決定事項" },
    ],
  },
  { id: "long-name", label: "Quarterly planning and review documentation" },
  { id: "mixed", label: "リリースノートと release checklist" },
];

function renameInTree(items: ResourceItem[], id: string, label: string): ResourceItem[] {
  return items.map((item) => {
    if (item.id === id) return { ...item, label };
    if (item.children) {
      return { ...item, children: renameInTree(item.children, id, label) };
    }
    return item;
  });
}

function removeFromTree(items: ResourceItem[], id: string): ResourceItem[] {
  return items
    .filter((item) => item.id !== id)
    .map((item) =>
      item.children
        ? { ...item, children: removeFromTree(item.children, id) }
        : item
    );
}

function moveInSiblings(
  items: ResourceItem[],
  id: string,
  direction: ResourceMoveDirection
): ResourceItem[] {
  const index = items.findIndex((item) => item.id === id);
  if (index !== -1) {
    const next = [...items];
    const [moved] = next.splice(index, 1);
    const target =
      direction === "up"
        ? Math.max(0, index - 1)
        : direction === "down"
          ? Math.min(next.length, index + 1)
          : direction === "top"
            ? 0
            : next.length;
    next.splice(target, 0, moved);
    return next;
  }
  return items.map((item) =>
    item.children
      ? { ...item, children: moveInSiblings(item.children, id, direction) }
      : item
  );
}

type ExplorerStoryProps = Omit<
  ResourceExplorerProps,
  "items" | "filter" | "onFilterChange"
> & {
  items?: ResourceItem[];
  initialFilter?: string;
};

/** Keeps the pattern fully controlled by the story, like a real consumer. */
function Explorer({ items = sampleItems, initialFilter = "", ...rest }: ExplorerStoryProps) {
  const [data, setData] = useState(items);
  const [filter, setFilter] = useState(initialFilter);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<string[]>(["documents"]);

  return (
    <div className="w-[34rem] max-w-full">
      <ResourceExplorer
        {...rest}
        items={data}
        filter={filter}
        onFilterChange={setFilter}
        selectedId={selectedId}
        expandedIds={expandedIds}
        onSelect={(item) => setSelectedId(item.id)}
        onToggle={(item) =>
          setExpandedIds((previous) =>
            previous.includes(item.id)
              ? previous.filter((id) => id !== item.id)
              : [...previous, item.id]
          )
        }
        onRename={(item, label) => setData((current) => renameInTree(current, item.id, label))}
        onDelete={(item) => setData((current) => removeFromTree(current, item.id))}
        onMove={(item, direction) =>
          setData((current) => moveInSiblings(current, item.id, direction))
        }
        onCreate={() => {}}
        onUndo={() => {}}
      />
    </div>
  );
}

const meta = {
  title: "Patterns/ResourceExplorer",
  component: ResourceExplorer,
  parameters: { layout: "centered" },
  args: {
    items: sampleItems,
  },
  render: (args) => <Explorer {...args} />,
} satisfies Meta<typeof ResourceExplorer>;

export default meta;
type Story = StoryObj<ExplorerStoryProps>;

export const Default: Story = {};

export const Loading: Story = {
  args: { loading: true },
};

export const EmptyRoot: Story = {
  render: (args) => <Explorer {...args} items={[]} onCreate={() => {}} />,
};

export const NoMatch: Story = {
  render: (args) => <Explorer {...args} initialFilter="zzz" />,
};

export const ErrorWithRetry: Story = {
  args: {
    error: "Could not load the folder. Check your connection and try again.",
    onRetry: () => {},
  },
};

export const DisabledItems: Story = {
  args: {
    items: [
      { id: "available", label: "Available" },
      { id: "locked", label: "Locked", disabled: true },
      { id: "readonly", label: "Read-only", disabled: true },
    ],
  },
};

export const LongAndLocalizedText: Story = {
  render: (args) => <Explorer {...args} items={localizedItems} />,
};
