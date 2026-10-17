import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { Slider } from "../src/ui/slider";

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
  const results = await axe.run(node, AXE_OPTIONS);
  expect(results.violations.map((violation) => `${violation.id}: ${violation.help}`)).toEqual([]);
}

describe("Slider", () => {
  it("exposes one named slider with complete value attributes", () => {
    render(<Slider label="Volume" defaultValue={30} showValue />);

    const thumb = screen.getByRole("slider", { name: "Volume" });
    expect(thumb).toHaveAttribute("aria-valuemin", "0");
    expect(thumb).toHaveAttribute("aria-valuemax", "100");
    expect(thumb).toHaveAttribute("aria-valuenow", "30");
    expect(thumb).toHaveAttribute("aria-valuetext", "30");
    expect(thumb).toHaveAttribute("aria-orientation", "horizontal");
    expect(screen.getByText("30")).toBeInTheDocument();
  });

  it("names the root group from the visible label", () => {
    render(<Slider label="Volume" defaultValue={10} />);
    expect(screen.getByRole("group")).toHaveAccessibleName("Volume");
  });

  it("uses formatValue for both aria-valuetext and the visible readout", () => {
    render(
      <Slider
        label="Volume"
        defaultValue={30}
        showValue
        formatValue={(value) => `${value} percent`}
      />
    );

    const thumb = screen.getByRole("slider", { name: "Volume" });
    expect(thumb).toHaveAttribute("aria-valuetext", "30 percent");
    expect(screen.getByText("30 percent")).toBeInTheDocument();
  });

  it("steps with arrows and jumps with Home, End, Page Up and Page Down", async () => {
    const user = userEvent.setup();
    render(<Slider label="Volume" defaultValue={30} />);
    const thumb = screen.getByRole("slider", { name: "Volume" });

    thumb.focus();
    await user.keyboard("{ArrowRight}");
    expect(thumb).toHaveAttribute("aria-valuenow", "31");

    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(thumb).toHaveAttribute("aria-valuenow", "29");

    await user.keyboard("{Home}");
    expect(thumb).toHaveAttribute("aria-valuenow", "0");

    await user.keyboard("{End}");
    expect(thumb).toHaveAttribute("aria-valuenow", "100");

    await user.keyboard("{PageDown}");
    expect(thumb).toHaveAttribute("aria-valuenow", "90");

    await user.keyboard("{PageUp}");
    expect(thumb).toHaveAttribute("aria-valuenow", "100");
  });

  it("respects a custom step and its page increment", async () => {
    const user = userEvent.setup();
    render(<Slider label="Opacity" min={0} max={1} step={0.05} defaultValue={0.5} />);
    const thumb = screen.getByRole("slider", { name: "Opacity" });

    expect(thumb).toHaveAttribute("aria-valuemin", "0");
    expect(thumb).toHaveAttribute("aria-valuemax", "1");

    thumb.focus();
    await user.keyboard("{ArrowRight}");
    expect(thumb).toHaveAttribute("aria-valuenow", "0.55");

    await user.keyboard("{PageUp}");
    expect(thumb).toHaveAttribute("aria-valuenow", "0.65");
  });

  it("renders one thumb per value and keeps range values ordered", async () => {
    const user = userEvent.setup();
    render(<Slider label="Price range" defaultValue={[20, 60]} showValue />);

    const thumbs = screen.getAllByRole("slider");
    expect(thumbs).toHaveLength(2);
    expect(thumbs[0]).toHaveAccessibleName("Price range minimum");
    expect(thumbs[1]).toHaveAccessibleName("Price range maximum");
    expect(thumbs[0]).toHaveAttribute("aria-valuenow", "20");
    expect(thumbs[1]).toHaveAttribute("aria-valuenow", "60");
    expect(screen.getByText("20 – 60")).toBeInTheDocument();

    thumbs[0].focus();
    await user.keyboard("{ArrowRight}");
    expect(thumbs[0]).toHaveAttribute("aria-valuenow", "21");

    thumbs[1].focus();
    await user.keyboard("{Home}");
    expect(thumbs[1]).toHaveAttribute("aria-valuenow", "21");
  });

  it("is fully inert when disabled", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Slider label="Volume" defaultValue={40} disabled onValueChange={onValueChange} />
    );

    const thumb = screen.getByRole("slider", { name: "Volume" });
    expect(thumb).toBeDisabled();
    expect(screen.getByRole("group")).toHaveAttribute("data-disabled", "");

    thumb.focus();
    await user.keyboard("{ArrowRight}{End}");
    expect(thumb).toHaveAttribute("aria-valuenow", "40");
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("reports keyboard changes to a controlled consumer", async () => {
    const user = userEvent.setup();

    function Controlled() {
      const [value, setValue] = useState(25);
      return (
        <div>
          <Slider
            label="Volume"
            value={value}
            onValueChange={(next) => {
              if (typeof next === "number") setValue(next);
            }}
          />
          <span data-testid="readout">{value}</span>
          <button type="button" onClick={() => setValue(80)}>
            reset to eighty
          </button>
        </div>
      );
    }

    render(<Controlled />);
    const thumb = screen.getByRole("slider", { name: "Volume" });

    thumb.focus();
    await user.keyboard("{ArrowRight}");
    expect(thumb).toHaveAttribute("aria-valuenow", "26");
    expect(screen.getByTestId("readout")).toHaveTextContent("26");

    await user.click(screen.getByRole("button", { name: "reset to eighty" }));
    expect(thumb).toHaveAttribute("aria-valuenow", "80");
  });

  it("moves an uncontrolled slider and reports the exact next value", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Slider
        label="Price range"
        defaultValue={[10, 40]}
        onValueChange={onValueChange}
      />
    );

    const thumbs = screen.getAllByRole("slider");
    thumbs[0].focus();
    await user.keyboard("{ArrowRight}");

    expect(thumbs[0]).toHaveAttribute("aria-valuenow", "11");
    expect(onValueChange).toHaveBeenCalledWith([11, 40]);
  });

  it("supports vertical orientation with aria-orientation and vertical arrows", async () => {
    const user = userEvent.setup();
    render(
      <Slider label="Volume" orientation="vertical" defaultValue={30} />
    );

    const thumb = screen.getByRole("slider", { name: "Volume" });
    expect(screen.getByRole("group")).toHaveAttribute("data-orientation", "vertical");
    expect(thumb).toHaveAttribute("aria-orientation", "vertical");

    thumb.focus();
    await user.keyboard("{ArrowUp}");
    expect(thumb).toHaveAttribute("aria-valuenow", "31");
    await user.keyboard("{ArrowDown}");
    expect(thumb).toHaveAttribute("aria-valuenow", "30");
  });

  it("forwards its ref to the root element", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Slider label="Volume" ref={ref} />);
    expect(ref.current).toBe(screen.getByRole("group"));
  });

  it("merges className on the root and forwards DOM props", () => {
    render(<Slider label="Volume" className="mt-4" data-testid="slider" />);
    const root = screen.getByTestId("slider");
    expect(root).toHaveClass("mt-4");
    expect(root).toHaveAttribute("data-km-slider", "");
    expect(root).toHaveAttribute("role", "group");
  });

  it("renders a long CJK label and a long formatted value without clipping the name", () => {
    const label = "許容するファイルサイズの上限を設定してください";
    render(
      <Slider
        label={label}
        defaultValue={750}
        max={2000}
        step={50}
        showValue
        formatValue={(value) => `${value.toLocaleString("ja-JP")} メガバイト（1日の上限）`}
      />
    );

    expect(screen.getByRole("slider", { name: label })).toHaveAttribute(
      "aria-valuetext",
      "750 メガバイト（1日の上限）"
    );
    expect(screen.getByText("750 メガバイト（1日の上限）")).toBeInTheDocument();
  });

  it("passes an axe scan in its most complex state", async () => {
    render(
      <Slider
        label="Price range"
        defaultValue={[200, 800]}
        min={0}
        max={1000}
        step={10}
        showValue
        formatValue={(value) => `${value.toLocaleString()} units`}
      />
    );

    await expectNoViolations(document.body);
  });
});
