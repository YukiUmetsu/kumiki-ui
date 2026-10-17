import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Table } from "./table";
import type { TableSortDirection } from "./table";
import { Skeleton } from "./skeleton";

const meta = {
  title: "Components/Table",
  component: Table,
  parameters: { layout: "padded" },
  args: { stickyHeader: false },
  argTypes: { stickyHeader: { control: "boolean" } },
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

interface Invoice {
  number: string;
  account: string;
  status: string;
  total: string;
}

const invoices: Invoice[] = [
  { number: "INV-2041", account: "Northwind Studio", status: "Paid", total: "$1,240.00" },
  { number: "INV-2042", account: "Lumen Works", status: "Pending", total: "$320.00" },
  { number: "INV-2043", account: "Harbor Labs", status: "Overdue", total: "$2,860.50" },
  { number: "INV-2044", account: "Cedar & Co.", status: "Paid", total: "$96.00" },
];

function InvoiceRows({ rows = invoices }: { rows?: Invoice[] }) {
  return (
    <Table.Body>
      {rows.map((invoice) => (
        <Table.Row key={invoice.number}>
          <Table.Head scope="row" className="font-medium text-foreground">
            {invoice.number}
          </Table.Head>
          <Table.Cell>{invoice.account}</Table.Cell>
          <Table.Cell>{invoice.status}</Table.Cell>
          <Table.Cell className="text-end tabular-nums">{invoice.total}</Table.Cell>
        </Table.Row>
      ))}
    </Table.Body>
  );
}

function InvoiceHead() {
  return (
    <Table.Header>
      <Table.Row>
        <Table.Head>Invoice</Table.Head>
        <Table.Head>Account</Table.Head>
        <Table.Head>Status</Table.Head>
        <Table.Head className="text-end">Total</Table.Head>
      </Table.Row>
    </Table.Header>
  );
}

export const Default: Story = {
  render: () => (
    <Table aria-label="Recent invoices">
      <InvoiceHead />
      <InvoiceRows />
    </Table>
  ),
};

export const WithCaption: Story = {
  render: () => (
    <Table>
      <Table.Caption>Recent invoices, newest first</Table.Caption>
      <InvoiceHead />
      <InvoiceRows />
      <Table.Footer>
        <Table.Row>
          <Table.Cell colSpan={3}>4 invoices</Table.Cell>
          <Table.Cell className="text-end tabular-nums">$4,516.50</Table.Cell>
        </Table.Row>
      </Table.Footer>
    </Table>
  ),
};

type SortColumn = "account" | "total";

export const Sortable: Story = {
  render: () => {
    function SortableExample() {
      const [sort, setSort] = useState<{ column: SortColumn; direction: TableSortDirection }>({
        column: "account",
        direction: "ascending",
      });

      function toggle(column: SortColumn) {
        setSort((current) =>
          current.column === column
            ? {
                column,
                direction: current.direction === "ascending" ? "descending" : "ascending",
              }
            : { column, direction: "ascending" }
        );
      }

      const rows = [...invoices].sort((left, right) => {
        const factor = sort.direction === "descending" ? -1 : 1;
        if (sort.column === "total") {
          const parse = (value: string) => Number(value.replace(/[^0-9.]/g, ""));
          return (parse(left.total) - parse(right.total)) * factor;
        }
        return left.account.localeCompare(right.account) * factor;
      });

      const directionFor = (column: SortColumn): TableSortDirection =>
        sort.column === column ? sort.direction : "none";

      return (
        <div className="flex flex-col gap-3">
          <Table aria-label="Invoices, sortable columns">
            <Table.Header>
              <Table.Row>
                <Table.Head>Invoice</Table.Head>
                <Table.Head
                  sortDirection={directionFor("account")}
                  onSortChange={() => toggle("account")}
                >
                  Account
                </Table.Head>
                <Table.Head>Status</Table.Head>
                <Table.Head
                  className="text-end"
                  sortDirection={directionFor("total")}
                  onSortChange={() => toggle("total")}
                >
                  Total
                </Table.Head>
              </Table.Row>
            </Table.Header>
            <InvoiceRows rows={rows} />
          </Table>
          <p data-testid="sort-readout" className="text-sm text-muted-foreground">
            Sorted by {sort.column}, {sort.direction}
          </p>
        </div>
      );
    }

    return <SortableExample />;
  },
};

export const StickyHeader: Story = {
  render: () => {
    const many = Array.from({ length: 18 }, (_, index) => ({
      number: `INV-${3000 + index}`,
      account: ["Northwind Studio", "Lumen Works", "Harbor Labs", "Cedar & Co."][index % 4],
      status: ["Paid", "Pending", "Overdue"][index % 3],
      total: `$${(120 + index * 37.5).toFixed(2)}`,
    }));

    return (
      <Table aria-label="All invoices" stickyHeader maxHeight={280}>
        <InvoiceHead />
        <InvoiceRows rows={many} />
      </Table>
    );
  },
};

export const EmptyState: Story = {
  render: () => (
    <Table aria-label="Invoices">
      <InvoiceHead />
      <Table.Body>
        <Table.Row>
          <Table.Cell colSpan={4} className="py-10 text-center text-muted-foreground">
            No invoices match these filters. Clear the filters to see all invoices.
          </Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table>
  ),
};

export const LoadingState: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <p role="status" className="text-sm text-muted-foreground">
        Loading invoices…
      </p>
      <Table aria-label="Invoices" aria-busy="true">
        <InvoiceHead />
        <Table.Body>
          {Array.from({ length: 4 }, (_, index) => (
            <Table.Row key={index}>
              <Table.Cell>
                <Skeleton shape="text" height={12} width="60%" />
              </Table.Cell>
              <Table.Cell>
                <Skeleton shape="text" height={12} width="80%" />
              </Table.Cell>
              <Table.Cell>
                <Skeleton shape="text" height={12} width="45%" />
              </Table.Cell>
              <Table.Cell>
                <Skeleton shape="text" height={12} width="50%" />
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </div>
  ),
};

export const NarrowOverflow: Story = {
  render: () => (
    <div className="w-80 max-w-full">
      <Table aria-label="Deployments">
        <Table.Header>
          <Table.Row>
            <Table.Head>Deployment</Table.Head>
            <Table.Head>Commit</Table.Head>
            <Table.Head>Environment</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          <Table.Row>
            <Table.Cell className="whitespace-nowrap">deploy-2026-10-16-1830</Table.Cell>
            <Table.Cell className="whitespace-nowrap">
              https://example.com/repository/commit/8f4c2d1e9b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e
            </Table.Cell>
            <Table.Cell className="whitespace-nowrap">production-eu-central-1</Table.Cell>
          </Table.Row>
          <Table.Row>
            <Table.Cell className="whitespace-nowrap">deploy-2026-10-16-1745</Table.Cell>
            <Table.Cell className="whitespace-nowrap">2c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d</Table.Cell>
            <Table.Cell className="whitespace-nowrap">staging-eu-central-1</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>
    </div>
  ),
};

export const LongAndLocalizedText: Story = {
  render: () => (
    <Table aria-label="ワークスペースのメンバー">
      <Table.Caption>ワークスペースのメンバーと最終アクセス</Table.Caption>
      <Table.Header>
        <Table.Row>
          <Table.Head>メンバー</Table.Head>
          <Table.Head>役割</Table.Head>
          <Table.Head>プロフィール</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        <Table.Row>
          <Table.Head scope="row" className="font-medium text-foreground">
            山田 太郎
          </Table.Head>
          <Table.Cell>オーナー</Table.Cell>
          <Table.Cell>https://example.com/people/taro-yamada-with-a-very-long-profile-slug</Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.Head scope="row" className="font-medium text-foreground">
            Aleksandra Kowalczyk-Nowakowska
          </Table.Head>
          <Table.Cell>編集者</Table.Cell>
          <Table.Cell>最終アクセス: 2026年10月16日 18:30</Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.Head scope="row" className="font-medium text-foreground">
            佐藤 花子
          </Table.Head>
          <Table.Cell>閲覧者</Table.Cell>
          <Table.Cell>
            長いテキストやCJKのコンテンツは折り返され、クリップされません。
          </Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table>
  ),
};
