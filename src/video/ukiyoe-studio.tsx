/**
 * UKIYO1 Storybook studio: the "Night Ferry" film player with live print/art-direction controls, a printer's-proof
 * lab, a cast lab for figures and actions, a motif gallery and a JSON scene editor. Every control feeds the real
 * renderer; nothing here is a mock-up of the output.
 */
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import "@fontsource-variable/newsreader";
import { compileFilm } from "../../registry/video/film-document";
import { FilmStage } from "../../registry/video/film-stage";
import type { UkiyoeAction, UkiyoeActionType, UkiyoeFigureLook, UkiyoeHair, UkiyoeHat, UkiyoeProp } from "../../registry/video/ukiyoe/ukiyoe-figure";
import { UKIYOE_ACTIONS, UKIYOE_HAIRS, UKIYOE_HATS, UKIYOE_PROPS } from "../../registry/video/ukiyoe/ukiyoe-figure";
import type { UkiyoeMotifName } from "../../registry/video/ukiyoe/ukiyoe-motifs";
import type { UkiyoePresetName } from "../../registry/video/ukiyoe/ukiyoe-pigments";
import { palette, UKIYOE_PRESETS, UKIYOE_ROLES } from "../../registry/video/ukiyoe/ukiyoe-pigments";
import type { UkiyoePatternType } from "../../registry/video/ukiyoe/ukiyoe-prims";
import { UKIYOE_PATTERNS } from "../../registry/video/ukiyoe/ukiyoe-prims";
import { UkiyoeScene } from "../../registry/video/ukiyoe/ukiyoe-react";
import type { UkiyoeNode, UkiyoeSceneSpec } from "../../registry/video/ukiyoe/ukiyoe-scene";
import { inspectUkiyoeScene } from "../../registry/video/ukiyoe/ukiyoe-scene";
import { ukiyoeFilm, ukiyoeShotStarts } from "./ukiyoe-film";
import type { UkiyoeAspect, UkiyoeFilmTweaks, UkiyoeShot } from "./ukiyoe-night-ferry";
import { FOLKTALE_KASUMI, FOLKTALE_SHOTS } from "./ukiyoe-folktale";
import { CAST, NIGHT_FERRY_SHOTS } from "./ukiyoe-night-ferry";
import { renderUkiyoeSlot } from "./ukiyoe-slot";

// ---- Shared UI ---------------------------------------------------------------------------------------------------------------------

const ink = "#24211e", paperUi = "#f3ecdc", accent = "#9e3a26";
const page: CSSProperties = { display: "grid", gap: 16, padding: "24px clamp(16px, 3vw, 32px)", minHeight: "100vh", background: paperUi, color: ink, font: "15px/1.5 'Newsreader Variable', Georgia, serif" };
const label: CSSProperties = { display: "grid", gap: 4, font: "600 13px/1.3 system-ui, sans-serif", minWidth: 0 };
const control: CSSProperties = { minHeight: 36, font: "14px system-ui, sans-serif", border: "1px solid #a89c87", borderRadius: 6, background: "#fffaf0", color: ink, padding: "4px 8px" };
const button: CSSProperties = { border: "1px solid #8d8170", borderRadius: 6, background: "#fffaf0", color: ink, padding: "8px 14px", minHeight: 38, cursor: "pointer", font: "600 13px system-ui, sans-serif" };
const pressed: CSSProperties = { ...button, background: ink, color: "#fffaf0", border: `1px solid ${ink}` };
const panel: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: "12px 16px", padding: 16, background: "#fbf6ea", border: "1px solid #ddd2bd", borderRadius: 10 };
const eyebrow: CSSProperties = { font: "700 12px system-ui, sans-serif", letterSpacing: 2.4, color: accent, textTransform: "uppercase" };

