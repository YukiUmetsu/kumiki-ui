import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { FrameAccurateClip } from "../../registry/video/frame-accurate-clip";
import type { ClipRenderState } from "../../registry/video/frame-accurate-clip";
import { createImageSequenceAdapter, createProceduralAdapter, createVideoElementAdapter } from "../../registry/video/frame-clip-adapters";
import type { ClipFrameAdapter } from "../../registry/video/frame-clip-adapters";
import { checkClipCapabilities, inspectClipFraming, resolveClipDraw, validateClip } from "../../registry/video/frame-clip";
import type { ClipFraming, ClipPlacement, ClipSource, ClipTiming } from "../../registry/video/frame-clip";

/* Synthetic footage, generated in-house (no third-party media):
 *   ffmpeg -filter_complex "testsrc2=size=480x270:rate=30:duration=4[base];color=c=black:s=480x24:r=30:d=4,format=yuv420p,
 *     geq=lum='if(bitand(N\,pow(2\,9-floor(X/48)))\,235\,16)':cb=128:cr=128[strip];[base][strip]overlay=0:0:shortest=1,format=yuv420p[v]"
 *     -map "[v]" -c:v libvpx-vp9 -b:v 0 -crf 40 -g 15 -row-mt 1 -an synthetic-frame-counter.webm
 * The top strip encodes the frame index as 10 bits (48 px each, most significant first), so the
 * story can read back which frame is really on the canvas. The procedural source draws the same strip. */
const VIDEO_URL = new URL("./assets/synthetic-frame-counter.webm", import.meta.url).href;
const SOURCE: ClipSource = { id: "synthetic-counter", width: 480, height: 270, frameCount: 120, fps: { num: 30, den: 1 }, alpha: "none",
  licenseRef: "In-house synthetic test footage (generated with FFmpeg testsrc2)" };
const FPS = { num: 30, den: 1 }, FILM = 140;

function drawSynthetic(ctx: CanvasRenderingContext2D, source: ClipSource, index: number) {
  const bars = ["#d33", "#3c3", "#dd3", "#33d", "#d3d", "#3dd"];
  bars.forEach((color, i) => { ctx.fillStyle = color; ctx.fillRect(i * source.width / 6, 0, source.width / 6 + 1, source.height); });
  ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(0, source.height - 70, source.width, 70);
  const x = (index / (source.frameCount - 1)) * (source.width - 40);
  ctx.fillStyle = "#fff"; ctx.fillRect(x, source.height - 60, 40, 50);
  ctx.font = "700 40px system-ui, sans-serif"; ctx.fillStyle = "#fff"; ctx.textBaseline = "middle";
  ctx.fillText(`#${index}`, 20, source.height / 2);
  for (let bit = 0; bit < 10; bit += 1) { ctx.fillStyle = index & (1 << (9 - bit)) ? "#ebebeb" : "#101010"; ctx.fillRect(bit * 48, 0, 48, 24); }
}

/** Decode the 10-bit strip from what is actually painted on the canvas. */
function readBack(canvas: HTMLCanvasElement, framing: ClipFraming | undefined): number | undefined {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return undefined;
  const draw = resolveClipDraw(SOURCE, { width: canvas.width, height: canvas.height }, framing);
  let value = 0;
  for (let bit = 0; bit < 10; bit += 1) {
    const sx = bit * 48 + 24, sy = 12;
    const cx = draw.dx + (sx - draw.sx) * draw.scale, cy = draw.dy + (sy - draw.sy) * draw.scale;
    if (cx < 0 || cy < 0 || cx >= canvas.width || cy >= canvas.height) return undefined;
    const [r, g, b] = ctx.getImageData(Math.floor(cx), Math.floor(cy), 1, 1).data;
    value = value * 2 + ((r + g + b) / 3 > 128 ? 1 : 0);
  }
  return value;
}

