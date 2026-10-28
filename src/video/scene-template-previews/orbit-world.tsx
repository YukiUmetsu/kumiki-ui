import { OrbitWorldScene } from "../../../registry/video/recipes/orbit-world";
import type { SceneTemplateSpec } from "../../../registry/video/scene-templates";
import { greatCircleKm } from "../../../registry/video/orbit-world-model";
import { ScenePreviewShell } from "./preview-shell";

const asset = (file: string) => new URL(`../assets/orbit-world/${file}`, import.meta.url).href;
// Airport reference points (WGS 84): London Heathrow and Tokyo Haneda.
const heathrow = { latitude: 51.47, longitude: -0.4543 };
const haneda = { latitude: 35.5494, longitude: 139.7798 };
const km = Math.round(greatCircleKm(heathrow, haneda) / 10) * 10;

type Copy = "en" | "ja" | "long";
const copy: Record<Copy, { title: string; eyebrow: string; from: string; to: string; detail: string; readout: string; readoutLabel: string; credit: string }> = {
  en: { title: "London to Tokyo", eyebrow: "Great-circle route", from: "London", to: "Tokyo", detail: "Haneda · 35.55° N 139.78° E",
    readout: `${km.toLocaleString("en-GB")} km`, readoutLabel: "Shortest path over the surface",
    credit: "Imagery: NASA Earth Observatory (Blue Marble NG, Black Marble 2016), NASA Visible Earth clouds. Illustrative lighting." },
  ja: { title: "ロンドンから東京へ", eyebrow: "大圏航路", from: "ロンドン", to: "東京", detail: "羽田 · 北緯35.55° 東経139.78°",
    readout: `${km.toLocaleString("ja-JP")} km`, readoutLabel: "地表に沿った最短経路",
    credit: "画像：NASA Earth Observatory（Blue Marble NG、Black Marble 2016）、NASA Visible Earth（雲）。照明は演出です。" },
  long: { title: "From London Heathrow to Tokyo International", eyebrow: "Great-circle route over the Arctic", from: "London Heathrow Airport",
    to: "Tokyo International Airport (Haneda)", detail: "Ōta, Tokyo · 35.55° N 139.78° E", readout: `${km.toLocaleString("en-GB")} kilometres`,
    readoutLabel: "Shortest path over the surface of the Earth",
    credit: "Imagery: NASA Earth Observatory (Blue Marble NG, Black Marble 2016), NASA Visible Earth clouds. Illustrative lighting." },
};
export function orbitSpec(language: Copy = "en"): SceneTemplateSpec<"orbit-world"> {
  const t = copy[language];
  return {
    schemaVersion: 1, recipeVersion: 1, recipeId: "orbit-world", id: "orbit-london-tokyo",
    fps: { num: 24, den: 1 }, durationFrames: 360, width: 960, height: 540,
    // Limb and reveal; the route draws behind its head; arrive and hold Tokyo.
    cueFrames: [72, 168, 264], background: "#02050a", accent: "#ffb547",
    content: {
      placement: "geographic", title: t.title, eyebrow: t.eyebrow,
      locations: [
        { id: "lhr", label: t.from, ...heathrow },
        { id: "hnd", label: t.to, detail: t.detail, ...haneda },
      ],
      routes: [{ id: "lhr-hnd", from: "lhr", to: "hnd" }],
      readout: { value: t.readout, label: t.readoutLabel },
      textures: {
        day: { id: "earth-day", src: asset("earth-day-4k.jpg"), alt: "Blue Marble Next Generation true-colour Earth, July", licenseRef: "nasa-bmng-day-200407", width: 4096, height: 2048 },
        night: { id: "earth-night", src: asset("earth-night-4k.jpg"), alt: "Black Marble 2016 night lights", licenseRef: "nasa-black-marble-2016", width: 4096, height: 2048 },
        water: { id: "earth-water", src: asset("earth-water-2k.jpg"), alt: "Ocean mask derived from Blue Marble", licenseRef: "derived-water-mask-bmng", width: 2048, height: 1024 },
        clouds: { id: "earth-clouds", src: asset("earth-clouds-2k.jpg"), alt: "Visible Earth cloud composite", licenseRef: "nasa-visible-earth-clouds", width: 2048, height: 1024 },
      },
      camera: { opening: "limb", orbitDegrees: 34 },
      atmosphere: { color: "#5aa9ff", strength: 1 },
      credit: t.credit,
    },
  };
}
export function OrbitWorldPreview({ language = "en" }: { language?: Copy }) {
  const spec = orbitSpec(language);
  return <ScenePreviewShell title="Orbit World" subtitle="Lit WebGL globe · NASA day, night and cloud maps · great-circle route · 15 seconds"
    fps={24} durationFrames={spec.durationFrames} reducedFrame={340}
    credits={<>Earth imagery: NASA Earth Observatory — <a href="https://visibleearth.nasa.gov/images/73751/july-blue-marble-next-generation-w-topography-and-bathymetry">Blue Marble: Next Generation</a> (July 2004) and <a href="https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/">Black Marble 2016</a>; clouds: NASA Visible Earth composite (not a specific day); ocean mask derived from Blue Marble. NASA imagery, public domain in the US. Land outlines in the 2D fallback: Natural Earth (public domain). The sun position is illustrative, not a real instant. No audio.</>}>
    {({ frame, portrait, reduced }) => <OrbitWorldScene spec={{ ...spec, width: portrait ? 540 : 960, height: portrait ? 960 : 540 }}
      frame={frame} reducedMotion={reduced} style={{ color: "#f6f3ec" }}/>}
  </ScenePreviewShell>;
}