function Header({ kicker, title, children }: { kicker: string; title: string; children: ReactNode }) {
  return <header style={{ maxWidth: 1000 }}>
    <div style={eyebrow}>{kicker}</div>
    <h1 style={{ margin: "6px 0 8px", font: "600 clamp(26px, 3.2vw, 40px)/1.12 'Newsreader Variable', Georgia, serif" }}>{title}</h1>
    <div style={{ maxWidth: 860 }}>{children}</div>
  </header>;
}
function Slider({ name, value, min, max, step, onChange, format }: { name: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format?: (v: number) => string }) {
  return <label style={label}>{name} · {format ? format(value) : value}
    <input type="range" aria-label={name} min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} />
  </label>;
}
function Select<T extends string | number>({ name, value, options, onChange, labels }: { name: string; value: T; options: readonly T[]; onChange: (v: T) => void; labels?: Partial<Record<string, string>> }) {
  return <label style={label}>{name}
    <select aria-label={name} value={String(value)} style={control} onChange={e => onChange((typeof value === "number" ? Number(e.target.value) : e.target.value) as T)}>
      {options.map(o => <option key={String(o)} value={String(o)}>{labels?.[String(o)] ?? String(o)}</option>)}
    </select>
  </label>;
}
function Check({ name, value, onChange }: { name: string; value: boolean; onChange: (v: boolean) => void }) {
  return <label style={{ ...label, display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} /> {name}</label>;
}

/** Pure playhead: decoding/render cost never decides story time, so skipped paints do not drift. */
export function ukiyoeFrameAtElapsed(from: number, elapsedMs: number, durationFrames: number, rate = 1, loop = false, fps = 30): number {
  const start = Math.max(0, Math.min(durationFrames - 1, Math.floor(from)));
  const next = start + Math.floor(Math.max(0, elapsedMs) * fps * rate / 1000);
  return loop ? next % durationFrames : Math.min(durationFrames - 1, next);
}
export function usePlayback(durationFrames: number, initial = 0, rate = 1, loop = false, autoplay = false) {
  const last = Math.max(0, durationFrames - 1);
  const [frame, setFrame] = useState(Math.min(initial, last));
  const [playing, setPlaying] = useState(autoplay);
  const frameRef = useRef(frame);
  useEffect(() => { frameRef.current = frame; }, [frame]);
  useEffect(() => { if (frameRef.current > last) setFrame(last); }, [last]);
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const from = frameRef.current >= last && !loop ? 0 : frameRef.current, started = performance.now();
    const tick = (now: number) => {
      const next = ukiyoeFrameAtElapsed(from, now - started, durationFrames, rate, loop);
      setFrame(next);
      if (!loop && next >= last) { setPlaying(false); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, rate, loop, durationFrames, last]);
  return { frame, playing, seek: (f: number) => { setPlaying(false); setFrame(Math.max(0, Math.min(last, Math.round(f)))); }, toggle: () => setPlaying(p => !p), restart: () => { setFrame(0); setPlaying(true); } };
}

function Transport({ clock, total, rate, setRate, loop, setLoop, name }: { clock: ReturnType<typeof usePlayback>; total: number; rate: number; setRate: (v: number) => void; loop: boolean; setLoop: (v: boolean) => void; name: string }) {
  return <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "end" }}>
    <button type="button" style={button} onClick={clock.toggle}>{clock.playing ? "Pause" : "Play"}</button>
    <button type="button" style={button} onClick={clock.restart}>Restart</button>
    <label style={{ ...label, flex: "1 1 260px" }}>{name} · {clock.frame} / {total - 1} · {(clock.frame / 30).toFixed(1)} s
      <input type="range" aria-label={name} min={0} max={total - 1} value={clock.frame} onChange={e => clock.seek(Number(e.target.value))} />
    </label>
    <Select name="Speed" value={rate} options={[.25, .5, 1, 1.5, 2]} onChange={setRate} labels={{ ".25": "0.25×", ".5": "0.5×", "1": "1×", "1.5": "1.5×", "2": "2×" }} />
    <Check name="Loop" value={loop} onChange={setLoop} />
  </div>;
}

/** Scales a fixed-size stage down to the available width (never wider than the container). */
function Fit({ width, height, maxHeight = 720, children }: { width: number; height: number; maxHeight?: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [avail, setAvail] = useState(960);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setAvail(e.contentRect.width));
    ro.observe(el); return () => ro.disconnect();
  }, []);
  const scale = Math.min(avail / width, maxHeight / height);
  return <div ref={ref} style={{ width: "100%", minWidth: 0 }}>
    <div style={{ width: width * scale, height: height * scale, overflow: "hidden", boxShadow: "0 16px 44px rgba(40,30,20,.22)", background: "#1b1a18", margin: "0 auto" }}>
      <div style={{ width, height, transform: `scale(${scale})`, transformOrigin: "top left" }}>{children}</div>
    </div>
  </div>;
}

// ---- 1. The film --------------------------------------------------------------------------------------------------------------------

interface FilmPlayerProps {
  shots: readonly UkiyoeShot[];
  kasumi?: Readonly<Record<string, number>>;
  filmId: string;
  title: string;
  kicker: string;
  description: ReactNode;
  initialFrame?: number;
  /** Frame within the first shot to land on when its button is pressed. */
  firstShotFrame?: number;
}

export function NightFerryPlayer({ initialFrame = 150 }: { initialFrame?: number }) {
  return <UkiyoeFilmPlayer shots={NIGHT_FERRY_SHOTS} filmId="ukiyoe-night-ferry" title="The Night Ferry" kicker="Ukiyo-e handscroll · UKIYO1" initialFrame={initialFrame} firstShotFrame={150}
    description={<>An original six-shot film in the woodblock-print and picture-scroll tradition. The title is printed block by block
      (key line first, then colours light to dark). A handscroll pan reads right to left through a riverside town, with a figure who
      appears throughout, as in emaki continuous narration. Then come a squall in which a great wave curls over the ferry, with
      Hiroshige-style rain and a distant Fuji, then moonrise and fireworks, and the arrival. Gold mist bands mark the passage of time.
      Figures move on twos under a smooth camera. All of it is JSON scenes rendered from an absolute frame.</>} />;
}

export function FolktaleFilmPlayer() {
  return <UkiyoeFilmPlayer shots={FOLKTALE_SHOTS} kasumi={FOLKTALE_KASUMI} filmId="ukiyoe-peach-and-oni" title="The Peach and the Oni" kicker="Ukiyo-e folktale · UKIYO1" initialFrame={200} firstShotFrame={200}
    description={<>An original three-shot homage to the folktales: a giant peach floats past ripe rice terraces and splits open.
      Then a handscroll road of old stories: a fox wedding under a sun-shower with foxfire and a nine-tailed kitsune, a tanuki
      drumming its belly, another tanuki changing into a monk in a puff of smoke, a cat, a hopping rabbit, a dancing crane, the boy
      with his dog and pheasant, the oni at their gate, and a dragon riding the clouds with its pearl. Finally, the oni island in a
      great-wave sea. Every creature is a rig in the same JSON scene engine.</>} />;
}

