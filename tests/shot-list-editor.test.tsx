import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ShotListEditor } from "../registry/video/shot-list-editor";

const kinds = [{ value: "establish", label: "Establish" }, { value: "push-in", label: "Push in" }];
const shots = [{ id: "a", title: "Wide", kind: "establish", purpose: "Locate the room." }, { id: "b", title: "Reveal", kind: "push-in", purpose: "Show the change." }];

describe("ShotListEditor", () => {
  it("reorders with buttons and announces the move", () => {
    const onChange = vi.fn();
    render(<ShotListEditor shots={shots} kinds={kinds} onChange={onChange}/>);
    fireEvent.click(screen.getByRole("button", { name: "Move down: Wide" }));
    expect(onChange.mock.calls[0][0].map((shot: { id: string }) => shot.id)).toEqual(["b", "a"]);
    expect(screen.getByRole("status")).toHaveTextContent("Wide moved to position 2.");
  });
  it("reorders from the keyboard with Alt and arrows", () => {
    const onChange = vi.fn();
    render(<ShotListEditor shots={shots} kinds={kinds} onChange={onChange}/>);
    fireEvent.keyDown(screen.getAllByRole("listitem")[1], { key: "ArrowUp", altKey: true });
    expect(onChange.mock.calls[0][0][0].id).toBe("b");
  });
  it("disables moves past either end", () => {
    render(<ShotListEditor shots={shots} kinds={kinds} onChange={() => {}}/>);
    expect(screen.getByRole("button", { name: "Move up: Wide" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move down: Reveal" })).toBeDisabled();
  });
  it("edits kind and purpose without touching other fields", () => {
    const onChange = vi.fn();
    render(<ShotListEditor shots={shots} kinds={kinds} onChange={onChange}/>);
    fireEvent.change(screen.getAllByLabelText("Shot type")[0], { target: { value: "push-in" } });
    expect(onChange.mock.calls[0][0][0]).toEqual({ ...shots[0], kind: "push-in" });
    fireEvent.change(screen.getAllByLabelText("What this shot makes clearer")[1], { target: { value: "New" } });
    expect(onChange.mock.calls[1][0][1].purpose).toBe("New");
  });
  it("links a shot's error to its field", () => {
    render(<ShotListEditor shots={shots} kinds={kinds} onChange={() => {}} diagnostics={[{ shotId: "b", severity: "error", message: "No subject in frame." }]}/>);
    const field = screen.getAllByLabelText("What this shot makes clearer")[1];
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAccessibleDescription("No subject in frame.");
  });
  it("shows an error for a shot that is not in the list", () => {
    render(<ShotListEditor shots={shots} kinds={kinds} onChange={() => {}} diagnostics={[{ severity: "error", message: "Render failed." }]}/>);
    expect(screen.getByText("Render failed.")).toBeInTheDocument();
  });
  it("keeps a saved kind it does not know", () => {
    render(<ShotListEditor shots={[{ ...shots[0], kind: "legacy" }]} kinds={kinds} onChange={() => {}}/>);
    expect(screen.getByLabelText("Shot type")).toHaveValue("legacy");
  });
  it("is inert when read only", () => {
    const onChange = vi.fn();
    render(<ShotListEditor shots={shots} kinds={kinds} onChange={onChange} readOnly/>);
    expect(screen.queryByRole("button")).toBeNull();
    fireEvent.keyDown(screen.getAllByRole("listitem")[1], { key: "ArrowUp", altKey: true });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getAllByLabelText("Shot type")[0]).toBeDisabled();
  });
  it("accepts other languages and long titles", () => {
    render(<ShotListEditor shots={[{ ...shots[0], title: "請求書と領収書の差額を確認するカット" }]} kinds={kinds} onChange={() => {}}
      labels={{ moveUp: "上へ", moveDown: "下へ", list: "ショット" }}/>);
    expect(screen.getByRole("list", { name: "ショット" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "上へ: 請求書と領収書の差額を確認するカット" })).toBeInTheDocument();
  });
  it("shows the empty message", () => {
    render(<ShotListEditor shots={[]} kinds={kinds} onChange={() => {}}/>);
    expect(screen.getByText("No shots yet.")).toBeInTheDocument();
  });
});
