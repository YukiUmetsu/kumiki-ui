/**
 * FLORA2 Three.js adapter. Turns engine scenes into instanced meshes inside a `HeroAsset`, so any plant or field shows
 * in the studio viewer (`HeroAssetViewer`) or in a caller's own scene.
 *
 * - **Draw calls.** One `InstancedMesh` per specimen part (axes merged per surface) and per organ template. A specimen
 *   repeated across a layout is one draw call per part; organ instances are composed with each plant's matrix.
 * - **Materials.** `MeshPhysicalMaterial` from the profile's surfaces: roughness, a clear coat for waxy cuticles, sheen
 *   for hairs and bloom, vertex colours (the colour stops), and the underside (abaxial) colour on back faces.
 * - **Textures.** Procedural and deterministic (`DataTexture`, no downloads): bark folds, fissures and rings, stem
 *   striations, cork, coir fibres; leaf vein maps built from the blade's own vein layout, so the veins run between the
 *   cut holes and splits. Each gives a colour, a normal and a roughness map.
 */
import { BufferAttribute, BufferGeometry, Color, DataTexture, DoubleSide, FrontSide, Group, InstancedBufferAttribute, InstancedMesh, LinearFilter, LinearMipmapLinearFilter, Matrix4, MeshPhysicalMaterial, NoColorSpace, RGBAFormat, RepeatWrapping, UnsignedByteType, Vector2, Vector3 } from "three";
import type { Material } from "three";
import { createAssetResources } from "../craft/hero-asset";
import type { HeroAsset, HeroFidelityTier } from "../craft/hero-asset";
import { fbm, fbm3, gradNoise3, linearOf, worley } from "./foundation-raster";
import type { BladeSpec, SpeciesMorphologyProfile, SurfaceSpec } from "./flora-profile";
import type { FloraScene } from "./flora-engine";
import type { FloraOrganBatch } from "./flora-mesh";
import { FLORA_FIDELITY } from "./flora-mesh";
import type { FloraFidelity } from "./flora-mesh";
import { bladeLayout } from "./flora-leaf";
import { clamp, smooth } from "./flora-math";
import type { MeshData } from "./flora-math";

interface Maps { w: number; h: number; colour: Uint8Array; normal: Uint8Array; rough: Uint8Array }
const MAP_CACHE = new Map<string, Maps>();

/** Height field → colour, normal and roughness texels. `shade` maps height to a colour multiplier (≤ 1). */
function bake(w: number, h: number, height: Float32Array, strength: number, shade: (hv: number, i: number) => [number, number, number], rough: (hv: number, i: number) => number): Maps {
  const colour = new Uint8Array(w * h * 4), normal = new Uint8Array(w * h * 4), r = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, hl = height[y * w + (x + w - 1) % w], hr = height[y * w + (x + 1) % w], hd = height[((y + h - 1) % h) * w + x], hu = height[((y + 1) % h) * w + x];
    const nx = (hl - hr) * strength * w / 256, ny = (hd - hu) * strength * h / 256, l = Math.hypot(nx, ny, 1);
    normal.set([(nx / l * 0.5 + 0.5) * 255, (ny / l * 0.5 + 0.5) * 255, (1 / l * 0.5 + 0.5) * 255, 255], i * 4);
    const c = shade(height[i], i);
    colour.set([clamp(c[0]) * 255, clamp(c[1]) * 255, clamp(c[2]) * 255, 255], i * 4);
    const g = clamp(rough(height[i], i)) * 255;
    r.set([g, g, g, 255], i * 4);
  }
  return { w, h, colour, normal, rough: r };
}

