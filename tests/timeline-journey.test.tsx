import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TimelineJourneyScene } from "../registry/video/recipes/timeline-journey";
import type { SceneTemplateSpec } from "../registry/video/scene-templates";
import { validateSceneTemplate } from "../registry/video/scene-templates";
import { formatTimelineDate, odometerColumns, resolveTimelineDate, timelineJourneySchedule, timelineRailPositions, yearParts } from "../registry/video/timeline-journey";

const spec: SceneTemplateSpec<"timeline-journey"> = {
  schemaVersion: 1, recipeVersion: 1, recipeId: "timeline-journey", id: "tj", fps: { num: 24, den: 1 },
  durationFrames: 360, width: 960, height: 540, cueFrames: [40, 150, 280],
  content: { narrative: "Three moments", spacing: "elapsed", events: [
    { id: "a", date: "1903-12-17", label: "First", caption: "Caption A", source: "Archive A", image: { id: "a", src: "/a.jpg", alt: "A", width: 400, height: 300 }, focus: { x: .4, y: .4 } },
    { id: "b", date: "1909", label: "Second", description: "Legacy caption B", image: { id: "b", src: "/b.jpg", alt: "B" } },
    { id: "c", date: "1981-04-12", label: "Third", transition: "match-cut", image: { id: "c", src: "/c.jpg", alt: "C" } },
  ] },
};
const q = (c: HTMLElement, s: string) => c.querySelector<HTMLElement>(s);

describe("timeline journey", () => {
  it("resolves ISO, structured and BCE dates with their precision and formats them through Intl", () => {
    expect(resolveTimelineDate({ date: "1903-12-17" })).toMatchObject({ year: 1903, month: 12, day: 17, precision: "day" });
    expect(resolveTimelineDate({ date: "1909" })?.precision).toBe("year");
    expect(resolveTimelineDate({ date: "-000499" })?.year).toBe(-500); // ISO years are astronomical
    expect(resolveTimelineDate({ when: { year: -500 } })?.t).toBe(-499);
    expect(resolveTimelineDate({ when: { year: 0 } })).toBeUndefined();
    expect(resolveTimelineDate({ when: { year: 1900, month: 2, day: 29 } })).toBeUndefined();
    expect(formatTimelineDate(resolveTimelineDate({ date: "1903-12-17" })!, "en")).toBe("December 17, 1903");
    expect(formatTimelineDate(resolveTimelineDate({ date: "1903-12-17" })!, "ja", "year")).toBe("1903年");
    expect(yearParts(-500, "en").map(p => p.value).join("")).toBe("500 BC");
  });

  it("keeps legacy payloads valid and rejects unchronological, unplaceable or overfull timelines", () => {
    expect(() => validateSceneTemplate(spec)).not.toThrow();
    const ev = spec.content.events;
    expect(() => validateSceneTemplate({ ...spec, content: { ...spec.content, events: [ev[1], ev[0], ev[2]] } })).toThrow(/chronological/);
    expect(() => validateSceneTemplate({ ...spec, content: { ...spec.content, events: [{ ...ev[0], focus: { x: .9, y: .2, width: .3, height: .1 } }, ev[1], ev[2]] } })).toThrow(/focus/);
    expect(() => validateSceneTemplate({ ...spec, content: { ...spec.content, events: [{ ...ev[0], frames: 200 }, ev[1], ev[2]] } })).toThrow(/do not fit/);
    const bce = { ...spec, content: { ...spec.content, events: [{ ...ev[0], date: undefined, when: { year: -2560 } }, ev[1], ev[2]] } };
    expect(() => validateSceneTemplate(bce)).not.toThrow();
  });

  it("schedules every event, places the rail by elapsed time or evenly, and rolls digits like an odometer", () => {
    const s = timelineJourneySchedule(spec);
    expect(s.events.map(b => b.start)).toEqual([40, 120, 200]);
    expect(s.events[2]).toMatchObject({ end: 280, transition: "match-cut", arrive: 230, cut: 215 });
    const dates = spec.content.events.map(e => resolveTimelineDate(e)!);
    expect(timelineRailPositions(dates, "equal")).toEqual([0, .5, 1]);
    expect(timelineRailPositions(dates, "elapsed")[1]).toBeCloseTo(5.04 / 77.29, 2);
    expect(odometerColumns(1999.5, 4)).toEqual([1.5, 9.5, 9.5, 9.5]);
    expect(odometerColumns(1909, 4)).toEqual([1, 9, 0, 9]);
  });

  it("rolls the year through the move, hands the copy over at the cut and holds the source on the plate", () => {
    const { container, rerender } = render(<TimelineJourneyScene spec={spec} frame={100}/>);
    expect(q(container, "[data-km-tj-body]")!.getAttribute("data-km-tj-body")).toBe("a");
    expect(q(container, "[data-km-tj-source]")!.textContent).toBe("Archive A");
    expect(q(container, "[data-km-tj-dateline]")!.textContent).toBe("December 17, 1903");
    rerender(<TimelineJourneyScene spec={spec} frame={137}/>);
    const units = [...container.querySelectorAll("[data-km-tj-readout] [data-km-tj-digit]")].map(d => d.getAttribute("data-km-tj-digit"));
    expect(units.slice(0, 3)).toEqual(["1", "9", "0"]);
    expect(Number(units[3])).toBeGreaterThan(3); expect(Number(units[3])).toBeLessThan(9);
    expect(q(container, "[data-km-tj-body]")!.getAttribute("data-km-tj-body")).toBe("b");
    expect(q(container, "[data-km-tj-caption]")!.textContent).toContain("Legacy caption B");
    rerender(<TimelineJourneyScene spec={spec} frame={340}/>);
    expect(q(container, "[data-km-tj-body]")!.getAttribute("data-km-tj-body")).toBe("summary");
    expect(container.querySelectorAll("[data-km-tj-chip]").length).toBe(3);
    expect(q(container, "[data-km-tj-readout]")!.textContent).toContain("years");
  });

  it("cuts instead of moving under reduced motion and forwards ref, className and style", () => {
    let node: HTMLDivElement | null = null;
    const { container } = render(<TimelineJourneyScene ref={el => { node = el; }} spec={spec} frame={125} reducedMotion className="custom" style={{ outline: "1px solid red" }}/>);
    expect(node).toBeInstanceOf(HTMLDivElement);
    expect(q(container, ".custom")!.style.outline).toBe("1px solid red");
    // Before the cut nothing has moved: the outgoing plate holds still at Ken Burns midpoint, no truck.
    const plates = [...container.querySelectorAll("[data-km-tj-plate]")].map(p => p.getAttribute("data-km-tj-plate"));
    expect(plates).toEqual(["a"]);
    expect(q(container, "[data-km-tj-announce]")!.textContent).toContain("First");
  });
});
