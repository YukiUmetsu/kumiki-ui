/** Portals: a surface in one scene that is a window into another.
 *
 * The second scene is drawn into a texture through a camera that is the main camera carried through the window: the window's centre
 * in the first scene maps to an anchor in the second, its facing direction to the anchor's forward direction, and its units to the
 * second scene's by a scale. So the view through the window moves with true parallax as the camera moves, the way looking through a
 * real window does. The window shows that texture in screen space, so it lines up exactly with what the camera would see.
 *
 * When the window fills the whole frame, the picture inside it and the second scene drawn full frame are the same image, so a recipe
 * can switch to the second scene at that moment with no visible change and keep the camera moving into it.
 */
import { HalfFloatType, LinearFilter, Matrix4, Mesh, OrthographicCamera, PerspectiveCamera, PlaneGeometry, Quaternion, RGBAFormat, Scene as ThreeScene, ShaderMaterial, Vector2, Vector3, WebGLRenderTarget } from "three";
import type { Scene, WebGLRenderer } from "three";

export interface PortalAnchor {
  /** Where the window's centre lands in the second scene. */
  position: readonly [number, number, number];
  /** Yaw of the view through the window, in degrees: 0 looks along -Z. */
  yaw?: number;
  /** Second-scene units per first-scene unit. A phone measured in centimetres opening onto a landscape in metres might use 0.05. */
  scale: number;
}

const VERTEX = /* glsl */`void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FRAGMENT = /* glsl */`
uniform sampler2D uView;
uniform vec2 uResolution;
uniform float uOpacity;
void main() {
  vec4 c = texture2D(uView, gl_FragCoord.xy / uResolution);
  gl_FragColor = vec4(c.rgb, uOpacity);
  // The window holds linear light; tone-map it exactly as the screen does, so switching to the world full frame does not jump.
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export interface Portal {
  /** Put this on the window surface. It shows the second scene in screen space. */
  material: ShaderMaterial;
  /** The camera that looks into the second scene. Updated by `update`. */
  camera: PerspectiveCamera;
  /** Carries the main camera through the window into the second scene, and draws it into the window's texture. The window is given
   * as its centre and its orientation, with its front facing local +Z. */
  update(renderer: WebGLRenderer, main: PerspectiveCamera, window: { position: Vector3; quaternion: Quaternion }, world: Scene, size: { width: number; height: number; dpr: number }): void;
  /** Places the second-scene camera directly, for after the camera has gone through. */
  setCamera(position: readonly [number, number, number], target: readonly [number, number, number], fov: number, aspect: number): void;
  /** Draws the second scene full frame through the same texture and tone mapping as the window, so the picture is identical on both
   * sides of the crossing. */
  presentFullFrame(renderer: WebGLRenderer, world: Scene, size: { width: number; height: number; dpr: number }): void;
  dispose(): void;
}

export function createPortal(anchor: PortalAnchor, options: { near?: number; far?: number } = {}): Portal {
  const target = new WebGLRenderTarget(4, 4, { type: HalfFloatType, format: RGBAFormat, minFilter: LinearFilter, magFilter: LinearFilter });
  const material = new ShaderMaterial({ vertexShader: VERTEX, fragmentShader: FRAGMENT, uniforms: { uView: { value: target.texture }, uResolution: { value: new Vector2(1, 1) }, uOpacity: { value: 1 } }, toneMapped: true });
  const camera = new PerspectiveCamera(30, 1, options.near ?? .05, options.far ?? 600);
  const anchorQuat = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), (anchor.yaw ?? 0) * Math.PI / 180);
  const anchorPos = new Vector3(...anchor.position);
  const windowInv = new Matrix4(), local = new Vector3(), q = new Quaternion(), windowQuat = new Quaternion();
  // A full-frame quad with the window's own material, for presenting the second scene after the crossing.
  const quadScene = new ThreeScene(), quadCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1), quad = new Mesh(new PlaneGeometry(2, 2), material);
  quad.frustumCulled = false; quadScene.add(quad);
  return {
    material, camera,
    update(renderer, main, window, world, size) {
      windowQuat.copy(window.quaternion);
      windowInv.compose(window.position, windowQuat, new Vector3(1, 1, 1)).invert();
      // Main camera in window-local space, scaled into the second scene and placed at the anchor. A camera in front of the window
      // (+Z) ends up behind the anchor, looking forward through it.
      local.copy(main.position).applyMatrix4(windowInv).multiplyScalar(anchor.scale);
      camera.position.copy(local.applyQuaternion(anchorQuat)).add(anchorPos);
      q.copy(windowQuat).invert().multiply(main.quaternion);
      camera.quaternion.copy(anchorQuat).multiply(q);
      camera.fov = main.fov; camera.aspect = main.aspect; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
      const width = Math.max(1, Math.round(size.width * size.dpr)), height = Math.max(1, Math.round(size.height * size.dpr));
      if (target.width !== width || target.height !== height) target.setSize(width, height);
      (material.uniforms.uResolution.value as Vector2).set(width, height);
      const prior = renderer.getRenderTarget();
      renderer.setRenderTarget(target); renderer.clear(); renderer.render(world, camera); renderer.setRenderTarget(prior);
    },
    presentFullFrame(renderer, world, size) {
      const width = Math.max(1, Math.round(size.width * size.dpr)), height = Math.max(1, Math.round(size.height * size.dpr));
      if (target.width !== width || target.height !== height) target.setSize(width, height);
      (material.uniforms.uResolution.value as Vector2).set(width, height);
      const prior = renderer.getRenderTarget();
      renderer.setRenderTarget(target); renderer.clear(); renderer.render(world, camera); renderer.setRenderTarget(prior);
      renderer.render(quadScene, quadCamera);
    },
    setCamera(position, look, fov, aspect) {
      camera.position.set(...position); camera.lookAt(...look); camera.fov = fov; camera.aspect = aspect; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    },
    dispose() { target.dispose(); material.dispose(); quad.geometry.dispose(); },
  };
}
