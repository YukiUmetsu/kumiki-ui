/**
 * The M0 media document: artboard geometry, layers and typed payloads, plus
 * pure operations, validation and deterministic serialization.
 *
 * This is the **M0 subset** of the canonical scene contract in
 * docs/11-rendering-quality.md (section 3). It reuses that document's names and
 * shapes — `Rect`/`Transform`, `Layer`, `payload: { version, data }`,
 * `semanticId`, `assets`, `canvas` — and deliberately omits timing
 * (`fps`/`scenes`/`clips`), which matter only once motion exists. A still
 * `ArtboardDocument` later nests into a `Composition` scene unchanged; nothing
 * here redefines a doc-11 type.
 *
 * Rules that the rest of the foundation relies on:
 * - **No executable content.** The document is JSON data. There is no expression
 *   evaluation, template execution or implicit asset fetch.
 * - **Stable identity.** `id` is stable; `semanticId` marks an object that
 *   persists across variants and, later, scene boundaries. Re-rendering never
 *   regenerates either.
 * - **Deterministic output.** {@link normalizeDocument} orders layers, sorts map
 *   keys and rounds geometry, so {@link serializeDocument} is byte-stable and
 *   {@link documentDigest} is a usable fixture/cache key.
 * - **Explicit failure.** {@link deserializeDocument} and the document
 *   operations throw {@link ArtboardDocumentError} rather than silently
 *   dropping unsupported content.
 */

import {
  boundsOf,
  clamp01,
  getAspectPreset,
  isFiniteRect,
  rectOf,
  roundRect,
  type Rect,
  type Size,
} from "./media-geometry";

/** Structural version of the document; bumped only for breaking changes. */
export const ARTBOARD_SCHEMA_VERSION = 1;

/** A nonnegative integer frame. M0 stills use frame `0`; the type is future-safe. */
export type Frame = number;

/** Rational frames per second, e.g. `{ num: 30, den: 1 }`. Unused by M0 stills. */
export interface Fps {
  num: number;
  den: number;
}

/** How a layer is composited against the layers below it. */
export type BlendMode = "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten";

/** Local transform of a layer, relative to its parent group (or the artboard). */
export interface Transform extends Rect {
  /** Degrees, clockwise. */
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
}

// ---------------------------------------------------------------------------
// Typed payloads
// ---------------------------------------------------------------------------

/** Text wrapping/fit policy; deterministic, never measurement-guesswork at render time. */
export type TextFit = "wrap" | "shrink" | "clip" | "overflow";
/** Horizontal alignment inside the text box. */
export type TextAlign = "start" | "center" | "end";
/** Writing direction. `auto` resolves per-run from the Unicode bidi algorithm. */
export type TextDirection = "auto" | "ltr" | "rtl";

/**
 * One styled run of text. Concatenating `spans[].text` yields the layer's plain
 * text, which is what a text-as-text export or a screen reader reads.
 */
export interface TextSpan {
  text: string;
  fontFamily?: string;
  fontWeight?: number;
  italic?: boolean;
  /** Design-token or literal color. */
  color?: string;
  /** Overrides the layer base size, in design px. */
  fontSize?: number;
}

/** Payload for a `text` layer. */
export interface TextLayerData {
  /** Ordered spans; at least one. */
  spans: TextSpan[];
  /** Pinned font family; the fallback chain is `<family>, var(--km-font-cjk)`. */
  fontFamily: string;
  /** Base size in design px. */
  fontSize: number;
  fontWeight?: number;
  /** Multiple of `fontSize`, e.g. `1.4`. */
  lineHeight: number;
  /** Letter spacing in `em`. */
  letterSpacing?: number;
  align?: TextAlign;
  /** Wrap/fit policy. @default "wrap" */
  fit?: TextFit;
  /** Floor for `fit: "shrink"`, in design px. */
  minFontSize?: number;
  /** Hard line cap for `fit: "clip"`/`"shrink"`; overflow is reported by export preview. */
  maxLines?: number;
  direction?: TextDirection;
  /** Base color for spans that do not set their own. */
  color?: string;
  /** BCP-47 tag used for locale-aware segmentation (line breaking, CJK, hyphenation). */
  locale?: string;
}

/** How a referenced medium fills its frame. */
export type MediaFit = "cover" | "contain" | "fill" | "none";

/** Crop window in normalized source coordinates (`0..1`, top-left origin). */
export interface MediaCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Payload for an `image` layer. The referenced source's own dimensions are never mutated. */
export interface ImageLayerData {
  /** Key into {@link ArtboardDocument.assets}. */
  assetRef: string;
  /** @default "cover" */
  fit?: MediaFit;
  /** Normalized `0..1` focal point, applied by `cover`. @default { x: 0.5, y: 0.5 } */
  focalPoint?: { x: number; y: number };
  crop?: MediaCrop;
  /** Corner radius in design px, or a circle sized to the shorter edge. */
  radius?: number | "circle";
  /** Accessible description of the medium. Required unless `decorative`. */
  alt?: string;
  /** Marks the medium as purely decorative (`alt=""`; ignored by assistive tech). */
  decorative?: boolean;
  /** Reference to a mask asset in {@link ArtboardDocument.assets}. */
  maskAssetRef?: string;
}

