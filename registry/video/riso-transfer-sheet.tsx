import type { RisoPaint } from "./print-plates-react";

/** Original, press-ready paper shared by two independently evaluated actor hands. */
export interface RisoTransferPoint { x: number; y: number }
export interface RisoTransferSheetOptions {
  /** Curvature across the original paper centerline in stage units. 0..12. */
  curl?: number;
  /** Pinch the held ends without changing the long-edge silhouette. 0..1. */
  gripPinch?: number;
  /** Independent physical contact pressure at the source (left/start) end. 0..1. */
  sourceGrip?: number;
  /** Independent contact pressure at the receiving (right/end) end. 0..1. */
  receiverGrip?: number;
  /** Local contact pleats/pressure imprints. 0 disables; 1 preserves full drawn depth. */
  imprintDepth?: number;
}
export interface RisoTransferSheetGeometry {
  /** THE source of truth for the opaque paper knockout AND printed contour. */
  outline: string;
  border: string;
  fold: string;
  /** Screened fold shadow, on the blue spot master, not a CSS gradient. */
  foldShade: string;
  ruling: readonly string[];
  postmark: string;
  hatching: string;
  /** Source-/receiver-local open pleats, not global aligned stripes. */
  contactCreases: Readonly<{source:readonly string[];receiver:readonly string[]}>;
  /** Separately screened contact-compression pockets, closed within paper. */
  contactShadows: Readonly<{source:string;receiver:string}>;
}
const EMPTY: RisoTransferSheetGeometry = {
  outline: "", border: "", fold: "", foldShade: "", ruling: [], postmark: "", hatching: "",
  contactCreases:{source:[],receiver:[]},
  contactShadows:{source:"",receiver:""},
};
const f = (value: number) => value.toFixed(2);
const xy = (p: RisoTransferPoint) => f(p.x) + " " + f(p.y);
const valid = (p: RisoTransferPoint) => !!p && Number.isFinite(p.x) &&
  Number.isFinite(p.y) && Math.abs(p.x) <= 20000 && Math.abs(p.y) <= 20000;

/**
 * Film-frame-pure, two-ended printed sheet with an orthogonal body axis.
 * Every contour and interior engraving shares the same bent material basis.
 * No duplicate geometry is constructed in the character/film consumer.
 */
