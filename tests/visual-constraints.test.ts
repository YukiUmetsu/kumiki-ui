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
import type { MeasureText } from "../registry/media/text-layout";
import {
  distributionDuration, evaluateDistributionStage, layoutDistributionStage, NORMAL_CDF_MAX_ABS_ERROR, normalCdf, normalPdf,
  prepareDistributionStage, seededNormalSamples, type DistributionStageSpec,
} from "../registry/visual/distribution-stage";
import {
  checkMapSpec, evaluateMapStage, layoutMapStage, mapStageDuration, projectMapPosition, type MapFeature, type MapStageOptions, type MapStageSpec,
} from "../registry/visual/map-stage";
import {
  evaluateScaleComparison, exactFactorText, formatScaleNumber, layoutScaleComparison, parseExactFactor, roundSignificant,
  scaleComparisonDuration, scaleConvertReadout, scaleRatioReadout, validateScaleComparison,
  type ScaleComparisonSpec,
} from "../registry/visual/scale-comparison-stage";
import {
  evaluateGraphStage, forceLayout, layeredLayout, prepareGraphStage, traverseGraph, validateGraphStage, validateGraphTopology,
  type GraphStageOptions, type GraphStageSpec, type GraphTopology,
} from "../registry/visual/graph-topology-stage";
import {
  codeLines, evaluateCodeStage, layoutCodeStage, tokenBox, tokenOccurrenceIndex, validateCodeStage,
  type CodeStageOptions, type CodeStageSpec,
} from "../registry/visual/code-stage";
import {
  evaluateEvidence, layoutEvidenceBox, layoutEvidenceSource, layoutEvidenceSources, validateEvidenceStage,
  type EvidenceSource, type EvidenceStageSpec,
} from "../registry/visual/evidence-stage";
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

describe("Kumiki visual constraints: evidence stage", () => {
  const measure = (_font: string, str: string) => [...str].length * 10;
  const owned = { status: "owned" as const, reference: "in-house" };
  const prov = (title: string) => ({ title, publisher: "Demo", date: "2026-10-22", locator: "p. 1", rights: owned });
  const TEXT = "Parcels ship in stop order. Each stop adds 12 minutes. Hotline 555-0100.";
  const sources: EvidenceSource[] = [
    { id: "doc", kind: "text", text: TEXT, width: 400, fontSizePx: 20, provenance: prov("Policy"),
      redactions: [{ start: TEXT.indexOf("555"), end: TEXT.indexOf("555") + 8 }],
      anchors: [{ id: "order", quote: "stop order" }, { id: "rule", quote: "adds 12 minutes", start: TEXT.indexOf("adds") }] },
    { id: "photo", kind: "image", alt: "A labelled parcel", provenance: prov("Still"),
      asset: { id: "p", uri: "p.jpg", mediaType: "image/jpeg", width: 2000, height: 1000 }, anchors: [{ id: "label", rect: { x: 1400, y: 500, width: 200, height: 100 } }] },
    { id: "table", kind: "table", provenance: prov("Schedule"), fontSizePx: 20, rowHeight: 40,
      columns: [{ id: "route", label: "Route", width: 100 }, { id: "start", label: "Start", width: 120 }],
      rows: [{ id: "a", cells: { route: "R1", start: "09:00" } }, { id: "b", cells: { route: "R7", start: "10:04" } }],
      anchors: [{ id: "b-start", rowId: "b", columnId: "start", expect: "10:04" }] },
  ];
  const spec = (over: Partial<EvidenceStageSpec> = {}): EvidenceStageSpec => ({ id: "s", fps: { num: 30, den: 1 }, sources, moveFrames: 10,
    beats: [
      { id: "doc-open", kind: "establish", sourceId: "doc", durationFrames: 120 },
      { id: "doc-rule", kind: "focus", sourceId: "doc", anchorIds: ["rule"], durationFrames: 40 },
      { id: "table-b", kind: "focus", sourceId: "table", anchorIds: ["b-start"], durationFrames: 40 },
      { id: "photo-label", kind: "focus", sourceId: "photo", anchorIds: ["label"], durationFrames: 40 },
      { id: "end", kind: "conclude", durationFrames: 30 },
    ],
    conclusion: { text: "10:04 [2] plus 12 minutes [1].", citations: [{ marker: "[1]", sourceId: "doc", anchorId: "rule" }, { marker: "[2]", sourceId: "table", anchorId: "b-start" }] },
    ...over });

  it("lays out exact anchors: quotes at measured offsets, table cells with their row label and header", () => {
    const { surfaces, diagnostics } = layoutEvidenceSources(spec(), measure);
    expect(diagnostics).toEqual([]);
    const doc = surfaces.doc;
    // 400px wide, 48px padding → 304px lines; "stop order" sits on line 1 at 16 characters in.
    expect(doc.text!.display).toContain("Hotline ████████.");
    expect(doc.text!.display.length).toBe(TEXT.length);
    expect(doc.anchors.order).toMatchObject({ x: 48 + 160, y: 48, width: 100 });
    expect(surfaces.table.anchors["b-start"]).toEqual({ x: 124, y: 24 + 40 + 40, width: 120, height: 40 });
    expect(surfaces.table.context["b-start"]).toEqual({ x: 24, y: 24, width: 220, height: 120 });
  });

  it("refuses misquotes, cited redactions, wrong cell values, out-of-image regions and unauthorized sources", () => {
    const bad: EvidenceSource[] = [
      { ...sources[0], anchors: [{ id: "x", quote: "ships in stop order" }, { id: "y", quote: "555-0100" }, { id: "z", quote: "stop", }] } as EvidenceSource,
      { ...sources[1], anchors: [{ id: "label", rect: { x: 1900, y: 500, width: 200, height: 100 } }] } as EvidenceSource,
      { ...sources[2], anchors: [{ id: "b-start", rowId: "b", columnId: "start", expect: "10:40" }] } as EvidenceSource,
    ];
    const codes = bad.flatMap(source => layoutEvidenceSource(source, measure).diagnostics.map(d => d.code));
    expect(codes).toEqual(expect.arrayContaining(["evidence-quote-mismatch", "evidence-anchor-redacted", "evidence-anchor-outside", "evidence-value-mismatch"]));
    expect(codes.filter(c => c === "evidence-quote-mismatch")).toHaveLength(2); // misquote and an ambiguous "stop"
    const unauthorized = spec({ sources: [{ ...sources[1], alt: "", provenance: { ...prov("Still"), publisher: undefined, rights: { status: "fair-use-claimed", reference: "" } } } as EvidenceSource, sources[0], sources[2]] });
    const v = validateEvidenceStage(unauthorized, layoutEvidenceSources(unauthorized, measure).surfaces).map(d => d.code);
    expect(v).toEqual(expect.arrayContaining(["evidence-provenance-missing", "evidence-rights-missing", "evidence-fair-use-claimed", "evidence-alt-missing"]));
  });

  it("checks the conclusion's citations against anchors and focus beats", () => {
    const s = spec({ conclusion: { text: "Arrives [1] [9].", citations: [{ marker: "[1]", sourceId: "photo", anchorId: "label" }, { marker: "[2]", sourceId: "doc", anchorId: "order" }, { marker: "[3]", sourceId: "doc", anchorId: "nope" }] } });
    const codes = validateEvidenceStage(s, layoutEvidenceSources(s, measure).surfaces).map(d => d.code);
    expect(codes).toEqual(expect.arrayContaining(["evidence-citation-unused", "evidence-citation-unknown", "evidence-citation-dangling", "evidence-citation-unshown"]));
  });

  it("reserves measured lanes, keeps the target and its context inside the viewport, and seeks deterministically", () => {
    const s = spec(), { surfaces } = layoutEvidenceSources(s, measure), box = { width: 1080, height: 1920 };
    const focus = s.beats[2], lanes = layoutEvidenceBox(s, { ...focus, callouts: [{ anchorId: "b-start", title: "x" }] }, box, measure);
    expect(lanes.noteLane).toBeDefined();
    expect(lanes.provenance!.rect.y + lanes.provenance!.rect.height).toBeLessThanOrEqual(box.height);
    expect(lanes.viewport.y).toBeGreaterThanOrEqual(lanes.noteLane!.y + lanes.noteLane!.height);
    expect(lanes.viewport.y + lanes.viewport.height).toBeLessThan(lanes.provenance!.rect.y);
    const long = layoutEvidenceBox({ ...s, sources: [{ ...sources[2], provenance: { ...prov("A very long schedule title ".repeat(6)) } } as EvidenceSource] }, focus, box, measure);
    expect(long.provenance!.lines.filter(l => l.tone === "title").length).toBeGreaterThan(1);
    expect(long.provenance!.lines.map(l => l.text).join(" ")).toContain("A very long schedule title A very long");
    const viewportOf = (b: EvidenceStageSpec["beats"][number]) => layoutEvidenceBox(s, b, box, measure).viewport;
    const held = evaluateEvidence(s, surfaces, 120 + 40 + 39, box, viewportOf), d = held.draw!, ctx = surfaces.table.context["b-start"], vp = viewportOf(focus);
    expect(held.sourceId).toBe("table");
    expect(d.dx + (ctx.x - d.sx) * d.scale).toBeGreaterThanOrEqual(vp.x - 0.5);
    expect(d.dx + (ctx.x + ctx.width - d.sx) * d.scale).toBeLessThanOrEqual(vp.x + vp.width + 0.5);
    expect(evaluateEvidence(s, surfaces, 0, box).crop).toEqual({ x: 0, y: 0, width: surfaces.doc.width, height: surfaces.doc.height });
    expect(evaluateEvidence(s, surfaces, 269, box)).toMatchObject({ conclusion: 1, sourceId: undefined });
    expect(validateEvidenceStage(s, surfaces, [box, { width: 1920, height: 1080 }], { measure }).filter(x => x.severity === "error")).toEqual([]);
    expect(inspectSeekParity(() => f => evaluateEvidence(s, surfaces, f, box, viewportOf), { durationFrames: 270, sampleCount: 60, seed: 5 }).ok).toBe(true);
  });
});

