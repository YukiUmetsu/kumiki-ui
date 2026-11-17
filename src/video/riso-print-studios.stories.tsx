import { RisoSheetFeed, completedRisoFrame } from "../../registry/video/riso-sheet-feed";
import { RisoOverprintTransition } from "../../registry/video/riso-overprint";
import { risoSecondSheetArtworks, risoSecondSheetImprintArt } from "./riso-print-demo-alt";
import { RISO_SHEET_FEED_FILM, RISO_OVERPRINT_FILM, RISO_OVERPRINT_MOTIF, risoOverprintOrigin } from "./riso-print-film";
import { useEffect, useMemo, useState } from "react";
import { RisoPrint } from "../../registry/video/print-plates-react";
import {RisoGradientStudio} from "./riso-gradient-studio";
import {RisoBrushStudio} from "./riso-brush-studio";
import {RisoDryBrushFilmStudio} from "./riso-dry-brush-film-studio";
import {RisoCinematicStudio} from "./riso-cinematic-studio";
import {RisoRegistrationPreflightStudio} from "./riso-registration-proof-studio";
import {RisoContactTrapStudio} from "./riso-contact-trap-studio";
import {RisoTopologyGuardStudio} from "./riso-topology-guard-studio";
import {RisoMasterSeparationStudio} from "./riso-master-separation-studio";
import {RisoPressDeliveryStudio} from "./riso-press-delivery-studio";
import {RisoShopProofStudio} from "./riso-shop-proof-studio";
import {RisoDrumPressureArtStudio} from "./riso75-drum-pressure-art-studio";
import {RisoTornCollageStudio} from "./riso76-paper-collage-studio";
import {RisoRostrumCollageStudio} from "./riso77-rostrum-studio";
import {RisoAccordionPrintedFilmStudio} from "./riso78-accordion-studio";
import type { RisoScreenMode } from "../../registry/video/riso-screening";
import { compileFilm } from "../../registry/video/film-document";
import { FilmStage } from "../../registry/video/film-stage";
import type { RisoAspect, RisoLayer } from "./riso-print-demo";
import { risoExampleArtworks, risoExampleSpec } from "./riso-print-demo";
import { RISO_PRINT_FILM } from "./riso-print-film";
import type { Meta, StoryObj } from "@storybook/react-vite";

/** All Risograph printing and film studios share the same Storybook group. */
const risoUi = {
  page: { padding: 20, display: "grid", gap: 16, background: "var(--km-surface-canvas, #F7F7F7)",
    color: "var(--km-text-primary, #28313B)", minHeight: "100vh", font: "15px/1.4 var(--km-font-body, system-ui, sans-serif)" },
  toolbar: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10 },
  button: { border: "1px solid #A9B2B8", borderRadius: 7, background: "#FFFFFF",
    color: "#263745", padding: "9px 14px", minHeight: 40, cursor: "pointer", font: "600 13px system-ui" },
  label: { display: "grid", gap: 4, font: "600 13px system-ui", minWidth: 160, flex: 1 },
} as const;

