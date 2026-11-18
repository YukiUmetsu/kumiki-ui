/**
 * Physical paper — a bound book in Three.js (registry item `paper-book-three`).
 *
 * Draws a baked `paper-book`: each leaf with its own shape (moving, or settled on a stack) as a smooth surface
 * interpolated from the simulation grid (Catmull–Rom), with its recto on the front face and its verso on the back,
 * and the two stacks as their top leaf over a block whose edges show the leaves. Coated stock gets a soft clear coat,
 * so highlights slide across a curling page. Everything casts and receives shadows, so a lifted page shades the one
 * beneath it.
 *
 * Space: the simulation's millimetres scaled by `scale`; Three's y is up, and the bottom edge of the pages faces +z.
 */

import {
  BackSide, BufferAttribute, BufferGeometry, CanvasTexture, Color, DoubleSide, FrontSide, Group, Mesh, MeshPhysicalMaterial,
  RepeatWrapping, SRGBColorSpace,
} from "three";
import type { Texture } from "three";
import { paperBookRestingLeaf, paperBookSeparate } from "./paper-book";
import type { PaperBookBake } from "./paper-book";

export interface PaperBookThreeOptions {
  /** Texture of a page by its number (1 = front cover recto); null for plain paper. */
  page?: (page: number) => Texture | null;
  /** Colour of the paper where a page has no texture, and of the leaf edges. @default "#f4f2ec" */
  paperColor?: string;
  /** World units per millimetre. @default 0.01 */
  scale?: number;
  /** Interpolated vertices per simulation cell along each side. @default 4 */
  smooth?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
}

