/**
 * ANAT1 skin texture by region: skin is not smooth. Its surface is a network of furrows (primary lines crossing
 * secondary lines into small triangles and rhombi peculiar to each region), pores where the follicles open, fine
 * wrinkles where the skin folds (the forehead, round the eyes, the neck, over the knuckles), papillary ridges on the
 * palms and fingertips, fine vellus hairs, oil sheen in the T-zone, and, on some people, freckles and moles.
 *
 * - `SKIN_REGIONS`: each region's pore density and size, furrow network (cell size, depth, direction), wrinkles,
 *   ridges, vellus hair, sheen and redness, with sources and grades (`SKIN_EVIDENCE`).
 * - `skinSurface(region, x, y, opts)`: the height (mm) of the skin's microrelief at a point (mm on the surface), and
 *   how much it darkens or reddens the skin there. Age makes furrows fewer, wider and deeper, and wrinkles stronger
 *   (Lagarde et al.; replica studies of the forearm and crow's feet). Detail finer than `footprint` (the size of a
 *   pixel on the skin, mm) is faded out rather than aliased.
 * - `skinNormal(...)`: the bent normal from that height, for shading.
 *
 * Construction for any style; the numbers are graded in docs/research/skin-texture-2026-11-16.md.
 */

export interface SkinRegionSpec {
  id: string; label: string;
  /** Visible pores per cm² and their mean diameter (mm); 0 where none show. */
  pores: number; poreSize: number;
  /** The furrow network: its cell (mm), depth (mm), how strongly it runs one way (0 polygons … 1 parallel lines) and that way (degrees, 0 = across). */
  cell: number; depth: number; anisotropy: number; angle: number;
  /** Fine wrinkles: spacing and depth (mm) at 50 years, and direction (degrees, 0 = across). */
  wrinkles?: { spacing: number; depth: number; angle: number; fromBirth?: boolean };
  /** Papillary ridges (palms and fingertips): spacing (mm). */
  ridges?: number;
  /** Vellus hairs per cm². */
  vellus: number;
  /** Oil sheen (specular multiplier) and redness (0–1). */
  sheen: number; redness: number;
  note: string;
}

/**
 * Skin regions. Pores, follicles and ridges are reported; cell sizes, depths and wrinkle spacings are estimated from
 * replica photographs (the reference board's skin close-ups) within the reported patterns.
 */
