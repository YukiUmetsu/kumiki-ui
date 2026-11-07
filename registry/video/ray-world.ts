/** Ray-traced worlds as data and one small WebGL2 renderer. A world is a fragment shader plus a pure function from time to
 * uniforms, so a frame depends on nothing but its time. Each frame averages sub-samples across the shutter, the lens and
 * the pixel, which gives true motion blur, depth of field and antialiasing. No library is needed.
 */
import type { RationalFps } from "../motion/types";
import type { ImageAsset } from "./scene-templates";

export type RayUniform = number | readonly number[];
export interface RayWorld {
  id: string;
  title: string;
  durationSeconds: number;
  /** GLSL ES 3.00. It receives `uT`, `uS`, `uRes`, `uFit`, `uJ`, `uL` and each key from `state`. */
  frag: string;
  /** One sampler per picture, in order. Each one names what the picture is for. */
  imageSlots: readonly { uniform: string; role: string }[];
  /** Sub-samples for a finished frame. An interactive preview can use fewer. */
  samples: number;
  shutter?: number;
  grain?: number;
  vignette?: number;
  /** The time a reader with reduced motion sees, and the time a poster shows. */
  posterSeconds: number;
  /** A pure function of time and view. It runs once per sub-sample. */
  state: (time: number, view?: RayView) => Readonly<Record<string, RayUniform>>;
}
/** The shape of the output. `fit` widens the lens on a tall frame, so a world composed for 16:9 keeps its subject. */
export interface RayView { aspect: number; fit: number }
export const RAY_LANDSCAPE: RayView = { aspect: 16 / 9, fit: 1 };
export const rayView = (width: number, height: number): RayView => ({ aspect: width / height, fit: Math.min(1.6, Math.max(1, .9 / (width / height))) });
/** What a film file may name. The shaders stay out of this table, so a film that uses no world does not load them. */
export const RAY_WORLD_IDS = { "water-drop": { durationSeconds: 26, images: 7 }, "terraced-relief": { durationSeconds: 22, images: 0 }, "river-flight": { durationSeconds: 26, images: 1 } } as const;
export type RayWorldId = keyof typeof RAY_WORLD_IDS;
export interface RayRenderer {
  ready: Promise<void>;
  draw: (time: number, frame: number) => void;
  dispose: () => void;
}
export interface RayWorldProblem { path: string; code: "ray-world-image" | "ray-world-rights" | "ray-world-range"; message: string }

/** Keyed Catmull-Rom curve. It holds its first and last values, and it never reads a clock. */
export function rayTrack<T extends number | readonly number[]>(keys: readonly (readonly [number, T])[]): (time: number) => T {
  if (keys.length < 2 || keys.some((key, index) => index > 0 && key[0] <= keys[index - 1][0])) throw new Error("A track needs two or more keys, in time order.");
  return time => {
    const last = keys.length - 1;
    if (time <= keys[0][0]) return keys[0][1];
    if (time >= keys[last][0]) return keys[last][1];
    let i = 0;
    while (keys[i + 1][0] <= time) i += 1;
    const a = keys[Math.max(0, i - 1)][1], b = keys[i][1], c = keys[i + 1][1], d = keys[Math.min(last, i + 2)][1];
    const s = (time - keys[i][0]) / (keys[i + 1][0] - keys[i][0]);
    const curve = (p0: number, p1: number, p2: number, p3: number) => .5 * (2 * p1 + (p2 - p0) * s + (2 * p0 - 5 * p1 + 4 * p2 - p3) * s * s + (3 * p1 - p0 - 3 * p2 + p3) * s * s * s);
    if (typeof b === "number") return curve(a as number, b, c as number, d as number) as T;
    return (b as readonly number[]).map((_, k) => curve((a as readonly number[])[k], (b as readonly number[])[k], (c as readonly number[])[k], (d as readonly number[])[k])) as unknown as T;
  };
}
/** The time of a frame. It stops just inside the world, and reduced motion holds the poster moment. */
export function rayWorldTime(world: Pick<RayWorld, "durationSeconds" | "posterSeconds">, frame: number, fps: RationalFps, reducedMotion = false) {
  if (reducedMotion) return world.posterSeconds;
  return Math.min(world.durationSeconds - 1e-3, Math.max(0, frame * fps.den / fps.num));
}
export function inspectRayWorld(world: RayWorld, images: readonly ImageAsset[] = [], options: { samples?: number } = {}): RayWorldProblem[] {
  const problems: RayWorldProblem[] = [];
  if (images.length !== world.imageSlots.length) problems.push({ path: "/images", code: "ray-world-image", message: `World "${world.id}" needs ${world.imageSlots.length} picture(s): ${world.imageSlots.map(slot => slot.role).join("; ") || "none"}.` });
  images.forEach((image, index) => { if (!image.licenseRef?.trim()) problems.push({ path: `/images/${index}`, code: "ray-world-rights", message: `Picture "${image.id}" has no source-rights reference.` }); });
  if (options.samples !== undefined && !(Number.isInteger(options.samples) && options.samples >= 1 && options.samples <= 64)) problems.push({ path: "/samples", code: "ray-world-range", message: "Samples run from 1 to 64." });
  return problems;
}