function UkiyoeFilmPlayer({ shots, kasumi, filmId, title, kicker, description, initialFrame = 150, firstShotFrame = 40 }: FilmPlayerProps) {
  const [aspect, setAspect] = useState<UkiyoeAspect>("landscape");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [rate, setRate] = useState(1);
  const [loop, setLoop] = useState(false);
  const [preset, setPreset] = useState<UkiyoePresetName | "per-shot">("per-shot");
  const [registration, setRegistration] = useState(1.6);
  const [mottle, setMottle] = useState(.55);
  const [grain, setGrain] = useState(.7);
  const [line, setLine] = useState(1);
  const [fibre, setFibre] = useState(.55);
  const [cadence, setCadence] = useState<1 | 2 | 3 | 4>(2);
  const [wind, setWind] = useState(0);
  const [captions, setCaptions] = useState(true);
  const tweaks: UkiyoeFilmTweaks = useMemo(() => ({ preset: preset === "per-shot" ? undefined : preset, registration, mottle, grain, line, fibre, cadence, wind, captions }),
    [preset, registration, mottle, grain, line, fibre, cadence, wind, captions]);
  const doc = useMemo(() => ukiyoeFilm(shots, tweaks, { id: filmId, kasumi }), [shots, tweaks, filmId, kasumi]);
  const compiled = useMemo(() => compileFilm(doc, { outputId: aspect }), [doc, aspect]);
  const starts = useMemo(() => ukiyoeShotStarts(shots), [shots]);
  const total = compiled.ok ? compiled.film.durationFrames : 1;
  const clock = usePlayback(total, initialFrame, rate, loop);
  if (!compiled.ok) return <pre role="alert">{compiled.diagnostics.map(d => d.path + ": " + d.message).join("\n")}</pre>;
  const film = compiled.film, shotIndex = starts.reduce((found, s, i) => s <= clock.frame ? i : found, 0);
  return <div style={page}>
    <Header kicker={kicker} title={title}><p style={{ margin: 0 }}>{description}</p></Header>
    <nav aria-label="Shots" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {shots.map((shot, i) => <button type="button" key={shot.id} style={i === shotIndex ? pressed : button} aria-pressed={i === shotIndex}
        onClick={() => clock.seek(starts[i] + (i === 0 ? firstShotFrame : 40))}>{i + 1}. {shot.title}</button>)}
    </nav>
    <Fit width={film.width} height={film.height} maxHeight={aspect === "landscape" ? 640 : 760}>
      <FilmStage film={film} frame={clock.frame} reducedMotion={reducedMotion} renderObject={() => null}
        renderSlot={(content, context) => {
          const node = renderUkiyoeSlot(content, context);
          if (node === undefined) throw new Error("Unknown slot " + content.slot);
          return node;
        }} />
    </Fit>
    <Transport clock={clock} total={total} rate={rate} setRate={setRate} loop={loop} setLoop={setLoop} name="Film frame" />
    <section aria-label="Art direction" style={panel}>
      <Select name="Output" value={aspect} options={["landscape", "portrait"] as const} onChange={setAspect} labels={{ landscape: "16:9 landscape", portrait: "9:16 portrait" }} />
      <Select name="Palette" value={preset} options={["per-shot", ...UKIYOE_PRESETS] as const} onChange={setPreset} labels={{ "per-shot": "Per shot (dusk → night)", aizuri: "Aizuri (blue print)" }} />
      <Slider name="Registration (px)" value={registration} min={0} max={8} step={.2} onChange={setRegistration} format={v => v.toFixed(1)} />
      <Slider name="Baren mottle" value={mottle} min={0} max={1} step={.05} onChange={setMottle} format={v => Math.round(v * 100) + "%"} />
      <Slider name="Wood grain" value={grain} min={0} max={1} step={.05} onChange={setGrain} format={v => Math.round(v * 100) + "%"} />
      <Slider name="Key-line weight" value={line} min={.4} max={2.4} step={.1} onChange={setLine} format={v => v.toFixed(1) + "×"} />
      <Slider name="Washi fibre" value={fibre} min={0} max={1} step={.05} onChange={setFibre} format={v => Math.round(v * 100) + "%"} />
      <Select name="Figure cadence" value={cadence} options={[1, 2, 3, 4] as const} onChange={setCadence} labels={{ 1: "On ones", 2: "On twos (default)", 3: "On threes", 4: "On fours" }} />
      <Slider name="Extra wind" value={wind} min={-1.5} max={1.5} step={.1} onChange={setWind} format={v => (v > 0 ? "+" : "") + v.toFixed(1)} />
      <Check name="Captions" value={captions} onChange={setCaptions} />
      <Check name="Reduced motion (settled frames)" value={reducedMotion} onChange={setReducedMotion} />
    </section>
    <p style={{ fontSize: 13, margin: 0, opacity: .8, maxWidth: 900 }}>Every frame is a pure function of the frame number, so scrubbing, seeking backwards and
      jumping between shots are exact. All artwork is generated by the engine: no photographs, no third-party prints and no traced
      compositions. Ukiyo-e and emaki conventions (bokashi, kentō registration, suyari-gasumi, fukinuki-yatai) are public-domain techniques.</p>
  </div>;
}

