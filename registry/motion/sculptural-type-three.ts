/**
 * Three.js adapter for sculptural typography (registry item `sculptural-type-three`).
 *
 * `SculpturalTextObject` draws a `SculpturalText` plan: one mesh per unit inside a pivot group, so poses turn and
 * squash about the right point. Geometry buffers are the plan's own arrays; a frame re-uploads only the units whose
 * deformers changed.
 *
 * `sculptMaterial(record, texture)` makes a physical material from a measured material: base colour, metalness,
 * roughness and index of refraction, plus maps baked from the texture's recipe at real size (one em = `emMm` mm):
 * colour, roughness and metalness, and a normal map from the surface height. Optics carry over: brushed metals get
 * anisotropy, clear materials transmit, nacre gets iridescence, lacquers a clear coat. The inputs are structural, so
 * MATL1's `findMaterial(id)` and `materialTexture(id)` (`registry/materials`) fit directly, without this item depending
 * on the materials pack.
 */

import {
  BufferAttribute, BufferGeometry, DataTexture, Group, Mesh, MeshPhysicalMaterial, MirroredRepeatWrapping, RGBAFormat,
  SRGBColorSpace, Sphere, Vector3, LinearMipmapLinearFilter, LinearFilter,
} from "three";
import type { Material } from "three";

import { SculpturalText } from "./sculptural-type";
import type { SculptGlyph, SculpturalTextPlan, SculpturalTextSpec } from "./sculptural-type";

/* ------------------------------------------------------------------ *
 * Materials
 * ------------------------------------------------------------------ */

/** A measured material: MATL1's `MaterialRecord` fits. Colours are linear-light RGB 0–1. */
export interface SculptMaterialRecord {
  name: string;
  family: string;
  /** Linear albedo, or a metal's reflectance at normal incidence. */
  albedo: readonly [number, number, number];
  metal: 0 | 1;
  roughness: { typical: number };
  ior?: number;
}

/** One point of a surface texture, in mm; MATL1's `TexSample` fits. */
export interface SculptSurfaceSample {
  a: readonly [number, number, number];
  /** Height, mm. */
  h: number;
  r: number;
  m?: number;
}

/** A surface texture at real size; MATL1's `MaterialTexture` fits. */
export interface SculptMaterialTexture {
  sample(x: number, y: number, footprint?: number): SculptSurfaceSample;
  optics: { anisotropy?: number; transmit?: boolean; thinFilm?: number };
}

export interface SculptMaterialOptions {
  /** Physical size of one em, in millimetres; sets how large grain, fibres and veins appear. @default 120 */
  emMm?: number;
  /** Baked map size in pixels. @default 512 */
  textureSize?: number;
  /** Another piece of the same material. @default 7 */
  seed?: number;
  /** Normal map strength. @default 1 */
  relief?: number;
  /**
   * How much of the material's surface variation to keep, 0–1: 1 is the measured texture (grain, veins, fibres,
   * polishing marks), 0 a clean uniform surface. Wear and marks are storytelling, so lower it for pristine objects.
   * @default 1
   */
  detail?: number;
}

/** MATL1 material ids that read well as letters, for pickers. Any MATL1 material works. */
export const SCULPT_MATERIAL_PRESETS = [
  "gold", "brass", "copper", "chromium", "stainless-steel", "aluminium", "bronze-old",
  "porcelain", "terracotta", "marble", "granite", "slate", "concrete",
  "wood-light", "wood-mid", "lacquer-red", "lacquer-black", "glass", "paper-kraft", "paper-washi", "pearl",
] as const;

/** UV span of a baked map, in em, and its centre: the maps cover u, v ∈ [−0.5, 1.5] and mirror beyond. */
const MAP_SPAN_EM = 2;
const MAP_START_EM = -0.5;

const encodeSrgb = (value: number) => {
  const x = Math.min(1, Math.max(0, value));
  return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
};

/**
 * A `MeshPhysicalMaterial` for a measured material. Without a texture the surface is uniform. With MATL1:
 * `sculptMaterial(findMaterial("marble")!, materialTexture("marble"))`. The caller owns the material and its textures;
 * dispose them with {@link disposeSculptMaterial}.
 */
