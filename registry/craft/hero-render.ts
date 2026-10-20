/** Final-quality rendering for crafted 3D: AO, depth of field, bloom, supersampling and motion blur.
 *
 * Pipeline (all linear HDR until the last step):
 *   scene → GTAO (contact/cavity occlusion) → Bokeh DOF (focused on the subject)
 *   → Unreal bloom (only bright emissives: screens, LEDs, lanterns)
 *   → accumulate N jittered sub-samples → tone mapping + sRGB output.
 * Accumulation gives both anti-aliasing (sub-pixel camera jitter) and, when
 * `motionBlur` is set, physically plausible motion blur: each sample is posed
 * at a sub-frame time inside the shutter interval. Deterministic: the jitter
 * pattern is fixed (R2 sequence), so the same frame renders identically.
 *
 * Uses only Three.js addons that ship with the pinned `three` package.
 */
import {
  CustomBlending, HalfFloatType, OneFactor, AddEquation, Mesh, NoBlending, OrthographicCamera, PlaneGeometry, ShaderMaterial, Vector2, WebGLRenderTarget,
} from "three";
import type { OrthographicCamera as Ortho, PerspectiveCamera, Scene, WebGLRenderer } from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

export type RenderQuality = "preview" | "final";

export interface HeroRenderOptions {
  /** "preview": single sample, light AO. "final": stronger AO + 8× supersampling. DOF and bloom are opt-in for both. */
  quality?: RenderQuality;
  /** Ambient occlusion strength 0–1 (default .7 final / .5 preview; 0 disables). */
  ambientOcclusion?: number;
  /** Depth of field (opt-in). Focus defaults to the camera target distance; set focusDistance for off-center subjects. */
  depthOfField?: { focusDistance?: number; aperture?: number; maxBlur?: number } | false;
  /** Bloom (opt-in) for emissive highlights; the default threshold ignores ordinary speculars. */
  bloom?: { strength?: number; threshold?: number; radius?: number } | false;
  /** Accumulated samples (default 1 preview, 8 final). */
  samples?: number;
  /** Shutter as a fraction of one frame (e.g. .5 = 180° shutter). Needs a `poseAt` callback. */
  motionBlur?: { shutter: number };
}

export interface ResolvedRenderOptions {
  quality: RenderQuality; ao: number; samples: number;
  dof: { aperture: number; maxBlur: number; focusDistance?: number } | null;
  bloom: { strength: number; threshold: number; radius: number } | null;
  shutter: number;
}

export function resolveRenderOptions(options: HeroRenderOptions = {}): ResolvedRenderOptions {
  const quality = options.quality ?? "preview";
  const final = quality === "final";
  const samples = Math.max(1, Math.min(64, Math.round(options.samples ?? (final ? 8 : 1))));
  const ao = Math.max(0, Math.min(1, options.ambientOcclusion ?? (final ? .7 : .5)));
  // DOF and bloom are shot decisions (focus subject, emissive story), so they are opt-in.
  const dof = !options.depthOfField ? null
    : { aperture: options.depthOfField?.aperture ?? .0012, maxBlur: options.depthOfField?.maxBlur ?? .006, focusDistance: options.depthOfField?.focusDistance };
  const bloom = !options.bloom ? null
    // Threshold above ordinary specular highlights: only emitters (screens, LEDs, lamps) bloom.
    : { strength: options.bloom?.strength ?? .12, threshold: options.bloom?.threshold ?? 4, radius: options.bloom?.radius ?? .35 };
  const shutter = Math.max(0, Math.min(1, options.motionBlur?.shutter ?? 0));
  return { quality, ao, samples, dof, bloom, shutter };
}

/** R2 low-discrepancy sequence: well-spread deterministic sub-pixel offsets. */
function jitter(i: number): [number, number] {
  const g = 1.324717957244746, a1 = 1 / g, a2 = 1 / (g * g);
  return [((.5 + a1 * i) % 1) - .5, ((.5 + a2 * i) % 1) - .5];
}

const accumulateShader = {
  uniforms: { tSample: { value: null }, weight: { value: 1 } },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }",
  fragmentShader: "uniform sampler2D tSample; uniform float weight; varying vec2 vUv; void main(){ gl_FragColor = texture2D(tSample, vUv) * weight; }",
};

export interface HeroRenderPipeline {
  /** Render one output frame. `poseAt(dt)` must pose the scene at frame + dt (dt in frames, |dt| ≤ shutter/2). */
  render(camera: PerspectiveCamera | Ortho, options: { focusDistance?: number; poseAt?: (dt: number) => void }): void;
  setSize(width: number, height: number, pixelRatio: number): void;
  readonly options: ResolvedRenderOptions;
  dispose(): void;
}

