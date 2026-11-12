/** How a headline card's words arrive. `slam` is the card's own entrance; the others are doc 34's type moves:
 *
 * - **`scramble`** (A5): each letter cycles through random characters, then locks in, left to right: "decoding", "computing", "found".
 * - **`weight`** (A4): each word arrives thin and swells to heavy along a variable font's weight axis, so the line gains force as it lands.
 * - **`rebuild`** (A3): the line in `from` is shown first; then its letters fly to their places in `text`, letters it lacks shrink away and
 *   new ones grow in, so a word is visibly rebuilt into another ("the design has been" → "re-engineered", as in Apple's *Don't Blink*).
 *
 * Pure timing and letter matching; `film-card-reveals-react.tsx` draws them. Every frame is a function of the frame alone: a scrambled
 * letter comes from a hash of the frame and its place, so any frame renders the same in any order.
 */

export type HeadlineReveal = "slam" | "scramble" | "weight" | "rebuild";
export const HEADLINE_REVEALS: readonly HeadlineReveal[] = ["slam", "scramble", "weight", "rebuild"];
const CJK = /[぀-ヿ㐀-䶿一-鿿가-힯]/;
export const hasCjk = (text: string) => CJK.test(text);

const hash = (a: number, b: number, c: number) => {
  let h = (a * 374761393 + b * 668265263 + c * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};
/** Each letter scrambles among glyphs of its own kind and width, so the stand-ins fill its place without spilling into the next. */
const NARROW = "ijlrtf", GLYPH_SETS: ReadonlyArray<[RegExp, string]> = [
  [/[ijlrtf1I]/, "ijlrt"], [/[a-z]/, "acenorsuvxz"], [/[A-Z]/, "ABCDEFGHKLNPRSTUVXYZ"], [/[0-9]/, "0123456789"],
];
const glyphsFor = (ch: string) => GLYPH_SETS.find(([test]) => test.test(ch))?.[1] ?? (NARROW.includes(ch.toLowerCase()) ? "ijlrt" : "acenorsuvxz");
const out = (t: number) => { const v = Math.min(1, Math.max(0, t)); return 1 - (1 - v) ** 3; };

/** Frame each letter of a scramble locks in, from `start`: left to right over at most about 16 frames, whatever the length. */
export function scrambleLocks(text: string, start: number): number[] {
  const letters = [...text], step = Math.min(1.4, 16 / Math.max(1, letters.length));
  return letters.map((_, i) => Math.round(start + 6 + i * step));
}
/** Each letter of a scramble at a frame: the letter it will be, what it shows now, and whether it has locked. Letters change every second
 * frame, which reads as calculating rather than as noise. Spaces and punctuation never scramble. */
export function scrambleFrame(text: string, frame: number, start: number, seed = 1): Array<{ final: string; shown: string; locked: boolean; visible: boolean }> {
  const locks = scrambleLocks(text, start);
  return [...text].map((final, i) => {
    const locked = frame >= locks[i], still = !/[\p{L}\p{N}]/u.test(final);
    const set = glyphsFor(final), shown = locked || still ? final : set[Math.floor(hash(Math.floor(frame / 2), i, seed) * set.length)];
    return { final, shown, locked: locked || still, visible: frame >= start + Math.floor(i * .35) };
  });
}

/** A word's weight at a frame of a weight swell: thin (160) when it arrives, heavy (`heavy`) twelve frames later, each word three frames
 * after the one before. */
export const swellWeight = (frame: number, start: number, word: number, heavy = 820) => 160 + (heavy - 160) * out((frame - start - word * 3) / 12);
/** The frame a weight swell has finished. */
export const swellDone = (text: string, start: number) => start + Math.max(0, text.trim().split(/\s+/).length - 1) * 3 + 12;

/** Which letters of `from` become which letters of `text`: each letter of `text`, left to right, takes the first unused letter of `from`
 * that matches it (ignoring case), preferring one after the last it took, so letters keep their order where they can. */
export function rebuildPairs(from: string, to: string): { moves: Array<{ from: number; to: number }>; leaving: number[]; arriving: number[] } {
  const a = [...from], b = [...to], used = new Set<number>(), moves: Array<{ from: number; to: number }> = [], arriving: number[] = [];
  let last = -1;
  b.forEach((ch, j) => {
    if (!ch.trim()) return;
    const same = (i: number) => !used.has(i) && a[i].toLowerCase() === ch.toLowerCase();
    let pick = -1;
    for (let i = last + 1; i < a.length && pick < 0; i++) if (same(i)) pick = i;
    for (let i = 0; i < a.length && pick < 0; i++) if (same(i)) pick = i;
    if (pick < 0) { arriving.push(j); return; }
    used.add(pick); last = pick; moves.push({ from: pick, to: j });
  });
  const leaving = a.flatMap((ch, i) => ch.trim() && !used.has(i) ? [i] : []);
  return { moves, leaving, arriving };
}
/** A rebuild's timing: `from` lands at `start` and is read; the letters travel from `travelAt` over 16 frames, a little staggered. */
export function rebuildTiming(from: string, start: number, fps: number, readingSeconds: (text: string) => number) {
  const travelAt = start + 4 + Math.round(readingSeconds(from) * fps * .85);
  return { travelAt, landed: travelAt + 22 };
}
/** How far one letter has travelled at a frame of a rebuild: 0 at its old place, 1 at its new one, on an emphasized curve. */
export function rebuildTravel(frame: number, travelAt: number, index: number): number {
  const t = Math.min(1, Math.max(0, (frame - travelAt - index * .35) / 16));
  return t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}
