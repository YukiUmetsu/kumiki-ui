/** `DioramaJourney`: a story as a journey across a miniature world. A rolling meadow sits on a museum plinth (a soil cross-section over a
 * walnut base) with trees, grass and wildflowers, and a dirt path winds past stations: catalog landmarks on stone plazas, like the
 * pieces of a board game. A traveller (a coin rolling on its edge, or a glowing orb) follows the path and rests at each station while
 * its caption reads. The camera follows from above with a long lens, and a tilt-shift blur at the top and bottom of the frame makes it
 * read as a model, the way real tilt-shift photographs make cities look like toys. Pure function of `frame`.
 */
import { useLayoutEffect, useMemo } from "react";
import { AdditiveBlending, BoxGeometry, BufferAttribute, CanvasTexture, CatmullRomCurve3, Color, CylinderGeometry, DoubleSide, Group, Matrix4, Mesh, MeshBasicMaterial, MeshPhysicalMaterial,
  MeshStandardMaterial, PlaneGeometry, Quaternion, RepeatWrapping, SphereGeometry, Vector3 } from "three";
import { createAssetResources } from "../craft/hero-asset";
import type { HeroAsset } from "../craft/hero-asset";
import { paintTexture, paintWithRelief } from "../craft/canvas-texture";
import { createCraftTree } from "../craft/environment-generator";
import { createCraftGroundVegetation } from "../craft/ground-vegetation";
import type { CraftPlacement } from "../craft/scatter-placement";
import { FINANCE_HERO_BUILDERS } from "../domains/finance-hero-3d";
import { createPadlock } from "../domains/privacy-3d";
import { createLaptop, createServerRack, createSmartphone } from "../domains/technology-3d";
import { FiberStage } from "./fiber-stage";
import { FiberHeroStudio, ShotCamera, useHeroAsset, useStudio } from "./studio-fiber";
import { StudioCaption } from "./studio-recipes-react";
import type { StudioRecipeProps } from "./studio-recipes-react";
import { easeInOut, span01 } from "./studio-shots";
import type { ShotPose, Vec3 } from "./studio-shots";
import { dioramaSchedule } from "./story-3d-shots";
import type { DioramaJourneySpec, DioramaStationKind } from "./story-3d-shots";
import { posedObject } from "./tabletop-story-react";

const STATIONS: Record<DioramaStationKind, () => HeroAsset> = {
  bank: () => FINANCE_HERO_BUILDERS.bank(), "server-rack": () => createServerRack(), "money-bag": () => FINANCE_HERO_BUILDERS["money-bag"]({ coins: 4 }),
  "gold-bars": () => FINANCE_HERO_BUILDERS["gold-bars"](), padlock: () => createPadlock({ withKey: false }), smartphone: () => createSmartphone({ id: "phone" }),
  laptop: () => createLaptop({ id: "laptop" }), bull: () => FINANCE_HERO_BUILDERS["bull-market"]({ plinth: false }), "cash-stack": () => FINANCE_HERO_BUILDERS["cash-stack"]({ bundles: 3 }),
};
/** The world in metres of the model's own scale: a 14 by 9 m meadow, landmarks about 1.9 m on 1.3 m plazas, trees about 2 m tall. */
const LAND = { width: 14, depth: 9 }, LANDMARK = 1.9, PLAZA = 1.3;