/**
 * Build a post-processing pipeline for a renderer and scene. Recreate it when the
 * options change; `setSize` handles resizes. Leaves renderer state as it found it.
 */
export function createHeroRenderPipeline(renderer: WebGLRenderer, scene: Scene, camera: PerspectiveCamera | Ortho,
  input: HeroRenderOptions = {}): HeroRenderPipeline {
  const options = resolveRenderOptions(input);
  const size = renderer.getDrawingBufferSize(new Vector2());
  const target = new WebGLRenderTarget(size.x, size.y, { type: HalfFloatType, samples: options.samples > 1 ? 0 : 4 });
  const composer = new EffectComposer(renderer, target);
  composer.renderToScreen = false;
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  let gtao: GTAOPass | undefined;
  if (options.ao > 0) {
    gtao = new GTAOPass(scene, camera, size.x, size.y);
    gtao.output = GTAOPass.OUTPUT.Default;
    gtao.blendIntensity = options.ao;
    gtao.updateGtaoMaterial({ radius: .35, distanceExponent: 1.4, thickness: 1.2, scale: 1, samples: options.quality === "final" ? 16 : 8 });
    gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
    composer.addPass(gtao);
  }
  let bokeh: BokehPass | undefined;
  if (options.dof) {
    bokeh = new BokehPass(scene, camera as PerspectiveCamera, { focus: 10, aperture: options.dof.aperture, maxblur: options.dof.maxBlur });
    composer.addPass(bokeh);
  }
  if (options.bloom) composer.addPass(new UnrealBloomPass(new Vector2(size.x, size.y), options.bloom.strength, options.bloom.radius, options.bloom.threshold));
  // Accumulation target + full-screen quad for weighted additive sums.
  const accum = new WebGLRenderTarget(size.x, size.y, { type: HalfFloatType });
  const quadCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quadMaterial = new ShaderMaterial({ ...accumulateShader, uniforms: { tSample: { value: null }, weight: { value: 1 } },
    depthTest: false, depthWrite: false, transparent: true });
  quadMaterial.blendSrc = OneFactor; quadMaterial.blendDst = OneFactor; quadMaterial.blendEquation = AddEquation;
  quadMaterial.blendSrcAlpha = OneFactor; quadMaterial.blendDstAlpha = OneFactor;
  const quad = new Mesh(new PlaneGeometry(2, 2), quadMaterial);
  const output = new OutputPass();
  return {
    options,
    render(cam, { focusDistance, poseAt }) {
      renderPass.camera = cam;
      if (gtao) gtao.camera = cam;
      if (bokeh) {
        const focus = options.dof?.focusDistance ?? focusDistance;
        if (focus !== undefined) (bokeh.uniforms as Record<string, { value: number }>).focus.value = focus;
      }
      const n = options.samples;
      const width = accum.width, height = accum.height;
      const perspective = (cam as PerspectiveCamera).isPerspectiveCamera ? cam as PerspectiveCamera : undefined;
      for (let i = 0; i < n; i++) {
        if (options.shutter > 0 && poseAt) poseAt(((i + .5) / n - .5) * options.shutter);
        if (n > 1 && perspective) {
          const [jx, jy] = jitter(i);
          perspective.setViewOffset(width, height, jx, jy, width, height);
        }
        composer.render();
        quadMaterial.uniforms.tSample.value = composer.readBuffer.texture;
        quadMaterial.uniforms.weight.value = 1 / n;
        // Plain sum (ONE, ONE): AdditiveBlending would also multiply by the weighted alpha.
        quadMaterial.blending = i === 0 ? NoBlending : CustomBlending;
        const previous = renderer.getRenderTarget(), autoClear = renderer.autoClear;
        renderer.setRenderTarget(accum);
        renderer.autoClear = i === 0;
        renderer.render(quad, quadCamera);
        renderer.autoClear = autoClear;
        renderer.setRenderTarget(previous);
      }
      if (n > 1 && perspective) perspective.clearViewOffset();
      if (options.shutter > 0 && poseAt) poseAt(0);
      // Tone map + sRGB from the accumulated linear HDR image to the canvas.
      output.renderToScreen = true;
      output.render(renderer, null as unknown as WebGLRenderTarget, accum, 0, false);
    },
    setSize(width, height, pixelRatio) {
      const w = Math.max(1, Math.floor(width * pixelRatio)), h = Math.max(1, Math.floor(height * pixelRatio));
      composer.setPixelRatio(1);
      composer.setSize(w, h);
      accum.setSize(w, h);
      gtao?.setSize(w, h);
    },
    dispose() {
      composer.dispose(); target.dispose(); accum.dispose(); gtao?.dispose(); bokeh?.dispose?.();
      quad.geometry.dispose(); quadMaterial.dispose(); output.dispose();
    },
  };
}