describe("CodeStage", () => {
  // Fake monospace measurer with exact advances: 0.6 em per character, so every width is checkable by hand.
  const measure = (font: string, text: string) => text.length * Number(/(\d+(?:\.\d+)?)px/.exec(font)![1]) * .6;
  const options: CodeStageOptions = { measure, maxFontPx: 40, minFontPx: 12, family: "mono", lineHeight: 1.5 };
  const text = "const a = 1;\nconst bb = a + 2;\nreturn bb;";
  const source = { id: "src", language: "ts", lines: codeLines(text, "l"),
    tokens: {
      l1: [{ text: "const", kind: "keyword" }, { text: " a = ", kind: "plain" }, { text: "1", kind: "number" }, { text: ";", kind: "plain" }],
      l2: [{ text: "const", kind: "keyword" }, { text: " bb = a + ", kind: "plain" }, { text: "2", kind: "number" }, { text: ";", kind: "plain" }],
      l3: [{ text: "return", kind: "keyword" }, { text: " bb;", kind: "plain" }],
    } };
  const base: CodeStageSpec = { id: "t", fps: { num: 30, den: 1 }, source, beats: [
    { id: "axes", kind: "establish", durationFrames: 30 },
    { id: "reveal-1", kind: "reveal", lineIds: ["l1", "l2"], durationFrames: 40 },
    { id: "reveal-2", kind: "reveal", lineIds: ["l3"], durationFrames: 20 },
    { id: "range", kind: "focus", from: "l2", to: "l3", durationFrames: 60 },
    { id: "token", kind: "token", lineId: "l2", token: "a", occurrence: 0, durationFrames: 60 },
  ] };
  const box = { x: 0, y: 0, width: 1080, height: 1920 };

  it("sizes the type to the largest font that fits the width and height, never truncating a line", () => {
    const layout = layoutCodeStage(base, box, options);
    expect(layout.font.size).toBe(40);                  // plenty of room: capped at maxFontPx
    expect(layout.lines.map(l => l.text)).toEqual(source.lines.map(l => l.text)); // nothing cut
    const narrow = layoutCodeStage(base, { x: 0, y: 0, width: 200, height: 1920 }, options);
    expect(narrow.font.size).toBeLessThan(40);
    expect(narrow.font.size * narrow.font.lineHeight * narrow.lines.length).toBeLessThanOrEqual(1920);
    // Width check: the widest line plus the gutter fits the box at the chosen size.
    const widest = Math.max(...narrow.lines.map(l => measure(narrow.font.css, l.text)));
    expect(widest + narrow.gutter.width).toBeLessThanOrEqual(200 + 1e-6);
    expect(narrow.diagnostics.map(d => d.code)).not.toContain("code-stage-font-small");
  });

  it("warns when the type is legal but under the comfortable size for the output", () => {
    const comfortable = { ...options, readablePx: 41 };
    expect(layoutCodeStage(base, box, comfortable).diagnostics.map(d => d.code)).toContain("code-stage-text-small");
    expect(layoutCodeStage(base, box, { ...options, readablePx: 20 }).diagnostics.map(d => d.code)).not.toContain("code-stage-text-small");
  });

  it("refuses code that cannot fit above the minimum size, rather than shrinking it into illegibility", () => {
    const tiny = layoutCodeStage(base, { x: 0, y: 0, width: 60, height: 40 }, options);
    expect(tiny.diagnostics).toContainEqual(expect.objectContaining({ code: "code-stage-font-small", severity: "error" }));
  });

  it("places token rings on the measured glyphs of the chosen occurrence", () => {
    const layout = layoutCodeStage(base, box, options);
    const line = layout.byId.get("l2")!;
    // "bb" occurs once on l2 (index 6, in "const bb"), so occurrence 1 does not exist.
    expect(tokenOccurrenceIndex(line.text, "bb", 0)).toBe(6);
    expect(tokenOccurrenceIndex(line.text, "bb", 1)).toBe(-1);
    const first = tokenBox(layout, "l2", "bb", 0, measure)!;
    expect(first.x).toBeCloseTo(line.x + measure(layout.font.css, "const "), 6);
    expect(first.width).toBeCloseTo(measure(layout.font.css, "bb"), 6);
    expect(tokenBox(layout, "l2", "bb", 1, measure)).toBeUndefined();
  });

  it("refuses unsafe stories: tokens that change the code, missing lines and occurrences, reversed ranges, duplicate ids", () => {
    const codes = (s: CodeStageSpec) => validateCodeStage(s, layoutCodeStage(s, box, options)).filter(d => d.severity === "error").map(d => d.code);
    expect(codes(base)).toEqual([]);
    const mismatched = { ...base, source: { ...source, tokens: { ...source.tokens, l2: [{ text: "const", kind: "keyword" }] } } };
    expect(codes(mismatched)).toContain("code-stage-token-mismatch");
    expect(codes({ ...base, beats: [...base.beats, { id: "x", kind: "reveal", lineIds: ["l9"], durationFrames: 10 }] })).toContain("code-stage-line-unknown");
    expect(codes({ ...base, beats: [{ id: "r", kind: "focus", from: "l3", to: "l1", durationFrames: 60 }] })).toContain("code-stage-range-invalid");
    expect(codes({ ...base, beats: [{ id: "t", kind: "token", lineId: "l2", token: "bb", occurrence: 3, durationFrames: 60 }] })).toContain("code-stage-token-missing");
    expect(codes({ ...base, source: { ...source, lines: [...source.lines, { id: "l1", text: "dup" }] } })).toContain("code-stage-line-duplicate");
    const short = validateCodeStage({ ...base, beats: [{ id: "f", kind: "focus", from: "l1", to: "l1", durationFrames: 10 }] }, undefined);
    expect(short.map(d => d.code)).toContain("code-stage-beat-short");
  });

  it("reveals lines progressively and keeps unrevealed lines laid out but invisible", () => {
    const at = (frame: number) => evaluateCodeStage(base, frame).lineOpacity;
    expect(at(0)).toEqual({ l1: 0, l2: 0, l3: 0 });          // establish: nothing revealed yet
    expect(at(30).l1).toBe(0);                                 // first reveal has just started
    expect(at(30 + 40).l1).toBe(1);                            // and both of its lines have landed by its end
    expect(at(30 + 40).l2).toBe(1);
    expect(at(30 + 40).l3).toBe(0);
    expect(at(30 + 40 + 20).l3).toBe(1);                       // accumulated reveals stay visible
    expect(at(30 + 40 + 20 + 60).l1).toBe(1);
  });

  it("dims everything outside focus and restores it after the focus beat, with no line moving", () => {
    const layout = layoutCodeStage(base, box, options);
    const focusStart = 30 + 40 + 20;                            // the "range" focus beat is frames 90–149
    const mid = evaluateCodeStage(base, focusStart + 30);
    expect(mid.focus?.lines).toEqual(["l2", "l3"]);
    expect(mid.focus!.amount).toBe(1);
    expect(mid.lineOpacity.l1).toBeCloseTo(.3, 6);             // dimmed to 30%
    expect(mid.lineOpacity.l2).toBe(1);
    // The token beat (frames 150–209) focuses l2 alone; after it ends, the dimming runs back out over moveFrames.
    const ending = evaluateCodeStage(base, 210 + 9);
    expect(ending.focus?.amount ?? 0).toBeGreaterThan(0);
    expect(ending.focus?.amount ?? 0).toBeLessThan(1);
    expect(evaluateCodeStage(base, 210 + 18).focus).toBeUndefined();
    expect(evaluateCodeStage(base, 210 + 18).lineOpacity.l1).toBe(1);   // restored in full
    expect(layout.byId.get("l1")!.y).toBe(0);                  // layout is frame-independent: lines never move
  });

  it("evaluates exactly at any frame (seek parity)", () => {
    const layout = layoutCodeStage(base, box, options);
    const total = base.beats.reduce((n, b) => n + b.durationFrames, 0);
    expect(inspectSeekParity(() => f => JSON.stringify([evaluateCodeStage(base, f).lineOpacity, layout.lines.map(l => l.y)]),
      { durationFrames: total, sampleCount: 40, seed: 11 }).ok).toBe(true);
  });
});