export function sculptMaterial(record: SculptMaterialRecord, texture?: SculptMaterialTexture, options: SculptMaterialOptions = {}): MeshPhysicalMaterial {
  const standard = { roughness: Math.min(1, Math.max(0, record.roughness.typical)), ior: record.ior };
  const surfaceOf: SculptMaterialTexture = texture ?? {
    sample: () => ({ a: record.albedo, h: 0, r: standard.roughness, m: record.metal }),
    optics: {},
  };
  // A uniform surface needs only a tiny map.
  const size = texture ? Math.max(32, Math.min(2048, Math.round(options.textureSize ?? 512))) : 4;
  const emMm = options.emMm ?? 120;
  const spanMm = MAP_SPAN_EM * emMm;
  const pixelMm = spanMm / size;
  const detail = Math.min(1, Math.max(0, options.detail ?? 1));
  const samples = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      samples.push(surfaceOf.sample(MAP_START_EM * emMm + (x + 0.5) * pixelMm, MAP_START_EM * emMm + (y + 0.5) * pixelMm, pixelMm));
    }
  }
  // Blend each sample toward the map's mean by `detail`, so a clean surface keeps the material's measured average.
  const mean = { a: [0, 0, 0], r: 0, m: 0 };
  for (const s of samples) {
    mean.a[0] += s.a[0] / samples.length;
    mean.a[1] += s.a[1] / samples.length;
    mean.a[2] += s.a[2] / samples.length;
    mean.r += s.r / samples.length;
    mean.m += (s.m ?? record.metal) / samples.length;
  }
  const mix = (average: number, value: number) => average + (value - average) * detail;
  const colour = new Uint8Array(size * size * 4);
  const surface = new Uint8Array(size * size * 4);
  const heights = new Float32Array(size * size);
  samples.forEach((s, i) => {
    colour[4 * i] = Math.round(encodeSrgb(mix(mean.a[0], s.a[0])) * 255);
    colour[4 * i + 1] = Math.round(encodeSrgb(mix(mean.a[1], s.a[1])) * 255);
    colour[4 * i + 2] = Math.round(encodeSrgb(mix(mean.a[2], s.a[2])) * 255);
    colour[4 * i + 3] = 255;
    // three reads roughness from green and metalness from blue.
    surface[4 * i + 1] = Math.round(Math.min(1, Math.max(0, mix(mean.r, s.r))) * 255);
    surface[4 * i + 2] = Math.round(Math.min(1, Math.max(0, mix(mean.m, s.m ?? record.metal))) * 255);
    surface[4 * i + 3] = 255;
    heights[i] = s.h * detail;
  });
  const normal = new Uint8Array(size * size * 4);
  const strength = options.relief ?? 1;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const h = (px: number, py: number) => heights[((py + size) % size) * size + ((px + size) % size)];
      const dx = ((h(x + 1, y) - h(x - 1, y)) / (2 * pixelMm)) * strength;
      const dy = ((h(x, y + 1) - h(x, y - 1)) / (2 * pixelMm)) * strength;
      const length = Math.hypot(dx, dy, 1);
      const i = 4 * (y * size + x);
      normal[i] = Math.round((-dx / length * 0.5 + 0.5) * 255);
      normal[i + 1] = Math.round((-dy / length * 0.5 + 0.5) * 255);
      normal[i + 2] = Math.round((1 / length * 0.5 + 0.5) * 255);
      normal[i + 3] = 255;
    }
  }
  const map = (data: Uint8Array, srgb: boolean) => {
    const t = new DataTexture(data, size, size, RGBAFormat);
    if (srgb) t.colorSpace = SRGBColorSpace;
    t.wrapS = MirroredRepeatWrapping;
    t.wrapT = MirroredRepeatWrapping;
    t.repeat.set(1 / MAP_SPAN_EM, 1 / MAP_SPAN_EM);
    t.offset.set(-MAP_START_EM / MAP_SPAN_EM, -MAP_START_EM / MAP_SPAN_EM);
    t.magFilter = LinearFilter;
    t.minFilter = LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.anisotropy = 8;
    t.needsUpdate = true;
    return t;
  };
  const colourMap = map(colour, true);
  const surfaceMap = map(surface, false);
  const optics = surfaceOf.optics;
  const material = new MeshPhysicalMaterial({
    name: `sculpt:${record.name}`,
    color: 0xffffff,
    map: colourMap,
    roughness: 1,
    metalness: 1,
    roughnessMap: surfaceMap,
    metalnessMap: surfaceMap,
    normalMap: map(normal, false),
    ior: standard.ior ?? 1.5,
  });
  if (optics.anisotropy) {
    material.anisotropy = optics.anisotropy;
    material.anisotropyRotation = 0;
  }
  if (optics.transmit) {
    material.transmission = 1;
    material.thickness = 0.4;
    material.roughness = Math.min(1, standard.roughness * 2);
  }
  if (optics.thinFilm) {
    material.iridescence = 1;
    material.iridescenceIOR = 1.53;
    material.iridescenceThicknessRange = [optics.thinFilm * 600, optics.thinFilm * 1000];
  }
  if (record.family === "lacquer") {
    material.clearcoat = 1;
    material.clearcoatRoughness = 0.08;
  } else if (record.family === "ceramic" && standard.roughness < 0.4) {
    material.clearcoat = 0.6;
    material.clearcoatRoughness = 0.12;
  }
  return material;
}

