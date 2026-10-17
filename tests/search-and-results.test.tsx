import { useState } from "react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { SearchAndResults } from "../src/patterns/search-and-results";
import type { SearchFilter } from "../src/patterns/search-and-results";
import type { SearchableResult } from "../src/ui/searchable-results";

const results: SearchableResult[] = [
  { id: "alpha", title: "Project Alpha", subtitle: "Overview and owners.", href: "/alpha" },
  { id: "budget", title: "Budget 2025", subtitle: "Annual figures." },
  { id: "notes", title: "Meeting notes", subtitle: "Weekly sync." },
];

const categoryFilter: SearchFilter = {
  id: "category",
  label: "Category",
  type: "select",
  options: [
    { value: "docs", label: "Documents" },
    { value: "media", label: "Media" },
  ],
};

const tagsFilter: SearchFilter = {
  id: "tags",
  label: "Tags",
  type: "checkbox",
  options: [
    { value: "plan", label: "Plan" },
    { value: "finance", label: "Finance" },
  ],
};

const AXE_OPTIONS = {
  rules: {
    "color-contrast": { enabled: false },
    region: { enabled: false },
    "landmark-one-main": { enabled: false },
    "page-has-heading-one": { enabled: false },
    "html-has-lang": { enabled: false },
    "document-title": { enabled: false },
  },
} as Parameters<typeof axe.run>[1];

async function expectNoViolations(node: HTMLElement) {
  const axeResults = await axe.run(node, AXE_OPTIONS);
  expect(
    axeResults.violations.map((violation) => `${violation.id}: ${violation.help}`)
  ).toEqual([]);
}

type HarnessProps = Omit<
  ComponentProps<typeof SearchAndResults>,
  "query" | "onQueryChange" | "activeFilters"
> & {
  initialQuery?: string;
  initialFilters?: Record<string, string[]>;
  onChange?: (query: string) => void;
};

/** Query and filter state are controlled by the consumer; the harness keeps them local. */
function Harness({ initialQuery = "", initialFilters = {}, onChange, ...props }: HarnessProps) {
  const [query, setQuery] = useState(initialQuery);
  const [activeFilters, setActiveFilters] = useState(initialFilters);
  return (
    <SearchAndResults
      {...props}
      query={query}
      onQueryChange={(next) => {
        setQuery(next);
        onChange?.(next);
      }}
      activeFilters={activeFilters}
      onFiltersChange={(next) => {
        setActiveFilters(next);
        props.onFiltersChange?.(next);
      }}
    />
  );
}

describe("SearchAndResults", () => {
  it("renders the supplied result set", () => {
    render(
      <SearchAndResults
        query=""
        onQueryChange={() => {}}
        results={results}
        label="Search documents"
      />
    );

    expect(screen.getByText("Project Alpha")).toBeInTheDocument();
    expect(screen.getByText("Budget 2025")).toBeInTheDocument();
    expect(screen.getByText("Meeting notes")).toBeInTheDocument();
  });

  it("reports every keystroke through onQueryChange", async () => {
    const onChange = vi.fn();
    render(<Harness results={results} label="Search documents" onChange={onChange} />);

    const input = screen.getByRole("searchbox", { name: "Search documents" });
    await userEvent.type(input, "bud");

    expect(onChange).toHaveBeenLastCalledWith("bud");
    expect(input).toHaveValue("bud");
  });

  it("focuses the search field when / is pressed outside a text field", async () => {
    render(<Harness results={results} label="Search documents" />);

    const input = screen.getByRole("searchbox", { name: "Search documents" });
    expect(input).not.toHaveFocus();

    await userEvent.keyboard("/");

    expect(input).toHaveFocus();
  });

  it("clears the query with Escape and blurs on the second press", async () => {
    const onChange = vi.fn();
    render(
      <Harness
        results={results}
        label="Search documents"
        initialQuery="project"
        onChange={onChange}
      />
    );

    const input = screen.getByRole("searchbox", { name: "Search documents" });
    await userEvent.click(input);

    await userEvent.keyboard("{Escape}");
    expect(onChange).toHaveBeenLastCalledWith("");
    expect(input).toHaveValue("");

    await userEvent.keyboard("{Escape}");
    expect(input).not.toHaveFocus();
  });

  it("removes a filter when its chip is dismissed", async () => {
    const onFiltersChange = vi.fn();
    render(
      <Harness
        results={results}
        label="Search documents"
        filters={categoryFilter}
        initialFilters={{ category: ["docs"] }}
        onFiltersChange={onFiltersChange}
      />
    );

    const dismiss = screen.getByRole("button", { name: "Remove Category: Documents" });
    await userEvent.click(dismiss);

    expect(onFiltersChange).toHaveBeenCalledWith({});
    expect(
      screen.queryByRole("button", { name: "Remove Category: Documents" })
    ).toBeNull();
  });

  it("adds a value when a checkbox filter is checked", async () => {
    const onFiltersChange = vi.fn();
    render(
      <Harness
        results={results}
        label="Search documents"
        filters={tagsFilter}
        onFiltersChange={onFiltersChange}
      />
    );

    await userEvent.click(screen.getByRole("checkbox", { name: "Plan" }));

    expect(onFiltersChange).toHaveBeenCalledWith({ tags: ["plan"] });
  });

  it("shows a loading state and never the previous result set", () => {
    const { container } = render(
      <SearchAndResults
        query="project"
        onQueryChange={() => {}}
        results={results}
        loading
        label="Search documents"
      />
    );

    expect(screen.getByText(/loading results/i)).toBeInTheDocument();
    expect(screen.queryByText("Project Alpha")).toBeNull();
    expect(container.querySelector("[data-km-search-and-results]")).toHaveAttribute(
      "data-loading"
    );
  });

  it("shows the neutral empty message when nothing matches", () => {
    render(
      <SearchAndResults
        query="zzz"
        onQueryChange={() => {}}
        results={[]}
        label="Search documents"
      />
    );

    expect(screen.getByText("No items found.")).toBeInTheDocument();
  });

  it("renders a danger alert with a working Retry action on error", async () => {
    const onRetry = vi.fn();
    const { container } = render(
      <SearchAndResults
        query="project"
        onQueryChange={() => {}}
        results={results}
        error="The request failed."
        onRetry={onRetry}
        label="Search documents"
      />
    );

    expect(screen.getByText("Could not load results")).toBeInTheDocument();
    expect(screen.getByText("The request failed.")).toBeInTheDocument();
    expect(screen.queryByText("Project Alpha")).toBeNull();
    expect(container.querySelector("[data-km-search-and-results]")).toHaveAttribute(
      "data-error"
    );

    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("reports the activated result through onSelect", async () => {
    const onSelect = vi.fn();
    render(
      <SearchAndResults
        query=""
        onQueryChange={() => {}}
        results={results}
        onSelect={onSelect}
        label="Search documents"
      />
    );

    await userEvent.click(screen.getByText("Meeting notes"));

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "notes" }));
  });

  it("has no detectable accessibility violations with filters and chips", async () => {
    render(
      <SearchAndResults
        query="project"
        onQueryChange={() => {}}
        results={results}
        filters={[categoryFilter, tagsFilter]}
        activeFilters={{ category: ["docs"], tags: ["plan"] }}
        onFiltersChange={() => {}}
        label="Search documents"
      />
    );

    await expectNoViolations(document.body);
  });
});