// ---- 2. Printer's proof ---------------------------------------------------------------------------------------------------------------

const IMPRESSION_NAMES = ["Key block (sumi line)", "1 · lightest", "2", "3", "4", "5", "6", "7", "8 · darkest"];

export function PrintersProof() {
  const [shot, setShot] = useState("title");
  const [aspect, setAspect] = useState<UkiyoeAspect>("landscape");
  const [proof, setProof] = useState(8);
  const [pass, setPass] = useState(1);
  const [registration, setRegistration] = useState(2.5);
  const [mottle, setMottle] = useState(.6);
  const [grain, setGrain] = useState(.8);
  const [preset, setPreset] = useState<UkiyoePresetName>("twilight");
  const spec = useMemo(() => NIGHT_FERRY_SHOTS.find(s => s.id === shot)!.build(aspect, { registration, mottle, grain, preset }), [shot, aspect, registration, mottle, grain, preset]);
  const frame = shot === "title" ? 170 : Math.round(spec.durationFrames * .55);
  return <div style={page}>
    <Header kicker="UKIYO1 · Printer's proof" title="Key block, then colour blocks, light to dark">
      <p style={{ margin: 0 }}>A woodblock print is built from separate impressions. The carved key block prints the sumi line first.
        Each colour is its own block, aligned at the kentō marks and rubbed on with a baren. Here every colour fill in a scene is assigned
        to one of eight impressions by its lightness, the way printers ordered them. Pull a proof at any impression, drag the
        print pass, or loosen the registration to see the blocks drift apart.</p>
    </Header>
    <Fit width={spec.width} height={spec.height} maxHeight={600}>
      <UkiyoeScene spec={spec} frame={frame} proof={proof} printProgress={pass < 1 ? pass : undefined} aria-label="Printer's proof" />
    </Fit>
    <section aria-label="Proof controls" style={panel}>
      <Select name="Scene" value={shot} options={NIGHT_FERRY_SHOTS.map(s => s.id)} onChange={setShot} labels={Object.fromEntries(NIGHT_FERRY_SHOTS.map(s => [s.id, s.title]))} />
      <Select name="Output" value={aspect} options={["landscape", "portrait"] as const} onChange={setAspect} />
      <Slider name="Proof up to impression" value={proof} min={0} max={8} step={1} onChange={setProof} format={v => IMPRESSION_NAMES[v]} />
      <Slider name="Print pass" value={pass} min={0} max={1} step={.01} onChange={setPass} format={v => Math.round(v * 100) + "%"} />
      <Slider name="Registration (px)" value={registration} min={0} max={12} step={.5} onChange={setRegistration} format={v => v.toFixed(1)} />
      <Slider name="Baren mottle" value={mottle} min={0} max={1} step={.05} onChange={setMottle} format={v => Math.round(v * 100) + "%"} />
      <Slider name="Wood grain" value={grain} min={0} max={1} step={.05} onChange={setGrain} format={v => Math.round(v * 100) + "%"} />
      <Select name="Palette" value={preset} options={UKIYOE_PRESETS} onChange={setPreset} />
    </section>
    <PaletteSwatches preset={preset} />
  </div>;
}

function PaletteSwatches({ preset }: { preset: UkiyoePresetName }) {
  const pal = palette(preset);
  return <section aria-label="Pigment roles" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
    {UKIYOE_ROLES.map(r => <div key={r} style={{ display: "grid", gap: 4, width: 92, font: "12px system-ui, sans-serif" }}>
      <div style={{ height: 34, background: pal[r], border: "1px solid #0002", borderRadius: 4 }} />
      <span><b>{r}</b> {pal[r]}</span>
    </div>)}
  </section>;
}

// ---- 3. Cast lab ----------------------------------------------------------------------------------------------------------------------

const ROBE_ROLES = ["ai", "bero", "beni", "shu", "asagi", "kusa", "matsu", "ki", "kincha", "murasaki", "cha", "usuzumi", "sakura", "gofun"] as const;
const ACTION_HINT: Partial<Record<UkiyoeActionType, Partial<UkiyoeAction>>> = { walk: { to: 260 }, run: { to: 420 }, point: { angle: 80 }, bow: { angle: 38 }, look: { angle: -24 }, hold: { angle: 40, amount: 80 } };

const CAST_NAMES = ["traveller", "mother", "child", "ferryman", "merchant", "maiko", "oni-red", "monk"] as const;

