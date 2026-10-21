/** Physically based building materials for crafted home assets.
 *
 * Every surface is painted procedurally with a seeded PRNG (no downloads) at a
 * stated physical scale, so UVs authored in meters tile at true size:
 * lumber grain, oriented-strand board flakes, painted lap siding, asphalt
 * granules, synthetic underlayment, fiberglass batts, blown insulation,
 * drywall, broom-finished concrete, running-bond brick, CMU block, soil
 * strata, lawn and oak flooring, plus metals, glass and polymers.
 *
 * Construction materials are generic (no trade names or brand colors).
 */
import { Color, MeshPhysicalMaterial, Vector2 } from "three";
import type { Material, Texture } from "three";
import { paintTexture, paintWithRelief } from "../craft/canvas-texture";
import type { Painter } from "../craft/canvas-texture";
import { applySurfaceDetail } from "../craft/surface-detail";
import type { HouseCondition, HousePalette } from "./home-model";

/** Texture repeat that maps meter-UVs to a tile of `w × h` meters. */
const meters = (texture: Texture, w: number, h: number) => { texture.repeat.set(1 / w, 1 / h); return texture; };

const shade = (hex: string, k: number) => {
  const c = new Color(hex);
  if (k >= 0) c.lerp(new Color("#ffffff"), k); else c.lerp(new Color("#000000"), -k);
  return `#${c.getHexString()}`;
};

const grain = (base: string, dark: string, knots: boolean): Painter => (ctx, w, h, random) => {
  ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
  // Growth rings: long wavering streaks along u (the member's length).
  for (let i = 0; i < 90; i++) {
    const y0 = random() * h, amp = 1 + random() * 5, freq = 1 + random() * 3, phase = random() * 6.28;
    ctx.strokeStyle = random() < .5 ? dark : shade(base, .12);
    ctx.globalAlpha = .08 + random() * .16; ctx.lineWidth = .6 + random() * 1.8;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 8) {
      const y = y0 + Math.sin(x / w * Math.PI * 2 * freq + phase) * amp;
      if (x) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
  if (knots) for (let i = 0; i < 3; i++) {
    const x = random() * w, y = random() * h, r = 3 + random() * 6;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.4);
    g.addColorStop(0, shade(dark, -.3)); g.addColorStop(.35, dark); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = .7; ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, r * 2.6, r, 0, 0, 6.29); ctx.fill();
  }
  ctx.globalAlpha = 1;
};

const osb: Painter = (ctx, w, h, random) => {
  ctx.fillStyle = "#c6a46a"; ctx.fillRect(0, 0, w, h);
  // Thousands of overlapping wood strands, loosely aligned along the long axis.
  const tones = ["#d9bb81", "#b88f55", "#a77d45", "#e3c995", "#c39a5e", "#9b7444"];
  for (let i = 0; i < 4200; i++) {
    const x = random() * w, y = random() * h, len = 18 + random() * 46, wid = 4 + random() * 9;
    const a = Math.PI / 2 + (random() - .5) * .9;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.globalAlpha = .55 + random() * .4; ctx.fillStyle = tones[Math.floor(random() * tones.length)];
    ctx.fillRect(-len / 2, -wid / 2, len, wid);
    ctx.globalAlpha = .18; ctx.fillStyle = "#6e4e28"; ctx.fillRect(-len / 2, wid / 2 - 1, len, 1);
    ctx.restore();
  }
  // Panel edge: slightly darker, compressed perimeter and a printed spacing line.
  ctx.globalAlpha = .55; ctx.strokeStyle = "#5c4426"; ctx.lineWidth = 3; ctx.strokeRect(1.5, 1.5, w - 3, h - 3);
  ctx.globalAlpha = .28; ctx.setLineDash([10, 16]); ctx.lineWidth = 1.5;
  for (const x of [w * .25, w * .5, w * .75]) { ctx.beginPath(); ctx.moveTo(x, 8); ctx.lineTo(x, h - 8); ctx.stroke(); }
  ctx.setLineDash([]); ctx.globalAlpha = 1;
};

const granules = (base: string, condition: HouseCondition): Painter => (ctx, w, h, random) => {
  ctx.fillStyle = shade(base, -.12); ctx.fillRect(0, 0, w, h);
  const light = shade(base, condition === "new" ? .22 : .27), dark = shade(base, -.5);
  for (let i = 0; i < w * h * .55; i++) {
    const x = random() * w, y = random() * h, r = .6 + random() * 1.5, pick = random();
    ctx.fillStyle = pick < .28 ? light : pick < .62 ? dark : shade(base, (random() - .5) * .3);
    ctx.globalAlpha = .35 + random() * .5; ctx.fillRect(x, y, r, r);
  }
  ctx.globalAlpha = 1;
};

