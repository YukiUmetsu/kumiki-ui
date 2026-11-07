/** A hanging water drop with a world inside it. Real refraction through both surfaces shows each picture upside down, and
 * the camera dives through the drop into that picture. After three pictures, a real ice cave comes into view, focus pulls
 * back to a ledge of that same ice, and the first drop forms again.
 */
import { RAY_LANDSCAPE } from "./ray-world";
import type { RayView, RayWorld } from "./ray-world";

const FRAG = `#version 300 es
precision highp float;
uniform float uFit,uT,uS,uMode,uCur,uNext,uCurZ,uNextZ,uR,uCeil,uW,uBlur,uHas,uExp,uIce,uFocus,uRise,uDefocus;
uniform vec2 uRes,uJ,uL,uCurC,uNextC; uniform vec3 uD;
uniform sampler2D t0,t1,t2,t3,t4,t5,t6;
uniform float uA2,uA3,uBridge,uHang,uNeck,uRip,uSat[4],uBead[4];
out vec4 O;
float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
const mat2 R2=mat2(.8,.6,-.6,.8);
float fbm(vec2 p,int n){ float a=.5,s=0.; for(int i=0;i<n;i++){ s+=a*noise(p); p=R2*p*2.03+7.1; a*=.5; } return s; }
float smin(float a,float b,float k){ float h=clamp(.5+.5*(b-a)/k,0.,1.); return mix(b,a,h)-k*h*(1.-h); }
// The three real places, each alive where water moves in it.
float pale(vec3 c){ return smoothstep(.34,.62,min(c.r,min(c.g,c.b))); }
vec3 photo(int k,vec2 uv,float lod){
  if(k==0){
    float cx=.722+.118*(uv.y-.2)/.72,m=smoothstep(.062,.02,abs(uv.x-cx))*smoothstep(.1,.2,uv.y)*smoothstep(.97,.9,uv.y);
    // Only white water moves, so the cliff beside it stays still.
    m*=pale(textureLod(t0,uv,3.).rgb);
    uv.y+=.03*m*(noise(vec2(uv.x*150.,uv.y*5.+uT*3.2))-.5); uv.x+=.0035*m*(noise(vec2(uv.y*30.+uT*2.,uv.x*50.))-.5);
    return textureLod(t0,uv,lod).rgb;
  }
  if(k==1){
    float m=smoothstep(.56,.62,uv.x)*smoothstep(.98,.92,uv.x)*smoothstep(.5,.56,uv.y)*smoothstep(.9,.84,uv.y);
    m=max(m,smoothstep(.54,.57,uv.x)*smoothstep(.65,.62,uv.x)*smoothstep(.42,.45,uv.y)*smoothstep(.56,.52,uv.y));
    float rv=smoothstep(.17,.22,uv.y)*smoothstep(.4,.34,uv.y)*smoothstep(.42,.3,uv.x);
    float white=pale(textureLod(t1,uv,3.).rgb); m*=white; rv*=white;
    uv+=m*vec2(.004,.024)*(noise(vec2(uv.x*120.,uv.y*6.+uT*3.))-.5);
    uv+=rv*vec2(.02,.008)*(noise(vec2(uv.x*14.-uT*3.,uv.y*70.))-.5);
    return textureLod(t1,uv,lod).rgb;
  }
  if(k==3) return textureLod(t6,uv,lod).rgb;
  vec2 c=vec2(.49,.385),d=(uv-c)*vec2(1.5,3.2);
  float r=length(d),w=step(uv.y,.56);
  uv+=w*normalize(d+1e-4)*vec2(.66,.31)*.012*sin(r*30.-uT*5.5)*exp(-r*1.15)*smoothstep(uRip,uRip-.3,r);
  return textureLod(t2,uv,lod).rgb;
}
vec3 plate(int k,vec2 p,vec2 c,float z,float lod){ return photo(k,c+.5*p/z*vec2(1./1.5,1.),lod)*(k<2?1.16:1.); }
// A drop is a sphere plus its two lowest shape modes, fitted to the solved Young-Laplace profile. They are perfectly smooth,
// because refraction magnifies any kink in the surface. A thin bridge of water ties it to the rock until it lets go.
float drop(vec3 p){
  vec3 q=p-uD;
  float l=max(length(q),1e-4),c=q.y/l,p2=.5*(3.*c*c-1.),p3=.5*c*(5.*c*c-3.);
  float d=(l-uR*(1.+uA2*p2+uA3*p3))*.84;
  if(uBridge>0.){
    float up=clamp(q.y/(uHang-uD.y),0.,1.);
    d=smin(d,max(length(q.xz)-uBridge*(1.+1.4*up*up),-q.y),uNeck);
  }
  // A thread of water does not vanish when it snaps: it leaves a satellite droplet, and a bead on the rock.
  if(uSat[3]>0.) d=min(d,length(p-vec3(uSat[0],uSat[1],uSat[2]))-uSat[3]);
  if(uBead[3]>0.) d=min(d,length(p-vec3(uBead[0],uBead[1],uBead[2]))-uBead[3]);
  return d;
}
vec3 dropN(vec3 p){ vec2 k=vec2(1,-1)*.0012; return normalize(k.xyy*drop(p+k.xyy)+k.yyx*drop(p+k.yyx)+k.yxy*drop(p+k.yxy)+k.xxx*drop(p+k.xxx)); }
float gT=1e9;
// In the cave the ledge is that same ice: the photograph supplies its surface, its scallops and its light.
vec2 iceUV(vec2 p){ return p*.15+vec2(.2,.42); }
float iceH(vec2 p,float lod){ return dot(textureLod(t6,iceUV(p),lod).rgb,vec3(.3,.5,.2)); }
// Wet basalt ledge.
float rockY(vec2 p){
  float a=abs(2.*fbm(p*.9+3.,3)-1.),h=uCeil-.16+.34*a+.26*textureLod(t5,p*.3,1.).r+.05*textureLod(t5,p*1.1,0.).r;
  if(uIce>.5) h=uCeil+.02+.2*fbm(p*.7+3.,2)+.22*iceH(p,5.5);
  // Water wets a wide patch of the surface it hangs from, so the ledge eases down over a broad area above the drop.
  vec2 q=p-vec2(.05,2.15);
  return mix(h,uHang+.03*textureLod(t5,p*1.1,0.).r,exp(-dot(q,q)*2.6));
}
float rock(vec3 p){ float lip=p.z-3.5-.45*fbm(vec2(p.x*.9,4.),3)+uIce*(.5*p.x*p.x*.25-.1); return max((rockY(p.xz)-p.y)*.55,-(-lip)*.6>0.?lip:lip); }
vec3 rockN(vec3 p){ vec2 e=vec2(.006,0.); return normalize(vec3(rock(p+e.xyy)-rock(p-e.xyy),rock(p+e.yxy)-rock(p-e.yxy),rock(p+e.yyx)-rock(p-e.yyx))); }
vec3 sky(vec3 d,float lod){ vec2 p=d.xy/max(.3,d.z)*1.7; return plate(int(uCur),p,uCurC,uCurZ,lod); }
vec3 rockScene(vec3 ro,vec3 rd){
  float t=.2,last=1.; bool hit=false;
  for(int i=0;i<70;i++){ last=rock(ro+rd*t); if(last<.0012*t){ hit=true; break; } t+=last; if(t>9.) break; }
  // A ray skimming a crest can run out of steps close to the rock. It hit the rock: it did not reach the sky.
  if(!hit&&t<9.&&last<.06) hit=true;
  vec2 s=gl_FragCoord.xy/uRes.y;
  vec2 sp=(2.*gl_FragCoord.xy-uRes)/uRes.y*uFit+uL*uBlur;
  vec3 bg=vec3(0);
  // A mip level alone leaves its texel grid in the blur, so a soft plate gathers several taps across the aperture.
  if(uFocus<.4) bg=plate(int(uCur),sp,uCurC,uCurZ,uFocus);
  // Each pixel turns the pattern, so the taps average to a smooth blur and do not trace lines.
  else { float turn=6.28318*hash(gl_FragCoord.xy*.0137+uJ); for(int i=0;i<9;i++){ float a=float(i)*2.39996+turn,r=sqrt((float(i)+.5)/9.); bg+=plate(int(uCur),sp+vec2(cos(a),sin(a))*r*uFocus*.03,uCurC,uCurZ,max(uFocus-1.,0.)); } bg/=9.; }
  if(!hit) return bg;
  gT=t;
  vec3 p=ro+rd*t,n=rockN(p);
  if(uIce>.5){
    vec2 e2=vec2(.012,0.);
    n=normalize(n+vec3(iceH(p.xz+e2,3.)-iceH(p.xz-e2,3.),0.,iceH(p.xz+e2.yx,3.)-iceH(p.xz-e2.yx,3.))*1.6);
    vec3 ice=texture(t6,iceUV(p.xz)).rgb,r=reflect(rd,n);
    float F=.03+.97*pow(1.-max(dot(n,-rd),0.),5.);
    // Ice is lit from within, so its picture is its light. Only the wet skin adds to it.
    return ice*(.5+.8*max(dot(n,normalize(vec3(-.3,-.6,.74))),0.))+sky(r,3.)*min(F,.5)*.55*smoothstep(.02,.22,dot(n,-rd));
  }
  // Real scanned basalt: colour, normals and height.
  vec2 uv=p.xz*1.1;
  vec3 tn=textureLod(t4,uv,1.).xyz*2.-1.;
  n=normalize(n+vec3(tn.x,0.,tn.y)*.42);
  vec3 alb=texture(t3,uv).rgb*.3;
  float wet=smoothstep(.34,.6,fbm(p.xz*1.6,3)+.25*textureLod(t5,uv,2.).r);
  // The rock around a hanging drop is always wet.
  if(uBridge>0.||uBead[3]>0.) wet=max(wet,smoothstep(.95,.35,length(p.xz-vec2(.05,2.15))));
  alb*=mix(1.,.42,wet);
  vec3 r=reflect(rd,n),e=sky(r,3.);
  float F=.03+.97*pow(1.-max(dot(n,-rd),0.),5.);
  vec3 sun=normalize(vec3(.5,-.1,.86));
  float lit=.32+.68*max(dot(n,normalize(vec3(.3,-.55,.78))),0.);
  vec3 c=alb*(vec3(.95,.82,.8)*lit);
  // At a grazing rim the mirror term has no real surface behind it, so it fades out and leaves no bright line.
  float rim=smoothstep(.02,.22,dot(n,-rd));
  c+=e*min(F,.5)*(.15+.6*wet)*rim;
  c+=vec3(1.,.72,.5)*.5*pow(max(dot(r,sun),0.),60.)*wet*rim;
  return c;
}
vec3 backdrop(vec3 ro,vec3 rd,vec2 p){
  if(uMode<.5) return rockScene(ro,rd);
  return plate(int(uCur),p+uL*uBlur,uCurC,uCurZ,uBlur>.002?2.:0.);
}
vec3 lens(vec3 p,vec3 rd){
  // Trace in, across and out of the water, as light does.
  vec3 n=dropN(p),t1=refract(rd,n,1./1.333);
  vec3 a=p-n*.004; float s=.0;
  for(int i=0;i<56;i++){ float h=-drop(a+t1*s); if(h<.0012) break; s+=h; if(s>uR*4.) break; }
  vec3 b=a+t1*s,m=-dropN(b),d=refract(t1,m,1.333);
  float tir=0.; if(dot(d,d)<.01){ d=reflect(t1,m); tir=1.; }
  float th=acos(clamp(d.z,-1.,1.));
  vec2 q=normalize(d.xy+1e-5)*th*mix(1.,1.32/(cos(th)+.34+1e-3)*sin(th)/max(th,1e-3),uW);
  float w=uW,ca=cos(3.14159*w),sa=sin(3.14159*w);
  q=mat2(ca,-sa,sa,ca)*q;
  vec2 pix=(2.*gl_FragCoord.xy-uRes)/uRes.y*uFit;
  q=mix(q,pix,smoothstep(.72,1.,w));
  vec3 c=plate(int(uNext),q*(1.-.08*w),uNextC,uNextZ,0.)*vec3(.94,.99,1.02);
  if(tir>.5) c*=.42;
  // A hanging drop looks up at what holds it, so the ledge shows dark, at the bottom of the upside-down picture.
  if(uBridge>0.&&uMode<.5) c=mix(c,mix(vec3(.012,.012,.014),vec3(.008,.05,.08),uIce),max(smoothstep(.42,.72,d.y),smoothstep(.72,.98,(b.y-uD.y)/uR))*(1.-uW));
  return c;
}
void main(){
  vec2 px=gl_FragCoord.xy+uJ,p=(2.*px-uRes)/uRes.y*uFit;
  // A real lens: rays leave across the aperture and meet at the drop's distance, so the ledge goes soft while the cave is sharp.
  vec3 ro=vec3(uL*uDefocus,uRise),rd=normalize(vec3(p*2.15/1.7,2.15)+vec3(0.,uRise,0.)-ro);
  vec3 c=backdrop(ro,rd,p);
  // The drop sits in the focal plane, so its picture stays sharp whatever the aperture does to the ledge.
  ro=vec3(0.,uRise,0.); rd=normalize(vec3(p,1.7));
  if(uHas>.5){
    float t=max(uD.z-uR*2.6,.001); bool hit=false;
    // Bounding sphere first: most pixels never touch the drop.
    vec3 oc=ro-uD; float b=dot(oc,rd),h=b*b-dot(oc,oc)+pow(uR*1.5,2.);
    if(uBridge>0.||uSat[3]>0.||uBead[3]>0.||h>0.) for(int i=0;i<72;i++){ float dd=drop(ro+rd*t); if(dd<.0012){ hit=t<gT; break; } t+=dd; if(t>uD.z+uR*3.) break; }
    if(hit){
      vec3 q=ro+rd*t,n=dropN(q);
      vec3 lc=lens(q,rd);
      float nv=max(dot(n,-rd),0.),F=.02+.98*pow(1.-nv,5.);
      vec3 r=reflect(rd,n);
      vec2 rq=r.xy/(abs(r.z)+.5)*1.4;
      vec3 rf=plate(int(uCur),rq,uCurC,uCurZ,3.);
      // The photograph clips its light source, so restore that range from a soft level. Bright places then glow in the water.
      vec3 hot=plate(int(uCur),rq,uCurC,uCurZ,6.5);
      rf*=1.+16.*smoothstep(.46,.9,min(hot.r,min(hot.g,hot.b)));
      lc=mix(lc,vec3(dot(lc,vec3(.3,.55,.15))),.14);
      c=mix(lc,rf,F);
      c*=.42+.58*smoothstep(.0,.34,nv);
      // A real drop mirrors the shape of its light, not a point.
      vec3 sun=normalize(vec3(.5,.74,-.46)),su=normalize(cross(sun,vec3(0.,1.,0.))),sv=cross(su,sun);
      float sd=max(dot(r,sun),1e-3),pane=smoothstep(1.,.5,length(vec2(dot(r,su)/.07,dot(r,sv)/.1)/sd))*step(0.,dot(r,sun));
      c+=mix(vec3(1.,.94,.86),vec3(.88,.95,1.),uIce)*1.1*pane*(1.-uW*.8);
      c+=vec3(.75,.85,1.)*.35*smoothstep(.18,.0,abs(nv-.2))*smoothstep(.2,.8,-n.y)*(1.-uW);
      // Light gathers on the far side of the drop.
      vec3 fall=normalize(vec3(.1,-.86,-.5));
      float caus=pow(max(dot(n,fall),0.),26.),spot=pow(max(dot(n,fall),0.),320.);
      c+=mix(vec3(1.,.86,.72),vec3(.7,.9,1.),uIce)*(caus*.4+spot*1.6)*(1.-uW);
    }
  }
  O=vec4(max(c*uExp,0.),1.);
}`;
const sm = (a: number, b: number, x: number) =>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
const eIn = (a: number, b: number, x: number) =>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*t;};
const eOut = (a: number, b: number, x: number) =>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return 1-(1-t)*(1-t)*(1-t);};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mix2 = (a: readonly number[], b: readonly number[], t: number) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
// Each world's framing: where the camera looks in the photograph.
const W=[
  {c0:[.70,.56],c1:[.74,.72],z0:1.25,z1:1.9},
  {c0:[.60,.5],c1:[.72,.68],z0:1.25,z1:1.9},
  {c0:[.5,.55],c1:[.49,.38],z0:1.25,z1:3.4},
];
const REL=3.6,D1=5.3,D2=10.6,D3=15.8,D4=20,END=26;
/** The Young-Laplace pendant profile, with lengths in apex radii. `bond` is gravity against surface tension. */
const modes = new Map<number, { a2: number; a3: number }>();
/** The P2 and P3 shape of a pendant drop, projected from the Young-Laplace profile about its centre. `bond` is gravity against surface tension. */
export function pendantModes(bond: number) {
  const key = Math.round(bond * 200) / 200, known = modes.get(key);
  if (known) return known;
  const points: [number, number][] = [], ds = .004;
  let r = 1e-5, z = 0, phi = 0, past = false;
  for (let i = 0; i < 2000; i += 1) {
    const curve = i === 0 ? 1 : 2 - key * z - Math.sin(phi) / r;
    phi += curve * ds; r += Math.cos(phi) * ds; z += Math.sin(phi) * ds;
    points.push([r, z]);
    if (phi > Math.PI / 2) past = true;
    if ((past && phi <= Math.PI / 2) || phi > 3) break;
  }
  const centre = points[points.findIndex(point => point[0] === Math.max(...points.map(item => item[0])))][1];
  let a0 = 0, a2 = 0, a3 = 0, w = 0;
  points.forEach(([x, y], i) => {
    if (!i) return;
    const dy = y - centre, l = Math.hypot(x, dy), c = dy / l, step = Math.hypot(x - points[i - 1][0], y - points[i - 1][1]) * x / (l * l);
    a0 += l * step; w += step; a2 += l * .5 * (3 * c * c - 1) * step * 5; a3 += l * .5 * c * (5 * c * c - 3) * step * 7;
  });
  const made = { a2: a2 / a0, a3: a3 / a0 };
  modes.set(key, made);
  return w ? made : { a2: 0, a3: 0 };
}
/** A drop under `ceiling`, growing with `grow`, then stretching and thinning its bridge with `pinch`. */
function hanging(grow: number, pinch: number, ceiling: number, x: number, z: number, size: number) {
  const { a2, a3 } = pendantModes(.06 + .16 * grow), radius = size * (.5 + .5 * grow), A2 = a2 * .4 + .12 * pinch, A3 = a3 * .4 + .2 * pinch;
  // The top of a hanging drop is wetted into the surface. The patch narrows as the drop grows heavy, then the neck pulls out.
  const sunk = .2 * (1 - .45 * grow) * (1 - pinch), lowest = ceiling - radius * (1 + A2 + A3 - sunk) + .05 - .46 * pinch * pinch;
  return { uD: [x, lowest, z], uR: radius, uA2: A2, uA3: A3, uHang: ceiling + .02, uNeck: radius * (.14 + .3 * pinch), uBridge: Math.max(.003, radius * (.012 + .22 * (1 - pinch) ** 3) * Math.min(1, pinch * 4)) };
}
const placed = (t: number, aspect: number) => {
  // A frame stays inside its photograph. The width it shows follows the shape of the output.
  const fit = (c: readonly number[], z: number) => [Math.min(1-aspect/(3*z),Math.max(aspect/(3*z),c[0])),Math.min(1-.5/z,Math.max(.5/z,c[1]))];
  // A narrow frame pulls a falling drop in from the side, so the edge never cuts it.
  const side=Math.min(1,aspect/1.2);
  const fall = (z: number, x: number, y: number, R: number, tA: number, tB: number, dive0: number, dive1: number) =>{
    const a=eOut(tA,tB,t), d=eIn(dive0,dive1,t);
    return {uD:[lerp(x*side,0,d),lerp(y,0,d)+lerp(1.5,0,a)*(1-d),lerp(z,R*1.24,d)],uR:R,uHas:t>tA?1:0,uA2:.08*Math.sin(t*14)*(1-d)};
  };
  const world = (i: number, t0: number, t1: number) =>{const u=sm(t0,t1,t),z=lerp(W[i].z0,W[i].z1,u);return {c:fit(mix2(W[i].c0,W[i].c1,u),z),z};};
  const base={uMode:1,uCur:0,uNext:0,uCurC:[.5,.5],uCurZ:1.25,uNextC:[.5,.5],uNextZ:1.25,uD:[0,0,3],uR:.6,uA2:0,uA3:0,uBridge:0,uHang:.8,uNeck:.1,uRip:Math.max(0,.04+.62*(t-15.9)),uSat:[0,0,0,0],uBead:[0,0,0,0],uCeil:1,uW:0,uBlur:0,uHas:0,uExp:1,uIce:0,uFocus:3.2,uRise:0,uDefocus:.03};
  if(t<D1){ // The ledge. One drop swells, holding the waterfall upside down, and lets go.
    const s=sm(0,2.8,t),pinch=eIn(2.6,REL,t),d=eIn(3.8,D1,t),lens={uMode:0,uCur:0,uNext:0,uCurC:[.5,.6],uCurZ:1.25,uNextC:mix2([.66,.56],fit(W[0].c0,W[0].z0),d),uNextZ:lerp(.62,W[0].z0,d),uCeil:1.02,uW:sm(.5,1,d),uBlur:.045,uHas:1};
    if(t<REL) return {...base,...lens,...hanging(s,pinch,.8,.05,2.15,.66)};
    // Free of the rock: it falls, ringing in its lowest mode.
    const since=t-REL,bottom=hanging(1,1,.8,.05,2.15,.66).uD[1];
    // What the thread leaves behind: a droplet falling after the drop, and a bead recoiling up onto the rock.
    const bead=.1*(1-Math.exp(-since*24))*(1+.16*Math.cos(since*40)*Math.exp(-since*7)),gone=sm(.5,1,d);
    return {...base,...lens,uA2:.2*Math.cos(since*22)*Math.exp(-since*3),uA3:.2*Math.exp(-since*16),uD:[lerp(.05,0,d),lerp(bottom-.9*since*since,0,d),lerp(2.15,.66*1.24,d)],uR:.66,
      uSat:[.05,bottom+.86-.8*since*since-.5*since,2.15,.035*(1-gone)],uBead:[.05,.84-bead*.4,2.15,bead*(1-gone)]};
  }
  if(t<D2){ const w=world(0,D1,D2),d=eIn(D2-1.5,D2,t);
    const f=fall(2.5,.8,.06,.56,D1+1.2,D2-1.6,D2-1.5,D2);
    return {...base,uCur:0,uNext:1,uCurC:w.c,uCurZ:w.z,uNextC:mix2([.62,.56],fit(W[1].c0,W[1].z0),d),uNextZ:lerp(.62,W[1].z0,d),...f,uW:sm(.5,1,d)};
  }
  if(t<D3){ const w=world(1,D2,D3),d=eIn(D3-1.5,D3,t);
    const f=fall(2.5,-.74,.05,.56,D2+1.2,D3-1.6,D3-1.5,D3);
    return {...base,uCur:1,uNext:2,uCurC:w.c,uCurZ:w.z,uNextC:mix2([.5,.48],fit(W[2].c0,W[2].z0),d),uNextZ:lerp(.62,W[2].z0,d),...f,uW:sm(.5,1,d)};
  }
  if(t<D4){ const w=world(2,D3,D4),u=eIn(D4-1.1,D4,t);
    return {...base,uCur:2,uCurC:w.c,uCurZ:lerp(w.z,8,u),uExp:lerp(1,.04,sm(D4-.35,D4,t))};
  }
  // Under the ice, in a real cave. Focus pulls back to a ledge of that ice, and a drop forms there. It is the first drop.
  const pull=sm(D4+1.5,D4+3.1,t),g=sm(D4+2.2,END-.4,t),o=sm(D4,END,t),z=lerp(1.2,1.46,o);
  return {...base,uMode:0,uIce:1,uCur:3,uCurC:fit(mix2([.6,.46],[.66,.5],o),z),uCurZ:z,uBlur:.045*pull,uFocus:lerp(0,3,pull),uRise:lerp(-1.5,0,pull),uDefocus:lerp(.09,.05,pull),uExp:lerp(.04,1,eOut(D4,D4+.9,t)),uNext:0,uNextC:[.66,.56],uNextZ:.62,uCeil:1.02,uHas:1,...hanging(g,0,.8,.05,2.15,.66)};
};
const state = (t: number, view: RayView = RAY_LANDSCAPE) => {
  const placedNow = placed(t, view.aspect);
  return { ...placedNow, uCurZ: placedNow.uCurZ * view.fit, uNextZ: placedNow.uNextZ * view.fit, uRise: placedNow.uRise * view.fit };
};
export const waterDropWorld: RayWorld = {
  id: "water-drop", title: "A water drop with a landscape inside it, in a real glacier cave", durationSeconds: END, frag: FRAG, samples: 12, grain: .012, vignette: .24, posterSeconds: 24.5, state,
  imageSlots: [{ uniform: "t0", role: "the first place, seen through the first drop" }, { uniform: "t1", role: "the second place" }, { uniform: "t2", role: "the third place, a still water surface" },
    { uniform: "t3", role: "a rock colour map" }, { uniform: "t4", role: "that rock's normal map" }, { uniform: "t5", role: "that rock's height map" },
    { uniform: "t6", role: "the last place, a glacier cave seen from inside" }],
};
