import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { cameraAt, carvedLine, ease, loopOffsets, scrollPan, seedOf, windAt } from "../registry/video/ukiyoe/ukiyoe-core";
import { creatureTravel, drawCreature, UKIYOE_CREATURE_ACTIONS, UKIYOE_SPECIES } from "../registry/video/ukiyoe/ukiyoe-creatures";
import { drawFigure, facingAt, figureClubAt, figurePose, figureSwordAt, settledPose, travelAt } from "../registry/video/ukiyoe/ukiyoe-figure";
import { CLUB, oniFight } from "../registry/video/ukiyoe/ukiyoe-oni";
import { castleTown } from "../registry/video/ukiyoe/ukiyoe-town";
import { realmScene, UKIYOE_REALM_SCENES } from "../registry/video/ukiyoe/ukiyoe-realms";
import { paradeScene, UKIYOE_PARADE_SCENES } from "../registry/video/ukiyoe/ukiyoe-parade";
import { faceTraits } from "../registry/video/ukiyoe/ukiyoe-face";
import { UkiyoeInkBleed, UkiyoePrintIn, UkiyoeScrollRoll } from "../registry/video/ukiyoe/ukiyoe-transitions";
import { UKIYOE_ROLES_LIST, UKIYOE_SEASONS, ukiyoeWardrobe } from "../registry/video/ukiyoe/ukiyoe-wardrobe";
import { inspectUkiyoeEpisode, ukiyoeCaptionLines, ukiyoeEpisode, ukiyoeEpisodeSrt, ukiyoeTitleCard } from "../registry/video/ukiyoe/ukiyoe-episode";
import { KASA_JIZO_EPISODE } from "../src/video/ukiyoe-kasa-jizo";
import { URASHIMA_EPISODE } from "../src/video/ukiyoe-urashima";
import { MOMOTARO_EPISODE } from "../src/video/ukiyoe-momotaro";
import { KAGUYA_EPISODE } from "../src/video/ukiyoe-kaguya";
import { tamatebakoSmoke, TAMATEBAKO_THICKEST } from "../registry/video/ukiyoe/ukiyoe-ryugu";
import { tsukumoScene, UKIYOE_TSUKUMO, UKIYOE_TSUKUMO_SCENES } from "../registry/video/ukiyoe/ukiyoe-tsukumo";
import { giantScene, UKIYOE_GIANT_SCENES, UKIYOE_GIANTS } from "../registry/video/ukiyoe/ukiyoe-giants";
import { folkYokaiScene, UKIYOE_FOLK_YOKAI_LOOKS, UKIYOE_FOLK_YOKAI_SCENES } from "../registry/video/ukiyoe/ukiyoe-folkyokai";
import { heianScene, UKIYOE_HEIAN_LOOKS, UKIYOE_HEIAN_SCENES } from "../registry/video/ukiyoe/ukiyoe-heian";
import { treeScene, UKIYOE_TREE_SCENES } from "../registry/video/ukiyoe/ukiyoe-trees";
import { bellStrike, templeScene, UKIYOE_TEMPLE_SCENES } from "../registry/video/ukiyoe/ukiyoe-temple";
import { animalScene, animalYokaiScene, UKIYOE_ANIMAL_HABITATS, UKIYOE_ANIMAL_YOKAI_SCENES, UKIYOE_CRITTERS } from "../registry/video/ukiyoe/ukiyoe-critters";
import { bushiScene, shootAt, UKIYOE_BUSHI_SCENES } from "../registry/video/ukiyoe/ukiyoe-bushi";
import { kamiScene, UKIYOE_KAMI_LOOKS, UKIYOE_KAMI_SCENES } from "../registry/video/ukiyoe/ukiyoe-kami";
import { effectScene, UKIYOE_EFFECT_DEMOS } from "../registry/video/ukiyoe/ukiyoe-effects";
import { folkScene, toolAt, toolContact, UKIYOE_FOLK_WORK } from "../registry/video/ukiyoe/ukiyoe-folk";
import { faceOutline, humanFeatures, onnaScene, UKIYOE_GHOST_FACES, UKIYOE_ONNA_LOOKS } from "../registry/video/ukiyoe/ukiyoe-onna";
import { interiorScene, LOOM_BEATER_PULL, loomGrip, UKIYOE_INTERIOR_KINDS, UKIYOE_WEAVE_PERIOD, weaveBeat } from "../registry/video/ukiyoe/ukiyoe-interior";
import { drawMotif, UKIYOE_MOTIFS, WAVE_STATS, waveSurface } from "../registry/video/ukiyoe/ukiyoe-motifs";
import { drawParticles } from "../registry/video/ukiyoe/ukiyoe-particles";
import { expandCrowd } from "../registry/video/ukiyoe/ukiyoe-crowd";
import { oiranProcession, UKIYOE_OIRAN_LOOKS } from "../registry/video/ukiyoe/ukiyoe-oiran";
import { UKIYOE_MAIKO_LOOK } from "../registry/video/ukiyoe/ukiyoe-maiko";
import { BLADE, samuraiDuel, samuraiKata, swordAt, swordGeometry, UKIYOE_SAMURAI_LOOK } from "../registry/video/ukiyoe/ukiyoe-katana";
import { palette, resolvePaint } from "../registry/video/ukiyoe/ukiyoe-pigments";
import { nodeState, UkiyoeScene } from "../registry/video/ukiyoe/ukiyoe-react";
import { ukiyoeNodeOnScreen, ukiyoeShotCues } from "../registry/video/ukiyoe/ukiyoe-sound";
import { figureMoments, gaitCycle } from "../registry/video/ukiyoe/ukiyoe-figure";
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
  it("grows the pine, cherry, willow and plum with FLORA1: the whole tree stands `height` tall, blossom follows `bloom`", () => {
    const top = (prims: unknown) => [...JSON.stringify(prims).matchAll(/"d":"([^"]+)"/g)].flatMap(m => [...m[1].matchAll(/-?\d+(?:\.\d+)?/g)].map(Number).filter((_, i) => i % 2 === 1)).reduce((a, v) => Math.min(a, v), Infinity);
    for (const m of ["pine", "sakura", "willow", "ume"] as const) {
      const t = -top(drawMotif(m, { height: 400 }, { frame: 0, wind: 0, seed: 4, progress: 1 }));
      expect(t, m).toBeGreaterThan(360); expect(t, m).toBeLessThan(470);
    }
    const blossom = (bloom: number) => drawMotif("sakura", { height: 400, bloom }, { frame: 0, wind: 0, seed: 4, progress: 1 }).filter(p => JSON.stringify(p).includes('"beni"')).length;
    expect(blossom(1)).toBeGreaterThan(0);
    expect(blossom(0)).toBe(0);
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
    // Each open eye draws its iris clipped to the lids.
    const irises = (ps: P[]): number => ps.reduce((n, p) => n + ((p as { key?: string }).key === "iris" ? 1 : p.prims ? irises(p.prims) : 0), 0);
    const eyes = (view?: "front" | "back") => irises(draw(view).prims as P[]);
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
    type Q = { key?: string; prims?: Q[] };
    const irises = (ps: Q[]): number => ps.reduce((n, p) => n + (p.key === "iris" ? 1 : p.prims ? irises(p.prims) : 0), 0);
    const eyes = (v: "front" | "back") => irises(drawFigure({ look: { ...UKIYOE_OIRAN_LOOKS.oiran, view: v } }, 10, 0, 3).prims as Q[]);
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
  it("never lets a sleeve go paper-thin through the dance, in any view", () => {
    // Thickness of a closed shape: 2 × area / perimeter (about the width of a long strip). The robe and sleeve fills are
    // the patterned asagi shapes; across a whole kyōmai cycle none may collapse toward a line.
    const thickness = (d: string) => { const n = d.match(/-?\d+(\.\d+)?/g)!.map(Number), q: number[][] = []; for (let i = 0; i + 1 < n.length; i += 2) q.push([n[i], n[i + 1]]); let A = 0, L = 0; q.forEach((a, i) => { const b = q[(i + 1) % q.length]; A += a[0] * b[1] - b[0] * a[1]; L += Math.hypot(b[0] - a[0], b[1] - a[1]); }); return Math.abs(A) / (L || 1); };
    for (const view of ["profile", "three-quarter", "front", "back"] as const) {
      let thinnest = Infinity;
      for (let f = 0; f < 256; f += 3) for (const p of draw(view, [{ type: "kyomai", start: 0, end: 600 }], f)) if (p.t === "fill" && p.fill === "asagi" && p.pattern) thinnest = Math.min(thinnest, thickness(p.d!));
      expect(thinnest, view).toBeGreaterThan(5);
    }
  });
  it("walks on okobo with short steps, the planted clog holding still", () => {
    const actions = [{ type: "walk" as const, start: 0, end: 600, to: 200 }];
    const clog = (f: number) => { const d = drawFigure({ look: { ...UKIYOE_MAIKO_LOOK, prop: "none" }, actions }, f, 0, 5); const b = flat(d.prims as P[]).filter(p => p.t === "fill" && (p.fill as { stops?: unknown[][] })?.stops?.[0]?.[1] === "ki" && !p.noPrint).map(p => Math.min(...p.d!.match(/-?\d+(\.\d+)?/g)!.map(Number).filter((_, i) => i % 2 === 0)) + d.x); return b[0]; };
    const xs = [9, 21, 33, 45, 54].map(clog);
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(1.5);
    expect(inspectUkiyoeScene(scene({ nodes: [{ id: "m", kind: "figure", look: UKIYOE_MAIKO_LOOK, actions: [{ type: "kyomai", start: 0, end: 50 }] }] }))).toEqual([]);
  });
});

