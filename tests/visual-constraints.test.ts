import { describe, expect, it } from "vitest";
import { Matrix4 } from "three";
import { createSemanticScene } from "../registry/visual/semantic-scene";
import { placeProtectedText } from "../registry/visual/protected-text";
import {
  inspectSafeFrame, inspectSafeFrameSet, safeFrameCameraComposition, safeFrameContentRect, safeFrameProfileFromInset,
  safeFrameTextConstraints, type SafeFrameProfile,
} from "../registry/visual/safe-frame";
import {
  captionWrapSpans, evaluateCaptionTrack, layoutCaptionLines, placeCaptionBlocks, validateCaptionTrack, type CaptionTrack,
} from "../registry/visual/caption-track";
import { inspectSeekParity } from "../registry/visual/explainer-principles";
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

describe("Kumiki visual constraints: short safe frame", () => {
  const measure = (_font: string, str: string) => str.length * 10;
  const portrait: SafeFrameProfile = { id: "portrait", width: 1080, height: 1920, padding: 0.05, reserved: [
    { id: "header", edge: "top", rect: { x: 0, y: 0, width: 1, height: 0.07 } },
    { id: "progress", edge: "bottom", rect: { x: 0, y: 0.95, width: 1, height: 0.05 } },
    { id: "description", rect: { x: 0, y: 0.74, width: 0.8, height: 0.21 } },
    { id: "actions", rect: { x: 0.84, y: 0.4, width: 0.16, height: 0.55 } },
  ] };
  const landscape = safeFrameProfileFromInset({ id: "landscape", width: 1920, height: 1080,
    inset: { left: 0.08, right: 0.12, top: 0.09, bottom: 0.1 } });

  it("derives the content area from edge regions and bridges it to CC1 and text placement", () => {
    const content = safeFrameContentRect(portrait);
    expect(content.x).toBeCloseTo(0.05);
    expect(content.y).toBeCloseTo(0.07 + 0.05 * 1080 / 1920);
    expect(content.x + content.width).toBeCloseTo(0.95);
    expect(safeFrameCameraComposition(portrait).exclusions).toHaveLength(2);
    expect(safeFrameContentRect(landscape)).toMatchObject({ x: 0.08, y: 0.09 });
    expect(safeFrameContentRect(landscape).width).toBeCloseTo(0.8);
  });

  it("narrows a text slot around interior app UI instead of overlapping or giving up", () => {
    const text = safeFrameTextConstraints(portrait);
    const result = placeProtectedText({ id: "caption", text: "A router forwards each packet toward its destination.",
      font: "600 40px system-ui", fontSizePx: 40, lineHeightPx: 54, viewport: { width: 1080, height: 1920 },
      protectedRegions: [{ x: 0.12, y: 0.12, width: 0.7, height: 0.4 }], placement: ["below"], maxLines: 4, ...text }, measure);
    expect(result.ok).toBe(true);
    const rect = result.placement!.rect;
    expect(rect.x + rect.width).toBeLessThan(0.84);
    expect(inspectSafeFrame(portrait, [{ id: "caption", kind: "text", rect }]).ok).toBe(true);
  });

  it("reports text in reserved UI, critical subjects outside the content area and text over subjects", () => {
    const result = inspectSafeFrame(portrait, [
      { id: "hero", kind: "subject", critical: true, rect: { x: 0.6, y: 0.3, width: 0.38, height: 0.2 } },
      { id: "caption", kind: "text", rect: { x: 0.1, y: 0.78, width: 0.6, height: 0.06 } },
      { id: "label", kind: "text", rect: { x: 0.65, y: 0.35, width: 0.1, height: 0.04 } },
      { id: "decor", kind: "graphic", rect: { x: 0.85, y: 0.5, width: 0.1, height: 0.1 } },
    ]);
    expect(result.ok).toBe(false);
    expect(result.diagnostics.map(d => `${d.targetId}:${d.code}`)).toEqual(expect.arrayContaining([
      "hero:subject-in-reserved-region", "hero:subject-outside-safe-area",
      "caption:text-in-reserved-region", "label:text-covers-subject"]));
    expect(result.status).toMatchObject({ hero: "error", caption: "error", label: "error", decor: "ok" });
  });

  it("detects a centre-cropped or letterboxed output and missing subjects", () => {
    const wide = [
      { id: "a", kind: "subject" as const, critical: true, rect: { x: 0.36, y: 0.3, width: 0.1, height: 0.3 } },
      { id: "b", kind: "subject" as const, critical: true, rect: { x: 0.52, y: 0.3, width: 0.1, height: 0.3 } },
    ];
    const f = (1080 / 1920) / (1920 / 1080);
    const cropped = wide.map(item => ({ ...item, rect: { ...item.rect, x: (item.rect.x - (1 - f) / 2) / f, width: item.rect.width / f } }));
    const letterboxed = wide.map(item => ({ ...item, rect: { ...item.rect, y: (1 - f) / 2 + item.rect.y * f, height: item.rect.height * f } }));
    const tall = { ...portrait, reserved: [] };
    for (const items of [cropped, letterboxed])
      expect(inspectSafeFrameSet([{ profile: landscape, items: wide }, { profile: tall, items }]).diagnostics.map(d => d.code)).toContain("blind-crop");
    const authored = [{ ...wide[0], rect: { x: 0.2, y: 0.15, width: 0.4, height: 0.2 } }];
    const set = inspectSafeFrameSet([{ profile: landscape, items: wide }, { profile: tall, items: authored }]);
    expect(set.diagnostics.map(d => d.code)).toEqual(["item-missing-in-output"]);
  });
});

