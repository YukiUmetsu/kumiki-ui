/**
 * INK-FILM1 stage: puts painted cels on paper with WebGL2, one frame at a time.
 *
 * Light is added up in linear space, as `paintInk` does it on the CPU: every cel first lays its cover (paper, where the figure hides what
 * is behind it), then multiplies its ink onto the sheet. Two such sheets can be joined by a transition. A frame depends only on what
 * `draw` is given.
 */
import type { InkCel } from "./ink-cel";
import { paintInkPaper } from "./ink-cel";
import type { InkRevealKind, InkTransitionKind } from "./ink-reveal";
import { INK_REVEAL_KINDS, INK_TRANSITION_KINDS } from "./ink-reveal";

export interface InkStageLayer {
  cel: InkCel;
  /** A place of the cel's page on the stage, stage units. */
  place(x: number, y: number): readonly [number, number];
  /** How many cells the cel's grid has across and down; 1 when nothing bends it. */
  grid: readonly [number, number];
  opacity?: number;
  /** How strong the ink is: 0.6 = a paler copy, 1.2 = darker. */
  density?: number;
  /** Out of focus, stage units. */
  blur?: number;
  reveal?: { kind: InkRevealKind; /** 0–1 */ shown: number; /** 0–1: gone again */ gone: number; soft: number; from: readonly [number, number]; angle: number; reach: number; seed: number };
}
export interface InkStageSheet { layers: readonly InkStageLayer[]; /** Where the paper has gone under the camera, stage units. */ paper?: readonly [number, number] }
export type InkMount = { kind: "full" } | { kind: "fan" | "leaf"; /** Middle and half size, stage units; `fan` uses the first half size. */ at: readonly [number, number]; half: readonly [number, number]; silk: string };
export interface InkStageFrame {
  sheet: InkStageSheet;
  next?: InkStageSheet;
  transition?: { kind: InkTransitionKind; /** 0–1 */ t: number; from: readonly [number, number]; angle: number; seed: number };
  mount?: InkMount;
}

