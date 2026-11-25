/**
 * From timed phones to a mouth that moves: Japanese visemes with coarticulation. Pure data, no DOM.
 *
 * A `SpeechTrack` is made outside the browser (forced alignment of the recording) or estimated from the text. The mouth
 * never claims more than the track: `precision` says which it is.
 */
import { phonesOf } from "./japanese-text";
import type { RubyToken } from "./japanese-text";

export interface SpeechPhone { p: string; /** Seconds from the start of the recording. */ start: number; end: number; token: number; /** Loudness in this phone, 0..1 of the line's loudest. */ level?: number }
export interface SpeechTrack { seconds: number; precision: "aligned" | "estimated"; phones: readonly SpeechPhone[] }

/** A mouth shape by what can be seen of it. Every number is 0..1 except `wide` (−1 pursed, 0 at rest, 1 spread). */
export interface MouthShape { open: number; wide: number; round: number; press: number; teeth: number; tongue: number }
/** Painted mouths a character can have. `rest` is the only one that must exist. */
export const MOUTH_NAMES = ["rest", "a", "i", "u", "e", "o", "closed", "teeth", "n"] as const;
export type MouthName = (typeof MOUTH_NAMES)[number];

const shape = (open: number, wide: number, round = 0, press = 0, teeth = 0, tongue = 0): MouthShape => ({ open, wide, round, press, teeth, tongue });
export const MOUTH_SHAPES: Readonly<Record<MouthName, MouthShape>> = {
  rest: shape(0, 0), a: shape(1, 0.15, 0, 0, 0.5, 0.45), i: shape(0.26, 1, 0, 0, 0.9, 0.2), u: shape(0.22, -0.75, 0.8), e: shape(0.55, 0.6, 0, 0, 0.7, 0.35), o: shape(0.62, -0.6, 1),
  closed: shape(0, 0.02, 0, 1), teeth: shape(0.16, 0.3, 0, 0, 1), n: shape(0.3, 0.12, 0, 0, 0.5, 0.9),
};
const KEYS = ["open", "wide", "round", "press", "teeth", "tongue"] as const;
export const mixShape = (a: MouthShape, b: MouthShape, t: number): MouthShape => { const o = { ...a }; for (const k of KEYS) o[k] = a[k] + (b[k] - a[k]) * t; return o; };

const LABIAL = new Set(["m", "b", "p", "my", "by", "py"]), SIBILANT = new Set(["s", "z", "sh", "j", "ch", "ts"]), TONGUE = new Set(["t", "d", "n", "r", "ny", "ry", "ty", "dy"]), ROUND = new Set(["w", "f"]);
const vowelOf = (p: string | undefined): MouthName | null => (p && "aiueo".includes(p[0]) && (p.length === 1 || p[1] === ":") ? (p[0] as MouthName) : null);
/** Voiceless neighbours make い and う almost silent, so the mouth hardly opens for them. */
const VOICELESS = new Set(["k", "s", "t", "h", "p", "sh", "ch", "ts", "f", "ky", "hy", "py", "q"]);

export interface MouthKey { t: number; shape: MouthShape; name: MouthName; /** How far toward that painted mouth, 0..1. */ strength: number }

/** What ん looks like depends on what comes next: it is closed only before a lip sound. */
function nasal(next: string | undefined, before: MouthName | null): { name: MouthName; shape: MouthShape; strength: number } {
  if (next && LABIAL.has(next)) return { name: "closed", shape: MOUTH_SHAPES.closed, strength: 1 };
  if (next && (TONGUE.has(next) || SIBILANT.has(next))) return { name: "n", shape: MOUTH_SHAPES.n, strength: 0.7 };
  const from = MOUTH_SHAPES[before ?? "e"];
  // before k, g, a vowel or at the end: the mouth keeps what the vowel left it and half closes
  return { name: "n", shape: mixShape(MOUTH_SHAPES.rest, mixShape(from, MOUTH_SHAPES.n, 0.35), next ? 0.6 : 0.42), strength: next ? 0.6 : 0.42 };
}

