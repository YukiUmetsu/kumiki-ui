import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { compileFilm } from "../../registry/video/film-document";
import type { FilmDocument } from "../../registry/video/film-document";
import { FilmStage } from "../../registry/video/film-stage";
import { renderShodoSlot, shodoWritingFrames } from "../../registry/video/shodo/shodo-film-slot";
import { SHODO_KANJIVG_CREDIT } from "../../registry/video/shodo/shodo-glyph-source";
import type { CSSProperties, HTMLAttributes, RefObject } from "react";
import { SHODO_GLYPHS } from "../../registry/video/shodo/shodo-glyphs";
import type { ShodoGlyph } from "../../registry/video/shodo/shodo-glyphs";
import { planShodoWriting, shodoBrushPose } from "../../registry/video/shodo/shodo-hand";
import type { ShodoPlan } from "../../registry/video/shodo/shodo-hand";
import { ShodoInkSurface } from "../../registry/video/shodo/shodo-ink";
import { kenteiSheet } from "../../registry/video/shodo/shodo-paper";
import { SHODO_KANKA_RULES, shodoKankaRulesFor } from "../../registry/video/shodo/shodo-structure";
import { ShodoBrushProfile, ShodoCanvas } from "../../registry/video/shodo/shodo-react";
import { shodoFerruleHeight } from "../../registry/video/shodo/shodo-brush";
import { DEFAULT_SHODO_STYLE, SHODO_INKS, resolveShodoStyle } from "../../registry/video/shodo/shodo-style";
import { SHODO_BASICS, auditShodoTechniques, shodoStepLabel } from "../../registry/video/shodo/shodo-techniques";
import { SHODO_FPS, SHODO_PHASE_LABEL, SHODO_TECH_LABEL, ShodoTransport, useShodoGlyphs, useShodoPlayback, useShodoTeachers, shodoTeacherLabels } from "./shodo-studio";

const W = 1280, H = 720;
const page: CSSProperties = {
  minHeight: "100vh", background: "#F3F1EC", color: "#25211D", padding: 20, boxSizing: "border-box",
  font: "14px/1.45 system-ui, sans-serif", display: "grid", gap: 14, alignContent: "start",
};
const frameBox: CSSProperties = {
  position: "relative", maxWidth: 1280, width: "100%", borderRadius: 6, overflow: "hidden",
  boxShadow: "0 14px 40px rgba(40,30,20,.18)", containerType: "inline-size",
};

// ── Techniques: the ten basics, one cell each ─────────────────────────────────────

/** The ten basic techniques (SHODO_BASICS), written one after another with live steps and measured checks. */
export function ShodoTechniquesBoard() {
  const paper = useMemo(() => ({ x: 36, y: 30, width: W - 72, height: H - 60 }), []);
  const cols = 5, rows = 2, cw = paper.width / cols, ch = paper.height / rows, label = 74;
  const size = Math.min(cw, ch - label) * .98;
  const style = useMemo(() => resolveShodoStyle({ brush: { diameter: 118 }, hand: { speed: .9 } }), []);
  const plan = useMemo(() => planShodoWriting({
    style,
    items: SHODO_BASICS.map((basic, i): { glyph: ShodoGlyph; x: number; y: number; size: number } => ({
      glyph: { char: "・", source: "original", strokes: [basic.demo] },
      x: paper.x + (i % cols) * cw + (cw - size) / 2,
      y: paper.y + Math.floor(i / cols) * ch + 6,
      size,
    })),
    rest: [W - 70, H - 90], inkstone: [W + 60, 120],
  }), [paper, cw, ch, size, style]);
  // Measured once per plan: every basic must leave the shape its technique implies.
  const audit = useMemo(() => auditShodoTechniques(new ShodoInkSurface(plan, { ...paper, scale: 1 })), [plan, paper]);
  const last = Math.ceil(plan.duration * SHODO_FPS);
  const { frame, setFrame, playing, setPlaying } = useShodoPlayback(last, plan);
  const pose = shodoBrushPose(plan, frame / SHODO_FPS);
  const activeItem = plan.strokes[pose.stroke]?.item;
  const contact = pose.contact ? plan.strokes[pose.stroke]?.samples.find(s => s.t >= frame / SHODO_FPS) : undefined;
  const sheet = useMemo(() => {
    const s = kenteiSheet(paper.width, paper.height, cols, rows);
    return { ...s, cells: s.cells && { ...s.cells, inset: [0, 0, 0, 0] as const, centreMarks: false } };
  }, [paper]);
  return <div style={page}>
    <header>
      <div style={{ fontSize: 12, letterSpacing: 2.4, textTransform: "uppercase", color: "#9A3B24", fontWeight: 700 }}>SHO1 · 筆法 · 始筆 · 送筆 · 終筆</div>
      <h1 style={{ margin: "2px 0 0", font: "600 24px/1.2 Georgia, serif" }}>The basics: how a stroke starts, turns, stops and ends</h1>
    </header>
    <div style={frameBox}>
      <ShodoCanvas plan={plan} frame={frame} width={W} height={H} paper={paper} sheet={sheet} paperweight="none"
        label="Ten basic brush techniques written one after another" />
      {SHODO_BASICS.map((basic, i) => {
        const x = paper.x + (i % cols) * cw, y = paper.y + Math.floor(i / cols) * ch + ch - label;
        const active = i === activeItem;
        const checks = audit.checks.filter(c => plan.strokes[c.stroke].item === i);
        const ok = checks.every(c => c.check.pass);
        return <div key={basic.id} aria-current={active ? "step" : undefined} style={{
          position: "absolute", left: `${x / W * 100}%`, top: `${y / H * 100}%`, width: `${cw / W * 100}%`, height: `${label / H * 100}%`,
          display: "grid", alignContent: "center", justifyItems: "center", textAlign: "center", padding: "0 1.2cqw", boxSizing: "border-box",
          color: active ? "#B3301A" : "#3A332C", transition: "color .2s",
        }}>
          <div style={{ font: "600 2.1cqw/1.1 'Hiragino Mincho ProN', 'Yu Mincho', serif" }}>{basic.term}</div>
          <div style={{ font: "600 1.05cqw/1.3 system-ui, sans-serif", letterSpacing: ".02em" }}>
            {basic.reading} · {basic.phase === "kihitsu" && basic.id !== "ten" ? "start" : basic.phase === "tensetsu" ? "turn" : basic.id === "ten" ? "dot" : "end"}
            {" "}<span title={checks.map(c => `${c.check.message}: ${c.check.measured} (${c.check.bound})`).join("\n")}
              style={{ color: ok ? "#2F6B3A" : "#B3301A" }}>{ok ? "✓" : "✗"}</span>
          </div>
          <div style={{ font: "400 .98cqw/1.25 system-ui, sans-serif", opacity: .8 }}>{basic.summary}</div>
        </div>;
      })}
    </div>
    <ShodoTransport frame={frame} last={last} playing={playing} onPlaying={setPlaying} onFrame={setFrame} />
    <div aria-live="polite" style={{ fontWeight: 600, minHeight: 22 }}>
      {SHODO_PHASE_LABEL[pose.phase] ?? pose.phase}{contact ? <> — {shodoStepLabel(contact)}</> : null}
    </div>
    <p style={{ margin: 0, fontSize: 12.5, maxWidth: 900 }}>✓ means the rendered stroke measures as its technique should
      (for example 懸針 ends under 35 % of its travel width, 止め ends heavier than its travel). Hover a ✓ for the numbers.</p>
  </div>;
}

