import { InkWash } from "../../registry/video/ink-wash-react";
import { inkExampleSpec } from "./ink-wash-demo";
import type { InkSubject } from "./ink-wash-demo";
import { InkFilm } from "./ink-wash-universal.stories";
import { InkPerformanceFilm } from "./ink-wash-character.stories";
import { INK_LOOKS } from "../../registry/video/ink-wash-story";
import type { InkLookId } from "../../registry/video/ink-wash-story";
import { RisoSheetFeed, completedRisoFrame } from "../../registry/video/riso-sheet-feed";
import { RisoOverprintTransition } from "../../registry/video/riso-overprint";
import { risoSecondSheetArtworks, risoSecondSheetImprintArt } from "./riso-print-demo-alt";
import { RISO_SHEET_FEED_FILM, RISO_OVERPRINT_FILM, RISO_OVERPRINT_MOTIF, risoOverprintOrigin } from "./riso-print-film";
import { useEffect, useMemo, useState } from "react";
import { RisoPrint } from "../../registry/video/print-plates-react";
import { compileFilm } from "../../registry/video/film-document";
import { FilmStage } from "../../registry/video/film-stage";
import type { RisoAspect, RisoLayer } from "./riso-print-demo";
import { risoExampleArtworks, risoExampleSpec } from "./riso-print-demo";
import { RISO_PRINT_FILM } from "./riso-print-film";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { FilmLookLayer } from "../../registry/video/film-look-react";
import { LOOK_MOODS, LOOK_PRESETS, LOOK_PRESET_IDS, resolveLook } from "../../registry/video/film-look";
import type { LookMood, LookPresetId } from "../../registry/video/film-look";
import { StudioCaption } from "../../registry/visual/studio-recipes-react";
import nightStreet from "../../assets/photos/look-plates/night-neon-street.jpg?url";
import summerBeach from "../../assets/photos/look-plates/summer-beach.jpg?url";
import mountainsDusk from "../../assets/photos/look-plates/mountains-dusk.jpg?url";
import neonSilhouette from "../../assets/photos/look-plates/neon-silhouette.jpg?url";

/** CC0 photographs from Wikimedia Commons (see assets/THIRD_PARTY_ASSETS.json): real light, skin, sky and practicals to judge a look
 * on. A painted test card shows a curve; a photograph shows a feeling. */
const PLATES = { "night-street": nightStreet, beach: summerBeach, "dusk-mountains": mountainsDusk, "neon-silhouette": neonSilhouette } as const;
type PlateId = keyof typeof PLATES;
function Plate({ plate, preset, mood, frame = 30, width, height, title }: { plate: PlateId; preset: LookPresetId; mood?: LookMood[]; frame?: number; width: number; height: number; title?: string }) {
  const look = resolveLook({ preset, mood });
  return <div style={{ position: "relative", width, height, overflow: "hidden", background: "#000", containerType: "size" }}>
    <FilmLookLayer look={look} frame={frame} fps={30} width={width} height={height} seed={5}>
      <img src={PLATES[plate]} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      {title && <StudioCaption beat={{ text: title, enter: 0 }} frame={frame + 20} />}
    </FilmLookLayer>
  </div>;
}
/** One plate, half untouched and half in a look, split down the middle at full size: the clearest way to see what a look does. */
function Split({ plate, preset, mood, width = 1280, height = 720 }: { plate: PlateId; preset: LookPresetId; mood?: LookMood[]; width?: number; height?: number }) {
  return <div style={{ position: "relative", width, height, overflow: "hidden" }}>
    <Plate plate={plate} preset="studio-clean" width={width} height={height} />
    <div style={{ position: "absolute", inset: 0, clipPath: "inset(0 0 0 50%)" }}><Plate plate={plate} preset={preset} mood={mood} width={width} height={height} /></div>
    <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 2, background: "rgba(255,255,255,.8)" }} />
    <div style={{ position: "absolute", left: 16, top: 12, color: "#fff", font: "600 15px system-ui", textShadow: "0 1px 3px #000" }}>untouched</div>
    <div style={{ position: "absolute", right: 16, top: 12, color: "#fff", font: "600 15px system-ui", textShadow: "0 1px 3px #000" }}>{LOOK_PRESETS[preset].title}{mood?.length ? ` · ${mood.join(", ")}` : ""}</div>
  </div>;
}
const board = (plate: PlateId) => <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 512px)", gap: 8, padding: 8, background: "#111" }}>
  {LOOK_PRESET_IDS.map(id => <figure key={id} style={{ margin: 0 }}><Plate plate={plate} preset={id} width={512} height={288} />
    <figcaption style={{ color: "#ddd", font: "600 13px system-ui", padding: "4px 2px" }}>{LOOK_PRESETS[id].title} · <span style={{ fontWeight: 400, opacity: .75 }}>{LOOK_PRESETS[id].character}</span></figcaption></figure>)}
