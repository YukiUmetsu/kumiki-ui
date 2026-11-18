import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { createSelectiveColorEngine, SelectiveColorError } from "../../registry/video/selective-color";
import type { SelectiveColorFrameReport, SelectiveColorInput, SelectiveColorSpace } from "../../registry/video/selective-color";

/** Colours to keep, each tuned for its own units in every colour space. */
const PRESETS = {
  red: { label: "Red", color: "#d8261c" },
  blue: { label: "Blue neon", color: "#2f63ff" },
  skin: { label: "Skin", color: "#c98d6e" },
} as const;
type PresetId = keyof typeof PRESETS;
const TOLERANCE = { hsv: { tolerance: 16, softness: 14, max: 90, step: 1 }, lab: { tolerance: 22, softness: 14, max: 80, step: 1 }, ycbcr: { tolerance: 0.07, softness: 0.06, max: 0.4, step: 0.005 } } as const;
/** A six-second shot: selective colour fades in at 1 s and out at 5 s, over 0.75 s each way. */
const SECONDS = 6, WINDOW = { start: 1, end: 5, transition: 0.75 };

const label: CSSProperties = { display: "grid", gap: 4, font: "12px/1.3 system-ui", color: "#c9d1db" };
const row: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 16, alignItems: "end" };

/**
 * The selective colour engine on a photograph, run on the CPU reference path frame by frame. Scrub or play the shot's
 * timeline to see the window fade in and out; switch the colour space, the colour kept and every threshold.
 */
