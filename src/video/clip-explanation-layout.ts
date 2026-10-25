/** K3: three independently authored profiles for the K2 explanation (16:9, 9:16, 1:1). Pure geometry, no React, so the
 * same rules run in Storybook, in the exporter and in node tests. Nothing here is a blind resize: each profile sets
 * its own footage framing, its own typography and its own chart box inside the platform's safe area.
 */
import { compileCutPlan } from "../../registry/motion/cut-director";
import type { Rect } from "../../registry/motion/types";
import { renderCostWaterfall } from "../../registry/infographic/cost-waterfall";
import type { CostWaterfallResult } from "../../registry/infographic/cost-waterfall";
import { resolveClipDraw, resolveClipFrame } from "../../registry/video/frame-clip";
import type { ClipFraming, ClipSource } from "../../registry/video/frame-clip";
import type { FreezeFrameFocusSpec } from "../../registry/video/freeze-frame-focus";
import type { VideoPlatformPresetId } from "../../registry/video/platform-presets";
import { CONVEYOR_DESIGN, CONVEYOR_SCAN_RECT, conveyorLabelRect } from "./conveyor-scene";
import { EXPLANATION_CHART, EXPLANATION_FPS, EXPLANATION_IDS, EXPLANATION_TIMING } from "./clip-explanation-data";

export type ExplanationProfileId = "youtube" | "youtube-shorts" | "social-square";

export interface ExplanationProfile {
  id: ExplanationProfileId;
  /** Platform recipe; the exporter refuses a manifest whose size does not match it. */
  preset: VideoPlatformPresetId;
  label: string;
  width: number;
  height: number;
  /** Fractions of the frame that platforms reserve (the same values as platform-presets.json `safeInset`). */
  safe: { left: number; right: number; top: number; bottom: number };
  /** How the 1920×1080 footage fills this frame. `focus` keeps the parcel label in view when it crops. */
  framing: ClipFraming;
  typography: { titleFont: string; titleSizePx: number; detailFont: string; detailSizePx: number; maxWidthPx: number };
}

export const EXPLANATION_PROFILES: Record<ExplanationProfileId, ExplanationProfile> = {
  youtube: {
    id: "youtube", preset: "youtube", label: "16:9 landscape", width: 1920, height: 1080,
    safe: { left: 0.08, right: 0.12, top: 0.09, bottom: 0.1 },
    framing: { fit: "cover" },
    typography: { titleFont: "700 40px system-ui, sans-serif", titleSizePx: 40, detailFont: "500 30px system-ui, sans-serif", detailSizePx: 30, maxWidthPx: 620 },
  },
  "youtube-shorts": {
    id: "youtube-shorts", preset: "youtube-shorts", label: "9:16 vertical", width: 1080, height: 1920,
    safe: { left: 0.08, right: 0.12, top: 0.09, bottom: 0.19 },
    framing: { fit: "cover", focus: { x: 0.667, y: 0.5 } },
    typography: { titleFont: "700 46px system-ui, sans-serif", titleSizePx: 46, detailFont: "500 34px system-ui, sans-serif", detailSizePx: 34, maxWidthPx: 520 },
  },
  "social-square": {
    id: "social-square", preset: "social-square", label: "1:1 square", width: 1080, height: 1080,
    safe: { left: 0.08, right: 0.12, top: 0.09, bottom: 0.1 },
    framing: { fit: "cover", focus: { x: 0.5, y: 0.5 } },
    typography: { titleFont: "700 40px system-ui, sans-serif", titleSizePx: 40, detailFont: "500 30px system-ui, sans-serif", detailSizePx: 30, maxWidthPx: 560 },
  },
};

/** The conveyor footage at its native size (the in-house WebM is 1920×1080). */
const RES = 2;
export const EXPLANATION_CLIP: ClipSource = { id: EXPLANATION_IDS.clip, width: CONVEYOR_DESIGN.width * RES, height: CONVEYOR_DESIGN.height * RES,
  frameCount: CONVEYOR_DESIGN.frames, fps: EXPLANATION_FPS, alpha: "none", licenseRef: "In-house footage: scripts/generate-conveyor-footage.mjs" };

const scaled = (r: Rect): Rect => ({ x: r.x * RES, y: r.y * RES, width: r.width * RES, height: r.height * RES });
const every = (rect: (f: number) => Rect) => Array.from({ length: CONVEYOR_DESIGN.frames }, (_, f) => ({ sourceFrame: f, rect: scaled(rect(f)) }));

