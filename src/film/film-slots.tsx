import { CrayonStorybook } from "../../registry/video/materials/crayon-react";
import { CrayonScene } from "../../registry/video/materials/crayon-scene-react";
import { assertCrayonScene } from "../../registry/video/materials/crayon-scene";
import { RisoPrint } from "../../registry/video/print-plates-react";
import { RisoOverprintTransition } from "../../registry/video/riso-overprint";
import { RISO_OVERPRINT_MOTIF, risoOverprintOrigin } from "../video/riso-print-film";
import { RisoSheetFeed, completedRisoFrame } from "../../registry/video/riso-sheet-feed";
import { risoExampleArtworks, risoExampleSpec } from "../video/riso-print-demo";
import { risoSecondSheetArtworks, risoSecondSheetImprintArt } from "../video/riso-print-demo-alt";
/** Bespoke scenes a film can name as `slot` scenes, for the capture page and stories: a biplane flight with Pip and Quill aboard, a walk
 * around a tiny 3D Earth past the world's wonders, and the World Wonders logo landing. App code, not library code. Each is a pure
 * function of the scene frame; the planet's models and maps are loaded before the film plays. */
import { useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { FilmCastMember } from "../../registry/video/film-document";
import { registerCastProp, renderFilmCast } from "./film-cast";
import { compileQuizCard } from "../../registry/learning/quiz-card";
import type { QuizCardContent } from "../../registry/learning/quiz-card";
import { QuizCard } from "../../registry/learning/quiz-card-react";
import type { FollowSubjectRigProps, FollowSubjectRigRenderer } from "../../registry/video/stages/follow-subject-through-sections-stage";

type SlotContext = { frame: number; fps: { num: number; den: number }; durationFrames: number; width: number; height: number; reducedMotion: boolean };
type SlotContent = { slot: string; label: string; props?: Readonly<Record<string, unknown>> };
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const smooth = (t: number) => { const x = clamp01(t); return x * x * (3 - 2 * x); };
const backOut = (t: number) => { const x = clamp01(t) - 1; return 1 + 2.2 * x * x * x + 1.2 * x * x; };
type Cues = FilmCastMember["cues"];

// ---- Biplane flight ------------------------------------------------------------------------------------------------------------
/** The biplane in two layers, so the riders sit between them: the upper wing, its struts, the far tailplane and the far wheel behind;
 * the fuselage with its two open cockpits, the lower wing, the engine and the propeller in front. A navy fuselage, ivory doped-linen
 * wings with rib stitching, brass fittings: a 1930s touring biplane drawn in the channel's colours, lit from the upper left. */
const PLANE_DEFS = <defs>
  <linearGradient id="ww-hull" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3a5683" /><stop offset=".35" stopColor="#1f3559" /><stop offset="1" stopColor="#0c1628" /></linearGradient>
  <linearGradient id="ww-wing" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fbf4e2" /><stop offset=".6" stopColor="#e8dcbd" /><stop offset="1" stopColor="#bfae86" /></linearGradient>
  <linearGradient id="ww-wing-under" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d9cba6" /><stop offset="1" stopColor="#a8966c" /></linearGradient>
  <linearGradient id="ww-brass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f3d99a" /><stop offset=".45" stopColor="#c9a45c" /><stop offset="1" stopColor="#7d5f2a" /></linearGradient>
  <radialGradient id="ww-tyre" cx=".4" cy=".35" r=".7"><stop offset="0" stopColor="#4a443c" /><stop offset="1" stopColor="#15120e" /></radialGradient>
  <radialGradient id="ww-prop" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="rgba(255,250,235,.0)" /><stop offset=".75" stopColor="rgba(255,250,235,.16)" /><stop offset="1" stopColor="rgba(255,250,235,.32)" /></radialGradient>
</defs>;
function PlaneBack() {
  return <g strokeLinejoin="round" strokeLinecap="round">
    {PLANE_DEFS}
    {/* Far tailplane and far wheel, in shadow. */}
    <path d="M16 70L4 62L48 66L52 72Z" fill="#a8966c" stroke="#3b3122" strokeWidth="1.5" />
    <circle cx="206" cy="128" r="11" fill="#211d18" />
    {/* Cabane and interplane struts with their bracing wires. */}
    <g stroke="#6e5428" strokeWidth="3.2"><path d="M170 24L176 72M188 24L190 72" /><path d="M236 22L232 96M250 22L246 96" /></g>
    <g stroke="#2a241c" strokeWidth=".8" opacity=".8"><path d="M236 24L246 94M250 24L232 94" /></g>
    {/* Upper wing: the leading edge rounded, a soft underside, rib stitching on top. */}
    <path d="M150 20Q152 12 166 11L262 9Q272 10 272 16L270 23Q268 26 260 26L160 28Q150 27 150 20Z" fill="url(#ww-wing)" stroke="#3b3122" strokeWidth="1.6" />
    <path d="M154 24L268 21L266 26L160 28Z" fill="url(#ww-wing-under)" opacity=".85" />
    <g stroke="#b8a77d" strokeWidth=".9" opacity=".9">{[172, 186, 200, 214, 228, 242, 256].map(x => <path key={x} d={`M${x} 11.5L${x - 1} 25`} />)}</g>
    <path d="M160 13L262 11" stroke="#fffaf0" strokeWidth="1.4" opacity=".8" />
  </g>;
}
function PlaneFront({ prop }: { prop: number }) {
  const blade = Math.cos(prop);
  return <g strokeLinejoin="round" strokeLinecap="round">
    {/* Fuselage: a long tapered hull, its top edge dipping into two open cockpits with padded brass-trimmed rims. */}
    <path d="M10 64Q40 60 64 64L70 70Q92 74 110 70L116 66Q132 63 146 66L152 71Q176 74 236 68Q252 66 258 74L260 92Q250 100 232 101L120 104Q60 102 26 84Q14 76 10 64Z"
      fill="url(#ww-hull)" stroke="#0a1220" strokeWidth="1.8" />
    <path d="M30 70Q120 76 244 72" fill="none" stroke="#6d8ab5" strokeWidth="1.3" opacity=".7" />
    <path d="M40 84Q130 92 252 86" fill="none" stroke="url(#ww-brass)" strokeWidth="3" />
    <path d="M64 64Q88 76 116 66M146 66Q160 76 176 72" fill="none" stroke="url(#ww-brass)" strokeWidth="2.6" />
    {/* A small brass monogram on the hull. */}
    <text x="190" y="94" fill="#c9a45c" style={{ font: "italic 700 9px Georgia, serif", letterSpacing: "1px" }}>WW</text>
    {/* Fin and rudder with a brass stripe; near tailplane. */}
    <path d="M10 64L8 36Q10 30 18 32L34 58Z" fill="url(#ww-hull)" stroke="#0a1220" strokeWidth="1.6" />
    <path d="M9 44L22 46" stroke="url(#ww-brass)" strokeWidth="3" />
    <path d="M14 74L-2 80Q-2 84 6 84L52 78L50 72Z" fill="url(#ww-wing)" stroke="#3b3122" strokeWidth="1.5" />
    {/* Lower wing, seen a touch from above. */}
    <path d="M124 100Q126 94 138 94L250 92Q258 93 258 98L256 104Q254 107 246 107L134 109Q124 108 124 100Z" fill="url(#ww-wing)" stroke="#3b3122" strokeWidth="1.6" />
    <g stroke="#b8a77d" strokeWidth=".9" opacity=".9">{[146, 160, 174, 188, 202, 216, 230, 244].map(x => <path key={x} d={`M${x} 94.5L${x - 1} 107`} />)}</g>
    {/* Undercarriage: a V of struts to the near wheel, a tyre and a brass hub. */}
    <g stroke="#6e5428" strokeWidth="3"><path d="M186 106L196 126M216 106L198 126" /></g>
    <circle cx="198" cy="128" r="12" fill="url(#ww-tyre)" stroke="#0e0c09" strokeWidth="1.2" /><circle cx="198" cy="128" r="4.5" fill="url(#ww-brass)" />
    <path d="M14 80L20 92" stroke="#6e5428" strokeWidth="2.4" /><circle cx="20" cy="93" r="3.5" fill="#211d18" />
    {/* Engine: a polished cowling ring, exhaust stubs, the spinner, and the propeller as a blur disc with one blade caught. */}
    <path d="M250 70Q262 70 266 78L267 90Q264 99 252 100Z" fill="url(#ww-brass)" stroke="#5a431c" strokeWidth="1.4" />
    <g fill="#2a2620">{[0, 1, 2].map(k => <rect key={k} x={238 - k * 9} y={98 + k * .6} width="6" height="4" rx="1.5" />)}</g>
    <ellipse cx="272" cy="84" rx="4.5" ry="34" fill="url(#ww-prop)" />
    <path d={`M272 84L${272 + 1.5 * blade} ${84 - 32 * blade}`} stroke="rgba(40,32,24,.55)" strokeWidth="4" />
    <path d="M266 78Q276 79 278 84Q276 89 266 90Z" fill="url(#ww-brass)" stroke="#5a431c" strokeWidth="1" />
  </g>;
}
function BiplaneFlight({ frame, fps, durationFrames, props }: SlotContext & { props: { plate: string; pip?: Cues; quill?: Cues } }) {
  const t = frame / Math.max(1, durationFrames - 1), sec = frame / (fps.num / fps.den);
  // The plane crosses a little and holds the middle of the frame; it bobs and banks as a light plane does.
  const x = 8 + 30 * smooth(t * 1.3), y = 30 + 3.2 * Math.sin(sec * 2.1) + 2 * Math.sin(sec * 3.7), bank = -3 + 3.5 * Math.sin(sec * 1.6);
  const clouds = [0, 1, 2, 3, 4, 5].map(i => ({ x: ((120 - ((sec * (38 + i * 9) + i * 41) % 170))), y: 8 + (i * 37) % 70, s: .7 + (i % 3) * .45, o: i % 2 ? .75 : .55 }));
  // The riders sit down in the cockpits: their boxes stand on the fuselage's floor, so the fuselage drawn after them hides their legs.
  const rider = (who: "pip" | "quill", cues: Cues | undefined, left: number, h: number) => <div style={{ position: "absolute", left: `${left}%`, bottom: "19%", width: `${h * 1.4}%`, height: `${h * 2.13}%` }}>
    {renderFilmCast({ character: who, at: [.5, 1], height: 1, cues }, { frame, reducedMotion: false })}
  </div>;
  return <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#8fd3ff" }}>
    <img src={props.plate} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: `scale(${1.12 + .05 * t}) translateX(${-3 * t}%)`, transformOrigin: "50% 70%" }} />
    {clouds.filter(c => c.o < .7).map((c, i) => <div key={`b${i}`} style={cloud(c)} />)}
    <div style={{ position: "absolute", left: `${x}%`, top: `${y}%`, width: "46%", aspectRatio: "300 / 140", transform: `rotate(${bank}deg)`, filter: "drop-shadow(0 1.2vmin 1.4vmin rgba(20,50,90,.35))" }}>
      <svg viewBox="0 0 300 140" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}><PlaneBack /></svg>
      {rider("quill", props.quill, 14, 34)}
      {rider("pip", props.pip, 42, 28)}
      <svg viewBox="0 0 300 140" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}><PlaneFront prop={frame * 1.7} /></svg>
    </div>
    {clouds.filter(c => c.o >= .7).map((c, i) => <div key={`f${i}`} style={cloud(c)} />)}
  </div>;
}
const cloud = (c: { x: number; y: number; s: number; o: number }): CSSProperties => ({ position: "absolute", left: `${c.x}%`, top: `${c.y}%`, width: `${18 * c.s}%`, height: `${7 * c.s}%`,
  borderRadius: "50%", background: "radial-gradient(closest-side, rgba(255,255,255,.95), rgba(255,255,255,.7) 60%, rgba(255,255,255,0))", opacity: c.o, filter: "blur(.4vmin)" });

