/** `TabletopStory`: object-story with real objects on a table. Crafted catalog objects (notes, coins, cards, a phone, an invoice) sit
 * on a walnut or slate tabletop at their real sizes. Each beat arranges them in a row, a pair, a stack or around one in focus; between
 * beats each object is lifted, carried in a low arc and set down, a few frames after the one before, as a hand would move them. New
 * objects are set down from above the frame, and leaving ones are lifted out of it. The camera reframes gently on each beat, and each
 * beat's caption takes the lower-left. Pure function of `frame`.
 */
import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import { useLoader, useThree } from "@react-three/fiber";
import { Box3, Group, Mesh, MeshPhysicalMaterial, NoColorSpace, RepeatWrapping, SRGBColorSpace, TextureLoader, Vector2, Vector3 } from "three";
import type { Object3D } from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { createAssetResources } from "../craft/hero-asset";
import type { HeroAsset } from "../craft/hero-asset";
import { paintTexture, paintWithRelief } from "../craft/canvas-texture";
import { createEverydayObject } from "../craft/everyday-objects-3d";
import { FINANCE_HERO_BUILDERS } from "../domains/finance-hero-3d";
import { createPadlock } from "../domains/privacy-3d";
import { createLaptop, createSmartphone } from "../domains/technology-3d";
import { FiberStage } from "./fiber-stage";
import { FiberHeroStudio, ShotCamera, useHeroAsset } from "./studio-fiber";
import { StudioCaption } from "./studio-recipes-react";
import type { StudioRecipeProps } from "./studio-recipes-react";
import { easeInOut, orbitPose, span01 } from "./studio-shots";
import type { Vec3 } from "./studio-shots";
import { TABLETOP_MOVE, TABLETOP_STAGGER } from "./story-3d-shots";
import type { TabletopKind, TabletopStorySpec } from "./story-3d-shots";

/** Each kind's builder and how it lies on a table: a phone flat on its back, a card flat, a laptop open. Rotations in radians. */
const KINDS: Record<TabletopKind, { create: () => HeroAsset; pose?: Vec3 }> = {
  banknote: { create: () => FINANCE_HERO_BUILDERS.banknote() },
  "cash-stack": { create: () => FINANCE_HERO_BUILDERS["cash-stack"]({ bundles: 2 }) },
  coins: { create: () => FINANCE_HERO_BUILDERS.coins({ count: 6 }) },
  "gold-bars": { create: () => FINANCE_HERO_BUILDERS["gold-bars"]() },
  "money-bag": { create: () => FINANCE_HERO_BUILDERS["money-bag"]({ coins: 3 }) },
  "credit-card": { create: () => FINANCE_HERO_BUILDERS["credit-card"]({ secondCard: false }) },
  smartphone: { create: () => createSmartphone({ id: "phone" }), pose: [-Math.PI / 2, 0, 0] },
  laptop: { create: () => createLaptop({ id: "laptop" }) },
  padlock: { create: () => createPadlock({ withKey: false }) },
  invoice: { create: () => createEverydayObject("invoice") },
  paper: { create: () => createEverydayObject("paper") },
  folder: { create: () => createEverydayObject("folder") },
  pen: { create: () => createEverydayObject("pen") },
};

interface Placed { x: number; z: number; y: number; yaw: number; shown: boolean }
export interface Item { id: string; holder: Group; size: Vec3; asset: HeroAsset }

