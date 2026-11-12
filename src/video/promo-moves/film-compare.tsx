import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { compileFilm } from "../../../registry/video/film-document";
import type { CompiledFilm, FilmDocument } from "../../../registry/video/film-document";
import { FilmStage } from "../../../registry/video/film-stage";
import type { FilmStageProps } from "../../../registry/video/film-stage";
import iceCave from "../../../examples/film/assets/iceland-large/ice-cave.jpg?url";
import dynjandi from "../../../examples/film/assets/iceland-large/dynjandi.jpg?url";
import jokulsarlon from "../../../examples/film/assets/iceland-large/jokulsarlon.jpg?url";
import seljalandsfoss from "../../../examples/film/assets/iceland-large/seljalandsfoss.jpg?url";

/** The example pictures, served by Storybook, by image ID. */
export const EXAMPLE_IMAGES: Record<string, string> = { "ice-cave": iceCave, dynjandi, jokulsarlon, seljalandsfoss };

/** Every picture of an example (`{ id, src }` with a known ID, wherever it sits) served by Storybook. */
function serveImages<T>(value: T): T {
  if (Array.isArray(value)) return value.map(serveImages) as T;
  if (!value || typeof value !== "object") return value;
  const entries = Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, serveImages(item)]);
  const out = Object.fromEntries(entries) as Record<string, unknown>;
  if (typeof out.id === "string" && typeof out.src === "string" && EXAMPLE_IMAGES[out.id]) out.src = EXAMPLE_IMAGES[out.id];
  return out as T;
}
/** Compile an example film for a story: its pictures served by Storybook, at the draft size (or `outputId`). */
export function compileExample(doc: FilmDocument, outputId = "draft"): CompiledFilm {
  const result = compileFilm(serveImages(doc), { outputId });
  if (!result.ok) throw new Error(result.diagnostics.map(item => `${item.path}: ${item.message}`).join("\n"));
  return result.film;
}

export interface CompareVariant { label: string; film: CompiledFilm }
export interface FilmCompareProps {
  /** The new move first, then what Kumiki did before, to compare at the same length. */
  variants: Readonly<Record<string, CompareVariant>>;
  /** The frame "Play the moment" starts from, in the first variant. */
  moment: (film: CompiledFilm) => number;
  /** What to look for, in a sentence or two. */
  children?: ReactNode;
  stage?: Omit<FilmStageProps, "film" | "frame" | "reducedMotion" | "renderObject"> & Partial<Pick<FilmStageProps, "renderObject">>;
}

const button = { font: "600 13px system-ui", padding: "6px 10px", borderRadius: 6, border: "1px solid #2b3442", background: "#151b23", color: "#c9ced6", cursor: "pointer" } as const;

/** One film in several versions, played side by side in time: play, scrub, slow down, compare and check reduced motion. */
export function FilmCompare({ variants, moment, children, stage }: FilmCompareProps) {
  const keys = Object.keys(variants), [mode, setMode] = useState(keys[0]), [slow, setSlow] = useState(false), [reduce, setReduce] = useState(false);
  const film = variants[mode].film, fps = film.fps.num / film.fps.den, start = useMemo(() => Math.max(0, moment(variants[keys[0]].film)), [variants]); // eslint-disable-line react-hooks/exhaustive-deps
  const [frame, setFrame] = useState(start), [playing, setPlaying] = useState(false), clock = useRef({ from: 0, at: 0 });
  useEffect(() => {
    if (!playing) return;
    clock.current = { from: performance.now(), at: frame };
    let id = 0;
    const tick = (now: number) => {
      const next = Math.floor(clock.current.at + (now - clock.current.from) / 1000 * fps * (slow ? .25 : 1));
      if (next >= film.durationFrames - 1) { setFrame(film.durationFrames - 1); setPlaying(false); return; }
      setFrame(next); id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [playing, slow, film]); // eslint-disable-line react-hooks/exhaustive-deps
  const width = Math.min(film.width, 960), scale = width / film.width, shown = Math.min(frame, film.durationFrames - 1);
  return <div style={{ display: "grid", gap: 12, padding: 16, background: "#0b0d10", color: "#e8ecf2", font: "14px system-ui", minHeight: "100vh", alignContent: "start" }}>
    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <button type="button" onClick={() => { if (frame >= film.durationFrames - 1) setFrame(0); setPlaying(p => !p); }} style={{ ...button, background: "#7cc6ff", color: "#06121f", border: 0, padding: "8px 16px", fontSize: 14 }}>{playing ? "Pause" : "Play"}</button>
      <input type="range" min={0} max={film.durationFrames - 1} value={shown} onChange={event => { setPlaying(false); setFrame(Number(event.target.value)); }} aria-label="Film frame" style={{ width: 300 }} />
      <span style={{ font: "600 13px ui-monospace, monospace", color: "#9aa4b2", minWidth: 96 }}>{(shown / fps).toFixed(2)} s · f{shown}</span>
      <button type="button" onClick={() => { setFrame(start); setPlaying(true); }} style={button}>Play the moment</button>
      <label style={{ display: "flex", gap: 6, alignItems: "center", color: "#9aa4b2" }}><input type="checkbox" checked={slow} onChange={event => setSlow(event.target.checked)} /> Quarter speed</label>
      <label style={{ display: "flex", gap: 6, alignItems: "center", color: "#9aa4b2" }}><input type="checkbox" checked={reduce} onChange={event => setReduce(event.target.checked)} /> Reduced motion</label>
      {keys.length > 1 && <label style={{ display: "flex", gap: 6, alignItems: "center", color: "#9aa4b2" }}>Compare
        <select value={mode} onChange={event => setMode(event.target.value)} style={{ ...button, padding: "5px 8px" }}>
          {keys.map(key => <option key={key} value={key}>{variants[key].label}</option>)}
        </select>
      </label>}
    </div>
    <div style={{ width, height: film.height * scale, borderRadius: 8, overflow: "hidden" }}>
      <div style={{ width: film.width, height: film.height, transform: `scale(${scale})`, transformOrigin: "0 0" }}>
        <FilmStage film={film} frame={shown} renderObject={() => null} {...stage} reducedMotion={reduce} />
      </div>
    </div>
    {children && <div style={{ margin: 0, maxWidth: width, color: "#9aa4b2", font: "13px/1.55 system-ui" }}>{children}</div>}
  </div>;
}