/** Primitive shape kinds supported by the foundation. */
export type ShapeKind = "rectangle" | "ellipse" | "line";

/** Payload for a `shape` layer. */
export interface ShapeLayerData {
  shape: ShapeKind;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  /** Corner radius in design px (rectangles only). */
  radius?: number;
}

/** Payload for a `group` layer. */
export interface GroupLayerData {
  /** Clip children to the group's bounds instead of letting them overflow. */
  clip?: boolean;
}

/** Union of every M0 layer payload's `data`. */
export type LayerData = TextLayerData | ImageLayerData | ShapeLayerData | GroupLayerData;

/** Envelope shared by all payloads (matches docs/11 `payload: { version, data }`). */
export interface LayerPayload {
  version: typeof ARTBOARD_SCHEMA_VERSION;
  data: LayerData;
}

// ---------------------------------------------------------------------------
// Layers
// ---------------------------------------------------------------------------

/**
 * Per-aspect overrides. Authored, not derived: responsive output **reflows** a
 * layer here rather than stretching the whole frame, so a landscape composition
 * never becomes a distorted portrait one.
 */
export interface LayerLayoutVariant {
  transform?: Partial<Transform>;
  visible?: boolean;
  opacity?: number;
  /** Text-only override, e.g. a smaller base size for a narrow aspect. */
  text?: Partial<TextLayerData>;
}

/** Fields every layer carries, regardless of kind. */
export interface LayerBase {
  /** Stable identity; unique within the document. */
  id: string;
  /** Identity of an object that persists across variants/scenes. Optional. */
  semanticId?: string;
  /** Parent group id; absent means the layer sits directly on the artboard. */
  parentId?: string;
  transform: Transform;
  /** Paint order among siblings; lower paints first (behind). */
  z: number;
  /** @default true */
  visible?: boolean;
  /** Authoring-only: locked layers reject edits. @default false */
  locked?: boolean;
  /** @default 1 */
  opacity?: number;
  /** @default "normal" */
  blendMode?: BlendMode;
  /** Accessible one-line description of what this layer conveys. */
  summary?: string;
  /** Per-aspect reflow overrides, keyed by aspect preset id (e.g. `"9:16"`). */
  layouts?: Record<string, LayerLayoutVariant>;
}

export interface TextLayer extends LayerBase {
  kind: "text";
  payload: { version: typeof ARTBOARD_SCHEMA_VERSION; data: TextLayerData };
}

export interface ImageLayer extends LayerBase {
  kind: "image";
  payload: { version: typeof ARTBOARD_SCHEMA_VERSION; data: ImageLayerData };
}

export interface ShapeLayer extends LayerBase {
  kind: "shape";
  payload: { version: typeof ARTBOARD_SCHEMA_VERSION; data: ShapeLayerData };
}

export interface GroupLayer extends LayerBase {
  kind: "group";
  payload: { version: typeof ARTBOARD_SCHEMA_VERSION; data: GroupLayerData };
}

/** Discriminated union of every M0 layer. */
export type Layer = TextLayer | ImageLayer | ShapeLayer | GroupLayer;

/** Layer kind discriminator. */
export type LayerKind = Layer["kind"];

/** Nested render tree node: a layer plus its z-ordered children. */
export interface LayerNode {
  layer: Layer;
  children: LayerNode[];
}

// ---------------------------------------------------------------------------
// Assets and document
// ---------------------------------------------------------------------------

/**
 * A referenced medium. References only — never embedded file contents. `uri`
 * is resolved by the consumer's resolver; the foundation performs no fetch.
 */
export interface MediaAsset {
  uri: string;
  /** IANA media type, e.g. `image/png`, `video/mp4`, `image/svg+xml`. */
  mediaType: string;
  sha256?: string;
  /** Intrinsic width in px, when the medium has pixels. */
  width?: number;
  height?: number;
  licenseId?: string;
  attribution?: string;
  /** For font assets: the family this file provides. */
  fontFamily?: string;
  fontWeight?: number;
}

/** Artboard canvas. `fps` is optional and unused by M0 stills. */
export interface ArtboardCanvas {
  width: number;
  height: number;
  /** Background color token or literal. */
  background: string;
  fps?: Fps;
}

/** A complete M0 composition document. */
export interface ArtboardDocument {
  schemaVersion: typeof ARTBOARD_SCHEMA_VERSION;
  id: string;
  canvas: ArtboardCanvas;
  layers: Layer[];
  assets: Record<string, MediaAsset>;
  themeRef?: string;
  metadata?: {
    /** Aspect preset id this document was last reflowed to. */
    aspectVariant?: string;
    authoringTool?: string;
  };
}

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

/** A structured, actionable finding about a document. */
export interface DocumentDiagnostic {
  /** Stable machine code, e.g. `layer-cycle`, `referenced-asset-missing`. */
  code: string;
  severity: "error" | "warning";
  message: string;
  /** Layer the finding belongs to, when applicable. */
  layerId?: string;
}

/** Thrown when a document is invalid or an operation would break the contract. */
export class ArtboardDocumentError extends Error {
  readonly diagnostics: DocumentDiagnostic[];

  constructor(diagnostics: DocumentDiagnostic[]) {
    const first = diagnostics[0];
    super(first ? `${first.code}: ${first.message}` : "Invalid artboard document");
    this.name = "ArtboardDocumentError";
    this.diagnostics = diagnostics;
  }
}

