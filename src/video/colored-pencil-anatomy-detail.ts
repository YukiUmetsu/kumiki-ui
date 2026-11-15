import type { PencilTrace } from "../../registry/video/colored-pencil";

/**
 * Kingfisher side-view grip: short tarsi, partly fused anterior toes and
 * opposing short halluces. Each polygon shares a joint/overlap with a
 * neighbouring one; terminal keratin claws are separately hand drawn.
 */
export const KINGFISHER_PERCHING_FEET = {
  path: [
    "M114 182 Q118 179 123 184 Q123 193 121 204 Q122 208 118 210 Q114 208 114 204 Z",
    "M117 204 Q121 207 125 211 Q130 214 135 214 Q137 213 138 217 Q139 220 136 221 Q133 219 129 217 Q124 217 120 213 Q116 212 116 208 Z",
    "M119 207 Q113 209 111 215 Q108 218 105 218 Q101 218 100 221 Q102 224 106 222 Q114 220 119 212 Z",
    "M142 183 Q147 181 152 188 Q151 195 149 206 Q148 209 144 211 Q140 208 141 202 Z",
    "M146 205 Q151 209 155 213 Q159 216 164 216 Q166 216 167 219 Q167 222 164 222 Q161 219 157 219 Q152 216 147 214 Q143 213 143 209 Z",
    "M146 208 Q142 211 139 217 Q136 221 133 220 Q130 220 131 223 Q135 226 139 223 Q145 221 149 212 Z",
  ].join(" "),
  bounds: [98,178,72,51] as const,
  contactY: 218,
  details: [
    {path:"M133 216 Q137 215 138 218 Q139 222 135 224 M161 217 Q166 216 168 219 Q168 223 164 225",
      color:"#403845",width:.78,startFrame:230,durationFrames:52,opacity:.89},
    {path:"M105 219 Q101 219 100 222 Q100 225 104 225 M135 222 Q132 221 131 224 Q134 228 137 225",
      color:"#443B47",width:.70,startFrame:238,durationFrames:50,opacity:.88},
    {path:"M114 190 Q117 192 121 191 M115 195 Q118 197 121 196 M115 200 Q118 202 120 201 M143 193 Q147 195 150 194 M143 199 Q146 200 149 199 M143 204 Q146 206 148 205",
      color:"#D99D83",width:.58,startFrame:243,durationFrames:51,opacity:.90},
    {path:"M117 186 Q118 198 118 208 Q128 216 135 216 M146 188 Q144 200 146 211 Q156 216 163 218",
      color:"#F0BF99",width:.81,startFrame:251,durationFrames:50,opacity:.82},
    {path:"M119 208 Q113 213 105 220 M148 210 Q143 218 134 222",
      color:"#7A4A53",width:.65,startFrame:255,durationFrames:49,opacity:.83},
  ] satisfies PencilTrace[],
};

export type FeatherAxis=readonly [number,number,number,number,number,number,number];
const fixed=(n:number)=>n.toFixed(2);
const point=(a:FeatherAxis,t:number):readonly[number,number]=>{
  const q=1-t;
  return [q*q*a[0]+2*q*t*a[2]+t*t*a[4],
    q*q*a[1]+2*q*t*a[3]+t*t*a[5]];
};
const normal=(a:FeatherAxis,t:number):readonly[number,number]=>{
  const dx=2*(1-t)*(a[2]-a[0])+2*t*(a[4]-a[2]);
  const dy=2*(1-t)*(a[3]-a[1])+2*t*(a[5]-a[3]);
  const mag=Math.hypot(dx,dy);
  if(mag<1e-5)throw new RangeError("Degenerate feather tangent");
  return [-dy/mag,dx/mag];
};

/** Quietly irregular stations are authored to avoid an evenly spaced rake. */
const vaneStations=[.16,.24,.32,.405,.48,.56,.64,.72,.80,.875] as const;

/**
 * Every barb begins exactly on an authored feather shaft. A projected,
 * asymmetric vane curves forwards toward the tip, rather than radiating
 * at right angles like a fish skeleton. The soft outer barb tips and
 * sharper inner rachis share one local rig transform and opaque clip.
 *
 * This is editable geometry, not a sampled texture or copied artwork.
 */
export function vaneTracts(axes:readonly FeatherAxis[],color:string,startFrame=223):PencilTrace[] {
  if(axes.length<1||axes.length>14||!/^#[0-9a-fA-F]{6}$/.test(color)||
    !Number.isSafeInteger(startFrame)||startFrame<0||startFrame>350)
    throw new RangeError("Invalid feather family");
  return axes.map((a,j)=>{
    if(a.length!==7||a.some(n=>!Number.isFinite(n)||Math.abs(n)>4096) ||
      a[6]<=.3||a[6]>9||Math.hypot(a[4]-a[0],a[5]-a[1])<9)
      throw new RangeError("Invalid feather shaft");
    const [x0,y0,cx,cy,x1,y1,w]=a;
    // A reversing control handle creates a cusp and flips the barbs across
    // the shaft. Reject it before producing disconnected / inverted vanes.
    if((cx-x0)*(x1-cx)+(cy-y0)*(y1-cy)<0)
      throw new RangeError("Reversing feather rachis control handle");
    const cmd=["M"+fixed(x0)+" "+fixed(y0)+" Q"+fixed(cx)+" "+fixed(cy)+" "+fixed(x1)+" "+fixed(y1)];
    for(const [k,t] of vaneStations.entries()){
      const [x,y]=point(a,t),[nx,ny]=normal(a,t);
      // Plump at the median vane, narrowing toward the proximal and
      // distal ends. Slight hand-authored station variation avoids a comb.
      const envelope=(.19+.92*Math.sin(Math.PI*t))*(1-.20*t);
      const irregularity=.73+.25*(.5+.5*Math.sin((k+2)*(j+3)*2.39));
      for(const side of [-1,1] as const){
        const span=w*envelope*irregularity*(side<0?1:.47);
        const sweep=span*(.75+.19*t);
        const tx=x+nx*side*span+ny*sweep;
        const ty=y+ny*side*span-nx*sweep;
        const mx=x+nx*side*span*.40+ny*sweep*.21;
        const my=y+ny*side*span*.40-nx*sweep*.21;
        cmd.push("M"+fixed(x)+" "+fixed(y)+" Q"+fixed(mx)+" "+
          fixed(my)+" "+fixed(tx)+" "+fixed(ty));
      }
    }
    const path=cmd.join(" ");
    if(path.length>12000)throw new RangeError("Feather SVG exceeds CP1 trace budget");
    return {path,color,width:j%3===0?.41:.34,
      startFrame:startFrame+j*2,durationFrames:48,opacity:j%3===0?.48:.38};
  });
}

export const KINGFISHER_FOLDED_WING_AXES:readonly FeatherAxis[]=[
  [133,134,134,159,138,194,4.2],
  [138,128,143,155,144,188,4.8],
  [144,125,153,148,151,182,4.4],
  [151,125,159,143,159,174,4.3],
  [157,127,165,140,167,161,3.8],
  [133,144,138,162,144,177,3.4],
  [148,139,158,151,160,164,2.9],
];
export const KINGFISHER_COVERT_AXES:readonly FeatherAxis[]=[
  [130,126,138,138,147,151,3.8],
  [138,121,150,131,157,145,3.5],
  [146,119,160,125,166,134,3],
  [137,133,145,140,153,148,2.7],
];
