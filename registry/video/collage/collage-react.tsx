/**
 * COLLAGE1 renderer: one SVG per frame from a validated scene and an absolute frame number.
 *
 * Layer order inside every piece of paper: cast shadow → white fibre core / sticker backing → coloured
 * face → printed pattern and halftone shading → fibre texture → children. Lift raises a piece toward the
 * lens: its shadow moves away, softens and lightens. The board, vignette and grain frame the composition.
 */
import { Fragment, useId, useMemo } from "react";
import type { CSSProperties, ReactNode, SVGProps } from "react";
import type { Point } from "./collage-geometry";
import { seedOf, toPathD, trimPolyline } from "./collage-geometry";
import { cameraAt, cameraTransform, ease } from "./collage-motion";
import type { CollagePose } from "./collage-motion";
import {
  cutoutGeometry, formatCount, mapGeometry, textWeight, markerStrokes, nodeState, poseTransform, projectGeo, routePolyline, slipGeometry, textLayout,
  toSmoothPathD, wobbleStroke,
} from "./collage-build";
import type {
  CollageCutoutNode, CollageImageNode, CollageMapNode, CollageMarkerNode, CollageNode, CollagePaperMaterial, CollagePuppetNode,
  CollageRouteNode, CollageSceneSpec, CollageStringNode, CollageTapeNode, CollageTextNode,
} from "./collage-scene";
import { assertCollageScene, paint } from "./collage-scene";
import { BOARD_COLORS, boardTexture, fiberTexture, grainTexture, halftoneDotTile } from "./collage-texture";
import { fontStack } from "./collage-type";
import type { PuppetPoint } from "./collage-puppet";
import { PUPPET_RIG, ellipseOutline, hairOutline, headOutline, limbOutline, puppetPose, shadeHex, shoeOutline, torsoOutline } from "./collage-puppet";
import { paperEdge } from "./collage-geometry";

export interface CollageSceneProps extends Omit<SVGProps<SVGSVGElement>, "width" | "height" | "viewBox" | "children"> {
  spec: CollageSceneSpec;
  frame: number;
  /** Show the settled final composition: no motion, every piece in place. */
  reducedMotion?: boolean;
  /** Turn off board grain, vignette and fibre overlays (for very small previews). */
  plain?: boolean;
  style?: CSSProperties;
}

const BLUR_LEVELS = [.7, 1.2, 1.8, 2.6, 3.6, 4.8, 6.2, 8, 10.5, 13.5];
const FIBRE: Record<CollagePaperMaterial, number> = { paper: .5, card: .42, kraft: .85, newsprint: .45, tissue: .32, glossy: .14 };

interface Ctx {
  spec: CollageSceneSpec;
  frame: number;
  uid: string;
  children: Map<string, CollageNode[]>;
  byId: Map<string, CollageNode>;
  /** Accumulated world rotation (deg) and scale, for screen-space shadow direction. */
  rot: number; scale: number; mirror: number;
  map?: CollageMapNode;
  plain: boolean;
  light: number;
}

const r2 = (v: number) => Math.round(v * 100) / 100;

/** Shadow offset in the node's local space so it always falls the same way on screen. */
function shadowFor(ctx: Ctx, lift: number, strength: number) {
  const distance = (2 + Math.max(0, lift) * 15) / Math.max(.05, ctx.scale);
  const a = (ctx.light - ctx.rot) * Math.PI / 180;
  const level = Math.min(BLUR_LEVELS.length - 1, Math.round(Math.max(0, lift) * 5));
  return {
    dx: Math.cos(a) * distance * ctx.mirror, dy: Math.sin(a) * distance,
    opacity: strength * Math.max(.1, .36 - Math.max(0, lift) * .1),
    filter: `url(#${ctx.uid}-blur-${level})`,
  };
}

function ShadowPath({ ctx, d, lift, strength }: { ctx: Ctx; d: string; lift: number; strength: number }) {
  if (strength <= 0) return null;
  const s = shadowFor(ctx, lift, strength);
  return <path d={d} fill="#1c1208" opacity={r2(s.opacity)} transform={`translate(${r2(s.dx)} ${r2(s.dy)})`} filter={s.filter} />;
}

function FibreOverlay({ ctx, d, material }: { ctx: Ctx; d: string; material: CollagePaperMaterial }) {
  if (ctx.plain) return null;
  return <path d={d} fill={`url(#${ctx.uid}-fibre)`} opacity={FIBRE[material]} style={{ mixBlendMode: "soft-light" }} />;
}

// ---- Cutouts ---------------------------------------------------------------------------------------------------------------------

function Cutout({ ctx, node, lift }: { ctx: Ctx; node: CollageCutoutNode; lift: number }) {
  const g = cutoutGeometry(node, ctx.spec.seed);
  const fill = paint(ctx.spec, node.fill), material = node.material ?? "paper";
  const clip = `${ctx.uid}-clip-${node.id}`;
  const coreColor = paint(ctx.spec, node.backing?.color, "#f6f1e6");
  const pattern = node.pattern;
  return <>
    <ShadowPath ctx={ctx} d={g.silhouette} lift={lift} strength={node.shadow ?? 1} />
    {g.core && <path d={g.core} fill={coreColor} />}
    {g.core && !ctx.plain && <path d={g.core} fill={`url(#${ctx.uid}-fibre)`} opacity={.35} style={{ mixBlendMode: "soft-light" }} />}
    <path d={g.face} fill={fill} opacity={material === "tissue" ? .84 : 1} />
    {(pattern || g.dots) && <clipPath id={clip}><path d={g.face} /></clipPath>}
    {pattern && <g clipPath={`url(#${clip})`} opacity={pattern.opacity ?? .5}>
      <PatternRules box={g.box} type={pattern.type} color={paint(ctx.spec, pattern.color)} spacing={pattern.spacing ?? 18} angle={pattern.angle ?? 0} />
    </g>}
    {g.dots && <path d={g.dots} clipPath={`url(#${clip})`} fill={paint(ctx.spec, node.halftone!.color)} opacity={node.halftone!.opacity ?? .9} />}
    {node.stroke && <path d={g.face} fill="none" stroke={paint(ctx.spec, node.stroke.color)} strokeWidth={node.stroke.width} strokeLinejoin="round" />}
    {material === "card" && <path d={g.face} fill="none" stroke={shadeHex(fill, -.3)} strokeWidth={1.1} opacity={.45} />}
    {material === "glossy" && <path d={g.face} fill={`url(#${ctx.uid}-sheen)`} opacity={.55} />}
    <FibreOverlay ctx={ctx} d={g.face} material={material} />
  </>;
}

