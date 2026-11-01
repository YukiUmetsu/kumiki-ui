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
  const [smoothLOD, setSmoothLOD] = useState(true);
  const [rooms, setRooms] = useState(true);
  const [treatments, setTreatments] = useState(true);
  const [streetDetail, setStreetDetail] = useState(true);
  const [brickwork, setBrickwork] = useState(true);
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
          radius: treeSpec.trunkLength * 1.25, heroMinPixels: 290, supportingMinPixels: 95,
          transitionPixels: smoothLOD ? 26 : undefined }, {
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
          masonry: brickwork ? undefined : false,
          interiors: rooms ? { depth: 1.8, litFraction: .42,
            windowTreatments: treatments ? { coverage: .68, style: "mixed" } : false } : undefined }),
        createCraftFacade({ schemaVersion: 1, id: "neighbour-facade", seed: seed + 8, height: 21,
          footprint: { width: 12, depth: 11 }, colors: { masonry: 0x816b5d, trim: 0xbca999, glass: 0x304e57 },
          masonry: brickwork ? undefined : false,
          interiors: rooms ? { depth: 1.8, litFraction: .28,
            windowTreatments: treatments ? { coverage: .68, style: "mixed" } : false } : undefined }),
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
  }, [variant, seed, detail, smoothLOD, rooms, treatments, streetDetail, brickwork, timeline, renderHeight]);

  return <main data-km-craft-environment="" data-review-scene={variant} data-review-aspect={outputAspect}
    data-review-seed={seed} data-review-rooms={rooms ? "on" : "off"}
    data-review-treatments={treatments ? "on" : "off"}
    data-review-masonry={brickwork ? "on" : "off"}
    data-review-lod-transition={smoothLOD ? "on" : "off"}
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
        <label><input type="checkbox" checked={smoothLOD} onChange={event => setSmoothLOD(event.target.checked)} /> Screen-door LOD transitions</label>
        {variant === "street" && <label><input type="checkbox" checked={rooms} onChange={event => setRooms(event.target.checked)} /> Recessed room geometry</label>}
        {variant === "street" && <label><input type="checkbox" checked={treatments} onChange={event => setTreatments(event.target.checked)} /> Window treatments</label>}
        {variant === "street" && <label><input type="checkbox" checked={streetDetail} onChange={event => setStreetDetail(event.target.checked)} /> Crafted streetscape (road, sidewalk, lamps)</label>}
        {variant === "street" && <label><input type="checkbox" checked={brickwork} onChange={event => setBrickwork(event.target.checked)} /> Running-bond masonry</label>}
      </div>
      <p style={{ color: "#9eafb5", fontSize: 13, marginTop: 20, lineHeight: 1.6 }}>Supporting/background visual recipes, not hero-grade architectural models or certified photographic realism. Native generation is CPU work performed when the scene is assembled, not on every animation frame. GPU and human visual review remains pending.</p>
    </div>
  </main>;
}

