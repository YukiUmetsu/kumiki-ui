import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { InstancedMesh } from "three";
import { ReferenceGuidedFloraEngine } from "../registry/anatomy/flora-engine";
import { FLORA_PROFILES, MONSTERA } from "../registry/anatomy/flora-profiles";
import { ENGLISH_OAK, FIDDLE_LEAF_FIG } from "../registry/anatomy/flora-profiles-popular";
import { FloraProfileError, checkFloraProfile } from "../registry/anatomy/flora-profile";
import type { SpeciesMorphologyProfile } from "../registry/anatomy/flora-profile";
import { bladeLayout, buildBlade } from "../registry/anatomy/flora-leaf";
import { UP, cross, dot, heavyElastica, normalize, sub } from "../registry/anatomy/flora-math";
import { growSkeleton } from "../registry/anatomy/flora-skeleton";
import { COCONUT_PALM } from "../registry/anatomy/flora-profiles-popular";
import { SpatialLayoutManager } from "../registry/anatomy/flora-layout";
import { createFloraAsset } from "../registry/anatomy/flora-three";
import { inspectHeroAsset } from "../registry/craft/hero-quality-gate";
import { SOMEI_YOSHINO, WISTERIA } from "../registry/anatomy/flora-profiles-anime";
import type { MeshData } from "../registry/anatomy/flora-math";

/** Connected pieces of a mesh (union-find over its triangles). */
const pieces = (m: MeshData) => {
  const up = Array.from({ length: m.positions.length / 3 }, (_, i) => i), find = (i: number): number => (up[i] === i ? i : (up[i] = find(up[i])));
  for (let t = 0; t < m.indices.length; t += 3) { up[find(m.indices[t + 1])] = find(m.indices[t]); up[find(m.indices[t + 2])] = find(m.indices[t]); }
  return new Set(Array.from(m.indices, i => find(i))).size;
};

const white = () => [1, 1, 1] as const;

describe("FLORA2 profiles", () => {
  it("every reference profile passes the check", () => {
    for (const p of FLORA_PROFILES) expect(checkFloraProfile(p).filter(i => i.level === "error"), p.id).toEqual([]);
  });
  it("names the path of each error in a broken profile", () => {
    const broken = { ...MONSTERA, id: "Bad Id", placements: [{ organ: "nope", on: "stem", place: "along", spacing: 0.1, angle: [0, 0] }] } as SpeciesMorphologyProfile;
    const paths = checkFloraProfile(broken).filter(i => i.level === "error").map(i => i.path);
    expect(paths).toEqual(expect.arrayContaining(["id", "placements[0].organ"]));
    expect(() => new ReferenceGuidedFloraEngine([]).register(broken)).toThrow(FloraProfileError);
  });
  it("ships the three CC0 maps of every scanned bark, listed in the asset manifest", () => {
    const manifest = JSON.parse(readFileSync("assets/THIRD_PARTY_ASSETS.json", "utf8")) as { assetPath: string; license: string }[];
    const scans = new Set(FLORA_PROFILES.flatMap(p => Object.values(p.surfaces).flatMap(s => (s.scan ? [s.scan.id] : []))));
    expect(scans.size).toBeGreaterThanOrEqual(9);
    for (const id of scans) for (const map of ["diff", "nor_gl", "rough"]) {
      const path = `assets/textures/bark/${id}_${map}.jpg`;
      expect(existsSync(path), path).toBe(true);
      expect(manifest.find(a => a.assetPath === path)?.license, path).toBe("CC0-1.0");
    }
  });
});

