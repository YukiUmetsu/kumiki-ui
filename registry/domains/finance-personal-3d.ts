/** Crafted personal-finance objects: a cinched money bag and payment cards.
 *
 * Money bag: one sculpted fabric body (belly sag, gather folds radiating from
 * a cinched neck, ruffled flared top), a twisted rope with knot and frayed
 * ends lying ON the fabric (seated by ray-marching, never interpenetrating),
 * woven micro-relief and a stencilled symbol applied as a projected decal so
 * the ink follows every fold.
 *
 * Payment card: ISO/IEC 7810 ID-1 (85.60 × 53.98 × 0.76 mm, r = 3.18 mm) with a
 * visible white core, raised EMV contact plate with separated pads, metallic
 * foil lettering driven by metalness/roughness masks, contactless mark,
 * magnetic stripe, signature panel and an iridescent hologram on the back.
 * Anonymous: no network marks, no issuer brand, no full card number.
 */
import {
  BufferAttribute, Euler, Group, Mesh, MeshPhysicalMaterial, Shape, ExtrudeGeometry, Vector3,
} from "three";
import { DecalGeometry } from "three/addons/geometries/DecalGeometry.js";
import { createAssetResources } from "../craft/hero-asset";
import type { HeroAsset } from "../craft/hero-asset";
import { paintTexture, paintWithRelief, seededRandom } from "../craft/canvas-texture";
import { applySurfaceDetail } from "../craft/surface-detail";
import {
  bounded, chain, clamp01, ellipsoid, fbm3, linearRgb, meshSdfCached, mix, roundCone, sculptGeometry, smin,
  smoothstep, smoothSubtract, smoothUnion, torus,
} from "../craft/sdf-sculpt";
import type { Sdf, SculptShading, Vec3 } from "../craft/sdf-sculpt";
import { createSculptMaterial } from "../craft/sculpt-finish";
import { createCoinFactory } from "./finance-currency-3d";
import type { CoinMetal } from "./finance-currency-3d";

// ------------------------------------------------------------------ money bag

export interface MoneyBagOptions {
  id?: string;
  /** Stencilled symbol, e.g. "$", "€", "¥", "£". */
  symbol?: string;
  /** Fabric tone (sRGB hex). */
  fabric?: string;
  /** Loose coins spilled at the base (0–8). */
  coins?: number;
  coinMetal?: CoinMetal;
}

const NECK_Y = 1.56;

/** March outward horizontally from the bag axis at height y / angle a to the surface. */
function surfacePoint(shape: Sdf, y: number, angle: number, offset: number): Vec3 {
  const dx = Math.cos(angle), dz = Math.sin(angle);
  let t = 0, last = shape(0, y, 0);
  for (let i = 0; i < 600; i++) {
    t += .005;
    const d = shape(dx * t, y, dz * t);
    if (d >= 0 && last < 0) { t -= .005 * d / (d - last); break; }
    last = d;
  }
  return [dx * (t + offset), y, dz * (t + offset)];
}

