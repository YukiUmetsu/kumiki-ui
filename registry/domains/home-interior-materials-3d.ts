/** Interior, furniture and landscape materials for crafted homes (procedural, seeded, physical scale).
 * Tile and grout, subway tile, carpet, upholstery weave, walnut and oak, quartz, rugs, pavers, cedar,
 * foliage and bark; plus porcelain, stainless, chrome, lacquer, linen, glass and light diffusers.
 * Generic anonymous finishes only — no brand colors or trade dress.
 */
import { Color, DoubleSide, MeshPhysicalMaterial, Vector2 } from "three";
import type { Material, Texture } from "three";
import { paintTexture, paintWithRelief } from "../craft/canvas-texture";
import type { Painter } from "../craft/canvas-texture";

const tile = (base: string, grout: string, cols: number, rows: number, stagger: boolean): Painter => (ctx, w, h, random) => {
  ctx.fillStyle = grout; ctx.fillRect(0, 0, w, h);
  const tw = w / cols, th = h / rows, g = Math.max(2, Math.round(w * .008));
  for (let r = 0; r < rows; r++) for (let c = -1; c <= cols; c++) {
    const x = c * tw + (stagger && r % 2 ? tw / 2 : 0), y = r * th;
    const k = (random() - .5) * .07, col = new Color(base).offsetHSL(0, 0, k);
    ctx.fillStyle = `#${col.getHexString()}`; ctx.fillRect(x + g, y + g, tw - g * 2, th - g * 2);
    // Soft glaze highlight on each tile.
    const grad = ctx.createLinearGradient(x, y, x + tw, y + th); grad.addColorStop(0, "rgba(255,255,255,.08)"); grad.addColorStop(1, "rgba(0,0,0,.04)");
    ctx.fillStyle = grad; ctx.fillRect(x + g, y + g, tw - g * 2, th - g * 2);
  }
};
const noiseFill = (base: string, spread: number, count: number, size = 1.6): Painter => (ctx, w, h, random) => {
  ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
  const c = new Color(base);
  for (let i = 0; i < count; i++) {
    const k = (random() - .5) * spread, col = c.clone().offsetHSL(0, 0, k);
    ctx.fillStyle = `#${col.getHexString()}`; ctx.globalAlpha = .55; ctx.fillRect(random() * w, random() * h, size, size);
  }
  ctx.globalAlpha = 1;
};
const weave = (base: string): Painter => (ctx, w, h, random) => {
  ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
  const c = new Color(base);
  for (let y = 0; y < h; y += 3) { ctx.fillStyle = `#${c.clone().offsetHSL(0, 0, (random() - .5) * .06 + (y % 6 ? .02 : -.02)).getHexString()}`; ctx.fillRect(0, y, w, 1.5); }
  for (let x = 0; x < w; x += 3) { ctx.globalAlpha = .35; ctx.fillStyle = `#${c.clone().offsetHSL(0, 0, -.06).getHexString()}`; ctx.fillRect(x, 0, 1, h); }
  ctx.globalAlpha = 1;
};
const grain = (base: string, dark: string): Painter => (ctx, w, h, random) => {
  ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 70; i++) {
    const y0 = random() * h, amp = 1 + random() * 4, f = 1 + random() * 2, ph = random() * 6.28;
    ctx.strokeStyle = dark; ctx.globalAlpha = .1 + random() * .22; ctx.lineWidth = .6 + random() * 1.6;
    ctx.beginPath(); for (let x = 0; x <= w; x += 8) { const y = y0 + Math.sin(x / w * 6.28 * f + ph) * amp; if (x) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke();
  }
  ctx.globalAlpha = 1;
};
const rugPattern = (field: string, border: string, accent: string): Painter => (ctx, w, h, random) => {
  ctx.fillStyle = field; ctx.fillRect(0, 0, w, h);
  const b = w * .07;
  ctx.strokeStyle = border; ctx.lineWidth = b * .45; ctx.strokeRect(b, b, w - b * 2, h - b * 2);
  ctx.strokeStyle = accent; ctx.lineWidth = b * .12; ctx.strokeRect(b * 1.6, b * 1.6, w - b * 3.2, h - b * 3.2);
  ctx.fillStyle = accent; ctx.globalAlpha = .55;
  for (let x = b * 2.6; x < w - b * 2.6; x += w * .12) for (let y = b * 2.6; y < h - b * 2.6; y += h * .12) {
    ctx.beginPath(); ctx.moveTo(x, y - w * .025); ctx.lineTo(x + w * .025, y); ctx.lineTo(x, y + w * .025); ctx.lineTo(x - w * .025, y); ctx.closePath(); ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < w * h * .05; i++) { ctx.fillStyle = random() < .5 ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.06)"; ctx.fillRect(random() * w, random() * h, 1.5, 1.5); }
};
const pavers: Painter = (ctx, w, h, random) => {
  ctx.fillStyle = "#77736c"; ctx.fillRect(0, 0, w, h);
  const n = 4, s = w / n, g = 3;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const col = new Color("#b9ad9a").offsetHSL(0, 0, (random() - .5) * .12);
    ctx.fillStyle = `#${col.getHexString()}`; ctx.fillRect(c * s + g, r * s + g, s - g * 2, s - g * 2);
  }
};
const leaves = (base: string): Painter => (ctx, w, h, random) => {
  ctx.fillStyle = new Color(base).offsetHSL(0, 0, -.12).getStyle(); ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) {
    const x = random() * w, y = random() * h, r = 4 + random() * 9, a = random() * 6.28;
    ctx.fillStyle = new Color(base).offsetHSL((random() - .5) * .04, 0, (random() - .45) * .3).getStyle();
    ctx.beginPath(); ctx.ellipse(x, y, r, r * .45, a, 0, 6.29); ctx.fill();
  }
};
const bark: Painter = (ctx, w, h, random) => {
  ctx.fillStyle = "#5a4636"; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 160; i++) { const x = random() * w; ctx.strokeStyle = random() < .5 ? "#3b2c21" : "#7a6450"; ctx.lineWidth = 1 + random() * 3; ctx.beginPath(); ctx.moveTo(x, 0); ctx.bezierCurveTo(x + (random() - .5) * 20, h * .3, x + (random() - .5) * 20, h * .7, x + (random() - .5) * 10, h); ctx.stroke(); }
};

