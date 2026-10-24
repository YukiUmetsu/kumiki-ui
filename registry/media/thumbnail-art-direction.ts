/**
 * Editorial thumbnail art direction on top of the renderer-neutral M0 document.
 * Source imagery is supplied by the caller; no image generation, hidden copy, or
 * flattened title graphics are baked into the composition.
 */
import {
  createDocument,
  defaultSafeRegion,
  round,
  validateDocument,
  type Diagnostic,
  type FontAsset,
  type ImageAsset,
  type Layer,
  type MediaDocument,
  type MediaLayer,
  type Rect,
  type TextLayer,
} from "./document";
import { ThumbnailCompositionError, type ThumbnailCompositionRoles, type ThumbnailPalette } from "./thumbnail-composition";

const WIDTH = 1280;
const HEIGHT = 720;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const DEFAULT_PALETTE: ThumbnailPalette = {
  background: "#111c28", foreground: "#fffaf2", accent: "#ffc75d", surface: "#193044",
};

export interface EditorialHeadlineLine {
  /** A separately editable line, not a caption printed on an image. */
  text: string;
  tone: "foreground" | "accent";
  scale?: "primary" | "secondary";
}

export interface EditorialProp {
  id: string;
  image: ImageAsset;
  /** Normalized frame coordinates (0..1) relative to the artboard. */
  frame: Rect;
  z?: number;
  opacity?: number;
}

export interface EditorialThumbnailInput {
  id: string;
  layout: "subject-left" | "subject-right" | "split-comparison";
  primary: ImageAsset;
  secondary?: ImageAsset;
  background?: ImageAsset;
  props?: readonly EditorialProp[];
  headline: readonly EditorialHeadlineLine[];
  cue?: string;
  font: FontAsset;
  palette?: Partial<ThumbnailPalette>;
}

export interface EditorialThumbnailResult {
  document: MediaDocument;
  recipe: "editorial";
  layout: EditorialThumbnailInput["layout"];
  roles: ThumbnailCompositionRoles & { headlineIds: readonly string[] };
}

function problem(code: string, message: string): Diagnostic {
  return { code, message, severity: "error" };
}

function validAsset(asset: ImageAsset | undefined): asset is ImageAsset {
  return Boolean(asset && typeof asset.id === "string" && ID.test(asset.id) &&
    typeof asset.uri === "string" && asset.uri.trim() &&
    typeof asset.mediaType === "string" && asset.mediaType.startsWith("image/") &&
    typeof asset.alt === "string" && asset.alt.trim() &&
    (asset.width === undefined || (Number.isFinite(asset.width) && asset.width > 0)) &&
    (asset.height === undefined || (Number.isFinite(asset.height) && asset.height > 0)));
}

function base(id: string, name: string, transform: Rect, z: number) {
  return { id, semanticId: id, name, transform, z, visible: true, locked: false,
    opacity: 1, blend: "normal" as const, clip: false };
}

function media(id: string, name: string, asset: ImageAsset, transform: Rect, z: number,
  options: { fit?: "cover" | "contain"; decorative?: boolean; shadow?: boolean; opacity?: number } = {}): MediaLayer {
  return {
    ...base(id, name, transform, z),
    kind: "media", summary: asset.alt, opacity: options.opacity ?? 1,
    media: { assetId: asset.id, fit: options.fit ?? "contain", focalPoint: { x: .5, y: .5 },
      mask: { kind: "none" }, alt: asset.alt, decorative: options.decorative ?? false },
    ...(options.shadow ? { appearance: { dropShadow: {
      dx: 12, dy: 18, blur: 24, color: "#000000", opacity: .65,
    } } } : {}),
  };
}

function headline(id: string, line: EditorialHeadlineLine, transform: Rect,
  font: FontAsset, palette: ThumbnailPalette, size: number): TextLayer {
  return {
    ...base(id, `Editable headline: ${line.text}`, transform, 50), kind: "text", summary: line.text,
    text: { spans: [{ text: line.text, color: palette[line.tone] }], fontId: font.id,
      size, minSize: round(size * .54), lineHeight: .98, letterSpacing: -2,
      align: "start", direction: "auto", fit: "shrink", as: "div" },
  };
}

