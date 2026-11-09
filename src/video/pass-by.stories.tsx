import { useEffect, useMemo, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { compileFilm } from "../../registry/video/film-document";
import type { CompiledFilm, FilmDocument, FilmTransition } from "../../registry/video/film-document";
import { FilmStage } from "../../registry/video/film-stage";
import { RayWorldStage } from "../../registry/video/ray-world-react";
import { riverFlightWorld } from "../../registry/video/ray-world-river-flight";
import { RAY_WORLD_TEXTURES } from "../film/ray-world-textures";
import example from "../../examples/film/pass-by.film.json";
import seljalandsfoss from "../../examples/film/assets/iceland-large/seljalandsfoss.jpg?url";

const W = 640, H = 360, FPS = 30;
type Mode = "pass-by" | "cut" | "dissolve";
const MODES: Record<Mode, string> = { "pass-by": "Pass-by", cut: "Hard cut", dissolve: "Dissolve" };
/** The example with its images served by Storybook, and its pass-by swapped for a cut or a dissolve of the same length, to compare. */
const compiled = (mode: Mode): CompiledFilm => {
  const doc = example as unknown as FilmDocument;
  const scenes = doc.scenes.map(scene => {
    const images = scene.recipeId === "ray-world" ? { content: { ...scene.content, images: scene.content.images?.map(image => ({ ...image, src: seljalandsfoss })) } } : {};
    const transition: FilmTransition | undefined = scene.transition && mode !== "pass-by" ? { kind: mode, durationFrames: mode === "cut" ? 0 : scene.transition.durationFrames } : scene.transition;
    return { ...scene, ...images, transition };
  }) as FilmDocument["scenes"];
  const result = compileFilm({ ...doc, scenes, outputs: [{ id: "panel", width: W, height: H }] }, { outputId: "panel" });
  if (!result.ok) throw new Error(result.diagnostics.map(item => item.message).join("\n"));
  return result.film;
};
const FILMS = { "pass-by": compiled("pass-by"), cut: compiled("cut"), dissolve: compiled("dissolve") };

/** A flight up a river valley, then a waterfall, joined behind something close to the lens so the two read as one take. Slow it down
 * to see the seam stay behind the foreground's centre while both places drift the same way. */
export const ValleyToWaterfall: StoryObj = {
  render: function ValleyToWaterfall() {
    const [mode, setMode] = useState<Mode>("pass-by"), [slow, setSlow] = useState(false), film = FILMS[mode];
    const boundary = film.scenes[1].startFrame, [frame, setFrame] = useState(boundary - 30), [playing, setPlaying] = useState(false), clock = useRef({ from: 0, at: 0 });
    const world = useMemo(() => (content: { images?: readonly { id: string; src: string; alt: string; width?: number; height?: number }[]; samples?: number; label: string }, context: { frame: number; fps: CompiledFilm["fps"]; width: number; height: number; reducedMotion: boolean }) =>
      <RayWorldStage world={riverFlightWorld} images={content.images} textures={RAY_WORLD_TEXTURES["river-flight"]} samples={Math.min(content.samples ?? riverFlightWorld.samples, 4)} label={content.label} style={{ width: "100%", height: "100%" }} {...context} />, []);
    useEffect(() => {
      if (!playing) return;
      clock.current = { from: performance.now(), at: frame };
      let id = 0;
      const tick = (now: number) => {
        const next = Math.floor(clock.current.at + (now - clock.current.from) / 1000 * FPS * (slow ? .25 : 1));
        if (next >= film.durationFrames - 1) { setFrame(film.durationFrames - 1); setPlaying(false); return; }
        setFrame(next); id = requestAnimationFrame(tick);
      };
      id = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(id);
    }, [playing, slow]); // eslint-disable-line react-hooks/exhaustive-deps
    const button = { font: "600 13px system-ui", padding: "6px 10px", borderRadius: 6, border: "1px solid #2b3442", background: "#151b23", color: "#c9ced6", cursor: "pointer" } as const;
    return <div style={{ display: "grid", gap: 12, padding: 16, background: "#0b0d10", color: "#e8ecf2", font: "14px system-ui", minHeight: "100vh", alignContent: "start" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" onClick={() => { if (frame >= film.durationFrames - 1) setFrame(0); setPlaying(p => !p); }} style={{ ...button, background: "#7cc6ff", color: "#06121f", border: 0, padding: "8px 16px", fontSize: 14 }}>{playing ? "Pause" : "Play"}</button>
        <input type="range" min={0} max={film.durationFrames - 1} value={frame} onChange={event => { setPlaying(false); setFrame(Number(event.target.value)); }} aria-label="Film frame" style={{ width: 300 }} />
        <span style={{ font: "600 13px ui-monospace, monospace", color: "#9aa4b2" }}>{(frame / FPS).toFixed(1)} s</span>
        <button type="button" onClick={() => { setFrame(boundary - 30); setPlaying(true); }} style={button}>Play the join</button>
        <label style={{ display: "flex", gap: 6, alignItems: "center", color: "#9aa4b2" }}><input type="checkbox" checked={slow} onChange={event => setSlow(event.target.checked)} /> Quarter speed</label>
        <label style={{ display: "flex", gap: 6, alignItems: "center", color: "#9aa4b2" }}>Join
          <select value={mode} onChange={event => setMode(event.target.value as Mode)} style={{ ...button, padding: "5px 8px" }}>
            {(Object.keys(MODES) as Mode[]).map(key => <option key={key} value={key}>{MODES[key]}</option>)}
          </select>
        </label>
      </div>
      <div style={{ width: W, height: H, borderRadius: 8, overflow: "hidden" }}>
        <FilmStage film={film} frame={frame} renderObject={() => null} renderWorld={world} reducedMotion={false} />
      </div>
      <p style={{ margin: 0, maxWidth: W, color: "#9aa4b2", font: "13px/1.5 system-ui" }}>
        Something dark crosses the lens, close and out of focus, and the waterfall is behind it. The cut runs along its centre, so it is never seen, and both places drift the way it travels, as they would past a column on a moving camera. Compare it with a hard cut and with a dissolve of the same length.
      </p>
    </div>;
  },
};

const meta: Meta = { title: "Video production/Pass-By", parameters: { layout: "fullscreen" } };
export default meta;
