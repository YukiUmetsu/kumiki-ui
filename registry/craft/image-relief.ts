/** Image-to-2.5D relief, using an externally authored color image and depth map.
 *
 * No model inference, renderer, animation clock, or Blender; the optional
 * browser URL helper decodes only explicitly provided image sources.
 * The geometry can be used with existing Kumiki camera and export adapters.
 */
import {
  DoubleSide, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, SRGBColorSpace, Texture,
} from "three";

export interface ImageReliefSpec {
  schemaVersion: 1;
  id: string;
  /** World-space dimensions. They should match the image aspect ratio. */
  width: number;
  height: number;
  /** Total displacement from the farthest to nearest image feature. */
  depthScale: number;
  /** Tessellation budget: (segmentsX + 1) × (segmentsY + 1) vertices. */
  segmentsX?: number;
  segmentsY?: number;
  /** Default: depth maps with white = near. */
  nearIsWhite?: boolean;
  /** Red, green, blue or RGB luminance from the decoded depth image. */
  depthChannel?: "red" | "green" | "blue" | "luminance";
  /** Box smoothing radius in source pixels, 0–3. Helps with noisy AI depth. */
  smoothRadius?: number;
  /** Fade relief to the original photo plane at the boundary, 0–0.25 UV. */
  edgeFeather?: number;
}

/** Decoded 8-bit RGBA pixels, top row first. The caller controls image decoding. */
export interface ReliefDepthPixels {
  width: number;
  height: number;
  rgba: ArrayLike<number>;
}

export interface ImageReliefEvaluation {
  geometry: PlaneGeometry;
  /** World-space displacement extremes (relative to z = 0). */
  minZ: number;
  maxZ: number;
  vertices: number;
}

const LIMIT = 262_144;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function validateImageRelief(spec: ImageReliefSpec, depth: ReliefDepthPixels): void {
  if (spec.schemaVersion !== 1 || typeof spec.id !== "string" || !spec.id.trim() || spec.id.length > 128)
    throw new Error("Image relief requires schemaVersion 1 and a nonempty ID (max 128 characters).");
  if (![spec.width, spec.height, spec.depthScale].every(Number.isFinite) ||
    spec.width <= 0 || spec.height <= 0 || spec.depthScale < 0 || spec.depthScale > Math.min(spec.width, spec.height) * .5)
    throw new Error("Image relief requires positive finite dimensions and depthScale <= half the shorter side.");
  const sx = spec.segmentsX ?? 128, sy = spec.segmentsY ?? 128;
  if (![sx, sy].every(n => Number.isSafeInteger(n) && n >= 2 && n <= 512) || (sx + 1) * (sy + 1) > LIMIT)
    throw new Error(`Image relief tessellation must use 2–512 segments per axis and at most ${LIMIT} vertices.`);
  if (spec.depthChannel && !["red", "green", "blue", "luminance"].includes(spec.depthChannel))
    throw new Error("Unknown image relief depth channel.");
  if (spec.nearIsWhite !== undefined && typeof spec.nearIsWhite !== "boolean")
    throw new Error("nearIsWhite must be a boolean.");
  const smooth = spec.smoothRadius ?? 0, feather = spec.edgeFeather ?? .04;
  if (!Number.isSafeInteger(smooth) || smooth < 0 || smooth > 3 ||
    !Number.isFinite(feather) || feather < 0 || feather > .25)
    throw new Error("Image relief smoothing must be 0–3 pixels; edge feather must be 0–0.25.");
  if (!Number.isSafeInteger(depth.width) || !Number.isSafeInteger(depth.height) ||
    depth.width < 2 || depth.height < 2 || depth.width > 8192 || depth.height > 8192 ||
    depth.rgba.length !== depth.width * depth.height * 4)
    throw new Error("Image relief requires valid decoded RGBA depth pixels (2–8192 pixels per side).");
}