/** Dispose a material made by {@link sculptMaterial} and its baked maps. */
export function disposeSculptMaterial(material: MeshPhysicalMaterial): void {
  const maps = new Set([material.map, material.roughnessMap, material.metalnessMap, material.normalMap]);
  for (const map of maps) map?.dispose();
  material.dispose();
}

/* ------------------------------------------------------------------ *
 * Object
 * ------------------------------------------------------------------ */

export interface SculpturalTextObjectOptions {
  /** One material for every unit, or one per unit. */
  material: Material | ((glyph: SculptGlyph, index: number) => Material);
  /** @default true */
  castShadow?: boolean;
  /** @default true */
  receiveShadow?: boolean;
}

interface UnitView {
  holder: Group;
  mesh: Mesh<BufferGeometry, Material>;
  position: BufferAttribute;
  normal: BufferAttribute;
}

/**
 * The plan's units as meshes. Call `update(frame)` each frame. Units are positioned in em; scale the object to place
 * the text in your scene.
 */
export class SculpturalTextObject extends Group {
  readonly text: SculpturalText;
  private readonly views: UnitView[];

  constructor(source: SculpturalText | SculpturalTextSpec | SculpturalTextPlan, options: SculpturalTextObjectOptions) {
    super();
    this.text = source instanceof SculpturalText ? source : new SculpturalText(source);
    this.views = this.text.glyphs.map((state, index) => {
      const geometry = new BufferGeometry();
      const position = new BufferAttribute(state.positions, 3);
      const normal = new BufferAttribute(state.normals, 3);
      geometry.setAttribute("position", position);
      geometry.setAttribute("normal", normal);
      // Each unit reads the maps at its own offset, as letters cut from different parts of one sheet or block.
      const uv = Float32Array.from(state.glyph.solid.uvs);
      for (let i = 0; i < uv.length; i += 2) {
        uv[i] += 0.37 * index;
        uv[i + 1] += 0.23 * index;
      }
      geometry.setAttribute("uv", new BufferAttribute(uv, 2));
      geometry.setIndex(new BufferAttribute(state.glyph.solid.indices, 1));
      const box = state.glyph.solid.box;
      const centre = new Vector3((box.minX + box.maxX) / 2, (box.minY + box.maxY) / 2, (box.front + box.back) / 2);
      // Deformers stay within about half the unit's size; a generous sphere keeps culling valid.
      geometry.boundingSphere = new Sphere(centre, 1.5 * Math.hypot(box.maxX - box.minX, box.maxY - box.minY, box.front - box.back) + 0.5);
      const material = typeof options.material === "function" ? options.material(state.glyph, index) : options.material;
      const mesh = new Mesh(geometry, material);
      mesh.castShadow = options.castShadow ?? true;
      mesh.receiveShadow = options.receiveShadow ?? true;
      const [px, py, pz] = state.glyph.pivot;
      mesh.position.set(-px, -py, -pz);
      const holder = new Group();
      holder.name = `glyph-${state.glyph.index}`;
      holder.add(mesh);
      this.add(holder);
      return { holder, mesh, position, normal };
    });
  }

  /** Pose and deform every unit at `frame`. */
  update(frame: number, reducedMotion = false): this {
    const frames = this.text.update(frame, reducedMotion);
    frames.forEach((state, i) => {
      const view = this.views[i];
      const { pose, glyph } = state;
      view.holder.visible = pose.visible;
      view.holder.position.set(
        glyph.rest[0] + glyph.pivot[0] + pose.offset[0],
        glyph.rest[1] + glyph.pivot[1] + pose.offset[1],
        glyph.rest[2] + glyph.pivot[2] + pose.offset[2],
      );
      view.holder.rotation.set(pose.rotation[0], pose.rotation[1], pose.rotation[2]);
      view.holder.scale.setScalar(pose.scale);
      if (state.changed) {
        view.position.needsUpdate = true;
        view.normal.needsUpdate = true;
      }
    });
    return this;
  }

  /** Dispose every geometry. Materials belong to the caller. */
  dispose(): void {
    for (const view of this.views) view.mesh.geometry.dispose();
  }
}
