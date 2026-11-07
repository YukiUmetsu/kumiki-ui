/** When and how to use each shader effect, as data. The docs, the craft stories, the catalog and `film:check` all read this one table,
 * so an agent meets the same rules wherever it looks. The rules come from studio and brand work: see docs/29-shader-fx-in-practice.md.
 */
import type { ShaderFxEffect, ShaderFxSpec } from "./shader-fx";

/** What an effect is for in a shot. Naming it is the point: an effect with no job is decoration. */
export const SHADER_FX_JOBS = ["mood", "bridge", "identity", "reveal", "evidence", "archive", "living-still"] as const;
export type ShaderFxJob = (typeof SHADER_FX_JOBS)[number];

export interface ShaderFxGuide {
  effect: ShaderFxEffect;
  title: string;
  /** The jobs this effect does well. `film:check` refuses any other. */
  jobs: readonly ShaderFxJob[];
  use: string;
  avoid: string;
  settings: string;
  /** A catalog sound that suits it, and where it lands. */
  sound: { id?: string; when: string };
  /** Questions a reviewer answers yes to before the film ships. */
  review: readonly string[];
  /** How studio and brand work uses it, described without names. The named examples and sources are in docs/29-shader-fx-in-practice.md. */
  practice: string;
}

export const SHADER_FX_GUIDE: Readonly<Record<ShaderFxEffect, ShaderFxGuide>> = {
  "mesh-gradient": { effect: "mesh-gradient", title: "Mesh gradient", jobs: ["mood", "bridge", "identity"],
    use: "Chapter cards, openings and quiet bridges between scenes. Used everywhere with one palette, it becomes a brand signature.",
    avoid: "Saturated colour or fast swirl behind small text. Its contrast varies across the frame, so text can pass in one place and fail in another. A different gradient in every film identifies no one.",
    settings: "3 to 4 neighbouring hues plus one accent, rate 0.15 to 0.25, swirl under 0.2, grain about 0.05. Animate the type, not the background.",
    sound: { id: "whoosh-slow-soft", when: "as the title rises" },
    review: ["Is the gradient slower than the type?", "Does the text pass contrast at its darkest and lightest point?", "Is this the same palette the rest of the film uses?"],
    practice: "A payments company made one slow WebGL gradient the signature of its homepage and refined it for years. Owned and repeated, a gradient becomes identity." },
  "liquid-metal": { effect: "liquid-metal", title: "Liquid metal", jobs: ["identity"],
    use: "One identity moment: a logo or mark, once per film. It reads as precious because it is rare.",
    avoid: "Text, backgrounds, fine detail, and chrome in more than one place.",
    settings: "A clean silhouette on transparency, repetition 2 to 4, distortion under 0.1. Let the flow rush in for about a second, then slow it right down. Show the mark on its own dark field, then bring in the name.",
    sound: { id: "sting-airy-short", when: "as the mark settles" },
    review: ["Is this the only chrome in the film?", "Does the mark settle before the name appears?"],
    practice: "A design-tool maker released a liquid-metal logo tool, styled after a phone maker's event invitations, and it spread as logo stings. It works on a mark, once." },
  "god-rays": { effect: "god-rays", title: "God rays", jobs: ["reveal", "identity"],
    use: "Revealing a place, the moment light arrives, or an identity where coloured light gathers into the mark.",
    avoid: "Rays with no source in the picture, pure white beams, and rays across text. Without a source the eye reads them as a filter.",
    settings: "Set originX and originY on the light: `npm run fx:light -- <photo>` finds it. Tint the rays with that light's colour, intensity 0.5 to 0.75, and key them in over 2 to 3 seconds. For a mark, centre them on it and let them fall back after it appears.",
    sound: { id: "riser-1s-soft", when: "peaking as the title or mark lands" },
    review: ["Do the rays come from a light you can see, or from the mark?", "Do they stay off the words?"],
    practice: "A streaming service opens its originals with coloured beams that converge into its logo; the colours stand for the range of its catalogue. A superhero film's titles shot their volumetric light for real, through glass and smoke, so it reads as made." },
  "grain-gradient": { effect: "grain-gradient", title: "Grain gradient", jobs: ["evidence", "mood", "bridge"],
    use: "Quotes, evidence and documentary cards. Grain makes flat colour feel like paper or film and hides banding after compression.",
    avoid: "Heavy noise or saturated colour under small text. Once you notice the grain, it is too much.",
    settings: "Two neighbouring dark tones, softness 0.8 to 0.9, noise 0.1 to 0.15, rate under 0.2. Use a serif or a strong weight for the words.",
    sound: { id: "foley-paper-slide", when: "as the card arrives" },
    review: ["Can the smallest text be read through the grain?", "Is the grain finer than the type?"],
    practice: "Brand work in 2025 and 2026 uses grain and texture as a sign of human craft, against the slick gradient many brands in one category share." },
  water: { effect: "water", title: "Water", jobs: ["living-still", "reveal"],
    use: "A living still: a lake, stream or wet stone in a photograph. The stillness around the movement is what makes it striking.",
    avoid: "Distorting land, sky, faces or text. If everything moves, the viewer sees an effect instead of a place.",
    settings: "Set `waterline` so only the water moves, with the edge on a shoreline. Waves and caustic around 0.05, rate about 0.3, and a very slow push.",
    sound: { id: "bed-stream-close", when: "as a quiet bed, with no hits" },
    review: ["Does only the water move?", "Is the edge of the movement on a line the picture already has?"],
    practice: "A product site revealed its product through caustic light with dithering, chosen because fluid simulations had become common. Water light is a reveal, not only a background." },
  "halftone-dots": { effect: "halftone-dots", title: "Halftone", jobs: ["archive", "evidence", "reveal"],
    use: "Archive material, print heritage, evidence and then-and-now reveals. Keyed from flat texture to a sharp picture, it becomes the reveal itself.",
    avoid: "Dots so large the subject is lost, low contrast, faces at small sizes, and pop-art colour in serious work.",
    settings: "Ink on a warm paper colour, a hex grid, contrast 0.5 to 0.6, grain 0.2 to 0.3. To reveal, key contrast up from 0 and size down from about 0.95 over 2 to 3 seconds.",
    sound: { id: "props-page-turn", when: "on the wipe or as the picture resolves" },
    review: ["Can you tell what the picture is?", "Does it look printed rather than generated?"],
    practice: "A magazine's video opener turns a living field of dots, standing for its stories, into its masthead, as a modern take on its print heritage." },
};

