/** Shared 2D outlines and extrusions for hard-surface hero assets. */
import { BufferAttribute, ExtrudeGeometry, Shape } from "three";
import type { Path } from "three";

/** Rounded rectangle centered on the origin (XY plane). */
export function roundedRectShape(w: number, h: number, r: number): Shape {
  const s = new Shape();
  const R = Math.min(r, w / 2, h / 2);
  s.moveTo(-w / 2 + R, -h / 2); s.lineTo(w / 2 - R, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + R);
  s.lineTo(w / 2, h / 2 - R); s.quadraticCurveTo(w / 2, h / 2, w / 2 - R, h / 2); s.lineTo(-w / 2 + R, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - R); s.lineTo(-w / 2, -h / 2 + R); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + R, -h / 2);
  return s;
}

/** Same outline as a hole path (for frames and recesses). */
export function roundedRectPath(w: number, h: number, r: number): Path {
  return roundedRectShape(w, h, r) as unknown as Path;
}

export interface SlabOptions {
  /** Edge bevel size (0 = sharp). */
  bevel?: number;
  bevelSegments?: number;
  curveSegments?: number;
  holes?: Path[];
}

/**
 * Rounded slab lying in XZ (thickness along +Y from y = 0), with face UVs
 * normalized to the w × d outline (u = x, v = -z), so painted textures map 1:1.
 */
export function roundedSlab(w: number, d: number, thickness: number, radius: number, options: SlabOptions = {}): ExtrudeGeometry {
  const shape = roundedRectShape(w, d, radius);
  if (options.holes) shape.holes.push(...options.holes);
  const bevel = Math.min(options.bevel ?? 0, thickness * .45);
  const g = new ExtrudeGeometry(shape, {
    depth: Math.max(1e-4, thickness - bevel * 2), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel,
    bevelSegments: options.bevelSegments ?? 3, curveSegments: options.curveSegments ?? 12,
  });
  g.translate(0, 0, bevel);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position, uv = g.attributes.uv as BufferAttribute;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / w + .5, -pos.getZ(i) / d + .5);
  g.computeVertexNormals();
  return g;
}