function bagShape() {
  const wrinkle = fbm3(61, 3);
  const body = smoothUnion(.28,
    ellipsoid([0, .66, 0], [.86, .66, .8]),                  // weighted belly, slumped
    ellipsoid([.08, .34, .05], [.82, .34, .78]),              // contents settle low
    ellipsoid([0, 1.1, 0], [.58, .48, .56]),                 // shoulders
    roundCone([0, 1.22, 0], [0, NECK_Y, 0], .38, .16),        // taper into the tie
  );
  // Flared, ruffled fabric above the tie, with a soft opening.
  const flare = smoothSubtract(.04, roundCone([0, NECK_Y + .02, 0], [0, 1.86, 0], .165, .31),
    ellipsoid([0, 1.97, 0], [.19, .08, .19]));
  const loose = smoothUnion(.05, body, flare);
  // Cinch: the drawstring pinches all fabric to an hourglass waist at the tie.
  const fabric: Sdf = (x, y, z) => {
    const dy = y - NECK_Y;
    const waist = Math.hypot(x, z) - (.145 + 1.7 * dy * dy);
    return -smin(-loose(x, y, z), -waist, .05);
  };
  const withFolds: Sdf = (x, y, z) => {
    const base = fabric(x, y, z);
    // Far from the surface the relief cannot matter: skip all noise.
    if (base > .12) return -smin(-base, y, .14);
    const a = Math.atan2(z, x);
    const w = wrinkle(x * 3.2, y * 3.2, z * 3.2);
    let d = base + .026 * w + .008 * wrinkle(x * 9, y * 9, z * 9);
    // Gather folds radiate down from the cinch and fade across the belly.
    const gather = smoothstep(.95, 1.5, y) * (1 - smoothstep(NECK_Y - .02, NECK_Y + .02, y));
    if (gather > 0) d += gather * .04 * Math.sin(a * 7 + Math.sin(y * 7) * .8 + w * 1.4);
    // Ruffles on the flare: lobes that widen toward the rim.
    if (y > NECK_Y + .03) d += smoothstep(NECK_Y + .03, 1.85, y) * .045 * Math.sin(a * 9 + y * 5);
    // Coins pressing through the cloth: soft lumps on the lower belly.
    if (y < .9) d += (1 - smoothstep(.2, .9, y)) * .02 * wrinkle(x * 6 + 3, y * 6, z * 6);
    return -smin(-d, y, .14); // soft flattened contact with the floor
  };
  // Rope: twisted torus cinch, knot, and two dangling ends seated on the fabric.
  const ring = torus([0, NECK_Y, 0], .19, .044);
  const twist: Sdf = (x, y, z) => {
    const a = Math.atan2(z, x), r = Math.hypot(x, z) - .19;
    const phase = Math.atan2(y - NECK_Y, r);
    return ring(x, y, z) - .008 * Math.cos(phase * 3 + a * 26);
  };
  const ends: Sdf[] = [];
  // Two ends of unequal length swinging apart and draping over the shoulder.
  for (const [angle, swing, count] of [[1.38, -.5, 5], [1.78, .45, 4]] as const) {
    const pts: Vec3[] = Array.from({ length: count }, (_, i) => {
      const y = NECK_Y - .03 - i * .13 - i * i * .006;
      return surfacePoint(withFolds, y, angle + swing * i * .16, .038);
    });
    ends.push(chain(pts, pts.map((_, i) => .031 - i * .0012), .01));
    // Frayed tip: three short splayed strands.
    const tip = pts[pts.length - 1];
    for (let k = 0; k < 3; k++) {
      const spread = (k - 1) * .028;
      ends.push(roundCone(tip, [tip[0] + spread + swing * .03, tip[1] - .085, tip[2] + Math.abs(spread) * .6 + .012], .012, .004));
    }
  }
  const knotCenter = surfacePoint(withFolds, NECK_Y, Math.PI / 2, .085);
  const knot = smoothUnion(.02,
    ellipsoid(knotCenter, [.07, .055, .05]),
    torus([knotCenter[0] - .05, knotCenter[1] + .03, knotCenter[2]], .04, .018),
    torus([knotCenter[0] + .05, knotCenter[1] + .03, knotCenter[2]], .04, .018),
  );
  const rope = bounded(smoothUnion(.012, twist, knot, ...ends), [0, 1.2, .2], .75);
  return { surface: smoothUnion(.01, withFolds, rope), shading: smoothUnion(.01, fabric, rope), rope };
}

function bagShading(rope: Sdf, fabricHex: string): SculptShading {
  const fabric = linearRgb(fabricHex), fabricDark = fabric.map(v => v * .45);
  const hemp = linearRgb("#cdb88f"), hempDark = linearRgb("#7a6646");
  const blotch = fbm3(9, 3);
  return ({ x, y, z, occlusion, curvature }) => {
    const shade = mix(.42, 1, occlusion);
    const r = clamp01(.5 - rope(x, y, z) / .01);
    const m = blotch(x * 3, y * 3, z * 3) * .5 + .5;
    let c = fabric.map((v, i) => mix(v, fabricDark[i], clamp01((1 - occlusion) * 1.3 + (m - .5) * .6)));
    // Edges of folds catch light and wear paler.
    c = c.map(v => v * (1 + smoothstep(.2, .7, curvature) * .18));
    const ropeColor = hemp.map((v, i) => mix(v, hempDark[i], clamp01(-curvature * 1.5)));
    c = c.map((v, i) => mix(v, ropeColor[i], r));
    return [c[0] * shade, c[1] * shade, c[2] * shade, mix(1, .9, r), 0];
  };
}

