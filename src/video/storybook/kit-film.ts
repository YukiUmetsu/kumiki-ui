/** One figure and all it can do, on plain paper: what to look at before a new figure goes into a film. It works for each figure that has been cut. */
import { estimateSpeech } from "../../../registry/video/storybook/speech-mouth";
import { parseRuby } from "../../../registry/video/storybook/japanese-text";
import { ACTS } from "../../../registry/rig/rig-acting";
import { paintedLooks } from "../../../registry/rig/rig-look-painted";
import type { StoryAct, StorybookFilm, StoryLine, StoryRole, StoryShot } from "../../../registry/video/storybook/storybook-film";
import { figure } from "./art";
import { castOf, PEOPLE } from "./cast";

/** Places round the shoulder, in body heights, that each hand goes through. */
export const ARM_PLACES_FRONT = [[0.02, 0.25], [0.1, 0.24], [0.2, 0.18], [0.26, 0.08], [0.24, -0.04], [0.16, -0.14], [0.22, -0.02], [0.2, 0.12], [0.1, 0.2], [0.02, 0.17], [0.02, 0.25]] as const;
/** A head at the turns that it can be asked for: column, row, yaw, pitch. */
const TURNS = [-1, 0, 1].flatMap(y => [-1, 0, 1].map(x => [x, y, x * 14, y * 6] as const));
/** All that arms do, each at the moment when it is held: what to lay beside the photographs. A place (`to`) is from the feet, in body heights. */
const POSES: readonly (readonly [string, Record<string, unknown>?, (readonly [number, number])?])[] = [
  ["fold"], ["wave"], ["wave", { hand: "f" }], ["raise", { hand: "b" }], ["raise", { hand: "f" }],
  ["point"], ["point", { hand: "b" }, [0.02, 0.5]], ["point", {}, [-0.3, 0.72]], ["point", { hand: "b" }, [0.5, 0.95]], ["point", {}, [0.06, 0.56]],
  ["invite"], ["explain", { hand: "b" }], ["beckon"], ["offer"], ["receive"],
  ["shrug"], ["clap"], ["carry"], ["think"], ["call"],
  ["phone"], ["drink"], ["eat"], ["rest", {}, [-0.16, 0.55]], ["reach", {}, [-0.24, 0.6]],
];
const GESTURES = ["wave", "bow", "deep-bow", "point", "invite", "explain", "offer", "raise", "beckon", "clap", "shrug", "hop", "thank", "receive"] as const;
/** Acts at the face: nothing of them shows from behind. */
const AT_FACE = ["think", "call", "phone", "drink", "eat"] as const;
const SAID = "あ い う え お、 まめ、 さん、 すみません";

export function kitFilm(id: string): StorybookFilm {
  const at = id.indexOf("-"), who = id.slice(0, at) in PEOPLE ? id.slice(0, at) : id, view = who === id ? undefined : id.slice(at + 1), cast = castOf(who), f = figure(id), H = f.body.height, face = f.art.face, size = { width: 900, height: 900 };
  const head: [number, number] = [0, -0.905 * H], line: StoryLine = { speaker: who, ja: SAID, track: estimateSpeech(parseRuby(SAID), 5.4) }, looks = face ? paintedLooks(face) : [];
  const role = (o: Partial<StoryRole> = {}): StoryRole => ({ actor: who, view, path: [0, 0], ...o }), all = { at: [0, -0.5 * H] as const, tall: 1.22 * H }, bust = { at: [0, -0.78 * H] as const, tall: 0.62 * H };
  const shot = (name: string, seconds: number, o: Partial<StoryShot> & { frame?: { at: readonly [number, number]; tall: number } }): StoryShot => { const { frame = all, ...rest } = o; return { id: name, label: name, set: "paper", seconds, layout: "full", camera: [{ t: 0, at: [frame.at[0], frame.at[1]], tall: frame.tall }], ...rest }; };
  const carry = (hand: string): StoryAct[] => ARM_PLACES_FRONT.map(([x, y], i) => ({ act: "carry", at: i * 0.8, for: 1.4, ease: [0.55, 0.55] as const, params: { hand, x, y, grip: "open" } }));
  const front = Math.abs(Math.sin(((f.body.facing ?? 45) * Math.PI) / 180)) >= 0.8;
  const gestures: StoryAct[] = []; let next = 0.3;
  for (const act of [...GESTURES, ...(face ? AT_FACE : [])]) { const seconds = ACTS[act].seconds; gestures.push({ act, at: next, for: seconds, params: ["think", "wave", "raise", "phone"].includes(act) ? { hand: "b" } : {} }); next += seconds + 0.4; }
  return {
    id: `kit-${id}`, title: `${cast[who].name} (${id})`, size, fps: 24, paper: "#fbf3e1", frame: { x: 0, y: 0, ...size }, cast, props: {}, lines: { said: line },
    sets: { paper: { home: all, layers: [] }, floor: { home: all, layers: [], ground: { horizon: [0, -0.86 * H], distance: 3.4 * H } } },
    shots: [
      shot("poses", 1, { frame: { at: [0, -0.5 * H], tall: 3.75 * H }, roles: POSES.map(([act, params, to], i) => { const d = Math.max(4, ACTS[act].seconds), x = ((i % 5) - 2) * 0.74 * H, y = (Math.floor(i / 5) - 1.72) * 0.72 * H; return role({ path: [x, y], z: 20 + i, acts: [{ act, at: 0.5 - d / 2, for: d, params: { ...params, ...(to && { to: [x + to[0] * H, y - to[1] * H] }) } }] }); }) }),
      shot("stand", 2, { roles: [role()] }),
      ...(face ? [
        shot("turn", 5.2, { frame: bust, roles: [role({ acts: [{ act: "turn", at: 0.2, for: 1.8, params: { yaw: 26 } }, { act: "turn", at: 2, for: 1.8, params: { yaw: -26 } }, { act: "look-around", at: 3.6, for: 1.6 }] })] }),
        shot("heads", 1.5, { frame: { at: [0, -0.62 * H], tall: 0.98 * H }, roles: TURNS.map(([x, y, yaw, pitch]) => role({ turn: [yaw, pitch], path: [x * 0.32 * H, y * 0.3 * H], z: 20 + y })) }),
        shot("looks", looks.length * 0.8, { frame: { at: head, tall: 0.26 * H }, roles: [role({ acts: looks.map((look, i) => ({ act: "feel", at: i * 0.8, for: 0.9, params: { look } })) })] }),
        shot("say", 5.9, { frame: { at: head, tall: 0.26 * H }, roles: [role()], says: [{ line: "said", at: 0.2 }] }),
      ] : []),
      shot("arms", ARM_PLACES_FRONT.length * 0.8, { roles: [role({ acts: [...carry("f"), ...carry("b")] })] }),
      shot("acts", gestures.length ? gestures[gestures.length - 1].at + gestures[gestures.length - 1].for! + 0.4 : 1, { roles: [role({ acts: gestures })] }),
      ...(front ? [shot("walk", 5, { set: "floor", roles: [role({ path: [{ t: 0.4, x: -0.34 * H, y: -0.4 * H }, { t: 4.2, x: 0.1 * H, y: 0.08 * H, ease: "ease-in-out-quad" }] })] })] : [shot("walk", 4, { roles: [role({ path: [{ t: 0, x: -0.7 * H, ease: "linear" }, { t: 4, x: 0.7 * H, ease: "linear" }] })] })]),
      ...(f.body.sits === false ? [] : [shot("sit", 5, { roles: [role({ acts: [{ act: "sit", at: 0.5, for: 4 }] })] })]),
    ],
  };
}