const LAYER_KINDS: readonly LayerKind[] = ["text", "image", "shape", "group"];
const BLEND_MODES: readonly BlendMode[] = [
  "normal",
  "multiply",
  "screen",
  "overlay",
  "darken",
  "lighten",
];
const SHAPE_KINDS: readonly ShapeKind[] = ["rectangle", "ellipse", "line"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

/** Fields a builder may set beyond the ones it fills in itself. */
type LayerExtras = Partial<Omit<LayerBase, "id" | "transform">>;

function toTransform(rect: Rect | Transform): Transform {
  const { x, y, width, height, ...rest } = rect as Transform;
  return { x, y, width, height, ...rest };
}

/** Build a `text` layer. */
export function textLayer(
  id: string,
  transform: Rect | Transform,
  data: TextLayerData,
  extras: LayerExtras = {}
): TextLayer {
  return {
    id,
    kind: "text",
    transform: toTransform(transform),
    z: 0,
    payload: { version: ARTBOARD_SCHEMA_VERSION, data },
    ...extras,
  };
}

/** Build an `image` layer. */
export function imageLayer(
  id: string,
  transform: Rect | Transform,
  data: ImageLayerData,
  extras: LayerExtras = {}
): ImageLayer {
  return {
    id,
    kind: "image",
    transform: toTransform(transform),
    z: 0,
    payload: { version: ARTBOARD_SCHEMA_VERSION, data },
    ...extras,
  };
}

/** Build a `shape` layer. */
export function shapeLayer(
  id: string,
  transform: Rect | Transform,
  data: ShapeLayerData,
  extras: LayerExtras = {}
): ShapeLayer {
  return {
    id,
    kind: "shape",
    transform: toTransform(transform),
    z: 0,
    payload: { version: ARTBOARD_SCHEMA_VERSION, data },
    ...extras,
  };
}

/** Build a `group` layer. */
export function groupLayer(
  id: string,
  transform: Rect | Transform,
  data: GroupLayerData = {},
  extras: LayerExtras = {}
): GroupLayer {
  return {
    id,
    kind: "group",
    transform: toTransform(transform),
    z: 0,
    payload: { version: ARTBOARD_SCHEMA_VERSION, data },
    ...extras,
  };
}

/** Input for {@link createArtboardDocument}. */
export interface CreateArtboardInput {
  id: string;
  width: number;
  height: number;
  /** @default "#ffffff" */
  background?: string;
  layers?: Layer[];
  assets?: Record<string, MediaAsset>;
  themeRef?: string;
  metadata?: ArtboardDocument["metadata"];
  fps?: Fps;
}

/** Create a document with a stable id and explicit canvas size. */
export function createArtboardDocument(input: CreateArtboardInput): ArtboardDocument {
  const document: ArtboardDocument = {
    schemaVersion: ARTBOARD_SCHEMA_VERSION,
    id: input.id,
    canvas: {
      width: input.width,
      height: input.height,
      background: input.background ?? "#ffffff",
      ...(input.fps ? { fps: input.fps } : {}),
    },
    layers: input.layers ?? [],
    assets: input.assets ?? {},
  };
  if (input.themeRef !== undefined) document.themeRef = input.themeRef;
  if (input.metadata !== undefined) document.metadata = input.metadata;
  return orderLayers(document);
}

// ---------------------------------------------------------------------------
// Ordering, trees and lookups
// ---------------------------------------------------------------------------

/** Layers sorted into paint order: by `z`, then by stored order for ties. */
export function paintOrder(document: ArtboardDocument): Layer[] {
  return document.layers
    .map((layer, index) => ({ layer, index }))
    .sort((a, b) => a.layer.z - b.layer.z || a.index - b.index)
    .map((entry) => entry.layer);
}

/** Direct children of `parentId` (`null` = artboard root), in paint order. */
export function childrenOf(document: ArtboardDocument, parentId: string | null): Layer[] {
  return paintOrder(document).filter((layer) => (layer.parentId ?? null) === parentId);
}

/** Find a layer by id. */
export function getLayer(document: ArtboardDocument, layerId: string): Layer | undefined {
  return document.layers.find((layer) => layer.id === layerId);
}

/**
 * Build the nested, z-ordered render tree. Orphaned layers (a `parentId` that
 * does not resolve, or a cycle) are surfaced at the root rather than dropped, so
 * no content silently disappears.
 */
export function layerTree(document: ArtboardDocument): LayerNode[] {
  const ordered = paintOrder(document);

  const build = (parentId: string | null, seen: Set<string>): LayerNode[] =>
    ordered
      .filter((layer) => (layer.parentId ?? null) === parentId)
      .map((layer) => {
        if (seen.has(layer.id)) return { layer, children: [] };
        const next = new Set(seen);
        next.add(layer.id);
        return { layer, children: build(layer.id, next) };
      });

  const reached = new Set<string>();
  const markReached = (nodes: LayerNode[]) => {
    for (const node of nodes) {
      reached.add(node.layer.id);
      markReached(node.children);
    }
  };
  const tree = build(null, new Set());
  markReached(tree);

  // Layers with a `parentId` that does not resolve, or that sit inside a parent
  // cycle, are unreachable by the walk above. Surface them at the root rather
  // than dropping them, so no content silently disappears.
  for (const layer of ordered) {
    if (reached.has(layer.id)) continue;
    tree.push({ layer, children: [] });
    reached.add(layer.id);
  }
  return tree;
}

/** Every layer, including transitive descendants of `layerId`. */
export function descendantsOf(document: ArtboardDocument, layerId: string): Layer[] {
  const result: Layer[] = [];
  const queue = [layerId];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    for (const layer of document.layers) {
      if (layer.parentId === current) {
        result.push(layer);
        queue.push(layer.id);
      }
    }
  }
  return result;
}

