/**
 * RISO51 — geometry-first, source-vector morphing for RISO2 animated stencils.
 *
 * A print part may change its *real* ink silhouette between source-drawn
 * keyframes. The topology is fixed: an identical sequence of SVG commands
 * and control-point numbers, never a crossfade of two alpha images.
 * This avoids switching a complex original Bézier profile in one cel, keeps
 * knockout and RED/BLUE masters in exact registration, and preserves live
 * authored anatomical markings on their existing moving rig joints.
 *
 * All path validation runs at the character contract boundary. Unsupported
 * arc flags or incompatible point topologies are rejected (not blended).
 */
export interface RisoPathMorphKey {
  frame:number;
  d:string;
  easing?:"linear"|"ease"|"hold";
}

const COMMAND=/^[MmLlHhVvCcSsQqTtAaZz]$/;
const NUMBER=/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?$/;
const TOKEN=/[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?/g;
function tokenize(d:string):readonly string[]|null{
  if(typeof d!=="string"||d.length===0||d.length>20000)return null;
  const tokens=d.match(TOKEN);
  if(!tokens||tokens.length>5000||d.replace(TOKEN,"").replace(/[\s,]/g,"")!=="")return null;
  if(!tokens.some(t=>t==="M"||t==="m"))return null;
  return tokens;
}
/** Returns a specific source-contract error, or null for fully matchable ink.
 * The base path is also required at frame zero to prevent moving the initial
 * silhouette discontinuously; all five-hand artists can reuse the API.
 */
export function inspectRisoPathMorph(base:string,keys:readonly RisoPathMorphKey[],duration:number):string|null{
  if(keys.length<2||keys.length>24)return "pathKeys require 2..24 source samples";
  if(keys[0]?.frame!==0||keys[0].d!==base)
    return "pathKeys must start at frame 0 with the exact authored original path";
  const baseTokens=tokenize(base);
  if(!baseTokens)return "invalid base SVG vector";
  if(baseTokens.some(t=>t==="A"||t==="a"))
    return "elliptical arc flag path topology cannot interpolate";
  const shape=baseTokens.map(t=>COMMAND.test(t)?t:"#").join(" ");
  let last=-1;
  for(const [i,key] of keys.entries()){
    if(!Number.isSafeInteger(key.frame)||key.frame<=last||key.frame>=duration)
      return "path key "+i+" frame must be strictly increasing in timeline";
    if(key.easing!==undefined&&!["linear","ease","hold"].includes(key.easing))
      return "path key "+i+" has unknown easing";
    const tokens=tokenize(key.d);
    if(!tokens||tokens.length!==baseTokens.length||
      tokens.map(t=>COMMAND.test(t)?t:"#").join(" ")!==shape)
      return "path key "+i+" has incompatible Bézier command topology";
    if(tokens.some(t=>NUMBER.test(t)&&(!Number.isFinite(Number(t))||Math.abs(Number(t))>8192)))
      return "path key "+i+" has out-of-bounds source control point";
    last=key.frame;
  }
  return null;
}
/** Pure, deterministic original-point interpolation. Call only with inspected
 * source keys. Returns an SVG path, NOT an alpha blend or a raster screenshot.
 */
export function evaluateRisoPathMorph(keys:readonly RisoPathMorphKey[],frame:number):string{
  let index=0;
  while(index+1<keys.length&&keys[index+1].frame<=frame)index++;
  const source=keys[index],next=keys[index+1];
  if(!next||source.easing==="hold"||frame===source.frame)return source.d;
  const t=Math.max(0,Math.min(1,(frame-source.frame)/(next.frame-source.frame)));
  const ease=source.easing==="ease"?t*t*(3-2*t):t;
  if(ease===0)return source.d;
  if(ease===1)return next.d;
  const a=tokenize(source.d)!,b=tokenize(next.d)!;
  return a.map((t,i)=>{
    if(COMMAND.test(t))return t;
    const value=Number(t)+(Number(b[i])-Number(t))*ease;
    return String(Number(value.toFixed(5)));
  }).join(" ");
}