function seeded(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hills = (x: number, z: number) => .22 * Math.sin(x * .45 + 1.2) * Math.cos(z * .5) + .12 * Math.sin(x * 1.1 - z * .7);

export function buildDiorama(spec: DioramaJourneySpec) {
  const res = createAssetResources(), group = new Group(), random = seeded(19), owned: Array<{ dispose(): void }> = [];
  const n = spec.stations.length;
  // Stations along an S across the meadow, alternating behind and in front of the path; the path passes in front of each plaza.
  const spacing = (LAND.width - 3.8) / Math.max(1, n - 1), swing = Math.min(1.15, spacing * .2);
  const plazas = spec.stations.map((_, i): Vec3 => [-LAND.width / 2 + 1.9 + spacing * (n === 1 ? .5 : i), 0, (i % 2 ? 1 : -1) * swing - .9]);
  const stops = plazas.map(([x, , z]): Vec3 => [x, 0, z + PLAZA + .75]);
  // The path enters at the left edge already heading for the first stop, swings gently between stops and leaves at the right. Every
  // bend stays wider than the path itself, so the ribbon never folds over on a turn.
  const first = stops[0], last = stops[n - 1];
  const curve = new CatmullRomCurve3([new Vector3(-LAND.width / 2 + .2, 0, first[2] + .9), new Vector3((first[0] - LAND.width / 2) / 2, 0, first[2] + .35),
    ...stops.flatMap((p, i) => [new Vector3(...p), ...(i < n - 1 ? [new Vector3((p[0] + stops[i + 1][0]) / 2, 0, (p[2] + stops[i + 1][2]) / 2)] : [])]),
    new Vector3((last[0] + LAND.width / 2) / 2, 0, last[2] - .35), new Vector3(LAND.width / 2 - .2, 0, last[2] - .9)], false, "centripetal", .5);
  const samples = curve.getSpacedPoints(400);
  const nearPath = (x: number, z: number) => Math.min(...samples.map(p => Math.hypot(p.x - x, p.z - z)));
  const nearPlaza = (x: number, z: number) => Math.min(...plazas.map(p => Math.hypot(p[0] - x, p[2] - z)));
  const height = (x: number, z: number) => hills(x, z) * Math.min(1, Math.max(0, (nearPath(x, z) - .6) / 1.2)) * Math.min(1, Math.max(0, (nearPlaza(x, z) - PLAZA) / 1.2));
  // The meadow: gentle hills flattened under the path and plazas, coloured by height and a slow noise.
  const land = new PlaneGeometry(LAND.width, LAND.depth, 140, 90); land.rotateX(-Math.PI / 2);
  const pos = land.getAttribute("position"), colors = new Float32Array(pos.count * 3), c = new Color(), grass = [new Color("#46602d"), new Color("#6b7f3a"), new Color("#8c9248")];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), y = height(x, z); pos.setY(i, y);
    const k = (Math.sin(x * .9 + z * .4) + Math.sin(x * .3 - z * 1.1) + Math.sin(x * 2.3 + z * 1.7) * .5) / 2.5 * .5 + .5;
    c.copy(grass[0]).lerp(grass[1], k).lerp(grass[2], Math.max(0, y) * 1.6); colors.set([c.r, c.g, c.b], i * 3);
  }
  land.setAttribute("color", new BufferAttribute(colors, 3)); land.computeVertexNormals();
  const turf = paintWithRelief(512, 512, (ctx, w, h, r) => { ctx.fillStyle = "#808080"; ctx.fillRect(0, 0, w, h); for (let i = 0; i < 16000; i++) { const g = 90 + r() * 90; ctx.fillStyle = `rgba(${g},${g},${g},.5)`; ctx.fillRect(r() * w, r() * h, 1.5, 3); } }, { color: "data", strength: 1.4, seed: 51, repeat: true });
  for (const t of [turf.map, turf.normalMap]) { res.own(t); t.wrapS = t.wrapT = RepeatWrapping; t.repeat.set(10, 6.5); }
  const meadow = new Mesh(res.own(land), res.own(new MeshStandardMaterial({ vertexColors: true, roughness: .95, normalMap: turf.normalMap })));
  meadow.receiveShadow = true; group.add(meadow);
  // The path: a packed-dirt ribbon with pebbles, laid just over the ground.
  const dirt = res.own(paintTexture(512, 512, (ctx, w, h, r) => {
    ctx.fillStyle = "#7d6444"; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { const g = r(); ctx.fillStyle = g > .5 ? `rgba(70,52,32,${.2 + r() * .3})` : `rgba(196,170,130,${.2 + r() * .3})`; ctx.fillRect(r() * w, r() * h, 2, 2); }
    for (let i = 0; i < 260; i++) { const v = 120 + r() * 80; ctx.fillStyle = `rgb(${v},${v - 8},${v - 20})`; ctx.beginPath(); ctx.ellipse(r() * w, r() * h, 2 + r() * 4, 2 + r() * 3, r() * 3, 0, Math.PI * 2); ctx.fill(); }
  }, { seed: 53, repeat: true }));
  dirt.wrapS = dirt.wrapT = RepeatWrapping;
  const ribbon = new PlaneGeometry(1, 1, 1, 400), rp = ribbon.getAttribute("position") as BufferAttribute, ruv = ribbon.getAttribute("uv") as BufferAttribute;
  const along = samples.reduce((sum, p, i) => sum + (i ? p.distanceTo(samples[i - 1]) : 0), 0);
  for (let j = 0; j <= 400; j++) {
    const u = j / 400, p = curve.getPointAt(u), t = curve.getTangentAt(u), side = new Vector3(-t.z, 0, t.x).normalize(), w = .62 + .08 * Math.sin(u * 37);
    for (let s = 0; s < 2; s++) { const i = j * 2 + s, q = p.clone().addScaledVector(side, (s ? 1 : -1) * w); rp.setXYZ(i, q.x, height(q.x, q.z) + .025, q.z); ruv.setXY(i, s * 1.3, u * along / 1.3); }
  }
  ribbon.computeVertexNormals();
  const path = new Mesh(res.own(ribbon), res.own(new MeshStandardMaterial({ map: dirt, roughness: .97, side: DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 })));
  path.receiveShadow = true; group.add(path);
  // The plinth: a soil cross-section with darker strata over a walnut base, as a museum diorama stands.
  const soil = res.own(paintTexture(1024, 128, (ctx, w, h, r) => {
    const bands = ["#5a4a33", "#4a3b28", "#6a5639", "#3f3222", "#53432e"];
    bands.forEach((b, i) => { ctx.fillStyle = b; ctx.beginPath(); ctx.moveTo(0, h * i / bands.length); for (let x = 0; x <= w; x += 16) ctx.lineTo(x, h * i / bands.length + Math.sin(x * .02 + i) * 4); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill(); });
    for (let i = 0; i < 900; i++) { const v = 60 + r() * 90; ctx.fillStyle = `rgba(${v},${v - 10},${v - 25},.7)`; ctx.beginPath(); ctx.arc(r() * w, r() * h, .8 + r() * 2.4, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "#3d5226"; ctx.fillRect(0, 0, w, h * .06);
  }, { seed: 55 }));
  const side = res.own(new MeshStandardMaterial({ map: soil, roughness: .95 })), lid = res.own(new MeshStandardMaterial({ color: "#3d5226", roughness: 1 }));
  const block = new Mesh(res.own(new BoxGeometry(LAND.width, .9, LAND.depth)), [side, side, lid, lid, side, side]); block.position.y = -.46; block.receiveShadow = true; group.add(block);
  const walnut = res.own(new MeshPhysicalMaterial({ color: "#3a2416", roughness: .42, clearcoat: .55, clearcoatRoughness: .25 }));
  const base = new Mesh(res.own(new BoxGeometry(LAND.width + .5, .55, LAND.depth + .5)), walnut); base.position.y = -1.18; base.castShadow = base.receiveShadow = true; group.add(base);
  // Stations: each landmark at a common size on a stone plaza with a kerb.
  const stone = res.own(new MeshStandardMaterial({ color: "#8f897e", roughness: .88 })), kerb = res.own(new MeshStandardMaterial({ color: "#6f6a61", roughness: .8 }));
  const landmarks = spec.stations.map((station, i) => {
    const p = plazas[i];
    const plaza = new Mesh(res.own(new CylinderGeometry(PLAZA - .06, PLAZA, .12, 48)), stone); plaza.position.set(p[0], .05, p[2]); plaza.receiveShadow = true; group.add(plaza);
    const ring = new Mesh(res.own(new CylinderGeometry(PLAZA + .06, PLAZA + .1, .1, 48, 1, true)), kerb); ring.position.set(p[0], .06, p[2]); group.add(ring);
    const item = posedObject(STATIONS[station.kind](), station.id);
    const scale = LANDMARK / Math.max(...item.size);
    item.holder.scale.setScalar(scale); item.holder.position.set(p[0], .11, p[2]); item.holder.rotation.y = (p[0] < 0 ? .25 : -.25);
    item.asset.group.traverse(object => { const mesh = object as Mesh; if (mesh.isMesh) { mesh.castShadow = true; mesh.receiveShadow = true; } });
    group.add(item.holder); owned.push(item.asset);
    return { item, at: p, height: item.size[1] * scale };
  });
  // Trees along the back and the far ends, clear of the path and plazas, so none stands between the camera and the journey; grass and
  // wildflowers everywhere else.
  const species = ["oak", "birch", "pine", "generic"] as const;
  for (let i = 0, placed = 0; i < 160 && placed < 14; i++) {
    const x = (random() - .5) * (LAND.width - 1), z = -LAND.depth / 2 + .5 + random() * (LAND.depth * .45);
    if (nearPath(x, z) < 1.9 || nearPlaza(x, z) < PLAZA + 1.1) continue;
    const tree = createCraftTree({ schemaVersion: 1, id: `diorama-tree-${i}`, seed: 300 + i, trunkLength: 1.3 + random() * .9, trunkRadius: .09 + random() * .04, species: species[placed % species.length], leafCount: 420, crown: random() > .5 ? "broad" : "slender" });
    // Crowns about 3 m across: a tree reads beside a landmark without towering over the stations or shading the path.
    tree.group.position.set(x, height(x, z) - .04, z); tree.group.rotation.y = random() * Math.PI * 2; tree.group.scale.setScalar(.55 + random() * .15);
    tree.group.traverse(object => { const mesh = object as Mesh; if (mesh.isMesh) { mesh.castShadow = true; mesh.receiveShadow = true; } });
    group.add(tree.group); owned.push(tree); placed++;
  }
  const tufts = (count: number, prefix: string): CraftPlacement[] => {
    const out: CraftPlacement[] = [];
    for (let i = 0; out.length < count && i < count * 4; i++) {
      const x = (random() - .5) * (LAND.width - .3), z = (random() - .5) * (LAND.depth - .3);
      if (nearPath(x, z) < .78 || nearPlaza(x, z) < PLAZA + .15) continue;
      const position = new Vector3(x, height(x, z) - .01, z), rotation = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), random() * Math.PI * 2), k = .5 + random() * .5;
      out.push({ id: `${prefix}-${i}`, position, normal: new Vector3(0, 1, 0), rotation, scale: k, matrix: new Matrix4().compose(position, rotation, new Vector3(k, k, k)) });
    }
    return out;
  };
  for (const [veg, placements] of [
    [{ schemaVersion: 1 as const, id: "diorama-grass", seed: 61, kind: "meadow-grass" as const, detail: "supporting" as const, heightScale: .42, colors: { foliage: 0x84964a } }, tufts(1600, "grass")],
    [{ schemaVersion: 1 as const, id: "diorama-flowers", seed: 62, kind: "wildflower" as const, detail: "supporting" as const, heightScale: .4, colors: { foliage: 0x6f8240, bloom: 0xf3e6b0 } }, tufts(260, "flower")],
  ] as const) {
    const made = createCraftGroundVegetation(veg, placements); made.mesh.castShadow = false; made.mesh.receiveShadow = true; group.add(made.mesh); owned.push(made);
  }
  // The traveller: a gold coin on its edge, or an orb with a soft halo.
  const traveller = new Group(); group.add(traveller);
  let roll: Group | undefined;
  if (spec.traveller === "coin") {
    const coin = posedObject(FINANCE_HERO_BUILDERS.coins({ count: 1 }), "traveller", [Math.PI / 2, 0, 0]);
    const k = .85 / Math.max(...coin.size); coin.holder.scale.setScalar(k);
    roll = new Group(); roll.position.y = coin.size[1] * k / 2; coin.holder.position.y = -coin.size[1] * k / 2; roll.add(coin.holder); traveller.add(roll);
    coin.asset.group.traverse(object => { const mesh = object as Mesh; if (mesh.isMesh) mesh.castShadow = true; });
    owned.push(coin.asset);
  } else {
    const orb = new Mesh(res.own(new SphereGeometry(.2, 32, 16)), res.own(new MeshStandardMaterial({ color: "#fff4d8", emissive: "#ffd9a0", emissiveIntensity: 2.4, roughness: .3 })));
    orb.position.y = .45; orb.castShadow = true; traveller.add(orb);
    const canvas = typeof document === "undefined" ? null : document.createElement("canvas");
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      canvas.width = canvas.height = 64; const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, "rgba(255,226,170,.85)"); g.addColorStop(1, "rgba(255,226,170,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
      const halo = new Mesh(res.own(new PlaneGeometry(.95, .95)), res.own(new MeshBasicMaterial({ map: res.own(new CanvasTexture(canvas)), transparent: true, blending: AdditiveBlending, depthWrite: false })));
      halo.position.y = .45; halo.name = "orb-halo"; traveller.add(halo);
    }
  }
  const stopU = stops.map(p => { let best = 0, d = Infinity; for (let j = 0; j <= 400; j++) { const q = curve.getPointAt(j / 400), e = Math.hypot(q.x - p[0], q.z - p[2]); if (e < d) { d = e; best = j / 400; } } return best; });
  const asset: HeroAsset = { id: "diorama-journey", group, parts: res.parts, tier: "hero", metersPerUnit: 1, exposure: 1,
    bounds: { min: [-LAND.width / 2 - .25, -1.45, -LAND.depth / 2 - .25], max: [LAND.width / 2 + .25, LANDMARK, LAND.depth / 2 + .25] },
    studio: { palette: "slate", keyAzimuth: -40, floorY: -1.45 },
    craft: { materials: ["vertex-coloured turf", "packed dirt", "soil strata", "lacquered walnut base", "catalog landmarks"], details: ["crafted trees", "grass and wildflowers", "stone plazas with kerbs"] },
    dispose: () => { owned.forEach(o => o.dispose()); res.dispose(); } };
  return { asset, curve, stopU, traveller, roll, height, landmarks };
}

