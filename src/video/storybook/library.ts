/// <reference types="vite/client" />
/**
 * Everything the demo films are made from, gathered from data: `places/*.json` (painted sets, stages, things, sounds, drifts, bursts),
 * `plays/*.json` (spoken lines and scenes) and `episodes/*.json` (plays one after another). A new story is new JSON with its art
 * and its recordings; nothing is registered by hand.
 */
import { composeStory, joinStories } from "../../../registry/video/storybook/story-play";
import type { PlayLibrary, StoryPlay, StoryStage, TeachStage } from "../../../registry/video/storybook/story-play";
import type { StoryBurst, StoryDrift, StoryProp, StorySet, StorySetLayer, StorySound, StorybookFilm } from "../../../registry/video/storybook/storybook-film";
import { propView, setLayer, spokenLines, sprite } from "./art";
import { everyone } from "./cast";

/** "<folder>/<piece>" */
type PieceName = string;
interface PlaceData {
  sets?: Readonly<Record<string, Omit<StorySet, "layers"> & { layers: readonly ({ piece: PieceName } & Partial<Omit<StorySetLayer, "image">>)[] }>>;
  stages?: Readonly<Record<string, StoryStage>>; props?: Readonly<Record<string, { name: string; piece: PieceName; views?: Readonly<Record<string, PieceName>>; hangs?: StoryProp["hangs"]; shadow?: number }>>;
  sounds?: Readonly<Record<string, { file: string } & Omit<StorySound, "src" | "at">>>; drifts?: Readonly<Record<string, Omit<StoryDrift, "sprites"> & { sprites: readonly PieceName[] }>>; bursts?: Readonly<Record<string, Omit<StoryBurst, "spark" | "glow"> & { spark: PieceName; glow?: PieceName }>>; teach?: TeachStage;
}
interface PlayData extends StoryPlay { /** Where its recordings are, when it has none of its own. */ voice?: string }
interface EpisodeData { id: string; title: string; parts: readonly (string | { play: string; scenes: readonly string[] })[] }

const PLACES = import.meta.glob("./places/*.json", { eager: true, import: "default" }) as Record<string, PlaceData>, PLAYS = import.meta.glob("./plays/*.json", { eager: true, import: "default" }) as Record<string, PlayData>, EPISODES = import.meta.glob("./episodes/*.json", { eager: true, import: "default" }) as Record<string, EpisodeData>;
const SOUNDS = import.meta.glob(["../../../assets/sound/recorded/{bag,bed-birds,bed-crickets,bed-fireworks,bed-fire-hearth,beep,bell,coin,door,drop,flap,lid,music,paper,step-stone,step-wood,step-gravel,thud,creak}*.wav", "../../../assets/sound/wyzowl/tones/*.wav"], { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const of = <V>(files: Record<string, V>) => Object.fromEntries(Object.entries(files).map(([p, v]) => [p.split("/").pop()!.replace(/\.\w+$/, ""), v]));
const merged = <V>(pick: (p: PlaceData) => Readonly<Record<string, V>> | undefined): Record<string, V> => Object.assign({}, ...Object.values(PLACES).map(p => pick(p) ?? {}));
const map = <A, B>(o: Readonly<Record<string, A>>, f: (v: A, k: string) => B): Record<string, B> => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, f(v, k)]));
const two = (name: PieceName): [string, string] => { const i = name.indexOf("/"); return [name.slice(0, i), name.slice(i + 1)]; };
const soundUrl = (file: string): string => { const u = Object.entries(SOUNDS).find(([p]) => p.endsWith(`/${file}`)); if (!u) throw new Error(`There is no sound ${file}.`); return u[1]; };

let shared: Omit<PlayLibrary, "lines"> | null = null;
/** All that plays have in common. */
export function storyLibrary(): Omit<PlayLibrary, "lines"> {
  return (shared ??= {
    cast: everyone(), size: { width: 1920, height: 1080 }, frame: { x: 48, y: 40, width: 1824, height: 810 }, fps: 24, paper: "#fbf3e1",
    sets: map(merged(p => p.sets), s => ({ ...s, layers: s.layers.map(({ piece, ...over }) => setLayer(...two(piece), over)) })),
    stages: merged(p => p.stages),
    props: map(merged(p => p.props), ({ piece, views, ...p }): StoryProp => ({ ...p, ...propView(...two(piece)), ...(views ? { views: map(views, v => propView(...two(v))) } : {}) })),
    sounds: map(merged(p => p.sounds), ({ file, ...s }) => ({ ...s, src: soundUrl(file) })),
    drifts: map(merged(p => p.drifts), ({ sprites, ...d }) => ({ ...d, sprites: sprites.map(s => sprite(...two(s))) })),
    bursts: map(merged(p => p.bursts), ({ spark, glow, ...b }): StoryBurst => ({ ...b, spark: sprite(...two(spark)), ...(glow ? { glow: sprite(...two(glow)) } : {}) })),
    teach: Object.values(PLACES).find(p => p.teach)?.teach,
  });
}
export const playNames = (): string[] => Object.entries(of(PLAYS)).filter(([, p]) => p.scenes?.length).map(([id]) => id);
export const episodeNames = (): string[] => Object.keys(of(EPISODES));
/** The film of a play, or of some of its scenes. */
export function playFilm(id: string, scenes?: readonly string[]): StorybookFilm {
  const play = of(PLAYS)[id]; if (!play?.scenes) throw new Error(`There is no play "${id}" with scenes.`);
  const some = scenes ? scenes.map(s => { const q = play.scenes.find(x => x.id === s); if (!q) throw new Error(`The play "${id}" has no scene "${s}".`); return q; }) : play.scenes;
  return composeStory({ id: scenes ? `${id}-${scenes[0]}` : id, title: play.title, scenes: some }, { ...storyLibrary(), lines: spokenLines(play.voice ?? id) });
}
export function episodeFilm(id: string, others: (name: string) => StorybookFilm | undefined): StorybookFilm {
  const e = of(EPISODES)[id]; if (!e) throw new Error(`There is no episode "${id}".`);
  return joinStories(e.id, e.title, e.parts.map(p => (typeof p !== "string" ? playFilm(p.play, p.scenes) : others(p) ?? playFilm(p))));
}