/** One centripetal-free (uniform) Catmull–Rom sample between p1 and p2 at t. */
function catmull(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

class LeafSurface {
  readonly geometry = new BufferGeometry();
  readonly front: Mesh;
  readonly back: Mesh;
  readonly positions: Float32Array;
  /** The interpolated surface in book millimetres, before it is placed in the scene. */
  readonly fine: Float64Array;
  readonly columns: number;
  readonly rows: number;
  readonly fineColumns: number;
  readonly fineRows: number;
  leaf = -1;
  constructor(
    columns: number,
    rows: number,
    private readonly smooth: number,
    frontMaterial: MeshPhysicalMaterial,
    backMaterial: MeshPhysicalMaterial,
  ) {
    this.columns = columns;
    this.rows = rows;
    this.fineColumns = (columns - 1) * smooth + 1;
    this.fineRows = (rows - 1) * smooth + 1;
    const count = this.fineColumns * this.fineRows;
    this.positions = new Float32Array(count * 3);
    this.fine = new Float64Array(count * 3);
    const uv = new Float32Array(count * 2);
    const index: number[] = [];
    for (let i = 0; i < this.fineColumns; i += 1) {
      for (let j = 0; j < this.fineRows; j += 1) {
        const k = i * this.fineRows + j;
        uv[2 * k] = i / (this.fineColumns - 1);
        uv[2 * k + 1] = j / (this.fineRows - 1);
        if (i + 1 < this.fineColumns && j + 1 < this.fineRows) {
          const a = k;
          const b = k + this.fineRows;
          // u runs along +x and v toward −z, so (a, b, a + 1) faces up when the leaf lies on the right.
          index.push(a, b, a + 1, b, b + 1, a + 1);
        }
      }
    }
    this.geometry.setAttribute("position", new BufferAttribute(this.positions, 3));
    this.geometry.setAttribute("uv", new BufferAttribute(uv, 2));
    this.geometry.setAttribute("normal", new BufferAttribute(new Float32Array(count * 3), 3));
    this.geometry.setIndex(index);
    this.front = new Mesh(this.geometry, frontMaterial);
    this.back = new Mesh(this.geometry, backMaterial);
  }

  /** Interpolate the simulation grid (millimetres) into the fine surface (still in millimetres). */
  interpolate(grid: ArrayLike<number>): void {
    const { columns, rows, smooth, fineColumns, fineRows, fine } = this;
    const at = (i: number, j: number, d: number) => {
      const ci = Math.min(columns - 1, Math.max(0, i));
      const cj = Math.min(rows - 1, Math.max(0, j));
      // Extrapolate linearly past the borders so the edges do not curl inward.
      const ei = i < 0 ? -i : i > columns - 1 ? i - (columns - 1) : 0;
      const ej = j < 0 ? -j : j > rows - 1 ? j - (rows - 1) : 0;
      let v = grid[(ci * rows + cj) * 3 + d];
      if (ei) {
        const inner = grid[((i < 0 ? 1 : columns - 2) * rows + cj) * 3 + d];
        v += (v - inner) * ei;
      }
      if (ej) {
        const inner = grid[(ci * rows + (j < 0 ? 1 : rows - 2)) * 3 + d];
        v += (v - inner) * ej;
      }
      return v;
    };
    const column = new Float64Array(4);
    for (let fi = 0; fi < fineColumns; fi += 1) {
      const i = Math.min(columns - 2, Math.floor(fi / smooth));
      const s = fi / smooth - i;
      for (let fj = 0; fj < fineRows; fj += 1) {
        const j = Math.min(rows - 2, Math.floor(fj / smooth));
        const t = fj / smooth - j;
        const k = (fi * fineRows + fj) * 3;
        for (let d = 0; d < 3; d += 1) {
          for (let a = 0; a < 4; a += 1) column[a] = catmull(at(i + a - 1, j - 1, d), at(i + a - 1, j, d), at(i + a - 1, j + 1, d), at(i + a - 1, j + 2, d), t);
          fine[k + d] = catmull(column[0], column[1], column[2], column[3], s);
        }
      }
    }
  }

  /** Place the fine surface in the scene: book (x, y along the spine, z up) → Three (x, y up, z toward the bottom edge). */
  place(scale: number, pageHeight: number): void {
    const { fine, positions } = this;
    for (let k = 0; k < fine.length; k += 3) {
      positions[k] = fine[k] * scale;
      positions[k + 1] = fine[k + 2] * scale;
      positions[k + 2] = (pageHeight / 2 - fine[k + 1]) * scale;
    }
    (this.geometry.getAttribute("position") as BufferAttribute).needsUpdate = true;
    this.geometry.computeVertexNormals();
    this.geometry.computeBoundingSphere();
  }

  dispose(): void {
    this.geometry.dispose();
  }
}

/** Faint lines of stacked leaves for the edges of a stack. */
function edgeTexture(color: string): CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 8;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 8, 256);
  for (let y = 0; y < 256; y += 2) {
    ctx.fillStyle = `rgba(80, 72, 60, ${0.05 + ((y * 37) % 11) / 110})`;
    ctx.fillRect(0, y, 8, 1);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  return texture;
}

/** A bound book, updated frame by frame from a bake. */
export class PaperBookObject extends Group {
  private readonly bake: PaperBookBake;
  private readonly options: Required<Omit<PaperBookThreeOptions, "page">> & Pick<PaperBookThreeOptions, "page">;
  private readonly surfaces: LeafSurface[] = [];
  private readonly materials = new Map<string, MeshPhysicalMaterial>();
  private readonly stacks: Mesh[] = [];
  private readonly edgeMap: CanvasTexture | null;
  private readonly edgeMaterial: MeshPhysicalMaterial;
  private readonly restGrid: Float32Array;