/* Deterministic stand-in measurer for jsdom: advance = 0.55 em per character. Production uses createCanvasMeasurer. */
const standIn: MeasureText = (font, text) => {
  const size = Number(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] ?? 16);
  return text.length * size * 0.55;
};

const RATE = { num: 30, den: 1 };
const samplesSpec = (over: Partial<DistributionStageSpec> = {}): DistributionStageSpec => ({
  id: "t", fps: RATE, title: "Test", provenance: "Fictional sample", xLabel: "Score (0 to 1)", yAxis: "count",
  source: { kind: "samples", values: [0.1, 0.15, 0.25, 0.25, 0.5, 0.9, 1.0], bins: { edges: [0, 0.25, 0.5, 0.75, 1] } },
  beats: [{ id: "a", kind: "establish", durationFrames: 30 }], ...over,
});
const normalSpec = (over: Partial<DistributionStageSpec> = {}): DistributionStageSpec => ({
  id: "n", fps: RATE, title: "Normal", provenance: "Illustrative parameters", xLabel: "Return (%)", yAxis: "density",
  source: { kind: "normal", mean: 0, sd: 1 }, beats: [{ id: "a", kind: "establish", durationFrames: 30 }], ...over,
});

describe("DistributionStage", () => {
  it("normal CDF stays within its stated maximum error at reference points, and is symmetric", () => {
    const reference: Array<[number, number]> = [
      [0, 0.5], [0.5, 0.6914624613], [1, 0.8413447461], [1.5, 0.9331927987], [1.96, 0.9750021049],
      [2, 0.9772498681], [3, 0.998650102], [-1.96, 0.0249978951], [-3, 0.001349898],
    ];
    for (const [z, phi] of reference) expect(Math.abs(normalCdf(z) - phi)).toBeLessThanOrEqual(NORMAL_CDF_MAX_ABS_ERROR);
    for (const z of [0.3, 1.1, 2.7]) expect(normalCdf(z) + normalCdf(-z)).toBeCloseTo(1, 7);
    expect(normalPdf(0, 0, 1)).toBeCloseTo(1 / Math.sqrt(2 * Math.PI), 12);
  });

  it("normal probability areas come from the CDF, and say so", () => {
    const spec = normalSpec({ areas: [{ id: "middle", low: -1.96, high: 1.96 }, { id: "tail", high: -2 }] });
    const prepared = prepareDistributionStage(spec);
    expect(prepared.ok).toBe(true);
    const [middle, tail] = prepared.model!.areas;
    expect(middle.basis).toBe("normal-cdf");
    expect(middle.probability).toBeCloseTo(0.95, 3);
    expect(tail.probability).toBeCloseTo(normalCdf(-2), 7);
    expect(middle.text).toContain("under the normal model");
    expect(prepared.model!.domain.min).toBeLessThanOrEqual(-1.96);
  });

  it("histograms have exact counts, and density heights integrate to one", () => {
    const counts = prepareDistributionStage(samplesSpec());
    expect(counts.ok).toBe(true);
    expect(counts.model!.bins.map(b => b.count)).toEqual([2, 2, 1, 2]);
    expect(counts.model!.bins.reduce((s, b) => s + (b.count ?? 0), 0)).toBe(7);
    const density = prepareDistributionStage(samplesSpec({ yAxis: "density", source: { kind: "samples", values: [0.1, 0.15, 0.25, 0.25, 0.5, 0.9, 1.0], bins: { count: 4, min: 0, max: 1 } } }));
    expect(density.ok).toBe(true);
    const mass = density.model!.bins.reduce((s, b) => s + b.value * b.width, 0);
    expect(mass).toBeCloseTo(1, 12);
    expect(density.model!.bins[0].count).toBe(2);
  });

  it("refuses samples outside the bins, axes that mismatch their data, and non-normalized or fractional data", () => {
    const outside = prepareDistributionStage(samplesSpec({ source: { kind: "samples", values: [0.2, 1.4], bins: { edges: [0, 1] } } }));
    expect(outside.ok).toBe(false);
    expect(outside.diagnostics.map(d => d.code)).toContain("distribution-sample-outside-bins");

    const densityOnCounts = prepareDistributionStage(samplesSpec({ yAxis: "density", source: { kind: "bin-counts", edges: [0, 1, 2], counts: [3, 5] } }));
    expect(densityOnCounts.diagnostics.map(d => d.code)).toContain("distribution-axis-mismatch");
    const countOnDensity = prepareDistributionStage(samplesSpec({ yAxis: "count", source: { kind: "bin-density", edges: [0, 1, 2], heights: [0.5, 0.5] } }));
    expect(countOnDensity.diagnostics.map(d => d.code)).toContain("distribution-axis-mismatch");
    const notNormalized = prepareDistributionStage(samplesSpec({ yAxis: "density", source: { kind: "bin-density", edges: [0, 1, 2], heights: [0.5, 0.2] } }));
    expect(notNormalized.diagnostics.map(d => d.code)).toContain("distribution-density-not-normalized");
    const fractional = prepareDistributionStage(samplesSpec({ source: { kind: "bin-counts", edges: [0, 1, 2], counts: [2.5, 3] } }));
    expect(fractional.diagnostics.map(d => d.code)).toContain("distribution-count-not-integer");
    const normalAsCount = prepareDistributionStage(normalSpec({ yAxis: "count" }));
    expect(normalAsCount.diagnostics.map(d => d.code)).toContain("distribution-axis-mismatch");
  });

  it("probability areas: sample probabilities say 'from N samples'; zero-width, inverted and unbounded areas are refused", () => {
    const ok = prepareDistributionStage(samplesSpec({ areas: [{ id: "high", low: 0.5 }] }));
    expect(ok.ok).toBe(true);
    expect(ok.model!.areas[0].probability).toBeCloseTo(3 / 7, 12);
    expect(ok.model!.areas[0].text).toContain("from 7 samples");

    const zero = prepareDistributionStage(samplesSpec({ areas: [{ id: "z", low: 0.5, high: 0.5 }] }));
    expect(zero.diagnostics.map(d => d.code)).toContain("distribution-area-zero-width");
    const inverted = prepareDistributionStage(samplesSpec({ areas: [{ id: "i", low: 0.9, high: 0.2 }] }));
    expect(inverted.diagnostics.map(d => d.code)).toContain("distribution-area-inverted");
    const open = prepareDistributionStage(samplesSpec({ areas: [{ id: "o" }] }));
    expect(open.diagnostics.map(d => d.code)).toContain("distribution-area-unbounded");
    const offBins = prepareDistributionStage(samplesSpec({ source: { kind: "bin-counts", edges: [0, 1, 2], counts: [3, 5] }, areas: [{ id: "b", low: 0.5 }] }));
    expect(offBins.diagnostics.map(d => d.code)).toContain("distribution-area-off-bins");
  });

  it("refuses intervals with a level outside (0, 1), an inverted range or an estimate outside the range; accepts a stated one", () => {
    const interval = (over: Partial<{ estimate: number; low: number; high: number; level: number }>) =>
      samplesSpec({ intervals: [{ id: "ci", estimate: 0.5, low: 0.4, high: 0.6, level: 0.95, ...over }], beats: [{ id: "a", kind: "interval", intervalId: "ci", durationFrames: 60 }] });
    const valid = prepareDistributionStage(interval({}));
    expect(valid.ok).toBe(true);
    expect(valid.model!.intervals[0].text).toContain("95% interval, stated");
    for (const level of [0, 1, 1.2]) expect(prepareDistributionStage(interval({ level })).diagnostics.map(d => d.code)).toContain("distribution-level-invalid");
    expect(prepareDistributionStage(interval({ low: 0.7, high: 0.6, estimate: 0.65 })).diagnostics.map(d => d.code)).toContain("distribution-interval-inverted");
    expect(prepareDistributionStage(interval({ estimate: 0.9 })).diagnostics.map(d => d.code)).toContain("distribution-interval-excludes-estimate");
  });

  it("the x range covers every bin, area and interval, and an explicit range that clips one is refused", () => {
    const spec = samplesSpec({
      areas: [{ id: "a", low: 0.5 }], intervals: [{ id: "i", estimate: 1.2, low: 1.1, high: 1.3, level: 0.9 }],
      beats: [{ id: "x", kind: "interval", intervalId: "i", durationFrames: 60 }],
    });
    const prepared = prepareDistributionStage(spec);
    expect(prepared.ok).toBe(true);
    expect(prepared.model!.domain.min).toBeLessThanOrEqual(0);
    expect(prepared.model!.domain.max).toBeGreaterThanOrEqual(1.3);
    expect(prepareDistributionStage({ ...spec, xRange: { min: 0, max: 1 } }).diagnostics.map(d => d.code)).toContain("distribution-range-clips");
  });

  it("reveal order is seeded, stacking is monotone, the end state equals the exact counts, and frames are pure", () => {
    const values = seededNormalSamples({ seed: 11, count: 40, mean: 0.5, sd: 0.15, decimals: 3 }).map(v => Math.min(0.999, Math.max(0.001, v)));
    const spec = samplesSpec({ seed: 3, source: { kind: "samples", values, bins: { count: 10, min: 0, max: 1 } },
      beats: [{ id: "a", kind: "establish", durationFrames: 10 }, { id: "r", kind: "reveal", durationFrames: 60 }] });
    const prepared = prepareDistributionStage(spec);
    expect(prepared.ok).toBe(true);
    expect(prepareDistributionStage({ ...spec, seed: 4 }).model!.order).not.toEqual(prepared.model!.order);
    expect(prepared.model!.order).toEqual(prepareDistributionStage(spec).model!.order);
    let previous = -1;
    for (let f = 0; f < distributionDuration(spec); f += 1) {
      const state = evaluateDistributionStage(spec, f);
      expect(state.revealed).toBeGreaterThanOrEqual(previous);
      previous = state.revealed;
    }
    expect(evaluateDistributionStage(spec, 10).revealed).toBe(0);
    const end = evaluateDistributionStage(spec, distributionDuration(spec) - 1);
    expect(end.revealed).toBe(40);
    expect(end.binFill).toEqual(prepared.model!.bins.map(b => b.count));
    const once = evaluateDistributionStage(spec, 37), again = (evaluateDistributionStage(spec, 5), evaluateDistributionStage(spec, 37));
    expect(again).toEqual(once);
  });

  it("seek parity holds for each source kind, and a crowded frame lays out with no error", () => {
    const specs: DistributionStageSpec[] = [
      samplesSpec({ areas: [{ id: "a", low: 0.5 }], beats: [{ id: "r", kind: "reveal", durationFrames: 60 }, { id: "a1", kind: "area", areaId: "a", durationFrames: 60 }] }),
      normalSpec({ areas: [{ id: "a", high: -1 }], beats: [{ id: "r", kind: "reveal", durationFrames: 60 }, { id: "a1", kind: "area", areaId: "a", durationFrames: 60 }] }),
      samplesSpec({ source: { kind: "bin-counts", edges: [0, 1, 2], counts: [3, 5] }, beats: [{ id: "r", kind: "reveal", durationFrames: 60 }] }),
    ];
    for (const spec of specs) {
      const parity = inspectSeekParity(() => (frame: number) => evaluateDistributionStage(spec, frame), { durationFrames: distributionDuration(spec), sampleCount: 40 });
      expect(parity.ok).toBe(true);
    }
    const laid = layoutDistributionStage(specs[0], { width: 1080, height: 1920 }, { measure: standIn });
    expect(laid.diagnostics.filter(d => d.severity === "error")).toEqual([]);
    expect(laid.layout!.plot.height).toBeGreaterThan(1920 * 0.25);
    const tiny = layoutDistributionStage(specs[0], { width: 1080, height: 1920 }, { measure: standIn, baseFontPx: 8, minFontPx: 12 });
    expect(tiny.ok).toBe(false);
    expect(tiny.diagnostics.map(d => d.code)).toEqual(expect.arrayContaining(["distribution-font-small"]));
  });
});