describe("Kumiki visual constraints: caption performer", () => {
  const measure = (_font: string, str: string) => [...str].length * 10;
  const words = (list: [string, number, number, number?][]) => list.map(([text, startFrame, endFrame, confidence]) => ({ text, startFrame, endFrame, confidence }));
  const track: CaptionTrack = { id: "t", fps: { num: 30, den: 1 }, timing: { source: "forced-alignment" },
    speakers: { a: { label: "A" }, b: { label: "B" } }, cues: [
      { id: "c1", startFrame: 0, endFrame: 60, speakerId: "a", text: "Routers read the address.",
        words: words([["Routers", 2, 14], ["read", 14, 22], ["the", 22, 26], ["address.", 26, 44]]) },
      { id: "c2", startFrame: 66, endFrame: 150, speakerId: "b", text: "ルーターは宛先を読み取ります。",
        words: words([["ルーターは", 68, 90], ["宛先を", 90, 104], ["読み取ります。", 104, 130]]) },
    ] };

  it("accepts aligned captions and evaluates word states purely by frame", () => {
    expect(validateCaptionTrack(track, { durationFrames: 150 })).toEqual([]);
    expect(evaluateCaptionTrack(track, 16)[0].wordStates).toEqual(["spoken", "active", "upcoming", "upcoming"]);
    expect(evaluateCaptionTrack(track, 62)).toEqual([]);
    const parity = inspectSeekParity(() => frame => evaluateCaptionTrack(track, frame), { durationFrames: 150, sampleCount: 40, seed: 9 });
    expect(parity.ok).toBe(true);
  });

  it("diagnoses late, overlapping, mismatched, low-confidence and unsupported timings", () => {
    const bad: CaptionTrack = { ...track, cues: [
      { id: "late", startFrame: 30, endFrame: 90, speakerId: "a", text: "Late cue here.", words: words([["Late", 20, 30], ["cue", 30, 40], ["here.", 40, 50, 0.3]]) },
      { id: "same", startFrame: 80, endFrame: 160, speakerId: "a", text: "Same speaker overlaps." },
      { id: "other", startFrame: 150, endFrame: 230, speakerId: "b", text: "Other speaker overlaps." },
      { id: "mismatch", startFrame: 240, endFrame: 330, speakerId: "x", text: "Shown words differ.", words: words([["Shown", 240, 250], ["copy", 250, 260]]) },
      { id: "flash", startFrame: 340, endFrame: 346, text: "Much too short to read." },
    ] };
    const found = validateCaptionTrack(bad, { durationFrames: 340 }).map(d => `${d.severity}:${d.code}:${d.cueId}`);
    expect(found).toEqual(expect.arrayContaining([
      "error:caption-word-outside-cue:late", "warning:caption-low-confidence:late", "error:caption-cue-overlap:same",
      "warning:caption-cue-overlap:other", "error:caption-words-mismatch-text:mismatch", "error:caption-speaker-unknown:mismatch",
      "warning:caption-hold-short:flash", "error:caption-out-of-range:flash"]));
    const estimated = validateCaptionTrack({ ...track, timing: { source: "script-estimate" } });
    expect(estimated.map(d => d.code)).toContain("caption-word-timing-unsupported");
    expect(evaluateCaptionTrack({ ...track, timing: { source: "script-estimate" } }, 16)[0].wordStates).toBeUndefined();
  });

  it("wraps between aligned units, keeps offsets and never truncates", () => {
    const cjk = track.cues[1];
    const units = [{ start: 0, end: 5 }, { start: 5, end: 8 }, { start: 8, end: 15 }];
    const result = layoutCaptionLines({ text: cjk.text, language: "ja", measure, font: "16px x", lineHeightPx: 20, maxWidthPx: 90, maxLines: 3, units });
    // 80px fits "ルーターは宛先を"; the next unit would split 読み取ります if breaks were per character.
    expect(result.ok && result.lines.map(l => l.text)).toEqual(["ルーターは宛先を", "読み取ります。"]);
    expect(result.ok && result.lines.map(l => cjk.text.slice(l.start, l.end))).toEqual(["ルーターは宛先を", "読み取ります。"]);
    const tooMany = layoutCaptionLines({ text: "one two three four five six", measure, font: "16px x", lineHeightPx: 20, maxWidthPx: 80, maxLines: 2 });
    expect(tooMany).toMatchObject({ ok: false, code: "layout-impossible" });
  });

  it("narrows and lifts captions around reserved app UI, stacking concurrent cues", () => {
    const lane = { x: 0.06, y: 0.1, width: 0.88, height: 0.8 };
    const avoid = [{ x: 0, y: 0.74, width: 0.8, height: 0.21 }, { x: 0.84, y: 0.4, width: 0.16, height: 0.55 }];
    const spans = captionWrapSpans(lane, avoid, 0.9, 0.01);
    expect(spans[0].width).toBeCloseTo(0.792);
    expect(spans.some(span => span.x === lane.x && span.width < 0.78)).toBe(true);
    const variant = (span: { x: number; width: number }) => ({ widthPx: span.width * 1000, heightPx: 120, span });
    const placed = placeCaptionBlocks([
      { id: "first", variants: spans.map(variant) },
      { id: "second", variants: spans.map(variant) },
    ], { viewport: { width: 1000, height: 1780 }, lane, avoidRegions: avoid, gapPx: 10 });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    const [first, second] = [placed.rects.first, placed.rects.second];
    for (const rect of [first, second]) for (const region of avoid)
      expect(rect.x + rect.width <= region.x || rect.x >= region.x + region.width || rect.y + rect.height <= region.y || rect.y >= region.y + region.height).toBe(true);
    expect(first.y + first.height).toBeLessThanOrEqual(second.y);
  });
});
