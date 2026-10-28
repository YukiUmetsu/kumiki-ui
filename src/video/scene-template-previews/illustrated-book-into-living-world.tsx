import { IllustratedBookIntoLivingWorldScene } from "../../../registry/video/recipes/illustrated-book-into-living-world";
import type { SceneTemplateSpec } from "../../../registry/video/scene-templates";
import { ScenePreviewShell } from "./preview-shell";

const asset = (file: string) => new URL(`../assets/${file}`, import.meta.url).href;
export const bookSpec: SceneTemplateSpec<"illustrated-book-into-living-world"> = {
  schemaVersion: 1, recipeVersion: 1, recipeId: "illustrated-book-into-living-world", id: "book-world",
  fps: { num: 24, den: 1 }, durationFrames: 336, width: 960, height: 540,
  // Establish the book, turn one curved leaf, read, push into the art, hold the living world.
  cueFrames: [36, 150, 230], background: "#120c08", accent: "#ffd9a6",
  content: {
    spreads: [
      { id: "forest", label: "Chapter One", heading: "The edge of the wood",
        text: "Past the last fence the path thinned to a line of trodden grass, and the trees closed in like a held breath.",
        art: { id: "art-forest", src: asset("book-art-forest.jpg"), alt: "A painted forest clearing", licenseRef: "derived-commons-new-forest-clearing-cc0", width: 1600, height: 1200 },
        caption: "The clearing, as the map remembered it." },
      { id: "lake", label: "Chapter Two", heading: "Where the water keeps the sky",
        text: "Beyond the ridge the valley opened onto still water, so clear it held every mountain twice.",
        art: { id: "art-lake", src: asset("book-art-lake.jpg"), alt: "A painted mountain lake reflecting the slopes", licenseRef: "derived-commons-austrian-lake-cc0", width: 1600, height: 1060 },
        caption: "The lake below the ridge." },
    ],
    world: { id: "world-lake", src: asset("book-world-lake.jpg"), alt: "A mountain lake in autumn, forested slopes mirrored in still water", licenseRef: "commons-austrian-lake-cc0", width: 2560, height: 1696 },
    title: "Where the water keeps the sky", line: "Chapter Two",
    surface: { id: "table", src: asset("book-table-wood.jpg"), alt: "Dark wooden planks", licenseRef: "polyhaven-dark-wooden-planks-diffuse-2k", width: 1600, height: 1600 },
  },
};
export function IllustratedBookIntoLivingWorldPreview() {
  return <ScenePreviewShell title="Illustrated Book into Living World" subtitle="Curved 24-strip page turn, push into the illustration and a registered match into the photograph it depicts · 14 seconds"
    fps={24} durationFrames={bookSpec.durationFrames} reducedFrame={320}
    credits={<>World: “Austrian mountains over a lake” by Michael Fruehmann (Wikimedia Commons, CC0); page art is an illustrated rendering of that photograph and of “Clearing in the New Forest” by GothicGolem29 (CC0). Table: Poly Haven “Dark Wooden Planks” (CC0). Story copy is original placeholder text. No audio.</>}>
    {({ frame, portrait, reduced }) => <IllustratedBookIntoLivingWorldScene spec={{ ...bookSpec, width: portrait ? 540 : 960, height: portrait ? 960 : 540 }}
      frame={frame} reducedMotion={reduced} style={{ color: "#f6f1e6" }}/>}
  </ScenePreviewShell>;
}
