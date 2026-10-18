import { useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { SearchAndResults } from "./search-and-results";
import type {
  SearchAndResultsProps,
  SearchFilter,
} from "./search-and-results";
import type { SearchableResult } from "../ui/searchable-results";

interface Doc {
  id: string;
  title: string;
  subtitle: string;
  category: "docs" | "media";
  tags: string[];
}

const documents: Doc[] = [
  {
    id: "alpha",
    title: "Project Alpha",
    subtitle: "Overview, milestones and owners.",
    category: "docs",
    tags: ["plan"],
  },
  {
    id: "budget",
    title: "Budget 2025",
    subtitle: "Annual figures and forecast.",
    category: "docs",
    tags: ["finance"],
  },
  {
    id: "notes",
    title: "Meeting notes",
    subtitle: "Weekly sync, 12 March.",
    category: "media",
    tags: ["plan"],
  },
  {
    id: "tokens",
    title: "Theming and tokens",
    subtitle: "Semantic tokens and appearances.",
    category: "docs",
    tags: ["reference"],
  },
  {
    id: "clip",
    title: "Kickoff recording",
    subtitle: "Forty minutes.",
    category: "media",
    tags: ["reference"],
  },
];

const localizedDocuments: Doc[] = [
  {
    id: "ja-overview",
    title: "製品の概要と導入ガイド",
    subtitle: "プラットフォームの概要を短時間で把握できます。",
    category: "docs",
    tags: ["reference"],
  },
  {
    id: "long-title",
    title:
      "A very long document title that must wrap across multiple lines without clipping",
    subtitle: "長いタイトルとサブタイトルが折り返され、はみ出さないことを確認します。",
    category: "docs",
    tags: ["plan"],
  },
];

const filters: SearchFilter[] = [
  {
    id: "category",
    label: "Category",
    type: "select",
    options: [
      { value: "docs", label: "Documents" },
      { value: "media", label: "Media" },
    ],
  },
  {
    id: "tags",
    label: "Tags",
    type: "checkbox",
    options: [
      { value: "plan", label: "Plan" },
      { value: "finance", label: "Finance" },
      { value: "reference", label: "Reference" },
    ],
  },
];

type HarnessProps = Omit<
  SearchAndResultsProps,
  "query" | "onQueryChange" | "results" | "activeFilters" | "onFiltersChange"
> & {
  docs?: Doc[];
  initialQuery?: string;
  initialFilters?: Record<string, string[]>;
};

function toResult(doc: Doc): SearchableResult {
  return {
    id: doc.id,
    title: doc.title,
    subtitle: doc.subtitle,
    href: `#${doc.id}`,
  };
}

function filterDocuments(
  docs: Doc[],
  query: string,
  activeFilters: Record<string, string[]>
): SearchableResult[] {
  const needle = query.trim().toLowerCase();
  const category = activeFilters.category?.[0];
  const tags = activeFilters.tags ?? [];
  return docs
    .filter((doc) => {
      if (
        needle !== "" &&
        !doc.title.toLowerCase().includes(needle) &&
        !doc.subtitle.toLowerCase().includes(needle)
      ) {
        return false;
      }
      if (category && doc.category !== category) return false;
      if (tags.length > 0 && !tags.every((tag) => doc.tags.includes(tag))) return false;
      return true;
    })
    .map(toResult);
}

/** Query and filter state are controlled by the consumer; the story keeps both in local state. */
function Harness({
  docs = documents,
  initialQuery = "",
  initialFilters = {},
  ...rest
}: HarnessProps) {
  const [query, setQuery] = useState(initialQuery);
  const [activeFilters, setActiveFilters] = useState(initialFilters);
  const results = useMemo(
    () => filterDocuments(docs, query, activeFilters),
    [docs, query, activeFilters]
  );

  return (
    <div className="w-[36rem] max-w-full">
      <SearchAndResults
        {...rest}
        query={query}
        onQueryChange={setQuery}
        results={results}
        activeFilters={activeFilters}
        onFiltersChange={setActiveFilters}
      />
    </div>
  );
}

const meta = {
  title: "Patterns/Search and Results",
  component: SearchAndResults,
  parameters: { layout: "centered" },
  args: { label: "Search documents" },
  render: (args) => <Harness {...args} />,
} satisfies Meta<typeof SearchAndResults>;

export default meta;
type Story = StoryObj<HarnessProps>;

export const Default: Story = {};

export const WithFilters: Story = {
  args: { filters },
};

export const ActiveFilters: Story = {
  args: {
    filters,
    initialFilters: { category: ["docs"], tags: ["plan"] },
  },
};

export const WithLoadMore: Story = {
  args: { hasMore: true, onLoadMore: () => {} },
};

export const Loading: Story = {
  args: { filters, initialQuery: "project", loading: true },
};

export const Empty: Story = {
  args: { filters, initialQuery: "zzzz" },
};

export const ErrorWithRetry: Story = {
  args: {
    filters,
    error: "The request failed. Check your connection and try again.",
    onRetry: () => {},
  },
};

export const LongAndLocalizedText: Story = {
  args: {
    docs: localizedDocuments,
    label: "ドキュメントを検索",
    filters,
  },
  render: (args) => (
    <div className="w-80 max-w-full">
      <Harness {...args} />
    </div>
  ),
};

export const DarkAppearance: Story = {
  args: { filters },
  render: (args) => (
    <div data-km-appearance="dark" className="rounded-surface bg-canvas p-8">
      <Harness {...args} />
    </div>
  ),
};