function PatternRules({ box, type, color, spacing, angle }: { box: { x: number; y: number; width: number; height: number }; type: string; color: string; spacing: number; angle: number }) {
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2, reach = Math.hypot(box.width, box.height) / 2 + spacing;
  const parts: string[] = [];
  for (let v = -reach; v <= reach; v += spacing) {
    if (type === "lines" || type === "grid" || type === "stripes") parts.push(`M${r2(cx - reach)} ${r2(cy + v)}H${r2(cx + reach)}`);
    if (type === "grid") parts.push(`M${r2(cx + v)} ${r2(cy - reach)}V${r2(cy + reach)}`);
  }
  if (type === "dots") {
    const dots: ReactNode[] = [];
    for (let x = -reach; x <= reach; x += spacing) for (let y = -reach; y <= reach; y += spacing) dots.push(`M${r2(cx + x - 1.3)} ${r2(cy + y)}a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0 -2.6 0`);
    return <path d={dots.join("")} fill={color} transform={`rotate(${angle} ${cx} ${cy})`} />;
  }
  return <path d={parts.join("")} stroke={color} strokeWidth={type === "stripes" ? spacing / 2 : 1} fill="none" transform={`rotate(${angle} ${cx} ${cy})`} />;
}

// ---- Type ------------------------------------------------------------------------------------------------------------------------