// ── Kanji study card: written character beside a reading card ──────────────────────

export interface KanjiCardWord { word: string; ruby: string; romaji: string; meaning: string }
/** JLPT level, from N5 (easiest) to N1. */
export type JlptLevel = "N5" | "N4" | "N3" | "N2" | "N1";
export type KanjiCardLayout = "landscape" | "portrait";
export type KanjiCardPhase = "write" | "review" | "info";
export type KanjiCardSection = "label" | "meanings" | "readings" | "jlpt" | "words";

/** What the card says about the character. Every field is data from the host. */
export interface KanjiCardContent {
  meanings?: string;
  onyomi?: string;
  kunyomi?: string;
  /** JLPT level. No level (or null) shows no badge. */
  jlpt?: JlptLevel | null;
  words?: readonly KanjiCardWord[];
  /** Stroke numbers (1-based) written by the teacher's vermilion brush. */
  vermilionStrokes?: readonly number[];
}

/** Seconds for each phase of the video. A phase of 0 seconds is skipped. */
export interface KanjiCardTiming {
  /** First writing, with its short hold at the end. Default: the natural pace of the brush. */
  write?: number;
  /** Second writing, which shows the order number of each stroke. Default: the same as `write`. */
  review?: number;
  /** Hold of the finished card at the end. Default: 4. */
  info?: number;
}

export interface ShodoKanjiCardProps extends KanjiCardContent {
  /** The character to write. Default: 道, which also has sample card data. */
  char?: string;
  /** The label at the top of the writing panel reads "HEADING: char". */
  heading?: string;
  /** "landscape" is 16:9 (1280 × 720). "portrait" is 9:16 (720 × 1280) for phone shorts. */
  layout?: KanjiCardLayout;
  timing?: KanjiCardTiming;
  /** Parts to show. All parts show by default. A part with no data never shows. */
  sections?: Partial<Record<KanjiCardSection, boolean>>;
  /** The phase in which the text of the card fades in. Default: "write" (from the first frame). */
  cardFrom?: KanjiCardPhase;
}

const MICHI_WORDS: readonly KanjiCardWord[] = [
  { word: "道", ruby: "みち", romaji: "michi", meaning: "street, path" },
  { word: "道路", ruby: "どうろ", romaji: "dōro", meaning: "road, highway" },
  { word: "書道", ruby: "しょどう", romaji: "shodō", meaning: "calligraphy" },
];

/**
 * Sample data for the default character only. The JLPT level of 道 is from Jonathan Waller's
 * JLPT N4 kanji list (tanos.co.uk, Creative Commons BY). JLPT has published no official kanji
 * list since 2010, so a level is an estimate that the host supplies.
 */
const KANJI_CARD_SAMPLES: Readonly<Record<string, KanjiCardContent>> = {
  "道": { meanings: "WAY / PATH / ROAD", onyomi: "DŌ (ドウ)", kunyomi: "michi (みち)", jlpt: "N4", words: MICHI_WORDS, vermilionStrokes: [12] },
};

/**
 * The content of the card: each prop, or the sample for the default character 道. Other
 * characters show only the data that the host gives. The card does not invent a level or a
 * reading. `null` hides the sample value.
 */
export function resolveKanjiCardContent(char: string, props: KanjiCardContent): KanjiCardContent {
  const sample = KANJI_CARD_SAMPLES[char] ?? {};
  const pick = <K extends keyof KanjiCardContent>(key: K): KanjiCardContent[K] => props[key] !== undefined ? props[key] : sample[key];
  return {
    meanings: pick("meanings"), onyomi: pick("onyomi"), kunyomi: pick("kunyomi"), jlpt: pick("jlpt"),
    words: pick("words"), vermilionStrokes: pick("vermilionStrokes"),
  };
}

export interface KanjiCardTimeline {
  fps: number;
  /** Frame ranges [start, end) of each phase. */
  write: readonly [number, number];
  review: readonly [number, number];
  info: readonly [number, number];
  frames: number;
}