function validate(input: EditorialThumbnailInput): ThumbnailPalette {
  const issues: Diagnostic[] = [];
  if (typeof input.id !== "string" || !ID.test(input.id))
    issues.push(problem("thumbnail-id-invalid", "Use a document-safe slug for the composition id."));
  if (!["subject-left", "subject-right", "split-comparison"].includes(input.layout))
    issues.push(problem("thumbnail-layout-unknown", "Choose a supported editorial layout."));
  if (!Array.isArray(input.headline) || !input.headline.length ||
    input.headline.some((line) => typeof line?.text !== "string" || !line.text.trim() ||
      !["foreground", "accent"].includes(line.tone)))
    issues.push(problem("thumbnail-headline-required", "Supply at least one nonempty, attributed headline line."));
  if (Array.isArray(input.headline) && input.headline.length > 0 &&
    (input.layout === "split-comparison" ? input.headline.length > 2 : input.headline.length > 3))
    issues.push(problem("thumbnail-headline-layout-limit",
      input.layout === "split-comparison"
        ? "A split comparison supports at most two headline lines above its subjects."
        : "A single-subject editorial layout supports at most three headline lines, keeping the cue and artboard clear."));
  if (!validAsset(input.primary) || (input.background && !validAsset(input.background)))
    issues.push(problem("thumbnail-asset-invalid", "Supplied image assets must have valid id, URI, MIME type and alt text."));
  if (input.layout === "split-comparison" && !input.secondary)
    issues.push(problem("thumbnail-secondary-required", "A split comparison needs two distinct source visuals."));
  if (input.secondary && !validAsset(input.secondary))
    issues.push(problem("thumbnail-asset-invalid", "Secondary source visual is invalid."));
  if (typeof input.font?.id !== "string" || !input.font.id.trim() ||
    typeof input.font?.family !== "string" || !input.font.family.trim())
    issues.push(problem("thumbnail-font-invalid", "Declare the editable headline font."));
  if (input.cue !== undefined && typeof input.cue !== "string")
    issues.push(problem("thumbnail-cue-invalid", "Optional cue text must be a string."));

  const props = Array.isArray(input.props) ? input.props : [];
  if (input.props !== undefined && !Array.isArray(input.props))
    issues.push(problem("thumbnail-props-invalid", "Graphic props must be an array."));

  const assetIds = new Set<string>();
  for (const asset of [input.primary, input.secondary, input.background, ...props.map((prop) => prop?.image)]) {
    if (!asset) continue;
    if (!validAsset(asset)) continue; // the specific invalid image is diagnosed above or below
    if (assetIds.has(asset.id)) issues.push(problem("thumbnail-asset-id-duplicate", `Visual ${asset.id} has a duplicate asset ID.`));
    assetIds.add(asset.id);
  }
  const propIds = new Set<string>();
  for (const prop of props) {
    if (!prop || typeof prop !== "object") {
      issues.push(problem("thumbnail-prop-id-invalid", "Graphic props must be objects with distinct slug IDs."));
      continue;
    }
    if (typeof prop.id !== "string" || !ID.test(prop.id) || propIds.has(prop.id))
      issues.push(problem("thumbnail-prop-id-invalid", "Every graphic prop needs a distinct slug ID."));
    propIds.add(prop.id);
    if (!validAsset(prop.image)) issues.push(problem("thumbnail-asset-invalid", `Graphic prop ${prop.id} has an invalid source image.`));
    const { x, y, width, height } = prop.frame ?? { x: NaN, y: NaN, width: NaN, height: NaN };
    if (![x, y, width, height].every(Number.isFinite) || x < 0 || y < 0 || width <= 0 || height <= 0 ||
      x + width > 1 || y + height > 1)
      issues.push(problem("thumbnail-prop-frame-invalid", `Graphic prop ${prop.id} must fit inside normalized canvas [0,1].`));
    if (prop.opacity !== undefined && (!Number.isFinite(prop.opacity) || prop.opacity < 0 || prop.opacity > 1))
      issues.push(problem("thumbnail-prop-opacity-invalid", `Graphic prop ${prop.id} opacity must be between 0 and 1.`));
    if (prop.z !== undefined && !Number.isFinite(prop.z))
      issues.push(problem("thumbnail-prop-z-invalid", `Graphic prop ${prop.id} needs a finite stacking order.`));
  }
  const palette = { ...DEFAULT_PALETTE, ...input.palette };
  if (Object.values(palette).some((color) => !/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(color)))
    issues.push(problem("thumbnail-palette-invalid", "Use portable literal hex palette values."));
  if (issues.length) throw new ThumbnailCompositionError(issues);
  return palette;
}

