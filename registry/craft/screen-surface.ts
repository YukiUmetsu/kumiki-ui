/** ScreenSurface: bind browser/app content to an existing 3D device's display mesh.
 *
 * The display's own UV layout decides which local axes the texture runs along, so the content keeps the
 * display's true aspect and is never stretched. A canvas sized to that aspect holds the content: a
 * design-space painter, or a loaded image fitted with contain/cover. Painting is a pure function of the
 * frame number (the same frame always produces the same pixels), and projection reports where the display's
 * corners land on screen, so callouts track the display and readability is checked from the real camera.
 *
 * Works with any asset that exposes a named display Mesh in `asset.parts`: the crafted laptop and smartphone
 * heroes, or a GLB whose screen mesh has UVs and normals.
 */
import { CanvasTexture, Matrix3, Mesh, SRGBColorSpace, Vector3 } from "three";
import type { BufferGeometry, Camera, MeshStandardMaterial, Texture } from "three";
import type { HeroAsset } from "./hero-asset";

export type ScreenFit = "contain" | "cover";

/** What the display shows. Paint content receives design-space units and the caller's frame number. */
export type ScreenContent =
  | { kind: "paint"; draw(ctx: CanvasRenderingContext2D, designWidth: number, designHeight: number, frame: number): void }
  /** A loaded source (image, SVG rasterised by the browser, canvas, or a video seeked to the wanted frame). */
  | { kind: "image"; source: CanvasImageSource; width: number; height: number };

export interface ScreenSurfaceOptions {
  /** Name of the display mesh in `asset.parts`, e.g. "phone-display" or "laptop-display". */
  part: string;
  content: ScreenContent;
  /** How an image is fitted to the display. Default "contain" (whole image visible; letterboxed). */
  fit?: ScreenFit;
  /** Width of the design space, in content px. The display's full width spans it. Default 1280. */
  designWidth?: number;
  /** Long side of the painted canvas in px, for supersampling. Default 2048; 64–4096. */
  resolution?: number;
  /** Colour behind letterboxed content and under unpainted areas. Default "#050608". */
  background?: string;
  /** Smallest legible text, in design px. Default 14. */
  minTextPx?: number;
  /** Smallest legible on-screen text, in CSS px. Default 9. */
  minScreenTextPx?: number;
  /** Called when asynchronous content (an image still loading) becomes ready, so the caller can redraw. */
  onReady?: () => void;
}

export type ScreenSurfaceStatus = "pending" | "ready" | "error" | "unpainted";

export interface ScreenSurfaceDiagnostic {
  code:
    | "screen-surface-part-missing" | "screen-surface-part-invalid" | "screen-surface-content-invalid"
    | "screen-surface-content-error" | "screen-surface-no-canvas" | "screen-surface-uv-partial"
    | "screen-surface-unreadable" | "screen-surface-facing-away" | "screen-surface-outside-viewport";
  severity: "error" | "warning";
  message: string;
}

export interface ScreenPoint { x: number; y: number }

export interface ScreenProjection {
  /** The display's corners in CSS px, origin top-left, in canvas order: top-left, top-right, bottom-right, bottom-left. */
  corners: readonly [ScreenPoint, ScreenPoint, ScreenPoint, ScreenPoint];
  center: ScreenPoint;
  /** On-screen CSS px per design px, averaged over the top and bottom edges. */
  pxPerDesignPx: number;
  /** Cosine between the display's front normal and the direction to the camera. Negative = seen from behind. */
  facing: number;
  /** True when every corner is in front of the camera and inside the viewport. */
  inside: boolean;
}

type Axis = 0 | 1 | 2;

/** The display face as its UVs see it: which local axes u and v run along, and the true face size. */
export interface DisplayFace {
  uAxis: Axis;
  vAxis: Axis;
  normalAxis: Axis;
  /** +1 when increasing u runs along +uAxis (and likewise for v). */
  uSign: 1 | -1;
  vSign: 1 | -1;
  /** Face size along u and v, in the geometry's own units. */
  width: number;
  height: number;
  aspect: number;
  /** The normal's direction along normalAxis (the visible side's sign). */
  normalSign: 1 | -1;
  /** True when the UVs span the whole [0, 1] square, so the content covers the entire display. */
  fullUv: boolean;
  /** Geometry bounds, so corners sit exactly on the face edges. */
  min: readonly [number, number, number];
  max: readonly [number, number, number];
}

function correlation(x: ArrayLike<number>, y: ArrayLike<number>): number {
  const n = x.length;
  let mx = 0, my = 0;
  for (let i = 0; i < n; i++) { mx += x[i]; my += y[i]; }
  mx /= n; my /= n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx, dy = y[i] - my;
    sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
  }
  return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : 0;
}

