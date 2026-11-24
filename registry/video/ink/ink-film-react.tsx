import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { paintInkCel } from "./ink-cel";
import type { InkCel, InkSubject } from "./ink-cel";
import { inkFilmOrders, inkFrameAt, inkShotAt, inkTextAt, inspectInkFilm, planInkFilm } from "./ink-film";
import type { InkBook, InkCelOrder, InkFilm, InkFilmPlan } from "./ink-film";
import type { InkCelPainter } from "./ink-paint";
import { InkStage } from "./ink-stage";

export interface InkCelSet { cels: Map<string, InkCel | null>; done: number; total: number; /** Letters can be measured: nothing is laid out before. */ open: boolean; ready: boolean; error: string | null }

/** What has been painted, kept as long as the subject is. */
const store = new WeakMap<InkSubject, Map<string, InkCel | null>>();
const kept = (q: InkCelOrder) => { let m = store.get(q.subject); if (!m) store.set(q.subject, (m = new Map())); return m; };
/** Lettering is measured and painted from the page's fonts, so they come first. */
async function lettersOf(film: InkFilm): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  await Promise.all(film.shots.flatMap(s => s.layers).map(async l => { const { text, font } = (l.props ?? {}) as { text?: unknown; font?: unknown }; if (typeof text !== "string" || typeof font !== "string") return; try { await document.fonts.load(font.includes("{px}") ? font.replace("{px}", "100px") : `100px ${font}`, text); } catch { /* a font that cannot load leaves its fallback */ } }));
}
const rest = () => new Promise<void>(r => setTimeout(r, 0));
/** The cels of a film, shot by shot: painted between frames, or by a `painter` that has workers. A cel painted once is kept as long as its subject. */
export function useInkCels(film: InkFilm, book: InkBook, unit: number, o: { upright?: boolean; painter?: InkCelPainter } = {}): InkCelSet & { plan: InkFilmPlan } {
  const { upright = false, painter } = o, plan = useMemo(() => planInkFilm(film, { upright }), [film, upright]);
  const [state, set] = useState<InkCelSet>({ cels: new Map(), done: 0, total: 1, open: false, ready: false, error: null });
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const wrong = inspectInkFilm(film, book); if (wrong.length) throw new Error(wrong.join(" "));
        await lettersOf(film); if (!live) return;
        const orders = inkFilmOrders(plan, book, unit), cels = new Map<string, InkCel | null>(), key = (q: InkCelOrder) => `${q.part.id}|${q.pose}|${q.scale.toFixed(3)}`;
        set({ cels, done: 0, total: orders.length, open: true, ready: false, error: null });
        let next = 0, done = 0, last = performance.now();
        const hands = painter ? Math.min(6, Math.max(1, (navigator.hardwareConcurrency || 4) - 2)) : 1;
        await Promise.all(Array.from({ length: hands }, async () => {
          while (live && next < orders.length) {
            const q = orders[next++], k = key(q), m = kept(q);
            let cel = m.get(k);
            if (cel === undefined) { cel = painter ? await painter(q) : paintInkCel(q.subject, q.part, q.scale, q.pose); m.set(k, cel); if (!painter) await rest(); }
            if (!live) return;
            cels.set(q.id, cel); done++;
            if (performance.now() - last > 120 || done === orders.length) { last = performance.now(); set({ cels, done, total: orders.length, open: true, ready: done === orders.length, error: null }); }
          }
        }));
      } catch (e) { if (live) set({ cels: new Map(), done: 0, total: 1, open: false, ready: false, error: e instanceof Error ? e.message : String(e) }); }
    })();
    return () => { live = false; };
  }, [film, book, plan, unit, upright, painter]);
  return { ...state, plan };
}

