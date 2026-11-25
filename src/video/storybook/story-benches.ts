/** The bench films of the stories: one thing at a time, on plain paper. */
import type { StorybookFilm, StoryAct, StoryShot, StoryTransition } from "../../../registry/video/storybook/storybook-film";
import { ACTS } from "../../../registry/rig/rig-acting";
import { benchFilm } from "./bench";
import { ARM_PLACES_FRONT } from "./kit-film";
import { KONBINI_CAST, KONBINI_FILM, KONBINI_LINES } from "./konbini-film";

export const FIGURES = { "ema-three-quarter": ["ema", "three-quarter"], "ema-side": ["ema", "side"], "riku-front": ["riku", "front"], "riku-three-quarter": ["riku", "three-quarter"] } as const;
export type FigureName = keyof typeof FIGURES;
type Person = "ema" | "riku";
/** A hand can get to these: ahead and low for reaching, so that every act has something to do. */
const GOAL: Readonly<Record<string, Record<string, unknown>>> = { reach: { to: [48, -104] }, place: { to: [46, -100], grip: "easy" }, take: { to: [46, -106], grip: "open", after: "easy" }, rest: { to: [38, -98], grip: "easy" }, receive: { to: [46, -108], grip: "open" }, point: { to: [60, -122], grip: "open" }, scan: { to: [46, -108], grip: "easy" }, pack: { from: [46, -98], to: [30, -100], grip: "easy" }, press: { to: [44, -112], grip: "easy" }, explain: { grip: "open" }, invite: { grip: "open" } };

/** Everyone, as they stand: each figure that has been cut. */
export const lineUp = (): StorybookFilm => benchFilm({ id: "line-up", title: "Emma from the front and the side, and Riku", cast: KONBINI_CAST, seconds: 4, size: [1500, 1000], tall: 204, at: [0, -92], shot: { roles: [{ actor: "ema", path: [-88, 0] }, { actor: "ema", view: "side", path: [2, 0] }, { actor: "riku", path: [90, 0] }] } });
/** One person, in each view that has been cut or in some of them. */
export const standBench = (who: Person, list: readonly string[] = Object.keys(KONBINI_CAST[who].figures)): StorybookFilm => {
  return benchFilm({ id: `stand-${who}`, title: KONBINI_CAST[who].name, cast: KONBINI_CAST, seconds: 1, size: [900, 900], tall: 192, at: [0, -88], shot: { roles: list.map((view, i) => ({ actor: who, view, path: [(i - (list.length - 1) / 2) * 74, 0] as const })) } });
};
/** One act by two people: near hand and far hand. */
export const actBench = (act: string, strength = 1): StorybookFilm => {
  const seconds = ACTS[act].seconds + 0.9, one = (x: number, o: Partial<NonNullable<StoryShot["roles"]>[number]>, hand: "f" | "b") => ({ actor: "ema", path: [x, 0] as const, ...o, acts: [{ act, at: 0.35, strength, params: { hand, ...GOAL[act], ...(GOAL[act]?.to ? { to: [x + (GOAL[act].to as number[])[0] * (o.facing ?? 1), (GOAL[act].to as number[])[1]] } : {}), ...(GOAL[act]?.from ? { from: [x + (GOAL[act].from as number[])[0] * (o.facing ?? 1), (GOAL[act].from as number[])[1]] } : {}) } }] as StoryAct[] });
  return benchFilm({ id: `act-${act}`, title: `${act}: ${ACTS[act].about}`, cast: KONBINI_CAST, seconds, size: [1500, 1000], tall: 200, at: [0, -90], shot: { roles: [one(-92, {}, "f"), one(92, { actor: "riku", facing: -1 }, "b")] } });
};
/** Acts that overlap, one after the other, and one that another cuts short. */
export const sequenceBench = (): StorybookFilm => benchFilm({ id: "sequence", title: "Acts in a sequence", cast: KONBINI_CAST, seconds: 8.4, size: [1500, 1000], tall: 200, at: [0, -90], shot: { roles: [
  { actor: "ema", path: [-62, 0], acts: [{ act: "wave", at: 0.2 }, { act: "greet", at: 1.5 }, { act: "think", at: 2.8, for: 2 }, { act: "react", at: 4.2 }, { act: "laugh", at: 5 }, { act: "explain", at: 6.2 }, { act: "nod", at: 6.8 }] },
  { actor: "riku", path: [62, 0], facing: -1, acts: [{ act: "greet", at: 0.8 }, { act: "listen", at: 2.4 }, { act: "puzzled", at: 3 }, { act: "shake", at: 4.2 }, { act: "laugh", at: 5.2 }, { act: "bow", at: 6.4 }] },
] } });
/** A hand goes through the places round a body: shoulder, elbow and wrist. A body that faces the viewer has its places at its side. */
export const ARM_PLACES = [[0.02, 0.25], [0.07, 0.22], [0.12, 0.18], [0.17, 0.12], [0.2, 0.04], [0.19, -0.06], [0.12, -0.15], [0.04, -0.19], [0.03, 0.12], [0.09, 0.07], [0.15, 0.17]] as const;
export const armBench = (): StorybookFilm => {
  const acts = (hand: string): StoryAct[] => ARM_PLACES.map(([x, y], i) => ({ act: "carry", at: i, for: 1.7, ease: [0.7, 0.7] as const, params: { hand, x, y, grip: "open", angle: -20 - Math.atan2(x, y + 0.02) * 57 } }));
  const front = (hand: string): StoryAct[] => ARM_PLACES_FRONT.map(([x, y], i) => ({ act: "carry", at: i, for: 1.7, ease: [0.7, 0.7] as const, params: { hand, x, y, grip: "open" } }));
  return benchFilm({ id: "arms", title: "Arms go round the body", cast: KONBINI_CAST, seconds: ARM_PLACES.length, size: [1600, 900], tall: 204, at: [0, -92], shot: { roles: [{ actor: "ema", path: [-118, 0], acts: acts("f") }, { actor: "riku", view: "three-quarter", path: [-38, 0], acts: acts("f") }, { actor: "riku", view: "three-quarter", path: [42, 0], acts: acts("b") }, { actor: "riku", path: [124, 0], acts: [...front("f"), ...front("b")] }] } });
};
export const walkBench = (seconds = 4): StorybookFilm => benchFilm({ id: "walk", title: "Emma walks", cast: KONBINI_CAST, seconds, size: [1600, 900], tall: 190, at: [0, -84], shot: { roles: [{ actor: "ema", view: "side", path: [{ t: 0, x: -150, ease: "linear" }, { t: seconds, x: 150, ease: "linear" }] }] } });