export function SelectiveColorDemo({ plates, width = 960 }: { plates: Readonly<Record<string, string>>; width?: number }) {
  const ids = Object.keys(plates), [plate, setPlate] = useState(ids[0]), [preset, setPreset] = useState<PresetId>("red");
  const [space, setSpace] = useState<SelectiveColorSpace>("hsv"), [tolerance, setTolerance] = useState<number>(TOLERANCE.hsv.tolerance), [softness, setSoftness] = useState<number>(TOLERANCE.hsv.softness);
  const [feather, setFeather] = useState(2), [edgeAware, setEdgeAware] = useState(true), [contrast, setContrast] = useState(1.5), [black, setBlack] = useState(0.06);
  const [time, setTime] = useState(3), [playing, setPlaying] = useState(false), [showMask, setShowMask] = useState(false);
  const [pixels, setPixels] = useState<ImageData>(), [report, setReport] = useState<SelectiveColorFrameReport>(), [error, setError] = useState<string>();
  const canvas = useRef<HTMLCanvasElement>(null), height = Math.round((width * 9) / 16);

  // Decode the plate once at the canvas size.
  useEffect(() => {
    const image = new Image();
    image.onload = () => {
      const c = document.createElement("canvas");
      c.width = width; c.height = height;
      const g = c.getContext("2d", { willReadFrequently: true })!, k = Math.max(width / image.width, height / image.height);
      g.drawImage(image, (width - image.width * k) / 2, (height - image.height * k) / 2, image.width * k, image.height * k);
      setPixels(g.getImageData(0, 0, width, height));
    };
    image.src = plates[plate];
  }, [plate, plates, width, height]);

  const config = useMemo<SelectiveColorInput>(() => ({
    colorSpace: space,
    targets: [{ color: PRESETS[preset].color, tolerance, softness, ...preset === "skin" ? { saturationMin: 0.1, valueMin: 0.2 } : {} }],
    feathering: { radius: feather, edgeAware },
    monochrome: { contrastBoost: contrast, blackLevel: black },
    windows: [WINDOW],
  }), [space, preset, tolerance, softness, feather, edgeAware, contrast, black]);
  const engine = useMemo(() => {
    try { setError(undefined); return createSelectiveColorEngine(config, { duration: SECONDS }); }
    catch (e) { setError(e instanceof SelectiveColorError ? e.message : String(e)); return undefined; }
  }, [config]);

  useEffect(() => {
    if (!pixels || !engine || !canvas.current) return;
    engine.reset();
    const { data, mask, report } = engine.process({ width, height, data: pixels.data }, time);
    const out = new ImageData(width, height);
    if (showMask) for (let p = 0; p < mask.length; p++) { const v = Math.round(255 * mask[p]); out.data.set([v, v, v, 255], 4 * p); }
    else out.data.set(data);
    canvas.current.getContext("2d")!.putImageData(out, 0, 0);
    setReport(report);
  }, [pixels, engine, time, showMask, width, height]);

  useEffect(() => {
    if (!playing) return;
    let frame = 0, last = performance.now();
    const tick = (now: number) => {
      setTime((t) => { const next = t + (now - last) / 1000; return next >= SECONDS ? 0 : next; });
      last = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  const pickSpace = (next: SelectiveColorSpace) => { setSpace(next); setTolerance(TOLERANCE[next].tolerance); setSoftness(TOLERANCE[next].softness); };
  const t = TOLERANCE[space];
  return <div style={{ display: "grid", gap: 12, padding: 16, background: "#0d1117", color: "#e6edf3", minHeight: "100vh", boxSizing: "border-box", maxWidth: "100%" }}>
    <canvas ref={canvas} width={width} height={height} role="img" aria-label={`The plate in black and white, keeping ${PRESETS[preset].label.toLowerCase()}`} style={{ width: "100%", maxWidth: width, height: "auto", borderRadius: 6, background: "#000" }} />
    <div style={row}>
      <button type="button" onClick={() => setPlaying((p) => !p)} style={{ padding: "8px 16px", borderRadius: 6, border: 0, background: "#7cc6ff", color: "#06121f", font: "600 14px system-ui" }}>{playing ? "Pause" : "Play"}</button>
      <label style={label}>Time {time.toFixed(2)} s · strength {report ? report.strength.toFixed(2) : "–"}
        <input type="range" min={0} max={SECONDS} step={0.01} value={time} onChange={(e) => { setPlaying(false); setTime(Number(e.target.value)); }} style={{ width: 320 }} />
      </label>
      <label style={label}><span><input type="checkbox" checked={showMask} onChange={(e) => setShowMask(e.target.checked)} /> Show the mask</span></label>
      <span style={{ font: "12px ui-monospace, monospace", color: "#9aa4b2" }}>{report ? `kept ${(report.kept * 100).toFixed(1)}% · ${report.milliseconds.toFixed(0)} ms a frame (CPU)` : ""}</span>
    </div>
    <div style={row}>
      <label style={label}>Plate<select value={plate} onChange={(e) => setPlate(e.target.value)}>{ids.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
      <label style={label}>Keep<select value={preset} onChange={(e) => setPreset(e.target.value as PresetId)}>{(Object.keys(PRESETS) as PresetId[]).map((id) => <option key={id} value={id}>{PRESETS[id].label}</option>)}</select></label>
      <label style={label}>Colour space<select value={space} onChange={(e) => pickSpace(e.target.value as SelectiveColorSpace)}><option value="hsv">HSV (hue window)</option><option value="lab">CIELAB (ΔE 2000)</option><option value="ycbcr">YCbCr (chroma)</option></select></label>
      <label style={label}>Tolerance {tolerance}<input type="range" min={0} max={t.max} step={t.step} value={tolerance} onChange={(e) => setTolerance(Number(e.target.value))} /></label>
      <label style={label}>Softness {softness}<input type="range" min={0} max={t.max} step={t.step} value={softness} onChange={(e) => setSoftness(Number(e.target.value))} /></label>
    </div>
    <div style={row}>
      <label style={label}>Feather {feather}‰<input type="range" min={0} max={20} step={0.5} value={feather} onChange={(e) => setFeather(Number(e.target.value))} /></label>
      <label style={label}><span><input type="checkbox" checked={edgeAware} onChange={(e) => setEdgeAware(e.target.checked)} /> Feather along edges (guided filter)</span></label>
      <label style={label}>Contrast {contrast.toFixed(2)}<input type="range" min={0.5} max={3} step={0.05} value={contrast} onChange={(e) => setContrast(Number(e.target.value))} /></label>
      <label style={label}>Black level {black.toFixed(2)}<input type="range" min={0} max={0.3} step={0.01} value={black} onChange={(e) => setBlack(Number(e.target.value))} /></label>
    </div>
    {error && <p role="alert" style={{ margin: 0, color: "#ff9b9b", font: "13px system-ui" }}>{error}</p>}
    <p style={{ margin: 0, maxWidth: width, color: "#9aa4b2", font: "13px/1.55 system-ui" }}>
      The picture turns into high-contrast black and white except for the colour kept. A pixel keeps its colour as much as it
      matches: within the tolerance fully, fading out over the softness, never when it is grey or near black. The mask is
      feathered along the picture's own edges, so colour does not bleed into the grey. The window fades selective colour in
      at 1 s and out at 5 s; outside it the shot is all black and white. This is the CPU reference path; the GPU path comes next.
    </p>
  </div>;
}
