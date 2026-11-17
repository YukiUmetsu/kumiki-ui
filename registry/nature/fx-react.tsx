/**
 * FX1 React pieces: `FireView` (a fire rendered frame by frame in workers and played at its own flicker; a still
 * frame under reduced motion), `FlameColours` (blackbody colour by temperature) and `FireSheet` (fires, flame heights
 * and flicker rates, temperatures, smoke, sparks, fireballs, firelight).
 */
import { useEffect, useRef, useState } from "react";
import { requestRender } from "../anatomy/foundation-render";
import { SheetCard, sheetGrid, sheetList, sheetSmall } from "../anatomy/foundation-react";
import { FIRELIGHT, FIRES, FLAME_TEMPERATURES, SMOKE, SPARKS, blackbodyRGB, fireball, flameHeight, flickerHz } from "./fx-data";
import type { FireRenderOptions } from "./fx-render";
import { FX_RENDER_POOL } from "./fx-render-pool";

export interface FireViewProps { options: FireRenderOptions & { mass?: number }; seconds?: number; fps?: number; label: string; /** Render a fireball (`renderFireball`, `options.mass` kg) instead of a fire. */ fireball?: boolean }
/** A fire, `seconds` long at `fps`, rendered in workers (cached) then looped. Reduced motion: the first frame and Play. */
export function FireView({ options, seconds = 2, fps = 12, label, fireball: isBall = false }: FireViewProps) {
  const canvas = useRef<HTMLCanvasElement>(null), n = Math.max(2, Math.round(seconds * fps)), W = options.width ?? 320, H = options.height ?? 300;
  const [frames, setFrames] = useState<ImageData[]>([]), [done, setDone] = useState(0), [playing, setPlaying] = useState(() => !(typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches));
  const key = JSON.stringify([options, seconds, fps, isBall]);
  useEffect(() => {
    let live = true, count = 0;
    const ac = new AbortController(), out: (ImageData | undefined)[] = new Array(n).fill(undefined);
    setFrames([]); setDone(0);
    for (let k = 0; k < n; k++) void requestRender({ pool: FX_RENDER_POOL, kind: isBall ? "fireball" : "fire", args: { ...options, t: (options.t ?? 0) + k / fps, supersample: options.supersample ?? 1 }, priority: 1 + k / n, signal: ac.signal })
      .then(r => { if (!live) return; out[k] = new ImageData(new Uint8ClampedArray(r.rgba), r.width, r.height); count++; setDone(count); if (k === 0) canvas.current?.getContext("2d")?.putImageData(out[0]!, 0, 0); if (count === n) setFrames(out as ImageData[]); }, () => {});
    return () => { live = false; ac.abort(); };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const ready = frames.length === n;
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx || !ready) return;
    if (!playing) { ctx.putImageData(frames[0], 0, 0); return; }
    let raf = 0, start = 0;
    const tick = (now: number) => { if (!start) start = now; ctx.putImageData(frames[Math.floor(((now - start) / 1000) * fps) % n], 0, 0); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [frames, ready, playing, fps, n]);
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <canvas ref={canvas} width={W} height={H} role="img" aria-label={label} aria-busy={!ready} style={{ display: "block", width: "100%", height: "auto", aspectRatio: `${W} / ${H}`, borderRadius: 6, background: "#07080a" }} />
      <div style={{ display: "flex", gap: 8, alignItems: "center", ...sheetSmall }}>
        <button type="button" disabled={!ready} onClick={() => setPlaying(p => !p)} aria-pressed={playing} style={{ minHeight: 32, padding: "4px 10px", borderRadius: 6, border: "1px solid #797776", background: "#fff", font: "13px system-ui" }}>{playing ? "Pause" : "Play"}</button>
        <span aria-live="polite">{ready ? `${n} frames, ${fps} fps` : `Rendering frames ${done} / ${n}…`}</span>
      </div>
    </div>
  );
}

/** Blackbody colour from 800 K to 2400 K (what glowing soot and embers look like). */
export function FlameColours() {
  const ts = Array.from({ length: 17 }, (_, i) => 800 + i * 100);
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <div style={{ display: "flex", borderRadius: 6, overflow: "hidden" }} aria-hidden="true">{ts.map(T => { const c = blackbodyRGB(T).map(v => Math.round(255 * Math.min(1, v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055))); return <span key={T} style={{ flex: 1, height: 34, background: `rgb(${c.join(",")})` }} />; })}</div>
      <div style={{ display: "flex", justifyContent: "space-between", ...sheetSmall }}><span>800 K</span><span>1600 K</span><span>2400 K</span></div>
    </div>
  );
}

/** Fires, temperatures, smoke, sparks, fireballs, firelight. */
export function FireSheet() {
  return (
    <div style={sheetGrid}>
      <SheetCard title="Fires: flame height and flicker">
        <ul style={{ ...sheetList, ...sheetSmall }}>{FIRES.map(f => <li key={f.id}><b>{f.label}</b>: {f.Q < 1 ? `${Math.round(f.Q * 1000)} W` : `${f.Q} kW`}, {f.D} m across → flames about {(f.laminar?.height ?? flameHeight(f.Q, f.D)).toFixed(2)} m, puffing about {flickerHz(f.D).toFixed(1)} Hz. {f.note}</li>)}</ul>
        <span style={sheetSmall}>Flame height: Heskestad 1983, L = 0.235 Q^(2/5) − 1.02 D (turbulent fires); flicker about 1.5/√D Hz (Cetegen & Ahmed 1993).</span>
      </SheetCard>
      <SheetCard title="Flame colour by temperature (blackbody)">
        <FlameColours />
        <ul style={{ ...sheetList, ...sheetSmall }}>{FLAME_TEMPERATURES.map(x => <li key={x.what}><b>{x.what}</b>: {x.kelvin.min}–{x.kelvin.max} K. {x.look}</li>)}</ul>
      </SheetCard>
      <SheetCard title="Smoke and sparks">
        <ul style={{ ...sheetList, ...sheetSmall }}>{[...SMOKE.notes, ...SPARKS.notes].map(n => <li key={n}>{n}</li>)}<li>Plumes widen at about {SMOKE.halfAngle.typical}° each side.</li></ul>
      </SheetCard>
      <SheetCard title="Fireballs and firelight">
        <ul style={{ ...sheetList, ...sheetSmall }}>{[1, 100, 10000].map(M => { const fb = fireball(M); return <li key={M}>{M.toLocaleString("en")} kg of fuel: a fireball about {fb.diameter.toFixed(0)} m across, lasting about {fb.seconds.toFixed(1)} s.</li>; })}{FIRELIGHT.notes.map(n => <li key={n}>{n}</li>)}</ul>
      </SheetCard>
    </div>
  );
}