export const SKIN_REGIONS: readonly SkinRegionSpec[] = [
  { id: "forehead", label: "Forehead", pores: 55, poreSize: 0.3, cell: 0.5, depth: 0.022, anisotropy: 0.25, angle: 0, wrinkles: { spacing: 7, depth: 0.12, angle: 0 }, vellus: 439, sheen: 1.35, redness: 0.05, note: "Large pores and an oily sheen (the T-zone); horizontal lines appear with age where the brows lift." },
  { id: "nose", label: "Nose", pores: 80, poreSize: 0.38, cell: 0.45, depth: 0.013, anisotropy: 0, angle: 0, vellus: 300, sheen: 1.55, redness: 0.18, note: "The largest and most visible pores, the oiliest skin, often a little red at the tip and wings." },
  { id: "cheek", label: "Cheek", pores: 40, poreSize: 0.28, cell: 0.5, depth: 0.03, anisotropy: 0.1, angle: 0, vellus: 250, sheen: 1, redness: 0.16, note: "Pores of 0.2–0.5 mm at 10–80 per cm² (Flament et al. 2015); a polygonal network; a flush." },
  { id: "chin", label: "Chin", pores: 50, poreSize: 0.3, cell: 0.5, depth: 0.022, anisotropy: 0, angle: 0, vellus: 250, sheen: 1.2, redness: 0.08, note: "Pores like the nose's but fewer; a fine dimpled texture over the mentalis." },
  { id: "eyelid", label: "Eyelids", pores: 0, poreSize: 0, cell: 0.3, depth: 0.025, anisotropy: 0.8, angle: 0, wrinkles: { spacing: 1.6, depth: 0.04, angle: 0 }, vellus: 100, sheen: 0.8, redness: 0.1, note: "The thinnest skin: no visible pores, a fine crêpe of lines along the lid." },
  { id: "crow", label: "Outer eye (crow's feet)", pores: 10, poreSize: 0.2, cell: 0.4, depth: 0.035, anisotropy: 0.5, angle: 0, wrinkles: { spacing: 3, depth: 0.1, angle: 90 }, vellus: 120, sheen: 0.9, redness: 0.05, note: "Lines fanning from the outer corner, deepening with age (the area's furrows deepen from the thirties)." },
  { id: "upper-lip", label: "Upper lip", pores: 30, poreSize: 0.22, cell: 0.45, depth: 0.03, anisotropy: 0.35, angle: 90, wrinkles: { spacing: 2.5, depth: 0.06, angle: 90 }, vellus: 350, sheen: 1, redness: 0.08, note: "Fine vertical lines above the lip with age; dense vellus hair." },
  { id: "neck", label: "Neck", pores: 10, poreSize: 0.18, cell: 0.6, depth: 0.045, anisotropy: 0.85, angle: 0, wrinkles: { spacing: 2.2, depth: 0.03, angle: 0 }, vellus: 80, sheen: 0.8, redness: 0.04, note: "Horizontal rings round the neck; a looser network." },
  { id: "back-of-hand", label: "Back of the hand", pores: 0, poreSize: 0, cell: 0.6, depth: 0.07, anisotropy: 0.2, angle: 30, vellus: 30, sheen: 0.9, redness: 0.04, note: "The classic triangle-and-rhombus network, deep and clear; deepening with age into crêpe." },
  { id: "knuckle", label: "Knuckles", pores: 0, poreSize: 0, cell: 0.55, depth: 0.075, anisotropy: 0.6, angle: 0, wrinkles: { spacing: 1.8, depth: 0.2, angle: 0, fromBirth: true }, vellus: 10, sheen: 0.8, redness: 0.12, note: "Concentric folds over the finger joints, rosier and darker than the skin round them." },
  { id: "palm", label: "Palm", pores: 0, poreSize: 0, cell: 1.6, depth: 0.012, anisotropy: 0.3, angle: 0, wrinkles: { spacing: 6, depth: 0.12, angle: 25, fromBirth: true }, ridges: 0.48, vellus: 0, sheen: 0.7, redness: 0.1, note: "Papillary ridges about half a millimetre apart, with flexion creases; no hair." },
  { id: "fingertip", label: "Fingertip", pores: 0, poreSize: 0, cell: 2, depth: 0.004, anisotropy: 0, angle: 0, ridges: 0.45, vellus: 0, sheen: 0.8, redness: 0.12, note: "Fingerprint ridges (about 0.45 mm apart) in whorls, loops and arches." },
  { id: "forearm", label: "Forearm", pores: 5, poreSize: 0.15, cell: 0.65, depth: 0.06, anisotropy: 0.3, angle: 0, vellus: 18, sheen: 0.85, redness: 0.03, note: "A polygonal network, its furrows fewer and deeper with age (forearm replica studies)." },
];
export const findSkinRegion = (id: string) => SKIN_REGIONS.find(r => r.id === id) ?? SKIN_REGIONS[2];

export const SKIN_EVIDENCE: readonly { id: string; grade: "reported" | "measured" | "estimated"; finding: string; source: string; url?: string }[] = [
  { id: "pores", grade: "reported", finding: "Cheek pores of 10–80 per cm² and 0.03–0.22 mm² on average (by ethnic group; a 250 µm detection threshold), covering 1–16% of the skin, in 2,585 women.", source: "Flament et al. 2015, Clin Cosmet Investig Dermatol 8:85–93", url: "https://www.dovepress.com/facial-skin-pores-a-multiethnic-study-peer-reviewed-fulltext-article-CCID" },
  { id: "pores-site", grade: "reported", finding: "Enlarged pores are more prominent on the nose and forehead than on the cheeks, and increase with age (434 polarised images).", source: "Jung et al. 2018, Skin Res Technol", url: "https://pubmed.ncbi.nlm.nih.gov/29393550/" },
  { id: "vellus", grade: "reported", finding: "Vellus hairs: 439 per cm² on the forehead against 85 per cm² on the back.", source: "Blume et al. 1991, Br J Dermatol" },
  { id: "follicles", grade: "reported", finding: "Hair follicle density is highest on the forehead and lowest on the calf (seven body sites).", source: "Otberg et al. 2004, J Invest Dermatol 122:14–19" },
  { id: "microrelief", grade: "reported", finding: "Primary and secondary furrows cross into triangles and rectangles peculiar to each skin region; with age the furrows grow fewer and deeper (forearm) and the crow's-feet surface roughens from the thirties.", source: "Skin replica profilometry and image analysis (J Soc Cosmet Chem)", url: "https://library.scconline.org/v038n03/2" },
  { id: "ridges", grade: "estimated", finding: "Papillary ridges on the palm and fingertips about 0.45–0.5 mm apart.", source: "Dermatoglyphics, the usual adult ridge breadth" },
];

// ---- The microrelief -----------------------------------------------------------------------------------------------------------

