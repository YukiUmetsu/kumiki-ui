import { useEffect, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { compileFilm } from "../../registry/video/film-document";
import { FilmStage } from "../../registry/video/film-stage";
import { paintedDemoSpec, paintedCameraAt, PAINTED_GENRES } from "./painted-composition-demo";
import type { PaintedGenre, PaintedOutput } from "./painted-composition-demo";
import { PaintedWorldPage } from "./painted-composition-page";
import { PAINTED_WORLDS_FILM } from "./painted-composition-film";
import { inspectPaintedComposition } from "../../registry/video/painted-composition";
import type { PaintedCompositionSpec } from "../../registry/video/painted-composition";
import { WatercolourFilmViewport, WatercolourParameterEditor, WatercolourSlider, inspectJsonObject } from "./watercolour-film-parameters";

const LENGTH = 1600;
const control = { font: "600 13px system-ui", background: "#FFF9F0", color: "#425254",
  border: "1px solid #C2B5A8", borderRadius: 8, minHeight: 39, padding: "8px 12px" } as const;
const titles: Record<PaintedGenre, string> = {
  nature: "Nature / travel",
  architecture: "Architecture / history",
  science: "Science / explainers",
  product: "Product / editorial",
};

/** A real 4-shot FilmStage, never a second preview-only video system. */
function PaintedWorldsLab() {
  const [frame, setFrame] = useState(256);
  const [playing, setPlaying] = useState(false);
  const [output, setOutput] = useState<PaintedOutput>("landscape");
  const [water, setWater] = useState(.85);
  const [edge, setEdge] = useState(.75);
  const [grain, setGrain] = useState(.78);
  const [seed, setSeed] = useState(47);
  const [tooth, setTooth] = useState(.82);
  const [opacity, setOpacity] = useState(1);
  const [backrun, setBackrun] = useState(1);
  const [paperColor, setPaperColor] = useState("#F7F0E4");
  const [custom, setCustom] = useState<Partial<Record<PaintedGenre,PaintedCompositionSpec>>>({});
  const [reduced, setReduced] = useState(false);
  const compiled = useMemo(() => compileFilm(PAINTED_WORLDS_FILM, { outputId: output }), [output]);
  const materials = useMemo(() => Object.fromEntries(PAINTED_GENRES.map(genre => {
    const original = paintedDemoSpec(genre, output, seed);
    return [genre, custom[genre] ?? {
      ...original, paper:{...original.paper,tooth,color:paperColor},
      layers: original.layers.map(layer => layer.kind === "wash"
        ? { ...layer, water: Math.min(1,layer.water * water),
          edgePooling: Math.min(1,layer.edgePooling * edge),
          granulation: Math.min(1,layer.granulation * grain),
          opacity:Math.min(1,layer.opacity*opacity),
          backruns:layer.backruns?.map(run=>({...run,strength:Math.min(1,run.strength*backrun)})) }
        : layer),
    }];
  })) as unknown as Record<PaintedGenre, PaintedCompositionSpec>, [output, seed, water, edge, grain, tooth, opacity, backrun, paperColor, custom]);

  useEffect(() => {
    if (!playing) return;
    const started = performance.now(), initialFrame = frame;
    let request = 0;
    const tick = (now: number) => {
      const next = Math.min(LENGTH - 1, initialFrame + Math.floor((now - started) * 30 / 1000));
      setFrame(next);
      if (next < LENGTH - 1) request = requestAnimationFrame(tick);
      else setPlaying(false);
    };
    request = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(request);
    // Transport is the only wall-clock consumer. Art is an absolute-frame sample.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  if (!compiled.ok) return <pre role="alert">{compiled.diagnostics.map(e => e.path + ": " + e.message).join("\n")}</pre>;
  const film = compiled.film;

  const currentGenre = PAINTED_GENRES[Math.min(3, Math.floor(frame / 400))];
  return <main style={{ fontFamily: "system-ui, sans-serif", background: "#E9E3D9",
    color: "#374748", minHeight: "100vh", padding: 22, display: "grid", gap: 15, alignContent: "start" }}>
    <header style={{ maxWidth: 950 }}>
      <div style={{ fontSize: 12, letterSpacing: 2.1, fontWeight: 800, color: "#836A58" }}>WM2 / PAINTED COMPOSITION</div>
      <h1 style={{ font: "italic 500 clamp(28px,3.6vw,42px)/1.15 Georgia,serif", margin: "6px 0" }}>
        Watercolour · Any-Subject Film Atelier
      </h1>
      <p style={{ maxWidth: 855, margin: 0, lineHeight: 1.5 }}>
        One material grammar for architecture, nature, product illustrations, science and custom supplied artwork.
        Shapes are painted inside their original silhouettes, with genuine layered watercolor passes and paper-stable texture.
      </p>
    </header>
    <nav aria-label="Painted subject chapters" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {PAINTED_GENRES.map((genre, i) => <button key={genre} type="button"
        aria-pressed={currentGenre === genre}
        onClick={() => { setPlaying(false); setFrame(i * 400 + 360); }}
        style={{ ...control, background: currentGenre === genre ? "#354B49" : "#FFF9F0",
          color: currentGenre === genre ? "#FFFFFF" : "#425254" }}>
        {titles[genre]}</button>)}
    </nav>
    <div style={{ display: "flex", gap: 15, flexWrap: "wrap", alignItems: "end" }}>
      <label style={{ display: "grid", gap: 3, fontWeight: 650 }}>Output format
        <select aria-label="Output format" style={control} value={output}
          onChange={e => { setPlaying(false); setOutput(e.target.value as PaintedOutput);setCustom({}); }}>
          <option value="landscape">16:9 landscape</option><option value="portrait">9:16 portrait</option>
        </select>
      </label>
      {([
        { label:"Water load", value:water, set:setWater },
        { label:"Edge pooling", value:edge, set:setEdge },
        { label:"Pigment granulation", value:grain, set:setGrain },
      ] as const).map(field => <label key={field.label} style={{ display: "grid", gap: 4, fontWeight: 650 }}>
        {field.label}: {Math.round(field.value * 100)}%
        <input aria-label={field.label} type="range" min={0} max={1} step={.05}
          value={field.value} onChange={e => field.set(Number(e.target.value))}/>
      </label>)}
      <WatercolourSlider label="Paper tooth" value={tooth} onChange={setTooth}/>
      <WatercolourSlider label="Wash opacity" value={opacity} onChange={setOpacity}/>
      <WatercolourSlider label="Backrun strength" value={backrun} onChange={setBackrun}/>
      <label style={{display:"grid",gap:5,fontWeight:650,fontSize:13}}>Paper colour
        <input aria-label="Painted paper colour" type="color" value={paperColor}
          onChange={e=>setPaperColor(e.target.value)} style={{height:41,width:80}}/>
      </label>
      <label style={{ display: "grid", gap: 4, fontWeight: 650 }}>Paper seed
        <input aria-label="Paper seed" style={{...control, width:105}} type="number" min={0} max={2147483647}
          value={seed} onChange={e => setSeed(Math.max(0, Math.min(2147483647, Math.floor(Number(e.target.value) || 0))))}/>
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 40, fontWeight: 650 }}>
        <input aria-label="Reduced motion" type="checkbox" checked={reduced}
          onChange={e => { setPlaying(false); setReduced(e.target.checked); }}/> Reduced motion
      </label>
    </div>
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <button type="button" style={control} onClick={() => {
        if (playing) { setPlaying(false); return; }
        if (frame >= LENGTH - 1) setFrame(0);
        setPlaying(true);
      }}>{playing ? "Pause" : "Play all four painted films"}</button>
      <span style={{ font: "500 13px/1.4 system-ui" }}>
        Current chapter: <strong>{titles[currentGenre]}</strong>
      </span>
    </div>
    <label style={{ display: "grid", gap: 5, width: "100%", maxWidth: 1020, fontWeight: 650 }}>
      Absolute film frame: {frame} / {LENGTH - 1}
      <input aria-label="Painted film frame" type="range" min={0} max={LENGTH - 1} value={frame}
        onChange={e => { setPlaying(false); setFrame(Number(e.target.value)); }}/>
    </label>
    <WatercolourFilmViewport width={film.width} height={film.height}>
      {scale=><FilmStage film={film} frame={frame} renderObject={() => null} reducedMotion={reduced}
        renderSlot={(content, context) => {
          if (content.slot !== "painted-composition") throw new Error("Unexpected slot: " + content.slot);
          const genre = content.props?.genre as PaintedGenre;
          if (!PAINTED_GENRES.includes(genre)) throw new RangeError("Painted film needs a valid genre.");
          return <PaintedWorldPage genre={genre} spec={materials[genre]}
            frame={context.frame} reducedMotion={context.reducedMotion}
            camera={paintedCameraAt(context.frame, context.reducedMotion)}/>;
        }}
        style={{ transform: "scale(" + scale + ")", transformOrigin: "top left" }}/>}
    </WatercolourFilmViewport>
    <WatercolourParameterEditor key={output+":"+currentGenre}
      title={titles[currentGenre]+" layered composition"} value={materials[currentGenre]}
      validate={candidate=>{
        const errors=inspectJsonObject(candidate);if(errors.length)return errors;
        try{
          const spec=candidate as PaintedCompositionSpec;
          const invalid=inspectPaintedComposition(spec).map(x=>x.path+": "+x.message);
          if(spec.width!==film.width||spec.height!==film.height)
            invalid.push("Composition dimensions must match the selected output.");
          return invalid;
        }catch(e){return ["Invalid painted composition: "+String(e)];}
      }}
      onApply={spec=>{setPlaying(false);setCustom(previous=>({...previous,[currentGenre]:spec}));}}
      onReset={()=>{setPlaying(false);setCustom(previous=>({...previous,[currentGenre]:undefined}));}}
      notes="Each genre can be independently authored with SVG silhouettes, brush paths, washes, droplets and colors."/>
    <p style={{ margin:0, maxWidth:930, fontSize:13, lineHeight:1.5, color:"#5F6D68" }}>
      Everything is original vector geometry. The exported film has the same slots and frame math as this
      preview. The material also accepts your own SVG paths, image silhouettes and WM1 brush data.
      No imported reference footage, paid media, stock presets or new video clock.
    </p>
  </main>;
}
const meta = { title: "Video Production/Film Looks/Watercolour & Brush", id: "film-art-watercolour-worlds",
  component: PaintedWorldsLab, parameters: { layout: "fullscreen" } } satisfies Meta<typeof PaintedWorldsLab>;
export default meta;
type Story = StoryObj<typeof meta>;
export const AnySubjectPaintedFilm: Story = { render: () => <PaintedWorldsLab /> };
