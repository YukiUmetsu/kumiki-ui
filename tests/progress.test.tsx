import { createRef, useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Progress } from "../src/ui/progress";

describe("Progress", () => {
  it("exposes the progressbar role and an accessible name from the label", () => {
    render(<Progress label="Uploading files" progress={0.4} />);
    expect(screen.getByRole("progressbar")).toHaveAccessibleName("Uploading files");
  });

  it("reports a truthful value on the 0–1 scale", () => {
    render(<Progress label="Uploading files" progress={0.4} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "1");
    expect(bar).toHaveAttribute("aria-valuenow", "0.4");
  });

  it("announces a rounded percentage as aria-valuetext", () => {
    render(<Progress label="Uploading" progress={1 / 3} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "33%");
  });

  it("keeps the visible percentage equal to the announced value", () => {
    render(<Progress label="Uploading" progress={0.42} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuetext", "42%");
    expect(screen.getByText("42%")).toBeInTheDocument();
  });

  it("clamps out-of-range values instead of reporting impossible progress", () => {
    const { rerender } = render(<Progress label="Over" progress={1.5} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "100%");

    rerender(<Progress label="Under" progress={-0.5} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "0%");
  });

  it("omits every value attribute in indeterminate mode — no fabricated number", () => {
    render(<Progress label="Loading" mode="indeterminate" progress={0.4} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).not.toHaveAttribute("aria-valuenow");
    expect(bar).not.toHaveAttribute("aria-valuemin");
    expect(bar).not.toHaveAttribute("aria-valuemax");
    expect(bar).not.toHaveAttribute("aria-valuetext");
    expect(screen.queryByText("40%")).toBeNull();
  });

  it("keeps the value and announcement consistent across async updates", async () => {
    function Controlled() {
      const [progress, setProgress] = useState(0);
      return (
        <div>
          <Progress label="Syncing" progress={progress} />
          <button type="button" onClick={() => setProgress(0.75)}>
            advance
          </button>
        </div>
      );
    }
    render(<Controlled />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "0");

    await userEvent.click(screen.getByRole("button", { name: "advance" }));

    expect(bar).toHaveAttribute("aria-valuenow", "0.75");
    expect(bar).toHaveAttribute("aria-valuetext", "75%");
    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("marks a disabled bar as inert without hiding its value", () => {
    render(<Progress label="Paused" progress={0.4} disabled />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-disabled", "true");
    expect(bar.closest("[data-disabled]")).not.toBeNull();
    expect(bar).toHaveAttribute("aria-valuenow", "0.4");
  });

  it("accepts a consumer provided accessible name when there is no label", () => {
    render(<Progress aria-label="Preparing export" progress={0.1} />);
    expect(screen.getByRole("progressbar")).toHaveAccessibleName("Preparing export");
  });

  it("forwards its ref to the progressbar element", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Progress label="Ref" progress={0.2} ref={ref} />);
    expect(ref.current).toBe(screen.getByRole("progressbar"));
  });

  it("puts className on the wrapper and forwards DOM props to the progressbar", () => {
    render(<Progress label="Custom" progress={0.5} className="mt-4" data-testid="bar" />);
    const bar = screen.getByTestId("bar");
    expect(bar).toHaveAttribute("role", "progressbar");
    const wrapper = bar.parentElement;
    expect(wrapper).toHaveClass("mt-4");
    expect(wrapper).toHaveAttribute("data-mode", "determinate");
  });

  it("renders a long CJK label without truncating it", () => {
    const label = "アップロード中のファイルを検証しています";
    render(<Progress label={label} progress={0.25} />);
    expect(screen.getByRole("progressbar")).toHaveAccessibleName(label);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