const underlayment: Painter = (ctx, w, h, random) => {
  ctx.fillStyle = "#3b3f44"; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 3000; i++) { ctx.fillStyle = random() < .5 ? "#4a4f55" : "#30343a"; ctx.globalAlpha = .5; ctx.fillRect(random() * w, random() * h, 2 + random() * 6, 1); }
  // Printed lap guide lines and fastener grid.
  ctx.globalAlpha = .55; ctx.strokeStyle = "#c9ccd0"; ctx.lineWidth = 2;
  for (const y of [h * .12, h * .88]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  ctx.fillStyle = "#c9ccd0";
  for (let x = w / 16; x < w; x += w / 8) for (let y = h * .3; y < h * .8; y += h * .2) { ctx.beginPath(); ctx.arc(x, y, 3, 0, 6.29); ctx.fill(); }
  ctx.globalAlpha = 1;
};

const fiberglass: Painter = (ctx, w, h, random) => {
  ctx.fillStyle = "#d9bd73"; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 9000; i++) {
    const x = random() * w, y = random() * h, len = 4 + random() * 14, a = random() * 6.28;
    ctx.strokeStyle = random() < .5 ? "#f2dc9b" : "#b39550"; ctx.globalAlpha = .25 + random() * .35; ctx.lineWidth = .6 + random();
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a) * len * .5 + (random() - .5) * 6, y + Math.sin(a) * len * .5, x + Math.cos(a) * len, y + Math.sin(a) * len); ctx.stroke();
  }
  // Soft compression valleys every batt (vertical stripes).
  for (let x = 0; x < w; x += w / 2) { const g = ctx.createLinearGradient(x - 18, 0, x + 18, 0); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(.5, "rgba(70,50,10,.25)"); g.addColorStop(1, "rgba(0,0,0,0)"); ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(x - 18, 0, 36, h); }
  ctx.globalAlpha = 1;
};

const blown: Painter = (ctx, w, h, random) => {
  ctx.fillStyle = "#cfc6b0"; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) {
    const x = random() * w, y = random() * h, r = 2 + random() * 9;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const c = random() < .5 ? "232,226,210" : random() < .5 ? "170,160,140" : "210,196,160";
    g.addColorStop(0, `rgba(${c},.65)`); g.addColorStop(1, `rgba(${c},0)`);
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
};

const concrete = (base: string): Painter => (ctx, w, h, random) => {
  ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) {
    const x = random() * w, y = random() * h, r = 10 + random() * 60;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const k = random() < .5 ? "255,255,255" : "0,0,0";
    g.addColorStop(0, `rgba(${k},${.03 + random() * .04})`); g.addColorStop(1, `rgba(${k},0)`);
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let i = 0; i < w * h * .02; i++) { ctx.fillStyle = random() < .7 ? shade(base, -.35) : shade(base, .25); ctx.globalAlpha = .5; ctx.fillRect(random() * w, random() * h, 1 + random() * 2, 1 + random() * 2); }
  ctx.globalAlpha = 1;
};

const brick = (base: string): Painter => (ctx, w, h, random) => {
  // Tile: 4 courses × 2 bricks of 215×65 mm + 10 mm joints → 0.45 × 0.3 m.
  ctx.fillStyle = "#b9b2a6"; ctx.fillRect(0, 0, w, h);
  const rows = 4, cols = 2, bh = h / rows, bw = w / cols, joint = Math.max(2, Math.round(h * .033));
  for (let r = 0; r < rows; r++) for (let c = -1; c <= cols; c++) {
    const x = c * bw + (r % 2 ? bw / 2 : 0), y = r * bh;
    ctx.fillStyle = shade(base, (random() - .5) * .34);
    ctx.fillRect(x + joint / 2, y + joint / 2, bw - joint, bh - joint);
    for (let i = 0; i < 70; i++) { ctx.fillStyle = random() < .5 ? shade(base, -.3) : shade(base, .2); ctx.globalAlpha = .35; ctx.fillRect(x + joint / 2 + random() * (bw - joint), y + joint / 2 + random() * (bh - joint), 2, 2); }
    ctx.globalAlpha = 1;
  }
};

