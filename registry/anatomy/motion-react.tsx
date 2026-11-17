/**
 * MOTION1 React pieces (pass ANAT1's loaded `HumanBodyModel`):
 * - `GaitStrip`: a chronophotograph — frames of one cycle set along one ground line at the distance the body really
 *   travelled, so planted feet visibly stay put (after Muybridge's plates);
 * - `GaitPlayer`: the cycle played at its real cadence with a tracking camera: the ground marks scroll by and a mark
 *   stays under the planted foot; reduced motion holds a frame (Play to start);
 * - `MotionSheet`: the gaits, their events and sources, and the moods.
 */
import { useEffect, useMemo, useState } from "react";
import type { HumanBody, HumanBodyModel, HumanParams } from "./anatomy-body";
import { createHumanBody } from "./anatomy-body";
import { HumanFigure } from "./anatomy-react";
import { renderHumanFrame } from "./anatomy-view";
import type { HumanFrame } from "./anatomy-view";
import { SheetCard, sheetGrid, sheetList, sheetSmall } from "./foundation-react";
import { GAITS, MOODS, SIT_TO_STAND, gaitCycle } from "./motion-gait";
import type { GaitCycle, MoodId } from "./motion-gait";

const lifted = (pts: Float32Array, dy: number) => { const out = new Float32Array(pts); for (let i = 1; i < out.length; i += 3) out[i] += dy; return out; };

function useCycle(model: HumanBodyModel, params: HumanParams, gait: "walk" | "run", mood: MoodId, frames: number): { body: HumanBody; cycle: GaitCycle } {
  const body = useMemo(() => createHumanBody(model, params), [model, params]);
  const cycle = useMemo(() => gaitCycle(body, gait, { frames, mood }), [body, gait, frames, mood]);
  return { body, cycle };
}

export interface GaitStripProps { model: HumanBodyModel; params?: HumanParams; gait?: "walk" | "run"; mood?: MoodId; frames?: number; height?: number; label?: string }
/** One cycle as a chronophotograph: each frame at its true distance along the ground (side view). */
export function GaitStrip({ model, params = { sex: 0.5, age: 30 }, gait = "walk", mood = "neutral", frames = 10, height = 220, label }: GaitStripProps) {
  const { body, cycle } = useCycle(model, params, gait, mood, frames);
  const ppm = (height - 30) / 2.0, figW = Math.round(ppm * 1.1);
  const shots = useMemo(() => cycle.frames.map(f => renderHumanFrame(body, lifted(f.points, f.root[1]), { yaw: -90 }, { width: figW, height, pixelsPerMetre: ppm, floorY: height - 18 })), [body, cycle, figW, height, ppm]);
  const span = (cycle.frames[cycle.frames.length - 1].root[2] + cycle.stride / frames) * ppm + figW;
  return (
    <div role="img" aria-label={label ?? `${cycle.gait.label}, ${cycle.mood.label.toLowerCase()}: one cycle as a chronophotograph`} style={{ position: "relative", height, width: "100%", overflowX: "auto", overflowY: "hidden", background: "var(--km-surface-subtle, #ece6da)", borderRadius: 6 }}>
      <div style={{ position: "relative", width: span, height }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: height - 18, height: 2, background: "#6d655b" }} />
        {cycle.frames.map((f, k) => (
          <div key={k} style={{ position: "absolute", left: f.root[2] * ppm, top: 0, width: figW, height, opacity: 0.35 + 0.65 * (k / Math.max(1, frames - 1)) }}>
            <HumanFigure frame={shots[k]} surface="tonal" contour label="" aria-hidden="true" />
          </div>
        ))}
      </div>
    </div>
  );
}