/**
 * World-space bounds of a layer, accumulating ancestor translation and scale.
 * Returns `null` for an unknown id.
 */
export function layerWorldRect(document: ArtboardDocument, layerId: string): Rect | null {
  const layer = getLayer(document, layerId);
  if (!layer) return null;
  let rect: Rect = layer.transform;
  let parentId = layer.parentId;
  let depth = 0;
  while (parentId && depth < document.layers.length + 1) {
    const parent = getLayer(document, parentId);
    if (!parent) break;
    const { x, y, scaleX = 1, scaleY = 1 } = parent.transform;
    rect = {
      x: x + rect.x * scaleX,
      y: y + rect.y * scaleY,
      width: rect.width * scaleX,
      height: rect.height * scaleY,
    };
    parentId = parent.parentId;
    depth += 1;
  }
  return rect;
}

/** World-space bounds of every visible layer, or `null` for an empty document. */
export function documentContentBounds(document: ArtboardDocument): Rect | null {
  const rects: Rect[] = [];
  for (const layer of document.layers) {
    if (layer.visible === false) continue;
    const rect = layerWorldRect(document, layer.id);
    if (rect) rects.push(rect);
  }
  return boundsOf(rects);
}

/**
 * Reassign `z` within each sibling group so it matches paint order (`0..n-1`),
 * removing duplicates and gaps. Idempotent.
 */
export function orderLayers(document: ArtboardDocument): ArtboardDocument {
  const groups = new Map<string, Layer[]>();
  for (const layer of document.layers) {
    const key = layer.parentId ?? "";
    const list = groups.get(key);
    if (list) list.push(layer);
    else groups.set(key, [layer]);
  }
  const nextZ = new Map<string, number>();
  for (const list of groups.values()) {
    const ordered = list
      .map((layer, index) => ({ layer, index }))
      .sort((a, b) => a.layer.z - b.layer.z || a.index - b.index);
    ordered.forEach((entry, index) => nextZ.set(entry.layer.id, index));
  }
  return {
    ...document,
    layers: document.layers.map((layer) => ({ ...layer, z: nextZ.get(layer.id) ?? layer.z })),
  };
}

// ---------------------------------------------------------------------------
// Document operations (pure; invalid input throws)
// ---------------------------------------------------------------------------

function requireLayer(document: ArtboardDocument, layerId: string): Layer {
  const layer = getLayer(document, layerId);
  if (!layer) {
    throw new ArtboardDocumentError([
      { code: "unknown-layer", severity: "error", message: `No layer with id "${layerId}".`, layerId },
    ]);
  }
  return layer;
}

/** True when `layerId` is `candidateId` or one of its ancestors. */
function isAncestor(document: ArtboardDocument, layerId: string, candidateId: string): boolean {
  let current: string | undefined = layerId;
  let guard = 0;
  while (current && guard <= document.layers.length) {
    if (current === candidateId) return true;
    current = getLayer(document, current)?.parentId;
    guard += 1;
  }
  return false;
}

/** True when re-parenting `layerId` under `parentId` would keep the tree acyclic. */
export function canReparent(
  document: ArtboardDocument,
  layerId: string,
  parentId: string | null
): boolean {
  if (parentId === null) return true;
  if (parentId === layerId) return false;
  const parent = getLayer(document, parentId);
  if (!parent || parent.kind !== "group") return false;
  // Re-parenting is acyclic iff the new parent is not `layerId` itself or one of
  // its descendants. `isAncestor(parentId, layerId)` is true when `layerId` is
  // `parentId` or an ancestor of `parentId` — i.e. exactly the cycle case.
  return !isAncestor(document, parentId, layerId);
}

/** Fields {@link patchLayer} may change. `parentId: null` moves the layer to the artboard root. */
export interface LayerPatch {
  transform?: Rect | Transform;
  z?: number;
  visible?: boolean;
  locked?: boolean;
  opacity?: number;
  blendMode?: BlendMode;
  parentId?: string | null;
  semanticId?: string;
  summary?: string;
  layouts?: Record<string, LayerLayoutVariant>;
  /** Replaces `payload.data`. Must match the layer's kind. */
  data?: LayerData;
}