// ---- Planet walk ---------------------------------------------------------------------------------------------------------------
type Landmark = { model: string; lat: number; lon: number; height: number; side?: number; turn?: number };
type PlanetProps = { day: string; models: Record<string, string>; route: string[]; landmarks: Landmark[]; legFrames: number; startLeg?: number };
type PlanetAssets = { day: THREE.Texture; models: Record<string, THREE.Object3D> };
const vec = (lat: number, lon: number) => { const p = lat * Math.PI / 180, l = lon * Math.PI / 180; return new THREE.Vector3(Math.cos(p) * Math.sin(l), Math.sin(p), Math.cos(p) * Math.cos(l)); };
const slerp = (a: THREE.Vector3, b: THREE.Vector3, t: number) => { const w = Math.acos(Math.min(1, Math.max(-1, a.dot(b)))); if (w < 1e-6) return a.clone(); return a.clone().multiplyScalar(Math.sin((1 - t) * w) / Math.sin(w)).add(b.clone().multiplyScalar(Math.sin(t * w) / Math.sin(w))); };

/** Where the walkers are and which way they face, at a route position (legs, fractional), and the landmarks placed beside the path. */
function routeAt(points: THREE.Vector3[], s: number) {
  const i = Math.min(points.length - 2, Math.max(0, Math.floor(s))), f = smooth(s - i) * .55 + (s - i) * .45;
  const p = slerp(points[i], points[i + 1], f).normalize(), q = slerp(points[i], points[i + 1], Math.min(1, f + .01)).normalize();
  const d = q.clone().sub(p).projectOnPlane(p).normalize();
  return { p, d: d.lengthSq() > 0 ? d : new THREE.Vector3(0, 0, 1) };
}
function PlanetWalk({ frame, width, height, props, assets }: SlotContext & { props: PlanetProps; assets: PlanetAssets }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const world = useMemo(() => {
    const scene = new THREE.Scene(), globe = new THREE.Group(), R = 1;
    const planet = new THREE.Mesh(new THREE.SphereGeometry(R, 160, 120), new THREE.MeshStandardMaterial({ map: assets.day, roughness: .8, metalness: 0, emissive: "#ffffff", emissiveMap: assets.day, emissiveIntensity: .38 }));
    planet.receiveShadow = true;
    planet.rotation.y = -Math.PI / 2; // the equirectangular map's 0° longitude faces +z, as `vec` puts it
    globe.add(planet);
    // A soft atmosphere rim.
    const rim = new THREE.Mesh(new THREE.SphereGeometry(R * 1.06, 64, 48), new THREE.ShaderMaterial({ transparent: true, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: "varying vec3 n; void main(){ n = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }",
      fragmentShader: "varying vec3 n; void main(){ float i = pow(clamp(.72 - dot(n, vec3(0.,0.,1.)), 0., 1.), 2.4); gl_FragColor = vec4(.55, .82, 1., 1.) * i * 1.3; }" }));
    scene.add(rim);
    const points = props.route.map(name => { const l = props.landmarks.find(item => item.model === name)!; return vec(l.lat, l.lon); });
    // Each landmark stands beside the path, so the walkers pass between them; off-route ones stand where they are.
    props.landmarks.forEach(l => {
      const source = assets.models[l.model]; if (!source) return;
      const model = source.clone(true), box = new THREE.Box3().setFromObject(model), size = box.getSize(new THREE.Vector3()), centre = box.getCenter(new THREE.Vector3());
      const holder = new THREE.Group(), inner = new THREE.Group(); inner.add(model);
      model.position.set(-centre.x, -box.min.y, -centre.z); inner.scale.setScalar(1.25 * l.height * R / Math.max(size.y, size.x * .6, 1e-6)); inner.rotation.y = (l.turn ?? 0) * Math.PI / 180;
      holder.add(inner);
      model.traverse(o => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      let at = vec(l.lat, l.lon);
      const k = props.route.indexOf(l.model);
      if (k >= 0) { const { d } = routeAt(points, Math.min(points.length - 1.001, k)); at = at.clone().add(at.clone().cross(d).normalize().multiplyScalar((l.side ?? 1) * .24)).normalize(); }
      holder.position.copy(at.clone().multiplyScalar(R * .995));
      holder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), at);
      globe.add(holder);
    });
    // The route already walked: a dotted red line on the ground.
    const dots: THREE.Mesh[] = [], dotGeo = new THREE.SphereGeometry(.011, 10, 8), dotMat = new THREE.MeshStandardMaterial({ color: "#e8402a", roughness: .5, emissive: "#5a0d05" });
    for (let s = 0; s <= points.length - 1; s += .045) { const dot = new THREE.Mesh(dotGeo, dotMat); dot.position.copy(routeAt(points, Math.min(points.length - 1.0001, s)).p.multiplyScalar(R * 1.003)); dot.userData.s = s; dots.push(dot); globe.add(dot); }
    // Low clouds drifting over the planet, each a cluster of soft white puffs that turns with its own slow orbit.
    const clouds = new THREE.Group(), puff = new THREE.SphereGeometry(1, 14, 10), cloudMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 1, emissive: "#ffffff", emissiveIntensity: .25 });
    for (let c = 0; c < 9; c++) {
      const cluster = new THREE.Group(), seed = c * 1.618;
      for (let k = 0; k < 5; k++) { const m = new THREE.Mesh(puff, cloudMat); m.scale.set(.05 + .02 * Math.sin(seed + k), .03, .04); m.position.set((k - 2) * .045, Math.abs(Math.sin(seed * 3 + k)) * .015, Math.cos(seed + k * 2) * .02); m.castShadow = true; cluster.add(m); }
      const lat = -50 + ((c * 37) % 100), lon = (c * 83) % 360 - 180, at = vec(lat, lon);
      cluster.position.copy(at.clone().multiplyScalar(R * 1.16)); cluster.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), at); clouds.add(cluster);
    }
    globe.add(clouds);
    scene.add(globe);
    // Golden-hour sun, low and warm from the front left, so every landmark throws a long shadow across the land.
    const sun = new THREE.DirectionalLight("#ffd9a3", 3.4); sun.position.set(-3.2, 2.4, 2.4); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -1.4, right: 1.4, top: 1.4, bottom: -1.4, near: .5, far: 9 }); sun.shadow.bias = -.0006; sun.shadow.normalBias = .01;
    scene.add(sun, new THREE.HemisphereLight("#bfe3ff", "#6b5a3e", 1.0));
    return { scene, globe, points, dots, clouds };
  }, [assets, props]);
  const renderer = useMemo(() => {
    if (typeof document === "undefined") return undefined;
    return { make: (c: HTMLCanvasElement) => { const r = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true, preserveDrawingBuffer: true }); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.08; r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; return r; } };
  }, []);
  const gl = useRef<THREE.WebGLRenderer>(undefined);
  useLayoutEffect(() => {
    if (!canvas.current || !renderer) return;
    gl.current ??= renderer.make(canvas.current);
    gl.current.setSize(width, height, false);
    const s = Math.min(world.points.length - 1.0001, (props.startLeg ?? 0) + frame / props.legFrames), { p, d } = routeAt(world.points, s);
    // Turn the globe so the walkers' place is on top and their way points at the camera: they walk toward us as the world turns.
    const x = p.clone().cross(d).normalize(), m = new THREE.Matrix4().makeBasis(x, p, d).transpose();
    world.globe.quaternion.setFromRotationMatrix(m);
    world.dots.forEach(dot => { dot.visible = dot.userData.s <= s + .02; });
    world.clouds.rotation.y = frame * .0016;
    const cam = new THREE.PerspectiveCamera(30, width / height, .05, 50);
    cam.position.set(0, 1.42, 2.25); cam.lookAt(0, .94, 0);
    gl.current.render(world.scene, cam);
  });
  useLayoutEffect(() => () => { gl.current?.dispose(); gl.current = undefined; }, []);
  // A golden-hour sky: a warm glow where the sun is, cooling to deep blue overhead.
  return <div style={{ position: "absolute", inset: 0, background: "radial-gradient(60% 55% at 12% 30%, rgba(255,214,150,.95) 0%, rgba(255,190,120,.45) 35%, rgba(255,190,120,0) 70%), linear-gradient(to bottom, #3a6aa8 0%, #79a7d4 38%, #f2c896 78%, #f6b47e 100%)" }}>
    <canvas ref={canvas} width={width} height={height} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
  </div>;
}