/** Tileable bark, stem, root and coir maps: periodic round the axis (u), cross-faded along it (v). */
function axisMaps(kind: SurfaceSpec["texture"], size: number): Maps {
  const key = `axis|${kind}|${size}`, hit = MAP_CACHE.get(key);
  if (hit) return hit;
  const w = size, h = size, H = new Float32Array(w * h), seed = 4242;
  const field = (u: number, v: number) => {
    const c = Math.cos(2 * Math.PI * u), s = Math.sin(2 * Math.PI * u);
    if (kind === "bark-folds") {
      // Long vertical folds, and broken horizontal wrinkle rings (irregular spacing, fading in and out round the trunk).
      const folds = fbm3(seed, c * 1.6, v * 0.8, s * 1.6, 4);
      const ring = Math.sin(2 * Math.PI * (v * 7 + 1.8 * fbm3(seed + 1, c * 1.2, v * 1.5, s * 1.2, 3))), mask = smooth((fbm3(seed + 6, c * 2.5, v * 4, s * 2.5, 3) + 0.1) * 3);
      return 0.55 + 0.32 * folds - 0.1 * Math.max(0, ring) ** 6 * mask + 0.05 * fbm3(seed + 2, c * 12, v * 18, s * 12, 3);
    }
    if (kind === "bark-fissured") {
      const plates = 1 - Math.abs(gradNoise3(seed, c * 3.2, v * 2.2, s * 3.2)), fine = fbm3(seed + 3, c * 14, v * 8, s * 14, 3);
      return 0.15 + 0.7 * plates ** 2.2 + 0.08 * fine;
    }
    if (kind === "bark-ringed") {
      const ring = Math.abs(Math.sin(Math.PI * (v * 14 + 0.5 * fbm3(seed, c, v * 3, s, 2))));
      return 0.6 + 0.12 * fbm3(seed + 4, c * 3, v * 3, s * 3, 3) - 0.22 * (1 - ring) ** 10 + 0.05 * gradNoise3(seed + 5, c * 40, v * 6, s * 40);
    }
    if (kind === "root") { const cell = worley(seed, u * 10, v * 18, 0.9); return 0.45 + 0.4 * clamp(cell.f2 - cell.f1, 0, 0.6) + 0.1 * fbm3(seed, c * 6, v * 9, s * 6, 2); }
    if (kind === "coir") {
      let fib = 0;
      for (let k = 0; k < 3; k++) fib += Math.abs(gradNoise3(seed + 10 * k, c * (18 + k * 7), v * (3 + k * 5), s * (18 + k * 7)));
      return 0.25 + 0.35 * fib + 0.15 * fbm3(seed + 9, c * 4, v * 4, s * 4, 2);
    }
    // Green stems: fine vertical striations and a little mottling.
    return 0.6 + 0.1 * gradNoise3(seed, c * 48, v * 1.5, s * 48) + 0.08 * fbm3(seed + 7, c * 4, v * 4, s * 4, 3);
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = x / w, v = y / h, b = smooth((v - 0.8) / 0.2);
    H[y * w + x] = b > 0 ? field(u, v) * (1 - b) + field(u, v - 1) * b : field(u, v);
  }
  const strength = kind === "bark-fissured" ? 7 : kind === "bark-folds" ? 4 : kind === "coir" ? 5 : kind === "root" ? 4 : 2;
  const maps = bake(w, h, H, strength, hv => { const k = 0.62 + 0.38 * clamp(hv); return [k, k, k]; }, hv => (kind.startsWith("bark") || kind === "coir" || kind === "root" ? 0.75 + 0.25 * (1 - hv) : 0.85));
  MAP_CACHE.set(key, maps);
  return maps;
}

