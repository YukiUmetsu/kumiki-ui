// Render a portrait for fitting and dump the face's vertices (the same options), so landmarks can be mapped to mm.
import { writeFileSync } from "node:fs";
import { renderPortrait } from "../../../registry/anatomy/face-portrait";
import { beautifulFace } from "../../../registry/anatomy/face-beauty";
const o = JSON.parse(process.argv[2]), out = process.argv[3];
const p = renderPortrait(o);
writeFileSync(out + ".rgba", Buffer.from(p.rgba.buffer));
const f = beautifulFace(o);
writeFileSync(out + ".verts.json", JSON.stringify({ w: p.width, h: p.height, vertices: f.vertices }));
console.log("rendered", p.width, p.height, Math.round(p.ms) + "ms");
