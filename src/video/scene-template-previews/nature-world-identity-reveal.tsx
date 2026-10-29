import { NatureWorldIdentityRevealScene } from "../../../registry/video/recipes/nature-world-identity-reveal";
import type { ImageAsset, NatureDepthLayer, SceneTemplateSpec } from "../../../registry/video/scene-templates";
import { ScenePreviewShell } from "./preview-shell";

const asset = (file: string) => new URL(`../assets/${file}`, import.meta.url).href;
const cut = (id: string, alt: string, width: number, height: number, licenseRef: string): ImageAsset =>
  ({ id, src: asset(`nature-layer-${id}.png`), alt, width, height, licenseRef });
const mossy = "commons-verdant-mossy-trees-cc0", mist = "commons-mist-in-the-woods-cc0";
const fern = cut("fern-bank", "A mossy fern bank", 1600, 754, mossy);
/** Planes from far to near; each has its own depth, so one camera drives all their parallax. */
const layers: NatureDepthLayer[] = [
  { image: cut("canopy", "An overhanging hemlock branch", 1410, 960, mist), depth: 2.2, x: .66, y: .14, height: .78, portrait: { x: .72, y: .12, height: .42 } },
  { image: cut("right-trunk", "A moss-covered trunk", 290, 568, mossy), depth: 1.6, x: .16, y: .42, height: 1.5, portrait: { x: .1, y: .42, height: .95 } },
  // The front tree stands between the camera and the mark; walking past it uncovers the clearing.
  { image: cut("front-tree", "A leaning mossy tree in the foreground", 554, 800, mossy), depth: 1.35, x: .42, y: .5, height: 1.45, portrait: { x: .62, y: .52, height: .85 } },
  { image: fern, depth: 1.15, x: .1, y: .97, height: .8, flip: true, portrait: { x: .1, y: .98, height: .42 } },
  { image: fern, depth: 1.15, x: .7, y: .95, height: .8, portrait: { x: .72, y: .97, height: .42 } },
];
export const natureSpec: SceneTemplateSpec<"nature-world-identity-reveal"> = {
  schemaVersion: 1, recipeVersion: 1, recipeId: "nature-world-identity-reveal", id: "nature-identity",
  fps: { num: 24, den: 1 }, durationFrames: 300, width: 960, height: 540,
  // Walk in and settle, a sun shaft finds the mark, then the name.
  cueFrames: [132, 150, 204], background: "#050805", accent: "#ffd58a",
  content: {
    environment: { id: "clearing", src: asset("nature-clearing.jpg"), alt: "A grassy forest clearing ringed by ferns and conifers", licenseRef: "commons-new-forest-clearing-cc0", width: 2560, height: 1920 },
    layers,
    mark: { id: "demo-mark", src: asset("identity-mark-demo.svg"), alt: "Demo identity mark: an evergreen inside a ring", licenseRef: "kumiki-original", width: 400, height: 440 },
    name: "Alderwick", tagline: "Made slowly, outdoors",
    placement: { x: .46, y: .66, height: .24 },
    material: { kind: "solid", color: "#b89b74", thickness: .08 },
    light: { x: .3, color: "#ffd9a0" }, haze: .25,
    walk: { distance: 1.7, truck: -.03, bob: .5 },
  },
};
export function NatureWorldIdentityRevealPreview() {
  return <ScenePreviewShell title="Nature-World Identity Reveal" subtitle="Walk-in through five depth planes cut from CC0 photographs · sun shaft reveal of an original demo mark · 12.5 seconds"
    fps={24} durationFrames={natureSpec.durationFrames} reducedFrame={280}
    credits={<>Photographs via Wikimedia Commons, CC0: “Clearing in the New Forest” by GothicGolem29; trunk and fern cutouts from “Verdant mossy trees” by Matthew Murphy; hemlock branch keyed from “Mist in the middle of the woods” by Gabriel Santiago. The mark and the name “Alderwick” are original placeholders, not a brand. 2.5D depth planes, not a navigable 3D scene. No audio.</>}>
    {({ frame, portrait, reduced }) => <NatureWorldIdentityRevealScene spec={{ ...natureSpec, width: portrait ? 540 : 960, height: portrait ? 960 : 540 }}
      frame={frame} reducedMotion={reduced} style={{ color: "#f6f1e6" }}/>}
  </ScenePreviewShell>;
}