/** Pure sampling: the same decoded depth and spec always produce the same mesh. */
export function createImageReliefGeometry(spec: ImageReliefSpec, depth: ReliefDepthPixels): ImageReliefEvaluation {
  validateImageRelief(spec, depth);
  const width = depth.width, height = depth.height, src = depth.rgba;
  const sx = spec.segmentsX ?? 128, sy = spec.segmentsY ?? 128;
  const radius = spec.smoothRadius ?? 0, feather = spec.edgeFeather ?? .04;
  const channel = spec.depthChannel ?? "luminance";
  const channelOffset = channel === "red" ? 0 : channel === "green" ? 1 : 2;
  const nearIsWhite = spec.nearIsWhite ?? true;
  const samplePixel = (x: number, y: number) => {
    const i = (clamp(y, 0, height - 1) * width + clamp(x, 0, width - 1)) * 4;
    if (channel === "luminance") return (src[i] * .2126 + src[i + 1] * .7152 + src[i + 2] * .0722) / 255;
    return src[i + channelOffset] / 255;
  };
  const smoothPixel = (x: number, y: number) => {
    if (!radius) return samplePixel(x, y);
    let sum = 0;
    for (let dy = -radius; dy <= radius; dy++)
      for (let dx = -radius; dx <= radius; dx++) sum += samplePixel(x + dx, y + dy);
    return sum / ((2 * radius + 1) ** 2);
  };
  const sample = (u: number, v: number) => {
    // WebGL UV has bottom-left origin; decoded image data is top-left first.
    const x = u * (width - 1), y = (1 - v) * (height - 1);
    const x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(width - 1, x0 + 1), y1 = Math.min(height - 1, y0 + 1);
    const fx = x - x0, fy = y - y0;
    const top = smoothPixel(x0, y0) * (1 - fx) + smoothPixel(x1, y0) * fx;
    const bottom = smoothPixel(x0, y1) * (1 - fx) + smoothPixel(x1, y1) * fx;
    return top * (1 - fy) + bottom * fy;
  };
  const geometry = new PlaneGeometry(spec.width, spec.height, sx, sy);
  const uv = geometry.getAttribute("uv"), position = geometry.getAttribute("position");
  let minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < position.count; i++) {
    const u = uv.getX(i), v = uv.getY(i);
    const raw = nearIsWhite ? sample(u, v) : 1 - sample(u, v);
    const borderDistance = Math.min(u, v, 1 - u, 1 - v);
    const edge = feather === 0 ? 1 : clamp(borderDistance / feather, 0, 1);
    const easedEdge = edge * edge * (3 - 2 * edge);
    const z = (raw - .5) * spec.depthScale * easedEdge;
    position.setZ(i, z);
    minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.name = `km-image-relief:${spec.id}`;
  return { geometry, minZ, maxZ, vertices: position.count };
}

export interface ImageReliefMaterialOptions {
  /** Image decoded by caller; set SRGBColorSpace for photographs. Caller retains texture ownership. */
  color: Texture;
  /** Optional decoded silhouette/cutout alpha mask, not a substitute for depth. */
  alpha?: Texture;
  /** Baked preserves the image's existing shadows; relight is for clean albedo only. */
  lighting?: "baked" | "relight";
  roughness?: number;
  metalness?: number;
  /** Discard nearly transparent texels so silhouettes cast clean shadows. */
  alphaTest?: number;
}

/** Wrap the relief geometry as a mesh; dispose() owns geometry/material, never supplied textures. */
export function createImageRelief(spec: ImageReliefSpec, depth: ReliefDepthPixels, options: ImageReliefMaterialOptions) {
  const { geometry, minZ, maxZ, vertices } = createImageReliefGeometry(spec, depth);
  if (!options?.color || (options.lighting && !["baked", "relight"].includes(options.lighting)) ||
    ![options.roughness ?? .9, options.metalness ?? 0, options.alphaTest ?? .02].every(n => Number.isFinite(n) && n >= 0 && n <= 1)) {
    geometry.dispose();
    throw new Error("Image relief needs a color texture and valid material settings.");
  }
  const props = {
    map: options.color, alphaMap: options.alpha ?? null,
    alphaTest: options.alphaTest ?? .02, side: DoubleSide,
    transparent: false,
  };
  const material = options.lighting === "relight"
    ? new MeshStandardMaterial({ ...props, roughness: options.roughness ?? .9, metalness: options.metalness ?? 0 })
    : new MeshBasicMaterial(props);
  const mesh = new Mesh(geometry, material);
  mesh.name = spec.id;
  mesh.userData.partRole = "image-relief";
  mesh.userData.relief = { id: spec.id, minZ, maxZ, vertices };
  mesh.castShadow = options.lighting === "relight";
  mesh.receiveShadow = options.lighting === "relight";
  return { mesh, geometry, material, minZ, maxZ, vertices, dispose() { geometry.dispose(); material.dispose(); } };
}

