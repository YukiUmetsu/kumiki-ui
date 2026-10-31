import { useCallback, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  BoxGeometry, Color, Float32BufferAttribute, IcosahedronGeometry, Mesh, MeshStandardMaterial,
  PlaneGeometry, Scene,
} from "three";
import { compileCameraPoses, evaluateCameraPose3D } from "../../registry/motion/camera-pose-3d";
import { lookAtQuaternion } from "../../registry/motion/camera-spatial";
import { CameraViewport3D } from "../../registry/motion/camera-viewport-3d";
import { createCraftFacade, createCraftStreetLamps, createCraftStreetscape, createCraftTree } from "../../registry/craft/environment-generator";
import type { CraftTreeSpec } from "../../registry/craft/environment-generator";
import { createCraftScatter, createCraftScatterInstances } from "../../registry/craft/scatter-placement";
import { createCraftDetailLOD } from "../../registry/craft/detail-lod";
import { applySurfaceDetail } from "../../registry/craft/surface-detail";
import { createCraftStudio } from "../../registry/craft/studio-kit";

type Variant = "street" | "hillside";
type OutputAspect = "landscape" | "portrait";

function ProceduralEnvironments({ initial = "street" }: { initial?: Variant }) {
  const [variant, setVariant] = useState<Variant>(initial);
  const [frame, setFrame] = useState(58);
  const [seed, setSeed] = useState(21);
  const [detail, setDetail] = useState(true);
  const [rooms, setRooms] = useState(true);
  const [streetDetail, setStreetDetail] = useState(true);
  const [outputAspect, setOutputAspect] = useState<OutputAspect>("landscape");
  const renderWidth = outputAspect === "landscape" ? 1600 : 900;
  const renderHeight = outputAspect === "landscape" ? 900 : 1600;
  const timeline = useMemo(() => compileCameraPoses({
    id: `environment-${variant}`, cameraId: "environment-camera", fps: { num: 30, den: 1 },
    poses: Array.from({ length: 121 }, (_, f) => {
      const t = f / 120, angle = -.25 + t * .49;
      // Portrait is a deliberate single-subject camera composition, not a 16:9 crop.
      const portrait = outputAspect === "portrait";
      const radius = variant === "street" ? (portrait ? 39 : 36) : (portrait ? 27 : 30);
      const focus: [number, number, number] = variant === "street"
        ? (portrait ? [-6, 12, -15] : [1, 11, -7]) : [0, 1.8, -3];
      const position: [number, number, number] = [Math.sin(angle) * radius + focus[0],
        variant === "street" ? (portrait ? 16 + t * 2 : 11 + t * 2) : 8 + t * 2,
        Math.cos(angle) * radius + (portrait && variant === "street" ? focus[2] : 0)];
      return { position, focus, orientation: lookAtQuaternion(position, focus),
        projection: { kind: "perspective" as const, fov: variant === "street" ? 49 : 50 },
        near: .05, far: 120, focusDistance: radius };
    }),
  }), [variant, outputAspect]);

  const createScene = useCallback(() => {
    const scene = new Scene(); scene.background = new Color(variant === "street" ? "#8c9ca5" : "#8fa79f");
    const studio = createCraftStudio({ mood: "cinematic", ground: false, background: variant === "street" ? "#8998a1" : "#94ada1" });
    scene.add(studio.group);
    const owned: Array<{ dispose(): void }> = [studio];
    const lodControllers: ReturnType<typeof createCraftDetailLOD>[] = [];
    const addTreeStand = (treeSpec: CraftTreeSpec, points: ReturnType<typeof createCraftScatter>) => {
      const treeVariants = [treeSpec.leafCount, Math.round(treeSpec.leafCount * .48),
        Math.round(treeSpec.leafCount * .1)].map((leafCount, index) => {
        const tree = createCraftTree({ ...treeSpec, id: `${treeSpec.id}-lod-${index}`, leafCount });
        applySurfaceDetail(tree.branches.material as MeshStandardMaterial, {
          kind: "fur", flow: [0, 1, 0], frequency: 28,
          strength: .0012, roughnessVariation: .14, albedoVariation: .12,
        });
        owned.push(tree);
        return tree;
      });
      for (const placement of points) {
        const lod = createCraftDetailLOD({ schemaVersion: 1, id: placement.id,
          radius: treeSpec.trunkLength * 1.25, heroMinPixels: 290, supportingMinPixels: 95 }, {
          hero: treeVariants[0].group.clone(true),
          supporting: treeVariants[1].group.clone(true),
          background: treeVariants[2].group.clone(true),
        });
        lod.group.position.copy(placement.position);
        lod.group.quaternion.copy(placement.rotation);
        lod.group.scale.setScalar(placement.scale);
        scene.add(lod.group);
        lodControllers.push(lod);
        owned.push(lod);
      }
    };
    const addSurface = (geom: BoxGeometry | PlaneGeometry | IcosahedronGeometry, color: number, roughness = .9) => {
      const mat = new MeshStandardMaterial({ color, roughness, metalness: 0 });
      applySurfaceDetail(mat, { kind: "stone", frequency: 18, strength: .002,
        roughnessVariation: .12, albedoVariation: .16 });
      const mesh = new Mesh(geom, mat);
      mesh.receiveShadow = true; mesh.castShadow = true;
      owned.push({ dispose() { geom.dispose(); mat.dispose(); } });
      scene.add(mesh);
      return mesh;
    };
    if (variant === "street") {
      const slab = addSurface(new BoxGeometry(60, .26, 37), 0x485155);
      slab.position.set(0, -.25, -6); slab.name = "asphalt-road-plane";
      if (streetDetail) {
        const street = createCraftStreetscape({ schemaVersion: 1, id: "urban-streetscape", seed,
          length: 49, roadWidth: 8, sidewalkWidth: 6, sidewalkSide: "negative",
          drainsPerSide: 3, crosswalkAt: [1.5], lampsPerSide: 2 });
        street.group.position.z = -3.7;
        applySurfaceDetail(street.materials.asphalt, { kind: "stone", frequency: 23,
          strength: .0018, roughnessVariation: .1, albedoVariation: .14 });
        applySurfaceDetail(street.materials.paving, { kind: "stone", frequency: 17,
          strength: .0015, roughnessVariation: .1, albedoVariation: .1 });
        applySurfaceDetail(street.materials.curb, { kind: "stone", frequency: 31,
          strength: .0016, roughnessVariation: .11 });
        scene.add(street.group); owned.push(street);
      } else {
        const walk = addSurface(new BoxGeometry(49, .2, 6), 0xb4b6ac);
        walk.position.set(0, -.02, -10.7); walk.name = "raised-sidewalk";
        const edge = addSurface(new BoxGeometry(49, .1, .2), 0x8c9391);
        edge.position.set(0, .06, -7.7);
      }
      const facades = [
        createCraftFacade({ schemaVersion: 1, id: "corner-facade", seed, height: 27,
          footprint: { width: 13, depth: 11 }, colors: { masonry: 0xad9d83, trim: 0xe2cfaf, glass: 0x263d4b },
          interiors: rooms ? { depth: 1.8, litFraction: .42 } : undefined }),
        createCraftFacade({ schemaVersion: 1, id: "neighbour-facade", seed: seed + 8, height: 21,
          footprint: { width: 12, depth: 11 }, colors: { masonry: 0x816b5d, trim: 0xbca999, glass: 0x304e57 },
          interiors: rooms ? { depth: 1.8, litFraction: .28 } : undefined }),
      ];
      facades[0].mesh.position.set(-6, 0, -15);
      facades[1].mesh.position.set(9.5, 0, -15);
      facades.forEach(f => {
        applySurfaceDetail(f.material, { kind: "stone", frequency: 14,
          strength: .003, roughnessVariation: .18, albedoVariation: .14 });
        applySurfaceDetail(f.materials[1] as MeshStandardMaterial, { kind: "stone", frequency: 21,
          strength: .0015, roughnessVariation: .12 });
        scene.add(f.mesh); owned.push(f);
      });
      const positions = createCraftScatter({ schemaVersion: 1, id: "street-trees", mode: "path", seed,
        count: 4, points: [[-18, 0, -8.3], [18, 0, -8.3]], jitter: .06,
        randomYaw: true, scale: [.88, 1.12] });
      addTreeStand({ schemaVersion: 1, id: "street-oak", seed: seed + 4,
        species: "oak", trunkLength: 3.8, trunkRadius: .14, leafCount: detail ? 350 : 0 }, positions.slice(0, 2));
      addTreeStand({ schemaVersion: 1, id: "street-birch", seed: seed + 14,
        species: "birch", trunkLength: 4.4, trunkRadius: .11, leafCount: detail ? 340 : 0 }, positions.slice(2));
    } else {
      const terrainGeom = new PlaneGeometry(47, 35, 64, 48);
      terrainGeom.rotateX(-Math.PI / 2);
      const p = terrainGeom.getAttribute("position");
      const tint = new Float32Array(p.count * 3);
      const low = new Color("#5d7652"), high = new Color("#9aa37c");
      for (let index = 0; index < p.count; index++) {
        const x = p.getX(index), z = p.getZ(index);
        const y = .46 * Math.sin(.17 * x + seed * .01) * Math.cos(.21 * z) + .16 * Math.cos(x * .57 + z * .41);
        p.setY(index, y);
        const shade = Math.min(1, Math.max(0, (y + .58) / 1.4));
        const c = low.clone().lerp(high, shade);
        tint[index * 3] = c.r; tint[index * 3 + 1] = c.g; tint[index * 3 + 2] = c.b;
      }
      terrainGeom.setAttribute("color", new Float32BufferAttribute(tint, 3));
      terrainGeom.computeVertexNormals();
      const terrainMat = new MeshStandardMaterial({ vertexColors: true, roughness: 1 });
      applySurfaceDetail(terrainMat, { kind: "stone", frequency: 11,
        strength: .004, roughnessVariation: .14, albedoVariation: .16 });
      const terrain = new Mesh(terrainGeom, terrainMat);
      terrain.receiveShadow = true; terrain.name = "sampled-hill-surface";
      scene.add(terrain);
      owned.push({ dispose() { terrainGeom.dispose(); terrainMat.dispose(); } });
      const points = createCraftScatter({ schemaVersion: 1, id: "hill-woodland", mode: "surface", seed,
        count: 9, minDistance: 4.4, minUpDot: .85, randomYaw: true,
        scale: [.8, 1.23] }, terrain);
      addTreeStand({ schemaVersion: 1, id: "woodland-pine", seed: seed + 11,
        species: "pine", trunkLength: 4.9, trunkRadius: .14, leafCount: detail ? 390 : 0 }, points.slice(0, 5));
      addTreeStand({ schemaVersion: 1, id: "woodland-birch", seed: seed + 13,
        species: "birch", trunkLength: 3.6, trunkRadius: .1, leafCount: detail ? 320 : 0 }, points.slice(5));
      const pebbles = createCraftScatter({ schemaVersion: 1, id: "ground-cover", mode: "surface", seed: seed + 18,
        count: detail ? 310 : 75, minUpDot: .55, scale: [.12, .34], randomYaw: true,
        normalOffset: .04 }, terrain);
      const rockGeom = new IcosahedronGeometry(.7, 1);
      const rockMat = new MeshStandardMaterial({ color: "#6b7365", roughness: .98 });
      const rocks = createCraftScatterInstances(pebbles, rockGeom, rockMat);
      scene.add(rocks.mesh);
      owned.push(rocks, { dispose() { rockGeom.dispose(); rockMat.dispose(); } });
    }
    return { scene,
      updateFrame(renderFrame: number) {
        const pose = evaluateCameraPose3D(timeline, renderFrame, "environment-camera");
        const projection = pose.projection.kind === "perspective"
          ? { kind: "perspective" as const, fov: pose.projection.fov }
          : { kind: "orthographic" as const, verticalSpan: pose.projection.scale };
        for (const lod of lodControllers)
          lod.updateCamera({ cameraPosition: pose.position, projection, viewportHeight: renderHeight });
      },
      dispose() { scene.clear(); for (const asset of owned) asset.dispose(); } };
  }, [variant, seed, detail, rooms, streetDetail, timeline, renderHeight]);

  return <main data-km-craft-environment="" data-review-scene={variant} data-review-aspect={outputAspect}
    data-review-seed={seed} data-review-rooms={rooms ? "on" : "off"}
    data-review-streetscape={streetDetail ? "on" : "off"}
    style={{ background: "#0b141a", color: "#f1f3f2", minHeight: "100vh", padding: "clamp(20px, 4vw, 54px)", fontFamily: "sans-serif" }}>
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <p style={{ letterSpacing: ".15em", fontSize: 12, textTransform: "uppercase", color: "#a6cfbd" }}>3D asset toolkit / procedural environments</p>
      <h1 style={{ fontWeight: 500, fontSize: "clamp(27px, 4vw, 45px)", margin: "12px 0" }}>Detailed scenes from small, repeatable recipes.</h1>
      <p style={{ color: "#aebfc2", maxWidth: 860, lineHeight: 1.6 }}>Native Three.js builds the architecture and tree skeletons. Kumiki adds room depth behind glass, shaped street curbs, drainage grilles, paving, instanced cast-metal gooseneck lamps, oak/birch/pine foliage and camera-aware detail levels. Portrait framing deliberately follows a featured façade instead of merely cropping the full street.</p>
      <div style={{ border: "1px solid #3c535a", borderRadius: 12, overflow: "hidden", marginTop: 24 }}>
        <CameraViewport3D timeline={timeline} frame={frame} cameraId="environment-camera" cameraMode="pose"
          createScene={createScene} width={renderWidth} height={renderHeight} pixelRatio={1.25}
          ariaLabel="Procedural street architecture and branching trees viewed by a moving 3D camera" style={{ width: "100%" }} />
      </div>
      <div style={{ display: "flex", gap: 24, alignItems: "end", flexWrap: "wrap", marginTop: 20 }}>
        <label style={{ display: "grid", gap: 6 }}>Output aspect
          <select aria-label="Output aspect" value={outputAspect} onChange={event => setOutputAspect(event.target.value as OutputAspect)}
            style={{ padding: 10, color: "inherit", background: "#23323a" }}>
            <option value="landscape">16:9 landscape</option>
            <option value="portrait">9:16 portrait</option>
          </select>
        </label>
        <label style={{ display: "grid", gap: 6 }}>Environment
          <select aria-label="Environment" value={variant} onChange={event => setVariant(event.target.value as Variant)} style={{ padding: 10, color: "inherit", background: "#23323a" }}>
            <option value="street">Detailed urban façade · oak + birch</option>
            <option value="hillside">Pine and birch woodland · terrain scatter</option>
          </select>
        </label>
        <label style={{ display: "grid", gap: 6 }}>Seed · {seed}
          <input aria-label="Seed" type="range" min="1" max="99" value={seed} onChange={event => setSeed(Number(event.target.value))} />
        </label>
        <label style={{ display: "grid", gap: 6, flex: "1 1 210px" }}>Camera frame · {frame}
          <input aria-label="Camera frame" type="range" min="0" max="120" value={frame} onChange={event => setFrame(Number(event.target.value))} />
        </label>
        <label><input type="checkbox" checked={detail} onChange={event => setDetail(event.target.checked)} /> Leaf and ground detail</label>
        {variant === "street" && <label><input type="checkbox" checked={rooms} onChange={event => setRooms(event.target.checked)} /> Recessed room geometry</label>}
        {variant === "street" && <label><input type="checkbox" checked={streetDetail} onChange={event => setStreetDetail(event.target.checked)} /> Crafted streetscape (road, sidewalk, lamps)</label>}
      </div>
      <p style={{ color: "#9eafb5", fontSize: 13, marginTop: 20, lineHeight: 1.6 }}>Supporting/background visual recipes, not hero-grade architectural models or certified photographic realism. Native generation is CPU work performed when the scene is assembled, not on every animation frame. GPU and human visual review remains pending.</p>
    </div>
  </main>;
}