/** The ready-made moments, each one job done well. Every entry has a story and a builder in `shader-fx-moments`. */
export interface ShaderFxMoment { id: string; title: string; job: ShaderFxJob; effect: ShaderFxEffect; summary: string; storyExport: string; keywords: readonly string[] }
export const SHADER_FX_MOMENTS: readonly ShaderFxMoment[] = [
  { id: "resolve-into-picture", title: "Resolve Into Picture", job: "reveal", effect: "halftone-dots", storyExport: "resolve-into-picture",
    summary: "A field of printed dots sharpens into a photograph, then a label lands.", keywords: ["reveal", "archive", "print", "halftone", "opening", "magazine", "publication", "photo reveal"] },
  { id: "resolve-into-mark", title: "Resolve Into Mark", job: "identity", effect: "god-rays", storyExport: "resolve-into-mark",
    summary: "Coloured beams build toward one point, the mark appears there backlit, and the light falls back.", keywords: ["logo reveal", "identity", "opener", "brand", "light", "beams", "channel ident"] },
  { id: "mark-sting", title: "Mark Sting", job: "identity", effect: "liquid-metal", storyExport: "mark-sting",
    summary: "A chrome mark: the flow rushes in, settles on a dark field, and the name follows.", keywords: ["logo", "chrome", "sting", "end card", "sign off", "identity", "metal"] },
  { id: "living-still", title: "Living Still", job: "living-still", effect: "water", storyExport: "living-still",
    summary: "Only the water in a photograph moves, below its shoreline. A cinemagraph.", keywords: ["cinemagraph", "lake", "river", "photo", "alive", "water", "calm", "place"] },
  { id: "signature-gradient", title: "Signature Gradient", job: "identity", effect: "mesh-gradient", storyExport: "signature-gradient",
    summary: "One palette, seed and rate, owned as brand values, in every format.", keywords: ["brand", "background", "chapter card", "signature", "gradient", "series", "template"] },
  { id: "caustic-reveal", title: "Caustic Reveal", job: "reveal", effect: "water", storyExport: "caustic-reveal",
    summary: "The picture starts under rippling water and caustic light, and the surface calms until it comes through clear.", keywords: ["reveal", "water", "caustics", "product", "underwater", "surface", "calm", "ripple"] },
  { id: "light-with-a-source", title: "Light With A Source", job: "reveal", effect: "god-rays", storyExport: "light-with-a-source",
    summary: "Rays placed on the real light in a photograph, found automatically, fading in as the title lands.", keywords: ["reveal", "place", "sunrise", "light", "rays", "landscape", "establishing shot"] },
];

