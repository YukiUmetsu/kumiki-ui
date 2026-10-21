/** Three.js renderer for `EnvironmentalEffects`: rain streaks (line segments with per-vertex alpha),
 * snow and dust (soft round points), drips and condensation (instanced water droplets) and
 * stains (a noisy-edged decal on the surface). Buffers are sized once from each plan's
 * particle count, so memory is fixed; `update(frame)` only rewrites attributes.
 * Every object is tagged `userData.inspectIgnore` so callouts and section reveals skip it.
 */
import {
  BufferAttribute, BufferGeometry, CanvasTexture, CircleGeometry, Color, Group, InstancedMesh, LineBasicMaterial,
  LineSegments, Matrix4, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, NormalBlending, Points, Quaternion, ShaderMaterial, SphereGeometry, Vector3,
} from "three";
import type { Texture } from "three";
import { evaluateEffect } from "./environmental-effects";
import type { EffectFrame, EffectPlan } from "./environmental-effects";

export interface EnvironmentalEffectsThree {
  group: Group;
  update(frame: number, options?: { reducedMotion?: boolean }): EffectFrame[];
  dispose(): void;
}

const COLORS: Record<string, string> = { rain: "#cfe0ee", snow: "#ffffff", dust: "#8a6f45", drips: "#cfe9ff", condensation: "#e6f4ff", stain: "#5a4632" };

function stainTexture(seed: number): Texture | null {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d");
  if (!g) return null;
  // Irregular blot: overlapping soft circles inside the unit disc, darker tide line at the rim.
  let s = seed;
  const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  g.clearRect(0, 0, 256, 256);
  for (let i = 0; i < 70; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 78, rad = 18 + r() * 38;
    const x = 128 + Math.cos(a) * d, y = 128 + Math.sin(a) * d;
    const grd = g.createRadialGradient(x, y, 0, x, y, rad);
    grd.addColorStop(0, "rgba(255,255,255,0.20)"); grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd; g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
  }
  g.strokeStyle = "rgba(255,255,255,0.55)"; g.lineWidth = 5; g.beginPath();
  for (let i = 0; i <= 64; i++) { const a = (i / 64) * Math.PI * 2, d = 108 + Math.sin(a * 5 + seed) * 7 + Math.sin(a * 11) * 4; g.lineTo(128 + Math.cos(a) * d, 128 + Math.sin(a) * d); }
  g.stroke();
  return new CanvasTexture(c);
}