const RISO_MAX_FRAME = 260;
function RisoLab() {
  const [frame, setFrame] = useState(240);
  const [playing, setPlaying] = useState(false);
  const [aspect, setAspect] = useState<RisoAspect>("landscape");
  const [mode, setMode] = useState<RisoLayer>("both");
  const [seed, setSeed] = useState(23);
  const [registration, setRegistration] = useState(3);
  const [grain, setGrain] = useState(.55);
  const [screenMode, setScreenMode] = useState<RisoScreenMode>("am");
  const [screenDensity, setScreenDensity] = useState(.32);
  const [dotGain, setDotGain] = useState(0);
  const [reduce, setReduce] = useState(false);
  const spec = useMemo(() => {
    const base = risoExampleSpec(aspect, seed);
    return { ...base, plates: base.plates.map(p => ({ ...p,
      opacity: mode === "both" || p.id === mode ? p.opacity : 0 })) };
  }, [aspect, seed, mode]);
  const artworks = useMemo(() => risoExampleArtworks(aspect), [aspect]);
  useEffect(() => {
    if (!playing) return;
    const started = performance.now(), initialFrame = frame;
    let animation = 0;
    const tick = (now: number) => {
      const next = Math.min(RISO_MAX_FRAME, initialFrame + Math.floor((now - started) * 30 / 1000));
      setFrame(next);
      if (next < RISO_MAX_FRAME) animation = requestAnimationFrame(tick);
      else setPlaying(false);
    };
    animation = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animation);
    // The animation advances from the frame where Play was pressed, rather than restarting at each tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);
  const status = mode !== "both" ? (mode === "blue" ? "Plate A · cobalt" : "Plate B · vermilion") :
    reduce || frame >= 191 ? "Both inks printed" :
    frame < 12 ? "Unprinted sheet" : frame < 88 ? "Printing cobalt" :
    frame < 115 ? "Cobalt finished" : "Printing vermilion";
  const pickLayer = (value: RisoLayer) => { setPlaying(false); setMode(value); if (value !== "both") setFrame(240); };
  return <div style={risoUi.page}>
    <header style={{ maxWidth: 960, display: "grid", gap: 4 }}>
      <div style={{ fontSize: 12, letterSpacing: 2.2, fontWeight: 700, textTransform: "uppercase", color: "#865D44" }}>
        Printmaking / Material-native film
      </div>
      <h1 style={{ margin: 0, font: "600 clamp(23px, 3vw, 35px)/1.16 Georgia, serif" }}>Risograph · Two-Ink Printing</h1>
      <p style={{ margin: 0, color: "var(--km-text-secondary, #56616B)", maxWidth: 760 }}>
        Independent spot-ink artwork, AM/FM ink screens, variable dot gain, transparent overprint, fixed registration and paper grain.
        The poster is an original neutral illustration—not a photograph processed with a filter.
      </p>
    </header>
    <div style={{ width: "100%", maxWidth: aspect === "landscape" ? 960 : 470, boxShadow: "0 10px 40px rgba(49,38,27,.13)" }}>
      <RisoPrint spec={spec} frame={mode === "both" ? frame : 240} artworks={artworks}
        misregistration={registration / 12} paperGrain={grain} reducedMotion={reduce}
        screenMode={screenMode} screenDensity={screenDensity} dotGain={dotGain}
        label="Original Risograph-style editorial poster: ocean currents in cobalt and vermilion ink" />
    </div>
    <div aria-live="polite" style={{ maxWidth: 960, display: "flex", gap: 14, justifyContent: "space-between", flexWrap: "wrap" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
        <span aria-hidden style={{ width: 11, height: 11, borderRadius: "50%", background: "#2362A0" }} />
        Cobalt <span aria-hidden style={{ width: 11, height: 11, borderRadius: "50%", background: "#DD593D" }} /> Vermilion
      </span>
      <span style={{ fontWeight: 600 }}>{status}</span>
    </div>
    <div style={{ ...risoUi.toolbar, maxWidth: 960 }}>
      <button type="button" style={risoUi.button} onClick={() => {
        setMode("both");
        if (frame >= RISO_MAX_FRAME) setFrame(0);
        setPlaying(value => !value);
      }}>{playing ? "Pause" : frame >= RISO_MAX_FRAME ? "Replay" : "Play"}</button>
      <label style={{ ...risoUi.label, flex: 2 }}>
        Printing sequence · frame {frame} / {RISO_MAX_FRAME}
        <input aria-label="Printing sequence" type="range" min={0} max={RISO_MAX_FRAME} value={frame}
          onChange={e => { setPlaying(false); setMode("both"); setFrame(Number(e.target.value)); }} />
      </label>
    </div>
    <div role="group" aria-label="Ink separation" style={{ ...risoUi.toolbar, maxWidth: 960 }}>
      {([["both", "Both inks"], ["blue", "Cobalt only"], ["red", "Vermilion only"]] as const).map(([id, label]) =>
        <button key={id} type="button" aria-pressed={mode === id} onClick={() => pickLayer(id)}
          style={{ ...risoUi.button, background: mode === id ? "#263745" : "#FFFFFF", color: mode === id ? "#FFFFFF" : "#263745" }}>{label}</button>)}
    </div>
    <div style={{ ...risoUi.toolbar, maxWidth: 960, alignItems: "end" }}>
      <label style={risoUi.label}>Aspect ratio
        <select value={aspect} onChange={e => { setPlaying(false); setAspect(e.target.value as RisoAspect); }} style={{ minHeight: 38, font: "inherit" }}>
          <option value="landscape">16:9 Landscape</option><option value="portrait">9:16 Portrait</option>
        </select>
      </label>
      <label style={risoUi.label}>Registration · {registration}px
        <input type="range" min={0} max={12} value={registration} onChange={e => setRegistration(Number(e.target.value))} />
      </label>
      <label style={risoUi.label}>Paper texture · {Math.round(grain * 100)}%
        <input type="range" min={0} max={1} step={.05} value={grain} onChange={e => setGrain(Number(e.target.value))} />
      </label>
      <label style={risoUi.label}>Screening method
        <select aria-label="Screening method" value={screenMode}
          onChange={e => setScreenMode(e.target.value as RisoScreenMode)} style={{ minHeight: 38, font: "inherit" }}>
          <option value="am">AM · variable-size halftone</option>
          <option value="fm">FM · dispersed ink dots</option>
        </select>
      </label>
      <label style={risoUi.label}>Screen tone · {Math.round(screenDensity * 100)}%
        <input aria-label="Screen tone" type="range" min={0} max={1} step={.02} value={screenDensity}
          onChange={e => setScreenDensity(Number(e.target.value))} />
      </label>
      <label style={risoUi.label}>Dot gain · {Math.round(dotGain * 100)}%
        <input aria-label="Dot gain" type="range" min={0} max={1} step={.05} value={dotGain}
          onChange={e => setDotGain(Number(e.target.value))} />
      </label>
      <label style={risoUi.label}>Print seed
        <input type="number" min={0} max={2147483647} step={1} value={seed} style={{ minHeight: 38, font: "inherit" }}
          onChange={e => setSeed(Math.max(0, Math.min(2147483647, Math.floor(Number(e.target.value) || 0))))} />
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 9, minHeight: 38, font: "600 13px system-ui" }}>
        <input type="checkbox" checked={reduce} onChange={e => { setPlaying(false); setReduce(e.target.checked); }} /> Reduced motion
      </label>
    </div>
    <p style={{ margin: 0, maxWidth: 850, fontSize: 13, color: "var(--km-text-secondary, #56616B)" }}>
      RISO20 screen study: AM dots grow with tone; FM disperses seeded, paper-locked individual deposits.
      Dot gain expands ink deposition rather than applying a whole-image filter. This is a digital print model,
      not a measured scanner or drum profile. Plate-registered details and overprint are preserved.
    </p>
  </div>;
}

/** A real three-shot FD1 film, not a second timeline or a standalone Storybook-only playback engine. */
function RisoFilmLab() {
  const [aspect, setAspect] = useState<RisoAspect>("landscape");
  const [frame, setFrame] = useState(215);
  const compiled = useMemo(() => compileFilm(RISO_PRINT_FILM, { outputId: aspect }), [aspect]);
  const spec = useMemo(() => risoExampleSpec(aspect), [aspect]);
  const artworks = useMemo(() => risoExampleArtworks(aspect), [aspect]);
  if (!compiled.ok) return <pre>{compiled.diagnostics.map(item => item.path + ": " + item.message).join("\n")}</pre>;
  const film = compiled.film;
  const scale = aspect === "landscape" ? 1 : .65;
  return <div style={risoUi.page}>
    <h1 style={{ margin: 0, font: "600 28px Georgia,serif" }}>Risograph · Film Stage (3 Shots)</h1>
    <p style={{ maxWidth: 850, margin: 0 }}>Blue plate → red plate → finished overprint. All three shots
      compile through Kumiki's existing Film Document and Film Stage; scrubbing works in any frame order.</p>
    <div style={risoUi.toolbar}>
      <label>Output <select value={aspect} onChange={e => setAspect(e.target.value as RisoAspect)} style={{ marginLeft: 8 }}>
        <option value="landscape">16:9</option><option value="portrait">9:16</option>
      </select></label>
      <label style={{ ...risoUi.label, maxWidth: 700 }}>Film frame {frame} / {film.durationFrames - 1}
        <input type="range" min={0} max={film.durationFrames - 1} value={frame}
          onChange={e => setFrame(Number(e.target.value))}/>
      </label>
    </div>
    <div style={{ width: film.width * scale, height: film.height * scale, maxWidth: "100%", overflow: "hidden" }}>
      <FilmStage film={film} frame={frame} renderObject={() => null} reducedMotion={false}
        renderSlot={(content, context) => {
          if (content.slot !== "riso-print-study") throw new Error("Unknown print slot: " + content.slot);
          const offset = Number(content.props?.offsetFrame ?? 0);
          return <RisoPrint spec={spec} frame={offset + context.frame} artworks={artworks}
            misregistration={.25} paperGrain={.55} reducedMotion={context.reducedMotion}/>;
        }}
        style={{ transform: "scale(" + scale + ")", transformOrigin: "top left" }}/>
    </div>
    <p style={{ fontSize: 13, color: "var(--km-text-secondary, #56616B)", margin: 0 }}>
      Shot 1: 0–109 · Shot 2: 110–219 · Shot 3: 220–389. The FilmStage slot passes its scene frame to the print renderer.
    </p>
  </div>;
}

export const RisographTwoInk: StoryObj<typeof RisoLab> = {
  name: "Risograph · Two-Ink Printing",
  render: () => <RisoLab />,
};
export const RisographFilm: StoryObj<typeof RisoFilmLab> = {
  name: "Risograph · 3-Shot Film Stage",
  render: () => <RisoFilmLab />,
};


/**
 * A different original poster appears by paper feed and two ink passes. The Stage
 * remains FilmStage; there is deliberately no new editor section or film timebase.
 */
function RisoSheetFilmLab() {
  const [aspect, setAspect] = useState<RisoAspect>("landscape");
  const [frame, setFrame] = useState(465);
  const [paperGrain, setPaperGrain] = useState(.55);
  const [misregistration, setMisregistration] = useState(3);
  const [reducedMotion, setReducedMotion] = useState(false);
  const compiled = useMemo(() => compileFilm(RISO_SHEET_FEED_FILM, { outputId: aspect }), [aspect]);
  const firstSpec = useMemo(() => risoExampleSpec(aspect), [aspect]);
  const nextSpec = useMemo(() => risoExampleSpec(aspect, 37), [aspect]);
  const firstArt = useMemo(() => risoExampleArtworks(aspect), [aspect]);
  const nextArt = useMemo(() => risoSecondSheetArtworks(aspect), [aspect]);
  if (!compiled.ok) return <pre role="alert">{compiled.diagnostics.map(item => item.path + ": " + item.message).join("\n")}</pre>;
  const film = compiled.film, scale = aspect === "landscape" ? 1 : .65;
  const outgoing = { spec: firstSpec, artworks: firstArt };
  const incoming = { spec: nextSpec, artworks: nextArt };
  return <div style={risoUi.page}>
    <div style={{ maxWidth: 960 }}>
      <div style={{ color: "#865D44", fontSize: 12, fontWeight: 700, letterSpacing: 2.2, textTransform: "uppercase" }}>
        Printmaking / Native scene transition
      </div>
      <h1 style={{ margin: "6px 0 8px", font: "600 clamp(23px, 3vw, 34px)/1.15 Georgia, serif" }}>
        Risograph · Sheet Feed Between Films
      </h1>
      <p style={{ margin: 0, color: "var(--km-text-secondary, #56616B)" }}>
        The first printed editorial sheet advances into a different original artwork.
        The incoming cobalt and vermilion inks arrive in order as the new sheet passes the roller.
      </p>
    </div>
    <div style={risoUi.toolbar}>
      <label style={risoUi.label}>Output
        <select value={aspect} onChange={e => setAspect(e.target.value as RisoAspect)} style={{ font: "inherit", minHeight: 38 }}>
          <option value="landscape">16:9 landscape</option><option value="portrait">9:16 portrait</option>
        </select>
      </label>
      <label style={risoUi.label}>Registration · {misregistration}px
        <input type="range" min={0} max={12} value={misregistration} onChange={e => setMisregistration(Number(e.target.value))}/>
      </label>
      <label style={risoUi.label}>Paper grain · {Math.round(paperGrain * 100)}%
        <input type="range" min={0} max={1} step={.05} value={paperGrain} onChange={e => setPaperGrain(Number(e.target.value))}/>
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 10, font: "600 13px system-ui" }}>
        <input type="checkbox" checked={reducedMotion} onChange={e => setReducedMotion(e.target.checked)}/>
        Reduced motion
      </label>
    </div>
    <div style={{ width: "100%", maxWidth: 960, display: "grid", gap: 8 }}>
      <label style={{ display: "grid", gap: 4, font: "600 13px system-ui" }}>
        Film frame {frame} / {film.durationFrames - 1}
        <input aria-label="Film frame" type="range" min={0} max={film.durationFrames - 1} value={frame}
          onChange={e => setFrame(Number(e.target.value))}/>
      </label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {([["First sheet", 330], ["Feed begins", 392], ["Halfway", 480], ["New sheet", 570], ["Hold", 660]] as const).map(([label, at]) =>
          <button key={label} type="button" onClick={() => setFrame(at)} style={risoUi.button}>{label}</button>)}
      </div>
    </div>
    <div style={{ width: film.width * scale, height: film.height * scale, maxWidth: "100%", overflow: "hidden",
      boxShadow: "0 10px 40px rgba(49,38,27,.13)" }}>
      <FilmStage film={film} frame={frame} renderObject={() => null} reducedMotion={reducedMotion}
        renderSlot={(content, context) => {
          if (content.slot === "riso-print-study") return <RisoPrint spec={firstSpec} artworks={firstArt}
            frame={Number(content.props?.offsetFrame ?? 0) + context.frame} misregistration={misregistration / 12}
            paperGrain={paperGrain} reducedMotion={context.reducedMotion}/>;
          if (content.slot === "riso-sheet-feed") return <RisoSheetFeed outgoing={outgoing} incoming={incoming}
            frame={context.frame} startFrame={0} durationFrames={170} reducedMotion={context.reducedMotion}
            paperGrain={paperGrain} misregistration={misregistration / 12}/>;
          if (content.slot === "riso-next-print") return <RisoPrint spec={nextSpec} artworks={nextArt}
            frame={completedRisoFrame(nextSpec)} reducedMotion={context.reducedMotion}
            misregistration={misregistration / 12} paperGrain={paperGrain}/>;
          throw new Error("Unknown print scene slot: " + content.slot);
        }}
        style={{ transform: "scale(" + scale + ")", transformOrigin: "top left" }}/>
    </div>
    <p style={{ margin: 0, maxWidth: 960, color: "var(--km-text-secondary, #56616B)", fontSize: 13 }}>
      Scenes 1–3 develop the first print. Scene 4 feeds a new sheet with sequential spot-ink passes.
      Scene 5 holds the second print. All state comes from the existing FilmStage frame.
    </p>
  </div>;
}
export const RisographSheetFeed: StoryObj<typeof RisoSheetFilmLab> = {
  name: "Risograph · Paper Feed Transition",
  render: () => <RisoSheetFilmLab />,
};

