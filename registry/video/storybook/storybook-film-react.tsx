import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { Furigana, StorySubtitle } from "./furigana";
import { parseRuby } from "./japanese-text";
import { PaintStage } from "./paint-stage";
import { storySoundUrl } from "./story-sound";
import { inspectStorybook, planStorybook, storybookFrame, storyImages, storyShotAt } from "./storybook-film";
import type { StoryFrame, StoryPlan, StorybookFilm } from "./storybook-film";

/** Paintings that were loaded stay loaded: an address is decoded once for the page. */
const loaded = new Map<string, Promise<HTMLImageElement>>();
function load(src: string): Promise<HTMLImageElement> {
  let p = loaded.get(src);
  if (!p) { p = (async () => { const i = new Image(); i.decoding = "async"; i.src = src; try { await i.decode(); } catch { throw new Error(`The painting ${src.slice(0, 120)} did not load.`); } return i; })(); p.catch(() => loaded.delete(src)); loaded.set(src, p); }
  return p;
}
export interface PaintingSet { images: Map<string, HTMLImageElement>; done: number; total: number; ready: boolean; error: string | null }
/**
 * Loads the paintings of `now`, and then those of `soon`, four at a time. A long film is ready when the paintings of the place where
 * it stands are there, and it goes on with those that come next. The map is shared while it fills.
 */
export function usePaintings(now: ReadonlySet<string>, soon?: ReadonlySet<string>): PaintingSet {
  const [images] = useState(() => new Map<string, HTMLImageElement>()), [, tell] = useState(0), [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true; setError(null);
    for (const src of now) if (!images.has(src)) load(src).then(i => { images.set(src, i); if (live) tell(n => n + 1); }, e => { if (live) setError((e as Error).message); });
    return () => { live = false; };
  }, [now, images]);
  useEffect(() => {
    let live = true; const wait = [...(soon ?? [])].filter(src => !images.has(src));
    const next = async () => { for (let src = wait.shift(); src && live; src = wait.shift()) { try { images.set(src, await load(src)); } catch { /* it is named when its own shot is on */ } } };
    for (let i = 0; i < 4; i++) void next();
    return () => { live = false; };
  }, [soon, images]);
  let done = 0; for (const src of now) if (images.has(src)) done++;
  return { images, done, total: now.size, ready: done === now.size, error };
}