describe("UKIYO1 samurai and katana", () => {
  type P = { t: string; d?: string; fill?: unknown; color?: unknown; transform?: string; noPrint?: boolean; opacity?: number; prims?: P[] };
  const flat = (ps: P[]): P[] => ps.flatMap(p => p.t === "group" || p.t === "clip" ? flat(p.prims ?? []) : [p]);
  const kata = samuraiKata(0);
  const steel = (ps: P[]) => ps.filter(p => p.t === "fill" && (p.fill as { stops?: unknown[][] })?.stops?.[1]?.[1] === "gofun" && (p.fill as { stops?: unknown[][] })?.stops?.[0]?.[1] === "usuzumi");
  it("runs the kata on the sword's own timeline: sheathed, drawn, guards held after their actions, sheathed again", () => {
    expect(swordAt(kata, 0).held).toBe(false);
    expect(swordAt(kata, 0).out).toBe(0);
    expect(swordAt(kata, 40).out).toBeGreaterThan(0);                      // coming out along the scabbard
    expect(swordAt(kata, 40).free).toBe(0);
    const jodan = swordAt(kata, 135);                                     // after the kamae ends, the guard holds
    expect(jodan.held && jodan.free === 1 && jodan.a < -120).toBe(true);
    expect(swordAt(kata, 255).a).toBeCloseTo(-100, 0);                    // hassō
    expect(swordAt(kata, 430).held).toBe(false);
    expect(swordAt(kata, 430).out).toBe(0);
    // As drawn, every frame continues from the last: only the strike (its fast middle) turns the blade more than 30° a frame.
    const g = (f: number) => swordGeometry(swordAt(kata, f), [0, -180], [16, -125], 250);
    for (let f = 1; f < 480; f++) {
      const p = g(f - 1), q = g(f), da = Math.abs(((q.a - p.a) % 360 + 540) % 360 - 180);
      expect(da, `frame ${f}`).toBeLessThan(f >= 160 && f <= 170 ? 50 : 30);
    }
  });
  it("draws the blade only when drawn, keeps both hands on the hilt and blurs the fast strike", () => {
    const draw = (f: number, view?: "front" | "back" | "three-quarter") => flat(drawFigure({ look: { ...UKIYOE_SAMURAI_LOOK, view }, actions: kata }, f, 0, 4).prims as P[]);
    expect(steel(draw(5)).length).toBe(0);
    expect(steel(draw(118)).length).toBe(1);
    for (const v of ["front", "back", "three-quarter"] as const) expect(steel(draw(118, v)).length, v).toBe(1);
    // Strike frames carry the pale fan of air; a held guard does not.
    const smear = (f: number) => draw(f).some(p => p.t === "fill" && p.fill === "gofun" && p.noPrint && (p.opacity ?? 1) < .5);
    expect([161, 163, 165, 167].some(smear)).toBe(true);
    expect(smear(118)).toBe(false);
    // The kamishimo's two crests show on the breast from the front.
    expect(draw(5, "front").filter(p => p.t === "dots" && p.color === "gofun").length).toBeGreaterThanOrEqual(2);
    expect(inspectUkiyoeScene(scene({ durationFrames: 480, nodes: [{ id: "s", kind: "figure", look: UKIYOE_SAMURAI_LOOK, actions: kata }] }))).toEqual([]);
    expect(inspectUkiyoeScene(scene({ nodes: [{ id: "s", kind: "figure", look: { ...UKIYOE_SAMURAI_LOOK, swords: "spear" as never }, actions: [{ type: "kamae", start: 0, end: 9, form: "low" as never }] }] })).map(i => i.path))
      .toEqual(expect.arrayContaining(["$.nodes[0].look.swords", "$.nodes[0].actions[0].form"]));
  });
});

describe("UKIYO1 duels", () => {
  type Fig = { x: number; y: number; scale: number; facing: "left" | "right"; look: never; actions: UkiyoeAction[] };
  const nodes = samuraiDuel({ id: "d", x: 700, y: 900, scale: 1.4 }) as unknown as [Fig, Fig, { bursts: { frame: number; x: number; y: number }[] }];
  const [A, B, sparks] = nodes;
  /** A fighter's blade in world coordinates at a frame: guard and tip. */
  const blade = (n: Fig, f: number) => {
    const sw = figureSwordAt({ look: n.look, actions: n.actions, facing: n.facing }, f)!, dir = n.facing === "left" ? -1 : 1;
    const t: [number, number] = [n.x + dir * sw.tsuba[0] * n.scale, n.y + sw.tsuba[1] * n.scale], a = (n.facing === "left" ? 180 - sw.a : sw.a) * Math.PI / 180, L = BLADE * 250 * n.scale;
    return { t, tip: [t[0] + Math.cos(a) * L, t[1] + Math.sin(a) * L] as [number, number] };
  };
  const nearest = (p: [number, number], q: [number, number], r: [number, number], s2: [number, number]) => {
    let best = Infinity;
    for (let i = 0; i <= 80; i++) for (let j = 0; j <= 80; j++) { const u = i / 80, v = j / 80; best = Math.min(best, Math.hypot(p[0] + (q[0] - p[0]) * u - r[0] - (s2[0] - r[0]) * v, p[1] + (q[1] - p[1]) * u - r[1] - (s2[1] - r[1]) * v)); }
    return best;
  };
  it("crosses the two blades exactly on every contact frame, sparks flying from the crossing", () => {
    expect(sparks.bursts.length).toBe(4);
    for (const b of sparks.bursts) {
      const a = blade(A, b.frame), d = blade(B, b.frame);
      expect(nearest(a.t, a.tip, d.t, d.tip), `frame ${b.frame}`).toBeLessThan(2);                 // the blades touch
      expect(nearest(a.t, a.tip, [b.x, b.y], [b.x, b.y]), `frame ${b.frame}`).toBeLessThan(2);    // at the spark
      expect(nearest(d.t, d.tip, [b.x, b.y], [b.x, b.y]), `frame ${b.frame}`).toBeLessThan(2);
      // A few frames before contact they have not met yet.
      const a0 = blade(A, b.frame - 8), d0 = blade(B, b.frame - 8);
      expect(nearest(a0.t, a0.tip, d0.t, d0.tip)).toBeGreaterThan(4);
    }
  });
  it("strikes home with the last cut: the defender's blade drops and he falls and stays down", () => {
    const hit = A.actions.find(a => a.type === "cut" && a.parried === false)!;
    expect(B.actions.some(a => a.type === "parry" && a.contact === hit.contact)).toBe(false);
    const lying = (f: number) => figurePose({ look: B.look, actions: B.actions, facing: "left" }, f, 0, 250).fall;
    expect(lying(hit.contact! - 1)).toBe(0);
    expect(lying(hit.contact! + 60)).toBe(1);
    expect(lying(hit.contact! + 200)).toBe(1);
    expect(swordAt(A.actions, hit.contact! + 200).held).toBe(false);                               // the victor has sheathed
    expect(inspectUkiyoeScene(scene({ durationFrames: 640, nodes: nodes as never }))).toEqual([]);
  });
});

