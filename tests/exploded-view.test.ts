/**
 * `exploded-view` — hierarchical part ordering, reversible staggered separation
 * and the renderer-independent Three.js assembly/annotation math.
 *
 * The pure `exploded-view.ts` half pins topological ordering, cycle/missing
 * parent rejection, range validation and deterministic separation sampling.
 * The `exploded-view-three.ts` half is exercised with real `three` math objects
 * (no WebGL context is created), pinning transform ownership, separation scale
 * bounds, disposal and camera-projected label packing.
 */

import { describe, expect, it, vi } from "vitest";
import { Object3D, PerspectiveCamera } from "three";

import {
  createExplodedTimeline,
  evaluateExplodedView,
  orderAssemblyParts,
} from "../registry/motion/exploded-view";
import type { AssemblyPart3D } from "../registry/motion/exploded-view";
import {
  createExplodedAssembly,
  projectAssemblyAnnotations,
} from "../registry/motion/exploded-view-three";
import type { CameraPoint3D } from "../registry/motion/camera-rig-3d";
import type { MotionTimeline } from "../registry/motion/types";

const FPS = { num: 30, den: 1 };

const PARTS: readonly AssemblyPart3D[] = [
  { id: "base", position: [0, 0, 0], offset: [0, 2, 0], label: "Base" },
  { id: "cap", parentId: "base", position: [0, 1, 0], offset: [0, 1, 0], label: "Cap", labelSide: "right" },
];

function separationTimeline(reassemble = false): MotionTimeline {
  return createExplodedTimeline({
    id: reassemble ? "assembly-reversible" : "assembly",
    parts: PARTS,
    fps: FPS,
    durationFrames: reassemble ? 120 : 60,
    separate: { startFrame: 0, endFrame: 30 },
    ...(reassemble ? { reassemble: { startFrame: 60, endFrame: 100 } } : {}),
    staggerFrames: 0,
  });
}

describe("orderAssemblyParts — hierarchy", () => {
  it("returns a stable parent-first order", () => {
    const unordered: AssemblyPart3D[] = [
      { id: "cap", parentId: "base", offset: [0, 0, 0] },
      { id: "base", offset: [0, 0, 0] },
    ];
    expect(orderAssemblyParts(unordered).map((part) => part.id)).toEqual(["base", "cap"]);
  });

  it("rejects duplicate ids, missing parents and cycles", () => {
    expect(() => orderAssemblyParts([
      { id: "a", offset: [0, 0, 0] },
      { id: "a", offset: [0, 0, 0] },
    ])).toThrow(/unique non-empty ID/);

    expect(() => orderAssemblyParts([
      { id: "a", parentId: "ghost", offset: [0, 0, 0] },
    ])).toThrow(/missing parent "ghost"/);

    expect(() => orderAssemblyParts([
      { id: "a", parentId: "b", offset: [0, 0, 0] },
      { id: "b", parentId: "a", offset: [0, 0, 0] },
    ])).toThrow(/cycle at/);
  });

  it("rejects non-finite transforms and non-positive scale", () => {
    expect(() => orderAssemblyParts([
      { id: "a", offset: [0, 0] as unknown as CameraPoint3D },
    ])).toThrow(/finite XYZ triples/);
    expect(() => orderAssemblyParts([
      { id: "a", offset: [0, 0, 0], scale: [1, 0, 1] },
    ])).toThrow(/positive scale components/);
  });
});

describe("createExplodedTimeline — ranges and sampling", () => {
  it("compiles one separation track per part", () => {
    const timeline = separationTimeline();
    expect(timeline.nodes).toHaveLength(PARTS.length);
    expect(timeline.nodes.every((node) => node.kind === "track" && node.track.property === "separation")).toBe(true);
  });

  it("rejects unusable ranges, staggering and ordering", () => {
    const base = { id: "x", parts: PARTS, fps: FPS, durationFrames: 60, staggerFrames: 0 };
    expect(() => createExplodedTimeline({ ...base, id: " ", separate: { startFrame: 0, endFrame: 30 } }))
      .toThrow(/Exploded view needs an ID/);
    expect(() => createExplodedTimeline({ ...base, durationFrames: 1, separate: { startFrame: 0, endFrame: 30 } }))
      .toThrow(/at least two composition frames/);
    expect(() => createExplodedTimeline({ ...base, staggerFrames: -1, separate: { startFrame: 0, endFrame: 30 } }))
      .toThrow(/nonnegative integer staggerFrames/);
    expect(() => createExplodedTimeline({ ...base, separate: { startFrame: 0, endFrame: 1 } }))
      .toThrow(/at least two motion frames per part/);
    expect(() => createExplodedTimeline({
      ...base, separate: { startFrame: 0, endFrame: 30 }, reassemble: { startFrame: 10, endFrame: 40 },
    })).toThrow(/Reassembly must begin after separation ends/);
  });

  it("separates then holds, and reverses cleanly when reassembly is authored", () => {
    const forward = separationTimeline();
    const at = (timeline: MotionTimeline, frame: number) => evaluateExplodedView(PARTS, timeline, frame).get("base");
    expect(at(forward, 0)).toBe(0);
    expect(at(forward, 15)).toBeGreaterThan(0);
    expect(at(forward, 29)).toBe(1);
    expect(at(forward, 59)).toBe(1);

    const reversible = separationTimeline(true);
    expect(at(reversible, 39)).toBe(1);
    expect(at(reversible, 60)).toBe(1);
    expect(at(reversible, 99)).toBe(0);
    expect(at(reversible, 119)).toBe(0);
  });

  it("clamps sampled amounts and rejects a timeline without separation tracks", () => {
    const timeline = separationTimeline();
    expect(evaluateExplodedView(PARTS, timeline, 999).get("cap")).toBe(1);
    expect(() => evaluateExplodedView(PARTS, timeline, 1.5)).toThrow(/finite integer frame/);
    const empty: MotionTimeline = { schemaVersion: 1, id: "empty", fps: FPS, durationFrames: 10, nodes: [] };
    expect(() => evaluateExplodedView(PARTS, empty, 0)).toThrow(/no valid separation track/);
  });
});

