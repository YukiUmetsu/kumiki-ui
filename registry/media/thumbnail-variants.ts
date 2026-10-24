/** Stable editorial alternatives: no random layouts, copy or generated image content. */
import { composeEditorialThumbnail, type EditorialThumbnailInput, type EditorialThumbnailResult } from "./thumbnail-art-direction";
import { ThumbnailCompositionError } from "./thumbnail-composition";

type EditorialLayout = EditorialThumbnailInput["layout"];
const KNOWN_LAYOUTS: readonly EditorialLayout[] = ["subject-left", "subject-right", "split-comparison"];

/**
 * Return reproducible independently editable options; no hidden copy decisions.
 * A split-comparison source is not silently converted to a single-subject story.
 */
export function composeEditorialVariants(input: EditorialThumbnailInput,
  variants?: readonly EditorialLayout[]): readonly EditorialThumbnailResult[] {
  const selected = variants ?? (input.layout === "split-comparison"
    ? ["split-comparison"] : ["subject-left", "subject-right"]);
  if (!selected.length || selected.some((layout) => !KNOWN_LAYOUTS.includes(layout)))
    throw new RangeError("Supply at least one supported editorial thumbnail layout.");
  if (new Set(selected).size !== selected.length)
    throw new RangeError("Variant layouts must be distinct to preserve stable document IDs.");
  if (selected.includes("split-comparison") && !input.secondary)
    throw new ThumbnailCompositionError([{ code: "thumbnail-secondary-required", severity: "error",
      message: "A comparison variant requires a distinct second source image." }]);
  return selected.map((layout) => composeEditorialThumbnail({ ...input, layout, id: `${input.id}-${layout}` }));
}
