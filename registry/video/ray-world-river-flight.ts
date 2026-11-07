/** One unbroken flight up a procedural valley: a waterfall running backwards, a river, a glacier wall and a tunnel of blue
 * ice. The flight stops inside the ice, and then rewinds to the waterfall at speed. One photograph gives it a real sky.
 */
import { rayTrack } from "./ray-world";
import type { RayWorld } from "./ray-world";

const FRAG = `#version 300 es
precision highp float;
uniform float uFit,uT,uS,uFlow,uAp,uFocus,uExp,uF;
uniform vec2 uRes,uJ,uL; uniform vec3 uRo,uTa; uniform sampler2D t0;
out vec4 O;
float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float h3(vec3 p){ return hash(p.xy+p.z*17.3); }
float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*f*(f*(f*6.-15.)+10.);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
float noise3(vec3 p){ vec3 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z); }
const mat2 R=mat2(.8,.6,-.6,.8);
float fbm(vec2 p,int n){ float a=.5,s=0.; for(int i=0;i<n;i++){ s+=a*noise(p); p=R*p*2.03+7.1; a*=.5; } return s; }
float ridged(vec2 p,int n){ float a=.5,s=0.,w=1.; for(int i=0;i<n;i++){ float v=1.-abs(2.*noise(p)-1.); v*=v; s+=a*v*w; w=clamp(v*2.,0.,1.); p=R*p*2.05+3.3; a*=.5; } return s; }
float rc(float z){ return 16.*sin(z*.011)+6.*sin(z*.029+1.); }
const float CR=60.,SN=840.;
float wl(float z){ z=min(z,SN); return z<0.?0.:CR+z*.028+pow(z/900.,2.)*46.; }
const vec3 SUN=normalize(vec3(-.62,.16,.76));
float iceTop(vec2 p){ return wl(SN)+58.+(p.y-SN)*.24+7.*ridged(p*.018,3); }
float crack(vec2 p){ float z=p.y-SN-30.; return 3.2+11.*exp(-max(z+30.,0.)*.03)+.9*sin(z*.09)-abs(p.x-rc(p.y)+2.4*(fbm(p.yy*.08,2)-.5))-30.*smoothstep(SN+150.,SN+200.,p.y); }
float terL(vec2 p,int oct){
  float z=p.y,q=length((p-vec2(rc(0.),-16.))*vec2(1.,1.4));
  float pl=2.4+1.8*fbm(p*.03,oct>4?5:4)+smoothstep(170.,420.,abs(p.x))*70.*ridged(p*.004,4);
  float riv=abs(p.x-rc(0.)-14.*sin((z+30.)*.018)*smoothstep(-30.,-120.,z));
  return mix(-3.,pl,smoothstep(4.,9.,riv)*smoothstep(25.,40.,q));
}
float terU(vec2 p,int oct){
  float z=p.y,d=abs(p.x-rc(z));
  float wide=mix(190.,300.,smoothstep(500.,840.,z));
  float w=smoothstep(4.5,10.,d),walls=smoothstep(6.,wide,d);
  float bed=wl(max(z,0.))-1.4;
  float r=ridged(p*.0055+vec2(.3,.1),oct);
  float h=bed+w*(1.6+6.*fbm(p*.03,3))+walls*walls*(24.+230.*r)+walls*30.*(.5+.5*sin(z*.008));
  if(oct>3) h+=smoothstep(4.,26.,d)*(fbm(p*.075,oct-2)-.5)*9.;
  return h;
}
float zEdge(vec3 p){ float x=abs(p.x-rc(0.)); return mix(-5.,-5.+9.*(fbm(vec2(p.x*.05,p.y*.05),3)-.5)+.7*sin(p.x*1.6+2.*noise(p.xy*.3)),smoothstep(10.,26.,x)); }
float ter(vec2 p,int oct){ return p.y<-5.?terL(p,oct):terU(p,oct); }
float dGlacier(vec3 p,out float isIce){
  isIce=0.; if(p.z<SN-40.) return 1e5;
  float t=iceTop(p.xz),c=crack(p.xz)-max(p.y-wl(SN)-15.,0.)*.55+1.4*(fbm(vec2(p.y*.16,p.z*.09),3)-.5);
  float d=(p.y-t)*.5;
  d=max(d,c*.6);
  // The snout closes off the valley.
  d=max(d,(SN+9.*fbm(p.xy*.04,4)+.00004*(p.x-rc(p.z))*(p.x-rc(p.z))-p.z+.1*(p.y-wl(SN)))*.6);
  isIce=1.; return d;
}
float sheet(vec3 p){ float x=p.x-rc(0.),z=p.z+7.+1.2*sin(p.y*.11)+.5*sin(p.x*.5); return max(max(abs(x)-9.,abs(z)-.5),max(p.y-CR-1.,-p.y)); }
vec2 map(vec3 p,float t){
  int oct=t<34.?6:(t<160.?5:4);
  float e=zEdge(p),d=max((p.y-terU(p.xz,oct))*.42,(e-p.z)*.7),m=1.;
  if(p.z<20.){ float l=(p.y-terL(p.xz,oct))*.6; if(l<d){ d=l; m=1.; } float w0=max(p.y,p.z-e); if(w0<d){ d=w0; m=2.; } }
  float w=max(p.y-wl(p.z),e-p.z); if(w<d&&p.z<SN+400.){ d=w; m=2.; }
  float ii,g=dGlacier(p,ii); if(g<d){ d=g; m=3.; }
  float s=sheet(p); if(s<d){ d=s; m=4.; }
  return vec2(d,m);
}
vec3 nrm(vec3 p,float t){ float e=.012+.0024*t; vec2 k=vec2(1,-1)*e;
  return normalize(k.xyy*map(p+k.xyy,t).x+k.yyx*map(p+k.yyx,t).x+k.yxy*map(p+k.yxy,t).x+k.xxx*map(p+k.xxx,t).x); }
vec3 sky(vec3 d){
  float y=clamp(d.y,0.,1.);
  vec2 uv=vec2(.28+atan(d.x,d.z)*.3,.66+.34*pow(y,.55));
  vec3 c=textureLod(t0,uv,1.5).rgb*1.25;
  float s=max(dot(d,SUN),0.);
  c+=vec3(1.5,.86,.5)*pow(s,10.)*.32+vec3(3.,2.3,1.6)*pow(s,240.);
  return c;
}
float shadow(vec3 ro,vec3 rd,float t0){ float r=1.,t=.5; for(int i=0;i<30;i++){ vec3 p=ro+rd*t; float h=p.y-ter(p.xz,3); r=min(r,9.*h/t); t+=clamp(h,1.,28.); if(r<.01||t>420.) break; } return clamp(r,0.,1.); }
float trace(vec3 ro,vec3 rd,out float m){ float t=.3; m=-1.; vec2 h; for(int i=0;i<230;i++){ vec3 p=ro+rd*t; h=map(p,t); if(h.x<.0009*t){ m=h.y; return t; } t+=h.x; if(t>2400.||p.y>560.) return t; } m=h.y; return t; }
vec3 land(vec3 p,vec3 n,vec3 rd,float t){
  float near=smoothstep(180.,30.,t);
  // A cliff of basalt columns, with moss running down from the top.
  float face=smoothstep(.35,.1,n.y)*step(p.z,12.);
  if(face>.01){ float col=sin(p.x*1.9+2.4*noise(vec2(p.x*.4,p.y*.03)));
    n=normalize(n+vec3(.34*col,0.,0.)*face); }
  if(near>.01){ float e=.07; vec2 q=p.xz*.62; float a=fbm(q,5); vec3 bp=vec3(a-fbm(q+vec2(e,0.),5),0.,a-fbm(q+vec2(0.,e),5)); n=normalize(n+bp*3.4*near); }
  float sl=n.y,alt=(p.y-wl(max(p.z,0.)))/190.,d=abs(p.x-rc(p.z));
  float scree=fbm(vec2(p.x*.5,p.y*.14)+p.z*.03,4);
  vec3 rock=mix(vec3(.009,.009,.011),vec3(.04,.036,.034),smoothstep(.3,.7,scree));
  float tuft=fbm(p.xz*1.3,3),patchy=fbm(p.xz*.09,5),big=fbm(p.xz*.018+4.,3);
  vec3 moss=mix(vec3(.032,.058,.012),vec3(.19,.22,.03),smoothstep(.32,.66,patchy));
  moss=mix(moss,vec3(.15,.095,.03),smoothstep(.48,.64,big));
  moss*=.72+.75*tuft;
  float green=smoothstep(.46,.74,sl+.2*(fbm(p.xz*.2,3)-.5));
  float seep=face*smoothstep(.5,.72,fbm(vec2(p.x*.16,p.y*.018),3))*smoothstep(26.,50.,p.y);
  // Ledges hold moss, so the wall has layers.
  seep=max(seep,face*smoothstep(.6,.86,sin(p.y*.46+2.*noise(vec2(p.x*.06,p.y*.04)))*.5+.5)*smoothstep(.42,.62,noise(vec2(p.x*.12,p.y*.3))));
  vec3 alb=mix(mix(rock,moss,green),moss*.8,seep);
  float sn=smoothstep(.36,.6,alt+.24*(fbm(p.xz*.03,4)-.5)+.25*smoothstep(500.,1000.,p.z))*smoothstep(.44,.72,sl);
  alb=mix(alb,vec3(.8,.83,.88),sn);
  alb=mix(alb,vec3(.02,.019,.02),smoothstep(9.,5.,d)*(1.-sn));
  float dif=max(dot(n,SUN),0.),sh=dif>0.?shadow(p+n*.4,SUN,t):0.;
  float occ=clamp(.3+.8*fbm(p.xz*.05,3)*1.5,0.,1.)*(.7+.3*tuft);
  vec3 skyC=textureLod(t0,vec2(.3,.82),5.).rgb;
  vec3 c=alb*(vec3(6.2,4.4,2.8)*dif*sh+skyC*1.5*(.55+.45*n.y)*occ+vec3(.22,.17,.1)*max(.2-.3*n.y,0.));
  return c;
}
vec3 water(vec3 p,vec3 rd,float t){
  vec2 q=p.xz*vec2(.55,.16); float ph=uFlow*.9;
  float e=.06,a=fbm(q+vec2(0.,ph),4),b=fbm(q+vec2(e,ph),4),c=fbm(q+vec2(0.,ph+e),4);
  vec3 n=normalize(vec3(a-b,e*(5.+t*.05),a-c));
  if(p.z<-3.){ vec2 k=p.xz-vec2(rc(0.),-7.); float r=length(k); float w=sin(r*.9-uFlow*2.4)*exp(-r*.03); n=normalize(n+.18*w*vec3(k.x/r,0.,k.y/r)); }
  vec3 r=reflect(rd,n); r.y=abs(r.y);
  float F=.04+.96*pow(1.-max(dot(n,-rd),0.),5.);
  vec3 bank=vec3(.045,.06,.02)*smoothstep(.0,.16,1.-r.y*5.);
  vec3 cc=mix(vec3(.006,.03,.04)+bank*.5,sky(r)*.85,clamp(F*1.05+.05,0.,1.));
  float foam=smoothstep(.56,.74,fbm(p.xz*vec2(.3,.09)+vec2(0.,ph*.6),4))*smoothstep(9.,2.,abs(p.x-rc(p.z)))*(p.z>0.?.07:.3);
  return mix(cc,vec3(1.3,1.25,1.2),foam);
}
vec3 ice(vec3 p,vec3 n,vec3 rd){
  float in_=smoothstep(SN+10.,SN+50.,p.z);
  vec2 q=vec2(p.x+p.z,p.y)*mix(vec2(.09,.11),vec2(.34,.5),smoothstep(SN+4.,SN+24.,p.z));
  float e=.05,a=fbm(q,5); vec3 bp=vec3(a-fbm(q+vec2(e,0.),5),a-fbm(q+vec2(0.,e),5),0.); n=normalize(n+bp*3.);
  float dif=max(dot(n,SUN),0.),fr=ridged(q*2.,4),lay=.5+.5*sin(p.y*1.5+3.*fbm(q*.6,3));
  vec3 pale=vec3(.74,.84,.93)*(vec3(2.,1.7,1.45)*dif+vec3(.42,.54,.72));
  pale=mix(pale,vec3(.05,.34,.62),smoothstep(.4,.7,fr)*.34);
  float ahead=exp(-max(SN+190.-p.z,0.)*.03);
  float rib=smoothstep(.3,.75,fbm(vec2((p.x+p.z)*.5,p.y*1.6),4));
  vec3 cave=mix(vec3(.002,.03,.13),vec3(.012,.2,.47),clamp(.5+.5*dot(n,normalize(vec3(0.,.1,1.))),0.,1.))*(.55+.9*rib);
  cave=mix(cave,vec3(.05,.42,.66),ahead*.8);
  cave*=.72+.5*lay; cave+=vec3(.2,.55,.85)*smoothstep(.5,.7,fr)*.08;
  vec3 c=mix(pale,cave,in_);
  float F=.03+.97*pow(1.-max(dot(n,-rd),0.),5.);
  return c+mix(vec3(.3,.34,.4),vec3(.1,.34,.55),in_)*F;
}
vec3 fall(vec3 p,vec3 rd){
  float x=(p.x-rc(0.)),y=p.y/CR;
  float e=smoothstep(9.,6.5,abs(x)+1.8*sin(y*7.+x*.2));
  float a=fbm(vec2(x*.9,p.y*.08+uFlow*2.4),4),b=fbm(vec2(x*2.8+5.,p.y*.18+uFlow*3.6),3);
  float st=smoothstep(.3,.68,a*.65+b*.5);
  vec3 lit=vec3(1.2,1.12,1.04)*(.55+.45*st)*(1.1-.5*smoothstep(.0,1.,1.-y));
  return mix(vec3(.02,.03,.035),lit,e*(.4+.6*st));
}
void main(){
  vec2 px=gl_FragCoord.xy+uJ,uv=(2.*px-uRes)/uRes.y;
  vec3 f=normalize(uTa-uRo),r=normalize(cross(f,vec3(0,1,0))),u=cross(r,f);
  vec3 rd=normalize(uv.x*r+uv.y*u+uF/uFit*f),ro=uRo;
  float a=hash(gl_FragCoord.xy*.73)*6.2831,ca=cos(a),sa=sin(a);
  vec2 L=mat2(ca,-sa,sa,ca)*uL*uAp; vec3 fp=ro+rd*uFocus/dot(rd,f); ro+=r*L.x+u*L.y; rd=normalize(fp-ro);
  float m,t=trace(ro,rd,m); vec3 c;
  vec3 s=sky(rd);
  if(m<0.) c=s;
  else {
    vec3 p=ro+rd*t;
    if(m<1.5) c=land(p,nrm(p,t),rd,t);
    else if(m<2.5) c=water(p,rd,t);
    else if(m<3.5) c=ice(p,nrm(p,t),rd);
    else c=fall(p,rd);
    float fog=1.-exp(-pow(t*.00075,1.6));
    float inCrack=smoothstep(4.,18.,iceTop(uRo.xz)-uRo.y)*step(SN,uRo.z);
    vec3 fc=textureLod(t0,vec2(.3,.7),5.).rgb*1.1;
    fc+=vec3(.9,.6,.3)*pow(max(dot(rd,SUN),0.),6.)*.25;
    c=mix(c,fc,fog*(1.-inCrack));
  }
  // Spray hangs at the foot of the fall and moves with the water.
  float mist=0.; vec3 b=ro+rd*min(t,160.)*.0; float st=min(t,160.)/10.;
  for(int i=0;i<10;i++){ vec3 q=ro+rd*(float(i)+.5)*st; float nearF=exp(-pow(length((q-vec3(rc(0.),0.,-8.))*vec3(.05,.045,.05)),2.));
    mist+=nearF*smoothstep(.34,.72,noise3(q*vec3(.09,.05,.09)+vec3(0.,-uFlow*1.1,0.))); }
  c=mix(c,vec3(1.05,1.,.98),clamp(mist*.3,0.,.9));
  O=vec4(max(c*uExp,0.),1.);
}`;
const rc = (z: number) =>16*Math.sin(z*.011)+6*Math.sin(z*.029+1), SN=840;
const wl = (z: number) =>z<0?0:60+z*.028+Math.pow(z/900,2)*46;
const sm = (a: number, b: number, x: number) =>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
// The camera's distance along the river, forward in time, then a rewind.
const STOP=20.2, FLIP=21.0, BACK=23.6, END=26;
const zAt = rayTrack<number>([[0,-150],[3.4,-122],[5.8,-30],[8,70],[12,400],[15.6,760],[17.4,SN+30],[19.2,SN+120],[STOP,SN+150]]);
const place = (z: number) =>{
  const h = z<0 ? 26+sm(-120,-10,z)*48 : lerp2(wl(z)+14+7*Math.sin(z*.01),wl(SN)+6,sm(SN-130,SN-20,z));
  return [rc(z), h, z];
};
function pose(z: number) {
  if(z<0){ const u=sm(-120,0,z); const p=[rc(0),lerp2(30,70,u*u),z]; return {ro:p,ta:[rc(0)+0,lerp2(32,CRY(u),u),z+60],f:lerp2(2.9,1.6,u)}; }
  if(z<SN-10){ const p=place(z), a=place(z+26); return {ro:p,ta:[a[0],a[1]-1,a[2]],f:1.55}; }
  const y=wl(SN)+6;
  return {ro:[rc(z),y,z],ta:[rc(z+30),y+1.5,z+30],f:1.4};
}
function lerp2(a: number, b: number, t: number) {return a+(b-a)*t;}
const CRY = (u: number) =>lerp2(40,66,u);
const state = (t: number) => {
  let z;
  if(t<STOP) z=zAt(t);
  else if(t<FLIP) z=SN+150;
  else { const u=Math.min(1,(t-FLIP)/(BACK-FLIP)), e=u*u*(3-2*u); z=(SN+150)*(1-e)+(-150)*e; }
  const {ro,ta,f}=pose(z);
  // Water runs backwards until the flip, then forwards.
  const fl=t<FLIP?(t*1.0)+0:(FLIP-(t-FLIP)*1.0);
  return {uRo:ro,uTa:ta,uF:f,uFlow:fl,uAp:.02,uFocus:40,uExp:lerp2(1,1,0)};
};
export const riverFlightWorld: RayWorld = {
  id: "river-flight", title: "A flight up a river into a glacier tunnel", durationSeconds: END, frag: FRAG, samples: 6, shutter: .6, grain: .014, vignette: .2, posterSeconds: 18, state, imageSlots: [{ uniform: "t0", role: "a sky: the upper part of a landscape photograph" }],
};