/** Frame ranges of the three phases for a writing that takes `writing` seconds at its natural pace. */
export function kanjiCardTimeline(writing: number, timing: KanjiCardTiming = {}, fps = SHODO_FPS): KanjiCardTimeline {
  const seconds = (value: number | undefined, fallback: number) => Math.max(0, value !== undefined && Number.isFinite(value) ? value : fallback);
  const write = seconds(timing.write, writing);
  const review = seconds(timing.review, write > 0 ? write : writing);
  const info = seconds(timing.info, 4);
  const w = Math.round(write * fps), r = Math.round(review * fps), i = Math.round(info * fps);
  return { fps, write: [0, w], review: [w, w + r], info: [w + r, w + r + i], frames: Math.max(1, w + r + i) };
}

/** The phase at `frame`, the frame within the phase and the length of the phase in frames. */
export function kanjiCardPhaseAt(timeline: KanjiCardTimeline, frame: number): { phase: KanjiCardPhase; local: number; length: number } {
  for (const phase of ["write", "review"] as const) {
    const [a, b] = timeline[phase];
    if (frame < b) return { phase, local: Math.max(0, frame - a), length: b - a };
  }
  const [a, b] = timeline.info;
  return { phase: "info", local: Math.max(0, frame - a), length: b - a };
}

interface KanjiCardType {
  label: number; pad: readonly [number, number]; gap: number; head: number; headKanji: number;
  reading: number; badge: number; title: number; word: number; ruby: number; gloss: number;
}
interface KanjiCardGeometry {
  width: number; height: number;
  /** The writing panel (the sheet) and the info card, design px. */
  paper: { x: number; y: number; width: number; height: number };
  card: { x: number; y: number; width: number; height: number } | null;
  /** Largest em size of the character, design px. */
  em: number;
  label: { x: number; y: number };
  type: KanjiCardType;
}

// Text sizes in design px. Portrait sizes keep body text at 13 px or more on a 390 px wide phone.
const KANJI_CARD_TYPE: Record<KanjiCardLayout, KanjiCardType> = {
  landscape: { label: 33, pad: [40, 34], gap: 22, head: 31, headKanji: 38, reading: 19, badge: 16, title: 24, word: 46, ruby: 16, gloss: 20 },
  portrait: { label: 42, pad: [30, 40], gap: 14, head: 36, headKanji: 46, reading: 26, badge: 22, title: 28, word: 48, ruby: 21, gloss: 26 },
};

function kanjiCardGeometry(layout: KanjiCardLayout, withCard: boolean): KanjiCardGeometry {
  if (layout === "portrait") {
    const width = 720, height = 1280, split = withCard ? 750 : height;
    return {
      width, height, paper: { x: 0, y: 0, width, height: split },
      card: withCard ? { x: 0, y: split, width, height: height - split } : null,
      em: 600, label: { x: 36, y: 32 }, type: KANJI_CARD_TYPE.portrait,
    };
  }
  const width = 1280, height = 720, split = withCard ? 880 : width;
  return {
    width, height, paper: { x: 0, y: 0, width: split, height },
    card: withCard ? { x: split, y: 0, width: width - split, height } : null,
    em: 540, label: { x: 44, y: 36 }, type: KANJI_CARD_TYPE.landscape,
  };
}

const KANJI_CARD_SPEED = 1.6;

/** Union of the contact bounds of every stroke, design px. */
function kanjiInkBox(plan: ShodoPlan): [number, number, number, number] {
  return plan.strokes.reduce<[number, number, number, number]>((a, s) =>
    [Math.min(a[0], s.bounds[0]), Math.min(a[1], s.bounds[1]), Math.max(a[2], s.bounds[2]), Math.max(a[3], s.bounds[3])],
  [Infinity, Infinity, -Infinity, -Infinity]);
}

/**
 * Plans the writing with the ink centred in the writing panel. The character is made smaller
 * only when its ink would reach the label band or the edge of the sheet. With `seconds`, the
 * hand's speed is fitted so that the writing takes about that long.
 */
function planKanjiCard(glyph: ShodoGlyph, g: KanjiCardGeometry, vermilion: readonly number[], withLabel: boolean, seconds?: number): ShodoPlan {
  const strokeInk = Object.fromEntries(vermilion.map(n => [n - 1, SHODO_INKS.shuboku]));
  const rest: [number, number] = [g.paper.x + g.paper.width - 90, g.paper.y + g.paper.height * .83];
  const inkstone: [number, number] = [g.width + 80, g.height / 2];
  const at = (speed: number, x: number, y: number, size: number) => planShodoWriting({
    style: resolveShodoStyle({ hand: { speed } }, DEFAULT_SHODO_STYLE),
    items: [{ glyph, x, y, size, strokeInk }], rest, inkstone, exit: "hover",
  });
  const [x0, y0, x1, y1] = kanjiInkBox(at(KANJI_CARD_SPEED, 0, 0, g.em));
  const cx = g.paper.x + g.paper.width / 2, cy = g.paper.y + g.paper.height / 2;
  const margin = Math.min(g.paper.width, g.paper.height) * .045;
  const top = withLabel ? g.label.y + g.type.label * 1.5 : g.paper.y + margin;
  const k = Math.min(1,
    (g.paper.width / 2 - margin) / ((x1 - x0) / 2),
    (cy - top) / ((y1 - y0) / 2),
    (g.paper.y + g.paper.height - margin - cy) / ((y1 - y0) / 2));
  const size = g.em * k, x = cx - k * (x0 + x1) / 2, y = cy - k * (y0 + y1) / 2;
  if (!seconds || !(seconds > 0)) return at(KANJI_CARD_SPEED, x, y, size);
  // The writing takes less time at a higher speed: bisect the speed on a log scale.
  let lo = Math.log(.25), hi = Math.log(4);
  if (at(4, x, y, size).duration >= seconds) return at(4, x, y, size);
  if (at(.25, x, y, size).duration <= seconds) return at(.25, x, y, size);
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2;
    if (at(Math.exp(mid), x, y, size).duration > seconds) lo = mid; else hi = mid;
  }
  return at(Math.exp((lo + hi) / 2), x, y, size);
}