// Test double only: jsdom has no canvas, so the real measurer returns 0 here. Browser runs use createCanvasMeasurer.
const measure: MeasureText = (font, text) => text.length * Number(/(\d+)px/.exec(font)?.[1] ?? 10) * 0.5;
const options: MapStageOptions = { measure, labelPx: 20, legendPx: 18, attributionPx: 16, readablePx: 10 };
const BOX = { width: 1080, height: 1920 };

function base(): MapStageSpec {
  return {
    id: "test-map", fps: { num: 30, den: 1 }, projection: "equirectangular",
    collections: [{
      type: "FeatureCollection", id: "invented",
      attribution: { source: "Fictional geometry, no real boundaries", licence: "Original test geometry" },
      features: [
        { type: "Feature", id: "land", geometry: { type: "Polygon", coordinates: [[[0, 0], [10, 0], [10, 5], [0, 5], [0, 0]]] }, properties: { fillKey: "a" } },
        { type: "Feature", id: "port-a", geometry: { type: "Point", coordinates: [1, 1] }, properties: { name: "Port A" } },
        { type: "Feature", id: "port-b", geometry: { type: "Point", coordinates: [9, 4] }, properties: { name: "Port B" } },
        { type: "Feature", id: "lane", geometry: { type: "LineString", coordinates: [[1, 1], [5, 2], [9, 4]] } },
      ],
    }],
    routes: [{ id: "r1", featureId: "lane", from: "port-a", to: "port-b" }],
    legend: [{ key: "a", label: "Invented region" }],
    beats: [
      { id: "all", kind: "establish", durationFrames: 40 },
      { id: "go", kind: "route", routeId: "r1", durationFrames: 60 },
      { id: "port", kind: "focus", targetId: "port-b", durationFrames: 60 },
    ],
    moveFrames: 20,
  };
}
const feats = (spec: MapStageSpec) => spec.collections[0].features as MapFeature[];
const codes = (diagnostics: { code: string; severity: string }[]) => diagnostics.filter(d => d.severity === "error").map(d => d.code);

