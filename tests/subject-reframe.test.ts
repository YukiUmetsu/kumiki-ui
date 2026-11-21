import { describe, expect, it } from "vitest";
import { planReframe, reframeCrop, subjectBox, trackFromRows, trackRows, whittaker } from "../registry/video/subject-reframe";
import type { SubjectBox, SubjectTrack } from "../registry/video/subject-reframe";
import { footageReframe, inspectReframe } from "../registry/video/film-subject";
import { compileFilm } from "../registry/video/film-document";
import type { FilmDocument } from "../registry/video/film-document";
import example from "../examples/film/reframe.film.json";

const W = 960, H = 540, FPS = 30;
/** A subject 120 px wide and 300 px tall whose centre is at `cx(i)` in frame i, or missing where `cx` returns null. */
const track = (frames: number, cx: (i: number) => number | null): SubjectTrack => ({ width: W, height: H, fps: FPS,
  frames: Array.from({ length: frames }, (_, i) => { const c = cx(i); return c === null ? null : { x: c - 60, y: 150, width: 120, height: 300, cx: c, cy: 300, area: .07 }; }) });
/** Whether every frame's subject box sits inside its crop. */
const holds = (t: SubjectTrack, plan: ReturnType<typeof planReframe>) => t.frames.every((box, i) => {
  if (!box) return true;
  const crop = reframeCrop(plan, i);
  return box.x >= crop.x - .5 && box.x + box.width <= crop.x + crop.width + .5;
});

describe("subjectBox", () => {
  it("boxes the subject's alpha and ignores a stray speck", () => {
    const w = 200, h = 100, alpha = new Uint8Array(w * h);
    for (let y = 20; y < 80; y++) for (let x = 50; x < 90; x++) alpha[y * w + x] = 255;
    alpha[5 * w + 190] = 255;
    const box = subjectBox(alpha, w, h) as SubjectBox;
    expect(box).toMatchObject({ x: 50, y: 20, width: 40, height: 60 });
    expect(box.cx).toBeCloseTo(70, 0);
    expect(subjectBox(new Uint8Array(w * h), w, h)).toBeNull();
  });
  it("keeps a track's rows exact enough to plan from", () => {
    const t = track(3, i => 400 + i * 10.04);
    expect(trackFromRows(trackRows(t), W, H, FPS).frames[2]?.cx).toBeCloseTo(420.1, 5);
  });
});

describe("planReframe", () => {
  it("stands still for a subject that stays in one place", () => {
    const t = track(90, i => 480 + 12 * Math.sin(i / 4));
    const plan = planReframe(t, { aspect: 9 / 16 });
    expect(plan.mode).toBe("stationary");
    expect(plan.width).toBeCloseTo(540 * 9 / 16, 6);
    expect(new Set(plan.path.map(p => p.x)).size).toBe(1);
    expect(holds(t, plan)).toBe(true);
  });

  it("pans at one speed for a subject crossing steadily", () => {
    const t = track(120, i => 200 + i * 4.5);
    const plan = planReframe(t, { aspect: 9 / 16 });
    expect(plan.mode).toBe("panning");
    const steps = plan.path.slice(1).map((p, i) => p.x - plan.path[i].x);
    expect(Math.max(...steps) - Math.min(...steps)).toBeLessThan(1e-6);
    expect(holds(t, plan)).toBe(true);
  });

  it("tracks a subject that runs, stops and turns back, smoothly and ahead of time", () => {
    const at = (i: number) => i < 30 ? 150 : i < 100 ? 150 + (i - 30) * 8 : i < 130 ? 710 : 710 - (i - 130) * 6;
    const t = track(170, at), plan = planReframe(t, { aspect: 9 / 16 });
    expect(plan.mode).toBe("tracking");
    expect(holds(t, plan)).toBe(true);
    // Smooth: the subject goes from standing to 8 px a frame at once; the crop gets there gently.
    const accel = plan.path.slice(2).map((p, i) => Math.abs(p.x - 2 * plan.path[i + 1].x + plan.path[i].x));
    expect(Math.max(...accel)).toBeLessThan(1.5);
    // Ahead of time: the crop is already moving before the subject starts to run at frame 30.
    expect(plan.path[29].x - plan.path[20].x).toBeGreaterThan(1);
    expect(plan.problems).toEqual([]);
  });

  it("follows more closely with a faster motion setting", () => {
    const t = track(150, i => 480 + 300 * Math.sin(i / 9));
    const lag = (motion: "slower" | "faster") => { const plan = planReframe(t, { aspect: 9 / 16, mode: "tracking", motion });
      return t.frames.reduce((sum, box, i) => sum + Math.abs(plan.path[i].x + plan.width / 2 - box!.cx), 0) / t.frames.length; };
    expect(lag("faster")).toBeLessThan(lag("slower"));
  });

  it("holds through a gap and warns when the subject is lost for over a second", () => {
    const t = track(120, i => i >= 40 && i < 80 ? null : 300 + i * 2);
    const plan = planReframe(t, { aspect: 9 / 16 });
    expect(plan.problems.map(p => p.code)).toContain("reframe-subject-lost");
    expect(holds(t, plan)).toBe(true);
  });

  it("names what it cannot do", () => {
    const codes = (t: SubjectTrack, options: Parameters<typeof planReframe>[1]) => planReframe(t, options).problems.map(p => p.code);
    expect(codes(track(30, () => 480), { aspect: 0 })).toContain("reframe-aspect");
    expect(codes(track(30, () => null), { aspect: 9 / 16 })).toContain("reframe-no-subject");
    expect(codes(track(30, () => 480), { aspect: 16 / 9 })).toContain("reframe-same-shape");
    const wide: SubjectTrack = { ...track(30, () => 480), frames: track(30, () => 480).frames.map(box => box && { ...box, x: 280, width: 400 }) };
    expect(codes(wide, { aspect: 9 / 16 })).toContain("reframe-subject-wide");
    expect(codes(track(120, i => 100 + i * 6), { aspect: 9 / 16, mode: "stationary" })).toContain("reframe-subject-cut");
    expect(codes(track(40, i => i < 20 ? 100 : 860), { aspect: 9 / 16 })).toContain("reframe-fast");
  });
});

