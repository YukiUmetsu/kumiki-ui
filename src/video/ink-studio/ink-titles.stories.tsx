import type { Meta, StoryObj } from "@storybook/react-vite";
import type { InkFilm, InkFilmLayer } from "../../../registry/video/ink/ink-film";
import { INK_FONTS, InkStudioFilm } from "./ink-page";

const SERIF = INK_FONTS.brush, LATIN = INK_FONTS.latin;
const film = (id: string, title: string, seconds: number, layers: InkFilmLayer[]): InkFilm => ({ schemaVersion: 1, id: `ink-title-${id}`, title, fps: 30, paper: "#F8F1E3", size: { width: 1920, height: 1080 }, shots: [{ id, seconds, label: title, layers }] });
const DOWN = film("down", "水墨 written down the page, and a seal", 9, [
  { id: "enso", subject: "splash", props: { seed: 5, radius: 260, pigment: "ink", ink: 0.16, runs: 0 }, at: [960, 520], scale: 1.5, density: 0.5, enter: { kind: "bloom", at: 0.1, seconds: 2.2 } },
  { id: "title", subject: "lettering", props: { text: "水墨", size: 330, font: SERIF, vertical: true, seed: 3, dry: 0.5 }, at: [960, 500], enter: { kind: "paint", at: 0.5, seconds: 2.8 } },
  { id: "seal", subject: "seal", props: { text: "山水", size: 120, font: SERIF }, at: [1215, 770], enter: { kind: "develop", at: 3.6, seconds: 0.35 } },
]);
const ACROSS = film("across", "A line of Latin letters in brush ink", 8, [
  { id: "line", subject: "lettering", props: { text: "Mountain and water", size: 170, font: LATIN, seed: 8, dry: 0.5, hand: 0.5 }, at: [960, 470], enter: { kind: "paint", at: 0.3, seconds: 3.2 } },
  { id: "under", subject: "underline", props: { seed: 4, length: 1100, width: 26, pigment: "cinnabar" }, at: [960, 620], enter: { kind: "paint", at: 3.1, seconds: 0.9 } },
]);
const SEALS = film("seals", "Seals, white and red, one to four characters", 6, [
  ...(["月", "清風", "山水畫", "水墨丹青"] as const).map((text, i): InkFilmLayer => ({ id: `w${i}`, subject: "seal", props: { text, size: 190, font: SERIF, kind: "white", seed: i + 1 }, at: [420 + i * 360, 330], enter: { kind: "develop", at: 0.2 + i * 0.25, seconds: 0.4 } })),
  ...(["梅", "水月", "墨梅圖", "一帆風順"] as const).map((text, i): InkFilmLayer => ({ id: `r${i}`, subject: "seal", props: { text, size: 190, font: SERIF, kind: "red", round: i === 0, seed: i + 9 }, at: [420 + i * 360, 760], enter: { kind: "develop", at: 1 + i * 0.25, seconds: 0.4 } })),
]);
const meta: Meta = { title: "Video production/Film Looks/Chinese Ink/Titles And Seals", id: "video-ink-titles", parameters: { layout: "fullscreen" } };
export default meta;
/** Letters write themselves in stroke order of the page, top to bottom; the seal is pressed last. */
export const DownThePage: StoryObj = { render: () => <InkStudioFilm film={DOWN} pixels={1440} /> };
/** Any script and any font: the letters come from the font, the ink is the brush's. */
export const AcrossThePage: StoryObj = { render: () => <InkStudioFilm film={ACROSS} pixels={1440} /> };
/** Paper letters in a cinnabar field 白文, and cinnabar letters in a frame 朱文. */
export const Seals: StoryObj = { render: () => <InkStudioFilm film={SEALS} pixels={1440} /> };
