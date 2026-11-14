import { describe, expect, it } from "vitest";
import { applyRisoIK } from "../registry/video/riso-rig-ik";
import type { RisoMatrix, RisoJoint } from "../registry/video/riso-character";
import type { RisoTwoBoneIK } from "../registry/video/riso-rig-ik";

const joints: RisoJoint[] = [
  { id: "outer-root", x: 0, y: 0 },
  { id: "outer-mid", parent: "outer-root", x: 0, y: 30 },
  { id: "outer-end", parent: "outer-mid", x: 0, y: 30 },
  // This inner chain is under an outer-chain descendant, but shares no
  // constrained joints. Its world-space target must survive the outer solve.
  { id: "inner-root", parent: "outer-end", x: 20, y: 0 },
  { id: "inner-mid", parent: "inner-root", x: 0, y: 30 },
  { id: "inner-end", parent: "inner-mid", x: 0, y: 30 },
];
const outer: RisoTwoBoneIK = {
  id: "outer", root: "outer-root", mid: "outer-mid", end: "outer-end",
  bend: 1, target: { kind: "keys", keys: [{ frame: 0, x: 40, y: 40 }] },
};
const inner: RisoTwoBoneIK = {
  id: "inner", root: "inner-root", mid: "inner-mid", end: "inner-end",
  bend: 1, target: { kind: "keys", keys: [{ frame: 0, x: 60, y: 80 }] },
};
function restWorld(): Map<string, RisoMatrix> {
  const world = new Map<string, RisoMatrix>();
  for (const joint of joints) {
    const parent = joint.parent ? world.get(joint.parent)! : undefined;
    world.set(joint.id, {
      a: 1, b: 0, c: 0, d: 1,
      e: (parent?.e ?? 0) + joint.x,
      f: (parent?.f ?? 0) + joint.y,
    });
  }
  return world;
}
describe("RISO nested IK constraint execution", () => {
  it("solves parent chains before child chains regardless of authored order", () => {
    const first = restWorld();
    const second = restWorld();
    const forward = applyRisoIK(joints, first, [outer, inner], 0);
    const reverse = applyRisoIK(joints, second, [inner, outer], 0);
    expect(forward.map(d => d.id)).toEqual(["outer", "inner"]);
    expect(reverse.map(d => d.id)).toEqual(["inner", "outer"]);
    for (const result of [...forward, ...reverse]) {
      expect(result.reachable).toBe(true);
      expect(result.error).toBeLessThan(0.001);
    }
    for (const joint of joints) {
      const a = first.get(joint.id)!;
      const b = second.get(joint.id)!;
      for (const key of ["a", "b", "c", "d", "e", "f"] as const) {
        expect(a[key]).toBeCloseTo(b[key], 6);
      }
    }
    const innerEnd = second.get("inner-end")!;
    expect(innerEnd.e).toBeCloseTo(60, 3);
    expect(innerEnd.f).toBeCloseTo(80, 3);
  });
});