describe("MapStage core: projections, refusals, timing and seek parity", () => {
  it("accepts a valid spec and fits the establish view inside the viewport with aspect preserved", () => {
    const spec = base(), layout = layoutMapStage(spec, BOX, options);
    expect(codes(layout.diagnostics)).toEqual([]);
    const frame = evaluateMapStage(spec, layout, 0);
    for (const pin of frame.pins) {
      expect(pin.x).toBeGreaterThanOrEqual(layout.viewport.x);
      expect(pin.x).toBeLessThanOrEqual(layout.viewport.x + layout.viewport.width);
      expect(pin.y).toBeGreaterThanOrEqual(layout.viewport.y);
      expect(pin.y).toBeLessThanOrEqual(layout.viewport.y + layout.viewport.height);
    }
    const [a, b] = frame.pins;
    const pa = projectMapPosition("equirectangular", frame.camera, [1, 1]), pb = projectMapPosition("equirectangular", frame.camera, [9, 4]);
    const scaleX = (b.x - a.x) / (pb.x - pa.x), scaleY = (b.y - a.y) / (pb.y - pa.y);
    expect(Math.abs(scaleX)).toBeCloseTo(Math.abs(scaleY), 9);
    expect(scaleX).toBeCloseTo(frame.camera.scale, 6);
  });

  it("projects equirectangular and orthographic correctly and hides the far side of an orthographic view", () => {
    expect(projectMapPosition("equirectangular", { lon: 0, lat: 0 }, [10, 0]).x).toBeGreaterThan(0);
    expect(projectMapPosition("equirectangular", { lon: 0, lat: 0 }, [0, 10]).y).toBeGreaterThan(0);
    expect(projectMapPosition("orthographic", { lon: 0, lat: 0 }, [0, 0])).toMatchObject({ x: 0, y: 0, visible: true });
    expect(projectMapPosition("orthographic", { lon: 0, lat: 0 }, [180, 0]).visible).toBe(false);
  });

  it("refuses a missing licence, an unknown projection, duplicate feature ids and unknown fill keys", () => {
    const unlicensed = base();
    unlicensed.collections[0].attribution.licence = "";
    expect(codes(layoutMapStage(unlicensed, BOX, options).diagnostics)).toContain("map-attribution-missing");

    const unknown = { ...base(), projection: "mercator" } as unknown as MapStageSpec;
    expect(codes(layoutMapStage(unknown, BOX, options).diagnostics)).toContain("map-projection-unknown");

    const duplicate = base();
    feats(duplicate).push({ type: "Feature", id: "port-a", geometry: { type: "Point", coordinates: [2, 2] }, properties: { name: "Copy" } });
    expect(codes(checkMapSpec(duplicate))).toContain("map-feature-duplicate");

    const badKey = base();
    badKey.legend = [];
    expect(codes(checkMapSpec(badKey))).toContain("map-fill-key-unknown");
  });

  it("refuses out-of-range coordinates, unknown route endpoints, mismatched route ends and open rings", () => {
    const outOfRange = base();
    feats(outOfRange)[1] = { type: "Feature", id: "port-a", geometry: { type: "Point", coordinates: [1, 95] }, properties: { name: "Port A" } };
    expect(codes(checkMapSpec(outOfRange))).toContain("map-coordinate-range");

    const unknownEnd = base();
    unknownEnd.routes = [{ id: "r1", featureId: "lane", from: "port-a", to: "missing-port" }];
    expect(codes(checkMapSpec(unknownEnd))).toContain("map-route-unknown");

    const mismatch = base();
    feats(mismatch)[3] = { type: "Feature", id: "lane", geometry: { type: "LineString", coordinates: [[1, 1], [9, 5]] } };
    expect(codes(checkMapSpec(mismatch))).toContain("map-route-endpoint-mismatch");

    const open = base();
    feats(open)[0] = { type: "Feature", id: "land", geometry: { type: "Polygon", coordinates: [[[0, 0], [10, 0], [10, 5], [0, 5]]] }, properties: { fillKey: "a" } };
    expect(codes(checkMapSpec(open))).toContain("map-ring-open");
  });

  it("refuses a pin label collision at a settled view", () => {
    const spec = base();
    feats(spec).push({ type: "Feature", id: "port-c", geometry: { type: "Point", coordinates: [1.0001, 1.0001] }, properties: { name: "Port C" } });
    const layout = layoutMapStage(spec, BOX, options);
    expect(layout.diagnostics.filter(d => d.code === "map-label-collision" && d.severity === "error").length).toBeGreaterThan(0);
  });

  it("wraps attribution without truncating it and refuses one that cannot fit", () => {
    const narrow = layoutMapStage(base(), { width: 300, height: 1920 }, options);
    expect(narrow.attribution.lines.length).toBeGreaterThan(1);
    expect(narrow.attribution.lines.join(" ").replace(/\s+/g, " ")).toContain("Fictional geometry, no real boundaries");
    expect(codes(narrow.diagnostics)).toEqual([]);

    const unbreakable = base();
    unbreakable.collections[0].attribution.url = `https://example.org/${"x".repeat(400)}`;
    expect(codes(layoutMapStage(unbreakable, BOX, options).diagnostics)).toContain("map-attribution-unfit");
  });

  it("draws a route by frame: zero before its beat, eased across it, then held at its full length", () => {
    const spec = base(), layout = layoutMapStage(spec, BOX, options);
    const routeAt = (frame: number) => evaluateMapStage(spec, layout, frame).routes[0];
    expect(routeAt(39).progress).toBe(0);
    expect(routeAt(40).progress).toBe(0);
    const samples = Array.from({ length: 60 }, (_, i) => routeAt(40 + i).progress);
    for (let i = 1; i < samples.length; i += 1) expect(samples[i]).toBeGreaterThanOrEqual(samples[i - 1]);
    expect(samples[30]).toBeGreaterThan(0.2);
    expect(samples[30]).toBeLessThan(0.8);
    expect(routeAt(200).progress).toBe(1);
    const full = routeAt(200);
    expect(full.head).toEqual(full.points[full.points.length - 1]);
  });

  it("eases the camera to a focus target over moveFrames, then holds it exactly", () => {
    const spec = base(), layout = layoutMapStage(spec, BOX, options);
    const focusStart = 100;
    expect(evaluateMapStage(spec, layout, focusStart).camera).toEqual(layout.cameras[1]);
    expect(evaluateMapStage(spec, layout, focusStart + 20).camera).toEqual(layout.cameras[2]);
    expect(evaluateMapStage(spec, layout, focusStart + 50).camera).toEqual(layout.cameras[2]);
    const mid = evaluateMapStage(spec, layout, focusStart + 10).camera.scale;
    expect(mid).toBeGreaterThan(Math.min(layout.cameras[1].scale, layout.cameras[2].scale));
    expect(mid).toBeLessThan(Math.max(layout.cameras[1].scale, layout.cameras[2].scale));
  });

  it("always draws the legend and attribution and holds seek parity over the whole timeline", () => {
    const spec = base();
    const layout = layoutMapStage(spec, BOX, options);
    expect(layout.legend.items.map(i => i.key)).toEqual(["a"]);
    expect(layout.attribution.lines.length).toBeGreaterThan(0);
    const parity = inspectSeekParity(() => {
      const shared = layoutMapStage(spec, BOX, options);
      return frame => evaluateMapStage(spec, shared, frame);
    }, { durationFrames: mapStageDuration(spec), sampleCount: 160, seed: 7 });
    expect(parity.diagnostics).toEqual([]);
    expect(parity.ok).toBe(true);
  });
});

/* Fixed-advance stand-in for tests only: jsdom has no canvas, so the real measurer returns 0 here. Storybook uses
 * createCanvasMeasurer with the real face. */
const scaleMeasure: MeasureText = (font, text) => {
  const px = Number(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] ?? 16);
  return [...text].length * px * 0.55;
};
const box = { x: 0, y: 0, width: 1080, height: 1920 };
const scaleOptions = { measure: scaleMeasure, maxFontPx: 44, minFontPx: 24, readablePx: 30 };

const ASTRONOMY: ScaleComparisonSpec = {
  id: "radii", title: "Radii on one log scale", fps: { num: 30, den: 1 }, axisUnit: "km", scale: "log", marks: "dot",
  footnote: "Approximate public values; check them against the named sources.",
  items: [
    { id: "earth", label: "Earth, mean radius", value: 6371, unit: "km", kind: "real", source: "NASA Planetary Fact Sheet" },
    { id: "jupiter", label: "Jupiter, mean radius", value: 69911, unit: "km", kind: "real", source: "NASA Planetary Fact Sheet" },
    { id: "sun", label: "Sun, nominal radius", value: 695700, unit: "km", kind: "real", source: "IAU 2015 Resolution B3" },
  ],
  beats: [
    { id: "scale", kind: "establish", durationFrames: 60, caption: "One log axis." },
    { id: "reveal", kind: "reveal", order: "declared", durationFrames: 120 },
    { id: "compare", kind: "compare", a: "sun", b: "earth", sig: 3, durationFrames: 120 },
    { id: "convert", kind: "convert", itemId: "sun", unit: "mi", durationFrames: 120 },
  ],
};

