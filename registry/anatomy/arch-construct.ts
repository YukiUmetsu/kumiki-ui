/**
 * ARCH1 construction: measured front elevations of the building types in `arch-data.ts`, as parts any style can
 * paint (`buildingElevation`). Metres, y up, the ground at y = 0, the front centred on x = 0.
 *
 * Parts carry a role (wall, shade, roof, roof-line, window, glass, frame, door, timber, lattice, column, step, base,
 * bracket, plaster, beam), so a painter chooses its own colours and textures. Dimensions are the type's, from the
 * human scale (doors about 2 m, storeys about 3 m), varied a little by the seed. Roofs are straight on houses and
 * curve only on temples and castle keeps (their eaves sag in the middle and lift at the corners).
 */
import { seeded } from "./foundation-shapes";
import type { FPoint } from "./foundation-shapes";
import { findBuildingType, HUMAN_SCALE } from "./arch-data";
import type { BuildingType } from "./arch-data";

export type PartRole = "wall" | "shade" | "roof" | "roof-line" | "window" | "glass" | "frame" | "door" | "timber" | "lattice" | "column" | "step" | "base" | "bracket" | "plaster" | "beam" | "cloth" | "ornament";
export interface ElevationPart { role: PartRole; pts: FPoint[]; closed: boolean; width?: number }
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
  const window = (cx: number, y0: number, w: number, h: number, panes: [number, number] = [2, 3]) => {
    rect("frame", cx - w / 2 - 0.06, y0 - 0.06, cx + w / 2 + 0.06, y0 + h + 0.06);
    rect("glass", cx - w / 2, y0, cx + w / 2, y0 + h);
    for (let i = 1; i < panes[0]; i++) line("frame", [cx - w / 2 + (w * i) / panes[0], y0], [cx - w / 2 + (w * i) / panes[0], y0 + h], 0.035);
    for (let j = 1; j < panes[1]; j++) line("frame", [cx - w / 2, y0 + (h * j) / panes[1]], [cx + w / 2, y0 + (h * j) / panes[1]], 0.035);
  };
  /** A roof band seen from the eaves side: eave line (curved if the type curves) up to the ridge. */
  const roofBand = (x0: number, x1: number, yEave: number, run: number, hip: boolean, curve: number) => {
    const rise = run * Math.tan(pitch), n = 24, eave: FPoint[] = [];
    for (let k = 0; k <= n; k++) { const u = k / n, x = x0 + (x1 - x0) * u, e = (u * 2 - 1) ** 2; eave.push([x, yEave - curve * 0.25 * (1 - e) + curve * Math.pow(e, 3)]); }
    const inset = hip ? Math.min((x1 - x0) * 0.3, run) : 0;
    const ridge: FPoint[] = [[x1 - inset, yEave + rise], [x0 + inset, yEave + rise]];
    poly("roof", [...eave, ...ridge]);
    poly("roof-line", eave, false, 0.12);
    line("roof-line", ridge[0], ridge[1], 0.16);
    return yEave + rise;
  };
  /**
   * A hip-and-gable (irimoya) roof seen from its long side: eaves that sag in the middle and lift at the corners, a
   * concave (sori) lower hipped skirt up to the waist where the hips meet the gable, a steeper upper part, and a ridge
   * with raised end tiles (onigawara). Returns the ridge's height.
   */
  const irimoya = (x0: number, x1: number, yEave: number, height: number, lift: number) => {
    const n = 28, eave: FPoint[] = [];
    for (let k = 0; k <= n; k++) { const u = k / n, e = (u * 2 - 1) ** 2; eave.push([x0 + (x1 - x0) * u, yEave - 0.2 * lift * (1 - e) + lift * Math.pow(e, 4)]); }
    const w = x1 - x0, waistY = yEave + height * 0.5, ridgeY = yEave + height, inW = w * 0.17, rW = w * 0.4;
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
      const h1 = H0, h2 = 2.0 * jit(0.05);
      rect("wall", -W / 2, 0, W / 2, h1); rect("plaster", -W / 2, h1, W / 2, h1 + h2);
      // the ground floor: a lattice (kōshi) front, the door with a noren curtain
      const dx = -W / 2 + bayW * 0.5;
      rect("door", dx - 0.45, 0, dx + 0.45, door * 0.95); rect("cloth", dx - 0.45, door * 0.95 - 0.75, dx + 0.45, door * 0.95);
      rect("lattice", dx + 0.55, 0.45, W / 2 - 0.15, h1 - 0.35);
      for (let x = dx + 0.6; x < W / 2 - 0.15; x += 0.075) line("timber", [x, 0.45], [x, h1 - 0.35], 0.03);
      // a pent eave (hisashi) over the ground floor, then the low upper storey with clay-slatted mushiko windows
      roofBand(-W / 2 - eaves, W / 2 + eaves, h1 + 0.05, 0.9, false, 0);
      const mw = W * 0.55, my = h1 + 0.75;
      rect("plaster", -mw / 2 - 0.08, my - 0.08, mw / 2 + 0.08, my + 0.75);
      for (let x = -mw / 2; x <= mw / 2; x += 0.16) rect("shade", x, my, x + 0.08, my + 0.67);
      top = roofBand(-W / 2 - eaves, W / 2 + eaves, h1 + h2, 2.2, false, 0);
      dims.push({ label: `ground floor ${h1.toFixed(1)} m`, y0: 0, y1: h1, x: W / 2 + eaves + 0.4 }, { label: `upper (mushiko) ${h2.toFixed(1)} m`, y0: h1, y1: h1 + h2, x: W / 2 + eaves + 0.4 });
      break;
    }
    case "castle-keep": {
      // A tenshu on its ishigaki: the stone base's face curves out toward the foot (the "fan slope"), coursed stones;
      // storeys stepping in, each skirted by a roof with lifted corners; triangular chidori-hafu gables on alternate
      // roofs; white plaster with lattice windows; an irimoya top crowned by golden shachihoko.
      const baseH = 7.5 * jit(0.05), bw = W / 2 + 0.6 + 2.6;
      const b: FPoint[] = [];
      for (let k = 0; k <= 16; k++) { const u = k / 16; b.push([-(bw - 2.6 * (1 - Math.pow(1 - u, 2.4))), baseH * u]); }
      poly("base", [...b, ...b.map(([x, y]) => [-x, y] as FPoint).reverse()]);
      for (let yy = 0.55; yy < baseH; yy += 0.6) {
        const u = yy / baseH, half = bw - 2.6 * (1 - Math.pow(1 - u, 2.4));
        line("shade", [-half, yy], [half, yy], 0.03);
        for (let x = -half + ((yy * 7.3) % 1.1); x < half; x += 0.9 + ((x * 3.1 + yy) % 0.5)) line("shade", [x, yy], [x, yy - 0.6], 0.025);
      }
      let y = baseH, w = W + 0.4;
      const nSt = Math.max(3, storeys);
      for (let st = 0; st < nSt; st++) {
        const last = st === nSt - 1, sh = (last ? 0.8 : 1) * H0 * 0.85;
        rect("plaster", -w / 2, y, w / 2, y + sh);
        rect("beam", -w / 2, y, w / 2, y + 0.25);
        // lattice windows (bars of dark wood) in white walls
        const nw = Math.max(1, Math.round(w / 3.2));
        for (let k = 0; k < nw; k++) {
          const cx = -w / 2 + (w * (k + 0.5)) / nw, ww = 0.9, wy = y + sh * 0.35;
          rect("window", cx - ww / 2, wy, cx + ww / 2, wy + sh * 0.38);
          for (let q = 1; q < 5; q++) line("plaster", [cx - ww / 2 + (ww * q) / 5, wy], [cx - ww / 2 + (ww * q) / 5, wy + sh * 0.38], 0.05);
        }
        const roofY = y + sh, e = 1.3;
        if (last) { top = irimoya(-w / 2 - e, w / 2 + e, roofY + 0.1, sh * 0.95, 0.7); break; }
        // a skirt roof with lifted corners round each storey
        const run = 1.6, n = 20, eave: FPoint[] = [];
        for (let k = 0; k <= n; k++) { const uu = k / n, ee = (uu * 2 - 1) ** 2; eave.push([-w / 2 - e + (w + 2 * e) * uu, roofY - 0.15 * (1 - ee) + 0.55 * Math.pow(ee, 4)]); }
        const rise = run * Math.tan(pitch) + 0.4;
        poly("roof", [...eave, [w / 2 * 0.95, roofY + rise], [-w / 2 * 0.95, roofY + rise]]);
        poly("roof-line", eave, false, 0.18);
        // a chidori-hafu (a triangular gable) on alternate roofs
        if (st % 2 === 0) {
          const gw = Math.min(w * 0.55, 7.5), gy = roofY + 0.05, gh = gw * 0.42;
          poly("plaster", [[-gw / 2, gy], [gw / 2, gy], [0, gy + gh]]);
          poly("roof-line", [[-gw / 2 - 0.4, gy - 0.1], [0, gy + gh + 0.35], [gw / 2 + 0.4, gy - 0.1]], false, 0.28);
          line("timber", [-gw * 0.3, gy + gh * 0.25], [gw * 0.3, gy + gh * 0.25], 0.06);
        }
        dims.push({ label: `storey ${st + 1} ${sh.toFixed(1)} m`, y0: y, y1: y + sh, x: W / 2 + eaves + 1.5 });
        y = roofY + rise * 0.55;
        w *= 0.86;
      }
      // shachihoko at the ridge ends: golden fish with their tails up
      for (const sg of [-1, 1]) {
        const x0 = sg * (w + 2.6) * 0.4, yb = top - 1.1;
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
      else rect("base", -W / 2 - 1.2, 0, W / 2 + 1.2, baseH);
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
        // bracket sets under the deep eaves
        if (!keep) for (let k = 0; k <= nb; k++) { const x = -w / 2 + (w * k) / nb; rect("bracket", x - 0.35, y + sh, x + 0.35, y + sh + 0.45); }
        const roofY = y + sh + (keep ? 0.1 : 0.45), e = keep ? eaves : eaves * 0.9;
        // a temple's roof is the building: taller than its walls, hip-and-gable, its corners lifting
        const ridge = keep ? roofBand(-w / 2 - e, w / 2 + e, roofY, s < storeys - 1 ? 1.4 : (w / 2) * 0.55, s === storeys - 1, 0.5) : irimoya(-w / 2 - e, w / 2 + e, roofY, sh * 1.1, 1.1);
        y = keep && s < storeys - 1 ? roofY + 1.4 * Math.tan(pitch) * 0.6 : ridge;
        if (keep) w *= 0.8;
        top = Math.max(top, ridge);
        dims.push({ label: `${s === 0 ? "storey" : `storey ${s + 1}`} ${sh.toFixed(1)} m`, y0: y - sh, y1: y, x: W / 2 + eaves + 1.5 });
        if (!keep) break;
      }
      break;
    }
    case "japanese-farmhouse": {
      const h1 = H0;
      rect("plaster", -W / 2, 0, W / 2, h1);
      for (let k = 0; k <= bays; k++) rect("timber", -W / 2 + (W * k) / bays - 0.08, 0, -W / 2 + (W * k) / bays + 0.08, h1);
      rect("beam", -W / 2, h1 - 0.3, W / 2, h1);
      rect("door", -bayW * 0.5 + 0.2, 0, bayW * 0.5 - 0.2, door);
      for (const k of [0, bays - 1]) { const cx = -W / 2 + bayW * (k + 0.5); rect("lattice", cx - 0.6, 0.9, cx + 0.6, 1.9); }
      // the thatch: a thick hip roof, rounded eaves about a metre deep
      top = roofBand(-W / 2 - eaves, W / 2 + eaves, h1 - 0.2, W * 0.42, true, 0);
      rect("shade", -W / 2 - eaves, h1 - 0.2 - 0.9, W / 2 + eaves, h1 - 0.2);
      dims.push({ label: `walls ${h1.toFixed(1)} m; thatch about 1 m thick at the eaves`, y0: 0, y1: h1, x: W / 2 + eaves + 0.4 });
      break;
    }
    case "georgian-townhouse": {
      // storey heights: the first floor (piano nobile) tallest, shorter going up; windows to match
      const hs = [H0 * 1.0, H0 * 1.15, H0 * 0.95, H0 * 0.8].slice(0, storeys), winH = [1.8, 2.3, 1.6, 1.05];
      let y = 0;
      const totalH = hs.reduce((a, b) => a + b, 0);
      rect("wall", -W / 2, 0, W / 2, totalH + 0.9);
      hs.forEach((sh, s) => {
        for (let k = 0; k < bays; k++) {
          const cx = -W / 2 + bayW * (k + 0.5);
          if (s === 0 && k === 0) { rect("frame", cx - 0.6, 0, cx + 0.6, door + 0.55); rect("door", cx - 0.5, 0, cx + 0.5, door); rect("glass", cx - 0.5, door + 0.06, cx + 0.5, door + 0.45); continue; }
          const ww = Math.min(0.95, bayW * 0.5), wh = Math.min(winH[s] ?? 1.4, ww * 2.2);
          window(cx, y + (s === 0 ? 0.75 : 0.55), ww, wh, [2, s === 3 ? 2 : 3]);
          rect("plaster", cx - ww / 2 - 0.1, y + (s === 0 ? 0.75 : 0.55) - 0.16, cx + ww / 2 + 0.1, y + (s === 0 ? 0.75 : 0.55) - 0.06);
        }
        dims.push({ label: `${["ground", "first (piano nobile)", "second", "attic"][s]} ${sh.toFixed(1)} m`, y0: y, y1: y + sh, x: W / 2 + 0.6 });
        y += sh;
      });
      // cornice and parapet hide the roof
      rect("plaster", -W / 2 - 0.15, totalH, W / 2 + 0.15, totalH + 0.25);
      rect("wall", -W / 2, totalH + 0.25, W / 2, totalH + 0.9);
      rect("plaster", -W / 2 - 0.05, totalH + 0.9, W / 2 + 0.05, totalH + 1.0);
      top = totalH + 1.0;
      break;
    }
    case "half-timbered": {
      // jettied storeys: each upper floor about 0.3 m further out; a steep gable to the street
      let y = 0, w = W;
      for (let s = 0; s < storeys; s++) {
        const sh = H0;
        rect("plaster", -w / 2, y, w / 2, y + sh);
        // posts, rails and braces
        const nb = bays * 2;
        for (let k = 0; k <= nb; k++) rect("timber", -w / 2 + (w * k) / nb - 0.09, y, -w / 2 + (w * k) / nb + 0.09, y + sh);
        rect("timber", -w / 2, y, w / 2, y + 0.18); rect("timber", -w / 2, y + sh - 0.2, w / 2, y + sh); rect("timber", -w / 2, y + sh * 0.45, w / 2, y + sh * 0.45 + 0.12);
        for (let k = 0; k < nb; k += 2) { const x0 = -w / 2 + (w * k) / nb, x1 = -w / 2 + (w * (k + 1)) / nb; line("timber", [x0, y + 0.2], [x1, y + sh * 0.45], 0.16); }
        for (let k = 1; k < nb; k += 2) { const cx = -w / 2 + (w * (k + 0.5)) / nb; if (s === 0 && k === 1) { rect("door", cx - 0.45, 0.18, cx + 0.45, door); continue; } window(cx, y + sh * 0.55, Math.min(0.7, w / nb - 0.3), sh * 0.32, [2, 2]); }
        dims.push({ label: `storey ${sh.toFixed(1)} m`, y0: y, y1: y + sh, x: W / 2 + storeys * 0.3 + 0.6 });
        y += sh; if (s < storeys - 1) w += 0.6;
      }
      const ridge = y + (w / 2) * Math.tan(pitch);
      poly("plaster", [[-w / 2, y], [w / 2, y], [0, ridge - 0.4]]);
      line("timber", [-w / 2, y], [0, ridge - 0.4], 0.18); line("timber", [w / 2, y], [0, ridge - 0.4], 0.18); line("timber", [0, y], [0, ridge - 0.4], 0.16);
      poly("roof", [[-w / 2 - eaves, y - eaves * Math.tan(pitch)], [0, ridge], [w / 2 + eaves, y - eaves * Math.tan(pitch)], [w / 2 + eaves - 0.25, y - eaves * Math.tan(pitch) - 0.05], [0, ridge - 0.3], [-w / 2 - eaves + 0.25, y - eaves * Math.tan(pitch) - 0.05]]);
      top = ridge;
      break;
    }
    case "greek-temple": {
      // three steps (crepidoma), columns about 5.5 diameters tall, an entablature about a quarter of the column, a low pediment
      const stepH = 0.5, colH = H0, D = colH / 5.5, n = bays;
      for (let s = 0; s < 3; s++) rect("step", -W / 2 - D * 0.6 - (2 - s) * 0.5, s * stepH, W / 2 + D * 0.6 + (2 - s) * 0.5, (s + 1) * stepH);
      const y0 = 3 * stepH, span = W;
      for (let k = 0; k < n; k++) {
        const cx = -span / 2 + D / 2 + ((span - D) * k) / (n - 1), pts: FPoint[] = [];
        // entasis: a slight swelling, the top about 0.78 of the foot
        for (let q = 0; q <= 10; q++) { const u = q / 10, r = (D / 2) * (1 - 0.22 * u + 0.03 * Math.sin(Math.PI * u)); pts.push([cx - r, y0 + colH * 0.94 * u]); }
        poly("column", [...pts, ...pts.map(([x, y]) => [2 * cx - x, y] as FPoint).reverse()]);
        for (let f = -2; f <= 2; f++) line("shade", [cx + f * D * 0.09, y0 + 0.1], [cx + f * D * 0.07, y0 + colH * 0.92], 0.025);
        rect("column", cx - D * 0.5, y0 + colH * 0.94, cx + D * 0.5, y0 + colH);
      }
      const ent = colH * 0.26, ey = y0 + colH;
      rect("beam", -span / 2 - 0.1, ey, span / 2 + 0.1, ey + ent * 0.42);
      rect("plaster", -span / 2 - 0.1, ey + ent * 0.42, span / 2 + 0.1, ey + ent * 0.82);
      for (let x = -span / 2 + 0.2; x < span / 2; x += D * 0.85) rect("shade", x, ey + ent * 0.45, x + D * 0.28, ey + ent * 0.79);
      rect("beam", -span / 2 - 0.4, ey + ent * 0.82, span / 2 + 0.4, ey + ent);
      const py = ey + ent, ridge = py + (span / 2 + 0.4) * Math.tan(pitch);
      poly("plaster", [[-span / 2 - 0.4, py], [span / 2 + 0.4, py], [0, ridge]]);
      poly("roof-line", [[-span / 2 - 0.6, py], [0, ridge + 0.15], [span / 2 + 0.6, py]], false, 0.25);
      top = ridge + 0.15;
      dims.push({ label: `columns ${colH.toFixed(1)} m = ${(colH / D).toFixed(1)} diameters`, y0, y1: y0 + colH, x: W / 2 + 2.2 });
      break;
    }
    case "apartment-block": {
      const gH = H0 * 1.35;
      rect("wall", -W / 2, 0, W / 2, gH + (storeys - 1) * H0 + 0.6);
      for (let k = 0; k < bays; k++) { const cx = -W / 2 + bayW * (k + 0.5); window(cx, 0.4, bayW * 0.8, gH - 0.9, [2, 1]); }
      for (let s = 1; s < storeys; s++) {
        const y = gH + (s - 1) * H0;
        rect("beam", -W / 2, y - 0.12, W / 2, y + 0.12);
        for (let k = 0; k < bays; k++) {
          const cx = -W / 2 + bayW * (k + 0.5);
          window(cx, y + 0.9, bayW * 0.55, 1.5, [2, 1]);
          if (k % 2 === 0) { rect("shade", cx - bayW * 0.45, y + 0.12, cx + bayW * 0.45, y + 0.25); rect("frame", cx - bayW * 0.45, y + 0.25, cx + bayW * 0.45, y + 1.1); }
        }
      }
      top = gH + (storeys - 1) * H0 + 0.6;
      dims.push({ label: `floor to floor ${H0.toFixed(1)} m`, y0: gH, y1: gH + H0, x: W / 2 + 0.6 }, { label: `ground floor ${gH.toFixed(1)} m`, y0: 0, y1: gH, x: W / 2 + 0.6 });
      break;
    }
    case "adobe": {
      const h1 = H0, round = (x0: number, x1: number, y1: number): FPoint[] => { const p: FPoint[] = [[x0, 0]]; for (let k = 0; k <= 8; k++) { const a = (k / 8) * Math.PI / 2; p.push([x0 + 0.25 * (1 - Math.cos(a)), y1 - 0.25 + 0.25 * Math.sin(a)]); } for (let k = 8; k >= 0; k--) { const a = (k / 8) * Math.PI / 2; p.push([x1 - 0.25 * (1 - Math.cos(a)), y1 - 0.25 + 0.25 * Math.sin(a)]); } p.push([x1, 0]); return p; };
      poly("wall", round(-W / 2, W / 2, h1 + 0.5));
      for (let k = 0; k < 7; k++) { const x = -W / 2 + 0.4 + ((W - 0.8) * k) / 6; rect("timber", x - 0.09, h1 - 0.2, x + 0.09, h1 - 0.02); rect("shade", x - 0.09, h1 - 0.32, x + 0.11, h1 - 0.2); }
      rect("door", -0.45, 0, 0.45, door * 0.97);
      for (const cx of [-W / 2 + bayW * 0.5, W / 2 - bayW * 0.5]) { rect("shade", cx - 0.42, 1.0, cx + 0.42, 1.85); window(cx, 1.05, 0.7, 0.75, [2, 2]); }
      top = h1 + 0.5;
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