function TextPiece({ ctx, node, state }: { ctx: Ctx; node: CollageTextNode; state: { sampled: number; step: number; lift: number } }) {
  const layout = textLayout(node);
  const role = node.role ?? "body", size = node.size, family = fontStack(role, ctx.spec.fonts);
  const color = paint(ctx.spec, node.color);
  const f = state.sampled;
  const slip = node.slip, pad = slip?.padding ?? size * (role === "headline" ? .16 : .3);
  const reveal = node.reveal, revealDur = reveal?.duration ?? (reveal?.preset === "type" ? 1 : 9);
  const wordProgress = (index: number, letters = 0) => {
    if (!reveal) return 1;
    const unit = reveal.by === "letter" ? letters : reveal.by === "line" ? 0 : index;
    return Math.min(1, Math.max(0, (f - (reveal.frame + unit * reveal.stagger)) / revealDur));
  };
  // Letter index at the start of each word, for letter-by-letter reveals.
  const letterStart: number[] = [];
  let lc = 0;
  for (const line of layout.lines) for (const w of line.words) { letterStart[w.index] = lc; lc += [...w.text].length; }
  const lineProgress = (li: number) => {
    if (!reveal) return 1;
    if (reveal.by === "line") return Math.min(1, Math.max(0, (f - (reveal.frame + li * reveal.stagger)) / revealDur));
    const first = layout.lines[li].words[0];
    if (!first) return 1;
    const start = reveal.frame + (reveal.by === "letter" ? letterStart[first.index] : first.index) * reveal.stagger - 3;
    return Math.min(1, Math.max(0, (f - start) / 7));
  };
  const seed = seedOf(node.id, ctx.spec.seed);
  const counted = node.count ? formatCount(node.count.from + (node.count.to - node.count.from) * ease(node.count.ease ?? "out", (f - node.count.frame) / node.count.duration), node.count.decimals, node.count.separator) : undefined;
  const content: ReactNode[] = [];
  const top = -layout.ascent - pad * .8, height = layout.ascent + layout.descent + pad * 1.6;

  layout.lines.forEach((line, li) => {
    // Paper slips: one per line, or one per word.
    if (slip && !slip.perWord && line.words.length) {
      const p = lineProgress(li);
      if (p > 0) {
        const g = slipGeometry(node, "l" + li, line.x - pad, line.y + top, line.width + pad * 2, height, ctx.spec.seed);
        const tilt = (slip.jitter ?? .6) * Math.sin(seed + li * 2.3);
        content.push(<g key={"slip" + li} transform={`rotate(${r2(tilt)} ${r2(line.x)} ${r2(line.y)}) translate(${r2(line.x - pad)} 0) scale(${r2(Math.max(.001, ease("out", p)))} 1) translate(${r2(-(line.x - pad))} 0)`}>
          <ShadowPath ctx={ctx} d={g.silhouette} lift={state.lift} strength={1} />
          {g.core && <path d={g.core} fill={paint(ctx.spec, slip.backing?.color, "#f6f1e6")} />}
          <path d={g.face} fill={paint(ctx.spec, slip.fill)} />
          <FibreOverlay ctx={ctx} d={g.face} material={slip.material ?? "paper"} />
        </g>);
      }
    }
  });
  // Highlighter sweeps behind the chosen words, line by line in reading order.
  if (node.highlight) {
    const [a, b] = node.highlight.words ?? [0, Number.MAX_SAFE_INTEGER];
    const spans = layout.lines.map(line => {
      const ws = line.words.filter(w => w.index >= a && w.index <= b);
      return ws.length ? { x0: ws[0].x, x1: ws[ws.length - 1].x + ws[ws.length - 1].width, y: line.y } : undefined;
    }).filter((s): s is { x0: number; x1: number; y: number } => !!s);
    const total = spans.reduce((s, q) => s + q.x1 - q.x0, 0) || 1;
    let consumed = 0;
    const p = ease("inOut", (f - node.highlight.frame) / node.highlight.duration) * total;
    spans.forEach((s, i) => {
      const len = s.x1 - s.x0, show = Math.min(len + size * .3, Math.max(0, p - consumed) * (len + size * .3) / len);
      consumed += len;
      if (show <= 0) return;
      const x0 = s.x0 - size * .15, h = layout.ascent * (role === "headline" ? .74 : .82), y0 = s.y - layout.ascent * (role === "headline" ? .72 : .7);
      const ragged = `M${r2(x0)} ${r2(y0 + 2)}L${r2(x0 + show)} ${r2(y0 - 1)}L${r2(x0 + show - 3)} ${r2(y0 + h + 1)}L${r2(x0 + 2)} ${r2(y0 + h + 3)}Z`;
      content.push(<path key={"hl" + i} d={ragged} fill={paint(ctx.spec, node.highlight!.color)} opacity={.82} style={{ mixBlendMode: "multiply" }} />);
    });
  }
  layout.lines.forEach(line => {
    for (const w of line.words) {
      const letters = [...w.text];
      const p = wordProgress(w.index, letterStart[w.index]);
      const text = counted !== undefined && node.text.includes("{n}") ? undefined : w.text;
      const preset = reveal?.preset ?? "drop";
      if (reveal?.by === "letter" || preset === "type") {
        // Per-letter: typewriter shows each letter instantly; other presets animate each glyph.
        let x = w.x;
        letters.forEach((ch, k) => {
          const lp = reveal ? Math.min(1, Math.max(0, (f - (reveal.frame + (reveal.by === "word" ? w.index : letterStart[w.index] + k) * reveal.stagger)) / (preset === "type" ? 1 : revealDur))) : 1;
          const cw = (w.width / Math.max(1, letters.length));
          if (lp > 0) content.push(<WordGlyph key={"c" + w.index + "-" + k} text={ch} x={x} y={line.y} progress={lp} preset={preset} family={family} size={size} color={color} node={node} />);
          x += cw;
        });
        continue;
      }
      if (p <= 0) continue;
      if (slip?.perWord) {
        const g = slipGeometry(node, "w" + w.index, w.x - pad, line.y + top, w.width + pad * 2, height, ctx.spec.seed);
        const tilt = ((slip.jitter ?? 1.6) * Math.sin(seed * .001 + w.index * 1.7));
        const o = wordOffsets(preset, p);
        content.push(<g key={"ws" + w.index} opacity={o.opacity} transform={`translate(${r2(w.x + w.width / 2 + o.x)} ${r2(line.y - layout.ascent / 2 + o.y)}) rotate(${r2(tilt + o.rotate)}) scale(${r2(o.scale)}) translate(${r2(-(w.x + w.width / 2))} ${r2(-(line.y - layout.ascent / 2))})`}>
          <ShadowPath ctx={ctx} d={g.silhouette} lift={state.lift + o.lift} strength={1} />
          {g.core && <path d={g.core} fill={paint(ctx.spec, slip.backing?.color, "#f6f1e6")} />}
          <path d={g.face} fill={paint(ctx.spec, slip.fill)} />
          <FibreOverlay ctx={ctx} d={g.face} material={slip.material ?? "paper"} />
          <text x={r2(w.x)} y={r2(line.y)} fontFamily={family} fontSize={size} fontWeight={textWeight(node)}
            fontStyle={node.italic ? "italic" : undefined} letterSpacing={node.letterSpacing} fill={color}>{text ?? counted}</text>
        </g>);
      } else content.push(<WordGlyph key={"w" + w.index} text={text ?? counted ?? ""} x={w.x} y={line.y} progress={p} preset={preset} family={family} size={size} color={color} node={node} />);
    }
  });
  return <>{content}</>;
}
function wordOffsets(preset: string, p: number) {
  const t = Math.min(1, Math.max(0, p));
  switch (preset) {
    case "pop": return { x: 0, y: 0, rotate: 0, scale: Math.max(.001, ease("back", t)), opacity: Math.min(1, t * 3), lift: 0 };
    case "stamp": return { x: 0, y: 0, rotate: -4 * (1 - ease("snap", t)), scale: 1 + .8 * (1 - ease("snap", t)), opacity: Math.min(1, t * 5), lift: (1 - t) * .8 };
    case "fade": return { x: 0, y: 0, rotate: 0, scale: 1, opacity: ease("inOut", t), lift: 0 };
    case "type": return { x: 0, y: 0, rotate: 0, scale: 1, opacity: t > 0 ? 1 : 0, lift: 0 };
    default: return { x: 0, y: -18 * (1 - ease("out", t)), rotate: 5 * (1 - ease("back", t)), scale: 1 + .08 * (1 - ease("out", t)), opacity: Math.min(1, t * 4), lift: (1 - t) * 1.2 };
  }
}
function WordGlyph({ text, x, y, progress, preset, family, size, color, node }: { text: string; x: number; y: number; progress: number; preset: string; family: string; size: number; color: string; node: CollageTextNode }) {
  const o = wordOffsets(preset, progress), cx = x, cy = y - size * .35;
  return <text x={r2(x)} y={r2(y)} fontFamily={family} fontSize={size} fontWeight={textWeight(node)}
    fontStyle={node.italic ? "italic" : undefined} letterSpacing={node.letterSpacing} fill={color} opacity={r2(o.opacity)}
    transform={o.scale !== 1 || o.rotate || o.x || o.y ? `translate(${r2(cx + o.x)} ${r2(cy + o.y)}) rotate(${r2(o.rotate)}) scale(${r2(o.scale)}) translate(${r2(-cx)} ${r2(-cy)})` : undefined}>{text}</text>;
}

// ---- Marker, tape, image ---------------------------------------------------------------------------------------------------------

function Marker({ ctx, node, progress, step }: { ctx: Ctx; node: CollageMarkerNode; progress: number; step: number }) {
  const strokes = markerStrokes(node, ctx.spec.seed);
  const seed = seedOf(node.id, ctx.spec.seed), tool = node.tool ?? "marker";
  const wobble = node.wobble ?? (tool === "highlighter" ? .6 : 1.1);
  const lengths = strokes.map(s => s.reduce((a, p, i) => i ? a + Math.hypot(p[0] - s[i - 1][0], p[1] - s[i - 1][1]) : 0, 0));
  const total = lengths.reduce((a, b) => a + b, 0) || 1;
  let budget = Math.max(0, Math.min(1, progress)) * total;
  const color = paint(ctx.spec, node.color);
  // Marker lines boil on twos, even when the rest of the scene is on ones.
  const held = Math.floor(step / 2);
  const paths = strokes.map((s, i) => {
    if (budget <= 0) return null;
    const portion = Math.min(1, budget / (lengths[i] || 1));
    budget -= lengths[i];
    const pts = trimPolyline(wobbleStroke(s, seed + i * 5, held, wobble), portion);
    return pts.length > 1 ? toSmoothPathD(pts, false) : null;
  }).filter((d): d is string => !!d);
  if (!paths.length) return null;
  const d = paths.join("");
  if (tool === "highlighter") return <path d={d} fill="none" stroke={color} strokeWidth={node.width} strokeLinecap="butt" strokeLinejoin="round" opacity={.62} style={{ mixBlendMode: "multiply" }} />;
  if (tool === "pencil") return <path d={d} fill="none" stroke={color} strokeWidth={node.width} strokeLinecap="round" opacity={.78} strokeDasharray={node.dash?.join(" ")} filter={`url(#${ctx.uid}-graphite)`} />;
  return <g>
    <path d={d} fill="none" stroke={color} strokeWidth={node.width} strokeLinecap="round" strokeLinejoin="round" opacity={tool === "brush" ? .96 : .93} strokeDasharray={node.dash?.join(" ")} />
    {/* Felt-tip streak: a lighter core where the nib skips. */}
    {!node.dash && <path d={d} fill="none" stroke="#ffffff" strokeWidth={Math.max(.5, node.width * .18)} strokeLinecap="round" opacity={.12} transform={`translate(${r2(node.width * .12)} ${r2(-node.width * .12)})`} />}
  </g>;
}

