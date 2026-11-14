import { useEffect, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { compileFilm } from "../../registry/video/film-document";
import { FilmStage } from "../../registry/video/film-stage";
import { WatercolourIllustration, inspectWatercolourArtwork } from "../../registry/video/watercolour-illustration";
import type { WatercolourArtwork } from "../../registry/video/watercolour-illustration";
import { WATERCOLOUR_ART_DIRECTOR_FILM } from "./watercolour-art-director-film";
import { watercolorWetlandSpec } from "./watercolour-art-director-demo";
import type { WetlandOutput } from "./watercolour-art-director-demo";
import { WatercolourFilmViewport, WatercolourParameterEditor, WatercolourSlider, inspectJsonObject } from "./watercolour-film-parameters";

const TOTAL = 360;
const control = { minHeight: 40, padding: "8px 12px", font: "600 13px system-ui",
  color: "#40534F", background: "#FFFCF6", border: "1px solid #BDB6A8",
  borderRadius: 7 } as const;

/** Source-only art direction controls. All frames and random decisions come
 * from the authored scene and FilmStage's absolute clock, not a private loop.
 */
function IllustrationDirector() {
  const [output, setOutput] = useState<WetlandOutput>("landscape");
  const [frame, setFrame] = useState(265);
  const [playing, setPlaying] = useState(false);
  const [seed, setSeed] = useState(83);
  const [tooth, setTooth] = useState(.81);
  const [reduced, setReduced] = useState(false);
  const [details, setDetails] = useState(true);
  const [custom, setCustom] = useState<WatercolourArtwork | null>(null);
  const filmResult = useMemo(() => compileFilm(WATERCOLOUR_ART_DIRECTOR_FILM,
    { outputId: output }), [output]);
  const authored = useMemo(() => {
    const source = watercolorWetlandSpec(output, seed);
    return { ...source, paper: { ...source.paper, tooth },
      wetPaper: source.wetPaper ? { ...source.wetPaper,
        paper: { ...source.wetPaper.paper, tooth } } : undefined };
  }, [output, seed, tooth]);
  const artwork = custom ?? authored;
  const painting = useMemo<WatercolourArtwork>(() => details ? artwork :
    { ...artwork, parts: artwork.parts.map(part => ({
      ...part, children: part.kind === "group" ? part.children.filter(child =>
        !child.id.endsWith("plumage") && !child.id.includes("current-")) : undefined,
    })) as WatercolourArtwork["parts"] },
    [artwork, details]);

  useEffect(() => {
    if (!playing) return;
    const started = performance.now(), first = frame;
    let raf = 0;
    const tick = (now: number) => {
      const next = Math.min(TOTAL - 1, first + Math.floor((now - started) * 30 / 1000));
      setFrame(next);
      if (next < TOTAL - 1) raf = requestAnimationFrame(tick);
      else setPlaying(false);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // Playback transport is exclusive to Storybook. The artwork is frame-pure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  if (!filmResult.ok) return <pre role="alert">{filmResult.diagnostics.map(
    x => x.path + ": " + x.message).join("\n")}</pre>;
  const film = filmResult.film;
  return <main style={{ minHeight: "100vh", background: "#E9E6DD",
    color: "#394B4B", fontFamily: "system-ui,sans-serif",
    display: "grid", alignContent: "start", gap: 15, padding: 23 }}>
    <header style={{ maxWidth: 920 }}>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2, color: "#8C7764" }}>
        WC9 / ARTCRAFT ILLUSTRATION DIRECTOR
      </div>
      <h1 style={{ font: "italic 500 40px/1.13 Georgia,serif", margin: "7px 0" }}>
        A heron at the edge of the marsh
      </h1>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>
        An original watercolor scene built from semantic geometry: anatomical heron,
        rooted feather groups, individually constructed reeds, water currents,
        transparent pigment and separate motion rigs. Edit the entire scene graph;
        the same reusable renderer works with arbitrary authored subjects.
      </p>
    </header>
    <div style={{ display: "flex", gap: 14, alignItems: "end", flexWrap: "wrap" }}>
      <label style={{ display: "grid", gap: 5, fontSize: 13, fontWeight: 700 }}>
        Output ratio
        <select aria-label="Illustration output" value={output} style={control}
          onChange={e => { setPlaying(false); setCustom(null);
            setOutput(e.target.value as WetlandOutput); }}>
          <option value="landscape">16:9 horizontal</option>
          <option value="portrait">9:16 vertical</option>
        </select>
      </label>
      <label style={{ display: "grid", gap: 5, fontSize: 13, fontWeight: 700 }}>
        Paper seed
        <input style={{ ...control, width: 115 }} aria-label="Illustration seed"
          type="number" min={0} max={2147483647} value={seed}
          onChange={e => { setPlaying(false); setCustom(null);
            setSeed(Math.max(0, Math.min(2147483647, Math.floor(Number(e.target.value) || 0)))); }}/>
      </label>
      <WatercolourSlider label="Cotton-paper tooth" value={tooth} step={.05}
        onChange={value => { setPlaying(false); setCustom(null); setTooth(value); }}/>
      <label style={{ display: "flex", alignItems: "center", gap: 7, minHeight: 40,
        fontSize: 13, fontWeight: 700 }}>
        <input aria-label="Illustration reduced motion" type="checkbox"
          checked={reduced} onChange={e => { setPlaying(false); setReduced(e.target.checked); }}/>
        Reduced motion
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 7, minHeight: 40,
        fontSize: 13, fontWeight: 700 }}>
        <input aria-label="Illustration fine detail" type="checkbox"
          checked={details} onChange={e => { setPlaying(false); setDetails(e.target.checked); }}/>
        Fine detail
      </label>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
      <button type="button" style={control} onClick={() => {
        if (playing) { setPlaying(false); return; }
        if (frame === TOTAL - 1) setFrame(0);
        setPlaying(true);
      }}>{playing ? "Pause animation" : "Play 12-second painting"}</button>
      {[0, 60, 130, 190, 265, 359].map(f =>
        <button key={f} type="button" style={control}
          onClick={() => { setPlaying(false); setFrame(f); }}>Frame {f}</button>)}
    </div>
    <label style={{ display: "grid", gap: 4, maxWidth: 930, fontSize: 13, fontWeight: 700 }}>
      Timeline / absolute film frame {frame} of {TOTAL - 1}
      <input type="range" min={0} max={TOTAL - 1} value={frame}
        aria-label="Illustration film frame"
        onChange={e => { setPlaying(false); setFrame(Number(e.target.value)); }}/>
    </label>
    <WatercolourFilmViewport width={film.width} height={film.height} maxWidth={960}>
      {scale => <FilmStage film={film} frame={frame} reducedMotion={reduced}
        renderObject={() => null}
        renderSlot={(content, ctx) => {
          if (content.slot !== "watercolour-illustration")
            throw new RangeError("Invalid watercolor art slot.");
          return <WatercolourIllustration spec={painting} frame={ctx.frame}
            reducedMotion={ctx.reducedMotion}/>;
        }} style={{ transform: "scale(" + scale + ")",
          transformOrigin: "top left" }}/>}
    </WatercolourFilmViewport>
    <WatercolourParameterEditor title="Art-directed scene graph" value={artwork}
      validate={candidate => {
        const basic = inspectJsonObject(candidate);
        if (basic.length) return basic;
        const scene = candidate as WatercolourArtwork;
        const errors = inspectWatercolourArtwork(scene);
        if (scene.width !== film.width || scene.height !== film.height)
          errors.push("/artboard must match active FilmStage output");
        return errors;
      }} onApply={value => { setPlaying(false); setCustom(value); }}
      onReset={() => { setPlaying(false); setCustom(null); }}
      notes="Adjust any path, palette, part hierarchy, pivot, keyframe or pigment deposit. Every edit is preflighted before rendering. No scripts or remote assets are interpreted."/>
    <p style={{ margin: 0, maxWidth: 900, color: "#647570",
      lineHeight: 1.55, fontSize: 13 }}>
      ArtCraft v6: source → anatomy/attachment graph → original authored geometry →
      timed motion → visual critique. No master artwork is traced or bundled.
      This is a technical illustration proof, not a professional fidelity certificate.
    </p>
  </main>;
}

const meta = { title: "Video Production/Film Looks/Watercolour & Brush/05 Illustration Director",
  id: "film-art-watercolour-art-director", component: IllustrationDirector,
  parameters: { layout: "fullscreen" } } satisfies Meta<typeof IllustrationDirector>;
export default meta;
type Story = StoryObj<typeof meta>;
export const HeronWetlandFilm: Story = { render: () => <IllustrationDirector/> };
