import { IdentitySceneExport } from "./identity-scene-export";
import { NatureWorldIdentityRevealScene } from "../../../registry/video/recipes/nature-world-identity-reveal";
import type { SceneTemplateSpec } from "../../../registry/video/scene-templates";
import { ScenePreviewShell } from "./preview-shell";

const asset = (file: string) => new URL(`../assets/${file}`, import.meta.url).href;
/** One uninterrupted photographic shot. All atmosphere and typography are frame-addressable. */
export const natureSpec: SceneTemplateSpec<"nature-world-identity-reveal"> = {
  schemaVersion: 1, recipeVersion: 1, recipeId: "nature-world-identity-reveal", id: "nature-identity",
  fps: { num: 24, den: 1 }, durationFrames: 336, width: 960, height: 540,
  cueFrames: [120, 156, 204], background: "#070e09", accent: "#e8dfbd",
  content: {
    environment: { id: "supplied-jungle", src: asset("nature-jungle-clean-depth.png"),
      alt: "Misty tropical rainforest with towering moss-covered trunks and lush foreground leaves",
      licenseRef: "user-supplied-jungle-depth-derivatives", width: 1678, height: 937 },
    mark: { id: "demo-mark", src: asset("identity-mark-demo.svg"), alt: "An evergreen within a ring",
      licenseRef: "kumiki-original", width: 400, height: 440 },
    name: "Alderwick", tagline: "Made slowly, outdoors",
    treatment: "cinematic", placement: { x: .5, y: .5, height: .19 },
    walk: { distance: 4.3, environmentDepth: 10, truck: 0, bob: 0 },
    layers: [
      { image: { id: "moss-trunk-mid", src: asset("nature-moss-trunk-depth.png"),
        alt: "Moss-covered trunk with attached epiphytes and vines", width: 938, height: 1676, licenseRef: "user-supplied-jungle-depth-derivatives" },
        depth: 7.8, x: .90, y: .47, height: 1.45, sway: 0, portrait: { x: 1.18, y: .43, height: 1.25 } },
      { image: { id: "fern-right-mid", src: asset("nature-fern-cluster-depth.png"),
        alt: "Layered fern fronds growing from attached stems", width: 1132, height: 1390, licenseRef: "user-supplied-jungle-depth-derivatives" },
        depth: 5.7, x: .86, y: .96, height: .72, sway: .45, portrait: { x: 1.0, y: 1.0, height: .52 } },
      { image: { id: "fern-left-understory", src: asset("nature-fern-cluster-depth.png"),
        alt: "Smaller fern cluster on the left forest floor", width: 1132, height: 1390, licenseRef: "user-supplied-jungle-depth-derivatives" },
        depth: 6.4, x: .15, y: 1.05, height: .44, flip: true, sway: .35, portrait: { x: -.18, y: 1.02, height: .36 } },
      { image: { id: "canopy-branch-near", src: asset("nature-canopy-branch-depth.png"),
        alt: "Overhead mossy branch with attached leaves and hanging vines", width: 1678, height: 937, licenseRef: "user-supplied-jungle-depth-derivatives" },
        depth: 2.8, x: .5, y: .28, height: 1.04, sway: 0, portrait: { x: .50, y: -.03, height: .42 } },
      { image: { id: "sapling-behind-leaf", src: asset("nature-sapling-depth.png"),
        alt: "Young rainforest sapling with connected oval leaves behind the foreground leaf", width: 1024, height: 1536, licenseRef: "user-supplied-jungle-depth-derivatives" },
        depth: 5.0, x: .28, y: .70, height: .88, sway: .25, portrait: { x: -.05, y: .74, height: .68 } },
      { image: { id: "elephant-ear-near", src: asset("nature-elephant-ear-depth.png"),
      alt: "Foreground elephant-ear leaf with a long stem", width: 1024, height: 1536, licenseRef: "user-supplied-jungle-depth-derivatives" },
      depth: 3.8, x: .24, y: .87, height: .82, portrait: { x: .06, y: .93, height: .68 } },
    ],
    material: { kind: "solid", color: "#e9e3ce", thickness: .12 },
    light: { x: .42, color: "#f5e6bd" }, haze: .18,
    look: { grain: .18, vignette: .8 },
  },
};
export function NatureWorldIdentityRevealPreview() {
  if (new URLSearchParams(window.location.search).get("kmExport") === "1") return <IdentitySceneExport spec={natureSpec} Scene={NatureWorldIdentityRevealScene}/>;
  return <ScenePreviewShell title="Nature-World Identity Reveal" subtitle="Into the quiet · a 14-second photographic identity film"
    fps={24} durationFrames={natureSpec.durationFrames} reducedFrame={320}
    audio={{ src: asset("nature-jungle-ambience.wav"), label: "Rainforest birds and jungle ambience" }}
    credits={<>Jungle photograph supplied by the user; source and redistribution rights are unverified. Original placeholder identity. AI-derived foreground leaf, mossy trunk, canopy branch, fern clusters, sapling and cleaned plate, matched to the supplied photograph. Stabilized dolly and a quiet light-led identity reveal. Audio: “Walk in the rainforest” by ezwa (Guadeloupe), public domain via Wikimedia Commons; edited and faded for this film.</>}>
    {({ frame, portrait, reduced }) => <NatureWorldIdentityRevealScene spec={{ ...natureSpec, width: portrait ? 540 : 960, height: portrait ? 960 : 540 }}
      frame={frame} reducedMotion={reduced} style={{ color: "#f4efdf" }}/>}
  </ScenePreviewShell>;
}
