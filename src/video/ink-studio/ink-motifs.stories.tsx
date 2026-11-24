import type { Meta, StoryObj } from "@storybook/react-vite";
import type { InkFilm, InkFilmLayer } from "../../../registry/video/ink/ink-film";
import { INK_BOOK } from "../../../registry/video/ink/ink-subjects";
import type { InkSubjectName } from "../../../registry/video/ink/ink-subjects";
import { InkStudioFilm } from "./ink-page";

/** A subject on the sheet: its name in the book, its options, what it is called, and how much of its place it fills. */
interface Motif { subject: InkSubjectName; props?: Readonly<Record<string, unknown>>; name: string; fill?: number; at?: readonly [number, number] }
const W = 1920, H = 1080, SIDE = 40, LABEL = 52;
/** One sheet of motifs in rows, each painting itself in its turn. */
function sheet(id: string, title: string, rows: readonly (readonly Motif[])[], paint = 2.4): InkFilm {
  const all = rows.flat(), gap = Math.min(0.45, 4.5 / all.length), seconds = Math.ceil(0.3 + gap * all.length + paint + 6), cellH = (H - 2 * SIDE) / rows.length;
  const layers: InkFilmLayer[] = [], text: { text: string; at: readonly [number, number]; size: number; width: number; align: "center"; from: number }[] = [];
  let i = 0;
  rows.forEach((row, r) => row.forEach((m, c) => {
    const cellW = (W - 2 * SIDE) / row.length, page = INK_BOOK[m.subject](m.props ?? {}).page, box = cellH - LABEL, x = SIDE + cellW * (c + 0.5), y = SIDE + cellH * r, from = 0.2 + gap * i++;
    const scale = Math.min((cellW - 24) / page.width, box / page.height) * (m.fill ?? 1);
    layers.push({ id: `${m.subject}-${i}`, subject: m.subject, props: m.props, at: [x + (m.at?.[0] ?? 0), y + box / 2 + (m.at?.[1] ?? 0)], scale, enter: { kind: "paint", at: from, seconds: paint } });
    text.push({ text: m.name, at: [x, y + box + LABEL / 2], size: 31, width: cellW - 16, align: "center", from });
  }));
  return { schemaVersion: 1, id: `ink-motifs-${id}`, title, fps: 30, paper: "#F8F1E3", size: { width: W, height: H }, shots: [{ id, seconds, label: title, layers, text }] };
}
const FIGURES = sheet("figures", "Small figures for a landscape", [[
  { subject: "swordsman", props: { seed: 4 }, name: "Swordsman" }, { subject: "swordsman", props: { seed: 4, robe: "ink", sash: "ochre", wind: 0.35 }, name: "Swordsman in black" },
  { subject: "umbrella-lady", props: { seed: 3 }, name: "Lady under an umbrella" }, { subject: "umbrella-lady", props: { seed: 3, robe: "malachite", umbrella: "ochre" }, name: "In green" },
]], 3);
const LAND = sheet("land", "Mountains, water and sky", [
  [{ subject: "massif", props: { seed: 3, kind: "crag", cun: "axe" }, name: "Crag, axe-cut strokes", fill: 1.5 }, { subject: "massif", props: { seed: 5, kind: "pillar" }, name: "Pillars", fill: 1.5 }, { subject: "massif", props: { seed: 8, kind: "hill", cun: "hemp" }, name: "Hills, hemp-fibre strokes", fill: 1.3 }, { subject: "massif", props: { seed: 4, kind: "karst" }, name: "Karst", fill: 1.2 }],
  [{ subject: "range", props: { seed: 12, pigment: "indigo", edge: 0.22 }, name: "Far ranges", fill: 1.15 }, { subject: "water", props: { seed: 2, amount: 1.1 }, name: "Water" }, { subject: "massif", props: { seed: 9, kind: "crag", falls: { x: 0.5, top: 0.4, foot: 0.82, width: 0.07 } }, name: "With a waterfall", fill: 1.55 }, { subject: "moon", props: { radius: 130 }, name: "Moon left as paper", fill: 1.1 }, { subject: "moon", props: { kind: "sun", radius: 150 }, name: "Sun" }],
]);
const PLACES = sheet("places", "Buildings and boats", [
  [{ subject: "houses", props: { seed: 4 }, name: "Houses by the water", fill: 1.1 }, { subject: "pavilion", props: { seed: 2 }, name: "Pavilion" }, { subject: "pagoda", props: { seed: 3 }, name: "Pagoda" }],
  [{ subject: "bridge", props: { seed: 2 }, name: "Humped bridge" }, { subject: "bridge", props: { seed: 5, arches: 3 }, name: "Three arches" }, { subject: "boat", props: { seed: 2, boatman: true, awning: true, lantern: true }, name: "Boat with a lantern" }],
]);
const PLANTS = sheet("plants", "Plants", [
  [{ subject: "bamboo", props: { seed: 3 }, name: "Bamboo" }, { subject: "plum", props: { seed: 4 }, name: "Plum" }, { subject: "pine", props: { seed: 5, form: "tree" }, name: "Pine" }, { subject: "maple", props: { seed: 2 }, name: "Maple" }, { subject: "lotus", props: { seed: 3 }, name: "Lotus" }],
  [{ subject: "orchid", props: { seed: 2 }, name: "Orchid", fill: 1.2 }, { subject: "willow", props: { seed: 3 }, name: "Willow" }, { subject: "reeds", props: { seed: 4 }, name: "Reeds" }, { subject: "grass", props: { seed: 2 }, name: "Grass", fill: 1.1 }, { subject: "pine", props: { seed: 6, form: "branch" }, name: "Pine bough" }],
], 3);
const ANIMALS = sheet("animals", "Birds, fish and a butterfly", [
  [{ subject: "crane", props: { seed: 2 }, name: "Crane", fill: 1.45 }, { subject: "crane", props: { seed: 3, form: "standing" }, name: "Crane at rest" }, { subject: "goose", props: { seed: 2 }, name: "Goose", fill: 0.9 }, { subject: "swallow", props: { seed: 2 }, name: "Swallow", fill: 1.1 }],
  [{ subject: "koi", props: { seed: 3, pattern: "both" }, name: "Koi", fill: 1.25 }, { subject: "koi", props: { seed: 5, pattern: "red", heading: 200 }, name: "Red and white", fill: 1.2 }, { subject: "koi", props: { seed: 6, pattern: "ink", heading: 10 }, name: "Black carp", fill: 1.25 }, { subject: "butterfly", props: { seed: 2 }, name: "Swallowtail" }, { subject: "butterfly", props: { seed: 4, pattern: "plain", pigment: "gamboge" }, name: "Yellow butterfly" }],
]);
const MARKS = sheet("marks", "Brush marks", [
  [{ subject: "enso", props: { seed: 3 }, name: "Circle" }, { subject: "sweep", props: { seed: 4 }, name: "Sweep" }, { subject: "arrow", props: { seed: 2 }, name: "Arrow" }, { subject: "splash", props: { seed: 5 }, name: "Splash" }],
  [{ subject: "underline", props: { seed: 4, pigment: "cinnabar" }, name: "Underline" }, { subject: "tick", props: { seed: 2 }, name: "Tick" }, { subject: "tick", props: { seed: 3, kind: "cross", pigment: "cinnabar" }, name: "Cross" }, { subject: "enso", props: { seed: 7, pigment: "indigo", sweep: 300 }, name: "Open circle" }],
], 1.6);
const meta: Meta = { title: "Video production/Film Looks/Chinese Ink/Motifs", id: "video-ink-motifs", parameters: { layout: "fullscreen" } };
export default meta;
const show = (film: InkFilm): StoryObj => ({ render: () => <InkStudioFilm film={film} pixels={1440} /> });
export const Figures: StoryObj = show(FIGURES);
export const MountainsAndWater: StoryObj = show(LAND);
export const BuildingsAndBoats: StoryObj = show(PLACES);
export const Plants: StoryObj = show(PLANTS);
export const Animals: StoryObj = show(ANIMALS);
/** Marks for titles and explainers. */
export const BrushMarks: StoryObj = show(MARKS);