describe("UKIYO1 oni fight", () => {
  type Fig = { x: number; y: number; scale: number; facing: "left" | "right"; look: never; actions: UkiyoeAction[] };
  const fight = oniFight({ id: "f", x: 760, y: 900, scale: 1.3 });
  const [oni, hero] = fight.nodes as unknown as [Fig, Fig];
  const sparks = (fight.nodes[2] as unknown as { bursts: { frame: number; x: number; y: number }[] }).bursts;
  /** A weapon in world coordinates: the grip (or guard) and the far end. */
  const weapon = (n: Fig, f: number, kind: "club" | "sword") => {
    const spec = { look: n.look, actions: n.actions, facing: n.facing };
    const w = kind === "club" ? figureClubAt(spec, f)! : figureSwordAt(spec, f)!, p = "grip" in w ? w.grip : w.tsuba, dir = n.facing === "left" ? -1 : 1, tr = travelAt(n.actions, f);
    const t: [number, number] = [n.x + dir * (p[0] + tr.x) * n.scale, n.y + (p[1] + tr.y) * n.scale], a = (n.facing === "left" ? 180 - w.a : w.a) * Math.PI / 180;
    const L = (kind === "club" ? CLUB * 300 : BLADE * 250) * n.scale;
    return { t, tip: [t[0] + Math.cos(a) * L, t[1] + Math.sin(a) * L] as [number, number] };
  };
  const near = (p: [number, number], q: [number, number], r: [number, number], s2: [number, number]) => {
    let best = Infinity;
    for (let i = 0; i <= 80; i++) for (let j = 0; j <= 80; j++) { const u = i / 80, v = j / 80; best = Math.min(best, Math.hypot(p[0] + (q[0] - p[0]) * u - r[0] - (s2[0] - r[0]) * v, p[1] + (q[1] - p[1]) * u - r[1] - (s2[1] - r[1]) * v)); }
    return best;
  };
  it("brings the smash's head down exactly on the ground, clear of the hero who sprang back", () => {
    for (const a of oni.actions.filter(x => x.type === "smash")) {
      const c = weapon(oni, a.contact!, "club"), heroFeet = hero.x + travelAt(hero.actions, a.contact!).x * hero.scale;
      expect(Math.abs(c.tip[1] - oni.y), `frame ${a.contact}`).toBeLessThan(1);
      expect(c.tip[0] - heroFeet, `frame ${a.contact}`).toBeGreaterThan(40);                   // lands in front of him
    }
  });
  it("meets blade and club exactly at the sparks, and the last cut reaches the oni", () => {
    expect(sparks.length).toBe(2);
    for (const b of sparks) {
      const c = weapon(oni, b.frame, "club"), s2 = weapon(hero, b.frame, "sword");
      expect(near(c.t, c.tip, s2.t, s2.tip), `frame ${b.frame}`).toBeLessThan(2);
      expect(near(s2.t, s2.tip, [b.x, b.y], [b.x, b.y])).toBeLessThan(2);
    }
    const fin = hero.actions.find(a => a.type === "cut" && a.parried === false)!, tip = weapon(hero, fin.contact!, "sword").tip;
    expect(Math.abs(tip[0] - oni.x)).toBeLessThan(.12 * 300 * oni.scale);                       // inside the oni's body
    expect(figurePose({ look: oni.look, actions: oni.actions, facing: "left" }, fin.contact! + 80, 0, 300).fall).toBe(1);
    expect(figureClubAt({ look: oni.look, actions: oni.actions, facing: "left" }, fin.contact! + 80)!.dropped).toBe(1);
    expect(inspectUkiyoeScene(scene({ durationFrames: 640, camera: { shake: fight.shake }, nodes: fight.nodes as never }))).toEqual([]);
  });
});

describe("UKIYO1 castle", () => {
  type P = { t: string; d?: string; fill?: unknown; color?: unknown; prims?: P[] };
  const flat = (ps: P[]): P[] => ps.flatMap(p => p.t === "group" || p.t === "clip" ? flat(p.prims ?? []) : [p]);
  const draw = (params: Record<string, unknown>) => flat(drawMotif("castle", { width: 900, ...params }, { frame: 0, wind: 0, seed: 7, progress: 1 }) as P[]);
  const shachi = (ps: P[]) => ps.filter(p => p.t === "fill" && p.fill === "kin" && (p.d!.match(/C/g) ?? []).length >= 5).length;
  it("draws the keep, walls, turrets, gate, moat and bridge, and its parameters change it", () => {
    const base = draw({});
    expect(JSON.stringify(draw({}))).toEqual(JSON.stringify(base));                                // deterministic
    expect(shachi(base)).toBe(2);                                                                     // a pair on the top ridge
    const roofs = (tiers: number) => draw({ tiers, walls: false }).filter(p => p.t === "line" && p.color === "sumi").length;
    expect(roofs(5)).toBeGreaterThan(roofs(3));                                                     // more tiers, more roofs
    expect(draw({ walls: false }).length).toBeLessThan(base.length / 2);                            // the keep alone
    expect(draw({ style: "black" }).some(p => p.t === "fill" && JSON.stringify(p.fill).includes("kogecha") && JSON.stringify(p.fill).includes("\"angle\":0"))).toBe(true);
    expect(draw({ night: 1 }).filter(p => p.t === "glow").length).toBeGreaterThan(20);              // lit windows
    expect(draw({ snow: 1 }).filter(p => p.t === "fill" && p.fill === "gofun").length).toBeGreaterThan(base.filter(p => p.t === "fill" && p.fill === "gofun").length);
    // Everything stands above the water line except the moat and the bridge in front.
    const ys = base.filter(p => p.t === "fill" && p.fill !== "gofun" && !/[hva]/.test(p.d!)).flatMap(p => p.d!.match(/-?\d+(\.\d+)?/g)!.map(Number).filter((_, i) => i % 2 === 1));
    expect(Math.max(...ys)).toBeLessThanOrEqual(900 * .1 + 1);
    // Long galleries on the walls by default (a dobei wall instead has loopholes), pines along the bailey, the walls
    // mirrored in the moat.
    const matsu = (ps: P[]) => ps.filter(p => p.t === "fill" && p.fill === "matsu").length;
    expect(matsu(base)).toBeGreaterThan(matsu(draw({ pines: 0 })));
    expect(draw({ wall: "dobei" }).length).not.toBe(base.length);
    expect(JSON.stringify(drawMotif("castle", { width: 900 }, { frame: 0, wind: 0, seed: 7, progress: 1 }))).toContain("scale(1 -0.62)");
    expect(inspectUkiyoeScene(scene({ nodes: [{ id: "c", kind: "motif", motif: "castle", params: { tiers: 4, style: "black" } }] }))).toEqual([]);
  });
});

describe("UKIYO1 castle town", () => {
  it("validates, draws its four town motifs, pans from the castle to the street, and keeps every walker off the canal", () => {
    const spec = castleTown();
    expect(inspectUkiyoeScene(spec)).toEqual([]);
    for (const m of ["shop", "kura", "yashiki", "firetower"] as const) expect(drawMotif(m, {}, { frame: 0, wind: .3, seed: 3, progress: 1 }).length, m).toBeGreaterThan(8);
    const cam = (f: number) => cameraAt(spec.camera, f, spec.width, spec.height).x;
    expect(cam(0)).toBeLessThan(1200);                                                            // starts at the castle
    expect(cam(spec.durationFrames - 1)).toBeGreaterThan(5000);                                 // ends in the merchant street
    // The canal's water runs between x 3680 and 4220; no walker may ever stand there.
    for (const n of spec.nodes.filter(x => x.kind === "crowd")) {
      const c = n as Extract<typeof n, { kind: "crowd" }>;
      // Expanded exactly as the renderer expands it (scene seed ^ node id); travel is in the figure's scaled frame.
      for (const m of expandCrowd({ ...c, frames: c.frames ?? spec.durationFrames }, (spec.seed ^ seedOf(c.id)) >>> 0)) for (let f = 0; f < spec.durationFrames; f += 15) {
        const x = (c.x ?? 0) + m.x + travelAt(m.actions, f).x * m.scale;
        expect(x < 3680 || x > 4220, `${m.id} at frame ${f}: x ${x.toFixed(0)}`).toBe(true);
      }
    }
    // No text in the scroll, so nothing for captions to collide with.
    expect(spec.nodes.some(n => n.kind === "text")).toBe(false);
  });
});

