import { useEffect, useMemo, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { compileTitleSequence } from "../../registry/video/title-sequence";
import type { TitleSequenceContent } from "../../registry/video/title-sequence";
import { TitleSequence } from "../../registry/video/title-sequence-react";
import example from "../../examples/film/title-sequence.film.json";

const FPS = 30, W = 960, H = 540, scene = example.scenes[0], frames = scene.durationFrames;

function Player({ cadence }: { cadence: 1 | 2 }) {
  const content = useMemo(() => ({ ...scene.content, cadence }) as unknown as TitleSequenceContent, [cadence]);
  const { plan, problems } = useMemo(() => compileTitleSequence(content, frames, FPS), [content]);
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
  const button = { font: "600 13px system-ui", padding: "6px 10px", borderRadius: 6, border: "1px solid #2b3442", background: "#151b23", color: "#c9ced6", cursor: "pointer" } as const;
  return <div style={{ display: "grid", gap: 12, padding: 16, background: "#0b0d10", color: "#e8ecf2", font: "14px system-ui", minHeight: "100vh", alignContent: "start" }}>
    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <button type="button" onClick={() => { if (frame >= frames - 1) setFrame(0); setPlaying(p => !p); }} style={{ ...button, background: "#7cc6ff", color: "#06121f", border: 0, padding: "8px 16px", fontSize: 14 }}>{playing ? "Pause" : "Play"}</button>
      <input type="range" min={0} max={frames - 1} value={frame} onChange={event => { setPlaying(false); setFrame(Number(event.target.value)); }} aria-label="Film frame" style={{ width: 340 }} />
      <span style={{ font: "600 13px ui-monospace, monospace", color: "#9aa4b2" }}>{(frame / FPS).toFixed(1)} s</span>
    </div>
    <div style={{ width: W, height: H, borderRadius: 8, overflow: "hidden" }}><TitleSequence plan={plan} frame={frame} width={W} height={H} /></div>
    <p style={{ margin: 0, maxWidth: W, color: "#9aa4b2", font: "13px/1.5 system-ui" }}>
      One symbol for the film, in cut paper: a cliff, the river spilling over it, the pool below and a sun, each piece arriving and settling with its shadow, then the title laid in word by word. {cadence === 2 ? "On twos, as stop motion is: twelve drawings a second." : "On ones, smooth, for comparison."}
    </p>
  </div>;
}

const meta: Meta = { title: "Video production/Title Sequence", parameters: { layout: "fullscreen" } };
export default meta;

export const CutPaper: StoryObj = { render: () => <Player cadence={2} /> };
export const Smooth: StoryObj = { render: () => <Player cadence={1} /> };
