/** Draws an annotated picture at one frame. See `annotate.ts` for the timing, the checks and the research. */
import { forwardRef } from "react";
import type { ComponentPropsWithoutRef, CSSProperties } from "react";
import { annotateFrame } from "./annotate";
import type { AnnotatePlan, AnnotateSide, PlannedMark } from "./annotate";

export interface AnnotateProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  plan: AnnotatePlan;
  frame: number;
  width: number;
  height: number;
  /** The output's safe area, as fractions of the frame: notes and the title stay inside it. */
  safeInset?: { left: number; right: number; top: number; bottom: number };
  reducedMotion?: boolean;
}
type Box = { x: number; y: number; width: number; height: number };
const FONT = "var(--km-font-display, var(--km-font-body, Inter, ui-sans-serif, system-ui, sans-serif))";
/** A number from a mark's ID, so each hand-drawn stroke is irregular in its own way and the same on every render. */
const seedOf = (id: string) => { let h = 2166136261; for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return ((h >>> 0) % 10000) / 10000; };
const pathOf = (points: readonly (readonly [number, number])[]) => points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");

/** A loop drawn by hand round a detail: a little irregular, starting at the upper left and running past its start, slightly outside it,
 * as a pen that does not lift would. */
function circlePath(box: Box, u: number, seed: number) {
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2, rx = Math.max(box.width / 2 * 1.22 + 1.6 * u, 3 * u), ry = Math.max(box.height / 2 * 1.22 + 1.6 * u, 3 * u);
  const a0 = -2.2 + seed * .5, turns = 1.12, p1 = seed * 6.28, p2 = seed * 17.1, points: [number, number][] = [];
  for (let i = 0; i <= 96; i++) {
    const t = i / 96, a = a0 + t * turns * Math.PI * 2, k = 1 + .035 * Math.sin(2 * a + p1) + .02 * Math.sin(3 * a + p2) + .06 * t;
    points.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return { d: pathOf(points), bounds: { x: cx - rx * 1.06, y: cy - ry * 1.06, width: rx * 2.12, height: ry * 2.12 } };
}
/** A pen line under a detail, with a little wave and a slight rise, drawn left to right. */
function underlinePath(box: Box, u: number, seed: number) {
  const y = box.y + box.height + 1.4 * u, x0 = box.x - box.width * .04, x1 = box.x + box.width * 1.04, points: [number, number][] = [];
  for (let i = 0; i <= 40; i++) { const t = i / 40; points.push([x0 + (x1 - x0) * t, y - t * .8 * u + Math.sin(t * Math.PI * 2.2 + seed * 6) * .28 * u]); }
  return { d: pathOf(points), bounds: { x: x0, y: box.y, width: x1 - x0, height: box.height + 2.2 * u } };
}
/** A bracket beside a detail that measures it: a tick, the length, a tick, drawn in one stroke. */
function spanPath(box: Box, u: number, side: AnnotateSide) {
  const tick = 1.8 * u;
  if (side === "left" || side === "right") {
    const x = side === "right" ? box.x + box.width + 1.8 * u : box.x - 1.8 * u, dir = side === "right" ? -1 : 1;
    return { d: `M${x + dir * tick},${box.y} L${x},${box.y} L${x},${box.y + box.height} L${x + dir * tick},${box.y + box.height}`, bounds: { x: Math.min(x, box.x), y: box.y, width: box.width + 1.8 * u, height: box.height }, anchor: [x, box.y + box.height / 2] as const };
  }
  const y = side === "below" ? box.y + box.height + 1.8 * u : box.y - 1.8 * u, dir = side === "below" ? -1 : 1;
  return { d: `M${box.x},${y + dir * tick} L${box.x},${y} L${box.x + box.width},${y} L${box.x + box.width},${y + dir * tick}`, bounds: { x: box.x, y: Math.min(y, box.y), width: box.width, height: box.height + 1.8 * u }, anchor: [box.x + box.width / 2, y] as const };
}

/** Pick the side with room for the note, in the order that suits the mark, or the roomiest. */
function chooseSide(bounds: Box, safe: Box, note: { width: number; height: number }, order: readonly AnnotateSide[], gap: number): AnnotateSide {
  const room: Record<AnnotateSide, number> = { right: safe.x + safe.width - (bounds.x + bounds.width) - gap - note.width, left: bounds.x - safe.x - gap - note.width,
    below: safe.y + safe.height - (bounds.y + bounds.height) - gap - note.height, above: bounds.y - safe.y - gap - note.height };
  return order.find(side => room[side] >= 0) ?? [...order].sort((a, b) => room[b] - room[a])[0];
}

export const Annotate = forwardRef<HTMLDivElement, AnnotateProps>(function Annotate({ plan, frame, width, height, safeInset, reducedMotion = false, style, ...props }, ref) {
  const { content } = plan, state = annotateFrame(plan, frame, width, height, reducedMotion), ink = content.color ?? "#ff6a3d";
  const vertical = height > width, u = Math.min(width, height) / 100 * (vertical ? 1.1 : 1), scale = state.cover * state.view.zoom;
  const safe: Box = { x: width * Math.max(.05, (safeInset?.left ?? 0) + .015), y: height * Math.max(.05, (safeInset?.top ?? 0) + .015), width: 0, height: 0 };
  safe.width = width * (1 - Math.max(.05, (safeInset?.right ?? 0) + .015)) - safe.x; safe.height = height * (1 - Math.max(.06, (safeInset?.bottom ?? 0) + .015)) - safe.y;
  // Picture pixels to screen pixels, through the camera.
  const toScreen = (x: number, y: number) => [(x - state.view.cx) * scale + width / 2, (y - state.view.cy) * scale + height / 2] as const;
  const regionBox = (mark: PlannedMark): Box => {
    const { width: iw, height: ih } = content.image, [x0, y0] = toScreen(mark.region.x * iw, mark.region.y * ih), [x1, y1] = toScreen((mark.region.x + mark.region.width) * iw, (mark.region.y + mark.region.height) * ih);
    return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
  };
  const noteFont = 3.3 * u, pad = { x: 1.5 * u, y: .9 * u }, gap = 1.8 * u, maxNote = width * (vertical ? .62 : .3);
  const noteSize = (text: string) => { const w = Math.min(maxNote, text.length * noteFont * .54 + pad.x * 2 + .5 * u); const lines = Math.ceil((text.length * noteFont * .54) / (maxNote - pad.x * 2)); return { width: w, height: noteFont * 1.25 * Math.max(1, lines) + pad.y * 2 }; };
  const drawn = state.marks.map(({ mark, draw, note, opacity, dim }) => {
    const box = regionBox(mark), seed = seedOf(mark.id), size = noteSize(mark.note);
    let d = "", head = "", bounds: Box = box, anchor: readonly [number, number], side: AnnotateSide;
    // An authored side is a preference: when the note does not fit there at this output size, the next side with room is used.
    const prefer = (order: AnnotateSide[]) => mark.side ? [mark.side, ...order.filter(item => item !== mark.side)] : order;
    let spanLine: readonly [number, number] | undefined;
    if (mark.kind === "circle") {
      const c = circlePath(box, u, seed); d = c.d; bounds = c.bounds;
      side = chooseSide(bounds, safe, size, prefer(["right", "left", "below", "above"]), gap);
    } else if (mark.kind === "underline") {
      const c = underlinePath(box, u, seed); d = c.d; bounds = c.bounds;
      side = chooseSide(bounds, safe, size, prefer(["below", "above", "right", "left"]), gap);
    } else if (mark.kind === "span") {
      // The bracket keeps its axis (beside a detail it measures the height; above or below, the width). Its note sits outside the
      // bracket when there is room, and otherwise inside it, over the detail, but never on the bracket's line.
      const bar = mark.side ?? chooseSide(box, safe, { width: size.width + 4 * u, height: size.height + 4 * u }, ["right", "left", "below", "above"], gap);
      const c = spanPath(box, u, bar); d = c.d; bounds = c.bounds; spanLine = c.anchor;
      const opposite = { left: "right", right: "left", above: "below", below: "above" } as const, [lx, ly] = c.anchor;
      const fits = bar === "left" ? lx - gap - size.width >= safe.x : bar === "right" ? lx + gap + size.width <= safe.x + safe.width
        : bar === "above" ? ly - gap - size.height >= safe.y : ly + gap + size.height <= safe.y + safe.height;
      side = fits ? bar : opposite[bar];
    } else {
      // An arrow comes in from the side the note is on, along a gentle curve, and stops just short of the detail.
      side = chooseSide(box, safe, { width: size.width + 12 * u, height: size.height + 8 * u }, prefer(["right", "left", "above", "below"]), gap);
      const cx = box.x + box.width / 2, cy = box.y + box.height / 2, reach = 11 * u;
      const tail: [number, number] = side === "right" ? [box.x + box.width + reach, cy - 4 * u] : side === "left" ? [box.x - reach, cy - 4 * u] : side === "above" ? [cx + 5 * u, box.y - reach] : [cx + 5 * u, box.y + box.height + reach];
      const dx = cx - tail[0], dy = cy - tail[1], len = Math.hypot(dx, dy), stop = Math.max(box.width, box.height) / 2 + 1.2 * u;
      const tip: [number, number] = [cx - dx / len * stop, cy - dy / len * stop], bend = (seed > .5 ? 1 : -1) * .16 * (len - stop);
      const ctrl: [number, number] = [(tail[0] + tip[0]) / 2 - dy / len * bend, (tail[1] + tip[1]) / 2 + dx / len * bend];
      d = `M${tail[0]},${tail[1]} Q${ctrl[0]},${ctrl[1]} ${tip[0]},${tip[1]}`;
      const ang = Math.atan2(tip[1] - ctrl[1], tip[0] - ctrl[0]), hl = 2.4 * u;
      head = `M${tip[0] - Math.cos(ang - .5) * hl},${tip[1] - Math.sin(ang - .5) * hl} L${tip[0]},${tip[1]} L${tip[0] - Math.cos(ang + .5) * hl},${tip[1] - Math.sin(ang + .5) * hl}`;
      bounds = { x: Math.min(tail[0], box.x), y: Math.min(tail[1], box.y), width: Math.abs(tail[0] - cx) + box.width / 2, height: Math.abs(tail[1] - cy) + box.height / 2 };
      anchor = tail;
    }
    // Where the note's near edge sits: beside the mark's bounds, or at an arrow's tail.
    if (spanLine) {
      // Measured from the bracket's own line, on whichever side of it the note goes.
      const [lx, ly] = spanLine;
      anchor = side === "right" ? [lx + gap, ly] : side === "left" ? [lx - gap, ly] : side === "below" ? [lx, ly + gap] : [lx, ly - gap];
    } else if (mark.kind !== "arrow") {
      anchor = side === "right" ? [bounds.x + bounds.width + gap, bounds.y + bounds.height / 2] : side === "left" ? [bounds.x - gap, bounds.y + bounds.height / 2]
        : side === "below" ? [bounds.x + bounds.width / 2, bounds.y + bounds.height + gap] : [bounds.x + bounds.width / 2, bounds.y - gap];
    } else anchor = side === "right" ? [anchor![0] + .8 * u, anchor![1]] : side === "left" ? [anchor![0] - .8 * u, anchor![1]] : side === "above" ? [anchor![0], anchor![1] - .8 * u] : [anchor![0], anchor![1] + .8 * u];
    const [ax, ay] = anchor!;
    const clampX = (left: number) => Math.min(Math.max(left, safe.x), safe.x + safe.width - size.width), clampY = (top: number) => Math.min(Math.max(top, safe.y), safe.y + safe.height - size.height);
    const left = side === "right" ? clampX(ax) : side === "left" ? clampX(ax - size.width) : clampX(ax - size.width / 2);
    const top = side === "below" ? clampY(ay) : side === "above" ? clampY(ay - size.height) : clampY(ay - size.height / 2);
    const shaft = mark.kind === "arrow" ? Math.min(1, draw / .72) : draw, tipDraw = mark.kind === "arrow" ? Math.max(0, (draw - .72) / .28) : 0;
    return { mark, d, head, shaft, tipDraw, note, opacity, dim, bounds, left, top, side };
  });
  const stroke = (d: string, progress: number, key: string) => progress > 0 && <g key={key}>
    {/* A soft dark line under the ink, so the pen reads on white water as well as on dark rock. */}
    <path d={d} fill="none" stroke="rgba(0,0,0,.42)" strokeWidth={.95 * u} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 2" strokeDashoffset={1 - progress} transform={`translate(0 ${.18 * u})`} />
    <path d={d} fill="none" stroke={ink} strokeWidth={.55 * u} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 2" strokeDashoffset={1 - progress} />
  </g>;
  const { image } = content, short = Math.min(width, height);
  return <div {...props} ref={ref} role="img" aria-label={content.label} data-km-annotate=""
    style={{ position: "relative", width, height, overflow: "hidden", background: "#0b0d10", ...style }}>
    <img src={image.src} alt="" width={image.width} height={image.height} decoding="sync" draggable={false}
      style={{ position: "absolute", left: 0, top: 0, width: image.width, height: image.height, maxWidth: "none", transformOrigin: "0 0",
        transform: `translate(${width / 2 - state.view.cx * scale}px, ${height / 2 - state.view.cy * scale}px) scale(${scale})` }} />
    {/* The rest of the frame dims round the detail being marked, so the eye goes to it. */}
    {drawn.map(({ mark, bounds, dim }) => dim > 0 && <div key={`dim-${mark.id}`} aria-hidden="true" style={{ position: "absolute", inset: 0, opacity: dim,
      background: `radial-gradient(${bounds.width / 2 + 4 * u}px ${bounds.height / 2 + 4 * u}px at ${bounds.x + bounds.width / 2}px ${bounds.y + bounds.height / 2}px, rgba(6,8,10,0) 0%, rgba(6,8,10,0) 100%, rgba(6,8,10,.5) 230%)` }} />)}
    <svg width={width} height={height} style={{ position: "absolute", inset: 0 }} aria-hidden="true" data-km-illustration-region="art">
      {drawn.map(({ mark, d, head, shaft, tipDraw, opacity }) => <g key={mark.id} opacity={opacity}>{stroke(d, shaft, "shaft")}{head && stroke(head, tipDraw, "head")}</g>)}
    </svg>
    {/* Each mark's detail, tagged where the camera puts it, so a film can grow or zoom the next scene out of it. */}
    {plan.marks.map(mark => { const box = regionBox(mark); return <div key={`subject-${mark.id}`} aria-hidden="true" data-km-film-subject={mark.id}
      style={{ position: "absolute", left: box.x, top: box.y, width: box.width, height: box.height, pointerEvents: "none" }} />; })}
    {drawn.map(({ mark, note, left, top }) => note > 0 && <div key={`note-${mark.id}`} data-km-annotate-note={mark.id}
      style={{ position: "absolute", left, top, maxWidth: maxNote, boxSizing: "border-box", padding: `${pad.y}px ${pad.x}px`, borderRadius: .8 * u, background: "rgba(10,12,16,.68)",
        backdropFilter: "blur(6px)", borderLeft: `${.5 * u}px solid ${ink}`, font: `650 ${noteFont}px/1.25 ${FONT}`, color: "#f6f4ef", opacity: note, transform: `translateY(${(1 - note) * .8 * u}px)`,
        textWrap: "balance" } as CSSProperties}>{mark.note}</div>)}
    {content.title && state.title > 0 && <>
      <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", opacity: state.title, background: "linear-gradient(to top, rgba(8,10,14,.6), rgba(8,10,14,0))" }} />
      <p style={{ position: "absolute", margin: 0, left: safe.x, right: width - safe.x - safe.width, bottom: height - safe.y - safe.height, color: "#f8f6f1", opacity: state.title,
        font: `650 ${short * (vertical ? .072 : .068)}px/1.1 ${FONT}`, letterSpacing: "var(--km-title-tracking, -.02em)", textWrap: "balance", textShadow: `0 1px ${short * .03}px rgba(8,12,18,.55)` } as CSSProperties}>{content.title}</p>
    </>}
  </div>;
});