/** Deliberately close enough to inspect construction; not a claim of approval. */
function StreetlampDetailViewer() {
  const [frame, setFrame] = useState(58);
  const [aspect, setAspect] = useState<OutputAspect>("landscape");
  const [seed, setSeed] = useState(21);
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
    const lamps = createCraftStreetLamps({ schemaVersion: 1, id: "detail-streetlamp", seed,
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
  }, [height, reach, seed]);
  const width = aspect === "landscape" ? 1600 : 900;
  const viewportHeight = aspect === "landscape" ? 900 : 1600;
  return <main data-km-craft-environment="" data-review-scene="streetlamp"
    data-review-aspect={aspect} data-review-seed={seed}
    style={{ background: "#0b141a", color: "#f1f3f2", minHeight: "100vh",
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
        <label>Seed · {seed} <input aria-label="Seed" type="range" min="1" max="99" value={seed} onChange={e => setSeed(Number(e.target.value))} /></label>
        <label>Height · {height.toFixed(1)} <input aria-label="Lamp height" type="range" min="3.6" max="6" step=".1" value={height} onChange={e => setHeight(Number(e.target.value))} /></label>
        <label>Arm reach · {reach.toFixed(2)} <input aria-label="Arm reach" type="range" min=".65" max="1.4" step=".01" value={reach} onChange={e => setReach(Number(e.target.value))} /></label>
        <label style={{ flex: "1 1 180px" }}>Camera frame · {frame} <input aria-label="Camera frame" type="range" min="0" max="120" value={frame} onChange={e => setFrame(Number(e.target.value))} /></label>
      </div>
    </div>
  </main>;
}

/** Isolated oblique wall study, so subpixel mortar and corner seams can be QA'd. */
function MasonryDetailViewer() {
  const [frame, setFrame] = useState(58);
  const [aspect, setAspect] = useState<OutputAspect>("landscape");
  const [seed, setSeed] = useState(41);
  const [brickwork, setBrickwork] = useState(true);
  const [jointWidth, setJointWidth] = useState(.024);
  const [variation, setVariation] = useState(.10);
  const timeline = useMemo(() => compileCameraPoses({
    id: "masonry-closeup", cameraId: "masonry-camera", fps: { num: 30, den: 1 },
    poses: Array.from({ length: 121 }, (_, f) => {
      const angle = -.46 + f / 120 * .92;
      const position: [number, number, number] = [1 + Math.sin(angle) * 10, 9.8, 4.8 + Math.cos(angle) * 10];
      const focus: [number, number, number] = [1, 9, 4.8];
      return { position, focus, orientation: lookAtQuaternion(position, focus),
        projection: { kind: "perspective" as const, fov: 46 }, near: .05, far: 85,
        focusDistance: 10 };
    }),
  }), []);
  const createScene = useCallback(() => {
    const scene = new Scene(); scene.background = new Color("#84949d");
    const studio = createCraftStudio({ mood: "cinematic", ground: false, background: "#84949d" });
    scene.add(studio.group);
    const facade = createCraftFacade({ schemaVersion: 1, id: "masonry-detail", seed,
      height: 21, footprint: { width: 12, depth: 11 },
      colors: { masonry: 0xad9d83, trim: 0xd9c9b4, glass: 0x304858 },
      masonry: brickwork ? { jointWidth, colorVariation: variation } : false });
    applySurfaceDetail(facade.material, { kind: "stone", frequency: 15, strength: .0017,
      roughnessVariation: .12, albedoVariation: .09 });
    scene.add(facade.mesh);
    return { scene, dispose() { scene.clear(); facade.dispose(); studio.dispose(); } };
  }, [brickwork, jointWidth, variation, seed]);
  return <main data-km-craft-environment="" data-review-scene="masonry"
    data-review-aspect={aspect} data-review-seed={seed} data-review-masonry={brickwork ? "on" : "off"}
    style={{ background: "#0b141a", color: "#f1f3f2", minHeight: "100vh",
    padding: "clamp(20px,4vw,54px)", fontFamily: "sans-serif" }}>
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontWeight: 500 }}>Masonry — close-range orbital material inspection</h1>
      <p style={{ maxWidth: 770, color: "#bed0d2", lineHeight: 1.6 }}>Same built façade with optional running bond, measured mortar width and restrained brick variation. Rotate to inspect corners, pattern aliasing and relief. Shader finish is not cut brick geometry or an approved historic texture.</p>
      <CameraViewport3D timeline={timeline} frame={frame} cameraId="masonry-camera" cameraMode="pose"
        createScene={createScene} width={aspect === "landscape" ? 1600 : 900}
        height={aspect === "landscape" ? 900 : 1600} pixelRatio={1.25}
        ariaLabel="Close-up orbital view of brick masonry and building trim" style={{ width: "100%" }} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "end", marginTop: 18 }}>
        <label>Output aspect <select aria-label="Output aspect" value={aspect} onChange={e => setAspect(e.target.value as OutputAspect)}>
          <option value="landscape">16:9</option><option value="portrait">9:16</option>
        </select></label>
        <label>Seed · {seed} <input aria-label="Seed" type="range" min="1" max="99" value={seed} onChange={e => setSeed(Number(e.target.value))} /></label>
        <label><input type="checkbox" checked={brickwork} onChange={e => setBrickwork(e.target.checked)} /> Running-bond masonry</label>
        <label>Mortar width · {jointWidth.toFixed(3)} <input aria-label="Mortar width" type="range" min=".006" max=".06" step=".002" value={jointWidth} onChange={e => setJointWidth(Number(e.target.value))} /></label>
        <label>Brick variation · {variation.toFixed(2)} <input aria-label="Brick variation" type="range" min="0" max=".2" step=".01" value={variation} onChange={e => setVariation(Number(e.target.value))} /></label>
        <label style={{ flex: "1 1 180px" }}>Camera frame · {frame} <input aria-label="Camera frame" type="range" min="0" max="120" value={frame} onChange={e => setFrame(Number(e.target.value))} /></label>
      </div>
    </div>
  </main>;
}

