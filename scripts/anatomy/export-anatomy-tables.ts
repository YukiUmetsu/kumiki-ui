/**
 * Regenerate ANAT1's model-derived tables from the baked lattice (no network):
 *   npx jiti scripts/anatomy/export-anatomy-tables.ts
 * Writes registry/anatomy/data/model-tables.json: proportions by age and sex (heads tall, eye line within the head,
 * crotch and navel heights, shoulder and hip widths), the calibration of the adult defaults against ANSUR II, and
 * landmark/joint positions for every HUMAN_PRESETS person (rest pose, metres).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createHumanBody, decodeHumanBodyModel, HUMAN_PRESETS, humanJoints, humanLandmarks } from "../../registry/anatomy/anatomy-body";
import { ANSUR_KEYS, measureHumanBody } from "../../registry/anatomy/anatomy-measure";

const root = new URL("../../", import.meta.url).pathname;
const buf = readFileSync(root + "assets/models/anatomy/human-body-lattice.bin");
const model = decodeHumanBodyModel(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const ansur = JSON.parse(readFileSync(root + "registry/anatomy/data/ansur-ii-ranges.json", "utf8"));
const r3 = (v: number) => Math.round(v * 1000) / 1000;

const ages = [1, 2, 3, 4, 6, 8, 10, 12, 14, 16, 18, 21, 25, 35, 45, 55, 65, 75, 90];
const byAge: Record<string, unknown[]> = { female: [], male: [] };
for (const [sex, s] of [["female", 0], ["male", 1]] as const) for (const age of ages) {
  const b = createHumanBody(model, { sex: s, age });
  const m = measureHumanBody(b), L = humanLandmarks(b, b.points), J = humanJoints(b, b.points);
  const eyeY = (J["eye.L"].head[1] + J["eye.R"].head[1]) / 2;
  byAge[sex].push({
    age, stature: r3(m.stature), headsTall: Math.round(m.headsTall * 100) / 100, headHeight: r3(m.headHeight),
    eyeLineInHead: r3((eyeY - L.menton[1]) / m.headHeight), crotchRatio: r3(m.crotchHeight / m.stature), navelRatio: r3(m.waistHeight / m.stature),
    shoulderHeads: r3(m.biacromialBreadth / m.headHeight), hipHeads: r3(m.hipBreadth / m.headHeight), legRatio: r3((m.thighLength + m.shinLength) / m.stature),
  });
}
const calibration: Record<string, unknown[]> = { female: [], male: [] };
for (const [sex, s] of [["female", 0], ["male", 1]] as const) {
  const m = measureHumanBody(createHumanBody(model, { sex: s, age: 25 })) as unknown as Record<string, number>;
  for (const [k, a] of Object.entries(ANSUR_KEYS)) {
    const A = ansur[sex].measurements[a!];
    if (!A?.ratioToStature) continue;
    const r = m[k] / m.stature;
    calibration[sex].push({ measure: k, ansur: a, modelMm: Math.round(m[k] * 1000), modelRatio: r3(r * 1) , ansurRatioP50: A.ratioToStature.p50, z: Math.round(((r - A.ratioToStature.mean) / A.ratioToStature.sd) * 10) / 10 });
  }
}
const presets = HUMAN_PRESETS.map(p => {
  const b = createHumanBody(model, p.params), m = measureHumanBody(b);
  const L = humanLandmarks(b, b.points), J = humanJoints(b, b.points);
  const v = (x: number[]) => x.map(r3);
  return {
    id: p.id, label: p.label, params: p.params, stature: r3(m.stature), headsTall: Math.round(m.headsTall * 100) / 100, massKg: Math.round(m.massKg), bmi: Math.round(m.bmi * 10) / 10,
    landmarks: Object.fromEntries(Object.entries(L).map(([k, x]) => [k, v(x)])),
    joints: Object.fromEntries(Object.entries(J).filter(([k]) => !/finger|metacarpal|eye|jaw|toe/.test(k)).map(([k, x]) => [k, { head: v(x.head), tail: v(x.tail) }])),
  };
});
writeFileSync(root + "registry/anatomy/data/model-tables.json", JSON.stringify({
  schema: "kumiki.anatomy.model-tables/1",
  note: "Derived from the CC0 MakeHuman lattice by scripts/anatomy/export-anatomy-tables.ts. Model values are sculpted, not measured: compare with ANSUR II (adults) before treating a number as population data.",
  axes: "metres; +x figure's left, +y up, +z forward; rest pose (MakeHuman A-pose)",
  byAge, calibration, presets,
}) + "\n");
console.log("wrote model-tables.json", JSON.stringify(byAge.female[1]), JSON.stringify(byAge.male[12]));
