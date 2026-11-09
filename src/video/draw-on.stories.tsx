import { useEffect, useMemo, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { compileDrawOn } from "../../registry/video/draw-on";
import type { DrawOnContent } from "../../registry/video/draw-on";
import { DrawOn } from "../../registry/video/draw-on-react";
import example from "../../examples/film/draw-on.film.json";

const FPS = 30, W = 960, H = 540, scene = example.scenes[0], frames = scene.durationFrames;

function Player({ surface }: { surface: "paper" | "board" }) {
  const content = useMemo(() => ({ ...scene.content, surface, ...surface === "board" ? { strokes: scene.content.strokes.map(stroke => stroke.color === "#2f6fb0" ? { ...stroke, color: "#8cc4ff" } : stroke) } : {} }) as unknown as DrawOnContent, [surface]);
  const { plan, problems } = useMemo(() => compileDrawOn(content, frames, FPS), [content]);
  const [frame, setFrame] = useState(0), [playing, setPlaying] = useState(false), [reduced, setReduced] = useState(false), clock = useRef({ from: 0, at: 0 });
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
  const seek = (to: number) => { setPlaying(false); setFrame(to); };
  const button = { font: "600 13px system-ui", padding: "6px 10px", borderRadius: 6, border: "1px solid #2b3442", background: "#151b23", color: "#c9ced6", cursor: "pointer" } as const;
  return <div style={{ display: "grid", gap: 12, padding: 16, background: "#0b0d10", color: "#e8ecf2", font: "14px system-ui", minHeight: "100vh", alignContent: "start" }}>
    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <button type="button" onClick={() => { if (frame >= frames - 1) setFrame(0); setPlaying(p => !p); }} style={{ ...button, background: "#7cc6ff", color: "#06121f", border: 0, padding: "8px 16px", fontSize: 14 }}>{playing ? "Pause" : "Play"}</button>
      <input type="range" min={0} max={frames - 1} value={frame} onChange={event => seek(Number(event.target.value))} aria-label="Film frame" style={{ width: 340 }} />
      <span style={{ font: "600 13px ui-monospace, monospace", color: "#9aa4b2" }}>{(frame / FPS).toFixed(1)} s</span>
      <label style={{ display: "flex", gap: 6, alignItems: "center", color: "#9aa4b2" }}><input type="checkbox" checked={reduced} onChange={event => setReduced(event.target.checked)} /> Reduced motion</label>
    </div>
    <div style={{ width: W, height: H, borderRadius: 8, overflow: "hidden" }}><DrawOn plan={plan} frame={frame} width={W} height={H} reducedMotion={reduced} /></div>
    <p style={{ margin: 0, maxWidth: W, color: "#9aa4b2", font: "13px/1.5 system-ui" }}>
      One part per beat: the pen draws each piece of the cross-section in turn, a wash blooms in each closed shape once it is drawn, and each label lands when its line is done. The camera stays still; the drawing is the motion.
    </p>
  </div>;
}

const meta: Meta = { title: "Video production/Draw-On", parameters: { layout: "fullscreen" } };
export default meta;

export const Paper: StoryObj = { render: () => <Player surface="paper" /> };
export const Board: StoryObj = { render: () => <Player surface="board" /> };
