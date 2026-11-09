import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { compileSpeed, speedOutput } from "../../registry/video/film-speed";
import type { FilmSpeed } from "../../registry/video/film-speed";
import { compileFilm } from "../../registry/video/film-document";
import type { CompiledFilm, FilmDocument } from "../../registry/video/film-document";
import { FilmStage } from "../../registry/video/film-stage";
import { createShot3dRenderer } from "../../registry/video/film-3d-react";
import example from "../../examples/film/speed-ramp-3d.film.json";
import { RACE_CARS, RACE_TRACK } from "./race-assets";

/** One renderer per car: the example's car, or one of your own from local-assets/vehicles. */
const renderers = new Map<string, ReturnType<typeof createShot3dRenderer>>();
const rendererFor = (car: string) => {
  if (!renderers.has(car)) renderers.set(car, createShot3dRenderer({ race: { car: RACE_CARS[car] ?? RACE_CARS["concept-car"], cars: RACE_CARS, track: RACE_TRACK } }));
  return renderers.get(car)!;
};
const W = 640, H = 360;
/** The same film with every ramp taken out: the same content in the same length, at an even speed. */
const evenCopy = (doc: FilmDocument): FilmDocument => ({ ...doc, id: doc.id + "-even", scenes: doc.scenes.map(scene => scene.speed ? { ...scene, speed: { source: scene.speed.source } } : scene) as FilmDocument["scenes"] });
// Compiled for the panel's own size: a CSS scale would make the 3D canvas measure itself small and render small.
const compiled = (doc: FilmDocument) => { const result = compileFilm({ ...doc, outputs: [{ id: "panel", width: W, height: H }] }, { outputId: "panel" }); if (!result.ok) throw new Error(result.diagnostics.map(d => d.message).join("\n")); return result.film; };

/** Content frames per film frame for a scene at a film frame: 1 is natural speed. */
function speedAt(film: CompiledFilm, frame: number): { scene: string; speed: number; hold: boolean } {
  const scene = film.scenes.find(item => frame >= item.startFrame && frame < item.endFrame) ?? film.scenes[film.scenes.length - 1], local = frame - scene.startFrame;
  if (!scene.speed) return { scene: scene.id, speed: 1, hold: false };
  const map = scene.speed.map, i = Math.min(map.length - 2, Math.max(0, Math.floor(local)));
  return { scene: scene.id, speed: map[i + 1] - map[i], hold: scene.speed.holds.some(h => local >= h.start && local < h.end) };
}
/** The film's timeline: scenes, holds shaded, ramps into and out of cuts marked, and the playhead. */
function Timeline({ film, frame, onSeek }: { film: CompiledFilm; frame: number; onSeek: (frame: number) => void }) {
  const x = (f: number) => f / film.durationFrames * W;
  // A tick for every 6 frames of content, placed where the film reaches it: close together where the content races, far apart where it holds.
  const ticks = film.scenes.flatMap(scene => {
    const length = scene.speed ? Math.round(scene.speed.map[scene.speed.map.length - 1]) : scene.endFrame - scene.startFrame;
    return Array.from({ length: Math.floor(length / 6) + 1 }, (_, k) => scene.startFrame + (scene.speed ? speedOutput(scene.speed, k * 6) : k * 6 * (scene.endFrame - scene.startFrame) / length));
  });
  return <svg width={W} height={48} style={{ display: "block", cursor: "pointer" }} onPointerDown={event => { const r = event.currentTarget.getBoundingClientRect(); onSeek(Math.round((event.clientX - r.left) / W * (film.durationFrames - 1))); }}
    role="slider" aria-label="Film frame" aria-valuemin={0} aria-valuemax={film.durationFrames - 1} aria-valuenow={frame}>
    {film.scenes.map((scene, i) => {
      const speed = film.scenes[i].speed, source = (example.scenes[i] as { speed?: FilmSpeed }).speed;
      return <g key={scene.id}>
        <rect x={x(scene.startFrame) + 1} y={6} width={x(scene.endFrame) - x(scene.startFrame) - 2} height={18} rx={4} fill="#1d2430" />
        {speed?.holds.map((hold, h) => <rect key={h} x={x(scene.startFrame + hold.start)} y={6} width={x(hold.end - hold.start)} height={18} rx={3} fill="rgba(124,198,255,.38)" />)}
        {speed && source?.enter ? <rect x={x(scene.startFrame)} y={6} width={x(source.enter)} height={18} fill="rgba(255,201,74,.45)" /> : null}
        {speed && source?.exit ? <rect x={x(scene.endFrame - source.exit)} y={6} width={x(source.exit)} height={18} fill="rgba(255,201,74,.45)" /> : null}
        <text x={x(scene.startFrame) + 8} y={19} fill="#c9ced6" fontSize={11} fontWeight={600}>{scene.id}</text>
      </g>;
    })}
    {ticks.map((t, k) => <rect key={k} x={x(t)} y={30} width={1} height={10} fill="#8592a3" />)}
    <text x={W} y={47} fill="#6b7686" fontSize={9} textAnchor="end">content time: a tick per 6 frames</text>
    <rect x={x(frame) - 1} y={2} width={2} height={40} fill="#fff" />
  </svg>;
}

