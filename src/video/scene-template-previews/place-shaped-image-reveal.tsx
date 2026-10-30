import { PlaceShapedImageRevealScene } from "../../../registry/video/recipes/place-shaped-image-reveal";
import type { SceneTemplateSpec } from "../../../registry/video/scene-templates";
import { ScenePreviewShell } from "./preview-shell";
import boundary from "../assets/place-iceland-boundary.json";

const asset = (file: string) => new URL(`../assets/${file}`, import.meta.url).href;
export const placeSpec: SceneTemplateSpec<"place-shaped-image-reveal"> = {
  schemaVersion: 1, recipeVersion: 1, recipeId: "place-shaped-image-reveal", id: "place-iceland",
  fps: { num: 24, den: 1 }, durationFrames: 288, width: 960, height: 540,
  // Locate and trace, flood the outline with the first photograph, add context, then hold.
  cueFrames: [60, 120, 228], background: "#04070b", accent: "#7fd3e6",
  content: {
    name: "Iceland", eyebrow: "North Atlantic · 64° N",
    context: "Waterfalls, glacier lagoons and fjords on the edge of the Arctic Circle.",
    boundary: { rings: boundary.rings as [number, number][][], source: boundary.source, licenseRef: "natural-earth-10m-admin0" },
    imagery: [
      { image: { id: "seljalandsfoss", src: asset("place-iceland-seljalandsfoss.jpg"), alt: "Seljalandsfoss waterfall at sunset above green lowland",
        licenseRef: "commons-seljalandsfoss-cc0", width: 2400, height: 1452 }, caption: "Seljalandsfoss", latitude: 63.6156, longitude: -19.9922 },
      { image: { id: "jokulsarlon", src: asset("place-iceland-jokulsarlon.jpg"), alt: "Icebergs resting on the still water of Jökulsárlón lagoon",
        licenseRef: "commons-jokulsarlon-cc0", width: 2400, height: 1602 }, caption: "Jökulsárlón", latitude: 64.0485, longitude: -16.1795 },
      { image: { id: "dynjandi", src: asset("place-iceland-dynjandi.jpg"), alt: "Dynjandi waterfall cascading down terraced rock in the Westfjords",
        licenseRef: "commons-dynjandi-cc0", width: 2400, height: 1602 }, caption: "Dynjandi", latitude: 65.7328, longitude: -23.1999 },
    ],
    compositeNote: "Photographs taken in Iceland, framed by its outline. Not an aerial view.",
    credit: "Outline: Natural Earth, public domain · Photos: Wikimedia Commons, CC0",
  },
};

/** Japanese copy exercises CJK wrapping, long captions and the display-size cap. */
const japanese = {
  name: "アイスランド", eyebrow: "北大西洋 · 北緯64度",
  context: "北極圏のすぐそばに、滝と氷河湖とフィヨルドが広がる島。",
  compositeNote: "アイスランドで撮影した写真を国の輪郭で切り抜いた合成です。航空写真ではありません。",
  credit: "輪郭: Natural Earth(パブリックドメイン)· 写真: Wikimedia Commons(CC0)",
  captions: ["セリャラントスフォス", "ヨークルスアゥルロゥン", "ディンヤンディ"],
};
export function placeSpecFor(language: "en" | "ja"): SceneTemplateSpec<"place-shaped-image-reveal"> {
  if (language === "en") return placeSpec;
  const { captions, ...copy } = japanese;
  return { ...placeSpec, content: { ...placeSpec.content, ...copy,
    imagery: placeSpec.content.imagery.map((item, i) => ({ ...item, caption: captions[i] })) } };
}
export function PlaceShapedImageRevealPreview({ language = "en" }: { language?: "en" | "ja" }) {
  const spec = placeSpecFor(language);
  return <ScenePreviewShell title="Place-Shaped Image Reveal" subtitle="Natural Earth outline in a place-centred orthographic projection · three CC0 photographs · 12 seconds"
    fps={24} durationFrames={spec.durationFrames} reducedFrame={250}
    credits={<>Outline: <a href="https://www.naturalearthdata.com/">Natural Earth</a> 1:10m Admin 0, public domain. Photos via Wikimedia Commons, CC0: Seljalandsfoss by Robert Lukeman; Jökulsárlón by Jeremy Goldberg; Dynjandi by Mustang Joe. No audio.</>}>
    {({ frame, portrait, reduced }) => <PlaceShapedImageRevealScene spec={{ ...spec, width: portrait ? 540 : 960, height: portrait ? 960 : 540 }}
      frame={frame} reducedMotion={reduced} style={{ color: "#f4f1ea" }}/>}
  </ScenePreviewShell>;
}
