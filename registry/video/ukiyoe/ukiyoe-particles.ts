/**
 * UKIYO1 weather and particles. Every particle's position is a closed-form function of the frame (no simulation
 * state), so seeking is exact. Rain follows Hiroshige's two families of long fine lines; snow and petals drift in the
 * scene wind; fireworks rise as a gold trail and burst into rayed stars; spray is a ballistic burst.
 */
import type { Pt } from "./ukiyoe-core";
import { clamp, clamp01, DEG, hash01, hashSigned, span } from "./ukiyoe-core";
import type { Prim } from "./ukiyoe-prims";
import { circleD } from "./ukiyoe-prims";
import type { UkiyoePaint } from "./ukiyoe-pigments";
import { ash, foxfire, lightning, smokePuffs } from "./ukiyoe-effects";

export type UkiyoeParticleType = "rain" | "snow" | "petals" | "leaves" | "fireflies" | "birds" | "fireworks" | "spray" | "embers" | "ripples" | "sparks" | "smoke" | "lightning" | "ash" | "foxfire";
export const UKIYOE_PARTICLES: readonly UkiyoeParticleType[] = ["rain", "snow", "petals", "leaves", "fireflies", "birds", "fireworks", "spray", "embers", "ripples", "sparks", "smoke", "lightning", "ash", "foxfire"];

export interface UkiyoeBurst { frame: number; x: number; y: number; radius?: number; color?: UkiyoePaint; count?: number; kind?: "peony" | "willow" | "ring"; launchFrom?: number }
export interface UkiyoeParticleSpec {
  type: UkiyoeParticleType;
  /** Area in local coordinates: x, y, width, height. */
  area?: readonly [number, number, number, number];
  count?: number;
  color?: UkiyoePaint;
  /** Fall / travel speed in px per frame. */
  speed?: number;
  /** Rain line angle (degrees from vertical, + leans right) or bird heading. */
  angle?: number;
  size?: number;
  opacity?: number;
  /** Fireworks and spray bursts. */
  bursts?: readonly UkiyoeBurst[];
}

const wrap = (v: number, lo: number, len: number) => lo + ((((v - lo) % len) + len) % len);

