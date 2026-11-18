/** An interactive horse-and-rider gallop across open range, in Three.js.
 *
 * Assembly of reusable pieces, each documented in its own module:
 * - `horse-3d` / `horse-gallop`: the rigged stock horse GLB and its Muybridge-timed gallop clip;
 * - `horse-coat`: the coat (colour, white patterns, spots, markings) and size, changed live;
 * - `western-tack`: saddle, bridle, stirrups and hat (GLB), attached to the horse's bones;
 * - `mounted-rider`: the Rocketbox rider coupled to the seat, boots IK-locked in the stirrups;
 * - `verlet-cloth`: reins and a neckerchief that answer the motion and the wind of the gallop, and the tail hair as
 *   a spring bone chain (air drag, gravity, the rump's turbulent wake);
 * - `gait-contacts`: hoof contacts measured from the clip itself;
 * - `footfall-audio`: recorded hoofbeats scheduled on the audio clock at those contacts;
 * - `impact-dust`: pooled dust and clods thrown at each strike and push-off;
 * - `chase-camera-three`: damped chase, tracking, front and hoof-height framings with FOV punch and shake;
 * - `trail-terrain`: the trail loop, rolling plain and GEO1 mesas on the horizon.
 *
 * Timing contract. The mixer time is advanced by dt × playback rate; the horse moves along the trail at
 * strideLength × strideFrequency × rate, so planted hooves stay put. Each frame, contacts crossed since the
 * last frame spawn dust (aged by how long ago they happened) and add camera trauma; contacts due within the
 * next frames are scheduled on the AudioContext clock at their predicted presentation time (via
 * `getOutputTimestamp`), so the thud is heard when the hoof is seen to land. Nothing is created per frame
 * except the Web Audio source node each hit needs.
 *
 * Controls: `setRunning(false)` brings the horse to a halt and blends into the standing clip; `setPaused` freezes
 * the world while the camera still moves; `setRiderVisible` and `setTackVisible` take the rider and the saddle
 * and bridle off; `orbit`, `zoom` and `resetView` turn the chosen framing round the horse.
 */
import {
  ACESFilmicToneMapping, AnimationMixer, Color, DirectionalLight, DoubleSide, FogExp2, HalfFloatType, HemisphereLight, Matrix4, Mesh,
  MeshStandardMaterial, PCFShadowMap, PerspectiveCamera, PMREMGenerator, Quaternion, Scene, SRGBColorSpace, Vector2, Vector3, WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import type { AnimationAction, AnimationClip, Object3D, SkinnedMesh } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Sky } from "three/addons/objects/Sky.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { restoreSurfaceDetail } from "../craft/hero-gltf";
import { forEachCrossed, measureGaitContacts } from "../craft/gait-contacts";
import type { GaitContactMarker, GaitContactTrack } from "../craft/gait-contacts";
import { ImpactDust } from "../craft/impact-dust";
import { createTrailTerrain } from "../craft/trail-terrain";
import type { TrailFrame, TrailTerrain } from "../craft/trail-terrain";
import { attachTack } from "../craft/western-tack";
import { LateralHull, MountedRider, ROCKETBOX_BONES } from "../craft/mounted-rider";
import type { HumanoidBones } from "../craft/mounted-rider";
import { RopeMesh, SpringBoneChain, VerletCloth, VerletRope } from "../craft/verlet-cloth";
import { applyHorseCoat, HORSE_BUILT_HEIGHT, HORSE_COAT_PRESETS, horseSize } from "../craft/horse-coat";
import type { HorseCoatHandle, HorseCoatSpec, HorseSizeId } from "../craft/horse-coat";
import { HORSE_TAIL_HAIR } from "../craft/horse-gallop";
import type { VerletWorld } from "../craft/verlet-cloth";
import { ChaseCamera } from "../motion/chase-camera-three";
import type { ChaseFramingId } from "../motion/chase-camera-three";
import { createFootfallAudio, footfallDynamics } from "./footfall-audio";
import type { FootfallAudio } from "./footfall-audio";

export interface GallopGait {
  clip: string;
  strideLength: number;
  strideFrequency: number;
  hooves: Record<string, string>;
  contact: { toe: [number, number, number]; heel: [number, number, number] };
}

export interface GallopSceneOptions {
  canvas: HTMLCanvasElement;
  /** Rigged horse glTF with a looping gallop clip; gait metadata in scene extras `kumikiGait` or here. */
  horseUrl: string;
  gait?: GallopGait;
  /** glTF holding `tack@<bone>` groups and an optional `cowboy-hat`. */
  gearUrl?: string;
  /** Rigged humanoid glTF (Rocketbox bone names by default). */
  riderUrl?: string;
  riderBones?: HumanoidBones;
  /** Recorded takes per category; `hoof` is required for sound. */
  sounds?: { hoof: readonly string[]; scuff?: readonly string[]; breath?: readonly string[] };
  framing?: ChaseFramingId;
  /** Target ground speed (m/s), clamped to the gallop clip's useful range. */
  speed?: number;
  /** Coat preset id (`HORSE_COAT_PRESETS`) or a full coat. Default "bay". */
  coat?: string | HorseCoatSpec;
  /** Size preset or withers height in metres (1.3–1.8). Default "medium" (1.52 m). */
  size?: HorseSizeId | number;
  /** Start with the rider and with the saddle and bridle shown. Default true. */
  rider?: boolean;
  tack?: boolean;
  /** Device pixel ratio cap. */
  pixelRatio?: number;
  seed?: number;
}

export interface GallopSceneStats {
  fps: number;
  frameMs: number;
  drawCalls: number;
  triangles: number;
  speed: number;
  playbackRate: number;
  /** Audio hits scheduled and how many arrived late (scheduled after their time). */
  hits: number;
  lateHits: number;
  /** Worst distance (mm) between a boot's ball and its stirrup tread over the last second. */
  stirrupErrorMm: number;
  /** Worst planted-toe height off the ground and slide from its landing point (mm), over the last second
   * (touchdown to 80% of stance; break-over excluded). */
  hoofGroundErrorMm: number;
  hoofSlideMm: number;
  /** Mean and worst gap (ms) between when a hoofbeat was scheduled to sound and when the frame showing that
   * contact arrived, over the last 32 hits (0 = sound and picture agree). */
  audioSyncMeanMs: number;
  audioSyncWorstMs: number;
  /** Deepest rider leg vertex (lower thigh, knee and calf skin) inside the saddle and barrel, over the last second (mm). */
  riderLegMm: number;
}

const SPEED_RANGE: readonly [number, number] = [8.5, 15.5];

