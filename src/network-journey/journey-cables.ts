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
  TubeGeometry, Vector3, Matrix4,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { JOURNEY_POINTS, JOURNEY_ROUTE } from "./journey-content";
import { createSemanticScene } from "../../registry/visual/semantic-scene";
import type { SemanticAsset } from "../../registry/visual/semantic-scene";

const ROUTERS = new Set<string>(["gateway","router-a","router-b","router-c","router-d","router-e","resolver"]);
type Endpoint = { node: string; position: Vector3; outward: Vector3; portIndex: number };

/** Stable local coordinates are declared once per model, not assembled ad hoc
 * while constructing cables. The shared registry owns connection semantics. */
function equipment() {
  const assets: SemanticAsset[] = Object.entries(JOURNEY_POINTS)
    .filter(([name]) => ROUTERS.has(name) || name === "server")
    .map(([name, coordinates]) => ({
      id: name, fidelity: name === "server" ? "hero" as const : "supporting" as const,
      worldMatrix: new Matrix4().makeTranslation(...coordinates).toArray(),
      attachments: ROUTERS.has(name)
        ? Array.from({ length: 4 }, (_, i) => ({
            id: `lan-${i}`, medium: "ethernet" as const, direction: "bidirectional" as const,
            localPosition: [-.67 + .45 * i, -.044, .851] as const,
            localNormal: [0, 0, 1] as const,
          }))
        : Array.from({ length: 2 }, (_, i) => ({
            id: `nic-${i}`, medium: "ethernet" as const, direction: "bidirectional" as const,
            localPosition: [-.91 + .4 * i, -.025, -1.407] as const,
            localNormal: [0, 0, -1] as const,
          })),
    }));
  return createSemanticScene(assets);
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
  const scene = equipment();
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
    const fromId = wired[i - 1], toId = wired[i];
    const fromRef = `${fromId}.${fromId === "server" ? "nic" : "lan"}-${i % 2}`;
    const toRef = `${toId}.${toId === "server" ? "nic" : "lan"}-${(i + 1) % 2}`;
    const connection = scene.connect({ id: `patch-${i}`, from: fromRef, to: toRef });
    const from: Endpoint = { node: fromId, position: new Vector3(...connection.from.position),
      outward: new Vector3(...connection.from.normal), portIndex: i % 2 };
    const to: Endpoint = { node: toId, position: new Vector3(...connection.to.position),
      outward: new Vector3(...connection.to.normal), portIndex: (i + 1) % 2 };
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