const JLPT_LEVELS: readonly JlptLevel[] = ["N5", "N4", "N3", "N2", "N1"];

const KANJI_INK = "#1B1A18", KANJI_MUTED = "#665B51", KANJI_SHU = "#B3301A";
const KANJI_SERIF = "'Hiragino Mincho ProN', 'Yu Mincho', 'Noto Serif JP', serif";
const KANJI_DISPLAY = "'Oswald', 'Arial Narrow', system-ui, sans-serif";

/** Keeps the content inside a box of fixed height: text gets smaller (to 60 %) before it is cut. */
function useFitHeight(ref: RefObject<HTMLElement | null>, key: string) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fits = (f: number) => { el.style.setProperty("--km-fit", f.toFixed(3)); return el.scrollHeight <= el.clientHeight + 1; };
    const fit = () => {
      // Shorter lines wrap less, so the size is found by bisection, not by one ratio.
      let f = 1;
      if (!fits(1)) {
        let lo = .6, hi = 1;
        for (let i = 0; i < 7; i++) { const mid = (lo + hi) / 2; if (fits(mid)) lo = mid; else hi = mid; }
        f = lo;
        fits(f);
      }
      el.dataset.kmFit = f.toFixed(3);
      el.dataset.kmOverflow = String(el.scrollHeight > el.clientHeight + 1);
    };
    fit();
    let live = true;
    document.fonts?.ready.then(() => { if (live) fit(); }).catch(() => undefined);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(fit);
    observer?.observe(el);
    return () => { live = false; observer?.disconnect(); };
  }, [ref, key]);
}

export interface ShodoKanjiInfoCardProps extends KanjiCardContent, Omit<HTMLAttributes<HTMLElement>, "children"> {
  char: string;
  layout?: KanjiCardLayout;
  sections?: Partial<Record<KanjiCardSection, boolean>>;
  /** Opacity of the text, 0..1, for a frame-driven fade-in. The panel itself always shows. */
  reveal?: number;
}

/**
 * The reading card: meanings, readings, JLPT level and useful words. Sizes are in `cqw` of the
 * nearest size container (the video frame), so the card scales with the frame.
 */
export function ShodoKanjiInfoCard({
  char, meanings, onyomi, kunyomi, jlpt, words, layout = "landscape", sections, reveal = 1, style, ...rest
}: ShodoKanjiInfoCardProps) {
  const ref = useRef<HTMLElement>(null);
  const t = KANJI_CARD_TYPE[layout], W = layout === "portrait" ? 720 : 1280;
  const cq = (px: number) => `${(px / W * 100).toFixed(3)}cqw`;
  const fs = (px: number) => `calc(${cq(px)} * var(--km-fit, 1))`;
  const show = { meanings: true, readings: true, jlpt: true, words: true, ...sections };
  const level = show.jlpt && jlpt && JLPT_LEVELS.includes(jlpt) ? jlpt : null;
  const readings = show.readings && (onyomi || kunyomi);
  const list = show.words && words?.length ? words : null;
  useFitHeight(ref, [char, meanings, onyomi, kunyomi, level, layout, JSON.stringify(list), JSON.stringify(show)].join("|"));
  const term: CSSProperties = { font: `700 ${fs(t.reading * .84)}/1.3 ${KANJI_DISPLAY}`, letterSpacing: ".06em", color: KANJI_MUTED };
  return <aside {...rest} ref={ref} aria-label={`${char} readings and words`} style={{
    background: "#FBFAF7", padding: `${cq(t.pad[0])} ${cq(t.pad[1])}`, boxSizing: "border-box", overflow: "hidden", color: KANJI_INK, ...style,
  }}>
    <div style={{ display: "grid", alignContent: "start", gap: fs(t.gap), opacity: reveal }}>
      {show.meanings && meanings ? <div style={{
        display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: ".3em", rowGap: ".1em",
        font: `700 ${fs(t.head)}/1.12 ${KANJI_DISPLAY}`, borderBottom: "1px solid #C9C3B8", paddingBottom: fs(t.gap * .6),
      }}>
        <span lang="ja" style={{ font: `700 ${fs(t.headKanji)}/1 ${KANJI_SERIF}` }}>{char}</span>
        <span aria-hidden="true" style={{ color: "#A39A8E" }}>|</span>
        <span style={{ flex: "1 1 8em", minWidth: 0 }}>{meanings}</span>
      </div> : null}
      {readings || level ? <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: `${fs(t.gap * .5)} ${fs(t.gap)}` }}>
        {readings ? <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "auto auto", justifyContent: "start", alignItems: "baseline", columnGap: ".7em", rowGap: ".2em", font: `600 ${fs(t.reading)}/1.3 system-ui, sans-serif` }}>
          {onyomi ? <><dt style={term}>ON&apos;YOMI</dt><dd style={{ margin: 0 }}>{onyomi}</dd></> : null}
          {kunyomi ? <><dt style={term}>KUN&apos;YOMI</dt><dd style={{ margin: 0 }}>{kunyomi}</dd></> : null}
        </dl> : null}
        {level ? <span data-km-jlpt={level} style={{
          display: "inline-flex", alignItems: "center", whiteSpace: "nowrap", font: `700 ${fs(t.badge)}/1 ${KANJI_DISPLAY}`, letterSpacing: ".06em",
          color: KANJI_SHU, border: `max(1px, ${cq(2)}) solid ${KANJI_SHU}`, borderRadius: ".3em", padding: ".42em .8em",
        }}>JLPT {level}</span> : null}
      </div> : null}
      {list ? <>
        <div style={{ font: `700 ${fs(t.title)}/1 ${KANJI_DISPLAY}`, marginTop: fs(t.gap * .3) }}>USEFUL WORDS</div>
        <ul role="list" style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gridTemplateColumns: "auto 1fr", columnGap: fs(t.word * .45), rowGap: fs(t.gap * .75) }}>
          {list.map((w, i) => <li key={i} style={{ display: "grid", gridColumn: "1 / -1", gridTemplateColumns: "subgrid", alignItems: "end" }}>
            <ruby lang="ja" style={{ font: `600 ${fs(t.word)}/1.08 ${KANJI_SERIF}` }}>{w.word}<rt style={{ font: `600 ${fs(t.ruby)}/1.2 system-ui, sans-serif`, letterSpacing: ".04em", color: KANJI_MUTED }}>{w.ruby}</rt></ruby>
            <span style={{ display: "grid", font: `500 ${fs(t.gloss)}/1.25 system-ui, sans-serif`, paddingBottom: ".12em", minWidth: 0 }}>
              <span style={{ color: KANJI_MUTED, fontWeight: 600 }}>{w.romaji}</span>
              <span>{w.meaning}</span>
            </span>
          </li>)}
        </ul>
      </> : null}
    </div>
  </aside>;
}

