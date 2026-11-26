import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { solveArm, turnBetween } from "../registry/rig/rig-arm";
import type { ArmBuild } from "../registry/rig/rig-arm";
import { actFrame } from "../registry/rig/rig-acting";
import { JOINTS } from "../registry/anatomy/anatomy-pose";
import { JOINT_RANGES } from "../registry/rig/rig-comfort";
import { inspectPainted, outlined, paintedRest, paintedSocket } from "../registry/rig/rig-look-painted";
import type { RigFrame } from "../registry/rig/rig-evaluate";
import { inspectRuby, moraeOf, parseRuby, phonesOf, rubyReading } from "../registry/video/storybook/japanese-text";
import { mouthAt, mouthKeys } from "../registry/video/storybook/speech-mouth";
import type { SpeechTrack } from "../registry/video/storybook/speech-mouth";
import { inspectStorybook, planStorybook, storybookFrame, storyLineSeconds } from "../registry/video/storybook/storybook-film";
import { checkStory } from "../registry/video/storybook/story-check";
import { composeStory } from "../registry/video/storybook/story-play";
import type { PlayLesson } from "../registry/video/storybook/story-play";
import type { StorybookFilm } from "../registry/video/storybook/storybook-film";
import { StorybookFilmPlayer, StorybookFilmStage } from "../registry/video/storybook/storybook-film-react";
import { figure, figureIds } from "../src/video/storybook/art";
import { castOf, PEOPLE } from "../src/video/storybook/cast";
import { filmNames, filmOf } from "../src/video/storybook/films";
import { storyLibrary } from "../src/video/storybook/library";
import { KONBINI_FILM, KONBINI_LINES } from "../src/video/storybook/konbini-film";
import { armBench, walkBench } from "../src/video/storybook/story-benches";

const RAD = Math.PI / 180;
const tip = (arm: ArmBuild, shoulder: readonly [number, number], p: ReturnType<typeof solveArm>) => {
  const step = (angle: number, length: number) => [-Math.sin(angle * RAD) * length, Math.cos(angle * RAD) * length], u = step(p.upper, arm.upper * p.upperScale), l = step(p.lower, arm.lower * p.lowerScale), [px, py] = arm.palm ?? [0, 0], c = Math.cos(p.hand * RAD), s = Math.sin(p.hand * RAD);
  return [shoulder[0] + p.shift[0] + u[0] + l[0] + px * c - py * s, shoulder[1] + p.shift[1] + u[1] + l[1] + px * s + py * c];
};

