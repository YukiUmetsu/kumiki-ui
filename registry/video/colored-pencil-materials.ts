import { createPencilRegion } from "./colored-pencil";
import type { PencilObjectInput, PencilRegion, PencilTrace } from "./colored-pencil";

/**
 * Material-native coloured-pencil recipes. These are mark/deposition presets,
 * not object generators: callers supply their own silhouette, anatomy, material
 * boundaries, highlights and perspective. Source artwork is never embedded.
 */
export const PENCIL_MATERIALS = [
  "petal", "leaf", "citrus", "glass", "metal",
  "masonry", "fabric", "wood", "stone", "fur", "cast-shadow",
  "skin", "hair", "water", "foliage", "glaze", "keratin",
] as const;
export type PencilSurface = typeof PENCIL_MATERIALS[number];
type Mark = "hatch" | "fiber" | "stipple";
type Tone = "even" | "core" | "rim";
type Density = "soft" | "layered" | "dense";
interface Recipe {
  density: Density;
  marks: readonly [Mark, Mark, Mark];
  tone: Tone;
  flow: number;
  direction: number;
  underpaintOpacity: number;
  support: boolean;
  clipDetails: boolean;
  contourOpacity: number;
}

/** Semantics are useful for procedural material routing, never for inferring geometry. */
const RECIPES: Record<PencilSurface, Recipe> = {
  petal: { density:"dense", marks:["hatch","fiber","fiber"], tone:"core",
    flow:29, direction:-34, underpaintOpacity:.82, support:true,
    clipDetails:true, contourOpacity:.49 },
  leaf: { density:"layered", marks:["hatch","fiber","fiber"], tone:"core",
    flow:27, direction:32, underpaintOpacity:.76, support:true,
    clipDetails:true, contourOpacity:.64 },
  citrus: { density:"dense", marks:["hatch","stipple","stipple"], tone:"core",
    flow:16, direction:-24, underpaintOpacity:.83, support:true,
    clipDetails:true, contourOpacity:.55 },
  glass: { density:"soft", marks:["hatch","hatch","fiber"], tone:"rim",
    flow:8, direction:63, underpaintOpacity:.09, support:false,
    clipDetails:false, contourOpacity:.83 },
  metal: { density:"dense", marks:["hatch","hatch","fiber"], tone:"rim",
    flow:19, direction:-41, underpaintOpacity:.91, support:true,
    clipDetails:true, contourOpacity:.69 },
  masonry: { density:"layered", marks:["hatch","stipple","stipple"], tone:"even",
    flow:0, direction:6, underpaintOpacity:.81, support:true,
    clipDetails:true, contourOpacity:.65 },
  fabric: { density:"layered", marks:["hatch","fiber","hatch"], tone:"core",
    flow:34, direction:49, underpaintOpacity:.86, support:true,
    clipDetails:true, contourOpacity:.52 },
  wood: { density:"layered", marks:["hatch","fiber","fiber"], tone:"core",
    flow:12, direction:14, underpaintOpacity:.8, support:true,
    clipDetails:true, contourOpacity:.68 },
  stone: { density:"layered", marks:["hatch","stipple","stipple"], tone:"core",
    flow:6, direction:-16, underpaintOpacity:.78, support:true,
    clipDetails:true, contourOpacity:.64 },
  fur: { density:"dense", marks:["hatch","fiber","fiber"], tone:"core",
    flow:29, direction:17, underpaintOpacity:.78, support:true,
    clipDetails:true, contourOpacity:.5 },
  "cast-shadow": { density:"soft", marks:["hatch","hatch","stipple"], tone:"core",
    flow:0, direction:4, underpaintOpacity:.15, support:false,
    clipDetails:true, contourOpacity:.14 },
  skin: { density:"dense", marks:["hatch","hatch","stipple"], tone:"core",
    flow:13, direction:38, underpaintOpacity:.93, support:true,
    clipDetails:true, contourOpacity:.28 },
  hair: { density:"dense", marks:["hatch","fiber","fiber"], tone:"core",
    flow:31, direction:63, underpaintOpacity:.87, support:true,
    clipDetails:true, contourOpacity:.34 },
  water: { density:"layered", marks:["hatch","fiber","hatch"], tone:"rim",
    flow:10, direction:2, underpaintOpacity:.7, support:true,
    clipDetails:true, contourOpacity:.24 },
  foliage: { density:"layered", marks:["hatch","fiber","stipple"], tone:"core",
    flow:29, direction:-35, underpaintOpacity:.77, support:true,
    clipDetails:true, contourOpacity:.36 },
  glaze: { density:"soft", marks:["hatch","fiber","stipple"], tone:"rim",
    flow:14, direction:-24, underpaintOpacity:.07, support:false,
    clipDetails:true, contourOpacity:.09 },
  // Keratin claws and bird toes need harder edges; fur-like fibres look wrong.
  keratin: { density:"layered", marks:["hatch","hatch","stipple"], tone:"core",
    flow:4, direction:77, underpaintOpacity:.93, support:true,
    clipDetails:true, contourOpacity:.76 },
};
export interface PencilMaterialInput {
  surface: PencilSurface;
  id: string;
  path: string;
  bounds: readonly [number, number, number, number];
  palette: readonly [string, string, string];
  seed: number;
  startFrame?: number;
  durationFrames?: number;
  /** An authored local hatch direction, degrees; never estimated from an image. */
  direction?: number;
  /** Surface-aligned curve fan. Defaults to a material-specific value. */
  flow?: number;
  /** Subject-specific contours, specular arcs, veins, brick courses or seams. */
  details?: readonly PencilTrace[];
  /** SVG transform in the same coordinate system as the silhouette. */
  transform?: string;
}

/**
 * Any valid authored SVG silhouette can use a material recipe. Transparent
 * glass, optical cast shadows and skin-light glazes omit paper support; other recipes are fully
 * opaque over scenery. Three passes remain bounded by CP1's safeguards.
 */
export function createPencilMaterialRegion(input: PencilMaterialInput): PencilRegion {
  if (!Object.prototype.hasOwnProperty.call(RECIPES, input.surface))
    throw new RangeError("Unknown coloured-pencil material surface.");
  const recipe = RECIPES[input.surface];
  const region = createPencilRegion({
    id:input.id, path:input.path, bounds:input.bounds, palette:input.palette,
    seed:input.seed, startFrame:input.startFrame ?? 24,
    durationFrames:input.durationFrames ?? 155,
    direction:input.direction ?? recipe.direction,
    flow:input.flow ?? recipe.flow,
    material:recipe.density, tone:recipe.tone,
    texture:recipe.marks[1], underpaintOpacity:recipe.underpaintOpacity,
    opaqueSupport:recipe.support, clipDetails:recipe.clipDetails,
    details:input.details, transform:input.transform,
    contourColor:recipe.support ? "#424149" : "#67767A",
  } satisfies PencilObjectInput);
  return {
    ...region,
    contour:{...region.contour, opacity:recipe.contourOpacity,
      width:input.surface === "glass" ? 1.08 : 1.2},
    layers:region.layers.map((layer, index) => ({
      ...layer, texture:recipe.marks[index],
      // Every pass deposits physically separate marks. Glass avoids the
      // opaque matte and keeps light, low-pressure pigment at its edges.
      pressure:input.surface === "glass" ? layer.pressure * .65 :
        input.surface === "cast-shadow" ? layer.pressure * .55 :
        input.surface === "skin" ? layer.pressure * .75 :
        input.surface === "glaze" ? layer.pressure * .52 : layer.pressure,
    })),
  };
}
