import { describe, expect, it } from "vitest";
import { SHODO_GLYPHS, inspectShodoGlyph, parseKanjiVgSvg, shodoJoinStrokes, shodoKaishoForm } from "../registry/video/shodo/shodo-glyphs";
import type { ShodoGlyph } from "../registry/video/shodo/shodo-glyphs";
import { loadShodoGlyph, shodoTeacherFor } from "../registry/video/shodo/shodo-glyph-source";
import { shodoKankaRulesFor, shodoLayout, shodoStructure } from "../registry/video/shodo/shodo-structure";
import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { planShodoWriting, shodoBrushPose, shodoRestLean, shodoStrokeNumberBox, shodoStrokeNumbers } from "../registry/video/shodo/shodo-hand";
import { shodoFerruleHeight } from "../registry/video/shodo/shodo-brush";
import { ShodoInkSurface } from "../registry/video/shodo/shodo-ink";
import { DEFAULT_SHODO_STYLE, inspectShodoStyle, resolveShodoStyle } from "../registry/video/shodo/shodo-style";
import { SHODO_BASICS, auditShodoTechniques } from "../registry/video/shodo/shodo-techniques";
import { fillKanjiCardContent, readKanjiCardExport, resolveKanjiCardContent } from "../src/video/shodo-demos";
import { ShodoKanjiCard, ShodoKanjiInfoCard } from "../registry/video/shodo/shodo-kanji-card";
import {
  KANJI_WORD_EASE, kanjiCardGeometry, kanjiCardPhaseAt, kanjiCardSafeInset, kanjiCardStrokeTimes, kanjiCardTimeline, kanjiCardTypedAt, kanjiCardWriting,
  parseWordHighlights, spreadWordHighlights, wordHighlightAt,
} from "../registry/video/shodo/shodo-kanji-card-plan";
import { readKanjiCardDataset } from "../src/video/shodo-studio";

const ei = () => planShodoWriting({ items: [{ glyph: SHODO_GLYPHS["永"], x: 20, y: 20, size: 360 }], style: DEFAULT_SHODO_STYLE });

