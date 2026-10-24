import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { SearchField } from "../src/ui/search-field";

function ControlledSearch({
  onSearch,
  onClear,
  initial = "",
  loading = false,
  disabled = false,
}: {
  onSearch?: (query: string) => void;
  onClear?: () => void;
  initial?: string;
  loading?: boolean;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState(initial);
  return (
    <SearchField
      label="Search documents"
      query={query}
      onQueryChange={setQuery}
      onSearch={onSearch}
      onClear={onClear}
      loading={loading}
      disabled={disabled}
      showSubmit
    />
  );
}

describe("SearchField", () => {
  it("provides a real searchbox and reports controlled input changes", async () => {
    render(<ControlledSearch />);
    const input = screen.getByRole("searchbox", { name: "Search documents" });
    await userEvent.type(input, "solar panels");
    expect(input).toHaveValue("solar panels");
    expect(screen.getByRole("button", { name: "Clear search" })).toBeInTheDocument();
  });

  it("clears the query and restores input focus", async () => {
    const onClear = vi.fn();
    render(<ControlledSearch initial="home insurance" onClear={onClear} />);
    const input = screen.getByRole("searchbox");
    await userEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(input).toHaveValue("");
    expect(input).toHaveFocus();
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument();
  });

  it("submits with Enter or the optional button but not on an empty query", async () => {
    const onSearch = vi.fn();
    const { rerender } = render(<ControlledSearch initial="heat pumps" onSearch={onSearch} />);
    const input = screen.getByRole("searchbox");
    await userEvent.type(input, "{Enter}");
    await userEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(onSearch).toHaveBeenCalledTimes(2);
    expect(onSearch).toHaveBeenLastCalledWith("heat pumps");

    rerender(<SearchField query="  " onQueryChange={() => {}} onSearch={onSearch} showSubmit />);
    await userEvent.type(screen.getByRole("searchbox"), "{Enter}");
    expect(screen.getByRole("button", { name: "Search" })).toBeDisabled();
    expect(onSearch).toHaveBeenCalledTimes(2);
  });

  it("allows editing while busy but does not repeat an in-flight search", async () => {
    const onSearch = vi.fn();
    render(<ControlledSearch initial="mortgage" loading onSearch={onSearch} />);
    const input = screen.getByRole("searchbox");
    await userEvent.type(input, " rates{Enter}");
    expect(input).toHaveValue("mortgage rates");
    expect(screen.getByRole("button", { name: "Search" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Searching");
    expect(onSearch).not.toHaveBeenCalled();
  });

  it("announces loading outside the busy input so screen readers can hear it immediately", () => {
    render(<ControlledSearch initial="mortgage" loading />);
    const input = screen.getByRole("searchbox");
    const status = screen.getByRole("status");
    expect(input).toHaveAttribute("aria-busy", "true");
    expect(status).toHaveTextContent("Searching");
    expect(status.closest('[aria-busy="true"]')).toBeNull();
  });

  it("does not clear or submit during IME composition", () => {
    const onSearch = vi.fn();
    const onQueryChange = vi.fn();
    render(<SearchField query="東京" onQueryChange={onQueryChange} onSearch={onSearch} />);
    const input = screen.getByRole("searchbox");
    fireEvent.compositionStart(input);
    fireEvent.keyDown(input, { key: "Escape" });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.compositionEnd(input);
    expect(onQueryChange).not.toHaveBeenCalled();
    expect(onSearch).not.toHaveBeenCalled();
  });

  it("ignores clear and submit when disabled", async () => {
    const onSearch = vi.fn();
    const onClear = vi.fn();
    render(<ControlledSearch initial="roof" disabled onSearch={onSearch} onClear={onClear} />);
    expect(screen.getByRole("searchbox")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Clear search" })).toBeNull();
    expect(screen.getByRole("button", { name: "Search" })).toBeDisabled();
    expect(onClear).not.toHaveBeenCalled();
    expect(onSearch).not.toHaveBeenCalled();
  });

  it("preserves field description, validation and external ARIA wiring", () => {
    render(
      <>
        <p id="external-help">External search help</p>
        <SearchField
          query="x"
          onQueryChange={() => {}}
          label="Evidence"
          description="Search saved passages"
          error="Unable to search"
          aria-describedby="external-help"
        />
      </>
    );
    const input = screen.getByRole("searchbox", { name: "Evidence" });
    const describedBy = input.getAttribute("aria-describedby") ?? "";
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(describedBy).toContain("external-help");
    expect(describedBy).toContain(screen.getByText("Search saved passages").id);
    expect(describedBy).toContain(screen.getByRole("alert").id);
  });

  it("allows a custom filter action and forwards the input ref", () => {
    const ref = createRef<HTMLInputElement>();
    render(
      <SearchField
        ref={ref}
        query=""
        onQueryChange={() => {}}
        filterAction={<button type="button">Filters</button>}
      />
    );
    expect(ref.current).toBe(screen.getByRole("searchbox"));
    expect(screen.getByRole("button", { name: "Filters" })).toBeInTheDocument();
  });

  it("has no detectable accessible-name or form errors in its default state", async () => {
    const { container } = render(<ControlledSearch initial="window repairs" />);
    const result = await axe.run(container, {
      rules: {
        "color-contrast": { enabled: false },
        region: { enabled: false },
        "landmark-one-main": { enabled: false },
        "page-has-heading-one": { enabled: false },
        "html-has-lang": { enabled: false },
        "document-title": { enabled: false },
      },
    });
    expect(result.violations.map(({ id }) => id)).toEqual([]);
  });
});