export function evaluateRisoTransferSheet(
  source: RisoTransferPoint, end: RisoTransferPoint, progress: number,
  options: RisoTransferSheetOptions = {},
): RisoTransferSheetGeometry {
  if (!valid(source) || !valid(end) || !Number.isFinite(progress) || progress < 0 || progress > 1)
    throw new RangeError("RISO transfer geometry requires bounded points and progress 0..1.");
  if (!options || typeof options !== "object" || Array.isArray(options))
    throw new RangeError("RISO transfer options must be an object.");
  const curl = options.curl ?? 3, pinch = options.gripPinch ?? .5;
  const sourceGrip=options.sourceGrip ?? 1, receiverGrip=options.receiverGrip ?? 1;
  const imprintDepth=options.imprintDepth ?? 1;
  if (!Number.isFinite(curl) || curl < 0 || curl > 12 ||
      !Number.isFinite(pinch) || pinch < 0 || pinch > 1 ||
      !Number.isFinite(sourceGrip) || sourceGrip < 0 || sourceGrip > 1 ||
      !Number.isFinite(receiverGrip) || receiverGrip < 0 || receiverGrip > 1 ||
      !Number.isFinite(imprintDepth) || imprintDepth < 0 || imprintDepth > 1)
    throw new RangeError("RISO transfer curl must be 0..12 and grip/imprint strengths 0..1.");
  const dx = end.x - source.x, dy = end.y - source.y, length = Math.hypot(dx, dy);
  // A paper slip opens progressively from the hand. Suppressing a sheet
  // shorter than 28 units caused a conspicuous full-width pop on first reveal.
  if (progress === 0 || length < .5) return EMPTY;
  const reveal = Math.min(1, length / 28);
  const nx = -dy / length, ny = dx / length;
  const at = (t: number, offset = 0): RisoTransferPoint => {
    const bow = curl * Math.sin(Math.PI * Math.max(0, Math.min(1, t)));
    return {
      x: source.x + dx * t + nx * (offset + bow) * reveal,
      y: source.y + dy * t + ny * (offset + bow) * reveal,
    };
  };
  // The contour is a truly connected ribbon. Both pinched short edges
  // have their midpoints on the sampled hand contacts, even in tilted poses.
  const sourceUpper=-20+pinch*sourceGrip*4,sourceLower=20-pinch*sourceGrip*4;
  const receiverUpper=-20+pinch*receiverGrip*4,receiverLower=20-pinch*receiverGrip*4;
  const outline = "M" + xy(at(0, sourceUpper)) +
    " C" + xy(at(.12, -22)) + " " + xy(at(.33, -21)) + " " + xy(at(.51, -18)) +
    " C" + xy(at(.7, -17)) + " " + xy(at(.89, -20)) + " " + xy(at(1, receiverUpper)) +
    " Q" + xy(at(1.018, 1)) + " " + xy(at(1, receiverLower)) +
    " C" + xy(at(.84, 23)) + " " + xy(at(.66, 24)) + " " + xy(at(.49, 22)) +
    " C" + xy(at(.3, 24)) + " " + xy(at(.12, 23)) + " " + xy(at(0, sourceLower)) +
    " Q" + xy(at(-.018, 1)) + " " + xy(at(0, sourceUpper)) + " Z";
  // Engraving is inside the curved, pinched paper perimeter, not registered
  // to the monitor's X/Y axes. The source artwork is linework, not digital grain.
  const border = "M" + xy(at(.055, -11)) + " Q" + xy(at(.48, -14.5)) +
    " " + xy(at(.945, -11)) + " L" + xy(at(.945, 13.5)) + " Q" +
    xy(at(.49, 17.5)) + " " + xy(at(.055, 13.5)) + " Z";
  const fold = length >= 70 ? "M" + xy(at(.46, -14)) + " Q" +
    xy(at(.443, -.5)) + " " + xy(at(.46, 16)) : "";
  const foldShade = length >= 70
    ? "M" + xy(at(.453, -13.5)) + " Q" + xy(at(.47, 1)) + " " + xy(at(.47, 16)) +
      " L" + xy(at(.484, 16)) + " Q" + xy(at(.467, .5)) +
      " " + xy(at(.466, -13.5)) + " Z"
    : "";
  const ruling = length >= 85 ? [-6, 1, 8].map(n =>
    "M" + xy(at(.16, n)) + " Q" + xy(at(.46, n - .8)) + " " +
    xy(at(.69, n + .4))) : [];
  // Cancellation stamp is oriented in the same local paper basis. Older
  // versions used a fixed screen-vertical ellipse, causing a rotated seal.
  const r = Math.min(9, Math.max(4, length * .035)), tr = r / length, t = .83;
  const postmark = length >= 90
    ? "M" + xy(at(t - tr, -2)) +
      " C" + xy(at(t - tr, -2 - r * .6)) + " " + xy(at(t - tr * .55, -2 - r)) +
      " " + xy(at(t, -2 - r)) +
      " C" + xy(at(t + tr * .62, -2 - r)) + " " + xy(at(t + tr, -2 - r * .45)) +
      " " + xy(at(t + tr, -2)) +
      " C" + xy(at(t + tr, -2 + r * .53)) + " " + xy(at(t + tr * .5, -2 + r)) +
      " " + xy(at(t, -2 + r)) +
      " C" + xy(at(t - tr * .6, -2 + r)) + " " + xy(at(t - tr, -2 + r * .52)) +
      " " + xy(at(t - tr, -2)) +
      " M" + xy(at(.795, -4)) + " L" + xy(at(.875, 1))
    : "";
  const hatching = length >= 80
    ? [.09, .12, .15, .73, .76, .79].map((t, i) =>
      "M" + xy(at(t, 10 + i % 2 * 2)) + " L" +
      xy(at(t + (i % 2 === 0 ? .015 : .01), 8 - (i % 2)))).join(" ")
    : "";
  // Source pressure creates a short asymmetric cluster of paper wrinkles.
  // Each knot is constrained in the original tangent/normal material basis,
  // close to its real endcap. It moves/rotates with the paper, not the screen.
  // Suppress tiny unfurl stubs and grow crease length continuously to prevent
  // frame-to-frame popping. Film renderers never add synthetic stamped ellipses.
  const creaseReveal=Math.max(0,Math.min(1,(length-32)/40));
  const contact=(side:"source"|"receiver",pressure:number)=>{
    const intensity=pressure*imprintDepth*creaseReveal;
    if(intensity<=0)return {creases:[] as string[],shadow:""};
    const direction=side==="source"?1:-1;
    const near=side==="source"?.018:.982;
    const into=(distance:number)=>near+direction*distance/length;
    const offsets=[-8,0,7];
    const reaches=[14.5,23,10.5];
    const creases=offsets.map((offset,i)=>{
      const reach=reaches[i]*intensity;
      // All six control coordinates must converge to the *same* finger-root
      // location as pressure approaches zero. A fixed 2-unit first segment
      // caused a visible pop even when imprint strength was only 0.02.
      const rooted=1+i*.8;
      const root=at(into(rooted),offset);
      const control=at(into(rooted+reach*.48),offset+(i-1)*1.75*intensity);
      const tip=at(into(rooted+reach),offset+(1-i)*2.6*intensity);
      return "M"+xy(root)+" Q"+xy(control)+" "+xy(tip);
    });
    // This screened shadow is also pressure-scaled in BOTH longitudinal and
    // transverse directions. At pressure=0 its entire topology collapses
    // into a single local point, with no fixed-size elliptical sticker.
    const shadowAt=(along:number,across:number)=>
      at(into(.5+along*intensity),-2.8+across*intensity);
    const shadow="M"+xy(shadowAt(0,0))+
      " C"+xy(shadowAt(1.7,-5))+" "+xy(shadowAt(7.5,-3.2))+
      " "+xy(shadowAt(13,-.4))+
      " C"+xy(shadowAt(7,1.5))+" "+xy(shadowAt(1.6,1.2))+
      " "+xy(shadowAt(0,0))+" Z";
    return {creases,shadow};
  };
  const sourcePressure=contact("source",sourceGrip);
  const receiverPressure=contact("receiver",receiverGrip);
  const contactCreases={
    source:sourcePressure.creases,receiver:receiverPressure.creases,
  };
  const contactShadows={
    source:sourcePressure.shadow,receiver:receiverPressure.shadow,
  };
  return { outline, border, fold, foldShade, ruling, postmark, hatching,
    contactCreases,contactShadows };
}

