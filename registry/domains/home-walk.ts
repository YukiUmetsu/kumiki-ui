/** Walkable map of a house layout: wall collision with doorways, floor heights, rooms and viewpoints.
 * Renderer-neutral; pairs with `useWalkCamera` (craft/walk-camera) or any camera rig.
 */
import { PARTITION_THICKNESS } from "./home-interior-model";
import type { HouseLayout } from "./home-model";

interface WallSeg { a: [number, number]; b: [number, number] }

export function houseWalkMap(layout: HouseLayout, options: { radius?: number } = {}) {
  const r = options.radius ?? .22, d = layout.dims, W = d.width / 2, D = d.depth / 2, T = d.layers.total;
  const walls = (storey: number): WallSeg[] => {
    const out: WallSeg[] = [];
    // Exterior walls (mid-thickness lines) split at doors on this storey.
    for (const f of ["front", "back", "left", "right"] as const) {
      const fl = layout.facades[f], gaps = fl.openings.filter(o => o.kind !== "window" && o.storey === storey).map(o => [o.u0, o.u1] as const).sort((p, q) => p[0] - q[0]);
      const at = (u: number): [number, number] => { const o = fl.frame.origin, a = fl.frame.uAxis, n = fl.frame.normal; return [o[0] + a[0] * u - n[0] * T / 2, o[2] + a[2] * u - n[2] * T / 2]; };
      let cur = 0;
      for (const [g0, g1] of gaps) { if (g0 > cur) out.push({ a: at(cur), b: at(g0) }); cur = g1; }
      if (cur < fl.length) out.push({ a: at(cur), b: at(fl.length) });
    }
    for (const p of layout.interior?.partitions ?? []) {
      if (p.storey !== storey) continue;
      const gaps = p.doors.map(x => [x.at - x.width / 2, x.at + x.width / 2] as const).sort((a, b) => a[0] - b[0]);
      const pt = (t: number): [number, number] => p.axis === "x" ? [t, p.at] : [p.at, t];
      let cur = p.from;
      for (const [g0, g1] of gaps) { if (g0 > cur) out.push({ a: pt(cur), b: pt(g0) }); cur = g1; }
      if (cur < p.to) out.push({ a: pt(cur), b: pt(p.to) });
    }
    return out;
  };
  const cache = new Map<number, WallSeg[]>();
  const wallsOf = (s: number) => { let w = cache.get(s); if (!w) { w = walls(s); cache.set(s, w); } return w; };
  const dist = (p: readonly [number, number], s: WallSeg) => {
    const vx = s.b[0] - s.a[0], vz = s.b[1] - s.a[1], l2 = vx * vx + vz * vz || 1;
    const t = Math.max(0, Math.min(1, ((p[0] - s.a[0]) * vx + (p[1] - s.a[1]) * vz) / l2));
    return Math.hypot(p[0] - (s.a[0] + vx * t), p[1] - (s.a[1] + vz * t));
  };
  const inside = (x: number, z: number) => Math.abs(x) < W && Math.abs(z) < D;
  const roomAt = (x: number, z: number, storey: number) => layout.interior?.rooms.find(q => q.storey === storey && q.rects.some(p => x >= p.x0 - PARTITION_THICKNESS && x <= p.x1 + PARTITION_THICKNESS && z >= p.z0 - PARTITION_THICKNESS && z <= p.z1 + PARTITION_THICKNESS));
  return {
    storeys: d.storeys,
    /** Walking surface: the storey floor inside the house, the lawn outside. */
    floorAt: (x: number, z: number, storey: number) => inside(x, z) ? d.floorY + storey * d.storeyHeight : 0,
    roomAt,
    /** True when a step ends within `radius` of a wall it is approaching. */
    blocked(from: readonly [number, number], to: readonly [number, number], storey: number) {
      if (layout.site) { const s = layout.site; if (to[0] < s.min[0] + .3 || to[0] > s.max[0] - .3 || to[1] < s.min[2] + .3 || to[1] > s.max[2] - .3) return true; }
      return wallsOf(storey).some(s => { const dt = dist(to, s); return dt < r && dt < dist(from, s); });
    },
    /** A standing point inside a room, looking across it (yaw 0 looks toward −Z). */
    viewpoint(roomId: string) {
      const q = layout.interior?.rooms.find(x => x.id === roomId);
      if (!q) throw new Error(`Unknown room "${roomId}".`);
      // The room corner farthest from any furnishing, looking diagonally across the room (yaw 0 looks toward −Z).
      const inset = Math.min(.45, (q.x1 - q.x0) / 4, (q.z1 - q.z0) / 4), cx = (q.x0 + q.x1) / 2, cz = (q.z0 + q.z1) / 2;
      const items = (layout.interior?.furnishings ?? []).filter(f => f.roomId === roomId && f.kind !== "rug");
      const clearance = (x: number, z: number) => items.reduce((m, f) => Math.min(m, Math.hypot(f.position[0] - x, f.position[2] - z) - Math.max(f.size[0], f.size[2]) / 2), Infinity);
      const corners = [[q.x0 + inset, q.z1 - inset], [q.x1 - inset, q.z1 - inset], [q.x0 + inset, q.z0 + inset], [q.x1 - inset, q.z0 + inset]] as const;
      const [x, z] = [...corners].sort((a, b) => clearance(b[0], b[1]) - clearance(a[0], a[1]))[0];
      return { x, z, yaw: Math.atan2(-(cx - x), -(cz - z)), storey: q.storey };
    },
    /** Outside the front door, facing the house. */
    entry() {
      const door = layout.facades.front.openings.find(o => o.kind === "door");
      return { x: door ? -W + (door.u0 + door.u1) / 2 : 0, z: D + 3.2, yaw: 0, storey: 0 };
    },
  };
}
export type HouseWalkMap = ReturnType<typeof houseWalkMap>;
