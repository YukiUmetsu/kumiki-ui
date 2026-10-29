import { PageTurnStoryScene } from "../../../registry/video/recipes/page-turn-story";
import type { BookSpread, ImageAsset, SceneTemplateSpec, SurfaceMaps } from "../../../registry/video/scene-templates";
import { ScenePreviewShell } from "./preview-shell";

const asset = (file: string) => new URL(`../assets/page-turn/${file}`, import.meta.url).href;
const plate = (id: string, file: string, alt: string, licenseRef: string): ImageAsset =>
  ({ id, src: asset(file), alt, licenseRef, source: "Ernst Haeckel, Kunstformen der Natur (1904), via Wikimedia Commons" });
const plates = {
  medusae: plate("haeckel-discomedusae", "plate-disco.jpg", "Haeckel's plate of Discomedusae: jellyfish with long trailing tentacles", "commons-haeckel-discomedusae-8"),
  hummingbirds: plate("haeckel-trochilidae", "plate-troch.jpg", "Haeckel's plate of hummingbirds in flight among branches", "commons-haeckel-trochilidae"),
  pitchers: plate("haeckel-nepenthaceae", "plate-nepen.jpg", "Haeckel's plate of pitcher plants with hanging pitchers", "commons-haeckel-nepenthaceae"),
};
const maps = (prefix: string, repeat: number, licenseRef: string, color = true): SurfaceMaps => ({ repeat,
  color: color ? { id: `${prefix}-color`, src: asset(`${prefix}-color.jpg`), alt: `${prefix} colour detail`, licenseRef } : undefined,
  normal: { id: `${prefix}-normal`, src: asset(`${prefix}-normal.jpg`), alt: `${prefix} normal map`, licenseRef },
  roughness: prefix === "paper" ? undefined : { id: `${prefix}-rough`, src: asset(`${prefix}-rough.jpg`), alt: `${prefix} roughness map`, licenseRef } });

