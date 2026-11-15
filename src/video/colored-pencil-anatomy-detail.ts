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
      color:"#403845",width:1.25,startFrame:230,durationFrames:52,opacity:.89},
    {path:"M105 219 Q101 219 100 222 Q100 225 104 225 M135 222 Q132 221 131 224 Q134 228 137 225",
      color:"#443B47",width:1.05,startFrame:238,durationFrames:50,opacity:.88},
    {path:"M114 190 Q118 192 122 190 M114 195 Q118 198 121 196 M114 201 Q117 203 120 201 M142 193 Q146 195 151 193 M142 198 Q146 200 149 198 M143 204 Q146 206 148 204",
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

/** Anatomically authored shaft/control/tip, with each barb attached to the same quadratic. */
export function vaneTracts(axes:readonly FeatherAxis[],color:string,startFrame=223):PencilTrace[] {
  if(axes.length<1||axes.length>14||!/^#[0-9a-fA-F]{6}$/.test(color)||
    !Number.isSafeInteger(startFrame)||startFrame<0||startFrame>350)
    throw new RangeError("Invalid feather family");
  return axes.map((a,j)=>{
    if(a.length!==7||a.some(n=>!Number.isFinite(n)) ||
      a[6]<=.3||a[6]>9||Math.hypot(a[4]-a[0],a[5]-a[1])<9)
      throw new RangeError("Invalid feather shaft");
    const [x0,y0,cx,cy,x1,y1,w]=a;
    const cmd=["M"+fixed(x0)+" "+fixed(y0)+" Q"+fixed(cx)+" "+fixed(cy)+" "+fixed(x1)+" "+fixed(y1)];
    for(const [i,t]of [.25,.43,.61,.78].entries()){
      const [x,y]=point(a,t),[nx,ny]=normal(a,t);
      const width=w*(1-.48*t)*(i%2===0?1:.91);
      for(const side of [-1,1]){
        const sw=width*(side>0?.77:1);
        const tx=x+nx*side*sw,ty=y+ny*side*sw;
        const xc=x+nx*side*sw*.6+(x1-x0)*.045;
        const yc=y+ny*side*sw*.6+(y1-y0)*.045;
        cmd.push("M"+fixed(x)+" "+fixed(y)+" Q"+fixed(xc)+" "+
          fixed(yc)+" "+fixed(tx)+" "+fixed(ty));
      }
    }
    return {path:cmd.join(" "),color,width:j%3===0?.64:.5,
      startFrame:startFrame+j*2,durationFrames:48,opacity:j%3===0?.84:.75};
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