const KANJI_PHASE_TEXT: Record<KanjiCardPhase, string> = {
  write: "1 · Write: the brush writes the character",
  review: "2 · Review: the brush writes it again, with the order number of each stroke",
  info: "3 · Info: the finished card holds",
};

/**
 * A study video for one kanji: the brush writes the character on gridded hanshi, writes it
 * again with small vermilion stroke-order numbers, then holds the reading card. The ink is
 * centred in the writing panel. Landscape (16:9) puts the card on the right; portrait (9:16)
 * puts it under the sheet for phone shorts.
 */
export function ShodoKanjiCard({
  char = "道", heading = "Kanji study", layout = "landscape", timing, sections, cardFrom = "write", ...data
}: ShodoKanjiCardProps) {
  const content = resolveKanjiCardContent(char, data);
  const show = { label: true, meanings: true, readings: true, jlpt: true, words: true, ...sections };
  const withCard = !!(show.meanings && content.meanings || show.readings && (content.onyomi || content.kunyomi)
    || show.jlpt && content.jlpt || show.words && content.words?.length);
  const g = useMemo(() => kanjiCardGeometry(layout, withCard), [layout, withCard]);
  const vermilion = content.vermilionStrokes ?? [];
  const vermilionKey = vermilion.join(",");
  const card0 = useMemo(() => [char], [char]);
  const loaded = useShodoGlyphs(card0, "kanjivg");
  const glyph = loaded ? loaded.glyphs[0] ?? SHODO_GLYPHS[char] : undefined;
  // The hand's pace follows the first writing that has a set length; otherwise its natural pace.
  const pace = timing?.write ? timing.write : timing?.write === 0 && timing.review ? timing.review : undefined;
  const plan = useMemo(() => glyph ? planKanjiCard(glyph, g, vermilionKey ? vermilionKey.split(",").map(Number) : [], show.label, pace) : null,
    [glyph, g, vermilionKey, show.label, pace]);
  const timeline = useMemo(() => kanjiCardTimeline(plan?.duration ?? 0, { write: timing?.write, review: timing?.review, info: timing?.info }),
    [plan, timing?.write, timing?.review, timing?.info]);
  const last = timeline.frames - 1;
  const { frame, setFrame, playing, setPlaying } = useShodoPlayback(last, plan);
  const sheet = useMemo(() => kenteiSheet(g.paper.width, g.paper.height, 1, 1), [g]);
  const inkBox = useMemo(() => plan ? kanjiInkBox(plan).map(v => v.toFixed(1)).join(" ") : "", [plan]);
  if (!loaded) return <div style={page}>Loading strokes…</div>;
  if (!glyph || !plan) return <div role="alert" style={page}>No stroke data for {char}.</div>;

  const at = kanjiCardPhaseAt(timeline, Math.min(frame, last));
  const reviewed = timeline.review[1] > timeline.review[0];
  const writeGuide = vermilion.length ? "all" as const : "none" as const;
  // Each pass plays the same plan, stretched to its phase; the info phase holds the last pass.
  const writing = at.phase !== "info" && at.length > 0;
  const guide = (writing ? at.phase === "review" : reviewed) ? "numbers" as const : writeGuide;
  const canvasFps = writing ? at.length / plan.duration : SHODO_FPS;
  const canvasFrame = writing ? at.local : Math.ceil(plan.duration * SHODO_FPS);
  // The text fades in over 12 frames at the start of its phase; from "write" it shows at once.
  const reveal = cardFrom === "write" ? 1 : Math.min(1, Math.max(0, (frame - timeline[cardFrom][0]) / 12));
  const pct = (v: number, of: number) => `${(v / of * 100).toFixed(3)}%`;
  const portrait = layout === "portrait";
  return <div style={page}>
    <div data-km-kanji-card={layout} data-km-kanji-phase={at.phase} data-km-ink-box={inkBox} data-km-design={`${g.width}x${g.height}`}
      data-km-timeline={[timeline.review[0], timeline.info[0], timeline.frames].join(" ")} style={{
      ...frameBox, maxWidth: portrait ? "min(100%, calc((100dvh - 190px) * 720 / 1280))" : frameBox.maxWidth,
    }}>
      <ShodoCanvas plan={plan} frame={canvasFrame} fps={canvasFps} width={g.width} height={g.height} paper={g.paper} sheet={sheet} paperweight="none"
        underlay="none" orderGuide={guide} guideStrokes={guide === "numbers" ? undefined : vermilion} label={`The kanji ${char} written with a brush`} />
      {show.label ? <div data-km-kanji-label="" style={{
        position: "absolute", left: pct(g.label.x, g.width), top: pct(g.label.y, g.height),
        font: `700 ${(g.type.label / g.width * 100).toFixed(3)}cqw/1 ${KANJI_DISPLAY}`, letterSpacing: ".01em", color: KANJI_INK,
      }}>{heading.toUpperCase()}: <span lang="ja">{char}</span></div> : null}
      {g.card ? <ShodoKanjiInfoCard char={char} layout={layout} sections={show} reveal={reveal}
        meanings={content.meanings} onyomi={content.onyomi} kunyomi={content.kunyomi} jlpt={content.jlpt} words={content.words} style={{
          position: "absolute", left: pct(g.card.x, g.width), top: pct(g.card.y, g.height), width: pct(g.card.width, g.width), height: pct(g.card.height, g.height),
          boxShadow: portrait ? "0 -6px 18px rgba(0,0,0,.12)" : "-6px 0 18px rgba(0,0,0,.12)",
        }} /> : null}
    </div>
    <ShodoTransport frame={frame} last={last} playing={playing} onPlaying={setPlaying} onFrame={setFrame} />
    <div aria-live="polite" style={{ fontWeight: 600, minHeight: 22 }}>{KANJI_PHASE_TEXT[at.phase]}</div>
    {glyph.source === "kanjivg" ? <p style={{ margin: 0, fontSize: 12.5 }}>{SHODO_KANJIVG_CREDIT}.</p> : null}
  </div>;
}

