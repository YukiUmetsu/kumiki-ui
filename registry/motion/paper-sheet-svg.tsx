/**
 * Physical paper — SVG renderer (registry item `paper-sheet`).
 *
 * Draws an evaluated sheet in an SVG: each facet shows the artwork through one affine matrix and its own clip,
 * so printed artwork folds with the paper exactly. Facets are painted far to near. The back of the paper shows
 * the back artwork (by default the stock's back colour) with the front faintly showing through thin stock.
 * Bands carry smooth shading between their edge normals and a sheen on glossy stock. Cut and torn edges show
 * their thickness in the core colour, torn edges a fibre bevel and loose fibres. Shadows fall on the surface
 * under the sheet and on the sheet itself, with a penumbra that widens with height.
 */

import { Fragment, useId } from "react";
import type { ReactNode, SVGProps } from "react";
import type { PaperFacet, PaperFringe, PaperSheetFrame } from "./paper-sheet";
import { paperFramePoint } from "./paper-sheet";
import {
  paperFacetDepth,
  paperFacetMatrix,
  paperFacing,
  paperHex,
  paperLinear,
  paperPenumbra,
  paperProject,
  paperShade,
  paperShadowColor,
  paperShadowSlices,
  paperSheen,
  paperViewMatrix,
  resolvePaperLight,
} from "./paper-sheet-light";
import type { PaperLight, PaperLightName, PaperShadowPass, PaperView } from "./paper-sheet-light";

export interface PaperSheetSvgProps extends Omit<SVGProps<SVGGElement>, "children"> {
  sheet: PaperSheetFrame;
  /** The printed face, drawn in material space. */
  front: ReactNode;
  /** The back face, in material space. @default the stock's back colour (or the face colour) over the outline */
  back?: ReactNode;
  /** Colour of the face (#rrggbb): the core of dyed stock, the back of stock printed both sides, tinted shadows. */
  color: string;
  light?: PaperLight | PaperLightName;
  view?: PaperView;
  /** Strength of curvature shading, 0–1. @default 1 */
  shading?: number;
  /** Strength of shadows, 0–1. @default 1 */
  shadow?: number;
  /** How much of the physical show-through to draw on the back, 0–1. @default 1 */
  showThrough?: number;
  /** Draw edge thickness. @default true */
  edges?: boolean;
  /** Draw torn-edge fibres. @default true */
  fibres?: boolean;
}

const BLUR_LEVELS = [0.35, 0.6, 1, 1.6, 2.4, 3.4, 4.8, 6.6, 9, 12.5, 17, 23, 31, 42];

function blurLevel(sigma: number): number {
  let best = 0;
  for (let i = 1; i < BLUR_LEVELS.length; i += 1) if (Math.abs(BLUR_LEVELS[i] - sigma) < Math.abs(BLUR_LEVELS[best] - sigma)) best = i;
  return best;
}

const fmt = (v: number) => (Math.abs(v) < 1e-9 ? "0" : (Math.round(v * 1000) / 1000).toString());
/** Matrices need more digits than coordinates: an error in a scale is multiplied by the coordinate. */
const fmtMatrix = (m: readonly number[]) => `matrix(${m.map((v) => (Math.abs(v) < 1e-12 ? "0" : (Math.round(v * 1e7) / 1e7).toString())).join(" ")})`;

function ringsPath(rings: readonly ArrayLike<number>[]): string {
  let d = "";
  for (const r of rings) {
    for (let i = 0; i < r.length; i += 2) d += (i ? "L" : "M") + fmt(r[i]) + " " + fmt(r[i + 1]);
    if (r.length) d += "Z";
  }
  return d;
}

/**
 * Clip path of a facet with its edges inside the sheet pushed out by `grow` (material px), so neighbouring
 * facets overlap by a hair and no anti-aliased seam shows between them. Edges of the paper stay exact.
 */
