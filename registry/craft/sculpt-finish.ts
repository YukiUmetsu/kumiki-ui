/** Physically motivated finishes for sculpted (SDF) hero assets.
 *
 * Each finish maps baked occlusion + curvature + orientation to per-vertex
 * albedo, roughness and metalness, the way real objects age:
 * - aged bronze: chemical patina pools in folds and recesses, verdigris only
 *   in the deepest crevices, raised ridges are hand-polished to bright metal;
 * - glazed ceramic: glaze thins on edges and pools darker in recesses;
 * - matte clay: an intentional, art-directed educational maquette look.
 * The returned material reads those attributes through `applySurfaceDetail`.
 */
import { MeshPhysicalMaterial } from "three";
import type { SculptShading } from "./sdf-sculpt";
import { clamp01, fbm3, linearRgb, mix, smoothstep } from "./sdf-sculpt";
import { applySurfaceDetail } from "./surface-detail";
import type { SurfaceDetailKind } from "./surface-detail";

export type SculptFinish = "aged-bronze" | "polished-bronze" | "gold" | "graphite" | "clay" | "chrome" | "ceramic" | "natural";

export interface SculptFinishOptions {
  /** Base tint for clay/ceramic finishes (sRGB hex). */
  tint?: string;
  /** Detail relief style; defaults per finish. */
  detail?: SurfaceDetailKind;
  /** Strand direction for fur detail. */
  flow?: readonly [number, number, number];
  detailFrequency?: number;
  detailStrength?: number;
  seed?: number;
  /** Natural finish: fur/skin sheen tint (sRGB hex). */
  sheenColor?: string;
}

type Rgb = readonly [number, number, number];
const lerp3 = (a: Rgb, b: Rgb, t: number): [number, number, number] =>
  [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];

export function sculptFinishShading(finish: SculptFinish, options: SculptFinishOptions = {}): SculptShading {
  const mottle = fbm3(options.seed ?? 7, 3);
  switch (finish) {
    case "aged-bronze": {
      // Statuary bronze: dark chocolate patina overall, warm metal showing
      // through on ridges, a faint cool verdigris bloom only in tight cavities.
      const polished = linearRgb("#c48b55"), bronze = linearRgb("#6a4429");
      const patina = linearRgb("#2a1c13"), verdigris = linearRgb("#34443a");
      return ({ x, y, z, ny, occlusion, curvature }) => {
        const m = mottle(x * 2.6, y * 2.6, z * 2.6) * .5 + .5;
        const broad = clamp01((1 - occlusion) * 1.3);
        const cavity = clamp01(-curvature * 1.4);
        const recess = clamp01(broad * .7 + cavity * .8);
        const wear = smoothstep(.22, .6, curvature) * (.55 + .45 * clamp01(ny + .4));
        let c = lerp3(bronze, patina, clamp01(.35 + recess * .6 + (m - .5) * .5));
        c = lerp3(c, verdigris, smoothstep(.6, .95, cavity) * smoothstep(.3, .7, broad) * .3);
        c = lerp3(c, polished, wear * .8);
        const rough = mix(mix(1, 1.45, recess), .6, wear) * (.88 + m * .24);
        const metal = mix(mix(.95, .6, smoothstep(.45, .9, recess)), 1, wear);
        return [c[0], c[1], c[2], rough, metal];
      };
    }
    case "polished-bronze": {
      const bright = linearRgb("#d29a62"), deep = linearRgb("#5a3519");
      return ({ x, y, z, occlusion, curvature }) => {
        const m = mottle(x * 3, y * 3, z * 3) * .5 + .5;
        const recess = clamp01((1 - occlusion) * 1.4 + clamp01(-curvature) * .6);
        const c = lerp3(bright, deep, clamp01(recess * .8 + (m - .5) * .15));
        return [c[0], c[1], c[2], mix(.8, 1.3, recess), 1];
      };
    }
    case "gold": {
      const gold = linearRgb("#f2c46b"), deep = linearRgb("#9a6a22");
      return ({ occlusion, curvature }) => {
        const recess = clamp01((1 - occlusion) * 1.3 + clamp01(-curvature) * .5);
        const c = lerp3(gold, deep, recess * .7);
        return [c[0], c[1], c[2], mix(.85, 1.4, recess), 1];
      };
    }
    case "chrome": {
      const steel = linearRgb("#e6e9ec");
      return ({ occlusion }) => [steel[0], steel[1], steel[2], mix(1, 1.6, 1 - occlusion), 1];
    }
    case "graphite": {
      const ink = linearRgb("#2b2f35"), edge = linearRgb("#59616b");
      return ({ occlusion, curvature }) => {
        const c = lerp3(ink, edge, smoothstep(.2, .6, curvature) * .7);
        const shade = mix(.55, 1, occlusion);
        return [c[0] * shade, c[1] * shade, c[2] * shade, mix(1, .7, smoothstep(.2, .6, curvature)), .35];
      };
    }
    case "ceramic": {
      const base = linearRgb(options.tint ?? "#e9b9ad");
      const pooled = lerp3(base, [base[0] * .45, base[1] * .35, base[2] * .35], 1);
      const thin = lerp3(base, [1, .96, .9], .45);
      return ({ occlusion, curvature }) => {
        const recess = clamp01((1 - occlusion) * 1.5 + clamp01(-curvature) * .7);
        let c = lerp3(base, pooled, recess * .6);
        c = lerp3(c, thin, smoothstep(.25, .7, curvature) * .6);
        return [c[0], c[1], c[2], 1, 1];
      };
    }
    case "natural": {
      // Generic living surface; creatures normally pass region-aware shading instead.
      const base = linearRgb(options.tint ?? "#5a3d2a");
      return ({ occlusion }) => {
        const shade = mix(.45, 1, occlusion);
        return [base[0] * shade, base[1] * shade, base[2] * shade, 1, 0];
      };
    }
    case "clay":
    default: {
      const base = linearRgb(options.tint ?? "#d9cbb8");
      return ({ occlusion, curvature }) => {
        const shade = mix(.62, 1, occlusion) * (1 + clamp01(curvature) * .08);
        return [base[0] * shade, base[1] * shade, base[2] * shade, 1, 1];
      };
    }
  }
}

