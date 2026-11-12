/** Cards: the typographic scenes of ads and short explainers, as a film document's `"recipeId": "card"` scenes. A hook line, a numbered
 * list, a this-versus-that, a quote, and the end card with the brand and one call to action. Each enters quickly and then holds still
 * while it is read (text still moving while it is read lowers comprehension), in the film's brand colours and look.
 * Pure: types, timing, moments and checks. `film-cards-react.tsx` draws them.
 */
import { inspectFlips } from "./film-flash";
import { hasCjk, HEADLINE_REVEALS, rebuildPairs, rebuildTiming, scrambleLocks, swellDone } from "./film-card-reveals";
import type { HeadlineReveal } from "./film-card-reveals";
import type { ImageAsset } from "./scene-templates";

/** The brand a film carries: a name, colours, an optional mark, a call to action and a corner bug. Author data, never library defaults. */
export interface FilmBrand {
  name: string;
  /** The brand's primary colour, for emphasis, the end card and the bug. */
  color: string;
  /** Text on the brand colour. @default "#ffffff" */
  ink?: string;
  /** The ground cards are set on. @default a dark neutral */
  background?: string;
  /** The brand's mark (a logo), with its rights reference. Without it, the name is set as a wordmark. */
  mark?: ImageAsset;
  /** One call to action, and where it leads (a URL or a handle). */
  cta?: { text: string; url?: string };
  /** A small mark in a corner of every scene but the end card, so the brand is seen from the first frame. */
  bug?: boolean;
  /** A sonic logo: a few notes that play as the mark lands on the end card. On request only. See `film-sonic.ts`. */
  sonic?: FilmSonicLogo;
}
export type SonicMaterial = "glass" | "wood" | "plastic";
/** A brand's sonic logo. The seed picks the tune, so keep one seed per brand. */
export interface FilmSonicLogo {
  /** Picks the motif. @default 1 */
  seed?: number;
  /** What is struck as the mark lands, and the colour of the notes. @default "glass" */
  material?: SonicMaterial;
  /** Notes in the motif, 2 to 5. @default 3 */
  notes?: number;
  /** Level against the film's other sounds. @default -4 */
  gainDb?: number;
}

/** The colour field a card stands on: the brand's colour, light paper or dark. A run of cards on alternating grounds is colour-blocked,
 * where cards on one ground read as a deck of slides. @default "dark", and "brand" for the end card */
export type CardGround = "dark" | "brand" | "light";
/** A picture on a card, with its size in pixels and its rights record. */
export type CardImage = ImageAsset & { width: number; height: number; /** The point kept in view when the frame crops a photograph, as fractions. @default the centre */ focus?: { x: number; y: number } };
/** A product cutout: an image with a transparent background (a packshot). `screen` is where a device's screen sits in it, as fractions,
 * for a picture shown on the screen. */
export interface CardProduct extends CardImage {
  screen?: { region: { x: number; y: number; width: number; height: number }; image?: CardImage; /** Corner radius, a fraction of the screen's width. @default 0.13 */ radius?: number };
}
interface CardBase {
  ground?: CardGround;
  /** Card frames where the card cuts to the opposite ground, dark to light and back: a polarity flip, on a beat. Each counts toward the
   * film's limit of three flashes a second. */
  flips?: readonly number[];
  /** A focus pull on a photo card: at each card frame the focus racks to the photograph or to the words over `frames` (default 18), and
   * the other goes soft. (Doc 34, A12.) */
  focus?: ReadonlyArray<{ at: number; on: "photo" | "words"; frames?: number }>;
  /** A photograph filling the card behind the words, under a slow push and a shade where the words sit. */
  photo?: CardImage;
  /** A product cutout that lands on the card with its shadow. */
  product?: CardProduct;
}
/** A hook or a statement: a few large words, one of them swiped with the brand colour. */
export interface HeadlineCard extends CardBase { card: "headline"; text: string; /** A word or phrase of `text` set in the brand colour. */ emphasis?: string; kicker?: string;
  /** How the words arrive: `slam` (default), `scramble`, `weight` or `rebuild`. See `film-card-reveals.ts`. */ reveal?: HeadlineReveal;
  /** For `rebuild`: the line shown first, whose letters are rebuilt into `text`. */ from?: string }
