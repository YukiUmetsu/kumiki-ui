import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "../ui/badge";
import { DataDetailsWorkspace } from "./data-details-workspace";
import type {
  DataDetailsColumn,
  DataDetailsRow,
  DataDetailsSort,
  DataDetailsWorkspaceProps,
} from "./data-details-workspace";

const rows: DataDetailsRow[] = [
  { id: "item-01", name: "Item 01", status: "Active", updated: "2026-02-14" },
  { id: "item-02", name: "Item 02", status: "Draft", updated: "2026-02-11" },
  { id: "item-03", name: "Item 03", status: "Paused", updated: "2026-01-30" },
  { id: "item-04", name: "Item 04", status: "Active", updated: "2026-01-22" },
];

const statusTone: Record<string, "success" | "warning" | "neutral"> = {
  Active: "success",
  Draft: "neutral",
  Paused: "warning",
};

const columns: DataDetailsColumn[] = [
  { key: "name", header: "Name", sortable: true },
  {
    key: "status",
    header: "Status",
    sortable: true,
    render: (row) => (
      <Badge variant={statusTone[String(row.status)] ?? "neutral"}>
        {String(row.status)}
      </Badge>
    ),
  },
  { key: "updated", header: "Updated", sortable: true },
];

const localizedRows: DataDetailsRow[] = [
  {
    id: "ja-1",
    name: "山田 太郎",
    status: "進行中",
    updated: "2026年2月14日",
  },
  {
    id: "ja-2",
    name: "https://example.com/workspace/items/a-very-long-identifier-that-must-wrap",
    status: "保留",
    updated: "2026年1月30日",
  },
];

const localizedColumns: DataDetailsColumn[] = [
  { key: "name", header: "名前", sortable: true },
  { key: "status", header: "ステータス", sortable: true },
  { key: "updated", header: "更新日", sortable: true },
];

function renderDetail(row: DataDetailsRow) {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-serif text-subheading font-normal tracking-subheading text-foreground">
        {String(row.name)}
      </h3>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Status</dt>
        <dd className="text-foreground">{String(row.status)}</dd>
        <dt className="text-muted-foreground">Updated</dt>
        <dd className="text-foreground">{String(row.updated)}</dd>
      </dl>
    </div>
  );
}

type WorkspaceStoryProps = Omit<
  DataDetailsWorkspaceProps,
  "selectedId" | "onSelect" | "sort" | "onSortChange"
> & {
  initialSelectedId?: string;
  initialSort?: DataDetailsSort | null;
};

/** Selection and sort are controlled by the consumer; the story keeps them locally. */
function ControlledWorkspace({
  initialSelectedId,
  initialSort = null,
  ...rest
}: WorkspaceStoryProps) {
  const [selectedId, setSelectedId] = useState(initialSelectedId);
  const [sort, setSort] = useState<DataDetailsSort | null>(initialSort);

  return (
    <DataDetailsWorkspace
      {...rest}
      sort={sort}
      onSortChange={(key) =>
        setSort((current) =>
          current?.key === key && current.direction === "ascending"
            ? { key, direction: "descending" }
            : { key, direction: "ascending" }
        )
      }
      selectedId={selectedId}
      onSelect={(row) => setSelectedId(row.id)}
    />
  );
}

const meta = {
  title: "Patterns/Data Details Workspace",
  component: DataDetailsWorkspace,
  parameters: { layout: "padded" },
  args: {
    title: "Workspace",
    description: "Scan the list, select a row, and review its details alongside.",
    columns,
    rows,
    renderDetail,
  },
  render: (args) => (
    <div className="h-[32rem] w-full">
      <ControlledWorkspace {...args} />
    </div>
  ),
} satisfies Meta<typeof DataDetailsWorkspace>;

export default meta;
type Story = StoryObj<WorkspaceStoryProps>;

export const Default: Story = {
  render: (args) => (
    <div className="h-[32rem] w-full">
      <ControlledWorkspace {...args} initialSort={{ key: "name", direction: "ascending" }} />
    </div>
  ),
};

export const WithSelection: Story = {
  render: (args) => (
    <div className="h-[32rem] w-full">
      <ControlledWorkspace {...args} initialSelectedId="item-02" />
    </div>
  ),
};

export const Loading: Story = {
  args: { loading: true },
};

export const Empty: Story = {
  args: { rows: [], emptyMessage: "No items found." },
};

export const Error: Story = {
  args: {
    rows: [],
    error: "The list could not be loaded.",
    onRetry: () => {},
  },
};

export const Stacked: Story = {
  parameters: { layout: "padded" },
  render: (args) => (
    <div className="h-[40rem] w-full max-w-sm">
      <ControlledWorkspace {...args} orientation="vertical" />
    </div>
  ),
};

export const LongAndLocalizedText: Story = {
  args: {
    title: "ワークスペース",
    description: "行を選択すると、詳細が隣のパネルに表示されます。",
    columns: localizedColumns,
    rows: localizedRows,
    renderDetail,
    labels: { emptyDetail: "項目を選択すると詳細が表示されます。" },
  },
  render: (args) => (
    <div className="h-[32rem] w-full max-w-2xl">
      <ControlledWorkspace {...args} />
    </div>
  ),
};