  constructor(bake: PaperBookBake, options: PaperBookThreeOptions = {}) {
    super();
    this.bake = bake;
    this.options = { paperColor: "#f4f2ec", scale: 0.01, smooth: 4, castShadow: true, receiveShadow: true, ...options };
    this.restGrid = new Float32Array(bake.columns * bake.rows * 3);
    this.edgeMap = edgeTexture(this.options.paperColor);
    this.edgeMaterial = new MeshPhysicalMaterial({ color: new Color(this.options.paperColor), map: this.edgeMap, roughness: 0.85, side: DoubleSide });
    for (let k = 0; k < 2; k += 1) {
      const stack = new Mesh(new BufferGeometry(), this.edgeMaterial);
      stack.castShadow = this.options.castShadow;
      stack.receiveShadow = this.options.receiveShadow;
      this.stacks.push(stack);
      this.add(stack);
    }
  }

  /** Material for one face of a page: its texture, or plain paper; coated stock gets a soft clear coat. */
  private material(page: number, back: boolean): MeshPhysicalMaterial {
    const key = `${page}:${back ? "b" : "f"}`;
    const cached = this.materials.get(key);
    if (cached) return cached;
    const source = this.options.page?.(page) ?? null;
    let map: Texture | null = null;
    if (source) {
      // The verso is seen from behind: mirror it so it reads the right way round.
      map = back ? source.clone() : source;
      if (back) {
        map.wrapS = RepeatWrapping;
        map.repeat.x = -1;
        map.offset.x = 1;
        map.needsUpdate = true;
      }
    }
    const gloss = this.bake.stock.gloss;
    const material = new MeshPhysicalMaterial({
      color: map ? new Color(0xffffff) : new Color(this.options.paperColor),
      map,
      roughness: 0.62 - gloss * 0.5,
      clearcoat: Math.min(1, gloss * 1.4),
      clearcoatRoughness: 0.35,
      side: back ? BackSide : FrontSide,
      shadowSide: DoubleSide,
    });
    this.materials.set(key, material);
    return material;
  }

  private surface(slot: number, leaf: number): LeafSurface {
    let surface = this.surfaces[slot];
    if (!surface) {
      surface = new LeafSurface(this.bake.columns, this.bake.rows, this.options.smooth, this.material(1, false), this.material(2, true));
      for (const mesh of [surface.front, surface.back]) {
        mesh.castShadow = this.options.castShadow;
        mesh.receiveShadow = this.options.receiveShadow;
        this.add(mesh);
      }
      this.surfaces[slot] = surface;
    }
    if (surface.leaf !== leaf) {
      surface.leaf = leaf;
      surface.front.material = this.material(2 * leaf + 1, false);
      surface.back.material = this.material(2 * leaf + 2, true);
    }
    surface.front.visible = true;
    surface.back.visible = true;
    return surface;
  }

  /** Show frame `frame` of the bake. */
  update(frame: number): void {
    const { bake } = this;
    const f = bake.frames[Math.max(0, Math.min(bake.frames.length - 1, Math.round(frame)))];
    const { columns, rows, gap, gutter, spec } = bake;
    const H = spec.height;
    const scale = this.options.scale;
    let slot = 0;
    const shaped = new Set(f.leaves.map((l) => l.index));
    const drawn: { surface: LeafSurface; index: number; give: number }[] = [];
    for (const leaf of f.leaves) {
      const surface = this.surface(slot++, leaf.index);
      surface.interpolate(leaf.positions);
      drawn.push({ surface, index: leaf.index, give: leaf.place === "moving" ? 1 : 0 });
    }
    // The top resting leaf of each stack, from the stack shape, unless a settled leaf already lies on top of it.
    const leftTop = f.leftCount - 1;
    const rightTop = spec.leaves - f.rightCount;
    const topOf = (count: number) => (count - 1) * gap + gap / 2;
    if (f.leftCount > 0 && !shaped.has(leftTop)) {
      paperBookRestingLeaf(columns, rows, spec.width, H, -1, topOf(f.leftCount), gutter, this.restGrid);
      const surface = this.surface(slot++, leftTop);
      surface.interpolate(this.restGrid);
      drawn.push({ surface, index: leftTop, give: 0 });
    }
    if (f.rightCount > 0 && !shaped.has(rightTop)) {
      paperBookRestingLeaf(columns, rows, spec.width, H, 1, topOf(f.rightCount), gutter, this.restGrid);
      const surface = this.surface(slot++, rightTop);
      surface.interpolate(this.restGrid);
      drawn.push({ surface, index: rightTop, give: 0 });
    }
    // Interpolated surfaces can bulge past the simulated grid on a tight curl: keep them apart as drawn.
    drawn.sort((a, b) => a.index - b.index);
    paperBookSeparate(drawn.map((d) => ({ positions: d.surface.fine, columns: d.surface.fineColumns, rows: d.surface.fineRows, give: d.give })),
      spec.width, H, gap, (spec.width / (columns - 1)) * 1.6);
    for (const d of drawn) d.surface.place(scale, H);
    for (let k = slot; k < this.surfaces.length; k += 1) {
      this.surfaces[k].front.visible = false;
      this.surfaces[k].back.visible = false;
    }
    this.updateStack(this.stacks[0], -1, f.leftCount);
    this.updateStack(this.stacks[1], 1, f.rightCount);
  }

