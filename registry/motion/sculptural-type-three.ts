/**
 * Three.js adapter for sculptural typography (registry item `sculptural-type-three`).
 *
 * `SculpturalTextObject` draws a `SculpturalText` plan: one mesh per unit inside a pivot group, so poses turn and
 * squash about the right point. Geometry buffers are the plan's own arrays; a frame re-uploads only the units whose
 * deformers changed.
 *
 * `sculptMaterial(id)` makes a physical material from any MATL1 material (`registry/materials`): measured base colour,
 * metalness, roughness and index of refraction, plus maps baked from the material's own texture recipe at real size
 * (one em = `emMm` millimetres): colour, roughness and metalness, and a normal map from the surface height. Optics
 * carry over: brushed metals get anisotropy, clear materials transmit, nacre gets iridescence, lacquers a clear coat.
 */

import {
  BufferAttribute, BufferGeometry, DataTexture, Group, Mesh, MeshPhysicalMaterial, MirroredRepeatWrapping, RGBAFormat,
  SRGBColorSpace, Sphere, Vector3, LinearMipmapLinearFilter, LinearFilter,
} from "three";
import type { Material } from "three";

import { SculpturalText } from "./sculptural-type";
import type { SculptGlyph, SculpturalTextPlan, SculpturalTextSpec } from "./sculptural-type";
import { findMaterial, toStandardMaterial, encodeSrgb } from "../materials/materials-physics";
import { materialTexture } from "../materials/materials-texture";

/* ------------------------------------------------------------------ *
 * Materials
 * ------------------------------------------------------------------ */

export interface SculptMaterialOptions {
  /** Physical size of one em, in millimetres; sets how large grain, fibres and veins appear. @default 120 */
  emMm?: number;
  /** Baked map size in pixels. @default 512 */
  textureSize?: number;
  /** Another piece of the same material. @default 7 */
  seed?: number;
  /** Normal map strength. @default 1 */
  relief?: number;
}

/** MATL1 materials that read well as letters, for pickers. Any MATL1 id works. */
export const SCULPT_MATERIAL_PRESETS = [
  "gold", "brass", "copper", "chromium", "stainless-steel", "aluminium", "bronze-old",
  "porcelain", "terracotta", "marble", "granite", "slate", "concrete",
  "wood-light", "wood-mid", "lacquer-red", "lacquer-black", "glass", "paper-kraft", "paper-washi", "pearl",
] as const;

/** UV span of a baked map, in em, and its centre: the maps cover u, v ∈ [−0.5, 1.5] and mirror beyond. */
const MAP_SPAN_EM = 2;
const MAP_START_EM = -0.5;

/**
 * A `MeshPhysicalMaterial` for a MATL1 material id. The caller owns the material and its textures; dispose them with
 * {@link disposeSculptMaterial}.
 */
export function sculptMaterial(id: string, options: SculptMaterialOptions = {}): MeshPhysicalMaterial {
  const record = findMaterial(id);
  if (!record) throw new RangeError(`Unknown MATL1 material "${id}". Use an id from MATERIALS, for example "gold" or "marble".`);
  const standard = toStandardMaterial(record);
  const texture = materialTexture(id, options.seed ?? 7);
  const size = Math.max(32, Math.min(2048, Math.round(options.textureSize ?? 512)));
  const emMm = options.emMm ?? 120;
  const spanMm = MAP_SPAN_EM * emMm;
  const pixelMm = spanMm / size;
  const colour = new Uint8Array(size * size * 4);
  const surface = new Uint8Array(size * size * 4);
  const heights = new Float32Array(size * size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const s = texture.sample(MAP_START_EM * emMm + (x + 0.5) * pixelMm, MAP_START_EM * emMm + (y + 0.5) * pixelMm, pixelMm);
      const i = y * size + x;
      colour[4 * i] = Math.round(encodeSrgb(s.a[0]) * 255);
      colour[4 * i + 1] = Math.round(encodeSrgb(s.a[1]) * 255);
      colour[4 * i + 2] = Math.round(encodeSrgb(s.a[2]) * 255);
      colour[4 * i + 3] = 255;
      // three reads roughness from green and metalness from blue.
      surface[4 * i + 1] = Math.round(Math.min(1, Math.max(0, s.r)) * 255);
      surface[4 * i + 2] = Math.round(Math.min(1, Math.max(0, s.m ?? record.metal)) * 255);
      surface[4 * i + 3] = 255;
      heights[i] = s.h;
    }
  }
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
  const optics = texture.optics;
  const material = new MeshPhysicalMaterial({
    name: `sculpt:${id}`,
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