/** The mouth of a whole line, as keys to move between. */
export function mouthKeys(track: SpeechTrack): MouthKey[] {
  const ph = track.phones, out: MouthKey[] = [], push = (t: number, name: MouthName, s: MouthShape, strength = 1) => out.push({ t, name, shape: s, strength });
  const nextVowel = (i: number): MouthName | null => { for (let j = i + 1; j < ph.length && j < i + 3; j++) { const v = vowelOf(ph[j].p); if (v) return v; if (ph[j].p === "sp") return null; } return null; };
  const lastVowel = (i: number): MouthName | null => { for (let j = i - 1; j >= 0; j--) { const v = vowelOf(ph[j].p); if (v) return v; if (ph[j].p === "sp") return null; } return null; };
  push(0, "rest", MOUTH_SHAPES.rest);
  if (ph.length && ph[0].start > 0.16) push(ph[0].start - 0.08, "rest", MOUTH_SHAPES.rest);
  ph.forEach((c, i) => {
    const d = c.end - c.start, mid = (c.start + c.end) / 2, next = ph[i + 1]?.p, prev = ph[i - 1]?.p, v = vowelOf(c.p);
    if (c.p === "sp") { if (d > 0.09) { push(Math.min(c.start + 0.1, mid), "rest", MOUTH_SHAPES.rest); push(Math.max(c.end - 0.07, mid), "rest", MOUTH_SHAPES.rest); } return; }
    if (v) {
      const silent = (v === "i" || v === "u") && prev !== undefined && VOICELESS.has(prev) && (next === undefined || next === "sp" || VOICELESS.has(next)) && d < 0.14;
      // louder is wider, and a vowel too short to be reached is not reached
      const reach = Math.min(1, 0.55 + d * 3.2) * (0.72 + 0.28 * (c.level ?? 1)) * (silent ? 0.45 : 1), s = mixShape(MOUTH_SHAPES.rest, MOUTH_SHAPES[v], reach);
      push(c.start + Math.min(0.055, d * 0.4), v, s, reach);
      if (d > 0.13) push(c.end - Math.min(0.06, d * 0.3), v, mixShape(MOUTH_SHAPES.rest, s, 0.9), reach * 0.9);
      return;
    }
    const after = nextVowel(i), around = mixShape(MOUTH_SHAPES[lastVowel(i) ?? "rest"], MOUTH_SHAPES[after ?? "rest"], lastVowel(i) ? 0.62 : 0.5);
    if (c.p === "N") { const n = nasal(next === "sp" ? undefined : next, lastVowel(i)); push(c.start + Math.min(0.07, d * 0.5), n.name, n.shape, n.strength); if (d > 0.12) push(c.end - 0.04, n.name, n.shape, n.strength); return; }
    if (c.p === "q") { const into = next && LABIAL.has(next) ? "closed" : next && SIBILANT.has(next) ? "teeth" : "n", s = into === "n" ? mixShape(MOUTH_SHAPES.rest, around, 0.45) : MOUTH_SHAPES[into]; push(mid, into, s, into === "n" ? 0.45 : into === "teeth" ? 0.8 : 1); return; }
    // lips meet just before the sound that needs them, and stay long enough to be seen
    if (LABIAL.has(c.p)) { push(Math.max(c.start, mid - 0.018), "closed", MOUTH_SHAPES.closed); if (d > 0.07) push(c.end - 0.02, "closed", MOUTH_SHAPES.closed); return; }
    if (SIBILANT.has(c.p)) { const to = MOUTH_SHAPES[after ?? "rest"]; push(mid, "teeth", mixShape(MOUTH_SHAPES.teeth, { ...MOUTH_SHAPES.teeth, wide: to.wide, round: to.round }, 0.6), 0.8); return; }
    if (ROUND.has(c.p)) { push(mid, "u", mixShape(MOUTH_SHAPES.u, around, 0.25), 0.75); return; }
    if (TONGUE.has(c.p)) { push(mid, "n", { ...mixShape(MOUTH_SHAPES.rest, around, 0.55), tongue: 0.9, teeth: 0.5 }, 0.6); return; }
    push(mid, after ?? "n", mixShape(MOUTH_SHAPES.rest, around, 0.62), 0.5);
  });
  const end = ph[ph.length - 1]?.end ?? 0;
  push(end + 0.12, "rest", MOUTH_SHAPES.rest);
  // keys in order, never two at one time; a lip closure always stays
  return out.sort((a, b) => a.t - b.t).filter((k, i, all) => i === 0 || k.t - all[i - 1].t > 0.012 || k.name === "closed");
}

