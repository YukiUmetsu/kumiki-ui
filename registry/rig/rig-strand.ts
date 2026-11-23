/**
 * Settle a hanging strand (long hair, a sash, a scarf end) on round bodies: points in, points out.
 *
 * Each point, root to tip, is pulled toward the direction its segment hangs in and pushed out of every capsule, keeping
 * the segment's length. A capsule can name the side the strand comes out on, so the strand never changes sides between
 * frames: every step is a projection, so a small change of pose gives a small change of strand. Nothing is stored, so
 * any frame settles alone. Coordinates are y down, in any one space.
 */
export type StrandPoint = readonly [number, number];

export interface StrandCapsule {
  a: StrandPoint;
  b: StrandPoint;
  /** Radius of the body plus half the strand's thickness. */
  r: number;
  /** Direction the strand comes out in (any length). Left out, it comes out the nearest way. */
  side?: StrandPoint;
}

export interface StrandOptions {
  /** Lowest y a point may reach. A strand whose root is already lower stays no lower than its root. */
  floor?: number;
  /**
   * Which way the strand lies down on the floor, -1 (toward -x) to 1. Between about -.4 and .4 neither way is favoured and
   * it spreads toward or away from the viewer, so it looks shorter: it passes from one side to the other smoothly. Left
   * out, it lies the way it was already heading, at full length.
   */
  floorSide?: number;
  /** Steps per point (default 24). */
  steps?: number;
}

/** Nearest point on the segment a-b. */
function nearest(p: StrandPoint, a: StrandPoint, b: StrandPoint): [number, number] {
  const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
  const t = l2 ? Math.min(1, Math.max(0, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)) : 0;
  return [a[0] + t * dx, a[1] + t * dy];
}

/** Depth and outward direction of `p` in a capsule kept `need` away from its axis; undefined when it is clear. */
function inside(p: StrandPoint, c: StrandCapsule, need: number): { depth: number; n: [number, number] } | undefined {
  const q = nearest(p, c.a, c.b);
  let nx = p[0] - q[0], ny = p[1] - q[1];
  const d = Math.hypot(nx, ny);
  if (d >= need) return undefined;
  if (d > 1e-9) { nx /= d; ny /= d; }
  if (!c.side) return { depth: need - d, n: d > 1e-9 ? [nx, ny] : [-1, 0] };
  const sl = Math.hypot(c.side[0], c.side[1]) || 1, sx = c.side[0] / sl, sy = c.side[1] / sl;
  // Never leave by the far side: the part of the way out that points against `side` is taken away.
  const along = nx * sx + ny * sy;
  if (along < 0) { nx -= along * sx; ny -= along * sy; }
  // How far to go along (nx, ny) + side to reach the surface from here.
  const bx = nx + sx, by = ny + sy, bl = Math.hypot(bx, by) || 1, ux = bx / bl, uy = by / bl;
  const px = p[0] - q[0], py = p[1] - q[1], dot = px * ux + py * uy;
  return { depth: -dot + Math.sqrt(Math.max(0, dot * dot - (d * d - need * need))), n: [ux, uy] };
}

/** Settle the strand whose hanging pose is `hang` (root first). Segments keep their lengths, except lying on the floor toward
 * or away from the viewer (`floorSide`), where they look shorter. */
export function settleStrand(hang: readonly StrandPoint[], capsules: readonly StrandCapsule[], options: StrandOptions = {}): [number, number][] {
  const steps = options.steps ?? 24, out: [number, number][] = [[hang[0][0], hang[0][1]]];
  for (let i = 1; i < hang.length; i++) {
    const j = out[i - 1], dx = hang[i][0] - hang[i - 1][0], dy = hang[i][1] - hang[i - 1][1], L = Math.hypot(dx, dy);
    let x = j[0] + dx, y = j[1] + dy;
    const floor = options.floor === undefined ? Infinity : Math.max(options.floor, j[1]);
    // A strand growing out of a body (a root in the scalp) may go no deeper than it starts.
    const needs = capsules.map(c => { const q = nearest(j, c.a, c.b); return Math.min(c.r, Math.hypot(j[0] - q[0], j[1] - q[1])); });
    const keepLength = () => { const ex = x - j[0], ey = y - j[1], l = Math.hypot(ex, ey) || 1; x = j[0] + ex / l * L; y = j[1] + ey / l * L; };
    for (let k = 0; k < steps; k++) {
      // The pull fades to nothing, so the last steps only settle the contact.
      const pull = .5 * Math.max(0, 1 - k / (steps * .6)) ** 2;
      x += (j[0] + dx - x) * pull; y += (j[1] + dy - y) * pull;
      capsules.forEach((c, m) => {
        const tip = inside([x, y], c, needs[m]);
        if (tip) { x += tip.n[0] * tip.depth; y += tip.n[1] * tip.depth; }
        // The middle of a segment may cut a round body by its chord's sagitta, no more.
        const mid = inside([(x + j[0]) / 2, (y + j[1]) / 2], c, Math.sqrt(Math.max(0, needs[m] ** 2 - L * L / 4)));
        if (mid) { x += 2 * mid.n[0] * mid.depth; y += 2 * mid.n[1] * mid.depth; }
      });
      if (y >= floor) {
        y = floor;
        const reach = Math.sqrt(Math.max(0, L * L - (y - j[1]) ** 2));
        x = j[0] + reach * (options.floorSide === undefined ? (x < j[0] ? -1 : 1) : Math.max(-1, Math.min(1, options.floorSide / .4)));
        continue;
      }
      keepLength();
    }
    out.push([x, y]);
  }
  return out;
}
