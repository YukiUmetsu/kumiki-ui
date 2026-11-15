import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { cameraAt, carvedLine, ease, loopOffsets, scrollPan, windAt } from "../registry/video/ukiyoe/ukiyoe-core";
import { creatureTravel, drawCreature, UKIYOE_CREATURE_ACTIONS, UKIYOE_SPECIES } from "../registry/video/ukiyoe/ukiyoe-creatures";
import { drawFigure, facingAt, figurePose, travelAt } from "../registry/video/ukiyoe/ukiyoe-figure";
import { drawMotif, UKIYOE_MOTIFS, WAVE_STATS, waveSurface } from "../registry/video/ukiyoe/ukiyoe-motifs";
import { drawParticles } from "../registry/video/ukiyoe/ukiyoe-particles";
import { expandCrowd } from "../registry/video/ukiyoe/ukiyoe-crowd";
import { oiranProcession, UKIYOE_OIRAN_LOOKS } from "../registry/video/ukiyoe/ukiyoe-oiran";
import { UKIYOE_MAIKO_LOOK } from "../registry/video/ukiyoe/ukiyoe-maiko";
import { palette, resolvePaint } from "../registry/video/ukiyoe/ukiyoe-pigments";
import { nodeState, UkiyoeScene } from "../registry/video/ukiyoe/ukiyoe-react";
import type { UkiyoeSceneSpec } from "../registry/video/ukiyoe/ukiyoe-scene";
import type { UkiyoeAction } from "../registry/video/ukiyoe/ukiyoe-figure";
import { inspectUkiyoeScene } from "../registry/video/ukiyoe/ukiyoe-scene";
import { kasumiBand } from "../registry/video/ukiyoe/ukiyoe-transitions";
import { compileFilm } from "../registry/video/film-document";
import { CAST, NIGHT_FERRY_SHOTS } from "../src/video/ukiyoe-night-ferry";
import { FOLKTALE_KASUMI, FOLKTALE_SHOTS } from "../src/video/ukiyoe-folktale";
import { SNOW_WOMAN_SHOTS } from "../src/video/ukiyoe-snow-woman";
import { KASUMI_INTO, ukiyoeFilm } from "../src/video/ukiyoe-film";
import { renderUkiyoeSlot } from "../src/video/ukiyoe-slot";
import { ukiyoeFrameAtElapsed } from "../src/video/ukiyoe-studio";

const scene = (extra: Partial<UkiyoeSceneSpec> = {}): UkiyoeSceneSpec => ({ version: 1, id: "t", width: 640, height: 360, durationFrames: 60, seed: 3, nodes: [], ...extra });

