/** Validate every RIG1 preset × motion and evaluate a few frames of each (CPU only). Usage: npx jiti scripts/rig-validate-all.ts */
import { RIG_PRESETS } from "../registry/rig/rig-presets";
import { evaluateRig } from "../registry/rig/rig-evaluate";
import { inspectRig } from "../registry/rig/rig-spec";

let bad = 0;
for (const p of RIG_PRESETS) for (const motion of p.motions) {
  const spec = p.build({ motion, start: 0, end: Number(process.argv[2] ?? 240), from: 0, to: p.travels(motion) ? 1200 : 0, y: 700, size: p.size });
  const issues = inspectRig(spec);
  let nan = 0;
  for (const f of [0, 37, 120, 239]) for (const part of evaluateRig(spec, f).parts) if (![part.matrix.a, part.matrix.e, part.matrix.f].every(Number.isFinite)) nan++;
  if (issues.length || nan) { bad++; console.log(p.id, motion, issues.slice(0, 5), nan ? nan + " non-finite parts" : ""); }
}
console.log(bad ? bad + " failing" : "all presets valid");