export class GallopScene {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(38, 16 / 9, .1, 12000);
  private composer!: EffectComposer;
  private blurPass!: ShaderPass;
  private chase!: ChaseCamera;
  private terrain!: TrailTerrain;
  private dust!: ImpactDust;
  private audio: FootfallAudio | null = null;
  private audioOn = false;
  private horse!: Object3D;
  private mixer!: AnimationMixer;
  private action!: AnimationAction;
  private clip!: AnimationClip;
  private contacts!: GaitContactTrack;
  private gait!: GallopGait;
  private rider: MountedRider | null = null;
  private reins: Array<{ rope: VerletRope; mesh: RopeMesh; bit: Object3D; object: Mesh }> = [];
  private kerchief: { cloth: VerletCloth; neck: Object3D; offsets: Vector3[]; pins: Map<number, Vector3>; mesh: Mesh } | null = null;
  private stand: AnimationAction | null = null;
  private standClip: AnimationClip | null = null;
  private tail: SpringBoneChain | null = null;
  private coatHandle: HorseCoatHandle | null = null;
  /** The chosen coat; shown without sweat marks while the saddle is off (an unsaddled horse). */
  private coat!: HorseCoatSpec;
  private tackGroups: Object3D[] = [];
  private headBone: Object3D | null = null;
  /** Stirrups and their leathers, with their rest height in the trunk frame (kept at the rider's leg length). */
  private stirrupParts: Array<{ object: Object3D; y: number }> = [];
  private stirrupDrop = 0;
  /** Rider leg vertices for the clearance probe: mesh and vertex index. */
  private legProbe: Array<{ mesh: SkinnedMesh; index: number }> = [];
  /** The barrel and tack round the rider's legs; fenders and skirts count inset by what they can be pressed in. */
  private hull: LateralHull | null = null;
  /** Leg capsules (thigh, calf; near then far) in the tack's frame, pressing the fenders and skirts in. */
  private readonly press = { uLegA: { value: Array.from({ length: 4 }, () => new Vector3(0, -9, 0)) }, uLegB: { value: Array.from({ length: 4 }, () => new Vector3(0, -9, 0)) },
    uLegR: { value: [0, 0, 0, 0] }, uGive: { value: SOFT_GIVE } };
  private pressFrame: Object3D | null = null;
  private running = true; private paused = false; private riderOn = true; private tackOn = true;
  private scaleK = 1; private headK = 1; private gallopWeight = 1; private standTime = 0; private frameCount = 0;
  private sun!: DirectionalLight;
  private readonly sunDir = new Vector3();
  private hemi!: HemisphereLight;
  private readonly world: VerletWorld = { gravity: new Vector3(0, -9.81, 0), wind: new Vector3(), colliders: [] };
  private readonly sockets = new Map<string, Object3D>();
  private hoofBones: Array<{ limb: string; bone: Object3D }> = [];
  /** Planted limbs (from the measured contacts) with where and when each toe landed, for the QA probe. */
  private readonly planted = new Map<string, { at: Vector3; set: boolean; clip: number }>();
  private readonly toe = new Vector3(); private readonly heel = new Vector3();
  // Motion state.
  private distance = 0; private speed = 12; private targetSpeed = 12; private clipTime = 0; private audioScheduledTo = 0;
  private time = 0; private bank = 0;
  private readonly frame: TrailFrame = { position: new Vector3(), forward: new Vector3(), curvature: 0, slope: 0 };
  private readonly heading = new Quaternion(); private readonly velocity = new Vector3(); private readonly tmp = new Vector3(); private readonly tmp2 = new Vector3();
  private readonly qTmp = new Quaternion(); private readonly ndc = new Vector3();
  private raf = 0; private last = 0; private disposed = false;
  private readonly statsState = { fps: 60, frameMs: 16, hits: 0, lateHits: 0, stirrup: 0, hoof: 0, slide: 0, leg: 0, windowStart: 0, stirrupMax: 0, hoofMax: 0, slideMax: 0, legMax: 0 };
  // Sync probe: predicted wall time (ms) of each scheduled contact, matched when the frame showing it arrives.
  private readonly syncPending = Array.from({ length: 32 }, () => ({ key: NaN, at: 0 }));
  private readonly syncErrors = new Float64Array(32);
  private syncCursor = 0; private syncCount = 0;
  private readonly kick = new Vector3(); private readonly up = new Vector3(0, 1, 0);

  private constructor(private readonly options: GallopSceneOptions) {
    this.renderer = new WebGLRenderer({ canvas: options.canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, options.pixelRatio ?? 1.5));
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = .76;
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFShadowMap;
    this.renderer.info.autoReset = false;
    this.targetSpeed = this.speed = clampSpeed(options.speed ?? 12.5);
    this.riderOn = options.rider ?? true; this.tackOn = options.tack ?? true;
  }

  /** Load every asset, measure contacts, decode audio (if given) and build the world. */
  static async create(options: GallopSceneOptions): Promise<GallopScene> {
    const scene = new GallopScene(options);
    await scene.build();
    return scene;
  }

