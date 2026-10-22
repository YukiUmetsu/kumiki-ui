/** Word/segment timing from any aligner, ASR or TTS engine, normalized to one neutral shape.
 * Parsers are plain functions: pass a built-in one from `ALIGNMENT_PARSERS` or your own
 * `(input, options) => AudioAlignment`. Nothing is estimated: words the source could not
 * time are kept in `unaligned`, never given invented times.
 */
import type { Diagnostic } from "../motion/types";

export interface AlignedWord {
  text: string;
  /** Seconds from the start of the audio track. */
  start: number;
  end: number;
  confidence?: number;
  speaker?: string;
}
export interface AlignedSegment { text: string; start: number; end: number; speaker?: string }
export interface AudioAlignment {
  id: string;
  source: "forced-alignment" | "asr" | "tts" | "manual" | "subtitle";
  reference?: string;
  language?: string;
  words: AlignedWord[];
  segments: AlignedSegment[];
  /** Text the source returned without times, positioned after word index `afterWord` (-1 = before the first). */
  unaligned: { text: string; reason: string; afterWord: number }[];
}
export interface AlignmentParseOptions { id: string; language?: string; reference?: string }
export type AlignmentParser = (input: unknown, options: AlignmentParseOptions) => AudioAlignment;

type Json = Record<string, unknown>;
const obj = (v: unknown): Json => (v && typeof v === "object" ? v as Json : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const num = (v: unknown): number | undefined => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : undefined;
};
const str = (v: unknown) => (typeof v === "string" ? v : "");
const parseJson = (input: unknown): unknown => (typeof input === "string" ? JSON.parse(input) : input);
const base = (options: AlignmentParseOptions, source: AudioAlignment["source"]): AudioAlignment =>
  ({ id: options.id, source, reference: options.reference, language: options.language, words: [], segments: [], unaligned: [] });
function pushWord(out: AudioAlignment, text: string, start: unknown, end: unknown, extra: Partial<AlignedWord> = {}, reason = "no timing") {
  const t = text.trim(), s = num(start), e = num(end);
  if (!t) return;
  if (s === undefined || e === undefined) out.unaligned.push({ text: t, reason, afterWord: out.words.length - 1 });
  else out.words.push({ text: t, start: s, end: e, ...extra });
}

/** Neutral JSON: `{ timebase?, source?, words: [{ text, start, end, confidence?, speaker? }], segments? }`.
 * `timebase.unit` is `s` (default), `ms`, `frames` (with `fps: { num, den }`) or `samples` (with `sampleRate`). */
