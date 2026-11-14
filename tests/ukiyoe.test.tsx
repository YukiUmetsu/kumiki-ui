import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { cameraAt, carvedLine, ease, loopOffsets, scrollPan, windAt } from "../registry/video/ukiyoe/ukiyoe-core";
import { creatureTravel, drawCreature, UKIYOE_CREATURE_ACTIONS, UKIYOE_SPECIES } from "../registry/video/ukiyoe/ukiyoe-creatures";
import { drawFigure, facingAt, figurePose, travelAt } from "../registry/video/ukiyoe/ukiyoe-figure";
import { drawMotif, UKIYOE_MOTIFS, WAVE_STATS, waveSurface } from "../registry/video/ukiyoe/ukiyoe-motifs";
import { drawParticles } from "../registry/video/ukiyoe/ukiyoe-particles";
import { palette, resolvePaint } from "../registry/video/ukiyoe/ukiyoe-pigments";
import { nodeState, UkiyoeScene } from "../registry/video/ukiyoe/ukiyoe-react";
import type { UkiyoeSceneSpec } from "../registry/video/ukiyoe/ukiyoe-scene";
import { inspectUkiyoeScene } from "../registry/video/ukiyoe/ukiyoe-scene";
import { kasumiBand } from "../registry/video/ukiyoe/ukiyoe-transitions";
import { compileFilm } from "../registry/video/film-document";
import { CAST, NIGHT_FERRY_SHOTS } from "../src/video/ukiyoe-night-ferry";
import { FOLKTALE_KASUMI, FOLKTALE_SHOTS } from "../src/video/ukiyoe-folktale";
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
  it("meets the great-wave checklist: forward-down branching claws, spread out, curved thin stripes on thick navy", () => {
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
    expect(med(gaps) / S.stripes[0].width).toBeGreaterThanOrEqual(2);
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
      if (type !== "transform") expect(a.prims.length, species + "/" + type).toBeGreaterThan(3);
    }
    expect(creatureTravel([{ type: "fly", start: 0, end: 40, to: -300, toY: -50 }], 40)).toMatchObject({ x: -300, y: -50, dir: -1 });
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
    for (const shot of FOLKTALE_SHOTS) for (const aspect of ["landscape", "portrait"] as const) expect(inspectUkiyoeScene(shot.build(aspect)), shot.id).toEqual([]);
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
  });
  it("surges a poled hull on each stroke and fades loops in and out", () => {
    expect(loopOffsets({ kind: "surge", period: 44, amplitude: 1 }, 11, 0).x).toBeCloseTo(10, 3);
    expect(loopOffsets({ kind: "rock", period: 40, start: 100, fade: 20 }, 100, 0).y).toBeCloseTo(0, 6);
    expect(ease("inQuad", .5)).toBe(.25);
    expect(ease("outQuad", .5)).toBe(.75);
  });
});
