import { useCallback, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Color, Float32BufferAttribute, IcosahedronGeometry, Matrix4, Mesh, PlaneGeometry,
  Quaternion, Scene, Vector3 } from "three";
import { compileCameraPoses } from "../../registry/motion/camera-pose-3d";
import { lookAtQuaternion } from "../../registry/motion/camera-spatial";
import { CameraViewport3D } from "../../registry/motion/camera-viewport-3d";
import { createCraftScatter, createCraftScatterInstances } from "../../registry/craft/scatter-placement";
import type { CraftPlacement } from "../../registry/craft/scatter-placement";
import { createCraftNaturalMaterial } from "../../registry/craft/natural-materials";
import type { CraftNaturalMaterialKind } from "../../registry/craft/natural-materials";
import { createCraftGroundVegetation } from "../../registry/craft/ground-vegetation";
import type { CraftGroundVegetationKind } from "../../registry/craft/ground-vegetation";
import { createCraftStudio } from "../../registry/craft/studio-kit";

type OutputAspect = "landscape" | "portrait";
type Detail = "supporting" | "background";
type View = "overview" | "close-up";

const surfaces: CraftNaturalMaterialKind[] = ["forest-soil", "moss", "weathered-stone",
  "granite", "basalt", "sandstone", "limestone", "river-pebble",
  "dry-sand", "wet-sand", "red-sand", "bark", "leaf"];
const plants: CraftGroundVegetationKind[] = ["meadow-grass", "woodland-fern", "wildflower"];

