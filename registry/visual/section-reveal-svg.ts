/** SVG adapter for SectionReveal (isolate/ghost on 2D assets).
 *
 * SVG group opacity multiplies down the tree, so fading an ancestor would
 * also fade a target nested inside it. This adapter therefore keeps every
 * ancestor of a target opaque and fades each other branch once, at its
 * topmost part. Untagged art drawn directly inside a kept ancestor cannot be
 * faded separately; that limitation is reported, not hidden.
 */
import type { InspectableAsset } from "./inspectable-asset";
import type { SectionRevealFrame } from "./section-reveal";

export interface SvgSectionResult {
  /** Opacity to set on each part element (undefined = leave as is / inherit). */
  opacity: ReadonlyMap<string, number | undefined>;
  notes: readonly string[];
}

export function sectionRevealSvgOpacities(state: SectionRevealFrame, asset: InspectableAsset): SvgSectionResult {
  if (asset.dimension !== 2) throw new Error("sectionRevealSvgOpacities needs a 2D inspectable asset.");
  const parent = new Map(asset.parts.map(p => [p.id, p.parentId]));
  const keep = new Set<string>();
  for (const [id, s] of state.parts) if (s.role === "target") for (let p: string | undefined = id; p; p = parent.get(p)) keep.add(p);
  const opacity = new Map<string, number | undefined>(), notes: string[] = [];
  for (const [id, s] of state.parts) {
    if (keep.has(id)) {
      if (s.role !== "target" && s.opacity < .999) notes.push(`"${id}" contains a target, so its own untagged art stays opaque.`);
      opacity.set(id, undefined);
      continue;
    }
    const p = parent.get(id);
    // Already faded through an ancestor branch: inherit instead of multiplying twice.
    opacity.set(id, p && !keep.has(p) ? undefined : s.opacity);
  }
  return { opacity, notes };
}