export interface ImageReliefSources {
  /** Caller-approved, browser-loadable image URL; no asset discovery or license inference. */
  colorSrc: string;
  depthSrc: string;
  alphaSrc?: string;
}

/** Browser-only short path: decode approved images and create a ready-to-pose mesh.
 * Throws on cross-origin/decoding errors and visibly mismatched image framing.
 */
export async function createImageReliefFromSources(
  spec: ImageReliefSpec, sources: ImageReliefSources,
  options: Omit<ImageReliefMaterialOptions, "color" | "alpha"> = {}, signal?: AbortSignal,
) {
  if (typeof Image === "undefined" || typeof document === "undefined")
    throw new Error("Image relief URL loading requires a browser. Decode images in the host for server-side use.");
  const load = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
    if (!src || typeof src !== "string") { reject(new Error("Image relief image URLs must be nonempty.")); return; }
    if (signal?.aborted) { reject(new Error("Image relief loading was cancelled.")); return; }
    const image = new Image();
    image.crossOrigin = "anonymous";
    const cleanup = () => {
      image.onload = null; image.onerror = null;
      signal?.removeEventListener("abort", abort);
    };
    const abort = () => { cleanup(); image.src = ""; reject(new Error("Image relief loading was cancelled.")); };
    image.onload = () => { cleanup(); resolve(image); };
    image.onerror = () => { cleanup(); reject(new Error("Image relief source could not be decoded. Check its URL, CORS and access rights.")); };
    signal?.addEventListener("abort", abort, { once: true });
    image.src = src;
  });
  const [colorImage, depthImage, alphaImage] = await Promise.all([
    load(sources.colorSrc), load(sources.depthSrc), sources.alphaSrc ? load(sources.alphaSrc) : Promise.resolve(null),
  ]);
  if (depthImage.naturalWidth < 2 || depthImage.naturalHeight < 2 ||
    depthImage.naturalWidth > 8192 || depthImage.naturalHeight > 8192)
    throw new Error("Image relief depth resolution must be 2–8192 pixels per axis.");
  const aspect = colorImage.naturalWidth / colorImage.naturalHeight;
  if (!Number.isFinite(aspect) || !Number.isFinite(depthImage.naturalWidth / depthImage.naturalHeight) ||
    !Number.isFinite(spec.width / spec.height) ||
    Math.abs(aspect / (spec.width / spec.height) - 1) > .005 ||
    Math.abs(aspect / (depthImage.naturalWidth / depthImage.naturalHeight) - 1) > .005 ||
    (alphaImage && (!Number.isFinite(alphaImage.naturalWidth / alphaImage.naturalHeight) ||
      Math.abs(aspect / (alphaImage.naturalWidth / alphaImage.naturalHeight) - 1) > .005)))
    throw new Error("Relief color, depth and alpha assets must have the same framing/aspect ratio.");
  const canvas = document.createElement("canvas");
  canvas.width = depthImage.naturalWidth; canvas.height = depthImage.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Image relief depth decoding needs Canvas2D.");
  let pixels: Uint8ClampedArray;
  try {
    ctx.drawImage(depthImage, 0, 0);
    pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  } catch {
    throw new Error("Image relief depth pixels are unavailable. Check CORS and same-origin image access.");
  }
  const color = new Texture(colorImage);
  color.colorSpace = SRGBColorSpace;
  color.needsUpdate = true;
  const alpha = alphaImage ? new Texture(alphaImage) : undefined;
  if (alpha) alpha.needsUpdate = true;
  try {
    const relief = createImageRelief(spec, { width: canvas.width, height: canvas.height, rgba: pixels },
      { ...options, color, alpha });
    return { ...relief, color, alpha, dispose() { relief.dispose(); color.dispose(); alpha?.dispose(); } };
  } catch (error) { color.dispose(); alpha?.dispose(); throw error; }
}