const cmu: Painter = (ctx, w, h, random) => {
  // Tile: 2 courses × 2 blocks of 400×200 mm → 0.8 × 0.4 m.
  ctx.fillStyle = "#8f8b84"; ctx.fillRect(0, 0, w, h);
  const rows = 2, cols = 2, bh = h / rows, bw = w / cols, joint = Math.max(2, Math.round(h * .025));
  for (let r = 0; r < rows; r++) for (let c = -1; c <= cols; c++) {
    const x = c * bw + (r % 2 ? bw / 2 : 0), y = r * bh;
    ctx.fillStyle = shade("#a6a29a", (random() - .5) * .14);
    ctx.fillRect(x + joint / 2, y + joint / 2, bw - joint, bh - joint);
    for (let i = 0; i < 260; i++) { ctx.fillStyle = random() < .5 ? "#7d7973" : "#bdb9b1"; ctx.globalAlpha = .45; ctx.fillRect(x + random() * bw, y + random() * bh, 1.5, 1.5); }
    ctx.globalAlpha = 1;
  }
};

const soil: Painter = (ctx, w, h, random) => {
  // Strata top → bottom: topsoil, subsoil, clay/gravel.
  const bands: Array<[number, string]> = [[.0, "#3e2f22"], [.12, "#4c3a29"], [.35, "#6b5236"], [.7, "#7f6a4c"], [1, "#857659"]];
  const g = ctx.createLinearGradient(0, 0, 0, h);
  for (const [t, c] of bands) g.addColorStop(t, c);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) {
    const y = random() * h, x = random() * w, r = 1 + random() * (y / h) * 6;
    ctx.fillStyle = random() < .5 ? "rgba(30,20,12,.4)" : "rgba(170,150,120,.35)";
    ctx.beginPath(); ctx.ellipse(x, y, r, r * (.6 + random() * .4), random() * 3, 0, 6.29); ctx.fill();
  }
  // Root hairs in the topsoil.
  ctx.strokeStyle = "rgba(160,130,90,.35)"; ctx.lineWidth = 1;
  for (let i = 0; i < 160; i++) { const x = random() * w; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + (random() - .5) * 14, h * (.04 + random() * .1)); ctx.stroke(); }
};

const lawn = (base: string): Painter => (ctx, w, h, random) => {
  ctx.fillStyle = shade(base, -.38); ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < w * h * .35; i++) {
    const x = random() * w, y = random() * h, len = 2 + random() * 5, a = random() * 6.28;
    ctx.strokeStyle = shade(base, (random() - .62) * .7); ctx.globalAlpha = .7; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); ctx.stroke();
  }
  ctx.globalAlpha = 1;
};

const oak: Painter = (ctx, w, h, random) => {
  // Tile: 8 boards × 140 mm, random butt joints → 1.12 × 2.4 m.
  const boards = 8, bw = w / boards;
  for (let b = 0; b < boards; b++) {
    let y = -random() * h * .5;
    while (y < h) {
      const len = h * (.25 + random() * .45);
      ctx.fillStyle = shade("#a9794a", (random() - .5) * .3);
      ctx.fillRect(b * bw, y, bw, len);
      ctx.globalAlpha = .18;
      for (let i = 0; i < 14; i++) { ctx.strokeStyle = random() < .5 ? "#5b3a1e" : "#d8ad7a"; ctx.lineWidth = .8; const x = b * bw + random() * bw; ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + (random() - .5) * 8, y + len * .3, x + (random() - .5) * 8, y + len * .6, x + (random() - .5) * 4, y + len); ctx.stroke(); }
      ctx.globalAlpha = .6; ctx.fillStyle = "#3a2716"; ctx.fillRect(b * bw, y, bw, 1.5); ctx.fillRect(b * bw, y, 1.2, len);
      ctx.globalAlpha = 1;
      y += len;
    }
  }
};

const fins: Painter = (ctx, w, h) => {
  // Condenser coil: dense vertical aluminum fins over copper hairpins.
  ctx.fillStyle = "#4a4f52"; ctx.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 3) { ctx.fillStyle = x % 6 ? "#7d858a" : "#5b6266"; ctx.fillRect(x, 0, 1.5, h); }
  ctx.fillStyle = "#9b6a43";
  for (let y = 10; y < h; y += 24) for (let x = 8; x < w; x += 32) ctx.fillRect(x, y, 6, 4);
};

