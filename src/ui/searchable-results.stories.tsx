import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { SearchableResults } from "./searchable-results";
import type { SearchableResult, SearchableResultsProps } from "./searchable-results";

const documents: SearchableResult[] = [
  {
    id: "doc-overview",
    title: "Product overview",
    subtitle: "What the platform does, in two minutes.",
    href: "/docs/overview",
  },
  {
    id: "doc-install",
    title: "Installation",
    subtitle: "Add the registry and pull components.",
    href: "/docs/install",
  },
  {
    id: "doc-tokens",
    title: "Theming and tokens",
    subtitle: "Semantic tokens, appearance and density.",
    href: "/docs/tokens",
  },
  {
    id: "doc-changelog",
    title: "Changelog",
    subtitle: "Not yet available.",
    disabled: true,
  },
];

const groupedResults: SearchableResult[] = [
  { id: "guide-start", title: "Getting started", group: "Guides", href: "/guides/start" },
  { id: "guide-theme", title: "Theming guide", group: "Guides", href: "/guides/theme" },
  { id: "api-props", title: "Component props", group: "API", href: "/api/props" },
  { id: "api-slots", title: "Slots and composition", group: "API", href: "/api/slots" },
];

const localizedResults: SearchableResult[] = [
  {
    id: "ja-overview",
    title: "製品の概要と導入ガイド",
    subtitle: "プラットフォームの概要を短時間で把握できます。",
    href: "/docs/ja/overview",
  },
  {
    id: "long-url",
    title:
      "https://example.com/documentation/search/restricted-destinations-and-customs-review",
    subtitle: "A long URL used to check wrapping without clipping or horizontal overflow.",
    href: "https://example.com/documentation/search/restricted-destinations-and-customs-review",
  },
  {
    id: "mixed",
    title: "Searchable results with a very long English title that must wrap across multiple lines",
    subtitle: "長いタイトルとサブタイトルが折り返され、はみ出さないことを確認します。",
    href: "/docs/long",
  },
];

type ControlledResultsProps = Omit<SearchableResultsProps, "query" | "onQueryChange"> & {
  initialQuery?: string;
};

/** Query is controlled by the consumer; the story keeps it in local state. */
function ControlledResults({ initialQuery = "", ...rest }: ControlledResultsProps) {
  const [query, setQuery] = useState(initialQuery);
  return <SearchableResults {...rest} query={query} onQueryChange={setQuery} />;
}

const meta = {
  title: "Components/Searchable Results",
  component: SearchableResults,
  parameters: { layout: "centered" },
  args: {
    label: "Search results",
    results: documents,
  },
  render: (args) => (
    <div className="w-[32rem] max-w-full">
      <ControlledResults {...args} />
    </div>
  ),
} satisfies Meta<typeof SearchableResults>;

export default meta;
type Story = StoryObj<ControlledResultsProps>;

export const Default: Story = {
  render: (args) => (
    <div className="w-[32rem] max-w-full">
      <ControlledResults {...args} initialQuery="install" />
    </div>
  ),
};

export const WithGroups: Story = {
  args: { results: groupedResults, label: "Search the documentation" },
};

export const WithDisabledResult: Story = {
  render: (args) => (
    <div className="w-[32rem] max-w-full">
      <ControlledResults {...args} initialQuery="changelog" />
    </div>
  ),
};

export const Loading: Story = {
  args: { loading: true },
};

export const Empty: Story = {
  args: { results: [], emptyMessage: "No documents match your search yet." },
};

export const WithLoadMore: Story = {
  args: {
    results: documents,
    hasMore: true,
    onLoadMore: () => {},
  },
};

export const Controlled: Story = {
  render: (args) => {
    function Example() {
      const [query, setQuery] = useState("theming");
      return (
        <div className="flex w-[32rem] max-w-full flex-col gap-3">
          <span data-testid="query-readout" className="text-sm text-muted-foreground">
            Query: {query || "(empty)"}
          </span>
          <SearchableResults {...args} query={query} onQueryChange={setQuery} />
        </div>
      );
    }
    return <Example />;
  },
};

export const LongAndLocalizedText: Story = {
  args: {
    results: localizedResults,
    label: "ドキュメントを検索",
  },
  render: (args) => (
    <div className="w-80 max-w-full">
      <ControlledResults {...args} initialQuery="search" />
    </div>
  ),
};
