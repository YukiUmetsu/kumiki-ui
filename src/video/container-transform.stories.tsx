import { useEffect, useMemo, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { compileFilm } from "../../registry/video/film-document";
import type { FilmDocument } from "../../registry/video/film-document";
import { FilmStage } from "../../registry/video/film-stage";
import example from "../../examples/film/container-transform.film.json";

const FPS = 30;
type Mode = "container" | "dissolve" | "reduced";
const MODES: Record<Mode, string> = { container: "Container transform", dissolve: "Plain dissolve", reduced: "Reduced motion" };
/** The example as authored, or with its container transform swapped for a dissolve of the same length, for comparison. */
const film = (mode: Mode) => {
  const doc = example as unknown as FilmDocument;
  const scenes = mode === "dissolve" ? doc.scenes.map(scene => scene.transition?.kind === "container" ? { ...scene, transition: { kind: "dissolve" as const, durationFrames: scene.transition.durationFrames } } : scene) : doc.scenes;
  const result = compileFilm({ ...doc, scenes } as FilmDocument, { outputId: "draft" });
  if (!result.ok) throw new Error(result.diagnostics.map(item => item.message).join("\n"));
  return result.film;
};

function Player() {
  const [mode, setMode] = useState<Mode>("container"), compiled = useMemo(() => film(mode), [mode]);
  const boundary = compiled.cut.transitions[0].startFrame, frames = compiled.durationFrames;
  const [frame, setFrame] = useState(boundary - 30), [playing, setPlaying] = useState(false), clock = useRef({ from: 0, at: 0 });
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
  const seek = (to: number) => { setPlaying(false); setFrame(to); };
  const button = { font: "600 13px system-ui", padding: "6px 10px", borderRadius: 6, border: "1px solid #2b3442", background: "#151b23", color: "#c9ced6", cursor: "pointer" } as const;
  return <div style={{ display: "grid", gap: 12, padding: 16, background: "#0b0d10", color: "#e8ecf2", font: "14px system-ui", minHeight: "100vh", alignContent: "start" }}>
    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <button type="button" onClick={() => { if (frame >= frames - 1) setFrame(0); setPlaying(p => !p); }} style={{ ...button, background: "#7cc6ff", color: "#06121f", border: 0, padding: "8px 16px", fontSize: 14 }}>{playing ? "Pause" : "Play"}</button>
      <input type="range" min={0} max={frames - 1} value={frame} onChange={event => seek(Number(event.target.value))} aria-label="Film frame" style={{ width: 340 }} />
      <span style={{ font: "600 13px ui-monospace, monospace", color: "#9aa4b2" }}>{(frame / FPS).toFixed(1)} s</span>
      <button type="button" onClick={() => { setFrame(boundary - 20); setPlaying(true); }} style={button}>Play the transition</button>
      <label style={{ display: "flex", gap: 6, alignItems: "center", color: "#9aa4b2" }}>Transition
        <select value={mode} onChange={event => setMode(event.target.value as Mode)} style={{ ...button, padding: "5px 8px" }}>
          {(Object.keys(MODES) as Mode[]).map(key => <option key={key} value={key}>{MODES[key]}</option>)}
        </select>
      </label>
    </div>
    <div style={{ width: compiled.width, height: compiled.height, borderRadius: 8, overflow: "hidden" }}>
      <FilmStage film={compiled} frame={frame} renderObject={() => null} reducedMotion={mode === "reduced"} />
    </div>
    <p style={{ margin: 0, maxWidth: compiled.width, color: "#9aa4b2", font: "13px/1.5 system-ui" }}>
      The second row of the contents lifts off the list as a surface and grows to fill the frame, carrying the chart it names. The viewer sees where the chart came from, so the contents stay a map. Compare it with a plain dissolve of the same length; reduced motion keeps the dissolve.
    </p>
  </div>;
}

const meta: Meta = { title: "Video production/Container Transform", parameters: { layout: "fullscreen" } };
export default meta;

export const RowOpensChart: StoryObj = { render: () => <Player /> };