/** Numbered points that arrive one at a time, with progress ("2 of 3"). */
export interface ListCard extends CardBase { card: "list"; title: string; items: readonly string[] }
/** Two sides in columns: before and after, myth and fact, them and us. The left side is struck through when `strike` is set. */
export interface VersusCard extends CardBase { card: "versus"; left: { label: string; items: readonly string[] }; right: { label: string; items: readonly string[] }; strike?: boolean }
/** A quote with its speaker and an optional star rating. */
export interface QuoteCard extends CardBase { card: "quote"; quote: string; name: string; role?: string; /** Out of five. */ rating?: number }
/** Social proof: up to three short quotes, each with initials and a rating that counts up, then the overall rating with its count.
 * A total is a claim, so it names its source. */
export interface ProofCard extends CardBase {
  card: "proof";
  quotes: ReadonlyArray<{ quote: string; name: string; role?: string; /** Out of five. */ rating?: number }>;
  /** The overall rating, out of five, and how many ratings it is drawn from. `label` replaces the line under it ("from 40,213 reviews"),
   * for another language or another noun. */
  total?: { rating: number; count: number; label?: string };
  /** Where the total comes from, set small under it ("Store ratings, May 2026"). */
  source?: string;
}
/** The brand resolves, then the call to action and where it leads. Uses the film's brand. */
/** The product with up to three of its features called out: for each, a dot on the product, a line drawn out from it and a few words. */
export interface FeatureCard extends CardBase { card: "feature"; title?: string; product: CardProduct;
  callouts: ReadonlyArray<{ text: string; /** The point on the product, as fractions of its image. */ at: readonly [number, number] }> }
export interface EndCard extends CardBase { card: "end"; /** A price or an offer, set beside the call to action ("From $699"). */ price?: string; /** Overrides the brand's call to action for this card. */ cta?: string; url?: string; /** A short line above the call to action. */ line?: string }
/** One word at a time, alone in the frame, each for about a fifth of a second: text read at the edge of reading speed, which feels urgent.
 * Words in `hold` stay longer, in the brand colour. Practice (doc 34, A1): Apple's *Don't Blink* shows most words for five to seven frames,
 * close to 300 words a minute, and stays readable by changing pace. */
export interface WordsCard extends CardBase { card: "words"; text: string; /** Words (as written in `text`) held longer, for stress. */ hold?: readonly string[];
  /** Frames each held word stays. @default 1 s */ holdFrames?: number; /** Frames for every word that is not held. @default by length, about 5 to 8 at 30 fps */ framesPerWord?: number }
/** One word repeated in rows that fill the frame and slide past its edges, alternate rows in opposite directions; one row in the brand
 * colour. A texture made of a word (doc 34, A2), not a sentence to read. */
export interface WallCard extends CardBase { card: "wall"; word: string; /** @default 7 */ rows?: number; /** How far a row slides, in frame widths a second. @default 0.05 */ speed?: number;
  /** The row set in the brand colour, counting from 0 at the top. @default the middle row */ accentRow?: number }
export type FilmCardContent = HeadlineCard | ListCard | VersusCard | QuoteCard | ProofCard | FeatureCard | EndCard | WordsCard | WallCard;
export const FILM_CARD_KINDS = ["headline", "list", "versus", "quote", "proof", "feature", "end", "words", "wall"] as const;
/** Frames the product takes to land, and between one callout and the next. */
export const PRODUCT_LAND = 16;
export const calloutGap = (callouts: FeatureCard["callouts"], fps = 30) => Math.max(Math.round(fps * .9), Math.round(Math.max(...callouts.map(c => read(c.text)), 1) * .55 * fps));

/** Where a photo card's focus is at a frame: 0 on the words (the photograph soft), 1 on the photograph (the words soft), or `undefined`
 * when the card has no focus pull. Each rack eases over its frames, starting from wherever focus was. */