/** Apply a partial update to one layer, returning a new document. */
export function patchLayer(
  document: ArtboardDocument,
  layerId: string,
  patch: LayerPatch
): ArtboardDocument {
  const layer = requireLayer(document, layerId);
  const next: Layer = { ...layer };

  if (patch.transform) next.transform = toTransform(patch.transform);
  if (patch.z !== undefined) next.z = patch.z;
  if (patch.visible !== undefined) next.visible = patch.visible;
  if (patch.locked !== undefined) next.locked = patch.locked;
  if (patch.opacity !== undefined) next.opacity = clamp01(patch.opacity);
  if (patch.blendMode !== undefined) next.blendMode = patch.blendMode;
  if (patch.semanticId !== undefined) next.semanticId = patch.semanticId;
  if (patch.summary !== undefined) next.summary = patch.summary;
  if (patch.layouts !== undefined) next.layouts = patch.layouts;
  if (patch.parentId !== undefined) {
    if (patch.parentId === null) delete next.parentId;
    else {
      if (!canReparent(document, layerId, patch.parentId)) {
        throw new ArtboardDocumentError([
          {
            code: "invalid-reparent",
            severity: "error",
            message: `Layer "${layerId}" cannot become a child of "${patch.parentId}" (missing group or would create a cycle).`,
            layerId,
          },
        ]);
      }
      next.parentId = patch.parentId;
    }
  }
  if (patch.data !== undefined) {
    next.payload = { version: ARTBOARD_SCHEMA_VERSION, data: patch.data } as Layer["payload"];
  }

  return {
    ...document,
    layers: document.layers.map((candidate) => (candidate.id === layerId ? next : candidate)),
  };
}

/** Append a layer. Throws when the id already exists. */
export function addLayer(document: ArtboardDocument, layer: Layer): ArtboardDocument {
  if (getLayer(document, layer.id)) {
    throw new ArtboardDocumentError([
      { code: "duplicate-layer-id", severity: "error", message: `Layer id "${layer.id}" already exists.`, layerId: layer.id },
    ]);
  }
  const siblings = childrenOf(document, layer.parentId ?? null);
  const maxZ = siblings.reduce((max, sibling) => Math.max(max, sibling.z), -1);
  const withLayer: ArtboardDocument = {
    ...document,
    layers: [...document.layers, { ...layer, z: maxZ + 1 }],
  };
  return orderLayers(withLayer);
}

/** Remove a layer; by default its descendants are removed with it. */
export function removeLayer(
  document: ArtboardDocument,
  layerId: string,
  options: { cascade?: boolean } = {}
): ArtboardDocument {
  requireLayer(document, layerId);
  const cascade = options.cascade ?? true;
  const removed = new Set<string>([layerId]);
  if (cascade) {
    for (const descendant of descendantsOf(document, layerId)) removed.add(descendant.id);
  }

  // Non-cascading removal promotes the layer's children to the artboard root
  // instead of deleting them.
  const promoted = new Map<string, Layer>();
  if (!cascade) {
    for (const child of childrenOf(document, layerId)) {
      const copy: Layer = { ...child };
      delete copy.parentId;
      promoted.set(child.id, copy);
    }
  }

  const layers = document.layers
    .filter((layer) => !removed.has(layer.id))
    .map((layer) => promoted.get(layer.id) ?? layer);
  return orderLayers({ ...document, layers });
}

/**
 * Move a layer to `toIndex` among its siblings (clamped). Returns a new document
 * whose sibling `z` values have been rewritten to match.
 */
export function reorderLayer(
  document: ArtboardDocument,
  layerId: string,
  toIndex: number
): ArtboardDocument {
  const layer = requireLayer(document, layerId);
  const siblings = childrenOf(document, layer.parentId ?? null);
  const from = siblings.findIndex((sibling) => sibling.id === layerId);
  const to = Math.max(0, Math.min(siblings.length - 1, Math.trunc(toIndex)));
  if (from === to) return document;

  const reordered = siblings.slice();
  const [moved] = reordered.splice(from, 1);
  reordered.splice(to, 0, moved);
  const zById = new Map(reordered.map((sibling, index) => [sibling.id, index]));
  return {
    ...document,
    // `moved` is derived from a non-empty list; the guard above rejects `from < 0`.
    layers: document.layers.map((candidate) =>
      zById.has(candidate.id) ? { ...candidate, z: zById.get(candidate.id) as number } : candidate
    ),
  };
}

/** Move a layer one step `up` (toward the front) or `down`, clamped at the ends. */
export function moveLayer(
  document: ArtboardDocument,
  layerId: string,
  direction: "up" | "down" | "front" | "back"
): ArtboardDocument {
  const layer = requireLayer(document, layerId);
  const siblings = childrenOf(document, layer.parentId ?? null);
  const index = siblings.findIndex((sibling) => sibling.id === layerId);
  if (index < 0) return document;
  if (direction === "front") return reorderLayer(document, layerId, siblings.length - 1);
  if (direction === "back") return reorderLayer(document, layerId, 0);
  return reorderLayer(document, layerId, direction === "up" ? index + 1 : index - 1);
}

/** Re-parent a layer (or promote it to the root with `null`). */
export function setLayerParent(
  document: ArtboardDocument,
  layerId: string,
  parentId: string | null
): ArtboardDocument {
  return patchLayer(document, layerId, { parentId });
}

/** Set the artboard canvas size and background without touching layer geometry. */
export function resizeCanvas(
  document: ArtboardDocument,
  size: Size,
  options: { background?: string } = {}
): ArtboardDocument {
  return {
    ...document,
    canvas: {
      ...document.canvas,
      width: size.width,
      height: size.height,
      ...(options.background !== undefined ? { background: options.background } : {}),
    },
  };
}

