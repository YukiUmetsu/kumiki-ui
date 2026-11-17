/**
 * ARCH1 construction: measured front elevations of the building types in `arch-data.ts`, as parts any style can
 * paint (`buildingElevation`). Metres, y up, the ground at y = 0, the front centred on x = 0.
 *
 * Parts carry a role (wall, shade, roof, roof-line, window, glass, frame, door, timber, lattice, column, step, base,
 * bracket, plaster, beam, stone, brick-arch, iron, straw, tile-end, cast), so a painter chooses its own colours and textures.
 * `cast` parts are cast shadows, drawn as in architectural sciagraphy with the light from the upper left (a little
 * higher than the drafting convention's 45°): whatever stands out from a wall (an eave, a cornice, a sill, a window's
 * reveal) throws a shadow down and to the right in proportion to how far it projects. Dimensions are the type's, from the
 * human scale (doors about 2 m, storeys about 3 m), varied a little by the seed. Roofs are straight on houses and
 * curve only on temples and castle keeps (their eaves sag in the middle and lift at the corners).
 */
import { seeded } from "./foundation-shapes";
import type { FPoint } from "./foundation-shapes";
import { findBuildingType, HUMAN_SCALE } from "./arch-data";
import type { BuildingType } from "./arch-data";

export type PartRole = "wall" | "shade" | "roof" | "roof-line" | "window" | "glass" | "frame" | "door" | "timber" | "lattice" | "column" | "step" | "base" | "bracket" | "plaster" | "beam" | "cloth" | "ornament" | "cast" | "tile-end" | "stone" | "brick-arch" | "iron" | "straw";
export interface ElevationPart { role: PartRole; pts: FPoint[]; closed: boolean; width?: number; /** -1 … 1: the part's own shade (one stone among many). */ tone?: number }
export interface Elevation { type: BuildingType; width: number; height: number; parts: ElevationPart[]; dims: { label: string; y0: number; y1: number; x: number }[] }

export interface ElevationOptions { seed?: number; storeys?: number; bays?: number }