/** Every expression of a person, one a second. */
export const looksOf = (who: Person): string[] => { const f = Object.values(KONBINI_CAST[who].figures)[0].art.face!; return [...Object.keys(f.looks), ...Object.keys(f.lookFor ?? {})]; };
/** The middle of a face, in centimetres. */
const FACE: Readonly<Record<Person, readonly [number, number]>> = { ema: [4, -143], riku: [0, -165] };
export const lookBench = (who: Person, look: string): StorybookFilm => benchFilm({ id: `look-${who}-${look}`, title: `${KONBINI_CAST[who].name}: ${look}`, cast: KONBINI_CAST, seconds: 1, size: [420, 420], tall: 54, at: FACE[who], shot: { roles: [{ actor: who, path: [0, 0], look }] } });
/** A person says a line, close up. */
export const sayBench = (line: string): StorybookFilm => {
  const l = KONBINI_LINES[line], who = l.speaker as Person;
  return benchFilm({ id: `say-${line}`, title: l.en ?? line, cast: KONBINI_CAST, lines: KONBINI_LINES, seconds: l.track.seconds + 1, size: [900, 760], tall: 52, at: [FACE[who][0], FACE[who][1] + 5], shot: { roles: [{ actor: who, path: [0, 0] }], says: [{ line, at: 0.35 }] } });
};

/** Shots of the film by themselves, with its own sets and props. */
const excerpt = (id: string, title: string, shots: readonly StoryShot[]): StorybookFilm => ({ ...KONBINI_FILM, id, title, audio: undefined, shots });
const shotOf = (id: string): StoryShot => { const shot = KONBINI_FILM.shots.find(s => s.id === id); if (!shot) throw new Error(`The film has no shot ${id}.`); return { ...shot, transition: undefined }; };
/** A prop goes from hand to hand. */
export const handoverBench = (): StorybookFilm => benchFilm({ id: "handover", title: "A bag goes from hand to hand", cast: KONBINI_CAST, props: KONBINI_FILM.props, seconds: 4.6, size: [1500, 1000], tall: 204, at: [0, -92], shot: {
  roles: [{ actor: "ema", path: [-52, 0], z: 10, acts: [{ act: "take", at: 1, for: 1.8, params: { to: [2, -106], grip: "open", after: "grip", catch: 0.47 } }, { act: "carry", at: 2.2, for: 5, params: { grip: "grip", x: 0.1, y: 0.22 } }] }, { actor: "riku", path: [42, 0], z: 9, gaze: [-0.5, 0.3], turn: [-8, 3], acts: [{ act: "rest", at: -1, for: 2.4, params: { hand: "f", to: [10, -124], grip: "grip", angle: 70, lean: 0 } }, { act: "place", at: 0.8, for: 2.1, params: { hand: "f", to: [2, -106], grip: "grip", after: "open", release: 0.5, angle: 62, away: 0.8, lean: 6 } }, { act: "bow", at: 2.8, for: 1.6, params: { arms: false } }] }],
  props: [{ prop: "bag", holds: [{ t: 0, by: "riku", socket: "fist-f" }, { t: 1.86, by: "ema", socket: "fist-f", over: 0.2 }] }],
} });
export const putDownBench = (): StorybookFilm => excerpt("put-down", "Emma puts a rice ball on a counter", [{ ...shotOf("order"), says: [] }]);
export const scanBench = (): StorybookFilm => excerpt("scan", "Riku scans it", [{ ...shotOf("scan"), says: [] }]);
export const payBench = (): StorybookFilm => excerpt("pay", "Two coins go into the change machine", [shotOf("pay")]);

/** Two shots and the way from one to the other. */
export const transitionBench = (kind: StoryTransition["kind"], seconds = 1.2): StorybookFilm => {
  // two seconds of each shot, and only what happens in them
  const street = shotOf("street"), answer = shotOf("answer"), each = 2.2, inside = <T extends { at?: number }>(list: readonly T[] | undefined) => list?.filter(a => (a.at ?? 0) < each);
  return excerpt(`transition-${kind}`, `Transition: ${kind}`, [{ ...street, seconds: each, words: [], sounds: inside(street.sounds), camera: street.camera.map(k => ({ ...k, t: k.t / 2 })) }, { ...answer, seconds: each, says: [], sounds: inside(answer.sounds), roles: answer.roles?.map(q => ({ ...q, acts: inside(q.acts) })), transition: { kind, seconds } }]);
};
