/** Small WebGL2 parts that film stages share: value noise, program building with cached uniforms, colour targets. */

/** `hash`, `noise` and five-octave `fbm` over the plane, 0–1. */
export const GLSL_NOISE = `
float hash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*noise(p);p=p*2.03+17.1;a*=.5;}return s/.96875;}
`;
/** A triangle over the whole picture; `v_uv` is 0–1 with y up. */
export const GLSL_FULL_VS = `#version 300 es
in vec2 a_pos; out vec2 v_uv; void main(){ v_uv=a_pos*.5+.5; gl_Position=vec4(a_pos,0.,1.); }`;

/** Link a program. `a_pos` is always attribute 0 and `a_uv` attribute 1. */
export function glProgram(gl: WebGL2RenderingContext, vs: string, fs: string, label = "film"): WebGLProgram {
  const p = gl.createProgram()!;
  for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]] as const) {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) throw new Error(`${label} shader: ${gl.getShaderInfoLog(s)}`);
    gl.attachShader(p, s);
  }
  gl.bindAttribLocation(p, 0, "a_pos"); gl.bindAttribLocation(p, 1, "a_uv"); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error(`${label} shader: ${gl.getProgramInfoLog(p)}`);
  return p;
}

/** Uniform locations, looked up once for each program. */
export class GlUniforms {
  private seen = new Map<WebGLProgram, Map<string, WebGLUniformLocation | null>>();
  constructor(private gl: WebGL2RenderingContext) {}
  at(p: WebGLProgram, name: string): WebGLUniformLocation | null {
    let m = this.seen.get(p);
    if (!m) this.seen.set(p, (m = new Map()));
    if (!m.has(name)) m.set(name, this.gl.getUniformLocation(p, name));
    return m.get(name)!;
  }
}

export interface GlTarget { fb: WebGLFramebuffer; tex: WebGLTexture }
/** A texture that can be drawn into. */
export function glTarget(gl: WebGL2RenderingContext, width: number, height: number, format: number = gl.RGBA8): GlTarget {
  const tex = gl.createTexture()!, fb = gl.createFramebuffer()!;
  gl.bindTexture(gl.TEXTURE_2D, tex); gl.texStorage2D(gl.TEXTURE_2D, 1, format, width, height);
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]] as const) gl.texParameteri(gl.TEXTURE_2D, k, v);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  return { fb, tex };
}
