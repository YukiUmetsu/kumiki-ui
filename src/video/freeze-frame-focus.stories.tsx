import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { FreezeFrameFocus } from "../../registry/video/freeze-frame-focus-react";
import { evaluateFreezeFocus, frozenSourceFrame, validateFreezeFocus } from "../../registry/video/freeze-frame-focus";
import type { FootageAnnotation, FreezeFrameFocusSpec } from "../../registry/video/freeze-frame-focus";
import { createProceduralAdapter, createVideoElementAdapter } from "../../registry/video/frame-clip-adapters";
import type { ClipFrameAdapter } from "../../registry/video/frame-clip-adapters";
import type { ClipRenderState } from "../../registry/video/frame-accurate-clip";
import type { ClipFraming, ClipSource } from "../../registry/video/frame-clip";
import type { Rect } from "../../registry/motion/types";
import { CONVEYOR_DESIGN, CONVEYOR_SCAN_RECT, conveyorLabelRect, createConveyorDrawer } from "./conveyor-scene";

const FPS = { num: 30, den: 1 };

/* ---------- Scene 1: a procedural conveyor. The generator knows every parcel's exact position,
 * so the annotations below are keyed on every frame from real geometry, not estimated. ---------- */
// Shared with the hybrid short and the footage generator (src/video/conveyor-scene.ts).
// Authored in 960×540 design units and rendered at 2× (1920×1080) so push-ins stay sharp.
const RES = 2;
const CONVEYOR: ClipSource = { id: "conveyor", width: CONVEYOR_DESIGN.width * RES, height: CONVEYOR_DESIGN.height * RES, frameCount: CONVEYOR_DESIGN.frames, fps: FPS, alpha: "none", licenseRef: "In-house procedural animation" };
const drawer = createConveyorDrawer();
const drawConveyor = (ctx: CanvasRenderingContext2D, source: ClipSource, f: number) => drawer(ctx, source.width, source.height, f);
const scaled = (r: Rect): Rect => ({ x: r.x * RES, y: r.y * RES, width: r.width * RES, height: r.height * RES });
const keysEvery = (rect: (f: number) => Rect, last = CONVEYOR.frameCount - 1) => Array.from({ length: last + 1 }, (_, f) => ({ sourceFrame: f, rect: scaled(rect(f)) }));
const conveyorSpec = (breakTracking: boolean): FreezeFrameFocusSpec => ({
  id: "conveyor-focus", clip: { id: "conveyor", source: CONVEYOR, startFrame: 0, durationFrames: 240 },
  freeze: { atFrame: 90, durationFrames: 75 },
  annotations: [
    { id: "label", label: "Shipping label", keys: keysEvery(conveyorLabelRect, breakTracking ? 80 : undefined) },
    { id: "scanner", label: "Scan line", keys: keysEvery(() => CONVEYOR_SCAN_RECT) },
  ] satisfies FootageAnnotation[],
  focus: { annotationId: "label", padding: 1.3, pushInFrames: 16, releaseFrames: 14 },
  callouts: [
    { id: "label-text", annotationId: "label", title: "Route 7, stop 3", detail: "Printed on the label", priority: 2 },
    { id: "scan", annotationId: "scanner", title: "Scanner reads it here", delayFrames: 10, priority: 1 },
  ],
});

/* ---------- Scene 2: the generated WebM through the browser-video adapter. The barcode strip's
 * geometry is known because we generated it (10 blocks of 48 px, most significant bit first). ---------- */
const VIDEO: ClipSource = { id: "synthetic-counter", width: 480, height: 270, frameCount: 120, fps: FPS, alpha: "none", licenseRef: "In-house synthetic test footage" };
const VIDEO_URL = new URL("./assets/synthetic-frame-counter.webm", import.meta.url).href;
const videoSpec = (breakTracking: boolean): FreezeFrameFocusSpec => ({
  id: "barcode-focus", clip: { id: "counter", source: VIDEO, startFrame: 0, durationFrames: 160 },
  freeze: { atFrame: 50, durationFrames: 70, sourceFrame: 60 },
  annotations: [
    { id: "strip", label: "Frame barcode", keys: [{ sourceFrame: 0, rect: { x: 0, y: 0, width: 480, height: 24 } }, { sourceFrame: breakTracking ? 40 : 119, rect: { x: 0, y: 0, width: 480, height: 24 } }] },
    { id: "msb", label: "Most significant bit", keys: [{ sourceFrame: 0, rect: { x: 0, y: 0, width: 48, height: 24 } }, { sourceFrame: 119, rect: { x: 0, y: 0, width: 48, height: 24 } }] },
  ],
  focus: { annotationId: "strip", padding: 0.15, pushInFrames: 16, releaseFrames: 14, dim: 0.7 },
  callouts: [{ id: "bits", annotationId: "strip", title: "Frame 60 = 0000111100", detail: "10 bits, most significant first" }],
});