/** Independent blue/red press masters; no actor alpha or global RGB filter. */
export function RisoTransferSheetPlate({
  outline, geometry, paint, plateId, detail = true,
}: {
  outline: string;
  geometry: RisoTransferSheetGeometry;
  paint: RisoPaint;
  plateId: "blue" | "red";
  detail?: boolean;
}) {
  if (!outline) return null;
  if (plateId === "blue") return <g data-km-riso-transfer-plate="blue"
    fill="none" stroke={paint.solid} strokeLinejoin="round" pointerEvents="none">
    <path d={outline} strokeWidth={2.1}/>
    {detail && <>
      {geometry.border && <path data-km-riso-transfer-inset="" d={geometry.border} strokeWidth={.95}/>}
      {geometry.foldShade && <path data-km-riso-transfer-fold-shade="" d={geometry.foldShade}
        fill={paint.dots} stroke="none"/>}
      {geometry.fold && <path data-km-riso-transfer-fold="" d={geometry.fold} strokeWidth={.75}/>}
      {geometry.ruling.map((d, i) => <path key={i} data-km-riso-transfer-rule={i}
        d={d} strokeWidth={.85}/>)}
      {(["source","receiver"] as const).map(side=><g key={side}
        data-km-riso-material-pressure-side={side}>
        {geometry.contactShadows[side] && <path
          data-km-riso-contact-shadow={side}
          d={geometry.contactShadows[side]} fill={paint.dots} stroke="none"/>}
        {geometry.contactCreases[side].map((d,i)=><path key={i}
          data-km-riso-contact-crease={side+"-"+i}
          d={d} strokeWidth={[.95,.7,.55][i]} fill="none" strokeLinecap="round"/>)}
      </g>)}
    </>}
  </g>;
  return <g data-km-riso-transfer-plate="red" pointerEvents="none">
    {detail && <>
      {geometry.postmark && <path data-km-riso-transfer-postmark="" d={geometry.postmark}
        fill="none" stroke={paint.solid} strokeWidth={1.55}/>}
      {geometry.hatching && <path data-km-riso-transfer-print-grain="" d={geometry.hatching}
        fill="none" stroke={paint.solid} strokeWidth={.85}/>}
      {geometry.postmark && <path d={geometry.postmark} fill="none" stroke={paint.dots}
        strokeWidth={2.35}/>}
    </>}
  </g>;
}
