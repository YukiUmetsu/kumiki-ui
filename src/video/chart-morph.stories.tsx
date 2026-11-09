import { useEffect, useMemo, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { compileChartMorph } from "../../registry/video/chart-morph";
import type { ChartMorphContent } from "../../registry/video/chart-morph";
import { ChartMorph } from "../../registry/video/chart-morph-react";
import example from "../../examples/film/chart-morph.film.json";

const FPS = 30, W = 960, H = 540;
const content = example.scenes[0].content as unknown as ChartMorphContent, frames = example.scenes[0].durationFrames;
const together: ChartMorphContent = { ...content, states: content.states.map((state, i) => i ? { ...state, together: true } : state) };

/** Plays a morph on a requestAnimationFrame clock; scrubbing and the jump buttons pause it. */
function Player({ source, appearance = "dark" }: { source: ChartMorphContent; appearance?: "dark" | "light" }) {
  const { plan, problems } = useMemo(() => compileChartMorph(source, frames, FPS), [source]);
  const [frame, setFrame] = useState(0), [playing, setPlaying] = useState(false), clock = useRef({ from: 0, at: 0 });
  useEffect(() => {
    if (!playing) return;
    clock.current = { from: performance.now(), at: frame };
    let id = 0;
    const tick = (now: number) => {
      const next = Math.floor(clock.current.at + (now - clock.current.from) / 1000 * FPS);
      if (next >= frames - 1) { setFrame(frames - 1); setPlaying(false); return; }
      setFrame(next); id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [playing]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!plan) return <pre role="alert">{problems.map(item => item.message).join("\n")}</pre>;
  const seek = (to: number) => { setPlaying(false); setFrame(Math.round(to)); };
  const jumps = source.states.slice(1).map((state, k) => ({ label: state.id, frame: plan.stages.find(item => item.to === k + 1 && item.change !== "hold")!.start - 6 }));
  const button = { font: "600 13px system-ui", padding: "6px 10px", borderRadius: 6, border: "1px solid #2b3442", background: "#151b23", color: "#c9ced6", cursor: "pointer" } as const;
  return <div style={{ display: "grid", gap: 12 }}>
    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <button type="button" onClick={() => { if (frame >= frames - 1) setFrame(0); setPlaying(p => !p); }} style={{ ...button, background: "#7cc6ff", color: "#06121f", border: 0, padding: "8px 16px", fontSize: 14 }}>{playing ? "Pause" : "Play"}</button>
      <input type="range" min={0} max={frames - 1} value={frame} onChange={event => seek(Number(event.target.value))} aria-label="Film frame" style={{ width: 340 }} />
      <span style={{ font: "600 13px ui-monospace, monospace", color: "#9aa4b2" }}>{(frame / FPS).toFixed(1)} s</span>
      <span style={{ color: "#9aa4b2" }}>Jump to:</span>
      {jumps.map(jump => <button key={jump.label} type="button" onClick={() => seek(jump.frame)} style={button}>{jump.label}</button>)}
      {problems.filter(item => item.code === "motion-unstaged").length > 0 && <span style={{ color: "#ffc94a", font: "600 13px system-ui" }}>motion-unstaged: changes play together</span>}
    </div>
    <ChartMorph plan={plan} frame={frame} width={W} height={H} appearance={appearance} style={{ borderRadius: 8 }} />
  </div>;
}
const page = { display: "grid", gap: 16, padding: 16, background: "#0b0d10", color: "#e8ecf2", font: "14px system-ui", minHeight: "100vh", alignContent: "start" } as const;
const note = { margin: 0, maxWidth: W, color: "#9aa4b2", font: "13px/1.5 system-ui" } as const;

const meta: Meta = { title: "Video production/Chart Morph", parameters: { layout: "fullscreen" } };
export default meta;

/** Solar's share of electricity, 2015 to 2024 (Ember via Our World in Data, CC BY 4.0). Between states the axis widens first, then the
 * bars grow, then the rows re-sort, then bars become dumbbells: one kind of change at a time, Chile kept in amber throughout. */
export const Staged: StoryObj = { render: () => <div style={page}><Player source={content} />
  <p style={note}>Staged transitions, one kind of change at a time, are easier to follow than everything moving at once (Heer and Robertson, InfoVis 2007). Rows that swap places fade their names while they move; the story's row stays legible.</p></div> };
/** The same data with every change played together, as `motion-unstaged` warns: compare how hard Chile is to follow. */
export const Together: StoryObj = { render: () => <div style={page}><Player source={together} />
  <p style={note}>Axis, values and order all at once: the bars stretch, shrink and swap in one motion, and the eye cannot tell which change did what.</p></div> };
/** On a light page. */
export const Light: StoryObj = { render: () => <div style={{ ...page, background: "#f1efe9" }}><Player source={content} appearance="light" /></div> };
