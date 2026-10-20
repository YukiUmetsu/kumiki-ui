import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { DiagramSpec } from "../registry/infographic/types";
import type { Rect } from "../registry/motion/types";
import { createProcessJourney, evaluateProcessJourney } from "../registry/motion/process-journey";
import type { ProcessJourneyOptions } from "../registry/motion/process-journey";
import { evaluateCamera } from "../registry/motion/camera";
import { DiagramStage } from "../registry/motion/diagram-stage-react";
import { CameraStage } from "../registry/motion/camera-stage";

const box = (x: number, y: number, width = 120, height = 80): Rect =>
  ({ x, y, width, height });

function fixture(subject: string, direction: "horizontal" | "vertical" = "horizontal"): ProcessJourneyOptions {
  const vertical = direction === "vertical";
  const graph: DiagramSpec = {
    direction,
    nodes: [{ id: "a", label: "Origin" }, { id: "b", label: "Relay" }, { id: "c", label: "Destination" }],
    edges: [{ id: "a-b", from: "a", to: "b" }, { id: "b-c", from: "b", to: "c" }],
  };
  return {
    id: subject + "-journey", subjectId: subject, graph, durationFrames: 160,
    fps: { num: 30, den: 1 },
    layouts: [{ frame: 0, bounds: vertical
      ? { a: box(210, 80), b: box(210, 380), c: box(210, 690) }
      : { a: box(70, 220), b: box(400, 220), c: box(730, 220) } }],
    route: [
      { edgeId: "a-b", startFrame: 10, endFrame: 60 },
      { edgeId: "b-c", startFrame: 82, endFrame: 130 },
    ],
    camera: {
      viewport: { width: vertical ? 540 : 960, height: vertical ? 960 : 540 },
      zoom: 1.1, sampleEveryFrames: 3,
    },
  };
}

beforeEach(() => {
  vi.stubGlobal("matchMedia", (media: string) => ({
    media, matches: false, onchange: null,
    addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, dispatchEvent: () => true,
  }));
});
afterEach(() => vi.unstubAllGlobals());

