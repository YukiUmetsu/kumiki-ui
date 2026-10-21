/** Architectural floor plan (top view) of one storey of a house layout, as SVG.
 *
 * Drawn from the same `InteriorPlan` as the 3D build: exterior walls with
 * window glazing and door swings, partitions with door leaves, bifolds and
 * cased openings, floor finishes, room labels with areas, furniture symbols
 * and (optionally) electrical devices. Units are meters (x right, z down =
 * front at the bottom). Every element carries `data-km-part-id`, so the 2D
 * SectionReveal adapter, callouts and InspectableAsset tooling work on it.
 */
import { forwardRef, useId } from "react";
import type { ReactNode, SVGProps } from "react";
import type { Furnishing, InteriorDoor, Partition } from "./home-interior-model";
import { PARTITION_THICKNESS } from "./home-interior-model";
import type { HouseLayout } from "./home-model";

export type FloorPlanTheme = "paper" | "midnight";
export interface HouseFloorPlan2DProps extends Omit<SVGProps<SVGSVGElement>, "ref"> {
  layout: HouseLayout;
  storey?: number;
  theme?: FloorPlanTheme;
  furniture?: boolean;
  devices?: boolean;
  labels?: boolean;
  /** Room IDs to emphasize (others are dimmed). */
  highlight?: readonly string[];
  /** Per-part opacity (e.g. from `sectionRevealSvgOpacities`). */
  partOpacity?: ReadonlyMap<string, number | undefined>;
  overlay?: ReactNode;
  title?: string;
}

const COLORS = {
  paper: { bg: "#f4f2ed", wall: "#24292f", part: "#3a4048", glass: "#7fb6d6", wood: "#ead9bd", tile: "#e4e6e6", carpet: "#e6ddd0", concrete: "#d5d2cc", furn: "#ffffff", furnStroke: "#5b636d", text: "#25303b", sub: "#6b7682", device: "#c9822f", swing: "#8b939c" },
  midnight: { bg: "#0f161d", wall: "#d6dde4", part: "#aab4bf", glass: "#5fa8d3", wood: "#3a3024", tile: "#2a3036", carpet: "#3a342c", concrete: "#2c2f33", furn: "#1d2731", furnStroke: "#9aa7b4", text: "#e6edf3", sub: "#8b97a4", device: "#e7b15e", swing: "#6f7d8b" },
} as const;