function facetClipPath(facet: PaperFacet, grow: number): string {
  const rings: number[][] = facet.rings.map((ring, r) => {
    const tags = facet.tags[r];
    const n = ring.length >> 1;
    let area = 0;
    for (let i = 0, j = n - 1; i < n; j = i, i += 1) area += ring[2 * j] * ring[2 * i + 1] - ring[2 * i] * ring[2 * j + 1];
    const orient = area >= 0 ? 1 : -1;
    const normal = (i: number): [number, number] => {
      const j = (i + 1) % n;
      const ex = ring[2 * j] - ring[2 * i];
      const ey = ring[2 * j + 1] - ring[2 * i + 1];
      const len = Math.hypot(ex, ey) || 1;
      return [(orient * ey) / len, (orient * -ex) / len];
    };
    const out: number[] = [];
    for (let i = 0; i < n; i += 1) {
      const prev = (i - 1 + n) % n;
      const a = tags[prev] < 0;
      const b = tags[i] < 0;
      let ox = 0;
      let oy = 0;
      if (a && b) {
        const [ax, ay] = normal(prev);
        const [bx, by] = normal(i);
        const k = 1 + ax * bx + ay * by;
        if (k > 0.2) {
          ox = (ax + bx) / k;
          oy = (ay + by) / k;
        }
      } else if (a || b) [ox, oy] = normal(a ? prev : i);
      out.push(ring[2 * i] + ox * grow, ring[2 * i + 1] + oy * grow);
    }
    return out;
  });
  return ringsPath(rings);
}

function mixHex(a: string, b: string, t: number): string {
  const x = paperLinear(a);
  const y = paperLinear(b);
  return paperHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}

function scaleHex(a: string, f: number): string {
  const x = paperLinear(a);
  return paperHex([x[0] * f, x[1] * f, x[2] * f]);
}

const neg = (n: readonly number[]): [number, number, number] => [-n[0], -n[1], -n[2]];

interface Prepared {
  facet: PaperFacet;
  index: number;
  matrix: [number, number, number, number, number, number];
  facing: 1 | -1;
  depth: number;
  visible: boolean;
}

