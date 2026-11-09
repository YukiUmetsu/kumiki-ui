import { useEffect, useMemo, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { compileMotionChart } from "../../registry/video/motion-chart";
import type { MotionChartContent } from "../../registry/video/motion-chart";
import { MotionChart } from "../../registry/video/motion-chart-react";
import example from "../../examples/film/motion-chart.film.json";

const FPS = 30, W = 960, H = 540;
const content = (example.scenes[0] as unknown as { content: MotionChartContent }).content, frames = example.scenes[0].durationFrames;

/** Plays a chart on a requestAnimationFrame clock, frame-exact; scrubbing and the jump buttons pause it. */
function Player({ appearance }: { appearance: "dark" | "light" }) {
  const { plan, problems } = useMemo(() => compileMotionChart(content, frames, FPS), []);
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
  const jumps = plan.segments.filter(item => item.kind === "cue").map(item => ({ label: content.events.find(e => e.id === item.event)!.cue, frame: item.start + 12 }));
  const button = { font: "600 13px system-ui", padding: "6px 10px", borderRadius: 6, border: "1px solid #2b3442", background: "#151b23", color: "#c9ced6", cursor: "pointer" } as const;
  return <div style={{ display: "grid", gap: 12, padding: 16, background: "#0b0d10", color: "#e8ecf2", font: "14px system-ui", minHeight: "100vh", alignContent: "start" }}>
    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <button type="button" onClick={() => { if (frame >= frames - 1) setFrame(0); setPlaying(p => !p); }} style={{ ...button, background: "#7cc6ff", color: "#06121f", border: 0, padding: "8px 16px", fontSize: 14 }}>{playing ? "Pause" : "Play"}</button>
      <input type="range" min={0} max={frames - 1} value={frame} onChange={event => seek(Number(event.target.value))} aria-label="Film frame" style={{ width: 380 }} />
      <span style={{ font: "600 13px ui-monospace, monospace", color: "#9aa4b2" }}>{(frame / FPS).toFixed(1)} s / {(frames / FPS).toFixed(0)} s</span>
      <span style={{ color: "#9aa4b2" }}>Jump to:</span>
      {jumps.map(jump => <button key={jump.label} type="button" onClick={() => seek(jump.frame)} style={button}>{jump.label}</button>)}
    </div>
    <MotionChart plan={plan} frame={frame} width={W} height={H} appearance={appearance} style={{ borderRadius: 8 }} />
    <p style={{ margin: 0, maxWidth: W, color: "#9aa4b2", font: "13px/1.5 system-ui" }}>
      Before each change, playback slows to a hold, the cue says what to watch, the other bubbles dim and a ring marks the subject. The change then plays at a third of the speed, leaving a trail, and a note says what it meant. Animated bubble charts are hard to follow unprimed; Rosling's worked because he said what to watch first.
    </p>
  </div>;
}

const meta: Meta = { title: "Video production/Motion Chart", parameters: { layout: "fullscreen" } };
export default meta;

/** Health and wealth of 32 nations, 1950–2020 (Our World in Data, CC BY 4.0), with three cued events: China's famine, South Korea's
 * rise and Botswana's HIV years. */
export const Guided: StoryObj = { render: () => <Player appearance="dark" /> };
/** The same chart on a light page. */
export const Light: StoryObj = { render: () => <Player appearance="light" /> };