  /** The block of resting leaves under a stack's top leaf: outer, bottom and top edges following the gutter curve. */
  private updateStack(mesh: Mesh, side: 1 | -1, count: number): void {
    const { bake } = this;
    const { spec, gap, gutter, columns, rows } = bake;
    if (count < 2) {
      mesh.visible = false;
      return;
    }
    mesh.visible = true;
    const scale = this.options.scale;
    const H = spec.height;
    const top = paperBookRestingLeaf(columns, rows, spec.width, H, side, (count - 1.5) * gap + gap / 2, gutter);
    const pts: number[] = [];
    const uvs: number[] = [];
    const index: number[] = [];
    // One edge line per leaf: the edge texture holds 128 lines.
    const lines = (count - 1) / 128;
    // Edge faces along y = 0 and y = H: between the table and the profile of the leaf under the top one.
    for (const edge of [0, rows - 1]) {
      const base = pts.length / 3;
      for (let i = 0; i < columns; i += 1) {
        const k = (i * rows + edge) * 3;
        const x = top[k] * scale;
        const z = (H / 2 - top[k + 1]) * scale;
        pts.push(x, top[k + 2] * scale, z, x, 0, z);
        uvs.push(i / (columns - 1), lines, i / (columns - 1), 0);
        if (i + 1 < columns) index.push(base + 2 * i, base + 2 * i + 1, base + 2 * i + 2, base + 2 * i + 1, base + 2 * i + 3, base + 2 * i + 2);
      }
    }
    // The outer edge.
    const base = pts.length / 3;
    for (let j = 0; j < rows; j += 1) {
      const k = ((columns - 1) * rows + j) * 3;
      const x = top[k] * scale;
      const z = (H / 2 - top[k + 1]) * scale;
      pts.push(x, top[k + 2] * scale, z, x, 0, z);
      uvs.push(j / (rows - 1), lines, j / (rows - 1), 0);
      if (j + 1 < rows) index.push(base + 2 * j, base + 2 * j + 1, base + 2 * j + 2, base + 2 * j + 1, base + 2 * j + 3, base + 2 * j + 2);
    }
    const geometry = mesh.geometry as BufferGeometry;
    geometry.setAttribute("position", new BufferAttribute(Float32Array.from(pts), 3));
    geometry.setAttribute("uv", new BufferAttribute(Float32Array.from(uvs), 2));
    geometry.setIndex(index);
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
  }

  dispose(): void {
    for (const surface of this.surfaces) surface.dispose();
    for (const material of this.materials.values()) {
      if (material.map && material.side === BackSide) material.map.dispose();
      material.dispose();
    }
    for (const stack of this.stacks) stack.geometry.dispose();
    this.edgeMaterial.dispose();
    this.edgeMap?.dispose();
  }
}