const hash = (a: number, b: number, s: number) => { const v = Math.sin(a * 127.1 + b * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v); };
const smooth = (t: number) => { const x = Math.min(1, Math.max(0, t)); return x * x * (3 - 2 * x); };
const vnoise = (x: number, y: number, s: number) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), w = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
};
/**
 * A family of grooves: long, nearly straight lines across `u` (spacing `s`, mm), each wandering a little, coming and
 * going along its length (`v`) and of its own strength. Returns the groove's depth fraction (0–1) at the point.
 * Grooves narrower than a pixel are widened to the pixel and made shallower, so they do not alias.
 */
function grooves(u: number, v: number, s: number, w: number, fp: number, sd: number, wander = 0.18, run = 3.5): number {
  return groovesD(u, v, s, w, fp, sd, wander, run)[0];
}
/** As `grooves`, also returning the distance (in spacings) to the nearest groove that is there, for domed plateaus. */
function groovesD(u: number, v: number, s: number, w: number, fp: number, sd: number, wander = 0.18, run = 3.5): [number, number] {
  const k0 = Math.floor(u / s), wEff = Math.max(w, fp * 0.7), amp = w / wEff;
  let best = 0, dn = 1;
  for (let k = k0 - 1; k <= k0 + 1; k++) {
    const off = (hash(k, 0, sd) - 0.5) * 0.7 * s, ph = hash(k, 1, sd) * 6.283;
    const wob = wander * s * Math.sin(v / (2.7 * s) + ph) + 0.4 * wander * s * Math.sin(v / (1.1 * s) + ph * 1.7);
    const d = u - (k + 0.5) * s - off - wob, on = smooth((vnoise(v / (run * s), k * 1.37, sd + 2) - 0.3) / 0.25);
    best = Math.max(best, on * (0.55 + 0.45 * hash(k, 2, sd)) * Math.exp(-(d * d) / (wEff * wEff)) * amp);
    if (on > 0.3) dn = Math.min(dn, Math.abs(d) / s);
  }
  return [best, dn];
}

export interface SkinSurfaceOptions {
  /** Age in years (default 30): furrows fewer, wider and deeper with age; wrinkles stronger. */
  age?: number;
  /** The size of one pixel on the skin, mm: detail finer than about two pixels fades out. */
  footprint?: number;
  seed?: number;
}
export interface SkinSample { height: number; darken: number; redden: number }