export interface InteriorMaterialOptions { seed?: number; accent?: string; detail?: number }

export function createInteriorMaterials({ seed = 21, accent = "#2c4f7c", detail = 1 }: InteriorMaterialOptions = {}) {
  const textures: Texture[] = [], materials: Material[] = [];
  const px = (n: number) => Math.max(64, Math.round(n * detail / 32) * 32);
  const tex = <T extends Texture>(t: T, w = 1, h = 1) => { t.repeat.set(1 / w, 1 / h); textures.push(t); return t; };
  const mat = <M extends Material>(m: M) => { materials.push(m); return m; };
  const relief = (size: number, painter: Painter, strength: number, s: number, tileW: number, tileH = tileW) => {
    const r = paintWithRelief(px(size), px(size), painter, { seed: seed + s, strength, repeat: true });
    return { map: tex(r.map, tileW, tileH), normalMap: tex(r.normalMap, tileW, tileH) };
  };
  const floorTile = relief(512, tile("#d6d0c5", "#a39b8f", 2, 2, false), 2, 1, .9);
  const subway = relief(512, tile("#f4f3ef", "#cfcac2", 4, 8, true), 1.6, 2, .6, .6);
  const carpetT = relief(256, noiseFill("#bfb3a1", .16, 9000, 1.2), 1.4, 3, .25);
  const sofaT = relief(256, weave("#6f7f8a"), 1.2, 4, .12);
  const linenT = relief(256, weave("#ecebe6"), .8, 5, .1);
  const walnutT = relief(512, grain("#6b4a33", "#3a2618"), .9, 6, .8, .4);
  const oakT = relief(512, grain("#c9a16c", "#8a6640"), .8, 7, .8, .4);
  const quartzT = tex(paintTexture(px(256), px(256), noiseFill("#efede8", .18, 1400, 2.2), { seed: seed + 8, repeat: true }), .6);
  const rugT = tex(paintTexture(px(512), px(512), rugPattern("#c9b89a", accent, "#7c3b2e"), { seed: seed + 9 }));
  const paverT = relief(256, pavers, 1.6, 10, 1.2);
  const leafT = relief(256, leaves("#4f7a38"), 1.6, 11, .6);
  const barkT = relief(256, bark, 2.2, 12, .5, 1);
  const cedarT = relief(512, grain("#a07452", "#6a4a32"), 1, 13, .15, 1.6);
  const p = (o: ConstructorParameters<typeof MeshPhysicalMaterial>[0]) => mat(new MeshPhysicalMaterial(o));
  const lightOn = { level: 0 };
  const diffuserMat = p({ color: "#fbf7ef", emissive: "#ffe3b8", emissiveIntensity: 0, roughness: .6, transmission: 0 });
  const bulbMat = p({ color: "#fff8ec", emissive: "#ffd79a", emissiveIntensity: 0, roughness: .3 });
  return {
    floorTile: p({ map: floorTile.map, normalMap: floorTile.normalMap, roughness: .32, clearcoat: .3 }),
    wallTile: p({ map: subway.map, normalMap: subway.normalMap, roughness: .15, clearcoat: .8, clearcoatRoughness: .1 }),
    carpet: p({ map: carpetT.map, normalMap: carpetT.normalMap, normalScale: new Vector2(1.2, 1.2), roughness: .98, sheen: .7, sheenColor: new Color("#e8dcc6") }),
    upholstery: p({ map: sofaT.map, normalMap: sofaT.normalMap, roughness: .9, sheen: .8, sheenRoughness: .6, sheenColor: new Color("#a9b8c2") }),
    upholsteryAccent: p({ color: "#c48a4a", map: sofaT.map, normalMap: sofaT.normalMap, roughness: .9, sheen: .6 }),
    linen: p({ map: linenT.map, normalMap: linenT.normalMap, roughness: .92, sheen: .5, sheenColor: new Color("#ffffff") }),
    duvet: p({ color: accent, map: linenT.map, normalMap: linenT.normalMap, roughness: .9, sheen: .5 }),
    walnut: p({ map: walnutT.map, normalMap: walnutT.normalMap, roughness: .45, clearcoat: .4, clearcoatRoughness: .3 }),
    oak: p({ map: oakT.map, normalMap: oakT.normalMap, roughness: .5, clearcoat: .25 }),
    lacquer: p({ color: "#f2f0eb", roughness: .32, clearcoat: .6, clearcoatRoughness: .2 }),
    lacquerDark: p({ color: "#2c3b48", roughness: .35, clearcoat: .6, clearcoatRoughness: .2 }),
    quartz: p({ map: quartzT, roughness: .18, clearcoat: .8, clearcoatRoughness: .08 }),
    stainless: p({ color: "#c9cdd0", metalness: 1, roughness: .28 }),
    blackGlass: p({ color: "#0b0e10", metalness: .2, roughness: .06, clearcoat: 1 }),
    porcelain: p({ color: "#f7f7f4", roughness: .1, clearcoat: 1, clearcoatRoughness: .05 }),
    chrome: p({ color: "#eceef0", metalness: 1, roughness: .06 }),
    brass: p({ color: "#c9a253", metalness: 1, roughness: .28 }),
    blackMetal: p({ color: "#1d1f22", metalness: .7, roughness: .4 }),
    mirror: p({ color: "#e9eef1", metalness: 1, roughness: .02 }),
    clearGlass: p({ color: "#dbe9ef", roughness: .02, transparent: true, opacity: .18, clearcoat: 1, depthWrite: false, side: DoubleSide }),
    rug: p({ map: rugT, roughness: .97, sheen: .5 }),
    pavers: p({ map: paverT.map, normalMap: paverT.normalMap, roughness: .85 }),
    foliage: p({ map: leafT.map, normalMap: leafT.normalMap, roughness: .8, sheen: .4, sheenColor: new Color("#a8d080") }),
    bark: p({ map: barkT.map, normalMap: barkT.normalMap, roughness: .95 }),
    cedar: p({ map: cedarT.map, normalMap: cedarT.normalMap, roughness: .8 }),
    terracotta: p({ color: "#b8653f", roughness: .75 }),
    soilDark: p({ color: "#3d2c1f", roughness: 1 }),
    rubber: p({ color: "#151719", roughness: .9 }),
    carPaint: p({ color: "#2b4c6f", metalness: .6, roughness: .3, clearcoat: 1, clearcoatRoughness: .05 }),
    carGlass: p({ color: "#1a242c", roughness: .05, metalness: .3, clearcoat: 1 }),
    canvas: p({ color: "#e9e1d0", roughness: .9, side: DoubleSide, sheen: .3 }),
    plastic: p({ color: "#f1f0ec", roughness: .45 }),
    books: p({ color: "#ffffff", roughness: .7, vertexColors: true }),
    garments: p({ color: "#ffffff", roughness: .9, vertexColors: true, sheen: .4 }),
    ember: p({ color: "#2a1006", emissive: "#ff6a1a", emissiveIntensity: .25, roughness: .9 }),
    diffuser: diffuserMat,
    bulb: bulbMat,
    /** 0 off … 1 full: drives every lamp, fixture and the fireplace glow. */
    setLights(level: number) {
      lightOn.level = Math.max(0, Math.min(1, level));
      diffuserMat.emissiveIntensity = 1.6 * lightOn.level;
      bulbMat.emissiveIntensity = 3 * lightOn.level;
    },
    dispose() { for (const m of materials) m.dispose(); for (const t of textures) t.dispose(); },
  };
}
export type InteriorMaterials = ReturnType<typeof createInteriorMaterials>;