describe("UKIYO1 interiors", () => {
  const ctx = (frame = 0) => ({ frame, wind: 0, seed: 5, progress: 1 });
  it("builds four valid rooms, splits a room into back and front, and slides a panel open on its track", () => {
    for (const k of UKIYOE_INTERIOR_KINDS) {
      const spec = interiorScene(k);
      expect(inspectUkiyoeScene(spec), k).toEqual([]);
      // The room's back part is drawn first and its front part last, with every figure between them.
      const ids = spec.nodes.map(n => n.id), figs = spec.nodes.filter(n => n.kind === "figure").map(n => ids.indexOf(n.id));
      expect(Math.min(...figs), k).toBeGreaterThan(ids.indexOf("room"));
      expect(Math.max(...figs), k).toBeLessThan(ids.indexOf("room-front"));
      expect(renderToStaticMarkup(<UkiyoeScene spec={spec} frame={90} />).length, k).toBeGreaterThan(1000);
    }
    const back = JSON.stringify(drawMotif("room", { part: "back", eave: "thatch" }, ctx())), front = JSON.stringify(drawMotif("room", { part: "front", eave: "thatch" }, ctx()));
    expect(back).toContain("room-5");                                                            // the clipped interior
    expect(front).not.toContain("room-5");
    expect(front.length).toBeLessThan(back.length);
    // A fusuma bay sliding open: the right panel's painting moves left with it, by up to half the bay.
    const slide = { back: ["fusuma"], slide: [{ bay: 0, open: 1, start: 10, frames: 30 }] };
    const offset = (f: number) => Math.min(...[...JSON.stringify(drawMotif("room", { ...slide, side: "wall" }, ctx(f))).matchAll(/translate\((-?[\d.]+) 0\)/g)].map(m => Number(m[1])));
    expect(offset(0)).toBe(0);
    expect(offset(25)).toBeLessThan(0);
    expect(offset(40)).toBeLessThan(offset(25));
    expect(offset(80)).toBe(offset(40));
    // Torn shoji show the dark through burst cells; an untorn wall has none.
    const holes = (torn: number) => JSON.stringify(drawMotif("room", { back: ["shoji", "shoji"], torn }, ctx())).length;
    expect(holes(.8)).toBeGreaterThan(holes(0));
  });
  it("times the loom and the weaver together: one beat per pick, the shed flipping, the hand on the beater", () => {
    let beats = 0, prev = 0;
    for (let f = 0; f < UKIYOE_WEAVE_PERIOD * 4; f++) {
      const w = weaveBeat(f);
      expect(w.beat).toBeGreaterThanOrEqual(0); expect(w.beat).toBeLessThanOrEqual(1);
      expect(w.pass > 0 && w.beat > 0, `frame ${f}: the shuttle crosses only while the beater is back`).toBe(false);
      if (w.beat > .99 && prev <= .99) beats++;
      prev = w.beat;
    }
    expect(beats).toBe(4);
    expect(Math.sign(weaveBeat(2).shed)).toBe(-Math.sign(weaveBeat(UKIYOE_WEAVE_PERIOD + 2).shed));
    // The weaver's aim is the loom's grip, and the beat pulls it in by the loom's own swing.
    const spec = interiorScene("weaver"), loom = spec.nodes.find(n => n.id === "loom")!, weaver = spec.nodes.find(n => n.id === "weaver") as Extract<UkiyoeSceneSpec["nodes"][number], { kind: "figure" }>;
    const h = (loom as unknown as { params: { height: number } }).params.height, g = loomGrip(h), act = weaver.actions![0];
    expect((weaver.x ?? 0) + act.aim![0]).toBeCloseTo((loom.x ?? 0) + g[0], 3);
    expect((weaver.y ?? 0) + act.aim![1]).toBeCloseTo((loom.y ?? 0) + g[1], 3);
    expect(act.amount! / h).toBeCloseTo(LOOM_BEATER_PULL, 2);
  });
});

