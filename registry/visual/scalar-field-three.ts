/** Three.js adapter for `ScalarFieldOverlay`: the field as a translucent texture on its surface
 * (missing samples hatched) plus contour lines, rebuilt per frame from the pure evaluator.
 * Tagged `userData.inspectIgnore` so callouts and section reveals skip it.
 */
import { BufferAttribute, BufferGeometry, DataTexture, DoubleSide, Group, LineBasicMaterial, LineSegments, LinearFilter, Matrix4, Mesh, MeshBasicMaterial, PlaneGeometry, RGBAFormat, SRGBColorSpace, Vector3 } from "three";
import { evaluateScalarField, fieldContours, rasterizeField } from "./scalar-field";
import type { FieldFrame, FieldPlan } from "./scalar-field";

export interface ScalarFieldThree { group: Group; update(frame: number): FieldFrame; dispose(): void }

export function createScalarFieldThree(plan: FieldPlan, options: { resolution?: number; opacity?: number; offset?: number; contourColor?: string } = {}): ScalarFieldThree {
  const { surface } = plan.spec;
  const res = options.resolution ?? 160, W = res, H = Math.max(8, Math.round(res * surface.size[1] / surface.size[0]));
  const group = new Group(); group.name = `field.${plan.spec.id}`; group.userData.inspectIgnore = true;
  const data = new Uint8Array(W * H * 4);
  const tex = new DataTexture(data, W, H, RGBAFormat); tex.colorSpace = SRGBColorSpace; tex.magFilter = tex.minFilter = LinearFilter;
  const mat = new MeshBasicMaterial({ map: tex, transparent: true, opacity: options.opacity ?? .88, depthWrite: false, side: DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, toneMapped: false });
  const geo = new PlaneGeometry(surface.size[0], surface.size[1]);
  const plane = new Mesh(geo, mat); plane.userData.inspectIgnore = true;
  const u = new Vector3(...surface.u), v = new Vector3(...surface.v), n = u.clone().cross(v).normalize();
  group.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(u, v, n));
  group.position.set(...surface.origin).addScaledVector(n, options.offset ?? .01);
  group.add(plane);
  const lineGeo = new BufferGeometry(), lineMat = new LineBasicMaterial({ color: options.contourColor ?? "#111418", transparent: true, opacity: .85, depthWrite: false });
  const lines = new LineSegments(lineGeo, lineMat); lines.position.z = .002; lines.userData.inspectIgnore = true; group.add(lines);
  return {
    group,
    update(frame) {
      const f = evaluateScalarField(plan, frame);
      data.set(rasterizeField(plan, f, W, H)); tex.needsUpdate = true;
      const pts: number[] = [];
      for (const level of plan.spec.contours ?? []) for (const [a, b] of fieldContours(plan, f, level)) pts.push((a[0] - .5) * surface.size[0], (a[1] - .5) * surface.size[1], 0, (b[0] - .5) * surface.size[0], (b[1] - .5) * surface.size[1], 0);
      lineGeo.setAttribute("position", new BufferAttribute(new Float32Array(pts), 3)); lineGeo.computeBoundingSphere();
      return f;
    },
    dispose() { tex.dispose(); mat.dispose(); geo.dispose(); lineGeo.dispose(); lineMat.dispose(); },
  };
}
