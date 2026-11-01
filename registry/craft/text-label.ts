// The registry installs the adjacent declaration shim with this source.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./troika-three-text.d.ts" />
/** Crisp, world-space SDF text, built with Troika rather than canvas textures
 * or generated text baked into imagery. Intended for static labels prepared
 * before MG1 camera/frame export; not for per-frame text topology changes.
 * The caller supplies and has licensed a font URL; no font is chosen by Kumiki.
 */
import { Text } from "troika-three-text";

type Vec3 = readonly [number, number, number];

export interface CraftTextLabelSpec {
  schemaVersion: 1;
  id: string;
  text: string;
  /** Explicit approved .ttf/.otf/.woff URL. Troika does not support woff2. */
  fontUrl: string;
  /** Scene units, for surface signage or physical device markings. */
  fontSize: number;
  at: Vec3;
  /** XYZ Euler radians; defaults to [0,0,0] on the world XY plane. */
  rotation?: Vec3;
  anchorX?: "left" | "center" | "right";
  anchorY?: "middle" | "top" | "bottom" | "bottom-baseline" | "top-baseline";
  align?: "left" | "center" | "right";
  /** RGB integer, 0x000000–0xffffff. */
  color?: number;
  /** A modest stroke that remains sharp during camera movements. */
  outline?: { width: number; color: number };
  maxWidth?: number;
  /** Self-hosted Troika Unicode fallback metadata, if extended script coverage is needed. */
  unicodeFontsURL?: string;
}

const validId = (id: unknown): id is string => typeof id === "string" && !!id.trim() && id.length <= 96;
const positive = (n: number) => Number.isFinite(n) && n > 0;
const rgb = (n: number) => Number.isInteger(n) && n >= 0 && n <= 0xffffff;
const vec3 = (v: unknown): v is Vec3 => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);
const fontURL = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= 2048 &&
  (/^(https?:\/\/|\/|\.\/|\.\.\/)/.test(v) || /^data:font\/(?:ttf|otf|woff);base64,/.test(v)) &&
  !/[\r\n]/.test(v);

export function validateCraftTextLabelSpec(spec: CraftTextLabelSpec): void {
  if (spec?.schemaVersion !== 1 || !validId(spec.id) || typeof spec.text !== "string" ||
    !spec.text.trim() || spec.text.length > 300 || [...spec.text].some(char => {
      const code = char.charCodeAt(0);
      return code <= 31 && code !== 9 && code !== 10 && code !== 13;
    }))
    throw new Error("Text label needs schemaVersion 1, a safe ID, and 1–300 printable characters.");
  if (!fontURL(spec.fontUrl) || !/\.(ttf|otf|woff)(?:[?#]|$)/i.test(spec.fontUrl) && !spec.fontUrl.startsWith("data:font/"))
    throw new Error("Text label requires an explicit approved .ttf, .otf or .woff URL (not .woff2).");
  if (!positive(spec.fontSize) || spec.fontSize > 20 || !vec3(spec.at) ||
    spec.at.some(n => Math.abs(n) > 1000) || (spec.rotation !== undefined && !vec3(spec.rotation)))
    throw new Error("Text label needs a finite pose and fontSize in (0,20].");
  if (spec.maxWidth !== undefined && (!positive(spec.maxWidth) || spec.maxWidth > 100))
    throw new Error("Text label maxWidth must be positive and <= 100.");
  if (spec.anchorX && !["left", "center", "right"].includes(spec.anchorX))
    throw new Error("Unsupported text label horizontal anchor.");
  if (spec.anchorY && !["middle", "top", "bottom", "bottom-baseline", "top-baseline"].includes(spec.anchorY))
    throw new Error("Unsupported text label vertical anchor.");
  if (spec.align && !["left", "center", "right"].includes(spec.align))
    throw new Error("Unsupported text label alignment.");
  if (spec.color !== undefined && !rgb(spec.color)) throw new Error("Invalid label RGB color.");
  if (spec.outline && (!Number.isFinite(spec.outline.width) || spec.outline.width < 0 ||
    spec.outline.width > spec.fontSize / 4 || !rgb(spec.outline.color)))
    throw new Error("Text outline must be RGB with width 0–25% of fontSize.");
  if (spec.unicodeFontsURL !== undefined && !fontURL(spec.unicodeFontsURL))
    throw new Error("Unicode fallback metadata needs an explicit local or approved URL.");
  if ([...spec.text].some(char => char.charCodeAt(0) > 126) && !spec.unicodeFontsURL)
    throw new Error("Non-ASCII labels require a configured Unicode fallback host; do not rely on Troika's CDN default.");
}

/** `ready` must resolve before any video-frame capture or export. */
export function createCraftTextLabel(spec: CraftTextLabelSpec) {
  validateCraftTextLabelSpec(spec);
  const mesh = new Text();
  mesh.name = spec.id;
  mesh.userData.partRole = "precise-world-space-text";
  mesh.text = spec.text;
  mesh.font = spec.fontUrl;
  mesh.fontSize = spec.fontSize;
  mesh.maxWidth = spec.maxWidth ?? Infinity;
  mesh.textAlign = spec.align ?? "left";
  mesh.anchorX = spec.anchorX ?? "left";
  mesh.anchorY = spec.anchorY ?? "middle";
  mesh.color = spec.color ?? 0xffffff;
  if (spec.outline) {
    mesh.outlineWidth = spec.outline.width;
    mesh.outlineColor = spec.outline.color;
  }
  if (spec.unicodeFontsURL) mesh.unicodeFontsURL = spec.unicodeFontsURL;
  mesh.position.set(...spec.at);
  if (spec.rotation) mesh.rotation.set(...spec.rotation);
  let disposed = false;
  const ready = new Promise<void>(resolve => mesh.sync(resolve));
  return { mesh, ready, dispose() {
    if (disposed) return;
    disposed = true;
    mesh.dispose();
  } };
}
