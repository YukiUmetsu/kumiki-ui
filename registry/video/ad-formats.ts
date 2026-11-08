/** Ad formats: a short brief becomes a complete film document in one of six proven structures. The hook comes first and lands in the
 * opening seconds; the brand is seen from the first frame (the corner bug) and closes the film on its end card with one call to
 * action; the body is the format's own shape. Scene lengths come from reading time, and the story fields (a question opened by the
 * hook, the turn that answers it, how each scene follows the last) are filled in so the film's story checks pass.
 *
 * Structures, from platform and practitioner guidance (docs/32): hook, body and close (TikTok's creative playbook); problem and
 * solution; before and after; three reasons; myth and fact; social proof. Pure: no renderer.
 */
import type { FilmDocument, FilmOutput, FilmScene } from "./film-document";
import type { FilmBrand, FilmCardContent } from "./film-cards";
import { cardCues, CARD_ENTER, itemGap, readingSeconds, readingWords } from "./film-cards";
import type { FilmLookSpec } from "./film-look";

export const AD_FORMATS = ["hook-body-close", "problem-solution", "before-after", "three-reasons", "myth-vs-fact", "social-proof"] as const;
export type AdFormat = typeof AD_FORMATS[number];
export type AdOutput = "vertical" | "landscape" | "square";

export interface AdBrief {
  id: string;
  format: AdFormat;
  /** The brand, with its call to action. The corner bug is on unless `bug` is `false`. */
  brand: FilmBrand;
  /** @default ["vertical"] */
  outputs?: readonly AdOutput[];
  look?: FilmLookSpec;
  /** The opening line: a question, a claim or a surprise, ten words at most. */
  hook: string;
  /** A word or phrase of the hook set in the brand colour. */
  emphasis?: string;
  /** hook-body-close, three-reasons: the points, cause first. */
  points?: readonly string[];
  /** A title over the points. @default "Why it works" */
  pointsTitle?: string;
  /** problem-solution. */
  problem?: { statement: string; pains?: readonly string[] };
  solution?: string;
  /** before-after: what changes, line by line. */
  before?: readonly string[];
  after?: readonly string[];
  /** myth-vs-fact. */
  myths?: ReadonlyArray<{ myth: string; fact: string }>;
  /** social-proof: one to three quotes, and an overall rating. */
  quotes?: ReadonlyArray<{ quote: string; name: string; role?: string; rating?: number }>;
  rating?: { value: number; count: number };
  /** A 3D product shot after the body: the phone or the laptop turning to its best angle, with a short claim. */
  product?: { subject: "phone" | "laptop"; claim?: string };
  /** A line on the end card above the call to action. */
  endLine?: string;
}

export interface AdProblem { severity: "error" | "warning"; code: string; path: string; message: string; hint?: string }
const OUTPUTS: Record<AdOutput, FilmOutput> = { vertical: { id: "vertical", preset: "youtube-shorts" }, landscape: { id: "landscape", preset: "youtube" }, square: { id: "square", preset: "social-square" } };
const FPS = 30;
const read = readingSeconds;
/** Frames a card needs: its last text landed, read, and a short breath. */
function cardFrames(content: FilmCardContent): number {
  const cues = cardCues(content, FPS), last = cues[cues.length - 1]?.frame ?? CARD_ENTER;
  switch (content.card) {
    case "headline": return Math.max(66, Math.round(last + read(content.text) * FPS * .9 + 10));
    case "list": return Math.round(CARD_ENTER + 10 + (content.items.length - 1) * itemGap(content.items, FPS) + read(content.items[content.items.length - 1]) * FPS + 24);
    case "versus": return Math.round(cues[1].frame + read(content.right.items.join(" ")) * FPS * .8 + 40);
    case "quote": return Math.round(CARD_ENTER + (read(content.quote) + .6) * FPS + 24);
    case "end": return 96;
  }
}
const card = (id: string, content: FilmCardContent, story?: FilmScene["story"]): FilmScene => ({ id, recipeId: "card", durationFrames: cardFrames(content), content, ...story ? { story } : {} } as FilmScene);