/**
 * Compose a layer's per-aspect overrides into the base values, returning a new
 * document. Text overrides merge into `payload.data`; everything else merges
 * into the layer's common fields.
 */
export function applyLayoutVariant(document: ArtboardDocument, variantId: string): ArtboardDocument {
  return {
    ...document,
    layers: document.layers.map((layer) => {
      const variant = layer.layouts?.[variantId];
      if (!variant) return layer;
      const next: Layer = { ...layer };
      if (variant.transform) next.transform = { ...layer.transform, ...variant.transform };
      if (variant.visible !== undefined) next.visible = variant.visible;
      if (variant.opacity !== undefined) next.opacity = clamp01(variant.opacity);
      if (variant.text && layer.kind === "text") {
        next.payload = {
          version: ARTBOARD_SCHEMA_VERSION,
          data: { ...layer.payload.data, ...variant.text },
        };
      }
      return next;
    }),
  };
}

/**
 * Reflow a document to an aspect preset: apply its per-aspect overrides, resize
 * the canvas to the preset's reference dimensions and record the variant.
 * Throws for an unknown preset id.
 */
export function reflowToPreset(document: ArtboardDocument, presetId: string): ArtboardDocument {
  const preset = getAspectPreset(presetId);
  if (!preset) {
    throw new ArtboardDocumentError([
      { code: "unknown-aspect-preset", severity: "error", message: `No aspect preset "${presetId}".` },
    ]);
  }
  const reflowed = applyLayoutVariant(document, presetId);
  const resized = resizeCanvas(reflowed, { width: preset.width, height: preset.height });
  return {
    ...resized,
    metadata: { ...resized.metadata, aspectVariant: preset.id },
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateTransform(value: unknown, layerId: string, diagnostics: DocumentDiagnostic[]): void {
  if (!isRecord(value)) {
    diagnostics.push({ code: "missing-transform", severity: "error", message: "Layer transform must be an object.", layerId });
    return;
  }
  const rect: Rect = {
    x: Number(value.x),
    y: Number(value.y),
    width: Number(value.width),
    height: Number(value.height),
  };
  if (!isFiniteRect(rect)) {
    diagnostics.push({ code: "non-finite-transform", severity: "error", message: "Layer transform must use finite numbers.", layerId });
    return;
  }
  if (rect.width <= 0 || rect.height <= 0) {
    diagnostics.push({ code: "non-positive-size", severity: "error", message: "Layer width and height must be positive.", layerId });
  }
}

function validatePayload(layer: Record<string, unknown>, layerId: string, kind: LayerKind, diagnostics: DocumentDiagnostic[]): void {
  const payload = layer.payload;
  if (!isRecord(payload) || payload.version !== ARTBOARD_SCHEMA_VERSION || !isRecord(payload.data)) {
    diagnostics.push({
      code: "invalid-payload",
      severity: "error",
      message: `Layer payload must be { version: ${ARTBOARD_SCHEMA_VERSION}, data: object }.`,
      layerId,
    });
    return;
  }
  const data = payload.data;
  const fail = (code: string, message: string) => diagnostics.push({ code, severity: "error", message, layerId });

  switch (kind) {
    case "text": {
      if (!Array.isArray(data.spans) || data.spans.length === 0) {
        fail("invalid-text-spans", "Text layers need at least one span.");
      } else if (data.spans.some((span) => !isRecord(span) || typeof span.text !== "string")) {
        fail("invalid-text-spans", "Every text span needs a string `text`.");
      }
      if (!isNonEmptyString(data.fontFamily)) fail("invalid-text-font", "Text layers need a pinned `fontFamily`.");
      if (!isPositiveNumber(data.fontSize)) fail("invalid-text-size", "Text `fontSize` must be positive.");
      if (!isPositiveNumber(data.lineHeight)) fail("invalid-text-leading", "Text `lineHeight` must be positive.");
      break;
    }
    case "image": {
      if (!isNonEmptyString(data.assetRef)) fail("missing-asset-ref", "Image layers need a non-empty `assetRef`.");
      if (data.decorative !== true && !isNonEmptyString(data.alt)) {
        fail("missing-alt", "Image layers need an `alt` description unless marked `decorative`.");
      }
      break;
    }
    case "shape": {
      if (!SHAPE_KINDS.includes(data.shape as ShapeKind)) {
        fail("invalid-shape-kind", `Shape kind must be one of ${SHAPE_KINDS.join(", ")}.`);
      }
      break;
    }
    case "group":
      break;
  }
}

/**
 * Validate a value as an artboard document. Returns every finding; an empty
 * result (or warnings only) means the document is loadable. Unknown/extra
 * properties are preserved but not validated.
 */
export function validateDocument(value: unknown): DocumentDiagnostic[] {
  const diagnostics: DocumentDiagnostic[] = [];
  if (!isRecord(value)) {
    return [{ code: "not-an-object", severity: "error", message: "Document must be a JSON object." }];
  }
  if (value.schemaVersion !== ARTBOARD_SCHEMA_VERSION) {
    diagnostics.push({
      code: "unsupported-schema-version",
      severity: "error",
      message: `Expected schemaVersion ${ARTBOARD_SCHEMA_VERSION}, received ${String(value.schemaVersion)}.`,
    });
  }
  if (!isNonEmptyString(value.id)) {
    diagnostics.push({ code: "missing-document-id", severity: "error", message: "Document needs a non-empty `id`." });
  }

  const canvas = value.canvas;
  if (!isRecord(canvas)) {
    diagnostics.push({ code: "missing-canvas", severity: "error", message: "Document needs a `canvas` object." });
  } else {
    if (!isPositiveNumber(canvas.width) || !isPositiveNumber(canvas.height)) {
      diagnostics.push({ code: "invalid-canvas-size", severity: "error", message: "Canvas width and height must be positive numbers." });
    }
    if (typeof canvas.background !== "string") {
      diagnostics.push({ code: "invalid-background", severity: "error", message: "Canvas `background` must be a string." });
    }
    if (canvas.fps !== undefined) {
      const fps = canvas.fps;
      if (!isRecord(fps) || !isPositiveNumber(fps.num) || !isPositiveNumber(fps.den)) {
        diagnostics.push({ code: "invalid-fps", severity: "error", message: "`fps` must be `{ num, den }` positive integers." });
      }
    }
  }

  const assets = value.assets ?? {};
  if (!isRecord(assets)) {
    diagnostics.push({ code: "invalid-assets", severity: "error", message: "`assets` must be an object map." });
  }

  if (!Array.isArray(value.layers)) {
    diagnostics.push({ code: "missing-layers", severity: "error", message: "Document needs a `layers` array." });
    return diagnostics;
  }

  const ids = new Set<string>();
  const zCounts = new Map<string, number>();
  for (const raw of value.layers) {
    if (!isRecord(raw)) {
      diagnostics.push({ code: "invalid-layer", severity: "error", message: "Each layer must be an object." });
      continue;
    }
    const layerId = typeof raw.id === "string" ? raw.id : "(missing id)";
    if (!isNonEmptyString(raw.id)) {
      diagnostics.push({ code: "missing-layer-id", severity: "error", message: "Layer needs a non-empty `id`." });
    } else if (ids.has(raw.id)) {
      diagnostics.push({ code: "duplicate-layer-id", severity: "error", message: `Duplicate layer id "${raw.id}".`, layerId });
    } else {
      ids.add(raw.id);
    }

    if (!LAYER_KINDS.includes(raw.kind as LayerKind)) {
      diagnostics.push({ code: "invalid-kind", severity: "error", message: `Layer kind must be one of ${LAYER_KINDS.join(", ")}.`, layerId });
      continue;
    }
    const kind = raw.kind as LayerKind;
    validateTransform(raw.transform, layerId, diagnostics);
    validatePayload(raw, layerId, kind, diagnostics);

    if (!Number.isInteger(raw.z)) {
      diagnostics.push({ code: "invalid-z", severity: "error", message: "Layer `z` must be an integer.", layerId });
    } else {
      const key = `${raw.parentId ?? ""}:${raw.z}`;
      zCounts.set(key, (zCounts.get(key) ?? 0) + 1);
    }
    if (raw.opacity !== undefined && !(typeof raw.opacity === "number" && raw.opacity >= 0 && raw.opacity <= 1)) {
      diagnostics.push({ code: "invalid-opacity", severity: "error", message: "Layer `opacity` must be between 0 and 1.", layerId });
    }
    if (raw.blendMode !== undefined && !BLEND_MODES.includes(raw.blendMode as BlendMode)) {
      diagnostics.push({ code: "invalid-blend-mode", severity: "error", message: `Blend mode must be one of ${BLEND_MODES.join(", ")}.`, layerId });
    }
    if (raw.parentId !== undefined && !isNonEmptyString(raw.parentId)) {
      diagnostics.push({ code: "invalid-parent", severity: "error", message: "`parentId` must be a non-empty string when present.", layerId });
    }
    if (
      kind === "image" &&
      isRecord(raw.payload) &&
      isRecord(raw.payload.data) &&
      isNonEmptyString(raw.payload.data.assetRef) &&
      isRecord(assets) &&
      !(raw.payload.data.assetRef in assets)
    ) {
      diagnostics.push({
        code: "referenced-asset-missing",
        severity: "warning",
        message: `Layer references asset "${raw.payload.data.assetRef}", which is not in \`assets\`.`,
        layerId,
      });
    }
  }

  // Parent references, group-ness and cycles.
  const byId = new Map<string, Record<string, unknown>>();
  for (const raw of value.layers) {
    if (isRecord(raw) && isNonEmptyString(raw.id)) byId.set(raw.id, raw);
  }
  for (const [layerId, layer] of byId) {
    const parentId = layer.parentId;
    if (!isNonEmptyString(parentId)) continue;
    const parent = byId.get(parentId);
    if (!parent) {
      diagnostics.push({ code: "missing-parent", severity: "error", message: `Parent "${parentId}" does not exist.`, layerId });
      continue;
    }
    if (parent.kind !== "group") {
      diagnostics.push({ code: "parent-not-group", severity: "error", message: `Parent "${parentId}" is not a group.`, layerId });
    }
    let current: string | undefined = layerId;
    let guard = 0;
    while (current && guard <= byId.size) {
      current = isNonEmptyString(byId.get(current)?.parentId) ? (byId.get(current)?.parentId as string) : undefined;
      if (current === layerId) {
        diagnostics.push({ code: "layer-cycle", severity: "error", message: "Layer hierarchy contains a cycle.", layerId });
        break;
      }
      guard += 1;
    }
  }

  for (const [key, count] of zCounts) {
    if (count > 1) {
      diagnostics.push({
        code: "duplicate-z",
        severity: "warning",
        message: `Multiple layers share z ${key.split(":").slice(1).join(":")} in the same group; run orderLayers to make paint order explicit.`,
      });
    }
  }

  return diagnostics;
}

// ---------------------------------------------------------------------------
// Normalization and serialization
// ---------------------------------------------------------------------------

/** Deterministic deep clone: object keys sorted, `undefined` dropped, arrays preserved. */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (isRecord(value)) {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      const entry = value[key];
      if (entry === undefined) continue;
      result[key] = canonicalize(entry);
    }
    return result;
  }
  return value;
}

