/// <reference types="vite/client" />
/** The paintings of this folder, by name: `assets/<id>/art.json` and its paintings, as the cutter wrote them. */
import { storyFigure } from "../../../registry/video/storybook/story-figure";
import type { PaintedCut } from "../../../registry/video/storybook/story-figure";
import type { PaintedImage } from "../../../registry/rig/rig-look-painted";
import type { StoryFigure, StoryLine, StoryPropView, StorySetLayer } from "../../../registry/video/storybook/storybook-film";
import type { SpeechTrack } from "../../../registry/video/storybook/speech-mouth";

type Point = readonly [number, number];
interface Piece { image: PaintedImage; x: number; y: number; width: number; height: number; grip?: Point; foot?: Point }
interface Pieces { pieces: Readonly<Record<string, Piece>>; provenance?: string }
const CUTS = import.meta.glob("./assets/*/art.json", { eager: true, import: "default" }) as Record<string, PaintedCut | Pieces>;
const URLS = import.meta.glob("./assets/**/*.{webp,mp3}", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const SPOKEN = import.meta.glob("./assets/*/voice/lines.json", { eager: true, import: "default" }) as Record<string, Record<string, { speaker: string; ja: string; en: string; track: SpeechTrack }>>;

/** Address of a file of the assets: `<folder>/<file>`. */
export function asset(path: string): string { const u = URLS[`./assets/${path}`]; if (!u) throw new Error(`There is no file ${path}.`); return u; }
const cutOf = (id: string) => CUTS[`./assets/${id}/art.json`];
const made = new Map<string, StoryFigure>();
export function figure(id: string): StoryFigure {
  let f = made.get(id);
  if (!f) { const cut = cutOf(id); if (!cut || !("joints" in cut)) throw new Error(`There is no painted figure "${id}".`); made.set(id, (f = storyFigure(cut, file => asset(`${id}/${file}`)))); }
  return f;
}
export const figureIds = (): string[] => Object.keys(CUTS).filter(p => "joints" in CUTS[p]).map(p => p.split("/")[2]);
export const provenanceOf = (id: string): string => cutOf(id)?.provenance ?? "";

function piece(folder: string, id: string): Piece {
  const cut = cutOf(folder), p = cut && "pieces" in cut ? cut.pieces[id] : undefined; if (!p) throw new Error(`There is no piece "${id}" in "${folder}".`);
  return { ...p, image: { ...p.image, src: asset(`${folder}/${p.image.src}`) } };
}
/** A piece as a layer of a set, where it was painted. */
export function setLayer(folder: string, id: string, over: Partial<StorySetLayer> = {}): StorySetLayer { const { image, x, y, width, height } = piece(folder, id); return { id, image, x, y, width, height, ...over }; }
/** A piece as something that can be held. */
export function propView(folder: string, id: string): StoryPropView { const { image, width, height, grip, foot } = piece(folder, id); return { image, width, height, grip, foot }; }
export const sprite = (folder: string, id: string): PaintedImage => piece(folder, id).image;
/** Spoken lines of a folder, with their recordings. */
export function spokenLines(folder: string): Record<string, StoryLine> { return Object.fromEntries(Object.entries(SPOKEN[`./assets/${folder}/voice/lines.json`] ?? {}).map(([id, l]) => [id, { ...l, audio: asset(`${folder}/voice/${id}.mp3`) }])); }