// ── Brush close-up: the tuft at macro scale ───────────────────────────────────────

const CLOSE_UP: ShodoGlyph = {
  char: "永", source: "original", strokes: [
    { kind: "horizontal", points: [[60, 330], [420, 300], [760, 280]], weight: 1 },
    { kind: "vertical", end: "hane", hook: [-.86, -.5], points: [[520, 380], [522, 560], [520, 720]], weight: 1 },
  ],
};

/** Macro view: one horizontal and one 撥ね at a scale where single hairs read. */
export function ShodoBrushCloseUp({ ink = "sumi" }: { ink?: keyof typeof SHODO_INKS }) {
  const paper = useMemo(() => ({ x: -40, y: -40, width: W + 80, height: H + 80 }), []);
  const style = useMemo(() => resolveShodoStyle({ hand: { speed: .6 }, ink: { ...SHODO_INKS[ink] } }), [ink]);
  const plan = useMemo(() => planShodoWriting({
    style, items: [{ glyph: CLOSE_UP, x: 150, y: -110, size: 960 }], rest: [W - 160, H - 60], inkstone: [W + 200, 200],
  }), [style]);
  const last = Math.ceil(plan.duration * SHODO_FPS);
  const { frame, setFrame, playing, setPlaying } = useShodoPlayback(last, plan);
  const pose = shodoBrushPose(plan, frame / SHODO_FPS);
  return <div style={page}>
    <div style={frameBox}>
      <ShodoCanvas plan={plan} frame={frame} width={W} height={H} paper={paper} sheet={null} paperweight="none"
        underlay="none" cameraHeight={2600} label="Close-up of a brush writing a horizontal stroke and a hooked vertical" />
    </div>
    <ShodoTransport frame={frame} last={last} playing={playing} onPlaying={setPlaying} onFrame={setFrame} />
    <div aria-live="polite" style={{ fontWeight: 600 }}>
      {SHODO_PHASE_LABEL[pose.phase] ?? pose.phase}{pose.technique ? <> — {SHODO_TECH_LABEL[pose.technique] ?? pose.technique}</> : null}
      {" · "}press {(pose.p * 100).toFixed(0)}% · ink {(pose.ink * 100).toFixed(0)}%
    </div>
  </div>;
}

// ── Film shot: the FilmStage slot ─────────────────────────────────────────────────

const FILM_STYLE = { hand: { speed: 1.4 } } as const;

/** A one-shot FilmDocument that writes 永 through `renderShodoSlot`, in 16:9 or 9:16. */
export function ShodoFilmShot() {
  const [aspect, setAspect] = useState<"landscape" | "portrait">("landscape");
  const frames = useMemo(() => shodoWritingFrames("永", FILM_STYLE, 30) + 15, []);
  const film = useMemo(() => {
    const doc: FilmDocument = {
      schemaVersion: 1, id: "shodo-film-shot", fps: { num: 30, den: 1 }, drift: 0,
      outputs: [{ id: "landscape", width: 1280, height: 720 }, { id: "portrait", width: 720, height: 1280 }],
      scenes: [{
        id: "write-ei", recipeId: "slot", durationFrames: frames,
        content: { slot: "shodo-writing", label: "The kanji 永 written with a brush", props: { text: "永", style: FILM_STYLE, orderGuide: "current" } },
      }],
    };
    return compileFilm(doc, { outputId: aspect });
  }, [frames, aspect]);
  const { frame, setFrame, playing, setPlaying } = useShodoPlayback(frames - 1, film);
  if (!film.ok) return <pre role="alert">{film.diagnostics.map(d => d.path + ": " + d.message).join("\n")}</pre>;
  const scale = aspect === "portrait" ? .5 : 1;
  return <div style={page}>
    <label style={{ display: "grid", gap: 4, fontWeight: 600, fontSize: 12.5, width: 200 }}>Output
      <select value={aspect} onChange={e => setAspect(e.target.value as "landscape" | "portrait")} aria-label="Output">
        <option value="landscape">16:9 landscape</option><option value="portrait">9:16 portrait</option>
      </select>
    </label>
    <div style={{ width: film.film.width * scale, height: film.film.height * scale, maxWidth: "100%", overflow: "hidden", boxShadow: "0 14px 40px rgba(40,30,20,.18)" }}>
      <FilmStage film={film.film} frame={frame} renderObject={() => null}
        renderSlot={(content, context) => {
          const node = renderShodoSlot(content, context);
          if (node === undefined) throw new Error("Unknown slot " + content.slot);
          return node;
        }} style={{ transform: `scale(${scale})`, transformOrigin: "top left" }} />
    </div>
    <ShodoTransport frame={frame} last={frames - 1} playing={playing} onPlaying={setPlaying} onFrame={setFrame} />
  </div>;
}

