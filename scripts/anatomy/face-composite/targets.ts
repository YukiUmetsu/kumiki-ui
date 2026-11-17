import { writeFileSync } from "node:fs";
import { createFace, FACE_LANDMARKS } from "../../../registry/anatomy/anatomy-face";
const out: Record<string, unknown> = { landmarks: FACE_LANDMARKS };
for (const sex of [0, 1]) out[sex ? "male" : "female"] = createFace({ sex }).vertices.map(v => v.map(x => Math.round(x * 1000) / 1000));
writeFileSync(process.argv[2], JSON.stringify(out));
console.log("vertices", (out.female as number[][]).length);