// ---- Tiny world: a made-up little planet, seen side-on ---------------------------------------------------------------------------
/** A small invented planet turning beneath the walkers (who stay at its top, walking left to right): seeded noise terrain with
 * continents, mountains and snow, a sea, a dirt path along their great circle, forests and rocks in their thousands, drifting clouds,
 * and the wonders standing beside the path so each one rises over the horizon ahead of them and passes behind. */
type TinyProps = { models: Record<string, string>;
  /** `hide`: name prefixes of parts to leave out, such as a model's display plinth or ground tile. */
  landmarks: { model: string; at: number; height: number; side?: number; hide?: string[] }[];
  /** Planet turn per frame, radians; a landmark at angle `at` (radians ahead of the walkers) reaches them at frame at / spin. */
  spin: number; seed?: number;
  /** Cut to music instead: the planet turns `gap` radians every `frames`, rushing away from each wonder and slowing into the next
   * (`ramp` 0..1), so one arrives on every beat. `start` is the turn at frame 0. Replaces `spin`. */
  beat?: { frames: number; gap: number; start?: number; ramp?: number; offset?: number;
    /** The planet stops after this many beats, on a wonder: the walkers have stopped to look. */
    until?: number };
  /** The camera's height above the crown, its distance, and the height it looks at; the walking shot by default. */
  camera?: { y: number; z: number; lookY: number } };