describe("FLORA2 growth", () => {
  const engine = new ReferenceGuidedFloraEngine();
  it("grows the same plant from the same seed and a different one from another seed", () => {
    const grow = (seed: number) => engine.generate({ speciesProfile: "zea-mays", seed, fidelityLevel: "preview", layoutMode: { mode: "hero" }, growthStage: 1 }).specimens[0].parts[0].mesh.positions;
    expect(Array.from(grow(5))).toEqual(Array.from(new ReferenceGuidedFloraEngine().generate({ speciesProfile: "zea-mays", seed: 5, fidelityLevel: "preview", layoutMode: { mode: "hero" }, growthStage: 1 }).specimens[0].parts[0].mesh.positions));
    expect(Array.from(grow(6))).not.toEqual(Array.from(grow(5)));
  });
  it("grows taller with growth stage", () => {
    const height = (t: number) => engine.generate({ speciesProfile: "helianthus-annuus", seed: 2, fidelityLevel: "preview", layoutMode: { mode: "hero" }, growthStage: t }).specimens[0].height;
    expect(height(0.2)).toBeLessThan(height(0.6));
    expect(height(0.6)).toBeLessThan(height(1));
  });
  it("cuts Monstera holes to the measured sun and shade fractions, and none on juvenile leaves", () => {
    const leaf = MONSTERA.organs.leaf;
    if (leaf.kind !== "blade") throw new Error("Monstera leaf must be a blade");
    const frac = (light: number) => { const s = buildBlade(leaf, { seed: 3, resolution: 64, maturity: 1, holeRows: 3, light, colour: white }).stats; return s.holeArea / s.area; };
    expect(frac(1)).toBeGreaterThan(0.035); expect(frac(1)).toBeLessThan(0.06);
    expect(frac(0)).toBeGreaterThan(0.01); expect(frac(0)).toBeLessThan(0.025);
    const juvenile = buildBlade(leaf, { seed: 3, resolution: 32, maturity: 0.2, holeRows: 3, colour: white }).stats;
    expect(juvenile.holes + juvenile.splits).toBe(0);
  });
  it("droops branches with the heavy elastica and hangs strands straight down", () => {
    const bough = heavyElastica(0.3, 7);
    expect(bough[bough.length - 1]).toBeLessThan(bough[0]);
    const strand = heavyElastica(0.6, 400);
    expect(strand[strand.length - 1]).toBeCloseTo(-Math.PI / 2, 1);
    expect(heavyElastica(0.4, 0).every(a => a === 0.4)).toBe(true);
  });
  it("draws the fiddle's waist and the oak's lobes in the outline", () => {
    const fig = FIDDLE_LEAF_FIG.organs.leaf, oak = ENGLISH_OAK.organs.leaf;
    if (fig.kind !== "blade" || oak.kind !== "blade") throw new Error("leaves must be blades");
    const f = bladeLayout(fig, 1), w = (s: number) => f.halfWidth(f.yBase + s * (f.yApex - f.yBase));
    expect(w(0.42)).toBeLessThan(w(0.72) * 0.9);
    const o = bladeLayout(oak, 1), samples = Array.from({ length: 101 }, (_, i) => o.halfWidth(o.yBase + (0.15 + 0.7 * i / 100) * (o.yApex - o.yBase)));
    const sinuses = samples.filter((v, i) => i > 0 && i < 100 && v < samples[i - 1] && v < samples[i + 1]).length;
    expect(sinuses).toBeGreaterThanOrEqual(2);
  });
  it("builds a tulip of six tepals and six stamens, and coconut pinnae on both sides of the rachis", () => {
    // One flower is one instance per part: its six tepals, and its six stamens (each a filament and an anther), are
    // merged pieces of one template.
    const tulip = engine.organ("tulipa-gesneriana", "flower", "preview", 1).specimens[0].batches;
    const part = (surface: string) => tulip.filter(b => b.surface === surface);
    expect(part("tepal").map(b => [b.count, pieces(b.template)])).toEqual([[1, 6]]);
    expect(part("anther").map(b => [b.count, pieces(b.template)])).toEqual([[1, 12]]);
    const sk = growSkeleton(COCONUT_PALM, { seed: 3, stage: 1, density: 1, detail: 1, maxOrgans: 1e5 });
    const frond = sk.axes.find(a => a.rule.id === "frond")!, t = normalize(sub(frond.nodes[4].p, frond.nodes[3].p)), side = normalize(cross(t, UP));
    const near = sk.organs.filter(o => o.organ === "pinna" && Math.hypot(...sub(o.p, frond.nodes[4].p)) < 0.4);
    const left = near.filter(o => dot(o.y, side) > 0).length, right = near.filter(o => dot(o.y, side) < 0).length;
    expect(left).toBeGreaterThan(2); expect(right).toBeGreaterThan(2);
  });
  it("hangs wisteria racemes, lays fallen petals flat under the sakura, and draws distant blossom as cheap stars", () => {
    const wisteria = growSkeleton(WISTERIA, { seed: 2, stage: 1, density: 0.4, detail: 0.6, maxOrgans: 3e4 }).organs.filter(o => o.organ === "raceme");
    expect(wisteria.length).toBeGreaterThan(10);
    expect(wisteria.every(o => o.z[1] < -0.9)).toBe(true);
    const sakura = growSkeleton(SOMEI_YOSHINO, { seed: 2, stage: 1, density: 0.4, detail: 0.6, maxOrgans: 6e4 }).organs, fallen = sakura.filter(o => o.litter);
    expect(fallen.length).toBeGreaterThan(500);
    expect(fallen.every(o => o.p[1] < 0.01 && Math.abs(o.z[1]) === 1)).toBe(true);
    const avenue = engine.generate({ speciesProfile: "prunus-yedoensis", seed: 4, fidelityLevel: "preview", layoutMode: { mode: "hero" }, growthStage: 1 }).specimens[0].batches;
    const flowers = avenue.filter(b => b.organ === "flower");
    expect(flowers.length).toBeGreaterThan(0);
    // A cluster of four to six star florets: ten triangles per floret.
    for (const b of flowers) expect(b.template.indices.length / 3).toBeLessThanOrEqual(60);
  });
  it("keeps the dragon tree's crown near the measured width (1.69 × height)", () => {
    const sp = engine.generate({ speciesProfile: "dracaena-cinnabari", seed: 4, fidelityLevel: "preview", layoutMode: { mode: "hero" }, growthStage: 1 }).specimens[0];
    const ratio = (sp.bounds.max[0] - sp.bounds.min[0]) / (sp.bounds.max[1] - Math.max(0, sp.bounds.min[1]));
    expect(ratio).toBeGreaterThan(1.3); expect(ratio).toBeLessThan(2.1);
  });
});