/** The skin's microrelief at a point (x, y in mm on the skin's surface) for a region (or a blend of regions). */
export function skinSurface(r: SkinRegionSpec, x: number, y: number, o: SkinSurfaceOptions = {}): SkinSample {
  const age = o.age ?? 30, fp = Math.max(1e-3, o.footprint ?? 0.05), s = o.seed ?? 1;
  const ageK = Math.max(0, (age - 25) / 40);
  // detail of size `scale` (mm) shows only where it spans more than about two pixels
  const vis = (scale: number) => smooth((scale / fp - 2) / 3);
  let h = 0, dark = 0, red = 0;
  // the furrow network: primary lines in three families about 60° apart crossing into triangles and rhombi (one
  // family stronger where the skin is anisotropic), and finer, shallower secondary lines between them; with age fewer,
  // wider and deeper
  const ang = (r.angle * Math.PI) / 180, cell = r.cell * (1 + 0.35 * ageK);
  // (primary lines 30–100 µm deep, secondary 5–40 µm, reported; with age the primaries deepen and the secondaries thin out)
  const fams: [number, number, number, number, number, number][] = [
    // [angle offset, spacing factor, depth factor, width (mm), seed, run (spacings a line runs before it breaks)]
    [0, 1, 1, 0.055 + 0.045 * ageK, 31, 2.2], [1.05 + 0.2 * (hash(1, 2, s) - 0.5), 1.1, 1 - 0.8 * r.anisotropy, 0.05 + 0.04 * ageK, 37, 2], [2.09 + 0.2 * (hash(3, 4, s) - 0.5), 1.2, 0.85 - 0.7 * r.anisotropy, 0.05 + 0.035 * ageK, 41, 1.8],
    [0.52, 0.42, 0.55 * (1 - 0.6 * ageK), 0.03, 43, 1.3], [1.57, 0.46, 0.5 * (1 - 0.6 * ageK), 0.03, 47, 1.2], [2.6, 0.5, 0.45 * (1 - 0.6 * ageK), 0.03, 53, 1.1],
  ];
  let dPlateau = 1;
  for (const [da, sf, df, w, sd, run] of fams) {
    const sp = cell * sf, vk = vis(sp);
    if (vk <= 0 || df <= 0) continue;
    // (`angle` 0 = lines running across, as for wrinkles)
    const a2 = ang + Math.PI / 2 + da, u = x * Math.cos(a2) + y * Math.sin(a2), v = -x * Math.sin(a2) + y * Math.cos(a2);
    const [fur, dn] = groovesD(u, v, sp, w, fp, s + sd, 0.4, run);
    h -= r.depth * df * (0.8 + 0.9 * ageK) * fur * vk;
    dark += 0.16 * df * fur * vk;
    if (df > 0.5) dPlateau = Math.min(dPlateau, dn * sf);
  }
  // the plateaus between the furrows are a little domed (each catches the light like a small cushion)
  if (vis(cell) > 0) { const q = Math.min(1, dPlateau * 1.8); h += r.depth * 0.9 * (1 + 0.5 * ageK) * (1 - (1 - q) * (1 - q)) * vis(cell); }
  // pores: a jittered grid at the region's density, each a small round dip, a little darker
  if (r.pores > 0) {
    // (pores are random dots, not periodic lines: they may show down to about a pixel without aliasing)
    const spacing = 10 / Math.sqrt(r.pores), size = r.poreSize * (1 + 0.3 * ageK), vk = smooth((size / fp - 0.7) / 1.6);
    if (vk > 0) {
      const gx = x / spacing, gy = y / spacing, xi = Math.floor(gx), yi = Math.floor(gy);
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
        const cx = (xi + i + 0.15 + 0.7 * hash(xi + i, yi + j, s + 5)) * spacing, cy = (yi + j + 0.15 + 0.7 * hash(xi + i, yi + j, s + 9)) * spacing;
        // a pit, a little oval, dark at its opening, with a soft rim
        const rad = (size / 2) * (0.6 + 0.8 * hash(xi + i, yi + j, s + 13)), d = Math.hypot((x - cx) * 1.15, (y - cy) * 0.9);
        if (d < rad * 2) { const q = d / rad, k = Math.exp(-q * q * 1.6); h -= 0.05 * k * vk - 0.008 * Math.exp(-((q - 1.3) ** 2) * 6) * vk; dark += 0.3 * k * vk; }
      }
    }
  }
  // fine wrinkles: irregular grooves along their direction (lines across `wrinkles.angle`), wandering, of uneven depth,
  // with shorter branches off them; deepening with age
  if (r.wrinkles && (age > 18 || r.wrinkles.fromBirth)) {
    const sp = r.wrinkles.spacing, vk = vis(sp * 0.3), strength = r.wrinkles.depth * (r.wrinkles.fromBirth ? 0.6 + 0.4 * Math.min(1.5, age / 50) : Math.min(1.6, Math.max(0, (age - 22) / 28)));
    if (vk > 0 && strength > 0) {
      const wa = (r.wrinkles.angle * Math.PI) / 180 + Math.PI / 2, w = Math.min(0.8, Math.max(0.12, sp * 0.09));
      const u = x * Math.cos(wa) + y * Math.sin(wa), v = -x * Math.sin(wa) + y * Math.cos(wa);
      const main = grooves(u, v, sp, w, fp, s + 21, 0.3), u2 = x * Math.cos(wa + 0.45) + y * Math.sin(wa + 0.45), v2 = -x * Math.sin(wa + 0.45) + y * Math.cos(wa + 0.45);
      const branch = 0.45 * grooves(u2, v2, sp * 1.6, w * 0.7, fp, s + 23, 0.35) * smooth((vnoise(x / (sp * 1.5), y / (sp * 1.5), s + 25) - 0.45) / 0.2);
      const fold = Math.max(main, branch);
      h -= strength * fold * vk;
      dark += 0.7 * strength * fold * vk;
    }
  }
  // papillary ridges (palms, fingertips): about 0.1 mm high, wavy and parallel; on a fingertip, loops round its centre
  if (r.ridges) {
    const vk = vis(r.ridges * 0.6);
    if (vk > 0) {
      // a phase that wanders with noise makes ridges end and fork (the minutiae), as in a print
      const warp = 1.4 * vnoise(x / 3, y / 3, s + 41) + 0.6 * vnoise(x / 1.3, y / 1.3, s + 43);
      const ph = r.id === "fingertip" ? Math.hypot(x * 0.95, (y - 0.09 * x * x + 1.5) * 1.3) + warp * 0.5 : y + 0.35 * x + warp * 0.45;
      const rid = Math.sin((ph / r.ridges) * 2 * Math.PI + 2.2 * (vnoise(x / 1.1, y / 1.1, s + 45) - 0.5));
      h += 0.05 * (rid - 1) * vk;
      dark += 0.05 * (1 - rid) * 0.5 * vk;
    }
  }
  red = r.redness;
  return { height: h, darken: Math.min(0.5, dark), redden: red };
}