export const HouseFloorPlan2D = forwardRef<SVGSVGElement, HouseFloorPlan2DProps>(function HouseFloorPlan2D(
  { layout, storey = 0, theme = "paper", furniture = true, devices = false, labels = true, highlight, partOpacity, overlay, title, style, ...props }, ref) {
  const uid = useId().replace(/:/g, "");
  const c = COLORS[theme];
  const plan = layout.interior;
  const W = layout.dims.width / 2, D = layout.dims.depth / 2, T = layout.dims.layers.total, pad = .6;
  const op = (id: string) => partOpacity?.get(id);
  const dim = (roomId: string) => highlight && highlight.length && !highlight.includes(roomId) ? .3 : 1;
  const rooms = plan?.rooms.filter(r => r.storey === storey) ?? [];
  const planRooms = plan?.floorPlan.rooms.filter(r => (r.storey ?? 0) === storey) ?? [];
  const parts = plan?.partitions.filter(p => p.storey === storey) ?? [];
  const items = furniture ? plan?.furnishings.filter(f => f.storey === storey) ?? [] : [];
  const fill = (floor: string) => floor === "tile" ? `url(#${uid}-tile)` : floor === "carpet" ? c.carpet : floor === "concrete" ? c.concrete : `url(#${uid}-wood)`;

  // Exterior walls as four bands with gaps at openings on this storey.
  const exterior: ReactNode[] = [];
  for (const f of ["front", "back", "left", "right"] as const) {
    const fl = layout.facades[f];
    const ops = fl.openings.filter(o => o.storey === storey).sort((a, b) => a.u0 - b.u0);
    const at = (u: number, w: number) => [fl.frame.origin[0] + fl.frame.uAxis[0] * u - fl.frame.normal[0] * w, fl.frame.origin[2] + fl.frame.uAxis[2] * u - fl.frame.normal[2] * w] as const;
    const band = (u0: number, u1: number, key: string) => {
      const [ax, az] = at(u0, 0), [bx, bz] = at(u1, T);
      exterior.push(<rect key={key} x={Math.min(ax, bx)} y={Math.min(az, bz)} width={Math.abs(bx - ax)} height={Math.abs(bz - az)} fill={c.wall} />);
    };
    let cur = 0;
    for (const o of ops) {
      band(cur, o.u0, `${f}-${cur}`); cur = o.u1;
      const [ax, az] = at(o.u0, 0), [bx, bz] = at(o.u1, T);
      const x = Math.min(ax, bx), y = Math.min(az, bz), w = Math.abs(bx - ax), h = Math.abs(bz - az);
      if (o.kind === "window") exterior.push(<g key={o.id} data-km-part-id={o.id}>
        <rect x={x} y={y} width={w} height={h} fill={c.bg} stroke={c.wall} strokeWidth={.012} />
        {w > h ? <line x1={x} x2={x + w} y1={y + h / 2} y2={y + h / 2} stroke={c.glass} strokeWidth={.03} /> : <line y1={y} y2={y + h} x1={x + w / 2} x2={x + w / 2} stroke={c.glass} strokeWidth={.03} />}
      </g>);
      else {
        // Exterior door: leaf drawn open into the house with its swing arc.
        const width = o.u1 - o.u0, [hx, hz] = at(o.u0, T), n = fl.frame.normal, u = fl.frame.uAxis;
        const tipX = hx - n[0] * width, tipZ = hz - n[2] * width, endX = hx + u[0] * width, endZ = hz + u[2] * width;
        exterior.push(<g key={o.id} data-km-part-id={o.id}>
          <line x1={hx} y1={hz} x2={tipX} y2={tipZ} stroke={c.wall} strokeWidth={.035} />
          {o.kind === "door" ? <path d={`M ${tipX} ${tipZ} A ${width} ${width} 0 0 ${f === "front" || f === "right" ? 1 : 0} ${endX} ${endZ}`} fill="none" stroke={c.swing} strokeWidth={.012} strokeDasharray=".05 .04" /> : null}
        </g>);
      }
    }
    band(cur, fl.length, `${f}-end`);
  }

  const door = (p: Partition, d: InteriorDoor) => {
    const along = (t: number, off = 0) => p.axis === "x" ? [t, p.at + off] as const : [p.at + off, t] as const;
    const into = rooms.find(r => r.id === d.into);
    const side = into ? (p.axis === "x" ? Math.sign((into.z0 + into.z1) / 2 - p.at) : Math.sign((into.x0 + into.x1) / 2 - p.at)) || 1 : 1;
    const a = d.at - d.width / 2, b = d.at + d.width / 2;
    if (d.kind === "opening") return null;
    if (d.kind === "bifold") {
      const pts = [0, 1, 2, 3, 4].map(i => along(a + (b - a) * i / 4, (i % 2 ? .12 : .02) * side));
      return <polyline key={d.id} data-km-part-id={`${d.id}.leaf`} points={pts.map(q => q.join(",")).join(" ")} fill="none" stroke={c.part} strokeWidth={.025} />;
    }
    const hinge = d.hinge === "start" ? a : b, free = d.hinge === "start" ? b : a;
    const [hx, hz] = along(hinge), [tx, tz] = along(hinge, side * d.width), [fx, fz] = along(free);
    const sweep = (p.axis === "x" ? (d.hinge === "start") === (side > 0) : (d.hinge === "start") !== (side > 0)) ? 1 : 0;
    return <g key={d.id} data-km-part-id={`${d.id}.leaf`}>
      <line x1={hx} y1={hz} x2={tx} y2={tz} stroke={c.part} strokeWidth={.03} />
      <path d={`M ${tx} ${tz} A ${d.width} ${d.width} 0 0 ${sweep} ${fx} ${fz}`} fill="none" stroke={c.swing} strokeWidth={.012} strokeDasharray=".05 .04" />
    </g>;
  };

  return <svg ref={ref} viewBox={`${-W - pad} ${-D - pad} ${W * 2 + pad * 2} ${D * 2 + pad * 2}`} role="img" aria-label={title ?? `${layout.id} floor plan, storey ${storey + 1}`}
    data-km-floor-plan={layout.id} style={{ display: "block", width: "100%", height: "auto", background: c.bg, ...style }} {...props}>
    <defs>
      <pattern id={`${uid}-wood`} patternUnits="userSpaceOnUse" width="1.12" height=".14"><rect width="1.12" height=".14" fill={c.wood} /><path d="M0 .139 H1.12 M.56 0 V.14" stroke={c.furnStroke} strokeOpacity=".18" strokeWidth=".006" /></pattern>
      <pattern id={`${uid}-tile`} patternUnits="userSpaceOnUse" width=".45" height=".45"><rect width=".45" height=".45" fill={c.tile} /><path d="M0 .449 H.45 M.449 0 V.45" stroke={c.furnStroke} strokeOpacity=".3" strokeWidth=".008" /></pattern>
    </defs>
    {planRooms.map(r => <g key={r.id} data-km-part-id={`room.${r.id}`} opacity={(op(`room.${r.id}`) ?? 1) * dim(r.id)}>
      {r.rects.map((q, i) => <rect key={i} x={q.x0} y={q.z0} width={q.x1 - q.x0} height={q.z1 - q.z0} fill={fill(rooms.find(x => x.id === r.id)?.floor ?? "wood")} />)}
    </g>)}
    {items.map(f => <FurnitureSymbol key={f.id} f={f} c={c} opacity={(op(f.id) ?? 1) * dim(f.roomId)} />)}
    {parts.map(p => <g key={p.id} data-km-part-id={p.id}>
      {segments(p).map(([a, b], i) => p.axis === "x"
        ? <rect key={i} x={a} y={p.at - PARTITION_THICKNESS / 2} width={b - a} height={PARTITION_THICKNESS} fill={c.part} />
        : <rect key={i} x={p.at - PARTITION_THICKNESS / 2} y={a} width={PARTITION_THICKNESS} height={b - a} fill={c.part} />)}
      {p.doors.map(d => door(p, d))}
    </g>)}
    {exterior}
    {devices ? plan?.electrical.filter(e => e.storey === storey && (e.kind === "ceiling-light" || e.kind === "pendant" || e.kind === "outlet" || e.kind === "switch")).map(e => <g key={e.id} data-km-part-id={e.id}>
      {e.kind === "outlet" || e.kind === "switch"
        ? <circle cx={e.position[0] - e.normal[0] * .02} cy={e.position[2] - e.normal[2] * .02} r={.05} fill={e.kind === "switch" ? c.bg : c.device} stroke={c.device} strokeWidth={.015} />
        : <g stroke={c.device} strokeWidth={.018} fill="none"><circle cx={e.position[0]} cy={e.position[2]} r={.13} /><path d={`M ${e.position[0] - .09} ${e.position[2] - .09} L ${e.position[0] + .09} ${e.position[2] + .09} M ${e.position[0] + .09} ${e.position[2] - .09} L ${e.position[0] - .09} ${e.position[2] + .09}`} /></g>}
    </g>) : null}
    {labels ? rooms.filter(r => r.kind !== "closet" || (r.x1 - r.x0) * (r.z1 - r.z0) > 1.5).map(r => {
      const area = r.rects.reduce((s, q) => s + (q.x1 - q.x0) * (q.z1 - q.z0), 0);
      const size = Math.max(.16, Math.min(.3, (r.x1 - r.x0) / Math.max(6, r.label.length * .62)));
      return <g key={`l-${r.id}`} opacity={dim(r.id)} style={{ pointerEvents: "none" }}>
        <text x={(r.x0 + r.x1) / 2} y={(r.z0 + r.z1) / 2} textAnchor="middle" fontSize={size} fontWeight={650} fill={c.text} paintOrder="stroke" stroke={c.bg} strokeWidth={size * .25}>{r.label}</text>
        <text x={(r.x0 + r.x1) / 2} y={(r.z0 + r.z1) / 2 + size * 1.2} textAnchor="middle" fontSize={size * .75} fill={c.sub} paintOrder="stroke" stroke={c.bg} strokeWidth={size * .2}>{`${area.toFixed(1)} m²`}</text>
      </g>;
    }) : null}
    {overlay}
  </svg>;
});

