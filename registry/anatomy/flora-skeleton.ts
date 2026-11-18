/**
 * FLORA2 skeleton: grows the axes and organ placements of one plant from a `SpeciesMorphologyProfile`.
 *
 * - Every axis bends by the heavy elastica (its G and tip load), turns toward the sky by its upturn and wanders with
 *   smooth noise measured in metres.
 * - Lateral children leave at the profile's angles and divergence. Their lengths follow a crown envelope (Weber and
 *   Penn 1995).
 * - A fork rule grows a dichotomous crown top-down: branch-tip targets are spread over a dome by the golden angle, then
 *   split into 2, 3 or 4 groups at each fork. Each segment points at its group, and radii follow Leonardo's rule
 *   (r^Δ summed is kept).
 * - Climbing axes wind up the support pole. Colony rules grow many stems that make a cushion.
 *
 * Units are metres, y up, the plant's foot at the origin. The same seed always grows the same plant.
 */
import { seeded } from "./foundation-shapes";
import { gradNoise } from "./foundation-raster";
import type { AxisRule, OrganRule, SpeciesMorphologyProfile } from "./flora-profile";
import { DEG, GOLDEN_ANGLE, UP, add, between, clamp, cross, dot, drawRange, growthCurve, heavyElastica, length3, lerp, lerp3, normalize, perpendicular, profileAt, rotateAxis, scale, smooth, sub, transportFrames, weighted, bezier3 } from "./flora-math";
import type { V3 } from "./flora-math";

export interface FloraNode { p: V3; r: number }
export interface FloraAxis {
  rule: AxisRule;
  level: number;
  nodes: FloraNode[];
  /** Index of the parent axis (−1 for a root axis) and the fraction along it where this axis starts. */
  parent: number;
  at: number;
  length: number;
  /** Nothing continues from its tip (rosettes and tip organs sit only on terminal axes). */
  terminal: boolean;
  /** Radius profile drawn for this axis (label of the variant). */
  form?: string;
}
export interface OrganPlacement {
  organ: string;
  /** Origin and unit axes of the organ frame: y along the organ, z its upper face (or, for a flower head, its face). */
  p: V3; x: V3; y: V3; z: V3;
  scale: number;
  /** 0 juvenile → 1 adult: when in the plant's life this organ formed (heteroblasty). */
  maturity: number;
  /** A stable random number for the organ's variant. */
  pick: number;
}
export interface FloraSkeleton {
  profile: SpeciesMorphologyProfile;
  axes: FloraAxis[];
  organs: OrganPlacement[];
  height: number;
  stage: number;
  support?: { top: number; radius: number; surface: string };
}

export interface GrowOptions {
  seed: number;
  /** Growth stage 0 (seedling) → 1 (mature). */
  stage: number;
  /** Fraction of small organs and fine axes kept (fidelity). Kept organs grow a little to cover the same area. */
  density: number;
  /** Node multiplier (fidelity). */
  detail: number;
  /** Hard cap on organ placements. */
  maxOrgans: number;
}

const ENVELOPES: Record<NonNullable<NonNullable<AxisRule["children"]>[number]["envelope"]>, (u: number) => number> = {
  conical: u => 1 - 0.8 * u,
  spherical: u => 0.25 + 0.75 * Math.sin(Math.PI * u),
  hemispherical: u => 0.25 + 0.75 * Math.sin(Math.PI / 2 * (1 - u)) ** 0.5,
  cylindrical: () => 1,
  flame: u => (u <= 0.7 ? 0.3 + u : 1 - (u - 0.7) / 0.3 * 0.8),
  inverse: u => 0.2 + 0.8 * u,
  tapered: u => 0.5 + 0.5 * (1 - u),
};

