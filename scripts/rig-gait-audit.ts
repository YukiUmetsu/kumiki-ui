/**
 * RIG1 gait audit: CPU-only geometry checks for legged presets.
 *   slide    — how far a foot moves in the world while it is on the ground (should be ~0)
 *   reach    — legs at full extension while planted (IK clamped: the foot cannot reach where it should be)
 *   hover    — planted frames where the foot is above the ground
 * Usage: npx jiti scripts/rig-gait-audit.ts [subject] [motion]
 */
import { RIG_PRESETS } from "../registry/rig/rig-presets";
import { evaluateRig } from "../registry/rig/rig-evaluate";
import type { RigSpec } from "../registry/rig/rig-spec";

const [onlySubject, onlyMotion] = process.argv.slice(2);
const FRAMES = 240;

function audit(spec: RigSpec) {
  const gaits = (spec.drivers ?? []).filter(d => d.type === "gait");
  const legs = gaits.flatMap(g => g.type === "gait" ? g.legs.map(l => ({ ...l, ground: g.ground ?? spec.ground ?? 0 })) : []);
  const byId = new Map(spec.bones.map(b => [b.id, b]));
  const rows: string[] = [];
  let worstSlide = 0, worstReach = 0, clamped = 0, planted = 0;
  for (const leg of legs) {
    const a = byId.get(leg.upper)!.length!, b = byId.get(leg.lower)!.length!;
    let run: number[] = [];
    const flush = () => { if (run.length > 1) worstSlide = Math.max(worstSlide, Math.max(...run) - Math.min(...run)); run = []; };
    for (let f = 20; f < FRAMES - 20; f++) {
      const fr = evaluateRig(spec, f), up = fr.bones.get(leg.upper)!.world, lo = fr.bones.get(leg.lower)!.world;
      const end = [lo.c * b + lo.e, lo.d * b + lo.f], hip = [up.e, up.f];
      const s = Math.hypot(fr.toScene.a, fr.toScene.b);
      const groundY = fr.root.y + (leg.ground - (leg.sole ?? 0)) * s;
      // A foot is "down" when its ankle is within half a pixel of the sole height, or when its toe is planted.
      const down = Math.abs(end[1] - groundY) < .5;
      const ratio = Math.hypot(end[0] - hip[0], end[1] - hip[1]) / ((a + b) * s);
      if (down) { planted++; run.push(end[0]); worstReach = Math.max(worstReach, ratio); if (ratio > .997) clamped++; } else flush();
    }
    flush();
  }
  // Ankles at the sole height cover the flat part of stance (feet with a toe roll lift the ankle late in stance).
  const travelling = gaits.some(g => g.type === "gait" && g.start !== undefined);
  const expected = travelling ? gaits.reduce((s, g) => s + (g.type === "gait" ? g.legs.length * (g.stance ?? .6) * (g.legs[0].toe ? .52 : 1) : 0), 0) * (FRAMES - 40) : legs.length * (FRAMES - 40);
  rows.push(`slide ${worstSlide.toFixed(2)}px  reach ${(worstReach * 100).toFixed(1)}%  clamped ${clamped}  down ${planted}/${Math.round(expected)}`);
  return rows.join(" ");
}

for (const p of RIG_PRESETS) {
  if (onlySubject && p.id !== onlySubject) continue;
  for (const motion of p.motions) {
    if (onlyMotion && motion !== onlyMotion) continue;
    const travels = p.travels(motion);
    const spec = p.build({ motion, start: 0, end: FRAMES, from: 0, to: travels ? 3000 : 0, y: 700 });
    if (!(spec.drivers ?? []).some(d => d.type === "gait" && (d.start === undefined || d.end === undefined || d.end > d.start))) continue;
    console.log(p.id.padEnd(10), motion.padEnd(10), audit(spec));
  }
}