</div>;

/** A test card for a look: a dusk sky with a bright sun (glow and streaks), a grey ramp and colour patches (the grade), skin tones and
 * a title (type and legibility). */
function TestCard({ width, height, frame }: { width: number; height: number; frame: number }) {
  const patches = ["#735244", "#c29682", "#627a9d", "#576c43", "#8580b1", "#67bdaa", "#d67e2c", "#505ba6", "#c15a63", "#5e3c6c", "#9dbc40", "#e0a32e", "#383d96", "#469449", "#af363c", "#e7c71f", "#bb5695", "#0885a1"];
  return <div style={{ position: "absolute", inset: 0, containerType: "size", background: "linear-gradient(180deg, #1d2b52 0%, #6b5b8e 38%, #e79a6a 62%, #3a2a2a 63%, #1a1514 100%)" }}>
    <div style={{ position: "absolute", left: "68%", top: "44%", width: "7cqh", height: "7cqh", borderRadius: "50%", background: "radial-gradient(circle, #fff 0 55%, #ffe8c0 70%, rgba(255,200,150,0) 100%)" }} />
    <div style={{ position: "absolute", left: "8%", right: "8%", top: "70%", height: "6%", background: "linear-gradient(90deg, #000, #fff)" }} />
    <div style={{ position: "absolute", left: "8%", right: "40%", top: "79%", height: "13%", display: "grid", gridTemplateColumns: "repeat(9, 1fr)", gap: "0.6cqh" }}>
      {patches.map(c => <div key={c} style={{ background: c }} />)}
    </div>
    <div style={{ position: "absolute", left: "64%", right: "8%", top: "79%", height: "13%", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.6cqh" }}>
      {["#f3d3c3", "#d8a98c", "#a8714f", "#5c3a28"].map(c => <div key={c} style={{ background: c, borderRadius: "1cqh" }} />)}
    </div>
    <StudioCaption position="top" beat={{ text: "Every frame tells", sub: "A test card for a look", enter: 0 }} frame={frame + 20} />
    <div style={{ position: "absolute", inset: 0, width, height }} />
  </div>;
}
function Card({ preset, mood, frame = 30, width = 960, height = 540 }: { preset: LookPresetId; mood?: LookMood[]; frame?: number; width?: number; height?: number }) {
  const look = resolveLook({ preset, mood });
  return <div style={{ position: "relative", width, height, overflow: "hidden", background: "#000" }}>
    <FilmLookLayer look={look} frame={frame} fps={30} width={width} height={height} seed={3}><TestCard width={width} height={height} frame={frame} /></FilmLookLayer>
  </div>;
}

const meta = { title: "Video production/Film Looks", id: "video-film-looks", component: Card, parameters: { layout: "fullscreen" },
  argTypes: { preset: { control: "select", options: LOOK_PRESET_IDS }, mood: { control: "check", options: LOOK_MOODS }, frame: { control: { type: "range", min: 0, max: 120 } } } } satisfies Meta<typeof Card>;
export default meta;
type Story = StoryObj<typeof meta>;

export const OneLook: Story = { args: { preset: "warm-35mm", mood: [], frame: 30 } };
export const AllLooks: Story = { args: { preset: "studio-clean" }, render: () => <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 480px)", gap: 8, padding: 8, background: "#111" }}>
  {LOOK_PRESET_IDS.map(id => <figure key={id} style={{ margin: 0 }}><Card preset={id} width={480} height={270} />
    <figcaption style={{ color: "#ddd", font: "600 13px system-ui", padding: "4px 2px" }}>{LOOK_PRESETS[id].title} · <span style={{ fontWeight: 400, opacity: .75 }}>{id}</span></figcaption></figure>)}
</div> };
export const Moods: Story = { name: "Moods on Warm 35 mm", args: { preset: "warm-35mm" }, render: () => <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 480px)", gap: 8, padding: 8, background: "#111" }}>
  {([[], ...LOOK_MOODS.map(m => [m])] as LookMood[][]).map(m => <figure key={m.join() || "none"} style={{ margin: 0 }}><Card preset="warm-35mm" mood={m} width={480} height={270} />
    <figcaption style={{ color: "#ddd", font: "600 13px system-ui", padding: "4px 2px" }}>{m[0] ?? "no mood"}</figcaption></figure>)}
</div> };