/** An authored spot-ink impression, not a generic masked scene wipe.
 * The current FilmStage controls the absolute frame and both independently drawn sheets.
 */
function RisoOverprintLab() {
  const [aspect, setAspect] = useState<RisoAspect>("landscape");
  const [frame, setFrame] = useState(480);
  const [registration, setRegistration] = useState(3);
  const [paperGrain, setPaperGrain] = useState(.55);
  const [reduce, setReduce] = useState(false);
  const compiled = useMemo(() => compileFilm(RISO_OVERPRINT_FILM, { outputId: aspect }), [aspect]);
  const specA = useMemo(() => risoExampleSpec(aspect), [aspect]);
  const specB = useMemo(() => risoExampleSpec(aspect, 37), [aspect]);
  const artA = useMemo(() => risoExampleArtworks(aspect), [aspect]);
  const artB = useMemo(() => risoSecondSheetArtworks(aspect), [aspect]);
  if (!compiled.ok) return <pre role="alert">{compiled.diagnostics.map(item => item.path + ": " + item.message).join("\n")}</pre>;
  const film = compiled.film;
  const scale = aspect === "landscape" ? 1 : .65;
  return <div style={risoUi.page}>
    <div style={{ maxWidth: 960 }}>
      <div style={{ color: "#865D44", fontSize: 12, fontWeight: 700, letterSpacing: 2.2, textTransform: "uppercase" }}>
        Printmaking / Native spot-ink transition
      </div>
      <h1 style={{ margin: "6px 0 8px", font: "600 clamp(23px, 3vw, 34px)/1.15 Georgia, serif" }}>
        Risograph · Overprint Into New Scene
      </h1>
      <p style={{ margin: 0 }}>The incoming vermilion ink first stamps over the fully printed first sheet.
        The two layers multiply optically; the second paper replaces the first through an expanding ink-contour knockout, not ghosted crossfade.</p>
    </div>
    <div style={risoUi.toolbar}>
      <label style={risoUi.label}>Output
        <select value={aspect} onChange={e => setAspect(e.target.value as RisoAspect)} style={{ font: "inherit", minHeight: 38 }}>
          <option value="landscape">16:9 landscape</option><option value="portrait">9:16 portrait</option>
        </select>
      </label>
      <label style={risoUi.label}>Registration · {registration}px
        <input type="range" min={0} max={12} value={registration} onChange={e => setRegistration(Number(e.target.value))} />
      </label>
      <label style={risoUi.label}>Paper grain · {Math.round(paperGrain * 100)}%
        <input type="range" min={0} max={1} step={.05} value={paperGrain} onChange={e => setPaperGrain(Number(e.target.value))} />
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 10, font: "600 13px system-ui" }}>
        <input type="checkbox" checked={reduce} onChange={e => setReduce(e.target.checked)}/> Reduced motion
      </label>
    </div>
    <div style={{ width: "100%", maxWidth: 960, display: "grid", gap: 8 }}>
      <label style={{ display: "grid", gap: 4, font: "600 13px system-ui" }}>Film frame {frame} / {film.durationFrames - 1}
        <input aria-label="Overprint film frame" type="range" min={0} max={film.durationFrames - 1}
          value={frame} onChange={e => setFrame(Number(e.target.value))} />
      </label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {([["Old print", 389], ["Stamp begins", 405], ["Overprint", 480],
          ["Paper resolves", 540], ["New print", 570]] as const).map(([title, at]) =>
          <button key={title} type="button" style={risoUi.button} onClick={() => setFrame(at)}>{title}</button>)}
      </div>
    </div>
    <div style={{ width: film.width * scale, height: film.height * scale, maxWidth: "100%", overflow: "hidden",
      boxShadow: "0 10px 40px rgba(49,38,27,.13)" }}>
      <FilmStage film={film} frame={frame} renderObject={() => null} reducedMotion={reduce}
        renderSlot={(content, context) => {
          if (content.slot === "riso-print-study") return <RisoPrint spec={specA} artworks={artA}
            frame={Number(content.props?.offsetFrame ?? 0) + context.frame}
            misregistration={registration / 12} paperGrain={paperGrain} reducedMotion={context.reducedMotion}/>;
          if (content.slot === "riso-overprint") return <RisoOverprintTransition
            outgoing={{ spec: specA, artworks: artA }} incoming={{ spec: specB, artworks: artB }}
            imprintPath={RISO_OVERPRINT_MOTIF} imprintOrigin={risoOverprintOrigin(aspect)}
            imprintPlateId="red" imprintArtwork={risoSecondSheetImprintArt(aspect)} frame={context.frame} startFrame={0} durationFrames={179}
            paperGrain={paperGrain} misregistration={registration / 12} reducedMotion={context.reducedMotion}/>;
          if (content.slot === "riso-next-print") return <RisoPrint spec={specB} artworks={artB}
            frame={completedRisoFrame(specB)} misregistration={registration / 12}
            paperGrain={paperGrain} reducedMotion={context.reducedMotion}/>;
          throw new Error("Unknown native overprint film slot: " + content.slot);
        }} style={{ transform: "scale(" + scale + ")", transformOrigin: "top left" }}/>
    </div>
    <p style={{ margin: 0, fontSize: 13, maxWidth: 960 }}>
      The first three shots print the original poster; shot four uses the incoming red spot-ink plate as a stamp.
      The fifth holds the fully resolved new poster. Frame 569 and frame 570 have the same completed material state.
    </p>
  </div>;
}

