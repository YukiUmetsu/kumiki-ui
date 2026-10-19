/** Crafted currency: banknotes, banded cash bundles, proof coins and cast gold bars.
 *
 * All designs are ORIGINAL and anonymous: no real currency artwork, portraits,
 * issuer marks, refiner hallmarks or valid serial formats. Notes are printed
 * "SPECIMEN" and use a generic unit name. Proportions follow real objects
 * (156 × 66.3 mm notes, 0.11 mm paper, 100-note bands; proof coins with mirror
 * fields and frosted devices; trapezoidal cast bars).
 *
 * Scale: 1 world unit = 50 mm.
 */
import {
  BoxGeometry, BufferAttribute, Euler, Group, LatheGeometry, Mesh, MeshPhysicalMaterial, PlaneGeometry, Vector2, Vector3,
} from "three";
import type { BufferGeometry, Texture } from "three";
import { createAssetResources } from "../craft/hero-asset";
import type { AssetResources, HeroAsset } from "../craft/hero-asset";
import { paintTexture, paintWithRelief, seededRandom } from "../craft/canvas-texture";
import type { Painter } from "../craft/canvas-texture";
import { applySurfaceDetail } from "../craft/surface-detail";
import { meshSdfCached, roundBox, sculptGeometry, smoothSubtract } from "../craft/sdf-sculpt";
import { createSculptMaterial, sculptFinishShading } from "../craft/sculpt-finish";
import { actionTime, captureRest, dropBounce, easeInOut, easeOutCubic, findAction, rotateLocal, smooth, TAU } from "../craft/hero-action";
import type { HeroActionSpec, HeroActionState } from "../craft/hero-action";

// ------------------------------------------------------------------ design system

export type NotePalette = "sage" | "violet" | "amber" | "teal" | "rose";
const NOTE_PALETTES: Record<NotePalette, { paper: string; tint: string; ink: string; accent: string; seal: string; back: string }> = {
  sage: { paper: "#ebeadb", tint: "#cfd8c0", ink: "#24392e", accent: "#5f7f5a", seal: "#2f6b56", back: "#3b5a44" },
  violet: { paper: "#ece8ea", tint: "#d8cde0", ink: "#352a4a", accent: "#7a6292", seal: "#5b3f7d", back: "#4a3a63" },
  amber: { paper: "#efe9da", tint: "#e6d1a8", ink: "#4a3418", accent: "#a87a33", seal: "#8a5a1c", back: "#6b4a22" },
  teal: { paper: "#e6ece9", tint: "#c3dad6", ink: "#183c40", accent: "#3f8580", seal: "#1f6a6e", back: "#285458" },
  rose: { paper: "#efe7e3", tint: "#e5cbc4", ink: "#4a2626", accent: "#a5615a", seal: "#8a3a3a", back: "#6a3434" },
};

export interface BanknoteDesign {
  denomination?: number;
  /** Generic unit word printed on the note. */
  unit?: string;
  /** Optional symbol printed beside numerals, e.g. "¤". */
  symbol?: string;
  /** Issuer line; keep anonymous. */
  issuer?: string;
  palette?: NotePalette;
  serial?: string;
}

const SERIF = '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, "Times New Roman", serif';

function spaced(ctx: CanvasRenderingContext2D, spacing: string) {
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = spacing;
}

