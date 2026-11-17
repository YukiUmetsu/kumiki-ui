import { describe, expect, it } from "vitest";

import {
  AdvancedShapeMorph, morphFrameToSvgPaths, resolveMorphEasing, traceMorphFrame,
} from "../registry/motion/advanced-morph";
import type { MorphTopologyStrategy } from "../registry/motion/advanced-morph";
import {
  countCrossings, flattenSvgPath, parseSvgPath, pointInPolygon, ringArea,
} from "../registry/motion/advanced-morph-geometry";
import { traceAlphaContours } from "../registry/motion/advanced-morph-text";
import { AdvancedShapeMorphMesh, MorphExtrusionGeometry } from "../registry/motion/advanced-morph-three";
import { MeshStandardMaterial } from "three";

const circle = (cx: number, cy: number, r: number) => `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0z`;
const square = "M20 20 H180 V180 H20 Z";
const triangle: [number, number][] = [[100, 10], [190, 180], [10, 180]];
const dots = [circle(100, 40, 30), circle(40, 150, 30), circle(160, 150, 30)].join(" ");
const ringWithHole = `${circle(100, 100, 80)} ${circle(100, 100, 40)}`;
const capsuleWithTwoHoles = `M40 60 A60 60 0 0 1 160 60 L160 140 A60 60 0 0 1 40 140 Z ${circle(100, 60, 22)} ${circle(100, 145, 25)}`;

function hasPoint(ring: Float32Array, x: number, y: number): boolean {
  for (let i = 0; i < ring.length; i += 2) if (Math.abs(ring[i] - x) < 1e-3 && Math.abs(ring[i + 1] - y) < 1e-3) return true;
  return false;
}

function maxTransitCrossings(morph: AdvancedShapeMorph): number {
  let worst = 0;
  for (let k = 1; k < 60; k += 1) {
    for (const component of morph.update(k / 60).components) worst = Math.max(worst, countCrossings([component.outer, ...component.holes], 99));
  }
  return worst;
}

describe("advanced morph — SVG path data", () => {
  it("parses every command family, relative forms and compact arc flags", () => {
    const parsed = parseSvgPath("M0 0h10v10H0zm20 0c5-5 10 5 15 0s5 5 10 0q5-5 10 0t10 0a5 5 0 0010 0l0 10z");
    expect(parsed.error).toBeUndefined();
    const rings = flattenSvgPath(parsed.segments, 0.05);
    expect(rings).toHaveLength(2);
    expect(Math.abs(ringArea(rings[0]))).toBeCloseTo(100, 6);
  });

  it("keeps the geometry before a syntax error and reports it", () => {
    const morph = new AdvancedShapeMorph(`${square} L 40 oops`, circle(100, 100, 60));
    expect(morph.diagnostics.map((d) => d.code)).toContain("morph-parse-error");
    expect(morph.plan.source.components).toBe(1);
  });
});

describe("advanced morph — correspondence", () => {
  it("keeps every authored corner exact at both ends", () => {
    const morph = new AdvancedShapeMorph(square, triangle);
    const start = morph.update(0).components[0].outer;
    for (const [x, y] of [[20, 20], [180, 20], [180, 180], [20, 180]]) expect(hasPoint(start, x, y)).toBe(true);
    const end = morph.update(1).components[0].outer;
    for (const [x, y] of triangle) expect(hasPoint(end, x, y)).toBe(true);
  });

  it("writes every frame into the same objects and buffers", () => {
    const morph = new AdvancedShapeMorph(circle(100, 100, 80), square);
    const first = morph.update(0.2);
    const buffer = first.components[0].outer;
    const second = morph.update(0.8);
    expect(second).toBe(first);
    expect(second.components[0].outer).toBe(buffer);
  });

  it("pins anchors so the chosen points travel to each other", () => {
    const morph = new AdvancedShapeMorph(square, triangle, {
      alignment: { mode: "anchors", anchors: [{ from: { x: 180, y: 180 }, to: { x: 100, y: 10 } }] },
    });
    const [pair] = morph.correspondence();
    const index = Array.from({ length: pair.from.length / 2 }, (_, i) => i)
      .find((i) => Math.abs(pair.from[2 * i] - 180) < 1e-3 && Math.abs(pair.from[2 * i + 1] - 180) < 1e-3);
    expect(index).toBeDefined();
    expect(pair.to[2 * index!]).toBeCloseTo(100, 3);
    expect(pair.to[2 * index! + 1]).toBeCloseTo(10, 3);
  });
});