export interface StorybookFilmStageProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "onPlay"> {
  film: StorybookFilm;
  /** Frame of the film. */ frame: number;
  /** Output pixels across (default: the film's own width). The picture scales to its box. */ pixels?: number;
  /** No idle moves, no moving camera, no boiling line. */ still?: boolean;
  /** The words over the picture. Default true. */ words?: boolean;
  /** Furigana over kanji. Default true. */ readings?: boolean;
  /** Translations: under a spoken line, a title and a note. Default false: only Japanese is shown, and the meanings of words that a page teaches. */ glosses?: boolean;
  /** Called when every painting is there and the first frame is up. */ onReady?: () => void;
  /** Called with each frame that was drawn, for tools. */ onFrame?: (f: StoryFrame) => void;
  /** Over the picture; a function is given the frame and the film's size. */ children?: ReactNode | ((f: StoryFrame) => ReactNode);
}
/** A frame of a painted storybook film. Words take `--storybook-ja` and `--storybook-en` as their font families. */
export const StorybookFilmStage = forwardRef<HTMLDivElement, StorybookFilmStageProps>(function StorybookFilmStage({ film, frame, pixels, still = false, words = true, readings = true, glosses = false, onReady, onFrame, children, style, ...props }, ref) {
  const root = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null), stage = useRef<PaintStage | null>(null), told = useRef(false);
  useImperativeHandle(ref, () => root.current as HTMLDivElement, []);
  const { size, paper = "#fbf3e1", boil } = film, outW = Math.max(2, Math.round(pixels ?? size.width)), outH = Math.round((outW * size.height) / size.width);
  const plan = useMemo(() => planStorybook(film), [film]), wrong = useMemo(() => inspectStorybook(film), [film]), time = Math.min(Math.max(0, frame), plan.frames - 1) / film.fps, at = storyShotAt(plan, time);
  const near = useMemo(() => (wrong.length ? new Set<string>() : storyImages(plan, at.start)), [plan, at, wrong]), soon = useMemo(() => (wrong.length ? near : storyImages(plan, at.start, 6)), [plan, at, near, wrong]);
  const art = usePaintings(near, soon), [gl, setGl] = useState<string | null>(null), [lost, setLost] = useState(0), [fonts, setFonts] = useState(false);
  useEffect(() => { let live = true; if (typeof document === "undefined" || !document.fonts) { setFonts(true); return; } document.fonts.ready.then(() => { if (live) setFonts(true); }); return () => { live = false; }; }, [film]);
  useEffect(() => {
    const c = canvas.current; if (!c) return;
    try { stage.current = new PaintStage(c, { width: size.width, height: size.height, paper, boil: boil === 0 ? 0 : 0.55 }); setGl(null); } catch (e) { setGl(e instanceof Error ? e.message : String(e)); }
    const onLost = (ev: Event) => ev.preventDefault(), onBack = () => setLost(n => n + 1);
    c.addEventListener("webglcontextlost", onLost); c.addEventListener("webglcontextrestored", onBack);
    return () => { c.removeEventListener("webglcontextlost", onLost); c.removeEventListener("webglcontextrestored", onBack); stage.current?.dispose(); stage.current = null; };
  }, [size.width, size.height, outW, outH, paper, boil, lost]);
  const now = useMemo(() => (wrong.length ? null : storybookFrame(plan, time, { still })), [plan, time, still, wrong]), ready = art.ready && fonts;
  useEffect(() => {
    const s = stage.current; if (!s || !now) return;
    s.draw(now.paint, art.images);
    s.keep(near);
    onFrame?.(now);
    if (!ready) return;
    if (root.current) root.current.dataset.kmPaintFilmDrawn = String(frame);
    if (!told.current) { told.current = true; onReady?.(); }
  }, [now, near, frame, art.images, art.done, ready, onReady, onFrame, lost, outW]);
  const error = wrong.length ? wrong.join(" ") : (art.error ?? (gl ? `This browser cannot show the picture: ${gl}` : null)), unit = `${100 / size.width}cqw`, pct = (v: number, of: number) => `${(v / of) * 100}%`, px = (n: number) => `calc(${n} * ${unit})`;
  const cap = words ? now?.caption : null, who = cap ? film.cast[cap.line.speaker] : undefined;
  return <div {...props} ref={root} data-storybook-film={film.id} data-km-paint-film-frame={frame} data-km-paint-film-done={art.done} data-km-paint-film-status={error ? "error" : ready ? "ready" : "loading"} style={{ position: "relative", width: "100%", aspectRatio: `${size.width} / ${size.height}`, background: paper, overflow: "hidden", containerType: "size", ...style }}>
    <canvas ref={canvas} key={`${outW}x${outH}`} width={outW} height={outH} role="img" aria-label={now?.shot.shot.label ?? film.title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
    {words && now?.words.map(({ words: w, tokens, opacity, key }) => <div key={key} data-story-words={w.tone ?? "note"} style={{ position: "absolute", left: pct(w.place[0], size.width), top: pct(w.place[1] + w.size * 0.625, size.height), width: "max-content", maxWidth: pct(size.width * 0.9, size.width), transform: `translate(${w.align === "left" ? "0" : w.align === "right" ? "-100%" : "-50%"}, -100%)`, textAlign: w.align ?? "center", opacity, color: "#3A2A20", fontFamily: "var(--storybook-ja,'Klee One','Klee','YuKyokasho','Hiragino Maru Gothic ProN','Hiragino Sans','Noto Sans JP',sans-serif)" }}>
      <p style={{ margin: 0, fontSize: px(w.size), lineHeight: 1.25, fontWeight: 600, letterSpacing: w.tone === "title" ? "0.06em" : "0.02em" }}><Furigana tokens={tokens} readings={readings} readingSize={w.tone === "title" ? 0.36 : 0.48} /></p>
      {w.gloss && (glosses || w.means) && <p lang="en" style={{ position: "absolute", top: "100%", width: "max-content", ...(w.align === "left" ? { left: 0 } : w.align === "right" ? { right: 0 } : { left: "50%", transform: "translateX(-50%)" }), margin: 0, marginTop: px(w.size * 0.14), fontFamily: "var(--storybook-en,'Newsreader Variable','Palatino Linotype',Palatino,Georgia,serif)", ...(w.means ? { fontSize: px(Math.min(54, Math.max(44, w.size * 0.66))), fontWeight: 500, color: "#4E3A2C" } : { fontStyle: "italic", fontSize: px(Math.max(26, w.size * 0.5)), color: "#6A5343" }), lineHeight: 1.2 }}>{w.gloss}</p>}
    </div>)}
    {cap && <div key={cap.key} style={{ position: "absolute", left: 0, right: 0, top: pct(film.frame.y + film.frame.height + 20, size.height), bottom: pct(16, size.height), display: "flex", alignItems: "center", justifyContent: "center", opacity: cap.opacity }}>
      <StorySubtitle speaker={who ? parseRuby(who.label ?? who.name) : undefined} color={who?.color} tokens={cap.tokens} token={cap.token} gloss={glosses ? cap.line.en : undefined} readings={readings} unit={unit} room={size.width * 0.8} />
    </div>}
    {typeof children === "function" ? now && children(now) : children}
    {!ready && !error && <div role="status" style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "0 4% 3.2%", color: "#5A4636", font: "500 clamp(13px,2.2cqw,18px)/1.4 system-ui, sans-serif" } as CSSProperties}>
      <div style={{ height: 2, background: "rgb(90 70 54 / .18)", marginBottom: 8 }}><div style={{ height: 2, width: `${(art.done / Math.max(1, art.total)) * 100}%`, background: "#8A4B2A" }} /></div>Loading {art.done} of {art.total} paintings
    </div>}
    {error && <p role="alert" style={{ position: "absolute", inset: "auto 5% 5%", margin: 0, color: "#8C1F14", font: "500 16px/1.45 system-ui, sans-serif" }}>{error}</p>}
  </div>;
});