describe("SHO1 shodō calligraphy", () => {
  it("rejects out-of-range style values with their paths", () => {
    const bad = resolveShodoStyle({ hand: { speed: 9 }, technique: { haneLength: -1 }, ink: { color: "red" } });
    expect(inspectShodoStyle(bad).map(i => i.path)).toEqual(expect.arrayContaining(["/hand/speed", "/technique/haneLength", "/ink/color"]));
    expect(inspectShodoStyle(DEFAULT_SHODO_STYLE)).toEqual([]);
  });

  it("plans the same writing for the same input", () => {
    const a = ei(), b = ei();
    expect(a.duration).toBe(b.duration);
    expect(a.strokes.map(s => s.samples.length)).toEqual(b.strokes.map(s => s.samples.length));
    expect(a.strokes[2].samples[40]).toEqual(b.strokes[2].samples[40]);
  });

  it("writes every basic technique with the shape it should leave", () => {
    const items = SHODO_BASICS.map((basic, i) => ({
      glyph: { char: "・", source: "original" as const, strokes: [basic.demo] },
      x: (i % 5) * 220, y: Math.floor(i / 5) * 300, size: 220,
    }));
    const plan = planShodoWriting({ items, style: resolveShodoStyle({ brush: { diameter: 118 } }) });
    const { checks, failures } = auditShodoTechniques(new ShodoInkSurface(plan, { x: 0, y: 0, width: 1100, height: 600, scale: 1 }));
    expect(checks.length).toBeGreaterThanOrEqual(SHODO_BASICS.length);
    expect(failures).toEqual([]);
  });

  it("leaves a stroke that crosses an earlier line standing free, and still closes a near join", () => {
    // 青's top vertical and 艹's verticals start above the horizontal they cross.
    const glyph = (start: number): ShodoGlyph => ({ char: "・", source: "kanjivg", strokes: [
      { kind: "horizontal", points: [[200, 300], [800, 300]] },
      { kind: "vertical", points: [[500, start], [500, 700]] },
    ] });
    const crossing = shodoJoinStrokes(glyph(250)).strokes[1];
    expect(crossing.points[0]).toEqual([500, 250]);
    expect(crossing.joinStart).toBeUndefined();
    // A start a little past the line (KanjiVG's overlap at a join) or short of it still joins.
    for (const start of [285, 330]) {
      const joined = shodoJoinStrokes(glyph(start)).strokes[1];
      expect(joined.joinStart).toBe(true);
      expect(joined.points[0][1]).toBe(300);
    }
  });

  it("writes a KanjiVG dot that falls steeply to the left as a short ノ, and a dot to the right as a dot", () => {
    const formed = shodoKaishoForm({ char: "点", source: "kanjivg", strokes: [
      { kind: "dot", points: [[500, 200], [440, 300]] },
      { kind: "dot", points: [[500, 500], [560, 600]] },
    ] });
    expect(formed.strokes.map(s => s.kind)).toEqual(["left-sweep", "dot"]);
    // A teacher's dots stay dots: they were fitted to the teacher's ink as dots.
    const taught = shodoKaishoForm({ char: "点", source: "teacher", strokes: [{ kind: "dot", points: [[500, 200], [440, 300]] }] });
    expect(taught.strokes[0].kind).toBe("dot");
  });

  it("keeps a 右払い's foot and flat point when its points are spaced evenly (a traced form)", () => {
    const demo = SHODO_BASICS.find(b => b.id === "migi-harai")!.demo;
    const P = demo.points, seg = P.slice(1).map((p, i) => Math.hypot(p[0] - P[i][0], p[1] - P[i][1]));
    const total = seg.reduce((a, b) => a + b, 0);
    const even = Array.from({ length: 9 }, (_, k) => {
      let d = total * k / 8, i = 0;
      while (i < seg.length - 1 && d > seg[i]) d -= seg[i++];
      const t = d / seg[i];
      return [Math.round(P[i][0] + (P[i + 1][0] - P[i][0]) * t), Math.round(P[i][1] + (P[i + 1][1] - P[i][1]) * t)] as const;
    });
    const plan = planShodoWriting({
      items: [{ glyph: { char: "・", source: "original", strokes: [{ ...demo, points: even }] }, x: 0, y: 0, size: 220 }],
      style: resolveShodoStyle({ brush: { diameter: 118 } }),
    });
    const { checks, failures } = auditShodoTechniques(new ShodoInkSurface(plan, { x: 0, y: 0, width: 220, height: 220, scale: 1 }));
    expect(checks.map(c => c.check.technique)).toEqual(expect.arrayContaining(["foot", "harai"]));
    expect(failures).toEqual([]);
  });

  it("deposits ink exactly where the brush touches, and nowhere ahead of it", () => {
    const plan = ei();
    const surface = new ShodoInkSurface(plan, { x: 0, y: 0, width: 400, height: 400, scale: 1 });
    const stroke = plan.strokes[1];
    const mid = stroke.samples[Math.floor(stroke.samples.length * .5)];
    const pose = shodoBrushPose(plan, mid.t);
    expect(pose.contact).toBe(true);
    expect(surface.coverageAt(mid.t + .02, pose.x, pose.y)).toBeGreaterThan(.5);
    const ahead = stroke.samples[Math.floor(stroke.samples.length * .85)];
    expect(surface.coverageAt(mid.t, ahead.x, ahead.y)).toBe(0);
  });

  it("builds the ink ahead of the brush in slices, with the same image as in one go", () => {
    const plan = ei();
    const whole = new ShodoInkSurface(plan, { x: 0, y: 0, width: 400, height: 400, scale: .5 });
    const sliced = new ShodoInkSurface(plan, { x: 0, y: 0, width: 400, height: 400, scale: .5 });
    // A deadline already past: every call stamps a few samples, then stops.
    let calls = 0;
    while (!sliced.prepare(0)) calls++;
    expect(calls).toBeGreaterThan(plan.strokes.length);
    for (const t of [plan.strokes[2].t0 + .1, plan.duration]) {
      expect(Array.from(sliced.render(t).rgba)).toEqual(Array.from(whole.render(t).rgba));
    }
  });

  it("renders the same frame however it is reached", () => {
    const plan = ei(), t = plan.strokes[3].t0 + .1;
    const seeking = new ShodoInkSurface(plan, { x: 0, y: 0, width: 400, height: 400, scale: .5 });
    seeking.render(plan.duration); seeking.render(.2);
    const fresh = new ShodoInkSurface(plan, { x: 0, y: 0, width: 400, height: 400, scale: .5 });
    expect(Array.from(seeking.render(t).rgba)).toEqual(Array.from(fresh.render(t).rgba));
  });

  it("reads KanjiVG-style stroke classes into techniques", () => {
    const svg = `<svg viewBox="0 0 109 109"><g kvg:element="十">
      <path kvg:type="㇐" d="M15,54 C40,53 70,52 94,51"/>
      <path kvg:type="㇚" d="M54,12 C55,40 55,70 54,92 C50,90 46,87 42,85"/></g></svg>`;
    const glyph = parseKanjiVgSvg(svg);
    expect(glyph.char).toBe("十");
    expect(glyph.source).toBe("kanjivg");
    expect(glyph.strokes.map(s => s.kind)).toEqual(["horizontal", "vertical"]);
    expect(glyph.strokes[1].end).toBe("hane");
    expect(glyph.strokes[1].hook?.[0]).toBeLessThan(0);
  });

  it("gives a typeface skeleton kaisho habits without breaking joints", () => {
    const glyph: ShodoGlyph = { char: "中", source: "kanjivg", strokes: [
      { kind: "vertical", points: [[200, 300], [200, 700]] },
      { kind: "turn", turns: [1], points: [[200, 300], [800, 300], [800, 700]] },
      { kind: "horizontal", points: [[200, 700], [800, 700]] },
      { kind: "vertical", points: [[500, 100], [500, 950]] },
    ] };
    const formed = shodoKaishoForm(glyph, { rise: 4 });
    const top = formed.strokes[1].points;
    expect(top[1][1]).toBeLessThan(top[0][1]);                      // 右上がり: the right end rises
    expect(formed.strokes[0].points[0]).toEqual(top[0]);            // the corner joint stays closed
    expect(formed.strokes[3].end).toBe("nuki");                     // a hanging final vertical is 懸針
    expect(formed.strokes[3].weight).toBeGreaterThan(formed.strokes[0].weight!);
  });

  it("trims KanjiVG entry curls and writes kana as flowing curves", () => {
    const kana = parseKanjiVgSvg(`<svg viewBox="0 0 109 109"><g kvg:element="の">
      <path d="M50,30 C40,60 25,80 20,70 C15,55 30,30 60,32 C85,35 92,60 80,78 C72,88 60,92 52,93"/></g></svg>`);
    expect(kana.strokes[0]).toMatchObject({ kind: "curve", start: "roho", end: "nuki" });
    expect(kana.strokes[0].turns).toBeUndefined();
    // The ゜ of ぱ is a closed ring, not a dot: untrimmed, light, and still round.
    const pa = parseKanjiVgSvg(`<svg viewBox="0 0 109 109"><g kvg:element="ぱ">
      <path d="M80,20 C74,20 70,15 70,10 C70,4 75,1 80,1 C85,1 90,4 90,10 C90,16 85,20 80,20"/></g></svg>`);
    const ring = pa.strokes[0];
    expect(ring).toMatchObject({ kind: "curve", weight: .75 });
    const xs = ring.points.map(p => p[0]), ys = ring.points.map(p => p[1]);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(150);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(150);
  });

  it("loads any character through one pinned source and caches it", async () => {
    let calls = 0;
    const fetcher = async (url: string) => {
      calls++;
      expect(url).toContain("/kanjivg/r20260714/kanji/05341.svg");
      return { ok: true, status: 200, text: async () => `<svg viewBox="0 0 109 109"><g kvg:element="十">
        <path kvg:type="㇐" d="M15,54 C40,53 70,52 94,51"/><path kvg:type="㇑" d="M54,12 C55,40 55,70 54,96"/></g></svg>` };
    };
    const a = await loadShodoGlyph("十", { fetcher, preferBundled: false });
    const b = await loadShodoGlyph("十", { fetcher, preferBundled: false });
    expect(a).toBe(b);
    expect(calls).toBe(1);
    expect(a.source).toBe("kanjivg");
    expect(await loadShodoGlyph("永")).toBe(SHODO_GLYPHS["永"]);
  });

  it("gives a stroke its own pace without changing its path or the other strokes", () => {
    const glyph = SHODO_GLYPHS["二"];
    const plan = (g: ShodoGlyph) => planShodoWriting({ items: [{ glyph: g, x: 20, y: 20, size: 360 }], style: DEFAULT_SHODO_STYLE }).strokes;
    const base = plan(glyph);
    const paced = plan({ ...glyph, strokes: glyph.strokes.map((st, i) => i === 1 ? { ...st, pace: 2 } : st) });
    const time = (st: { t0: number; t1: number }) => st.t1 - st.t0;
    expect(time(paced[0])).toBeCloseTo(time(base[0]), 6);               // the first stroke is untouched
    expect(time(paced[1])).toBeCloseTo(time(base[1]) / 2, 2);           // twice as fast
    const end = (st: typeof base[number]) => st.samples[st.samples.length - 1];
    expect(Math.hypot(end(paced[1]).x - end(base[1]).x, end(paced[1]).y - end(base[1]).y)).toBeLessThan(1);
  });

  it("lets one stroke carry its own head and stop settings, within the style's ranges", () => {
    const glyph = SHODO_GLYPHS["一"];
    const stroke = (g: ShodoGlyph) => planShodoWriting({ items: [{ glyph: g, x: 20, y: 20, size: 360 }], style: DEFAULT_SHODO_STYLE }).strokes[0];
    const own = (technique: Record<string, number>): ShodoGlyph => ({ ...glyph, strokes: [{ ...glyph.strokes[0], technique }] });
    const stopPress = (st: ReturnType<typeof stroke>) => Math.max(...st.samples.filter(s => s.technique === "tome").map(s => s.p));
    expect(stopPress(stroke(own({ tomePress: 1 })))).toBeGreaterThan(stopPress(stroke(glyph)) * 1.2);
    expect(inspectShodoGlyph(own({ tomePress: 2 })).map(i => i.path)).toEqual(["/strokes/0/technique/tomePress"]);
    expect(inspectShodoGlyph(own({ nope: 1 })).map(i => i.path)).toEqual(["/strokes/0/technique/nope"]);
  });

  it("follows a stroke's own press profile along its centreline", () => {
    const glyph = SHODO_GLYPHS["一"];
    const st = glyph.strokes[0];
    const stroke = (g: ShodoGlyph) => planShodoWriting({ items: [{ glyph: g, x: 20, y: 20, size: 360 }], style: DEFAULT_SHODO_STYLE }).strokes[0];
    const swell = { ...glyph, strokes: [{ ...st, press: [1, 1.5, 1] }] };
    // Mean contact width of the travel samples in a stretch of the stroke (fractions of its arc).
    const width = (s: ReturnType<typeof stroke>, a: number, b: number) => {
      const end = Math.max(...s.samples.map(x => x.arc));
      const mid = s.samples.filter(x => x.p > 0 && x.arc >= a * end && x.arc <= b * end);
      return mid.reduce((sum, x) => sum + x.width, 0) / mid.length;
    };
    expect(width(stroke(swell), .4, .6)).toBeGreaterThan(width(stroke(glyph), .4, .6) * 1.15);
    expect(width(stroke(swell), .05, .15)).toBeLessThan(width(stroke(glyph), .05, .15) * 1.15);
    expect(inspectShodoGlyph({ ...glyph, strokes: [{ ...st, press: [1, 1] }] }).map(i => i.path)).toEqual(["/strokes/0/press"]);
    expect(inspectShodoGlyph({ ...glyph, strokes: [{ ...st, press: [1, 2, 1] }] }).map(i => i.path)).toEqual(["/strokes/0/press"]);
  });

  it("lifts the brush through a かな loop (結び) so the counter stays open, and only there", () => {
    // A curve that comes down, goes once around a small loop, crosses its own path and leaves.
    const ring = Array.from({ length: 14 }, (_, i) => {
      const a = -Math.PI / 2 + i * 2 * Math.PI * 1.06 / 13;
      return [Math.round(500 + 90 * Math.cos(a)), Math.round(560 + 90 * Math.sin(a))] as const;
    });
    const loop: ShodoGlyph = { char: "る", source: "original", strokes: [
      { kind: "curve", start: "roho", end: "nuki", points: [[500, 230], ...ring, [700, 330], [800, 280]] }] };
    const bowl: ShodoGlyph = { char: "し", source: "original", strokes: [
      { kind: "curve", start: "roho", end: "nuki", points: [[380, 150], [380, 600], [460, 800], [620, 760], [760, 620]] }] };
    const lift = (g: ShodoGlyph, musubiLift: number): ShodoGlyph =>
      ({ ...g, strokes: g.strokes.map(st => ({ ...st, technique: { musubiLift } })) });
    const plan = (g: ShodoGlyph) => planShodoWriting({ items: [{ glyph: g, x: 20, y: 20, size: 360 }], style: DEFAULT_SHODO_STYLE });
    const press = (g: ShodoGlyph) => plan(g).strokes[0].samples.map(s => s.p);
    const heavy = press(lift(loop, 0)), light = press(lift(loop, .6));
    expect(light.length).toBe(heavy.length);
    // Before the loop the brush is the same; inside it the press drops.
    expect(light.slice(0, Math.floor(light.length * .15))).toEqual(heavy.slice(0, Math.floor(heavy.length * .15)));
    const mid = (v: number[]) => Math.min(...v.slice(Math.floor(v.length * .4), Math.floor(v.length * .6)));
    expect(mid(light)).toBeLessThan(mid(heavy) * .75);
    // The counter opens: much less ink on a disc around the loop's centre.
    const counterInk = (g: ShodoGlyph) => {
      const p = plan(g);
      const { rgba } = new ShodoInkSurface(p, { x: 0, y: 0, width: 400, height: 400, scale: 1 }).render(p.duration);
      const cx = 20 + 500 * .36, cy = 20 + 560 * .36, r = 90 * .36 * .6;
      let ink = 0, n = 0;
      for (let y = Math.ceil(cy - r); y <= cy + r; y++) for (let x = Math.ceil(cx - r); x <= cx + r; x++) {
        if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) continue;
        ink += rgba[(y * 400 + x) * 4 + 3] / 255; n++;
      }
      return ink / n;
    };
    expect(counterInk(lift(loop, .6))).toBeLessThan(counterInk(lift(loop, 0)) * .5);
    // A curve without a loop is written the same whatever the setting.
    expect(press(lift(bowl, .9))).toEqual(press(lift(bowl, 0)));
    expect(inspectShodoGlyph(lift(loop, 1.5)).map(i => i.path)).toEqual(["/strokes/0/technique/musubiLift"]);
  });

  it("writes a teacher's own form when the teacher has the character, and the rules elsewhere", async () => {
    const taught: ShodoGlyph = { char: "永", source: "teacher", strokes: [{ kind: "horizontal", points: [[120, 520], [880, 470]] }] };
    expect(shodoKaishoForm(taught)).toBe(taught);                       // already the teacher's shape
    const teacher = { id: "t", label: "Teacher", glyphs: { 永: taught } };
    let calls = 0;
    const fetcher = async () => { calls++; return { ok: false, status: 404, text: async () => "" }; };
    expect(await loadShodoGlyph("永", { teacher, fetcher })).toBe(taught);  // before bundled and KanjiVG
    expect(calls).toBe(0);
    await expect(loadShodoGlyph("道", { teacher, fetcher, preferBundled: false })).rejects.toThrow(/KanjiVG 404/);
    expect(calls).toBe(1);
    // Several teachers: the first one that has the character writes it.
    const other: ShodoGlyph = { ...taught, strokes: [{ kind: "horizontal", points: [[100, 500], [900, 500]] }] };
    const second = { id: "u", label: "Second", glyphs: { 永: other, 道: other } };
    expect(await loadShodoGlyph("永", { teacher: [teacher, second], fetcher })).toBe(taught);
    expect(await loadShodoGlyph("道", { teacher: [teacher, second], fetcher })).toBe(other);
    expect(shodoTeacherFor("道", [teacher, second])).toBe(second);
    expect(shodoTeacherFor("山", [teacher, second])).toBeNull();
    expect(calls).toBe(1);
  });

  it("moves the brush like the side-view studies: it stands up to press, leans into travel and lifts clear", () => {
    const style = DEFAULT_SHODO_STYLE;
    const plan = planShodoWriting({ items: [{ glyph: SHODO_GLYPHS["一"], x: 20, y: 20, size: 400 }], style });
    const stroke = plan.strokes[0], L = plan.brush.tuftLength;
    const rest = Math.hypot(...shodoRestLean(style));
    const pressed = stroke.samples.filter(s => s.p > .25);
    const meanLean = pressed.reduce((a, s) => a + Math.hypot(s.lx, s.ly), 0) / pressed.length;
    expect(meanLean).toBeLessThan(rest * .9);                        // 筆を立てる while pressing
    const travel = stroke.samples.filter(s => s.phase === "sohitsu" && s.speed > 1);
    const restX = shodoRestLean(style)[0];
    expect(travel.reduce((a, s) => a + s.lx, 0) / travel.length).toBeGreaterThan(restX * .6); // top leans toward +x travel
    const deepest = stroke.samples.reduce((a, s) => s.p > a.p ? s : a);
    const height = (t: number) => shodoFerruleHeight(shodoBrushPose(plan, t), style.brush, plan.brush.diameter);
    // Just before touching, the tuft is straight along the leaning handle; pressed, it folds.
    expect(height(stroke.t0 - .05)).toBeGreaterThan(.95 * L * Math.cos(rest * Math.PI / 180));
    expect(height(deepest.t)).toBeLessThan(.75 * height(stroke.t0 - .05));
  });

  it("changes lean and height smoothly from frame to frame", () => {
    const plan = ei(), L = plan.brush.tuftLength;
    let prev = shodoBrushPose(plan, 0), worstLean = 0, worstHeight = 0;
    let prevH = shodoFerruleHeight(prev, plan.style.brush, plan.brush.diameter);
    for (let f = 1; f <= Math.ceil(plan.duration * 30); f++) {
      const p = shodoBrushPose(plan, f / 30), h = shodoFerruleHeight(p, plan.style.brush, plan.brush.diameter);
      worstLean = Math.max(worstLean, Math.hypot(p.leanX - prev.leanX, p.leanY - prev.leanY));
      worstHeight = Math.max(worstHeight, Math.abs(h - prevH));
      prev = p; prevH = h;
    }
    expect(worstLean).toBeLessThan(9);
    expect(worstHeight).toBeLessThan(.3 * L);
  });

  it("moves the tip smoothly at 30 fps: an early start, eased arcs, no step to full speed, no snap at a lift", () => {
    for (const char of ["永", "道"]) {
      const plan = planShodoWriting({ items: [{ glyph: SHODO_GLYPHS[char], x: 20, y: 20, size: 360 }], style: DEFAULT_SHODO_STYLE });
      const D = plan.brush.diameter;
      const P = Array.from({ length: Math.ceil(plan.duration * 30) + 1 }, (_, f) => shodoBrushPose(plan, f / 30));
      const step = (a: typeof P[0], b: typeof P[0]) => Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
      let airAcc = 0, bendStep = 0, jumps = 0;
      for (let f = 2; f < P.length; f++) {
        const [a, b, c] = [P[f - 2], P[f - 1], P[f]];
        const acc = Math.hypot(c.x - 2 * b.x + a.x, c.y - 2 * b.y + a.y, c.z - 2 * b.z + a.z);
        if (!(a.contact && b.contact && c.contact)) airAcc = Math.max(airAcc, acc);
        bendStep = Math.max(bendStep, Math.abs(c.bend - b.bend));
        if (step(a, b) < .5 && step(b, c) > 8) jumps++;                  // standstill, then full speed
      }
      // moves within 10 frames (the owner's pacing rule: 6 to 10); 9 at the teacher's pace, 0.32
      expect(P.findIndex((p, f) => f > 0 && step(P[f - 1], p) > .5)).toBeLessThanOrEqual(10);
      expect(airAcc, char).toBeLessThan(.4 * D);                         // was .52–.59 D before the eased arcs
      expect(bendStep, char).toBeLessThan(.25);                          // was .35 when the spring-back snapped
      expect(jumps, char).toBe(0);
    }
  });

  it("reads KanjiVG components, merging a part split around another one", () => {
    const glyph = parseKanjiVgSvg(`<svg viewBox="0 0 109 109"><g kvg:element="回">
      <g kvg:element="囗" kvg:part="1" kvg:position="kamae"><path d="M20,20 L20,90"/><path d="M20,20 L90,20 L90,90"/></g>
      <g kvg:element="口"><path d="M40,40 L40,70"/><path d="M40,40 L70,40 L70,70"/><path d="M40,70 L70,70"/></g>
      <g kvg:element="囗" kvg:part="2" kvg:position="kamae"><path d="M20,90 L90,90"/></g></g></svg>`);
    const kids = glyph.parts!.children;
    expect(kids.map(k => [k.element, k.position, k.strokes])).toEqual([["囗", "kamae", [0, 1, 5]], ["口", undefined, [2, 3, 4]]]);
    expect(shodoLayout(glyph)).toBe("enclosure");
  });

  it("turns a kanji 右払い's pull-out flatter at the foot (footTurn), as the teacher writes it", () => {
    const glyph: ShodoGlyph = { char: "乀", source: "kanjivg", strokes: [
      { kind: "right-sweep", points: [[300, 300], [600, 650], [700, 720]] },            // pull-out 35° below the horizontal
    ] };
    const pullOut = (g: ShodoGlyph) => {
      const P = g.strokes[0].points, [f, t] = [P[P.length - 2], P[P.length - 1]];
      return Math.atan2(t[1] - f[1], t[0] - f[0]) * 180 / Math.PI;
    };
    const plain = pullOut(shodoKaishoForm(glyph, { footTurn: 0 })), turned = pullOut(shodoKaishoForm(glyph));
    expect(plain - turned).toBeGreaterThan(10);                                         // 12° by default
    expect(turned).toBeGreaterThan(0);                                                  // never above the horizontal
    // 辶's sweep: its last segment is the whole tail, not a pull-out, and keeps its course.
    const nyo: ShodoGlyph = { char: "乀", source: "kanjivg", strokes: [{ kind: "right-sweep", points: [[130, 730], [250, 710], [810, 830]] }] };
    expect(Math.abs(pullOut(shodoKaishoForm(nyo)) - pullOut(shodoKaishoForm(nyo, { footTurn: 0 })))).toBeLessThan(1);
  });

  it("writes a kanji 右払い heavier than its length alone gives (rightSweepWeight)", () => {
    const glyph: ShodoGlyph = { char: "乀", source: "kanjivg", strokes: [
      { kind: "horizontal", points: [[200, 300], [800, 300]] },
      { kind: "right-sweep", points: [[300, 400], [600, 700], [760, 780]] },
    ] };
    const weight = (g: ShodoGlyph) => g.strokes[1].weight ?? 1;
    expect(weight(shodoKaishoForm(glyph)) / weight(shodoKaishoForm(glyph, { rightSweepWeight: 1 }))).toBeCloseTo(1.3, 1);
    expect(shodoKaishoForm(glyph).strokes[0].weight).toBe(shodoKaishoForm(glyph, { rightSweepWeight: 1 }).strokes[0].weight);
  });

  it("cuts a KanjiVG entry curl at its length, not at the next sparse sample (用 keeps its corner)", () => {
    // 用's first two strokes from KanjiVG: the ㇒ opens with a pen curl, then one long cubic whose
    // first sample (t = .1) lies 150 em down the stroke.
    const glyph = parseKanjiVgSvg(`<svg viewBox="0 0 109 109"><g kvg:element="用">
      <path d="M25.44,16.14c0.83,1.04,1.1,2.36,1.15,3.86C28.12,65.5,24.5,82,13.75,95"/>
      <path d="M27.8,18.84C43.75,17,71.5,14,81.92,13.47c4.07-0.21,5.75,2.03,5.75,5.18c0,6.1-0.32,50.35-0.32,71.37c0,14.98-8.09,2.23-9.84,1.34"/></g></svg>`);
    const [sweep, frame] = glyph.strokes.map(s => s.points[0]);
    expect(sweep[1]).toBeLessThan(215);                      // KanjiVG starts it at 148 em; the curl is about 50 em
    expect(Math.hypot(sweep[0] - frame[0], sweep[1] - frame[1])).toBeLessThan(60);
  });

  it("does not pull a stroke of 旁 into 偏: joins across parts only where the ends already meet", () => {
    const glyph = parseKanjiVgSvg(`<svg viewBox="0 0 109 109"><g kvg:element="仁">
      <g kvg:element="亻" kvg:position="left"><path d="M30,20 L30,90"/></g>
      <g kvg:element="二" kvg:position="right"><path d="M35,40 L90,40"/><path d="M50,80 L90,80"/></g></g></svg>`);
    const formed = shodoKaishoForm(glyph);
    const vertical = formed.strokes[0].points[0][0], start = formed.strokes[1].points[0][0];
    expect(start - vertical).toBeGreaterThan(25);           // about 46 em apart in KanjiVG; not snapped
    expect(formed.strokes[1].joinStart).toBeFalsy();
  });

  it("applies the 間架結構 rules: taller 冠/脚, 左短右長 for 偏/旁, originals untouched", () => {
    const stack: ShodoGlyph = { char: "旦", source: "kanjivg", strokes: [
      { kind: "horizontal", points: [[300, 200], [700, 200]] }, { kind: "horizontal", points: [[300, 450], [700, 450]] },
      { kind: "horizontal", points: [[150, 800], [850, 800]] },
    ], parts: { strokes: [0, 1, 2], children: [{ position: "top", strokes: [0, 1], children: [] }, { position: "bottom", strokes: [2], children: [] }] } };
    const out = shodoStructure(stack);
    const width = (g: ShodoGlyph, i: number) => g.strokes[i].points[1][0] - g.strokes[i].points[0][0];
    expect(width(out, 2)).toBeLessThan(width(stack, 2) * .9);          // narrower overall and in the 脚
    expect(shodoKankaRulesFor(stack)).toEqual(["jougeNoMa", "gaikei"]);
    expect(out.strokes[2].points[0][1]).toBe(800);                      // the base line stays
    // 左短右長: a 偏/旁 character keeps its widths, and the left part's foot ends higher.
    const pair: ShodoGlyph = { char: "明", source: "kanjivg", strokes: [
      { kind: "vertical", points: [[250, 250], [250, 800]] }, { kind: "vertical", points: [[500, 150], [500, 900]] },
      { kind: "vertical", points: [[850, 150], [850, 900]] },
    ], parts: { strokes: [0, 1, 2], children: [
      { position: "left", strokes: [0], children: [] }, { position: "right", strokes: [1, 2], children: [] }] } };
    const paired = shodoStructure(pair);
    expect(paired.strokes[0].points[1][1]).toBeLessThan(800);           // the left foot rises
    expect(paired.strokes[0].points[0]).toEqual([250, 250]);            // its top stays
    expect(paired.strokes.slice(1)).toEqual(pair.strokes.slice(1));     // the right part and all widths stay
    expect(shodoKaishoForm(SHODO_GLYPHS["永"]).strokes[0].points).toEqual(shodoKaishoForm(SHODO_GLYPHS["永"], { structure: false }).strokes[0].points);
    expect(shodoKaishoForm(stack, { structure: false }).strokes[2].points[0][0]).toBeLessThan(shodoKaishoForm(stack).strokes[2].points[0][0]);
  });

  it("numbers each stroke nearest to its own start, and off the ink where a clear place is near", () => {
    const sheet = { x: 0, y: 0, width: 880, height: 720 };
    // 道 and 永 have crowded starts: the corner of 自, the centre of 永.
    for (const char of ["道", "永"]) {
      const plan = planShodoWriting({ items: [{ glyph: SHODO_GLYPHS[char], x: 170, y: 95, size: 540 }], style: DEFAULT_SHODO_STYLE });
      const numbers = shodoStrokeNumbers(plan, { bounds: sheet });
      const real = plan.strokes.filter(s => s.kind !== "link");
      expect(numbers.map(n => n.number)).toEqual(real.map((_, i) => i + 1));
      const starts = real.map(s => [s.samples[0].x, s.samples[0].y]);
      const D = plan.brush.diameter;
      for (const n of numbers) {
        const [hw, hh] = shodoStrokeNumberBox(String(n.number).length, n.size);
        expect(n.size).toBeLessThan(D * .5);                                          // small text
        expect(n.t0).toBe(plan.strokes[n.stroke].t0);                                 // shows when the brush lands
        const d = starts.map(([x, y]) => Math.hypot(n.x - x, n.y - y));
        expect(d.indexOf(Math.min(...d)), char + " " + n.number).toBe(n.number - 1);  // nearest start is its own
        expect(n.x - hw).toBeGreaterThan(sheet.x); expect(n.y + hh).toBeLessThan(sheet.y + sheet.height);
        if (!n.onInk) for (const s of plan.strokes) for (const c of s.samples) {     // off all ink, also later ink
          const ex = Math.max(Math.abs(c.x - n.x) - hw, 0), ey = Math.max(Math.abs(c.y - n.y) - hh, 0);
          expect(Math.hypot(ex, ey)).toBeGreaterThan(Math.max(c.width, c.length) / 2);
        }
        for (const m of numbers) if (m !== n) expect(Math.abs(m.x - n.x) > hw * 2 || Math.abs(m.y - n.y) > hh * 2).toBe(true);
      }
      // The first stroke of 自 starts under 一: its number sits on the ink at that start.
      if (char === "道") expect(numbers.find(n => n.number === 4)?.onInk).toBe(true);
    }
    const plan = planShodoWriting({ items: [{ glyph: SHODO_GLYPHS["道"], x: 170, y: 95, size: 540 }], style: DEFAULT_SHODO_STYLE });
    expect(shodoStrokeNumbers(plan, { only: [12] }).map(n => n.number)).toEqual([12]);
  });

  it("times the kanji card in three phases and shows a JLPT badge only for a given level", () => {
    const t = kanjiCardTimeline(10, { write: 6, review: 8, info: 4 }, 30);
    expect([t.write, t.review, t.info, t.frames]).toEqual([[0, 180], [180, 420], [420, 540], 540]);
    expect(kanjiCardPhaseAt(t, 200)).toEqual({ phase: "review", local: 20, length: 240 });
    expect(kanjiCardTimeline(10, { write: 0 }, 30).review).toEqual([0, 300]);        // a 0 s phase is skipped
    // Sample data belongs to 道 only; nothing is invented for another character.
    expect(resolveKanjiCardContent("道", {}).jlpt).toBe("N4");
    expect(resolveKanjiCardContent("道", { jlpt: null }).jlpt).toBeNull();
    expect(resolveKanjiCardContent("道", {}).vermilionStrokes).toBeUndefined();         // all black unless asked
    expect(Object.values(resolveKanjiCardContent("山", {})).every(v => v === undefined)).toBe(true);
    const { unmount } = render(createElement(ShodoKanjiInfoCard, { char: "山", meanings: "MOUNTAIN" }));
    expect(screen.queryByText(/JLPT/)).toBeNull();
    unmount();
    render(createElement(ShodoKanjiInfoCard, { char: "山", meanings: "MOUNTAIN", jlpt: "N5" }));
    expect(screen.getByText("JLPT N5")).toBeInTheDocument();
  });

  it("highlights one useful word at a time, eased in and out, the later cue first, and nothing outside the cues", () => {
    const E = KANJI_WORD_EASE;
    const cues = [{ word: 0, at: 1 }, { word: 1, at: 2, hold: 1 }, { word: 2, at: 2.5 }, { word: 7, at: 1.5 }];
    const at = (t: number) => wordHighlightAt(cues, t, { count: 3 });
    expect(at(.99)).toEqual({ word: null, strength: 0 });                    // before the first cue
    expect(at(1 + E / 2).word).toBe(0);                                       // easing in
    expect(at(1 + E / 2).strength).toBeGreaterThan(0);
    expect(at(1 + E / 2).strength).toBeLessThan(1);
    expect(at(1.5)).toEqual({ word: 0, strength: 1 });                       // fully on; word 7 does not exist
    expect(at(2 - E / 2).word).toBe(0);                                       // eases out before the next cue …
    expect(at(2 - E / 2).strength).toBeLessThan(1);
    expect(at(2 + E / 2).word).toBe(1);                                       // … which then eases in
    expect(at(2.6).word).toBe(2);                                             // overlap: the later cue wins
    expect(at(5 - E / 2).strength).toBeLessThan(1);                          // default hold 2.5 s, eased out
    expect(at(5.01)).toEqual({ word: null, strength: 0 });                   // after the last cue
    let prev = 0;
    for (let f = 0; f < 180; f++) {                                           // no jump from frame to frame
      const h = at(f / 30);
      expect(Math.abs(h.strength - prev)).toBeLessThan(.25);
      prev = h.strength;
    }
    expect(parseWordHighlights("0@3, 1@6.5+1.5; x@2\n2 @ 9")).toEqual([{ word: 0, at: 3 }, { word: 1, at: 6.5, hold: 1.5 }, { word: 2, at: 9 }]);
    const words = resolveKanjiCardContent("道", {}).words;
    render(createElement(ShodoKanjiInfoCard, { char: "道", words, highlight: { word: 1, strength: 1 } }));
    expect(screen.getByRole("listitem", { current: true })).toHaveTextContent("道路");
  });

  it("fills the empty card fields from local kanji data, and typed values win", () => {
    // A tiny inline fixture: one usable entry with one malformed word, and one malformed entry.
    const data = readKanjiCardDataset({ kanji: [
      { char: "山", jlpt: "N5", card: { meanings: "MOUNTAIN", onyomi: "SAN (サン)", jlpt: "N5", words: [{ word: "山", ruby: "やま", romaji: "yama", meaning: "mountain" }, { word: 1 }] } },
      { char: 2, card: {} },
    ] });
    expect(data?.size).toBe(1);
    const card = data?.get("山")?.card;
    expect(card?.words).toHaveLength(1);
    expect(card?.kunyomi).toBeUndefined();
    const empty = fillKanjiCardContent({}, card);
    expect([empty.meanings, empty.jlpt, empty.kunyomi]).toEqual(["MOUNTAIN", "N5", undefined]);
    const typed = fillKanjiCardContent({ meanings: "HILL", jlpt: null, words: resolveKanjiCardContent("道", {}).words }, card);
    expect(typed.meanings).toBe("HILL");                                      // typed text wins
    expect(typed.jlpt).toBeNull();                                            // "no badge" wins
    expect(typed.words?.[0].word).toBe("山");                                 // the 道 sample words are replaced
    expect(fillKanjiCardContent({ meanings: "X" }, undefined)).toEqual({ meanings: "X" });
    expect(readKanjiCardDataset(null)).toBeNull();
    expect(readKanjiCardDataset({ kanji: "x" })).toBeNull();
    // "each": every word in turn, from 20 % to 80 % of the video.
    expect(spreadWordHighlights(3, 20).map(c => c.at)).toEqual([4, 10, 16]);
    expect(spreadWordHighlights(2, 10)).toEqual([{ word: 0, at: 2, hold: 2.5 }, { word: 1, at: 8, hold: 2.5 }]);
  });

  it("keeps the label, the ink and the card text inside a platform's safe bands, and the layout unchanged without them", () => {
    // Without bands the layout is the one the stories have always had.
    const plain = kanjiCardGeometry("portrait", true);
    expect(plain.paper).toEqual({ x: 0, y: 0, width: 720, height: 750 });
    expect(plain.writing).toEqual(plain.paper);
    expect(plain.cardPad).toEqual([34, 36, 34, 36]);
    expect(kanjiCardGeometry("landscape", true).cardPad).toEqual([40, 34, 40, 34]);
    // YouTube Shorts bands: 8 % left, 12 % right, 9 % top, 19 % bottom.
    const inset = { left: .08, right: .12, top: .09, bottom: .19 };
    const g = kanjiCardGeometry("portrait", true, inset);
    const [L, R, T, B] = [.08 * 720, .12 * 720, .09 * 1280, .19 * 1280];
    expect(g.label.x).toBeGreaterThanOrEqual(L);
    expect(g.label.y).toBeGreaterThanOrEqual(T);
    expect(g.writing.x).toBeGreaterThanOrEqual(L);
    expect(g.writing.x + g.writing.width).toBeLessThanOrEqual(720 - R);
    expect(g.writing.y).toBeGreaterThanOrEqual(g.label.y + g.type.label);                 // under the label
    expect(g.writing.y + g.writing.height).toBeLessThanOrEqual(g.card!.y);
    expect(g.cardPad[1]).toBeGreaterThanOrEqual(R);
    expect(g.card!.y + g.card!.height).toBeCloseTo(1280 - B, 6);                       // the card ends above the bottom band
    expect(g.band).toEqual({ x: 0, y: 1280 - B, width: 720, height: B });               // which shows the dark felt
    expect(plain.band).toBeNull();
    expect(g.cardPad[3]).toBeGreaterThanOrEqual(L);
    // The card keeps the height of its text, so the paper above it is shorter.
    expect(g.card!.height - g.cardPad[0] - g.cardPad[2]).toBeCloseTo(plain.card!.height - plain.cardPad[0] - plain.cardPad[2], 6);
    // Bands are limited to 0..0.4, and a value that is not a number counts as 0.
    expect(kanjiCardSafeInset({ left: -1, right: .9, top: Number.NaN })).toEqual({ left: 0, right: .4, top: 0, bottom: 0 });
  });

  it("places the strokes of each pass on the video clock, in writing order", () => {
    const plan = { duration: 4, strokes: [{ kind: "vertical", t0: 1, t1: 2 }, { kind: "link", t0: 2, t1: 2.1 }, { kind: "dot", t0: 3, t1: 3.5 }] } as unknown as Parameters<typeof kanjiCardStrokeTimes>[0];
    const t = kanjiCardTimeline(4, { write: 4, review: 8, info: 1 }, 30);
    // The review pass is the same plan stretched to 8 s; links (連綿) are not strokes.
    expect(kanjiCardStrokeTimes(plan, t)).toEqual({ write: [[1, 2], [3, 3.5]], review: [[6, 8], [10, 11]] });
    expect(kanjiCardStrokeTimes(plan, kanjiCardTimeline(4, { write: 0, review: 4 }, 30)).write).toEqual([]);
  });

  it("reads an export description, names every problem, and takes a preset's size and safe bands", () => {
    const ok = readKanjiCardExport({
      char: "水", timing: { write: 4.5, review: 6, info: 3 }, jlpt: "N5", meanings: "WATER",
      words: [{ word: "水", ruby: "みず", romaji: "mizu", meaning: "water" }], wordHighlights: [{ word: 0, at: 9, hold: 1.3 }], preset: "youtube-shorts",
    });
    expect(ok.errors).toEqual([]);
    expect(ok.value).toMatchObject({ width: 1080, height: 1920, preset: "youtube-shorts" });
    expect(ok.value?.props).toMatchObject({ char: "水", layout: "portrait", reducedMotion: false, safeInset: { left: .08, right: .12, top: .09, bottom: .19 } });
    expect(readKanjiCardExport({ char: "水", timing: { write: 1, review: 1, info: 1 }, width: 720 }).value).toMatchObject({ width: 720, height: 1280 });
    expect(readKanjiCardExport({ char: "水", layout: "landscape", timing: { write: 1, review: 1, info: 1 } }).value).toMatchObject({ width: 1920, height: 1080 });
    const bad = readKanjiCardExport({ char: "水道", timing: { write: 1 }, jlpt: "N6", words: [{ word: "水" }], wordHighlights: [{ word: 3, at: -1 }], preset: "youtube" });
    expect(bad.value).toBeNull();
    expect(bad.errors).toEqual(expect.arrayContaining([
      "char: exactly one character is required.", "timing.review: a number from 0 to 600 is required.", 'jlpt: "N5" to "N1", or null, is required.',
      "words[0].ruby: a text of 1 to 60 characters is required.", "wordHighlights[0].word: a number from 0 to 0 is required.",
      "wordHighlights[0].at: a number from 0 to 1800 is required.", "preset: youtube (1920 × 1080) does not fit the 9:16 card.",
    ]));
    expect(readKanjiCardExport([]).errors).toEqual(["The description must be a JSON object."]);
  });

  it("draws the host's frame from the host's glyph, with no clock, transport or credit", () => {
    const { container } = render(createElement(ShodoKanjiCard, { char: "一", glyph: SHODO_GLYPHS["一"], frame: 40, timing: { write: 1, review: 1, info: 1 } }));
    expect(container.querySelector("input[type=range]")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    const card = container.querySelector<HTMLElement>("[data-km-kanji-card]")!;
    expect(card.dataset.kmKanjiFrame).toBe("40");
    expect(card.dataset.kmKanjiPhase).toBe("review");
    expect(JSON.parse(card.dataset.kmStrokeTimes!).review).toHaveLength(1);
  });

  it("adds an intro phase before the writing, and keeps the old phases when there is none", () => {
    const t = kanjiCardTimeline(10, { intro: 2, write: 6, review: 8, info: 4 }, 30);
    expect([t.intro, t.write, t.review, t.info, t.frames]).toEqual([[0, 60], [60, 240], [240, 480], [480, 600], 600]);
    expect(kanjiCardPhaseAt(t, 59)).toEqual({ phase: "intro", local: 59, length: 60 });
    expect(kanjiCardPhaseAt(t, 60)).toEqual({ phase: "write", local: 0, length: 180 });
    expect(kanjiCardTimeline(10, { write: 6 }, 30).intro).toEqual([0, 0]);
    expect(kanjiCardPhaseAt(kanjiCardTimeline(10, { write: 6 }, 30), 0).phase).toBe("write");
  });

  it("types the reading, converts it to the character on time, and fades it out as the brush starts", () => {
    const intro = { reading: "みず", convertAt: 2 };
    const at = (time: number) => kanjiCardTypedAt("水", intro, 2.5, time);
    expect(at(.1)).toMatchObject({ text: "", composing: false });                         // only the caret before typing
    expect(at(2 - .12 - .3)).toMatchObject({ text: "み", composing: true });
    expect(at(1.99)).toMatchObject({ text: "みず", composing: true, caret: true });
    expect(at(2)).toMatchObject({ text: "水", composing: false });                       // converts exactly at convertAt
    expect(at(2).converted).toBeGreaterThan(.9);
    expect(at(2.4).grow).toBe(1);
    expect(at(2.5).opacity).toBe(1);
    expect(at(2.5 + .175).opacity).toBeGreaterThan(0);
    expect(at(2.5 + .175).opacity).toBeLessThan(1);
    expect(at(2.9).opacity).toBe(0);                                                       // gone 0.35 s into the writing
    expect(kanjiCardTypedAt("水", intro, 0, 0).opacity).toBe(0);                          // no intro, no typing
    expect(kanjiCardTypedAt("水", undefined, 2, 1.5)).toMatchObject({ text: "水", grow: 1 }); // no reading: the character itself
    // Typed early, the character holds with a slow push-in and a pulse when its name is spoken.
    const early = (time: number) => kanjiCardTypedAt("水", { reading: "みず", convertAt: .6, emphasizeAt: 2 }, 3, time);
    expect(early(.9).scale).toBeLessThan(early(1.5).scale);
    expect(early(1.5).scale).toBeLessThan(early(2.9).scale + .04);
    expect(early(1.99).converted).toBe(0);
    expect(early(2.1).converted).toBeCloseTo(.8, 5);                                    // the pulse peaks 0.1 s after the name
    expect(early(2.1).scale).toBeGreaterThan(early(1.99).scale);
    expect(early(2.7).converted).toBe(0);
  });

  it("gives the compact 9:16 card a taller writing panel, and plans in Node what the card draws", () => {
    const inset = { left: .08, right: .12, top: .09, bottom: .19 };
    const regular = kanjiCardGeometry("portrait", true, inset);
    const compact = kanjiCardGeometry("portrait", true, inset, true, "compact");
    expect(compact.writing.height - regular.writing.height).toBeGreaterThan(120);
    expect(compact.card!.height).toBeLessThan(regular.card!.height);
    expect(kanjiCardGeometry("landscape", true, undefined, true, "compact").density).toBe("regular");  // landscape has one size
    const writing = kanjiCardWriting(SHODO_GLYPHS["三"], { layout: "portrait", density: "compact", safeInset: inset, timing: { intro: 2, write: 5, review: 5, info: 2 } });
    expect(writing.timeline.write).toEqual([60, 210]);
    expect(writing.strokes.write).toHaveLength(3);
    expect(writing.strokes.write[0][0]).toBeGreaterThan(2);                                // the brush lands after the intro
    const [, y0, , y1] = writing.inkBox;
    expect(y0).toBeGreaterThanOrEqual(compact.writing.y);
    expect(y1).toBeLessThanOrEqual(compact.writing.y + compact.writing.height);
    // The card draws the same plan: the same stroke times.
    const { container } = render(createElement(ShodoKanjiCard, { char: "三", glyph: SHODO_GLYPHS["三"], frame: 0, layout: "portrait", density: "compact",
      safeInset: inset, timing: { intro: 2, write: 5, review: 5, info: 2 }, meanings: "THREE" }));
    expect(JSON.parse(container.querySelector<HTMLElement>("[data-km-kanji-card]")!.dataset.kmStrokeTimes!)).toEqual(JSON.parse(JSON.stringify(writing.strokes)));
  });

  it("reads the intro, density and card reveal of an export description", () => {
    const ok = readKanjiCardExport({ char: "水", timing: { intro: 2.5, write: 6, review: 6, info: 4 }, intro: { reading: "みず", convertAt: 2 }, density: "compact", cardFrom: "write" });
    expect(ok.errors).toEqual([]);
    expect(ok.value?.props).toMatchObject({ timing: { intro: 2.5 }, intro: { reading: "みず", convertAt: 2 }, density: "compact", cardFrom: "write" });
    expect(readKanjiCardExport({ char: "水", timing: { intro: 1, write: 1, review: 1, info: 1 }, intro: { convertAt: 3 }, density: "tiny", cardFrom: "later" }).errors).toEqual([
      'density: "regular" or "compact" is required.', "intro.convertAt: a number from 0 to 1 is required.", 'cardFrom: "intro", "write", "review" or "info" is required.',
    ]);
  });
});
