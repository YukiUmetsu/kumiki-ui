import { useEffect, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { compileFilm } from "../../registry/video/film-document";
import { FilmStage } from "../../registry/video/film-stage";
import type { PaintSurfaceSpec } from "../../registry/video/watercolour-brush";
import { paintExampleSpec } from "./watercolour-brush-demo";
import type { PaintedAspect, PaintedSubject } from "./watercolour-brush-demo";
import { WATERCOLOUR_BRUSH_FILM } from "./watercolour-brush-film";
import { PaintedPage } from "./watercolour-brush-page";

const TOTAL = 820;
const controls = { minHeight: 40, font: "600 14px system-ui", border: "1px solid #CABFAB",
  borderRadius: 8, padding: "8px 10px", background: "#FFFBF4", color: "#3C4042" } as const;


function WatercolourLab() {
  const [frame, setFrame] = useState(350);
  const [playing, setPlaying] = useState(false);
  const [aspect, setAspect] = useState<PaintedAspect>("landscape");
  const [seed, setSeed] = useState(31);
  const [tooth, setTooth] = useState(.82);
  const [water, setWater] = useState(1);
  const [reducedMotion, setReducedMotion] = useState(false);
  const compiled = useMemo(() => compileFilm(WATERCOLOUR_BRUSH_FILM, { outputId: aspect }), [aspect]);
  // Controls rebuild authored material once; absolute frame seeks reuse the sampled surface.
  const surfaces = useMemo<Record<PaintedSubject, PaintSurfaceSpec>>(() => {
    const make = (subject: PaintedSubject): PaintSurfaceSpec => {
      const source = paintExampleSpec(aspect, subject, seed);
      return { ...source, paper: { ...source.paper, tooth },
        strokes: source.strokes.map(s => ({ ...s, water: s.water * water })) };
    };
    return { "wild-iris": make("wild-iris"), "coastal-dawn": make("coastal-dawn") };
  }, [aspect, seed, tooth, water]);

  useEffect(() => {
    if (!playing) return;
    const start = performance.now(), initial = frame;
    let id = 0;
    const tick = (now: number) => {
      const next = Math.min(TOTAL - 1, initial + Math.floor((now - start) * 30 / 1000));
      setFrame(next);
      if (next < TOTAL - 1) id = requestAnimationFrame(tick);
      else setPlaying(false);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
    // The UI transport alone uses wall time. The surface and film never do.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);
  if (!compiled.ok) return <pre role="alert">{compiled.diagnostics.map(d => d.path + ": " + d.message).join("\n")}</pre>;
  const film = compiled.film;
  const scale = aspect === "landscape" ? .85 : .65;
  return <main style={{ padding: 24, minHeight: "100vh", display: "grid", alignContent: "start", gap: 16,
    background: "#EAE5DC", color: "#343D3E", fontFamily: "system-ui,sans-serif" }}>
    <header style={{ maxWidth: 960 }}>
      <div style={{ color: "#7F6559", fontWeight: 750, letterSpacing: 2.1, fontSize: 12 }}>MATERIAL-NATIVE FILM  /  WM1</div>
      <h1 style={{ font: "italic 500 36px/1.2 Georgia,serif", margin: "5px 0" }}>Watercolour & brush atelier</h1>
      <p style={{ margin: 0, maxWidth: 810, lineHeight: 1.55 }}>
        Two original subjects are painted one pressure-shaped stroke at a time. Watch wet pigment spread,
        settle into paper grain and leave dry-brush skips. No film-wide watercolor filter or raster video is used.
      </p>
    </header>
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end", maxWidth: 1000 }}>
      <label style={{ display: "grid", gap: 5, fontWeight: 650 }}>Output
        <select style={controls} aria-label="Output" value={aspect} onChange={e => { setPlaying(false); setAspect(e.target.value as PaintedAspect); }}>
          <option value="landscape">16:9 landscape</option><option value="portrait">9:16 portrait</option>
        </select>
      </label>
      <label style={{ display: "grid", gap: 5, fontWeight: 650 }}>Paper tooth: {Math.round(tooth * 100)}%
        <input type="range" aria-label="Paper tooth" min={0} max={1} step={.05} value={tooth}
          onChange={e => setTooth(Number(e.target.value))}/>
      </label>
      <label style={{ display: "grid", gap: 5, fontWeight: 650 }}>Water load: {Math.round(water * 100)}%
        <input type="range" aria-label="Water load" min={0} max={1} step={.05} value={water}
          onChange={e => setWater(Number(e.target.value))}/>
      </label>
      <label style={{ display: "grid", gap: 5, fontWeight: 650 }}>Paper seed
        <input style={{ ...controls, width: 95 }} aria-label="Paper seed" type="number" min={0} max={2147483647}
          value={seed} onChange={e => setSeed(Math.max(0, Math.min(2147483647, Math.floor(Number(e.target.value) || 0))))}/>
      </label>
      <label style={{ fontWeight: 650, display: "flex", gap: 7, alignItems: "center", minHeight: 40 }}>
        <input aria-label="Reduced motion" type="checkbox" checked={reducedMotion}
          onChange={e => { setPlaying(false); setReducedMotion(e.target.checked); }}/> Reduced motion
      </label>
    </div>
    <div style={{ display: "flex", gap: 10, alignItems: "center", maxWidth: 1000, flexWrap: "wrap" }}>
      <button type="button" style={controls} onClick={() => {
        if (playing) { setPlaying(false); return; }
        if (frame >= TOTAL - 1) setFrame(0);
        setPlaying(true);
      }}>{playing ? "Pause film" : "Play two-scene film"}</button>
      {([0, 120, 210, 350, 410, 550, 690, 818] as const).map(f => <button type="button"
        key={f} style={{ ...controls, padding: "6px 9px" }} onClick={() => { setPlaying(false); setFrame(f); }}>
        {f < 410 ? "Iris" : "Coast"} {f < 410 ? f : f - 410}</button>)}
    </div>
    <label style={{ display: "grid", gap: 6, maxWidth: 1000, fontWeight: 600 }}>Absolute film frame: {frame} / {TOTAL - 1}
      <input aria-label="Absolute film frame" type="range" min={0} max={TOTAL - 1}
        value={frame} onChange={e => { setPlaying(false); setFrame(Number(e.target.value)); }}/>
    </label>
    <div style={{ width: film.width * scale, height: film.height * scale, overflow: "hidden",
      boxShadow: "0 15px 55px #36363222", maxWidth: "100%" }}>
      <FilmStage film={film} frame={frame} renderObject={() => null} reducedMotion={reducedMotion}
        renderSlot={(content, context) => {
          if (content.slot !== "watercolour-brush") throw new Error("Unknown watercolor film slot: " + content.slot);
          const subject = content.props?.subject as PaintedSubject;
          if (subject !== "wild-iris" && subject !== "coastal-dawn") throw new Error("Invalid watercolor subject.");
          return <PaintedPage spec={surfaces[subject]} subject={subject} frame={context.frame}
            reducedMotion={context.reducedMotion}/>;
        }} style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}/>
    </div>
    <p style={{ maxWidth: 900, fontSize: 13, lineHeight: 1.6, color: "#5D6966", margin: 0 }}>
      Frame-addressed and seek-safe. The preview uses the existing FilmStage slot clock; film rendering does not
      depend on the order in which you scrub, and reduced motion resolves to the dry finished illustration.
    </p>
  </main>;
}

const meta = { title: "Film Art Styles/Watercolour & Brush", id: "film-art-watercolour-brush",
  component: WatercolourLab, parameters: { layout: "fullscreen" } } satisfies Meta<typeof WatercolourLab>;
export default meta;
type Story = StoryObj<typeof meta>;
export const PaintedFilm: Story = { render: () => <WatercolourLab /> };