/** Where the traveller is along the path at a frame: easing out of one station and into the next, resting at each. */
function travellerU(spec: DioramaJourneySpec, stopU: readonly number[], frame: number, fps: number) {
  const schedule = dioramaSchedule(spec, fps);
  if (frame < schedule[0].arrive) return stopU[0] * easeInOut(span01(frame, 0, schedule[0].arrive));
  for (let i = 0; i < schedule.length; i++) {
    if (frame < schedule[i].leave) return stopU[i];
    const next = schedule[i + 1];
    if (!next) return stopU[i] + (1 - stopU[i]) * .3 * easeInOut(span01(frame, schedule[i].leave, schedule[i].leave + (spec.travelFrames ?? 54)));
    if (frame < next.arrive) return stopU[i] + (stopU[i + 1] - stopU[i]) * easeInOut(span01(frame, schedule[i].leave, next.arrive));
  }
  return stopU[stopU.length - 1];
}

function DioramaScene({ built, spec, frame, fps }: { built: ReturnType<typeof buildDiorama>; spec: DioramaJourneySpec; frame: number; fps: number }) {
  const studio = useStudio();
  const u = travellerU(spec, built.stopU, frame, fps), p = built.curve.getPointAt(Math.min(1, u)), t = built.curve.getTangentAt(Math.min(1, u));
  // The camera trails a little behind the traveller, high and to the front, on a long lens; it drifts round slowly over the scene.
  const look = built.curve.getPointAt(Math.max(0, Math.min(1, u + .015)));
  const drift = easeInOut(span01(frame, 0, spec.durationFrames)), yaw = (-12 + drift * 18) * Math.PI / 180, pitch = 42 * Math.PI / 180, distance = 15.5;
  const target = new Vector3(look.x * .85, .6, look.z * .5 - 1.3);
  const pose: ShotPose = { position: [target.x + Math.sin(yaw) * Math.cos(pitch) * distance, target.y + Math.sin(pitch) * distance, target.z + Math.cos(yaw) * Math.cos(pitch) * distance],
    target: [target.x, target.y, target.z], fov: 26 };
  useLayoutEffect(() => {
    const blob = studio.studio.group.getObjectByName("contact-occlusion"); if (blob) blob.visible = false;
    built.traveller.position.set(p.x, built.height(p.x, p.z) + .03, p.z);
    built.traveller.rotation.y = Math.atan2(t.x, t.z);
    // A coin rolls without slipping: it turns by the distance travelled over its radius.
    if (built.roll) built.roll.rotation.x = u * built.curve.getLength() / .425;
    const halo = built.traveller.getObjectByName("orb-halo"); if (halo) halo.lookAt(pose.position[0], pose.position[1], pose.position[2]);
  });
  return <ShotCamera pose={pose} />;
}

