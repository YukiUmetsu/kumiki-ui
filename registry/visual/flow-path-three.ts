/** Three.js adapter for FlowPath: a draw-on tube track, instanced markers and an animated ribbon.
 *
 * - Track: TubeGeometry along the frame's polyline (rebuilt only when the
 *   polyline changes, e.g. moving anchors); draw-on via the index draw range.
 * - Markers: one InstancedMesh with a fixed capacity (no per-frame growth):
 *   cones for arrows, spheres for particles/pulses, capsules for streaks.
 *   Opacity fades are expressed as scale so instancing stays single-material.
 * - Ribbon: a stripe texture on the tube whose offset follows the frame's
 *   phase, so dash motion is a pure function of the frame.
 * The caller owns placement (add `object` to a scene or asset group).
 */
import {
  CapsuleGeometry, CatmullRomCurve3, ConeGeometry, CurvePath, DataTexture, DynamicDrawUsage, Group, IcosahedronGeometry, InstancedMesh, LineCurve3,
  Matrix4, Mesh, MeshStandardMaterial, Quaternion, RepeatWrapping, RGBAFormat, TubeGeometry, Vector3,
} from "three";
import type { BufferGeometry, ColorRepresentation } from "three";
import type { FlowPathFrame, FlowStyle } from "./flow-path";

export interface FlowPathThreeOptions {
  color: ColorRepresentation;
  style: FlowStyle;
  /** Marker size (world units). */
  size: number;
  /** Track tube radius (world units); 0 hides the track. */
  trackRadius?: number;
  trackOpacity?: number;
  /** Instance capacity (match the spec's maxMarkers). */
  capacity?: number;
  /** Emissive strength so flows read on dark and light scenes (default .9). */
  glow?: number;
}
export interface FlowPathThree {
  object: Group;
  update(frame: FlowPathFrame): void;
  dispose(): void;
}

function stripes(): DataTexture {
  const w = 64, data = new Uint8Array(w * 4 * 4);
  for (let y = 0; y < 4; y++) for (let x = 0; x < w; x++) {
    const on = x < w * .55, i = (y * w + x) * 4;
    data[i] = data[i + 1] = data[i + 2] = 255; data[i + 3] = on ? 255 : 0;
  }
  const t = new DataTexture(data, w, 4, RGBAFormat);
  t.wrapS = t.wrapT = RepeatWrapping; t.needsUpdate = true;
  return t;
}

