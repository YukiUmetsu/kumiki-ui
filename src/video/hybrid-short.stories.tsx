import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
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
import { ALIGNMENT_PARSERS, parseAlignment } from "../../registry/video/alignment-formats";
import { alignmentToCaptionTrack, resolveAudioCues } from "../../registry/video/audio-visual-cue";
import { CaptionPerformer } from "../../registry/visual/caption-performer";
import type { CaptionDiagnostic } from "../../registry/visual/caption-track";
import { ShortSafeFrame } from "../../registry/visual/short-safe-frame";
import type { SafeFrameProfile } from "../../registry/visual/safe-frame";
import { HeroAssetViewer } from "../../registry/craft/hero-viewer";
import { createSmartphone } from "../../registry/domains/technology-3d";
import { BusinessObject2D } from "../../registry/domains/business-object-2d";
import type { Rect } from "../../registry/motion/types";
import { CONVEYOR_DESIGN, CONVEYOR_SCAN_RECT, conveyorLabelRect } from "./conveyor-scene";
import { HYBRID_EVENTS, HYBRID_FPS, HYBRID_FRAMES, HYBRID_NARRATION, HYBRID_SHEET, HYBRID_SHOTS, HYBRID_SIZE } from "./hybrid-short-data";

/* Phase 2 hybrid short (13 s, 9:16): real decoded footage with a freeze-frame focus → a 2D route
 * graphic → a 3D phone, sequenced by one CutDirector plan, captioned from one alignment and
 * checked against narration, music beats and sound effects. Export:
 *   npm run video:export -- --url="http://127.0.0.1:6006/iframe.html?id=video-phase-2-hybrid-short--short&viewMode=story&kmExport=1" --audio=mix.wav
 */
const { width: W, height: H } = HYBRID_SIZE;
const PROFILE: SafeFrameProfile = { id: "portrait", width: W, height: H, padding: 0.06, reserved: [
  { id: "header", edge: "top", rect: { x: 0, y: 0, width: 1, height: 0.07 }, appearance: "header" },
  { id: "progress", edge: "bottom", rect: { x: 0, y: 0.95, width: 1, height: 0.05 }, appearance: "progress" },
  { id: "description", rect: { x: 0, y: 0.74, width: 0.8, height: 0.21 }, appearance: "description" },
  { id: "actions", rect: { x: 0.84, y: 0.4, width: 0.16, height: 0.55 }, appearance: "actions" },
] };

// Shot timing from the shared data; every shot draws in output pixels (identity camera).
const PLAN = (() => {
  const result = compileCutPlan({
    id: "hybrid", fps: HYBRID_FPS, output: HYBRID_SIZE,
    scenes: [{ id: "canvas", subjects: { frame: { x: 0, y: 0, width: W, height: H } } }],
    shots: HYBRID_SHOTS.map(s => ({ id: s.id, sceneId: "canvas", durationFrames: s.frames, subjectIds: ["frame"], camera: { start: { center: { x: W / 2, y: H / 2 }, zoom: 1 } } })),
    transitions: [{ kind: "wipe", durationFrames: 14, axis: "left-to-right" }, { kind: "dissolve", durationFrames: 14 }],
  });
  if (!result.ok) throw new Error(result.diagnostics.map(d => d.message).join(" "));
  return result.plan;
})();

/* ---------- Shot 1: real WebM footage (generated in-house, exact known geometry) ---------- */
const FOOTAGE_URL = new URL("./assets/conveyor-1080p.webm", import.meta.url).href;
const RES = 2;
const FOOTAGE: ClipSource = { id: "conveyor-1080p", width: CONVEYOR_DESIGN.width * RES, height: CONVEYOR_DESIGN.height * RES, frameCount: CONVEYOR_DESIGN.frames,
  fps: HYBRID_FPS, alpha: "none", licenseRef: "In-house footage: scripts/generate-conveyor-footage.mjs" };
