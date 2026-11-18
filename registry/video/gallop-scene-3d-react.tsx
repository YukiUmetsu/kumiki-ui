/** React host for `GallopScene`: a full-bleed canvas with horse (coat, size), rider and saddle, camera, motion and
 * sound controls, a free view (drag, wheel or pinch, arrow keys) and a QA readout. */
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent, WheelEvent } from "react";
import { GallopScene } from "./gallop-scene-3d";
import type { GallopSceneOptions, GallopSceneStats } from "./gallop-scene-3d";
import type { ChaseFramingId } from "../motion/chase-camera-three";
import { HORSE_COAT_PRESETS, HORSE_HEIGHT_RANGE, HORSE_SIZES } from "../craft/horse-coat";
import type { HorseSizeId } from "../craft/horse-coat";

export interface GallopScene3DProps extends Omit<GallopSceneOptions, "canvas"> {
  /** Show the QA readout (frame time, draw calls, stirrup, leg and hoof error, audio lateness). Default true. */
  showStats?: boolean;
  /** Called once the scene is built (for capture and tests). */
  onReady?: (scene: GallopScene) => void;
  className?: string;
  style?: CSSProperties;
}

const FRAMINGS: ReadonlyArray<[ChaseFramingId, string]> = [["chase", "Chase"], ["tracking", "Tracking"], ["front", "Front"], ["hoof", "Hooves"]];
const SIZES: ReadonlyArray<[HorseSizeId, string]> = [["small", "Small"], ["medium", "Medium"], ["large", "Large"]];
const font = "var(--km-font-sans, system-ui, sans-serif)";
const panel: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", padding: "10px 12px", borderRadius: 12, pointerEvents: "auto",
  background: "rgba(18, 14, 11, .66)", color: "#f3ece4", backdropFilter: "blur(6px)", font: `500 14px/1.3 ${font}`, maxWidth: "100%" };
const button = (active: boolean, disabled = false): CSSProperties => ({ minHeight: 36, padding: "6px 14px", borderRadius: 999, cursor: disabled ? "not-allowed" : "pointer",
  font: `600 14px ${font}`, opacity: disabled ? .5 : 1, color: "inherit",
  border: `1px solid ${active ? "#f0c48a" : "rgba(255,255,255,.28)"}`, background: active ? "rgba(240,196,138,.22)" : "transparent" });
const select: CSSProperties = { minHeight: 36, padding: "6px 8px", borderRadius: 8, border: "1px solid rgba(255,255,255,.35)", background: "rgba(0,0,0,.35)", color: "inherit", font: `500 14px ${font}`, maxWidth: 220 };
/** Withers height in hands (4 inches) and inches, as horse people write it: 1.52 m → "15.0 hh". */
const hands = (m: number) => { const inches = Math.round(m / .0254); return `${Math.floor(inches / 4)}.${inches % 4} hh`; };

