import { useEffect, useMemo, useRef, useState } from "react";
import { compileFilm } from "../../registry/video/film-document";
import type { FilmDocument } from "../../registry/video/film-document";
import { FilmStage } from "../../registry/video/film-stage";
import { VIDEO_PLATFORM_PRESETS } from "../../registry/video/platform-presets";
import type { VideoPlatformPresetId } from "../../registry/video/platform-presets";
import { VideoExportStage } from "../../registry/video/video-export-stage";
import type { VideoExportManifest } from "../../registry/video/video-export-stage";
import { renderShodoSlot, shodoWritingFrames } from "../../registry/video/shodo/shodo-film-slot";
import { SHODO_KANJIVG_CREDIT, loadShodoGlyph } from "../../registry/video/shodo/shodo-glyph-source";
import type { CSSProperties } from "react";
import { SHODO_GLYPHS } from "../../registry/video/shodo/shodo-glyphs";
import type { ShodoGlyph } from "../../registry/video/shodo/shodo-glyphs";
import { planShodoWriting, shodoBrushPose } from "../../registry/video/shodo/shodo-hand";
import { ShodoInkSurface } from "../../registry/video/shodo/shodo-ink";
import { kenteiSheet } from "../../registry/video/shodo/shodo-paper";
import { SHODO_KANKA_RULES, shodoKankaRulesFor } from "../../registry/video/shodo/shodo-structure";
import { ShodoBrushProfile, ShodoCanvas } from "../../registry/video/shodo/shodo-react";
import { shodoFerruleHeight } from "../../registry/video/shodo/shodo-brush";
import { SHODO_INKS, inspectShodoStyle, resolveShodoStyle } from "../../registry/video/shodo/shodo-style";
import type { DeepPartial, ShodoStyle } from "../../registry/video/shodo/shodo-style";
import { SHODO_BASICS, auditShodoTechniques, shodoStepLabel } from "../../registry/video/shodo/shodo-techniques";
import { SHODO_FPS, SHODO_PHASE_LABEL, SHODO_TECH_LABEL, ShodoTransport, useShodoGlyphs, useShodoPlayback, useShodoTeachers, shodoTeacherLabels } from "./shodo-studio";
import { ShodoKanjiCard } from "../../registry/video/shodo/shodo-kanji-card";
import type { ShodoKanjiCardProps } from "../../registry/video/shodo/shodo-kanji-card";
import {
  DEFAULT_KANJI_CARD_LABELS, DEFAULT_KANJI_CARD_THEME, KANJI_CARD_FPS, KANJI_CARD_JLPT_LEVELS, kanjiCardPhaseAt, kanjiCardSections, kanjiCardThemeIssues,
  kanjiCardTimeline, kanjiCardWriting,
} from "../../registry/video/shodo/shodo-kanji-card-plan";
import type {
  JlptLevel, KanjiCardContent, KanjiCardDensity, KanjiCardInk, KanjiCardIntro, KanjiCardPhase, KanjiCardSafeInset, KanjiCardSection, KanjiCardTiming,
  KanjiCardWord, KanjiWordHighlight,
} from "../../registry/video/shodo/shodo-kanji-card-plan";

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
  const { frame, position, setFrame, playing, setPlaying } = useShodoPlayback(last, plan);
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
      <ShodoCanvas plan={plan} frame={position} width={W} height={H} paper={paper} sheet={sheet} paperweight="none"
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
// The card is the registry item `shodo-kanji-card` (frame-addressed: the host gives the glyph and
// the frame). This file adds the 道 sample data, a player with its own clock and the export mode
// of the stories.

export type {
  JlptLevel, KanjiCardContent, KanjiCardDensity, KanjiCardInk, KanjiCardIntro, KanjiCardLayout, KanjiCardPhase, KanjiCardSafeInset,
  KanjiCardSection, KanjiCardTiming, KanjiCardWord, KanjiWordHighlight,
} from "../../registry/video/shodo/shodo-kanji-card-plan";

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
  "道": { meanings: "WAY / PATH / ROAD", onyomi: "DŌ (ドウ)", kunyomi: "michi (みち)", jlpt: "N4", words: MICHI_WORDS },
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