/** Framed on actual native glazing to judge depth, dressing and parallax. */
function WindowDetailViewer() {
  const [frame, setFrame] = useState(58);
  const [aspect, setAspect] = useState<OutputAspect>("landscape");
  const [seed, setSeed] = useState(41);
  const [windowMode, setWindowMode] = useState<"dressed" | "bare" | "backing">("dressed");
  const [litFraction, setLitFraction] = useState(.36);
  const timeline = useMemo(() => compileCameraPoses({
    id: "window-closeup", cameraId: "window-camera", fps: { num: 30, den: 1 },
    poses: Array.from({ length: 121 }, (_, f) => {
      const angle = -.44 + f / 120 * .88;
      const position: [number, number, number] = [1 + Math.sin(angle) * 7, 9.7, 4.8 + Math.cos(angle) * 7];
      const focus: [number, number, number] = [1, 9.2, 4.8];
      return { position, focus, orientation: lookAtQuaternion(position, focus),
        projection: { kind: "perspective" as const, fov: 46 }, near: .05, far: 85,
        focusDistance: 7 };
    }),
  }), []);
  const createScene = useCallback(() => {
    const scene = new Scene(); scene.background = new Color("#87969d");
    const studio = createCraftStudio({ mood: "cinematic", ground: false, background: "#87969d" });
    scene.add(studio.group);
    const facade = createCraftFacade({ schemaVersion: 1, id: "window-detail", seed,
      height: 22, footprint: { width: 12, depth: 11 },
      colors: { masonry: 0xa69a88, trim: 0xd7c9b8, glass: 0x344b56 },
      glass: { opacity: .72, roughness: .14, transmission: .42 },
      interiors: windowMode === "backing" ? undefined : {
        depth: 1.9, litFraction,
        windowTreatments: windowMode === "dressed" ? { coverage: .75, style: "mixed" } : false,
      } });
    scene.add(facade.mesh);
    return { scene, dispose() { scene.clear(); facade.dispose(); studio.dispose(); } };
  }, [seed, windowMode, litFraction]);
  return <main data-km-craft-environment="" data-review-scene="windows"
    data-review-aspect={aspect} data-review-seed={seed} data-review-window-mode={windowMode}
    style={{ background: "#0b141a", color: "#f1f3f2", minHeight: "100vh",
      padding: "clamp(20px,4vw,54px)", fontFamily: "sans-serif" }}>
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontWeight: 500 }}>Window depth — physically recessed shade and curtain study</h1>
      <p style={{ maxWidth: 770, color: "#bed0d2", lineHeight: 1.6 }}>
        Compare dark backing, bare room geometry and seeded roller shades/pleated curtains behind transmissive glass.
        Scrub the camera to check parallax and clipping. These are supporting-room depth cues, not a furnished interior.
      </p>
      <CameraViewport3D timeline={timeline} frame={frame} cameraId="window-camera" cameraMode="pose"
        createScene={createScene} width={aspect === "landscape" ? 1600 : 900}
        height={aspect === "landscape" ? 900 : 1600} pixelRatio={1.25}
        ariaLabel="Oblique view of glazed facade with optional interior room details" style={{ width: "100%" }} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "end", marginTop: 18 }}>
        <label>Output aspect <select aria-label="Output aspect" value={aspect} onChange={e => setAspect(e.target.value as OutputAspect)}>
          <option value="landscape">16:9</option><option value="portrait">9:16</option>
        </select></label>
        <label>Window interiors <select aria-label="Window interiors" value={windowMode}
          onChange={e => setWindowMode(e.target.value as "dressed" | "bare" | "backing")}>
          <option value="dressed">Rooms + treatments</option><option value="bare">Rooms only</option>
          <option value="backing">Dark backing only</option>
        </select></label>
        <label>Seed · {seed} <input aria-label="Seed" type="range" min="1" max="99" value={seed}
          onChange={e => setSeed(Number(e.target.value))} /></label>
        <label>Lit rooms · {litFraction.toFixed(2)} <input aria-label="Lit rooms" type="range" min="0" max="1" step=".05"
          value={litFraction} onChange={e => setLitFraction(Number(e.target.value))} /></label>
        <label style={{ flex: "1 1 180px" }}>Camera frame · {frame} <input aria-label="Camera frame" type="range"
          min="0" max="120" value={frame} onChange={e => setFrame(Number(e.target.value))} /></label>
      </div>
    </div>
  </main>;
}

/** Species-by-species close orbital QA for crown density, twig attachments,
 * leaf veins, bark grain and under-canopy gaps at delivery resolution.
 */