/** The bent normal from the microrelief: (−∂h/∂x, −∂h/∂y) added to a surface normal's tangent plane (here the x–y plane). */
export function skinSlope(r: SkinRegionSpec, x: number, y: number, o: SkinSurfaceOptions = {}): [number, number] {
  const e = Math.max(0.02, (o.footprint ?? 0.05) * 0.5);
  const hx = (skinSurface(r, x + e, y, o).height - skinSurface(r, x - e, y, o).height) / (2 * e);
  const hy = (skinSurface(r, x, y + e, o).height - skinSurface(r, x, y - e, o).height) / (2 * e);
  return [-hx, -hy];
}

/** Blend regions by weight into one (pores, cells, depths, wrinkles, sheen and redness averaged). */
export function blendSkinRegions(parts: readonly { region: SkinRegionSpec; weight: number }[]): SkinRegionSpec {
  const tot = parts.reduce((a, p) => a + p.weight, 0) || 1, avg = (f: (r: SkinRegionSpec) => number) => parts.reduce((a, p) => a + f(p.region) * p.weight, 0) / tot;
  const wr = parts.filter(p => p.region.wrinkles && p.weight > 0.05).sort((a, b) => b.weight - a.weight)[0];
  return {
    id: "blend", label: "Blend", pores: avg(r => r.pores), poreSize: avg(r => r.poreSize), cell: avg(r => r.cell), depth: avg(r => r.depth), anisotropy: avg(r => r.anisotropy),
    angle: parts.slice().sort((a, b) => b.weight - a.weight)[0]?.region.angle ?? 0,
    wrinkles: wr ? { ...wr.region.wrinkles!, depth: wr.region.wrinkles!.depth * (wr.weight / tot) } : undefined,
    vellus: avg(r => r.vellus), sheen: avg(r => r.sheen), redness: avg(r => r.redness), note: "",
  };
}

// ---- Freckles and moles ----------------------------------------------------------------------------------------------------------

/**
 * Freckles at a point on the face (mm, front view): small tan spots over the nose and cheeks, densest across the
 * cheekbones, `amount` 0 … 1. Returns how much to darken toward the freckle colour (0–1).
 */
export function frecklesAt(x: number, y: number, amount: number, centre: { noseY: number; cheekY: number; halfWidth: number }, seed = 1): number {
  if (amount <= 0) return 0;
  // where the sun falls: across the nose bridge and the upper cheeks
  const band = Math.exp(-(((y - centre.cheekY) / 16) ** 2)) * smooth(1 - Math.abs(x) / (centre.halfWidth * 0.95));
  if (band < 0.02) return 0;
  // freckles are 1–4 mm across, irregular, of uneven strength, many and close together where the sun falls
  const spacing = 1.9 / Math.sqrt(amount), gx = x / spacing, gy = y / spacing, xi = Math.floor(gx), yi = Math.floor(gy);
  let f = 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    if (hash(xi + i, yi + j, seed + 61) > band * 0.9) continue;
    const cx = (xi + i + hash(xi + i, yi + j, seed + 63)) * spacing, cy = (yi + j + hash(xi + i, yi + j, seed + 67)) * spacing;
    const rad = 0.35 + 0.75 * hash(xi + i, yi + j, seed + 71) ** 2, ang = Math.atan2(y - cy, x - cx);
    const edge = rad * (0.75 + 0.35 * vnoise(Math.cos(ang) * 2 + i * 7, Math.sin(ang) * 2 + j * 5, seed + 79)), d = Math.hypot(x - cx, (y - cy) * 1.1);
    f = Math.max(f, (0.2 + 0.45 * hash(xi + i, yi + j, seed + 73)) * (1 - smooth((d - edge * 0.55) / (edge * 0.5))));
  }
  return f;
}

/**
 * Age spots (solar lentigines) after about 45: few, larger (3–10 mm) and flatter than freckles, on the temples,
 * cheeks and forehead. Returns how much to darken toward a tan-brown (0–1).
 */