/** Compile a photo-led, type-led thumbnail to portable, individually editable M0 layers. */
export function composeEditorialThumbnail(input: EditorialThumbnailInput): EditorialThumbnailResult {
  const palette = validate(input);
  const split = input.layout === "split-comparison";
  const subjectLeft = input.layout === "subject-left";
  const layers: Layer[] = [];
  const assets: Record<string, ImageAsset> = {};
  function addAsset(asset: ImageAsset) { assets[asset.id] = { ...asset }; }

  if (input.background) {
    addAsset(input.background);
    layers.push(media("background", "Full-bleed background", input.background,
      { x: 0, y: 0, width: WIDTH, height: HEIGHT }, 0, { fit: "cover", decorative: true }));
  }
  addAsset(input.primary);
  const primaryFrame = split ? { x: 32, y: 178, width: 575, height: 488 }
    : subjectLeft ? { x: 24, y: 96, width: 678, height: 569 }
      : { x: 627, y: 82, width: 622, height: 584 };
  layers.push(media("subject-primary", "Hero subject", input.primary, primaryFrame, 20, { shadow: true }));
  if (split && input.secondary) {
    addAsset(input.secondary);
    layers.push(media("subject-secondary", "Comparison subject", input.secondary,
      { x: 678, y: 178, width: 570, height: 488 }, 20, { shadow: true }));
  }

  for (const prop of input.props ?? []) {
    addAsset(prop.image);
    layers.push(media(`prop-${prop.id}`, `Editorial prop ${prop.id}`, prop.image,
      { x: round(prop.frame.x * WIDTH), y: round(prop.frame.y * HEIGHT),
        width: round(prop.frame.width * WIDTH), height: round(prop.frame.height * HEIGHT) },
      prop.z ?? 30, { decorative: true, opacity: prop.opacity }));
  }

  const headlineIds: string[] = [];
  input.headline.forEach((line, index) => {
    const id = `headline-${index}`;
    headlineIds.push(id);
    let rect: Rect;
    let size: number;
    if (split) {
      const side = index % 2;
      rect = { x: side ? 710 : 68, y: 46 + Math.floor(index / 2) * 106,
        width: 514, height: 103 };
      size = line.scale === "secondary" ? 85 : 102;
    } else {
      rect = { x: subjectLeft ? 718 : 62, y: 136 + index * 120,
        width: subjectLeft ? 500 : 560, height: 112 };
      size = line.scale === "secondary" ? 80 : 107;
    }
    layers.push(headline(id, line, rect, input.font, palette, size));
  });
  if (input.cue?.trim()) {
    const cueLayer = headline("cue", { text: input.cue.trim(), tone: "accent", scale: "secondary" },
      split ? { x: 461, y: 578, width: 358, height: 106 } :
        { x: subjectLeft ? 721 : 68, y: 510, width: 520, height: 102 },
      input.font, palette, split ? 76 : 76);
    if (split) cueLayer.text.align = "center";
    layers.push(cueLayer);
  }

  const roles: EditorialThumbnailResult["roles"] = {
    primaryId: "subject-primary", headlineId: "headline-0", headlineIds,
    ...(split ? { secondaryId: "subject-secondary" } : {}),
    ...(input.cue?.trim() ? { cueId: "cue" } : {}),
  };
  const document = createDocument({
    id: input.id,
    artboard: { id: `${input.id}-artboard`, width: WIDTH, height: HEIGHT,
      background: palette.background, safeRegion: defaultSafeRegion({ width: WIDTH, height: HEIGHT }) },
    assets, fonts: { [input.font.id]: { ...input.font } }, layers,
    metadata: { title: input.headline.map((line) => line.text).join(" "), locale: "und" },
  });
  const issues = validateDocument(document).filter((issue) => issue.severity === "error");
  if (issues.length) throw new ThumbnailCompositionError(issues);
  return { document, recipe: "editorial", layout: input.layout, roles };
}
