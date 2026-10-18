import { createRef, useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ExplainerStage, ExplainerVisual, ExplainerText } from "../registry/visual/explainer-stage";

const subjects = [{ id: "primary", region: { x: .08, y: .1, width: .4, height: .6 } }];
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function measuredDOM() {
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function(this: HTMLElement) {
    const width = this.hasAttribute("data-km-explainer-canvas") ? 1000 : (this.textContent?.length ?? 0) * 12;
    return { x: 0, y: 0, width, height: this.hasAttribute("data-km-explainer-canvas") ? 562.5 : 32, top: 0, left: 0, right: width, bottom: 32, toJSON() {} };
  });
}
it("measures and renders the public slots with forwarded attributes and refs", async () => {
  measuredDOM();
  const ref = createRef<HTMLDivElement>(), textRef = createRef<HTMLParagraphElement>();
  render(<ExplainerStage ref={ref} subjects={subjects} protect={["primary"]} aria-label="Composition">
    <ExplainerVisual data-testid="visual">Subject</ExplainerVisual>
    <ExplainerText ref={textRef} lang="en" style={{ fontSize: 24, lineHeight: "32px" }}>A readable explanation.</ExplainerText>
  </ExplainerStage>);
  await waitFor(() => expect(ref.current).toHaveAttribute("data-layout-status", "ready"));
  expect(screen.getByTestId("visual")).toBeVisible();
  expect(textRef.current).toHaveTextContent("A readable explanation.");
  expect(textRef.current).toHaveAttribute("lang", "en");
});
it("keeps impossible essential content readable outside the scene with a diagnostic", async () => {
  measuredDOM();
  render(<ExplainerStage subjects={subjects} protect={["missing"]}>
    <ExplainerVisual>Subject</ExplainerVisual><ExplainerText>Essential explanation</ExplainerText>
  </ExplainerStage>);
  expect(await screen.findByRole("alert")).toHaveTextContent('Protected subject "missing"');
  expect(screen.getByRole("alert").parentElement?.querySelector("[data-km-explainer-text]")).toHaveTextContent("Essential explanation");
});
it("rejects missing or duplicated slots with an actionable message", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  expect(() => render(<ExplainerStage><ExplainerText>Text only</ExplainerText></ExplainerStage>)).toThrow(/one ExplainerVisual and one ExplainerText/);
});
it("reports unavailable browser metrics without certifying the layout", async () => {
  render(<ExplainerStage><ExplainerVisual>Subject</ExplainerVisual><ExplainerText>Explanation</ExplainerText></ExplainerStage>);
  expect(await screen.findByRole("alert")).toHaveTextContent(/measur|viewport/i);
});

it("updates composition after content changes and clears an old error", async () => {
  measuredDOM();
  const content = (protect: string[]) => <ExplainerStage subjects={subjects} protect={protect}>
    <ExplainerVisual>Subject</ExplainerVisual><ExplainerText style={{ fontSize: 24, lineHeight: "32px" }}>Updated explanation.</ExplainerText>
  </ExplainerStage>;
  const view = render(content(["missing"]));
  expect(await screen.findByRole("alert")).toBeVisible();
  view.rerender(content(["primary"]));
  await waitFor(() => expect(view.container.querySelector("[data-km-explainer-stage]")).toHaveAttribute("data-layout-status", "ready"));
  expect(screen.queryByRole("alert")).toBeNull();
});

it("shares resolved semantic regions with the visual render slot", async () => {
  measuredDOM();
  render(<ExplainerStage subjects={subjects} protect={["primary"]}>
    <ExplainerVisual>{({ subjects: resolved }) => <span>{resolved[0]?.id}</span>}</ExplainerVisual>
    <ExplainerText style={{ fontSize: 24, lineHeight: "32px" }}>Explanation.</ExplainerText>
  </ExplainerStage>);
  expect(await screen.findByText("primary")).toBeVisible();
});


it("notifies only changed layout results when a parent stores the result", async () => {
  measuredDOM();
  const notify = vi.fn();
  function Consumer() {
    const [, storeLayout] = useState<unknown>(null);
    return <ExplainerStage subjects={subjects} protect={["primary"]} onLayout={result => { notify(); storeLayout(result); }}>
      <ExplainerVisual>Subject</ExplainerVisual><ExplainerText style={{ fontSize: 24, lineHeight: "32px" }}>Explanation.</ExplainerText>
    </ExplainerStage>;
  }
  const view = render(<Consumer />);
  await waitFor(() => expect(view.container.querySelector("[data-km-explainer-stage]")).toHaveAttribute("data-layout-status", "ready"));
  expect(notify).toHaveBeenCalledTimes(1);
});

it("measures the same typography attributes in the same canvas ancestry", async () => {
  measuredDOM();
  const view = render(<ExplainerStage subjects={subjects} protect={["primary"]}>
    <ExplainerVisual>Subject</ExplainerVisual>
    <ExplainerText data-typography="wide" className="custom-type" style={{ fontSize: 24, lineHeight: "32px" }}>Explanation.</ExplainerText>
  </ExplainerStage>);
  await waitFor(() => expect(view.container.querySelector("[data-km-explainer-stage]")).toHaveAttribute("data-layout-status", "ready"));
  const paragraphs = view.container.querySelectorAll('[data-km-explainer-canvas] > [data-km-explainer-text][data-typography="wide"].custom-type');
  expect(paragraphs).toHaveLength(2);
  expect([...paragraphs].filter(p => p.getAttribute("aria-hidden") === "true")).toHaveLength(1);
});

it("keeps the measurement element stable when pending text becomes visible", async () => {
  measuredDOM();
  const view = render(<ExplainerStage subjects={subjects} protect={["primary"]}>
    <ExplainerVisual>Subject</ExplainerVisual><ExplainerText style={{ fontSize: 24, lineHeight: "32px" }}>Explanation.</ExplainerText>
  </ExplainerStage>);
  const initialMeasurement = view.container.querySelector('[data-km-explainer-text][aria-hidden="true"]');
  await waitFor(() => expect(view.container.querySelector("[data-km-explainer-stage]")).toHaveAttribute("data-layout-status", "ready"));
  expect(view.container.querySelector('[data-km-explainer-text][aria-hidden="true"]')).toBe(initialMeasurement);
});