const ductSeams: Painter = (ctx, w, h, random) => {
  ctx.fillStyle = "#9ea4a8"; ctx.fillRect(0, 0, w, h);
  // Galvanized spangle: irregular crystalline patches.
  for (let i = 0; i < 260; i++) { ctx.fillStyle = random() < .5 ? "#b4babe" : "#8d9397"; ctx.globalAlpha = .45; ctx.beginPath(); const x = random() * w, y = random() * h, r = 8 + random() * 22; for (let k = 0; k < 6; k++) { const a = k / 6 * 6.28 + random() * .6; ctx.lineTo(x + Math.cos(a) * r * (.6 + random() * .5), y + Math.sin(a) * r * (.6 + random() * .5)); } ctx.fill(); }
  ctx.globalAlpha = .7; ctx.fillStyle = "#6f7579"; ctx.fillRect(0, h * .48, w, 4);
  ctx.globalAlpha = 1;
};

const soffit: Painter = (ctx, w, h) => {
  ctx.fillStyle = "#f2f0ea"; ctx.fillRect(0, 0, w, h);
  // Vented soffit: rows of perforation slots between V-grooves.
  ctx.fillStyle = "#9a9890";
  for (let y = h / 8; y < h; y += h / 4) for (let x = 6; x < w; x += 10) ctx.fillRect(x, y - 3, 5, 6);
  ctx.fillStyle = "#c9c6bd"; for (let y = 0; y < h; y += h / 4) ctx.fillRect(0, y, w, 2);
};

const pvCells: Painter = (ctx, w, h) => {
  // 6 × 10 monocrystalline cells with busbars and a white backsheet grid.
  ctx.fillStyle = "#d8dde2"; ctx.fillRect(0, 0, w, h);
  const cols = 6, rows = 10, gap = Math.max(2, w * .012), cw = (w - gap * (cols + 1)) / cols, ch = (h - gap * (rows + 1)) / rows;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = gap + c * (cw + gap), y = gap + r * (ch + gap), cut = cw * .12;
    ctx.fillStyle = "#121a2b";
    ctx.beginPath(); ctx.moveTo(x + cut, y); ctx.lineTo(x + cw - cut, y); ctx.lineTo(x + cw, y + cut); ctx.lineTo(x + cw, y + ch - cut); ctx.lineTo(x + cw - cut, y + ch); ctx.lineTo(x + cut, y + ch); ctx.lineTo(x, y + ch - cut); ctx.lineTo(x, y + cut); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#7c8796"; for (let k = 1; k <= 3; k++) ctx.fillRect(x + cw * k / 4 - .8, y, 1.6, ch);
    ctx.fillStyle = "rgba(120,140,170,.18)"; for (let k = 1; k < 18; k++) ctx.fillRect(x, y + ch * k / 18, cw, .6);
  }
};

export interface HomeMaterialOptions {
  palette: HousePalette;
  condition?: HouseCondition;
  seed?: number;
  /** Texture resolution scale (0.5 for thumbnails, 1 default). */
  detail?: number;
}