export function ageSpotsAt(x: number, y: number, age: number, seed = 1): number {
  const k = smooth((age - 45) / 25);
  if (k <= 0) return 0;
  const spacing = 16, xi = Math.floor(x / spacing), yi = Math.floor(y / spacing);
  let f = 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    if (hash(xi + i, yi + j, seed + 81) > 0.18 * k) continue;
    const cx = (xi + i + hash(xi + i, yi + j, seed + 83)) * spacing, cy = (yi + j + hash(xi + i, yi + j, seed + 87)) * spacing;
    const rad = 1.5 + 3.5 * hash(xi + i, yi + j, seed + 89), ang = Math.atan2(y - cy, x - cx), edge = rad * (0.7 + 0.5 * vnoise(Math.cos(ang) * 2.5, Math.sin(ang) * 2.5, seed + 91 + i));
    f = Math.max(f, (0.12 + 0.12 * hash(xi + i, yi + j, seed + 93)) * k * (1 - smooth((Math.hypot(x - cx, y - cy) - edge * 0.4) / (edge * 0.7))));
  }
  return f;
}

/**
 * Age wrinkles on a face, as the depth (mm, negative) of the folds at a point (x, y in mm, front view): forehead
 * lines, the vertical lines between the brows, crow's feet fanning from the outer eye corners, lines under the eyes,
 * and rings round the neck (`neckY` and below). Nothing before about 25; deepening to about 0.25 mm by 70.
 */
export function faceWrinkles(x: number, y: number, age: number, f: { browY: number; hairlineY: number; eyeY: number; outerCorner: number; neckTop: number; alar?: [number, number]; mouth?: [number, number] }, seed = 1): number {
  const k = Math.min(1.4, Math.max(0, (age - 25) / 35));
  if (k <= 0) return 0;
  const line = (d: number, w: number) => Math.exp(-(d * d) / (w * w));
  let h = 0;
  // forehead: three or four wavy horizontal lines between the brows and the hairline, strongest in the middle
  if (y > f.browY + 6 && y < f.hairlineY - 4 && Math.abs(x) < 55) {
    const span = f.hairlineY - f.browY, t = (y - f.browY - 6) / Math.max(1, span - 10), wav = 1.2 * Math.sin(x / 18 + seed) + 0.6 * vnoise(x / 9, y / 6, seed + 3);
    const ph = ((y + wav - f.browY) / (span / 4.2)) * 2 * Math.PI, ln = Math.pow(Math.max(0, Math.cos(ph)), 10);
    h -= 0.16 * k * ln * smooth(1 - Math.abs(x) / 55) * smooth(t * 4) * smooth((1 - t) * 3) * (0.5 + 0.5 * vnoise(x / 14, y / 5, seed + 5));
  }
  // between the brows: two short vertical lines (the "11")
  if (y > f.browY - 6 && y < f.browY + 16 && Math.abs(x) < 9) h -= 0.14 * Math.max(0, k - 0.15) * line(Math.abs(x) - 4, 0.6) * smooth((y - f.browY + 6) / 6) * smooth((f.browY + 16 - y) / 6);
  // crow's feet: four or five lines fanning from just beyond each outer eye corner
  for (const sg of [-1, 1]) {
    const dx = sg * x - f.outerCorner - 4, dy = y - f.eyeY, r = Math.hypot(dx, dy);
    if (dx > -2 && r > 2 && r < 18) {
      const th = Math.atan2(dy, dx), fan = (th / 0.38 + 0.4 * vnoise(r / 5, th * 3, seed + 7 + sg)) % 1, ln = line(Math.min(Math.abs(fan), 1 - Math.abs(fan)) * 0.38 * r, 0.35);
      h -= 0.18 * k * ln * smooth((r - 2) / 3) * smooth((18 - r) / 6) * smooth(1 - Math.abs(th) / 1.1);
    }
  }
  // under the eyes: one or two soft arcs below the lower lid
  for (const sg of [-1, 1]) {
    const dx = sg * x - (f.outerCorner - 15), dy = y - (f.eyeY - 8 - 0.004 * dx * dx);
    if (Math.abs(dx) < 16) h -= 0.08 * k * line(dy, 0.8) * smooth(1 - Math.abs(dx) / 16);
  }
  // the nasolabial folds: from beside the nose wing down and out past the mouth corner; a soft groove when young,
  // a fold with age; then the marionette lines from the mouth corners down (after about 45)
  if (f.alar && f.mouth) {
    const kn = 0.25 + 0.75 * Math.min(1.4, Math.max(0, (age - 18) / 40));
    for (const sg of [-1, 1]) {
      const ax = f.alar[0] + 3, ay = f.alar[1] + 1, mx = f.mouth[0] + 5, my = f.mouth[1] - 6, X = sg * x;
      const tt = ((X - ax) * (mx - ax) + (y - ay) * (my - ay)) / ((mx - ax) ** 2 + (my - ay) ** 2), t = Math.min(1, Math.max(0, tt));
      // a groove with the cheek bulging over it on the outer side (a fold, not a drawn line); every part fades smoothly,
      // so no edge shows
      const bow = 2.5 * Math.sin(Math.PI * t), cxp = ax + (mx - ax) * t + bow, cyp = ay + (my - ay) * t, sd = X - cxp;
      const along = smooth(tt * 5) * smooth((1 - tt) * 4 + 0.3) * Math.exp(-((y - cyp) ** 2) / 400);
      // asymmetric: the cheek overhangs the fold on the outside (steep), the lip side slopes in gently
      const depth = 0.3 * kn * kn, groove = Math.exp(-(sd * sd) / (sd < 0 ? (3 + 1.5 * kn) : (0.9 + 0.5 * kn)) ** 2), bulge = sd > 0 ? Math.exp(-((sd - 4) ** 2) / 14) * smooth(sd / 3) : 0;
      h += depth * (0.4 * bulge - groove) * along;
      const km = Math.max(0, (age - 45) / 25);
      if (km > 0) { const dx = X - f.mouth[0] - 1, dy = y - f.mouth[1]; if (dy < 0 && dy > -20) h -= 0.14 * Math.min(1, km) * line(dx - 0.08 * dy, 0.9) * smooth(-dy / 3) * smooth((20 + dy) / 6); }
    }
  }
  // the neck: two or three horizontal lines below the jaw
  if (y < f.neckTop && y > f.neckTop - 70) { const ph = ((f.neckTop - y) / 22 + 0.25 * vnoise(x / 25, y / 12, seed + 11)) * 2 * Math.PI; h -= 0.12 * k * Math.pow(Math.max(0, Math.cos(ph)), 14) * smooth(1 - Math.abs(x) / 55) * smooth((f.neckTop - y) / 8); }
  return h;
}