/** A table object in metres, lying in its table pose, with its footprint measured after the pose. */
function placeObject(kind: TabletopKind, id: string): Item { return posedObject(KINDS[kind].create(), id, KINDS[kind].pose); }
/** Any hero asset in metres, rotated into a pose, recentred on its footprint and standing on y = 0, with its measured size. */
export function posedObject(asset: HeroAsset, id: string, pose?: Vec3): Item {
  const holder = new Group(), posed = new Group();
  posed.add(asset.group); posed.scale.setScalar(asset.metersPerUnit ?? 1);
  if (pose) posed.rotation.set(...pose);
  holder.add(posed); holder.name = id;
  asset.group.traverse(object => { const mesh = object as Mesh; if (mesh.isMesh) { mesh.castShadow = true; mesh.receiveShadow = true; } });
  posed.updateMatrixWorld(true);
  const box = new Box3().setFromObject(posed), size = box.getSize(new Vector3()), center = box.getCenter(new Vector3());
  // Recentred so the holder's origin is the middle of the object's footprint, on the table.
  posed.position.set(-center.x, -box.min.y, -center.z);
  return { id, holder, size: [size.x, size.y, size.z], asset };
}

/** Where each object sits in each beat. Rows and pairs are centred on the table, stacks rise from the middle, a focus comes forward. */
function arrange(spec: TabletopStorySpec, items: Map<string, Item>): Array<Map<string, Placed>> {
  return spec.beats.map(beat => {
    const out = new Map<string, Placed>(), list = beat.objects.map(id => items.get(id)!).filter(Boolean);
    const row = (objects: Item[], z: number, gapScale = 1) => {
      const gap = Math.max(.03, Math.max(...objects.map(o => o.size[0])) * .22) * gapScale, width = objects.reduce((sum, o) => sum + o.size[0], 0) + gap * (objects.length - 1);
      let x = -width / 2;
      for (const o of objects) { out.set(o.id, { x: x + o.size[0] / 2, z, y: 0, yaw: 0, shown: true }); x += o.size[0] + gap; }
    };
    if (beat.layout === "stack") {
      let y = 0;
      list.forEach((o, i) => { out.set(o.id, { x: 0, z: 0, y, yaw: (i % 2 ? 1 : -1) * .06 * i, shown: true }); y += o.size[1]; });
    } else if (beat.layout === "focus" && beat.focus) {
      const focus = items.get(beat.focus)!, rest = list.filter(o => o.id !== beat.focus);
      out.set(focus.id, { x: 0, z: 0, y: 0, yaw: 0, shown: true });
      if (rest.length) row(rest, -(focus.size[2] / 2 + Math.max(...rest.map(o => o.size[2])) / 2 + .06), .8);
    } else row(list, 0, beat.layout === "pair" ? 3 : 1);
    return out;
  });
}

/** Lacquered walnut, or honed slate, as a table slab whose far edge shows against the studio sweep. */
function createTable(surface: "walnut" | "slate"): { group: Group; dispose: () => void } {
  const res = createAssetResources(), group = new Group();
  const map = surface === "walnut"
    ? res.own(paintTexture(1024, 1024, (ctx, w, h, random) => {
      ctx.fillStyle = "#5a3b26"; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 180; i++) {
        const y = random() * h, amp = 3 + random() * 14, dark = .04 + random() * .16;
        ctx.strokeStyle = random() > .8 ? `rgba(150,98,60,${dark})` : `rgba(26,14,6,${dark})`; ctx.lineWidth = .5 + random() * 2.6; ctx.beginPath();
        for (let x = 0; x <= w; x += 6) ctx.lineTo(x, y + Math.sin(x * .006 + i) * amp + Math.sin(x * .03 + i * 2) * 1.6);
        ctx.stroke();
      }
    }, { seed: 31, repeat: true }))
    : res.own(paintTexture(512, 512, (ctx, w, h, random) => {
      ctx.fillStyle = "#33383d"; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 9000; i++) { const g = 40 + random() * 30; ctx.fillStyle = `rgba(${g},${g + 4},${g + 8},.35)`; ctx.fillRect(random() * w, random() * h, 2, 2); }
    }, { seed: 33, repeat: true }));
  map.wrapS = map.wrapT = RepeatWrapping; map.repeat.set(2, 1.2); map.colorSpace = SRGBColorSpace;
  const relief = paintWithRelief(512, 512, (ctx, w, h, random) => { ctx.fillStyle = "#808080"; ctx.fillRect(0, 0, w, h); for (let i = 0; i < 4000; i++) { const g = 110 + random() * 40; ctx.fillStyle = `rgba(${g},${g},${g},.4)`; ctx.fillRect(random() * w, random() * h, 3, 1); } }, { color: "data", strength: .5, seed: 35, repeat: true });
  for (const t of [relief.map, relief.normalMap]) { res.own(t); t.wrapS = t.wrapT = RepeatWrapping; t.repeat.set(4, 2.4); }
  // A satin oil finish: a gloss coat would mirror the studio's softbox across the whole table and wash the objects out.
  const top = new Mesh(res.own(new RoundedBoxGeometry(2.4, .04, 1.4, 3, .012)), res.own(new MeshPhysicalMaterial({ map, normalMap: relief.normalMap, roughness: surface === "walnut" ? .6 : .74,
    clearcoat: surface === "walnut" ? .12 : .03, clearcoatRoughness: .5 })));
  top.position.y = -.02; top.receiveShadow = true; top.name = "table-top";
  group.add(top);
  return { group, dispose: res.dispose };
}