export function CastLab() {
  const names = CAST_NAMES;
  const [cast, setCast] = useState<Record<string, UkiyoeFigureLook>>(() => Object.fromEntries(names.map(n => [n, CAST[n]])));
  const [actions, setActions] = useState<Record<string, UkiyoeActionType>>({ traveller: "walk", mother: "hold", child: "cheer", ferryman: "pole", merchant: "bow", maiko: "dance", "oni-red": "talk", monk: "pray" });
  const [selected, setSelected] = useState<(typeof CAST_NAMES)[number]>("mother");
  const [wind, setWind] = useState(.3);
  const [cadence, setCadence] = useState<1 | 2 | 3 | 4>(2);
  const [rate, setRate] = useState(1);
  const [loop, setLoop] = useState(true);
  const spec: UkiyoeSceneSpec = useMemo(() => ({
    version: 1, id: "cast-lab", width: 1920, height: 1080, durationFrames: 240, seed: 9, cadence, wind: { base: wind, turbulence: .4 },
    palette: { preset: "edo" }, mount: { kind: "print" },
    nodes: [
      { id: "ground", kind: "block", x: 960, y: 1000, shape: { type: "rect", width: 2000, height: 220 }, fill: { type: "linear", angle: 90, stops: [[0, "ki", .5], [1, "kincha", .7]] }, line: 0, grain: 1 },
      { id: "mist", kind: "motif", motif: "cloud", x: 960, y: 230, params: { width: 1500, height: 70, color: "kin" } },
      ...CAST_NAMES.map((n, i): UkiyoeNode => {
        const type = actions[n], a: UkiyoeAction = { type, start: 0, end: 239, ...ACTION_HINT[type], ...(type === "walk" || type === "run" ? { start: 10, end: 230 } : {}) };
        return { id: n, kind: "figure", x: 150 + i * 232 - (type === "walk" || type === "run" ? 100 : 0), y: 930, scale: 1.18, look: cast[n], facing: i % 2 ? "left" : "right", actions: [a] };
      }),
    ],
  }), [cast, actions, wind, cadence]);
  const clock = usePlayback(240, 40, rate, loop, true);
  const look = cast[selected], set = (patch: Partial<UkiyoeFigureLook>) => setCast(c => ({ ...c, [selected]: { ...c[selected], ...patch } }));
  return <div style={page}>
    <Header kicker="UKIYO1 · Cast lab" title="Figures, costumes and actions">
      <p style={{ margin: 0 }}>Each figure is an articulated rig drawn as a print would draw it: a robe silhouette, hanging sleeves
        that lag and blow in the wind, a pale profile face, and costume pattern as its own block. Pick a figure, then change its
        costume and action. The whole cast plays together on one clock.</p>
    </Header>
    <Fit width={1920} height={1080} maxHeight={560}><UkiyoeScene spec={spec} frame={clock.frame} aria-label="Cast lab stage" /></Fit>
    <Transport clock={clock} total={240} rate={rate} setRate={setRate} loop={loop} setLoop={setLoop} name="Cast frame" />
    <nav aria-label="Figures" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {names.map(n => <button type="button" key={n} style={n === selected ? pressed : button} aria-pressed={n === selected} onClick={() => setSelected(n)}>{n}</button>)}
    </nav>
    <section aria-label={"Edit " + selected} style={panel}>
      <Select name="Action" value={actions[selected]} options={UKIYOE_ACTIONS} onChange={v => setActions(a => ({ ...a, [selected]: v }))} />
      <Select name="Hair" value={look.hair ?? "chonmage"} options={UKIYOE_HAIRS} onChange={(v: UkiyoeHair) => set({ hair: v })} />
      <Select name="Hat" value={look.hat ?? "none"} options={UKIYOE_HATS} onChange={(v: UkiyoeHat) => set({ hat: v })} />
      <Select name="Prop" value={look.prop ?? "none"} options={UKIYOE_PROPS} onChange={(v: UkiyoeProp) => set({ prop: v })} />
      <Select name="Robe colour" value={look.robe ?? "ai"} options={ROBE_ROLES} onChange={v => set({ robe: v })} />
      <Select name="Robe pattern" value={look.robePattern?.type ?? "none"} options={["none", ...UKIYOE_PATTERNS] as const} onChange={v => set({ robePattern: v === "none" ? undefined : { type: v as UkiyoePatternType, color: look.robePattern?.color ?? "gofun", scale: .5, opacity: .8 } })} />
      <Select name="Pattern colour" value={look.robePattern?.color ?? "gofun"} options={ROBE_ROLES} onChange={v => set({ robePattern: look.robePattern ? { ...look.robePattern, color: v } : undefined })} />
      <Select name="Under-robe" value={look.under ?? "beni"} options={ROBE_ROLES} onChange={v => set({ under: v })} />
      <Select name="Obi" value={look.obi ?? "kogecha"} options={[...ROBE_ROLES, "kogecha"] as const} onChange={v => set({ obi: v })} />
      <Select name="Coat (haori)" value={look.coat ?? "none"} options={["none", ...ROBE_ROLES] as const} onChange={v => set({ coat: v === "none" ? undefined : v })} />
      <Select name="Lower garment" value={look.lower ?? "robe"} options={["robe", "tucked", "hakama"] as const} onChange={v => set({ lower: v })} />
      <Select name="Sleeves" value={look.sleeves ?? "short"} options={["short", "long"] as const} onChange={v => set({ sleeves: v })} />
      <Select name="Build" value={look.build ?? "average"} options={["slim", "average", "stout", "child"] as const} onChange={v => set({ build: v })} />
      <Select name="Footwear" value={look.feet ?? "waraji"} options={["waraji", "geta", "tabi", "bare"] as const} onChange={v => set({ feet: v })} />
      <Select name="Accent (umbrella, fan…)" value={look.accent ?? "ai"} options={ROBE_ROLES} onChange={v => set({ accent: v })} />
      <Slider name="Wind" value={wind} min={-2} max={2} step={.1} onChange={setWind} format={v => v.toFixed(1)} />
      <Select name="Cadence" value={cadence} options={[1, 2, 3, 4] as const} onChange={setCadence} labels={{ 1: "On ones", 2: "On twos", 3: "On threes", 4: "On fours" }} />
    </section>
    <details><summary style={{ cursor: "pointer", font: "600 13px system-ui" }}>Figure JSON for {selected}</summary>
      <pre style={{ fontSize: 12, background: "#fffaf0", padding: 12, border: "1px solid #ddd2bd", overflow: "auto" }}>{JSON.stringify(spec.nodes.find(n => n.id === selected), null, 2)}</pre>
    </details>
  </div>;
}

