/**
 * Painted-picture stage: draws textured meshes (painted cels, bent by a rig) on watercolour paper with WebGL2 and joins two
 * pictures with a transition made of the same materials: water, a hake brush, a turning page, shoji, petals, an ensō.
 * A frame depends only on what `draw` is given.
 */
import { GLSL_FULL_VS, GLSL_NOISE, GlUniforms, glProgram, glTarget } from "../gl/film-gl";
import type { GlTarget } from "../gl/film-gl";

export interface PaintPlace { body: string; near: number }
export interface PaintMesh {
  /** Key of the painting in the stage's images. */
  image: string;
  /** x, y in stage units, two for each vertex. */
  positions: Float32Array;
  /** 0–1 in the painting, two for each vertex, v down. */
  uvs: Float32Array;
  indices: Uint16Array;
  opacity?: number;
  /** Multiplies the paint (a far limb, an evening). */
  tint?: readonly [number, number, number];
  /** Out of focus, stage units. */
  blur?: number;
  /** Stands still when the drawing boils (lettering, a set). */
  steady?: boolean;
  /** The body that this paint is part of, and how near in it. */
  own?: PaintPlace;
  /** Drawn here and yet hidden wherever nearer paint of that body, drawn before, still shows: an arm on its far side that goes over a counter. */
  behind?: PaintPlace;
  /** How far `behind` counts, 0–1 for each vertex. Default 1. */
  veil?: Float32Array;
}
export interface PaintGrade { /** Multiplies the picture. */ tint?: readonly [number, number, number]; saturation?: number; /** 0–1: how far the picture is mixed into the paper (a memory, a title). */ wash?: number }
export interface PaintSheet { layers: readonly PaintMesh[]; grade?: PaintGrade; /** Where the picture lies on the sheet, stage units: paint stops at an uneven wet edge. Without it the paint goes to the sheet's edge. */ frame?: PaintRect }
export interface PaintRect { x: number; y: number; width: number; height: number; /** How uneven the edge is, stage units. Default 12. */ deckle?: number }

export const PAINT_TRANSITIONS = ["cut", "dissolve", "wash", "brush", "page", "shoji", "petals", "enso"] as const;
export type PaintTransitionKind = (typeof PAINT_TRANSITIONS)[number];
export interface PaintTransition { kind: PaintTransitionKind; /** 0–1 */ t: number; /** Where it starts, 0–1 of the picture. */ from?: readonly [number, number]; seed?: number }
export interface PaintFrame { sheet: PaintSheet; next?: PaintSheet; transition?: PaintTransition; /** Drawing number: changing it redraws the line a little (line boil). */ drawing?: number }