export interface InkFilmStageProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  film: InkFilm; book: InkBook;
  /** Frame of the film. */
  frame: number;
  upright?: boolean;
  /** Output pixels across (default: the film's own width). The picture scales to its box. */
  pixels?: number;
  /** Hold everything still and shown in full. */
  still?: boolean;
  painter?: InkCelPainter;
  /** The words over the picture (default: the film's own text). */
  words?: boolean;
  /** Called when every cel is painted and the first frame is up. */
  onReady?: () => void;
  /** Over the picture, for an app's own marks. */
  children?: ReactNode;
}
/** A frame of an ink film. It shows how far the painting has come until every cel is ready. Words take `--ink-film-latin`, `--ink-film-zh` and `--ink-film-ja` as their font families. */
export const InkFilmStage = forwardRef<HTMLDivElement, InkFilmStageProps>(function InkFilmStage({ film, book, frame, upright = false, pixels, still = false, painter, words = true, onReady, children, style, ...props }, ref) {
  const root = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null), stage = useRef<InkStage | null>(null), told = useRef(false);
  useImperativeHandle(ref, () => root.current as HTMLDivElement, []);
  const size = upright && film.tall ? film.tall : film.size, full = Math.round(pixels ?? size.width), unit = full / size.width, [half, setHalf] = useState(1);
  // a small box gets a smaller picture, by halves: a browser shrinks a canvas badly past that
  const outW = Math.max(2, Math.round(full / half)), outH = Math.round((outW * size.height) / size.width);
  useEffect(() => {
    const el = root.current; if (!el || typeof ResizeObserver === "undefined") return;
    const seen = new ResizeObserver(() => { const shown = el.clientWidth * (window.devicePixelRatio || 1); if (shown > 0) setHalf(Math.max(1, 2 ** Math.floor(Math.log2(full / shown) + 1e-6))); });
    seen.observe(el); return () => seen.disconnect();
  }, [full]);
  const { cels, open, ready, done, total, error, plan } = useInkCels(film, book, unit, { upright, painter }), [gl, setGl] = useState<string | null>(null), [lost, setLost] = useState(0);
  useEffect(() => {
    const c = canvas.current; if (!c) return;
    try { stage.current = new InkStage(c, { width: size.width, height: size.height, paper: film.paper }); setGl(null); } catch (e) { setGl(e instanceof Error ? e.message : String(e)); }
    const onLost = (ev: Event) => ev.preventDefault(), onBack = () => setLost(n => n + 1);
    c.addEventListener("webglcontextlost", onLost); c.addEventListener("webglcontextrestored", onBack);
    return () => { c.removeEventListener("webglcontextlost", onLost); c.removeEventListener("webglcontextrestored", onBack); stage.current?.dispose(); stage.current = null; };
  }, [size.width, size.height, outW, outH, film.paper, lost]);
  const time = Math.min(frame, plan.frames - 1) / film.fps;
  useEffect(() => {
    const s = stage.current; if (!s || !open) return;
    const here = inkShotAt(plan, time).index;
    s.draw(inkFrameAt(plan, time, book, cels, still ? 0 : 1));
    // cels of shots that are far away give their memory back
    const near = new Set<InkCel>(); for (const [id, c] of cels) { if (!c) continue; const shot = plan.shots.findIndex(q => id.startsWith(`${q.shot.id}/`)); if (Math.abs(shot - here) <= 1) near.add(c); }
    s.keep(near);
    if (!ready) return;
    if (root.current) root.current.dataset.kmInkFilmDrawn = String(frame);
    if (!told.current) { told.current = true; onReady?.(); }
  }, [plan, time, frame, book, cels, open, ready, done, still, onReady, lost, outW]);
  const shot = inkShotAt(plan, time).shot, up = words ? inkTextAt(plan, time) : [], pct = (v: number, of: number) => `${(v / of) * 100}%`;
  return <div {...props} ref={root} data-ink-film={film.id} data-ink-ready={ready && !gl ? "" : undefined} data-km-ink-film-frame={frame} data-km-ink-film-done={done} data-km-ink-film-status={error || gl ? "error" : ready ? "ready" : "painting"} style={{ position: "relative", width: "100%", aspectRatio: `${size.width} / ${size.height}`, background: film.paper, overflow: "hidden", containerType: "size", ...style }}>
    <canvas ref={canvas} key={`${outW}x${outH}`} width={outW} height={outH} role="img" aria-label={shot.label ?? film.title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
    {up.map(({ text: t, opacity, key }) => <p key={key} data-ink-text lang={t.lang} style={{ position: "absolute", margin: 0, left: pct(t.at[0] - (t.align === "left" ? 0 : t.align === "right" ? (t.width ?? size.width * 0.8) : (t.width ?? size.width * 0.8) / 2), size.width), top: pct(t.at[1], size.height), width: pct(t.width ?? size.width * 0.8, size.width), transform: "translateY(-50%)", textAlign: t.align ?? "center", opacity,
      color: "#211F20", fontFamily: t.lang?.startsWith("zh") ? "var(--ink-film-zh,'Songti SC','Noto Serif CJK SC','Noto Serif SC','SimSun',serif)" : t.lang?.startsWith("ja") ? "var(--ink-film-ja,'Hiragino Mincho ProN','Noto Serif CJK JP','Yu Mincho',serif)" : "var(--ink-film-latin,'Cormorant Garamond','Palatino Linotype',Palatino,'Book Antiqua',Georgia,serif)", fontSize: `${((t.size ?? 40) / size.width) * 100}cqw`, lineHeight: 1.36, letterSpacing: t.lang && /^(zh|ja)/.test(t.lang) ? "0.08em" : "0.005em", textWrap: "balance" } as CSSProperties}>{t.text}</p>)}
    {children}
    {!ready && !error && !gl && <div role="status" style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "0 4% 3.2%", color: "#3A3533", font: "500 clamp(13px,2.2cqw,18px)/1.4 system-ui, sans-serif" }}>
      <div style={{ height: 2, background: "rgb(40 34 30 / .16)", marginBottom: 8 }}><div style={{ height: 2, width: `${(done / Math.max(1, total)) * 100}%`, background: "#2A2624" }} /></div>Painting {done} of {total} layers
    </div>}
    {(error || gl) && <p role="alert" style={{ position: "absolute", inset: "auto 5% 5%", margin: 0, color: "#8C1F14", font: "500 16px/1.45 system-ui, sans-serif" }}>{error ?? `This browser cannot show the picture: ${gl}`}</p>}
  </div>;
});