const scaled = (r: Rect): Rect => ({ x: r.x * RES, y: r.y * RES, width: r.width * RES, height: r.height * RES });
const every = (rect: (f: number) => Rect) => Array.from({ length: CONVEYOR_DESIGN.frames }, (_, f) => ({ sourceFrame: f, rect: scaled(rect(f)) }));
const FOCUS: FreezeFrameFocusSpec = {
  id: "scan-focus", clip: { id: "scan-clip", source: FOOTAGE, startFrame: 0, durationFrames: HYBRID_SHOTS[0].frames, timing: { trimIn: 45 } },
  freeze: { atFrame: HYBRID_EVENTS.freeze, durationFrames: 60 },
  annotations: [{ id: "label", label: "Shipping label", keys: every(conveyorLabelRect) }, { id: "scanner", label: "Scan line", keys: every(() => CONVEYOR_SCAN_RECT) }],
  focus: { annotationId: "label", padding: 1.3, pushInFrames: 14, releaseFrames: 12, dim: 0.6 },
  callouts: [
    { id: "route", annotationId: "label", title: "Route 7 · stop 3", detail: "Decides which truck it rides", delayFrames: HYBRID_EVENTS.calloutsIn - HYBRID_EVENTS.freeze - 14, priority: 2 },
    { id: "scanner", annotationId: "scanner", title: "Scanner reads it", delayFrames: 14, priority: 1 },
  ],
};
const FOOTAGE_FRAMING = { fit: "cover" as const, focus: { x: 0.667, y: 0.5 } };

/* ---------- Shot 2: 2D route graphic ---------- */
const ROWS = [700, 890, 1080], COLS = [200, 420, 640, 860];
const STOPS = ROWS.flatMap((y, row) => (row % 2 ? [...COLS].reverse() : COLS).map(x => ({ x, y })));
// Depot bay sits right of the warehouse so the parked truck never covers it.
const DEPOT = { x: 520, y: 520 };
function RouteGraphic({ local }: { local: number }) {
  const depart = HYBRID_EVENTS.truckDepart - HYBRID_EVENTS.wipe, arrive = depart + 40;
  const t = Math.min(1, Math.max(0, (local - depart) / (arrive - depart)));
  const path = [DEPOT, ...STOPS.slice(0, 3)];
  const lengths = path.slice(1).map((p, i) => Math.hypot(p.x - path[i].x, p.y - path[i].y));
  let left = t * lengths.reduce((a, b) => a + b, 0), truck = path[0];
  for (let i = 0; i < lengths.length; i += 1) {
    if (left <= lengths[i]) { const a = path[i], b = path[i + 1], k = left / lengths[i]; truck = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }; break; }
    left -= lengths[i]; truck = path[i + 1];
  }
  const arrived = local >= arrive;
  return <svg viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} aria-hidden="true">
    <rect width={W} height={H} fill="#111a29" />
    <text x={W / 2} y={200} textAnchor="middle" fill="#f4f7fb" style={{ font: "700 64px system-ui, sans-serif" }}>Route 7</text>
    <text x={W / 2} y={258} textAnchor="middle" fill="#9fb3cf" style={{ font: "500 36px system-ui, sans-serif" }}>12 stops, grouped by area</text>
    {ROWS.map((y, i) => <rect key={y} x={130} y={y - 70} width={800} height={140} rx={28} fill={["#1b2a40", "#1e2d3a", "#22293c"][i]} opacity={Math.min(1, Math.max(0, (local - 6 - i * 6) / 10))} />)}
    <polyline points={[DEPOT, ...STOPS].map(p => `${p.x},${p.y}`).join(" ")} fill="none" stroke="#8fc8ff" strokeOpacity={0.35} strokeWidth={8} strokeDasharray="4 22" strokeLinecap="round" />
    <polyline points={path.slice(0, 1 + Math.ceil(t * 3)).map(p => `${p.x},${p.y}`).join(" ")} fill="none" stroke="#ffd166" strokeWidth={10} strokeLinecap="round" opacity={t > 0 ? 1 : 0} />
    {STOPS.map((p, i) => { const show = Math.min(1, Math.max(0, (local - 12 - i * 3) / 8));
      return <g key={i} opacity={show}><circle cx={p.x} cy={p.y} r={i === 2 && arrived ? 34 : 26} fill={i === 2 ? "#ffd166" : "#c7d7ef"} />
        <text x={p.x} y={p.y + 2} textAnchor="middle" dominantBaseline="middle" fill="#111a29" style={{ font: "700 26px system-ui, sans-serif" }}>{i + 1}</text></g>; })}
    <BusinessObject2D x={110} y={330} width={280} height={240} spec={{ id: "hy-depot", kind: "warehouse", title: "Depot" }} theme="midnight" />
    <BusinessObject2D x={truck.x - 80} y={truck.y - 112} width={160} height={116} spec={{ id: "hy-truck", kind: "delivery-truck" }} showTitle={false} theme="midnight" />
    {arrived ? <g><rect x={STOPS[2].x - 150} y={STOPS[2].y - 196} width={300} height={70} rx={20} fill="#ffd166" />
      <text x={STOPS[2].x} y={STOPS[2].y - 159} textAnchor="middle" dominantBaseline="middle" fill="#1b1405" style={{ font: "700 34px system-ui, sans-serif" }}>Stop 3 of 12</text></g> : null}
  </svg>;
}