/** A measured front elevation of a building type. */
export function buildingElevation(typeId: string, o: ElevationOptions = {}): Elevation {
  const t = findBuildingType(typeId), rnd = seeded(o.seed ?? 1), jit = (a: number) => 1 + (rnd() - 0.5) * 2 * a;
  const parts: ElevationPart[] = [], dims: Elevation["dims"] = [];
  const rect = (role: PartRole, x0: number, y0: number, x1: number, y1: number) => parts.push({ role, closed: true, pts: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]] });
  const poly = (role: PartRole, pts: FPoint[], closed = true, width?: number) => parts.push({ role, pts, closed, width });
  const line = (role: PartRole, a: FPoint, b: FPoint, width = 0.06) => parts.push({ role, pts: [a, b], closed: false, width });
  const storeys = o.storeys ?? t.storeys, bays = o.bays ?? t.bays, bayW = t.bayWidth.typical * jit(0.04);
  const W = bays * bayW, H0 = t.storeyHeight.typical * jit(0.03), door = HUMAN_SCALE.doorHeight.typical;
  const pitch = (t.pitch.typical * Math.PI) / 180, eaves = t.eaves.typical;
  let top = 0;
  // the light: a shadow falls 0.75 of the projection down and 0.55 of it to the right
  const SUN_DY = 0.75, SUN_DX = 0.55;
  /** The shadow cast on the wall by an edge standing `d` in front of it, kept within the wall's x range. */
  const castBelow = (edge: FPoint[], d: number, xMin: number, xMax: number) => {
    const cl = (x: number) => Math.min(xMax, Math.max(xMin, x));
    parts.push({ role: "cast", closed: true, pts: [...edge.map(([x, y]) => [cl(x), y] as FPoint), ...edge.map(([x, y]) => [cl(x + d * SUN_DX), y - d * SUN_DY] as FPoint).reverse()] });
  };
  /** A recessed opening's own shadow: along its head and down its left jamb, the opening `r` deep. */
  const reveal = (x0: number, y0: number, x1: number, y1: number, r: number) =>
    parts.push({ role: "cast", closed: true, pts: [[x0, y1], [x1, y1], [x1, y1 - r * SUN_DY], [x0 + r * SUN_DX, y1 - r * SUN_DY], [x0 + r * SUN_DX, y0], [x0, y0]] });
  /** The round ends of the eave tiles (nokigawara) along a tiled eave, a tile's width (about 28 cm) apart. */
  const tileEnds = (edge: FPoint[], spacing = 0.28, r = 0.065) => {
    let acc = spacing / 2;
    for (let i = 1; i < edge.length; i++) {
      const [ax, ay] = edge[i - 1], [bx, by] = edge[i], L = Math.hypot(bx - ax, by - ay);
      for (; acc < L; acc += spacing) {
        const u = acc / L, cx = ax + (bx - ax) * u, cy = ay + (by - ay) * u - r * 0.3;
        parts.push({ role: "tile-end", closed: true, pts: Array.from({ length: 10 }, (_, k) => [cx + r * Math.cos((k / 10) * Math.PI * 2), cy + r * Math.sin((k / 10) * Math.PI * 2)] as FPoint) });
      }
      acc -= L;
    }
  };
  /** A window: frame, glass, glazing bars (a thicker meeting rail on a sash window), and its reveal's shadow. */
  const window = (cx: number, y0: number, w: number, h: number, panes: [number, number] = [2, 3], revealDepth = 0.1, sash = false) => {
    rect("frame", cx - w / 2 - 0.06, y0 - 0.06, cx + w / 2 + 0.06, y0 + h + 0.06);
    rect("glass", cx - w / 2, y0, cx + w / 2, y0 + h);
    for (let i = 1; i < panes[0]; i++) line("frame", [cx - w / 2 + (w * i) / panes[0], y0], [cx - w / 2 + (w * i) / panes[0], y0 + h], 0.03);
    for (let j = 1; j < panes[1]; j++) line("frame", [cx - w / 2, y0 + (h * j) / panes[1]], [cx + w / 2, y0 + (h * j) / panes[1]], sash && j === Math.ceil(panes[1] / 2) ? 0.06 : 0.03);
    reveal(cx - w / 2 - 0.06, y0 - 0.06, cx + w / 2 + 0.06, y0 + h + 0.06, revealDepth);
  };
  /** A round-arched opening (springing `hs` above `y0`) in a ring of wedge-shaped voussoirs with a keystone. */
  const arched = (cx: number, y0: number, w: number, hs: number, role: PartRole, ring = 0.26) => {
    const r = w / 2, P = (a: number, rr: number): FPoint => [cx + rr * Math.cos(a), y0 + hs + rr * Math.sin(a)];
    const arc = Array.from({ length: 17 }, (_, k) => P(Math.PI - (k / 16) * Math.PI, r));
    poly(role, [[cx - r, y0], ...arc, [cx + r, y0]]);
    // the opening's own shadow: down the left jamb and under the arch
    parts.push({ role: "cast", closed: true, pts: [[cx - r, y0], [cx - r, y0 + hs], ...arc, ...arc.map(([x, y]) => [Math.min(cx + r, x + 0.15 * SUN_DX), y - 0.15 * SUN_DY] as FPoint).reverse(), [cx - r + 0.15 * SUN_DX, y0]] });
    const nV = 9;
    for (let k = 0; k < nV; k++) {
      const a0 = Math.PI - (k / nV) * Math.PI - 0.012, a1 = Math.PI - ((k + 1) / nV) * Math.PI + 0.012, ro = r + ring + (k === (nV - 1) / 2 ? 0.08 : 0);
      parts.push({ role: "stone", closed: true, tone: 0.45, pts: [P(a0, r + 0.02), P(a0, ro), P(a1, ro), P(a1, r + 0.02)] });
    }
  };
  /** A roof band seen from the eaves side: eave line (curved if the type curves) up to the ridge. */
  const kawara = t.region === "Japan" && t.roof !== "thatch-hip";
  const roofBand = (x0: number, x1: number, yEave: number, run: number, hip: boolean, curve: number, overhang = eaves) => {
    const rise = run * Math.tan(pitch), n = 24, eave: FPoint[] = [];
    for (let k = 0; k <= n; k++) { const u = k / n, x = x0 + (x1 - x0) * u, e = (u * 2 - 1) ** 2; eave.push([x, yEave - curve * 0.25 * (1 - e) + curve * Math.pow(e, 3)]); }
    const inset = hip ? Math.min((x1 - x0) * 0.3, run) : 0;
    const ridge: FPoint[] = [[x1 - inset, yEave + rise], [x0 + inset, yEave + rise]];
    if (overhang > 0.05) castBelow(eave, overhang, x0 + overhang, x1 - overhang);
    poly("roof", [...eave, ...ridge]);
    poly("roof-line", eave, false, 0.12);
    if (kawara) tileEnds(eave);
    line("roof-line", ridge[0], ridge[1], 0.16);
    return yEave + rise;
  };
  /**
   * A hip-and-gable (irimoya) roof seen from its long side: eaves that sag in the middle and lift at the corners, a
   * concave (sori) lower hipped skirt up to the waist where the hips meet the gable, a steeper upper part, and a ridge
   * with raised end tiles (onigawara). Returns the ridge's height.
   */
  const irimoya = (x0: number, x1: number, yEave: number, height: number, lift: number, under: "rafters" | "plaster" | "none" = "none", overhang = 1.5) => {
    const n = 28, eave: FPoint[] = [];
    for (let k = 0; k <= n; k++) { const u = k / n, e = (u * 2 - 1) ** 2; eave.push([x0 + (x1 - x0) * u, yEave - 0.2 * lift * (1 - e) + lift * Math.pow(e, 4)]); }
    const w = x1 - x0, waistY = yEave + height * 0.5, ridgeY = yEave + height, inW = w * 0.15, rW = w * 0.34;
    const below = (dy: number) => eave.map(([x, y]) => [x, y - dy] as FPoint);
    // the deep eave's shadow over whatever is under it
    castBelow(below(under === "none" ? 0 : 0.5), overhang, x0 + overhang, x1 - overhang);
    if (under === "plaster") poly("plaster", [...eave, ...below(0.32).reverse()]);
    if (under === "rafters") {
      // two rows of rafter ends at the eave's edge: the base rafters (jidaruki) below, the flying rafters (hiendaruki) above
      poly("shade", [...eave, ...below(0.55).reverse()]);
      for (const [lo, hi, sz] of [[0.52, 0.33, 0.13], [0.28, 0.1, 0.11]] as const)
        for (let xr = x0 + 0.3; xr < x1 - 0.3; xr += 0.34) {
          const k = Math.min(n, Math.max(0, Math.round(((xr - x0) / w) * n))), ye = eave[k][1];
          rect("timber", xr - sz / 2, ye - lo, xr + sz / 2, ye - hi);
        }
    }
    // the hips rise concave from the lifted corners to the waist; the upper roof steeper to the ridge
    const side = (sgn: 1 | -1): FPoint[] => {
      const pts: FPoint[] = [], xc = (x0 + x1) / 2, xa = sgn < 0 ? x0 : x1, ya = eave[sgn < 0 ? 0 : n][1];
      for (let k = 1; k <= 10; k++) { const u = k / 10, curve = Math.pow(u, 0.62); pts.push([xa - sgn * inW * curve, ya + (waistY - ya) * u]); }
      for (let k = 1; k <= 8; k++) { const u = k / 8; pts.push([xa - sgn * (inW + (w / 2 - rW - inW) * u), waistY + (ridgeY - waistY) * Math.pow(u, 0.85)]); }
      void xc;
      return pts;
    };
    const left = side(-1), right = side(1);
    poly("roof", [...eave, ...right, ...left.reverse()]);
    // the waist line where the hipped skirt meets the gabled upper roof, the eave's thick edge, the ridge
    const xL = x0 + inW, xR = x1 - inW;
    line("roof-line", [xL, waistY], [xR, waistY], 0.1);
    poly("roof-line", eave, false, 0.22);
    tileEnds(eave);
    const rx0 = (x0 + x1) / 2 - rW, rx1 = (x0 + x1) / 2 + rW;
    rect("roof-line", rx0, ridgeY - 0.05, rx1, ridgeY + 0.45);
    // onigawara at the ridge ends, flaring up
    for (const [xe, sg] of [[rx0, -1], [rx1, 1]] as const) poly("roof-line", [[xe, ridgeY - 0.05], [xe + sg * 0.55, ridgeY + 0.15], [xe + sg * 0.75, ridgeY + 1.1], [xe + sg * 0.2, ridgeY + 0.9], [xe - sg * 0.15, ridgeY + 0.45]]);
    // tile ribs down the slope, following the curve
    for (let k = 1; k < 24; k++) { const u = k / 24, xb = x0 + w * u, e = (u * 2 - 1) ** 2, yb = yEave - 0.2 * lift * (1 - e) + lift * Math.pow(e, 4), xt = (x0 + x1) / 2 + (xb - (x0 + x1) / 2) * 0.62; line("shade", [xb, yb + 0.15], [xt, waistY - 0.05], 0.04); }
    return ridgeY + 1.1;
  };
  switch (t.id) {
    case "machiya": {
      const h1 = H0, h2 = 1.8 * jit(0.05);
      rect("wall", -W / 2, 0, W / 2, h1); rect("plaster", -W / 2, h1, W / 2, h1 + h2);
      // the ground floor: a lattice (kōshi) front, the door with a noren curtain
      const dx = -W / 2 + bayW * 0.5;
      rect("door", dx - 0.45, 0, dx + 0.45, door * 0.95); rect("cloth", dx - 0.45, door * 0.95 - 0.75, dx + 0.45, door * 0.95);
      rect("lattice", dx + 0.55, 0.45, W / 2 - 0.15, h1 - 0.35);
      for (let x = dx + 0.6; x < W / 2 - 0.15; x += 0.075) line("timber", [x, 0.45], [x, h1 - 0.35], 0.03);
      rect("timber", dx + 0.55, 0.25, W / 2 - 0.15, 0.45);
      reveal(dx + 0.55, 0.45, W / 2 - 0.15, h1 - 0.35, 0.08);
      // an inuyarai: split bamboo bowed out from the foot of the wall, under the lattice
      for (let x = dx + 0.62; x < W / 2 - 0.2; x += 0.05) line("ornament", [x, 0.02], [x + 0.012, 0.4], 0.028);
      line("timber", [dx + 0.58, 0.4], [W / 2 - 0.18, 0.4], 0.05);
      // a pent eave (hisashi) over the ground floor, then the low upper storey with clay-slatted mushiko windows
      roofBand(-W / 2 - eaves, W / 2 + eaves, h1 + 0.05, 1.1, false, 0);
      // mushiko-mado: long low openings with rounded ends, filled with plastered slats; two across a wider front
      const mh = 0.58, my = h1 + 0.62, nM = W > 4.5 ? 2 : 1, mgap = 0.45, mw = (W * 0.8 - mgap * (nM - 1)) / nM, r = mh / 2;
      for (let q = 0; q < nM; q++) {
        const mx0 = -W * 0.4 + q * (mw + mgap), cyM = my + r, st: FPoint[] = [];
        for (let k = 0; k <= 12; k++) { const a = Math.PI / 2 + (k / 12) * Math.PI; st.push([mx0 + r + r * Math.cos(a), cyM + r * Math.sin(a)]); }
        for (let k = 0; k <= 12; k++) { const a = -Math.PI / 2 + (k / 12) * Math.PI; st.push([mx0 + mw - r + r * Math.cos(a), cyM + r * Math.sin(a)]); }
        poly("shade", st);
        for (let x = mx0 + 0.06; x < mx0 + mw - 0.06; x += 0.12) {
          const fromEnd = Math.min(x + 0.03 - mx0, mx0 + mw - x - 0.03), hh = fromEnd < r ? Math.sqrt(Math.max(0, r * r - (r - fromEnd) ** 2)) : r;
          rect("plaster", x, cyM - hh * 0.9, x + 0.055, cyM + hh * 0.9);
        }
        poly("roof-line", [...st, st[0]], false, 0.035);
      }
      // udatsu: plastered fire walls at the party walls, each with its own small tiled cap
      for (const sg of [-1, 1]) {
        const xa = sg * (W / 2 - 0.02), xb = sg * (W / 2 + 0.28), yb = h1 + 0.35, yt = h1 + h2 - 0.15;
        rect("plaster", Math.min(xa, xb), yb, Math.max(xa, xb), yt);
        poly("roof", [[Math.min(xa, xb) - 0.12, yt], [Math.max(xa, xb) + 0.12, yt], [Math.max(xa, xb) - 0.02, yt + 0.28], [Math.min(xa, xb) + 0.02, yt + 0.28]]);
        line("roof-line", [Math.min(xa, xb) - 0.12, yt], [Math.max(xa, xb) + 0.12, yt], 0.06);
      }
      top = roofBand(-W / 2 - eaves, W / 2 + eaves, h1 + h2, 2.2, false, 0);
      dims.push({ label: `ground floor ${h1.toFixed(1)} m`, y0: 0, y1: h1, x: W / 2 + eaves + 0.4 }, { label: `upper (mushiko) ${h2.toFixed(1)} m`, y0: h1, y1: h1 + h2, x: W / 2 + eaves + 0.4 });
      break;
    }
    case "castle-keep": {
      // A tenshu measured from a photograph of Himeji's main keep (CC0): above its stone base the keep is about as tall
      // as it is wide; storeys narrow slowly and then quickly (widths 1, 0.95, 0.86, 0.66 and 0.5 of the first); each
      // roof tier shows about two thirds of its wall's height, its corners lifted, its eaves plastered white beneath; a
      // curved kara-hafu over a lattice on the second roof, a pair of chidori-hafu on the third and one larger gable on
      // the fourth, the gables standing in front of the storey above; small windows in pairs; an irimoya top about one
      // and a half times its wall, with shachihoko. The ishigaki: large irregular stones in rough courses with long and
      // short corner stones by turns (sangi-zumi), upright at the top and curving out toward the foot.
      const baseH = 7.5 * jit(0.05), W0 = W + 0.4, flare = baseH * 0.28, bw = W0 / 2 + 0.3 + flare;
      const halfAt = (yy: number) => bw - flare * (1 - Math.pow(1 - yy / baseH, 1.7));
      const b: FPoint[] = [];
      for (let k = 0; k <= 16; k++) { const u = k / 16; b.push([-halfAt(baseH * u), baseH * u]); }
      poly("base", [...b, ...b.map(([x, y]) => [-x, y] as FPoint).reverse()]);
      for (let yy = 0, row = 0; yy < baseH - 0.1; row++) {
        const y0 = yy, y1 = Math.min(baseH, yy + 0.36 + 0.5 * rnd()), lo = -halfAt(y0), hi = halfAt(y0), lo1 = -halfAt(y1), hi1 = halfAt(y1);
        const at1 = (x: number) => lo1 + ((x - lo) / (hi - lo)) * (hi1 - lo1), corner = row % 2 === 0 ? 1.6 : 0.8;
        // each stone a rough block: its corners knocked off, its edges a little uneven
        const stone = (xa: number, xb: number, tone: number, la = 0, lb = 0) => {
          const j = (k = 1) => (rnd() - 0.5) * 0.08 * k, c = 0.03 + 0.035 * rnd(), g = 0.035;
          const bl: FPoint = [xa + g, y0 + g], br: FPoint = [xb - g, y0 + g], tr: FPoint = [at1(xb) + lb - g, y1 - g], tl: FPoint = [at1(xa) + la + g, y1 - g];
          const mid = (a: FPoint, b2: FPoint, k: number): FPoint => [(a[0] + b2[0]) / 2 + j(k), (a[1] + b2[1]) / 2 + j(k * 0.6)];
          parts.push({ role: "stone", closed: true, tone, pts: [
            [bl[0] + c, bl[1] + j(0.5)], mid(bl, br, 1), [br[0] - c, br[1] + j(0.5)], [br[0] + j(0.4), br[1] + c], mid(br, tr, 0.5), [tr[0] + j(0.4), tr[1] - c],
            [tr[0] - c, tr[1] + j(0.5)], mid(tr, tl, 1), [tl[0] + c, tl[1] + j(0.5)], [tl[0] + j(0.4), tl[1] - c], mid(tl, bl, 0.5), [bl[0] + j(0.4), bl[1] + c],
          ] });
        };
        stone(lo, lo + corner, 0.6); stone(hi - corner, hi, 0.6);
        // the joints between stones lean a little this way and that, as roughly shaped stones do
        for (let x = lo + corner, la = 0; x < hi - corner - 0.05;) {
          const xb = Math.min(hi - corner, x + 0.5 + 0.8 * rnd()), lb = xb >= hi - corner - 1e-9 ? 0 : (rnd() - 0.5) * 0.3;
          stone(x, xb, rnd() * 1.6 - 1, la, lb);
          x = xb; la = lb;
        }
        yy = y1;
      }
      const nSt = Math.max(3, storeys), profile = [1, 0.95, 0.86, 0.66, 0.5];
      const relW = (st: number) => { const u = (st / (nSt - 1)) * (profile.length - 1), i = Math.min(profile.length - 2, Math.floor(u)); return profile[i] + (profile[i + 1] - profile[i]) * (u - i); };
      const e = 1.5, karaW = (w: number) => Math.min(w * 0.46, 8);
      let y = baseH, w = W0, pending: (() => void)[] = [];
      for (let st = 0; st < nSt; st++) {
        const last = st === nSt - 1, sh = H0 * 0.6;
        w = W0 * relW(st);
        rect("plaster", -w / 2, y, w / 2, y + sh);
        if (st === 1) {
          // the lattice of the bay under the kara-hafu
          const lw = karaW(w) * 0.82;
          rect("window", -lw / 2, y + sh * 0.12, lw / 2, y + sh);
          for (let x = -lw / 2 + 0.05; x < lw / 2 - 0.05; x += 0.15) rect("plaster", x, y + sh * 0.12, x + 0.08, y + sh);
        }
        // small windows in pairs, each with two bars
        const nPairs = Math.max(1, Math.round(w / 2.8));
        for (let k = 0; k < nPairs; k++) for (const dxw of [-0.3, 0.3]) {
          const cx = -w / 2 + (w * (k + 0.5)) / nPairs + dxw, ww = 0.42, wy = y + sh * 0.36, wh = sh * 0.34;
          if (st === 1 && Math.abs(cx) < karaW(w) * 0.41 + 0.3) continue;
          rect("window", cx - ww / 2, wy, cx + ww / 2, wy + wh);
          for (let q = 1; q < 3; q++) line("plaster", [cx - ww / 2 + (ww * q) / 3, wy], [cx - ww / 2 + (ww * q) / 3, wy + wh], 0.06);
          reveal(cx - ww / 2, wy, cx + ww / 2, wy + wh, 0.05);
        }
        // the gables of the roof below stand in front of this storey
        for (const f of pending) f();
        pending = [];
        const roofY = y + sh;
        if (last) { top = irimoya(-w / 2 - e, w / 2 + e, roofY + 0.1, sh * 1.5, 0.9, "plaster", e * 0.6); break; }
        // a skirt roof: corners lifted, the eave plastered white beneath, its shadow on the wall
        const n = 24, eave: FPoint[] = [];
        for (let k = 0; k <= n; k++) { const uu = k / n, ee = (uu * 2 - 1) ** 2; eave.push([-w / 2 - e + (w + 2 * e) * uu, roofY - 0.1 * (1 - ee) + 0.8 * Math.pow(ee, 5)]); }
        const soffit = eave.map(([x, yy]) => [x, yy - 0.3] as FPoint), vis = sh * 0.68;
        castBelow(soffit, e * 0.6, -w / 2, w / 2);
        poly("plaster", [...eave, ...soffit.slice().reverse()]);
        poly("roof", [...eave, [(w / 2) * 0.97, roofY + vis + 0.3], [(-w / 2) * 0.97, roofY + vis + 0.3]]);
        poly("roof-line", eave, false, 0.22);
        tileEnds(eave);
        // the hips: ridges of tiles from the lifted corners up to the storey above, each ending at its corner in a small onigawara
        for (const sg of [-1, 1]) {
          const [cx0, cy0] = eave[sg < 0 ? 0 : n];
          line("roof-line", [cx0, cy0], [(sg * w) / 2 * 0.97, roofY + vis + 0.3], 0.16);
          poly("roof-line", [[cx0, cy0], [cx0 + sg * 0.25, cy0 + 0.12], [cx0 + sg * 0.32, cy0 + 0.55], [cx0 + sg * 0.05, cy0 + 0.42], [cx0 - sg * 0.18, cy0 + 0.2]]);
        }
        const gy = roofY + 0.12, gw0 = w;
        // a chidori-hafu: a triangular gable on the roof face, its white face under tiled barge-boards that flick out at the foot
        const gable = (gx: number, gw: number) => pending.push(() => {
          const gh = gw * 0.42, t0 = 0.4, bb = 0.26;
          poly("plaster", [[gx - gw / 2, gy], [gx + gw / 2, gy], [gx, gy + gh]]);
          const L1: FPoint = [gx - gw / 2 - 0.55 + t0 * 1.6, gy - 0.12], A1: FPoint = [gx, gy + gh + 0.1 - t0 * 0.2], R1: FPoint = [gx + gw / 2 + 0.55 - t0 * 1.6, gy - 0.12];
          poly("roof", [[gx - gw / 2 - 0.55, gy - 0.12], [gx, gy + gh + t0 + 0.1], [gx + gw / 2 + 0.55, gy - 0.12], R1, A1, L1]);
          // the barge-boards, plastered white, under the tiles
          const L2: FPoint = [L1[0] + bb * 1.7, L1[1]], A2: FPoint = [gx, A1[1] - bb * 1.25], R2: FPoint = [R1[0] - bb * 1.7, R1[1]];
          poly("plaster", [L1, A1, R1, R2, A2, L2]);
          poly("roof-line", [L1, A1, R1], false, 0.07);
          poly("roof-line", [L2, A2, R2], false, 0.035);
          poly("roof-line", [[gx - gw / 2 - 0.75, gy - 0.02], [gx, gy + gh + t0 + 0.12], [gx + gw / 2 + 0.75, gy - 0.02]], false, 0.12);
          // a hanging ornament (gegyo) at the apex
          const ay2 = A2[1];
          poly("roof-line", [[gx - 0.2, ay2 + 0.05], [gx + 0.2, ay2 + 0.05], [gx + 0.12, ay2 - 0.36], [gx, ay2 - 0.26], [gx - 0.12, ay2 - 0.36]]);
        });
        if (st === 1) pending.push(() => {
          // a kara-hafu: the eave rising in a bell over the bay, a white barge-board under its tiled edge
          const kw = karaW(gw0), kh = 1.75, kp: FPoint[] = [];
          for (let k = 0; k <= 40; k++) {
            const u = (k / 40) * 2 - 1, arch = Math.pow((1 + Math.cos(Math.PI * u)) / 2, 1.15), flick = 0.2 * Math.pow(Math.max(0, Math.abs(u) - 0.8) / 0.2, 2);
            kp.push([(kw / 2) * u, gy - 0.1 + kh * arch + flick]);
          }
          const off = (dy: number) => kp.map(([x, yy]) => [x, yy + dy] as FPoint);
          poly("plaster", [...kp, [kw / 2, gy - 0.12], [-kw / 2, gy - 0.12]]);
          poly("roof", [...off(0.45), ...kp.slice().reverse()]);
          const board = kp.filter(([, yy]) => yy - gy > 0.45).map(([x, yy]) => [x, yy - 0.28] as FPoint);
          if (board.length > 1) poly("roof-line", board, false, 0.045);
          poly("roof-line", kp, false, 0.09);
          poly("roof-line", off(0.47), false, 0.12);
        });
        if (st === 2) { gable(-w * 0.24, Math.min(w * 0.34, 6)); gable(w * 0.24, Math.min(w * 0.34, 6)); }
        if (st === 3) gable(0, Math.min(w * 0.5, 7));
        dims.push({ label: `storey ${st + 1} ${sh.toFixed(1)} m`, y0: y, y1: y + sh, x: W / 2 + eaves + 1.5 });
        y = roofY + vis;
      }
      // shachihoko at the ridge ends: golden fish, tails up
      for (const sg of [-1, 1]) {
        const x0 = sg * (w + 2 * e) * 0.34, yb = top - 1.1;
        poly("ornament", [[x0, yb], [x0 + sg * 0.25, yb + 0.5], [x0 + sg * 0.1, yb + 1.1], [x0 - sg * 0.25, yb + 1.45], [x0 - sg * 0.05, yb + 0.95], [x0 - sg * 0.3, yb + 0.35]]);
      }
      top += 0.4;
      dims.push({ label: `ishigaki ${baseH.toFixed(1)} m`, y0: 0, y1: baseH, x: W / 2 + eaves + 1.5 });
      break;
    }
    case "japanese-temple": {
      const keep = false;
      // stone base: a raised plinth (temple) or a curving stone wall (keep)
      const baseH = keep ? 4.5 : 0.9;
      if (keep) { const b: FPoint[] = []; for (let k = 0; k <= 12; k++) { const u = k / 12; b.push([-W / 2 - 3 * Math.pow(1 - u, 2.2), baseH * u]); } poly("base", [...b, ...b.map(([x, y]) => [-x, y] as FPoint).reverse()]); }
      else {
        rect("base", -W / 2 - 1.2, 0, W / 2 + 1.2, baseH);
        // steps up the platform's front, in front of the middle bay
        for (let q = 0; q < 5; q++) rect("step", -1.7 + q * 0.04, (q * baseH) / 5, 1.7 - q * 0.04, ((q + 1) * baseH) / 5);
      }
      let y = baseH, w = W;
      for (let s = 0; s < storeys; s++) {
        const sh = s === 0 ? H0 : H0 * 0.82;
        rect("plaster", -w / 2, y, w / 2, y + sh);
        // columns and beams (temple) or plain plaster with small windows (keep)
        const nb = Math.max(2, Math.round(w / bayW));
        for (let k = 0; k <= nb; k++) { const x = -w / 2 + (w * k) / nb; rect(keep ? "timber" : "column", x - (keep ? 0.06 : 0.18), y, x + (keep ? 0.06 : 0.18), y + sh); }
        rect("beam", -w / 2, y + sh - 0.35, w / 2, y + sh);
        if (!keep) for (let k = 0; k < nb; k++) { const x0 = -w / 2 + (w * k) / nb; if (k === Math.floor(nb / 2)) rect("door", x0 + 0.35, y, x0 + w / nb - 0.35, y + sh * 0.78); }
        if (keep) for (let k = 0; k < nb; k++) { const cx = -w / 2 + (w * (k + 0.5)) / nb; rect("window", cx - 0.3, y + sh * 0.45, cx + 0.3, y + sh * 0.75); }
        // over the columns a band of white wall carrying a bracket set (tokyo) on each column: a bearing block, an
        // arm with three small blocks, a longer arm with three more, under the eave's beam
        if (!keep) {
          rect("plaster", -w / 2, y + sh, w / 2, y + sh + 0.95);
          for (let k = 0; k <= nb; k++) {
            const x = -w / 2 + (w * k) / nb, yb = y + sh;
            rect("bracket", x - 0.28, yb, x + 0.28, yb + 0.22);
            rect("bracket", x - 0.75, yb + 0.22, x + 0.75, yb + 0.36);
            for (const dxb of [-0.55, 0, 0.55]) rect("bracket", x + dxb - 0.13, yb + 0.36, x + dxb + 0.13, yb + 0.5);
            rect("bracket", x - 1.05, yb + 0.5, x + 1.05, yb + 0.64);
            for (const dxb of [-0.85, 0, 0.85]) rect("bracket", x + dxb - 0.13, yb + 0.64, x + dxb + 0.13, yb + 0.78);
          }
          rect("beam", -w / 2 - 0.3, y + sh + 0.78, w / 2 + 0.3, y + sh + 0.95);
        }
        const roofY = y + sh + (keep ? 0.1 : 0.95 + 0.55), e = keep ? eaves : eaves * 0.9;
        // a temple's roof is the building: taller than its walls, hip-and-gable, its corners lifting
        const ridge = keep ? roofBand(-w / 2 - e, w / 2 + e, roofY, s < storeys - 1 ? 1.4 : (w / 2) * 0.55, s === storeys - 1, 0.5) : irimoya(-w / 2 - e, w / 2 + e, roofY, sh * 1.1, 1.1, "rafters", e);
        y = keep && s < storeys - 1 ? roofY + 1.4 * Math.tan(pitch) * 0.6 : ridge;
        if (keep) w *= 0.8;
        top = Math.max(top, ridge);
        dims.push({ label: `${s === 0 ? "walls" : `storey ${s + 1}`} ${sh.toFixed(1)} m`, y0: roofY - (keep ? 0.1 : 1.5) - sh, y1: roofY - (keep ? 0.1 : 1.5), x: W / 2 + eaves + 1.5 });
        if (!keep) break;
      }
      break;
    }
    case "japanese-farmhouse": {
      // A thatched minka (after photographs of preserved farmhouses): low timber-framed walls on foundation stones; paper
      // shoji behind a narrow veranda (engawa) with a step stone on the living side, the earth-floored doma behind a wide
      // board door on the other; a thick hipped thatch whose cut edge shows at the eaves (about 0.8 m deep) and throws a
      // deep shadow over the walls; straw running down the slope; a ridge capped and tied with crossed bundles.
      const h1 = H0;
      rect("plaster", -W / 2, 0.45, W / 2, h1);
      // the dark space under the raised floor of the living rooms (the doma's floor is the earth itself)
      rect("shade", -W / 2, 0, -W / 2 + bayW * (bays - 1), 0.32);
      for (let k = 0; k <= bays; k++) {
        const x = -W / 2 + (W * k) / bays;
        parts.push({ role: "stone", closed: true, tone: rnd() - 0.5, pts: [[x - 0.24, 0], [x + 0.22, 0], [x + 0.17, 0.3], [x - 0.15, 0.33]] });
      }
      rect("timber", -W / 2, 0.32, W / 2, 0.45);
      // the doma's board door in the last bay, shoji in the others
      const dk = bays - 1, dx0 = -W / 2 + bayW * dk + 0.15, dx1 = W / 2 - 0.15;
      rect("door", dx0, 0.05, dx1, 0.05 + door);
      for (let x = dx0 + 0.3; x < dx1 - 0.05; x += 0.3) line("shade", [x, 0.05], [x, 0.05 + door], 0.015);
      reveal(dx0, 0.05, dx1, 0.05 + door, 0.12);
      for (let k = 0; k < dk; k++) {
        const xa = -W / 2 + bayW * k + 0.1, xb = -W / 2 + bayW * (k + 1) - 0.1;
        rect("plaster", xa, 0.55, xb, 2.3);
        for (let x = xa + 0.27; x < xb - 0.05; x += 0.27) line("timber", [x, 0.55], [x, 2.3], 0.02);
        for (let yy = 0.85; yy < 2.3; yy += 0.3) line("timber", [xa, yy], [xb, yy], 0.02);
        line("timber", [(xa + xb) / 2, 0.55], [(xa + xb) / 2, 2.3], 0.05);
        rect("timber", xa, 0.45, xb, 0.55);
      }
      for (let k = 0; k <= bays; k++) rect("timber", -W / 2 + (W * k) / bays - 0.08, 0.32, -W / 2 + (W * k) / bays + 0.08, h1);
      rect("beam", -W / 2, h1 - 0.3, W / 2, h1);
      // the engawa's boards and a step stone in front of them
      rect("timber", -W / 2 - 0.1, 0.4, -W / 2 + bayW * dk, 0.5);
      const sx0 = -W / 2 + bayW * 0.55;
      parts.push({ role: "stone", closed: true, tone: 0.35, pts: [[sx0, 0], [sx0 + 0.85, 0], [sx0 + 0.78, 0.2], [sx0 + 0.06, 0.24]] });
      // the thatch: its shadow over the walls, the slope, the cut edge at the eaves
      const yE = h1 - 0.2, thick = 0.8, xe0 = -W / 2 - eaves, xe1 = W / 2 + eaves, run = W * 0.42;
      castBelow([[xe0, yE - thick], [xe1, yE - thick]], eaves, -W / 2, W / 2);
      top = roofBand(xe0, xe1, yE, run, true, 0, 0);
      poly("straw", [[xe0 + 0.12, yE - thick], [xe1 - 0.12, yE - thick], [xe1, yE - thick + 0.18], [xe1 + 0.02, yE], [xe0 - 0.02, yE], [xe0, yE - thick + 0.18]]);
      line("roof-line", [xe0 + 0.12, yE - thick], [xe1 - 0.12, yE - thick], 0.03);
      // the ridge: a rolled cap of thatch held down by saddle bundles (umanori) astride it
      const inset = Math.min((xe1 - xe0) * 0.3, run), xr0 = xe0 + inset, xr1 = xe1 - inset;
      poly("straw", [[xr0 - 0.3, top - 0.2], [xr1 + 0.3, top - 0.2], [xr1 + 0.2, top + 0.3], [xr0 - 0.2, top + 0.3]]);
      for (let x = xr0 + 0.15; x <= xr1 - 0.1; x += 0.9) poly("timber", [[x - 0.17, top - 0.22], [x + 0.17, top - 0.22], [x + 0.12, top + 0.42], [x - 0.12, top + 0.42]]);
      top += 0.45;
      dims.push({ label: `walls ${h1.toFixed(1)} m; thatch about 0.8 m thick at the eaves`, y0: 0, y1: h1, x: W / 2 + eaves + 0.4 });
      break;
    }
    case "georgian-townhouse": {
      // After photographs of Bedford Square, London: dark stock brick; a flat arch of rubbed red brick over each window;
      // sashes of six over six panes (six over nine on the tall first floor, three over three in the attic) set back in
      // white frames; a stucco band at first-floor level; a panelled door under a semicircular fanlight, in a stone
      // surround, up three steps; iron railings along the area; a cornice and parapet, chimney stacks on the party walls.
      const hs = [H0 * 1.0, H0 * 1.15, H0 * 0.95, H0 * 0.8].slice(0, storeys), winH = [1.75, 2.35, 1.6, 1.05];
      const panes: [number, number][] = [[3, 4], [3, 5], [3, 4], [3, 2]], plinth = 0.6;
      const totalH = plinth + hs.reduce((a2, b2) => a2 + b2, 0), dX = -W / 2 + bayW * 0.5;
      rect("wall", -W / 2, 0, W / 2, totalH + 0.9);
      let y = plinth;
      hs.forEach((sh, s2) => {
        for (let k = 0; k < bays; k++) {
          const cx = -W / 2 + bayW * (k + 0.5);
          if (s2 === 0 && k === 0) {
            // the door: six panels, a semicircular fanlight with radiating bars, a stone surround; three steps up
            const dw = 1.0, dy = 0.45, fy = dy + door + 0.05;
            rect("plaster", cx - dw / 2 - 0.3, dy, cx + dw / 2 + 0.3, fy + dw / 2 + 0.3);
            castBelow([[cx - dw / 2 - 0.3, fy + dw / 2 + 0.3], [cx + dw / 2 + 0.3, fy + dw / 2 + 0.3]], 0.08, cx - dw / 2 - 0.3, cx + dw / 2 + 0.5);
            // engaged columns either side, under an entablature at the fanlight's springing
            for (const sx of [-1, 1]) { const px = cx + sx * (dw / 2 + 0.15); rect("frame", px - 0.1, dy, px + 0.1, fy - 0.12); rect("frame", px - 0.14, fy - 0.16, px + 0.14, fy - 0.06); }
            rect("frame", cx - dw / 2 - 0.3, fy - 0.06, cx + dw / 2 + 0.3, fy + 0.02);
            rect("door", cx - dw / 2, dy, cx + dw / 2, dy + door);
            for (let r2 = 0; r2 < 3; r2++) for (const sx of [-1, 1]) {
              const px = cx + sx * dw * 0.24, ph = (door - 0.36) / 3, py = dy + 0.18 + r2 * (ph + 0.0);
              rect("shade", px - dw * 0.17, py + 0.05, px + dw * 0.17, py + ph - 0.05);
            }
            const fan: FPoint[] = [];
            for (let q = 0; q <= 16; q++) { const a3 = Math.PI - (q / 16) * Math.PI; fan.push([cx + (dw / 2) * Math.cos(a3), fy + (dw / 2) * Math.sin(a3)]); }
            poly("glass", fan);
            for (let q = 1; q < 8; q++) { const a3 = Math.PI - (q / 8) * Math.PI; line("frame", [cx, fy], [cx + (dw / 2) * Math.cos(a3), fy + (dw / 2) * Math.sin(a3)], 0.025); }
            poly("frame", [...fan, fan[0]], false, 0.06);
            line("frame", [cx - dw / 2, fy], [cx + dw / 2, fy], 0.06);
            reveal(cx - dw / 2, dy, cx + dw / 2, dy + door, 0.15);
            for (let q = 0; q < 3; q++) rect("step", cx - dw / 2 - 0.45 + q * 0.06, q * 0.15, cx + dw / 2 + 0.45 - q * 0.06, (q + 1) * 0.15);
            continue;
          }
          const ww = Math.min(0.98, bayW * 0.5), wh = Math.min(winH[s2] ?? 1.4, ww * 2.4), wy = y + (s2 === 0 ? 0.65 : s2 === 1 ? 0.35 : 0.45);
          window(cx, wy, ww, wh, panes[s2] ?? [3, 4], 0.12, true);
          // the flat arch of rubbed red brick over the window, its joints fanning out
          const ah = 0.3, ax0 = cx - ww / 2 - 0.14, ax1 = cx + ww / 2 + 0.14, ay = wy + wh + 0.06;
          poly("brick-arch", [[ax0 + 0.04, ay], [ax1 - 0.04, ay], [ax1 + 0.04, ay + ah], [ax0 - 0.04, ay + ah]]);
          for (let q = 1; q < 11; q++) { const xb2 = ax0 + ((ax1 - ax0) * q) / 11, lean = (xb2 - cx) * 0.16; line("shade", [xb2, ay], [xb2 + lean, ay + ah], 0.012); }
          // a stone sill and its shadow
          rect("plaster", cx - ww / 2 - 0.1, wy - 0.16, cx + ww / 2 + 0.1, wy - 0.06);
          castBelow([[cx - ww / 2 - 0.1, wy - 0.16], [cx + ww / 2 + 0.1, wy - 0.16]], 0.07, cx - ww / 2 - 0.1, cx + ww / 2 + 0.2);
        }
        if (s2 === 1) {
          // the stucco band at first-floor level
          rect("plaster", -W / 2, y - 0.32, W / 2, y - 0.08);
          castBelow([[-W / 2, y - 0.32], [W / 2, y - 0.32]], 0.05, -W / 2, W / 2);
        }
        dims.push({ label: `${["ground", "first (piano nobile)", "second", "attic"][s2]} ${sh.toFixed(1)} m`, y0: y, y1: y + sh, x: W / 2 + 0.6 });
        y += sh;
      });
      // area railings: iron bars about a metre high with spear tops, open at the steps
      for (let x = -W / 2 + 0.08; x < W / 2; x += 0.13) {
        if (Math.abs(x - dX) < 1.0) continue;
        line("iron", [x, 0], [x, 1.0], 0.025);
        poly("iron", [[x - 0.035, 1.0], [x + 0.035, 1.0], [x, 1.12]]);
      }
      for (const [xa, xb] of [[-W / 2 + 0.04, dX - 1.0], [dX + 1.0, W / 2 - 0.04]]) if (xb > xa) { line("iron", [xa, 0.92], [xb, 0.92], 0.035); line("iron", [xa, 0.12], [xb, 0.12], 0.03); }
      // the cornice (with its shadow), the brick parapet with a coping that hides the roof, and chimney stacks with pots
      rect("plaster", -W / 2 - 0.15, totalH, W / 2 + 0.15, totalH + 0.25);
      castBelow([[-W / 2 - 0.15, totalH], [W / 2 + 0.15, totalH]], 0.2, -W / 2, W / 2);
      rect("wall", -W / 2, totalH + 0.25, W / 2, totalH + 0.9);
      rect("plaster", -W / 2 - 0.05, totalH + 0.9, W / 2 + 0.05, totalH + 1.0);
      const ch2 = 1.9;
      for (const sx of [-1, 1]) {
        const cx = sx * (W / 2 - 0.05), cw = 1.2;
        rect("wall", cx - cw / 2, totalH + 1.0, cx + cw / 2, totalH + 1.0 + ch2);
        rect("plaster", cx - cw / 2 - 0.06, totalH + 1.0 + ch2, cx + cw / 2 + 0.06, totalH + 1.12 + ch2);
        for (let q = 0; q < 4; q++) { const px = cx - cw / 2 + 0.21 + q * 0.26; poly("brick-arch", [[px - 0.075, totalH + 1.12 + ch2], [px + 0.075, totalH + 1.12 + ch2], [px + 0.055, totalH + 1.5 + ch2], [px + 0.07, totalH + 1.55 + ch2], [px - 0.07, totalH + 1.55 + ch2], [px - 0.055, totalH + 1.5 + ch2]]); }
      }
      top = totalH + 1.0 + ch2 + 0.55;
      break;
    }
    case "half-timbered": {
      // After timber-framed town houses (photographs studied for their framing, e.g. Stein am Rhein): a rendered stone
      // ground floor with dressed corner stones and a round-arched door; above it timber-framed storeys, each jettied
      // about 0.3 m out on joist ends whose shadow falls on the wall below; in each storey a sill beam, a breast rail and
      // a head rail between posts about 1.1 m apart; ribbon windows of small panes over panels braced by St Andrew's
      // crosses and diamonds; long braces in the corner panels and a 'Mann' (a post with braces like legs and arms) in the
      // middle of the even storeys; an oriel on its corbel; a steep gable to the street, framed in two floors with collar
      // beams and a king post, oversailing a little, with its own small windows.
      const jetty = 0.3, g = H0 * 1.05, dimX = W / 2 + storeys * jetty + 1;
      rect("plaster", -W / 2, 0, W / 2, g);
      for (let q = 0, yy = 0; yy < g - 0.05; q++) {
        const y1 = Math.min(g, yy + 0.34), L = q % 2 ? 0.55 : 0.32;
        for (const sg of [-1, 1]) { const xo = (sg * W) / 2, xi = sg * (W / 2 - L); parts.push({ role: "stone", closed: true, tone: 0.5, pts: [[Math.min(xo, xi), yy + 0.02], [Math.max(xo, xi), yy + 0.02], [Math.max(xo, xi), y1 - 0.02], [Math.min(xo, xi), y1 - 0.02]] }); }
        yy = y1;
      }
      const dcx = -W / 2 + bayW * 0.62, dw = 1.15, dTop = Math.min(2.5, g - 0.3);
      arched(dcx, 0, dw, dTop - dw / 2, "door");
      const wcx = W / 2 - bayW * 0.95, ww0 = Math.min(1.6, bayW * 0.8);
      window(wcx, 0.95, ww0, 1.15, [3, 2], 0.25);
      rect("plaster", wcx - ww0 / 2 - 0.12, 0.78, wcx + ww0 / 2 + 0.12, 0.88);
      dims.push({ label: `ground floor (stone) ${g.toFixed(1)} m`, y0: 0, y1: g, x: dimX });
      const frame = (yb: number, sh: number, w: number, s: number) => {
        rect("plaster", -w / 2, yb, w / 2, yb + sh);
        const nP = Math.max(3, Math.round(w / 1.1)), pw = w / nP, br = 0.85, hd = sh - 0.42, mid = Math.floor(nP / 2);
        for (let k = 0; k < nP; k++) {
          const xa = -w / 2 + k * pw, xb = xa + pw;
          if (k === 0 || k === nP - 1) {
            const o = k === 0 ? xa + 0.12 : xb - 0.12, i = k === 0 ? xb - 0.05 : xa + 0.05;
            line("timber", [o, yb + 0.2], [i, yb + hd], 0.15);
            continue;
          }
          if (s % 2 === 0 && k === mid) {
            const cm = (xa + xb) / 2;
            line("timber", [xa + 0.08, yb + 0.2], [cm, yb + sh * 0.62], 0.14); line("timber", [xb - 0.08, yb + 0.2], [cm, yb + sh * 0.62], 0.14);
            line("timber", [xa + 0.08, yb + hd], [cm, yb + sh * 0.76], 0.11); line("timber", [xb - 0.08, yb + hd], [cm, yb + sh * 0.76], 0.11);
            rect("timber", cm - 0.07, yb, cm + 0.07, yb + sh);
            continue;
          }
          window((xa + xb) / 2, yb + br + 0.17, pw - 0.36, hd - br - 0.28, [2, 3], 0.08);
          const ya = yb + 0.24, yc = yb + br - 0.03, x0b = xa + 0.13, x1b = xb - 0.13, xm = (xa + xb) / 2, ym = (ya + yc) / 2;
          if ((k + s) % 2) { line("timber", [x0b, ya], [x1b, yc], 0.1); line("timber", [x1b, ya], [x0b, yc], 0.1); }
          else poly("timber", [[xm, ya], [x1b, ym], [xm, yc], [x0b, ym], [xm, ya]], false, 0.1);
        }
        for (let k = 0; k <= nP; k++) { const xp = -w / 2 + k * pw; rect("timber", k === 0 ? -w / 2 : xp - 0.08, yb, k === nP ? w / 2 : xp + 0.08, yb + sh); }
        rect("timber", -w / 2, yb, w / 2, yb + 0.2);
        rect("timber", -w / 2, yb + br, w / 2, yb + br + 0.1);
        rect("timber", -w / 2, yb + hd, w / 2, yb + hd + 0.12);
        rect("timber", -w / 2, yb + sh - 0.16, w / 2, yb + sh);
        if (s === 1 && nP >= 5) {
          // an oriel: three faces of a bay window standing out on a corbel, under its own small roof
          const ow = Math.min(2.1, pw * 1.8), oy0 = yb + 0.25, oy1 = yb + sh - 0.45, sd = 0.3;
          parts.push({ role: "cast", closed: true, pts: [[ow / 2, oy1], [ow / 2 + 0.65 * SUN_DX, oy1 - 0.65 * SUN_DY], [ow / 2 + 0.65 * SUN_DX, oy0 - 0.9 - 0.65 * SUN_DY], [ow / 2, oy0 - 0.9]] });
          poly("bracket", [[-ow / 2, oy0], [ow / 2, oy0], [0.3, oy0 - 0.9], [-0.3, oy0 - 0.9]]);
          rect("plaster", -ow / 2, oy0, ow / 2, oy1);
          window(-ow / 2 + sd / 2, oy0 + 0.35, sd - 0.12, oy1 - oy0 - 0.62, [1, 3], 0.04);
          window(0, oy0 + 0.35, ow - 2 * sd - 0.3, oy1 - oy0 - 0.62, [3, 3], 0.04);
          window(ow / 2 - sd / 2, oy0 + 0.35, sd - 0.12, oy1 - oy0 - 0.62, [1, 3], 0.04);
          for (const xq of [-ow / 2 + 0.06, -ow / 2 + sd, ow / 2 - sd, ow / 2 - 0.06]) rect("timber", xq - 0.06, oy0, xq + 0.06, oy1);
          rect("timber", -ow / 2, oy0, ow / 2, oy0 + 0.16); rect("timber", -ow / 2, oy1 - 0.14, ow / 2, oy1);
          poly("roof", [[-ow / 2 - 0.15, oy1], [ow / 2 + 0.15, oy1], [ow / 2 - 0.35, oy1 + 0.4], [-ow / 2 + 0.35, oy1 + 0.4]]);
          line("roof-line", [-ow / 2 - 0.15, oy1], [ow / 2 + 0.15, oy1], 0.06);
        }
      };
      let y = g, w = W;
      for (let s = 1; s < storeys; s++) {
        const sh = H0, wPrev = w;
        w += 2 * jetty;
        // the jetty: joist ends carrying the storey out over the one below, their shadow on its wall
        castBelow([[-w / 2, y - 0.2], [w / 2, y - 0.2]], jetty, -wPrev / 2, wPrev / 2);
        rect("beam", -w / 2, y - 0.2, w / 2, y);
        for (let x = -w / 2 + 0.15; x < w / 2 - 0.1; x += 0.5) rect("bracket", x - 0.08, y - 0.19, x + 0.08, y - 0.01);
        frame(y, sh, w, s);
        dims.push({ label: `storey ${s + 1} ${sh.toFixed(1)} m`, y0: y, y1: y + sh, x: dimX });
        y += sh;
      }
      // the gable, oversailing a little, framed in two floors
      const wg = w + 0.3, gb = y, ridge = gb + (wg / 2) * Math.tan(pitch), gh = ridge - gb, half = (yy: number) => (wg / 2) * (1 - (yy - gb) / gh);
      castBelow([[-wg / 2, gb], [wg / 2, gb]], 0.15, -w / 2, w / 2);
      poly("plaster", [[-wg / 2, gb], [wg / 2, gb], [0, ridge]]);
      const c1 = gb + gh * 0.42, c2 = gb + gh * 0.72, gx = wg * 0.2, gW = 0.72;
      for (const sx of [-1, 1]) window(sx * gx, gb + 0.7, gW, Math.max(0.6, c1 - gb - 1.2), [2, 3], 0.08);
      window(0.55, c1 + 0.3, 0.42, Math.max(0.4, c2 - c1 - 0.6), [1, 2], 0.06);
      for (const sx of [-1, 1]) {
        for (const xp of [gx - gW / 2 - 0.16, gx + gW / 2 + 0.16]) rect("timber", sx * xp - 0.07, gb, sx * xp + 0.07, Math.min(c1, gb + gh * (1 - xp / (wg / 2))));
        line("timber", [sx * 0.95, gb + 0.18], [0, c1 - 0.45], 0.13);
        const xo = wg / 2 - 0.55, xi2 = gx + gW / 2 + 0.16;
        if (xo > xi2 + 0.3) line("timber", [sx * xo, gb + 0.18], [sx * xi2, gb + Math.min(0.95, gh * (1 - xo / (wg / 2)) + 0.3)], 0.12);
      }
      rect("timber", -0.08, gb, 0.08, ridge - 0.25);
      rect("timber", -half(c1) + 0.1, c1, half(c1) - 0.1, c1 + 0.14);
      rect("timber", -half(c2) + 0.1, c2, half(c2) - 0.1, c2 + 0.12);
      rect("timber", -wg / 2, gb, wg / 2, gb + 0.18);
      // the verge: the roof's edge beyond the gable, its barge-boards under it
      const yv = gb - eaves * Math.tan(pitch);
      poly("roof", [[-wg / 2 - eaves, yv], [0, ridge + 0.05], [wg / 2 + eaves, yv], [wg / 2 + eaves - 0.28, yv - 0.05], [0, ridge - 0.3], [-wg / 2 - eaves + 0.28, yv - 0.05]]);
      line("timber", [-wg / 2 - eaves * 0.5, gb - eaves * 0.5 * Math.tan(pitch) - 0.1], [0, ridge - 0.38], 0.2);
      line("timber", [wg / 2 + eaves * 0.5, gb - eaves * 0.5 * Math.tan(pitch) - 0.1], [0, ridge - 0.38], 0.2);
      top = ridge + 0.05;
      break;
    }
    case "greek-temple": {
      // After the Parthenon's west front (a CC0 photograph and its published dimensions): three steps (crepidoma); columns
      // about 5.5 diameters tall with entasis and twenty flutes, each capped by a cushion-like echinus over three annulets
      // and a square abacus; behind the colonnade the porch in shadow and the cella's great door; an entablature about
      // 0.3 of the column: a plain architrave with its taenia and the drops (guttae) under each triglyph, a frieze of
      // triglyphs and metopes, a projecting cornice (geison) that shades the frieze; a low pediment whose raking cornice
      // shades the tympanum, with acroteria at its corners and apex.
      const stepH = 0.5, colH = H0, D = colH / 5.5, n = bays, span = W;
      for (let s2 = 0; s2 < 3; s2++) rect("step", -W / 2 - D * 0.6 - (2 - s2) * 0.5, s2 * stepH, W / 2 + D * 0.6 + (2 - s2) * 0.5, (s2 + 1) * stepH);
      const y0 = 3 * stepH, ent = colH * 0.3, ey = y0 + colH, aH = ent * 0.41, fH = ent * 0.41;
      // the porch behind the columns, in shadow, deeper under its ceiling; the great door
      rect("wall", -span / 2 + D * 0.4, y0, span / 2 - D * 0.4, ey);
      rect("door", -span * 0.075, y0, span * 0.075, y0 + colH * 0.8);
      rect("cast", -span / 2 + D * 0.4, y0, span / 2 - D * 0.4, ey);
      rect("cast", -span / 2 + D * 0.4, ey - colH * 0.3, span / 2 - D * 0.4, ey);
      const cxs: number[] = [];
      for (let k = 0; k < n; k++) {
        const cx = -span / 2 + D / 2 + ((span - D) * k) / (n - 1), pts: FPoint[] = [], shaftTop = y0 + colH * 0.915, r0 = (D / 2) * 0.78;
        cxs.push(cx);
        for (let q = 0; q <= 10; q++) { const u = q / 10, r = (D / 2) * (1 - 0.22 * u + 0.03 * Math.sin(Math.PI * u)); pts.push([cx - r, y0 + (shaftTop - y0) * u]); }
        poly("column", [...pts, ...pts.map(([x, yy]) => [2 * cx - x, yy] as FPoint).reverse()]);
        // twenty flutes round the shaft, about ten seen, crowding toward its edges
        for (let f = 1; f < 10; f++) { const sn = Math.sin(-Math.PI / 2 + (f / 10) * Math.PI) * 0.94; line("shade", [cx + (D / 2) * sn, y0 + 0.05], [cx + r0 * sn, shaftTop - 0.3], 0.022); }
        line("shade", [cx - r0, shaftTop - 0.3], [cx + r0, shaftTop - 0.3], 0.02);
        // the echinus swelling out from the shaft to the abacus, over three annulets
        const ye = y0 + colH * 0.965, r1 = D * 0.535, ech: FPoint[] = [];
        for (let q = 0; q <= 8; q++) { const t2 = q / 8; ech.push([cx - (r0 + (r1 - r0) * (1 - (1 - t2) ** 2)), shaftTop + (ye - shaftTop) * t2]); }
        poly("column", [...ech, ...ech.map(([x, yy]) => [2 * cx - x, yy] as FPoint).reverse()]);
        for (let q = 0; q < 3; q++) line("shade", [cx - r0 - 0.02, shaftTop + 0.04 + q * 0.04], [cx + r0 + 0.02, shaftTop + 0.04 + q * 0.04], 0.012);
        rect("column", cx - r1, ye, cx + r1, ey);
      }
      // the architrave and its taenia
      rect("beam", -span / 2, ey, span / 2, ey + aH);
      rect("beam", -span / 2 - 0.03, ey + aH - 0.12, span / 2 + 0.03, ey + aH);
      // the frieze: triglyphs over the columns and the spaces between them, metopes in between
      rect("plaster", -span / 2, ey + aH, span / 2, ey + aH + fH);
      const tw = D * 0.46, tri: number[] = [];
      cxs.forEach((c, k) => { tri.push(c); if (k < cxs.length - 1) tri.push((c + cxs[k + 1]) / 2); });
      tri.forEach((c, k) => {
        const tx0 = k === 0 ? -span / 2 : c - tw / 2, tx1 = k === tri.length - 1 ? span / 2 : c + tw / 2, wd = tx1 - tx0;
        rect("beam", tx0, ey + aH, tx1, ey + aH + fH);
        for (const gq of [1 / 3, 2 / 3]) rect("shade", tx0 + wd * gq - 0.05, ey + aH + 0.06, tx0 + wd * gq + 0.05, ey + aH + fH - 0.14);
        rect("shade", tx0, ey + aH + 0.06, tx0 + 0.04, ey + aH + fH - 0.14); rect("shade", tx1 - 0.04, ey + aH + 0.06, tx1, ey + aH + fH - 0.14);
        // the regula under the taenia, with six drops
        rect("beam", tx0, ey + aH - 0.2, tx1, ey + aH - 0.12);
        for (let q = 0; q < 6; q++) { const gxq = tx0 + (wd * (q + 0.5)) / 6; poly("beam", [[gxq - 0.04, ey + aH - 0.2], [gxq + 0.04, ey + aH - 0.2], [gxq + 0.03, ey + aH - 0.29], [gxq - 0.03, ey + aH - 0.29]]); }
      });
      // the geison's shadow on the frieze, then the pediment, the rakes' shadow on the tympanum, the geison over both
      const gy0 = ey + aH + fH, py = ey + ent, ov = 0.45, ridge = py + (span / 2 + ov) * Math.tan(pitch);
      castBelow([[-span / 2 - ov, gy0], [span / 2 + ov, gy0]], 0.6, -span / 2, span / 2);
      poly("plaster", [[-span / 2 - ov, py], [span / 2 + ov, py], [0, ridge]]);
      castBelow([[-span / 2 - ov + 0.6, py + 0.1], [0, ridge - 0.45], [span / 2 + ov - 0.6, py + 0.1]], 0.5, -span / 2 - ov, span / 2 + ov);
      rect("beam", -span / 2 - ov, gy0, span / 2 + ov, py);
      line("shade", [-span / 2 - ov, gy0 + 0.05], [span / 2 + ov, gy0 + 0.05], 0.03);
      // the raking cornice
      poly("beam", [[-span / 2 - ov - 0.15, py], [0, ridge + 0.32], [span / 2 + ov + 0.15, py], [span / 2 + ov - 0.5, py], [0, ridge - 0.2], [-span / 2 - ov + 0.5, py]]);
      // acroteria: a palmette on the apex, smaller ones on the corners
      const palmette = (cx: number, yb: number, sz: number) => {
        rect("plaster", cx - sz * 0.3, yb, cx + sz * 0.3, yb + sz * 0.25);
        for (let q = -3; q <= 3; q++) {
          const a = Math.PI / 2 + q * 0.32, L = sz * (q === 0 ? 1 : 0.92 - Math.abs(q) * 0.07), bx = cx, by = yb + sz * 0.3, wq = sz * 0.07;
          poly("plaster", [[bx - Math.sin(a) * wq * 0.4, by + Math.cos(a) * wq * 0.4], [bx + Math.cos(a) * L * 0.6 - Math.sin(a) * wq, by + Math.sin(a) * L * 0.6 + Math.cos(a) * wq], [bx + Math.cos(a) * L, by + Math.sin(a) * L], [bx + Math.cos(a) * L * 0.6 + Math.sin(a) * wq, by + Math.sin(a) * L * 0.6 - Math.cos(a) * wq], [bx + Math.sin(a) * wq * 0.4, by - Math.cos(a) * wq * 0.4]]);
        }
      };
      palmette(0, ridge + 0.25, 1.6);
      for (const sx of [-1, 1]) palmette(sx * (span / 2 + ov - 0.1), py + 0.05, 1.0);
      top = ridge + 0.25 + 1.6 + 0.3;
      dims.push({ label: `columns ${colH.toFixed(1)} m = ${(colH / D).toFixed(1)} diameters`, y0, y1: y0 + colH, x: W / 2 + 2.2 });
      break;
    }
    case "apartment-block": {
      // A slab block of identical floors: a taller ground floor glazed behind its columns, a canopy over the entrance;
      // above, bays of precast panels; balconies on every other bay (a slab about 1.2 m deep whose shadow falls over the
      // floor below, a railing, glazed doors behind), windows with deep reveals between them; a stair at one end lit by
      // windows half a storey up; a parapet and a plant room set back on the roof.
      const gH = H0 * 1.35, topY = gH + (storeys - 1) * H0, stair = bays - 1, entr = Math.floor((bays - 1) / 2);
      rect("wall", -W / 2, 0, W / 2, topY + 0.9);
      rect("shade", -W / 2 + 0.25, 0, W / 2 - 0.25, gH - 0.3);
      for (let k = 0; k < bays; k++) {
        const cx = -W / 2 + bayW * (k + 0.5);
        if (k === entr) {
          window(cx, 0.02, bayW - 0.7, gH - 0.55, [2, 2], 0.3);
          rect("frame", cx - 0.97, 0.02, cx + 0.97, 2.37); rect("glass", cx - 0.9, 0.02, cx + 0.9, 2.3); line("frame", [cx, 0.02], [cx, 2.3], 0.05);
        } else window(cx, 0.35, bayW - 0.62, gH - 0.85, [3, 1], 0.3);
      }
      for (let k = 0; k <= bays; k++) { const x = -W / 2 + bayW * k; rect("wall", Math.max(-W / 2, x - 0.22), 0, Math.min(W / 2, x + 0.22), gH - 0.3); }
      const ecx = -W / 2 + bayW * (entr + 0.5);
      castBelow([[ecx - bayW * 0.7, 2.75], [ecx + bayW * 0.7, 2.75]], 1.6, -W / 2, W / 2);
      rect("beam", ecx - bayW * 0.7, 2.75, ecx + bayW * 0.7, 2.95);
      rect("beam", -W / 2, gH - 0.3, W / 2, gH);
      for (let s2 = 1; s2 < storeys; s2++) {
        const y = gH + (s2 - 1) * H0;
        if (s2 > 1) line("shade", [-W / 2, y], [W / 2, y], 0.02);
        for (let k = 1; k < bays; k++) line("shade", [-W / 2 + bayW * k, y], [-W / 2 + bayW * k, y + H0], 0.02);
        for (let k = 0; k < bays; k++) {
          const cx = -W / 2 + bayW * (k + 0.5);
          if (k === stair) { window(cx, y + H0 * 0.5 + 0.25, 0.55, 1.1, [1, 2], 0.15); continue; }
          if (k % 2 === 0) {
            window(cx, y + 0.05, bayW * 0.5, 2.2, [2, 1], 0.15);
            castBelow([[cx - bayW * 0.46, y - 0.05], [cx + bayW * 0.46, y - 0.05]], 1.2, -W / 2, W / 2);
            rect("beam", cx - bayW * 0.46, y - 0.05, cx + bayW * 0.46, y + 0.15);
            for (let x = cx - bayW * 0.45; x <= cx + bayW * 0.45 + 0.001; x += 0.11) line("iron", [x, y + 0.15], [x, y + 1.0], 0.018);
            line("iron", [cx - bayW * 0.46, y + 1.02], [cx + bayW * 0.46, y + 1.02], 0.05);
          } else window(cx, y + 0.9, bayW * 0.55, 1.45, [2, 1], 0.15);
        }
      }
      rect("beam", -W / 2 - 0.05, topY + 0.8, W / 2 + 0.05, topY + 0.95);
      const pr0 = -W * 0.18, pr1 = W * 0.12;
      rect("wall", pr0, topY + 0.95, pr1, topY + 3.2);
      for (let x = pr0 + 0.3; x < pr1 - 0.3; x += 0.18) line("shade", [x, topY + 1.4], [x, topY + 2.6], 0.03);
      rect("beam", pr0 - 0.05, topY + 3.1, pr1 + 0.05, topY + 3.25);
      top = topY + 3.25;
      dims.push({ label: `floor to floor ${H0.toFixed(1)} m`, y0: gH, y1: gH + H0, x: W / 2 + 0.6 }, { label: `ground floor ${gH.toFixed(1)} m`, y0: 0, y1: gH, x: W / 2 + 0.6 });
      break;
    }
    case "adobe": {
      // After Pueblo Revival houses: thick mud-plastered walls, battered a little and rounded at every edge, the parapet
      // stepping up over the middle; vigas (roof beams) poking out below the parapet, each with its shadow; wooden canales
      // draining the roof, a streak of rain under each; small deep-set windows under heavy timber lintels; a portal on
      // posts with carved corbels (zapatas) sheltering the door; a rounded chimney.
      const h1 = H0, hp = h1 + 0.5, step = 0.38, r = 0.3;
      const topAt = (x: number) => { const u = Math.abs(x) / (W * 0.2), s2 = u < 1 ? 1 : u > 1.25 ? 0 : 0.5 + 0.5 * Math.cos(((u - 1) / 0.25) * Math.PI); return hp + step * s2 + 0.025 * Math.sin(x * 2.3 + 1); };
      // the chimney behind the parapet
      const chx = W / 2 - 1.0, chy = topAt(chx), chimney: FPoint[] = [[chx - 0.34, chy - 0.2], [chx - 0.3, chy + 0.95]];
      for (let k = 0; k <= 8; k++) { const a2 = Math.PI - (k / 8) * Math.PI; chimney.push([chx + 0.3 * Math.cos(a2), chy + 0.95 + 0.22 * Math.sin(a2)]); }
      chimney.push([chx + 0.3, chy + 0.95], [chx + 0.34, chy - 0.2]);
      poly("wall", chimney);
      const outline: FPoint[] = [[-W / 2 - 0.06, 0]];
      for (let k = 0; k <= 6; k++) { const a2 = Math.PI - (k / 6) * (Math.PI / 2); outline.push([-W / 2 + 0.04 + r + r * Math.cos(a2), topAt(-W / 2) - r + r * Math.sin(a2)]); }
      for (let k = 1; k < 48; k++) { const x = -W / 2 + 0.04 + r + ((W - 0.08 - 2 * r) * k) / 48; outline.push([x, topAt(x)]); }
      for (let k = 0; k <= 6; k++) { const a2 = Math.PI / 2 - (k / 6) * (Math.PI / 2); outline.push([W / 2 - 0.04 - r + r * Math.cos(a2), topAt(W / 2) - r + r * Math.sin(a2)]); }
      outline.push([W / 2 + 0.06, 0]);
      poly("wall", outline);
      // vigas: log ends below the parapet, each casting its shadow
      const nV = Math.max(5, Math.round(W / 0.75)), yv = h1 - 0.05;
      for (let k = 0; k < nV; k++) {
        const x = -W / 2 + 0.45 + ((W - 0.9) * k) / (nV - 1), rr = 0.11 + 0.015 * rnd();
        const circ = (rad: number): FPoint[] => Array.from({ length: 12 }, (_, q) => [x + rad * Math.cos((q / 12) * Math.PI * 2), yv + rad * Math.sin((q / 12) * Math.PI * 2)] as FPoint);
        castBelow([[x - rr, yv], [x + rr, yv]], 0.55, x - rr, x + rr + 0.55);
        poly("timber", circ(rr)); poly("bracket", circ(rr * 0.68));
      }
      // canales: wooden spouts at the roof's level, a dark streak of rain below each
      for (const xc of [-W * 0.33, W * 0.33]) {
        const yc = h1 + 0.2;
        poly("cast", [[xc - 0.07, yc], [xc + 0.07, yc], [xc + 0.11, yc - 1.2], [xc + 0.02, yc - 1.6], [xc - 0.05, yc - 1.1]]);
        rect("timber", xc - 0.11, yc, xc + 0.11, yc + 0.15);
        rect("shade", xc - 0.07, yc + 0.05, xc + 0.07, yc + 0.13);
      }
      // small deep-set windows under timber lintels
      for (const cx of [-W / 2 + bayW * 0.5, W / 2 - bayW * 0.5]) {
        window(cx, 1.0, 0.75, 0.85, [2, 2], 0.35);
        rect("timber", cx - 0.62, 1.94, cx + 0.62, 2.12);
        castBelow([[cx - 0.62, 1.94], [cx + 0.62, 1.94]], 0.1, cx - 0.62, cx + 0.75);
      }
      // the door under its lintel; the portal's shadow; its posts, carved corbels, beam and roof
      const pw2 = 1.45;
      rect("door", -0.45, 0, 0.45, door * 0.97);
      reveal(-0.45, 0, 0.45, door * 0.97, 0.3);
      rect("timber", -0.65, door * 0.97, 0.65, door * 0.97 + 0.18);
      castBelow([[-pw2 - 0.3, 2.3], [pw2 + 0.3, 2.3]], 1.8, -W / 2, W / 2);
      for (const sx of [-1, 1]) {
        const px = sx * pw2;
        rect("timber", px - 0.11, 0, px + 0.11, 2.15);
        poly("timber", [[px - 0.55, 2.3], [px + 0.55, 2.3], [px + 0.55, 2.24], [px + 0.4, 2.2], [px + 0.32, 2.12], [px - 0.32, 2.12], [px - 0.4, 2.2], [px - 0.55, 2.24]]);
      }
      rect("timber", -pw2 - 0.3, 2.3, pw2 + 0.3, 2.48);
      for (let x = -pw2 - 0.15; x <= pw2 + 0.16; x += 0.5) { const c2: FPoint[] = Array.from({ length: 10 }, (_, q) => [x + 0.08 * Math.cos((q / 10) * Math.PI * 2), 2.56 + 0.08 * Math.sin((q / 10) * Math.PI * 2)] as FPoint); poly("timber", c2); }
      rect("wall", -pw2 - 0.35, 2.64, pw2 + 0.35, 2.82);
      top = Math.max(topAt(0), chy + 1.17) + 0.05;
      dims.push({ label: `walls ${h1.toFixed(1)} m, about 0.6 m thick`, y0: 0, y1: h1, x: W / 2 + 0.6 });
      break;
    }
  }
  return { type: t, width: W + 2 * Math.max(eaves, 3.5), height: top, parts, dims };
}

/** Checks a drawn stair against Blondel's rule and the human scale; returns problems in words. */
export function checkStair(riser: number, tread: number): string[] {
  const out: string[] = [], stride = 2 * riser + tread;
  if (riser < HUMAN_SCALE.stairRiser.min || riser > HUMAN_SCALE.stairRiser.max) out.push(`Riser ${(riser * 100).toFixed(0)} cm is outside 15–19 cm.`);
  if (stride < 0.6 || stride > 0.65) out.push(`2 risers + 1 tread = ${(stride * 100).toFixed(0)} cm; Blondel's comfortable stride is 60–65 cm.`);
  return out;
}
