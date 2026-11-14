import { useEffect, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { compileFilm } from "../../registry/video/film-document";
import { FilmStage } from "../../registry/video/film-stage";
import { InkBrushCanvas } from "../../registry/video/ink-brush-react";
import type { InkBrushSpec, InkBrushStroke } from "../../registry/video/ink-brush";
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


/** Study the material at full scale, without a title card masking the brush construction. */
function BrushMaterialMicroscope() {
  const [frame, setFrame] = useState(220);
  const [dryness, setDryness] = useState(.65);
  const [load, setLoad] = useState(.82);
  const [zoom, setZoom] = useState(1);
  const [seed, setSeed] = useState(31);
  const marks: InkBrushStroke[] = [
    { id: "side-loaded", width: 55, tone: 0, dryness: .3 * dryness, load, startFrame: 0, durationFrames: 44,
      points: [
        { x: 110, y: 122, pressure: .12, pace: 1.9 },
        { x: 230, y: 123, pressure: .95, pace: .55 },
        { x: 420, y: 141, pressure: .8, pace: .85 },
        { x: 680, y: 106, pressure: .5, pace: 2.8 },
        { x: 829, y: 118, pressure: .035, pace: 3.4 },
      ] },
    { id: "loaded-wash", width: 75, tone: 2, dryness: .09 * dryness, load: .6 * load,
      startFrame: 47, durationFrames: 43,
      points: [
        { x: 118, y: 239, pressure: .15, pace: .75 },
        { x: 280, y: 232, pressure: .9, pace: .45 },
        { x: 520, y: 258, pressure: .72, pace: .7 },
        { x: 807, y: 238, pressure: .07, pace: 1.5 },
      ] },
    { id: "flying-white", width: 49, tone: 1, dryness, load: .5 * load,
      startFrame: 96, durationFrames: 40,
      points: [
        { x: 115, y: 356, pressure: .09, pace: 2.2 },
        { x: 290, y: 330, pressure: .84, pace: 2.6 },
        { x: 470, y: 351, pressure: .7, pace: 3.5 },
        { x: 650, y: 322, pressure: .56, pace: 3.5 },
        { x: 826, y: 319, pressure: .02, pace: 4 },
      ] },
    { id: "lifting-tip", width: 21, tone: 0, dryness: dryness * .8, load: .8 * load,
      startFrame: 140, durationFrames: 43,
      points: [
        { x: 110, y: 453, pressure: .06, pace: 1.2 },
        { x: 282, y: 441, pressure: .94, pace: .65 },
        { x: 463, y: 462, pressure: .6, pace: 1.5 },
        { x: 810, y: 438, pressure: 0, pace: 3.2 },
      ] },
  ];
  const spec: InkBrushSpec = { version: 1, width: 960, height: 540, paper: "#F2EFE4", seed, strokes: marks };
  return <div style={layout}>
    <div>
      <h1 style={{ font: "600 34px/1.2 Georgia,serif", margin: "0 0 8px" }}>Real Brush Material / Contact Study</h1>
      <p style={{ maxWidth: 870, margin: 0 }}>Observe four independent deposits: a side-loaded ink tip,
        pale wash, fast split bristles and a lifting fine tip. The pigment is nonuniform and the
        paper apertures are cut through each individual mark, not a photographic overlay.</p>
    </div>
    <div style={{ width: 960, height: 540, overflow: "hidden", maxWidth: "100%",
      boxShadow: "0 12px 42px rgba(40,30,20,.12)" }}>
      <InkBrushCanvas spec={spec} frame={frame} data-km-ink-microscope=""
        style={{ transform: "scale(" + zoom + ")", transformOrigin: "50% 50%" }}/>
    </div>
    <div style={{ maxWidth: 960, display: "flex", flexWrap: "wrap", gap: 14 }}>
      <label style={{ ...control, flex: 1 }}>Frame / {frame}
        <input aria-label="Brush material frame" type="range" min={0} max={220} value={frame}
          onChange={e => setFrame(Number(e.target.value))}/>
      </label>
      <label style={control}>Dryness / {dryness.toFixed(2)}
        <input aria-label="Material dryness" type="range" min={0} max={1} step={.05} value={dryness}
          onChange={e => setDryness(Number(e.target.value))}/>
      </label>
      <label style={control}>Ink load / {load.toFixed(2)}
        <input aria-label="Material ink load" type="range" min={.2} max={1} step={.05} value={load}
          onChange={e => setLoad(Number(e.target.value))}/>
      </label>
      <label style={control}>Zoom / {zoom.toFixed(2)}×
        <input aria-label="Material zoom" type="range" min={1} max={2.5} step={.25} value={zoom}
          onChange={e => setZoom(Number(e.target.value))}/>
      </label>
      <label style={control}>Paper seed
        <input aria-label="Material seed" type="number" min={0} max={2147483647} value={seed}
          onChange={e => setSeed(Math.max(0, Math.min(2147483647, Math.floor(Number(e.target.value) || 0))))}/>
      </label>
    </div>
    <p style={{ maxWidth: 890, fontSize: 13, margin: 0 }}>
      Physical approximation of brush contact, not a measured ink-and-water transport simulation;
      true capillary spread and absorption remain the next implementation milestone.
    </p>
  </div>;
}
export const BrushContactMicroscope: StoryObj<typeof BrushMaterialMicroscope> = {
  name: "INK1 · Brush Material Microscope",
  render: () => <BrushMaterialMicroscope />,
};