function NaturalGroundViewer({ initialPlant = "woodland-fern", initialSurface = "forest-soil",
  initialView = "overview" }: {
  initialPlant?: CraftGroundVegetationKind; initialSurface?: CraftNaturalMaterialKind;
  initialView?: View;
}) {
  const [plant, setPlant] = useState<CraftGroundVegetationKind>(initialPlant);
  const [surface, setSurface] = useState<CraftNaturalMaterialKind>(initialSurface);
  const [detail, setDetail] = useState<Detail>("supporting");
  const [seed, setSeed] = useState(41);
  const [frame, setFrame] = useState(58);
  const [aspect, setAspect] = useState<OutputAspect>("landscape");
  const [wetness, setWetness] = useState(.12);
  const [view, setView] = useState<View>(initialView);
  const [cameraHeight, setCameraHeight] = useState(0);
  const [lookAngle, setLookAngle] = useState(0);
  const timeline = useMemo(() => compileCameraPoses({
    id: "ground-cover-camera", cameraId: "ground-cover", fps: { num: 30, den: 1 },
    poses: Array.from({ length: 121 }, (_, f) => {
      const t = f / 120, angle = -.59 + t * 1.18;
      const radius = view === "close-up" ? (aspect === "landscape" ? 1.67 : 2.16) :
        (aspect === "landscape" ? 8.4 : 6.7);
      const focus: [number, number, number] = [0,
        (view === "close-up" ? .43 : .32) + radius * Math.tan(lookAngle * Math.PI / 180), 0];
      const position: [number, number, number] = [Math.sin(angle) * radius,
        (view === "close-up" ? .82 + t * .12 : 2.6 + t * .25) + cameraHeight,
        Math.cos(angle) * radius];
      return { position, focus, orientation: lookAtQuaternion(position, focus),
        projection: { kind: "perspective" as const, fov: 49 }, near: .05, far: 75,
        focusDistance: radius };
    }),
  }), [aspect, view, cameraHeight, lookAngle]);

  const createScene = useCallback(() => {
    const scene = new Scene(); scene.background = new Color("#84959d");
    const studio = createCraftStudio({ mood: "cinematic", ground: false, background: "#84959d" });
    scene.add(studio.group);
    const groundMaterial = createCraftNaturalMaterial({ schemaVersion: 1, id: "ground-surface",
      seed, kind: surface, wetness, repeat: view === "close-up" ? [10, 10] : [4, 4],
      resolution: view === "close-up" ? 512 : 256 });
    const stoneMaterial = createCraftNaturalMaterial({ schemaVersion: 1, id: "weathered-pebbles",
      seed: seed + 13, kind: ["granite", "basalt", "sandstone", "limestone", "river-pebble"]
        .includes(surface) ? surface : "weathered-stone", repeat: [2, 2] });
    const terrainGeometry = new PlaneGeometry(12, 12, 46, 46);
    terrainGeometry.rotateX(-Math.PI / 2);
    const positions = terrainGeometry.getAttribute("position");
    const tint = new Float32Array(positions.count * 3);
    for (let index = 0; index < positions.count; index++) {
      const x = positions.getX(index), z = positions.getZ(index);
      const y = .075 * Math.sin(x * .7 + seed * .03) * Math.cos(z * .62) +
        .033 * Math.sin(x * 2.1 + z * 1.7);
      positions.setY(index, y);
      tint[index * 3] = 1; tint[index * 3 + 1] = 1; tint[index * 3 + 2] = 1;
    }
    terrainGeometry.setAttribute("color", new Float32BufferAttribute(tint, 3));
    terrainGeometry.computeVertexNormals();
    const terrain = new Mesh(terrainGeometry, groundMaterial.material);
    terrain.receiveShadow = true; terrain.name = "sampled-natural-terrain";
    scene.add(terrain);
    const plantPoints = createCraftScatter({ schemaVersion: 1, id: "natural-ground-plants",
      seed, mode: "surface", count: detail === "background" ? 120 : 90,
      minDistance: detail === "background" ? .43 : .56, minUpDot: .9,
      surfaceNormal: true, randomYaw: true, normalOffset: .012,
      scale: [.62, 1.35] }, terrain);
    if (view === "close-up") {
      // Guaranteed focal specimen at the orbital target; incidental scatter
      // cannot hide it, and the surrounding terrain still reads as a habitat.
      const groundY = .075 * Math.sin(seed * .03) + .012;
      const position = new Vector3(0, groundY, 0), normal = new Vector3(0, 1, 0);
      const rotation = new Quaternion(), scale = 1;
      const focusPlant: CraftPlacement = { id: "center-botanical-specimen", position,
        normal, rotation, scale, matrix: new Matrix4().compose(position, rotation,
          new Vector3(scale, scale, scale)) };
      const surrounding = plantPoints.filter(p => p.position.distanceTo(position) > .68);
      plantPoints.splice(0, plantPoints.length, focusPlant, ...surrounding);
    }
    const vegetation = createCraftGroundVegetation({ schemaVersion: 1, id: "natural-ground-cover",
      seed: seed + 7, kind: plant, detail }, plantPoints);
    scene.add(vegetation.mesh);
    const rockPoints = createCraftScatter({ schemaVersion: 1, id: "pebbles",
      seed: seed + 53, mode: "surface", count: 32, minDistance: .48,
      minUpDot: .85, randomYaw: true, normalOffset: .035, scale: [.12, .35] }, terrain);
    const rockGeometry = new IcosahedronGeometry(.65, 1);
    const rocks = createCraftScatterInstances(rockPoints, rockGeometry, stoneMaterial.material);
    rocks.mesh.name = "weathered-stone-ground-pebbles";
    scene.add(rocks.mesh);
    return { scene, dispose() { scene.clear(); rocks.dispose(); vegetation.dispose();
      rockGeometry.dispose(); groundMaterial.dispose(); stoneMaterial.dispose(); terrainGeometry.dispose(); studio.dispose(); } };
  }, [seed, surface, wetness, plant, detail, view]);

  return <main data-km-craft-environment="" data-review-scene="natural-ground"
    data-review-aspect={aspect} data-review-seed={seed} data-review-plant-kind={plant}
    data-review-natural-material={surface} data-review-plant-detail={detail}
    data-review-view={view} data-review-camera-height={cameraHeight}
    data-review-camera-look-angle={lookAngle}
    style={{ background: "#0b141a", color: "#f1f3f2", minHeight: "100vh",
      padding: "clamp(20px,4vw,54px)", fontFamily: "sans-serif" }}>
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <p style={{ textTransform: "uppercase", letterSpacing: ".13em", color: "#a6cfbd", fontSize: 12 }}>
        Natural materials / ground vegetation
      </p>
      <h1 style={{ fontWeight: 500, margin: "12px 0" }}>Botanical geometry and UV-mapped PBR surfaces</h1>
      <p style={{ maxWidth: 850, color: "#bed0d2", lineHeight: 1.6 }}>
        Inspect curved grass blades with seed heads, toothed fern pinnae and flower sepals/stamens over seeded soil,
        moss, stone, sand, bark or leaf finishes. PBR maps are generated once at scene assembly;
        every plant of one kind shares an instanced mesh. These are supporting/background assets,
        not measured botanical or photogrammetry models.
      </p>
      <CameraViewport3D timeline={timeline} frame={frame} cameraId="ground-cover" cameraMode="pose"
        createScene={createScene} width={aspect === "landscape" ? 1600 : 900}
        height={aspect === "landscape" ? 900 : 1600} pixelRatio={1.25}
        ariaLabel="Oblique orbital view of instanced ground vegetation over procedurally textured terrain"
        style={{ width: "100%" }} />
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "end", gap: 22, marginTop: 18 }}>
        <label>View <select aria-label="Camera distance" value={view}
          onChange={e => setView(e.target.value as View)}>
          <option value="overview">Landscape overview</option>
          <option value="close-up">Close-up specimen / grazing surface</option>
        </select></label>
        <label>Output aspect <select aria-label="Output aspect" value={aspect}
          onChange={e => setAspect(e.target.value as OutputAspect)}>
          <option value="landscape">16:9</option><option value="portrait">9:16</option>
        </select></label>
        <label>Vegetation kind <select aria-label="Vegetation kind" value={plant}
          onChange={e => setPlant(e.target.value as CraftGroundVegetationKind)}>
          {plants.map(kind => <option key={kind} value={kind}>{kind}</option>)}
        </select></label>
        <label>Ground material <select aria-label="Ground material" value={surface}
          onChange={e => setSurface(e.target.value as CraftNaturalMaterialKind)}>
          {surfaces.map(kind => <option key={kind} value={kind}>{kind}</option>)}
        </select></label>
        <label>Plant detail <select aria-label="Plant detail" value={detail}
          onChange={e => setDetail(e.target.value as Detail)}>
          <option value="supporting">Supporting</option><option value="background">Background</option>
        </select></label>
        <label>Seed · {seed}<input aria-label="Seed" type="range" min="1" max="99" value={seed}
          onChange={e => setSeed(Number(e.target.value))} /></label>
        <label>Wetness · {wetness.toFixed(2)}<input aria-label="Wetness" type="range" min="0" max="1"
          step=".05" value={wetness} onChange={e => setWetness(Number(e.target.value))} /></label>
        <label>Camera height · {cameraHeight > 0 ? "+" : ""}{cameraHeight.toFixed(1)}
          <input aria-label="Camera height up or down" type="range" min="-1.5" max="2.5"
            step=".1" value={cameraHeight} onChange={e => setCameraHeight(Number(e.target.value))} />
        </label>
        <label>Look angle · {lookAngle > 0 ? "+" : ""}{lookAngle}° (positive = up)
          <input aria-label="Camera look up or down angle" type="range" min="-35" max="35"
            step="1" value={lookAngle} onChange={e => setLookAngle(Number(e.target.value))} />
        </label>
        <label style={{ flex: "1 1 175px" }}>Camera frame · {frame}<input aria-label="Camera frame"
          type="range" min="0" max="120" value={frame} onChange={e => setFrame(Number(e.target.value))} /></label>
      </div>
    </div>
  </main>;
}

const meta = { title: "3D asset toolkit/Natural Environments", id: "craft-natural-environments",
  component: NaturalGroundViewer, parameters: { layout: "fullscreen" } } satisfies Meta<typeof NaturalGroundViewer>;
export default meta;
type Story = StoryObj<typeof meta>;
export const GroundVegetation: Story = {};
export const NaturalMaterials: Story = { args: { initialPlant: "meadow-grass", initialSurface: "moss" } };
export const BotanicalCloseup: Story = { args: { initialPlant: "woodland-fern", initialView: "close-up" } };
export const MaterialCloseup: Story = { args: { initialPlant: "meadow-grass",
  initialSurface: "weathered-stone", initialView: "close-up" } };