  private async build() {
    const o = this.options, loader = new GLTFLoader();
    const [horseGltf, gearGltf, riderGltf] = await Promise.all([
      loader.loadAsync(o.horseUrl), o.gearUrl ? loader.loadAsync(o.gearUrl) : null, o.riderUrl ? loader.loadAsync(o.riderUrl) : null,
    ]);
    // ---- world: sky, sun, fog, terrain
    const sunDir = new Vector3().setFromSphericalCoords(1, Math.PI / 2 - 10 * Math.PI / 180, 215 * Math.PI / 180);
    const sky = new Sky();
    sky.scale.setScalar(10000);
    sky.material.uniforms.turbidity.value = 5.5; sky.material.uniforms.rayleigh.value = 1.4;
    sky.material.uniforms.mieCoefficient.value = .006; sky.material.uniforms.mieDirectionalG.value = .86;
    sky.material.uniforms.sunPosition.value.copy(sunDir);
    this.scene.add(sky);
    const pmrem = new PMREMGenerator(this.renderer);
    const skyScene = new Scene(); const skyCopy = new Sky(); skyCopy.scale.setScalar(10000);
    skyCopy.material.uniforms.turbidity.value = 5.5; skyCopy.material.uniforms.rayleigh.value = 1.4;
    skyCopy.material.uniforms.mieCoefficient.value = .006; skyCopy.material.uniforms.mieDirectionalG.value = .86;
    skyCopy.material.uniforms.sunPosition.value.copy(sunDir);
    skyScene.add(skyCopy);
    const env = pmrem.fromScene(skyScene, 0, .1, 20000);
    this.scene.environment = env.texture; this.scene.environmentIntensity = .42;
    skyCopy.geometry.dispose(); skyCopy.material.dispose(); pmrem.dispose();
    this.scene.fog = new FogExp2(new Color("#cdb294"), .00032);
    this.sun = new DirectionalLight(new Color("#ffcf98"), 2.7);
    this.sunDir.copy(sunDir);
    this.sun.position.copy(sunDir).multiplyScalar(80);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 200 });
    this.sun.shadow.bias = -.0003; this.sun.shadow.normalBias = .03;
    this.scene.add(this.sun, this.sun.target);
    this.hemi = new HemisphereLight(new Color("#9fb6d6"), new Color("#6a5238"), .32);
    this.scene.add(this.hemi);
    this.terrain = createTrailTerrain({ seed: o.seed ?? 11 });
    this.scene.add(this.terrain.object);

    // ---- horse
    this.horse = horseGltf.scene;
    restoreSurfaceDetail(this.horse);
    this.horse.traverse(n => { if ((n as Mesh).isMesh) { n.castShadow = true; n.receiveShadow = true; n.frustumCulled = false; } });
    // The exporter writes the asset's root node extras; that node sits under the glTF scene.
    let extras: GallopGait | undefined;
    this.horse.traverse(n => { extras ??= n.userData.kumikiGait as GallopGait | undefined; });
    const gait = o.gait ?? extras;
    if (!gait) throw new Error("GallopScene: the horse glTF has no `kumikiGait` extras; pass `gait`.");
    this.gait = gait;
    const clip = horseGltf.animations.find(c => c.name === gait.clip);
    if (!clip) throw new Error(`GallopScene: no clip "${gait.clip}" in the horse glTF.`);
    this.clip = clip;
    this.standClip = horseGltf.animations.find(c => c.name === "stand") ?? null;
    this.flutterHair();
    this.coat = resolveCoat(o.coat);
    this.coatHandle = applyHorseCoat(this.horse, this.coat);
    this.headBone = this.horse.getObjectByName("head") ?? null;
    if (gearGltf) {
      const gear = gearGltf.scene;
      restoreSurfaceDetail(gear);
      gear.traverse(n => { if ((n as Mesh).isMesh) { n.castShadow = true; n.receiveShadow = true; } });
      const hat = gear.getObjectByName("cowboy-hat");
      if (hat) hat.removeFromParent();
      for (const [name, s] of attachTack(this.horse, gear)) this.sockets.set(name, s);
      if (hat) this.sockets.set("hat", hat);
      this.horse.traverse(n => { if (n.name.startsWith("tack@")) this.tackGroups.push(n); });
      // Stirrups hang at the rider's leg length below the seat whatever the horse's size (the leathers are adjusted).
      const seat = this.sockets.get("socket-seat"), stirrup = this.sockets.get("socket-stirrup-near");
      if (seat && stirrup) this.stirrupDrop = seat.position.y - stirrup.position.y;
      this.horse.traverse(n => {
        if (/^(stirrups|stirrup-leathers|socket-stirrup-)/.test(n.name) && n.parent?.name.startsWith("tack@")) this.stirrupParts.push({ object: n, y: n.position.y });
      });
      // The rider's legs keep outside the barrel and tack, measured in the bind pose; the stirrups and their leathers
      // (the boot sits in one, the ankle beside the other) and the loose strings are left out.
      const trunk = this.horse.getObjectByName("trunk"), hide = this.horse.getObjectByName("horse-hide") as Mesh | undefined;
      if (trunk && hide) {
        const parts: Array<Mesh | { mesh: Mesh; give: number }> = [hide], soft: Mesh[] = [];
        for (const g of this.tackGroups) if (g.name === "tack@trunk") g.traverse(n => {
          const mesh = n as Mesh;
          if (!mesh.isMesh || /^(stirrups|stirrup-leathers|saddle-strings)/.test(n.name)) return;
          if (/^saddle-(fenders|skirts)/.test(n.name)) { soft.push(mesh); parts.push({ mesh, give: SOFT_GIVE }); } else parts.push(mesh);
        });
        // The box round the saddle (x −0.5…0.6, y 0.95…1.8 m in the horse's rest frame), in the trunk bone's frame.
        this.horse.updateMatrixWorld(true);
        const o = this.horse.worldToLocal(new Vector3().setFromMatrixPosition(trunk.matrixWorld));
        const min = [-.5 - o.x, .95 - o.y] as const, max = [.6 - o.x, 1.8 - o.y] as const;
        this.hull = LateralHull.fromMeshes(trunk, parts, min, max);
        this.pressLeather(soft);
      }
    }
    // Contacts from the clip itself, before anything animates.
    const limbs = Object.fromEntries(Object.entries(gait.hooves).map(([limb, bone]) => [limb, { bone, points: [gait.contact.toe, gait.contact.heel] }]));
    this.contacts = measureGaitContacts(this.horse, clip, limbs);
    this.hoofBones = Object.entries(gait.hooves).map(([limb, bone]) => ({ limb, bone: this.horse.getObjectByName(bone)! }));
    this.mixer = new AnimationMixer(this.horse);
    this.action = this.mixer.clipAction(clip);
    this.action.play();
    if (this.standClip) { this.stand = this.mixer.clipAction(this.standClip); this.stand.play(); this.stand.setEffectiveWeight(0); }
    this.scene.add(this.horse);
    // Tail hair on springs: drag in the airflow, gravity, the wake behind the rump; kept off the buttocks.
    const tailBones = HORSE_TAIL_HAIR.map(name => this.horse.getObjectByName(name)).filter((b): b is Object3D => !!b);
    const pelvis = this.horse.getObjectByName("pelvis");
    if (tailBones.length === HORSE_TAIL_HAIR.length && pelvis) {
      this.tail = new SpringBoneChain(this.horse, tailBones, {
        stiffness: 5, drag: .045, air: 2.2, turbulence: .07, radius: .05, maxBend: .5, tipOffset: new Vector3(-.01, -.17, 0),
        colliders: [-1, 1].map(z => ({ object: pelvis, offset: new Vector3(-.5, -.25, .1 * z), radius: .15 })),
      });
    }

    // ---- rider
    if (riderGltf) {
      const rider = riderGltf.scene;
      restoreSurfaceDetail(rider);
      rider.traverse(n => { if ((n as Mesh).isMesh) { n.castShadow = true; n.receiveShadow = true; n.frustumCulled = false; } });
      this.scene.add(rider);
      const seat = this.sockets.get("socket-seat"), near = this.sockets.get("socket-stirrup-near"), far = this.sockets.get("socket-stirrup-far"), horn = this.sockets.get("socket-horn");
      if (!seat || !near || !far || !horn) throw new Error("GallopScene: the rider needs the gear's seat, stirrup and horn sockets.");
      const bones = o.riderBones ?? ROCKETBOX_BONES;
      this.rider = new MountedRider(rider, bones, { seat, stirrups: [near, far], horn }, { hull: this.hull ?? undefined });
      this.legProbe = legVertices(rider, bones);
      this.dressRider(rider);
    }
    this.buildReins();
    this.setSize(o.size ?? "medium");
    this.setTackVisible(this.tackOn);
    this.setRiderVisible(this.riderOn);

    // ---- effects, camera, post
    this.dust = new ImpactDust({ dustColor: "#d2bc9c", clodColor: "#6b543a", density: .55 });
    this.scene.add(this.dust.object);
    this.chase = new ChaseCamera(this.camera, { framing: o.framing ?? "chase", referenceSpeed: 12 });
    this.chase.subjectScale = this.scaleK;
    this.composer = new EffectComposer(this.renderer, new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: 4 }));
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.blurPass = new ShaderPass(SPEED_BLUR);
    this.composer.addPass(this.blurPass);
    this.composer.addPass(new OutputPass());
    if (o.sounds?.hoof.length) {
      this.audio = await createFootfallAudio({ bank: { hoof: o.sounds.hoof, scuff: o.sounds.scuff ?? [], breath: o.sounds.breath ?? [] }, volume: .85 });
    }
    this.resize();
    this.placeHorse(0);
  }

  /** Mane and tail strands ripple in the wind of the gallop (on top of the clip's bone motion). */
  private flutterHair() {
    const flutter = { uTime: { value: 0 }, uSpeed: { value: 0 } };
    this.horse.traverse(n => {
      const mesh = n as SkinnedMesh;
      if (!mesh.isMesh) return;
      const material = mesh.material as MeshStandardMaterial;
      if (material.name !== "horse-hair" || !mesh.geometry.getAttribute("_hair")) return;
      material.side = DoubleSide;
      // glTF keeps the alpha cutoff (MASK) but not alpha-to-coverage, which smooths strand edges under MSAA.
      material.alphaToCoverage = true;
      material.onBeforeCompile = shader => {
        shader.uniforms.uTime = flutter.uTime; shader.uniforms.uSpeed = flutter.uSpeed;
        shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nattribute float _hair; uniform float uTime; uniform float uSpeed;")
          .replace("#include <skinning_vertex>", `#include <skinning_vertex>
float kmT = _hair * _hair, kmP = position.x * 9.0 + position.y * 7.0 + position.z * 13.0;
transformed += vec3(-0.35 * kmT * uSpeed * 0.02, sin(uTime * 19.0 + kmP) * kmT * 0.03 * uSpeed / 12.0, cos(uTime * 23.0 + kmP * 1.3) * kmT * 0.035 * uSpeed / 12.0);`);
      };
      material.needsUpdate = true;
    });
    this.hairFlutter = flutter;
  }
  private hairFlutter: { uTime: { value: number }; uSpeed: { value: number } } | null = null;

  /**
   * Fenders and skirts hang a few centimetres off the barrel; a rider's leg presses them in. Each vertex moves toward
   * the horse by as much as a leg capsule overlaps it, up to `SOFT_GIVE` (the gap to the hide).
   */
  private pressLeather(meshes: readonly Mesh[]) {
    this.pressFrame = meshes[0] ?? null;
    const done = new Set<unknown>();
    for (const mesh of meshes) for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      if (done.has(material)) continue;
      done.add(material);
      const previous = material.onBeforeCompile;
      material.onBeforeCompile = (shader, renderer) => {
        previous.call(material, shader, renderer);
        Object.assign(shader.uniforms, this.press);
        shader.vertexShader = shader.vertexShader
          .replace("#include <common>", "#include <common>\nuniform vec3 uLegA[4]; uniform vec3 uLegB[4]; uniform float uLegR[4]; uniform float uGive;")
          .replace("#include <begin_vertex>", `#include <begin_vertex>
{
  float kmPush = 0.0;
  for (int i = 0; i < 4; i++) {
    vec3 a = uLegA[i], ab = uLegB[i] - a;
    vec3 c = a + ab * clamp(dot(transformed - a, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
    vec2 q = transformed.xy - c.xy;
    float r2 = uLegR[i] * uLegR[i] - dot(q, q);
    // Only the leg on this side, and only leather inside its inner surface.
    if (r2 > 0.0 && c.z * transformed.z > 0.0) kmPush = max(kmPush, abs(transformed.z) - (abs(c.z) - sqrt(r2)) + .004);
  }
  transformed.z -= sign(transformed.z) * clamp(kmPush, 0.0, uGive);
}`);
      };
      const key = material.customProgramCacheKey.bind(material);
      material.customProgramCacheKey = () => key() + "|leg-press";
      material.needsUpdate = true;
    }
  }

  /** Move the leg capsules into the tack's frame (after the rider is posed). */
  private updatePress() {
    const frame = this.pressFrame, rider = this.rider;
    if (!frame || !rider) return;
    frame.updateWorldMatrix(true, false);
    this.probeInv.copy(frame.matrixWorld).invert();
    const unit = 1 / frame.matrixWorld.getMaxScaleOnAxis(), [rThigh, , rCalf] = rider.legRadius, { uLegA, uLegB, uLegR } = this.press;
    for (let side = 0 as 0 | 1, i = 0; side < 2; side = (side + 1) as 0 | 1) {
      const [hip, knee, ankle] = rider.legJoints(side);
      for (const [a, b, r] of [[hip, knee, rThigh], [knee, ankle, rCalf]] as const) {
        uLegA.value[i].copy(a).applyMatrix4(this.probeInv); uLegB.value[i].copy(b).applyMatrix4(this.probeInv); uLegR.value[i] = this.riderOn ? r * unit : 0;
        i++;
      }
    }
  }

  /** Hat on the head bone and a neckerchief that flaps in the wind. */
  private dressRider(rider: Object3D) {
    if (!this.rider) return;
    rider.updateMatrixWorld(true);
    const head = this.rider.head, neck = this.rider.neck;
    const hat = this.sockets.get("hat");
    if (hat) {
      // Rocketbox: the head bone sits at the top of the neck; the crown of the head is ~20 cm above it.
      const headPos = new Vector3().setFromMatrixPosition(head.matrixWorld), rootQ = rider.getWorldQuaternion(new Quaternion());
      hat.position.copy(headPos).add(new Vector3(0, .155, .012).applyQuaternion(rootQ));
      hat.quaternion.copy(rootQ).multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -.08));
      hat.scale.setScalar(1);
      this.scene.add(hat); hat.updateMatrixWorld(true);
      head.attach(hat);
    }
    // Neckerchief: a 5 × 5 cloth pinned round the front of the neck.
    const neckPos = new Vector3().setFromMatrixPosition(neck.matrixWorld), rootQ = rider.getWorldQuaternion(new Quaternion());
    const origin = neckPos.clone().add(new Vector3(-.075, .02, .07).applyQuaternion(rootQ));
    const cloth = new VerletCloth(5, 5, origin, new Vector3(.15, 0, 0).applyQuaternion(rootQ), new Vector3(0, -.14, .02).applyQuaternion(rootQ), .04);
    const mat = new MeshStandardMaterial({ color: "#8d1d1a", roughness: .85, side: DoubleSide });
    mat.name = "neckerchief";
    const mesh = new Mesh(cloth.geometry, mat); mesh.frustumCulled = false; mesh.castShadow = true;
    this.scene.add(mesh);
    // Pins: the top row follows the neck, expressed in the neck bone's frame.
    neck.updateMatrixWorld(true);
    const inv = neck.matrixWorld.clone().invert(), offsets: Vector3[] = [], pins = new Map<number, Vector3>();
    for (let c = 0; c < 5; c++) {
      const p = origin.clone().add(new Vector3(.15 * c / 4, 0, Math.sin(c / 4 * Math.PI) * .03).applyQuaternion(rootQ));
      offsets.push(p.applyMatrix4(inv)); pins.set(c, new Vector3());
    }
    this.kerchief = { cloth, neck, offsets, pins, mesh };
  }

  /** Reins: two split reins (1.3 m each) from the bit rings to the rider's fists, or tied at the horn without a rider. */
  private buildReins() {
    const mat = new MeshStandardMaterial({ color: "#3a2416", roughness: .6 });
    mat.name = "reins";
    for (const side of ["near", "far"] as const) {
      const bit = this.sockets.get(`socket-bit-${side}`);
      if (!bit) continue;
      bit.updateWorldMatrix(true, false);
      const start = new Vector3().setFromMatrixPosition(bit.matrixWorld);
      const rope = new VerletRope(18, .072, start, new Vector3(-1, -.2, 0).normalize(), .03, 10);
      const mesh = new RopeMesh(rope, .006, 5);
      const m = new Mesh(mesh.geometry, mat); m.frustumCulled = false; m.castShadow = true;
      this.scene.add(m);
      this.reins.push({ rope, mesh, bit, object: m });
    }
  }

  setSpeed(metresPerSecond: number) { this.targetSpeed = clampSpeed(metresPerSecond); }
  setFraming(framing: ChaseFramingId, cut = true) { this.chase.setFraming(framing, cut); }
  /** Gallop (true) or pull up to a halt and stand (false). */
  setRunning(on: boolean) { this.running = on; }
  /** Freeze the world (the camera can still be moved). */
  setPaused(on: boolean) { this.paused = on; }
  /** Turn the view round the horse (radians) and zoom (factor); `resetView` returns to the framing. */
  orbit(yaw: number, pitch: number) { this.chase.orbit(yaw, pitch); }
  zoom(factor: number) { this.chase.zoom(factor); }
  resetView() { this.chase.resetView(); }
  /** Show or hide the rider (hat and neckerchief included); without a rider the reins are tied at the horn. */
  setRiderVisible(on: boolean) {
    this.riderOn = on && this.tackOn && !!this.rider;
    if (this.rider) this.rider.root.visible = this.riderOn;
    if (this.kerchief) this.kerchief.mesh.visible = this.riderOn;
  }
  /** Show or hide the saddle and bridle (and reins). A rider needs the saddle, so it goes too. */
  setTackVisible(on: boolean) {
    this.tackOn = on;
    for (const g of this.tackGroups) g.visible = on;
    for (const r of this.reins) r.object.visible = on;
    if (!on) this.setRiderVisible(false);
    this.coatHandle?.set(on ? this.coat : { ...this.coat, sweat: 0 });
  }
  /** Change the coat (a preset id or a full coat); uniforms only, no recompile. */
  setCoat(coat: string | HorseCoatSpec) {
    this.coat = resolveCoat(coat);
    this.coatHandle?.set(this.tackOn ? this.coat : { ...this.coat, sweat: 0 });
  }
  /** Size by preset or withers height (m): the horse grows (less across than up and along), its stride lengthens,
   * its hoofbeats deepen; the stirrups stay at the rider's leg length. */
  setSize(size: HorseSizeId | number) {
    const { scale, widthScale, headScale } = horseSize(size);
    this.scaleK = scale; this.headK = headScale;
    this.horse.scale.set(scale, scale, widthScale);
    this.fitStirrups();
    if (this.chase) this.chase.subjectScale = scale;
    this.tail?.reset();
    // Stances that began at the old size do not count for the slide probe.
    this.planted.clear();
  }

  /**
   * Adjust the stirrup leathers for this horse, as a rider does: keep the stirrups the same distance below the seat in
   * metres, then shorten the leathers (0–12 cm) until the legs lie outside the barrel, skirts and fenders through a
   * whole stride (the knee needs more bend round a bigger barrel). Poses six phases of the clip and restores it.
   */
  private fitStirrups() {
    const place = (raise: number) => {
      for (const p of this.stirrupParts) p.object.position.y = p.y + this.stirrupDrop * (1 - 1 / this.scaleK) + raise / this.scaleK;
    };
    place(0);
    if (!this.rider || !this.hull) return;
    const saved = this.action.time;
    let best = 0, bestDepth = Infinity;
    for (let raise = 0; raise <= .12 + 1e-6; raise += .02) {
      place(raise);
      let depth = 0;
      for (let k = 0; k < 6; k++) {
        this.action.time = this.clip.duration * k / 6;
        this.mixer.update(0);
        this.horse.updateMatrixWorld(true);
        this.rider.update(0, this.heading, this.speed);
        depth = Math.max(depth, this.rider.legDepth);
      }
      if (depth < bestDepth - .002) { best = raise; bestDepth = depth; }
      if (depth < .004) break;
    }
    place(best);
    this.action.time = saved;
    this.mixer.update(0);
  }
  get state() {
    return { running: this.running, paused: this.paused, rider: this.riderOn, tack: this.tackOn, coat: this.coat.id, height: this.scaleK * HORSE_BUILT_HEIGHT };
  }
  /** Turn sound on or off; the first call must come from a user gesture (browser autoplay rules). */
  async setAudio(on: boolean) {
    this.audioOn = on && !!this.audio;
    if (this.audio) { if (on) await this.audio.resume(); this.audio.setVolume(on ? .85 : 0); }
    this.audioScheduledTo = this.clipTime;
  }
  get hasAudio() { return !!this.audio; }
  get speedRange() { return SPEED_RANGE; }

  resize() {
    const canvas = this.renderer.domElement, w = canvas.clientWidth || 1280, h = canvas.clientHeight || 720;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }

  start() {
    if (this.raf) return;
    this.last = performance.now();
    const loop = (now: number) => {
      if (this.disposed) return;
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min(.1, (now - this.last) / 1000); this.last = now;
      this.step(dt, now);
    };
    this.raf = requestAnimationFrame(loop);
  }
  stop() { cancelAnimationFrame(this.raf); this.raf = 0; }

  /** Advance by `dt` seconds and render. Deterministic for a given sequence of dt (audio aside). */
  step(dt: number, now = performance.now()) {
    const t0 = performance.now();
    this.update(dt, now);
    this.render(dt);
    const s = this.statsState, ms = performance.now() - t0;
    s.frameMs += (ms - s.frameMs) * .05;
    if (dt > 0) s.fps += (1 / dt - s.fps) * .05;
  }

  /** Advance the simulation by `dt` seconds without drawing (capture and export step this, then `render`). */
  update(cameraDt: number, now = performance.now()) {
    const dt = this.paused ? 0 : cameraDt;
    this.time += dt; this.frameCount++;
    // Ease toward the target speed: a horse gains about 3 m/s each second and can pull up at about 5 m/s².
    const target = this.running ? this.targetSpeed : 0, ds = target - this.speed;
    this.speed += Math.sign(ds) * Math.min(Math.abs(ds), (ds < 0 && !this.running ? 5 : 3) * dt);
    // The gallop clip fades into the standing clip below about 7 m/s (no trot or walk clip yet).
    this.gallopWeight = this.stand ? smooth01((this.speed - 1.5) / 5.5) : 1;
    const v0 = this.gait.strideLength * this.scaleK * this.gait.strideFrequency, rate = this.speed / v0;
    const clipSpeed = rate * this.clip.duration * this.gait.strideFrequency; // clip seconds per real second
    const prevClip = this.clipTime;
    this.clipTime += dt * clipSpeed;
    this.action.time = this.clipTime % this.clip.duration;
    if (this.stand && this.standClip) {
      this.standTime += dt;
      this.stand.time = this.standTime % this.standClip.duration;
      this.action.setEffectiveWeight(this.gallopWeight); this.stand.setEffectiveWeight(1 - this.gallopWeight);
    }
    this.mixer.update(0);
    // Ponies carry relatively bigger heads; big horses a little smaller.
    this.headBone?.scale.setScalar(this.headK);
    this.distance += this.speed * dt;
    this.placeHorse(dt);
    this.horse.updateMatrixWorld(true);
    this.tail?.update(dt, this.world.wind, this.world.gravity);

    // Visual contacts that happened during this frame: dust and camera trauma (only while the gallop carries the legs).
    this.clipSpeed = clipSpeed; this.frameNow = now;
    if (this.gallopWeight < 1) this.planted.clear();
    if (this.gallopWeight > .35) forEachCrossed(this.contacts, prevClip, this.clipTime, this.visitVisual);
    // Audio: schedule contacts due in the next two frames on the audio clock.
    if (this.audio && this.audioOn && this.gallopWeight > .35 && clipSpeed > 0) {
      this.ahead = this.clipTime + Math.max(dt, 1 / 60) * 2 * clipSpeed;
      forEachCrossed(this.contacts, Math.max(this.audioScheduledTo, this.clipTime), this.ahead, this.visitAudio);
      this.audioScheduledTo = this.ahead;
      this.audio.setAirRush(Math.min(1, this.speed / 15));
    }

    // Rider, reins, cloth.
    if (this.rider && this.riderOn) this.rider.update(dt, this.heading, this.speed);
    this.updatePress();
    this.updateSecondary(dt);
    if (dt > 0) this.measure();

    // Camera (on the real clock, so it can be moved while the world is paused), light, effects.
    this.chase.update(cameraDt, { position: this.frame.position, quaternion: this.heading, velocity: this.velocity });
    const floor = this.terrain.groundHeight(this.camera.position.x, this.camera.position.z) + .15;
    if (this.camera.position.y < floor) this.camera.position.y = floor;
    this.sun.target.position.copy(this.frame.position);
    this.sun.position.copy(this.frame.position).addScaledVector(this.sunDir, 80);
    this.dust.update(this.time, this.sunDir, this.sun.color);
    this.terrain.update(this.time);
    if (this.hairFlutter) { this.hairFlutter.uTime.value = this.time; this.hairFlutter.uSpeed.value = this.speed; }
  }

  /** Draw the current state. */
  render(dt = 1 / 60) {
    this.blurPass.uniforms.uStrength.value = .006 + .018 * this.chase.speedPunch;
    this.renderer.info.reset();
    this.composer.render(dt);
  }

  private clipSpeed = 1; private frameNow = 0; private ahead = 0;
  private readonly visitVisual = (marker: GaitContactMarker, since: number) => {
    this.onContact(marker, since / this.clipSpeed);
    if (marker.kind !== "land") return;
    // When this contact happened on the wall clock (shown on the next presented frame).
    const key = Math.round((this.clipTime - since) * 1e4), seen = this.frameNow - since / this.clipSpeed * 1000;
    for (const p of this.syncPending) if (p.key === key) {
      this.syncErrors[this.syncCount++ % 32] = Math.abs(p.at - seen); p.key = NaN;
    }
  };
  // A marker `sinceToAhead` before the lookahead edge is due (ahead − since − clipTime) clip seconds after this frame.
  private readonly visitAudio = (marker: GaitContactMarker, sinceToAhead: number) => {
    const dueIn = (this.ahead - sinceToAhead - this.clipTime) / this.clipSpeed;
    if (marker.kind === "land") {
      const slot = this.syncPending[this.syncCursor++ % 32];
      slot.key = Math.round((this.ahead - sinceToAhead) * 1e4); slot.at = this.frameNow + dueIn * 1000;
    }
    this.scheduleHit(marker, dueIn, this.frameNow);
  };

  /** Put the horse on the trail at the current distance: heading, slope pitch and a lean into turns. */
  private placeHorse(dt: number) {
    const f = this.terrain.trailFrame(this.distance, this.frame);
    const yaw = Math.atan2(-f.forward.z, f.forward.x);
    // Lean into the turn: tan(lean) = v²κ/g, softened, smoothed.
    const want = Math.max(-.32, Math.min(.32, Math.atan(this.speed * this.speed * f.curvature / 9.81) * .7));
    this.bank += (want - this.bank) * (1 - Math.exp(-dt * 4));
    this.heading.setFromAxisAngle(this.up, yaw);
    // Fit pitch and height to the ground under the fore and hind stance points (about 0.45 m ahead of and 0.85 m
    // behind the root), so planted hooves meet the ground at both ends on a slope.
    const fx = f.position.x, fz = f.position.z, dx = f.forward.x, dz = f.forward.z, k = this.scaleK;
    const gFore = this.terrain.groundHeight(fx + dx * .45 * k, fz + dz * .45 * k), gHind = this.terrain.groundHeight(fx - dx * .85 * k, fz - dz * .85 * k);
    this.horse.position.set(fx, gHind + (gFore - gHind) * (.85 / 1.3), fz);
    this.horse.quaternion.copy(this.heading)
      .multiply(this.qTmp.setFromAxisAngle(this.tmp.set(0, 0, 1), Math.atan2(gFore - gHind, 1.3 * k)))
      .multiply(this.qTmp.setFromAxisAngle(this.tmp.set(1, 0, 0), -this.bank));
    this.velocity.copy(f.forward).multiplyScalar(this.speed);
    this.world.wind.copy(this.velocity).multiplyScalar(-1).add(this.tmp2.set(-1.5, 0, .8));
  }

  private onContact(marker: GaitContactMarker, ago: number) {
    if (marker.kind === "lift") this.planted.delete(marker.limb);
    const hoof = this.hoofBones.find(h => h.limb === marker.limb);
    if (!hoof) return;
    const p = this.toe.set(...this.gait.contact.toe).applyMatrix4(hoof.bone.matrixWorld);
    const ground = this.terrain.groundHeight(p.x, p.z);
    // The marker fires within 6 mm of the ground, a few ms before the hoof stops: the probe anchors a frame later.
    if (marker.kind === "land") { const e = this.planted.get(marker.limb); if (e) { e.set = false; e.clip = this.clipTime - ago * this.clipSpeed; } else this.planted.set(marker.limb, { at: new Vector3(), set: false, clip: this.clipTime - ago * this.clipSpeed }); }
    const k = this.speed / 12 * this.gallopWeight * this.scaleK, fore = marker.limb.startsWith("fore"), leading = marker.limb.endsWith("near");
    const back = this.kick.copy(this.frame.forward).multiplyScalar(-1);
    if (marker.kind === "land") {
      this.dust.emit({ position: p, time: this.time - ago, kick: back.multiplyScalar(.5).addScaledVector(this.up, .2).normalize(), speed: 1.6 * k, intensity: (fore ? .55 : .45) * k, groundY: ground });
      this.chase.addTrauma((fore && leading ? .16 : .1) * k);
    } else {
      // Push-off: the toe throws earth back and up; most of a gallop's dust comes from here.
      this.dust.emit({ position: p, time: this.time - ago, kick: back.multiplyScalar(.82).addScaledVector(this.up, .55).normalize(), speed: 4.2 * k, intensity: 1.0 * k, groundY: ground });
    }
  }

  /** Schedule a hoof sound `dueIn` seconds after this frame's pose, on the audio clock at presentation time. */
  private scheduleHit(marker: GaitContactMarker, dueIn: number, frameNow: number) {
    const audio = this.audio!, ctx = audio.context;
    // Map the frame's timestamp to the audio clock, then add one frame of display latency.
    const ts = ctx.getOutputTimestamp?.();
    const display = 1000 / 60;
    let when: number;
    if (ts && ts.contextTime !== undefined && ts.performanceTime !== undefined && ts.performanceTime > 0) {
      when = ts.contextTime + (frameNow + display - ts.performanceTime) / 1000 + dueIn;
    } else when = ctx.currentTime + dueIn + display / 1000 - (ctx.outputLatency || ctx.baseLatency || 0);
    const dyn = footfallDynamics(this.speed, 12);
    // A heavier horse strikes louder and lower (pitch about 1/√size).
    const gain = dyn.gain * this.gallopWeight * this.scaleK, rate = dyn.rate / Math.sqrt(this.scaleK);
    const hoof = this.hoofBones.find(h => h.limb === marker.limb)!;
    this.ndc.setFromMatrixPosition(hoof.bone.matrixWorld).project(this.camera);
    const pan = Math.max(-1, Math.min(1, this.ndc.x * .7));
    const fore = marker.limb.startsWith("fore"), leading = marker.limb.endsWith("near");
    const s = this.statsState;
    if (marker.kind === "land") {
      s.hits++; if (when < ctx.currentTime) s.lateHits++;
      audio.play({ category: "hoof", when, gain: gain * (fore ? (leading ? 1 : .9) : .8), rate: rate * (fore ? 1.02 : .97), pan });
      // A galloping horse breathes once per stride, blowing out as the leading fore lands.
      if (fore && leading) audio.play({ category: "breath", when: when + .02, gain: .32 * gain, rate: 1, pan: pan * .5, pitchJitter: .03 });
    } else if (!fore) {
      audio.play({ category: "scuff", when, gain: .22 * gain, rate, pan, gainJitter: .3 });
    }
  }

  private readonly pinTmp = new Vector3();
  private updateSecondary(dt: number) {
    if (this.kerchief) {
      const k = this.kerchief;
      k.neck.updateWorldMatrix(true, false);
      k.offsets.forEach((o, i) => k.pins.get(i)!.copy(o).applyMatrix4(k.neck.matrixWorld));
      k.cloth.update(dt, this.world, k.pins, .05);
    }
    if (!this.tackOn || dt <= 0) return;
    const horn = this.sockets.get("socket-horn");
    this.reins.forEach((r, side) => {
      r.bit.updateWorldMatrix(true, false);
      const a = this.pinTmp.setFromMatrixPosition(r.bit.matrixWorld);
      if (this.rider && this.riderOn) r.rope.update(dt, this.world, a, this.rider.handPosition(side === 0 ? 0 : 1, this.tmp2), .006);
      else if (horn) {
        // Tied off at the horn, one rein each side of it.
        horn.updateWorldMatrix(true, false);
        r.rope.update(dt, this.world, a, this.tmp2.set(0, -.04, side === 0 ? -.03 : .03).applyMatrix4(horn.matrixWorld), .006);
      } else r.rope.update(dt, this.world, a, undefined, .01);
      r.mesh.update();
    });
  }

  /** QA probes: boot-to-tread distance, rider legs inside the saddle and stance-hoof height, worst over the last second. */
  private measure() {
    const s = this.statsState;
    if (this.rider && this.riderOn) for (let side = 0 as 0 | 1; side < 2; side = (side + 1) as 0 | 1) {
      const tread = this.sockets.get(side === 0 ? "socket-stirrup-near" : "socket-stirrup-far")!;
      const d = this.rider.ballPosition(side, this.toe).distanceTo(this.heel.setFromMatrixPosition(tread.matrixWorld));
      s.stirrupMax = Math.max(s.stirrupMax, d * 1000);
    }
    // Every sixth frame: skin the probed leg vertices on the CPU and find the deepest one inside the horse and tack
    // (fenders and skirts beyond what that leather can give).
    if (this.hull && this.riderOn && this.frameCount % 6 === 0) {
      const frame = this.hull.frame, unit = 1 / frame.matrixWorld.getMaxScaleOnAxis();
      this.probeInv.copy(frame.matrixWorld).invert();
      for (const { mesh, index } of this.legProbe) {
        mesh.getVertexPosition(index, this.toe).applyMatrix4(mesh.matrixWorld).applyMatrix4(this.probeInv);
        s.legMax = Math.max(s.legMax, this.hull.depth(this.toe, 0) / unit * 1000);
      }
    }
    // Planted toes from touchdown through 80% of their measured stance: height above the ground and slide from
    // where they landed (the last fifth is break-over, when the toe pivots before lifting).
    for (const { limb, bone } of this.hoofBones) {
      const plant = this.planted.get(limb);
      if (!plant || this.clipTime - plant.clip > .8 * this.contacts.duty[limb] * this.clip.duration) continue;
      this.toe.set(...this.gait.contact.toe).applyMatrix4(bone.matrixWorld);
      const gap = this.toe.y - this.terrain.groundHeight(this.toe.x, this.toe.z);
      // Anchor on the first frame after touchdown (never skip a stance: a hoof that floats must show as height).
      if (!plant.set) { plant.at.copy(this.toe); plant.set = true; }
      s.hoofMax = Math.max(s.hoofMax, Math.abs(gap) * 1000);
      s.slideMax = Math.max(s.slideMax, Math.hypot(this.toe.x - plant.at.x, this.toe.z - plant.at.z) * 1000);
    }
    if (this.time - s.windowStart > 1) {
      s.stirrup = s.stirrupMax; s.hoof = s.hoofMax; s.slide = s.slideMax; s.leg = Math.max(0, s.legMax);
      s.stirrupMax = 0; s.hoofMax = 0; s.slideMax = 0; s.legMax = 0; s.windowStart = this.time;
    }
  }
  private readonly probeInv = new Matrix4();

  stats(): GallopSceneStats {
    const s = this.statsState, info = this.renderer.info.render;
    return { fps: s.fps, frameMs: s.frameMs, drawCalls: info.calls, triangles: info.triangles, speed: this.speed, playbackRate: this.speed / (this.gait.strideLength * this.scaleK * this.gait.strideFrequency),
      hits: s.hits, lateHits: s.lateHits, stirrupErrorMm: s.stirrup, hoofGroundErrorMm: s.hoof, hoofSlideMm: s.slide, riderLegMm: s.leg, ...this.syncSummary() };
  }

  private syncSummary() {
    const n = Math.min(32, this.syncCount);
    let sum = 0, worst = 0;
    for (let i = 0; i < n; i++) { sum += this.syncErrors[i]; worst = Math.max(worst, this.syncErrors[i]); }
    return { audioSyncMeanMs: n ? sum / n : 0, audioSyncWorstMs: worst };
  }

  dispose() {
    this.disposed = true; this.stop();
    this.audio?.dispose();
    this.dust.dispose(); this.terrain.dispose();
    this.scene.traverse(n => {
      const mesh = n as Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.dispose();
      for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) m.dispose();
    });
    this.scene.environment?.dispose();
    this.composer.dispose();
    this.renderer.dispose();
  }
}