// ---- 4. Motif gallery -----------------------------------------------------------------------------------------------------------------

const GALLERY: { motif: UkiyoeMotifName; label: string; params: Record<string, unknown>; y: number; scale?: number; keys?: boolean }[] = [
  { motif: "mountain", label: "Mountain · snow tongues", params: { width: 400, height: 210 }, y: 300 },
  { motif: "wave", label: "Breaking wave", params: { width: 460, height: 270, breakAt: 150, breakDuration: 40 }, y: 330, keys: true },
  { motif: "pine", label: "Pine in wind", params: { height: 280, lean: -10 }, y: 330 },
  { motif: "sakura", label: "Cherry in bloom", params: { height: 280 }, y: 330 },
  { motif: "willow", label: "Willow strands", params: { height: 300 }, y: 330 },
  { motif: "torii", label: "Torii", params: { width: 220, height: 240 }, y: 330 },
  { motif: "pagoda", label: "Pagoda", params: { height: 300, width: 120 }, y: 330 },
  { motif: "house", label: "Townhouse · noren", params: { width: 280, height: 120, noren: "ai", stories: 2 }, y: 330 },
  { motif: "house", label: "Fukinuki-yatai cutaway", params: { width: 300, height: 140, roof: "cutaway" }, y: 330 },
  { motif: "bridge", label: "Taiko bridge", params: { span: 380, rise: 70, depth: 40 }, y: 290 },
  { motif: "boat", label: "Yakata pleasure boat", params: { kind: "yakata", length: 320 }, y: 300 },
  { motif: "lantern", label: "Lanterns", params: { kind: "stone", size: 1.6 }, y: 330 },
  { motif: "cloud", label: "Suyari-gasumi", params: { width: 380, height: 60, color: "kin" }, y: 220 },
  { motif: "rock", label: "Rock and moss", params: { width: 300, height: 140 }, y: 330 },
  { motif: "reeds", label: "Reeds", params: { width: 260, height: 170 }, y: 330 },
  { motif: "ricefield", label: "Rice terraces · ripe", params: { width: 600, height: 170, crop: "ripe", terraces: 3 }, y: 190 },
  { motif: "ricefield", label: "Rice paddies · young", params: { width: 600, height: 170, crop: "young", terraces: 3 }, y: 190 },
  { motif: "peach", label: "Peach (momo)", params: { size: 80, openAt: 150, openDuration: 30 }, y: 230 },
];