type TinyAssets = { models: Record<string, THREE.Object3D> };
/** Deterministic 3D gradient noise and a fractal sum of it. */
function makeNoise(seed: number) {
  const perm = new Uint8Array(512), r = (() => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
  const p = Array.from({ length: 256 }, (_, i) => i); for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const g = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10), lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const n3 = (x: number, y: number, z: number) => {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255; x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
    const u = fade(x), v = fade(y), w = fade(z), d = (h: number, a: number, b: number, c: number) => { const q = g[h % 12]; return q[0] * a + q[1] * b + q[2] * c; };
    const A = perm[X] + Y, AA = perm[A] + Z, AB = perm[A + 1] + Z, B = perm[X + 1] + Y, BA = perm[B] + Z, BB = perm[B + 1] + Z;
    return lerp(lerp(lerp(d(perm[AA], x, y, z), d(perm[BA], x - 1, y, z), u), lerp(d(perm[AB], x, y - 1, z), d(perm[BB], x - 1, y - 1, z), u), v),
      lerp(lerp(d(perm[AA + 1], x, y, z - 1), d(perm[BA + 1], x - 1, y, z - 1), u), lerp(d(perm[AB + 1], x, y - 1, z - 1), d(perm[BB + 1], x - 1, y - 1, z - 1), u), v), w);
  };
  return { n3, fbm: (x: number, y: number, z: number, oct = 5) => { let a = .5, f = 1, s = 0; for (let i = 0; i < oct; i++) { s += a * n3(x * f, y * f, z * f); a *= .5; f *= 2.03; } return s; }, rand: r };
}
const R_TINY = 6;
function buildTinyWorld(props: TinyProps, assets: TinyAssets) {
  const scene = new THREE.Scene(), world = new THREE.Group(); scene.add(world);
  const { fbm, n3, rand } = makeNoise(props.seed ?? 11);
  // Height in planet units above the radius, for a unit direction. The walkers' great circle (z ≈ 0) is levelled into a path.
  const heightAt = (d: THREE.Vector3) => {
    const c = fbm(d.x * 1.3 + 3, d.y * 1.3, d.z * 1.3, 4), m = Math.max(0, fbm(d.x * 3.1, d.y * 3.1 + 7, d.z * 3.1, 5) - .05);
    let h = .55 * c + 1.2 * m * m * Math.max(0, c + .15) * 3 + .05 * n3(d.x * 14, d.y * 14, d.z * 14);
    const band = Math.abs(d.z) * R_TINY, path = smooth(1 - band / 1.4);
    h = h * (1 - path) + .08 * path; // the walkers' strip: gentle land
    return { h, path: band < .32 ? 1 - band / .32 : 0 };
  };
  const geo = new THREE.SphereGeometry(R_TINY, 320, 220), pos = geo.attributes.position as THREE.BufferAttribute, colors = new Float32Array(pos.count * 3);
  const d = new THREE.Vector3(), col = new THREE.Color(), c2 = new THREE.Color();
  const pal = { sand: new THREE.Color("#d9c08a"), grass: new THREE.Color("#6f9a3c"), meadow: new THREE.Color("#9fb94e"), forest: new THREE.Color("#3e6a2c"),
    rock: new THREE.Color("#8b7a66"), snow: new THREE.Color("#f4f1ea"), path: new THREE.Color("#c9a271"), seabed: new THREE.Color("#5f8a86") };
  for (let i = 0; i < pos.count; i++) {
    d.fromBufferAttribute(pos, i).normalize();
    const { h, path } = heightAt(d), e = h;
    if (e < 0) col.copy(pal.seabed).lerp(pal.sand, Math.max(0, 1 + e * 6));
    else if (e < .05) col.copy(pal.sand);
    else if (e < .45) { col.copy(pal.grass).lerp(pal.meadow, .5 + .5 * n3(d.x * 9, d.y * 9, d.z * 9)); c2.copy(pal.forest); col.lerp(c2, Math.max(0, n3(d.x * 5 + 2, d.y * 5, d.z * 5)) * 1.3); }
    else if (e < .8) col.copy(pal.grass).lerp(pal.rock, (e - .45) / .35);
    else col.copy(pal.rock).lerp(pal.snow, Math.min(1, (e - .8) / .18));
    if (path > 0) col.lerp(pal.path, Math.min(1, path * 1.6));
    colors.set([col.r, col.g, col.b], i * 3);
    pos.setXYZ(i, d.x * (R_TINY + Math.max(-.25, h * .55)), d.y * (R_TINY + Math.max(-.25, h * .55)), d.z * (R_TINY + Math.max(-.25, h * .55)));
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3)); geo.computeVertexNormals();
  const land = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .92, metalness: 0 })); land.receiveShadow = true; land.castShadow = true; world.add(land);
  const sea = new THREE.Mesh(new THREE.SphereGeometry(R_TINY + .012, 160, 120), new THREE.MeshPhysicalMaterial({ color: "#2f7fa3", roughness: .22, metalness: 0, transparent: true, opacity: .86, clearcoat: .6 }));
  sea.receiveShadow = true; world.add(sea);
  const surface = (dir: THREE.Vector3) => { const { h } = heightAt(dir); return dir.clone().multiplyScalar(R_TINY + Math.max(-.25, h * .55)); };
  // Forests and rocks: instanced, set on the land above the shore, off the path.
  const conifer = new THREE.ConeGeometry(.09, .34, 7); conifer.translate(0, .2, 0);
  const round = new THREE.IcosahedronGeometry(.13, 1); round.translate(0, .2, 0);
  const trunkGeo = new THREE.CylinderGeometry(.018, .025, .1, 5); trunkGeo.translate(0, .05, 0);
  const rockGeo = new THREE.DodecahedronGeometry(.07, 0);
  const N = 1500, pines = new THREE.InstancedMesh(conifer, new THREE.MeshStandardMaterial({ color: "#2f5a2a", roughness: .9 }), N),
    oaks = new THREE.InstancedMesh(round, new THREE.MeshStandardMaterial({ color: "#5c8a35", roughness: .9, flatShading: true }), N),
    trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: "#5b4129", roughness: .9 }), 2 * N),
    rocks = new THREE.InstancedMesh(rockGeo, new THREE.MeshStandardMaterial({ color: "#8d8173", roughness: .95, flatShading: true }), 500);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), sc = new THREE.Vector3();
  let np = 0, no = 0, nt = 0, nr = 0;
  for (let k = 0; k < 9000 && (np < N || no < N); k++) {
    const dir = new THREE.Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1).normalize(), { h, path } = heightAt(dir);
    if (h < .06 || h > .72 || path > 0 || Math.abs(dir.z) * R_TINY < .45) continue;
    const dense = n3(dir.x * 5 + 2, dir.y * 5, dir.z * 5); if (dense < -.05 && rand() > .25) continue;
    const at = surface(dir); q.setFromUnitVectors(up, dir); const s = .7 + rand() * .7; sc.set(s, s * (.85 + rand() * .4), s);
    m4.compose(at, q, sc);
    if (h > .32 || rand() < .5) { if (np < N) pines.setMatrixAt(np++, m4); } else if (no < N) oaks.setMatrixAt(no++, m4);
    if (nt < 2 * N) trunks.setMatrixAt(nt++, m4);
  }
  for (let k = 0; k < 4000 && nr < 500; k++) {
    const dir = new THREE.Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1).normalize(), { h, path } = heightAt(dir);
    if (h < .02 || path > .2) continue;
    q.setFromUnitVectors(up, dir); const s = .5 + rand() * 1.4; m4.compose(surface(dir), q, sc.set(s, s * .7, s)); rocks.setMatrixAt(nr++, m4);
  }
  pines.count = np; oaks.count = no; trunks.count = nt; rocks.count = nr;
  for (const m of [pines, oaks, trunks, rocks]) { m.castShadow = true; m.receiveShadow = true; m.instanceMatrix.needsUpdate = true; world.add(m); }
  // The wonders, beside the path: angle `at` ahead of the walkers along the great circle, behind it (z < 0) unless side > 0.
  for (const l of props.landmarks) {
    const source = assets.models[l.model]; if (!source) continue;
    const model = source.clone(true);
    if (l.hide?.length) { const drop: THREE.Object3D[] = []; model.traverse(o => { if (l.hide!.some(h => o.name.startsWith(h))) drop.push(o); }); drop.forEach(o => o.removeFromParent()); }
    const box = new THREE.Box3().setFromObject(model), size = box.getSize(new THREE.Vector3()), centre = box.getCenter(new THREE.Vector3());
    const inner = new THREE.Group(), holder = new THREE.Group(); inner.add(model);
    model.position.set(-centre.x, -box.min.y, -centre.z); inner.scale.setScalar(l.height / Math.max(size.y, 1e-6));
    const dir = new THREE.Vector3(Math.sin(l.at), Math.cos(l.at), (l.side ?? -1) * .16).normalize();
    holder.position.copy(surface(dir).multiplyScalar(.997)); holder.quaternion.setFromUnitVectors(up, dir);
    inner.rotation.y = .5 + l.at; holder.add(inner); model.traverse(o => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } }); world.add(holder);
  }
  // Clouds: soft clusters riding a slower shell.
  const clouds = new THREE.Group(), puff = new THREE.IcosahedronGeometry(1, 2), cloudMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 1, emissive: "#fff4e6", emissiveIntensity: .35 });
  for (let c = 0; c < 22; c++) {
    const cl = new THREE.Group(); for (let k = 0; k < 5; k++) { const m = new THREE.Mesh(puff, cloudMat); const s = .14 + rand() * .12; m.scale.set(s * 1.6, s * .75, s); m.position.set((k - 2) * .2, rand() * .08, (rand() - .5) * .18); m.castShadow = true; cl.add(m); }
    // Each cloud lies along the way the world turns, flat to the ground below it, a little behind or in front of the walkers' path.
    const a = rand() * Math.PI * 2, dir = new THREE.Vector3(Math.sin(a), Math.cos(a), (rand() < .7 ? -1 : 1) * (.14 + rand() * .3)).normalize();
    const along = new THREE.Vector3(Math.cos(a), -Math.sin(a), 0).normalize();
    cl.position.copy(dir.clone().multiplyScalar(R_TINY + 1.2 + rand() * .6)); cl.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(along, dir, along.clone().cross(dir))); clouds.add(cl);
  }
  scene.add(clouds);
  const sun = new THREE.DirectionalLight("#ffd7a0", 3.6); sun.position.set(-9, 8, 10); sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096); Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 }); sun.shadow.bias = -.0004; sun.shadow.normalBias = .02;
  scene.add(sun, new THREE.HemisphereLight("#bcdcff", "#5d4a32", .95));
  scene.fog = new THREE.Fog("#f2c89a", 18, 34);
  return { scene, world, clouds };
}
/** How far the planet has turned at a frame: steady, or a speed ramp per beat (fast out of each wonder, slow into the next). */
function tinyTurn(props: TinyProps, frame: number) {
  const b = props.beat; if (!b) return frame * props.spin;
  const u = Math.min(b.until ?? Infinity, (frame - (b.offset ?? 0)) / b.frames), k = Math.floor(u), f = u - k, ramp = b.ramp ?? .7;
  return (b.start ?? 0) + (k + f + ramp * (1 - (1 - f) ** 2.6 - f)) * b.gap;
}
function TinyWorld({ frame, width, height, props, assets }: SlotContext & { props: TinyProps; assets: TinyAssets }) {
  const canvas = useRef<HTMLCanvasElement>(null), gl = useRef<THREE.WebGLRenderer>(undefined);
  const world = useMemo(() => buildTinyWorld(props, assets), [props, assets]);
  useLayoutEffect(() => {
    if (!canvas.current) return;
    if (!gl.current) { const r = new THREE.WebGLRenderer({ canvas: canvas.current, antialias: true, alpha: true, preserveDrawingBuffer: true }); r.outputColorSpace = THREE.SRGBColorSpace;
      r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05; r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; gl.current = r; }
    gl.current.setSize(width * 2, height * 2, false);
    // The surface at the top moves left, so the walkers go right: the world turns about the axis facing the camera.
    const turn = tinyTurn(props, frame);
    world.world.rotation.z = turn; world.clouds.rotation.z = turn * .82;
    const cam = new THREE.PerspectiveCamera(30, width / height, .1, 80), view = props.camera ?? { y: .55, z: 10.5, lookY: .55 };
    // Nearly level with the top: the planet's crown is the horizon the walkers stand on, a little below the middle of the frame.
    cam.position.set(0, R_TINY + view.y, view.z); cam.lookAt(0, R_TINY + view.lookY, 0);
    // The haze begins behind the crown, wherever the camera stands.
    const fog = world.scene.fog as THREE.Fog; fog.near = view.z + 7.5; fog.far = view.z + 23.5;
    gl.current.render(world.scene, cam);
  });
  useLayoutEffect(() => () => { gl.current?.dispose(); gl.current = undefined; }, []);
  return <div style={{ position: "absolute", inset: 0, background: "radial-gradient(55% 60% at 18% 26%, rgba(255,222,165,.95) 0%, rgba(255,196,130,.45) 38%, rgba(255,196,130,0) 72%), linear-gradient(to bottom, #2f5f9e 0%, #6f9fd0 40%, #f0c793 80%, #f3b07a 100%)" }}>
    <canvas ref={canvas} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
  </div>;
}