/** Focus spec shared by every profile: only the framing (crop) differs per profile, never the subject track. */
export const EXPLANATION_FOCUS: FreezeFrameFocusSpec = {
  id: "k2-scan-focus",
  clip: { id: "k2-scan-clip", source: EXPLANATION_CLIP, startFrame: 0, durationFrames: EXPLANATION_TIMING.scanFrames, timing: { trimIn: 45 } },
  freeze: { atFrame: EXPLANATION_TIMING.freezeAt, durationFrames: EXPLANATION_TIMING.freezeFrames },
  annotations: [
    { id: EXPLANATION_IDS.subject, label: "Parcel 7-3 label", keys: every(conveyorLabelRect) },
    { id: EXPLANATION_IDS.scanner, label: "Scan line", keys: every(() => CONVEYOR_SCAN_RECT) },
  ],
  focus: { annotationId: EXPLANATION_IDS.subject, padding: 1.3, pushInFrames: 14, releaseFrames: 12, dim: 0.6 },
  callouts: [
    { id: "route", annotationId: EXPLANATION_IDS.subject, title: "Parcel 7-3 · route 7, stop 3", detail: "The label decides the route",
      delayFrames: EXPLANATION_TIMING.calloutsAt - EXPLANATION_TIMING.freezeAt - 14, priority: 2 },
    { id: "scanner", annotationId: EXPLANATION_IDS.scanner, title: "Scanner reads the label", delayFrames: 14, priority: 1 },
  ],
};

/** Source frame that the freeze shows, resolved through the same clip mapping the component uses. */
export function explanationFreezeSourceFrame(): number {
  const resolved = resolveClipFrame({ id: EXPLANATION_CLIP.id, source: EXPLANATION_CLIP, startFrame: 0, durationFrames: EXPLANATION_TIMING.scanFrames,
    timing: { trimIn: 45, freezes: [{ atFrame: EXPLANATION_TIMING.freezeAt, durationFrames: EXPLANATION_TIMING.freezeFrames }] } },
  EXPLANATION_TIMING.freezeAt + 1, EXPLANATION_FPS);
  if (resolved.sourceFrame === undefined) throw new Error("The freeze shows no source frame.");
  return resolved.sourceFrame;
}

/** Protected subjects that leave the visible crop during the freeze. Empty means the crop keeps them all in view. */
export function explanationCropProblems(profile: ExplanationProfile): string[] {
  const sourceFrame = explanationFreezeSourceFrame();
  const draw = resolveClipDraw(EXPLANATION_CLIP, { width: profile.width, height: profile.height }, profile.framing);
  const visible = { x: draw.sx, y: draw.sy, width: draw.sw, height: draw.sh };
  const subjects: [string, Rect][] = [["parcel label", conveyorLabelRect(sourceFrame)], ["scan line", CONVEYOR_SCAN_RECT]];
  return subjects.filter(([, r]) => {
    const s = scaled(r);
    return s.x < visible.x - 1e-6 || s.y < visible.y - 1e-6 || s.x + s.width > visible.x + visible.width + 1e-6 || s.y + s.height > visible.y + visible.height + 1e-6;
  }).map(([name]) => `${name} leaves the ${profile.label} crop at source frame ${sourceFrame}`);
}

/** The chart's box: the platform's safe area, so every chart pixel sits where the platform does not cover it. */
export function explanationChartBox(profile: ExplanationProfile): Rect {
  const { safe, width, height } = profile;
  return { x: Math.round(width * safe.left), y: Math.round(height * safe.top),
    width: Math.round(width * (1 - safe.left - safe.right)), height: Math.round(height * (1 - safe.top - safe.bottom)) };
}

/** The payoff chart authored at its own box size (not a scaled copy of a full-frame chart). */
export function explanationChart(profile: ExplanationProfile, frame: number): CostWaterfallResult {
  const box = explanationChartBox(profile);
  return renderCostWaterfall(EXPLANATION_CHART, { width: box.width, height: box.height, frame });
}

/** Two shots and one dissolve, compiled at the profile's output size. Throws if the timing cannot be compiled. */
export function explanationPlan(profile: ExplanationProfile) {
  const result = compileCutPlan({
    id: EXPLANATION_IDS.chart, fps: EXPLANATION_FPS, output: { width: profile.width, height: profile.height },
    scenes: [{ id: "canvas", subjects: { frame: { x: 0, y: 0, width: profile.width, height: profile.height } } }],
    shots: [EXPLANATION_IDS.scanShot, EXPLANATION_IDS.payoffShot].map((id, i) => ({
      id, sceneId: "canvas", durationFrames: i === 0 ? EXPLANATION_TIMING.scanFrames : EXPLANATION_TIMING.payoffFrames, subjectIds: ["frame"],
      camera: { start: { center: { x: profile.width / 2, y: profile.height / 2 }, zoom: 1 } },
    })),
    transitions: [{ kind: "dissolve", durationFrames: EXPLANATION_TIMING.dissolveFrames }],
  });
  if (!result.ok) throw new Error(result.diagnostics.map(d => d.message).join(" "));
  return result.plan;
}