// ── Character gallery: any text through the general pipeline ──────────────────────

/** Write any text (kanji and kana) from KanjiVG stroke data. */
const KANKA_TERM = Object.fromEntries(SHODO_KANKA_RULES.map(rule => [rule.id, rule.term]));

export function ShodoCharacterGallery({ initialText = "道永書和夢心東京花風春愛あのふア" }: { initialText?: string }) {
  const [text, setText] = useState(initialText);
  const [bundled, setBundled] = useState(false);
  const [structure, setStructure] = useState(true);
  const teachers = useShodoTeachers();
  const [useTeacher, setUseTeacher] = useState(true);
  const chars = useMemo(() => [...text].filter(c => c.trim()).slice(0, 24), [text]);
  const form = useMemo(() => structure ? {} : { structure: false as const }, [structure]);
  const loaded = useShodoGlyphs(chars, bundled ? "bundled" : teachers.length && useTeacher ? "teacher" : "kanjivg", form, teachers);
  const glyphs = loaded?.glyphs ?? null, error = loaded?.error ?? null;
  const cols = 8, cell = 150, gap = 6;
  const rows = Math.max(1, Math.ceil(chars.length / cols));
  const width = 36 * 2 + cols * cell + (cols - 1) * gap, height = 36 * 2 + rows * cell + (rows - 1) * gap;
  const paper = useMemo(() => ({ x: 0, y: 0, width, height }), [width, height]);
  const style = useMemo(() => resolveShodoStyle({ hand: { speed: 2.4 } }), []);
  const plan = useMemo(() => glyphs && glyphs.length ? planShodoWriting({
    style, items: glyphs.map((glyph, i) => ({ glyph, size: cell, x: 36 + (i % cols) * (cell + gap), y: 36 + Math.floor(i / cols) * (cell + gap) })),
    rest: [width - 40, height - 30],
  }) : null, [glyphs, style, width, height]);
  const last = plan ? Math.ceil(plan.duration * SHODO_FPS) : 0;
  const { frame, setFrame, playing, setPlaying } = useShodoPlayback(last, plan);
  const sheet = useMemo(() => kenteiSheet(width, height, cols, rows), [width, height, rows]);
  const usesKanjiVg = glyphs?.some(g => g.source === "kanjivg" || g.source === "teacher");
  const taughtCount = glyphs?.filter(g => g.source === "teacher").length ?? 0;
  return <div style={page}>
    <header>
      <div style={{ fontSize: 12, letterSpacing: 2.4, textTransform: "uppercase", color: "#9A3B24", fontWeight: 700 }}>SHO1 · 任意の文字</div>
      <h1 style={{ margin: "2px 0 0", font: "600 24px/1.2 Georgia, serif" }}>Any character: kanji and kana from stroke data</h1>
    </header>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "end" }}>
      <label style={{ display: "grid", gap: 4, fontWeight: 600, fontSize: 12.5 }}>Text (up to 24 characters)
        <input value={text} onChange={e => setText(e.target.value)} aria-label="Text" style={{ minHeight: 36, font: "20px serif", width: 420 }} />
      </label>
      {teachers.length ? <label style={{ display: "flex", gap: 6, alignItems: "center", fontWeight: 600, fontSize: 12.5 }}><input type="checkbox" checked={useTeacher} onChange={e => setUseTeacher(e.target.checked)} />Teacher's own forms (local)</label> : null}
      <label style={{ display: "flex", gap: 6, alignItems: "center", fontWeight: 600, fontSize: 12.5 }}><input type="checkbox" checked={structure} onChange={e => setStructure(e.target.checked)} />Teacher layout rules (間架結構法)</label>
      <label style={{ display: "flex", gap: 6, alignItems: "center", fontWeight: 600, fontSize: 12.5 }}><input type="checkbox" checked={bundled} onChange={e => setBundled(e.target.checked)} />Prefer bundled originals</label>
    </div>
    {error ? <div role="alert">{error}</div> : null}
    <div style={{ ...frameBox, maxWidth: width }}>
      {plan ? <ShodoCanvas plan={plan} frame={frame} width={width} height={height} paper={paper} sheet={sheet} underlay="none"
        paperweight="none" label={`Brush calligraphy of ${chars.join("")}`} /> : <div style={{ padding: 24 }}>Loading strokes…</div>}
    </div>
    <ShodoTransport frame={frame} last={last} playing={playing} onPlaying={setPlaying} onFrame={setFrame} />
    {structure && glyphs?.some(g => g.source !== "original") ? <section aria-label="間架結構 rules" style={{ display: "grid", gap: 8, maxWidth: 980 }}>
      <ul style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", margin: 0, padding: 0, listStyle: "none", fontSize: 13 }}>
        {glyphs.filter(g => g.source !== "original").map((g, i) => <li key={i}>
          <span style={{ font: "18px serif", marginRight: 4 }}>{g.char}</span>
          {g.source === "teacher" ? "teacher's form" : shodoKankaRulesFor(g).map(id => KANKA_TERM[id]).join(" · ") || "no rule"}
        </li>)}
      </ul>
      <dl style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "2px 12px", margin: 0, fontSize: 12.5 }}>
        {SHODO_KANKA_RULES.map(rule => <div key={rule.id} style={{ display: "contents" }}>
          <dt style={{ fontWeight: 700 }}>{rule.term} <span style={{ fontWeight: 400, color: "#6b5a4a" }}>{rule.reading}</span></dt>
          <dd style={{ margin: 0 }}>{rule.summary}</dd>
        </div>)}
      </dl>
    </section> : null}
    <p style={{ margin: 0, fontSize: 12.5, maxWidth: 980 }}>
      Kanji and kana are read from KanjiVG stroke data. The 間架結構法 layout rules, measured on 411 teacher
      models, and the kaisho brush rules are applied.
      {taughtCount && teachers.length ? <> {taughtCount} of {glyphs?.length} characters use a teacher's own forms ({shodoTeacherLabels(chars, teachers).join("; ")}).</> : null}
      {usesKanjiVg ? <> {SHODO_KANJIVG_CREDIT}. Credit KanjiVG in any film made from it.</> : null}
    </p>
  </div>;
}