const tapeCache = new WeakMap<object, { face: string }>();
function Tape({ ctx, node, lift }: { ctx: Ctx; node: CollageTapeNode; lift: number }) {
  let g = tapeCache.get(node);
  const w = node.width ?? 34, L = node.length;
  if (!g) {
    const seed = seedOf(node.id, ctx.spec.seed), pts: Point[] = [];
    // Torn zig-zag ends, long straight sides.
    const teeth = Math.max(4, Math.round(w / 5));
    for (let k = 0; k <= teeth; k++) pts.push([L / 2 + ((k % 2) ? 2.6 : -.6) + Math.sin(seed + k) * .8, -w / 2 + k * w / teeth]);
    for (let k = 0; k <= teeth; k++) pts.push([-L / 2 + ((k % 2) ? -2.6 : .6) + Math.sin(seed * 3 + k) * .8, w / 2 - k * w / teeth]);
    g = { face: toPathD(pts, true) };
    tapeCache.set(node, g);
  }
  const color = paint(ctx.spec, node.color, "#e8dcb8");
  return <>
    <ShadowPath ctx={ctx} d={g.face} lift={lift * .5} strength={(node.shadow ?? .5)} />
    <path d={g.face} fill={color} opacity={.8} />
    <path d={`M${-L / 2 + 4} ${-w * .18}L${L / 2 - 4} ${-w * .22}`} stroke="#ffffff" strokeWidth={w * .22} opacity={.16} />
    <FibreOverlay ctx={ctx} d={g.face} material="tissue" />
  </>;
}

function ImagePiece({ ctx, node, lift }: { ctx: Ctx; node: CollageImageNode; lift: number }) {
  const shape = node.mask ?? { type: "rect" as const, width: node.width, height: node.height };
  const g = cutoutGeometry({ id: node.id, shape, edge: node.edge ?? "cut", backing: node.backing }, ctx.spec.seed);
  const clip = `${ctx.uid}-img-${node.id}`;
  return <>
    <ShadowPath ctx={ctx} d={g.silhouette} lift={lift} strength={node.shadow ?? 1} />
    {g.core && <path d={g.core} fill={paint(ctx.spec, node.backing?.color, "#f6f1e6")} />}
    <clipPath id={clip}><path d={g.face} /></clipPath>
    <image href={node.href} x={-node.width / 2} y={-node.height / 2} width={node.width} height={node.height} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clip})`} />
    <FibreOverlay ctx={ctx} d={g.face} material="glossy" />
  </>;
}

// ---- Map, route, string ----------------------------------------------------------------------------------------------------------

/** A map with `water` is a torn paper sheet; land, regions and child pieces are clipped to that sheet. */
function mapSheet(node: CollageMapNode, seed: number) {
  return node.water ? cutoutGeometry({ id: node.id + "-sheet", shape: { type: "rect", width: node.width, height: node.height }, edge: node.edge ?? "torn", roughness: 4.5 }, seed) : undefined;
}
function MapPiece({ ctx, node, lift }: { ctx: Ctx; node: CollageMapNode; lift: number }) {
  const g = mapGeometry(node, ctx.spec.seed);
  const land = node.land === false ? undefined : paint(ctx.spec, node.land ?? "#e9e0c7");
  const clip = `${ctx.uid}-map-${node.id}`, sheet = mapSheet(node, ctx.spec.seed);
  return <>
    <clipPath id={clip}>{sheet ? <path d={sheet.face} /> : <rect x={-node.width / 2} y={-node.height / 2} width={node.width} height={node.height} />}</clipPath>
    {sheet && <>
      <ShadowPath ctx={ctx} d={sheet.silhouette} lift={lift} strength={node.shadow ?? 1} />
      {sheet.core && <path d={sheet.core} fill="#f6f1e6" />}
      <path d={sheet.face} fill={paint(ctx.spec, node.water)} />
      <FibreOverlay ctx={ctx} d={sheet.face} material="paper" />
    </>}
    <g clipPath={`url(#${clip})`}>
      {land && <>
        <ShadowPath ctx={ctx} d={g.core.join("")} lift={lift} strength={node.shadow ?? .8} />
        <path d={g.core.join("")} fill="#f6f1e6" />
        <path d={g.land.join("")} fill={land} />
        <FibreOverlay ctx={ctx} d={g.land.join("")} material="paper" />
      </>}
      {g.regions.map(r => <Fragment key={r.id}>
        <ShadowPath ctx={ctx} d={r.core} lift={lift + .25} strength={.9} />
        <path d={r.core} fill="#f6f1e6" />
        <path d={r.face} fill={paint(ctx.spec, r.fill)} />
        <FibreOverlay ctx={ctx} d={r.face} material="paper" />
      </Fragment>)}
      {node.graticule && g.graticule && <path d={g.graticule} stroke={paint(ctx.spec, node.graticule.color)} strokeWidth={1.2} strokeDasharray="2 5" opacity={node.graticule.opacity ?? .3} fill="none" />}
    </g>
  </>;
}

function RoutePiece({ ctx, node, progress }: { ctx: Ctx; node: CollageRouteNode; progress: number }) {
  const pts = routePolyline(node, ctx.map);
  const shown = trimPolyline(pts, progress);
  if (shown.length < 2) return null;
  const d = toPathD(shown, false), color = paint(ctx.spec, node.color);
  return <>
    <path d={d} fill="none" stroke="#1c1208" strokeWidth={node.width} strokeLinecap="round" strokeDasharray={node.dash?.join(" ")} opacity={.18} transform="translate(1.5 2.5)" />
    <path d={d} fill="none" stroke={color} strokeWidth={node.width} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={node.dash?.join(" ")} />
  </>;
}

