/**
 * Showcase fixtures for the Kumiki media foundation.
 *
 * These are *data*, not library code: no registry item imports this module. It
 * exists so the stories, unit tests, visual baselines and the composition
 * showcase all exercise the same documents — which is what makes "the preview
 * and the export cannot drift" checkable instead of aspirational.
 *
 * Two deliberate rules:
 *
 * - **Every asset is an inline `data:` URI.** The foundation forbids implicit
 *   network fetches, and a cross-origin asset would taint the raster canvas
 *   anyway, so a self-contained document is the only kind we can honestly
 *   export in a test.
 * - **Colours are literal hex values, not `var(--km-*)` tokens.** A document is
 *   serialized to SVG/PNG and rendered outside the app's cascade, so a token
 *   reference would silently resolve to nothing. The showcase may re-theme a
 *   copy of a fixture, but the fixture itself must stand alone.
 *
 * The composition ids are intentionally generic (`wide-hero`, `square-promo`).
 * Nothing here names a customer, a platform or an industry; the showcase labels
 * a composition with a use case at the point of use.
 */

import type {
  Diagnostic,
  FontAsset,
  ImageAsset,
  Layer,
  MediaDocument,
  ShapeSpec,
  TextSpec,
} from "./document";
import { createDocument, retargetArtboard } from "./document";

/**
 * Neutral, export-safe palette. Chosen for contrast rather than brand: the ink
 * and canvas pair clears 4.5:1, and the accent clears 3:1 against both so the
 * fixture is legible even before a consumer re-themes it.
 */
export const FIXTURE_PALETTE = {
  ink: "#101418",
  canvas: "#f6f6f4",
  surface: "#e6e6e1",
  accent: "#2f6f4f",
  muted: "#5c6360",
  highlight: "#f2c14e",
  white: "#ffffff",
} as const;

/**
 * A deterministic inline SVG used as a stand-in photograph. It is a real,
 * decodable image at a known intrinsic size, so fit/focal-point/crop behaviour
 * can be asserted instead of eyeballed.
 *
 * The artwork is deliberately composed rather than a flat wash: a gradient
 * field, a horizon split, a focal sun with a halo, two overlapping ridges and a
 * foreground capsule. Every shape is derived from `width`/`height` with integer
 * arithmetic and the two supplied colours, so the same inputs always yield a
 * byte-identical string (no randomness, clock or locale involvement). It stays
 * a self-contained `image/svg+xml` data URI: the only absolute reference is the
 * SVG namespace, never a network fetch.
 */