describe("advanced morph — topology", () => {
  it.each<[MorphTopologyStrategy, string[]]>([
    ["split-merge", ["morph", "split", "split"]],
    ["partition", ["partition", "partition", "partition"]],
    ["emerge", ["morph", "emerge", "emerge"]],
    ["cross-dissolve", ["morph", "fade-in", "fade-in"]],
  ])("splits one part into three with %s and makes no transit crossing", (strategy, kinds) => {
    const morph = new AdvancedShapeMorph(circle(100, 100, 90), dots, { topologyStrategy: strategy });
    expect(morph.frame.components.map((c) => c.kind).sort()).toEqual([...kinds].sort());
    expect(maxTransitCrossings(morph)).toBe(0);
    expect(morph.diagnostics).toEqual([]);
  });

  it("cuts partition pieces that tile the source (within the hairline overlap)", () => {
    const morph = new AdvancedShapeMorph(circle(100, 100, 90), dots, { topologyStrategy: "partition" });
    const area = morph.update(0).components.reduce((sum, c) => sum + ringArea(c.outer), 0);
    expect(area / (Math.PI * 90 * 90)).toBeGreaterThan(0.995);
    expect(area / (Math.PI * 90 * 90)).toBeLessThan(1.01);
  });

  it("fades only the extra parts in cross-dissolve", () => {
    const morph = new AdvancedShapeMorph(dots, circle(100, 100, 90), { topologyStrategy: "cross-dissolve" });
    const fading = morph.update(0).components.filter((c) => c.kind === "fade-out");
    expect(fading.map((c) => c.opacity)).toEqual([1, 1]);
    expect(morph.update(1).components.filter((c) => c.kind === "fade-out").map((c) => c.opacity)).toEqual([0, 0]);
  });

  it("grows a new hole from a point inside the source fill", () => {
    const morph = new AdvancedShapeMorph(ringWithHole, capsuleWithTwoHoles);
    expect(morph.plan.source.holes).toBe(1);
    expect(morph.plan.target.holes).toBe(2);
    const start = morph.update(0).components[0];
    const outer = Float64Array.from(start.outer);
    const collapsed = start.holes.find((hole) => hole.every((v, i) => v === hole[i % 2]));
    expect(collapsed).toBeDefined();
    expect(pointInPolygon(collapsed![0], collapsed![1], outer, start.holes.filter((h) => h !== collapsed).map((h) => Float64Array.from(h)))).toBe(true);
    expect(maxTransitCrossings(morph)).toBe(0);
  });

  it("closes a hole into a point inside the target fill", () => {
    const morph = new AdvancedShapeMorph(ringWithHole, square);
    const end = morph.update(1).components[0];
    expect(end.holes).toHaveLength(1);
    const hole = end.holes[0];
    expect(hole.every((v, i) => v === hole[i % 2])).toBe(true);
    expect(pointInPolygon(hole[0], hole[1], Float64Array.from(end.outer), [])).toBe(true);
  });
});