describe("whittaker", () => {
  it("returns the targets with no penalty and a straight line with a huge one", () => {
    const t = Float64Array.from({ length: 20 }, (_, i) => (i * 7) % 5), w = new Float64Array(20).fill(1);
    whittaker(t, w, 0).forEach((v, i) => expect(v).toBeCloseTo(t[i], 6));
    const line = whittaker(t, w, 1e12), steps = line.slice(1).map((v, i) => v - line[i]);
    expect(Math.max(...steps) - Math.min(...steps)).toBeLessThan(1e-3);
  });
});

describe("a footage scene's reframe", () => {
  const video = { width: W, height: H, fps: FPS, frameCount: 120 }, rows = trackRows(track(120, i => 200 + i * 4.5));
  it("plans for an output of another shape and leaves one of the footage's own shape alone", () => {
    expect(footageReframe({ track: rows }, video, 0, 119, { width: 1920, height: 1080 })).toBeUndefined();
    const plan = footageReframe({ track: rows }, video, 10, 109, { width: 1080, height: 1920 })!;
    expect(plan.mode).toBe("panning");
    expect(plan.path).toHaveLength(100);
  });
  it("checks the track against the frames the scene plays", () => {
    const codes = (reframe: Parameters<typeof inspectReframe>[0], first = 0, last = 119) => inspectReframe(reframe, video, first, last, { width: 360, height: 640 }, "/r").map(p => p.code);
    expect(codes({ track: [] })).toContain("reframe-track");
    expect(codes({ track: [[1, 2, 3, 4, 5, 6], [1, 2, 0, 4, 5, 6]] })).toContain("reframe-track");
    expect(codes({ track: rows, offset: 500 })).toContain("reframe-offset");
    expect(codes({ track: rows.slice(0, 50) })).toContain("reframe-track-short");
    expect(codes({ track: rows, mode: "drone" as never })).toContain("reframe-mode");
    expect(codes({ track: rows, padding: .5 })).toContain("reframe-padding");
    expect(codes({ track: rows })).toEqual([]);
    const fast = inspectReframe({ track: trackRows(track(40, i => i < 20 ? 100 : 860)) }, video, 0, 39, { width: 360, height: 640 }, "/r");
    expect(fast.find(p => p.code === "reframe-fast")?.message).toMatch(/^In the 360×640 output/);
  });
  it("compiles the example for its vertical draft", () => {
    const result = compileFilm(example as unknown as FilmDocument, { outputId: "draft" });
    expect(result.ok).toBe(true);
    expect(result.diagnostics.filter(d => d.severity === "error")).toEqual([]);
  });
});