export const RisographOverprint: StoryObj<typeof RisoOverprintLab> = {
  name: "Risograph · Native Overprint Transition",
  render: () => <RisoOverprintLab />,
};

/** Native paper-space tonal gradient proof; no human actors or hand studies. */
export const RisographGradientInk:StoryObj<typeof RisoGradientStudio>={
  name:"Risograph · Continuous Spot-Ink Gradient",
  render:()=> <RisoGradientStudio/>,
};

/** Independent source-native dry-ink pressure and splintering, non-human. */
export const RisographDryBrush:StoryObj<typeof RisoBrushStudio>={
  name:"Risograph · Dry-Brush Ink Atelier",
  render:()=> <RisoBrushStudio/>,
};

/** Existing FD1 production capture and MP4 proof of the exact RISO62 artist's ink. */
export const RisographDryBrushFilm:StoryObj<typeof RisoDryBrushFilmStudio>={
  name:"Risograph · Dry-Brush Production Film",
  render:()=> <RisoDryBrushFilmStudio/>,
};

/** Existing FilmStage and original RISO62 materials, now with five authored camera/press beats. */
export const RisographCinematicJourney:StoryObj<typeof RisoCinematicStudio>={
  name:"Risograph · Two-Drum Cinematic Journey",
  render:()=> <RisoCinematicStudio/>,
};

