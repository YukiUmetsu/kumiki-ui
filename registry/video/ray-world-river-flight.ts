/** One unbroken flight up a procedural valley: a waterfall running backwards, a river, a glacier wall and a tunnel of blue
 * ice. The flight stops inside the ice, and then rewinds to the waterfall at speed. One photograph gives it a real sky.
 */
import { rayTrack } from "./ray-world";
import type { RayWorld } from "./ray-world";

const FRAG = `#version 300 es
precision highp float;
uniform float uFit,uT,uS,uFlow,uAp,uFocus,uExp,uF;
uniform vec2 uRes,uJ,uL; uniform vec3 uRo,uTa; uniform sampler2D t0;
uniform sampler2D tRock,tRockN,tMoss,tMossN,tTerr,tTerrN,tSnow,tSnowN,tIce,tIceN;
out vec4 O;
// Photographed surfaces, sampled from three sides and blended by the normal, so cliffs and ground both take them. The mip level comes from
// the width of a pixel at the hit, so distant slopes average to their true colour instead of shimmering.
float pxm(float t){ return t*2./(uRes.y*uF/uFit); }
float lodAt(float t,float tile,float res){ return log2(max(pxm(t)*res/tile,1.)); }
// Weights come from the true surface normal, never a bumped one: a bump that tilts a flat cliff sideways would otherwise pull in the side
// projection, which runs along the cliff and smears one column of texels down it.
vec3 triW(vec3 n){ vec3 w=pow(abs(n),vec3(4.)); return w/(w.x+w.y+w.z); }
vec3 tri(sampler2D s,vec3 p,vec3 w,float tile,float lod){
  return textureLod(s,p.zy/tile,lod).rgb*w.x+textureLod(s,p.xz/tile,lod).rgb*w.y+textureLod(s,p.xy/tile,lod).rgb*w.z; }
vec3 triN(sampler2D s,vec3 p,vec3 w,vec3 n,float tile,float lod,float k){
  vec3 a=textureLod(s,p.zy/tile,lod).xyz*2.-1.,b=textureLod(s,p.xz/tile,lod).xyz*2.-1.,c=textureLod(s,p.xy/tile,lod).xyz*2.-1.;
  return normalize(n+k*(vec3(0.,a.y,a.x)*w.x+vec3(b.x,0.,b.y)*w.y+vec3(c.x,c.y,0.)*w.z)); }
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
// The fall: water leaves the lip moving forward and drops on a ballistic curve, 9 m out by the foot, widening from 10 m to 18 m, its
// edges fraying as it goes. d runs from 0 at the lip to 1 at the pool.
float fallD(float y){ return clamp((CR-y)/CR,0.,1.); }
float fallZ(float y){ return -6.-9.*sqrt(fallD(y)); }
float fallW(float y){ return 5.2+3.8*fallD(y); }
float sheet(vec3 p){ float x=p.x-rc(0.),d=fallD(p.y);
  float w=fallW(p.y)+1.4*(noise(vec2(p.y*.07+uFlow*.9,x>0.?3.:9.))-.5)*(.3+d),th=.35+1.7*d;
  float z=p.z-fallZ(p.y)+.35*sin(p.y*.11+x*.3);
  return max(max(abs(x)-w,abs(z)-th),max(p.y-CR-.6,-p.y))*.7; }
vec2 map(vec3 p,float t){
  int oct=t<34.?6:(t<160.?5:4);
  float e=zEdge(p),d=max((p.y-terU(p.xz,oct))*.42,(e-p.z)*.7),m=1.;
  if(p.z<20.){ float l=(p.y-terL(p.xz,oct))*.6; if(l<d){ d=l; m=1.; } float w0=max(p.y,p.z-e); if(w0<d){ d=w0; m=2.; } }
  float w=max(p.y-wl(p.z),e-p.z); if(w<d&&p.z<SN+400.){ d=w; m=2.; }
  float ii,g=dGlacier(p,ii); if(g<d){ d=g; m=3.; }
  float s=sheet(p); if(s<d){ d=s; m=4.; }
  return vec2(d,m);
}
// Cellular noise: the distance to the nearest and second-nearest of a jittered grid of points. Their difference is small along cell
// borders, which is how melt scallops look: shallow dishes with sharp rims.
vec2 cells(vec2 p){ vec2 i=floor(p),f=fract(p); float a=8.,b=8.;
  for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){ vec2 g=vec2(x,y),o=vec2(hash(i+g),hash(i+g+19.7)); float d=length(g+o-f); if(d<a){ b=a; a=d; } else if(d<b) b=d; }
  return vec2(a,b); }
vec3 nrmE(vec3 p,float t,float e){ vec2 k=vec2(1,-1)*e;
  return normalize(k.xyy*map(p+k.xyy,t).x+k.yyx*map(p+k.yyx,t).x+k.yxy*map(p+k.yxy,t).x+k.xxx*map(p+k.xxx,t).x); }
vec3 nrm(vec3 p,float t){ return nrmE(p,t,.012+.0024*t); }
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
  // Projections follow the slope as a whole, measured over 4 m (wider than the 3.9 m between grooves), so the columns' grooves shade but never steer the mapping.
  vec3 W=triW(nrmE(p,t,4.+.004*t));
  // A cliff of basalt columns, with moss running down from the top.
  float face=smoothstep(.35,.1,n.y)*step(p.z,12.);
  if(face>.01){ float col=sin(p.x*1.9+2.4*noise(vec2(p.x*.4,p.y*.03)));
    n=normalize(n+vec3(.34*col,0.,0.)*face); }
  // A bump drawn on the ground plane runs straight down a wall as streaks, so it stays on slopes that face the sky.
  float flat_=smoothstep(.35,.7,W.y);
  if(near*flat_>.01){ float e=.07; vec2 q=p.xz*.62; float a=fbm(q,5); vec3 bp=vec3(a-fbm(q+vec2(e,0.),5),0.,a-fbm(q+vec2(0.,e),5)); n=normalize(n+bp*1.6*near*flat_); }
  float sl=n.y,alt=(p.y-wl(max(p.z,0.)))/190.,d=abs(p.x-rc(p.z));
  // Photographed grain: rock (2 m of lichen-spotted stone to a 3 m tile), moss up close, a 90 m aerial scan of moss and earth farther out.
  float lr=lodAt(t,3.,2048.),lm=lodAt(t,3.2,2048.),lt=lodAt(t,70.,1024.),ls=lodAt(t,2.5,1024.),grain=smoothstep(260.,25.,t),far=smoothstep(25.,140.,t);
  // Each photograph in two layers: a large one (about eight times the tile) whose cracks and patches read across a valley, times the
  // close one's grain relative to its mean, which up close adds the stone's texture and far away averages out to nothing.
  float lR=lodAt(t,24.,2048.),lM=lodAt(t,22.,2048.);
  vec3 nRock=triN(tRockN,p,W,triN(tRockN,p,W,n,24.,lR,.8),3.,lr,.9*grain);
  if(t>140.) nRock=triN(tTerrN,p,W,nRock,300.,lodAt(t,300.,1024.),1.1*smoothstep(140.,500.,t));
  vec3 nMoss=mix(triN(tMossN,p,W,triN(tMossN,p,W,n,22.,lM,.6),3.2,lm,.7*grain),triN(tTerrN,p,W,n,70.,lt,.8),far);
  float scree=fbm(vec2(p.x*.5,p.y*.14)+p.z*.03,4);
  const vec3 LUM=vec3(.3,.55,.15);
  vec3 rockT=tri(tRock,p,W,24.,lR)*clamp(dot(tri(tRock,p,W,3.,lr),LUM)/.115,.35,2.2);
  // Basalt: the stone's own detail with its orange lichen mostly greyed out, darkened and cooled to wet volcanic rock, lighter where
  // scree has broken it.
  float rl=dot(rockT,LUM);
  vec3 rock=mix(vec3(rl),rockT,.35)*vec3(.21,.215,.235)*mix(.75,1.35,smoothstep(.3,.7,scree));
  // Mountains a kilometre away need features a hundred metres across: the aerial scan, mapped at 300 m to the tile, reads as gullies,
  // ribs and scree fans down the faces, in light and in relief.
  float mtn=smoothstep(140.,500.,t),lg=lodAt(t,300.,1024.);
  if(mtn>.01){ vec3 g=tri(tTerr,p,W,300.,lg); rock*=mix(1.,clamp(dot(g,LUM)/.12,.45,1.8),mtn); }
  float tuft=fbm(p.xz*1.3,3),patchy=fbm(p.xz*.09,5),big=fbm(p.xz*.018+4.,3);
  vec3 mossNear=tri(tMoss,p,W,22.,lM)*clamp(dot(tri(tMoss,p,W,3.2,lm),LUM)/.13,.35,2.2),mossFar=tri(tTerr,p,W,70.,lt);
  vec3 moss=mix(mossNear*vec3(.62,.8,.42),mossFar*vec3(.7,.86,.5),far);
  moss*=mix(.7,1.25,smoothstep(.32,.66,patchy));
  moss=mix(moss,moss*vec3(1.25,.85,.55),smoothstep(.48,.64,big)*.7);
  // Heather and bare earth between the moss: warm rust patches, which give the valley floor its colour in autumn light.
  float heath=smoothstep(.7,.8,fbm(p.xz*.011+9.,4)+(dot(mossNear,LUM)-.12)*.6);
  moss=mix(moss,dot(moss,LUM)*vec3(1.5,.8,.45)*1.2,heath*.5);
  // The photographs' own light and dark break the edges of moss and snow, so a boundary follows the stone instead of a smooth curve.
  float tex=(rl-.18)*(1.-far)*2.2;
  float green=smoothstep(.46,.74,sl+.2*(fbm(p.xz*.2,3)-.5)+tex*.5);
  float seep=face*smoothstep(.5,.72,fbm(vec2(p.x*.13,p.y*.04),3)+tex)*smoothstep(26.,50.,p.y);
  // Moss holds where ledges catch water: irregular patches, wider than tall, broken by the stone's own grain.
  seep=max(seep,face*smoothstep(.6,.78,fbm(vec2(p.x*.045,p.y*.12),4)+tex*.7));
  // And a carpet along the lip, where the turf rolls over the edge.
  seep=max(seep,face*smoothstep(CR-9.,CR-2.,p.y+4.*(fbm(vec2(p.x*.1,0.),3)-.5)));
  float mossy=max(green,seep);
  // Seepage darkens the stone in streaks below the wet ledges.
  float wet=face*smoothstep(.55,.78,fbm(vec2(p.x*.32,p.y*.02),3));
  rock*=1.-.45*wet;
  vec3 alb=mix(rock,moss*mix(1.,.8,seep),mossy);
  n=normalize(mix(nRock,nMoss,mossy));
  float sn=smoothstep(.36,.6,alt+.24*(fbm(p.xz*.03,4)-.5)+.25*smoothstep(500.,1000.,p.z)+tex*.3)*smoothstep(.44,.72,sl);
  alb=mix(alb,tri(tSnow,p,W,2.5,ls)*vec3(.86,.89,.95),sn);
  if(sn>.01) n=normalize(mix(n,triN(tSnowN,p,W,n,2.5,ls,.5*grain),sn));
  alb=mix(alb,vec3(.02,.019,.02),smoothstep(9.,5.,d)*(1.-sn));
  float dif=max(dot(n,SUN),0.),sh=dif>0.?shadow(p+n*.4,SUN,t):0.;
  float occ=clamp(.3+.8*fbm(p.xz*.05,3)*1.5,0.,1.)*(.7+.3*tuft);
  vec3 skyC=textureLod(t0,vec2(.3,.82),5.).rgb;
  // Sky light comes from above and from the open valley downstream, so in shade the stone's own relief still shows.
  float skyL=.55+.3*n.y+.35*dot(n,normalize(vec3(0.,.35,-1.)));
  vec3 c=alb*(vec3(6.2,4.4,2.8)*dif*sh+skyC*1.6*skyL*occ+vec3(.22,.17,.1)*max(.2-.3*n.y,0.));
  return c;
}
vec3 water(vec3 p,vec3 rd,float t){
  vec2 q=p.xz*vec2(.55,.16); float ph=uFlow*.9;
  float e=.06,a=fbm(q+vec2(0.,ph),4),b=fbm(q+vec2(e,ph),4),c=fbm(q+vec2(0.,ph+e),4);
  vec3 n=normalize(vec3(a-b,e*(5.+t*.05),a-c));
  // Chop: small fast ripples over the slow swell, fading with distance before they can alias.
  float ch=smoothstep(140.,15.,t);
  if(ch>.01){ vec2 r=p.xz*vec2(2.6,1.1)+vec2(0.,uFlow*3.2); float ra=fbm(r,3),rb=fbm(r+vec2(.04,0.),3),rc_=fbm(r+vec2(0.,.04),3);
    n=normalize(n+vec3(ra-rb,0.,ra-rc_)*6.*ch); }
  if(p.z<-3.){ vec2 k=p.xz-vec2(rc(0.),-7.); float r=length(k); float w=sin(r*.9-uFlow*2.4)*exp(-r*.03); n=normalize(n+.18*w*vec3(k.x/r,0.,k.y/r)); }
  vec3 r=reflect(rd,n); r.y=abs(r.y);
  float F=.04+.96*pow(1.-max(dot(n,-rd),0.),5.);
  vec3 bank=vec3(.045,.06,.02)*smoothstep(.0,.16,1.-r.y*5.);
  // Glacial meltwater carries rock flour: a milky grey-teal body under the sky's reflection.
  vec3 body=vec3(.05,.075,.075)*(.7+.6*max(dot(n,SUN),0.));
  // In the tunnel there is no sky to mirror, only blue ice.
  vec3 refl=p.z>SN+20.?mix(vec3(.01,.08,.18),vec3(.06,.4,.65),clamp(r.y*1.5+.2,0.,1.)):sky(r)*.8;
  vec3 cc=mix(body+bank*.5,refl,clamp(F*.85+.04,0.,1.));
  float foam=smoothstep(.56,.74,fbm(p.xz*vec2(.3,.09)+vec2(0.,ph*.6),4))*smoothstep(9.,2.,abs(p.x-rc(p.z)))*(p.z>0.?.07:.3);
  // Where the fall hits the pool the water churns white, breaking up into drifting foam towards the pool's edge.
  if(p.z<0.){ float r=length((p.xz-vec2(rc(0.),-15.))*vec2(.9,1.2)),churn=fbm(p.xz*.35+vec2(sin(uFlow*.7),uFlow*.9),4);
    foam=max(foam,smoothstep(17.,3.,r)*smoothstep(.3+.25*smoothstep(4.,16.,r),.62,churn)); }
  return mix(cc,vec3(1.25,1.22,1.18),foam);
}
vec3 ice(vec3 p,vec3 n,vec3 rd,float t){
  float in_=smoothstep(SN+10.,SN+50.,p.z); vec3 n0=nrmE(p,t,1.),W=triW(n0);
  vec2 q=vec2(p.x+p.z,p.y)*mix(vec2(.09,.11),vec2(.34,.5),smoothstep(SN+4.,SN+24.,p.z));
  float e=.05,a=fbm(q,5); vec3 bp=vec3(a-fbm(q+vec2(e,0.),5),a-fbm(q+vec2(0.,e),5),0.); n=normalize(n+bp*.7);
  // Melt scallops, large enough to read at flight speed: dishes about 2.6 m across with paler rims, in the wall's own plane. They shade
  // the colour only; bending the normal by them drew concentric rings in every dish.
  vec2 wq=vec2(dot(p,normalize(vec3(n0.z,0.,-n0.x)))+p.z*.0,p.y)/mix(5.,2.6,in_);
  vec2 cl=cells(wq); float rim=1.-smoothstep(.0,.1,cl.y-cl.x),dish=smoothstep(.0,.75,cl.x);
  // The photographed ice cells add the fine layer on top.
  float tile=mix(6.,1.8,in_),li=lodAt(t,tile,1024.),cell=dot(tri(tIce,p,W,tile,li),vec3(.33));
  n=triN(tIceN,p,W,n,tile,li,.45*smoothstep(120.,8.,t));
  float dif=max(dot(n,SUN),0.),fr=ridged(q*2.,4),lay=.5+.5*sin(p.y*1.5+3.*fbm(q*.6,3));
  vec3 pale=vec3(.74,.84,.93)*(vec3(2.,1.7,1.45)*dif+vec3(.42,.54,.72));
  pale=mix(pale,vec3(.05,.34,.62),smoothstep(.4,.7,fr)*.34);
  float ahead=exp(-max(SN+190.-p.z,0.)*.03);
  // Inside, light comes through the ice: brightest and most cyan near the roof where the ice is thin, deep blue low down.
  float roof=smoothstep(wl(SN)+4.,wl(SN)+22.,p.y);
  vec3 cave=mix(vec3(.004,.035,.14),vec3(.02,.24,.5),roof)*(.7+.6*clamp(.5+.5*dot(n,normalize(vec3(0.,.5,1.))),0.,1.));
  cave=mix(cave,vec3(.05,.42,.66),ahead*.7);
  cave*=.9+.15*lay;
  cave*=mix(.78,1.,dish); cave+=vec3(.25,.62,.9)*rim*(.05+.07*roof);
  cave*=mix(.8,1.25,smoothstep(.25,.75,cell)); pale*=mix(.85,1.1,cell);
  // Bands of old, dirty ice: grit the glacier picked up, now thin dark layers that dip along the tunnel.
  // Two of them, not a stack: a repeating series reads as contour lines.
  float band=p.y-wl(SN)+p.z*.04+2.5*(fbm(vec2(p.z*.03,p.x*.05),3)-.5);
  float grit=(smoothstep(.7,.1,abs(band-7.))+smoothstep(.5,.05,abs(band-15.5))*.7)*smoothstep(.35,.62,fbm(vec2(p.z*.06,p.x*.1),3));
  cave=mix(cave,vec3(.03,.035,.04),grit*.75*in_);
  vec3 c=mix(pale,cave,in_);
  // Wet ice: a sheen from the light down the tunnel ahead.
  float F=.03+.97*pow(1.-max(dot(n,-rd),0.),5.),spec=pow(max(dot(reflect(rd,n),normalize(vec3(0.,.25,1.))),0.),40.);
  return c+mix(vec3(.3,.34,.4),vec3(.1,.34,.55),in_)*F+vec3(.35,.6,.8)*spec*in_*.6;
}
// Falling water is ropes and sheets: thin strands that speed up as they drop (their pattern runs on the square root of the drop, as a
// falling body's time does), a glassy dark tongue at the lip, white water below, and torn edges you can see the cliff through.
vec3 fall(vec3 p,vec3 rd,out float al){
  float x=p.x-rc(0.),d=fallD(p.y),s=sqrt(d),w=fallW(p.y),ph=uFlow;
  float r1=fbm(vec2(x*1.1,s*7.-ph*1.9),4),r2=fbm(vec2(x*3.3+7.,s*16.-ph*3.6),3),r3=noise(vec2(x*7.+3.,s*30.-ph*6.2));
  float strand=r1*.55+r2*.35+r3*.2;
  float edge=smoothstep(w,w*.5,abs(x)+(r1-.5)*2.6*(.4+d));
  al=clamp(edge*(.5+.9*smoothstep(.36,.7,strand)),0.,1.);
  float lip=1.-smoothstep(.02,.14,d);
  al=mix(al,min(1.,edge*1.3),lip);
  vec3 skyC=textureLod(t0,vec2(.3,.82),5.).rgb;
  float lum=.5+.65*smoothstep(.3,.78,strand);
  vec3 col=lum*(skyC*1.05+vec3(.62,.58,.52));
  // Light comes through the thin edges from the sky behind.
  col+=vec3(.25,.27,.28)*(1.-edge)*smoothstep(.3,.6,strand);
  col=mix(col,vec3(.05,.085,.08)+skyC*.35,lip*.7);
  return col;
}
vec3 shade(vec3 p,vec3 rd,float t,float m){
  if(m<1.5) return land(p,nrm(p,t),rd,t);
  if(m<2.5) return water(p,rd,t);
  return ice(p,nrm(p,t),rd,t);
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
    if(m>3.5){
      // Through the fall's torn edges: trace on past the water and blend what lies behind.
      float al; vec3 fc_=fall(p,rd,al),bg=s;
      if(al<.99){ float m2,t2=trace(p+rd*4.5,rd,m2); bg=m2<0.?s:(m2>3.5?fc_:shade(p+rd*(4.5+t2),rd,t+4.5+t2,m2)); }
      c=mix(bg,fc_,al);
    } else c=shade(p,rd,t,m);
    float fog=1.-exp(-pow(t*.00075,1.6));
    float inCrack=smoothstep(4.,18.,iceTop(uRo.xz)-uRo.y)*step(SN,uRo.z);
    vec3 fc=textureLod(t0,vec2(.3,.7),5.).rgb*1.1;
    fc+=vec3(.9,.6,.3)*pow(max(dot(rd,SUN),0.),6.)*.25;
    c=mix(c,fc,fog*(1.-inCrack));
  }
  // Spray hangs at the foot of the fall and moves with the water.
  // Spray: a cloud that boils up from where the fall hits the pool, densest at the foot and thinning as it rises 30 m.
  float mist=0.; float st=min(t,180.)/14.;
  for(int i=0;i<14;i++){ vec3 q=ro+rd*(float(i)+.5)*st; vec3 k=(q-vec3(rc(0.),4.,-15.))*vec3(.042,.03,.042);
    float body=exp(-dot(k,k))*(1.-smoothstep(0.,34.,q.y));
    mist+=body*smoothstep(.3,.7,noise3(q*vec3(.08,.05,.08)+vec3(0.,-uFlow*1.6,0.))*.7+noise3(q*.21+vec3(0.,-uFlow*2.8,0.))*.4); }
  vec3 mistC=textureLod(t0,vec2(.3,.8),4.).rgb*1.15+vec3(.3,.29,.27);
  c=mix(c,mistC,clamp(mist*.24,0.,.85));
  O=vec4(max(c*uExp,0.),1.);
}`;
/** The world's photographed surfaces (CC0): basalt-dark lichen rock, close moss, an aerial scan of moss and earth, snow, and ice cells.
 * The host supplies the files by these names; `RIVER_FLIGHT_TEXTURE_FILES` lists the shipped ones under assets/textures/river-flight. */
