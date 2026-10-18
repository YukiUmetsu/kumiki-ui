import { afterEach, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { JourneyWorldComposition } from "../src/network-journey/journey-world-composition";
import { DEFAULT_JOURNEY } from "../src/network-journey/journey-content";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it("uses public measured slots and preserves the visual while frames change", () => {
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  const subjects = [{ id: "hero-packet", region: { x: .2, y: .2, width: .2, height: .2 } }];
  const view = render(<JourneyWorldComposition frame={1405} aspect="landscape" settings={DEFAULT_JOURNEY} subjects={subjects}>
    <div data-testid="persistent-visual">World</div>
  </JourneyWorldComposition>);
  const visual = screen.getByTestId("persistent-visual");
  expect(view.container.querySelector("[data-km-explainer-stage]")).toBeTruthy();
  expect(view.container.querySelector('[data-journey-protected="hero-packet"]')).toBeTruthy();
  expect(view.container.querySelector("svg text")).toBeNull();
  view.rerender(<JourneyWorldComposition frame={1448} aspect="landscape" settings={DEFAULT_JOURNEY} subjects={subjects}>
    <div data-testid="persistent-visual">World</div>
  </JourneyWorldComposition>);
  expect(screen.getByTestId("persistent-visual")).toBe(visual);
});


it("keeps failed captions synchronized across consecutive frames and changed copy", async () => {
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  const report = vi.fn();
  const content = (frame: number) => <JourneyWorldComposition frame={frame} aspect="landscape" settings={DEFAULT_JOURNEY}
    subjects={[]} onDiagnostic={report}><div>World</div></JourneyWorldComposition>;
  const view = render(content(1448));
  await waitFor(() => expect(report).toHaveBeenLastCalledWith(1448, expect.stringContaining("Choose an outgoing link")));
  view.rerender(content(1449));
  await waitFor(() => expect(report).toHaveBeenLastCalledWith(1449, expect.stringContaining("Choose an outgoing link")));
  view.rerender(content(1600));
  await waitFor(() => expect(report).toHaveBeenLastCalledWith(1600, expect.stringContaining("Forward toward the service")));
});
