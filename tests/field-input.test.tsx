import { createRef, useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Field, Input } from "../src/ui/field-input";

describe("Field", () => {
  it("associates the label with the input", () => {
    render(<Field label="Email" />);
    const input = screen.getByLabelText("Email");
    expect(input).toBeInstanceOf(HTMLInputElement);
    const label = screen.getByText("Email");
    expect(label).toHaveAttribute("for", input.id);
    expect(input.id).toBeTruthy();
  });

  it("marks the input invalid and announces the error", () => {
    render(<Field label="Email" error="Email is required" />);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Email is required");
    expect(input.getAttribute("aria-describedby")).toContain(alert.id);
  });

  it("shows the hint only while there is no error", () => {
    const { rerender } = render(<Field label="Email" hint="We never share it" />);
    expect(screen.getByText("We never share it")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();

    rerender(<Field label="Email" hint="We never share it" error="Invalid" />);
    expect(screen.queryByText("We never share it")).toBeNull();
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid");
  });

  it("keeps a persistent description associated even with an error", () => {
    const { rerender } = render(
      <Field label="Reference" description="Format: ABCD123456" />
    );
    const input = screen.getByLabelText("Reference");
    const description = screen.getByText("Format: ABCD123456");
    expect(input.getAttribute("aria-describedby")).toContain(description.id);

    rerender(<Field label="Reference" description="Format: ABCD123456" error="Required" />);
    const alert = screen.getByRole("alert");
    const describedBy = input.getAttribute("aria-describedby") ?? "";
    expect(describedBy.split(" ")).toContain(description.id);
    expect(describedBy.split(" ")).toContain(alert.id);
  });

  it("keeps a consumer aria-describedby and merges the error into it", () => {
    render(
      <div>
        <p id="external-help">External help</p>
        <Field label="Email" error="Invalid" aria-describedby="external-help" />
      </div>
    );
    const input = screen.getByLabelText("Email");
    const alert = screen.getByRole("alert");
    const describedBy = input.getAttribute("aria-describedby") ?? "";
    expect(describedBy.split(" ")).toContain("external-help");
    expect(describedBy.split(" ")).toContain(alert.id);
  });

  it("lets an explicit aria-invalid from the consumer win", () => {
    render(<Field label="Email" error="Invalid" aria-invalid={false} />);
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "false");
  });

  it("generates a unique id per instance", () => {
    render(
      <div>
        <Field label="First" />
        <Field label="Second" />
      </div>
    );
    const first = screen.getByLabelText("First");
    const second = screen.getByLabelText("Second");
    expect(first.id).toBeTruthy();
    expect(first.id).not.toBe(second.id);
  });

  it("renders a disabled field as non-interactive", () => {
    render(<Field label="Locked" disabled />);
    expect(screen.getByLabelText("Locked")).toBeDisabled();
  });

  it("works as a controlled input", async () => {
    function Controlled() {
      const [value, setValue] = useState("");
      return <Field label="Name" value={value} onChange={(e) => setValue(e.target.value)} />;
    }
    render(<Controlled />);
    const input = screen.getByLabelText("Name");
    await userEvent.type(input, "Ada");
    expect(input).toHaveValue("Ada");
  });

  it("works as an uncontrolled input", async () => {
    render(<Field label="Name" defaultValue="Ada" />);
    const input = screen.getByLabelText("Name");
    expect(input).toHaveValue("Ada");
    await userEvent.type(input, "!");
    expect(input).toHaveValue("Ada!");
  });

  it("forwards its ref to the input", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Field label="Name" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it("passes maxLength through to the native input", () => {
    render(<Field label="Code" maxLength={6} />);
    expect(screen.getByLabelText("Code")).toHaveAttribute("maxlength", "6");
  });

  it("sizes to content when autoResize is enabled", () => {
    render(<Field label="Tag" autoResize />);
    expect(screen.getByLabelText("Tag").className).toContain("field-sizing");
  });

  it("supports long CJK values without truncation", async () => {
    render(<Field label="名前" />);
    const input = screen.getByLabelText("名前");
    await userEvent.type(input, "山田太郎");
    expect(input).toHaveValue("山田太郎");
  });
});

describe("Input", () => {
  it("renders a bare input that forwards extra props and refs", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input placeholder="Email" ref={ref} />);
    const input = screen.getByPlaceholderText("Email");
    expect(input).toBeInTheDocument();
    expect(ref.current).toBe(input);
  });

  it("renders as disabled and non-interactive", () => {
    render(<Input aria-label="Locked" disabled />);
    expect(screen.getByLabelText("Locked")).toBeDisabled();
  });

  it("defaults to full width without the autoResize class", () => {
    render(<Input aria-label="Full" />);
    const input = screen.getByLabelText("Full");
    expect(input.className).toContain("w-full");
    expect(input.className).not.toContain("field-sizing");
  });
});