const VERTEX = `#version 300 es
in vec2 p; void main(){ gl_Position=vec4(p,0.,1.); }`;
const POST = `#version 300 es
precision highp float;
uniform sampler2D uA; uniform vec2 uRes; uniform float uFrame,uScale,uGrain,uVig; out vec4 o;
float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.); }
void main(){
  vec2 uv=gl_FragCoord.xy/uRes,q=uv-.5;
  vec3 c=texture(uA,uv).rgb;
  c*=1.-uVig*dot(q,q)*2.2;
  c=pow(aces(c*uScale),vec3(1./2.2));
  float g=h(gl_FragCoord.xy+fract(uFrame*.618)*91.)-.5;
  o=vec4(c+g*uGrain*(1.-.6*dot(c,vec3(.33))),1.);
}`;
function program(gl: WebGL2RenderingContext, fragment: string) {
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? "A shader did not compile.");
    return shader;
  };
  const linked = gl.createProgram()!;
  gl.attachShader(linked, compile(gl.VERTEX_SHADER, VERTEX)); gl.attachShader(linked, compile(gl.FRAGMENT_SHADER, fragment));
  gl.bindAttribLocation(linked, 0, "p"); gl.linkProgram(linked);
  if (!gl.getProgramParameter(linked, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(linked) ?? "A shader did not link.");
  return linked;
}
/** Draw `world` on `canvas`. Pictures are decoded first, so no frame can show a missing texture. */
export function createRayRenderer(canvas: HTMLCanvasElement, world: RayWorld, images: readonly ImageAsset[], options: { fps: RationalFps; samples?: number }): RayRenderer {
  const problems = inspectRayWorld(world, images, options);
  if (problems.length) throw new Error(problems[0].message);
  const gl = canvas.getContext("webgl2", { preserveDrawingBuffer: true, antialias: false, alpha: false, powerPreference: "high-performance" });
  if (!gl) throw new Error("This browser has no WebGL2.");
  if (!gl.getExtension("EXT_color_buffer_float")) throw new Error("This GPU cannot render to a float target.");
  const { width, height } = canvas, view = rayView(width, height), samples = options.samples ?? world.samples, shutter = (world.shutter ?? .5) * options.fps.den / options.fps.num;
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const scene = program(gl, world.frag), post = program(gl, POST), target = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, target);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.HALF_FLOAT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  const framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target, 0);
  const textures: WebGLTexture[] = [];
  const ready = Promise.all(world.imageSlots.map(async (slot, index) => {
    const image = new Image();
    image.src = images[index].src;
    await image.decode();
    const texture = gl.createTexture();
    textures.push(texture);
    gl.activeTexture(gl.TEXTURE1 + index); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
    return slot;
  })).then(() => undefined);
  const location = (linked: WebGLProgram, name: string) => gl.getUniformLocation(linked, name);
  return {
    ready,
    draw(time, frame) {
      gl.viewport(0, 0, width, height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(scene); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      gl.uniform2f(location(scene, "uRes"), width, height);
      gl.uniform1f(location(scene, "uFit"), view.fit);
      world.imageSlots.forEach((slot, index) => gl.uniform1i(location(scene, slot.uniform), index + 1));
      for (let i = 0; i < samples; i += 1) {
        const a = (i + .5) / samples, at = time + (a - .5) * shutter, radius = Math.sqrt(a), turn = i * 2.399963;
        gl.uniform1f(location(scene, "uT"), at); gl.uniform1f(location(scene, "uS"), i);
        gl.uniform2f(location(scene, "uJ"), ((i * .7548776662) % 1) - .5, ((i * .569840291) % 1) - .5);
        gl.uniform2f(location(scene, "uL"), radius * Math.cos(turn), radius * Math.sin(turn));
        for (const [name, value] of Object.entries(world.state(at, view))) {
          const uniform = location(scene, name);
          if (typeof value === "number") gl.uniform1f(uniform, value);
          else if (value.length === 2) gl.uniform2fv(uniform, value as number[]);
          else if (value.length === 3) gl.uniform3fv(uniform, value as number[]);
          else gl.uniform1fv(uniform, value as number[]);
        }
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      gl.disable(gl.BLEND);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.useProgram(post); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, target);
      gl.uniform1i(location(post, "uA"), 0); gl.uniform2f(location(post, "uRes"), width, height);
      gl.uniform1f(location(post, "uFrame"), frame); gl.uniform1f(location(post, "uGrain"), world.grain ?? .014);
      gl.uniform1f(location(post, "uVig"), world.vignette ?? .22); gl.uniform1f(location(post, "uScale"), 1 / samples);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.finish();
    },
    dispose() {
      textures.forEach(texture => gl.deleteTexture(texture));
      gl.deleteTexture(target); gl.deleteFramebuffer(framebuffer); gl.deleteBuffer(buffer);
      gl.deleteProgram(scene); gl.deleteProgram(post);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
