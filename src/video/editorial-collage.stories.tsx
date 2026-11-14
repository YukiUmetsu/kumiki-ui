import { useEffect, useMemo, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import "../styles/collage-fonts.css";
import { compileFilm } from "../../registry/video/film-document";
import { FilmStage } from "../../registry/video/film-stage";
import { renderCollageSlot } from "./collage-slot";
import { collageFilm, shotStarts } from "./collage-film";
import type { CollageFilmTweaks } from "./collage-film";
import { STANDARD_TIME_SHOTS } from "./collage-standard-time";
import type { CollageAspect } from "./collage-standard-time";
import { CastLab, PaperLab } from "./editorial-collage-labs";

const page = { display: "grid", gap: 16, padding: 24, minHeight: "100vh", background: "#f4f1ea", color: "#26231f", font: "15px/1.45 system-ui, sans-serif" } as const;
const label = { display: "grid", gap: 5, font: "600 13px system-ui", minWidth: 150 } as const;
const button = { border: "1px solid #a39a8c", borderRadius: 7, background: "#ffffff", color: "#26231f", padding: "9px 14px", minHeight: 40, cursor: "pointer", font: "600 13px system-ui" } as const;
const active = { ...button, background: "#26231f", color: "#ffffff", border: "1px solid #26231f" } as const;

/** Plays an FD1 film whose scenes are `collage-scene` slots, on its own requestAnimationFrame clock. */
function useFilmClock(max: number, initial: number) {
  const [frame, setFrame] = useState(initial);
  const [playing, setPlaying] = useState(false);
  const from = useRef(initial);
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const start = performance.now(), first = from.current;
    const tick = (now: number) => {
      const next = Math.min(max, first + Math.floor((now - start) * 30 / 1000));
      setFrame(next);
      if (next < max) raf = requestAnimationFrame(tick); else setPlaying(false);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, max]);
  return {
    frame, playing,
    seek(f: number) { setPlaying(false); setFrame(f); from.current = f; },
    toggle() { if (!playing) from.current = frame >= max ? 0 : frame; if (frame >= max) setFrame(0); setPlaying(p => !p); },
  };
}

