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
