import { NatureWorldIdentityRevealScene } from "../../../registry/video/recipes/nature-world-identity-reveal";
import type { ImageAsset, NatureDepthLayer, SceneTemplateSpec } from "../../../registry/video/scene-templates";
import { ScenePreviewShell } from "./preview-shell";

const asset = (file: string) => new URL(`../assets/${file}`, import.meta.url).href;
const cut = (id: string, alt: string, width: number, height: number, licenseRef: string): ImageAsset =>
  ({ id, src: asset(`nature-layer-${id}.png`), alt, width, height, licenseRef });
const palm = cut("palm", "A tall palm, backlit against the opening", 468, 768, "commons-single-tree-palm-cc0");
const banana = cut("banana", "Broad banana leaves", 1600, 550, "commons-banana-leaf-cc0");
const frond = cut("frond", "A pinnate frond catching light", 1100, 1100, "commons-fern-lighting-cc0");
/** Far to near. The hero palm starts mid-ground, whole and in focus; the walk passes it on its right. */
const layers: NatureDepthLayer[] = [
  // The trunk runs off the bottom of frame, so the palm stands in the undergrowth rather than on the path.
  { image: palm, depth: 7.5, x: .35, y: .6, height: .84, portrait: { x: .3, y: .56, height: .6 } },
  { image: banana, depth: 4.6, x: .84, y: .86, height: .38, flip: true, portrait: { x: .88, y: .86, height: .22 } },
  { image: frond, depth: 2.6, x: .05, y: .1, height: .72, portrait: { x: .04, y: .08, height: .42 } },
  { image: frond, depth: 3.2, x: .97, y: .92, height: .6, flip: true, portrait: { x: .98, y: .94, height: .36 } },
];
export const natureSpec: SceneTemplateSpec<"nature-world-identity-reveal"> = {
  schemaVersion: 1, recipeVersion: 1, recipeId: "nature-world-identity-reveal", id: "nature-identity",
  fps: { num: 24, den: 1 }, durationFrames: 336, width: 960, height: 540,
  // Walk toward the palm and past it while focus racks to the clearing, a sun shaft finds the mark, then the name.
  cueFrames: [168, 186, 234], background: "#050805", accent: "#ffd58a",
  content: {
    environment: { id: "jungle-path", src: asset("nature-jungle-path.jpg"), alt: "A jungle path under arching palm fronds, opening into light", licenseRef: "commons-punta-tuna-jungle-cc0", width: 2560, height: 1706 },
    layers,
    mark: { id: "demo-mark", src: asset("identity-mark-demo.svg"), alt: "Demo identity mark: an evergreen inside a ring", licenseRef: "kumiki-original", width: 400, height: 440 },
    name: "Alderwick", tagline: "Made slowly, outdoors",
    placement: { x: .5, y: .56, height: .15 },
    material: { kind: "solid", color: "#c9b083", thickness: .08 },
    foreground: "tropical",
    light: { x: .56, color: "#ffe6a6" }, haze: .15,
    walk: { distance: 6.5, truck: .02, bob: .5, environmentDepth: 16 },
    focus: { from: 7.5, to: 16, rack: [.4, .8], aperture: .5 },
  },
};
export function NatureWorldIdentityRevealPreview() {
  return <ScenePreviewShell title="Nature-World Identity Reveal" subtitle="Jungle walk-in past a palm with a focus pull, then a sun shaft finds an original demo mark · 14 seconds"
    fps={24} durationFrames={natureSpec.durationFrames} reducedFrame={320}
    credits={<>Photographs via Wikimedia Commons, CC0: “Punta-Tuna-Beach-Jungle” by BrickLightning (plate); palm keyed from “Single tree 2” by Guru_Ethic; banana leaves keyed from “Banana leaf 123” by Angelogwologeorge; frond keyed from “Fern lighting” by Shyamal. The mark and the name “Alderwick” are original placeholders, not a brand. 2.5D depth planes, not a navigable 3D scene. No audio.</>}>
    {({ frame, portrait, reduced }) => <NatureWorldIdentityRevealScene spec={{ ...natureSpec, width: portrait ? 540 : 960, height: portrait ? 960 : 540 }}
      frame={frame} reducedMotion={reduced} style={{ color: "#f6f1e6" }}/>}
  </ScenePreviewShell>;
}
