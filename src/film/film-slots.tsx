/** Bespoke scenes a film can name as `slot` scenes, for the capture page and stories: a biplane flight with Pip and Quill aboard, a walk
 * around a tiny 3D Earth past the world's wonders, and the World Wonders logo landing. App code, not library code. Each is a pure
 * function of the scene frame; the planet's models and maps are loaded before the film plays. */
import { useLayoutEffect, useMemo, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { FilmCastMember } from "../../registry/video/film-document";
import { renderFilmCast } from "./film-cast";

type SlotContext = { frame: number; fps: { num: number; den: number }; durationFrames: number; width: number; height: number; reducedMotion: boolean };
type SlotContent = { slot: string; label: string; props?: Readonly<Record<string, unknown>> };
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const smooth = (t: number) => { const x = clamp01(t); return x * x * (3 - 2 * x); };
const backOut = (t: number) => { const x = clamp01(t) - 1; return 1 + 2.2 * x * x * x + 1.2 * x * x; };
type Cues = FilmCastMember["cues"];

// ---- Biplane flight ------------------------------------------------------------------------------------------------------------
/** The biplane in two layers, so the riders sit between them: the top wing and tail behind, the fuselage and lower wing in front. */
function PlaneBack() {
  return <g stroke="#7a3d16" strokeWidth="3" strokeLinejoin="round">
    <path d="M85 44L238 39L265 57L95 62Z" fill="#ffc23d" /><path d="M25 65L8 45L68 63Z" fill="#ffd36e" />
    <path d="M141 48L148 97M218 45L219 90" stroke="#5b3a1c" strokeWidth="5" />
  </g>;
}
function PlaneFront({ prop }: { prop: number }) {
  return <g stroke="#7a3d16" strokeWidth="3" strokeLinejoin="round">
    <path d="M24 80Q118 62 236 72L285 89L226 99L58 103Z" fill="#ff6b4a" />
    <path d="M60 86Q140 76 230 82" fill="none" stroke="#ffd2a8" strokeWidth="3" opacity=".7" />
    <path d="M73 89L225 83L254 100L85 111Z" fill="#f29a2e" />
    <circle cx="99" cy="118" r="13" fill="#3a332b" /><circle cx="219" cy="115" r="13" fill="#3a332b" />
    <path d="M99 104L104 89M219 101L214 87" stroke="#5b3a1c" strokeWidth="4" />
    {/* The propeller, a blur that spins. */}
    <ellipse cx="287" cy="89" rx="5" ry={30 * Math.abs(Math.cos(prop))} fill="rgba(60,45,35,.55)" stroke="none" />
    <circle cx="287" cy="89" r="5" fill="#3a332b" />
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

// ---- Loader -----------------------------------------------------------------------------------------------------------------------
type SlotFilm = { scenes: readonly { kind: string; content?: unknown }[] };
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
  return (content, context) => {
    const props = content.props ?? {};
    switch (content.slot) {
      case "biplane-flight": return <BiplaneFlight {...context} props={props as never} />;
      case "planet-walk": return <PlanetWalk {...context} props={props as unknown as PlanetProps} assets={assets.get(JSON.stringify((props as unknown as PlanetProps).models))!} />;
      case "logo": return <LogoSlam {...context} props={props as never} />;
      case "sign-off": return <SignOff {...context} props={props as never} />;
      default: throw new Error(`No slot "${content.slot}". Slots: biplane-flight, planet-walk, logo, sign-off.`);
    }
  };
}