export function MotifGallery() {
  const [wind, setWind] = useState(.6);
  const [preset, setPreset] = useState<UkiyoePresetName>("edo");
  const clock = usePlayback(240, 120, 1, true, true);
  const specs = useMemo(() => GALLERY.map((g, i): UkiyoeSceneSpec => ({
    version: 1, id: "g" + i, width: 600, height: 400, durationFrames: 240, seed: 30 + i, palette: { preset }, wind: { base: wind, turbulence: .5 }, cadence: 2,
    nodes: [
      { id: "sky", kind: "motif", motif: "sky", params: { width: 600, height: 400, band: .4, horizon: "beni" } },
      ...(g.motif === "wave" || g.motif === "boat" ? [{ id: "sea", kind: "motif", motif: "sea", y: 250, params: { width: 600, height: 160, rows: 8 } } as UkiyoeNode] : []),
      { id: "m", kind: "motif", motif: g.motif, x: g.motif === "ricefield" ? 0 : 300, y: g.y, params: g.params, ...(g.keys ? { keys: [{ frame: 0, progress: 0 }, { frame: 120, progress: 1 }] } : {}) },
      { id: "t", kind: "text", style: "caption", depth: 0, x: 300, y: 392, text: g.label, size: 22 },
    ],
  })), [wind, preset]);
  return <div style={page}>
    <Header kicker="UKIYO1 · Motif library" title="Landscape, architecture and weather motifs">
      <p style={{ margin: 0 }}>Every motif is generated from a few parameters (size, snow line, lean, bloom, strands, roof
        type…). Each one reads the scene wind and the frame, so trees, willows, reeds, sleeves and rain respond to the same gust. Use them
        as JSON nodes, mirror them with <code>flip</code>, or compose your own objects from <code>block</code> and <code>line</code> nodes.</p>
    </Header>
    <section aria-label="Gallery controls" style={{ ...panel, gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
      <Slider name="Wind" value={wind} min={-2} max={2} step={.1} onChange={setWind} format={v => v.toFixed(1)} />
      <Select name="Palette" value={preset} options={UKIYOE_PRESETS} onChange={setPreset} />
    </section>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
      {specs.map((s, i) => <div key={i} style={{ aspectRatio: "3 / 2", boxShadow: "0 6px 20px rgba(40,30,20,.15)" }}>
        <UkiyoeScene spec={s} frame={clock.frame} style={{ width: "100%", height: "100%" }} aria-label={GALLERY[i].label} />
      </div>)}
    </div>
  </div>;
}

// ---- 5. Scene editor --------------------------------------------------------------------------------------------------------------------

export function SceneEditor() {
  const initial = useMemo(() => JSON.stringify(NIGHT_FERRY_SHOTS[3].build("landscape"), null, 2), []);
  const [text, setText] = useState(initial);
  const [spec, setSpec] = useState<UkiyoeSceneSpec>(() => JSON.parse(initial));
  const [errors, setErrors] = useState<string[]>([]);
  const [rate, setRate] = useState(1);
  const [loop, setLoop] = useState(true);
  const clock = usePlayback(spec.durationFrames, 150, rate, loop);
  const apply = () => {
    try {
      const parsed: unknown = JSON.parse(text);
      const issues = inspectUkiyoeScene(parsed);
      if (issues.length) { setErrors(issues.map(i => `${i.path}: ${i.message}`)); return; }
      setErrors([]); setSpec(parsed as UkiyoeSceneSpec);
    } catch (e) { setErrors([(e as Error).message]); }
  };
  return <div style={page}>
    <Header kicker="UKIYO1 · Scene JSON" title="Author any scene">
      <p style={{ margin: 0 }}>A scene is plain JSON: paper, print settings, palette, wind, camera keys and up to 1,500 nodes
        (block, line, group, motif, particles, figure, text). Edit the squall shot below and apply it. Invalid input is
        rejected with JSON-path errors instead of rendering something else.</p>
    </Header>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))", gap: 16, alignItems: "start" }}>
      <div style={{ display: "grid", gap: 10 }}>
        <Fit width={spec.width} height={spec.height} maxHeight={520}><UkiyoeScene spec={spec} frame={Math.min(clock.frame, spec.durationFrames - 1)} aria-label="Edited scene" /></Fit>
        <Transport clock={clock} total={spec.durationFrames} rate={rate} setRate={setRate} loop={loop} setLoop={setLoop} name="Scene frame" />
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        <label style={label}>Scene JSON
          <textarea aria-label="Scene JSON" value={text} onChange={e => setText(e.target.value)} spellCheck={false}
            style={{ ...control, minHeight: 440, font: "12px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace", whiteSpace: "pre" }} />
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" style={pressed} onClick={apply}>Apply scene</button>
          {NIGHT_FERRY_SHOTS.map(s => <button type="button" key={s.id} style={button} onClick={() => { const j = JSON.stringify(s.build("landscape"), null, 2); setText(j); setSpec(JSON.parse(j)); setErrors([]); }}>Load “{s.title}”</button>)}
        </div>
        {errors.length ? <ul role="alert" style={{ margin: 0, color: "#8b1d12", font: "13px/1.4 ui-monospace, Menlo, monospace" }}>{errors.slice(0, 12).map(e => <li key={e}>{e}</li>)}</ul> : null}
      </div>
    </div>
  </div>;
}

// ---- 6. Bestiary ---------------------------------------------------------------------------------------------------------------------------

interface Specimen { id: string; label: string; actions: readonly string[]; node: (action: string) => UkiyoeNode; sky?: "day" | "night" | "storm" }
const travel = (type: string) => ["walk", "run", "fly", "hop"].includes(type) ? { to: 0 } : {};
const beast = (id: string, species: string, label: string, actions: string[], look: Record<string, unknown> = {}, scale = 1.25, y = 330): Specimen => ({
  id, label, actions,
  node: action => ({ id: "c", kind: "creature", species, x: 300, y, scale, look, actions: [{ type: action, start: 0, end: 239, ...travel(action) }] } as UkiyoeNode),
});
const BESTIARY: readonly Specimen[] = [
  beast("fox", "fox", "Fox (kitsune)", ["walk", "run", "sit", "howl", "leap", "look", "sleep", "transform"]),
  beast("kyubi", "fox", "Nine-tailed fox, foxfire", ["sit", "walk", "howl", "leap"], { color: "gofun", tails: 9, foxfire: true }),
  beast("tanuki", "tanuki", "Tanuki", ["walk", "run", "sit", "sleep", "transform", "look"]),
  beast("tanuki-drum", "tanuki", "Tanuki drumming (hat, sake)", ["drum", "stand", "sit"], { hat: true, bottle: true }),
  beast("dog", "dog", "Dog", ["walk", "run", "sit", "howl", "leap"]),
  beast("cat", "cat", "Calico cat", ["sit", "walk", "sleep", "leap", "look"]),
  beast("rabbit", "rabbit", "Rabbit", ["hop", "sit", "look"], {}, 1.4),
  beast("crane", "crane", "Crane (tsuru)", ["stand", "dance", "fly", "walk", "peck"], {}, 1.2, 350),
  beast("heron", "heron", "Heron", ["peck", "stand", "fly"], {}, 1.2, 350),
  beast("crow", "crow", "Crow", ["stand", "fly", "peck", "walk"], {}, 1.8, 340),
  beast("pheasant", "pheasant", "Pheasant (kiji)", ["walk", "stand", "fly", "peck"], {}, 1.6, 340),
  beast("sparrow", "sparrow", "Sparrow", ["stand", "fly", "peck"], {}, 2.6, 340),
  { id: "dragon", label: "Dragon (ryū) with pearl", actions: ["fly", "coil", "roar"], sky: "storm",
    node: action => ({ id: "c", kind: "creature", species: "dragon", x: 400, y: 250, look: { size: 470, pearl: true }, actions: [{ type: action, start: 0, end: 239, ...travel(action) }] } as UkiyoeNode) },
  { id: "oni-red", label: "Red oni with kanabō", actions: ["walk", "cheer", "talk", "bow", "startle", "jump", "run"],
    node: action => ({ id: "c", kind: "figure", x: 300, y: 370, scale: .95, look: CAST["oni-red"], actions: [{ type: action, start: 0, end: 239, ...travel(action) }] } as UkiyoeNode) },
  { id: "oni-blue", label: "Blue oni", actions: ["talk", "walk", "cheer", "brace", "point"],
    node: action => ({ id: "c", kind: "figure", x: 300, y: 370, scale: .95, facing: "left", look: CAST["oni-blue"], actions: [{ type: action, start: 0, end: 239, ...travel(action), angle: action === "point" ? 85 : undefined }] } as UkiyoeNode) },
  { id: "peach", label: "Peach (momo) splitting open", actions: ["open", "float"], sky: "day",
    node: action => ({ id: "c", kind: "motif", motif: "peach", x: 300, y: 250, params: { size: 90, ...(action === "open" ? { openAt: 60, openDuration: 34 } : {}) }, loops: [{ kind: "rock", amplitude: 1.2, period: 60 }] } as UkiyoeNode) },
];