describe("createExplodedAssembly — transform ownership", () => {
  function build() {
    const disposers: Array<ReturnType<typeof vi.fn>> = [];
    const assembly = createExplodedAssembly(PARTS, () => {
      const dispose = vi.fn();
      disposers.push(dispose);
      return { object: new Object3D(), dispose };
    });
    return { assembly, disposers };
  }

  it("nests child groups under their parent and exposes objects and anchors", () => {
    const { assembly } = build();
    expect(assembly.parts.map((part) => part.id)).toEqual(["base", "cap"]);
    expect(assembly.objects.size).toBe(2);
    expect(assembly.anchors.size).toBe(2);
    const baseGroup = assembly.objects.get("base")?.parent;
    expect(baseGroup?.name).toBe("base");
    const capGroup = assembly.objects.get("cap")?.parent;
    expect(capGroup?.name).toBe("cap");
    expect(capGroup?.parent?.name).toBe("base");
  });

  it("applies separation offsets scaled by separationScale", () => {
    const { assembly } = build();
    const timeline = separationTimeline();
    const position = (id: string) => assembly.objects.get(id)?.parent?.position;

    assembly.update(timeline, 0);
    expect(position("base")?.toArray()).toEqual([0, 0, 0]);

    assembly.update(timeline, 29);
    expect(position("base")?.toArray()).toEqual([0, 2, 0]);
    // The cap offset is local to the base group.
    expect(position("cap")?.toArray()).toEqual([0, 2, 0]);

    assembly.update(timeline, 29, 0.5);
    expect(position("base")?.toArray()).toEqual([0, 1, 0]);
  });

  it("rejects an out-of-range separation scale", () => {
    const { assembly } = build();
    expect(() => assembly.update(separationTimeline(), 29, 4)).toThrow(/separationScale/);
    expect(() => assembly.update(separationTimeline(), 29, -1)).toThrow(/separationScale/);
  });

  it("disposes every part resource and clears the root", () => {
    const { assembly, disposers } = build();
    assembly.dispose();
    expect(disposers).toHaveLength(2);
    for (const dispose of disposers) expect(dispose).toHaveBeenCalledTimes(1);
    expect(assembly.root.children).toHaveLength(0);
  });
});

describe("projectAssemblyAnnotations — projected labels", () => {
  function cameraAt(): PerspectiveCamera {
    const camera = new PerspectiveCamera(40, 800 / 600, 0.1, 100);
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);
    camera.updateProjectionMatrix();
    return camera;
  }

  function assembly() {
    return createExplodedAssembly(PARTS, () => ({ object: new Object3D(), dispose: () => {} }));
  }

  it("projects anchors into bounded columns and packs them without overlap", () => {
    const labels = projectAssemblyAnnotations(assembly(), cameraAt(), { width: 800, height: 600 });
    expect(labels).toHaveLength(2);
    expect(labels.every((label) => label.state === "visible")).toBe(true);
    expect(labels.every((label) => label.side === "right")).toBe(true);
    expect(labels.every((label) => label.width === 180 && label.height === 42)).toBe(true);
    expect(labels[0].y).toBeLessThan(labels[1].y);
    expect(labels[1].y - labels[0].y).toBeGreaterThanOrEqual(42);
    expect(labels.map((label) => label.label).sort()).toEqual(["Base", "Cap"]);
  });

  it("validates output size and label dimensions", () => {
    expect(() => projectAssemblyAnnotations(assembly(), cameraAt(), { width: 100, height: 600 }))
      .toThrow(/large enough for two label columns/);
    expect(() => projectAssemblyAnnotations(assembly(), cameraAt(), { width: 800, height: 600 }, { labelWidth: 0 }))
      .toThrow(/positive label dimensions/);
    expect(() => projectAssemblyAnnotations(assembly(), cameraAt(), { width: 800, height: 600 }, { inset: -1 }))
      .toThrow(/nonnegative inset/);
  });

  it("keeps labels visible when occlusion is shown through", () => {
    const labels = projectAssemblyAnnotations(assembly(), cameraAt(), { width: 800, height: 600 }, { occlusion: "show-through" });
    expect(labels.every((label) => label.state === "visible")).toBe(true);
  });
});