function FoliageDetailViewer() {
  const [frame, setFrame] = useState(58);
  const [aspect, setAspect] = useState<OutputAspect>("landscape");
  const [seed, setSeed] = useState(41);
  const [species, setSpecies] = useState<"oak" | "birch" | "pine">("oak");
  const [leaves, setLeaves] = useState(true);
  const timeline = useMemo(() => compileCameraPoses({
    id: "foliage-closeup", cameraId: "foliage-camera", fps: { num: 30, den: 1 },
    poses: Array.from({ length: 121 }, (_, f) => {
      const angle = -.72 + f / 120 * 1.44;
      const radius = aspect === "landscape" ? 6.2 : 7.4;
      const focus: [number, number, number] = [0, 3.5, 0];
      const position: [number, number, number] = [Math.sin(angle) * radius,
        4.3 + .35 * f / 120, Math.cos(angle) * radius];
      return { position, focus, orientation: lookAtQuaternion(position, focus),
        projection: { kind: "perspective" as const, fov: 48 }, near: .05, far: 70,
        focusDistance: radius };
    }),
  }), [aspect]);
  const createScene = useCallback(() => {
    const scene = new Scene(); scene.background = new Color("#84969a");
    const studio = createCraftStudio({ mood: "cinematic", ground: false, background: "#84969a" });
    scene.add(studio.group);
    const tree = createCraftTree({ schemaVersion: 1, id: "foliage-study", seed,
      species, trunkLength: 4.5, trunkRadius: .16, leafCount: leaves ? 410 : 0 });
    applySurfaceDetail(tree.branches.material as MeshStandardMaterial, { kind: "fur",
      flow: [0, 1, 0], frequency: 28, strength: .0014,
      roughnessVariation: .14, albedoVariation: .12 });
    scene.add(tree.group);
    const floorGeometry = new PlaneGeometry(16, 16);
    const floorMaterial = new MeshStandardMaterial({ color: 0x68756b, roughness: .98 });
    const floor = new Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2; floor.position.y = -.03; floor.receiveShadow = true;
    scene.add(floor);
    return { scene, dispose() { scene.clear(); tree.dispose(); studio.dispose();
      floorGeometry.dispose(); floorMaterial.dispose(); } };
  }, [seed, species, leaves]);
  return <main data-km-craft-environment="" data-review-scene="foliage"
    data-review-aspect={aspect} data-review-seed={seed} data-review-species={species}
    style={{ background: "#0b141a", color: "#f1f3f2", minHeight: "100vh",
      padding: "clamp(20px,4vw,54px)", fontFamily: "sans-serif" }}>
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontWeight: 500 }}>Tree construction — crown and bark inspection</h1>
      <p style={{ maxWidth: 780, color: "#bed0d2", lineHeight: 1.6 }}>
        Orbit oak, birch and pine at a close supporting-shot distance. Compare alternate leaf clusters,
        central veins, twig attachments, light gaps and bark colors. Hide leaves to inspect the branch skeleton.
        These remain stylized procedural background trees, not botanical hero models.
      </p>
      <CameraViewport3D timeline={timeline} frame={frame} cameraId="foliage-camera" cameraMode="pose"
        createScene={createScene} width={aspect === "landscape" ? 1600 : 900}
        height={aspect === "landscape" ? 900 : 1600} pixelRatio={1.25}
        ariaLabel="Close orbit of procedural tree with alternating foliage clusters and bark" style={{ width: "100%" }} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "end", marginTop: 18 }}>
        <label>Output aspect <select aria-label="Output aspect" value={aspect} onChange={e => setAspect(e.target.value as OutputAspect)}>
          <option value="landscape">16:9</option><option value="portrait">9:16</option>
        </select></label>
        <label>Species <select aria-label="Species" value={species}
          onChange={e => setSpecies(e.target.value as "oak" | "birch" | "pine")}>
          <option value="oak">Oak · lobed</option><option value="birch">Birch · serrated</option>
          <option value="pine">Pine · needle sprays</option>
        </select></label>
        <label>Seed · {seed} <input aria-label="Seed" type="range" min="1" max="99" value={seed}
          onChange={e => setSeed(Number(e.target.value))} /></label>
        <label><input type="checkbox" checked={leaves} onChange={e => setLeaves(e.target.checked)} /> Foliage enabled</label>
        <label style={{ flex: "1 1 180px" }}>Camera frame · {frame} <input aria-label="Camera frame"
          type="range" min="0" max="120" value={frame} onChange={e => setFrame(Number(e.target.value))} /></label>
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
export const MasonryDetail: Story = { render: () => <MasonryDetailViewer /> };
export const WindowDetail: Story = { render: () => <WindowDetailViewer /> };
export const FoliageDetail: Story = { render: () => <FoliageDetailViewer /> };