function segments(p: Partition): Array<[number, number]> {
  const gaps = p.doors.map(d => [d.at - d.width / 2, d.at + d.width / 2] as const).sort((a, b) => a[0] - b[0]);
  const out: Array<[number, number]> = []; let cur = p.from;
  for (const [a, b] of gaps) { if (a > cur) out.push([cur, a]); cur = Math.max(cur, b); }
  if (cur < p.to) out.push([cur, p.to]);
  return out;
}

function FurnitureSymbol({ f, c, opacity }: { f: Furnishing; c: (typeof COLORS)[FloorPlanTheme]; opacity: number }) {
  if (f.kind === "tv" || f.kind === "mirror" || f.kind === "table-lamp" || f.kind === "hood" || f.kind === "upper-cabinets" || f.kind === "towel-bar") return null;
  const [w, , d] = f.size, s = { fill: c.furn, stroke: c.furnStroke, strokeWidth: .014 };
  const deg = -f.yaw * 180 / Math.PI;
  let body: ReactNode = <rect x={-w / 2} y={-d / 2} width={w} height={d} rx={.03} {...s} />;
  switch (f.kind) {
    case "rug": body = <rect x={-w / 2} y={-d / 2} width={w} height={d} fill={c.furnStroke} fillOpacity={.12} stroke={c.furnStroke} strokeOpacity={.4} strokeWidth={.01} strokeDasharray=".06 .04" />; break;
    case "bed": body = <g><rect x={-w / 2} y={-d / 2} width={w} height={d} rx={.04} {...s} /><rect x={-w / 2 + .06} y={-d / 2 + .06} width={w - .12} height={.36} rx={.05} {...s} /><line x1={-w / 2} x2={w / 2} y1={-d / 2 + .62} y2={-d / 2 + .62} stroke={c.furnStroke} strokeWidth={.012} /></g>; break;
    case "sofa": case "armchair": body = <g><rect x={-w / 2} y={-d / 2} width={w} height={d} rx={.08} {...s} /><rect x={-w / 2 + .16} y={-d / 2 + .2} width={w - .32} height={d - .24} rx={.04} {...s} /></g>; break;
    case "dining-table": case "coffee-table": case "desk": case "island": case "workbench": case "sideboard": case "dresser": case "nightstand": case "bookshelf": case "tv-console": break;
    case "chair": case "stool": case "desk-chair": body = <rect x={-w / 2 + .03} y={-d / 2 + .03} width={w - .06} height={d - .06} rx={.08} {...s} />; break;
    case "bathtub": body = <g><rect x={-w / 2} y={-d / 2} width={w} height={d} rx={.06} {...s} /><rect x={-w / 2 + .08} y={-d / 2 + .08} width={w - .16} height={d - .16} rx={.18} {...s} /></g>; break;
    case "toilet": body = <g><rect x={-w / 2} y={-d / 2} width={w} height={.2} rx={.03} {...s} /><ellipse cx={0} cy={.08} rx={w / 2 - .02} ry={d / 2 - .1} {...s} /></g>; break;
    case "vanity": case "sink": case "pedestal-sink": body = <g><rect x={-w / 2} y={-d / 2} width={w} height={d} rx={.03} {...s} /><ellipse cx={0} cy={.03} rx={Math.min(.22, w / 3)} ry={Math.min(.16, d / 3)} {...s} /></g>; break;
    case "range": body = <g><rect x={-w / 2} y={-d / 2} width={w} height={d} {...s} />{[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, y], i) => <circle key={i} cx={x * w * .22} cy={y * d * .2} r={.08} {...s} />)}</g>; break;
    case "fridge": body = <g><rect x={-w / 2} y={-d / 2} width={w} height={d} {...s} /><line x1={-w / 2} y1={-d / 2} x2={w / 2} y2={d / 2} stroke={c.furnStroke} strokeWidth={.01} /><line x1={w / 2} y1={-d / 2} x2={-w / 2} y2={d / 2} stroke={c.furnStroke} strokeWidth={.01} /></g>; break;
    case "washer": case "dryer": body = <g><rect x={-w / 2} y={-d / 2} width={w} height={d} rx={.03} {...s} /><circle r={Math.min(w, d) * .32} {...s} /></g>; break;
    case "stair": {
      const n = Math.ceil(f.size[1] / .19);
      body = <g><rect x={-w / 2} y={-d / 2} width={w} height={d} {...s} />{Array.from({ length: n - 1 }, (_, i) => <line key={i} x1={-w / 2} x2={w / 2} y1={-d / 2 + d * (i + 1) / n} y2={-d / 2 + d * (i + 1) / n} stroke={c.furnStroke} strokeWidth={.01} />)}<path d={`M 0 ${-d / 2 + .2} V ${d / 2 - .25} m -.1 -.12 l .1 .12 l .1 -.12`} fill="none" stroke={c.furnStroke} strokeWidth={.018} /></g>;
      break;
    }
    case "car": body = <rect x={-w / 2} y={-d / 2} width={w} height={d} rx={.35} {...s} />; break;
    case "plant": case "floor-lamp": body = <circle r={Math.min(w, d) / 2} {...s} />; break;
    case "fireplace": body = <rect x={-w / 2} y={-d / 2} width={w} height={d} fill={c.furnStroke} fillOpacity={.35} stroke={c.furnStroke} strokeWidth={.014} />; break;
    case "closet-rod": body = <g><line x1={-w / 2} x2={w / 2} y1={0} y2={0} stroke={c.furnStroke} strokeWidth={.012} strokeDasharray=".04 .03" /></g>; break;
  }
  // SVG rotate is clockwise in this z-down plane; the plan yaw maps local +Z to (sin, cos).
  return <g data-km-part-id={f.id} transform={`translate(${f.position[0]} ${f.position[2]}) rotate(${deg})`} opacity={opacity}>{body}</g>;
}