/**
 * Fills the card fields that the host left unset from `data` (for example a kanji dataset).
 * A field is unset when it is undefined or empty, or when a text or the words are still the
 * 道 sample. Fields that the host set win, and `jlpt: null` (no badge) also wins.
 */
export function fillKanjiCardContent(typed: KanjiCardContent, data: KanjiCardContent | undefined): KanjiCardContent {
  if (!data) return typed;
  const sample = KANJI_CARD_SAMPLES["道"] ?? {};
  const pick = <K extends "meanings" | "onyomi" | "kunyomi" | "jlpt" | "words">(key: K): KanjiCardContent[K] => {
    const value = typed[key];
    const unset = value === undefined || value === "" || (Array.isArray(value) && value.length === 0)
      || (key !== "jlpt" && JSON.stringify(value) === JSON.stringify(sample[key]));
    return !unset || data[key] === undefined ? value : data[key];
  };
  return { ...typed, meanings: pick("meanings"), onyomi: pick("onyomi"), kunyomi: pick("kunyomi"), jlpt: pick("jlpt"), words: pick("words") };
}

const KANJI_PHASE_TEXT: Record<KanjiCardPhase, string> = {
  intro: "0 · Intro: the character is typed",
  write: "1 · Write: the brush writes the character",
  review: "2 · Review: the brush writes it again",
  info: "3 · Info: the finished card holds",
};

export interface ShodoKanjiCardPlayerProps extends Omit<ShodoKanjiCardProps, "char" | "glyph" | "frame"> {
  /** The character to write. Default: 道, which also has sample card data. */
  char?: string;
}

/**
 * The kanji card with its own clock: it loads the strokes from KanjiVG, plays from the start
 * whenever the plan changes and has a transport. Other characters than 道 show only the data
 * that the host gives; the card never invents a reading or a level.
 */
