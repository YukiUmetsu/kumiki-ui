import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { PerspectiveCamera } from "three";
import { ScreenContent3D } from "../../registry/craft/screen-content-3d";
import type { ScreenOverlayState } from "../../registry/craft/screen-content-3d";
import { bindScreenSurface } from "../../registry/craft/screen-surface";
import type { ScreenContent, ScreenSurfaceDiagnostic, ScreenSurfaceOptions } from "../../registry/craft/screen-surface";
import { fitHeroCamera } from "../../registry/craft/hero-viewer";
import { createLaptop, createSmartphone } from "../../registry/domains/technology-3d";
import { createCanvasMeasurer } from "../../registry/media/text-layout";

/* Fictional sample content. The screens are generic app-style UIs with no brand, drawn in design px so the
 * same painter fits a phone or a laptop. The screenshot is an SVG rasterised by the browser (loads async). */
const FONT = '"Inter", "Helvetica Neue", Arial, sans-serif';
const PHONE_DESIGN = 390, LAPTOP_DESIGN = 640;

/** Live tracker, painted from the frame number: progress fills over 120 frames, then holds. */
function tracker(ctx: CanvasRenderingContext2D, w: number, h: number, frame: number) {
  const progress = Math.min(1, frame / 120);
  ctx.fillStyle = "#f5f7fa"; ctx.fillRect(0, 0, w, h);
  // The top ~10% is the phone's dynamic island, so the content starts below it.
  ctx.fillStyle = "#14171c"; ctx.font = `700 ${Math.round(w * .068)}px ${FONT}`; ctx.fillText("Parcel 4471", w * .07, h * .15);
  ctx.fillStyle = "#4f5968"; ctx.font = `500 ${Math.round(w * .041)}px ${FONT}`; ctx.fillText("Arriving 10:40 · stop 3 of 12", w * .07, h * .19);
  ctx.fillStyle = "#dfe4eb"; ctx.beginPath(); ctx.roundRect(w * .07, h * .22, w * .86, h * .012, h * .006); ctx.fill();
  ctx.fillStyle = "#2f7d6d"; ctx.beginPath(); ctx.roundRect(w * .07, h * .22, w * .86 * progress, h * .012, h * .006); ctx.fill();
  const steps: Array<[string, string]> = [["Picked up", "09:10"], ["On the way", "09:52"], ["Stop 3 of 12", "10:40"]];
  steps.forEach(([label, time], i) => {
    const y = h * (.3 + i * .075), reached = progress >= i / 2;
    ctx.fillStyle = reached ? "#2f7d6d" : "#c3cad5"; ctx.beginPath(); ctx.arc(w * .085, y - h * .012, w * .016, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#14171c"; ctx.font = `600 ${Math.round(w * .045)}px ${FONT}`; ctx.textAlign = "left"; ctx.fillText(label, w * .14, y);
    ctx.fillStyle = "#4f5968"; ctx.font = `500 ${Math.round(w * .041)}px ${FONT}`; ctx.textAlign = "right"; ctx.fillText(time, w * .93, y);
  });
  ctx.textAlign = "left";
}

/** Route board: a table whose highlighted row follows the frame number. */
function routeBoard(ctx: CanvasRenderingContext2D, w: number, h: number, frame: number) {
  const rows: Array<[string, string, string, string]> = [["Route", "Area", "Start", "Stops"], ["R2", "North", "09:10", "9"], ["R4", "Riverside", "08:50", "11"], ["R7", "East", "10:04", "12"], ["R1", "Harbour", "09:30", "6"]];
  ctx.fillStyle = "#0f1622"; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#e9eef7"; ctx.font = `700 ${Math.round(h * .07)}px ${FONT}`; ctx.fillText("Routes today", w * .05, h * .11);
  const highlight = 1 + (Math.floor(frame / 40) % 4);
  rows.forEach((cells, r) => {
    const y = h * (.22 + r * .15);
    if (r === highlight) { ctx.fillStyle = "#1d2f4d"; ctx.fillRect(w * .04, y - h * .085, w * .92, h * .12); }
    ctx.fillStyle = r === 0 ? "#7d8aa3" : "#e9eef7";
    ctx.font = `${r === 0 ? 600 : 500} ${Math.round(h * .052)}px ${FONT}`;
    const columns = [w * .05, w * .2, w * .58, w * .8];
    cells.forEach((cell, c) => { ctx.textAlign = c === 3 || c === 2 ? "right" : "left"; ctx.fillText(cell, c === 2 ? w * .72 : c === 3 ? w * .95 : columns[c], y); });
  });
  ctx.textAlign = "left";
}

const SHOT_MARKUP = `<svg xmlns="http://www.w3.org/2000/svg" width="390" height="844" viewBox="0 0 390 844">
  <rect width="390" height="844" fill="#fbfbf8"/>
  <rect x="0" y="0" width="390" height="132" fill="#2f5f8a"/>
  <text x="26" y="104" font-family="Inter, Arial, sans-serif" font-size="26" font-weight="700" fill="#ffffff">Delivery status</text>
  <rect x="22" y="160" width="346" height="128" rx="18" fill="#ffffff" stroke="#dfe3e8"/>
  <text x="44" y="204" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="600" fill="#1d232b">Parcel 4471</text>
  <text x="44" y="240" font-family="Inter, Arial, sans-serif" font-size="17" fill="#4f5968">Expected 10:40 · stop 3</text>
  <rect x="44" y="262" width="302" height="10" rx="5" fill="#e6eaf0"/>
  <rect x="44" y="262" width="198" height="10" rx="5" fill="#2f5f8a"/>
  <rect x="22" y="312" width="346" height="128" rx="18" fill="#ffffff" stroke="#dfe3e8"/>
  <text x="44" y="356" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="600" fill="#1d232b">Parcel 4472</text>
  <text x="44" y="392" font-family="Inter, Arial, sans-serif" font-size="17" fill="#4f5968">Delivered 09:26</text>
</svg>`;

/** The screenshot is an image source: it has no pixels until the browser decodes it. */
function svgImage(markup: string) {
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  return image;
}
const SHOT = svgImage(SHOT_MARKUP);

// Module-level identities: the recipe rebinds the screen whenever `screen` changes identity.
const TRACKER: ScreenContent = { kind: "paint", draw: tracker };
const ROUTES: ScreenContent = { kind: "paint", draw: routeBoard };
const SHOT_CONTENT: ScreenContent = { kind: "image", source: SHOT, width: 390, height: 844 };
// minTextPx is each content's smallest text: tracker labels 16 px, the screenshot's 17 px body, route rows 21 px.
const PHONE_LIVE: ScreenSurfaceOptions = { part: "phone-display", content: TRACKER, designWidth: PHONE_DESIGN, fit: "contain", minTextPx: 16 };
const PHONE_SHOT: ScreenSurfaceOptions = { part: "phone-display", content: SHOT_CONTENT, designWidth: PHONE_DESIGN, fit: "contain", minTextPx: 17 };
const LAPTOP_BOARD: ScreenSurfaceOptions = { part: "laptop-display", content: ROUTES, designWidth: LAPTOP_DESIGN, minTextPx: 21 };
const createPhone = () => createSmartphone({ id: "screen-phone", notification: { title: "Parcel 4471", body: "Stop 3 · arriving 10:40" } });
const createLaptopDemo = () => createLaptop({ id: "screen-laptop" });

const measure = createCanvasMeasurer({});
/** A measured pill above the display's top-right corner, kept inside the viewport. */
function callout(text: string) {
  return ({ projection, width }: ScreenOverlayState) => {
    const anchor = projection.corners[1], font = `600 15px ${FONT}`;
    const h = 30, w = Math.round(measure(font, text) + 24);
    const x = Math.max(8, Math.min(width - w - 8, anchor.x - w + 18)), y = Math.max(8, anchor.y - h - 14);
    return <g>
      <line x1={x + w / 2} y1={y + h} x2={anchor.x} y2={anchor.y} stroke="var(--km-accent, #2f5f8a)" strokeWidth={2} />
      <rect x={x} y={y} width={w} height={h} rx={h / 2} fill="var(--km-accent, #2f5f8a)" />
      <text x={x + w / 2} y={y + h / 2} textAnchor="middle" dominantBaseline="central" fill="#ffffff" style={{ font }}>{text}</text>
    </g>;
  };
}
const overlayPhone = callout("Live tracking");
const overlayLaptop = callout("Route board");

const note: CSSProperties = { margin: 0, font: "400 13px/1.5 var(--km-font-body, system-ui, sans-serif)", color: "var(--km-text-muted, #5b6472)" };
const tone = (d: ScreenSurfaceDiagnostic) => d.severity === "error" ? "var(--km-text-danger, #b91c1c)" : "var(--km-status-warning, #b45309)";
const button = (active = false): CSSProperties => ({ padding: "8px 14px", borderRadius: 8, font: "600 14px/1 var(--km-font-body, system-ui)",
  border: "1px solid var(--km-rule, #cfd5dd)", background: active ? "var(--km-accent, #2f5f8a)" : "var(--km-surface, #ffffff)", color: active ? "#ffffff" : "inherit" });

function ScreenDemo({ startFrame }: { startFrame: number }) {
  const total = 240;
  const [frame, setFrame] = useState(startFrame);
  const [playing, setPlaying] = useState(false);
  const [shot, setShot] = useState(false);
  const [diagnostics, setDiagnostics] = useState<Record<string, ScreenSurfaceDiagnostic[]>>({});
  useEffect(() => {
    if (!playing) return;
    let raf = 0, origin: number | undefined; const from = frame >= total - 1 ? 0 : frame;
    const tick = (t: number) => { origin ??= t; const next = from + Math.floor((t - origin) * 30 / 1000);
      if (next >= total) { setFrame(total - 1); setPlaying(false); return; } setFrame(next); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]); // eslint-disable-line react-hooks/exhaustive-deps -- restart only on play/pause
  const all = Object.entries(diagnostics).flatMap(([id, list]) => list.map(d => ({ ...d, message: `${d.message} (${id})` })));
  return <section style={{ padding: 20, display: "grid", gap: 16, background: "var(--km-surface-canvas, #f6f7f9)", color: "var(--km-text-primary, #1f2937)", font: "400 14px/1.5 var(--km-font-body, system-ui, sans-serif)" }}>
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <button type="button" onClick={() => setPlaying(p => !p)} style={button()}>{playing ? "Pause" : "Play"}</button>
      <input aria-label="Seek" type="range" min={0} max={total - 1} value={frame} onChange={e => { setPlaying(false); setFrame(Number(e.target.value)); }} style={{ flex: "1 1 260px" }} />
      <span style={{ fontFamily: "var(--km-font-mono, ui-monospace, monospace)" }}>frame {frame}</span>
      <button type="button" aria-pressed={!shot} onClick={() => setShot(false)} style={button(!shot)}>Live paint</button>
      <button type="button" aria-pressed={shot} onClick={() => setShot(true)} style={button(shot)}>Screenshot (SVG)</button>
    </div>
    <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
      <figure style={{ margin: 0, display: "grid", gap: 6 }}>
        <ScreenContent3D createAsset={createPhone} width={360} height={640} pixelRatio={1.5} zoom={2} action="notify" actionFrame={frame} fps={30}
          screen={shot ? PHONE_SHOT : PHONE_LIVE} overlay={overlayPhone} ariaLabel="Phone showing a parcel tracker"
          onDiagnostics={d => setDiagnostics(prev => ({ ...prev, phone: d }))} style={{ borderRadius: 12, overflow: "hidden" }} />
        <figcaption style={note}>Phone 9:16 · {shot ? "screenshot, fitted" : "live paint"}</figcaption>
      </figure>
      <figure style={{ margin: 0, display: "grid", gap: 6 }}>
        <ScreenContent3D createAsset={createLaptopDemo} width={640} height={400} pixelRatio={1.5} zoom={1.6} actionFrame={frame} fps={30}
          screen={LAPTOP_BOARD} overlay={overlayLaptop} ariaLabel="Laptop showing a route board"
          onDiagnostics={d => setDiagnostics(prev => ({ ...prev, laptop: d }))} style={{ borderRadius: 12, overflow: "hidden" }} />
        <figcaption style={note}>Laptop 16:9 · live paint</figcaption>
      </figure>
    </div>
    {all.length ? <ul style={{ margin: 0, paddingLeft: 20 }}>{all.map((d, i) => <li key={i}><strong style={{ color: tone(d) }}>{d.code}</strong> — {d.message}</li>)}</ul>
      : <p style={{ ...note, color: "var(--km-status-success, #15803d)", fontWeight: 600 }}>Bound to the display meshes; no screen problems in these views.</p>}
    <p style={note}>Content is fictional and generic. The devices are crafted hero models; ScreenSurface checks the binding, aspect, facing and readability, not the models' realism.</p>
  </section>;
}

function viewCamera(asset: ReturnType<typeof createSmartphone>, zoom: number, width: number, height: number) {
  const pose = fitHeroCamera(asset, { azimuth: 0, elevation: 0, zoom }, width / height);
  const camera = new PerspectiveCamera(pose.fov, width / height, pose.near, pose.far);
  camera.position.set(...pose.position); camera.lookAt(...pose.target); camera.updateMatrixWorld();
  return camera;
}

/** Screen problems the binding refuses or warns about, each with its reason. Runs without WebGL. */
function Refusals() {
  const rows = useMemo(() => {
    const phone = createSmartphone();
    const plain: ScreenContent = { kind: "paint", draw: () => {} };
    const out: Array<{ label: string; status: string; diagnostics: ScreenSurfaceDiagnostic[] }> = [];
    const add = (label: string, surface: ReturnType<typeof bindScreenSurface>, camera?: PerspectiveCamera) =>
      out.push({ label, status: surface.status, diagnostics: surface.diagnostics(camera, 360, 640) });
    add("Part name that the asset does not have", bindScreenSurface(phone, { part: "phone-glass", content: plain }));
    add("Part that is a group, not a screen", bindScreenSurface(phone, { part: "phone-body", content: plain }));
    add("Image that has not finished loading", bindScreenSurface(phone, { part: "phone-display", content: { kind: "image", source: new Image(), width: 390, height: 844 }, designWidth: PHONE_DESIGN }));
    const far = bindScreenSurface(phone, { part: "phone-display", content: plain, designWidth: PHONE_DESIGN, minTextPx: 14 });
    phone.pose?.({ id: null, frame: 0, fps: 30 });
    add("Text too small from a distant camera", far, viewCamera(phone, 1, 360, 640));
    phone.pose?.({ id: "turn", frame: 30, fps: 30 });
    add("Display turned away from the camera", far, viewCamera(phone, 2, 360, 640));
    phone.dispose();
    return out;
  }, []);
  return <section style={{ padding: 20, display: "grid", gap: 12, font: "400 14px/1.5 var(--km-font-body, system-ui, sans-serif)", color: "var(--km-text-primary, #1f2937)" }}>
    {rows.map((r, i) => <div key={i}><strong>{r.label}</strong> <span style={{ color: "var(--km-text-muted, #5b6472)" }}>· status {r.status}</span>
      <ul style={{ margin: "4px 0 0", paddingLeft: 20 }}>{r.diagnostics.length
        ? r.diagnostics.map((d, j) => <li key={j}><code style={{ color: tone(d) }}>{d.code}</code> — {d.message}</li>)
        : <li style={{ color: "var(--km-status-success, #15803d)" }}>No problems.</li>}</ul></div>)}
  </section>;
}

const meta = { title: "Craft/Screen Surface", component: ScreenDemo, parameters: { layout: "fullscreen" },
  argTypes: { startFrame: { control: { type: "number", min: 0, max: 239 } } }, args: { startFrame: 60 } } satisfies Meta<typeof ScreenDemo>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ScreenSurface: Story = { name: "Devices" };
export const RefusalsStory: Story = { name: "Refusals", render: () => <Refusals /> };
