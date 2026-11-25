/** Everyone of the demo films. The views of a person are the painted figures `<person>-<view>`; an outfit is a view too (`ema-yukata`). */
import type { StoryActor } from "../../../registry/video/storybook/storybook-film";
import { figure, figureIds } from "./art";

/** A person of the films, as `people/<id>.json`: a new person needs no code. */
export interface Person {
  name: string; /** Ruby markup. */ label: string; color: string; seed: number; /** The view when a role names none. */ first?: string;
  /** Views in other clothes: only the films that name them have them. */ apart?: readonly string[];
  /** Centimetres, top of the hair or hat to the sole. */ height: number; age?: number;
  /** Fish Audio voice; `pace` is morae a second. */ voice: { fish: string; speed: number; pace: number };
  /** Hair, face and clothes in a few words, for the templates of `storybook-paint.py`. */ looks?: string; /** What the face paintings keep besides hair and clothes, for example "thin glasses". */ keep?: string; /** The owner's character sheet. */ sheet?: string;
}
const FILES = import.meta.glob("./people/*.json", { eager: true, import: "default" }) as Record<string, Person>;
export const PEOPLE: Readonly<Record<string, Person>> = Object.fromEntries(Object.entries(FILES).map(([path, p]) => [path.slice(9, -5), p]));

/** Views of a person that are painted, the first one first. */
export function viewsOf(id: string): string[] {
  const first = PEOPLE[id]?.first ?? "front", views = figureIds().filter(f => f.startsWith(`${id}-`)).map(f => f.slice(id.length + 1));
  return [...views.filter(v => v === first), ...views.filter(v => v !== first)];
}
const actor = (id: string, views: readonly string[]): StoryActor => {
  const { name, label, color, seed } = PEOPLE[id] ?? { name: id, label: id, color: "#5C5044", seed: 7 };
  return { name, label, color, seed, figures: Object.fromEntries(views.map(v => [v, figure(`${id}-${v}`)])) };
};
/** A cast of some of them, or of one figure by its own name, with all the views. */
export function castOf(...ids: readonly string[]): Record<string, StoryActor> { return Object.fromEntries(ids.map(id => [id, actor(id, viewsOf(id))])); }
/** Everyone, in one set of clothes each. */
export function everyone(): Record<string, StoryActor> {
  return Object.fromEntries(Object.entries(PEOPLE).map(([id, { apart = [] }]) => [id, actor(id, viewsOf(id).filter(v => !apart.includes(v)))]));
}