export function ShodoKanjiCardPlayer({ char = "道", style, ...props }: ShodoKanjiCardPlayerProps) {
  const content = resolveKanjiCardContent(char, props);
  const chars = useMemo(() => [char], [char]);
  const loaded = useShodoGlyphs(chars, "kanjivg");
  const glyph = loaded ? loaded.glyphs[0] ?? SHODO_GLYPHS[char] : undefined;
  const show = kanjiCardSections(props.sections);
  const layout = props.layout ?? "landscape";
  const timingKey = [props.timing?.intro, props.timing?.write, props.timing?.review, props.timing?.info].map(String).join(",");
  const insetKey = JSON.stringify(props.safeInset ?? {});
  const vermilionKey = (content.vermilionStrokes ?? []).join(",");
  const contentKey = JSON.stringify([content.meanings, content.onyomi, content.kunyomi, content.jlpt, content.words?.length, props.sections, props.brushStyle]);
  const writing = useMemo(() => glyph ? kanjiCardWriting(glyph, {
    layout, density: props.density, safeInset: props.safeInset, content, sections: props.sections, brushStyle: props.brushStyle,
    timing: props.timing, ink: props.ink, speed: props.speed, vermilionStrokes: content.vermilionStrokes,
  }) : null, [glyph, layout, props.density, insetKey, timingKey, props.ink, props.speed, vermilionKey, show.label, contentKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const last = writing ? writing.timeline.frames - 1 : 0;
  const { frame, position, setFrame, playing, setPlaying } = useShodoPlayback(last, writing?.plan ?? null);
  if (!loaded) return <div style={page}>Loading strokes…</div>;
  if (!glyph || !writing) return <div role="alert" style={page}>No stroke data for {char}.</div>;
  const at = kanjiCardPhaseAt(writing.timeline, Math.min(position, last));
  const portrait = layout === "portrait";
  return <div style={page}>
    <ShodoKanjiCard {...props} {...content} char={char} glyph={glyph} frame={Math.min(position, last)} style={{
      maxWidth: portrait ? "min(100%, calc((100dvh - 190px) * 720 / 1280))" : 1280, borderRadius: 6, boxShadow: "0 14px 40px rgba(40,30,20,.18)", ...style,
    }} />
    <ShodoTransport frame={frame} last={last} playing={playing} onPlaying={setPlaying} onFrame={setFrame} />
    <div aria-live="polite" style={{ fontWeight: 600, minHeight: 22 }}>
      {KANJI_PHASE_TEXT[at.phase]}{at.phase === "review" && props.strokeNumbers !== false ? ", with the order number of each stroke" : ""}
    </div>
    {glyph.source === "kanjivg" ? <p style={{ margin: 0, fontSize: 12.5 }}>{SHODO_KANJIVG_CREDIT}.</p> : null}
  </div>;
}

// ── Video export of the kanji card ─────────────────────────────────────────────────

/** A kanji card video for export: the card's props with all phase times, and the output size. */
export interface KanjiCardExport {
  props: Omit<ShodoKanjiCardProps, "glyph" | "frame"> & { timing: Required<Pick<KanjiCardTiming, "write" | "review" | "info">> & Pick<KanjiCardTiming, "intro"> };
  /** Output size in pixels. */
  width: number;
  height: number;
  /** The platform preset the video is made for, when one is named. */
  preset?: VideoPlatformPresetId;
}

/**
 * Reads the description of a kanji card video (for example JSON from a production tool) and
 * lists every problem by path. The write, review and info times are required (the intro is
 * optional), so the length of the video is known before the strokes load. Text fields are
 * limited in length; unknown fields are ignored. The output is 1080 × 1920 (portrait) or
 * 1920 × 1080 (landscape) unless `width` is set; a `preset` fixes the size and gives its safe
 * bands unless `safeInset` is set.
 */
export function readKanjiCardExport(json: unknown): { value: KanjiCardExport; errors: [] } | { value: null; errors: string[] } {
  const errors: string[] = [];
  const o = json && typeof json === "object" && !Array.isArray(json) ? json as Record<string, unknown> : null;
  if (!o) return { value: null, errors: ["The description must be a JSON object."] };
  const text = (key: string, max: number, required = false): string | undefined => {
    const v = o[key];
    if (v === undefined && !required) return undefined;
    if (typeof v !== "string" || !v.trim() || v.length > max) { errors.push(`${key}: a text of 1 to ${max} characters is required.`); return undefined; }
    return v;
  };
  const num = (v: unknown, path: string, min: number, max: number): number => {
    if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max) { errors.push(`${path}: a number from ${min} to ${max} is required.`); return min; }
    return v;
  };
  const char = text("char", 8, true);
  const chars = char ? [...char.trim()] : [];
  if (char && chars.length !== 1) errors.push("char: exactly one character is required.");
  const layout = o.layout === undefined ? "portrait" : o.layout;
  if (layout !== "portrait" && layout !== "landscape") errors.push('layout: "portrait" or "landscape" is required.');
  const density = o.density === undefined ? undefined : o.density;
  if (density !== undefined && density !== "regular" && density !== "compact") errors.push('density: "regular" or "compact" is required.');
  const t = o.timing && typeof o.timing === "object" ? o.timing as Record<string, unknown> : null;
  if (!t) errors.push("timing: { write, review, info } in seconds is required.");
  const timing = {
    ...(t?.intro === undefined ? {} : { intro: num(t.intro, "timing.intro", 0, 60) }),
    write: num(t?.write, "timing.write", 0, 600), review: num(t?.review, "timing.review", 0, 600), info: num(t?.info, "timing.info", 0, 600),
  };
  if (t && (timing.intro ?? 0) + timing.write + timing.review + timing.info <= 0) errors.push("timing: the video needs a length above 0 s.");
  let intro: KanjiCardIntro | undefined;
  const introSeconds = Math.round((timing.intro ?? 0) * KANJI_CARD_FPS) / KANJI_CARD_FPS;
  if (o.intro !== undefined) {
    const x = o.intro && typeof o.intro === "object" && !Array.isArray(o.intro) ? o.intro as Record<string, unknown> : null;
    if (!x) errors.push("intro: { reading?, convertAt?, emphasizeAt?, typeStep? } is required.");
    else {
      if (x.reading !== undefined && (typeof x.reading !== "string" || !x.reading.trim() || x.reading.length > 12)) errors.push("intro.reading: a text of 1 to 12 characters is required.");
      if (x.typeStep !== undefined) num(x.typeStep, "intro.typeStep", .05, .6);
      intro = {
        ...(typeof x.reading === "string" ? { reading: x.reading } : {}),
        ...(typeof x.typeStep === "number" ? { typeStep: x.typeStep } : {}),
        // Against the intro the card plays (whole frames). The conversion must leave time to show the
        // character before the brush comes (0.32 s).
        ...(x.convertAt === undefined ? {} : { convertAt: num(x.convertAt, "intro.convertAt", 0, Math.max(0, Math.round((introSeconds - .32) * 1000) / 1000)) }),
        ...(x.emphasizeAt === undefined ? {} : { emphasizeAt: num(x.emphasizeAt, "intro.emphasizeAt", 0, introSeconds) }),
      };
    }
  }
  const phases = ["intro", "write", "review", "info"];
  if (o.cardFrom !== undefined && !phases.includes(o.cardFrom as string)) errors.push('cardFrom: "intro", "write", "review" or "info" is required.');
  let jlpt: JlptLevel | null | undefined;
  if (o.jlpt === null) jlpt = null;
  else if (o.jlpt !== undefined) {
    if (typeof o.jlpt === "string" && (KANJI_CARD_JLPT_LEVELS as readonly string[]).includes(o.jlpt)) jlpt = o.jlpt as JlptLevel;
    else errors.push('jlpt: "N5" to "N1", or null, is required.');
  }
  let words: KanjiCardWord[] | undefined;
  if (o.words !== undefined) {
    if (!Array.isArray(o.words) || o.words.length > 6) errors.push("words: a list of up to 6 words is required.");
    else words = o.words.map((w, i) => {
      const x = w && typeof w === "object" ? w as Record<string, unknown> : {};
      const field = (k: string) => {
        const v = x[k];
        if (typeof v !== "string" || !v.trim() || v.length > 60) { errors.push(`words[${i}].${k}: a text of 1 to 60 characters is required.`); return ""; }
        return v;
      };
      return { word: field("word"), ruby: field("ruby"), romaji: field("romaji"), meaning: field("meaning") };
    });
  }
  let cues: KanjiWordHighlight[] | undefined;
  if (o.wordHighlights !== undefined) {
    if (!Array.isArray(o.wordHighlights) || o.wordHighlights.length > 50) errors.push("wordHighlights: a list of up to 50 cues is required.");
    else cues = o.wordHighlights.map((c, i) => {
      const x = c && typeof c === "object" ? c as Record<string, unknown> : {};
      const word = num(x.word, `wordHighlights[${i}].word`, 0, (words?.length ?? 1) - 1);
      if (!Number.isInteger(word)) errors.push(`wordHighlights[${i}].word: a whole number is required.`);
      const at = num(x.at, `wordHighlights[${i}].at`, 0, 1800);
      return x.hold === undefined ? { word, at } : { word, at, hold: num(x.hold, `wordHighlights[${i}].hold`, .05, 60) };
    });
  }
  let preset: VideoPlatformPresetId | undefined;
  const presetInfo = o.preset === undefined ? undefined : VIDEO_PLATFORM_PRESETS.find(p => p.id === o.preset);
  if (o.preset !== undefined && !presetInfo) errors.push("preset: a known video platform preset is required.");
  else if (presetInfo) preset = presetInfo.id;
  let safeInset: KanjiCardSafeInset | undefined;
  if (o.safeInset !== undefined) {
    const x = o.safeInset && typeof o.safeInset === "object" ? o.safeInset as Record<string, unknown> : {};
    safeInset = { left: num(x.left, "safeInset.left", 0, .4), right: num(x.right, "safeInset.right", 0, .4), top: num(x.top, "safeInset.top", 0, .4), bottom: num(x.bottom, "safeInset.bottom", 0, .4) };
  } else if (presetInfo) safeInset = presetInfo.safeInset;
  const portrait = layout !== "landscape";
  let width = portrait ? 1080 : 1920, height = portrait ? 1920 : 1080;
  if (presetInfo) {
    ({ width, height } = presetInfo);
    if ((presetInfo.height > presetInfo.width) !== portrait || presetInfo.width * 9 !== presetInfo.height * 16 && presetInfo.width * 16 !== presetInfo.height * 9)
      errors.push(`preset: ${presetInfo.id} (${presetInfo.width} × ${presetInfo.height}) does not fit the ${portrait ? "9:16" : "16:9"} card.`);
  } else if (o.width !== undefined) {
    // The export stage needs even sides of at most 7680 × 4320: 9:16 widths are multiples of 18 up to 2430,
    // 16:9 widths multiples of 32 up to 7680.
    width = num(o.width, "width", 360, portrait ? 2430 : 7680);
    height = portrait ? width * 16 / 9 : width * 9 / 16;
    if (!Number.isInteger(width) || width % (portrait ? 18 : 32) !== 0)
      errors.push(`width: a whole number of pixels divisible by ${portrait ? 18 : 32} is required, so both sides are even.`);
  }
  const bool = (key: string): boolean | undefined => {
    if (o[key] === undefined) return undefined;
    if (typeof o[key] !== "boolean") { errors.push(`${key}: true or false is required.`); return undefined; }
    return o[key] as boolean;
  };
  const ink = o.ink === undefined ? undefined : o.ink;
  if (ink !== undefined && ink !== "sumi" && ink !== "vermilion") errors.push('ink: "sumi" or "vermilion" is required.');
  let vermilionStrokes: number[] | undefined;
  if (o.vermilionStrokes !== undefined) {
    if (!Array.isArray(o.vermilionStrokes) || o.vermilionStrokes.length > 64 || o.vermilionStrokes.some(n => !Number.isInteger(n) || (n as number) < 1 || (n as number) > 64))
      errors.push("vermilionStrokes: stroke numbers from 1 are required.");
    else vermilionStrokes = o.vermilionStrokes as number[];
  }
  const speed = o.speed === undefined ? undefined : num(o.speed, "speed", .25, 4);
  const strings = (key: string, keys: readonly string[], max: number): Record<string, string> | undefined => {
    if (o[key] === undefined) return undefined;
    const x = o[key] && typeof o[key] === "object" && !Array.isArray(o[key]) ? o[key] as Record<string, unknown> : null;
    if (!x || Object.entries(x).some(([k, v]) => !keys.includes(k) || typeof v !== "string" || !v.trim() || v.length > max)) {
      errors.push(`${key}: { ${keys.join(", ")} } as texts of at most ${max} characters is required.`);
      return undefined;
    }
    return x as Record<string, string>;
  };
  const labels = strings("labels", Object.keys(DEFAULT_KANJI_CARD_LABELS), 80);
  const theme = strings("theme", Object.keys(DEFAULT_KANJI_CARD_THEME), 200);
  if (theme) for (const issue of kanjiCardThemeIssues(theme)) errors.push(`theme.${issue}.`);
  // The brush, ink, paper and hand: checked as the planner will use them, so an export never draws other strokes than a host planned.
  let brushStyle: DeepPartial<ShodoStyle> | undefined;
  if (o.brushStyle !== undefined) {
    if (!o.brushStyle || typeof o.brushStyle !== "object" || Array.isArray(o.brushStyle)) errors.push("brushStyle: an object of brush, ink, paper and hand settings is required.");
    else {
      brushStyle = o.brushStyle as DeepPartial<ShodoStyle>;
      for (const issue of inspectShodoStyle(resolveShodoStyle(brushStyle))) errors.push(`brushStyle${issue.path.replace(/\//gu, ".")}: ${issue.message}`);
    }
  }
  let sections: Partial<Record<KanjiCardSection, boolean>> | undefined;
  if (o.sections !== undefined) {
    const x = o.sections && typeof o.sections === "object" && !Array.isArray(o.sections) ? o.sections as Record<string, unknown> : null;
    const keys: readonly KanjiCardSection[] = ["label", "meanings", "readings", "jlpt", "words"];
    if (!x || Object.entries(x).some(([k, v]) => !keys.includes(k as KanjiCardSection) || typeof v !== "boolean"))
      errors.push("sections: { label, meanings, readings, jlpt, words } as true or false is required.");
    else sections = x as Partial<Record<KanjiCardSection, boolean>>;
  }
  const props: KanjiCardExport["props"] = {
    char: chars[0] ?? "", layout: portrait ? "portrait" : "landscape", timing,
    density: density as KanjiCardDensity | undefined, intro, cardFrom: o.cardFrom as KanjiCardPhase | undefined,
    heading: text("heading", 40), meanings: text("meanings", 120), onyomi: text("onyomi", 120), kunyomi: text("kunyomi", 120),
    jlpt, words, wordHighlights: cues, safeInset, ink: ink as KanjiCardInk | undefined, vermilionStrokes, speed, sections, labels, theme, brushStyle,
    strokeNumbers: bool("strokeNumbers"),
    // An export is the same on every machine: the motion does not follow the viewer's setting.
    reducedMotion: bool("reducedMotion") ?? false,
  };
  for (const key of Object.keys(props) as (keyof typeof props)[]) if (props[key] === undefined) delete props[key];
  return errors.length ? { value: null, errors } : { value: { props, width, height, preset }, errors: [] };
}

const nextPaint = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

/**
 * The kanji card as a Kumiki video export (`window.__kmVideoExport`): the card at the output
 * size, driven frame by frame. A frame is ready when the strokes have loaded, the brush canvas
 * reports ready and the card shows that frame. Fails visibly when the strokes cannot load.
 */
export function ShodoKanjiCardExport({ video }: { video: KanjiCardExport }) {
  const { props, width, height, preset } = video;
  const [frame, setFrame] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  // KanjiVG only, never a bundled stand-in: a host that planned from KanjiVG must get the same strokes.
  const [loaded, setLoaded] = useState<{ glyph: ShodoGlyph | null; error: string | null } | null>(null);
  useEffect(() => {
    let live = true;
    loadShodoGlyph(props.char, { preferBundled: false })
      .then(glyph => { if (live) setLoaded({ glyph, error: null }); })
      .catch((error: unknown) => { if (live) setLoaded({ glyph: null, error: error instanceof Error ? error.message : String(error) }); });
    return () => { live = false; };
  }, [props.char]);
  const glyph = loaded?.glyph ?? undefined;
  const timeline = kanjiCardTimeline(0, props.timing);
  const manifest = useMemo<VideoExportManifest>(() => ({
    schemaVersion: 1, id: `shodo-kanji-card-${props.char.codePointAt(0)?.toString(16) ?? "x"}`,
    durationFrames: timeline.frames, width, height, fps: { num: KANJI_CARD_FPS, den: 1 }, ...(preset ? { preset } : {}),
  }), [props.char, timeline.frames, width, height, preset]);
  const prepareFrame = async (target: number) => {
    const start = performance.now();
    for (;;) {
      const el = root.current;
      const failed = el?.querySelector("[data-km-kanji-card-status=error]");
      if (failed) throw new Error(failed.textContent || `No stroke data for ${props.char}.`);
      const card = el?.querySelector<HTMLElement>("[data-km-kanji-card]");
      if (card?.dataset.kmKanjiFrame === String(target) && el?.querySelector("[data-km-shodo-ready=true]")) return;
      if (performance.now() - start > 30000) throw new Error(`The kanji card did not reach frame ${target}.`);
      await nextPaint();
    }
  };
  const pixelRatio = width / (props.layout === "landscape" ? 1280 : 720);
  return <div ref={root}>
    <VideoExportStage manifest={manifest} frame={frame} onSeek={setFrame} prepareFrame={prepareFrame}>
      {glyph ? <ShodoKanjiCard {...props} glyph={glyph} frame={frame} pixelRatio={pixelRatio} />
        : loaded ? <div role="alert" data-km-kanji-card-status="error">{loaded.error ?? `No stroke data for ${props.char}.`}</div>
        : <div data-km-kanji-card-status="loading">Loading strokes…</div>}
    </VideoExportStage>
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
  const { frame, position, setFrame, playing, setPlaying } = useShodoPlayback(last, plan);
  const pose = shodoBrushPose(plan, frame / SHODO_FPS);
  return <div style={page}>
    <div style={frameBox}>
      <ShodoCanvas plan={plan} frame={position} width={W} height={H} paper={paper} sheet={null} paperweight="none"
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
  const { frame, position, setFrame, playing, setPlaying } = useShodoPlayback(last, plan);
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
      {plan ? <ShodoCanvas plan={plan} frame={position} width={width} height={height} paper={paper} sheet={sheet} underlay="none"
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
  const { frame, position, setFrame, playing, setPlaying } = useShodoPlayback(last, plan);
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
        <ShodoCanvas plan={plan} frame={position} width={W} height={H} paper={paper} sheet={kenteiSheet(paper.width, paper.height)}
          paperweight="none" label={`Top view: the brush writing ${glyph.char}`} />
      </div>
      <div style={{ ...frameBox }}>
        <ShodoBrushProfile plan={plan} frame={position} width={W} height={H} paper={paper} label={`Side view: the brush writing ${glyph.char}`} />
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
