/** Reference-driven network cabling for the educational studio.
 * A wired router has RJ45 jacks on the FRONT (+Z); service NICs are on
 * the REAR (-Z) of each rack-server layer. Every actual cable runs from
 * socket to socket through a floor raceway with a visible strain-relief boot.
 * Smartphones deliberately have NO Ethernet cables: their last hop is radio.
 *
 * Construction references (layout only; no copied trademarks/assets):
 * https://www.tp-link.com/us/business-networking/omada-sdn-router/er605/v2/
 * https://www.dell.com/support/manuals/en-uk/poweredge-r350/r350_ism_pub/rear-view-of-the-system
 */
import {
  BufferGeometry, CatmullRomCurve3, Group, Mesh, MeshStandardMaterial,
  TubeGeometry, Vector3,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { JOURNEY_POINTS, JOURNEY_ROUTE } from "./journey-content";

const ROUTERS = new Set<string>(["gateway","router-a","router-b","router-c","router-d","router-e","resolver"]);
type Endpoint = { node: string; position: Vector3; outward: Vector3; portIndex: number };
function port(node: string, index: number): Endpoint | null {
  const origin = JOURNEY_POINTS[node as keyof typeof JOURNEY_POINTS];
  if (!origin) return null;
  const point = new Vector3(...origin);
  if (ROUTERS.has(node)) {
    // addRouterConstruction: four front-facing sockets, local Z+.805.
    point.add(new Vector3(-.67 + .45 * (index % 4), -.044, .851));
    return { node, position: point, outward: new Vector3(0, 0, 1), portIndex: index };
  }
  if (node === "server") {
    // addServerLayerConstruction: two rear NICs in the receive module.
    point.add(new Vector3(-.91 + .4 * (index % 2), -.025, -1.407));
    return { node, position: point, outward: new Vector3(0, 0, -1), portIndex: index };
  }
  return null; // Phones are wireless endpoints.
}

export interface JourneyCabling {
  group: Group;
  connections: Array<{ from: string; to: string; start: readonly number[]; end: readonly number[] }>;
  dispose(): void;
}

export function createJourneyCabling(): JourneyCabling {
  const group = new Group();
  group.name = "jack-to-jack-network-patch-cabling";
  const geometries: BufferGeometry[] = [];
  const polymer = new MeshStandardMaterial({ color: "#253b42", roughness: .86, metalness: 0 });
  const boot = new MeshStandardMaterial({ color: "#54696d", roughness: .78, metalness: .04 });
  const plug = new MeshStandardMaterial({ color: "#a9bfbe", roughness: .43, metalness: .36 });
  const glass = new MeshStandardMaterial({ color: "#2d7270", roughness: .5, metalness: .05 });
  const materials = [polymer, boot, plug, glass];
  const geometry = <T extends BufferGeometry>(g: T): T => { geometries.push(g); return g; };
  const connections: JourneyCabling["connections"] = [];
  const slabY = -.62; // Above the floor's recessed raceway, below every equipment pedestal.
  const addEnd = (endpoint: Endpoint) => {
    const tail = endpoint.position.clone().addScaledVector(endpoint.outward, .19);
    const orientation = endpoint.outward.z > 0 ? 1 : -1;
    // The male RJ45 head aligns into the socket, plus a tapered strain-relief boot.
    const cap = new Mesh(geometry(new RoundedBoxGeometry(.25, .13, .14, 2, .023)), plug);
    cap.position.copy(endpoint.position).addScaledVector(endpoint.outward, .07);
    group.add(cap);
    const sleeve = new Mesh(geometry(new RoundedBoxGeometry(.29, .17, .20, 2, .04)), boot);
    sleeve.position.copy(endpoint.position).addScaledVector(endpoint.outward, .20);
    group.add(sleeve);
    const latch = new Mesh(geometry(new RoundedBoxGeometry(.17, .020, .16, 2, .009)), glass);
    latch.position.copy(endpoint.position).add(new Vector3(0, .105, orientation * .12));
    group.add(latch);
    return tail;
  };
  // Every internal wired link is between *ports*, never between mesh centers.
  // The same subnet metaphor may include radios; those do not imply copper.
  const wired = JOURNEY_ROUTE.slice(1, -1) as readonly string[];
  for (let i = 1; i < wired.length; i++) {
    const from = port(wired[i - 1], i % 2);
    const to = port(wired[i], (i + 1) % 2);
    if (!from || !to) continue;
    const a = addEnd(from);
    const b = addEnd(to);
    const aKnee = a.clone().addScaledVector(from.outward, .38);
    const bKnee = b.clone().addScaledVector(to.outward, .38);
    const aFloor = new Vector3(aKnee.x, slabY, aKnee.z);
    const bFloor = new Vector3(bKnee.x, slabY, bKnee.z);
    const middle = aFloor.clone().lerp(bFloor, .5);
    const cable = new CatmullRomCurve3([a, aKnee, aFloor, middle, bFloor, bKnee, b], false, "centripetal", .5);
    const mesh = new Mesh(geometry(new TubeGeometry(cable, 56, .037, 9, false)), polymer);
    mesh.castShadow = true;
    group.add(mesh);
    connections.push({ from: from.node, to: to.node, start: from.position.toArray(), end: to.position.toArray() });
  }
  // DNS lookup is an application flow, not a literal point-to-point cable from
  // the resolver to the messaging service; omitted intentionally.
  return {
    group, connections,
    dispose() {
      geometries.forEach(g => g.dispose());
      materials.forEach(m => m.dispose());
      group.clear();
    },
  };
}