/** One physical sheet as an SVG group. Place it where the flat artwork would go. */
export function PaperSheetSvg({ sheet, front, back, color, light: lightInput, view: viewInput, shading = 1, shadow = 1, showThrough = 1, edges = true, fibres = true, ...rest }: PaperSheetSvgProps) {
  const uid = "ps" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const light = resolvePaperLight(lightInput);
  const view = paperViewMatrix(viewInput);
  const viewDirection = [view[6], view[7], view[8]];
  const lightLength = Math.hypot(...light.direction) || 1;
  const lightDirection = light.direction.map((v) => v / lightLength);
  const T = sheet.transmittance;
  const stock = sheet.stock;
  const backColor = stock.back === "same" ? color : stock.back;
  const coreColor = stock.core === "dyed" ? mixHex(color, "#ffffff", 0.28) : stock.core;
  const shadeK = Math.max(0, Math.min(1, shading));
  const prepared: Prepared[] = sheet.facets.map((facet, index) => {
    const matrix = paperFacetMatrix(facet, view);
    const det = matrix[0] * matrix[3] - matrix[1] * matrix[2];
    return { facet, index, matrix, facing: paperFacing(facet, view), depth: paperFacetDepth(facet, view), visible: Math.abs(det) > 1e-4 };
  });
  const restFacets = prepared.filter((p) => p.facet.rest);
  const lifted = prepared.filter((p) => !p.facet.rest).sort((a, b) => a.depth - b.depth || a.index - b.index);

  // ---- Shadows -------------------------------------------------------------------------------------------------
  const strength = Math.max(0, Math.min(1, shadow));
  type Batch = { pass: PaperShadowPass; level: number; d: string[] };
  const area = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  let widest = 0;
  const shadowBatches = (facets: readonly Prepared[], plane: number): Batch[] => {
    const batches = new Map<string, Batch>();
    const add = (pass: PaperShadowPass, direction: ArrayLike<number>, sigmaOf: (h: number) => number) => {
      for (const p of facets) {
        for (const slice of paperShadowSlices(p.facet, direction, plane, view)) {
          const level = blurLevel(sigmaOf(slice.height));
          widest = Math.max(widest, BLUR_LEVELS[level]);
          for (const ring of slice.rings) {
            for (let i = 0; i < ring.length; i += 2) {
              area.minX = Math.min(area.minX, ring[i]);
              area.maxX = Math.max(area.maxX, ring[i]);
              area.minY = Math.min(area.minY, ring[i + 1]);
              area.maxY = Math.max(area.maxY, ring[i + 1]);
            }
          }
          const key = pass + level;
          const batch = batches.get(key) ?? { pass, level, d: [] };
          batch.d.push(ringsPath(slice.rings));
          batches.set(key, batch);
        }
      }
    };
    if (strength > 0) {
      // Ambient occlusion: the sky is blocked straight above the receiving plane.
      add("sky", [0, 0, 1], (h) => 0.45 * h + 0.6);
      add("key", light.direction, (h) => paperPenumbra(h, light) + 0.35);
    }
    return [...batches.values()];
  };
  // A sheet resting on its surface shares one plane with it: shadows fall on both after the flat paper is drawn.
  // A raised sheet shadows the surface below it, and its flaps shadow the flat part of the sheet.
  const support = sheet.support;
  const resting = support !== null && support <= 0.25;
  const under = support !== null && !resting ? shadowBatches(prepared, -support) : [];
  const over = shadowBatches(lifted, 0);
  const shadowFill = { key: paperShadowColor("key", light, T, color, strength), sky: paperShadowColor("sky", light, T, color, strength) };
  const usedLevels = new Set([...under, ...over].map((b) => b.level));
  const margin = widest * 3 + 2;
  const region = Number.isFinite(area.minX)
    ? { x: area.minX - margin, y: area.minY - margin, width: area.maxX - area.minX + 2 * margin, height: area.maxY - area.minY + 2 * margin }
    : { x: 0, y: 0, width: 1, height: 1 };
  const drawShadows = (batches: readonly Batch[], clip?: string) =>
    batches.length > 0 && (
      <g clipPath={clip} data-km-paper-shadow="">
        {batches.map((b) => (
          <path key={b.pass + b.level} d={b.d.join("")} fill={shadowFill[b.pass]} fillRule="evenodd" filter={`url(#${uid}-blur${b.level})`} style={{ mixBlendMode: "multiply" }} />
        ))}
      </g>
    );

  // ---- Facets --------------------------------------------------------------------------------------------------
  const fringesFor = (p: Prepared, face: "front" | "back"): PaperFringe[] =>
    sheet.fringes.filter((f) => f.face === face && p.facet.pieces[f.tear] === f.side);
  const defs: ReactNode[] = [];
  const facetNode = (p: Prepared) => {
    const { facet, facing } = p;
    const face = facing > 0 ? "front" : "back";
    const clipId = `${uid}-c${p.index}`;
    defs.push(
      <clipPath key={clipId} id={clipId} clipPathUnits="userSpaceOnUse">
        <path d={facetClipPath(facet, 0.75)} clipRule="evenodd" />
      </clipPath>,
    );
    // Shading across the band, from the visible normals at its two edges.
    const n0 = facing > 0 ? facet.normalFrom : neg(facet.normalFrom);
    const n1 = facing > 0 ? facet.normalTo : neg(facet.normalTo);
    const f0 = paperShade(n0, light, T);
    const f1 = paperShade(n1, light, T);
    const s0 = paperSheen(n0, light, viewDirection, stock.gloss);
    const s1 = paperSheen(n1, light, viewDirection, stock.gloss);
    const dark0 = Math.max(0, 1 - f0) * shadeK;
    const dark1 = Math.max(0, 1 - f1) * shadeK;
    const lite0 = Math.min(0.85, (Math.max(0, f0 - 1) * 0.55 + s0) * shadeK);
    const lite1 = Math.min(0.85, (Math.max(0, f1 - 1) * 0.55 + s1) * shadeK);
    const shadeNodes: ReactNode[] = [];
    const box = sheet.bounds;
    const pad = 4;
    const rect = { x: box.minX - pad, y: box.minY - pad, width: box.maxX - box.minX + 2 * pad, height: box.maxY - box.minY + 2 * pad };
    const overlay = (kind: "d" | "l", a: number, b: number, colour: string) => {
      if (a < 0.004 && b < 0.004) return;
      if (Math.abs(a - b) < 0.004) {
        shadeNodes.push(<rect key={kind} {...rect} fill={colour} opacity={(a + b) / 2} />);
        return;
      }
      const id = `${uid}-g${kind}${p.index}`;
      defs.push(
        <linearGradient key={id} id={id} gradientUnits="userSpaceOnUse" x1={fmt(facet.shadeFrom[0])} y1={fmt(facet.shadeFrom[1])} x2={fmt(facet.shadeTo[0])} y2={fmt(facet.shadeTo[1])}>
          <stop offset="0" stopColor={colour} stopOpacity={a} />
          <stop offset="1" stopColor={colour} stopOpacity={b} />
        </linearGradient>,
      );
      shadeNodes.push(<rect key={kind} {...rect} fill={`url(#${id})`} />);
    };
    overlay("d", dark0, dark1, "#000000");
    overlay("l", lite0, lite1, "#ffffff");
    const fringes = fibres ? fringesFor(p, face) : [];
    const hairs = fringes.flatMap((f) => f.hairs);
    let hairClip: string | undefined;
    if (hairs.length) {
      hairClip = `${uid}-e${p.index}`;
      defs.push(
        <clipPath key={hairClip} id={hairClip} clipPathUnits="userSpaceOnUse">
          <path d={ringsPath([facet.envelope])} />
        </clipPath>,
      );
    }
    // Print shows through in reflection by the stock's translucency, and strongly when lit from behind.
    const backlit = Math.max(0, -(n0[0] * lightDirection[0] + n0[1] * lightDirection[1] + n0[2] * lightDirection[2]));
    const throughOpacity = face === "back" ? Math.min(0.85, showThrough * (0.6 * (1 - stock.opacity) + backlit * T * 0.9)) : 0;
    return (
      <g key={"f" + p.index} transform={fmtMatrix(p.matrix)} data-km-paper-facet={facet.bend ?? "rest"} data-km-paper-face={face}>
        {p.visible && (
          <g clipPath={`url(#${clipId})`}>
            {/* Chromium clips each shape of a group separately, so layered artwork would leak at the anti-aliased
                edge (a light seam between bands). A group opacity makes it composite the facet first. */}
            <g opacity={0.9999}>
              <use href={`#${uid}-${face}`} />
              {throughOpacity > 0.01 && <use href={`#${uid}-front`} opacity={throughOpacity} />}
              {fringes.map((f, k) => f.feather.length > 4 && <path key={"f" + k} d={ringsPath([f.feather])} fill={coreColor} opacity={0.55} />)}
              {fringes.map((f, k) => f.bevel.length > 4 && <path key={"b" + k} d={ringsPath([f.bevel])} fill={coreColor} />)}
              {shadeNodes}
            </g>
          </g>
        )}
        {p.visible && hairs.length > 0 && (
          <g clipPath={`url(#${hairClip})`} fill="none" stroke={coreColor} strokeLinecap="round">
            {/* Fibres are 15–40 µm across: hairline strokes of varying strength. */}
            {hairs.map((h, k) => (
              <path key={k} d={`M${fmt(h[0])} ${fmt(h[1])}Q${fmt(h[2])} ${fmt(h[3])} ${fmt(h[4])} ${fmt(h[5])}`} strokeWidth={0.28 + (k % 3) * 0.1} opacity={0.45 + (k % 5) * 0.1} />
            ))}
          </g>
        )}
      </g>
    );
  };

  // ---- Edge thickness ------------------------------------------------------------------------------------------
  const wallNodes = (p: Prepared): ReactNode => {
    if (!edges || sheet.thickness < 0.05) return null;
    const { facet } = p;
    const t = sheet.thickness;
    const out: ReactNode[] = [];
    facet.rings.forEach((ring, r) => {
      const tags = facet.tags[r];
      const n = ring.length >> 1;
      let area = 0;
      for (let i = 0, j = n - 1; i < n; j = i, i += 1) area += ring[2 * j] * ring[2 * i + 1] - ring[2 * i] * ring[2 * j + 1];
      const orient = area >= 0 ? 1 : -1;
      for (let i = 0; i < n; i += 1) {
        if (tags[i] < 0) continue;
        const j = (i + 1) % n;
        const u0 = ring[2 * i];
        const v0 = ring[2 * i + 1];
        const u1 = ring[2 * j];
        const v1 = ring[2 * j + 1];
        const eu = u1 - u0;
        const ev = v1 - v0;
        const len = Math.hypot(eu, ev);
        if (len < 1e-6) continue;
        const f = facet.frame;
        const ou = (orient * ev) / len;
        const ov = (orient * -eu) / len;
        const wn = [f[0] * ou + f[3] * ov, f[1] * ou + f[4] * ov, f[2] * ou + f[5] * ov];
        if (wn[0] * viewDirection[0] + wn[1] * viewDirection[1] + wn[2] * viewDirection[2] <= 0.02) continue;
        const a = paperProject(view, paperFramePoint(f, u0, v0, 0));
        const b = paperProject(view, paperFramePoint(f, u1, v1, 0));
        const c = paperProject(view, paperFramePoint(f, u1, v1, -t));
        const d = paperProject(view, paperFramePoint(f, u0, v0, -t));
        const quad = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) + Math.abs((c[0] - a[0]) * (d[1] - a[1]) - (c[1] - a[1]) * (d[0] - a[0]));
        if (quad < 0.06) continue;
        const shade = paperShade(wn, light, T);
        out.push(<path key={`${r}-${i}`} d={`M${fmt(a[0])} ${fmt(a[1])}L${fmt(b[0])} ${fmt(b[1])}L${fmt(c[0])} ${fmt(c[1])}L${fmt(d[0])} ${fmt(d[1])}Z`} fill={scaleHex(coreColor, Math.min(1.15, shade * 0.92))} />);
      }
    });
    return out.length ? <g key={"w" + p.index} data-km-paper-edge="">{out}</g> : null;
  };

  const restNodes = restFacets.map((p) => (
    <Fragment key={"r" + p.index}>
      {facetNode(p)}
      {wallNodes(p)}
    </Fragment>
  ));
  const liftedNodes = lifted.map((p) => (
    <Fragment key={"l" + p.index}>
      {facetNode(p)}
      {wallNodes(p)}
    </Fragment>
  ));
  // Shadows cast on the sheet fall only where the sheet still lies flat.
  const restClip = `${uid}-rest`;
  const restClipNode = !resting && over.length > 0 && (
    <clipPath id={restClip} clipPathUnits="userSpaceOnUse">
      {restFacets.map((p) => (
        <path key={p.index} d={ringsPath(p.facet.rings)} clipRule="evenodd" transform={fmtMatrix(p.matrix)} />
      ))}
    </clipPath>
  );
  return (
    <g data-km-paper-sheet="" {...rest}>
      <defs>
        <g id={`${uid}-front`}>{front}</g>
        <g id={`${uid}-back`}>{back ?? <path d={sheet.outlinePath} fill={backColor} fillRule="evenodd" />}</g>
        {[...usedLevels].map((level) => (
          <filter key={level} id={`${uid}-blur${level}`} filterUnits="userSpaceOnUse" {...region} colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation={BLUR_LEVELS[level]} />
          </filter>
        ))}
        {restClipNode}
        {defs}
      </defs>
      {drawShadows(under)}
      {restNodes}
      {drawShadows(over, resting ? undefined : `url(#${restClip})`)}
      {liftedNodes}
    </g>
  );
}