/**
 * Reads the display face from its geometry. The texture's u and v each run along the local axis their
 * UVs follow most closely, so this works for rotated display meshes and for GLB screens alike.
 * Returns undefined when the geometry has no positions, no UVs or no area to paint.
 */
export function displayFace(geometry: BufferGeometry): DisplayFace | undefined {
  const position = geometry.getAttribute("position"), uv = geometry.getAttribute("uv");
  if (!position || !uv || position.count < 3) return undefined;
  const n = position.count;
  const coords: [Float64Array, Float64Array, Float64Array] = [new Float64Array(n), new Float64Array(n), new Float64Array(n)];
  const us = new Float64Array(n), vs = new Float64Array(n);
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
  for (let i = 0; i < n; i++) {
    for (const a of [0, 1, 2] as const) {
      const c = position.getComponent(i, a);
      coords[a][i] = c; min[a] = Math.min(min[a], c); max[a] = Math.max(max[a], c);
    }
    us[i] = uv.getX(i); vs[i] = uv.getY(i);
    minU = Math.min(minU, us[i]); maxU = Math.max(maxU, us[i]);
    minV = Math.min(minV, vs[i]); maxV = Math.max(maxV, vs[i]);
  }
  const uCorr = ([0, 1, 2] as const).map(a => correlation(coords[a], us));
  const uAxis = ([0, 1, 2] as const).reduce((best, a) => Math.abs(uCorr[a]) > Math.abs(uCorr[best]) ? a : best, 0 as Axis);
  const others = ([0, 1, 2] as const).filter(a => a !== uAxis);
  const vAxis = others.reduce((best, a) => Math.abs(correlation(coords[a], vs)) > Math.abs(correlation(coords[best], vs)) ? a : best, others[0]);
  const normalAxis = ([0, 1, 2] as const).find(a => a !== uAxis && a !== vAxis) as Axis;
  const width = max[uAxis] - min[uAxis], height = max[vAxis] - min[vAxis];
  if (!(width > 0) || !(height > 0)) return undefined;
  // The visible side is the one whose normals point along the face normal (the display's large caps).
  const normals = geometry.getAttribute("normal");
  let side = 0;
  if (normals) for (let i = 0; i < n; i++) { const c = normals.getComponent(i, normalAxis); if (Math.abs(c) > .5) side += c; }
  return {
    uAxis, vAxis, normalAxis,
    uSign: correlation(coords[uAxis], us) >= 0 ? 1 : -1,
    vSign: correlation(coords[vAxis], vs) >= 0 ? 1 : -1,
    width, height, aspect: width / height,
    normalSign: side >= 0 ? 1 : -1,
    fullUv: Math.abs(minU) < 1e-3 && Math.abs(maxU - 1) < 1e-3 && Math.abs(minV) < 1e-3 && Math.abs(maxV - 1) < 1e-3,
    min: [min[0], min[1], min[2]], max: [max[0], max[1], max[2]],
  };
}

/** Where a source of `contentWidth × contentHeight` lands inside a `width × height` area. Centred. */
export function fitScreenContent(width: number, height: number, contentWidth: number, contentHeight: number, fit: ScreenFit) {
  const scale = fit === "cover" ? Math.max(width / contentWidth, height / contentHeight) : Math.min(width / contentWidth, height / contentHeight);
  const w = contentWidth * scale, h = contentHeight * scale;
  return { x: (width - w) / 2, y: (height - h) / 2, width: w, height: h };
}

/** Canvas pixel size with the display's aspect and `resolution` on the long side. */
export function screenCanvasSize(aspect: number, resolution: number) {
  return aspect >= 1
    ? { width: resolution, height: Math.max(1, Math.round(resolution / aspect)) }
    : { width: Math.max(1, Math.round(resolution * aspect)), height: resolution };
}

export interface ScreenSurfaceHandle {
  /** `pending` until an image is ready, `ready` once painted, `error` for a bad part or content, `unpainted` without a canvas. */
  readonly status: ScreenSurfaceStatus;
  /** The bound display mesh, when the part exists and is a single-material mesh. */
  readonly display: Mesh | undefined;
  /** Canvas pixels and the design space they hold. */
  readonly canvas: { width: number; height: number; designWidth: number; designHeight: number } | undefined;
  readonly texture: Texture | undefined;
  /**
   * Paint the content for `frame`. Pure: the same frame and content always yield the same pixels, and an
   * unchanged frame is skipped. Returns true when the canvas was repainted.
   */
  paintAt(frame: number): boolean;
  /** Projects the display's corners through `camera` into a viewport of `width × height` CSS px. */
  project(camera: Camera, width: number, height: number): ScreenProjection | undefined;
  /** Binding, content and (when a camera is given) readability, facing and framing problems. */
  diagnostics(camera?: Camera, width?: number, height?: number): ScreenSurfaceDiagnostic[];
  /** Restores the display's original emissive map and releases the texture. */
  dispose(): void;
}