const NOISE = `
float hash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*noise(p);p=p*2.03+17.1;a*=.5;}return s/.96875;}
`;
const CEL_VS = `#version 300 es
in vec2 a_pos; in vec2 a_uv; uniform vec2 u_size; out vec2 v_uv;
void main(){ v_uv=a_uv; gl_Position=vec4(a_pos.x/u_size.x*2.-1., 1.-a_pos.y/u_size.y*2., 0., 1.); }`;
const CEL_FS = `#version 300 es
precision highp float;
in vec2 v_uv; out vec4 o;
uniform sampler2D u_cel, u_when, u_paper; uniform vec2 u_res, u_paperOff, u_page, u_from; uniform float u_paperScale, u_px;
uniform vec4 u_body; uniform float u_opacity, u_density, u_blur, u_shown, u_gone, u_soft, u_angle, u_reach, u_seed; uniform int u_pass, u_kind;
${NOISE}
vec3 paperAt(){ vec2 p=gl_FragCoord.xy; p.y=u_res.y-p.y; return texture(u_paper,(p+u_paperOff)*u_paperScale/vec2(textureSize(u_paper,0))).rgb; }
// when the brush, the water or the mist reaches a place, 0–1
float arrival(vec2 uv){
  vec2 p=uv*u_page;
  if(u_kind==1){ float w=texture(u_when,uv).r; return w<.002?1.:w; }
  float n=fbm(p/u_reach*5.+u_seed), f=fbm(p/u_reach*22.+u_seed*1.7);
  if(u_kind==2){ float d=length(p-u_from)/u_reach; return clamp(d*(.62+.62*n)+.05*(f-.5),0.,1.); }
  if(u_kind==3){ vec2 k=vec2(cos(u_angle),sin(u_angle)); float s=dot(p-u_page*.5,k)/(abs(k.x)*u_page.x+abs(k.y)*u_page.y)+.5, q=dot(p,vec2(-k.y,k.x)); return clamp(s*.86+.07+.16*(noise(vec2(q/(u_reach*.016),u_seed))-.5)*(.4+s)+.1*(n-.5),0.,1.); }
  if(u_kind==4) return clamp(.5+1.5*(n-.5)+.16*(f-.5),0.,1.);
  vec3 t=textureLod(u_cel,uv,2.).rgb; float dark=1.-pow(max(t.g,1e-4),.45); return clamp(dark*.78+.2*n,0.,1.);
}
void main(){
  float lod=u_blur>0.?log2(1.+u_blur*u_px):0., fresh=0., a=1.;
  vec2 uv=v_uv;
  if(u_kind>0&&u_shown<1.){
    float w=arrival(uv), head=u_shown*(1.+u_soft)-w; a=smoothstep(0.,u_soft,head); fresh=1.-smoothstep(0.,u_soft*2.6+.1,head);
    // wet ink creeps a little and is darker till it dries
    if(u_kind==2||u_kind==5){ vec2 g=vec2(noise(uv*u_page/9.+u_seed),noise(uv*u_page/9.+31.+u_seed))-.5; uv+=g*fresh*7./u_page; lod+=fresh*2.2; }
  }
  if(u_gone>0.){ float n=fbm(uv*u_page/u_reach*6.+u_seed+9.), h=u_gone*1.5-n*.5; a*=1.-smoothstep(0.,.55,h); lod+=u_gone*3.4; uv+=(vec2(noise(uv*u_page/40.+3.),noise(uv*u_page/40.+8.))-.5)*u_gone*26./u_page; }
  vec4 c=lod>0.05?textureLod(u_cel,uv,lod+textureQueryLodSafe(uv)):texture(u_cel,uv);
  if(u_pass==0){ float k=c.a*a*u_opacity; if(k<=.001) discard; o=vec4(mix(paperAt(),u_body.rgb,u_body.a),k); return; }
  vec3 t=pow(max(c.rgb,vec3(1e-4)),vec3(u_density*(1.+.22*fresh*step(.5,float(u_kind)))));
  o=vec4(mix(vec3(1.),t,a*u_opacity),1.);
}`.replace("void main(){\n  float lod", "float textureQueryLodSafe(vec2 uv){ vec2 s=vec2(textureSize(u_cel,0)), dx=dFdx(uv)*s, dy=dFdy(uv)*s; return max(0.,.5*log2(max(dot(dx,dx),dot(dy,dy)))); }\nvoid main(){\n  float lod");
const FULL_VS = `#version 300 es
in vec2 a_pos; out vec2 v_uv; void main(){ v_uv=a_pos*.5+.5; gl_Position=vec4(a_pos,0.,1.); }`;
const PAPER_FS = `#version 300 es
precision highp float; in vec2 v_uv; out vec4 o; uniform sampler2D u_paper; uniform vec2 u_res,u_paperOff; uniform float u_paperScale;
void main(){ vec2 p=gl_FragCoord.xy; p.y=u_res.y-p.y; o=vec4(texture(u_paper,(p+u_paperOff)*u_paperScale/vec2(textureSize(u_paper,0))).rgb,1.); }`;
const JOIN_FS = `#version 300 es
precision highp float;
in vec2 v_uv; out vec4 o;
uniform sampler2D u_a,u_b,u_paper; uniform vec2 u_res,u_from; uniform int u_kind,u_mount; uniform float u_t,u_angle,u_seed,u_unit; uniform vec4 u_frame; uniform vec3 u_silk;
${NOISE}
const vec3 INK=vec3(.0093,.0086,.0106);
vec3 A(vec2 uv){return texture(u_a,uv).rgb;} vec3 B(vec2 uv){return texture(u_b,uv).rgb;}
vec3 paper(vec2 uv){return texture(u_paper,uv*u_res/vec2(textureSize(u_paper,0))).rgb;}
float edge(float x,float w){return smoothstep(-w,w,x);}
vec3 enc(vec3 v){return mix(12.92*v,1.055*pow(max(v,vec3(1e-6)),vec3(1./2.4))-.055,step(.0031308,v));}
vec3 join(vec2 uv){
  if(u_kind==0) return A(uv);
  float asp=u_res.x/u_res.y, t=u_t; vec2 p=vec2(uv.x*asp,uv.y), c=vec2(u_from.x*asp,u_from.y);
  if(u_kind==1) return mix(A(uv),B(uv),smoothstep(0.,1.,t));
  if(u_kind==2||u_kind==6){
    // a blot: round where it fell, in fingers where the paper draws it
    vec2 d=p-c; float R=length(vec2(asp,1.))*1.02, n=fbm(p*3.2+u_seed), f=fbm(d/max(length(d),1e-3)*2.6+u_seed*1.7+length(d)*vec2(.9,.5)), g=fbm(p*26.+u_seed);
    float arrive=length(d)/R*(.72+.5*n)+.16*(f-.5)+.02*(g-.5);
    if(u_kind==2){ float h=t*1.28-.1-arrive, m=edge(h,.012+.02*n), rim=exp(-pow((h-.012)/(.018+.03*n),2.))*(1.-smoothstep(.75,1.,t)), wash=exp(-max(h,0.)/.16)*step(0.,h)*(1.-smoothstep(.6,1.,t));
      vec3 col=mix(A(uv),B(uv),m); float k=clamp(.62*rim+.3*wash*(.4+.9*n),0.,.92); return col*mix(vec3(1.),INK,k); }
    float u=t*2.; if(u<1.){ float h=u*1.28-.1-arrive; return A(uv)*mix(vec3(1.),INK,edge(h,.02+.03*n)*.985); }
    float h=(u-1.)*1.28-.1-arrive, m=edge(h,.05+.06*n); return B(uv)*mix(vec3(1.),INK,(1.-m)*.985);
  }
  if(u_kind==3){
    float n=fbm(vec2(p.x*2.2-t*.5,p.y*3.4)+u_seed), front=smoothstep(0.,.5,t*1.5-.5*uv.x*.6-.35*n), back=smoothstep(0.,.5,(t-.46)*1.75-.36*uv.x*.6-.3*n+.06);
    vec3 col=mix(A(uv),B(uv),step(.5,front*.5+back*.5)); float fog=front*(1.-back); return mix(mix(A(uv),B(uv),smoothstep(.45,.55,back+.5*front)),paper(uv),clamp(fog*1.05,0.,1.));
  }
  if(u_kind==4){
    // four loads of a flat brush, each begun before the last is done, bristles running out of water at its end
    float rows=4., m=0., wet=0., Y=(1.-uv.y)*rows;
    for(float r=0.;r<rows;r++){
      float dir=mod(r,2.)<.5?1.:-1., s=dir>0.?uv.x:1.-uv.x, y=Y+.16*(noise(vec2(uv.x*2.6+r*5.,u_seed))-.5), v=y-r-.5, fine=noise(vec2(y*46.,r*7.+u_seed))*.55+noise(vec2(y*150.,s*3.+r))*.45;
      float rag=.12*noise(vec2(uv.x*7.+r*13.,u_seed+sign(v)*3.))+.05*noise(vec2(uv.x*60.,v*9.+r)), band=smoothstep(.74,.7,abs(v)+rag);
      float h=(t-r/rows*.62)/.36*1.32-.12-s-.13*(fine-.5)*(.5+s)-.02*(fbm(vec2(s*40.,y*30.))-.5), k=edge(h,.01)*band;
      wet=max(wet*(1.-k),k*exp(-max(h,0.)/.05)*.5*(.4+fine)); m=max(m,k);
    }
    return mix(A(uv),B(uv),m)*mix(vec3(1.),INK,wet*(1.-smoothstep(.8,1.,t)));
  }
  // a hand scroll: the first leaf goes out to the left and the next follows, bare paper at the seam
  float e=t*t*(3.-2.*t), x=uv.x+e*1.12; vec3 col; float gap=.06;
  if(x<1.) col=A(vec2(x,uv.y)); else if(x<1.12) col=paper(uv); else col=B(vec2(x-1.12,uv.y));
  float k=min(smoothstep(1.,1.-gap,x)+smoothstep(1.12,1.12+gap,x),1.); return mix(paper(uv),col,x<1.||x>=1.12?k:0.);
}
void main(){
  // ink on ink is ink, never blacker
  vec3 col=max(join(v_uv),INK*.94);
  if(u_mount>0){
    vec2 q=vec2(v_uv.x*u_res.x,(1.-v_uv.y)*u_res.y)/u_unit-u_frame.xy; float d=u_mount==1?length(q)-u_frame.z:length(max(abs(q)-u_frame.zw+18.,0.))-18.;
    d+=.8*(noise(q/7.)-.5); float w=.75+.25*noise(q*vec2(.9,.12))*noise(q*vec2(.12,.9)); vec3 silk=u_silk*(.9+.16*w+.06*(fbm(q/160.)-.5));
    float shade=exp(-max(d,0.)/16.)*.28; col=mix(col,silk*(1.-shade),smoothstep(-.8,.8,d)); col=mix(col,silk*.42,(1.-smoothstep(.6,1.8,abs(d-9.)))*.5);
  }
  o=vec4(enc(col)+(hash(gl_FragCoord.xy)-.5)/255.,1.);
}`;