function StringPiece({ ctx, node, progress, resolve }: { ctx: Ctx; node: CollageStringNode; progress: number; resolve: (e: string) => Point }) {
  const [a, b] = node.ends.map(e => typeof e === "string" ? resolve(e) : [e[0], e[1]] as Point);
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]), sag = (node.sag ?? .08) * len;
  const pts: Point[] = [];
  for (let k = 0; k <= 40; k++) { const t = k / 40; pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + 4 * t * (1 - t) * sag]); }
  const shown = trimPolyline(pts, progress);
  if (shown.length < 2) return null;
  const d = toPathD(shown, false), color = paint(ctx.spec, node.color, "#b3231d");
  return <>
    <path d={d} fill="none" stroke="#1c1208" strokeWidth={(node.width ?? 3)} opacity={.22} transform="translate(2 4)" filter={`url(#${ctx.uid}-blur-1)`} />
    <path d={d} fill="none" stroke={color} strokeWidth={node.width ?? 3} strokeLinecap="round" />
    <path d={d} fill="none" stroke="#ffffff" strokeWidth={(node.width ?? 3) * .25} opacity={.25} strokeDasharray="3 4" />
  </>;
}

// ---- Puppet ----------------------------------------------------------------------------------------------------------------------

const puppetCache = new WeakMap<object, Record<string, string>>();
function puppetParts(node: CollagePuppetNode, sceneSeed: number): Record<string, string> {
  const hit = puppetCache.get(node);
  if (hit) return hit;
  const seed = seedOf(node.id, sceneSeed);
  const cut = (pts: readonly PuppetPoint[], k: number) => toPathD(paperEdge(pts as Point[], { style: "cut", seed: seed + k * 31, roughness: .35 }), true);
  const { thigh, shin, upperArm, forearm } = PUPPET_RIG, build = node.look.build ?? .4;
  const hair = hairOutline(node.look.hairStyle ?? "short");
  const parts: Record<string, string> = {
    torso: cut(torsoOutline(node.look), 1),
    head: cut(headOutline(), 2),
    neck: cut([[-2.1, -1], [2.3, -1], [2.1, 5.4], [-1.9, 5.4]], 3),
    thigh: cut(limbOutline(thigh, 7.6 + build * 1.4, 6.4), 4),
    shin: cut(limbOutline(shin, 6.2, 5.2), 5),
    upper: cut(limbOutline(upperArm, 5.9 + build * 1.2, 5), 6),
    fore: cut(limbOutline(forearm, 4.9, 4.2), 7),
    hand: cut(ellipseOutline(0, 0, PUPPET_RIG.hand, PUPPET_RIG.hand * 1.08, 16), 8),
    shoe: cut(shoeOutline(), 9),
    ear: cut(ellipseOutline(0, 0, 1.5, 2.1, 12), 10),
  };
  if (hair.front) parts.hairFront = cut(hair.front, 11);
  if (hair.back) parts.hairBack = cut(hair.back, 12);
  puppetCache.set(node, parts);
  return parts;
}

