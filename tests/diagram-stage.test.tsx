/**
 * `diagram-stage` — frame-addressable graph layouts compiled to MG1 tracks,
 * attached cubic connectors, arc-length packets and the SVG adapter.
 *
 * The pure half pins layout validation, deterministic bound interpolation,
 * stable port ownership, overlap reporting and packet placement. The React half
 * pins the accessible SVG output, custom render slots, focus emphasis and
 * reduced-motion resolution.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import type { DiagramSpec } from "../registry/infographic/types";
import type { Rect } from "../registry/motion/types";
import {
  createDiagramTimeline,
  evaluateDiagramStage,
} from "../registry/motion/diagram-stage";
import type { DiagramPacket } from "../registry/motion/diagram-stage";
import { DiagramStage } from "../registry/motion/diagram-stage-react";
import type { DiagramStageProps } from "../registry/motion/diagram-stage-react";

const FPS = { num: 30, den: 1 };
const DURATION = 60;

const GRAPH: DiagramSpec = {
  direction: "horizontal",
  nodes: [
    { id: "a", label: "Alpha" },
    { id: "b", label: "Beta" },
  ],
  edges: [{ id: "a-b", from: "a", to: "b", label: "flows" }],
};

function box(x: number, y: number, width = 100, height = 50): Rect {
  return { x, y, width, height };
}

const INITIAL = { a: box(0, 0), b: box(300, 0) };
const MOVED = { a: box(250, 0), b: box(300, 0) };

function graphTimeline(): ReturnType<typeof createDiagramTimeline> {
  return createDiagramTimeline({
    id: "diagram",
    graph: GRAPH,
    fps: FPS,
    durationFrames: DURATION,
    layouts: [
      { frame: 0, bounds: INITIAL },
      { frame: 30, bounds: MOVED },
    ],
  });
}

beforeEach(() => {
  vi.stubGlobal("matchMedia", (media: string) => ({
    media, matches: false, onchange: null,
    addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, dispatchEvent: () => true,
  }));
});
afterEach(() => vi.unstubAllGlobals());

describe("createDiagramTimeline — compilation and validation", () => {
  it("compiles four numeric tracks per semantic node", () => {
    const timeline = graphTimeline();
    expect(timeline.schemaVersion).toBe(1);
    expect(timeline.nodes).toHaveLength(8);
    const properties = timeline.nodes.map((node) => (node.kind === "track" ? node.track.property : ""));
    expect(properties).toEqual(expect.arrayContaining([
      "diagram-x", "diagram-y", "diagram-width", "diagram-height",
    ]));
  });

  it("rejects invalid ids, timing and graph identity", () => {
    const base = { graph: GRAPH, fps: FPS, durationFrames: DURATION, layouts: [{ frame: 0, bounds: INITIAL }] };
    expect(() => createDiagramTimeline({ id: " ", ...base })).toThrow(/Cannot create diagram motion/);
    expect(() => createDiagramTimeline({ id: "x", ...base, durationFrames: 0 })).toThrow(/positive integer duration/);
    expect(() => createDiagramTimeline({ id: "x", ...base, fps: { num: 0, den: 1 } })).toThrow(/positive integer rational FPS/);

    const dupNodes: DiagramSpec = { nodes: [{ id: "a", label: "A" }, { id: "a", label: "B" }], edges: [] };
    expect(() => createDiagramTimeline({ id: "x", graph: dupNodes, fps: FPS, durationFrames: 30, layouts: [{ frame: 0, bounds: { a: box(0, 0) } }] }))
      .toThrow(/unique non-empty IDs and labels/);

    const unknownEdge: DiagramSpec = { nodes: [{ id: "a", label: "A" }], edges: [{ id: "e", from: "a", to: "ghost" }] };
    expect(() => createDiagramTimeline({ id: "x", graph: unknownEdge, fps: FPS, durationFrames: 30, layouts: [{ frame: 0, bounds: { a: box(0, 0) } }] }))
      .toThrow(/Diagram edge "e" is invalid/);

    const selfLoop: DiagramSpec = { nodes: [{ id: "a", label: "A" }], edges: [{ id: "e", from: "a", to: "a" }] };
    expect(() => createDiagramTimeline({ id: "x", graph: selfLoop, fps: FPS, durationFrames: 30, layouts: [{ frame: 0, bounds: { a: box(0, 0) } }] }))
      .toThrow(/two distinct existing node IDs/);
  });

  it("requires a complete initial layout and known node ids", () => {
    expect(() => createDiagramTimeline({ id: "x", graph: GRAPH, fps: FPS, durationFrames: 30, layouts: [{ frame: 5, bounds: INITIAL }] }))
      .toThrow(/initial layout at frame 0/);
    expect(() => createDiagramTimeline({ id: "x", graph: GRAPH, fps: FPS, durationFrames: 30, layouts: [{ frame: 0, bounds: { a: box(0, 0) } }] }))
      .toThrow(/missing valid bounds for "b"/);
    expect(() => createDiagramTimeline({ id: "x", graph: GRAPH, fps: FPS, durationFrames: 30, layouts: [{ frame: 0, bounds: { ...INITIAL, ghost: box(0, 0) } }] }))
      .toThrow(/references unknown node "ghost"/);
    expect(() => createDiagramTimeline({ id: "x", graph: GRAPH, fps: FPS, durationFrames: 30, layouts: [{ frame: 0, bounds: { a: box(0, 0, 0, 50), b: box(300, 0) } }] }))
      .toThrow(/missing valid bounds for "a"/);
  });
});

describe("evaluateDiagramStage — geometry and packets", () => {
  it("interpolates node bounds deterministically and clamps frames", () => {
    const timeline = graphTimeline();
    expect(evaluateDiagramStage(GRAPH, timeline, 0).nodes[0].bounds).toEqual(INITIAL.a);
    expect(evaluateDiagramStage(GRAPH, timeline, 15).nodes[0].bounds.x).toBeCloseTo(125, 6);
    expect(evaluateDiagramStage(GRAPH, timeline, 30).nodes[0].bounds).toEqual(MOVED.a);
    // Past the last layout the final bounds hold; negative frames clamp to 0.
    expect(evaluateDiagramStage(GRAPH, timeline, 999).nodes[0].bounds).toEqual(MOVED.a);
    expect(evaluateDiagramStage(GRAPH, timeline, -5).nodes[0].bounds).toEqual(INITIAL.a);
    expect(() => evaluateDiagramStage(GRAPH, timeline, 1.5)).toThrow(/finite integer frame/);
  });

  it("routes attached connectors from the current bounds and reports overlaps", () => {
    const timeline = graphTimeline();
    const start = evaluateDiagramStage(GRAPH, timeline, 0);
    expect(start.edges[0].svg).toBe("M 100 25 C 190 25 210 25 300 25");
    expect(start.edges[0].labelPosition.x).toBeCloseTo(200, 6);
    expect(start.overlaps).toEqual([]);

    const moved = evaluateDiagramStage(GRAPH, timeline, 30);
    expect(moved.overlaps).toEqual([{ firstId: "a", secondId: "b" }]);
  });

  it("validates port offsets and curvature", () => {
    const timeline = graphTimeline();
    expect(() => evaluateDiagramStage(GRAPH, timeline, 0, { ports: { "a-b": { from: { side: "top", offset: 2 } } } }))
      .toThrow(/port offsets must be finite fractions/);
    expect(() => evaluateDiagramStage(GRAPH, timeline, 0, { ports: { "a-b": { curvature: 3 } } }))
      .toThrow(/curvature from 0 to 2/);
    const custom = evaluateDiagramStage(GRAPH, timeline, 0, { ports: { "a-b": { from: { side: "top" }, to: { side: "bottom" } } } });
    expect(custom.edges[0].svg.startsWith("M ")).toBe(true);
  });

  it("places packets by arc length and supports reverse travel", () => {
    const timeline = graphTimeline();
    const packets: DiagramPacket[] = [
      { id: "forward", edgeId: "a-b", range: { startFrame: 0, endFrame: 10 } },
      { id: "back", edgeId: "a-b", range: { startFrame: 0, endFrame: 10 }, direction: "reverse" },
    ];
    const atStart = evaluateDiagramStage(GRAPH, timeline, 0, { packets });
    expect(atStart.packets).toHaveLength(2);
    const forward = atStart.packets.find((packet) => packet.packet.id === "forward");
    const back = atStart.packets.find((packet) => packet.packet.id === "back");
    expect(forward?.position.x).toBeCloseTo(100, 6);
    expect(back?.position.x).toBeCloseTo(300, 6);

    const atEnd = evaluateDiagramStage(GRAPH, timeline, 9, { packets });
    expect(atEnd.packets.find((packet) => packet.packet.id === "forward")?.progress).toBe(1);
    // Outside the packet range nothing is emitted.
    expect(evaluateDiagramStage(GRAPH, timeline, 20, { packets }).packets).toEqual([]);
  });

  it("rejects malformed packets", () => {
    const timeline = graphTimeline();
    expect(() => evaluateDiagramStage(GRAPH, timeline, 0, { packets: [{ id: "p", edgeId: "ghost", range: { startFrame: 0, endFrame: 10 } }] }))
      .toThrow(/Packet "p" needs a unique ID/);
    expect(() => evaluateDiagramStage(GRAPH, timeline, 0, { packets: [{ id: "p", edgeId: "a-b", range: { startFrame: 0, endFrame: 1 } }] }))
      .toThrow(/at least two frames/);
    expect(() => evaluateDiagramStage(GRAPH, timeline, 0, { packets: [{ id: "p", edgeId: "a-b", range: { startFrame: 0, endFrame: 99 } }] }))
      .toThrow(/inside the composition/);
  });
});

describe("DiagramStage — accessible SVG adapter", () => {
  function renderStage(props: Partial<DiagramStageProps> = {}) {
    return render(
      <DiagramStage
        graph={GRAPH}
        timeline={graphTimeline()}
        frame={0}
        width={400}
        height={200}
        ariaLabel="Branching flow"
        {...props}
      />,
    );
  }

  it("describes every node and edge for assistive technology", () => {
    const { container } = renderStage();
    expect(screen.getByRole("img", { name: "Branching flow" })).toBeInTheDocument();
    expect(container.querySelector("[data-km-diagram-stage]")).not.toBeNull();
    const description = container.querySelector("desc")?.textContent ?? "";
    expect(description).toContain("Alpha");
    expect(description).toContain("Beta");
    expect(description).toContain("Alpha connects to Beta (flows).");
    expect(container.querySelectorAll("[data-diagram-node]")).toHaveLength(2);
    expect(container.querySelectorAll("[data-diagram-edge]")).toHaveLength(1);
    expect(container.querySelector("[data-km-diagram-stage]")).toHaveAttribute("data-diagram-overlaps", "0");
  });

  it("emphasises focused nodes and renders packets in range", () => {
    const { container } = renderStage({
      focusedNodeIds: ["a"],
      packets: [{ id: "p", edgeId: "a-b", range: { startFrame: 0, endFrame: 10 } }],
    });
    expect(container.querySelectorAll("[data-diagram-node='a'] rect")).toHaveLength(2);
    expect(container.querySelectorAll("[data-diagram-node='b'] rect")).toHaveLength(1);
    expect(container.querySelector("[data-diagram-packet='p']")).not.toBeNull();
  });

  it("uses custom render slots when supplied", () => {
    const { container } = renderStage({
      renderNode: () => <text data-testid="custom-node" />,
      renderPacket: () => <circle data-testid="custom-packet" />,
      packets: [{ id: "p", edgeId: "a-b", range: { startFrame: 0, endFrame: 10 } }],
    });
    expect(container.querySelectorAll("[data-testid='custom-node']")).toHaveLength(2);
    expect(container.querySelectorAll("[data-testid='custom-packet']")).toHaveLength(1);
  });

  it("resolves reduced motion to the final, overlapping layout", () => {
    const { container } = renderStage({ frame: 0, reducedMotion: true });
    expect(container.querySelector("[data-km-diagram-stage]")).toHaveAttribute("data-diagram-overlaps", "1");
  });

  it("rejects non-positive output dimensions", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderStage({ width: 0 })).toThrow(/positive output dimensions/);
    error.mockRestore();
  });
});