// ---- Logo -----------------------------------------------------------------------------------------------------------------------
function LogoSlam({ frame, props }: SlotContext & { props: { plate: string; logo: string } }) {
  const t = backOut((frame - 4) / 14), sparkle = clamp01((frame - 10) / 30);
  return <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
    <img src={props.plate} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: `scale(${1.25 - .08 * smooth(frame / 60)})`, filter: "blur(.5vmin) brightness(1.05)" }} />
    <div style={{ position: "absolute", inset: 0, background: "rgba(246,239,226,.82)" }} />
    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(105deg, rgba(255,255,255,0) ${-30 + 130 * sparkle}%, rgba(255,250,235,.55) ${-18 + 130 * sparkle}%, rgba(255,255,255,0) ${-6 + 130 * sparkle}%)` }} />
    <img src={props.logo} alt="World Wonders, with Pip and Quill" style={{ position: "absolute", left: "8%", width: "84%", top: "50%", transform: `translateY(-50%) scale(${Math.max(0, t)}) rotate(${(1 - clamp01(t)) * -6}deg)`, filter: "drop-shadow(0 1vmin 2vmin rgba(10,30,60,.3))" }} />
  </div>;
}

// ---- Sign-off --------------------------------------------------------------------------------------------------------------------
/** The end: the lockup large on ivory paper, the line and the call to action under it; the cast stands either side. */
function SignOff({ frame, props }: SlotContext & { props: { logo: string; line: string; cta: string } }) {
  const t = backOut((frame - 4) / 16), line = smooth((frame - 18) / 12), cta = backOut((frame - 30) / 12);
  const pulse = (at: number) => { const q = clamp01((frame - at) / 36); return q > 0 && q < 1 ? <div style={{ position: "absolute", inset: 0, borderRadius: 999, border: "2px solid #c9a45c", opacity: (1 - q) * .8, transform: `scale(${1 + .3 * q}, ${1 + .9 * q})` }} /> : null; };
  return <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "radial-gradient(120% 100% at 50% 40%, #fbf6ec 0%, #f2e9d8 70%, #e6d9c0 100%)" }}>
    <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: .25, mixBlendMode: "multiply" }}><filter id="paper"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves={2} /><feColorMatrix values="0 0 0 0 .45  0 0 0 0 .38  0 0 0 0 .28  0 0 0 .5 0" /></filter><rect width="100%" height="100%" filter="url(#paper)" /></svg>
    <div style={{ position: "absolute", left: "50%", top: "4%", width: "70%", transform: `translateX(-50%) scale(${Math.max(0, .9 + .1 * t)})`, opacity: clamp01((frame - 4) / 8) }}>
      <img src={props.logo} alt="World Wonders, with Pip and Quill" style={{ width: "100%", display: "block" }} />
    </div>
    <div style={{ position: "absolute", left: 0, right: 0, top: "58%", textAlign: "center", opacity: line, transform: `translateY(${(1 - line) * 1.5}vmin)`, font: "italic 500 4.4vmin/1.2 'Cormorant Garamond', 'Bodoni 72', Didot, Georgia, serif", color: "#3a3226", letterSpacing: ".01em" }}>{props.line}</div>
    <div style={{ position: "absolute", left: "50%", top: "72%", transform: `translateX(-50%) scale(${Math.max(0, cta)})` }}>
      <div style={{ position: "relative", padding: "1.6vmin 5vmin", borderRadius: 999, background: "#0e1b30", color: "#ecd29b", font: "600 3.6vmin/1 'Bodoni 72', Didot, Georgia, serif", letterSpacing: ".22em", boxShadow: "0 1vmin 2.5vmin rgba(14,27,48,.25)" }}>
        {pulse(56)}{pulse(110)}{props.cta.toUpperCase()}
      </div>
    </div>
  </div>;
}

// ---- Biplane rig for follow-subject-through-sections ------------------------------------------------------------------------------
/** Rider cues per subject media id, from `riders.json` beside the film: `{ "<media id>": { "pip": cues, "quill": cues, "model"?: glb } }`.
 * With `model`, the 3D biplane carries them; without, the drawn one. */
type Riders = Record<string, { pip?: Cues; quill?: Cues; model?: string }>;
/** Draws the biplane with Pip and Quill aboard inside the box the recipe gives (facing +x); the box is 300 × 190 plane units. */
function BiplaneRig({ state, frame, media, width, height, riders }: FollowSubjectRigProps & { riders: Riders }) {
  const f = frame.frame, cues = riders[media.id] ?? {};
  // A light plane's own life on top of the recipe's path: a little bob and a propeller that never stops.
  const bob = Math.sin(f / 7) * height * .012;
  const rider = (who: "pip" | "quill", c: Cues | undefined, left: number, h: number) => <div style={{ position: "absolute", left: `${left}%`, bottom: "26%", width: `${h * 1.4 * 140 / 190}%`, height: `${h * 140 / 190 * 2.13}%` }}>
    {renderFilmCast({ character: who, at: [.5, 1], height: 1, cues: c }, { frame: f, reducedMotion: false })}
  </div>;
  return <div data-km-biplane-rig="" data-speed={state.speed.toFixed(3)} style={{ position: "absolute", left: 0, top: bob, width, height, filter: "drop-shadow(0 .6vmin .8vmin rgba(10,20,35,.35))" }}>
    <svg viewBox="0 -50 300 190" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}><PlaneBack /></svg>
    {rider("quill", cues.quill, 9, 44)}
    {rider("pip", cues.pip, 30, 34)}
    <svg viewBox="0 -50 300 190" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}><PlaneFront prop={f * 1.7} /></svg>
  </div>;
}
/** The rig FollowSubjectRigContext takes, for a film whose follow-subject scenes carry the biplane; `riders.json` is optional. */
export async function loadFilmRig(film: SlotFilm): Promise<FollowSubjectRigRenderer | undefined> {
  const follows = film.scenes.some(scene => scene.kind === "recipe" && (scene as { spec?: { recipeId?: string } }).spec?.recipeId === "follow-subject-through-sections");
  if (!follows) return undefined;
  const riders: Riders = await fetch("riders.json").then(r => r.ok ? r.json() : {}).catch(() => ({}));
  for (const entry of Object.values(riders)) if (entry.model) await loadPlane(entry.model);
  return props => { const entry = riders[props.media.id]; const plane = entry?.model && planes.get(entry.model);
    return plane ? <Biplane3DRig {...props} riders={riders} plane={plane} /> : <BiplaneRig {...props} riders={riders} />; };
}

// ---- The 3D biplane rig ------------------------------------------------------------------------------------------------------------
/** The red vintage biplane from kumiki-blender (original, procedural, PBR), with Quill at the controls in its open cockpit and Pip
 * riding on the upper wing like a barnstormer. Rendered each frame in three.js, lit by the section's light; the characters are the
 * presenter rigs, placed on the model's real cockpit and wing, Quill cut off at the cockpit rim and behind the near wing. */
type PlaneAsset = { scene: THREE.Object3D; clips: THREE.AnimationClip[] };
let sharedGl: { renderer: THREE.WebGLRenderer; env: THREE.Texture } | undefined;
function planeGl() {
  if (sharedGl) return sharedGl;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const pmrem = new THREE.PMREMGenerator(renderer), env = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  return sharedGl = { renderer, env };
}
/** Pip rides at the very front of the upper wing, over the engine, clear of Quill in the cockpit. */
const boxOf = (root: THREE.Object3D, name: string) => { const node = root.getObjectByName(name); return node ? new THREE.Box3().setFromObject(node) : undefined; };
type Biplane3DProps = { width: number; height: number; frame: number; plane: PlaneAsset; pip?: Cues; quill?: Cues;
  /** Which way the nose points, radians about the vertical: π/2 is side-on, flying to screen right; smaller turns it toward the camera. */
  heading?: number; bank?: number; pitch?: number;
  /** The scene's light on the plane and its riders (#rrggbb) and its strength. */
  light?: string; exposure?: number };
/** The 3D biplane with Pip and Quill aboard, fitted into a width × height box at one frame. */
function Biplane3D({ width, height, frame: f, plane, pip, quill, heading = Math.PI / 2, bank = 0, pitch = 0, light = "#fff1dc", exposure = 1 }: Biplane3DProps) {
  const back = useRef<HTMLCanvasElement>(null), front = useRef<HTMLCanvasElement>(null), filterId = "km-plane-light-" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const world = useMemo(() => {
    const scene = new THREE.Scene(), holder = new THREE.Group(), inner = new THREE.Group(), model = plane.scene.clone(true);
    inner.add(model); holder.add(inner); scene.add(holder);
    model.updateMatrixWorld(true);
    // Anchors in the model's own space (glTF: nose +Z, wings along X, Y up).
    const seat = boxOf(model, "cockpit-seat")!, rim = boxOf(model, "cockpit-rear-coaming")!, wing = boxOf(model, "upper-center-wing")!, all = new THREE.Box3().setFromObject(model);
    const anchors = { seat: new THREE.Vector3(0, seat.max.y, (seat.min.z + seat.max.z) / 2), rim: rim.max.y,
      wing: new THREE.Vector3(-.7, wing.max.y, wing.max.z - .12), centre: all.getCenter(new THREE.Vector3()), size: all.getSize(new THREE.Vector3()) };
    // The near half (model x < 0 faces the camera in a side view) can pass in front of Quill.
    const near: THREE.Mesh[] = [];
    model.traverse(o => { if ((o as THREE.Mesh).isMesh) { const c = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()); if (c.x < -.55 && c.y > 1.2) near.push(o as THREE.Mesh); } });
    const mixer = new THREE.AnimationMixer(model);
    for (const clip of plane.clips) if (/propeller/.test(clip.name)) mixer.clipAction(clip).play();
    const sun = new THREE.DirectionalLight("#fff1dc", 3.2); sun.position.set(-4, 9, 7);
    const hemi = new THREE.HemisphereLight("#cfe6ff", "#6d5a40", .9);
    scene.add(sun, hemi);
    // The fitting sphere: the whole model at any heading, so the plane keeps its size in the box as it turns.
    const radius = all.getSize(new THREE.Vector3()).length() / 2;
    return { scene, holder, inner, model, anchors, near, mixer, sun, radius };
  }, [plane]);
  const placed = (() => {
    const cam = new THREE.PerspectiveCamera(20, width / height, .1, 200);
    const yaw = 20 * Math.PI / 180, elev = 13 * Math.PI / 180, d = 34;
    const target = new THREE.Vector3(0, world.anchors.centre.y, 0);
    cam.position.set(d * Math.sin(yaw) * Math.cos(elev), target.y + d * Math.sin(elev), d * Math.cos(yaw) * Math.cos(elev)); cam.lookAt(target);
    world.holder.rotation.y = heading;
    // Roll with the bank, and a light plane's small pitch breathing.
    world.inner.rotation.z = -bank * .22;
    world.inner.rotation.x = pitch + Math.sin(f / 23) * .015;
    world.scene.updateMatrixWorld(true);
    cam.updateMatrixWorld();
    // Fit the model's bounding sphere to the box's shorter side (in view angle), a little tighter than the sphere since the plane is flat.
    const half = Math.atan(world.radius * .8 / d), fit = Math.min(1, width / height);
    cam.zoom = Math.tan(10 * Math.PI / 180) * fit / Math.tan(half) * 1.25; cam.updateProjectionMatrix();
    const px = (v: THREE.Vector3) => { const p = world.inner.localToWorld(v.clone()).project(cam); return { x: (p.x + 1) / 2 * width, y: (1 - p.y) / 2 * height }; };
    const metre = Math.abs(px(world.anchors.seat).y - px(world.anchors.seat.clone().add(new THREE.Vector3(0, 1, 0))).y);
    return { cam, seat: px(world.anchors.seat), rim: px(new THREE.Vector3(0, world.anchors.rim, world.anchors.seat.z)), wing: px(world.anchors.wing), metre };
  })();
  useLayoutEffect(() => {
    const { renderer, env } = planeGl(), scale = Math.min(2, 1600 / Math.max(width, 1)), w = Math.max(2, Math.round(width * scale)), h = Math.max(2, Math.round(height * scale));
    world.scene.environment = env; world.scene.environmentIntensity = .55;
    world.sun.color.set(light); world.sun.intensity = 3.2 * exposure;
    // Two propeller turns a second faster than the rig's loop: a blur, as a camera sees it.
    world.mixer.setTime((f / 30) * 3 % 4);
    renderer.setSize(w, h, false);
    const paint = (canvas: HTMLCanvasElement | null) => { if (!canvas) return; canvas.width = w; canvas.height = h; const ctx = canvas.getContext("2d")!; ctx.clearRect(0, 0, w, h); ctx.drawImage(renderer.domElement, 0, 0); };
    world.near.forEach(m => { m.visible = true; });
    renderer.render(world.scene, placed.cam); paint(back.current);
    const hidden: THREE.Object3D[] = [];
    world.model.traverse(o => { if ((o as THREE.Mesh).isMesh && !world.near.includes(o as THREE.Mesh) && o.visible) { o.visible = false; hidden.push(o); } });
    renderer.render(world.scene, placed.cam); paint(front.current);
    hidden.forEach(o => { o.visible = true; });
  });
  // Quill sits in the cockpit: his box stands on the seat and is cut at the rim. Pip stands on the upper wing. Both take the scene's light.
  const quillH = placed.metre * 3.1, pipH = placed.metre * 2.3, rgb = [1, 3, 5].map(k => parseInt(light.slice(k, k + 2), 16) / 255 * Math.min(1.08, exposure));
  const box = (x: number, feet: number, h: number): CSSProperties => ({ position: "absolute", left: x - h * .7, top: feet - h, width: h * 1.4, height: h, filter: `url(#${filterId})` });
  return <div data-km-biplane-3d="" style={{ position: "absolute", inset: 0, width, height }}>
    <svg aria-hidden="true" width="0" height="0" style={{ position: "absolute" }}><filter id={filterId} colorInterpolationFilters="sRGB">
      <feColorMatrix type="matrix" values={`${rgb[0]} 0 0 0 0  0 ${rgb[1]} 0 0 0  0 0 ${rgb[2]} 0 0  0 0 0 1 0`} /></filter></svg>
    <canvas ref={back} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
    <div style={{ ...box(placed.seat.x, placed.seat.y + quillH * .04, quillH), clipPath: `inset(0 0 ${Math.max(0, placed.seat.y + quillH * .04 - placed.rim.y)}px 0)` }}>
      {renderFilmCast({ character: "quill", at: [.5, 1], height: 1, cues: quill }, { frame: f, reducedMotion: false })}
    </div>
    <canvas ref={front} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
    <div style={box(placed.wing.x, placed.wing.y + pipH * .02, pipH)}>
      {renderFilmCast({ character: "pip", at: [.5, 1], height: 1, cues: pip }, { frame: f, reducedMotion: false })}
    </div>
  </div>;
}
/** The biplane as follow-subject-through-sections' subject: the recipe's bank and section light drive it. */
function Biplane3DRig({ state, frame, width, height, riders, plane, media }: FollowSubjectRigProps & { riders: Riders; plane: PlaneAsset }) {
  const cues = riders[media.id] ?? {};
  return <Biplane3D width={width} height={height} frame={frame.frame} plane={plane} pip={cues.pip} quill={cues.quill} bank={state.bank} light={state.light.color} exposure={state.light.exposure} />;
}

