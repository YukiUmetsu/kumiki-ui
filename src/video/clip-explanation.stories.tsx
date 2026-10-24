import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { compileCutPlan, evaluateCutPlan } from "../../registry/motion/cut-director";
import type { CutLayer } from "../../registry/motion/cut-director";
import { VideoExportStage } from "../../registry/video/video-export-stage";
import type { VideoExportManifest } from "../../registry/video/video-export-stage";
import { FreezeFrameFocus } from "../../registry/video/freeze-frame-focus-react";
import { validateFreezeFocus } from "../../registry/video/freeze-frame-focus";
import type { FreezeFrameFocusSpec } from "../../registry/video/freeze-frame-focus";
import { createVideoElementAdapter } from "../../registry/video/frame-clip-adapters";
import type { ClipSource } from "../../registry/video/frame-clip";
import type { Rect } from "../../registry/motion/types";
import { renderCostWaterfall } from "../../registry/infographic/cost-waterfall";
import { EconomicChartView } from "../../registry/infographic/economic-react";
import { CONVEYOR_DESIGN, CONVEYOR_SCAN_RECT, conveyorLabelRect } from "./conveyor-scene";
import {
  EXPLANATION_CHART, EXPLANATION_FPS, EXPLANATION_FRAMES, EXPLANATION_IDS, EXPLANATION_SIZE, EXPLANATION_TIMING,
} from "./clip-explanation-data";

/* K2 clip-to-explanation reference (9:16, 12 s): a real decoded clip is frozen on the parcel label, the label is
 * focused with source-addressed callouts, and the same parcel (stable id) hands off to a sourced cost chart whose
 * values are marked illustrative. Data lives in clip-explanation-data.ts. Export:
 *   npm run video:export -- --url="http://127.0.0.1:6006/iframe.html?id=video-clip-explanation-k2--default&viewMode=story&kmExport=1" --output=dist/clip-explanation.mp4
 */
const { width: W, height: H } = EXPLANATION_SIZE;
const { scanFrames, payoffFrames, freezeAt, freezeFrames, calloutsAt, dissolveFrames } = EXPLANATION_TIMING;

const PLAN = (() => {
  const result = compileCutPlan({
    id: EXPLANATION_IDS.chart, fps: EXPLANATION_FPS, output: EXPLANATION_SIZE,
    scenes: [{ id: "canvas", subjects: { frame: { x: 0, y: 0, width: W, height: H } } }],
    shots: [EXPLANATION_IDS.scanShot, EXPLANATION_IDS.payoffShot].map((id, i) => ({
      id, sceneId: "canvas", durationFrames: i === 0 ? scanFrames : payoffFrames, subjectIds: ["frame"],
      camera: { start: { center: { x: W / 2, y: H / 2 }, zoom: 1 } },
    })),
    transitions: [{ kind: "dissolve", durationFrames: dissolveFrames }],
  });
  if (!result.ok) throw new Error(result.diagnostics.map(d => d.message).join(" "));
  return result.plan;
})();

/* Shot 1: the prepared clip (in-house, generated; same file as the hybrid short). Exact source geometry is known. */
const CLIP_URL = new URL("./assets/conveyor-1080p.webm", import.meta.url).href;
const RES = 2;
const CLIP: ClipSource = { id: EXPLANATION_IDS.clip, width: CONVEYOR_DESIGN.width * RES, height: CONVEYOR_DESIGN.height * RES,
  frameCount: CONVEYOR_DESIGN.frames, fps: EXPLANATION_FPS, alpha: "none", licenseRef: "In-house footage: scripts/generate-conveyor-footage.mjs" };
const scaled = (r: Rect): Rect => ({ x: r.x * RES, y: r.y * RES, width: r.width * RES, height: r.height * RES });
const every = (rect: (f: number) => Rect) => Array.from({ length: CONVEYOR_DESIGN.frames }, (_, f) => ({ sourceFrame: f, rect: scaled(rect(f)) }));
const FOCUS: FreezeFrameFocusSpec = {
  id: "k2-scan-focus",
  clip: { id: "k2-scan-clip", source: CLIP, startFrame: 0, durationFrames: scanFrames, timing: { trimIn: 45 } },
  freeze: { atFrame: freezeAt, durationFrames: freezeFrames },
  annotations: [
    { id: EXPLANATION_IDS.subject, label: "Parcel 7-3 label", keys: every(conveyorLabelRect) },
    { id: EXPLANATION_IDS.scanner, label: "Scan line", keys: every(() => CONVEYOR_SCAN_RECT) },
  ],
  focus: { annotationId: EXPLANATION_IDS.subject, padding: 1.3, pushInFrames: 14, releaseFrames: 12, dim: 0.6 },
  callouts: [
    { id: "route", annotationId: EXPLANATION_IDS.subject, title: "Parcel 7-3 · route 7, stop 3", detail: "The label decides the route",
      delayFrames: calloutsAt - freezeAt - 14, priority: 2 },
    { id: "scanner", annotationId: EXPLANATION_IDS.scanner, title: "Scanner reads the label", delayFrames: 14, priority: 1 },
  ],
};
const FOOTAGE_FRAMING = { fit: "cover" as const, focus: { x: 0.667, y: 0.5 } };
const TYPOGRAPHY = { titleFont: "700 46px system-ui, sans-serif", titleSizePx: 46, detailFont: "500 34px system-ui, sans-serif", detailSizePx: 34, maxWidthPx: 520 };