const ARCHITECTURE: ScaleComparisonSpec = {
  id: "heights", fps: { num: 30, den: 1 }, axisUnit: "m", scale: "linear", marks: "bar",
  items: [
    { id: "mill", label: "Mill House (fictional)", value: 18, unit: "m", kind: "illustrative" },
    { id: "harbor", label: "Harbor Tower (fictional)", value: 240, unit: "m", kind: "illustrative" },
  ],
  beats: [
    { id: "reveal", kind: "reveal", order: "size-descending", durationFrames: 90 },
    { id: "compare", kind: "compare", a: "harbor", b: "mill", durationFrames: 90 },
  ],
};

describe("ScaleComparisonStage", () => {
  it("keeps unit factors exact and prints each conversion step", () => {
    expect(exactFactorText(parseExactFactor("0.0254")!)).toBe("0.0254");
    expect(exactFactorText(parseExactFactor("1609.344")!)).toBe("1,609.344");
    expect(exactFactorText(parseExactFactor("9460730472580800")!)).toBe("9,460,730,472,580,800");
    expect(exactFactorText(parseExactFactor("1609344/1000")!)).toBe("1,609.344");
    expect(parseExactFactor("1/3")).toEqual({ n: 1n, d: 3n });
    expect(parseExactFactor("1e3")).toBeUndefined();
    const readout = scaleConvertReadout(ASTRONOMY, "sun", "mi", 4)!;
    expect(readout.fromLine).toBe("1 km = 1,000 m");
    expect(readout.toLine).toBe("1 mi = 1,609.344 m");
    expect(readout.arithmetic).toBe("695,700 km × 1,000 m/km ÷ 1,609.344 m/mi = 432,300 mi");
    expect(readout.rule).toContain("4 significant figures");
  });

  it("states the ratio and its rounding rule, with half-away-from-zero rounding", () => {
    const ratio = scaleRatioReadout(ASTRONOMY, "sun", "earth", 3)!;
    expect(ratio.sentence).toBe("Sun, nominal radius is ≈ 109× Earth, mean radius");
    expect(ratio.rule).toContain("3 significant figures, half away from zero");
    expect(roundSignificant(2.5, 1)).toBe(3);
    expect(roundSignificant(-2.5, 1)).toBe(-3);
    expect(formatScaleNumber(695700)).toBe("695,700");
    expect(roundSignificant(0.0092361, 2)).toBe(0.0092);
  });

  it("refuses mixed dimensions, unknown units, unit mismatches and bars on a log scale", () => {
    const mixed: ScaleComparisonSpec = { ...ARCHITECTURE, items: [...ARCHITECTURE.items,
      { id: "orbit", label: "Orbit", value: 365.25, unit: "d", kind: "illustrative" }],
      beats: [{ id: "reveal", kind: "reveal", durationFrames: 90 }, { id: "compare", kind: "compare", a: "harbor", b: "orbit", durationFrames: 90 }] };
    expect(validateScaleComparison(mixed).map(d => d.code)).toEqual(expect.arrayContaining(["scale-mixed-dimension"]));
    const unknown: ScaleComparisonSpec = { ...ARCHITECTURE, items: [{ ...ARCHITECTURE.items[0], unit: "furlong" }, ARCHITECTURE.items[1]] };
    expect(validateScaleComparison(unknown).map(d => d.code)).toContain("scale-unit-unknown");
    const badConvert: ScaleComparisonSpec = { ...ARCHITECTURE, beats: [...ARCHITECTURE.beats, { id: "t", kind: "convert", itemId: "harbor", unit: "s", durationFrames: 90 }] };
    expect(validateScaleComparison(badConvert).map(d => d.code)).toContain("scale-unit-dimension");
    const logBars: ScaleComparisonSpec = { ...ASTRONOMY, marks: "bar" };
    expect(validateScaleComparison(logBars).map(d => d.code)).toContain("scale-log-bars");
    expect(validateScaleComparison(ASTRONOMY).filter(d => d.severity === "error")).toEqual([]);
  });

  it("requires a named source for every real value, and labels illustrative values on screen", () => {
    const unsourced: ScaleComparisonSpec = { ...ASTRONOMY, items: [{ ...ASTRONOMY.items[0], source: "  " }, ASTRONOMY.items[1], ASTRONOMY.items[2]] };
    expect(validateScaleComparison(unsourced).map(d => d.code)).toContain("scale-real-unsourced");
    // One badge for a stage whose items are all illustrative; per-item notes only when kinds are mixed.
    const layout = layoutScaleComparison(ARCHITECTURE, box, scaleOptions);
    expect(layout.badge?.text).toBe("Illustrative values");
    expect(layout.texts.filter(t => t.role === "meta")).toEqual([]);
    const mixed: ScaleComparisonSpec = { ...ARCHITECTURE, items: [ARCHITECTURE.items[0], { ...ARCHITECTURE.items[1], kind: "real", source: "A named survey" }] };
    const mixedLayout = layoutScaleComparison(mixed, box, scaleOptions);
    expect(mixedLayout.badge).toBeUndefined();
    expect(mixedLayout.texts.filter(t => t.role === "meta").map(t => t.text)).toEqual(["Illustrative", "Source: A named survey"]);
  });

  it("wraps long labels without truncating them and never lets labels overlap", () => {
    const long = "Harbor Tower, a fictional landmark of the eastern quay district, rebuilt twice";
    const spec: ScaleComparisonSpec = { ...ARCHITECTURE, items: [{ ...ARCHITECTURE.items[0], label: long }, ARCHITECTURE.items[1]] };
    const layout = layoutScaleComparison(spec, box, scaleOptions);
    const label = layout.texts.find(t => t.id === "label:mill")!;
    expect(label.lines.length).toBeGreaterThan(1);
    expect(label.lines.join(" ")).toBe(long);
    expect(layout.diagnostics.filter(d => d.severity === "error")).toEqual([]);
    expect(layout.pxPerBaseUnit).toBeGreaterThan(0);
  });

  it("reports a label collision that persists at the smallest font, and fits the labels that do not collide", () => {
    const crowded: ScaleComparisonSpec = { ...ASTRONOMY, items: [
      { id: "a", label: "Alpha reference radius", value: 1_000_000, unit: "km", kind: "illustrative" },
      { id: "b", label: "Beta reference radius", value: 1_010_000, unit: "km", kind: "illustrative" },
      { id: "c", label: "Gamma reference radius", value: 1_020_000, unit: "km", kind: "illustrative" },
    ], beats: [{ id: "reveal", kind: "reveal", durationFrames: 90 }] };
    const layout = layoutScaleComparison(crowded, box, scaleOptions);
    expect(layout.diagnostics.map(d => d.code)).toContain("scale-label-collision");
    expect(layout.font.size).toBe(scaleOptions.minFontPx);
    const spread = layoutScaleComparison(ASTRONOMY, box, scaleOptions);
    expect(spread.diagnostics.filter(d => d.severity === "error")).toEqual([]);
    expect(spread.font.size).toBeLessThanOrEqual(scaleOptions.maxFontPx);
    expect(spread.font.size).toBeGreaterThan(scaleOptions.minFontPx);
    expect(spread.diagnostics.map(d => d.code)).not.toContain("scale-label-collision");
  });

  it("draws circles to one true linear scale, refuses them on a log scale, and never re-cases units", () => {
    const circles: ScaleComparisonSpec = { ...ASTRONOMY, scale: "linear", marks: "circle" };
    expect(validateScaleComparison(circles).filter(d => d.severity === "error")).toEqual([]);
    const layout = layoutScaleComparison(circles, box, scaleOptions);
    const radius = (id: string) => { const m = layout.items.find(i => i.id === id)!.mark; return m.kind === "circle" ? m.r : NaN; };
    expect(radius("sun") / radius("earth")).toBeCloseTo(695700 / 6371, 6);
    expect(radius("sun")).toBeCloseTo(695700 * 1000 * layout.pxPerBaseUnit!, 6); // px per base unit (metres)
    for (const item of layout.items) { const m = item.mark; if (m.kind === "circle") expect(m.cy + m.r).toBeCloseTo(layout.axis.y, 6); }
    expect(layout.ruler?.label.text).toMatch(/km$/);
    expect(validateScaleComparison({ ...circles, scale: "log" }).map(d => d.code)).toContain("scale-log-circles");
    const tonnes: ScaleComparisonSpec = { ...ARCHITECTURE, axisUnit: "Mt", items: [
      { id: "a", label: "A", value: 2.4, unit: "Mt", kind: "illustrative" }, { id: "b", label: "B", value: 610, unit: "kt", kind: "illustrative" }],
      beats: [{ id: "reveal", kind: "reveal", durationFrames: 90 }, { id: "convert", kind: "convert", itemId: "a", unit: "t", durationFrames: 90 }] };
    const tLayout = layoutScaleComparison(tonnes, box, scaleOptions);
    expect(tLayout.texts.find(t => t.role === "eyebrow")?.text).toContain("in Mt");
    // Numbers stay on one line with their unit, in labels and in the large readout.
    expect(tLayout.texts.find(t => t.id === "value:a")?.lines).toEqual(["2.4\u00a0Mt"]);
    expect(tLayout.panel.byBeat.convert.find(t => t.role === "result")?.lines).toHaveLength(1);
  });

  it("chooses deterministic nice ticks and reports the axis in its own unit", () => {
    const linear = layoutScaleComparison(ARCHITECTURE, box, scaleOptions);
    expect(linear.scale.ticks.map(t => t.label.text)).toEqual(["0 m", "100 m", "200 m", "300 m"]);
    const logLayout = layoutScaleComparison(ASTRONOMY, box, scaleOptions);
    expect(logLayout.scale.ticks.map(t => t.label.text)).toEqual(["1,000 km", "10,000 km", "100,000 km", "1,000,000 km"]);
    expect(layoutScaleComparison(ARCHITECTURE, box, scaleOptions).scale.ticks.map(t => t.label.text)).toEqual(linear.scale.ticks.map(t => t.label.text));
  });

  it("reveals in size order, shows the compare beat only after its items, and holds seek parity", () => {
    const at = (frame: number) => evaluateScaleComparison(ARCHITECTURE, frame);
    expect(at(0).reveal).toEqual({ mill: 0, harbor: 0 });
    expect(at(30).reveal.harbor).toBeGreaterThan(0);
    expect(at(30).reveal.harbor).toBeGreaterThan(at(30).reveal.mill);
    expect(at(90).reveal).toEqual({ mill: 1, harbor: 1 });
    expect(at(150).emphasis?.itemIds).toEqual(["harbor", "mill"]);
    expect(at(150).emphasis?.amount).toBe(1);
    const broken: ScaleComparisonSpec = { ...ARCHITECTURE, beats: [{ id: "c", kind: "compare", a: "harbor", b: "mill", durationFrames: 60 }] };
    expect(validateScaleComparison(broken).map(d => d.code)).toContain("scale-beat-item-unrevealed");
    const parity = inspectSeekParity(() => (frame: number) => evaluateScaleComparison(ASTRONOMY, frame), {
      durationFrames: scaleComparisonDuration(ASTRONOMY), sampleCount: 90, seed: 7,
    });
    expect(parity.diagnostics).toEqual([]);
    expect(parity.ok).toBe(true);
  });
});

