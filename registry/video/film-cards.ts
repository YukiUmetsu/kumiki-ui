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
  /** A photograph filling the card behind the words, under a slow push and a shade where the words sit. */
  photo?: CardImage;
  /** A product cutout that lands on the card with its shadow. */
  product?: CardProduct;
}
/** A hook or a statement: a few large words, one of them swiped with the brand colour. */
export interface HeadlineCard extends CardBase { card: "headline"; text: string; /** A word or phrase of `text` set in the brand colour. */ emphasis?: string; kicker?: string }
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
export type FilmCardContent = HeadlineCard | ListCard | VersusCard | QuoteCard | ProofCard | FeatureCard | EndCard;
export const FILM_CARD_KINDS = ["headline", "list", "versus", "quote", "proof", "feature", "end"] as const;
/** Frames the product takes to land, and between one callout and the next. */
export const PRODUCT_LAND = 16;
export const calloutGap = (callouts: FeatureCard["callouts"], fps = 30) => Math.max(Math.round(fps * .9), Math.round(Math.max(...callouts.map(c => read(c.text)), 1) * .55 * fps));

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
    case "proof": return proofTiming(content, fps).cues;
    case "feature": return [{ id: "product", frame: PRODUCT_LAND }, ...content.callouts.map((_, i) => ({ id: `callout-${i + 1}`, frame: PRODUCT_LAND + 8 + i * calloutGap(content.callouts, fps) }))];
    case "end": return [{ id: "mark", frame: 4 }, { id: "cta", frame: 22 }];
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
    case "end":
      if (!brand) problems.push({ severity: "error", code: "card-end-brand", path: "", message: "An end card shows the film's brand, and this film has none.", hint: 'Add "brand" to the film.' });
      else if (!(content.cta ?? brand.cta?.text)) problems.push({ severity: "warning", code: "card-end-cta", path: "/cta", message: "An end card without a call to action leaves the viewer with nothing to do.", hint: 'Set "cta" here or in the brand.' });
      need(2.2, "the mark and the call to action");
      break;
  }
  return problems;
}