export function drawParticles(spec: UkiyoeParticleSpec, frame: number, wind: number, seed: number): Prim[] {
  const [ax, ay, aw, ah] = spec.area ?? [0, 0, 1920, 1080];
  const n = clamp(Math.round(spec.count ?? 120), 0, 2000), size = spec.size ?? 1, out: Prim[] = [];
  switch (spec.type) {
    case "smoke": return smokePuffs(spec.bursts ?? [], frame, seed, size);
    case "lightning": return lightning(spec.bursts ?? [], frame, seed, size, [ax, ay, aw, ah]);
    case "ash": return ash(spec.bursts ?? [], frame, seed, wind, size);
    case "foxfire": return foxfire(n, [ax, ay, aw, ah], frame, seed, size);
    case "rain": {
      // Two families of lines at slightly different angles, like the two rain blocks of a sudden-shower print.
      const speed = spec.speed ?? 34, families: string[] = ["", ""];
      for (let i = 0; i < n; i++) {
        const fam = i % 2, ang = ((spec.angle ?? 4) + (fam ? 3.5 : -1.5) + wind * 9) * DEG;
        const len = (90 + 260 * hash01(seed, i, 1)) * size;
        const travel = frame * speed * (.85 + .3 * hash01(seed, i, 2));
        const y = wrap(ay - len + hash01(seed, i, 3) * (ah + len) + travel, ay - len, ah + len * 1.2);
        const x = wrap(ax + hash01(seed, i, 4) * aw + Math.tan(ang) * (y - ay), ax - 60, aw + 120);
        families[fam] += `M${x.toFixed(1)} ${y.toFixed(1)}l${(Math.sin(ang) * len).toFixed(1)} ${(Math.cos(ang) * len).toFixed(1)}`;
      }
      out.push({ t: "stroke", d: families[0], color: spec.color ?? "sumi", width: 1.1 * size, opacity: (spec.opacity ?? .5), cap: "butt" });
      out.push({ t: "stroke", d: families[1], color: spec.color ?? "sumi", width: .8 * size, opacity: (spec.opacity ?? .5) * .75, cap: "butt" });
      return out;
    }
    case "snow": case "embers": {
      const dots: string[] = [], speed = spec.speed ?? (spec.type === "snow" ? 1.4 : -1.6);
      for (let i = 0; i < n; i++) {
        const r = (1.6 + 3.4 * hash01(seed, i, 1) ** 2) * size, depth = .5 + r / (5 * size);
        const y = wrap(ay + hash01(seed, i, 2) * ah + frame * speed * depth, ay - 10, ah + 20);
        const x = wrap(ax + hash01(seed, i, 3) * aw + Math.sin(frame / (30 + 30 * hash01(seed, i, 4)) + i) * 14 + wind * frame * 2.2 * depth, ax - 10, aw + 20);
        dots.push(circleD(x, y, r));
      }
      out.push({ t: "dots", d: dots.join(""), color: spec.color ?? (spec.type === "snow" ? "gofun" : "tan"), opacity: spec.opacity ?? .95 });
      return out;
    }
    case "petals": case "leaves": {
      const speed = spec.speed ?? 1.2, color = spec.color ?? (spec.type === "petals" ? "sakura" : "beni");
      for (let i = 0; i < n; i++) {
        const s = (5 + 5 * hash01(seed, i, 1)) * size * (spec.type === "leaves" ? 1.6 : 1);
        const y = wrap(ay + hash01(seed, i, 2) * ah + frame * speed * (.7 + .6 * hash01(seed, i, 5)), ay - 20, ah + 40);
        const x = wrap(ax + hash01(seed, i, 3) * aw + Math.sin(frame / 26 + i) * 26 + wind * frame * 3, ax - 20, aw + 40);
        const spin = frame * (2 + 5 * hash01(seed, i, 4)) + i * 40, flip = Math.cos(frame / (9 + 6 * hash01(seed, i, 6)) + i);
        const d = spec.type === "petals"
          ? `M0 ${-s}C${s * .8} ${-s * .6} ${s * .6} ${s * .6} 0 ${s}C${-s * .6} ${s * .6} ${-s * .8} ${-s * .6} 0 ${-s}Z`
          : mapleD(s);
        out.push({ t: "group", transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(spin % 360).toFixed(1)}) scale(${Math.max(.15, Math.abs(flip)).toFixed(2)} 1)`,
          prims: [{ t: "fill", d, fill: color, outline: .6, outlineColor: spec.type === "petals" ? "beni" : "kogecha", noPrint: true }] });
      }
      return out;
    }
    case "fireflies": {
      for (let i = 0; i < n; i++) {
        const x = ax + hash01(seed, i, 1) * aw + Math.sin(frame / 40 + i * 2.1) * 30, y = ay + hash01(seed, i, 2) * ah + Math.cos(frame / 33 + i) * 18;
        const blink = clamp01(Math.sin(frame / (12 + 10 * hash01(seed, i, 3)) + i * 5) * 1.6 - .2);
        if (blink <= 0) continue;
        out.push({ t: "glow", cx: x, cy: y, r: 16 * size, color: spec.color ?? "ki", opacity: .7 * blink });
        out.push({ t: "dots", d: circleD(x, y, 2 * size), color: "gofun", opacity: blink });
      }
      return out;
    }
    case "birds": {
      // A loose flock in V-ish formation; each bird is a carved flapping check mark.
      const heading = (spec.angle ?? 0) * DEG, speed = spec.speed ?? 3, d: string[] = [];
      for (let i = 0; i < n; i++) {
        const row = Math.floor((i + 1) / 2), side = i % 2 ? 1 : -1;
        const ox = -row * 34 + hashSigned(seed, i, 1) * 8, oy = side * row * 18 + hashSigned(seed, i, 2) * 6;
        const travel = frame * speed;
        const x = ax + Math.cos(heading) * (travel + ox) - Math.sin(heading) * oy;
        const y = ay + Math.sin(heading) * (travel + ox) + Math.cos(heading) * oy + Math.sin(frame / 20 + i) * 4;
        const flap = Math.sin(frame / 3.2 + i * 1.3), s = 9 * size, wy = flap * s * .7;
        d.push(`M${(x - s).toFixed(1)} ${(y - wy).toFixed(1)}Q${(x - s * .4).toFixed(1)} ${(y - wy * .3 - 2).toFixed(1)} ${x.toFixed(1)} ${(y + 2).toFixed(1)}Q${(x + s * .4).toFixed(1)} ${(y - wy * .3 - 2).toFixed(1)} ${(x + s).toFixed(1)} ${(y - wy).toFixed(1)}`);
      }
      out.push({ t: "stroke", d: d.join(""), color: spec.color ?? "sumi", width: 2.2 * size, opacity: spec.opacity ?? .9 });
      return out;
    }
    case "ripples": {
      // Expanding rings on water (rain on a river, a stone, a stepping foot), squashed by perspective.
      const d: string[] = [];
      for (let i = 0; i < n; i++) {
        const period = 40 + 30 * hash01(seed, i, 1), life = ((frame + hash01(seed, i, 2) * period) % period) / period;
        const cx = ax + hash01(seed, i, 3) * aw, cy = ay + hash01(seed, i, 4) * ah, r = 4 + 26 * life * size;
        d.push(`M${(cx - r).toFixed(1)} ${cy.toFixed(1)}a${r.toFixed(1)} ${(r * .3).toFixed(1)} 0 1 0 ${(2 * r).toFixed(1)} 0a${r.toFixed(1)} ${(r * .3).toFixed(1)} 0 1 0 ${(-2 * r).toFixed(1)} 0`);
      }
      out.push({ t: "stroke", d: d.join(""), color: spec.color ?? "gofun", width: 1.2, opacity: (spec.opacity ?? .6) });
      return out;
    }
    case "sparks": {
      // Steel on steel: at each burst a white flash, then short gold streaks fly out from the point of contact and fall,
      // gone in about half a second. Each streak is drawn from where it was a frame and a half before (its motion).
      for (const [bi, b] of (spec.bursts ?? []).entries()) {
        const t = frame - b.frame, s = seed + bi * 131, count = b.count ?? 22, R = b.radius ?? 60;
        if (t < 0 || t > 16) continue;
        if (t < 5) out.push({ t: "glow", cx: b.x, cy: b.y, r: R * (.6 + t * .12), color: "gofun", opacity: .85 * (1 - t / 5) });
        const streaks: string[] = [];
        for (let i = 0; i < count; i++) {
          const a = (hash01(s, i, 1) * 360 - 90 + (spec.angle ?? 0)) * DEG, v = R / 7 * (.45 + .8 * hash01(s, i, 2));
          const at = (u: number): Pt => [b.x + Math.cos(a) * v * u + wind * u * .6, b.y + Math.sin(a) * v * u + .32 * u * u];
          const p0 = at(Math.max(0, t - 1.5)), p1 = at(t);
          if (t < 16 - 6 * hash01(s, i, 3)) streaks.push(`M${p0[0].toFixed(1)} ${p0[1].toFixed(1)}L${p1[0].toFixed(1)} ${p1[1].toFixed(1)}`);
        }
        out.push({ t: "stroke", d: streaks.join(""), color: b.color ?? "kin", width: 1.6 * size, opacity: 1 - span(t, 8, 16), cap: "round" });
        out.push({ t: "stroke", d: streaks.join(""), color: "gofun", width: .7 * size, opacity: (1 - span(t, 4, 12)) * .9, cap: "round" });
      }
      return out;
    }
    case "fireworks": case "spray": {
      for (const [bi, b] of (spec.bursts ?? []).entries()) out.push(...burst(spec, b, bi, frame, seed, wind));
      return out;
    }
  }
}

function burst(spec: UkiyoeParticleSpec, b: UkiyoeBurst, bi: number, frame: number, seed: number, wind: number): Prim[] {
  const out: Prim[] = [], color = b.color ?? spec.color ?? (spec.type === "spray" ? "gofun" : "ki");
  const s = seed + bi * 101, R = b.radius ?? (spec.type === "spray" ? 140 : 190), count = b.count ?? (spec.type === "spray" ? 60 : 46);
  if (spec.type === "spray") {
    const t = frame - b.frame;
    if (t < 0 || t > 50) return out;
    const dots: string[] = [];
    for (let i = 0; i < count; i++) {
      const a = (-90 + hashSigned(s, i, 1) * 70 + (spec.angle ?? 0)) * DEG, v = R / 20 * (.4 + .9 * hash01(s, i, 2));
      const x = b.x + Math.cos(a) * v * t + wind * t * 1.2, y = b.y + Math.sin(a) * v * t + .22 * t * t;
      const r = (1.5 + 3.5 * hash01(s, i, 3)) * (1 - t / 55);
      if (r > .3) dots.push(circleD(x, y, r));
    }
    out.push({ t: "dots", d: dots.join(""), color, opacity: 1 - span(t, 30, 50) });
    return out;
  }
  // Rocket: a wavering gold trail rising to the burst point.
  const rise = 26, launch = b.frame - rise, from: Pt = [b.x + 30, b.launchFrom ?? b.y + 520];
  if (frame >= launch && frame < b.frame + 6) {
    const k = clamp01((frame - launch) / rise), pts: Pt[] = [];
    for (let j = 0; j <= 16; j++) { const u = j / 16 * k; pts.push([from[0] + (b.x - from[0]) * u + Math.sin(u * 9 + bi) * 6, from[1] + (b.y - from[1]) * u]); }
    const fade = frame >= b.frame ? 1 - (frame - b.frame) / 6 : 1;
    out.push({ t: "stroke", d: "M" + pts.map(q => q[0].toFixed(1) + " " + q[1].toFixed(1)).join("L"), color: "kin", width: 2.2, opacity: .9 * fade });
  }
  const t = frame - b.frame;
  if (t < 0 || t > 80) return out;
  const life = t / 80, open = 1 - (1 - Math.min(1, t / 22)) ** 3;
  // The atenashi glow of the burst lighting the night, strongest at ignition.
  out.push({ t: "glow", cx: b.x, cy: b.y + life * 30, r: R * (1.3 + open * .6), color: "gofun", opacity: .55 * (1 - life) ** 1.5 });
  const stars: string[] = [], rays: string[] = [], trails: string[] = [];
  for (let i = 0; i < count; i++) {
    const ring = b.kind === "ring";
    const a = (i / count) * Math.PI * 2 + hashSigned(s, i, 1) * (ring ? .02 : .2), rr = R * open * (ring ? 1 : .55 + .45 * hash01(s, i, 2));
    const droop = (b.kind === "willow" ? 140 : 50) * life * life;
    const x = b.x + Math.cos(a) * rr, y = b.y + Math.sin(a) * rr + droop;
    const tw = .6 + .4 * Math.sin(frame * .9 + i * 3);
    const r = (3 + 2.2 * hash01(s, i, 3)) * (1 - life * .6);
    stars.push(circleD(x, y, r));
    const rl = r * (2.6 + tw * 1.4);
    for (let k = 0; k < 4; k++) { const ra = a + k * Math.PI / 4 + frame * .02; rays.push(`M${(x - Math.cos(ra) * rl).toFixed(1)} ${(y - Math.sin(ra) * rl).toFixed(1)}L${(x + Math.cos(ra) * rl).toFixed(1)} ${(y + Math.sin(ra) * rl).toFixed(1)}`); }
    if (b.kind === "willow" && t > 6) trails.push(`M${(b.x + Math.cos(a) * rr * .6).toFixed(1)} ${(b.y + Math.sin(a) * rr * .6 + droop * .4).toFixed(1)}Q${(b.x + Math.cos(a) * rr * .95).toFixed(1)} ${(b.y + Math.sin(a) * rr * .9).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  const alpha = 1 - span(life, .55, 1);
  if (trails.length) out.push({ t: "stroke", d: trails.join(""), color: "kin", width: 1.3, opacity: .7 * alpha });
  out.push({ t: "stroke", d: rays.join(""), color, width: 1.1, opacity: .85 * alpha });
  out.push({ t: "dots", d: stars.join(""), color: "shu", opacity: alpha });
  return out;
}

function mapleD(s: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? s * .42 : s;
    pts.push(`${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}`);
  }
  return "M" + pts.join("L") + "Z";
}
