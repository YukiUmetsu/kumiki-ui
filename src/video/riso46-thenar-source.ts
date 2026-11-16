/**
 * RISO46: actual authored thenar web on the original two spot-ink masters.
 * The original anatomy CMC and index MCP sit at ±7.1,-3 and ±6,+5
 * in this specific character's palm-surface frame. This does not assert
 * a photographic three-quarter human hand.
 */
export type Riso46Actor="courier"|"paper-artist";
export type Riso46Side="left"|"right";
export const RISO46_THENAR_TOPOLOGY={
  thumbCmc:{lateral:7.1,y:-3},
  indexMcp:{lateral:6,y:5},
  source:"Kumiki ANAT1 hand, original RISO32 opposing thumb and index",
  projection:"original frontal editorial drawing, NOT validated photo anatomy",
} as const;

/** Source cubic ribbons, anchored to the true moving palm joint.
 * The paired red and blue physical stencils are not a viewport overlay.
 * Both actors have separate contours and tension while all existing
 * named source strokes remain preserved by the caller.
 */
export function riso46ThenarSource(actor:Riso46Actor,side:Riso46Side){
  const sign=side==="right"?1:-1;
  const x=(v:number)=>Number((sign*v).toFixed(2));
  const artist=actor==="paper-artist";
  const fullness=artist?.32:0;
  const fold=artist?.18:0;
  const red=[
    `M${x(6.45)} -4.15`,
    `C${x(8.3+fullness)} -5.03 ${x(10.10+fullness)} -3.80 ${x(10.72+fullness)} -1.62`,
    `C${x(11.35+fullness)} .36 ${x(10.82+fullness)} 2.15 ${x(9.84+fullness)} 3.39`,
    `C${x(9.28)} 4.42 ${x(8.30)} 5.22 ${x(7.25)} 5.72`,
    `C${x(6.15)} 6.31 ${x(4.90)} 6.05 ${x(4.42)} 5.16`,
    `C${x(5.47)} 3.94 ${x(6.21)} 2.60 ${x(6.28)} 1.13`,
    `C${x(6.03)} -.48 ${x(5.76)} -2.31 ${x(6.45)} -4.15 Z`,
    `M${x(6.77)} 1.58 C${x(7.59)} 2.10 ${x(8.39)} 2.58 ${x(8.17)} 3.62`,
    `C${x(7.90)} 4.51 ${x(6.65)} 4.93 ${x(5.91)} 4.80`,
    `C${x(6.50)} 3.97 ${x(6.79)} 2.95 ${x(6.77)} 1.58 Z`,
  ].join(" ");
  const blue=[
    `M${x(7.30)} -3.27 C${x(8.66+fold)} -2.87 ${x(9.35+fold)} -1.44 ${x(9.12)} .06`,
    `C${x(9.03)} 1.36 ${x(8.12)} 2.47 ${x(7.46)} 2.96`,
    `L${x(7.36)} 2.63 C${x(8.02)} 1.98 ${x(8.60)} .97 ${x(8.73)} -.07`,
    `C${x(8.88)} -1.60 ${x(8.02)} -2.69 ${x(7.30)} -3.27 Z`,
    `M${x(6.46)} 3.47 C${x(7.06)} 3.25 ${x(7.62)} 3.47 ${x(7.89)} 3.87`,
    `L${x(7.78)} 4.08 C${x(7.27)} 3.64 ${x(6.76)} 3.67 ${x(6.40)} 3.85 Z`,
    `M${x(7.80)} -2.24 C${x(8.20)} -1.84 ${x(8.38)} -1.10 ${x(8.34)} -.53`,
    `L${x(8.12)} -.49 Q${x(8.06)} -1.44 ${x(7.64)} -2.05 Z`,
  ].join(" ");
  return {
    red,blue,
    thumbCmc:{x:x(RISO46_THENAR_TOPOLOGY.thumbCmc.lateral),y:-3},
    indexMcp:{x:x(RISO46_THENAR_TOPOLOGY.indexMcp.lateral),y:5},
    plateCount:2 as const,
  };
}
