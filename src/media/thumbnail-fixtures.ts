/**
 * Public showcase data; intentionally outside registry code. Neutral examples
 * are self-contained SVG placeholders. Educational examples render the existing
 * HouseSection2D toolkit into inline SVG images without downloading stock art.
 * These are 2D technical cutaways, *not* accepted photorealistic 3D captures.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HOUSE_PRESETS, resolveHouseLayout } from "../../registry/domains/home-model";
import { createHouseSection } from "../../registry/domains/home-section-2d";
import { HouseSection2D } from "../../registry/domains/home-section-2d-svg";
import type { FontAsset, ImageAsset } from "../../registry/media/document";
import {
  composeThumbnail, type ThumbnailCompositionResult, type ThumbnailRecipeId,
} from "../../registry/media/thumbnail-composition";
import { gradientDataUri } from "./fixtures";

interface ShowcaseCase {
  id: string;
  label: string;
  group: "recipe" | "educational-demo";
  /** Example images are technical illustrations or generated SVG placeholders. */
  imageKind: "generated-placeholder" | "home-cutaway-2d";
  result: ThumbnailCompositionResult;
}

const displayFont: FontAsset = {
  id: "thumbnail-display", family: "Geist Variable", weight: 750, style: "normal",
  fallback: ["Arial", "sans-serif"], availability: "pinned", licenseId: "OFL-1.1",
  attribution: "Geist Variable (showcase font bundle)",
};

function exampleAsset(id: string, from: string, to: string): ImageAsset {
  return { id, mediaType: "image/svg+xml", width: 1600, height: 900,
    uri: gradientDataUri(id, 1600, 900, from, to), alt: "Abstract generated illustrative visual",
    licenseId: "CC0-1.0", attribution: "Generated fixture; no external imagery" };
}

/** Encode an existing documented semantic house scene, not a newly drawn model. */
function houseSectionImage(id: string, preset: keyof typeof HOUSE_PRESETS): ImageAsset {
  const section = createHouseSection(resolveHouseLayout(HOUSE_PRESETS[preset]));
  const svg = renderToStaticMarkup(createElement(HouseSection2D, {
    section, theme: "midnight", title: `${preset} building cross-section`,
  }));
  return { id, uri: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    mediaType: "image/svg+xml", width: 1600, height: 900,
    alt: `Technical cutaway illustration of the ${preset} house layout`,
    licenseId: "MIT", attribution: "Generated from Kumiki-UI's HouseSection2D toolkit" };
}

const primary = exampleAsset("abstract-a", "#183d50", "#6aa5b8");
const secondary = exampleAsset("abstract-b", "#84512c", "#d2aa65");

const recipes: Array<{ id: string; recipe: ThumbnailRecipeId; headline: string; cue: string }> = [
  { id: "hero", recipe: "hero-fact", headline: "THE BIG REVEAL", cue: "CLUE" },
  { id: "compare", recipe: "comparison", headline: "WHICH ONE WINS?", cue: "A OR B" },
  { id: "mechanism", recipe: "hidden-mechanism", headline: "LOOK INSIDE", cue: "HIDDEN PART" },
  { id: "states", recipe: "before-after", headline: "WHAT CHANGED?", cue: "BEFORE / AFTER" },
  { id: "magnitude", recipe: "scale-surprise", headline: "BIGGER THAN YOU THINK", cue: "10×?" },
];

const recipeCases: ShowcaseCase[] = recipes.map(({ id, recipe, headline, cue }) => ({
  id, label: recipe, group: "recipe", imageKind: "generated-placeholder",
  result: composeThumbnail({ id: `thumb-recipe-${id}`, recipe, primary, secondary,
    headline, cue, font: displayFont, primaryFit: "cover", secondaryFit: "cover",
    primaryFocalPoint: { x: .68, y: .3 }, secondaryFocalPoint: { x: .68, y: .3 } }),
}));

const cottage = houseSectionImage("house-cottage", "cottage");
const twoStorey = houseSectionImage("house-two-storey", "two-storey");
const ranch = houseSectionImage("house-ranch", "ranch");

const educationalCases: ShowcaseCase[] = [
  { id: "roof-layers", label: "Inside a roof", group: "educational-demo", imageKind: "home-cutaway-2d",
    result: composeThumbnail({ id: "thumb-home-roof", recipe: "hidden-mechanism", primary: cottage,
      headline: "WHAT'S UNDER A ROOF?", cue: "HIDDEN LAYERS", font: displayFont }) },
  { id: "house-comparison", label: "House-scale comparison", group: "educational-demo", imageKind: "home-cutaway-2d",
    result: composeThumbnail({ id: "thumb-home-compare", recipe: "comparison", primary: cottage, secondary: twoStorey,
      headline: "SMALL VS TALL", cue: "SIZE MATTERS", font: displayFont }) },
  { id: "house-systems", label: "Hidden building systems", group: "educational-demo", imageKind: "home-cutaway-2d",
    result: composeThumbnail({ id: "thumb-home-systems", recipe: "scale-surprise", primary: ranch,
      headline: "WHAT'S INSIDE THIS HOUSE?", cue: "WIRING?", font: displayFont }) },
];

export const thumbnailShowcaseCases: readonly ShowcaseCase[] = [...recipeCases, ...educationalCases];
