import { describe, expect, it } from "vitest";
import { eikonal, inspectMaterial, materialFrame, planMaterial } from "../registry/video/film-material";
import type { MaterialKind } from "../registry/video/film-material";
import { encodeWarp } from "../registry/video/film-warp";
import { MATERIAL_SOUNDS, MATERIAL_SOUND_IDS } from "../registry/video/material-sound";
import catalog from "../assets/sound/catalog.json";
import type { EncodedWarp } from "../registry/video/film-warp";
import { compileFilm } from "../registry/video/film-document";
import type { FilmDocument } from "../registry/video/film-document";
import materialFilm from "../examples/film/material.film.json";
import materialShapes from "../examples/film/material-shapes.film.json";
import materialGlass from "../examples/film/material-glass.film.json";
import materialPaper from "../examples/film/material-paper.film.json";
import materialLiquid from "../examples/film/material-liquid.film.json";

const COLS = 96, ROWS = 54, ASPECT = 16 / 9;
const mean = (a: Uint8ClampedArray) => a.reduce((s, v) => s + v, 0) / a.length / 255;

describe("material transitions", () => {
  it("solves fronts: uniform speed gives distance, slow paper holds the front back", () => {
    const speed = new Float32Array(41 * 41).fill(1);
    const d = eikonal(speed, 41, 41, 1, [[20, 20]]);
    // The 16-direction stencil stays within a few percent of Euclidean distance in every direction.
    for (const [x, y] of [[40, 20], [40, 40], [30, 40], [20, 0]] as const) expect(d[x + y * 41] / Math.hypot(x - 20, y - 20)).toBeGreaterThan(0.97);
    for (const [x, y] of [[40, 20], [40, 40], [30, 40]] as const) expect(d[x + y * 41] / Math.hypot(x - 20, y - 20)).toBeLessThan(1.06);
    speed.fill(0.25, 0, 41 * 20);
    expect(eikonal(speed, 41, 41, 1, [[20, 20]])[20]).toBeGreaterThan(d[20] * 2);
    // Faster along the grain: an elliptical front.
    const along = eikonal(new Float32Array(41 * 41).fill(1), 41, 41, 1, [[20, 20]], 1.4, Math.PI / 2);
    expect(along[20 + 0 * 41]).toBeLessThan(along[0 + 20 * 41]);
  });

  it("starts on the old scene and ends on the new, with every overlay gone, for each material", () => {
    for (const material of ["bleed", "burn", "paint", "frost"] as MaterialKind[]) {
      const plan = planMaterial({ material, seed: 4 }, COLS, ROWS, ASPECT);
      const first = materialFrame(plan, 0), last = materialFrame(plan, 1);
      expect(mean(first.reveal)).toBeLessThan(0.02);
      expect(mean(last.reveal)).toBeGreaterThan(0.99);
      for (const layer of last.layers) expect(mean(layer.alpha)).toBeLessThan(0.01);
      // Deterministic: the same seed and size give the same frame.
      expect(materialFrame(planMaterial({ material, seed: 4 }, COLS, ROWS, ASPECT), 0.4)).toEqual(materialFrame(plan, 0.4));
    }
  });

  it("follows each material's physics", () => {
    // Ink on paper spreads as √t: a quarter of the time covers far more than a quarter of the way.
    const bleed = planMaterial({ material: "bleed", seed: 2, origins: [{ x: 0.5, y: 0.5 }] }, COLS, ROWS, ASPECT);
    expect(mean(materialFrame(bleed, 0.25).reveal)).toBeGreaterThan(mean(materialFrame(bleed, 0.75).reveal) * 0.3);
    // Burning paper leaves char behind its glowing front.
    const burn = materialFrame(planMaterial({ material: "burn", seed: 3 }, COLS, ROWS, ASPECT), 0.4);
    expect(burn.layers.find((l) => l.id === "char")!.alpha.some((v) => v > 200)).toBe(true);
    expect(burn.layers.find((l) => l.id === "ember")!.alpha.some((v) => v > 100)).toBe(true);
    // Paint runs down: the top of the frame is painted before the bottom.
    const paint = planMaterial({ material: "paint", seed: 5 }, COLS, ROWS, ASPECT);
    expect(paint.arrival[COLS * 2 + 10]).toBeLessThan(paint.arrival[COLS * (ROWS - 2) + 10]);
    // Frost covers the frame completely at the change, so the swap is hidden.
    const frost = materialFrame(planMaterial({ material: "frost", seed: 1 }, COLS, ROWS, ASPECT), 0.5);
    expect(mean(frost.layers.find((l) => l.id === "frost")!.alpha)).toBeGreaterThan(0.88);
  });

  it("keeps a shape while the material roughens it", () => {
    const plan = planMaterial({ material: "burn", seed: 6, shape: "diamond", origins: [{ x: 0.5, y: 0.5 }] }, COLS, ROWS, ASPECT);
    const at = (x: number, y: number) => plan.arrival[Math.round(x * (COLS - 1)) + Math.round(y * (ROWS - 1)) * COLS];
    // A diamond reaches the points on its axes before the corners at the same distance.
    expect(at(0.5 + 0.25 / ASPECT, 0.5)).toBeLessThan(at(0.5 + 0.18 / ASPECT, 0.68));
  });

  it("checks specs and compiles films with material mattes and shapes", () => {
    expect(inspectMaterial({ material: "glass" as MaterialKind }, 40, 30, "/t").map((p) => p.code)).toContain("material-kind");
    expect(inspectMaterial({ material: "burn", color: "red" }, 40, 30, "/t").map((p) => p.code)).toContain("material-color");
    expect(inspectMaterial({ material: "frost" }, 10, 30, "/t").map((p) => p.code)).toContain("material-timing");
    const film = compileFilm(materialFilm as unknown as FilmDocument, { outputId: "draft" });
    expect(film.ok).toBe(true);
    if (film.ok) expect(Object.values(film.film.mattes).map((m) => m.texture)).toEqual(["bleed", "burn", "paint", "frost"]);
    const shapes = compileFilm(materialShapes as unknown as FilmDocument, { outputId: "draft" });
    expect(shapes.ok).toBe(true);
    if (shapes.ok) expect(Object.values(shapes.film.shapes).map((s) => s.material)).toEqual(["burn", "bleed", "burn", "frost"]);
    const bad = { ...(materialShapes as unknown as FilmDocument), scenes: (materialShapes as unknown as FilmDocument).scenes.map((s) => (s.id === "fall" ? { ...s, transition: { kind: "shape" as const, shape: "mark" as const, material: "burn" as const } } : s)) };
    const refused = compileFilm(bad, { outputId: "draft" });
    expect(refused.ok).toBe(false);
  });

  it("encodes large warps precisely: the browser's two 8-bit passes land within half a pixel", () => {
    // The stage's own grid: 384 columns, 2.5 px cells at 960 px.
    const cols = 384, rows = 216, W = 960, H = 540, n = cols * rows;
    // The browser: feDisplacementMap reads each map bilinearly between cell centres, fine pass first, then coarse.
    const read = (map: Uint8ClampedArray, c: number, px: number, py: number) => {
      const fi = (px / W) * cols - 0.5, fj = (py / H) * rows - 0.5, i0 = Math.floor(fi), j0 = Math.floor(fj), u = fi - i0, v = fj - j0;
      let s = 0;
      for (const [di, dj, w] of [[0, 0, (1 - u) * (1 - v)], [1, 0, u * (1 - v)], [0, 1, (1 - u) * v], [1, 1, u * v]] as const) {
        const a = Math.min(cols - 1, Math.max(0, i0 + di)), b = Math.min(rows - 1, Math.max(0, j0 + dj));
        s += w * map[4 * (a + b * cols) + c];
      }
      return s / 255;
    };
    const browser = (enc: EncodedWarp, px: number, py: number) => {
      let sx = 0, sy = 0, mass = 0;
      for (const b of enc.branches) {
        const m = read(b.coarse, 2, px, py);
        if (m < 1e-3) continue;
        const d1x = b.coarseScale * (read(b.coarse, 0, px, py) - 0.5), d1y = b.coarseScale * (read(b.coarse, 1, px, py) - 0.5);
        const d2x = b.fine ? b.fineScale * (read(b.fine, 0, px + d1x, py + d1y) - 0.5) : 0, d2y = b.fine ? b.fineScale * (read(b.fine, 1, px + d1x, py + d1y) - 0.5) : 0;
        sx += m * (px + d1x + d2x); sy += m * (py + d1y + d2y); mass += m;
      }
      return [sx / mass, sy / mass, mass];
    };
    // Two rigid pieces: one thrown far, one turned and dropped. And a smooth warp far beyond one pass's range.
    const owner = new Int16Array(n), dx = new Float32Array(n), dy = new Float32Array(n), sdx = new Float32Array(n), sdy = new Float32Array(n);
    const turn = 0.3, c = Math.cos(turn), s = Math.sin(turn);
    const truth = (piece: number, x: number, y: number): [number, number] => piece === 0 ? [x - 310, y - 205] : [720 + c * (x + 140 - 720) + s * (y - 420 - 270), 270 - s * (x + 140 - 720) + c * (y - 420 - 270)];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const k = i + j * cols, x = (i + 0.5) * 2.5, y = (j + 0.5) * 2.5;
      owner[k] = x < 480 ? 0 : 1;
      const [rx, ry] = truth(owner[k], x, y);
      dx[k] = (rx - x) / H; dy[k] = (ry - y) / H;
      sdx[k] = (180 * Math.sin((y / H) * Math.PI)) / H; sdy[k] = (140 * Math.cos((x / W) * 2)) / H;
    }
    const rigid = encodeWarp({ dx, dy, owner }, cols, rows, W, H)!, smoothWarp = encodeWarp({ dx: sdx, dy: sdy }, cols, rows, W, H)!;
    expect(rigid.branches.every((b) => b.fine)).toBe(true);
    let worst = 0, worstSmooth = 0;
    for (let py = 25; py < H - 25; py += 7) for (let px = 25; px < W - 25; px += 7) {
      // Only where the picture comes from inside the frame: a material never reads from outside it.
      const inside = (x: number, y: number) => x > 30 && y > 30 && x < W - 30 && y < H - 30;
      const [tx, ty] = truth(px < 480 ? 0 : 1, px, py);
      if (Math.abs(px - 480) > 25 && inside(tx, ty)) {
        const [sx, sy, mass] = browser(rigid, px, py);
        expect(mass).toBeGreaterThan(0.99);
        worst = Math.max(worst, Math.hypot(sx - tx, sy - ty));
      }
      const ux = px + 180 * Math.sin((py / H) * Math.PI), uy = py + 140 * Math.cos((px / W) * 2);
      if (inside(ux, uy)) {
        const [qx, qy] = browser(smoothWarp, px, py);
        worstSmooth = Math.max(worstSmooth, Math.hypot(qx - ux, qy - uy));
      }
    }
    // One 8-bit pass over this range would be off by up to 1.7 px (rigid) and 0.7 px (smooth).
    expect(worst).toBeLessThan(0.5);
    expect(worstSmooth).toBeLessThan(0.5);
  });

  it("breaks glass and bends it", () => {
    const aspect = 16 / 9;
    // Refract: the sheet passes, the flutes pull the view toward their crests, and the scenes change behind it.
    const refract = planMaterial({ material: "refract", seconds: 34 / 30 }, COLS, ROWS, aspect);
    const mid = materialFrame(refract, 0.5);
    expect(mid.warpOut && Math.max(...mid.warpOut.dx.map(Math.abs))).toBeGreaterThan(0.01);
    expect(mean(mid.reveal)).toBeGreaterThan(0.25);
    expect(mean(mid.reveal)).toBeLessThan(0.75);
    for (const p of [0, 1]) expect(materialFrame(refract, p).warpOut!.dx.every((v) => v === 0)).toBe(true);
    // Shatter: cracks run out at once, the shards hold, fall under gravity and are gone by the end.
    const shatter = planMaterial({ material: "shatter", seed: 4, seconds: 44 / 30, origins: [{ x: 0.5, y: 0.45 }] }, COLS, ROWS, aspect);
    const start = materialFrame(shatter, 0.03);
    expect(start.vectors!.some((v) => v.id === "crack-light")).toBe(true);
    expect(start.outClip).toBeUndefined();
    const falling = materialFrame(shatter, 0.55);
    expect(falling.incomingBelow).toBe(true);
    expect(falling.warpOut!.owner!.some((o) => o < 0)).toBe(true);
    const end = materialFrame(shatter, 1);
    expect(end.outClip ?? []).toEqual([]);
    for (const v of end.vectors ?? []) expect(v.rings.length).toBe(0);
    const film = compileFilm(materialGlass as unknown as FilmDocument, { outputId: "draft" });
    expect(film.ok).toBe(true);
    if (film.ok) expect(Object.values(film.film.mattes).map((m) => m.texture)).toEqual(["refract", "shatter", "refract", "shatter"]);
  });

  it("peels and tears paper", () => {
    const aspect = 16 / 9;
    // Peel: nothing lifts at the start; midway the flap shows the page's back, mirrored; at the end the page is gone.
    const peel = planMaterial({ material: "peel" }, COLS, ROWS, aspect);
    const first = materialFrame(peel, 0);
    expect(first.warpOut!.owner!.every((o) => o === 0)).toBe(true);
    const mid = materialFrame(peel, 0.5);
    expect(mid.warpOut!.owner!.some((o) => o === 1)).toBe(true);
    expect(mid.warpOut!.owner!.some((o) => o < 0)).toBe(true);
    expect(mid.vectors!.map((v) => v.id)).toEqual(expect.arrayContaining(["flap", "curl", "peel-shadow"]));
    expect(materialFrame(peel, 1).warpOut!.owner!.every((o) => o < 0)).toBe(true);
    // Tear: the halves open behind the tip, which runs down; once free they leave the frame.
    const tear = planMaterial({ material: "tear", seed: 3 }, COLS, ROWS, aspect);
    const running = materialFrame(tear, 0.3).warpOut!.owner!;
    expect(running.some((o) => o === 0) && running.some((o) => o === 1) && running.some((o) => o < 0)).toBe(true);
    // Below the tip the page is still whole.
    expect(running.slice(running.length - COLS).every((o) => o >= 0)).toBe(true);
    expect(materialFrame(tear, 1).warpOut!.owner!.every((o) => o < 0)).toBe(true);
    // Fold: the right half swings over (its back faces the lens past 90°), then the bottom half, then the packet leaves.
    const fold = planMaterial({ material: "fold" }, COLS, ROWS, aspect);
    expect(materialFrame(fold, 0).warpOut!.owner!.every((o) => o >= 0)).toBe(true);
    const half = materialFrame(fold, 0.4);
    expect(half.vectors!.some((v) => v.id.startsWith("fold-back-"))).toBe(true);
    // Folded in half: the right half of the frame shows the page beneath.
    const right = Array.from({ length: ROWS }, (_, j) => half.warpOut!.owner![j * COLS + COLS - 3]);
    expect(right.every((o) => o < 0)).toBe(true);
    const quarter = materialFrame(fold, 0.72).warpOut!.owner!;
    expect(quarter.filter((o) => o >= 0).length / quarter.length).toBeLessThan(0.3);
    expect(materialFrame(fold, 1).warpOut!.owner!.every((o) => o < 0)).toBe(true);
    const film = compileFilm(materialPaper as unknown as FilmDocument, { outputId: "draft" });
    expect(film.ok).toBe(true);
    if (film.ok) expect(Object.values(film.film.mattes).map((m) => m.texture)).toEqual(["peel", "tear", "fold", "tear"]);
  });

  it("rings out water and drains wax", () => {
    const aspect = 16 / 9;
    // Ripple: the main packet travels at its group velocity, so the revealed disc's radius grows in step with time.
    const ripple = planMaterial({ material: "ripple", seconds: 40 / 30, origins: [{ x: 0.5, y: 0.5 }] }, COLS, ROWS, aspect);
    const radius = (p: number) => Math.sqrt((mean(materialFrame(ripple, p).reveal) * aspect) / Math.PI);
    expect(radius(0.4) / radius(0.2)).toBeGreaterThan(1.7);
    expect(radius(0.4) / radius(0.2)).toBeLessThan(2.3);
    // The splash comes first and is over in under half a second: crown and spray, then only the rings.
    const crown = materialFrame(ripple, 0.025 / (40 / 30)).vectors!.map((v) => v.id);
    expect(crown).toEqual(expect.arrayContaining(["splash-rings", "splash-beads"]));
    expect(materialFrame(ripple, 0.5).vectors!.length).toBe(0);
    // Ahead of the waves the water is still; at the end the surface is calm and the next scene is whole.
    const early = materialFrame(ripple, 0.15).warpOut!;
    expect(early.dx[0]).toBe(0);
    expect(early.dx.some((v) => Math.abs(v) > 0.002)).toBe(true);
    const done = materialFrame(ripple, 1);
    expect(done.warpOut!.dx.every((v) => v === 0)).toBe(true);
    expect(mean(done.reveal)).toBeGreaterThan(0.99);
    // Melt: the layer drains from the top down and stretches; at the end nothing of it is left.
    const melt = planMaterial({ material: "melt", seed: 2 }, COLS, ROWS, aspect);
    const half = materialFrame(melt, 0.5), cover = half.warpOut!.cover!;
    expect(mean(cover.slice(0, COLS * 4))).toBeLessThan(mean(cover.slice(COLS * (ROWS - 4))));
    expect(half.outMatrix![3]).toBeGreaterThan(1.1);
    // Cover is in the layer's own coordinates; the stretched layer runs past the frame's foot, where nothing shows.
    const last = materialFrame(melt, 1), onScreen = Math.floor(ROWS / last.outMatrix![3]) * COLS;
    expect(last.warpOut!.cover!.slice(0, onScreen).every((c) => c === 0)).toBe(true);
    const film = compileFilm(materialLiquid as unknown as FilmDocument, { outputId: "draft" });
    expect(film.ok).toBe(true);
    if (film.ok) expect(Object.values(film.film.mattes).map((m) => m.texture)).toEqual(["ripple", "melt", "ripple", "melt"]);
  });

  it("draws the same material on a finer grid for a larger output", () => {
    // The stage scales the grid with the output (384 columns at 960 px, 768 at 1920 px): coverage must not change with it.
    const aspect = 16 / 9, coverage = (f: ReturnType<typeof materialFrame>) => f.warpOut?.owner ? f.warpOut.owner.filter((o) => o >= 0).length / f.warpOut.owner.length : mean(f.reveal);
    for (const material of ["bleed", "burn", "paint", "frost", "refract", "shatter", "peel", "tear", "ripple"] as MaterialKind[]) {
      const at = (cols: number) => coverage(materialFrame(planMaterial({ material, seed: 3, origins: [{ x: 0.45, y: 0.5 }], seconds: 1.4 }, cols, Math.round((cols * 9) / 16), aspect), 0.5));
      expect(Math.abs(at(384) - at(768)), material).toBeLessThan(0.03);
    }
    // Frost droplets keep their size in the frame: about as many per frame at either grid.
    const drops = (cols: number) => (planMaterial({ material: "frost", seed: 2 }, cols, Math.round((cols * 9) / 16), aspect).droplets!.length / 4);
    expect(drops(768) / drops(384)).toBeGreaterThan(0.85);
    expect(drops(768) / drops(384)).toBeLessThan(1.15);
  });

  it("makes each material's own recorded sound, where the material makes it", () => {
    // Every cue names a recorded CC0 sound in the catalog that may ship with the library.
    for (const id of MATERIAL_SOUND_IDS) {
      const record = (catalog as { sounds: { id: string; origin: string; licenseId: string; redistributable: boolean }[] }).sounds.find((sound) => sound.id === id);
      expect(record, id).toBeDefined();
      expect(record!.origin, id).toBe("recorded");
      expect(record!.licenseId, id).toBe("CC0-1.0");
      expect(record!.redistributable, id).toBe(true);
    }
    const kit = { sounds: Object.fromEntries([["whoosh", { file: "whoosh.wav", peakSeconds: 0.23 }], ...MATERIAL_SOUND_IDS.map((id) => ["catalog:" + id, { file: id + ".wav", peakSeconds: 0.05, catalogId: id }])]) };
    const doc = materialGlass as unknown as FilmDocument, compiled = compileFilm(doc, { outputId: "draft", accentKit: kit });
    expect(compiled.ok).toBe(true);
    if (!compiled.ok) return;
    const sounds = (compiled.film.audio?.sounds ?? []).filter((sound) => sound.id.startsWith("accent/"));
    const at = (scene: string) => compiled.film.cut.transitions.find((item) => item.toShotId === scene)!;
    // The pane breaks on the transition's first frame, and its pieces land about 0.6 s later.
    const shatter = at("dynjandi"), breaking = sounds.filter((sound) => sound.id.startsWith("accent/dynjandi/"));
    expect(breaking.map((sound) => sound.id.split("/").pop())).toEqual(MATERIAL_SOUNDS.shatter.map((cue) => "catalog:" + cue.sound));
    expect(breaking[0].frame).toBe(shatter.startFrame);
    expect(breaking[1].frame).toBe(Math.floor(shatter.startFrame + 0.42 * (shatter.endFrame - shatter.startFrame)));
    // Reeded glass travels past like a pass-by: a whoosh at its middle, even with accents on moves only.
    expect(sounds.filter((sound) => sound.id.startsWith("accent/lagoon/")).map((sound) => sound.id.split("/").pop())).toEqual(["whoosh"]);
    // An authored accent still wins.
    const quiet = { ...doc, scenes: doc.scenes.map((scene) => (scene.id === "dynjandi" ? { ...scene, transition: { ...scene.transition!, accent: "none" as const } } : scene)) };
    const silenced = compileFilm(quiet, { outputId: "draft", accentKit: kit });
    expect(silenced.ok && (silenced.film.audio?.sounds ?? []).some((sound) => sound.id.startsWith("accent/dynjandi/"))).toBe(false);
  });
});
