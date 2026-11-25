import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { solveArm, turnBetween } from "../registry/rig/rig-arm";
import type { ArmBuild } from "../registry/rig/rig-arm";
import { actFrame } from "../registry/rig/rig-acting";
import { inspectPainted, paintedRest, paintedSocket } from "../registry/rig/rig-look-painted";
import { inspectRuby, moraeOf, parseRuby, phonesOf, rubyReading } from "../registry/video/storybook/japanese-text";
import { mouthAt, mouthKeys } from "../registry/video/storybook/speech-mouth";
import type { SpeechTrack } from "../registry/video/storybook/speech-mouth";
import { inspectStorybook, planStorybook, storybookFrame } from "../registry/video/storybook/storybook-film";
import { StorybookFilmPlayer, StorybookFilmStage } from "../registry/video/storybook/storybook-film-react";
import { figure, figureIds } from "../src/video/storybook/art";
import { filmNames, filmOf } from "../src/video/storybook/films";
import { KONBINI_FILM, KONBINI_LINES } from "../src/video/storybook/konbini-film";
import { armBench, walkBench } from "../src/video/storybook/story-benches";

const RAD = Math.PI / 180;
const tip = (arm: ArmBuild, shoulder: readonly [number, number], p: ReturnType<typeof solveArm>) => {
  const step = (angle: number, length: number) => [-Math.sin(angle * RAD) * length, Math.cos(angle * RAD) * length], u = step(p.upper, arm.upper * p.upperScale), l = step(p.lower, arm.lower * p.lowerScale), [px, py] = arm.palm ?? [0, 0], c = Math.cos(p.hand * RAD), s = Math.sin(p.hand * RAD);
  return [shoulder[0] + p.shift[0] + u[0] + l[0] + px * c - py * s, shoulder[1] + p.shift[1] + u[1] + l[1] + px * s + py * c];
};

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
  it("are hidden until they are asked for", () => {
    expect(stage(order)).toContain("すみません"); expect(stage(order)).not.toContain('lang="en"'); expect(stage(words)).not.toContain('lang="en"');
    expect(stage(order, true)).toContain("One rice ball, please."); expect(stage(words, true)).toContain("rice ball");
  });
  it("have a switch that is off, and none in a film without translations", () => {
    const player = (film: typeof KONBINI_FILM) => renderToStaticMarkup(createElement(StorybookFilmPlayer, { film })), japanese = { ...KONBINI_FILM, lines: Object.fromEntries(Object.entries(KONBINI_FILM.lines).map(([id, l]) => [id, { ...l, en: undefined }])), shots: KONBINI_FILM.shots.map(s => ({ ...s, words: s.words?.map(w => ({ ...w, gloss: undefined })) })) };
    expect(player(KONBINI_FILM)).toMatch(/<input type="checkbox"\/>English/); expect(player(japanese)).not.toContain("English"); expect(inspectStorybook(japanese)).toEqual([]);
  });
});