type Language = "en" | "ja";
const copy: Record<Language, { title: string; eyebrow: string; credit: string; spreads: BookSpread[] }> = {
  en: { title: "Art Forms in Nature", eyebrow: "Plates from 1904", credit: "Plates: Ernst Haeckel, 1904 · public domain",
    spreads: [
      { id: "medusae", caption: "A jellyfish, drawn as ornament.",
        left: { heading: "Discomedusae", folio: "8", text: "Haeckel drew this plate for Kunstformen der Natur. Its largest animal, which he named Desmonema annasethe after his late wife Anna Sethe, trails tentacles many times the length of its bell.\nHe arranged every specimen symmetrically, so the page reads as both a scientific record and a piece of design." },
        right: { image: plates.medusae, caption: "Discomedusae", folio: "9" } },
      { id: "hummingbirds", caption: "Hummingbirds, caught mid-flight.",
        left: { heading: "Trochilidae", folio: "10", text: "Hummingbirds hover by sweeping their wings in a flattened figure of eight, so they make lift on the backstroke as well as the forward stroke.\nHaeckel gathered many species on one plate so their beaks, crests and tail feathers could be compared side by side." },
        right: { image: plates.hummingbirds, caption: "Trochilidae", folio: "11" } },
      { id: "pitchers", caption: "Leaves that became traps.",
        left: { heading: "Nepenthaceae", folio: "12", text: "Pitcher plants grow leaves that end in a cup of digestive fluid. Insects drawn by nectar slip on the waxy rim and fall in.\nThe plant absorbs the nutrients that its poor soil cannot supply." },
        right: { image: plates.pitchers, caption: "Nepenthaceae", folio: "13" } },
    ] },
  ja: { title: "自然の芸術形態", eyebrow: "1904年の図版から", credit: "図版：エルンスト・ヘッケル（1904年）・パブリックドメイン",
    spreads: [
      { id: "medusae", caption: "装飾として描かれたクラゲ。",
        left: { heading: "ディスコメドゥーサ", folio: "8", text: "ヘッケルはこの図版を『自然の芸術形態』のために描いた。最も大きな個体は、亡き妻アンナ・ゼーテにちなんでデスモネマ・アンナセテと名づけられ、傘の何倍もの長さの触手を垂らしている。\nすべての標本が左右対称に配置され、ページは科学の記録であると同時にデザインとしても読める。" },
        right: { image: plates.medusae, caption: "ディスコメドゥーサ", folio: "9" } },
      { id: "hummingbirds", caption: "飛翔の瞬間のハチドリ。",
        left: { heading: "ハチドリ科", folio: "10", text: "ハチドリは翼を平たい八の字に振ってホバリングし、打ち下ろしだけでなく打ち返しでも揚力を生む。\nヘッケルは多くの種を一枚の図版に集め、くちばしや冠羽、尾羽を並べて比べられるようにした。" },
        right: { image: plates.hummingbirds, caption: "ハチドリ科", folio: "11" } },
      { id: "pitchers", caption: "罠になった葉。",
        left: { heading: "ウツボカズラ科", folio: "12", text: "ウツボカズラの葉の先は、消化液をためた袋になる。蜜に誘われた虫は、ろう質の縁で足をすべらせて落ちる。\n植物は、やせた土からは得られない養分をこうして吸収する。" },
        right: { image: plates.pitchers, caption: "ウツボカズラ科", folio: "13" } },
    ] },
};
export function pageTurnSpec(language: Language): SceneTemplateSpec<"page-turn-story"> {
  const c = copy[language];
  return {
    schemaVersion: 1, recipeVersion: 1, recipeId: "page-turn-story", id: "art-forms-book",
    fps: { num: 24, den: 1 }, durationFrames: 432, width: 960, height: 540,
    cueFrames: [56, 192, 300], background: "#0d0906", accent: "#d39a5b",
    content: {
      documentTitle: c.title, eyebrow: c.eyebrow, credit: c.credit, spreads: c.spreads,
      turns: [{ at: 158, frames: 46 }, { at: 290, frames: 46 }],
      stiffness: .42,
      paper: { color: "#f0e4c9", ink: "#2a1f16", shadowOpacity: .6, roughness: .9, thickness: .25, age: .45, edgeColor: "#e6d7b6",
        texture: maps("paper", 1, "ambientcg-paper001", true) },
      book: { pageWidth: 190, pageHeight: 262, blockThickness: 15, boardThickness: 3 },
      cover: { color: "#2f4a3a", material: "cloth", roughness: .86, maps: maps("linen", 1, "polyhaven-rough-linen"), headband: "#8a2f24" },
      environment: {
        surface: { color: "#c08a5c", roughness: .5, maps: maps("walnut", 1.6, "polyhaven-american-walnut-veneer") },
        light: { azimuth: 318, elevation: 50, warmth: 3100, intensity: 1 },
        hdri: { id: "reading-room-hdri", src: asset("reading-room.hdr"), alt: "Reading room environment light", licenseRef: "polyhaven-reading-room" },
        backdrop: "#0c0805",
      },
      typography: language === "ja" ? { headingFont: `"Hiragino Mincho ProN","Yu Mincho","Noto Serif CJK JP",serif`, bodyFont: `"Hiragino Mincho ProN","Yu Mincho","Noto Serif CJK JP",serif` } : undefined,
      look: { grain: .55, vignette: 1, warmth: .4 },
    },
  };
}
export function PageTurnStoryPreview({ language = "en", renderer = "auto" }: { language?: Language; renderer?: "auto" | "flat" }) {
  const spec = pageTurnSpec(language);
  return <ScenePreviewShell title="Page-Turn Story" subtitle="Bending WebGL leaf around a fixed spine · cloth boards, stacked page edges, walnut desk under a warm lamp · 18 seconds"
    fps={24} durationFrames={spec.durationFrames} reducedFrame={400}
    credits={<>Plates: Ernst Haeckel, <i>Kunstformen der Natur</i> (1904), public domain, scans via Wikimedia Commons. Paper: ambientCG Paper001 (CC0). Linen and American walnut veneer textures and the Reading Room HDRI: Poly Haven (CC0). Page copy written for this demo. No audio.</>}>
    {({ frame, portrait, reduced }) => <PageTurnStoryScene spec={{ ...spec, width: portrait ? 540 : 960, height: portrait ? 960 : 540,
      content: { ...spec.content, renderer } }} frame={frame} reducedMotion={reduced}/>}
  </ScenePreviewShell>;
}