describe("a sleeve", () => {
  // an arm of 100 and 90 that hangs, with the folds that cloth has there: its edges go in and out
  const frame = (upper: number, lower: number): RigFrame => {
    const bone = (x: number, y: number, deg: number, length: number) => { const c = Math.cos(deg * RAD), n = Math.sin(deg * RAD); return { world: { a: c, b: n, c: -n, d: c, e: x, f: y }, length }; };
    const elbow = [-Math.sin(upper * RAD) * 100, Math.cos(upper * RAD) * 100];
    return { bones: new Map([["u", bone(0, 0, upper, 100)], ["l", bone(elbow[0], elbow[1], lower, 90)]]) } as unknown as RigFrame;
  };
  const sides = Array.from({ length: 96 }, (_, i): [number, number, number] => [i * 2, -14 + 4 * Math.sin(i / 3), 14 + 4 * Math.sin(i / 4 + 1)]), edge = (s: number, j: 1 | 2) => sides[Math.min(95, Math.round(s / 2))][j];
  const limb = { kind: "limb", upper: "u", lower: "l", soft: 16, sides } as const;
  const off = (points: readonly (readonly number[])[]) => { const a = points[0], b = points[points.length - 1], n = Math.hypot(b[0] - a[0], b[1] - a[1]); return Math.max(...points.map(p => Math.abs((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) / n)); };
  const way = (a: readonly number[], b: readonly number[]) => Math.atan2(b[1] - a[1], b[0] - a[0]) / RAD;
  it("is drawn as it was painted while it hangs", () => { expect(outlined(limb, frame(0, 0), frame(0, 0))).toBeUndefined(); });
  it("is drawn as it was painted when it ends above the elbow, as a short sleeve does", () => {
    const short = { ...limb, sides: sides.map(([s]): [number, number, number] => (s < 70 ? [s, -18, 18] : [s, -9, 9])) };
    expect(outlined(short, frame(0, 0), frame(-40, -140))).toBeUndefined();
    // a sleeve that ends at the elbow is still drawn straight
    expect(outlined({ ...limb, sides: sides.map(([s]): [number, number, number] => (s < 100 ? [s, -18, 18] : [s, -9, 9])) }, frame(0, 0), frame(-40, -140))).toBeDefined();
  });
  for (const [upper, lower] of [[-85, -178], [-40, -140], [-20, -118], [85, 178]] as const) it(`is two straight parts with a corner at the elbow at ${upper}° and ${lower}°`, () => {
    const line = outlined(limb, frame(0, 0), frame(upper, lower))!, at = (s: number, j: 1 | 2) => line.at(s, edge(s, j));
    for (const j of [1, 2] as const) {
      expect(off([20, 28, 36, 44, 52, 60, 68].map(s => at(s, j))), `upper part, edge ${j}`).toBeLessThan(2.2);
      expect(off([122, 128, 134, 140].map(s => at(s, j))), `forearm, edge ${j}`).toBeLessThan(2.2);
    }
    // outside, the whole turn is between the last quarter of one part and the first of the other: no curve over the length of the arm
    const bend = turnBetween(upper, lower), turns = ([1, 2] as const).map(j => Math.abs(turnBetween(way(at(56, j), at(72, j)), way(at(124, j), at(140, j)))));
    for (const t of turns) expect(Math.abs(t - Math.abs(bend))).toBeLessThan(14);
    const wide = (s: number) => Math.hypot(at(s, 1)[0] - at(s, 2)[0], at(s, 1)[1] - at(s, 2)[1]);
    expect(wide(40), "thinner than the cloth").toBeGreaterThan(22); expect(wide(130)).toBeGreaterThan(19);
  });
});

describe("joints", () => {
  it("can do what the anatomy says", () => {
    const of = (id: string, dof: "flex" | "abduct" | "twist") => { const d = JOINTS.find(j => j.id === id)!.dofs[dof]!; return [d.min, d.max]; };
    const can = JOINT_RANGES, bend = of("elbow", "flex");
    expect(can.raise.can[1]).toBe(of("shoulder", "flex")[1]); expect(can.aside.can[1]).toBe(of("shoulder", "abduct")[1]); expect(can.behind.can[1]).toBe(-of("shoulder", "flex")[0]);
    expect(can.bend.can).toEqual([0, bend[1]]); expect(can.turn.can).toEqual(of("forearm", "twist")); expect(can["wrist-flex"].can).toEqual(of("wrist", "flex")); expect(can["wrist-side"].can).toEqual(of("wrist", "abduct"));
    expect(can["neck-nod"].can).toEqual(of("neck", "flex")); expect(can["neck-tilt"].can).toEqual(of("neck", "abduct")); expect(can["neck-turn"].can).toEqual(of("neck", "twist"));
    expect(can["back-bend"].can).toEqual(of("spine", "flex")); expect(can["back-tilt"].can).toEqual(of("spine", "abduct")); expect(can["back-turn"].can).toEqual(of("spine", "twist"));
  });
  it("are those of a person, and no elbow jumps, while hands wave and shrug", () => {
    for (const [name, shots] of [["hello", ["bye-bye"]], ["station", ["arrive-3"]]] as const) {
      const plan = planStorybook(filmOf(name)), got = checkStory(plan, { shots }); expect(plan.shots.filter(s => (shots as readonly string[]).includes(s.shot.id)), name).toHaveLength(shots.length);
      expect(got.joints.filter(j => j.level === "can"), name).toEqual([]); expect(got.jumps, name).toEqual([]); expect(got.unstudied, name).toEqual([]);
    }
  }, 20_000);
});

describe("arms", () => {
  const arm = (side: "f" | "b"): ArmBuild => ({ side, upper: 26, lower: 23, facing: 45, palm: [0, 7] });
  it("bring the palm to the goal, never lock, never fold flat", () => {
    for (const side of ["f", "b"] as const) for (let x = 6; x <= 44; x += 4) for (let y = -30; y <= 44; y += 4) {
      if (Math.hypot(x, y) < 24 || Math.hypot(x, y) > 50) continue;
      const a = arm(side), p = solveArm(a, { shoulder: [0, 0], to: [x, y] }), [X, Y] = tip(a, [0, 0], p);
      expect(Math.hypot(X - x, Y - y), `${side} ${x},${y}`).toBeLessThan(1);
      expect(Math.min(p.upperScale, p.lowerScale)).toBeGreaterThan(0.6); expect(Math.max(p.upperScale, p.lowerScale)).toBeLessThanOrEqual(1.0001);
      expect(Math.abs(turnBetween(p.lower, p.hand))).toBeLessThanOrEqual(58.01);
    }
  });
  it("hang the elbow below the line from shoulder to hand when the hand is in front of the waist", () => {
    for (const side of ["f", "b"] as const) {
      const a = arm(side), p = solveArm(a, { shoulder: [0, 0], to: [30, 22], angle: -80 }), ex = -Math.sin(p.upper * RAD) * a.upper * p.upperScale, ey = Math.cos(p.upper * RAD) * a.upper * p.upperScale;
      expect(ey, side).toBeGreaterThan((22 * ex) / 30); expect(Math.abs(p.upper), side).toBeLessThan(40);
    }
  });
  it("move without a jump through every place round the body", () => {
    const plan = planStorybook(armBench()); let last: number[] | null = null;
    for (let f = 0; f < plan.frames; f++) {
      const now = storybookFrame(plan, f / plan.film.fps).played.flatMap(p => ["hand-f", "hand-b"].flatMap(id => { const b = p.frame.bones.get(id)!; return [b.world.e, b.world.f]; }));
      if (last) now.forEach((v, i) => expect(Math.abs(v - last![i]), `frame ${f}`).toBeLessThan(12));
      last = now;
    }
  });
});

describe("speech", () => {
  it("reads furigana, small っ, long vowels and ん", () => {
    const t = parseRuby("{袋|ふくろ}[は|わ] いりますか。"); expect(rubyReading(t)).toContain("ふくろわ"); expect(inspectRuby("{袋|ふくろ}")).toEqual([]);
    expect(moraeOf("きって").map(m => m.kana)).toEqual(["き", "っ", "て"]);
    expect(phonesOf(parseRuby("ありがとう")).map(p => p.p).pop()).toBe("o:");
  });
  it("shuts the lips for ん only before m, b and p", () => {
    const track = (after: string): SpeechTrack => ({ seconds: 1, precision: "aligned", phones: [{ p: "a", start: 0.1, end: 0.3, token: 0 }, { p: "N", start: 0.3, end: 0.5, token: 0 }, { p: after, start: 0.5, end: 0.58, token: 0 }, { p: "a", start: 0.58, end: 0.8, token: 0 }] });
    const shut = (after: string) => mouthAt(mouthKeys(track(after)), 0.42).shape;
    expect(shut("p").press).toBeGreaterThan(shut("k").press + 0.2);
  });
  it("opens the mouth while a vowel is heard and rests after the line", () => {
    for (const [id, l] of Object.entries(KONBINI_LINES)) {
      const keys = mouthKeys(l.track), open = (t: number) => mouthAt(keys, t).shape.open;
      const a = l.track.phones.filter(p => p.p[0] === "a" && p.end - p.start > 0.07); for (const p of a) expect(open((p.start + p.end) / 2), `${id} ${p.start}`).toBeGreaterThan(0.2);
      expect(open(l.track.seconds + 0.4), id).toBeLessThan(0.1);
    }
  });
});

describe("films from data", () => {
  it.each(filmNames().filter(n => !n.startsWith("kit-")))("%s is whole", name => expect(inspectStorybook(filmOf(name))).toEqual([]));
  it("join with the views that each of them has of a person", () => {
    const { cast, shots } = filmOf("first-trip"), seen = new Set(shots.flatMap(s => (s.roles ?? []).filter(r => r.actor === "ema").map(r => r.view!)));
    expect([...seen].sort()).toEqual(expect.arrayContaining(["front", "rear", "three-quarter"])); for (const v of seen) expect(cast.ema.figures[v], v).toBeDefined();
  });
});

describe("the film", () => {
  const plan = planStorybook(KONBINI_FILM);
  it("is whole: every name, place, painting and line is there", () => {
    expect(inspectStorybook(KONBINI_FILM)).toEqual([]);
    for (const id of figureIds()) { const f = figure(id); expect(inspectPainted(f.art, f.body.spec), id).toEqual([]); }
  });
  it("leaves loose parts as they were painted, and folds no head or body", () => {
    const turn = (m: { a: number; b: number }) => Math.atan2(m.b, m.a) / RAD;
    for (const id of figureIds()) {
      const { art, body } = figure(id), rest = paintedRest(art, body.spec), { frame } = actFrame(body, [], 0, { fps: 24 });
      for (const f of body.follow ?? []) expect(Math.abs(turnBetween(turn(rest.bones.get(f.bone)!.world), turn(frame.bones.get(f.bone)!.world))), `${id} ${f.bone}`).toBeLessThan(1);
    }
    const skins = (who: string) => new Set(Object.values(KONBINI_FILM.cast).flatMap(a => Object.values(a.figures)).find(f => f.art.id === who)!.art.layers.filter(l => l.bind.kind === "skin").map(l => l.id));
    for (let n = 0; n < plan.frames; n += 15) for (const q of storybookFrame(plan, n / 24).played) for (const m of q.meshes.filter(m => skins(q.figure.art.id).has(m.id))) {
      const side = [0, 0], at = (i: number, k: number) => m.positions[m.indices[i] * 2 + k];
      for (let i = 0; i < m.indices.length; i += 3) { const a = (at(i + 1, 0) - at(i, 0)) * (at(i + 2, 1) - at(i, 1)) - (at(i + 2, 0) - at(i, 0)) * (at(i + 1, 1) - at(i, 1)); side[a > 0 ? 0 : 1] += Math.abs(a); }
      expect(Math.min(...side) / (side[0] + side[1]), `${q.figure.art.id} ${m.id}, frame ${n}`).toBeLessThan(0.002);
    }
  });
  it("is the same twice", () => { for (const t of [1, 8.2, 14.1, 25.3]) expect(JSON.stringify(storybookFrame(plan, t).paint, (_, v) => (v instanceof Float32Array ? Array.from(v) : v))).toBe(JSON.stringify(storybookFrame(plan, t).paint, (_, v) => (v instanceof Float32Array ? Array.from(v) : v))); });
  it("keeps the standing foot where it is while someone walks", () => {
    const walk = planStorybook(walkBench()), feet: Record<string, number[][]> = { "foot-f": [], "foot-b": [] };
    for (let f = 12; f < walk.frames - 12; f++) { const p = storybookFrame(walk, f / walk.film.fps, {}).played[0]; for (const id of Object.keys(feet)) { const b = p.frame.bones.get(id)!; feet[id].push([b.world.e, b.world.f]); } }
    for (const [id, path] of Object.entries(feet)) {
      const low = Math.max(...path.map(p => p[1])); let planted = 0, slid = 0;
      for (let i = 1; i < path.length; i++) if (path[i][1] > low - 0.35 && path[i - 1][1] > low - 0.35) { planted++; slid += Math.abs(path[i][0] - path[i - 1][0]); }
      expect(planted, id).toBeGreaterThan(8); expect(slid / planted, id).toBeLessThan(0.6);
    }
  });
  it("holds every prop in the hand that holds it", () => {
    for (const s of plan.shots) for (const p of s.shot.props ?? []) p.holds.forEach((h, i) => {
      if (!("by" in h)) return; const next = p.holds[i + 1]?.t ?? s.shot.seconds, t = s.start + Math.min(next, s.shot.seconds) - 0.05, frame = storybookFrame(plan, Math.max(s.start, t)), who = frame.played.find(q => q.role.actor === h.by);
      expect(who && paintedSocket(who.figure.art, who.frame, h.socket), `${s.shot.id} ${p.prop}`).toBeTruthy();
    });
  });
});

describe("translations", () => {
  const order = 200, words = 846, stage = (frame: number, glosses?: boolean) => renderToStaticMarkup(createElement(StorybookFilmStage, { film: KONBINI_FILM, frame, glosses }));
  it("are hidden until they are asked for, but a word to learn has its meaning", () => {
    expect(stage(order)).toContain("すみません"); expect(stage(order)).not.toContain('lang="en"'); expect(stage(words)).toContain("rice ball"); expect(stage(words)).not.toContain("Today’s words");
    expect(stage(order, true)).toContain("One rice ball, please."); expect(stage(words, true)).toContain("Today’s words");
  });
  it("have a switch that is off, and none in a film without translations", () => {
    const player = (film: typeof KONBINI_FILM) => renderToStaticMarkup(createElement(StorybookFilmPlayer, { film })), japanese = { ...KONBINI_FILM, lines: Object.fromEntries(Object.entries(KONBINI_FILM.lines).map(([id, l]) => [id, { ...l, en: undefined }])), shots: KONBINI_FILM.shots.map(s => ({ ...s, words: s.words?.map(w => ({ ...w, gloss: undefined })) })) };
    expect(player(KONBINI_FILM)).toMatch(/<input type="checkbox"\/>English/); expect(player(japanese)).not.toContain("English"); expect(inspectStorybook(japanese)).toEqual([]);
  });
});

describe("people", () => {
  it("are data: each file is a person, a cast is made from it, and a voice is a Fish Audio id when there is one", () => {
    expect(Object.keys(PEOPLE)).toHaveLength(12);
    for (const [id, p] of Object.entries(PEOPLE)) {
      expect(castOf(id)[id].name, id).toBe(p.name); if (p.voice) expect(p.voice.fish, id).toMatch(/^[0-9a-f]{32}$/); if (p.voice?.pace !== undefined) expect(p.voice.pace, id).toBe(6.5); expect(p.height, id).toBeGreaterThan(80);
    }
  });
});

describe("lesson pages", () => {
  const first = Object.keys(KONBINI_LINES)[0], line = KONBINI_LINES[first];
  const lesson = (...scenes: PlayLesson[]) => composeStory({ id: "t", title: "t", scenes }, { ...storyLibrary(), lines: KONBINI_LINES });
  const english = (film: StorybookFilm, t: number, glosses?: boolean) => [...renderToStaticMarkup(createElement(StorybookFilmStage, { film, frame: Math.round(t * film.fps), glosses })).matchAll(/<p lang="en"[^>]*>([^<]*)<\/p>/g)].map(m => m[1]);
  /** Film seconds when the words of the line first show. */
  const comes = (film: StorybookFilm, text: string) => { const plan = planStorybook(film), s = plan.shots.find(s => s.shot.words?.some(w => w.text === text))!, w = s.shot.words!.find(w => w.text === text)!; return s.start + Math.max(w.at ?? 0, s.index ? (s.shot.transition?.seconds ?? 0) * 0.7 : 0); };
  const said = lesson({ id: "say", practice: { lines: [first], reveal: 1.5, times: 2 } });
  it("show the English of a practised line only after reveal seconds", () => {
    const plan = planStorybook(said), at = comes(said, line.ja), shown = (t: number) => storybookFrame(plan, t).words.find(w => w.words.text === line.ja)!;
    expect(shown(at + 0.5).glossOpacity).toBe(0); expect(shown(at + 2.2).glossOpacity).toBe(1);
    expect(english(said, at + 0.5)).not.toContain(line.en); expect(english(said, at + 2.2)).toContain(line.en);
  });
  it("keep the reveal when the switch is on", () => { expect(english(said, comes(said, line.ja) + 0.5, true)).not.toContain(line.en); });
  it("say a phrase as many times as asked", () => { expect(said.shots.flatMap(s => s.says ?? []).filter(s => s.line === first)).toHaveLength(2); });
  const check = (...items: { hear?: string; ask?: string; gloss?: string; answer: string }[]) => lesson({ id: "check", check: { items } });
  const sayOf = (film: StorybookFilm, id: string) => { const plan = planStorybook(film), s = plan.shots.find(s => s.shot.says?.some(q => q.line === id))!; return s.start + s.shot.says!.find(q => q.line === id)!.at; };
  it("check a heard line: the line, a pause with no English, then the answer with its English", () => {
    const film = check({ hear: "welcome", answer: "onigiri-please" }), heard = sayOf(film, "welcome") + storyLineSeconds(KONBINI_LINES.welcome), answer = sayOf(film, "onigiri-please");
    expect(answer - heard).toBeGreaterThanOrEqual(4); expect(english(film, (heard + answer) / 2)).toEqual([]); expect(english(film, answer + 0.6)).toContain(KONBINI_LINES["onigiri-please"].en);
  });
  it("check a situation: its English waits for the answer", () => {
    const film = check({ ask: "{水|みず}が {欲|ほ}しいです", gloss: "You want water.", answer: "yes-please" }), answer = sayOf(film, "yes-please");
    const asked = (t: number) => storybookFrame(planStorybook(film), t).words.find(w => w.words.text === "{水|みず}が {欲|ほ}しいです");
    expect(asked(answer - 1)?.glossOpacity).toBe(0); expect(english(film, answer - 1)).not.toContain("You want water.");
    expect(asked(answer + 0.6)?.glossOpacity).toBe(1); expect(english(film, answer + 0.6)).toEqual(expect.arrayContaining(["You want water.", KONBINI_LINES["yes-please"].en]));
  });
  it("let people stay, change sides or leave between items", () => {
    const film = check({ hear: "welcome", answer: "onigiri-please" }, { hear: "price", answer: "yes-please" }, { hear: "thanks", answer: "thanks-again" }), { spots } = storyLibrary().stages[storyLibrary().teach!.stage];
    const x = (shot: StorybookFilm["shots"][number], who: string) => { const p = shot.roles!.find(r => r.actor === who)!.path; return typeof p[0] === "number" ? p[0] : (p as readonly { x: number }[])[0].x; };
    expect(inspectStorybook(film)).toEqual([]); expect(film.shots).toHaveLength(3);
    const [one, two, three] = film.shots, left = spots.asker.at[0], right = spots.other.at[0];
    expect([x(one, "riku"), x(one, "ema"), x(two, "riku"), x(two, "ema"), x(three, "ema"), x(three, "riku")]).toEqual([left, right, left, right, left, right]);
  });
  it("refuse a check that one person hears and answers", () => { expect(() => check({ hear: "welcome", answer: "price" })).toThrow('Check "check" item 1: "riku" hears and answers; a check needs two people.'); expect(() => check({ hear: "welcome", ask: "?", answer: "thanks" })).toThrow('Check "check" item 1: give "hear" or "ask", not both.'); });
  it("leave the picture of a practice page behind", () => {
    const lib = storyLibrary(), prop = Object.keys(lib.props)[0], film = lesson({ id: "say", practice: { lines: ["welcome"], pictures: { welcome: prop } } }, { id: "check", check: { items: [{ hear: "price", answer: "yes-please" }] } });
    expect(film.shots.filter(s => s.id.startsWith("check")).some(s => s.props?.some(p => p.prop === prop))).toBe(false);
  });
  it("make a card from a title and up to three lines", () => {
    const card = (lines: readonly (string | { text: string; gloss?: string })[], seconds?: number) => lesson({ id: "goal", card: { title: "{今日|きょう}の もくひょう", gloss: "Today’s goal", lines, ...(seconds ? { seconds } : {}) } });
    const three = [first, { text: "{水|みず}を ください。", gloss: "Water, please." }, { text: "いくらですか。", gloss: "How much is it?" }], film = card(three), shot = film.shots[0];
    expect(film.shots).toHaveLength(1); expect(shot.layout).toBe("full"); expect(shot.roles ?? []).toHaveLength(0);
    expect(shot.seconds - card(three, 4).shots[0].seconds).toBeCloseTo(3 + 2.5 * 3 - 4, 1);
    const shown = english(film, planStorybook(film).shots[0].start + shot.seconds / 2);
    expect(shown).toEqual(expect.arrayContaining([line.en, "Water, please.", "How much is it?"])); expect(shown).not.toContain("Today’s goal");
    expect(() => card([...three, first])).toThrow('Card "goal" has 4 lines; a card has 3 at most.');
    expect(() => card(["no-such-line"])).toThrow('Card "goal": there is no line "no-such-line".');
  });
  it("put the picture of a line below the title and beside the speaker", () => {
    const lib = storyLibrary(), prop = Object.keys(lib.props).find(k => lib.props[k].width > lib.props[k].height)!, second = Object.keys(KONBINI_LINES)[1];
    const film = lesson({ id: "say", practice: { lines: [first, second], pictures: { [first]: prop } } }), shot = film.shots.find(s => s.id.endsWith(`practice-${first}`))!;
    const staged = shot.props!.find(p => p.prop === prop)!, hold = staged.holds[staged.holds.length - 1] as unknown as { at: [number, number] }, v = lib.props[prop], scale = staged.scale ?? 1;
    const { home } = lib.sets[lib.stages[lib.teach!.stage].set], f = lib.frame, unit = f.height / home.tall, px = ([x, y]: readonly [number, number]) => [f.x + f.width / 2 + (x - home.at[0]) * unit, f.y + f.height / 2 + (y - home.at[1]) * unit];
    const [fx, fy] = v.foot ?? [0.5, 1], w = v.width * scale * unit, h = v.height * scale * unit, [x, y] = px(hold.at), box = [x - fx * w, y - fy * h, w, h];
    expect(box[0]).toBeGreaterThanOrEqual(1038 - 1); expect(box[1]).toBeGreaterThanOrEqual(520 - 1); expect(box[0] + box[2]).toBeLessThanOrEqual(1558 + 1); expect(box[1] + box[3]).toBeLessThanOrEqual(800 + 1);
    expect(box[1]).toBeGreaterThan(360 + 140); // the title, its furigana and its English
    const tall = 1.5 * f.height; expect(box[0]).toBeGreaterThan(f.x + 0.3 * f.width + 0.18 * tall); // the speaker and the arms
    expect(film.shots.find(s => s.id.endsWith(`practice-${second}`))!.props?.some(p => p.prop === prop)).toBeFalsy();
    const next = lesson({ id: "say", practice: { lines: [first], pictures: { [first]: prop } } }, { id: "words", recap: { words: [{ text: "{水|みず}", gloss: "water" }] } });
    expect(next.shots.find(s => s.id.startsWith("words"))!.props?.some(p => p.prop === prop)).toBeFalsy();
    expect(() => lesson({ id: "say", practice: { lines: [first], pictures: { [first]: "no-such-prop" } } })).toThrow(`Practice "say": there is no prop "no-such-prop" for the picture of "${first}".`);
  });
});