/** Every material a home build needs; one owner disposes all textures and materials. */
export function createHomeMaterials({ palette, condition = "new", seed = 11, detail = 1 }: HomeMaterialOptions) {
  const textures: Texture[] = [];
  const materials: Material[] = [];
  const px = (n: number) => Math.max(64, Math.round(n * detail / 32) * 32);
  const tex = <T extends Texture>(t: T) => { textures.push(t); return t; };
  const relief = (w: number, h: number, painter: Painter, strength: number, s: number, tileW: number, tileH: number) => {
    const r = paintWithRelief(px(w), px(h), painter, { seed: seed + s, strength, repeat: true });
    tex(meters(r.map, tileW, tileH)); tex(meters(r.normalMap, tileW, tileH));
    return r;
  };
  const mat = <M extends Material>(m: M) => { materials.push(m); return m; };
  const aged = condition !== "new";
  const fade = (hex: string, k: number) => aged ? shade(hex, k) : hex;

  const lumberTex = relief(1024, 256, grain("#d2ad75", "#9a7444", true), 1.4, 1, 2.4, .6);
  const lumber = mat(new MeshPhysicalMaterial({ map: lumberTex.map, normalMap: lumberTex.normalMap, normalScale: new Vector2(.6, .6), roughness: .78 }));
  const osbTex = relief(512, 1024, osb, 2.4, 2, 1.22, 2.44);
  const osbMat = mat(new MeshPhysicalMaterial({ map: osbTex.map, normalMap: osbTex.normalMap, normalScale: new Vector2(.8, .8), roughness: .86 }));
  const sidingTex = relief(1024, 128, grain(fade(palette.siding, .12), shade(palette.siding, -.12), false), .7, 3, 2.4, .3);
  const siding = mat(new MeshPhysicalMaterial({ color: "#ffffff", vertexColors: true, map: sidingTex.map, normalMap: sidingTex.normalMap, normalScale: new Vector2(.35, .35), roughness: aged ? .72 : .56, clearcoat: aged ? 0 : .08 }));
  const trim = mat(new MeshPhysicalMaterial({ color: fade(palette.trim, -.06), roughness: .48, clearcoat: .2, clearcoatRoughness: .4 }));
  const door = mat(new MeshPhysicalMaterial({ color: palette.door, roughness: .32, clearcoat: .7, clearcoatRoughness: .18 }));
  const shutter = mat(new MeshPhysicalMaterial({ color: palette.shutters, roughness: .5, clearcoat: .25 }));
  const granuleTex = relief(512, 512, granules(fade(palette.shingles, .1), condition), 2.6, 4, .5, .5);
  const shingles = mat(new MeshPhysicalMaterial({ color: "#ffffff", map: granuleTex.map, normalMap: granuleTex.normalMap, normalScale: new Vector2(1.2, 1.2), roughness: .93, vertexColors: true }));
  const underTex = relief(1024, 512, underlayment, .8, 5, 2, 1);
  const under = mat(new MeshPhysicalMaterial({ map: underTex.map, normalMap: underTex.normalMap, roughness: .7, clearcoat: .1 }));
  const battTex = relief(512, 512, fiberglass, 3, 6, .82, .82);
  const batts = mat(new MeshPhysicalMaterial({ map: battTex.map, normalMap: battTex.normalMap, normalScale: new Vector2(1.4, 1.4), roughness: .97, sheen: .6, sheenRoughness: .8, sheenColor: new Color("#fff1c6") }));
  const blownTex = relief(512, 512, blown, 3, 7, 1, 1);
  const blownMat = mat(new MeshPhysicalMaterial({ map: blownTex.map, normalMap: blownTex.normalMap, normalScale: new Vector2(1.5, 1.5), roughness: .98 }));
  const drywall = mat(applySurfaceDetail(new MeshPhysicalMaterial({ color: "#ebe9e3", roughness: .9, emissive: "#ffc98a", emissiveIntensity: 0 }), { kind: "paper", frequency: 40, strength: .0003, roughnessVariation: .08 }));
  const concreteTex = relief(512, 512, concrete(palette.foundation), 1.2, 8, 1.5, 1.5);
  const concreteMat = mat(new MeshPhysicalMaterial({ map: concreteTex.map, normalMap: concreteTex.normalMap, normalScale: new Vector2(.6, .6), roughness: .88 }));
  const paving = mat(new MeshPhysicalMaterial({ map: concreteTex.map, normalMap: concreteTex.normalMap, color: "#e6e2da", roughness: .82 }));
  const brickTex = relief(512, 341, brick(palette.brick), 2.2, 9, .45, .3);
  const brickMat = mat(new MeshPhysicalMaterial({ map: brickTex.map, normalMap: brickTex.normalMap, normalScale: new Vector2(1.1, 1.1), roughness: .86 }));
  const cmuTex = relief(512, 256, cmu, 2.2, 10, .8, .4);
  const cmuMat = mat(new MeshPhysicalMaterial({ map: cmuTex.map, normalMap: cmuTex.normalMap, normalScale: new Vector2(1, 1), roughness: .9 }));
  const soilTex = relief(512, 1024, soil, 1.6, 11, 3, 3);
  const soilMat = mat(new MeshPhysicalMaterial({ map: soilTex.map, normalMap: soilTex.normalMap, roughness: .96 }));
  const lawnTex = relief(512, 512, lawn(palette.ground), 1.4, 12, 1, 1);
  const lawnMat = mat(new MeshPhysicalMaterial({ map: lawnTex.map, normalMap: lawnTex.normalMap, normalScale: new Vector2(.8, .8), roughness: .96 }));
  const oakTex = relief(512, 1024, oak, .9, 13, 1.12, 2.4);
  const floor = mat(new MeshPhysicalMaterial({ map: oakTex.map, normalMap: oakTex.normalMap, normalScale: new Vector2(.3, .3), roughness: .42, clearcoat: .35, clearcoatRoughness: .3 }));
  const finTex = tex(meters(paintTexture(px(256), px(256), fins, { seed: seed + 14, repeat: true }), .25, .25));
  const coil = mat(new MeshPhysicalMaterial({ map: finTex, metalness: .7, roughness: .45 }));
  const ductTex = relief(512, 512, ductSeams, .5, 15, 1.2, 1.2);
  const galvanized = mat(new MeshPhysicalMaterial({ map: ductTex.map, normalMap: ductTex.normalMap, normalScale: new Vector2(.2, .2), metalness: .85, roughness: .38 }));
  const soffitTex = relief(256, 256, soffit, 1.6, 16, .3, .3);
  const soffitMat = mat(new MeshPhysicalMaterial({ map: soffitTex.map, normalMap: soffitTex.normalMap, roughness: .5 }));
  const pvTex = tex(paintTexture(px(384), px(640), pvCells, { seed: seed + 17 }));
  const pv = mat(new MeshPhysicalMaterial({ map: pvTex, roughness: .12, metalness: .1, clearcoat: 1, clearcoatRoughness: .03 }));

  return {
    lumber, osb: osbMat, siding, trim, door, shutter, shingles, underlayment: under, batts, blown: blownMat, drywall,
    concrete: concreteMat, paving, brick: brickMat, cmu: cmuMat, soil: soilMat, lawn: lawnMat, floor, coil, galvanized, soffit: soffitMat, pv,
    glass: mat(new MeshPhysicalMaterial({ color: "#a9bfca", metalness: 0, roughness: .03, transparent: true, opacity: .32, clearcoat: 1, envMapIntensity: 1.6, depthWrite: false })),
    interiorGlow: mat(new MeshPhysicalMaterial({ color: "#1b1712", emissive: "#ffc27a", emissiveIntensity: 0, roughness: .9 })),
    aluminum: mat(new MeshPhysicalMaterial({ color: fade(palette.trim, -.04), metalness: .55, roughness: .32, clearcoat: .4 })),
    brushed: mat(new MeshPhysicalMaterial({ color: "#c1c6c9", metalness: .95, roughness: .3 })),
    copper: mat(new MeshPhysicalMaterial({ color: "#c47d4e", metalness: 1, roughness: .28 })),
    brass: mat(new MeshPhysicalMaterial({ color: "#c9a253", metalness: 1, roughness: .3 })),
    foam: mat(new MeshPhysicalMaterial({ color: "#1d1f21", roughness: .95 })),
    cabinet: mat(new MeshPhysicalMaterial({ color: "#d6d3cb", metalness: .35, roughness: .4, clearcoat: .45 })),
    cabinetDark: mat(new MeshPhysicalMaterial({ color: "#3c4145", metalness: .4, roughness: .45, clearcoat: .3 })),
    polymer: mat(new MeshPhysicalMaterial({ color: "#1f2326", roughness: .62 })),
    rubber: mat(new MeshPhysicalMaterial({ color: "#121416", roughness: .95 })),
    steel: mat(new MeshPhysicalMaterial({ color: "#7d8387", metalness: .9, roughness: .42 })),
    flashing: mat(new MeshPhysicalMaterial({ color: "#8f9599", metalness: .8, roughness: .35 })),
    terracotta: mat(new MeshPhysicalMaterial({ color: "#a65a3a", roughness: .7 })),
    tank: mat(new MeshPhysicalMaterial({ color: "#e5e3dd", metalness: .2, roughness: .35, clearcoat: .6 })),
    label: mat(new MeshPhysicalMaterial({ color: "#f4f2ec", roughness: .6 })),
    meterGlass: mat(new MeshPhysicalMaterial({ color: "#dfe7ea", roughness: .05, transparent: true, opacity: .35, clearcoat: 1, depthWrite: false })),
    gravel: mat(applySurfaceDetail(new MeshPhysicalMaterial({ color: "#8c867c", roughness: .95 }), { kind: "stone", frequency: 40, strength: .004, roughnessVariation: .3, albedoVariation: .35 })),
    vapor: mat(new MeshPhysicalMaterial({ color: "#16181a", roughness: .4, clearcoat: .6 })),
    /** Toggle interior lighting glow (0 off … 1 full). */
    setInteriorLight(level: number) {
      const k = Math.max(0, Math.min(1, level));
      (drywall as MeshPhysicalMaterial).emissiveIntensity = .22 * k;
      this.interiorGlow.emissiveIntensity = 1.4 * k;
    },
    dispose() { for (const m of materials) m.dispose(); for (const t of textures) t.dispose(); },
  };
}
export type HomeMaterials = ReturnType<typeof createHomeMaterials>;