export const NightStreet: Story = { args: { preset: "studio-clean" }, render: () => board("night-street") };
export const Beach: Story = { args: { preset: "studio-clean" }, render: () => board("beach") };
export const DuskMountains: Story = { args: { preset: "studio-clean" }, render: () => board("dusk-mountains") };
export const NeonSilhouette: Story = { args: { preset: "studio-clean" }, render: () => board("neon-silhouette") };
/** Pick a plate and a look; the left half stays untouched. */
export const Compare: StoryObj<typeof Split> = { args: { plate: "night-street", preset: "neon-longing", mood: [] }, render: args => <Split {...args} />,
  argTypes: { plate: { control: "select", options: Object.keys(PLATES) }, preset: { control: "select", options: LOOK_PRESET_IDS }, mood: { control: "check", options: LOOK_MOODS } } };


/* RISO1 lives in the EXISTING Film Looks story group: no new Storybook section. */
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
        Independent spot-ink artwork, transparent overprint, press-feed reveals, fixed registration and paper grain.
        The poster is an original neutral illustration—not a photograph processed with a filter.
      </p>
    </header>
    <div style={{ width: "100%", maxWidth: aspect === "landscape" ? 960 : 470, boxShadow: "0 10px 40px rgba(49,38,27,.13)" }}>
      <RisoPrint spec={spec} frame={mode === "both" ? frame : 240} artworks={artworks}
        misregistration={registration / 12} paperGrain={grain} reducedMotion={reduce}
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
      <label style={risoUi.label}>Print seed
        <input type="number" min={0} max={2147483647} step={1} value={seed} style={{ minHeight: 38, font: "inherit" }}
          onChange={e => setSeed(Math.max(0, Math.min(2147483647, Math.floor(Number(e.target.value) || 0))))} />
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 9, minHeight: 38, font: "600 13px system-ui" }}>
        <input type="checkbox" checked={reduce} onChange={e => { setPlaying(false); setReduce(e.target.checked); }} /> Reduced motion
      </label>
    </div>
    <p style={{ margin: 0, maxWidth: 850, fontSize: 13, color: "var(--km-text-secondary, #56616B)" }}>
      Distinct from Film Look filters: each ink is a separate vector plate with its own screen and reveal.
      The second print multiplies with the first to make a third, darker overprint color.
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


/**
 * INK1 / INK2 / INK3 are grouped with the other MATERIAL looks, rather than
 * appearing only in their own technical Storybook sections. The rendered frames
 * are the actual original ink painting, FilmStage composition and animated rig.
 * This shell owns UI playback only: all material and acting math is frame-addressed.
 */