type AdapterId = "procedural" | "image-sequence" | "video-element";
function useAdapter(id: AdapterId): ClipFrameAdapter {
  const adapter = useMemo(() => {
    if (id === "procedural") return createProceduralAdapter({ draw: drawSynthetic, alpha: false });
    if (id === "image-sequence") return createImageSequenceAdapter({ alpha: false, url: (source, index) => {
      // A real production points this at PNG/JPEG files; here the frames are rendered to data URLs.
      const canvas = document.createElement("canvas"); canvas.width = source.width; canvas.height = source.height;
      drawSynthetic(canvas.getContext("2d")!, source, index); return canvas.toDataURL("image/png");
    } });
    return createVideoElementAdapter({ url: () => VIDEO_URL });
  }, [id]);
  useEffect(() => () => adapter.dispose?.(), [adapter]);
  return adapter;
}

const TIMINGS: Record<string, { label: string; timing: ClipTiming }> = {
  play: { label: "1× play", timing: {} },
  slow: { label: "0.5× slow motion", timing: { rate: { num: 1, den: 2 } } },
  fast: { label: "2× fast", timing: { rate: 2 } },
  reverse: { label: "Reverse", timing: { rate: -1 } },
  freeze: { label: "Freeze on frame 45 (30 frames)", timing: { freezes: [{ atFrame: 40, durationFrames: 30, sourceFrame: 45 }] } },
  ramp: { label: "Speed ramp (time remap)", timing: { remap: [{ frame: 0, sourceFrame: 0 }, { frame: 60, sourceFrame: 20, easing: "ease-in-cubic" }, { frame: 119, sourceFrame: 119, easing: "ease-in-out-cubic" }] } },
  trim: { label: "Trim 30–90, hide after", timing: { trimIn: 30, trimOut: 90, end: "hide" } },
};
const OUTPUTS: { id: string; label: string; width: number; height: number; framing: ClipFraming; max: number }[] = [
  { id: "landscape", label: "16:9 · full frame (contain)", width: 640, height: 360, framing: { fit: "contain" }, max: 560 },
  { id: "portrait", label: "9:16 · reframed independently (cover, focus lower-left 0.2 / 0.9)", width: 360, height: 640, framing: { fit: "cover", focus: { x: 0.2, y: 0.9 } }, max: 260 },
];
const note: CSSProperties = { margin: 0, font: "400 13px/1.5 var(--km-font-body, system-ui, sans-serif)", color: "var(--km-text-muted, #5b6472)" };
const tone = { ready: "var(--km-status-success, #15803d)", inexact: "var(--km-status-warning, #b45309)", error: "var(--km-text-danger, #b91c1c)", pending: "inherit", hidden: "inherit" };