export function focusAt(keys: CardBase["focus"], frame: number): number | undefined {
  if (!keys?.length) return undefined;
  let at = keys[0].at > 0 ? (keys[0].on === "photo" ? 0 : 1) : keys[0].on === "photo" ? 1 : 0;
  for (const key of keys) {
    if (frame < key.at) break;
    const target = key.on === "photo" ? 1 : 0, t = Math.min(1, (frame - key.at) / Math.max(1, key.frames ?? 18)), e = t * t * (3 - 2 * t);
    at = at + (target - at) * e;
  }
  return at;
}
/** Frames for words to land, and between items. Entrances are fast and then still. */
export const CARD_ENTER = 12, CARD_ITEM_GAP = 30;
const CJK = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af\uff66-\uff9f]/g;
/** Words, for reading time. CJK text has no spaces; at about six characters a second, two characters count as a word. */
export function readingWords(text: string): number {
  const cjk = text.match(CJK)?.length ?? 0;
  return text.replace(CJK, " ").split(/\s+/).filter(token => /[\p{L}\p{N}]/u.test(token)).length + Math.ceil(cjk / 2);
}
const words = readingWords;

/** The words of a line for a word flash: words as a word segmenter finds them (so Japanese splits into words, not characters), with
 * punctuation kept on the word before it. */