export interface MouthState { shape: MouthShape; from: MouthName; to: MouthName; /** 0 is all `from`, 1 is all `to`. */ mix: number; fromStrength: number; toStrength: number }
export const MOUTH_REST: MouthState = { shape: MOUTH_SHAPES.rest, from: "rest", to: "rest", mix: 0, fromStrength: 1, toStrength: 1 };
const ease = (t: number) => t * t * (3 - 2 * t);

/** The mouth at a time of the line. */
export function mouthAt(keys: readonly MouthKey[], t: number): MouthState {
  if (!keys.length || t <= keys[0].t || t >= keys[keys.length - 1].t) return MOUTH_REST;
  let lo = 0, hi = keys.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (keys[m].t <= t) lo = m; else hi = m; }
  const a = keys[lo], b = keys[hi], u = ease(Math.min(1, Math.max(0, (t - a.t) / Math.max(1e-4, b.t - a.t))));
  return { shape: mixShape(a.shape, b.shape, u), from: a.name, to: b.name, mix: u, fromStrength: a.strength, toStrength: b.strength };
}

/** The token that is being said (for a subtitle that follows the voice), −1 before the first. */
export function spokenToken(track: SpeechTrack, t: number): number {
  let at = -1;
  for (const p of track.phones) if (p.p !== "sp" && p.start <= t) at = Math.max(at, p.token);
  return at;
}

/** A track from the text alone, for a line that has no aligned recording: time is shared by morae. */
export function estimateSpeech(tokens: readonly RubyToken[], seconds: number, o: { lead?: number; tail?: number } = {}): SpeechTrack {
  const specs = phonesOf(tokens), lead = o.lead ?? 0.12, tail = o.tail ?? 0.2, room = Math.max(0.1, seconds - lead - tail);
  const weight = (p: { p: string; morae: number }) => (p.p === "sp" ? 1.6 : p.morae * (p.morae === 0.5 ? (vowelOf(p.p) ? 1.25 : 0.75) : 1)), total = specs.reduce((n, p) => n + weight(p), 0) || 1;
  let t = lead;
  return { seconds, precision: "estimated", phones: specs.map(s => { const d = (weight(s) / total) * room, from = t; t += d; return { p: s.p, start: from, end: t, token: s.token }; }) };
}

/** A track as cues for `CharacterPresenter`, whose cues are ranges of one mouth. */
export function visemeCues(track: SpeechTrack, o: { instanceId: string; startFrame: number; fps: number }): { id: string; instanceId: string; kind: "viseme"; startFrame: number; endFrame: number; viseme: MouthName; precision: "phoneme" }[] {
  const keys = mouthKeys(track);
  return keys.slice(0, -1).map((k, i) => ({ id: `${o.instanceId}-viseme-${i}`, instanceId: o.instanceId, kind: "viseme" as const, startFrame: o.startFrame + Math.round(k.t * o.fps), endFrame: o.startFrame + Math.round(keys[i + 1].t * o.fps), viseme: k.name, precision: "phoneme" as const })).filter(c => c.endFrame > c.startFrame);
}