/* ---------- Shot 3: 3D phone with the delivery notification ---------- */
const createPhone = () => createSmartphone({ id: "hy-phone", notification: { title: "Your parcel is on its way", body: "Stop 3 of 12 · arriving 10:40", icon: { glyph: "▣", color: "#c98a3e" } } });
function PhoneShot({ local }: { local: number }) {
  const notify = HYBRID_EVENTS.notify - HYBRID_EVENTS.dissolve;
  return <HeroAssetViewer createAsset={createPhone} width={W} height={H} pixelRatio={1} action="notify" actionFrame={Math.max(0, local - notify)}
    azimuth={22 - local * 0.3} elevation={6} zoom={1.05} ariaLabel="A phone receives the delivery notification" style={{ position: "absolute", inset: 0, background: "#101827" }} />;
}

/** Device bounds in the phone shot (normalized), so captions sit clear of the screen. */
const PHONE_BOUNDS: Rect = { x: 0.27, y: 0.25, width: 0.46, height: 0.5 };

/* ---------- Composition ---------- */
const alignment = parseAlignment({ source: "manual", words: HYBRID_NARRATION.map(([text, start, end]) => ({ text, start, end })) }, ALIGNMENT_PARSERS.neutral,
  { id: "narration", language: "en", reference: "authored timing; the local audio build conforms speech to it" }).alignment;
const CAPTIONS = alignmentToCaptionTrack(alignment, { id: "hybrid-captions", fps: HYBRID_FPS, maxWords: 8, maxChars: 44 });
const VIDEO_ADAPTER = createVideoElementAdapter({ url: () => FOOTAGE_URL });
const clipPath = (layer: CutLayer) => layer.mask ? `polygon(${layer.mask.polygon.map(p => `${p.x}px ${p.y}px`).join(", ")})` : undefined;

function Film({ frame, exporting, onCaptionIssues }: { frame: number; exporting: boolean; onCaptionIssues: (d: CaptionDiagnostic[]) => void }) {
  const state = evaluateCutPlan(PLAN, frame);
  const shot = (layer: CutLayer): ReactNode => {
    switch (layer.shotId) {
      case "scan": return <FreezeFrameFocus spec={FOCUS} frame={layer.localFrame} fps={HYBRID_FPS} adapter={VIDEO_ADAPTER} width={W} height={H} framing={FOOTAGE_FRAMING}
        requireExact={exporting} description="Parcels on a conveyor; one label passes the scanner" style={{ position: "absolute", inset: 0 }}
        typography={{ titleFont: "700 46px system-ui, sans-serif", titleSizePx: 46, detailFont: "500 34px system-ui, sans-serif", detailSizePx: 34, maxWidthPx: 520 }} />;
      case "route": return <RouteGraphic local={layer.localFrame} />;
      default: return <PhoneShot local={layer.localFrame} />;
    }
  };
  return <ShortSafeFrame profile={PROFILE} aria-label="Why a parcel is stop 3 of 12" style={{ width: W, background: "#0b111c" }}>
    {state.layers.map((layer, i) => <div key={`${layer.shotId}-${i}`} data-hybrid-layer={layer.shotId}
      style={{ position: "absolute", inset: 0, opacity: layer.opacity, clipPath: clipPath(layer) }}>{shot(layer)}</div>)}
    <CaptionPerformer track={CAPTIONS} frame={frame} anchor={frame < HYBRID_EVENTS.wipe ? "top" : "bottom"} highlight="word" reducedMotion={false}
      avoidRegions={frame >= HYBRID_EVENTS.dissolve ? [PHONE_BOUNDS] : undefined}
      onDiagnostics={onCaptionIssues} validation={{ reading: { wordsPerSecond: 3.6 } }} style={{ ["--km-caption-font-size" as string]: "4.6cqw" }} />
  </ShortSafeFrame>;
}

const note: CSSProperties = { margin: 0, font: "400 13px/1.5 var(--km-font-body, system-ui, sans-serif)", color: "var(--km-text-muted, #5b6472)" };
const MANIFEST: VideoExportManifest = { schemaVersion: 1, id: "hybrid-short", durationFrames: HYBRID_FRAMES, width: W, height: H, fps: HYBRID_FPS };