/** Grows one plant. */
export function growSkeleton(profile: SpeciesMorphologyProfile, o: GrowOptions): FloraSkeleton {
  const rng = seeded(o.seed), stage = clamp(o.stage);
  const rules = new Map(profile.axes.map(a => [a.id, a]));
  const H = lerp(profile.size.height.typical, drawRange(rng, profile.size.height), 0.5) * growthCurve(stage, profile.seedling ?? 0.06);
  const axes: FloraAxis[] = [];
  const supportTop = profile.support ? profile.support.height * H : 0;
  const supportRadius = profile.support?.radius ?? 0;

  const radiusAt = (a: FloraAxis, u: number) => {
    const f = u * (a.nodes.length - 1), i = Math.min(a.nodes.length - 2, Math.floor(f));
    return lerp(a.nodes[i].r, a.nodes[i + 1].r, f - i);
  };
  const frameCache = new Map<number, ReturnType<typeof transportFrames>>();
  const pointAt = (ai: number, u: number) => {
    const a = axes[ai];
    let fr = frameCache.get(ai);
    if (!fr) { fr = transportFrames(a.nodes.map(n => n.p)); frameCache.set(ai, fr); }
    const f = clamp(u) * (a.nodes.length - 1), i = Math.min(a.nodes.length - 2, Math.floor(f)), t = f - i;
    return { p: lerp3(a.nodes[i].p, a.nodes[i + 1].p, t), t: normalize(lerp3(fr.t[i], fr.t[i + 1], t)), n: fr.n[i], b: fr.b[i] };
  };

  /** One axis: the elastica shape with upturn and wander, then radii. */
  const grow = (rule: AxisRule, start: V3, dir: V3, len: number, r0: number, level: number, parent: number, at: number): number => {
    const seed = Math.floor(rng() * 1e9), n = Math.max(3, Math.round(rule.nodes * o.detail)), segs = n - 1;
    let form: string | undefined, stops = rule.profile;
    if (rule.profileVariants?.length) { const v = rule.profileVariants[weighted(rng, rule.profileVariants.map(x => x.weight))]; form = v.label; stops = v.stops; }
    const pts: V3[] = [start];
    if (rule.climb && profile.support) {
      // Wind up the pole while it lasts, then grow free.
      const R = supportRadius + r0 * 0.9, phi0 = rng() * Math.PI * 2, climbLen = Math.min(len, Math.max(0, supportTop - start[1]));
      const free = len - climbLen, nClimb = Math.max(2, Math.round(segs * climbLen / len));
      for (let i = 1; i <= nClimb; i++) {
        const u = i / nClimb, phi = phi0 + 2 * Math.PI * rule.climb.turns * u * climbLen / len + (rule.wander ?? 0) * DEG * gradNoise(seed, u * climbLen / 0.5, 0);
        pts.push([Math.cos(phi) * R, start[1] + u * climbLen, Math.sin(phi) * R]);
      }
      if (free > 0.02) {
        const last = pts[pts.length - 1], out = normalize([last[0], 0, last[2]]), d = normalize(add(scale(UP, 2.5), out));
        const th = heavyElastica(Math.asin(d[1]), rule.gravity ?? 1, Math.max(3, segs - nClimb));
        th.slice(1).forEach(t => { const q = pts[pts.length - 1]; pts.push(add(q, add(scale(out, Math.cos(t)), scale(UP, Math.sin(t))), free / (th.length - 1))); });
      }
    } else {
      const d0 = normalize(dir), theta0 = Math.asin(clamp(d0[1], -1, 1));
      const flat: V3 = [d0[0], 0, d0[2]], heading = length3(flat) > 1e-4 ? normalize(flat) : normalize([rng() - 0.5, 0, rng() - 0.5]);
      const th = heavyElastica(theta0, rule.gravity ?? 0, segs, rule.tipLoad ?? 0);
      const wander = (rule.wander ?? 0) * DEG, up = (rule.upturn ?? 0) * DEG, freq = len / 0.9;
      for (let i = 1; i <= segs; i++) {
        const u = (i - 0.5) / segs;
        const pitch = clamp(th[i] + up * u + wander * 0.6 * gradNoise(seed, u * freq, 0.5), -Math.PI / 2, Math.PI / 2);
        const h = rotateAxis(heading, UP, wander * gradNoise(seed + 9, u * freq, 3.1));
        const q = add(pts[i - 1], add(scale(h, Math.cos(pitch)), scale(UP, Math.sin(pitch))), len / segs);
        const floor = rule.kind === "prop-root" || rule.kind === "aerial-root" ? -0.06 : 0.004;
        pts.push([q[0], Math.max(floor, q[1]), q[2]]);
      }
    }
    const tip = rule.radius.tip ?? 0.25;
    const nodes = pts.map((p, i) => {
      const u = i / (pts.length - 1);
      return { p, r: Math.max(0.0004, r0 * (1 - (1 - tip) * u) * (stops ? profileAt(stops, u) : 1)) };
    });
    axes.push({ rule, level, nodes, parent, at, length: len, terminal: true, form });
    const index = axes.length - 1;
    branch(index);
    return index;
  };

  /** Lateral children and forks of an axis. */
  const branch = (ai: number) => {
    const a = axes[ai], rule = a.rule;
    for (const c of rule.children ?? []) {
      const cr = rules.get(c.rule);
      if (!cr || (cr.onset !== undefined && stage < cr.onset)) continue;
      const fine = cr.kind === "strand" || cr.kind === "twig";
      let count = c.count ? Math.round(between(rng, c.count[0], c.count[1] + 0.999) - 0.499) : Math.round((c.perMetre ?? 0) * a.length * (c.to - c.from));
      count = Math.round(count * lerp(0.45, 1, stage) * (fine ? o.density : 1));
      const whorl = Math.max(1, c.whorl ?? 1), phi0 = rng() * 360;
      for (let k = 0; k < count; k++) {
        if (c.chance !== undefined && rng() > c.chance) continue;
        const node = Math.floor(k / whorl), nodes = Math.ceil(count / whorl);
        const u = c.from + (c.to - c.from) * clamp((node + 0.5 + (rng() - 0.5) * 0.7) / nodes);
        const { p, t, n, b } = pointAt(ai, u);
        const phi = (phi0 + node * (cr.divergence ?? GOLDEN_ANGLE) + (k % whorl) * 360 / whorl + (rng() - 0.5) * 16) * DEG;
        const q = add(scale(n, Math.cos(phi)), scale(b, Math.sin(phi)));
        const rel = c.to > c.from ? (u - c.from) / (c.to - c.from) : 0;
        const ang = (cr.angle ? lerp(cr.angle[0], cr.angle[1], rel) : 45) * DEG + (rng() - 0.5) * 10 * DEG;
        const d = normalize(add(scale(t, Math.cos(ang)), scale(q, Math.sin(ang))));
        const env = c.envelope ? ENVELOPES[c.envelope](rel) : 1, spread = 1 + (cr.length.spread ?? 0.15) * (rng() * 2 - 1);
        const len = cr.length.of === "drop" ? Math.max(0.05, p[1] * cr.length.ratio * spread) : (cr.length.of === "height" ? H : a.length) * cr.length.ratio * env * spread;
        const r0 = cr.radius.of === "height" ? H * cr.radius.ratio : radiusAt(a, u) * cr.radius.ratio;
        grow(cr, p, d, len, r0, a.level + 1, ai, u);
        // Only a child near the tip ends the axis; side shoots (offsets, laterals) leave its tip free for a rosette.
        if (u >= 0.9) a.terminal = false;
      }
    }
    if (rule.fork) fork(ai);
  };

  /** Dichotomous crown: tip targets on a dome, split into groups at each fork. */
  const fork = (ai: number) => {
    const a = axes[ai], f = a.rule.fork!, fr = rules.get(f.rule);
    const orders = Math.round(f.orders * smooth((stage - 0.22) / 0.72));
    if (!fr || orders < 1) return;
    const meanWays = f.ways.reduce((s, w, i) => s + w * (i + 2), 0) / f.ways.reduce((s, w) => s + w, 0);
    const tips = Math.min(3000, Math.max(2, Math.round(meanWays ** orders)));
    const top = a.nodes[a.nodes.length - 1], grown = (orders / f.orders) ** 0.75;
    const centre: V3 = [top.p[0], Math.max(top.p[1], f.crown.centre * H), top.p[2]];
    const R = f.crown.radius * H * grown, D = f.crown.depth * H * grown, rimSin = Math.sin(f.crown.rim * DEG);
    const targets: V3[] = [];
    for (let i = 0; i < tips; i++) {
      const s = lerp(rimSin, 0.995, (i + 0.5) / tips), c = Math.sqrt(1 - s * s), az = i * GOLDEN_ANGLE * DEG + rng() * 0.2, j = 1 + (rng() - 0.5) * 0.06;
      targets.push([centre[0] + Math.cos(az) * c * R * j, centre[1] + s * D * j, centre[2] + Math.sin(az) * c * R * j]);
    }
    const rTop = top.r, delta = f.leonardo;
    const build = (group: V3[], from: V3, dirIn: V3, depth: number, parent: number) => {
      const ways = Math.min(group.length, 2 + weighted(rng, f.ways));
      // Split along the group's widest direction across the incoming branch.
      const c0 = group.reduce((s, p) => add(s, p), [0, 0, 0] as V3), centroid = scale(c0, 1 / group.length);
      const e1 = perpendicular(dirIn), e2 = cross(dirIn, e1);
      let sxx = 0, sxy = 0, syy = 0;
      for (const p of group) { const d = sub(p, centroid), x = dot(d, e1), y = dot(d, e2); sxx += x * x; sxy += x * y; syy += y * y; }
      const ang = 0.5 * Math.atan2(2 * sxy, sxx - syy), axis = add(scale(e1, Math.cos(ang)), scale(e2, Math.sin(ang)));
      const sorted = group.slice().sort((p, q) => dot(p, axis) - dot(q, axis));
      for (let w = 0; w < ways; w++) {
        const part = sorted.slice(Math.round(w * sorted.length / ways), Math.round((w + 1) * sorted.length / ways));
        if (!part.length) continue;
        const cg = scale(part.reduce((s, p) => add(s, p), [0, 0, 0] as V3), 1 / part.length);
        const remaining = Math.log(part.length) / Math.log(meanWays);
        const to = part.length === 1 ? part[0] : lerp3(from, cg, 1 / (remaining + 1.15));
        const seg = sub(to, from), L = length3(seg), r = rTop * (part.length / tips) ** (1 / delta);
        const c1 = add(from, dirIn, L * 0.3), c2 = add(add(to, seg, -0.3), UP, (f.bow ?? 0.12) * L);
        const n = Math.max(3, Math.round(fr.nodes * o.detail));
        const nodes: FloraNode[] = [];
        for (let i = 0; i < n; i++) { const u = i / (n - 1); nodes.push({ p: bezier3(from, c1, c2, to, u), r: r * (1 - 0.12 * u) }); }
        axes.push({ rule: fr, level: depth + 1, nodes, parent, at: 1, length: L, terminal: part.length === 1 });
        const idx = axes.length - 1;
        axes[parent].terminal = false;
        if (part.length > 1) build(part, to, normalize(sub(to, c2)), depth + 1, idx);
      }
    };
    build(targets, top.p, pointAt(ai, 1).t, a.level, ai);
  };

  // Root axes: one stem, or a colony of stems.
  const root = rules.get(profile.root)!;
  const rootLen = root.length.ratio * H, rootR = root.radius.ratio * H;
  if (root.colony) {
    const R = root.colony.radius * lerp(0.35, 1, stage), spacing = root.colony.spacing / Math.sqrt(Math.max(0.25, o.density));
    const cell = spacing / Math.SQRT2, grid = new Map<string, V3>();
    const tries = Math.round(Math.PI * R * R / (spacing * spacing) * 2.2);
    for (let i = 0; i < tries; i++) {
      const rr = R * Math.sqrt(rng()), az = rng() * Math.PI * 2, p: V3 = [Math.cos(az) * rr, 0, Math.sin(az) * rr];
      const gx = Math.floor(p[0] / cell), gz = Math.floor(p[2] / cell);
      let ok = true;
      for (let dx = -2; dx <= 2 && ok; dx++) for (let dz = -2; dz <= 2 && ok; dz++) { const q = grid.get(`${gx + dx},${gz + dz}`); if (q && Math.hypot(q[0] - p[0], q[2] - p[2]) < spacing) ok = false; }
      if (!ok) continue;
      grid.set(`${gx},${gz}`, p);
      const rel = rr / R, out = normalize([p[0] || 1e-3, 0, p[2]]);
      const d = normalize(add(UP, out, Math.tan(rel * rel * 28 * DEG) + (rng() - 0.5) * 0.15));
      grow(root, p, d, rootLen * lerp(1, root.colony.dome, rel * rel) * (0.88 + 0.24 * rng()), rootR, 0, -1, 0);
    }
  } else {
    const lean = (root.lean !== undefined ? root.lean * (0.75 + 0.5 * rng()) : (rng() - 0.5) * 2 * (root.wander ?? 0) * 0.35) * DEG, az = rng() * Math.PI * 2;
    const d = normalize([Math.sin(lean) * Math.cos(az), Math.cos(lean), Math.sin(lean) * Math.sin(az)]);
    grow(root, [0, root.flare ? -0.08 * rootR : 0, 0], d, rootLen, rootR, 0, -1, 0);
  }

  // Organs.
  const organs: OrganPlacement[] = [];
  const keep = clamp(o.density, 0.05, 1), grow3 = 1 / keep ** 0.3;
  const sizeAt = lerp(0.55, 1, stage);
  const frameOf = (p: V3, y: V3, q: V3, face: OrganRule["face"], roll: number) => {
    const ref = face === "out" ? q : UP;
    let z = sub(ref, scale(y, dot(ref, y)));
    if (length3(z) < 0.08) z = sub(q, scale(y, dot(q, y)));
    z = normalize(rotateAxis(normalize(z), y, roll));
    return { p, y, z, x: cross(y, z) };
  };
  for (const pr of profile.placements) {
    if (pr.onset !== undefined && stage < pr.onset) continue;
    const spec = profile.organs[pr.organ], small = spec.kind === "bud" || (spec.kind === "blade" && spec.length.typical < 0.2);
    axes.forEach((a, ai) => {
      if (a.rule.id !== pr.on || organs.length >= o.maxOrgans * 4) return;
      const maturity = stage * lerp(0.5, 1, a.parent >= 0 ? a.at : 1);
      const roll = () => (rng() - 0.5) * 30 * DEG;
      if (pr.place === "along") {
        const from = pr.from ?? 0, to = pr.to ?? 1;
        const nodes = pr.count ? Math.round(between(rng, pr.count[0], pr.count[1])) : Math.floor(a.length * (to - from) / (pr.spacing ?? 0.1));
        const per = pr.sides ? 2 : pr.perNode ?? 1, phi0 = pr.phase ?? rng() * 360, lift = (pr.lift ?? 0) * DEG;
        for (let k = 0; k < nodes; k++) {
          const u = from + (to - from) * (nodes === 1 ? 0.5 : (k + 0.5) / nodes), rel = (u - from) / (to - from || 1);
          const { p, t, n, b } = pointAt(ai, u);
          // Pinnae lie left and right of the rachis in its own horizontal plane, raised by the lift.
          const side = length3(cross(t, UP)) > 0.05 ? normalize(cross(t, UP)) : n, upish = normalize(cross(side, t));
          for (let j = 0; j < per; j++) {
            if ((pr.chance !== undefined && rng() > pr.chance) || (small && rng() > keep)) continue;
            const phi = (phi0 + k * (pr.divergence ?? GOLDEN_ANGLE) + j * 360 / per) * DEG;
            const q = pr.sides ? normalize(add(scale(side, (j ? -1 : 1) * Math.cos(lift)), scale(upish, Math.sin(lift)))) : add(scale(n, Math.cos(phi)), scale(b, Math.sin(phi)));
            const A = lerp(pr.angle[0], pr.angle[1], rel) * DEG;
            const y = normalize(add(scale(t, Math.cos(A)), scale(q, Math.sin(A))));
            const sc = pr.scale, s = !sc ? 1 : sc.length === 3 ? (rel < 0.5 ? lerp(sc[0], sc[1], rel * 2) : lerp(sc[1], sc[2], rel * 2 - 1)) : lerp(sc[0], sc[1], rel);
            organs.push({ organ: pr.organ, ...frameOf(add(p, q, radiusAt(a, u) * (pr.offset ?? 0.85)), y, q, pr.face, pr.sides ? roll() / 3 : roll()), scale: s * sizeAt * (small ? grow3 : 1), maturity: stage * lerp(0.45, 1, u), pick: rng() });
          }
        }
      } else if (a.terminal) {
        const end = pointAt(ai, 1), count = pr.count ? Math.max(1, Math.round(between(rng, pr.count[0], pr.count[1] + 0.999) - 0.499)) : 1;
        const total = pr.place === "rosette" ? Math.max(3, Math.round(count * lerp(0.45, 1, stage))) : count;
        const phi0 = rng() * 360;
        for (let k = 0; k < total; k++) {
          const phi = (phi0 + k * (pr.divergence ?? GOLDEN_ANGLE)) * DEG, q = add(scale(end.n, Math.cos(phi)), scale(end.b, Math.sin(phi)));
          let y: V3, p = end.p, s = 1;
          if (pr.place === "rosette") {
            const inner = k / Math.max(1, total - 1); // 0 outer (oldest) → 1 inner (youngest)
            const A = lerp(pr.angle[1], pr.angle[0], inner) * DEG + (rng() - 0.5) * 6 * DEG;
            y = normalize(add(scale(end.t, Math.cos(A)), scale(q, Math.sin(A))));
            p = add(add(end.p, end.t, -(pr.rise ?? 0) * (1 - inner)), q, (pr.core ?? 0) * (1 - 0.6 * inner));
            s = pr.scale ? lerp(pr.scale[1], pr.scale[0], inner) : 1;
          } else if (count === 1) {
            // A single organ bends down at the junction (a leaf blade at its geniculum, a flower head).
            const side = normalize(cross(end.t, UP));
            y = length3(cross(end.t, UP)) < 1e-3 ? end.t : normalize(rotateAxis(end.t, side, -pr.angle[0] * DEG));
          } else {
            const A = lerp(pr.angle[0], pr.angle[1], k / Math.max(1, total - 1)) * DEG;
            y = normalize(add(scale(end.t, Math.cos(A)), scale(q, Math.sin(A))));
          }
          const fr = spec.kind === "capitulum" || spec.kind === "corolla" ? (() => { const z = y, x = perpendicular(z); return { p, x, y: cross(z, x), z }; })() : frameOf(p, y, q, pr.face, roll());
          organs.push({ organ: pr.organ, ...fr, scale: s * sizeAt, maturity, pick: rng() });
        }
      }
    });
  }
  const support = profile.support ? { top: supportTop, radius: supportRadius, surface: profile.support.surface } : undefined;
  // Over the cap, thin evenly (never drop whole rosettes at the end) and let the kept organs grow a little.
  const kept = organs.length > o.maxOrgans ? (() => { const k = o.maxOrgans / organs.length; return organs.filter(() => rng() < k).map(g => ({ ...g, scale: g.scale / k ** 0.25 })); })() : organs;
  return { profile, axes, organs: kept, height: H, stage, support };
}
