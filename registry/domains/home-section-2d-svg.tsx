/** SVG renderer for a `HouseSection`: technical-illustration cutaway with poché patterns.
 *
 * Each semantic part is a `<g data-km-part-id>` group, nested under wrapper
 * groups for any posed ancestors, so moving `roof` carries every roof layer
 * exactly like the 3D hierarchy. Poses are deterministic per frame and
 * expressed in section units (meters, y down). Themes derive structural
 * colors from the house palette; nothing here measures or shows text.
 */
import { forwardRef, useId } from "react";
import type { ReactNode, SVGProps } from "react";
import type { HouseSection, SectionMaterial, SectionShape } from "./home-section-2d";

export type HouseSectionTheme = "paper" | "midnight";
export interface SectionPose {
  /** Offset in section meters (y grows downward). */
  translate?: readonly [number, number];
  /** Degrees, clockwise on screen, about `pivot` (section meters). */
  rotate?: number;
  pivot?: readonly [number, number];
  scale?: number;
  opacity?: number;
  visible?: boolean;
}
export interface HouseSection2DProps extends Omit<SVGProps<SVGSVGElement>, "ref"> {
  section: HouseSection;
  theme?: HouseSectionTheme;
  poses?: Readonly<Record<string, SectionPose | undefined>>;
  /** Drawn above the house in the same section units (flows, highlights, markers). */
  overlay?: ReactNode;
  /** Accessible name. */
  title?: string;
}

function palette(theme: HouseSectionTheme, house: HouseSection["layout"]["palette"]) {
  const dark = theme === "midnight";
  const base: Record<SectionMaterial, string> = {
    soil: dark ? "#5b4632" : "#8d6c4b", lawn: dark ? "#4f7238" : house.ground, gravel: dark ? "#777169" : "#a19b91", concrete: dark ? "#8f8b84" : "#cbc6bd",
    cmu: dark ? "#88837a" : "#bdb8ad", brick: house.brick, lumber: dark ? "#b8925e" : "#dcb47d", osb: dark ? "#a8874f" : "#caa56b", insulation: dark ? "#cdb15c" : "#f0d47c",
    blown: dark ? "#c9c2b0" : "#efe9da", drywall: dark ? "#d6d4ce" : "#f7f5f0", siding: house.siding, trim: house.trim, shingles: house.shingles, underlayment: "#2f3338",
    metal: dark ? "#9aa3aa" : "#bcc3c8", glass: dark ? "#5f8aa0" : "#a9d0e1", door: house.door, interior: dark ? "#26303a" : "#ebe7df", equipment: dark ? "#b9b6ae" : "#dcd9d1",
    duct: dark ? "#98a2a9" : "#b9c1c6", pipe: "#9aa3aa", copper: "#c47d4e", foam: "#2a2d30", paving: dark ? "#9c988f" : "#dad6ce",
    fabric: dark ? "#5d7384" : "#8fa6b6", porcelain: dark ? "#d9dcdc" : "#fbfbf9", appliance: dark ? "#8a9298" : "#c7ccd0", furniture: dark ? "#7a5a3e" : "#a4774f",
  };
  return { base, canvas: dark ? "#0f161d" : "#f3f5f7", sky: dark ? "#132029" : "#e8eef3", ink: dark ? "#05090d" : "#2a3138", service: dark ? "#7cc4b4" : "#1f7a6a", dark };
}

const mix = (a: string, b: string, k: number) => {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) + ((((pb >> s) & 255) - ((pa >> s) & 255)) * k)).toString(16).padStart(2, "0");
  return `#${ch(16)}${ch(8)}${ch(0)}`;
};