/** A traveller crosses a miniature world from station to station; each station's caption reads while it rests there. */
export function DioramaJourney({ spec, ...props }: Omit<StudioRecipeProps, "create"> & { spec: DioramaJourneySpec }) {
  const key = JSON.stringify([spec.stations.map(s => [s.id, s.kind]), spec.traveller]);
  const built = useMemo(() => buildDiorama(spec), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const asset = useHeroAsset(() => built.asset, [built]);
  const fps = props.fps.num / props.fps.den, schedule = dioramaSchedule(spec, fps);
  const blur = (from: "top" | "bottom") => <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, [from]: 0, height: "34%", backdropFilter: "blur(5px)", WebkitBackdropFilter: "blur(5px)",
    maskImage: `linear-gradient(to ${from === "top" ? "bottom" : "top"}, black, transparent)`, WebkitMaskImage: `linear-gradient(to ${from === "top" ? "bottom" : "top"}, black, transparent)` }} />;
  return <div style={{ position: "relative", overflow: "hidden", width: "100%", height: "100%", containerType: "size", background: "#0b0e12", ...props.style }}>
    <FiberStage frame={props.frame} fps={props.fps} label={props.label ?? `A miniature world: a ${spec.traveller === "coin" ? "coin" : "glowing orb"} travels a path past ${spec.stations.map(s => s.kind).join(", ")}`} shadows style={{ position: "absolute", inset: 0 }}>
      <FiberHeroStudio asset={asset} studio={props.studio} exposure={props.exposure}>
        <DioramaScene built={built} spec={spec} frame={props.frame} fps={fps} />
      </FiberHeroStudio>
    </FiberStage>
    {/* Tilt-shift: a shallow band of focus across the middle, the cue that reads a real scene as a model. */}
    {blur("top")}{blur("bottom")}
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {props.children}
      {spec.stations.map((station, i) => station.caption && <StudioCaption key={station.id} beat={{ text: station.caption, enter: schedule[i].arrive - 4, exit: schedule[i].leave + 8 }} frame={props.frame} tone={props.tone} />)}
      <StudioCaption beat={spec.title} frame={props.frame} tone={props.tone} />
    </div>
  </div>;
}