// ---- Swatches -------------------------------------------------------------------------------------------------------------------

export interface SkinSwatchOptions {
  region: SkinRegionSpec | string;
  age?: number;
  /** Width of skin shown, mm (default 20). */
  sizeMm?: number;
  width?: number; height?: number;
  /** Skin colour (sRGB hex). */
  skin?: string;
  /** Light: azimuth (degrees from the top of the swatch) and elevation (degrees above the skin); a raking light shows relief. */
  light?: { azimuth: number; elevation: number };
  /** Freckles 0 … 1 (as on a face's cheek band). */
  freckles?: number;
  seed?: number;
}
export interface SkinSwatch { width: number; height: number; rgba: Uint8ClampedArray; ms: number }

const linOf = (h: string): [number, number, number] => { const c = (k: number) => { const v = parseInt(h.slice(1 + 2 * k, 3 + 2 * k), 16) / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return [c(0), c(1), c(2)]; };
const toSrgb = (v: number) => Math.round(255 * Math.min(1, Math.max(0, v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055)));
const blurCh = (src: Float32Array, w: number, h: number, sigma: number): Float32Array => {
  if (sigma < 0.3) return src.slice();
  const r = Math.ceil(sigma * 3), k: number[] = [];
  let ks = 0; for (let i = -r; i <= r; i++) { const v = Math.exp(-(i * i) / (2 * sigma * sigma)); k.push(v); ks += v; }
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0; for (let i = -r; i <= r; i++) s += src[y * w + Math.min(w - 1, Math.max(0, x + i))] * k[i + r]; tmp[y * w + x] = s / ks; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0; for (let i = -r; i <= r; i++) s += tmp[Math.min(h - 1, Math.max(0, y + i)) * w + x] * k[i + r]; out[y * w + x] = s / ks; }
  return out;
};

/**
 * A patch of a region's skin, lit by a raking light, as a macro photograph would show it: the microrelief, pores,
 * wrinkles, ridges and vellus hairs; light scattered under the skin softens the relief (red furthest, after the
 * d'Eon & Luebke skin profile's widths); an oily sheen by region.
 */