const MATERIAL: Record<SculptFinish, { metalness: number; roughness: number; detail: SurfaceDetailKind;
  clearcoat?: number; clearcoatRoughness?: number }> = {
  "aged-bronze": { metalness: 1, roughness: .4, detail: "cast-metal" },
  "polished-bronze": { metalness: 1, roughness: .24, detail: "cast-metal", clearcoat: .3, clearcoatRoughness: .2 },
  gold: { metalness: 1, roughness: .2, detail: "cast-metal" },
  chrome: { metalness: 1, roughness: .08, detail: "cast-metal" },
  graphite: { metalness: .35, roughness: .55, detail: "cast-metal" },
  clay: { metalness: 0, roughness: .82, detail: "stone" },
  ceramic: { metalness: 0, roughness: .18, detail: "glaze", clearcoat: 1, clearcoatRoughness: .08 },
  natural: { metalness: 0, roughness: .8, detail: "fur" },
};

/** Material that consumes the per-vertex color/surface attributes of a sculpt. */
export function createSculptMaterial(finish: SculptFinish, options: SculptFinishOptions = {}): MeshPhysicalMaterial {
  const spec = MATERIAL[finish];
  const material = new MeshPhysicalMaterial({
    color: "#ffffff", vertexColors: true, metalness: spec.metalness, roughness: spec.roughness,
    clearcoat: spec.clearcoat ?? 0, clearcoatRoughness: spec.clearcoatRoughness ?? .2,
  });
  material.name = "sculpt-" + finish;
  if (finish === "natural") {
    // Fur and hide scatter light at grazing angles: sheen, not specular gloss.
    material.sheen = .65; material.sheenRoughness = .5;
    material.sheenColor.set(options.sheenColor ?? "#8a6a50");
  }
  return applySurfaceDetail(material, {
    kind: options.detail ?? spec.detail, vertexSurface: true, flow: options.flow,
    frequency: options.detailFrequency, strength: options.detailStrength,
  });
}