export function Bestiary() {
  const [wind, setWind] = useState(.3);
  const [cadence, setCadence] = useState<1 | 2 | 3 | 4>(2);
  const [chosen, setChosen] = useState<Record<string, string>>(() => Object.fromEntries(BESTIARY.map(b => [b.id, b.actions[0]])));
  const clock = usePlayback(240, 30, 1, true, true);
  const specs = useMemo(() => BESTIARY.map((b): UkiyoeSceneSpec => ({
    version: 1, id: "best-" + b.id, width: 600, height: 400, durationFrames: 240, seed: 70 + b.id.length, cadence, wind: { base: wind, turbulence: .4 },
    palette: { preset: b.sky === "storm" ? "edo" : "spring" },
    nodes: [
      b.sky === "storm"
        ? { id: "sky", kind: "motif", motif: "sky", params: { width: 600, height: 400, style: "horizon", horizonAt: .9 } }
        : { id: "sky", kind: "motif", motif: "sky", params: { width: 600, height: 400, band: .35, horizon: "beni" } },
      ...(b.sky === "storm" ? [] : [{ id: "ground", kind: "block", x: 300, y: 365, shape: { type: "rect", width: 620, height: 90 }, fill: { type: "linear", angle: 90, stops: [[0, "kusa", .8], [1, "matsu", .9]] }, grain: .8, line: 1 } as UkiyoeNode]),
      b.node(chosen[b.id]),
      { id: "t", kind: "text", style: "caption", depth: 0, x: 300, y: 394, text: b.label, size: 20 },
    ],
  })), [wind, cadence, chosen]);
  return <div style={page}>
    <Header kicker="UKIYO1 · Folktale bestiary" title="Animals, spirits and the things of old stories">
      <p style={{ margin: 0 }}>Creature rigs drawn as prints draw them: flat fills, a fine key line, fur and feather hatching. The
        four-legged rig covers fox, nine-tailed kitsune with foxfire, tanuki (including the upright, belly-drumming folk tanuki with hat
        and sake bottle), dog, cat and rabbit. The bird rig covers crane, heron, crow, pheasant and sparrow. The dragon swims through
        the air with whiskers, mane, belly plates and its flaming pearl. Oni are full figures with horns, fangs, a tiger-skin loincloth
        and a kanabō, so they can do every figure action. <code>transform</code> vanishes a creature in a puff of smoke (henge) so a
        new node can appear in its place. Pick an action on any card.</p>
    </Header>
    <section aria-label="Bestiary controls" style={{ ...panel, gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
      <Slider name="Wind" value={wind} min={-2} max={2} step={.1} onChange={setWind} format={v => v.toFixed(1)} />
      <Select name="Cadence" value={cadence} options={[1, 2, 3, 4] as const} onChange={setCadence} labels={{ 1: "On ones", 2: "On twos", 3: "On threes", 4: "On fours" }} />
    </section>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
      {specs.map((s, i) => {
        const b = BESTIARY[i];
        return <div key={b.id} style={{ display: "grid", gap: 6 }}>
          <div style={{ aspectRatio: "3 / 2", boxShadow: "0 6px 20px rgba(40,30,20,.15)" }}>
            <UkiyoeScene spec={s} frame={clock.frame} style={{ width: "100%", height: "100%" }} aria-label={b.label} />
          </div>
          <Select name={b.label + " action"} value={chosen[b.id]} options={b.actions} onChange={v => setChosen(c => ({ ...c, [b.id]: v }))} />
        </div>;
      })}
    </div>
  </div>;
}