export function gradientDataUri(
  label: string,
  width: number,
  height: number,
  from: string,
  to: string
): string {
  const shortest = Math.min(width, height);
  const horizon = Math.round(height * 0.62);
  const focalX = Math.round(width * 0.68);
  const focalY = Math.round(height * 0.3);
  const sunRadius = Math.round(shortest * 0.14);
  const haloRadius = Math.round(shortest * 0.32);
  const capsuleHeight = Math.round(height * 0.09);
  const ink = FIXTURE_PALETTE.ink;
  const white = FIXTURE_PALETTE.white;
  const safeLabel = label.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<defs>` +
    `<linearGradient id="field" x1="0" y1="0" x2="0.4" y2="1">` +
    `<stop offset="0" stop-color="${from}"/><stop offset="0.55" stop-color="${to}"/><stop offset="1" stop-color="${ink}"/>` +
    `</linearGradient>` +
    `<radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">` +
    `<stop offset="0" stop-color="${white}" stop-opacity="0.5"/><stop offset="1" stop-color="${white}" stop-opacity="0"/>` +
    `</radialGradient>` +
    `</defs>` +
    `<rect width="${width}" height="${height}" fill="url(#field)"/>` +
    `<rect y="${horizon}" width="${width}" height="${height - horizon}" fill="${ink}" fill-opacity="0.4"/>` +
    `<circle cx="${focalX}" cy="${focalY}" r="${haloRadius}" fill="url(#glow)"/>` +
    `<circle cx="${focalX}" cy="${focalY}" r="${sunRadius}" fill="${white}" fill-opacity="0.92"/>` +
    `<path d="M0 ${horizon} L${Math.round(width * 0.34)} ${Math.round(height * 0.44)} L${Math.round(
      width * 0.7
    )} ${horizon} Z" fill="${from}" fill-opacity="0.5"/>` +
    `<path d="M${Math.round(width * 0.3)} ${horizon} L${Math.round(width * 0.62)} ${Math.round(
      height * 0.5
    )} L${width} ${horizon} Z" fill="${ink}" fill-opacity="0.55"/>` +
    `<ellipse cx="${Math.round(width * 0.22)}" cy="${height}" rx="${Math.round(width * 0.36)}" ry="${Math.round(
      height * 0.24
    )}" fill="${to}" fill-opacity="0.55"/>` +
    `<rect x="${Math.round(width * 0.05)}" y="${Math.round(height * 0.74)}" width="${Math.round(
      width * 0.55
    )}" height="${capsuleHeight}" rx="${Math.round(capsuleHeight / 2)}" fill="${white}" fill-opacity="0.16"/>` +
    `<text x="${Math.round(width * 0.06)}" y="${Math.round(height * 0.95)}" font-family="sans-serif" font-size="${Math.round(
      shortest * 0.052
    )}" fill="${white}" fill-opacity="0.82">${safeLabel}</text>` +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Font registry used by the fixtures.
 *
 * `Geist Variable` and `Newsreader Variable` are genuinely loaded by the
 * showcase, the CJK entry resolves to the platform chain, and
 * `Unpinned Grotesk` is deliberately **not** available: it exists so the
 * missing-font warning path has a real, non-fabricated case to report.
 */
export const FIXTURE_FONTS: Record<string, FontAsset> = {
  "font-sans": {
    id: "font-sans",
    family: "Geist Variable",
    weight: 400,
    style: "normal",
    fallback: ["system-ui", "sans-serif"],
    availability: "pinned",
    licenseId: "OFL-1.1",
    attribution: "Geist, via the showcase font bundle",
  },
  "font-serif": {
    id: "font-serif",
    family: "Newsreader Variable",
    weight: 400,
    style: "normal",
    fallback: ["Georgia", "serif"],
    availability: "pinned",
    licenseId: "OFL-1.1",
    attribution: "Newsreader, via the showcase font bundle",
  },
  "font-cjk": {
    id: "font-cjk",
    family: "Hiragino Sans",
    weight: 400,
    style: "normal",
    fallback: ["Noto Sans CJK JP", "Yu Gothic", "sans-serif"],
    availability: "system",
  },
  "font-unpinned": {
    id: "font-unpinned",
    family: "Unpinned Grotesk",
    weight: 500,
    style: "normal",
    fallback: ["system-ui", "sans-serif"],
    availability: "unknown",
  },
};

/** Asset registry. Intrinsic sizes are declared so fit/crop maths is checkable. */
export const FIXTURE_ASSETS: Record<string, ImageAsset> = {
  "asset-landscape": {
    id: "asset-landscape",
    uri: gradientDataUri("landscape", 1600, 900, "#2f6f4f", "#101418"),
    mediaType: "image/svg+xml",
    width: 1600,
    height: 900,
    sha256: "fixture-landscape",
    licenseId: "CC0-1.0",
    attribution: "Generated placeholder",
    alt: "Abstract landscape gradient with a pale disc",
  },
  "asset-portrait": {
    id: "asset-portrait",
    uri: gradientDataUri("portrait", 900, 1600, "#8a5a2b", "#f2c14e"),
    mediaType: "image/svg+xml",
    width: 900,
    height: 1600,
    sha256: "fixture-portrait",
    licenseId: "CC0-1.0",
    attribution: "Generated placeholder",
    alt: "Abstract vertical gradient",
  },
  "asset-square": {
    id: "asset-square",
    uri: gradientDataUri("square", 1200, 1200, "#1f3b5c", "#5c6360"),
    mediaType: "image/svg+xml",
    width: 1200,
    height: 1200,
    sha256: "fixture-square",
    licenseId: "CC0-1.0",
    attribution: "Generated placeholder",
  },
  "asset-decorative": {
    id: "asset-decorative",
    uri: gradientDataUri("texture", 800, 800, "#e6e6e1", "#f6f6f4"),
    mediaType: "image/svg+xml",
    width: 800,
    height: 800,
    sha256: "fixture-decorative",
  },
};

/** Every fixture shares this registry unless it overrides `assets`. */
export const FIXTURE_FONT_REGISTRY: Record<string, FontAsset> = FIXTURE_FONTS;
export const FIXTURE_ASSET_REGISTRY: Record<string, ImageAsset> = FIXTURE_ASSETS;

interface RectInput {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  anchorX?: number;
  anchorY?: number;
}

interface BaseOptions {
  z?: number;
  parentId?: string | null;
  semanticId?: string;
  visible?: boolean;
  locked?: boolean;
  opacity?: number;
  blend?: Layer["blend"];
  clip?: boolean;
  summary?: string;
}

function base(
  id: string,
  name: string,
  kind: Layer["kind"],
  rect: RectInput,
  options: BaseOptions = {}
): Omit<Layer, "kind"> & { kind: Layer["kind"] } {
  return {
    id,
    name,
    kind,
    semanticId: options.semanticId ?? id,
    parentId: options.parentId ?? null,
    transform: { ...rect },
    z: options.z ?? 0,
    visible: options.visible ?? true,
    locked: options.locked ?? false,
    opacity: options.opacity ?? 1,
    blend: options.blend ?? "normal",
    clip: options.clip ?? false,
    summary: options.summary,
  } as Omit<Layer, "kind"> & { kind: Layer["kind"] };
}

interface TextInput extends BaseOptions {
  id: string;
  name: string;
  rect: RectInput;
  text: Partial<TextSpec> & { spans: TextSpec["spans"] };
}

function textLayer({ id, name, rect, text, ...options }: TextInput): Layer {
  const spec: TextSpec = {
    fontId: "font-sans",
    size: 32,
    lineHeight: 1.25,
    letterSpacing: 0,
    align: "start",
    direction: "auto",
    fit: "wrap",
    as: "p",
    ...text,
  };
  return { ...base(id, name, "text", rect, options), kind: "text", text: spec } as Layer;
}

interface ShapeInput extends BaseOptions {
  id: string;
  name: string;
  rect: RectInput;
  shape: ShapeSpec;
}

function shapeLayer({ id, name, rect, shape, ...options }: ShapeInput): Layer {
  return { ...base(id, name, "shape", rect, options), kind: "shape", shape } as Layer;
}

interface MediaInput extends BaseOptions {
  id: string;
  name: string;
  rect: RectInput;
  assetId: keyof typeof FIXTURE_ASSETS | string;
  fit?: "cover" | "contain" | "fill" | "none";
  focalPoint?: { x: number; y: number };
  mask?: { kind: "none" | "rounded" | "circle" | "inset"; radius?: number; inset?: { top: number; right: number; bottom: number; left: number } };
  crop?: { top: number; right: number; bottom: number; left: number };
  alt?: string;
  decorative?: boolean;
}

function mediaLayer({ id, name, rect, assetId, fit, focalPoint, mask, crop, alt, decorative, ...options }: MediaInput): Layer {
  return {
    ...base(id, name, "media", rect, options),
    kind: "media",
    media: {
      assetId,
      fit: fit ?? "cover",
      focalPoint: focalPoint ?? { x: 0.5, y: 0.5 },
      mask: mask ?? { kind: "none" },
      crop,
      alt,
      decorative,
    },
  } as Layer;
}

function groupLayer(
  id: string,
  name: string,
  rect: RectInput,
  options: BaseOptions = {}
): Layer {
  return { ...base(id, name, "group", rect, options), kind: "group" } as Layer;
}

/* ------------------------------------------------------------------ *
 * Valid documents
 * ------------------------------------------------------------------ */

/** 16:9 title composition: artboard + media + heading + supporting copy. */
export const wideHeroDocument: MediaDocument = createDocument({
  id: "wide-hero",
  artboard: {
    preset: "16:9",
    background: FIXTURE_PALETTE.ink,
    safeRegion: 0.05,
    bleed: 0,
    crop: 0,
  },
  fonts: FIXTURE_FONTS,
  assets: FIXTURE_ASSETS,
  grid: { visible: true, size: 16, subdivisions: 4 },
  guides: [
    { id: "guide-x-margin", axis: "x", position: 80 },
    { id: "guide-x-media", axis: "x", position: 640 },
    { id: "guide-y-baseline", axis: "y", position: 96 },
  ],
  metadata: {
    title: "Wide hero",
    authoringTool: "kumiki-ui fixtures",
    aspectVariant: "16:9",
    locale: "en",
  },
  layers: [
    shapeLayer({
      id: "hero-field",
      name: "Field",
      rect: { x: 0, y: 0, width: 1280, height: 720 },
      shape: { kind: "rect", fill: FIXTURE_PALETTE.ink },
      z: 0,
      locked: true,
      summary: "Full-bleed ink field",
    }),
    mediaLayer({
      id: "hero-visual",
      name: "Visual",
      rect: { x: 640, y: 0, width: 640, height: 720 },
      assetId: "asset-landscape",
      fit: "cover",
      focalPoint: { x: 0.62, y: 0.45 },
      mask: { kind: "none" },
      z: 1,
    }),
    shapeLayer({
      id: "hero-accent",
      name: "Accent rule",
      rect: { x: 80, y: 128, width: 96, height: 8 },
      shape: { kind: "rect", fill: FIXTURE_PALETTE.highlight },
      z: 2,
      summary: "Accent rule above the heading",
    }),
    textLayer({
      id: "hero-title",
      name: "Heading",
      rect: { x: 80, y: 168, width: 520, height: 220 },
      z: 3,
      text: {
        spans: [{ text: "Compose once, render anywhere", color: FIXTURE_PALETTE.white }],
        size: 76,
        lineHeight: 1.06,
        fit: "shrink",
        minSize: 44,
        maxSize: 76,
        maxLines: 3,
        as: "h1",
      },
      summary: "Primary heading",
    }),
    textLayer({
      id: "hero-caption",
      name: "Caption",
      rect: { x: 80, y: 520, width: 480, height: 96 },
      z: 4,
      text: {
        spans: [
          { text: "Renderer-neutral layouts with ", color: FIXTURE_PALETTE.surface },
          { text: "measured", italic: true, color: FIXTURE_PALETTE.highlight },
          { text: " typography", color: FIXTURE_PALETTE.surface },
        ],
        size: 28,
        lineHeight: 1.35,
        fit: "wrap",
        maxLines: 3,
        as: "p",
      },
      summary: "Supporting caption with a highlighted word",
    }),
  ],
});

/** 1:1 composition with a centred title and a bottom badge. */
export const squarePromoDocument: MediaDocument = createDocument({
  id: "square-promo",
  artboard: { preset: "1:1", background: FIXTURE_PALETTE.canvas, safeRegion: 0.05 },
  fonts: FIXTURE_FONTS,
  assets: FIXTURE_ASSETS,
  metadata: { title: "Square promo", aspectVariant: "1:1", locale: "en" },
  layers: [
    mediaLayer({
      id: "promo-visual",
      name: "Visual",
      rect: { x: 0, y: 0, width: 1080, height: 1080 },
      assetId: "asset-square",
      fit: "cover",
      focalPoint: { x: 0.5, y: 0.4 },
      mask: { kind: "none" },
      z: 0,
    }),
    shapeLayer({
      id: "promo-scrim",
      name: "Scrim",
      rect: { x: 0, y: 480, width: 1080, height: 600 },
      shape: { kind: "rect", fill: FIXTURE_PALETTE.ink },
      opacity: 0.72,
      blend: "multiply",
      z: 1,
      summary: "Translucent scrim for text contrast",
    }),
    textLayer({
      id: "promo-title",
      name: "Headline",
      rect: { x: 96, y: 640, width: 888, height: 260 },
      z: 2,
      text: {
        spans: [{ text: "A square that still reads at 96 px", color: FIXTURE_PALETTE.white }],
        size: 92,
        lineHeight: 1.08,
        fit: "shrink",
        minSize: 52,
        maxSize: 92,
        maxLines: 3,
        align: "start",
        as: "h2",
      },
      summary: "Square composition headline",
    }),
    shapeLayer({
      id: "promo-badge",
      name: "Badge",
      rect: { x: 96, y: 96, width: 264, height: 72 },
      shape: { kind: "rect", fill: FIXTURE_PALETTE.highlight, radius: 36 },
      z: 3,
    }),
    textLayer({
      id: "promo-badge-label",
      name: "Badge label",
      rect: { x: 128, y: 118, width: 200, height: 32 },
      z: 4,
      text: {
        spans: [{ text: "New in M0", color: FIXTURE_PALETTE.ink }],
        size: 24,
        lineHeight: 1.2,
        fit: "clip",
        maxLines: 1,
        as: "span",
      },
      summary: "Badge label",
    }),
  ],
});

/** 9:16 composition: the same message reframed, not stretched. */
export const verticalStoryDocument: MediaDocument = createDocument({
  id: "vertical-story",
  artboard: { preset: "9:16", background: FIXTURE_PALETTE.ink, safeRegion: 0.05 },
  fonts: FIXTURE_FONTS,
  assets: FIXTURE_ASSETS,
  metadata: { title: "Vertical story", aspectVariant: "9:16", locale: "en" },
  layers: [
    mediaLayer({
      id: "story-visual",
      name: "Visual",
      rect: { x: 0, y: 0, width: 1080, height: 1280 },
      assetId: "asset-portrait",
      fit: "cover",
      focalPoint: { x: 0.5, y: 0.28 },
      mask: { kind: "none" },
      z: 0,
    }),
    shapeLayer({
      id: "story-field",
      name: "Lower field",
      rect: { x: 0, y: 1280, width: 1080, height: 640 },
      shape: { kind: "rect", fill: FIXTURE_PALETTE.ink },
      z: 1,
    }),
    textLayer({
      id: "story-title",
      name: "Headline",
      rect: { x: 96, y: 1400, width: 888, height: 300 },
      z: 2,
      text: {
        spans: [{ text: "Vertical is a reflow, never a stretch", color: FIXTURE_PALETTE.white }],
        size: 88,
        lineHeight: 1.08,
        fit: "shrink",
        minSize: 44,
        maxSize: 88,
        maxLines: 4,
        as: "h1",
      },
      summary: "Vertical composition headline",
    }),
    textLayer({
      id: "story-cta",
      name: "Call to action",
      rect: { x: 96, y: 1740, width: 600, height: 72 },
      z: 3,
      text: {
        spans: [{ text: "Swipe to continue", color: FIXTURE_PALETTE.highlight }],
        size: 32,
        lineHeight: 1.25,
        fit: "wrap",
        maxLines: 1,
        as: "p",
      },
      summary: "Call to action",
    }),
  ],
});

/**
 * Editorial composition: a grouped image band with an overlaid caption, a serif
 * heading and a Japanese subhead in one document. It exercises grouping,
 * clipping, a serif face, CJK segmentation and multi-layer paint order at once.
 */
export const editorialSpreadDocument: MediaDocument = createDocument({
  id: "editorial-spread",
  artboard: { preset: "16:10", background: FIXTURE_PALETTE.canvas, safeRegion: 0.05 },
  fonts: FIXTURE_FONTS,
  assets: FIXTURE_ASSETS,
  guides: [
    { id: "guide-y-gutter", axis: "y", position: 640 },
    { id: "guide-x-column", axis: "x", position: 800 },
  ],
  metadata: {
    title: "Editorial spread",
    aspectVariant: "16:10",
    locale: "en",
    notes: ["Grouped image band with an overlaid caption"],
  },
  layers: [
    groupLayer(
      "band",
      "Image band",
      { x: 0, y: 0, width: 1600, height: 640 },
      { z: 0, clip: true, opacity: 1, summary: "Clipped image band" }
    ),
    mediaLayer({
      id: "band-left",
      name: "Plate 1",
      rect: { x: 0, y: 0, width: 1040, height: 640 },
      parentId: "band",
      assetId: "asset-landscape",
      fit: "cover",
      focalPoint: { x: 0.35, y: 0.5 },
      mask: { kind: "none" },
      z: 0,
    }),
    mediaLayer({
      id: "band-right",
      name: "Plate 2",
      rect: { x: 1060, y: 0, width: 540, height: 640 },
      parentId: "band",
      assetId: "asset-portrait",
      fit: "cover",
      focalPoint: { x: 0.5, y: 0.42 },
      mask: { kind: "rounded", radius: 8 },
      z: 1,
    }),
    shapeLayer({
      id: "plate-caption-field",
      name: "Caption field",
      rect: { x: 0, y: 520, width: 1040, height: 120 },
      parentId: "band",
      shape: { kind: "rect", fill: FIXTURE_PALETTE.ink },
      opacity: 0.8,
      z: 2,
    }),
    textLayer({
      id: "plate-caption",
      name: "Plate caption",
      rect: { x: 32, y: 556, width: 976, height: 48 },
      parentId: "band",
      z: 3,
      text: {
        spans: [{ text: "Plate 1 — image band, clipped to the group", color: FIXTURE_PALETTE.white }],
        size: 24,
        lineHeight: 1.3,
        fit: "clip",
        maxLines: 1,
        as: "p",
      },
      summary: "Caption over the image band",
    }),
    textLayer({
      id: "editorial-title",
      name: "Heading",
      rect: { x: 80, y: 720, width: 720, height: 160 },
      z: 4,
      text: {
        spans: [{ text: "A spread that keeps its proportions", color: FIXTURE_PALETTE.ink }],
        fontId: "font-serif",
        size: 64,
        lineHeight: 1.12,
        fit: "shrink",
        minSize: 36,
        maxSize: 64,
        maxLines: 2,
        as: "h1",
      },
      summary: "Serif editorial heading",
    }),
    textLayer({
      id: "editorial-subhead",
      name: "Subhead",
      rect: { x: 80, y: 900, width: 720, height: 72 },
      z: 5,
      text: {
        spans: [{ text: "組版は編集時に組み替え、書き出しは固定サイズで行います。", color: FIXTURE_PALETTE.muted }],
        fontId: "font-cjk",
        size: 28,
        lineHeight: 1.6,
        fit: "wrap",
        maxLines: 2,
        language: "ja",
        as: "p",
      },
      summary: "Japanese subhead",
    }),
    shapeLayer({
      id: "editorial-rule",
      name: "Column rule",
      rect: { x: 840, y: 720, width: 2, height: 260 },
      shape: { kind: "line", stroke: FIXTURE_PALETTE.muted, strokeWidth: 2 },
      z: 6,
    }),
    textLayer({
      id: "editorial-note",
      name: "Side note",
      rect: { x: 880, y: 720, width: 640, height: 260 },
      z: 7,
      text: {
        spans: [
          { text: "Notes stay editable so a later variant can reuse the same ", color: FIXTURE_PALETTE.muted },
          { text: "semanticId", color: FIXTURE_PALETTE.accent, weight: 500 },
          { text: " instead of rebuilding the layout.", color: FIXTURE_PALETTE.muted },
        ],
        size: 26,
        lineHeight: 1.5,
        fit: "wrap",
        maxLines: 8,
        as: "p",
      },
      summary: "Side note",
    }),
  ],
});

/**
 * Hard-typography fixture: a long CJK sentence, right-to-left copy, an emoji
 * run, a combining mark and an unbreakable URL. Nothing here is decorative —
 * each entry is a documented failure mode from the quality gates.
 */
export const multilingualDocument: MediaDocument = createDocument({
  id: "multilingual",
  artboard: { preset: "4:5", background: FIXTURE_PALETTE.canvas, safeRegion: 0.05 },
  fonts: FIXTURE_FONTS,
  assets: FIXTURE_ASSETS,
  metadata: { title: "Localised copy", aspectVariant: "4:5", locale: "ja" },
  layers: [
    textLayer({
      id: "ml-cjk-title",
      name: "Japanese heading",
      rect: { x: 72, y: 96, width: 936, height: 300 },
      z: 0,
      text: {
        spans: [
          {
            text: "日本語の見出しは単語の区切りがなくても正しく折り返されます。",
            color: FIXTURE_PALETTE.ink,
          },
        ],
        fontId: "font-cjk",
        size: 72,
        lineHeight: 1.4,
        fit: "shrink",
        minSize: 40,
        maxSize: 72,
        maxLines: 3,
        language: "ja",
        as: "h1",
      },
      summary: "Japanese heading",
    }),
    textLayer({
      id: "ml-rtl",
      name: "Right-to-left copy",
      rect: { x: 72, y: 440, width: 936, height: 160 },
      z: 1,
      text: {
        spans: [{ text: "النص العربي يُعرض من اليمين إلى اليسار مع الحفاظ على التشكيل.", color: FIXTURE_PALETTE.ink }],
        fontId: "font-sans",
        size: 36,
        lineHeight: 1.6,
        direction: "rtl",
        language: "ar",
        fit: "wrap",
        maxLines: 2,
        as: "p",
      },
      summary: "Right-to-left paragraph",
    }),
    textLayer({
      id: "ml-emoji",
      name: "Emoji run",
      rect: { x: 72, y: 640, width: 936, height: 120 },
      z: 2,
      text: {
        spans: [
          { text: "Family run: ", color: FIXTURE_PALETTE.muted },
          { text: "👩‍👩‍👧‍👦 🇯🇵 é́", color: FIXTURE_PALETTE.ink },
        ],
        size: 40,
        lineHeight: 1.4,
        fit: "wrap",
        maxLines: 2,
        as: "p",
      },
      summary: "Emoji, flag and combining marks",
    }),
    textLayer({
      id: "ml-url",
      name: "Unbreakable URL",
      rect: { x: 72, y: 800, width: 480, height: 120 },
      z: 3,
      text: {
        spans: [
          {
            text: "https://example.invalid/a/very/long/unbreakable/path/that/should/not/overflow/the/box/at/any/zoom",
            color: FIXTURE_PALETTE.accent,
            underline: true,
          },
        ],
        size: 22,
        lineHeight: 1.4,
        fit: "clip",
        maxLines: 4,
        as: "p",
      },
      summary: "Long unbreakable URL",
    }),
    textLayer({
      id: "ml-unpinned",
      name: "Unpinned face note",
      rect: { x: 72, y: 960, width: 480, height: 120 },
      z: 4,
      text: {
        spans: [{ text: "Set in an unpinned face", color: FIXTURE_PALETTE.muted }],
        fontId: "font-unpinned",
        size: 28,
        lineHeight: 1.4,
        fit: "wrap",
        maxLines: 2,
        as: "p",
      },
      summary: "Text that depends on a font the environment may not have",
    }),
  ],
});

/** Artboard only. The honest empty state for every consumer. */
export const emptyDocument: MediaDocument = createDocument({
  id: "empty",
  artboard: { preset: "1:1", background: FIXTURE_PALETTE.canvas, safeRegion: 0.05 },
  fonts: FIXTURE_FONTS,
  assets: FIXTURE_ASSETS,
  metadata: { title: "Empty composition", aspectVariant: "1:1" },
  layers: [],
});

/* ------------------------------------------------------------------ *
 * Negative fixtures
 *
 * Each one is deliberately invalid or hostile, and each names the detector it
 * is meant to trip (docs/04: "every detector must catch its named fixture").
 * The cast is explicit so the intent is obvious at the call site.
 * ------------------------------------------------------------------ */

/** Trips `layer-overflow` plus geometric collision and a 10 px label. */
export const overflowDocument: MediaDocument = createDocument({
  id: "negative-overflow",
  artboard: { preset: "1:1", background: FIXTURE_PALETTE.canvas },
  fonts: FIXTURE_FONTS,
  assets: FIXTURE_ASSETS,
  metadata: { title: "Overflow", aspectVariant: "1:1" },
  layers: [
    mediaLayer({
      id: "over-visual",
      name: "Off-canvas plate",
      rect: { x: 980, y: 940, width: 640, height: 480 },
      assetId: "asset-landscape",
      z: 0,
    }),
    textLayer({
      id: "over-label",
      name: "Critical 10 px label",
      rect: { x: 8, y: 8, width: 240, height: 16 },
      z: 1,
      text: {
        spans: [{ text: "Critical label at 10 px", color: FIXTURE_PALETTE.ink }],
        size: 10,
        lineHeight: 1.1,
        fit: "clip",
        maxLines: 1,
        as: "p",
      },
      summary: "Legibility negative fixture",
    }),
    textLayer({
      id: "over-collide-a",
      name: "Overlapping label A",
      rect: { x: 100, y: 100, width: 400, height: 80 },
      z: 2,
      text: {
        spans: [{ text: "Overlapping label A", color: FIXTURE_PALETTE.ink }],
        size: 36,
        lineHeight: 1.2,
        fit: "wrap",
        as: "p",
      },
      summary: "Collision negative fixture A",
    }),
    textLayer({
      id: "over-collide-b",
      name: "Overlapping label B",
      rect: { x: 140, y: 120, width: 400, height: 80 },
      z: 3,
      text: {
        spans: [{ text: "Overlapping label B", color: FIXTURE_PALETTE.surface }],
        size: 36,
        lineHeight: 1.2,
        fit: "wrap",
        as: "p",
      },
      summary: "Collision negative fixture B",
    }),
  ],
});

/** Trips `media-asset-missing` and `text-font-missing`. */
export const danglingReferenceDocument: MediaDocument = createDocument({
  id: "negative-dangling",
  artboard: { preset: "1:1", background: FIXTURE_PALETTE.canvas },
  fonts: FIXTURE_FONTS,
  assets: FIXTURE_ASSETS,
  layers: [
    mediaLayer({
      id: "dangling-media",
      name: "Missing plate",
      rect: { x: 0, y: 0, width: 540, height: 540 },
      assetId: "asset-does-not-exist",
      z: 0,
    }),
    textLayer({
      id: "dangling-text",
      name: "Missing face",
      rect: { x: 0, y: 560, width: 540, height: 120 },
      z: 1,
      text: {
        spans: [{ text: "Uses a font that is not registered", color: FIXTURE_PALETTE.ink }],
        fontId: "font-does-not-exist",
        size: 32,
        fit: "wrap",
        as: "p",
      },
    }),
  ],
});

/** Trips `layer-id-duplicate` and `layer-parent-missing`. */
export const unsafeIdentityDocument: MediaDocument = {
  ...createDocument({
    id: "negative-identity",
    artboard: { preset: "1:1", background: FIXTURE_PALETTE.canvas },
    fonts: FIXTURE_FONTS,
    assets: FIXTURE_ASSETS,
  }),
  layers: [
    textLayer({
      id: "duplicate",
      name: "First",
      rect: { x: 0, y: 0, width: 200, height: 80 },
      z: 0,
      text: { spans: [{ text: "First" }], size: 32, fit: "wrap", as: "p" },
    }),
    textLayer({
      id: "duplicate",
      name: "Second",
      rect: { x: 0, y: 100, width: 200, height: 80 },
      z: 1,
      text: { spans: [{ text: "Second" }], size: 32, fit: "wrap", as: "p" },
    }),
    textLayer({
      id: "orphan",
      name: "Orphan",
      rect: { x: 0, y: 200, width: 200, height: 80 },
      parentId: "no-such-parent",
      z: 2,
      text: { spans: [{ text: "Orphan" }], size: 32, fit: "wrap", as: "p" },
    }),
  ],
} as MediaDocument;

/** Trips `layer-parent-cycle` (a → b → a) and `number-not-finite`. */
export const cyclicDocument: MediaDocument = {
  ...createDocument({
    id: "negative-cycle",
    artboard: { preset: "1:1", background: FIXTURE_PALETTE.canvas },
    fonts: FIXTURE_FONTS,
    assets: FIXTURE_ASSETS,
  }),
  layers: [
    groupLayer("cycle-a", "A", { x: 0, y: 0, width: 400, height: 400 }, { parentId: "cycle-b", z: 0 }),
    groupLayer("cycle-b", "B", { x: 0, y: 0, width: 400, height: 400 }, { parentId: "cycle-a", z: 1 }),
    textLayer({
      id: "cycle-nan",
      name: "NaN box",
      rect: { x: Number.NaN, y: 0, width: 200, height: 80 },
      z: 2,
      text: { spans: [{ text: "NaN" }], size: 32, fit: "wrap", as: "p" },
    }),
  ],
} as MediaDocument;

/** Trips `schema-version-unsupported`. */
export const futureSchemaDocument: MediaDocument = {
  ...createDocument({ id: "negative-schema", artboard: { preset: "1:1" } }),
  // Cast through `unknown`: an unsupported version is the point of this fixture,
  // so it cannot satisfy the current `MediaDocument` literal type by construction.
  schemaVersion: 99,
} as unknown as MediaDocument;

/** Name → document, for tests and the showcase's document picker. */
export const FIXTURE_DOCUMENTS = {
  "wide-hero": wideHeroDocument,
  "square-promo": squarePromoDocument,
  "vertical-story": verticalStoryDocument,
  "editorial-spread": editorialSpreadDocument,
  multilingual: multilingualDocument,
  empty: emptyDocument,
} as const satisfies Record<string, MediaDocument>;

export type FixtureId = keyof typeof FIXTURE_DOCUMENTS;

/** Ordered list for pickers and stories, with the label a consumer would show. */
export const FIXTURE_LIST: ReadonlyArray<{ id: FixtureId; label: string; document: MediaDocument }> = [
  { id: "wide-hero", label: "Wide hero — 16:9", document: wideHeroDocument },
  { id: "square-promo", label: "Square promo — 1:1", document: squarePromoDocument },
  { id: "vertical-story", label: "Vertical story — 9:16", document: verticalStoryDocument },
  { id: "editorial-spread", label: "Editorial spread — 16:10", document: editorialSpreadDocument },
  { id: "multilingual", label: "Localised copy — 4:5", document: multilingualDocument },
  { id: "empty", label: "Empty composition — 1:1", document: emptyDocument },
];

/** Invalid fixtures with the diagnostic code each one must produce. */
export const NEGATIVE_FIXTURES: ReadonlyArray<{
  id: string;
  label: string;
  document: MediaDocument;
  expectedCodes: readonly string[];
}> = [
  {
    id: "overflow",
    label: "Overflowing and colliding layers",
    document: overflowDocument,
    expectedCodes: ["layer-overflow"],
  },
  {
    id: "dangling",
    label: "Dangling asset and font references",
    document: danglingReferenceDocument,
    expectedCodes: ["media-asset-missing", "text-font-missing"],
  },
  {
    id: "identity",
    label: "Duplicate ids and an orphan parent",
    document: unsafeIdentityDocument,
    expectedCodes: ["layer-id-duplicate", "layer-parent-missing"],
  },
  {
    id: "cycle",
    label: "Parent cycle and a NaN box",
    document: cyclicDocument,
    expectedCodes: ["layer-parent-cycle", "number-not-finite"],
  },
  {
    id: "schema",
    label: "Unsupported schema version",
    document: futureSchemaDocument,
    expectedCodes: ["schema-version-unsupported"],
  },
];

/** Convenience for the showcase: reframe any fixture without mutating it. */
export function reframed(
  document: MediaDocument,
  preset: Parameters<typeof retargetArtboard>[1]
): { document: MediaDocument; diagnostics: Diagnostic[] } {
  const result = retargetArtboard(document, preset);
  return { document: result.document, diagnostics: result.diagnostics };
}