function CollageFilmPlayer({ initialFrame = 96 }: { initialFrame?: number }) {
  const [aspect, setAspect] = useState<CollageAspect>("landscape");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [cadence, setCadence] = useState<1 | 2 | 3>(2);
  const [boil, setBoil] = useState(.5);
  const [grain, setGrain] = useState(.38);
  const tweaks: CollageFilmTweaks = useMemo(() => ({ cadence, boil, grain }), [cadence, boil, grain]);
  const doc = useMemo(() => collageFilm(STANDARD_TIME_SHOTS, tweaks), [tweaks]);
  const compiled = useMemo(() => compileFilm(doc, { outputId: aspect }), [doc, aspect]);
  const starts = useMemo(() => shotStarts(), []);
  const total = compiled.ok ? compiled.film.durationFrames : 1;
  const clock = useFilmClock(total - 1, initialFrame);
  if (!compiled.ok) return <pre role="alert">{compiled.diagnostics.map(d => d.path + ": " + d.message).join("\n")}</pre>;
  const film = compiled.film;
  const shotIndex = starts.reduce((found, s, i) => s <= clock.frame ? i : found, 0);
  const scale = aspect === "landscape" ? .5 : .38;
  return <div style={page}>
    <header style={{ maxWidth: 980 }}>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2.5, color: "#8a3b28", textTransform: "uppercase" }}>Editorial paper collage · COLLAGE1</div>
      <h1 style={{ margin: "6px 0", font: "700 clamp(26px,3vw,38px)/1.1 Georgia, serif" }}>Why every clock agrees</h1>
      <p style={{ margin: 0, maxWidth: 820 }}>The newsroom-explainer collage look as a data-driven engine: torn and cut paper with white fibre
        cores, halftone print shading, tape, highlighter sweeps and boiling marker lines, condensed headlines on pasted-up slips, paper
        maps with routes and pins, and jointed paper-puppet characters — all moved on twos like stop-motion under a smooth rostrum camera.
        Six original shots, one FD1 film, 16:9 and 9:16.</p>
    </header>
    <nav aria-label="Shots" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {STANDARD_TIME_SHOTS.map((shot, i) => <button type="button" key={shot.id} style={i === shotIndex ? active : button} aria-pressed={i === shotIndex}
        onClick={() => clock.seek(starts[i] + 24)}>{i + 1}. {shot.title}</button>)}
    </nav>
    <div style={{ width: film.width * scale, height: film.height * scale, maxWidth: "100%", overflow: "hidden", boxShadow: "0 14px 44px rgba(40,30,20,.22)", background: "#1d1b19" }}>
      <FilmStage film={film} frame={clock.frame} reducedMotion={reducedMotion} renderObject={() => null}
        renderSlot={(content, context) => {
          const node = renderCollageSlot(content, context);
          if (node === undefined) throw new Error("Unknown slot " + content.slot);
          return node;
        }}
        style={{ transform: `scale(${scale})`, transformOrigin: "top left" }} />
    </div>
    <div style={{ display: "flex", gap: 12, alignItems: "end", maxWidth: 980 }}>
      <button type="button" style={button} onClick={clock.toggle}>{clock.playing ? "Pause" : clock.frame >= total - 1 ? "Replay" : "Play"}</button>
      <label style={{ ...label, flex: 1 }}>Film frame · {clock.frame} / {total - 1} · {(clock.frame / 30).toFixed(1)} s
        <input type="range" aria-label="Collage film frame" min={0} max={total - 1} value={clock.frame} onChange={e => clock.seek(Number(e.target.value))} />
      </label>
    </div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 16, maxWidth: 980 }}>
      <label style={label}>Output
        <select aria-label="Output" value={aspect} style={{ minHeight: 40, font: "inherit" }} onChange={e => setAspect(e.target.value as CollageAspect)}>
          <option value="landscape">16:9 Landscape</option><option value="portrait">9:16 Portrait</option>
        </select>
      </label>
      <label style={label}>Stop-motion cadence
        <select aria-label="Stop-motion cadence" value={cadence} style={{ minHeight: 40, font: "inherit" }} onChange={e => setCadence(Number(e.target.value) as 1 | 2 | 3)}>
          <option value={1}>On ones (smooth)</option><option value={2}>On twos (default)</option><option value={3}>On threes (crafty)</option>
        </select>
      </label>
      <label style={label}>Hand-placement boil · {boil.toFixed(2)} px
        <input type="range" aria-label="Boil" min={0} max={2} step={.05} value={boil} onChange={e => setBoil(Number(e.target.value))} />
      </label>
      <label style={label}>Film grain · {Math.round(grain * 100)}%
        <input type="range" aria-label="Film grain" min={0} max={1} step={.02} value={grain} onChange={e => setGrain(Number(e.target.value))} />
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 8, font: "600 13px system-ui" }}>
        <input type="checkbox" checked={reducedMotion} onChange={e => setReducedMotion(e.target.checked)} /> Reduced motion (settled frames)
      </label>
    </div>
    <p style={{ fontSize: 13, maxWidth: 900, margin: 0, opacity: .8 }}>Every frame is a pure function of the frame number: scrub, seek backward or jump between shots and
      the paper lands in the same place. Facts shown: towns kept local solar time; North American railroads adopted standard time on
      18 November 1883; the 1884 International Meridian Conference chose Greenwich. The newspaper is fictional. No footage, photos or
      third-party artwork; map coastlines are Natural Earth (public domain).</p>
  </div>;
}

const meta = {
  title: "Video production/Film Looks/Editorial Collage",
  id: "video-editorial-collage",
  component: CollageFilmPlayer,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof CollageFilmPlayer>;
export default meta;

export const CollageFilm: StoryObj<typeof CollageFilmPlayer> = {
  name: "COLLAGE1 · Why every clock agrees",
  render: () => <CollageFilmPlayer />,
};
export const PaperAndPrintLab: StoryObj<typeof CollageFilmPlayer> = {
  name: "COLLAGE1 · Paper & print lab",
  render: () => <PaperLab />,
};
export const PuppetCastLab: StoryObj<typeof CollageFilmPlayer> = {
  name: "COLLAGE1 · Puppet cast lab",
  render: () => <CastLab />,
};