/** `pointScale`: px per world unit at distance 1, roughly viewport height / (2·tan(fov/2)) × pixel ratio. @default 2000 */
export function createEnvironmentalEffectsThree(plans: readonly EffectPlan[], options: { pointScale?: number } = {}): EnvironmentalEffectsThree {
  const group = new Group();
  group.name = "environmental-effects";
  group.userData.inspectIgnore = true;
  const disposables: { dispose(): void }[] = [];
  const own = <T extends { dispose(): void }>(x: T) => { disposables.push(x); return x; };
  const m4 = new Matrix4(), q = new Quaternion(), v = new Vector3(), sc = new Vector3(), zAxis = new Vector3(0, 0, 1);
  const updaters: ((f: EffectFrame) => void)[] = [];
  for (const plan of plans) {
    const n = Math.max(1, plan.count), kind = plan.spec.kind, color = new Color(COLORS[kind]);
    if (kind === "rain") {
      const pos = new BufferAttribute(new Float32Array(n * 6), 3), col = new BufferAttribute(new Float32Array(n * 8), 4);
      const geo = own(new BufferGeometry()); geo.setAttribute("position", pos); geo.setAttribute("color", col);
      const mat = own(new LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false }));
      const lines = new LineSegments(geo, mat); lines.frustumCulled = false; lines.userData.inspectIgnore = true; group.add(lines);
      updaters.push((f) => {
        for (let i = 0; i < f.count; i++) {
          const x = f.positions[i * 3], y = f.positions[i * 3 + 1], z = f.positions[i * 3 + 2];
          pos.setXYZ(i * 2, x, y, z); pos.setXYZ(i * 2 + 1, x + f.tails![i * 3], y + f.tails![i * 3 + 1], z + f.tails![i * 3 + 2]);
          const a = f.alphas[i] * f.opacity;
          col.setXYZW(i * 2, color.r, color.g, color.b, a * 0.2); col.setXYZW(i * 2 + 1, color.r, color.g, color.b, a);
        }
        geo.setDrawRange(0, f.count * 2); pos.needsUpdate = true; col.needsUpdate = true;
      });
    } else if (kind === "snow" || kind === "dust") {
      const pos = new BufferAttribute(new Float32Array(n * 3), 3), size = new BufferAttribute(new Float32Array(n), 1), alpha = new BufferAttribute(new Float32Array(n), 1);
      const geo = own(new BufferGeometry()); geo.setAttribute("position", pos); geo.setAttribute("size", size); geo.setAttribute("alpha", alpha);
      const mat = own(new ShaderMaterial({
        transparent: true, depthWrite: false, blending: NormalBlending,
        uniforms: { color: { value: color }, opacity: { value: 1 }, scale: { value: (options.pointScale ?? 2000) } },
        vertexShader: "attribute float size; attribute float alpha; varying float vA; uniform float scale; void main(){ vA = alpha; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = max(1.0, size * scale / -mv.z); gl_Position = projectionMatrix * mv; }",
        fragmentShader: "uniform vec3 color; uniform float opacity; varying float vA; void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c); if (d > 0.5) discard; float a = smoothstep(0.5, 0.15, d) * vA * opacity; gl_FragColor = vec4(color, a); }",
      }));
      const pts = new Points(geo, mat); pts.frustumCulled = false; pts.userData.inspectIgnore = true; group.add(pts);
      updaters.push((f) => {
        (pos.array as Float32Array).set(f.positions); (size.array as Float32Array).set(f.sizes); (alpha.array as Float32Array).set(f.alphas);
        mat.uniforms.opacity.value = f.opacity; geo.setDrawRange(0, f.count);
        pos.needsUpdate = size.needsUpdate = alpha.needsUpdate = true;
      });
    } else if (kind === "drips" || kind === "condensation") {
      const geo = own(new SphereGeometry(1, 14, 10));
      const mat = own(new MeshPhysicalMaterial({ color, roughness: .04, metalness: 0, clearcoat: 1, clearcoatRoughness: .05, transparent: true, opacity: .7, envMapIntensity: 2.2, depthWrite: false }));
      const mesh = new InstancedMesh(geo, mat, n); mesh.frustumCulled = false; mesh.userData.inspectIgnore = true; group.add(mesh);
      const surf = plan.spec.surface;
      const normalQ = surf ? new Quaternion().setFromUnitVectors(zAxis, new Vector3(...surf.u).cross(new Vector3(...surf.v)).normalize()) : null;
      updaters.push((f) => {
        for (let i = 0; i < n; i++) {
          const s = i < f.count && f.alphas[i] > 0 ? f.sizes[i] : 0;
          v.set(f.positions[i * 3], f.positions[i * 3 + 1], f.positions[i * 3 + 2]);
          if (kind === "drips") { q.identity(); sc.set(s, s * (f.tails?.[i] ?? 1), s); }
          else { q.copy(normalQ!); sc.set(s, s, s * .35); }
          m4.compose(v, q, sc); mesh.setMatrixAt(i, m4);
        }
        mesh.instanceMatrix.needsUpdate = true; mat.opacity = .7 * f.opacity; mesh.visible = f.opacity > .01;
      });
    } else {
      const tex = stainTexture(plan.spec.seed ?? 7);
      if (tex) own(tex);
      const mat = own(new MeshBasicMaterial({ color, transparent: true, alphaMap: tex ?? undefined, opacity: .85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
      const disc = new Mesh(own(new CircleGeometry(1, 48)), mat); disc.userData.inspectIgnore = true; group.add(disc);
      updaters.push((f) => {
        const st = f.stain!; const u = new Vector3(...st.surface.u), w = new Vector3(...st.surface.v), nrm = u.clone().cross(w).normalize();
        disc.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(u, w, nrm));
        disc.position.set(...st.center).addScaledVector(nrm, .002);
        disc.scale.setScalar(Math.max(1e-4, st.radius)); mat.opacity = .85 * Math.max(.0, f.opacity > 0 ? 1 : 0); disc.visible = st.radius > 1e-3;
      });
    }
  }
  return {
    group,
    update(frame, opts = {}) {
      const frames = plans.map((p) => evaluateEffect(p, frame, opts));
      frames.forEach((f, i) => updaters[i](f));
      return frames;
    },
    dispose() { for (const d of disposables) d.dispose(); group.clear(); },
  };
}
