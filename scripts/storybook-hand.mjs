// A picture of the shape of a hand, for the painter of the kit of hands. It comes from the measured hand model (ANAT1), so
// that the joints are possible before anything is painted: the forearm comes in from the left, the fingers point to the right.
//
//   node scripts/storybook-hand.mjs --gesture point --view back --out point.png [--type man] [--thick 1.2] [--over '{"thumb":{"cmcAbduct":10}}']
//   node scripts/storybook-hand.mjs --list
import { createServer } from "vite";
import { writeFileSync } from "node:fs";
import { crc32, deflateSync } from "node:zlib";

const arg = (name, or) => { const i = process.argv.indexOf(`--${name}`); return i < 0 ? or : process.argv[i + 1]; };
const chunk = (type, data) => { const b = Buffer.alloc(12 + data.length); b.writeUInt32BE(data.length, 0); b.write(type, 4, "latin1"); data.copy(b, 8); b.writeUInt32BE(crc32(b.subarray(4, 8 + data.length)), 8 + data.length); return b; };
function png(w, h, rgb) {
  const head = Buffer.alloc(13), rows = Buffer.alloc((w * 3 + 1) * h); head.writeUInt32BE(w, 0); head.writeUInt32BE(h, 4); head[8] = 8; head[9] = 2;
  for (let y = 0; y < h; y++) rgb.copy(rows, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", head), chunk("IDAT", deflateSync(rows)), chunk("IEND", Buffer.alloc(0))]);
}
const server = await createServer({ root: process.cwd(), configFile: false, logLevel: "error", server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
try {
  const M = await server.ssrLoadModule("/registry/anatomy/hand-model.ts"), R = await server.ssrLoadModule("/registry/anatomy/hand-render.ts");
  if (process.argv.includes("--list")) { console.log(`gestures: ${M.HAND_GESTURES.map(g => g.id).join(" ")}\ntypes: ${M.HAND_TYPES.map(t => t.id).join(" ")}\nviews: back palm thumb-side little-side three-quarter`); process.exit(0); }
  const gesture = M.HAND_GESTURES.find(g => g.id === arg("gesture", "relaxed")), type = M.HAND_TYPES.find(t => t.id === arg("type", "man")), over = JSON.parse(arg("over", "{}")), out = arg("out");
  if (!gesture || !type || !out) throw new Error("unknown gesture or type, or no --out; --list shows the names");
  const pose = { ...gesture.pose }; for (const [k, v] of Object.entries(over)) pose[k] = v && typeof v === "object" ? { ...pose[k], ...v } : v;
  if (over.thumb) delete pose.thumbTo;
  const hand = M.buildHand({ ...type, thickness: type.thickness * Number(arg("thick", 1.15)), tendons: Number(arg("tendons", type.tendons)), knuckles: Number(arg("knuckles", type.knuckles)) }, arg("side", "right")), N = 768, r = R.renderHand(M.poseHand(hand, pose), { width: N, height: N, background: "#ffffff", detail: 0.4, quality: "full", frameMm: 300, view: arg("view", "back"), yaw: Number(arg("yaw", 0)), pitch: Number(arg("pitch", 0)), roll: Number(arg("roll", 0)) });
  const skin = i => Math.max(r.rgba[i], r.rgba[i + 1], r.rgba[i + 2]) - Math.min(r.rgba[i], r.rgba[i + 1], r.rgba[i + 2]) > 22;
  // turned a quarter so that the fingers point to the right; the wrist is where the width stops getting smaller behind the palm
  const at = (x, y) => 4 * ((N - 1 - x) * N + y), wide = [], mid = [];
  for (let x = 0; x < N; x++) { let a = N, b = 0; for (let y = 0; y < N; y++) if (skin(at(x, y))) { a = Math.min(a, y); b = Math.max(b, y); } wide.push(b > a ? b - a : 0); mid.push((a + b) / 2); }
  let wrist = wide.indexOf(Math.max(...wide.slice(0, Math.round(N * 0.6)))); while (wrist > 20 && Math.min(...wide.slice(wrist - 12, wrist)) < wide[wrist] - 0.2) wrist--;
  const W = 1024, H = 768, size = (260 / type.palmLength) * (300 / N), px = Buffer.alloc(W * H * 3, 255), look = (x, y) => { const X = Math.round(x), Y = Math.round(y); if (X < 0 || Y < 0 || X >= N || Y >= N) return undefined; const i = at(X, Y); return skin(i) ? [r.rgba[i], r.rgba[i + 1], r.rgba[i + 2]] : undefined; };
  const from = wide.findIndex(w => w > 10), end = from + wide.slice(from, from + 40).reduce((m, w, i, l) => (w > l[m] ? i : m), 0);
  for (let X = 0; X < W; X++) for (let Y = 0; Y < H; Y++) {
    // the forearm goes on to the edge of the picture and gets a little wider
    const x0 = wrist + (X - 400) / size, over = Math.max(0, end - x0), x = over ? end : x0, y = mid[Math.max(0, Math.min(N - 1, wrist))] + (Y - 384) / size / (1 + 0.0009 * over), c = look(x, y);
    if (c) px.set(c, 3 * (Y * W + X));
  }
  writeFileSync(out, png(W, H, px));
  console.log(`${out}: ${gesture.id}, ${arg("view", "back")}; the wrist is at 400,384`);
} catch (e) { console.error(String(e)); process.exitCode = 1; } finally { await server.close(); }