function Puppet({ ctx, node, frame, attach }: { ctx: Ctx; node: CollagePuppetNode; frame: number; attach: (part: string) => ReactNode }) {
  const H = node.height ?? 320, u = H / 100;
  const parts = puppetParts(node, ctx.spec.seed);
  const look = node.look, seed = seedOf(node.id, ctx.spec.seed);
  const col = (v: string | undefined, fb: string) => paint(ctx.spec, v, fb);
  const skin = col(look.skin, "#d9a07a"), hair = col(look.hair, "#2b211c"), top = col(look.top, "#3b6fb6"), bottom = col(look.bottom, "#2f3340"), shoes = col(look.shoes, "#1f1b18");
  const accent = col(look.accent, "#c8342b");
  const pose = puppetPose(node.actions, frame, seed, u, 0, node.facing ?? 1);
  const back = (c: string) => shadeHex(c, -.2);
  const deg = (v: number) => r2(v);
  const face = Math.sign(pose.facing) || 1;
  const part = (d: string, fill: string, key: string, lift = .12, rot = 0) => <Fragment key={key}>
    <ShadowPath ctx={{ ...ctx, scale: ctx.scale * u, rot: ctx.rot + rot * face * ctx.mirror, mirror: ctx.mirror * face }} d={d} lift={lift} strength={.55} />
    <path d={d} fill={fill} />
    <FibreOverlay ctx={ctx} d={d} material="paper" />
  </Fragment>;
  const brad = (x: number, y: number, key: string) => look.brads ? <g key={key}>
    <circle cx={x} cy={y} r={.95} fill="#c7ab6a" stroke="#7a5f2a" strokeWidth={.25} />
    <circle cx={x - .3} cy={y - .3} r={.3} fill="#f4e5b8" opacity={.8} />
  </g> : null;
  const sleeves = look.shortSleeves;
  const arm = (which: "front" | "back") => {
    const a = which === "front" ? pose.armFront : pose.armBack, [sx, sy] = which === "front" ? PUPPET_RIG.shoulderFront : PUPPET_RIG.shoulderBack;
    const tone = (c: string) => which === "front" ? c : back(c);
    return <g key={"arm-" + which} transform={`translate(${sx} ${sy - PUPPET_RIG.hips[1] - a.lift}) rotate(${deg(-a.shoulder)})`}>
      {part(parts.upper, tone(top), "u", .12, pose.lean - a.shoulder)}
      <g transform={`translate(0 ${PUPPET_RIG.upperArm}) rotate(${deg(-a.elbow)})`}>
        {part(parts.fore, tone(sleeves ? skin : top), "f", .12, pose.lean - a.shoulder - a.elbow)}
        <g transform={`translate(0 ${PUPPET_RIG.forearm + 1.2})`}>
          {part(parts.hand, tone(skin), "h", .12, pose.lean - a.shoulder - a.elbow)}
          <g transform={`scale(${r2(1 / u)})`}>{attach("hand-" + which)}</g>
        </g>
        {which === "front" && brad(0, 0, "be")}
      </g>
      {which === "front" && brad(0, 0, "bs")}
    </g>;
  };
  const leg = (which: "front" | "back") => {
    const l = which === "front" ? pose.legFront : pose.legBack, [hx] = which === "front" ? PUPPET_RIG.hipFront : PUPPET_RIG.hipBack;
    const tone = (c: string) => which === "front" ? c : back(c);
    const dress = look.topStyle === "dress";
    return <g key={"leg-" + which} transform={`translate(${hx} 0) rotate(${deg(-l.hip)})`}>
      {part(parts.thigh, tone(dress ? skin : bottom), "t", .12, -l.hip)}
      <g transform={`translate(0 ${PUPPET_RIG.thigh}) rotate(${deg(l.knee)})`}>
        {part(parts.shin, tone(dress ? skin : bottom), "s", .12, l.knee - l.hip)}
        <g transform={`translate(0 ${PUPPET_RIG.shin}) rotate(${deg(l.hip - l.knee)})`}>{part(parts.shoe, tone(shoes), "sh")}</g>
        {which === "front" && brad(0, 0, "bk")}
      </g>
      {which === "front" && brad(0, 0, "bh")}
    </g>;
  };
  const [nx, ny] = PUPPET_RIG.neck, [hx, hy] = PUPPET_RIG.head;
  const neckY = ny - PUPPET_RIG.hips[1];
  const headGroup = (backOnly: boolean) => <g key={backOnly ? "hb" : "hf"} transform={`translate(${nx} ${neckY}) rotate(${deg(pose.head)}) translate(${hx - nx} ${hy - ny})`}>
    {backOnly ? (parts.hairBack ? part(parts.hairBack, back(hair), "hairb", .1) : null) : <>
      {part(parts.head, skin, "head", .16, pose.lean + pose.head)}
      <g transform="translate(-1.6 .8)">{part(parts.ear, shadeHex(skin, -.08), "ear", .05)}</g>
      {/* Face: one eye in profile, brow, cheek and a mouth that opens on syllables. */}
      {pose.eyes > .5
        ? <ellipse cx={5.3} cy={-1.5} rx={.95} ry={1.25} fill="#1d1715" />
        : <path d="M4.1 -1.2Q5.3 -.4 6.5 -1.2" stroke="#1d1715" strokeWidth={.55} fill="none" strokeLinecap="round" />}
      <path d="M3.9 -4.5Q5.4 -5.5 7.1 -4.7" stroke={shadeHex(hair, -.1)} strokeWidth={.75} fill="none" strokeLinecap="round" />
      <circle cx={4.2} cy={2.8} r={1.9} fill="#e0605a" opacity={.22} />
      {pose.mouth > .15
        ? <ellipse cx={7.1} cy={5.6} rx={1.2 + pose.mouth * .4} ry={.35 + pose.mouth * 1.3} fill="#3b1714" />
        : <path d="M5.9 5.4Q7.1 6.2 8.2 5.3" stroke="#3b1714" strokeWidth={.5} fill="none" strokeLinecap="round" />}
      {look.accessory === "glasses" && <g fill="none" stroke="#1d1715" strokeWidth={.45}><circle cx={5.4} cy={-1.4} r={2.5} /><path d="M2.9 -1.8L-1.4 -2.6" /></g>}
      {parts.hairFront && part(parts.hairFront, hair, "hairf", .1)}
      {look.hairStyle === "cap" && <path d={`M${-PUPPET_RIG.headRx - .6} ${1.4}Q0 ${-PUPPET_RIG.headRy * .32} ${PUPPET_RIG.headRx * .98} ${-PUPPET_RIG.headRy * .14}`} stroke={accent} strokeWidth={1.6} fill="none" />}
      <g transform={`scale(${r2(1 / u)})`}>{attach("head")}</g>
    </>}
  </g>;
  const hipsY = PUPPET_RIG.hips[1] + pose.hipsY;
  const jump = Math.max(0, -pose.y / u);
  return <g transform={`translate(${r2(pose.x)} ${r2(pose.y)})`}>
    {/* Contact shadow on the board: tight when standing, wide and faint in the air. */}
    <ellipse cx={0} cy={-pose.y} rx={(13 + jump * .4) * u} ry={2.4 * u} fill="#1c1208" opacity={r2(Math.max(.05, .22 - jump * .006))} filter={`url(#${ctx.uid}-blur-4)`} />
    <g transform={`scale(${r2(pose.facing * u)} ${r2(u)})`}>
      <g transform={`translate(0 ${r2(hipsY)})`}>
        <g transform={`rotate(${deg(pose.lean)})`}>
          {arm("back")}
          {headGroup(true)}
          {look.accessory === "satchel" && <g><path d="M-9 4L-12 14L-3 15L-1 5Z" fill={shadeHex(accent, -.25)} /></g>}
        </g>
        {leg("back")}
        {leg("front")}
        <g transform={`rotate(${deg(pose.lean)})`}>
          {part(parts.neck, shadeHex(skin, -.1), "neck", .05)}
          <g transform={`translate(0 0)`}>{part(parts.torso, top, "torso", .18)}</g>
          {/* Clothing details printed on the torso paper. */}
          <path d={`M-2.6 ${neckY + 2.4}L1.6 ${neckY + 6.6}L5 ${neckY + 2.2}Z`} fill={look.accessory === "scarf" ? accent : shadeHex(top, .5)} opacity={.95} />
          {look.accessory === "tie" && <path d={`M1 ${neckY + 4}L3 ${neckY + 4}L3.6 ${neckY + 17}L2 ${neckY + 19.5}L.4 ${neckY + 17}Z`} fill={accent} />}
          {look.accessory === "scarf" && <path d={`M-4 ${neckY + 1.6}Q2 ${neckY + 5.4} 6.6 ${neckY + 1.2}L6.4 ${neckY + 4.2}Q2 ${neckY + 7.4} -3.6 ${neckY + 4.4}Z M3 ${neckY + 4}L5.4 ${neckY + 15}L2.4 ${neckY + 15}Z`} fill={accent} />}
          {look.accessory === "satchel" && <path d={`M-6 ${neckY + 3}L9 ${neckY + 22}`} stroke={shadeHex(accent, -.35)} strokeWidth={1.4} />}
          {look.topStyle === "coat" && <path d={`M1.6 ${neckY + 6}L1.2 12`} stroke={shadeHex(top, -.35)} strokeWidth={.5} opacity={.7} />}
          {headGroup(false)}
          <g transform={`scale(${r2(1 / u)})`}>{attach("torso")}</g>
          {arm("front")}
        </g>
        <g transform={`scale(${r2(1 / u)})`}>{attach("hips")}</g>
      </g>
    </g>
  </g>;
}