/** A use of an effect that studio work warns against. Each is a warning, so a film can still choose it on purpose. */
export interface ShaderFxUseProblem { path: string; code: "fx-job-missing" | "fx-competing" | "fx-identity-repeated" | "fx-unmotivated-light" | "fx-unmasked-water" | "fx-subject-lost" | "fx-competes-with-text"; message: string; hint: string }
const final = (spec: ShaderFxSpec, param: string) => {
  const keyed = [...spec.keys ?? []].filter(key => key.param === param).sort((a, b) => b.endFrame - a.endFrame)[0];
  return keyed ? keyed.to : (spec.params as Record<string, unknown> | undefined)?.[param] as number | undefined;
};
/** Check how a film uses its effects, scene by scene and across the film. `scenes` are in film order, with `path` pointing at each scene's `fx`. */
export function inspectShaderFxUse(scenes: readonly { path: string; fx: readonly ShaderFxSpec[] }[]): ShaderFxUseProblem[] {
  const problems: ShaderFxUseProblem[] = [];
  let metal = 0;
  for (const scene of scenes) {
    const leading = scene.fx.filter(fx => fx.layer !== "transition" && (fx.treatment ?? "subtle") !== "subtle");
    if (leading.length > 1) problems.push({ path: scene.path, code: "fx-competing", message: `${leading.length} effects lead this shot: ${leading.map(fx => fx.id).join(", ")}.`, hint: "Let one effect lead. Make the others subtle, or move one to another shot." });
    for (const [i, fx] of scene.fx.entries()) {
      const path = `${scene.path}/${i}`, guide = SHADER_FX_GUIDE[fx.effect], params = (fx.params ?? {}) as Record<string, unknown>;
      // An unknown effect is the schema's error to report; it has no guidance to check.
      if (!guide) continue;
      if (!fx.job) problems.push({ path, code: "fx-job-missing", message: `Effect "${fx.id}" does not say what it is for.`, hint: `Add "job": one of ${guide.jobs.join(", ")}.` });
      if (fx.effect === "liquid-metal") {
        metal += 1;
        if (fx.layer === "background") problems.push({ path, code: "fx-identity-repeated", message: "Liquid metal fills the background.", hint: "Put chrome on one mark, as an overlay." });
      }
      if (fx.effect === "god-rays" && params.originX === undefined && params.originY === undefined)
        problems.push({ path, code: "fx-unmotivated-light", message: `Rays "${fx.id}" have no light source.`, hint: "Set originX and originY on the light in the picture: npm run fx:light -- <photo>. For a mark, centre them on it." });
      // Water may move the whole picture only on its way to calm: a reveal that settles is fine, a frame that never stops is not.
      if (fx.effect === "water" && params.waterline === undefined && !((final(fx, "waves") ?? 1) <= .05 && (final(fx, "caustic") ?? 1) <= .06 && fx.keys?.length))
        problems.push({ path, code: "fx-unmasked-water", message: `Water "${fx.id}" moves the whole picture.`, hint: "Set waterline, from 0 at the top to 1 at the bottom, on the shoreline. Or key waves to 0.05 and caustic to 0.06 or less, so the water calms." });
      if (fx.effect === "halftone-dots" && ((final(fx, "contrast") ?? .4) < .3 || (final(fx, "size") ?? .5) > 1))
        problems.push({ path, code: "fx-subject-lost", message: `Halftone "${fx.id}" ends with the picture lost in the dots.`, hint: "End with contrast of at least 0.3 and size of at most 1." });
      if ((fx.effect === "mesh-gradient" || fx.effect === "grain-gradient") && fx.layer === "background" && (fx.treatment === "hero" || (fx.rate ?? 0) > .5))
        problems.push({ path, code: "fx-competes-with-text", message: `"${fx.id}" moves faster than the words in front of it.`, hint: "Use subtle or standard, with a rate of 0.5 or less." });
    }
  }
  if (metal > 1) problems.push({ path: "/scenes", code: "fx-identity-repeated", message: `Liquid metal appears ${metal} times.`, hint: "Chrome reads as precious because it is rare. Keep one." });
  return problems;
}
