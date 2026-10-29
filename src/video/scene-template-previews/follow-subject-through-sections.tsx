import { FollowSubjectThroughSectionsScene } from "../../../registry/video/recipes/follow-subject-through-sections";
import type { SceneTemplateSpec } from "../../../registry/video/scene-templates";
import { PaperPlaneRig } from "./paper-plane-rig";
import { ScenePreviewShell } from "./preview-shell";

const asset = (file: string) => new URL(`../assets/${file}`, import.meta.url).href;
const plate = (id: string, file: string, alt: string) => ({ id, src: asset(file), alt, licenseRef: `polyhaven-${id}-cc0`, width: 2560, height: 1280 });
/** A folded letter crosses four worlds, morning to evening, and lands where a trail begins. */
export const followSpec: SceneTemplateSpec<"follow-subject-through-sections"> = {
  schemaVersion: 1, recipeVersion: 1, recipeId: "follow-subject-through-sections", id: "letter-journey",
  fps: { num: 24, den: 1 }, durationFrames: 336, width: 960, height: 540, background: "#05070a", accent: "#f0a24e",
  content: {
    subject: { media: { id: "paper-plane", src: asset("follow-paper-plane.svg"), alt: "A white paper plane with a red-orange stripe on each wing",
      licenseRef: "kumiki-original", width: 400, height: 200 }, size: .16, anchor: { x: .5, y: .52 }, contact: .78 },
    sections: [
      { id: "city", environment: plate("canary_wharf", "follow-city.jpg", "Glass office towers around a paved plaza under a pale morning sky"),
        focus: { x: .56, y: .45 }, duration: 84, kicker: "01 · City", title: "A letter leaves the city at first light",
        caption: "Folded at a desk and sent out between the towers.", atmosphere: "motes", light: { color: "#ffe9cf", exposure: 1.02 } },
      { id: "pines", environment: plate("misty_pines", "follow-forest.jpg", "Tall pines standing in thick fog above green ferns"),
        focus: { x: .42, y: .5 }, transition: "occluder-wipe", duration: 80, kicker: "02 · Forest", title: "Through pines still asleep in fog",
        caption: "Cool, still air lets it glide low over the ferns.", foreground: "trunks", atmosphere: "mist", light: { color: "#d5e2e4", exposure: .9 } },
      { id: "cape", environment: plate("cape_hill", "follow-cape.jpg", "A rocky headland above the sea as the low sun breaks through cloud"),
        focus: { x: .36, y: .5 }, transition: "whip-pan", start: 164, kicker: "03 · Cape", title: "Out over the cape as the sun breaks",
        caption: "A warm updraft lifts it along the ridge.", foreground: "rock", atmosphere: "motes", light: { color: "#ffd49a", exposure: 1.08 } },
      { id: "trail", environment: plate("champagne_castle_1", "follow-highland.jpg", "A grassy highland meadow with a dirt trail below a mountain escarpment"),
        focus: { x: .74, y: .5 }, transition: "camera-carry", start: 244, kicker: "04 · Home", title: "And down to the trail that leads home",
        caption: "It settles in the long grass, a few steps from home.", foreground: "grass", camera: { pan: .04, push: .1 }, light: { color: "#ffe2c2", exposure: 1 },
        path: [{ x: .42, y: .34 }, { x: .58, y: .54 }, { x: .72, y: .84, scale: 1.1 }],
        portraitPath: [{ x: .46, y: .52 }, { x: .54, y: .68 }, { x: .6, y: .86, scale: 1.1 }] },
    ],
    camera: { pan: .14, push: .06, parallax: 2.6, follow: .25 },
    arrival: { settle: .66, contact: true },
    look: { grain: .7, vignette: 1 },
  },
};

/** Japanese copy exercises CJK wrapping and the display-size cap. */
const japanese = [
  { kicker: "01 · 街", title: "夜明けの街から、一通の手紙が旅立つ", caption: "机の上で折られ、ビルのあいだへと送り出される。" },
  { kicker: "02 · 森", title: "霧に眠る松林を抜けて", caption: "ひんやりと静かな空気に乗り、シダの上を低く滑っていく。" },
  { kicker: "03 · 岬", title: "日が差す岬の上へ", caption: "あたたかい上昇気流が尾根に沿って持ち上げる。" },
  { kicker: "04 · 家路", title: "そして家へ続く小道へ", caption: "家まであと数歩、草むらにそっと降り立つ。" },
];
export function followSpecFor(language: "en" | "ja"): SceneTemplateSpec<"follow-subject-through-sections"> {
  if (language === "en") return followSpec;
  return { ...followSpec, content: { ...followSpec.content, sections: followSpec.content.sections.map((s, i) => ({ ...s, ...japanese[i] })) } };
}
export function FollowSubjectThroughSectionsPreview({ language = "en" }: { language?: "en" | "ja" }) {
  const spec = followSpecFor(language);
  return <ScenePreviewShell title="Follow Subject Through Sections" subtitle="One paper plane, four CC0 worlds: occluder wipe, whip pan, camera carry, landing · 14 seconds"
    fps={24} durationFrames={spec.durationFrames}
    credits={<>Plates: Poly Haven HDRIs, CC0, reprojected to cylindrical crops: Canary Wharf by Andreas Mischok; Misty Pines, Cape Hill (with Rico Cilliers) and Champagne Castle 1 by Greg Zaal. The paper plane rig and the copy are Kumiki originals. Near foreground forms are procedural. 2.5D multi-plane, not a navigable 3D scene. No audio.</>}>
    {({ frame, portrait, reduced }) => <FollowSubjectThroughSectionsScene spec={{ ...spec, width: portrait ? 540 : 960, height: portrait ? 960 : 540 }}
      frame={frame} reducedMotion={reduced} renderSubject={props => <PaperPlaneRig {...props}/>} style={{ color: "#f7f4ec" }}/>}
  </ScenePreviewShell>;
}