interface Tex { cel: WebGLTexture; when: WebGLTexture }
const hexLinear = (hex: string): [number, number, number] => { const n = parseInt(hex.slice(1), 16), l = (v: number) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return [l((n >> 16) & 255), l((n >> 8) & 255), l(n & 255)]; };

export interface InkStageOptions { /** The film's own size, stage units. */ width: number; height: number; paper: string; seed?: number }
export class InkStage {
  private gl: WebGL2RenderingContext;
  private cel: WebGLProgram; private full: WebGLProgram; private join: WebGLProgram;
  private quad: WebGLBuffer; private mesh: WebGLBuffer; private index: WebGLBuffer; private vaoCel: WebGLVertexArrayObject; private vaoFull: WebGLVertexArrayObject;
  private textures = new Map<InkCel, Tex>();
  private paper: WebGLTexture | null = null; private paperScale = 1;
  private targets: { fb: WebGLFramebuffer; tex: WebGLTexture }[] = [];
  private uniforms = new Map<WebGLProgram, Map<string, WebGLUniformLocation | null>>();
  constructor(private canvas: HTMLCanvasElement, private o: InkStageOptions) {
    const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, preserveDrawingBuffer: true, depth: false });
    if (!gl) throw new Error("InkStage needs WebGL2.");
    this.gl = gl;
    this.cel = this.program(CEL_VS, CEL_FS); this.full = this.program(FULL_VS, PAPER_FS); this.join = this.program(FULL_VS, JOIN_FS);
    this.quad = gl.createBuffer()!; this.mesh = gl.createBuffer()!; this.index = gl.createBuffer()!;
    this.vaoFull = gl.createVertexArray()!; gl.bindVertexArray(this.vaoFull); gl.bindBuffer(gl.ARRAY_BUFFER, this.quad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.vaoCel = gl.createVertexArray()!; gl.bindVertexArray(this.vaoCel); gl.bindBuffer(gl.ARRAY_BUFFER, this.mesh); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.index);
    gl.bindVertexArray(null);
    this.resize();
  }
  private program(vs: string, fs: string): WebGLProgram {
    const gl = this.gl, p = gl.createProgram()!;
    for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]] as const) { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) throw new Error(`ink shader: ${gl.getShaderInfoLog(s)}`); gl.attachShader(p, s); }
    gl.bindAttribLocation(p, 0, "a_pos"); gl.bindAttribLocation(p, 1, "a_uv"); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error(`ink shader: ${gl.getProgramInfoLog(p)}`);
    return p;
  }
  private u(p: WebGLProgram, name: string) { let m = this.uniforms.get(p); if (!m) this.uniforms.set(p, (m = new Map())); if (!m.has(name)) m.set(name, this.gl.getUniformLocation(p, name)); return m.get(name)!; }
  /** Output pixels per stage unit. */
  get unit() { return this.canvas.width / this.o.width; }
  /** Call after the canvas changes size. */
  resize(): void {
    const gl = this.gl, { width: w, height: h } = this.canvas;
    for (const t of this.targets) { gl.deleteFramebuffer(t.fb); gl.deleteTexture(t.tex); }
    this.targets = [0, 1].map(() => {
      const tex = gl.createTexture()!, fb = gl.createFramebuffer()!;
      gl.bindTexture(gl.TEXTURE_2D, tex); gl.texStorage2D(gl.TEXTURE_2D, 1, gl.SRGB8_ALPHA8, w, h);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      return { fb, tex };
    });
    const unit = this.unit, side = 1024, print = paintInkPaper(side / unit, side / unit, unit, this.o.paper, this.o.seed);
    if (this.paper) gl.deleteTexture(this.paper);
    this.paper = gl.createTexture()!; this.paperScale = 1;
    gl.bindTexture(gl.TEXTURE_2D, this.paper); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, print.width, print.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(print.rgba.buffer));
    for (const k of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, k, gl.MIRRORED_REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  }
  private texture(c: InkCel): Tex {
    const had = this.textures.get(c); if (had) return had;
    const gl = this.gl, cel = gl.createTexture()!, when = gl.createTexture()!;
    // a unit of its own: a cel is uploaded while a sheet is being drawn, and the paper is bound on another
    gl.activeTexture(gl.TEXTURE3);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.bindTexture(gl.TEXTURE_2D, cel); gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, c.w, c.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(c.pixels.buffer, c.pixels.byteOffset, c.pixels.byteLength));
    gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    const aniso = gl.getExtension("EXT_texture_filter_anisotropic"); if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, 4);
    gl.bindTexture(gl.TEXTURE_2D, when); gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, c.w, c.h, 0, gl.RED, gl.UNSIGNED_BYTE, c.when); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    for (const t of [cel, when]) { gl.bindTexture(gl.TEXTURE_2D, t); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); }
    const t = { cel, when }; this.textures.set(c, t); return t;
  }
  /** Give back the memory of cels that are not in the list. */
  keep(cels: ReadonlySet<InkCel>): void { for (const [c, t] of this.textures) if (!cels.has(c)) { this.gl.deleteTexture(t.cel); this.gl.deleteTexture(t.when); this.textures.delete(c); } }
  private sheet(target: WebGLFramebuffer, sheet: InkStageSheet): void {
    const gl = this.gl, { width: W, height: H } = this.canvas, unit = this.unit, off = [(sheet.paper?.[0] ?? 0) * unit, (sheet.paper?.[1] ?? 0) * unit] as const;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target); gl.viewport(0, 0, W, H); gl.disable(gl.BLEND);
    gl.useProgram(this.full); gl.bindVertexArray(this.vaoFull); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.paper);
    gl.uniform1i(this.u(this.full, "u_paper"), 0); gl.uniform2f(this.u(this.full, "u_res"), W, H); gl.uniform2f(this.u(this.full, "u_paperOff"), off[0], off[1]); gl.uniform1f(this.u(this.full, "u_paperScale"), this.paperScale);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    const p = this.cel; gl.useProgram(p); gl.bindVertexArray(this.vaoCel); gl.enable(gl.BLEND);
    gl.uniform1i(this.u(p, "u_cel"), 0); gl.uniform1i(this.u(p, "u_when"), 1); gl.uniform1i(this.u(p, "u_paper"), 2);
    gl.uniform2f(this.u(p, "u_size"), this.o.width, this.o.height); gl.uniform2f(this.u(p, "u_res"), W, H); gl.uniform2f(this.u(p, "u_paperOff"), off[0], off[1]); gl.uniform1f(this.u(p, "u_paperScale"), this.paperScale);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.paper);
    for (const l of sheet.layers) {
      if ((l.opacity ?? 1) <= 0 || (l.reveal && (l.reveal.shown <= 0 || l.reveal.gone >= 1))) continue;
      const { cel: c, grid: [nx, ny] } = l, vx = nx + 1, verts = new Float32Array(vx * (ny + 1) * 4), idx = new Uint16Array(nx * ny * 6);
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) { const u = i / nx, v = j / ny, [X, Y] = l.place(c.x + u * c.width, c.y + v * c.height), k = (j * vx + i) * 4; verts[k] = X; verts[k + 1] = Y; verts[k + 2] = u; verts[k + 3] = v; if (X < minX) minX = X; if (X > maxX) maxX = X; if (Y < minY) minY = Y; if (Y > maxY) maxY = Y; }
      if (maxX < 0 || maxY < 0 || minX > this.o.width || minY > this.o.height) continue;
      for (let j = 0, k = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const a = j * vx + i; idx.set([a, a + 1, a + vx, a + 1, a + vx + 1, a + vx], k); k += 6; }
      const t = this.texture(c); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, t.cel); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, t.when);
      gl.bindVertexArray(this.vaoCel); gl.bindBuffer(gl.ARRAY_BUFFER, this.mesh); gl.bufferData(gl.ARRAY_BUFFER, verts, gl.DYNAMIC_DRAW); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.DYNAMIC_DRAW);
      const r = l.reveal, body = c.body ? hexLinear(c.body) : null;
      gl.uniform2f(this.u(p, "u_page"), c.width, c.height); gl.uniform4f(this.u(p, "u_body"), body?.[0] ?? 0, body?.[1] ?? 0, body?.[2] ?? 0, body ? 1 : 0);
      gl.uniform1f(this.u(p, "u_opacity"), l.opacity ?? 1); gl.uniform1f(this.u(p, "u_density"), l.density ?? 1); gl.uniform1f(this.u(p, "u_blur"), l.blur ?? 0); gl.uniform1f(this.u(p, "u_px"), (c.w / c.width) / Math.max(0.05, (maxX - minX) / c.width));
      gl.uniform1i(this.u(p, "u_kind"), r ? INK_REVEAL_KINDS.indexOf(r.kind) : 0); gl.uniform1f(this.u(p, "u_shown"), r?.shown ?? 1); gl.uniform1f(this.u(p, "u_gone"), r?.gone ?? 0); gl.uniform1f(this.u(p, "u_soft"), r?.soft ?? 0.1);
      gl.uniform2f(this.u(p, "u_from"), (r?.from[0] ?? 0) - c.x, (r?.from[1] ?? 0) - c.y); gl.uniform1f(this.u(p, "u_angle"), r?.angle ?? 0); gl.uniform1f(this.u(p, "u_reach"), r?.reach ?? Math.hypot(c.width, c.height)); gl.uniform1f(this.u(p, "u_seed"), r?.seed ?? 0);
      for (const pass of [0, 1]) { if (pass === 0) gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE); else gl.blendFunc(gl.ZERO, gl.SRC_COLOR); gl.uniform1i(this.u(p, "u_pass"), pass); gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0); }
    }
    gl.disable(gl.BLEND);
  }
  draw(f: InkStageFrame): void {
    const gl = this.gl; if (gl.isContextLost()) return;
    this.sheet(this.targets[0].fb, f.sheet); if (f.next && f.transition) this.sheet(this.targets[1].fb, f.next);
    const p = this.join, m = f.mount, tr = f.next ? f.transition : undefined;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, this.canvas.width, this.canvas.height); gl.useProgram(p); gl.bindVertexArray(this.vaoFull);
    for (const [i, t] of [this.targets[0].tex, this.targets[1].tex, this.paper].entries()) { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t); }
    gl.uniform1i(this.u(p, "u_a"), 0); gl.uniform1i(this.u(p, "u_b"), 1); gl.uniform1i(this.u(p, "u_paper"), 2); gl.uniform2f(this.u(p, "u_res"), this.canvas.width, this.canvas.height);
    gl.uniform1i(this.u(p, "u_kind"), tr ? INK_TRANSITION_KINDS.indexOf(tr.kind) : 0); gl.uniform1f(this.u(p, "u_t"), tr?.t ?? 0); gl.uniform2f(this.u(p, "u_from"), (tr?.from[0] ?? 0.5), 1 - (tr?.from[1] ?? 0.5)); gl.uniform1f(this.u(p, "u_angle"), tr?.angle ?? 0); gl.uniform1f(this.u(p, "u_seed"), tr?.seed ?? 0);
    gl.uniform1i(this.u(p, "u_mount"), !m || m.kind === "full" ? 0 : m.kind === "fan" ? 1 : 2); gl.uniform1f(this.u(p, "u_unit"), this.unit);
    if (m && m.kind !== "full") { gl.uniform4f(this.u(p, "u_frame"), m.at[0], m.at[1], m.half[0], m.half[1]); gl.uniform3f(this.u(p, "u_silk"), ...hexLinear(m.silk)); }
    gl.drawArrays(gl.TRIANGLES, 0, 3); gl.bindVertexArray(null);
  }
  dispose(): void { this.keep(new Set()); const gl = this.gl; for (const t of this.targets) { gl.deleteFramebuffer(t.fb); gl.deleteTexture(t.tex); } if (this.paper) gl.deleteTexture(this.paper); for (const x of [this.cel, this.full, this.join]) gl.deleteProgram(x); this.targets = []; }
}
