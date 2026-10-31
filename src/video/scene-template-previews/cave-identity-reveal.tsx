import type { CSSProperties } from "react";
import { CaveIdentityRevealScene } from "../../../registry/video/recipes/cave-identity-reveal";
import type { SceneTemplateSpec } from "../../../registry/video/scene-templates";
import { ScenePreviewShell } from "./preview-shell";
import { IdentitySceneExport } from "./identity-scene-export";

const asset = (file: string) => new URL(`../assets/${file}`, import.meta.url).href;
const caveStyle = { "--km-environment-exposure": ".94", "--km-depth-layer-exposure": ".61" } as CSSProperties;
const rights = "polyhaven-cave-rock-plates";
export const caveSpec: SceneTemplateSpec<"nature-world-identity-reveal"> = {
  schemaVersion: 1, recipeVersion: 1, recipeId: "nature-world-identity-reveal", id: "cave-identity",
  fps: { num: 24, den: 1 }, durationFrames: 336, width: 960, height: 540,
  cueFrames: [120, 168, 216], background: "#0c0907", accent: "#e8d6b1",
  content: {
    environment: { id: "cave-plate", src: asset("cave-supplied.jpg"), alt: "A deep damp stone cave with a softly lit distant passage",
      width: 2048, height: 1143, licenseRef: "user-supplied-cave" },
    mark: { id: "aperture-mark", src: asset("identity-cave-demo.svg"), alt: "Diamond aperture emblem", width: 400, height: 400, licenseRef: "kumiki-original" },
    name: "Deepfield", tagline: "Beyond the surface",
    placement: { x: .5, y: .55, height: .18 }, treatment: "cinematic",
    walk: { distance: 4.5, environmentDepth: 10.5, truck: 0, bob: 0 },
    layers: [
      { image: { id: "cave-left-outcrop", src: asset("cave-scan-outcrop.png"), alt: "Stratified angular rock outcrop on the left", width: 1024, height: 1536, licenseRef: rights },
        depth: 7.9, x: .11, y: .52, height: 1.05, sway: 0, portrait: { x: -.20, y: .52, height: .90 } },
      { image: { id: "cave-left-ledge", src: asset("cave-scan-ledge.png"), alt: "Low angular rock slabs at the lower-left threshold", width: 1678, height: 937, licenseRef: rights },
        depth: 5.6, x: .20, y: .81, height: .58, sway: 0, portrait: { x: -.06, y: .84, height: .48 } },
      { image: { id: "cave-inner-wall", src: asset("cave-scan-right.png"), alt: "A distant rocky cave buttress", width: 1024, height: 1536, licenseRef: rights },
        depth: 7.4, x: .92, y: .5, height: 1.5, sway: 0, portrait: { x: 1.20, y: .5, height: 1.25 } },
      { image: { id: "cave-near-left", src: asset("cave-scan-left.png"), alt: "Wet jagged rock face close to the left of the lens", width: 1024, height: 1536, licenseRef: rights },
        depth: 3.2, x: .06, y: .5, height: 1.65, sway: 0, portrait: { x: -.29, y: .5, height: 1.3 } },
      { image: { id: "cave-near-right", src: asset("cave-scan-right.png"), alt: "Near rock column on the right", width: 1024, height: 1536, licenseRef: rights },
        depth: 4.1, x: 1.02, y: .5, height: 1.7, sway: 0, portrait: { x: 1.50, y: .5, height: 1.35 } },
      { image: { id: "cave-ceiling", src: asset("cave-scan-overhang.png"), alt: "Close cave overhang with mineral points", width: 1678, height: 937, licenseRef: rights },
        depth: 2.8, x: .5, y: .13, height: 1.08, sway: 0, portrait: { x: .5, y: .01, height: .46 } },
    ],
    material: { kind: "solid", color: "#e8d7b5", thickness: .08 },
    light: { x: .52, color: "#bdc8bb" }, haze: .06, look: { grain: .15, vignette: .64 },
  },
};
export function CaveIdentityRevealPreview() {
  if (new URLSearchParams(window.location.search).get("kmExport") === "1") return <IdentitySceneExport spec={caveSpec} Scene={CaveIdentityRevealScene} style={caveStyle}/>;
  return <ScenePreviewShell title="Cave Identity Reveal" subtitle="Through the threshold · a 14-second cave identity film"
    fps={24} durationFrames={336} reducedFrame={320}
    credits={<>Cave photograph supplied by the user; foreground plates rendered from CC0 Poly Haven rock assets (Rock Face 01/02 and Rock Moss Set 01), with matte stratified stone. Rock renders are CC0; supplied photograph redistribution rights are unverified. Original placeholder emblem and identity. Local cave-logo video used only for direction; no reference pixels, audio or branding are redistributed. Silent.</>}>
    {({ frame, portrait, reduced }) => <CaveIdentityRevealScene spec={{ ...caveSpec, width: portrait ? 540 : 960, height: portrait ? 960 : 540 }} frame={frame} reducedMotion={reduced}
      style={caveStyle}/>}
  </ScenePreviewShell>;
}
