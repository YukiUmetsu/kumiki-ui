/** Measured dimensions of a HouseLayout for `DimensionOverlay`, in meters, from the same model the 3D
 * build uses: overall envelope, wall and roof layer stacks, foundation depth, a window opening,
 * roof pitch, footprint area and a person for scale. Nothing here is estimated from pixels.
 */
import type { DimensionSpec } from "../visual/dimension-overlay";
import { ROOF_LAYERS, SHINGLE_THICKNESS, facadePoint } from "./home-model";
import type { HouseLayout } from "./home-model";

export type HouseDimensionSet = "overall" | "wall-layers" | "roof-layers" | "foundation" | "window" | "pitch" | "footprint" | "scale";

/** Dimension specs for a house; `start` staggers the draw-on of each set. */
export interface HouseDimensionOptions {
  start?: number;
  stagger?: number;
  /** Where the wall stack cuts the front wall, as a fraction of its length. @default .2 */
  wallAt?: number;
  /** Roof stack at the gable rake (edge-on from the side) or in the roof field. @default "gable" */
  roofAt?: "gable" | "field";
}

export function houseDimensions(layout: HouseLayout, sets: readonly HouseDimensionSet[], options: HouseDimensionOptions = {}): DimensionSpec[] {
  const d = layout.dims, W = d.width / 2, D = d.depth / 2, L = d.layers;
  let start = options.start ?? 0;
  const next = () => { const s = start; start += options.stagger ?? 14; return { start: s, draw: 20 }; };
  const front = layout.facades.front.frame;
  const out: DimensionSpec[] = [];
  for (const set of sets) {
    if (set === "overall") {
      out.push({ id: "width", kind: "length", label: "Width", from: [-W, 0, D], to: [W, 0, D], side: [0, 0, 1], offset: 1.1, frames: next() });
      out.push({ id: "ridge-height", kind: "length", label: "Ridge", from: [W, 0, 0], to: [W, d.ridgeY, 0], side: [1, 0, 0], offset: d.rakeOverhang + .9, frames: next() });
      out.push({ id: "depth", kind: "length", label: "Depth", from: [W, 0, D], to: [W, 0, -D], side: [1, 0, 0], offset: 1.1, frames: next() });
    } else if (set === "wall-layers") {
      // Through the front wall at mid-storey height, outside face (w = 0) inward.
      const u = d.width * (options.wallAt ?? .2), v = d.floorY + 1.3;
      const ws = [0, -L.siding, -(L.siding + L.sheathing), -(L.siding + L.sheathing + L.studs), -L.total];
      out.push({ id: "wall-layers", kind: "chain", label: "Wall", points: ws.map(w => facadePoint(front, u, v, w)), labels: ["Siding", "Sheathing", "Studs + insulation", "Drywall"], side: [1, 0, 0], offset: .25, total: true, frames: next() });
    } else if (set === "roof-layers") {
      // Perpendicular to the front roof plane, from the rafter bottom up through decking, underlayment and lapped shingles.
      const z = D * .55, x = options.roofAt === "field" ? -W * .35 : W + d.rakeOverhang - .04, nY = Math.cos(d.pitch), nZ = Math.sin(d.pitch);
      const top = [x, d.roofTopAt(z), z];
      const at = (k: number) => [top[0], top[1] + nY * k, top[2] + nZ * k];
      const sh = SHINGLE_THICKNESS[layout.spec.shingles ?? "three-tab"] * 2;
      const ks = [-d.rafterDepth, 0, ROOF_LAYERS.decking, ROOF_LAYERS.decking + ROOF_LAYERS.underlayment, ROOF_LAYERS.decking + ROOF_LAYERS.underlayment + sh];
      out.push({ id: "roof-layers", kind: "chain", label: "Roof", points: ks.map(at), labels: ["Rafter", "Decking", "Underlayment", "Shingles"], side: [0, -nZ, nY], offset: .12, total: true, frames: next() });
    } else if (set === "foundation") {
      // At the back corner of the right side wall: visible from the side and on a wall in any x-section.
      const x = W + .02, z = -D - .02;
      out.push({ id: "floor-height", kind: "length", label: "Floor above grade", from: [x, 0, z], to: [x, d.floorY, z], side: [0, 0, -1], offset: .5, frames: next() });
      out.push({ id: "footing-depth", kind: "length", label: "Footing depth", from: [x, 0, z], to: [x, d.foundationBottom, z], side: [0, 0, -1], offset: 1.2, frames: next() });
    } else if (set === "window") {
      const w = layout.facades.front.openings.find(o => o.kind === "window");
      if (!w) continue;
      out.push({ id: "window-width", kind: "length", label: "Window", from: facadePoint(front, w.u0, w.v0, .05), to: facadePoint(front, w.u1, w.v0, .05), side: [0, -1, 0], offset: .22, frames: next() });
      out.push({ id: "window-height", kind: "length", from: facadePoint(front, w.u1, w.v0, .05), to: facadePoint(front, w.u1, w.v1, .05), side: front.uAxis, offset: .22, frames: next() });
    } else if (set === "pitch") {
      const z = D, x = W + d.rakeOverhang + .05, y = d.roofTopAt(z);
      out.push({ id: "pitch", kind: "angle", label: "Pitch", vertex: [x, y, z], a: [x, y, z - 1.6], b: [x, y + Math.sin(d.pitch) * 1.6, z - Math.cos(d.pitch) * 1.6], format: "pitch", radius: 1.1, frames: next() });
    } else if (set === "footprint") {
      out.push({ id: "footprint", kind: "area", label: "Footprint", polygon: [[-W, .02, -D], [W, .02, -D], [W, .02, D], [-W, .02, D]], frames: next() });
    } else if (set === "scale") {
      out.push({ id: "person", kind: "scale-reference", reference: "person", at: [W + 1.3, 0, D * .3], frames: next() });
    }
  }
  return out;
}