export function createFlowPathThree(options: FlowPathThreeOptions): FlowPathThree {
  const capacity = Math.min(512, Math.max(1, options.capacity ?? 64));
  const object = new Group(); object.name = "flow-path";
  const glow = options.glow ?? .9;
  const trackMat = new MeshStandardMaterial({ color: options.color, emissive: options.color, emissiveIntensity: glow * .35, transparent: true, opacity: options.trackOpacity ?? .3, depthWrite: false, roughness: .5 });
  const markerMat = new MeshStandardMaterial({ color: options.color, emissive: options.color, emissiveIntensity: glow, roughness: .35 });
  const ribbonTex = options.style === "ribbon" ? stripes() : null;
  const ribbonMat = ribbonTex ? new MeshStandardMaterial({ color: options.color, emissive: options.color, emissiveIntensity: glow, alphaMap: ribbonTex, transparent: true, depthWrite: false }) : null;
  const s = options.size;
  const markerGeo: BufferGeometry = options.style === "arrows" ? new ConeGeometry(s * .45, s, 14).translate(0, s * .2, 0)
    : options.style === "streaks" ? new CapsuleGeometry(s * .22, 1, 4, 10) : new IcosahedronGeometry(s * .4, 2);
  const markers = new InstancedMesh(markerGeo, markerMat, capacity);
  markers.instanceMatrix.setUsage(DynamicDrawUsage); markers.count = 0; markers.frustumCulled = false; markers.name = "flow-markers";
  markers.userData.inspectIgnore = true;
  object.add(markers);
  let track: Mesh | null = null, ribbon: Mesh | null = null, trackKey = "", trackGeo: TubeGeometry | null = null, tubular = 1;
  const m = new Matrix4(), q = new Quaternion(), up = new Vector3(0, 1, 0), dir = new Vector3(), pos = new Vector3(), scale = new Vector3();

  const rebuild = (points: number[][], length: number) => {
    trackGeo?.dispose();
    const path = new CurvePath<Vector3>();
    for (let i = 1; i < points.length; i++) path.add(new LineCurve3(new Vector3(...points[i - 1]), new Vector3(...points[i])));
    // Dense segments keep draw-on and stripes evenly spaced along arc length.
    tubular = Math.max(8, Math.min(1200, Math.ceil(length / (s * .25))));
    const radius = Math.max(1e-4, options.trackRadius ?? s * .18);
    trackGeo = new TubeGeometry(path.curves.length === 1 ? new CatmullRomCurve3([path.getPoint(0), path.getPoint(1)]) : path, tubular, radius, 10, false);
    if (!track) { track = new Mesh(trackGeo, trackMat); track.name = "flow-track"; track.userData.inspectIgnore = true; object.add(track); }
    else track.geometry = trackGeo;
    if (ribbonMat) {
      if (!ribbon) { ribbon = new Mesh(trackGeo, ribbonMat); ribbon.name = "flow-ribbon"; ribbon.userData.inspectIgnore = true; ribbon.scale.setScalar(1); object.add(ribbon); }
      else ribbon.geometry = trackGeo;
    }
  };

  return {
    object,
    update(frame) {
      if (frame.dimension !== 3) throw new Error("FlowPath Three.js adapter needs 3D flow frames.");
      object.visible = frame.opacity > 0;
      if (!object.visible) return;
      const key = frame.points.length + ":" + frame.points.map(p => p.map(v => v.toFixed(4)).join(",")).join(";");
      if (key !== trackKey) { rebuild(frame.points, frame.length); trackKey = key; }
      // Draw-on: tube index buffer is ordered by tubular segment (10 radial × 6 indices each).
      const [a, b] = frame.drawnRange, per = 10 * 6;
      const startSeg = Math.floor(a / Math.max(1e-9, frame.length) * tubular), endSeg = Math.ceil(b / Math.max(1e-9, frame.length) * tubular);
      trackGeo!.setDrawRange(startSeg * per, Math.max(0, endSeg - startSeg) * per);
      trackMat.opacity = (options.trackOpacity ?? .3) * frame.opacity;
      if (ribbonMat && ribbonTex) {
        const period = s * 2.6;
        ribbonTex.repeat.set(frame.length / period, 1);
        ribbonTex.offset.x = (frame.direction === "reverse" ? 1 : -1) * frame.phase / period;
        ribbonMat.opacity = frame.opacity;
        ribbon!.scale.setScalar(1.0);
      }
      let n = 0;
      if (options.style === "streaks") {
        for (const seg of frame.segments) {
          if (n >= capacity || seg.points.length < 2) break;
          const p0 = new Vector3(...seg.points[0]), p1 = new Vector3(...seg.points[seg.points.length - 1]);
          const length = p0.distanceTo(p1);
          if (length < 1e-6) continue;
          dir.copy(p1).sub(p0).normalize();
          q.setFromUnitVectors(up, dir);
          pos.copy(p0).add(p1).multiplyScalar(.5);
          const k = Math.max(.05, seg.opacity);
          m.compose(pos, q, scale.set(k, length, k));
          markers.setMatrixAt(n++, m);
        }
      } else if (options.style !== "ribbon") {
        for (const marker of frame.markers) {
          if (n >= capacity) break;
          pos.set(marker.position[0], marker.position[1], marker.position[2]);
          dir.set(marker.tangent[0], marker.tangent[1], marker.tangent[2]);
          q.setFromUnitVectors(up, dir.lengthSq() > 0 ? dir.normalize() : up);
          const k = Math.max(.001, marker.opacity) * (options.style === "pulse" ? 1.5 : 1);
          m.compose(pos, q, scale.set(k, k, k));
          markers.setMatrixAt(n++, m);
        }
      }
      markers.count = n;
      markers.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      trackGeo?.dispose(); markerGeo.dispose(); trackMat.dispose(); markerMat.dispose(); ribbonMat?.dispose(); ribbonTex?.dispose(); markers.dispose();
      object.clear();
    },
  };
}
