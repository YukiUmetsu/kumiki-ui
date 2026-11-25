/** Every film and test film by name, for the export story and the tools. A name has only letters, digits and hyphens. */
import type { StorybookFilm } from "../../../registry/video/storybook/storybook-film";
import { figureIds } from "./art";
import { KONBINI_FILM } from "./konbini-film";
import { kitFilm } from "./kit-film";
import { episodeFilm, episodeNames, playFilm, playNames } from "./library";

const FILMS: Readonly<Record<string, () => StorybookFilm>> = {
  konbini: () => KONBINI_FILM, ...Object.fromEntries(playNames().map(id => [id, () => playFilm(id)])), ...Object.fromEntries(episodeNames().map(id => [id, () => episodeFilm(id, name => (name === "konbini" ? KONBINI_FILM : undefined))])),
  ...Object.fromEntries(figureIds().map(id => [`kit-${id}`, () => kitFilm(id)])),
};
export const filmNames = (): string[] => Object.keys(FILMS);
const made = new Map<string, StorybookFilm>();
export function filmOf(name: string): StorybookFilm {
  let f = made.get(name);
  if (!f) { if (!FILMS[name]) throw new Error(`There is no film "${name}". There are: ${filmNames().join(", ")}.`); made.set(name, (f = FILMS[name]())); }
  return f;
}