describe("FLORA2 layout", () => {
  it("keeps the row pitch and the stagger", () => {
    const rows = new SpatialLayoutManager({ spacing: 0.155, rowPitch: 0.76 }).place({ mode: "rows", rowCount: 3, plantsPerRow: 5, staggerOffset: 0.5, organicJitter: 0 }, 1, 2);
    expect(rows).toHaveLength(15);
    expect(rows[5].z - rows[0].z).toBeCloseTo(0.76, 6);
    expect(rows[5].x - rows[0].x).toBeCloseTo(0.0775, 6);
  });
  it("keeps the Poisson-disc spacing of ground cover", () => {
    const pts = new SpatialLayoutManager({ spacing: 0.5 }).place({ mode: "ground-cover", width: 4, depth: 4, density: 4 }, 2, 3), r = 0.9 / Math.sqrt(4);
    expect(pts.length).toBeGreaterThan(20);
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) expect(Math.hypot(pts[i].x - pts[j].x, pts[i].z - pts[j].z)).toBeGreaterThanOrEqual(r - 1e-9);
  });
});

describe("FLORA2 engine and Three adapter", () => {
  it("registers a profile at run time and builds an instanced asset that passes the structural gate", () => {
    const engine = new ReferenceGuidedFloraEngine();
    const custom: SpeciesMorphologyProfile = { ...MONSTERA, id: "custom-aroid", name: "Custom aroid" };
    engine.register(custom);
    const scene = engine.generate({ speciesProfile: "custom-aroid", seed: 1, fidelityLevel: "preview", layoutMode: { mode: "grove", count: 3 }, growthStage: 1, variants: 2 });
    expect(scene.placements).toHaveLength(3);
    const asset = createFloraAsset(scene, { fidelity: "preview", textureSize: 64 });
    try {
      const meshes = asset.group.children.filter((c): c is InstancedMesh => c instanceof InstancedMesh);
      expect(meshes.length).toBe(scene.stats.drawCalls);
      expect(meshes.reduce((s, m) => s + m.count, 0)).toBeGreaterThan(scene.stats.plants);
      const report = inspectHeroAsset(asset);
      expect(report.issues.filter(i => i.severity === "error")).toEqual([]);
    } finally { asset.dispose(); }
  });
});
