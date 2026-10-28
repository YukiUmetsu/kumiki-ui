import { NatureWorldIdentityRevealScene } from "../../../registry/video/recipes/nature-world-identity-reveal";
import type { SceneTemplateSpec } from "../../../registry/video/scene-templates";
import { ScenePreviewShell } from "./preview-shell";

const asset = (file: string) => new URL(`../assets/${file}`, import.meta.url).href;
export const natureSpec: SceneTemplateSpec<"nature-world-identity-reveal"> = {
  schemaVersion: 1, recipeVersion: 1, recipeId: "nature-world-identity-reveal", id: "nature-identity",
  fps: { num: 24, den: 1 }, durationFrames: 288, width: 960, height: 540,
  // Push through the forest, pass a branch into the clearing, light reaches the mark, then the name.
  cueFrames: [84, 150, 196], background: "#050805", accent: "#ffd58a",
  content: {
    approach: { id: "approach", src: asset("nature-approach.jpg"), alt: "Moss-covered trees in a dim forest", licenseRef: "commons-verdant-mossy-trees-cc0", width: 2560, height: 1706 },
    environment: { id: "clearing", src: asset("nature-clearing.jpg"), alt: "A grassy forest clearing ringed by ferns and conifers", licenseRef: "commons-new-forest-clearing-cc0", width: 2560, height: 1920 },
    mark: { id: "demo-mark", src: asset("identity-mark-demo.svg"), alt: "Demo identity mark: an evergreen inside a ring", licenseRef: "kumiki-original", width: 400, height: 440 },
    name: "Alderwick", tagline: "Made slowly, outdoors",
    placement: { x: .46, y: .74, height: .3 },
    material: { kind: "solid", color: "#e3d6bb", thickness: .05 },
    light: { x: .2, y: .02, color: "#ffd9a0" }, haze: .2,
  },
};
export function NatureWorldIdentityRevealPreview() {
  return <ScenePreviewShell title="Nature-World Identity Reveal" subtitle="Two CC0 forest plates, procedural foreground foliage and an original demo mark · 12 seconds"
    fps={24} durationFrames={natureSpec.durationFrames} reducedFrame={270}
    credits={<>Plates via Wikimedia Commons, CC0: “Verdant mossy trees” by Matthew Murphy; “Clearing in the New Forest” by GothicGolem29. The mark and the name “Alderwick” are original placeholders, not a brand. Foreground foliage is procedural. 2.5D multi-plane, not a navigable 3D scene. No audio.</>}>
    {({ frame, portrait, reduced }) => <NatureWorldIdentityRevealScene spec={{ ...natureSpec, width: portrait ? 540 : 960, height: portrait ? 960 : 540 }}
      frame={frame} reducedMotion={reduced} style={{ color: "#f6f1e6" }}/>}
  </ScenePreviewShell>;
}
