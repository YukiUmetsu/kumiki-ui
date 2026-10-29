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
  cueFrames: [90, 146, 204], background: "#050805", accent: "#ffd58a",
  content: {
    environment: { id: "jungle-path", src: asset("nature-jungle-path.jpg"), alt: "A jungle path under arching palm fronds, opening into light", licenseRef: "commons-punta-tuna-jungle-cc0", width: 2560, height: 1706 },
    layers,
    mark: { id: "demo-mark", src: asset("identity-mark-demo.svg"), alt: "Demo identity mark: an evergreen inside a ring", licenseRef: "kumiki-original", width: 400, height: 440 },
    name: "Alderwick", tagline: "Made slowly, outdoors",
    placement: { x: .5, y: .56, height: .15 },
    material: { kind: "solid", color: "#f1ede4", thickness: .08 },
    foreground: "tropical",
    light: { x: .56, color: "#ffe6a6" }, haze: .15,
    walk: { distance: 6.5, truck: .02, bob: .5, environmentDepth: 16 },
    focus: { from: 7.5, to: 16, rack: [.4, .8], aperture: .5 },
    // Real 3D jungle (CC0 Poly Haven scans and textures). Relative to the story iframe; Storybook serves the folder.
    scene3d: {
      undergrowth: ["calathea_orbifolia_01", "anthurium_botany_01", "fern_02", "shrub_sorrel_01"].map(id =>
        ({ id, src: `./nature3d/${id}/${id}_1k.gltf`, licenseRef: `polyhaven-${id}` })),
      hdri: { id: "sunset_forest", src: "./nature3d/hdri/sunset_forest_1k.hdr", licenseRef: "polyhaven-sunset-forest" },
      ground: { id: "forest_leaves_02", diffuse: "./nature3d/ground/forest_leaves_02_diffuse_1k.jpg", normal: "./nature3d/ground/forest_leaves_02_nor_gl_1k.jpg",
        arm: "./nature3d/ground/forest_leaves_02_arm_1k.jpg", licenseRef: "polyhaven-forest-leaves-02" },
      bark: { id: "bark_brown_02", diffuse: "./nature3d/bark/bark_brown_02_diff_1k.jpg", normal: "./nature3d/bark/bark_brown_02_nor_gl_1k.jpg", licenseRef: "polyhaven-bark-brown-02" },
      sun: { azimuth: 22, elevation: 15, warmth: .75, intensity: 1.1 }, density: 1.1, dof: 1, camera: "glide",
      grade: { saturation: 1.15, warmth: .55, exposure: 1.05 }, grove: "bamboo", seed: 7,
    },
  },
};
export function NatureWorldIdentityRevealPreview() {
  return <ScenePreviewShell title="Nature-World Identity Reveal" subtitle="Real-time 3D jungle: a low glide through scanned undergrowth to a 3D mark · 14 seconds"
    fps={24} durationFrames={natureSpec.durationFrames} reducedFrame={320}
    credits={<>3D: Poly Haven, CC0 — Calathea Orbifolia 01, Anthurium Botany 01, Fern 02 (scans by Rob Tuytel, models by Rico Cilliers), Shrub Sorrel 01 (Rico Cilliers); “Sunset Forest” HDRI (Andreas Mischok); Forest Leaves 02 and Bark Brown 02 textures (Rob Tuytel). Fan palms, broad leaves and bamboo are procedural. Reduced-motion and no-WebGL fallback: CC0 Wikimedia Commons photographs (Punta-Tuna-Beach-Jungle by BrickLightning; palm, banana and frond cutouts by Guru_Ethic, Angelogwologeorge and Shyamal). The mark and “Alderwick” are original placeholders, not a brand. No audio.</>}>
    {({ frame, portrait, reduced }) => <NatureWorldIdentityRevealScene spec={{ ...natureSpec, width: portrait ? 540 : 960, height: portrait ? 960 : 540 }}
      frame={frame} reducedMotion={reduced} style={{ color: "#f6f1e6" }}/>}
  </ScenePreviewShell>;
}
