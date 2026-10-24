/**
 * Art-directed, AI-generated illustrative examples (see ASSETS.md). Every visual
 * is a text-free source asset; words stay editable inside the M0 document.
 * Not imported by generic registry components.
 */
import houseSubject from "./thumbnail-examples/house-subject.png?inline";
import houseBackground from "./thumbnail-examples/house-background.png?inline";
import hvacSubject from "./thumbnail-examples/hvac-subject.png?inline";
import hvacBackground from "./thumbnail-examples/hvac-background.png?inline";
import comparisonHouse from "./thumbnail-examples/house-comparison.png?inline";
import comparisonBackground from "./thumbnail-examples/comparison-background.png?inline";
import goldSwoosh from "./thumbnail-examples/gold-swoosh.png?inline";
import orangeSwoosh from "./thumbnail-examples/orange-swoosh.png?inline";
import divider from "./thumbnail-examples/comparison-divider.png?inline";
import type { FontAsset, ImageAsset } from "../../registry/media/document";
import { composeEditorialThumbnail, type EditorialThumbnailResult } from "../../registry/media/thumbnail-art-direction";
import type { ThumbnailPreflightOptions } from "../../registry/media/thumbnail-preflight";

export interface EditorialShowcaseCase {
  id: "house-cost-editorial" | "hvac-editorial" | "rent-buy-editorial";
  label: string;
  group: "editorial-demo";
  imageKind: "authored-photo-layers";
  result: EditorialThumbnailResult;
  inspection?: ThumbnailPreflightOptions;
}

const displayFont: FontAsset = {
  id: "editorial-display", family: "Arial", weight: 900, style: "normal",
  fallback: ["Arial Black", "sans-serif"], availability: "system",
};

function generatedAsset(id: string, uri: string, width: number, height: number, alt: string): ImageAsset {
  return {
    id, uri, mediaType: "image/png", width, height, alt,
    attribution: "AI-generated specifically for Kumiki-UI House Math example; see ASSETS.md",
    licenseId: "project-generated-asset",
  };
}

/** Small authored transparent annotation, independently editable as a layer. */
function authoredAccent(id: string, uri: string, width: number, height: number, alt: string): ImageAsset {
  return {
    id, uri, mediaType: "image/png",
    width, height, alt, attribution: "Authored in Kumiki-UI for this repository",
    licenseId: "project-authored-asset",
  };
}

const goldUnderline = authoredAccent("gold-swoosh", goldSwoosh,
  360, 48, "Thin gold marker stroke emphasizing the headline");
const orangeUnderline = authoredAccent("orange-swoosh", orangeSwoosh,
  360, 48, "Warm orange editorial underline");
const comparisonDivider = authoredAccent("comparison-divider", divider,
  20, 180, "Gold divider between opposing options");

const heroHouse = generatedAsset("house-photo", houseSubject, 1448, 1086,
  "Illuminated two-story suburban house isolated on a transparent field");
const houseBlueprint = generatedAsset("house-blueprint", houseBackground, 1672, 941,
  "Dark architectural drafting desk with blueprints and large black negative space");
const condenser = generatedAsset("hvac-condenser", hvacSubject, 1312, 1199,
  "Three-quarter view of exposed residential condenser coils and copper pipes");
const installationBackground = generatedAsset("hvac-installation", hvacBackground, 1672, 941,
  "Industrial residential side wall and copper ducts fading into dark headline space");
const comparisonHousePhoto = generatedAsset("second-house-photo", comparisonHouse, 1448, 1086,
  "White brick suburban home isolated as a cutout");
const splitAtmosphere = generatedAsset("rent-buy-atmosphere", comparisonBackground, 1672, 941,
  "Rainy blue driveway on left, golden sunset driveway on right, with no buildings or type");

export const editorialShowcaseCases: readonly EditorialShowcaseCase[] = [
  {
    id: "house-cost-editorial", label: "House Math · The true $500K house cost",
    group: "editorial-demo", imageKind: "authored-photo-layers",
    result: composeEditorialThumbnail({
      id: "house-cost-editorial", layout: "subject-left", font: displayFont,
      primary: heroHouse, background: houseBlueprint,
      props: [{ id: "headline-swoosh", image: goldUnderline,
        frame: { x: .56, y: .505, width: .29, height: .058 }, z: 35 }],
      headline: [{ text: "$500K", tone: "foreground" }, { text: "TRAP", tone: "accent" }],
      cue: "30 YEARS?", palette: { accent: "#ffd05d", foreground: "#ffffff" },
    }),
  },
  {
    id: "hvac-editorial", label: "House Math · Why HVAC replacement is expensive",
    group: "editorial-demo", imageKind: "authored-photo-layers",
    result: composeEditorialThumbnail({
      id: "hvac-editorial", layout: "subject-right", font: displayFont,
      primary: condenser, background: installationBackground,
      props: [{ id: "headline-swoosh", image: orangeUnderline,
        frame: { x: .048, y: .505, width: .30, height: .058 }, z: 35 }],
      headline: [{ text: "WHY SO", tone: "foreground" }, { text: "COSTLY?", tone: "accent" }],
      cue: "HVAC COST", palette: { accent: "#ffb650", foreground: "#ffffff" },
    }),
  },
  {
    id: "rent-buy-editorial", label: "House Math · Rent versus buy",
    group: "editorial-demo", imageKind: "authored-photo-layers",
    result: composeEditorialThumbnail({
      id: "rent-buy-editorial", layout: "split-comparison", font: displayFont,
      primary: heroHouse, secondary: comparisonHousePhoto, background: splitAtmosphere,
      props: [{ id: "choice-divider", image: comparisonDivider,
        frame: { x: .495, y: .080, width: .010, height: .145 }, z: 35 }],
      headline: [{ text: "RENT", tone: "foreground" }, { text: "BUY", tone: "accent" }],
      cue: "VS", palette: { accent: "#ffcf62", foreground: "#ffffff" },
    }),
    // The center-bottom VS deliberately crosses the *image frames*, but not
    // either house's visible cutout. The overlap is art-directed and reviewed.
    inspection: { intentionalOverlaps: [
      ["cue", "subject-primary"], ["cue", "subject-secondary"],
    ] },
  },
];