// ---- Scene -----------------------------------------------------------------------------------------------------------------------

function renderNode(ctx: Ctx, node: CollageNode, attachments: Map<string, CollageNode[]>): ReactNode {
  const lookupFollow = (id: string) => {
    const target = ctx.byId.get(id);
    if (!target) return undefined;
    if (target.kind === "route") return { node: target, points: routePolyline(target, ctx.map) };
    if (target.kind === "marker") return { node: target, points: markerStrokes(target, ctx.spec.seed).flat() };
    return undefined;
  };
  const state = nodeState(ctx.spec, node, ctx.frame, { map: ctx.map, follow: lookupFollow });
  if (!state.visible) return null;
  const pose = state.pose;
  const childCtx: Ctx = {
    ...ctx,
    rot: ctx.rot + pose.rotate * ctx.mirror,
    scale: ctx.scale * pose.scale * Math.sqrt(Math.abs(pose.scaleX * pose.scaleY)),
    mirror: ctx.mirror * Math.sign(pose.scaleX || 1),
    map: node.kind === "map" ? node : ctx.map,
  };
  const kids = (ctx.children.get(node.id) ?? []).map(child => <Fragment key={child.id}>{renderNode(childCtx, child, attachments)}</Fragment>);
  const attach = (part: string) => (attachments.get(node.id + "." + part) ?? []).map(child => <Fragment key={child.id}>{renderNode({ ...childCtx, scale: childCtx.scale * (node.kind === "puppet" ? 1 : 1) }, child, attachments)}</Fragment>);
  let body: ReactNode = null;
  switch (node.kind) {
    case "cutout": body = <Cutout ctx={childCtx} node={node} lift={pose.lift} />; break;
    case "text": body = <TextPiece ctx={childCtx} node={node} state={{ sampled: state.sampled, step: state.step, lift: pose.lift }} />; break;
    case "marker": body = <Marker ctx={childCtx} node={node} progress={pose.progress} step={Math.floor(ctx.frame / 2)} />; break;
    case "tape": body = <Tape ctx={childCtx} node={node} lift={pose.lift} />; break;
    case "image": body = <ImagePiece ctx={childCtx} node={node} lift={pose.lift} />; break;
    case "map": body = <MapPiece ctx={childCtx} node={node} lift={pose.lift} />; break;
    case "route": body = <RoutePiece ctx={childCtx} node={node} progress={pose.progress} />; break;
    case "string": body = <StringPiece ctx={childCtx} node={node} progress={pose.progress} resolve={id => {
      const target = ctx.byId.get(id)!;
      const s = nodeState(ctx.spec, target, ctx.frame, { map: ctx.map, follow: lookupFollow });
      return [s.pose.x, s.pose.y];
    }} />; break;
    case "puppet": body = <Puppet ctx={childCtx} node={node} frame={state.sampled} attach={attach} />; break;
    case "group": break;
  }
  const printId = node.print ? `${ctx.uid}-print-${node.id}` : undefined;
  // Pieces placed on a map stay on the paper map.
  const inner = <>{body}{node.kind === "map" && kids.length ? <g clipPath={`url(#${ctx.uid}-map-${node.id})`}>{kids}</g> : kids}</>;
  return <g data-km-collage-node={node.id} data-km-collage-kind={node.kind} transform={poseTransform(pose as CollagePose, node.pivot)}
    opacity={pose.opacity < .999 ? r2(pose.opacity) : undefined} style={node.blend && node.blend !== "normal" ? { mixBlendMode: node.blend } : undefined}>
    {printId ? <><PrintFilter id={printId} spec={ctx.spec} print={node.print!} /><g filter={`url(#${printId})`}>{inner}</g></> : inner}
  </g>;
}

/** Real amplitude-modulated halftone: luminance + radial dot screen, thresholded, then inked. */
function PrintFilter({ id, spec, print }: { id: string; spec: CollageSceneSpec; print: NonNullable<CollageNode["print"]> }) {
  const cell = print.cell ?? 5, contrast = print.contrast ?? 1.15;
  const ink = paint(spec, print.ink, "#1d1b19"), paper = paint(spec, print.paper, "#f3ecdc");
  const hex = (c: string) => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16) / 255);
  const [ir, ig, ib] = hex(ink), [pr, pg, pb] = hex(paper);
  const lum = `${.3 * contrast} ${.59 * contrast} ${.11 * contrast} 0 ${r2(-(contrast - 1) / 2)}`;
  return <filter id={id} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
    <feColorMatrix in="SourceGraphic" type="matrix" values={`${lum} ${lum} ${lum} 0 0 0 1 0`} result="lum" />
    {print.mode === "halftone" ? <>
      <feImage href={halftoneDotTile(cell)} x={0} y={0} width={cell} height={cell} preserveAspectRatio="none" result="dot" />
      <feTile in="dot" result="screen" />
      <feComposite in="lum" in2="screen" operator="arithmetic" k1={0} k2={1} k3={1} k4={-.5} result="sum" />
      <feComponentTransfer in="sum" result="bw">
        <feFuncR type="linear" slope={14} intercept={-6.5} /><feFuncG type="linear" slope={14} intercept={-6.5} /><feFuncB type="linear" slope={14} intercept={-6.5} />
      </feComponentTransfer>
    </> : <feComponentTransfer in="lum" result="bw"><feFuncR type="gamma" exponent={print.mode === "mono" ? 1 : 1.2} /><feFuncG type="gamma" exponent={print.mode === "mono" ? 1 : 1.2} /><feFuncB type="gamma" exponent={print.mode === "mono" ? 1 : 1.2} /></feComponentTransfer>}
    {/* Map black → ink and white → paper. */}
    <feColorMatrix in="bw" type="matrix" values={`${r2(pr - ir)} 0 0 0 ${r2(ir)} ${r2(pg - ig)} 0 0 0 ${r2(ig)} ${r2(pb - ib)} 0 0 0 ${r2(ib)} 0 0 0 1 0`} result="inked" />
    <feComposite in="inked" in2="SourceAlpha" operator="in" />
  </filter>;
}