export interface StorybookFilmPlayerProps extends Omit<StorybookFilmStageProps, "frame"> { autoPlay?: boolean; loop?: boolean; /** First frame. */ start?: number; /** Show the switches for furigana and translation. Default true. A film without translations has no switch for them. `readings` and `glosses` say how the switches stand at the start. */ options?: boolean; /** Speeds offered. */ speeds?: readonly number[]; /** Called when the frame changes. */ onSeek?: (frame: number) => void }
const STEP = { padding: 0, minWidth: 40, minHeight: 40, borderRadius: 4, border: "1px solid #8C7766", background: "transparent", color: "inherit", font: "inherit", cursor: "pointer" } as const;
/** The film with its sound, a play button, a scrubber, a step of one frame, and switches for learners. It never plays by itself with sound: without a press it waits, or plays silent when `autoPlay` is set and the viewer has not asked for less motion. */
export function StorybookFilmPlayer({ film, autoPlay = false, loop = false, start = 0, options = true, speeds = [1, 0.75, 0.5], still, readings = true, glosses = false, onReady, onSeek, style, ...props }: StorybookFilmPlayerProps) {
  const plan: StoryPlan = useMemo(() => planStorybook(film), [film]), [frame, setFrame] = useState(start), [playing, setPlaying] = useState(false), [ready, setReady] = useState(false), [asked, setAsked] = useState(false), [speed, setSpeed] = useState(speeds[0] ?? 1), [furigana, setFurigana] = useState(readings), [english, setEnglish] = useState(glosses);
  const [calm] = useState(() => typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)), audio = useRef<HTMLAudioElement>(null), [mixed, setMixed] = useState<string>(), sound = film.audio ?? mixed;
  // a film without a finished track is mixed here, from its own cues
  useEffect(() => {
    if (film.audio) return;
    let url: string | undefined, live = true;
    storySoundUrl(plan).then(u => { url = u; if (live) setMixed(u); else if (u) URL.revokeObjectURL(u); }, () => undefined);
    return () => { live = false; setMixed(undefined); if (url) URL.revokeObjectURL(url); };
  }, [plan, film.audio]);
  const told = useMemo(() => () => { setReady(true); if (autoPlay && !calm) setPlaying(true); onReady?.(); }, [autoPlay, calm, onReady]);
  useEffect(() => { onSeek?.(frame); }, [frame, onSeek]);
  useEffect(() => {
    if (!playing) return;
    const a = audio.current, first = frame >= plan.frames - 1 ? 0 : frame; let id = 0, live = true, from = performance.now(), base = first, sounding = false;
    if (a) { a.currentTime = first / film.fps; a.playbackRate = speed; a.preservesPitch = true; a.muted = !asked; a.play().then(() => { sounding = live; }, () => { sounding = false; }); }
    const tick = (now: number) => {
      // the sound is the clock when there is sound
      let f = a && sounding && !a.paused ? a.currentTime * film.fps : base + ((now - from) / 1000) * film.fps * speed;
      if (f >= plan.frames || (a && a.ended)) { if (!loop) { setFrame(plan.frames - 1); setPlaying(false); return; } from = now; base = 0; f = 0; if (a) { a.currentTime = 0; void a.play().catch(() => undefined); } }
      setFrame(Math.max(0, Math.floor(f + 1e-4))); id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => { live = false; cancelAnimationFrame(id); a?.pause(); };
    // the frame it starts from is read once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, film, plan.frames, loop, speed, asked]);
  const translated = useMemo(() => plan.shots.some(({ shot }) => shot.words?.some(w => w.gloss) || shot.says?.some(q => film.lines[q.line]?.en)), [plan, film]);
  const clock = (f: number) => { const s = Math.floor(f / film.fps); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }, seek = (f: number) => { setPlaying(false); setFrame(Math.min(plan.frames - 1, Math.max(0, f))); };
  return <div style={style}>
    <StorybookFilmStage {...props} film={film} frame={frame} readings={furigana} glosses={english} still={still ?? (calm && !asked)} onReady={told} />
    {sound && <audio ref={audio} src={sound} preload="auto" />}
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, padding: "10px 2px", color: "#3A2A20", font: "500 15px/1 system-ui, sans-serif" }}>
      <button type="button" disabled={!ready} onClick={() => { setAsked(true); setPlaying(p => !p); }} aria-label={playing ? "Pause" : "Play"} style={{ ...STEP, minWidth: 84, cursor: ready ? "pointer" : "default", opacity: ready ? 1 : 0.5 }}>{playing ? "Pause" : "Play"}</button>
      <button type="button" disabled={!ready} onClick={() => seek(frame - 1)} aria-label="One frame back" style={STEP}>‹</button>
      <button type="button" disabled={!ready} onClick={() => seek(frame + 1)} aria-label="One frame on" style={STEP}>›</button>
      <input type="range" min={0} max={plan.frames - 1} value={frame} disabled={!ready} aria-label="Film position" aria-valuetext={`${clock(frame)} of ${clock(plan.frames)}`} onChange={e => seek(Number(e.target.value))} style={{ flex: "1 1 180px", minWidth: 120, accentColor: "#8A4B2A", height: 28 }} />
      <span style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{clock(frame)} / {clock(plan.frames)}</span>
      {options && <>
        <label style={{ display: "inline-flex", gap: 6, alignItems: "center", minHeight: 40 }}><input type="checkbox" checked={furigana} onChange={e => setFurigana(e.target.checked)} />ふりがな</label>
        {translated && <label style={{ display: "inline-flex", gap: 6, alignItems: "center", minHeight: 40 }}><input type="checkbox" checked={english} onChange={e => setEnglish(e.target.checked)} />English</label>}
        {speeds.length > 1 && <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>Speed<select value={speed} onChange={e => setSpeed(Number(e.target.value))} style={{ minHeight: 36, font: "inherit" }}>{speeds.map(s => <option key={s} value={s}>{s}×</option>)}</select></label>}
      </>}
    </div>
  </div>;
}