/** Hypotrochoid rosette: the classic engraved guilloche ornament. */
function rosette(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, petals: number,
  depth: number, color: string, width = 1.3, rotation = 0, squash = 1) {
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(rotation); ctx.scale(1, squash);
  ctx.strokeStyle = color; ctx.lineWidth = width;
  const R = size, r = size / petals, d = r * depth;
  ctx.beginPath();
  for (let i = 0; i <= 1440; i++) {
    const t = i / 1440 * Math.PI * 2;
    const x = (R - r) * Math.cos(t) + d * Math.cos((R - r) / r * t);
    const y = (R - r) * Math.sin(t) - d * Math.sin((R - r) / r * t);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
}

/** Layered rosette medallion (three phase-shifted hypotrochoids + rings). */
function medallion(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, ink: string, accent: string) {
  for (let k = 0; k < 3; k++) rosette(ctx, cx, cy, size * (1 - k * .16), 18 + k * 6, .9 - k * .12, k % 2 ? accent : ink, 1.3, k * .09);
  ctx.strokeStyle = ink; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(cx, cy, size * 1.04, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, size * .5, 0, Math.PI * 2); ctx.stroke();
}

/** Engraved wave-line field (typical intaglio background). */
function waveField(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
  spacing: number, color: string, amplitude: number, frequency: number, phase: number, alpha = .45) {
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.strokeStyle = color; ctx.globalAlpha = alpha; ctx.lineWidth = 1.25;
  for (let row = -2; row * spacing < h + spacing * 2; row++) {
    ctx.beginPath();
    for (let px = 0; px <= w; px += 4) {
      const yy = y + row * spacing + amplitude * Math.sin(px * frequency + row * phase) +
        amplitude * .4 * Math.sin(px * frequency * 2.7 - row * phase * .5);
      if (px === 0) ctx.moveTo(x + px, yy); else ctx.lineTo(x + px, yy);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** Border band built from interlaced sine strands. */
function borderBand(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, vertical = false) {
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = 1.4;
  const length = vertical ? h : w, thickness = vertical ? w : h;
  for (let strand = 0; strand < 9; strand++) {
    ctx.beginPath();
    for (let s = 0; s <= length; s += 3) {
      const offset = thickness / 2 + (thickness / 2 - 3) * Math.sin(s * .055 + strand * Math.PI / 4.5);
      const px = vertical ? x + offset : x + s, py = vertical ? y + s : y + offset;
      if (s === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.lineWidth = 1.6;
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

/** Neoclassical facade, hatched like an engraving. Used on notes and coins. */
function templeEmblem(ctx: CanvasRenderingContext2D, cx: number, base: number, width: number, ink: string, hatch = 3) {
  const w = width, h = w * .62, columnCount = 6;
  ctx.save();
  ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineWidth = 1;
  // Steps.
  for (let i = 0; i < 3; i++) ctx.fillRect(cx - w / 2 - (2 - i) * w * .03, base - (i + 1) * h * .045, w + (2 - i) * w * .06, h * .035);
  const top = base - h * .135 - h * .52;
  // Columns with fluting hatch.
  for (let c = 0; c < columnCount; c++) {
    const colX = cx - w * .42 + c * (w * .84 / (columnCount - 1));
    const cw = w * .07;
    ctx.fillRect(colX - cw * .62, top - h * .02, cw * 1.24, h * .03);            // capital
    ctx.fillRect(colX - cw * .6, base - h * .15, cw * 1.2, h * .025);            // base
    for (let f = -2; f <= 2; f++) {
      ctx.beginPath(); ctx.moveTo(colX + f * cw * .2, top + h * .01); ctx.lineTo(colX + f * cw * .21, base - h * .15); ctx.stroke();
    }
  }
  // Shadowed cella behind columns: horizontal hatching.
  ctx.globalAlpha = .55;
  for (let yy = top + h * .03; yy < base - h * .16; yy += hatch) {
    ctx.beginPath(); ctx.moveTo(cx - w * .4, yy); ctx.lineTo(cx + w * .4, yy); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // Entablature and pediment.
  ctx.fillRect(cx - w * .5, top - h * .1, w, h * .06);
  ctx.fillRect(cx - w * .52, top - h * .14, w * 1.04, h * .025);
  ctx.beginPath();
  ctx.moveTo(cx - w * .53, top - h * .15); ctx.lineTo(cx, top - h * .42); ctx.lineTo(cx + w * .53, top - h * .15);
  ctx.closePath(); ctx.lineWidth = 2.2; ctx.stroke();
  ctx.save(); ctx.clip();
  ctx.lineWidth = .8;
  for (let xx = cx - w * .55; xx < cx + w * .55; xx += hatch * 1.4) {
    ctx.beginPath(); ctx.moveTo(xx, top - h * .15); ctx.lineTo(xx + h * .3, top - h * .45); ctx.stroke();
  }
  ctx.restore();
  ctx.restore();
}

/** Sawtooth seal with inner rings and a key glyph. */
function seal(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string, paper: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i <= 96; i++) {
    const a = i / 96 * Math.PI * 2, rr = i % 2 ? r : r * .9;
    ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  ctx.fill();
  ctx.strokeStyle = paper; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, r * .78, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, cy, r * .7, 0, Math.PI * 2); ctx.stroke();
  // Key: bow ring + shaft + bit.
  ctx.lineWidth = r * .07;
  ctx.beginPath(); ctx.arc(cx - r * .22, cy, r * .16, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - r * .06, cy); ctx.lineTo(cx + r * .42, cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + r * .3, cy); ctx.lineTo(cx + r * .3, cy + r * .16);
  ctx.moveTo(cx + r * .4, cy); ctx.lineTo(cx + r * .4, cy + r * .12); ctx.stroke();
  ctx.restore();
}

function paperBase(ctx: CanvasRenderingContext2D, w: number, h: number, paper: string, tint: string, random: () => number) {
  ctx.fillStyle = paper; ctx.fillRect(0, 0, w, h);
  const glow = ctx.createLinearGradient(0, 0, w, h);
  glow.addColorStop(0, tint); glow.addColorStop(.55, paper); glow.addColorStop(1, tint);
  ctx.globalAlpha = .9; ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
  // Underprint: a soft colored rainbow-roll band, as on modern notes.
  const roll = ctx.createLinearGradient(0, 0, w, 0);
  roll.addColorStop(0, tint); roll.addColorStop(.45, paper); roll.addColorStop(.7, tint); roll.addColorStop(1, paper);
  ctx.globalAlpha = .6; ctx.fillStyle = roll; ctx.fillRect(0, h * .12, w, h * .76); ctx.globalAlpha = 1;
  // Cotton-linen fibre: pale strands plus sparse red/blue security fibres.
  for (let i = 0; i < 5200; i++) {
    const x = random() * w, y = random() * h, a = random() * Math.PI, l = 3 + random() * 9;
    ctx.strokeStyle = `rgba(255,255,255,${.08 + random() * .12})`; ctx.lineWidth = .6;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
  }
  for (let i = 0; i < 70; i++) {
    const x = random() * w, y = random() * h, a = random() * Math.PI * 2, l = 8 + random() * 14;
    ctx.strokeStyle = random() > .5 ? "rgba(178,44,52,.55)" : "rgba(40,72,160,.5)"; ctx.lineWidth = .9;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a + 1) * l * .6, y + Math.sin(a + 1) * l * .6, x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
  }
}

const words = (n: number) => {
  const table: Record<number, string> = { 1: "ONE", 2: "TWO", 5: "FIVE", 10: "TEN", 20: "TWENTY", 50: "FIFTY", 100: "ONE HUNDRED", 500: "FIVE HUNDRED", 1000: "ONE THOUSAND" };
  return table[n] ?? String(n);
};

/**
 * Front layout grid (fractions of width w / height h), chosen so no text,
 * thread or ornament overlaps another element:
 *   corner rosettes in the four corners · title centered at .17h ·
 *   security thread at x .155w · oval medallion at (.35w, .53h) ·
 *   seal (.6w, .38h) · value words (.6w, .585h) · outlined numeral (.6w, .86h) ·
 *   watermark window (.81w, .56h) · serials top-right and bottom-left ·
 *   SPECIMEN line under the title on the right half.
 */
function frontPainter(design: Required<Omit<BanknoteDesign, "symbol">> & { symbol: string }): Painter {
  const p = NOTE_PALETTES[design.palette];
  return (ctx, w, h, random) => {
    paperBase(ctx, w, h, p.paper, p.tint, random);
    const m = h * .05, band = h * .055;
    waveField(ctx, m, m, w - m * 2, h - m * 2, 7, p.accent, 3, .019, .38, .62);
    // Watermark window: unprinted paper with a soft embossed emblem.
    const wx = w * .81, wy = h * .56;
    ctx.save();
    ctx.beginPath(); ctx.ellipse(wx, wy, h * .17, h * .22, 0, 0, Math.PI * 2);
    const wm = ctx.createRadialGradient(wx, wy, 0, wx, wy, h * .22);
    wm.addColorStop(0, "rgba(255,255,255,.5)"); wm.addColorStop(1, p.paper);
    ctx.fillStyle = p.paper; ctx.fill(); ctx.fillStyle = wm; ctx.fill(); ctx.clip();
    ctx.globalAlpha = .16; templeEmblem(ctx, wx, wy + h * .12, h * .26, p.ink, 4); ctx.globalAlpha = 1;
    ctx.restore();
    // Border bands and frame.
    borderBand(ctx, m, m, w - m * 2, band, p.ink);
    borderBand(ctx, m, h - m - band, w - m * 2, band, p.ink);
    borderBand(ctx, m, m + band, band, h - m * 2 - band * 2, p.ink, true);
    borderBand(ctx, w - m - band, m + band, band, h - m * 2 - band * 2, p.ink, true);
    ctx.strokeStyle = p.ink; ctx.lineWidth = 4; ctx.strokeRect(m - 6, m - 6, w - m * 2 + 12, h - m * 2 + 12);
    // Windowed security thread with microtext (left of the medallion, crosses no lettering).
    const tx = w * .155;
    ctx.fillStyle = p.ink; ctx.globalAlpha = .9;
    for (let yy = m + band; yy < h - m - band; yy += h * .09) ctx.fillRect(tx - 6, yy, 12, h * .05);
    ctx.globalAlpha = 1;
    // Corner rosettes with denomination numerals.
    const r0 = h * .135;
    const corners: Array<[number, number, number]> = [[m + r0 * .95, m + r0 * .95, 1], [w - m - r0 * .95, h - m - r0 * .95, 1],
      [w - m - r0 * .8, m + r0 * .8, .78], [m + r0 * .8, h - m - r0 * .8, .78]];
    for (const [x, y, s] of corners) {
      ctx.fillStyle = p.paper; ctx.beginPath(); ctx.arc(x, y, r0 * s, 0, Math.PI * 2); ctx.fill();
      medallion(ctx, x, y, r0 * .9 * s, p.ink, p.accent);
      ctx.fillStyle = p.ink; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = `700 ${Math.round(h * .115 * s)}px ${SERIF}`; spaced(ctx, "0px");
      ctx.lineWidth = 8; ctx.strokeStyle = p.paper; ctx.strokeText(String(design.denomination), x, y + h * .005);
      ctx.fillText(String(design.denomination), x, y + h * .005);
    }
    // Oval medallion with the engraved facade vignette.
    const ox = w * .35, oy = h * .53, rx = h * .22, ry = h * .27;
    ctx.save();
    ctx.beginPath(); ctx.ellipse(ox, oy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = p.paper; ctx.fill(); ctx.clip();
    ctx.strokeStyle = p.ink; ctx.lineWidth = 1.2;
    for (let yy = oy - ry; yy < oy + ry * .3; yy += 2.6 + (yy - oy + ry) / ry * 2.4) {
      ctx.globalAlpha = .6; ctx.beginPath(); ctx.moveTo(ox - rx, yy); ctx.lineTo(ox + rx, yy); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    templeEmblem(ctx, ox, oy + ry * .6, rx * 1.55, p.ink, 3);
    ctx.lineWidth = 1.3;
    for (let yy = oy + ry * .6; yy < oy + ry; yy += 3) { ctx.beginPath(); ctx.moveTo(ox - rx, yy); ctx.lineTo(ox + rx, yy); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = p.ink; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.ellipse(ox, oy, rx + 6, ry + 6, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(ox, oy, rx + 17, ry + 17, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = p.ink;
    for (let i = 0; i < 110; i++) {
      const a = i / 110 * Math.PI * 2;
      ctx.beginPath(); ctx.arc(ox + Math.cos(a) * (rx + 11.5), oy + Math.sin(a) * (ry + 11.5), 2.2, 0, Math.PI * 2); ctx.fill();
    }
    // Lettering.
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.fillStyle = p.ink;
    ctx.font = `600 ${Math.round(h * .068)}px ${SERIF}`; spaced(ctx, `${Math.round(h * .014)}px`);
    ctx.fillText(design.issuer.toUpperCase(), w * .55, h * .19);
    ctx.font = `italic 500 ${Math.round(h * .03)}px ${SERIF}`; spaced(ctx, "1px");
    ctx.globalAlpha = .85; ctx.fillText("SPECIMEN · ILLUSTRATIVE NOTE · NOT LEGAL TENDER", w * .6, h * .245); ctx.globalAlpha = 1;
    seal(ctx, w * .6, h * .38, h * .1, p.seal, p.paper);
    ctx.font = `600 ${Math.round(h * .04)}px ${SERIF}`; spaced(ctx, `${Math.round(h * .006)}px`);
    ctx.fillText(`${words(design.denomination)} ${design.unit.toUpperCase()}`, w * .585, h * .585);
    ctx.font = `700 ${Math.round(h * .27)}px ${SERIF}`; spaced(ctx, "0px");
    ctx.lineWidth = 3; ctx.strokeStyle = p.ink;
    ctx.strokeText(design.symbol + design.denomination, w * .6, h * .86);
    ctx.font = `600 ${Math.round(h * .046)}px "Courier New", monospace`; spaced(ctx, `${Math.round(h * .006)}px`);
    ctx.fillStyle = p.seal;
    ctx.textAlign = "right"; ctx.fillText(design.serial, w - m - band - h * .02, h * .33);
    ctx.textAlign = "left"; ctx.fillText(design.serial, tx + h * .04, h - m - band - h * .03);
    // Microtext on the thread, drawn last so it stays crisp.
    ctx.save(); ctx.translate(tx, h / 2); ctx.rotate(-Math.PI / 2);
    ctx.font = `700 ${Math.round(h * .013)}px sans-serif`; ctx.fillStyle = p.paper; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(`${design.denomination} ${design.unit.toUpperCase()} · `.repeat(12), 0, 0);
    ctx.restore();
  };
}

function backPainter(design: Required<Omit<BanknoteDesign, "symbol">> & { symbol: string }): Painter {
  const p = NOTE_PALETTES[design.palette];
  return (ctx, w, h, random) => {
    paperBase(ctx, w, h, p.paper, p.tint, random);
    const m = h * .05, band = h * .07;
    waveField(ctx, m, m, w - m * 2, h - m * 2, 6, p.back, 3, .017, .5, .4);
    borderBand(ctx, m, m, w - m * 2, band, p.back);
    borderBand(ctx, m, h - m - band, w - m * 2, band, p.back);
    ctx.strokeStyle = p.back; ctx.lineWidth = 3; ctx.strokeRect(m - 6, m - 6, w - m * 2 + 12, h - m * 2 + 12);
    medallion(ctx, w * .5, h * .5, h * .3, p.back, p.accent);
    ctx.fillStyle = p.back; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = `700 ${Math.round(h * .26)}px ${SERIF}`;
    ctx.lineWidth = 10; ctx.strokeStyle = p.paper; ctx.strokeText(String(design.denomination), w * .5, h * .52);
    ctx.fillText(String(design.denomination), w * .5, h * .52);
    for (const x of [w * .16, w * .84]) { medallion(ctx, x, h * .5, h * .17, p.back, p.accent); }
    ctx.font = `600 ${Math.round(h * .05)}px ${SERIF}`; spaced(ctx, `${Math.round(h * .012)}px`);
    ctx.fillText(design.issuer.toUpperCase(), w * .5, m + band + h * .07);
    ctx.fillText(`${words(design.denomination)} ${design.unit.toUpperCase()}`, w * .5, h - m - band - h * .07);
  };
}

/** Bundle edge: stratified sheets with slight tint, density and fibre variation. */
const edgePainter = (paper: string, tint: string): Painter => (ctx, w, h, random) => {
  ctx.fillStyle = paper; ctx.fillRect(0, 0, w, h);
  let y = 0;
  while (y < h) {
    const t = 1.5 + random() * 2.5;
    ctx.fillStyle = random() > .55 ? tint : paper;
    ctx.globalAlpha = .55 + random() * .45; ctx.fillRect(0, y, w, t);
    ctx.globalAlpha = .3 + random() * .25; ctx.fillStyle = "#3c3a33"; ctx.fillRect(0, y + t, w, .7);
    y += t + .7;
  }
  ctx.globalAlpha = 1;
};

/** Bank strap: kraft band with printed amount and border rules. */
const strapPainter = (color: string, text: string): Painter => (ctx, w, h) => {
  ctx.fillStyle = color; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(30,25,15,.6)"; ctx.lineWidth = 3;
  ctx.strokeRect(10, 10, w - 20, h - 20);
  ctx.lineWidth = 1; ctx.strokeRect(20, 20, w - 40, h - 40);
  ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = "rgba(25,20,12,.85)"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = `700 ${Math.round(w * .32)}px ${SERIF}`;
  ctx.fillText(text, 0, 0);
  ctx.restore();
};

function resolveDesign(design: BanknoteDesign) {
  return {
    denomination: design.denomination ?? 100, unit: design.unit ?? "Units", issuer: design.issuer ?? "Central Reserve",
    palette: design.palette ?? "sage", serial: design.serial ?? "KU 0428 1957 A", symbol: design.symbol ?? "",
  } as const;
}

/**
 * Paint the original note artwork to a canvas (2048 × 870) for 2D use:
 * thumbnails, SVG <image> fills or flat motion graphics that must match the
 * 3D asset exactly. Returns null where no canvas exists.
 */
export function createBanknoteArtwork(design: BanknoteDesign = {}, side: "front" | "back" = "front"): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 2048; canvas.height = 870;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const full = resolveDesign(design);
  (side === "front" ? frontPainter(full) : backPainter(full))(ctx, canvas.width, canvas.height, seededRandom(side === "front" ? 11 : 12));
  return canvas;
}

// ------------------------------------------------------------------ notes and bundles

export const NOTE_SIZE = { width: 3.12, height: 1.326, sheet: .0022 } as const;

interface NoteTextures { front: Texture; frontRelief: Texture; back: Texture; backRelief: Texture; edge: Texture }

function noteTextures(res: AssetResources, design: BanknoteDesign): NoteTextures {
  const full = resolveDesign(design);
  const p = NOTE_PALETTES[full.palette];
  const front = paintWithRelief(2048, 870, frontPainter(full), { seed: 11, strength: 1.1, invert: true, fallback: [214, 218, 200, 255] });
  const back = paintWithRelief(2048, 870, backPainter(full), { seed: 12, strength: 1.1, invert: true, fallback: [200, 208, 192, 255] });
  const edge = paintTexture(64, 512, edgePainter(p.paper, p.tint), { seed: 13, repeat: true, fallback: [222, 222, 210, 255] });
  for (const t of [front.map, front.normalMap, back.map, back.normalMap, edge]) res.own(t);
  return { front: front.map, frontRelief: front.normalMap, back: back.map, backRelief: back.normalMap, edge };
}

function paperMaterial(res: AssetResources, map: Texture, normalMap?: Texture) {
  const material = new MeshPhysicalMaterial({
    map, normalMap, normalScale: new Vector2(.6, .6), roughness: .8, metalness: 0, color: "#a4a69e",
    sheen: .15, sheenRoughness: .7, sheenColor: "#f4f1e8",
  });
  return res.own(applySurfaceDetail(material, { kind: "paper", frequency: 160, strength: .00008, roughnessVariation: .12, flow: [1, 0, 0] }));
}

/** Gently curved single-note geometry lying in XZ (front faces +Y). */
function noteGeometry(curl: number, lift: number, seed: number): BufferGeometry {
  const g = new PlaneGeometry(NOTE_SIZE.width, NOTE_SIZE.height, 40, 14);
  g.rotateX(-Math.PI / 2);
  const random = seededRandom(seed), wobble = random() * 6;
  const pos = g.attributes.position as BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const u = x / NOTE_SIZE.width + .5, v = z / NOTE_SIZE.height + .5;
    // Lengthwise curl + a lifted corner + faint handling waviness.
    const y = curl * Math.pow(Math.abs(u - .5) * 2, 2) + lift * Math.pow(Math.max(0, u - .62) / .38, 2.2) * Math.pow(v, 1.5) +
      .004 * Math.sin(u * 9 + wobble) * Math.sin(v * 5 + wobble);
    pos.setY(i, y);
  }
  g.computeVertexNormals();
  return g;
}

function noteMesh(res: AssetResources, textures: NoteTextures, materials: { front: MeshPhysicalMaterial; back: MeshPhysicalMaterial },
  curl = .04, lift = 0, seed = 1): Group {
  const group = new Group();
  const front = res.own(noteGeometry(curl, lift, seed));
  const back = res.own(front.clone());
  // The back sheet faces down: flip its triangles and mirror UVs so print reads correctly.
  const index = back.index!;
  for (let i = 0; i < index.count; i += 3) { const a = index.getX(i); index.setX(i, index.getX(i + 2)); index.setX(i + 2, a); }
  const uv = back.attributes.uv as BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i));
  const normal = back.attributes.normal as BufferAttribute;
  for (let i = 0; i < normal.count; i++) normal.setXYZ(i, -normal.getX(i), -normal.getY(i), -normal.getZ(i));
  back.translate(0, -NOTE_SIZE.sheet * .5, 0);
  const a = new Mesh(front, materials.front), b = new Mesh(back, materials.back);
  for (const mesh of [a, b]) { mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); }
  void textures;
  return group;
}

/** Banded bundle of 100 notes: stratified edges, strap, slight sheet misalignment. */
function bundleMesh(res: AssetResources, textures: NoteTextures, materials: { front: MeshPhysicalMaterial; back: MeshPhysicalMaterial; edge: MeshPhysicalMaterial; strap: MeshPhysicalMaterial },
  sheets: number, seed: number): Group {
  const group = new Group();
  const thickness = NOTE_SIZE.sheet * sheets;
  const g = new BoxGeometry(NOTE_SIZE.width, thickness, NOTE_SIZE.height, 30, 24, 12);
  // Sheets never align perfectly: jitter side walls per layer, keep faces flat.
  const random = seededRandom(seed);
  const layerX = Array.from({ length: 25 }, () => (random() - .5) * .012);
  const layerZ = Array.from({ length: 25 }, () => (random() - .5) * .01);
  const pos = g.attributes.position as BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const layer = Math.round((pos.getY(i) / thickness + .5) * 24);
    const sx = Math.sign(pos.getX(i)), sz = Math.sign(pos.getZ(i));
    if (Math.abs(pos.getX(i)) > NOTE_SIZE.width / 2 - 1e-4) pos.setX(i, pos.getX(i) + layerX[layer] * sx);
    if (Math.abs(pos.getZ(i)) > NOTE_SIZE.height / 2 - 1e-4) pos.setZ(i, pos.getZ(i) + layerZ[layer] * sz);
  }
  g.computeVertexNormals();
  // Edge UVs: stretch the strata texture to the real number of sheets.
  const uv = g.attributes.uv as BufferAttribute;
  const normal = g.attributes.normal as BufferAttribute;
  for (let i = 0; i < uv.count; i++) {
    if (Math.abs(normal.getY(i)) < .5) uv.setY(i, (pos.getY(i) / thickness + .5) * sheets / 220);
  }
  const block = new Mesh(res.own(g), [materials.edge, materials.edge, materials.front, materials.back, materials.edge, materials.edge]);
  block.castShadow = true; block.receiveShadow = true;
  group.add(res.name(block, "cash-bundle-sheets"));
  // Paper strap around the middle.
  const strapW = .62, t = .006;
  const strap = new Group();
  const top = new Mesh(res.own(new BoxGeometry(strapW, t, NOTE_SIZE.height + t * 2)), materials.strap);
  top.position.y = thickness / 2 + t / 2;
  const bottom = top.clone(); bottom.position.y = -thickness / 2 - t / 2;
  const side = new Mesh(res.own(new BoxGeometry(strapW, thickness + t * 2, t)), materials.strap);
  side.position.z = NOTE_SIZE.height / 2 + t / 2;
  const side2 = side.clone(); side2.position.z *= -1;
  for (const mesh of [top, bottom, side, side2]) { mesh.castShadow = true; mesh.receiveShadow = true; strap.add(mesh); }
  strap.position.x = -NOTE_SIZE.width * .12;
  group.add(res.name(strap, "cash-bundle-strap"));
  void textures;
  return group;
}

export const CASH_ACTIONS: readonly HeroActionSpec[] = [
  { id: "rain", label: "Money rain", durationFrames: 90, loop: false, meaning: "Windfall: money pours in and piles up." },
  { id: "fan", label: "Fan out", durationFrames: 36, loop: false, meaning: "Show the cash: notes spread like a hand of cards." },
];

export interface CashOptions {
  id?: string;
  design?: BanknoteDesign;
  /** Banded bundles in the stack (1–12). */
  bundles?: number;
  /** Loose notes fanned on top (0–6). */
  looseNotes?: number;
  strapColor?: string;
}

function cashMaterials(res: AssetResources, textures: NoteTextures, strapColor: string, strapText: string) {
  const front = paperMaterial(res, textures.front, textures.frontRelief);
  const back = paperMaterial(res, textures.back, textures.backRelief);
  const edge = res.own(new MeshPhysicalMaterial({ map: textures.edge, color: "#a9aba2", roughness: .9, metalness: 0, sheen: .1 }));
  const strapMap = res.own(paintTexture(256, 512, strapPainter(strapColor, strapText), { seed: 5, fallback: [196, 160, 96, 255] }));
  const strap = res.own(applySurfaceDetail(new MeshPhysicalMaterial({ map: strapMap, roughness: .7, metalness: 0, sheen: .25 }),
    { kind: "paper", frequency: 120, strength: .0002, flow: [0, 0, 1] }));
  return { front, back, edge, strap };
}

/** Stack of banded bundles with optional loose notes fanned on top. */
export function createCashStack(options: CashOptions = {}): HeroAsset {
  const res = createAssetResources();
  const group = new Group();
  group.name = options.id ?? "cash-stack";
  const bundles = Math.max(1, Math.min(12, Math.round(options.bundles ?? 3)));
  const loose = Math.max(0, Math.min(6, Math.round(options.looseNotes ?? 2)));
  const textures = noteTextures(res, options.design ?? {});
  const denom = options.design?.denomination ?? 100;
  const mats = cashMaterials(res, textures, options.strapColor ?? "#c9a66b", (denom * 100).toLocaleString("en-US").replace(/,/g, " "));
  const random = seededRandom(91);
  const sheets = 100, thickness = NOTE_SIZE.sheet * sheets;
  let y = 0;
  for (let i = 0; i < bundles; i++) {
    const bundle = bundleMesh(res, textures, mats, sheets, 300 + i);
    bundle.position.set((random() - .5) * .12, y + thickness / 2 + .0015, (random() - .5) * .08);
    bundle.rotation.y = (random() - .5) * .09;
    group.add(res.name(bundle, `cash-bundle-${i + 1}`));
    y += thickness + .002;
  }
  for (let i = 0; i < loose; i++) {
    const note = noteMesh(res, textures, mats, .03 + i * .01, i === loose - 1 ? .12 : .02, 40 + i);
    note.position.set(.25 + i * .18, y + .004 + i * .006, .1 - i * .12);
    note.rotation.y = -.18 - i * .2;
    group.add(res.name(note, `loose-note-${i + 1}`));
  }
  const top = y + loose * .006 + .2;
  // Action pool: hidden notes used by "rain" (fall and pile up) and "fan" (spread like a hand).
  const pool: Group[] = [];
  for (let i = 0; i < 12; i++) {
    const note = noteMesh(res, textures, mats, .02 + (i % 3) * .015, i % 4 === 0 ? .06 : .01, 80 + i);
    note.visible = false;
    group.add(res.name(note, `action-note-${i + 1}`));
    pool.push(note);
  }
  const stackTop = y + loose * .006;
  const rain = pool.map((_, i) => {
    const r = seededRandom(500 + i);
    return { start: i * .045, x0: (r() - .5) * 1.6, z0: (r() - .5) * 1.0, x1: (r() - .5) * .7, z1: (r() - .5) * .4,
      yaw0: r() * TAU, yaw1: (r() - .5) * 1.2, phase: r() * TAU, height: 2.6 + r() * .9 };
  });
  const movable = group.children.filter(c => c.name.startsWith("loose-note") || c.name.startsWith("action-note"));
  const rest = captureRest(movable);
  const pose = (state: HeroActionState) => {
    rest.restore();
    if (!state.id) return;
    const spec = findAction(CASH_ACTIONS, state.id), t = actionTime(spec, state.frame, state.fps);
    if (spec.id === "rain") {
      pool.forEach((note, i) => {
        const p = rain[i], u = (t - p.start) / .5;
        if (u <= 0) return;
        note.visible = true;
        const fall = Math.min(1, u), landed = smooth((u - .92) / .08);
        // Paper falls with drag: slower than ballistic, fluttering and drifting.
        const h = (1 - Math.pow(fall, 1.25)) * p.height;
        const flutter = (1 - fall) * .75;
        note.position.set(p.x0 + (p.x1 - p.x0) * fall + .25 * Math.sin(u * 7 + p.phase) * (1 - fall),
          stackTop + .004 + i * .0026 + h, p.z0 + (p.z1 - p.z0) * fall);
        note.rotation.set(flutter * Math.sin(u * 9 + p.phase) * (1 - landed), p.yaw0 + (p.yaw1 - p.yaw0) * fall,
          flutter * .6 * Math.cos(u * 7 + p.phase) * (1 - landed));
      });
    } else {
      // Fan: seven notes spread from a shared corner pivot on the stack top.
      const spread = easeOutCubic(t / .8);
      const pivot = new Vector3(-.6, stackTop + .006, .35);
      for (let i = 0; i < 7; i++) {
        const note = pool[i], angle = (-.9 + i * .3) * spread + .25;
        note.visible = true;
        const arm = NOTE_SIZE.width * .42;
        note.position.set(pivot.x + Math.cos(angle) * arm, pivot.y + i * .003, pivot.z - Math.sin(angle) * arm);
        note.rotation.set(0, angle, 0);
      }
    }
  };
  return {
    id: group.name, group, parts: res.parts, tier: "hero",
    bounds: { min: [-1.95, 0, -1.25], max: [2.05, Math.max(.45, top), 1.25] },
    exposure: .68,
    studio: { palette: "midnight", keyAzimuth: -30 },
    craft: {
      materials: ["cotton-linen note paper with sheen", "intaglio ink relief (normal map from the print)", "kraft paper strap"],
      details: ["original guilloche, rosettes, medallion and microtext", "watermark window and windowed security thread",
        "stratified bundle edges with per-sheet misalignment", "curled loose notes with lifted corner", "SPECIMEN marking; no real currency artwork"],
    },
    metersPerUnit: .05,
    actions: CASH_ACTIONS, pose,
    dispose: res.dispose,
  };
}

/** A single gently curled banknote, front up. */
export function createBanknote(options: { id?: string; design?: BanknoteDesign } = {}): HeroAsset {
  const res = createAssetResources();
  const group = new Group();
  group.name = options.id ?? "banknote";
  const textures = noteTextures(res, options.design ?? {});
  const mats = { front: paperMaterial(res, textures.front, textures.frontRelief), back: paperMaterial(res, textures.back, textures.backRelief) };
  const note = noteMesh(res, textures, mats, .09, .18, 7);
  note.position.y = .01;
  group.add(res.name(note, "banknote-sheet"));
  const rest = captureRest([note]);
  const actions: readonly HeroActionSpec[] = [
    { id: "flip", label: "Flip over", durationFrames: 45, loop: false, meaning: "Show both sides of the note." },
    { id: "float", label: "Float", durationFrames: 90, loop: true, meaning: "Gentle hover for titles and transitions." },
  ];
  return {
    metersPerUnit: .05, actions,
    pose(state: HeroActionState) {
      rest.restore();
      if (!state.id) return;
      const spec = findAction(actions, state.id), t = actionTime(spec, state.frame, state.fps);
      const r = rest.of(note);
      if (spec.id === "flip") {
        const lift = Math.sin(Math.min(1, t / .9) * Math.PI);
        note.position.y = r.position.y + .55 * lift;
        rotateLocal(note, r.quaternion, easeInOut(t / .9) * Math.PI, 0, 0);
      } else {
        note.position.y = r.position.y + .35 + .06 * Math.sin(t * TAU);
        rotateLocal(note, r.quaternion, .08 * Math.sin(t * TAU + 1), .05 * Math.sin(t * TAU), .06 * Math.cos(t * TAU));
      }
    },
    id: group.name, group, parts: res.parts, tier: "hero",
    bounds: { min: [-1.6, 0, -.7], max: [1.6, .45, .7] },
    exposure: .68,
    studio: { palette: "midnight", keyAzimuth: -30 },
    craft: { materials: ["note paper with sheen", "intaglio relief"], details: ["front and back print", "curl and lifted corner", "SPECIMEN marking"] },
    dispose: res.dispose,
  };
}

// ------------------------------------------------------------------ coins

export type CoinMetal = "gold" | "silver" | "copper" | "bimetal";
const METAL: Record<CoinMetal, { core: string; ring: string }> = {
  gold: { core: "#f3c56d", ring: "#f3c56d" },
  silver: { core: "#dfe3e6", ring: "#dfe3e6" },
  copper: { core: "#e3976b", ring: "#e3976b" },
  bimetal: { core: "#dfe3e6", ring: "#ecc067" },
};

/** Relief height (white raised): bead rim, legend, device. Device: "temple" or "numeral". */
const coinRelief = (device: "temple" | "numeral", legend: string, value: string): Painter => (ctx, w, h) => {
  const c = w / 2, R = w / 2;
  // Field grey sets the satin field roughness (≈.15); white relief is frosted.
  ctx.fillStyle = "#4a4a4a"; ctx.fillRect(0, 0, w, h);
  // Raised rim (outside .86R) and bead ring.
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(c, c, R, 0, Math.PI * 2); ctx.arc(c, c, R * .885, 0, Math.PI * 2, true); ctx.fill();
  for (let i = 0; i < 110; i++) {
    const a = i / 110 * Math.PI * 2;
    ctx.beginPath(); ctx.arc(c + Math.cos(a) * R * .84, c + Math.sin(a) * R * .84, R * .012, 0, Math.PI * 2); ctx.fill();
  }
  // Legend along the circle.
  ctx.font = `600 ${Math.round(R * .1)}px ${SERIF}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const chars = legend.split("");
  const span = Math.PI * 1.25, start = -Math.PI / 2 - span / 2;
  chars.forEach((ch, i) => {
    const a = start + span * (i + .5) / chars.length;
    ctx.save(); ctx.translate(c + Math.cos(a) * R * .72, c + Math.sin(a) * R * .72); ctx.rotate(a + Math.PI / 2);
    ctx.fillText(ch, 0, 0); ctx.restore();
  });
  // Laurel sprays along the lower half.
  for (const side of [-1, 1]) for (let i = 0; i < 9; i++) {
    const a = Math.PI / 2 + side * (.25 + i * .13);
    const x = c + Math.cos(a) * R * .7, y = c + Math.sin(a) * R * .7;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a + side * .9);
    ctx.beginPath(); ctx.ellipse(0, 0, R * .055, R * .022, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  if (device === "temple") {
    ctx.save(); ctx.fillStyle = "#fff"; ctx.strokeStyle = "#fff";
    templeEmblem(ctx, c, c + R * .32, R * .9, "#fff", 5);
    ctx.restore();
    ctx.font = `700 ${Math.round(R * .14)}px ${SERIF}`; ctx.fillText(value, c, c + R * .5);
  } else {
    ctx.font = `700 ${Math.round(R * .62)}px ${SERIF}`; ctx.fillText(value, c, c + R * .02);
    ctx.font = `600 ${Math.round(R * .1)}px ${SERIF}`; ctx.fillText("UNIT", c, c + R * .42);
  }
  // Soften into sculpted relief.
  ctx.filter = "blur(2.5px)"; ctx.drawImage(ctx.canvas, 0, 0); ctx.filter = "none";
};

const coinAlbedo = (metal: CoinMetal): Painter => (ctx, w) => {
  const c = w / 2, { core, ring } = METAL[metal];
  ctx.fillStyle = ring; ctx.fillRect(0, 0, w, w);
  ctx.fillStyle = core; ctx.beginPath(); ctx.arc(c, c, w * (metal === "bimetal" ? .3 : .5), 0, Math.PI * 2); ctx.fill();
  if (metal === "bimetal") { ctx.strokeStyle = "rgba(60,50,30,.6)"; ctx.lineWidth = 3; ctx.stroke(); }
};

export const COIN_SIZE = { radius: 1, thickness: .15 } as const;

function coinProfile(): Vector2[] {
  const T = COIN_SIZE.thickness / 2;
  return [
    [0, T * .74], [.4, T * .73], [.8, T * .69], [.845, T * .7], [.865, T * .97], [.88, T * 1.04],
    [.95, T * 1.03], [.985, T * .96], [1, T * .8], [1, 0],
  ].map(([r, y]) => new Vector2(r * COIN_SIZE.radius, y));
}

function coinHalf(top: boolean, reeds: number): BufferGeometry {
  const profile = coinProfile();
  // Lathe winding follows point order: run the profile rim→center for outward faces.
  const points = top ? [...profile].reverse() : profile.map(p => new Vector2(p.x, -p.y));
  const g = new LatheGeometry(points, 360);
  const pos = g.attributes.position as BufferAttribute, uv = g.attributes.uv as BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), r = Math.hypot(x, z);
    // Reeded edge: real grooves in geometry, not a painted stripe.
    if (r > COIN_SIZE.radius * .995 && Math.abs(y) < COIN_SIZE.thickness * .41) {
      const a = Math.atan2(x, z), groove = .5 + .5 * Math.cos(a * reeds);
      const k = (COIN_SIZE.radius - .006 * groove) / r;
      pos.setX(i, x * k); pos.setZ(i, z * k);
    }
    uv.setXY(i, .5 + (top ? x : -x) / (2 * COIN_SIZE.radius), .5 - z / (2 * COIN_SIZE.radius));
  }
  g.computeVertexNormals();
  return g;
}

export const COIN_ACTIONS: readonly HeroActionSpec[] = [
  { id: "drop", label: "Coins drop", durationFrames: 72, loop: false, meaning: "Savings accumulate: coins land one by one and the stack grows." },
  { id: "spin", label: "Spin and settle", durationFrames: 90, loop: false, meaning: "A coin toss / chance: the coin spins on its rim and settles." },
];

export interface CoinOptions { id?: string; metal?: CoinMetal; count?: number; legend?: string; value?: string }

/**
 * Shared proof-coin parts: one pair of half-geometries and face materials,
 * reused by every coin instance. `coin()` adds a named coin to `group`.
 */
export function createCoinFactory(res: AssetResources, group: Group, options: Pick<CoinOptions, "metal" | "legend" | "value"> = {}) {
  const metal = options.metal ?? "gold";
  const value = options.value ?? "1";
  const legend = options.legend ?? "CENTRAL RESERVE · MMXXVI";
  const obverse = paintWithRelief(1024, 1024, coinRelief("temple", legend, value + " UNIT"), { color: "data", strength: 3.2, seed: 3, fallback: [40, 40, 40, 255] });
  const reverse = paintWithRelief(1024, 1024, coinRelief("numeral", "SPECIMEN · ILLUSTRATIVE", value), { color: "data", strength: 3.2, seed: 4, fallback: [40, 40, 40, 255] });
  const albedo = paintTexture(256, 256, coinAlbedo(metal), { seed: 2, fallback: [230, 190, 110, 255] });
  for (const t of [obverse.map, obverse.normalMap, reverse.map, reverse.normalMap, albedo]) res.own(t);
  // Relief height doubles as roughness: satin fields (grey) vs frosted devices (white).
  const face = (relief: { map: Texture; normalMap: Texture }) => res.own(applySurfaceDetail(new MeshPhysicalMaterial({
    map: albedo, metalness: 1, roughness: .5, roughnessMap: relief.map, normalMap: relief.normalMap,
    normalScale: new Vector2(1, 1), clearcoat: .2, clearcoatRoughness: .1,
  }), { kind: "brushed", frequency: 220, strength: .00008, roughnessVariation: .15, flow: [1, 0, 0] }));
  const front = face(obverse), back = face(reverse);
  const top = res.own(coinHalf(true, 140)), bottom = res.own(coinHalf(false, 140));
  return {
    metal,
    coin(x: number, y: number, z: number, rx: number, ry: number, rz: number, name: string, scale = 1) {
      const c = new Group();
      const a = new Mesh(top, front), b = new Mesh(bottom, back);
      for (const mesh of [a, b]) { mesh.castShadow = true; mesh.receiveShadow = true; c.add(mesh); }
      c.position.set(x, y, z); c.rotation.set(rx, ry, rz); c.scale.setScalar(scale);
      group.add(res.name(c, name));
      return c;
    },
  };
}

/** Proof coins: satin fields, frosted relief, bead rim and reeded edge; stacked and leaning. */
export function createCoinStack(options: CoinOptions = {}): HeroAsset {
  const res = createAssetResources();
  const group = new Group();
  group.name = options.id ?? "coin-stack";
  const count = Math.max(1, Math.min(24, Math.round(options.count ?? 7)));
  const factory = createCoinFactory(res, group, options);
  const metal = factory.metal;
  const coin = factory.coin;
  const random = seededRandom(17);
  const stackCount = Math.max(1, count - 2);
  const stack = { x: -.55, z: -.35 }, T = COIN_SIZE.thickness, R = COIN_SIZE.radius;
  for (let i = 0; i < stackCount; i++)
    coin(stack.x + (random() - .5) * .05, T * (i + .5), stack.z + (random() - .5) * .05, 0, random() * Math.PI * 2, 0, `coin-stacked-${i + 1}`);
  const stackTop = T * stackCount;
  if (count > 2) {
    // Lean a coin against the stack's top rim: its face plane passes through
    // the rim corner and its lower edge rests on the ground (no interpenetration).
    const tilt = Math.atan2(.9 * R, Math.max(stackTop, .2)) > 1.2 ? 1.2 : .42;
    const base = stack.x + R + stackTop * Math.tan(tilt);
    const cx = base - R * Math.sin(tilt) + T / 2 * Math.cos(tilt), cy = R * Math.cos(tilt) + T / 2 * Math.sin(tilt);
    coin(cx, cy, stack.z, 0, 0, -(Math.PI / 2 - tilt), "coin-leaning-edge");
  }
  if (count > 1) coin(.45, T / 2, 1.6, 0, .6, 0, "coin-flat-obverse");
  const height = Math.max(stackTop, 1.95);
  const coins = group.children.slice();
  const rest = captureRest(coins);
  const flat = group.getObjectByName("coin-flat-obverse");
  const pose = (state: HeroActionState) => {
    rest.restore();
    if (!state.id) return;
    const spec = findAction(COIN_ACTIONS, state.id), t = actionTime(spec, state.frame, state.fps);
    if (spec.id === "drop") {
      // Coins fall one after another, tumbling, and settle with a metallic bounce.
      coins.forEach((c, i) => {
        const r = rest.of(c), u = (t - i * (.8 / coins.length)) / .28;
        if (u <= 0) { c.visible = false; return; }
        c.position.y = r.position.y + dropBounce(u, .62, 2.6, .12);
        const tumble = (1 - smooth(u / .62)) * (2.5 + i);
        rotateLocal(c, r.quaternion, tumble, tumble * .4, 0);
      });
    } else if (flat) {
      // Euler's disk: spins on its rim, the tilt decays while precession speeds up, then it settles flat.
      const r = rest.of(flat), settle = .86;
      const tilt = t < settle ? 1.3 * Math.pow(1 - t / settle, .75) : .03 * Math.exp(-(t - settle) * 40) * Math.sin((t - settle) * 160);
      const precession = 7 * t + 26 * t * t * t;
      flat.quaternion.setFromEuler(new Euler(tilt, precession, 0, "YXZ"));
      flat.position.set(r.position.x, Math.sin(Math.abs(tilt)) * COIN_SIZE.radius + Math.cos(tilt) * T / 2, r.position.z);
    }
  };
  return {
    metersPerUnit: .013, actions: COIN_ACTIONS, pose,
    id: group.name, group, parts: res.parts, tier: "hero",
    bounds: { min: [-1.6, 0, -1.4], max: [1.5, height + .05, 2.65] },
    studio: { palette: "midnight", keyAzimuth: -45 },
    craft: {
      materials: [`${metal} proof finish: mirror field, frosted relief`],
      details: ["lathe-turned raised rim and recessed field", "140 reeds cut into the edge", "bead ring, curved legend and laurel sprays",
        "temple obverse / numeral reverse", "SPECIMEN legend; no real coin design"],
    },
    dispose: res.dispose,
  };
}

// ------------------------------------------------------------------ gold bars

const BAR = { length: 2.3, width: 1.04, height: .44, taper: .16 } as const;

const barStamp: Painter = (ctx, w, h) => {
  // UV covers the bar's top face projected on XZ; device stays inside the cartouche.
  ctx.fillStyle = "#808080"; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#e8e8e8"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const cx = w / 2, cy = h / 2;
  ctx.font = `700 ${Math.round(h * .085)}px ${SERIF}`; spaced(ctx, `${Math.round(h * .012)}px`);
  ctx.fillText("FINE GOLD", cx, cy - h * .12);
  ctx.font = `700 ${Math.round(h * .11)}px ${SERIF}`; spaced(ctx, `${Math.round(h * .006)}px`);
  ctx.fillText("999.9", cx, cy + h * .01);
  ctx.font = `600 ${Math.round(h * .06)}px ${SERIF}`;
  ctx.fillText("1 KG · SPECIMEN", cx, cy + h * .12);
  ctx.font = `600 ${Math.round(h * .045)}px "Courier New", monospace`;
  ctx.fillText("KU 048213", cx, cy + h * .2);
  ctx.filter = "blur(1.2px)"; ctx.drawImage(ctx.canvas, 0, 0); ctx.filter = "none";
};

export interface GoldBarOptions { id?: string; arrangement?: "single" | "pyramid" }

/** Cast gold bars: trapezoidal ingot with soft cast edges and a struck cartouche. */
export function createGoldBars(options: GoldBarOptions = {}): HeroAsset {
  const res = createAssetResources();
  const group = new Group();
  group.name = options.id ?? "gold-bars";
  const { length: L, width: W, height: H, taper } = BAR;
  const mesh = meshSdfCached("gold-bar", () => {
    const ingot = roundBox([0, H / 2, 0], [L / 2, H / 2, W / 2], .07, { taper });
    // Struck cartouche: shallow recess in the top face.
    return smoothSubtract(.012, ingot, roundBox([0, H + .006, 0], [L * .31, .022, W * .3], .03));
  }, { min: [-L / 2 - .05, -.03, -W / 2 - .05], max: [L / 2 + .05, H + .05, W / 2 + .05], cellSize: .0105, occlusionDistance: .08 });
  const geometry = res.own(sculptGeometry(mesh, sculptFinishShading("gold"), {
    planarUv: { axis: "y", min: [-L * .36, W * .36], size: [L * .72, -W * .72] },
  }));
  const stamp = paintWithRelief(1024, 512, barStamp, { color: "data", strength: 2.4, seed: 8, fallback: [128, 128, 128, 255] });
  res.own(stamp.map); res.own(stamp.normalMap);
  const material = res.own(createSculptMaterial("gold", { detail: "hammered", detailFrequency: 16, detailStrength: .0005 }));
  material.normalMap = stamp.normalMap;
  material.normalScale.set(.8, .8);
  material.roughness = .22;
  const arrangement = options.arrangement ?? "pyramid";
  const placements: Array<[number, number, number, number]> = arrangement === "single" ? [[0, 0, 0, 0]] : [
    [-W * 1.08, 0, 0, Math.PI / 2], [0, 0, 0, Math.PI / 2], [W * 1.08, 0, 0, Math.PI / 2],
    [-W * .54, H + .004, 0, Math.PI / 2], [W * .54, H + .004, 0, Math.PI / 2],
    [0, (H + .004) * 2, 0, Math.PI / 2],
  ];
  placements.forEach(([x, y, z, yaw], i) => {
    const bar = new Mesh(geometry, material);
    bar.position.set(x, y, z); bar.rotation.y = yaw + (i % 2 ? .015 : -.01);
    bar.castShadow = true; bar.receiveShadow = true;
    group.add(res.name(bar, `gold-bar-${i + 1}`));
  });
  const single = arrangement === "single";
  const bars = group.children.slice();
  const rest = captureRest(bars);
  const actions: readonly HeroActionSpec[] = [
    { id: "stack", label: "Stack bars", durationFrames: 72, loop: false, meaning: "Reserves build up: bars land layer by layer." },
  ];
  return {
    metersPerUnit: .05, actions,
    pose(state: HeroActionState) {
      rest.restore();
      if (!state.id) return;
      const t = actionTime(findAction(actions, state.id), state.frame, state.fps);
      bars.forEach((bar, i) => {
        const r = rest.of(bar), u = (t - i * (.75 / bars.length)) / .3;
        if (u <= 0) { bar.visible = false; return; }
        // Heavy metal: short fall, tiny bounce, slight settling rotation.
        bar.position.y = r.position.y + dropBounce(u, .7, 1.6, .04);
        rotateLocal(bar, r.quaternion, 0, (1 - smooth(u / .7)) * .35, 0);
      });
    },
    id: group.name, group, parts: res.parts, tier: "hero",
    bounds: single ? { min: [-L / 2, 0, -W / 2], max: [L / 2, H + .02, W / 2] }
      : { min: [-W * 1.65, 0, -L / 2], max: [W * 1.65, H * 3 + .02, L / 2] },
    studio: { palette: "midnight", keyAzimuth: -35 },
    craft: {
      materials: ["cast fine gold: high-albedo metal, softly hammered surface, darker recesses"],
      details: ["trapezoidal cast ingot with rounded mould edges", "struck recessed cartouche", "stamped fineness, weight and serial (SPECIMEN)"],
    },
    dispose: res.dispose,
  };
}
