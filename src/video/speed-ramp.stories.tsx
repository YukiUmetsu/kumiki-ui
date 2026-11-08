import type { Meta, StoryObj } from "@storybook/react-vite";
import { compileSpeed, speedSource } from "../../registry/video/film-speed";
import type { FilmSpeed } from "../../registry/video/film-speed";
import { compileFilm } from "../../registry/video/film-document";
import film from "../../examples/film/speed-ramp-3d.film.json";

/** A time map drawn as a curve: output frames across, content frames up. Holds are shaded; the lower band is the speed. */
function SpeedGraph({ title, speed, durationFrames, width = 560, height = 260 }: { title: string; speed: FilmSpeed; durationFrames: number; width?: number; height?: number }) {
  const { speed: compiled, problems } = compileSpeed(speed, durationFrames, 30, () => undefined);
  if (!compiled) return <pre style={{ color: "#f88" }}>{problems.map(p => p.message).join("\n")}</pre>;
  const pad = 36, w = width - pad * 2, h = height - pad * 2 - 60, S = speed.source;
  const x = (f: number) => pad + f / durationFrames * w, y = (c: number) => pad + h - c / S * h;
  const curve = compiled.map.map((c, f) => `${f ? "L" : "M"}${x(f).toFixed(1)},${y(c).toFixed(1)}`).join(" ");
  const even = `M${x(0)},${y(0)} L${x(durationFrames)},${y(S)}`;
  const speeds = compiled.map.slice(1).map((c, f) => c - compiled.map[f]), top = Math.max(...speeds);
  const band = speeds.map((v, f) => `${f ? "L" : "M"}${x(f + .5).toFixed(1)},${(height - pad - v / top * 44).toFixed(1)}`).join(" ");
  return <figure style={{ margin: 0 }}>
    <svg width={width} height={height} role="img" aria-label={`${title}: content frame against film frame`} style={{ background: "#11151b", borderRadius: 8 }}>
      {compiled.holds.map((hold, i) => <rect key={i} x={x(hold.start)} y={pad} width={x(hold.end) - x(hold.start)} height={height - pad * 2} fill="rgba(124,198,255,.12)" />)}
      <path d={even} stroke="rgba(255,255,255,.18)" strokeDasharray="4 4" fill="none" />
      <path d={curve} stroke="#7cc6ff" strokeWidth={2.5} fill="none" />
      <path d={band} stroke="#ffc94a" strokeWidth={1.5} fill="none" />
      <text x={pad} y={22} fill="#e8ecf2" fontSize={13} fontWeight={650}>{title}</text>
      <text x={width - pad} y={22} fill="#9aa4b2" fontSize={12} textAnchor="end">{compiled.rate.toFixed(2)}× outside holds · {S} → {durationFrames} frames</text>
      <text x={pad} y={height - 10} fill="#9aa4b2" fontSize={11}>speed</text>
    </svg>
    <figcaption style={{ color: "#9aa4b2", font: "12px system-ui", padding: "4px 2px" }}>Blue: content frame shown at each film frame (dashed: even speed). Shaded: holds. Yellow: speed.</figcaption>
  </figure>;
}
/** A dot crossing the frame, driven through the time map: fast, near-still on the hold, fast again. */
function Dot({ speed, durationFrames, frame }: { speed: FilmSpeed; durationFrames: number; frame: number }) {
  const { speed: compiled } = compileSpeed(speed, durationFrames, 30, () => undefined);
  const t = compiled ? speedSource(compiled, frame) / speed.source : 0;
  return <div style={{ position: "relative", width: 560, height: 60, background: "#11151b", borderRadius: 8 }}>
    <div style={{ position: "absolute", top: 20, left: 20 + t * 500, width: 20, height: 20, borderRadius: 10, background: "#7cc6ff" }} />
  </div>;
}

const meta: Meta = { title: "Video production/Speed Ramp", parameters: { layout: "fullscreen" } };
export default meta;

const HOLD: FilmSpeed = { source: 150, holds: [{ at: 75, frames: 45 }] };
const CUT: FilmSpeed = { source: 150, enter: 12, exit: 12 };
/** Ramp and hold, and ramps into and out of a cut, as time maps; and the example film's two scenes. */
export const Graphs: StoryObj = {
  render: () => {
    const compiled = compileFilm(film);
    return <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 560px)", gap: 16, padding: 16, background: "#0b0d10" }}>
      <SpeedGraph title="Ramp and hold" speed={HOLD} durationFrames={96} />
      <SpeedGraph title="Ramp into and out of a cut" speed={CUT} durationFrames={120} />
      {film.scenes.map(scene => scene.speed && <SpeedGraph key={scene.id} title={`speed-ramp-3d: ${scene.id}`} speed={scene.speed as FilmSpeed} durationFrames={scene.durationFrames} />)}
      <p style={{ color: "#c9ced6", font: "13px system-ui", gridColumn: "1 / -1" }}>{compiled.ok ? `The example compiles: ${compiled.film.scenes.map(s => `${s.id} at ${s.speed?.rate.toFixed(2)}×`).join(", ")}.` : "The example has problems."}</p>
    </div>;
  },
};
/** Scrub to feel the ramp: the dot is fast, almost still through the hold, then fast again. */
export const Feel: StoryObj<{ frame: number }> = {
  args: { frame: 30 },
  argTypes: { frame: { control: { type: "range", min: 0, max: 96 } } },
  render: ({ frame }) => <div style={{ padding: 16, background: "#0b0d10", display: "grid", gap: 8 }}>
    <Dot speed={HOLD} durationFrames={96} frame={frame} />
    <Dot speed={{ source: 150 }} durationFrames={96} frame={frame} />
  </div>,
};