function build(spec: TabletopStorySpec) {
  const res = createAssetResources(), group = new Group(), items = new Map<string, Item>();
  for (const object of spec.objects) { const item = placeObject(object.kind, object.id); items.set(object.id, item); group.add(item.holder); }
  const table = createTable(spec.surface ?? "walnut"); group.add(table.group); table.group.name = "table";
  const layouts = arrange(spec, items);
  const asset: HeroAsset = { id: "tabletop-story", group, parts: res.parts, tier: "hero", metersPerUnit: 1, exposure: 1,
    bounds: { min: [-.35, 0, -.25], max: [.35, .25, .25] },
    studio: { palette: "graphite", keyAzimuth: -35, floorY: -.04, extent: { min: [-1.4, -.04, -.9], max: [1.4, .5, .9] } },
    craft: { materials: ["lacquered walnut or honed slate"], details: ["real-size catalog objects", "hand-placed arcs"] },
    dispose: () => { for (const item of items.values()) item.asset.dispose(); table.dispose(); res.dispose(); } };
  return { asset, items, layouts, table: table.group };
}

/** Photographed wood for the table (for example Poly Haven's CC0 "Black Walnut Veneer 02"): colour and normal maps, and the size of
 * one tile in metres. Applied once loaded; the stage waits for it, so an export never shows the painted stand-in. */
export interface TabletopSurfaceMaps { map: string; normal: string; tileMetres?: number }
function SurfaceFinish({ table, maps }: { table: Group; maps: TabletopSurfaceMaps }) {
  const [map, normal] = useLoader(TextureLoader, [maps.map, maps.normal]);
  useLayoutEffect(() => {
    const top = table.getObjectByName("table-top") as Mesh, material = top.material as MeshPhysicalMaterial, prior = { map: material.map, normal: material.normalMap };
    const k = 2.4 / (maps.tileMetres ?? 1), a = map.clone(), b = normal.clone();
    for (const [t, colour] of [[a, true], [b, false]] as const) { t.wrapS = t.wrapT = RepeatWrapping; t.colorSpace = colour ? SRGBColorSpace : NoColorSpace; t.repeat.set(k, k * 1.4 / 2.4); t.anisotropy = 8; t.needsUpdate = true; }
    material.map = a; material.normalMap = b; material.normalScale = new Vector2(.7, .7); material.color.set("#9c8170"); material.needsUpdate = true;
    return () => { material.map = prior.map; material.normalMap = prior.normal; material.color.set("#ffffff"); material.needsUpdate = true; a.dispose(); b.dispose(); };
  }, [table, map, normal, maps.tileMetres]);
  return null;
}

