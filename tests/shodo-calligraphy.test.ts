import { describe, expect, it } from "vitest";
import { SHODO_GLYPHS, inspectShodoGlyph, parseKanjiVgSvg, shodoKaishoForm } from "../registry/video/shodo/shodo-glyphs";
import type { ShodoGlyph } from "../registry/video/shodo/shodo-glyphs";
import { loadShodoGlyph, shodoTeacherFor } from "../registry/video/shodo/shodo-glyph-source";
import { shodoKankaRulesFor, shodoLayout, shodoStructure } from "../registry/video/shodo/shodo-structure";
import { planShodoWriting, shodoBrushPose, shodoRestLean } from "../registry/video/shodo/shodo-hand";
import { shodoFerruleHeight } from "../registry/video/shodo/shodo-brush";
import { ShodoInkSurface } from "../registry/video/shodo/shodo-ink";
import { DEFAULT_SHODO_STYLE, inspectShodoStyle, resolveShodoStyle } from "../registry/video/shodo/shodo-style";
import { SHODO_BASICS, auditShodoTechniques } from "../registry/video/shodo/shodo-techniques";

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

  it("reads KanjiVG components, merging a part split around another one", () => {
    const glyph = parseKanjiVgSvg(`<svg viewBox="0 0 109 109"><g kvg:element="回">
      <g kvg:element="囗" kvg:part="1" kvg:position="kamae"><path d="M20,20 L20,90"/><path d="M20,20 L90,20 L90,90"/></g>
      <g kvg:element="口"><path d="M40,40 L40,70"/><path d="M40,40 L70,40 L70,70"/><path d="M40,70 L70,70"/></g>
      <g kvg:element="囗" kvg:part="2" kvg:position="kamae"><path d="M20,90 L90,90"/></g></g></svg>`);
    const kids = glyph.parts!.children;
    expect(kids.map(k => [k.element, k.position, k.strokes])).toEqual([["囗", "kamae", [0, 1, 5]], ["口", undefined, [2, 3, 4]]]);
    expect(shodoLayout(glyph)).toBe("enclosure");
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
});