type InkLookMode = "painting" | "documentary" | "character";
type InkLookAspect = "landscape" | "portrait";
const INK_LOOK_MODES: Record<InkLookMode, {
  title: string; description: string; totalFrames: number; previewFrame: number;
}> = {
  painting: {
    title: "Brush painting", description: "Pressure-shaped strokes, capillary bloom, dry bristles and Xuan paper.",
    totalFrames: 420, previewFrame: 190,
  },
  documentary: {
    title: "Documentary and diagrams", description: "Live media, a water-cycle explanation and composed titles revealed on paper.",
    totalFrames: 480, previewFrame: 219,
  },
  character: {
    title: "Articulated character", description: "One original ink traveler walks, looks, speaks, blinks, greets and bows.",
    totalFrames: 330, previewFrame: 195,
  },
};
function InkLooksStudio({ initialMode = "painting" }: { initialMode?: InkLookMode }) {
  const [mode, setMode] = useState<InkLookMode>(initialMode);
  const [aspect, setAspect] = useState<InkLookAspect>("landscape");
  const [frame, setFrame] = useState(INK_LOOK_MODES[initialMode].previewFrame);
  const [playing, setPlaying] = useState(false);
  const [subject, setSubject] = useState<InkSubject>("landscape");
  const [look, setLook] = useState<InkLookId>("literati");
  const [mineral, setMineral] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [absorption, setAbsorption] = useState(.69);
  const [grain, setGrain] = useState(.6);
  const spec = useMemo(() => inkExampleSpec(subject, aspect, 47), [subject, aspect]);
  const totalFrames = INK_LOOK_MODES[mode].totalFrames;
  const maxFrame = totalFrames - 1;
  useEffect(() => {
    if (!playing || reducedMotion) return;
    const started = performance.now(), startFrame = frame;
    let request = 0;
    const tick = (now: number) => {
      const next = Math.min(maxFrame, startFrame + Math.floor((now - started) * 30 / 1000));
      setFrame(next);
      if (next < maxFrame) request = requestAnimationFrame(tick);
      else setPlaying(false);
    };
    request = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(request);
    // Playback starts at the chosen frame; the source modules evaluate absolute time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, mode, reducedMotion]);
  const changeMode = (next: InkLookMode) => {
    setPlaying(false);
    setMode(next);
    setFrame(INK_LOOK_MODES[next].previewFrame);
  };
  const dimensions = aspect === "landscape" ? { width: 960, height: 540, scale: .82 } :
    { width: 540, height: 960, scale: .57 };
  const controlStyle = { display: "grid", gap: 5, font: "600 13px system-ui", minWidth: 175 } as const;
  const btn = { border: "1px solid #ADB0A5", borderRadius: 6, background: "#FFFEF8",
    color: "#2E3A31", padding: "9px 15px", minHeight: 42, cursor: "pointer",
    font: "600 13px system-ui" } as const;
  const { width, height, scale } = dimensions;
  return <main data-km-ink-film-looks="" style={{
    minHeight: "100vh", background: "#EAE9E2", padding: "clamp(15px,2.5vw,28px)",
    color: "#29332B", font: "15px/1.5 system-ui", display: "grid", gap: 16, alignContent: "start",
  }}>
    <header style={{ maxWidth: 910, display: "grid", gap: 5 }}>
      <div style={{ font: "700 11px system-ui", letterSpacing: 3, color: "#8D5345" }}>
        VIDEO PRODUCTION / FILM LOOKS / MATERIAL-NATIVE
      </div>
      <h1 style={{ font: "500 clamp(28px,4vw,41px)/1.12 Georgia,serif", margin: 0 }}>
        Chinese ink wash · In motion
      </h1>
      <p style={{ margin: 0, maxWidth: 800, color: "#556057" }}>
        Three working animation studies. These paint original marks, compose other media or
        perform a rigged character—rather than applying one grayscale filter to video.
      </p>
    </header>
    <div role="group" aria-label="Chinese ink animation studies"
      style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {([
        ["painting", "Brush painting"], ["documentary", "Documentary / explainer"],
        ["character", "Character performance"],
      ] as const).map(([id, name]) =>
        <button key={id} type="button" onClick={() => changeMode(id)}
          aria-pressed={mode === id}
          style={{ ...btn, background: mode === id ? "#35483C" : "#FFFEF8",
            color: mode === id ? "#FFFFFF" : "#2E3A31" }}>{name}</button>)}
    </div>
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "end", gap: 14, maxWidth: 960 }}>
      <label style={controlStyle}>Ink animation
        <select aria-label="Ink animation" value={mode}
          onChange={e => changeMode(e.target.value as InkLookMode)}
          style={{ minHeight: 40, font: "inherit", background: "#FFFEF8" }}>
          <option value="painting">Brush painting</option>
          <option value="documentary">Documentary / explainer</option>
          <option value="character">Character performance</option>
        </select>
      </label>
      <label style={controlStyle}>Ink aspect
        <select aria-label="Ink aspect" value={aspect}
          onChange={e => { setPlaying(false); setAspect(e.target.value as InkLookAspect); }}
          style={{ minHeight: 40, font: "inherit", background: "#FFFEF8" }}>
          <option value="landscape">16:9 landscape</option>
          <option value="portrait">9:16 portrait</option>
        </select>
      </label>
      {mode === "painting" && <label style={controlStyle}>Painting subject
        <select aria-label="Ink painting subject" value={subject}
          onChange={e => { setPlaying(false); setSubject(e.target.value as InkSubject); }}
          style={{ minHeight: 40, font: "inherit", background: "#FFFEF8" }}>
          <option value="landscape">Pine and mountains</option><option value="bamboo">Bamboo grove</option>
        </select>
      </label>}
      {mode === "documentary" && <label style={controlStyle}>Paper and ink direction
        <select aria-label="Paper and ink direction" value={look}
          onChange={e => { setPlaying(false); setLook(e.target.value as InkLookId); }}
          style={{ minHeight: 40, font: "inherit", background: "#FFFEF8" }}>
          {Object.keys(INK_LOOKS).map(id => <option key={id} value={id}>{id}</option>)}
        </select>
      </label>}
      {mode === "character" && <label style={{ ...controlStyle, display: "flex", alignItems: "center", minHeight: 40 }}>
        <input type="checkbox" checked={mineral}
          onChange={e => { setPlaying(false); setMineral(e.target.checked); }}/> Mineral-tint costume
      </label>}
      <label style={{ ...controlStyle, display: "flex", alignItems: "center", minHeight: 40 }}>
        <input type="checkbox" checked={reducedMotion}
          onChange={e => { setPlaying(false); setReducedMotion(e.target.checked); }}/> Reduced motion
      </label>
    </div>
    <div style={{ display: "grid", gap: 6 }}>
      <strong style={{ font: "600 19px Georgia,serif" }}>{INK_LOOK_MODES[mode].title}</strong>
      <span style={{ color: "#586259" }}>{INK_LOOK_MODES[mode].description}</span>
    </div>
    <div data-km-film-looks-ink-preview="" style={{ width: width * scale,
      height: height * scale, maxWidth: "100%", background: "#F4F0E5",
      overflow: "hidden", boxShadow: "0 16px 48px rgba(34,41,32,.16)" }}>
      <div style={{ width, height, transform: "scale(" + scale + ")", transformOrigin: "top left" }}>
        {mode === "painting" ? <div style={{ width, height, position: "relative" }}>
          <InkWash spec={spec} frame={frame} absorption={absorption} grain={grain}
            reducedMotion={reducedMotion} label={subject === "landscape" ?
              "Animated Chinese ink-wash mountain and pine" : "Animated Chinese ink-wash bamboo grove"} />
          <div style={{ position: "absolute", left: "8%", top: "8%", pointerEvents: "none" }}>
            <span style={{ color: "#985343", letterSpacing: 3, font: "700 12px system-ui" }}>KUMIKI INK STUDY  /  01</span>
            <div style={{ font: "500 39px Georgia,serif", marginTop: 8, color: "#30362F" }}>
              {subject === "landscape" ? "Among the pines" : "Quiet bamboo"}
            </div>
          </div>
        </div> :
        mode === "documentary" ? <InkFilm frame={frame} output={aspect} look={look}
          reducedMotion={reducedMotion}/> :
          <InkPerformanceFilm frame={frame} aspect={aspect} mineral={mineral}
            reducedMotion={reducedMotion}/>}
      </div>
    </div>
    {mode === "painting" && <div style={{ display: "flex", flexWrap: "wrap", gap: 20, maxWidth: 900 }}>
      <label style={controlStyle}>Paper absorbency · {Math.round(absorption * 100)}%
        <input type="range" min={0} max={1} step={.05} value={absorption}
          onChange={e => { setPlaying(false); setAbsorption(Number(e.target.value)); }}/>
      </label>
      <label style={controlStyle}>Paper tooth · {Math.round(grain * 100)}%
        <input type="range" min={0} max={1} step={.05} value={grain}
          onChange={e => { setPlaying(false); setGrain(Number(e.target.value)); }}/>
      </label>
    </div>}
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", maxWidth: 960 }}>
      <button type="button" disabled={reducedMotion} style={{
        ...btn, background: reducedMotion ? "#C2C4B9" : "#35483C",
        color: reducedMotion ? "#434B42" : "#FFFFFF",
      }} onClick={() => {
        if (frame >= maxFrame) setFrame(0);
        setPlaying(v => !v);
      }}>{playing ? "Pause" : "Play animation"}</button>
      <button type="button" style={btn}
        onClick={() => { setPlaying(false); setFrame(0); }}>Restart</button>
      <label style={{ ...controlStyle, minWidth: 260, flex: 1 }}>
        Ink film frame · <output aria-label="Current ink frame">{frame}</output> / {maxFrame}
        <input aria-label="Ink film frame" type="range" min={0} max={maxFrame}
          value={frame} onChange={e => { setPlaying(false); setFrame(Number(e.target.value)); }}
          style={{ width: "100%" }}/>
      </label>
    </div>
    <nav aria-label="Ink animation keyframes" style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
      {(mode === "painting" ?
        [["Initial paper", 0], ["Mountain wash", 85], ["Brush marks", 190], ["Settled painting", 375]] :
        mode === "documentary" ?
          [["Opening", 57], ["Explainer", 226], ["Closing", 415]] :
          [["Walk", 80], ["Greet", 160], ["Speak", 192], ["Bow", 285], ["Hold", 324]]
      ).map(([name, at]) => <button key={String(name)} type="button" style={btn}
        onClick={() => { setPlaying(false); setFrame(Number(at)); }}>{name}</button>)}
    </nav>
    <p style={{ margin: 0, fontSize: 12, maxWidth: 900, color: "#596259" }}>
      Frame-accurate preview · 30 fps · original authored artwork. These are material studies;
      not evidence that arbitrary live-action media has been hand-painted.
    </p>
  </main>;
}

export const ChineseInkPainting: StoryObj<typeof InkLooksStudio> = {
  name: "Chinese Ink · Brush Painting Animation",
  render: () => <InkLooksStudio initialMode="painting"/>,
};
export const ChineseInkDocumentary: StoryObj<typeof InkLooksStudio> = {
  name: "Chinese Ink · Documentary and Explainer Animation",
  render: () => <InkLooksStudio initialMode="documentary"/>,
};
export const ChineseInkCharacter: StoryObj<typeof InkLooksStudio> = {
  name: "Chinese Ink · Character Animation",
  render: () => <InkLooksStudio initialMode="character"/>,
};