function Film({ frame, exporting }: { frame: number; exporting: boolean }) {
  const adapter = useClipAdapter();
  const state = evaluateCutPlan(PLAN, frame);
  const shot = (layer: CutLayer): ReactNode => {
    if (layer.shotId === EXPLANATION_IDS.scanShot) {
      return <FreezeFrameFocus spec={FOCUS} frame={layer.localFrame} fps={EXPLANATION_FPS} adapter={adapter} width={W} height={H}
        framing={FOOTAGE_FRAMING} requireExact={exporting} typography={TYPOGRAPHY} style={{ position: "absolute", inset: 0 }}
        description="Parcel 7-3 on a conveyor; its shipping label passes the scanner" />;
    }
    // Payoff: the chart reveals at an absolute frame inside its own shot; the chart is pure geometry, so seeks are exact.
    const chart = renderCostWaterfall(EXPLANATION_CHART, { width: W, height: H, frame: layer.localFrame });
    return <div data-k2-chart={EXPLANATION_IDS.chart} style={{ position: "absolute", inset: 0 }}>
      <EconomicChartView chart={chart} />
    </div>;
  };
  return <div style={{ position: "relative", width: W, height: H, background: "#0b111c", overflow: "hidden" }}>
    {state.layers.map((layer, i) => <div key={`${layer.shotId}-${i}`} data-k2-layer={layer.shotId}
      style={{ position: "absolute", inset: 0, opacity: layer.opacity }}>{shot(layer)}</div>)}
  </div>;
}

/** One adapter per mounted story; disposed on unmount so video elements do not leak between stories. */
function useClipAdapter() {
  const adapter = useMemo(() => createVideoElementAdapter({ url: () => CLIP_URL }), []);
  useEffect(() => () => adapter.dispose?.(), [adapter]);
  return adapter;
}

const MANIFEST: VideoExportManifest = { schemaVersion: 1, id: "clip-explanation-k2", durationFrames: EXPLANATION_FRAMES, width: W, height: H, fps: EXPLANATION_FPS };

function ClipExplanation({ startFrame }: { startFrame: number }) {
  const exporting = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("kmExport") === "1";
  const [frame, setFrame] = useState(startFrame);
  const focusProblems = validateFreezeFocus(FOCUS, EXPLANATION_FPS, [{ width: W, height: H, framing: FOOTAGE_FRAMING }]);
  const film = <VideoExportStage manifest={MANIFEST} frame={frame} onSeek={setFrame}>
    <Film frame={frame} exporting={exporting} />
  </VideoExportStage>;
  if (exporting) return film;
  const shot = evaluateCutPlan(PLAN, frame).shotId;
  return <section style={{ padding: 20, display: "grid", gap: 12, font: "400 14px/1.5 system-ui, sans-serif" }}>
    <label>Frame {frame} · {shot}
      <input aria-label="Seek" type="range" min={0} max={EXPLANATION_FRAMES - 1} value={frame} onChange={event => setFrame(Number(event.target.value))} style={{ width: "100%" }} />
    </label>
    <div style={{ width: W * 0.3, height: H * 0.3, overflow: "hidden", borderRadius: 12 }}>
      <div style={{ width: W, height: H, transform: "scale(0.3)", transformOrigin: "0 0" }}>{film}</div>
    </div>
    <ul>{focusProblems.map((d, i) => <li key={i}><strong>{d.code}</strong> — {d.message}</li>)}</ul>
  </section>;
}

const meta = { title: "Video/Clip Explanation (K2)", component: ClipExplanation, parameters: { layout: "fullscreen" },
  argTypes: { startFrame: { control: { type: "number", min: 0, max: EXPLANATION_FRAMES - 1 } } }, args: { startFrame: 0 } } satisfies Meta<typeof ClipExplanation>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