describe("UKIYO1 women ghosts", () => {
  it("keeps each woman human until her reveal, then changes her face in every view, and holds it", () => {
    expect(inspectUkiyoeScene(onnaScene("lineup"))).toEqual([]);
    expect(inspectUkiyoeScene(onnaScene("okiku"))).toEqual([]);
    const acts: UkiyoeAction[] = [{ type: "reveal", start: 30, end: 60, amount: 20 }];
    for (const k of Object.keys(UKIYOE_ONNA_LOOKS) as (keyof typeof UKIYOE_ONNA_LOOKS)[]) for (const view of ["profile", "three-quarter", "front", "back"] as const) {
      const look = { ...UKIYOE_ONNA_LOOKS[k], view } as Parameters<typeof drawFigure>[0]["look"];
      const at = (f: number) => JSON.stringify(drawFigure({ look, actions: acts, facing: "right" }, f, 0, 4).prims);
      expect(figurePose({ look, actions: acts }, 10, 4, 250).reveal, k).toBe(0);
      expect(figurePose({ look, actions: acts }, 90, 4, 250).reveal, k).toBe(1);                       // stays revealed after the action
      const changes = look.face && !(view === "back" && look.face !== "futakuchi") && !(look.face === "futakuchi" && view === "front");
      if (changes) expect(at(10) === at(52), `${k} ${view}`).toBe(false);
    }
    // The faceless woman loses every feature and the nose; a skull keeps a little of the outline's shape.
    expect(humanFeatures("noppera", 1)).toBe(0);
    expect(humanFeatures("kuchisake", 1)).toBe(1);
    const nose = (face: typeof UKIYOE_GHOST_FACES[number], r: number) => Math.max(...faceOutline(face, r, [[0, -20], [17, -1], [20.2, 4.2], [17.4, 10.8], [5, 19.5]], false).map(q => q[0]));
    expect(nose("noppera", 0)).toBeCloseTo(20.2);
    expect(nose("noppera", 1)).toBeLessThan(17);
  });
  it("raises Okiku out of the well on her coil of plates, between the well's two parts", () => {
    const spec = onnaScene("okiku"), ids = spec.nodes.map(n => n.id);
    expect(ids.indexOf("well-back")).toBeLessThan(ids.indexOf("okiku"));
    expect(ids.indexOf("okiku")).toBeLessThan(ids.indexOf("well-front"));
    const okiku = spec.nodes.find(n => n.id === "okiku") as Extract<UkiyoeSceneSpec["nodes"][number], { kind: "creature" }>;
    const plates = (f: number) => (JSON.stringify(drawCreature(okiku, f, 0, 3)).match(/rotate\(/g) ?? []).length;
    expect(plates(60)).toBeGreaterThan(0);
    expect(plates(200)).toBeGreaterThan(plates(60));
    expect(JSON.stringify(drawMotif("well", { part: "front" }, { frame: 0, wind: 0, seed: 1, progress: 1 }))).not.toContain("radial");   // the water is in the back part
    expect(JSON.stringify(drawMotif("well", { part: "back" }, { frame: 0, wind: 0, seed: 1, progress: 1 }))).toContain("radial");
  });
});

describe("UKIYO1 folk work", () => {
  it("swings each tool up slowly and down fast onto its contact point, with the block, field and mortar placed there", () => {
    for (const k of UKIYOE_FOLK_WORK) expect(inspectUkiyoeScene(folkScene(k)), k).toEqual([]);
    for (const action of ["chop", "hoe", "pound"] as const) {
      const acts: UkiyoeAction[] = [{ type: action, start: 0, end: 400 }], H = 250;
      let contacts = 0, maxUp = 0, maxDown = 0, prevA = toolAt(acts, 0)!.a;
      for (let f = 1; f < 200; f++) {
        const st = toolAt(acts, f)!;
        const step = st.a - prevA;
        if (step < 0) maxUp = Math.max(maxUp, -step); else maxDown = Math.max(maxDown, step);
        prevA = st.a;
        if (st.since === 0) {
          contacts++;
          // On the contact frame the head is exactly at toolContact.
          const L = { chop: .42, hoe: .6, pound: .5 }[action] * H, tip = [st.grip[0] * H + Math.cos(st.a * Math.PI / 180) * L, st.grip[1] * H + Math.sin(st.a * Math.PI / 180) * L], c = toolContact(action, H);
          expect(Math.hypot(tip[0] - c[0], tip[1] - c[1]), action).toBeLessThan(.5);
        }
      }
      expect(contacts, action).toBeGreaterThanOrEqual(3);
      expect(maxDown, `${action}: the drop is faster than the lift`).toBeGreaterThan(maxUp * 2);
    }
    // The chopping block's top and the mortar's rim sit at the tool's contact height.
    const wood = folkScene("woodcutter"), block = wood.nodes.find(n => n.id === "block") as unknown as { x: number; params: { size: number } }, man = wood.nodes.find(n => n.id === "worker")!;
    const c = toolContact("chop", 250 * (man.scale ?? 1));
    expect(block.x).toBeCloseTo((man.x ?? 0) + c[0], 3);
    expect(block.params.size * .45).toBeCloseTo(-c[1] * .9, 3);
  });
});

describe("UKIYO1 effects", () => {
  it("builds each effect scene, times bursts to their frames, and swaps the fox for the woman inside the smoke", () => {
    for (const k of UKIYOE_EFFECT_DEMOS) expect(inspectUkiyoeScene(effectScene(k)), k).toEqual([]);
    const at = (type: "smoke" | "lightning" | "ash", f: number) => drawParticles({ type, area: [0, 0, 1920, 1080], bursts: [{ frame: 50, x: 900, y: 600 }] }, f, .3, 5);
    for (const type of ["smoke", "lightning", "ash"] as const) {
      expect(at(type, 49), `${type} before its burst`).toEqual([]);
      expect(at(type, 52).length, `${type} at its burst`).toBeGreaterThan(0);
    }
    expect(at("lightning", 70)).toEqual([]);                              // a strike lasts a fraction of a second
    expect(drawParticles({ type: "foxfire", count: 5, area: [0, 0, 400, 100] }, 10, 0, 1).length).toBeGreaterThan(1);
    // Henge: the woman only appears after the puff has covered the spot, and the fox is gone by then.
    const h = effectScene("henge"), woman = h.nodes.find(n => n.id === "woman")!, puff = h.nodes.find(n => n.id === "puff") as Extract<UkiyoeSceneSpec["nodes"][number], { kind: "particles" }>;
    expect(woman.from!).toBeGreaterThan(puff.bursts![0].frame);
    const fox = h.nodes.find(n => n.id === "fox") as Extract<UkiyoeSceneSpec["nodes"][number], { kind: "creature" }>;
    expect(drawCreature(fox, woman.from!, 0, 1).prims.length).toBeLessThanOrEqual(1);              // only the puff is left
  });
});

describe("UKIYO1 kami", () => {
  it("draws every god in every view, flies the tennyo off the ground along her path, and streams her scarf out when flying", () => {
    for (const k of UKIYOE_KAMI_SCENES) expect(inspectUkiyoeScene(kamiScene(k)), k).toEqual([]);
    for (const k of Object.keys(UKIYOE_KAMI_LOOKS) as (keyof typeof UKIYOE_KAMI_LOOKS)[]) for (const view of ["profile", "three-quarter", "front", "back"] as const)
      expect(drawFigure({ look: { ...UKIYOE_KAMI_LOOKS[k], view } as Parameters<typeof drawFigure>[0]["look"] }, 10, 0, 2).prims.length, `${k} ${view}`).toBeGreaterThan(10);
    const acts: UkiyoeAction[] = [{ type: "fly", start: 0, end: 100, to: 600, toY: -200 }];
    const look = UKIYOE_KAMI_LOOKS.tennyo as unknown as Parameters<typeof drawFigure>[0]["look"];
    expect(figurePose({ look, actions: acts }, 50, 2, 250).lift).toBeGreaterThan(10);
    const mid = travelAt(acts, 50), end = travelAt(acts, 100);
    expect(mid.x).toBeGreaterThan(0); expect(end.x).toBeCloseTo(600, 0); expect(end.y).toBeCloseTo(-200, 0);
    // The scarf reaches further behind in flight than standing still.
    const reach = (a: UkiyoeAction[]) => Math.min(...[...JSON.stringify(drawFigure({ look: { ...look, robePattern: undefined }, actions: a }, 50, 0, 2).prims).matchAll(/M(-?[\d.]+) /g)].map(m => Number(m[1])));
    expect(reach(acts)).toBeLessThan(reach([]));
  });
});

describe("UKIYO1 warriors", () => {
  it("draws, holds and looses each arrow on its contact frame, and lands it on the target", () => {
    for (const k of UKIYOE_BUSHI_SCENES) expect(inspectUkiyoeScene(bushiScene(k)), k).toEqual([]);
    const spec = bushiScene("archer"), archer = spec.nodes.find(n => n.id === "archer") as Extract<UkiyoeSceneSpec["nodes"][number], { kind: "figure" }>, target = spec.nodes.find(n => n.id === "target") as unknown as { x: number; y: number; params: { height: number } };
    for (const a of archer.actions!) {
      const c = a.contact!, before = shootAt([a], c - 1, 250)!, after = shootAt([a], c, 250)!;
      expect(before.released).toBe(false); expect(before.draw).toBeGreaterThan(.95);         // fully drawn and held before the loose
      expect(after.released).toBe(true);
      expect(shootAt([a], c + 60, 250)!.flight).toBe(1);
      // The aim, in the scene, is on the target's centre (within its inner ring).
      const ax = (archer.x ?? 0) + a.aim![0] * (archer.scale ?? 1), ay = (archer.y ?? 0) + a.aim![1] * (archer.scale ?? 1);
      expect(Math.hypot(ax - target.x, ay - (target.y - target.params.height))).toBeLessThan(15);
    }
    // Armour draws in every view.
    for (const view of ["profile", "three-quarter", "front", "back"] as const)
      expect(JSON.stringify(drawFigure({ look: { armor: "beni", hat: "kabuto", view } }, 0, 0, 1).prims), view).toContain("shima");
  });
});

describe("UKIYO1 animals II", () => {
  it("draws every new animal moving (four-legged ones in all views), and each critter's motion changes over time", () => {
    for (const k of UKIYOE_ANIMAL_HABITATS) expect(inspectUkiyoeScene(animalScene(k)), k).toEqual([]);
    for (const sp of ["bear", "boar", "deer", "ox", "wolf", "mouse"] as const) for (const view of ["profile", "three-quarter", "front", "back"] as const)
      expect(drawCreature({ species: sp, look: { view }, actions: [{ type: "walk", start: 0, end: 100, to: 100 }] }, 30, 0, 1).prims.length, `${sp} ${view}`).toBeGreaterThan(5);
    for (const sp of ["hawk", "oshidori"] as const) expect(drawCreature({ species: sp, actions: [{ type: "fly", start: 0, end: 100, to: 100 }] }, 30, 0, 1).prims.length, sp).toBeGreaterThan(5);
    const motion: Record<string, string> = { crab: "walk", turtle: "float", snake: "walk", frog: "hop", carp: "float", octopus: "dance" };
    for (const sp of UKIYOE_CRITTERS) {
      const acts = [{ type: motion[sp], start: 0, end: 200, ...(motion[sp] === "dance" ? {} : { to: 150 }) }] as Parameters<typeof drawCreature>[0]["actions"];
      const a = JSON.stringify(drawCreature({ species: sp, actions: acts }, 20, 0, 1).prims), b = JSON.stringify(drawCreature({ species: sp, actions: acts }, 32, 0, 1).prims);
      expect(a.length, sp).toBeGreaterThan(200);
      expect(a === b, `${sp} moves between frames`).toBe(false);
    }
    // The coiled snake is more compact than the slithering one.
    const xs = (type: string) => { const nums = [...JSON.stringify(drawCreature({ species: "snake", actions: [{ type, start: 0, end: 100 }] as Parameters<typeof drawCreature>[0]["actions"] }, 80, 0, 1).prims).matchAll(/M(-?[\d.]+) /g)].map(m => Number(m[1])); return Math.max(...nums) - Math.min(...nums); };
    expect(xs("coil")).toBeLessThan(xs("walk"));
  });
});

describe("UKIYO1 temples", () => {
  it("builds each sacred place, and the belfry's log is drawn back before a strike, meets the bell on it, and the bell then sways", () => {
    for (const k of UKIYOE_TEMPLE_SCENES) expect(inspectUkiyoeScene(templeScene(k)), k).toEqual([]);
    for (const m of ["belfry", "hondo", "gate", "hokora", "graves", "toro", "hut"] as const) expect(drawMotif(m, {}, { frame: 0, wind: 0, seed: 3, progress: 1 }).length, m).toBeGreaterThan(3);
    const st = (f: number) => bellStrike([50], f);
    expect(st(10).pull).toBe(0);                                // at rest
    expect(st(42).pull).toBeGreaterThan(.95);                   // drawn fully back and held
    expect(st(50).pull).toBe(0);                                // meets the bell on the strike frame
    expect(st(49).pull).toBeLessThan(st(46).pull);              // swinging in, fastest at the end
    expect(st(40).sway).toBe(0);
    expect(Math.abs(st(60).sway)).toBeGreaterThan(.5);          // the bell sways after the hit
    expect(st(55).ring).toBe(5);
    // A ruined gate grows grass on its roofs; a lantern hangs only when it is not in ruin.
    expect(JSON.stringify(drawMotif("gate", { ruin: 1, lantern: true }, { frame: 0, wind: 0, seed: 3, progress: 1 }))).toContain("kusa");
  });
});

describe("UKIYO1 animal yokai", () => {
  it("builds each scene; the nekomata has two tails, towels and glowing eyes and carried keys draw, the whirlwind turns", () => {
    for (const k of UKIYOE_ANIMAL_YOKAI_SCENES) expect(inspectUkiyoeScene(animalYokaiScene(k)), k).toEqual([]);
    const len = (look: Record<string, unknown>, sp: "cat" | "fox" = "cat") => JSON.stringify(drawCreature({ species: sp, look, actions: [{ type: "sit", start: 0, end: 100 }] }, 30, 0, 1).prims).length;
    const tailKeys = (look: Record<string, unknown>) => (JSON.stringify(drawCreature({ species: "cat", look, actions: [{ type: "sit", start: 0, end: 100 }] }, 30, 0, 1).prims).match(/"key":"tail\d"/g) ?? []).length;
    expect(tailKeys({ tails: 2 })).toBe(2);
    expect(tailKeys({})).toBe(1);
    expect(len({ towel: "ai" })).toBeGreaterThan(len({}));
    expect(len({ glowEyes: true })).toBeGreaterThan(len({}));
    expect(len({ carry: "key" }, "fox")).toBeGreaterThan(len({}, "fox"));
    for (const sp of ["weasel", "baku", "ape"] as const) for (const view of ["profile", "front"] as const)
      expect(drawCreature({ species: sp, look: { view }, actions: [{ type: "walk", start: 0, end: 100, to: 80 }] }, 30, 0, 1).prims.length, `${sp} ${view}`).toBeGreaterThan(5);
    const w = (f: number) => JSON.stringify(drawParticles({ type: "whirlwind", area: [0, 0, 600, 600], count: 1 }, f, 0, 3));
    expect(w(10) === w(14)).toBe(false);
  });
});

describe("UKIYO1 trees", () => {
  it("builds each tree scene; the bamboo sways, the shining stalk glows, the face opens and the branches reach", () => {
    for (const k of UKIYOE_TREE_SCENES) expect(inspectUkiyoeScene(treeScene(k)), k).toEqual([]);
    const ctx = (frame: number, wind = 0) => ({ frame, wind, seed: 3, progress: 1 });
    const d = (m: Parameters<typeof drawMotif>[0], p: Record<string, unknown>, f = 0, w = 0) => JSON.stringify(drawMotif(m, p, ctx(f, w)));
    expect(d("bamboo", {}, 0) === d("bamboo", {}, 20)).toBe(false);
    expect(d("bamboo", { shine: 2 })).toContain("glow");
    expect(d("bamboo", {})).not.toContain("glow");
    expect(d("shinboku", { face: 1 }).length).toBeGreaterThan(d("shinboku", { face: 0 }).length);
    expect(d("shinboku", { reach: 1 }) === d("shinboku", { reach: 0 })).toBe(false);
    expect(d("kaki", { fruit: 1 }).length).toBeGreaterThan(d("kaki", { fruit: 0 }).length);
  });
});

describe("UKIYO1 heian court", () => {
  it("draws the court looks in every view, the cart's wheels turn with its travel, the lady sits between the palace's parts and the blinds rise", () => {
    for (const k of UKIYOE_HEIAN_SCENES) expect(inspectUkiyoeScene(heianScene(k)), k).toEqual([]);
    for (const k of Object.keys(UKIYOE_HEIAN_LOOKS) as (keyof typeof UKIYOE_HEIAN_LOOKS)[]) for (const view of ["profile", "three-quarter", "front", "back"] as const)
      expect(drawFigure({ look: { ...UKIYOE_HEIAN_LOOKS[k], view } as Parameters<typeof drawFigure>[0]["look"] }, 10, 0, 2).prims.length, `${k} ${view}`).toBeGreaterThan(10);
    const cart = (progress: number) => JSON.stringify(drawMotif("gissha", { travel: 600 }, { frame: 0, wind: 0, seed: 1, progress }));
    expect(cart(0) === cart(.3)).toBe(false);
    const v = heianScene("veranda"), ids = v.nodes.map(n => n.id);
    expect(ids.indexOf("palace")).toBeLessThan(ids.indexOf("lady"));
    expect(ids.indexOf("lady")).toBeLessThan(ids.indexOf("palace-front"));
    const blindHeight = (progress: number) => JSON.stringify(drawMotif("shinden", { part: "front", up: 0, rise: 1 }, { frame: 0, wind: 0, seed: 1, progress })).length;
    expect(blindHeight(0) === blindHeight(1)).toBe(false);
  });
});

describe("UKIYO1 folk yokai", () => {
  it("draws the folk yokai looks in every view, flings sand only from the contact frame, and the akaname licks", () => {
    for (const k of UKIYOE_FOLK_YOKAI_SCENES) expect(inspectUkiyoeScene(folkYokaiScene(k)), k).toEqual([]);
    for (const k of Object.keys(UKIYOE_FOLK_YOKAI_LOOKS) as (keyof typeof UKIYOE_FOLK_YOKAI_LOOKS)[]) for (const view of ["profile", "three-quarter", "front", "back"] as const)
      expect(drawFigure({ look: { ...UKIYOE_FOLK_YOKAI_LOOKS[k], view } as Parameters<typeof drawFigure>[0]["look"] }, 10, 0, 2).prims.length, `${k} ${view}`).toBeGreaterThan(10);
    const look = UKIYOE_FOLK_YOKAI_LOOKS.sunakakebaba as unknown as Parameters<typeof drawFigure>[0]["look"], acts: UkiyoeAction[] = [{ type: "throw", start: 0, end: 60, contact: 30 }];
    const sand = (f: number) => JSON.stringify(drawFigure({ look, actions: acts }, f, 0, 2).prims).includes('"color":"kincha","opacity"');
    expect(sand(29)).toBe(false);
    expect(sand(35)).toBe(true);
    expect(sand(80)).toBe(false);
    const ak = (f: number) => JSON.stringify(drawCreature({ species: "akaname", actions: [{ type: "stand", start: 0, end: 100 }] }, f, 0, 1).prims);
    expect(ak(2) === ak(12)).toBe(false);
  });
});

describe("UKIYO1 giants", () => {
  it("builds each giant scene; each giant moves, the skeleton and sea monk rise out of the ground and the sea", () => {
    for (const k of UKIYOE_GIANT_SCENES) expect(inspectUkiyoeScene(giantScene(k)), k).toEqual([]);
    for (const g of UKIYOE_GIANTS) {
      const d = (f: number) => JSON.stringify(drawCreature({ species: g, actions: [{ type: "roar", start: 0, end: 300 }] }, f, 0, 1).prims);
      expect(d(10).length, g).toBeGreaterThan(500);
      expect(d(10) === d(25), `${g} moves`).toBe(false);
    }
    // Rising: halfway through `appear` the top of the giant is lower than when fully risen.
    for (const g of ["gashadokuro", "umibozu"] as const) {
      const top = (f: number) => Math.min(...[...JSON.stringify(drawCreature({ species: g, look: { size: 600 }, actions: [{ type: "appear", start: 0, end: 300 }] }, f, 0, 1).prims).matchAll(/[ML]-?[\d.]+ (-?[\d.]+)/g)].map(m => Number(m[1])));
      expect(top(60), g).toBeGreaterThan(top(295));
    }
  });
});

describe("UKIYO1 tsukumogami", () => {
  it("builds each scene; the wheel's spokes turn with distance, shoji open eyes, the kimono puts out hands, the kettle turns back", () => {
    for (const k of UKIYOE_TSUKUMO_SCENES) expect(inspectUkiyoeScene(tsukumoScene(k)), k).toEqual([]);
    for (const t of UKIYOE_TSUKUMO) expect(drawCreature({ species: t, actions: [{ type: "walk", start: 0, end: 100, to: 300 }] }, 30, 0, 1).prims.length, t).toBeGreaterThan(3);
    // Rolling: the same frame-independent distance gives the same spokes; more distance turns them.
    const wheel = (f: number) => JSON.stringify(drawCreature({ species: "wanyudo", actions: [{ type: "walk", start: 0, end: 100, to: -600 }] }, f, 0, 1).prims).match(/"stroke","d":"(M[^"]+)","color":"sumi","width":[\d.]+\}/g)?.[1];
    expect(wheel(20) === wheel(40)).toBe(false);
    const room = (eyes: number) => JSON.stringify(drawMotif("room", { back: ["shoji"], eyes }, { frame: 0, wind: 0, seed: 1, progress: 1 })).length;
    expect(room(1)).toBeGreaterThan(room(0));
    const rack = (hands: number) => JSON.stringify(drawMotif("ikou", { hands }, { frame: 0, wind: 0, seed: 1, progress: 1 })).length;
    expect(rack(1)).toBeGreaterThan(rack(0));
    const kettle = (f: number) => JSON.stringify(drawCreature({ species: "chagama", actions: [{ type: "transform", start: 0, end: 40 }] }, f, 0, 1).prims).includes("kogecha");
    expect(kettle(5)).toBe(true);
    expect(kettle(35)).toBe(false);
  });
});