/** Each object's transform at a frame: resting, or lifted along a low arc between two beats' places. */
function pose(spec: TabletopStorySpec, built: ReturnType<typeof build>, frame: number) {
  let beatIndex = 0;
  spec.beats.forEach((beat, i) => { if (beat.startFrame <= frame) beatIndex = i; });
  const out = new Map<string, Placed & { lift: number }>();
  [...built.items.values()].forEach((item, order) => {
    const now = built.layouts[beatIndex].get(item.id), before = beatIndex > 0 ? built.layouts[beatIndex - 1].get(item.id) : undefined;
    const start = spec.beats[beatIndex].startFrame + TABLETOP_STAGGER * order;
    const t = easeInOut(span01(frame, start, start + TABLETOP_MOVE));
    // Off the table: high above it, out of frame, where new objects come from and leaving ones go.
    const away = (p?: Placed): Placed => ({ x: p?.x ?? 0, z: p?.z ?? 0, y: .7, yaw: p?.yaw ?? 0, shown: false });
    const from = before ?? away(now), to = now ?? away(before);
    const mixed = { x: from.x + (to.x - from.x) * t, z: from.z + (to.z - from.z) * t, y: from.y + (to.y - from.y) * t, yaw: from.yaw + (to.yaw - from.yaw) * t,
      shown: (before?.shown || now?.shown) ?? false };
    const travel = Math.hypot(to.x - from.x, to.z - from.z), lift = before && now ? Math.sin(Math.PI * t) * Math.min(.08, .02 + travel * .25) : 0;
    out.set(item.id, { ...mixed, lift, shown: mixed.shown && !(t >= 1 && !now) && !(t <= 0 && !before) });
  });
  return { beatIndex, places: out };
}

/** The camera frames the objects at rest in a beat, and eases between beats. */
function frameBeat(built: ReturnType<typeof build>, index: number, focus?: string) {
  const box = new Box3();
  built.layouts[index].forEach((place, id) => {
    if (focus && id !== focus) return;
    const s = built.items.get(id)!.size;
    box.expandByPoint(new Vector3(place.x - s[0] / 2, place.y, place.z - s[2] / 2)); box.expandByPoint(new Vector3(place.x + s[0] / 2, place.y + s[1], place.z + s[2] / 2));
  });
  if (box.isEmpty()) box.set(new Vector3(-.2, 0, -.15), new Vector3(.2, .1, .15));
  // Room in front of the objects for their labels on the table.
  box.max.z += .06;
  const c = box.getCenter(new Vector3()), r = Math.max(.08, box.getSize(new Vector3()).length() / 2);
  return { center: [c.x, c.y * .6, c.z] as Vec3, radius: r };
}

function TabletopScene({ built, spec, frame, onLabels }: { built: ReturnType<typeof build>; spec: TabletopStorySpec; frame: number; onLabels: (points: Map<string, { x: number; y: number; on: boolean }>) => void }) {
  const size = useThree(state => state.size), camera = useThree(state => state.camera), aspect = size.width / Math.max(1, size.height);
  const { beatIndex, places } = pose(spec, built, frame);
  // A focus beat is framed whole: its object is already forward and largest, and the others stay in sight behind it.
  const at = (i: number) => frameBeat(built, i);
  const k = easeInOut(span01(frame, spec.beats[beatIndex].startFrame, spec.beats[beatIndex].startFrame + TABLETOP_MOVE + 10));
  const a = at(Math.max(0, beatIndex - (k < 1 ? 1 : 0))), b = at(beatIndex), m = beatIndex > 0 ? k : 1;
  const center: Vec3 = [a.center[0] + (b.center[0] - a.center[0]) * m, a.center[1] + (b.center[1] - a.center[1]) * m, a.center[2] + (b.center[2] - a.center[2]) * m];
  const radius = Math.exp(Math.log(a.radius) + (Math.log(b.radius) - Math.log(a.radius)) * m);
  const drift = easeInOut(span01(frame, 0, spec.durationFrames));
  const shotPose = orbitPose(center, radius, { yaw: -8 + drift * 6, pitch: 46, fill: 1.12, offsetX: .14 }, aspect);
  useLayoutEffect(() => {
    places.forEach((place, id) => {
      const holder: Object3D = built.items.get(id)!.holder;
      holder.visible = place.shown; holder.position.set(place.x, place.y + place.lift, place.z); holder.rotation.set(0, place.yaw, 0);
    });
    camera.updateMatrixWorld();
    const labels = new Map<string, { x: number; y: number; on: boolean }>(), beat = spec.beats[beatIndex];
    places.forEach((place, id) => {
      const s = built.items.get(id)!.size, v = new Vector3(place.x, 0, place.z + s[2] / 2 + .012).project(camera);
      labels.set(id, { x: (v.x + 1) / 2, y: (1 - v.y) / 2, on: place.shown && place.lift < .002 && beat.layout !== "stack" && beat.objects.includes(id) });
    });
    onLabels(labels);
  });
  return <ShotCamera pose={shotPose} />;
}

