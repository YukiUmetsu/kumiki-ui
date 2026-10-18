import { describe, expect, it } from "vitest";
import { Matrix4 } from "three";
import { createSemanticScene } from "../registry/visual/semantic-scene";
import { placeProtectedText } from "../registry/visual/protected-text";
import { deriveEventWindow, cameraShotBetweenEvents, relativeToEvent } from "../registry/visual/linked-events";
import { deriveSemanticTrackingWindow, focusOnSemanticTargets, inspectCriticalCameraFrames } from "../registry/visual/camera-constraints";
import { createCameraTargetRegistry } from "../registry/motion/camera-targets";
import { compileCinematicCamera } from "../registry/motion/cinematic-camera-director";
import { projectCameraBounds } from "../registry/motion/camera-spatial";
import type { CameraSequenceSpec } from "../registry/motion/cinematic-camera-types";
import type { CompiledMotionDirector } from "../registry/motion/director-types";

describe("Kumiki visual constraints: physical attachments", () => {
  const assets = [
    { id: "router", fidelity: "hero" as const,
      components: [{ id: "chassis", purpose: "carries front Ethernet ports" }],
      materialIds: ["brushed-metal", "polymer"],
      worldMatrix: new Matrix4().makeTranslation(10, 2, 3).toArray(),
      attachments: [{ id: "lan1", medium: "ethernet" as const,
        direction: "output" as const, localPosition: [1, 0, 1] as const,
        localNormal: [0, 0, 1] as const }] },
    { id: "server", fidelity: "supporting" as const,
      attachments: [{ id: "nic1", medium: "ethernet" as const,
        direction: "input" as const, localPosition: [0, 0, -1] as const,
        localNormal: [0, 0, -1] as const },
        { id: "wireless", medium: "radio" as const,
          direction: "input" as const, localPosition: [0, 0, 0] as const,
          localNormal: [0, 0, 1] as const }] },
  ];
  it("connects only registered matching ports with actual transformed positions", () => {
    const scene = createSemanticScene(assets);
    const connection = scene.connect({ id: "ethernet-1", from: "router.lan1", to: "server.nic1" });
    expect(connection.medium).toBe("ethernet");
    expect(connection.from.position).toEqual([11, 2, 4]);
    expect(connection.to.position).toEqual([0, 0, -1]);
    expect(connection.length).toBeGreaterThan(11);
    expect(scene.inspectCraft()).toEqual([]);
    expect(() => scene.connect({ id: "bad", from: "router.center", to: "server.nic1" })).toThrow(/Unknown semantic/);
    expect(() => scene.connect({ id: "bad", from: "router.lan1", to: "server.wireless" })).toThrow(/nonphysical medium/);
    expect(() => createSemanticScene([assets[0], assets[0]])).toThrow(/unique/);
  });
  it("warns on an incomplete hero, without pretending metadata proves visual quality", () => {
    const scene = createSemanticScene([{ id: "box", fidelity: "hero", attachments: [] }]);
    expect(scene.inspectCraft().map(d => d.code)).toEqual(["asset-craft-incomplete"]);
    expect(createSemanticScene([{ id: "diagram", fidelity: "abstract", attachments: [] }]).inspectCraft()).toEqual([]);
  });
});

describe("Kumiki visual constraints: protected text", () => {
  const measure = (_font: string, str: string) => str.length * 10;
  it("chooses an actual open region and refuses text overlapping the hero", () => {
    const subject = { x: .06, y: .15, width: .46, height: .71 };
    const result = placeProtectedText({ id: "caption", text: "Routers forward using destination addresses.",
      font: "500 20px system-ui", fontSizePx: 20, lineHeightPx: 25,
      viewport: { width: 1000, height: 600 }, protectedRegions: [subject],
      placement: ["right"], maxLines: 3 }, measure);
    expect(result.ok).toBe(true);
    expect(result.placement?.rect.x).toBeGreaterThan(subject.x + subject.width);
    expect(result.placement?.lines.join(" ")).toContain("Routers forward");
  });
  it("fails loudly instead of ellipsizing text or shrinking fonts", () => {
    const result = placeProtectedText({ id: "too-long", text: "unbreakable".repeat(40),
      font: "500 20px system-ui", fontSizePx: 20, lineHeightPx: 26,
      viewport: { width: 900, height: 500 },
      protectedRegions: [{ x: .1, y: .05, width: .8, height: .9 }], maxLines: 1 }, measure);
    expect(result).toMatchObject({ ok: false, diagnostics: [{ code: "layout-impossible" }] });
    const missingMeasure = placeProtectedText({ id: "caption", text: "Visible",
      font: "20px sans-serif", fontSizePx: 20, lineHeightPx: 24,
      viewport: { width: 900, height: 500 }, protectedRegions: [] }, () => 0);
    expect(missingMeasure.diagnostics[0].code).toBe("text-measurer-unavailable");
  });
});

