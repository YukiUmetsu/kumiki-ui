import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./button";
import { SearchField } from "./search-field";
import type { SearchFieldProps } from "./search-field";

type DemoProps = Omit<SearchFieldProps, "query" | "onQueryChange"> & {
  initialQuery?: string;
};

function ControlledDemo({ initialQuery = "", ...props }: DemoProps) {
  const [query, setQuery] = useState(initialQuery);
  const [submitted, setSubmitted] = useState<string | null>(null);
  return (
    <div className="flex w-full max-w-2xl flex-col gap-3">
      <SearchField
        {...props}
        query={query}
        onQueryChange={setQuery}
        onSearch={(next) => {
          setSubmitted(next);
          props.onSearch?.(next);
        }}
      />
      {submitted ? (
        <p className="text-sm text-muted-foreground" role="status">Submitted query: {submitted}</p>
      ) : null}
    </div>
  );
}

function WithFilterDemo(props: DemoProps) {
  const [filter, setFilter] = useState<"All" | "Guides">("All");
  return (
    <ControlledDemo
      {...props}
      filterAction={
        <Button
          type="button"
          variant="outline"
          onClick={() => setFilter((current) => current === "All" ? "Guides" : "All")}
          aria-label={`Filter category: ${filter}. Toggle category`}
        >
          {filter === "All" ? "All types" : "Guides only"}
        </Button>
      }
    />
  );
}

const meta = {
  title: "Form fields/Search Field", id: "components-search-field",
  component: SearchField,
  parameters: { layout: "centered" },
  args: {
    query: "",
    onQueryChange: () => {},
    label: "Search the library",
    placeholder: "Search titles, topics, or keywords…",
  },
} satisfies Meta<typeof SearchField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div className="w-[38rem] max-w-[calc(100vw-3rem)]"><ControlledDemo {...args} /></div>
  ),
};

export const WithQuery: Story = {
  render: (args) => (
    <div className="w-[38rem] max-w-[calc(100vw-3rem)]">
      <ControlledDemo {...args} initialQuery="How heat pumps work" showSubmit />
    </div>
  ),
};

export const WithFilters: Story = {
  render: (args) => (
    <div className="w-[38rem] max-w-[calc(100vw-3rem)]">
      <WithFilterDemo {...args} initialQuery="Rebuilding a roof" showSubmit />
    </div>
  ),
};

export const Loading: Story = {
  render: (args) => (
    <div className="w-[38rem] max-w-[calc(100vw-3rem)]">
      <ControlledDemo {...args} initialQuery="Energy costs" showSubmit loading hint="You can refine your query while searching." />
    </div>
  ),
};

export const Error: Story = {
  render: (args) => (
    <div className="w-[38rem] max-w-[calc(100vw-3rem)]">
      <ControlledDemo {...args} initialQuery="Insurance" showSubmit error="The search could not be completed. Please try again." />
    </div>
  ),
};

export const Disabled: Story = {
  render: (args) => (
    <div className="w-[38rem] max-w-[calc(100vw-3rem)]">
      <ControlledDemo {...args} initialQuery="Unavailable search" disabled showSubmit description="Search is currently unavailable." />
    </div>
  ),
};

export const Compact: Story = {
  render: (args) => (
    <div className="w-72 max-w-[calc(100vw-3rem)]">
      <ControlledDemo {...args} label="Find a record" initialQuery="Foundation repairs" showSubmit />
    </div>
  ),
};

export const LongAndLocalized: Story = {
  render: (args) => (
    <div className="w-80 max-w-[calc(100vw-3rem)]">
      <ControlledDemo {...args} label="資料を検索" initialQuery="住宅の断熱性能と長期的なメンテナンス費用を比較する" showSubmit />
    </div>
  ),
};