describe("advanced morph — resilience and configuration", () => {
  it("survives empty, nonfinite and zero-area input without throwing", () => {
    const morph = new AdvancedShapeMorph("", [[0, 0], [10, 0], [20, 0]]);
    expect(morph.frame.components).toHaveLength(0);
    expect(morph.diagnostics.map((d) => d.code)).toEqual(expect.arrayContaining(["morph-degenerate-ring", "morph-empty-shapes"]));
    const grows = new AdvancedShapeMorph([[Number.NaN, 1]], square);
    expect(grows.frame.components.map((c) => c.kind)).toEqual(["emerge"]);
  });

  it("resolves elastic, bezier and custom easing", () => {
    const elastic = resolveMorphEasing({ elastic: { direction: "out" } });
    expect(elastic(0)).toBe(0);
    expect(elastic(1)).toBe(1);
    expect(Math.max(...Array.from({ length: 50 }, (_, i) => elastic(i / 50)))).toBeGreaterThan(1);
    expect(resolveMorphEasing({ cubicBezier: [0, 0, 1, 1] })(0.3)).toBeCloseTo(0.3, 6);
    expect(resolveMorphEasing((t) => t * t)(0.5)).toBe(0.25);
  });

  it("changes easing without a new plan and rebuilds for geometry keys", () => {
    const morph = new AdvancedShapeMorph(circle(100, 100, 90), dots);
    const plan = morph.plan;
    morph.configure({ easing: "linear" });
    expect(morph.plan).toBe(plan);
    expect(morph.update(0.5).eased).toBe(0.5);
    morph.configure({ topologyStrategy: "emerge" });
    expect(morph.plan).not.toBe(plan);
    expect(morph.plan.kinds.emerge).toBe(2);
  });

  it("throws after dispose", () => {
    const morph = new AdvancedShapeMorph(square, triangle);
    morph.dispose();
    expect(() => morph.update(0.5)).toThrow(/dispose/);
  });

  it("traces frames into a path sink and groups opaque SVG paths", () => {
    const morph = new AdvancedShapeMorph(dots, ringWithHole, { topologyStrategy: "cross-dissolve" });
    const calls = { moveTo: 0, lineTo: 0, closePath: 0 };
    traceMorphFrame({ moveTo: () => calls.moveTo++, lineTo: () => calls.lineTo++, closePath: () => calls.closePath++ }, morph.update(0.5));
    expect(calls.moveTo).toBe(calls.closePath);
    expect(calls.moveTo).toBe(morph.frame.components.reduce((sum, c) => sum + 1 + c.holes.length, 0));
    const paths = morphFrameToSvgPaths(morph.frame);
    expect(paths[0].opacity).toBe(1);
    expect(paths.slice(1).every((path) => path.opacity > 0 && path.opacity < 1)).toBe(true);
  });
});

describe("advanced morph — intrinsic blending", () => {
  const cShape: [number, number][] = [[40, 20], [170, 20], [170, 60], [80, 60], [80, 140], [170, 140], [170, 180], [40, 180]];
  const turned = cShape.map(([x, y]): [number, number] => {
    const a = (120 * Math.PI) / 180;
    return [100 + Math.cos(a) * (x - 100) - Math.sin(a) * (y - 100), 100 + Math.sin(a) * (x - 100) + Math.cos(a) * (y - 100)];
  });
  const fixed = { alignment: { mode: "centroid" as const, rotation: "none" as const } };

  it("removes the crossings that straight paths make on a turning shape", () => {
    expect(maxTransitCrossings(new AdvancedShapeMorph(cShape, turned, { ...fixed, interpolation: "linear" }))).toBeGreaterThan(0);
    expect(maxTransitCrossings(new AdvancedShapeMorph(cShape, turned, { ...fixed, interpolation: "intrinsic" }))).toBe(0);
    expect(maxTransitCrossings(new AdvancedShapeMorph(cShape, turned, { ...fixed, interpolation: "auto" }))).toBe(0);
  });

  it("lands exactly on both ends", () => {
    const morph = new AdvancedShapeMorph(cShape, turned, { ...fixed, interpolation: "intrinsic" });
    const [pair] = morph.correspondence();
    const start = morph.update(0).components[0].outer;
    start.forEach((value, i) => expect(value).toBeCloseTo(pair.from[i], 3));
    const end = morph.update(1).components[0].outer;
    end.forEach((value, i) => expect(value).toBeCloseTo(pair.to[i], 3));
  });
});

