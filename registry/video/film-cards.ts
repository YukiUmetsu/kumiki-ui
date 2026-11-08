/** Cards: the typographic scenes of ads and short explainers, as a film document's `"recipeId": "card"` scenes. A hook line, a numbered
 * list, a this-versus-that, a quote, and the end card with the brand and one call to action. Each enters quickly and then holds still
 * while it is read (text still moving while it is read lowers comprehension), in the film's brand colours and look.
 * Pure: types, timing, moments and checks. `film-cards-react.tsx` draws them.
 */
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
}

/** A hook or a statement: a few large words, one of them in the brand colour. */
export interface HeadlineCard { card: "headline"; text: string; /** A word or phrase of `text` set in the brand colour. */ emphasis?: string; kicker?: string }
/** Numbered points that arrive one at a time, with progress ("2 of 3"). */
export interface ListCard { card: "list"; title: string; items: readonly string[] }
/** Two sides in columns: before and after, myth and fact, them and us. The left side is struck through when `strike` is set. */
export interface VersusCard { card: "versus"; left: { label: string; items: readonly string[] }; right: { label: string; items: readonly string[] }; strike?: boolean }
/** A quote with its speaker and an optional star rating. */
export interface QuoteCard { card: "quote"; quote: string; name: string; role?: string; /** Out of five. */ rating?: number }
/** The brand resolves, then the call to action and where it leads. Uses the film's brand. */
export interface EndCard { card: "end"; /** Overrides the brand's call to action for this card. */ cta?: string; url?: string; /** A short line above the call to action. */ line?: string }
export type FilmCardContent = HeadlineCard | ListCard | VersusCard | QuoteCard | EndCard;
export const FILM_CARD_KINDS = ["headline", "list", "versus", "quote", "end"] as const;

/** Frames for words to land, and between items. Entrances are fast and then still. */
export const CARD_ENTER = 12, CARD_ITEM_GAP = 30;
const CJK = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af\uff66-\uff9f]/g;
/** Words, for reading time. CJK text has no spaces; at about six characters a second, two characters count as a word. */
export function readingWords(text: string): number {
  const cjk = text.match(CJK)?.length ?? 0;
  return text.replace(CJK, " ").split(/\s+/).filter(token => /[\p{L}\p{N}]/u.test(token)).length + Math.ceil(cjk / 2);
}
const words = readingWords;
/** Seconds a viewer needs to read some words: about three a second, plus a moment to find them. */
export const readingSeconds = (text: string) => .8 + words(text) / 3;
const read = readingSeconds;

/** Named moments of a card, in its own frames: when its main text has landed, and each item. */
export function cardCues(content: FilmCardContent, fps = 30): Array<{ id: string; frame: number }> {
  switch (content.card) {
    case "headline": return [{ id: "landed", frame: CARD_ENTER + Math.min(18, words(content.text) * 2) }];
    case "list": return [{ id: "title", frame: CARD_ENTER }, ...content.items.map((_, i) => ({ id: `item-${i + 1}`, frame: CARD_ENTER + 10 + i * itemGap(content.items, fps) }))];
    case "versus": return [{ id: "left", frame: CARD_ENTER }, { id: "right", frame: CARD_ENTER + Math.round((read(content.left.items.join(" ")) * .6) * fps) }];
    case "quote": return [{ id: "quote", frame: CARD_ENTER }, ...content.rating ? [{ id: "rating", frame: CARD_ENTER + 20 }] : []];
    case "end": return [{ id: "mark", frame: 4 }, { id: "cta", frame: 22 }];
  }
}
/** Frames between list items: enough to read the longest, at least a second. */
export const itemGap = (items: readonly string[], fps = 30) => Math.max(fps, Math.round(Math.max(...items.map(read), 1) * .7 * fps));

export interface CardProblem { severity: "error" | "warning"; code: string; path: string; message: string; hint?: string }
/** Lengths that fit a card, and enough time to read it all once it has landed. */
export function inspectCard(content: FilmCardContent, durationFrames: number, fps: number, brand?: FilmBrand): CardProblem[] {
  const problems: CardProblem[] = [];
  const need = (seconds: number, what: string) => {
    if (durationFrames / fps < seconds) problems.push({ severity: "error", code: "card-short", path: "", message: `This card runs ${(durationFrames / fps).toFixed(1)} s; ${what} needs about ${seconds.toFixed(1)} s.`, hint: `Lengthen it to ${Math.ceil(seconds * fps)} frames.` });
  };
  switch (content.card) {
    case "headline":
      if (words(content.text) > 10) problems.push({ severity: "warning", code: "card-headline-long", path: "/text", message: "A headline over ten words stops being a hook.", hint: "Say the rest in the next scene." });
      if (content.emphasis && !content.text.includes(content.emphasis)) problems.push({ severity: "error", code: "card-emphasis", path: "/emphasis", message: `"${content.emphasis}" is not in the headline.` });
      need(CARD_ENTER / fps + read(content.text), "the headline");
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
    case "end":
      if (!brand) problems.push({ severity: "error", code: "card-end-brand", path: "", message: "An end card shows the film's brand, and this film has none.", hint: 'Add "brand" to the film.' });
      else if (!(content.cta ?? brand.cta?.text)) problems.push({ severity: "warning", code: "card-end-cta", path: "/cta", message: "An end card without a call to action leaves the viewer with nothing to do.", hint: 'Set "cta" here or in the brand.' });
      need(2.2, "the mark and the call to action");
      break;
  }
  return problems;
}