/** Leaf maps in the blade's UV space: midrib, laterals and the areole network from the blade's vein layout. */
function bladeMaps(spec: BladeSpec, kind: SurfaceSpec["texture"], size: number): Maps {
  const key = `blade|${kind}|${size}|${JSON.stringify(spec.veins)}|${spec.width}|${spec.lobe ?? 0}|${spec.widestAt}|${spec.baseShape}|${spec.apexShape}`, hit = MAP_CACHE.get(key);
  if (hit) return hit;
  const L = 1, lay = bladeLayout(spec, L), aspect = 2 * lay.W / (lay.yApex - lay.yBase);
  const h = size, w = Math.max(32, Math.min(size, Math.round(size * aspect * 1.4)));
  const H = new Float32Array(w * h), V = new Float32Array(w * h), mid = spec.veins.midrib * lay.W;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const px = (x / (w - 1) - 0.5) * 2 * lay.W, py = lay.yBase + (y / (h - 1)) * (lay.yApex - lay.yBase), half = Math.max(1e-5, lay.halfWidth(py)), a = Math.abs(px) / half;
    const s = clamp((py - lay.yBase) / (lay.yApex - lay.yBase));
    const midW = mid * (1 - 0.65 * s), dMid = Math.abs(px);
    let vein = Math.exp(-((dMid / Math.max(1e-5, midW)) ** 2)), height = 0.5 + 0.35 * vein;
    if (kind === "parallel-veins" || kind === "petal" || lay.parallel) {
      const n = spec.veins.laterals, k = a * n, d = Math.abs(k - Math.round(k)) * half / n, lw = midW * 0.25 + 1e-5;
      const lat = Math.exp(-((d / lw) ** 2));
      height += 0.08 * lat; vein = Math.max(vein, lat * 0.55);
      height += 0.02 * fbm(77, px * 120, py * 30, 2);
    } else {
      const { k, alpha } = lay.veinAt(px, py), d = Math.abs(k - Math.round(k)) * lay.spacing * Math.sin(alpha), lw = midW * 0.38 * (1 - 0.6 * a) + 1e-5;
      const lat = k > -0.5 && k < lay.laterals - 0.5 ? Math.exp(-((d / lw) ** 2)) : 0;
      // Laterals sink a little into the upper side; the areole network makes fine ridges between them.
      const cell = worley(31, px / (lay.spacing * 0.22), py / (lay.spacing * 0.22), 0.9), net = Math.exp(-(((cell.f2 - cell.f1) / 0.08) ** 2));
      height += -0.12 * lat + 0.035 * net + 0.015 * fbm(91, px * 300, py * 300, 2);
      vein = Math.max(vein, lat * 0.85, net * 0.12);
    }
    if (kind === "farina") height += 0.04 * fbm(55, px * 60, py * 60, 3);
    H[y * w + x] = height; V[y * w + x] = kind === "farina" ? smooth((a - 0.82) / 0.18) : vein;
  }
  const veinTint: [number, number, number] = kind === "petal" ? [1, 0.96, 0.85] : [1.12, 1.12, 0.92];
  const maps = bake(w, h, H, kind === "petal" ? 1.5 : 3, (_, i) => {
    const v = V[i], base = 0.84;
    return [base * (1 - v) + base * veinTint[0] * v, base * (1 - v) + base * veinTint[1] * v, base * (1 - v) + base * veinTint[2] * v];
  }, (_, i) => 0.9 + 0.1 * V[i]);
  MAP_CACHE.set(key, maps);
  return maps;
}

/** Maps hold linear data: the colour map is a multiplier of the vertex colours, not an sRGB picture. */
function texture(maps: Maps, which: "colour" | "normal" | "rough", repeat: boolean): DataTexture {
  const t = new DataTexture(maps[which], maps.w, maps.h, RGBAFormat, UnsignedByteType);
  t.colorSpace = NoColorSpace;
  t.wrapS = t.wrapT = repeat ? RepeatWrapping : t.wrapS;
  t.generateMipmaps = true; t.minFilter = LinearMipmapLinearFilter; t.magFilter = LinearFilter; t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

function geometry(m: MeshData): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(m.positions, 3));
  g.setAttribute("normal", new BufferAttribute(m.normals, 3));
  g.setAttribute("uv", new BufferAttribute(m.uvs, 2));
  g.setAttribute("color", new BufferAttribute(m.colors, 3));
  g.setIndex(new BufferAttribute(m.indices, 1));
  g.computeBoundingSphere();
  return g;
}

export interface FloraAssetOptions {
  id?: string;
  tier?: HeroFidelityTier;
  /** Procedural map size; defaults to the first scene's fidelity. */
  textureSize?: number;
  fidelity?: FloraFidelity;
}

