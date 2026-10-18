/** Original procedural benchmark assets. No camera coordinates or live simulation. */
import { Box3, Box3Helper, BoxGeometry, BufferGeometry, Color, DirectionalLight, Group, HemisphereLight, Line, LineBasicMaterial, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, Scene, SphereGeometry, Vector3 } from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { Material, Object3D } from "three";
import { createExplodedAssembly } from "../../registry/motion/exploded-view-three";
import { createThreeCameraTargets } from "../../registry/motion/camera-targets-three";
import { evaluateCameraPose3D } from "../../registry/motion/camera-pose-3d";
import { evaluateTimeline, outputKey } from "../../registry/motion/timeline";
import type { EvaluationResult, MotionTimeline, Vec2 } from "../../registry/motion/types";
import type { CompiledCinematicCamera } from "../../registry/motion/cinematic-camera-types";
import { JOURNEY_POINTS, JOURNEY_THEME } from "./journey-content";
import type { JourneySettings } from "./journey-content";
import { JOURNEY_EXPLOSION, JOURNEY_PACKET_IDS, JOURNEY_SERVER_PARTS } from "./journey-motion";
import { createJourneySurfaceTextures } from "./journey-surfaces";
import { addPhoneConstruction, addRouterConstruction, addServerLayerConstruction, consolidateDeviceDetails } from "./journey-device-details";
import type { JourneyDetailTools } from "./journey-device-details";
import { createJourneyPhoneScreen } from "./journey-phone-screen";
import type { JourneyPhoneScreen } from "./journey-phone-screen";
import { createJourneySignalPulse } from "./journey-signal-pulse";
import { createJourneyStudio } from "./journey-studio";
import { createJourneyCabling } from "./journey-cables";