/** Worn stencil: bold symbol with dry-brush voids and soft edges. */
const stencil = (symbol: string) => (ctx: CanvasRenderingContext2D, w: number, h: number, random: () => number) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "rgba(34,38,30,.92)";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = `800 ${Math.round(h * .78)}px "Rockwell", "Clarendon", Georgia, serif`;
  ctx.fillText(symbol, w / 2, h * .54);
  // Stencil bridges and dry-brush wear.
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillRect(w * .495, 0, w * .01, h);
  for (let i = 0; i < 900; i++) {
    ctx.globalAlpha = .2 + random() * .6;
    ctx.beginPath();
    ctx.ellipse(random() * w, random() * h, 1 + random() * 5, .5 + random() * 2, random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
};

export function createMoneyBag(options: MoneyBagOptions = {}): HeroAsset {
  const res = createAssetResources();
  const group = new Group();
  group.name = options.id ?? "money-bag";
  const built = bagShape();
  const mesh = meshSdfCached("money-bag", () => ({ surface: built.surface, shading: built.shading }),
    { min: [-1.02, -.02, -1.0], max: [1.05, 2.02, 1.0], cellSize: .0135, occlusionDistance: .14 });
  const material = res.own(createSculptMaterial("natural", { detail: "fabric", detailFrequency: 46, detailStrength: .0016, flow: [0, 1, 0], sheenColor: "#c9ad7c" }));
  material.sheen = .45;
  const bag = new Mesh(res.own(sculptGeometry(mesh, bagShading(built.rope, options.fabric ?? "#8e6a40"))), material);
  bag.castShadow = true; bag.receiveShadow = true;
  group.add(res.name(bag, "money-bag-fabric-and-rope"));
  // Stencilled symbol as a projected decal: ink follows folds and wrinkles.
  const symbolMap = res.own(paintTexture(512, 512, stencil(options.symbol ?? "$"), { seed: 21, fallback: [0, 0, 0, 0] }));
  bag.updateMatrixWorld(true);
  const decalGeometry = res.own(new DecalGeometry(bag, new Vector3(.02, .6, .82), new Euler(0, 0, 0), new Vector3(.68, .68, .7)));
  const ink = res.own(new MeshPhysicalMaterial({
    map: symbolMap, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4,
    roughness: .92, metalness: 0,
  }));
  const decal = new Mesh(decalGeometry, ink);
  decal.receiveShadow = true;
  group.add(res.name(decal, "money-bag-stencil"));
  // Optional coins spilling at the base.
  const coinCount = Math.max(0, Math.min(8, Math.round(options.coins ?? 4)));
  if (coinCount) {
    const factory = createCoinFactory(res, group, { metal: options.coinMetal ?? "gold" });
    const random = seededRandom(5);
    const s = .26, T = .15 * s;
    // A loose spill fanning out from the bag's front-left, with one small pile.
    for (let i = 0; i < coinCount; i++) {
      const pile = i < 2;
      const a = pile ? 1.05 : .55 + random() * 1.3, r = pile ? 1.02 : .95 + random() * .45;
      const y = pile ? T * (i + .5) + .002 : T / 2 + .002;
      factory.coin(Math.cos(a) * r + (pile ? (random() - .5) * .03 : 0), y, Math.sin(a) * r, 0, random() * 6.28, 0, `money-bag-coin-${i + 1}`, s);
    }
  }
  return {
    id: group.name, group, parts: res.parts, tier: "hero", exposure: .95,
    bounds: { min: [-1.2, 0, -1.0], max: [1.25, 2.0, 1.35] },
    studio: { palette: "graphite", keyAzimuth: -35 },
    craft: {
      materials: ["burlap-weave fabric with sheen and woven micro-relief", "twisted hemp rope", "stencil ink decal"],
      details: ["belly sag and floor contact flattening", "gather folds radiating from the cinch", "ruffled flared top with opening",
        "twisted rope cinch, knot and frayed ends seated on the fabric", "worn stencil projected onto the folds", "spilled proof coins"],
    },
    dispose: res.dispose,
  };
}

// ------------------------------------------------------------------ payment card

export type CardPalette = "midnight" | "emerald" | "graphite" | "rose-gold" | "ivory";
const CARD_PALETTES: Record<CardPalette, { a: string; b: string; ink: string; foil: string; edge: string }> = {
  midnight: { a: "#0b1626", b: "#1d3b5c", ink: "#e8eef6", foil: "#d9dee5", edge: "#eceae4" },
  emerald: { a: "#062a22", b: "#0f5a48", ink: "#e9f4ef", foil: "#e2c88a", edge: "#ecebe4" },
  graphite: { a: "#17191c", b: "#3a3f46", ink: "#f0f1f2", foil: "#c9ccd1", edge: "#2a2c30" },
  "rose-gold": { a: "#3a1f22", b: "#9c6a62", ink: "#fff3ef", foil: "#f0c2a8", edge: "#efe7e2" },
  ivory: { a: "#e9e4d8", b: "#c9c0ad", ink: "#2a2722", foil: "#a8894c", edge: "#f4f1ea" },
};

export interface CardDesign {
  palette?: CardPalette;
  /** Anonymous issuer word shown top-left. */
  issuer?: string;
  tier?: string;
  holder?: string;
  last4?: string;
  expiry?: string;
  /** "polymer" laminated PVC or "metal" brushed stainless. */
  body?: "polymer" | "metal";
}

export const CARD_SIZE = { width: 4.28, height: 2.699, thickness: .038, radius: .159 } as const; // 1 unit = 20 mm
const TEX = { w: 2048, h: 1291 } as const;
const mm = (v: number) => v / 85.6 * TEX.w;

function roundedRect(w: number, h: number, r: number): Shape {
  const s = new Shape();
  s.moveTo(-w / 2 + r, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); s.lineTo(-w / 2 + r, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return s;
}
const cardShape = () => roundedRect(CARD_SIZE.width, CARD_SIZE.height, CARD_SIZE.radius);

/** Card body: extruded rounded rectangle split into front, back and edge material groups. */
function cardGeometry() {
  const { width: w, height: h, thickness: t } = CARD_SIZE;
  const g = new ExtrudeGeometry(cardShape(), { depth: t - .008, bevelEnabled: true, bevelThickness: .004, bevelSize: .004, bevelSegments: 2, curveSegments: 10 });
  g.translate(0, 0, -(t - .008) / 2);
  const pos = g.attributes.position as BufferAttribute, uv = g.attributes.uv as BufferAttribute;
  const normal = (g.computeVertexNormals(), g.attributes.normal as BufferAttribute);
  // Regroup triangles: +Z front, -Z back, everything else edge.
  const front: number[] = [], back: number[] = [], edge: number[] = [];
  for (let i = 0; i < pos.count; i += 3) {
    const nz = (normal.getZ(i) + normal.getZ(i + 1) + normal.getZ(i + 2)) / 3;
    (nz > .9 ? front : nz < -.9 ? back : edge).push(i, i + 1, i + 2);
  }
  for (let i = 0; i < pos.count; i++) {
    const back = normal.getZ(i) < -.9;
    uv.setXY(i, (back ? -pos.getX(i) : pos.getX(i)) / w + .5, pos.getY(i) / h + .5);
  }
  g.setIndex([...front, ...back, ...edge]);
  g.clearGroups();
  g.addGroup(0, front.length, 0); g.addGroup(front.length, back.length, 1); g.addGroup(front.length + back.length, edge.length, 2);
  return g;
}

function cardFrontPainter(d: Required<CardDesign>, layer: "albedo" | "foil") {
  const p = CARD_PALETTES[d.palette];
  return (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const foilLayer = layer === "foil";
    if (foilLayer) { ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, h); }
    else {
      const bg = ctx.createLinearGradient(0, h, w, 0);
      bg.addColorStop(0, p.a); bg.addColorStop(1, p.b);
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
      // Soft light sweep and concentric arcs: premium print, not flat color.
      const glow = ctx.createRadialGradient(w * .85, h * .1, 0, w * .85, h * .1, w * .8);
      glow.addColorStop(0, "rgba(255,255,255,.16)"); glow.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(255,255,255,.07)"; ctx.lineWidth = 2;
      for (let i = 0; i < 26; i++) { ctx.beginPath(); ctx.arc(w * 1.02, h * 1.1, w * .2 + i * 26, Math.PI, Math.PI * 1.5); ctx.stroke(); }
      ctx.strokeStyle = "rgba(255,255,255,.035)"; ctx.lineWidth = 1.5;
      for (let y = 0; y < h; y += 9) {
        ctx.beginPath();
        for (let x = 0; x <= w; x += 8) { const yy = y + 4 * Math.sin(x * .01 + y * .05); if (x) ctx.lineTo(x, yy); else ctx.moveTo(x, yy); }
        ctx.stroke();
      }
    }
    const ink = foilLayer ? "#fff" : p.ink, foil = foilLayer ? "#fff" : p.foil;
    // Issuer wordmark and tier.
    ctx.fillStyle = ink; ctx.textBaseline = "alphabetic";
    ctx.font = `300 ${Math.round(mm(5))}px "Avenir Next", "Helvetica Neue", Helvetica, Arial, sans-serif`;
    (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${Math.round(mm(.8))}px`;
    ctx.textAlign = "left"; ctx.fillText(d.issuer.toUpperCase(), mm(6), mm(10.5));
    ctx.font = `600 ${Math.round(mm(2.6))}px "Avenir Next", "Helvetica Neue", Helvetica, Arial, sans-serif`;
    ctx.textAlign = "right"; ctx.fillStyle = foil; ctx.fillText(d.tier.toUpperCase(), w - mm(6), mm(10));
    // Contactless indicator (four arcs) right of the chip.
    ctx.strokeStyle = ink; ctx.lineWidth = mm(.55); ctx.lineCap = "round";
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(mm(26), mm(23.5), mm(1.4 + i * 1.25), -.7, .7); ctx.stroke(); }
    // Last-four only, in foil; name and expiry.
    ctx.fillStyle = foil; ctx.textAlign = "left";
    ctx.font = `500 ${Math.round(mm(4.2))}px "SF Mono", "Menlo", "Courier New", monospace`;
    (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${Math.round(mm(.6))}px`;
    ctx.fillText(`••••  ••••  ••••  ${d.last4}`, mm(6), mm(38));
    ctx.font = `500 ${Math.round(mm(2.6))}px "Avenir Next", "Helvetica Neue", Helvetica, Arial, sans-serif`;
    ctx.fillStyle = ink; ctx.fillText(d.holder.toUpperCase(), mm(6), mm(47.5));
    ctx.font = `500 ${Math.round(mm(1.6))}px "Avenir Next", Helvetica, Arial, sans-serif`;
    ctx.fillText("VALID THRU", mm(50), mm(43.4));
    ctx.font = `500 ${Math.round(mm(2.6))}px "SF Mono", Menlo, monospace`; ctx.fillText(d.expiry, mm(50), mm(47.5));
    // Abstract network mark: an isometric cube outline (generic, not a real network).
    ctx.strokeStyle = foil; ctx.lineWidth = mm(.7); ctx.lineJoin = "round";
    const cx = w - mm(12), cy = mm(44), r = mm(5);
    const hex = [0, 1, 2, 3, 4, 5].map(k => [cx + r * Math.cos(Math.PI / 6 + k * Math.PI / 3), cy + r * Math.sin(Math.PI / 6 + k * Math.PI / 3)]);
    ctx.beginPath(); hex.forEach(([x, y], k) => k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(hex[1][0], hex[1][1]); ctx.moveTo(cx, cy); ctx.lineTo(hex[3][0], hex[3][1]);
    ctx.moveTo(cx, cy); ctx.lineTo(hex[5][0], hex[5][1]); ctx.stroke();
  };
}

function cardBackPainter(d: Required<CardDesign>) {
  const p = CARD_PALETTES[d.palette];
  return (ctx: CanvasRenderingContext2D, w: number, h: number, random: () => number) => {
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, p.b); bg.addColorStop(1, p.a);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    // Magnetic stripe (ISO: 5.54 mm from top edge, ~10 mm tall).
    ctx.fillStyle = "#0b0b0c"; ctx.fillRect(0, mm(5.5), w, mm(10.3));
    // Signature panel with fine anti-tamper pattern.
    ctx.fillStyle = "#efece4"; ctx.fillRect(mm(6), mm(20), mm(48), mm(8));
    ctx.strokeStyle = "rgba(120,130,150,.35)"; ctx.lineWidth = 2;
    for (let x = mm(6); x < mm(54); x += 10) { ctx.beginPath(); ctx.moveTo(x, mm(20)); ctx.lineTo(x + mm(8) * .6, mm(28)); ctx.stroke(); }
    ctx.fillStyle = "rgba(40,40,40,.7)"; ctx.font = `500 ${Math.round(mm(1.4))}px Helvetica, Arial, sans-serif`;
    ctx.textAlign = "left"; ctx.fillText("AUTHORIZED SIGNATURE · SPECIMEN", mm(6), mm(19.3));
    // Fine print lines (unreadable at card scale by design).
    ctx.fillStyle = p.ink; ctx.globalAlpha = .45;
    for (let i = 0; i < 6; i++) ctx.fillRect(mm(6), mm(34 + i * 2.2), mm(40 + random() * 30), mm(.5));
    ctx.globalAlpha = 1;
  };
}

/** Contact plate: gold with separated pads (C1–C8 layout), grooves as relief. */
const chipPainter = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#f2d38b"); g.addColorStop(.5, "#d6aa52"); g.addColorStop(1, "#f0cf86");
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#5a3f12"; ctx.lineWidth = w * .018; ctx.lineCap = "round";
  const line = (x0: number, y0: number, x1: number, y1: number) => { ctx.beginPath(); ctx.moveTo(x0 * w, y0 * h); ctx.lineTo(x1 * w, y1 * h); ctx.stroke(); };
  line(.36, .02, .36, .98); line(.64, .02, .64, .98);
  line(.02, .34, .36, .34); line(.02, .66, .36, .66); line(.64, .34, .98, .34); line(.64, .66, .98, .66);
  line(.36, .5, .5, .5); line(.5, .5, .5, .3); line(.5, .3, .64, .3);
  ctx.strokeRect(w * .02, h * .02, w * .96, h * .96);
};

export interface PaymentCardOptions { id?: string; design?: CardDesign; second?: CardDesign | false }

function buildCard(res: ReturnType<typeof createAssetResources>, design: CardDesign, name: string) {
  const d: Required<CardDesign> = {
    palette: design.palette ?? "midnight", issuer: design.issuer ?? "Reserve", tier: design.tier ?? "Platinum",
    holder: design.holder ?? "A. Cardholder", last4: design.last4 ?? "0426", expiry: design.expiry ?? "12/30", body: design.body ?? "polymer",
  };
  const p = CARD_PALETTES[d.palette];
  const metal = d.body === "metal";
  const albedo = res.own(paintTexture(TEX.w, TEX.h, cardFrontPainter(d, "albedo"), { seed: 3, fallback: [30, 50, 80, 255] }));
  const foil = res.own(paintTexture(TEX.w, TEX.h, cardFrontPainter(d, "foil"), { color: "data", seed: 3, fallback: [0, 0, 0, 255] }));
  const backMap = res.own(paintTexture(TEX.w, TEX.h, cardBackPainter(d), { seed: 4, fallback: [30, 50, 80, 255] }));
  // Foil mask drives metalness (B channel); laminate stays glossy dielectric.
  const front = res.own(metal
    ? applySurfaceDetail(new MeshPhysicalMaterial({ map: albedo, metalness: 1, roughness: .34, metalnessMap: foil }),
      { kind: "brushed", frequency: 260, strength: .00006, roughnessVariation: .35, flow: [1, 0, 0] })
    : new MeshPhysicalMaterial({ map: albedo, metalness: 1, metalnessMap: foil, roughness: .42, clearcoat: .45, clearcoatRoughness: .3 }));
  if (metal) front.metalness = 1;
  const back = res.own(new MeshPhysicalMaterial({ map: backMap, roughness: .4, clearcoat: .6, clearcoatRoughness: .18 }));
  const edge = res.own(new MeshPhysicalMaterial({ color: metal ? "#9aa0a6" : p.edge, metalness: metal ? 1 : 0, roughness: metal ? .3 : .55 }));
  const card = new Group();
  const body = new Mesh(res.own(cardGeometry()), [front, back, edge]);
  body.castShadow = true; body.receiveShadow = true;
  card.add(res.name(body, `${name}-body`));
  // EMV plate: ISO position ≈ 10.25 mm from left, 19.23 mm from top; ~12 × 9.5 mm.
  const chipTex = paintWithRelief(512, 400, chipPainter, { strength: 2.5, seed: 1, fallback: [214, 170, 82, 255] });
  res.own(chipTex.map); res.own(chipTex.normalMap);
  const chip = new Mesh(
    res.own(new ExtrudeGeometry(roundedRect(.6, .475, .07), { depth: .002, bevelEnabled: true, bevelSize: .004, bevelThickness: .002, bevelSegments: 2 })),
    res.own(new MeshPhysicalMaterial({ map: chipTex.map, normalMap: chipTex.normalMap, metalness: 1, roughness: .28 })));
  // Planar UVs for the plate face.
  const cpos = chip.geometry.attributes.position as BufferAttribute, cuv = chip.geometry.attributes.uv as BufferAttribute;
  for (let i = 0; i < cpos.count; i++) cuv.setXY(i, cpos.getX(i) / .6 + .5, cpos.getY(i) / .475 + .5);
  const fromLeft = (10.25 + 6) / 20, fromTop = (19.23 + 4.75) / 20;
  chip.position.set(-CARD_SIZE.width / 2 + fromLeft, CARD_SIZE.height / 2 - fromTop, CARD_SIZE.thickness / 2 - .0015);
  chip.castShadow = true;
  card.add(res.name(chip, `${name}-emv-contact-plate`));
  // Iridescent hologram patch on the back.
  const holo = new Mesh(res.own(new ExtrudeGeometry(roundedRect(.64, .4, .03), { depth: .0005, bevelEnabled: false })), res.own(new MeshPhysicalMaterial({
    color: "#cfd6de", metalness: 1, roughness: .18, iridescence: 1, iridescenceIOR: 1.9, iridescenceThicknessRange: [180, 820],
  })));
  holo.rotation.y = Math.PI;
  holo.position.set(CARD_SIZE.width / 2 - .75, -CARD_SIZE.height / 2 + .55, -CARD_SIZE.thickness / 2 - .0003);
  card.add(res.name(holo, `${name}-hologram`));
  return card;
}

/** One or two payment cards lying on the table (the second overlapping, fanned). */
export function createPaymentCards(options: PaymentCardOptions = {}): HeroAsset {
  const res = createAssetResources();
  const group = new Group();
  group.name = options.id ?? "payment-cards";
  const second = options.second === undefined ? { palette: "graphite" as const, body: "metal" as const, tier: "Reserve", last4: "8130" } : options.second;
  const T = CARD_SIZE.thickness;
  if (second) {
    // Secondary card flat on the table, fanned behind.
    const b = buildCard(res, second, "card-secondary");
    b.rotation.set(-Math.PI / 2, 0, -.42);
    b.position.set(1.2, T / 2, -.95);
    group.add(b);
  }
  // Primary card on top: rests on the secondary at one corner, the table at the other.
  const a = buildCard(res, options.design ?? {}, "card-primary");
  a.rotation.set(-Math.PI / 2 + (second ? .012 : 0), 0, .1);
  a.position.set(second ? -.35 : 0, second ? T * 1.5 + .004 : T / 2, second ? .25 : 0);
  group.add(a);
  return {
    id: group.name, group, parts: res.parts, tier: "hero", exposure: .74,
    bounds: second ? { min: [-2.6, 0, -2.6], max: [3.4, .3, 1.7] } : { min: [-2.25, 0, -1.5], max: [2.25, .3, 1.5] },
    studio: { palette: "slate", keyAzimuth: -30 },
    craft: {
      materials: ["laminated PVC with clearcoat", "brushed stainless (metal variant)", "foil lettering via metalness mask",
        "gold EMV plate with pad relief", "iridescent hologram", "white card core at the edge"],
      details: ["ISO ID-1 proportions and 3.18 mm corner radius", "beveled edge revealing the core", "raised EMV plate at ISO position",
        "contactless mark", "last-four only, no full number", "magnetic stripe and signature panel"],
    },
    dispose: res.dispose,
  };
}