const MESH_VS = `#version 300 es
in vec2 a_pos; in vec2 a_uv; layout(location=2) in float a_veil; uniform vec2 u_size; uniform float u_boil,u_drawing; out vec2 v_uv; out float v_veil;
${GLSL_NOISE}
void main(){ v_uv=a_uv; v_veil=a_veil; vec2 p=a_pos; if(u_boil>0.) p+=(vec2(noise(p/38.+u_drawing*7.3),noise(p/38.+u_drawing*7.3+91.7))-.5)*2.*u_boil; gl_Position=vec4(p.x/u_size.x*2.-1.,1.-p.y/u_size.y*2.,0.,1.); }`;
const MESH_FS = `#version 300 es
precision highp float; in vec2 v_uv; in float v_veil; out vec4 o; uniform sampler2D u_image,u_body; uniform float u_opacity,u_lod,u_mark,u_behind; uniform vec3 u_tint;
// out of focus: there is no paint outside the picture, so a blurred edge fades and does not stop
vec4 tap(vec2 uv,vec2 px){ vec2 e=clamp(min(uv,1.-uv)/px+.5,0.,1.); return texture(u_image,uv,u_lod)*e.x*e.y; }
void main(){
  vec4 c;
  if(u_lod<=0.) c=texture(u_image,v_uv);
  else { vec2 px=exp2(u_lod)/vec2(textureSize(u_image,0)); c=tap(v_uv,px)*.2; for(int i=0;i<8;i++){ float a=float(i)*.7853982; c+=tap(v_uv+vec2(cos(a),sin(a))*px*(i%2==0?1.:.6),px)*.1; } }
  if(u_mark>=0.){ o=vec4(vec3(u_mark)*c.a,c.a)*u_opacity; return; } // where the body shows: 0, elsewhere 1
  o=vec4(c.rgb*u_tint,c.a)*u_opacity*(1.-u_behind*v_veil*(1.-texelFetch(u_body,ivec2(gl_FragCoord.xy),0).r));
}`;
const JOIN_FS = `#version 300 es
precision highp float; in vec2 v_uv; out vec4 o;
uniform sampler2D u_a,u_b; uniform vec2 u_res,u_from; uniform int u_kind; uniform float u_t,u_seed,u_unit,u_grain,u_deckleA,u_deckleB; uniform vec3 u_paper,u_tintA,u_tintB; uniform vec2 u_gradeA,u_gradeB; uniform vec4 u_frameA,u_frameB;
${GLSL_NOISE}
float asp(){return u_res.x/u_res.y;}
vec3 graded(vec3 c,vec3 tint,vec2 g){ float l=dot(c,vec3(.299,.587,.114)); c=mix(vec3(l),c,g.x)*tint; return mix(c,vec3(.985,.97,.945),g.y); }
// where the paint stops short of the sheet's edge: an uneven wet edge with a little pigment gathered along it
vec3 edged(vec3 c,vec2 uv,vec4 f,float deckle){
  if(f.z<=0.) return c;
  vec2 q=vec2(uv.x,1.-uv.y)*u_res/u_unit; float d=min(min(q.x-f.x,f.x+f.z-q.x),min(q.y-f.y,f.y+f.w-q.y)), n=fbm(q/70.+u_seed)-.5, e=fbm(q/16.)-.5;
  d+=deckle*(1.05*n+.35*e); float in_=smoothstep(-2.,3.5,d), rim=exp(-pow((d-4.)/4.5,2.));
  return mix(vec3(1.),c*mix(vec3(1.),c*.6+.3,rim*.55),in_);
}
vec3 A(vec2 uv){return edged(graded(texture(u_a,uv).rgb,u_tintA,u_gradeA),uv,u_frameA,u_deckleA);}
vec3 B(vec2 uv){return edged(graded(texture(u_b,uv).rgb,u_tintB,u_gradeB),uv,u_frameB,u_deckleB);}
vec2 turn(vec2 p,float a){return mat2(cos(a),-sin(a),sin(a),cos(a))*p;}

vec3 wash(vec2 uv,vec2 p,vec2 c){
  vec2 d=p-c; float L=length(d), R=length(vec2(asp(),1.))*1.04, n=fbm(p*3.+u_seed), f=fbm(d/max(L,1e-3)*2.4+u_seed*1.7+L*vec2(.9,.5)), g=fbm(p*30.+u_seed);
  float h=u_t*1.62-.16-(L/R*(.7+.5*n)+.2*(f-.5)+.02*(g-.5)), wet=smoothstep(-.05,.04,h)*(1.-smoothstep(.16,.42,h)), m=smoothstep(.05,.27,h+.06*(g-.5)), done=1.-smoothstep(.8,1.,u_t);
  vec2 push=d/max(L,1e-3)*wet*.022*(n-.3)+(vec2(noise(p*9.),noise(p*9.+40.))-.5)*wet*.012;
  vec3 a=A(uv-push), b=B(uv-push*.7), col=mix(mix(a,mix(a,vec3(1.,.99,.965),.62),wet),mix(b,mix(b,vec3(1.,.99,.965),.4),wet*done),m);
  float rim=exp(-pow((h-.004)/(.008+.016*n),2.))*done, back=exp(-pow((h-.2-.1*n)/(.02+.05*n),2.))*done;
  col=mix(col,pow(a,vec3(1.7))*.94,rim*.6); col*=1.-.16*back*(.3+g)*.8; return col*(1.-.09*wet*done*(g-.35));
}
vec3 brush(vec2 uv){
  float rows=5., m=0., wet=0., load=0., Y=(1.-uv.y)*rows;
  for(float r=0.;r<rows;r++){
    float dir=mod(r,2.)<.5?1.:-1., s=dir>0.?uv.x:1.-uv.x, y=Y+.2*(noise(vec2(uv.x*2.6+r*5.,u_seed))-.5), v=y-r-.5, fine=noise(vec2(y*44.,r*7.+u_seed))*.55+noise(vec2(y*140.,s*3.+r))*.45;
    float rag=.12*noise(vec2(uv.x*7.+r*13.,u_seed+sign(v)*3.))+.05*noise(vec2(uv.x*60.,v*9.+r)), band=smoothstep(.76,.7,abs(v)+rag);
    float h=(u_t-r/rows*.6)/.4*1.34-.13-s-.15*(fine-.5)*(.5+s)-.02*(fbm(vec2(s*40.,y*30.))-.5), k=smoothstep(-.012,.012,h)*band;
    wet=max(wet*(1.-k),k*exp(-max(h,0.)/.1)); load=max(load*(1.-k),k*exp(-pow((abs(v)-.5)/.09,2.))*.5); m=max(m,k);
  }
  float done=1.-smoothstep(.82,1.,u_t); vec3 b=B(uv);
  return mix(A(uv),mix(b,mix(b,vec3(1.,.99,.96),.45),wet*done)*(1.-.14*load*done),m);
}
// a leaf of the book turned over a round bend; its back is bare paper with the picture showing faintly through
vec3 page(vec2 uv){
  float w=asp(), r=mix(.1,.2,sin(3.14159*u_t)), e=u_t*u_t*(3.-2.*u_t); vec2 dir=vec2(cos(.16*(1.-e)),-sin(.16*(1.-e))), p=vec2(uv.x*w,uv.y);
  float cx=mix(w*1.02+.12,-w*1.05-r*4.,e), d=dot(p,dir)-cx; vec3 col=B(uv);
  float lit=d>0.?1.-.42*exp(-d/(.05+r*.9)):1.; col*=d>r?1.-.42*exp(-(d-r)/(.05+r*.8)):lit;
  float flat_=0.; bool got=false;
  if(d<=r){
    float th=asin(clamp(d/r,-1.,1.)); vec2 q; float o2=d>=0.?3.14159*r-th*r:3.14159*r-d; q=p+dir*(o2-d);
    vec2 u2=vec2(q.x/w,q.y);
    if(u2.x>=0.&&u2.x<=1.&&u2.y>=0.&&u2.y<=1.&&(d>=0.||e<.99)){
      float k=d>=0.?sin(3.14159-th):0.; vec3 ghost=A(u2); col=mix(vec3(.985,.968,.93),ghost,.1)*(.8+.2*smoothstep(-.02,-.2,d))*(1.-.1*k);
      float lift=d>=0.?cos(th):1.; col*=.9+.1*lift; got=true;
    }
    if(!got&&d<=0.){ vec2 u1=uv; if(u1.x<=1.) col=A(u1)*(1.-.22*exp(d/(.04+r*.6))); }
    else if(!got&&d>0.){ vec2 q1=p+dir*(th*r-d), u1=vec2(q1.x/w,q1.y); if(u1.x<=1.&&u1.y>=0.&&u1.y<=1.) col=A(u1)*(1.-.35*d/r); }
  }
  return col;
}
// two paper doors close on the first picture and open on the next
vec3 door(vec2 q,float side){
  // q: x from the meeting edge (0) outward, y 0–1 down; door is asp/2 wide
  float W=asp()*.5; vec2 s=q; float fr=.035, wood=0., shade=1.;
  vec3 paper=vec3(.985,.955,.885)*(.96+.06*fbm(q*vec2(9.,9.)+side*7.)); float fibre=smoothstep(.62,.9,noise(turn(q,.5)*vec2(8.,130.)))*.05+smoothstep(.65,.92,noise(turn(q,-.8)*vec2(9.,150.)))*.05;
  paper-=fibre; paper*=.9+.16*smoothstep(1.,.15,q.y);
  vec2 cell=vec2(W-2.*fr,1.-2.*fr-.16)/vec2(4.,6.), g=(q-vec2(fr,fr)); vec2 m=mod(g,cell); float bar=.0065; bool low=q.y>1.-fr-.16;
  float lat=low?0.:max(step(m.x,bar)+step(cell.x-bar,m.x),step(m.y,bar)+step(cell.y-bar,m.y));
  float frame=max(step(q.x,fr)+step(W-fr,q.x),step(q.y,fr)+step(1.-fr,q.y)); float panel=low?1.:0.;
  vec3 woodc=mix(vec3(.43,.27,.16),vec3(.56,.38,.23),fbm(q*vec2(60.,5.)+side*3.)); vec3 col=paper;
  if(!low){ vec2 e=min(m,cell-m); float sh=smoothstep(.03,0.,min(e.x,e.y)); col*=1.-.1*sh; }
  col=mix(col,woodc*.95,clamp(lat,0.,1.)); col=mix(col,woodc*(.85+.3*fbm(q*vec2(8.,70.))),panel*(1.-step(q.y,1.-fr-.16)));
  col=mix(col,woodc*.82,clamp(frame,0.,1.));
  float pull=length((q-vec2(.075,.56))/vec2(.02,.036)); col=mix(col,vec3(.22,.14,.09),smoothstep(1.05,.9,pull));
  return col;
}
vec3 shoji(vec2 uv){
  float w=asp(), half_=w*.5, u=u_t<.5?u_t*2.:2.-u_t*2., e=u*u*(3.-2.*u); e=u_t<.5?min(1.,e*1.0):e; float off=(1.-e)*(half_+.05);
  vec2 p=vec2(uv.x*w,1.-uv.y); vec3 bg=u_t<.5?A(uv):B(uv); float xl=half_-off-p.x, xr=p.x-half_-off; vec3 col=bg;
  if(xl>=0.) col=door(vec2(xl,p.y),0.); else if(xr>=0.) col=door(vec2(xr,p.y),1.);
  else { float n=min(-xl,-xr); col*=1.-.4*exp(-n/.05)*step(.001,e); }
  return col;
}
// a gust of cherry petals; the pictures change behind the thick of it
vec4 petal(vec2 q,float seed){
  float a=atan(q.y,q.x), L=length(q); vec2 k=vec2(abs(q.y)*1.5,q.x); float body=length(vec2(k.x*(1.1-.25*k.y),k.y*.92)); float notch=smoothstep(.16,0.,abs(q.y))*smoothstep(.62,1.,q.x)*.36;
  float d=1.-body-notch; float m=smoothstep(0.,.07,d); vec3 c=mix(vec3(.98,.8,.82),vec3(1.,.93,.92),smoothstep(.0,.7,q.x*.5+.5)); c=mix(c,vec3(.9,.52,.58),smoothstep(.0,-1.,q.x)*.6); c*=1.-.16*exp(-pow((d-.05)/.05,2.)); return vec4(c,m);
}
vec3 petals(vec2 uv,vec2 p){
  vec2 wind=normalize(vec2(1.,-.28)); float u=dot(p,wind)/dot(vec2(asp(),-.28*0.+1.),abs(wind)), s=u_t*1.9-.45, n=fbm(p*2.6+u_seed); float band=exp(-pow((u-s)/.3,2.)), m=smoothstep(.1,-.1,u-s+.16*(n-.5));
  vec3 col=mix(A(uv),B(uv),m); col=mix(col,vec3(1.,.93,.92),band*.72*smoothstep(.0,.12,u_t)*(1.-smoothstep(.88,1.,u_t)));
  for(int k=0;k<6;k++){
    float fk=float(k), size=mix(.026,.12,fk*fk/25.), gap=size*(2.5-.12*fk); vec2 drift=wind*u_t*(1.5+.55*fk)+vec2(0.,-.16*u_t*fk*.4); vec2 q=p-drift; vec2 cell=floor(q/gap);
    for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){
      vec2 c=cell+vec2(i,j); float h1=hash(c+fk*17.+u_seed), h2=hash(c+fk*31.+5.), h3=hash(c+fk*47.+9.); vec2 at=(c+.5+(vec2(h1,h2)-.5)*.9)*gap+drift; float uu=dot(at,wind)/dot(vec2(asp(),1.),abs(wind)), dens=exp(-pow((uu-s)/(.34+.05*fk),2.));
      if(h3>dens*1.15) continue;
      float spin=6.28*(h1+u_t*(.8+1.4*h2)), flip=cos(6.28*(h2+u_t*(1.1+h3*1.6))); vec2 l=turn(p-at,spin)/size; l.y/=max(.22,abs(flip)); vec4 pt=petal(l*1.25,h1); vec3 pc=pt.rgb*(flip<0.?.93:1.); col=mix(col,pc,pt.a*(.95-.02*fk));
    }
  }
  return col;
}
vec3 enso(vec2 uv,vec2 p,vec2 c){
  float far=max(max(length(c),length(c-vec2(asp(),0.))),max(length(c-vec2(0.,1.)),length(c-vec2(asp(),1.))))*1.12; float u=u_t<.5?1.-u_t*2.:u_t*2.-1., e=u*u*(3.-2.*u); vec2 d=p-c; float L=length(d), a=atan(d.y,d.x); float R=far*e+.0;
  float wob=.02*(fbm(vec2(cos(a),sin(a))*1.6+u_seed)-.5)+.006*(noise(vec2(a*30.,u_seed))-.5); float x=L-R-wob; vec3 pic=u_t<.5?A(uv):B(uv);
  float w=.07*(.5+.5*smoothstep(0.,.4,R)); float bristle=noise(vec2(x*260.,a*2.+u_seed))*.6+noise(vec2(x*90.,a*5.))*.4; float start=fract((a+2.2)/6.28318); float dry=smoothstep(.35,1.,start)*.75; float ring=smoothstep(-.008,.004,x)*smoothstep(w+.01,w-.004,x)*smoothstep(dry-.18,dry+.1,bristle+.12);
  vec3 paperc=vec3(.985,.965,.925)*(.97+.05*fbm(p*8.)); vec3 col=mix(pic,paperc,smoothstep(-.004,.006,x)); return mix(col,vec3(.16,.15,.19),ring*.92*smoothstep(.02,.1,R));
}
vec3 join(vec2 uv){
  if(u_kind==0) return A(uv);
  vec2 p=vec2(uv.x*asp(),uv.y), c=vec2(u_from.x*asp(),u_from.y);
  if(u_kind==1) return mix(A(uv),B(uv),smoothstep(0.,1.,u_t));
  if(u_kind==2) return wash(uv,p,c);
  if(u_kind==3) return brush(uv);
  if(u_kind==4) return page(uv);
  if(u_kind==5) return shoji(uv);
  if(u_kind==6) return petals(uv,p);
  return enso(uv,p,c);
}
void main(){
  vec3 col=join(v_uv); vec2 q=vec2(v_uv.x*u_res.x,(1.-v_uv.y)*u_res.y)/u_unit;
  // the tooth of cold-pressed paper: pigment lies in its hollows, so paint shows it more than bare paper does
  float tooth=(fbm(q/7.5)-.5)*1.1+(noise(q/2.1)-.5)*.5, paint=1.-smoothstep(.82,1.,min(col.r,min(col.g,col.b)));
  col*=1.+u_grain*tooth*(.4+.6*paint); col*=mix(vec3(1.),u_paper,.35+.65*(1.-paint*.45));
  o=vec4(col+(hash(gl_FragCoord.xy)-.5)/255.,1.);
}`;

