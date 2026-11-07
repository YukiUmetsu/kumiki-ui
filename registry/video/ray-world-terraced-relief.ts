/** A terraced plaster island on a terracotta table, lit like a product. A river steps down its layers, blue ice sweeps over
 * its peaks and retreats, and the water spills across the table. It needs no pictures.
 */
import { rayTrack } from "./ray-world";
import type { RayWorld } from "./ray-world";

const FRAG = `#version 300 es
precision highp float;
uniform float uFit,uT,uS,uIce,uFlow,uFill,uAp,uFocus,uLight;
uniform vec2 uRes,uJ,uL; uniform vec3 uRo,uTa;
out vec4 O;
float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*f*(f*(f*6.-15.)+10.);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
const mat2 R=mat2(.8,.6,-.6,.8);
float fbm(vec2 p,int n){ float a=.5,s=0.; for(int i=0;i<n;i++){ s+=a*noise(p); p=R*p*2.03+7.1; a*=.5; } return s; }
float ridged(vec2 p,int n){ float a=.5,s=0.,w=1.; for(int i=0;i<n;i++){ float v=1.-abs(2.*noise(p)-1.); v*=v; s+=a*v*w; w=clamp(v*1.6,0.,1.); p=R*p*1.9+3.3; a*=.45; } return s; }
float rx(float z){ return .33*sin(z*1.6+.5)+.1*sin(z*3.1+1.)-.1; }
const float LIP=-.62;
float bed(float z){ float q=clamp((z-LIP)/1.7,0.,1.); return .055+.2*smoothstep(LIP-.015,LIP+.015,z)+.1*q+.42*q*q; }
float land(vec2 p){
  float q=clamp((p.y+1.1)/2.2,0.,1.);
  float r=ridged(p*.95+vec2(1.3,3.1),3);
  float e=length(p*vec2(.56,.88))+.2*(fbm(p*1.15+3.,2)-.5);
  float isl=smoothstep(1.0,.58,e);
  float bulk=.1+q*.2+(.22+.8*q*q)*r*(.5+.5*smoothstep(-1.6,1.,p.x+p.y));
  float d=abs(p.x-rx(p.y));
  float v=smoothstep(.015,.42+.22*q,d+.05*(fbm(p*3.,2)-.5));
  float h=mix(bed(p.y),bulk+.12*v,v*v*(3.-2.*v));
  // A lake sits below the fall.
  vec2 lk=(p-vec2(rx(LIP),LIP-.3))*vec2(1.,1.5);
  h=mix(.02,h,smoothstep(.2,.42,length(lk)+.12*(fbm(p*3.+9.,2)-.5)));
  return max(h*isl-.012,0.);
}
const float N=24.;
float terr(float h){ float t=h*N,f=fract(t); return (floor(t)+smoothstep(0.,.14,f))/N; }
float iceAt(vec2 p,float h){ return smoothstep(0.,.018,h+.06*(fbm(p*5.,2)-.5)-uIce); }
float wWidth(float z){ float q=clamp((z-LIP)/1.7,0.,1.); return mix(.0065,.05,uFlow)*(1.2-.8*q); }
float waterH(vec2 p){ if(p.y<LIP||p.y>.74||land(p)<.02) return -1.; float w=wWidth(p.y),d=abs(p.x-rx(p.y)); if(d>w) return -1.; return terr(bed(p.y))+.0035+.012*sqrt(1.-d*d/(w*w))*(.5+w/.05); }
float streaks(vec3 p){ float x=(p.x-rx(LIP))*260.; float a=fbm(vec2(x,p.y*5.+uT*5.),3),b=fbm(vec2(x*.4+5.,p.y*11.+uT*8.),3); return smoothstep(.34,.66,a*.6+b*.55); }
float sdB(vec2 p,vec2 b){ vec2 d=abs(p)-b; return length(max(d,0.))+min(max(d.x,d.y),0.); }
float sheet(vec3 p){
  float top=bed(LIP+.02),t=clamp(1.-p.y/top,0.,1.);
  float x0=rx(LIP),w=wWidth(LIP)*(1.-.1*t);
  float z=LIP-.004-.05*t*t*(.5+uFlow);
  vec2 q=vec2(p.x-x0,p.z-z);
  q.x+=.0045*sin(p.y*44.+uT*10.)*t;
  return max(sdB(q,vec2(w,.003+.003*uFlow))-.0015,max(p.y-top-.01,-p.y));
}
float lake(vec3 p){ vec2 c=(p.xz-vec2(rx(LIP),LIP-.14))*vec2(1.,1.3); float an=atan(c.y,c.x); float r=.03+.62*uFill*(1.+.12*sin(an*3.+1.)+.07*sin(an*7.)); return max(length(c)-r,p.y-.0065)*.8; }
vec2 map(vec3 p){
  float d=p.y,m=0.;
  if(p.y<1.32){
    float h=terr(land(p.xz)),wh=waterH(p.xz),i=h>.001?iceAt(p.xz,h):0.;
    float th=h+i*(.008+.012*noise(p.xz*14.));
    float hh=max(th,wh),b=(p.y-hh)*.42;
    if(b<d){ d=b; m=hh<.004?0.:(wh>th?2.:(i>.5?3.:1.)); }
  } else d=min(d,p.y-1.28);
  if(uFlow>.01){ float s=sheet(p); if(s<d){ d=s; m=4.; } }
  float l=lake(p); if(l<d){ d=l; m=2.; }
  return vec2(d,m);
}
vec3 nrm(vec3 p,float e){ vec2 k=vec2(1,-1)*e;
  return normalize(k.xyy*map(p+k.xyy).x+k.yyx*map(p+k.yyx).x+k.yxy*map(p+k.yxy).x+k.xxx*map(p+k.xxx).x); }
vec3 keyL(){ return normalize(vec3(-.74+.5*uLight,.4,.42)); }
float shadow(vec3 ro,vec3 rd){ float r=1.,t=.01; for(int i=0;i<40;i++){ float h=map(ro+rd*t).x; r=min(r,7.*h/t); t+=clamp(h,.008,.14); if(r<.003||t>3.6) break; } r=clamp(r,0.,1.); return r*r*(3.-2.*r); }
float ao(vec3 p,vec3 n){ float o=0.,s=1.; for(int i=1;i<=5;i++){ float h=.012+.045*float(i); o+=(h-map(p+n*h).x)*s; s*=.6; } return clamp(1.-1.9*o,0.,1.); }
vec3 env(vec3 d){
  float g=smoothstep(-.3,.9,d.y);
  vec3 c=mix(vec3(.16,.07,.05),vec3(.3,.31,.34),g);
  vec3 l=keyL(),u=normalize(cross(l,vec3(0,0,1))),v=cross(l,u);
  float dl=max(dot(d,l),.01),a=dot(d,u)/dl,b=dot(d,v)/dl;
  c+=vec3(9.,8.3,7.4)*step(0.,dot(d,l))*smoothstep(.95,.8,abs(a))*smoothstep(.2,.15,abs(b));
  c+=vec3(1.1,1.4,1.9)*smoothstep(.3,.5,d.x+.3*d.y)*smoothstep(.1,.7,d.y)*.4;
  return c;
}
const vec3 SWEEP=vec3(.56,.17,.085);
vec3 back(vec3 d){ return SWEEP*(.26+.3*smoothstep(-.1,.3,d.y)); }
float trace(vec3 ro,vec3 rd,out float mat){ float t=.006; mat=-1.; for(int i=0;i<170;i++){ vec3 p=ro+rd*t; vec2 h=map(p); if(h.x<.00035*t){ mat=h.y; return t; } t+=h.x; if(t>22.) break; } return t; }
vec3 shade(vec3 ro,vec3 rd){
  float m,t=trace(ro,rd,m);
  if(m<0.) return back(rd);
  vec3 p=ro+rd*t,n=nrm(p,.0006+.0003*t);
  vec3 l=keyL(),h=normalize(l-rd);
  float dif=max(dot(n,l),0.),sh=dif>0.?shadow(p+n*.004,l):0.,occ=ao(p,n);
  vec3 alb=m<.5?SWEEP*(.9+.2*fbm(p.xz*2.,2)):vec3(.8,.78,.74)*(.98+.04*fbm(p.xz*70.,2));
  vec3 sky=vec3(.2,.23,.29)*(.5+.5*n.y);
  vec3 bounce=SWEEP*1.6*max(.55-.6*n.y,0.);
  vec3 c=alb*(vec3(3.9,3.5,3.0)*dif*sh+(sky+bounce)*occ);
  if(m>3.5){
    float st=streaks(p);
    vec3 foam=vec3(.92,.96,1.)*(vec3(2.4,2.3,2.2)*(.35+.65*sh)+sky*.7)*.62;
    c=mix(vec3(.02,.13,.22)+vec3(.02,.2,.3)*dif,foam,.28+.72*st);
    c+=env(reflect(rd,n))*.05;
  } else if(m>1.5){
    if(m<2.5){ if(p.y<.02){ vec2 c=p.xz-vec2(rx(LIP),LIP-.05); float rr=length(c); float w=sin(rr*95.-uT*16.)*exp(-rr*5.); n=normalize(n+.09*w*vec3(c.x/rr,0.,c.y/rr)); } else { vec2 q=p.xz*vec2(70.,20.)-vec2(0.,uT*8.); n=normalize(n+.07*vec3(noise(q)-.5,0.,noise(q+9.)-.5)); } }
    else n=normalize(nrm(p,.004+.0003*t)+.08*vec3(fbm(p.xz*34.,2)-.5,0.,fbm(p.xz*34.+5.,2)-.5));
    vec3 r=reflect(rd,n);
    float F=.025+.975*pow(1.-max(dot(n,-rd),0.),5.);
    float rm,rt=trace(p+n*.012,r,rm);
    vec3 rc=rm<0.?env(r):(rm<.5?SWEEP*.8:vec3(.85,.83,.8)*(.25+1.2*max(dot(nrm(p+r*rt,.003),l),0.)));
    if(m<2.5){ vec3 body=vec3(.012,.1,.19)+vec3(.02,.26,.42)*dif*sh; c=mix(body,rc,clamp(F*1.4+.09,0.,1.)); }
    else {
      // Glacier ice is pale compacted snow. It turns blue only where light has gone deep: in crevasses and on every riser.
      vec2 g=p.xz+.05*vec2(fbm(p.xz*7.,2),fbm(p.xz*7.+4.,2));
      float cr=abs(2.*fbm(g*vec2(11.,30.),4)-1.),crev=smoothstep(.09,.012,cr)*smoothstep(.3,.6,fbm(g*4.+2.,2));
      // A cliff of ice is layered: dark at its foot, pale at its lip, and streaked by what ran down it.
      float riser=1.-smoothstep(.5,.92,n.y),foot=1.-fract(p.y*N),run=fbm(vec2((p.x+p.z)*150.,p.y*7.),3);
      float deep=max(crev,riser*smoothstep(.1,.72,foot+.5*(run-.5)));
      float sss=pow(clamp(dot(rd,-l)*.5+.5,0.,1.),1.5);
      vec3 lit=vec3(3.9,3.5,3.0)*dif*sh+sky*occ;
      vec3 firn=vec3(.8,.86,.92)*lit*(.82+.36*fbm(p.xz*26.,3));
      vec3 blue=mix(vec3(.01,.06,.13),vec3(.1,.34,.48)+vec3(.04,.2,.3)*sh*dif,smoothstep(.05,1.,run*.5+.5*(1.-foot)))*(1.+.5*sss)*(.55+.45*occ);
      c=mix(mix(firn,blue,deep),rc,clamp(F*.8,0.,.45));
    }
    c+=vec3(m>2.5?1.2:4.)*pow(max(dot(n,h),0.),420.)*sh;
  }
  return c;
}
void main(){
  vec2 px=gl_FragCoord.xy+uJ,uv=(2.*px-uRes)/uRes.y;
  vec3 f=normalize(uTa-uRo),r=normalize(cross(f,vec3(0,1,0))),u=cross(r,f);
  vec3 rd=normalize(uv.x*r+uv.y*u+2.3/uFit*f),ro=uRo;
  float a=hash(gl_FragCoord.xy*.73)*6.2831,ca=cos(a),sa=sin(a);
  vec2 L=mat2(ca,-sa,sa,ca)*uL*uAp;
  vec3 fp=ro+rd*uFocus/dot(rd,f); ro+=r*L.x+u*L.y; rd=normalize(fp-ro);
  O=vec4(max(shade(ro,rd),0.),1.);
}`;
const rx = (z: number) => .33*Math.sin(z*1.6+.5)+.1*Math.sin(z*3.1+1)-.1;
const cam = rayTrack<readonly number[]>([
  [0,[-.1,.17,-1.75]],[3.8,[-.34,.2,-1.5]],[6,[rx(-.3)+.34,.46,-.95]],[9,[rx(.25)+.32,.66,-.28]],
  [11.2,[.95,1.0,.1]],[13.4,[.72,1.28,-.5]],[16,[-2.1,2.15,-3.0]],[18.6,[-.4,.34,-1.86]],[22,[-.16,.15,-1.78]]]);
