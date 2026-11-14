import { useEffect, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { compileFilm } from "../../registry/video/film-document";
import { FilmStage } from "../../registry/video/film-stage";
import { InkBrushPoster } from "./ink-brush-demo";
import { INK_BRUSH_FILM } from "./ink-brush-film";
import type { InkAspect, InkSubject } from "./ink-brush-demo";

const layout = {
  display: "grid", gap: 16, padding: 24, minHeight: "100vh",
  background: "#F7F7F4", color: "#303B3C", font: "15px/1.4 system-ui,sans-serif",
} as const;
const control = { display: "grid", gap: 5, font: "600 13px system-ui", minWidth: 150 } as const;
const button = {
  border: "1px solid #A5AAA7", borderRadius: 7, background: "#FFFFFF", color: "#283333",
  padding: "10px 14px", minHeight: 40, cursor: "pointer", font: "600 13px system-ui",
} as const;
const MAX_FRAME = 599;

function BrushStudio() {
  const [frame, setFrame] = useState(175);
  const [playing, setPlaying] = useState(false);
  const [aspect, setAspect] = useState<InkAspect>("landscape");
  const [widthScale, setWidthScale] = useState(1);
  const [drynessScale, setDrynessScale] = useState(1);
  const [loadScale, setLoadScale] = useState(1);
  const [paperTooth, setPaperTooth] = useState(.48);
  const [seed, setSeed] = useState(17);
  const [reducedMotion, setReducedMotion] = useState(false);
  const compiled = useMemo(() => compileFilm(INK_BRUSH_FILM, { outputId: aspect }), [aspect]);
  useEffect(() => {
    if (!playing) return;
    let animation = 0;
    const initialFrame = frame, start = performance.now();
    const tick = (now: number) => {
      const next = Math.min(MAX_FRAME, initialFrame + Math.floor((now - start) * 30 / 1000));
      setFrame(next);
      if (next < MAX_FRAME) animation = requestAnimationFrame(tick);
      else setPlaying(false);
    };
    animation = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animation);
    // Frame is captured at button click; the engine only consumes absolute frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);
  if (!compiled.ok) return <pre role="alert">{compiled.diagnostics.map(i => i.path + ": " + i.message).join("\n")}</pre>;
  const film = compiled.film, scale = aspect === "portrait" ? .62 : 1;
  const subject: InkSubject = frame < 280 ? "delta" : "branch";
  const phase = frame < 280 ? "River delta forming" : "Botanical branch forming";
  return <div style={layout}>
    <header style={{ maxWidth: 940 }}>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2.5, color: "#766651", textTransform: "uppercase" }}>
        Original material-native ink / INK1
      </div>
      <h1 style={{ margin: "7px 0", font: "600 clamp(26px,3vw,38px)/1.1 Georgia,serif" }}>Brush Deposition Lab</h1>
      <p style={{ maxWidth: 760, margin: 0 }}>The mark is drawn by a pressure-sensitive tip: controlled pace, load,
        tapered edges, and paper-visible dry-brush splits. Two independently authored subjects, one FilmStage.
        Wet diffusion is deliberately reserved for the next phase.</p>
    </header>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {([["River delta", 190], ["Botanical branch", 512]] as const).map(([name, at], i) =>
        <button type="button" key={name} style={{ ...button,
          background: subject === (i === 0 ? "delta" : "branch") ? "#354345" : "#FFFFFF",
          color: subject === (i === 0 ? "delta" : "branch") ? "#FFFFFF" : "#354345" }}
          onClick={() => { setPlaying(false); setFrame(at); }}>{name}</button>)}
    </div>
    <div style={{ width: film.width * scale, height: film.height * scale, maxWidth: "100%", overflow: "hidden",
      boxShadow: "0 12px 43px rgba(43,44,32,.12)" }}>
      <FilmStage film={film} frame={frame} reducedMotion={reducedMotion}
        renderObject={() => null}
        renderSlot={(content, context) => {
          if (content.slot !== "ink-brush-study") throw new Error("Unknown brush film slot: " + content.slot);
          const id = content.props?.subject;
          const offset = content.props?.offsetFrame;
          if ((id !== "delta" && id !== "branch") || typeof offset !== "number")
            throw new RangeError("Brush scene needs subject and offsetFrame.");
          return <InkBrushPoster aspect={aspect} subject={id} frame={offset + context.frame}
            seed={seed} widthScale={widthScale} drynessScale={drynessScale}
            loadScale={loadScale} paperTooth={paperTooth}
            reducedMotion={context.reducedMotion}/>;
        }} style={{ transform: "scale(" + scale + ")", transformOrigin: "top left" }}/>
    </div>
    <div aria-live="polite" style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "space-between", maxWidth: 960 }}>
      <span>{phase}</span><span style={{ fontWeight: 700 }}>{frame} / {MAX_FRAME} · 30 FPS</span>
    </div>
    <div style={{ display: "flex", gap: 12, alignItems: "end", maxWidth: 960 }}>
      <button type="button" style={button} onClick={() => {
        if (frame >= MAX_FRAME) setFrame(0);
        setPlaying(v => !v);
      }}>{playing ? "Pause" : frame >= MAX_FRAME ? "Replay" : "Play"}</button>
      <label style={{ ...control, flex: 1 }}>Film frame
        <input type="range" aria-label="Ink film frame" min={0} max={MAX_FRAME} value={frame}
          onChange={e => { setPlaying(false); setFrame(Number(e.target.value)); }}/>
      </label>
    </div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 16, maxWidth: 960 }}>
      <label style={control}>Output
        <select aria-label="Output" style={{ minHeight: 40, font: "inherit" }} value={aspect}
          onChange={e => { setPlaying(false); setAspect(e.target.value as InkAspect); }}>
          <option value="landscape">16:9 Landscape</option><option value="portrait">9:16 Portrait</option>
        </select>
      </label>
      <label style={control}>Brush width · {widthScale.toFixed(2)}×
        <input aria-label="Brush width" type="range" min={.5} max={1.5} step={.05} value={widthScale}
          onChange={e => setWidthScale(Number(e.target.value))}/>
      </label>
      <label style={control}>Dry-brush split · {drynessScale.toFixed(2)}×
        <input aria-label="Dry-brush split" type="range" min={.5} max={1.5} step={.05} value={drynessScale}
          onChange={e => setDrynessScale(Number(e.target.value))}/>
      </label>
      <label style={control}>Ink load · {loadScale.toFixed(2)}×
        <input aria-label="Ink load" type="range" min={.5} max={1.5} step={.05} value={loadScale}
          onChange={e => setLoadScale(Number(e.target.value))}/>
      </label>
      <label style={control}>Paper tooth · {Math.round(paperTooth * 100)}%
        <input aria-label="Paper tooth" type="range" min={0} max={1} step={.05} value={paperTooth}
          onChange={e => setPaperTooth(Number(e.target.value))}/>
      </label>
      <label style={control}>Paper seed
        <input aria-label="Paper seed" type="number" min={0} max={2147483647} step={1}
          value={seed} style={{ minHeight: 39, font: "inherit" }}
          onChange={e => setSeed(Math.max(0, Math.min(2147483647, Math.floor(Number(e.target.value) || 0))))}/>
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 8, font: "600 13px system-ui" }}>
        <input type="checkbox" checked={reducedMotion} onChange={e => { setPlaying(false); setReducedMotion(e.target.checked); }}/>
        Reduced motion
      </label>
    </div>
    <p style={{ fontSize: 12, opacity: .78, maxWidth: 960 }}>Each visible brush mark is a variable-width piece of authored
      geometry, not a noise-masked photograph. No new dependencies, film renderer, clocks or packaged assets.</p>
  </div>;
}

const meta = {
  title: "Video production/Film Looks/Ink Brush", id: "video-ink-brush",
  component: BrushStudio, parameters: { layout: "fullscreen" },
} satisfies Meta<typeof BrushStudio>;
export default meta;
export const BrushStudioFilm: StoryObj<typeof BrushStudio> = {
  name: "INK1 · Brush Deposition Lab",
  render: () => <BrushStudio />,
};