/** Interactive A/B original native stencil registration and numeric trap budget; no hands. */
export const RisographRegistrationPreflight:StoryObj<typeof RisoRegistrationPreflightStudio>={
  name:"Risograph · Registration Preflight",
  render:()=> <RisoRegistrationPreflightStudio/>,
};

/** Physical two-master ArtCraft contact-edge source proof; no human hands. */
export const RisographContactEdgeTrap:StoryObj<typeof RisoContactTrapStudio>={
  name:"Risograph · Native Shared-Edge Trapping",
  render:()=> <RisoContactTrapStudio/>,
};

/** RISO67 actual SVG quadratic self-contact & paper-opening safety demo. */
export const RisographTopologySafety:StoryObj<typeof RisoTopologyGuardStudio>={
  name:"Risograph · Native Stencil Topology Guard",
  render:()=> <RisoTopologyGuardStudio/>,
};

/** Two complete original K-only physical ink masters with measured print-shop controls. */
export const RisographMasterSeparation:StoryObj<typeof RisoMasterSeparationStudio>={
  name:"Risograph · Native Grayscale Master Separation",
  render:()=> <RisoMasterSeparationStudio/>,
};

/** Real grayscale PDF and TIFF per-ink print deliverables; no human hands. */
export const RisographPressDelivery:StoryObj<typeof RisoPressDeliveryStudio>={
  name:"Risograph · Physical PDF and TIFF Master Delivery",
  render:()=> <RisoPressDeliveryStudio/>,
};