/** Real objects on a table, arranged beat by beat, with each beat's caption. */
export function TabletopStory({ spec, surfaceMaps, ...props }: Omit<StudioRecipeProps, "create"> & { spec: TabletopStorySpec; surfaceMaps?: TabletopSurfaceMaps }) {
  const key = JSON.stringify([spec.objects, spec.beats.map(b => [b.layout, b.objects, b.focus]), spec.surface]);
  const built = useMemo(() => build(spec), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const asset = useHeroAsset(() => built.asset, [built]);
  const refs = useRef(new Map<string, HTMLDivElement | null>());
  const onLabels = useCallback((points: Map<string, { x: number; y: number; on: boolean }>) => points.forEach((p, id) => {
    const el = refs.current.get(id); if (!el) return;
    el.style.left = `${p.x * 100}%`; el.style.top = `${p.y * 100}%`; el.style.opacity = p.on ? "1" : "0";
  }), []);
  const ink = props.tone === "dark-on-light" ? "#13181f" : "#f4f6f9", shadow = props.tone === "dark-on-light" ? "0 1px 1px rgba(255,255,255,.5)" : "0 1px 2px rgba(0,0,0,.6), 0 0 14px rgba(0,0,0,.4)";
  return <div style={{ position: "relative", overflow: "hidden", width: "100%", height: "100%", containerType: "size", background: "#0b0e12", ...props.style }}>
    <FiberStage frame={props.frame} fps={props.fps} label={props.label ?? `Objects on a table: ${spec.objects.map(o => o.label ?? o.kind).join(", ")}`} shadows style={{ position: "absolute", inset: 0 }}>
      <FiberHeroStudio asset={asset} studio={props.studio} exposure={props.exposure}>
        {surfaceMaps && (spec.surface ?? "walnut") === "walnut" && <SurfaceFinish table={built.table} maps={surfaceMaps} />}
        <TabletopScene built={built} spec={spec} frame={props.frame} onLabels={onLabels} />
      </FiberHeroStudio>
    </FiberStage>
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {props.children}
      {spec.objects.filter(o => o.label).map(o => <div key={o.id} ref={node => { refs.current.set(o.id, node); }} style={{ position: "absolute", transform: "translate(-50%, 30%)", opacity: 0, transition: "none", whiteSpace: "nowrap",
        font: "600 2.7cqh/1.15 var(--km-font-body, system-ui, sans-serif)", color: ink, textShadow: shadow }}>{o.label}</div>)}
      {spec.beats.map((beat, i) => beat.caption && <StudioCaption key={beat.id} beat={{ text: beat.caption, enter: beat.startFrame + 10, exit: spec.beats[i + 1]?.startFrame ?? spec.durationFrames + 20 }} frame={props.frame} tone={props.tone} />)}
    </div>
  </div>;
}