/* Deterministic stand-in measurer for jsdom: width proportional to glyph count and the declared px size.
 * Production uses createCanvasMeasurer in the browser; these tests check logic, not glyph metrics. */
const graphMeasure: MeasureText = (font, text) => text.length * 0.56 * Number(/(\d+(?:\.\d+)?)px/.exec(font)![1]);
const graphOptions: GraphStageOptions = { width: 1080, height: 1920, measure: graphMeasure };
const fps = { num: 30, den: 1 };
const node = (id: string, type = "step", cluster?: string) => ({ id, label: id.toUpperCase(), type, ...(cluster ? { cluster } : {}) });
const edge = (from: string, to: string, extra: Record<string, unknown> = {}) => ({ id: `${from}-${to}`, from, to, type: "link", ...extra });

describe("graph topology stage", () => {
  it("validates identity, endpoints, weights and clusters with stable codes", () => {
    const codes = (t: GraphTopology) => validateGraphTopology(t).map(d => [d.code, d.severity]);
    expect(codes({ id: "dup", nodes: [node("A"), node("A")], edges: [] })).toContainEqual(["graph-node-duplicate", "error"]);
    expect(codes({ id: "dangling", nodes: [node("A"), node("B")], edges: [edge("A", "Z")] })).toContainEqual(["graph-edge-unknown-endpoint", "error"]);
    expect(codes({ id: "neg", nodes: [node("A"), node("B")], edges: [edge("A", "B", { weight: -1 })] })).toContainEqual(["graph-weight-invalid", "error"]);
    expect(codes({ id: "nan", nodes: [node("A"), node("B")], edges: [edge("A", "B", { weight: Number.NaN })] })).toContainEqual(["graph-weight-invalid", "error"]);
    expect(codes({ id: "loop", nodes: [node("A")], edges: [edge("A", "A")] })).toEqual([["graph-self-loop", "warning"]]);
    expect(codes({ id: "clustered", nodes: [node("A", "m", "g1"), node("B")], edges: [], clusters: [{ id: "g1", label: "Group 1" }] }))
      .toEqual([["graph-cluster-missing", "error"]]);
    expect(codes({ id: "clustered", nodes: [node("A", "m", "gX")], edges: [], clusters: [{ id: "g1", label: "Group 1" }] }))
      .toEqual([["graph-cluster-unknown", "error"]]);
  });

  it("layers acyclic graphs by longest path and names the cycle a layered layout cannot place", () => {
    const dag: GraphTopology = { id: "dag", nodes: [node("A"), node("B"), node("C"), node("D")],
      edges: [edge("A", "B"), edge("B", "C"), edge("C", "D"), edge("A", "D")] };
    const layered = layeredLayout(dag, { x: 0, y: 0, width: 800, height: 900 });
    expect(layered.diagnostics).toEqual([]);
    expect(Object.fromEntries(layered.layers!)).toEqual({ A: 0, B: 1, C: 2, D: 3 });
    expect(layered.positions.get("A")!.y).toBeLessThan(layered.positions.get("D")!.y);

    const loop: GraphTopology = { id: "loop", nodes: [node("A"), node("B"), node("C")], edges: [edge("A", "B"), edge("B", "C"), edge("C", "A")] };
    const refused = layeredLayout(loop, { x: 0, y: 0, width: 800, height: 900 });
    expect(refused.positions.size).toBe(0);
    expect(refused.diagnostics).toEqual([expect.objectContaining({ code: "graph-cycle-layered", severity: "error",
      message: expect.stringContaining("B → C → A → B") })]);
  });

  it("returns the same positions on every run for the force layout, inside the box", () => {
    const ring: GraphTopology = { id: "ring", nodes: ["A", "B", "C", "D", "E", "F"].map(id => node(id)),
      edges: ["A", "B", "C", "D", "E", "F"].map((id, i, all) => edge(id, all[(i + 1) % all.length])) };
    const box = { x: 100, y: 200, width: 700, height: 900 };
    const first = forceLayout(ring, box), second = forceLayout(ring, box);
    expect([...first.entries()]).toEqual([...second.entries()]);
    for (const p of first.values()) {
      expect(p.x).toBeGreaterThanOrEqual(box.x - 1e-6); expect(p.x).toBeLessThanOrEqual(box.x + box.width + 1e-6);
      expect(p.y).toBeGreaterThanOrEqual(box.y - 1e-6); expect(p.y).toBeLessThanOrEqual(box.y + box.height + 1e-6);
    }
  });

  it("keeps identity across transitions and refuses undeclared node-set changes and identity loss", () => {
    const small: GraphTopology = { id: "small", nodes: [node("A"), node("B"), node("C")], edges: [edge("A", "B"), edge("B", "C")] };
    const grown: GraphTopology = { id: "grown", nodes: [...small.nodes, node("D")], edges: [...small.edges, edge("C", "D")] };
    const spec = (beatTwo: Partial<GraphStageSpec["beats"][number]>, topologies: GraphTopology[] = [small, grown]): GraphStageSpec => ({
      id: "t", fps, topologies,
      beats: [{ id: "one", topologyId: "small", layout: "layered", durationFrames: 40 },
        { id: "two", topologyId: "grown", layout: "layered", durationFrames: 60, ...beatTwo }],
    });
    const codes = (s: GraphStageSpec) => validateGraphStage(s).filter(d => d.severity === "error").map(d => d.code);
    expect(codes(spec({ appear: ["D"] }))).toEqual([]);
    expect(codes(spec({}))).toEqual(["graph-node-set-undeclared"]);
    expect(codes(spec({ appear: ["A", "D"] }))).toEqual(["graph-identity-lost"]);
    const renamed = { ...grown, nodes: [{ ...grown.nodes[0], label: "Alpha" }, ...grown.nodes.slice(1)] };
    expect(codes(spec({ appear: ["D"] }, [small, renamed]))).toEqual(["graph-identity-lost"]);

    const ok = prepareGraphStage(spec({ appear: ["D"] }), graphOptions);
    expect(ok.status).toBe("ready");
    const beforeA = ok.plans[0]!.nodes.get("A")!.pos, afterA = ok.plans[1]!.nodes.get("A")!.pos;
    const start = evaluateGraphStage(ok, 40), settled = evaluateGraphStage(ok, 40 + 24);
    expect(start.nodes.find(n => n.id === "A")).toMatchObject({ x: beforeA.x, y: beforeA.y });
    expect(settled.nodes.find(n => n.id === "A")).toMatchObject({ x: afterA.x, y: afterA.y });
    expect(start.nodes.find(n => n.id === "D")!.opacity).toBe(0);
    expect(settled.nodes.find(n => n.id === "D")!.opacity).toBe(1);
  });

  it("traverses breadth-first and depth-first in visit order and reveals nodes with visit numbers", () => {
    const tree: GraphTopology = { id: "tree", nodes: ["R", "A", "B", "C", "D", "E"].map(id => node(id)),
      edges: [edge("R", "A"), edge("R", "B"), edge("A", "C"), edge("B", "D")] };
    const bfs = traverseGraph(tree, { algorithm: "bfs", root: "R" });
    expect(bfs.order.map(s => s.nodeId)).toEqual(["R", "A", "B", "C", "D"]);
    expect(bfs.order.map(s => s.visit)).toEqual([1, 2, 3, 4, 5]);
    expect(bfs.unreached).toEqual(["E"]);
    expect(traverseGraph(tree, { algorithm: "dfs", root: "R" }).order.map(s => s.nodeId)).toEqual(["R", "A", "C", "B", "D"]);

    const spec: GraphStageSpec = { id: "walk", fps, topologies: [tree], beats: [
      { id: "walk", topologyId: "tree", layout: "layered", durationFrames: 120, traversal: { algorithm: "bfs", root: "R" } }] };
    expect(validateGraphStage(spec)).toEqual([expect.objectContaining({ code: "graph-traversal-unreached", severity: "warning" })]);
    const prepared = prepareGraphStage(spec, graphOptions);
    const end = evaluateGraphStage(prepared, 119);
    expect(end.visited).toBe(5);
    expect(Object.fromEntries(end.nodes.filter(n => n.visit !== undefined).map(n => [n.id, n.visit]))).toEqual({ R: 1, A: 2, B: 3, C: 4, D: 5 });
    expect(end.nodes.find(n => n.id === "E")!.opacity).toBeLessThan(0.5);
  });

  it("scales stroke width with weight across the spec and shows exact weight labels only when asked", () => {
    const routes: GraphTopology = { id: "routes", nodes: [node("D", "depot", "c1"), node("S", "stop", "c1"), node("T", "stop", "c2")],
      clusters: [{ id: "c1", label: "Cluster 1" }, { id: "c2", label: "Cluster 2" }],
      edges: [edge("D", "S", { weight: 2, directed: false }), edge("S", "T", { weight: 4, directed: false })] };
    const spec = (weightLabels: boolean): GraphStageSpec => ({ id: "w", fps, topologies: [routes], weightUnit: "km", beats: [
      { id: "routes", topologyId: "routes", layout: "force", durationFrames: 60, groups: true, weightLabels }] });
    const quiet = evaluateGraphStage(prepareGraphStage(spec(false), graphOptions), 59);
    const labelled = evaluateGraphStage(prepareGraphStage(spec(true), graphOptions), 59);
    const byId = (frame: typeof quiet) => Object.fromEntries(frame.edges.map(e => [e.id, e]));
    expect(byId(quiet)["D-S"].strokePx * 2).toBeCloseTo(byId(quiet)["S-T"].strokePx, 9);
    expect(byId(quiet)["D-S"].weightText).toBeUndefined();
    expect(byId(labelled)["S-T"].weightText).toBe("4 km");
    expect(labelled.legend.weight).toMatchObject({ maxWeight: 4, unit: "km" });
    expect(quiet.clusters.map(c => c.id)).toEqual(["c1", "c2"]);
    expect(quiet.clusters[0].points.length).toBeGreaterThanOrEqual(3);
    const missing = { ...spec(false), topologies: [{ ...routes, nodes: [node("D", "depot", "c1"), node("S", "stop")] }] };
    expect(validateGraphStage(missing).map(d => d.code)).toContain("graph-cluster-missing");
  });

  it("refuses broken specs: no nodes are drawn and every refusal carries a stable code", () => {
    const loop: GraphTopology = { id: "loop", nodes: [node("A"), node("B"), node("C")], edges: [edge("A", "B"), edge("B", "C"), edge("C", "A")] };
    const spec: GraphStageSpec = { id: "bad", fps, topologies: [loop], beats: [
      { id: "layered", topologyId: "loop", layout: "layered", durationFrames: 60 }] };
    const prepared = prepareGraphStage(spec, graphOptions);
    expect(prepared.status).toBe("error");
    const frame = evaluateGraphStage(prepared, 30);
    expect(frame.status).toBe("error");
    expect(frame.nodes).toEqual([]);
    expect(frame.edges).toEqual([]);
    expect(prepared.diagnostics.map(d => d.code)).toContain("graph-cycle-layered");
    const unknown = prepareGraphStage({ ...spec, topologies: [{ ...loop, edges: [edge("A", "Z")] }], beats: [{ ...spec.beats[0], layout: "force" }] }, graphOptions);
    expect(unknown.diagnostics.map(d => d.code)).toContain("graph-edge-unknown-endpoint");
  });

  it("evaluates a multi-beat walkthrough identically under seeked and forward playback", () => {
    const small: GraphTopology = { id: "small", nodes: [node("A", "in"), node("B", "hid"), node("C", "out")], edges: [edge("A", "B"), edge("B", "C")] };
    const grown: GraphTopology = { id: "grown", nodes: [...small.nodes, node("D", "hid")],
      edges: [...small.edges, edge("A", "D", { weight: 3 }), edge("D", "C", { weight: 1.5 })] };
    const spec: GraphStageSpec = { id: "walk", fps, topologies: [small, grown], weightUnit: "u", beats: [
      { id: "small", topologyId: "small", layout: "layered", durationFrames: 45, caption: "A small layered net" },
      { id: "grow", topologyId: "grown", layout: "layered", durationFrames: 75, appear: ["D"], weightLabels: true, caption: "A new node fades in" },
      { id: "walk", topologyId: "grown", layout: "force", durationFrames: 90, traversal: { algorithm: "dfs", root: "A" }, caption: "Visit order" },
    ] };
    const prepared = prepareGraphStage(spec, graphOptions);
    expect(prepared.status).toBe("ready");
    const total = prepared.durationFrames;
    const parity = inspectSeekParity(() => { const p = prepareGraphStage(spec, graphOptions); return f => evaluateGraphStage(p, f); },
      { durationFrames: total, sampleCount: 60, seed: 5 });
    expect(parity.diagnostics).toEqual([]);
    expect(parity.ok).toBe(true);
  });
});