describe("Kumiki visual constraints: semantic camera and follow timing", () => {
  const bounds = (x: number) => ({ min: [x - .15, -.15, -.15] as const,
    max: [x + .15, .15, .15] as const });
  const registry = createCameraTargetRegistry({ revision: "qa-1", targets: [
    { id: "subject", frames: [{ frame: 0, bounds: bounds(0) }] },
  ] });
  const sequence: CameraSequenceSpec = { schemaVersion: 1, id: "qa-camera",
    title: "QA camera", fps: { num: 30, den: 1 }, durationFrames: 30,
    output: { width: 1280, height: 720 },
    shots: [{ id: "subject-shot", type: "establish", durationFrames: 30,
      target: "subject", framing: "medium" }] };
  it("uses CC1 projection, not image classification, to enforce safe subjects", () => {
    const result = compileCinematicCamera(sequence, registry);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ok = inspectCriticalCameraFrames(result.plan, registry, [{
      id: "subject-visible", targetIds: ["subject"],
      startFrame: 0, endFrame: 30, strideFrames: 9,
      safeRegion: { x: 0, y: 0, width: 1, height: 1 },
    }]);
    expect(ok.failures).toEqual([]);
    expect(ok.sampledFrames).toBeGreaterThan(3);
    const wrong = inspectCriticalCameraFrames(result.plan, registry, [{
      id: "subject-forbidden", targetIds: ["subject"],
      startFrame: 0, endFrame: 30,
      safeRegion: { x: .85, y: .85, width: .1, height: .1 }, strideFrames: 15,
    }]);
    expect(wrong.failures.some(f => f.code === "target-outside-safe-area")).toBe(true);
  });
  it("frames multiple named targets with CC1's existing bounded solver", () => {
    const pose = focusOnSemanticTargets({ registry, targetIds: ["subject"], frame: 0,
      direction: [0, 0, 1], output: sequence.output, framing: "close" });
    const visible = projectCameraBounds(pose, bounds(0), 1280 / 720);
    expect(visible.clipped).toBe(false);
    expect(visible.rect.x).toBeGreaterThan(0);
    expect(visible.rect.x + visible.rect.width).toBeLessThan(1);
  });
  it("derives a following window from subject arrival events, not hardcoded frames", () => {
    const moving = createCameraTargetRegistry({ revision: "route", targets: [
      { id: "pulse", frames: [{ frame: 0, bounds: bounds(0) }, { frame: 40, bounds: bounds(10) }] },
      { id: "router-b", frames: [{ frame: 0, bounds: bounds(2) }] },
      { id: "router-c", frames: [{ frame: 0, bounds: bounds(8) }] },
    ] });
    const result = deriveSemanticTrackingWindow(moving, { movingId: "pulse",
      fromId: "router-b", toId: "router-c", searchStart: 0, searchEnd: 41,
      proximity: .3, leadFrames: 5, tailFrames: 4 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.startFrame).toBeLessThan(result.fromArrival);
    expect(result.endFrame).toBeGreaterThan(result.toArrival);
    expect(result.toArrival).toBeGreaterThan(result.fromArrival);
  });
});

describe("Kumiki visual constraints: one MD1 event timeline", () => {
  const direction: Pick<CompiledMotionDirector, "source" | "schedule"> = {
    source: { schemaVersion: 1, id: "film", title: "Film",
      fps: { num: 30, den: 1 }, durationFrames: 100, targets: [], children: [] },
    schedule: [
      { id: "send", kind: "cue", startFrame: 20, endFrame: 21, path: "children[0]" },
      { id: "arrive", kind: "cue", startFrame: 55, endFrame: 56, path: "children[1]" },
    ],
  };
  it("links camera shots to compiled events, not duplicated timing constants", () => {
    expect(relativeToEvent("send", "end", 3)).toEqual({ ref: "send", edge: "end", offsetFrames: 3 });
    const window = deriveEventWindow(direction, {
      from: { id: "send", edge: "start" }, until: { id: "arrive", edge: "end" },
      leadFrames: 7, tailFrames: 3,
    });
    expect(window).toEqual({ startFrame: 13, endFrame: 59, durationFrames: 46,
      fromId: "send", untilId: "arrive" });
    const shot = cameraShotBetweenEvents({ id: "follow-send", type: "follow",
      target: "signal", framing: "close" }, window);
    expect(shot).toMatchObject({ id: "follow-send", at: 13, durationFrames: 46 });
    expect(() => deriveEventWindow(direction, {
      from: { id: "arrive" }, until: { id: "send" },
    })).toThrow(/Invalid event window/);
  });
});