const neutral: AlignmentParser = (input, options) => {
  const data = obj(parseJson(input)), tb = obj(data.timebase), unit = str(tb.unit) || "s";
  const fps = obj(tb.fps), rate = unit === "ms" ? 1000 : unit === "frames" ? (num(fps.num) ?? NaN) / (num(fps.den) ?? 1) : unit === "samples" ? num(tb.sampleRate) ?? NaN : 1;
  if (!Number.isFinite(rate) || rate <= 0) throw new Error(`Neutral alignment timebase "${unit}" needs ${unit === "frames" ? "fps" : "sampleRate"}.`);
  const out = base(options, (str(data.source) as AudioAlignment["source"]) || "manual");
  const t = (v: unknown) => { const n = num(v); return n === undefined ? undefined : n / rate; };
  for (const w of arr(data.words).map(obj)) pushWord(out, str(w.text), t(w.start), t(w.end), { confidence: num(w.confidence), speaker: str(w.speaker) || undefined });
  for (const s of arr(data.segments).map(obj)) { const a = t(s.start), b = t(s.end); if (a !== undefined && b !== undefined) out.segments.push({ text: str(s.text).trim(), start: a, end: b, speaker: str(s.speaker) || undefined }); }
  return out;
};
/** OpenAI / openai-whisper `verbose_json`: top-level `words` and/or `segments[].words` (`word`, `start`, `end`, `probability`). */
const whisper: AlignmentParser = (input, options) => {
  const data = obj(parseJson(input)), out = base(options, "asr");
  out.language ??= str(data.language) || undefined;
  const segments = arr(data.segments).map(obj);
  for (const s of segments) out.segments.push({ text: str(s.text).trim(), start: num(s.start) ?? 0, end: num(s.end) ?? 0 });
  const words = arr(data.words).length ? arr(data.words) : segments.flatMap(s => arr(s.words));
  for (const w of words.map(obj)) pushWord(out, str(w.word), w.start, w.end, { confidence: num(w.probability) });
  return out;
};
/** WhisperX: `segments[].words[]` (`word`, `start`, `end`, `score`, `speaker`); untimed tokens (often numerals) are reported. */
const whisperx: AlignmentParser = (input, options) => {
  const data = obj(parseJson(input)), out = base(options, "forced-alignment");
  for (const s of arr(data.segments).map(obj)) {
    out.segments.push({ text: str(s.text).trim(), start: num(s.start) ?? 0, end: num(s.end) ?? 0, speaker: str(s.speaker) || undefined });
    for (const w of arr(s.words).map(obj)) pushWord(out, str(w.word), w.start, w.end, { confidence: num(w.score), speaker: str(w.speaker) || str(s.speaker) || undefined }, "WhisperX left this token unaligned");
  }
  return out;
};
/** Gentle: `words[]` with `case: "success"` are timed; `not-found-in-audio` words are reported. */
const gentle: AlignmentParser = (input, options) => {
  const data = obj(parseJson(input)), out = base(options, "forced-alignment");
  for (const w of arr(data.words).map(obj)) {
    if (str(w.case) === "success") pushWord(out, str(w.word), w.start, w.end);
    else out.unaligned.push({ text: str(w.word), reason: `Gentle: ${str(w.case) || "not aligned"}`, afterWord: out.words.length - 1 });
  }
  return out;
};
/** aeneas sync map: `fragments[]` with string `begin`/`end` and `lines[]` (segment level only). */
const aeneas: AlignmentParser = (input, options) => {
  const data = obj(parseJson(input)), out = base(options, "forced-alignment");
  for (const f of arr(data.fragments).map(obj)) {
    const text = arr(f.lines).map(str).join(" ").trim(), start = num(f.begin), end = num(f.end);
    if (text && start !== undefined && end !== undefined) out.segments.push({ text, start, end });
  }
  return out;
};
/** Praat TextGrid (long format), as written by Montreal Forced Aligner. Reads the `words` tier (or `tier` option). */
export function textGridParser(tier = "words"): AlignmentParser {
  return (input, options) => {
    const text = String(input), out = base(options, "forced-alignment");
    const items = text.split(/item\s*\[\d+\]\s*:/).slice(1);
    const chosen = items.find(item => new RegExp(`name\\s*=\\s*"${tier}"`).test(item));
    if (!chosen) throw new Error(`TextGrid has no "${tier}" tier.`);
    for (const m of chosen.matchAll(/xmin\s*=\s*([\d.eE+-]+)\s*xmax\s*=\s*([\d.eE+-]+)\s*text\s*=\s*"((?:[^"]|"")*)"/g)) {
      const word = m[3].replace(/""/g, '"').trim();
      if (word) pushWord(out, word, m[1], m[2]);
    }
    return out;
  };
}
const clock = (v: string) => {
  const m = v.trim().match(/^(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})$/);
  if (!m) return undefined;
  return (Number(m[1] ?? 0) * 3600) + Number(m[2]) * 60 + Number(m[3]) + Number(m[4].padEnd(3, "0")) / 1000;
};
/** SRT or WebVTT subtitles: segment timing only (no words). */
const subtitles: AlignmentParser = (input, options) => {
  const out = base(options, "subtitle");
  for (const block of String(input).replace(/\r/g, "").split(/\n{2,}/)) {
    const lines = block.split("\n"), i = lines.findIndex(l => l.includes("-->"));
    if (i < 0) continue;
    const [a, b] = lines[i].split("-->").map(part => clock(part.trim().split(/\s+/)[0]));
    const text = lines.slice(i + 1).join(" ").replace(/<[^>]+>/g, "").trim();
    if (text && a !== undefined && b !== undefined) out.segments.push({ text, start: a, end: b });
  }
  return out;
};
/** Character-level TTS alignment (e.g. ElevenLabs `alignment` / `normalized_alignment`), grouped into words on whitespace. */
const characterTimings: AlignmentParser = (input, options) => {
  const raw = obj(parseJson(input)), data = obj(raw.alignment ?? raw.normalized_alignment ?? raw), out = base(options, "tts");
  const chars = arr(data.characters).map(str), starts = arr(data.character_start_times_seconds), ends = arr(data.character_end_times_seconds);
  let word = "", start: number | undefined, end: number | undefined;
  const flush = () => { if (word.trim()) pushWord(out, word, start, end); word = ""; start = end = undefined; };
  chars.forEach((c, i) => {
    if (/\s/.test(c)) { flush(); return; }
    word += c; start ??= num(starts[i]); end = num(ends[i]) ?? end;
  });
  flush();
  return out;
};

export const ALIGNMENT_PARSERS = {
  neutral, whisper, whisperx, gentle, aeneas,
  textgrid: textGridParser(), srt: subtitles, webvtt: subtitles, characterTimings,
} satisfies Record<string, AlignmentParser>;

/** Parse with any parser and validate the result. Throws only for unreadable input. */
export function parseAlignment(input: unknown, parser: AlignmentParser, options: AlignmentParseOptions): { alignment: AudioAlignment; diagnostics: Diagnostic[] } {
  const alignment = parser(input, options);
  const diagnostics: Diagnostic[] = [];
  const check = (list: { text: string; start: number; end: number }[], kind: string) => list.forEach((item, i) => {
    if (!(item.end > item.start) || item.start < 0) diagnostics.push({ code: "alignment-time-invalid", severity: "error", path: `${kind}[${i}]`, message: `${kind} "${item.text}" has start ${item.start} and end ${item.end}.` });
    else if (i > 0 && item.start < list[i - 1].start) diagnostics.push({ code: "alignment-out-of-order", severity: "error", path: `${kind}[${i}]`, message: `${kind} "${item.text}" starts before the previous one.` });
  });
  check(alignment.words, "word"); check(alignment.segments, "segment");
  for (const item of alignment.unaligned) diagnostics.push({ code: "alignment-unaligned", severity: "warning", message: `"${item.text}" has no timing (${item.reason}).` });
  if (!alignment.words.length && !alignment.segments.length) diagnostics.push({ code: "alignment-empty", severity: "error", message: `Alignment "${alignment.id}" contains no timed words or segments.` });
  return { alignment, diagnostics };
}