function HybridShort({ startFrame }: { startFrame: number }) {
  const exporting = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("kmExport") === "1";
  const [frame, setFrame] = useState(startFrame);
  const [playing, setPlaying] = useState(false);
  const [captionIssues, setCaptionIssues] = useState<CaptionDiagnostic[]>([]);
  useEffect(() => {
    if (!playing) return;
    let raf = 0, origin: number | undefined; const from = frame >= HYBRID_FRAMES - 1 ? 0 : frame;
    const tick = (t: number) => { origin ??= t; const next = from + Math.floor((t - origin) * 30 / 1000);
      if (next >= HYBRID_FRAMES) { setFrame(HYBRID_FRAMES - 1); setPlaying(false); return; } setFrame(next); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]); // eslint-disable-line react-hooks/exhaustive-deps -- restart only on play/pause
  const cues = useMemo(() => resolveAudioCues(HYBRID_SHEET, { alignments: [alignment], visualEvents: Object.entries(HYBRID_EVENTS).map(([id, f]) => ({ id: id.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`), frame: f })) }), []);
  const checks = useMemo(() => validateFreezeFocus(FOCUS, HYBRID_FPS, [{ width: W, height: H, framing: FOOTAGE_FRAMING }]), []);
  const film = <VideoExportStage manifest={MANIFEST} frame={frame} onSeek={setFrame}><Film frame={frame} exporting={exporting} onCaptionIssues={setCaptionIssues} /></VideoExportStage>;
  if (exporting) return <div style={{ padding: 20, background: "#000" }}>{film}</div>;
  const scale = 0.3, problems = [...checks, ...cues.diagnostics, ...captionIssues];
  return <section style={{ padding: 20, display: "grid", gap: 16, background: "var(--km-surface-canvas, #f6f7f9)", color: "var(--km-text-primary, #1f2937)", font: "400 14px/1.5 var(--km-font-body, system-ui, sans-serif)" }}>
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <button type="button" onClick={() => setPlaying(p => !p)} style={{ padding: "8px 16px", borderRadius: 8, font: "600 14px/1 var(--km-font-body, system-ui)" }}>{playing ? "Pause" : "Play"}</button>
      <input aria-label="Seek" type="range" min={0} max={HYBRID_FRAMES - 1} value={frame} onChange={e => { setPlaying(false); setFrame(Number(e.target.value)); }} style={{ flex: "1 1 260px" }} />
      <span style={{ fontFamily: "var(--km-font-mono, ui-monospace, monospace)" }}>frame {frame} · {evaluateCutPlan(PLAN, frame).shotId}</span>
    </div>
    <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
      <div style={{ width: W * scale, height: H * scale, overflow: "hidden", borderRadius: 12, flex: "none" }}>
        <div style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: "0 0" }}>{film}</div>
      </div>
      <div style={{ flex: "1 1 360px", display: "grid", gap: 10 }}>
        <table style={{ borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr>{["Visual event", "Visual", "Audio wants", "Δ", "Status"].map(h => <th key={h} style={{ textAlign: "left", padding: "3px 8px", borderBottom: "1px solid var(--km-border-subtle, #d4d8de)" }}>{h}</th>)}</tr></thead>
          <tbody>{cues.links.map(l => <tr key={l.id}><td style={{ padding: "3px 8px" }}>{l.visualEventId} ← {l.id.split("-").slice(-1)[0]}</td><td style={{ padding: "3px 8px" }}>{l.visualFrame}</td>
            <td style={{ padding: "3px 8px" }}>{l.suggestedFrame ?? "—"}</td><td style={{ padding: "3px 8px" }}>{l.deltaFrames ?? "—"}</td>
            <td style={{ padding: "3px 8px", fontWeight: 600, color: l.status === "aligned" ? "var(--km-status-success, #15803d)" : "var(--km-status-warning, #b45309)" }}>{l.status}</td></tr>)}</tbody>
        </table>
        {problems.length ? <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13 }}>{problems.map((d, i) =>
          <li key={i}><strong style={{ color: d.severity === "error" ? "var(--km-text-danger, #b91c1c)" : "var(--km-status-warning, #b45309)" }}>{d.code}</strong> — {d.message}</li>)}</ul>
          : <p style={{ ...note, color: "var(--km-status-success, #15803d)", fontWeight: 600 }}>Footage, freeze, captions and audio links all check out.</p>}
        <p style={note}>Footage: in-house WebM (scripts/generate-conveyor-footage.mjs), decoded by the browser and verified per frame. Narration timing is authored; the local audio build fits synthesized speech into it. Export with <code>kmExport=1</code> and <code>--audio</code>.</p>
      </div>
    </div>
  </section>;
}

const meta = { title: "Video/Phase 2 Hybrid Short", component: HybridShort, parameters: { layout: "fullscreen" },
  argTypes: { startFrame: { control: { type: "number", min: 0, max: HYBRID_FRAMES - 1 } } }, args: { startFrame: 75 } } satisfies Meta<typeof HybridShort>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Short: Story = {};