describe("UKIYO1 scene contract", () => {
  it("accepts every Night Ferry shot in both aspects", () => {
    for (const shot of NIGHT_FERRY_SHOTS) for (const aspect of ["landscape", "portrait"] as const)
      expect(inspectUkiyoeScene(shot.build(aspect)), shot.id + "/" + aspect).toEqual([]);
  });
  it("reports path-specific errors instead of drawing something else", () => {
    const issues = inspectUkiyoeScene(scene({ nodes: [
      { id: "a", kind: "motif", motif: "volcano" as never },
      { id: "b", kind: "block", d: "javascript:alert(1)", fill: "neon" },
      { id: "c", kind: "figure", look: { hair: "mohawk" as never }, actions: [{ type: "walk", start: 10, end: 5 }] },
      { id: "a", kind: "group", parent: "nope" },
    ] }));
    const paths = issues.map(i => i.path);
    expect(paths).toEqual(expect.arrayContaining(["$.nodes[0].motif", "$.nodes[1].d", "$.nodes[1].fill", "$.nodes[2].look.hair", "$.nodes[2].actions[0]", "$.nodes[2].actions[0].to", "$.nodes[3].id", "$.nodes[3].parent"]));
    expect(() => renderToStaticMarkup(<UkiyoeScene spec={scene({ nodes: [{ id: "x", kind: "block", fill: "neon", d: "M0 0h1v1z" }] })} frame={0} />)).toThrow(/Invalid UKIYO1 scene/);
  });
  it("resolves palette roles per preset and rejects unknown paints", () => {
    expect(resolvePaint("bero", palette("edo"))).toMatch(/^#/);
    expect(palette("aizuri").beni).not.toBe(palette("edo").beni);
    expect(() => resolvePaint("neon", palette())).toThrow(RangeError);
  });
});

describe("UKIYO1 frame purity", () => {
  it("renders the same markup for a frame whatever the seek order", () => {
    const spec = NIGHT_FERRY_SHOTS[3].build("landscape");
    const at = (f: number) => renderToStaticMarkup(<UkiyoeScene spec={spec} frame={f} />).replace(/uk[A-Za-z0-9]*?-/g, "");
    const forward = [40, 200, 260].map(at), shuffled = [260, 40, 200].map(at);
    expect(shuffled).toEqual([forward[2], forward[0], forward[1]]);
    expect(forward[0]).not.toEqual(forward[1]);
  });
  it("draws every motif deterministically and lets wind move the trees", () => {
    for (const m of UKIYOE_MOTIFS) {
      const a = drawMotif(m, {}, { frame: 30, wind: .5, seed: 4, progress: 1 });
      expect(a.length, m).toBeGreaterThan(0);
      expect(drawMotif(m, {}, { frame: 30, wind: .5, seed: 4, progress: 1 })).toEqual(a);
    }
    const calm = JSON.stringify(drawMotif("willow", {}, { frame: 30, wind: 0, seed: 4, progress: 1 }));
    expect(JSON.stringify(drawMotif("willow", {}, { frame: 30, wind: 1.5, seed: 4, progress: 1 }))).not.toEqual(calm);
  });
  it("raises and breaks the wave from its progress and break frame", () => {
    const extent = (p: number, frame: number) => {
      const d = drawMotif("wave", { breakAt: 100 }, { frame, wind: 0, seed: 1, progress: p })[0];
      const ys = [...(d as { d: string }).d.matchAll(/-?\d+(?:\.\d+)?/g)].map(Number).filter((_, i) => i % 2 === 1);
      return -Math.min(...ys);
    };
    expect(extent(1, 0)).toBeGreaterThan(extent(.2, 0) * 2.5);
    expect(extent(1, 140)).toBeLessThan(extent(1, 0) * .7);
  });
  it("draws the wave's foam as one connected shape with a single outline, never as separately outlined claws", () => {
    for (const frame of [0, 120, 150]) {
      const prims = drawMotif("wave", { breakAt: 100 }, { frame, wind: 0, seed: 1, progress: 1 });
      const foam = prims.filter(p => p.t === "sandwich");
      expect(foam, "frame " + frame).toHaveLength(1);
      // No other white fill in the wave carries its own outline (spray and flecks are droplets, drawn without one).
      expect(prims.filter(p => p.t === "fill" && p.outline), "frame " + frame).toEqual([]);
    }
  });
  it("meets the great-wave checklist: forward-down branching claws, spread out, curved stripes filling the column on thicker navy", () => {
    const prims = drawMotif("wave", { width: 1300, height: 760 }, { frame: 20, wind: 0, seed: 21, progress: 1 });
    const S = WAVE_STATS, med = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
    expect(prims.filter(q => q.t === "sandwich")).toHaveLength(1);
    // Claws reach forward and down with the wave's travel, never up.
    expect(S.claws.every(k => { const a = ((k.angle % 360) + 360) % 360; return a >= 120 && a <= 215; })).toBe(true);
    // Most claws branch into 2–3 hooks.
    expect(S.claws.filter(k => k.hooks >= 2).length / S.claws.length).toBeGreaterThanOrEqual(.6);
    // Spread out: one claw at a time (median nearest-neighbour gap relative to claw size).
    const nn = S.claws.map((k, i) => Math.min(...S.claws.filter((_, j) => j !== i).map(o => Math.hypot(o.at[0] - k.at[0], o.at[1] - k.at[1]))));
    const ratio = med(nn) / med(S.claws.map(k => k.size));
    expect(ratio).toBeGreaterThanOrEqual(.55); expect(ratio).toBeLessThanOrEqual(1.2);
    // The dome's rounded top carries no claws (it rolls in smooth bumps): none sit high on the back of the wave.
    expect(S.claws.filter(k => k.at[0] > .05 * S.W && k.at[1] < -.6 * S.H)).toEqual([]);
    // Stripes: curved (bow ≥ 8% of length), near the column's own lean (≤ 35° from vertical), thick navy between.
    for (const st of S.stripes) {
      const a = st.line[0], b = st.line[st.line.length - 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const bow = Math.max(...st.line.map(q => Math.abs((b[0] - a[0]) * (a[1] - q[1]) - (a[0] - q[0]) * (b[1] - a[1])) / L)) / L;
      expect(bow).toBeGreaterThanOrEqual(.08);
      expect(Math.abs(Math.atan2(b[0] - a[0], b[1] - a[1]) * 180 / Math.PI)).toBeLessThanOrEqual(35);
    }
    const gaps = S.stripes.slice(1).map((st, i) => { const A = S.stripes[i].line, m = A[Math.floor(A.length / 2)]; return Math.min(...st.line.map(q => Math.hypot(q[0] - m[0], q[1] - m[1]))) - st.width; });
    // Owner asked for thicker light stripes (and more of them) after asking for thick navy: dark stays ≥ 1.5× light.
    expect(med(gaps) / S.stripes[0].width).toBeGreaterThanOrEqual(1.5);
  });
  it("animates particles in closed form", () => {
    const rain = (f: number) => drawParticles({ type: "rain", count: 40 }, f, 0, 9);
    expect(rain(12)).toEqual(rain(12));
    expect(rain(12)).not.toEqual(rain(13));
    const fw = drawParticles({ type: "fireworks", bursts: [{ frame: 50, x: 100, y: 100 }] }, 70, 0, 2);
    expect(fw.some(p => p.t === "glow")).toBe(true);
  });
});

describe("UKIYO1 figures", () => {
  it("travels by walk/run segments, faces the direction of travel and turns at the midpoint", () => {
    const actions = [{ type: "walk" as const, start: 0, end: 60, to: -300 }, { type: "turn" as const, start: 70, end: 80 }];
    expect(travelAt(actions, 0).x).toBe(0);
    expect(travelAt(actions, 60).x).toBe(-300);
    expect(travelAt(actions, 30).x).toBeLessThan(-100);
    expect(facingAt({ look: {}, actions }, 30).dir).toBe(-1);
    expect(facingAt({ look: {}, actions }, 76).dir).toBe(1);
  });
  it("kneels, bows and blends actions without discontinuities", () => {
    const spec = { look: {}, actions: [{ type: "kneel" as const, start: 10, end: 90 }, { type: "bow" as const, start: 30, end: 80 }] };
    expect(figurePose(spec, 50, 1, 250).kneel).toBe(1);
    expect(figurePose(spec, 50, 1, 250).lean).toBeGreaterThan(20);
    for (let f = 0; f < 100; f++) expect(Math.abs(figurePose(spec, f + 1, 1, 250).lean - figurePose(spec, f, 1, 250).lean)).toBeLessThan(12);
  });
  it("blows sleeves and hems with the wind", () => {
    const look = { sleeves: "long" as const, hair: "shimada" as const };
    expect(JSON.stringify(drawFigure({ look }, 20, 1.5, 3).prims)).not.toEqual(JSON.stringify(drawFigure({ look }, 20, 0, 3).prims));
  });
  it("draws a three-quarter face, and the face action turns a profile head to it and back; oni stay in profile", () => {
    const head = (spec: Parameters<typeof drawFigure>[0], f: number) => JSON.stringify(drawFigure(spec, f, 0, 3).prims.find(p => p.t === "group" && /scale\(/.test(p.transform ?? "")));
    const look = { hair: "shimada" as const };
    const turned = { look, actions: [{ type: "face" as const, start: 10, end: 60, blend: 10 }] };
    expect(head(turned, 5)).toEqual(head({ look }, 5));                       // profile before
    expect(head(turned, 40)).toEqual(head({ look: { ...look, view: "three-quarter" } }, 40));   // three-quarter while held
    expect(head(turned, 40)).not.toEqual(head({ look }, 40));
    expect(head(turned, 80)).toEqual(head({ look }, 80));                     // back to profile after the blend
    // The body turns too: a three-quarter figure shows the collar's V (both under-collar edges) and the robe's front panel.
    const underLines = (spec: Parameters<typeof drawFigure>[0]) => drawFigure(spec, 20, 0, 3).prims.filter(p => p.t === "line" && p.color === "ki").length;
    const woman = { hair: "shimada" as const, under: "ki", robe: "beni" };
    expect(underLines({ look: { ...woman, view: "three-quarter" } })).toBeGreaterThanOrEqual(underLines({ look: woman }) + 2);
    // Limbs turn too: the stride's sideways spread foreshortens (the feet sit closer together in x mid-step).
    const span = (spec: Parameters<typeof drawFigure>[0]) => { const xs = drawFigure(spec, 25, 0, 3).prims.filter(p => p.t === "fill" && /^M/.test(p.d)).flatMap(p => (p.t === "fill" ? p.d : "").match(/-?\d+(\.\d+)?/g)!.map(Number).filter((_, i) => i % 2 === 0)); return Math.max(...xs) - Math.min(...xs); };
    const walker = { hair: "chonmage" as const, lower: "tucked" as const }, walk = [{ type: "walk" as const, start: 0, end: 100, to: 400 }];
    expect(span({ look: { ...walker, view: "three-quarter" }, actions: walk })).toBeLessThan(span({ look: walker, actions: walk }));
    const oni = { look: CAST["oni-red"] };
    expect(head({ ...oni, actions: [{ type: "face" as const, start: 0, end: 60 }] }, 30)).toEqual(head(oni, 30));
  });
  it("draws a figure square on: both eyes from the front, none from behind, and both legs side by side", () => {
    type P = { t: string; color?: unknown; prims?: P[] };
    const flat = (ps: P[]): P[] => ps.flatMap(p => p.t === "group" || p.t === "clip" ? flat(p.prims ?? []) : [p]);
    const look = { hair: "shimada" as const, robe: "beni", under: "ki" }, walk = [{ type: "walk" as const, start: 0, end: 100, to: 300 }];
    const draw = (view?: "front" | "back") => drawFigure({ look: { ...look, view }, actions: walk }, 25, 0, 3);
    const eyes = (view?: "front" | "back") => flat(draw(view).prims as P[]).filter(p => p.t === "dots" && p.color === "sumi").length;
    expect(eyes("front")).toBe(2);
    expect(eyes("back")).toBe(0);
    const [pro, front, back] = [undefined, "front", "back"].map(v => JSON.stringify(draw(v as never).prims));
    expect(new Set([pro, front, back]).size).toBe(3);
    // Walking toward or away from us still travels along the road.
    expect(draw("front").x).toBeCloseTo(draw().x, 5);
    expect(inspectUkiyoeScene(scene({ nodes: [{ id: "f", kind: "figure", look: { view: "back" } } as never] }))).toEqual([]);
  });
});

describe("UKIYO1 oiran", () => {
  type P = { t: string; d?: string; fill?: unknown; color?: unknown; transform?: string; noPrint?: boolean; prims?: P[] };
  const flat = (ps: P[], dy = 0): (P & { dy: number })[] => ps.flatMap(p => {
    if (p.t !== "group" && p.t !== "clip") return [{ ...p, dy }];
    const m = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(p.transform ?? "");
    return flat(p.prims ?? [], dy + (m ? +m[2] : 0));
  });
  it("dresses the oiran in every view: both eyes from the front, none from behind, the clogs standing on the ground", () => {
    const draw = (view: "profile" | "three-quarter" | "front" | "back") => drawFigure({ look: { ...UKIYOE_OIRAN_LOOKS.oiran, view } }, 20, 0, 3).prims as P[];
    const all = (["profile", "three-quarter", "front", "back"] as const).map(v => JSON.stringify(draw(v)));
    expect(new Set(all).size).toBe(4);
    const eyes = (v: "front" | "back") => flat(draw(v)).filter(p => p.t === "dots" && p.color === "sumi").length;
    expect(eyes("front")).toBe(2);
    expect(eyes("back")).toBe(0);
    // The clogs (black teeth from the side, lacquered blocks from the front) reach the ground within a pixel or two,
    // though the figure stands on them.
    const black = (f: unknown) => f === "sumi" || (f as { stops?: unknown[][] })?.stops?.[0]?.[1] === "sumi";
    for (const v of ["profile", "front"] as const) {
      const lows = flat(draw(v)).filter(p => p.t === "fill" && black(p.fill) && !p.noPrint).map(p => { const n = p.d!.match(/-?\d+(\.\d+)?/g)!.map(Number); const xs = n.filter((_, i) => i % 2 === 0), ys = n.filter((_, i) => i % 2 === 1); return { w: Math.max(...xs) - Math.min(...xs), y: Math.max(...ys) + p.dy }; }).filter(q => q.w < 24 && q.y > -20);
      expect(lows.length, v).toBeGreaterThan(0);
      for (const q of lows) expect(Math.abs(q.y), v).toBeLessThan(3);
    }
  });
  it("walks the figure-eight procession step without sliding the planted clog", () => {
    const spec = { look: UKIYOE_OIRAN_LOOKS.oiran, actions: [{ type: "dochu" as const, start: 0, end: 600, to: 120 }] };
    const clogX = (f: number) => { const d = drawFigure(spec, f, 0, 5); const teeth = flat(d.prims as P[]).filter(p => p.t === "fill" && p.fill === "sumi" && !p.noPrint).map(p => { const n = p.d!.match(/-?\d+(\.\d+)?/g)!.map(Number); const xs = n.filter((_, i) => i % 2 === 0); return { w: Math.max(...xs) - Math.min(...xs), x: (Math.max(...xs) + Math.min(...xs)) / 2 + d.x }; }).filter(q => q.w < 12); return teeth[0].x; };
    // The first clog is planted from the first step's end until the second step lifts it (about frames 10–110 here).
    const xs = [16, 40, 64, 88, 108].map(clogX);
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(1.5);
    expect(drawFigure(spec, 300, 0, 5).x).toBeGreaterThan(drawFigure(spec, 100, 0, 5).x);
  });
  it("builds the procession, keeps everyone at her pace and halts them all while she looks back", () => {
    const nodes = oiranProcession({ id: "p", x: 500, y: 900, start: 0, end: 600, distance: 300, lookBackAt: 250, lookFor: 90 });
    expect(nodes.map(n => n.id)).toEqual(["p-kamuro-far", "p-lantern", "p-shinzo", "p-parasol", "p-oiran", "p-kamuro-near"]);
    expect(inspectUkiyoeScene(scene({ durationFrames: 600, nodes }))).toEqual([]);
    const at = (f: number) => nodes.map(n => travelAt(n.actions ?? [], f).x);
    expect(at(600)).toEqual(nodes.map(() => 300));
    expect(at(260)).toEqual(at(330));                              // halted together
    const oiran = nodes.find(n => n.id === "p-oiran")!;
    expect(figurePose({ look: oiran.look, actions: oiran.actions }, 290, 1, 250).headBack).toBeGreaterThan(.5);
    expect(inspectUkiyoeScene(scene({ nodes: [{ id: "o", kind: "figure", look: { ...UKIYOE_OIRAN_LOOKS.oiran, obiTie: "side" as never, layers: ["nope" as never] } }] })).map(i => i.path))
      .toEqual(expect.arrayContaining(["$.nodes[0].look.obiTie", "$.nodes[0].look.layers[0]"]));
  });
});

describe("UKIYO1 maiko", () => {
  type P = { t: string; d?: string; fill?: unknown; color?: unknown; transform?: string; noPrint?: boolean; prims?: P[]; pattern?: { type: string } };
  const flat = (ps: P[], dy = 0): (P & { dy: number })[] => ps.flatMap(p => {
    if (p.t !== "group" && p.t !== "clip") return [{ ...p, dy }];
    const m = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(p.transform ?? "");
    return flat(p.prims ?? [], dy + (m ? +m[2] : 0));
  });
  const draw = (view: "profile" | "three-quarter" | "front" | "back", actions: UkiyoeAction[] = [], f = 20) => flat(drawFigure({ look: { ...UKIYOE_MAIKO_LOOK, view }, actions }, f, 0, 3).prims as P[]);
  it("dresses the maiko in every view, the darari's crested ends behind her and the jewelled clasp in front", () => {
    const all = (["profile", "three-quarter", "front", "back"] as const).map(v => JSON.stringify(draw(v)));
    expect(new Set(all).size).toBe(4);
    // A crest is the gold five-petalled plum woven into each end.
    const crests = (v: "front" | "back") => draw(v).filter(p => p.t === "fill" && p.fill === "kin" && (p.d!.match(/M/g) ?? []).length === 5).length;
    expect(crests("back")).toBe(2);
    expect(crests("front")).toBe(0);
    expect(draw("front").some(p => p.t === "fill" && p.fill === "matsu")).toBe(true);           // the clasp's stone
    expect(draw("back").some(p => p.t === "fill" && p.fill === "hada")).toBe(true);             // eri-ashi at the nape
    expect(draw("back").filter(p => p.t === "dots" && p.color === "sumi").length).toBe(0);
  });
  it("opens the fan to dance and closes it at rest; the kyōmai flows between held poses", () => {
    const spread = (actions: UkiyoeAction[], f: number) => { const fan = draw("profile", actions, f).find(p => p.t === "fill" && JSON.stringify(p.fill).includes("\"kin\"") && JSON.stringify(p.fill).includes("radial")); const n = fan!.d!.match(/-?\d+(\.\d+)?/g)!.map(Number); const xs = n.filter((_, i) => i % 2 === 0), ys = n.filter((_, i) => i % 2 === 1); return Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)); };
    const dance = [{ type: "kyomai" as const, start: 0, end: 600 }];
    expect(spread(dance, 20)).toBeGreaterThan(spread([], 20) * 2);
    // Within a hold the pose is still; across the transition it changes, frame by frame without jumps.
    const pose = (f: number) => figurePose({ look: UKIYOE_MAIKO_LOOK, actions: dance }, f, 3, 250);
    expect(Math.abs(pose(20).shF - pose(26).shF)).toBeLessThan(2);
    let worst = 0;
    for (let f = 30; f < 64; f++) worst = Math.max(worst, Math.abs(pose(f + 1).shF - pose(f).shF));
    expect(worst).toBeLessThan(8);
    expect(Math.abs(pose(70).shF - pose(20).shF)).toBeGreaterThan(40);
  });
  it("walks on okobo with short steps, the planted clog holding still", () => {
    const actions = [{ type: "walk" as const, start: 0, end: 600, to: 200 }];
    const clog = (f: number) => { const d = drawFigure({ look: { ...UKIYOE_MAIKO_LOOK, prop: "none" }, actions }, f, 0, 5); const b = flat(d.prims as P[]).filter(p => p.t === "fill" && (p.fill as { stops?: unknown[][] })?.stops?.[0]?.[1] === "ki" && !p.noPrint).map(p => Math.min(...p.d!.match(/-?\d+(\.\d+)?/g)!.map(Number).filter((_, i) => i % 2 === 0)) + d.x); return b[0]; };
    const xs = [9, 21, 33, 45, 54].map(clog);
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(1.5);
    expect(inspectUkiyoeScene(scene({ nodes: [{ id: "m", kind: "figure", look: UKIYOE_MAIKO_LOOK, actions: [{ type: "kyomai", start: 0, end: 50 }] }] }))).toEqual([]);
  });
});

describe("UKIYO1 crowds", () => {
  it("expands a crowd into the same seeded people every time, in depth rows, back rows first", () => {
    const spec = { id: "c", width: 1200, count: 18, rows: 3, mood: "stroll" as const };
    const a = expandCrowd(spec, 9);
    expect(expandCrowd(spec, 9)).toEqual(a);
    expect(a).toHaveLength(18);
    expect(new Set(a.map(m => m.id)).size).toBe(18);
    expect(a.map(m => m.row)).toEqual([...a.map(m => m.row)].sort((x, y) => y - x));            // drawn back to front
    expect(Math.min(...a.filter(m => m.row === 2).map(m => -m.y))).toBeGreaterThan(Math.max(...a.filter(m => m.row === 0).map(m => -m.y)));
    expect(expandCrowd(spec, 10)).not.toEqual(a);
    const file = expandCrowd({ id: "p", width: 1200, count: 10, mood: "procession" }, 3);
    expect(file.every(m => m.facing === "left" && m.actions[0].type === "walk" && (m.actions[0].to ?? 0) < 0)).toBe(true);
  });
  it("renders a crowd node as figures and rejects a bad one", () => {
    const html = renderToStaticMarkup(<UkiyoeScene spec={scene({ nodes: [{ id: "c", kind: "crowd", x: 320, y: 300, width: 600, count: 5 }] })} frame={10} />);
    expect((html.match(/data-node="c-\d+"/g) ?? []).length).toBe(5);
    const issues = inspectUkiyoeScene(scene({ nodes: [{ id: "c", kind: "crowd", width: 600, count: 500, mood: "riot" } as never] })).map(i => i.path);
    expect(issues).toEqual(expect.arrayContaining(["$.nodes[0].count", "$.nodes[0].mood"]));
  });
});

describe("UKIYO1 print, camera and transitions", () => {
  it("prints the key block first and colours after it during the print pass", () => {
    const spec = NIGHT_FERRY_SHOTS[0].build("landscape");
    const fillsAt = (p: number) => (renderToStaticMarkup(<UkiyoeScene spec={spec} frame={100} printProgress={p} />).match(/<path d="[^"]+" fill="#/g) ?? []).length;
    expect(fillsAt(.02)).toBeLessThan(fillsAt(.5));
    expect(fillsAt(.5)).toBeLessThan(fillsAt(.99));
    const proof0 = renderToStaticMarkup(<UkiyoeScene spec={spec} frame={170} proof={0} />), proof8 = renderToStaticMarkup(<UkiyoeScene spec={spec} frame={170} proof={8} />);
    expect(proof0.length).toBeLessThan(proof8.length);
  });
  it("pans the handscroll with holds at stations and keeps parallax and wind pure", () => {
    const keys = scrollPan({ from: 4000, to: 1000, y: 540, start: 0, end: 300, stations: [{ x: 3000, hold: 40 }] });
    const x = (f: number) => cameraAt({ keys }, f, 1920, 1080).x;
    expect(x(0)).toBe(4000);
    expect(x(300)).toBe(1000);
    const hold = keys.findIndex(k => k.x === 3000);
    expect(x(keys[hold].frame + 10)).toBe(3000);
    expect(windAt({ gusts: [{ frame: 10, duration: 40, strength: 2 }] }, 25, 1)).toBeGreaterThan(1);
    expect(carvedLine([[0, 0], [100, 0]], 6)).toMatch(/^M.*Z$/);
  });
  it("sweeps kasumi bands fully across and enters/exits nodes on their frames", () => {
    expect(kasumiBand(0, 6, 0, 1920, 7).lead).toBeGreaterThan(1920);
    expect(kasumiBand(0, 6, 1, 1920, 7).trail).toBeLessThan(0);
    // Every band covers the full width at some point of the sweep, so no strip ever cuts straight between shots.
    for (let i = 0; i < 6; i++) expect(Array.from({ length: 101 }, (_, k) => kasumiBand(i, 6, k / 100, 1920, 7)).some(b => b.lead < 0 && b.trail > 1920), "band " + i).toBe(true);
    const node = { id: "n", kind: "group" as const, enter: { preset: "stamp" as const, frame: 10, duration: 8 } };
    expect(nodeState(node, 5, 2).visible).toBe(false);
    expect(nodeState(node, 30, 2).pose.scale).toBeCloseTo(1, 5);
  });
  it("compiles the Night Ferry film for both outputs and renders its slots", () => {
    const doc = ukiyoeFilm();
    for (const outputId of ["landscape", "portrait"]) {
      const result = compileFilm(doc, { outputId });
      expect(result.ok, JSON.stringify(!result.ok && result.diagnostics)).toBe(true);
      if (result.ok) expect(result.film.durationFrames).toBe(NIGHT_FERRY_SHOTS.reduce((s, x) => s + x.build("landscape").durationFrames, 0));
    }
    const scenes = (doc as unknown as { scenes: { content: { slot: string; label: string; props: Record<string, unknown> } }[] }).scenes;
    expect(scenes.filter(s => s.content.slot === "ukiyoe-kasumi")).toHaveLength(Object.keys(KASUMI_INTO).length);
    const ctx = { frame: 5, durationFrames: 20, width: 1920, height: 1080, reducedMotion: false };
    for (const s of scenes.slice(0, 3)) expect(renderToStaticMarkup(<>{renderUkiyoeSlot(s.content, ctx)}</>)).toContain("<svg");
    expect(renderUkiyoeSlot({ slot: "other", label: "x" }, ctx)).toBeUndefined();
  });
  it("samples playback from elapsed time, not paint count", () => {
    expect(ukiyoeFrameAtElapsed(10, 1000, 100)).toBe(40);
    expect(ukiyoeFrameAtElapsed(90, 1000, 100)).toBe(99);
    expect(ukiyoeFrameAtElapsed(90, 1000, 100, 1, true)).toBe(20);
  });
});

describe("UKIYO1 folktale creatures", () => {
  it("draws every species deterministically in every action and travels along walk/fly segments", () => {
    for (const species of UKIYOE_SPECIES) for (const type of UKIYOE_CREATURE_ACTIONS) {
      const spec = { species, actions: [{ type, start: 0, end: 60, ...(["walk", "run", "fly", "hop"].includes(type) ? { to: 200 } : {}) }] };
      const a = drawCreature(spec, 30, .4, 5);
      expect(drawCreature(spec, 30, .4, 5), species + "/" + type).toEqual(a);
      // Mid-transform, mid-appear or mid-vanish a creature is a fading group, not its full set of parts.
      if (!["transform", "appear", "vanish"].includes(type)) expect(a.prims.length, species + "/" + type).toBeGreaterThan(3);
    }
    expect(creatureTravel([{ type: "fly", start: 0, end: 40, to: -300, toY: -50 }], 40)).toMatchObject({ x: -300, y: -50, dir: -1 });
  });
  it("turns an animal three-quarters: a shorter body and the far legs set back and higher", () => {
    const xs = (look: Record<string, unknown>) => { const d = drawCreature({ species: "fox", look, actions: [{ type: "walk", start: 0, end: 60, to: 100 }] }, 20, 0, 5); return JSON.stringify(d.prims); };
    const pro = xs({}), tq = xs({ view: "three-quarter" });
    expect(tq).not.toEqual(pro);
    expect(tq).toMatch(/"t":"group","transform":"translate\(-[\d.]+ -[\d.]+\)"/);           // far legs moved back and up
    const crane = JSON.stringify(drawCreature({ species: "crane", look: { view: "three-quarter" }, actions: [{ type: "stand", start: 0, end: 60 }] }, 20, 0, 5).prims);
    expect(crane).toMatch(/"t":"group","transform":"translate\(-[\d.]+ -[\d.]+\)"/);
    expect(inspectUkiyoeScene(scene({ nodes: [{ id: "c", kind: "creature", species: "fox", look: { view: "sideways" } } as never] })).map(i => i.path)).toContain("$.nodes[0].look.view");
  });
  it("draws four-legged animals square on, the kyūbi's tails fanned and the drumming tanuki upright", () => {
    const draw = (species: string, view: string | undefined, action = "walk", look: Record<string, unknown> = {}) => JSON.stringify(drawCreature({ species: species as never, look: { ...look, view: view as never }, actions: [{ type: action as never, start: 0, end: 60, ...(action === "walk" ? { to: 100 } : {}) }] }, 20, 0, 5).prims);
    for (const sp of ["fox", "tanuki", "dog", "cat", "rabbit", "monkey", "horse", "nue"]) {
      const [pro, front, back] = [undefined, "front", "back"].map(v => draw(sp, v));
      expect(new Set([pro, front, back]).size, sp).toBe(3);
    }
    const kyubi = draw("fox", "back", "sit", { tails: 9 }), one = draw("fox", "back", "sit");
    expect((kyubi.match(/"t":"glow"/g) ?? []).length).toBe(12);                                   // foxfire: 3 + nine tails
    expect(one).not.toMatch(/"t":"glow"/);
    expect(draw("tanuki", "front", "drum", { hat: true })).not.toEqual(draw("tanuki", "front", "sit", { hat: true }));
    expect(inspectUkiyoeScene(scene({ nodes: [{ id: "c", kind: "creature", species: "horse", look: { view: "front" } } as never] }))).toEqual([]);
  });
  it("vanishes a creature in a henge puff and keeps it gone", () => {
    const spec = { species: "tanuki" as const, actions: [{ type: "transform" as const, start: 10, end: 30 }] };
    expect(drawCreature(spec, 5, 0, 1).prims.length).toBeGreaterThan(10);
    expect(drawCreature(spec, 25, 0, 1).prims.length).toBe(1);
    expect(drawCreature(spec, 60, 0, 1).prims).toEqual([]);
  });
  it("validates creature nodes with path errors", () => {
    const issues = inspectUkiyoeScene(scene({ nodes: [{ id: "k", kind: "creature", species: "unicorn" as never, actions: [{ type: "walk", start: 0, end: 9 }] }] }));
    expect(issues.map(i => i.path)).toEqual(expect.arrayContaining(["$.nodes[0].species", "$.nodes[0].actions[0].to"]));
  });
  it("gives the oni horns, fangs and a bare torso and lets it use figure actions", () => {
    const oni = drawFigure({ look: CAST["oni-red"], actions: [{ type: "walk", start: 0, end: 40, to: 100 }] }, 20, 0, 3);
    const human = drawFigure({ look: { ...CAST["oni-red"], face: "human", horns: 0, upper: "robe" } }, 20, 0, 3);
    expect(JSON.stringify(oni.prims)).not.toEqual(JSON.stringify(human.prims));
    expect(oni.x).toBeGreaterThan(0);
  });
  it("opens the peach on its frame and paints the great-wave Fuji", () => {
    const closed = drawMotif("peach", { openAt: 50 }, { frame: 20, wind: 0, seed: 1, progress: 1 });
    expect(closed.some(p => p.t === "glow")).toBe(false);
    expect(drawMotif("peach", { openAt: 50 }, { frame: 80, wind: 0, seed: 1, progress: 1 }).some(p => p.t === "glow")).toBe(true);
    expect(JSON.stringify(drawMotif("mountain", {}, { frame: 0, wind: 0, seed: 1, progress: 1 }))).toContain("fuji-rock");
    expect(JSON.stringify(drawMotif("mountain", { style: "wash" }, { frame: 0, wind: 0, seed: 1, progress: 1 }))).not.toContain("fuji-rock");
  });
  it("compiles the folktale film in both aspects", () => {
    for (const shot of [...FOLKTALE_SHOTS, ...SNOW_WOMAN_SHOTS]) for (const aspect of ["landscape", "portrait"] as const) expect(inspectUkiyoeScene(shot.build(aspect)), shot.id).toEqual([]);
    const doc = ukiyoeFilm(FOLKTALE_SHOTS, {}, { id: "folk", kasumi: FOLKTALE_KASUMI });
    for (const outputId of ["landscape", "portrait"]) expect(compileFilm(doc, { outputId }).ok).toBe(true);
  });
});

describe("UKIYO1 boats, boarding and riding a wave", () => {
  const shot = (id: string) => NIGHT_FERRY_SHOTS.find(s => s.id === id)!.build("landscape");
  const node = (spec: UkiyoeSceneSpec, id: string) => spec.nodes.find(n => n.id === id)!;
  const boatX = (spec: UkiyoeSceneSpec, f: number) => nodeState(node(spec, "boat"), f, 2).pose.x;

  it("moves the ferry whenever the ferryman is poling, and never while he is not working at a pier", () => {
    for (const id of ["boarding", "squall", "fireworks", "arrival"]) {
      const spec = shot(id), man = node(spec, "ferryman") as Extract<UkiyoeSceneSpec["nodes"][number], { kind: "figure" }>;
      for (const a of man.actions!.filter(a => a.type === "pole")) {
        // From a standing start the hull gathers way within the first push; after that it must always be advancing.
        for (let f = a.start + 12; f + 8 <= Math.min(a.end, spec.durationFrames - 1); f += 4)
          expect(Math.abs(boatX(spec, f + 8) - boatX(spec, f)), `${id} frame ${f}`).toBeGreaterThan(4);
      }
    }
    const boarding = shot("boarding");
    for (let f = 0; f < 190; f += 10) expect(boatX(boarding, f), "docked while boarding").toBe(boatX(boarding, 0));
  });
  it("walks passengers along the pier and down into a boat that is alongside, never through the air", () => {
    for (const id of ["boarding", "arrival"]) {
      const spec = shot(id);
      for (const who of ["traveller", "mother", "child"]) {
        const fig = node(spec, who) as Extract<UkiyoeSceneSpec["nodes"][number], { kind: "figure" }>;
        const walks = fig.actions!.filter(a => a.type === "walk" || a.type === "run");
        expect(walks[0].via?.length, `${id}/${who} steps via the pier edge`).toBe(1);
        for (let f = walks[0].start; f <= walks[0].end; f++) {
          // Feet stay between the pier top and the deck (34 px apart), and the hull is at rest for every step.
          const y = (fig.y ?? 0) + travelAt(fig.actions!, f).y;
          expect(y, `${id}/${who} frame ${f}`).toBeGreaterThanOrEqual(-52.01);
          expect(y, `${id}/${who} frame ${f}`).toBeLessThanOrEqual(-17.99);
          expect(Math.abs(boatX(spec, f + 1) - boatX(spec, f)), `${id} hull still at ${f}`).toBeLessThan(.01);
        }
      }
    }
  });
  it("follows via waypoints at an even pace and keeps the walk cycle tied to the distance covered", () => {
    const actions = [{ type: "walk" as const, start: 0, end: 100, to: 100, toY: 40, via: [[100, 0]] as const }];
    expect(travelAt(actions, 50).y).toBeLessThan(1);
    expect(travelAt(actions, 100)).toMatchObject({ x: 100, y: 40 });
    expect(travelAt(actions, 100).dist).toBeCloseTo(140, 3);
  });
  // 210 full SVG frames plus 7,200 wave samples exceed Vitest\'s 5 s
  // default on shared CI runners; retain every frame and assertion.
  it("keeps the wave surface continuous and lifts a rider smoothly as the wave rises and breaks", () => {
    for (const frame of [0, 110, 125, 140]) {
      const c = { frame, wind: 0, seed: 3, progress: 1 };
      let prev = waveSurface({ breakAt: 100, breakDuration: 40 }, c, -900);
      for (let x = -899; x <= 900; x++) { const h = waveSurface({ breakAt: 100, breakDuration: 40 }, c, x); expect(Math.abs(h - prev), `x ${x} frame ${frame}`).toBeLessThan(10); prev = h; }   // steep but seamless
    }
    const spec = shot("squall"), ys: number[] = [], rots: number[] = [];
    for (let f = 150; f < 360; f++) {
      const html = renderToStaticMarkup(<UkiyoeScene spec={spec} frame={f} />), i = html.indexOf('data-node="boat"');
      const m = /translate\(([-\d.]+) ([-\d.]+)\)(?: rotate\(([-\d.]+)\))?/.exec(html.slice(html.lastIndexOf("<g ", i), i))!;
      ys.push(Number(m[2])); rots.push(Number(m[3] ?? 0));
    }
    expect(Math.min(...ys)).toBeLessThan(ys[0] - 100);                       // carried well up the face
    for (let i = 1; i < ys.length; i++) { expect(Math.abs(ys[i] - ys[i - 1]), `y step at ${150 + i}`).toBeLessThan(12); expect(Math.abs(rots[i] - rots[i - 1]), `pitch step at ${150 + i}`).toBeLessThan(2.5); }
    expect(inspectUkiyoeScene(scene({ nodes: [{ id: "b", kind: "group", ride: { on: "nope" } }] })).map(i => i.path)).toContain("$.nodes[0].ride.on");
  }, 20000);
  it("surges a poled hull on each stroke and fades loops in and out", () => {
    expect(loopOffsets({ kind: "surge", period: 44, amplitude: 1 }, 11, 0).x).toBeCloseTo(10, 3);
    expect(loopOffsets({ kind: "rock", period: 40, start: 100, fade: 20 }, 100, 0).y).toBeCloseTo(0, 6);
    expect(ease("inQuad", .5)).toBe(.25);
    expect(ease("outQuad", .5)).toBe(.75);
  });
});
