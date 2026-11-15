import { describe, expect, it } from "vitest";
import { SHODO_GLYPHS, parseKanjiVgSvg, shodoKaishoForm } from "../registry/video/shodo/shodo-glyphs";
import type { ShodoGlyph } from "../registry/video/shodo/shodo-glyphs";
import { loadShodoGlyph } from "../registry/video/shodo/shodo-glyph-source";
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
});