/** Builds a `HeroAsset` (metres) from one or more engine scenes. */
export function createFloraAsset(input: FloraScene | readonly FloraScene[], o: FloraAssetOptions = {}): HeroAsset {
  const scenes = Array.isArray(input) ? input as readonly FloraScene[] : [input as FloraScene];
  const res = createAssetResources(), group = new Group();
  const size = o.textureSize ?? FLORA_FIDELITY[o.fidelity ?? "high_def"].texture;
  const materials = new Map<string, MeshPhysicalMaterial>();
  const materialFor = (profile: SpeciesMorphologyProfile, surfaceKey: string, blade: BladeSpec | undefined, thin: boolean): Material => {
    const key = `${profile.id}|${surfaceKey}|${blade ? JSON.stringify(blade.veins) + blade.width : ""}|${thin}`;
    let m = materials.get(key);
    if (m) return m;
    const s = profile.surfaces[surfaceKey], isAxis = !blade;
    m = res.own(new MeshPhysicalMaterial({ vertexColors: true, roughness: s.roughness, metalness: 0, side: thin ? DoubleSide : FrontSide,
      clearcoat: s.clearcoat ?? 0, clearcoatRoughness: 0.32, sheen: s.sheen ?? 0, sheenRoughness: 0.55, sheenColor: new Color(s.sheenColour ?? "#ffffff"), envMapIntensity: 0.9 }));
    if (s.texture !== "none") {
      const maps = isAxis ? axisMaps(s.texture, Math.min(512, size)) : bladeMaps(blade!, s.texture, size);
      m.map = res.own(texture(maps, "colour", isAxis));
      m.normalMap = res.own(texture(maps, "normal", isAxis));
      m.roughnessMap = res.own(texture(maps, "rough", isAxis));
      m.normalScale = new Vector2(isAxis ? 1 : 0.8, isAxis ? 1 : 0.8);
      // The colour maps average about 0.84; lift the base colour so the profile's colours stay as sampled.
      m.color.setScalar(1 / 0.84);
    }
    if (thin && s.back) {
      const back = new Color().setRGB(...linearOf(s.back));
      m.onBeforeCompile = shader => {
        shader.uniforms.floraBack = { value: back };
        shader.fragmentShader = "uniform vec3 floraBack;\n" + shader.fragmentShader.replace("#include <color_fragment>", "#include <color_fragment>\n  if (!gl_FrontFacing) diffuseColor.rgb = mix(diffuseColor.rgb, floraBack, 0.7);");
      };
      m.customProgramCacheKey = () => `flora-back-${s.back}`;
    }
    materials.set(key, m);
    return m;
  };
  const mat = new Matrix4(), organ = new Matrix4();
  const partNames = new Set<string>();
  let organs = 0, plants = 0;
  for (const scene of scenes) {
    const { profile } = scene;
    plants += scene.placements.length;
    scene.specimens.forEach((sp, v) => {
      const mine = scene.placements.filter(p => p.specimen === v);
      if (!mine.length) return;
      const placeM = mine.map(p => new Matrix4().makeRotationY(p.rotation).scale(new Vector3(p.scale, p.scale, p.scale)).setPosition(scene.origin[0] + p.x, 0, scene.origin[1] + p.z));
      for (const part of sp.parts) {
        const im = new InstancedMesh(res.own(geometry(part.mesh)), materialFor(profile, part.surface, undefined, false), placeM.length);
        placeM.forEach((m, i) => im.setMatrixAt(i, m));
        im.castShadow = im.receiveShadow = true;
        im.computeBoundingSphere();
        const name = `${profile.id}:${part.surface}`;
        res.name(im, name); partNames.add(name);
        group.add(im);
      }
      for (const b of sp.batches) {
        const spec = profile.organs[b.organ], blade = bladeFor(profile, b);
        // Blades and ray florets are single sheets seen from both sides; fleshy leaves, ears and buds are closed.
        const thin = spec.kind === "blade" ? (spec.thickness ?? 0) <= 0.001 : spec.kind === "capitulum" && (b.surface === spec.rays.surface || b.surface === spec.bracts.surface);
        const count = b.count * placeM.length;
        const im = new InstancedMesh(res.own(geometry(b.template)), materialFor(profile, b.surface, blade, thin), count);
        let k = 0;
        for (const pm of placeM) for (let i = 0; i < b.count; i++) {
          organ.fromArray(b.matrices, i * 16);
          mat.multiplyMatrices(pm, organ);
          im.setMatrixAt(k, mat);
          if (b.tints) im.setColorAt(k, new Color(b.tints[i * 3], b.tints[i * 3 + 1], b.tints[i * 3 + 2]));
          k++;
        }
        if (b.tints && im.instanceColor) (im.instanceColor as InstancedBufferAttribute).needsUpdate = true;
        im.castShadow = true; im.receiveShadow = true;
        im.computeBoundingSphere();
        const name = `${profile.id}:${b.organ}`;
        res.name(im, name); partNames.add(name);
        group.add(im);
        organs += count;
      }
    });
  }
  const min: [number, number, number] = [Infinity, 0, Infinity], max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const s of scenes) for (let a = 0; a < 3; a++) { min[a] = Math.min(min[a], s.bounds.min[a]); max[a] = Math.max(max[a], s.bounds.max[a]); }
  // The studio floor is the ground (y = 0): roots and the buried foot go below it.
  min[1] = 0;
  const first = scenes[0], single = scenes.length === 1 && first.placements.length === 1;
  const surfaces = [...new Set(scenes.flatMap(s => Object.entries(s.profile.surfaces).map(([k, v]) => `${s.profile.name} ${k}: roughness ${v.roughness}${v.clearcoat ? `, clear coat ${v.clearcoat}` : ""}${v.sheen ? `, sheen ${v.sheen}` : ""}, ${v.texture} maps`)))];
  const leaf = first.specimens[0]?.leaf;
  return {
    id: o.id ?? scenes.map(s => s.profile.id).join("+"),
    group, bounds: { min, max }, parts: res.parts, tier: o.tier ?? (single ? "hero" : "supporting"),
    exposure: 1,
    studio: { palette: "sand", look: "golden-hour" },
    craft: {
      materials: surfaces,
      details: [
        `${plants} plant${plants === 1 ? "" : "s"} from ${scenes.reduce((s, x) => s + x.specimens.length, 0)} built specimens, ${organs} instanced organs, ${partNames.size} instanced draw groups`,
        ...(leaf ? [`fenestrated blade: ${leaf.splits} splits, ${leaf.holes} holes, holes ${(leaf.holeArea / Math.max(1e-9, leaf.area) * 100).toFixed(1)}% of the leaf`] : []),
        ...scenes.flatMap(s => s.specimens[0]?.forms.length ? [`${s.profile.name} trunk form: ${s.specimens[0].forms[0]}`] : []),
      ],
    },
    metersPerUnit: 1,
    dispose() { res.dispose(); },
  };
}

/** The blade spec whose vein layout a batch's leaf texture follows. */
function bladeFor(profile: SpeciesMorphologyProfile, b: FloraOrganBatch): BladeSpec | undefined {
  const spec = profile.organs[b.organ];
  if (spec.kind === "blade") return spec;
  if (spec.kind === "capitulum" && (b.surface === spec.rays.surface || b.surface === spec.bracts.surface)) return CAPITULUM_PART;
  if (spec.kind === "ear") return CAPITULUM_PART;
  if (spec.kind === "bud") return CAPITULUM_PART;
  return undefined;
}
const CAPITULUM_PART: BladeSpec = { kind: "blade", surface: "", length: { min: 1, typical: 1, max: 1, grade: "estimated" }, width: 0.3, widestAt: 0.45, baseShape: 0.7, apexShape: 0.8, veins: { style: "parallel", laterals: 8, angle: 4, midrib: 0.03 } };
