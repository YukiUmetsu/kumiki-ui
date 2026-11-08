/** A near-field strip light, reflected. Environment maps are infinitely far away, so a flat glass face seen through a long lens mirrors
 * the same direction at every point: a strip in the environment can only switch the whole face on and off. On a set the strip is a
 * metre from the product, so each point of the glass sees it at a different angle and its reflection travels across the face. This
 * adds that reflection to a subject's standard and physical materials: each fragment's reflected ray is cast at the strip's rectangle,
 * weighted by Fresnel (dielectrics), the base colour (metals) and the clearcoat, and widened by roughness, as an area light's
 * highlight is.
 *
 * Frame-addressed: `update` sets every uniform outright from the camera and the strip's pose, so any frame in any order agrees.
 */
import { Matrix4, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, Vector3 } from "three";
import type { Camera, Material, Object3D, WebGLProgramParametersWithUniforms, WebGLRenderer } from "three";

/** Where the strip is: around a subject at `azimuth` degrees (0 on the camera's side, as the studio measures it), `distance` from
 * its centre, `width` × `height`, facing it. */
export interface StripPose { center: readonly [number, number, number]; azimuth: number; distance: number; width: number; height: number; elevation?: number }

const CHUNK = /* glsl */`
uniform vec3 kmStripCenter;
uniform vec3 kmStripNormal;
uniform vec3 kmStripU;
uniform vec3 kmStripV;
uniform vec2 kmStripHalf;
uniform float kmStripSoft;
uniform vec3 kmStripColor;
vec3 kmStripReflect(vec3 n, vec3 p, float rough, float metal, vec3 albedo) {
  vec3 v = normalize(-p), r = reflect(-v, n);
  float facing = dot(kmStripNormal, r);
  if (facing >= -1e-4) return vec3(0.);
  float t = dot(kmStripNormal, kmStripCenter - p) / facing;
  if (t <= 0.) return vec3(0.);
  vec3 h = p + r * t - kmStripCenter;
  // Roughness spreads the reflection beyond the strip's edges and dims it, as it spreads a real light's highlight.
  float s = kmStripSoft + rough * 1.6, sv = min(s, .5);
  float across = abs(dot(h, kmStripU)) / kmStripHalf.x, along = abs(dot(h, kmStripV)) / kmStripHalf.y;
  float cover = (1. - smoothstep(1. - s, 1. + s, across)) * (1. - smoothstep(1. - sv, 1. + sv, along));
  float fresnel = pow(1. - clamp(dot(n, v), 0., 1.), 5.);
  vec3 reflectance = mix(vec3(.04 + .96 * fresnel), albedo, metal);
  return kmStripColor * cover * reflectance * (1. - .8 * rough) / (1. + s);
}
`;
const APPLY = /* glsl */`
outgoingLight += kmStripReflect(normal, -vViewPosition, roughnessFactor, metalnessFactor, diffuseColor.rgb);
#ifdef USE_CLEARCOAT
  outgoingLight += kmStripReflect(clearcoatNormal, -vViewPosition, material.clearcoatRoughness, 0., vec3(0.)) * material.clearcoat;
#endif
#include <opaque_fragment>`;

export interface StripLight {
  /** Patches every standard and physical material under `root`. Returns a function that restores them. */
  attach(root: Object3D): () => void;
  /** Places the strip for this frame, relative to `camera`, at `intensity` (0 is off). */
  update(camera: Camera, pose: StripPose, intensity: number): void;
}
export function createStripLight(options: { color?: readonly [number, number, number]; softness?: number } = {}): StripLight {
  const uniforms = {
    kmStripCenter: { value: new Vector3() }, kmStripNormal: { value: new Vector3() }, kmStripU: { value: new Vector3() }, kmStripV: { value: new Vector3() },
    kmStripHalf: { value: [1, 1] as [number, number] }, kmStripSoft: { value: options.softness ?? .35 }, kmStripColor: { value: new Vector3() },
  };
  const base = options.color ?? [9, 8.8, 8.5], view = new Matrix4(), point = new Vector3();
  return {
    attach(root) {
      const patched: Array<{ material: Material; before: Material["onBeforeCompile"]; key: Material["customProgramCacheKey"] }> = [];
      root.traverse(object => {
        if (!(object instanceof Mesh)) return;
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          if (!(material instanceof MeshStandardMaterial || material instanceof MeshPhysicalMaterial) || patched.some(item => item.material === material)) continue;
          const before = material.onBeforeCompile, key = material.customProgramCacheKey;
          material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms, renderer: WebGLRenderer) => {
            before.call(material, shader, renderer);
            Object.assign(shader.uniforms, uniforms);
            shader.fragmentShader = shader.fragmentShader.replace("void main() {", CHUNK + "\nvoid main() {").replace("#include <opaque_fragment>", APPLY);
          };
          material.customProgramCacheKey = () => key.call(material) + "|km-strip";
          material.needsUpdate = true;
          patched.push({ material, before, key });
        }
      });
      return () => { for (const { material, before, key } of patched) { material.onBeforeCompile = before; material.customProgramCacheKey = key; material.needsUpdate = true; } };
    },
    update(camera, pose, intensity) {
      camera.updateMatrixWorld();
      view.copy(camera.matrixWorldInverse);
      const a = pose.azimuth * Math.PI / 180, out = new Vector3(Math.sin(a), 0, Math.cos(a));
      point.set(pose.center[0], pose.center[1] + (pose.elevation ?? 0), pose.center[2]).addScaledVector(out, pose.distance).applyMatrix4(view);
      uniforms.kmStripCenter.value.copy(point);
      uniforms.kmStripNormal.value.copy(out).negate().transformDirection(view);
      uniforms.kmStripU.value.set(Math.cos(a), 0, -Math.sin(a)).transformDirection(view);
      uniforms.kmStripV.value.set(0, 1, 0).transformDirection(view);
      uniforms.kmStripHalf.value = [pose.width / 2, pose.height / 2];
      uniforms.kmStripColor.value.set(base[0] * intensity, base[1] * intensity, base[2] * intensity);
    },
  };
}