describe("advanced morph — traced outlines", () => {
  function annulusCoverage(size: number, outer: number, inner: number): Uint8ClampedArray {
    const alpha = new Uint8ClampedArray(size * size);
    const c = size / 2;
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        let hits = 0;
        for (let sy = 0; sy < 4; sy += 1) for (let sx = 0; sx < 4; sx += 1) {
          const r = Math.hypot(x + (sx + 0.5) / 4 - c, y + (sy + 0.5) / 4 - c);
          if (r <= outer && r >= inner) hits += 1;
        }
        alpha[y * size + x] = Math.round((hits / 16) * 255);
      }
    }
    return alpha;
  }

  it("traces antialiased edges to sub-pixel accuracy and nests the counter as a hole", () => {
    const rings = traceAlphaContours(annulusCoverage(100, 40, 18), 100, 100);
    expect(rings).toHaveLength(2);
    const outer = rings.find((ring) => Math.abs(ring[0][0] - 50) > 30 || Math.abs(ring[0][1] - 50) > 30)!;
    for (const [x, y] of outer) expect(Math.abs(Math.hypot(x - 50, y - 50) - 40)).toBeLessThan(0.15);
    const morph = new AdvancedShapeMorph(rings, square);
    expect(morph.plan.source).toEqual({ components: 1, holes: 1 });
  });

  it("resolves saddle cells by their mean value", () => {
    const checker = Uint8ClampedArray.from([255, 0, 0, 255]);
    expect(traceAlphaContours(checker, 2, 2, { minArea: 0 })).toHaveLength(1);
    const sparse = Uint8ClampedArray.from([200, 0, 0, 200]);
    expect(traceAlphaContours(sparse, 2, 2, { minArea: 0 })).toHaveLength(2);
  });
});

describe("advanced morph — Three.js extrusion", () => {
  it("writes finite geometry with one group per part and indices inside the buffers", () => {
    const morph = new AdvancedShapeMorph(ringWithHole, dots, { topologyStrategy: "cross-dissolve" });
    const geometry = new MorphExtrusionGeometry(morph, { depth: [10, 30] });
    for (const t of [0, 0.3, 0.7, 1]) {
      geometry.update(t);
      const positions = geometry.getAttribute("position").array;
      expect(Array.from(positions).every(Number.isFinite)).toBe(true);
      const vertices = positions.length / 3;
      const index = geometry.index!.array;
      for (let i = 0; i < geometry.drawRange.count; i += 1) expect(index[i]).toBeLessThan(vertices);
      expect(geometry.groups).toHaveLength(morph.frame.components.length);
    }
  });

  it("rebuilds after a new plan and moves the mesh between its poses", () => {
    const morph = new AdvancedShapeMorph(circle(100, 100, 90), dots);
    const mesh = new AdvancedShapeMorphMesh(morph, {
      material: new MeshStandardMaterial(),
      pose: { from: { position: [-1, 0, 0], scale: 0.5 }, to: { position: [1, 0, 0], rotation: [0, Math.PI / 2, 0], scale: 2 } },
    });
    mesh.update(0);
    expect(mesh.position.x).toBeCloseTo(-1, 6);
    expect(mesh.scale.x).toBeCloseTo(0.5, 6);
    mesh.update(1);
    expect(mesh.position.x).toBeCloseTo(1, 6);
    expect(mesh.scale.x).toBeCloseTo(2, 6);
    morph.configure({ topologyStrategy: "cross-dissolve" });
    mesh.update(0.5);
    expect(mesh.material).toHaveLength(3);
    expect(mesh.material.filter((material) => material.transparent)).toHaveLength(2);
    mesh.dispose();
  });
});
