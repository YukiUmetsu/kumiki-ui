import { createRef, useState } from "react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { SearchableResults } from "../src/ui/searchable-results";
import type { SearchableResult } from "../src/ui/searchable-results";

const results: SearchableResult[] = [
  { id: "overview", title: "Product overview", subtitle: "Two minutes.", href: "/overview" },
  { id: "install", title: "Installation", subtitle: "Add the registry.", href: "/install" },
  { id: "changelog", title: "Changelog", subtitle: "Not yet available.", disabled: true },
];

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

function basic(props: Partial<ComponentProps<typeof SearchableResults>> = {}) {
  return (
    <SearchableResults
      query=""
      onQueryChange={() => {}}
      results={results}
      label="Search results"
      {...props}
    />
  );
}

describe("SearchableResults", () => {
  it("labels the query field and reports every change through onQueryChange", async () => {
    const onQueryChange = vi.fn();
    function Harness() {
      const [query, setQuery] = useState("");
      return (
        <SearchableResults
          query={query}
          onQueryChange={(next) => {
            setQuery(next);
            onQueryChange(next);
          }}
          results={results}
          label="Search results"
        />
      );
    }

    render(<Harness />);
    const input = screen.getByRole("searchbox", { name: "Search results" });
    expect(input).toHaveValue("");

    await userEvent.type(input, "cat");

    expect(onQueryChange).toHaveBeenLastCalledWith("cat");
    expect(input).toHaveValue("cat");
  });

  it("keeps the input value controlled by the consumer", async () => {
    const onQueryChange = vi.fn();
    render(basic({ query: "fixed", onQueryChange }));

    const input = screen.getByRole("searchbox", { name: "Search results" });
    await userEvent.type(input, "x");

    expect(onQueryChange).toHaveBeenCalled();
    expect(input).toHaveValue("fixed");
  });

  it("renders available results as links and disabled rows as inert text", () => {
    render(basic());

    expect(screen.getAllByRole("link")).toHaveLength(2);
    expect(screen.getByRole("link", { name: /Product overview/ })).toHaveAttribute(
      "href",
      "/overview"
    );
    expect(screen.queryByRole("link", { name: /Changelog/ })).toBeNull();
    expect(screen.getByText("Changelog")).toBeInTheDocument();
  });

  it("groups consecutive results under their accessible group names", () => {
    render(
      basic({
        results: [
          { id: "g1", title: "Getting started", group: "Guides", href: "/guides/start" },
          { id: "g2", title: "Theming guide", group: "Guides", href: "/guides/theme" },
          { id: "a1", title: "Component props", group: "API", href: "/api/props" },
        ],
      })
    );

    const guides = screen.getByRole("group", { name: "Guides" });
    expect(within(guides).getAllByRole("link")).toHaveLength(2);
    expect(screen.getByRole("group", { name: "API" })).toBeInTheDocument();
  });

  it("wraps query matches in a mark element and honours highlightQuery", () => {
    const { container, rerender } = render(
      basic({ query: "app", results: [{ id: "apple", title: "Apple pie", href: "/apple" }] })
    );

    const mark = container.querySelector("mark");
    expect(mark).not.toBeNull();
    expect(mark).toHaveTextContent("App");

    rerender(
      basic({
        query: "app",
        highlightQuery: false,
        results: [{ id: "apple", title: "Apple pie", href: "/apple" }],
      })
    );
    expect(container.querySelector("mark")).toBeNull();
  });

  it("shows a clear empty state instead of a blank area", () => {
    const { rerender } = render(basic({ results: [] }));

    expect(screen.getByText("No results found.")).toBeInTheDocument();

    rerender(basic({ results: [], emptyMessage: "Nothing matches that query." }));
    expect(screen.getByText("Nothing matches that query.")).toBeInTheDocument();
    expect(screen.queryByText("No results found.")).toBeNull();
  });

  it("announces loading with aria-busy and a polite status message", () => {
    const { container } = render(basic({ loading: true }));

    const region = container.querySelector('[data-part="results"]');
    expect(region).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveTextContent(/loading results/i);
    expect(container.querySelector('[data-part="skeleton"]')).not.toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("calls onLoadMore and disables the button while loading", async () => {
    const onLoadMore = vi.fn();
    const { rerender } = render(basic({ hasMore: true, onLoadMore }));

    const button = screen.getByRole("button", { name: "Load more" });
    expect(button).toBeEnabled();

    await userEvent.click(button);
    expect(onLoadMore).toHaveBeenCalledTimes(1);

    rerender(basic({ hasMore: true, onLoadMore, loading: true }));
    expect(screen.getByRole("button", { name: "Load more" })).toBeDisabled();
  });

  it("forwards the ref, merges className and passes arbitrary div props", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <SearchableResults
        ref={ref}
        className="custom-results"
        data-testid="results-root"
        query=""
        onQueryChange={() => {}}
        results={results}
        label="Search results"
      />
    );

    const root = screen.getByTestId("results-root");
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute("data-km-searchable-results");
    expect(root).toHaveClass("custom-results");
    expect(root).toHaveClass("flex");
  });

  it("has no detectable accessibility violations in a grouped state with mixed rows", async () => {
    render(
      basic({
        results: [
          {
            id: "overview",
            title: "Product overview",
            subtitle: "Two minutes.",
            group: "Guides",
            href: "/overview",
          },
          { id: "theme", title: "Theming guide", group: "Guides", href: "/guides/theme" },
          {
            id: "changelog",
            title: "Changelog",
            subtitle: "Not yet available.",
            group: "Reference",
            disabled: true,
          },
        ],
      })
    );

    await expectNoViolations(document.body);
  });
});