const clampSpeed = (v: number) => Math.max(SPEED_RANGE[0], Math.min(SPEED_RANGE[1], v));
/** How far fenders and skirts can be pressed in toward the barrel (m): the gap between the hanging fender and the hide. */
const SOFT_GIVE = .045;
const smooth01 = (t: number) => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };
const resolveCoat = (coat: string | HorseCoatSpec | undefined): HorseCoatSpec => {
  if (typeof coat === "object") return coat;
  const preset = HORSE_COAT_PRESETS[coat ?? "bay"];
  if (!preset) throw new Error(`GallopScene: unknown coat "${coat}". Use one of: ${Object.keys(HORSE_COAT_PRESETS).join(", ")}.`);
  return preset;
};

/**
 * Rider skin vertices to probe for clearance: those that follow the lower third of a thigh (above it the inner thigh
 * rests on the seat) or a calf (above the boot in the stirrup), at most 600 per mesh. Read in the bind pose.
 */
function legVertices(rider: Object3D, bones: HumanoidBones): Array<{ mesh: SkinnedMesh; index: number }> {
  const out: Array<{ mesh: SkinnedMesh; index: number }> = [], p = new Vector3(), a = new Vector3(), b = new Vector3();
  rider.updateMatrixWorld(true);
  // glTF primitives of one mesh often share one vertex buffer: probe each buffer once.
  const seen = new Set<unknown>();
  rider.traverse(node => {
    const mesh = node as SkinnedMesh;
    if (!mesh.isSkinnedMesh || seen.has(mesh.geometry.getAttribute("position"))) return;
    seen.add(mesh.geometry.getAttribute("position"));
    const si = mesh.geometry.getAttribute("skinIndex"), sw = mesh.geometry.getAttribute("skinWeight"), names = mesh.skeleton.bones.map(x => x.name);
    const legs = [...bones.thigh, ...bones.calf].map(n => names.indexOf(n));
    const picked: number[] = [];
    for (let v = 0; v < si.count; v++) {
      let best = 0, bone = -1;
      for (let k = 0; k < 4; k++) if (sw.getComponent(v, k) > best) { best = sw.getComponent(v, k); bone = si.getComponent(v, k); }
      const leg = legs.indexOf(bone);
      if (best < .6 || leg < 0) continue;
      const joint = mesh.skeleton.bones[bone], child = joint.children.find(c => (c as { isBone?: boolean }).isBone);
      if (!child) continue;
      a.setFromMatrixPosition(joint.matrixWorld); b.setFromMatrixPosition(child.matrixWorld);
      mesh.getVertexPosition(v, p).applyMatrix4(mesh.matrixWorld);
      const t = p.sub(a).dot(b.sub(a)) / b.lengthSq();
      if (leg < 2 ? t >= .7 : t <= .8) picked.push(v);
    }
    const step = Math.max(1, Math.ceil(picked.length / 600));
    for (let i = 0; i < picked.length; i += step) out.push({ mesh, index: picked[i] });
  });
  return out;
}

/** Radial speed blur toward the frame centre, plus a soft vignette. Linear HDR in, linear out. */
const SPEED_BLUR = {
  uniforms: { tDiffuse: { value: null }, uStrength: { value: .01 }, uCenter: { value: new Vector2(.5, .52) } },
  vertexShader: /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
uniform sampler2D tDiffuse; uniform float uStrength; uniform vec2 uCenter; varying vec2 vUv;
void main() {
  vec2 d = vUv - uCenter; float r = length(d);
  // Blur grows toward the edges (the centre, where the subject is, stays sharp).
  float amount = uStrength * smoothstep(0.12, 0.7, r);
  vec4 sum = vec4(0.0);
  for (int i = 0; i < 10; i++) sum += texture2D(tDiffuse, vUv - d * amount * (float(i) / 9.0));
  vec4 col = sum / 10.0;
  col.rgb *= 1.0 - 0.28 * smoothstep(0.45, 0.95, r);
  gl_FragColor = vec4(col.rgb, 1.0);
}`,
};