/**
 * Scene-agnostic editorial collage surface. Everything visible is authored data: no built-in subjects,
 * copy, characters or brand. Validate input with `inspectCollageScene` for path-specific errors.
 */
export function CollageScene({ spec, frame, reducedMotion = false, plain = false, style, ...svgProps }: CollageSceneProps) {
  useMemo(() => assertCollageScene(spec), [spec]);
  if (!Number.isSafeInteger(frame) || frame < 0) throw new RangeError("CollageScene frame must be a nonnegative integer");
  const raw = useId(), uid = "kc" + raw.replace(/[^a-zA-Z0-9_-]/g, "");
  const at = reducedMotion ? spec.durationFrames - 1 : Math.min(frame, spec.durationFrames - 1);
  const index = useMemo(() => {
    const children = new Map<string, CollageNode[]>(), attachments = new Map<string, CollageNode[]>(), byId = new Map<string, CollageNode>(), roots: CollageNode[] = [];
    for (const node of spec.nodes) {
      byId.set(node.id, node);
      if (!node.parent) roots.push(node);
      else if (node.parent.includes(".")) attachments.set(node.parent, [...(attachments.get(node.parent) ?? []), node]);
      else children.set(node.parent, [...(children.get(node.parent) ?? []), node]);
    }
    return { children, attachments, byId, roots };
  }, [spec]);
  const board = spec.board, boardColor = paint(spec, board.color, BOARD_COLORS[board.material]);
  const boardUri = useMemo(() => plain ? "" : boardTexture(board.material, boardColor, spec.seed), [board.material, boardColor, spec.seed, plain]);
  const fibreUri = useMemo(() => plain ? "" : fiberTexture(spec.seed + 3), [spec.seed, plain]);
  const grainUri = useMemo(() => plain || !(spec.grain ?? .35) ? "" : grainTexture(spec.seed + 7), [spec.seed, spec.grain, plain]);
  const camera = cameraAt(spec.camera, at, spec.width, spec.height, { drift: reducedMotion ? 0 : spec.drift ?? 1.5, bumps: reducedMotion ? [] : spec.bumps, seed: spec.seed });
  const ctx: Ctx = { spec, frame: at, uid, children: index.children, byId: index.byId, rot: camera.rotate, scale: camera.zoom, mirror: 1, plain, light: spec.light ?? 58 };
  const layers = index.roots.map(node => {
    const depth = node.depth ?? 1;
    const content = renderNode({ ...ctx, scale: 1 + (camera.zoom - 1) * depth }, node, index.attachments);
    if (!content) return null;
    return <g key={node.id} transform={cameraTransform(camera, spec.width, spec.height, depth)}>{content}</g>;
  });
  const grainStep = Math.floor(at / 2);
  const vignette = board.vignette ?? .55;
  return <svg {...svgProps} role={svgProps["aria-hidden"] ? undefined : "img"}
    aria-label={svgProps["aria-hidden"] ? undefined : svgProps["aria-label"] ?? "Paper collage scene"}
    data-km-collage-scene={spec.id} data-km-collage-frame={at}
    viewBox={`0 0 ${spec.width} ${spec.height}`} xmlns="http://www.w3.org/2000/svg"
    style={{ width: "100%", height: "100%", display: "block", overflow: "hidden", background: boardColor, ...style }}>
    <defs>
      {BLUR_LEVELS.map((s, i) => <filter key={i} id={`${uid}-blur-${i}`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={s} /></filter>)}
      {!plain && <pattern id={`${uid}-fibre`} patternUnits="userSpaceOnUse" width={256} height={256}><image href={fibreUri} width={256} height={256} /></pattern>}
      {!plain && <pattern id={`${uid}-board`} patternUnits="userSpaceOnUse" width={384} height={384}
        patternTransform={cameraTransform(camera, spec.width, spec.height, .985)}><image href={boardUri} width={384} height={384} /></pattern>}
      {grainUri && <pattern id={`${uid}-grain`} patternUnits="userSpaceOnUse" width={192} height={192}
        patternTransform={`translate(${Math.floor(((grainStep * 73) % 192))} ${Math.floor(((grainStep * 131) % 192))})`}><image href={grainUri} width={192} height={192} /></pattern>}
      <linearGradient id={`${uid}-sheen`} x1="0" y1="0" x2="1" y2="1"><stop offset=".2" stopColor="#ffffff" stopOpacity="0" /><stop offset=".45" stopColor="#ffffff" stopOpacity=".55" /><stop offset=".6" stopColor="#ffffff" stopOpacity="0" /></linearGradient>
      <radialGradient id={`${uid}-vignette`} cx=".5" cy=".5" r=".75"><stop offset=".55" stopColor="#1a0f05" stopOpacity="0" /><stop offset="1" stopColor="#1a0f05" stopOpacity={r2(.5 * vignette)} /></radialGradient>
      <filter id={`${uid}-graphite`}><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves={1} seed={3} result="n" /><feDisplacementMap in="SourceGraphic" in2="n" scale={1.4} /></filter>
    </defs>
    <rect width={spec.width} height={spec.height} fill={plain ? boardColor : `url(#${uid}-board)`} />
    {board.material === "graph" && <GraphRules ctx={ctx} camera={cameraTransform(camera, spec.width, spec.height, .985)} />}
    {layers}
    {!plain && <rect width={spec.width} height={spec.height} fill={`url(#${uid}-vignette)`} pointerEvents="none" />}
    {grainUri && <rect width={spec.width} height={spec.height} fill={`url(#${uid}-grain)`} opacity={r2((spec.grain ?? .35) * .55)} style={{ mixBlendMode: "overlay" }} pointerEvents="none" />}
  </svg>;
}

function GraphRules({ ctx, camera }: { ctx: Ctx; camera: string }) {
  const { width, height } = ctx.spec, parts: string[] = [], step = 32;
  for (let x = -width; x <= width * 2; x += step) parts.push(`M${x} ${-height}V${height * 2}`);
  for (let y = -height; y <= height * 2; y += step) parts.push(`M${-width} ${y}H${width * 2}`);
  return <path d={parts.join("")} transform={camera} stroke="#5b8bb0" strokeWidth={.8} opacity={.28} fill="none" />;
}

export { projectGeo };