export function flashWords(text: string): string[] {
  const out: string[] = [];
  // Intl.Segmenter is in every current browser and Node, though not in the ES2020 library types this project compiles against.
  const Segmenter = (Intl as unknown as { Segmenter: new (locale: undefined, options: { granularity: "word" }) => { segment(text: string): Iterable<{ segment: string; isWordLike?: boolean }> } }).Segmenter;
  for (const part of new Segmenter(undefined, { granularity: "word" }).segment(text.trim())) {
    // A particle or ending of one or two kana (は, ずつ, いる) reads with the word before it, not alone.
    if (part.isWordLike && out.length && /^[\u3040-\u309f]{1,2}$/.test(part.segment)) out[out.length - 1] += part.segment;
    else if (part.isWordLike) out.push(part.segment);
    else if (part.segment.trim() && out.length) out[out.length - 1] += part.segment.trim();
  }
  return out;
}
/** When each word of a word flash shows: from frame 3, one after another, the last one staying to the card's end. */
export function wordFlashTiming(content: Pick<WordsCard, "text" | "hold" | "holdFrames" | "framesPerWord">, fps = 30): Array<{ word: string; start: number; frames: number; held: boolean }> {
  const held = new Set(content.hold ?? []), list = flashWords(content.text), timing: Array<{ word: string; start: number; frames: number; held: boolean }> = [];
  let at = 3;
  for (const word of list) {
    const bare = word.replace(/[^\p{L}\p{N}'-]/gu, ""), isHeld = held.has(word) || held.has(bare);
    // About a fifth of a second for a short word, a little more for a long one; CJK characters each count as two and a half letters.
    const letters = bare.replace(CJK, "").length + (bare.match(CJK)?.length ?? 0) * 2.5;
    const frames = isHeld ? content.holdFrames ?? Math.round(fps) : content.framesPerWord ?? Math.max(Math.round(fps * 4 / 30), Math.round(fps * (.15 + letters * .01)));
    timing.push({ word, start: at, frames, held: isHeld });
    at += frames;
  }
  return timing;
}
/** Seconds a viewer needs to read some words: about three a second, plus a moment to find them. */
export const readingSeconds = (text: string) => .8 + words(text) / 3;
const read = readingSeconds;

/** Named moments of a card, in its own frames: when its main text has landed, and each item. */
export function cardCues(content: FilmCardContent, fps = 30): Array<{ id: string; frame: number }> {
  switch (content.card) {
    case "headline": {
      const reveal = content.reveal ?? "slam";
      if (reveal === "scramble") { const locks = scrambleLocks(content.text, 3); return [{ id: "landed", frame: (locks[locks.length - 1] ?? 3) + 1 }]; }
      if (reveal === "weight") return [{ id: "landed", frame: swellDone(content.text, 3) }];
      if (reveal === "rebuild" && content.from) { const { travelAt, landed } = rebuildTiming(content.from, 3, fps, readingSeconds); return [{ id: "from", frame: 3 }, { id: "rebuild", frame: travelAt }, { id: "landed", frame: landed }]; }
      return [{ id: "landed", frame: CARD_ENTER + Math.min(18, words(content.text) * 2) }];
    }
    case "list": return [{ id: "title", frame: CARD_ENTER }, ...content.items.map((_, i) => ({ id: `item-${i + 1}`, frame: CARD_ENTER + 10 + i * itemGap(content.items, fps) }))];
    case "versus": return [{ id: "left", frame: CARD_ENTER }, { id: "right", frame: CARD_ENTER + Math.round((read(content.left.items.join(" ")) * .6) * fps) }];
    case "quote": return [{ id: "quote", frame: CARD_ENTER }, ...content.rating ? [{ id: "rating", frame: CARD_ENTER + 20 }] : []];
    case "proof": return proofTiming(content, fps).cues;
    case "feature": return [{ id: "product", frame: PRODUCT_LAND }, ...content.callouts.map((_, i) => ({ id: `callout-${i + 1}`, frame: PRODUCT_LAND + 8 + i * calloutGap(content.callouts, fps) }))];
    case "end": return [{ id: "mark", frame: 4 }, { id: "cta", frame: 22 }];
    case "words": { const timing = wordFlashTiming(content, fps); return [...timing.map((item, i) => ({ id: `word-${i + 1}`, frame: item.start })), { id: "landed", frame: timing[timing.length - 1]?.start ?? 3 }]; }
    case "wall": return [{ id: "landed", frame: 0 }];
  }
}
/** Frames a total's number takes to count up to its rating. */
export const PROOF_COUNT_FRAMES = 26;
/** The line under a total. */
export const proofLabel = (total: NonNullable<ProofCard["total"]>) => total.label ?? `from ${total.count.toLocaleString("en-US")} reviews`;
/** When each quote and the total arrive: each quote holds for two thirds of its reading time before the next, since the earlier ones stay on
 * screen to be finished; the total follows the last. `need` is the time the card needs, in seconds. */
export function proofTiming(content: ProofCard, fps = 30) {
  const enters: number[] = [];
  let at = CARD_ENTER;
  content.quotes.forEach(item => { enters.push(at); at += Math.round(Math.max(1.2, read(item.quote) * .65) * fps); });
  const total = content.total ? at : undefined, last = content.quotes[content.quotes.length - 1];
  const need = total !== undefined ? (total + PROOF_COUNT_FRAMES) / fps + read(`${content.total!.rating} ${proofLabel(content.total!)}`) + .4
    : (enters[enters.length - 1] ?? CARD_ENTER) / fps + (last ? read(last.quote) : 0) + .6;
  return { enters, total, need, cues: [...enters.map((frame, i) => ({ id: `quote-${i + 1}`, frame })), ...total !== undefined ? [{ id: "total", frame: total }] : []] };
}
/** Frames between list items: enough to read the longest, at least a second. */
export const itemGap = (items: readonly string[], fps = 30) => Math.max(fps, Math.round(Math.max(...items.map(read), 1) * .7 * fps));

export interface CardProblem { severity: "error" | "warning"; code: string; path: string; message: string; hint?: string }
/** Lengths that fit a card, and enough time to read it all once it has landed. */
export function inspectCard(content: FilmCardContent, durationFrames: number, fps: number, brand?: FilmBrand): CardProblem[] {
  const problems: CardProblem[] = [];
  for (const [key, image] of [["photo", content.photo], ["product", content.product], ["product/screen/image", content.product?.screen?.image]] as const) {
    if (!image) continue;
    if (!(image.src && image.width > 0 && image.height > 0)) problems.push({ severity: "error", code: "card-image", path: `/${key}`, message: "A picture on a card needs its source, width and height." });
    else if (!image.licenseRef) problems.push({ severity: "warning", code: "card-image-licence", path: `/${key}/licenseRef`, message: "The picture names no rights record.", hint: "Set `licenseRef` to its entry in the asset manifest." });
  }
  if (content.focus?.length) {
    if (!content.photo) problems.push({ severity: "error", code: "card-focus-photo", path: "/focus", message: "A focus pull racks between a card's photograph and its words, and this card has no photograph." });
    content.focus.forEach((key, i) => {
      if (!(Number.isSafeInteger(key.at) && key.at >= 0 && key.at < durationFrames)) problems.push({ severity: "error", code: "card-focus", path: `/focus/${i}/at`, message: `A focus key at ${key.at} is not inside the card.` });
      else if (i > 0 && key.at <= content.focus![i - 1].at) problems.push({ severity: "error", code: "card-focus", path: `/focus/${i}/at`, message: "Focus keys run in order." });
      if (key.frames !== undefined && !(key.frames >= 4 && key.frames <= fps * 2)) problems.push({ severity: "warning", code: "card-focus-speed", path: `/focus/${i}/frames`, message: "A rack under 4 frames is a jump; over 2 s it drifts.", hint: "Rack over 12 to 30 frames." });
    });
  }
  if (content.flips?.length) {
    problems.push(...inspectFlips(content.flips, durationFrames, fps, "/flips"));
    if (content.photo) problems.push({ severity: "warning", code: "card-flip-photo", path: "/flips", message: "Words over a photograph keep their light ink, so the card has no ground to flip.", hint: "Flip a card without a photo." });
  }
  const need = (seconds: number, what: string) => {
    if (durationFrames / fps < seconds) problems.push({ severity: "error", code: "card-short", path: "", message: `This card runs ${(durationFrames / fps).toFixed(1)} s; ${what} needs about ${seconds.toFixed(1)} s.`, hint: `Lengthen it to ${Math.ceil(seconds * fps)} frames.` });
  };
  switch (content.card) {
    case "headline":
      if (words(content.text) > 10) problems.push({ severity: "warning", code: "card-headline-long", path: "/text", message: "A headline over ten words stops being a hook.", hint: "Say the rest in the next scene." });
      if (content.emphasis && !content.text.includes(content.emphasis)) problems.push({ severity: "error", code: "card-emphasis", path: "/emphasis", message: `"${content.emphasis}" is not in the headline.` });
      if (content.reveal !== undefined && !HEADLINE_REVEALS.includes(content.reveal)) problems.push({ severity: "error", code: "card-reveal", path: "/reveal", message: `"${content.reveal}" is not a reveal.`, hint: `Reveals: ${HEADLINE_REVEALS.join(", ")}.` });
      if (content.reveal === "rebuild" && !content.from?.trim()) problems.push({ severity: "error", code: "card-reveal-from", path: "/from", message: "A rebuild needs `from`: the line whose letters become the headline." });
      if (content.from && content.reveal !== "rebuild") problems.push({ severity: "warning", code: "card-reveal-from", path: "/from", message: "`from` is only used by the rebuild reveal.", hint: 'Set "reveal": "rebuild".' });
      if (content.reveal === "scramble" && hasCjk(content.text)) problems.push({ severity: "warning", code: "card-scramble-cjk", path: "/reveal", message: "Scrambled CJK characters read as noise, not as decoding.", hint: "Use slam or weight for CJK text." });
      if (content.reveal === "rebuild" && content.from) { const pairs = rebuildPairs(content.from, content.text); if (pairs.moves.length < Math.min([...content.text.replace(/\s/g, "")].length, 4) / 2) problems.push({ severity: "warning", code: "card-rebuild-few", path: "/from", message: "Few letters of the first line carry into the headline, so the rebuild reads as a swap.", hint: "Rebuild from a line that shares letters with the headline." }); }
      // A slam is read as it lands; the other reveals are read once they have landed.
      { const ready = (content.reveal ?? "slam") === "slam" ? CARD_ENTER : cardCues(content, fps).find(cue => cue.id === "landed")!.frame; need(ready / fps + read(content.text), "the headline"); }
      break;
    case "list":
      if (content.items.length < 2 || content.items.length > 5) problems.push({ severity: "error", code: "card-list-length", path: "/items", message: `A list card holds 2 to 5 items; this has ${content.items.length}.` });
      content.items.forEach((item, i) => { if (words(item) > 9) problems.push({ severity: "warning", code: "card-item-long", path: `/items/${i}`, message: `Item ${i + 1} runs over nine words.`, hint: "Keep each point to a line." }); });
      need((CARD_ENTER + 10 + (content.items.length - 1) * itemGap(content.items, fps)) / fps + read(content.items[content.items.length - 1] ?? ""), "the last item");
      break;
    case "versus":
      if (content.left.items.length !== content.right.items.length) problems.push({ severity: "warning", code: "card-versus-uneven", path: "", message: "The two sides have different numbers of lines, so they do not pair up." });
      if (Math.max(content.left.items.length, content.right.items.length) > 4) problems.push({ severity: "error", code: "card-versus-length", path: "", message: "Keep each side to four lines or fewer." });
      need(cardCues(content, fps)[1].frame / fps + read(content.right.items.join(" ")) * .8, "the right side");
      break;
    case "quote":
      if (words(content.quote) > 28) problems.push({ severity: "warning", code: "card-quote-long", path: "/quote", message: "A quote over 28 words is a paragraph; cut it to the line that matters." });
      if (content.rating !== undefined && !(content.rating >= 0 && content.rating <= 5)) problems.push({ severity: "error", code: "card-rating", path: "/rating", message: "A rating runs from 0 to 5." });
      need(CARD_ENTER / fps + read(content.quote) + .6, "the quote");
      break;
    case "proof": {
      if (content.quotes.length < 1 || content.quotes.length > 3) problems.push({ severity: "error", code: "card-proof-length", path: "/quotes", message: `A proof card holds one to three quotes; this has ${content.quotes.length}.`, hint: "Three is the most a viewer reads as a crowd of voices before it reads as a wall." });
      content.quotes.forEach((item, i) => {
        if (words(item.quote) > 16) problems.push({ severity: "warning", code: "card-proof-quote-long", path: `/quotes/${i}/quote`, message: `Quote ${i + 1} runs over 16 words; it shares the frame with the others.`, hint: "Cut it to the line that matters." });
        if (item.rating !== undefined && !(item.rating >= 0 && item.rating <= 5)) problems.push({ severity: "error", code: "card-rating", path: `/quotes/${i}/rating`, message: "A rating runs from 0 to 5." });
      });
      if (content.total) {
        if (!(content.total.rating >= 0 && content.total.rating <= 5)) problems.push({ severity: "error", code: "card-rating", path: "/total/rating", message: "A rating runs from 0 to 5." });
        if (!(Number.isSafeInteger(content.total.count) && content.total.count > 0)) problems.push({ severity: "error", code: "card-proof-count", path: "/total/count", message: "A total is drawn from a whole number of ratings, more than none." });
        // Advertising codes treat an overall rating as a claim that must be substantiated; on screen, that means naming where it is from.
        if (!content.source?.trim()) problems.push({ severity: "warning", code: "card-proof-unsourced", path: "/source", message: "An overall rating is a claim, and this one does not say where it comes from.", hint: 'Add "source", such as "Store ratings, May 2026".' });
      }
      if (content.quotes.length) need(proofTiming(content, fps).need, content.total ? "the total" : "the last quote");
      break;
    }
    case "feature": {
      if (content.callouts.length < 1 || content.callouts.length > 4) problems.push({ severity: "error", code: "card-feature-length", path: "/callouts", message: `A feature card calls out one to four features; this has ${content.callouts.length}.` });
      else if (content.callouts.length > 3) problems.push({ severity: "warning", code: "card-feature-many", path: "/callouts", message: "Past three features, an ad becomes a spec sheet.", hint: "Keep the three that sell it." });
      content.callouts.forEach((c, i) => {
        if (readingWords(c.text) > 5) problems.push({ severity: "warning", code: "card-feature-long", path: `/callouts/${i}/text`, message: `Callout ${i + 1} runs over five words; a callout is a label.` });
        if (!(c.at?.length === 2 && c.at.every(v => v >= 0 && v <= 1))) problems.push({ severity: "error", code: "card-feature-point", path: `/callouts/${i}/at`, message: "A callout points at the product, as fractions of its image." });
      });
      const cues = cardCues(content, fps), last = cues[cues.length - 1].frame;
      need(last / fps + read(content.callouts[content.callouts.length - 1]?.text ?? "") + .4, "the last callout");
      break;
    }
    case "words": {
      const timing = wordFlashTiming(content, fps), plain = timing.filter(item => !item.held);
      if (!timing.length) { problems.push({ severity: "error", code: "card-words-empty", path: "/text", message: "A word flash needs words." }); break; }
      if (plain.some(item => item.frames < Math.round(fps * 4 / 30))) problems.push({ severity: "error", code: "card-words-fast", path: "/framesPerWord", message: "A word on screen for under four frames (at 30 fps) cannot be read.", hint: "Show each word for 5 to 7 frames." });
      else if (plain.length >= 3 && plain.length / (plain.reduce((sum, item) => sum + item.frames, 0) / fps) * 60 > 330)
        problems.push({ severity: "warning", code: "card-words-fast", path: "/framesPerWord", message: `The words run at about ${Math.round(plain.length / (plain.reduce((sum, item) => sum + item.frames, 0) / fps) * 60)} a minute, faster than most people read.`, hint: "Around 300 a minute sits at the edge of reading speed." });
      for (const word of content.hold ?? []) if (!timing.some(item => item.word === word || item.word.replace(/[^\p{L}\p{N}'-]/gu, "") === word)) problems.push({ severity: "error", code: "card-words-hold", path: "/hold", message: `"${word}" is not a word of the text.` });
      if (timing.length > 4 && !timing.slice(0, -1).some(item => item.held)) problems.push({ severity: "warning", code: "card-words-monotone", path: "/hold", message: "Every word flashes at one pace, so the run becomes a blur.", hint: "Hold one word that matters for about a second." });
      const last = timing[timing.length - 1];
      need((last.start + Math.max(last.frames, fps * .8)) / fps, "the last word");
      break;
    }
    case "wall": {
      const rows = content.rows ?? 7;
      if (!content.word?.trim() || /\s/.test(content.word.trim())) problems.push({ severity: "error", code: "card-wall-word", path: "/word", message: "A wall repeats one word." });
      if (!(Number.isSafeInteger(rows) && rows >= 3 && rows <= 14)) problems.push({ severity: "error", code: "card-wall-rows", path: "/rows", message: "A wall has 3 to 14 rows.", hint: "Fewer and it is a headline; more and the word is too small to read." });
      if (content.speed !== undefined && !(content.speed >= 0 && content.speed <= .4)) problems.push({ severity: "error", code: "card-wall-speed", path: "/speed", message: "A wall's rows slide at 0 to 0.4 frame widths a second." });
      if (content.accentRow !== undefined && !(Number.isSafeInteger(content.accentRow) && content.accentRow >= 0 && content.accentRow < rows)) problems.push({ severity: "error", code: "card-wall-accent", path: "/accentRow", message: `The accent row is a row from 0 to ${rows - 1}.` });
      need(1.2, "the wall");
      break;
    }
    case "end":
      if (!brand) problems.push({ severity: "error", code: "card-end-brand", path: "", message: "An end card shows the film's brand, and this film has none.", hint: 'Add "brand" to the film.' });
      else if (!(content.cta ?? brand.cta?.text)) problems.push({ severity: "warning", code: "card-end-cta", path: "/cta", message: "An end card without a call to action leaves the viewer with nothing to do.", hint: 'Set "cta" here or in the brand.' });
      need(2.2, "the mark and the call to action");
      break;
  }
  return problems;
}