export interface InkFilmPlayerProps extends Omit<InkFilmStageProps, "frame"> { autoPlay?: boolean; loop?: boolean; /** First frame, for a page that opens on a moment. */ start?: number }
/** The film with a play button and a scrubber. It starts when every layer is painted. For a viewer who asks for less motion it waits, showing each frame whole and still, until they press Play. */
export function InkFilmPlayer({ film, upright = false, autoPlay = true, loop = true, start = 0, still, onReady, style, ...props }: InkFilmPlayerProps) {
  const plan = useMemo(() => planInkFilm(film, { upright }), [film, upright]), [frame, setFrame] = useState(start), [playing, setPlaying] = useState(false), [ready, setReady] = useState(false), [asked, setAsked] = useState(false), [calm] = useState(() => typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches));
  const told = useMemo(() => () => { setReady(true); if (autoPlay && !calm) setPlaying(true); onReady?.(); }, [autoPlay, calm, onReady]);
  useEffect(() => {
    if (!playing) return;
    let id = 0, from = performance.now(), base = frame;
    const tick = (now: number) => { let f = base + ((now - from) / 1000) * film.fps; if (f >= plan.frames) { if (!loop) { setFrame(plan.frames - 1); setPlaying(false); return; } from = now; base = 0; f = 0; } setFrame(Math.floor(f)); id = requestAnimationFrame(tick); };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
    // the frame it starts from is read once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, film.fps, plan.frames, loop]);
  const clock = (f: number) => { const s = Math.floor(f / film.fps); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
  return <div style={style}>
    <InkFilmStage {...props} film={film} upright={upright} frame={frame} still={still ?? (calm && !asked)} onReady={told} />
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 2px", color: "#2A2624", font: "500 15px/1 system-ui, sans-serif" }}>
      <button type="button" disabled={!ready} onClick={() => { setAsked(true); setPlaying(p => !p); }} aria-label={playing ? "Pause" : "Play"} style={{ minWidth: 84, minHeight: 40, borderRadius: 4, border: "1px solid #6B625B", background: "transparent", color: "inherit", font: "inherit", cursor: ready ? "pointer" : "default", opacity: ready ? 1 : 0.5 }}>{playing ? "Pause" : "Play"}</button>
      <input type="range" min={0} max={plan.frames - 1} value={frame} disabled={!ready} aria-label="Film position" aria-valuetext={`${clock(frame)} of ${clock(plan.frames)}`} onChange={e => { setPlaying(false); setFrame(Number(e.target.value)); }} style={{ flex: 1, minWidth: 0, accentColor: "#7A2E22", height: 28 }} />
      <span style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{clock(frame)} / {clock(plan.frames)}</span>
    </div>
  </div>;
}