export const HouseSection2D = forwardRef<SVGSVGElement, HouseSection2DProps>(function HouseSection2D({ section, theme = "paper", poses, overlay, title, style, ...props }, ref) {
  const uid = useId().replace(/:/g, "");
  const p = palette(theme, section.layout.palette);
  const pat = (name: string) => `url(#${uid}-${name})`;
  const patterns: Partial<Record<SectionMaterial, string>> = {
    soil: "soil", gravel: "gravel", concrete: "stipple", cmu: "cmu", brick: "brick", insulation: "batt", blown: "blown", osb: "flakes", lumber: "grain",
  };
  const parent = new Map(section.layout.parts.map(x => [x.id, x.parentId]));
  const chain = (id: string) => { const out: string[] = []; for (let c: string | undefined = id; c; c = parent.get(c)) out.unshift(c); return out; };
  const transform = (pose: SectionPose) => {
    const steps: string[] = [];
    if (pose.translate) steps.push(`translate(${pose.translate[0]} ${pose.translate[1]})`);
    if (pose.rotate || pose.scale !== undefined) {
      const [cx, cy] = pose.pivot ?? [0, 0];
      steps.push(`translate(${cx} ${cy})`);
      if (pose.rotate) steps.push(`rotate(${pose.rotate})`);
      if (pose.scale !== undefined) steps.push(`scale(${pose.scale})`);
      steps.push(`translate(${-cx} ${-cy})`);
    }
    return steps.join(" ") || undefined;
  };
  const draw = (shape: SectionShape, key: number) => {
    const color = p.base[shape.material];
    const tone = shape.mode === "beyond" ? mix(color, p.dark ? "#0f161d" : "#ffffff", .38) : color;
    const d = shape.points.map((q, i) => `${i ? "L" : "M"}${q[0].toFixed(4)} ${q[1].toFixed(4)}`).join(" ") + (shape.open ? "" : " Z");
    if (shape.open) return <path key={key} d={d} fill="none" stroke={tone} strokeWidth={shape.strokeWidth ?? .02} strokeLinecap="round" strokeLinejoin="round" />;
    const keyline = shape.mode === "cut" ? p.ink : shape.mode === "service" ? p.service : mix(p.ink, tone, .55);
    const width = shape.mode === "cut" ? .012 : .008;
    const patternName = patterns[shape.material];
    const fillOpacity = shape.material === "glass" ? .65 : shape.mode === "service" ? .92 : 1;
    return <g key={key}>
      <path d={d} fill={tone} fillOpacity={fillOpacity} stroke={keyline} strokeWidth={width} strokeLinejoin="round" />
      {patternName && shape.mode !== "service" ? <path d={d} fill={pat(patternName)} opacity={shape.mode === "beyond" ? .35 : .8} /> : null}
    </g>;
  };
  const ink = p.ink, soilDot = mix(p.base.soil, "#000000", .35), conc = mix(p.base.concrete, "#000000", .35);
  return <svg ref={ref} viewBox={`0 0 ${section.width.toFixed(3)} ${section.height.toFixed(3)}`} role="img" aria-label={title ?? `${section.layout.id} cross-section`}
    data-km-house-section={section.layout.id} style={{ display: "block", width: "100%", height: "auto", background: p.canvas, ...style }} {...props}>
    <defs>
      <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={p.sky} /><stop offset="1" stopColor={p.canvas} /></linearGradient>
      <pattern id={`${uid}-soil`} patternUnits="userSpaceOnUse" width=".32" height=".32">
        <circle cx=".06" cy=".08" r=".022" fill={soilDot} /><circle cx=".22" cy=".2" r=".016" fill={soilDot} /><circle cx=".14" cy=".28" r=".012" fill={soilDot} /><circle cx=".28" cy=".05" r=".01" fill={soilDot} />
      </pattern>
      <pattern id={`${uid}-gravel`} patternUnits="userSpaceOnUse" width=".12" height=".08">
        <ellipse cx=".03" cy=".03" rx=".02" ry=".014" fill="none" stroke={ink} strokeWidth=".005" /><ellipse cx=".09" cy=".06" rx=".016" ry=".012" fill="none" stroke={ink} strokeWidth=".005" />
      </pattern>
      <pattern id={`${uid}-stipple`} patternUnits="userSpaceOnUse" width=".14" height=".14">
        <circle cx=".02" cy=".03" r=".006" fill={conc} /><circle cx=".09" cy=".02" r=".004" fill={conc} /><circle cx=".06" cy=".09" r=".007" fill={conc} /><circle cx=".12" cy=".11" r=".004" fill={conc} />
        <path d="M.03 .12 l.02 -.012 l.006 .018 z" fill="none" stroke={conc} strokeWidth=".004" />
      </pattern>
      <pattern id={`${uid}-cmu`} patternUnits="userSpaceOnUse" width=".4" height=".4">
        <path d="M0 .2 H.4 M0 .4 H.4 M.2 0 V.2 M0 .2 V.4 M.4 .2 V.4" stroke={ink} strokeWidth=".008" fill="none" />
      </pattern>
      <pattern id={`${uid}-brick`} patternUnits="userSpaceOnUse" width=".24" height=".15">
        <path d="M0 .075 H.24 M0 .15 H.24 M.12 0 V.075 M0 .075 V.15 M.24 .075 V.15" stroke={mix(p.base.brick, "#ffffff", .5)} strokeWidth=".01" fill="none" />
      </pattern>
      <pattern id={`${uid}-batt`} patternUnits="userSpaceOnUse" width=".09" height=".06">
        <path d="M0 .03 Q.0225 -.005 .045 .03 T.09 .03" fill="none" stroke={mix(p.base.insulation, "#5a4410", .55)} strokeWidth=".007" />
      </pattern>
      <pattern id={`${uid}-blown`} patternUnits="userSpaceOnUse" width=".1" height=".07">
        <circle cx=".025" cy=".025" r=".014" fill="none" stroke={mix(p.base.blown, "#000000", .3)} strokeWidth=".004" /><circle cx=".075" cy=".05" r=".01" fill="none" stroke={mix(p.base.blown, "#000000", .3)} strokeWidth=".004" />
      </pattern>
      <pattern id={`${uid}-flakes`} patternUnits="userSpaceOnUse" width=".08" height=".04">
        <path d="M.01 .01 l.03 .004 M.045 .028 l.025 -.006 M.02 .034 l.02 .002" stroke={mix(p.base.osb, "#000000", .35)} strokeWidth=".004" />
      </pattern>
      <pattern id={`${uid}-grain`} patternUnits="userSpaceOnUse" width=".3" height=".05">
        <path d="M0 .015 Q.15 .005 .3 .016 M0 .038 Q.15 .045 .3 .036" stroke={mix(p.base.lumber, "#000000", .25)} strokeWidth=".004" fill="none" />
      </pattern>
    </defs>
    <rect width={section.width} height={section.height} fill={`url(#${uid}-sky)`} />
    {section.parts.map(part => {
      const ids = chain(part.id);
      const posed = ids.filter(id => poses?.[id]);
      if (posed.some(id => poses![id]!.visible === false || poses![id]!.opacity === 0)) return null;
      let node: ReactNode = <g data-km-part-id={part.id} data-km-part-role={part.role}>{part.shapes.map(draw)}</g>;
      for (const id of posed.reverse()) {
        const pose = poses![id]!;
        node = <g key={id} transform={transform(pose)} opacity={pose.opacity}>{node}</g>;
      }
      return <g key={part.id}>{node}</g>;
    })}
    {overlay}
  </svg>;
});
