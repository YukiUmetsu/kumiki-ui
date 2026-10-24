/**
 * Art-directed, AI-generated illustrative examples (see ASSETS.md). Every visual
 * is a text-free source asset; words stay editable inside the M0 document.
 * Not imported by generic registry components.
 */
import houseCostScene from "./thumbnail-examples/house-cost-scene.jpg?inline";
import hvacScene from "./thumbnail-examples/hvac-scene.jpg?inline";
import rentBuyScene from "./thumbnail-examples/rent-buy-scene.jpg?inline";
import type { FontAsset, ImageAsset } from "../../registry/media/document";
import { composeEditorialThumbnail, type EditorialThumbnailResult, type EditorialTextPlacement } from "../../registry/media/thumbnail-art-direction";
import type { ThumbnailPreflightOptions } from "../../registry/media/thumbnail-preflight";

export interface EditorialShowcaseCase {
  id: "house-cost-editorial" | "hvac-editorial" | "rent-buy-editorial";
  label: string;
  group: "editorial-demo";
  imageKind: "authored-photo-scene";
  result: EditorialThumbnailResult;
  inspection?: ThumbnailPreflightOptions;
}

const displayFont: FontAsset = {
  id: "editorial-display", family: "Anton", weight: 400, style: "normal",
  fallback: ["Arial Black", "Arial", "sans-serif"], availability: "pinned",
  licenseId: "OFL-1.1", attribution: "Anton Regular, Google Fonts, OFL-1.1 (showcase font bundle)",
};

function generatedAsset(id: string, uri: string, width: number, height: number, alt: string): ImageAsset {
  return {
    id, uri, mediaType: "image/jpeg", width, height, alt,
    attribution: "AI-generated specifically for Kumiki-UI House Math example; see ASSETS.md",
    licenseId: "project-generated-asset",
  };
}

/** Art-directed scene sources are text-free. M0 separately paints every letter. */
const heroHouse = generatedAsset("cost-scene", houseCostScene, 1672, 941,
  "Illuminated house at dusk, architectural drafting desk and dark space for a headline");
const condenser = generatedAsset("hvac-scene", hvacScene, 1672, 941,
  "Detailed residential HVAC condenser with exposed copper piping and dark headline space");
const housingComparison = generatedAsset("housing-comparison-scene", rentBuyScene, 1672, 941,
  "Cool rainy and warm sunset suburban homes on two halves of a diagonal comparison");

const deepShadow = { dx: 3, dy: 6, blur: 9, color: "#000000", opacity: .72 } as const;
function place(x: number, y: number, width: number, height: number,
  fontSize: number, minFontSize: number, letterSpacing = -3): EditorialTextPlacement {
  return { frame: { x, y, width, height }, fontSize, minFontSize,
    letterSpacing, lineHeight: .93, shadow: deepShadow };
}

export const editorialShowcaseCases: readonly EditorialShowcaseCase[] = [
  {
    id: "house-cost-editorial", label: "House Math · The true $500K house cost",
    group: "editorial-demo", imageKind: "authored-photo-scene",
    result: composeEditorialThumbnail({
      id: "house-cost-editorial", layout: "full-bleed", font: displayFont,
      primary: heroHouse,
      headline: [
        { text: "$500K", tone: "foreground", placement: place(.028, .145, .455, .31, 230, 170, -8) },
        { text: "ISN'T THE COST", tone: "accent", placement: place(.032, .419, .475, .195, 115, 90, -5) },
      ],
      palette: { accent: "#ffd169", foreground: "#ffffff" },
    }),
    inspection: { subjectRegions: { primary: { x: 650, y: 48, width: 630, height: 548 } } },
  },
  {
    id: "hvac-editorial", label: "House Math · Why HVAC replacement is expensive",
    group: "editorial-demo", imageKind: "authored-photo-scene",
    result: composeEditorialThumbnail({
      id: "hvac-editorial", layout: "full-bleed", font: displayFont,
      primary: condenser,
      headline: [
        { text: "WHY SO", tone: "foreground", placement: place(.027, .16, .46, .29, 205, 150, -6) },
        { text: "EXPENSIVE?", tone: "accent", placement: place(.027, .408, .49, .23, 148, 115, -5) },
      ],
      palette: { accent: "#ff9c22", foreground: "#ffffff" },
    }),
    inspection: { subjectRegions: { primary: { x: 630, y: 42, width: 650, height: 625 } },
      intentionalOverlaps: [["headline-1", "subject-primary"]] },
  },
  {
    id: "rent-buy-editorial", label: "House Math · Rent versus buy",
    group: "editorial-demo", imageKind: "authored-photo-scene",
    result: composeEditorialThumbnail({
      id: "rent-buy-editorial", layout: "full-bleed", font: displayFont,
      primary: housingComparison,
      headline: [
        { text: "RENT", tone: "foreground", placement: place(.083, .095, .365, .25, 190, 150, -7) },
        { text: "BUY", tone: "accent", placement: place(.64, .095, .31, .26, 200, 160, -7) },
      ],
      cue: "VS", cuePlacement: { ...place(.427, .405, .175, .255, 183, 130, -6), align: "center" },
      palette: { accent: "#ffe28b", foreground: "#ffffff" },
    }),
    inspection: { subjectRegions: { primary: { x: 12, y: 254, width: 1256, height: 466 } },
      intentionalOverlaps: [["cue", "subject-primary"]] },
  },
];