export const RIVER_FLIGHT_TEXTURE_SLOTS = [
  { uniform: "tRock", role: "rock colour", colour: true }, { uniform: "tRockN", role: "rock normal map" },
  { uniform: "tMoss", role: "close moss colour", colour: true }, { uniform: "tMossN", role: "close moss normal map" },
  { uniform: "tTerr", role: "aerial moss and earth colour", colour: true }, { uniform: "tTerrN", role: "aerial moss and earth normal map" },
  { uniform: "tSnow", role: "snow colour", colour: true }, { uniform: "tSnowN", role: "snow normal map" },
  { uniform: "tIce", role: "ice cells colour", colour: true }, { uniform: "tIceN", role: "ice cells normal map" },
] as const;
export const RIVER_FLIGHT_TEXTURE_FILES: Readonly<Record<typeof RIVER_FLIGHT_TEXTURE_SLOTS[number]["uniform"], string>> = {
  tRock: "lichen_rock_diff.jpg", tRockN: "lichen_rock_nor_gl.jpg", tMoss: "mossy_rock_diff.jpg", tMossN: "mossy_rock_nor_gl.jpg",
  tTerr: "rocky_terrain_02_diff.jpg", tTerrN: "rocky_terrain_02_nor_gl.jpg", tSnow: "snow_02_diff.jpg", tSnowN: "snow_02_nor_gl.jpg",
  tIce: "ice001_color.jpg", tIceN: "ice001_nor_gl.jpg",
};
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
  textureSlots: RIVER_FLIGHT_TEXTURE_SLOTS,
};