export function renderSkinSwatch(o: SkinSwatchOptions): SkinSwatch {
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const reg = typeof o.region === "string" ? findSkinRegion(o.region) : o.region, age = o.age ?? 30, seed = o.seed ?? 1;
  const W = Math.round(o.width ?? 320), H = Math.round(o.height ?? 240), size = o.sizeMm ?? 20, mmPx = size / W;
  const base = linOf(o.skin ?? "#d8a98a");
  const az = ((o.light?.azimuth ?? 35) * Math.PI) / 180, el = ((o.light?.elevation ?? 28) * Math.PI) / 180;
  const L: [number, number, number] = [Math.sin(az) * Math.cos(el), Math.cos(az) * Math.cos(el), Math.sin(el)];
  const so = { age, footprint: mmPx, seed };
  const hgt = new Float32Array((W + 1) * (H + 1)), dark = new Float32Array(W * H);
  for (let y = 0; y <= H; y++) for (let x = 0; x <= W; x++) {
    const s0 = skinSurface(reg, (x - W / 2) * mmPx, (H / 2 - y) * mmPx, so);
    hgt[y * (W + 1) + x] = s0.height;
    if (x < W && y < H) dark[y * W + x] = s0.darken;
  }
  // irradiance per channel, then a scattering blur (mm): red about 0.6 mm, green 0.25, blue 0.12 (estimated widths)
  const E = [new Float32Array(W * H), new Float32Array(W * H), new Float32Array(W * H)], spec = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, hx = (hgt[y * (W + 1) + x + 1] - hgt[y * (W + 1) + x]) / mmPx, hy = (hgt[y * (W + 1) + x] - hgt[(y + 1) * (W + 1) + x]) / mmPx;
    const nl = Math.hypot(hx, hy, 1), n: [number, number, number] = [-hx / nl, -hy / nl, 1 / nl], ndl = n[0] * L[0] + n[1] * L[1] + n[2] * L[2];
    const diff = Math.max(0, (ndl + 0.1) / 1.1), amb = 0.22 + 0.08 * n[2];
    for (let k = 0; k < 3; k++) E[k][i] = diff * 1.15 + amb;
    // specular: the oily sheen catches the light on the plateaus between furrows
    const hv = [L[0], L[1], L[2] + 1], hl = Math.hypot(hv[0], hv[1], hv[2]), ndh = Math.max(0, (n[0] * hv[0] + n[1] * hv[1] + n[2] * hv[2]) / hl);
    spec[i] = reg.sheen * (0.2 * Math.pow(ndh, 22) + 0.04 * Math.pow(ndh, 5)) * (1 - Math.min(1, dark[i] * 2.5));
  }
  // (the relief's shading softens under the skin, but only partly: part of the light is reflected and scattered near
  // the surface, which keeps the furrows crisp)
  const sig = [0.6, 0.25, 0.12].map(mm => mm / mmPx), Es = E.map((e, k) => { const b = blurCh(e, W, H, sig[k] * 0.6); return b.map((v, i) => v * 0.6 + e[i] * 0.4); });
  // vellus hairs: fine light hairs lying along the skin, catching the light
  const hairs = new Float32Array(W * H), nH = Math.round((reg.vellus * size * size * (H / W)) / 100), rnd = (k: number, q: number) => hash(k, q, seed + 101);
  for (let k = 0; k < nH; k++) {
    const x0 = rnd(k, 1) * W, y0 = rnd(k, 2) * H, len = (0.8 + 2.2 * rnd(k, 3)) / mmPx, a = 1.2 + 0.6 * (rnd(k, 4) - 0.5), wob = (rnd(k, 5) - 0.5) * 0.6;
    for (let q = 0; q <= len; q++) {
      const u = q / Math.max(1, len), x = Math.round(x0 + Math.cos(a + wob * u) * q), y = Math.round(y0 - Math.sin(a + wob * u) * q);
      if (x >= 0 && y >= 0 && x < W && y < H) hairs[y * W + x] = Math.max(hairs[y * W + x], 0.35 * (1 - u * 0.6));
    }
  }
  const out = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, sx = x * mmPx, sy = (H - y) * mmPx;
    const fr = o.freckles ? frecklesAt(sx - size / 2, sy + 30, o.freckles, { noseY: 0, cheekY: 30 + (H * mmPx) / 2, halfWidth: 60 }, seed) : 0;
    const spot = ageSpotsAt(sx * 3, sy * 3, age, seed) * 0.6, pig = Math.max(fr, spot);
    const red = reg.redness, d = dark[i];
    const alb = [base[0] * (1 - d * 0.8 + red * 0.08) * (1 - pig * 0.3), base[1] * (1 - d - red * 0.06) * (1 - pig * 0.42), base[2] * (1 - d * 1.05 - red * 0.08) * (1 - pig * 0.52)];
    for (let k = 0; k < 3; k++) {
      let v = alb[k] * Es[k][i] * 1.05 + spec[i];
      v = v * (1 - hairs[i]) + (alb[k] * 1.25 + 0.03) * Es[k][i] * hairs[i];
      out[i * 4 + k] = toSrgb(v / (1 + v * 0.18));
    }
    out[i * 4 + 3] = 255;
  }
  return { width: W, height: H, rgba: out, ms: (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0 };
}
