/**
 * UKIYO1 Storybook studio: the "Night Ferry" film player with live print/art-direction controls, a printer's-proof
 * lab, a cast lab for figures and actions, a motif gallery and a JSON scene editor. Every control feeds the real
 * renderer; nothing here is a mock-up of the output.
 */
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import "@fontsource-variable/newsreader";
import { compileFilm } from "../../registry/video/film-document";
import type { CompiledSceneSound } from "../../registry/video/film-split-edits";
import { FilmStage } from "../../registry/video/film-stage";
import type { UkiyoeAction, UkiyoeActionType, UkiyoeFigureLook, UkiyoeHair, UkiyoeHat, UkiyoeProp } from "../../registry/video/ukiyoe/ukiyoe-figure";
import { UKIYOE_ACTIONS, UKIYOE_HAIRS, UKIYOE_HATS, UKIYOE_PROPS } from "../../registry/video/ukiyoe/ukiyoe-figure";
import type { UkiyoeMotifName } from "../../registry/video/ukiyoe/ukiyoe-motifs";
import type { UkiyoePresetName } from "../../registry/video/ukiyoe/ukiyoe-pigments";
import { palette, UKIYOE_PRESETS, UKIYOE_ROLES } from "../../registry/video/ukiyoe/ukiyoe-pigments";
import type { UkiyoePatternType } from "../../registry/video/ukiyoe/ukiyoe-prims";
import { UKIYOE_PATTERNS } from "../../registry/video/ukiyoe/ukiyoe-prims";
import type { UkiyoeCrowdMood } from "../../registry/video/ukiyoe/ukiyoe-crowd";
import { UKIYOE_CROWD_MOODS } from "../../registry/video/ukiyoe/ukiyoe-crowd";
import { UKIYOE_SQUARE_VIEW_SPECIES } from "../../registry/video/ukiyoe/ukiyoe-creatures";
import { UKIYOE_MAIKO_LOOK } from "../../registry/video/ukiyoe/ukiyoe-maiko";
import { samuraiDuel, samuraiKata, UKIYOE_KAMAE, UKIYOE_SAMURAI_LOOK } from "../../registry/video/ukiyoe/ukiyoe-katana";
import { oniFight, UKIYOE_MOMOTARO_LOOK } from "../../registry/video/ukiyoe/ukiyoe-oni";
import { castleTown } from "../../registry/video/ukiyoe/ukiyoe-town";
import type { UkiyoeInteriorKind } from "../../registry/video/ukiyoe/ukiyoe-interior";
import { interiorScene, UKIYOE_INTERIOR_KINDS } from "../../registry/video/ukiyoe/ukiyoe-interior";
import { onnaScene } from "../../registry/video/ukiyoe/ukiyoe-onna";
import type { UkiyoeFolkWork } from "../../registry/video/ukiyoe/ukiyoe-folk";
import { folkScene, UKIYOE_FOLK_WORK } from "../../registry/video/ukiyoe/ukiyoe-folk";
import type { UkiyoeEffectDemo } from "../../registry/video/ukiyoe/ukiyoe-effects";
import { effectScene, UKIYOE_EFFECT_DEMOS } from "../../registry/video/ukiyoe/ukiyoe-effects";
import type { UkiyoeKamiScene } from "../../registry/video/ukiyoe/ukiyoe-kami";
import { kamiScene, UKIYOE_KAMI_SCENES } from "../../registry/video/ukiyoe/ukiyoe-kami";
import type { UkiyoeBushiScene } from "../../registry/video/ukiyoe/ukiyoe-bushi";
import { bushiScene, UKIYOE_BUSHI_SCENES } from "../../registry/video/ukiyoe/ukiyoe-bushi";
import type { UkiyoeAnimalHabitat } from "../../registry/video/ukiyoe/ukiyoe-critters";
import type { UkiyoeAnimalYokaiScene } from "../../registry/video/ukiyoe/ukiyoe-critters";
import { animalScene, animalYokaiScene, UKIYOE_ANIMAL_HABITATS, UKIYOE_ANIMAL_YOKAI_SCENES } from "../../registry/video/ukiyoe/ukiyoe-critters";
import type { UkiyoeTempleScene } from "../../registry/video/ukiyoe/ukiyoe-temple";
import { templeScene, UKIYOE_TEMPLE_SCENES } from "../../registry/video/ukiyoe/ukiyoe-temple";
import type { UkiyoeTreeScene } from "../../registry/video/ukiyoe/ukiyoe-trees";
import { treeScene, UKIYOE_TREE_SCENES } from "../../registry/video/ukiyoe/ukiyoe-trees";
import type { UkiyoeHeianScene } from "../../registry/video/ukiyoe/ukiyoe-heian";
import { heianScene, UKIYOE_HEIAN_SCENES } from "../../registry/video/ukiyoe/ukiyoe-heian";
import type { UkiyoeFolkYokaiScene } from "../../registry/video/ukiyoe/ukiyoe-folkyokai";
import { folkYokaiScene, UKIYOE_FOLK_YOKAI_SCENES } from "../../registry/video/ukiyoe/ukiyoe-folkyokai";
import type { UkiyoeGiantScene } from "../../registry/video/ukiyoe/ukiyoe-giants";
import { giantScene, UKIYOE_GIANT_SCENES } from "../../registry/video/ukiyoe/ukiyoe-giants";
import type { UkiyoeTsukumoScene } from "../../registry/video/ukiyoe/ukiyoe-tsukumo";
import { tsukumoScene, UKIYOE_TSUKUMO_SCENES } from "../../registry/video/ukiyoe/ukiyoe-tsukumo";
import type { UkiyoeRealmScene } from "../../registry/video/ukiyoe/ukiyoe-realms";
import { realmScene, UKIYOE_REALM_SCENES } from "../../registry/video/ukiyoe/ukiyoe-realms";
import type { UkiyoeParadeScene } from "../../registry/video/ukiyoe/ukiyoe-parade";
import { paradeScene, UKIYOE_PARADE_SCENES } from "../../registry/video/ukiyoe/ukiyoe-parade";
import { UKIYOE_MOODS } from "../../registry/video/ukiyoe/ukiyoe-face";
import type { UkiyoeRole, UkiyoeSeason } from "../../registry/video/ukiyoe/ukiyoe-wardrobe";
import { UKIYOE_SEASONS, ukiyoeWardrobe } from "../../registry/video/ukiyoe/ukiyoe-wardrobe";
import type { UkiyoeEpisodeAspect, UkiyoeEpisodeSpec } from "../../registry/video/ukiyoe/ukiyoe-episode";
import { inspectUkiyoeEpisode, ukiyoeEpisode, ukiyoeEpisodeSrt, ukiyoeEpisodeStarts } from "../../registry/video/ukiyoe/ukiyoe-episode";
import { KASA_JIZO_EPISODE } from "./ukiyoe-kasa-jizo";
import { URASHIMA_EPISODE } from "./ukiyoe-urashima";
import { MOMOTARO_EPISODE } from "./ukiyoe-momotaro";
import { KAGUYA_EPISODE } from "./ukiyoe-kaguya";
import { oiranProcession, UKIYOE_OIRAN_LOOKS } from "../../registry/video/ukiyoe/ukiyoe-oiran";
import { UkiyoeScene } from "../../registry/video/ukiyoe/ukiyoe-react";
import type { UkiyoeNode, UkiyoeSceneSpec } from "../../registry/video/ukiyoe/ukiyoe-scene";
import { inspectUkiyoeScene } from "../../registry/video/ukiyoe/ukiyoe-scene";
import { ukiyoeFilm, ukiyoeShotStarts } from "./ukiyoe-film";
import type { UkiyoeAspect, UkiyoeFilmTweaks, UkiyoeShot } from "./ukiyoe-night-ferry";
import { FOLKTALE_KASUMI, FOLKTALE_SHOTS } from "./ukiyoe-folktale";
import { SNOW_WOMAN_KASUMI, SNOW_WOMAN_SHOTS } from "./ukiyoe-snow-woman";
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

// ---- Sound -------------------------------------------------------------------------------------------------------------------------