describe("UKIYO1 realms", () => {
  it("builds each realm; the camera follows the rider below the waves, the magpies fill the bridge, the boulder rolls", () => {
    for (const k of UKIYOE_REALM_SCENES) expect(inspectUkiyoeScene(realmScene(k)), k).toEqual([]);
    const r = realmScene("ryugu"), cam = (f: number) => cameraAt(r.camera, f, r.width, r.height).y;
    expect(cam(0)).toBeLessThan(1000);                           // starting above the sea surface (y 1000)
    expect(cam(r.durationFrames - 1)).toBeGreaterThan(1400);     // ending down by the palace
    const birds = (progress: number) => (JSON.stringify(drawMotif("magpies", {}, { frame: 0, wind: 0, seed: 1, progress })).match(/translate\(/g) ?? []).length;
    expect(birds(0)).toBe(0); expect(birds(.5)).toBeGreaterThan(0); expect(birds(1)).toBeGreaterThan(birds(.5));
    const cave = (progress: number) => JSON.stringify(drawMotif("iwato", { opens: 1 }, { frame: 0, wind: 0, seed: 1, progress }));
    expect(cave(0)).not.toContain("glow");
    expect(cave(1)).toContain("glow");
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

describe("UKIYO1 parades", () => {
  it("builds each parade; the line keeps its order and gaps, and the palanquin rides between its bearers", () => {
    for (const k of UKIYOE_PARADE_SCENES) expect(inspectUkiyoeScene(paradeScene(k)), k).toEqual([]);
    const s = paradeScene("foxwedding"), node = (id: string) => s.nodes.find(n => n.id === id) as any;
    const at = (id: string, f: number) => { const n = node(id); return n.kind === "motif" ? nodeState(n, f, s.cadence ?? 1).pose.x : n.x + travelAt(n.actions, f).x; };
    for (const f of [0, 120, 240, s.durationFrames - 1]) {
      const b0 = at("bearer0", f), b1 = at("bearer1", f), k = at("kago", f);
      expect(k, `kago at ${f}`).toBeGreaterThan(b0 + 60); expect(k).toBeLessThan(b1 - 60);
      expect(at("lantern2", f)).toBeLessThan(b0); expect(at("bride", f)).toBeGreaterThan(b1);
    }
    const fox = JSON.stringify(drawFigure({ look: { animal: "fox", robe: "gofun" } } as any, 0, 0, 1).prims);
    expect(fox).toContain("tan");
  });
});

describe("UKIYO1 episode template", () => {
  it("compiles Kasa Jizō for YouTube and Shorts with captions sized per output, an .srt, and a clean script check", () => {
    expect(inspectUkiyoeEpisode(KASA_JIZO_EPISODE)).toEqual([]);
    const doc = ukiyoeEpisode(KASA_JIZO_EPISODE);
    // The checked-in example is this episode, compiled (regenerate it when the episode changes).
    expect(JSON.parse(readFileSync("examples/film/ukiyoe-kasa-jizo.film.json", "utf8"))).toEqual(JSON.parse(JSON.stringify(doc)));
    for (const output of ["landscape", "portrait"]) {
      const c = compileFilm(doc, { outputId: output });
      expect(c.ok, output).toBe(true);
      if (c.ok) expect(c.film.captions?.style?.size).toBe(output === "landscape" ? "2.6cqw" : "3.9cqw");
    }
    const srt = ukiyoeEpisodeSrt(KASA_JIZO_EPISODE);
    expect(srt.startsWith("1\n00:00:01,667 --> ")).toBe(true);
    expect(srt.split("\n\n").length).toBe(doc.captions!.cues.length);
    // A caption too long for two lines on 9:16, and scene text inside the caption band, are both caught before rendering.
    expect(ukiyoeCaptionLines("All they had were five straw hats they had woven, and a little rice, and nothing more.", "portrait")).toBeGreaterThan(2);
    const bad = { ...KASA_JIZO_EPISODE, shots: [ukiyoeTitleCard({ title: "T", backdrop: a => ({ ...KASA_JIZO_EPISODE.shots[0].build(a), nodes: [{ id: "low", kind: "text", style: "plain", text: "Low", x: 400, y: a === "portrait" ? 1500 : 900, size: 40 }] }) as never,
      narration: [{ text: "A line.", from: 10, to: 80 }] }), KASA_JIZO_EPISODE.shots[5]] };
    expect(inspectUkiyoeEpisode(bad).some(i => i.message.includes("caption band"))).toBe(true);
  });

  it("puts each hat on its jizō as the key runs, and rejects a caption size that is not a CSS length", () => {
    const jizo = (progress: number) => JSON.stringify(drawMotif("jizo", { kasa: true, kasaDrop: true }, { frame: 0, wind: 0, seed: 1, progress }));
    expect(jizo(0)).not.toBe(jizo(1));
    expect(jizo(1)).toContain("translate(0 0.0)");
    for (const m of ["kasa", "tawara", "sori"] as const) expect(drawMotif(m, {}, { frame: 0, wind: 0, seed: 1, progress: 0 }).length).toBeGreaterThan(0);
    const doc = ukiyoeEpisode(KASA_JIZO_EPISODE) as unknown as { captions: { style: { size: unknown } } };
    doc.captions.style.size = { landscape: "huge", portrait: "3cqw" };
    const c = compileFilm(doc, { outputId: "landscape" });
    expect(c.diagnostics.some(d => d.code === "caption-style-size")).toBe(true);
  });
});

describe("UKIYO1 Urashima Tarō", () => {
  it("passes the script check, matches its example, and hides the ageing under the box's thickest smoke", () => {
    expect(inspectUkiyoeEpisode(URASHIMA_EPISODE)).toEqual([]);
    expect(JSON.parse(readFileSync("examples/film/ukiyoe-urashima-taro.film.json", "utf8"))).toEqual(JSON.parse(JSON.stringify(ukiyoeEpisode(URASHIMA_EPISODE))));
    // The smoke is up and at full strength where the young figure hands over to the old one, and gone by the end.
    const plume = (u: number) => JSON.stringify(tamatebakoSmoke([0, 0], 50, 300, u, 1));
    expect(plume(0)).toBe("[]");
    expect(plume(TAMATEBAKO_THICKEST)).toContain('"opacity":1');
    expect(plume(1)).toContain('"opacity":0');
    const box = URASHIMA_EPISODE.shots.find(s => s.id === "box")!.build("landscape");
    const young = box.nodes.find(n => n.id === "taro")!, old = box.nodes.find(n => n.id === "taro-old")!;
    expect(young.to).toBe(old.from);
    // The box is drawn in hands and on the ground, and the dragon crown in both views.
    for (const view of ["profile", "front"]) expect(JSON.stringify(drawFigure({ look: { hat: "dragon", view, prop: "tamatebako" } } as never, 0, 0, 1).prims)).toContain("kin");
  });
});

describe("UKIYO1 Momotarō", () => {
  it("passes the script check, matches its example, and draws the banner, dumplings, treasure and cart", () => {
    expect(inspectUkiyoeEpisode(MOMOTARO_EPISODE)).toEqual([]);
    expect(JSON.parse(readFileSync("examples/film/ukiyoe-momotaro.film.json", "utf8"))).toEqual(JSON.parse(JSON.stringify(ukiyoeEpisode(MOMOTARO_EPISODE))));
    for (const prop of ["nobori", "dango"]) expect(drawFigure({ look: { prop } } as never, 0, 0, 1).prims.length).toBeGreaterThan(drawFigure({ look: {} } as never, 0, 0, 1).prims.length);
    expect(drawMotif("takara", {}, { frame: 0, wind: 0, seed: 1, progress: 0 }).length).toBeGreaterThan(5);
    // The cart's wheels turn with its keyed travel.
    const cart = (progress: number) => JSON.stringify(drawMotif("kuruma", { travel: 500 }, { frame: 0, wind: 0, seed: 1, progress }));
    expect(cart(0)).not.toBe(cart(.5));
  });
});

describe("UKIYO1 Kaguya-hime", () => {
  it("passes the script check, matches its example, and lets the girl rise in the cut stalk", () => {
    expect(inspectUkiyoeEpisode(KAGUYA_EPISODE)).toEqual([]);
    expect(JSON.parse(readFileSync("examples/film/ukiyoe-kaguya-hime.film.json", "utf8"))).toEqual(JSON.parse(JSON.stringify(ukiyoeEpisode(KAGUYA_EPISODE))));
    const stalk = (progress: number) => JSON.stringify(drawMotif("takegiri", { rises: 1 }, { frame: 0, wind: 0, seed: 1, progress }));
    expect(stalk(0)).not.toContain("takegiri-girl");
    expect(stalk(1)).toContain("takegiri-girl");
  });
});

describe("UKIYO1 faces", () => {
  it("draws expressions, keeps one face per character across views and props, and gives different looks different faces", () => {
    const head = (look: object, actions: unknown[] = []) => JSON.stringify(drawFigure({ look, actions } as never, 20, 0, 3).prims.find(p => p.t === "group" && /scale\(/.test(p.transform ?? "")));
    const woman = { hair: "shimada", robe: "beni" };
    const calm = head(woman);
    for (const mood of ["smile", "laugh", "sad", "cry", "surprise", "angry", "fear", "shy"]) expect(head(woman, [{ type: "emote", mood, start: 0, end: 100, blend: 1 }]), mood).not.toBe(calm);
    // Same identity, different prop: the same face traits.
    const a = faceTraits({ ...woman, prop: "umbrella", view: "front" } as object, true), b = faceTraits(woman, true);
    expect(a).toEqual(b);
    // Twelve different townsmen: the trait sets are not all the same.
    const men = ["ai", "cha", "kusa", "beni", "murasaki", "kogecha", "sora", "ki", "sumi", "matsu", "tan", "usuzumi"].map(robe => JSON.stringify(faceTraits({ hair: "chonmage", robe } as object, false)));
    expect(new Set(men).size).toBeGreaterThan(6);
    // Women are powdered white unless the look gives a skin.
    expect(JSON.stringify(drawFigure({ look: woman } as never, 0, 0, 1).prims)).toContain('"fill":"gofun"');
  });
});

describe("UKIYO1 wardrobe", () => {
  it("dresses every role for every season, deterministically and with variety; hems, knots and new patterns draw", () => {
    for (const season of UKIYOE_SEASONS) for (const role of UKIYOE_ROLES_LIST) expect(ukiyoeWardrobe(role, 3, season)).toEqual(ukiyoeWardrobe(role, 3, season));
    const maidens = Array.from({ length: 16 }, (_, i) => JSON.stringify(ukiyoeWardrobe("maiden", i * 13, "spring")));
    expect(new Set(maidens).size).toBeGreaterThan(12);
    expect(maidens.some(m => m.includes('"hem"'))).toBe(true);
    const fig = (look: object) => JSON.stringify(drawFigure({ look } as never, 10, 0, 3).prims);
    const woman = { hair: "shimada", robe: "sora" };
    expect(fig({ ...woman, hem: { type: "ayame", color: "ai", scale: 1 } })).toContain('"key":"hem"');
    const knots = ["taiko", "tateya", "bunko", "kichiya"].map(obiKnot => fig({ ...woman, obiKnot }));
    expect(new Set(knots).size).toBe(4);
    for (const type of ["koshi", "tachiwaki", "kiku", "ume", "momiji", "shippo", "kasuri", "hishi", "sayagata", "kumo", "ayame"]) {
      const html = renderToStaticMarkup(<UkiyoeScene spec={{ version: 1, id: "p", width: 100, height: 100, durationFrames: 2, seed: 1, nodes: [{ id: "b", kind: "block", x: 50, y: 50, shape: { type: "rect", width: 100, height: 100 }, fill: "ai", pattern: { type, color: "gofun" } }] } as never} frame={0} />);
      expect(html, type).toContain("<pattern");
    }
  });
});

describe("UKIYO1 follow-through and idle life", () => {
  it("lets the arm overshoot and settle after a gesture, leaves contact actions exact, half-closes the lids and glances", () => {
    const woman = { look: { hair: "shimada" as const, robe: "beni" }, actions: [{ type: "wave" as const, start: 10, end: 40 }] };
    const rest = figurePose(woman, 80, 3, 262).shF;
    const after = Array.from({ length: 20 }, (_, i) => settledPose(woman, 41 + i, 3, 262).shF);
    expect(Math.min(...after)).toBeLessThan(rest - 3);                    // swings past the rest pose
    expect(Math.abs(settledPose(woman, 80, 3, 262).shF - rest)).toBeLessThan(.5); // and settles
    const fighter = { look: { hair: "chonmage" as const }, actions: [{ type: "cut" as const, start: 10, end: 60, contact: 30, aim: [100, -200] as [number, number] }] };
    for (const f of [20, 30, 45]) expect(settledPose(fighter, f, 3, 250)).toEqual(figurePose(fighter, f, 3, 250));
    const blinks = new Set(Array.from({ length: 400 }, (_, f) => figurePose({ look: {} }, f, 7, 250).blink));
    expect([...blinks].some(b => b > 0 && b < 1)).toBe(true);
    const gazes = new Set(Array.from({ length: 600 }, (_, f) => Math.round(figurePose({ look: {} }, f, 7, 250).gaze * 10)));
    expect(gazes.size).toBeGreaterThan(2);
  });
});

describe("UKIYO1 print-quality effects", () => {
  it("draws Hiroshige's long rain with a veil and splashes, snow in three depths, and hooked flame tongues", () => {
    const rain = drawParticles({ type: "rain", count: 90, ground: 900 }, 30, 0, 3);
    const lens = (rain.find(p => p.t === "stroke") as { d: string }).d.split("M").filter(Boolean).map(seg => { const n = seg.match(/-?\d+(\.\d+)?/g)!.map(Number); return Math.hypot(n[2], n[3]); });
    expect(Math.min(...lens)).toBeGreaterThan(1080 * .3);                    // lines cross much of the sky
    expect(JSON.stringify(rain)).toContain('"noPrint":true');                // the darkening veil
    expect(rain.filter(p => p.t === "stroke").length).toBe(4);               // three rain blocks and the splashes
    expect(drawParticles({ type: "rain", count: 90, style: "short" }, 30, 0, 3).filter(p => p.t === "stroke").length).toBe(2);
    const snow = drawParticles({ type: "snow", count: 200 }, 30, 0, 3).filter(p => p.t === "dots");
    expect(snow.length).toBe(3);
    const fire = (f: number) => JSON.stringify(drawMotif("fire", {}, { frame: f, wind: 0, seed: 2, progress: 0 }));
    expect(fire(10)).not.toBe(fire(14));                                     // the flames flicker
  });
});

describe("UKIYO1 transitions", () => {
  it("draws scroll, ink and print transitions that start on the outgoing shot and end on the incoming, and episodes use them", () => {
    const a = KASA_JIZO_EPISODE.shots[2].build("landscape"), b = KASA_JIZO_EPISODE.shots[3].build("landscape");
    for (const C of [UkiyoeScrollRoll, UkiyoeInkBleed, UkiyoePrintIn]) {
      const html = (p: number) => renderToStaticMarkup(<C outgoing={a} incoming={b} outgoingFrame={300} incomingFrame={60} progress={p} />);
      expect(html(.5)).not.toBe(html(.2));
      expect(html(.5).length).toBeGreaterThan(1000);
    }
    const doc = ukiyoeEpisode(KASA_JIZO_EPISODE) as unknown as { scenes: { content: { slot: string; props: { kind?: string } } }[] };
    expect(doc.scenes.map(s => s.content.props.kind).filter(Boolean)).toEqual(["scroll", "ink"]);
  });
});

describe("UKIYO1 sound", () => {
  const jizo = KASA_JIZO_EPISODE.shots.find(shot => shot.id === "jizo")!, scene = jizo.build("landscape");
  const oldman = scene.nodes.find(n => n.id === "oldman")!;
  const spec = oldman.kind === "figure" ? { look: oldman.look, actions: oldman.actions, facing: oldman.facing } : undefined!;
  it("puts a step where the forward foot is furthest out, on the drawing that shows it", () => {
    const steps = figureMoments(spec, "step", { cadence: 2 }), walk = spec.actions![0], cycle = gaitCycle(spec, walk);
    expect(steps.length).toBeGreaterThan(10);
    expect(steps.every(f => f % 2 === 0)).toBe(true);
    // Each step is the first drawing past a quarter or three quarters of a stride.
    for (const f of steps.filter(f => f <= walk.end)) {
      const phase = travelAt(spec.actions!, f).dist / cycle, before = travelAt(spec.actions!, f - 2).dist / cycle;
      expect(Math.floor((phase - .25) / .5)).toBeGreaterThan(Math.floor((before - .25) / .5));
    }
  });
  it("pans each sound to its source on screen and sets its distance from the source's size", () => {
    const cues = ukiyoeShotCues("jizo", scene, [{ sound: ["a", "b"], at: { node: "oldman", on: "step" } }], 30);
    const first = cues[0], last = cues[cues.length - 1];
    // He walks in from the right and on to the left; steps land on their start, take turns and vary a little in level.
    expect(first.pan!).toBeGreaterThan(last.pan!);
    expect(cues.every(c => c.align === "start" && c.at === "jizo/start" && Math.abs(c.pan ?? 0) <= .7 && (c.distance ?? 0) >= 1.5)).toBe(true);
    expect(new Set(cues.map(c => c.sound))).toEqual(new Set(["catalog:a", "catalog:b"]));
    expect(cues.slice(1).every((c, i) => c.sound !== cues[i].sound)).toBe(true);
    expect(ukiyoeNodeOnScreen(scene, "oldman", 470)).toBeUndefined();
  });
  it("lands blows on the fight's own contact frames", () => {
    const battle = MOMOTARO_EPISODE.shots.find(shot => shot.id === "battle")!.build("landscape"), oni = battle.nodes.find(n => n.id === "fight-oni")!;
    const contacts = oni.kind === "figure" ? figureMoments({ look: oni.look, actions: oni.actions }, "contact", { type: "smash", cadence: 2 }) : [];
    const doc = ukiyoeEpisode(MOMOTARO_EPISODE), cues = doc.audio!.cues!.filter(c => c.sound.startsWith("catalog:thud-club") && c.at === "battle/start");
    expect(cues.map(c => c.offsetFrames! + 36).slice(0, contacts.length)).toEqual(contacts);
  });
  it("names only recorded catalog sounds, with the kit the cues need", () => {
    const catalog = JSON.parse(readFileSync("assets/sound/catalog.json", "utf8")) as { sounds: { id: string; origin: string; tags: string[] }[] };
    const byId = new Map(catalog.sounds.map(s => [s.id, s]));
    for (const ep of [KASA_JIZO_EPISODE, URASHIMA_EPISODE, MOMOTARO_EPISODE, KAGUYA_EPISODE]) {
      const doc = ukiyoeEpisode(ep), audio = doc.audio!;
      expect(audio.accents?.kit).toBe("assets/sfx");
      for (const cue of audio.cues ?? []) expect(byId.get(cue.sound.replace("catalog:", ""))?.origin, cue.id).toBe("recorded");
      for (const bed of audio.beds ?? []) expect(byId.get(bed.sound)?.tags, bed.id).toContain("loop");
    }
  });
});