const tar = rayTrack<readonly number[]>([
  [0,[-.42,.15,-.62]],[3.8,[-.42,.2,-.6]],[6,[rx(.1),.36,.1]],[9,[rx(.8),.5,.75]],
  [11.2,[.72,.72,.72]],[13.4,[.6,.6,.58]],[16,[.1,.22,.05]],[18.6,[-.42,.12,-.7]],[22,[-.42,.13,-.72]]]);
const foc = rayTrack<number>([[0,1.15],[3.8,.95],[6,1.2],[9,1.25],[11.2,.95],[13.4,1.3],[16,4.3],[18.6,1.2],[22,1.1]]);
const ap = rayTrack<number>([[0,.016],[9,.02],[13.4,.02],[16,.03],[18.6,.016],[22,.016]]);
const sm = (a: number, b: number, x: number) => { const t=Math.min(1,Math.max(0,(x-a)/(b-a))); return t*t*(3-2*t); };
const state = (t: number) => ({
  uRo: cam(t), uTa: tar(t), uFocus: foc(t), uAp: ap(t),
  uLight: sm(0,16,t)*.9-.3,
  uIce: 1.5 - sm(9.4,13.4,t)*1.32 + sm(14.2,18.2,t)*1.32,
  uFlow: .1 + sm(14.6,18.8,t)*.9,
  uFill: sm(15,21.5,t),
});
export const terracedReliefWorld: RayWorld = {
  id: "terraced-relief", title: "A terraced plaster island with a river and an ice sheet", durationSeconds: 22, frag: FRAG, samples: 24, grain: .014, vignette: .3, posterSeconds: 12.6, state, imageSlots: [],
};