// ── Brush motion: top and side views ─────────────────────────────────────────────

/**
 * The brush's lean and height through a character, from the top (as the film shows it) and
 * from the side (as side-view teaching videos show it), with both traced over time.
 */
export function ShodoBrushMotionStudy({ char = "永" }: { char?: string }) {
  const [side, setSide] = useState(.15);
  const style = useMemo(() => resolveShodoStyle({ hand: { speed: .8, sideBrush: side } }), [side]);
  const paper = useMemo(() => ({ x: 400, y: 30, width: 480, height: 660 }), []);
  const glyph = SHODO_GLYPHS[char] ?? SHODO_GLYPHS["永"];
  const plan = useMemo(() => planShodoWriting({
    style, items: [{ glyph, x: 440, y: 150, size: 400 }], rest: [960, 470], inkstone: [1300, 160],
  }), [style, glyph]);
  const last = Math.ceil(plan.duration * SHODO_FPS);
  const { frame, setFrame, playing, setPlaying } = useShodoPlayback(last, plan);
  // Lean (degrees) and ferrule height (tuft lengths) over the whole writing.
  const trace = useMemo(() => Array.from({ length: last + 1 }, (_, f) => {
    const p = shodoBrushPose(plan, f / SHODO_FPS);
    return { lean: Math.hypot(p.leanX, p.leanY), height: shodoFerruleHeight(p, plan.style.brush, plan.brush.diameter) / plan.brush.tuftLength, contact: p.contact };
  }), [plan, last]);
  const pose = shodoBrushPose(plan, frame / SHODO_FPS);
  const cw = 1200, ch = 150, x = (f: number) => f / Math.max(1, last) * cw;
  const path = (k: "lean" | "height", scale: number, top: number) =>
    trace.map((t, f) => (f ? "L" : "M") + x(f).toFixed(1) + " " + (top - t[k] * scale).toFixed(1)).join(" ");
  const contactBands = trace.reduce<{ from: number; to: number }[]>((bands, t, f) => {
    if (t.contact) { const b = bands[bands.length - 1]; if (b && b.to === f - 1) b.to = f; else bands.push({ from: f, to: f }); }
    return bands;
  }, []);
  return <div style={page}>
    <header>
      <div style={{ fontSize: 12, letterSpacing: 2.4, textTransform: "uppercase", color: "#9A3B24", fontWeight: 700 }}>SHO1 · 運筆 · brush motion</div>
      <h1 style={{ margin: "2px 0 0", font: "600 24px/1.2 Georgia, serif" }}>How the brush leans and rises as it writes</h1>
    </header>
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 12, maxWidth: 1280 }}>
      <div style={{ ...frameBox }}>
        <ShodoCanvas plan={plan} frame={frame} width={W} height={H} paper={paper} sheet={kenteiSheet(paper.width, paper.height)}
          paperweight="none" label={`Top view: the brush writing ${glyph.char}`} />
      </div>
      <div style={{ ...frameBox }}>
        <ShodoBrushProfile plan={plan} frame={frame} width={W} height={H} paper={paper} label={`Side view: the brush writing ${glyph.char}`} />
      </div>
    </div>
    <svg viewBox={`0 0 ${cw} ${ch}`} role="img" aria-label="Brush lean and ferrule height over time" style={{ width: "100%", maxWidth: 1280, background: "#FFFFFF", borderRadius: 6 }}>
      {contactBands.map((b, i) => <rect key={i} x={x(b.from)} y={0} width={Math.max(1, x(b.to) - x(b.from))} height={ch} fill="#F1E9DD" />)}
      <path d={path("lean", 2.2, 140)} fill="none" stroke="#9A3B24" strokeWidth={2} />
      <path d={path("height", 55, 140)} fill="none" stroke="#2F4F6B" strokeWidth={2} />
      <line x1={x(frame)} x2={x(frame)} y1={0} y2={ch} stroke="#25211D" strokeWidth={1.5} />
    </svg>
    <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 12.5, alignItems: "center" }}>
      <span><span style={{ color: "#9A3B24", fontWeight: 700 }}>━</span> handle lean from vertical</span>
      <span><span style={{ color: "#2F4F6B", fontWeight: 700 }}>━</span> ferrule height (tuft lengths)</span>
      <span style={{ background: "#F1E9DD", padding: "0 6px" }}>brush on the paper</span>
      <span aria-live="polite" style={{ fontWeight: 600 }}>
        {SHODO_PHASE_LABEL[pose.phase] ?? pose.phase}{pose.technique ? <> — {SHODO_TECH_LABEL[pose.technique] ?? pose.technique}</> : null}
        {" · "}lean {Math.hypot(pose.leanX, pose.leanY).toFixed(0)}° · press {(pose.p * 100).toFixed(0)}%
      </span>
      <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 600 }}>直筆
        <input type="range" min={0} max={1} step={.01} value={side} onChange={e => setSide(Number(e.target.value))} aria-label="Upright to side brush" />側筆</label>
    </div>
    <ShodoTransport frame={frame} last={last} playing={playing} onPlaying={setPlaying} onFrame={setFrame} />
  </div>;
}
