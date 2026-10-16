import { createRef, useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Textarea, TextareaField } from "../src/ui/textarea";

describe("TextareaField", () => {
  it("associates the label with the textarea", () => {
    render(<TextareaField label="Message" />);
    const area = screen.getByLabelText("Message");
    expect(area).toBeInstanceOf(HTMLTextAreaElement);
    expect(screen.getByText("Message")).toHaveAttribute("for", area.id);
  });

  it("marks the field invalid and announces the error", () => {
    render(<TextareaField label="Message" error="A message is required" />);
    const area = screen.getByLabelText("Message");
    expect(area).toHaveAttribute("aria-invalid", "true");
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("A message is required");
    expect(area.getAttribute("aria-describedby")).toContain(alert.id);
  });

  it("shows the hint only while there is no error", () => {
    const { rerender } = render(<TextareaField label="Message" hint="Markdown is supported" />);
    expect(screen.getByText("Markdown is supported")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();

    rerender(<TextareaField label="Message" hint="Markdown is supported" error="Required" />);
    expect(screen.queryByText("Markdown is supported")).toBeNull();
    expect(screen.getByRole("alert")).toHaveTextContent("Required");
  });

  it("shows a counter only when a limit exists and keeps it in sync", async () => {
    const { rerender } = render(<TextareaField label="Message" />);
    expect(screen.queryByText(/\d+ \/ \d+/)).toBeNull();

    rerender(<TextareaField label="Message" maxLength={20} />);
    const area = screen.getByLabelText("Message");
    await userEvent.type(area, "hello");

    const counter = screen.getByText("5 / 20");
    expect(area.getAttribute("aria-describedby")).toContain(counter.id);
  });

  it("works as a controlled textarea", async () => {
    function Controlled() {
      const [value, setValue] = useState("");
      return <TextareaField label="Message" value={value} onChange={(event) => setValue(event.target.value)} />;
    }
    render(<Controlled />);
    const area = screen.getByLabelText("Message");
    await userEvent.type(area, "Hi");
    expect(area).toHaveValue("Hi");
  });

  it("works as an uncontrolled textarea", async () => {
    render(<TextareaField label="Message" defaultValue="Hi" />);
    const area = screen.getByLabelText("Message");
    expect(area).toHaveValue("Hi");
    await userEvent.type(area, "!");
    expect(area).toHaveValue("Hi!");
  });

  it("forwards its ref to the textarea element", () => {
    const ref = createRef<HTMLTextAreaElement>();
    render(<TextareaField label="Message" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });

  it("supports long CJK values", async () => {
    render(<TextareaField label="メッセージ" />);
    const area = screen.getByLabelText("メッセージ");
    await userEvent.type(area, "山田太郎");
    expect(area).toHaveValue("山田太郎");
  });
});

describe("Textarea", () => {
  it("renders a bare textarea and forwards props and ref", () => {
    const ref = createRef<HTMLTextAreaElement>();
    render(<Textarea placeholder="Bare textarea" ref={ref} />);
    expect(screen.getByPlaceholderText("Bare textarea")).toBeInTheDocument();
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });

  it("disables auto-resize and applies resize-none while still rendering", () => {
    render(<Textarea aria-label="Auto" autoResize minRows={2} />);
    const area = screen.getByLabelText("Auto");
    expect(area.className).toContain("resize-none");
    expect(area).toHaveValue("");
  });

  it("uses minRows for the visible rows when not auto-resizing", () => {
    render(<Textarea aria-label="Rows" minRows={5} />);
    expect(screen.getByLabelText("Rows")).toHaveAttribute("rows", "5");
  });
});