/** Deliberately close enough to inspect construction; not a claim of approval. */
function StreetlampDetailViewer() {
  const [frame, setFrame] = useState(58);
  const [aspect, setAspect] = useState<OutputAspect>("landscape");
  const [height, setHeight] = useState(4.5);
  const [reach, setReach] = useState(1.04);
  const timeline = useMemo(() => compileCameraPoses({
    id: "streetlamp-closeup", cameraId: "streetlamp-camera", fps: { num: 30, den: 1 },
    poses: Array.from({ length: 121 }, (_, f) => {
      const angle = -.62 + f / 120 * 1.24;
      const position: [number, number, number] = [Math.sin(angle) * 6.9, 3.6, Math.cos(angle) * 6.9];
      const focus: [number, number, number] = [0, height * .55, .2];
      return { position, focus, orientation: lookAtQuaternion(position, focus),
        projection: { kind: "perspective" as const, fov: 51 }, near: .05, far: 80,
        focusDistance: 6.9 };
    }),
  }), [height]);
  const createScene = useCallback(() => {
    const scene = new Scene(); scene.background = new Color("#87959a");
    const studio = createCraftStudio({ mood: "cinematic", ground: false, background: "#87959a" });
    scene.add(studio.group);
    const lamps = createCraftStreetLamps({ schemaVersion: 1, id: "detail-streetlamp", seed: 21,
      length: 24, roadWidth: 8, sidewalkWidth: 6, sidewalkSide: "negative",
      lampsPerSide: 1, height, reach });
    const anchor = lamps.placements[0];
    lamps.group.position.set(-anchor.x, 0, -anchor.z);
    scene.add(lamps.group);
    const floorGeometry = new BoxGeometry(11, .2, 11);
    const floorMaterial = new MeshStandardMaterial({ color: 0x989b93, roughness: .9 });
    const floor = new Mesh(floorGeometry, floorMaterial);
    floor.position.y = -.04; floor.receiveShadow = true;
    scene.add(floor);
    return { scene, dispose() { scene.clear(); lamps.dispose(); studio.dispose();
      floorGeometry.dispose(); floorMaterial.dispose(); } };
  }, [height, reach]);
  const width = aspect === "landscape" ? 1600 : 900;
  const viewportHeight = aspect === "landscape" ? 900 : 1600;
  return <main style={{ background: "#0b141a", color: "#f1f3f2", minHeight: "100vh",
    padding: "clamp(20px,4vw,54px)", fontFamily: "sans-serif" }}>
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontWeight: 500 }}>Streetlamp construction — moving-camera inspection</h1>
      <p style={{ maxWidth: 770, color: "#bed0d2", lineHeight: 1.6 }}>Inspect the taper, base bolts, gooseneck, shade and glass from oblique views. A warm lens is not a physical street light source. This is supporting/background geometry, not a surveyed hero fixture.</p>
      <CameraViewport3D timeline={timeline} frame={frame} cameraId="streetlamp-camera" cameraMode="pose"
        createScene={createScene} width={width} height={viewportHeight} pixelRatio={1.25}
        ariaLabel="Close-up of a constructed cast-metal streetlamp and lantern" style={{ width: "100%" }} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "end", marginTop: 18 }}>
        <label>Output aspect <select aria-label="Output aspect" value={aspect} onChange={e => setAspect(e.target.value as OutputAspect)}>
          <option value="landscape">16:9</option><option value="portrait">9:16</option>
        </select></label>
        <label>Height · {height.toFixed(1)} <input aria-label="Lamp height" type="range" min="3.6" max="6" step=".1" value={height} onChange={e => setHeight(Number(e.target.value))} /></label>
        <label>Arm reach · {reach.toFixed(2)} <input aria-label="Arm reach" type="range" min=".65" max="1.4" step=".01" value={reach} onChange={e => setReach(Number(e.target.value))} /></label>
        <label style={{ flex: "1 1 180px" }}>Camera frame · {frame} <input aria-label="Camera frame" type="range" min="0" max="120" value={frame} onChange={e => setFrame(Number(e.target.value))} /></label>
      </div>
    </div>
  </main>;
}

const meta = { title: "3D asset toolkit/Procedural Environments", id: "craft-procedural-environments",
  component: ProceduralEnvironments, parameters: { layout: "fullscreen" } } satisfies Meta<typeof ProceduralEnvironments>;
export default meta;
type Story = StoryObj<typeof meta>;
export const StreetCorner: Story = {};
export const Hillside: Story = { args: { initial: "hillside" } };
export const StreetlampDetail: Story = { render: () => <StreetlampDetailViewer /> };
