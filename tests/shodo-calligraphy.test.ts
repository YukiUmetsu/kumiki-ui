import { describe, expect, it } from "vitest";
import { SHODO_GLYPHS, inspectShodoGlyph, parseKanjiVgSvg, shodoJoinStrokes, shodoKaishoForm } from "../registry/video/shodo/shodo-glyphs";
import type { ShodoGlyph } from "../registry/video/shodo/shodo-glyphs";
import { loadShodoGlyph, shodoTeacherFor } from "../registry/video/shodo/shodo-glyph-source";
import { shodoKankaRulesFor, shodoLayout, shodoStructure } from "../registry/video/shodo/shodo-structure";
import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { planShodoWriting, shodoBrushPose, shodoRestLean, shodoStrokeNumberBox, shodoStrokeNumbers } from "../registry/video/shodo/shodo-hand";
import { DEFAULT_BRUSH_LOOK, shodoBrushClearance, shodoFerruleHeight } from "../registry/video/shodo/shodo-brush";
import { kenteiSheet } from "../registry/video/shodo/shodo-paper";
import { ShodoInkSurface } from "../registry/video/shodo/shodo-ink";
import { DEFAULT_SHODO_STYLE, inspectShodoStyle, resolveShodoStyle } from "../registry/video/shodo/shodo-style";
import { SHODO_BASICS, auditShodoTechniques } from "../registry/video/shodo/shodo-techniques";
import { fillKanjiCardContent, readKanjiCardExport, resolveKanjiCardContent } from "../src/video/shodo-demos";
import { ShodoKanjiCard, ShodoKanjiInfoCard } from "../registry/video/shodo/shodo-kanji-card";
import { DEFAULT_KANJI_CARD_THEME, kanjiCardConvertAt, kanjiCardLabelText, kanjiCardTheme, kanjiCardThemeIssues } from "../registry/video/shodo/shodo-kanji-card-plan";
import {
  KANJI_CARD_MARGIN, KANJI_CARD_MIN_BOX, KANJI_WORD_EASE, sectionCueAt, wordTileWave, kanjiCardTextHeight, kanjiCardTileRoom, kanjiCardType, kanjiCardWordSize, kanjiCardGeometry, kanjiCardPhaseAt, kanjiCardSafeInset, kanjiCardStrokeTimes, kanjiCardTimeline, kanjiCardTypedAt, kanjiCardWriting,
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

  it("lays the 9:16 card on paper that fills the frame, keeps label, ink and card text inside a platform's safe bands, and leaves the bottom band plain paper", () => {
    const M = KANJI_CARD_MARGIN;
    const plain = kanjiCardGeometry("portrait", true);
    expect(plain.paper).toEqual({ x: 0, y: 0, width: 720, height: 1280 });               // no underlay shows anywhere
    expect(plain.cardPad).toEqual([34, 36, 34, 36]);
    expect(plain.card).toMatchObject({ x: M, width: 720 - 2 * M });                       // a card lying on the paper,
    expect(plain.card!.y + plain.card!.height).toBe(1280 - M);                            // with a margin all round
    expect(plain.cardRadius).toBeGreaterThan(0);
    const wide = kanjiCardGeometry("landscape", true);
    expect(wide.cardPad).toEqual([40, 34, 40, 34]);
    expect(wide.paper).toEqual({ x: 0, y: 0, width: 880, height: 720 });                // 16:9 keeps its two panels
    expect(wide.cardRadius).toBe(0);
    // YouTube Shorts bands: 8 % left, 12 % right, 9 % top, 19 % bottom.
    const inset = { left: .08, right: .12, top: .09, bottom: .19 };
    const g = kanjiCardGeometry("portrait", true, inset);
    const [L, R, T, B] = [.08 * 720, .12 * 720, .09 * 1280, .19 * 1280];
    expect(g.paper).toEqual(plain.paper);
    expect(g.label.x).toBeGreaterThanOrEqual(L);
    expect(g.label.y).toBeGreaterThanOrEqual(T);
    expect(g.label.x).toBe(g.card!.x + g.cardPad[3]);                                    // the label and the card text share a left edge
    expect(g.writing.x).toBeGreaterThanOrEqual(L);
    expect(g.writing.x + g.writing.width).toBeLessThanOrEqual(720 - R);
    expect(g.writing.x + g.writing.width / 2).toBe(360);                                  // the character is centred in the frame
    expect(g.writing.y).toBeGreaterThanOrEqual(g.label.y + g.type.label);                 // under the label
    expect(g.cell!.y + g.cell!.height + g.type.cardGap).toBeCloseTo(g.card!.y, 6);
    expect(g.cell).toEqual({ x: M, y: g.writing.y, width: 720 - 2 * M, height: g.writing.height });
    expect(g.guides.x).toBeGreaterThanOrEqual(L);                                         // stroke numbers stay out of the bands
    expect(g.guides.x + g.guides.width).toBeLessThanOrEqual(720 - R);
    expect(g.card!.x + g.cardPad[3]).toBeGreaterThanOrEqual(L);                           // so does the card text
    expect(g.card!.x + g.card!.width - g.cardPad[1]).toBeLessThanOrEqual(720 - R);
    expect(g.card!.y + g.card!.height).toBeCloseTo(1280 - B, 6);                       // the card ends above the bottom band: plain paper
    // The card keeps the height of its text, so the box above it is shorter.
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
    expect(compact.cell!.height - regular.cell!.height).toBeGreaterThan(100);
    // The compact box gives the character air above and below, the same both ways, so the ink is
    // centred in the box; in a short box (here the caption band takes 19 %) the air gives way first.
    const roomy = kanjiCardGeometry("portrait", true, { ...inset, bottom: 0 }, true, "compact");
    expect(roomy.writing.y - roomy.cell!.y).toBe(roomy.type.inkPad);
    expect(roomy.cell!.y + roomy.cell!.height - roomy.writing.y - roomy.writing.height).toBeCloseTo(roomy.type.inkPad, 9);
    expect(compact.writing.y - compact.cell!.y).toBeLessThan(compact.type.inkPad);
    expect(compact.writing.y - compact.cell!.y).toBeCloseTo(compact.cell!.y + compact.cell!.height - compact.writing.y - compact.writing.height, 9);
    expect(compact.card!.height).toBeLessThan(regular.card!.height);
    expect(kanjiCardGeometry("landscape", true, undefined, true, "compact").density).toBe("regular");  // landscape has one size
    const writing = kanjiCardWriting(SHODO_GLYPHS["三"], { layout: "portrait", density: "compact", safeInset: inset, timing: { intro: 2, write: 5, review: 5, info: 2 },
      content: { meanings: "THREE" } });
    expect(writing.timeline.write).toEqual([60, 210]);
    expect(writing.strokes.write).toHaveLength(3);
    expect(writing.strokes.write[0][0]).toBeGreaterThan(2);                                // the brush lands after the intro
    const [, y0, , y1] = writing.inkBox;
    expect(y0).toBeGreaterThanOrEqual(writing.geometry.writing.y);
    expect(y1).toBeLessThanOrEqual(writing.geometry.writing.y + writing.geometry.writing.height);
    // With only a title, the card is short and the box above it tall.
    expect(writing.geometry.card!.height).toBeLessThan(compact.card!.height);
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
      'density: "regular" or "compact" is required.', "intro.convertAt: a number from 0 to 0.68 is required.", 'cardFrom: "intro", "write", "review" or "info" is required.',
    ]);
  });

  it("keeps every allowed pair of safe bands drawable, and reports the bands it uses", () => {
    // Each band may be 0..0.4; opposite bands shrink together to 0.45, so the writing panel keeps room.
    expect(kanjiCardSafeInset({ top: .2, bottom: .4 })).toMatchObject({ top: .15, bottom: .3 });
    for (const density of ["regular", "compact"] as const) for (let top = 0; top <= .4001; top += .05) for (let bottom = 0; bottom <= .4001; bottom += .05) {
      const writing = kanjiCardWriting(SHODO_GLYPHS["三"], { layout: "portrait", density, safeInset: { top, bottom, left: .4, right: .4 }, content: { meanings: "THREE" } });
      expect(writing.geometry.writing.height).toBeGreaterThan(90);
      const [, y0, , y1] = writing.inkBox;
      expect(y0).toBeGreaterThanOrEqual(writing.geometry.writing.y);
      expect(y1).toBeLessThanOrEqual(writing.geometry.writing.y + writing.geometry.writing.height);
      expect(writing.geometry.label.y).toBeLessThan(writing.geometry.card!.y);
    }
    const { container } = render(createElement(ShodoKanjiCard, { char: "三", glyph: SHODO_GLYPHS["三"], frame: 0, safeInset: { left: .5, top: Number.NaN }, timing: { write: 1, info: 1 } }));
    expect(container.querySelector<HTMLElement>("[data-km-kanji-card]")!.dataset.kmSafeInset).toBe("0.4,0,0,0");
  });

  it("plans with the card's own rule for the reading card and the label, so Node and the card agree", () => {
    const glyph = SHODO_GLYPHS["三"], timing = { write: 4, review: 4, info: 1 };
    for (const [content, sections] of [[{}, {}], [{ meanings: "THREE" }, { meanings: false }], [{ meanings: "THREE" }, { label: false }]] as const) {
      const writing = kanjiCardWriting(glyph, { layout: "portrait", timing, content, sections });
      const { container, unmount } = render(createElement(ShodoKanjiCard, { char: "三", glyph, frame: 0, layout: "portrait", timing, sections, ...content }));
      const card = container.querySelector<HTMLElement>("[data-km-kanji-card]")!;
      expect(card.dataset.kmInkBox).toBe(writing.inkBox.map(v => v.toFixed(1)).join(" "));
      expect(JSON.parse(card.dataset.kmStrokeTimes!)).toEqual(JSON.parse(JSON.stringify(writing.strokes)));
      unmount();
    }
    expect(kanjiCardWriting(glyph, { layout: "portrait", timing }).geometry.card).toBeNull();                // no text, no card
  });

  it("brings the brush in from outside the frame and takes it out after each pass, on the side away from the card", () => {
    const glyph = SHODO_GLYPHS["永"], inset = { left: .08, right: .12, top: .09, bottom: .19 }, timing = { write: 5, review: 5, info: 1 };
    for (const layout of ["portrait", "landscape"] as const) {
      const { plan, geometry: g, strokes } = kanjiCardWriting(glyph, { layout, safeInset: inset, timing, content: { meanings: "ETERNITY" } });
      const before = shodoBrushPose(plan, 0), after = shodoBrushPose(plan, plan.duration);
      expect([after.x, after.y]).toEqual([before.x, before.y]);                              // it rests in one place
      if (layout === "portrait") expect(before.x).toBeGreaterThan(g.width); else expect(before.y).toBeGreaterThan(g.height);
      expect(plan.air[0].t0).toBe(0);                                                          // it moves in at once
      // It leaves after the last stroke, not before.
      const last = plan.air[plan.air.length - 1];
      expect(last.to).toEqual([before.x, before.y]);
      expect(last.t0).toBeGreaterThanOrEqual(plan.strokes[plan.strokes.length - 1].t1);
      expect(strokes.write).toHaveLength(5);
    }
  });

  it("knows how far past an edge a brush must rest for none of it, or its shadow, to show", () => {
    const brush = DEFAULT_SHODO_STYLE.brush, D = 60, reach = D * brush.length * (1 + brush.handleLength);
    // Upright, the flyaway hairs at the collar reach furthest: 0.42 of the tuft beyond its width.
    expect(shodoBrushClearance([1, 0], [0, 0], 0, brush, D)).toBeCloseTo(D * .7 + D * brush.length * .42, 6);
    // The default hand leans the handle away from the right edge, so less is needed than upright.
    expect(shodoBrushClearance([1, 0], shodoRestLean(DEFAULT_SHODO_STYLE), 0, brush, D)).toBeLessThan(shodoBrushClearance([1, 0], [0, 0], 0, brush, D));
    // A brush that may hold anywhere between two heights needs the larger clearance of the two.
    for (const out of [[1, 0], [0, 1], [-1, 0]] as const) {
      const range = shodoBrushClearance(out, [20, 30], [0, 120], brush, D, DEFAULT_BRUSH_LOOK);
      expect(range).toBe(Math.max(shodoBrushClearance(out, [20, 30], 0, brush, D), shodoBrushClearance(out, [20, 30], 120, brush, D)));
    }
    // A handle leaning back into the frame needs the brush further out.
    expect(shodoBrushClearance([1, 0], [-38, 0], 0, brush, D)).toBeGreaterThan(reach * Math.sin(38 * Math.PI / 180));
    // Higher in the air, the shadow falls further from the brush (down and to the right).
    expect(shodoBrushClearance([-1, 0], [0, 0], 200, brush, D)).toBeGreaterThan(shodoBrushClearance([-1, 0], [0, 0], 0, brush, D));
  });

  it("never crosses the 16:9 reading card for ink: the inkstone lies outside the frame on the brush's side", () => {
    const glyph = SHODO_GLYPHS["永"], timing = { write: 5, review: 5, info: 1 };
    const { plan, geometry: g } = kanjiCardWriting(glyph, { layout: "landscape", vermilionStrokes: [2, 4], timing, content: { meanings: "ETERNITY" } });
    const dips = plan.air.filter(m => m.dip);
    expect(dips.length).toBeGreaterThan(0);
    for (const dip of dips) expect(dip.to[1]).toBeGreaterThan(g.height);
    for (let t = 0; t <= plan.duration; t += 1 / 30) {
      const pose = shodoBrushPose(plan, t);
      expect(pose.x >= g.card!.x && pose.y <= g.height).toBe(false);
    }
  });

  it("reserves the height the compact card's text needs, and fits long words in their tiles", () => {
    const t = kanjiCardType("portrait", "compact"), width = 573.6;
    const short = { meanings: "WATER", onyomi: "SUI (スイ)", kunyomi: "mizu (みず)", jlpt: "N5" as const,
      words: [{ word: "水道", ruby: "すいどう", romaji: "suidō", meaning: "water supply" }, { word: "水泳", ruby: "すいえい", romaji: "suiei", meaning: "swimming" }] };
    const long = { ...short, onyomi: "SEI (セイ), SHŌ (ショウ)", kunyomi: "ikiru (いきる), ikasu (いかす)",
      words: [...short.words, { word: "一生", ruby: "いっしょう", romaji: "isshō", meaning: "whole life, a lifetime" }] };
    const a = kanjiCardTextHeight(short, {}, width, t), b = kanjiCardTextHeight(long, {}, width, t);
    expect(b - a).toBeGreaterThan(t.reading * 1.3 + t.gloss * 1.25 - 1);                     // a reading line and a meaning line more
    expect(kanjiCardTextHeight(short, { words: false, readings: false }, width, t)).toBeLessThan(a / 3);
    // The card gives the character what its text leaves.
    const inset = { left: .08, right: .12, top: .09, bottom: 0 };
    const gShort = kanjiCardGeometry("portrait", true, inset, true, "compact", { content: short }), gLong = kanjiCardGeometry("portrait", true, inset, true, "compact", { content: long });
    expect(gShort.card!.height - gLong.card!.height).toBeCloseTo(a - b, 6);
    expect(gShort.writing.height).toBeGreaterThan(gLong.writing.height);
    // Words wider than a tile shrink, all together; short words keep the full size.
    const room = kanjiCardTileRoom(width, 3, t);
    expect(kanjiCardWordSize(short.words, room, t)).toBe(t.word);
    const four = kanjiCardWordSize([...short.words, { word: "聞こえる" }], room, t);
    expect(four).toBeLessThan(t.word);
    expect(four * 4).toBeLessThanOrEqual(room + 1e-9);
  });

  it("keeps the compact practice box at least its minimum share, so long text cannot crush the character", () => {
    const long = { meanings: "TAKE OUT / GET OUT / EXIT / LEAVE / PUT FORTH", onyomi: "SHUTSU (シュツ), SUI (スイ)", kunyomi: "deru (でる), dasu (だす), ideru (いでる)", jlpt: "N5" as const,
      words: Array.from({ length: 6 }, (_, i) => ({ word: "出かける", ruby: "でかける", romaji: `dekakeru ${i}`, meaning: "to go out, to leave, to set out on a long journey" })) };
    for (const safeInset of [{ top: .15, bottom: .3 }, { top: .05, bottom: .4 }, { left: .08, right: .12, top: .09, bottom: .19 }])
      for (const char of ["永", "三", "道"] as const) {
        const w = kanjiCardWriting(SHODO_GLYPHS[char], { layout: "portrait", density: "compact", safeInset, content: long, timing: { write: 5, review: 5 } });
        const g = w.geometry, floor = g.card!.y + g.card!.height;
        expect(g.cell!.height).toBeGreaterThanOrEqual((floor - g.cell!.y) * KANJI_CARD_MIN_BOX - 1e-9);
        expect(w.inkBox[1]).toBeGreaterThanOrEqual(g.writing.y);
        expect(w.inkBox[3]).toBeLessThanOrEqual(g.writing.y + g.writing.height);
      }
  });

  it("rests the brush past the edge its handle leans away from, among the edges away from the card", () => {
    const glyph = SHODO_GLYPHS["永"], timing = { write: 5, review: 5 }, content = { meanings: "ETERNITY" };
    const rest = (layout: "portrait" | "landscape", hand?: { lean: number; leanAzimuth: number }) => {
      const { plan } = kanjiCardWriting(glyph, { layout, timing, content, ...(hand ? { brushStyle: { hand } } : {}) });
      return plan.air[0].from;
    };
    expect(rest("portrait")[0]).toBeGreaterThan(720);                                     // the default hand leans down and right
    expect(rest("portrait", { lean: 50, leanAzimuth: 180 })[0]).toBeLessThan(0);          // a handle leaning left: out past the left edge
    expect(rest("landscape")[1]).toBeGreaterThan(720);
    expect(rest("landscape", { lean: 50, leanAzimuth: -90 })[1]).toBeLessThan(0);        // leaning up: out past the top
  });

  it("reports the host's frame on both canvases, and that a canvas without a 2D context cannot draw", () => {
    const { container } = render(createElement(ShodoKanjiCard, { char: "三", glyph: SHODO_GLYPHS["三"], frame: 40, layout: "portrait", timing: { write: 1, review: 1, info: 1 }, meanings: "THREE" }));
    const canvases = [...container.querySelectorAll<HTMLCanvasElement>("canvas")];
    // Frame 40 is the review pass; its frame within the pass repeats one in the first pass, the host's does not.
    expect(canvases.map(c => c.dataset.kmShodoFrame)).toEqual(["40", "40"]);
    // The test DOM has no 2D context.
    expect(canvases.map(c => c.dataset.kmShodoStatus)).toEqual(["error", "error"]);
  });

  it("cues a section of the card on the video clock: eased in and out, the latest cue first", () => {
    const cues = [{ section: "words" as const, at: 10, hold: 3 }, { section: "readings" as const, at: 2, hold: 1 }];
    expect(sectionCueAt(cues, "words", 9.9)).toEqual({ strength: 0, progress: 0 });
    expect(sectionCueAt(cues, "words", 10).strength).toBe(0);                                   // eases in from the cue time
    expect(sectionCueAt(cues, "words", 11.5)).toEqual({ strength: 1, progress: .5 });
    // An overlapping later cue: the earlier one eases out before it starts instead of snapping off.
    const both = [...cues, { section: "words" as const, at: 12, hold: 2 }];
    expect(sectionCueAt(both, "words", 11.9).strength).toBeGreaterThan(0);
    expect(sectionCueAt(both, "words", 11.9).strength).toBeLessThan(sectionCueAt(both, "words", 11.8).strength);   // fading
    expect(sectionCueAt(both, "words", 11.999).strength).toBeLessThan(.01);
    // A cue shorter than the eases only fades a little: no one-frame flash.
    for (let t = 5; t < 5.1; t += 1 / 30) expect(sectionCueAt([{ section: "words", at: 5, hold: .05 }], "words", t).strength).toBeLessThan(.1);
    expect(sectionCueAt(cues, "words", 13).strength).toBe(0);                                   // and out by its end
    expect(sectionCueAt(cues, "readings", 2.5).strength).toBe(1);
    expect(sectionCueAt([...cues, { section: "words", at: 12, hold: 2 }], "words", 12.5).progress).toBeCloseTo(.25, 9);   // a later cue wins
    expect(sectionCueAt([{ section: "words", at: Number.NaN, hold: 3 }, { section: "words", at: 1, hold: 0 }], "words", 2).strength).toBe(0);
  });

  it("lifts the word tiles in a wave that never stops while the cue lasts, and is flat at both ends", () => {
    for (const n of [1, 2, 3, 6]) {
      for (let i = 0; i < n; i++) {
        expect(wordTileWave(i, n, 0)).toBe(0);
        expect(wordTileWave(i, n, 1)).toBe(0);
        expect(wordTileWave(i, n, (i + 1) / (n + 1))).toBeCloseTo(1, 9);                    // each tile peaks in turn
      }
      // Some tile is clearly up through the middle of the cue (it starts and ends flat, so the ends are slight).
      for (let p = .1; p <= .9; p += .02) expect(Math.max(...Array.from({ length: n }, (_, i) => wordTileWave(i, n, p)))).toBeGreaterThan(.05);
    }
  });

  it("draws a words cue: the title in the accent colour and the tiles lifting, colour only with reduced motion", () => {
    const base = { char: "三", glyph: SHODO_GLYPHS["三"], frame: 75, layout: "portrait" as const, density: "compact" as const, timing: { write: 1, review: 1, info: 3 }, meanings: "THREE",
      words: [{ word: "三月", ruby: "さんがつ", romaji: "sangatsu", meaning: "March" }, { word: "三つ", ruby: "みっつ", romaji: "mittsu", meaning: "three" }],
      sectionCues: [{ section: "words" as const, at: 2, hold: 1.5 }] };
    const { container, unmount } = render(createElement(ShodoKanjiCard, { ...base, reducedMotion: false }));
    const root = container.querySelector<HTMLElement>("[data-km-kanji-card]")!;
    expect(root.dataset.kmSectionCue).toMatch(/^words 1\.000 0\.333$/u);                       // frame 75 is 2.5 s
    expect(container.querySelector<HTMLElement>("[data-km-section-cue]:not([data-km-kanji-card])")!.style.color).not.toBe("");
    const tiles = [...container.querySelectorAll<HTMLElement>("li")];
    expect(tiles[0].style.transform).toMatch(/translateY/u);                                    // the first tile is up at a third of the cue
    unmount();
    const calm = render(createElement(ShodoKanjiCard, { ...base, reducedMotion: true }));
    expect([...calm.container.querySelectorAll<HTMLElement>("li")].every(li => li.style.transform === "")).toBe(true);
    calm.unmount();
    // No words, no words cue reported; nonsense cue values draw nothing.
    const bare = render(createElement(ShodoKanjiCard, { ...base, words: [] }));
    expect(bare.container.querySelector<HTMLElement>("[data-km-kanji-card]")!.dataset.kmSectionCue).toBe("");
    bare.unmount();
    const odd = render(createElement(ShodoKanjiInfoCard, { char: "三", layout: "portrait", density: "compact", meanings: "THREE", words: base.words,
      cues: { words: { strength: Number.NaN, progress: Number.NaN } } }));
    // Each tile keeps the plain tile colour (#F3EFE7), not an invalid rgb(NaN…) that would drop it.
    for (const li of odd.container.querySelectorAll<HTMLElement>("li")) { expect(li.style.transform).toBe(""); expect(li.style.background).toBe("rgb(243, 239, 231)"); }
    odd.unmount();
    // The export description reads the cues and names a bad one.
    expect(readKanjiCardExport({ char: "三", timing: { write: 1, review: 1, info: 1 }, sectionCues: [{ section: "words", at: 1, hold: 2 }] }).value?.props.sectionCues)
      .toEqual([{ section: "words", at: 1, hold: 2 }]);
    expect(readKanjiCardExport({ char: "三", timing: { write: 1, review: 1, info: 1 }, sectionCues: [{ section: "title", at: 1, hold: 2 }] }).errors)
      .toEqual(['sectionCues[0].section: one of "readings", "words" is required.']);
  });

  it("keeps the regular 9:16 character as large as it was before the paper filled the frame", () => {
    const glyph = SHODO_GLYPHS["永"], timing = { write: 5, review: 5 }, content = { meanings: "ETERNITY" };
    const height = (safeInset: Partial<Record<"left" | "right" | "top" | "bottom", number>>) => {
      const box = kanjiCardWriting(glyph, { layout: "portrait", safeInset, content, timing }).inkBox;
      return box[3] - box[1];
    };
    // Measured on the earlier layout (dark band under the card): 301 and 162 design px.
    expect(height({ left: .08, right: .12, top: .09, bottom: .19 })).toBeGreaterThanOrEqual(301);
    expect(height({ top: .3, bottom: .1 })).toBeGreaterThanOrEqual(162);
  });

  it("draws the brush on its own canvas above the reading card, hidden from assistive technology", () => {
    const { container } = render(createElement(ShodoKanjiCard, { char: "三", glyph: SHODO_GLYPHS["三"], frame: 30, layout: "portrait", timing: { write: 2, review: 2, info: 1 }, meanings: "THREE" }));
    const canvases = [...container.querySelectorAll<HTMLCanvasElement>("canvas")];
    expect(canvases.map(c => c.dataset.kmShodoLayer)).toEqual(["page", "brush"]);
    expect(canvases[0].getAttribute("role")).toBe("img");
    expect(canvases[0].getAttribute("aria-label")).toContain("三");
    expect(canvases[1].getAttribute("aria-hidden")).toBe("true");
    expect(canvases[1].getAttribute("role")).toBeNull();
    // Later in the same stacking context is drawn above.
    expect(container.querySelector("aside")!.compareDocumentPosition(canvases[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("prints the practice box where the layout puts it, and keeps stroke numbers inside the safe part of it", () => {
    expect(kenteiSheet(720, 1280, 1, 1, { x: 24, y: 166, width: 672, height: 500 }).cells!.inset).toEqual([24, 166, 24, 614]);
    for (const v of kenteiSheet(700, 600).cells!.inset) expect(v).toBeCloseTo(42, 9);       // without a block: a 7 % margin
    const { plan, geometry: g } = kanjiCardWriting(SHODO_GLYPHS["永"], { layout: "portrait", density: "compact", safeInset: { left: .08, right: .12, top: .09, bottom: .19 },
      content: { meanings: "ETERNITY" }, timing: { write: 5, review: 5 } });
    const size = Math.max(12, plan.brush.diameter * .42, g.type.number);
    for (const n of shodoStrokeNumbers(plan, { size, bounds: g.guides })) {
      const [hw, hh] = shodoStrokeNumberBox(String(n.number).length, size);
      expect(n.x - hw).toBeGreaterThanOrEqual(g.guides.x);
      expect(n.x + hw).toBeLessThanOrEqual(g.guides.x + g.guides.width);
      expect(n.y + hh).toBeLessThanOrEqual(g.guides.y + g.guides.height);
    }
  });

  it("with reduced motion shows the same words at the same times, with no typing, caret, growth or bump", () => {
    const intro = { reading: "みず", convertAt: 1, emphasizeAt: 2 };
    const at = (time: number) => kanjiCardTypedAt("水", intro, 3, time, { reducedMotion: true });
    expect(at(.2)).toMatchObject({ text: "みず", caret: false, grow: 1, scale: 1 });             // the whole reading, at once
    expect(at(1.5)).toMatchObject({ text: "水", caret: false, grow: 1, scale: 1, converted: 0 });
    expect(at(2.1).converted).toBeCloseTo(.8, 5);                                                 // the name still shows, as a fade
    expect(at(2.1).scale).toBe(1);
    for (let t = 0; t < 3; t += .05) expect(at(t).caret).toBe(false);
  });

  it("plans vermilion strokes from the content too, refuses the old options, and treats an undefined section as shown", () => {
    const glyph = SHODO_GLYPHS["三"], timing = { write: 4, review: 4, info: 1 };
    const fromContent = kanjiCardWriting(glyph, { layout: "portrait", timing, content: { meanings: "THREE", vermilionStrokes: [3] } });
    const fromOption = kanjiCardWriting(glyph, { layout: "portrait", timing, content: { meanings: "THREE" }, vermilionStrokes: [3] });
    expect(fromContent.strokes).toEqual(fromOption.strokes);
    const { container } = render(createElement(ShodoKanjiCard, { char: "三", glyph, frame: 0, layout: "portrait", timing, meanings: "THREE", vermilionStrokes: [3], sections: { label: undefined } }));
    const card = container.querySelector<HTMLElement>("[data-km-kanji-card]")!;
    expect(JSON.parse(card.dataset.kmStrokeTimes!)).toEqual(JSON.parse(JSON.stringify(fromContent.strokes)));
    expect(container.querySelector("[data-km-kanji-label]")).not.toBeNull();                   // undefined: the label shows, as planned
    expect(() => kanjiCardWriting(glyph, { withCard: true } as never)).toThrow(/no longer an option/u);
  });

  it("with reduced motion and no reading shows nothing before the conversion, as full motion shows only a caret", () => {
    expect(kanjiCardTypedAt("水", { convertAt: 1.5 }, 3, 1, { reducedMotion: true })).toMatchObject({ text: "", opacity: 0 });
    expect(kanjiCardTypedAt("水", { convertAt: 1.5 }, 3, 1.6, { reducedMotion: true }).text).toBe("水");
  });

  it("takes its words, colours, fonts and brush from the host, and plans the same brush the card draws", () => {
    const glyph = SHODO_GLYPHS["三"], timing = { write: 4, review: 4, info: 1 };
    const { container, unmount } = render(createElement(ShodoKanjiCard, { char: "三", glyph, frame: 200, layout: "portrait", timing,
      meanings: "THREE", onyomi: "SAN (サン)", jlpt: "N5", words: [{ word: "三月", ruby: "さんがつ", romaji: "sangatsu", meaning: "March" }],
      labels: { onyomi: "音読み", kunyomi: "訓読み", words: "ことば", jlpt: "日本語能力試験" }, theme: { accent: "#1F5FAD", card: "#FFFFFF" } }));
    expect(screen.getByText("音読み")).toBeInTheDocument();
    expect(screen.getByText("ことば")).toBeInTheDocument();
    expect(screen.getByText("日本語能力試験 N5")).toBeInTheDocument();
    expect(container.querySelector("[data-km-kanji-label]")!.textContent).toBe("KANJI STUDY: 三");
    expect(container.querySelector("[data-km-kanji-label] [lang=ja]")!.textContent).toBe("三");
    expect(container.querySelector<HTMLElement>("aside")!.style.background).toBe("rgb(255, 255, 255)");
    unmount();
    expect(() => kanjiCardTheme({ accent: "red" })).toThrow(/accent must be a #RRGGBB/u);
    expect(() => kanjiCardTheme({ ink: "black", accent: "blue" })).toThrow(/ink must be .*; accent must be/u);   // every bad key
    expect(() => kanjiCardTheme({ body: "M PLUS 1p, sans-serif" })).toThrow(/body must be a CSS font stack/u);  // "1p" is not a CSS name
    expect(kanjiCardTheme({ body: "'M PLUS 1p', sans-serif" }).body).toBe("'M PLUS 1p', sans-serif");
    expect(kanjiCardTheme({ accent: undefined })).toEqual(DEFAULT_KANJI_CARD_THEME);                       // undefined uses the default
    expect(kanjiCardThemeIssues({ accnt: "#000000" } as never)).toEqual([expect.stringMatching(/^accnt is not a theme key/u)]);   // a description is checked
    expect(kanjiCardTheme({ accent: "#1E5AA8", name: "Acme" } as never).accent).toBe("#1E5AA8");                                // the card ignores extra keys
    for (const word of ["inherit", "initial", "default, serif"]) expect(kanjiCardThemeIssues({ body: word })).toHaveLength(1);    // CSS-wide keywords
    expect(kanjiCardThemeIssues({ body: "'inherit', serif" })).toEqual([]);                                                       // quoted, it is a name
    expect(kanjiCardTheme({ ink: "#000000" })).toMatchObject({ ...DEFAULT_KANJI_CARD_THEME, ink: "#000000" });
    // A brush style changes the plan, and the card plans with it exactly as kanjiCardWriting does.
    const brushStyle = { hand: { pressure: .6 }, brush: { diameter: 140 } };
    const plain = kanjiCardWriting(glyph, { layout: "portrait", timing, content: { meanings: "THREE" } });
    const styled = kanjiCardWriting(glyph, { layout: "portrait", timing, content: { meanings: "THREE" }, brushStyle });
    expect(styled.plan.style.hand.pressure).toBe(.6);
    expect(styled.plan.brush.diameter).not.toBe(plain.plan.brush.diameter);
    const { container: c2 } = render(createElement(ShodoKanjiCard, { char: "三", glyph, frame: 0, layout: "portrait", timing, meanings: "THREE", brushStyle }));
    expect(c2.querySelector<HTMLElement>("[data-km-kanji-card]")!.dataset.kmInkBox).toBe(styled.inkBox.map(v => v.toFixed(1)).join(" "));
  });

  it("formats the heading and the accessible names from the labels, and keeps undefined labels at their defaults", () => {
    const glyph = SHODO_GLYPHS["三"];
    const { container } = render(createElement(ShodoKanjiCard, { char: "三", glyph, frame: 0, heading: "漢字", timing: { write: 1, info: 1 }, meanings: "THREE",
      labels: { heading: "{char} — {heading}", cardName: "{char}の読みと言葉", writingName: "筆で書く{char}", jlpt: undefined } }));
    expect(container.querySelector("[data-km-kanji-label]")!.textContent).toBe("三 — 漢字");
    expect(container.querySelector("aside")!.getAttribute("aria-label")).toBe("三の読みと言葉");
    expect(container.querySelector("canvas")!.getAttribute("aria-label")).toBe("筆で書く三");
    expect(kanjiCardLabelText("{HEADING}: {char}", { heading: "istanbul", char: "三" }, "tr")).toBe("İSTANBUL: 三");
  });

  it("reads the brush style and typing pace of an export description, checked as the planner uses them", () => {
    const ok = readKanjiCardExport({ char: "水", timing: { intro: 2, write: 1, review: 1, info: 1 }, intro: { typeStep: .3 }, brushStyle: { hand: { script: "gyosho" }, seed: 7 } });
    expect(ok.errors).toEqual([]);
    expect(ok.value?.props).toMatchObject({ intro: { typeStep: .3 }, brushStyle: { hand: { script: "gyosho" }, seed: 7 } });
    const bad = readKanjiCardExport({ char: "水", timing: { write: 1, review: 1, info: 1 }, brushStyle: { brush: { diameter: 5 } }, theme: { ink: "black", accent: "blue" } });
    expect(bad.errors).toEqual(expect.arrayContaining([expect.stringMatching(/^brushStyle\.brush\.diameter: /u), "theme.ink must be a #RRGGBB colour.", "theme.accent must be a #RRGGBB colour."]));
  });

  it("gives the convertAt that starts typing at a chosen moment, so hosts do not copy the typing constants", () => {
    const convertAt = kanjiCardConvertAt(2, { startAt: .15, typeStep: .2 });
    expect(convertAt).toBe(.67);
    expect(kanjiCardTypedAt("水", { reading: "みず", convertAt, typeStep: .2 }, 3, .14).text).toBe("");     // nothing typed yet
    expect(kanjiCardTypedAt("水", { reading: "みず", convertAt, typeStep: .2 }, 3, .16).text).toBe("み");   // typing starts at 0.15 s
  });

  it("types at the host's pace", () => {
    const slow = kanjiCardTypedAt("水", { reading: "みず", convertAt: 2, typeStep: .4 }, 3, 2 - .12 - .5);
    expect(slow.text).toBe("み");                                                          // the second kana comes 0.4 s after the first
    expect(kanjiCardTypedAt("水", { reading: "みず", convertAt: 2, typeStep: .4 }, 3, 2 - .12 - .3).text).toBe("みず");
  });

  it("finishes the conversion inside the intro, also when convertAt is at its end", () => {
    const late = kanjiCardTypedAt("水", { reading: "みず", convertAt: 3 }, 3, 2.95);   // converted at 2.68 s, grown by 2.9 s
    expect(late.text).toBe("水");
    expect(late.grow).toBe(1);
  });

  it("checks export sizes the way the export stage does", () => {
    const size = (layout: string, width: number) => readKanjiCardExport({ char: "水", layout, width, timing: { write: 1, review: 1, info: 1 } });
    expect(size("portrait", 1080).value).toMatchObject({ width: 1080, height: 1920 });
    expect(size("portrait", 1024).errors[0]).toMatch(/divisible by 18/u);
    expect(size("portrait", 2880).errors[0]).toMatch(/360 to 2430/u);
    expect(size("landscape", 1280).value).toMatchObject({ width: 1280, height: 720 });
    expect(size("landscape", 1040).errors[0]).toMatch(/divisible by 32/u);
    const full = readKanjiCardExport({ char: "水", timing: { write: 1, review: 1, info: 1 }, ink: "vermilion", vermilionStrokes: [1], speed: 2, sections: { label: false } });
    expect(full.value?.props).toMatchObject({ ink: "vermilion", vermilionStrokes: [1], speed: 2, sections: { label: false } });
    expect(readKanjiCardExport({ char: "水", timing: { write: 1, review: 1, info: 1 }, ink: "blue", sections: { title: true } }).errors).toEqual([
      'ink: "sumi" or "vermilion" is required.', "sections: { label, meanings, readings, jlpt, words } as true or false is required.",
    ]);
  });
});