export function GallopScene3D({ showStats = true, onReady, className, style, ...options }: GallopScene3DProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<GallopScene | null>(null);
  const drag = useRef(new Map<number, { x: number; y: number }>());
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [framing, setFraming] = useState<ChaseFramingId>(options.framing ?? "chase");
  const [speed, setSpeed] = useState(options.speed ?? 12.5);
  const [sound, setSound] = useState(false);
  const [running, setRunning] = useState(true);
  const [paused, setPaused] = useState(false);
  const [rider, setRider] = useState(options.rider ?? true);
  const [tack, setTack] = useState(options.tack ?? true);
  const [coat, setCoat] = useState(typeof options.coat === "string" ? options.coat : options.coat?.id ?? "bay");
  const [height, setHeight] = useState(typeof options.size === "number" ? options.size : HORSE_SIZES[options.size ?? "medium"].height);
  const [stats, setStats] = useState<GallopSceneStats | null>(null);
  const { horseUrl, gearUrl, riderUrl, sounds, seed } = options;

  useEffect(() => {
    if (!canvas.current) return;
    let live = true, scene: GallopScene | null = null;
    setState("loading");
    GallopScene.create({ ...options, canvas: canvas.current }).then(s => {
      if (!live) { s.dispose(); return; }
      scene = s; sceneRef.current = s;
      s.start(); setState("ready"); onReady?.(s);
    }).catch(cause => { if (live) { setError(cause instanceof Error ? cause.message : String(cause)); setState("error"); } });
    const resize = new ResizeObserver(() => sceneRef.current?.resize());
    resize.observe(canvas.current);
    const poll = window.setInterval(() => { if (sceneRef.current) setStats(sceneRef.current.stats()); }, 500);
    return () => { live = false; resize.disconnect(); window.clearInterval(poll); scene?.dispose(); sceneRef.current = null; };
    // Rebuild only when the assets change; everything else is a live control.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horseUrl, gearUrl, riderUrl, sounds, seed]);

  const scene = () => sceneRef.current;
  const choose = (id: ChaseFramingId) => { setFraming(id); scene()?.setFraming(id); };
  const changeSpeed = (v: number) => { setSpeed(v); scene()?.setSpeed(v); };
  const toggleSound = async () => { const next = !sound; setSound(next); await scene()?.setAudio(next); };
  const toggleRun = () => { const next = !running; setRunning(next); scene()?.setRunning(next); };
  const togglePause = () => { const next = !paused; setPaused(next); scene()?.setPaused(next); };
  const toggleRider = () => { const next = !rider; setRider(next); scene()?.setRiderVisible(next); };
  const toggleTack = () => {
    const next = !tack; setTack(next); scene()?.setTackVisible(next);
    // The rider needs the saddle; it comes back with it if it was on.
    if (next && rider) scene()?.setRiderVisible(true);
  };
  const changeCoat = (id: string) => { setCoat(id); scene()?.setCoat(id); };
  const changeHeight = (m: number) => { setHeight(m); scene()?.setSize(m); };

  // Free view: drag to turn the camera round the horse, wheel or pinch to zoom, double-click to reset.
  const onPointerDown = (e: PointerEvent<HTMLCanvasElement>) => { e.currentTarget.setPointerCapture(e.pointerId); drag.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); };
  const onPointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    const points = drag.current, last = points.get(e.pointerId);
    if (!last) return;
    if (points.size === 1) scene()?.orbit((e.clientX - last.x) * .006, (e.clientY - last.y) * .005);
    else if (points.size === 2) {
      const other = [...points.entries()].find(([id]) => id !== e.pointerId)![1];
      const before = Math.hypot(last.x - other.x, last.y - other.y), after = Math.hypot(e.clientX - other.x, e.clientY - other.y);
      if (before > 0 && after > 0) scene()?.zoom(before / after);
    }
    points.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };
  const onPointerUp = (e: PointerEvent<HTMLCanvasElement>) => { drag.current.delete(e.pointerId); };
  const onWheel = (e: WheelEvent<HTMLCanvasElement>) => { scene()?.zoom(Math.exp(e.deltaY * .0012)); };
  const onKeyDown = (e: KeyboardEvent<HTMLCanvasElement>) => {
    const s = scene(), step = .08;
    if (!s) return;
    const actions: Record<string, () => void> = {
      ArrowLeft: () => s.orbit(-step, 0), ArrowRight: () => s.orbit(step, 0), ArrowUp: () => s.orbit(0, step), ArrowDown: () => s.orbit(0, -step),
      "+": () => s.zoom(.9), "=": () => s.zoom(.9), "-": () => s.zoom(1.1), "0": () => s.resetView(),
    };
    const act = actions[e.key];
    if (act) { e.preventDefault(); act(); }
  };

  const [lo, hi] = scene()?.speedRange ?? [8.5, 15.5];
  const coats = Object.values(HORSE_COAT_PRESETS);

  return (
    <div className={className} style={{ position: "relative", width: "100%", height: "100%", minHeight: 360, background: "#1b1410", overflow: "hidden", ...style }}>
      <canvas ref={canvas} tabIndex={0} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", touchAction: "none", cursor: "grab" }}
        aria-label="3D view of a horse galloping across open range. Drag or use the arrow keys to turn the camera, scroll or press + and − to zoom, double-click or press 0 to reset."
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onWheel={onWheel}
        onDoubleClick={() => scene()?.resetView()} onKeyDown={onKeyDown} />
      {state !== "ready" && (
        <div role={state === "error" ? "alert" : "status"} style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: state === "error" ? "#ffb39a" : "#e9dccb", font: `500 16px ${font}`, padding: 16, textAlign: "center" }}>
          {state === "error" ? `Could not build the scene: ${error}` : "Loading horse, rider and range…"}
        </div>
      )}
      {state === "ready" && (
        <>
          <div style={{ position: "absolute", left: 16, right: 16, top: 16, display: "flex", flexWrap: "wrap", gap: 12, pointerEvents: "none" }}>
            <div style={panel} role="group" aria-label="Horse">
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                Coat
                <select style={select} value={coat} onChange={e => changeCoat(e.target.value)}>
                  {coats.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </label>
              {SIZES.map(([id, text]) => {
                const active = Math.abs(HORSE_SIZES[id].height - height) < .005;
                return <button key={id} type="button" style={button(active)} aria-pressed={active} title={HORSE_SIZES[id].label} onClick={() => changeHeight(HORSE_SIZES[id].height)}>{text}</button>;
              })}
              <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="range" min={HORSE_HEIGHT_RANGE[0]} max={HORSE_HEIGHT_RANGE[1]} step={.01} value={height} onChange={e => changeHeight(Number(e.target.value))}
                  aria-label="Withers height" aria-valuetext={`${height.toFixed(2)} metres, ${hands(height)}`} />
                <span style={{ minWidth: 104, fontVariantNumeric: "tabular-nums" }}>{height.toFixed(2)} m · {hands(height)}</span>
              </span>
            </div>
            <div style={panel} role="group" aria-label="Rider and tack">
              <button type="button" style={button(tack)} aria-pressed={tack} onClick={toggleTack}>Saddle &amp; bridle</button>
              <button type="button" style={button(rider && tack, !tack)} aria-pressed={rider && tack} aria-disabled={!tack}
                title={tack ? undefined : "The rider needs the saddle"} onClick={() => { if (tack) toggleRider(); }}>Rider</button>
            </div>
          </div>
          <div style={{ position: "absolute", left: 16, right: 16, bottom: 16, display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", alignItems: "end", pointerEvents: "none" }}>
            <div style={{ display: "grid", gap: 8 }}>
              <div style={panel} role="group" aria-label="Camera">
                {FRAMINGS.map(([id, text]) => <button key={id} type="button" style={button(framing === id)} aria-pressed={framing === id} onClick={() => choose(id)}>{text}</button>)}
                <button type="button" style={button(false)} onClick={() => scene()?.resetView()}>Reset view</button>
                <span style={{ font: `500 13px ${font}`, opacity: .85 }}>Drag to turn · scroll to zoom</span>
              </div>
              {showStats && stats && (
                <div style={{ ...panel, font: `500 12px/1.45 ${font}`, display: "grid", gap: 0, fontVariantNumeric: "tabular-nums" }} aria-label="Quality readout">
                  <span>{stats.fps.toFixed(0)} fps · {stats.frameMs.toFixed(1)} ms CPU · {stats.drawCalls} draws · {(stats.triangles / 1e6).toFixed(2)} M tris</span>
                  <span>Boot to stirrup ≤ {stats.stirrupErrorMm.toFixed(1)} mm · leg into saddle ≤ {stats.riderLegMm.toFixed(0)} mm · planted hoof: height ≤ {stats.hoofGroundErrorMm.toFixed(1)} mm, slide ≤ {stats.hoofSlideMm.toFixed(1)} mm</span>
                  <span>Clip rate × {stats.playbackRate.toFixed(2)} · hoofbeats {stats.hits} ({stats.lateHits} late) · sound vs picture {stats.audioSyncMeanMs.toFixed(1)} ms mean, {stats.audioSyncWorstMs.toFixed(1)} ms worst</span>
                </div>
              )}
            </div>
            <div style={panel} role="group" aria-label="Motion and sound">
              <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
                Speed
                <input type="range" min={lo} max={hi} step={.1} value={speed} disabled={!running} onChange={e => changeSpeed(Number(e.target.value))} aria-valuetext={`${speed.toFixed(1)} metres per second`} />
                <span style={{ minWidth: 64, fontVariantNumeric: "tabular-nums" }}>{(speed * 3.6).toFixed(0)} km/h</span>
              </label>
              <button type="button" style={button(!running)} aria-pressed={!running} onClick={toggleRun}>{running ? "Stop" : "Gallop"}</button>
              <button type="button" style={button(paused)} aria-pressed={paused} onClick={togglePause}>{paused ? "Resume" : "Pause"}</button>
              {scene()?.hasAudio && <button type="button" style={button(sound)} aria-pressed={sound} onClick={toggleSound}>{sound ? "Sound on" : "Sound off"}</button>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