function Panel({ film, frame, title, note, onSeek, car }: { film: CompiledFilm; frame: number; title: string; note: string; onSeek: (frame: number) => void; car: string }) {
  const now = speedAt(film, frame);
  return <figure style={{ margin: 0, display: "grid", gap: 6 }}>
    <figcaption style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", color: "#e8ecf2", font: "650 15px system-ui" }}>
      <span>{title}</span>
      <span style={{ font: "600 13px ui-monospace, monospace", color: now.hold ? "#7cc6ff" : now.speed > 1.5 ? "#ffc94a" : "#c9ced6" }}>
        {now.hold ? "HOLD " : ""}{now.speed.toFixed(2)}×
      </span>
    </figcaption>
    <div style={{ width: W, height: H, overflow: "hidden", borderRadius: 8, background: "#000" }}>
      <Suspense fallback={null}><FilmStage film={film} frame={frame} renderObject={() => null} renderShot3d={rendererFor(car)} reducedMotion={false} /></Suspense>
    </div>
    <Timeline film={film} frame={frame} onSeek={onSeek} />
    <p style={{ margin: 0, color: "#9aa4b2", font: "13px/1.45 system-ui", maxWidth: W }}>{note}</p>
  </figure>;
}

/** Plays two films on one clock, frame for frame. */
function useClock(durationFrames: number, fps = 30) {
  const [frame, setFrame] = useState(0), [playing, setPlaying] = useState(false), clock = useRef({ from: 0, at: 0 });
  useEffect(() => {
    if (!playing) return;
    clock.current = { from: performance.now(), at: frame };
    let id = 0;
    const tick = (now: number) => { setFrame(Math.floor(clock.current.at + (now - clock.current.from) / 1000 * fps) % durationFrames); id = requestAnimationFrame(tick); };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [playing]); // eslint-disable-line react-hooks/exhaustive-deps
  return { frame, setFrame: (f: number) => { setPlaying(false); setFrame(f); }, playing, toggle: () => setPlaying(p => !p) };
}

const meta: Meta = { title: "Video production/Speed Ramp", parameters: { layout: "fullscreen" } };
export default meta;

/** The same two race shots, the same content, the same length: on the left with speed ramps, on the right at an even speed. Play
 * them together. The ramped pass races in, slows almost to a stop as the car passes the lens (the wheels sharpen out of their motion
 * blur), then races away into a whip; the follow shot comes out of the cut fast. The even version spends the same time evenly. */
export const Compare: StoryObj<{ frame: number; car: string }> = {
  args: { frame: 40, car: "concept-car" },
  argTypes: { car: { control: "select", options: Object.keys(RACE_CARS), description: "Cars from local-assets/vehicles are yours, for local renders only." } },
  render: function Compare({ frame: start, car }) {
    const ramped = useMemo(() => compiled(example as unknown as FilmDocument), []), even = useMemo(() => compiled(evenCopy(example as unknown as FilmDocument)), []);
    const { frame, setFrame, playing, toggle } = useClock(ramped.durationFrames);
    useEffect(() => setFrame(start), [start]); // eslint-disable-line react-hooks/exhaustive-deps
    const jump = (scene: string, cue: string) => { const target = ramped.scenes.find(s => s.id === scene)?.cues.find(c => c.id === cue); if (target) setFrame(target.frame); };
    return <div style={{ background: "#0b0d10", padding: 16, display: "grid", gap: 14, font: "14px system-ui", color: "#e8ecf2" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" onClick={toggle} style={{ font: "650 14px system-ui", padding: "8px 16px", borderRadius: 8, border: 0, background: "#7cc6ff", color: "#06121f" }}>{playing ? "Pause" : "Play both"}</button>
        <input type="range" min={0} max={ramped.durationFrames - 1} value={frame} onChange={event => setFrame(Number(event.target.value))} aria-label="Film frame" style={{ width: 420 }} />
        <span style={{ font: "600 13px ui-monospace, monospace", color: "#9aa4b2" }}>frame {frame} / {ramped.durationFrames}</span>
        <span style={{ color: "#9aa4b2" }}>Jump to:</span>
        {[["pass", "pass", "the pass"], ["follow", "start", "out of the whip"], ["follow", "title", "the claim"]].map(([scene, cue, label]) =>
          <button key={cue} type="button" onClick={() => jump(scene, cue)} style={{ font: "600 13px system-ui", padding: "6px 10px", borderRadius: 6, border: "1px solid #2b3442", background: "#151b23", color: "#c9ced6" }}>{label}</button>)}
      </div>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        <Panel film={ramped} frame={frame} title="Ramped" onSeek={setFrame} car={car}
          note="Fast approach, then near-still for 1.5 s as the car passes the lens (blue); the wheels come out of their blur. It races away faster into the whip (yellow), and the follow shot comes out of the cut fast." />
        <Panel film={even} frame={frame} title="Even speed, same length" onSeek={setFrame} car={car}
          note="The same content in the same frames at one speed: the car is past the lens before you can look at it." />
      </div>
    </div>;
  },
};

/** A time map drawn as a curve: film frames across, content frames up. Holds are shaded; the yellow band is the speed. */
function SpeedGraph({ title, speed, durationFrames, width = 560, height = 260 }: { title: string; speed: FilmSpeed; durationFrames: number; width?: number; height?: number }) {
  const { speed: plan, problems } = compileSpeed(speed, durationFrames, 30, () => undefined);
  if (!plan) return <pre style={{ color: "#f88" }}>{problems.map(p => p.message).join("\n")}</pre>;
  const pad = 36, w = width - pad * 2, h = height - pad * 2 - 60, S = speed.source;
  const x = (f: number) => pad + f / durationFrames * w, y = (c: number) => pad + h - c / S * h;
  const curve = plan.map.map((c, f) => `${f ? "L" : "M"}${x(f).toFixed(1)},${y(c).toFixed(1)}`).join(" ");
  const speeds = plan.map.slice(1).map((c, f) => c - plan.map[f]), top = Math.max(...speeds);
  const band = speeds.map((v, f) => `${f ? "L" : "M"}${x(f + .5).toFixed(1)},${(height - pad - v / top * 44).toFixed(1)}`).join(" ");
  return <figure style={{ margin: 0 }}>
    <svg width={width} height={height} role="img" aria-label={`${title}: content frame against film frame`} style={{ background: "#11151b", borderRadius: 8 }}>
      {plan.holds.map((hold, i) => <rect key={i} x={x(hold.start)} y={pad} width={x(hold.end) - x(hold.start)} height={height - pad * 2} fill="rgba(124,198,255,.12)" />)}
      <path d={`M${x(0)},${y(0)} L${x(durationFrames)},${y(S)}`} stroke="rgba(255,255,255,.18)" strokeDasharray="4 4" fill="none" />
      <path d={curve} stroke="#7cc6ff" strokeWidth={2.5} fill="none" />
      <path d={band} stroke="#ffc94a" strokeWidth={1.5} fill="none" />
      <text x={pad} y={22} fill="#e8ecf2" fontSize={13} fontWeight={650}>{title}</text>
      <text x={width - pad} y={22} fill="#9aa4b2" fontSize={12} textAnchor="end">{plan.rate.toFixed(2)}× outside holds · {S} → {durationFrames} frames</text>
    </svg>
  </figure>;
}
/** How each ramp is solved: content frame against film frame, with holds shaded and the speed beneath. */
export const Graphs: StoryObj = {
  render: () => {
    // The example's holds as the film resolved them: a named moment becomes its content frame.
    const film = compiled(example as unknown as FilmDocument);
    return <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 560px)", gap: 16, padding: 16, background: "#0b0d10" }}>
      <SpeedGraph title="Ramp and hold" speed={{ source: 150, holds: [{ at: 75, frames: 45 }] }} durationFrames={96} />
      <SpeedGraph title="Ramp into and out of a cut" speed={{ source: 150, enter: 12, exit: 12 }} durationFrames={120} />
      {example.scenes.map((scene, i) => scene.speed && <SpeedGraph key={scene.id} title={`speed-ramp-3d: ${scene.id}`}
        speed={{ ...scene.speed, holds: scene.speed.holds?.map((h, k) => ({ ...h, at: film.scenes[i].speed?.holds[k]?.at ?? 0 })) } as FilmSpeed} durationFrames={scene.durationFrames} />)}
    </div>;
  },
};
