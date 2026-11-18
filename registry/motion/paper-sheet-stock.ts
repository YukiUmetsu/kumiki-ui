/**
 * Physical paper — stocks (registry item `paper-sheet`).
 *
 * A stock is the measurable material of a sheet: weight, thickness, stiffness along and across the grain,
 * opacity, whiteness, gloss and fibre length. Everything the sheet does follows from these numbers:
 *
 * - **Sag.** A sheet bends under its own weight over the elastogravity length ℓ = (D / q)^(1/3), where D is the
 *   plate bending stiffness and q the weight per area. Copy paper droops past about 6–9 cm, tissue past 3 cm,
 *   card stays flat past 14 cm.
 * - **Grain.** Fibres lie along the machine direction (MD), so a sheet is stiffer when it bends across the grain
 *   and folds more easily along it.
 * - **Light.** Diffuse transmittance follows from ISO 2471 opacity and pad reflectance by Kubelka–Munk theory. It
 *   sets how much light a lifted sheet lets through to its shadow, how much a back-lit sheet glows, and how much
 *   print shows through from the other side.
 * - **Edges.** Fibre length sets the width of the torn bevel and the length of the loose fibres along a tear.
 *
 * Values are typical published figures for each grade (see docs/component-specs/paper-sheet.md for the sources
 * and grades). Any field can be overridden.
 */

export interface PaperStock {
  /** Weight per area, g/m². */
  grammage: number;
  /** Thickness, µm. */
  caliper: number;
  /** Young's modulus along the grain (machine direction), GPa. */
  modulusMD: number;
  /** Young's modulus across the grain (cross direction), GPa. */
  modulusCD: number;
  /** ISO 2471 opacity (paper backing), 0–1. */
  opacity: number;
  /** Reflectance of an opaque pad of the stock (R∞), 0–1. */
  reflectance: number;
  /** Strength of the specular sheen, 0 (matte) to 1 (glossy coating). */
  gloss: number;
  /** Mean fibre length, mm. */
  fibre: number;
  /** Width of the torn bevel where the core shows, mm. */
  fringe: number;
  /** Colour of the core in torn edges and cut walls: `#rrggbb`, or `"dyed"` for the face colour. */
  core: string;
  /** Colour of the back: `#rrggbb`, or `"same"` for the face colour (coloured through, or printed both sides). */
  back: string;
  /** Smallest radius of a scored crease, µm. */
  creaseRadius: number;
}

export type PaperStockName =
  | "copy"
  | "newsprint"
  | "tissue"
  | "tracing"
  | "kami"
  | "washi"
  | "kraft"
  | "construction"
  | "cardstock"
  | "glossy"
  | "chipboard";

/**
 * Typical stocks. Grammage, caliper and opacity for copy, newsprint and tracing paper are published typical
 * values; the 80 g/m² moduli reproduce the measured resonance stiffness of office paper (MD 493, CD 160 µN·m);
 * kozo fibre length is the published 6–20 mm (mean 10 mm); wood pulp fibres are 1–3 mm.
 */
export const PAPER_STOCKS: Readonly<Record<PaperStockName, Readonly<PaperStock>>> = {
  copy: { grammage: 80, caliper: 105, modulusMD: 4.6, modulusCD: 1.5, opacity: 0.88, reflectance: 0.9, gloss: 0.04, fibre: 2, fringe: 0.8, core: "#f7f5ef", back: "same", creaseRadius: 150 },
  newsprint: { grammage: 45, caliper: 70, modulusMD: 4, modulusCD: 1.4, opacity: 0.92, reflectance: 0.62, gloss: 0.03, fibre: 1.5, fringe: 0.6, core: "dyed", back: "same", creaseRadius: 110 },
  tissue: { grammage: 17, caliper: 35, modulusMD: 1.6, modulusCD: 0.8, opacity: 0.55, reflectance: 0.85, gloss: 0.02, fibre: 2.5, fringe: 0.5, core: "dyed", back: "same", creaseRadius: 50 },
  tracing: { grammage: 90, caliper: 78, modulusMD: 7, modulusCD: 5, opacity: 0.33, reflectance: 0.85, gloss: 0.12, fibre: 1, fringe: 0.3, core: "#eef0ec", back: "same", creaseRadius: 120 },
  kami: { grammage: 70, caliper: 75, modulusMD: 4, modulusCD: 2, opacity: 0.86, reflectance: 0.88, gloss: 0.05, fibre: 1.5, fringe: 0.6, core: "#fbfaf6", back: "#fbfaf6", creaseRadius: 90 },
  washi: { grammage: 46, caliper: 115, modulusMD: 1.8, modulusCD: 1.2, opacity: 0.62, reflectance: 0.82, gloss: 0.02, fibre: 10, fringe: 2.5, core: "#f3eee2", back: "same", creaseRadius: 200 },
  kraft: { grammage: 90, caliper: 110, modulusMD: 6.5, modulusCD: 2.5, opacity: 0.98, reflectance: 0.35, gloss: 0.05, fibre: 3, fringe: 1, core: "dyed", back: "same", creaseRadius: 160 },
  construction: { grammage: 120, caliper: 190, modulusMD: 2.5, modulusCD: 1.2, opacity: 0.97, reflectance: 0.8, gloss: 0.02, fibre: 2, fringe: 1.1, core: "dyed", back: "same", creaseRadius: 250 },
  cardstock: { grammage: 270, caliper: 310, modulusMD: 4, modulusCD: 2, opacity: 0.99, reflectance: 0.88, gloss: 0.05, fibre: 2, fringe: 1, core: "#f8f6f0", back: "same", creaseRadius: 350 },
  glossy: { grammage: 230, caliper: 240, modulusMD: 5, modulusCD: 3.5, opacity: 0.99, reflectance: 0.92, gloss: 0.55, fibre: 1, fringe: 0.3, core: "#ffffff", back: "#f4f4f1", creaseRadius: 300 },
  chipboard: { grammage: 600, caliper: 1000, modulusMD: 2.5, modulusCD: 1.5, opacity: 1, reflectance: 0.55, gloss: 0.03, fibre: 1.5, fringe: 1.2, core: "#a59d90", back: "#a59d90", creaseRadius: 1200 },
};