const OUTPUTS: { id: string; label: string; width: number; height: number; framing: ClipFraming; max: number }[] = [
  { id: "landscape", label: "16:9", width: 960, height: 540, framing: { fit: "cover" }, max: 560 },
  { id: "portrait", label: "9:16 (independent reframe, focus right of centre)", width: 540, height: 960, framing: { fit: "cover", focus: { x: 0.66, y: 0.5 } }, max: 250 },
];
const note: CSSProperties = { margin: 0, font: "400 13px/1.5 var(--km-font-body, system-ui, sans-serif)", color: "var(--km-text-muted, #5b6472)" };

interface Args { scene: "conveyor" | "video"; breakTracking: boolean; startFrame: number }
function FocusDemo({ scene, breakTracking, startFrame }: Args) {
  const spec = useMemo(() => scene === "conveyor" ? conveyorSpec(breakTracking) : videoSpec(breakTracking), [scene, breakTracking]);
  const adapter: ClipFrameAdapter = useMemo(() => scene === "conveyor" ? createProceduralAdapter({ draw: drawConveyor, alpha: false }) : createVideoElementAdapter({ url: () => VIDEO_URL }), [scene]);
  useEffect(() => () => adapter.dispose?.(), [adapter]);
  const total = spec.clip.durationFrames;
  const [frame, setFrame] = useState(Math.min(startFrame, total - 1));
  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState<Record<string, ClipRenderState>>({});
  useEffect(() => {
    if (!playing) return;
    let raf = 0, origin: number | undefined; const from = frame >= total - 1 ? 0 : frame;
    const tick = (t: number) => { origin ??= t; const next = from + Math.floor((t - origin) * 30 / 1000);
      if (next >= total) { setFrame(total - 1); setPlaying(false); return; } setFrame(next); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]); // eslint-disable-line react-hooks/exhaustive-deps -- restart only on play/pause
  const diagnostics = useMemo(() => validateFreezeFocus(spec, FPS, OUTPUTS), [spec]);
  const blocked = diagnostics.some(d => d.severity === "error");
  const phase = evaluateFreezeFocus(spec, frame, FPS, OUTPUTS[0], OUTPUTS[0].framing).phase;
  return <section style={{ padding: 20, display: "grid", gap: 16, background: "var(--km-surface-canvas, #f6f7f9)", color: "var(--km-text-primary, #1f2937)", font: "400 14px/1.5 var(--km-font-body, system-ui, sans-serif)" }}>
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <button type="button" onClick={() => setPlaying(p => !p)} disabled={blocked} style={{ padding: "8px 16px", borderRadius: 8, font: "600 14px/1 var(--km-font-body, system-ui)" }}>{playing ? "Pause" : "Play"}</button>
      <input aria-label="Seek" type="range" min={0} max={total - 1} value={frame} onChange={e => { setPlaying(false); setFrame(Number(e.target.value)); }} style={{ flex: "1 1 260px" }} />
      <span style={{ fontFamily: "var(--km-font-mono, ui-monospace, monospace)" }}>frame {frame} · {phase}</span>
    </div>
    {blocked ? null : <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      {OUTPUTS.map(o => <figure key={o.id} style={{ margin: 0, width: "100%", maxWidth: o.max, display: "grid", gap: 6 }}>
        <FreezeFrameFocus spec={spec} frame={frame} fps={FPS} adapter={adapter} width={o.width} height={o.height} framing={o.framing}
          description={scene === "conveyor" ? "Parcels on a conveyor passing a scanner" : "Synthetic test footage with a frame barcode"}
          style={{ borderRadius: 10, overflow: "hidden", background: "#0b111c" }}
          onStatus={s => setStatus(prev => ({ ...prev, [o.id]: s }))} />
        <figcaption style={note}>{o.label} · {status[o.id]?.status ?? "pending"} · source frame {status[o.id]?.drawnFrame ?? "—"} (expected {status[o.id]?.resolved.sourceFrame ?? "—"})</figcaption>
      </figure>)}
    </div>}
    <p style={note}>Frozen source frame: {blocked ? "—" : frozenSourceFrame(spec, FPS)}. {scene === "conveyor" ? "Procedural animation; annotations come from the generator's geometry on every frame." : "Real decoded WebM via the browser-video adapter, verified per frame."}</p>
    {diagnostics.length ? <ul style={{ margin: 0, paddingLeft: 20 }}>{diagnostics.map((d, i) =>
      <li key={i}><strong style={{ color: d.severity === "error" ? "var(--km-text-danger, #b91c1c)" : "var(--km-status-warning, #b45309)" }}>{d.code}</strong> — {d.message}</li>)}</ul>
      : <p style={{ ...note, color: "var(--km-status-success, #15803d)", fontWeight: 600 }}>Freeze, tracking and framing checks pass.</p>}
  </section>;
}

const meta = {
  title: "Video production/Freeze Frame Focus", id: "video-freeze-frame-focus", component: FocusDemo, parameters: { layout: "fullscreen" },
  argTypes: { scene: { control: "inline-radio", options: ["conveyor", "video"] }, startFrame: { control: { type: "number", min: 0 } } },
  args: { scene: "conveyor", breakTracking: false, startFrame: 130 },
} satisfies Meta<typeof FocusDemo>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Focus: Story = {};