/** Physical paper margins and actual/manual vs simulated drum proof, no hand art. */
export const RisographShopScanProof:StoryObj<typeof RisoShopProofStudio>={
  name:"Risograph · Printer Profile and Scan Registration Lab",
  render:()=> <RisoShopProofStudio/>,
};

/** RISO75 artist-authored dual-drum paper-locked contact material; not a scanner QA UI. */
export const RisographDrumContact:StoryObj<typeof RisoDrumPressureArtStudio>={
  name:"Risograph · Native Ink Drum Contact",
  render:()=> <RisoDrumPressureArtStudio/>,
};

/** Source-native FD1 physical zine collage transition: two original ink images. */
export const RisographTornPaperCollage:StoryObj<typeof RisoTornCollageStudio>={
  name:"Risograph · Torn-Print Fibre Collage Film",
  render:()=> <RisoTornCollageStudio/>,
};

/** RISO77: original independently mounted, animated spot-ink paper cutouts. */
export const RisographKineticRostrum:StoryObj<typeof RisoRostrumCollageStudio>={
  name:"Risograph · Kinetic Printed Paper Cutouts",
  render:()=> <RisoRostrumCollageStudio/>,
};

/** RISO78: physical accordion fold on ONE continuous original spot-ink sheet. */
export const RisographContinuousAccordion:StoryObj<typeof RisoAccordionPrintedFilmStudio>={
  name:"Risograph · Continuous Printed Accordion Zine",
  render:()=> <RisoAccordionPrintedFilmStudio/>,
};

const meta = {
  title: "Video production/Film Looks/Risograph",
  id: "video-riso-print-lab",
  component: RisoLab,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof RisoLab>;
export default meta;