/** The brief's own problems: a missing field for its format, too much text for a card. */
export function inspectAdBrief(brief: AdBrief): AdProblem[] {
  const problems: AdProblem[] = [], need = (ok: unknown, path: string, message: string) => { if (!ok) problems.push({ severity: "error", code: "ad-brief-missing", path, message }); };
  if (!AD_FORMATS.includes(brief.format)) problems.push({ severity: "error", code: "ad-format", path: "/format", message: `"${brief.format}" is not a format.`, hint: `Formats: ${AD_FORMATS.join(", ")}.` });
  need(brief.brand?.name && brief.brand?.color, "/brand", "A brief needs a brand with a name and a colour.");
  need(brief.brand?.cta?.text, "/brand/cta", "A brief needs the call to action the ad ends on.");
  need(brief.hook?.trim(), "/hook", "A brief needs a hook.");
  if (brief.hook && readingWords(brief.hook) > 10) problems.push({ severity: "warning", code: "ad-hook-long", path: "/hook", message: "A hook over ten words is read, not felt. Cut it to the turn of phrase." });
  switch (brief.format) {
    case "hook-body-close": need((brief.points?.length ?? 0) >= 2, "/points", "hook-body-close needs two to five points."); break;
    case "three-reasons": need(brief.points?.length === 3, "/points", "three-reasons needs exactly three points."); break;
    case "problem-solution": need(brief.problem?.statement && brief.solution, "/problem", "problem-solution needs a problem statement and a solution."); break;
    case "before-after": need(brief.before?.length && brief.after?.length, "/before", "before-after needs before and after lines."); break;
    case "myth-vs-fact": need(brief.myths?.length, "/myths", "myth-vs-fact needs at least one myth and its fact."); break;
    case "social-proof": need(brief.quotes?.length, "/quotes", "social-proof needs at least one quote."); break;
  }
  return problems;
}

/** The film a brief describes. Errors in the brief come back as problems, with no film. */
export function compileAdBrief(brief: AdBrief): { ok: true; film: FilmDocument; problems: AdProblem[] } | { ok: false; problems: AdProblem[] } {
  const problems = inspectAdBrief(brief);
  if (problems.some(p => p.severity === "error")) return { ok: false, problems };
  const scenes: FilmScene[] = [card("hook", { card: "headline", text: brief.hook, emphasis: brief.emphasis }, { opens: ["why"], hero: "text" })];
  const body = (scene: FilmScene) => scenes.push(scene);
  switch (brief.format) {
    case "hook-body-close":
    case "three-reasons":
      body(card("points", { card: "list", title: brief.pointsTitle ?? (brief.format === "three-reasons" ? "Three reasons" : "Why it works"), items: brief.points! }, { link: "therefore", closes: ["why"] }));
      break;
    case "problem-solution":
      body(card("problem", brief.problem!.pains?.length ? { card: "list", title: brief.problem!.statement, items: brief.problem!.pains } : { card: "headline", text: brief.problem!.statement, kicker: "The problem" }, { link: "and" }));
      body(card("solution", { card: "headline", text: brief.solution!, kicker: brief.brand.name }, { link: "but", expects: brief.problem!.statement, actually: brief.solution!, closes: ["why"], turnAt: "landed" }));
      break;
    case "before-after":
      body(card("change", { card: "versus", left: { label: "Before", items: brief.before! }, right: { label: "After", items: brief.after! }, strike: true }, { link: "but", expects: brief.before![0], actually: brief.after![0], closes: ["why"], turnAt: "right" }));
      break;
    case "myth-vs-fact":
      body(card("myths", { card: "versus", left: { label: "Myth", items: brief.myths!.map(m => m.myth) }, right: { label: "Fact", items: brief.myths!.map(m => m.fact) }, strike: true },
        { link: "but", expects: brief.myths![0].myth, actually: brief.myths![0].fact, closes: ["why"], turnAt: "right" }));
      break;
    case "social-proof":
      brief.quotes!.slice(0, 3).forEach((q, i) => body(card(`quote-${i + 1}`, { card: "quote", ...q }, { link: i ? "and" : "therefore" })));
      if (brief.rating) body(card("rating", { card: "headline", text: `${brief.rating.value.toFixed(1)} from ${brief.rating.count.toLocaleString("en-US")} reviews`, emphasis: brief.rating.value.toFixed(1) }, { link: "therefore", closes: ["why"] }));
      else scenes[scenes.length - 1] = { ...scenes[scenes.length - 1], story: { ...scenes[scenes.length - 1].story, closes: ["why"] } } as FilmScene;
      break;
  }
  if (brief.product) body({ id: "product", recipeId: "shot-3d", durationFrames: 150, story: { link: "therefore" }, content: {
    shot: "hero-turn", subject: brief.product.subject, studio: { look: "strip" }, label: `The ${brief.product.subject} turns to its best angle${brief.product.claim ? `: ${brief.product.claim}` : ""}.`,
    spec: { yawFrom: -70, yawTo: -30, pitch: 8, settleFrame: 54, fillFrom: .74, fillTo: .82, offsetX: .2, ...brief.product.claim ? { claim: { text: brief.product.claim, enter: 60 } } : {} } } } as FilmScene);
  scenes.push(card("end", { card: "end", line: brief.endLine }, { link: "therefore" }));
  const film: FilmDocument = { schemaVersion: 1, id: brief.id, fps: { num: FPS, den: 1 }, outputs: (brief.outputs ?? ["vertical"]).map(o => OUTPUTS[o]),
    brand: { bug: true, ...brief.brand }, ...brief.look ? { look: brief.look } : {}, scenes };
  return { ok: true, film, problems };
}