const DEFAULTS = { fit: "contain", designWidth: 1280, resolution: 2048, background: "#050608", minTextPx: 14, minScreenTextPx: 9 } as const;
const NO_CANVAS = /jsdom/i;

function createPaintCanvas(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | undefined {
  if (typeof document === "undefined") return undefined;
  if (typeof navigator !== "undefined" && NO_CANVAS.test(navigator.userAgent)) return undefined;
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d");
  return ctx ? { canvas, ctx } : undefined;
}

/** True when an image-like source has its pixels. Canvases and bitmaps are always ready. */
function sourceReady(source: CanvasImageSource): boolean {
  if ("complete" in source) return (source as HTMLImageElement).complete && (source as HTMLImageElement).naturalWidth > 0;
  if ("readyState" in source) return (source as HTMLVideoElement).readyState >= 2;
  return true;
}

/** Binds content to a display mesh. Never throws for a bad part or content: problems are reported, as the status and diagnostics. */
export function bindScreenSurface(asset: Pick<HeroAsset, "parts">, options: ScreenSurfaceOptions): ScreenSurfaceHandle {
  const fit = options.fit ?? DEFAULTS.fit, designWidth = options.designWidth ?? DEFAULTS.designWidth;
  const resolution = options.resolution ?? DEFAULTS.resolution, background = options.background ?? DEFAULTS.background;
  const minTextPx = options.minTextPx ?? DEFAULTS.minTextPx, minScreenTextPx = options.minScreenTextPx ?? DEFAULTS.minScreenTextPx;
  const { content } = options;
  const problems: ScreenSurfaceDiagnostic[] = [];
  const problem = (code: ScreenSurfaceDiagnostic["code"], severity: ScreenSurfaceDiagnostic["severity"], message: string) => {
    if (!problems.some(p => p.code === code)) problems.push({ code, severity, message });
  };

  if (!Number.isFinite(designWidth) || designWidth <= 0) problem("screen-surface-content-invalid", "error", `designWidth must be a positive number, not ${designWidth}.`);
  if (!Number.isSafeInteger(resolution) || resolution < 64 || resolution > 4096) problem("screen-surface-content-invalid", "error", `resolution must be an integer from 64 to 4096, not ${resolution}.`);
  if (content.kind === "image" && !(content.width > 0 && content.height > 0))
    problem("screen-surface-content-invalid", "error", `Image content needs a positive width and height, not ${content.width}×${content.height}.`);

  const object = asset.parts.get(options.part);
  let display: Mesh | undefined, face: ReturnType<typeof displayFace>;
  if (!object) problem("screen-surface-part-missing", "error", `No part named "${options.part}" on this asset; bind to a display mesh such as "phone-display".`);
  else if (!(object instanceof Mesh) || Array.isArray(object.material) || !("emissiveMap" in object.material))
    problem("screen-surface-part-invalid", "error", `"${options.part}" is not a single-material mesh with an emissive screen.`);
  else {
    face = displayFace(object.geometry);
    if (!face) problem("screen-surface-part-invalid", "error", `"${options.part}" has no positions, UVs or area to paint.`);
    else {
      display = object;
      if (!face.fullUv) problem("screen-surface-uv-partial", "warning", `The UVs of "${options.part}" do not cover the whole display; content covers only part of it.`);
    }
  }

  const designHeight = face ? designWidth / face.aspect : 0;
  const size = face && problems.every(p => p.severity !== "error") ? screenCanvasSize(face.aspect, resolution) : undefined;
  const paint = size ? createPaintCanvas(size.width, size.height) : undefined;
  if (size && !paint) problem("screen-surface-no-canvas", "warning", "No 2D canvas here, so the screen shows its original content. Paint in a browser, Storybook or video export.");
  const texture = paint ? new CanvasTexture(paint.canvas) : undefined;
  if (texture) { texture.colorSpace = SRGBColorSpace; texture.anisotropy = 8; texture.needsUpdate = true; }
  const material = display?.material as MeshStandardMaterial | undefined;
  const original = material?.emissiveMap ?? null;
  let state: ScreenSurfaceStatus = problems.some(p => p.severity === "error") ? "error" : paint ? "pending" : "unpainted";
  let lastKey: string | undefined;
  let bound = false;
  if (texture && display && material) { material.emissiveMap = texture; material.needsUpdate = true; bound = true; }

  if (content.kind === "image" && paint && !sourceReady(content.source) && "addEventListener" in content.source) {
    content.source.addEventListener("load", () => options.onReady?.(), { once: true });
  }

  // Corners in canvas order: top-left, top-right, bottom-right, bottom-left. Canvas row 0 is the top, which is v = 1.
  const cornerLocal = (f: DisplayFace, u1: boolean, v1: boolean) => {
    const p = new Vector3();
    p.setComponent(f.uAxis, u1 === (f.uSign > 0) ? f.max[f.uAxis] : f.min[f.uAxis]);
    p.setComponent(f.vAxis, v1 === (f.vSign > 0) ? f.max[f.vAxis] : f.min[f.vAxis]);
    p.setComponent(f.normalAxis, (f.min[f.normalAxis] + f.max[f.normalAxis]) / 2);
    return p;
  };

  const project = (camera: Camera, width: number, height: number): ScreenProjection | undefined => {
    if (!display || !face) return undefined;
    display.updateWorldMatrix(true, false);
    camera.updateMatrixWorld();
    const worldCorners = [cornerLocal(face, false, true), cornerLocal(face, true, true), cornerLocal(face, true, false), cornerLocal(face, false, false)]
      .map(p => p.applyMatrix4(display!.matrixWorld));
    const inFront = worldCorners.every(w => w.clone().applyMatrix4(camera.matrixWorldInverse).z < 0);
    const screen = worldCorners.map(w => {
      const ndc = w.clone().project(camera);
      return { x: (ndc.x + 1) / 2 * width, y: (1 - ndc.y) / 2 * height };
    });
    const [tl, tr, br, bl] = screen;
    const edge = (a: ScreenPoint, b: ScreenPoint) => Math.hypot(b.x - a.x, b.y - a.y);
    const normal = new Vector3().setComponent(face.normalAxis, face.normalSign)
      .applyMatrix3(new Matrix3().getNormalMatrix(display.matrixWorld)).normalize();
    const centre = worldCorners.reduce((sum, w) => sum.add(w), new Vector3()).multiplyScalar(1 / 4);
    const toCamera = camera.getWorldPosition(new Vector3()).sub(centre).normalize();
    return {
      corners: [tl, tr, br, bl],
      center: { x: (tl.x + br.x) / 2, y: (tl.y + br.y) / 2 },
      pxPerDesignPx: (edge(tl, tr) + edge(bl, br)) / 2 / designWidth,
      facing: normal.dot(toCamera),
      inside: inFront && screen.every(p => p.x >= 0 && p.x <= width && p.y >= 0 && p.y <= height),
    };
  };

  return {
    get status() { return state; },
    get display() { return display; },
    get canvas() { return size ? { ...size, designWidth, designHeight } : undefined; },
    get texture() { return texture; },
    paintAt(frame: number) {
      if (!paint || !size) return false;
      const ready = content.kind === "paint" || sourceReady(content.source);
      const key = content.kind === "paint" ? `frame:${frame}` : ready ? "image:ready" : "image:pending";
      if (key === lastKey) return false;
      lastKey = key;
      const { ctx } = paint, scale = size.width / designWidth;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, size.width, size.height);
      if (!ready) { state = "pending"; texture!.needsUpdate = true; return true; }
      try {
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
        if (content.kind === "paint") content.draw(ctx, designWidth, designHeight, frame);
        else {
          const r = fitScreenContent(designWidth, designHeight, content.width, content.height, fit);
          ctx.drawImage(content.source, r.x, r.y, r.width, r.height);
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        state = "ready";
      } catch (cause) {
        state = "error";
        problem("screen-surface-content-error", "error", `Painting the screen failed: ${cause instanceof Error ? cause.message : String(cause)}`);
      }
      texture!.needsUpdate = true;
      return true;
    },
    project,
    diagnostics(camera?: Camera, width?: number, height?: number) {
      const out = [...problems];
      const projection = camera && width && height ? project(camera, width, height) : undefined;
      if (projection) {
        if (projection.pxPerDesignPx * minTextPx < minScreenTextPx)
          out.push({ code: "screen-surface-unreadable", severity: "warning",
            message: `Text ${minTextPx} design px tall renders about ${(projection.pxPerDesignPx * minTextPx).toFixed(1)} CSS px on screen (minimum ${minScreenTextPx}); move the camera closer or enlarge the type.` });
        if (projection.facing < 0)
          out.push({ code: "screen-surface-facing-away", severity: "warning", message: "The display faces away from the camera; its content is not visible from this view." });
        if (!projection.inside)
          out.push({ code: "screen-surface-outside-viewport", severity: "warning", message: "Part of the display falls outside the viewport, so callouts anchored to its corners would be clipped." });
      }
      return out;
    },
    dispose() {
      if (bound && material) { material.emissiveMap = original; material.needsUpdate = true; }
      texture?.dispose();
      bound = false;
    },
  };
}