const BED_PREVIEWS = import.meta.glob("../../assets/sound/lab/catalog/bed-*.m4a", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
/**
 * Plays the compiled film's scene sounds (the same recorded beds the film renders with) on the player's frame clock:
 * each bed loops while the playhead is inside it, its level following the compiled gain and the crossfades at the cuts.
 * Audio starts only from the viewer's Play press and stops on pause, seek past it, or when sound is switched off. The
 * preview leaves out the render's low-pass filter and mastering.
 */
/** A film bed (a layer over a shot) in the same shape as a compiled scene sound, so one player handles both. */
function bedsAsSounds(doc: { audio?: { beds?: readonly { id: string; sound: string; gainDb?: number; startFrame?: number; durationFrames?: number; fadeSeconds?: number }[] } }, fps = 30): CompiledSceneSound[] {
  return (doc.audio?.beds ?? []).map(bed => {
    const start = bed.startFrame ?? 0, fade = Math.round((bed.fadeSeconds ?? 1.5) * fps);
    return { sceneId: "bed:" + bed.id, sound: bed.sound, gainDb: bed.gainDb, startFrame: start, endFrame: start + (bed.durationFrames ?? 0), fadeInFrames: fade, fadeOutFrames: fade };
  });
}
function useSceneSound(sounds: readonly CompiledSceneSound[], frame: number, playing: boolean, rate: number, enabled: boolean, fps = 30) {
  const audios = useRef(new Map<string, HTMLAudioElement>());
  useEffect(() => () => { audios.current.forEach(a => a.pause()); audios.current.clear(); }, []);
  useEffect(() => {
    const live = new Set<string>();
    if (enabled && playing) for (const item of sounds) {
      if (frame < item.startFrame || frame >= item.endFrame) continue;
      const url = BED_PREVIEWS[`../../assets/sound/lab/catalog/${item.sound}.m4a`];
      if (!url) continue;
      const key = item.sceneId;
      live.add(key);
      let audio = audios.current.get(key);
      if (!audio) {
        audio = new Audio(url);
        audio.loop = true;
        audio.currentTime = ((frame - item.startFrame) / fps) % 8;
        audios.current.set(key, audio);
        // Media playback started by the viewer's Play press.
        void HTMLMediaElement.prototype.play.call(audio).catch(() => undefined);
      }
      const fadeIn = item.fadeInFrames > 0 ? Math.min(1, (frame - item.startFrame) / item.fadeInFrames) : 1;
      const fadeOut = item.fadeOutFrames > 0 ? Math.min(1, (item.endFrame - frame) / item.fadeOutFrames) : 1;
      audio.volume = Math.max(0, Math.min(1, 10 ** ((item.gainDb ?? 0) / 20) * fadeIn * fadeOut));
      audio.playbackRate = rate;
    }
    for (const [key, audio] of audios.current) if (!live.has(key)) { audio.pause(); audios.current.delete(key); }
  }, [sounds, frame, playing, rate, enabled, fps]);
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

export function SnowWomanFilmPlayer() {
  return <UkiyoeFilmPlayer shots={SNOW_WOMAN_SHOTS} kasumi={SNOW_WOMAN_KASUMI} filmId="ukiyoe-snow-woman" title="The Snow Woman" kicker="Ukiyo-e yōkai tale · UKIYO1" initialFrame={240} firstShotFrame={150}
    description={<>An original three-shot yōkai tale after the yuki-onna legend. A traveller crosses a snowbound pass below a
      Kisokaidō-style mountain range, past thatched and gasshō farmhouses with smoke rising and a row of jizō in red caps, while a
      fox stops to watch him. At night he passes the old shrine: komainu guard the gate, a paper lantern grins on its hook, an
      umbrella hops by on one leg, soul-flames drift and a ghost appears among the pines. In the snowfield beyond, a woman in white
      comes out of the storm, breathes her cold over him and is gone. Every spirit, building and statue is a rig or motif in the
      same JSON scene engine.</>} />;
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
  const [sound, setSound] = useState(true);
  const tweaks: UkiyoeFilmTweaks = useMemo(() => ({ preset: preset === "per-shot" ? undefined : preset, registration, mottle, grain, line, fibre, cadence, wind, captions }),
    [preset, registration, mottle, grain, line, fibre, cadence, wind, captions]);
  const doc = useMemo(() => ukiyoeFilm(shots, tweaks, { id: filmId, kasumi }), [shots, tweaks, filmId, kasumi]);
  const compiled = useMemo(() => compileFilm(doc, { outputId: aspect }), [doc, aspect]);
  const starts = useMemo(() => ukiyoeShotStarts(shots), [shots]);
  const total = compiled.ok ? compiled.film.durationFrames : 1;
  const clock = usePlayback(total, initialFrame, rate, loop);
  const allSounds = useMemo(() => [...(compiled.ok ? compiled.film.sceneSounds : []), ...bedsAsSounds(doc as never)], [compiled, doc]);
  useSceneSound(allSounds, clock.frame, clock.playing, rate, sound);
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
      <Check name="Ambient sound (recorded beds)" value={sound} onChange={setSound} />
      <Check name="Reduced motion (settled frames)" value={reducedMotion} onChange={setReducedMotion} />
    </section>
    <p style={{ fontSize: 13, margin: 0, opacity: .8, maxWidth: 900 }}>Sound: each shot plays recorded CC0 field recordings from the sound catalog (river,
      stream, mountain wind, heavy rain, surf, distant fireworks, night crickets), crossfading at the cuts. The same beds are written into the film document, so a render carries them with
      its low-pass filter and mastering; the preview here plays them plainly.</p>
    <p style={{ fontSize: 13, margin: 0, opacity: .8, maxWidth: 900 }}>Every frame is a pure function of the frame number, so scrubbing, seeking backwards and
      jumping between shots are exact. All artwork is generated by the engine: no photographs, no third-party prints and no traced
      compositions. Ukiyo-e and emaki conventions (bokashi, kentō registration, suyari-gasumi, fukinuki-yatai) are public-domain techniques.</p>
  </div>;
}

// ---- Episode template ----------------------------------------------------------------------------------------------------------------

/** A folktale episode built with `ukiyoeEpisode()`: title card, narrated shots with mist transitions, end card, captions and .srt. */
const EPISODES: readonly UkiyoeEpisodeSpec[] = [KASA_JIZO_EPISODE, URASHIMA_EPISODE, MOMOTARO_EPISODE, KAGUYA_EPISODE];
const EPISODE_IDS = EPISODES.map(e => e.id);
const EPISODE_LABELS = Object.fromEntries(EPISODES.map(e => [e.id, e.title]));

export function EpisodePlayer({ initial = KASA_JIZO_EPISODE.id }: { initial?: string }) {
  const [id, setId] = useState(initial);
  const episode = EPISODES.find(e => e.id === id) ?? EPISODES[0];
  const [aspect, setAspect] = useState<UkiyoeEpisodeAspect>("landscape");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [sound, setSound] = useState(true);
  const doc = useMemo(() => ukiyoeEpisode(episode), [episode]);
  const issues = useMemo(() => inspectUkiyoeEpisode(episode), [episode]);
  const srt = useMemo(() => "data:application/x-subrip;charset=utf-8," + encodeURIComponent(ukiyoeEpisodeSrt(episode)), [episode]);
  const compiled = useMemo(() => compileFilm(doc, { outputId: aspect }), [doc, aspect]);
  const starts = useMemo(() => ukiyoeEpisodeStarts(episode), [episode]);
  const total = compiled.ok ? compiled.film.durationFrames : 1;
  const clock = usePlayback(total, 120, 1, false);
  useSceneSound(compiled.ok ? compiled.film.sceneSounds : [], clock.frame, clock.playing, 1, sound);
  if (!compiled.ok) return <pre role="alert">{compiled.diagnostics.map(d => d.path + ": " + d.message).join("\n")}</pre>;
  const film = compiled.film, shotIndex = starts.reduce((found, s, i) => s <= clock.frame ? i : found, 0);
  return <div style={page}>
    <Header kicker="UKIYO1 · Episode template" title={episode.title}>
      <p style={{ margin: 0 }}>One folktale as a YouTube episode, written as shots and the narration over each. <code>ukiyoeEpisode()</code> prints
        a title card, joins the shots with gold mist, sizes the narration captions for 16:9 and 9:16 inside the platform safe area, holds an end
        card clear for the end screen, and writes the same captions as an .srt for upload. Narration timings are script estimates until a voice
        is recorded and aligned.</p>
    </Header>
    <nav aria-label="Shots" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {episode.shots.map((shot, i) => <button type="button" key={shot.id} style={i === shotIndex ? pressed : button} aria-pressed={i === shotIndex}
        onClick={() => clock.seek(starts[i] + (shot.kasumi ?? 0) + 30)}>{i + 1}. {shot.title}</button>)}
    </nav>
    <Fit width={film.width} height={film.height} maxHeight={aspect === "landscape" ? 640 : 760}>
      <FilmStage film={film} frame={clock.frame} reducedMotion={reducedMotion} renderObject={() => null}
        renderSlot={(content, context) => {
          const node = renderUkiyoeSlot(content, context);
          if (node === undefined) throw new Error("Unknown slot " + content.slot);
          return node;
        }} />
    </Fit>
    <Transport clock={clock} total={total} rate={1} setRate={() => undefined} loop={false} setLoop={() => undefined} name="Episode frame" />
    <section aria-label="Episode controls" style={panel}>
      <Select name="Episode" value={id} options={EPISODE_IDS} onChange={(v: string) => { setId(v); clock.seek(120); }} labels={EPISODE_LABELS} />
      <Select name="Output" value={aspect} options={["landscape", "portrait"] as const} onChange={setAspect} labels={{ landscape: "16:9 YouTube", portrait: "9:16 Shorts" }} />
      <Check name="Ambient sound (recorded beds)" value={sound} onChange={setSound} />
      <Check name="Reduced motion (settled frames)" value={reducedMotion} onChange={setReducedMotion} />
      <a href={srt} download={episode.id + ".srt"} style={{ alignSelf: "end" }}>Download captions (.srt)</a>
    </section>
    <p role="status" style={{ fontSize: 13, margin: 0 }}>{issues.length ? `Script check: ${issues.length} problem(s): ` + issues.map(i => i.path + " " + i.message).join("; ") : "Script check: no problems (reading speed, caption gaps, caption band, end card)."}</p>
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
const ACTION_HINT: Partial<Record<UkiyoeActionType, Partial<UkiyoeAction>>> = { walk: { to: 260 }, dochu: { to: 110 }, run: { to: 420 }, point: { angle: 80 }, bow: { angle: 38 }, look: { angle: -24 }, hold: { angle: 40, amount: 80 } };

const CAST_NAMES = ["traveller", "mother", "child", "ferryman", "merchant", "maiko", "oni-red", "monk", "oiran", "samurai"] as const;
const CAST_LOOKS: Readonly<Record<string, UkiyoeFigureLook>> = { ...CAST, maiko: UKIYOE_MAIKO_LOOK, oiran: UKIYOE_OIRAN_LOOKS.oiran, samurai: UKIYOE_SAMURAI_LOOK };

/** Wardrobe: people of every role dressed for a season by `ukiyoeWardrobe`, with patterns, hem designs and obi knots. */
export function WardrobeLab() {
  const [season, setSeason] = useState<UkiyoeSeason>("spring");
  const [seed, setSeed] = useState(11);
  const [view, setView] = useState<"profile" | "three-quarter">("profile");
  const roles: UkiyoeRole[] = ["maiden", "maiden", "maiden", "wife", "wife", "elder-woman", "girl", "merchant", "artisan", "laborer", "samurai", "elder-man"];
  const spec: UkiyoeSceneSpec = useMemo(() => ({
    version: 1, id: "wardrobe-lab", width: 1920, height: 1080, durationFrames: 120, seed: 5, palette: { preset: "edo" }, mount: { kind: "print" },
    nodes: [
      { id: "bg", kind: "block", x: 960, y: 540, shape: { type: "rect", width: 1920, height: 1080 }, fill: "paper", line: 0 },
      ...roles.map((r, i) => ({ id: "f" + i, kind: "figure", look: { ...ukiyoeWardrobe(r, seed + i * 5, season), prop: undefined, view }, x: 95 + i * 157, y: 990, scale: 2.5, facing: i % 3 === 2 ? "left" : "right" } as UkiyoeNode)),
      ...roles.map((r, i) => ({ id: "t" + i, kind: "text", style: "plain", text: r, x: 95 + i * 157, y: 70, size: 22, color: "sumi" } as UkiyoeNode)),
    ],
  }), [season, seed, view]);
  return <div style={page}>
    <Header kicker="UKIYO1 · Wardrobe" title="Townsfolk dressed for the season">
      <p style={{ margin: 0 }}>After the Met's Edo kosode and Kiyonaga's beauties. <code>ukiyoeWardrobe(role, seed, season)</code> chooses the robe's dye
        and pattern (stripes, plaids, ikat, key-fret, plum, maple, chrysanthemum, iris, rising steam…), a design rising from the hem for young women,
        the obi colour, design and knot (taiko, tateya, bunko, kichiya), the under-collar, layers, hair and footwear. Crowds draw their people from it.</p>
    </Header>
    <section aria-label="Wardrobe controls" style={{ ...panel, gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
      <Select name="Season" value={season} options={UKIYOE_SEASONS} onChange={setSeason} />
      <Select name="View" value={view} options={["profile", "three-quarter"] as const} onChange={setView} />
      <button type="button" style={button} onClick={() => setSeed(s => s + 97)}>Dress them again</button>
    </section>
    <Fit width={1920} height={1080}><UkiyoeScene spec={spec} frame={30} style={{ width: "100%", height: "100%" }} aria-label="Townsfolk wardrobe" /></Fit>
  </div>;
}

/** Faces: the bijin face after Utamaro, eight expressions, and the face traits that make every character different. */
export function FaceLab() {
  const [view, setView] = useState<"profile" | "three-quarter" | "front">("three-quarter");
  const [who, setWho] = useState<"woman" | "maiko" | "oiran" | "man" | "elder">("woman");
  const [show, setShow] = useState<"expressions" | "crowd">("expressions");
  const looks: Record<string, UkiyoeFigureLook> = { woman: CAST.mother, maiko: CAST.maiko, oiran: UKIYOE_OIRAN_LOOKS.oiran, man: CAST.merchant, elder: CAST.elder };
  const moods = ["none", ...UKIYOE_MOODS] as const;
  const spec: UkiyoeSceneSpec = useMemo(() => ({
    version: 1, id: "face-lab", width: 1920, height: 1080, durationFrames: 120, seed: 5, palette: { preset: "edo" }, mount: { kind: "print" },
    nodes: [
      { id: "bg", kind: "block", x: 960, y: 540, shape: { type: "rect", width: 1920, height: 1080 }, fill: "paper", line: 0 },
      ...(show === "expressions" ? [
        // The chosen character in each mood, as busts in two rows.
        ...moods.map((m, i) => ({ id: "m" + i, kind: "figure", look: { ...looks[who], prop: "none", view }, x: 130 + i * 207, y: 1010, scale: 3.4, facing: "right", actions: m === "none" ? [] : [{ type: "emote", mood: m, start: 0, end: 999, blend: 1 }] } as UkiyoeNode)),
        ...moods.map((m, i) => ({ id: "t" + i, kind: "text", style: "plain", text: m, x: 130 + i * 207, y: 70, size: 30, color: "sumi" } as UkiyoeNode)),
      ] : Array.from({ length: 14 }, (_, i) => ({ id: "c" + i, kind: "figure", look: { ...(Object.values(CAST)[i % Object.values(CAST).length]), robe: (["ai", "cha", "kusa", "beni", "murasaki", "kogecha", "sora"] as const)[i % 7], prop: "none", view }, x: 140 + (i % 7) * 270, y: i < 7 ? 520 : 1020, scale: 1.7, facing: "right" } as UkiyoeNode))),
    ],
  }), [view, who, show]);
  return <div style={page}>
    <Header kicker="UKIYO1 · Faces" title="The bijin face, expressions and face traits">
      <p style={{ margin: 0 }}>After Utamaro's bust portraits: a hair-fine face line, long narrow eyes with the iris hanging from the lid, soft grey
        brows, the tiny rouged mouth, a hairline of combed strands. The <code>emote</code> action blends eight expressions; <code>look.features</code>
        (eye, brow, nose, mouth, jaw, age, mole) default from the look's identity, so each character keeps one face and a crowd's faces differ.</p>
    </Header>
    <section aria-label="Face controls" style={{ ...panel, gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
      <Select name="Show" value={show} options={["expressions", "crowd"] as const} onChange={setShow} />
      <Select name="View" value={view} options={["profile", "three-quarter", "front"] as const} onChange={setView} />
      <Select name="Character" value={who} options={["woman", "maiko", "oiran", "man", "elder"] as const} onChange={setWho} />
    </section>
    <Fit width={1920} height={1080}><UkiyoeScene spec={spec} frame={30} style={{ width: "100%", height: "100%" }} aria-label="Faces and expressions" /></Fit>
  </div>;
}

export function CastLab() {
  const names = CAST_NAMES;
  const [cast, setCast] = useState<Record<string, UkiyoeFigureLook>>(() => Object.fromEntries(names.map(n => [n, CAST_LOOKS[n]])));
  const [actions, setActions] = useState<Record<string, UkiyoeActionType>>({ traveller: "walk", mother: "hold", child: "cheer", ferryman: "pole", merchant: "bow", maiko: "kyomai", "oni-red": "talk", monk: "pray", oiran: "dochu", samurai: "draw" });
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
        return { id: n, kind: "figure", x: 100 + i * 178 - (type === "walk" || type === "run" ? 100 : type === "dochu" ? 60 : 0), y: 930, scale: 1.02, look: cast[n], facing: i % 2 ? "left" : "right", actions: [a] };
      }),
    ],
  }), [cast, actions, wind, cadence]);
  const clock = usePlayback(240, 40, rate, loop, true);
  const look = cast[selected], set = (patch: Partial<UkiyoeFigureLook>) => setCast(c => ({ ...c, [selected]: { ...c[selected], ...patch } }));
  return <div style={page}>
    <Header kicker="UKIYO1 · Cast lab" title="Figures, costumes and actions">
      <p style={{ margin: 0 }}>Each figure is an articulated rig drawn as a print would draw it: a robe silhouette, hanging sleeves
        that lag and blow in the wind, a pale profile face, and costume pattern as its own block. Pick a figure, then change its
        costume and action, or turn it with View: three-quarters, square on from the front, or from behind. The whole cast plays
        together on one clock.</p>
    </Header>
    <Fit width={1920} height={1080} maxHeight={560}><UkiyoeScene spec={spec} frame={clock.frame} aria-label="Cast lab stage" /></Fit>
    <Transport clock={clock} total={240} rate={rate} setRate={setRate} loop={loop} setLoop={setLoop} name="Cast frame" />
    <nav aria-label="Figures" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {names.map(n => <button type="button" key={n} style={n === selected ? pressed : button} aria-pressed={n === selected} onClick={() => setSelected(n)}>{n}</button>)}
    </nav>
    <section aria-label={"Edit " + selected} style={panel}>
      <Select name="Action" value={actions[selected]} options={UKIYOE_ACTIONS} onChange={v => setActions(a => ({ ...a, [selected]: v }))} />
      <Select name="View" value={look.view ?? "profile"} options={["profile", "three-quarter", "front", "back"] as const} onChange={v => set({ view: v })} labels={{ profile: "Profile", "three-quarter": "Three-quarter", front: "Front", back: "Back" }} />
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
      <Select name="Footwear" value={look.feet ?? "waraji"} options={["waraji", "geta", "tabi", "bare", "koma-geta"] as const} onChange={v => set({ feet: v })} />
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
  { motif: "range", label: "Mountain range · waterfall", params: { width: 640, height: 300, layers: 4, waterfall: true }, y: 380 },
  { motif: "range", label: "Mountain range · snow", params: { width: 640, height: 300, layers: 3, snow: .85, variant: 2 }, y: 380 },
  { motif: "minka", label: "Thatched farmhouse · smoke", params: { width: 300, smoke: 1 }, y: 350 },
  { motif: "minka", label: "Gassho house · snow, lit", params: { width: 220, style: "gassho", snow: 1, light: 1 }, y: 350 },
  { motif: "jizo", label: "Roadside jizō", params: { height: 120, count: 3, cap: true }, y: 340 },
  { motif: "komainu", label: "Komainu pair (a, un)", params: { height: 150, pair: true, gap: 330 }, y: 340 },
  { motif: "castle", label: "Castle · white keep, walls, moat", params: { width: 400, tiers: 5 }, y: 306 },
  { motif: "castle", label: "Castle · black, snow, night", params: { width: 420, tiers: 4, style: "black", snow: 1, night: 1 }, y: 306 },
  { motif: "castle", label: "Castle keep alone (distance)", params: { width: 380, tiers: 3, walls: false }, y: 350 },
  { motif: "shop", label: "Merchant shop · noren, sign", params: { width: 300, height: 230 }, y: 330 },
  { motif: "kura", label: "Storehouse · namako base", params: { width: 160, height: 220 }, y: 330 },
  { motif: "yashiki", label: "Samurai residence · gatehouse", params: { width: 540, height: 150, pines: 3 }, y: 330 },
  { motif: "firetower", label: "Fire-watch tower · bell", params: { height: 300 }, y: 350 },
  { motif: "room", label: "Room · fusuma, tokonoma, shelves", params: { width: 480, height: 250, depth: 80 }, y: 320 },
  { motif: "room", label: "Farmhouse · earthen floor, thatch", params: { width: 480, height: 250, depth: 80, kind: "farmhouse", eave: "thatch" }, y: 320 },
  { motif: "room", label: "Room at night · torn shoji", params: { width: 480, height: 250, depth: 80, back: ["shoji", "shoji", "marumado"], night: 1, torn: .8 }, y: 320 },
  { motif: "andon", label: "Andon lamp", params: { height: 220 }, y: 340 },
  { motif: "irori", label: "Irori hearth · kettle", params: { size: 260, hook: 320 }, y: 330 },
  { motif: "futon", label: "Futon · mattress, quilt", params: { length: 420, sleeper: false }, y: 290 },
  { motif: "loom", label: "Loom · beater, shed, cloth", params: { height: 230 }, y: 340 },
  { motif: "byobu", label: "Byōbu folding screen", params: { height: 220, art: "pine" }, y: 330 },
  { motif: "well", label: "Well · ivy, pulley", params: { radius: 90, pulley: true }, y: 340 },
  { motif: "stump", label: "Chopping block · split wood", params: { size: 200 }, y: 320 },
  { motif: "usu", label: "Mochi mortar", params: { size: 220 }, y: 330 },
  { motif: "tarai", label: "Wash tub · cloth", params: { radius: 160 }, y: 320 },
  { motif: "fire", label: "Fire · smoke, embers", params: { width: 360, height: 160 }, y: 340 },
  { motif: "halo", label: "Halo · gold radiance", params: { radius: 110 }, y: 190 },
  { motif: "kumo", label: "Auspicious cloud (zuiun)", params: { width: 300 }, y: 280 },
  { motif: "mato", label: "Archery target", params: { radius: 70, height: 130 }, y: 340 },
  { motif: "belfry", label: "Belfry · bell struck", params: { width: 200, height: 280, strikes: [40, 120, 200] }, y: 350 },
  { motif: "hondo", label: "Temple hall", params: { width: 380, height: 240 }, y: 340 },
  { motif: "gate", label: "Two-storey gate · lantern", params: { width: 300, height: 290, lantern: true }, y: 350 },
  { motif: "gate", label: "Rashōmon in ruin", params: { width: 300, height: 290, ruin: 1 }, y: 350 },
  { motif: "hokora", label: "Mountain shrine · shimenawa", params: { width: 200 }, y: 340 },
  { motif: "graves", label: "Graveyard · sotoba", params: { width: 520, count: 6 }, y: 330 },
  { motif: "toro", label: "Stone lantern · lit", params: { height: 220, lit: 1 }, y: 350 },
  { motif: "hut", label: "Hermit's hut", params: { width: 240, smoke: 1, light: 1 }, y: 340 },
  { motif: "bamboo", label: "Bamboo grove · shining stalk", params: { width: 560, height: 360, stalks: 8, shine: 4 }, y: 370 },
  { motif: "kaki", label: "Persimmon tree", params: { height: 330 }, y: 370 },
  { motif: "shinboku", label: "Sacred tree · shimenawa", params: { height: 340 }, y: 370 },
  { motif: "shinboku", label: "Jubokko · face, reaching", params: { height: 340, face: 1, reach: 1, rope: false, color: "kogecha" }, y: 370 },
  { motif: "jinmenju", label: "Jinmenju · laughing heads", params: { height: 330 }, y: 370 },
  { motif: "gissha", label: "Ox-cart (gissha)", params: { width: 300 }, y: 350 },
  { motif: "sudare", label: "Bamboo blind, half up", params: { width: 200, height: 260, up: .5 }, y: 60 },
  { motif: "kicho", label: "Curtain screen (kichō)", params: { width: 260, height: 290 }, y: 350 },
  { motif: "shinden", label: "Palace veranda", params: { width: 480, height: 300, bays: 3, up: .3 }, y: 360 },
  { motif: "ikou", label: "Kimono rack · kosode-no-te", params: { width: 300, height: 280, hands: 1 }, y: 350 },
  { motif: "ryugu", label: "Dragon Palace (Ryūgū-jō)", params: { width: 460, height: 320 }, y: 360 },
  { motif: "moonpalace", label: "Moon palace", params: { radius: 130 }, y: 180 },
  { motif: "iwato", label: "Rock cave, light bursting", params: { width: 420, height: 320, open: .8 }, y: 370 },
  { motif: "onigashima", label: "Onigashima", params: { width: 520, height: 300 }, y: 360 },
  { motif: "sasa", label: "Tanabata bamboo", params: { height: 330 }, y: 370 },
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

// ---- Crowds ------------------------------------------------------------------------------------------------------------------------

export function CrowdLab() {
  const [mood, setMood] = useState<UkiyoeCrowdMood>("stroll");
  const [count, setCount] = useState(24);
  const [rows, setRows] = useState(3);
  const [direction, setDirection] = useState<"both" | "left" | "right">("both");
  const [seed, setSeed] = useState(12);
  const clock = usePlayback(480, 0, 1, true, true);
  const spec = useMemo((): UkiyoeSceneSpec => ({
    version: 1, id: "crowd-lab", width: 1920, height: 1080, durationFrames: 480, seed, wind: { base: .25 }, palette: { preset: "twilight" },
    nodes: [
      { id: "sky", kind: "motif", motif: "sky", params: { width: 1920, height: 1080, band: .35, horizon: "beni" } },
      { id: "street", kind: "block", x: 960, y: 900, shape: { type: "rect", width: 1960, height: 400 }, fill: { type: "linear", angle: 90, stops: [[0, "ki", .8], [1, "kincha", .9]] }, line: 0, grain: .8 },
      { id: "houses", kind: "motif", motif: "house", x: 960, y: 640, params: { width: 1900, height: 200, noren: "ai", stories: 2, doors: 9 } },
      { id: "crowd", kind: "crowd", x: 960, y: 960, width: 1800, count, rows, rowGap: 70, mood, direction, scale: .9 },
    ],
  }), [mood, count, rows, direction, seed]);
  return <div style={page}>
    <Header kicker="UKIYO1 · Crowds" title="Street life from one node">
      <p style={{ margin: 0 }}>A <code>crowd</code> node fills a strip of road with townsfolk in depth rows, each a full figure with its own look,
        pace and behaviour, seeded so the same crowd is the same people on every frame. <code>stroll</code>: most walk, some stop to look,
        others stand talking or bowing. <code>busy</code>: porters and hurrying walkers. <code>festival</code>: dancing, cheering, waving.{" "}
        <code>procession</code>: everyone walks one way in file. Pass a <code>cast</code> of looks to choose who is in it.</p>
    </Header>
    <section aria-label="Crowd controls" style={{ ...panel, gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
      <Select name="Mood" value={mood} options={UKIYOE_CROWD_MOODS} onChange={setMood} />
      <Slider name="People" value={count} min={1} max={80} step={1} onChange={setCount} format={v => String(v)} />
      <Slider name="Depth rows" value={rows} min={1} max={4} step={1} onChange={setRows} format={v => String(v)} />
      <Select name="Direction" value={direction} options={["both", "left", "right"] as const} onChange={setDirection} />
      <Slider name="Seed" value={seed} min={1} max={60} step={1} onChange={setSeed} format={v => String(v)} />
    </section>
    <Fit width={1920} height={1080}><UkiyoeScene spec={spec} frame={clock.frame} style={{ width: "100%", height: "100%" }} aria-label={`A ${mood} crowd of ${count}`} /></Fit>
    <Transport clock={clock} total={480} rate={1} setRate={() => undefined} loop setLoop={() => undefined} name="Frame" />
  </div>;
}

// ---- Samurai --------------------------------------------------------------------------------------------------------------------------

const KAMAE_LABEL: Readonly<Record<string, string>> = { chudan: "Chūdan", jodan: "Jōdan", hasso: "Hassō", waki: "Waki" };

/** A samurai's solo kata in a raked-gravel courtyard at dawn, and the four guards side by side. */
export function SamuraiKata() {
  const [view, setView] = useState<"profile" | "three-quarter" | "front" | "back">("profile");
  const clock = usePlayback(480, 0, 1, true, true);
  const yard = useMemo((): UkiyoeSceneSpec => ({
    version: 1, id: "samurai-kata", width: 1920, height: 1080, durationFrames: 480, seed: 14, wind: { base: .15, turbulence: .2 }, palette: { preset: "spring" },
    nodes: [
      { id: "sky", kind: "motif", motif: "sky", params: { width: 1920, height: 1080, band: .45, horizon: "beni" } },
      { id: "hall", kind: "motif", motif: "house", x: 1240, y: 640, params: { width: 1100, height: 210, noren: "ai", stories: 1, doors: 5 } },
      { id: "pine", kind: "motif", motif: "pine", x: 330, y: 700, scale: 1.1, params: { height: 520, lean: 12 } },
      { id: "gravel", kind: "block", x: 960, y: 880, shape: { type: "rect", width: 1960, height: 440 }, fill: { type: "linear", angle: 90, stops: [[0, "gofun", 1], [1, "paper", 1]] }, pattern: { type: "nami", color: "usuzumi", scale: 1.2, opacity: .35 }, line: 0, grain: .6 },
      { id: "lantern", kind: "motif", motif: "lantern", x: 1700, y: 760, scale: 1.3, params: { kind: "stone", lit: false } },
      { id: "samurai", kind: "figure", x: 900, y: 960, scale: 1.8, look: { ...UKIYOE_SAMURAI_LOOK, view }, actions: samuraiKata(0) },
    ],
  }), [view]);
  const stances = useMemo((): UkiyoeSceneSpec => ({
    version: 1, id: "samurai-kamae", width: 1920, height: 820, durationFrames: 480, seed: 6, palette: { preset: "edo" }, mount: { kind: "print" },
    nodes: [
      { id: "ground", kind: "block", x: 960, y: 770, shape: { type: "rect", width: 2000, height: 160 }, fill: { type: "linear", angle: 90, stops: [[0, "ki", .5], [1, "kincha", .7]] }, line: 0, grain: 1 },
      ...UKIYOE_KAMAE.map((form, i): UkiyoeNode => ({ id: "kamae-" + form, kind: "figure", x: 260 + i * 470, y: 735, scale: 1.4, look: { ...UKIYOE_SAMURAI_LOOK, view: "three-quarter" }, actions: [{ type: "kamae", start: 0, end: 1, form }] })),
      ...UKIYOE_KAMAE.map((form, i): UkiyoeNode => ({ id: "label-" + form, kind: "text", style: "caption", depth: 0, x: 260 + i * 470, y: 150, text: KAMAE_LABEL[form], size: 24 })),
    ],
  }), []);
  return <div style={page}>
    <Header kicker="UKIYO1 · Samurai" title="The sword: draw, guard, cut, sheathe">
      <p style={{ margin: 0 }}>After the Met's mounted swords and Shunshō's samurai in kamishimo. The katana is drawn in detail: the curved blade
        with its ridge line, the frosted temper line along the edge and the tip's yokote, the gold habaki, the guard, the hilt's silk
        diamond wrap over ray skin and its end cap. The pair is worn edge-up through the obi at the left hip in black lacquered scabbards
        with their cords, under the kamishimo's stiff winged vest with crests. The kata: <code>draw</code> (the hand reaches the hilt, the
        left hand pulls the scabbard back as the blade comes out, and it sweeps forward in a rising cut, settling in the middle guard),{" "}
        <code>kamae</code> (jōdan overhead), <code>cut</code> (a slow raise, a fast diagonal strike with a blur of air behind the blade, the
        follow-through), hassō, waki, chūdan, then <code>sheathe</code> (the flick that clears the blade, the slow slide home) and a bow.
        Both hands stay on the hilt by IK in every guard. Turn him with View.</p>
    </Header>
    <section aria-label="Samurai controls" style={{ ...panel, gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
      <Select name="View" value={view} options={["profile", "three-quarter", "front", "back"] as const} onChange={setView} labels={{ profile: "Profile", "three-quarter": "Three-quarter", front: "Front", back: "Back" }} />
    </section>
    <Fit width={1920} height={1080}><UkiyoeScene spec={yard} frame={clock.frame} style={{ width: "100%", height: "100%" }} aria-label="A samurai performing a sword kata in a gravel courtyard" /></Fit>
    <Transport clock={clock} total={480} rate={1} setRate={() => undefined} loop setLoop={() => undefined} name="Kata frame" />
    <h2 style={{ font: "600 18px Newsreader Variable, serif", margin: "8px 0 0" }}>The four guards</h2>
    <Fit width={1920} height={820} maxHeight={520}><UkiyoeScene spec={stances} frame={clock.frame} style={{ width: "100%", height: "100%" }} aria-label="The middle, overhead, upright and low guards" /></Fit>
  </div>;
}

// ---- Duel ---------------------------------------------------------------------------------------------------------------------------

/** Two samurai duel in a moonlit field of pampas grass: parried cuts with sparks, then a cut that strikes home. */
export function SamuraiDuel() {
  const [view, setView] = useState<"profile" | "three-quarter">("profile");
  const [ending, setEnding] = useState<"struck" | "parried">("struck");
  const clock = usePlayback(620, 0, 1, true, true);
  const spec = useMemo((): UkiyoeSceneSpec => ({
    version: 1, id: "samurai-duel", width: 1920, height: 1080, durationFrames: 620, seed: 31, wind: { base: .6, turbulence: .5 }, palette: { preset: "edo" },
    nodes: [
      { id: "sky", kind: "motif", motif: "sky", params: { width: 1920, height: 1080, top: "yoru", mid: "ai", band: .62, horizon: "murasaki" } },
      { id: "moon", kind: "motif", motif: "moon", x: 1460, y: 250, params: { radius: 110, halo: .9 } },
      { id: "hills", kind: "motif", motif: "hills", x: 960, y: 760, params: { width: 2000, height: 180, color: "ai" } },
      { id: "field", kind: "block", x: 960, y: 900, shape: { type: "rect", width: 1960, height: 360 }, fill: { type: "linear", angle: 90, stops: [[0, "matsu", 1], [1, "yoru", 1]] }, line: 0, grain: .8 },
      ...[180, 520, 1380, 1720].map((x, i): UkiyoeNode => ({ id: "grass-back" + i, kind: "motif", motif: "reeds", x, y: 800, scale: .9, params: { width: 360, height: 210, count: 26, color: "kincha", variant: i } })),
      ...(samuraiDuel({ id: "duel", x: 770, y: 960, scale: 1.5, exchanges: ending === "parried" ? [{ attacker: "a", contact: 104 }, { attacker: "b", contact: 172 }, { attacker: "a", contact: 236 }, { attacker: "b", contact: 298 }, { attacker: "a", contact: 372 }] : undefined })
        .map(n => n.kind === "figure" ? { ...n, look: { ...n.look, view } } : n)),
      ...[80, 1740].map((x, i): UkiyoeNode => ({ id: "grass-front" + i, kind: "motif", motif: "reeds", x, y: 1080, scale: 1.4, params: { width: 420, height: 260, count: 30, color: "kincha", variant: 7 + i } })),
      { id: "leaves", kind: "particles", type: "leaves", area: [0, 0, 1920, 1080], count: 26, speed: 2.2, color: "shu", size: .8 },
    ],
  }), [view, ending]);
  return <div style={page}>
    <Header kicker="UKIYO1 · Duel" title="Two swords in a moonlit field">
      <p style={{ margin: 0 }}>Built by <code>samuraiDuel</code> from a list of exchanges. Both draw; then each cut is timed on its contact frame
        and aimed at one point in front of the defender's brow, so the attacker's blade and the defender's receiving blade cross exactly
        there on that frame (within a fraction of a pixel), and sparks fly from it. A parried cut stops on the other blade and rebounds;
        the last cut strikes home: the defender recoils, his blade drops, and he topples back about his heels, his sword and scabbards
        coming to lie along him. The victor holds his guard, clears the blade and sheathes it.</p>
    </Header>
    <section aria-label="Duel controls" style={{ ...panel, gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
      <Select name="View" value={view} options={["profile", "three-quarter"] as const} onChange={setView} labels={{ profile: "Profile", "three-quarter": "Three-quarter" }} />
      <Select name="Last cut" value={ending} options={["struck", "parried"] as const} onChange={setEnding} labels={{ struck: "Strikes home", parried: "Parried (both sheathe)" }} />
    </section>
    <Fit width={1920} height={1080}><UkiyoeScene spec={spec} frame={clock.frame} style={{ width: "100%", height: "100%" }} aria-label="Two samurai dueling in a moonlit field" /></Fit>
    <Transport clock={clock} total={620} rate={1} setRate={() => undefined} loop setLoop={() => undefined} name="Duel frame" />
  </div>;
}

// ---- Castle town ------------------------------------------------------------------------------------------------------------------

/** A castle town as one handscroll, panned from the keep down through the town. */
export function CastleTown() {
  const [snow, setSnow] = useState(false);
  const spec = useMemo(() => castleTown({ snow: snow ? 1 : 0 }), [snow]);
  const clock = usePlayback(spec.durationFrames, 0, 1, true, true);
  return <div style={page}>
    <Header kicker="UKIYO1 · Castle town" title="From the keep down through the town">
      <p style={{ margin: 0 }}>Built by <code>castleTown</code>: one handscroll 6,400 px wide, panned with holds at four stations, mist bands
        drifting across as in the picture scrolls. The castle on its grassy hill above the moat; the samurai quarter, residence walls and
        gatehouses under pines, retainers passing; the canal under an arched bridge, a boat below; the merchant street, shops with crested
        indigo noren and standing signs, storehouses with namako bases, a busy crowd, the fire-watch tower over the roofs. The new motifs
        (<code>shop</code>, <code>kura</code>, <code>yashiki</code>, <code>firetower</code>) share the castle's storeys and roofs; the
        walkers keep to the street.</p>
    </Header>
    <section aria-label="Castle town controls" style={{ ...panel, gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
      <Check name="Snow" value={snow} onChange={setSnow} />
    </section>
    <Fit width={1920} height={1080}><UkiyoeScene spec={spec} frame={clock.frame} style={{ width: "100%", height: "100%" }} aria-label="A castle town handscroll panning from the castle to the merchant street" /></Fit>
    <Transport clock={clock} total={spec.durationFrames} rate={1} setRate={() => undefined} loop setLoop={() => undefined} name="Scroll frame" />
  </div>;
}

// ---- Interiors ----------------------------------------------------------------------------------------------------------------------

const INTERIOR_LABELS: Readonly<Record<UkiyoeInteriorKind, string>> = {
  inn: "Inn at night: guests by the lamp, a maid arriving", weaver: "The weaver at her loom", hearth: "Farmhouse hearth", bedroom: "Bedroom on a snowy night",
};

/** Rooms with the front wall taken away, as the prints draw them, with their figures at work and at rest. */
export function Interiors() {
  const [kind, setKind] = useState<UkiyoeInteriorKind>("inn");
  const spec = useMemo(() => interiorScene(kind), [kind]);
  const clock = usePlayback(spec.durationFrames, 0, 1, true, true);
  return <div style={page}>
    <Header kicker="UKIYO1 · Interiors" title="Rooms seen through the open front">
      <p style={{ margin: 0 }}>Built by <code>interiorScene</code> from the <code>room</code> motif after Hiroshige's Akasaka inn and Harunobu's
        parlours: tatami in staggered columns with their cloth borders, fusuma with painted bamboo or gold clouds, shoji, a tokonoma with a
        hanging scroll, chigaidana shelves, a veranda. The room comes in two parts so the figures sit between the floor and the front posts.
        The lamp flickers, the hearth burns and steams, the weaver's hand stays on the beater as it swings, a shoji slides open on the snow.</p>
    </Header>
    <section aria-label="Interior controls" style={{ ...panel, gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
      <Select name="Room" value={kind} options={UKIYOE_INTERIOR_KINDS} onChange={setKind} labels={INTERIOR_LABELS} />
    </section>
    <Fit width={1920} height={1080}><UkiyoeScene spec={spec} frame={clock.frame} style={{ width: "100%", height: "100%" }} aria-label={INTERIOR_LABELS[kind]} /></Fit>
    <Transport clock={clock} total={spec.durationFrames} rate={1} setRate={() => undefined} loop setLoop={() => undefined} name="Room frame" />
  </div>;
}

// ---- Women ghosts and hags --------------------------------------------------------------------------------------------------------

type OnnaView = "profile" | "three-quarter" | "front" | "back";
const ONNA_VIEWS: readonly OnnaView[] = ["profile", "three-quarter", "front", "back"];

/** The women of the ghost stories: each looks alive until a `reveal`, then shows what she is; and Okiku in her well. */
export function WomenGhosts() {
  const [kind, setKind] = useState<"lineup" | "okiku">("lineup");
  const [view, setView] = useState<OnnaView>("profile");
  const spec = useMemo(() => onnaScene(kind, view), [kind, view]);
  const clock = usePlayback(spec.durationFrames, 0, 1, true, true);
  return <div style={page}>
    <Header kicker="UKIYO1 · Women ghosts" title="They look alive until the story turns">
      <p style={{ margin: 0 }}>After Hokusai's <em>One Hundred Ghost Stories</em> and Sekien's yōkai books. Each woman is an ordinary figure
        look with a ghost-story <code>face</code>: at frame 90 a <code>reveal</code> smooths the faceless woman's features away, drops the cloth
        from the slit mouth, opens the mouth in the back of the head, turns the face to bone, swells Oiwa's eye and bares the hag's fangs.
        Hashihime wears the iron crown of candles; the ubume holds her baby. Every view works. Okiku rises from her overgrown well on a coil of
        plates, breathing out a curl of vapour.</p>
    </Header>
    <section aria-label="Ghost controls" style={{ ...panel, gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
      <Select name="Scene" value={kind} options={["lineup", "okiku"] as const} onChange={setKind} labels={{ lineup: "Eight women, the reveal", okiku: "Okiku at the well" }} />
      {kind === "lineup" ? <Select name="View" value={view} options={ONNA_VIEWS} onChange={setView} /> : null}
    </section>
    <Fit width={1920} height={1080}><UkiyoeScene spec={spec} frame={clock.frame} style={{ width: "100%", height: "100%" }} aria-label={kind === "lineup" ? "Eight women of the ghost stories revealing what they are" : "Okiku rising from the well"} /></Fit>
    <Transport clock={clock} total={spec.durationFrames} rate={1} setRate={() => undefined} loop setLoop={() => undefined} name="Ghost frame" />
  </div>;
}

// ---- Folk work ----------------------------------------------------------------------------------------------------------------------

const FOLK_LABELS: Readonly<Record<UkiyoeFolkWork, string>> = {
  woodcutter: "Splitting firewood", farmer: "Hoeing, a rice ball brought", mochi: "Pounding mochi", washing: "Hachikazuki washing", luck: "The mallet of luck",
};

/** Everyday work the folktales turn on: the tools swing on their own timeline and land on their marks. */
export function FolkWork() {
  const [kind, setKind] = useState<UkiyoeFolkWork>("woodcutter");
  const spec = useMemo(() => folkScene(kind), [kind]);
  const clock = usePlayback(spec.durationFrames, 0, 1, true, true);
  return <div style={page}>
    <Header kicker="UKIYO1 · Folk work" title="Axe, hoe, pestle, tub and the mallet of luck">
      <p style={{ margin: 0 }}>After the screen <em>Farmers' Lives in the Twelve Months</em> (the Met). <code>chop</code>, <code>hoe</code> and <code>pound</code> swing their tool
        up over the shoulder, hold, and bring it down fast onto its contact point, where the chopping block, the furrows and the mortar are
        placed; chips, clods and mochi fly. Both hands stay on the handle. <code>wash</code> scrubs the cloth in the tub, <code>shake</code> pours
        treasure from the mallet of luck. Props: firewood on the back, a rice ball, Hachikazuki's bowl.</p>
    </Header>
    <section aria-label="Folk work controls" style={{ ...panel, gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
      <Select name="Work" value={kind} options={UKIYOE_FOLK_WORK} onChange={setKind} labels={FOLK_LABELS} />
    </section>
    <Fit width={1920} height={1080}><UkiyoeScene spec={spec} frame={clock.frame} style={{ width: "100%", height: "100%" }} aria-label={FOLK_LABELS[kind]} /></Fit>
    <Transport clock={clock} total={spec.durationFrames} rate={1} setRate={() => undefined} loop setLoop={() => undefined} name="Work frame" />
  </div>;
}

// ---- Effects and magic ----------------------------------------------------------------------------------------------------------------

const EFFECT_LABELS: Readonly<Record<UkiyoeEffectDemo, string>> = {
  fire: "A field on fire", henge: "Fox to woman (henge)", storm: "Lightning storm", blossom: "Ash makes the dead tree bloom", foxfire: "Fox-fires", halo: "Divine radiance",
};

/** Fire, smoke, lightning, ash, fox-fires and a halo, each in a story setting. */
export function Effects() {
  const [kind, setKind] = useState<UkiyoeEffectDemo>("fire");
  const spec = useMemo(() => effectScene(kind), [kind]);
  const clock = usePlayback(spec.durationFrames, 0, 1, true, true);
  return <div style={page}>
    <Header kicker="UKIYO1 · Effects" title="Fire, smoke, lightning, ash and fox-fires">
      <p style={{ margin: 0 }}>After the <em>Kitano Tenjin engi</em> scroll's fire (streaming vermilion tongues, smoke in rounded billows) and
        Hiroshige's <em>Fox Fires at Ōji</em>. The <code>fire</code> and <code>halo</code> motifs, and the <code>smoke</code>, <code>lightning</code>,
        <code>ash</code> and <code>foxfire</code> particles. A fox walks into a puff of curling cloud and a woman walks out; the thunder jolts the
        camera; the old man's ash drifts onto the dead tree and it flowers.</p>
    </Header>
    <section aria-label="Effect controls" style={{ ...panel, gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
      <Select name="Effect" value={kind} options={UKIYOE_EFFECT_DEMOS} onChange={setKind} labels={EFFECT_LABELS} />
    </section>
    <Fit width={1920} height={1080}><UkiyoeScene spec={spec} frame={clock.frame} style={{ width: "100%", height: "100%" }} aria-label={EFFECT_LABELS[kind]} /></Fit>
    <Transport clock={clock} total={spec.durationFrames} rate={1} setRate={() => undefined} loop setLoop={() => undefined} name="Effect frame" />
  </div>;
}

// ---- Kami and heavenly beings ------------------------------------------------------------------------------------------------------

const KAMI_LABELS: Readonly<Record<UkiyoeKamiScene, string>> = {
  hagoromo: "The celestial maiden flies", amaterasu: "The sun goddess leaves the cave", luck: "Ebisu and Daikoku on a cloud", susanoo: "The storm god",
};

/** Gods and celestials: the flying tennyo with her hagoromo, Amaterasu with the mirror, the gods of luck, Susanoo. */
export function Kami() {
  const [kind, setKind] = useState<UkiyoeKamiScene>("hagoromo");
  const spec = useMemo(() => kamiScene(kind), [kind]);
  const clock = usePlayback(spec.durationFrames, 0, 1, true, true);
  return <div style={page}>
    <Header kicker="UKIYO1 · Kami" title="Gods and heavenly beings">
      <p style={{ margin: 0 }}>After the flying celestials of temple art and Hokkei's <em>Ebisu and Daikoku</em>. The <code>fly</code> action lifts a
        figure into the air and carries her; the <code>stole</code> (hagoromo) streams out behind her. Ancient gods wear their hair in
        <code>mizura</code> loops with magatama <code>beads</code>, and hold the <code>mirror</code>, the straight <code>tsurugi</code> or the jewelled
        <code>hoko</code>; Ebisu carries his <code>tai</code>, Daikoku his mallet and rice <code>bag</code>. The <code>kumo</code> cloud carries them.</p>
    </Header>
    <section aria-label="Kami controls" style={{ ...panel, gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
      <Select name="Scene" value={kind} options={UKIYOE_KAMI_SCENES} onChange={setKind} labels={KAMI_LABELS} />
    </section>
    <Fit width={1920} height={1080}><UkiyoeScene spec={spec} frame={clock.frame} style={{ width: "100%", height: "100%" }} aria-label={KAMI_LABELS[kind]} /></Fit>
    <Transport clock={clock} total={spec.durationFrames} rate={1} setRate={() => undefined} loop setLoop={() => undefined} name="Kami frame" />
  </div>;
}

// ---- Warriors II -------------------------------------------------------------------------------------------------------------------

const BUSHI_LABELS: Readonly<Record<UkiyoeBushiScene, string>> = { archer: "The archer: draw, hold, loose", bridge: "Monk and youth on the bridge", armour: "Great armour, four views" };

/** Heian and Genpei warriors: the great armour and horned helmet, the bow with a timed shot, the naginata. */
export function Warriors() {
  const [kind, setKind] = useState<UkiyoeBushiScene>("archer");
  const spec = useMemo(() => bushiScene(kind), [kind]);
  const clock = usePlayback(spec.durationFrames, 0, 1, true, true);
  return <div style={page}>
    <Header kicker="UKIYO1 · Warriors" title="Armour, bow and naginata">
      <p style={{ margin: 0 }}>The <code>armor</code> look draws the ō-yoroi laced in its colour (cuirass, swinging skirt plates, the great shoulder
        board) with the horned <code>kabuto</code>, in every view. <code>shoot</code> raises the bow, draws the string to the ear and holds, looses on
        its contact frame, and the arrow flies to its <code>aim</code> and sticks. The warrior-monk carries his <code>naginata</code> in both hands.</p>
    </Header>
    <section aria-label="Warrior controls" style={{ ...panel, gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
      <Select name="Scene" value={kind} options={UKIYOE_BUSHI_SCENES} onChange={setKind} labels={BUSHI_LABELS} />
    </section>
    <Fit width={1920} height={1080}><UkiyoeScene spec={spec} frame={clock.frame} style={{ width: "100%", height: "100%" }} aria-label={BUSHI_LABELS[kind]} /></Fit>
    <Transport clock={clock} total={spec.durationFrames} rate={1} setRate={() => undefined} loop setLoop={() => undefined} name="Warrior frame" />
  </div>;
}

// ---- Animals II ---------------------------------------------------------------------------------------------------------------------

const HABITAT_LABELS: Readonly<Record<UkiyoeAnimalHabitat, string>> = { mountain: "Mountain: bear, boar, stag, wolf", pond: "Pond: carp, ducks, frog, snake", shore: "Shore: crab, turtle, octopus", farm: "Farm: ox, hawk, mice" };

/** The folktale animals in their places. */
export function Animals() {
  const [kind, setKind] = useState<UkiyoeAnimalHabitat>("mountain");
  const spec = useMemo(() => animalScene(kind), [kind]);
  const clock = usePlayback(spec.durationFrames, 0, 1, true, true);
  return <div style={page}>
    <Header kicker="UKIYO1 · Animals" title="Bear, boar, deer, ox, wolf, mouse and the small creatures">
      <p style={{ margin: 0 }}>The four-legged rig gains the moon bear with its crescent, the tusked boar, the spotted sika stag with antlers,
        the horned black ox, the wolf and the mouse, all with front and back views; the bird rig gains the hawk and the mandarin ducks. New
        rigs for the crab (sideways scuttle, snapping claws), the minogame turtle (rowing flippers, seaweed tail), the snake (slither, coil),
        the frog (hop, croak), the carp (swim, leap) and the octopus (curling arms).</p>
    </Header>
    <section aria-label="Animal controls" style={{ ...panel, gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
      <Select name="Habitat" value={kind} options={UKIYOE_ANIMAL_HABITATS} onChange={setKind} labels={HABITAT_LABELS} />
    </section>
    <Fit width={1920} height={1080}><UkiyoeScene spec={spec} frame={clock.frame} style={{ width: "100%", height: "100%" }} aria-label={HABITAT_LABELS[kind]} /></Fit>
    <Transport clock={clock} total={spec.durationFrames} rate={1} setRate={() => undefined} loop setLoop={() => undefined} name="Animals frame" />
  </div>;
}

// ---- Temples, shrines, graves ------------------------------------------------------------------------------------------------------

const TEMPLE_LABELS: Readonly<Record<UkiyoeTempleScene, string>> = { bell: "The temple bell struck at dusk", graveyard: "Graveyard at night", rashomon: "Rashōmon in the rain", shrine: "Mountain shrine in snow", asakusa: "Temple gate with its great lantern" };

/** Sacred and haunted places: the belfry, the hall, the gate, the shrine, the graveyard. */
export function Temples() {
  const [kind, setKind] = useState<UkiyoeTempleScene>("bell");
  const spec = useMemo(() => templeScene(kind), [kind]);
  const clock = usePlayback(spec.durationFrames, 0, 1, true, true);
  return <div style={page}>
    <Header kicker="UKIYO1 · Temples" title="Bell, hall, gate, shrine and graveyard">
      <p style={{ margin: 0 }}>After Hiroshige's Asakusa and Gion Shrine, Yoshitoshi's Rashōmon and a bonshō's bronze. The <code>belfry</code>'s log is
        drawn back and swung into the bell on its <code>strikes</code>; the bell sways and rings. The <code>gate</code> carries its great lantern or
        falls to ruin; the <code>hokora</code> wears its sacred rope; the <code>graves</code> stand among wooden sotoba; <code>toro</code> lanterns glow.</p>
    </Header>
    <section aria-label="Temple controls" style={{ ...panel, gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
      <Select name="Place" value={kind} options={UKIYOE_TEMPLE_SCENES} onChange={setKind} labels={TEMPLE_LABELS} />
    </section>
    <Fit width={1920} height={1080}><UkiyoeScene spec={spec} frame={clock.frame} style={{ width: "100%", height: "100%" }} aria-label={TEMPLE_LABELS[kind]} /></Fit>
    <Transport clock={clock} total={spec.durationFrames} rate={1} setRate={() => undefined} loop setLoop={() => undefined} name="Temple frame" />
  </div>;
}

// ---- Animal yōkai --------------------------------------------------------------------------------------------------------------------

const AY_LABELS: Readonly<Record<UkiyoeAnimalYokaiScene, string>> = { bakeneko: "Bakeneko dance, nekomata", kamaitachi: "Kamaitachi in the whirlwind", okuriinu: "Okuri-inu following", baku: "The baku eats a nightmare", messenger: "Inari's messenger foxes", satori: "The mind-reading ape" };

/** Shape-shifting and supernatural animals. */
export function AnimalYokai() {
  const [kind, setKind] = useState<UkiyoeAnimalYokaiScene>("bakeneko");
  const spec = useMemo(() => animalYokaiScene(kind), [kind]);
  const clock = usePlayback(spec.durationFrames, 0, 1, true, true);
  return <div style={page}>
    <Header kicker="UKIYO1 · Animal yōkai" title="Cats that dance, weasels in the wind, the dream-eater">
      <p style={{ margin: 0 }}>After Sekien's kamaitachi and Hokusai's baku. Cats stand and dance with a <code>towel</code> on the head, and take
        two <code>tails</code> as nekomata; <code>glowEyes</code> light the dark; the messenger fox <code>carry</code>s a key or a jewel. New species: the
        <code>weasel</code>, the <code>baku</code> with its trunk and the great <code>ape</code>. The <code>whirlwind</code> particle is Sekien's spiral,
        with sickle-flashes.</p>
    </Header>
    <section aria-label="Animal yokai controls" style={{ ...panel, gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
      <Select name="Scene" value={kind} options={UKIYOE_ANIMAL_YOKAI_SCENES} onChange={setKind} labels={AY_LABELS} />
    </section>
    <Fit width={1920} height={1080}><UkiyoeScene spec={spec} frame={clock.frame} style={{ width: "100%", height: "100%" }} aria-label={AY_LABELS[kind]} /></Fit>
    <Transport clock={clock} total={spec.durationFrames} rate={1} setRate={() => undefined} loop setLoop={() => undefined} name="Yokai frame" />
  </div>;
}

// ---- Trees and forest spirits ------------------------------------------------------------------------------------------------------

const TREE_LABELS: Readonly<Record<UkiyoeTreeScene, string>> = { kaguya: "The shining bamboo", persimmon: "Monkey up the persimmon", kodama: "Kodama: the tree's spirits", jubokko: "Jubokko, the vampire tree", jinmenju: "Jinmenju, the laughing tree" };

/** Trees as characters: the shining bamboo, the persimmon, the sacred tree's spirits, the face trees. */
export function Trees() {
  const [kind, setKind] = useState<UkiyoeTreeScene>("kaguya");
  const spec = useMemo(() => treeScene(kind), [kind]);
  const clock = usePlayback(spec.durationFrames, 0, 1, true, true);
  return <div style={page}>
    <Header kicker="UKIYO1 · Trees" title="Bamboo, persimmon and the trees that are alive">
      <p style={{ margin: 0 }}>After Hōitsu's <em>Persimmon Tree</em>, the <em>Taketori</em> scroll and Sekien's kodama. The <code>bamboo</code> grove sways,
        one stalk lit from within; the <code>kaki</code> is gnarled and sparse with a few round fruit; the <code>shinboku</code> wears its rope and can open
        an old <code>face</code> in its bark or <code>reach</code> with its branches like arms; the <code>jinmenju</code>'s fruit are laughing heads.</p>
    </Header>
    <section aria-label="Tree controls" style={{ ...panel, gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
      <Select name="Scene" value={kind} options={UKIYOE_TREE_SCENES} onChange={setKind} labels={TREE_LABELS} />
    </section>
    <Fit width={1920} height={1080}><UkiyoeScene spec={spec} frame={clock.frame} style={{ width: "100%", height: "100%" }} aria-label={TREE_LABELS[kind]} /></Fit>
    <Transport clock={clock} total={spec.durationFrames} rate={1} setRate={() => undefined} loop setLoop={() => undefined} name="Tree frame" />
  </div>;
}

// ---- Heian court ------------------------------------------------------------------------------------------------------------------

const HEIAN_LABELS: Readonly<Record<UkiyoeHeianScene, string>> = { veranda: "Behind the blinds, by moonlight", oxcart: "The ox-cart on the road", chamber: "Court ladies by a curtain screen" };

/** The Heian court: layered robes, the court cap, blinds and screens, the palace veranda, the ox-cart. */
export function HeianCourt() {
  const [kind, setKind] = useState<UkiyoeHeianScene>("veranda");
  const spec = useMemo(() => heianScene(kind), [kind]);
  const clock = usePlayback(spec.durationFrames, 0, 1, true, true);
  return <div style={page}>
    <Header kicker="UKIYO1 · Heian court" title="Twelve layers, the court cap, blinds and the ox-cart">
      <p style={{ margin: 0 }}>After the Tosa <em>Evening Face</em>, Hokusai's <em>Court Lady</em> and the Genji scroll. Court ladies wear their
        <code>layers</code> over red hakama with <code>heian</code> hair falling to the floor and the <code>hiogi</code> fan; nobles the
        <code>kanmuri</code> and the <code>shaku</code>. The <code>shinden</code> veranda splits into back and front so a lady sits behind its
        translucent <code>sudare</code> as they roll up; the <code>gissha</code>'s wheels turn with its keyed travel.</p>
    </Header>
    <section aria-label="Heian controls" style={{ ...panel, gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
      <Select name="Scene" value={kind} options={UKIYOE_HEIAN_SCENES} onChange={setKind} labels={HEIAN_LABELS} />
    </section>
    <Fit width={1920} height={1080}><UkiyoeScene spec={spec} frame={clock.frame} style={{ width: "100%", height: "100%" }} aria-label={HEIAN_LABELS[kind]} /></Fit>
    <Transport clock={clock} total={spec.durationFrames} rate={1} setRate={() => undefined} loop setLoop={() => undefined} name="Heian frame" />
  </div>;
}

// ---- Folk yōkai --------------------------------------------------------------------------------------------------------------------

const FY_LABELS: Readonly<Record<UkiyoeFolkYokaiScene, string>> = { house: "Nurarihyon, zashiki-warashi, amanojaku", stream: "Azukiarai washing beans", bath: "Akaname in the bathhouse", road: "Sunakake-baba, konaki-jiji, Dodomeki", snow: "The snow child" };

/** The household and road yōkai. */
export function FolkYokai() {
  const [kind, setKind] = useState<UkiyoeFolkYokaiScene>("house");
  const spec = useMemo(() => folkYokaiScene(kind), [kind]);
  const clock = usePlayback(spec.durationFrames, 0, 1, true, true);
  return <div style={page}>
    <Header kicker="UKIYO1 · Folk yōkai" title="The bean-washer, the filth-licker and the master of yōkai">
      <p style={{ margin: 0 }}>After Sekien's akaname, nurarihyon and dodomeki and Shunsen's azukiarai. New for figures: the <code>gourd</code> head,
        the straw <code>mino</code>, arms covered in <code>eyes</code>, the bean basket <code>zaru</code> and the <code>throw</code> that flings sand on its
        contact frame; and the crouching <code>akaname</code> with its licking tongue.</p>
    </Header>
    <section aria-label="Folk yokai controls" style={{ ...panel, gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
      <Select name="Scene" value={kind} options={UKIYOE_FOLK_YOKAI_SCENES} onChange={setKind} labels={FY_LABELS} />
    </section>
    <Fit width={1920} height={1080}><UkiyoeScene spec={spec} frame={clock.frame} style={{ width: "100%", height: "100%" }} aria-label={FY_LABELS[kind]} /></Fit>
    <Transport clock={clock} total={spec.durationFrames} rate={1} setRate={() => undefined} loop setLoop={() => undefined} name="Yokai frame" />
  </div>;
}

// ---- Giant monsters -----------------------------------------------------------------------------------------------------------------

const GIANT_LABELS: Readonly<Record<UkiyoeGiantScene, string>> = { skeleton: "Gashadokuro, the skeleton spectre", seamonk: "Umibōzu, the sea monk", orochi: "Yamata no Orochi", centipede: "The giant centipede", namazu: "The earthquake catfish", dojoji: "Kiyohime round the bell", toad: "Jiraiya's giant toad", daidara: "Daidarabotchi" };

/** Monsters far bigger than people. */
export function Giants() {
  const [kind, setKind] = useState<UkiyoeGiantScene>("skeleton");
  const spec = useMemo(() => giantScene(kind), [kind]);
  const clock = usePlayback(spec.durationFrames, 0, 1, true, true);
  return <div style={page}>
    <Header kicker="UKIYO1 · Giants" title="The skeleton spectre, the sea monk, the eight-headed serpent">
      <p style={{ margin: 0 }}>After Kuniyoshi's <em>Takiyasha</em> skeleton and <em>Kuwana</em> sea monk, Yoshitoshi's Orochi and the Kashima namazu-e.
        New yōkai species <code>gashadokuro</code>, <code>umibozu</code>, <code>orochi</code>, <code>omukade</code>, <code>namazu</code> and <code>jasei</code>
        (the serpent round the bell), each against people or buildings for scale; the toad and the daidarabotchi are built from the frog and the figure.</p>
    </Header>
    <section aria-label="Giant controls" style={{ ...panel, gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
      <Select name="Monster" value={kind} options={UKIYOE_GIANT_SCENES} onChange={setKind} labels={GIANT_LABELS} />
    </section>
    <Fit width={1920} height={1080}><UkiyoeScene spec={spec} frame={clock.frame} style={{ width: "100%", height: "100%" }} aria-label={GIANT_LABELS[kind]} /></Fit>
    <Transport clock={clock} total={spec.durationFrames} rate={1} setRate={() => undefined} loop setLoop={() => undefined} name="Giant frame" />
  </div>;
}

// ---- Tsukumogami ------------------------------------------------------------------------------------------------------------------

const TSUKUMO_LABELS: Readonly<Record<UkiyoeTsukumoScene, string>> = { wheel: "Wanyūdō, the burning wheel", biwa: "Biwa-bokuboku", shoji: "Mokumokuren, eyes in the shoji", kosode: "Kosode-no-te, hands from the kimono", cotton: "Ittan-momen", kettle: "Bunbuku chagama", cart: "Oboro-guruma" };

/** Objects that come alive after a hundred years. */
export function Tsukumogami() {
  const [kind, setKind] = useState<UkiyoeTsukumoScene>("wheel");
  const spec = useMemo(() => tsukumoScene(kind), [kind]);
  const clock = usePlayback(spec.durationFrames, 0, 1, true, true);
  return <div style={page}>
    <Header kicker="UKIYO1 · Tsukumogami" title="The wheel, the lute, the shoji, the kimono, the kettle">
      <p style={{ margin: 0 }}>After Sekien's tsukumogami. New yōkai <code>wanyudo</code> (a head for a hub, rolling in flames with its travel),
        <code>biwabokuboku</code>, <code>ittanmomen</code> and <code>chagama</code> (Bunbuku: tanuki head and tail, back to a kettle on
        <code>transform</code>); the <code>ikou</code> rack's robe puts out <code>hands</code>; the <code>room</code>'s shoji open <code>eyes</code>;
        the <code>gissha</code> takes a <code>face</code>.</p>
    </Header>
    <section aria-label="Tsukumogami controls" style={{ ...panel, gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
      <Select name="Object" value={kind} options={UKIYOE_TSUKUMO_SCENES} onChange={setKind} labels={TSUKUMO_LABELS} />
    </section>
    <Fit width={1920} height={1080}><UkiyoeScene spec={spec} frame={clock.frame} style={{ width: "100%", height: "100%" }} aria-label={TSUKUMO_LABELS[kind]} /></Fit>
    <Transport clock={clock} total={spec.durationFrames} rate={1} setRate={() => undefined} loop setLoop={() => undefined} name="Tsukumogami frame" />
  </div>;
}

// ---- Other realms -----------------------------------------------------------------------------------------------------------------

const REALM_LABELS: Readonly<Record<UkiyoeRealmScene, string>> = { ryugu: "Down to the Dragon Palace", moon: "Kaguya returns to the moon", tanabata: "The magpie bridge", iwato: "The sun leaves the rock cave", yomi: "Flight from Yomi", onigashima: "Sailing to Onigashima" };

/** Realms beyond the everyday, each with its way in. */
export function Realms() {
  const [kind, setKind] = useState<UkiyoeRealmScene>("ryugu");
  const spec = useMemo(() => realmScene(kind), [kind]);
  const clock = usePlayback(spec.durationFrames, 0, 1, true, true);
  return <div style={page}>
    <Header kicker="UKIYO1 · Realms" title="The sea palace, the moon, the river of stars, the cave">
      <p style={{ margin: 0 }}>After Kuniyoshi's Dragon Palace, Toshimasa's rock cave, Yoshitoshi's moon and Hiroshige's Tanabata. The camera follows
        Urashima under the waves to the <code>ryugu</code> and rises with Kaguya to the <code>moonpalace</code>; the <code>magpies</code> form their
        bridge across the <code>amanogawa</code>; the <code>iwato</code> boulder rolls aside and light floods out (or closes on Yomi); the boat crosses to
        <code>onigashima</code>.</p>
    </Header>
    <section aria-label="Realm controls" style={{ ...panel, gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
      <Select name="Realm" value={kind} options={UKIYOE_REALM_SCENES} onChange={setKind} labels={REALM_LABELS} />
    </section>
    <Fit width={1920} height={1080}><UkiyoeScene spec={spec} frame={clock.frame} style={{ width: "100%", height: "100%" }} aria-label={REALM_LABELS[kind]} /></Fit>
    <Transport clock={clock} total={spec.durationFrames} rate={1} setRate={() => undefined} loop setLoop={() => undefined} name="Realm frame" />
  </div>;
}

// ---- Processions and parades ---------------------------------------------------------------------------------------------------

const PARADE_LABELS: Readonly<Record<UkiyoeParadeScene, string>> = { hyakki: "Night parade of a hundred demons", foxwedding: "The fox wedding in a sunshower", mousewedding: "The mouse wedding" };

/** Processions that walk in order across the scroll: the night parade and the animal weddings. */
export function Parades() {
  const [kind, setKind] = useState<UkiyoeParadeScene>("foxwedding");
  const spec = useMemo(() => paradeScene(kind), [kind]);
  const clock = usePlayback(spec.durationFrames, 0, 1, true, true);
  return <div style={page}>
    <Header kicker="UKIYO1 · Parades" title="The night parade, the fox wedding, the mouse wedding">
      <p style={{ margin: 0 }}>After the Shinjuan <em>Night Parade of One Hundred Demons</em>, the Met's fox-wedding inrō and Yamamoto Shōun's fox
        wedding. <code>procession()</code> lines up yōkai, object spirits and figures one after another, all travelling the same distance so
        nobody walks into anyone. Figures with <code>look.animal</code> walk as foxes or mice; two bearers carry the <code>kago</code> between them.</p>
    </Header>
    <section aria-label="Parade controls" style={{ ...panel, gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
      <Select name="Parade" value={kind} options={UKIYOE_PARADE_SCENES} onChange={setKind} labels={PARADE_LABELS} />
    </section>
    <Fit width={1920} height={1080}><UkiyoeScene spec={spec} frame={clock.frame} style={{ width: "100%", height: "100%" }} aria-label={PARADE_LABELS[kind]} /></Fit>
    <Transport clock={clock} total={spec.durationFrames} rate={1} setRate={() => undefined} loop setLoop={() => undefined} name="Parade frame" />
  </div>;
}

// ---- Oni fight ----------------------------------------------------------------------------------------------------------------------

/** A hero (samurai or Momotarō) fights an oni with an iron club on a rocky shore at dusk. */
export function OniFight() {
  const [hero, setHero] = useState<"samurai" | "momotaro">("samurai");
  const [oni, setOni] = useState<"red" | "blue">("red");
  const clock = usePlayback(640, 0, 1, true, true);
  const spec = useMemo((): UkiyoeSceneSpec => {
    const f = oniFight({ id: "fight", x: 720, y: 960, scale: 1.4, hero: hero === "momotaro" ? UKIYOE_MOMOTARO_LOOK : undefined,
      oni: oni === "blue" ? { ...CAST["oni-blue"] } : undefined });
    return {
      version: 1, id: "oni-fight", width: 1920, height: 1080, durationFrames: 640, seed: 41, wind: { base: .4, turbulence: .4 }, palette: { preset: "edo" }, camera: { shake: f.shake },
      nodes: [
        { id: "sky", kind: "motif", motif: "sky", params: { width: 1920, height: 1080, band: .5, horizon: "beni" } },
        { id: "sea", kind: "motif", motif: "sea", x: 0, y: 640, params: { width: 1920, height: 200 } },
        { id: "rock-l", kind: "motif", motif: "rock", x: 200, y: 830, scale: 1.6, params: { width: 380, height: 220 } },
        { id: "rock-r", kind: "motif", motif: "rock", x: 1720, y: 820, scale: 1.4, params: { width: 340, height: 200, variant: 2 } },
        { id: "shore", kind: "block", x: 960, y: 900, shape: { type: "rect", width: 1960, height: 360 }, fill: { type: "linear", angle: 90, stops: [[0, "kincha", .9], [1, "cha", 1]] }, line: 0, grain: 1 },
        ...f.nodes,
      ],
    };
  }, [hero, oni]);
  return <div style={page}>
    <Header kicker="UKIYO1 · Oni" title="The oni's iron club">
      <p style={{ margin: 0 }}>Built by <code>oniFight</code>. The kanabō is drawn in detail: a long iron-shod shaft swelling toward the head,
        rows of iron studs over the striking half, iron bands, a cord-wrapped grip and an iron ring at the butt. At rest it lies over the
        oni's shoulder. He smashes where the hero stood: a long wind-up overhead, the club brought down so its head stops exactly on the
        ground, dust and pebbles bursting, the ground cracking, the picture shaking. The hero springs back; cuts, and the oni blocks with
        the club; the oni swings at his chest and is parried, blade on iron, sparks at the one point both are aimed at. A second smash
        misses; the hero closes and strikes home: the club drops, and the oni topples back to lie beside it.</p>
    </Header>
    <section aria-label="Fight controls" style={{ ...panel, gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
      <Select name="Hero" value={hero} options={["samurai", "momotaro"] as const} onChange={setHero} labels={{ samurai: "Samurai", momotaro: "Momotarō" }} />
      <Select name="Oni" value={oni} options={["red", "blue"] as const} onChange={setOni} labels={{ red: "Red oni", blue: "Blue oni" }} />
    </section>
    <Fit width={1920} height={1080}><UkiyoeScene spec={spec} frame={clock.frame} style={{ width: "100%", height: "100%" }} aria-label="A hero fighting an oni with an iron club" /></Fit>
    <Transport clock={clock} total={640} rate={1} setRate={() => undefined} loop setLoop={() => undefined} name="Fight frame" />
  </div>;
}

// ---- Maiko --------------------------------------------------------------------------------------------------------------------------

/** A maiko's dance before a gold folding screen, and her walk on okobo, her kneeling bow and her back. */
export function MaikoDance() {
  const [view, setView] = useState<"profile" | "three-quarter" | "front" | "back">("three-quarter");
  const [wind, setWind] = useState(0);
  const clock = usePlayback(512, 0, 1, true, true);
  const screen = (x: number, i: number): UkiyoeNode => ({ id: "panel" + i, kind: "block", x, y: 470, shape: { type: "rect", width: 300, height: 620 }, fill: { type: "linear", angle: 90, stops: [[0, i % 2 ? "kin" : "ki", 1], [1, "kincha", 1]] }, line: 1.4, grain: .5 });
  const stage = useMemo((): UkiyoeSceneSpec => ({
    version: 1, id: "maiko-dance", width: 1920, height: 1080, durationFrames: 512, seed: 8, wind: { base: wind, turbulence: .2 }, palette: { preset: "edo" },
    nodes: [
      { id: "wall", kind: "block", x: 960, y: 540, shape: { type: "rect", width: 1960, height: 1100 }, fill: { type: "linear", angle: 90, stops: [[0, "kogecha", 1], [1, "cha", 1]] }, line: 0, grain: .6 },
      ...[210, 510, 810, 1110, 1410, 1710].map(screen),
      { id: "pine", kind: "motif", motif: "pine", x: 520, y: 760, scale: 1.25, params: { height: 520, lean: 14 } },
      { id: "pine2", kind: "motif", motif: "pine", x: 1500, y: 760, scale: .9, params: { height: 420, lean: -18, variant: 2 } },
      { id: "floor", kind: "block", x: 960, y: 930, shape: { type: "rect", width: 1960, height: 320 }, fill: { type: "linear", angle: 90, stops: [[0, "cha", 1], [1, "kogecha", 1]] }, line: 1.2, grain: 1 },
      { id: "dancer", kind: "figure", x: 1000, y: 985, scale: 2.05, look: { ...UKIYOE_MAIKO_LOOK, view }, actions: [{ type: "kyomai", start: 0, end: 512 }] },
    ],
  }), [view, wind]);
  const studies = useMemo((): UkiyoeSceneSpec => ({
    version: 1, id: "maiko-studies", width: 1920, height: 820, durationFrames: 512, seed: 3, wind: { base: wind }, palette: { preset: "edo" }, mount: { kind: "print" },
    nodes: [
      { id: "ground", kind: "block", x: 960, y: 770, shape: { type: "rect", width: 2000, height: 160 }, fill: { type: "linear", angle: 90, stops: [[0, "ki", .5], [1, "kincha", .7]] }, line: 0, grain: 1 },
      { id: "walk", kind: "figure", x: 180, y: 730, scale: 1.4, look: { ...UKIYOE_MAIKO_LOOK, prop: "none" }, actions: [{ type: "walk", start: 0, end: 512, to: 420 }] },
      { id: "bow", kind: "figure", x: 1020, y: 730, scale: 1.4, look: { ...UKIYOE_MAIKO_LOOK, prop: "none", view: "three-quarter" }, actions: [{ type: "kneel", start: 0, end: 512 }, { type: "bow", start: 60, end: 200, angle: 40 }, { type: "bow", start: 300, end: 440, angle: 40 }] },
      { id: "back", kind: "figure", x: 1600, y: 730, scale: 1.4, look: { ...UKIYOE_MAIKO_LOOK, view: "back" }, actions: [{ type: "walk", start: 0, end: 512, to: 0, toY: -24 }] },
    ],
  }), [wind]);
  return <div style={page}>
    <Header kicker="UKIYO1 · Maiko" title="A maiko's dance">
      <p style={{ margin: 0 }}>After Meiji-era and later photographs of Kyoto's apprentice dancers and Kuroda Seiki's maiko studies. She wears the
        wareshinobu (a split bun parted over red kanoko silk, the hana-kanzashi at her temple with strands of tiny flowers that swing as
        she moves, a silver pin at the back), white make-up with the bare skin showing in two points at the nape, a pale kimono with long
        sleeves and a trailing hem over red under-layers and a red collar, and the darari obi: its long ends hang from a high knot nearly
        to the hem, each with a woven crest, and swing as she moves. She walks with short steps on wooden okobo (the planted clog holds
        within a pixel). <code>kyomai</code> dances four held poses with the gold dance fan: raised high, before the face, arms opened with
        the sleeves hanging, then low; each held and flowing smoothly into the next. Turn her with View.</p>
    </Header>
    <section aria-label="Maiko controls" style={{ ...panel, gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
      <Select name="View" value={view} options={["profile", "three-quarter", "front", "back"] as const} onChange={setView} labels={{ profile: "Profile", "three-quarter": "Three-quarter", front: "Front", back: "Back" }} />
      <Slider name="Wind" value={wind} min={-1.5} max={1.5} step={.1} onChange={setWind} format={v => v.toFixed(1)} />
    </section>
    <Fit width={1920} height={1080}><UkiyoeScene spec={stage} frame={clock.frame} style={{ width: "100%", height: "100%" }} aria-label="A maiko dancing before a gold folding screen" /></Fit>
    <Transport clock={clock} total={512} rate={1} setRate={() => undefined} loop setLoop={() => undefined} name="Dance frame" />
    <h2 style={{ font: "600 18px Newsreader Variable, serif", margin: "8px 0 0" }}>Okobo steps, a kneeling bow, the darari from behind</h2>
    <Fit width={1920} height={820} maxHeight={520}><UkiyoeScene spec={studies} frame={clock.frame} style={{ width: "100%", height: "100%" }} aria-label="The maiko walking on okobo, bowing from her knees, and seen from behind" /></Fit>
  </div>;
}

// ---- Oiran procession ----------------------------------------------------------------------------------------------------------------

/**
 * A courtesan's procession (oiran dōchū) down a pleasure-quarter street at dusk, and the oiran in all four views. The
 * procession comes from `oiranProcession`; the looks from `UKIYOE_OIRAN_LOOKS`.
 */
export function OiranProcession() {
  const [view, setView] = useState<"profile" | "three-quarter">("profile");
  const [lookBack, setLookBack] = useState(true);
  const [wind, setWind] = useState(.2);
  const clock = usePlayback(720, 0, 1, true, true);
  const street = useMemo((): UkiyoeSceneSpec => ({
    version: 1, id: "oiran-procession", width: 1920, height: 1080, durationFrames: 720, seed: 21, wind: { base: wind, turbulence: .3 }, palette: { preset: "twilight" },
    nodes: [
      { id: "sky", kind: "motif", motif: "sky", params: { width: 1920, height: 1080, band: .4, horizon: "beni" } },
      { id: "street", kind: "block", x: 960, y: 880, shape: { type: "rect", width: 1960, height: 420 }, fill: { type: "linear", angle: 90, stops: [[0, "kincha", .7], [1, "cha", .8]] }, line: 0, grain: .8 },
      { id: "houses", kind: "motif", motif: "house", x: 960, y: 610, params: { width: 1900, height: 190, noren: "beni", stories: 2, doors: 8 } },
      ...[180, 760, 1380, 1860].map((x, i): UkiyoeNode => ({ id: "sakura" + i, kind: "motif", motif: "sakura", x, y: 745, scale: .75, params: { height: 360, variant: i, lean: i % 2 ? -5 : 6 } })),
      ...[120, 470, 950, 1450, 1800].map((x, i): UkiyoeNode => ({ id: "lamp" + i, kind: "motif", motif: "lantern", x, y: 560, scale: .9, params: { color: i % 2 ? "shu" : "beni" } })),
      { id: "onlookers", kind: "crowd", x: 960, y: 772, width: 1850, count: 7, rows: 1, mood: "stroll", direction: "both", scale: .5, frames: 720 },
      ...oiranProcession({ id: "dochu", x: 760, y: 1010, scale: 1.22, start: 20, end: 700, distance: 300, view, lookBackAt: lookBack ? 330 : undefined, lookFor: 100 }),
    ],
  }), [view, lookBack, wind]);
  const views = useMemo((): UkiyoeSceneSpec => ({
    version: 1, id: "oiran-views", width: 1920, height: 820, durationFrames: 720, seed: 4, wind: { base: wind }, palette: { preset: "edo" }, mount: { kind: "print" },
    nodes: [
      { id: "ground", kind: "block", x: 960, y: 770, shape: { type: "rect", width: 2000, height: 160 }, fill: { type: "linear", angle: 90, stops: [[0, "ki", .5], [1, "kincha", .7]] }, line: 0, grain: 1 },
      ...(["profile", "three-quarter", "front", "back"] as const).map((v, i): UkiyoeNode => ({
        id: "oiran-" + v, kind: "figure", x: 250 + i * 470, y: 735, scale: 1.4, look: { ...UKIYOE_OIRAN_LOOKS.oiran, view: v },
        actions: [{ type: "dochu", start: 0, end: 720, ...(v === "front" ? { to: 0, toY: 24 } : v === "back" ? { to: 0, toY: -24 } : { to: 140 }) }],
      })),
    ],
  }), [wind]);
  return <div style={page}>
    <Header kicker="UKIYO1 · Oiran" title="The courtesan's procession">
      <p style={{ margin: 0 }}>After the procession prints of Kiyonaga, Eishi and Shunchō. The oiran wears the hyōgo hairstyle (two great loops,
        translucent lantern side-wings, tortoiseshell combs, a kōgai bar and a fan of kanzashi tipped with coral and gold), an open black
        uchikake with chrysanthemum roundels and a padded hem that trails behind her, the gold obi tied in front in a great bundle, layered
        collars (kasane), and tall black koma-geta. She walks the slow figure-eight step (<code>dochu</code>): the free clog swings out
        and round and is set down only a little ahead, the planted clog never sliding. Two kamuro walk ahead, the lantern bearer leads,
        the manservant holds the long-handled parasol over her and a shinzō follows. With <em>Look back</em>, the procession halts while
        she turns her head over her shoulder (mikaeri).</p>
    </Header>
    <section aria-label="Procession controls" style={{ ...panel, gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
      <Select name="View" value={view} options={["profile", "three-quarter"] as const} onChange={setView} labels={{ profile: "Profile", "three-quarter": "Three-quarter" }} />
      <Check name="Look back (mikaeri)" value={lookBack} onChange={setLookBack} />
      <Slider name="Wind" value={wind} min={-1.5} max={1.5} step={.1} onChange={setWind} format={v => v.toFixed(1)} />
    </section>
    <Fit width={1920} height={1080}><UkiyoeScene spec={street} frame={clock.frame} style={{ width: "100%", height: "100%" }} aria-label="An oiran's procession down a pleasure-quarter street at dusk" /></Fit>
    <Transport clock={clock} total={720} rate={1} setRate={() => undefined} loop setLoop={() => undefined} name="Procession frame" />
    <h2 style={{ font: "600 18px Newsreader Variable, serif", margin: "8px 0 0" }}>The oiran in four views</h2>
    <Fit width={1920} height={820} maxHeight={520}><UkiyoeScene spec={views} frame={clock.frame} style={{ width: "100%", height: "100%" }} aria-label="The oiran in profile, three-quarter, front and back, stepping" /></Fit>
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
const travel = (type: string) => ["walk", "run", "fly", "hop", "float"].includes(type) ? { to: 0 } : {};
const SPIRITS = new Set(["yukionna", "yurei", "rokurokubi", "kasaobake", "chochinobake", "hitodama", "nue", "nurikabe", "tsuchigumo"]);
const beast = (id: string, species: string, label: string, actions: string[], look: Record<string, unknown> = {}, scale = 1.25, y = 330): Specimen => ({
  id, label, actions, ...(SPIRITS.has(species) ? { sky: "night" as const } : {}),
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
  beast("monkey", "monkey", "Japanese macaque (saru)", ["walk", "sit", "run", "leap", "look", "sleep"], {}, 1.35),
  beast("horse", "horse", "Packhorse with tack", ["walk", "run", "look", "stand"], { tack: true }, .95, 345),
  beast("kappa", "kappa", "Kappa, bowing and spilling its dish", ["bow", "stand", "walk", "dance"], {}, 1.5, 345),
  beast("tengu", "tengu", "Tengu with feather fan", ["fan", "stand", "fly", "walk"], {}, 1.05, 350),
  beast("karasutengu", "karasutengu", "Karasu-tengu", ["fly", "stand", "fan", "walk"], {}, 1.05, 350),
  beast("rokurokubi", "rokurokubi", "Rokurokubi, the long-necked woman", ["stretch", "stand", "appear", "vanish"], {}, .75, 365),
  beast("nue", "nue", "Nue: monkey face, tiger body, snake tail", ["walk", "run", "sit", "roar", "look"], {}, 1.15),
  beast("nurikabe", "nurikabe", "Nurikabe, the wall on the night road", ["stand", "walk", "roar"], {}, 1.2, 350),
  beast("tsuchigumo", "tsuchigumo", "Tsuchigumo, the earth spider", ["walk", "stand", "roar"], {}, 1.1, 350),
  beast("yukionna", "yukionna", "Yuki-onna, the snow woman", ["stand", "blow", "beckon", "appear", "vanish"], {}, 1.3, 360),
  beast("yurei", "yurei", "Yūrei, a ghost", ["stand", "appear", "vanish"], {}, 1.3, 360),
  beast("kasaobake", "kasaobake", "Kasa-obake, the umbrella spirit", ["hop", "stand", "look"], {}, 1.3, 350),
  beast("chochinobake", "chochinobake", "Chōchin-obake, the lantern spirit", ["stand", "look"], {}, 1.2, 360),
  beast("hitodama", "hitodama", "Hitodama, soul-flames", ["stand"], {}, 1.6, 330),
  beast("bear", "bear", "Moon bear (tsukinowaguma)", ["walk", "run", "sit", "stand", "look"], {}, 1.2),
  beast("boar", "boar", "Wild boar (inoshishi)", ["run", "walk", "look"], {}, 1.25),
  beast("deer", "deer", "Sika stag (shika)", ["walk", "run", "look", "leap"], {}, 1.2, 345),
  beast("ox", "ox", "Black ox (ushi)", ["walk", "look", "sit"], {}, .95, 345),
  beast("wolf", "wolf", "Wolf (ōkami)", ["walk", "run", "sit", "howl"], {}, 1.2),
  beast("mouse", "mouse", "Mouse (nezumi)", ["run", "walk", "sit", "look"], {}, 2.2),
  beast("hawk", "hawk", "Hawk (taka)", ["stand", "fly", "look"], {}, 2, 340),
  beast("oshidori", "oshidori", "Mandarin ducks (oshidori)", ["float", "stand", "fly"], {}, 2.2, 340),
  beast("crab", "crab", "Crab (kani), claws snapping", ["walk", "dance"], {}, 2.6, 340),
  beast("turtle", "turtle", "Minogame turtle", ["walk", "float"], {}, 1.8, 340),
  beast("snake", "snake", "Snake (hebi)", ["walk", "coil"], {}, 1.4, 340),
  beast("frog", "frog", "Frog (kaeru), croaking", ["hop", "howl", "sit"], {}, 2.6, 340),
  beast("carp", "carp", "Carp (koi), leaping", ["float", "leap"], {}, 1.8, 330),
  beast("octopus", "octopus", "Octopus (tako)", ["dance", "walk"], {}, 1.8, 345),
  { id: "peach", label: "Peach (momo) splitting open", actions: ["open", "float"], sky: "day",
    node: action => ({ id: "c", kind: "motif", motif: "peach", x: 300, y: 250, params: { size: 90, ...(action === "open" ? { openAt: 60, openDuration: 34 } : {}) }, loops: [{ kind: "rock", amplitude: 1.2, period: 60 }] } as UkiyoeNode) },
];

export function Bestiary() {
  const [wind, setWind] = useState(.3);
  const [cadence, setCadence] = useState<1 | 2 | 3 | 4>(2);
  const [chosen, setChosen] = useState<Record<string, string>>(() => Object.fromEntries(BESTIARY.map(b => [b.id, b.actions[0]])));
  const [view, setView] = useState<"profile" | "three-quarter" | "front" | "back">("profile");
  const clock = usePlayback(240, 30, 1, true, true);
  // The View switch turns every animal and figure three-quarters toward the viewer (creatures: body, far legs, head;
  // figures: face, torso and limbs), or square on from the front or from behind (figures and four-legged animals; birds,
  // the dragon and the yōkai stay in profile).
  const square = view === "front" || view === "back";
  const turn = (n: UkiyoeNode): UkiyoeNode => view === "profile" || (n.kind !== "creature" && n.kind !== "figure")
    || (square && n.kind === "creature" && !UKIYOE_SQUARE_VIEW_SPECIES.includes(n.species)) ? n
    : ({ ...n, look: { ...(n.look ?? {}), view } } as UkiyoeNode);
  const specs = useMemo(() => BESTIARY.map((b): UkiyoeSceneSpec => ({
    version: 1, id: "best-" + b.id, width: 600, height: 400, durationFrames: 240, seed: 70 + b.id.length, cadence, wind: { base: wind, turbulence: .4 },
    palette: { preset: b.sky === "storm" ? "edo" : "spring" },
    nodes: [
      b.sky === "storm"
        ? { id: "sky", kind: "motif", motif: "sky", params: { width: 600, height: 400, style: "horizon", horizonAt: .9 } }
        : b.sky === "night" ? { id: "sky", kind: "motif", motif: "sky", params: { width: 600, height: 400, top: "yoru", mid: "ai", band: .7, horizon: "murasaki" } }
        : { id: "sky", kind: "motif", motif: "sky", params: { width: 600, height: 400, band: .35, horizon: "beni" } },
      ...(b.sky === "storm" ? [] : [{ id: "ground", kind: "block", x: 300, y: 365, shape: { type: "rect", width: 620, height: 90 }, fill: b.sky === "night" ? { type: "linear", angle: 90, stops: [[0, "ai", 1], [1, "yoru", 1]] } : { type: "linear", angle: 90, stops: [[0, "kusa", .8], [1, "matsu", .9]] }, grain: .8, line: 1 } as UkiyoeNode]),
      turn(b.node(chosen[b.id])),
      { id: "t", kind: "text", style: "caption", depth: 0, x: 300, y: 394, text: b.label, size: 20 },
    ],
  // eslint-disable-next-line react-hooks/exhaustive-deps
  })), [wind, cadence, chosen, view]);
  return <div style={page}>
    <Header kicker="UKIYO1 · Folktale bestiary" title="Animals, spirits and the things of old stories">
      <p style={{ margin: 0 }}>Creature rigs drawn as the animal prints of Koson and Kuniyoshi draw them: one coat silhouette whose
        long-haired edges break into locks, carved hairlines following the body, jointed legs with hocks, wrists and toes, and faces
        with a muzzle, lips, nose leather and a rimmed eye. The four-legged rig covers fox, nine-tailed kitsune with foxfire, tanuki
        (including the upright, belly-drumming folk tanuki with hat and sake bottle), dog, cat and rabbit. Birds have real wings:
        primaries, secondaries and scalloped coverts that fold along the body and spread in flight, scaled legs and toes. The bird rig
        covers crane, heron (which flies with its neck drawn in), crow, pheasant and sparrow. Yōkai after Sekien, Ōkyo and Hokusai:
        the snow woman (her robe trails into snow, she breathes out the cold), a yūrei ghost, the umbrella and lantern spirits, and
        soul-flames, the rokurokubi whose neck stretches, the bowing kappa that spills the water from its dish, and the tengu (red and
        long-nosed, or crow-headed) with wings and a gale-raising fan; <code>appear</code> and <code>vanish</code> fade spirits in and out.
        Momotarō's monkey and the Tōkaidō packhorse join the four-legged rig, with the nue (monkey face, tiger body, snake tail); the
        nurikabe blocks the night road and the tsuchigumo creeps on eight banded legs. The dragon swims through
        the air with whiskers, mane, belly plates and its flaming pearl. Oni are full figures with horns, fangs, a tiger-skin loincloth
        and a kanabō, so they can do every figure action. <code>transform</code> vanishes a creature in a puff of smoke (henge) so a
        new node can appear in its place. Pick an action on any card.</p>
    </Header>
    <section aria-label="Bestiary controls" style={{ ...panel, gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
      <Slider name="Wind" value={wind} min={-2} max={2} step={.1} onChange={setWind} format={v => v.toFixed(1)} />
      <Select name="Cadence" value={cadence} options={[1, 2, 3, 4] as const} onChange={setCadence} labels={{ 1: "On ones", 2: "On twos", 3: "On threes", 4: "On fours" }} />
      <Select name="View" value={view} options={["profile", "three-quarter", "front", "back"] as const} onChange={setView} labels={{ profile: "Profile", "three-quarter": "Three-quarter", front: "Front", back: "Back" }} />
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