describe("ProcessJourney recipe", () => {
  it.each([
    ["signal", "horizontal"], ["parcel", "vertical"], ["molecule", "horizontal"],
  ] as const)("is reusable for %s in %s without domain-specific semantics", (subject, direction) => {
    const plan = createProcessJourney(fixture(subject, direction));
    expect(plan.subjectId).toBe(subject);
    expect(plan.graph.nodes).toHaveLength(3);
    expect(plan.diagramTimeline.nodes).toHaveLength(12);
    expect(plan.cameraTimeline?.nodes).toHaveLength(3);
    expect(evaluateProcessJourney(plan, 0).phase).toBe("ready");
    const first = evaluateProcessJourney(plan, 10);
    expect(first.phase).toBe("moving");
    expect(first.activeEdgeId).toBe("a-b");
    expect(first.progress).toBe(0);
    const arriving = evaluateProcessJourney(plan, 59);
    expect(arriving.progress).toBe(1);
    const handoff = evaluateProcessJourney(plan, 70);
    expect(handoff.phase).toBe("handoff");
    expect(handoff.currentNodeId).toBe("b");
    expect(handoff.focusedNodeIds).toEqual(["b"]);
    const second = evaluateProcessJourney(plan, 82);
    expect(second.activeEdgeId).toBe("b-c");
    expect(second.currentNodeId).toBe("b");
    const completed = evaluateProcessJourney(plan, 159);
    expect(completed.phase).toBe("arrived");
    expect(completed.currentNodeId).toBe("c");
    expect(completed.subjectId).toBe(subject);
    expect(Number.isFinite(completed.position.x)).toBe(true);
    expect(Number.isFinite(completed.position.y)).toBe(true);
  });

  it("preserves route identity and camera alignment across shuffled seeks", () => {
    const plan = createProcessJourney(fixture("sample"));
    const frames = [0, 10, 37, 59, 60, 70, 81, 82, 120, 129, 130, 159];
    const original = frames.map(frame => evaluateProcessJourney(plan, frame));
    const order = [159, 81, 0, 120, 60, 82, 37, 129, 10, 59, 70, 130];
    for (const frame of order)
      expect(evaluateProcessJourney(plan, frame)).toEqual(original[frames.indexOf(frame)]);
    const viewport = plan.cameraViewport!;
    for (const frame of [0, 10, 37, 59, 60, 70, 81, 82, 129, 130, 159]) {
      const subject = evaluateProcessJourney(plan, frame).position;
      const camera = evaluateCamera(plan.cameraTimeline!, frame, viewport);
      const projected = {
        x: camera.matrix.a * subject.x + camera.matrix.c * subject.y + camera.matrix.e,
        y: camera.matrix.b * subject.x + camera.matrix.d * subject.y + camera.matrix.f,
      };
      // Interpolated camera keyframes stay near the subject, while exact beats
      // are centered. This is an engineering bound, not an artistic score.
      expect(Math.abs(projected.x - viewport.width / 2)).toBeLessThan(80);
      expect(Math.abs(projected.y - viewport.height / 2)).toBeLessThan(80);
    }
  });

  it("uses attached paths after graph reflow without replacing semantic IDs", () => {
    const spec = fixture("sample");
    spec.layouts = [
      ...spec.layouts,
      { frame: 85, bounds: { a: box(70, 190), b: box(410, 310), c: box(740, 160) } },
    ];
    const plan = createProcessJourney(spec);
    const before = evaluateProcessJourney(plan, 80);
    const after = evaluateProcessJourney(plan, 111);
    expect(before.diagram.nodes.map(n => n.node.id)).toEqual(after.diagram.nodes.map(n => n.node.id));
    expect(after.activeEdgeId).toBe("b-c");
    expect(after.position.x).toBeGreaterThan(400);
    expect(after.diagram.overlaps).toEqual([]);
  });

  it("does not depend on subsequent caller mutations", () => {
    const options = fixture("sample");
    const plan = createProcessJourney(options);
    const snapshot = evaluateProcessJourney(plan, 98);
    options.graph.nodes[0].label = "Mutated";
    options.layouts[0].bounds.a.x = 10000;
    options.route[0].startFrame = 99;
    expect(evaluateProcessJourney(plan, 98)).toEqual(snapshot);
  });

  it("rejects disconnected/unknown/overlapping route plans", () => {
    const disconnected = fixture("sample");
    disconnected.route = [{ edgeId: "b-c", startFrame: 10, endFrame: 50 }, { edgeId: "a-b", startFrame: 80, endFrame: 120 }];
    expect(() => createProcessJourney(disconnected)).toThrow(/disconnected/);
    const missing = fixture("sample");
    missing.route = [{ edgeId: "unknown", startFrame: 10, endFrame: 60 }];
    expect(() => createProcessJourney(missing)).toThrow(/missing edge/);
    const noHandoff = fixture("sample");
    noHandoff.route = [{ edgeId: "a-b", startFrame: 10, endFrame: 60 }, { edgeId: "b-c", startFrame: 61, endFrame: 120 }];
    expect(() => createProcessJourney(noHandoff)).toThrow(/handoff/);
    const repeat = fixture("sample");
    repeat.route = [...repeat.route, { edgeId: "a-b", startFrame: 133, endFrame: 156 }];
    expect(() => createProcessJourney(repeat)).toThrow(/unique edge IDs/);
  });

  it("rejects illegal reverse traversal, invalid timing and camera constraints", () => {
    const reverse = fixture("sample");
    reverse.route = [{ edgeId: "a-b", direction: "reverse", startFrame: 10, endFrame: 100 }];
    expect(() => createProcessJourney(reverse)).toThrow(/reverse directed/);
    const empty = fixture("sample");
    empty.route = [];
    expect(() => createProcessJourney(empty)).toThrow(/at least one/);
    const noArrival = fixture("sample");
    noArrival.route = [{ edgeId: "a-b", startFrame: 10, endFrame: 160 }];
    expect(() => createProcessJourney(noArrival)).toThrow(/arrival/);
    const camera = fixture("sample");
    camera.camera = { viewport: { width: 0, height: 100 } };
    expect(() => createProcessJourney(camera)).toThrow(/camera requires/);
  });

  it("renders one accessible diagram and the same subject during a handoff", () => {
    const plan = createProcessJourney(fixture("sample"));
    const state = evaluateProcessJourney(plan, 70);
    const vp = plan.cameraViewport!;
    render(<CameraStage frame={70} timeline={plan.cameraTimeline!}
        width={vp.width} height={vp.height} reducedMotion={false}>
      <DiagramStage graph={plan.graph} timeline={plan.diagramTimeline} frame={70}
        width={vp.width} height={vp.height} ariaLabel="Process journey illustration"
        focusedNodeIds={state.focusedNodeIds} reducedMotion={false}
        style={{ overflow: "visible" }}
        overlay={<circle data-process-journey-subject={state.subjectId}
          cx={state.position.x} cy={state.position.y} r={8} />} />
    </CameraStage>);
    expect(screen.getByRole("img", { name: "Process journey illustration" })).toBeInTheDocument();
    expect(document.querySelector('[data-process-journey-subject="sample"]')).toBeTruthy();
    expect(document.querySelector('[data-diagram-node="b"]')).toBeTruthy();
  });
});
