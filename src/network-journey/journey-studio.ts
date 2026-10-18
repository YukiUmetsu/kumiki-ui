/** A crafted, physically grounded network demonstration stage.
 * Geometry is authored once, then reused under CC1/MD1 absolute-frame motion.
 * Modularity, joinery, conduits, and contact surfaces replace the bare
 * infinite-looking procedural grid. No third-party models or runtime fetches.
 */
import {
  BoxGeometry, BufferGeometry, CatmullRomCurve3, Group, Mesh,
  MeshBasicMaterial, MeshStandardMaterial, TubeGeometry, Vector3,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { Material } from "three";
import { JOURNEY_POINTS, JOURNEY_ROUTE, JOURNEY_THEME } from "./journey-content";

export interface JourneyStudio {
  group: Group;
  dispose(): void;
}

export function createJourneyStudio(): JourneyStudio {
  const group = new Group();
  group.name = "network-studio-environment";
  const geometries: BufferGeometry[] = [];
  const materials: Material[] = [];
  const ownGeometry = <T extends BufferGeometry>(geometry: T): T => {
    geometries.push(geometry);
    return geometry;
  };
  const pbr = (color: string, metalness: number, roughness: number) => {
    const material = new MeshStandardMaterial({ color, metalness, roughness });
    materials.push(material);
    return material;
  };
  const matte = pbr("#263e46", .12, .83);
  const metal = pbr("#9eb2b7", .72, .44);
  const dark = pbr("#182c35", .35, .65);
  const accent = new MeshBasicMaterial({ color: JOURNEY_THEME.route, toneMapped: false });
  materials.push(accent);
  const place = (
    dimensions: [number, number, number],
    position: [number, number, number],
    material: Material,
    radius = .03,
  ) => {
    const geometry = ownGeometry(
      new RoundedBoxGeometry(dimensions[0], dimensions[1], dimensions[2], 2,
        Math.min(radius, ...dimensions.map(d => d / 2))),
    );
    const mesh = new Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.receiveShadow = true;
    mesh.castShadow = material !== accent;
    group.add(mesh);
    return mesh;
  };

  // Main stage chassis extends beneath the visible floor. The architecture
  // gives the camera a real-scale reference without constructing opaque walls.
  place([76, .40, 38], [7, -1.02, 0], dark, .20);
  place([75.5, .035, 37.5], [7, -.80, 0], metal, .015);
  place([75.2, .027, 37.2], [7, -.776, 0], matte, .01);

  // A limited number of large architectural floor slabs; no busy repeated
  // per-pixel checkerboard under the labels or tracked signal.
  for (const x of [-22, -10, 2, 14, 26, 38]) {
    for (const z of [-10, 0, 10]) {
      place([11.72, .032, 9.68], [x, -.748, z], matte, .055);
      // Thin clear metal seam communicates panel joinery at grazing angles.
      place([11.72, .012, .026], [x, -.726, z + 4.79], metal, .009);
    }
  }
  // Engineering seams, inset conduits and disciplined perimeter edge lights.
  for (const side of [-1, 1]) {
    place([75, .10, .12], [7, -.69, side * 18.47], dark, .025);
    place([74.5, .024, .035], [7, -.628, side * 18.44], accent, .009);
    place([.12, .10, 36.5], [7 + side * 37.2, -.69, 0], dark, .025);
    place([.035, .024, 36], [7 + side * 37.15, -.628, 0], accent, .009);
  }

  // Floor conduits follow the same illustrative topology as the camera-visible
  // pathways, but remain recessed and physically grounded in the stage.
  // Their function is spatial orientation, not a claimed real fiber routing.
  const cableSheath = pbr("#21343b", .18, .81);
  const cableCore = pbr("#558d8c", .18, .55);
  const route = JOURNEY_ROUTE.map(id => new Vector3(...JOURNEY_POINTS[id]));
  const routePoint = (point: Vector3, shift = 0) => new Vector3(point.x, -.708 + shift, point.z);
  for (let i = 1; i < route.length; i++) {
    const begin = routePoint(route[i - 1]);
    const end = routePoint(route[i]);
    const center = begin.clone().lerp(end, .5);
    const curve = new CatmullRomCurve3([begin, center, end]);
    const sheath = new Mesh(ownGeometry(new TubeGeometry(curve, 12, .071, 8, false)), cableSheath);
    const stripCurve = new CatmullRomCurve3([
      routePoint(route[i - 1], .043), routePoint(center, .043), routePoint(route[i], .043),
    ]);
    const strip = new Mesh(ownGeometry(new TubeGeometry(stripCurve, 12, .016, 5, false)), cableCore);
    sheath.receiveShadow = true;
    group.add(sheath, strip);
  }
  return {
    group,
    dispose() {
      geometries.forEach(g => g.dispose());
      materials.forEach(m => m.dispose());
      group.clear();
    },
  };
}