export interface GaitPlayerProps { model: HumanBodyModel; params?: HumanParams; gait?: "walk" | "run"; mood?: MoodId; size?: number }
/** The cycle at its real cadence, a tracking camera, scrolling ground marks and a mark under the planted foot. */
export function GaitPlayer({ model, params = { sex: 0.5, age: 30 }, gait = "walk", mood = "neutral", size = 300 }: GaitPlayerProps) {
  const n = 32, { body, cycle } = useCycle(model, params, gait, mood, n);
  const ppm = (size - 40) / 2.0;
  const shots = useMemo<HumanFrame[]>(() => cycle.frames.map(f => renderHumanFrame(body, lifted(f.points, f.root[1]), { yaw: -90 }, { width: size, height: size, pixelsPerMetre: ppm, floorY: size - 24 })), [body, cycle, size, ppm]);
  const [k, setK] = useState(0), [playing, setPlaying] = useState(() => !(typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches));
  useEffect(() => {
    if (!playing) return;
    let raf = 0, start = 0;
    const tick = (now: number) => { if (!start) start = now; setK(Math.floor((((now - start) / 1000) / cycle.seconds) * n) % n); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, cycle.seconds]);
  const f = cycle.frames[k], scroll = f.root[2] * ppm;
  return (
    <div style={{ display: "grid", gap: 6, justifyItems: "start" }}>
      <div style={{ position: "relative", width: size, height: size, overflow: "hidden", background: "var(--km-surface-subtle, #ece6da)", borderRadius: 6 }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: size - 24, height: 2, background: "#6d655b" }} />
        {Array.from({ length: 16 }, (_, i) => { const x = ((i * 0.25 * ppm - scroll) % (4 * ppm) + 4 * ppm) % (4 * ppm) - ppm; return <div key={i} style={{ position: "absolute", left: x, top: size - 22, width: 2, height: 8, background: "#9b9184" }} />; })}
        {f.contact ? <div aria-hidden="true" style={{ position: "absolute", left: size / 2 + (f.contact[2] - f.root[2]) * ppm - 7, top: size - 27, width: 14, height: 6, borderRadius: 3, background: "#c2413a", opacity: 0.8 }} /> : null}
        <div style={{ position: "absolute", inset: 0 }}><HumanFigure frame={shots[k]} surface="tonal" contour label={`${cycle.gait.label}, ${cycle.mood.label.toLowerCase()}, frame ${k + 1} of ${n}`} /></div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", ...sheetSmall }}>
        <button type="button" onClick={() => setPlaying(p => !p)} aria-pressed={playing} style={{ minHeight: 32, padding: "4px 10px", borderRadius: 6, border: "1px solid #797776", background: "#fff", font: "13px system-ui" }}>{playing ? "Pause" : "Play"}</button>
        <span>{(cycle.stride / cycle.seconds).toFixed(2)} m/s · stride {cycle.stride.toFixed(2)} m · {Math.round(120 / cycle.seconds)} steps/min · {f.stance === "flight" ? "both feet off the ground" : `${f.stance === "L" ? "left" : "right"} foot planted`}</span>
      </div>
    </div>
  );
}

/** The gaits with their events and sources, the moods, sit-to-stand. */
export function MotionSheet() {
  return (
    <div style={sheetGrid}>
      {Object.values(GAITS).map(g => (
        <SheetCard key={g.id} title={`${g.label}: ${g.speed.typical} m/s, ${g.cadence.typical} steps/min`}>
          <ul style={{ ...sheetList, ...sheetSmall }}>{g.events.map(e => <li key={e}>{e}</li>)}</ul>
          <span style={sheetSmall}>Stance {Math.round(g.stance * 100)}% of the cycle{g.id === "run" ? " (then flight)" : " (double support twice)"}. {g.sources.join("; ")}. Curves: published shapes as keyframes (values approximate).</span>
        </SheetCard>
      ))}
      <SheetCard title="Emotion in a walk">
        <ul style={{ ...sheetList, ...sheetSmall }}>{MOODS.map(m => <li key={m.id}><b>{m.label}</b>: {m.note}</li>)}</ul>
        <span style={sheetSmall}>Roether et al. 2009 (J Vis 9(6):15); Montepare et al. 1987. Directions reported, sizes estimated.</span>
      </SheetCard>
      <SheetCard title="Sit to stand (Schenkman et al. 1990)">
        <ul style={{ ...sheetList, ...sheetSmall }}>{SIT_TO_STAND.map(s => <li key={s.at}>{Math.round(s.at * 100)}%: {s.label}</li>)}</ul>
      </SheetCard>
    </div>
  );
}
