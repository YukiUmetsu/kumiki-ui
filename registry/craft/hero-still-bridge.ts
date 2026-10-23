/**
 * Browser-only handoff from a rendered (optionally WebGL) hero canvas to the
 * existing editable media document. No Three.js or separate bitmap renderer.
 *
 * HeroAssetViewer configures preserveDrawingBuffer; capture after its
 * `data-km-hero-ready` state. Batch/CLI users may use `hero:capture` and
 * register that PNG with MediaDocument instead of this helper.
 */
import type { ImageAsset } from "../media/document";

export interface HeroStillOptions {
  /** Stable key into MediaDocument.assets. */
  id: string;
  /** Describe the visual subject for assistive technology. */
  alt: string;
  /** Source-model rights are supplied by the creator, never inferred. */
  licenseId?: string;
  attribution?: string;
}

/** Capture the current rendered frame as a self-contained PNG image asset. */
export function captureHeroStill(canvas: HTMLCanvasElement, options: HeroStillOptions): ImageAsset {
  if (!options.id?.trim()) throw new Error("Hero still needs a stable nonempty asset id.");
  if (!options.alt?.trim()) throw new Error("Hero still needs nonempty alt text.");
  if (!canvas || !Number.isFinite(canvas.width) || !Number.isFinite(canvas.height) ||
      canvas.width <= 0 || canvas.height <= 0)
    throw new Error("Hero still capture requires a canvas with nonzero width and height.");

  let uri: string;
  try {
    uri = canvas.toDataURL("image/png");
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    if (cause instanceof DOMException && cause.name === "SecurityError" || /tainted|cross-origin|security/i.test(detail))
      throw new Error("Hero still capture failed: the canvas is tainted by cross-origin content. Inline or permission-check every asset before capture.");
    throw new Error(`Hero still capture failed: ${detail}`);
  }
  if (!/^data:image\/png;base64,[a-z\d+/]+={0,2}$/i.test(uri))
    throw new Error("Hero still capture returned an empty PNG; wait until the 3D frame is ready and render again.");

  return {
    id: options.id, uri, mediaType: "image/png", width: canvas.width, height: canvas.height,
    alt: options.alt,
    ...(options.licenseId ? { licenseId: options.licenseId } : {}),
    ...(options.attribution ? { attribution: options.attribution } : {}),
  };
}
