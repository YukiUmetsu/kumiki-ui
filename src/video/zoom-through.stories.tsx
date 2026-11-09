import { useEffect, useMemo, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { compileFilm } from "../../registry/video/film-document";
import type { FilmDocument, FilmTransition } from "../../registry/video/film-document";
import { FilmStage } from "../../registry/video/film-stage";
import example from "../../examples/film/zoom-through.film.json";
import iceCave from "../../examples/film/assets/iceland-large/ice-cave.jpg?url";
import dynjandi from "../../examples/film/assets/iceland-large/dynjandi.jpg?url";

const FPS = 30, IMAGES: Record<string, string> = { "ice-cave": iceCave, dynjandi };
type Mode = "soft" | "hard" | "dissolve";
const MODES: Record<Mode, string> = { soft: "Zoom, soft edge", hard: "Zoom, hard edge", dissolve: "Plain dissolve" };
/** The example with its pictures served by Storybook, and its zoom's edge swapped, or the zoom replaced by a dissolve of the same length. */
const film = (mode: Mode) => {
  const doc = example as unknown as FilmDocument;
  const scenes = doc.scenes.map(scene => {
    const content = scene.recipeId === "annotate" ? { ...scene.content, image: { ...scene.content.image, src: IMAGES[scene.content.image.id] } } : scene.content;
    const transition: FilmTransition | undefined = scene.transition && (mode === "dissolve" ? { kind: "dissolve", durationFrames: scene.transition.durationFrames } : { ...scene.transition, edge: mode });
    return { ...scene, content, transition };
  }) as FilmDocument["scenes"];
  const result = compileFilm({ ...doc, scenes }, { outputId: "draft" });
  if (!result.ok) throw new Error(result.diagnostics.map(item => item.message).join("\n"));
  return result.film;
};

/** From inside an ice cave, the camera pushes into a wall glowing with daylight and comes out at a waterfall. */
export const ThroughTheIce: StoryObj = {
  render: function ThroughTheIce() {
    const [mode, setMode] = useState<Mode>("soft"), compiled = useMemo(() => film(mode), [mode]), frames = compiled.durationFrames;
    const start = compiled.cut.transitions[0].startFrame, [frame, setFrame] = useState(start - 40), [playing, setPlaying] = useState(false), clock = useRef({ from: 0, at: 0 });
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
    const button = { font: "600 13px system-ui", padding: "6px 10px", borderRadius: 6, border: "1px solid #2b3442", background: "#151b23", color: "#c9ced6", cursor: "pointer" } as const;
    return <div style={{ display: "grid", gap: 12, padding: 16, background: "#0b0d10", color: "#e8ecf2", font: "14px system-ui", minHeight: "100vh", alignContent: "start" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" onClick={() => { if (frame >= frames - 1) setFrame(0); setPlaying(p => !p); }} style={{ ...button, background: "#7cc6ff", color: "#06121f", border: 0, padding: "8px 16px", fontSize: 14 }}>{playing ? "Pause" : "Play"}</button>
        <input type="range" min={0} max={frames - 1} value={frame} onChange={event => { setPlaying(false); setFrame(Number(event.target.value)); }} aria-label="Film frame" style={{ width: 300 }} />
        <span style={{ font: "600 13px ui-monospace, monospace", color: "#9aa4b2" }}>{(frame / FPS).toFixed(1)} s</span>
        <button type="button" onClick={() => { setFrame(start - 40); setPlaying(true); }} style={button}>Play the zoom</button>
        <select value={mode} onChange={event => setMode(event.target.value as Mode)} aria-label="Transition" style={{ ...button, padding: "5px 8px" }}>
          {(Object.keys(MODES) as Mode[]).map(key => <option key={key} value={key}>{MODES[key]}</option>)}
        </select>
      </div>
      <div style={{ width: compiled.width, height: compiled.height, borderRadius: 8, overflow: "hidden" }}>
        <FilmStage film={compiled} frame={frame} renderObject={() => null} reducedMotion={false} />
      </div>
      <p style={{ margin: 0, maxWidth: compiled.width, color: "#9aa4b2", font: "13px/1.5 system-ui" }}>
        The camera pushes into the glowing ice, and the waterfall blooms out of the light. A soft edge suits light, water or a glow; a hard edge keeps the next scene inside the region's box, for a screen, a window or a frame. Photographs: CC0, Wikimedia Commons.
      </p>
    </div>;
  },
};

const meta: Meta = { title: "Video production/Zoom Through", parameters: { layout: "fullscreen" } };
export default meta;