function roundNumber(value: number, precision = 3): number {
  if (!Number.isFinite(value)) return value;
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function normalizeTransform(transform: Transform): Transform {
  const rounded = roundRect(transform);
  const next: Transform = { x: rounded.x, y: rounded.y, width: rounded.width, height: rounded.height };
  const { rotation, scaleX, scaleY } = transform;
  if (rotation !== undefined) next.rotation = roundNumber(rotation);
  if (scaleX !== undefined) next.scaleX = roundNumber(scaleX);
  if (scaleY !== undefined) next.scaleY = roundNumber(scaleY);
  return next;
}

function normalizeLayer(layer: Layer): Layer {
  const next: Record<string, unknown> = {
    id: layer.id,
    kind: layer.kind,
    transform: normalizeTransform(layer.transform),
    z: layer.z,
    payload: { version: layer.payload.version, data: canonicalize(layer.payload.data) },
  };
  if (layer.semanticId !== undefined) next.semanticId = layer.semanticId;
  if (layer.parentId !== undefined) next.parentId = layer.parentId;
  if (layer.visible !== undefined) next.visible = layer.visible;
  if (layer.locked !== undefined) next.locked = layer.locked;
  if (layer.opacity !== undefined) next.opacity = layer.opacity;
  if (layer.blendMode !== undefined) next.blendMode = layer.blendMode;
  if (layer.summary !== undefined) next.summary = layer.summary;
  if (layer.layouts !== undefined) next.layouts = canonicalize(layer.layouts);
  return next as unknown as Layer;
}

/**
 * Canonical form of a document: layers in paint order with per-group `z`
 * rewritten, transform geometry rounded to 3 decimals, and all map keys sorted.
 * Two structurally equal documents normalize to identical objects.
 */
export function normalizeDocument(document: ArtboardDocument): ArtboardDocument {
  const ordered = orderLayers(document);
  const assets: Record<string, MediaAsset> = {};
  for (const key of Object.keys(document.assets).sort()) {
    assets[key] = canonicalize(document.assets[key]) as MediaAsset;
  }
  const canvas: ArtboardCanvas = {
    width: roundNumber(document.canvas.width),
    height: roundNumber(document.canvas.height),
    background: document.canvas.background,
  };
  if (document.canvas.fps) {
    canvas.fps = { num: document.canvas.fps.num, den: document.canvas.fps.den };
  }
  const result: ArtboardDocument = {
    schemaVersion: ARTBOARD_SCHEMA_VERSION,
    id: document.id,
    canvas,
    layers: paintOrder(ordered).map(normalizeLayer),
    assets,
  };
  if (document.themeRef !== undefined) result.themeRef = document.themeRef;
  if (document.metadata !== undefined) {
    result.metadata = canonicalize(document.metadata) as ArtboardDocument["metadata"];
  }
  return result;
}

/** Serialize to deterministic JSON. `pretty` matches the repo's 2-space style. */
export function serializeDocument(document: ArtboardDocument, options: { pretty?: boolean } = {}): string {
  const normalized = normalizeDocument(document);
  return JSON.stringify(normalized, null, options.pretty ? 2 : undefined);
}

/** Stable FNV-1a hex digest of a document's canonical JSON. Useful as a fixture/cache key. */
export function documentDigest(document: ArtboardDocument): string {
  const input = serializeDocument(document);
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/**
 * Parse and validate JSON into a normalized document. Throws
 * {@link ArtboardDocumentError} for malformed JSON or any error-level
 * diagnostic; warnings are surfaced through `onWarning`.
 */
export function deserializeDocument(
  json: string,
  options: { onWarning?: (diagnostics: DocumentDiagnostic[]) => void } = {}
): ArtboardDocument {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    throw new ArtboardDocumentError([
      {
        code: "invalid-json",
        severity: "error",
        message: error instanceof Error ? error.message : "Document is not valid JSON.",
      },
    ]);
  }
  const diagnostics = validateDocument(parsed);
  const errors = diagnostics.filter((diagnostic) => diagnostic.severity === "error");
  if (errors.length > 0) throw new ArtboardDocumentError(errors);
  const warnings = diagnostics.filter((diagnostic) => diagnostic.severity === "warning");
  if (warnings.length > 0 && options.onWarning) options.onWarning(warnings);
  return normalizeDocument(parsed as ArtboardDocument);
}

/** Artboard rectangle for a document's canvas. */
export function documentBounds(document: ArtboardDocument): Rect {
  return rectOf(document.canvas);
}