export function createJourneyWorld(timeline: MotionTimeline, settings: JourneySettings, debugCamera?: CompiledCinematicCamera) {
  const theme = JOURNEY_THEME, scene = new Scene(); scene.background = new Color("#28444d");
  const world = new Group(); scene.add(world);
  const geometries: BufferGeometry[] = [], materials: Material[] = [];
  const surfaces = createJourneySurfaceTextures();
  const anchors = new Map<string, Object3D>();
  const phoneScreens: JourneyPhoneScreen[] = [];
  const material = (color: string, metalness = .15, roughness = .45, emissive = "#000000") => {
    const micro = metalness > .44 ? surfaces.brushed : roughness > .66 ? surfaces.polymer : surfaces.ceramic;
    const m = new MeshStandardMaterial({
      color, metalness, roughness, emissive, emissiveIntensity: .55,
      roughnessMap: micro, bumpMap: micro,
      bumpScale: metalness > .44 ? .009 : .004,
    });
    materials.push(m);
    return m;
  };
  const pale = material(theme.pale, .5, .38), metal = material(theme.metal, .72, .46);
  const graphite = material("#263f49", .52, .65), glass = material("#102d3e", .12, .22);
  const gold = material(theme.message, .4, .42, "#956434"), teal = material(theme.teal, .35, .48, "#174d4c");
  const rubber = material("#17252b", .02, .93), inset = material("#111f28", .15, .69);
  const screenGlass = material("#244558", .10, .17);
  const geometry = <T extends BufferGeometry>(value: T): T => { geometries.push(value); return value; };
  const rounded = (parent: Group, size: [number, number, number], position: [number, number, number], surface: Material, radius = .12) => {
    const object = new Mesh(geometry(new RoundedBoxGeometry(...size, 3, Math.min(radius, Math.min(...size) / 2))), surface); object.position.set(...position); object.castShadow = true; object.receiveShadow = true; parent.add(object); return object;
  };
  const details: JourneyDetailTools = {
    round: rounded, geometry, metal, inset, dark: graphite, rubber,
    pale, warm: gold, teal, glass: screenGlass,
  };
  function phone(id: "sender" | "recipient") {
    const root = new Group(), [x, y, z] = JOURNEY_POINTS[id]; root.position.set(x, y, z); world.add(root); anchors.set(id, root);
    rounded(root, [2.75, 5.5, .32], [0, 0, 0], metal, .23);
    // One recessed non-overlapping display foundation; formerly multiple overlapping
    // coplanar panels caused z-fighting and ruined the readability of the screen.
    rounded(root, [2.52, 5.22, .055], [0, 0, .189], inset, .20);
    const screen = createJourneyPhoneScreen(id);
    phoneScreens.push(screen);
    const displayMaterial = new MeshBasicMaterial({ map: screen.texture ?? undefined, color: screen.texture ? "#ffffff" : "#f1f6f4", toneMapped: false });
    materials.push(displayMaterial);
    const display = new Mesh(geometry(new PlaneGeometry(2.43, 5.10)), displayMaterial);
    display.position.set(0, 0, .231); root.add(display);
    const phoneDetailGroup = new Group(); root.add(phoneDetailGroup);
    addPhoneConstruction(phoneDetailGroup, details);
    consolidateDeviceDetails(phoneDetailGroup, details);
    // Preserve semantic IDs for existing tracks; the actual bubble and Send affordance
    // are pixels in one coherent phone display, not shapes floating above its glass.
    const message = new Group(); message.position.set(.1, -.55, .233); root.add(message);
    anchors.set(`${id}-message`, message);
    const button = new Group(); button.position.set(.83, -1.95, .233); root.add(button);
    return { root, message, button };
  }
  const sender = phone("sender"), recipient = phone("recipient");
  const routerIds = ["gateway", "router-a", "router-b", "router-c", "router-d", "router-e", "resolver"] as const;
  for (const id of routerIds) {
    const group = new Group(), [x, y, z] = JOURNEY_POINTS[id]; group.position.set(x, y, z); world.add(group); anchors.set(id, group);
    const surface = id === settings.selectedRouter ? teal : pale;
    rounded(group, [2.1, .65, 1.5], [0, 0, 0], surface, .2);
    rounded(group, [1.75, .09, 1.18], [0, .35, 0], graphite, .1);
    for (let p = 0; p < 4; p++) rounded(group, [.22, .14, .04], [(p - 1.5) * .36, -.05, .77], p === 0 ? gold : metal, .025);
    const routerDetailGroup = new Group(); group.add(routerDetailGroup);
    addRouterConstruction(routerDetailGroup, details);
    consolidateDeviceDetails(routerDetailGroup, details);
    // Separate studio mount below supports each wired appliance.
    // No decorative cones, illuminated torus or invented antennas.
  }
  const assembly = createExplodedAssembly(JOURNEY_SERVER_PARTS, part => {
    const group = new Group();
    rounded(group, [3.4, .66, 2.4], [0, 0, 0], part.id === "server-process" ? teal : pale, .12);
    rounded(group, [2.85, .4, .06], [0, 0, 1.25], graphite, .07);
    for (let i = 0; i < 7; i++) rounded(group, [.2, .08, .04], [-1.1 + i * .35, -.02, 1.3], i === 5 ? gold : metal, .01);
    const serverDetailGroup = new Group(); group.add(serverDetailGroup);
    addServerLayerConstruction(serverDetailGroup, details, part.id === "server-receive" ? "receive" : part.id === "server-process" ? "process" : "deliver");
    consolidateDeviceDetails(serverDetailGroup, details);
    return { object: group, dispose() {} };
  });
  // Cabinet structure stays fixed while the three conceptual service trays
  // separate. Rail spacing, shelves and fasteners convey plausible assembly.
  for (const x of [-1.78, 1.78]) {
    for (const z of [-1.17, 1.17]) {
      rounded(assembly.root, [.13, 2.90, .18], [x, .87, z], graphite, .022);
      rounded(assembly.root, [.068, 2.60, .07], [x + (x > 0 ? -.055 : .055), .82, z], metal, .012);
      for (let hole = 0; hole < 13; hole++) {
        rounded(assembly.root, [.016, .044, .04], [x, -.28 + hole * .19, z + (z > 0 ? .097 : -.097)], inset, .006);
      }
    }
  }
  for (const y of [-.44, 2.19]) {
    rounded(assembly.root, [3.70, .15, 2.70], [0, y, 0], graphite, .035);
    rounded(assembly.root, [3.38, .025, 2.50], [0, y + .095, 0], metal, .015);
  }
  // Fixed vertical rear cable-management duct, outside the NIC apertures.
  rounded(assembly.root, [.21, 2.70, .20], [1.68, .82, -1.43], rubber, .025);
  assembly.root.position.set(...JOURNEY_POINTS.server); world.add(assembly.root); anchors.set("server", assembly.root);
  for (const [id, anchor] of assembly.anchors) anchors.set(id, anchor);
  // Ports are modeled as actual physical sockets (router front, server rear).
  // Phone-to-router is radio and is intentionally NOT shown as a copper cable.
  const cabling = createJourneyCabling();
  world.add(cabling.group);
  const tunnelMaterial = new MeshStandardMaterial({
    color: theme.teal, emissive: "#276966", transparent: true,
    opacity: 0, roughness: .3, metalness: .2, depthWrite: false,
  });
  materials.push(tunnelMaterial);
  // The tracked semantic target represents a small optically styled signal pulse
  // along a link, NOT a physical IP packet. Actual headers are taught in 2D.
  // Keep one shared geometry and material for background traffic.
  const signal = createJourneySignalPulse();
  const trafficGeometry = geometry(new SphereGeometry(.08, 12, 8));
  const trafficMaterial = new MeshBasicMaterial({ color: theme.teal, transparent: true, opacity: .7, toneMapped: false });
  materials.push(trafficMaterial);
  const packetMeshes = JOURNEY_PACKET_IDS.map((id, i) => {
    const root = new Group();
    if (i === 0) root.add(signal.root);
    else root.add(new Mesh(trafficGeometry, trafficMaterial));
    world.add(root);
    anchors.set(id, root);
    return root;
  });
  const floorSurface = material("#31484f", .08, .93);
  floorSurface.roughnessMap = surfaces.floor;
  floorSurface.bumpMap = surfaces.floor;
  floorSurface.bumpScale = .005;
  const floor = new Mesh(geometry(new PlaneGeometry(100, 70)), floorSurface); floor.rotation.x = -Math.PI / 2; floor.position.set(7, -.75, 0); floor.receiveShadow = true; scene.add(floor);
  const studio = createJourneyStudio();
  scene.add(studio.group);
  const collisionFloor = new Mesh(geometry(new BoxGeometry(100, .2, 70)), graphite); collisionFloor.position.set(7, -.9, 0); // bounds only, never rendered
  // Purpose-built studio platform: visible contact geometry makes every device
  // read as a supported piece of equipment, not a hovering placeholder.
  const platform = material("#36505a", .65, .48), platformTrim = material("#a5bbb9", .72, .34);
  const ground = -.75;
  const mount = (id: string, x: number, z: number, top: number, size: [number, number]) => {
    const support = new Group(); support.name = `mount-${id}`; world.add(support);
    rounded(support, [size[0], .20, size[1]], [x, ground + .13, z], graphite, .09);
    const height = Math.max(.16, top - ground - .18);
    rounded(support, [Math.min(.72, size[0] * .3), height, Math.min(.72, size[1] * .3)],
      [x, ground + .19 + height / 2, z], platform, .08);
    rounded(support, [size[0] * .76, .10, size[1] * .72], [x, top - .075, z], platformTrim, .035);
    for (const side of [-1, 1]) {
      rounded(support, [.12, Math.max(.15, height * .86), .12],
        [x + side * Math.min(size[0] * .33, .95), ground + .18 + height * .43, z], platform, .025);
    }
  };
  mount("sender", JOURNEY_POINTS.sender[0], JOURNEY_POINTS.sender[2], .05, [3.3, 2.4]);
  mount("recipient", JOURNEY_POINTS.recipient[0], JOURNEY_POINTS.recipient[2], .05, [3.3, 2.4]);
  for (const id of routerIds) {
    const [x, y, z] = JOURNEY_POINTS[id];
    // The metal enclosure bottom is y-.325 and its rubber feet reach y-.46.
    // Mount just below the actual feet, not at the old decorative cone height.
    mount(id, x, z, y - .47, [3, 2.6]);
  }
  mount("server", JOURNEY_POINTS.server[0], JOURNEY_POINTS.server[2], 2.40, [4.5, 3.6]);
  // Stage joints and subtle machined floor rails visually anchor this world.
  for (const z of [-14, -7, 0, 7, 14]) {
    rounded(world, [87, .014, .027], [7, ground + .012, z], platformTrim, .008);
  }
  scene.add(new HemisphereLight("#daeaf0", "#283d3d", 1.3));
  const key = new DirectionalLight("#fff4df", 2.8); key.position.set(-5, 18, 15); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -40, right: 40, top: 25, bottom: -25, far: 100 }); key.shadow.normalBias = .035; scene.add(key);
  const rim = new DirectionalLight("#91c8dc", 1.7); rim.position.set(10, 12, -14); scene.add(rim);
  const fill = new DirectionalLight("#b6ded2", .8); fill.position.set(25, 8, 10); scene.add(fill);
  const debugBoxes: Array<{ object: Object3D; helper: Box3Helper }> = [];
  if (debugCamera) {
    const points = Array.from({ length: 181 }, (_, i) => new Vector3(...evaluateCameraPose3D(debugCamera.timeline, Math.min(2699, i * 15)).position));
    const lineMaterial = new LineBasicMaterial({ color: theme.message, transparent: true, opacity: .8 }); materials.push(lineMaterial);
    scene.add(new Line(geometry(new BufferGeometry().setFromPoints(points)), lineMaterial));
    for (const id of ["sender", "recipient", "server", "hero-packet", settings.selectedRouter]) {
      const object = anchors.get(id)!; const helper = new Box3Helper(new Box3(), new Color(theme.teal)); scene.add(helper); debugBoxes.push({ object, helper });
    }
  }
  function updateFrame(frame: number, shared?: EvaluationResult) {
    const evaluation = shared ?? evaluateTimeline(timeline, frame);
    const value = (id: string, property: string) => Number(evaluation.samples[outputKey(id, property)]?.value ?? 0);
    for (let i = 0; i < packetMeshes.length; i++) {
      const id = JOURNEY_PACKET_IDS[i], point = evaluation.samples[outputKey(id, "offset")]?.value as Vec2 | undefined;
      packetMeshes[i].position.set(point?.x ?? JOURNEY_POINTS.sender[0], point?.y ?? JOURNEY_POINTS.sender[1], value(id, "depth"));
      packetMeshes[i].visible = value(id, "opacity") > .02;
      packetMeshes[i].scale.setScalar(i === 0 ? 1 : .8 + (i % 3) * .1);
    }
    // Derive the pulse direction from two absolute MG1 samples. Scrubbing
    // backward or seeking directly to a frame produces the same orientation.
    if (packetMeshes[0].visible) {
      const before = evaluateTimeline(timeline, Math.max(0, frame - 3));
      const prior = before.samples[outputKey("hero-packet", "offset")]?.value as Vec2 | undefined;
      const priorZ = Number(before.samples[outputKey("hero-packet", "depth")]?.value ?? 0);
      const here = packetMeshes[0].position;
      signal.update(frame, [here.x - (prior?.x ?? here.x), here.y - (prior?.y ?? here.y), here.z - priorZ]);
    }
    phoneScreens[0]?.update(frame, settings.recipientOnline);
    phoneScreens[1]?.update(frame, settings.recipientOnline);
    sender.message.scale.setScalar(Math.max(.001, value("screen-message", "reveal")));
    recipient.message.scale.setScalar(Math.max(.001, value("recipient-message", "reveal")));
    sender.button.position.z = .3 - value("send-button", "press") * .06;
    tunnelMaterial.opacity = value("tunnel", "reveal") * .2;
    assembly.update(JOURNEY_EXPLOSION, frame, 1, evaluation);
    world.updateWorldMatrix(true, true);
    for (const { object, helper } of debugBoxes) { helper.box.setFromObject(object); helper.updateMatrixWorld(true); }
  }
  const targets = createThreeCameraTargets({ revision: `journey-v1-${settings.latencyMs}-${settings.protection}`, root: world, updateFrame,
    targets: [{ id: "network", object: world }, ...[...anchors].filter(([id]) => !id.startsWith("traffic-")).map(([id, object]) => ({ id, object, importance: id === "hero-packet" ? 3 : 1 }))],
    boundsMode: "conservative", collisionObjects: [{ id: "ground", object: collisionFloor }], occluders: [] });
  return { scene, world, anchors, assembly, targets, updateFrame, dispose() {
    debugBoxes.forEach(({ helper }) => { helper.geometry.dispose(); if (Array.isArray(helper.material)) helper.material.forEach(m => m.dispose()); else helper.material.dispose(); });
    assembly.dispose(); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); cabling.dispose(); studio.dispose(); signal.dispose(); phoneScreens.forEach(screen => screen.dispose()); surfaces.dispose(); key.shadow.map?.dispose(); scene.clear();
  } };
}