interface Args { adapter: AdapterId; timing: keyof typeof TIMINGS; requireExact: boolean; startFrame: number }
function ClipDemo({ adapter: adapterId, timing, requireExact, startFrame }: Args) {
  const adapter = useAdapter(adapterId);
  const placement: ClipPlacement = useMemo(() => ({ id: "counter", source: SOURCE, startFrame: 10, durationFrames: 120, timing: TIMINGS[timing].timing }), [timing]);
  const [frame, setFrame] = useState(startFrame);
  const [playing, setPlaying] = useState(false);
  const [states, setStates] = useState<Record<string, ClipRenderState>>({});
  const [verified, setVerified] = useState<number | undefined>();
  const landscape = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!playing) return;
    let raf = 0, origin: number | undefined; const from = frame >= FILM - 1 ? 0 : frame;
    const tick = (t: number) => { origin ??= t; const next = from + Math.floor((t - origin) * 30 / 1000);
      if (next >= FILM) { setFrame(FILM - 1); setPlaying(false); return; } setFrame(next); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]); // eslint-disable-line react-hooks/exhaustive-deps -- restart only on play/pause
  const diagnostics = [...validateClip(placement, FPS), ...checkClipCapabilities(placement, adapter, { requireExact }),
    ...OUTPUTS.flatMap(o => inspectClipFraming(placement, o, o.framing))];
  const land = states.landscape;
  useEffect(() => {
    const canvas = landscape.current?.querySelector("canvas");
    setVerified(land?.status === "ready" || land?.status === "inexact" ? (canvas ? readBack(canvas, OUTPUTS[0].framing) : undefined) : undefined);
  }, [land]);
  return <section style={{ padding: 20, display: "grid", gap: 16, background: "var(--km-surface-canvas, #f6f7f9)", color: "var(--km-text-primary, #1f2937)", font: "400 14px/1.5 var(--km-font-body, system-ui, sans-serif)" }}>
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <button type="button" onClick={() => setPlaying(p => !p)} style={{ padding: "8px 16px", borderRadius: 8, font: "600 14px/1 var(--km-font-body, system-ui)" }}>{playing ? "Pause" : "Play"}</button>
      <input aria-label="Seek" type="range" min={0} max={FILM - 1} value={frame} onChange={e => { setPlaying(false); setFrame(Number(e.target.value)); }} style={{ flex: "1 1 260px" }} />
      <span style={{ fontFamily: "var(--km-font-mono, ui-monospace, monospace)" }}>output frame {frame}</span>
    </div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      {OUTPUTS.map(o => {
        const s = states[o.id];
        return <figure key={o.id} style={{ margin: 0, width: "100%", maxWidth: o.max, display: "grid", gap: 6 }}>
          <FrameAccurateClip ref={o.id === "landscape" ? landscape : undefined} placement={placement} frame={frame} fps={FPS} adapter={adapter}
            width={o.width} height={o.height} framing={o.framing} requireExact={requireExact}
            description="Synthetic colour-bar test footage with a frame counter strip" style={{ background: "#0b111c", borderRadius: 10, overflow: "hidden" }}
            onStatus={next => setStates(prev => ({ ...prev, [o.id]: next }))} />
          <figcaption style={note}>
            {o.label}<br />
            <span style={{ color: tone[s?.status ?? "pending"], fontWeight: 600 }}>{s?.status ?? "pending"}</span>
            {s ? ` · phase ${s.resolved.phase} · expected source ${s.resolved.sourceFrame ?? "—"} · drawn ${s.drawnFrame ?? "—"}` : ""}
            {s?.presentedTime !== undefined ? ` · presented ${s.presentedTime.toFixed(3)} s` : ""}
          </figcaption>
        </figure>;
      })}
    </div>
    <p style={{ margin: 0, fontWeight: 600 }}>
      Read back from the 16:9 canvas pixels: {verified === undefined ? "—" : `frame ${verified}`}
      {verified !== undefined && land?.resolved.sourceFrame !== undefined
        ? (verified === land.resolved.sourceFrame ? " ✓ matches the expected source frame" : ` ✗ expected ${land.resolved.sourceFrame}`) : ""}
    </p>
    {diagnostics.length ? <ul style={{ margin: 0, paddingLeft: 20 }}>{diagnostics.map((d, i) =>
      <li key={i}><strong style={{ color: d.severity === "error" ? tone.error : tone.inexact }}>{d.code}</strong> — {d.message}</li>)}</ul> : null}
    <p style={note}>Adapters: procedural and image-sequence are exact by construction; browser video is verified per frame from the presented media time and shown as inexact when it cannot be confirmed. Turn on “requireExact” to treat unverified frames as errors, as export does.</p>
  </section>;
}

const meta = {
  title: "Video/Frame Accurate Clip", component: ClipDemo, parameters: { layout: "fullscreen" },
  argTypes: {
    adapter: { control: "inline-radio", options: ["procedural", "image-sequence", "video-element"] },
    timing: { control: { type: "select", labels: Object.fromEntries(Object.entries(TIMINGS).map(([k, v]) => [k, v.label])) }, options: Object.keys(TIMINGS) },
    startFrame: { control: { type: "number", min: 0, max: FILM - 1 } },
  },
  args: { adapter: "video-element", timing: "play", requireExact: false, startFrame: 70 },
} satisfies Meta<typeof ClipDemo>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Clip: Story = {};