// ---- Cast props: the biplane and place stamps ------------------------------------------------------------------------------------
/** What a cast member that is not a character draws, by its character id, from `cast-props.json` beside the film. */
type PlaneProp = { model: string; heading?: number; headingTo?: number; bank?: number; pitch?: number; light?: string; exposure?: number; pip?: Cues; quill?: Cues;
  /** A winding flight instead of a straight walk: keys at scene frames, each an offset of the plane from its box (in box heights), a
   * scale (1 or less), a heading and a bank. The plane passes smoothly through every key. */
  path?: { at: number; dx: number; dy: number; scale: number; heading: number; bank?: number }[] };
/** A smooth curve through keys (Catmull-Rom), so a path bends through its points without stopping at them. */
function alongPath<K extends { at: number }>(keys: K[], frame: number, value: (key: K) => number) {
  const i = Math.max(0, Math.min(keys.length - 2, keys.findIndex((_, n) => n + 1 < keys.length && frame < keys[n + 1].at))), last = keys.length - 1;
  const k = frame >= keys[last].at ? last - 1 : i, t = clamp01((frame - keys[k].at) / Math.max(1, keys[k + 1].at - keys[k].at));
  const p0 = value(keys[Math.max(0, k - 1)]), p1 = value(keys[k]), p2 = value(keys[k + 1]), p3 = value(keys[Math.min(last, k + 2)]);
  return .5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t * t * t);
}
type StampProp = { place: string; country: string; coords: string; no: string };
/** A quiz card over the scene: `aspect` is its box's width over the cast box's height. */
type QuizProp = { content: QuizCardContent; aspect: number; frames: number; fps: number };
type CastProps = Record<string, { plane?: PlaneProp; stamp?: StampProp; quiz?: QuizProp }>;
/** A field-guide label for a place: its name, country and coordinates, set as a luggage label in the channel's navy and brass. */
function PlaceStamp({ stamp, age }: { stamp: StampProp; age: number }) {
  const ink = clamp01(age / 5), rule = smooth((age - 4) / 10);
  return <div style={{ position: "absolute", inset: 0, containerType: "size", display: "grid", placeItems: "center", opacity: ink }}>
    <div style={{ width: "92%", height: "86%", boxSizing: "border-box", transform: "rotate(-4deg)", borderRadius: "5cqh", background: "rgba(14,27,48,.82)", border: ".9cqh solid #c9a45c", outline: ".35cqh solid rgba(201,164,92,.75)", outlineOffset: "-3.4cqh",
      boxShadow: "0 2cqh 5cqh rgba(0,0,0,.35)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "2.6cqh", padding: "7cqh 6cqw", color: "#f6efe2", textAlign: "center" }}>
      <div style={{ font: "600 6.4cqh/1 'Avenir Next', 'Helvetica Neue', sans-serif", letterSpacing: ".3em", color: "#c9a45c", whiteSpace: "nowrap" }}>FIELD GUIDE · No. {stamp.no}</div>
      <div style={{ font: `700 ${Math.min(21, 150 / Math.max(6, stamp.place.length))}cqh/1 'Bodoni 72', Didot, 'Bodoni Moda', Georgia, serif`, letterSpacing: ".04em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{stamp.place}</div>
      <div style={{ width: `${70 * rule}%`, height: ".5cqh", background: "#c9a45c" }} />
      <div style={{ font: "italic 500 9cqh/1 'Cormorant Garamond', 'Bodoni 72', Georgia, serif", color: "#ecd29b", whiteSpace: "nowrap" }}>{stamp.country}</div>
      <div style={{ font: "500 6.2cqh/1 'Avenir Next', 'Helvetica Neue', sans-serif", letterSpacing: ".16em", color: "#c9a45c", whiteSpace: "nowrap" }}>{stamp.coords}</div>
    </div>
  </div>;
}
/** Sized by its parent box, whatever that is: the biplane needs pixels, so it measures them. */
function SizedPlane({ prop, plane, frame, member }: { prop: PlaneProp; plane: PlaneAsset; frame: number; member: FilmCastMember }) {
  const ref = useRef<HTMLDivElement>(null), [size, setSize] = useState<{ w: number; h: number }>();
  // Measured after every render on purpose: the cast box grows as the plane comes closer.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => { const el = ref.current; if (el && (!size || Math.abs(size.w - el.offsetWidth) > .5 || Math.abs(size.h - el.offsetHeight) > .5)) setSize({ w: el.offsetWidth, h: el.offsetHeight }); });
  // The heading can turn over the member's walk: toward the camera as it comes, away as it leaves.
  const w = member.walk, t = w ? smooth((frame - w.from) / Math.max(1, w.to - w.from)) : 0, heading = (prop.heading ?? Math.PI / 2) + ((prop.headingTo ?? prop.heading ?? Math.PI / 2) - (prop.heading ?? Math.PI / 2)) * t;
  const path = prop.path, along = (value: (key: NonNullable<PlaneProp["path"]>[number]) => number) => alongPath(path!, frame, value);
  const move = path && size ? `translate(${along(k => k.dx) * size.h}px, ${along(k => k.dy) * size.h}px) scale(${Math.max(.02, along(k => k.scale))})` : undefined;
  return <div ref={ref} style={{ position: "absolute", inset: 0, transform: move, transformOrigin: "50% 50%" }}>{size && <Biplane3D width={size.w} height={size.h} frame={frame} plane={plane} heading={path ? along(k => k.heading) : heading}
    bank={(path ? along(k => k.bank ?? 0) : prop.bank ?? 0) + Math.sin(frame / 19) * .25} pitch={prop.pitch} light={prop.light} exposure={prop.exposure} pip={prop.pip} quill={prop.quill} />}</div>;
}
const planes = new Map<string, PlaneAsset>();
async function loadPlane(src: string) { if (!planes.has(src)) { const gltf = await new GLTFLoader().loadAsync(src); planes.set(src, { scene: gltf.scene, clips: gltf.animations }); } return planes.get(src)!; }
/** Registers the film's cast props (from `cast-props.json`, optional) with the cast renderer. */
export async function loadFilmProps() {
  const props: CastProps = await fetch("cast-props.json").then(r => r.ok ? r.json() : {}).catch(() => ({}));
  for (const [id, prop] of Object.entries(props)) {
    if (prop.plane) { const plane = await loadPlane(prop.plane.model); registerCastProp(id, (member, { frame }) => <SizedPlane prop={prop.plane!} plane={plane} frame={frame} member={member} />); }
    if (prop.stamp) registerCastProp(id, (member, { frame }) => <PlaceStamp stamp={prop.stamp!} age={frame - (member.enterAt ?? 0)} />);
    if (prop.quiz) {
      const { plan, problems } = compileQuizCard(prop.quiz.content, prop.quiz.frames, prop.quiz.fps);
      for (const problem of problems) console[problem.severity === "error" ? "error" : "warn"](`cast-props ${id}: ${problem.code}: ${problem.message}`);
      if (!plan) throw new Error(`cast-props "${id}": the quiz has errors: ${problems.map(problem => problem.message).join(" ")}`);
      // The card's box is wider than a cast box: centred on it, `aspect` times its height. Its type follows the film's display font.
      registerCastProp(id, (member, { frame, reducedMotion }) => <div style={{ position: "absolute", top: 0, height: "100%", left: "50%", width: `${prop.quiz!.aspect / 1.4 * 100}%`, transform: "translateX(-50%)",
        ["--km-font-display" as string]: "'Bodoni 72', Didot, 'Bodoni Moda', Georgia, serif", ["--km-font-body" as string]: "'Avenir Next', 'Helvetica Neue', system-ui, sans-serif", ["--km-quiz-accent" as string]: "#dcb96c" }}>
        <QuizCard plan={plan} frame={frame - (member.enterAt ?? 0)} reducedMotion={reducedMotion} /></div>);
    }
  }
}

// ---- The fly-past: the biplane comes out of the distance and passes the camera ---------------------------------------------------
type Pose = { x: number; y: number; height: number; heading?: number; bank?: number };
/** `flip` mirrors the plane, to fly to screen left. */
type FlyProps = { plate: string; focus?: [number, number]; model: string; from: Pose; to: Pose; power?: number; light?: string; pip?: Cues; quill?: Cues; haze?: string; flip?: boolean };
/** Where the plane is between two poses: its size grows geometrically, as a thing does coming at a lens, and it accelerates. */
function flyPose(a: Pose, b: Pose, t: number, power: number): Required<Pose> {
  const e = clamp01(t) ** power, mix = (p: number, q: number) => p + (q - p) * e;
  return { x: mix(a.x, b.x), y: mix(a.y, b.y), height: a.height * (b.height / a.height) ** e, heading: mix(a.heading ?? Math.PI / 2, b.heading ?? a.heading ?? Math.PI / 2), bank: mix(a.bank ?? 0, b.bank ?? a.bank ?? 0) };
}
function FlyPast({ frame, durationFrames, width, height, props, plane }: SlotContext & { props: FlyProps; plane: PlaneAsset }) {
  const t = frame / Math.max(1, durationFrames - 1), power = props.power ?? 2.4, pose = flyPose(props.from, props.to, t, power), before = flyPose(props.from, props.to, t - 1 / Math.max(1, durationFrames - 1), power);
  const boxH = pose.height * height, boxW = boxH * 1.5;
  // How far it moved this frame, in frame heights: past a threshold it smears, as on a shutter.
  const moved = Math.hypot((pose.x - before.x) * width, (pose.y - before.y) * height) + Math.abs(pose.height - before.height) * height, blur = Math.min(height * .05, Math.max(0, moved - height * .07) * .1);
  return <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#0b1220" }}>
    <img src={props.plate} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: `${(props.focus?.[0] ?? .5) * 100}% ${(props.focus?.[1] ?? .5) * 100}%`,
      transform: `scale(${1.06 + .08 * t}) translate(${1.5 * t}%, ${-1 * t}%)`, transformOrigin: "50% 60%" }} />
    {props.haze && <div style={{ position: "absolute", inset: 0, background: props.haze }} />}
    <div style={{ position: "absolute", left: pose.x * width - boxW / 2, top: pose.y * height - boxH / 2, width: boxW, height: boxH, filter: blur > .3 ? `blur(${blur.toFixed(2)}px)` : undefined }}>
      <Biplane3D width={boxW} height={boxH} frame={frame} plane={plane} heading={pose.heading} bank={pose.bank + Math.sin(frame / 9) * .12} light={props.light ?? "#ffe2bd"} exposure={1.05} pip={props.pip} quill={props.quill} />
    </div>
  </div>;
}

// ---- The finale: the name in a golden sky over the little planet, the biplane flying off ------------------------------------------
type FinaleProps = { tiny: TinyProps; model: string; logo: string; line: string; cta: string; from: Pose; to: Pose; planeFrames: [number, number]; flip?: boolean; lineAt: number; ctaAt: number; pulses: number[]; pip?: Cues; quill?: Cues;
  /** The first pass: the biplane crosses the sky over these frames at `height` (of the frame), and the name appears in its wake. */
  write: { frames: [number, number]; height: number } };
function Finale(context: SlotContext & { props: FinaleProps; assets: TinyAssets; plane: PlaneAsset }) {
  const { frame, width, height, props, plane } = context;
  const w = props.write, wt = clamp01((frame - w.frames[0]) / Math.max(1, w.frames[1] - w.frames[0])), we = 1 - (1 - wt) ** 1.5;
  const sweep = clamp01((frame - w.frames[1] - 4) / 30), line = smooth((frame - props.lineAt) / 14), cta = backOut((frame - props.ctaAt) / 12);
  // The name: 64% of the frame wide, from 18%; it shows as far as the plane's tail has flown.
  const LEFT = .18, WIDE = .64, TOP = .07, wx = -.22 + 1.5 * we, wy = TOP + WIDE * width / 4.86 / height * .52 + Math.sin(wt * Math.PI) * -.02, wH = w.height * height, wW = wH * 1.5;
  const shown = wt >= 1 ? 1 : clamp01((wx - wW / width * .3 - LEFT) / WIDE), trail = 1 - clamp01((frame - w.frames[1] - 12) / 36);
  const t = (frame - props.planeFrames[0]) / Math.max(1, props.planeFrames[1] - props.planeFrames[0]), pose = flyPose(props.from, props.to, t, 1), boxH = pose.height * height, boxW = boxH * 1.5;
  const pulse = (at: number) => { const q = clamp01((frame - at) / 30); return q > 0 && q < 1 ? <div key={at} style={{ position: "absolute", inset: 0, borderRadius: 999, border: "2px solid #ecd29b", opacity: (1 - q) * .9, transform: `scale(${1 + .35 * q}, ${1 + 1.1 * q})` }} /> : null; };
  return <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
    <TinyWorld {...context} props={props.tiny} assets={context.assets} />
    {/* A soft light behind the name, where the sky is brightest, so the navy letters hold; it arrives with the letters. */}
    <div style={{ position: "absolute", inset: 0, background: "radial-gradient(52% 36% at 50% 22%, rgba(255,246,228,.9) 0%, rgba(255,240,214,.55) 45%, rgba(255,240,214,0) 100%)", opacity: shown }} />
    {t > 0 && t < 1 && <div style={{ position: "absolute", left: pose.x * width - boxW / 2, top: pose.y * height - boxH / 2, width: boxW, height: boxH, transform: props.flip ? "scaleX(-1)" : undefined, opacity: clamp01((1 - t) * 8) }}>
      <Biplane3D width={boxW} height={boxH} frame={frame} plane={plane} heading={pose.heading} bank={pose.bank + Math.sin(frame / 14) * .2} light="#ffdcae" exposure={1.05} pip={props.pip} quill={props.quill} />
    </div>}
    <div style={{ position: "absolute", left: `${LEFT * 100}%`, top: `${TOP * 100}%`, width: `${WIDE * 100}%`, clipPath: `inset(-10% ${(1 - shown) * 100}% -10% 0)` }}>
      <img src={props.logo} alt="World Wonders, with Pip and Quill" style={{ width: "100%", display: "block" }} />
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(105deg, rgba(255,255,255,0) ${-30 + 130 * sweep}%, rgba(255,250,235,.75) ${-18 + 130 * sweep}%, rgba(255,255,255,0) ${-6 + 130 * sweep}%)`, mixBlendMode: "screen",
        WebkitMaskImage: `url(${props.logo})`, maskImage: `url(${props.logo})`, WebkitMaskSize: "100% 100%", maskSize: "100% 100%" }} />
    </div>
    {/* The plane's wake: a dotted brass line, as on the emblem's orbit, that fades once the name is written. */}
    <div aria-hidden="true" style={{ position: "absolute", left: `${LEFT * 100}%`, top: `${(TOP + WIDE * width / 4.86 / height + .012) * 100}%`, width: `${shown * WIDE * 100}%`, height: ".8vmin", opacity: trail * .9,
      backgroundImage: "radial-gradient(circle, #c9a45c 0 36%, rgba(201,164,92,0) 44%)", backgroundSize: "2.4vmin 100%", backgroundRepeat: "repeat-x" }} />
    {wt > 0 && wt < 1 && <>
      <div aria-hidden="true" style={{ position: "absolute", left: `${(LEFT + shown * WIDE) * 100}%`, top: `${wy * 100}%`, width: "16vmin", height: "16vmin", transform: "translate(-50%, -50%)", background: "radial-gradient(closest-side, rgba(255,244,214,.95), rgba(255,226,170,.5) 40%, rgba(255,226,170,0))" }} />
      <div style={{ position: "absolute", left: wx * width - wW / 2, top: wy * height - wH / 2, width: wW, height: wH }}>
        <Biplane3D width={wW} height={wH} frame={frame} plane={plane} bank={Math.sin(wt * Math.PI * 2) * .6} light="#ffdcae" exposure={1.05} pip={props.pip} quill={props.quill} />
      </div>
    </>}
    <div style={{ position: "absolute", left: 0, right: 0, top: "34.5%", textAlign: "center", opacity: line, transform: `translateY(${(1 - line) * 1.5}vmin)`, font: "italic 500 4.6vmin/1.2 'Cormorant Garamond', 'Bodoni 72', Georgia, serif", color: "#16233b", textShadow: "0 0 2vmin rgba(255,246,228,.9)" }}>{props.line}</div>
    <div style={{ position: "absolute", left: "50%", top: "46%", transform: `translateX(-50%) scale(${Math.max(0, cta)})` }}>
      <div style={{ position: "relative", padding: "1.7vmin 5.4vmin", borderRadius: 999, background: "#0e1b30", color: "#ecd29b", font: "600 3.6vmin/1 'Bodoni 72', Didot, Georgia, serif", letterSpacing: ".22em", boxShadow: "0 1vmin 2.4vmin rgba(14,27,48,.35)" }}>
        {props.pulses.map(pulse)}{props.cta.toUpperCase()}
      </div>
    </div>
  </div>;
}

// ---- Loader -----------------------------------------------------------------------------------------------------------------------
type SlotFilm = { scenes: readonly { kind: string; content?: unknown; spec?: unknown }[] };
/** Loads what a film's slot scenes need (the planet's map and models), then returns the renderer FilmStage takes as `renderSlot`. */
export async function loadFilmSlots(film: SlotFilm): Promise<(content: SlotContent, context: SlotContext) => ReactNode> {
  const planets = film.scenes.flatMap(scene => scene.kind === "slot" && (scene.content as SlotContent).slot === "planet-walk" ? [(scene.content as SlotContent).props as unknown as PlanetProps] : []);
  const assets = new Map<string, PlanetAssets>();
  const loader = new GLTFLoader(), textures = new THREE.TextureLoader();
  for (const props of planets) {
    const key = JSON.stringify(props.models);
    if (assets.has(key)) continue;
    const day = await textures.loadAsync(props.day); day.colorSpace = THREE.SRGBColorSpace; day.anisotropy = 8;
    const models = Object.fromEntries(await Promise.all(Object.entries(props.models).map(async ([id, src]) => [id, (await loader.loadAsync(src)).scene] as const)));
    assets.set(key, { day, models });
  }
  const tinies = new Map<string, TinyAssets>();
  for (const scene of film.scenes) if (scene.kind === "slot" && (scene.content as SlotContent).slot === "tiny-world") {
    const props = (scene.content as SlotContent).props as unknown as TinyProps, key = JSON.stringify(props.models);
    if (!tinies.has(key)) tinies.set(key, { models: Object.fromEntries(await Promise.all(Object.entries(props.models).map(async ([id, src]) => [id, (await loader.loadAsync(src)).scene] as const))) });
  }
  for (const scene of film.scenes) if (scene.kind === "slot") {
    const c = scene.content as SlotContent;
    if (c.slot === "fly-past" || c.slot === "finale") await loadPlane((c.props as { model: string }).model);
    if (c.slot === "finale") { const props = (c.props as unknown as FinaleProps).tiny, key = JSON.stringify(props.models);
      if (!tinies.has(key)) tinies.set(key, { models: Object.fromEntries(await Promise.all(Object.entries(props.models).map(async ([id, src]) => [id, (await loader.loadAsync(src)).scene] as const))) }); }
  }
  return (content, context) => {
    const props = content.props ?? {};
    switch (content.slot) {
      case "biplane-flight": return <BiplaneFlight {...context} props={props as never} />;
      case "planet-walk": return <PlanetWalk {...context} props={props as unknown as PlanetProps} assets={assets.get(JSON.stringify((props as unknown as PlanetProps).models))!} />;
      case "tiny-world": return <TinyWorld {...context} props={props as unknown as TinyProps} assets={tinies.get(JSON.stringify((props as unknown as TinyProps).models))!} />;
      case "fly-past": return <FlyPast {...context} props={props as unknown as FlyProps} plane={planes.get((props as unknown as FlyProps).model)!} />;
      case "finale": return <Finale {...context} props={props as unknown as FinaleProps} assets={tinies.get(JSON.stringify((props as unknown as FinaleProps).tiny.models))!} plane={planes.get((props as unknown as FinaleProps).model)!} />;
      case "logo": return <LogoSlam {...context} props={props as never} />;
      case "sign-off": return <SignOff {...context} props={props as never} />;

      // Original art-style fixtures run through the same production renderer as Storybook.
      // The Film Document still owns all scene timing; these slots draw only frame samples.
      // Generic JSON-authored, portable crayon scene: no code changes needed for new subjects.
      case "crayon-scene": {
        const scene: unknown = props.scene;
        assertCrayonScene(scene);
        if (scene.width !== context.width || scene.height !== context.height)
          throw new RangeError("crayon-scene dimensions must match the FilmStage output");
        if (scene.durationFrames !== context.durationFrames)
          throw new RangeError("crayon-scene durationFrames must match its film shot duration");
        return <CrayonScene spec={scene} frame={context.frame} reducedMotion={context.reducedMotion}/>;
      }
      case "crayon-storybook": {
        const rawOffset = props.offsetFrame ?? 0;
        if (typeof rawOffset !== "number" || !Number.isSafeInteger(rawOffset) || rawOffset < 0)
          throw new RangeError("crayon-storybook offsetFrame must be a nonnegative integer.");
        const story = props.story ?? "lantern";
        if (story !== "lantern" && story !== "garden")
          throw new RangeError("crayon-storybook story must be lantern or garden.");
        return <CrayonStorybook frame={rawOffset + context.frame} story={story}
          aspect={context.width > context.height ? "landscape" : "portrait"}
          reducedMotion={context.reducedMotion} seed={23} pressure={.87} paperTooth={.58} />;
      }
      case "riso-print-study": {
        const aspect = context.width > context.height ? "landscape" : "portrait";
        const rawOffset = props.offsetFrame ?? 0;
        if (!Number.isSafeInteger(rawOffset) || typeof rawOffset !== "number" || rawOffset < 0)
          throw new RangeError("riso-print-study offsetFrame must be a nonnegative integer.");
        return <RisoPrint spec={risoExampleSpec(aspect)} artworks={risoExampleArtworks(aspect)}
          frame={rawOffset + context.frame} misregistration={.25} paperGrain={.55}
          reducedMotion={context.reducedMotion}/>;
      }
      case "riso-sheet-feed": {
        const aspect = context.width > context.height ? "landscape" : "portrait";
        return <RisoSheetFeed
          outgoing={{ spec: risoExampleSpec(aspect), artworks: risoExampleArtworks(aspect) }}
          incoming={{ spec: risoExampleSpec(aspect, 37), artworks: risoSecondSheetArtworks(aspect) }}
          frame={context.frame} startFrame={0} durationFrames={170}
          misregistration={.25} paperGrain={.55} reducedMotion={context.reducedMotion}/>;
      }
      case "riso-overprint": {
        const aspect = context.width > context.height ? "landscape" : "portrait";
        return <RisoOverprintTransition
          outgoing={{ spec: risoExampleSpec(aspect), artworks: risoExampleArtworks(aspect) }}
          incoming={{ spec: risoExampleSpec(aspect, 37), artworks: risoSecondSheetArtworks(aspect) }}
          imprintPath={RISO_OVERPRINT_MOTIF} imprintOrigin={risoOverprintOrigin(aspect)}
          imprintPlateId="red" imprintArtwork={risoSecondSheetImprintArt(aspect)} frame={context.frame} startFrame={0} durationFrames={179}
          misregistration={.25} paperGrain={.55} reducedMotion={context.reducedMotion}/>;
      }
      case "riso-next-print": {
        const aspect = context.width > context.height ? "landscape" : "portrait";
        const spec = risoExampleSpec(aspect, 37);
        return <RisoPrint spec={spec} artworks={risoSecondSheetArtworks(aspect)}
          frame={completedRisoFrame(spec)} misregistration={.25} paperGrain={.55}
          reducedMotion={context.reducedMotion}/>;
      }

      default: throw new Error(`No slot "${content.slot}". Slots: biplane-flight, planet-walk, tiny-world, fly-past, finale, logo, sign-off.`);
    }
  };
}
