import { useEffect, useMemo, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { compileAnnotate } from "../../registry/video/annotate";
import type { AnnotateContent } from "../../registry/video/annotate";
import { Annotate } from "../../registry/video/annotate-react";
import example from "../../examples/film/annotate.film.json";
import dynjandi from "../../examples/film/assets/iceland-large/dynjandi.jpg?url";

const FPS = 30, scene = example.scenes[0], frames = scene.durationFrames;
const content = { ...scene.content, image: { ...scene.content.image, src: dynjandi } } as AnnotateContent;
const SIZES = { landscape: { width: 960, height: 540 }, vertical: { width: 360, height: 640 } } as const;

/** The example on a requestAnimationFrame clock; scrubbing and the jump buttons pause it. */
function Player() {
  const { plan, problems } = useMemo(() => compileAnnotate(content, frames, FPS), []);
  const [frame, setFrame] = useState(0), [playing, setPlaying] = useState(false), [size, setSize] = useState<keyof typeof SIZES>("landscape"), [reduced, setReduced] = useState(false), clock = useRef({ from: 0, at: 0 });
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
      <input type="range" min={0} max={frames - 1} value={frame} onChange={event => seek(Number(event.target.value))} aria-label="Film frame" style={{ width: 300 }} />
      <span style={{ font: "600 13px ui-monospace, monospace", color: "#9aa4b2" }}>{(frame / FPS).toFixed(1)} s</span>
      <span style={{ color: "#9aa4b2" }}>Jump to:</span>
      {plan.marks.map(mark => <button key={mark.id} type="button" onClick={() => seek(mark.noteIn + 12)} style={button}>{mark.id}</button>)}
      <select value={size} onChange={event => setSize(event.target.value as keyof typeof SIZES)} aria-label="Output shape" style={{ ...button, padding: "5px 8px" }}>
        <option value="landscape">Landscape 16:9</option><option value="vertical">Vertical 9:16</option>
      </select>
      <label style={{ display: "flex", gap: 6, alignItems: "center", color: "#9aa4b2" }}><input type="checkbox" checked={reduced} onChange={event => setReduced(event.target.checked)} /> Reduced motion</label>
    </div>
    <div style={{ width: SIZES[size].width, height: SIZES[size].height, borderRadius: 8, overflow: "hidden" }}>
      <Annotate plan={plan} frame={frame} {...SIZES[size]} reducedMotion={reduced} />
    </div>
    <p style={{ margin: 0, maxWidth: 960, color: "#9aa4b2", font: "13px/1.5 system-ui" }}>
      One picture, one thesis: the camera stops on each detail, a pen marks it and the rest of the frame dims, so the eye goes where the argument is. Each note sits on the side with room at this output size; in a vertical frame the camera aims at the marks. Photograph: Dynjandi, CC0, Wikimedia Commons.
    </p>
  </div>;
}

const meta: Meta = { title: "Video production/Annotated Footage", parameters: { layout: "fullscreen" } };
export default meta;

export const BiggerThanItLooks: StoryObj = { render: () => <Player /> };