export const PAPER_STOCK_NAMES = Object.keys(PAPER_STOCKS) as PaperStockName[];

/** A stock by name, a full stock, or a named stock with overrides. */
export type PaperStockInput = PaperStockName | PaperStock | ({ base: PaperStockName } & Partial<PaperStock>);

export function resolveStock(input: PaperStockInput | undefined, fallback: PaperStockName = "copy"): PaperStock {
  if (input === undefined) return { ...PAPER_STOCKS[fallback] };
  if (typeof input === "string") return { ...(PAPER_STOCKS[input] ?? PAPER_STOCKS[fallback]) };
  if ("base" in input) {
    const { base, ...rest } = input;
    return { ...(PAPER_STOCKS[base] ?? PAPER_STOCKS[fallback]), ...rest };
  }
  return { ...input };
}

const POISSON = 0.3;
const G = 9.81;

/**
 * Plate bending stiffness D = E t³ / 12(1 − ν²), N·m (per metre of width), for a bend whose curvature runs at
 * `angleToGrain` degrees from the machine direction. 0° bends across the grain (stiffest); 90° folds along it.
 */
export function paperBendingStiffness(stock: PaperStock, angleToGrain = 0): number {
  const a = (angleToGrain * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  // Orthotropic in-plane modulus in a rotated direction, shear coupling neglected.
  const modulus = 1 / ((c * c) / stock.modulusMD + (s * s) / stock.modulusCD);
  const t = stock.caliper * 1e-6;
  return (modulus * 1e9 * t * t * t) / (12 * (1 - POISSON * POISSON));
}

/** Weight per area, N/m². */
export function paperWeight(stock: PaperStock): number {
  return stock.grammage * 1e-3 * G;
}

/** Elastogravity length (D / q)^(1/3), metres: the length over which the sheet's own weight visibly bends it. */
export function paperGravityLength(stock: PaperStock, angleToGrain = 0): number {
  return Math.cbrt(paperBendingStiffness(stock, angleToGrain) / paperWeight(stock));
}

/**
 * Radius of the bend at a peel front, metres: R = √(D / 2Γ) for adhesion energy Γ (J/m²). Paste and glue
 * sticks are about 10–40 J/m², repositionable tape 20–60, permanent labels 100–300.
 */
export function paperPeelRadius(stock: PaperStock, adhesion: number, angleToGrain = 0): number {
  return Math.sqrt(paperBendingStiffness(stock, angleToGrain) / (2 * Math.max(adhesion, 1e-3)));
}

/**
 * Kubelka–Munk diffuse transmittance of one sheet from its opacity (R0 / R∞) and pad reflectance R∞:
 * a = (1/R∞ + R∞)/2, b = (1/R∞ − R∞)/2, T = √((a − R0)² − b²).
 */
export function paperTransmittance(stock: Pick<PaperStock, "opacity" | "reflectance">): number {
  const rInf = Math.min(0.999, Math.max(0.01, stock.reflectance));
  const r0 = Math.min(rInf, Math.max(0, stock.opacity) * rInf);
  const a = (1 / rInf + rInf) / 2;
  const b = (1 / rInf - rInf) / 2;
  const t2 = (a - r0) * (a - r0) - b * b;
  return t2 > 0 ? Math.min(1, Math.sqrt(t2)) : 0;
}

/** Problems with a stock, as messages (empty when valid). */
export function inspectStock(stock: PaperStock): string[] {
  const issues: string[] = [];
  const positive = (key: keyof PaperStock, max: number) => {
    const v = stock[key];
    if (typeof v !== "number" || !Number.isFinite(v) || v <= 0 || v > max) issues.push(`${key} must be a positive number up to ${max}`);
  };
  positive("grammage", 2000);
  positive("caliper", 5000);
  positive("modulusMD", 60);
  positive("modulusCD", 60);
  positive("fibre", 40);
  positive("creaseRadius", 20000);
  const unit = (key: keyof PaperStock) => {
    const v = stock[key];
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 1) issues.push(`${key} must be 0–1`);
  };
  unit("opacity");
  unit("reflectance");
  unit("gloss");
  if (typeof stock.fringe !== "number" || !Number.isFinite(stock.fringe) || stock.fringe < 0 || stock.fringe > 20) issues.push("fringe must be 0–20 mm");
  const hex = /^#[0-9a-f]{6}$/i;
  if (stock.core !== "dyed" && !hex.test(stock.core)) issues.push('core must be #rrggbb or "dyed"');
  if (stock.back !== "same" && !hex.test(stock.back)) issues.push('back must be #rrggbb or "same"');
  return issues;
}