export interface PaintStageOptions {
  /** The picture's own size, stage units. */ width: number; height: number;
  /** Colour of the bare paper. */ paper?: string;
  /** How strongly the paper's tooth shows, 0–0.3. */ grain?: number;
  /** How far a redrawn line may move, stage units. */ boil?: number;
}
export type PaintImages = ReadonlyMap<string, ImageBitmap | HTMLImageElement | HTMLCanvasElement>;
const rgb = (hex: string): [number, number, number] => { const n = parseInt(hex.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };

export class PaintStage {
  private gl: WebGL2RenderingContext; private mesh: WebGLProgram; private joiner: WebGLProgram; private u: GlUniforms;
  private vbo: WebGLBuffer; private ubo: WebGLBuffer; private veils: WebGLBuffer; private ibo: WebGLBuffer; private quad: WebGLBuffer; private vaoMesh: WebGLVertexArrayObject; private vaoFull: WebGLVertexArrayObject;
  private textures = new Map<string, { tex: WebGLTexture; width: number; source: unknown }>(); private targets: GlTarget[] = []; /** Where a body shows, for paint behind it. */ private body: GlTarget | null = null;
  constructor(private canvas: HTMLCanvasElement, private o: PaintStageOptions) {
    const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, preserveDrawingBuffer: true, depth: false });
    if (!gl) throw new Error("The painted stage needs WebGL2.");
    this.gl = gl; this.u = new GlUniforms(gl);
    this.mesh = glProgram(gl, MESH_VS, MESH_FS, "paint"); this.joiner = glProgram(gl, GLSL_FULL_VS, JOIN_FS, "paint");
    this.vbo = gl.createBuffer()!; this.ubo = gl.createBuffer()!; this.veils = gl.createBuffer()!; this.ibo = gl.createBuffer()!; this.quad = gl.createBuffer()!;
    this.vaoFull = gl.createVertexArray()!; gl.bindVertexArray(this.vaoFull); gl.bindBuffer(gl.ARRAY_BUFFER, this.quad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.vaoMesh = gl.createVertexArray()!; gl.bindVertexArray(this.vaoMesh);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.ubo); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.veils); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo); gl.bindVertexArray(null);
    this.resize();
  }
  /** Output pixels for one stage unit. */
  get unit(): number { return this.canvas.width / this.o.width; }
  /** Call after the canvas changes size. */
  resize(): void {
    const gl = this.gl;
    this.drop(); this.targets = [0, 1].map(() => glTarget(gl, this.canvas.width, this.canvas.height));
  }
  private drop(): void { for (const t of [...this.targets, ...(this.body ? [this.body] : [])]) { this.gl.deleteFramebuffer(t.fb); this.gl.deleteTexture(t.tex); } this.targets = []; this.body = null; }
  private texture(key: string, images: PaintImages) {
    const source = images.get(key), had = this.textures.get(key);
    if (!source || had?.source === source) return had ?? null;
    const gl = this.gl, tex = had?.tex ?? gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true); gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, source); gl.generateMipmap(gl.TEXTURE_2D);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]] as const) gl.texParameteri(gl.TEXTURE_2D, k, v);
    const aniso = gl.getExtension("EXT_texture_filter_anisotropic"); if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, 4);
    const t = { tex, width: (source as { width: number }).width, source }; this.textures.set(key, t); return t;
  }
  /** Give back the memory of paintings that are not in the list. */
  keep(keys: ReadonlySet<string>): void { for (const [k, t] of this.textures) if (!keys.has(k)) { this.gl.deleteTexture(t.tex); this.textures.delete(k); } }
  private paint(target: GlTarget, sheet: PaintSheet, images: PaintImages, drawing: number): void {
    const gl = this.gl, p = this.mesh, { width: W, height: H } = this.o;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb); gl.viewport(0, 0, this.canvas.width, this.canvas.height); gl.clearColor(1, 1, 1, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(p); gl.bindVertexArray(this.vaoMesh); gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE); gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(this.u.at(p, "u_image"), 0); gl.uniform1i(this.u.at(p, "u_body"), 1); gl.uniform2f(this.u.at(p, "u_size"), W, H); gl.uniform1f(this.u.at(p, "u_drawing"), drawing % 64); gl.uniform1f(this.u.at(p, "u_mark"), -1);
    let masked: string | undefined; gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, null); gl.activeTexture(gl.TEXTURE0);
    const put = (l: PaintMesh, behind: boolean) => {
      const a = l.opacity ?? 1; if (a <= 0.002) return;
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minU = Infinity, maxU = -Infinity;
      for (let i = 0; i < l.positions.length; i += 2) { const x = l.positions[i], y = l.positions[i + 1]; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; const u = l.uvs[i]; if (u < minU) minU = u; if (u > maxU) maxU = u; }
      if (maxX < 0 || maxY < 0 || minX > W || minY > H) return;
      const t = this.texture(l.image, images); if (!t) return;
      gl.bindTexture(gl.TEXTURE_2D, t.tex);
      const texels = ((maxU - minU) * t.width) / Math.max(1, maxX - minX); // texels under one stage unit
      gl.uniform1f(this.u.at(p, "u_opacity"), a); gl.uniform3f(this.u.at(p, "u_tint"), ...((l.tint ?? [1, 1, 1]) as [number, number, number]));
      gl.uniform1f(this.u.at(p, "u_lod"), l.blur ? Math.log2(1 + l.blur * texels) : 0); gl.uniform1f(this.u.at(p, "u_boil"), l.steady ? 0 : (this.o.boil ?? 0)); gl.uniform1f(this.u.at(p, "u_behind"), behind ? 1 : 0);
      if (behind && l.veil) { gl.enableVertexAttribArray(2); gl.bindBuffer(gl.ARRAY_BUFFER, this.veils); gl.bufferData(gl.ARRAY_BUFFER, l.veil, gl.DYNAMIC_DRAW); } else { gl.disableVertexAttribArray(2); gl.vertexAttrib1f(2, 1); }
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo); gl.bufferData(gl.ARRAY_BUFFER, l.positions, gl.DYNAMIC_DRAW); gl.bindBuffer(gl.ARRAY_BUFFER, this.ubo); gl.bufferData(gl.ARRAY_BUFFER, l.uvs, gl.DYNAMIC_DRAW); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, l.indices, gl.DYNAMIC_DRAW);
      gl.drawElements(gl.TRIANGLES, l.indices.length, gl.UNSIGNED_SHORT, 0);
    };
    sheet.layers.forEach((l, i) => {
      // what of the body is nearer than this
      const hides = l.behind, before = hides ? sheet.layers.slice(0, i) : [], front = new Set(hides ? before.filter(b => b.own?.body === hides.body && b.own.near > hides.near) : []), key = hides && front.size ? `${hides.body} ${front.size}` : undefined;
      if (hides && key && key !== masked) {
        // what of the body still shows at this point of the painting: the body itself, less all that was painted over it
        this.body ??= glTarget(gl, this.canvas.width, this.canvas.height); gl.bindFramebuffer(gl.FRAMEBUFFER, this.body.fb); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, null); gl.activeTexture(gl.TEXTURE0);
        for (const b of before) if (b.behind?.body !== hides.body) { gl.uniform1f(this.u.at(p, "u_mark"), front.has(b) ? 0 : 1); put(b, false); }
        gl.uniform1f(this.u.at(p, "u_mark"), -1); gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.body.tex); gl.activeTexture(gl.TEXTURE0);
      }
      masked = key; put(l, !!key);
    });
    gl.disable(gl.BLEND);
  }
  draw(f: PaintFrame, images: PaintImages): void {
    const gl = this.gl; if (gl.isContextLost()) return;
    const tr = f.next && f.transition && f.transition.kind !== "cut" ? f.transition : undefined, drawing = f.drawing ?? 0, p = this.joiner, u = this.u;
    this.paint(this.targets[0], f.sheet, images, drawing); if (tr) this.paint(this.targets[1], f.next!, images, drawing);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, this.canvas.width, this.canvas.height); gl.useProgram(p); gl.bindVertexArray(this.vaoFull);
    this.targets.forEach((t, i) => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t.tex); });
    const g = (s: PaintSheet | undefined) => s?.grade ?? {}, a = g(f.sheet), b = g(f.next), [pr, pg, pb] = rgb(this.o.paper ?? "#fbf3e1");
    gl.uniform1i(u.at(p, "u_a"), 0); gl.uniform1i(u.at(p, "u_b"), 1); gl.uniform2f(u.at(p, "u_res"), this.canvas.width, this.canvas.height); gl.uniform1f(u.at(p, "u_unit"), this.unit); gl.uniform1f(u.at(p, "u_grain"), this.o.grain ?? 0.11); gl.uniform3f(u.at(p, "u_paper"), pr, pg, pb);
    gl.uniform1i(u.at(p, "u_kind"), tr ? PAINT_TRANSITIONS.indexOf(tr.kind) : 0); gl.uniform1f(u.at(p, "u_t"), tr?.t ?? 0); gl.uniform2f(u.at(p, "u_from"), tr?.from?.[0] ?? 0.5, 1 - (tr?.from?.[1] ?? 0.5)); gl.uniform1f(u.at(p, "u_seed"), tr?.seed ?? 3);
    gl.uniform3f(u.at(p, "u_tintA"), ...((a.tint ?? [1, 1, 1]) as [number, number, number])); gl.uniform3f(u.at(p, "u_tintB"), ...((b.tint ?? [1, 1, 1]) as [number, number, number]));
    gl.uniform2f(u.at(p, "u_gradeA"), a.saturation ?? 1, a.wash ?? 0); gl.uniform2f(u.at(p, "u_gradeB"), b.saturation ?? 1, b.wash ?? 0);
    for (const [k, r] of [["A", f.sheet.frame], ["B", f.next?.frame]] as const) { gl.uniform4f(u.at(p, `u_frame${k}`), r?.x ?? 0, r?.y ?? 0, r?.width ?? 0, r?.height ?? 0); gl.uniform1f(u.at(p, `u_deckle${k}`), r?.deckle ?? 12); }
    gl.drawArrays(gl.TRIANGLES, 0, 3); gl.bindVertexArray(null);
  }
  dispose(): void { this.keep(new Set()); this.drop(); this.gl.deleteProgram(this.mesh); this.gl.deleteProgram(this.joiner); }
}
