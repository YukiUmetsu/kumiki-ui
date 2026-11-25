/** Everyone of the demo films. The views of a person are the painted figures `<person>-<view>`; an outfit is a view too (`ema-yukata`). */
import type { StoryActor } from "../../../registry/video/storybook/storybook-film";
import { figure, figureIds } from "./art";

interface Person { name: string; /** Ruby markup. */ label: string; color: string; seed: number; /** The view when a role names none. */ first?: string }
export const PEOPLE = {
  ema: { name: "Emma", label: "エマ", color: "#4E66A8", seed: 3, first: "three-quarter" },
  daniel: { name: "Daniel", label: "ダニエル", color: "#2F6B7A", seed: 12 },
  sophie: { name: "Sophie", label: "ソフィー", color: "#B5524A", seed: 21 },
  leo: { name: "Leo", label: "レオ", color: "#B07A1E", seed: 34 },
  riku: { name: "Riku", label: "リク", color: "#3F7A52", seed: 8 },
  takahashi: { name: "Takahashi", label: "{高橋|たかはし}さん", color: "#3C5577", seed: 41 },
  sato: { name: "Sato", label: "{佐藤|さとう}さん", color: "#5C5044", seed: 52 },
  emi: { name: "Emi", label: "{恵美|えみ}さん", color: "#A2556B", seed: 63 },
  haruka: { name: "Haruka", label: "{遥|はるか}さん", color: "#7A5A93", seed: 74 },
  daichi: { name: "Daichi", label: "{大地|だいち}さん", color: "#8B4A2B", seed: 85 },
} satisfies Record<string, Person>;
export type PersonName = keyof typeof PEOPLE;

/** Views of a person that are painted, the first one first. */
export function viewsOf(id: string): string[] {
  const first = (PEOPLE as Record<string, Person>)[id]?.first ?? "front", views = figureIds().filter(f => f.startsWith(`${id}-`)).map(f => f.slice(id.length + 1));
  return [...views.filter(v => v === first), ...views.filter(v => v !== first)];
}
/** A cast of some of them, or of one figure by its own name. */
export function castOf(...ids: readonly string[]): Record<string, StoryActor> {
  return Object.fromEntries(ids.map(id => {
    const { name, label, color, seed } = (PEOPLE as Record<string, Person>)[id] ?? { name: id, label: id, color: "#5C5044", seed: 7 };
    return [id, { name, label, color, seed, figures: Object.fromEntries(viewsOf(id).map(v => [v, figure(`${id}-${v}`)])) }];
  }));
}
